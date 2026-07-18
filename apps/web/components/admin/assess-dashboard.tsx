"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import {
  assess,
  assessApplication,
  type AssessApplicationRequest,
  type AssessResponse,
  type DeclaredForm,
  type DocumentInput,
} from "@/lib/api";
import { enqueueAssessResult } from "@/lib/hitl-queue";
import { cn } from "@/lib/cn";

/** Dashboard always edits a full body (id path is API-only for now). */
type AssessFormState = {
  product: string;
  declared: DeclaredForm;
  documents: DocumentInput[];
};

const MORTGAGE_DEMO: AssessFormState = {
  product: "retail_mortgage",
  declared: {
    customer_name: "Tran Thi B",
    amount: 2_500_000_000,
    term_months: 240,
    annual_rate: 0.105,
    monthly_income: 85_000_000,
    existing_monthly_debt: 8_000_000,
    declared_purpose: "mua nhà để ở",
    collateral_value_declared: 4_000_000_000,
    id_number: "001099000003",
    cic_consent: true,
  },
  documents: [
    { kind: "cccd", tier: 1, extracted: { verified: true } },
    { kind: "sao_ke_tai_khoan", tier: 1, extracted: { monthly_income: 85_000_000 } },
    { kind: "so_do", tier: 2, extracted: { parcel: "DEMO-001" } },
    { kind: "hop_dong_mua_ban", tier: 2, extracted: { seller: "Demo Seller" } },
    { kind: "cic", tier: 1, extracted: { score_band: "A" } },
    {
      kind: "purpose_evidence",
      tier: 2,
      extracted: { actual_purpose: "tất toán khoản vay ở TCTD khác" },
    },
  ],
};

const UNSECURED_DEMO: AssessFormState = {
  product: "retail_unsecured_salary",
  declared: {
    customer_name: "Nguyen Van A",
    amount: 250_000_000,
    term_months: 36,
    annual_rate: 0.13,
    monthly_income: 35_000_000,
    existing_monthly_debt: 3_000_000,
    declared_purpose: "tiêu dùng cá nhân",
    id_number: "001099000001",
    cic_consent: true,
  },
  documents: [
    { kind: "cccd", tier: 1, extracted: { verified: true } },
    { kind: "sao_ke_luong", tier: 1, extracted: { monthly_income: 35_000_000 } },
    { kind: "cic", tier: 1, extracted: { score_band: "A" } },
  ],
};

function laneLabel(lane: number): string {
  if (lane === 1) return "Lane 1 · STP / rule-only";
  if (lane === 2) return "Lane 2 · Cheap model";
  return "Lane 3 · HITL / Critic";
}

function StatusBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    warning: "bg-warning-soft text-warning-foreground",
    pending: "bg-pending-soft text-pending-foreground",
    success: "bg-success-soft text-success-foreground",
    active: "bg-active-soft text-active-foreground",
  };
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", styles[tone])}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-navy">{label}</span>
      {children}
    </label>
  );
}

function parseMoneyInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

function MoneyInput({
  value,
  onChange,
  required,
  "aria-label": ariaLabel,
}: {
  value: number | null | undefined;
  onChange: (next: number | null) => void;
  required?: boolean;
  "aria-label"?: string;
}) {
  const display =
    value == null || Number.isNaN(value) ? "" : new Intl.NumberFormat("vi-VN").format(value);

  return (
    <div className="relative">
      <Input
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) => onChange(parseMoneyInput(e.target.value))}
        required={required}
        aria-label={ariaLabel}
        placeholder="0"
        className="pr-14"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground">
        VNĐ
      </span>
    </div>
  );
}

function rememberResult(result: AssessResponse, form: AssessFormState) {
  enqueueAssessResult(result, {
    customer_name: form.declared.customer_name,
    product: form.product,
    amount: form.declared.amount,
    application_id: "retail-demo",
  });
}

