import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, LogControl, Meter } from "@/components/control";
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
  nMosfet,
  resistorBody,
  roundRect,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const VDD = 9;
const VTH = 2;
const K = 0.08;
const VF_LED = 2.0;

export function MosfetLab() {
  const lab = LAB_BY_SLUG.mosfet!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vgs, setVgs] = useState(3.2);
  const [rd, setRd] = useState(470);
  const over = Math.max(0, vgs - VTH);
  const idSat = K * over * over;
  const idMax = (VDD - VF_LED) / rd;
  const sat = idSat < idMax;
  const id = vgs < VTH ? 0 : sat ? idSat : idMax;
  const region = vgs < VTH ? "cutoff" : sat ? "saturation" : "ohmic";

  const flow = useRef(new ElectronFlow());
  const params = useRef({ vgs, rd, id, region, over, idSat, idMax });
  params.current = { vgs, rd, id, region, over, idSat, idMax };

  const insight = useMemo(() => {
    if (region === "cutoff") {
      return `Vgs = ${formatVolt(vgs)} is below the ${formatVolt(VTH)} threshold. No inversion layer, no channel, the LED is dark. The gate draws (almost) no DC current.`;
    }
    if (region === "ohmic") {
      return `Ohmic. The channel is a closed switch. Drain current is limited by ${formatOhm(rd)} and the LED drop to ${formatAmp(idMax)}.`;
    }
    return `Saturation. The inverted n-channel is pinched off at the drain. Id \u2248 k \u00b7 (Vgs - Vth)^2 = ${formatAmp(id)}. Raise the gate, the channel gets denser.`;
  }, [region, vgs, id, idMax, rd]);

  return (
    <LabShell
      title={lab.name}
      tagline={lab.tagline}
      category={lab.category}
      meters={
        <>
          <Meter label="Vgs" value={formatVolt(vgs)} />
          <Meter label="Id" value={formatAmp(id)} accent />
          <Meter label="Region" value={region} />
          <Meter label="Rd" value={formatOhm(rd)} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Gate-source voltage"
            value={vgs}
            min={0}
            max={6}
            step={0.05}
            format={formatVolt}
            onChange={setVgs}
            hint={`Threshold Vth = ${formatVolt(VTH)}. The gate is a capacitor.`}
          />
          <LogControl
            label="Drain resistor"
            value={rd}
            min={47}
            max={4700}
            format={formatOhm}
            onChange={setRd}
          />
        </>
      }
      aside={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            {"Vth = "}{formatVolt(VTH)}{" \u00b7 Id sat = k \u00b7 (Vgs - Vth)^2"}
          </p>
          <p className="text-xs text-subtle">
            Region names are a current clamp against (VDD - Vf)/Rd, not a full Vds MOSFET model.
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, dt) => {
            const p = params.current;
            const on = p.region !== "cutoff";
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const mos = nMosfet(ctx, 520, 150, on);
              const bat = battery(ctx, 60, 150);
              resistorBody(ctx, 280, 80, 100, p.rd, Math.min(1, (p.id * p.id * p.rd) / 0.5));
              ledDome(ctx, 420, 80, Math.min(1, p.id / 0.02));

              wire(ctx, [
                bat.pos,
                { x: bat.pos.x, y: 80 },
                { x: 280, y: 80 },
              ]);
              wire(ctx, [
                { x: 390, y: 80 },
                { x: 390, y: 80 },
              ]);
              wire(ctx, [
                { x: 390, y: 80 },
                { x: 420, y: 80 },
              ]);
              wire(ctx, [
                { x: 460, y: 80 },
                { x: 520, y: 80 },
                mos.d,
              ]);
              wire(ctx, [
                mos.s,
                { x: mos.s.x, y: 250 },
                { x: bat.neg.x, y: 250 },
                bat.neg,
              ]);
              // Vgs between gate and source (return to source/GND)
              wire(ctx, [
                { x: 200, y: 150 },
                mos.g,
              ]);
              wire(ctx, [
                { x: 200, y: 150 },
                { x: 200, y: 250 },
                { x: mos.s.x, y: 250 },
              ], 2, Ink.muted);
              roundRect(ctx, 148, 136, 90, 28, 6);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              label(ctx, "Vgs", 193, 150, { size: 11, color: Ink.text });
              label(ctx, formatVolt(p.vgs), 193, 178, { mono: true, size: 11 });
              label(ctx, "return to S", 280, 238, { size: 10, color: Ink.muted });
              label(ctx, "N-channel", 520, 194, { size: 11, color: Ink.muted });
              label(ctx, p.region, 520, 210, { size: 12, color: Ink.electron });

              const bodyX = 80;
              const bodyY = 292;
              const bodyW = 360;
              const bodyH = 70;
              ctx.fillStyle = Ink.pType;
              ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
              ctx.fillStyle = Ink.nType;
              ctx.fillRect(bodyX + 24, bodyY + 18, 70, bodyH - 18);
              ctx.fillRect(bodyX + bodyW - 94, bodyY + 18, 70, bodyH - 18);
              if (on) {
                ctx.fillStyle = Ink.nType;
                ctx.globalAlpha = 0.35 + Math.min(0.65, p.over / 4);
                ctx.fillRect(bodyX + 94, bodyY + 18, bodyW - 188, 14);
                ctx.globalAlpha = 1;
              }
              label(ctx, "p-body", bodyX + bodyW / 2, bodyY + bodyH + 16, {
                size: 11,
                color: Ink.muted,
              });
              label(ctx, "gate", bodyX + bodyW / 2, bodyY - 22, { size: 11, color: Ink.text });
              label(ctx, "S", bodyX + 59, bodyY + 12, { size: 11 });
              label(ctx, "D", bodyX + bodyW - 59, bodyY + 12, { size: 11 });

              const loop: Pt[] = on
                ? [
                    bat.pos,
                    { x: bat.pos.x, y: 80 },
                    { x: 420, y: 80 },
                    { x: 520, y: 80 },
                    mos.d,
                    mos.s,
                    { x: mos.s.x, y: 250 },
                    { x: bat.neg.x, y: 250 },
                    bat.neg,
                  ]
                : [];
              flow.current.setPath(loop, false);
              flow.current.set(Math.min(1, p.id / 0.025), on ? 0.55 : 0);
              flow.current.step(dt);
              flow.current.draw(ctx);

              label(
                ctx,
                p.region === "cutoff"
                  ? "cut-off \u2014 no channel"
                  : p.region === "ohmic"
                    ? `ohmic \u00b7 Id \u2248 ${(p.id * 1000).toFixed(0)} mA`
                    : `Id = k (Vgs - Vth)^2 = ${formatAmp(p.id)}`,
                400,
                390,
                { size: 13, color: Ink.accent, align: "center" },
              );
            });
          }}
        />
      }
    />
  );
}
