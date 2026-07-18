"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Users,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/client/brand-mark";
import { Button } from "@/components/ui";
import {
  adminInitials,
  clearAdminSession,
  readAdminSession,
  type AdminSession,
} from "@/lib/admin-session";
import { cn } from "@/lib/cn";

export type AdminActiveHref =
  | "/admin"
  | "/admin/bo-ho-so"
  | "/admin/approvals"
  | "/admin/san-pham/ca-nhan";

const nav = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/bo-ho-so", label: "Yêu cầu vay", icon: FolderOpen },
  { href: "/admin/san-pham/ca-nhan", label: "Sản phẩm vay", icon: Package },
  { href: "/admin/approvals", label: "Người dùng & phân quyền", icon: Users },
] as const;

function NavItems({
  activeHref,
  onNavigate,
}: {
  activeHref: AdminActiveHref;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1.5" aria-label="Admin">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition",
              active
                ? "bg-brand/20 font-semibold text-brand shadow-sm ring-1 ring-brand/30"
                : "text-on-primary/70 hover:bg-on-primary/8 hover:text-on-primary",
            )}
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
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
        <div className="relative z-10 p-2 sm:p-4 lg:p-6">{children}</div>
      </div>
    </main>
  );
}
