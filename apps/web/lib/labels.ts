/**
 * Central Vietnamese labels for the agent dashboard.
 *
 * The backend emits technical tokens (node ids, tool ids, outcome codes). A business
 * user should never see `retail_unsecured_salary` / `cccd` / `cic_lookup`. Map everything
 * to a nghiệp-vụ label in ONE place; components import these helpers, never inline strings.
 *
 * Business stages: docs/FLOW-BUSINESS-CONFIRMED.md
 */

/** Agent node id → business role (VN). */
const NODE_LABELS: Record<string, string> = {
  planner: "Điều phối (Planner)",
  credit: "Thẩm định tín dụng (Credit)",
  operations: "Kiểm tra hồ sơ & TSBĐ (Operations)",
  compliance: "Tuân thủ & Pháp lý (Compliance)",
  critic: "Kiểm soát tuyến 3 (Critic)",
  gate: "Cổng phê duyệt",
  hitl: "Phê duyệt người",
};

/**
 * 5 business stages (FLOW-BUSINESS-CONFIRMED.md).
 * Multi-agent graph (Planner→Credit/Ops/Compliance→Critic→Gate) sits mainly in
 * `appraisal`; RM đề xuất is the editable input before that graph runs.
 */
export type SopStage =
  | "intake"
  | "rm_proposal"
  | "appraisal"
  | "approval"
  | "disbursement";

export const SOP_STAGES: { id: SopStage; label: string; short: string }[] = [
  { id: "intake", label: "Tiếp nhận hồ sơ", short: "Tiếp nhận" },
  { id: "rm_proposal", label: "RM đề xuất", short: "RM đề xuất" },
  { id: "appraisal", label: "Thẩm định", short: "Thẩm định" },
  { id: "approval", label: "Phê duyệt", short: "Phê duyệt" },
  { id: "disbursement", label: "Giải ngân", short: "Giải ngân" },
];

const NODE_STAGE: Record<string, SopStage> = {
  operations: "intake",
  planner: "appraisal",
  credit: "appraisal",
  compliance: "appraisal",
  critic: "appraisal",
  gate: "approval",
  hitl: "approval",
};

/** Product id → display name (never show raw slug in UI). */
const PRODUCT_LABELS: Record<string, string> = {
  retail_unsecured_salary: "Vay tiêu dùng theo lương",
  retail_mortgage: "Vay thế chấp mua nhà",
  "loan-unsecured-term": "Vay tín chấp kỳ hạn",
  "loan-unsecured-overdraft": "Vay thấu chi tín chấp",
};

/** Tool id → what it does (VN). */
const TOOL_LABELS: Record<string, string> = {
  cic_lookup: "Tra CIC",
  income_verify: "Xác minh thu nhập",
  salary_verify: "Xác minh lương",
  compute_annual_debt_service: "Tính nghĩa vụ trả nợ",
  compute_dti: "Tính DTI",
  compute_dscr: "Tính DSCR",
  compute_ltv: "Tính LTV",
  compute_exposure_ratio: "Tỷ lệ tập trung tín dụng",
  aml_screen: "Sàng lọc AML",
  related_party: "Kiểm tra bên liên quan",
  kyc_check: "Kiểm tra KYC",
  ubo_check: "Kiểm tra UBO / chủ sở hữu hưởng lợi",
  doc_checklist: "Kiểm tra đủ hồ sơ",
  property_valuation: "Định giá TSBĐ",
  land_registry: "Thẩm tra sổ đỏ",
  write_approval_ticket: "Ghi ticket phê duyệt",
  price_loan: "Định lãi suất",
};

/** Outcome code → VN. */
const OUTCOME_LABELS: Record<string, string> = {
  stp_approved: "Agent duyệt tự động (STP)",
  ready_for_human_approval: "Chờ người phê duyệt",
  vetoed: "Bị từ chối (veto cứng)",
  gateway_unavailable: "Gateway không phản hồi",
};

/** Credit recommendation → VN. */
const RECOMMENDATION_LABELS: Record<string, string> = {
  support: "Đủ điều kiện",
  manual_review: "Cần thẩm định tay",
  review: "Xem xét",
};

