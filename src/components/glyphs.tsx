import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { GlyphPerceptron, GlyphNeuralNet, GlyphAttention } from "@/components/neural-glyphs";

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
      <path d="M72 22 l10 -10 M80 20 l10 -10" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <path d="M80 12 l-3 1 M80 12 l1 3 M90 10 l-3 1 M90 10 l1 3" stroke="currentColor" strokeWidth="1.2" className="text-electron" />
      <Electron d="M12 40 H58" dur="1.5s" />
    </Frame>
  );
}

export function GlyphTransistor({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="90" cy="36" r="20" stroke="currentColor" strokeWidth="1.4" />
      <path d="M78 24 V48" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 36 H78" stroke="currentColor" strokeWidth="1.6" />
      <path d="M78 28 L110 14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M78 44 L110 58" stroke="currentColor" strokeWidth="1.6" />
      <path d="M96 50 L110 58 L102 59" stroke="currentColor" strokeWidth="1.5" />
      <text x="118" y="16" fontSize="8" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        C
      </text>
      <text x="64" y="24" fontSize="8" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        B
      </text>
      <text x="118" y="62" fontSize="8" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        E
      </text>
      <Electron d="M12 36 H78" dur="2s" />
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
      <circle cx="50" cy="22" r="2.2" fill="currentColor" />
      <circle cx="114" cy="22" r="2.2" fill="currentColor" />
      <Electron d="M18 18 H58" dur="1.8s" />
    </Frame>
  );
}

