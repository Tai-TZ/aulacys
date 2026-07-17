// Thin client for the FastAPI backend.
//
// Types here MIRROR the contract in apps/api/src/models/schemas.py.
// If the backend schema changes, update these to match (see AGENTS.md §1 "One contract").

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response: string;
}

// --- Structured run result (POST /api/v1/assess) — mirrors AssessResponse ---

export interface RunTrace {
  total_cost: number;
  lane: number; // 1 = rule-only · 2 = cheap · 3 = mortgage/veto
  replan_count: number;
  veto_fired: boolean;
}

export interface NodeTrace {
  node: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost: number;
  latency_ms: number;
  cache_hit: boolean;
  tool_calls: string[];
  schema_retries: number;
  fallback_fired: boolean;
}

export interface ComplianceVerdict {
  veto: boolean;
  rule_ids: string[];
  violations: unknown[];
  citations: unknown[];
}

export interface AssessResponse {
  response: string;
  outcome: string; // stp_approved | vetoed | ready_for_human_approval
  run_trace: RunTrace;
  compliance: ComplianceVerdict | null;
  trace: NodeTrace[];
  ticket: Record<string, unknown> | null;
}

export async function sendChat(message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message } satisfies ChatRequest),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return (await res.json()) as ChatResponse;
}

export async function assess(message: string): Promise<AssessResponse> {
  const res = await fetch(`${API_URL}/api/v1/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message } satisfies ChatRequest),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return (await res.json()) as AssessResponse;
}
