import { useEffect } from "react";

export type FactoryHotkeysOptions = {
  enabled?: boolean;
  running: boolean;
  eStop: boolean;
  onStart: () => void;
  onStop: () => void;
  onEStop: () => void;
  onClearEStop: () => void;
  speed: number;
  setSpeed: (n: number) => void;
  speedMin: number;
  speedMax: number;
  speedStep: number;
  onFit: () => void;
  onReset: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  if (target.getAttribute("role") === "slider") return true;
  if (target.closest('[role="slider"]')) return true;
  return false;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Shared factory lab shortcuts. Ignored while typing in inputs or with modifiers.
 */
export function useFactoryHotkeys({
  enabled = true,
  running,
  eStop,
  onStart,
  onStop,
  onEStop,
  onClearEStop,
  speed,
  setSpeed,
  speedMin,
  speedMax,
  speedStep,
  onFit,
  onReset,
}: FactoryHotkeysOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key;
      const lower = key.length === 1 ? key.toLowerCase() : key;

      if (key === " " || lower === "spacebar") {
        e.preventDefault();
        if (!eStop && !running) onStart();
        return;
      }

      if (lower === "x") {
        e.preventDefault();
        if (running) onStop();
        return;
      }

      if (lower === "e") {
        e.preventDefault();
        onEStop();
        return;
      }

      if (lower === "c") {
        e.preventDefault();
        if (eStop) onClearEStop();
        return;
      }

      if (lower === "f") {
        e.preventDefault();
        onFit();
        return;
      }

      if (lower === "r") {
        e.preventDefault();
        onReset();
        return;
      }

      const speedDown = key === "[" || key === "-" || key === "_";
      const speedUp = key === "]" || key === "=" || key === "+";
      if (speedDown || speedUp) {
        e.preventDefault();
        if (eStop) return;
        const next = speedDown ? speed - speedStep : speed + speedStep;
        setSpeed(clamp(Number(next.toFixed(4)), speedMin, speedMax));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    running,
    eStop,
    onStart,
    onStop,
    onEStop,
    onClearEStop,
    speed,
    setSpeed,
    speedMin,
    speedMax,
    speedStep,
    onFit,
    onReset,
  ]);
}

/** Compact on-screen legend for FactoryShell. */
export function FactoryHotkeyLegend({ className }: { className?: string }) {
  const items: [string, string][] = [
    ["Space", "Start"],
    ["X", "Stop"],
    ["E", "E-stop"],
    ["C", "Clear E-stop"],
    ["[ ]", "Speed"],
    ["F", "Fit"],
    ["R", "Reset"],
  ];
  return (
    <div className={className}>
      <h2 className="mb-1.5 text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">
        Keys
      </h2>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-tight text-muted">
        {items.map(([k, label]) => (
          <li key={k} className="flex items-baseline gap-1.5">
            <kbd className="shrink-0 rounded border border-line bg-raised px-1 py-0.5 font-mono text-[10px] text-fg">
              {k}
            </kbd>
            <span className="truncate">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
