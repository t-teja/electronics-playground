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
  label(ctx, "\u2212", x - 22, y, { size: 16, color: Ink.muted, align: "right" });
  return { pos: { x: x + 16, y }, neg: { x: x - 16, y } };
}

/** IEC earth: stem plus three decreasing bars. Tip is the wire attachment. */
export function gnd(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = Ink.pin;
  ctx.lineCap = "butt";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 8);
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 8);
  ctx.lineTo(x + 14, y + 8);
  ctx.moveTo(x - 9, y + 14);
  ctx.lineTo(x + 9, y + 14);
  ctx.moveTo(x - 4, y + 20);
  ctx.lineTo(x + 4, y + 20);
  ctx.stroke();
  return { x, y };
}

/** Circle + sine. Vertical leads for transformer / AC benches. */
export function acSource(ctx: CanvasRenderingContext2D, x: number, y: number, r = 22) {
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = Ink.electron;
  ctx.lineWidth = 1.8;
  const a = r * 0.58;
  ctx.moveTo(x - a, y);
  ctx.bezierCurveTo(x - a * 0.5, y - a, x, y - a, x, y);
  ctx.bezierCurveTo(x, y + a, x + a * 0.5, y + a, x + a, y);
  ctx.stroke();
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y - r - 10);
  ctx.moveTo(x, y + r);
  ctx.lineTo(x, y + r + 10);
  ctx.stroke();
  label(ctx, "~", x + r + 12, y, { size: 14, color: Ink.text, align: "left" });
  return { top: { x, y: y - r - 10 }, bot: { x, y: y + r + 10 } };
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

export function diodeSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  flip = false,
) {
  const s = 16 * scale;
  const dir = flip ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = Ink.pin;
  ctx.beginPath();
  ctx.moveTo(-s, -s * 0.85);
  ctx.lineTo(s * 0.15, 0);
  ctx.lineTo(-s, s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(s * 0.2, -s * 0.85);
  ctx.lineTo(s * 0.2, s * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s - 10, 0);
  ctx.lineTo(-s, 0);
  ctx.moveTo(s * 0.2, 0);
  ctx.lineTo(s + 10, 0);
  ctx.stroke();
  ctx.restore();
  const anode = { x: x - dir * (s + 10), y };
  const cathode = { x: x + dir * (s + 10), y };
  label(ctx, "A", anode.x, y + s + 6, { size: 10, color: Ink.muted });
  label(ctx, "K", cathode.x, y + s + 6, { size: 10, color: Ink.muted });
  return { anode, cathode };
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
  return { anode: { x: x - 5, y: y + 34 }, cathode: { x: x + 5, y: y + 26 } };
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
  return { left: { x: x - 28, y }, right: { x: x + 28, y } };
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size = 7,
) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(ang - 0.42), y2 - size * Math.sin(ang - 0.42));
  ctx.lineTo(x2 - size * Math.cos(ang + 0.42), y2 - size * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fillStyle = Ink.pin;
  ctx.fill();
}

/** IEEE NPN/PNP in a circle. Emitter arrow out for NPN, in for PNP. */
export function bjtSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: "npn" | "pnp",
) {
  const r = 34;
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  const barX = x - 10;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(barX, y - 16);
  ctx.lineTo(barX, y + 16);
  ctx.stroke();

  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(barX, y);
  ctx.stroke();

  const c = { x: x + 16, y: y - 34 };
  const e = { x: x + 16, y: y + 34 };
  const b = { x: x - r, y };

  ctx.beginPath();
  ctx.moveTo(barX, y - 10);
  ctx.lineTo(x + 16, y - 18);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(barX, y + 10);
  ctx.lineTo(x + 16, y + 18);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();

  if (kind === "npn") {
    arrowHead(ctx, barX + 2, y + 11, x + 11, y + 16.5, 8);
  } else {
    arrowHead(ctx, x + 12, y + 17, barX + 3, y + 11.2, 8);
  }

  label(ctx, "C", x + 28, y - 26, { size: 10, color: Ink.muted });
  label(ctx, "B", x - 42, y - 12, { size: 10, color: Ink.muted });
  label(ctx, "E", x + 28, y + 26, { size: 10, color: Ink.muted });
  return { c, b, e };
}

/** N-channel enhancement MOSFET. Arrow on source/bulk points IN toward the channel. */
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
  // IEEE N-MOS: arrow on source/bulk pointing IN toward the channel
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + 14, y - 5);
  ctx.lineTo(x + 14, y + 5);
  ctx.closePath();
  ctx.fillStyle = Ink.pin;
  ctx.fill();
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
  return {
    g: { x: x - 34, y },
    d: { x: x + 16, y: y - 34 },
    s: { x: x + 16, y: y + 34 },
  };
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
  label(ctx, "\u2212", x - 62, y + 12, { size: 11, color: Ink.muted, align: "right" });
  label(ctx, "M", x, y + 52, { size: 12, color: Ink.text });
}