/** Document kind → VN (never show raw slug like sao_ke_luong). */
const DOC_KIND_LABELS: Record<string, string> = {
  cccd: "CCCD / CMND",
  sao_ke_luong: "Sao kê lương",
  sao_ke_tai_khoan: "Sao kê tài khoản",
  so_do: "Sổ đỏ",
  hop_dong_mua_ban: "HĐ mua bán",
  cic: "Báo cáo CIC",
  purpose_evidence: "Chứng từ mục đích",
  dang_ky_ket_hon: "Đăng ký kết hôn",
  hdld: "Hợp đồng lao động",
};

/** Policy rule id → nghiệp vụ (never show raw snake_case). */
const RULE_LABELS: Record<string, string> = {
  prohibited_purpose_refinance_other_bank: "Mục đích vay bị cấm (đáo hạn ngân hàng khác)",
  max_retail_dti: "Trần DTI (khả năng trả nợ)",
  max_ltv: "Vượt trần LTV",
  max_ltv_product_cap: "Trần LTV theo sản phẩm",
  max_amount_product_ceiling: "Trần số tiền vay theo sản phẩm",
  max_cic_group: "Nhóm nợ CIC chấp nhận được",
  no_bad_debt: "Không nợ xấu",
  docs_complete: "Đủ chứng từ bắt buộc",
  term_within_product_max: "Kỳ hạn trong khung sản phẩm",
  income_verified: "Thu nhập đã xác minh",
  land_title_clear: "Sổ đỏ / TSBĐ pháp lý ổn",
  kyc_identity_verified: "KYC / định danh đã xác minh",
  ubo_related_control_clear: "UBO / bên liên quan rõ ràng",
  sanctions_hit: "Cấm danh sách trừng phạt (AML)",
  pep_requires_enhanced_dd: "Cảnh báo PEP (người có ảnh hưởng chính trị)",
  aml_hit: "Cảnh báo AML / danh sách cấm",
  related_party: "Khách hàng thuộc bên liên quan",
  cic_bad_debt: "Nợ xấu CIC",
};

function look(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  const k = key.trim().toLowerCase();
  return map[k] ?? map[key.trim()] ?? key;
}

