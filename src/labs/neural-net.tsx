import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Control, LinearControl, Meter, Segmented, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { sigmoid } from "@/lib/nn";
import { useProgress } from "@/lib/progress";
import { clearSim, graphPaper, Ink, label, roundRect, withFrame } from "@/lib/sim/draw";

const LIT = "#5eead4";

type Gate = "XOR" | "AND";

type Weights = {
  h1: [number, number, number];
  h2: [number, number, number];
  y: [number, number, number];
};

const XOR_W: Weights = {
  h1: [8, 8, -12],
  h2: [8, 8, -4],
  y: [-16, 16, -8],
};

const AND_W: Weights = {
  h1: [8, 8, -12],
  h2: [8, 8, -12],
  y: [16, 0, -8],
};

const PAIRS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

function forward(x1: number, x2: number, w: Weights) {
  const h1 = sigmoid(w.h1[0] * x1 + w.h1[1] * x2 + w.h1[2]);
  const h2 = sigmoid(w.h2[0] * x1 + w.h2[1] * x2 + w.h2[2]);
  const y = sigmoid(w.y[0] * h1 + w.y[1] * h2 + w.y[2]);
  return { h1, h2, y };
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, act: number) {
  if (act > 0.08) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r * 2.4);
    g.addColorStop(0, LIT);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.12 + act * 0.5;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = act > 0.08 ? LIT : Ink.body;
  ctx.globalAlpha = act > 0.08 ? 0.2 + act * 0.8 : 1;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = act > 0.08 ? LIT : "rgba(128,128,128,0.35)";
  ctx.lineWidth = 1.7;
  ctx.stroke();
}

function edge(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  w: number,
) {
  const mag = Math.min(1, Math.abs(w) / 16);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = w >= 0 ? LIT : Ink.heat;
  ctx.globalAlpha = 0.25 + mag * 0.75;
  ctx.lineWidth = 1.2 + mag * 6;
  ctx.stroke();
  ctx.globalAlpha = 1;
  label(ctx, w.toFixed(0), (ax + bx) / 2, (ay + by) / 2 - 10, {
    size: 10,
    mono: true,
    color: w >= 0 ? Ink.text : Ink.heat,
  });
}

function shuffle(): Weights {
  const r = () => Math.round((Math.random() * 16 - 8) * 10) / 10;
  return { h1: [r(), r(), r()], h2: [r(), r(), r()], y: [r(), r(), r()] };
}

