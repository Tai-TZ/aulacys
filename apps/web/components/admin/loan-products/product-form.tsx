"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Save, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LoanProduct, LoanProductGroup, ProductStatus } from "./mock-data";
import { ProductPolicyRulesPanel } from "./product-policy-rules";

type DocAppliesTo = "ALL" | "SECURED" | "UNSECURED";

type DocumentCatalogEntry = {
  code: string;
  title: string;
  items: string[];
  appliesTo: DocAppliesTo;
};

/** Master checklist — product only stores which groups/items are selected. */
const DOCUMENT_CATALOG: DocumentCatalogEntry[] = [
  {
    code: "LEGAL_DOCUMENTS",
    title: "Hồ sơ pháp lý",
    appliesTo: "ALL",
    items: [
      "CCCD còn hiệu lực",
      "Thông tin cư trú",
      "Giấy tờ chứng minh mối quan hệ (nếu có)",
      "Giấy đăng ký kết hôn hoặc xác nhận độc thân",
    ],
  },
  {
    code: "INCOME_DOCUMENTS",
    title: "Hồ sơ chứng minh thu nhập trả nợ",
    appliesTo: "ALL",
    items: [
      "Hợp đồng lao động",
      "Sao kê lương 3 tháng gần nhất",
      "Sao kê tài khoản nhận lương",
      "Xác nhận thu nhập khác (nếu có)",
      "Hồ sơ nguồn thu nhập khác",
    ],
  },
  {
    code: "LOAN_PURPOSE_DOCUMENTS",
    title: "Hồ sơ chứng minh mục đích vay vốn",
    appliesTo: "ALL",
    items: [
      "Phương án sử dụng vốn kiêm cam kết trả nợ",
      "Giấy đề nghị vay vốn kiêm phương án trả nợ",
      "Hợp đồng đặt cọc",
      "Hợp đồng mua bán hoặc chuyển nhượng",
      "Giấy tờ liên quan đến bất động sản",
    ],
  },
  {
    code: "COLLATERAL_DOCUMENTS",
    title: "Hồ sơ tài sản bảo đảm",
    appliesTo: "SECURED",
    items: [
      "Giấy chứng nhận quyền sử dụng đất",
      "Hồ sơ pháp lý của tài sản",
      "Hồ sơ định giá",
    ],
  },
  {
    code: "VEHICLE_DOCUMENTS",
    title: "Hồ sơ liên quan phương tiện",
    appliesTo: "SECURED",
    items: [
      "Đăng ký xe / cà vẹt",
      "Hóa đơn mua xe",
      "Giấy chứng nhận bảo hiểm xe",
    ],
  },
  {
    code: "STUDY_DOCUMENTS",
    title: "Hồ sơ học tập / du học",
    appliesTo: "ALL",
    items: [
      "Thư mời nhập học / Offer letter",
      "Hóa đơn học phí",
      "Hộ chiếu còn hiệu lực",
    ],
  },
];

type DocSelection = Record<string, string[]>; // code -> selected item labels

function catalogForSecuredType(secured: "SECURED" | "UNSECURED"): DocumentCatalogEntry[] {
  return DOCUMENT_CATALOG.filter(
    (e) => e.appliesTo === "ALL" || e.appliesTo === secured,
  );
}

function selectionFromProductDocs(
  groups: LoanProduct["documentGroups"] | undefined,
  secured: "SECURED" | "UNSECURED",
): DocSelection {
  const available = catalogForSecuredType(secured);
  const out: DocSelection = {};
  if (!groups?.length) {
    // Defaults for unsecured demo product
    if (secured === "UNSECURED") {
      for (const code of ["LEGAL_DOCUMENTS", "INCOME_DOCUMENTS", "LOAN_PURPOSE_DOCUMENTS"]) {
        const entry = available.find((e) => e.code === code);
        if (entry) out[code] = [...entry.items.slice(0, 3)];
      }
    }
    return out;
  }
  for (const g of groups) {
    const byCode = available.find((e) => e.code && e.code === g.code);
    const byTitle = available.find(
      (e) => e.title === g.title || e.title === g.name,
    );
    const entry = byCode || byTitle;
    if (!entry) continue;
    const items = (g.items || []).filter(Boolean);
    out[entry.code] = items.length ? items : [...entry.items];
  }
  return out;
}

function productDocsFromSelection(selection: DocSelection): {
  title: string;
  items: string[];
  code: string;
  name: string;
  required: boolean;
}[] {
  return DOCUMENT_CATALOG.filter((e) => (selection[e.code]?.some((i) => i.trim()) ?? false)).map(
    (e) => ({
      code: e.code,
      title: e.title,
      name: e.title,
      required: true,
      items: selection[e.code]!.map((i) => i.trim()).filter(Boolean),
    }),
  );
}

// List of available customer segments
const SEGMENTS = [
  "Khách hàng cá nhân phổ thông",
  "Khách hàng ưu tiên",
  "Hộ kinh doanh",
  "Cá nhân có hoạt động sản xuất kinh doanh",
  "Người nhận lương",
  "Người tự doanh"
];

