from langchain_core.tools import tool


@tool
def example_tool(query: str) -> str:
    """Placeholder tool. Describe what the tool does here.

    Args:
        query: Input for the tool.

    Returns:
        Tool result.
    """
    # TODO: implement tool logic
    return ""
