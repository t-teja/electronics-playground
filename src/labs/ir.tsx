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
  resistorBody,
  roundRect,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const VCC = 5;
const I0 = 8e-4;
const R_LED = 220;
const R_LOAD = 10000;
const VF_IR = 1.2;
const VF_OUT = 2.0;

export function IrLab() {
  const lab = LAB_BY_SLUG.ir!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [distance, setDistance] = useState(8);
  const [threshold, setThreshold] = useState(0.6);

  const intensity = 1 / (distance * distance);
  const iPd = I0 * intensity;
  const vSense = Math.min(VCC, iPd * R_LOAD);
  const close = vSense > threshold;
  const iIr = (VCC - VF_IR) / R_LED;
  const iOut = close ? Math.max(0, (VCC - VF_OUT) / 470) : 0;

  const irFlow = useRef(new ElectronFlow());
  const pdFlow = useRef(new ElectronFlow());
  const outFlow = useRef(new ElectronFlow());
  const params = useRef({ distance, threshold, intensity, iPd, vSense, close, iIr, iOut });
  params.current = { distance, threshold, intensity, iPd, vSense, close, iIr, iOut };

  const insight = useMemo(() => {
    if (distance <= 3) {
      return `Almost touching. Reflected intensity ~ 1/d\u00b2 is huge, so the photodiode dumps ${formatAmp(iPd)} through the 10 k\u03a9 load. V_sense is ${formatVolt(vSense)}. The comparator is well above ${formatVolt(threshold)}. Output LED on.`;
    }
    if (close) {
      return `Close enough. I_pd \u221d 1/d\u00b2 = ${formatAmp(iPd)}, V_sense = ${formatVolt(vSense)} which beats the ${formatVolt(threshold)} threshold. A few centimetres is all this pair needs.`;
    }
    if (distance > 20) {
      return `Far. Inverse-square has starved the detector: I_pd is only ${formatAmp(iPd)} and V_sense = ${formatVolt(vSense)} sits below ${formatVolt(threshold)}. The output LED stays dark.`;
    }
    return `The IR LED is always on. Photons bounce off the block and a fraction ~ 1/d\u00b2 reach the photodiode. ${formatVolt(vSense)} vs ${formatVolt(threshold)}. Not quite over the line.`;
  }, [distance, iPd, vSense, threshold, close]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="I photo" value={formatAmp(iPd)} />
          <Meter label="V sense" value={formatVolt(vSense)} />
          <Meter label="OUT" value={close ? "HIGH" : "LOW"} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Distance"
            value={distance}
            display={`${distance.toFixed(1)} cm`}
            min={1}
            max={30}
            step={0.1}
            onChange={setDistance}
            hint="Move the block. Intensity falls as 1/d\u00b2."
          />
          <LinearControl
            label="Threshold"
            value={threshold}
            display={formatVolt(threshold)}
            min={0.1}
            max={3}
            step={0.05}
            onChange={setThreshold}
            hint="Comparator trip point. Lower it and close reaches farther."
          />
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            {"I \u221d 1 / d\u00b2 \u00b7 V_sense = min(VCC, I_pd \u00b7 10 k\u03a9) = "}{formatVolt(vSense)}
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 64, 150);
              label(ctx, formatVolt(VCC), 64, 206, { mono: true, size: 12 });
              const topY = 70;
              const botY = 250;

              resistorBody(ctx, 150, topY, 70, R_LED, Math.min(1, p.iIr * 4));
              const irLed = ledDome(ctx, 290, 46, Ink.heat, 0.85);
              label(ctx, "IR LED", 290, 22, { size: 10, color: Ink.heat });

              const pd = diodeSymbol(ctx, 290, 200, 0.9, true);
              label(ctx, "photodiode", 290, 236, { size: 10 });
              resistorBody(ctx, 150, botY, 70, R_LOAD, Math.min(1, p.iPd * 400));

              const outLed = ledDome(
                ctx,
                720,
                46,
                p.close ? "#5eead4" : Ink.body,
                p.close ? 1 : 0,
              );
              label(ctx, "OUT", 720, 22, { size: 10 });

              roundRect(ctx, 560, 100, 70, 80, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.25)";
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(560, 140);
              ctx.lineTo(548, 126);
              ctx.lineTo(548, 154);
              ctx.closePath();
              ctx.fillStyle = Ink.pin;
              ctx.fill();
              label(ctx, "CMP", 595, 140, { size: 11, color: Ink.text });
              label(ctx, p.close ? "1" : "0", 595, 158, {
                size: 12,
                color: p.close ? Ink.electron : Ink.muted,
              });

              const blockX = 380 + ((p.distance - 1) / 29) * 150;
              roundRect(ctx, blockX, 88, 36, 130, 4);
              ctx.fillStyle = Ink.body;
              ctx.fill();
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 1.4;
              ctx.stroke();
              label(ctx, `${p.distance.toFixed(1)} cm`, blockX + 18, 78, { mono: true, size: 11 });

              const beamA = 0.12 + Math.min(0.7, p.intensity * 8);
              ctx.save();
              ctx.globalAlpha = beamA;
              ctx.strokeStyle = Ink.heat;
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 5]);
              ctx.beginPath();
              ctx.moveTo(irLed.anode.x + 18, 70);
              ctx.lineTo(blockX, 110);
              ctx.moveTo(blockX, 180);
              ctx.lineTo(pd.cathode.x + 8, 200);
              ctx.stroke();
              ctx.setLineDash([]);
              const pulse = (t * 8) % 1;
              ctx.globalAlpha = beamA * (1 - pulse);
              ctx.beginPath();
              ctx.arc(
                290 + 18 + (blockX - 308) * pulse,
                70 + 40 * pulse,
                3,
                0,
                Math.PI * 2,
              );
              ctx.fillStyle = Ink.heat;
              ctx.fill();
              ctx.restore();

              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }, { x: 140, y: topY }]);
              wire(ctx, [
                { x: 230, y: topY },
                { x: irLed.anode.x, y: topY },
                irLed.anode,
              ]);
              wire(ctx, [
                irLed.cathode,
                { x: irLed.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);

              wire(ctx, [
                { x: bat.pos.x, y: topY },
                { x: 80, y: 200 },
                pd.cathode,
              ]);
              wire(ctx, [pd.anode, { x: 230, y: 200 }, { x: 230, y: botY }]);
              wire(ctx, [
                { x: 140, y: botY },
                { x: bat.neg.x, y: botY },
              ]);

              const sense: Pt = { x: 230, y: 200 };
              wire(ctx, [sense, { x: 548, y: 200 }, { x: 548, y: 154 }]);
              wire(ctx, [
                { x: bat.pos.x, y: topY },
                { x: 560, y: topY },
                { x: 560, y: 140 },
              ]);
              wire(ctx, [
                { x: 630, y: 140 },
                { x: outLed.anode.x, y: 140 },
                outLed.anode,
              ]);
              wire(ctx, [
                outLed.cathode,
                { x: outLed.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
              ]);

              junction(ctx, bat.pos.x, topY);
              junction(ctx, bat.neg.x, botY);
              junction(ctx, sense.x, sense.y);
              junction(ctx, outLed.anode.x, 140);

              label(ctx, `${formatVolt(p.vSense)}`, sense.x + 24, 186, {
                mono: true,
                size: 11,
                color: Ink.text,
                align: "left",
              });
              label(ctx, `thr ${formatVolt(p.threshold)}`, 595, 188, { mono: true, size: 10 });

              const irLoop: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                { x: 140, y: topY },
                { x: 230, y: topY },
                { x: irLed.anode.x, y: topY },
                irLed.anode,
                irLed.cathode,
                { x: irLed.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              irFlow.current.setPath(irLoop, true);
              irFlow.current.set(12, -90);
              irFlow.current.step(dt);
              irFlow.current.draw(ctx);

              const pdLoop: Pt[] = [
                pd.cathode,
                pd.anode,
                { x: 230, y: 200 },
                { x: 230, y: botY },
                { x: 140, y: botY },
                { x: bat.neg.x, y: botY },
              ];
              pdFlow.current.setPath(pdLoop, false);
              pdFlow.current.set(
                p.iPd > 2e-6 ? Math.max(3, Math.min(18, Math.round(p.iPd * 20000))) : 0,
                -Math.min(160, 40 + p.iPd * 8e5),
              );
              pdFlow.current.step(dt);
              pdFlow.current.draw(ctx);

              if (p.close) {
                const oLoop: Pt[] = [
                  { x: 630, y: 140 },
                  { x: outLed.anode.x, y: 140 },
                  outLed.anode,
                  outLed.cathode,
                  { x: outLed.cathode.x, y: botY },
                  { x: bat.neg.x, y: botY },
                ];
                outFlow.current.setPath(oLoop, false);
                outFlow.current.set(10, -110);
                outFlow.current.step(dt);
                outFlow.current.draw(ctx);
              }

              label(ctx, "I \u221d 1 / d\u00b2", 400, 392, { mono: true, size: 13, color: Ink.text });
            });
          }}
        />
      }
    />
  );
}
