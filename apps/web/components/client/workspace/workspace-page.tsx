"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button, Card, Textarea } from "@/components/ui";
import { BrandMark } from "@/components/client/brand-mark";
import { DtiGauge, LimitBars, RepaymentBars } from "@/components/client/workspace/charts";
import { sendChat } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import {
  ACTIVE_APPLICATION,
  AGENT_SUGGESTIONS,
  CREDIT_LIMITS,
  DEMO_CUSTOMER,
  DOSSIER_DOCS,
  DTI,
  LOAN_HISTORY,
  PIPELINE_ORDER,
  REPAYMENT_SERIES,
  type DocStatus,
  type PipelineStage,
  type WorkspaceTab,
  dossierProgress,
  formatVnd,
} from "@/lib/workspace-demo";
import { readDemoSession, type DemoSession } from "@/lib/demo-session";

const TABS: { id: WorkspaceTab; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "dossier", icon: FileText },
  { id: "history", icon: History },
  { id: "agent", icon: Bot },
];

const STAGE_LABEL: Record<PipelineStage, { vi: string; en: string }> = {
  intake: { vi: "Tiếp nhận", en: "Intake" },
  credit: { vi: "Credit", en: "Credit" },
  operations: { vi: "Operations", en: "Operations" },
  compliance: { vi: "Compliance", en: "Compliance" },
  human: { vi: "Phê duyệt", en: "Human" },
  ticket: { vi: "Ticket", en: "Ticket" },
};

const DOC_STATUS: Record<DocStatus, { vi: string; en: string; className: string }> = {
  missing: {
    vi: "Thiếu",
    en: "Missing",
    className: "bg-warning-soft text-warning-foreground",
  },
  uploaded: {
    vi: "Đã tải",
    en: "Uploaded",
    className: "bg-pending-soft text-pending-foreground",
  },
  verified: {
    vi: "Đã xác minh",
    en: "Verified",
    className: "bg-success-soft text-success-foreground",
  },
};

function stageIndex(stage: PipelineStage) {
  return PIPELINE_ORDER.indexOf(stage);
}

