"use client";

import { useState, Fragment, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import {
  assessApplication,
  listApplications,
  type AssessResponse,
  type DeclaredForm,
  type DocumentInput,
} from "@/lib/api";
import {
  applicationToListRow,
  toAssessRequest,
  type ApplicationSectionA,
  type AssessFormState as MappedAssessForm,
} from "@/lib/application-map";
import { enqueueAssessResult, listHitlCases, type HitlCase } from "@/lib/hitl-queue";
import {
  AgentRunProgress,
  PIPELINE_RUN_STEPS,
} from "@/components/admin/agent-run-progress";
import { NodeTimeline } from "@/components/admin/node-timeline";
import { cn } from "@/lib/cn";
import {
  docKindLabelVi,
  fieldSlugLabelVi,
  laneLabelVi,
  outcomeLabelVi,
  productLabelVi,
  recommendationLabelVi,
  ruleLabelVi,
  sanitizeBusinessText,
  toolLabelVi,
} from "@/lib/labels";

/** Dashboard always edits a full body (id path is API-only for now). */
type AssessFormState = MappedAssessForm;

const MORTGAGE_DEMO: AssessFormState = {
  product: "retail_mortgage",
  declared: {
    customer_name: "TRẦN THỊ BÌNH",
    amount: 2_500_000_000,
    term_months: 240,
    annual_rate: 0.105,
    monthly_income: 85_000_000,
    existing_monthly_debt: 8_000_000,
    declared_purpose: "Mua nhà để ở",
    collateral_value_declared: 4_000_000_000,
    dob: "15/08/1988",
    gender: "Nữ",
    national_id: "001088012345",
    national_id_issue_date: "10/05/2021",
    national_id_issue_place: "Cục Cảnh sát Quản lý hành chính về trật tự xã hội",
    old_national_id: "001088001122",
    phone: "0901234567",
    phone_2: "0911223344",
    zalo_phone: "0901234567",
    permanent_address: "Số 45, Đường Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    current_address: "Số 45, Đường Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    email: "binh.tran@email.com",
    occupation: "Cán bộ quản lý",
    company_name: "Công ty Cổ phần Thương mại và Dịch vụ SHB",
    position: "Trưởng phòng Kinh doanh",
    company_address: "Tòa nhà Gelex, 52 Lê Đại Hành, Quận Hai Bà Trưng, Hà Nội",
    salary_payday: "Ngày 10 hàng tháng",
    personal_expense: 25_000_000,
    disbursement_method: "Giải ngân cho Bên thụ hưởng",
    disbursement_bank: "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)",
    disbursement_branch: "Chi nhánh Hà Nội",
    disbursement_account: "101123456789",
    disbursement_account_name: "NGUYỄN VĂN BÁN",
    spouse_name: "NGUYỄN VĂN AN",
    spouse_phone: "0902345678",
    spouse_national_id: "001085054321",
    spouse_income: 35_000_000,
    spouse_company: "Công ty Cổ phần Đầu tư SHB",
    spouse_workplace_phone: "0243123456",
    consent_data_processing: true,
    consent_advertising: false,
    ref1_name: "Trần Thị Mai",
    ref1_relationship: "Chị gái",
    ref1_phone: "0903456789",
    ref1_same_address: false,
    ref2_name: "Nguyễn Văn Cường",
    ref2_relationship: "Bạn thân",
    ref2_phone: "0904567890",
    ref2_same_address: false,
    id_number: "001099000003",
    cic_consent: true,
  },
  documents: [
    { kind: "cccd", tier: 1, extracted: { verified: true } },
    { kind: "sao_ke_tai_khoan", tier: 1, extracted: { monthly_income: 85_000_000 } },
    { kind: "so_do", tier: 2, extracted: { parcel: "DEMO-001" } },
    { kind: "hop_dong_mua_ban", tier: 2, extracted: { seller: "Demo Seller" } },
    { kind: "cic", tier: 1, extracted: { score_band: "A" } },
    {
      kind: "purpose_evidence",
      tier: 2,
      extracted: { actual_purpose: "tất toán khoản vay ở TCTD khác" },
    },
  ],
};

// ---------------------------------------------------------------------------
// Form placeholder — list luôn lấy từ database (application-svc via orchestrator)
// ---------------------------------------------------------------------------

const EMPTY_FORM: AssessFormState = {
  product: "retail_unsecured_salary",
  declared: {
    customer_name: "",
    amount: 0,
    term_months: 12,
    annual_rate: 0.13,
    monthly_income: 0,
    existing_monthly_debt: 0,
    declared_purpose: "",
    dob: "",
    gender: "",
    national_id: "",
    national_id_issue_date: "",
    national_id_issue_place: "",
    phone: "",
    permanent_address: "",
    current_address: "",
    email: "",
    occupation: "",
    company_name: "",
    position: "",
    company_address: "",
    personal_expense: 0,
    consent_data_processing: true,
    consent_advertising: false,
    id_number: "",
    cic_consent: true,
  },
  documents: [],
};

function StatusBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    warning: "bg-warning-soft text-warning-foreground",
    pending: "bg-pending-soft text-pending-foreground",
    success: "bg-success-soft text-success-foreground",
    active: "bg-active-soft text-active-foreground",
  };
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", styles[tone])}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-navy">{label}</span>
      {children}
    </label>
  );
}

function parseMoneyInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

