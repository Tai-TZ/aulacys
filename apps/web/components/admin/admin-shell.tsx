import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, live: true },
  { href: "/admin", label: "Hồ sơ tín dụng", icon: FileCheck2, live: false },
  { href: "/admin", label: "Quản lý agent", icon: Bot, live: false },
  { href: "/admin/approvals", label: "Người phê duyệt", icon: Users, live: true },
  { href: "/admin", label: "Cấu hình", icon: Settings, live: false },
] as const;

export function AdminShell({
  title,
  eyebrow,
  activeHref,
  children,
}: {
  title: string;
  eyebrow: string;
  activeHref: "/admin" | "/admin/approvals";
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-secondary text-foreground lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-screen flex-col bg-navy px-5 py-7 text-on-primary lg:flex">
        <Image src="/shb/logo.svg" alt="SHB" width={91} height={43} className="brightness-0 invert" priority />
        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-on-primary/50">Digital Expert Admin</p>
        <nav className="mt-12 space-y-2">
          {nav.map(({ href, label, icon: Icon, live }) => {
            const active = live && href === activeHref;
            if (!live) {
              return (
                <span
                  key={label}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-primary/40"
                  title="Chưa có trong slice demo"
                >
                  <Icon size={19} />
                  <span className="flex-1">{label}</span>
                  <span className="rounded-full bg-on-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Sắp có
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm",
                  active
                    ? "bg-on-primary/10 font-semibold text-on-primary"
                    : "text-on-primary/65 hover:bg-on-primary/10 hover:text-on-primary",
                )}
              >
                <Icon size={19} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-on-primary/15 pt-5">
          <Link href="/client" className="flex items-center gap-3 px-4 py-3 text-sm text-on-primary/65 hover:text-on-primary">
            <ArrowRight size={18} /> Mở trang khách hàng
          </Link>
          <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-sm text-on-primary/65 hover:text-on-primary" disabled>
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
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>
              <h1 className="text-xl font-semibold text-navy">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
              <Input aria-label="Tìm kiếm hồ sơ" placeholder="Tìm kiếm hồ sơ..." className="w-64 pl-9" disabled />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-on-primary">AD</div>
          </div>
        </header>
        <div className="p-5 lg:p-8">{children}</div>
      </div>
    </main>
  );
}
