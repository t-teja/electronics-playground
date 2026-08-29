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

function verticalResistor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  ohm: number,
  heat = 0,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 2);
  resistorBody(ctx, -w / 2, 0, w, ohm, heat);
  ctx.restore();
  return {
    top: { x: cx, y: cy - w / 2 - 10 },
    bot: { x: cx, y: cy + w / 2 + 10 },
  };
}

export function LdrLab() {
  const lab = LAB_BY_SLUG.ldr!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [lux, setLux] = useState(120);
  const [rFixed, setRFixed] = useState(100000);

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
      return `Dark. The LDR sits near ${formatOhm(RDARK)}, so almost all of VCC drops across it. Vout is only ${formatVolt(vout)} - under the LED drop, so the indicator stays off.`;
    }
    if (iLed < 0.00015) {
      return `R_LDR = ${formatOhm(rLdr)}. The divider with ${formatOhm(rFixed)} yields ${formatVolt(vout)}, still under the LED's ~${VF_LED.toFixed(1)} V drop. More light, or a larger R2, will light it.`;
    }
    return `Photons free carriers, R_LDR falls to ${formatOhm(rLdr)}. Vout = VCC * R2 / (R2 + R_LDR) = ${formatVolt(vout)}. That is enough to light the LED through Rs.`;
  }, [lux, rLdr, rFixed, vout, iLed]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="R LDR" value={formatOhm(rLdr)} />
          <Meter label="Vout" value={formatVolt(vout)} />
          <Meter label="LED" value={iLed > 0.00015 ? "on" : "off"} />
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
            hint="Photons free carriers. More light, less resistance, LED comes on."
          />
          <LogControl
            label="R2"
            value={rFixed}
            display={formatOhm(rFixed)}
            min={1000}
            max={100000}
            onChange={setRFixed}
            hint="Pull-down at the bottom of the divider. Not in series with the LED."
          />
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            Vout = {formatVolt(VCC)} * {formatOhm(rBot)} / ({formatOhm(rBot)} + {formatOhm(rTop)})
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
              const stackX = 300;
              const bat = battery(ctx, 80, 180);
              label(ctx, formatVolt(VCC), 80, 236, { mono: true, size: 12 });

              const ldr = verticalResistor(ctx, stackX, 100, 80, p.rLdr, 0);
              const r2 = verticalResistor(
                ctx,
                stackX,
                260,
                80,
                p.rFixed,
                Math.min(1, p.iDiv * p.iDiv * p.rFixed * 8),
              );
              const tap: Pt = { x: stackX, y: 180 };

              label(ctx, "LDR", stackX + 36, 88, { size: 11, align: "left" });
              label(ctx, formatOhm(p.rLdr), stackX + 36, 104, { mono: true, size: 11, align: "left" });
              label(ctx, "R2", stackX + 36, 248, { size: 11, align: "left" });
              label(ctx, formatOhm(p.rFixed), stackX + 36, 264, { mono: true, size: 11, align: "left" });

              const light01 = Math.min(1, p.lux / 800);
              ctx.strokeStyle = Ink.electron;
              ctx.lineWidth = 1.5;
              ctx.lineCap = "round";
              for (let i = 0; i < 3; i++) {
                const oy = 78 + i * 16;
                ctx.globalAlpha = 0.25 + light01 * 0.75;
                ctx.beginPath();
                ctx.moveTo(stackX - 70, oy - 10);
                ctx.lineTo(stackX - 42, oy + 4);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(stackX - 42, oy + 4);
                ctx.lineTo(stackX - 52, oy + 2);
                ctx.moveTo(stackX - 42, oy + 4);
                ctx.lineTo(stackX - 44, oy - 6);
                ctx.stroke();
              }
              ctx.globalAlpha = 1;
              label(ctx, `${p.lux.toFixed(0)} lux`, stackX - 56, 54, {
                mono: true,
                size: 11,
                color: Ink.electron,
              });

              resistorBody(ctx, 400, tap.y, 70, R_LED, Math.min(1, p.iLed * 30));
              label(ctx, "Rs", 435, tap.y - 24, { size: 11 });
              const led = ledDome(ctx, 620, tap.y - 34, Ink.electron, Math.min(1, p.iLed / 0.0008));
              label(ctx, "out", 620, tap.y - 58, { size: 11 });

              wire(ctx, [bat.pos, { x: bat.pos.x, y: ldr.top.y }, ldr.top]);
              wire(ctx, [ldr.bot, tap]);
              wire(ctx, [tap, r2.top]);
              wire(ctx, [r2.bot, { x: bat.neg.x, y: r2.bot.y }, bat.neg]);
              wire(ctx, [tap, { x: 390, y: tap.y }]);
              wire(ctx, [
                { x: 480, y: tap.y },
                { x: led.anode.x, y: tap.y },
                led.anode,
              ]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: r2.bot.y },
                { x: bat.neg.x, y: r2.bot.y },
              ]);
              junction(ctx, tap.x, tap.y);
              junction(ctx, bat.neg.x, r2.bot.y);
              junction(ctx, led.cathode.x, r2.bot.y);

              label(ctx, `Vout ${formatVolt(p.vout)}`, tap.x + 52, tap.y + 22, {
                mono: true,
                size: 12,
                color: Ink.text,
                align: "left",
              });

              const loop: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: ldr.top.y },
                ldr.top,
                ldr.bot,
                tap,
                r2.top,
                r2.bot,
                { x: bat.neg.x, y: r2.bot.y },
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
                  tap,
                  { x: 390, y: tap.y },
                  { x: 480, y: tap.y },
                  { x: led.anode.x, y: tap.y },
                  led.anode,
                  led.cathode,
                  { x: led.cathode.x, y: r2.bot.y },
                  { x: bat.neg.x, y: r2.bot.y },
                ];
                ledFlow.current.setPath(branch, false);
                ledFlow.current.set(Math.max(3, Math.min(14, Math.round(p.iLed * 12000))), -90);
                ledFlow.current.step(dt);
                ledFlow.current.draw(ctx);
              }

              label(ctx, `R ~ 1 / E^g   g = ${GAMMA}`, 400, 392, {
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
