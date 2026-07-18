"use client";

import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { ScrollArea } from "@/components/ui";
import type { NodeTrace } from "@/lib/api";
import { nodeLabelVi, toolLabelVi } from "@/lib/labels";
import { cn } from "@/lib/cn";

function toneForNode(node: string, vetoFired: boolean, index: number) {
  const n = node.toLowerCase();
  if (n === "compliance" && vetoFired) return "veto" as const;
  if (n === "planner" && index > 0) return "replan" as const;
  return "ok" as const;
}

/** Compact business timeline — no ms / model ids / harness jargon. */
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
    <ScrollArea className="max-h-[22rem]">
      <div className="space-y-2.5 pr-1">
        {trace.map((item, index) => {
          const tone = toneForNode(item.node, vetoFired, index);
          const isCompliance = item.node.toLowerCase() === "compliance";
          const passNote =
            isCompliance && complianceCount > 1
              ? `Lần ${complianceIndexes.indexOf(index) + 1}/${complianceCount}`
              : null;

          return (
            <div
              key={`${item.node}-${index}`}
              className={cn(
                "flex gap-3 rounded-xl border px-3 py-2.5",
                tone === "veto" && "border-warning-foreground/25 bg-warning-soft/50",
                tone === "replan" && "border-active-foreground/20 bg-active-soft/40",
                tone === "ok" && "border-border/70 bg-card",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  tone === "veto" && "bg-warning-soft text-warning-foreground",
                  tone === "replan" && "bg-active-soft text-active-foreground",
                  tone === "ok" && "bg-accent text-brand",
                )}
              >
                {tone === "veto" ? (
                  <ShieldAlert size={14} />
                ) : tone === "replan" ? (
                  <Loader2 size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
              </span>
              <div className="min-w-0 flex-1 text-left">
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
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.tool_calls.length > 0
                    ? item.tool_calls.map(toolLabelVi).join(" · ")
                    : "Không gọi công cụ"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
