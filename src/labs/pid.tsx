import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, Meter, Segmented } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { clearSim, graphPaper, Ink, label, scope, withFrame } from "@/lib/sim/draw";

type Mode = "P" | "PI" | "PID";
const M = 1.0;
const K = 8;
const C = 1.2;
const UMAX = 12;

export function PidLab() {
  const lab = LAB_BY_SLUG["pid"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [mode, setMode] = useState<Mode>("PID");
  const [kp, setKp] = useState(6);
  const [ki, setKi] = useState(4);
  const [kd, setKd] = useState(1.2);
  const [setpoint, setSetpoint] = useState(1);

  const sim = useRef({ x: 0, v: 0, integ: 0, ePrev: 0, t: 0 });
  const [read, setRead] = useState({ y: 0, e: 0, u: 0 });
  const spSamples = useRef<number[]>(Array(140).fill(0.5));
  const ySamples = useRef<number[]>(Array(140).fill(0.5));
  const uSamples = useRef<number[]>(Array(140).fill(0.5));
  const ui = useRef(0);
  const params = useRef({ mode, kp, ki, kd, setpoint });
  params.current = { mode, kp, ki, kd, setpoint };

  const insight = useMemo(() => {
    if (mode === "P") {
      return "P alone. Steady-state offset remains because a springy plant needs a sustained force that pure gain cannot hold without error.";
    }
    if (mode === "PI") {
      return "PI. Integral winds until offset vanishes. Watch for overshoot if Ki is aggressive; anti-windup clamps the integrator at the rail.";
    }
    return "PID. Derivative damps the ring that I introduces. Step the setpoint and compare rise, overshoot, and settling across modes.";
  }, [mode]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Process" value={read.y.toFixed(2)} />
          <Meter label="Error" value={read.e.toFixed(2)} />
          <Meter label="Effort u" value={read.u.toFixed(2)} />
          <Meter label="Setpoint" value={setpoint.toFixed(2)} />
        </>
      }
      controls={
        <>
          <Control label="Mode">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { id: "P", label: "P" },
                { id: "PI", label: "PI" },
                { id: "PID", label: "PID" },
              ]}
            />
          </Control>
          <LinearControl label="Kp" value={kp} display={kp.toFixed(1)} min={0} max={20} step={0.1} onChange={setKp} />
          <LinearControl label="Ki" value={ki} display={ki.toFixed(1)} min={0} max={20} step={0.1} onChange={setKi} disabled={mode === "P"} />
          <LinearControl label="Kd" value={kd} display={kd.toFixed(2)} min={0} max={5} step={0.05} onChange={setKd} disabled={mode !== "PID"} />
          <LinearControl label="Setpoint" value={setpoint} display={setpoint.toFixed(2)} min={0} max={2} step={0.05} onChange={setSetpoint} hint="Mass-spring-damper plant." />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            const h = Math.min(0.02, Math.max(1e-4, dt));
            s.t += h;
            const e = p.setpoint - s.x;
            const de = (e - s.ePrev) / h;
            s.ePrev = e;
            const kiEff = p.mode === "P" ? 0 : p.ki;
            const kdEff = p.mode === "PID" ? p.kd : 0;
            let u = p.kp * e + kiEff * s.integ + kdEff * de;
            const saturated = u > UMAX || u < -UMAX;
            u = clamp(u, -UMAX, UMAX);
            if (!saturated || e * u <= 0) {
              s.integ = clamp(s.integ + e * h, -8, 8);
            }
            const a = (u - C * s.v - K * s.x) / M;
            s.v = clamp(s.v + a * h, -20, 20);
            s.x = clamp(s.x + s.v * h, -0.5, 2.5);
            if (!Number.isFinite(s.x)) {
              s.x = 0;
              s.v = 0;
              s.integ = 0;
            }
            const norm = (v: number) => clamp(v / 2.2, 0, 1);
            spSamples.current.push(norm(p.setpoint));
            ySamples.current.push(norm(s.x));
            uSamples.current.push(clamp(0.5 + u / (2 * UMAX), 0, 1));
            if (spSamples.current.length > 160) spSamples.current.shift();
            if (ySamples.current.length > 160) ySamples.current.shift();
            if (uSamples.current.length > 160) uSamples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              ctx.fillStyle = Ink.package;
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.rect(60, 50, 100, 50);
              ctx.fill();
              ctx.stroke();
              label(ctx, p.mode, 110, 75, { size: 14, color: Ink.text });
              ctx.beginPath();
              ctx.rect(240, 50, 120, 50);
              ctx.fill();
              ctx.stroke();
              label(ctx, "plant", 300, 75, { size: 13 });
              label(ctx, "Mx''+Cx'+Kx", 300, 92, { mono: true, size: 10, color: Ink.muted });
              ctx.strokeStyle = Ink.copper;
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.moveTo(160, 75);
              ctx.lineTo(240, 75);
              ctx.moveTo(360, 75);
              ctx.lineTo(420, 75);
              ctx.lineTo(420, 140);
              ctx.lineTo(110, 140);
              ctx.lineTo(110, 100);
              ctx.stroke();
              label(ctx, "y", 430, 75, { size: 12, align: "left" });
              label(ctx, "feedback", 260, 155, { size: 11, color: Ink.electron });

              const baseY = 280;
              const xPix = 200 + s.x * 120;
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(120, baseY);
              for (let i = 0; i < 8; i++) {
                const sx = 120 + ((xPix - 140) * i) / 8;
                ctx.lineTo(sx, baseY + (i % 2 === 0 ? -10 : 10));
              }
              ctx.lineTo(xPix - 20, baseY);
              ctx.stroke();
              ctx.fillStyle = Ink.body;
              ctx.fillRect(xPix - 20, baseY - 24, 50, 48);
              ctx.strokeStyle = Math.abs(e) < 0.05 ? "#5eead4" : Ink.pin;
              ctx.strokeRect(xPix - 20, baseY - 24, 50, 48);
              label(ctx, "m", xPix + 5, baseY, { size: 12 });
              const spX = 200 + p.setpoint * 120;
              ctx.strokeStyle = "#5eead4";
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(spX, baseY - 40);
              ctx.lineTo(spX, baseY + 40);
              ctx.stroke();
              ctx.setLineDash([]);
              label(ctx, "r", spX, baseY - 50, { size: 11, color: Ink.electron });

              scope(ctx, 480, 40, 280, 100, spSamples.current, Ink.muted, "r");
              scope(ctx, 480, 150, 280, 100, ySamples.current, Ink.electron, "y");
              scope(ctx, 480, 260, 280, 90, uSamples.current, Ink.hole, "u");
              label(ctx, "u = Kp e + Ki int(e) + Kd de/dt", 300, 380, { mono: true, size: 13, color: Ink.text });
            });

            ui.current += h;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead({ y: s.x, e, u });
            }
          }}
        />
      }
    />
  );
}
