"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { ClientNav } from "@/components/client/client-nav";
import { LoanCalculator } from "@/components/client/loan-calculator";
import { LoanChatbot } from "@/components/client/loan-chatbot";
import { useI18n } from "@/lib/i18n/provider";
import { PRODUCTS, PRODUCT_SLUGS, type ProductSlug } from "@/lib/products";

export function ProductDetailPage({ slug }: { slug: ProductSlug }) {
  const { locale, t } = useI18n();
  const product = PRODUCTS[slug];
  const title = t.products.items[slug].title;
  const isVi = locale === "vi";

  const related = PRODUCT_SLUGS.filter((s) => s !== slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ClientNav />

      <main>
        <section className="border-b border-border/60 bg-gradient-hero">
          <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-brand">
                {t.detail.breadcrumbHome}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span>{t.detail.breadcrumbLoan}</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-navy">{title}</span>
            </nav>

            <div className="mt-8 grid items-center gap-10 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-brand">
                  {t.detail.breadcrumbLoan}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy md:text-5xl">
                  {title}
                </h1>
                <p className="mt-3 text-xl font-semibold text-navy">
                  {isVi ? product.heroTaglineVi : product.heroTaglineEn}
                </p>
                <p className="mt-3 max-w-xl text-muted-foreground">
                  {isVi ? product.heroDescVi : product.heroDescEn}
                </p>
                <div className="mt-6 flex flex-wrap gap-4 text-sm text-navy">
                  <span className="rounded-lg bg-card px-3 py-2 shadow-sm">
                    <strong className="text-brand">{product.rate}</strong>
                    {t.pricing.perYear}
                  </span>
                  <span className="rounded-lg bg-card px-3 py-2 shadow-sm">{product.maxTerm}</span>
                </div>
                <Link href="/dang-ky" className="mt-8 inline-block">
                  <Button
                    size="lg"
                    className="h-12 bg-brand px-8 font-semibold text-on-primary hover:bg-brand-hover"
                  >
                    {t.detail.apply} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-6 -z-10 rounded-3xl bg-card shadow-card" />
                <Image
                  src={product.image}
                  alt={title}
                  width={900}
                  height={700}
                  priority
                  className="mx-auto w-full max-w-md"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <h2 className="text-2xl font-extrabold text-navy md:text-3xl">{t.detail.benefits}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {product.benefits.map((b) => (
              <Card key={b.labelVi} className="border-border/60 p-5 shadow-card">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {isVi ? b.labelVi : b.labelEn}
                </p>
                <p className="mt-2 text-xl font-extrabold text-brand">
                  {isVi ? b.valueVi : b.valueEn}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-cream py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">
              {t.detail.calcEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-navy md:text-3xl">
              {t.detail.calcTitle}
            </h2>
            <div className="mt-8">
              <LoanCalculator embedded />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <h2 className="text-2xl font-extrabold text-navy md:text-3xl">{t.detail.conditions}</h2>
          <ul className="mt-6 space-y-3">
            {(isVi ? product.conditionsVi : product.conditionsEn).map((c) => (
              <li key={c} className="flex items-start gap-3 text-navy">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-cream py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <h2 className="text-2xl font-extrabold text-navy md:text-3xl">{t.detail.process}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(isVi ? product.processVi : product.processEn).map((step, i) => (
                <Card key={step.title} className="border-border/60 p-5">
                  <span className="text-xs font-bold text-brand">
                    {t.process.stepLabel} 0{i + 1}
                  </span>
                  <h3 className="mt-2 font-bold text-navy">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <h2 className="text-2xl font-extrabold text-navy md:text-3xl">{t.detail.faq}</h2>
          <div className="mt-6 space-y-4">
            {(isVi ? product.faqVi : product.faqEn).map((item) => (
              <Card key={item.q} className="border-border/60 p-5">
                <h3 className="font-semibold text-navy">{item.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 bg-cream py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <h2 className="text-2xl font-extrabold text-navy md:text-3xl">{t.detail.related}</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {related.map((s) => (
                <Card key={s} className="border-border/60 p-6 transition hover:shadow-card">
                  <h3 className="text-lg font-bold text-navy">{t.products.items[s].title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t.products.items[s].desc}</p>
                  <Link
                    href={`/vay/${s}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"
                  >
                    {t.products.viewDetail} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Card>
              ))}
            </div>
            <Link
              href="/"
              className="mt-10 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-brand"
            >
              ← {t.detail.back}
            </Link>
          </div>
        </section>
      </main>

      <LoanChatbot />
    </div>
  );
}
