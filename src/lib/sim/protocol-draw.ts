import { Ink, label, roundRect } from "@/lib/sim/draw";
import { fieldAt, type Field, type Trace } from "@/lib/sim/protocol";

export function icChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  sub?: string,
) {
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = Ink.package;
  ctx.fill();
  ctx.strokeStyle = "rgba(128,128,128,0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();
  label(ctx, title, x + w / 2, y + 18, { size: 13, color: Ink.text, mono: true });
  if (sub) label(ctx, sub, x + w / 2, y + 34, { size: 10, color: Ink.muted });
}

export function pinLed(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean, name: string, align: "left" | "right") {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = on ? Ink.electron : Ink.body;
  ctx.fill();
  ctx.strokeStyle = "rgba(128,128,128,0.3)";
  ctx.stroke();
  label(ctx, name, align === "left" ? x - 10 : x + 10, y, {
    size: 10,
    mono: true,
    align: align === "left" ? "right" : "left",
    color: on ? Ink.electron : Ink.muted,
  });
}

function levelY(v: number, top: number, bot: number) {
  if (v > 0.75) return top;
  if (v < 0.25) return bot;
  return (top + bot) / 2;
}

export function drawTiming(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  trace: Trace,
  cursor: number,
) {
  const n = trace.lanes[0]?.samples.length ?? 1;
  const laneH = h / Math.max(1, trace.lanes.length);
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = Ink.scope;
  ctx.fill();
  ctx.strokeStyle = "rgba(128,128,128,0.18)";
  ctx.stroke();

  const left = x + 52;
  const right = x + w - 10;
  const span = Math.max(1, n - 1);

  trace.lanes.forEach((lane, li) => {
    const top = y + li * laneH + 10;
    const bot = y + (li + 1) * laneH - 8;
    label(ctx, lane.name, x + 26, (top + bot) / 2, { size: 10, mono: true, color: Ink.muted });
    ctx.beginPath();
    ctx.strokeStyle = li === 0 ? Ink.electron : Ink.pin;
    ctx.lineWidth = 1.5;
    lane.samples.forEach((v, i) => {
      const px = left + (i / span) * (right - left);
      const py = levelY(v, top, bot);
      if (i === 0) ctx.moveTo(px, py);
      else {
        const prev = levelY(lane.samples[i - 1]!, top, bot);
        const pxs = left + ((i - 0.5) / span) * (right - left);
        ctx.lineTo(pxs, prev);
        ctx.lineTo(pxs, py);
        ctx.lineTo(px, py);
      }
    });
    ctx.stroke();
  });

  if (n > 1) {
    const cx = left + (Math.max(0, Math.min(n - 1, cursor)) / span) * (right - left);
    ctx.beginPath();
    ctx.strokeStyle = Ink.electron;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.moveTo(cx, y + 4);
    ctx.lineTo(cx, y + h - 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function drawFields(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  fields: Field[],
  cursor: number,
) {
  if (fields.length === 0) return;
  const last = fields[fields.length - 1]!.end;
  const span = Math.max(1, last);
  fields.forEach((f, i) => {
    const x0 = x + (f.start / span) * w;
    const x1 = x + (f.end / span) * w;
    const live = cursor >= f.start && cursor < f.end;
    roundRect(ctx, x0 + 1, y, Math.max(4, x1 - x0 - 2), 18, 3);
    ctx.fillStyle = live ? Ink.electron : i % 2 === 0 ? Ink.body : Ink.bodyHi;
    ctx.globalAlpha = live ? 0.35 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (x1 - x0 > 28) {
      label(ctx, f.label, (x0 + x1) / 2, y + 9, {
        size: 9,
        mono: true,
        color: live ? Ink.text : Ink.muted,
      });
    }
  });
}

export function decodeLine(trace: Trace, cursor: number) {
  const f = fieldAt(trace, cursor);
  if (!f) return "idle";
  return f.detail ? `${f.label}  ·  ${f.detail}` : f.label;
}
