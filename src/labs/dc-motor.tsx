import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, LogControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatOhm, formatRpm, formatVolt, formatWatt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  dcMotor,
  graphPaper,
  Ink,
  label,
  resistorBody,
  scope,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const KE = 0.018;
const KT = 0.018;
const J = 0.00012;
const B = 0.00004;

export function DcMotorLab() {
  const lab = LAB_BY_SLUG["dc-motor"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vsrc, setVsrc] = useState(9);
  const [r, setR] = useState(4);
  const [load, setLoad] = useState(0.008);

  const sim = useRef({ i: 0, w: 0, angle: 0 });
  const [read, setRead] = useState({ i: 0, rpm: 0, p: 0 });
  const samples = useRef<number[]>(Array(120).fill(0));
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);
  const params = useRef({ vsrc, r, load });
  params.current = { vsrc, r, load };

  const stallI = vsrc / r;
  const noLoadW = vsrc / KE;

  const insight = useMemo(() => {
    const rpm = read.rpm;
    if (rpm < 40) {
      return `Near stall. Back-EMF is almost gone, so the motor is just ${formatOhm(r)} and current climbs toward ${formatAmp(stallI)}. Torque is high; speed is not.`;
    }
    if (load < 0.003) {
      return `Unloaded. Speed rises until Ke·ω ≈ V. Current is only what’s needed to beat friction. ${formatRpm(rpm)}.`;
    }
    return `Loaded. Torque τ = Kt · I fights ${load.toFixed(3)} N·m. Speed settles where electrical input covers mechanical work + I²R.`;
  }, [read.rpm, r, stallI, load]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Current" value={formatAmp(read.i)} />
          <Meter label="Speed" value={formatRpm(read.rpm)} />
          <Meter label="Electrical P" value={formatWatt(read.p)} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Supply"
            value={vsrc}
            display={formatVolt(vsrc)}
            min={1}
            max={18}
            step={0.1}
            onChange={setVsrc}
          />
          <LogControl
            label="Armature R"
            value={r}
            display={formatOhm(r)}
            min={1}
            max={40}
            onChange={setR}
            hint="Stall current is V / R."
          />
          <LinearControl
            label="Load torque"
            value={load}
            display={`${load.toFixed(3)} N·m`}
            min={0}
            max={0.04}
            step={0.001}
            onChange={setLoad}
            hint="Hold the shaft. Speed falls, current rises."
          />
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            Stall {formatAmp(stallI)} · no-load {formatRpm((noLoadW * 60) / (2 * Math.PI))}
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            const bemf = KE * s.w;
            const di = ((p.vsrc - bemf - s.i * p.r) / 0.012) * dt;
            s.i = clamp(s.i + di, 0, p.vsrc / Math.max(0.4, p.r));
            const torque = KT * s.i - p.load - B * s.w;
            s.w = Math.max(0, s.w + (torque / J) * dt);
            s.angle += s.w * dt;
            const rpm = (s.w * 60) / (2 * Math.PI);
            const i01 = s.i / Math.max(0.05, p.vsrc / p.r);
            samples.current.push(clamp(s.w / Math.max(1, p.vsrc / KE), 0, 1));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const y = 180;
              battery(ctx, 60, y);
              resistorBody(ctx, 200, y, 80, p.r, Math.min(1, (s.i * s.i * p.r) / 2));
              dcMotor(ctx, 520, y, s.angle, i01);
              wire(ctx, [
                { x: 76, y },
                { x: 200, y },
              ]);
              wire(ctx, [
                { x: 290, y },
                { x: 430, y },
                { x: 430, y: y - 12 },
                { x: 468, y: y - 12 },
              ]);
              wire(ctx, [
                { x: 468, y: y + 12 },
                { x: 430, y: y + 12 },
                { x: 430, y: 300 },
                { x: 44, y: 300 },
                { x: 44, y },
              ]);
              label(ctx, formatVolt(p.vsrc), 60, y + 52, { mono: true, size: 12 });
              label(ctx, "armature R", 240, y - 32, { size: 11 });
              label(ctx, `${formatRpm(rpm)} · back-EMF ${formatVolt(bemf)}`, 520, y + 78, {
                size: 12,
                mono: true,
              });
              label(ctx, s.w < 2 ? "stalled" : p.load > 0.02 ? "loaded" : "running", 520, y - 58, {
                size: 12,
                color: Ink.electron,
              });

              const loop: Pt[] = [
                { x: 76, y },
                { x: 290, y },
                { x: 468, y: y - 12 },
              ];
              flow.current.setPath(loop, false);
              flow.current.set(
                s.i > 0.02 ? Math.max(6, Math.min(36, s.i * 8)) : 0,
                -Math.min(220, 30 + s.i * 40),
              );
              flow.current.step(dt);
              flow.current.draw(ctx);

              scope(ctx, 540, 28, 220, 90, samples.current, Ink.electron, "ω(t)");
              label(ctx, `V = IR + Ke ω   ·   ${formatAmp(s.i)}`, 400, 380, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
            });

            ui.current += dt;
            if (ui.current > 0.08) {
              ui.current = 0;
              const snap = { i: s.i, rpm, p: p.vsrc * s.i };
              setRead((prev) => {
                if (Math.abs(prev.i - snap.i) < 0.02 && Math.abs(prev.rpm - snap.rpm) < 20) return prev;
                return snap;
              });
            }
          }}
        />
      }
    />
  );
}
