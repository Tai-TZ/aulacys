from __future__ import annotations

from typing import Any

from aulacys.agents.harness.permissions import is_tool_allowed
from aulacys.agents.specs import AgentSpec
from aulacys.agents.tools import TOOL_REGISTRY


def dispatch(spec: AgentSpec, tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Run a whitelisted tool.

    The whitelist is enforced here, not in prompts.
    """
    if not is_tool_allowed(spec.tools, tool_name):
        return {"error": f"tool '{tool_name}' is not allowed for agent '{spec.name}' permissions={spec.tools}"}
    tool = TOOL_REGISTRY.get(tool_name)
    if tool is None:
        return {"error": f"tool '{tool_name}' is not registered"}
    try:
        result = tool.invoke(args)
    except Exception as exc:
        return {"error": str(exc)}
    if isinstance(result, dict):
        return result
    return {"result": result}
