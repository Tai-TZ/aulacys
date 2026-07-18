"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  X,
  Coins,
  FolderOpen,
  GitBranch,
  Activity,
  ChevronDown,
  ChevronRight,
  Shield
} from "lucide-react";
import { BrandMark } from "@/components/client/brand-mark";
import { Button, Input } from "@/components/ui";
import {
  adminInitials,
  clearAdminSession,
  readAdminSession,
  type AdminSession,
} from "@/lib/admin-session";
import { cn } from "@/lib/cn";

export type AdminActiveHref = "/admin" | "/admin/approvals" | "/admin/san-pham/ca-nhan" | "/admin/bo-ho-so";

function NavItems({
  activeHref,
  onNavigate,
}: {
  activeHref: AdminActiveHref;
  onNavigate?: () => void;
}) {
  const [productMenuOpen, setProductMenuOpen] = useState(true);

  return (
    <nav className="space-y-1.5" aria-label="Admin">
      {/* 1. Tổng quan */}
      <Link
        href="/admin"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition",
          activeHref === "/admin"
            ? "bg-[#F58220]/20 font-semibold text-[#F58220] shadow-sm ring-1 ring-[#F58220]/30"
            : "text-on-primary/70 hover:bg-on-primary/8 hover:text-on-primary",
        )}
      >
        <LayoutDashboard size={18} className="shrink-0" />
        <span>Tổng quan</span>
      </Link>

      {/* 2. Sản phẩm vay (Dropdown/Collapsible) */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setProductMenuOpen(!productMenuOpen)}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm text-on-primary/70 transition hover:bg-on-primary/8 hover:text-on-primary"
        >
          <div className="flex items-center gap-3">
            <Coins size={18} className="shrink-0" />
            <span>Sản phẩm vay</span>
          </div>
          {productMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {productMenuOpen && (
          <div className="pl-9 space-y-1">
            {/* Khách hàng cá nhân */}
            <Link
              href="/admin/san-pham/ca-nhan"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition",
                activeHref === "/admin/san-pham/ca-nhan"
                  ? "bg-[#F58220]/20 font-bold text-[#F58220] ring-1 ring-[#F58220]/30"
                  : "text-on-primary/60 hover:bg-on-primary/5 hover:text-on-primary",
              )}
            >
              <span>Khách hàng cá nhân</span>
            </Link>

            {/* Khách hàng doanh nghiệp */}
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-on-primary/35 cursor-not-allowed"
              title="Khách hàng doanh nghiệp - Sắp triển khai"
            >
              <span>Khách hàng doanh nghiệp</span>
              <span className="rounded-md bg-on-primary/8 px-1 py-0.5 text-[9px] font-semibold text-on-primary/45 whitespace-nowrap">
                Sắp triển khai
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bộ hồ sơ */}
      <Link
        href="/admin/bo-ho-so"
        onClick={onNavigate}
        className={cn(
          "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition",
          activeHref === "/admin/bo-ho-so"
            ? "bg-[#F58220]/20 font-bold text-[#F58220] ring-1 ring-[#F58220]/30"
            : "text-on-primary/70 hover:bg-on-primary/8 hover:text-on-primary",
        )}
      >
        <div className="flex items-center gap-3">
          <FolderOpen size={18} className="shrink-0" />
          <span>Bộ hồ sơ</span>
        </div>
      </Link>

      {/* 4. Quy trình xử lý */}
      <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm text-on-primary/35 cursor-not-allowed">
        <div className="flex items-center gap-3">
          <GitBranch size={18} className="shrink-0 opacity-70" />
          <span>Quy trình xử lý</span>
        </div>
        <span className="rounded-md bg-on-primary/8 px-1.5 py-0.5 text-[9px] font-semibold text-on-primary/45">
          Sắp có
        </span>
      </div>

      {/* 5. Quản lý Agent */}
      <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm text-on-primary/35 cursor-not-allowed">
        <div className="flex items-center gap-3">
          <Bot size={18} className="shrink-0 opacity-70" />
          <span>Quản lý Agent</span>
        </div>
        <span className="rounded-md bg-on-primary/8 px-1.5 py-0.5 text-[9px] font-semibold text-on-primary/45">
          Sắp có
        </span>
      </div>

      {/* 6. Người dùng và phân quyền */}
      <Link
        href="/admin/approvals"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition",
          activeHref === "/admin/approvals"
            ? "bg-[#F58220]/20 font-semibold text-[#F58220] shadow-sm ring-1 ring-[#F58220]/30"
            : "text-on-primary/70 hover:bg-on-primary/8 hover:text-on-primary",
        )}
      >
        <Users size={18} className="shrink-0" />
        <span>Người dùng &amp; phân quyền</span>
      </Link>

      {/* 7. Nhật ký hệ thống */}
      <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm text-on-primary/35 cursor-not-allowed">
        <div className="flex items-center gap-3">
          <Activity size={18} className="shrink-0 opacity-70" />
          <span>Nhật ký hệ thống</span>
        </div>
        <span className="rounded-md bg-on-primary/8 px-1.5 py-0.5 text-[9px] font-semibold text-on-primary/45">
          Sắp có
        </span>
      </div>
    </nav>
  );
}

