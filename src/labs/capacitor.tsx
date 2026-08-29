import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, LogControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatFarad, formatOhm, formatSec, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  capPlates,
  clearSim,
  graphPaper,
  Ink,
  label,
  resistorBody,
  scope,
  toggleSwitch,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

export function CapacitorLab() {
  const lab = LAB_BY_SLUG.capacitor!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vsrc, setVsrc] = useState(9);
  const [c, setC] = useState(0.000047);
  const [r, setR] = useState(2200);
  const [closed, setClosed] = useState(true);

  const sim = useRef({ vc: 0, i: 0 });
  const [read, setRead] = useState({ vc: 0, i: 0 });
  const samples = useRef<number[]>(Array(120).fill(0));
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);
  const params = useRef({ vsrc, c, r, closed });
  params.current = { vsrc, c, r, closed };

  const tau = r * c;

  const insight = useMemo(() => {
    const frac = read.vc / Math.max(0.01, vsrc);
    if (!closed) {
      return `Switch open. The capacitor is discharging through ${formatOhm(r)}. Voltage falls as ${formatVolt(read.vc)} with \u03c4 = ${formatSec(tau)}.`;
    }
    if (frac > 0.95) {
      return `Charged. Plate voltage matches the source, so the field cancels further current. I \u2248 ${formatAmp(read.i)}. The field is now storing \u00bdCV\u00b2.`;
    }
    if (frac < 0.08) {
      return `Just connected. The empty capacitor looks like a short \u2014 a surge of ${formatAmp(read.i)} is rushing onto the plates. \u03c4 = ${formatSec(tau)}.`;
    }
    return `Charging. Electrons pile onto the right (\u2212) plate; the left (+) plate is stripped of them. The growing field fights the source. Time constant \u03c4 = RC = ${formatSec(tau)}.`;
  }, [closed, read.vc, read.i, r, tau, vsrc]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="V capacitor" value={formatVolt(read.vc)} />
          <Meter label="Current" value={formatAmp(read.i)} />
          <Meter label="Time constant" value={formatSec(tau)} />
        </>
      }
      controls={
        <>
          <ToggleControl
            label="Switch"
            checked={closed}
            on="charging"
            off="discharging"
            onCheckedChange={setClosed}
          />
          <LinearControl
            label="Supply"
            value={vsrc}
            display={formatVolt(vsrc)}
            min={2}
            max={18}
            step={0.1}
            onChange={setVsrc}
          />
          <LogControl
            label="Capacitance"
            value={c}
            display={formatFarad(c)}
            min={1e-6}
            max={4.7e-4}
            onChange={setC}
            hint="Larger C holds more charge for the same voltage."
          />
          <LogControl
            label="Series R"
            value={r}
            display={formatOhm(r)}
            min={100}
            max={20000}
            onChange={setR}
            hint="Sets how fast the exponential settles."
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            const target = p.closed ? p.vsrc : 0;
            const i = (target - s.vc) / p.r;
            s.i = i;
            s.vc = clamp(s.vc + (i / p.c) * dt, 0, Math.max(p.vsrc, 0.01) * 1.05);
            samples.current.push(s.vc / Math.max(p.vsrc, 0.01));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const y = 190;
              battery(ctx, 56, y);
              toggleSwitch(ctx, 190, y, p.closed);
              resistorBody(ctx, 300, y, 90, p.r, Math.min(1, Math.abs(s.i) * 40));
              capPlates(ctx, 520, y, s.vc / Math.max(p.vsrc, 0.01));
              wire(ctx, [
                { x: 76, y },
                { x: 190, y },
              ]);
              wire(ctx, [
                { x: 224, y },
                { x: 300, y },
              ]);
              wire(ctx, [
                { x: 400, y },
                { x: 504, y },
              ]);
              wire(ctx, [
                { x: 536, y },
                { x: 660, y },
                { x: 660, y: 310 },
                { x: 56, y: 310 },
                { x: 56, y: y + 28 },
              ]);

              label(ctx, formatVolt(p.vsrc), 56, y + 52, { mono: true, size: 12 });
              label(ctx, formatOhm(p.r), 345, y - 32, { mono: true, size: 12 });
              label(ctx, formatFarad(p.c), 520, y - 48, { mono: true, size: 12 });
              label(ctx, "+", 500, y - 40, { size: 12, color: Ink.hole });
              label(ctx, "\u2212", 540, y - 40, { size: 14, color: Ink.electron });
              label(ctx, p.closed ? "charging" : "discharging", 206, y - 28, { size: 11 });

              const q01 = s.vc / Math.max(p.vsrc, 0.01);
              for (let n = 0; n < Math.round(q01 * 14); n++) {
                ctx.beginPath();
                ctx.fillStyle = Ink.hole;
                ctx.arc(512 - (n % 2) * 6, y - 22 + (n % 7) * 7, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = Ink.electron;
                ctx.beginPath();
                ctx.arc(530 + (n % 2) * 6, y - 22 + (n % 7) * 7, 2, 0, Math.PI * 2);
                ctx.fill();
              }

              const loop: Pt[] = [
                { x: 76, y },
                { x: 300, y },
                { x: 504, y },
              ];
              const mag = Math.abs(s.i);
              flow.current.setPath(loop, false);
              flow.current.set(
                mag > 0.00005 ? Math.max(4, Math.min(28, mag * 800)) : 0,
                (s.i >= 0 ? -1 : 1) * Math.min(220, 40 + mag * 6000),
              );
              flow.current.step(dt);
              flow.current.draw(ctx);

              scope(ctx, 540, 36, 220, 90, samples.current, Ink.electron, "Vc(t)");
              label(ctx, `\u03c4 = RC = ${formatSec(p.r * p.c)}`, 400, 380, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
            });

            ui.current += dt;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead((prev) => {
                if (Math.abs(prev.vc - s.vc) < 0.01 && Math.abs(prev.i - s.i) < 0.00005) return prev;
                return { vc: s.vc, i: s.i };
              });
            }
          }}
        />
      }
    />
  );
}
