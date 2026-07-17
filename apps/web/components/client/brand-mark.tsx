import Link from "next/link";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  href?: string | null;
  variant?: "navy" | "light";
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
};

const sizeClass = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
  hero: "text-4xl md:text-5xl lg:text-6xl",
} as const;

export function BrandMark({
  href = "/",
  variant = "navy",
  size = "md",
  className,
}: BrandMarkProps) {
  const color = variant === "light" ? "text-on-primary" : "text-navy";
  const mark = (
    <span
      className={cn(
        "inline-flex items-baseline gap-0 font-extrabold tracking-tight",
        sizeClass[size],
        color,
        className,
      )}
    >
      <span className="text-brand">A</span>
      <span>ulacys</span>
    </span>
  );

  if (href === null) return mark;

  return (
    <Link href={href} className="inline-flex items-center" aria-label="Aulacys">
      {mark}
    </Link>
  );
}
