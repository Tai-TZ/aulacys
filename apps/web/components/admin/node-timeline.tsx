"use client";

import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import type { NodeTrace } from "@/lib/api";
import { nodeLabelVi, toolLabelVi } from "@/lib/labels";
import { cn } from "@/lib/cn";

function toneForNode(node: string, vetoFired: boolean, index: number) {
  const n = node.toLowerCase();
  if (n === "compliance" && vetoFired) return "veto" as const;
  if (n === "planner" && index > 0) return "replan" as const;
  return "ok" as const;
}

/** Vertical connected agent timeline — business labels only. */
export function NodeTimeline({
  trace,
  vetoFired = false,
  emptyHint = "Chưa có tiến trình agent.",
}: {
  trace: NodeTrace[];
  vetoFired?: boolean;
  emptyHint?: string;
}) {
  const complianceIndexes = trace
    .map((t, i) => (t.node.toLowerCase() === "compliance" ? i : -1))
    .filter((i) => i >= 0);
  const complianceCount = complianceIndexes.length;

  if (trace.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyHint}
      </p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {trace.map((item, index) => {
        const tone = toneForNode(item.node, vetoFired, index);
        const isCompliance = item.node.toLowerCase() === "compliance";
        const passNote =
          isCompliance && complianceCount > 1
            ? `Lần ${complianceIndexes.indexOf(index) + 1}/${complianceCount}`
            : null;
        const isLast = index === trace.length - 1;

        return (
          <li key={`${item.node}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px",
                  tone === "veto" ? "bg-warning-foreground/30" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                tone === "veto" && "bg-warning-soft text-warning-foreground",
                tone === "replan" && "bg-active-soft text-active-foreground",
                tone === "ok" && "bg-brand text-on-primary",
              )}
            >
              {tone === "veto" ? (
                <ShieldAlert size={14} />
              ) : tone === "replan" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-navy">{nodeLabelVi(item.node)}</p>
                {tone === "veto" && (
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                    Từ chối
                  </span>
                )}
                {tone === "replan" && (
                  <span className="rounded-full bg-active-soft px-2 py-0.5 text-[10px] font-semibold text-active-foreground">
                    Điều chỉnh lại
                  </span>
                )}
                {passNote && (
                  <span className="text-[10px] text-muted-foreground">{passNote}</span>
                )}
              </div>
              {item.tool_calls.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.tool_calls.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-border/70 bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {toolLabelVi(t)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">Không gọi công cụ</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
