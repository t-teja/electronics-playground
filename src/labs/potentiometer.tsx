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
  junction,
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
  const VF = 1.8;
  const R_LED = 470;
  const iled = Math.max(0, (vout - VF) / R_LED);

  const flow = useRef(new ElectronFlow());
  const flowTap = useRef(new ElectronFlow());
  const params = useRef({ v, rtot, k, rload, vout, iled, rlo, rhi });
  params.current = { v, rtot, k, rload, vout, iled, rlo, rhi };

  const insight = useMemo(() => {
    if (rload < rtot * 0.2) {
      return `The load (${formatOhm(rload)}) is small compared with the track. It pulls the wiper down. Vout is ${formatVolt(vout)}, not the unloaded ${formatVolt(v * k)}. Buffer it if you care about the ratio.`;
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
            hint="0% is ground (right). 100% is +V (left)."
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
              const botY = 310;
              const bat = battery(ctx, 70, y);
              label(ctx, formatVolt(p.v), 70, y + 52, { mono: true, size: 12 });
              // k is fraction from ground; draw inverted so ground is on the right.
              const pot = potentiometer(ctx, 260, y, 220, 1 - p.k, p.rtot);
              label(ctx, formatOhm(p.rtot), 370, y + 36, { mono: true, size: 11 });

              resistorBody(ctx, 580, y, 80, p.rload, 0);
              label(ctx, "load", 620, y - 28, { size: 11 });
              const led = ledDome(ctx, 620, 70, p.iled >= 0.001 ? "#5eead4" : Ink.body, p.iled >= 0.001 ? 1 : 0);
              resistorBody(ctx, 500, 104, 60, 470, Math.min(1, p.iled * 20));
              label(ctx, "Rs", 530, 82, { size: 10 });

              wire(ctx, [bat.pos, pot.left]);
              wire(ctx, [
                pot.right,
                { x: 720, y },
                { x: 720, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);
              wire(ctx, [
                pot.wiper,
                { x: pot.wiper.x, y: 104 },
                { x: 490, y: 104 },
              ]);
              wire(ctx, [
                { x: 570, y: 104 },
                { x: led.anode.x, y: 104 },
                { x: led.anode.x, y: led.anode.y },
                led.anode,
              ]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
              ]);
              wire(ctx, [
                pot.wiper,
                { x: 570, y },
              ]);
              wire(ctx, [
                { x: 670, y },
                { x: 720, y },
              ]);
              junction(ctx, 720, y);
              junction(ctx, pot.wiper.x, y);
              junction(ctx, pot.wiper.x, 104);
              junction(ctx, led.cathode.x, botY);
              junction(ctx, bat.neg.x, botY);

              const loop: Pt[] = [
                bat.pos,
                pot.left,
                pot.right,
                { x: 720, y },
                { x: 720, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              flow.current.setPath(loop, true);
              flow.current.set(10, -70);
              flow.current.step(dt);
              flow.current.draw(ctx);

              const tap: Pt[] = [
                pot.wiper,
                { x: pot.wiper.x, y: 104 },
                { x: 490, y: 104 },
                { x: 570, y: 104 },
                { x: led.anode.x, y: 104 },
                led.anode,
                led.cathode,
                { x: led.cathode.x, y: botY },
              ];
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
