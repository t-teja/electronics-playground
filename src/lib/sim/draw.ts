import type { Pt } from "./flow";
import { applyThemeInk, Ink } from "./ink";

export { Ink, applyThemeInk };

export function withFrame(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  designW: number,
  designH: number,
  fn: () => void,
) {
  const pad = 12;
  const s = Math.min((cssW - pad * 2) / designW, (cssH - pad * 2) / designH);
  if (!Number.isFinite(s) || s <= 0) return;
  ctx.save();
  ctx.translate((cssW - designW * s) / 2, (cssH - designH * s) / 2);
  ctx.scale(s, s);
  try {
    fn();
  } finally {
    ctx.restore();
  }
}

export function clearSim(ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (typeof document !== "undefined") {
    applyThemeInk(document.documentElement.dataset.theme ?? "dark");
  }
  ctx.fillStyle = Ink.bg;
  ctx.fillRect(0, 0, w, h);
}

export function graphPaper(ctx: CanvasRenderingContext2D, w: number, h: number, step = 24) {
  ctx.beginPath();
  ctx.strokeStyle = Ink.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = Ink.gridStrong;
  for (let x = 0; x <= w; x += step * 4) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += step * 4) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function wire(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  width = 3,
  color: string = Ink.copper,
) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
  ctx.stroke();
}

export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts?: { color?: string; size?: number; align?: CanvasTextAlign; mono?: boolean; italic?: boolean },
) {
  ctx.fillStyle = opts?.color ?? Ink.muted;
  ctx.font = `${opts?.italic ? "italic " : ""}500 ${opts?.size ?? 12}px ${
    opts?.mono ? '"IBM Plex Mono", ui-monospace, monospace' : '"IBM Plex Sans", system-ui, sans-serif'
  }`;
  ctx.textAlign = opts?.align ?? "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

export function junction(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.fillStyle = Ink.copper;
  ctx.arc(x, y, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

/** IEC 60617 cell: long thin line = positive, short thick line = negative. */
export function battery(ctx: CanvasRenderingContext2D, x: number, y: number, h = 56) {
  const posLen = h;
  const negLen = h * 0.55;
  ctx.strokeStyle = Ink.pin;
  ctx.lineCap = "butt";
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(x - 10, y - negLen / 2);
  ctx.lineTo(x - 10, y + negLen / 2);
  ctx.stroke();
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(x + 6, y - posLen / 2);
  ctx.lineTo(x + 6, y + posLen / 2);
  ctx.stroke();
  label(ctx, "+", x + 20, y - 10, { size: 14, color: Ink.text, align: "left" });
  label(ctx, "−", x - 22, y, { size: 16, color: Ink.muted, align: "right" });
  return { pos: { x: x + 16, y }, neg: { x: x - 16, y } };
}

const BAND = [
  "#1a1a1a",
  "#6b3f2a",
  "#c0453c",
  "#d9773a",
  "#d4b44a",
  "#3d8a55",
  "#3b6ea8",
  "#7c4a9e",
  "#8a8a8a",
  "#f4f4f5",
];

export function resistorBands(ohm: number): [number, number, number] {
  const e = Math.max(1, ohm);
  const exp = Math.floor(Math.log10(e)) - 1;
  const n = e / 10 ** exp;
  const d1 = Math.min(9, Math.max(0, Math.floor(n / 10)));
  const d2 = Math.min(9, Math.max(0, Math.floor(n % 10)));
  return [d1, d2, Math.max(0, Math.min(9, exp))];
}

export function resistorBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  ohm: number,
  heat = 0,
) {
  const h = 28;
  roundRect(ctx, x, y - h / 2, w, h, 10);
  const g = ctx.createLinearGradient(x, y - h, x, y + h);
  g.addColorStop(0, Ink.bodyHi);
  g.addColorStop(1, Ink.body);
  ctx.fillStyle = g;
  ctx.fill();
  if (heat > 0.02) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.72, heat * 0.75);
    ctx.fillStyle = Ink.heat;
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = "rgba(128,128,128,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
  const [a, b, c] = resistorBands(ohm);
  const bands = [BAND[a], BAND[b], BAND[c], "#d4b44a"];
  const gap = w / 6.2;
  const start = x + gap * 1.15;
  bands.forEach((color, i) => {
    ctx.fillStyle = color ?? Ink.muted;
    ctx.fillRect(start + i * gap, y - h / 2 + 2, 7, h - 4);
  });
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x, y);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + 10, y);
  ctx.stroke();
}

