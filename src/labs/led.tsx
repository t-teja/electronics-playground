import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, LogControl, Meter, Segmented } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatAmp, formatOhm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  graphPaper,
  Ink,
  label,
  ledDome,
  resistorBody,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const COLORS: { id: string; label: string; vf: number; hex: string }[] = [
  { id: "red", label: "Red", vf: 1.8, hex: "#c0453c" },
  { id: "amber", label: "Amber", vf: 2.0, hex: "#d9773a" },
  { id: "green", label: "Green", vf: 2.2, hex: "#3d8a55" },
  { id: "blue", label: "Blue", vf: 3.1, hex: "#3b6ea8" },
  { id: "white", label: "White", vf: 3.2, hex: "#e4e4e7" },
];

export function LedLab() {
  const lab = LAB_BY_SLUG.led!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [colorId, setColorId] = useState("red");
  const [vsrc, setVsrc] = useState(5);
  const [r, setR] = useState(220);
  const color = COLORS.find((c) => c.id === colorId) ?? COLORS[0]!;
  const i = Math.max(0, (vsrc - color.vf) / r);
  const bright = Math.min(1, i / 0.02);
  const flow = useRef(new ElectronFlow());
  const photons = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const params = useRef({ vsrc, r, i, bright, hex: color.hex, vf: color.vf, name: color.label });
  params.current = { vsrc, r, i, bright, hex: color.hex, vf: color.vf, name: color.label };

  const insight = useMemo(() => {
    if (vsrc < color.vf) {
      return `${color.label} needs about ${formatVolt(color.vf)} of forward drop. The source is below that — no recombination, no light.`;
    }
    if (i > 0.025) {
      return `${formatAmp(i)} is hard on a small LED. The resistor is supposed to set current: I = (V − Vf) / R. Raise R or drop the supply.`;
    }
    return `Electrons drop across a ${color.vf.toFixed(1)} eV band-gap and leave as ${color.label.toLowerCase()} photons. Brightness tracks current (${formatAmp(i)}), not voltage.`;
  }, [color, vsrc, i]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Forward current" value={formatAmp(i)} />
          <Meter label="Vf" value={formatVolt(color.vf)} />
          <Meter label="Brightness" value={`${Math.round(bright * 100)}%`} />
        </>
      }
      controls={
        <>
          <Control label="Color / band-gap">
            <Segmented
              value={colorId}
              onChange={setColorId}
              options={COLORS.map((c) => ({ id: c.id, label: c.label }))}
            />
          </Control>
          <LinearControl
            label="Supply"
            value={vsrc}
            display={formatVolt(vsrc)}
            min={1}
            max={12}
            step={0.1}
            onChange={setVsrc}
          />
          <LogControl
            label="Series resistor"
            value={r}
            display={formatOhm(r)}
            min={47}
            max={10000}
            onChange={setR}
            hint="The resistor, not the LED, sets the current."
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            if (p.bright > 0.04 && Math.random() < p.bright * 0.6) {
              const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
              photons.current.push({
                x: 560,
                y: 150,
                vx: Math.cos(a) * (40 + Math.random() * 50),
                vy: Math.sin(a) * (40 + Math.random() * 50),
                life: 0.5 + Math.random() * 0.4,
              });
            }
            photons.current = photons.current.filter((ph) => {
              ph.life -= dt;
              ph.x += ph.vx * dt;
              ph.y += ph.vy * dt;
              return ph.life > 0;
            });

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const y = 200;
              battery(ctx, 70, y);
              resistorBody(ctx, 250, y, 90, p.r, Math.min(1, p.i * 20));
              ledDome(ctx, 560, y - 24, p.hex, p.bright);
              wire(ctx, [
                { x: 88, y },
                { x: 250, y },
              ]);
              wire(ctx, [
                { x: 350, y },
                { x: 555, y },
              ]);
              wire(ctx, [
                { x: 565, y: y + 8 },
                { x: 565, y: 310 },
                { x: 70, y: 310 },
                { x: 70, y: y + 28 },
              ]);
              label(ctx, formatVolt(p.vsrc), 70, y + 52, { mono: true, size: 12 });
              label(ctx, `${p.name}  Vf ${formatVolt(p.vf)}`, 560, y + 56, { size: 12 });

              for (const ph of photons.current) {
                ctx.globalAlpha = Math.max(0, ph.life * 1.6);
                ctx.fillStyle = p.hex;
                ctx.beginPath();
                ctx.arc(ph.x, ph.y, 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
              }

              const loop: Pt[] = [
                { x: 88, y },
                { x: 350, y },
                { x: 555, y },
              ];
              flow.current.setPath(loop, false);
              flow.current.set(
                p.i > 0.0004 ? Math.max(4, Math.min(32, p.i * 900)) : 0,
                -Math.min(220, 40 + p.i * 5000),
              );
              flow.current.step(dt);
              flow.current.draw(ctx);

              label(ctx, `I = (V − Vf) / R = ${formatAmp(p.i)}`, 400, 380, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
            });
          }}
        />
      }
    />
  );
}
