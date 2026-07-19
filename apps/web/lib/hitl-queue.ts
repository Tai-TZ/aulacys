import type { AssessResponse } from "@/lib/api";
import type { AppraisalReportData } from "@/lib/appraisal-report";
import { buildAppraisalReportData } from "@/lib/appraisal-report";

const QUEUE_KEY = "shb.hitl.queue";

export interface HitlCase {
  id: string;
  created_at: string;
  customer_name: string;
  product: string;
  amount: number;
  application_id: string;
  outcome: string;
  veto: boolean;
  rule_ids: string[];
  unverified_rules: string[];
  lane: number;
  replan_count: number;
  ticket_id: string | null;
  summary: string;
  /** Official appraisal report for approver review */
  report?: AppraisalReportData;
  decision?: "approved" | "rejected";
  decided_at?: string;
  decided_ticket_id?: string;
}

export type EnqueueAssessMeta = {
  customer_name: string;
  product: string;
  amount: number;
  application_id?: string;
  national_id?: string;
  phone?: string;
  dob?: string;
  address?: string;
  occupation?: string;
  term_months?: number;
  annual_rate?: number | null;
  monthly_income?: number | null;
  purpose?: string;
};

function readAll(): HitlCase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HitlCase[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: HitlCase[]) {
  sessionStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, 20)));
}

export function listHitlCases(): HitlCase[] {
  return readAll();
}

export function enqueueAssessResult(result: AssessResponse, meta: EnqueueAssessMeta): HitlCase {
  const unverified = (result.compliance?.violations ?? [])
    .filter((v) => v.unverified)
    .map((v) => v.rule_id);
  const report = buildAppraisalReportData(result, meta);
  const item: HitlCase = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    customer_name: meta.customer_name,
    product: meta.product,
    amount: meta.amount,
    application_id: meta.application_id ?? "retail-demo",
    outcome: result.outcome,
    veto: Boolean(result.compliance?.veto),
    rule_ids: result.compliance?.rule_ids ?? [],
    unverified_rules: unverified,
    lane: result.run_trace.lane,
    replan_count: result.run_trace.replan_count,
    ticket_id: result.ticket?.ticket_id != null ? String(result.ticket.ticket_id) : null,
    summary: result.response,
    report,
  };
  writeAll([item, ...readAll()]);
  return item;
}

export function markHitlDecision(
  id: string,
  decision: "approved" | "rejected",
  decidedTicketId?: string,
): HitlCase | null {
  const items = readAll();
  const idx = items.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  items[idx] = {
    ...items[idx],
    decision,
    decided_at: new Date().toISOString(),
    decided_ticket_id: decidedTicketId,
  };
  writeAll(items);
  return items[idx];
}
