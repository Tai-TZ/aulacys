"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import { NodeTimeline } from "@/components/admin/node-timeline";
import { StageTracker } from "@/components/admin/stage-tracker";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  Input,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  assess,
  assessApplication,
  type AssessApplicationRequest,
  type AssessResponse,
  type DeclaredForm,
  type DocumentInput,
} from "@/lib/api";
import { enqueueAssessResult } from "@/lib/hitl-queue";
import { compliancePassCount } from "@/lib/trace-to-steps";
import { laneLabelVi, nodeLabelVi, outcomeLabelVi, recommendationLabelVi } from "@/lib/labels";

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
  const [panel, setPanel] = useState<"form" | "result">("form");

  function updateDeclared<K extends keyof DeclaredForm>(key: K, value: DeclaredForm[K]) {
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
      rememberResult(next, form);
      setPanel("result");
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
      setPanel("result");
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
  const compliancePasses = result ? compliancePassCount(result.trace) : 0;

  const stats = [
    {
      label: "Lane",
      value: run ? String(run.lane) : "—",
      change: run ? laneLabelVi(run.lane) : "Chưa chạy",
      icon: Activity,
    },
    {
      label: "Replan",
      value: run ? String(run.replan_count) : "—",
      change: run?.veto_fired ? "Veto đã kích hoạt" : "Chưa veto",
      icon: Clock3,
    },
    {
      label: "Kết quả",
      value: result ? outcomeLabelVi(result.outcome) : "—",
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
        <Alert variant="warning">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">Compliance veto</Badge>
            {unverified.length > 0 && <Badge variant="pending">unverified</Badge>}
            {compliancePasses > 1 && (
              <Badge variant="outline">replan ×{run?.replan_count ?? 0}</Badge>
            )}
          </div>
          <AlertTitle className="mt-2">
            Giới hạn cứng: {(compliance?.rule_ids ?? []).join(", ") || "rule không xác định"}
          </AlertTitle>
          <AlertDescription>
            Planner đã replan {run?.replan_count ?? 0} lần. Timeline lặp node{" "}
            <code className="rounded bg-card px-1.5 py-0.5 text-xs">compliance</code>
            {compliancePasses > 1 ? ` (${compliancePasses}×)` : ""} — money shot của demo.
          </AlertDescription>
          {unverified.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {unverified.map((v) => (
                <li key={v.rule_id}>
                  <strong>{v.rule_id}</strong> · v{v.version ?? "?"} — ngưỡng chưa verify, không
                  trích dẫn ra ngoài.
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {result && (
        <Alert variant="active" className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <AlertTitle>Hồ sơ đã vào hàng đợi HITL</AlertTitle>
            <AlertDescription className="mt-0.5">
              Tiếp theo: người phê duyệt ghi ticket thật qua{" "}
              <code className="text-xs">POST /approvals</code>.
            </AlertDescription>
          </div>
          <Link
            href="/admin/approvals"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary shadow-brand transition hover:opacity-90"
          >
            Mở Người phê duyệt <ArrowRight size={16} />
          </Link>
        </Alert>
      )}

      <Tabs value={panel} onValueChange={(v) => setPanel(v as "form" | "result")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="form">Hồ sơ</TabsTrigger>
            <TabsTrigger value="result" disabled={!result}>
              Kết quả{result ? ` · ${result.trace.length}` : ""}
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setForm(MORTGAGE_DEMO);
                setTier3Confirmed(false);
                setPanel("form");
              }}
            >
              Mortgage (veto)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setForm(UNSECURED_DEMO);
                setTier3Confirmed(false);
                setPanel("form");
              }}
            >
              Tín chấp (HITL)
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={runSeedDemo}>
              Seed /assess
            </Button>
          </div>
        </div>

        <TabsContent value="form">
          <Card className="border-border/70 p-5 shadow-card sm:p-6">
            <div className="mb-6">
              <h2 className="text-base font-semibold tracking-tight text-navy">Hồ sơ vay bán lẻ</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                  POST /assess/application
                </code>
                <span className="mx-1.5 text-border">·</span>
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                  {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
                </code>
              </p>
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
                        <Badge variant="warning" className="font-normal">
                          evidence: {String(doc.extracted.actual_purpose)}
                        </Badge>
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
                <Alert variant="warning">
                  <AlertTitle>Không chạy được thẩm định</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Đang chạy graph…" : "Chạy thẩm định"}
                <ArrowRight size={17} />
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="result">
          {result && (
            <div className="space-y-5">
              <Card className="border-border/70 p-4 shadow-card sm:p-5">
                <p className="mb-3 text-sm font-semibold text-navy">Quy trình khoản vay</p>
                <StageTracker result={result} />
              </Card>
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="space-y-4 border-border/70 p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold tracking-tight text-navy">
                    Tóm tắt kết quả
                  </h2>
                  {run && (
                    <Badge variant={run.veto_fired ? "warning" : "success"}>
                      lane {run.lane}
                    </Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{result.response}</p>
                <Separator />
                {result.credit && (
                  <div className="rounded-xl border border-border/60 bg-secondary/50 p-3.5 text-sm">
                    <p className="font-medium text-navy">{nodeLabelVi("credit")}</p>
                    <p className="mt-1 text-muted-foreground">
                      DTI {result.credit.dti ?? "—"} · {recommendationLabelVi(result.credit.recommendation)}
                    </p>
                  </div>
                )}
                {result.operations && (
                  <div className="rounded-xl border border-border/60 bg-secondary/50 p-3.5 text-sm">
                    <p className="font-medium text-navy">{nodeLabelVi("operations")}</p>
                    <p className="mt-1 text-muted-foreground">
                      Valuation {result.operations.valuation?.toLocaleString("vi-VN") ?? "—"} ·{" "}
                      {result.operations.doc_status}
                    </p>
                  </div>
                )}
                {(result.ticket || result.audit) && (
                  <div className="space-y-2 text-sm">
                    {result.ticket && (
                      <p>
                        <span className="font-medium text-navy">Ticket:</span>{" "}
                        {String(result.ticket.ticket_id ?? "—")} ·{" "}
                        {String(result.ticket.status ?? "")}
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
                <Button type="button" variant="outline" size="sm" onClick={() => setPanel("form")}>
                  Sửa hồ sơ / chạy lại
                </Button>
              </Card>

              <Card className="border-border/70 p-5 shadow-card sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-navy">
                      Tiến trình xử lý (agent)
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Từng bước agent — Tuân thủ lặp = veto → điều chỉnh
                    </p>
                  </div>
                </div>
                <NodeTimeline trace={result.trace} vetoFired={Boolean(run?.veto_fired)} />
              </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Always show a compact timeline beside form when still on form tab but have result */}
      {panel === "form" && result && (
        <Card className="border-border/70 p-5 shadow-card sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight text-navy">
              Trace gần nhất
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setPanel("result")}>
              Xem đầy đủ
            </Button>
          </div>
          <NodeTimeline
            trace={result.trace.slice(0, 6)}
            vetoFired={Boolean(run?.veto_fired)}
            emptyHint="Chạy thẩm định để xem timeline."
          />
        </Card>
      )}
    </div>
  );
}
