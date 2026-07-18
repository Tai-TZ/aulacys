"use client";

import { useState, useEffect } from "react";
import { 
  Home, 
  Car, 
  Briefcase, 
  ShoppingBag, 
  GraduationCap, 
  Key, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Eye, 
  Edit, 
  Trash, 
  X, 
  Grid, 
  List, 
  Check, 
  AlertCircle, 
  FileText, 
  BarChart3, 
  Settings,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LoanProduct, LoanProductGroup, ProductStatus } from "./mock-data";

// Icon mapping helper
export const GroupIcon = ({ name, className }: { name: string; className?: string }) => {
  const props = { className: cn("h-5 w-5", className) };
  switch (name) {
    case "Home": return <Home {...props} />;
    case "Car": return <Car {...props} />;
    case "Briefcase": return <Briefcase {...props} />;
    case "ShoppingBag": return <ShoppingBag {...props} />;
    case "GraduationCap": return <GraduationCap {...props} />;
    case "Key": return <Key {...props} />;
    default: return <FileText {...props} />;
  }
};

// 1. Component: ProductStatusBadge
export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Đang hoạt động
        </span>
      );
    case "DRAFT":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Bản nháp
        </span>
      );
    case "SUSPENDED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Tạm ngừng
        </span>
      );
  }
}