export function AssessDashboard() {
  const [form, setForm] = useState<AssessFormState>(MORTGAGE_DEMO);
  const [tier3Confirmed, setTier3Confirmed] = useState(false);
  const [result, setResult] = useState<AssessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateDeclared<K extends keyof DeclaredForm>(
    key: K,
    value: DeclaredForm[K],
  ) {
    setForm((prev) => ({ ...prev, declared: { ...prev.declared, [key]: value } }));
  }

  function updateDocTier(index: number, tier: DocumentInput["tier"]) {
    setForm((prev) => {
      const documents = prev.documents.map((doc, i) =>
        i === index
          ? {
              ...doc,
              tier,
              confirmed_by: tier === 3 && tier3Confirmed ? "officer-demo" : null,
            }
          : doc,
      );
      return { ...prev, documents };
    });
  }

  async function runSubmitted(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: AssessApplicationRequest = {
        ...form,
        documents: form.documents.map((doc) =>
          doc.tier === 3
            ? { ...doc, confirmed_by: tier3Confirmed ? "officer-demo" : doc.confirmed_by }
            : doc,
        ),
      };
      const next = await assessApplication(body);
      setResult(next);
      rememberResult(next, body);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không gọi được API. Kiểm tra backend :8000 (NEXT_PUBLIC_API_URL).",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runSeedDemo() {
    setLoading(true);
    setError(null);
    try {
      const next = await assess("retail mortgage");
      setResult(next);
      rememberResult(next, MORTGAGE_DEMO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gọi được API seed.");
    } finally {
      setLoading(false);
    }
  }

  const run = result?.run_trace;
  const compliance = result?.compliance;
  const veto = Boolean(compliance?.veto);
  const unverified = (compliance?.violations ?? []).filter((v) => v.unverified);
  const stats = [
    {
      label: "Lane",
      value: run ? String(run.lane) : "—",
      change: run ? laneLabel(run.lane) : "Chưa chạy",
      icon: Activity,
    },
    {
      label: "Replan",
      value: run ? String(run.replan_count) : "—",
      change: run?.veto_fired ? "Veto đã kích hoạt" : "Chưa veto",
      icon: Clock3,
    },
    {
      label: "Outcome",
      value: result?.outcome ?? "—",
      change: result?.response?.slice(0, 48) ?? "Submit hồ sơ để xem",
      icon: CheckCircle2,
    },
    {
      label: "Compliance",
      value: veto ? "VETO" : result ? "OK" : "—",
      change: compliance?.rule_ids?.join(", ") || "Không có rule fire",
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, change, icon: Icon }) => (
          <Card key={label} className="overflow-hidden border-border/70 p-0 shadow-card">
            <div className="h-1 bg-brand/80" aria-hidden />
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-brand">
                  <Icon size={18} />
                </span>
                <span className="max-w-[10rem] truncate text-right text-xs leading-5 text-muted-foreground">
                  {change}
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-navy">{value}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </section>

      {veto && (
        <Card className="border-warning-foreground/15 bg-warning-soft p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone="warning">Compliance veto</StatusBadge>
            <p className="font-semibold text-warning-foreground">
              Hard limit: {(compliance?.rule_ids ?? []).join(", ") || "unknown rule"}
            </p>
            {unverified.length > 0 && <StatusBadge tone="pending">unverified</StatusBadge>}
          </div>
          <p className="mt-2 text-sm text-warning-foreground/90">
            Planner đã replan {run?.replan_count ?? 0} lần. Timeline lặp node{" "}
            <code className="rounded bg-card px-1.5 py-0.5 text-xs">compliance</code> — money shot.
          </p>
          {unverified.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-warning-foreground">
              {unverified.map((v) => (
                <li key={v.rule_id}>
                  <strong>{v.rule_id}</strong> · v{v.version ?? "?"} — ngưỡng chưa verify, không trích dẫn ra ngoài.
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {result && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-active-foreground/10 bg-active-soft p-4 shadow-card">
          <p className="text-sm text-active-foreground">
            Hồ sơ đã vào hàng đợi HITL. Tiếp theo: người phê duyệt ghi ticket.
          </p>
          <Link
            href="/admin/approvals"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary shadow-brand transition hover:opacity-90"
          >
            Mở Người phê duyệt <ArrowRight size={16} />
          </Link>
        </Card>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 p-5 shadow-card sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-navy">Hồ sơ vay bán lẻ</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">POST /assess/application</code>
                <span className="mx-1.5 text-border">·</span>
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                  {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
                </code>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm(MORTGAGE_DEMO);
                  setTier3Confirmed(false);
                }}
              >
                Nạp mortgage (veto)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm(UNSECURED_DEMO);
                  setTier3Confirmed(false);
                }}
              >
                Nạp tín chấp (HITL)
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={runSeedDemo}>
                Seed /assess
              </Button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={runSubmitted}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sản phẩm">
                <select
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={form.product}
                  onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))}
                  aria-label="Sản phẩm vay"
                >
                  <option value="retail_mortgage">retail_mortgage</option>
                  <option value="retail_unsecured_salary">retail_unsecured_salary</option>
                </select>
              </Field>
              <Field label="Họ tên khách hàng">
                <Input
                  value={form.declared.customer_name}
                  onChange={(e) => updateDeclared("customer_name", e.target.value)}
                  required
                />
              </Field>
              <Field label="Số tiền vay">
                <MoneyInput
                  value={form.declared.amount}
                  onChange={(next) => updateDeclared("amount", next ?? 0)}
                  required
                  aria-label="Số tiền vay"
                />
              </Field>
              <Field label="Kỳ hạn (tháng)">
                <Input
                  type="number"
                  value={form.declared.term_months}
                  onChange={(e) => updateDeclared("term_months", Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="Thu nhập tháng">
                <MoneyInput
                  value={form.declared.monthly_income}
                  onChange={(next) => updateDeclared("monthly_income", next ?? 0)}
                  required
                  aria-label="Thu nhập tháng"
                />
              </Field>
              <Field label="Nợ trả tháng hiện có">
                <MoneyInput
                  value={form.declared.existing_monthly_debt ?? 0}
                  onChange={(next) => updateDeclared("existing_monthly_debt", next ?? 0)}
                  aria-label="Nợ trả tháng hiện có"
                />
              </Field>
              <Field label="Mục đích khai báo">
                <Input
                  value={form.declared.declared_purpose}
                  onChange={(e) => updateDeclared("declared_purpose", e.target.value)}
                  required
                />
              </Field>
              <Field label="Giá trị TSBĐ khai báo">
                <MoneyInput
                  value={form.declared.collateral_value_declared}
                  onChange={(next) => updateDeclared("collateral_value_declared", next)}
                  aria-label="Giá trị TSBĐ khai báo"
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-navy">Chứng từ (tier 1–3)</p>
              <div className="space-y-2">
                {form.documents.map((doc, index) => (
                  <div
                    key={`${doc.kind}-${index}`}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-secondary/50 px-3 py-2.5"
                  >
                    <span className="min-w-36 text-sm font-medium text-navy">{doc.kind}</span>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      Tier
                      <select
                        className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                        value={doc.tier}
                        onChange={(e) =>
                          updateDocTier(index, Number(e.target.value) as DocumentInput["tier"])
                        }
                        aria-label={`Tier cho ${doc.kind}`}
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </label>
                    {doc.extracted?.actual_purpose != null && (
                      <span className="text-xs text-warning-foreground">
                        evidence: {String(doc.extracted.actual_purpose)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={tier3Confirmed}
                  onChange={(e) => setTier3Confirmed(e.target.checked)}
                />
                Nhân viên xác nhận tier-3 (<code>confirmed_by</code> — không phải OCR)
              </label>
            </div>

            {error && (
              <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning-foreground">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Đang chạy graph…" : "Chạy thẩm định"}
              <ArrowRight size={17} />
            </Button>
          </form>
        </Card>

        <Card className="border-border/70 p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-navy">Node timeline</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {result ? `${result.trace.length} bước · harness trace` : "Chưa có trace"}
              </p>
            </div>
            {run && (
              <StatusBadge tone={run.veto_fired ? "warning" : "success"}>lane {run.lane}</StatusBadge>
            )}
          </div>
          <div className="mt-6 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
            {(result?.trace ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/50 px-6 py-14 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-brand">
                  <Bot size={22} />
                </span>
                <p className="text-sm font-medium text-navy">Chưa có trace</p>
                <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                  Submit hồ sơ để xem Planner → agents → replan.
                </p>
              </div>
            )}
            {(result?.trace ?? []).map((item, index) => (
              <div key={`${item.node}-${index}`} className="relative flex gap-4">
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-brand ring-4 ring-card">
                  <Bot size={16} />
                </div>
                {index < (result?.trace.length ?? 0) - 1 && (
                  <span className="absolute left-[17px] top-9 h-[calc(100%-0.25rem)] w-px bg-border" />
                )}
                <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-navy">{item.node}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.latency_ms}ms · {item.fallback_fired ? "fallback" : item.model}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.tool_calls.length > 0 ? item.tool_calls.join(", ") : "no tools"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {(result?.ticket || result?.audit) && (
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              {result.ticket && (
                <p>
                  <span className="font-medium text-navy">Ticket:</span>{" "}
                  {String(result.ticket.ticket_id ?? "—")} · {String(result.ticket.status ?? "")}
                </p>
              )}
              {result.audit && (
                <p className="break-all text-muted-foreground">
                  Audit seq={String(result.audit.seq ?? "—")} hash=
                  {String(result.audit.content_hash ?? "—")}
                </p>
              )}
            </div>
          )}

          {result?.credit && (
            <div className="mt-4 rounded-xl border border-border/60 bg-secondary/50 p-3.5 text-sm">
              <p className="font-medium text-navy">Credit</p>
              <p className="mt-1 text-muted-foreground">
                DTI {result.credit.dti ?? "—"} · {result.credit.recommendation}
              </p>
            </div>
          )}
          {result?.operations && (
            <div className="mt-2 rounded-xl border border-border/60 bg-secondary/50 p-3.5 text-sm">
              <p className="font-medium text-navy">Operations</p>
              <p className="mt-1 text-muted-foreground">
                Valuation {result.operations.valuation?.toLocaleString("vi-VN") ?? "—"} ·{" "}
                {result.operations.doc_status}
              </p>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
