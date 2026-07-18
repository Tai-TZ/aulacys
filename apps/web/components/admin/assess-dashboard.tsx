"use client";

import { useState } from "react";
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
  type AssessApplicationRequest,
  type AssessResponse,
  type DocumentInput,
} from "@/lib/api";
import { enqueueAssessResult } from "@/lib/hitl-queue";
import { cn } from "@/lib/cn";

const MORTGAGE_DEMO: AssessApplicationRequest = {
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
    phone: "0901234567",
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
    ref1_name: "Trần Thị Mai",
    ref1_relationship: "Chị gái",
    ref1_phone: "0903456789",
    ref1_same_address: false,
    ref2_name: "Nguyễn Văn Cường",
    ref2_relationship: "Bạn thân",
    ref2_phone: "0904567890",
    ref2_same_address: false,
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
const HAPPY_DEMO: AssessApplicationRequest = {
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
    phone: "0912300004",
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
  },
  documents: [
    { kind: "cccd", tier: 1, extracted: { verified: true, id_number: "074300004128" } },
    { kind: "sao_ke_luong", tier: 1, extracted: { monthly_income: 22_000_000 } },
    { kind: "cic", tier: 1, extracted: { score_band: "A" } },
  ],
};

/** Veto path — TRẦN THỊ VUI (CCCD 091185013867) — mục đích thực là tất toán nợ */
const VETO_DEMO: AssessApplicationRequest = {
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
    phone: "0913000091",
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
const HITL_DEMO: AssessApplicationRequest = {
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
    phone: "0905400054",
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

function DossierPreviewCard({
  data,
  scenario,
}: {
  data: AssessApplicationRequest;
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

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-5 sm:p-6">

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

        <GTitle>2. THÔNG TIN LIÊN HỆ:</GTitle>
        <SubTitle>2.1. Số điện thoại:</SubTitle>
        <FL label="Số điện thoại di động:" value={d.phone} />
        <FL label="Số Zalo:"               value={d.zalo_phone} />

        <SubTitle>2.2. Địa chỉ:</SubTitle>
        <FL label="Địa chỉ thường trú:"       value={d.permanent_address} wide />
        <FL label="Địa chỉ nơi ở hiện tại:"  value={d.current_address}   wide />

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

        <FL label="Tên đơn vị công tác:" value={d.company_name}    wide />
        <FL label="Địa chỉ công ty:"     value={d.company_address} wide />

        <div className="col-span-2 space-y-1.5">
          <span className="text-[10px] font-medium text-[#7a5100]">Chức vụ:</span>
          <div className="flex flex-wrap gap-x-6 gap-y-1 pl-1">
            <CB label="Cán bộ quản lý"         checked={isMgr} />
            <CB label="Nhân viên / Chuyên viên" checked={isStaff} />
            <CB label="Khác"                    checked={!isMgr && !isStaff} />
          </div>
        </div>

        <FL label="Ngày trả lương:"          value={d.salary_payday} />
        <FL label="Thu nhập hàng tháng:"     value={fmt(d.monthly_income)} />
        <FL label="Chi phí cá nhân / tháng:" value={fmt(d.personal_expense)} />
        <FL label="Dư nợ hiện tại:"          value={fmt(d.existing_monthly_debt)} />

        {/* === B === */}
        <SBanner>B. THÔNG TIN KHOẢN VAY ĐỀ NGHỊ</SBanner>
        <FL label="Số tiền vay đề nghị:"       value={fmt(d.amount)} />
        <FL label="Thời hạn vay:"              value={d.term_months ? `${d.term_months} tháng` : undefined} />
        <FL label="Lãi suất / năm:"            value={d.annual_rate != null ? `${(d.annual_rate * 100).toFixed(1)} %` : undefined} />
        <FL label="Mục đích sử dụng vốn:"      value={d.declared_purpose} />
        <FL label="Phương thức giải ngân:"     value={d.disbursement_method} wide />
        <FL label="Ngân hàng nhận GN:"         value={d.disbursement_bank} />
        <FL label="Chi nhánh:"                 value={d.disbursement_branch} />
        <FL label="Số tài khoản:"              value={d.disbursement_account} />
        <FL label="Chủ tài khoản:"             value={d.disbursement_account_name} />

        {/* === C === */}
        <SBanner>C. THÔNG TIN NGƯỜI THAM CHIẾU</SBanner>

        <SubTitle>Người tham chiếu 1:</SubTitle>
        <FL label="Họ và tên:"              value={d.ref1_name} />
        <FL label="Quan hệ với bên vay:"    value={d.ref1_relationship} />
        <FL label="Số điện thoại:"          value={d.ref1_phone} />
        <div className="flex items-end gap-5 pb-0.5">
          <span className="text-[10px] font-medium text-[#7a5100]">Cùng địa chỉ thường trú:</span>
          <CB label="Có"   checked={!!d.ref1_same_address} />
          <CB label="Không" checked={!d.ref1_same_address} />
        </div>

        <SubTitle>Người tham chiếu 2:</SubTitle>
        <FL label="Họ và tên:"              value={d.ref2_name} />
        <FL label="Quan hệ với bên vay:"    value={d.ref2_relationship} />
        <FL label="Số điện thoại:"          value={d.ref2_phone} />
        <div className="flex items-end gap-5 pb-0.5">
          <span className="text-[10px] font-medium text-[#7a5100]">Cùng địa chỉ thường trú:</span>
          <CB label="Có"   checked={!!d.ref2_same_address} />
          <CB label="Không" checked={!d.ref2_same_address} />
        </div>

        {/* === D === */}
        <SBanner>D. HỒ SƠ TÀI LIỆU KÈM THEO</SBanner>
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



function rememberResult(result: AssessResponse, form: AssessApplicationRequest) {
  enqueueAssessResult(result, {
    customer_name: form.declared.customer_name,
    product: form.product,
    amount: form.declared.amount,
    application_id: "retail-demo",
  });
}

export function AssessDashboard() {
  const [form, setForm] = useState<AssessApplicationRequest>(HAPPY_DEMO);
  const [dossier, setDossier] = useState<{ data: AssessApplicationRequest; scenario: string } | null>(
    { data: HAPPY_DEMO, scenario: "happy" },
  );
  const [tier3Confirmed, setTier3Confirmed] = useState(false);
  const [result, setResult] = useState<AssessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  async function runSubmitted(event?: React.FormEvent) {
    if (event) event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: AssessApplicationRequest = {
        ...form,
        documents: form.documents.map((doc) =>
          doc.tier === 3
            ? { ...doc, confirmed_by: tier3Confirmed ? "officer-demo" : doc.confirmed_by }
            : doc,
        ),
      };
      const next = await assessApplication(body);
      setResult(next);
      rememberResult(next, body);
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

  async function runSeedDemo(keyword: string, fallbackForm: AssessApplicationRequest) {
    setLoading(true);
    setError(null);
    try {
      const next = await assess(keyword);
      setResult(next);
      rememberResult(next, fallbackForm);
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

  return (
    <div className="space-y-6">
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
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-[#c05000]">Bàn làm việc của Nhân viên Thẩm định</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Chọn kịch bản/khách hàng để thực hiện quy trình thẩm định tự động (Graph).
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Profile Selection */}
            <div className="flex rounded-lg border border-border bg-background p-1 gap-1">
              <button
                type="button"
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition",
                  dossier?.scenario === "happy" ? "bg-[#e8650a] text-white" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  setForm(HAPPY_DEMO);
                  setDossier({ data: HAPPY_DEMO, scenario: "happy" });
                  setTier3Confirmed(false);
                  setResult(null);
                }}
              >
                ✅ Happy — Bé Hoa
              </button>
              <button
                type="button"
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition",
                  dossier?.scenario === "veto" ? "bg-[#e8650a] text-white" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  setForm(VETO_DEMO);
                  setDossier({ data: VETO_DEMO, scenario: "veto" });
                  setTier3Confirmed(false);
                  setResult(null);
                }}
              >
                🚫 Veto — Trần Vui
              </button>
              <button
                type="button"
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition",
                  dossier?.scenario === "hitl" ? "bg-[#e8650a] text-white" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  setForm(HITL_DEMO);
                  setDossier({ data: HITL_DEMO, scenario: "hitl" });
                  setTier3Confirmed(false);
                  setResult(null);
                }}
              >
                ⏳ HITL — Huyền Trần
              </button>
            </div>

            {/* Simulation Options */}
            <label className="flex items-center gap-2 text-xs text-muted-foreground font-medium border-l border-border pl-3 select-none cursor-pointer">
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
            <DossierPreviewCard data={dossier.data} scenario={dossier.scenario} />
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
