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
  junction,
  label,
  ledDome,
  pnJunction,
  resistorBody,
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
  const loop = useRef(new ElectronFlow());
  const samples = useRef<number[]>(Array(80).fill(0.5));
  const params = useRef({ v, i });
  params.current = { v, i };

  const insight = useMemo(() => {
    if (v >= 0.7) {
      return `Forward biased at ${formatVolt(v)}. The depletion wall is thin; electrons from N and holes from P flood the junction. Current is ${formatAmp(i)} - the LED lights.`;
    }
    if (v > 0.2) {
      return `Approaching the silicon threshold. Below ~0.7 V the barrier still stops most carriers, so the LED stays dark.`;
    }
    if (v >= 0) {
      return `Barely biased. The built-in potential of the PN junction (~0.7 V for silicon) still owns the story. The LED is off.`;
    }
    return `Reverse biased at ${formatVolt(v)}. The depletion region widens into an insulator, so the LED stays off.`;
  }, [v, i]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Bias" value={formatVolt(v)} />
          <Meter label="Current" value={formatAmp(i)} />
          <Meter label="LED" value={v >= 0.7 ? "on" : "off"} />
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
          hint="Silicon conducts near 0.7 V. That's when the LED lights."
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
              const botY = 190;
              const bat = battery(ctx, 70, y);
              const d = diodeSymbol(ctx, 380, y, 1.15);
              resistorBody(ctx, 150, y, 70, 330, 0);
              const on = p.v >= 0.7;
              const led = ledDome(
                ctx,
                560,
                76,
                on ? "#5eead4" : Ink.body,
                on ? 1 : 0,
              );
              label(ctx, on ? "LED on" : "LED off", 560, 42, {
                size: 12,
                color: on ? Ink.electron : Ink.muted,
              });
              label(ctx, formatVolt(p.v), 70, y + 52, { mono: true, size: 12 });
              label(ctx, "330", 185, y + 28, { size: 10, mono: true });

              const rLeft = { x: 140, y };
              const rRight = { x: 230, y };
              wire(ctx, [bat.pos, rLeft]);
              wire(ctx, [rRight, d.anode]);
              wire(ctx, [d.cathode, { x: led.anode.x, y }, led.anode]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);
              junction(ctx, bat.neg.x, botY);
              junction(ctx, led.cathode.x, botY);

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
              flow.current.setPath(nE, false);
              flow.current.set(on ? 16 : 4, on ? -70 : -12);
              flow.current.step(dt);
              flow.current.draw(ctx);
              holes.current.kind = "hole";
              holes.current.glow = false;
              holes.current.setPath(pH, false);
              holes.current.set(on ? 16 : 4, on ? 70 : 12);
              holes.current.step(dt);
              holes.current.draw(ctx);

              const copper: Pt[] = [
                bat.pos,
                rLeft,
                rRight,
                d.anode,
                d.cathode,
                { x: led.anode.x, y },
                led.anode,
                led.cathode,
                { x: led.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              loop.current.setPath(copper, true);
              loop.current.set(on ? 18 : 0, on ? -90 : 0);
              loop.current.step(dt);
              loop.current.draw(ctx);

              if (on) {
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
              label(ctx, "I = Is (e^{V/nVt} - 1)", 400, 392, { mono: true, size: 13, color: Ink.text });
            });
          }}
        />
      }
    />
  );
}
