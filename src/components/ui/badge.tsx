import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-raised px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-muted uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
