"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { BrandMark } from "@/components/client/brand-mark";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, live: true },
  { href: "/admin", label: "Hồ sơ tín dụng", icon: FileCheck2, live: false },
  { href: "/admin", label: "Quản lý agent", icon: Bot, live: false },
  { href: "/admin/approvals", label: "Người phê duyệt", icon: Users, live: true },
  { href: "/admin", label: "Cấu hình", icon: Settings, live: false },
] as const;

function NavItems({
  activeHref,
  onNavigate,
}: {
  activeHref: "/admin" | "/admin/approvals";
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1.5" aria-label="Admin">
      {nav.map(({ href, label, icon: Icon, live }) => {
        const active = live && href === activeHref;
        if (!live) {
          return (
            <span
              key={label}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-on-primary/35"
              title="Chưa có trong slice demo"
            >
              <Icon size={18} className="shrink-0 opacity-70" />
              <span className="flex-1">{label}</span>
              <span className="rounded-md bg-on-primary/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-primary/45">
                Sắp có
              </span>
            </span>
          );
        }
        return (
          <Link
            key={label}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition",
              active
                ? "bg-brand/20 font-semibold text-on-primary shadow-sm ring-1 ring-brand/30"
                : "text-on-primary/70 hover:bg-on-primary/8 hover:text-on-primary",
            )}
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto space-y-1 border-t border-on-primary/12 pt-5">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-on-primary/40"
        disabled
        title="Chưa có trong slice demo"
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
  activeHref: "/admin" | "/admin/approvals";
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="min-h-screen bg-secondary text-foreground lg:flex">
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
          <div className="mt-10 min-h-0 flex-1 overflow-hidden">
            <NavItems activeHref={activeHref} />
          </div>
          <SidebarFooter />
        </div>
      </aside>

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
              <div className="min-h-0 flex-1 overflow-hidden">
                <NavItems activeHref={activeHref} onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarFooter />
            </div>
          </aside>
        </div>
      )}

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
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-primary shadow-brand"
              title="Admin demo"
            >
              AD
            </div>
          </div>
        </header>
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </main>
  );
}
