"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { BrandMark } from "@/components/client/brand-mark";
import { writeDemoSession } from "@/lib/demo-session";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";

type Mode = "login" | "register";

export function AuthPage({ mode }: { mode: Mode }) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const isLogin = mode === "login";
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name =
      (fd.get("fullName") as string)?.trim() ||
      (fd.get("email") as string)?.split("@")[0] ||
      "Khách hàng";
    const email = ((fd.get("email") as string) || "").trim() || "user@aulacys.com";
    writeDemoSession({ name, email });
    setDone(true);
    window.setTimeout(() => router.push("/workspace"), 600);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col bg-background px-6 py-8 sm:px-10 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between">
          <BrandMark size="lg" />
          <div className="flex items-center gap-3 text-xs font-medium" role="group" aria-label="Language">
            <button
              type="button"
              onClick={() => setLocale("vi")}
              className={cn(
                "transition-colors",
                locale === "vi" ? "font-semibold text-navy" : "text-muted-foreground hover:text-navy",
              )}
              aria-pressed={locale === "vi"}
            >
              VN
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={cn(
                "transition-colors",
                locale === "en" ? "font-semibold text-navy" : "text-muted-foreground hover:text-navy",
              )}
              aria-pressed={locale === "en"}
            >
              EN
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-4xl">
            {isLogin ? t.auth.loginHeadline : t.auth.registerHeadline}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            {isLogin ? t.auth.loginSubtitle : t.auth.registerSubtitle}
          </p>

          {done ? (
            <div className="mt-10 space-y-4">
              <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success-foreground">
                {isLogin ? t.auth.successLogin : t.auth.successRegister}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/workspace">
                  <Button className="h-12 bg-brand px-6 font-semibold text-on-primary hover:bg-brand-hover">
                    {t.workspace.goWorkspace}
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="h-12 border-navy text-navy">
                    {t.auth.backHome}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 space-y-5">
              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-navy">
                      {t.auth.fullName}
                    </label>
                    <Input
                      id="fullName"
                      name="fullName"
                      required
                      autoComplete="name"
                      placeholder={t.auth.namePlaceholder}
                      className="h-12 rounded-xl border-border bg-card"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-2 block text-sm font-medium text-navy">
                      {t.auth.phone}
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder={t.auth.phonePlaceholder}
                      className="h-12 rounded-xl border-border bg-card"
                    />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-navy">
                  {t.auth.email}
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t.auth.emailPlaceholder}
                  className="h-12 rounded-xl border-border bg-card"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-navy">
                  {t.auth.password}
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder={t.auth.passwordPlaceholder}
                  className="h-12 rounded-xl border-border bg-card"
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-brand text-base font-semibold text-on-primary shadow-brand hover:bg-brand-hover"
              >
                {isLogin ? t.auth.submitLogin : t.auth.submitRegister}
              </Button>

              <p className="text-center text-xs text-muted-foreground">{t.auth.demoNote}</p>
            </form>
          )}

          {!done && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {isLogin ? t.auth.noAccount : t.auth.hasAccount}{" "}
              <Link
                href={isLogin ? "/dang-ky" : "/dang-nhap"}
                className="font-bold text-navy hover:text-brand"
              >
                {isLogin ? t.auth.registerTitle : t.auth.loginTitle}
              </Link>
            </p>
          )}

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 self-start text-sm font-medium text-muted-foreground transition hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.auth.backHome}
          </Link>
        </div>
      </div>

      {/* Visual panel — brand vibe, no SSO */}
      <aside className="relative hidden overflow-hidden bg-navy lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-deep to-navy" />
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-cream/10 blur-2xl" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-on-primary/15 bg-on-primary/10 px-3 py-1 text-xs font-semibold text-brand-soft backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t.auth.panelBadge}
          </div>

          <div className="relative mx-auto flex w-full max-w-md flex-col items-center py-16">
            <BrandMark href={null} variant="light" size="hero" />
            <div className="brand-underline mt-4 h-1 w-16 rounded-full bg-brand" />

            <div className="mt-12 grid w-full gap-3">
              <div className="rounded-2xl border border-on-primary/15 bg-on-primary/10 p-4 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-on-primary">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-on-primary">{t.auth.panelCard1Title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-on-primary/70">
                      {t.auth.panelCard1Text}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-on-primary/15 bg-on-primary/10 p-4 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-brand">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-on-primary">{t.auth.panelCard2Title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-on-primary/70">
                      {t.auth.panelCard2Text}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-on-primary/50">{t.cta.secure}</p>
        </div>
      </aside>
    </div>
  );
}
