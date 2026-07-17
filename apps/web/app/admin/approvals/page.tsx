"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { submitApproval } from "@/lib/api";
import { listHitlCases, markHitlDecision, type HitlCase } from "@/lib/hitl-queue";
import { cn } from "@/lib/cn";

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
    <AdminShell activeHref="/admin/approvals" eyebrow="HITL · wow flow tail" title="Người phê duyệt">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Hàng đợi từ <code className="text-xs">Chạy thẩm định</code> (sessionStorage). Phê duyệt →{" "}
          <code className="text-xs">POST /api/v1/approvals</code> ghi ticket thật.
        </p>
        <Link
          href="/admin"
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          Về thẩm định <ArrowRight size={16} />
        </Link>
      </div>

      {pending.length === 0 && cases.length === 0 && (
        <Card className="border-0 p-6 shadow-sm">
          <p className="font-semibold text-navy">Chưa có hồ sơ chờ duyệt</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Chạy thẩm định trên Tổng quan (nên thử retail_unsecured_salary để outcome
            ready_for_human_approval, hoặc mortgage veto vẫn đẩy HITL sau replan cap).
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:opacity-90"
          >
            Mở form thẩm định
          </Link>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-0 p-0 shadow-sm overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-navy">Hàng đợi ({pending.length} chờ)</h2>
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
                      {item.decision ?? "pending"}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {item.product} · {item.amount.toLocaleString("vi-VN")} VND · {item.outcome}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {selected && (
          <Card className="border-0 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="font-semibold text-navy">{selected.customer_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selected.summary}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Lane</p>
                <p className="mt-1 font-semibold text-navy">{selected.lane}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Replan</p>
                <p className="mt-1 font-semibold text-navy">{selected.replan_count}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Ticket graph</p>
                <p className="mt-1 font-semibold text-navy">{selected.ticket_id ?? "—"}</p>
              </div>
            </div>
            {selected.veto && (
              <div className="rounded-lg bg-warning-soft p-3 text-sm text-warning-foreground">
                <p className="flex items-center gap-2 font-semibold">
                  <ShieldAlert size={16} /> Veto: {selected.rule_ids.join(", ") || "—"}
                </p>
                {selected.unverified_rules.length > 0 && (
                  <p className="mt-1">
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
              <p className="rounded-lg bg-success-soft p-3 text-sm text-success-foreground">
                Đã {selected.decision} lúc {selected.decided_at}. Ticket HITL:{" "}
                {selected.decided_ticket_id ?? "—"}
              </p>
            )}

            {lastTicket && (
              <pre className="overflow-x-auto rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                {JSON.stringify(lastTicket, null, 2)}
              </pre>
            )}
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
