import type { AssessResponse, NodeTrace } from "@/lib/api";
import type { AgentRunStepId, AgentRunStepStatus } from "@/lib/workspace-demo";

const NODE_ALIASES: Record<string, AgentRunStepId> = {
  planner: "planner",
  credit: "credit",
  operations: "operations",
  compliance: "compliance",
  critic: "critic",
  gate: "gate",
  hitl: "gate",
};

export type LiveProcessPhase = "idle" | "running" | "done" | "veto" | "offline";

export function mapNodeName(node: string): AgentRunStepId | null {
  const key = node.trim().toLowerCase();
  return NODE_ALIASES[key] ?? null;
}

/** Collapse harness trace into DAG step statuses for the customer process panel. */
export function traceToStepStatus(
  result: AssessResponse | null,
): Record<AgentRunStepId, AgentRunStepStatus> {
  const base = {
    planner: "pending",
    credit: "pending",
    operations: "pending",
    compliance: "pending",
    critic: "pending",
    gate: "pending",
  } as Record<AgentRunStepId, AgentRunStepStatus>;

  if (!result) return base;

  const seen = new Set<AgentRunStepId>();
  for (const item of result.trace) {
    const id = mapNodeName(item.node);
    if (!id) continue;
    seen.add(id);
    base[id] = "done";
  }

  if (result.compliance?.veto && seen.has("compliance")) {
    base.compliance = "veto";
  }

  // Gate is often implicit — mark done when outcome is terminal.
  if (
    result.outcome === "stp_approved" ||
    result.outcome === "ready_for_human_approval" ||
    result.outcome === "vetoed"
  ) {
    base.gate = "done";
  }

  return base;
}

export function phaseFromAssess(result: AssessResponse | null): LiveProcessPhase {
  if (!result) return "idle";
  if (result.compliance?.veto || result.run_trace.veto_fired) return "veto";
  return "done";
}

export function compliancePassCount(trace: NodeTrace[]): number {
  return trace.filter((t) => mapNodeName(t.node) === "compliance").length;
}
