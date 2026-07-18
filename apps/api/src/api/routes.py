from fastapi import APIRouter, HTTPException

from src.agents.application_client import ConsentDeniedError, load_loan_application
from src.agents.graph import agent, load_product_config
from src.agents.state import LoanApplication, RunTrace
from src.agents.tools.workflow import write_approval_ticket
from src.models.schemas import (
    ApprovalRequest,
    ApprovalResponse,
    AssessApplicationRequest,
    AssessResponse,
    ChatRequest,
    ChatResponse,
)

router = APIRouter()


def _to_assess_response(state: dict) -> AssessResponse:
    return AssessResponse(
        response=state.get("response", ""),
        outcome=state.get("outcome", ""),
        run_trace=state.get("run_trace") or RunTrace(),
        credit=state.get("credit"),
        operations=state.get("operations"),
        compliance=state.get("compliance"),
        trace=state.get("trace", []),
        ticket=state.get("ticket"),
        audit=state.get("audit"),
    )


def _resolve_application(request: AssessApplicationRequest) -> LoanApplication:
    """Body path or application-svc id (consent gate on load)."""
    if request.application_id:
        try:
            loaded = load_loan_application(
                request.application_id,
                product_override=request.product,
                extra_documents=list(request.documents),
            )
        except ConsentDeniedError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if loaded is None:
            raise HTTPException(
                status_code=502,
                detail=(f"application {request.application_id} not found or APPLICATION_SVC_URL unreachable"),
            )
        return loaded

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
