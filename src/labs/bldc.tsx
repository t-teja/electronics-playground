import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatRpm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { battery, clearSim, graphPaper, Ink, junction, label, scope, wire, withFrame } from "@/lib/sim/draw";
import { BLDC_B as B, BLDC_COMMUTATION as COMMUTATION, BLDC_J as J, BLDC_KE as KE, BLDC_KT as KT, trapBemf } from "@/lib/bldc-math";

export function BldcLab() {
  const lab = LAB_BY_SLUG["bldc"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [duty, setDuty] = useState(0.7);
  const [vbus, setVbus] = useState(12);
  const [load, setLoad] = useState(0.05);

  const sim = useRef({ w: 0, th: 0, iLine: 0 });
  const [read, setRead] = useState({ rpm: 0, tau: 0, sector: 0, iAbs: 0 });
  const samples = useRef<number[]>(Array(120).fill(0));
  const ui = useRef(0);
  const params = useRef({ duty, vbus, load });
  params.current = { duty, vbus, load };

  const insight = useMemo(() => {
    const names = ["A+B-", "A+C-", "B+C-", "B+A-", "C+A-", "C+B-"];
    return `Hall sector ${read.sector}: drive ${names[read.sector]}. Two phases in series carry the line current; trapezoidal back-EMF keeps torque nearly flat in the sector.`;
  }, [read.sector]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Speed" value={formatRpm(read.rpm)} />
          <Meter label="Torque" value={`${read.tau.toFixed(3)} N*m`} />
          <Meter label="Sector" value={`${read.sector}`} />
          <Meter label="I line" value={formatAmp(read.iAbs)} />
        </>
      }
      controls={
        <>
          <LinearControl label="Duty" value={duty} display={`${(duty * 100).toFixed(0)} %`} min={0} max={1} step={0.01} onChange={setDuty} />
          <LinearControl label="Bus V" value={vbus} display={formatVolt(vbus)} min={6} max={24} step={0.5} onChange={setVbus} />
          <LinearControl label="Load torque" value={load} display={`${load.toFixed(3)} N*m`} min={0} max={0.25} step={0.005} onChange={setLoad} />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            const h = Math.min(0.02, Math.max(1e-4, dt));
            const sector = Math.floor((((s.th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 3)) % 6;
            const cmd = COMMUTATION[sector]!;
            let hi = -1;
            let lo = -1;
            for (let k = 0; k < 3; k++) {
              if (cmd[k] === 1) hi = k;
              if (cmd[k] === -1) lo = k;
            }
            const r = 1.2;
            const la = 0.002;
            const R_eq = 2 * r;
            const L_eq = 2 * la;
            const i = [0, 0, 0];
            if (hi >= 0 && lo >= 0) {
              const eHi = trapBemf(s.th, (hi * 2 * Math.PI) / 3);
              const eLo = trapBemf(s.th, (lo * 2 * Math.PI) / 3);
              const vLine = p.duty * p.vbus - KE * s.w * (eHi - eLo);
              s.iLine += ((vLine - s.iLine * R_eq) / L_eq) * h;
              s.iLine = clamp(s.iLine, -15, 15);
              if (!Number.isFinite(s.iLine)) s.iLine = 0;
              i[hi] = s.iLine;
              i[lo] = -s.iLine;
            } else {
              s.iLine *= Math.exp(-h / 0.002);
            }

            const te =
              KT *
              (i[0]! * trapBemf(s.th, 0) +
                i[1]! * trapBemf(s.th, (2 * Math.PI) / 3) +
                i[2]! * trapBemf(s.th, (4 * Math.PI) / 3));
            const teSafe = Number.isFinite(te) ? te : 0;
            s.w = clamp(s.w + ((teSafe - p.load - B * s.w) / J) * h, 0, 800);
            if (!Number.isFinite(s.w)) s.w = 0;
            s.th += s.w * h;
            const rpm = (s.w * 60) / (2 * Math.PI);
            const iAbs = Math.abs(s.iLine);
            samples.current.push(clamp(s.w / 400, 0, 1));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 56, 200);
              label(ctx, formatVolt(p.vbus), 56, 252, { mono: true, size: 11 });

              // DC rail: +Vbus top, GND bottom, closed to battery negative
              const railX0 = 110;
              const railX1 = 300;
              const yTop = 70;
              const yBot = 330;
              wire(ctx, [bat.pos, { x: bat.pos.x, y: yTop }, { x: railX1, y: yTop }]);
              wire(ctx, [bat.neg, { x: bat.neg.x, y: yBot }, { x: railX1, y: yBot }]);
              label(ctx, "+Vbus", 180, yTop - 14, { size: 11, color: Ink.text });
              label(ctx, "GND", 180, yBot + 16, { size: 11, color: Ink.muted });

              const phases = ["A", "B", "C"];
              const xs = [150, 210, 270];
              for (let k = 0; k < 3; k++) {
                const x = xs[k]!;
                const hiOn = cmd[k] === 1;
                const loOn = cmd[k] === -1;
                // High-side switch
                ctx.fillStyle = hiOn ? "#5eead4" : Ink.body;
                ctx.strokeStyle = Ink.pin;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.rect(x - 14, 100, 28, 36);
                ctx.fill();
                ctx.stroke();
                label(ctx, "H", x, 118, { size: 10, color: hiOn ? Ink.text : Ink.muted });
                // Low-side switch
                ctx.fillStyle = loOn ? "#5eead4" : Ink.body;
                ctx.beginPath();
                ctx.rect(x - 14, 264, 28, 36);
                ctx.fill();
                ctx.stroke();
                label(ctx, "L", x, 282, { size: 10, color: loOn ? Ink.text : Ink.muted });
                // Midpoint to motor
                wire(ctx, [{ x, y: yTop }, { x, y: 100 }]);
                wire(ctx, [{ x, y: 136 }, { x, y: 200 }]);
                wire(ctx, [{ x, y: 200 }, { x, y: 264 }]);
                wire(ctx, [{ x, y: 300 }, { x, y: yBot }]);
                junction(ctx, x, 200);
                label(ctx, phases[k]!, x, 214, { size: 12, color: cmd[k]! !== 0 ? "#5eead4" : Ink.muted });
                wire(ctx, [{ x, y: 200 }, { x: 360, y: 200 - (1 - k) * 28 }]);
              }
              junction(ctx, railX0, yTop);
              junction(ctx, bat.pos.x, yTop);
              junction(ctx, bat.neg.x, yBot);

              // Motor
              const cx = 480;
              const cy = 200;
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.arc(cx, cy, 54, 0, Math.PI * 2);
              ctx.stroke();
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(s.th);
              ctx.fillStyle = Ink.body;
              ctx.fillRect(-12, -12, 24, 24);
              ctx.strokeStyle = Ink.electron;
              ctx.beginPath();
              ctx.moveTo(0, -30);
              ctx.lineTo(0, 30);
              ctx.stroke();
              ctx.restore();
              for (let hI = 0; hI < 3; hI++) {
                const a = -Math.PI / 2 + (hI * 2 * Math.PI) / 3;
                const hx = cx + Math.cos(a) * 70;
                const hy = cy + Math.sin(a) * 70;
                const hallBit =
                  Math.floor(((((s.th + hI * (Math.PI / 3)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / Math.PI) % 2;
                ctx.beginPath();
                ctx.arc(hx, hy, 7, 0, Math.PI * 2);
                ctx.fillStyle = hallBit ? "#5eead4" : Ink.body;
                ctx.fill();
                ctx.strokeStyle = Ink.pin;
                ctx.stroke();
                label(ctx, `H${hI + 1}`, hx, hy + 18, { size: 10 });
              }
              wire(ctx, [{ x: 360, y: 172 }, { x: 430, y: 172 }, { x: 450, y: 180 }]);
              wire(ctx, [{ x: 360, y: 200 }, { x: 426, y: 200 }]);
              wire(ctx, [{ x: 360, y: 228 }, { x: 430, y: 228 }, { x: 450, y: 220 }]);
              label(ctx, `hall ${sector} * ${formatRpm(rpm)}`, cx, cy + 90, { mono: true, size: 12 });
              scope(ctx, 560, 40, 210, 100, samples.current, Ink.electron, "w(t)");
              label(ctx, "3-ph half-bridge * two phases ON", 400, 380, { mono: true, size: 13, color: Ink.text });
            });

            ui.current += h;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead({ rpm, tau: teSafe, sector, iAbs });
            }
          }}
        />
      }
    />
  );
}