function MoneyInput({
  value,
  onChange,
  required,
  "aria-label": ariaLabel,
  className,
}: {
  value: number | null | undefined;
  onChange: (next: number | null) => void;
  required?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const display =
    value == null || Number.isNaN(value) ? "" : new Intl.NumberFormat("vi-VN").format(value);

  return (
    <div className="relative">
      <Input
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) => onChange(parseMoneyInput(e.target.value))}
        required={required}
        aria-label={ariaLabel}
        placeholder="0"
        className={cn("pr-14", className)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground">
        VNĐ
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DossierPreviewCard — layout biểu mẫu giống tờ đơn SHBFinance
// ---------------------------------------------------------------------------

const SCENARIO_META: Record<string, { label: string; border: string }> = {
  happy: { label: "✅ Happy path — Hồ sơ đầy đủ, dự kiến phê duyệt", border: "border-[#16a34a]" },
  veto:  { label: "🚫 Veto — Mục đích khai báo mâu thuẫn chứng từ",  border: "border-[#ea580c]" },
  hitl:  { label: "⏳ Biên giới — Cần nhân viên xem xét thủ công",   border: "border-[#d97706]" },
};

function FL({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-0.5", wide ? "col-span-2" : "")}>
      <span className="text-[10px] font-medium leading-none text-[#7a5100]">{label}</span>
      <div className="min-h-[20px] border-b border-[#555] px-1 text-[11px] font-medium text-gray-800">
        {value ?? <span className="text-gray-300">&nbsp;</span>}
      </div>
    </div>
  );
}

function CB({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-700">
      <span className={cn(
        "inline-flex h-3.5 w-3.5 items-center justify-center border text-[9px] font-bold",
        checked ? "border-[#c05000] bg-[#c05000] text-white" : "border-gray-400 bg-white",
      )}>
        {checked ? "✓" : ""}
      </span>
      {label}
    </span>
  );
}

function SBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 -mx-5 bg-[#e8650a] px-5 py-1 text-[11px] font-bold uppercase tracking-wide text-white sm:-mx-6 sm:px-6">
      {children}
    </div>
  );
}

function GTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 border-b border-[#e8650a]/40 pb-0.5 text-[11px] font-bold text-[#c05000]">
      {children}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <div className="col-span-2 text-[10px] font-semibold text-[#c05000]">{children}</div>;
}

function parseAddress(addr?: string | null) {
  if (!addr) return { street: "—", ward: "—", district: "—", province: "—" };
  const parts = addr.split(",").map(p => p.trim());
  if (parts.length >= 4) {
    const province = parts[parts.length - 1];
    const district = parts[parts.length - 2];
    const ward = parts[parts.length - 3];
    const street = parts.slice(0, parts.length - 3).join(", ");
    return { street, ward, district, province };
  } else if (parts.length === 3) {
    return { street: "—", ward: parts[0], district: parts[1], province: parts[2] };
  } else if (parts.length === 2) {
    return { street: "—", ward: "—", district: parts[0], province: parts[1] };
  }
  return { street: addr, ward: "—", district: "—", province: "—" };
}

const EXTRACT_FIELD_LABELS: Record<string, string> = {
  monthly_income: "Thu nhập tháng",
  score_band: "Nhóm điểm CIC",
  full_name: "Họ và tên",
  national_id: "Số CCCD",
  id_number: "Số CCCD",
  verified: "Đã xác minh eKYC",
  date_of_birth: "Ngày sinh",
  employer: "Đơn vị công tác",
  purpose: "Mục đích vay",
  actual_purpose: "Mục đích thực tế",
  account_number: "Số tài khoản",
  bank_name: "Ngân hàng",
  parcel: "Thửa đất",
  seller: "Bên bán",
};

function extractFieldLabel(key: string): string {
  return EXTRACT_FIELD_LABELS[key] ?? key.replaceAll("_", " ");
}

function formatExtractValue(key: string, val: unknown): string {
  if (typeof val === "boolean") return val ? "Có" : "Không";
  if (typeof val === "number") {
    if (key.includes("income") || key.includes("amount") || key.includes("salary")) {
      return `${new Intl.NumberFormat("vi-VN").format(val)} ₫`;
    }
    return String(val);
  }
  if (typeof val === "string" && /^\d+$/.test(val) && (key.includes("income") || key.includes("amount"))) {
    return `${new Intl.NumberFormat("vi-VN").format(Number(val))} ₫`;
  }
  return String(val);
}

function cccdImageForCustomer(name?: string | null): string | null {
  if (!name) return null;
  const n = name.toUpperCase();
  if (n.includes("BÉ HOA") || n.includes("BE HOA")) return "/aulacys/cccd-be-hoa.png";
  if (n.includes("VUI")) return "/aulacys/cccd-tran-vui.png";
  if (n.includes("HUYỀN") || n.includes("HUYEN")) return "/aulacys/cccd-huyen-tran.png";
  return null;
}

const TIER_STATUS = ["—", "Đã nộp", "Đã xác minh", "Phê duyệt"] as const;

/** Document detail: CCCD shows real ID image; other kinds = status + OCR only. */
function DocumentDetailModal({
  doc,
  customerName,
  onClose,
}: {
  doc: DocumentInput;
  customerName?: string | null;
  onClose: () => void;
}) {
  const tierLabel = TIER_STATUS[doc.tier] ?? "—";
  const entries = Object.entries(doc.extracted ?? {});
  const cccdSrc = doc.kind === "cccd" ? cccdImageForCustomer(customerName) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-detail-title"
      onClick={onClose}
    >
      <div
        className={cn(
          "flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevated",
          cccdSrc ? "max-w-lg" : "max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 text-left">
            <h3 id="doc-detail-title" className="text-sm font-semibold text-navy">
              {docKindLabelVi(doc.kind)}
            </h3>
            {customerName ? (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{customerName}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Đóng"
            onClick={onClose}
            className="shrink-0 text-muted-foreground"
          >
            <X size={18} />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5 text-left">
          {cccdSrc && (
            <div className="overflow-hidden rounded-lg border border-border bg-secondary/30 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- demo static CCCD assets */}
              <img
                src={cccdSrc}
                alt={`CCCD ${customerName ?? ""}`}
                className="mx-auto max-h-[280px] w-full object-contain"
              />
            </div>
          )}

          <div className="rounded-lg border border-border bg-secondary/40 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Trạng thái xác minh
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-2 w-2 rounded-full",
                  doc.tier >= 2 ? "bg-success-foreground" : "bg-warning-foreground",
                )}
              />
              <span className="text-sm font-medium text-navy">
                Tầng {doc.tier} · {tierLabel}
              </span>
            </div>
            {doc.confirmed_by ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Xác nhận bởi: {doc.confirmed_by}
              </p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Dữ liệu trích xuất
            </p>
            {entries.length > 0 ? (
              <dl className="divide-y divide-border rounded-lg border border-border">
                {entries.map(([key, val]) => (
                  <div key={key} className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                    <dt className="text-[11px] text-muted-foreground">{extractFieldLabel(key)}</dt>
                    <dd className="text-right text-sm font-semibold text-navy">
                      {formatExtractValue(key, val)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3.5 py-6 text-center text-xs text-muted-foreground">
                Không có dữ liệu trích xuất.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

function DossierPreviewCard({
  data,
  scenario,
}: {
  data: AssessFormState;
  scenario: string | null;
}) {
  const [activeDoc, setActiveDoc] = useState<DocumentInput | null>(null);
  const meta = scenario ? SCENARIO_META[scenario] : null;
  const d = data.declared;
  const fmt = (n?: number | null) =>
    n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n) + " ₫";

  const occKw = (d.occupation ?? "").toLowerCase();
  const isOfficer = occKw.includes("công chức") || occKw.includes("giáo viên");
  const isCorp    = occKw.includes("doanh nghiệp tư") || occKw.includes("văn phòng") || occKw.includes("kinh doanh");
  const isSelf    = occKw.includes("tự do") || occKw.includes("tự doanh") || occKw.includes("chủ hộ");
  const isHKD     = occKw.includes("hộ kinh doanh");

  const posKw = (d.position ?? "").toLowerCase();
  const isMgr   = posKw.includes("quản lý") || posKw.includes("trưởng");
  const isStaff = !isMgr && !posKw.includes("khác") && posKw.length > 0;

  const permAddr = parseAddress(d.permanent_address);
  const currAddr = parseAddress(d.current_address);
  const isSameAddress = d.permanent_address === d.current_address;

  return (
    <div className={cn("overflow-hidden rounded-xl border-2 bg-white shadow-card relative", meta?.border ?? "border-border/70")}>
      {/* Tiêu đề */}
      <div className="bg-[#e8650a] px-6 py-3 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-white">
          ĐỀ NGHỊ VAY VỐN KIÊM HỢP ĐỒNG CHO VAY
        </p>
        <p className="mt-0.5 text-[10px] italic text-orange-100">
          (Áp dụng với Khách hàng cá nhân vay không có tài sản bảo đảm tại SHBFinance)
        </p>
        {meta && (
          <span className="mt-1.5 inline-block rounded bg-white/20 px-3 py-0.5 text-[11px] font-medium text-white">
            {meta.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-5 sm:p-6 text-left">

        {/* === A === */}
        <SBanner>A. PHẦN ĐỀ NGHỊ VAY VỐN</SBanner>
        <div className="col-span-2 -mx-5 bg-[#fef3e8] px-5 py-1 text-[10px] font-semibold text-[#c05000] sm:-mx-6 sm:px-6">
          I. THÔNG TIN NGƯỜI ĐỀ NGHỊ VAY VỐN (SAU ĐÂY GỌI LÀ &quot;BÊN VAY&quot;)
        </div>

        <GTitle>1. BÊN VAY:</GTitle>
        <FL label="Họ và tên (viết in hoa):" value={d.customer_name} wide />

        <FL label="Ngày, tháng, năm sinh:" value={d.dob} />
        <div className="flex items-end gap-5 pb-0.5">
          <span className="text-[10px] font-medium text-[#7a5100]">Giới tính:</span>
          <CB label="Nam" checked={d.gender === "Nam"} />
          <CB label="Nữ"  checked={d.gender === "Nữ"} />
        </div>

        <FL label="Số CCCD/CC:" value={d.national_id} />
        <div className="grid grid-cols-2 gap-3">
          <FL label="Ngày cấp:" value={d.national_id_issue_date} />
          <FL label="Nơi cấp:"  value={d.national_id_issue_place} />
        </div>
        <FL label="Số CMND/CCCD cũ (Nếu có):" value={d.old_national_id} wide />

        <GTitle>2. THÔNG TIN LIÊN HỆ:</GTitle>
        <SubTitle>2.1. Số điện thoại:</SubTitle>
        <FL label="Số điện thoại di động 1:" value={d.phone} />
        <FL label="Số điện thoại di động 2 (Nếu có):" value={d.phone_2} />
        <FL label="Số điện thoại đăng ký tài khoản Zalo:" value={d.zalo_phone} wide />

        <SubTitle>2.2. Địa chỉ:</SubTitle>
        <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2.5 pl-2 border-l border-orange-200">
          <span className="col-span-2 text-[9px] font-bold text-[#7a5100] uppercase">Địa chỉ thường trú:</span>
          <FL label="Số nhà/đường/dân phố:" value={permAddr.street} />
          <FL label="Xã/Phường/Thị trấn:" value={permAddr.ward} />
          <FL label="Quận/Huyện:" value={permAddr.district} />
          <FL label="Tỉnh/Thành phố:" value={permAddr.province} />
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2.5 pl-2 border-l border-orange-200 mt-1">
          <div className="col-span-2 flex items-center gap-5">
            <span className="text-[9px] font-bold text-[#7a5100] uppercase">Địa chỉ nơi ở hiện tại:</span>
            <CB label="Giống địa chỉ thường trú" checked={isSameAddress} />
            <CB label="Khác (ghi rõ)" checked={!isSameAddress} />
          </div>
          <FL label="Số nhà/đường/dân phố:" value={currAddr.street} />
          <FL label="Xã/Phường/Thị trấn:" value={currAddr.ward} />
          <FL label="Quận/Huyện:" value={currAddr.district} />
          <FL label="Tỉnh/Thành phố:" value={currAddr.province} />
        </div>

        <SubTitle>2.3. Email:</SubTitle>
        <FL label="Email:" value={d.email} wide />

        <GTitle>3. THÔNG TIN VIỆC LÀM:</GTitle>
        <div className="col-span-2 space-y-2">
          <span className="text-[10px] font-medium text-[#7a5100]">Nghề nghiệp:</span>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 pl-1">
            <CB label="Lao động tự do"             checked={isSelf && !isHKD} />
            <CB label="Công chức nhà nước"          checked={isOfficer} />
            <CB label="Sinh viên"                   checked={false} />
            <CB label="Tự doanh (không ĐKD)"        checked={isSelf && !isHKD} />
            <CB label="Cán bộ doanh nghiệp tư"      checked={isCorp} />
            <CB label="Hưu trí"                     checked={false} />
            <CB label="Hộ kinh doanh (có ĐKD)"      checked={isHKD} />
            <CB label="Công nhân"                   checked={false} />
            <CB label="Nội trợ"                     checked={false} />
          </div>
        </div>

        <FL label="Tên Đơn vị công tác:" value={d.company_name}    wide />
        <FL label="Địa chỉ nơi công tác/làm việc:"     value={d.company_address} wide />

        <div className="col-span-2 space-y-1.5">
          <span className="text-[10px] font-medium text-[#7a5100]">Chức vụ:</span>
          <div className="flex flex-wrap gap-x-6 gap-y-1 pl-1">
            <CB label="Cán bộ quản lý"         checked={isMgr} />
            <CB label="Nhân viên / Chuyên viên" checked={isStaff} />
            <CB label="Khác"                    checked={!isMgr && !isStaff} />
          </div>
        </div>

        <FL label="Ngày nhận lương hàng tháng:"          value={d.salary_payday} />
        <FL label="Thu nhập hàng tháng:"     value={fmt(d.monthly_income)} />

        <GTitle>4. THÔNG TIN NGƯỜI THAM CHIẾU:</GTitle>
        <SubTitle>Người liên hệ 1:</SubTitle>
        <FL label="Họ tên:"              value={d.ref1_name} />
        <FL label="Mối quan hệ:"    value={d.ref1_relationship} />
        <FL label="Số điện thoại:"          value={d.ref1_phone} />
        <div className="flex items-end gap-5 pb-0.5">
          <span className="text-[10px] font-medium text-[#7a5100]">Cùng địa chỉ thường trú với Khách hàng:</span>
          <CB label="Có"   checked={!!d.ref1_same_address} />
          <CB label="Không" checked={!d.ref1_same_address} />
        </div>

        <SubTitle>Người liên hệ 2:</SubTitle>
        <FL label="Họ tên:"              value={d.ref2_name} />
        <FL label="Mối quan hệ:"    value={d.ref2_relationship} />
        <FL label="Số điện thoại:"          value={d.ref2_phone} />
        <div className="flex items-end gap-5 pb-0.5">
          <span className="text-[10px] font-medium text-[#7a5100]">Cùng địa chỉ thường trú với Khách hàng:</span>
          <CB label="Có"   checked={!!d.ref2_same_address} />
          <CB label="Không" checked={!d.ref2_same_address} />
        </div>

        <GTitle>5. THÔNG TIN VỢ/ CHỒNG (NẾU CÓ):</GTitle>
        <FL label="Họ tên vợ (hoặc chồng):" value={d.spouse_name} />
        <FL label="Số điện thoại:" value={d.spouse_phone} />
        <FL label="Số CCCD/CC:" value={d.spouse_national_id} />
        <FL label="Thu nhập của vợ/ chồng (VNĐ/tháng):" value={d.spouse_income ? fmt(d.spouse_income) : "—"} />
        <FL label="Đơn vị làm việc:" value={d.spouse_company} />
        <FL label="Điện thoại nơi làm việc:" value={d.spouse_workplace_phone} />

        <GTitle>6. NĂNG LỰC TÀI CHÍNH:</GTitle>
        <FL label="Tổng thu nhập (VNĐ/tháng):" value={fmt(d.monthly_income)} />
        <FL label="Chi phí cá nhân (VNĐ/tháng):" value={d.personal_expense ? fmt(d.personal_expense) : "—"} />

        <GTitle>7. CUNG CẤP THÔNG TIN:</GTitle>
        <div className="col-span-2 text-[8px] text-gray-500 leading-relaxed bg-gray-50 p-2.5 rounded border border-gray-200">
          Bên vay xác nhận đã được Công ty Tài chính TNHH Ngân hàng TMCP Sài Gòn – Hà Nội (sau đây gọi là &quot;SHBFinance&quot;) thông báo, biết rõ và hoàn toàn đồng ý với tất cả những nội dung liên quan tới dữ liệu cá nhân (bao gồm dữ liệu cá nhân cơ bản và dữ liệu cá nhân nhạy cảm theo quy định tại Luật bảo vệ dữ liệu cá nhân và các văn bản hướng dẫn, sửa đổi, bổ sung, thay thế từng thời kỳ) của Bên vay để phục vụ mục đích giới thiệu các sản phẩm cấp tín dụng, thẩm định và phê duyệt khoản vay, theo dõi và xử lý nợ...
        </div>
        <div className="col-span-2 flex items-center gap-6 mt-1">
          <CB label="Đồng ý cung cấp dữ liệu" checked={d.consent_data_processing === true} />
          <CB label="Không đồng ý" checked={d.consent_data_processing === false} />
        </div>
        <div className="col-span-2 flex items-center gap-3 mt-1">
          <span className="text-[10px] font-medium text-[#7a5100]">Bên vay đồng ý nhận thông tin quảng cáo của SHBFinance:</span>
          <CB label="Có" checked={d.consent_advertising === true} />
          <CB label="Không" checked={d.consent_advertising === false} />
        </div>

        {/* === B === */}
        <SBanner>B. THÔNG TIN KHOẢN VAY ĐỀ NGHỊ (II. NỘI DUNG ĐỀ NGHỊ)</SBanner>
        <FL label="Số tiền vay đề nghị:"       value={fmt(d.amount)} />
        <FL label="Thời hạn vay:"              value={d.term_months ? `${d.term_months} tháng` : undefined} />
        <FL label="Lãi suất / năm:"            value={d.annual_rate != null ? `${(d.annual_rate * 100).toFixed(1)} %` : undefined} />
        <FL label="Mục đích sử dụng vốn:"      value={d.declared_purpose} />
        <FL label="Phương thức giải ngân:"     value={d.disbursement_method} wide />
        <FL label="Ngân hàng nhận GN:"         value={d.disbursement_bank} />
        <FL label="Chi nhánh:"                 value={d.disbursement_branch} />
        <FL label="Số tài khoản:"              value={d.disbursement_account} />
        <FL label="Chủ tài khoản:"             value={d.disbursement_account_name} />

        {/* === CAM KẾT CỦA BÊN VAY === */}
        <div className="col-span-2 border-t border-[#e8650a]/40 pt-4 mt-3">
          <p className="text-center font-bold text-xs uppercase text-[#c05000]">CAM KẾT CỦA BÊN VAY</p>
          <p className="text-center italic text-[9px] text-gray-500 mt-1">
            “Tôi cam kết đã đọc, hiểu rõ, đồng ý đề nghị vay vốn theo các nội dung nêu trên.”
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4 text-center">
            <div>
              <p className="font-bold text-[10px] text-gray-700">BÊN VAY</p>
              <p className="text-[8px] text-gray-400 mt-0.5">(Ký và ghi rõ họ tên / Chữ ký số)</p>
              <div className="h-16 flex items-center justify-center border border-dashed border-gray-300 rounded bg-gray-50 mt-2 text-[10px] text-gray-400">
                {d.customer_name} (Đã ký số)
              </div>
            </div>
            <div>
              <p className="font-bold text-[10px] text-gray-700">ĐẠI DIỆN SHBFINANCE</p>
              <p className="text-[8px] text-gray-400 mt-0.5">(Ký và ghi rõ họ tên, đóng dấu / Chữ ký số)</p>
              <div className="h-16 flex items-center justify-center border border-dashed border-gray-300 rounded bg-gray-50 mt-2 text-[10px] text-gray-400">
                Chữ ký điện tử hệ thống
              </div>
            </div>
          </div>
        </div>

        {/* === PHẦN DÀNH CHO NHÂN VIÊN SHBFINANCE === */}
        <div className="col-span-2 border-t-2 border-[#e8650a] pt-4 mt-4 bg-orange-50/30 p-3 rounded-lg border border-orange-200/50">
          <p className="font-bold text-[10px] uppercase text-[#c05000] tracking-wider mb-2">PHẦN DÀNH CHO NHÂN VIÊN SHBFINANCE</p>
          <p className="text-[8px] text-gray-500 leading-relaxed mb-3">
            - Tôi cam đoan đã kiểm tra và đối chiếu các thông tin trên giấy tờ photo/hình ảnh scan/ảnh chụp mà Bên vay cung cấp với bản gốc và xác nhận các thông tin Bên vay kê khai nêu trên đều khớp đúng và hoàn toàn chịu trách nhiệm về tính chính xác của hồ sơ thu thập được.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <FL label="DSA/Telesales code:" value="DSA-DEMO-2026" />
            <FL label="SĐT liên hệ người chứng kiến từ SHBFinance:" value="02471098888" />
            <FL label="Chi nhánh/POS/Hub:" value={d.disbursement_branch || "SHBFinance Hub"} />
            <FL label="Ngày xác nhận:" value={d.national_id_issue_date} />
          </div>
        </div>

        {/* === D === */}
        <SBanner>D. HỒ SƠ TÀI LIỆU KÈM THEO (CHỨNG TỪ MINH CHỨNG)</SBanner>
        <div className="col-span-2 flex flex-wrap gap-2">
          {data.documents.map((doc, i) => {
            const cls = doc.tier >= 2
              ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
              : "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100";
            const tl = ["—", "Đã nộp", "Đã xác minh", "Phê duyệt"];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveDoc(doc)}
                className={cn("inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer active:scale-95", cls)}
              >
                <span className={cn("h-2 w-2 rounded-full", doc.tier >= 2 ? "bg-green-500" : "bg-yellow-400")} />
                {docKindLabelVi(doc.kind)}
                <span className="font-normal opacity-60">· {tl[doc.tier] ?? "?"}</span>
              </button>
            );
          })}
        </div>

      </div>

      {activeDoc && (
        <DocumentDetailModal
          doc={activeDoc}
          customerName={d.customer_name}
          onClose={() => setActiveDoc(null)}
        />
      )}
    </div>
  );
}

function DossierSummaryCard({
  data,
  scenario,
  ingested = false,
  dossierCode,
}: {
  data: AssessFormState;
  scenario: string | null;
  ingested?: boolean;
  dossierCode?: string | null;
}) {
  const [activeDoc, setActiveDoc] = useState<DocumentInput | null>(null);
  const d = data.declared;
  const fmt = (n?: number | null) =>
    n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n) + " ₫";

  const productName = productLabelVi(data.product);
  const code =
    dossierCode ||
    (scenario ? `SHB-${scenario.toUpperCase()}-2026` : null);

  return (
    <div className="overflow-hidden rounded-xl border border-border/85 bg-white shadow-card relative">
      {/* Title Banner */}
      <div className="bg-orange-50/70 border-b border-border px-6 py-4 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-brand">
              Thông tin tiếp nhận hồ sơ & Gói vay đề nghị
            </h3>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Trạng thái:{" "}
              <span className={cn("font-semibold", ingested ? "text-success-foreground" : "text-brand")}>
                {ingested
                  ? "Đã tiếp nhận · multi-agent đang / đã xử lý"
                  : "Chờ tiếp nhận"}
              </span>
            </p>
          </div>
          {code && (
            <p className="text-[11px] text-muted-foreground">
              Mã hồ sơ:{" "}
              <code className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] font-semibold text-navy">
                {code}
              </code>
            </p>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        
        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-6 text-left">
          {/* Customer Profile Column */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-navy uppercase tracking-wider border-b border-border pb-1.5">
              1. Thông tin khách hàng
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Họ và tên:</span>
                <span className="font-semibold text-gray-800">{d.customer_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ngày sinh:</span>
                <span className="font-medium text-gray-800">{d.dob || "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Giới tính:</span>
                <span className="font-medium text-gray-800">{d.gender || "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Số CCCD:</span>
                <span className="font-mono font-medium text-gray-800">{d.national_id || "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">SĐT liên hệ:</span>
                <span className="font-medium text-gray-800">{d.phone || "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Công việc / Chức vụ:</span>
                <span className="font-medium text-gray-800">
                  {d.occupation
                    ? `${fieldSlugLabelVi(d.occupation)}${
                        d.position ? ` (${fieldSlugLabelVi(d.position)})` : ""
                      }`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Thu nhập hàng tháng:</span>
                <span className="font-semibold text-[#e8650a]">{fmt(d.monthly_income)}</span>
              </div>
            </div>
          </div>

          {/* Loan Package Column */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-navy uppercase tracking-wider border-b border-border pb-1.5">
              2. Gói vay đề nghị
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Sản phẩm vay:</span>
                <span className="font-semibold text-gray-800">{productName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Số tiền đề nghị:</span>
                <span className="font-semibold text-[#e8650a]">{fmt(d.amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Thời hạn vay:</span>
                <span className="font-medium text-gray-800">{d.term_months ? `${d.term_months} tháng` : "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Lãi suất dự kiến:</span>
                <span className="font-medium text-gray-800">
                  {d.annual_rate != null ? `${(d.annual_rate * 100).toFixed(1)}%/năm` : "Theo quy định SHB"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Mục đích vay vốn:</span>
                <span className="font-medium text-gray-800">
                  {fieldSlugLabelVi(d.declared_purpose)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Phương thức nhận:</span>
                <span className="font-medium text-gray-800">
                  {fieldSlugLabelVi(d.disbursement_method)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section D: Documents */}
        <div className="space-y-3 pt-2 text-left">
          <h4 className="text-[11px] font-bold text-navy uppercase tracking-wider border-b border-border pb-1.5">
            3. Hồ sơ tài liệu kèm theo (Nhấp để xem bản gốc)
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.documents.map((doc, i) => {
              const cls = doc.tier >= 2
                ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100";
              const tl = ["—", "Đã nộp", "Đã xác minh", "Phê duyệt"];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveDoc(doc)}
                  className={cn("inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer active:scale-95", cls)}
                >
                  <span className={cn("h-2 w-2 rounded-full", doc.tier >= 2 ? "bg-green-500" : "bg-yellow-400")} />
                  {docKindLabelVi(doc.kind)}
                  <span className="font-normal opacity-60">· {tl[doc.tier] ?? "?"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-left text-xs text-muted-foreground">
          Đây là tóm tắt hồ sơ. Bấm <strong>Chạy thẩm định</strong> phía trên để multi-agent chạy
          — báo cáo nhận định + chỉ số + timeline sẽ hiện bên dưới (không nằm trong khung này).
        </p>

      </div>

      {activeDoc && (
        <DocumentDetailModal
          doc={activeDoc}
          customerName={d.customer_name}
          onClose={() => setActiveDoc(null)}
        />
      )}
    </div>
  );
}

function rememberResult(
  result: AssessResponse,
  form: AssessFormState,
  applicationId?: string | null,
) {
  enqueueAssessResult(result, {
    customer_name: form.declared.customer_name,
    product: form.product,
    amount: form.declared.amount,
    application_id: applicationId ?? "retail-demo",
  });
}

type DossierListItem = ReturnType<typeof applicationToListRow> & {
  /** mock-only scenario key when not from DB */
  fromDb?: boolean;
};

export function AssessDashboard() {
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [form, setForm] = useState<AssessFormState>(EMPTY_FORM);
  const [dossier, setDossier] = useState<{
    data: AssessFormState;
    scenario: string;
    applicationId?: string | null;
  } | null>(null);
  const [tier3Confirmed, setTier3Confirmed] = useState(false);
  const [result, setResult] = useState<AssessResponse | null>(null);
  const [dossiers, setDossiers] = useState<DossierListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Step 1 only completes after user clicks Tiếp nhận */
  const [ingested, setIngested] = useState(false);
  const [agentStepIndex, setAgentStepIndex] = useState(0);
  const agentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearAgentTimer() {
    if (agentTimerRef.current) {
      clearInterval(agentTimerRef.current);
      agentTimerRef.current = null;
    }
  }

  useEffect(() => () => clearAgentTimer(), []);

  function startAgentProgress() {
    clearAgentTimer();
    setAgentStepIndex(0);
    agentTimerRef.current = setInterval(() => {
      setAgentStepIndex((i) => Math.min(i + 1, PIPELINE_RUN_STEPS.length - 1));
    }, 700);
  }

  function resetPipeline() {
    clearAgentTimer();
    setIngested(false);
    setResult(null);
    setError(null);
    setLoading(false);
    setAgentStepIndex(0);
    setTier3Confirmed(false);
  }

  const refreshDossiers = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const rows = await listApplications(100);
      setDossiers(
        rows.map((r) => ({
          ...applicationToListRow(r as unknown as ApplicationSectionA),
          fromDb: true,
        })),
      );
      if (rows.length === 0) {
        setListError("Database chưa có hồ sơ nào. Seed application-svc rồi thử lại.");
      }
    } catch (err) {
      setDossiers([]);
      setListError(err instanceof Error ? err.message : "Không tải được hồ sơ từ API");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDossiers();
  }, [refreshDossiers]);

  function updateDeclared<K extends keyof DeclaredForm>(
    key: K,
    value: DeclaredForm[K],
  ) {
    setForm((prev) => ({ ...prev, declared: { ...prev.declared, [key]: value } }));
  }

  const cases = listHitlCases();

  const getDossierStatusInfo = (item: DossierListItem) => {
    const match = cases.find(
      (c: HitlCase) =>
        (item.fromDb && c.application_id === item.application_id) ||
        c.customer_name.toUpperCase() === item.customer_name.toUpperCase() ||
        c.customer_name.toUpperCase().includes(item.customer_name.split(" ").slice(-1)[0] ?? ""),
    );
    if (match) {
      if (match.veto) return { key: "vetoed", label: "Bị từ chối (Veto)", tone: "warning" as const };
      if (match.decision === "approved" || match.ticket_id)
        return { key: "approved", label: "Đã giải ngân", tone: "success" as const };
      if (match.decision === "rejected")
        return { key: "vetoed", label: "Từ chối duyệt", tone: "warning" as const };
      return { key: "pending", label: "Chờ xét duyệt (HITL)", tone: "pending" as const };
    }
    if (item.db_status === "approved")
      return { key: "approved", label: "Đã giải ngân", tone: "success" as const };
    if (item.db_status === "rejected")
      return { key: "vetoed", label: "Từ chối / Veto", tone: "warning" as const };
    if (item.db_status === "assessing")
      return { key: "pending", label: "Chờ xét duyệt (HITL)", tone: "pending" as const };
    return { key: "ingested", label: "Tiếp nhận hồ sơ", tone: "active" as const };
  };

  /** Stage 1 only — tiếp nhận; RM proposal panel appears after this. */
  function acceptIntake() {
    setIngested(true);
    setError(null);
    setResult(null);
    // Demo: agent RM “đề xuất” = giữ số liệu hồ sơ; điền LS mặc định nếu trống
    setForm((prev) => {
      if (prev.declared.annual_rate != null) return prev;
      return {
        ...prev,
        declared: { ...prev.declared, annual_rate: 0.13 },
      };
    });
  }

  /** Stage 3 — gửi phương án RM (JSON form) vào multi-agent thẩm định. */
  async function runAppraisal(event?: React.FormEvent) {
    if (event) event.preventDefault();
    if (!ingested) {
      setError("Cần tiếp nhận hồ sơ trước khi chạy thẩm định.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    startAgentProgress();
    try {
      const body: AssessFormState = {
        ...form,
        documents: form.documents.map((doc) =>
          doc.tier === 3
            ? { ...doc, confirmed_by: tier3Confirmed ? "officer-demo" : doc.confirmed_by }
            : doc,
        ),
      };
      const appId = dossier?.applicationId;
      const next = await assessApplication(
        toAssessRequest(body, appId && appId.length > 20 ? appId : null),
      );
      clearAgentTimer();
      setAgentStepIndex(PIPELINE_RUN_STEPS.length - 1);
      setResult(next);
      rememberResult(next, body, appId && appId.length > 20 ? appId : null);
    } catch (err) {
      clearAgentTimer();
      setError(
        err instanceof Error
          ? err.message
          : "Không gọi được API. Kiểm tra backend :8000 (NEXT_PUBLIC_API_URL).",
      );
    } finally {
      setLoading(false);
    }
  }

  const run = result?.run_trace;
  const compliance = result?.compliance;
  const veto = Boolean(compliance?.veto);

  // Step status — FLOW-BUSINESS-CONFIRMED.md (5 stages)
  type StepStatus = "complete" | "active" | "failed" | "pending";
  let step1Status: StepStatus = ingested ? "complete" : "active";
  let step2Status: StepStatus = "pending";
  let step3Status: StepStatus = "pending";
  let step4Status: StepStatus = "pending";
  let step5Status: StepStatus = "pending";

  if (!ingested) {
    step1Status = "active";
  } else if (loading) {
    // Thẩm định đang chạy — panel agent chỉ thuộc stage 3
    step1Status = "complete";
    step2Status = "complete";
    step3Status = "active";
  } else if (result) {
    step1Status = "complete";
    if (veto || result.outcome === "vetoed") {
      step2Status = "complete";
      step3Status = "failed";
    } else {
      step2Status = "complete";
      step3Status = "complete";
      if (result.outcome === "stp_approved") {
        step4Status = "complete";
        step5Status = "complete";
      } else if (
        result.ticket?.status === "approved" ||
        result.ticket?.status === "disbursed" ||
        result.ticket?.ticket_id
      ) {
        step4Status = "complete";
        step5Status =
          form.product === "retail_unsecured_salary" || form.product.includes("unsecured")
            ? "complete"
            : "active";
      } else {
        step4Status = "active";
        step5Status = "pending";
      }
    }
  } else if (ingested) {
    step1Status = "complete";
    step2Status = "active";
  }

  const steps = [
    {
      title: "Tiếp nhận hồ sơ",
      desc: ingested ? "Đã tiếp nhận" : "Chờ tiếp nhận",
      status: step1Status,
    },
    {
      title: "RM đề xuất",
      desc:
        step2Status === "active"
          ? "Xem / chỉnh phương án agent"
          : step2Status === "complete"
            ? productLabelVi(dossier?.data.product)
            : "Sau tiếp nhận",
      status: step2Status,
    },
    {
      title: "Thẩm định",
      desc:
        step3Status === "failed"
          ? "Compliance veto"
          : step3Status === "complete"
            ? "Credit · Compliance · Critic"
            : step3Status === "active"
              ? "Multi-agent đang thẩm định…"
              : "Chờ phương án RM",
      status: step3Status,
    },
    {
      title: "Phê duyệt",
      desc:
        step4Status === "complete"
          ? result?.outcome === "stp_approved"
            ? "Agent duyệt (STP)"
            : "Người đã duyệt"
          : step4Status === "active"
            ? "Chờ người (HITL)"
            : "STP hoặc HITL",
      status: step4Status,
    },
    {
      title: "Giải ngân",
      desc:
        step5Status === "complete"
          ? "Hoàn tất"
          : step5Status === "active"
            ? "Sẵn sàng giải ngân"
            : "Sau phê duyệt",
      status: step5Status,
    },
  ];

  const isDisbursed = step5Status === "complete";
  const isRejected = Boolean(result && (veto || result.outcome === "vetoed"));
  const rejectionReasons: string[] = (() => {
    if (!isRejected || !compliance) return [];
    const fromViolations = (compliance.violations ?? [])
      .map((v) => sanitizeBusinessText(v.description || ruleLabelVi(v.rule_id)))
      .filter(Boolean);
    if (fromViolations.length > 0) return fromViolations;
    const fromRules = (compliance.rule_ids ?? []).map((id) => ruleLabelVi(id));
    return fromRules.length > 0 ? fromRules : ["Vi phạm hạn mức tuân thủ cứng — không được giải ngân"];
  })();

  const resultHeadline = (() => {
    if (!result) return "";
    if (isRejected) return "Từ chối — không giải ngân";
    if (isDisbursed) return "Đã giải ngân";
    if (result.outcome === "ready_for_human_approval") return "Chờ người phê duyệt";
    return outcomeLabelVi(result.outcome);
  })();

  const resultBadge = (() => {
    if (!result) return "";
    if (isRejected) return "Từ chối";
    if (isDisbursed) return "Đã giải ngân";
    if (result.outcome === "ready_for_human_approval") return "Chờ HITL";
    return laneLabelVi(run?.lane ?? 3);
  })();

  if (viewMode === "list" || !dossier) {
    const filteredDossiers = dossiers.filter((d) => {
      const statusInfo = getDossierStatusInfo(d);
      if (filterStatus !== "all" && statusInfo.key !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.customer_name.toLowerCase().includes(q) ||
          d.product_label.toLowerCase().includes(q) ||
          (d.data.declared.national_id ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    const fmt = (n?: number | null) =>
      n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n) + " ₫";

    return (
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between text-left">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-navy uppercase">Yêu cầu vay từ khách hàng</h1>
            <p className="text-xs text-muted-foreground">
              Xem chi tiết hồ sơ, đối chiếu chứng từ gốc và thực thi quy trình phê duyệt tự động.
              {listLoading ? " · Đang tải…" : ` · Nguồn: database (${dossiers.length} hồ sơ)`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => void refreshDossiers()}
            disabled={listLoading}
          >
            {listLoading ? "Đang tải…" : "Tải lại"}
          </Button>
        </div>

        {listError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>Không tải được hồ sơ: {listError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshDossiers()}>
              Thử lại
            </Button>
          </div>
        ) : null}

        {/* Filter & Search Bar */}
        <Card className="border border-border/70 p-4 shadow-sm bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="w-full md:w-80 relative">
            <Input
              type="text"
              placeholder="Tìm kiếm tên khách hàng, sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs py-2 pr-8"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "all", label: "Tất cả" },
              { key: "ingested", label: "Tiếp nhận" },
              { key: "pending", label: "Chờ xét duyệt" },
              { key: "approved", label: "Đã giải ngân" },
              { key: "vetoed", label: "Từ chối / Veto" },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setFilterStatus(btn.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer active:scale-95",
                  filterStatus === btn.key
                    ? "bg-[#e8650a] text-white border-[#e8650a] shadow-sm"
                    : "bg-white text-muted-foreground hover:bg-gray-50 border-border"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Table / List View */}
        <Card className="border border-border/70 overflow-hidden shadow-card bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-secondary/20 border-b border-border text-[10px] uppercase font-bold text-navy tracking-wider">
                  <th className="px-5 py-3.5">Khách hàng</th>
                  <th className="px-5 py-3.5">Sản phẩm vay</th>
                  <th className="px-5 py-3.5">Số tiền đề nghị</th>
                  <th className="px-5 py-3.5">Trạng thái hồ sơ</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {listLoading ? (
                  <tr>
                    <td colSpan={5} className="bg-secondary/5 px-5 py-16 text-center">
                      <div className="inline-flex flex-col items-center gap-3">
                        <Loader2
                          size={28}
                          className="animate-spin text-brand"
                          aria-hidden
                        />
                        <p className="text-sm font-medium text-navy">Đang tải danh sách yêu cầu vay…</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredDossiers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-xs text-muted-foreground italic bg-secondary/5">
                      {listError
                        ? "Không có dữ liệu vì API lỗi — bấm Thử lại phía trên."
                        : dossiers.length === 0
                          ? "Database chưa có hồ sơ yêu cầu vay."
                          : "Không tìm thấy hồ sơ nào phù hợp với bộ lọc."}
                    </td>
                  </tr>
                ) : (
                  filteredDossiers.map((item) => {
                    const statusInfo = getDossierStatusInfo(item);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-secondary/10 transition duration-150 cursor-pointer"
                        onClick={() => {
                          setDossier({
                            data: item.data,
                            scenario: item.scenario,
                            applicationId: item.fromDb ? item.application_id : null,
                          });
                          setForm(item.data);
                          resetPipeline();
                          setViewMode("detail");
                        }}
                      >
                        <td className="px-5 py-4">
                          <p className="text-xs font-bold text-navy uppercase leading-none">{item.customer_name}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">CCCD: {item.data.declared.national_id}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-gray-700">
                          {item.product_label}
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-brand">
                          {fmt(item.amount)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge tone={statusInfo.tone}>
                            {statusInfo.label}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#e8650a] hover:text-[#c05000] hover:underline"
                          >
                            Xử lý hồ sơ <ArrowRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quay lại + CTA — cùng hệ Button (outline | primary), size sm */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setViewMode("list")}
        >
          <ArrowLeft size={14} />
          Quay lại danh sách
        </Button>
        {!isDisbursed && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={loading}
            onClick={() => {
              if (!ingested) acceptIntake();
              else void runAppraisal();
            }}
          >
            {loading
              ? "Đang thẩm định…"
              : result
                ? "Chạy lại thẩm định"
                : !ingested
                  ? "Tiếp nhận hồ sơ"
                  : "Chạy thẩm định"}
            <ArrowRight size={14} />
          </Button>
        )}
      </div>

      {/* Stepper */}
      <Card className="border border-border/70 bg-card p-3 shadow-card sm:p-4">
        <div className="flex flex-col items-center justify-between gap-3 md:flex-row md:gap-2">
          {steps.map((step, idx) => {
            let circleBg = "border-border bg-secondary text-muted-foreground";
            let textColor = "text-muted-foreground";
            let icon = String(idx + 1);

            if (step.status === "complete") {
              circleBg = "border-success-foreground/40 bg-success-soft text-success-foreground";
              textColor = "font-medium text-foreground";
              icon = "✓";
            } else if (step.status === "active") {
              circleBg = "border-brand bg-brand text-on-primary animate-pulse";
              textColor = "font-bold text-brand";
            } else if (step.status === "failed") {
              circleBg = "border-warning-foreground/40 bg-warning-soft text-warning-foreground";
              textColor = "font-bold text-warning-foreground";
              icon = "✗";
            }

            return (
              <Fragment key={idx}>
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold shadow-sm",
                      circleBg,
                    )}
                  >
                    {icon}
                  </span>
                  <div className="text-left">
                    <p className={cn("text-xs leading-none", textColor)}>{step.title}</p>
                    <p className="mt-1 max-w-[140px] truncate text-[10px] text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className="mx-1 hidden h-px w-6 shrink-0 bg-border md:block" />
                )}
              </Fragment>
            );
          })}
        </div>
      </Card>

      {error && (
        <p className="rounded-lg bg-warning-soft p-2.5 text-xs text-warning-foreground">{error}</p>
      )}

      {loading && (
        <AgentRunProgress
          activeIndex={agentStepIndex}
          customerName={dossier?.data.declared.customer_name}
        />
      )}

      {/* RM đề xuất — chỉ sau tiếp nhận; agent lập PA, user chỉnh rồi gửi thẩm định */}
      {ingested && !result && !loading && (
        <Card className="border border-border/70 bg-card p-4 shadow-card">
          <h3 className="mb-1 text-left text-sm font-semibold text-navy">Phương án đề xuất (RM)</h3>
          <p className="mb-3 text-left text-[11px] text-muted-foreground">
            Agent đã lập phương án từ hồ sơ. Chỉnh nếu cần, rồi bấm <strong>Chạy thẩm định</strong> —
            JSON phương án này là input cho multi-agent.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-left text-[11px] text-muted-foreground">
              Số tiền đề nghị (₫)
              <div className="mt-1">
                <MoneyInput
                  value={form.declared.amount}
                  onChange={(n) => updateDeclared("amount", n ?? 0)}
                  aria-label="Số tiền đề nghị"
                  className="text-xs"
                />
              </div>
            </label>
            <label className="text-left text-[11px] text-muted-foreground">
              Kỳ hạn (tháng)
              <Input
                type="number"
                className="mt-1 text-xs"
                value={form.declared.term_months ?? ""}
                onChange={(e) => updateDeclared("term_months", Number(e.target.value) || 0)}
              />
            </label>
            <label className="text-left text-[11px] text-muted-foreground">
              Lãi suất (%/năm)
              <Input
                type="number"
                step="0.1"
                className="mt-1 text-xs"
                value={
                  form.declared.annual_rate != null
                    ? Number((form.declared.annual_rate * 100).toFixed(2))
                    : ""
                }
                onChange={(e) =>
                  updateDeclared("annual_rate", (Number(e.target.value) || 0) / 100)
                }
              />
            </label>
            <label className="text-left text-[11px] text-muted-foreground">
              Nợ hiện hữu / tháng (₫)
              <div className="mt-1">
                <MoneyInput
                  value={form.declared.existing_monthly_debt}
                  onChange={(n) => updateDeclared("existing_monthly_debt", n ?? 0)}
                  aria-label="Nợ hiện hữu hàng tháng"
                  className="text-xs"
                />
              </div>
            </label>
          </div>
        </Card>
      )}

      {/* Kết quả — gọn: outcome + values + agent process + hồ sơ */}
      {result && (
        <div className="space-y-4">
          {/* Outcome banner — nghiệp vụ: đã giải ngân | từ chối + lý do | chờ HITL */}
          <Card
            className={cn(
              "border p-4 shadow-card",
              isRejected && "border-warning-foreground/25 bg-warning-soft/40",
              isDisbursed && "border-success-foreground/25 bg-success-soft/40",
              !isRejected &&
                !isDisbursed &&
                result.outcome === "ready_for_human_approval" &&
                "border-active-foreground/20 bg-active-soft/40",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 text-left">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Kết quả
                </p>
                <p
                  className={cn(
                    "mt-1 text-lg font-bold",
                    isRejected ? "text-warning-foreground" : "text-navy",
                  )}
                >
                  {resultHeadline}
                </p>
                {isDisbursed && result.outcome !== "stp_approved" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đã phê duyệt và hoàn tất giải ngân.
                  </p>
                )}
                {isRejected && (
                  <ul className="mt-2 space-y-1 text-sm text-warning-foreground">
                    {rejectionReasons.map((reason) => (
                      <li key={reason}>· {reason}</li>
                    ))}
                  </ul>
                )}
                {isRejected && (run?.replan_count ?? 0) > 0 && (
                  <p className="mt-2 text-xs text-warning-foreground/80">
                    Hệ thống đã điều chỉnh phương án {run?.replan_count} lần nhưng vẫn bị chặn
                    bởi hạn mức cứng — không giải ngân.
                  </p>
                )}
                {!isRejected && result.outcome === "ready_for_human_approval" && (
                  <Link
                    href="/admin/approvals"
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary"
                  >
                    Mở phê duyệt <ArrowRight size={14} />
                  </Link>
                )}
              </div>
              <StatusBadge
                tone={isRejected ? "warning" : isDisbursed ? "success" : "pending"}
              >
                {resultBadge}
              </StatusBadge>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Values */}
            <Card className="border border-border/70 p-4 shadow-card text-left">
              <h3 className="text-sm font-semibold text-navy">Chỉ số &amp; phương án</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] text-muted-foreground">Số tiền</dt>
                  <dd className="font-semibold text-navy">
                    {form.declared.amount != null
                      ? `${new Intl.NumberFormat("vi-VN").format(form.declared.amount)} ₫`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Kỳ hạn</dt>
                  <dd className="font-semibold text-navy">
                    {form.declared.term_months != null ? `${form.declared.term_months} tháng` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Lãi suất</dt>
                  <dd className="font-semibold text-navy">
                    {form.declared.annual_rate != null
                      ? `${(form.declared.annual_rate * 100).toFixed(1)}%/năm`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">DTI</dt>
                  <dd className="font-semibold text-navy">
                    {result.credit?.dti != null
                      ? `${(Number(result.credit.dti) * 100).toFixed(1)}%`
                      : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[11px] text-muted-foreground">Khuyến nghị tín dụng</dt>
                  <dd className="font-semibold text-navy">
                    {recommendationLabelVi(result.credit?.recommendation)}
                  </dd>
                </div>
                {result.credit?.tool_results && (
                  <div className="col-span-2">
                    <dt className="text-[11px] text-muted-foreground">Công cụ đã chạy</dt>
                    <dd className="text-xs text-muted-foreground">
                      {Object.keys(result.credit.tool_results)
                        .map((t) => toolLabelVi(t))
                        .join(" · ")}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>

            {/* Agent process */}
            <Card className="border border-border/70 p-4 shadow-card text-left">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-navy">Tiến trình agent</h3>
                <span className="text-[11px] text-muted-foreground">
                  {result.trace.length} bước
                </span>
              </div>
              <NodeTimeline
                trace={result.trace}
                vetoFired={Boolean(run?.veto_fired)}
                emptyHint="Chưa có tiến trình."
              />
            </Card>
          </div>

          {/* Agent narrative reports — Critic owns the full textual report */}
          <Card className="border border-border/70 p-4 shadow-card text-left">
            <h3 className="text-sm font-semibold text-navy">Báo cáo nhận định agent</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Báo cáo tổng hợp văn bản do <strong>Critic</strong> (tuyến 3) chịu trách nhiệm.
              Credit / Operations / Compliance chỉ đóng góp nhận định chuyên môn; số liệu vẫn từ tool.
            </p>
            <div className="mt-3 space-y-3">
              {result.critic?.memo ? (
                <div className="rounded-lg border border-brand/25 bg-accent/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                    Critic — báo cáo tổng hợp
                  </p>
                  <p className="mt-1 text-sm text-navy whitespace-pre-wrap">{result.critic.memo}</p>
                  {result.critic.remediation_plan?.length ? (
                    <div className="mt-3 border-t border-border/50 pt-2">
                      <p className="text-[11px] font-semibold text-muted-foreground">Việc cần làm tiếp</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                        {result.critic.remediation_plan.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                  Critic chưa chạy trên lane này (thường chỉ lane HITL / sau veto). Case STP sạch có thể
                  không có báo cáo Critic — xem chỉ số Credit/Compliance bên trên.
                </p>
              )}
              {result.credit?.rationale ? (
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Credit — nhận định chuyên môn
                  </p>
                  <p className="mt-1 text-sm text-navy whitespace-pre-wrap">{result.credit.rationale}</p>
                </div>
              ) : null}
              {result.operations?.rationale ? (
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Operations — nhận định chuyên môn
                  </p>
                  <p className="mt-1 text-sm text-navy whitespace-pre-wrap">{result.operations.rationale}</p>
                </div>
              ) : null}
              {result.compliance?.rationale ? (
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Compliance — nhận định chuyên môn
                  </p>
                  <p className="mt-1 text-sm text-navy whitespace-pre-wrap">{result.compliance.rationale}</p>
                </div>
              ) : null}
            </div>
          </Card>

          {/* Hồ sơ data — summary only, not full form dump */}
          {dossier && (
            <DossierSummaryCard
              data={dossier.data}
              scenario={dossier.scenario}
              ingested={true}
              dossierCode={
                dossier.applicationId
                  ? dossier.applicationId.slice(0, 8).toUpperCase()
                  : `SHB-${dossier.scenario.toUpperCase()}-2026`
              }
            />
          )}
        </div>
      )}

      {/* Hồ sơ trước khi chạy */}
      {!result && !loading && dossier && (
        <DossierSummaryCard
          data={dossier.data}
          scenario={dossier.scenario}
          ingested={ingested}
          dossierCode={
            dossier.applicationId
              ? dossier.applicationId.slice(0, 8).toUpperCase()
              : `SHB-${dossier.scenario.toUpperCase()}-2026`
          }
        />
      )}
    </div>
  );
}
