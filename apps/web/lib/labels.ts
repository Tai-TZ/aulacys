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
  max_retail_dti: "Vượt trần DTI cho vay bán lẻ",
  max_ltv: "Vượt trần LTV",
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
export const toolLabelVi = (tool: string) => look(TOOL_LABELS, tool);
export const outcomeLabelVi = (outcome: string | null | undefined) => look(OUTCOME_LABELS, outcome);
export const recommendationLabelVi = (rec: string | null | undefined) =>
  look(RECOMMENDATION_LABELS, rec);
export const docKindLabelVi = (kind: string) => look(DOC_KIND_LABELS, kind);
export const productLabelVi = (product: string | null | undefined) => look(PRODUCT_LABELS, product);
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

/** Strip product slugs / technical tokens from free-text API responses. */
export function sanitizeBusinessText(text: string | null | undefined): string {
  if (!text) return "";
  let out = text;
  for (const [slug, label] of Object.entries(PRODUCT_LABELS)) {
    out = out.replaceAll(slug, label);
  }
  out = out.replace(/\bDEMO-INLINE-[A-Z0-9_]+\b/gi, "Ticket demo");
  out = out.replace(/\bhttp-worker:[^\s,]+/gi, "agent");
  out = out.replace(/\bdeterministic-fallback\b/gi, "fallback");
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
