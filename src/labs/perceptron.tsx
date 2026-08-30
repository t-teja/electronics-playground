import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, Meter, Segmented, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import { clearSim, graphPaper, Ink, label, withFrame } from "@/lib/sim/draw";

const LIT = "#5eead4";

type Gate = "AND" | "OR" | "NAND" | "XOR";

const PRESETS: Record<Gate, { w1: number; w2: number; b: number; want: number[] }> = {
  AND: { w1: 1, w2: 1, b: -1.5, want: [0, 0, 0, 1] },
  OR: { w1: 1, w2: 1, b: -0.5, want: [0, 1, 1, 1] },
  NAND: { w1: -1, w2: -1, b: 1.5, want: [1, 1, 1, 0] },
  XOR: { w1: 1, w2: 1, b: -1, want: [0, 1, 1, 0] },
};

const PAIRS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

function step(z: number) {
  return z >= 0 ? 1 : 0;
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, on: boolean) {
  if (on) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r * 2.6);
    g.addColorStop(0, LIT);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = on ? LIT : Ink.body;
  ctx.fill();
  ctx.strokeStyle = on ? LIT : "rgba(128,128,128,0.35)";
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

function edge(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  w: number,
  caption: string,
) {
  const mag = Math.min(1, Math.abs(w) / 2);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = w >= 0 ? LIT : Ink.heat;
  ctx.globalAlpha = 0.3 + mag * 0.7;
  ctx.lineWidth = 1.4 + mag * 5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  label(ctx, caption, (ax + bx) / 2, (ay + by) / 2 - 12, {
    size: 11,
    mono: true,
    color: w >= 0 ? Ink.text : Ink.heat,
  });
}

