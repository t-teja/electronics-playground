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
  junction,
  label,
  ledDome,
  resistorBody,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

type Mode = "single" | "series" | "parallel";

const VF_LED = 2.0;

export function ResistorLab() {
  const lab = LAB_BY_SLUG.resistor!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [mode, setMode] = useState<Mode>("single");
  const [v, setV] = useState(9);
  const [r1, setR1] = useState(470);
  const [r2, setR2] = useState(1000);

  const { req, i, i1, i2, p, ledI, vr } = useMemo(() => {
    const vr = Math.max(0, v - VF_LED);
    if (mode === "series") {
      const req = r1 + r2;
      const i = vr / req;
      return { req, i, i1: i, i2: i, p: i * i * req, ledI: i, vr };
    }
    if (mode === "parallel") {
      const req = 1 / (1 / r1 + 1 / r2);
      const i1 = vr / r1;
      const i2 = vr / r2;
      const i = i1 + i2;
      return { req, i, i1, i2, p: vr * i, ledI: i, vr };
    }
    const i = vr / r1;
    return { req: r1, i, i1: i, i2: 0, p: vr * i, ledI: i, vr };
  }, [mode, v, r1, r2]);

  const flow = useRef(new ElectronFlow());
  const flow2 = useRef(new ElectronFlow());
  const params = useRef({ v, r1, r2, mode, i, i1, i2, p, ledI, vr });
  params.current = { v, r1, r2, mode, i, i1, i2, p, ledI, vr };

  const insight = useMemo(() => {
    if (mode === "series") {
      return `The LED eats ~${VF_LED.toFixed(1)} V, then the same current (${formatAmp(i)}) passes through both resistors. Remaining ${formatVolt(vr)} splits in proportion — ${formatOhm(r1)} drops ${formatVolt(i * r1)}, ${formatOhm(r2)} drops ${formatVolt(i * r2)}.`;
    }
    if (mode === "parallel") {
      return `After the LED’s ~${VF_LED.toFixed(1)} V drop, both resistors see ${formatVolt(vr)}. Current splits: ${formatAmp(i1)} through R1, ${formatAmp(i2)} through R2. The pair behaves as ${formatOhm(req)}.`;
    }
    if (v < VF_LED) {
      return `Supply is below the LED’s ~${VF_LED.toFixed(1)} V forward drop. I = max(0, (V − Vf) / R) is zero — the LED stays dark.`;
    }
    if (i < 0.0008) {
      return `Almost no current. At ${formatOhm(r1)} the lattice is a dense crowd of collisions — electrons drift slowly, the LED barely glows. I = (V − Vf) / R with Vf ≈ ${VF_LED.toFixed(1)} V.`;
    }
    if (p > 0.25) {
      return `Power in the resistor is ${formatWatt(p)}. The LED’s Vf is taken out first; the rest of the voltage becomes I²R heat.`;
    }
    return `Ohm’s law with the LED in the loop: I = (V − Vf) / R. ${formatVolt(v)} minus ~${VF_LED.toFixed(1)} V across ${formatOhm(r1)} forces ${formatAmp(i)}.`;
  }, [mode, i, r1, r2, v, req, i1, i2, p, vr]);

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
              const topY = 110;
              const botY = 300;
              const bat = battery(ctx, 80, 200);
              label(ctx, formatVolt(p.v), 80, 256, { mono: true, size: 12 });

              const bright = Math.min(1, p.ledI / 0.015);
              const led = ledDome(ctx, 640, 76, Ink.electron, bright);
              label(ctx, "LED", 640, 46, { size: 11 });

              const heat = Math.min(1, p.p / 0.4);
              let rLeft: Pt = { x: 240, y: topY };
              let rRight: Pt = { x: 420, y: topY };

              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }]);

              if (p.mode === "single") {
                resistorBody(ctx, 250, topY, 160, p.r1, heat);
                rLeft = { x: 240, y: topY };
                rRight = { x: 420, y: topY };
                label(ctx, formatOhm(p.r1), 330, 78, { mono: true, size: 12 });
              } else if (p.mode === "series") {
                resistorBody(ctx, 200, topY, 100, p.r1, Math.min(1, (p.i * p.i * p.r1) / 0.25));
                resistorBody(ctx, 320, topY, 100, p.r2, Math.min(1, (p.i * p.i * p.r2) / 0.25));
                rLeft = { x: 190, y: topY };
                rRight = { x: 430, y: topY };
                label(ctx, "R1", 250, 78, { size: 11 });
                label(ctx, "R2", 370, 78, { size: 11 });
              } else {
                rLeft = { x: 250, y: topY };
                rRight = { x: 470, y: topY };
                wire(ctx, [
                  rLeft,
                  { x: 250, y: 70 },
                  { x: 470, y: 70 },
                  rRight,
                ]);
                wire(ctx, [
                  rLeft,
                  { x: 250, y: 150 },
                  { x: 470, y: 150 },
                  rRight,
                ]);
                junction(ctx, rLeft.x, rLeft.y);
                junction(ctx, rRight.x, rRight.y);
                resistorBody(ctx, 310, 70, 100, p.r1, Math.min(1, (p.i1 * p.i1 * p.r1) / 0.25));
                resistorBody(ctx, 310, 150, 100, p.r2, Math.min(1, (p.i2 * p.i2 * p.r2) / 0.25));
                label(ctx, "R1", 360, 42, { size: 11 });
                label(ctx, "R2", 360, 182, { size: 11 });
              }

              wire(ctx, [{ x: bat.pos.x, y: topY }, rLeft]);
              wire(ctx, [rRight, { x: led.anode.x, y: topY }, led.anode]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);
              junction(ctx, bat.pos.x, topY);

              label(ctx, "electron flow  \u2212  \u2192  +", 400, 348, { size: 11 });
              label(ctx, "conventional current is the opposite direction", 400, 368, { size: 10 });

              const loop: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                rLeft,
                rRight,
                { x: led.anode.x, y: topY },
                led.anode,
                led.cathode,
                { x: led.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              const count = Math.max(4, Math.min(48, Math.round(8 + p.i * 1800)));
              const speed = Math.max(20, Math.min(260, 40 + p.i * 9000));
              flow.current.setPath(loop, true);
              flow.current.set(count, -speed);
              flow.current.step(dt);
              flow.current.draw(ctx);

              if (p.mode === "parallel") {
                const branch: Pt[] = [
                  { x: 250, y: 70 },
                  { x: 470, y: 70 },
                ];
                flow2.current.setPath(branch, false);
                flow2.current.set(Math.max(3, Math.min(20, Math.round(p.i1 * 900))), -speed * 0.7);
                flow2.current.step(dt);
                flow2.current.draw(ctx);
              }

              label(ctx, `I = (V \u2212 Vf) / R = ${formatAmp(p.i)}`, 400, 24, {
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
