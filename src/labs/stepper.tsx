import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, Meter, Segmented, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  graphPaper,
  Ink,
  label,
  roundRect,
  scope,
  wire,
  withFrame,
} from "@/lib/sim/draw";

type Mode = "full" | "half" | "micro";

/** Bipolar full-step: A+, B+, A-, B- */
const FULL: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
/** Half-step: includes both-coil positions */
const HALF: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

function coilDrive(mode: Mode, stepIndex: number, microPhase: number): [number, number] {
  if (mode === "full") {
    const s = FULL[((stepIndex % 4) + 4) % 4]!;
    return [s[0], s[1]];
  }
  if (mode === "half") {
    const s = HALF[((stepIndex % 8) + 8) % 8]!;
    const n = Math.hypot(s[0], s[1]) || 1;
    return [s[0] / n, s[1] / n];
  }
  // Microstep: sinusoidal blend
  const th = microPhase;
  return [Math.cos(th), Math.sin(th)];
}

export function StepperLab() {
  const lab = LAB_BY_SLUG.stepper!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [mode, setMode] = useState<Mode>("full");
  const [vdrive, setVdrive] = useState(12);
  const [sps, setSps] = useState(40);
  const [fwd, setFwd] = useState(true);
  const [running, setRunning] = useState(true);

  const STEPS_REV = 200; // 1.8 deg
  const stepAngle = (2 * Math.PI) / STEPS_REV;

  const sim = useRef({ step: 0, angle: 0, micro: 0, t: 0, acc: 0 });
  const [read, setRead] = useState({ deg: 0, ia: 0, ib: 0, torque: 0 });
  const samples = useRef<number[]>(Array(120).fill(0.5));
  const ui = useRef(0);
  const params = useRef({ mode, vdrive, sps, fwd, running });
  params.current = { mode, vdrive, sps, fwd, running };

  const insight = useMemo(() => {
    if (mode === "full") {
      return `Full step. One coil at a time. Step angle is ${(360 / STEPS_REV).toFixed(1)} deg. Holding torque is highest; motion is choppier.`;
    }
    if (mode === "half") {
      return `Half step. Alternates single-coil and dual-coil positions. Twice the steps per turn, smoother motion, slightly lower peak torque.`;
    }
    return `Microstep. Coil currents follow a sine/cosine pair. Position is continuous within a full step; usable torque falls as you subdivide and as speed rises.`;
  }, [mode]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Angle" value={`${read.deg.toFixed(1)} deg`} />
          <Meter label="Ia" value={formatAmp(read.ia)} />
          <Meter label="Ib" value={formatAmp(read.ib)} />
          <Meter label="Torque" value={`${read.torque.toFixed(2)} (rel)`} />
        </>
      }
      controls={
        <>
          <Control label="Drive mode">
            <Segmented
              value={mode}
              onChange={(v) => setMode(v as Mode)}
              options={[
                { id: "full", label: "Full" },
                { id: "half", label: "Half" },
                { id: "micro", label: "Micro" },
              ]}
            />
          </Control>
          <ToggleControl label="Run" checked={running} on="on" off="pause" onCheckedChange={setRunning} />
          <ToggleControl label="Direction" checked={fwd} on="CW" off="CCW" onCheckedChange={setFwd} />
          <LinearControl
            label="Drive V"
            value={vdrive}
            display={formatVolt(vdrive)}
            min={5}
            max={24}
            step={0.5}
            onChange={setVdrive}
          />
          <LinearControl
            label="Step rate"
            value={sps}
            display={`${sps.toFixed(0)} /s`}
            min={5}
            max={200}
            step={1}
            onChange={setSps}
            hint="Qualitative: torque falls as speed rises."
          />
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            {"theta_step = 360 / "}{STEPS_REV}{" = "}{(360 / STEPS_REV).toFixed(1)}{" deg"}
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            const h = Math.min(0.05, Math.max(1e-4, dt));
            s.t += h;

            const dir = p.fwd ? 1 : -1;
            const speedFactor = clamp(1 - p.sps / 280, 0.25, 1);
            const Ipk = (p.vdrive / 12) * 1.2 * speedFactor;

            if (p.running) {
              if (p.mode === "micro") {
                s.micro += dir * (p.sps / STEPS_REV) * 2 * Math.PI * h;
                s.angle = s.micro;
              } else {
                s.acc += p.sps * h;
                while (s.acc >= 1) {
                  s.acc -= 1;
                  s.step += dir;
                  const tableLen = p.mode === "full" ? 4 : 8;
                  const microSteps = p.mode === "full" ? STEPS_REV / 4 : STEPS_REV / 8;
                  // Advance mechanical angle by one table step
                  s.angle += dir * ((2 * Math.PI) / (tableLen * (STEPS_REV / tableLen)));
                  void microSteps;
                }
              }
            }

            const [da, db] =
              p.mode === "micro"
                ? coilDrive("micro", 0, s.micro)
                : coilDrive(p.mode, s.step, 0);
            const ia = da * Ipk;
            const ib = db * Ipk;
            const torque = Math.hypot(da, db) * speedFactor * (p.vdrive / 12);

            samples.current.push(clamp(0.5 + 0.5 * Math.sin(s.angle), 0, 1));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              battery(ctx, 56, 120);
              label(ctx, formatVolt(p.vdrive), 56, 172, { mono: true, size: 11 });

              // Driver block
              roundRect(ctx, 120, 80, 100, 80, 6);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = Ink.pin;
              ctx.stroke();
              label(ctx, "driver", 170, 110, { size: 12, color: Ink.text });
              label(ctx, p.mode, 170, 132, { size: 11, color: Ink.electron });

              // Coil A
              const aOn = Math.abs(da) > 0.15;
              ctx.strokeStyle = aOn ? "#5eead4" : Ink.copper;
              ctx.lineWidth = 3;
              ctx.beginPath();
              for (let i = 0; i < 4; i++) {
                ctx.arc(280, 90 + i * 14, 7, Math.PI, 0, false);
              }
              ctx.stroke();
              label(ctx, "coil A", 280, 160, { size: 11 });
              label(ctx, da > 0.1 ? "A+" : da < -0.1 ? "A-" : "off", 330, 110, {
                size: 11,
                color: aOn ? "#5eead4" : Ink.muted,
                align: "left",
              });

              // Coil B
              const bOn = Math.abs(db) > 0.15;
              ctx.strokeStyle = bOn ? "#5eead4" : Ink.copper;
              ctx.lineWidth = 3;
              ctx.beginPath();
              for (let i = 0; i < 4; i++) {
                ctx.arc(280, 220 + i * 14, 7, Math.PI, 0, false);
              }
              ctx.stroke();
              label(ctx, "coil B", 280, 290, { size: 11 });
              label(ctx, db > 0.1 ? "B+" : db < -0.1 ? "B-" : "off", 330, 250, {
                size: 11,
                color: bOn ? "#5eead4" : Ink.muted,
                align: "left",
              });

              wire(ctx, [{ x: 76, y: 120 }, { x: 120, y: 120 }]);
              wire(ctx, [{ x: 220, y: 100 }, { x: 250, y: 100 }, { x: 250, y: 90 }]);
              wire(ctx, [{ x: 220, y: 140 }, { x: 250, y: 140 }, { x: 250, y: 262 }]);

              // Rotor
              const cx = 520;
              const cy = 200;
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.arc(cx, cy, 60, 0, Math.PI * 2);
              ctx.stroke();
              // Teeth hint
              for (let i = 0; i < 12; i++) {
                const a = s.angle + (i * Math.PI) / 6;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48);
                ctx.lineTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58);
                ctx.strokeStyle = Ink.muted;
                ctx.lineWidth = 2;
                ctx.stroke();
              }
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(s.angle);
              ctx.fillStyle = Ink.body;
              ctx.fillRect(-10, -10, 20, 20);
              ctx.strokeStyle = Ink.electron;
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.moveTo(0, -40);
              ctx.lineTo(0, 40);
              ctx.stroke();
              ctx.restore();

              wire(ctx, [{ x: 310, y: 118 }, { x: 420, y: 160 }, { x: 460, y: 180 }]);
              wire(ctx, [{ x: 310, y: 248 }, { x: 420, y: 240 }, { x: 460, y: 220 }]);

              const deg = (((s.angle * 180) / Math.PI) % 360 + 360) % 360;
              label(ctx, `${deg.toFixed(1)} deg * ${p.fwd ? "CW" : "CCW"}`, cx, cy + 88, {
                mono: true,
                size: 12,
              });
              label(ctx, `torque ~ ${torque.toFixed(2)} (vs speed)`, cx, cy + 108, {
                size: 11,
                color: Ink.muted,
              });

              scope(ctx, 560, 40, 210, 90, samples.current, Ink.electron, "theta");
              label(ctx, "bipolar A/B sequence", 400, 380, { mono: true, size: 13, color: Ink.text });
            });

            ui.current += h;
            if (ui.current > 0.08) {
              ui.current = 0;
              const deg = (((s.angle * 180) / Math.PI) % 360 + 360) % 360;
              setRead({ deg, ia, ib, torque });
            }
          }}
        />
      }
    />
  );
}
