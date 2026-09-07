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
      return `On target. Error is under 2 deg. The pot reports shaft angle and the PD loop holds drive near zero against the load.`;
    }
    if (Math.abs(read.drive) > 8) {
      return `Large error. Drive saturates near the rail so the motor slews toward ${targetDeg.toFixed(0)} deg.`;
    }
    return `Error ${read.err.toFixed(1)} deg. u = Kp e + Kd de/dt commands the armature. Feedback closes through the shaft pot.`;
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
            const u = clamp(KP * e + KD * de, -12, 12);
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
              ctx.fillStyle = Ink.package;
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.rect(40, 80, 110, 70);
              ctx.fill();
              ctx.stroke();
              label(ctx, "PD", 95, 105, { size: 14, color: Ink.text });
              label(ctx, `u ${u.toFixed(1)} V`, 95, 128, { mono: true, size: 11 });

              battery(ctx, 60, 220);
              dcMotor(ctx, 320, 220, s.th, Math.min(1, Math.abs(s.i) / 2));
              const pot = potentiometer(ctx, 480, 220, 120, potT, 5000);
              wire(ctx, [
                { x: 150, y: 115 },
                { x: 200, y: 115 },
                { x: 200, y: 208 },
                { x: 268, y: 208 },
              ]);
              wire(ctx, [
                { x: 76, y: 220 },
                { x: 200, y: 220 },
                { x: 268, y: 232 },
              ]);
              wire(ctx, [
                { x: 268, y: 232 },
                { x: 200, y: 300 },
                { x: 44, y: 300 },
                { x: 44, y: 220 },
              ]);
              wire(
                ctx,
                [
                  { x: pot.wiper.x, y: pot.wiper.y },
                  { x: pot.wiper.x, y: 60 },
                  { x: 95, y: 60 },
                  { x: 95, y: 80 },
                ],
                2,
                "#5eead4",
              );
              label(ctx, "feedback", 200, 52, { size: 11, color: Ink.electron });
              label(ctx, `theta ${deg.toFixed(1)} deg -> ${p.targetDeg.toFixed(0)} deg`, 320, 300, {
                mono: true,
                size: 12,
              });

              scope(ctx, 520, 40, 240, 90, samplesPos.current, Ink.electron, "theta");
              scope(ctx, 520, 150, 240, 90, samplesU.current, Ink.hole, "u");
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
