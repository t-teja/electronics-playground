import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, LogControl, Meter, Segmented } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatAmp, formatOhm, formatVolt, formatWatt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  graphPaper,
  Ink,
  label,
  ledDome,
  resistorBody,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

type Mode = "single" | "series" | "parallel";

export function ResistorLab() {
  const lab = LAB_BY_SLUG.resistor!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [mode, setMode] = useState<Mode>("single");
  const [v, setV] = useState(9);
  const [r1, setR1] = useState(470);
  const [r2, setR2] = useState(1000);

  const { req, i, i1, i2, p, ledI } = useMemo(() => {
    if (mode === "series") {
      const req = r1 + r2;
      const i = v / req;
      return { req, i, i1: i, i2: i, p: i * i * req, ledI: i };
    }
    if (mode === "parallel") {
      const req = 1 / (1 / r1 + 1 / r2);
      const i1 = v / r1;
      const i2 = v / r2;
      const i = i1 + i2;
      return { req, i, i1, i2, p: v * i, ledI: i };
    }
    const i = v / r1;
    return { req: r1, i, i1: i, i2: 0, p: v * i, ledI: i };
  }, [mode, v, r1, r2]);

  const flow = useRef(new ElectronFlow());
  const flow2 = useRef(new ElectronFlow());
  const params = useRef({ v, r1, r2, mode, i, i1, i2, p, ledI });
  params.current = { v, r1, r2, mode, i, i1, i2, p, ledI };

  const insight = useMemo(() => {
    if (mode === "series") {
      return `In series the same current (${formatAmp(i)}) must pass through both resistors. Voltages split in proportion to resistance — ${formatOhm(r1)} drops ${formatVolt(i * r1)}, ${formatOhm(r2)} drops ${formatVolt(i * r2)}.`;
    }
    if (mode === "parallel") {
      return `In parallel both resistors see the full ${formatVolt(v)}. Current splits: ${formatAmp(i1)} through R1, ${formatAmp(i2)} through R2. The pair behaves as ${formatOhm(req)}.`;
    }
    if (i < 0.0008) {
      return `Almost no current. At ${formatOhm(r1)} the lattice is a dense crowd of collisions — electrons drift slowly, the LED barely glows.`;
    }
    if (p > 0.25) {
      return `Power is ${formatWatt(p)}. The resistor is turning ordered motion into heat. That orange glow is I²R, not light by design.`;
    }
    return `Ohm’s law in one line: ${formatVolt(v)} across ${formatOhm(r1)} forces ${formatAmp(i)}. Raise R and the drift slows; raise V and it quickens.`;
  }, [mode, i, r1, r2, v, req, i1, i2, p]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Current" value={formatAmp(i)} />
          <Meter label="Equivalent R" value={formatOhm(req)} />
          <Meter label="Power" value={formatWatt(p)} />
        </>
      }
      controls={
        <>
          <Control label="Circuit">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { id: "single", label: "Single" },
                { id: "series", label: "Series" },
                { id: "parallel", label: "Parallel" },
              ]}
            />
          </Control>
          <LinearControl
            label="Supply"
            value={v}
            display={formatVolt(v)}
            min={1}
            max={24}
            step={0.1}
            onChange={setV}
            hint="More voltage, stronger field, faster drift."
          />
          <LogControl
            label={mode === "single" ? "Resistance" : "R1"}
            value={r1}
            display={formatOhm(r1)}
            min={10}
            max={100000}
            onChange={setR1}
            hint="Higher resistance means more scattering."
          />
          {mode !== "single" ? (
            <LogControl label="R2" value={r2} display={formatOhm(r2)} min={10} max={100000} onChange={setR2} />
          ) : null}
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const y = 200;
              battery(ctx, 70, y);
              label(ctx, formatVolt(p.v), 70, y + 48, { mono: true, size: 12 });

              const loop: Pt[] = [
                { x: 90, y },
                { x: 150, y },
                { x: 150, y: 110 },
                { x: 650, y: 110 },
                { x: 650, y },
                { x: 710, y },
                { x: 710, y: 310 },
                { x: 90, y: 310 },
                { x: 90, y },
              ];
              wire(ctx, loop, 3);

              const heat = Math.min(1, p.p / 0.4);
              if (p.mode === "single") {
                resistorBody(ctx, 330, 110, 120, p.r1, heat);
                label(ctx, formatOhm(p.r1), 390, 78, { mono: true, size: 12 });
              } else if (p.mode === "series") {
                resistorBody(ctx, 250, 110, 100, p.r1, Math.min(1, (p.i * p.i * p.r1) / 0.25));
                resistorBody(ctx, 430, 110, 100, p.r2, Math.min(1, (p.i * p.i * p.r2) / 0.25));
                label(ctx, "R1", 300, 78, { size: 11 });
                label(ctx, "R2", 480, 78, { size: 11 });
              } else {
                wire(ctx, [
                  { x: 280, y: 110 },
                  { x: 280, y: 70 },
                  { x: 500, y: 70 },
                  { x: 500, y: 110 },
                ]);
                wire(ctx, [
                  { x: 280, y: 110 },
                  { x: 280, y: 150 },
                  { x: 500, y: 150 },
                  { x: 500, y: 110 },
                ]);
                resistorBody(ctx, 340, 70, 100, p.r1, Math.min(1, (p.i1 * p.i1 * p.r1) / 0.25));
                resistorBody(ctx, 340, 150, 100, p.r2, Math.min(1, (p.i2 * p.i2 * p.r2) / 0.25));
                label(ctx, "R1", 390, 42, { size: 11 });
                label(ctx, "R2", 390, 182, { size: 11 });
              }

              const bright = Math.min(1, p.ledI / 0.015);
              ledDome(ctx, 650, 78, Ink.electron, bright);
              label(ctx, "LED", 650, 48, { size: 11 });
              label(ctx, "electron flow  −  →  +", 400, 348, { size: 11 });
              label(ctx, "conventional current is the opposite direction", 400, 368, { size: 10 });

              const count = Math.max(4, Math.min(48, Math.round(8 + p.i * 1800)));
              const speed = Math.max(20, Math.min(260, 40 + p.i * 9000));
              flow.current.setPath(loop, true);
              flow.current.set(count, -speed);
              flow.current.step(dt);
              flow.current.draw(ctx);

              if (p.mode === "parallel") {
                const branch: Pt[] = [
                  { x: 280, y: 70 },
                  { x: 500, y: 70 },
                ];
                flow2.current.setPath(branch, false);
                flow2.current.set(Math.max(3, Math.min(20, Math.round(p.i1 * 900))), -speed * 0.7);
                flow2.current.step(dt);
                flow2.current.draw(ctx);
              }

              label(ctx, `I = V / R = ${formatAmp(p.i)}`, 400, 24, {
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