function SidebarFooter({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="mt-auto space-y-1 border-t border-on-primary/12 pt-5">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-on-primary/70 transition hover:bg-on-primary/8 hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={onLogout}
      >
        <LogOut size={18} /> Đăng xuất
      </button>
    </div>
  );
}

export function AdminShell({
  title,
  eyebrow,
  activeHref,
  children,
}: {
  title: string;
  eyebrow: string;
  activeHref: AdminActiveHref;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);

  useEffect(() => {
    const next = readAdminSession();
    setSession(next);
    if (!next) router.replace("/admin/login");
  }, [router]);

  function handleLogout() {
    clearAdminSession();
    setSession(null);
    router.replace("/admin/login");
  }

  if (session === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary text-muted-foreground">
        <p className="text-sm">Đang tải console…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary text-muted-foreground">
        <p className="text-sm">Chuyển tới đăng nhập…</p>
      </main>
    );
  }

  const initials = adminInitials(session);

  return (
    <main className="min-h-screen bg-secondary text-foreground lg:flex">
      {/* Desktop Sidebar */}
      <aside className="relative hidden h-screen w-[260px] shrink-0 flex-col overflow-hidden overscroll-none bg-navy-deep px-5 py-7 text-on-primary lg:sticky lg:top-0 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{ backgroundImage: "var(--gradient-hero)" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-16 top-24 h-48 w-48 rounded-full bg-brand/15 blur-3xl" aria-hidden />
        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden">
          <div className="shrink-0">
            <BrandMark href="/admin" variant="light" size="lg" />
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-on-primary/45">
              Digital Expert Admin
            </p>
          </div>
          <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
            <NavItems activeHref={activeHref} />
          </div>
          <SidebarFooter onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy-deep/50"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full max-h-dvh w-[min(20rem,88vw)] flex-col overflow-hidden overscroll-none bg-navy-deep px-5 py-6 text-on-primary shadow-elevated">
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{ backgroundImage: "var(--gradient-hero)" }}
              aria-hidden
            />
            <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden">
              <div className="mb-8 flex shrink-0 items-start justify-between gap-3">
                <div>
                  <BrandMark href="/admin" variant="light" size="md" />
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-on-primary/45">
                    Digital Expert Admin
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-on-primary hover:bg-on-primary/10"
                  aria-label="Đóng menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavItems activeHref={activeHref} onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarFooter onLogout={handleLogout} />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative min-w-0 flex-1">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-accent/80 to-transparent"
          aria-hidden
        />
        <header className="relative z-10 flex h-16 items-center justify-between border-b border-border/80 bg-card/80 px-4 backdrop-blur-md sm:h-20 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Mở menu quản trị"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
              <h1 className="truncate text-lg font-semibold tracking-tight text-navy sm:text-xl">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                aria-label="Tìm kiếm hồ sơ"
                placeholder="Tìm kiếm hồ sơ…"
                className="w-56 border-border/80 bg-secondary/60 pl-9"
                disabled
              />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-navy">{session.name}</p>
              <p className="text-xs text-muted-foreground">{session.email}</p>
            </div>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-primary shadow-brand"
              title={session.email}
            >
              {initials}
            </div>
          </div>
        </header>
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </main>
  );
}
