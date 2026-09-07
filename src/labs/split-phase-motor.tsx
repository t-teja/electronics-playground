import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatHz, formatRpm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  acSource,
  clearSim,
  dcMotor,
  graphPaper,
  Ink,
  label,
  resistorBody,
  scope,
  toggleSwitch,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const J = 0.00035;
const B = 0.00008;
const KT_START = 0.22;
const KT_RUN = 0.035;
const POLES = 4;
const SWITCH_RPM = 900;

export function SplitPhaseMotorLab() {
  const lab = LAB_BY_SLUG["split-phase-motor"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vrms, setVrms] = useState(120);
  const [freq, setFreq] = useState(60);
  const [load, setLoad] = useState(0.04);
  const [forceAux, setForceAux] = useState(false);

  const sim = useRef({ w: 0, angle: 0, t: 0 });
  const [read, setRead] = useState({ rpm: 0, tau: 0, im: 0, ia: 0, phase: 0, aux: true });
  const samples = useRef<number[]>(Array(120).fill(0));
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);
  const params = useRef({ vrms, freq, load, forceAux });
  params.current = { vrms, freq, load, forceAux };

  const insight = useMemo(() => {
    if (read.rpm < 80 && read.aux) {
      return `Starting. Capacitance shifts the aux current by about ${read.phase.toFixed(0)} deg. Starting torque follows Im Ia sin(phi).`;
    }
    if (!read.aux) {
      return `Run. Centrifugal switch opened the aux above ${SWITCH_RPM} rpm. The main winding alone makes run torque against the load.`;
    }
    return `Both windings still in circuit. Phase shift phi ~= ${read.phase.toFixed(0)} deg feeds starting torque while speed climbs.`;
  }, [read]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Speed" value={formatRpm(read.rpm)} />
          <Meter label="Torque" value={`${read.tau.toFixed(3)} N*m`} />
          <Meter label="Im" value={formatAmp(read.im)} />
          <Meter label="Ia" value={formatAmp(read.ia)} />
        </>
      }
      controls={
        <>
          <LinearControl label="Vrms" value={vrms} display={formatVolt(vrms)} min={60} max={140} step={1} onChange={setVrms} />
          <LinearControl label="Frequency" value={freq} display={formatHz(freq)} min={40} max={70} step={1} onChange={setFreq} />
          <LinearControl label="Load torque" value={load} display={`${load.toFixed(3)} N*m`} min={0} max={0.2} step={0.005} onChange={setLoad} />
          <ToggleControl label="Hold aux in" checked={forceAux} on="forced" off="auto" onCheckedChange={setForceAux} />
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
            const wElec = 2 * Math.PI * p.freq;
            const vp = p.vrms * Math.SQRT2;
            const rm = 28;
            const ra = 36;
            const c = 35e-6;
            const xc = 1 / Math.max(1e-6, wElec * c);
            const phase = Math.atan2(xc, ra);
            const imPk = vp / rm;
            const iaPk = vp / Math.hypot(ra, xc);
            const nsRpm = (120 * p.freq) / POLES;
            const ws = (nsRpm * 2 * Math.PI) / 60;
            const rpm = (s.w * 60) / (2 * Math.PI);
            const auxOn = p.forceAux || rpm < SWITCH_RPM;
            const im = imPk * Math.sin(wElec * s.t);
            const ia = auxOn ? iaPk * Math.sin(wElec * s.t + phase) : 0;
            const teStart = KT_START * imPk * iaPk * Math.sin(phase);
            const teRun = KT_RUN * imPk * Math.max(0, 1 - s.w / Math.max(1e-6, ws));
            const te = auxOn ? teStart + teRun : teRun;
            const teSafe = Number.isFinite(te) ? te : 0;
            const tau = clamp(teSafe - p.load - B * s.w, -2, 2);
            s.w = clamp(s.w + (tau / J) * h, 0, ws * 1.05);
            if (!Number.isFinite(s.w)) s.w = 0;
            s.angle += s.w * h;
            samples.current.push(clamp(s.w / Math.max(1, ws), 0, 1));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const ac = acSource(ctx, 80, 200, 22);
              resistorBody(ctx, 180, 140, 70, rm, Math.min(1, Math.abs(im) / Math.max(0.1, imPk)));
              resistorBody(ctx, 180, 260, 70, ra, auxOn ? Math.min(1, Math.abs(ia) / Math.max(0.1, iaPk)) : 0);
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.moveTo(290, 248);
              ctx.lineTo(290, 272);
              ctx.moveTo(300, 248);
              ctx.lineTo(300, 272);
              ctx.stroke();
              label(ctx, "Cs", 295, 236, { size: 10 });
              toggleSwitch(ctx, 330, 260, auxOn);
              dcMotor(ctx, 560, 200, s.angle, Math.min(1, s.w / 120));
              wire(ctx, [{ x: ac.top.x, y: ac.top.y }, { x: ac.top.x, y: 140 }, { x: 180, y: 140 }]);
              wire(ctx, [{ x: 260, y: 140 }, { x: 480, y: 140 }, { x: 480, y: 188 }, { x: 508, y: 188 }]);
              wire(ctx, [{ x: ac.top.x, y: ac.top.y }, { x: 140, y: ac.top.y }, { x: 140, y: 260 }, { x: 180, y: 260 }]);
              wire(ctx, [{ x: 260, y: 260 }, { x: 285, y: 260 }]);
              wire(ctx, [{ x: 305, y: 260 }, { x: 330, y: 260 }]);
              wire(ctx, [{ x: 364, y: 260 }, { x: 480, y: 260 }, { x: 480, y: 212 }, { x: 508, y: 212 }]);
              wire(ctx, [{ x: 508, y: 212 }, { x: 520, y: 300 }, { x: 80, y: 300 }, { x: ac.bot.x, y: ac.bot.y }]);
              label(ctx, "main", 215, 112, { size: 11 });
              label(ctx, "aux", 215, 288, { size: 11 });
              label(ctx, auxOn ? "aux ON" : "aux OPEN", 360, 236, { size: 11, color: auxOn ? "#5eead4" : Ink.muted });
              label(ctx, `phi ${((phase * 180) / Math.PI).toFixed(0)} deg * ${formatRpm(rpm)}`, 560, 278, { mono: true, size: 12 });
              const path: Pt[] = [{ x: ac.top.x, y: 140 }, { x: 260, y: 140 }, { x: 508, y: 188 }];
              flow.current.setPath(path, false);
              flow.current.set(auxOn || Math.abs(im) > 0.2 ? 14 : 0, 100);
              flow.current.step(h);
              flow.current.draw(ctx);
              scope(ctx, 540, 28, 220, 90, samples.current, Ink.electron, "w(t)");
              label(ctx, auxOn ? "start: Im Ia sin(phi)  *  Cs + switch" : "run: main winding torque", 400, 380, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
            });

            ui.current += h;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead({ rpm, tau: teSafe, im: Math.abs(im), ia: Math.abs(ia), phase: (phase * 180) / Math.PI, aux: auxOn });
            }
          }}
        />
      }
    />
  );
}
