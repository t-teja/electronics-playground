import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  dcMotor,
  graphPaper,
  Ink,
  junction,
  label,
  potentiometer,
  scope,
  wire,
  withFrame,
} from "@/lib/sim/draw";

const J = 0.00008;
const B = 0.00004;
const KT = 0.02;
const KE = 0.02;
const R = 3.5;
const KP = 4.5;
const KD = 0.12;
const VSUP = 12;

export function ServoLab() {
  const lab = LAB_BY_SLUG["servo"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [targetDeg, setTargetDeg] = useState(45);
  const [load, setLoad] = useState(0.01);

  const sim = useRef({ th: 0, w: 0, i: 0, ePrev: 0 });
  const [read, setRead] = useState({ deg: 0, err: 0, drive: 0, i: 0 });
  const samplesPos = useRef<number[]>(Array(120).fill(0.5));
  const samplesU = useRef<number[]>(Array(120).fill(0.5));
  const ui = useRef(0);
  const params = useRef({ targetDeg, load });
  params.current = { targetDeg, load };

  const insight = useMemo(() => {
    const e = Math.abs(read.err);
    if (e < 2) {
      return `On target. Error is under 2 deg. The shaft pot reports angle; the driver holds the armature near zero against the load.`;
    }
    if (Math.abs(read.drive) > 8) {
      return `Large error. The driver saturates near the rail so the motor slews toward ${targetDeg.toFixed(0)} deg.`;
    }
    return `Error ${read.err.toFixed(1)} deg. u = Kp e + Kd de/dt commands the driver. Feedback closes through the railed shaft pot.`;
  }, [read, targetDeg]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Position" value={`${read.deg.toFixed(1)} deg`} />
          <Meter label="Error" value={`${read.err.toFixed(1)} deg`} />
          <Meter label="Drive" value={formatVolt(read.drive)} />
          <Meter label="Current" value={formatAmp(read.i)} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Target angle"
            value={targetDeg}
            display={`${targetDeg.toFixed(0)} deg`}
            min={-90}
            max={90}
            step={1}
            onChange={setTargetDeg}
          />
          <LinearControl
            label="Load torque"
            value={load}
            display={`${load.toFixed(3)} N*m`}
            min={0}
            max={0.06}
            step={0.002}
            onChange={setLoad}
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            const h = Math.min(0.02, Math.max(1e-4, dt));
            const thRef = (p.targetDeg * Math.PI) / 180;
            const e = thRef - s.th;
            const de = (e - s.ePrev) / h;
            s.ePrev = e;
            const u = clamp(KP * e + KD * de, -VSUP, VSUP);
            const bemf = KE * s.w;
            s.i = clamp((u - bemf) / R, -4, 4);
            if (!Number.isFinite(s.i)) s.i = 0;
            const tau = KT * s.i - p.load * Math.sign(s.w || e) - B * s.w;
            s.w = clamp(s.w + (tau / J) * h, -40, 40);
            if (!Number.isFinite(s.w)) s.w = 0;
            s.th = clamp(s.th + s.w * h, -Math.PI / 2, Math.PI / 2);
            const deg = (s.th * 180) / Math.PI;
            const potT = clamp((s.th + Math.PI / 2) / Math.PI, 0, 1);
            samplesPos.current.push(potT);
            samplesU.current.push(clamp(0.5 + u / 24, 0, 1));
            if (samplesPos.current.length > 160) samplesPos.current.shift();
            if (samplesU.current.length > 160) samplesU.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              // PD block
              ctx.fillStyle = Ink.package;
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.rect(40, 60, 100, 64);
              ctx.fill();
              ctx.stroke();
              label(ctx, "PD", 90, 84, { size: 14, color: Ink.text });
              label(ctx, `u ${u.toFixed(1)} V`, 90, 106, { mono: true, size: 11 });

              // Driver / H-bridge between PD and motor
              ctx.beginPath();
              ctx.rect(180, 60, 110, 64);
              ctx.fill();
              ctx.stroke();
              label(ctx, "driver", 235, 84, { size: 13, color: Ink.text });
              label(ctx, "H-bridge", 235, 106, { size: 11, color: Ink.muted });

              // Motor supply (separate from signal)
              const bat = battery(ctx, 60, 220);
              label(ctx, formatVolt(VSUP), 60, 272, { mono: true, size: 11 });
              label(ctx, "Vm", 60, 188, { size: 10, color: Ink.muted });

              // Supply to driver rails
              wire(ctx, [bat.pos, { x: bat.pos.x, y: 40 }, { x: 235, y: 40 }, { x: 235, y: 60 }]);
              wire(ctx, [bat.neg, { x: bat.neg.x, y: 300 }, { x: 235, y: 300 }, { x: 235, y: 124 }]);

              // PD command into driver
              wire(ctx, [{ x: 140, y: 92 }, { x: 180, y: 92 }], 2, "#5eead4");

              dcMotor(ctx, 400, 220, s.th, Math.min(1, Math.abs(s.i) / 2));
              // Driver outputs to motor
              wire(ctx, [
                { x: 290, y: 80 },
                { x: 340, y: 80 },
                { x: 340, y: 208 },
                { x: 348, y: 208 },
              ]);
              wire(ctx, [
                { x: 290, y: 104 },
                { x: 320, y: 104 },
                { x: 320, y: 232 },
                { x: 348, y: 232 },
              ]);

              // Railed feedback pot: left=+V, right=GND, wiper -> PD
              const pot = potentiometer(ctx, 520, 220, 140, potT, 5000);
              wire(ctx, [
                { x: bat.pos.x, y: 40 },
                { x: pot.left.x, y: 40 },
                pot.left,
              ]);
              wire(ctx, [
                pot.right,
                { x: pot.right.x, y: 300 },
                { x: bat.neg.x, y: 300 },
              ]);
              wire(
                ctx,
                [
                  pot.wiper,
                  { x: pot.wiper.x, y: 48 },
                  { x: 90, y: 48 },
                  { x: 90, y: 60 },
                ],
                2,
                "#5eead4",
              );
              junction(ctx, bat.pos.x, 40);
              junction(ctx, bat.neg.x, 300);
              junction(ctx, pot.right.x, 300);
              label(ctx, "feedback Vw", 300, 36, { size: 11, color: Ink.electron });
              label(ctx, "shaft pot", 590, 268, { size: 11, color: Ink.muted });
              label(ctx, `theta ${deg.toFixed(1)} deg -> ${p.targetDeg.toFixed(0)} deg`, 400, 300, {
                mono: true,
                size: 12,
              });

              scope(ctx, 520, 40, 240, 70, samplesPos.current, Ink.electron, "theta");
              scope(ctx, 520, 120, 240, 70, samplesU.current, Ink.hole, "u");
              label(ctx, "u = Kp e + Kd de/dt", 400, 380, { mono: true, size: 13, color: Ink.text });
            });

            ui.current += h;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead({ deg, err: (e * 180) / Math.PI, drive: u, i: s.i });
            }
          }}
        />
      }
    />
  );
}
