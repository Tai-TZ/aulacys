from fastapi import APIRouter, HTTPException

from src.agents.graph import agent
from src.agents.state import RunTrace
from src.models.schemas import AssessResponse, ChatRequest, ChatResponse

router = APIRouter()


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
    """Structured run result: outcome, veto, lane, replan count, per-node trace."""
    try:
        state = await agent.ainvoke({"query": request.message})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return AssessResponse(
        response=state.get("response", ""),
        outcome=state.get("outcome", ""),
        run_trace=state.get("run_trace") or RunTrace(),
        compliance=state.get("compliance"),
        trace=state.get("trace", []),
        ticket=state.get("ticket"),
    )


@router.get("/status")
async def agent_status():
    """Agent status."""
    return {"status": "ready"}
