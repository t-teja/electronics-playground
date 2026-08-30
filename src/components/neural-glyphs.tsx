import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 160 72" className={cn("text-muted", className)} fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function Electron({ d, dur }: { d: string; dur: string }) {
  return (
    <circle r="2.4" className="sim-flow fill-electron">
      <animateMotion dur={dur} repeatCount="indefinite" path={d} rotate="auto" />
    </circle>
  );
}

export function GlyphPerceptron({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="40" cy="24" r="8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="40" cy="48" r="8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="90" cy="36" r="12" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="132" cy="36" r="10" stroke="currentColor" strokeWidth="1.5" className="text-electron" />
      <path d="M48 24 L78 32 M48 48 L78 40 M102 36 H122" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M48 24 L78 32" dur="1.6s" />
    </Frame>
  );
}

export function GlyphNeuralNet({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="32" cy="24" r="7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="32" cy="48" r="7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="80" cy="20" r="8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="80" cy="52" r="8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="128" cy="36" r="10" stroke="currentColor" strokeWidth="1.5" className="text-electron" />
      <path d="M39 24 L72 20 M39 24 L72 52 M39 48 L72 20 M39 48 L72 52 M88 20 L118 36 M88 52 L118 36" stroke="currentColor" strokeWidth="1.3" />
      <Electron d="M39 24 L72 20" dur="1.5s" />
    </Frame>
  );
}

export function GlyphAttention({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="18" y="24" width="28" height="24" rx="4" stroke="currentColor" strokeWidth="1.4" />
      <rect x="66" y="12" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="1.3" />
      <rect x="66" y="40" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="1.3" />
      <rect x="114" y="24" width="28" height="24" rx="4" stroke="currentColor" strokeWidth="1.4" className="text-electron" />
      <path d="M46 32 C56 32 56 22 66 22 M46 40 C56 40 56 50 66 50" stroke="currentColor" strokeWidth="1.3" />
      <path d="M94 22 C104 22 104 32 114 32 M94 50 C104 50 104 40 114 40" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <Electron d="M46 32 C56 32 56 22 66 22" dur="1.6s" />
    </Frame>
  );
}
