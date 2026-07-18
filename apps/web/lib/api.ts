// Thin client for the FastAPI backend.
//
// Types here MIRROR the contract in apps/api/src/models/schemas.py.
// If the backend schema changes, update these to match (see AGENTS.md §1 "One contract").

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8080";
/** Healthy API with Rule Engineer + fast catalog (stale :8000 often hangs on Supabase). */
const API_FALLBACK = process.env.NEXT_PUBLIC_API_FALLBACK ?? "http://127.0.0.1:8001";

function apiBases(): string[] {
  return [API_URL, API_FALLBACK].filter((b, i, arr) => Boolean(b) && arr.indexOf(b) === i);
}

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
  actual: number | null;
  threshold: number;
  operator: string;
  unit: string;
  severity: string;
  raised_by: string;
  effective_from: string;
  effective_to?: string | null;
  version?: string;
  unverified?: boolean;
  missing_metric?: boolean;
}

export interface ComplianceVerdict {
  veto: boolean;
  rule_ids: string[];
  violations: PolicyViolation[];
  kyc_status: string;
  ubo_status: string;
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
  proposed_limit: number | null;
  proposed_rate: number | null;
  recommendation: string;
  rationale: string;
  evidence: Citation[];
  tool_results: Record<string, unknown>;
}

export interface OperationsReport {
  valuation: number | null;
  valuation_task: Record<string, unknown>;
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
  critic?: {
    passed: boolean;
    rejections: string[];
    memo: string;
    remediation_plan: string[];
  } | null;
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

// --- Loan product catalog (admin CRUD) ---

export type ProductStatusApi = "ACTIVE" | "DRAFT" | "SUSPENDED";

export interface ProductGroupDto {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  is_active: boolean;
  display_order: number;
}

export interface LoanProductDto {
  id: string;
  customer_type: string;
  customer_type_name: string;
  product_group_id: string;
  product_group_name: string;
  product_code: string;
  product_name: string;
  short_name?: string | null;
  loan_method: string;
  secured_type: string;
  min_amount?: number | null;
  max_amount?: number | null;
  min_term?: number | null;
  max_term?: number | null;
  status: ProductStatusApi;
  interest_rate?: number | null;
  purpose: string;
  currency: string;
  agent_product_id?: string | null;
  segments: string[];
  loan_structure?: Record<string, unknown> | null;
  interest_config?: Record<string, unknown> | null;
  repayment_config?: Record<string, unknown> | null;
  collateral_config?: Record<string, unknown> | null;
  eligibility?: Record<string, unknown> | null;
  document_groups?: unknown[] | null;
  channels?: string[] | null;
  effective_start?: string | null;
  effective_end?: string | null;
  updated_at: string;
}

export interface LoanProductWriteBody {
  customer_type?: "INDIVIDUAL" | "BUSINESS";
  product_group_id: string;
  product_code: string;
  product_name: string;
  short_name?: string | null;
  loan_method?: string;
  secured_type?: "SECURED" | "UNSECURED";
  min_amount?: number | null;
  max_amount?: number | null;
  min_term?: number | null;
  max_term?: number | null;
  status?: ProductStatusApi;
  interest_rate?: number | null;
  purpose?: string;
  currency?: string;
  agent_product_id?: string | null;
  segments?: string[];
  loan_structure?: Record<string, unknown> | null;
  interest_config?: Record<string, unknown> | null;
  repayment_config?: Record<string, unknown> | null;
  collateral_config?: Record<string, unknown> | null;
  eligibility?: Record<string, unknown> | null;
  document_groups?: unknown[] | null;
  channels?: string[] | null;
  effective_start?: string | null;
  effective_end?: string | null;
}

async function catalogFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const bases = apiBases();
  let lastErr: Error | null = null;
  for (const base of bases) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${base}/api/v1${path}`, {
        ...init,
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
      clearTimeout(timer);
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        lastErr = new Error(`API error ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
        // 404 on stale process → try next base
        if (res.status === 404 && base !== bases[bases.length - 1]) continue;
        throw lastErr;
      }
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (base === bases[bases.length - 1]) break;
    }
  }
  throw lastErr ?? new Error("API unavailable");
}

export function listProductGroups(): Promise<ProductGroupDto[]> {
  return catalogFetch("/product-groups");
}

export function createProductGroup(body: {
  id?: string;
  name: string;
  description?: string;
  icon_name?: string;
  is_active?: boolean;
  display_order?: number;
}): Promise<ProductGroupDto> {
  return catalogFetch("/product-groups", { method: "POST", body: JSON.stringify(body) });
}