export function WorkspacePage() {
  const { t, locale } = useI18n();
  const w = t.workspace;
  const [tab, setTab] = useState<WorkspaceTab>("dashboard");
  const [session, setSession] = useState<DemoSession | null>(null);

  useEffect(() => {
    const s = readDemoSession();
    setSession(s ?? { name: DEMO_CUSTOMER.name, email: DEMO_CUSTOMER.email });
  }, []);

  const displayName = session?.name || DEMO_CUSTOMER.name;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <BrandMark size="md" />
            <span className="hidden h-5 w-px bg-border sm:block" />
            <div className="hidden sm:block">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {w.shellEyebrow}
              </p>
              <p className="text-sm font-semibold text-navy">{w.shellTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-navy">{displayName}</p>
              <p className="text-xs text-muted-foreground">{DEMO_CUSTOMER.cif}</p>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{w.exit}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
            {w.welcome.replace("{name}", displayName.split(" ").slice(-1)[0] || displayName)}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{w.welcomeSub}</p>
        </div>

        <nav
          className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm"
          aria-label={w.tabsNav}
        >
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                tab === id
                  ? "bg-navy text-on-primary shadow-sm"
                  : "text-navy/70 hover:bg-muted hover:text-navy",
              )}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{w.tabs[id]}</span>
            </button>
          ))}
        </nav>

        {tab === "dashboard" && <DashboardTab />}
        {tab === "dossier" && <DossierTab onOpenAgent={() => setTab("agent")} />}
        {tab === "history" && <HistoryTab />}
        {tab === "agent" && <AgentTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { t, locale } = useI18n();
  const w = t.workspace;
  const currentIdx = stageIndex(ACTIVE_APPLICATION.stage);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {w.statLimit}
          </p>
          <p className="mt-2 text-2xl font-bold text-navy">
            {formatVnd(CREDIT_LIMITS.reduce((s, c) => s + c.limitVnd, 0), locale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{w.statLimitHint}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {w.statUsed}
          </p>
          <p className="mt-2 text-2xl font-bold text-brand">
            {formatVnd(CREDIT_LIMITS.reduce((s, c) => s + c.usedVnd, 0), locale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{w.statUsedHint}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {w.statDossier}
          </p>
          <p className="mt-2 text-2xl font-bold text-navy">{dossierProgress()}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{w.statDossierHint}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <h2 className="text-base font-bold text-navy">{w.limitsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{w.limitsSub}</p>
          <div className="mt-5 space-y-5">
            {CREDIT_LIMITS.map((c) => (
              <div
                key={c.product}
                className="rounded-xl border border-border/80 bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">
                      {locale === "vi" ? c.nameVi : c.nameEn}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {c.product}
                    </p>
                  </div>
                  <Link
                    href={`/vay/${c.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:gap-1.5"
                  >
                    {w.viewProduct} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span>
                    <span className="text-muted-foreground">{w.limitLabel}: </span>
                    <strong className="text-navy">{formatVnd(c.limitVnd, locale)}</strong>
                  </span>
                  <span>
                    <span className="text-muted-foreground">{w.usedLabel}: </span>
                    <strong className="text-navy">{formatVnd(c.usedVnd, locale)}</strong>
                  </span>
                  <span>
                    <span className="text-muted-foreground">{w.rateLabel}: </span>
                    <strong className="text-brand">
                      {c.rateFrom}%/{locale === "vi" ? "năm" : "yr"}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <LimitBars
            className="mt-6"
            items={CREDIT_LIMITS.map((c) => ({
              label: locale === "vi" ? c.nameVi : c.nameEn,
              used: c.usedVnd,
              limit: c.limitVnd,
            }))}
          />
        </Card>

        <Card className="flex flex-col items-center justify-center p-5 lg:col-span-2">
          <h2 className="self-start text-base font-bold text-navy">{w.dtiTitle}</h2>
          <p className="mt-1 self-start text-sm text-muted-foreground">{w.dtiSub}</p>
          <DtiGauge
            className="mt-4"
            ratio={DTI.ratio}
            softCap={DTI.softCap}
            hardCap={DTI.hardCap}
            label={w.dtiStatus}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-bold text-navy">{w.repayTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{w.repaySub}</p>
          <RepaymentBars
            className="mt-6"
            series={REPAYMENT_SERIES}
            unitLabel={locale === "vi" ? "tr" : "m"}
          />
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-navy">{w.pipelineTitle}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {ACTIVE_APPLICATION.id}
              </p>
            </div>
            <span className="rounded-md bg-pending-soft px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-pending-foreground">
              {STAGE_LABEL[ACTIVE_APPLICATION.stage][locale]}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-navy">
            {locale === "vi" ? ACTIVE_APPLICATION.productVi : ACTIVE_APPLICATION.productEn}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatVnd(ACTIVE_APPLICATION.amountVnd, locale)}
          </p>

          <ol className="mt-6 space-y-3">
            {PIPELINE_ORDER.map((stage, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <li key={stage} className="flex items-center gap-3 text-sm">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                  ) : active ? (
                    <Clock3 className="h-4 w-4 shrink-0 animate-pulse text-pending-foreground" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-border" />
                  )}
                  <span
                    className={cn(
                      active ? "font-semibold text-navy" : done ? "text-navy/80" : "text-muted-foreground",
                    )}
                  >
                    {STAGE_LABEL[stage][locale]}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 rounded-lg bg-active-soft px-3 py-2 text-xs leading-relaxed text-active-foreground">
            {locale === "vi" ? ACTIVE_APPLICATION.noteVi : ACTIVE_APPLICATION.noteEn}
          </p>
        </Card>
      </div>
    </div>
  );
}

function DossierTab({ onOpenAgent }: { onOpenAgent: () => void }) {
  const { t, locale } = useI18n();
  const w = t.workspace;
  const progress = dossierProgress();

  return (
    <div className="space-y-6 animate-fade-up">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-navy">{w.dossierTitle}</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{w.dossierSub}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-navy">{progress}%</p>
            <p className="text-xs text-muted-foreground">{w.dossierReady}</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      <ul className="space-y-3">
        {DOSSIER_DOCS.map((doc) => {
          const st = DOC_STATUS[doc.status];
          return (
            <li key={doc.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy">
                      {locale === "vi" ? doc.titleVi : doc.titleEn}
                    </p>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        st.className,
                      )}
                    >
                      {locale === "vi" ? st.vi : st.en}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {locale === "vi" ? doc.hintVi : doc.hintEn}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    → {doc.requiredFor}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-border"
                  type="button"
                  disabled={doc.status === "verified"}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {doc.status === "missing" ? w.upload : w.replace}
                </Button>
              </Card>
            </li>
          );
        })}
      </ul>

      <Card className="flex flex-col items-start gap-3 border-brand/25 bg-accent/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-navy">{w.dossierAgentCta}</p>
          <p className="mt-1 text-sm text-muted-foreground">{w.dossierAgentHint}</p>
        </div>
        <Button
          type="button"
          className="bg-brand text-on-primary hover:bg-brand-hover"
          onClick={onOpenAgent}
        >
          <Sparkles className="h-4 w-4" />
          {w.openAgent}
        </Button>
      </Card>
    </div>
  );
}

function HistoryTab() {
  const { t, locale } = useI18n();
  const w = t.workspace;

  const statusLabel = {
    active: { vi: "Đang hiệu lực", en: "Active", cls: "bg-active-soft text-active-foreground" },
    settled: { vi: "Tất toán", en: "Settled", cls: "bg-success-soft text-success-foreground" },
    closed: { vi: "Đã đóng", en: "Closed", cls: "bg-muted text-muted-foreground" },
  } as const;

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h2 className="text-base font-bold text-navy">{w.historyTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{w.historySub}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="hidden grid-cols-12 gap-2 border-b border-border bg-navy px-4 py-3 text-xs font-semibold text-on-primary sm:grid">
          <div className="col-span-2">{w.colId}</div>
          <div className="col-span-3">{w.colProduct}</div>
          <div className="col-span-2">{w.colAmount}</div>
          <div className="col-span-2">{w.colOpened}</div>
          <div className="col-span-3">{w.colStatus}</div>
        </div>
        {LOAN_HISTORY.map((row) => {
          const st = statusLabel[row.status];
          return (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-2 border-t border-border px-4 py-4 text-sm first:border-t-0 sm:grid-cols-12 sm:items-center"
            >
              <div className="font-mono text-xs text-muted-foreground sm:col-span-2">{row.id}</div>
              <div className="font-semibold text-navy sm:col-span-3">
                {locale === "vi" ? row.productVi : row.productEn}
              </div>
              <div className="sm:col-span-2">{formatVnd(row.principalVnd, locale)}</div>
              <div className="text-muted-foreground sm:col-span-2">{row.opened}</div>
              <div className="sm:col-span-3">
                <span
                  className={cn(
                    "inline-block rounded px-2 py-0.5 text-[11px] font-bold",
                    st.cls,
                  )}
                >
                  {locale === "vi" ? st.vi : st.en}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {locale === "vi" ? row.bankNoteVi : row.bankNoteEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentTab() {
  const { t, locale } = useI18n();
  const w = t.workspace;
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>(
    [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setLoading(true);
    try {
      const { response } = await sendChat(trimmed);
      setMessages((m) => [...m, { role: "assistant", content: response }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: w.agentFallback,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 animate-fade-up lg:grid-cols-5">
      <Card className="flex min-h-[520px] flex-col overflow-hidden p-0 lg:col-span-3">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-on-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">{w.agentTitle}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-chat-online" />
              {w.agentOnline}
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <Bot className="mx-auto h-10 w-10 text-brand" />
              <p className="mt-3 text-sm font-medium text-navy">{w.agentEmpty}</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                {w.agentEmptyHint}
              </p>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-sm text-on-primary">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand text-on-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground">
                  {m.content}
                </div>
              </div>
            ),
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              {w.agentThinking}
            </div>
          )}
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              placeholder={w.agentPlaceholder}
              className="min-h-[44px] resize-none border-border"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              className="h-11 w-11 shrink-0 rounded-xl bg-brand text-on-primary hover:bg-brand-hover"
              aria-label={w.agentSend}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3 lg:col-span-2">
        <h2 className="text-sm font-bold text-navy">{w.agentPrompts}</h2>
        {AGENT_SUGGESTIONS.map((s) => (
          <button
            key={s.titleVi}
            type="button"
            onClick={() => void send(locale === "vi" ? s.promptVi : s.promptEn)}
            className="w-full rounded-xl border border-border bg-card p-4 text-left transition hover:border-brand/40 hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-navy">
              {locale === "vi" ? s.titleVi : s.titleEn}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {locale === "vi" ? s.promptVi : s.promptEn}
            </p>
          </button>
        ))}
        <p className="text-[11px] leading-relaxed text-muted-foreground">{w.agentDisclaimer}</p>
      </div>
    </div>
  );
}
