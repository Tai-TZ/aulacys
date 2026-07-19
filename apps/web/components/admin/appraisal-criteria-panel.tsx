"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, CircleDashed, XCircle } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import type { AssessResponse, PolicyDecisionEvidence, PolicyViolation } from "@/lib/api";
import {
  creditCheckDetailVi,
  creditFindingVi,
  docKindLabelVi,
  docStatusLabelVi,
  formatMetricValueVi,
  policyDescriptionVi,
  recommendationLabelVi,
  ruleLabelVi,
  sanitizeBusinessText,
  simpleStatusLabelVi,
  sourcePathLabelVi,
  stageLabelVi,
  toolLabelVi,
  unitLabelVi,
} from "@/lib/labels";
import { cn } from "@/lib/cn";

type CriterionStatus = "passed" | "failed" | "warning" | "missing";

type DetailRow = { label: string; value: string };

export type AppraisalCriterion = {
  id: string;
  title: string;
  group: string;
  status: CriterionStatus;
  summary: string;
  details: DetailRow[];
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

const GROUP_LABELS: Record<string, string> = {
  policy: "Tuân thủ & chính sách",
  metrics: "Chỉ số thẩm định",
  credit: "Credit · phương án vay",
  cic: "Credit · CIC",
  operations: "Hồ sơ & TSBĐ (Operations)",
  compliance: "Định danh & tuân thủ",
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

function moneyVi(n: unknown): string {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(num)} ₫`;
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
        group: GROUP_LABELS.policy!,
        status: st,
        summary:
          st === "passed"
            ? "Đối chiếu chính sách đạt."
            : st === "failed"
              ? "Vi phạm chặn cứng."
              : st === "warning"
                ? "Cảnh báo — cần xem xét."
                : "Thiếu chỉ số để đánh giá.",
        details: [
          { label: "Chỉ số", value: sanitizeBusinessText(ev.metric) },
          ...(ev.actual != null
            ? [{ label: "Giá trị đo", value: formatMetricValueVi(ev.actual) }]
            : []),
          { label: "Ngưỡng", value: formatMetricValueVi(ev.threshold) },
          ...(ev.source ? [{ label: "Nguồn kiểm tra", value: toolLabelVi(ev.source) }] : []),
          ...(ev.standard_reference
            ? [{ label: "Căn cứ", value: sanitizeBusinessText(ev.standard_reference) }]
            : []),
        ],
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
    const missing = new Set(
      Array.isArray(report?.missing) ? (report!.missing as string[]).map(String) : [],
    );

    if (violationsById.size > 0 || compliance.rule_ids?.length) {
      for (const ruleId of [...violationsById.keys(), ...(compliance.rule_ids ?? [])]) {
        if (items.some((i) => i.id === `policy:${ruleId}`)) continue;
        const v = violationsById.get(ruleId);
        const blocking = Boolean(v && (v.severity === "blocking" || compliance.veto));
        items.push({
          id: `policy:${ruleId}`,
          title: ruleLabelVi(ruleId),
          group: GROUP_LABELS.policy!,
          status: blocking ? "failed" : v ? "warning" : "passed",
          summary: v
            ? policyDescriptionVi(v.description, ruleId)
            : "Không ghi nhận vi phạm cho tiêu chí này.",
          details: v
            ? [
                { label: "Mô tả", value: policyDescriptionVi(v.description, ruleId) },
                { label: "Chỉ số", value: sanitizeBusinessText(v.metric) },
                ...(v.actual != null
                  ? [{ label: "Giá trị thực tế", value: formatMetricValueVi(v.actual, v.unit) }]
                  : []),
                {
                  label: "Ngưỡng",
                  value: `${formatMetricValueVi(v.threshold, v.unit)}${v.operator ? ` (${v.operator})` : ""}`,
                },
                ...(v.legal_basis
                  ? [{ label: "Căn cứ pháp lý", value: sanitizeBusinessText(v.legal_basis) }]
                  : []),
              ]
            : [{ label: "Kết luận", value: "Tiêu chí nằm trong phạm vi đánh giá, không phát sinh vi phạm." }],
          source: "compliance.violations",
        });
      }
    }

    for (const [metricName, rawFact] of Object.entries(facts)) {
      const fact = asRecord(rawFact);
      if (!fact) continue;
      const label = str(fact.label_vi) || sanitizeBusinessText(metricName);
      const id = `metric:${metricName}`;
      if (items.some((i) => i.id === id)) continue;
      const isMissing = missing.has(metricName);
      const unit = str(fact.unit);
      const valid = fact.valid !== false && fact.value != null;
      const measured = formatMetricValueVi(fact.value, unit);
      items.push({
        id,
        title: label,
        group: GROUP_LABELS.metrics!,
        status: isMissing ? "missing" : valid ? "passed" : "warning",
        summary: isMissing
          ? "Thiếu chỉ số — hệ thống chặn an toàn."
          : valid
            ? `Kết quả: ${measured}`
            : sanitizeBusinessText(str(fact.error)) || "Giá trị không hợp lệ.",
        details: [
          { label: "Kết quả đo", value: measured },
          ...(unit ? [{ label: "Kiểu chỉ số", value: unitLabelVi(unit) }] : []),
          { label: "Nguồn kiểm tra", value: toolLabelVi(str(fact.source) || "—") },
          ...(fact.stage
            ? [{ label: "Giai đoạn", value: stageLabelVi(str(fact.stage)) }]
            : []),
        ],
        source: "compliance.metric_report",
      });
    }
  }

  if (credit) {
    items.push({
      id: "credit:recommendation",
      title: "Khuyến nghị Credit",
      group: GROUP_LABELS.credit!,
      status:
        credit.recommendation === "support"
          ? "passed"
          : credit.recommendation === "manual_review"
            ? "warning"
            : "failed",
      summary: recommendationLabelVi(credit.recommendation),
      details: [
        {
          label: "Nhận định",
          value: sanitizeBusinessText(credit.rationale) || "Không có nhận định văn bản.",
        },
      ],
      source: "credit",
    });

    const reasonableness = asRecord(credit.tool_results?.proposal_reasonableness);
    const checks = asRecord(reasonableness?.checks) ?? {};
    const findings = Array.isArray(reasonableness?.findings)
      ? (reasonableness!.findings as unknown[]).map(String)
      : [];
    for (const [name, ok] of Object.entries(checks)) {
      const passed = Boolean(ok);
      items.push({
        id: `credit-check:${name}`,
        title: CREDIT_CHECK_VI[name] ?? sanitizeBusinessText(name),
        group: GROUP_LABELS.credit!,
        status: passed ? "passed" : "failed",
        summary: passed
          ? "Đạt kiểm tra hợp lý."
          : "Không đạt — cần xem xét hoặc điều chỉnh.",
        details: [
          {
            label: "Chi tiết",
            value: creditCheckDetailVi(name, passed, findings),
          },
        ],
        source: "credit.proposal_reasonableness",
      });
    }

    // Một khối tổng hợp các phát hiện Credit (tránh lặp trên từng tiêu chí)
    if (findings.length > 0) {
      items.push({
        id: "credit:findings",
        title: "Các phát hiện khi kiểm phương án",
        group: GROUP_LABELS.credit!,
        status: findings.length ? "warning" : "passed",
        summary: `${findings.length} điểm cần lưu ý`,
        details: findings.map((f, i) => ({
          label: `Điểm ${i + 1}`,
          value: creditFindingVi(f),
        })),
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
        title: "Báo cáo CIC",
        group: GROUP_LABELS.cic!,
        status: cic.has_bad_debt ? "failed" : clean ? "passed" : "warning",
        summary: `Nhóm ${String(cic.debt_group ?? cic.cic_group ?? "—")} · ${sanitizeBusinessText(String(cic.classification ?? "—"))} · điểm ${String(cic.score ?? "—")}`,
        details: [
          { label: "Họ tên", value: String(cic.full_name ?? "—") },
          { label: "CCCD", value: String(cic.cccd ?? "—") },
          {
            label: "Dư nợ",
            value: moneyVi(cic.outstanding_debt ?? cic.total_outstanding_vnd),
          },
          {
            label: "Quá hạn tối đa",
            value: `${String(cic.max_overdue_days ?? cic.overdue_days ?? "—")} ngày`,
          },
          { label: "Nợ xấu", value: cic.has_bad_debt ? "Có" : "Không" },
        ],
        source: "credit.cic_lookup",
      });
    }
  }

  if (operations) {
    const missingDocs = (operations.missing ?? []).map((d) => docKindLabelVi(d));
    items.push({
      id: "ops:docs",
      title: "Chứng từ bắt buộc",
      group: GROUP_LABELS.operations!,
      status:
        operations.doc_status === "complete"
          ? "passed"
          : operations.missing?.length
            ? "failed"
            : "warning",
      summary:
        operations.doc_status === "complete"
          ? "Đủ chứng từ bắt buộc."
          : missingDocs.length
            ? `Thiếu: ${missingDocs.join(", ")}`
            : `Trạng thái: ${docStatusLabelVi(operations.doc_status)}`,
      details: [
        { label: "Trạng thái", value: docStatusLabelVi(operations.doc_status) },
        ...(missingDocs.length
          ? [{ label: "Chứng từ thiếu", value: missingDocs.join(", ") }]
          : []),
        {
          label: "Nhận định",
          value: sanitizeBusinessText(operations.rationale) || "Không có nhận định.",
        },
      ],
      source: "operations",
    });
    if (operations.legal_flags?.length) {
      items.push({
        id: "ops:legal",
        title: "Cờ pháp lý TSBĐ",
        group: GROUP_LABELS.operations!,
        status: "warning",
        summary: operations.legal_flags.map((f) => sanitizeBusinessText(f)).join(", "),
        details: [
          {
            label: "Nhận định",
            value:
              sanitizeBusinessText(operations.rationale) ||
              "Có cảnh báo pháp lý từ thẩm tra sổ đỏ / định giá.",
          },
        ],
        source: "operations.legal_flags",
      });
    }
  }

  if (compliance) {
    items.push({
      id: "compliance:kyc",
      title: "Định danh khách hàng (KYC)",
      group: GROUP_LABELS.compliance!,
      status: compliance.kyc_status === "passed" ? "passed" : "warning",
      summary: `Trạng thái: ${simpleStatusLabelVi(compliance.kyc_status)}`,
      details: [
        { label: "KYC", value: simpleStatusLabelVi(compliance.kyc_status) },
        { label: "UBO", value: simpleStatusLabelVi(compliance.ubo_status) },
        ...(compliance.rationale
          ? [{ label: "Nhận định", value: sanitizeBusinessText(compliance.rationale) }]
          : []),
      ],
      source: "compliance.kyc",
    });
  }

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
    return { tone: "pending", label: "Thẩm định có cảnh báo — cần phê duyệt người" };
  }
  if (criteria.length === 0) {
    return { tone: "active", label: "Chưa có tiêu chí" };
  }
  return { tone: "success", label: "Thẩm định đạt" };
}

function DetailList({ rows }: { rows: DetailRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Không có chi tiết bổ sung.</p>;
  }
  return (
    <dl className="space-y-2.5">
      {rows.map((row) => (
        <div key={`${row.label}:${row.value.slice(0, 24)}`} className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
          <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
          <dd className="text-sm leading-relaxed text-navy whitespace-pre-wrap">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AppraisalCriteriaPanel({
  result,
  onApprove,
  onViewReport,
}: {
  result: AssessResponse;
  onApprove: () => void;
  onViewReport?: () => void;
}) {
  const criteria = useMemo(() => buildCriteria(result), [result]);
  const overall = appraisalOverallStatus(criteria);
  const [openId, setOpenId] = useState<string | null>(criteria[0]?.id ?? null);

  const vetoed = Boolean(result.compliance?.veto) || result.outcome === "vetoed";
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
            Danh sách tiêu chí đã đối chiếu trong bước thẩm định. Bấm từng dòng để xem chi tiết.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={overall.tone}>{overall.label}</Badge>
          <Badge variant="outline">{criteria.length} tiêu chí</Badge>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {groups.map(([group, rows]) => (
          <div key={group}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <ul className="space-y-2">
              {rows.map((row) => {
                const open = openId === row.id;
                return (
                  <li
                    key={row.id}
                    className="overflow-hidden rounded-xl border border-border/70 bg-card"
                  >
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
                      <div className="border-t border-border/60 bg-muted/20 px-3 py-3 sm:px-4">
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Chi tiết báo cáo
                        </p>
                        <DetailList rows={row.details} />
                        {row.source ? (
                          <p className="mt-3 text-[11px] text-muted-foreground">
                            Nguồn: {sourcePathLabelVi(row.source)}
                          </p>
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
              ? "Hồ sơ bị chặn cứng (veto) — không chuyển phê duyệt."
              : "Bấm Duyệt để chuyển sang bước Phê duyệt (duyệt tự động hoặc chờ người)."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onViewReport ? (
            <Button type="button" variant="outline" onClick={onViewReport}>
              Xem báo cáo thẩm định
            </Button>
          ) : null}
          <Button type="button" variant="primary" disabled={!canApprove} onClick={onApprove}>
            Duyệt → Phê duyệt
          </Button>
        </div>
      </div>
    </Card>
  );
}