export function capPlates(ctx: CanvasRenderingContext2D, x: number, y: number, charge01: number) {
  const h = 54;
  const gap = 14;
  ctx.fillStyle = Ink.pin;
  ctx.fillRect(x - gap / 2 - 5, y - h / 2, 5, h);
  ctx.fillRect(x + gap / 2, y - h / 2, 5, h);
  if (charge01 > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.18 + charge01 * 0.45;
    ctx.strokeStyle = Ink.electron;
    ctx.lineWidth = 1.4;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const yy = y - h / 2 + 8 + (i * (h - 16)) / (n - 1);
      ctx.beginPath();
      ctx.moveTo(x - 2, yy);
      ctx.lineTo(x + 2, yy);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - gap / 2 - 16, y);
  ctx.lineTo(x - gap / 2 - 5, y);
  ctx.moveTo(x + gap / 2 + 5, y);
  ctx.lineTo(x + gap / 2 + 16, y);
  ctx.stroke();
}

export function inductorCoil(ctx: CanvasRenderingContext2D, x: number, y: number, turns = 5, field = 0) {
  const r = 11;
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x, y);
  for (let i = 0; i < turns; i++) {
    ctx.arc(x + r + i * (r * 1.55), y, r, Math.PI, 0, false);
  }
  const endX = x + r + (turns - 1) * (r * 1.55) + r;
  ctx.lineTo(endX + 12, y);
  ctx.stroke();

  if (field > 0.02) {
    ctx.save();
    ctx.globalAlpha = 0.15 + field * 0.55;
    ctx.strokeStyle = Ink.electron;
    ctx.lineWidth = 1.2;
    const cx = x + (endX - x) / 2;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, y, 28 + i * 16 * field, 22 + i * 12 * field, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  return { start: x - 12, end: endX + 12, mid: x + (endX - x) / 2 };
}

export function diodeSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const s = 16 * scale;
  ctx.fillStyle = Ink.pin;
  ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.85);
  ctx.lineTo(x + s * 0.15, y);
  ctx.lineTo(x - s, y + s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.2, y - s * 0.85);
  ctx.lineTo(x + s * 0.2, y + s * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - s - 10, y);
  ctx.lineTo(x - s, y);
  ctx.moveTo(x + s * 0.2, y);
  ctx.lineTo(x + s + 10, y);
  ctx.stroke();
}

