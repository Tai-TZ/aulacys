"use client";

import { useState, Fragment, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import {
  assess,
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
import { cn } from "@/lib/cn";

/** Dashboard always edits a full body (id path is API-only for now). */
type AssessFormState = MappedAssessForm;

type MetricFactView = {
  value: number | null;
  label_vi: string;
  unit: string;
  stage: string;
  source: string;
  valid: boolean;
  error?: string | null;
};

type MetricReportView = {
  complete: boolean;
  required: string[];
  missing: string[];
  invalid: string[];
  facts: Record<string, MetricFactView>;
};

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
// Ba kịch bản demo — Vay tiêu dùng tín chấp (retail_unsecured_salary)
// ---------------------------------------------------------------------------

/** Happy path — NGUYỄN THỊ BÉ HOA (CCCD 074300004128) */
const HAPPY_DEMO: AssessFormState = {
  product: "retail_unsecured_salary",
  declared: {
    customer_name: "NGUYỄN THỊ BÉ HOA",
    amount: 150_000_000,
    term_months: 36,
    annual_rate: 0.13,
    monthly_income: 22_000_000,
    existing_monthly_debt: 0,
    declared_purpose: "Mua sắm nội thất, tiêu dùng cá nhân",
    dob: "10/06/2000",
    gender: "Nữ",
    national_id: "074300004128",
    national_id_issue_date: "21/05/2025",
    national_id_issue_place: "Bộ Công an",
    old_national_id: "074300001234",
    phone: "0912300004",
    phone_2: "0987654321",
    zalo_phone: "0912300004",
    permanent_address: "Tổ 2, Khu Phố Cổng Xanh, Tân Bình, Bắc Tân Uyên, Bình Dương",
    current_address: "Tổ 2, Khu Phố Cổng Xanh, Tân Bình, Bắc Tân Uyên, Bình Dương",
    email: "behoa.nguyen@email.com",
    occupation: "Nhân viên văn phòng",
    company_name: "Công ty TNHH SX TM Phúc Thịnh",
    position: "Nhân viên kinh doanh",
    company_address: "Khu công nghiệp VSIP II, Bình Dương",
    salary_payday: "Ngày 5 hàng tháng",
    personal_expense: 8_000_000,
    disbursement_method: "Giải ngân cho Bên vay",
    disbursement_bank: "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)",
    disbursement_branch: "Chi nhánh Bình Dương",
    disbursement_account: "104074300004",
    disbursement_account_name: "NGUYỄN THỊ BÉ HOA",
    ref1_name: "Nguyễn Thị Kim Loan",
    ref1_relationship: "Mẹ",
    ref1_phone: "0912300001",
    ref1_same_address: true,
    ref2_name: "Trần Văn Minh",
    ref2_relationship: "Đồng nghiệp",
    ref2_phone: "0912300002",
    ref2_same_address: false,
    consent_data_processing: true,
    consent_advertising: true,
    id_number: "001099000001",
    cic_consent: true,
  },
  documents: [
    { kind: "cccd", tier: 1, extracted: { verified: true, id_number: "074300004128" } },
    { kind: "sao_ke_luong", tier: 1, extracted: { monthly_income: 22_000_000 } },
    { kind: "cic", tier: 1, extracted: { score_band: "A" } },
  ],
};

/** Veto path — TRẦN THỊ VUI (CCCD 091185013867) — mục đích thực là tất toán nợ */
const VETO_DEMO: AssessFormState = {
  product: "retail_unsecured_salary",
  declared: {
    customer_name: "TRẦN THỊ VUI",
    amount: 300_000_000,
    term_months: 24,
    annual_rate: 0.13,
    monthly_income: 18_000_000,
    existing_monthly_debt: 8_500_000,
    declared_purpose: "Tiêu dùng cá nhân",
    dob: "10/05/1985",
    gender: "Nữ",
    national_id: "091185013867",
    national_id_issue_date: "02/06/2023",
    national_id_issue_place: "Cục Trưởng Cục Cảnh sát Quản lý hành chính về trật tự xã hội",
    old_national_id: "091185002233",
    phone: "0913000091",
    phone_2: "0922334455",
    zalo_phone: "0913000091",
    permanent_address: "Mong Thá, Châu Thành, Kiên Giang",
    current_address: "Thổ Sơn, Hòn Đất, Kiên Giang",
    email: "vui.tran@email.com",
    occupation: "Buôn bán tự do",
    company_name: "Hộ kinh doanh cá thể",
    position: "Chủ hộ",
    company_address: "Chợ Thổ Sơn, Hòn Đất, Kiên Giang",
    salary_payday: "Không cố định",
    personal_expense: 10_000_000,
    disbursement_method: "Giải ngân cho Bên vay",
    disbursement_bank: "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)",
    disbursement_branch: "Chi nhánh Kiên Giang",
    disbursement_account: "109091185013",
    disbursement_account_name: "TRẦN THỊ VUI",
    ref1_name: "Trần Văn Thanh",
    ref1_relationship: "Anh trai",
    ref1_phone: "0913000092",
    ref1_same_address: true,
    ref2_name: "Lê Thị Hồng",
    ref2_relationship: "Hàng xóm",
    ref2_phone: "0913000093",
    ref2_same_address: false,
    consent_data_processing: true,
    consent_advertising: true,
    id_number: "091185013867",
    cic_consent: true,
  },
  documents: [
    { kind: "cccd", tier: 1, extracted: { verified: true, id_number: "091185013867" } },
    { kind: "sao_ke_luong", tier: 1, extracted: { monthly_income: 18_000_000 } },
    { kind: "cic", tier: 1, extracted: { score_band: "B" } },
    // purpose_evidence mâu thuẫn → VETO
    { kind: "purpose_evidence", tier: 2, extracted: { actual_purpose: "tất toán khoản vay ở TCTD khác" } },
  ],
};

/** HITL / biên giới — NGUYỄN THỊ HUYỀN TRẦN (CCCD 054301008970) */
const HITL_DEMO: AssessFormState = {
  product: "retail_unsecured_salary",
  declared: {
    customer_name: "NGUYỄN THỊ HUYỀN TRẦN",
    amount: 200_000_000,
    term_months: 48,
    annual_rate: 0.135,
    monthly_income: 15_000_000,
    existing_monthly_debt: 5_000_000,
    declared_purpose: "Tiêu dùng cá nhân (sửa chữa nhà)",
    dob: "19/03/2001",
    gender: "Nữ",
    national_id: "054301008970",
    national_id_issue_date: "05/07/2022",
    national_id_issue_place: "Cục Trưởng Cục Cảnh sát Quản lý hành chính về trật tự xã hội",
    old_national_id: "054301001111",
    phone: "0905400054",
    phone_2: "0933445566",
    zalo_phone: "0905400054",
    permanent_address: "Hiệp Trung, Thị xã Đồng Hòa, Phú Yên",
    current_address: "Khu Phổ Phú Hòa, Hòa Hiệp Trung, Thị xã Đồng Hòa, Phú Yên",
    email: "huyentran.nguyen@email.com",
    occupation: "Giáo viên",
    company_name: "Trường THCS Hòa Hiệp Trung",
    position: "Giáo viên",
    company_address: "Thị xã Đông Hòa, Phú Yên",
    salary_payday: "Ngày 15 hàng tháng",
    personal_expense: 7_000_000,
    disbursement_method: "Giải ngân cho Bên vay",
    disbursement_bank: "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)",
    disbursement_branch: "Chi nhánh Phú Yên",
    disbursement_account: "105054301008",
    disbursement_account_name: "NGUYỄN THỊ HUYỀN TRẦN",
    ref1_name: "Nguyễn Thị Lan",
    ref1_relationship: "Mẹ",
    ref1_phone: "0905400055",
    ref1_same_address: true,
    ref2_name: "Trần Văn Phúc",
    ref2_relationship: "Đồng nghiệp",
    ref2_phone: "0905400056",
    ref2_same_address: false,
    consent_data_processing: true,
    consent_advertising: false,
    id_number: "054301008970",
    cic_consent: true,
  },
  documents: [
    { kind: "cccd", tier: 1, extracted: { verified: true, id_number: "054301008970" } },
    // tier-2: sao kê chưa verify chính thức → HITL
    { kind: "sao_ke_luong", tier: 2, extracted: { monthly_income: 15_000_000 } },
    { kind: "cic", tier: 1, extracted: { score_band: "B" } },
  ],
};

function laneLabel(lane: number): string {
  if (lane === 1) return "Lane 1 · STP / rule-only";
  if (lane === 2) return "Lane 2 · Cheap model";
  return "Lane 3 · HITL / Critic";
}

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
}: {
  value: number | null | undefined;
  onChange: (next: number | null) => void;
  required?: boolean;
  "aria-label"?: string;
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
        className="pr-14"
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
                {doc.kind}
                <span className="font-normal opacity-60">· {tl[doc.tier] ?? "?"}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Modal Popup Chi tiết tài liệu */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-border max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-gray-50">
              <div className="text-left">
                <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
                  Chi tiết chứng từ: {activeDoc.kind}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Hồ sơ khách hàng: {d.customer_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col md:flex-row gap-6 p-5 overflow-y-auto min-h-0 text-left">
              {/* Left column: Document Preview */}
              <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-xl border border-border overflow-hidden min-h-[300px] md:min-h-0 relative">
                {activeDoc.kind === "cccd" ? (
                  <img
                    src={
                      d.customer_name.includes("BÉ HOA")
                        ? "/aulacys/cccd-be-hoa.png"
                        : d.customer_name.includes("VUI")
                        ? "/aulacys/cccd-tran-vui.png"
                        : "/aulacys/cccd-huyen-tran.png"
                    }
                    alt="CCCD"
                    className="max-w-full max-h-[400px] object-contain shadow-md rounded"
                  />
                ) : activeDoc.kind === "sao_ke_luong" || activeDoc.kind === "sao_ke_tai_khoan" ? (
                  <img
                    src="/aulacys/help-1.png"
                    alt="Sao kê lương"
                    className="max-w-full max-h-[400px] object-contain shadow-md rounded"
                  />
                ) : activeDoc.kind === "purpose_evidence" ? (
                  <img
                    src="/aulacys/help-2.png"
                    alt="Minh chứng mục đích"
                    className="max-w-full max-h-[400px] object-contain shadow-md rounded"
                  />
                ) : activeDoc.kind === "cic" ? (
                  <img
                    src="/aulacys/help-3.png"
                    alt="CIC Report"
                    className="max-w-full max-h-[400px] object-contain shadow-md rounded"
                  />
                ) : (
                  <div className="text-center text-xs text-muted-foreground p-6">
                    Không có hình ảnh đính kèm cho loại hồ sơ này
                  </div>
                )}
              </div>

              {/* Right column: OCR Data Panel */}
              <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-4">
                <div className="rounded-xl border border-border p-4 bg-secondary/10">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wide mb-2">Trạng thái xác minh</h4>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex h-2.5 w-2.5 rounded-full",
                      activeDoc.tier >= 2 ? "bg-green-500 animate-pulse" : "bg-yellow-400"
                    )} />
                    <span className="text-xs font-semibold text-gray-700">
                      Tier {activeDoc.tier} · {activeDoc.tier === 1 ? "Đã nộp" : activeDoc.tier === 2 ? "Đã xác minh" : "Phê duyệt"}
                    </span>
                  </div>
                  {activeDoc.confirmed_by && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Xác nhận bởi: <code className="bg-white px-1 py-0.5 rounded border">{activeDoc.confirmed_by}</code>
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border p-4 bg-secondary/10 flex-1 min-h-[180px]">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wide mb-3">Dữ liệu trích xuất (OCR)</h4>
                  {activeDoc.extracted && Object.keys(activeDoc.extracted).length > 0 ? (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {Object.entries(activeDoc.extracted).map(([key, val]) => (
                        <div key={key} className="border-b border-border/50 pb-1.5 last:border-0 text-left">
                          <span className="text-[10px] text-muted-foreground block font-mono">{key}</span>
                          <span className="text-xs font-semibold text-gray-800 break-all">
                            {typeof val === "boolean" ? (val ? "True ✅" : "False ❌") : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Không có dữ liệu trích xuất tự động.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-border px-5 py-3 bg-gray-50">
              <Button
                type="button"
                onClick={() => setActiveDoc(null)}
                size="sm"
                className="px-4 text-xs font-medium"
              >
                Đóng
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function DossierSummaryCard({
  data,
  scenario,
}: {
  data: AssessFormState;
  scenario: string | null;
}) {
  const [activeDoc, setActiveDoc] = useState<DocumentInput | null>(null);
  const d = data.declared;
  const fmt = (n?: number | null) =>
    n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n) + " ₫";

  const productName = data.product === "retail_mortgage" 
    ? "retail_mortgage (Vay thế chấp mua nhà)" 
    : "retail_unsecured_salary (Vay tiêu dùng theo lương)";

  return (
    <div className="overflow-hidden rounded-xl border border-border/85 bg-white shadow-card relative">
      {/* Title Banner */}
      <div className="bg-orange-50/70 border-b border-border px-6 py-4 text-left">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[#e8650a]">
          Thông tin tiếp nhận hồ sơ & Gói vay đề nghị
        </h3>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Trạng thái: <span className="font-semibold text-green-600">Tiếp nhận thành công (Đã phân loại)</span>
        </p>
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
                  {d.occupation ? `${d.occupation} (${d.position || "Nhân viên"})` : "—"}
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
                <span className="font-medium text-gray-800">{d.declared_purpose || "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Phương thức nhận:</span>
                <span className="font-medium text-gray-800">{d.disbursement_method || "—"}</span>
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
                  {doc.kind}
                  <span className="font-normal opacity-60">· {tl[doc.tier] ?? "?"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Helper Note Banner */}
        <div className="rounded-xl bg-orange-50 border border-orange-200/50 p-4 text-xs text-orange-800 text-left">
          💡 <strong>Quy trình tiếp theo:</strong> Bản hợp đồng vay vốn chính thức và các thông tin thẩm định chi tiết sẽ tự động được hiển thị sau khi chạy tiến trình thẩm định thành công.
        </div>

      </div>

      {/* Modal Popup Chi tiết tài liệu */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-border max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-gray-50">
              <div className="text-left">
                <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
                  Chi tiết chứng từ: {activeDoc.kind}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Hồ sơ khách hàng: {d.customer_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col md:flex-row gap-6 p-5 overflow-y-auto min-h-0 text-left">
              {/* Left column: Document Preview */}
              <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-xl border border-border overflow-hidden min-h-[300px] md:min-h-0 relative">
                {activeDoc.kind === "cccd" ? (
                  <img
                    src={
                      d.customer_name.includes("BÉ HOA")
                        ? "/aulacys/cccd-be-hoa.png"
                        : d.customer_name.includes("VUI")
                        ? "/aulacys/cccd-tran-vui.png"
                        : "/aulacys/cccd-huyen-tran.png"
                    }
                    alt="CCCD"
                    className="max-w-full max-h-[400px] object-contain shadow-md rounded"
                  />
                ) : activeDoc.kind === "sao_ke_luong" || activeDoc.kind === "sao_ke_tai_khoan" ? (
                  <img
                    src="/aulacys/help-1.png"
                    alt="Sao kê lương"
                    className="max-w-full max-h-[400px] object-contain shadow-md rounded"
                  />
                ) : activeDoc.kind === "purpose_evidence" ? (
                  <img
                    src="/aulacys/help-2.png"
                    alt="Minh chứng mục đích"
                    className="max-w-full max-h-[400px] object-contain shadow-md rounded"
                  />
                ) : activeDoc.kind === "cic" ? (
                  <img
                    src="/aulacys/help-3.png"
                    alt="CIC Report"
                    className="max-w-full max-h-[400px] object-contain shadow-md rounded"
                  />
                ) : (
                  <div className="text-center text-xs text-muted-foreground p-6">
                    Không có hình ảnh đính kèm cho loại hồ sơ này
                  </div>
                )}
              </div>

              {/* Right column: OCR Data Panel */}
              <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-4">
                <div className="rounded-xl border border-border p-4 bg-secondary/10">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wide mb-2">Trạng thái xác minh</h4>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex h-2.5 w-2.5 rounded-full",
                      activeDoc.tier >= 2 ? "bg-green-500 animate-pulse" : "bg-yellow-400"
                    )} />
                    <span className="text-xs font-semibold text-gray-700">
                      Tier {activeDoc.tier} · {activeDoc.tier === 1 ? "Đã nộp" : activeDoc.tier === 2 ? "Đã xác minh" : "Phê duyệt"}
                    </span>
                  </div>
                  {activeDoc.confirmed_by && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Xác nhận bởi: <code className="bg-white px-1 py-0.5 rounded border">{activeDoc.confirmed_by}</code>
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border p-4 bg-secondary/10 flex-1 min-h-[180px]">
                  <h4 className="text-xs font-bold text-navy uppercase tracking-wide mb-3">Dữ liệu trích xuất (OCR)</h4>
                  {activeDoc.extracted && Object.keys(activeDoc.extracted).length > 0 ? (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {Object.entries(activeDoc.extracted).map(([key, val]) => (
                        <div key={key} className="border-b border-border/50 pb-1.5 last:border-0 text-left">
                          <span className="text-[10px] text-muted-foreground block font-mono">{key}</span>
                          <span className="text-xs font-semibold text-gray-800 break-all">
                            {typeof val === "boolean" ? (val ? "True ✅" : "False ❌") : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Không có dữ liệu trích xuất tự động.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-border px-5 py-3 bg-gray-50">
              <Button
                type="button"
                onClick={() => setActiveDoc(null)}
                size="sm"
                className="px-4 text-xs font-medium"
              >
                Đóng
              </Button>
            </div>

          </div>
        </div>
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

type DossierListItem = ReturnType<typeof applicationToListRow>;

export function AssessDashboard() {
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [form, setForm] = useState<AssessFormState>(HAPPY_DEMO);
  const [dossier, setDossier] = useState<{
    data: AssessFormState;
    scenario: string;
    applicationId?: string | null;
  } | null>(null);
  const [tier3Confirmed, setTier3Confirmed] = useState(false);
  const [result, setResult] = useState<AssessResponse | null>(null);
  const [dossiers, setDossiers] = useState<DossierListItem[]>([]);
  const [listSource, setListSource] = useState<"db" | "offline">("db");
  const [listLoading, setListLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDossiers = useCallback(async () => {
    setListLoading(true);
    try {
      const rows = await listApplications(100);
      setDossiers(
        rows.map((r) => applicationToListRow(r as unknown as ApplicationSectionA)),
      );
      setListSource("db");
    } catch {
      setDossiers([]);
      setListSource("offline");
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
        c.application_id === item.application_id ||
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

  async function runSubmitted(event?: React.FormEvent) {
    if (event) event.preventDefault();
    setLoading(true);
    setError(null);
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
      const next = await assessApplication(toAssessRequest(body, appId && appId.length > 20 ? appId : null));
      setResult(next);
      rememberResult(next, body, appId && appId.length > 20 ? appId : null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không gọi được API. Kiểm tra backend :8000 (NEXT_PUBLIC_API_URL).",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runSeedDemo(keyword: string, fallbackForm: AssessFormState) {
    setLoading(true);
    setError(null);
    try {
      const next = await assess(keyword);
      setResult(next);
      rememberResult(next, fallbackForm, dossier?.applicationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gọi được API seed.");
    } finally {
      setLoading(false);
    }
  }

  const run = result?.run_trace;
  const compliance = result?.compliance;
  const veto = Boolean(compliance?.veto);
  const unverified = (compliance?.violations ?? []).filter((v) => v.unverified);
  const metricReport = compliance?.tool_results?.metric_report as MetricReportView | undefined;
  const stats = [
    {
      label: "Lane",
      value: run ? String(run.lane) : "—",
      change: run ? laneLabel(run.lane) : "Chưa chạy",
      icon: Activity,
    },
    {
      label: "Replan",
      value: run ? String(run.replan_count) : "—",
      change: run?.veto_fired ? "Veto đã kích hoạt" : "Chưa veto",
      icon: Clock3,
    },
    {
      label: "Outcome",
      value: result?.outcome ?? "—",
      change: result?.response?.slice(0, 48) ?? "Submit hồ sơ để xem",
      icon: CheckCircle2,
    },
    {
      label: "Compliance",
      value: veto ? "VETO" : result ? "OK" : "—",
      change: compliance?.rule_ids?.join(", ") || "Không có rule fire",
      icon: ShieldAlert,
    },
  ];

  // Step status determination:
  let step3Status: "complete" | "active" | "failed" | "pending" = "active";
  let step4Status: "complete" | "active" | "failed" | "pending" = "pending";
  let step5Status: "complete" | "active" | "failed" | "pending" = "pending";

  if (loading) {
    step3Status = "active";
  } else if (result) {
    if (veto) {
      step3Status = "failed";
      step4Status = "pending";
      step5Status = "pending";
    } else {
      step3Status = "complete";
      if (result.ticket?.status === "approved" || result.ticket?.status === "disbursed" || result.ticket?.ticket_id) {
        step4Status = "complete";
        step5Status = "complete";
      } else {
        step4Status = "active"; // Waiting for HITL approval
        step5Status = "pending";
      }
    }
  }

  const steps = [
    { title: "Tiếp nhận hồ sơ", desc: "Đã nhận đơn vay", status: "complete" as const },
    { title: "Phân loại", desc: dossier?.data.product || "Hồ sơ bán lẻ", status: "complete" as const },
    {
      title: "Thẩm định (Graph)",
      desc: step3Status === "failed" ? "Compliance Veto" : step3Status === "complete" ? "Đã thẩm định" : "Đang thẩm định...",
      status: step3Status,
    },
    {
      title: "Xét duyệt (HITL)",
      desc: step4Status === "complete" ? "Lãnh đạo đã duyệt" : step4Status === "active" ? "Chờ phê duyệt" : "Chưa chuyển tiếp",
      status: step4Status,
    },
    {
      title: "Giải ngân",
      desc: step5Status === "complete" ? "Đã tạo ticket SHB" : "Chưa giải ngân",
      status: step5Status,
    },
  ];

  if (viewMode === "list") {
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
            <h1 className="text-xl font-bold tracking-tight text-navy uppercase">Bộ hồ sơ khách hàng bán lẻ</h1>
            <p className="text-xs text-muted-foreground">
              Xem chi tiết hồ sơ, đối chiếu chứng từ gốc và thực thi quy trình phê duyệt tự động.
              {" · "}
              {listLoading
                ? "Đang tải…"
                : listSource === "db"
                  ? `Nguồn: application-svc / database (${dossiers.length} hồ sơ)`
                  : "Nguồn: không kết nối được API/application-svc"}
            </p>
          </div>
        </div>

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
                {filteredDossiers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-xs text-muted-foreground italic bg-secondary/5">
                      {listSource === "offline"
                        ? "Không kết nối được application-svc. Kiểm tra service :8360 rồi tải lại trang."
                        : dossiers.length === 0
                          ? "Chưa có hồ sơ trong database. Chạy seed: python scripts/seed_dossiers.py"
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
                            applicationId: item.application_id,
                          });
                          setForm(item.data);
                          setResult(null); // Clear previous results when switching
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
    <div className="space-y-6">
      {/* Quay lại danh sách hồ sơ header */}
      <div className="flex items-center justify-between pb-1 text-left">
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-navy hover:text-[#e8650a] transition cursor-pointer"
        >
          ← Quay lại danh sách bộ hồ sơ
        </button>
        <span className="text-[10px] text-muted-foreground">
          Mã hồ sơ:{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded border">
            {dossier?.applicationId
              ? dossier.applicationId.slice(0, 8).toUpperCase()
              : `SHB-${dossier?.scenario.toUpperCase()}-2026`}
          </code>
        </span>
      </div>
      {/* ── THANH TIẾN TRÌNH WIZARD ── */}
      <Card className="border border-border/70 p-5 shadow-card bg-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
          {steps.map((step, idx) => {
            let circleBg = "bg-gray-100 text-gray-400 border-gray-300";
            let textColor = "text-muted-foreground";
            let icon = String(idx + 1);

            if (step.status === "complete") {
              circleBg = "bg-green-500 text-white border-green-500";
              textColor = "text-gray-800 font-medium";
              icon = "✓";
            } else if (step.status === "active") {
              circleBg = "bg-[#e8650a] text-white border-[#e8650a] animate-pulse";
              textColor = "text-[#e8650a] font-bold";
            } else if (step.status === "failed") {
              circleBg = "bg-red-500 text-white border-red-500";
              textColor = "text-red-600 font-bold";
              icon = "✗";
            }

            return (
              <Fragment key={idx}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-sm", circleBg)}>
                    {icon}
                  </span>
                  <div className="text-left">
                    <p className={cn("text-xs leading-none", textColor)}>{step.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] truncate">{step.desc}</p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block w-8 h-px bg-border shrink-0 mx-2" />
                )}
              </Fragment>
            );
          })}
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, change, icon: Icon }) => (
          <Card key={label} className="overflow-hidden border-border/70 p-0 shadow-card">
            <div className="h-1 bg-brand/80" aria-hidden />
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-brand">
                  <Icon size={18} />
                </span>
                <span className="max-w-[10rem] truncate text-right text-xs leading-5 text-muted-foreground">
                  {change}
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-navy">{value}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </section>

      {metricReport && (
        <Card className="border-border/70 p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-navy">Chỉ số thẩm định</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Giá trị do tool tạo và nguồn bằng chứng được dùng để chạy Rule Engine.
              </p>
            </div>
            <StatusBadge tone={metricReport.complete ? "success" : "warning"}>
              {metricReport.complete
                ? `Đủ ${metricReport.required.length}/${metricReport.required.length}`
                : `Thiếu ${metricReport.missing.length + metricReport.invalid.length}`}
            </StatusBadge>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {metricReport.required.map((name) => {
              const fact = metricReport.facts[name];
              const ok = Boolean(fact?.valid && fact.value != null);
              return (
                <div
                  key={name}
                  className={cn(
                    "rounded-xl border p-3",
                    ok ? "border-border/60 bg-secondary/30" : "border-warning-foreground/20 bg-warning-soft",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-navy">{fact?.label_vi || name}</span>
                    <StatusBadge tone={ok ? "success" : "warning"}>{ok ? "Đạt dữ liệu" : "Thiếu"}</StatusBadge>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {fact?.value == null ? "—" : new Intl.NumberFormat("vi-VN").format(fact.value)}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    <code>{name}</code> · Nguồn: {fact?.source || "Chưa có"}
                  </p>
                  {fact?.error && <p className="mt-1 text-xs text-warning-foreground">{fact.error}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {veto && (
        <Card className="border-warning-foreground/15 bg-warning-soft p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone="warning">Compliance veto</StatusBadge>
            <p className="font-semibold text-warning-foreground">
              Hard limit: {(compliance?.rule_ids ?? []).join(", ") || "unknown rule"}
            </p>
            {unverified.length > 0 && <StatusBadge tone="pending">unverified</StatusBadge>}
          </div>
          <p className="mt-2 text-sm text-warning-foreground/90">
            Planner đã replan {run?.replan_count ?? 0} lần. Timeline lặp node{" "}
            <code className="rounded bg-card px-1.5 py-0.5 text-xs">compliance</code> — money shot.
          </p>
          {unverified.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-warning-foreground">
              {unverified.map((v) => (
                <li key={v.rule_id}>
                  <strong>{v.rule_id}</strong> · v{v.version ?? "?"} — ngưỡng chưa verify, không trích dẫn ra ngoài.
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {result && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-active-foreground/10 bg-active-soft p-4 shadow-card">
          <p className="text-sm text-active-foreground">
            Hồ sơ đã vào hàng đợi HITL. Tiếp theo: người phê duyệt ghi ticket.
          </p>
          <Link
            href="/admin/approvals"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary shadow-brand transition hover:opacity-90"
          >
            Mở Người phê duyệt <ArrowRight size={16} />
          </Link>
        </Card>
      )}

      {/* ── BÀN ĐIỀU KHIỂN THẨM ĐỊNH (CONTROL PANEL) ── */}
      <Card className="border border-border/70 p-5 shadow-card sm:p-6 bg-secondary/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-left">
            <h2 className="text-sm font-semibold tracking-tight text-[#c05000]">Bàn làm việc của Nhân viên Thẩm định</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Thực hiện quy trình thẩm định tự động (Graph) cho hồ sơ: <strong className="text-navy">{dossier?.data.declared.customer_name}</strong>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Simulation Options */}
            <label className="flex items-center gap-2 text-xs text-muted-foreground font-medium select-none cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-border text-[#e8650a] focus:ring-[#e8650a]"
                checked={tier3Confirmed}
                onChange={(e) => setTier3Confirmed(e.target.checked)}
              />
              Nhân viên xác nhận Tier-3 (confirmed_by)
            </label>

            {/* Submit / Trigger Action */}
            <div className="flex items-center gap-2 border-l border-border pl-3">
              <Button
                type="button"
                disabled={loading}
                onClick={() => runSubmitted()}
                size="sm"
                className="bg-[#e8650a] hover:bg-[#c05000] text-white text-xs font-semibold px-4 py-2"
              >
                {loading ? "Đang chạy..." : "Chạy Thẩm Định (API)"}
                <ArrowRight size={14} className="ml-1" />
              </Button>
              <Button
                type="button"
                disabled={loading}
                variant="outline"
                onClick={() => dossier && runSeedDemo(dossier.scenario, dossier.data)}
                size="sm"
                className="text-xs font-semibold px-4 py-2"
              >
                Seed tự động
              </Button>
            </div>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-lg bg-warning-soft p-3 text-xs text-warning-foreground">{error}</p>
        )}
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {dossier && (
            result ? (
              <DossierPreviewCard data={dossier.data} scenario={dossier.scenario} />
            ) : (
              <DossierSummaryCard data={dossier.data} scenario={dossier.scenario} />
            )
          )}
        </div>

        

        <Card className="border-border/70 p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-navy">Node timeline</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {result ? `${result.trace.length} bước · harness trace` : "Chưa có trace"}
              </p>
            </div>
            {run && (
              <StatusBadge tone={run.veto_fired ? "warning" : "success"}>lane {run.lane}</StatusBadge>
            )}
          </div>
          <div className="mt-6 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
            {(result?.trace ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/50 px-6 py-14 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-brand">
                  <Bot size={22} />
                </span>
                <p className="text-sm font-medium text-navy">Chưa có trace</p>
                <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                  Submit hồ sơ để xem Planner → agents → replan.
                </p>
              </div>
            )}
            {(result?.trace ?? []).map((item, index) => (
              <div key={`${item.node}-${index}`} className="relative flex gap-4">
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-brand ring-4 ring-card">
                  <Bot size={16} />
                </div>
                {index < (result?.trace.length ?? 0) - 1 && (
                  <span className="absolute left-[17px] top-9 h-[calc(100%-0.25rem)] w-px bg-border" />
                )}
                <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-navy">{item.node}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.latency_ms}ms · {item.fallback_fired ? "fallback" : item.model}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.tool_calls.length > 0 ? item.tool_calls.join(", ") : "no tools"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {(result?.ticket || result?.audit) && (
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              {result.ticket && (
                <p>
                  <span className="font-medium text-navy">Ticket:</span>{" "}
                  {String(result.ticket.ticket_id ?? "—")} · {String(result.ticket.status ?? "")}
                </p>
              )}
              {result.audit && (
                <p className="break-all text-muted-foreground">
                  Audit seq={String(result.audit.seq ?? "—")} hash=
                  {String(result.audit.content_hash ?? "—")}
                </p>
              )}
            </div>
          )}

          {result?.credit && (
            <div className="mt-4 rounded-xl border border-border/60 bg-secondary/50 p-3.5 text-sm">
              <p className="font-medium text-navy">Credit</p>
              <p className="mt-1 text-muted-foreground">
                DTI {result.credit.dti ?? "—"} · {result.credit.recommendation}
              </p>
            </div>
          )}
          {result?.operations && (
            <div className="mt-2 rounded-xl border border-border/60 bg-secondary/50 p-3.5 text-sm">
              <p className="font-medium text-navy">Operations</p>
              <p className="mt-1 text-muted-foreground">
                Valuation {result.operations.valuation?.toLocaleString("vi-VN") ?? "—"} ·{" "}
                {result.operations.doc_status}
              </p>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
