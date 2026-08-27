const SI = [
  { v: 1e12, s: "T" },
  { v: 1e9, s: "G" },
  { v: 1e6, s: "M" },
  { v: 1e3, s: "k" },
  { v: 1, s: "" },
  { v: 1e-3, s: "m" },
  { v: 1e-6, s: "µ" },
  { v: 1e-9, s: "n" },
  { v: 1e-12, s: "p" },
];

function si(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return `— ${unit}`;
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs === 0) return `0 ${unit}`;
  const slot = SI.find((p) => abs >= p.v) ?? SI[SI.length - 1]!;
  const n = abs / slot.v;
  const d = n >= 100 ? 0 : n >= 10 ? 1 : digits;
  return `${sign}${n.toFixed(d).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1")} ${slot.s}${unit}`;
}

export const formatOhm = (r: number) => si(r, "Ω", 2);
export const formatVolt = (v: number) => si(v, "V", 2);
export const formatAmp = (i: number) => si(i, "A", 3);
export const formatWatt = (p: number) => si(p, "W", 2);
export const formatFarad = (c: number) => si(c, "F", 2);
export const formatHenry = (l: number) => si(l, "H", 2);
export const formatHz = (f: number) => si(f, "Hz", 2);
export const formatSec = (t: number) => si(t, "s", 2);
export const formatRpm = (n: number) => `${Math.round(Math.max(0, n))} rpm`;

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function logSliderToValue(t: number, min: number, max: number) {
  const a = Math.log(min);
  const b = Math.log(max);
  return Math.exp(a + (b - a) * clamp(t, 0, 1));
}

export function valueToLogSlider(v: number, min: number, max: number) {
  const a = Math.log(min);
  const b = Math.log(max);
  return clamp((Math.log(clamp(v, min, max)) - a) / (b - a), 0, 1);
}
