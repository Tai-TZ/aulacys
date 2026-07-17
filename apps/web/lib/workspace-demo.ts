/** Seeded demo data for customer workspace — offline / stage-safe. */

export type WorkspaceTab = "dashboard" | "dossier" | "history" | "agent";

export type DocStatus = "missing" | "uploaded" | "verified";

export type PipelineStage =
  | "intake"
  | "credit"
  | "operations"
  | "compliance"
  | "human"
  | "ticket";

export const DEMO_CUSTOMER = {
  name: "Nguyễn Văn An",
  email: "an.nguyen@email.com",
  phone: "0901 234 567",
  cif: "CIF-784512",
  segment: "retail",
};

/** Indicative limits — in production these come from deterministic tools, never the LLM. */
export const CREDIT_LIMITS = [
  {
    product: "retail_mortgage",
    slug: "mua-nha" as const,
    nameVi: "Vay mua nhà",
    nameEn: "Home loan",
    limitVnd: 3_500_000_000,
    usedVnd: 0,
    rateFrom: 8.5,
    maxTermMonths: 300,
  },
  {
    product: "retail_unsecured_salary",
    slug: "mua-oto" as const,
    nameVi: "Vay tín chấp / mua ô tô",
    nameEn: "Unsecured / auto",
    limitVnd: 800_000_000,
    usedVnd: 120_000_000,
    rateFrom: 11.5,
    maxTermMonths: 60,
  },
  {
    product: "study",
    slug: "du-hoc" as const,
    nameVi: "Vay du học",
    nameEn: "Study abroad",
    limitVnd: 1_200_000_000,
    usedVnd: 0,
    rateFrom: 9.2,
    maxTermMonths: 120,
  },
];

export const DTI = {
  ratio: 0.38,
  softCap: 0.45,
  hardCap: 0.55,
};

/** Monthly repayment outlook (seeded) — labels are month index. */
export const REPAYMENT_SERIES = [
  { m: "T1", amount: 18.2 },
  { m: "T2", amount: 18.2 },
  { m: "T3", amount: 18.2 },
  { m: "T4", amount: 22.5 },
  { m: "T5", amount: 22.5 },
  { m: "T6", amount: 22.5 },
];

export const ACTIVE_APPLICATION = {
  id: "HS-2026-118",
  productVi: "Vay mua nhà · retail_mortgage",
  productEn: "Home loan · retail_mortgage",
  amountVnd: 2_000_000_000,
  stage: "compliance" as PipelineStage,
  noteVi:
    "Compliance đang chờ định giá TSBĐ để tính LTV — đúng nhánh veto/replan của demo Digital Expert.",
  noteEn:
    "Compliance is waiting on collateral valuation for LTV — the veto→replan branch of the Digital Expert demo.",
};

export const PIPELINE_ORDER: PipelineStage[] = [
  "intake",
  "credit",
  "operations",
  "compliance",
  "human",
  "ticket",
];

export const DOSSIER_DOCS: {
  id: string;
  titleVi: string;
  titleEn: string;
  hintVi: string;
  hintEn: string;
  status: DocStatus;
  requiredFor: string;
}[] = [
  {
    id: "id",
    titleVi: "CMND / CCCD",
    titleEn: "National ID",
    hintVi: "Mặt trước & sau, còn hạn",
    hintEn: "Front & back, valid",
    status: "verified",
    requiredFor: "KYC",
  },
  {
    id: "income",
    titleVi: "Chứng minh thu nhập",
    titleEn: "Income proof",
    hintVi: "Sao kê lương 6 tháng / hợp đồng LĐ",
    hintEn: "6-month payroll / employment contract",
    status: "uploaded",
    requiredFor: "Credit · DTI",
  },
  {
    id: "residence",
    titleVi: "Giấy tờ cư trú",
    titleEn: "Residence proof",
    hintVi: "Sổ hộ khẩu / xác nhận tạm trú",
    hintEn: "Household book / residence confirmation",
    status: "uploaded",
    requiredFor: "Operations",
  },
  {
    id: "property",
    titleVi: "Giấy tờ TSBĐ (BĐS)",
    titleEn: "Collateral title",
    hintVi: "Sổ đỏ / hợp đồng mua bán",
    hintEn: "Land-use certificate / SPA",
    status: "missing",
    requiredFor: "Ops · LTV",
  },
  {
    id: "valuation",
    titleVi: "Báo cáo định giá",
    titleEn: "Valuation report",
    hintVi: "Bắt buộc trước khi Compliance tính LTV",
    hintEn: "Required before Compliance computes LTV",
    status: "missing",
    requiredFor: "Compliance · veto gate",
  },
  {
    id: "purpose",
    titleVi: "Mục đích sử dụng vốn",
    titleEn: "Loan purpose statement",
    hintVi: "Critic đối chiếu mục đích với chứng từ",
    hintEn: "Critic cross-checks purpose vs evidence",
    status: "uploaded",
    requiredFor: "Compliance · Critic",
  },
];

