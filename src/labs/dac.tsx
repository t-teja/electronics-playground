import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatOhm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  bitLed,
  clearSim,
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

const N = 4;
const LEVELS = 2 ** N;
const VREF = 5;
const R = 10000;
const VF_LED = 1.8;
const R_LED = 470;

export function DacLab() {
  const lab = LAB_BY_SLUG.dac!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [code, setCode] = useState(10);
  const vout = VREF * (code / LEVELS);
  const bits = [0, 1, 2, 3].map((i) => ((code >> (N - 1 - i)) & 1) === 1);
  const iLed = Math.max(0, (vout - VF_LED) / R_LED);
  const ledOn = iLed >= 0.001;

  const flow = useRef(new ElectronFlow());
  const outFlow = useRef(new ElectronFlow());
  const params = useRef({ code, vout, bits, iLed, ledOn });
  params.current = { code, vout, bits, iLed, ledOn };

  const insight = useMemo(() => {
    if (code === 0) {
      return `Code 0. Every R-2R switch sits on ground, Vout is 0 V, the LED is dark. The ladder is a well-behaved voltage divider waiting for a bit.`;
    }
    if (code === 15) {
      return `Full scale for a 4-bit word. Vout = Vref \u00b7 15 / 16 = ${formatVolt(VREF * 15 / 16)}. An R-2R ladder never quite reaches Vref.`;
    }
    return `Vout = Vref \u00b7 D / 2\u207f = ${formatVolt(VREF)} \u00b7 ${code} / ${LEVELS} = ${formatVolt(vout)}. Each bit is a switch onto a binary-weighted rung of the R-2R ladder.`;
  }, [code, vout]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Code" value={`${code} / 15`} />
          <Meter label="Vout" value={formatVolt(vout)} />
          <Meter label="Bits" value={bits.map((b) => (b ? "1" : "0")).join("")} />
        </>
      }
      controls={
        <LinearControl
          label="Input code"
          value={code}
          display={`${code}`}
          min={0}
          max={15}
          step={1}
          onChange={setCode}
          hint="4-bit integer 0\u201315. Bits in, analog out."
        />
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            {"Vout = Vref \u00b7 D / 2\u207f = "}{formatVolt(vout)}{" \u00b7 R = "}{formatOhm(R)}
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
              const bat = battery(ctx, 60, 140);
              label(ctx, `Vref ${formatVolt(VREF)}`, 60, 196, { mono: true, size: 11 });
              const topY = 56;
              const botY = 300;
              const nodeY = 168;

              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }, { x: 720, y: topY }]);
              wire(ctx, [bat.neg, { x: bat.neg.x, y: botY }, { x: 720, y: botY }]);
              junction(ctx, bat.pos.x, topY);
              junction(ctx, bat.neg.x, botY);

              const xs = [200, 320, 440, 560];
              xs.forEach((x, i) => {
                const on = p.bits[i]!;
                bitLed(ctx, x, 78, on);
                label(ctx, `b${N - 1 - i}`, x, 42, { size: 10, mono: true });
                resistorBody(ctx, x - 30, 128, 60, 2 * R, 0);
                label(ctx, "2R", x + 48, 128, { size: 9, align: "left" });
                wire(ctx, [
                  { x, y: 90 },
                  { x, y: 114 },
                ]);
                if (on) {
                  wire(ctx, [
                    { x: x - 40, y: 128 },
                    { x: x - 40, y: topY },
                  ]);
                  junction(ctx, x - 40, topY);
                } else {
                  wire(ctx, [
                    { x: x - 40, y: 128 },
                    { x: x - 40, y: botY },
                  ]);
                  junction(ctx, x - 40, botY);
                }
                wire(ctx, [
                  { x: x + 40, y: 128 },
                  { x: x + 40, y: nodeY },
                  { x, y: nodeY },
                ]);
                junction(ctx, x, nodeY);
              });

              for (let i = 0; i < 3; i++) {
                const a = xs[i]!;
                const b = xs[i + 1]!;
                resistorBody(ctx, a + 10, nodeY, b - a - 20, R, 0);
                label(ctx, "R", (a + b) / 2, nodeY + 24, { size: 9 });
              }
              resistorBody(ctx, xs[3]! + 10, nodeY, 70, 2 * R, 0);
              label(ctx, "2R", xs[3]! + 45, nodeY + 24, { size: 9 });
              wire(ctx, [
                { x: xs[3]! + 90, y: nodeY },
                { x: 700, y: nodeY },
                { x: 700, y: botY },
              ]);
              junction(ctx, 700, botY);

              const voutPt: Pt = { x: xs[0]!, y: nodeY };
              roundRect(ctx, 84, 214, 70, 36, 6);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.beginPath();
              ctx.moveTo(154, 232);
              ctx.lineTo(172, 222);
              ctx.lineTo(172, 242);
              ctx.closePath();
              ctx.fillStyle = Ink.pin;
              ctx.fill();
              label(ctx, "buf", 119, 232, { size: 10, color: Ink.text });
              wire(ctx, [voutPt, { x: voutPt.x, y: 232 }, { x: 154, y: 232 }]);

              resistorBody(ctx, 280, 232, 70, R_LED, Math.min(1, p.iLed * 20));
              label(ctx, "470 \u03a9", 315, 210, { size: 10, mono: true });
              const led = ledDome(ctx, 720, 198, p.ledOn ? "#5eead4" : Ink.body, p.ledOn ? 1 : 0);
              wire(ctx, [
                { x: 172, y: 232 },
                { x: 270, y: 232 },
              ]);
              wire(ctx, [
                { x: 360, y: 232 },
                { x: led.anode.x, y: 232 },
                led.anode,
              ]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: botY },
                { x: 700, y: botY },
              ]);
              junction(ctx, led.cathode.x, botY);
              label(ctx, `Vout ${formatVolt(p.vout)}`, 119, 266, { mono: true, size: 11 });

              const loop: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                { x: xs[0]! - 40, y: topY },
                { x: xs[0]! - 40, y: 128 },
                { x: xs[0]! + 40, y: 128 },
                { x: xs[0]!, y: nodeY },
                { x: 700, y: nodeY },
                { x: 700, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              flow.current.setPath(loop, true);
              flow.current.set(p.code > 0 ? 10 : 4, -80);
              flow.current.step(dt);
              flow.current.draw(ctx);

              if (p.ledOn) {
                const o: Pt[] = [
                  { x: 172, y: 232 },
                  { x: 270, y: 232 },
                  { x: 360, y: 232 },
                  { x: led.anode.x, y: 232 },
                  led.anode,
                  led.cathode,
                  { x: led.cathode.x, y: botY },
                  { x: 700, y: botY },
                ];
                outFlow.current.setPath(o, false);
                outFlow.current.set(Math.max(4, Math.min(16, Math.round(4 + p.vout * 3))), -90);
                outFlow.current.step(dt);
                outFlow.current.draw(ctx);
              }

              label(ctx, `Vout = Vref \u00b7 D / 2^n = ${formatVolt(p.vout)}`, 400, 392, {
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