export function NeuralNetLab() {
  const lab = LAB_BY_SLUG["neural-net"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [gate, setGate] = useState<Gate>("XOR");
  const [x1, setX1] = useState(true);
  const [x2, setX2] = useState(false);
  const [w, setW] = useState<Weights>(XOR_W);

  const applyGate = (g: Gate) => {
    setGate(g);
    setW(g === "XOR" ? XOR_W : AND_W);
  };

  const a = x1 ? 1 : 0;
  const c = x2 ? 1 : 0;
  const live = forward(a, c, w);
  const fire = live.y > 0.5;
  const params = useRef({ a, c, w, live, fire, gate });
  params.current = { a, c, w, live, fire, gate };

  const insight = useMemo(() => {
    const bits = `${a}${c}`;
    if (gate === "XOR") {
      return `Two hidden units bend the plane. ${bits} maps to ${live.y.toFixed(2)}, so the output is ${fire ? "1" : "0"}.`;
    }
    return `AND of ${bits} is ${fire ? "1" : "0"} (${live.y.toFixed(2)}). Shuffle the weights to watch it fall apart.`;
  }, [a, c, fire, gate, live.y]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="h1" value={live.h1.toFixed(2)} />
          <Meter label="h2" value={live.h2.toFixed(2)} />
          <Meter label="y" value={`${live.y.toFixed(2)}  ${fire ? "fire" : "quiet"}`} />
        </>
      }
      controls={
        <>
          <Control label="Preset">
            <Segmented
              value={gate}
              onChange={applyGate}
              options={[
                { id: "XOR", label: "XOR" },
                { id: "AND", label: "AND" },
              ]}
            />
          </Control>
          <ToggleControl label="Input x1" checked={x1} on="1" off="0" onCheckedChange={setX1} />
          <ToggleControl label="Input x2" checked={x2} on="1" off="0" onCheckedChange={setX2} />
          <LinearControl
            label="out from h1"
            value={w.y[0]}
            display={w.y[0].toFixed(1)}
            min={-20}
            max={20}
            step={0.5}
            onChange={(n) => setW((prev) => ({ ...prev, y: [n, prev.y[1], prev.y[2]] }))}
          />
          <LinearControl
            label="out from h2"
            value={w.y[1]}
            display={w.y[1].toFixed(1)}
            min={-20}
            max={20}
            step={0.5}
            onChange={(n) => setW((prev) => ({ ...prev, y: [prev.y[0], n, prev.y[2]] }))}
          />
          <Button variant="secondary" onClick={() => setW(shuffle())}>
            Shuffle weights
          </Button>
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
              const i1 = { x: 90, y: 90 };
              const i2 = { x: 90, y: 210 };
              const h1 = { x: 300, y: 90 };
              const h2 = { x: 300, y: 210 };
              const o = { x: 520, y: 150 };

              edge(ctx, i1.x + 20, i1.y, h1.x - 22, h1.y, p.w.h1[0]);
              edge(ctx, i2.x + 20, i2.y, h1.x - 22, h1.y, p.w.h1[1]);
              edge(ctx, i1.x + 20, i1.y, h2.x - 22, h2.y, p.w.h2[0]);
              edge(ctx, i2.x + 20, i2.y, h2.x - 22, h2.y, p.w.h2[1]);
              edge(ctx, h1.x + 22, h1.y, o.x - 24, o.y, p.w.y[0]);
              edge(ctx, h2.x + 22, h2.y, o.x - 24, o.y, p.w.y[1]);

              glow(ctx, i1.x, i1.y, 20, p.a);
              glow(ctx, i2.x, i2.y, 20, p.c);
              glow(ctx, h1.x, h1.y, 22, p.live.h1);
              glow(ctx, h2.x, h2.y, 22, p.live.h2);
              glow(ctx, o.x, o.y, 26, p.fire ? 1 : 0);

              label(ctx, "x1", i1.x, i1.y, { size: 12, color: Ink.text });
              label(ctx, "x2", i2.x, i2.y, { size: 12, color: Ink.text });
              label(ctx, "h1", h1.x, h1.y, { size: 12, color: Ink.text });
              label(ctx, "h2", h2.x, h2.y, { size: 12, color: Ink.text });
              label(ctx, p.fire ? "1" : "0", o.x, o.y, { size: 16, color: Ink.text });
              label(ctx, "hidden", 300, 38, { size: 11, color: Ink.muted });
              label(ctx, "out", 520, 108, { size: 11, color: Ink.muted });

              const tx = 620;
              const ty = 70;
              roundRect(ctx, tx - 16, ty - 28, 160, 200, 10);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.22)";
              ctx.stroke();
              label(ctx, p.gate + " table", tx + 64, ty - 10, { size: 12, color: Ink.text });
              PAIRS.forEach(([u, v], i) => {
                const row = forward(u, v, p.w);
                const pred = row.y > 0.5 ? 1 : 0;
                const want = p.gate === "XOR" ? [0, 1, 1, 0][i] : [0, 0, 0, 1][i];
                const ok = pred === want;
                const yy = ty + 24 + i * 36;
                label(ctx, `${u}${v}`, tx + 18, yy, { size: 13, mono: true, color: Ink.muted });
                ctx.beginPath();
                ctx.arc(tx + 78, yy, 9, 0, Math.PI * 2);
                ctx.fillStyle = pred === 1 ? LIT : Ink.body;
                ctx.fill();
                ctx.strokeStyle = ok ? LIT : Ink.heat;
                ctx.lineWidth = 2;
                ctx.stroke();
                label(ctx, String(pred), tx + 78, yy, { size: 11, color: Ink.text });
                label(ctx, ok ? "ok" : "miss", tx + 118, yy, {
                  size: 11,
                  color: ok ? LIT : Ink.heat,
                });
              });

              label(ctx, "h = sigmoid(Wx + b)", 400, 392, { mono: true, size: 13, color: Ink.text });
            });
          }}
        />
      }
    />
  );
}
