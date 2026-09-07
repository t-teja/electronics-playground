import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, LogControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatHenry, formatOhm, formatRpm, formatVolt, formatWatt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  dcMotor,
  graphPaper,
  Ink,
  inductorCoil,
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
const LA = 0.012;

export function DcMotorLab() {
  const lab = LAB_BY_SLUG["dc-motor"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vsrc, setVsrc] = useState(9);
  const [r, setR] = useState(4);
  const [load, setLoad] = useState(0.008);

  const sim = useRef({ i: 0, w: 0, angle: 0 });
  const [read, setRead] = useState({ i: 0, rpm: 0, tau: 0, p: 0 });
  const samples = useRef<number[]>(Array(120).fill(0));
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);
  const params = useRef({ vsrc, r, load });
  params.current = { vsrc, r, load };

  const stallI = Math.abs(vsrc) / r;
  const noLoadW = Math.abs(vsrc) / KE;

  const insight = useMemo(() => {
    const rpm = read.rpm;
    if (read.i < -0.05 && Math.abs(rpm) > 40) {
      return `Regen. Back-EMF exceeds supply, so current reverses and electrical power goes negative. Rotation follows the sign of omega.`;
    }
    if (Math.abs(rpm) < 40) {
      return `Near stall. Back-EMF is almost gone, so the armature is roughly ${formatOhm(r)} plus ${formatHenry(LA)}. Current climbs toward ${formatAmp(stallI)}. Torque is high; speed is not.`;
    }
    if (load < 0.003) {
      return `Unloaded. Speed rises until Ke*w ~= V. Current only covers friction. ${formatRpm(rpm)}.`;
    }
    return `Loaded. Torque tau = Kt * I fights ${load.toFixed(3)} N*m. Speed settles where electrical input covers mechanical work plus I^2R.`;
  }, [read, r, stallI, load]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Current" value={formatAmp(read.i)} />
          <Meter label="Speed" value={formatRpm(read.rpm)} />
          <Meter label="Torque" value={`${read.tau.toFixed(3)} N*m`} />
          <Meter label="Electrical P" value={formatWatt(read.p)} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Supply"
            value={vsrc}
            display={formatVolt(vsrc)}
            min={-18}
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
            hint="Stall current is |V| / R."
          />
          <LinearControl
            label="Load torque"
            value={load}
            display={`${load.toFixed(3)} N*m`}
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
            Stall {formatAmp(stallI)} * no-load {formatRpm((noLoadW * 60) / (2 * Math.PI))} * La {formatHenry(LA)}
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            const h = Math.min(0.02, Math.max(1e-4, dt));
            const bemf = KE * s.w;
            const vL = p.vsrc - bemf - s.i * p.r;
            const di = (vL / LA) * h;
            const iLim = Math.abs(p.vsrc) / Math.max(0.4, p.r) + 2;
            s.i = clamp(s.i + di, -iLim * 2, iLim * 2);
            if (!Number.isFinite(s.i)) s.i = 0;
            const torque = KT * s.i - p.load * Math.sign(s.w || p.vsrc || 1) - B * s.w;
            s.w = clamp(s.w + (torque / J) * h, -800, 800);
            if (!Number.isFinite(s.w)) s.w = 0;
            s.angle += s.w * h;
            const rpm = (s.w * 60) / (2 * Math.PI);
            const tauM = KT * s.i;
            const i01 = Math.min(1, Math.abs(s.i) / Math.max(0.05, Math.abs(p.vsrc) / p.r));
            samples.current.push(clamp(0.5 + 0.5 * (s.w / Math.max(1, Math.abs(p.vsrc) / KE)), 0, 1));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const y = 180;
              battery(ctx, 60, y);
              resistorBody(ctx, 160, y, 70, p.r, Math.min(1, (s.i * s.i * p.r) / 2));
              inductorCoil(ctx, 280, y, 4, Math.min(1, Math.abs(s.i) / Math.max(0.1, stallI)));
              dcMotor(ctx, 560, y, s.angle, i01);
              wire(ctx, [
                { x: 76, y },
                { x: 160, y },
              ]);
              wire(ctx, [
                { x: 240, y },
                { x: 280, y },
              ]);
              wire(ctx, [
                { x: 360, y },
                { x: 470, y },
                { x: 470, y: y - 12 },
                { x: 508, y: y - 12 },
              ]);
              wire(ctx, [
                { x: 508, y: y + 12 },
                { x: 470, y: y + 12 },
                { x: 470, y: 300 },
                { x: 44, y: 300 },
                { x: 44, y },
              ]);
              label(ctx, formatVolt(p.vsrc), 60, y + 52, { mono: true, size: 12 });
              label(ctx, "R", 195, y - 32, { size: 11 });
              label(ctx, "La", 320, y - 32, { size: 11 });
              label(ctx, `${formatRpm(rpm)} * back-EMF ${formatVolt(bemf)}`, 560, y + 78, {
                size: 12,
                mono: true,
              });
              const stateLabel =
                Math.abs(s.w) < 2 ? "stalled" : s.i < -0.05 ? "regen" : p.load > 0.02 ? "loaded" : "running";
              label(ctx, stateLabel, 560, y - 58, {
                size: 12,
                color: Ink.electron,
              });

              const loop: Pt[] = [
                { x: 76, y },
                { x: 360, y },
                { x: 508, y: y - 12 },
              ];
              flow.current.setPath(loop, false);
              flow.current.set(
                Math.abs(s.i) > 0.02 ? Math.max(6, Math.min(36, Math.abs(s.i) * 8)) : 0,
                -Math.min(220, 30 + Math.abs(s.i) * 40) * Math.sign(s.i || 1),
              );
              flow.current.step(h);
              flow.current.draw(ctx);

              scope(ctx, 540, 28, 220, 90, samples.current, Ink.electron, "w(t)");
              label(ctx, `V = IR + La dI/dt + Ke w   *   ${formatAmp(s.i)}`, 400, 380, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
            });

            ui.current += h;
            if (ui.current > 0.08) {
              ui.current = 0;
              const snap = { i: s.i, rpm, tau: tauM, p: p.vsrc * s.i };
              setRead((prev) => {
                if (
                  Math.abs(prev.i - snap.i) < 0.02 &&
                  Math.abs(prev.rpm - snap.rpm) < 20 &&
                  Math.abs(prev.tau - snap.tau) < 0.001
                )
                  return prev;
                return snap;
              });
            }
          }}
        />
      }
    />
  );
}