export function PerceptronLab() {
  const lab = LAB_BY_SLUG.perceptron!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [gate, setGate] = useState<Gate>("AND");
  const [x1, setX1] = useState(true);
  const [x2, setX2] = useState(true);
  const [w1, setW1] = useState(1);
  const [w2, setW2] = useState(1);
  const [b, setB] = useState(-1.5);

  const applyGate = (g: Gate) => {
    setGate(g);
    const p = PRESETS[g];
    setW1(p.w1);
    setW2(p.w2);
    setB(p.b);
  };

  const a = x1 ? 1 : 0;
  const c = x2 ? 1 : 0;
  const z = w1 * a + w2 * c + b;
  const y = step(z);
  const params = useRef({ a, c, w1, w2, b, z, y, gate });
  params.current = { a, c, w1, w2, b, z, y, gate };

  const insight = useMemo(() => {
    if (gate === "XOR") {
      return "XOR needs a bent boundary. One straight cut cannot isolate both 1s. Open Neural net for that.";
    }
    if (y === 1) {
      return `Weighted sum ${z.toFixed(2)} is at or above zero, so the neuron fires.`;
    }
    return `Weighted sum ${z.toFixed(2)} stays below zero, so the neuron stays quiet.`;
  }, [gate, y, z]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Sum z" value={z.toFixed(2)} />
          <Meter label="Output" value={y === 1 ? "fire" : "quiet"} />
          <Meter label="Gate" value={gate} />
        </>
      }
      controls={
        <>
          <Control label="Try a gate">
            <Segmented
              value={gate}
              onChange={applyGate}
              options={[
                { id: "AND", label: "AND" },
                { id: "OR", label: "OR" },
                { id: "NAND", label: "NAND" },
                { id: "XOR", label: "XOR" },
              ]}
            />
          </Control>
          <ToggleControl label="Input x1" checked={x1} on="1" off="0" onCheckedChange={setX1} />
          <ToggleControl label="Input x2" checked={x2} on="1" off="0" onCheckedChange={setX2} />
          <LinearControl label="Weight w1" value={w1} display={w1.toFixed(2)} min={-2} max={2} step={0.05} onChange={setW1} />
          <LinearControl label="Weight w2" value={w2} display={w2.toFixed(2)} min={-2} max={2} step={0.05} onChange={setW2} />
          <LinearControl label="Bias b" value={b} display={b.toFixed(2)} min={-2} max={2} step={0.05} onChange={setB} />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size) => {
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const in1 = { x: 110, y: 88 };
              const in2 = { x: 110, y: 200 };
              const sum = { x: 310, y: 144 };
              const out = { x: 500, y: 144 };

              edge(ctx, in1.x + 22, in1.y, sum.x - 28, sum.y - 8, p.w1, `w1 ${p.w1.toFixed(1)}`);
              edge(ctx, in2.x + 22, in2.y, sum.x - 28, sum.y + 8, p.w2, `w2 ${p.w2.toFixed(1)}`);
              edge(ctx, sum.x + 28, sum.y, out.x - 26, out.y, 1, "step");

              glow(ctx, in1.x, in1.y, 22, p.a === 1);
              glow(ctx, in2.x, in2.y, 22, p.c === 1);
              glow(ctx, sum.x, sum.y, 28, p.y === 1);
              glow(ctx, out.x, out.y, 26, p.y === 1);

              label(ctx, "x1", in1.x, in1.y, { size: 12, color: Ink.text });
              label(ctx, "x2", in2.x, in2.y, { size: 12, color: Ink.text });
              label(ctx, p.z.toFixed(2), sum.x, sum.y, { size: 13, mono: true, color: Ink.text });
              label(ctx, p.y === 1 ? "1" : "0", out.x, out.y, { size: 16, color: Ink.text });
              label(ctx, "bias " + p.b.toFixed(1), sum.x, sum.y + 44, { size: 11, mono: true });

              const ox = 590;
              const oy = 54;
              const s = 150;
              ctx.strokeStyle = "rgba(128,128,128,0.35)";
              ctx.lineWidth = 1.2;
              ctx.strokeRect(ox, oy, s, s);
              label(ctx, "x2", ox - 16, oy + s / 2, { size: 10 });
              label(ctx, "x1", ox + s / 2, oy + s + 16, { size: 10 });

              const want = PRESETS[p.gate].want;
              PAIRS.forEach(([u, v], i) => {
                const px = ox + u * s;
                const py = oy + (1 - v) * s;
                const pred = step(p.w1 * u + p.w2 * v + p.b);
                const ok = pred === want[i];
                ctx.beginPath();
                ctx.arc(px, py, 8, 0, Math.PI * 2);
                ctx.fillStyle = pred === 1 ? LIT : Ink.body;
                ctx.fill();
                ctx.strokeStyle = ok ? LIT : Ink.heat;
                ctx.lineWidth = 2;
                ctx.stroke();
                label(ctx, `${u}${v}`, px, py + (v === 0 ? 18 : -18), { size: 10, mono: true });
              });

              ctx.beginPath();
              ctx.strokeStyle = Ink.text;
              ctx.lineWidth = 1.6;
              const eps = 0.04;
              if (Math.abs(p.w2) >= eps) {
                let started = false;
                for (let t = 0; t <= 1.001; t += 0.02) {
                  const yy = -(p.w1 * t + p.b) / p.w2;
                  if (yy < -0.05 || yy > 1.05) {
                    started = false;
                    continue;
                  }
                  const px = ox + t * s;
                  const py = oy + (1 - Math.max(0, Math.min(1, yy))) * s;
                  if (!started) {
                    ctx.moveTo(px, py);
                    started = true;
                  } else ctx.lineTo(px, py);
                }
              } else if (Math.abs(p.w1) >= eps) {
                const xx = -p.b / p.w1;
                if (xx >= 0 && xx <= 1) {
                  ctx.moveTo(ox + xx * s, oy);
                  ctx.lineTo(ox + xx * s, oy + s);
                }
              }
              ctx.stroke();
              label(ctx, "decision line  z = 0", ox + s / 2, oy - 16, { size: 11 });

              label(ctx, "y = step(w1 x1 + w2 x2 + b)", 400, 392, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
            });
          }}
        />
      }
    />
  );
}
