"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/client/brand-mark";
import { Button, Input } from "@/components/ui";
import {
  ADMIN_DEMO,
  readAdminSession,
  verifyAdminLogin,
  writeAdminSession,
} from "@/lib/admin-session";

export function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(ADMIN_DEMO.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (readAdminSession()) {
      router.replace("/admin");
      return;
    }
    setChecking(false);
  }, [router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    // Tiny delay so the demo feels like a real check
    await new Promise((r) => setTimeout(r, 350));
    const session = verifyAdminLogin(email, password);
    setLoading(false);
    if (!session) {
      setError("Email hoặc mật khẩu không đúng. Dùng tài khoản demo bên dưới.");
      return;
    }
    writeAdminSession(session);
    router.replace("/admin");
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-deep text-on-primary">
        <p className="text-sm text-on-primary/60">Đang kiểm tra phiên…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy-deep text-on-primary lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14 xl:px-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-95"
          style={{ backgroundImage: "var(--gradient-hero)" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-16 top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl" aria-hidden />

        <div className="relative z-10 animate-fade-in">
          <BrandMark href={null} variant="light" size="lg" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-primary/45">
            Digital Expert Admin
          </p>
        </div>

        <div className="relative z-10 max-w-md animate-fade-up animate-delay-1">
          <h1 className="text-3xl font-extrabold tracking-tight xl:text-4xl">
            Cổng quản trị thẩm định
          </h1>
          <p className="mt-4 text-base leading-relaxed text-on-primary/70">
            Đăng nhập để theo dõi graph agent, veto compliance và phê duyệt HITL.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-on-primary/65">
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-brand" size={18} />
              Monitor lane · replan · compliance veto
            </li>
            <li className="flex items-start gap-3">
              <Lock className="mt-0.5 shrink-0 text-brand" size={18} />
              Phiên demo lưu local — không gọi auth backend
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-on-primary/35">Aulacys · hackathon demo</p>
      </section>

      <section className="relative flex min-h-screen flex-col justify-center bg-secondary px-5 py-10 sm:px-8 lg:px-14">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-accent/70 to-transparent"
          aria-hidden
        />

        <div className="relative z-10 mx-auto w-full max-w-md animate-fade-up">
          <div className="mb-8 lg:hidden">
            <BrandMark href={null} variant="navy" size="lg" />
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              Digital Expert Admin
            </p>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-navy">Đăng nhập</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Dành cho cán bộ tín dụng / phê duyệt trên console Aulacys.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-navy">Email</span>
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aulacys.demo"
                required
                aria-invalid={Boolean(error)}
              />
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-navy">Mật khẩu</span>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-11"
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-warning-foreground"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? "Đang xác thực…" : "Vào console"}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-sm">
            <p className="font-medium text-navy">Tài khoản demo</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {ADMIN_DEMO.email} · {ADMIN_DEMO.password}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
