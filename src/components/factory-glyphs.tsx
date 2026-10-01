import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 160 72" className={cn("text-muted", className)} fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

export function GlyphBottling({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M12 50 H148" stroke="currentColor" strokeWidth="1.4" />
      <rect x="28" y="28" width="14" height="22" rx="3" stroke="currentColor" strokeWidth="1.3" />
      <rect x="56" y="22" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <rect x="88" y="28" width="14" height="22" rx="3" stroke="currentColor" strokeWidth="1.3" />
      <rect x="116" y="30" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M34 20 V28 M64 12 V22 M94 20 V28" stroke="currentColor" strokeWidth="1.2" />
    </Frame>
  );
}

export function GlyphPickPlace({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M24 56 L24 40 L55 28 L85 36 L118 22" stroke="currentColor" strokeWidth="1.6" />
      <rect x="108" y="40" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <circle cx="55" cy="28" r="3" stroke="currentColor" strokeWidth="1.2" />
    </Frame>
  );
}

export function GlyphAgv({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="40" y="28" width="80" height="28" rx="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="58" cy="58" r="6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="102" cy="58" r="6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="80" cy="22" r="5" className="text-electron" stroke="currentColor" strokeWidth="1.2" />
    </Frame>
  );
}

export function GlyphSorter({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M12 36 H90" stroke="currentColor" strokeWidth="1.4" />
      <path d="M90 36 L120 18 M90 36 L120 36 M90 36 L120 54" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <rect x="40" y="28" width="12" height="12" stroke="currentColor" strokeWidth="1.2" />
    </Frame>
  );
}

export function GlyphScara({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="50" cy="40" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M50 40 H95 L125 28" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="95" cy="40" r="4" stroke="currentColor" strokeWidth="1.2" className="text-electron" />
      <circle cx="125" cy="28" r="3" stroke="currentColor" strokeWidth="1.2" />
    </Frame>
  );
}
