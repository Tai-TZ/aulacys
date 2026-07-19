from fastapi import APIRouter, HTTPException

from aulacys.agents.application_client import ConsentDeniedError, load_loan_application
from aulacys.agents.graph import agent, load_product_config, run_credit_proposal
from aulacys.agents.state import LoanApplication, RunTrace
from aulacys.agents.tools.workflow import write_approval_ticket
from aulacys.models.schemas import (
    AppetiteThresholdPatch,
    ApprovalRequest,
    ApprovalResponse,
    AssessApplicationRequest,
    AssessResponse,
    CatalogSeedResponse,
    ChatRequest,
    ChatResponse,
    CreditProposalResponse,
    LoanProductIn,
    LoanProductOut,
    PolicyRuleOut,
    PolicyRulesResponse,
    PolicyValidateRequest,
    PolicyValidateResponse,
    ProductGroupIn,
    ProductGroupOut,
    ProductStatusPatch,
)
from aulacys.policy.loader import (
    AppetitePatchError,
    delete_appetite_override,
    evaluate,
    list_rules_for_profile,
    patch_appetite_threshold,
)
from aulacys.policy.profiles import profile_from_secured_type
from aulacys.services import applications_proxy, products as products_svc

router = APIRouter()



def _to_assess_response(state: dict) -> AssessResponse:
    return AssessResponse(
        response=state.get("response", ""),
        outcome=state.get("outcome", ""),
        run_trace=state.get("run_trace") or RunTrace(),
        proposal=state.get("proposal"),
        credit=state.get("credit"),
        operations=state.get("operations"),
        compliance=state.get("compliance"),
        critic=state.get("critic"),
        trace=state.get("trace", []),
        ticket=state.get("ticket"),
        audit=state.get("audit"),
    )


