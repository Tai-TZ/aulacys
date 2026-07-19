"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, CircleDashed, XCircle } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import type { AssessResponse, PolicyDecisionEvidence, PolicyViolation } from "@/lib/api";
import { recommendationLabelVi, ruleLabelVi } from "@/lib/labels";
import { cn } from "@/lib/cn";

type CriterionStatus = "passed" | "failed" | "warning" | "missing";

export type AppraisalCriterion = {
  id: string;
  title: string;
  group: string;
  status: CriterionStatus;
  summary: string;
  detail: string;
  source?: string;
};

const CREDIT_CHECK_VI: Record<string, string> = {
  term_within_product_max: "Kỳ hạn trong giới hạn sản phẩm",
  amount_ceiling_configured: "Đã cấu hình trần số tiền",
  amount_within_ceiling: "Số tiền trong trần sản phẩm",
  amount_within_proposed_limit: "Số tiền trong hạn mức định giá",
  rate_within_product_band: "Lãi suất trong khung sản phẩm",
  proposed_rate_available: "Có lãi suất đề xuất",
  proposed_rate_within_band: "Lãi đề xuất trong khung",
  max_dti_configured: "Đã cấu hình DTI tối đa",
  dti_within_max: "DTI trong hạn mức",
  cic_consent_ok: "Đồng ý tra CIC",
  cic_clean: "Lịch sử CIC đạt điều kiện",
  pricing_full_support: "Định giá hỗ trợ đủ phương án",
  monthly_payment_computed: "Đã tính khoản trả hàng tháng",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function statusTone(status: CriterionStatus): "success" | "warning" | "pending" | "active" {
  if (status === "passed") return "success";
  if (status === "failed") return "warning";
  if (status === "warning") return "pending";
  return "active";
}

function statusLabel(status: CriterionStatus): string {
  if (status === "passed") return "Đạt";
  if (status === "failed") return "Không đạt";
  if (status === "warning") return "Cảnh báo";
  return "Chưa đo";
}

function StatusIcon({ status }: { status: CriterionStatus }) {
  if (status === "passed") return <CheckCircle2 size={16} className="text-success-foreground" />;
  if (status === "failed") return <XCircle size={16} className="text-warning-foreground" />;
  if (status === "warning") return <CircleAlert size={16} className="text-pending-foreground" />;
  return <CircleDashed size={16} className="text-muted-foreground" />;
}

function evidenceStatus(status: PolicyDecisionEvidence["status"]): CriterionStatus {
  if (status === "passed") return "passed";
  if (status === "blocking") return "failed";
  if (status === "warning") return "warning";
  return "missing";
}

function buildCriteria(result: AssessResponse): AppraisalCriterion[] {
  const items: AppraisalCriterion[] = [];
  const compliance = result.compliance;
  const credit = result.credit;
  const operations = result.operations;

  const evidence = compliance?.rule_evidence ?? [];
  if (evidence.length > 0) {
    for (const ev of evidence) {
      const st = evidenceStatus(ev.status);
      items.push({
        id: `policy:${ev.rule_id}`,
        title: ruleLabelVi(ev.rule_id),
        group: "Policy / Compliance",
        status: st,
        summary:
          st === "passed"
            ? "Đối chiếu policy đạt."
            : st === "failed"
              ? "Vi phạm chặn (blocking)."
              : st === "warning"
                ? "Cảnh báo — cần xem xét."
                : "Thiếu chỉ số để đánh giá.",
        detail: [
          `Chỉ số: ${ev.metric}`,
          ev.actual != null ? `Giá trị đo: ${ev.actual}` : null,
          `Ngưỡng: ${ev.threshold}`,
          ev.source ? `Nguồn: ${ev.source}` : null,
          ev.evidence_id ? `Evidence: ${ev.evidence_id}` : null,
          ev.dataset_version ? `Dataset: ${ev.dataset_version}` : null,
          ev.policy_version ? `Policy: ${ev.policy_version}` : null,
          ev.standard_reference ? `Chuẩn: ${ev.standard_reference}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        source: "compliance.rule_evidence",
      });
    }
  } else if (compliance) {
    const violationsById = new Map<string, PolicyViolation>();
    for (const v of compliance.violations ?? []) {
      violationsById.set(v.rule_id, v);
    }
    const report = asRecord(compliance.tool_results?.metric_report);
    const facts = asRecord(report?.facts) ?? {};
    const required = Array.isArray(report?.required) ? (report!.required as string[]) : [];
    const missing = new Set(
      Array.isArray(report?.missing) ? (report!.missing as string[]).map(String) : [],
    );

    const ruleIds = new Set<string>([
      ...Object.keys(facts),
      ...required.map(String),
      ...[...(compliance.rule_ids ?? [])],
      ...violationsById.keys(),
    ]);

    // Prefer violation + known profile-ish labels from metric facts keys mapped via rule ids in violations
    if (violationsById.size > 0 || compliance.rule_ids?.length) {
      for (const ruleId of [...violationsById.keys(), ...(compliance.rule_ids ?? [])]) {
        if (items.some((i) => i.id === `policy:${ruleId}`)) continue;
        const v = violationsById.get(ruleId);
        const blocking = Boolean(v && (v.severity === "blocking" || compliance.veto));
        items.push({
          id: `policy:${ruleId}`,
          title: ruleLabelVi(ruleId),
          group: "Policy / Compliance",
          status: blocking ? "failed" : v ? "warning" : "passed",
          summary: v
            ? v.description || (blocking ? "Vi phạm chính sách." : "Cảnh báo chính sách.")
            : "Không có vi phạm ghi nhận cho rule này.",
          detail: v
            ? [
                v.description,
                `Metric: ${v.metric}`,
                v.actual != null ? `Thực tế: ${v.actual}` : null,
                `Ngưỡng: ${v.threshold} (${v.operator})`,
                v.legal_basis ? `Căn cứ: ${v.legal_basis}` : null,
                v.version ? `Version: ${v.version}` : null,
              ]
                .filter(Boolean)
                .join("\n")
            : "Rule nằm trong phạm vi đánh giá và không phát sinh violation.",
          source: "compliance.violations",
        });
      }
    }

    for (const [metricName, rawFact] of Object.entries(facts)) {
      const fact = asRecord(rawFact);
      if (!fact) continue;
      const label = str(fact.label_vi) || metricName;
      const id = `metric:${metricName}`;
      if (items.some((i) => i.id === id)) continue;
      const isMissing = missing.has(metricName);
      const valid = fact.valid !== false && fact.value != null;
      items.push({
        id,
        title: label,
        group: "Chỉ số thẩm định",
        status: isMissing ? "missing" : valid ? "passed" : "warning",
        summary: isMissing
          ? "Thiếu chỉ số — fail-closed."
          : valid
            ? `Đã đo: ${String(fact.value)}${fact.unit ? ` ${String(fact.unit)}` : ""}`
            : str(fact.error) || "Giá trị không hợp lệ.",
        detail: [
          `Nguồn: ${str(fact.source)}`,
          fact.evidence_id ? `Evidence: ${String(fact.evidence_id)}` : null,
          fact.dataset_version ? `Dataset: ${String(fact.dataset_version)}` : null,
          fact.stage ? `Giai đoạn: ${String(fact.stage)}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        source: "compliance.metric_report",
      });
    }
  }

  if (credit) {
    items.push({
      id: "credit:recommendation",
      title: "Khuyến nghị Credit",
      group: "Credit / phương án",
      status:
        credit.recommendation === "support"
          ? "passed"
          : credit.recommendation === "manual_review"
            ? "warning"
            : "failed",
      summary: recommendationLabelVi(credit.recommendation),
      detail: credit.rationale || "Không có nhận định văn bản.",
      source: "credit",
    });

    const reasonableness = asRecord(credit.tool_results?.proposal_reasonableness);
    const checks = asRecord(reasonableness?.checks) ?? {};
    const findings = Array.isArray(reasonableness?.findings)
      ? (reasonableness!.findings as unknown[]).map(String)
      : [];
    for (const [name, ok] of Object.entries(checks)) {
      items.push({
        id: `credit-check:${name}`,
        title: CREDIT_CHECK_VI[name] ?? name,
        group: "Credit / phương án",
        status: ok ? "passed" : "failed",
        summary: ok ? "Đạt kiểm tra hợp lý." : "Không đạt — cần xem xét / điều chỉnh.",
        detail: findings.filter((f) => f.toLowerCase().includes(name.replaceAll("_", " ")) || f.includes(name)).join("\n") ||
          (ok ? "Tool/config xác nhận đạt." : findings.join("\n") || "Không có chi tiết findings."),
        source: "credit.proposal_reasonableness",
      });
    }

    const cic = asRecord(credit.tool_results?.cic_lookup);
    if (cic) {
      const clean =
        !cic.has_bad_debt &&
        Number(cic.max_overdue_days ?? cic.overdue_days ?? 0) === 0 &&
        Number(cic.cic_group ?? cic.debt_group ?? 99) <= 2;
      items.push({
        id: "credit:cic-report",
        title: "Báo cáo CIC (tra cứu bureau)",
        group: "Credit / CIC",
        status: cic.has_bad_debt ? "failed" : clean ? "passed" : "warning",
        summary: `Nhóm ${String(cic.debt_group ?? cic.cic_group)} · ${String(cic.classification ?? "—")} · điểm ${String(cic.score ?? "—")}`,
        detail: [
          `Họ tên: ${String(cic.full_name ?? "—")}`,
          `CCCD: ${String(cic.cccd ?? "—")}`,
          `Dư nợ: ${String(cic.outstanding_debt ?? cic.total_outstanding_vnd ?? "—")}`,
          `Quá hạn max (ngày): ${String(cic.max_overdue_days ?? cic.overdue_days ?? "—")}`,
          `Nợ xấu: ${cic.has_bad_debt ? "Có" : "Không"}`,
          `Evidence: ${String(cic.evidence_id ?? "—")}`,
          `Dataset: ${String(cic.dataset_version ?? "—")}`,
        ].join("\n"),
        source: "credit.cic_lookup",
      });
    }
  }

  if (operations) {
    items.push({
      id: "ops:docs",
      title: "Chứng từ Operations",
      group: "Operations",
      status:
        operations.doc_status === "complete"
          ? "passed"
          : operations.missing?.length
            ? "failed"
            : "warning",
      summary:
        operations.doc_status === "complete"
          ? "Đủ chứng từ bắt buộc."
          : operations.missing?.length
            ? `Thiếu: ${operations.missing.join(", ")}`
            : `Trạng thái: ${operations.doc_status}`,
      detail: operations.rationale || "Không có nhận định Operations.",
      source: "operations",
    });
    if (operations.legal_flags?.length) {
      items.push({
        id: "ops:legal",
        title: "Cờ pháp lý TSBĐ",
        group: "Operations",
        status: "warning",
        summary: operations.legal_flags.join(", "),
        detail: operations.rationale || "Có cờ pháp lý từ land_registry / định giá.",
        source: "operations.legal_flags",
      });
    }
  }

  if (compliance) {
    items.push({
      id: "compliance:kyc",
      title: "KYC",
      group: "Compliance",
      status: compliance.kyc_status === "passed" ? "passed" : "warning",
      summary: `Trạng thái KYC: ${compliance.kyc_status}`,
      detail: compliance.rationale || "",
      source: "compliance.kyc",
    });
  }

  // Dedupe by id keeping first
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function str(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export function appraisalOverallStatus(criteria: AppraisalCriterion[]): {
  tone: "success" | "warning" | "pending" | "active";
  label: string;
} {
  const failed = criteria.filter((c) => c.status === "failed").length;
  const warn = criteria.filter((c) => c.status === "warning" || c.status === "missing").length;
  if (failed > 0) {
    return { tone: "warning", label: "Thẩm định không đạt / có tiêu chí chặn" };
  }
  if (warn > 0) {
    return { tone: "pending", label: "Thẩm định có cảnh báo — cần HITL" };
  }
  if (criteria.length === 0) {
    return { tone: "active", label: "Chưa có tiêu chí" };
  }
  return { tone: "success", label: "Thẩm định đạt" };
}

export function AppraisalCriteriaPanel({
  result,
  onApprove,
}: {
  result: AssessResponse;
  onApprove: () => void;
}) {
  const criteria = useMemo(() => buildCriteria(result), [result]);
  const overall = appraisalOverallStatus(criteria);
  const [openId, setOpenId] = useState<string | null>(criteria[0]?.id ?? null);

  const vetoed = Boolean(result.compliance?.veto) || result.outcome === "vetoed";
  /** Chỉ chặn cứng (veto) mới khóa Duyệt — cảnh báo/không đạt soft vẫn sang HITL. */
  const canApprove = !vetoed;

  const groups = useMemo(() => {
    const map = new Map<string, AppraisalCriterion[]>();
    for (const c of criteria) {
      const list = map.get(c.group) ?? [];
      list.push(c);
      map.set(c.group, list);
    }
    return [...map.entries()];
  }, [criteria]);

  return (
    <Card className="border border-border/70 p-4 shadow-card text-left sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-navy">Báo cáo thẩm định theo tiêu chí</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Danh sách tiêu chí đã đối chiếu trong bước thẩm định (Credit / Compliance / Operations /
            policy). Bấm từng dòng để xem chi tiết.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={overall.tone}>{overall.label}</Badge>
          <Badge variant="outline">{criteria.length} tiêu chí</Badge>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {groups.map(([group, rows]) => (
          <div key={group}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <ul className="space-y-2">
              {rows.map((row) => {
                const open = openId === row.id;
                return (
                  <li key={row.id} className="rounded-xl border border-border/70 bg-card overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-muted/30"
                      onClick={() => setOpenId(open ? null : row.id)}
                      aria-expanded={open}
                    >
                      <StatusIcon status={row.status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-navy">{row.title}</p>
                          <Badge variant={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{row.summary}</p>
                      </div>
                    </button>
                    {open ? (
                      <div className="border-t border-border/60 bg-muted/20 px-3 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Chi tiết report
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-navy">
                          {row.detail || "Không có chi tiết bổ sung."}
                        </p>
                        {row.source ? (
                          <p className="mt-2 text-[11px] text-muted-foreground">Nguồn: {row.source}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {criteria.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Chưa dựng được danh sách tiêu chí từ kết quả thẩm định.
        </p>
      ) : null}

      <div
        className={cn(
          "mt-5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
          canApprove
            ? "border-brand/30 bg-accent/30"
            : "border-warning-foreground/20 bg-warning-soft/30",
        )}
      >
        <div>
          <p className="text-sm font-semibold text-navy">Trạng thái thẩm định</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {vetoed
              ? "Hồ sơ bị veto cứng — không chuyển phê duyệt."
              : "Bấm Duyệt để chuyển sang bước Phê duyệt (STP đã xong hoặc hàng đợi HITL)."}
          </p>
        </div>
        <Button type="button" variant="primary" disabled={!canApprove} onClick={onApprove}>
          Duyệt → Phê duyệt
        </Button>
      </div>
    </Card>
  );
}
