import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { logSliderToValue, valueToLogSlider } from "@/lib/format";

export function Control({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-fg">{label}</label>
        {value ? (
          <span className="font-mono text-sm tabular-nums text-electron">{value}</span>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-xs leading-snug text-subtle">{hint}</p> : null}
    </div>
  );
}

export function LinearControl({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  hint,
  disabled = false,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <Control label={label} value={display} hint={hint}>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={onChange}
        aria-label={label}
        disabled={disabled}
      />
    </Control>
  );
}

export function LogControl({
  label,
  value,
  display,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  const t = valueToLogSlider(value, min, max);
  return (
    <Control label={label} value={display} hint={hint}>
      <Slider
        value={t}
        min={0}
        max={1}
        step={0.001}
        onValueChange={(n) => onChange(logSliderToValue(n, min, max))}
        aria-label={label}
      />
    </Control>
  );
}

export function ToggleControl({
  label,
  checked,
  on,
  off,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  on: string;
  off: string;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex h-11 items-center justify-between gap-3">
      <span className="text-sm font-medium text-fg">{label}</span>
      <div className="flex items-center gap-2.5">
        <span className={cn("font-mono text-xs tabular-nums", checked ? "text-electron" : "text-subtle")}>
          {checked ? on : off}
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      </div>
    </div>
  );
}

export function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl bg-sim px-3 py-2.5">
      <span className="text-[10px] font-medium tracking-[0.14em] text-subtle uppercase">{label}</span>
      <span className="font-mono text-lg leading-none font-medium tabular-nums text-fg">{value}</span>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-sim p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "h-9 min-w-11 flex-1 rounded-md px-3 text-xs font-medium transition-[background-color,color] duration-150 ease-out",
            value === o.id ? "bg-raised text-fg" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
