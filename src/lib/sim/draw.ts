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
