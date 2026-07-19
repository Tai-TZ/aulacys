/**
 * Credit facility agreement (HĐTD) draft for stage-5 Giải ngân.
 * Layout follows formal VN credit-contract style (see docs/reference/hop-dong-tin-dung-…).
 */

import type { AssessResponse } from "@/lib/api";
import { productLabelVi, sanitizeBusinessText } from "@/lib/labels";

export type CreditContractData = {
  contract_no: string;
  signed_place: string;
  signed_day: string;
  signed_month: string;
  signed_year: string;
  lender_name: string;
  lender_address: string;
  borrower_name: string;
  national_id: string;
  phone: string;
  dob: string;
  address: string;
  product_label: string;
  amount: number;
  term_months: number;
  annual_rate: number | null;
  monthly_payment: number | null;
  proposed_limit: number | null;
  purpose: string;
  application_id: string;
  ticket_id: string | null;
};

function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(n)} đồng`;
}

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(Number(n) * 100).toFixed(2)}%/năm`;
}

export function buildCreditContractData(
  result: AssessResponse | null,
  meta: {
    customer_name: string;
    product: string;
    amount: number;
    application_id?: string;
    national_id?: string;
    phone?: string;
    dob?: string;
    address?: string;
    term_months?: number;
    annual_rate?: number | null;
    purpose?: string;
  },
): CreditContractData {
  const now = new Date();
  const appId = meta.application_id ?? "retail-demo";
  const short = appId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const proposal = result?.proposal ?? result?.credit?.proposal ?? null;

  return {
    contract_no: `${short}/HĐTD-SHB`,
    signed_place: "…",
    signed_day: String(now.getDate()).padStart(2, "0"),
    signed_month: String(now.getMonth() + 1).padStart(2, "0"),
    signed_year: String(now.getFullYear()),
    lender_name: "NGÂN HÀNG TMCP SÀI GÒN – HÀ NỘI (SHB) — demo Digital Expert",
    lender_address: "Hà Nội, Việt Nam",
    borrower_name: meta.customer_name || "—",
    national_id: meta.national_id || "—",
    phone: meta.phone || "—",
    dob: meta.dob || "—",
    address: meta.address || "—",
    product_label: productLabelVi(meta.product),
    amount: meta.amount,
    term_months: meta.term_months ?? proposal?.term_months ?? 0,
    annual_rate: meta.annual_rate ?? proposal?.proposed_rate ?? result?.credit?.proposed_rate ?? null,
    monthly_payment: proposal?.monthly_payment ?? null,
    proposed_limit: proposal?.proposed_limit ?? result?.credit?.proposed_limit ?? null,
    purpose: sanitizeBusinessText(meta.purpose) || "—",
    application_id: appId,
    ticket_id: result?.ticket?.ticket_id != null ? String(result.ticket.ticket_id) : null,
  };
}

export function formatContractMoney(n: number | null | undefined): string {
  return money(n);
}

export function formatContractPct(n: number | null | undefined): string {
  return pct(n);
}