export function GlyphMosfet({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="90" cy="36" r="20" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 36 H76" stroke="currentColor" strokeWidth="1.5" />
      <path d="M76 22 V50" stroke="currentColor" strokeWidth="1.6" />
      <path d="M82 16 V26 M82 30 V42 M82 46 V56" stroke="currentColor" strokeWidth="1.6" />
      <path d="M82 22 H108 V12 M82 50 H108 V60 M82 36 H108 L108 50" stroke="currentColor" strokeWidth="1.5" />
      <path d="M100 32 L88 36 L100 40 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.6" />
      <text x="64" y="24" fontSize="8" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        G
      </text>
      <text x="118" y="14" fontSize="8" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        D
      </text>
      <text x="118" y="64" fontSize="8" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        S
      </text>
      <Electron d="M12 36 H76" dur="1.8s" />
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

export function GlyphLdr({ className }: { className?: string }) {
  const d = "M12 36 H40 L48 24 L60 48 L72 24 L84 48 L96 24 L108 36 H148";
  return (
    <Frame className={className}>
      <path d={d} stroke="currentColor" strokeWidth="1.6" />
      <path d="M64 10 l10 10 M76 8 l10 10" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <path d="M72 20 l-3 -1 M72 20 l1 -3 M84 18 l-3 -1 M84 18 l1 -3" stroke="currentColor" strokeWidth="1.2" className="text-electron" />
      <Electron d="M12 36 H72" dur="2.2s" />
    </Frame>
  );
}

export function GlyphIr({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M12 28 H48 M12 48 H48" stroke="currentColor" strokeWidth="1.5" />
      <path d="M48 18 L72 28 L48 38 Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M74 18 V38" stroke="currentColor" strokeWidth="1.8" />
      <path d="M88 22 L112 32 L88 42 Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M114 22 V42" stroke="currentColor" strokeWidth="1.8" />
      <path d="M118 32 H148" stroke="currentColor" strokeWidth="1.5" />
      <path d="M78 12 l8 -8 M86 12 l8 -8" stroke="currentColor" strokeWidth="1.2" className="text-electron" />
      <Electron d="M12 28 H48" dur="1.6s" />
    </Frame>
  );
}

export function GlyphPir({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="44" y="16" width="72" height="40" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="80" cy="36" rx="22" ry="12" stroke="currentColor" strokeWidth="1.3" />
      <rect x="64" y="30" width="12" height="12" stroke="currentColor" strokeWidth="1.2" />
      <rect x="84" y="30" width="12" height="12" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 28 H44 M12 44 H44 M116 28 H148 M116 44 H148" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 28 H44" dur="1.8s" />
    </Frame>
  );
}

export function GlyphUltrasonic({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="36" y="18" width="88" height="36" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="62" cy="36" r="10" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="98" cy="36" r="10" stroke="currentColor" strokeWidth="1.4" />
      <path d="M118 24 a16 16 0 0 1 0 24" stroke="currentColor" strokeWidth="1.2" className="text-electron" />
      <path d="M124 18 a24 24 0 0 1 0 36" stroke="currentColor" strokeWidth="1.2" className="text-electron" />
      <path d="M12 28 H36 M12 44 H36" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 28 H36" dur="1.5s" />
    </Frame>
  );
}

export function GlyphPnp({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="90" cy="36" r="20" stroke="currentColor" strokeWidth="1.4" />
      <path d="M78 24 V48" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 36 H78" stroke="currentColor" strokeWidth="1.6" />
      <path d="M78 28 L110 14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M78 44 L110 58" stroke="currentColor" strokeWidth="1.6" />
      <path d="M104 56 L82 46 L92 52" stroke="currentColor" strokeWidth="1.5" />
      <text x="118" y="16" fontSize="8" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        C
      </text>
      <text x="64" y="24" fontSize="8" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        B
      </text>
      <text x="118" y="62" fontSize="8" fill="currentColor" fontFamily="IBM Plex Sans, system-ui, sans-serif">
        E
      </text>
      <Electron d="M12 36 H78" dur="2s" />
    </Frame>
  );
}

export function GlyphAdc({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M12 44 q16 -24 32 0 t32 0" stroke="currentColor" strokeWidth="1.5" className="text-electron" />
      <rect x="78" y="18" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M88 28 h16 M88 36 h16 M88 44 h10" stroke="currentColor" strokeWidth="1.4" />
      <path d="M114 28 H148 M114 44 H148" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 44 q16 -24 32 0 t32 0" dur="1.8s" />
    </Frame>
  );
}

export function GlyphDac({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="28" y="18" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M38 28 h16 M38 36 h16 M38 44 h10" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 28 H28 M12 44 H28" stroke="currentColor" strokeWidth="1.4" />
      <path d="M64 36 H88 q12 -16 24 0 t24 0" stroke="currentColor" strokeWidth="1.5" className="text-electron" />
      <Electron d="M64 36 H88 q12 -16 24 0 t24 0" dur="1.8s" />
    </Frame>
  );
}

export function GlyphRam({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="44" y="12" width="72" height="48" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M52 22 h14 v8 h-14 z M70 22 h14 v8 h-14 z M88 22 h14 v8 h-14 z M52 34 h14 v8 h-14 z M70 34 h14 v8 h-14 z M88 34 h14 v8 h-14 z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M12 28 H44 M12 44 H44 M116 28 H148 M116 44 H148" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 28 H44" dur="1.5s" />
    </Frame>
  );
}

export function GlyphRom({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="44" y="12" width="72" height="48" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M54 22 h52 M54 30 h40 M54 38 h52 M54 46 h28" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 28 H44 M12 44 H44 M116 28 H148 M116 44 H148" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 28 H44" dur="1.6s" />
    </Frame>
  );
}

export function GlyphEprom({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="44" y="12" width="72" height="48" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="80" cy="36" rx="18" ry="10" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <path d="M12 28 H44 M12 44 H44 M116 28 H148 M116 44 H148" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 28 H44" dur="1.5s" />
    </Frame>
  );
}

export function GlyphPsram({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="44" y="12" width="72" height="48" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M52 22 h14 v8 h-14 z M70 22 h14 v8 h-14 z M88 22 h14 v8 h-14 z M52 34 h14 v8 h-14 z M70 34 h14 v8 h-14 z M88 34 h14 v8 h-14 z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M50 38 H110" stroke="currentColor" strokeWidth="1.3" className="text-electron" />
      <path d="M12 28 H44 M12 44 H44 M116 28 H148 M116 44 H148" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 28 H44" dur="1.4s" />
    </Frame>
  );
}

export function GlyphCpu({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="36" y="14" width="40" height="44" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="84" y="14" width="40" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="84" y="38" width="40" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M76 36 H84" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 28 H36 M12 44 H36 M124 24 H148 M124 48 H148" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M12 28 H36" dur="1.3s" />
    </Frame>
  );
}

export function GlyphGpu({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <rect x="28" y="18" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="46" y="18" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="64" y="18" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="82" y="18" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="28" y="36" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="46" y="36" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="64" y="36" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="82" y="36" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="108" y="16" width="28" height="40" rx="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M112 22 h6 v6 h-6 z M120 22 h6 v6 h-6 z M112 30 h6 v6 h-6 z M120 30 h6 v6 h-6 z" stroke="currentColor" strokeWidth="1" />
      <Electron d="M28 25 H82" dur="1.4s" />
    </Frame>
  );
}

export function GlyphUart({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M16 24 H144 M16 48 H144" stroke="currentColor" strokeWidth="1.4" />
      <path d="M40 24 v-8 h20 v8 M88 48 v8 h20 v-8" stroke="currentColor" strokeWidth="1.5" />
      <Electron d="M16 24 H144" dur="1.6s" />
    </Frame>
  );
}

export function GlyphI2c({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M16 26 H144 M16 46 H144" stroke="currentColor" strokeWidth="1.4" />
      <path d="M50 26 V14 M90 26 V14 M50 46 V58 M90 46 V58" stroke="currentColor" strokeWidth="1.3" />
      <Electron d="M16 26 H144" dur="2s" />
    </Frame>
  );
}

export function GlyphSpi({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M16 18 H144 M16 32 H144 M16 46 H144 M16 58 H144" stroke="currentColor" strokeWidth="1.3" />
      <Electron d="M16 32 H144" dur="1.3s" />
    </Frame>
  );
}

export function GlyphCan({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M20 26 Q50 10 80 26 T140 26" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 46 Q50 62 80 46 T140 46" stroke="currentColor" strokeWidth="1.5" />
      <Electron d="M20 26 Q50 10 80 26 T140 26" dur="1.8s" />
    </Frame>
  );
}

export function GlyphLin({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M16 36 H144" stroke="currentColor" strokeWidth="1.8" />
      <path d="M40 36 V22 M80 36 V50 M120 36 V22" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M16 36 H144" dur="1.7s" />
    </Frame>
  );
}

export function GlyphOneWire({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M16 36 H144" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="52" cy="36" r="8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="108" cy="36" r="8" stroke="currentColor" strokeWidth="1.4" />
      <Electron d="M16 36 H144" dur="2.2s" />
    </Frame>
  );
}

export function GlyphRs485({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M20 24 H140 M20 48 H140" stroke="currentColor" strokeWidth="1.5" />
      <path d="M40 24 L40 48 M80 24 L80 48 M120 24 L120 48" stroke="currentColor" strokeWidth="1.2" />
      <Electron d="M20 24 H140" dur="1.5s" />
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
  pnp: GlyphPnp,
  adc: GlyphAdc,
  dac: GlyphDac,
  ldr: GlyphLdr,
  ir: GlyphIr,
  pir: GlyphPir,
  ultrasonic: GlyphUltrasonic,
  ram: GlyphRam,
  rom: GlyphRom,
  eprom: GlyphEprom,
  psram: GlyphPsram,
  cpu: GlyphCpu,
  gpu: GlyphGpu,
  uart: GlyphUart,
  i2c: GlyphI2c,
  spi: GlyphSpi,
  can: GlyphCan,
  lin: GlyphLin,
  "one-wire": GlyphOneWire,
  rs485: GlyphRs485,
  perceptron: GlyphPerceptron,
  "neural-net": GlyphNeuralNet,
  attention: GlyphAttention,
} as const;