export const nodeLabelVi = (node: string) => look(NODE_LABELS, node);
export const toolLabelVi = (tool: string) => {
  const mapped = look(TOOL_LABELS, tool);
  if (mapped === tool && tool.includes("_")) {
    return tool
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return mapped;
};
export const outcomeLabelVi = (outcome: string | null | undefined) => look(OUTCOME_LABELS, outcome);
export const recommendationLabelVi = (rec: string | null | undefined) =>
  look(RECOMMENDATION_LABELS, rec);
export const docKindLabelVi = (kind: string) => look(DOC_KIND_LABELS, kind);
export const productLabelVi = (product: string | null | undefined) => look(PRODUCT_LABELS, product);

/** Seed / DB enum slugs → VN (occupation, purpose, disbursement method, …). */
const FIELD_SLUG_LABELS: Record<string, string> = {
  // occupation
  cong_chuc: "Công chức",
  nhan_vien: "Nhân viên",
  tu_doanh: "Tự doanh",
  can_bo_dn: "Cán bộ doanh nghiệp",
  // position
  khac: "Khác",
  can_bo_ql: "Cán bộ quản lý",
  // purpose
  tieu_dung: "Tiêu dùng",
  consumer: "Tiêu dùng",
  // disbursement
  borrower: "Chuyển khoản người vay",
  per_loan: "Theo từng khoản vay",
};

export const fieldSlugLabelVi = (slug: string | null | undefined): string => {
  if (!slug) return "—";
  const trimmed = slug.trim();
  const mapped = FIELD_SLUG_LABELS[trimmed.toLowerCase()];
  if (mapped) return mapped;
  // Already human text (spaces / Vietnamese accents) — keep as-is
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes("_")) {
    return trimmed
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return trimmed;
};
export const ruleLabelVi = (ruleId: string | null | undefined) => {
  if (!ruleId) return "—";
  const mapped = look(RULE_LABELS, ruleId);
  // If unmapped snake_case, soften to readable words instead of dumping the id
  if (mapped === ruleId && ruleId.includes("_")) {
    return ruleId
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return mapped;
};

/** Metric unit codes → VN. */
const UNIT_LABELS: Record<string, string> = {
  boolean_flag: "Đạt / không đạt",
  ratio: "Tỷ lệ",
  percent: "%",
  vnd: "₫",
  months: "tháng",
  cic_group: "Nhóm nợ CIC",
  count: "Số lượng",
  money: "Số tiền",
  integer: "Số nguyên",
  flag: "Cờ",
};

/** Evidence / tool_results path → VN (never show dotted code paths). */
const SOURCE_PATH_LABELS: Record<string, string> = {
  "compliance.rule_evidence": "Bằng chứng rule tuân thủ",
  "compliance.violations": "Vi phạm chính sách",
  "compliance.metric_report": "Báo cáo chỉ số tuân thủ",
  "compliance.kyc": "Kiểm tra định danh (KYC)",
  "credit.proposal_reasonableness": "Kiểm tra hợp lý phương án Credit",
  "credit.cic_lookup": "Tra cứu CIC",
  credit: "Credit",
  operations: "Operations",
  "operations.legal_flags": "Cờ pháp lý TSBĐ",
};

/** English policy rule descriptions (from YAML) → VN. */
const POLICY_DESCRIPTION_VI: Record<string, string> = {
  "All product-required documents must be present on the application.":
    "Phải đủ chứng từ bắt buộc theo sản phẩm trên hồ sơ.",
  "CIC debt group must stay within bank appetite (1 best … 5 worst).":
    "Nhóm nợ CIC phải nằm trong khẩu vị ngân hàng (1 tốt nhất … 5 xấu nhất).",
  "CIC debt group must stay within bank appetite (1 best ... 5 worst).":
    "Nhóm nợ CIC phải nằm trong khẩu vị ngân hàng (1 tốt nhất … 5 xấu nhất).",
  "Borrower must not have classified bad debt on CIC.":
    "Khách hàng không được có nợ xấu đã phân loại trên CIC.",
  "Retail borrower debt-to-income ratio should stay within demo appetite.":
    "Tỷ lệ DTI (nghĩa vụ trả nợ / thu nhập) phải trong hạn mức khẩu vị.",
  "Requested tenor must stay within product term_years_max / term_months_max.":
    "Kỳ hạn đề nghị phải nằm trong giới hạn kỳ hạn của sản phẩm.",
  "Income verification tool must confirm a positive verified monthly income.":
    "Công cụ xác minh thu nhập phải xác nhận thu nhập hàng tháng dương.",
  "Collateral land-registry check must report no legal flags (mortgage only).":
    "Thẩm tra sổ đỏ không được có cờ pháp lý (sản phẩm thế chấp).",
  "Loan-to-value must stay within the product YAML limits.ltv_cap. Compliance emits ltv_within_product_cap (1=ok, 0=breach); the numeric cap itself stays in product config, not hardcoded here.":
    "Tỷ lệ LTV phải nằm trong trần theo cấu hình sản phẩm.",
  "Requested amount must stay within product YAML limits.amount_ceiling.":
    "Số tiền đề nghị phải nằm trong trần số tiền theo cấu hình sản phẩm.",
};

function normalizePolicyText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const DOC_STATUS_LABELS: Record<string, string> = {
  complete: "Đủ chứng từ",
  incomplete: "Thiếu chứng từ",
  missing: "Thiếu chứng từ",
  pending: "Đang chờ",
};

const SIMPLE_STATUS_LABELS: Record<string, string> = {
  passed: "Đạt",
  failed: "Không đạt",
  warning: "Cảnh báo",
  pending: "Đang chờ",
  missing: "Thiếu",
  complete: "Hoàn tất",
  incomplete: "Chưa đủ",
  accepted: "Chấp nhận",
  revised: "Đã điều chỉnh",
  rejected: "Từ chối",
  support: "Đủ điều kiện",
  manual_review: "Cần thẩm định tay",
  review: "Xem xét",
  true: "Có",
  false: "Không",
};

export const unitLabelVi = (unit: string | null | undefined): string => look(UNIT_LABELS, unit);
export const sourcePathLabelVi = (path: string | null | undefined): string => {
  if (!path) return "—";
  const mapped = look(SOURCE_PATH_LABELS, path);
  if (mapped !== path) return mapped;
  if (path.includes(".")) {
    return path
      .split(".")
      .map((part) => toolLabelVi(part) !== part ? toolLabelVi(part) : fieldSlugLabelVi(part))
      .join(" · ");
  }
  return toolLabelVi(path);
};
export const docStatusLabelVi = (status: string | null | undefined): string =>
  look(DOC_STATUS_LABELS, status);
export const simpleStatusLabelVi = (status: string | null | undefined): string =>
  look(SIMPLE_STATUS_LABELS, status);

export function stageLabelVi(stage: string | null | undefined): string {
  if (!stage) return "—";
  const found = SOP_STAGES.find((s) => s.id === stage.trim().toLowerCase());
  if (found) return found.label;
  return fieldSlugLabelVi(stage);
}

/** Format a measured metric value for officers (flags, ratios, money). */
export function formatMetricValueVi(
  value: unknown,
  unit?: string | null,
): string {
  if (value == null || value === "") return "—";
  const u = (unit ?? "").toLowerCase();
  const n = typeof value === "number" ? value : Number(value);
  if (u === "boolean_flag" || u === "flag") {
    if (value === true || value === 1 || value === "1" || n === 1) return "Đạt";
    if (value === false || value === 0 || value === "0" || n === 0) return "Không đạt";
  }
  if ((u === "ratio" || u === "percent") && Number.isFinite(n)) {
    const pct = Math.abs(n) <= 1.5 ? n * 100 : n;
    return `${pct.toFixed(1)}%`;
  }
  if ((u === "vnd" || u === "money") && Number.isFinite(n)) {
    return `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;
  }
  if (Number.isFinite(n) && String(value).trim() !== "" && !Number.isNaN(n)) {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(n);
  }
  return simpleStatusLabelVi(String(value)) !== String(value)
    ? simpleStatusLabelVi(String(value))
    : String(value);
}

/** Translate Credit proposal_reasonableness finding lines. */
export function creditFindingVi(finding: string): string {
  const raw = finding.trim();
  if (!raw) return "";

  let m: RegExpMatchArray | null;
  if ((m = raw.match(/^proposed_limit missing from price_loan$/i))) {
    return "Thiếu hạn mức đề xuất từ bước định giá khoản vay.";
  }
  if ((m = raw.match(/^proposed_rate missing from price_loan$/i))) {
    return "Thiếu lãi suất đề xuất từ bước định giá khoản vay.";
  }
  if ((m = raw.match(/^monthly payment missing from compute_annual_debt_service$/i))) {
    return "Thiếu khoản trả hàng tháng từ bước tính nghĩa vụ trả nợ.";
  }
  if ((m = raw.match(/^DTI ([\d.]+) exceeds product max_dti ([\d.]+)$/i))) {
    return `DTI ${(Number(m[1]) * 100).toFixed(1)}% vượt trần sản phẩm ${(Number(m[2]) * 100).toFixed(1)}%.`;
  }
  if ((m = raw.match(/^CIC not clean:\s*group=(\d+)\s+overdue_days=(\d+)\s+bad_debt=(\w+)/i))) {
    const bad = /^(true|1|yes)$/i.test(m[3]) ? "Có" : "Không";
    return `CIC chưa đạt: nhóm nợ ${m[1]}, quá hạn ${m[2]} ngày, nợ xấu: ${bad}.`;
  }
  if ((m = raw.match(/^term_months (\d+) exceeds product max (\d+)$/i))) {
    return `Kỳ hạn ${m[1]} tháng vượt tối đa sản phẩm ${m[2]} tháng.`;
  }
  if ((m = raw.match(/^requested amount ([\d.]+) exceeds product ceiling ([\d.]+)$/i))) {
    return `Số tiền đề nghị vượt trần sản phẩm.`;
  }
  if ((m = raw.match(/^requested amount ([\d.]+) exceeds tool proposed_limit ([\d.]+)$/i))) {
    return `Số tiền đề nghị vượt hạn mức định giá.`;
  }
  if ((m = raw.match(/^annual_rate ([\d.]+) outside product band \[([\d.]+), ([\d.]+)\]$/i))) {
    return `Lãi suất ngoài khung sản phẩm.`;
  }
  if ((m = raw.match(/^tool proposed_rate ([\d.]+) outside product band \[([\d.]+), ([\d.]+)\]$/i))) {
    return `Lãi đề xuất ngoài khung sản phẩm.`;
  }
  if (/^product term limit missing/i.test(raw)) {
    return "Thiếu cấu hình kỳ hạn tối đa của sản phẩm — hệ thống chặn an toàn.";
  }
  if (/^product rate band missing/i.test(raw)) {
    return "Thiếu khung lãi suất sản phẩm — hệ thống chặn an toàn.";
  }
  if (/^product pricing\.max_dti missing/i.test(raw)) {
    return "Thiếu trần DTI trên cấu hình sản phẩm — hệ thống chặn an toàn.";
  }
  if (/^DTI unavailable/i.test(raw)) {
    return "Không tính được DTI — chặn theo khả năng trả nợ.";
  }
  if (/^CIC consent required/i.test(raw)) {
    return "Chưa có đồng ý tra CIC trước khi tra cứu bureau.";
  }
  if (/^price_loan decision=/i.test(raw)) {
    return `Kết quả định giá: ${raw.replace(/^price_loan decision=/i, "")}.`;
  }
  if (/^documents incomplete/i.test(raw)) {
    return sanitizeBusinessText(raw.replace(/^documents incomplete:\s*missing=/i, "Thiếu chứng từ: "));
  }
  if (/collateral path requires/i.test(raw)) {
    return "Luồng thế chấp yêu cầu kết quả định giá TSBĐ.";
  }
  if (/valuation ran without schedule/i.test(raw)) {
    return "Định giá chạy nhưng thiếu metadata lịch định giá.";
  }
  if (/land_registry flags=/i.test(raw)) {
    return sanitizeBusinessText(raw.replace(/land_registry flags=/i, "Cờ sổ đỏ: "));
  }
  if (/land_registry returned error/i.test(raw)) {
    return "Thẩm tra sổ đỏ trả lỗi.";
  }
  return sanitizeBusinessText(raw);
}

/** Map a Credit check id → most relevant finding (translated). */
export function creditCheckDetailVi(
  checkId: string,
  ok: boolean,
  findings: string[],
): string {
  if (ok) return "Hệ thống xác nhận đạt điều kiện này.";
  const key = checkId.toLowerCase();
  const hints: Record<string, RegExp> = {
    amount_ceiling_configured: /ceiling|proposed_limit|amount/i,
    amount_within_ceiling: /ceiling|amount/i,
    amount_within_proposed_limit: /proposed_limit|amount/i,
    rate_within_product_band: /rate|band/i,
    proposed_rate_available: /proposed_rate/i,
    proposed_rate_within_band: /proposed_rate|band/i,
    max_dti_configured: /max_dti|DTI unavailable|pricing\.max_dti/i,
    dti_within_max: /\bDTI\b|dti/i,
    cic_consent_ok: /consent/i,
    cic_clean: /\bCIC\b|bad_debt|overdue/i,
    pricing_full_support: /price_loan|decision|proposed_limit|proposed_rate/i,
    monthly_payment_computed: /monthly payment/i,
    term_within_product_max: /term/i,
  };
  const re = hints[key];
  const hit = findings.find((f) => (re ? re.test(f) : f.toLowerCase().includes(key)));
  if (hit) return creditFindingVi(hit);
  if (findings.length === 1) return creditFindingVi(findings[0]!);
  return "Không đạt — cần xem xét hoặc điều chỉnh phương án.";
}

export function policyDescriptionVi(
  description: string | null | undefined,
  ruleId?: string | null,
): string {
  if (!description?.trim() && ruleId) return ruleLabelVi(ruleId);
  if (!description?.trim()) return "—";
  const trimmed = normalizePolicyText(description);
  if (POLICY_DESCRIPTION_VI[trimmed]) return POLICY_DESCRIPTION_VI[trimmed]!;
  // Prefix match for long multiline YAML descriptions
  for (const [en, vi] of Object.entries(POLICY_DESCRIPTION_VI)) {
    if (trimmed.startsWith(en.slice(0, 48)) || en.startsWith(trimmed.slice(0, 48))) {
      return vi;
    }
  }
  // "Missing required metric: <english rule text>"
  const missingPrefix = /^Missing required metric:\s*/i;
  if (missingPrefix.test(trimmed)) {
    const rest = normalizePolicyText(trimmed.replace(missingPrefix, ""));
    const restVi =
      POLICY_DESCRIPTION_VI[rest] ?? (ruleId ? ruleLabelVi(ruleId) : sanitizeBusinessText(rest));
    return `Thiếu chỉ số bắt buộc: ${restVi}`;
  }
  if (/^Missing required metric '/i.test(trimmed) && ruleId) {
    return `Thiếu chỉ số bắt buộc cho tiêu chí: ${ruleLabelVi(ruleId)}.`;
  }
  // Mostly English → prefer rule label
  const letters = trimmed.replace(/[^A-Za-zÀ-ỹ]/g, "");
  const ascii = trimmed.replace(/[^A-Za-z]/g, "");
  if (ruleId && ascii.length > 12 && ascii.length / Math.max(letters.length, 1) > 0.85) {
    return ruleLabelVi(ruleId);
  }
  return sanitizeBusinessText(trimmed);
}

/** Strip product slugs / technical tokens from free-text API responses. */
export function sanitizeBusinessText(text: string | null | undefined): string {
  if (!text) return "";
  let out = text;
  for (const [slug, label] of Object.entries(PRODUCT_LABELS)) {
    out = out.replaceAll(slug, label);
  }
  for (const [kind, label] of Object.entries(DOC_KIND_LABELS)) {
    out = out.replace(new RegExp(`\\b${kind}\\b`, "gi"), label);
  }
  for (const [tool, label] of Object.entries(TOOL_LABELS)) {
    out = out.replace(new RegExp(`\\b${tool}\\b`, "gi"), label);
  }
  for (const [code, label] of Object.entries(RECOMMENDATION_LABELS)) {
    out = out.replace(new RegExp(`\\b${code}\\b`, "gi"), label);
  }
  for (const [code, label] of Object.entries(DOC_STATUS_LABELS)) {
    out = out.replace(new RegExp(`\\b${code}\\b`, "gi"), label);
  }
  out = out.replace(/\bboolean_flag\b/gi, "Đạt / không đạt");
  out = out.replace(/\btool calls?\b/gi, "gọi công cụ");
  out = out.replace(/\btool call\b/gi, "gọi công cụ");
  out = out.replace(/\bpolicy rules?\b/gi, "quy tắc chính sách");
  out = out.replace(/\bpolicy rule\b/gi, "quy tắc chính sách");
  out = out.replace(/\bclaims?\b/gi, "khẳng định");
  out = out.replace(/\bPassed\b/g, "Đạt");
  out = out.replace(/\bRejected\b/g, "Không đạt");
  out = out.replace(/\brevisions?\s*=\s*(\d+)/gi, "số lần chỉnh: $1");
  out = out.replace(/\bStatus:\s*revised\b/gi, "Trạng thái: Đã điều chỉnh");
  out = out.replace(/\bStatus:\s*accepted\b/gi, "Trạng thái: Chấp nhận");
  out = out.replace(/\bStatus:\s*rejected\b/gi, "Trạng thái: Từ chối");
  out = out.replace(/\bLoanProposal\b/g, "Phương án vay");
  out = out.replace(/\bLimit \/ rate\b/gi, "Hạn mức / lãi suất");
  out = out.replace(/\bOutcome graph:\s*/gi, "Kết quả luồng: ");
  out = out.replace(/\bstp_candidate\b/gi, "Ứng viên duyệt tự động (STP)");
  out = out.replace(/\bmanual_review_candidate\b/gi, "Ứng viên thẩm định tay");
  out = out.replace(/\bvetoed\b/gi, "Bị veto");
  out = out.replace(/\bHITL\b/g, "phê duyệt người");
  out = out.replace(/\bSTP\b/g, "duyệt tự động");
  out = out.replace(/\brule_ids\b/gi, "mã rule");
  out = out.replace(/\btool_results\b/gi, "kết quả công cụ");
  out = out.replace(/\bDEMO-INLINE-[A-Z0-9_]+\b/gi, "Ticket demo");
  out = out.replace(/\bhttp-worker:[^\s,]+/gi, "agent");
  out = out.replace(/\bdeterministic-fallback\b/gi, "đường dự phòng");
  out = out.replace(/\bFail-closed\b/gi, "chặn an toàn");
  out = out.replace(/\bfail-closed\b/gi, "chặn an toàn");
  out = out.replace(/\bblocking\b/gi, "chặn cứng");
  // Soften leftover snake_case tokens
  out = out.replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, (token) => {
    if (PRODUCT_LABELS[token] || DOC_KIND_LABELS[token] || TOOL_LABELS[token]) {
      return look(
        { ...PRODUCT_LABELS, ...DOC_KIND_LABELS, ...TOOL_LABELS },
        token,
      );
    }
    return fieldSlugLabelVi(token);
  });
  return out;
}

export function stageForNode(node: string): SopStage | null {
  return NODE_STAGE[node.trim().toLowerCase()] ?? null;
}

export function laneLabelVi(lane: number): string {
  if (lane === 1) return "Duyệt tự động";
  if (lane === 2) return "Hỗ trợ model";
  return "Cần người kiểm soát";
}
