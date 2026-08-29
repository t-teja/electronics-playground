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
  gnd,
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
  const conducting = v >= 0.7;
  const flow = useRef(new ElectronFlow());
  const holes = useRef(new ElectronFlow());
  const loopFlow = useRef(new ElectronFlow());
  const samples = useRef<number[]>(Array(80).fill(0.5));
  const params = useRef({ v, i, conducting });
  params.current = { v, i, conducting };

  const insight = useMemo(() => {
    if (v >= 0.7) {
      return `Forward biased at ${formatVolt(v)}. The depletion wall is thin; electrons from N and holes from P flood the junction. Current is ${formatAmp(i)} \u2014 the valve is open.`;
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
          <Meter label="State" value={conducting ? "conducting" : "blocking"} />
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
              const topY = 48;
              const botY = 188;
              const bat = battery(ctx, 70, y);
              label(ctx, formatVolt(p.v), 70, y + 52, { mono: true, size: 12 });

              const rsX = 160;
              const rsW = 80;
              resistorBody(ctx, rsX, y, rsW, 220, Math.min(1, Math.max(0, p.i) * 20));
              const rsLeft: Pt = { x: rsX - 10, y };
              const rsRight: Pt = { x: rsX + rsW + 10, y };
              label(ctx, "220", 200, y - 28, { mono: true, size: 11 });

              const d = diodeSymbol(ctx, 400, y, 1.15);
              const led = ledDome(
                ctx,
                520,
                y - 34,
                Ink.electron,
                p.conducting ? Math.min(1, 0.35 + Math.max(0, p.i) / 0.02) : 0,
              );

              wire(ctx, [rsRight, d.anode]);
              wire(ctx, [d.cathode, led.anode]);

              if (p.v >= 0) {
                wire(ctx, [bat.pos, rsLeft]);
                wire(ctx, [
                  led.cathode,
                  { x: led.cathode.x, y: botY },
                  { x: bat.neg.x, y: botY },
                  bat.neg,
                ]);
              } else {
                wire(ctx, [
                  bat.pos,
                  { x: bat.pos.x, y: topY },
                  { x: led.cathode.x, y: topY },
                  led.cathode,
                ]);
                wire(ctx, [
                  rsLeft,
                  { x: rsLeft.x, y: botY },
                  { x: bat.neg.x, y: botY },
                  bat.neg,
                ]);
              }
              gnd(ctx, 280, botY);
              junction(ctx, bat.neg.x, botY);
              if (p.v < 0) {
                junction(ctx, bat.pos.x, topY);
                junction(ctx, led.cathode.x, topY);
              }

              label(ctx, p.v >= 0 ? "forward" : "reverse", 400, y - 44, { size: 12 });
              label(ctx, p.conducting ? "conducting" : "blocking", 400, y + 40, {
                size: 12,
                color: p.conducting ? Ink.electron : Ink.muted,
              });
              label(ctx, "anode", d.anode.x, y - 22, { size: 10 });
              label(ctx, "cathode", d.cathode.x, y - 22, { size: 10 });

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
              flow.current.set(p.conducting ? 16 : 4, p.conducting ? -70 : -12);
              flow.current.step(dt);
              flow.current.draw(ctx);
              holes.current.kind = "hole";
              holes.current.glow = false;
              holes.current.setPath(pH, false);
              holes.current.set(p.conducting ? 16 : 4, p.conducting ? 70 : 12);
              holes.current.step(dt);
              holes.current.draw(ctx);

              if (p.conducting) {
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

              const loop: Pt[] =
                p.v >= 0
                  ? [
                      bat.pos,
                      rsLeft,
                      rsRight,
                      d.anode,
                      d.cathode,
                      led.anode,
                      led.cathode,
                      { x: led.cathode.x, y: botY },
                      { x: bat.neg.x, y: botY },
                      bat.neg,
                    ]
                  : [
                      bat.pos,
                      { x: bat.pos.x, y: topY },
                      { x: led.cathode.x, y: topY },
                      led.cathode,
                      led.anode,
                      d.cathode,
                      d.anode,
                      rsRight,
                      rsLeft,
                      { x: rsLeft.x, y: botY },
                      { x: bat.neg.x, y: botY },
                      bat.neg,
                    ];
              loopFlow.current.setPath(loop, true);
              loopFlow.current.set(
                p.conducting ? Math.max(6, Math.min(28, Math.max(0, p.i) * 400)) : 0,
                -80,
              );
              loopFlow.current.step(dt);
              loopFlow.current.draw(ctx);

              label(ctx, "depletion", j.mid, 210, { size: 10 });
              scope(ctx, 590, 16, 180, 64, samples.current, Ink.electron, "bias");
              label(ctx, "I = Is (e^{V/nVt} - 1)", 400, 392, { mono: true, size: 13, color: Ink.text });
            });
          }}
        />
      }
    />
  );
}
