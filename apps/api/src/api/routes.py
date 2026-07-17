from fastapi import APIRouter, HTTPException

from src.agents.graph import agent, load_product_config
from src.agents.state import LoanApplication, RunTrace
from src.models.schemas import AssessApplicationRequest, AssessResponse, ChatRequest, ChatResponse

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
    """Run the graph on a submitted loan application (not seed-from-message)."""
    try:
        load_product_config(request.product)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    application = LoanApplication(
        product=request.product,
        declared=request.declared,
        documents=request.documents,
    )
    try:
        state = await agent.ainvoke(
            {
                "query": f"assess {request.product}",
                "application": application,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    return _to_assess_response(state)


@router.get("/status")
async def agent_status():
    """Agent status."""
    return {"status": "ready"}
