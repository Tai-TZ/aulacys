"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Sub-steps inside business stage 3 (Thẩm định) while assess API runs.
 * Do NOT re-list Tiếp nhận / RM — those are already done on the 5-stage stepper.
 */
export const PIPELINE_RUN_STEPS = [
  { id: "planner", label: "Điều phối", hint: "Planner lập DAG thẩm định" },
  { id: "credit", label: "Thẩm định tín dụng", hint: "CIC · thu nhập · DTI" },
  { id: "compliance", label: "Tuân thủ & Pháp lý", hint: "KYC · AML · hạn mức cứng" },
  { id: "critic", label: "Kiểm soát tuyến 3", hint: "Critic đối chiếu số & citation" },
  { id: "gate", label: "Kết luận thẩm định", hint: "Chuẩn bị phê duyệt STP / HITL" },
] as const;

const RUN_LOGS: Record<(typeof PIPELINE_RUN_STEPS)[number]["id"], string[]> = {
  planner: [
    "Planner đọc product config và dựng DAG",
    "Tách nhánh Credit / Operations / Compliance theo điều kiện phụ thuộc",
  ],
  credit: [
    "Credit gọi CIC, income và calculator DTI",
    "Không để LLM tự sinh số liệu; mọi chỉ số lấy từ tool",
  ],
  compliance: [
    "Compliance kiểm KYC, AML và policy hard-limit",
    "Nếu có purpose contradiction, graph kích hoạt veto và replan",
  ],
  critic: [
    "Critic đối chiếu tool call, citation và số liệu cuối",
    "Sinh review độc lập nhưng không tự thay đổi outcome",
  ],
  gate: [
    "Tổng hợp outcome: STP, HITL hoặc veto",
    "Ghi ticket/audit theo best-effort fallback",
  ],
};

export function AgentRunProgress({
  activeIndex,
  customerName,
}: {
  activeIndex: number;
  customerName?: string;
}) {
  const safeIndex = Math.min(Math.max(activeIndex, 0), PIPELINE_RUN_STEPS.length - 1);
  const pct = Math.round(((safeIndex + 1) / PIPELINE_RUN_STEPS.length) * 100);

  return (
    <div className="rounded-xl border border-brand/20 bg-card p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-left">
          <p className="text-sm font-semibold text-navy">Thẩm định · multi-agent</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {customerName ? `${customerName} · ` : ""}
            Đang thẩm định phương án RM
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-brand">
          <Loader2 size={12} className="animate-spin" />
          {PIPELINE_RUN_STEPS[safeIndex].label}
        </span>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="relative space-y-0">
        {PIPELINE_RUN_STEPS.map((step, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          const isLast = i === PIPELINE_RUN_STEPS.length - 1;
          return (
            <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[11px] top-6 h-[calc(100%-0.75rem)] w-px",
                    done || current ? "bg-brand/40" : "bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  done && "bg-brand text-on-primary",
                  current && "bg-brand text-on-primary ring-4 ring-brand/20",
                  !done && !current && "bg-secondary text-muted-foreground",
                )}
              >
                {done ? (
                  <CheckCircle2 size={12} />
                ) : current ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5 text-left">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    current ? "text-brand" : done ? "text-navy" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{step.hint}</p>
              </div>
              {current && (
                <span className="shrink-0 self-start text-[10px] font-semibold uppercase tracking-wide text-brand">
                  Đang chạy
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 rounded-lg border border-border/70 bg-secondary/30 p-3 text-left">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Agent logs
          </p>
          <p className="text-[10px] font-medium text-brand">
            step {safeIndex + 1}/{PIPELINE_RUN_STEPS.length}
          </p>
        </div>
        <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
          {PIPELINE_RUN_STEPS.slice(0, safeIndex + 1).flatMap((step, stepIndex) =>
            RUN_LOGS[step.id].map((line, lineIndex) => {
              const current = stepIndex === safeIndex;
              return (
                <div
                  key={`${step.id}-${lineIndex}`}
                  className="grid grid-cols-[4.5rem_1fr] gap-2 text-[11px]"
                >
                  <span
                    className={cn(
                      "font-mono",
                      current ? "text-brand" : "text-muted-foreground",
                    )}
                  >
                    {current ? "running" : "done"}
                  </span>
                  <span className={current ? "text-foreground" : "text-muted-foreground"}>
                    {line}
                  </span>
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
