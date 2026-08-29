import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatSec, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  graphPaper,
  Ink,
  junction,
  label,
  roundRect,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const VCC = 5;
const V_SOUND = 343;
const CYCLE = 1.15;

export function UltrasonicLab() {
  const lab = LAB_BY_SLUG.ultrasonic!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [distance, setDistance] = useState(40);

  const dM = distance / 100;
  const tEcho = (2 * dM) / V_SOUND;
  const dBack = (V_SOUND * tEcho) / 2;

  const flow = useRef(new ElectronFlow());
  const params = useRef({ distance, tEcho, dBack });
  params.current = { distance, tEcho, dBack };

  const insight = useMemo(() => {
    if (distance < 8) {
      return `Very close. The round trip is only ${formatSec(tEcho)}. HC-SR04 modules usually refuse anything under ~2 cm — the ringing of the transmit click hasn’t faded.`;
    }
    if (distance > 250) {
      return `A long throw. t_echo = 2d / ${V_SOUND} m/s = ${formatSec(tEcho)}. Air, temperature, and a soft wall all steal amplitude, but the clock still reads distance as v t / 2.`;
    }
    return `Trigger, wait, listen. Sound flies to the wall and back in ${formatSec(tEcho)}. d = v t / 2 = ${distance.toFixed(0)} cm with v = ${V_SOUND} m/s in air.`;
  }, [distance, tEcho]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="t echo" value={formatSec(tEcho)} />
          <Meter label="Distance" value={`${distance.toFixed(0)} cm`} />
          <Meter label="v air" value={`${V_SOUND} m/s`} />
        </>
      }
      controls={
        <LinearControl
          label="Distance"
          value={distance}
          display={`${distance.toFixed(0)} cm`}
          min={2}
          max={400}
          step={1}
          onChange={setDistance}
          hint="Slide the wall. Echo time is the round trip at 343 m/s."
        />
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            d = v t / 2 = {V_SOUND} · {formatSec(tEcho)} / 2 = {dBack.toFixed(3)} m
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
              const bat = battery(ctx, 56, 200);
              label(ctx, formatVolt(VCC), 56, 256, { mono: true, size: 12 });
              const topY = 84;
              const botY = 300;

              roundRect(ctx, 130, 118, 210, 100, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.22)";
              ctx.stroke();
              label(ctx, "HC-SR04", 235, 136, { size: 12, color: Ink.text });

              const tx = { x: 178, y: 178 };
              const rx = { x: 292, y: 178 };
              ctx.beginPath();
              ctx.arc(tx.x, tx.y, 22, 0, Math.PI * 2);
              ctx.arc(rx.x, rx.y, 22, 0, Math.PI * 2);
              ctx.fillStyle = Ink.body;
              ctx.fill();
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 1.6;
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(tx.x, tx.y, 10, 0, Math.PI * 2);
              ctx.arc(rx.x, rx.y, 10, 0, Math.PI * 2);
              ctx.stroke();
              label(ctx, "TX", tx.x, tx.y + 40, { size: 10 });
              label(ctx, "RX", rx.x, rx.y + 40, { size: 10 });

              const pins = ["VCC", "TRIG", "ECHO", "GND"];
              pins.forEach((name, i) => {
                const px = 154 + i * 48;
                ctx.fillStyle = Ink.pin;
                ctx.fillRect(px - 2, 218, 4, 12);
                label(ctx, name, px, 244, { size: 9, mono: true });
              });

              const wallX = 400 + ((p.distance - 2) / 398) * 340;
              ctx.fillStyle = Ink.body;
              ctx.fillRect(wallX, 70, 18, 220);
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 1.4;
              ctx.strokeRect(wallX, 70, 18, 220);
              label(ctx, "wall", wallX + 9, 58, { size: 11 });
              label(ctx, `${p.distance.toFixed(0)} cm`, wallX + 9, 304, { mono: true, size: 11 });

              const phase = t % CYCLE;
              const oneWay = CYCLE * 0.38;
              const going = phase < oneWay;
              const coming = phase >= oneWay && phase < oneWay * 2;
              const u = going ? phase / oneWay : coming ? (phase - oneWay) / oneWay : 1;
              const pingX = going
                ? tx.x + 22 + u * (wallX - tx.x - 22)
                : wallX - u * (wallX - rx.x - 22);
              const pingY = 178;
              const trigHigh = phase < 0.08;
              const echoHigh = going || coming;

              if (going || coming) {
                ctx.save();
                ctx.globalAlpha = 0.55;
                ctx.strokeStyle = Ink.electron;
                ctx.lineWidth = 1.4;
                for (let i = 1; i <= 3; i++) {
                  ctx.beginPath();
                  ctx.arc(pingX, pingY, 6 + i * 7, -0.5, 0.5);
                  ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(pingX, pingY, 4, 0, Math.PI * 2);
                ctx.fillStyle = Ink.electron;
                ctx.fill();
                ctx.restore();
              }

              const pinY = 52;
              roundRect(ctx, 148, pinY - 16, 52, 28, 4);
              ctx.fillStyle = trigHigh ? Ink.electron : Ink.body;
              ctx.fill();
              label(ctx, "TRIG", 174, pinY, { size: 10, color: trigHigh ? Ink.bg : Ink.muted });
              roundRect(ctx, 268, pinY - 16, 52, 28, 4);
              ctx.fillStyle = echoHigh ? Ink.electron : Ink.body;
              ctx.fill();
              label(ctx, "ECHO", 294, pinY, { size: 10, color: echoHigh ? Ink.bg : Ink.muted });

              const echoW = 200;
              roundRect(ctx, 430, 40, echoW, 36, 4);
              ctx.fillStyle = Ink.scope;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.2)";
              ctx.stroke();
              ctx.beginPath();
              ctx.strokeStyle = Ink.electron;
              ctx.lineWidth = 1.6;
              const mid = 58;
              ctx.moveTo(438, mid + 10);
              ctx.lineTo(438 + echoW * 0.12, mid + 10);
              if (echoHigh) {
                ctx.lineTo(438 + echoW * 0.12, mid - 10);
                ctx.lineTo(438 + echoW * 0.12 + echoW * 0.55 * (going ? u : 1), mid - 10);
                ctx.lineTo(438 + echoW * 0.12 + echoW * 0.55 * (going ? u : 1), mid + 10);
              }
              ctx.lineTo(438 + echoW - 8, mid + 10);
              ctx.stroke();
              label(ctx, `t = ${formatSec(p.tEcho)}`, 530, 92, { mono: true, size: 11 });

              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }, { x: 154, y: topY }, { x: 154, y: 118 }]);
              wire(ctx, [
                { x: 298, y: 218 },
                { x: 298, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);
              junction(ctx, 154, topY);

              const pwr: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                { x: 154, y: topY },
                { x: 154, y: 118 },
                { x: 235, y: 118 },
                { x: 235, y: 218 },
                { x: 298, y: 218 },
                { x: 298, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              flow.current.setPath(pwr, true);
              flow.current.set(8, -70);
              flow.current.step(dt);
              flow.current.draw(ctx);

              label(ctx, "d = v t / 2", 400, 392, { mono: true, size: 13, color: Ink.text });
            });
          }}
        />
      }
    />
  );
}