export const LOAN_HISTORY: {
  id: string;
  productVi: string;
  productEn: string;
  principalVnd: number;
  opened: string;
  closed: string | null;
  status: "active" | "closed" | "settled";
  bankNoteVi: string;
  bankNoteEn: string;
}[] = [
  {
    id: "LN-2023-441",
    productVi: "Vay tín chấp lương",
    productEn: "Salary unsecured",
    principalVnd: 150_000_000,
    opened: "2023-04-12",
    closed: null,
    status: "active",
    bankNoteVi: "Đang trả đều · dư nợ còn ~120 triệu",
    bankNoteEn: "Amortizing · ~VND 120m outstanding",
  },
  {
    id: "LN-2021-089",
    productVi: "Vay mua xe",
    productEn: "Auto loan",
    principalVnd: 420_000_000,
    opened: "2021-09-01",
    closed: "2024-11-20",
    status: "settled",
    bankNoteVi: "Tất toán đúng hạn · không quá hạn",
    bankNoteEn: "Settled on time · no delinquency",
  },
  {
    id: "LN-2019-012",
    productVi: "Thẻ tín dụng",
    productEn: "Credit card",
    principalVnd: 50_000_000,
    opened: "2019-02-15",
    closed: "2022-06-30",
    status: "closed",
    bankNoteVi: "Đã đóng thẻ theo yêu cầu",
    bankNoteEn: "Card closed on request",
  },
];

export const AGENT_SUGGESTIONS = [
  {
    titleVi: "Thiếu gì để mở hồ sơ mua nhà?",
    titleEn: "What's missing for a home-loan file?",
    promptVi:
      "Tôi muốn vay mua nhà 2 tỷ. Hồ sơ hiện thiếu sổ đỏ và báo cáo định giá. Agent cần giấy tờ gì nữa trước khi chạy Credit / Compliance?",
    promptEn:
      "I want a VND 2bn home loan. I'm missing the land title and valuation. What else do agents need before Credit / Compliance runs?",
  },
  {
    titleVi: "DTI và hạn mức của tôi",
    titleEn: "My DTI and limits",
    promptVi:
      "Thu nhập gia đình khoảng 60 triệu/tháng, đang có dư nợ tín chấp 120 triệu. Ước tính DTI và hạn mức retail_mortgage sơ bộ giúp tôi.",
    promptEn:
      "Household income ~VND 60m/month, unsecured balance VND 120m. Estimate DTI and an indicative retail_mortgage limit.",
  },
  {
    titleVi: "Vì sao Compliance chờ định giá?",
    titleEn: "Why does Compliance wait on valuation?",
    promptVi:
      "Giải thích vì sao Compliance phải chờ định giá TSBĐ (LTV) và nhánh veto → replan hoạt động thế nào trong Digital Expert Agents.",
    promptEn:
      "Explain why Compliance waits on collateral valuation (LTV) and how the veto→replan branch works in Digital Expert Agents.",
  },
];

export function formatVnd(n: number, locale: "vi" | "en" = "vi") {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(n) + " ₫";
}

export function dossierProgress(docs = DOSSIER_DOCS) {
  const weight = { missing: 0, uploaded: 0.5, verified: 1 } as const;
  const score = docs.reduce((s, d) => s + weight[d.status], 0);
  return Math.round((score / docs.length) * 100);
}
