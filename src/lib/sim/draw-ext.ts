import { Ink } from "./ink";
import { label } from "./draw";

export function pMosfet(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean) {
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
  // High-side P-MOS: S at top (+V), D at bottom (load)
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 12);
  ctx.lineTo(x + 16, y - 12);
  ctx.lineTo(x + 16, y - 34);
  ctx.moveTo(x - 4, y + 12);
  ctx.lineTo(x + 16, y + 12);
  ctx.lineTo(x + 16, y + 34);
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + 16, y);
  ctx.lineTo(x + 16, y - 12);
  ctx.stroke();
  // IEEE P-MOS: arrow on source/bulk pointing OUT away from channel
  ctx.beginPath();
  ctx.moveTo(x + 14, y);
  ctx.lineTo(x + 4, y - 5);
  ctx.lineTo(x + 4, y + 5);
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
  label(ctx, "S", x + 28, y - 26, { size: 10, color: Ink.muted });
  label(ctx, "D", x + 28, y + 26, { size: 10, color: Ink.muted });
  return {
    g: { x: x - 34, y },
    s: { x: x + 16, y: y - 34 },
    d: { x: x + 16, y: y + 34 },
  };
}

/** AC motor / winding: unlabeled circle + shaft. No DC +/- polarity. */
export function acMotor(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, running: number) {
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
  // Terminal stubs without polarity marks
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 36, y - 12);
  ctx.lineTo(x - 52, y - 12);
  ctx.moveTo(x - 36, y + 12);
  ctx.lineTo(x - 52, y + 12);
  ctx.stroke();
  label(ctx, "M", x, y + 52, { size: 12, color: Ink.text });
  return {
    a: { x: x - 52, y: y - 12 },
    b: { x: x - 52, y: y + 12 },
  };
}

/** LED symbol: diode triangle + cathode bar + emission arrows + A/K. */
export function ledSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  brightness: number,
  scale = 1,
) {
  const s = 16 * scale;
  const on = Math.max(0, Math.min(1, brightness));
  ctx.save();
  if (on > 0.02) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, 40);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.15 + on * 0.5;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = on > 0.04 ? color : Ink.pin;
  ctx.globalAlpha = on > 0.04 ? 0.35 + on * 0.55 : 1;
  ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.85);
  ctx.lineTo(x + s * 0.15, y);
  ctx.lineTo(x - s, y + s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.2, y - s * 0.85);
  ctx.lineTo(x + s * 0.2, y + s * 0.85);
  ctx.stroke();
  ctx.strokeStyle = Ink.copper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - s - 10, y);
  ctx.lineTo(x - s, y);
  ctx.moveTo(x + s * 0.2, y);
  ctx.lineTo(x + s + 10, y);
  ctx.stroke();
  // Emission arrows
  ctx.strokeStyle = on > 0.04 ? color : Ink.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 2, y - s - 4);
  ctx.lineTo(x + 10, y - s - 16);
  ctx.moveTo(x + 6, y - s - 2);
  ctx.lineTo(x + 18, y - s - 14);
  ctx.stroke();
  ctx.restore();
  const anode = { x: x - s - 10, y };
  const cathode = { x: x + s + 10, y };
  label(ctx, "A", anode.x, y + s + 8, { size: 10, color: Ink.muted });
  label(ctx, "K", cathode.x, y + s + 8, { size: 10, color: Ink.muted });
  return { anode, cathode };
}
