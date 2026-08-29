import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatAmp, formatOhm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  graphPaper,
  Ink,
  label,
  ledDome,
  potentiometer,
  resistorBody,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

export function PotentiometerLab() {
  const lab = LAB_BY_SLUG.potentiometer!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [v, setV] = useState(9);
  const [rtot, setRtot] = useState(10000);
  const [k, setK] = useState(0.4);
  const [rload, setRload] = useState(4700);

  const rlo = Math.max(1, rtot * k);
  const rhi = Math.max(1, rtot * (1 - k));
  const rpar = 1 / (1 / rlo + 1 / rload);
  const vout = v * (rpar / (rhi + rpar));
  const iled = vout / rload;

  const flow = useRef(new ElectronFlow());
  const flowTap = useRef(new ElectronFlow());
  const params = useRef({ v, rtot, k, rload, vout, iled, rlo, rhi });
  params.current = { v, rtot, k, rload, vout, iled, rlo, rhi };

  const insight = useMemo(() => {
    if (rload < rtot * 0.2) {
      return `The load (${formatOhm(rload)}) is small compared with the track. It pulls the wiper down \u2014 Vout is ${formatVolt(vout)}, not the unloaded ${formatVolt(v * k)}. Buffer it if you care about the ratio.`;
    }
    return `Wiper at ${(k * 100).toFixed(0)}%. Unloaded, Vout would be ${formatVolt(v * k)}. With ${formatOhm(rload)} on the tap, Vout is ${formatVolt(vout)}. The LED brightness follows the tap, not the supply.`;
  }, [k, rload, rtot, v, vout]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Vout" value={formatVolt(vout)} />
          <Meter label="Wiper" value={`${(k * 100).toFixed(0)}%`} />
          <Meter label="LED current" value={formatAmp(iled)} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Supply"
            value={v}
            display={formatVolt(v)}
            min={2}
            max={18}
            step={0.1}
            onChange={setV}
          />
          <LinearControl
            label="Wiper"
            value={k}
            display={`${(k * 100).toFixed(0)}%`}
            min={0.02}
            max={0.98}
            step={0.01}
            onChange={setK}
            hint="Fraction from the bottom (ground) end."
          />
          <LinearControl
            label="Track"
            value={rtot}
            display={formatOhm(rtot)}
            min={1000}
            max={100000}
            step={100}
            onChange={setRtot}
          />
          <LinearControl
            label="Load"
            value={rload}
            display={formatOhm(rload)}
            min={220}
            max={50000}
            step={10}
            onChange={setRload}
          />
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
              label(ctx, formatVolt(p.v), 70, y + 52, { mono: true, size: 12 });
              const pot = potentiometer(ctx, 260, y, 220, p.k, p.rtot);
              label(ctx, formatOhm(p.rtot), 370, y + 36, { mono: true, size: 11 });

              ledDome(ctx, 620, 80, Ink.electron, Math.min(1, p.iled / 0.008));
              resistorBody(ctx, 560, 200, 80, p.rload, Math.min(1, p.iled * 20));
              label(ctx, "load", 600, 168, { size: 11 });

              wire(ctx, [
                { x: 86, y },
                { x: 260, y },
              ]);
              wire(ctx, [
                { x: 490, y },
                { x: 720, y },
                { x: 720, y: 310 },
                { x: 54, y: 310 },
                { x: 54, y },
              ]);
              wire(ctx, [
                pot.wiper,
                { x: pot.wiper.x, y: 80 },
                { x: 620, y: 80 },
              ]);
              wire(ctx, [
                { x: 620, y: 114 },
                { x: 620, y: 200 },
                { x: 650, y: 200 },
              ]);
              wire(ctx, [
                { x: 650, y: 200 },
                { x: 720, y: 200 },
              ]);

              const loop: Pt[] = [
                { x: 86, y },
                { x: 370, y },
                { x: 720, y },
              ];
              flow.current.setPath(loop, true);
              flow.current.set(10, -70);
              flow.current.step(dt);
              flow.current.draw(ctx);

              const tap: Pt[] = [pot.wiper, { x: pot.wiper.x, y: 80 }, { x: 620, y: 80 }];
              flowTap.current.setPath(tap, false);
              flowTap.current.set(
                p.iled > 0.0003 ? Math.max(4, Math.min(20, p.iled * 2000)) : 0,
                -90,
              );
              flowTap.current.step(dt);
              flowTap.current.draw(ctx);

              label(ctx, `Vout = ${formatVolt(p.vout)}`, 400, 24, {
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
