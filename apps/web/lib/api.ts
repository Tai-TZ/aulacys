// Thin client for the FastAPI backend.
//
// Types here MIRROR the contract in apps/api/src/models/schemas.py.
// If the backend schema changes, update these to match (see AGENTS.md §1 "One contract").

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8080";

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response: string;
}

// --- Full application (POST /api/v1/assess/application) — mirrors AssessApplicationRequest ---

export interface DeclaredForm {
  customer_name: string;
  amount: number;
  term_months: number;
  annual_rate?: number;
  monthly_income: number;
  existing_monthly_debt?: number;
  declared_purpose: string;
  collateral_value_declared?: number | null;
  existing_exposure?: number;
  bank_own_capital?: number;
}

export interface DocumentInput {
  kind: string;
  tier: 1 | 2 | 3;
  extracted?: Record<string, unknown> | null;
  confirmed_by?: string | null;
}

export interface AssessApplicationRequest {
  product: string;
  declared: DeclaredForm;
  documents: DocumentInput[];
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
  tool_results: Record<string, unknown>;
}

export interface Citation {
  source: string;
  reference: string;
  excerpt: string;
}

export interface CreditAssessment {
  dti: number | null;
  income: number;
  recommendation: string;
  evidence: Citation[];
  tool_results: Record<string, unknown>;
}

export interface OperationsReport {
  valuation: number | null;
  doc_status: string;
  missing: string[];
  legal_flags: string[];
  evidence: Citation[];
  tool_results: Record<string, unknown>;
}

export interface AssessResponse {
  response: string;
  outcome: string; // stp_approved | vetoed | ready_for_human_approval
  run_trace: RunTrace;
  credit: CreditAssessment | null;
  operations: OperationsReport | null;
  compliance: ComplianceVerdict | null;
  trace: NodeTrace[];
  ticket: Record<string, unknown> | null;
  audit: Record<string, unknown> | null; // { record_id, seq, content_hash, prev_hash, decided_at } when AUDIT_SVC_URL set
}

// --- Service monitor (GET api-gateway /status) ---

export interface ServiceStatusItem {
  name: string;
  url: string;
  status: "up" | "down";
  latency_ms: number | null;
  critical: boolean;
  detail: Record<string, unknown>;
  error: string | null;
}

export interface ServiceStatusResponse {
  status: "ok" | "degraded";
  checked_at: string;
  summary: {
    total: number;
    up: number;
    down: number;
  };
  services: ServiceStatusItem[];
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

export async function assessApplication(
  body: AssessApplicationRequest,
): Promise<AssessResponse> {
  const res = await fetch(`${API_URL}/api/v1/assess/application`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return (await res.json()) as AssessResponse;
}

export async function getServiceStatus(): Promise<ServiceStatusResponse> {
  const res = await fetch(`${GATEWAY_URL}/status`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Gateway status error ${res.status}`);
  }
  return (await res.json()) as ServiceStatusResponse;
}

export async function assessViaGateway(message: string): Promise<AssessResponse> {
  const res = await fetch(`${GATEWAY_URL}/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message } satisfies ChatRequest),
  });
  if (!res.ok) {
    throw new Error(`Gateway assess error ${res.status}`);
  }
  return (await res.json()) as AssessResponse;
}
