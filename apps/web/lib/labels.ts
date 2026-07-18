/**
 * Central Vietnamese labels for the agent dashboard.
 *
 * The backend emits technical tokens (node ids, tool ids, outcome codes). A business
 * user should never see `compliance` / `cic_lookup` / `stp_approved`. Map everything to
 * a nghiệp-vụ label in ONE place; components import these helpers, never inline strings.
 */

/** Agent node id → business role (VN). */
const NODE_LABELS: Record<string, string> = {
  planner: "Điều phối",
  credit: "Thẩm định tín dụng",
  operations: "Kiểm tra hồ sơ & TSBĐ",
  compliance: "Tuân thủ & Pháp lý",
  critic: "Kiểm soát (tuyến 3)",
  gate: "Phê duyệt / STP",
  hitl: "Phê duyệt / STP",
};

/** SOP stage a node belongs to (see docs/LOAN-SOP.md). */
export type SopStage = "intake" | "appraisal" | "approval" | "disbursement";

export const SOP_STAGES: { id: SopStage; label: string }[] = [
  { id: "intake", label: "Tiếp nhận" },
  { id: "appraisal", label: "Thẩm định" },
  { id: "approval", label: "Phê duyệt" },
  { id: "disbursement", label: "Giải ngân" },
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
  stp_approved: "Duyệt tự động (STP)",
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

/** Document kind → VN. */
const DOC_KIND_LABELS: Record<string, string> = {
  cccd: "CCCD",
  sao_ke_luong: "Sao kê lương",
  sao_ke_tai_khoan: "Sao kê tài khoản",
  so_do: "Sổ đỏ",
  hop_dong_mua_ban: "HĐ mua bán",
  cic: "CIC",
  purpose_evidence: "Chứng từ mục đích",
  dang_ky_ket_hon: "ĐK kết hôn",
};

function look(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key.trim().toLowerCase()] ?? key;
}

export const nodeLabelVi = (node: string) => look(NODE_LABELS, node);
export const toolLabelVi = (tool: string) => look(TOOL_LABELS, tool);
export const outcomeLabelVi = (outcome: string | null | undefined) => look(OUTCOME_LABELS, outcome);
export const recommendationLabelVi = (rec: string | null | undefined) =>
  look(RECOMMENDATION_LABELS, rec);
export const docKindLabelVi = (kind: string) => look(DOC_KIND_LABELS, kind);

export function stageForNode(node: string): SopStage | null {
  return NODE_STAGE[node.trim().toLowerCase()] ?? null;
}

export function laneLabelVi(lane: number): string {
  if (lane === 1) return "Tuyến 1 · STP theo rule";
  if (lane === 2) return "Tuyến 2 · Model rẻ";
  return "Tuyến 3 · HITL / Kiểm soát";
}
