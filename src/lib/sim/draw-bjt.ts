import { Ink } from "./ink";
import { label } from "./draw";

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

/** IEEE NPN/PNP in a circle. Emitter arrow out for NPN, in for PNP.
 *  flipVertical: swap C/E for high-side PNP (E toward +VCC at top). */
export function bjtSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: "npn" | "pnp",
  opts?: { flipVertical?: boolean },
) {
  const flip = !!opts?.flipVertical;
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

  const top = { x: x + 16, y: y - 34 };
  const bot = { x: x + 16, y: y + 34 };
  const b = { x: x - r, y };
  // Default: C top, E bottom. High-side PNP: E top (to +VCC), C bottom (to load).
  const c = flip ? bot : top;
  const e = flip ? top : bot;

  ctx.beginPath();
  ctx.moveTo(barX, y - 10);
  ctx.lineTo(x + 16, y - 18);
  ctx.lineTo(top.x, top.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(barX, y + 10);
  ctx.lineTo(x + 16, y + 18);
  ctx.lineTo(bot.x, bot.y);
  ctx.stroke();

  if (kind === "npn") {
    // Arrow on emitter branch (bottom unless flipped)
    if (flip) arrowHead(ctx, barX + 2, y - 11, x + 11, y - 16.5, 8);
    else arrowHead(ctx, barX + 2, y + 11, x + 11, y + 16.5, 8);
  } else {
    // PNP: arrow into the bar on the emitter branch
    if (flip) arrowHead(ctx, x + 12, y - 17, barX + 3, y - 11.2, 8);
    else arrowHead(ctx, x + 12, y + 17, barX + 3, y + 11.2, 8);
  }

  label(ctx, "C", x + 28, flip ? y + 26 : y - 26, { size: 10, color: Ink.muted });
  label(ctx, "B", x - 42, y - 12, { size: 10, color: Ink.muted });
  label(ctx, "E", x + 28, flip ? y - 26 : y + 26, { size: 10, color: Ink.muted });
  return { c, b, e };
}
