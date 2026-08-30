import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, LogControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatFarad, formatOhm, formatSec, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  capPlates,
  clearSim,
  graphPaper,
  Ink,
  junction,
  label,
  resistorBody,
  scope,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

function spdt(ctx: CanvasRenderingContext2D, x: number, y: number, charge: boolean) {
  const pole = { x: x + 36, y };
  const ch = { x, y: y - 22 };
  const dis = { x, y: y + 22 };
  ctx.strokeStyle = Ink.pin;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(pole.x, pole.y, 3.4, 0, Math.PI * 2);
  ctx.arc(ch.x, ch.y, 3.4, 0, Math.PI * 2);
  ctx.arc(dis.x, dis.y, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = Ink.pin;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(pole.x, pole.y);
  if (charge) ctx.lineTo(ch.x, ch.y);
  else ctx.lineTo(dis.x, dis.y);
  ctx.strokeStyle = Ink.copper;
  ctx.stroke();
  label(ctx, "charge", ch.x - 8, ch.y - 14, { size: 10, align: "right" });
  label(ctx, "discharge", dis.x - 8, dis.y + 14, { size: 10, align: "right" });
  return { pole, charge: ch, discharge: dis };
}

export function CapacitorLab() {
  const lab = LAB_BY_SLUG.capacitor!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vsrc, setVsrc] = useState(9);
  const [c, setC] = useState(0.000047);
  const [r, setR] = useState(2200);
  const [closed, setClosed] = useState(true);

  const sim = useRef({ vc: 0, i: 0 });
  const [read, setRead] = useState({ vc: 0, i: 0 });
  const samples = useRef<number[]>(Array(120).fill(0));
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);
  const params = useRef({ vsrc, c, r, closed });
  params.current = { vsrc, c, r, closed };

  const tau = r * c;

  const insight = useMemo(() => {
    const frac = read.vc / Math.max(0.01, vsrc);
    if (!closed) {
      return `Thrown to discharge. The capacitor dumps through ${formatOhm(r)}. Voltage is ${formatVolt(read.vc)}. \u03c4 = ${formatSec(tau)}.`;
    }
    if (frac > 0.95) {
      return `Charged. Plate voltage matches the source, so the field cancels further current. I \u2248 ${formatAmp(read.i)}. The field stores \u00bdCV\u00b2.`;
    }
    if (frac < 0.08) {
      return `Just thrown to charge. The empty capacitor looks like a short. A surge of ${formatAmp(read.i)} rushes onto the plates. \u03c4 = ${formatSec(tau)}.`;
    }
    return `Charging. Electrons pile onto the right (\u2212) plate; the left (+) plate is stripped of them. The growing field fights the source. Time constant \u03c4 = RC = ${formatSec(tau)}.`;
  }, [closed, read.vc, read.i, r, tau, vsrc]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="V capacitor" value={formatVolt(read.vc)} />
          <Meter label="Current" value={formatAmp(read.i)} />
          <Meter label="Time constant" value={formatSec(tau)} />
        </>
      }
      controls={
        <>
          <ToggleControl
            label="Switch"
            checked={closed}
            on="charging"
            off="discharging"
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
            label="Capacitance"
            value={c}
            display={formatFarad(c)}
            min={1e-6}
            max={4.7e-4}
            onChange={setC}
            hint="Larger C holds more charge for the same voltage."
          />
          <LogControl
            label="Series R"
            value={r}
            display={formatOhm(r)}
            min={100}
            max={20000}
            onChange={setR}
            hint="Sets how fast the exponential settles."
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            const target = p.closed ? p.vsrc : 0;
            const i = (target - s.vc) / p.r;
            s.i = i;
            s.vc = clamp(s.vc + (i / p.c) * dt, 0, Math.max(p.vsrc, 0.01) * 1.05);
            samples.current.push(s.vc / Math.max(p.vsrc, 0.01));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const y = 190;
              const botY = 310;
              const bat = battery(ctx, 56, y);
              const sw = spdt(ctx, 168, y, p.closed);
              resistorBody(ctx, 330, y, 90, p.r, Math.min(1, Math.abs(s.i) * 40));
              capPlates(ctx, 540, y, s.vc / Math.max(p.vsrc, 0.01));

              wire(ctx, [bat.pos, { x: 120, y }, { x: 120, y: sw.charge.y }, sw.charge]);
              wire(ctx, [sw.pole, { x: 320, y }]);
              wire(ctx, [
                { x: 430, y },
                { x: 524, y },
              ]);
              wire(ctx, [
                { x: 556, y },
                { x: 680, y },
                { x: 680, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);
              wire(ctx, [
                sw.discharge,
                { x: 120, y: sw.discharge.y },
                { x: 120, y: botY },
                { x: bat.neg.x, y: botY },
              ]);
              junction(ctx, bat.neg.x, botY);
              junction(ctx, 120, botY);

              label(ctx, formatVolt(p.vsrc), 56, y + 52, { mono: true, size: 12 });
              label(ctx, formatOhm(p.r), 375, y - 32, { mono: true, size: 12 });
              label(ctx, formatFarad(p.c), 540, y - 48, { mono: true, size: 12 });
              label(ctx, "+", 520, y - 40, { size: 12, color: Ink.hole });
              label(ctx, "-", 560, y - 40, { size: 14, color: Ink.electron });
              label(ctx, p.closed ? "charging" : "discharging", 204, y - 52, { size: 11 });

              const q01 = s.vc / Math.max(p.vsrc, 0.01);
              for (let n = 0; n < Math.round(q01 * 14); n++) {
                ctx.beginPath();
                ctx.fillStyle = Ink.hole;
                ctx.arc(532 - (n % 2) * 6, y - 22 + (n % 7) * 7, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = Ink.electron;
                ctx.beginPath();
                ctx.arc(550 + (n % 2) * 6, y - 22 + (n % 7) * 7, 2, 0, Math.PI * 2);
                ctx.fill();
              }

              const loop: Pt[] = p.closed
                ? [
                    bat.pos,
                    { x: 120, y },
                    { x: 120, y: sw.charge.y },
                    sw.charge,
                    sw.pole,
                    { x: 330, y },
                    { x: 524, y },
                  ]
                : [
                    { x: 524, y },
                    { x: 330, y },
                    sw.pole,
                    sw.discharge,
                    { x: 120, y: sw.discharge.y },
                    { x: 120, y: botY },
                    { x: bat.neg.x, y: botY },
                  ];
              const mag = Math.abs(s.i);
              flow.current.setPath(loop, false);
              flow.current.set(
                mag > 0.00005 ? Math.max(4, Math.min(28, mag * 800)) : 0,
                (s.i >= 0 ? -1 : 1) * Math.min(220, 40 + mag * 6000),
              );
              flow.current.step(dt);
              flow.current.draw(ctx);

              scope(ctx, 540, 36, 220, 90, samples.current, Ink.electron, "Vc(t)");
              label(ctx, `\u03c4 = RC = ${formatSec(p.r * p.c)}`, 400, 380, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
            });

            ui.current += dt;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead((prev) => {
                if (Math.abs(prev.vc - s.vc) < 0.01 && Math.abs(prev.i - s.i) < 0.00005) return prev;
                return { vc: s.vc, i: s.i };
              });
            }
          }}
        />
      }
    />
  );
}
