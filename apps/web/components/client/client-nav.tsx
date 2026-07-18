"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui";
import { BrandMark } from "@/components/client/brand-mark";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";

const SECTION_LINKS = [
  { id: "san-pham-vay", key: "products" as const },
  { id: "vi-sao-chon", key: "why" as const },
  { id: "bieu-phi", key: "pricing" as const },
  { id: "quy-trinh", key: "process" as const },
  { id: "dang-ky-ngay", key: "registerCta" as const },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: "smooth" });
}

export function ClientNav() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";

  function handleSectionClick(id: string) {
    setOpen(false);
    if (onHome) {
      scrollToSection(id);
      return;
    }
    router.push(`/#${id}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <BrandMark size="lg" />
        <nav className="hidden items-center gap-7 lg:flex" aria-label={t.nav.mainNav}>
          {SECTION_LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => handleSectionClick(l.id)}
              className="text-[13px] font-medium tracking-wide text-navy/80 transition-colors hover:text-brand"
            >
              {t.nav[l.key]}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div
            className="mr-1 hidden items-center text-xs font-medium md:flex"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => setLocale("vi")}
              className={cn(
                "px-1 transition-colors",
                locale === "vi" ? "font-semibold text-navy" : "text-muted-foreground hover:text-navy",
              )}
              aria-pressed={locale === "vi"}
            >
              VN
            </button>
            <span className="mx-1 text-muted-foreground">|</span>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={cn(
                "px-1 transition-colors",
                locale === "en" ? "font-semibold text-navy" : "text-muted-foreground hover:text-navy",
              )}
              aria-pressed={locale === "en"}
            >
              EN
            </button>
          </div>
          <Link href="/dang-nhap" className="hidden md:inline-flex">
            <Button variant="ghost" className="text-navy hover:bg-muted">
              {t.nav.login}
            </Button>
          </Link>
          <Link href="/customer-portal" className="hidden sm:inline-flex">
            <Button variant="outline" className="border-navy/20 text-navy hover:bg-muted">
              {t.workspace.goWorkspace}
            </Button>
          </Link>
          <Link href="/dang-ky">
            <Button className="btn-shimmer bg-brand text-on-primary shadow-sm hover:bg-brand-hover">
              {t.nav.register}
            </Button>
          </Link>
          <button
            type="button"
            className="ml-1 p-2 text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-border bg-background px-4 py-3 lg:hidden">
          {SECTION_LINKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => handleSectionClick(l.id)}
              className="text-left text-sm font-medium text-navy"
            >
              {t.nav[l.key]}
            </button>
          ))}
          <div className="flex items-center gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setLocale("vi")}
              className={cn(locale === "vi" ? "font-semibold text-navy" : "text-muted-foreground")}
            >
              VN
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={cn(locale === "en" ? "font-semibold text-navy" : "text-muted-foreground")}
            >
              EN
            </button>
          </div>
          <Link href="/dang-nhap" className="text-sm text-navy" onClick={() => setOpen(false)}>
            {t.nav.login}
          </Link>
        </div>
      )}
    </header>
  );
}
