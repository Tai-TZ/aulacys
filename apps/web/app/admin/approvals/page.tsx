"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AppraisalReportDialog } from "@/components/admin/appraisal-official-report";
import { CreditContractDialog } from "@/components/admin/credit-loan-contract";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  Input,
  Textarea,
} from "@/components/ui";
import { submitApproval } from "@/lib/api";
import { buildCreditContractData, type CreditContractData } from "@/lib/credit-contract";
import { listHitlCases, markHitlDecision, type HitlCase } from "@/lib/hitl-queue";
import { outcomeLabelVi, productLabelVi, ruleLabelVi } from "@/lib/labels";
import { cn } from "@/lib/cn";

function formatVnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(n)} VNĐ`;
}

function sanitizeSummary(text: string): string {
  return text
    .replace(/\bretail_unsecured_salary\b/gi, "Vay tiêu dùng theo lương")
    .replace(/\bretail_mortgage\b/gi, "Vay thế chấp mua nhà")
    .replace(/\btool\b/gi, "công cụ")
    .replace(/\bHITL\b/g, "phê duyệt người");
}

export default function ApprovalsPage() {
  const [cases, setCases] = useState<HitlCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState("approver-demo");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTicket, setLastTicket] = useState<Record<string, unknown> | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractData, setContractData] = useState<CreditContractData | null>(null);

  function refresh() {
    const items = listHitlCases();
    setCases(items);
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }

  useEffect(() => {
    const items = listHitlCases();
    setCases(items);
    if (items[0]) setSelectedId(items[0].id);
  }, []);

  const selected = cases.find((c) => c.id === selectedId) ?? null;
  const pending = cases.filter((c) => !c.decision);
  const isEmpty = cases.length === 0;

  async function decide(decision: "approved" | "rejected") {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submitApproval({
        application_id: selected.application_id,
        decision,
        signed_by: signedBy || "approver-demo",
        note,
        prior_outcome: selected.outcome,
        prior_ticket_id: selected.ticket_id,
      });
      setLastTicket(res.ticket);
      markHitlDecision(selected.id, decision, String(res.ticket.ticket_id ?? ""));
      setRejectOpen(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không ghi được quyết định HITL");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell activeHref="/admin/approvals" eyebrow="Aulacys · HITL" title="Người phê duyệt">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Xem báo cáo thẩm định chuẩn, rồi phê duyệt hoặc từ chối hồ sơ.
        </p>
        <Link
          href="/admin/bo-ho-so"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary"
        >
          Về yêu cầu vay <ArrowRight size={16} />
        </Link>
      </div>

      {lastTicket && (
        <Alert variant="success" className="mb-5">
          <AlertTitle>Ticket đã ghi</AlertTitle>
          <AlertDescription>
            {String(lastTicket.ticket_id ?? "—")} · {String(lastTicket.status ?? "")}
          </AlertDescription>
        </Alert>
      )}

      {isEmpty ? (
        <Card className="flex flex-col items-center border-border/70 px-6 py-16 text-center shadow-card sm:py-20">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-brand">
            <ClipboardList size={28} />
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-navy">
            Chưa có hồ sơ chờ duyệt
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Chạy thẩm định trên Yêu cầu vay — hồ sơ cần người phê duyệt sẽ xuất hiện tại đây
            (sessionStorage, theo tab trình duyệt).
          </p>
          <Link
            href="/admin/bo-ho-so"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary shadow-brand transition hover:opacity-90"
          >
            Mở yêu cầu vay <ArrowRight size={16} />
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="overflow-hidden border-border/70 p-0 shadow-card">
            <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-4">
              <h2 className="text-base font-semibold tracking-tight text-navy">Hàng đợi</h2>
              <Badge variant="pending">{pending.length} chờ</Badge>
            </div>
            <ul className="divide-y divide-border">
              {cases.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "flex w-full flex-col gap-1.5 px-5 py-4 text-left transition hover:bg-secondary",
                      selectedId === item.id && "bg-secondary",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-navy">{item.customer_name}</span>
                      <Badge
                        variant={
                          item.decision === "approved"
                            ? "success"
                            : item.decision === "rejected"
                              ? "warning"
                              : "pending"
                        }
                      >
                        {item.decision === "approved"
                          ? "Đã duyệt"
                          : item.decision === "rejected"
                            ? "Từ chối"
                            : "Chờ duyệt"}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {productLabelVi(item.product)} · {formatVnd(item.amount)}
                    </span>
                    {item.veto && (
                      <Badge variant="warning" className="w-fit font-normal">
                        Chặn cứng · {ruleLabelVi(item.rule_ids[0] ?? "")}
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {selected && (
            <Card className="space-y-4 border-border/70 p-5 shadow-card sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold tracking-tight text-navy">
                    {selected.customer_name}
                  </h2>
                  <Badge variant="outline">Tuyến {selected.lane}</Badge>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {sanitizeSummary(selected.summary)}
                </p>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-secondary/60 px-3.5 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Kết quả</p>
                  <p className="mt-1 font-semibold text-navy">
                    {outcomeLabelVi(selected.outcome)}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/60 px-3.5 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Số lần điều chỉnh
                  </p>
                  <p className="mt-1 font-semibold text-navy">{selected.replan_count}</p>
                </div>
                <div className="rounded-xl bg-secondary/60 px-3.5 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket</p>
                  <p className="mt-1 truncate font-semibold text-navy">
                    {selected.ticket_id ?? "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={!selected.report}
                  onClick={() => setReportOpen(true)}
                  title={
                    !selected.report
                      ? "Hồ sơ cũ chưa có báo cáo — chạy lại thẩm định để tạo báo cáo chuẩn"
                      : undefined
                  }
                >
                  <FileText size={16} aria-hidden />
                  Xem báo cáo thẩm định
                </Button>
                {selected.decision === "approved" ? (
                  <Button
                    type="button"
                    variant="primary"
                    className="gap-2"
                    onClick={() => {
                      const report = selected.report;
                      const data = buildCreditContractData(null, {
                        customer_name: selected.customer_name,
                        product: selected.product,
                        amount: selected.amount,
                        application_id: selected.application_id,
                        national_id: report?.national_id,
                        phone: report?.phone,
                        dob: report?.dob,
                        address: report?.address,
                        term_months: report?.term_months,
                        annual_rate: report?.annual_rate ?? report?.proposed_rate ?? null,
                        purpose: report?.purpose,
                      });
                      // Prefer numbers from stored appraisal report when available
                      if (report) {
                        data.monthly_payment = report.monthly_payment;
                        data.proposed_limit = report.proposed_limit;
                        data.ticket_id = selected.decided_ticket_id ?? selected.ticket_id;
                      }
                      setContractData(data);
                      setContractOpen(true);
                    }}
                  >
                    <FileText size={16} aria-hidden />
                    Xem hợp đồng tín dụng
                  </Button>
                ) : null}
              </div>

              {selected.veto && (
                <Alert variant="warning">
                  <AlertTitle className="flex items-center gap-2">
                    <ShieldAlert size={16} /> Chặn cứng:{" "}
                    {selected.rule_ids.map((id) => ruleLabelVi(id)).join(", ") || "—"}
                  </AlertTitle>
                  {selected.unverified_rules.length > 0 && (
                    <AlertDescription>
                      Tiêu chí chưa verify:{" "}
                      {selected.unverified_rules.map((id) => ruleLabelVi(id)).join(", ")} — không
                      trích số này ra ngoài.
                    </AlertDescription>
                  )}
                </Alert>
              )}

              {!selected.decision ? (
                <>
                  <label className="block space-y-1.5 text-sm">
                    <span className="font-medium text-navy">Người ký</span>
                    <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
                  </label>
                  <label className="block space-y-1.5 text-sm">
                    <span className="font-medium text-navy">Ghi chú</span>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                  </label>
                  {error && (
                    <Alert variant="warning">
                      <AlertTitle>Lỗi ghi quyết định</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" disabled={loading} onClick={() => decide("approved")}>
                      <CheckCircle2 size={17} /> Phê duyệt
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => setRejectOpen(true)}
                    >
                      <XCircle size={17} /> Từ chối
                    </Button>
                  </div>

                  <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                    <DialogContent title="Xác nhận từ chối">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Từ chối hồ sơ <strong className="text-navy">{selected.customer_name}</strong>
                        ? Ticket từ chối sẽ được ghi qua API.
                      </p>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={() => setRejectOpen(false)}
                        >
                          Huỷ
                        </Button>
                        <Button
                          type="button"
                          disabled={loading}
                          onClick={() => decide("rejected")}
                        >
                          Xác nhận từ chối
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <Alert variant={selected.decision === "approved" ? "success" : "warning"}>
                  <AlertTitle>
                    Đã {selected.decision === "approved" ? "phê duyệt" : "từ chối"}
                  </AlertTitle>
                  <AlertDescription>
                    {selected.decided_ticket_id ?? "—"} · {selected.decided_at}
                  </AlertDescription>
                </Alert>
              )}
            </Card>
          )}
        </div>
      )}

      <AppraisalReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        data={selected?.report ?? null}
      />
      <CreditContractDialog
        open={contractOpen}
        onOpenChange={setContractOpen}
        data={contractData}
      />
    </AdminShell>
  );
}