export function updateProductGroup(
  id: string,
  body: {
    name: string;
    description?: string;
    icon_name?: string;
    is_active?: boolean;
    display_order?: number;
  },
): Promise<ProductGroupDto> {
  return catalogFetch(`/product-groups/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteProductGroup(id: string): Promise<void> {
  return catalogFetch(`/product-groups/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function listLoanProducts(customerType?: string): Promise<LoanProductDto[]> {
  const q = customerType ? `?customer_type=${encodeURIComponent(customerType)}` : "";
  return catalogFetch(`/products${q}`);
}

export function createLoanProduct(body: LoanProductWriteBody): Promise<LoanProductDto> {
  return catalogFetch("/products", { method: "POST", body: JSON.stringify(body) });
}

export function updateLoanProduct(id: string, body: LoanProductWriteBody): Promise<LoanProductDto> {
  return catalogFetch(`/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function patchLoanProductStatus(
  id: string,
  status: ProductStatusApi,
): Promise<LoanProductDto> {
  return catalogFetch(`/products/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteLoanProduct(id: string): Promise<void> {
  return catalogFetch(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function seedLoanProducts(): Promise<{
  groups_upserted: number;
  products_upserted: number;
  source: string;
}> {
  return catalogFetch("/products/seed", { method: "POST" });
}

// --- Rule Engineer (policy attached to loan package) ---

export type PolicyProfileApi = "secured" | "unsecured";

export interface PolicyRuleDto {
  id: string;
  label_vi: string;
  description: string;
  kind: "legal" | "appetite";
  metric: string;
  operator: string;
  threshold: number;
  unit: string;
  severity: "blocking" | "warning";
  editable: boolean;
  verified: boolean;
  version: string;
  legal_basis: string;
  effective_from: string;
  effective_to?: string | null;
}

export interface PolicyRulesResponseDto {
  profile: PolicyProfileApi;
  secured_type: string;
  product_code?: string | null;
  rules: PolicyRuleDto[];
}

export interface PolicyValidateResponseDto {
  profile: PolicyProfileApi;
  product_code?: string | null;
  violations: Record<string, unknown>[];
  veto: boolean;
  rule_ids: string[];
}

export function listPolicyRules(
  securedType: "SECURED" | "UNSECURED",
  productCode?: string,
): Promise<PolicyRulesResponseDto> {
  const q = new URLSearchParams({ secured_type: securedType });
  if (productCode?.trim()) q.set("product_code", productCode.trim());
  return policyFetch(`/policy/rules?${q.toString()}`);
}

export function patchPolicyAppetite(
  ruleId: string,
  threshold: number,
  securedType: "SECURED" | "UNSECURED",
  productCode?: string,
): Promise<PolicyRuleDto> {
  return policyFetch(
    `/policy/rules/${encodeURIComponent(ruleId)}?secured_type=${encodeURIComponent(securedType)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        threshold,
        product_code: productCode?.trim() || null,
      }),
    },
  );
}

export function validatePolicyRules(
  securedType: "SECURED" | "UNSECURED",
  metrics: Record<string, number>,
  opts?: { asOf?: string; productCode?: string },
): Promise<PolicyValidateResponseDto> {
  return policyFetch(
    `/policy/rules/validate?secured_type=${encodeURIComponent(securedType)}`,
    {
      method: "POST",
      body: JSON.stringify({
        metrics,
        as_of: opts?.asOf ?? null,
        product_code: opts?.productCode?.trim() || null,
      }),
    },
  );
}

async function policyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Same bases as catalog — Rule Engineer lives on the healthy API (:8001 today).
  return catalogFetch<T>(path, init);
}

// --- Application intake (proxy → application-svc) ---

export type ApplicationSectionADto = Record<string, unknown> & {
  id: string;
  product: string;
  total_amount: string | number;
  term_months: number;
  status: string;
};

export async function listApplications(limit = 100): Promise<ApplicationSectionADto[]> {
  // Browser talks only to apps/api. Do NOT fetch application-svc (:8360) from the client.
  const fromApi = await catalogFetch<ApplicationSectionADto[]>(`/applications?limit=${limit}`);
  return Array.isArray(fromApi) ? fromApi : [];
}

export async function getApplication(id: string): Promise<ApplicationSectionADto> {
  return catalogFetch(`/applications/${encodeURIComponent(id)}`);
}
