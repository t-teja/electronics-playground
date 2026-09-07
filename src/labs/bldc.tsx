import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatAmp, formatRpm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { battery, clearSim, graphPaper, Ink, label, scope, wire, withFrame } from "@/lib/sim/draw";
import { BLDC_B as B, BLDC_COMMUTATION as COMMUTATION, BLDC_J as J, BLDC_KE as KE, BLDC_KT as KT, trapBemf } from "@/lib/bldc-math";

export function BldcLab() {
  const lab = LAB_BY_SLUG["bldc"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [duty, setDuty] = useState(0.7);
  const [vbus, setVbus] = useState(12);
  const [load, setLoad] = useState(0.05);

  const sim = useRef({ w: 0, th: 0, i: [0, 0, 0] as number[] });
  const [read, setRead] = useState({ rpm: 0, tau: 0, sector: 0, iAbs: 0 });
  const samples = useRef<number[]>(Array(120).fill(0));
  const ui = useRef(0);
  const params = useRef({ duty, vbus, load });
  params.current = { duty, vbus, load };

  const insight = useMemo(() => {
    const names = ["A+B-", "A+C-", "B+C-", "B+A-", "C+A-", "C+B-"];
    return `Hall sector ${read.sector}: drive ${names[read.sector]}. Two of three phases carry current; trapezoidal back-EMF keeps torque nearly flat in the sector.`;
  }, [read.sector]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Speed" value={formatRpm(read.rpm)} />
          <Meter label="Torque" value={`${read.tau.toFixed(3)} N*m`} />
          <Meter label="Sector" value={`${read.sector}`} />
          <Meter label="|I|" value={formatAmp(read.iAbs)} />
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
            const r = 1.2;
            const la = 0.002;
            for (let k = 0; k < 3; k++) {
              const bemf = KE * s.w * trapBemf(s.th, (k * 2 * Math.PI) / 3);
              const v = cmd[k]! * p.duty * p.vbus - bemf;
              s.i[k] = clamp(s.i[k]! + ((v - s.i[k]! * r) / la) * h, -20, 20);
              if (!Number.isFinite(s.i[k]!)) s.i[k] = 0;
              if (cmd[k] === 0) s.i[k] *= Math.exp(-h / 0.002);
            }
            const te =
              KT *
              (s.i[0]! * trapBemf(s.th, 0) +
                s.i[1]! * trapBemf(s.th, (2 * Math.PI) / 3) +
                s.i[2]! * trapBemf(s.th, (4 * Math.PI) / 3));
            s.w = clamp(s.w + ((te - p.load - B * s.w) / J) * h, 0, 800);
            if (!Number.isFinite(s.w)) s.w = 0;
            s.th += s.w * h;
            const rpm = (s.w * 60) / (2 * Math.PI);
            const iAbs = (Math.abs(s.i[0]!) + Math.abs(s.i[1]!) + Math.abs(s.i[2]!)) / 2;
            samples.current.push(clamp(s.w / 400, 0, 1));
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              battery(ctx, 60, 200);
              const phases = ["A", "B", "C"];
              const ys = [120, 200, 280];
              for (let k = 0; k < 3; k++) {
                const on = cmd[k]! !== 0;
                const y = ys[k]!;
                ctx.fillStyle = on ? "#5eead4" : Ink.body;
                ctx.strokeStyle = Ink.pin;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.rect(160, y - 14, 70, 28);
                ctx.fill();
                ctx.stroke();
                label(ctx, phases[k]!, 195, y, { size: 12, color: on ? Ink.text : Ink.muted });
                label(ctx, cmd[k]! > 0 ? "+" : cmd[k]! < 0 ? "-" : "off", 250, y, {
                  size: 11,
                  color: on ? "#5eead4" : Ink.muted,
                  align: "left",
                });
                wire(ctx, [{ x: 76, y: 200 }, { x: 120, y: 200 }, { x: 120, y }, { x: 160, y }]);
                wire(ctx, [{ x: 230, y }, { x: 320, y }]);
              }
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
              wire(ctx, [{ x: 320, y: 120 }, { x: 400, y: 120 }, { x: 430, y: 160 }]);
              wire(ctx, [{ x: 320, y: 200 }, { x: 426, y: 200 }]);
              wire(ctx, [{ x: 320, y: 280 }, { x: 400, y: 280 }, { x: 430, y: 240 }]);
              label(ctx, `hall ${sector} * ${formatRpm(rpm)}`, cx, cy + 90, { mono: true, size: 12 });
              scope(ctx, 560, 40, 210, 100, samples.current, Ink.electron, "w(t)");
              label(ctx, "6-step * two phases ON", 400, 380, { mono: true, size: 13, color: Ink.text });
            });

            ui.current += h;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead({ rpm, tau: te, sector, iAbs });
            }
          }}
        />
      }
    />
  );
}
