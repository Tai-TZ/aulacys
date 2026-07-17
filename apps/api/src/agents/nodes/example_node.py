from src.agents.state import AgentState


async def process_node(state: AgentState) -> dict:
    """Placeholder node. Implement your logic here."""
    query = state.get("query", "")

    # TODO: implement node logic (call LLM, query vector store, etc.)
    return {"response": query}
