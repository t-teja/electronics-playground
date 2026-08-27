import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, LogControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatHenry, formatOhm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  graphPaper,
  inductorCoil,
  Ink,
  label,
  lamp,
  resistorBody,
  scope,
  toggleSwitch,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, SparkField, type Pt } from "@/lib/sim/flow";

export function InductorLab() {
  const lab = LAB_BY_SLUG.inductor!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vsrc, setVsrc] = useState(9);
  const [l, setL] = useState(0.08);
  const [r, setR] = useState(120);
  const [closed, setClosed] = useState(true);

  const sim = useRef({ i: 0, lastClosed: true });
  const sparks = useRef(new SparkField());
  const [read, setRead] = useState({ i: 0, vl: 0 });
  const samples = useRef<number[]>(Array(120).fill(0));
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);
  const params = useRef({ vsrc, l, r, closed });
  params.current = { vsrc, l, r, closed };

  const tau = l / r;
  const iinf = vsrc / r;

  const insight = useMemo(() => {
    if (!closed) {
      return `Switch opened. Current cannot stop instantly — the collapsing field induces a voltage that tries to keep I flowing through the lamp. That spark is the stored magnetic energy leaving.`;
    }
    const frac = read.i / Math.max(0.001, iinf);
    if (frac > 0.95) {
      return `Steady state. dI/dt ≈ 0, so the inductor looks like a wire. The lamp (load) and ${formatOhm(r)} set the current: ${formatAmp(iinf)}. Energy stored is ½LI².`;
    }
    return `Current is climbing toward ${formatAmp(iinf)} with time constant L/R = ${(tau * 1000).toFixed(0)} ms. The lamp is the load; the field you see is the inertia of that current.`;
  }, [closed, read.i, iinf, r, tau]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Current" value={formatAmp(read.i)} />
          <Meter label="V inductor" value={formatVolt(read.vl)} />
          <Meter label="L / R" value={`${(tau * 1000).toFixed(0)} ms`} />
        </>
      }
      controls={
        <>
          <ToggleControl
            label="Switch"
            checked={closed}
            on="closed"
            off="open"
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
            label="Inductance"
            value={l}
            display={formatHenry(l)}
            min={0.005}
            max={0.5}
            onChange={setL}
            hint="More turns, more flux per amp, more inertia."
          />
          <LogControl
            label="Load"
            value={r}
            display={formatOhm(r)}
            min={20}
            max={2000}
            onChange={setR}
            hint="The lamp. Smaller load, more current, stronger field."
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            if (s.lastClosed && !p.closed && Math.abs(s.i) > 0.01) {
              sparks.current.burst(206, 190, 22);
            }
            s.lastClosed = p.closed;
            const vL = p.closed ? p.vsrc - s.i * p.r : -s.i * (p.r + 800);
            const di = (vL / p.l) * dt;
            s.i = p.closed ? clamp(s.i + di, 0, p.vsrc / p.r) : s.i + di;
            if (!p.closed) s.i *= Math.exp(-dt / Math.max(0.004, p.l / (p.r + 800)));
            sparks.current.step(dt);
            const i01 = Math.abs(s.i) / Math.max(0.01, p.vsrc / p.r);
            samples.current.push(clamp(i01, 0, 1));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const y = 190;
              battery(ctx, 56, y);
              toggleSwitch(ctx, 190, y, p.closed);
              const coil = inductorCoil(ctx, 268, y, 5, i01);
              lamp(ctx, 520, y, i01);
              resistorBody(ctx, 580, y, 70, p.r, Math.min(1, (s.i * s.i * p.r) / 0.4));
              wire(ctx, [
                { x: 76, y },
                { x: 190, y },
              ]);
              wire(ctx, [
                { x: 224, y },
                { x: 268, y },
              ]);
              wire(ctx, [
                { x: coil.end, y },
                { x: 492, y },
              ]);
              wire(ctx, [
                { x: 548, y },
                { x: 580, y },
              ]);
              wire(ctx, [
                { x: 660, y },
                { x: 720, y },
                { x: 720, y: 310 },
                { x: 46, y: 310 },
                { x: 46, y },
              ]);
              label(ctx, "load", 520, y - 36, { size: 11 });
              label(ctx, formatHenry(p.l), coil.mid, y + 64, { mono: true, size: 12 });
              label(ctx, p.closed ? "building field" : "field collapsing", coil.mid, y - 58, { size: 12 });
              sparks.current.draw(ctx);

              const loop: Pt[] = [
                { x: 76, y },
                { x: 268, y },
                { x: coil.end, y },
                { x: 720, y },
              ];
              flow.current.setPath(loop, false);
              flow.current.set(
                Math.abs(s.i) > 0.002 ? Math.max(4, Math.min(36, Math.abs(s.i) * 400)) : 0,
                -Math.min(240, 30 + Math.abs(s.i) * 1800),
              );
              flow.current.step(dt);
              flow.current.draw(ctx);

              scope(ctx, 540, 36, 220, 90, samples.current, Ink.electron, "I(t)");
              label(ctx, `V = L dI/dt   ·   ${formatAmp(s.i)}`, 400, 380, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
            });

            ui.current += dt;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead((prev) => {
                if (Math.abs(prev.i - s.i) < 0.0004) return prev;
                return { i: s.i, vl: vL };
              });
            }
          }}
        />
      }
    />
  );
}
