"use client";

import { cn } from "@/lib/cn";

/** Simple SVG charts — no chart library (locked stack). */

export function LimitBars({
  items,
  className,
}: {
  items: { label: string; used: number; limit: number }[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {items.map((it) => {
        const pct = it.limit <= 0 ? 0 : Math.min(100, (it.used / it.limit) * 100);
        return (
          <div key={it.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-navy">{it.label}</span>
              <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DtiGauge({
  ratio,
  softCap,
  hardCap,
  label,
  className,
}: {
  ratio: number;
  softCap: number;
  hardCap: number;
  label: string;
  className?: string;
}) {
  const pct = Math.min(100, (ratio / hardCap) * 100);
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const tone =
    ratio >= hardCap ? "text-warning-foreground" : ratio >= softCap ? "text-pending-foreground" : "text-brand";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg viewBox="0 0 140 140" className="h-36 w-36" aria-hidden>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 70 70)"
          className="transition-all duration-700"
        />
        <text
          x="70"
          y="68"
          textAnchor="middle"
          className="fill-navy text-[22px] font-bold"
          style={{ fontSize: 22, fontWeight: 700, fill: "var(--navy)" }}
        >
          {Math.round(ratio * 100)}%
        </text>
        <text
          x="70"
          y="90"
          textAnchor="middle"
          style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        >
          DTI
        </text>
      </svg>
      <p className={cn("mt-1 text-center text-xs font-medium", tone)}>{label}</p>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">
        Soft {Math.round(softCap * 100)}% · Hard {Math.round(hardCap * 100)}%
      </p>
    </div>
  );
}

export function RepaymentBars({
  series,
  unitLabel,
  className,
}: {
  series: { m: string; amount: number }[];
  unitLabel: string;
  className?: string;
}) {
  const max = Math.max(...series.map((s) => s.amount), 1);
  return (
    <div className={cn("flex h-40 items-end gap-2", className)}>
      {series.map((s) => (
        <div key={s.m} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground">
            {s.amount}
            {unitLabel}
          </span>
          <div
            className="w-full max-w-[36px] rounded-t-md bg-navy/90 transition-all duration-700 hover:bg-brand"
            style={{ height: `${(s.amount / max) * 100}%`, minHeight: 8 }}
            title={`${s.m}: ${s.amount}${unitLabel}`}
          />
          <span className="text-[11px] font-medium text-navy">{s.m}</span>
        </div>
      ))}
    </div>
  );
}
