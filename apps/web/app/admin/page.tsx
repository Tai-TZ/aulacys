import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Bot,
  Users,
} from "lucide-react";
import { AssessDashboard } from "@/components/admin/assess-dashboard";
import { Button, Input } from "@/components/ui";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-secondary text-foreground lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-screen flex-col bg-navy px-5 py-7 text-on-primary lg:flex">
        <Image src="/shb/logo.svg" alt="SHB" width={91} height={43} className="brightness-0 invert" priority />
        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-on-primary/50">Digital Expert Admin</p>
        <nav className="mt-12 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 rounded-xl bg-on-primary/10 px-4 py-3 text-sm font-semibold">
            <LayoutDashboard size={19} /> Tổng quan
          </Link>
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-primary/65 hover:bg-on-primary/10 hover:text-on-primary">
            <FileCheck2 size={19} /> Hồ sơ tín dụng
          </Link>
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-primary/65 hover:bg-on-primary/10 hover:text-on-primary">
            <Bot size={19} /> Quản lý agent
          </Link>
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-primary/65 hover:bg-on-primary/10 hover:text-on-primary">
            <Users size={19} /> Người phê duyệt
          </Link>
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-primary/65 hover:bg-on-primary/10 hover:text-on-primary">
            <Settings size={19} /> Cấu hình
          </Link>
        </nav>
        <div className="mt-auto border-t border-on-primary/15 pt-5">
          <Link href="/client" className="flex items-center gap-3 px-4 py-3 text-sm text-on-primary/65 hover:text-on-primary">
            <ArrowRight size={18} /> Mở trang khách hàng
          </Link>
          <button className="flex w-full items-center gap-3 px-4 py-3 text-sm text-on-primary/65 hover:text-on-primary">
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex h-20 items-center justify-between border-b border-border bg-card px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu quản trị">
              <Menu />
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Monitor · wow flow</p>
              <h1 className="text-xl font-semibold text-navy">Thẩm định bán lẻ live</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
              <Input aria-label="Tìm kiếm hồ sơ" placeholder="Tìm kiếm hồ sơ..." className="w-64 pl-9" />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-on-primary">
              AD
            </div>
          </div>
        </header>

        <div className="p-5 lg:p-8">
          <AssessDashboard />
        </div>
      </div>
    </main>
  );
}
