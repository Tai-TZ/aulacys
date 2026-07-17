"use client";

import { useI18n } from "@/lib/i18n/provider";

export function RouteLoading() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-4">
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-brand text-2xl font-extrabold text-on-primary shadow-brand">
        A
      </div>
      <div
        className="mt-8 h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand"
        aria-hidden
      />
      <h1 className="mt-6 text-xl font-bold text-navy">{t.loading.title}</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">{t.loading.subtitle}</p>
    </div>
  );
}
