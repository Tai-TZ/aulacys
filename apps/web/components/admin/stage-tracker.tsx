"use client";

import { CheckCircle2, Circle, Clock3, ShieldAlert } from "lucide-react";
import type { AssessResponse } from "@/lib/api";
import { SOP_STAGES, type SopStage } from "@/lib/labels";
import { cn } from "@/lib/cn";

type StageState = "done" | "current" | "stopped" | "pending";

/** Map an assess result onto the 5 business stages (FLOW-BUSINESS-CONFIRMED.md). */
function stageStates(result: AssessResponse): Record<SopStage, { state: StageState; note: string }> {
  const veto = Boolean(result.compliance?.veto || result.run_trace?.veto_fired);
  const replans = result.run_trace?.replan_count ?? 0;
  const outcome = result.outcome;

  if (veto) {
    return {
      intake: { state: "done", note: "Hồ sơ đã nhận" },
      rm_proposal: { state: "done", note: "Phương án đã lập" },
      appraisal: {
        state: "stopped",
        note: replans > 0 ? `Veto — điều chỉnh ×${replans}` : "Veto cứng",
      },
      approval: { state: "pending", note: "Chưa tới — bị chặn" },
      disbursement: { state: "pending", note: "—" },
    };
  }
  if (outcome === "stp_approved") {
    return {
      intake: { state: "done", note: "Hồ sơ đã nhận" },
      rm_proposal: { state: "done", note: "Phương án đã lập" },
      appraisal: { state: "done", note: "Đạt điều kiện" },
      approval: { state: "done", note: "Agent duyệt (STP)" },
      disbursement: { state: "done", note: "Auto giải ngân (tín chấp)" },
    };
  }
  // ready_for_human_approval (or anything non-veto, non-STP)
  return {
    intake: { state: "done", note: "Hồ sơ đã nhận" },
    rm_proposal: { state: "done", note: "Phương án đã lập" },
    appraisal: { state: "done", note: "Đã thẩm định" },
    approval: { state: "current", note: "Chờ người phê duyệt" },
    disbursement: { state: "pending", note: "Sau khi duyệt" },
  };
}

const ICON: Record<StageState, typeof CheckCircle2> = {
  done: CheckCircle2,
  current: Clock3,
  stopped: ShieldAlert,
  pending: Circle,
};

export function StageTracker({ result }: { result: AssessResponse }) {
  const states = stageStates(result);

  return (
    <div className="flex flex-wrap items-stretch gap-2 sm:flex-nowrap">
      {SOP_STAGES.map((stage, i) => {
        const { state, note } = states[stage.id];
        const Icon = ICON[state];
        return (
          <div key={stage.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                "min-w-0 flex-1 rounded-xl border px-3 py-2.5",
                state === "done" && "border-brand/25 bg-accent",
                state === "current" && "border-active-foreground/25 bg-active-soft/60",
                state === "stopped" && "border-warning-foreground/25 bg-warning-soft/60",
                state === "pending" && "border-border/60 bg-secondary/40",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    state === "done" && "bg-brand/15 text-brand",
                    state === "current" && "bg-active-foreground/15 text-active-foreground",
                    state === "stopped" && "bg-warning-foreground/15 text-warning-foreground",
                    state === "pending" && "bg-border/50 text-muted-foreground",
                  )}
                >
                  <Icon size={14} />
                </span>
                <span className="truncate text-sm font-semibold text-navy">
                  {i + 1}. {stage.short}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground" title={note}>
                {note}
              </p>
            </div>
            {i < SOP_STAGES.length - 1 && (
              <span aria-hidden className="hidden shrink-0 text-border sm:block">
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
