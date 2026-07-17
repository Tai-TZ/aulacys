"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
}

function rangeProgress(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

export function LoanCalculator({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(500_000_000);
  const [term, setTerm] = useState(24);
  const rate = 0.089;

  const amountMin = 50_000_000;
  const amountMax = 5_000_000_000;
  const termMin = 6;
  const termMax = 240;

  const { monthly, totalInterest } = useMemo(() => {
    const r = rate / 12;
    const m = (amount * r) / (1 - Math.pow(1 + r, -term));
    return { monthly: m, totalInterest: m * term - amount };
  }, [amount, term]);

  return (
    <Card
      className={
        embedded
          ? "relative z-10 mx-auto w-full max-w-5xl border-border/60 p-6 shadow-elevated md:p-8"
          : "relative z-10 mx-auto w-full max-w-5xl -mt-8 border-border/60 p-6 shadow-elevated md:-mt-16 md:p-8"
      }
    >
      <div className="grid gap-8 md:grid-cols-5">
        <div className="space-y-6 md:col-span-3">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="loan-amount" className="text-sm font-semibold text-navy">
                {t.calculator.amount}
              </label>
              <span className="text-sm font-bold text-brand">{formatVND(amount)}</span>
            </div>
            <input
              id="loan-amount"
              type="range"
              className="loan-range"
              min={amountMin}
              max={amountMax}
              step={10_000_000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={
                {
                  "--range-progress": `${rangeProgress(amount, amountMin, amountMax)}%`,
                } as React.CSSProperties
              }
              aria-valuemin={amountMin}
              aria-valuemax={amountMax}
              aria-valuenow={amount}
              aria-valuetext={formatVND(amount)}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{t.calculator.amountMin}</span>
              <span>{t.calculator.amountMax}</span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="loan-term" className="text-sm font-semibold text-navy">
                {t.calculator.term}
              </label>
              <span className="text-sm font-bold text-brand">
                {term} {t.calculator.months}
              </span>
            </div>
            <input
              id="loan-term"
              type="range"
              className="loan-range"
              min={termMin}
              max={termMax}
              step={6}
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              style={
                {
                  "--range-progress": `${rangeProgress(term, termMin, termMax)}%`,
                } as React.CSSProperties
              }
              aria-valuemin={termMin}
              aria-valuemax={termMax}
              aria-valuenow={term}
              aria-valuetext={`${term} ${t.calculator.months}`}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{t.calculator.termMin}</span>
              <span>{t.calculator.termMax}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-cream p-5 md:col-span-2">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t.calculator.monthly}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-navy">{formatVND(monthly)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t.calculator.interest}
              </p>
              <p className="mt-1 text-lg font-semibold text-navy">{formatVND(totalInterest)}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">{t.calculator.disclaimer}</p>
          </div>
          <Link href="/dang-ky" className="mt-4 block">
            <Button className="h-11 w-full bg-brand font-semibold text-on-primary shadow-sm hover:bg-brand-hover">
              {t.calculator.register}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
