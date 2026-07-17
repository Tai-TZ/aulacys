import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Button, Card, Input } from "@/components/ui";

const stats = [
  { label: "Hồ sơ đang xử lý", value: "12", change: "+3 hôm nay", icon: Activity },
  { label: "Chờ phê duyệt", value: "04", change: "Cần hành động", icon: Clock3 },
  { label: "Đã hoàn tất", value: "28", change: "Trong tháng", icon: CheckCircle2 },
  { label: "Cảnh báo tuân thủ", value: "02", change: "Đã phủ quyết", icon: ShieldAlert },
];

const cases = [
  { id: "HS-2026-042", company: "Công ty ABC", amount: "20 tỷ VND", stage: "Compliance phủ quyết", tone: "warning" },
  { id: "HS-2026-041", company: "Công ty Minh Phát", amount: "12 tỷ VND", stage: "Chờ người phê duyệt", tone: "pending" },
  { id: "HS-2026-040", company: "Công ty Đông Á", amount: "8,5 tỷ VND", stage: "Đã tạo ticket", tone: "success" },
  { id: "HS-2026-039", company: "Công ty Nam Việt", amount: "15 tỷ VND", stage: "Credit đang xử lý", tone: "active" },
];

const agents = [
  { name: "Planner", detail: "Điều phối 3 nhiệm vụ", status: "Đang chạy" },
  { name: "Credit Expert", detail: "Định lượng DSCR, LTV", status: "Hoàn tất" },
  { name: "Compliance Expert", detail: "Kiểm tra policy v2026.07", status: "Cảnh báo" },
  { name: "Critic", detail: "Chờ kế hoạch điều chỉnh", status: "Đang chờ" },
];

function StatusBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    warning: "bg-warning-soft text-warning-foreground",
    pending: "bg-pending-soft text-pending-foreground",
    success: "bg-success-soft text-success-foreground",
    active: "bg-active-soft text-active-foreground",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone]}`}>{children}</span>;
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-secondary text-foreground lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-screen flex-col bg-navy px-5 py-7 text-on-primary lg:flex">
        <Image src="/shb/logo.svg" alt="SHB" width={91} height={43} className="brightness-0 invert" priority />
        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-on-primary/50">Digital Expert Admin</p>
        <nav className="mt-12 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 rounded-xl bg-on-primary/10 px-4 py-3 text-sm font-semibold"><LayoutDashboard size={19}/> Tổng quan</Link>
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-primary/65 hover:bg-on-primary/10 hover:text-on-primary"><FileCheck2 size={19}/> Hồ sơ tín dụng</Link>
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-primary/65 hover:bg-on-primary/10 hover:text-on-primary"><Bot size={19}/> Quản lý agent</Link>
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-primary/65 hover:bg-on-primary/10 hover:text-on-primary"><Users size={19}/> Người phê duyệt</Link>
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-primary/65 hover:bg-on-primary/10 hover:text-on-primary"><Settings size={19}/> Cấu hình</Link>
        </nav>
        <div className="mt-auto border-t border-on-primary/15 pt-5">
          <Link href="/client" className="flex items-center gap-3 px-4 py-3 text-sm text-on-primary/65 hover:text-on-primary"><ArrowRight size={18}/> Mở trang khách hàng</Link>
          <button className="flex w-full items-center gap-3 px-4 py-3 text-sm text-on-primary/65 hover:text-on-primary"><LogOut size={18}/> Đăng xuất</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex h-20 items-center justify-between border-b border-border bg-card px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu quản trị"><Menu/></Button>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-brand">Trung tâm vận hành</p><h1 className="text-xl font-semibold text-navy">Tổng quan hệ thống</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17}/><Input aria-label="Tìm kiếm hồ sơ" placeholder="Tìm kiếm hồ sơ..." className="w-64 pl-9"/></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-on-primary">AD</div>
          </div>
        </header>

        <div className="space-y-7 p-5 lg:p-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, change, icon: Icon }) => (
              <Card key={label} className="border-0 p-5 shadow-sm">
                <div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-active-soft text-brand"><Icon size={20}/></span><span className="text-xs text-muted-foreground">{change}</span></div>
                <p className="mt-5 text-3xl font-semibold text-navy">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </Card>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="font-semibold text-navy">Hồ sơ gần đây</h2><p className="mt-1 text-sm text-muted-foreground">Theo dõi luồng xử lý và điểm cần can thiệp</p></div><Button variant="outline" size="sm">Xem tất cả</Button></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Mã hồ sơ</th><th className="px-5 py-3 font-medium">Doanh nghiệp</th><th className="px-5 py-3 font-medium">Giá trị</th><th className="px-5 py-3 font-medium">Trạng thái</th><th className="px-5 py-3"></th></tr></thead>
                  <tbody>{cases.map((item) => <tr key={item.id} className="border-t border-border"><td className="px-5 py-4 font-semibold text-navy">{item.id}</td><td className="px-5 py-4">{item.company}</td><td className="px-5 py-4">{item.amount}</td><td className="px-5 py-4"><StatusBadge tone={item.tone}>{item.stage}</StatusBadge></td><td className="px-5 py-4"><Button variant="ghost" size="icon" aria-label={`Mở ${item.id}`}><ArrowRight size={17}/></Button></td></tr>)}</tbody>
                </table>
              </div>
            </Card>

            <Card className="border-0 p-5 shadow-sm">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold text-navy">Hoạt động agent</h2><p className="mt-1 text-sm text-muted-foreground">Hồ sơ HS-2026-042</p></div><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-success-foreground"/></div>
              <div className="mt-6 space-y-5">
                {agents.map((agent, index) => <div key={agent.name} className="relative flex gap-4"><div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-brand"><Bot size={17}/></div>{index < agents.length - 1 && <span className="absolute left-[17px] top-9 h-8 w-px bg-border"/>}<div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-navy">{agent.name}</p><span className="text-xs text-muted-foreground">{agent.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{agent.detail}</p></div></div>)}
              </div>
              <Button className="mt-7 w-full">Mở audit trace <ArrowRight size={17}/></Button>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
