import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, LogControl, Meter } from "@/components/control";
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
  resistorBody,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const VCC = 5;
const RDARK = 1e6;
const LUX0 = 10;
const GAMMA = 0.7;
const VF_LED = 1.8;
const R_LED = 4700;

function ldrResistance(lux: number) {
  return RDARK / (1 + (Math.max(0, lux) / LUX0) ** GAMMA);
}

export function LdrLab() {
  const lab = LAB_BY_SLUG.ldr!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [lux, setLux] = useState(120);
  const [rFixed, setRFixed] = useState(10000);

  const rLdr = ldrResistance(lux);
  const rTop = rLdr;
  const rBot = rFixed;
  const vout = VCC * (rBot / (rBot + rTop));
  const iDiv = VCC / (rTop + rBot);
  const iLed = Math.max(0, (vout - VF_LED) / R_LED);

  const flow = useRef(new ElectronFlow());
  const ledFlow = useRef(new ElectronFlow());
  const params = useRef({ lux, rFixed, rLdr, vout, iDiv, iLed });
  params.current = { lux, rFixed, rLdr, vout, iDiv, iLed };

  const insight = useMemo(() => {
    if (lux < 2) {
      return `Dark. Photons are scarce, so almost no extra carriers are freed. The LDR sits near ${formatOhm(RDARK)} and ${formatVolt(vout)} appears at the tap — too low to light the LED.`;
    }
    if (lux < 40) {
      return `Photoconductivity has started: R_LDR = R_dark / (1 + (E/${LUX0})^${GAMMA}) = ${formatOhm(rLdr)}. The divider with ${formatOhm(rFixed)} yields ${formatVolt(vout)}.`;
    }
    if (iLed < 0.00015) {
      return `Brighter, lower R. Vout is ${formatVolt(vout)}, still under the LED’s ~${VF_LED.toFixed(1)} V forward drop, so the indicator stays dark even though the meter is moving.`;
    }
    return `Photons flood the lattice and resistance falls to ${formatOhm(rLdr)}. Vout = VCC · Rbot / (Rbot + Rtop) = ${formatVolt(vout)}. The LED sees that voltage and glows.`;
  }, [lux, rLdr, rFixed, vout, iLed]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="R LDR" value={formatOhm(rLdr)} />
          <Meter label="Vout" value={formatVolt(vout)} />
          <Meter label="I divider" value={formatAmp(iDiv)} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Illuminance"
            value={lux}
            display={`${lux.toFixed(0)} lux`}
            min={0}
            max={1000}
            step={1}
            onChange={setLux}
            hint="Photons free carriers. More light, less resistance."
          />
          <LogControl
            label="Fixed resistor"
            value={rFixed}
            display={formatOhm(rFixed)}
            min={1000}
            max={100000}
            onChange={setRFixed}
            hint="Bottom of the divider. Sets where Vout lands."
          />
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            R ∝ 1 / E^{GAMMA} · Vout = {formatVolt(VCC)} · {formatOhm(rBot)} / ({formatOhm(rBot)} + {formatOhm(rTop)})
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const topY = 90;
              const midY = 180;
              const botY = 280;
              const bat = battery(ctx, 80, 180);
              label(ctx, formatVolt(VCC), 80, 236, { mono: true, size: 12 });

              resistorBody(ctx, 240, topY, 140, p.rLdr, 0);
              const ldrLeft: Pt = { x: 230, y: topY };
              const ldrRight: Pt = { x: 390, y: topY };
              label(ctx, "LDR", 310, 58, { size: 11 });
              label(ctx, formatOhm(p.rLdr), 310, 74, { mono: true, size: 11 });

              const light01 = Math.min(1, p.lux / 800);
              ctx.strokeStyle = Ink.electron;
              ctx.lineWidth = 1.5;
              ctx.lineCap = "round";
              for (let i = 0; i < 3; i++) {
                const ox = 286 + i * 18;
                ctx.globalAlpha = 0.25 + light01 * 0.75;
                ctx.beginPath();
                ctx.moveTo(ox - 8, topY - 48);
                ctx.lineTo(ox + 6, topY - 22);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(ox + 6, topY - 22);
                ctx.lineTo(ox - 2, topY - 26);
                ctx.moveTo(ox + 6, topY - 22);
                ctx.lineTo(ox + 2, topY - 30);
                ctx.stroke();
              }
              ctx.globalAlpha = 1;
              label(ctx, `${p.lux.toFixed(0)} lux`, 310, topY - 58, { mono: true, size: 11, color: Ink.electron });

              resistorBody(ctx, 240, botY, 140, p.rFixed, Math.min(1, p.iDiv * p.iDiv * p.rFixed * 8));
              const rLeft: Pt = { x: 230, y: botY };
              const rRight: Pt = { x: 390, y: botY };
              label(ctx, "R", 310, botY + 28, { size: 11 });
              label(ctx, formatOhm(p.rFixed), 310, botY + 44, { mono: true, size: 11 });

              const node: Pt = { x: 430, y: midY };
              const led = ledDome(ctx, 620, 146, Ink.electron, Math.min(1, p.iLed / 0.0008));
              label(ctx, "out", 620, 116, { size: 11 });

              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }, ldrLeft]);
              wire(ctx, [ldrRight, { x: node.x, y: topY }, node]);
              wire(ctx, [node, { x: node.x, y: botY }, rRight]);
              wire(ctx, [rLeft, { x: bat.neg.x, y: botY }, bat.neg]);
              wire(ctx, [node, { x: led.anode.x, y: node.y }, led.anode]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
              ]);
              junction(ctx, node.x, node.y);
              junction(ctx, bat.neg.x, botY);
              junction(ctx, node.x, topY);
              junction(ctx, node.x, botY);

              label(ctx, `Vout ${formatVolt(p.vout)}`, node.x + 36, midY - 16, {
                mono: true,
                size: 12,
                color: Ink.text,
                align: "left",
              });

              const loop: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                ldrLeft,
                ldrRight,
                { x: node.x, y: topY },
                node,
                { x: node.x, y: botY },
                rRight,
                rLeft,
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              flow.current.setPath(loop, true);
              flow.current.set(
                Math.max(4, Math.min(36, Math.round(6 + p.iDiv * 80000))),
                -Math.min(220, 30 + p.iDiv * 4e6),
              );
              flow.current.step(dt);
              flow.current.draw(ctx);

              if (p.iLed > 2e-5) {
                const branch: Pt[] = [
                  node,
                  { x: led.anode.x, y: node.y },
                  led.anode,
                  led.cathode,
                  { x: led.cathode.x, y: botY },
                  { x: bat.neg.x, y: botY },
                ];
                ledFlow.current.setPath(branch, false);
                ledFlow.current.set(Math.max(3, Math.min(14, Math.round(p.iLed * 12000))), -90);
                ledFlow.current.step(dt);
                ledFlow.current.draw(ctx);
              }

              label(ctx, `R ∝ 1 / E^γ   γ = ${GAMMA}`, 400, 392, {
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
