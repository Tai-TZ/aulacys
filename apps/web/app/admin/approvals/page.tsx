"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, ShieldAlert, XCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { submitApproval } from "@/lib/api";
import { listHitlCases, markHitlDecision, type HitlCase } from "@/lib/hitl-queue";
import { cn } from "@/lib/cn";

function formatVnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(n)} VNĐ`;
}

export default function ApprovalsPage() {
  const [cases, setCases] = useState<HitlCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState("approver-demo");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTicket, setLastTicket] = useState<Record<string, unknown> | null>(null);

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
          Phê duyệt hoặc từ chối hồ sơ sau khi Digital Expert Agents hoàn tất thẩm định.
        </p>
        <Link
          href="/admin"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary"
        >
          Về thẩm định <ArrowRight size={16} />
        </Link>
      </div>

      {isEmpty ? (
        <Card className="flex flex-col items-center border-border/70 px-6 py-16 text-center shadow-card sm:py-20">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-brand">
            <ClipboardList size={28} />
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-navy">Chưa có hồ sơ chờ duyệt</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Chạy thẩm định trên Tổng quan — hồ sơ cần người phê duyệt sẽ xuất hiện tại đây.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary shadow-brand transition hover:opacity-90"
          >
            Mở form thẩm định <ArrowRight size={16} />
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="overflow-hidden border-border/70 p-0 shadow-card">
            <div className="border-b border-border bg-secondary/40 px-5 py-4">
              <h2 className="text-base font-semibold tracking-tight text-navy">
                Hàng đợi ({pending.length} chờ)
              </h2>
            </div>
            <ul className="divide-y divide-border">
              {cases.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-5 py-4 text-left transition hover:bg-secondary",
                      selectedId === item.id && "bg-secondary",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-navy">{item.customer_name}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          item.decision === "approved" && "bg-success-soft text-success-foreground",
                          item.decision === "rejected" && "bg-warning-soft text-warning-foreground",
                          !item.decision && "bg-pending-soft text-pending-foreground",
                        )}
                      >
                        {item.decision === "approved"
                          ? "Đã duyệt"
                          : item.decision === "rejected"
                            ? "Từ chối"
                            : "Chờ duyệt"}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.product} · {formatVnd(item.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {selected && (
            <Card className="space-y-4 border-border/70 p-5 shadow-card sm:p-6">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-navy">{selected.customer_name}</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{selected.summary}</p>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-secondary/60 px-3.5 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Lane</p>
                  <p className="mt-1 font-semibold text-navy">{selected.lane}</p>
                </div>
                <div className="rounded-xl bg-secondary/60 px-3.5 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Replan</p>
                  <p className="mt-1 font-semibold text-navy">{selected.replan_count}</p>
                </div>
                <div className="rounded-xl bg-secondary/60 px-3.5 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket</p>
                  <p className="mt-1 truncate font-semibold text-navy">{selected.ticket_id ?? "—"}</p>
                </div>
              </div>
              {selected.veto && (
                <div className="rounded-xl bg-warning-soft p-3.5 text-sm text-warning-foreground">
                  <p className="flex items-center gap-2 font-semibold">
                    <ShieldAlert size={16} /> Veto: {selected.rule_ids.join(", ") || "—"}
                  </p>
                  {selected.unverified_rules.length > 0 && (
                    <p className="mt-1.5">
                      Unverified: {selected.unverified_rules.join(", ")} — không trích số này ra ngoài.
                    </p>
                  )}
                </div>
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
                  {error && <p className="text-sm text-warning-foreground">{error}</p>}
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" disabled={loading} onClick={() => decide("approved")}>
                      <CheckCircle2 size={17} /> Phê duyệt
                    </Button>
                    <Button type="button" variant="outline" disabled={loading} onClick={() => decide("rejected")}>
                      <XCircle size={17} /> Từ chối
                    </Button>
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-success-soft p-3.5 text-sm text-success-foreground">
                  Đã {selected.decision === "approved" ? "phê duyệt" : "từ chối"} lúc {selected.decided_at}.
                  Ticket: {selected.decided_ticket_id ?? "—"}
                </p>
              )}

              {lastTicket && (
                <div className="rounded-xl border border-border/70 bg-secondary/40 p-3.5 text-sm">
                  <p className="font-medium text-navy">Ticket đã ghi</p>
                  <p className="mt-1 text-muted-foreground">
                    {String(lastTicket.ticket_id ?? "—")} · {String(lastTicket.status ?? "")}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </AdminShell>
  );
}