export function transformer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flux = 0,
  np = 12,
  ns = 12,
) {
  const priN = Math.max(3, Math.min(10, Math.round(np / 4)));
  const secN = Math.max(3, Math.min(10, Math.round(ns / 4)));
  const pitch = 12;
  const coilR = 7;
  const left = x - 16;
  const right = x + 16;
  const priH = (priN - 1) * pitch + coilR * 2;
  const secH = (secN - 1) * pitch + coilR * 2;
  const priTopY = y - priH / 2;
  const priBotY = y + priH / 2;
  const secTopY = y - secH / 2;
  const secBotY = y + secH / 2;
  const coreTop = Math.min(priTopY, secTopY) - 4;
  const coreBot = Math.max(priBotY, secBotY) + 4;

  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(left, priTopY);
  for (let i = 0; i < priN; i++) {
    ctx.arc(left, priTopY + coilR + i * pitch, coilR, -Math.PI / 2, Math.PI / 2, true);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(right, secTopY);
  for (let i = 0; i < secN; i++) {
    ctx.arc(right, secTopY + coilR + i * pitch, coilR, -Math.PI / 2, Math.PI / 2, false);
  }
  ctx.stroke();

  const lead = 28;
  ctx.beginPath();
  ctx.moveTo(left - lead, priTopY - 8);
  ctx.lineTo(left, priTopY);
  ctx.moveTo(left - lead, priBotY + 8);
  ctx.lineTo(left, priBotY);
  ctx.moveTo(right + lead, secTopY - 8);
  ctx.lineTo(right, secTopY);
  ctx.moveTo(right + lead, secBotY + 8);
  ctx.lineTo(right, secBotY);
  ctx.stroke();

  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 5, coreTop);
  ctx.lineTo(x - 5, coreBot);
  ctx.moveTo(x + 5, coreTop);
  ctx.lineTo(x + 5, coreBot);
  ctx.stroke();

  // phasing dots: primary top and secondary top (in phase)
  ctx.fillStyle = Ink.pin;
  ctx.beginPath();
  ctx.arc(left - 11, priTopY + 5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(right + 11, secTopY + 5, 3.2, 0, Math.PI * 2);
  ctx.fill();

  if (flux > 0.04) {
    ctx.save();
    ctx.globalAlpha = 0.25 + flux * 0.5;
    ctx.strokeStyle = Ink.electron;
    ctx.lineWidth = 1.4;
    const span = coreBot - coreTop;
    for (let i = 0; i < 3; i++) {
      const yy = coreTop + span * (0.28 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(x - 16, yy);
      ctx.lineTo(x + 16, yy);
      ctx.stroke();
    }
    ctx.restore();
  }
  return {
    priTop: { x: left - lead, y: priTopY - 8 },
    priBot: { x: left - lead, y: priBotY + 8 },
    secTop: { x: right + lead, y: secTopY - 8 },
    secBot: { x: right + lead, y: secBotY + 8 },
  };
}

export function potentiometer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  t: number,
  ohm = 1000,
) {
  resistorBody(ctx, x, y, w, ohm, 0);
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
  label(ctx, "1", x - 16, y + 18, { size: 10, color: Ink.muted });
  label(ctx, "wiper", wx, y - 46, { size: 10, color: Ink.muted });
  label(ctx, "3", x + w + 16, y + 18, { size: 10, color: Ink.muted });
  return { wiper: { x: wx, y: y - 34 }, left: { x: x - 10, y }, right: { x: x + w + 10, y } };
}

export function relayBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  energized: boolean,
) {
  roundRect(ctx, x - 70, y - 48, 140, 96, 8);
  ctx.fillStyle = Ink.package;
  ctx.fill();
  ctx.strokeStyle = "rgba(128,128,128,0.22)";
  ctx.stroke();

  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.arc(x - 38, y - 18 + i * 10, 5, Math.PI, 0, false);
  }
  ctx.stroke();
  label(ctx, "coil", x - 38, y + 32, { size: 10, color: Ink.muted });

  const com = { x: x + 36, y: y + 8 };
  const nc = { x: x + 54, y: y - 22 };
  const no = { x: x + 54, y: y + 28 };
  ctx.fillStyle = Ink.pin;
  ctx.beginPath();
  ctx.arc(com.x, com.y, 3.2, 0, Math.PI * 2);
  ctx.arc(nc.x, nc.y, 3.2, 0, Math.PI * 2);
  ctx.arc(no.x, no.y, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = energized ? Ink.electron : Ink.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(com.x, com.y);
  if (energized) ctx.lineTo(no.x - 4, no.y);
  else ctx.lineTo(nc.x - 4, nc.y);
  ctx.stroke();
  label(ctx, "NC", nc.x + 16, nc.y, { size: 10, align: "left" });
  label(ctx, "NO", no.x + 16, no.y, { size: 10, align: "left" });
  label(ctx, "COM", com.x - 8, com.y + 18, { size: 10 });
  label(ctx, energized ? "pulled in" : "released", x, y - 62, {
    size: 12,
    color: energized ? Ink.electron : Ink.muted,
  });
  return {
    coilTop: { x: x - 38, y: y - 28 },
    coilBot: { x: x - 38, y: y + 18 },
    com,
    nc,
    no,
  };
}
