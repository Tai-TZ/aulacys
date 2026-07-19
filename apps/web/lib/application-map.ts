/** Map application-svc Section A JSON → admin AssessFormState / list row. */

import type { AssessApplicationRequest, DeclaredForm, DocumentInput } from "@/lib/api";

export type ApplicationSectionA = {
  id: string;
  product: string;
  total_amount: string | number;
  term_months: number;
  status: string;
  applicant?: {
    full_name?: string;
    dob?: string | null;
    gender?: string | null;
    id_number?: string;
    id_issue_date?: string | null;
    id_issue_place?: string | null;
    old_id_number?: string | null;
    email?: string | null;
  } | null;
  phone?: {
    mobile_1?: string;
    mobile_2?: string | null;
    zalo_phone?: string | null;
  } | null;
  addresses?: {
    kind: string;
    street?: string | null;
    ward?: string | null;
    district?: string | null;
    province?: string | null;
  }[];
  employment?: {
    occupation?: string | null;
    employer_name?: string | null;
    position?: string | null;
    work_address?: string | null;
    salary_day?: string | null;
  } | null;
  financial?: {
    total_income?: string | number | null;
    personal_expense?: string | number | null;
  } | null;
  consent?: {
    data_processing_consent?: boolean;
    marketing_consent?: boolean;
  } | null;
  purposes?: {
    purpose_detail?: string | null;
    category?: string;
  }[];
  references?: {
    seq: number;
    full_name?: string;
    relationship?: string | null;
    phone?: string | null;
    same_address?: boolean | null;
  }[];
  spouse?: {
    full_name?: string | null;
    phone?: string | null;
    id_number?: string | null;
    income?: string | number | null;
    employer_name?: string | null;
    employer_phone?: string | null;
  } | null;
  disbursements?: {
    method?: string;
    bank?: string | null;
    branch?: string | null;
    account_no?: string | null;
    account_name?: string | null;
  }[];
};

export type AssessFormState = {
  product: string;
  declared: DeclaredForm;
  documents: DocumentInput[];
};

const PRODUCT_LABELS: Record<string, string> = {
  retail_unsecured_salary: "Vay tiêu dùng theo lương (Salary Loan)",
  retail_mortgage: "Vay thế chấp mua nhà (Mortgage Loan)",
  "loan-1": "Vay mua nhà đất",
  "loan-2": "Vay mua nhà dự án",
  "loan-unsecured-term": "Vay tín chấp theo món",
};

function num(v: string | number | null | undefined, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtDob(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function genderVi(g: string | null | undefined): string | undefined {
  if (!g) return undefined;
  if (g === "nu" || g.toLowerCase() === "nữ") return "Nữ";
  if (g === "nam" || g.toLowerCase() === "nam") return "Nam";
  return g;
}

function joinAddress(a?: {
  street?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
}): string | undefined {
  if (!a) return undefined;
  const parts = [a.street, a.ward, a.district, a.province].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

export function productLabel(product: string): string {
  return PRODUCT_LABELS[product] ?? product;
}

export function applicationToAssessForm(raw: ApplicationSectionA): AssessFormState {
  const applicant = raw.applicant ?? {};
  const phone = raw.phone ?? {};
  const financial = raw.financial ?? {};
  const consent = raw.consent ?? {};
  const employment = raw.employment ?? {};
  const permanent = raw.addresses?.find((a) => a.kind === "permanent");
  const current = raw.addresses?.find((a) => a.kind === "current");
  const refs = [...(raw.references ?? [])].sort((a, b) => a.seq - b.seq);
  const purpose = raw.purposes?.[0];
  const disb = raw.disbursements?.[0];
  const spouse = raw.spouse;

  const declared: DeclaredForm = {
    customer_name: applicant.full_name ?? "Unknown",
    amount: num(raw.total_amount),
    term_months: raw.term_months ?? 12,
    monthly_income: num(financial.total_income),
    personal_expense: financial.personal_expense != null ? num(financial.personal_expense) : null,
    existing_monthly_debt: 0,
    declared_purpose: purpose?.purpose_detail ?? purpose?.category ?? "Tiêu dùng",
    dob: fmtDob(applicant.dob),
    gender: genderVi(applicant.gender),
    national_id: applicant.id_number,
    national_id_issue_date: fmtDob(applicant.id_issue_date),
    national_id_issue_place: applicant.id_issue_place ?? undefined,
    old_national_id: applicant.old_id_number ?? undefined,
    phone: phone.mobile_1,
    phone_2: phone.mobile_2 ?? undefined,
    zalo_phone: phone.zalo_phone ?? undefined,
    permanent_address: joinAddress(permanent),
    current_address: joinAddress(current) ?? joinAddress(permanent),
    email: applicant.email ?? undefined,
    occupation: employment.occupation ?? undefined,
    company_name: employment.employer_name ?? undefined,
    position: employment.position ?? undefined,
    company_address: employment.work_address ?? undefined,
    salary_payday: employment.salary_day ?? undefined,
    consent_data_processing: Boolean(consent.data_processing_consent),
    consent_advertising: Boolean(consent.marketing_consent),
    id_number: applicant.id_number,
    cic_consent: true,
    disbursement_method: disb?.method,
    disbursement_bank: disb?.bank ?? undefined,
    disbursement_branch: disb?.branch ?? undefined,
    disbursement_account: disb?.account_no ?? undefined,
    disbursement_account_name: disb?.account_name ?? undefined,
    spouse_name: spouse?.full_name ?? undefined,
    spouse_phone: spouse?.phone ?? undefined,
    spouse_national_id: spouse?.id_number ?? undefined,
    spouse_income: spouse?.income != null ? num(spouse.income) : null,
    spouse_company: spouse?.employer_name ?? undefined,
    spouse_workplace_phone: spouse?.employer_phone ?? undefined,
    ref1_name: refs[0]?.full_name,
    ref1_relationship: refs[0]?.relationship ?? undefined,
    ref1_phone: refs[0]?.phone ?? undefined,
    ref1_same_address: refs[0]?.same_address ?? undefined,
    ref2_name: refs[1]?.full_name,
    ref2_relationship: refs[1]?.relationship ?? undefined,
    ref2_phone: refs[1]?.phone ?? undefined,
    ref2_same_address: refs[1]?.same_address ?? undefined,
  };

  const documents: DocumentInput[] = [
    { kind: "cccd", tier: 1, extracted: { verified: true, id_number: applicant.id_number } },
    {
      kind: "sao_ke_luong",
      tier: 1,
      extracted: { monthly_income: num(financial.total_income) },
    },
    { kind: "cic", tier: 1, extracted: { score_band: "B" } },
  ];

  return {
    product: raw.product || "retail_unsecured_salary",
    declared,
    documents,
  };
}

export function applicationToListRow(raw: ApplicationSectionA) {
  const form = applicationToAssessForm(raw);
  return {
    id: raw.id,
    application_id: raw.id,
    customer_name: form.declared.customer_name,
    product: raw.product,
    product_label: productLabel(raw.product),
    amount: form.declared.amount,
    db_status: raw.status,
    scenario: raw.id,
    data: form,
  };
}

export function toAssessRequest(
  form: AssessFormState,
  applicationId?: string | null,
): AssessApplicationRequest {
  // Always include product+declared so assess can fall back if application-svc times out.
  if (applicationId) {
    return {
      application_id: applicationId,
      product: form.product,
      declared: form.declared,
      documents: form.documents,
    };
  }
  return {
    product: form.product,
    declared: form.declared,
    documents: form.documents,
  };
}
