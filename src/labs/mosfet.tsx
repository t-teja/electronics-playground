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

export function MosfetLab() {
  const lab = LAB_BY_SLUG.mosfet!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vgs, setVgs] = useState(3.2);
  const [rd, setRd] = useState(470);
  const over = Math.max(0, vgs - VTH);
  const idSat = K * over * over;
  const idMax = VDD / rd;
  const sat = idSat < idMax;
  const id = vgs < VTH ? 0 : sat ? idSat : idMax;
  const region = vgs < VTH ? "cutoff" : sat ? "saturation" : "linear";

  const flow = useRef(new ElectronFlow());
  const params = useRef({ vgs, rd, id, region, over });
  params.current = { vgs, rd, id, region, over };

  const insight = useMemo(() => {
    if (region === "cutoff") {
      return `Vgs = ${formatVolt(vgs)} is below the ${formatVolt(VTH)} threshold. No inversion layer, no channel, the LED is dark. The gate draws (almost) no DC current.`;
    }
    if (region === "linear") {
      return `The channel is a resistor. Drain current is limited by ${formatOhm(rd)} to ${formatAmp(idMax)} - the MOSFET is a closed switch.`;
    }
    return `Saturation. The inverted n-channel is pinched off at the drain. Id ~ k(Vgs - Vth)^2 = ${formatAmp(id)}. Raise the gate, the channel gets denser.`;
  }, [region, vgs, id, idMax, rd]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Vgs" value={formatVolt(vgs)} />
          <Meter label="Id" value={formatAmp(id)} />
          <Meter label="Region" value={region} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Gate voltage"
            value={vgs}
            display={formatVolt(vgs)}
            min={0}
            max={8}
            step={0.05}
            onChange={setVgs}
            hint={`Threshold Vth = ${formatVolt(VTH)}. The gate is a capacitor.`}
          />
          <LogControl
            label="Drain resistor"
            value={rd}
            display={formatOhm(rd)}
            min={100}
            max={4700}
            onChange={setRd}
            hint="Sets how much current the switch can pass."
          />
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            Vth = {formatVolt(VTH)} * Id sat = k (Vgs - Vth)^2
          </p>
          <p className="text-xs text-subtle">
            Region names are a current clamp against VDD/Rd, not a full Vds MOSFET model.
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const on = p.region !== "cutoff";
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 64, 90);
              label(ctx, formatVolt(VDD), 64, 142, { mono: true, size: 12 });
              resistorBody(ctx, 180, 54, 80, p.rd, Math.min(1, p.id * 8));
              const led = ledDome(ctx, 340, 30, Ink.electron, Math.min(1, p.id / 0.015));
              const mos = nMosfet(ctx, 520, 150, on);

              wire(ctx, [
                bat.pos,
                { x: bat.pos.x, y: 54 },
                { x: 180, y: 54 },
              ]);
              wire(ctx, [
                { x: 270, y: 54 },
                { x: led.anode.x, y: 54 },
                led.anode,
              ]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: mos.d.y },
                mos.d,
              ]);
              wire(ctx, [
                mos.s,
                { x: mos.s.x, y: 250 },
                { x: bat.neg.x, y: 250 },
                bat.neg,
              ]);
              wire(ctx, [
                { x: 200, y: 150 },
                mos.g,
              ]);
              roundRect(ctx, 148, 136, 90, 28, 6);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              label(ctx, "Vgs", 193, 150, { size: 11, color: Ink.text });
              label(ctx, formatVolt(p.vgs), 193, 178, { mono: true, size: 11 });
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
              ctx.fillStyle = Ink.package;
              ctx.fillRect(bodyX + 110, bodyY - 10, bodyW - 220, 10);
              ctx.strokeStyle = "rgba(128,128,128,0.25)";
              ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);
              label(ctx, "S  n+", bodyX + 59, bodyY + bodyH + 14, { size: 11, color: Ink.electron });
              label(ctx, "p body", bodyX + bodyW / 2, bodyY + bodyH + 14, { size: 11, color: Ink.hole });
              label(ctx, "D  n+", bodyX + bodyW - 59, bodyY + bodyH + 14, { size: 11, color: Ink.electron });
              label(ctx, "gate", bodyX + bodyW / 2, bodyY - 22, { size: 11, color: Ink.text });
              label(ctx, on ? "inversion channel" : "no channel", bodyX + bodyW / 2, bodyY + 30, {
                size: 11,
                color: on ? Ink.electron : Ink.muted,
              });

              const col: Pt[] = [
                led.cathode,
                { x: led.cathode.x, y: mos.d.y },
                mos.d,
                mos.s,
                { x: mos.s.x, y: 250 },
                { x: bat.neg.x, y: 250 },
                bat.neg,
              ];
              flow.current.setPath(col, false);
              flow.current.set(
                p.id > 0.0004 ? Math.max(6, Math.min(36, p.id * 1200)) : 0,
                -Math.min(240, 40 + p.id * 4000),
              );
              flow.current.step(dt);
              flow.current.draw(ctx);

              label(ctx, `Id = k (Vgs - Vth)^2 = ${formatAmp(p.id)}`, 560, 392, {
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
