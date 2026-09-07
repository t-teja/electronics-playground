import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatRpm } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { clearSim, graphPaper, Ink, label, scope, withFrame } from "@/lib/sim/draw";

const J = 0.0008;
const B = 0.00015;
const POLE_PAIRS = 4;
const LAMBDA = 0.045;

export function PmsmLab() {
  const lab = LAB_BY_SLUG["pmsm"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [iq, setIq] = useState(4);
  const [load, setLoad] = useState(0.4);

  const sim = useRef({ w: 0, th: 0 });
  const [read, setRead] = useState({ rpm: 0, te: 0, we: 0, locked: false });
  const samples = useRef<number[]>(Array(120).fill(0));
  const ui = useRef(0);
  const params = useRef({ iq, load });
  params.current = { iq, load };

  const insight = useMemo(() => {
    if (!read.locked) {
      return `Id = 0 FOC. Te = (3/2) p lambda_m Iq. Raise Iq above the load so the rotor accelerates. Speed comes from torque balance, not a forced omega.`;
    }
    return `Synced FOC frame. Te ${read.te.toFixed(2)} N*m from Iq = ${iq.toFixed(1)} A. we = p wm. Steady speed where Te balances load plus damping.`;
  }, [read, iq]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Speed" value={formatRpm(read.rpm)} />
          <Meter label="Te" value={`${read.te.toFixed(2)} N*m`} />
          <Meter label="we" value={`${read.we.toFixed(0)} rad/s`} />
          <Meter label="Iq" value={formatAmp(iq)} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Iq (torque current)"
            value={iq}
            display={formatAmp(iq)}
            min={0}
            max={12}
            step={0.1}
            onChange={setIq}
            hint="Id kept at 0."
          />
          <LinearControl
            label="Load torque"
            value={load}
            display={`${load.toFixed(2)} N*m`}
            min={0}
            max={2}
            step={0.05}
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
            const te = 1.5 * POLE_PAIRS * LAMBDA * p.iq;
            const teSafe = Number.isFinite(te) ? te : 0;
            const tau = teSafe - p.load - B * s.w;
            s.w = clamp(s.w + (tau / J) * h, 0, 800);
            if (!Number.isFinite(s.w)) s.w = 0;
            s.th += s.w * h;
            const field = POLE_PAIRS * s.th;
            const rpm = (s.w * 60) / (2 * Math.PI);
            const we = POLE_PAIRS * s.w;
            const locked = p.iq > 0.2 && Math.abs(teSafe - p.load - B * s.w) < 0.15;
            samples.current.push(clamp(s.w / 400, 0, 1));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const cx = 280;
              const cy = 210;
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.arc(cx, cy, 80, 0, Math.PI * 2);
              ctx.stroke();
              for (let k = 0; k < 3; k++) {
                const a = field + (k * 2 * Math.PI) / 3;
                ctx.strokeStyle = k === 0 ? "#5eead4" : Ink.copper;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
                ctx.lineTo(cx + Math.cos(a) * 72, cy + Math.sin(a) * 72);
                ctx.stroke();
              }
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(s.th);
              ctx.fillStyle = Ink.body;
              ctx.beginPath();
              ctx.arc(0, 0, 34, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#5eead4";
              ctx.globalAlpha = 0.35;
              ctx.beginPath();
              ctx.arc(0, -12, 10, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = Ink.hole;
              ctx.beginPath();
              ctx.arc(0, 12, 10, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.fillStyle = Ink.pin;
              ctx.fillRect(-5, -5, 10, 10);
              ctx.restore();
              label(ctx, "stator field", cx, cy - 100, { size: 11, color: Ink.electron });
              label(ctx, "PM rotor", cx, cy + 100, { size: 11 });
              label(ctx, locked ? "LOCKED" : "accel", cx + 160, cy - 40, {
                size: 13,
                color: locked ? "#5eead4" : Ink.muted,
              });

              scope(ctx, 500, 60, 250, 120, samples.current, Ink.electron, "wm(t)");
              label(ctx, `Te = (3/2) p lambda_m Iq = ${teSafe.toFixed(2)} N*m`, 400, 360, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
              label(ctx, `we = p wm ; Id = 0`, 400, 382, { mono: true, size: 12, color: Ink.muted });
            });

            ui.current += h;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead({ rpm, te: teSafe, we, locked });
            }
          }}
        />
      }
    />
  );
}
