/**
 * Structured payload for the official appraisal report shown to HITL approvers.
 * Built from AssessResponse + declared application fields — no raw tool jargon.
 */

import type { AssessResponse } from "@/lib/api";
import {
  docKindLabelVi,
  docStatusLabelVi,
  outcomeLabelVi,
  productLabelVi,
  recommendationLabelVi,
  ruleLabelVi,
  sanitizeBusinessText,
} from "@/lib/labels";

export type AppraisalReportCriterion = {
  title: string;
  status: "Đạt" | "Không đạt" | "Cảnh báo" | "Chưa đo";
  note: string;
};

export type AppraisalReportData = {
  report_no: string;
  issued_at: string;
  customer_name: string;
  national_id: string;
  phone: string;
  dob: string;
  address: string;
  occupation: string;
  product: string;
  product_label: string;
  amount: number;
  term_months: number;
  annual_rate: number | null;
  monthly_income: number | null;
  purpose: string;
  recommendation: string;
  outcome: string;
  outcome_label: string;
  veto: boolean;
  dti: number | null;
  proposed_limit: number | null;
  proposed_rate: number | null;
  monthly_payment: number | null;
  cic_summary: string;
  doc_status: string;
  missing_docs: string[];
  criteria: AppraisalReportCriterion[];
  credit_rationale: string;
  operations_rationale: string;
  compliance_rationale: string;
  critic_memo: string;
  recommendation_text: string;
  ticket_id: string | null;
  application_id: string;
};

function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(n)} đồng`;
}

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

function statusVi(s: string): AppraisalReportCriterion["status"] {
  if (s === "passed") return "Đạt";
  if (s === "failed" || s === "blocking") return "Không đạt";
  if (s === "warning") return "Cảnh báo";
  return "Chưa đo";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function buildAppraisalReportData(
  result: AssessResponse,
  meta: {
    customer_name: string;
    product: string;
    amount: number;
    application_id?: string;
    national_id?: string;
    phone?: string;
    dob?: string;
    address?: string;
    occupation?: string;
    term_months?: number;
    annual_rate?: number | null;
    monthly_income?: number | null;
    purpose?: string;
  },
): AppraisalReportData {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const issued_at = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const appId = meta.application_id ?? "retail-demo";
  const short = appId.replace(/-/g, "").slice(0, 8).toUpperCase();

  const credit = result.credit;
  const ops = result.operations;
  const compliance = result.compliance;
  const proposal = result.proposal ?? credit?.proposal ?? null;
  const cic = asRecord(credit?.tool_results?.cic_lookup);

  const criteria: AppraisalReportCriterion[] = [];
  for (const ev of compliance?.rule_evidence ?? []) {
    criteria.push({
      title: ruleLabelVi(ev.rule_id),
      status: statusVi(ev.status),
      note:
        ev.actual != null
          ? `Giá trị: ${ev.actual}; ngưỡng: ${ev.threshold}`
          : sanitizeBusinessText(ev.metric),
    });
  }
  if (criteria.length === 0) {
    for (const v of compliance?.violations ?? []) {
      criteria.push({
        title: ruleLabelVi(v.rule_id),
        status: v.severity === "blocking" || compliance?.veto ? "Không đạt" : "Cảnh báo",
        note: sanitizeBusinessText(v.description) || ruleLabelVi(v.rule_id),
      });
    }
  }
  if (credit) {
    criteria.push({
      title: "Khuyến nghị Credit",
      status:
        credit.recommendation === "support"
          ? "Đạt"
          : credit.recommendation === "manual_review"
            ? "Cảnh báo"
            : "Không đạt",
      note: recommendationLabelVi(credit.recommendation),
    });
  }
  if (ops) {
    criteria.push({
      title: "Chứng từ bắt buộc",
      status: ops.doc_status === "complete" ? "Đạt" : "Không đạt",
      note: ops.missing?.length
        ? `Thiếu: ${ops.missing.map((d) => docKindLabelVi(d)).join(", ")}`
        : docStatusLabelVi(ops.doc_status),
    });
  }

  const veto = Boolean(compliance?.veto) || result.outcome === "vetoed";
  let recommendation_text: string;
  if (veto) {
    recommendation_text =
      "Kiến nghị từ chối giải ngân do vi phạm hạn mức cứng / chính sách. Không chuyển phê duyệt tự động.";
  } else if (result.outcome === "stp_approved") {
    recommendation_text =
      "Hồ sơ đủ điều kiện duyệt tự động theo cấu hình sản phẩm. Đề nghị ghi nhận giải ngân theo quy trình STP.";
  } else if (result.outcome === "ready_for_human_approval") {
    recommendation_text =
      "Hồ sơ cần người có thẩm quyền xem xét và quyết định phê duyệt hoặc từ chối trên cơ sở báo cáo này.";
  } else {
    recommendation_text = `Kết quả luồng: ${outcomeLabelVi(result.outcome)}.`;
  }

  const cic_summary = cic
    ? `Nhóm ${String(cic.debt_group ?? cic.cic_group ?? "—")}; phân loại ${String(cic.classification ?? "—")}; điểm ${String(cic.score ?? "—")}; nợ xấu: ${cic.has_bad_debt ? "Có" : "Không"}.`
    : "Chưa có kết quả tra cứu lịch sử tín dụng.";

  return {
    report_no: `${short}/BCTĐ-SHB`,
    issued_at,
    customer_name: meta.customer_name || "—",
    national_id: meta.national_id || "—",
    phone: meta.phone || "—",
    dob: meta.dob || "—",
    address: meta.address || "—",
    occupation: meta.occupation || "—",
    product: meta.product,
    product_label: productLabelVi(meta.product),
    amount: meta.amount,
    term_months: meta.term_months ?? proposal?.term_months ?? 0,
    annual_rate: meta.annual_rate ?? proposal?.proposed_rate ?? credit?.proposed_rate ?? null,
    monthly_income: meta.monthly_income ?? credit?.income ?? null,
    purpose: meta.purpose || "—",
    recommendation: recommendationLabelVi(credit?.recommendation),
    outcome: result.outcome,
    outcome_label: outcomeLabelVi(result.outcome),
    veto,
    dti: credit?.dti ?? proposal?.dti ?? null,
    proposed_limit: proposal?.proposed_limit ?? credit?.proposed_limit ?? null,
    proposed_rate: proposal?.proposed_rate ?? credit?.proposed_rate ?? null,
    monthly_payment: proposal?.monthly_payment ?? null,
    cic_summary,
    doc_status: ops ? docStatusLabelVi(ops.doc_status) : "—",
    missing_docs: (ops?.missing ?? []).map((d) => docKindLabelVi(d)),
    criteria,
    credit_rationale: sanitizeBusinessText(credit?.rationale),
    operations_rationale: sanitizeBusinessText(ops?.rationale),
    compliance_rationale: sanitizeBusinessText(compliance?.rationale),
    critic_memo: sanitizeBusinessText(result.critic?.memo),
    recommendation_text,
    ticket_id: result.ticket?.ticket_id != null ? String(result.ticket.ticket_id) : null,
    application_id: appId,
  };
}

export function formatReportMoney(n: number | null | undefined): string {
  return money(n);
}

export function formatReportPct(n: number | null | undefined): string {
  return pct(n);
}
