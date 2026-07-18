"use client";

import { Bot, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/** Agents shown while the assess API runs (demo progress — API is one-shot). */
export const PIPELINE_RUN_STEPS = [
  { id: "intake", label: "Tiếp nhận hồ sơ" },
  { id: "rm_proposal", label: "RM đề xuất · CIC / DTI / LS" },
  { id: "planner", label: "Điều phối (Planner)" },
  { id: "credit", label: "Thẩm định tín dụng (Credit)" },
  { id: "compliance", label: "Tuân thủ & Pháp lý (Compliance)" },
  { id: "critic", label: "Kiểm soát tuyến 3 (Critic)" },
  { id: "gate", label: "Phê duyệt / Giải ngân" },
] as const;

export function AgentRunProgress({
  activeIndex,
  customerName,
}: {
  activeIndex: number;
  customerName?: string;
}) {
  const safeIndex = Math.min(Math.max(activeIndex, 0), PIPELINE_RUN_STEPS.length - 1);

  return (
    <div className="mt-4 rounded-xl border border-brand/20 bg-accent/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-brand">
          Multi-agent đang chạy
          {customerName ? (
            <>
              {" "}
              · <span className="text-navy">{customerName}</span>
            </>
          ) : null}
        </p>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin text-brand" />
          {PIPELINE_RUN_STEPS[safeIndex].label}
        </span>
      </div>
      <ol className="space-y-2">
        {PIPELINE_RUN_STEPS.map((step, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2 text-xs transition",
                done && "border-brand/20 bg-card text-navy",
                current && "border-brand bg-card shadow-sm ring-1 ring-brand/30",
                !done && !current && "border-border/50 bg-secondary/30 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  done && "bg-brand/15 text-brand",
                  current && "bg-brand text-on-primary",
                  !done && !current && "bg-border/40 text-muted-foreground",
                )}
              >
                {done ? (
                  <CheckCircle2 size={14} />
                ) : current ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Bot size={12} />
                )}
              </span>
              <span className={cn("min-w-0 flex-1 font-medium", current && "text-brand")}>
                {step.label}
              </span>
              {current && (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand">
                  Đang chạy
                </span>
              )}
              {done && <span className="shrink-0 text-[10px] text-muted-foreground">Xong</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
