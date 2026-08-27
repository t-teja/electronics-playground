import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatAmp, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  diodeSymbol,
  graphPaper,
  Ink,
  label,
  pnJunction,
  scope,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

function shockley(v: number) {
  const is = 1e-12;
  const nVt = 0.026 * 1.8;
  const raw = is * (Math.exp(Math.min(v, 0.9) / nVt) - 1);
  if (v < -50) return -1e-6;
  return Math.max(-1e-6, Math.min(raw, 0.08));
}

export function DiodeLab() {
  const lab = LAB_BY_SLUG.diode!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [v, setV] = useState(0.8);
  const i = shockley(v);
  const flow = useRef(new ElectronFlow());
  const holes = useRef(new ElectronFlow());
  const samples = useRef<number[]>(Array(80).fill(0.5));
  const params = useRef({ v, i });
  params.current = { v, i };

  const insight = useMemo(() => {
    if (v >= 0.7) {
      return `Forward biased at ${formatVolt(v)}. The depletion wall is thin; electrons from N and holes from P flood the junction. Current is ${formatAmp(i)} — the valve is open.`;
    }
    if (v > 0.2) {
      return `Approaching the silicon threshold. Below ~0.7 V the barrier still stops most carriers. Watch the depletion region shrink as you raise voltage.`;
    }
    if (v >= 0) {
      return `Barely biased. The built-in potential of the PN junction (~0.7 V for silicon) still owns the story. Current is a trickle.`;
    }
    return `Reverse biased at ${formatVolt(v)}. The depletion region widens into an insulator. Only a tiny saturation current leaks through. This is why diodes rectify.`;
  }, [v, i]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Bias" value={formatVolt(v)} />
          <Meter label="Current" value={formatAmp(i)} />
          <Meter label="State" value={v >= 0.7 ? "conducting" : v < 0 ? "blocking" : "threshold"} />
        </>
      }
      controls={
        <LinearControl
          label="Bias voltage"
          value={v}
          display={formatVolt(v)}
          min={-5}
          max={1.2}
          step={0.01}
          onChange={setV}
          hint="Negative is reverse. Silicon turns on near +0.7 V."
        />
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            samples.current.push((p.v + 5) / 6.2);
            if (samples.current.length > 100) samples.current.shift();
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const y = 110;
              battery(ctx, 70, y);
              diodeSymbol(ctx, 400, y, 1.15);
              wire(ctx, [
                { x: 88, y },
                { x: 372, y },
              ]);
              wire(ctx, [
                { x: 428, y },
                { x: 700, y },
                { x: 700, y: 190 },
                { x: 70, y: 190 },
                { x: 70, y: y + 28 },
              ]);
              label(ctx, p.v >= 0 ? "forward" : "reverse", 400, y - 40, { size: 12 });
              label(ctx, formatVolt(p.v), 70, y + 52, { mono: true, size: 12 });

              const deplete = p.v >= 0 ? Math.max(0.08, 1 - p.v / 0.85) : Math.min(1, 0.55 + Math.abs(p.v) / 8);
              const j = pnJunction(ctx, 160, 220, 480, 110, deplete);

              const nE: Pt[] = [
                { x: 620, y: 275 },
                { x: j.mid + 8, y: 275 },
              ];
              const pH: Pt[] = [
                { x: 180, y: 275 },
                { x: j.mid - 8, y: 275 },
              ];
              const conducting = p.v >= 0.7;
              flow.current.setPath(nE, false);
              flow.current.set(conducting ? 16 : 4, conducting ? -70 : -12);
              flow.current.step(dt);
              flow.current.draw(ctx);
              holes.current.kind = "hole";
              holes.current.glow = false;
              holes.current.setPath(pH, false);
              holes.current.set(conducting ? 16 : 4, conducting ? 70 : 12);
              holes.current.step(dt);
              holes.current.draw(ctx);

              if (conducting) {
                for (let k = 0; k < 4; k++) {
                  const px = j.mid + Math.sin(t * 6 + k) * 10;
                  ctx.globalAlpha = 0.35;
                  ctx.fillStyle = Ink.text;
                  ctx.beginPath();
                  ctx.arc(px, 275 + Math.cos(t * 5 + k) * 8, 1.4, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.globalAlpha = 1;
                }
              }

              label(ctx, "depletion", j.mid, 210, { size: 10 });
              scope(ctx, 560, 28, 200, 72, samples.current, Ink.electron, "bias");
              label(ctx, "I = Is (e^{V/nVt} − 1)", 400, 392, { mono: true, size: 13, color: Ink.text });
            });
          }}
        />
      }
    />
  );
}
