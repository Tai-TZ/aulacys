import * as React from "react";
import { cn } from "@/lib/cn";

export function ScrollArea({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      <div className="h-full max-h-[inherit] w-full overflow-y-auto overscroll-contain pr-1">
        {children}
      </div>
    </div>
  );
}
