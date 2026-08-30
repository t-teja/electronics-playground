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

const IS = 1e-12;
const N_VT = 0.026 * 1.8;
const R = 330;
const VF_LED = 1.8;
const I_GLOW = 0.001;

function shockley(vd: number) {
  const v = Math.min(vd, 0.95);
  return IS * (Math.exp(v / N_VT) - 1);
}

function solveSeries(vsrc: number) {
  if (vsrc <= VF_LED) {
    const vd = Math.min(vsrc, 0.95);
    const i = vsrc < 0 ? Math.max(-IS, shockley(vd)) : Math.max(0, shockley(Math.min(vd, 0.4)));
    return { vd, i };
  }
  let lo = 0;
  let hi = Math.max((vsrc - VF_LED) / R, 1e-18);
  for (let n = 0; n < 48; n++) {
    const mid = (lo + hi) / 2;
    const vd = N_VT * Math.log(mid / IS + 1);
    const drop = mid * R + vd + VF_LED;
    if (drop > vsrc) hi = mid;
    else lo = mid;
  }
  const i = (lo + hi) / 2;
  const vd = N_VT * Math.log(i / IS + 1);
  return { vd, i };
}

export function DiodeLab() {
  const lab = LAB_BY_SLUG.diode!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vsrc, setVsrc] = useState(5);
  const { vd, i } = useMemo(() => solveSeries(vsrc), [vsrc]);
  const on = i >= I_GLOW;
  const flow = useRef(new ElectronFlow());
  const holes = useRef(new ElectronFlow());
  const loop = useRef(new ElectronFlow());
  const samples = useRef<number[]>(Array(80).fill(0.5));
  const params = useRef({ vsrc, vd, i, on });
  params.current = { vsrc, vd, i, on };

  const insight = useMemo(() => {
    if (on) {
      return `Forward biased. Source ${formatVolt(vsrc)} drives ${formatAmp(i)} through the 330 \u03a9 resistor, the silicon diode (Vd = ${formatVolt(vd)}), and the LED. The LED lights.`;
    }
    if (vsrc > 0) {
      return `Source ${formatVolt(vsrc)} is below the silicon diode plus LED drop (~2.5 V). Current is ${formatAmp(i)} leakage. The LED stays off.`;
    }
    return `Reverse biased at ${formatVolt(vsrc)}. The depletion region widens. Current is ${formatAmp(i)}. The LED stays off.`;
  }, [on, vsrc, i, vd]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Bias" value={formatVolt(vsrc)} />
          <Meter label="Current" value={formatAmp(i)} />
          <Meter label="LED" value={on ? "on" : "off"} />
        </>
      }
      controls={
        <LinearControl
          label="Source voltage"
          value={vsrc}
          display={formatVolt(vsrc)}
          min={-5}
          max={9}
          step={0.01}
          onChange={setVsrc}
          hint="Battery in series with 330 \u03a9, a silicon diode, and an LED."
        />
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            samples.current.push((p.vsrc + 5) / 14);
            if (samples.current.length > 100) samples.current.shift();
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const y = 110;
              const botY = 190;
              const bat = battery(ctx, 70, y);
              const d = diodeSymbol(ctx, 380, y, 1.15);
              resistorBody(ctx, 150, y, 70, 330, 0);
              const led = ledDome(
                ctx,
                560,
                76,
                p.on ? "#5eead4" : Ink.body,
                p.on ? 1 : 0,
              );
              label(ctx, p.on ? "LED on" : "LED off", 560, 42, {
                size: 12,
                color: p.on ? "#5eead4" : Ink.muted,
              });
              label(ctx, formatVolt(p.vsrc), 70, y + 52, { mono: true, size: 12 });
              label(ctx, "330 \u03a9", 185, y + 28, { size: 10, mono: true });

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

              const deplete = p.vd >= 0 ? Math.max(0.08, 1 - p.vd / 0.85) : Math.min(1, 0.55 + Math.abs(p.vd) / 8);
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
              flow.current.set(p.on ? 16 : 4, p.on ? -70 : -12);
              flow.current.step(dt);
              flow.current.draw(ctx);
              holes.current.kind = "hole";
              holes.current.glow = false;
              holes.current.setPath(pH, false);
              holes.current.set(p.on ? 16 : 4, p.on ? 70 : 12);
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
              loop.current.set(p.on ? 18 : 0, p.on ? -90 : 0);
              loop.current.step(dt);
              loop.current.draw(ctx);

              if (p.on) {
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
              label(ctx, "I = Is (exp(Vd/nVt) - 1)", 400, 392, { mono: true, size: 13, color: Ink.text });
            });
          }}
        />
      }
    />
  );
}