// 2. Component: IndividualProductOverview (Stats summary blocks)
interface OverviewProps {
  products: LoanProduct[];
  groups: LoanProductGroup[];
}
export function IndividualProductOverview({ products, groups }: OverviewProps) {
  const totalGroups = groups.length;
  const totalProducts = products.length;
  const activeCount = products.filter(p => p.status === "ACTIVE").length;
  const draftCount = products.filter(p => p.status === "DRAFT").length;
  const suspendedCount = products.filter(p => p.status === "SUSPENDED").length;

  const stats = [
    { label: "Tổng nhóm sản phẩm", value: totalGroups, bg: "bg-[#003B71]/5", text: "text-[#003B71]", border: "border-[#003B71]/10" },
    { label: "Tổng sản phẩm vay", value: totalProducts, bg: "bg-[#F58220]/5", text: "text-[#F58220]", border: "border-[#F58220]/10" },
    { label: "Đang hoạt động", value: activeCount, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    { label: "Sản phẩm bản nháp", value: draftCount, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    { label: "Tạm ngừng", value: suspendedCount, bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((s, idx) => (
        <div key={idx} className={cn("p-4 rounded-2xl border flex flex-col justify-between bg-white shadow-xs", s.border)}>
          <span className="text-xs font-medium text-[#6B7280]">{s.label}</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={cn("text-2xl font-extrabold", s.text)}>{s.value}</span>
            <span className={cn("h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase", s.bg, s.text)}>
              Qty
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// 3. Component: LoanProductGroupCard
interface GroupCardProps {
  group: LoanProductGroup;
  products: LoanProduct[];
  onViewProducts: (groupId: string) => void;
  onEditGroup: (group: LoanProductGroup) => void;
}
export function LoanProductGroupCard({ group, products, onViewProducts, onEditGroup }: GroupCardProps) {
  const groupProducts = products.filter(p => p.productGroupId === group.id);
  const activeCount = groupProducts.filter(p => p.status === "ACTIVE").length;

  return (
    <div className="bg-white border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 bg-[#003B71]/5 text-[#003B71] rounded-xl flex items-center justify-center">
            <GroupIcon name={group.iconName} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
              group.isActive 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-neutral-50 text-neutral-500 border-neutral-200"
            )}>
              {group.isActive ? "Hoạt động" : "Tạm ngưng"}
            </span>
            <button 
              type="button"
              onClick={() => onEditGroup(group)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center hover:bg-secondary transition"
              title="Chỉnh sửa nhóm"
            >
              <Edit size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <h4 className="font-extrabold text-[#003B71] text-base">{group.name}</h4>
          <p className="mt-1 text-xs text-[#6B7280] leading-relaxed line-clamp-2 min-h-[2rem]">
            {group.description || "Không có mô tả."}
          </p>
        </div>

        {/* Counts summary */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/40 text-xs">
          <div>
            <span className="text-[#6B7280] block">Tổng sản phẩm</span>
            <span className="font-bold text-[#003B71] text-sm">{groupProducts.length}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block">Đang hoạt động</span>
            <span className="font-bold text-emerald-600 text-sm">{activeCount}</span>
          </div>
        </div>

        {/* Child products list snippet */}
        {groupProducts.length > 0 ? (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Sản phẩm con:</span>
            <ul className="space-y-1">
              {groupProducts.slice(0, 3).map(p => (
                <li key={p.id} className="flex items-center justify-between text-xs py-0.5 px-2 bg-secondary/50 rounded-md">
                  <span className="truncate max-w-[150px] font-medium text-navy">{p.productName}</span>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    p.status === "ACTIVE" ? "bg-emerald-500" : p.status === "DRAFT" ? "bg-amber-500" : "bg-rose-500"
                  )} />
                </li>
              ))}
              {groupProducts.length > 3 && (
                <li className="text-[10px] text-muted-foreground italic text-center">
                  + {groupProducts.length - 3} sản phẩm khác
                </li>
              )}
            </ul>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic py-2 text-center bg-secondary/35 rounded-xl">
            Chưa có sản phẩm thuộc nhóm này
          </div>
        )}
      </div>

      <div className="mt-5 pt-1">
        <Button 
          onClick={() => onViewProducts(group.id)} 
          className="w-full text-xs font-bold text-[#003B71] border border-[#003B71]/20 bg-white hover:bg-[#003B71]/5 h-9 rounded-xl flex items-center justify-center transition"
        >
          Xem sản phẩm
        </Button>
      </div>
    </div>
  );
}

// 4. Component: LoanProductGroupList
interface GroupListProps {
  groups: LoanProductGroup[];
  products: LoanProduct[];
  onViewProducts: (groupId: string) => void;
  onEditGroup: (group: LoanProductGroup) => void;
}
export function LoanProductGroupList({ groups, products, onViewProducts, onEditGroup }: GroupListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {groups.map(g => (
        <LoanProductGroupCard 
          key={g.id} 
          group={g} 
          products={products} 
          onViewProducts={onViewProducts} 
          onEditGroup={onEditGroup} 
        />
      ))}
    </div>
  );
}

// Helper formatting cash values
export const formatVND = (val: number) => {
  if (val >= 1000000000) {
    return `${(val / 1000000000).toLocaleString("vi-VN")} tỷ VNĐ`;
  }
  return `${(val / 1000000).toLocaleString("vi-VN")} triệu VNĐ`;
};

// 5. Component: IndividualLoanProductTable
interface TableProps {
  products: LoanProduct[];
  onViewDetail: (prod: LoanProduct) => void;
  onEditDetail: (prod: LoanProduct) => void;
  onToggleStatus: (prod: LoanProduct) => void;
}
export function IndividualLoanProductTable({ products, onViewDetail, onEditDetail, onToggleStatus }: TableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl p-12 text-center shadow-xs">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h4 className="font-extrabold text-navy text-base">Không tìm thấy sản phẩm nào</h4>
        <p className="mt-1 text-xs text-[#6B7280]">Vui lòng thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border/80 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-secondary/40 border-b border-border/50 text-[#003B71] font-bold">
              <th className="p-4 text-xs uppercase tracking-wider">Mã sản phẩm</th>
              <th className="p-4 text-xs uppercase tracking-wider">Tên sản phẩm</th>
              <th className="p-4 text-xs uppercase tracking-wider">Nhóm sản phẩm</th>
              <th className="p-4 text-xs uppercase tracking-wider">Số tiền vay</th>
              <th className="p-4 text-xs uppercase tracking-wider">Kỳ hạn</th>
              <th className="p-4 text-xs uppercase tracking-wider">Lãi suất</th>
              <th className="p-4 text-xs uppercase tracking-wider">Trạng thái</th>
              <th className="p-4 text-xs uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {products.map(p => {
              const isUnsecured = p.securedType === "UNSECURED" || p.collateralType === "UNSECURED";
              return (
                <tr key={p.id} className="hover:bg-secondary/20 transition duration-150">
                  <td className="p-4 font-bold text-navy text-xs">{p.productCode}</td>
                  <td className="p-4 font-semibold text-navy max-w-[200px] truncate" title={p.productName}>
                    <div className="flex flex-col gap-1 items-start text-left">
                      <span className="font-semibold text-navy">{p.productName}</span>
                      {isUnsecured && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
                          Tín chấp
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-xs text-[#6B7280] font-medium">{p.productGroupName}</td>
                  <td className="p-4 text-xs text-navy font-semibold">
                    {isUnsecured || !p.minAmount
                      ? `Tối đa ${formatVND(p.maxAmount)}`
                      : `${formatVND(p.minAmount)} - ${formatVND(p.maxAmount)}`}
                  </td>
                  <td className="p-4 text-xs text-[#6B7280] font-medium">
                    {isUnsecured || !p.minTerm
                      ? `Tối đa ${p.maxTerm} tháng`
                      : `${p.minTerm} - ${p.maxTerm} tháng`}
                  </td>
                  <td className="p-4 text-xs font-bold text-[#F58220]">
                    {isUnsecured || !p.interestRate || p.interestRate === 0
                      ? "Theo CS SHB"
                      : `${p.interestRate}%/năm`}
                  </td>
                  <td className="p-4">
                    <ProductStatusBadge status={p.status} />
                  </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end items-center gap-1">
                    <button 
                      type="button" 
                      onClick={() => onViewDetail(p)} 
                      className="h-8 w-8 text-[#003B71] hover:bg-[#003B71]/5 rounded-lg flex items-center justify-center transition"
                      title="Xem chi tiết"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => onEditDetail(p)} 
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-lg flex items-center justify-center transition"
                      title="Chỉnh sửa"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => onToggleStatus(p)} 
                      className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition"
                      title="Đổi trạng thái"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}

// 6. Component: IndividualLoanProductFilters
interface FiltersProps {
  groups: LoanProductGroup[];
  filterGroupId: string;
  setFilterGroupId: (val: string) => void;
  filterSecuredType: string;
  setFilterSecuredType: (val: string) => void;
  filterSegment: string;
  setFilterSegment: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onClear: () => void;
}
export function IndividualLoanProductFilters({
  groups,
  filterGroupId,
  setFilterGroupId,
  filterSecuredType,
  setFilterSecuredType,
  filterSegment,
  setFilterSegment,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  onClear
}: FiltersProps) {
  const [openFilters, setOpenFilters] = useState(false);

  const segments = [
    "Khách hàng cá nhân phổ thông",
    "Khách hàng ưu tiên",
    "Hộ kinh doanh",
    "Cá nhân có hoạt động sản xuất kinh doanh",
    "Người nhận lương",
    "Người tự doanh"
  ];

  const hasActiveFilters = filterGroupId || filterSecuredType || filterSegment || filterStatus || searchQuery;

  return (
    <div className="bg-white border border-border/80 rounded-2xl p-4 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm mã hoặc tên sản phẩm..."
            className="pl-10 h-11 border-border rounded-xl focus-visible:ring-2 focus-visible:ring-[#F58220]/25"
          />
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setOpenFilters(!openFilters)}
            variant="outline"
            className={cn(
              "h-11 px-4 rounded-xl border-border text-navy font-semibold flex items-center gap-2 transition hover:bg-secondary",
              openFilters || hasActiveFilters ? "bg-[#F58220]/5 text-[#F58220] border-[#F58220]/30" : ""
            )}
          >
            <SlidersHorizontal size={15} />
            Bộ lọc nâng cao
          </Button>

          {hasActiveFilters && (
            <Button 
              onClick={onClear}
              variant="ghost"
              className="h-11 px-3 text-xs text-rose-600 hover:bg-rose-50 font-bold rounded-xl"
            >
              Xóa lọc
            </Button>
          )}
        </div>
      </div>

      {openFilters && (
        <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          {/* Group */}
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">Nhóm sản phẩm</label>
            <select 
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="w-full h-10 border border-border bg-background rounded-xl px-3 outline-none text-xs text-foreground focus:ring-1 focus:ring-[#F58220]"
            >
              <option value="">Tất cả các nhóm</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Secured Type */}
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">Hình thức bảo đảm</label>
            <select 
              value={filterSecuredType}
              onChange={(e) => setFilterSecuredType(e.target.value)}
              className="w-full h-10 border border-border bg-background rounded-xl px-3 outline-none text-xs text-foreground focus:ring-1 focus:ring-[#F58220]"
            >
              <option value="">Tất cả</option>
              <option value="SECURED">Có tài sản bảo đảm</option>
              <option value="UNSECURED">Không có tài sản bảo đảm</option>
            </select>
          </div>

          {/* Customer Segment */}
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">Phân khúc khách hàng</label>
            <select 
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value)}
              className="w-full h-10 border border-border bg-background rounded-xl px-3 outline-none text-xs text-foreground focus:ring-1 focus:ring-[#F58220]"
            >
              <option value="">Tất cả các phân khúc</option>
              {segments.map((seg, idx) => (
                <option key={idx} value={seg}>{seg}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">Trạng thái sản phẩm</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-10 border border-border bg-background rounded-xl px-3 outline-none text-xs text-foreground focus:ring-1 focus:ring-[#F58220]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="SUSPENDED">Tạm ngừng</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// 7. Component: ProductPreview (Detail modal)
interface PreviewProps {
  product: LoanProduct | null;
  onClose: () => void;
  onEdit?: (prod: LoanProduct) => void;
}

function DetailField({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide block">
        {label}
      </span>
      <div className="text-xs font-semibold text-[#003B71] leading-normal">
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 pb-2 mb-3">
      <div className="h-6 w-6 rounded bg-[#003B71]/5 text-[#003B71] flex items-center justify-center">
        <Icon size={14} />
      </div>
      <h4 className="text-xs font-bold text-[#003B71] uppercase tracking-wider">
        {title}
      </h4>
    </div>
  );
}

function HeaderStatusBadge({ status }: { status: ProductStatus }) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Đang áp dụng
        </span>
      );
    case "DRAFT":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 border border-neutral-200">
          Bản nháp
        </span>
      );
    case "SUSPENDED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          Tạm ngừng
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          Hết hiệu lực
        </span>
      );
  }
}

function getProductDetailConfig(p: LoanProduct) {
  return {
    id: p.productCode,
    productName: p.productName,
    customerType: p.customerType === "INDIVIDUAL" ? "Khách hàng cá nhân" : "Doanh nghiệp",
    productGroup: p.productGroupName,
    status: p.status,
    segments: p.segments,
    purpose: p.purpose,
    loanStructure: p.loanStructure ?? {
      loanMethodName: p.loanMethod === "Cho vay trả góp" ? "Cho vay từng lần" : p.loanMethod,
      securedTypeName: p.securedType === "SECURED" ? "Có tài sản bảo đảm" : "Không có tài sản bảo đảm",
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      minTerm: p.minTerm,
      maxTerm: p.maxTerm,
      currency: "VNĐ",
      maxLtv: p.securedType === "SECURED" ? 80 : undefined,
      disbursementMethod: p.securedType === "SECURED" ? "Chuyển khoản cho bên bán" : "Chuyển khoản / Tiền mặt",
      disbursementTimes: "Một lần hoặc theo tiến độ"
    },
    interestConfig: p.interestConfig ?? {
      rateType: "Ưu đãi sau đó thả nổi",
      promoRate: p.interestRate,
      promoTermMonths: undefined,
      postPromoRateType: "Lãi suất tham chiếu + biên độ",
      spread: undefined,
      interestMethod: "Theo dư nợ giảm dần",
      prepaymentFeePolicy: "Theo chính sách từng thời kỳ"
    },
    repaymentConfig: p.repaymentConfig ?? {
      method: "Trả góp",
      principalRepaymentMethod: "Gốc trả đều hàng tháng",
      interestRepaymentMethod: "Trả hàng tháng theo dư nợ thực tế",
      frequency: "Hàng tháng",
      gracePeriodMaxMonths: 0,
      prepaymentAllowed: true,
      collectionDay: "Theo ngày giải ngân hoặc thỏa thuận"
    },
    collateralConfig: p.securedType === "SECURED" ? (p.collateralConfig ?? {
      acceptedTypes: ["Nhà ở", "Quyền sử dụng đất", "Nhà đất hình thành từ vốn vay"],
      futureAssetAllowed: true,
      maxLtv: 80,
      valuationRequired: true,
      insuranceRequired: true,
      owners: ["Khách hàng", "Vợ/chồng", "Người thân được SHB chấp thuận"]
    }) : undefined,
    documentGroups: p.documentGroups ?? [
      {
        title: "Hồ sơ nhân thân",
        items: ["CCCD còn hiệu lực", "Thông tin cư trú", "Giấy đăng ký kết hôn hoặc xác nhận độc thân"]
      },
      {
        title: "Hồ sơ chứng minh thu nhập",
        items: ["Hợp đồng lao động", "Sao kê tài khoản nhận lương", "Hồ sơ nguồn thu nhập khác"]
      },
      {
        title: "Hồ sơ mục đích vay",
        items: ["Hợp đồng đặt cọc", "Hợp đồng mua bán hoặc chuyển nhượng", "Giấy tờ liên quan đến bất động sản"]
      },
      {
        title: "Hồ sơ tài sản bảo đảm",
        items: ["Giấy chứng nhận quyền sử dụng đất", "Hồ sơ pháp lý của tài sản", "Hồ sơ định giá"]
      }
    ],
    effectivePeriod: p.effectivePeriod ?? {
      startDate: p.updatedAt,
      endDate: null,
      channels: ["Tại quầy", "Website", "Ứng dụng"]
    },
    eligibility: p.eligibility
  };
}

export function ProductPreview({ product, onClose, onEdit }: PreviewProps) {
  const [openDocGroups, setOpenDocGroups] = useState<Record<number, boolean>>({
    0: true,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const config = getProductDetailConfig(product);
  const isUnsecured = product.securedType === "UNSECURED" || product.collateralType === "UNSECURED";

  const fmt = (n?: number | null) =>
    n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n) + " ₫";

  const formatVNDText = (val: number) => {
    if (val >= 1000000000) {
      return `${(val / 1000000000).toLocaleString("vi-VN")} tỷ VNĐ`;
    }
    return `${(val / 1000000).toLocaleString("vi-VN")} triệu VNĐ`;
  };

  const toggleGroup = (idx: number) => {
    setOpenDocGroups(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const maxLtvValue = config.collateralConfig?.maxLtv ?? config.loanStructure?.maxLtv;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-border w-full max-w-[960px] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header (fixed) */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/30">
          <div className="text-left">
            <span className="text-[10px] font-bold text-[#F58220] uppercase tracking-wider block">
              KHÁCH HÀNG CÁ NHÂN
            </span>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <h3 className="font-extrabold text-[#003B71] text-lg">{config.productName}</h3>
              {isUnsecured && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  Tín chấp
                </span>
              )}
              <HeaderStatusBadge status={config.status} />
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-200 rounded-lg"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-left flex-1">
          
          {/* Highlight Metrics */}
          <div className="bg-[#003B71]/5 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border border-[#003B71]/10 text-center">
            <div>
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase block">Lãi suất từ</span>
              <span className="text-xl font-extrabold text-[#F58220] mt-1 block">
                {config.interestConfig?.promoRate != null ? `${config.interestConfig.promoRate}%/năm` : "Theo chính sách SHB"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase block">Thời hạn tối đa</span>
              <span className="text-xl font-extrabold text-[#003B71] mt-1 block">
                {config.loanStructure?.maxTerm != null ? `${config.loanStructure.maxTerm} tháng` : "—"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase block">Số tiền vay tối đa</span>
              <span className="text-xl font-extrabold text-[#003B71] mt-1 block">
                {config.loanStructure?.maxAmount != null ? formatVNDText(config.loanStructure.maxAmount) : "—"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase block">
                {isUnsecured ? "Phương thức rút vốn" : "Tỷ lệ tài trợ tối đa"}
              </span>
              <span className="text-xl font-extrabold text-[#003B71] mt-1 block">
                {isUnsecured ? "Linh hoạt" : (maxLtvValue != null ? `${maxLtvValue}% giá trị tài sản` : "—")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* SECTION 1: Thông tin chung */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-border/50">
              <SectionHeader title="Thông tin chung" icon={FileText} />
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Mã sản phẩm" value={config.id} />
                <DetailField label="Nhóm sản phẩm" value={config.productGroup} />
                <DetailField label="Đối tượng khách hàng" value={config.customerType} />
                <DetailField label="Loại sản phẩm" value={isUnsecured ? "Vay không tài sản bảo đảm" : "Vay có tài sản bảo đảm"} />
                <DetailField label="Mục đích sử dụng vốn" value={config.purpose} />
                <DetailField 
                  label="Ngày bắt đầu áp dụng" 
                  value={config.effectivePeriod?.startDate} 
                />
                <DetailField 
                  label="Ngày kết thúc áp dụng" 
                  value={config.effectivePeriod?.endDate ?? "Không giới hạn"} 
                />
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide block mb-1">
                    Phân khúc khách hàng
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {config.segments.map((s, idx) => (
                      <span key={idx} className="bg-white border border-[#003B71]/15 text-[#003B71] px-2 py-0.5 rounded-lg text-xs font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide block mb-1">
                    Kênh đăng ký
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {config.effectivePeriod?.channels?.map((c, idx) => (
                      <span key={idx} className="bg-[#F58220]/10 border border-[#F58220]/20 text-[#F58220] px-2 py-0.5 rounded-lg text-xs font-semibold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Cấu trúc khoản vay */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-border/50">
              <SectionHeader title="Cấu trúc khoản vay" icon={Grid} />
              <div className="grid grid-cols-2 gap-4">
                <DetailField 
                  label="Phương thức cấp khoản vay" 
                  value={config.loanStructure?.creditMethods ? (
                    <ul className="list-disc list-inside pl-1 space-y-0.5">
                      {config.loanStructure.creditMethods.map((m, idx) => (
                        <li key={idx} className="text-xs text-navy font-semibold">
                          {m === "TERM_LOAN" ? "Cho vay theo món" : m === "CREDIT_LIMIT" ? "Cho vay theo hạn mức tín dụng" : m === "OVERDRAFT" ? "Cho vay thấu chi" : m}
                        </li>
                      ))}
                    </ul>
                  ) : config.loanStructure?.loanMethodName} 
                />
                <DetailField label="Hình thức bảo đảm" value={config.loanStructure?.securedTypeName} />
                <DetailField 
                  label="Số tiền vay tối thiểu" 
                  value={config.loanStructure?.minAmount != null && config.loanStructure?.minAmount > 0 ? formatVNDText(config.loanStructure.minAmount) : undefined} 
                />
                <DetailField 
                  label="Số tiền vay tối đa" 
                  value={config.loanStructure?.maxAmount != null ? formatVNDText(config.loanStructure.maxAmount) : undefined} 
                />
                <DetailField 
                  label="Kỳ hạn tối thiểu" 
                  value={config.loanStructure?.minTerm != null && config.loanStructure?.minTerm > 0 ? `${config.loanStructure.minTerm} tháng` : undefined} 
                />
                <DetailField 
                  label="Kỳ hạn tối đa" 
                  value={config.loanStructure?.maxTerm != null ? `${config.loanStructure.maxTerm} tháng` : undefined} 
                />
                <DetailField label="Đồng tiền vay" value={config.loanStructure?.currency} />
                <DetailField 
                  label="Tỷ lệ tài trợ tối đa" 
                  value={config.loanStructure?.maxLtv != null ? `${config.loanStructure.maxLtv}%` : undefined} 
                />
                <DetailField label="Phương thức giải ngân" value={config.loanStructure?.disbursementMethod} />
                <DetailField label="Số lần giải ngân" value={config.loanStructure?.disbursementTimes} />
              </div>
            </div>

            {/* SECTION 3: Lãi suất và phí */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-border/50">
              <SectionHeader title="Lãi suất và phí" icon={BarChart3} />
              <div className="grid grid-cols-2 gap-4">
                {isUnsecured ? (
                  <>
                    <DetailField label="Lãi suất" value={config.interestConfig?.displayText || "Theo chính sách SHB từng thời kỳ"} />
                    <DetailField label="Phí" value="Theo biểu phí và chính sách SHB từng thời kỳ" />
                  </>
                ) : (
                  <>
                    <DetailField label="Loại lãi suất" value={config.interestConfig?.rateType} />
                    <DetailField 
                      label="Lãi suất ưu đãi" 
                      value={config.interestConfig?.promoRate != null ? `Từ ${config.interestConfig.promoRate}%/năm` : undefined} 
                    />
                    {config.interestConfig?.promoTermMonths != null && (
                      <DetailField 
                        label="Thời gian ưu đãi" 
                        value={`${config.interestConfig.promoTermMonths} tháng`} 
                      />
                    )}
                    <DetailField label="Lãi suất sau ưu đãi" value={config.interestConfig?.postPromoRateType} />
                    <DetailField 
                      label="Biên độ lãi suất" 
                      value={config.interestConfig?.spread != null ? `${config.interestConfig.spread}%/năm` : undefined} 
                    />
                    <DetailField label="Phương pháp tính lãi" value={config.interestConfig?.interestMethod} />
                    <DetailField label="Phí trả nợ trước hạn" value={config.interestConfig?.prepaymentFeePolicy} />
                  </>
                )}
                
                <div className="col-span-2 text-[10px] text-muted-foreground italic border-t border-border/40 pt-2 mt-1">
                  {isUnsecured 
                    ? "* Lãi suất, phí và điều kiện áp dụng thực tế phụ thuộc chính sách SHB tại từng thời kỳ và kết quả đánh giá hồ sơ."
                    : "* Lãi suất và các khoản phí có thể thay đổi theo chính sách của SHB trong từng thời kỳ."}
                </div>
              </div>
            </div>

            {/* SECTION 4: Phương thức trả nợ */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-border/50">
              <SectionHeader title="Phương thức trả nợ" icon={Settings} />
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Phương thức trả nợ" value={config.repaymentConfig?.method} />
                <DetailField label="Phương thức trả gốc" value={config.repaymentConfig?.principalRepaymentMethod} />
                <DetailField label="Phương thức trả lãi" value={config.repaymentConfig?.interestRepaymentMethod} />
                <DetailField label="Tần suất trả nợ" value={config.repaymentConfig?.frequency} />
                <DetailField 
                  label="Thời gian ân hạn gốc" 
                  value={config.repaymentConfig?.gracePeriodMaxMonths != null 
                    ? (config.repaymentConfig.gracePeriodMaxMonths > 0 ? `Tối đa ${config.repaymentConfig.gracePeriodMaxMonths} tháng` : "Không áp dụng")
                    : undefined
                  } 
                />
                <DetailField 
                  label="Trả nợ trước hạn" 
                  value={config.repaymentConfig?.prepaymentAllowed != null ? (config.repaymentConfig.prepaymentAllowed ? "Có" : "Không") : undefined} 
                />
                <DetailField label="Ngày thu nợ" value={config.repaymentConfig?.collectionDay} />
              </div>
            </div>

            {/* SECTION 4: Đối tượng và điều kiện */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-border/50 md:col-span-2 text-left">
              <SectionHeader title="Đối tượng và điều kiện" icon={AlertTriangle} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-xs font-bold text-[#003B71] mb-2.5 uppercase tracking-wide">
                    A. Điều kiện định lượng
                  </h5>
                  <ul className="space-y-2 text-xs text-[#003B71] font-semibold">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-[#F58220] rounded-full shrink-0" />
                      <span>Độ tuổi tại thời điểm vay: Từ {config.eligibility?.minimumAgeAtApplication ?? 22} tuổi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-[#F58220] rounded-full shrink-0" />
                      <span>Độ tuổi tại thời điểm tất toán: Tối đa {config.eligibility?.maximumAgeAtMaturity ?? 70} tuổi</span>
                    </li>
                    {config.loanStructure?.maxAmount && (
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 bg-[#F58220] rounded-full shrink-0" />
                        <span>Hạn mức yêu cầu: Tối đa {formatVNDText(config.loanStructure.maxAmount)}</span>
                      </li>
                    )}
                    {config.loanStructure?.maxTerm && (
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 bg-[#F58220] rounded-full shrink-0" />
                        <span>Thời hạn yêu cầu: Tối đa {config.loanStructure.maxTerm} tháng</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-[#003B71] mb-2.5 uppercase tracking-wide">
                    B. Điều kiện định tính
                  </h5>
                  <ul className="space-y-2 text-xs text-[#003B71] font-semibold">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-[#F58220] rounded-full shrink-0" />
                      <span>Đối tượng: Cá nhân, hộ gia đình người Việt Nam</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-[#F58220] rounded-full shrink-0" />
                      <span>Thông tin cư trú: Có hộ khẩu hoặc KT3 theo nội dung SHB công bố</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-[#F58220] rounded-full shrink-0" />
                      <span>Thu nhập: {config.eligibility?.stableIncomeRequired ? "Có thu nhập ổn định" : "Theo chính sách SHB từng thời kỳ"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-[#F58220] rounded-full shrink-0" />
                      <span>Lịch sử tín dụng: {config.eligibility?.goodCreditHistoryRequired ? "Có lịch sử tín dụng tốt" : "Theo chính sách SHB từng thời kỳ"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 bg-[#F58220] rounded-full shrink-0" />
                      <span>Khả năng trả nợ: {config.eligibility?.repaymentCapacityProofRequired ? "Chứng minh được khả năng trả nợ" : "Theo chính sách SHB từng thời kỳ"}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 5: Tài sản bảo đảm (Conditionally Rendered) */}
            {product.securedType === "SECURED" && config.collateralConfig && (
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-border/50 md:col-span-2">
                <SectionHeader title="Tài sản bảo đảm" icon={Key} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide block mb-1">
                      Loại tài sản được chấp nhận
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {config.collateralConfig.acceptedTypes?.map((t, idx) => (
                        <span key={idx} className="bg-white border border-border text-navy px-2 py-0.5 rounded-lg text-xs font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <DetailField 
                    label="Tài sản hình thành từ vốn vay" 
                    value={config.collateralConfig.futureAssetAllowed ? "Được chấp nhận" : "Không được chấp nhận"} 
                  />
                  <DetailField 
                    label="Tỷ lệ cho vay trên giá trị tài sản" 
                    value={config.collateralConfig.maxLtv != null ? `Tối đa ${config.collateralConfig.maxLtv}%` : undefined} 
                  />
                  <DetailField 
                    label="Yêu cầu định giá" 
                    value={config.collateralConfig.valuationRequired ? "Bắt buộc" : "Không bắt buộc"} 
                  />
                  <DetailField 
                    label="Yêu cầu bảo hiểm tài sản" 
                    value={config.collateralConfig.insuranceRequired ? "Theo quy định SHB" : "Không bắt buộc"} 
                  />

                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide block mb-1">
                      Chủ sở hữu tài sản bảo đảm
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {config.collateralConfig.owners?.map((o, idx) => (
                        <span key={idx} className="bg-[#003B71]/5 border border-[#003B71]/15 text-[#003B71] px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: Hồ sơ yêu cầu (Accordions) */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-border/50 md:col-span-2 text-left">
              <SectionHeader title="Hồ sơ yêu cầu" icon={List} />
              <div className="space-y-3">
                {config.documentGroups?.map((group, idx) => {
                  const isOpen = !!openDocGroups[idx];
                  return (
                    <div key={idx} className="border border-border/70 rounded-xl overflow-hidden bg-white shadow-xs">
                      <button
                        type="button"
                        onClick={() => toggleGroup(idx)}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 transition font-bold text-navy text-xs tracking-wide uppercase text-left"
                      >
                        <span>{group.title || group.name}</span>
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                      
                      {isOpen && (
                        <div className="p-4 border-t border-border/60 bg-white">
                          <ul className="space-y-2">
                            {group.items && group.items.length > 0 ? (
                              group.items.map((item, itemIdx) => (
                                <li key={itemIdx} className="flex items-start gap-2.5 text-xs text-[#003B71] font-semibold">
                                  <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                                  <span>{item}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs text-muted-foreground italic flex items-start gap-2.5 font-medium">
                                <span className="text-neutral-300 font-bold shrink-0 mt-0.5">•</span>
                                <span>Chưa cấu hình chi tiết giấy tờ</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Footer (fixed) */}
        <div className="p-4 border-t border-border flex justify-end gap-3 bg-secondary/10">
          <Button 
            onClick={onClose} 
            variant="outline"
            className="h-10 rounded-xl px-5 text-[#003B71] font-bold hover:bg-slate-100 transition active:scale-95 border-border/80"
          >
            Đóng
          </Button>
          {onEdit && (
            <Button 
              onClick={() => onEdit(product)} 
              className="bg-[#003B71] hover:bg-[#003B71]/90 text-on-primary font-bold px-6 rounded-xl h-10 transition active:scale-95 shadow-md"
            >
              Chỉnh sửa
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// 8. Component: ActivationConfirmDialog
interface ConfirmProps {
  product: LoanProduct | null;
  onConfirm: (id: string, nextStatus: ProductStatus) => void;
  onClose: () => void;
}
export function ActivationConfirmDialog({ product, onConfirm, onClose }: ConfirmProps) {
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus>("ACTIVE");

  if (!product) return null;

  const handleUpdate = () => {
    onConfirm(product.id, selectedStatus);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border bg-[#F7F9FC] flex justify-between items-center">
          <h3 className="font-extrabold text-[#003B71] text-sm">Cập nhật trạng thái sản phẩm</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4 text-xs">
          <p className="text-[#6B7280]">
            Vui lòng chọn trạng thái mới cho sản phẩm: <strong className="text-navy font-bold">{product.productName}</strong>
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-[#003B71]/5 select-none">
              <input 
                type="radio" 
                name="newStatus" 
                checked={selectedStatus === "ACTIVE"} 
                onChange={() => setSelectedStatus("ACTIVE")}
                className="h-4 w-4 accent-[#F58220]"
              />
              <div>
                <span className="block font-bold text-navy">Kích hoạt hoạt động (ACTIVE)</span>
                <span className="text-[10px] text-[#6B7280]">Sản phẩm sẽ hiển thị cho khách hàng tra cứu sơ bộ.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-[#003B71]/5 select-none">
              <input 
                type="radio" 
                name="newStatus" 
                checked={selectedStatus === "DRAFT"} 
                onChange={() => setSelectedStatus("DRAFT")}
                className="h-4 w-4 accent-[#F58220]"
              />
              <div>
                <span className="block font-bold text-navy">Lưu bản nháp (DRAFT)</span>
                <span className="text-[10px] text-[#6B7280]">Sản phẩm tạm thời đóng để hiệu chỉnh, không hiển thị.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-[#003B71]/5 select-none">
              <input 
                type="radio" 
                name="newStatus" 
                checked={selectedStatus === "SUSPENDED"} 
                onChange={() => setSelectedStatus("SUSPENDED")}
                className="h-4 w-4 accent-[#F58220]"
              />
              <div>
                <span className="block font-bold text-navy">Tạm dừng cung cấp (SUSPENDED)</span>
                <span className="text-[10px] text-[#6B7280]">Dừng tạm thời do điều chỉnh chính sách lãi suất hoặc dừng gói.</span>
              </div>
            </label>
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2 bg-[#F7F9FC]">
          <Button onClick={onClose} variant="outline" size="sm" className="rounded-xl font-bold h-9">Hủy</Button>
          <Button onClick={handleUpdate} className="bg-[#F58220] hover:bg-[#F58220]/95 text-on-primary font-bold rounded-xl h-9 text-xs px-4">Xác nhận</Button>
        </div>
      </div>
    </div>
  );
}

// 9. Component: ProductGroupManagement (Drawer / Modal)
interface GroupMgmtProps {
  groups: LoanProductGroup[];
  products: LoanProduct[];
  isOpen: boolean;
  onClose: () => void;
  onSaveGroup: (group: LoanProductGroup, isNew: boolean) => void;
  onDeleteGroup: (groupId: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}
export function ProductGroupManagement({
  groups,
  products,
  isOpen,
  onClose,
  onSaveGroup,
  onDeleteGroup,
  showToast
}: GroupMgmtProps) {
  const [editingGroup, setEditingGroup] = useState<LoanProductGroup | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconName, setIconName] = useState("Home");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(1);

  if (!isOpen) return null;

  const handleCreateNew = () => {
    setEditingGroup({
      id: "",
      name: "",
      description: "",
      iconName: "Home",
      isActive: true,
      displayOrder: groups.length + 1
    });
    setName("");
    setDescription("");
    setIconName("Home");
    setIsActive(true);
    setDisplayOrder(groups.length + 1);
  };

  const handleSelectGroup = (g: LoanProductGroup) => {
    setEditingGroup(g);
    setName(g.name);
    setDescription(g.description);
    setIconName(g.iconName);
    setIsActive(g.isActive);
    setDisplayOrder(g.displayOrder);
  };

  const handleSave = () => {
    if (!name.trim()) {
      showToast("Tên nhóm sản phẩm không được để trống", "error");
      return;
    }

    const isNew = editingGroup?.id === "";
    const groupId = isNew ? `group-${Math.random().toString(36).substring(2, 9)}` : editingGroup!.id;

    const saved: LoanProductGroup = {
      id: groupId,
      name: name.trim(),
      description: description.trim(),
      iconName,
      isActive,
      displayOrder: Number(displayOrder)
    };

    onSaveGroup(saved, isNew);
    setEditingGroup(null);
    showToast(isNew ? "Đã thêm nhóm sản phẩm mới." : "Đã cập nhật thông tin nhóm sản phẩm.");
  };

  const handleDelete = (groupId: string) => {
    const containingCount = products.filter(p => p.productGroupId === groupId).length;
    if (containingCount > 0) {
      showToast(`Không thể xóa nhóm này vì đang chứa ${containingCount} sản phẩm con.`, "error");
      return;
    }

    onDeleteGroup(groupId);
    setEditingGroup(null);
    showToast("Đã xóa nhóm sản phẩm.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-border w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col h-[85vh]">
        <div className="p-5 border-b border-border flex justify-between items-center bg-[#F7F9FC]">
          <h3 className="font-extrabold text-[#003B71] text-base flex items-center gap-2">
            <Settings size={18} />
            Quản lý các nhóm sản phẩm vay
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/60">
          
          {/* Left panel - groups list */}
          <div className="w-full md:w-5/12 p-5 overflow-y-auto space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-navy uppercase tracking-wider">Danh sách nhóm ({groups.length})</span>
              <Button 
                onClick={handleCreateNew} 
                className="bg-emerald-600 hover:bg-emerald-700 text-on-primary font-bold text-xs h-8 rounded-lg flex items-center gap-1"
              >
                <Plus size={14} /> Thêm nhóm
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              {groups.map(g => {
                const count = products.filter(p => p.productGroupId === g.id).length;
                return (
                  <button 
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectGroup(g)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border flex items-start justify-between hover:bg-secondary/40 transition",
                      editingGroup?.id === g.id ? "bg-[#003B71]/5 border-[#003B71]/30 font-bold" : "border-border/60 bg-[#F7F9FC]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-[#003B71]/5 text-[#003B71] rounded-lg flex items-center justify-center">
                        <GroupIcon name={g.iconName} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-navy leading-normal">{g.name}</span>
                        <span className="text-[10px] text-muted-foreground block">{count} sản phẩm con</span>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full",
                      g.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    )}>
                      {g.isActive ? "Active" : "Disabled"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel - group editor details */}
          <div className="flex-1 p-5 overflow-y-auto bg-[#F7F9FC]/30">
            {editingGroup ? (
              <div className="space-y-4">
                <h4 className="font-extrabold text-[#003B71] text-sm pb-2 border-b border-border/50">
                  {editingGroup.id === "" ? "Tạo nhóm sản phẩm mới" : "Chỉnh sửa thông tin nhóm"}
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#003B71] mb-1">Tên nhóm sản phẩm <span className="text-[#DC2626]">*</span></label>
                    <Input 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nhập tên nhóm sản phẩm"
                      className="rounded-xl border-border bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#003B71] mb-1">Mô tả chi tiết</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Mô tả công dụng và các dòng sản phẩm con..."
                      className="w-full border border-border bg-white rounded-xl p-3 outline-none text-xs focus:ring-1 focus:ring-[#F58220]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#003B71] mb-1">Biểu tượng (Icon)</label>
                      <select 
                        value={iconName}
                        onChange={(e) => setIconName(e.target.value)}
                        className="w-full h-10 border border-border bg-white rounded-xl px-3 outline-none text-xs text-foreground"
                      >
                        <option value="Home">Home (Nhà ở)</option>
                        <option value="Car">Car (Ô tô)</option>
                        <option value="Briefcase">Briefcase (Kinh doanh)</option>
                        <option value="ShoppingBag">ShoppingBag (Tiêu dùng)</option>
                        <option value="GraduationCap">GraduationCap (Học tập)</option>
                        <option value="Key">Key (Cầm cố)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#003B71] mb-1">Thứ tự hiển thị</label>
                      <Input 
                        type="number"
                        value={displayOrder}
                        onChange={(e) => setDisplayOrder(Number(e.target.value))}
                        className="rounded-xl border-border bg-white text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 font-bold text-[#003B71] cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 accent-[#F58220]"
                      />
                      <span>Kích hoạt nhóm sản phẩm này</span>
                    </label>
                  </div>
                </div>

                <div className="pt-5 flex justify-between gap-2 border-t border-border/50">
                  {editingGroup.id !== "" && (
                    <Button 
                      onClick={() => handleDelete(editingGroup.id)}
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold rounded-xl h-10 text-xs px-4"
                    >
                      <Trash size={14} className="mr-1" />
                      Xóa nhóm
                    </Button>
                  )}
                  
                  <div className="flex gap-2 ml-auto">
                    <Button 
                      onClick={() => setEditingGroup(null)}
                      variant="outline" 
                      className="rounded-xl font-bold h-10 text-xs px-4"
                    >
                      Hủy
                    </Button>
                    <Button 
                      onClick={handleSave}
                      className="bg-[#F58220] hover:bg-[#F58220]/95 text-on-primary font-bold rounded-xl h-10 text-xs px-5"
                    >
                      <Check size={14} className="mr-1" />
                      Lưu lại
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center text-muted-foreground p-12">
                <AlertTriangle className="h-10 w-10 text-[#003B71]/30 mb-3" />
                <p className="text-xs">Chọn một nhóm bên trái để chỉnh sửa thông tin hoặc bấm &quot;Thêm nhóm&quot; để tạo mới.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end bg-secondary/15">
          <Button onClick={onClose} className="bg-navy text-on-primary font-bold px-6 hover:opacity-95 rounded-xl h-10">
            Hoàn tất
          </Button>
        </div>
      </div>
    </div>
  );
}
