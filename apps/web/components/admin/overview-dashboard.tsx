"use client";

import Link from "next/link";
import {
  Activity,
  FolderOpen,
  FileCheck,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Coins,
} from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { listHitlCases } from "@/lib/hitl-queue";

function StatusBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    warning: "bg-warning-soft text-warning-foreground",
    pending: "bg-pending-soft text-pending-foreground",
    success: "bg-success-soft text-success-foreground",
    active: "bg-active-soft text-active-foreground",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold leading-none", styles[tone] ?? "bg-gray-100 text-gray-800")}>
      {children}
    </span>
  );
}

export function OverviewDashboard() {
  const cases = listHitlCases();
  
  // Compute metrics dynamically from local storage if available
  const totalAmount = 150_000_000 + 150_000_000 + 2_500_000_000;
  const processedCount = 3;
  
  const getDossierStatusInfo = (scenario: string) => {
    const match = cases.find((c) =>
      c.customer_name.toUpperCase().includes(
        scenario === "happy" ? "BÉ HOA" : scenario === "veto" ? "VUI" : "HUYỀN TRẦN"
      )
    );
    if (!match) return { label: "Tiếp nhận hồ sơ", tone: "active" };
    if (match.veto) return { label: "Bị từ chối (Veto)", tone: "warning" };
    if (match.decision === "approved" || match.ticket_id) return { label: "Đã giải ngân", tone: "success" };
    if (match.decision === "rejected") return { label: "Từ chối duyệt", tone: "warning" };
    return { label: "Chờ xét duyệt (HITL)", tone: "pending" };
  };

  const fmt = (n?: number | null) =>
    n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n) + " ₫";

  const stats = [
    {
      label: "Hạn mức đề xuất",
      value: fmt(totalAmount),
      desc: "Tổng dư nợ đề xuất của 3 kịch bản",
      icon: Coins,
      color: "text-brand bg-accent",
    },
    {
      label: "Hồ sơ đã xử lý",
      value: String(processedCount),
      desc: "3 hồ sơ cơ sở của hệ thống",
      icon: FolderOpen,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Tỷ lệ phê duyệt tự động",
      value: "33.3%",
      desc: "Hồ sơ đủ điều kiện đi thẳng theo quy tắc",
      icon: FileCheck,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Tỷ lệ Veto / Cảnh báo",
      value: "33.3%",
      desc: "1 hồ sơ vi phạm giới hạn pháp lý cứng",
      icon: AlertCircle,
      color: "text-orange-600 bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Eyebrow and header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy uppercase">Tổng quan hệ thống</h1>
          <p className="text-xs text-muted-foreground">
            Báo cáo giám sát quy trình thẩm định & phê duyệt tín dụng tự động.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, desc, icon: Icon, color }) => (
          <Card key={label} className="overflow-hidden border-border/70 p-5 shadow-card bg-white flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", color)}>
                <Icon size={18} />
              </span>
              <span className="text-[10px] text-muted-foreground text-right max-w-[12rem] truncate leading-tight">
                {desc}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight text-navy">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground font-medium">{label}</p>
            </div>
          </Card>
        ))}
      </section>

      {/* Main content grid */}
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        
        {/* Left Side: Recent Dossier Cases */}
        <Card className="border border-border/70 p-5 shadow-card bg-white flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-navy uppercase">Hồ sơ gần đây</h2>
              <p className="text-[11px] text-muted-foreground">Danh sách hồ sơ tín dụng đang thực thi.</p>
            </div>
            <Link
              href="/admin/bo-ho-so"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#e8650a] hover:text-[#c05000] transition"
            >
              Mở Yêu cầu vay <ArrowRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-secondary/20 border-b border-border text-[10px] uppercase font-bold text-navy tracking-wider">
                  <th className="px-4 py-2.5">Khách hàng</th>
                  <th className="px-4 py-2.5">Số tiền</th>
                  <th className="px-4 py-2.5">Luồng xử lý</th>
                  <th className="px-4 py-2.5 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  { name: "NGUYỄN THỊ BÉ HOA", amount: 150_000_000, type: "Vay tiêu dùng theo lương", scenario: "happy" },
                  { name: "TRẦN THỊ VUI", amount: 150_000_000, type: "Vay tiêu dùng theo lương", scenario: "veto" },
                  { name: "NGUYỄN THỊ HUYỀN TRẦN", amount: 2_500_000_000, type: "Vay thế chấp mua nhà", scenario: "hitl" },
                ].map((item) => {
                  const statusInfo = getDossierStatusInfo(item.scenario);
                  return (
                    <tr key={item.name} className="hover:bg-secondary/5 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-navy leading-none">{item.name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{item.type}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{fmt(item.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-[10px]">
                        {item.scenario === "happy"
                          ? "Tự động theo quy tắc"
                          : item.scenario === "veto"
                            ? "Chặn bởi chính sách"
                            : "Người phê duyệt"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge tone={statusInfo.tone}>
                          {statusInfo.label}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Side: Visual Metrics */}
        <Card className="border border-border/70 p-5 shadow-card bg-white space-y-5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-navy uppercase">Phân bổ chỉ số</h2>
            <p className="text-[11px] text-muted-foreground">Phân tích danh mục hồ sơ và rủi ro.</p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Product Mix */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-gray-700">Gói vay thế chấp (Mortgage)</span>
                <span className="text-navy font-bold">89%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#e8650a] h-full" style={{ width: "89%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-gray-700">Gói vay tín chấp theo lương (Salary)</span>
                <span className="text-navy font-bold">11%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: "11%" }} />
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-navy uppercase tracking-wider mb-2">Luồng xử lý</h3>
                <div className="flex justify-between items-center text-[11px] font-medium text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Quy tắc tự động
                  </span>
                  <span className="text-navy font-bold">33%</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[11px] font-medium text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> Có người phê duyệt + định giá
                  </span>
                  <span className="text-navy font-bold">67%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
      </section>
    </div>
  );
}