def _resolve_application(request: AssessApplicationRequest) -> LoanApplication:
    """Body path or application-svc id (consent gate on load).

    Prefer application-svc when ``application_id`` is set. If the service times
    out / is unreachable but the client also sent ``product`` + ``declared``,
    fall back to the inline body so the demo path keeps working.
    """
    if request.application_id:
        try:
            loaded = load_loan_application(
                request.application_id,
                product_override=request.product,
                extra_documents=list(request.documents),
            )
        except ConsentDeniedError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if loaded is not None:
            return loaded
        if request.product and request.declared is not None:
            return LoanApplication(
                product=request.product,
                declared=request.declared,
                documents=request.documents,
            )
        raise HTTPException(
            status_code=502,
            detail=(
                f"application {request.application_id} not found or APPLICATION_SVC_URL "
                "unreachable/timed out (application-svc :8360). Retry, or submit product+declared."
            ),
        )

    assert request.product is not None and request.declared is not None
    return LoanApplication(
        product=request.product,
        declared=request.declared,
        documents=request.documents,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Chat with the agent."""
    try:
        result = await agent.ainvoke({"query": request.message})
        return ChatResponse(response=result.get("response", ""))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assess", response_model=AssessResponse)
async def assess(request: ChatRequest) -> AssessResponse:
    """Structured run result: outcome, veto, lane, replan count, per-node trace.

    Seeds a demo application from ``message`` (quick demo path). Prefer
    ``POST /assess/application`` when the caller has a real form body.
    """
    try:
        state = await agent.ainvoke({"query": request.message})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return _to_assess_response(state)


@router.post("/assess/application", response_model=AssessResponse)
async def assess_application(request: AssessApplicationRequest) -> AssessResponse:
    """Run the graph on a submitted body or an application-svc id."""
    try:
        application = _resolve_application(request)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    try:
        load_product_config(application.product)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    try:
        state = await agent.ainvoke(
            {
                "query": f"assess {application.product}",
                "application": application,
                "metadata": {
                    "application_id": request.application_id or f"inline-{application.product}",
                },
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    return _to_assess_response(state)


@router.post("/assess/proposal", response_model=CreditProposalResponse)
async def assess_credit_proposal(request: AssessApplicationRequest) -> CreditProposalResponse:
    """Stage 2 — RM đề xuất: Credit only (CIC / DTI / price_loan / LoanProposal)."""
    try:
        application = _resolve_application(request)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    try:
        load_product_config(application.product)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    try:
        state = run_credit_proposal(
            application,
            application_id=request.application_id or f"inline-{application.product}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    credit = state.get("credit")
    if credit is None:
        raise HTTPException(status_code=500, detail="Credit produced no assessment")
    return CreditProposalResponse(
        response=state.get("response", ""),
        proposal=state.get("proposal"),
        credit=credit,
        trace=state.get("trace", []),
    )


@router.post("/approvals", response_model=ApprovalResponse)
async def create_approval(request: ApprovalRequest) -> ApprovalResponse:
    """HITL: human approves or rejects after the graph wrote a pending ticket."""
    status = f"human_{request.decision}"
    summary_parts = [
        f"HITL {request.decision} by {request.signed_by}",
        f"prior={request.prior_outcome or 'n/a'}",
    ]
    if request.prior_ticket_id:
        summary_parts.append(f"prior_ticket={request.prior_ticket_id}")
    if request.note.strip():
        summary_parts.append(f"note={request.note.strip()}")
    try:
        ticket = write_approval_ticket.invoke(
            {
                "application_id": request.application_id,
                "status": status,
                "summary": "; ".join(summary_parts),
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    return ApprovalResponse(
        decision=request.decision,
        signed_by=request.signed_by,
        note=request.note,
        prior_outcome=request.prior_outcome,
        ticket=ticket if isinstance(ticket, dict) else {"result": ticket},
    )


@router.get("/status")
async def agent_status():
    """Agent status."""
    return {"status": "ready"}


@router.get("/applications")
async def list_loan_applications(limit: int = 100) -> list[dict]:
    """Proxy application-svc catalog of intake dossiers."""
    rows = applications_proxy.list_applications(limit=limit)
    if rows is None:
        return applications_proxy.fallback_applications(limit=limit)
    return rows


@router.get("/applications/{application_id}")
async def get_loan_application(application_id: str) -> dict:
    row = applications_proxy.fetch_application(application_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"application not found: {application_id}")
    return row


# --- Loan product catalog CRUD ---


@router.get("/product-groups", response_model=list[ProductGroupOut])
async def list_product_groups() -> list[ProductGroupOut]:
    return await products_svc.list_groups()


@router.post("/product-groups", response_model=ProductGroupOut, status_code=201)
async def create_product_group(body: ProductGroupIn) -> ProductGroupOut:
    try:
        return await products_svc.create_group(body)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


@router.put("/product-groups/{group_id}", response_model=ProductGroupOut)
async def update_product_group(group_id: str, body: ProductGroupIn) -> ProductGroupOut:
    try:
        return await products_svc.update_group(group_id, body)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=f"group not found: {group_id}") from e


@router.delete("/product-groups/{group_id}", status_code=204)
async def delete_product_group(group_id: str) -> None:
    try:
        await products_svc.delete_group(group_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=f"group not found: {group_id}") from e
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


@router.get("/products", response_model=list[LoanProductOut])
async def list_loan_products(customer_type: str | None = None) -> list[LoanProductOut]:
    return await products_svc.list_products(customer_type=customer_type)


@router.get("/products/{product_id}", response_model=LoanProductOut)
async def get_loan_product(product_id: str) -> LoanProductOut:
    got = await products_svc.get_product(product_id)
    if got is None:
        raise HTTPException(status_code=404, detail=f"product not found: {product_id}")
    return got


@router.post("/products", response_model=LoanProductOut, status_code=201)
async def create_loan_product(body: LoanProductIn) -> LoanProductOut:
    try:
        return await products_svc.create_product(body)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


@router.put("/products/{product_id}", response_model=LoanProductOut)
async def update_loan_product(product_id: str, body: LoanProductIn) -> LoanProductOut:
    try:
        return await products_svc.update_product(product_id, body)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=f"product not found: {product_id}") from e
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


@router.patch("/products/{product_id}/status", response_model=LoanProductOut)
async def patch_loan_product_status(product_id: str, body: ProductStatusPatch) -> LoanProductOut:
    try:
        return await products_svc.patch_product_status(product_id, body.status)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=f"product not found: {product_id}") from e


@router.delete("/products/{product_id}", status_code=204)
async def delete_loan_product(product_id: str) -> None:
    try:
        await products_svc.delete_product(product_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=f"product not found: {product_id}") from e


@router.post("/products/seed", response_model=CatalogSeedResponse)
async def seed_loan_products() -> CatalogSeedResponse:
    """Upsert default catalog (demo). Safe to re-run."""
    return await products_svc.seed_catalog()


# --- Rule Engineer: policy rules attached to loan-package profile ---


@router.get("/policy/rules", response_model=PolicyRulesResponse)
async def list_policy_rules(
    secured_type: str = "SECURED",
    product_code: str | None = None,
) -> PolicyRulesResponse:
    """List underwriting rules for a package family (optionally scoped to product_code)."""
    profile = profile_from_secured_type(secured_type)
    code = (product_code or "").strip() or None
    rows = list_rules_for_profile(profile, product_code=code)
    return PolicyRulesResponse(
        profile=profile,
        secured_type=secured_type.upper(),
        product_code=code,
        rules=[PolicyRuleOut(**row) for row in rows],
    )


@router.patch("/policy/rules/{rule_id}", response_model=PolicyRuleOut)
async def patch_policy_appetite(
    rule_id: str,
    body: AppetiteThresholdPatch,
    secured_type: str = "SECURED",
) -> PolicyRuleOut:
    """Update an appetite threshold. Prefer body.product_code for per-package overrides."""
    profile = profile_from_secured_type(secured_type)
    code = (body.product_code or "").strip() or None
    try:
        patch_appetite_threshold(profile, rule_id, body.threshold, product_code=code)
    except AppetitePatchError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    rows = {r["id"]: r for r in list_rules_for_profile(profile, product_code=code)}
    row = rows.get(rule_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"rule not found: {rule_id}")
    return PolicyRuleOut(**row)


@router.delete("/policy/rules/{rule_id}", response_model=PolicyRuleOut)
async def delete_policy_appetite(
    rule_id: str,
    secured_type: str = "SECURED",
    product_code: str | None = None,
) -> PolicyRuleOut:
    """Revert an appetite threshold override back to default."""
    profile = profile_from_secured_type(secured_type)
    code = (product_code or "").strip() or None
    try:
        delete_appetite_override(profile, rule_id, product_code=code)
    except AppetitePatchError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    rows = {r["id"]: r for r in list_rules_for_profile(profile, product_code=code)}
    row = rows.get(rule_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"rule not found: {rule_id}")
    return PolicyRuleOut(**row)


@router.post("/policy/rules/validate", response_model=PolicyValidateResponse)
async def validate_policy_rules(
    body: PolicyValidateRequest,
    secured_type: str = "SECURED",
) -> PolicyValidateResponse:
    """Dry-run evaluate against the package profile (Rule Engineer 'Thử rule')."""
    profile = profile_from_secured_type(secured_type)
    code = (body.product_code or "").strip() or None
    violations = evaluate(body.metrics, as_of=body.as_of, profile=profile, product_code=code)
    return PolicyValidateResponse(
        profile=profile,
        product_code=code,
        violations=[v.model_dump() for v in violations],
        veto=any(v.is_blocking for v in violations),
        rule_ids=[v.rule_id for v in violations],
    )
