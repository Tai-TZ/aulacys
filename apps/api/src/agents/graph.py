from langgraph.graph import END, StateGraph

from src.agents.nodes.example_node import process_node
from src.agents.state import AgentState


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("process", process_node)

    # Add edges
    graph.set_entry_point("process")
    graph.add_edge("process", END)

    return graph.compile()


agent = build_graph()
