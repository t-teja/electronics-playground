import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatHz, formatRpm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { acSource, clearSim, graphPaper, Ink, label, scope, wire, withFrame } from "@/lib/sim/draw";

const J = 0.004;
const B = 0.0006;
const TB = 12;
const SB = 0.18;

function klossTorque(s: number, vRatio: number) {
  const ss = clamp(s, -1.5, 1.5);
  const den = ss * ss + SB * SB;
  if (den < 1e-9) return 0;
  return clamp(((2 * TB * SB * ss) / den) * vRatio * vRatio, -30, 30);
}

export function InductionMotorLab() {
  const lab = LAB_BY_SLUG["induction-motor"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [freq, setFreq] = useState(60);
  const [vrms, setVrms] = useState(230);
  const [poles, setPoles] = useState(4);
  const [load, setLoad] = useState(4);

  const sim = useRef({ w: 0, angle: 0, field: 0 });
  const [read, setRead] = useState({ rpm: 0, slip: 0, tau: 0, ns: 0 });
  const samples = useRef<number[]>(Array(120).fill(0));
  const curve = useRef<number[]>([]);
  const ui = useRef(0);
  const params = useRef({ freq, vrms, poles, load });
  params.current = { freq, vrms, poles, load };

  const insight = useMemo(() => {
    if (read.slip > 0.4) {
      return `High slip (${(read.slip * 100).toFixed(0)}%). Rotor current is large, heating rises, and you sit left of breakdown on the torque-speed curve.`;
    }
    if (read.slip < 0.05) {
      return `Near sync (${formatRpm(read.ns)}). Little slip means little induced rotor current and little torque. A light load is enough.`;
    }
    return `Operating slip ${(read.slip * 100).toFixed(1)}%. Torque from the Kloss curve balances the ${load.toFixed(1)} N*m load.`;
  }, [read, load]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Speed" value={formatRpm(read.rpm)} />
          <Meter label="Slip" value={`${(read.slip * 100).toFixed(1)} %`} />
          <Meter label="Torque" value={`${read.tau.toFixed(2)} N*m`} />
          <Meter label="Sync" value={formatRpm(read.ns)} />
        </>
      }
      controls={
        <>
          <LinearControl label="Frequency" value={freq} display={formatHz(freq)} min={20} max={70} step={1} onChange={setFreq} />
          <LinearControl label="Vrms" value={vrms} display={formatVolt(vrms)} min={100} max={400} step={5} onChange={setVrms} />
          <LinearControl label="Poles" value={poles} display={`${poles}`} min={2} max={8} step={2} onChange={setPoles} />
          <LinearControl label="Load torque" value={load} display={`${load.toFixed(1)} N*m`} min={0} max={14} step={0.2} onChange={setLoad} />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            const h = Math.min(0.02, Math.max(1e-4, dt));
            const nsRpm = (120 * p.freq) / Math.max(2, p.poles);
            const ws = (nsRpm * 2 * Math.PI) / 60;
            const nRpm = (s.w * 60) / (2 * Math.PI);
            const slip = ws > 1e-6 ? (ws - s.w) / ws : 1;
            const vRatio = p.vrms / 230;
            const te = klossTorque(slip, vRatio);
            s.w = clamp(s.w + ((te - p.load - B * s.w) / J) * h, 0, ws * 1.05);
            if (!Number.isFinite(s.w)) s.w = 0;
            s.angle += s.w * h;
            s.field += ((2 * Math.PI * p.freq) / (p.poles / 2)) * h;
            samples.current.push(clamp(s.w / Math.max(1, ws), 0, 1));
            if (samples.current.length > 160) samples.current.shift();
            curve.current = [];
            for (let i = 0; i <= 40; i++) {
              const n = (i / 40) * nsRpm;
              const sl = nsRpm > 0 ? (nsRpm - n) / nsRpm : 1;
              curve.current.push(clamp(klossTorque(sl, vRatio) / (TB * 1.2), 0, 1));
            }

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              acSource(ctx, 70, 120, 18);
              acSource(ctx, 70, 200, 18);
              acSource(ctx, 70, 280, 18);
              label(ctx, "A", 70, 88, { size: 11 });
              label(ctx, "B", 70, 168, { size: 11 });
              label(ctx, "C", 70, 248, { size: 11 });
              const cx = 320;
              const cy = 200;
              const R = 70;
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.arc(cx, cy, R, 0, Math.PI * 2);
              ctx.stroke();
              for (let k = 0; k < 3; k++) {
                const a0 = s.field + (k * 2 * Math.PI) / 3;
                const x1 = cx + Math.cos(a0) * (R - 8);
                const y1 = cy + Math.sin(a0) * (R - 8);
                ctx.strokeStyle = k === 0 ? "#5eead4" : Ink.copper;
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a0) * 18, cy + Math.sin(a0) * 18);
                ctx.lineTo(x1, y1);
                ctx.stroke();
                wire(ctx, [{ x: 100, y: 120 + k * 80 }, { x: 160, y: 120 + k * 80 }, { x: x1, y: y1 }], 2.2, Ink.copper);
              }
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(s.angle);
              ctx.fillStyle = Ink.body;
              ctx.beginPath();
              ctx.arc(0, 0, 28, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = Ink.electron;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(-16, 0);
              ctx.lineTo(16, 0);
              ctx.stroke();
              ctx.restore();
              const fx = cx + Math.cos(s.field) * 48;
              const fy = cy + Math.sin(s.field) * 48;
              ctx.strokeStyle = "#5eead4";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(fx, fy);
              ctx.stroke();
              label(ctx, "rotating field", cx, cy - R - 18, { size: 11, color: Ink.electron });
              scope(ctx, 500, 40, 260, 120, curve.current, Ink.electron, "T-n curve");
              scope(ctx, 500, 190, 260, 100, samples.current, Ink.hole, "n(t)");
              label(ctx, `ns = 120 f / p = ${formatRpm(nsRpm)}`, 400, 360, { mono: true, size: 13, color: Ink.text });
              label(ctx, `s = ${(slip * 100).toFixed(1)}% * T ${te.toFixed(2)} N*m`, 400, 382, { mono: true, size: 12, color: Ink.muted });
            });

            ui.current += h;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead({ rpm: nRpm, slip, tau: te, ns: nsRpm });
            }
          }}
        />
      }
    />
  );
}
