"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Lock, Plus, Shield } from "lucide-react";
import { Badge, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  ALL_LIMIT_KEYS,
  METRIC_CATALOG,
  type AgentId,
  type GraphConfig,
} from "@/lib/graph-config";

type Props = {
  agentId: string;
  config: GraphConfig;
  onChange: (next: GraphConfig) => void;
};

const RUNTIME_HINT: Record<string, string> = {
  planner:
    "Planner không giữ ngưỡng. Loop veto→replan: Compliance chặn → Planner lập lại kế hoạch.",
  critic: "Critic không chỉnh ngưỡng — chỉ kiểm mọi số có tool call / mọi claim có citation.",
};

type SectionId = "depends" | "limits" | "metrics";

function AccordionSection({
  id,
  title,
  open,
  onToggle,
  children,
  count,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left hover:bg-secondary/40"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          {count != null ? (
            <span className="ml-1 font-normal normal-case text-muted-foreground/80">({count})</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && <div className="space-y-1.5 border-t border-border px-2.5 py-2">{children}</div>}
    </div>
  );
}

export function AgentMetricsPanel({ agentId, config, onChange }: Props) {
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    depends: true,
    limits: false,
    metrics: true,
  });

  if (agentId === "planner" || agentId === "critic") {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">{RUNTIME_HINT[agentId]}</p>
    );
  }

  const metrics = METRIC_CATALOG.filter((m) => m.agent === agentId);
  const appetite = config.appetite ?? {};

  function setAppetite(id: string, value: number) {
    onChange({
      ...config,
      appetite: { ...appetite, [id]: value },
    });
  }

  function setLimit(key: string, value: number) {
    onChange({
      ...config,
      limits: { ...config.limits, [key]: value },
    });
  }

  function addLimit(key: string, defaultValue: number) {
    if (config.limits[key] != null) return;
    setLimit(key, defaultValue);
  }

  function toggleDepend(dep: AgentId) {
    const current = config.depends[agentId as AgentId] ?? [];
    const next = current.includes(dep)
      ? current.filter((d) => d !== dep)
      : [...current, dep];
    onChange({
      ...config,
      depends: {
        ...config.depends,
        [agentId]: next,
      },
    });
  }

  function toggleSection(id: SectionId) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const others = (["credit", "operations", "compliance"] as AgentId[]).filter(
    (a) => a !== agentId && config.agents.includes(a),
  );
  const activeLimits = ALL_LIMIT_KEYS.filter(({ key }) => config.limits[key] != null).length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px]">
          <Lock className="mr-0.5 h-2.5 w-2.5" />
          Luật
        </Badge>
        <Badge variant="brand" className="text-[9px]">
          Khẩu vị
        </Badge>
      </div>

      {others.length > 0 && (
        <AccordionSection
          id="depends"
          title="Phụ thuộc"
          open={openSections.depends}
          onToggle={toggleSection}
          count={others.length}
        >
          {others.map((dep) => {
            const on = (config.depends[agentId as AgentId] ?? []).includes(dep);
            return (
              <label
                key={dep}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
              >
                <input type="checkbox" checked={on} onChange={() => toggleDepend(dep)} />
                <span>
                  {agentId} chờ <strong>{dep}</strong>
                </span>
              </label>
            );
          })}
        </AccordionSection>
      )}

      <AccordionSection
        id="limits"
        title="Limits sản phẩm"
        open={openSections.limits}
        onToggle={toggleSection}
        count={activeLimits}
      >
        {ALL_LIMIT_KEYS.map(({ key, label, defaultValue }) => {
          const has = config.limits[key] != null;
          if (!has) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => addLimit(key, defaultValue)}
                className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:border-brand/40 hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                Thêm {label}
              </button>
            );
          }
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <span className="text-xs font-medium text-navy">{label}</span>
              <Input
                aria-label={label}
                className="h-7 w-20 text-xs"
                value={String(config.limits[key])}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) setLimit(key, n);
                }}
              />
            </div>
          );
        })}
      </AccordionSection>

      <AccordionSection
        id="metrics"
        title="Chỉ số"
        open={openSections.metrics}
        onToggle={toggleSection}
        count={metrics.length}
      >
        {metrics.length === 0 ? (
          <p className="text-xs text-muted-foreground">Không có chỉ số cho agent này.</p>
        ) : (
          metrics.map((m) => {
            const value = m.editable
              ? (appetite[m.id] ?? m.defaultThreshold)
              : m.defaultThreshold;
            return (
              <div
                key={m.id}
                className={cn(
                  "rounded-md border px-2 py-1.5",
                  m.kind === "legal"
                    ? "border-border bg-secondary/40"
                    : "border-brand/20 bg-accent/20",
                )}
              >
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs font-semibold text-navy">{m.label}</span>
                  <Badge variant={m.kind === "legal" ? "outline" : "brand"} className="text-[9px]">
                    {m.kind === "legal" ? "luật" : "khẩu vị"}
                  </Badge>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {m.metric} {m.operator} {value}
                </p>
                {m.editable ? (
                  <Input
                    aria-label={m.label}
                    className="mt-1.5 h-7 w-full text-xs"
                    value={String(value)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) setAppetite(m.id, n);
                    }}
                  />
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    {m.kind === "legal" ? (
                      <>
                        <Shield className="h-3 w-3" /> Cố định — luật / hard limit
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" /> Cờ boolean — không nới ngưỡng
                      </>
                    )}
                  </p>
                )}
              </div>
            );
          })
        )}
      </AccordionSection>
    </div>
  );
}
