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

export function GlyphResistor({ className }: { className?: string }) {
  const d = "M12 36 H40 L48 24 L60 48 L72 24 L84 48 L96 24 L108 36 H148";
  return (
    <Frame className={className}>
      <path d={d} stroke="currentColor" strokeWidth="1.6" />
      <Electron d={d} dur="2.4s" />
    </Frame>
  );
}

export function GlyphCapacitor({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M12 36 H70 M90 36 H148" stroke="currentColor" strokeWidth="1.6" />
      <path d="M70 18 V54 M90 18 V54" stroke="currentColor" strokeWidth="2" />
      <Electron d="M12 36 H70" dur="1.8s" />
    </Frame>
  );
}

export function GlyphInductor({ className }: { className?: string }) {
  const d = "M12 36 H40 a10 10 0 0 1 20 0 a10 10 0 0 1 20 0 a10 10 0 0 1 20 0 a10 10 0 0 1 20 0 H148";
  return (
    <Frame className={className}>
      <path d={d} stroke="currentColor" strokeWidth="1.6" />
      <Electron d={d} dur="2.6s" />
    </Frame>
  );
}

export function GlyphDiode({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M12 36 H62 M98 36 H148" stroke="currentColor" strokeWidth="1.6" />
      <path d="M62 20 L94 36 L62 52 Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M98 20 V52" stroke="currentColor" strokeWidth="2" />
      <Electron d="M12 36 H62" dur="1.6s" />
    </Frame>
  );
}

export function GlyphLed({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M12 40 H58 M96 40 H148" stroke="currentColor" strokeWidth="1.6" />
      <path d="M58 24 L88 40 L58 56 Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M92 24 V56" stroke="currentColor" strokeWidth="2" />
      <path d="M104 18 l10 -8 M112 22 l10 -8" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <Electron d="M12 40 H58" dur="1.5s" />
    </Frame>
  );
}

export function GlyphTransistor({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="86" cy="36" r="20" stroke="currentColor" strokeWidth="1.4" />
      <path d="M74 24 V48" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 36 H74 M86 22 L104 10 M86 50 L104 62" stroke="currentColor" strokeWidth="1.6" />
      <Electron d="M12 36 H74" dur="2s" />
    </Frame>
  );
}

export function GlyphGate({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M12 24 H52 M12 48 H52" stroke="currentColor" strokeWidth="1.6" />
      <path d="M52 16 H78 A20 20 0 0 1 78 56 H52 Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M98 36 H148" stroke="currentColor" strokeWidth="1.6" />
      <Electron d="M98 36 H148" dur="1.8s" />
    </Frame>
  );
}

export function GlyphTimer({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="44" y="14" width="72" height="44" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="54" cy="36" r="3" className="fill-fg/30" />
      <path d="M12 28 H44 M12 44 H44 M116 28 H148 M116 44 H148" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 28 H44" dur="1.4s" />
    </Frame>
  );
}

export function GlyphMcu({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="40" y="14" width="80" height="44" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M52 22 h56 v28 h-56 z" stroke="currentColor" strokeWidth="1" className="text-subtle" />
      <path d="M12 24 H40 M12 48 H40 M120 24 H148 M120 48 H148" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 24 H40" dur="1.2s" />
    </Frame>
  );
}

export function GlyphPot({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M12 36 H40 L48 24 L60 48 L72 24 L84 48 L96 24 L108 36 H148" stroke="currentColor" strokeWidth="1.6" />
      <path d="M72 10 L72 24 M66 16 L72 24 L78 16" stroke="currentColor" strokeWidth="1.4" className="text-electron" />
      <Electron d="M12 36 H72" dur="2.2s" />
    </Frame>
  );
}

export function GlyphTransformer({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M18 18 H58 M18 54 H58" stroke="currentColor" strokeWidth="1.4" />
      <path d="M58 18 a8 8 0 0 1 0 16 a8 8 0 0 1 0 16 a8 8 0 0 1 0 4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M78 16 V56 M86 16 V56" stroke="currentColor" strokeWidth="1.5" />
      <path d="M106 18 a8 8 0 0 0 0 16 a8 8 0 0 0 0 16 a8 8 0 0 0 0 4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M106 18 H142 M106 54 H142" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M18 18 H58" dur="1.8s" />
    </Frame>
  );
}

export function GlyphMosfet({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="90" cy="36" r="20" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 36 H78 M78 24 V48 M84 22 V50 M84 28 H104 V12 M84 44 H104 V60" stroke="currentColor" strokeWidth="1.5" />
      <Electron d="M12 36 H78" dur="1.8s" />
    </Frame>
  );
}

export function GlyphMotor({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="90" cy="36" r="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M78 36 H102 M90 24 V48" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 28 H72 M12 44 H72" stroke="currentColor" strokeWidth="1.5" />
      <Electron d="M12 28 H72" dur="1.4s" />
    </Frame>
  );
}

export function GlyphRelay({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M28 22 V50" stroke="currentColor" strokeWidth="1.5" />
      <path d="M36 26 a6 6 0 0 1 0 12 a6 6 0 0 1 0 12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M78 20 H110 M78 52 H110 M70 36 L110 20" stroke="currentColor" strokeWidth="1.5" />
      <Electron d="M12 36 H28" dur="1.6s" />
    </Frame>
  );
}

export function GlyphGenerator({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="28" y="16" width="104" height="40" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M40 36 q12 -14 24 0 t24 0 t24 0" stroke="currentColor" strokeWidth="1.6" className="text-electron" />
      <Electron d="M40 36 q12 -14 24 0 t24 0" dur="1.6s" />
    </Frame>
  );
}

export const GLYPHS = {
  resistor: GlyphResistor,
  capacitor: GlyphCapacitor,
  inductor: GlyphInductor,
  potentiometer: GlyphPot,
  transformer: GlyphTransformer,
  diode: GlyphDiode,
  led: GlyphLed,
  transistor: GlyphTransistor,
  mosfet: GlyphMosfet,
  "logic-gates": GlyphGate,
  "timer-555": GlyphTimer,
  microcontroller: GlyphMcu,
  "signal-generator": GlyphGenerator,
  "dc-motor": GlyphMotor,
  relay: GlyphRelay,
} as const;
