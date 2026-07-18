"use client";

import { Bot, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Badge, ScrollArea, Separator } from "@/components/ui";
import type { NodeTrace } from "@/lib/api";
import { nodeLabelVi, toolLabelVi } from "@/lib/labels";
import { cn } from "@/lib/cn";

function toneForNode(node: string, vetoFired: boolean, index: number) {
  const n = node.toLowerCase();
  if (n === "compliance" && vetoFired) return "veto" as const;
  // Second+ planner entry = replan loop
  if (n === "planner" && index > 0) return "replan" as const;
  return "ok" as const;
}

export function NodeTimeline({
  trace,
  vetoFired = false,
  emptyHint = "Submit hồ sơ để xem Planner → agents → replan.",
}: {
  trace: NodeTrace[];
  vetoFired?: boolean;
  emptyHint?: string;
}) {
  const complianceIndexes = trace
    .map((t, i) => (t.node.toLowerCase() === "compliance" ? i : -1))
    .filter((i) => i >= 0);
  const complianceCount = complianceIndexes.length;

  return (
    <ScrollArea className="max-h-[28rem]">
      {trace.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/50 px-6 py-14 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-brand">
            <Bot size={22} />
          </span>
          <p className="text-sm font-medium text-navy">Chưa có trace</p>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-4 pr-1">
          {trace.map((item, index) => {
            const tone = toneForNode(item.node, vetoFired, index);
            const isCompliance = item.node.toLowerCase() === "compliance";
            const passLabel =
              isCompliance && complianceCount > 1
                ? `#${complianceIndexes.indexOf(index) + 1}/${complianceCount}`
                : null;

            return (
              <div key={`${item.node}-${index}`} className="relative flex gap-4">
                <div
                  className={cn(
                    "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                    tone === "veto" && "bg-warning-soft text-warning-foreground",
                    tone === "replan" && "bg-active-soft text-active-foreground",
                    tone === "ok" && "bg-accent text-brand",
                  )}
                >
                  {tone === "veto" ? (
                    <ShieldAlert size={16} />
                  ) : tone === "replan" ? (
                    <Loader2 size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                </div>
                {index < trace.length - 1 && (
                  <span
                    className={cn(
                      "absolute left-[17px] top-9 h-[calc(100%-0.25rem)] w-px",
                      tone === "veto" ? "bg-warning-foreground/35" : "bg-border",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border px-3.5 py-2.5",
                    tone === "veto" && "border-warning-foreground/20 bg-warning-soft/60",
                    tone === "replan" && "border-active-foreground/15 bg-active-soft/50",
                    tone === "ok" && "border-border/60 bg-secondary/40",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-navy">{nodeLabelVi(item.node)}</p>
                      {tone === "veto" && <Badge variant="warning">veto</Badge>}
                      {tone === "replan" && <Badge variant="active">replan</Badge>}
                      {passLabel && <Badge variant="outline">{passLabel}</Badge>}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.latency_ms}ms · {item.fallback_fired ? "fallback" : item.model}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.tool_calls.length > 0
                      ? item.tool_calls.map(toolLabelVi).join(", ")
                      : "Không dùng tool"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {trace.length > 0 && (
        <>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            {trace.length} bước · harness trace
            {vetoFired && complianceCount > 1
              ? ` · Tuân thủ lặp ${complianceCount}× (điểm nhấn demo)`
              : ""}
          </p>
        </>
      )}
    </ScrollArea>
  );
}
