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

export function GlyphSplitPhase({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="96" cy="36" r="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M86 36 H106 M96 26 V46" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 22 H70 M12 50 H70" stroke="currentColor" strokeWidth="1.4" />
      <path d="M48 22 V50" stroke="currentColor" strokeWidth="1.2" className="text-electron" />
      <Electron d="M12 22 H70" dur="1.5s" />
    </Frame>
  );
}

export function GlyphInduction({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="90" cy="36" r="18" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="90" cy="36" r="8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M90 18 L98 30 L82 30 Z" stroke="currentColor" strokeWidth="1.2" className="text-electron" />
      <path d="M20 20 H60 M20 36 H60 M20 52 H60" stroke="currentColor" strokeWidth="1.3" />
      <Electron d="M20 36 H60" dur="1.4s" />
    </Frame>
  );
}

export function GlyphPmsm({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="90" cy="36" r="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M82 28 L98 44 M98 28 L82 44" stroke="currentColor" strokeWidth="1.4" className="text-electron" />
      <path d="M12 28 H68 M12 44 H68" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 28 H68" dur="1.5s" />
    </Frame>
  );
}

export function GlyphBldc({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="96" cy="36" r="16" stroke="currentColor" strokeWidth="1.5" />
      <path d="M96 24 L104 40 L88 40 Z" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="1" />
      <path d="M20 18 H70 M20 36 H70 M20 54 H70" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="56" cy="18" r="3" className="text-electron" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="56" cy="36" r="3" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="56" cy="54" r="3" stroke="currentColor" strokeWidth="1.2" />
      <Electron d="M20 36 H70" dur="1.3s" />
    </Frame>
  );
}

export function GlyphServo({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="70" cy="36" r="16" stroke="currentColor" strokeWidth="1.5" />
      <path d="M70 24 V36 H82" stroke="currentColor" strokeWidth="1.4" className="text-electron" />
      <rect x="100" y="22" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 36 H54" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 36 H54" dur="1.6s" />
    </Frame>
  );
}

export function GlyphPid({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="20" y="20" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="1.4" />
      <text x="40" y="40" textAnchor="middle" fontSize="11" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        PID
      </text>
      <path d="M60 36 H84" stroke="currentColor" strokeWidth="1.4" />
      <rect x="84" y="22" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M120 36 H140 M140 36 V50 H40 V58 H20" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <Electron d="M60 36 H84" dur="1.5s" />
    </Frame>
  );
}
