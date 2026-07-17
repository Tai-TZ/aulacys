"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Car,
  Facebook,
  FileCheck,
  GraduationCap,
  Home,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Wallet,
  Youtube,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import { BrandMark } from "@/components/client/brand-mark";
import { ClientNav } from "@/components/client/client-nav";
import { LoanCalculator } from "@/components/client/loan-calculator";
import { LoanChatbot } from "@/components/client/loan-chatbot";
import { Reveal } from "@/components/client/reveal";
import { useI18n } from "@/lib/i18n/provider";
import type { ProductSlug } from "@/lib/products";

const GOAL_ICONS = {
  "mua-nha": Home,
  "mua-oto": Car,
  "du-hoc": GraduationCap,
} as const;

const HELP_IMAGES = ["/aulacys/help-1.png", "/aulacys/help-2.png", "/aulacys/help-3.png"];

const STEP_ICONS = [ShieldCheck, FileCheck, Wallet];

export function LandingPage() {
  const { t } = useI18n();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const productSlugs = Object.keys(t.products.items) as ProductSlug[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ClientNav />

      <main>
        {/* Hero — brand text, no photo */}
        <section
          id="trang-chu"
          className="relative isolate overflow-hidden bg-gradient-hero text-on-primary"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-on-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

          <div className="relative mx-auto flex min-h-[min(78vh,700px)] max-w-7xl flex-col justify-center px-4 pb-24 pt-16 md:px-8 md:pb-32 md:pt-20">
            <div className="max-w-2xl">
              <div className="animate-fade-up">
                <BrandMark href={null} variant="light" size="hero" />
                <div className="brand-underline mt-4 h-1 w-16 rounded-full bg-brand" />
              </div>

              <h1 className="animate-fade-up animate-delay-1 mt-8 text-2xl font-semibold leading-snug tracking-tight text-on-primary/95 md:text-3xl lg:text-4xl">
                {t.hero.titleBefore}{" "}
                <span className="text-brand">{t.hero.titleAccent}</span>{" "}
                {t.hero.titleAfter}
              </h1>

              <p className="animate-fade-up animate-delay-2 mt-5 max-w-lg text-base leading-relaxed text-on-primary/70 md:text-lg">
                {t.hero.subtitle}
              </p>

              <div className="animate-fade-up animate-delay-3 mt-8 flex flex-wrap items-center gap-3">
                <Link href="/dang-ky">
                  <Button
                    size="lg"
                    className="btn-shimmer h-12 bg-brand px-7 font-semibold text-on-primary shadow-brand hover:bg-brand-hover"
                  >
                    {t.hero.ctaPrimary}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-on-primary/35 bg-on-primary/5 px-6 text-on-primary backdrop-blur-sm hover:border-on-primary/60 hover:bg-on-primary/10"
                  onClick={() =>
                    document
                      .getElementById("san-pham-vay")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  {t.hero.ctaSecondary}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip — below first viewport */}
        <div className="border-b border-border/80 bg-card">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border/80 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 md:px-8">
            {[t.hero.trust1, t.hero.trust2, t.hero.trust3].map((label, i) => (
              <Reveal
                key={label}
                delayMs={i * 80}
                className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-navy"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                {label}
              </Reveal>
            ))}
          </div>
        </div>

        <div id="tinh-khoan-vay" className="mx-auto max-w-7xl px-4 pt-10 md:px-8">
          <Reveal>
            <LoanCalculator embedded />
          </Reveal>
        </div>

        <section id="san-pham-vay" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-24 md:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              {t.products.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy md:text-4xl">
              {t.products.title}
            </h2>
            <p className="mt-3 text-muted-foreground">{t.products.subtitle}</p>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {productSlugs.map((slug, i) => {
              const item = t.products.items[slug];
              const Icon = GOAL_ICONS[slug];
              return (
                <Reveal key={slug} delayMs={i * 100}>
                  <Link
                    href={`/vay/${slug}`}
                    className="group block border-b border-border pb-6 transition-colors hover:border-brand"
                  >
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-on-primary transition-colors group-hover:bg-brand">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-xl font-bold text-navy">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-all group-hover:gap-2.5">
                      {t.products.viewDetail} <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section id="vi-sao-chon" className="scroll-mt-20 bg-card py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <Reveal className="mx-auto mb-16 max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                {t.why.eyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy md:text-4xl">
                {t.why.title}
              </h2>
            </Reveal>
            <div className="space-y-20">
              {t.why.items.map((it, i) => (
                <Reveal key={it.title}>
                  <div
                    className={`grid items-center gap-10 md:grid-cols-2 ${
                      i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""
                    }`}
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-muted/60">
                      <Image
                        src={HELP_IMAGES[i]}
                        alt={it.title}
                        width={900}
                        height={700}
                        className="mx-auto w-full max-w-md transition-transform duration-700 hover:scale-[1.02]"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                        0{i + 1}
                      </span>
                      <h3 className="mt-3 text-2xl font-bold tracking-tight text-navy md:text-3xl">
                        {it.title}
                      </h3>
                      <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
                        {it.text}
                      </p>
                      <Link
                        href="/#san-pham-vay"
                        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-all hover:gap-2.5"
                      >
                        {t.why.viewDetail} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="bieu-phi" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-24 md:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              {t.pricing.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy md:text-4xl">
              {t.pricing.title}
            </h2>
            <p className="mt-3 text-muted-foreground">{t.pricing.subtitle}</p>
          </Reveal>
          <Reveal delayMs={120}>
            <Card className="mt-12 overflow-hidden border-border/70 shadow-card">
              <div className="grid grid-cols-12 bg-navy px-6 py-4 text-sm font-semibold text-on-primary">
                <div className="col-span-6">{t.pricing.colProduct}</div>
                <div className="col-span-3 text-center">{t.pricing.colRate}</div>
                <div className="col-span-3 text-right">{t.pricing.colTerm}</div>
              </div>
              {t.pricing.rows.map((r) => (
                <div
                  key={r.name}
                  className={`grid grid-cols-12 items-center border-t border-border/60 px-6 py-5 text-sm transition-colors hover:bg-muted/40 ${
                    r.featured ? "bg-muted/50" : "bg-card"
                  }`}
                >
                  <div className="col-span-6 flex flex-wrap items-center gap-3 font-semibold text-navy">
                    {r.name}
                    {r.featured && (
                      <span className="rounded bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                        {t.pricing.featured}
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 text-center font-bold text-brand">
                    {r.rate}
                    {t.pricing.perYear}
                  </div>
                  <div className="col-span-3 text-right text-muted-foreground">{r.term}</div>
                </div>
              ))}
            </Card>
          </Reveal>
          <Reveal className="mt-10 text-center">
            <Link href="/vay/mua-nha">
              <Button
                size="lg"
                className="btn-shimmer h-12 bg-brand px-8 font-semibold text-on-primary shadow-brand hover:bg-brand-hover"
              >
                {t.pricing.viewDetail} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
        </section>

        <section id="quy-trinh" className="scroll-mt-20 bg-navy-deep py-24 text-on-primary">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 md:grid-cols-2 md:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-2xl bg-navy/40">
                <Image
                  src="/aulacys/steps.png"
                  alt={t.process.imageAlt}
                  width={900}
                  height={900}
                  className="mx-auto w-full max-w-md opacity-95"
                />
              </div>
            </Reveal>
            <Reveal delayMs={100}>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  {t.process.eyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                  {t.process.title}
                </h2>
                <div className="mt-10 space-y-8">
                  {t.process.steps.map((s, i) => {
                    const Icon = STEP_ICONS[i];
                    return (
                      <div key={s.title} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="grid h-11 w-11 place-items-center rounded-lg border border-on-primary/15 bg-on-primary/5 text-brand">
                            <Icon className="h-5 w-5" strokeWidth={1.75} />
                          </div>
                          {i < t.process.steps.length - 1 && (
                            <div className="mt-2 h-10 w-px bg-on-primary/20" />
                          )}
                        </div>
                        <div className="pb-2">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                            {t.process.stepLabel} 0{i + 1}
                          </span>
                          <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                          <p className="mt-1 max-w-md text-sm leading-relaxed text-on-primary/65">
                            {s.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section
          id="dang-ky-ngay"
          className="scroll-mt-20 relative overflow-hidden bg-card py-24"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
          <Reveal className="relative mx-auto max-w-3xl px-4 text-center md:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-navy md:text-5xl">
              {t.cta.titleBefore} <span className="text-brand">{t.cta.titleAccent}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t.cta.subtitle}</p>
            <div className="mt-9">
              <Link href="/dang-ky">
                <Button
                  size="lg"
                  className="btn-shimmer h-14 bg-brand px-10 text-base font-bold text-on-primary shadow-brand hover:bg-brand-hover"
                >
                  {t.cta.button} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              {t.cta.secure}
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="bg-navy text-on-primary/80">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-4 md:px-8">
          <div>
            <BrandMark href="/" variant="light" size="lg" />
            <div className="mt-6 flex gap-3">
              {(
                [
                  [Facebook, "Facebook"],
                  [Youtube, "YouTube"],
                  [Linkedin, "LinkedIn"],
                ] as const
              ).map(([Icon, label]) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full bg-on-primary/10 transition-colors hover:bg-brand"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-on-primary">
              {t.footer.products}
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {t.footer.productLinks.map((l, i) => (
                <li key={l}>
                  <Link
                    href={i < 3 ? `/vay/${productSlugs[i]}` : "/#san-pham-vay"}
                    className="transition-colors hover:text-brand"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-on-primary">
              {t.footer.support}
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {t.footer.supportLinks.map((l) => (
                <li key={l}>
                  <a href="#vi-sao-chon" className="transition-colors hover:text-brand">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-on-primary">
              {t.footer.contact}
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-brand" /> 1800 686 666
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-brand" /> customercare@aulacys.com
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-brand" /> 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-on-primary/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-on-primary/50 md:px-8">
            <p>{t.footer.license}</p>
          </div>
        </div>
      </footer>

      <LoanChatbot />
    </div>
  );
}