// 1. Component: CustomerSegmentSelect
interface SegmentProps {
  selectedSegments: string[];
  onChange: (segments: string[]) => void;
}
export function CustomerSegmentSelect({ selectedSegments, onChange }: SegmentProps) {
  const handleToggle = (segment: string) => {
    if (selectedSegments.includes(segment)) {
      onChange(selectedSegments.filter(s => s !== segment));
    } else {
      onChange([...selectedSegments, segment]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-[#003B71]">Phân khúc khách hàng áp dụng <span className="text-[#DC2626]">*</span></label>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {SEGMENTS.map(s => {
          const checked = selectedSegments.includes(s);
          return (
            <label 
              key={s}
              className={cn(
                "flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none text-xs transition duration-150",
                checked 
                  ? "bg-[#F58220]/5 border-[#F58220]/40 font-semibold text-[#003B71]" 
                  : "bg-white border-border/80 text-muted-foreground hover:bg-secondary/40"
              )}
            >
              <input 
                type="checkbox"
                checked={checked}
                onChange={() => handleToggle(s)}
                className="h-4 w-4 accent-[#F58220]"
              />
              <span>{s}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// 2. Component: ProductClassificationSection
interface ClassProps {
  groups: LoanProductGroup[];
  productGroupId: string;
  setProductGroupId: (val: string) => void;
  selectedSegments: string[];
  setSelectedSegments: (val: string[]) => void;
  purpose: string;
  setPurpose: (val: string) => void;
  loanMethod: string;
  setLoanMethod: (val: string) => void;
  securedType: "SECURED" | "UNSECURED";
  setSecuredType: (val: "SECURED" | "UNSECURED") => void;
  creditMethods: string[];
  setCreditMethods: (val: string[]) => void;
  errors: Record<string, string>;
}
export function ProductClassificationSection({
  groups,
  productGroupId,
  setProductGroupId,
  selectedSegments,
  setSelectedSegments,
  purpose,
  setPurpose,
  loanMethod,
  setLoanMethod,
  securedType,
  setSecuredType,
  creditMethods,
  setCreditMethods,
  errors
}: ClassProps) {
  return (
    <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
      <h3 className="font-extrabold text-[#003B71] text-base border-b border-border/40 pb-2">
        1. Phân loại sản phẩm tín dụng
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Type (LOCKED to Individual) */}
        <div>
          <label className="block text-xs font-bold text-[#003B71] mb-1.5">Đối tượng khách hàng</label>
          <div className="relative">
            <input 
              type="text" 
              value="Khách hàng cá nhân" 
              disabled 
              className="w-full h-11 border border-border/60 bg-[#F7F9FC] text-muted-foreground font-semibold rounded-xl px-3 outline-none text-xs cursor-not-allowed"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded bg-neutral-200 px-1.5 py-0.5 text-[9px] font-bold text-[#6B7280]">
              LOCKED
            </span>
          </div>
        </div>

        {/* Product Group Selection */}
        <div>
          <label className="block text-xs font-bold text-[#003B71] mb-1.5">
            Nhóm sản phẩm vay <span className="text-[#DC2626]">*</span>
          </label>
          <select 
            value={productGroupId}
            onChange={(e) => setProductGroupId(e.target.value)}
            className={cn(
              "w-full h-11 border bg-white rounded-xl px-3 outline-none text-xs text-foreground focus:ring-1 focus:ring-[#F58220]",
              errors.productGroupId ? "border-[#DC2626]" : "border-border"
            )}
          >
            <option value="">Chọn nhóm sản phẩm</option>
            {groups.filter(g => g.isActive).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {errors.productGroupId && <span className="text-[10px] text-[#DC2626] block mt-1">{errors.productGroupId}</span>}
        </div>

        {/* Loan Method */}
        <div>
          {securedType === "UNSECURED" ? (
            <div>
              <label className="block text-xs font-bold text-[#003B71] mb-1.5">
                Phương thức cấp khoản vay <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex gap-4 mt-2.5 h-11 items-center flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-foreground select-none">
                  <input 
                    type="checkbox"
                    checked={creditMethods.includes("TERM_LOAN")}
                    onChange={(e) => {
                      if (creditMethods.includes("TERM_LOAN")) {
                        setCreditMethods(creditMethods.filter(m => m !== "TERM_LOAN"));
                      } else {
                        setCreditMethods([...creditMethods, "TERM_LOAN"]);
                      }
                    }}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Cho vay theo món
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-foreground select-none">
                  <input 
                    type="checkbox"
                    checked={creditMethods.includes("CREDIT_LIMIT")}
                    onChange={(e) => {
                      if (creditMethods.includes("CREDIT_LIMIT")) {
                        setCreditMethods(creditMethods.filter(m => m !== "CREDIT_LIMIT"));
                      } else {
                        setCreditMethods([...creditMethods, "CREDIT_LIMIT"]);
                      }
                    }}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Cho vay theo hạn mức tín dụng
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-400 select-none cursor-not-allowed">
                  <input 
                    type="checkbox"
                    checked={false}
                    disabled
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Cho vay thấu chi
                </label>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-[#003B71] mb-1.5">Phương thức cho vay <span className="text-[#DC2626]">*</span></label>
              <select 
                value={loanMethod}
                onChange={(e) => setLoanMethod(e.target.value)}
                className="w-full h-11 border border-border bg-white rounded-xl px-3 outline-none text-xs text-foreground focus:ring-1 focus:ring-[#F58220]"
              >
                <option value="Cho vay trả góp">Cho vay từng lần (Trả góp hàng tháng)</option>
                <option value="Cho vay hạn mức">Cho vay hạn mức</option>
                <option value="Cho vay kinh doanh theo từng lần">Cho vay từng lần</option>
                <option value="Thấu chi tiêu dùng">Thấu chi tiêu dùng</option>
              </select>
            </div>
          )}
        </div>

        {/* Secured Type */}
        <div>
          <label className="block text-xs font-bold text-[#003B71] mb-1.5">Hình thức bảo đảm <span className="text-[#DC2626]">*</span></label>
          <div className="flex gap-4 h-11 items-center">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-foreground select-none">
              <input 
                type="radio" 
                name="secured" 
                checked={securedType === "SECURED"} 
                onChange={() => setSecuredType("SECURED")}
                className="h-4 w-4 accent-[#F58220]"
              />
              Có tài sản bảo đảm
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-foreground select-none">
              <input 
                type="radio" 
                name="secured" 
                checked={securedType === "UNSECURED"} 
                onChange={() => setSecuredType("UNSECURED")}
                className="h-4 w-4 accent-[#F58220]"
              />
              Không có tài sản bảo đảm
            </label>
          </div>
        </div>
      </div>

      {/* Customer Segments Multi-Select */}
      <CustomerSegmentSelect selectedSegments={selectedSegments} onChange={setSelectedSegments} />

      {/* Purpose */}
      <div>
        <label className="block text-xs font-bold text-[#003B71] mb-1.5">
          Mục đích vay vốn cụ thể <span className="text-[#DC2626]">*</span>
        </label>
        <Input 
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Ví dụ: Mua nhà đất thổ cư, mua ô tô cũ, bổ sung vốn lưu động..."
          className={cn("h-11 rounded-xl text-xs", errors.purpose ? "border-[#DC2626]" : "border-border")}
        />
        {errors.purpose && <span className="text-[10px] text-[#DC2626] block mt-1">{errors.purpose}</span>}
      </div>
    </div>
  );
}

// 3. Main Component: IndividualLoanProductForm
interface FormProps {
  groups: LoanProductGroup[];
  editingProduct: LoanProduct | null;
  catalogSource?: "database" | "memory" | null;
  saving?: boolean;
  onSave: (prod: LoanProduct) => void;
  onCancel: () => void;
}
export function IndividualLoanProductForm({
  groups,
  editingProduct,
  catalogSource,
  saving = false,
  onSave,
  onCancel,
}: FormProps) {
  // Classification states
  const [productGroupId, setProductGroupId] = useState(editingProduct?.productGroupId || "");
  const [selectedSegments, setSelectedSegments] = useState<string[]>(editingProduct?.segments || []);
  const [purpose, setPurpose] = useState(editingProduct?.purpose || "");
  const [loanMethod, setLoanMethod] = useState(editingProduct?.loanMethod || "Cho vay trả góp");
  const [securedType, setSecuredType] = useState<"SECURED" | "UNSECURED">(editingProduct?.securedType || "SECURED");

  // General info states
  const [productCode, setProductCode] = useState(editingProduct?.productCode || "");
  const [productName, setProductName] = useState(editingProduct?.productName || "");
  
  // Amounts & Terms states
  const [minAmount, setMinAmount] = useState(editingProduct?.minAmount ? String(editingProduct.minAmount) : "50000000");
  const [maxAmount, setMaxAmount] = useState(editingProduct?.maxAmount ? String(editingProduct.maxAmount) : "5000000000");
  const [minTerm, setMinTerm] = useState(editingProduct?.minTerm ? String(editingProduct.minTerm) : "12");
  const [maxTerm, setMaxTerm] = useState(editingProduct?.maxTerm ? String(editingProduct.maxTerm) : "120");

  // Interest & repayment — 0 is valid ("theo chính sách"); don't coerce to 6.5
  const [interestRate, setInterestRate] = useState(
    editingProduct
      ? String(editingProduct.interestRate ?? 0)
      : "6.5",
  );
  
  // Status
  const [status, setStatus] = useState<ProductStatus>(editingProduct?.status || "DRAFT");

  // Collateral states
  const [acceptedCollaterals, setAcceptedCollaterals] = useState<string[]>(
    editingProduct?.collateralConfig?.acceptedTypes || ["Nhà ở", "Quyền sử dụng đất"]
  );
  const [maxLtv, setMaxLtv] = useState<string>(
    editingProduct?.collateralConfig?.maxLtv ? String(editingProduct.collateralConfig.maxLtv) : "80"
  );
  const [valuationRequired, setValuationRequired] = useState<boolean>(
    editingProduct?.collateralConfig?.valuationRequired ?? true
  );
  const [insuranceRequired, setInsuranceRequired] = useState<boolean>(
    editingProduct?.collateralConfig?.insuranceRequired ?? true
  );

  // Unsecured eligibility states
  const [minAge, setMinAge] = useState<string>(
    editingProduct?.eligibility?.minimumAgeAtApplication ? String(editingProduct.eligibility.minimumAgeAtApplication) : "22"
  );
  const [maxAge, setMaxAge] = useState<string>(
    editingProduct?.eligibility?.maximumAgeAtMaturity ? String(editingProduct.eligibility.maximumAgeAtMaturity) : "70"
  );
  const [stableIncome, setStableIncome] = useState<boolean>(
    editingProduct?.eligibility?.stableIncomeRequired ?? true
  );
  const [goodCredit, setGoodCredit] = useState<boolean>(
    editingProduct?.eligibility?.goodCreditHistoryRequired ?? true
  );
  const [repaymentProof, setRepaymentProof] = useState<boolean>(
    editingProduct?.eligibility?.repaymentCapacityProofRequired ?? true
  );

  // Credit methods
  const [creditMethods, setCreditMethods] = useState<string[]>(
    editingProduct?.loanStructure?.creditMethods || (editingProduct?.securedType === "UNSECURED" ? ["TERM_LOAN", "CREDIT_LIMIT"] : ["TERM_LOAN"])
  );

  const [docSelection, setDocSelection] = useState<DocSelection>(() =>
    selectionFromProductDocs(
      editingProduct?.documentGroups,
      editingProduct?.securedType || "UNSECURED",
    ),
  );
  const [docDraftByCode, setDocDraftByCode] = useState<Record<string, string>>({});

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const prevSecuredType = useRef(securedType);

  // Drop groups that không áp dụng khi user đổi hình thức bảo đảm (không chạy lần mount).
  useEffect(() => {
    if (prevSecuredType.current === securedType) return;
    prevSecuredType.current = securedType;
    const allowed = new Set(catalogForSecuredType(securedType).map((e) => e.code));
    setDocSelection((prev) => {
      const next: DocSelection = {};
      let changed = false;
      for (const [code, items] of Object.entries(prev)) {
        if (allowed.has(code)) next[code] = items;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [securedType]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!productGroupId) nextErrors.productGroupId = "Vui lòng chọn nhóm sản phẩm.";
    if (!purpose.trim()) nextErrors.purpose = "Mục đích sử dụng vốn không được để trống.";
    if (!productCode.trim()) nextErrors.productCode = "Mã sản phẩm bắt buộc nhập.";
    if (!productName.trim()) nextErrors.productName = "Tên sản phẩm bắt buộc nhập.";
    
    const minAmtNum = Number(minAmount);
    const maxAmtNum = Number(maxAmount);
    if (securedType === "SECURED") {
      if (isNaN(minAmtNum) || minAmtNum <= 0) nextErrors.minAmount = "Số tiền tối thiểu không hợp lệ.";
      if (minAmtNum > maxAmtNum) nextErrors.maxAmount = "Số tiền tối đa phải lớn hơn số tiền tối thiểu.";
    }
    if (isNaN(maxAmtNum) || maxAmtNum <= 0) nextErrors.maxAmount = "Số tiền tối đa không hợp lệ.";

    const minTermNum = Number(minTerm);
    const maxTermNum = Number(maxTerm);
    if (securedType === "SECURED") {
      if (isNaN(minTermNum) || minTermNum <= 0) nextErrors.minTerm = "Kỳ hạn tối thiểu không hợp lệ.";
      if (minTermNum > maxTermNum) nextErrors.maxTerm = "Kỳ hạn tối đa phải lớn hơn kỳ hạn tối thiểu.";
    }
    if (isNaN(maxTermNum) || maxTermNum <= 0) nextErrors.maxTerm = "Kỳ hạn tối đa không hợp lệ.";

    const rateNum = Number(interestRate);
    if (securedType === "SECURED") {
      if (isNaN(rateNum) || rateNum < 0) nextErrors.interestRate = "Lãi suất không hợp lệ.";
    }

    if (selectedSegments.length === 0) nextErrors.segments = "Vui lòng chọn ít nhất một phân khúc khách hàng.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
    const groupName = groups.find(g => g.id === productGroupId)?.name || "";

    // Sync detailed configurations
    const oldDetails: Partial<LoanProduct> = editingProduct || {};
    
    // Construct credit methods array or string representation
    let savedLoanMethod = loanMethod;
    let savedCreditMethods = creditMethods;
    if (securedType === "UNSECURED") {
      const names = [];
      if (creditMethods.includes("TERM_LOAN")) names.push("Cho vay theo món");
      if (creditMethods.includes("CREDIT_LIMIT")) names.push("Cho vay theo hạn mức tín dụng");
      savedLoanMethod = names.join(" / ");
    } else {
      savedCreditMethods = [
        loanMethod === "Cho vay trả góp" || loanMethod === "Cho vay kinh doanh theo từng lần" 
          ? "TERM_LOAN" 
          : "CREDIT_LIMIT"
      ];
    }

    const updatedLoanStructure = {
      ...(oldDetails.loanStructure || {}),
      loanMethodName: savedLoanMethod,
      securedTypeName: securedType === "SECURED" ? "Có tài sản bảo đảm" : "Không có tài sản bảo đảm",
      minAmount: minAmount ? Number(minAmount) : null,
      maxAmount: maxAmount ? Number(maxAmount) : null,
      minTerm: minTerm ? Number(minTerm) : null,
      maxTerm: maxTerm ? Number(maxTerm) : null,
      minTermMonths: minTerm ? Number(minTerm) : null,
      maxTermMonths: maxTerm ? Number(maxTerm) : null,
      creditMethods: savedCreditMethods,
    };

    const updatedInterestConfig = {
      ...(oldDetails.interestConfig || {}),
      publishedRate: interestRate && Number(interestRate) > 0 ? Number(interestRate) : null,
      displayText:
        interestRate && Number(interestRate) > 0
          ? undefined
          : "Theo chính sách từ SHB",
      promoRate: interestRate && Number(interestRate) > 0 ? Number(interestRate) : null,
    };

    const updatedRepaymentConfig = {
      ...(oldDetails.repaymentConfig || {}),
      method: securedType === "UNSECURED" ? "Theo thỏa thuận và chính sách SHB từng thời kỳ" : (oldDetails.repaymentConfig?.method || "Trả góp"),
    };

    const updatedCollateralConfig = securedType === "SECURED" 
      ? {
          acceptedTypes: acceptedCollaterals,
          futureAssetAllowed: true,
          maxLtv: Number(maxLtv),
          valuationRequired: valuationRequired,
          insuranceRequired: insuranceRequired,
          owners: oldDetails.collateralConfig?.owners || ["Khách hàng", "Vợ/chồng"]
        }
      : undefined;

    const updatedEligibility = {
      nationality: "VIETNAMESE",
      customerTypes: ["INDIVIDUAL", "HOUSEHOLD"],
      minimumAgeAtApplication: Number(minAge),
      maximumAgeAtMaturity: Number(maxAge),
      stableIncomeRequired: stableIncome,
      goodCreditHistoryRequired: goodCredit,
      repaymentCapacityProofRequired: repaymentProof
    };

    const updatedDocumentGroups = productDocsFromSelection(docSelection);

    const savedProduct: LoanProduct = {
      id: editingProduct?.id || `prod-${Math.random().toString(36).substring(2, 9)}`,
      customerType: "INDIVIDUAL",
      customerTypeName: "Khách hàng cá nhân",
      productGroupId,
      productGroupName: groupName,
      productCode: productCode.trim().toUpperCase(),
      productName: productName.trim(),
      loanMethod: savedLoanMethod,
      securedType,
      minAmount: minAmount ? Number(minAmount) : 0,
      maxAmount: maxAmount ? Number(maxAmount) : 0,
      minTerm: minTerm ? Number(minTerm) : 0,
      maxTerm: maxTerm ? Number(maxTerm) : 0,
      status,
      updatedAt: new Date().toISOString().split("T")[0],
      interestRate: interestRate ? Number(interestRate) : 0,
      segments: selectedSegments,
      purpose: purpose.trim(),
      
      // Detailed configurations preserved & synced
      loanStructure: updatedLoanStructure,
      interestConfig: updatedInterestConfig,
      repaymentConfig: updatedRepaymentConfig,
      collateralConfig: updatedCollateralConfig,
      documentGroups: updatedDocumentGroups,
      effectivePeriod: oldDetails.effectivePeriod || {
        startDate: new Date().toISOString().split("T")[0],
        endDate: null,
        channels: ["Tại quầy", "Website", "Ứng dụng"]
      },
      eligibility: updatedEligibility
    };

    onSave(savedProduct);
    } finally {
      // Parent async save may still run; unlock local submit after tick.
      setTimeout(() => setSubmitting(false), 400);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Form panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-extrabold text-[#003B71] hover:text-[#F58220] transition"
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <span className="text-[10px] text-muted-foreground italic font-semibold">
          {catalogSource === "database"
            ? "Catalog từ database — không phải chính sách tín dụng chính thức của SHB"
            : catalogSource === "memory"
              ? "Catalog từ API memory fallback — không phải chính sách tín dụng chính thức của SHB"
              : "Không phải chính sách tín dụng chính thức của SHB"}
        </span>
      </div>

      {/* 1. Classification section */}
      <ProductClassificationSection 
        groups={groups}
        productGroupId={productGroupId}
        setProductGroupId={setProductGroupId}
        selectedSegments={selectedSegments}
        setSelectedSegments={setSelectedSegments}
        purpose={purpose}
        setPurpose={setPurpose}
        loanMethod={loanMethod}
        setLoanMethod={setLoanMethod}
        securedType={securedType}
        setSecuredType={setSecuredType}
        creditMethods={creditMethods}
        setCreditMethods={setCreditMethods}
        errors={errors}
      />
      {errors.segments && (
        <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-xl border border-rose-200 flex items-center gap-2">
          <AlertCircle size={14} /> {errors.segments}
        </div>
      )}

      {/* 2. General Information section */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-[#003B71] text-base border-b border-border/40 pb-2">
          2. Thông tin sản phẩm chung
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">
              Mã sản phẩm vay <span className="text-[#DC2626]">*</span>
            </label>
            <Input 
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="Ví dụ: IND_HOME_VIP"
              className={cn("h-11 rounded-xl text-xs", errors.productCode ? "border-[#DC2626]" : "border-border")}
            />
            {errors.productCode && <span className="text-[10px] text-[#DC2626] block mt-1">{errors.productCode}</span>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">
              Tên sản phẩm cụ thể <span className="text-[#DC2626]">*</span>
            </label>
            <Input 
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ví dụ: Vay mua nhà đất siêu nhanh"
              className={cn("h-11 rounded-xl text-xs", errors.productName ? "border-[#DC2626]" : "border-border")}
            />
            {errors.productName && <span className="text-[10px] text-[#DC2626] block mt-1">{errors.productName}</span>}
          </div>
        </div>
      </div>

      {/* 3. Loan Amounts & Terms structures */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-[#003B71] text-base border-b border-border/40 pb-2">
          3. Cấu trúc và số tiền vay
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">
              Số tiền vay tối thiểu (VNĐ) <span className="text-[#DC2626]">*</span>
            </label>
            <Input 
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className={cn("h-11 rounded-xl text-xs", errors.minAmount ? "border-[#DC2626]" : "border-border")}
            />
            {errors.minAmount && <span className="text-[10px] text-[#DC2626] block mt-1">{errors.minAmount}</span>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">
              Số tiền vay tối đa (VNĐ) <span className="text-[#DC2626]">*</span>
            </label>
            <Input 
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className={cn("h-11 rounded-xl text-xs", errors.maxAmount ? "border-[#DC2626]" : "border-border")}
            />
            {errors.maxAmount && <span className="text-[10px] text-[#DC2626] block mt-1">{errors.maxAmount}</span>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">
              Kỳ hạn vay tối thiểu (Tháng) <span className="text-[#DC2626]">*</span>
            </label>
            <Input 
              type="number"
              value={minTerm}
              onChange={(e) => setMinTerm(e.target.value)}
              className={cn("h-11 rounded-xl text-xs", errors.minTerm ? "border-[#DC2626]" : "border-border")}
            />
            {errors.minTerm && <span className="text-[10px] text-[#DC2626] block mt-1">{errors.minTerm}</span>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">
              Kỳ hạn vay tối đa (Tháng) <span className="text-[#DC2626]">*</span>
            </label>
            <Input 
              type="number"
              value={maxTerm}
              onChange={(e) => setMaxTerm(e.target.value)}
              className={cn("h-11 rounded-xl text-xs", errors.maxTerm ? "border-[#DC2626]" : "border-border")}
            />
            {errors.maxTerm && <span className="text-[10px] text-[#DC2626] block mt-1">{errors.maxTerm}</span>}
          </div>
        </div>
      </div>

      {/* 3.1 Collateral or Unsecured Settings */}
      {securedType === "SECURED" ? (
        <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-[#003B71] text-base border-b border-border/40 pb-2">
            3.1 Cấu hình tài sản bảo đảm
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#003B71] mb-1.5">Loại tài sản chấp nhận</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {["Nhà ở", "Quyền sử dụng đất", "Nhà đất hình thành từ vốn vay", "Phương tiện vận chuyển"].map(t => {
                  const checked = acceptedCollaterals.includes(t);
                  return (
                    <label key={t} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground select-none">
                      <input 
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (checked) {
                            setAcceptedCollaterals(acceptedCollaterals.filter(item => item !== t));
                          } else {
                            setAcceptedCollaterals([...acceptedCollaterals, t]);
                          }
                        }}
                        className="h-4 w-4 accent-[#F58220]"
                      />
                      {t}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#003B71] mb-1.5">Tỷ lệ cho vay trên giá trị tài sản (%)</label>
              <Input 
                type="number" 
                value={maxLtv} 
                onChange={(e) => setMaxLtv(e.target.value)} 
                className="h-11 rounded-xl text-xs"
              />
            </div>

            <div className="flex gap-6 items-center">
              <label className="block text-xs font-bold text-[#003B71]">Yêu cầu định giá:</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium select-none">
                  <input 
                    type="radio" 
                    name="valuation" 
                    checked={valuationRequired} 
                    onChange={() => setValuationRequired(true)}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Bắt buộc
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium select-none">
                  <input 
                    type="radio" 
                    name="valuation" 
                    checked={!valuationRequired} 
                    onChange={() => setValuationRequired(false)}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Không bắt buộc
                </label>
              </div>
            </div>

            <div className="flex gap-6 items-center md:col-span-2">
              <label className="block text-xs font-bold text-[#003B71]">Yêu cầu bảo hiểm tài sản:</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium select-none">
                  <input 
                    type="radio" 
                    name="insurance" 
                    checked={insuranceRequired} 
                    onChange={() => setInsuranceRequired(true)}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Theo quy định SHB
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium select-none">
                  <input 
                    type="radio" 
                    name="insurance" 
                    checked={!insuranceRequired} 
                    onChange={() => setInsuranceRequired(false)}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Không bắt buộc
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-[#003B71] text-base border-b border-border/40 pb-2">
            3.1 Điều kiện sản phẩm tín chấp
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#003B71] mb-1.5">Tuổi tối thiểu khi vay</label>
              <Input 
                type="number" 
                value={minAge} 
                onChange={(e) => setMinAge(e.target.value)} 
                className="h-11 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#003B71] mb-1.5">Tuổi tối đa khi tất toán</label>
              <Input 
                type="number" 
                value={maxAge} 
                onChange={(e) => setMaxAge(e.target.value)} 
                className="h-11 rounded-xl text-xs"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#003B71] mb-1.5">Yêu cầu năng lực trả nợ</label>
              <div className="flex flex-wrap gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground select-none">
                  <input 
                    type="checkbox"
                    checked={stableIncome}
                    onChange={(e) => setStableIncome(e.target.checked)}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Có thu nhập ổn định
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground select-none">
                  <input 
                    type="checkbox"
                    checked={goodCredit}
                    onChange={(e) => setGoodCredit(e.target.checked)}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Có lịch sử tín dụng tốt
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground select-none">
                  <input 
                    type="checkbox"
                    checked={repaymentProof}
                    onChange={(e) => setRepaymentProof(e.target.checked)}
                    className="h-4 w-4 accent-[#F58220]"
                  />
                  Chứng minh được khả năng trả nợ
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Interest rates and Repayment config */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-[#003B71] text-base border-b border-border/40 pb-2">
          4. Lãi suất và phương thức trả nợ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">
              Lãi suất từ (%/năm) <span className="text-[#DC2626]">*</span>
            </label>
            <Input 
              type="number"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className={cn("h-11 rounded-xl text-xs", errors.interestRate ? "border-[#DC2626]" : "border-border")}
            />
            {errors.interestRate && <span className="text-[10px] text-[#DC2626] block mt-1">{errors.interestRate}</span>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">Phương thức trả nợ</label>
            <select className="w-full h-11 border border-border bg-white rounded-xl px-3 outline-none text-xs text-foreground focus:ring-1 focus:ring-[#F58220]">
              <option value="monthly">Trả góp hàng tháng</option>
              <option value="quarterly">Trả nợ gốc &amp; lãi hàng quý</option>
              <option value="end-term">Trả gốc cuối kỳ, lãi hàng tháng</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Preliminary Conditions & Descriptions */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-[#003B71] text-base border-b border-border/40 pb-2">
          5. Điều kiện sơ bộ &amp; Nội dung hiển thị
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">Điều kiện sơ bộ (Yêu cầu độ tuổi, thu nhập, CIC...)</label>
            <textarea 
              rows={3}
              placeholder="Ví dụ: Khách hàng từ 18-65 tuổi. Thu nhập tối thiểu từ lương chuyển khoản là 10 triệu/tháng. Điểm tín dụng CIC loại 1..."
              className="w-full border border-border bg-white rounded-xl p-3 outline-none text-xs text-foreground focus:ring-1 focus:ring-[#F58220]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#003B71] mb-1.5">Mô tả và điểm bán hàng chính (USP)</label>
            <textarea 
              rows={2}
              placeholder="Ví dụ: Thời gian phê duyệt nhanh trong 24h. Hỗ trợ ân hạn nợ gốc đến 24 tháng..."
              className="w-full border border-border bg-white rounded-xl p-3 outline-none text-xs text-foreground focus:ring-1 focus:ring-[#F58220]"
            />
          </div>
        </div>
      </div>

      {/* 6. Document requirements — select from catalog by loan type */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-border/40 pb-2 space-y-1">
          <h3 className="font-extrabold text-[#003B71] text-base">6. Hồ sơ yêu cầu</h3>
          <p className="text-[11px] text-muted-foreground">
            Tích chọn nhóm hồ sơ và từng giấy tờ áp dụng. Bỏ tích = không yêu cầu giấy tờ đó. Một số
            nhóm chỉ hiện khi{" "}
            <strong className="text-foreground">
              {securedType === "SECURED" ? "có tài sản bảo đảm" : "không có tài sản bảo đảm (tín chấp)"}
            </strong>
            .
          </p>
        </div>

        <div className="space-y-3">
          {catalogForSecuredType(securedType).map((entry) => {
            const selected = docSelection[entry.code];
            const groupOn = Array.isArray(selected);
            const selectedSet = new Set(selected || []);
            const customItems = (selected || []).filter((i) => i && !entry.items.includes(i));

            const toggleItem = (item: string, on: boolean) => {
              setDocSelection((prev) => {
                if (!Array.isArray(prev[entry.code])) {
                  if (!on) return prev;
                  return { ...prev, [entry.code]: [item] };
                }
                const cur = prev[entry.code] || [];
                const nextItems = on
                  ? cur.includes(item)
                    ? cur
                    : [...cur, item]
                  : cur.filter((x) => x !== item);
                return { ...prev, [entry.code]: nextItems };
              });
            };

            return (
              <div
                key={entry.code}
                className={cn(
                  "rounded-xl border p-4 transition",
                  groupOn ? "border-[#F58220]/40 bg-[#F58220]/5" : "border-border/70 bg-slate-50/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#F58220] shrink-0"
                    checked={groupOn}
                    id={`doc-group-${entry.code}`}
                    onChange={(e) => {
                      setDocSelection((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[entry.code] = [...entry.items];
                        else delete next[entry.code];
                        return next;
                      });
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`doc-group-${entry.code}`}
                      className="flex flex-wrap items-center gap-2 cursor-pointer select-none"
                    >
                      <span className="text-xs font-extrabold text-[#003B71]">{entry.title}</span>
                      {entry.appliesTo === "SECURED" && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                          Chỉ vay có TSĐB
                        </span>
                      )}
                    </label>

                    {groupOn && (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {entry.items.map((item) => {
                            const checked = selectedSet.has(item);
                            return (
                              <label
                                key={item}
                                className={cn(
                                  "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs cursor-pointer select-none transition",
                                  checked
                                    ? "border-[#003B71]/25 bg-white text-[#003B71] font-semibold"
                                    : "border-border/60 bg-white/70 text-muted-foreground",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-3.5 w-3.5 accent-[#F58220] shrink-0"
                                  checked={checked}
                                  onChange={(e) => toggleItem(item, e.target.checked)}
                                />
                                <span>{item}</span>
                              </label>
                            );
                          })}
                        </div>

                        {customItems.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase text-[#6B7280]">
                              Giấy tờ tùy chỉnh
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {customItems.map((item) => (
                                <div
                                  key={item}
                                  className="flex items-start gap-2 rounded-lg border border-[#003B71]/25 bg-white px-2.5 py-2 text-xs text-[#003B71] font-semibold"
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 h-3.5 w-3.5 accent-[#F58220] shrink-0"
                                    checked
                                    onChange={(e) => toggleItem(item, e.target.checked)}
                                  />
                                  <span className="flex-1 min-w-0">{item}</span>
                                  <button
                                    type="button"
                                    aria-label={`Xóa ${item}`}
                                    className="p-1 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleItem(item, false);
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            value={docDraftByCode[entry.code] || ""}
                            onChange={(e) =>
                              setDocDraftByCode((prev) => ({
                                ...prev,
                                [entry.code]: e.target.value,
                              }))
                            }
                            placeholder="Thêm giấy tờ tùy chỉnh…"
                            className="h-10 rounded-xl text-xs flex-1"
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              const draft = (docDraftByCode[entry.code] || "").trim();
                              if (!draft) return;
                              toggleItem(draft, true);
                              setDocDraftByCode((prev) => ({ ...prev, [entry.code]: "" }));
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-xl text-xs font-bold shrink-0"
                            disabled={!(docDraftByCode[entry.code] || "").trim()}
                            onClick={() => {
                              const draft = (docDraftByCode[entry.code] || "").trim();
                              if (!draft) return;
                              toggleItem(draft, true);
                              setDocDraftByCode((prev) => ({ ...prev, [entry.code]: "" }));
                            }}
                          >
                            <Plus size={14} className="mr-1" />
                            Thêm
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Rule Engineer — policy attached to package */}
      <ProductPolicyRulesPanel securedType={securedType} productCode={productCode} />

      {/* 8. Status Configuration */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-[#003B71] text-base border-b border-border/40 pb-2">
          8. Cấu hình trạng thái
        </h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-foreground select-none">
            <input 
              type="radio" 
              name="status" 
              checked={status === "DRAFT"} 
              onChange={() => setStatus("DRAFT")}
              className="h-4 w-4 accent-[#F58220]"
            />
            Bản nháp (DRAFT)
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-foreground select-none">
            <input 
              type="radio" 
              name="status" 
              checked={status === "ACTIVE"} 
              onChange={() => setStatus("ACTIVE")}
              className="h-4 w-4 accent-[#F58220]"
            />
            Đang hoạt động (ACTIVE)
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-foreground select-none">
            <input 
              type="radio" 
              name="status" 
              checked={status === "SUSPENDED"} 
              onChange={() => setStatus("SUSPENDED")}
              className="h-4 w-4 accent-[#F58220]"
            />
            Tạm ngừng (SUSPENDED)
          </label>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
        <Button 
          type="button" 
          onClick={onCancel}
          variant="outline" 
          className="rounded-xl font-bold h-11 text-xs px-6"
          disabled={saving || submitting}
        >
          Hủy bỏ
        </Button>
        <Button 
          type="submit"
          disabled={saving || submitting}
          className="bg-[#F58220] hover:bg-[#F58220]/95 text-on-primary font-bold rounded-xl h-11 text-xs px-6 shadow-md"
        >
          <Save size={15} className="mr-1.5" />
          {saving || submitting ? "Đang lưu…" : "Lưu sản phẩm"}
        </Button>
      </div>
    </form>
  );
}
