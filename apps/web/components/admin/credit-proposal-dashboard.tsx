"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogFooter } from "@/components/ui";
import type { CreditAssessment, LoanProposal } from "@/lib/api";
import { recommendationLabelVi } from "@/lib/labels";
import { cn } from "@/lib/cn";

function formatMoney(n?: number | null): string {
  return n == null || Number.isNaN(n) ? "—" : `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;
}

function formatRate(n?: number | null): string {
  return n == null || Number.isNaN(n) ? "—" : `${(Number(n) * 100).toFixed(2)}%/năm`;
}

function formatRatio(n?: number | null): string {
  return n == null || Number.isNaN(n) ? "—" : `${(Number(n) * 100).toFixed(1)}%`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function proposalStatusLabelVi(status?: string): string {
  if (status === "accepted") return "Chấp nhận";
  if (status === "revised") return "Điều chỉnh";
  if (status === "rejected") return "Từ chối";
  return "Chưa có";
}

function proposalStatusVariant(
  status?: string,
): "success" | "pending" | "warning" | "default" {
  if (status === "accepted") return "success";
  if (status === "revised") return "pending";
  if (status === "rejected") return "warning";
  return "default";
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-3.5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-navy leading-snug">{value}</p>
    </div>
  );
}

function CicReportPanel({ cic }: { cic: Record<string, unknown> }) {
  const overdue = asRecord(cic.overdue_history);
  const typesVi = Array.isArray(cic.credit_types_vi)
    ? (cic.credit_types_vi as unknown[]).map(String)
    : [];
  const institutions = Array.isArray(cic.institutions)
    ? (cic.institutions as unknown[]).map(String)
    : [];

  return (
    <div className="space-y-3 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={cic.record_found ? "success" : "warning"}>
          {cic.record_found ? "Có bản ghi CIC" : "Không tìm thấy / synthetic"}
        </Badge>
        <Badge variant="outline">{str(cic.dataset_version, "—")}</Badge>
        <span className="text-[11px] text-muted-foreground">
          Evidence: {str(cic.evidence_id)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Họ tên CIC" value={str(cic.full_name)} />
        <Metric label="CCCD" value={str(cic.cccd)} />
        <Metric label="Mã KH" value={str(cic.customer_id)} />
        <Metric
          label="Nhóm nợ / CIC group"
          value={`${str(cic.debt_group ?? cic.cic_group)} · ${str(cic.classification)}`}
        />
        <Metric label="Điểm CIC" value={str(cic.score)} />
        <Metric label="PD" value={cic.pd != null ? String(cic.pd) : "—"} />
        <Metric label="Nợ xấu" value={cic.has_bad_debt ? "Có" : "Không"} />
        <Metric label="Dư nợ" value={formatMoney(num(cic.outstanding_debt ?? cic.total_outstanding_vnd))} />
        <Metric
          label="Nghĩa vụ / tháng"
          value={formatMoney(num(cic.monthly_debt_obligation_vnd))}
        />
        <Metric label="Số TCTD" value={str(cic.number_of_institutions)} />
        <Metric label="Khoản vay active" value={str(cic.num_active_loans)} />
        <Metric label="Hạn mức tín dụng" value={formatMoney(num(cic.credit_limit_total_vnd))} />
        <Metric
          label="Quá hạn (max ngày)"
          value={str(cic.max_overdue_days ?? cic.overdue_days ?? overdue?.max_days)}
        />
        <Metric
          label="Số lần quá hạn"
          value={str(overdue?.count ?? "—")}
        />
        <Metric
          label="Số tiền quá hạn"
          value={formatMoney(num(overdue?.amount_vnd ?? cic.overdue_amount_vnd))}
        />
        <Metric label="Tra cứu 6 tháng" value={str(cic.inquiries_last_6m)} />
        <Metric label="Lịch sử (tháng)" value={str(cic.credit_history_months)} />
        <Metric label="Nguồn" value={str(cic.source)} />
      </div>

      {typesVi.length > 0 ? (
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Loại tín dụng
          </p>
          <p className="mt-1 text-sm text-navy">{typesVi.join(" · ")}</p>
        </div>
      ) : null}

      {institutions.length > 0 ? (
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Tổ chức tín dụng
          </p>
          <p className="mt-1 text-sm text-navy">{institutions.join(", ")}</p>
        </div>
      ) : null}
    </div>
  );
}

export function CreditProposalDashboard({
  open,
  onOpenChange,
  credit,
  proposal,
  customerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credit: CreditAssessment;
  proposal: LoanProposal | null;
  customerName?: string;
}) {
  const [view, setView] = useState<"summary" | "cic" | "proposal">("summary");
  const [cicReviewed, setCicReviewed] = useState(false);

  const cic = useMemo(
    () => asRecord(credit.tool_results?.cic_lookup),
    [credit.tool_results],
  );

  useEffect(() => {
    if (open) {
      setView("summary");
      setCicReviewed(false);
    }
  }, [open]);

  const title =
    view === "cic"
      ? "Báo cáo CIC"
      : view === "proposal"
        ? "Đề xuất phương án vay"
        : "Credit đã hoàn tất thẩm định";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} className="w-[min(56rem,calc(100vw-1.5rem))] max-h-[90vh] overflow-y-auto">
        {view === "summary" ? (
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-accent/40 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-on-primary">
                <Sparkles size={16} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">
                  Agent Credit đã xong
                  {customerName ? ` · ${customerName}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Xem đầy đủ báo cáo CIC trước, rồi mới xuất phương án vay cuối. Credit không phê duyệt
                  và không veto.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Khuyến nghị</span>
              <Badge variant="brand">{recommendationLabelVi(credit.recommendation)}</Badge>
              {cicReviewed ? (
                <Badge variant="success">Đã xem báo cáo CIC</Badge>
              ) : (
                <Badge variant="pending">Chưa xem báo cáo CIC</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="DTI" value={formatRatio(credit.dti)} />
              <Metric label="Thu nhập xác minh" value={formatMoney(credit.income)} />
              <Metric label="Hạn mức Credit" value={formatMoney(credit.proposed_limit)} />
              <Metric label="Lãi suất Credit" value={formatRate(credit.proposed_rate)} />
            </div>

            {cic ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Tóm tắt CIC (chi tiết ở báo cáo)
                </p>
                <p className="mt-1 text-sm text-navy">
                  Nhóm {str(cic.debt_group ?? cic.cic_group)} · {str(cic.classification)} · điểm{" "}
                  {str(cic.score)} · nợ xấu {cic.has_bad_debt ? "Có" : "Không"}
                </p>
              </div>
            ) : (
              <p className="text-xs text-warning-foreground">
                Không có kết quả cic_lookup trong tool_results — không thể xuất báo cáo CIC.
              </p>
            )}

            {credit.rationale ? (
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Nhận định Credit
                </p>
                <p className="mt-1 max-h-28 overflow-y-auto text-sm text-navy whitespace-pre-wrap">
                  {credit.rationale}
                </p>
              </div>
            ) : null}

            <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!cic}
                  onClick={() => {
                    setView("cic");
                    setCicReviewed(true);
                  }}
                  className="gap-2"
                >
                  <ShieldCheck size={14} aria-hidden />
                  Xem báo cáo CIC
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!proposal || !cicReviewed}
                  onClick={() => setView("proposal")}
                  className="gap-2"
                  title={
                    !cicReviewed
                      ? "Cần xem báo cáo CIC trước khi xuất phương án vay"
                      : undefined
                  }
                >
                  <FileText size={14} aria-hidden />
                  Đề xuất phương án vay
                </Button>
              </div>
            </DialogFooter>
            {!cicReviewed ? (
              <p className="text-[11px] text-muted-foreground">
                Bắt buộc xem báo cáo CIC đầy đủ trước khi xuất phương án vay cuối.
              </p>
            ) : null}
          </div>
        ) : null}

        {view === "cic" && cic ? (
          <div className="space-y-4 text-left">
            <CicReportPanel cic={cic} />
            <DialogFooter className="mt-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setView("summary")}>
                Quay lại tóm tắt
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!proposal}
                onClick={() => setView("proposal")}
                className="gap-2"
              >
                <FileText size={14} aria-hidden />
                Xuất đề xuất phương án vay
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {view === "proposal" ? (
          <div className="space-y-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Phương án cuối sau khi đã đối chiếu báo cáo CIC — chưa phải quyết định phê duyệt.
              </p>
              <Badge variant={proposalStatusVariant(proposal?.status)}>
                {proposalStatusLabelVi(proposal?.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric
                label="Số tiền xin vay"
                value={formatMoney(proposal?.requested_amount)}
              />
              <Metric label="Hạn mức đề xuất" value={formatMoney(proposal?.proposed_limit)} />
              <Metric label="Lãi suất đề xuất" value={formatRate(proposal?.proposed_rate)} />
              <Metric
                label="Kỳ hạn"
                value={proposal?.term_months != null ? `${proposal.term_months} tháng` : "—"}
              />
              <Metric label="Trả hàng tháng" value={formatMoney(proposal?.monthly_payment)} />
              <Metric label="DTI" value={formatRatio(proposal?.dti)} />
            </div>

            {proposal && proposal.revisions.length > 0 ? (
              <ul
                className={cn(
                  "space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground",
                )}
              >
                {proposal.revisions.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            ) : null}

            <DialogFooter className="mt-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setView("cic")}>
                Quay lại báo cáo CIC
              </Button>
              <Button type="button" variant="primary" onClick={() => onOpenChange(false)}>
                Tiếp tục chỉnh phương án / thẩm định
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