export function ledDome(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  brightness: number,
) {
  ctx.save();
  if (brightness > 0.02) {
    const g = ctx.createRadialGradient(x, y - 6, 2, x, y - 4, 46);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.18 + brightness * 0.55;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y - 4, 46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = Ink.body;
  ctx.fillRect(x - 10, y + 6, 20, 10);
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.35 + brightness * 0.65;
  ctx.moveTo(x - 12, y + 6);
  ctx.lineTo(x - 12, y - 4);
  ctx.arc(x, y - 4, 12, Math.PI, 0);
  ctx.lineTo(x + 12, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(128,128,128,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 16);
  ctx.lineTo(x - 5, y + 34);
  ctx.moveTo(x + 5, y + 16);
  ctx.lineTo(x + 5, y + 26);
  ctx.stroke();
}

export function dipPackage(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pins: number,
  labels: string[],
  active: Record<number, number> = {},
) {
  const pinW = 34;
  const bodyW = ((pins / 2) - 1) * pinW + 56;
  const bodyH = 80;
  const left = x - bodyW / 2;
  const top = y - bodyH / 2;
  roundRect(ctx, left, top, bodyW, bodyH, 6);
  ctx.fillStyle = Ink.package;
  ctx.fill();
  ctx.strokeStyle = "rgba(128,128,128,0.2)";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(left + 14, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = Ink.bg;
  ctx.fill();

  const perSide = pins / 2;
  for (let i = 0; i < perSide; i++) {
    const px = left + 28 + i * pinW;
    const pinBottom = i + 1;
    const pinTop = pins - i;
    const liveB = active[pinBottom] ?? 0;
    const liveT = active[pinTop] ?? 0;
    ctx.fillStyle = liveB > 0.5 ? Ink.electron : Ink.pin;
    ctx.fillRect(px - 2.5, top + bodyH, 5, 14);
    ctx.fillStyle = liveT > 0.5 ? Ink.electron : Ink.pin;
    ctx.fillRect(px - 2.5, top - 14, 5, 14);
    label(ctx, String(pinBottom), px, top + bodyH - 12, { size: 8, color: Ink.faint, mono: true });
    label(ctx, String(pinTop), px, top + 12, { size: 8, color: Ink.faint, mono: true });
    if (labels[pinBottom - 1]) {
      label(ctx, labels[pinBottom - 1]!, px, top + bodyH + 28, { size: 9, color: Ink.muted, mono: true });
    }
    if (labels[pinTop - 1]) {
      label(ctx, labels[pinTop - 1]!, px, top - 28, { size: 9, color: Ink.muted, mono: true });
    }
  }
  return { left, top, bodyW, bodyH, pinW };
}

export function npnDie(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const eW = w * 0.34;
  const bW = w * 0.16;
  const cW = w * 0.5;
  ctx.fillStyle = Ink.nType;
  ctx.fillRect(x, y, eW, h);
  ctx.fillStyle = Ink.pType;
  ctx.fillRect(x + eW, y, bW, h);
  ctx.fillStyle = Ink.nType;
  ctx.fillRect(x + eW + bW, y, cW, h);
  ctx.strokeStyle = "rgba(128,128,128,0.25)";
  ctx.strokeRect(x, y, w, h);
  label(ctx, "E  n", x + eW / 2, y + h + 14, { size: 11, color: Ink.electron });
  label(ctx, "B  p", x + eW + bW / 2, y + h + 14, { size: 11, color: Ink.hole });
  label(ctx, "C  n", x + eW + bW + cW / 2, y + h + 14, { size: 11, color: Ink.electron });
}

export function pnJunction(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  deplete01: number,
) {
  const mid = x + w / 2;
  ctx.fillStyle = Ink.pType;
  ctx.fillRect(x, y, w / 2, h);
  ctx.fillStyle = Ink.nType;
  ctx.fillRect(mid, y, w / 2, h);
  const dw = 10 + deplete01 * 48;
  ctx.fillStyle = Ink.deplete;
  ctx.fillRect(mid - dw / 2, y, dw, h);
  ctx.strokeStyle = "rgba(128,128,128,0.25)";
  ctx.strokeRect(x, y, w, h);
  label(ctx, "P", x + w * 0.22, y + h + 14, { size: 12, color: Ink.hole });
  label(ctx, "N", x + w * 0.78, y + h + 14, { size: 12, color: Ink.electron });
  return { mid, dw };
}

export function scope(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  samples: number[],
  color: string,
  caption: string,
) {
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = Ink.scope;
  ctx.fill();
  ctx.strokeStyle = "rgba(128,128,128,0.18)";
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, 8);
  ctx.clip();
  ctx.strokeStyle = Ink.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const yy = y + (h * i) / 4;
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
  }
  ctx.stroke();
  if (samples.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    samples.forEach((v, i) => {
      const px = x + (i / (samples.length - 1)) * w;
      const py = y + h - (v * 0.84 + 0.08) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
  ctx.restore();
  label(ctx, caption, x + 10, y + 12, { size: 10, color: Ink.faint, align: "left", mono: true });
}

export function toggleSwitch(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean) {
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x, y);
  ctx.moveTo(x + 22, y);
  ctx.lineTo(x + 34, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 3.2, 0, Math.PI * 2);
  ctx.arc(x + 22, y, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = Ink.pin;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  if (on) ctx.lineTo(x + 22, y);
  else ctx.lineTo(x + 18, y - 16);
  ctx.strokeStyle = Ink.copper;
  ctx.stroke();
}

export function logicShape(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number) {
  ctx.strokeStyle = Ink.pin;
  ctx.fillStyle = Ink.body;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (kind === "NOT") {
    ctx.moveTo(x - 28, y - 22);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x - 28, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 16, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = Ink.bg;
    ctx.fill();
    ctx.stroke();
  } else if (kind === "AND" || kind === "NAND") {
    ctx.moveTo(x - 24, y - 24);
    ctx.lineTo(x - 2, y - 24);
    ctx.arc(x - 2, y, 24, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x - 24, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (kind === "NAND") {
      ctx.beginPath();
      ctx.arc(x + 28, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = Ink.bg;
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === "OR" || kind === "NOR" || kind === "XOR" || kind === "XNOR") {
    ctx.moveTo(x - 28, y - 24);
    ctx.quadraticCurveTo(x + 8, y - 24, x + 22, y);
    ctx.quadraticCurveTo(x + 8, y + 24, x - 28, y + 24);
    ctx.quadraticCurveTo(x - 10, y, x - 28, y - 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (kind === "XOR" || kind === "XNOR") {
      ctx.beginPath();
      ctx.moveTo(x - 36, y - 22);
      ctx.quadraticCurveTo(x - 18, y, x - 36, y + 22);
      ctx.stroke();
    }
    if (kind === "NOR" || kind === "XNOR") {
      ctx.beginPath();
      ctx.arc(x + 28, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = Ink.bg;
      ctx.fill();
      ctx.stroke();
    }
  }
}

export function bitLed(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean, color = Ink.electron) {
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fillStyle = on ? color : Ink.body;
  ctx.fill();
  if (on) {
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = "rgba(128,128,128,0.22)";
  ctx.stroke();
}

export function lamp(ctx: CanvasRenderingContext2D, x: number, y: number, brightness: number) {
  const on = Math.max(0, Math.min(1, brightness));
  ctx.save();
  if (on > 0.04) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, 36);
    g.addColorStop(0, "rgba(255, 214, 120, 0.85)");
    g.addColorStop(1, "rgba(255, 214, 120, 0)");
    ctx.globalAlpha = 0.2 + on * 0.55;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fillStyle = on > 0.08 ? `rgba(255, 220, 140, ${0.25 + on * 0.55})` : Ink.body;
  ctx.fill();
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 7);
  ctx.lineTo(x + 7, y + 7);
  ctx.moveTo(x + 7, y - 7);
  ctx.lineTo(x - 7, y + 7);
  ctx.strokeStyle = on > 0.08 ? "#d4a04a" : Ink.muted;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 16, y);
  ctx.lineTo(x - 28, y);
  ctx.moveTo(x + 16, y);
  ctx.lineTo(x + 28, y);
  ctx.stroke();
}

export function nMosfet(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean) {
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 16);
  ctx.lineTo(x - 10, y + 16);
  ctx.moveTo(x - 4, y - 18);
  ctx.lineTo(x - 4, y - 6);
  ctx.moveTo(x - 4, y - 4);
  ctx.lineTo(x - 4, y + 4);
  ctx.moveTo(x - 4, y + 6);
  ctx.lineTo(x - 4, y + 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 12);
  ctx.lineTo(x + 16, y - 12);
  ctx.lineTo(x + 16, y - 34);
  ctx.moveTo(x - 4, y + 12);
  ctx.lineTo(x + 16, y + 12);
  ctx.lineTo(x + 16, y + 34);
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + 16, y);
  ctx.lineTo(x + 16, y + 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 6);
  ctx.lineTo(x + 16, y + 12);
  ctx.lineTo(x + 10, y + 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 34, y);
  ctx.lineTo(x - 10, y);
  ctx.stroke();
  if (on) {
    ctx.strokeStyle = Ink.electron;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 16);
    ctx.lineTo(x - 4, y + 16);
    ctx.stroke();
  }
  label(ctx, "G", x - 42, y - 12, { size: 10, color: Ink.muted });
  label(ctx, "D", x + 28, y - 26, { size: 10, color: Ink.muted });
  label(ctx, "S", x + 28, y + 26, { size: 10, color: Ink.muted });
}

export function dcMotor(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, running: number) {
  const on = Math.max(0, Math.min(1, running));
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 36, 0, Math.PI * 2);
  ctx.fillStyle = Ink.body;
  ctx.fill();
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = on > 0.05 ? Ink.electron : Ink.muted;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.moveTo(0, -18);
  ctx.lineTo(0, 18);
  ctx.stroke();
  ctx.fillStyle = Ink.package;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = Ink.pin;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 36, y - 12);
  ctx.lineTo(x - 52, y - 12);
  ctx.moveTo(x - 36, y + 12);
  ctx.lineTo(x - 52, y + 12);
  ctx.stroke();
  label(ctx, "+", x - 62, y - 12, { size: 11, color: Ink.text, align: "right" });
  label(ctx, "−", x - 62, y + 12, { size: 11, color: Ink.muted, align: "right" });
  label(ctx, "M", x, y + 52, { size: 12, color: Ink.text });
}

export function transformer(ctx: CanvasRenderingContext2D, x: number, y: number, flux = 0) {
  const left = x - 14;
  const right = x + 14;
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(left, y - 32);
  for (let i = 0; i < 4; i++) {
    ctx.arc(left, y - 24 + i * 16, 8, -Math.PI / 2, Math.PI / 2, true);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(right, y - 32);
  for (let i = 0; i < 4; i++) {
    ctx.arc(right, y - 24 + i * 16, 8, -Math.PI / 2, Math.PI / 2, false);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left - 28, y - 40);
  ctx.lineTo(left, y - 32);
  ctx.moveTo(left - 28, y + 40);
  ctx.lineTo(left, y + 32);
  ctx.moveTo(right + 28, y - 40);
  ctx.lineTo(right, y - 32);
  ctx.moveTo(right + 28, y + 40);
  ctx.lineTo(right, y + 32);
  ctx.stroke();
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 36);
  ctx.lineTo(x - 5, y + 36);
  ctx.moveTo(x + 5, y - 36);
  ctx.lineTo(x + 5, y + 36);
  ctx.stroke();
  if (flux > 0.04) {
    ctx.save();
    ctx.globalAlpha = 0.25 + flux * 0.5;
    ctx.strokeStyle = Ink.electron;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const yy = y - 12 + i * 12;
      ctx.beginPath();
      ctx.moveTo(x - 16, yy);
      ctx.lineTo(x + 16, yy);
      ctx.stroke();
    }
    ctx.restore();
  }
  return {
    priTop: { x: left - 28, y: y - 40 },
    priBot: { x: left - 28, y: y + 40 },
    secTop: { x: right + 28, y: y - 40 },
    secBot: { x: right + 28, y: y + 40 },
  };
}

export function potentiometer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number) {
  resistorBody(ctx, x, y, w, 1000, 0);
  const u = Math.max(0.08, Math.min(0.92, t));
  const wx = x + w * u;
  ctx.strokeStyle = Ink.electron;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wx, y - 22);
  ctx.lineTo(wx, y - 8);
  ctx.moveTo(wx - 6, y - 14);
  ctx.lineTo(wx, y - 8);
  ctx.lineTo(wx + 6, y - 14);
  ctx.stroke();
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wx, y - 22);
  ctx.lineTo(wx, y - 34);
  ctx.stroke();
  return { wiper: { x: wx, y: y - 34 } };
}
