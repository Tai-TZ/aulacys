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
  // New fields matching the SHBFinance form
  dob?: string;
  gender?: string;
  national_id?: string;
  national_id_issue_date?: string;
  national_id_issue_place?: string;
  old_national_id?: string;
  phone?: string;
  phone_2?: string;
  zalo_phone?: string;
  permanent_address?: string;
  current_address?: string;
  email?: string;
  occupation?: string;
  company_name?: string;
  position?: string;
  company_address?: string;
  salary_payday?: string;
  personal_expense?: number | null;
  disbursement_method?: string;
  disbursement_bank?: string;
  disbursement_branch?: string;
  disbursement_account?: string;
  disbursement_account_name?: string;

  // Spouse fields
  spouse_name?: string;
  spouse_phone?: string;
  spouse_national_id?: string;
  spouse_income?: number | null;
  spouse_company?: string;
  spouse_workplace_phone?: string;

  // Consent fields
  consent_data_processing?: boolean;
  consent_advertising?: boolean;

  // Reference fields
  ref1_name?: string;
  ref1_relationship?: string;
  ref1_phone?: string;
  ref1_same_address?: boolean;

  ref2_name?: string;
  ref2_relationship?: string;
  ref2_phone?: string;
  ref2_same_address?: boolean;

  /** CCCD 12 digits — cic-svc lookup key */
  id_number?: string;
  /** Must be true before CIC inquiry (BR-03) */
  cic_consent?: boolean;
}

export interface DocumentInput {
  kind: string;
  tier: 1 | 2 | 3;
  extracted?: Record<string, unknown> | null;
  confirmed_by?: string | null;
}

export interface AssessApplicationRequest {
  /** UUID from application-svc — when set, product/declared may be omitted */
  application_id?: string;
  product?: string;
  declared?: DeclaredForm;
  documents?: DocumentInput[];
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

export interface PolicyViolation {
  rule_id: string;
  description: string;
  legal_basis: string;
  metric: string;
  actual: number;
  threshold: number;
  operator: string;
  unit: string;
  severity: string;
  raised_by: string;
  effective_from: string;
  effective_to?: string | null;
  version?: string;
  unverified?: boolean;
}

export interface ComplianceVerdict {
  veto: boolean;
  rule_ids: string[];
  violations: PolicyViolation[];
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

export async function assessApplication(
  body: AssessApplicationRequest,
): Promise<AssessResponse> {
  const res = await fetch(`${API_URL}/api/v1/assess/application`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  return (await res.json()) as AssessResponse;
}

export async function assess(message: string): Promise<AssessResponse> {
  const res = await fetch(`${API_URL}/api/v1/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message } satisfies ChatRequest),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  return (await res.json()) as AssessResponse;
}

// --- HITL (POST /api/v1/approvals) ---

export interface ApprovalRequest {
  application_id: string;
  decision: "approved" | "rejected";
  signed_by?: string;
  note?: string;
  prior_outcome?: string;
  prior_ticket_id?: string | null;
}

export interface ApprovalResponse {
  decision: string;
  signed_by: string;
  note: string;
  prior_outcome: string;
  ticket: Record<string, unknown>;
}

export async function submitApproval(body: ApprovalRequest): Promise<ApprovalResponse> {
  const res = await fetch(`${API_URL}/api/v1/approvals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  return (await res.json()) as ApprovalResponse;
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
