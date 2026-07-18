import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva("relative w-full rounded-xl border px-4 py-3.5 text-sm", {
  variants: {
    variant: {
      default: "border-border/70 bg-card text-foreground",
      warning: "border-warning-foreground/15 bg-warning-soft text-warning-foreground",
      success: "border-success-foreground/15 bg-success-soft text-success-foreground",
      active: "border-active-foreground/10 bg-active-soft text-active-foreground",
      muted: "border-border/60 bg-secondary/50 text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-sm leading-relaxed opacity-95", className)} {...props} />;
}
