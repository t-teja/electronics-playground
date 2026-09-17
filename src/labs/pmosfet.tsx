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
  resistorBody,
  roundRect,
  wire,
  withFrame
} from "@/lib/sim/draw";
import { pMosfet } from "@/lib/sim/draw-ext";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const VDD = 9;
const VTH = 2; // |Vth|
const K = 0.08;
const VF_LED = 2.0;

export function PmosfetLab() {
  const lab = LAB_BY_SLUG.pmosfet!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  // Gate drive relative to ground; source is at VDD, so Vsg = VDD - Vg
  const [vg, setVg] = useState(4.5);
  const [rd, setRd] = useState(470);
  const vsg = VDD - vg;
  const over = Math.max(0, vsg - VTH);
  const idSat = K * over * over;
  const idMax = (VDD - VF_LED) / rd;
  const sat = idSat < idMax;
  const id = vsg < VTH ? 0 : sat ? idSat : idMax;
  const region = vsg < VTH ? "cutoff" : sat ? "saturation" : "ohmic";

  const flow = useRef(new ElectronFlow());
  const params = useRef({ vg, vsg, rd, id, region, over, idSat, idMax });
  params.current = { vg, vsg, rd, id, region, over, idSat, idMax };

  const insight = useMemo(() => {
    if (region === "cutoff") {
      return `Vsg = ${formatVolt(vsg)} is below the ${formatVolt(VTH)} threshold. No p-channel, the high-side path is open, the LED is dark. Pull the gate down toward ground to turn it on.`;
    }
    if (region === "ohmic") {
      return `Ohmic. The p-channel is a closed high-side switch. Drain current is limited by ${formatOhm(rd)} and the LED drop to ${formatAmp(idMax)}.`;
    }
    return `Saturation. Id ~ k * (Vsg - |Vth|)^2 = ${formatAmp(id)}. Source sits at +VDD; the load hangs from the drain toward ground.`;
  }, [region, vsg, id, idMax, rd]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Vsg" value={formatVolt(vsg)} />
          <Meter label="Id" value={formatAmp(id)} />
          <Meter label="Region" value={region} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Gate voltage (to GND)"
            value={vg}
            display={formatVolt(vg)}
            min={0}
            max={9}
            step={0.05}
            onChange={setVg}
            hint={`Source at ${formatVolt(VDD)}. Vsg = VDD - Vg. |Vth| = ${formatVolt(VTH)}.`}
          />
          <LogControl
            label="Drain resistor"
            value={rd}
            display={formatOhm(rd)}
            min={100}
            max={4700}
            onChange={setRd}
            hint="Sets how much current the high-side switch can pass."
          />
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            {"|Vth| = "}{formatVolt(VTH)}{" * Id sat = k * (Vsg - |Vth|)^2"}
          </p>
          <p className="text-xs text-subtle">
            Region names are a current clamp against (VDD - Vf)/Rd, not a full Vsd MOSFET model.
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const on = p.region !== "cutoff";
            const lit = p.id >= 0.001;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 64, 90);
              label(ctx, formatVolt(VDD), 64, 142, { mono: true, size: 12 });
              const mos = pMosfet(ctx, 320, 150, on);
              resistorBody(ctx, 480, 250, 80, p.rd, Math.min(1, p.id * 8));
              const led = ledDome(ctx, 600, 220, lit ? "#5eead4" : Ink.body, lit ? 1 : 0);

              // Source to +VDD
              wire(ctx, [
                bat.pos,
                { x: bat.pos.x, y: 54 },
                { x: mos.s.x, y: 54 },
                mos.s,
              ]);
              // Drain to load to LED to GND
              wire(ctx, [
                mos.d,
                { x: mos.d.x, y: 250 },
                { x: 470, y: 250 },
              ]);
              wire(ctx, [
                { x: 570, y: 250 },
                { x: led.anode.x, y: 250 },
                { x: led.anode.x, y: led.anode.y },
                led.anode,
              ]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: 320 },
                { x: bat.neg.x, y: 320 },
                bat.neg,
              ]);
              // Gate drive from Vg block; return referenced to source (+VDD rail conceptually via Vsg)
              wire(ctx, [{ x: 180, y: 150 }, mos.g]);
              wire(ctx, [
                { x: 180, y: 150 },
                { x: 180, y: 54 },
                { x: mos.s.x, y: 54 },
              ], 2, Ink.muted);
              roundRect(ctx, 128, 136, 90, 28, 6);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              label(ctx, "Vg", 173, 150, { size: 11, color: Ink.text });
              label(ctx, formatVolt(p.vg), 173, 178, { mono: true, size: 11 });
              label(ctx, `Vsg ${formatVolt(p.vsg)}`, 173, 196, { mono: true, size: 11 });
              label(ctx, "P-channel", 320, 210, { size: 11, color: Ink.muted });
              label(ctx, p.region, 320, 226, { size: 12, color: Ink.electron });
              label(ctx, "high-side", 520, 210, { size: 11, color: Ink.muted });

              const bodyX = 80;
              const bodyY = 300;
              const bodyW = 360;
              const bodyH = 70;
              ctx.fillStyle = Ink.nType;
              ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
              ctx.fillStyle = Ink.pType;
              ctx.fillRect(bodyX + 24, bodyY + 18, 70, bodyH - 18);
              ctx.fillRect(bodyX + bodyW - 94, bodyY + 18, 70, bodyH - 18);
              if (on) {
                ctx.fillStyle = Ink.pType;
                ctx.globalAlpha = 0.35 + Math.min(0.65, p.over / 4);
                ctx.fillRect(bodyX + 94, bodyY + 18, bodyW - 188, 14);
                ctx.globalAlpha = 1;
              }
              ctx.fillStyle = Ink.package;
              ctx.fillRect(bodyX + 110, bodyY - 10, bodyW - 220, 10);
              ctx.strokeStyle = "rgba(128,128,128,0.25)";
              ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);
              label(ctx, "S  p+", bodyX + 59, bodyY + bodyH + 14, { size: 11, color: Ink.hole });
              label(ctx, "n body", bodyX + bodyW / 2, bodyY + bodyH + 14, { size: 11, color: Ink.electron });
              label(ctx, "D  p+", bodyX + bodyW - 59, bodyY + bodyH + 14, { size: 11, color: Ink.hole });
              label(ctx, "gate", bodyX + bodyW / 2, bodyY - 22, { size: 11, color: Ink.text });
              label(ctx, on ? "inversion channel" : "no channel", bodyX + bodyW / 2, bodyY + 30, {
                size: 11,
                color: on ? Ink.electron : Ink.muted,
              });

              const col: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: 54 },
                { x: mos.s.x, y: 54 },
                mos.s,
                mos.d,
                { x: mos.d.x, y: 250 },
                { x: led.anode.x, y: 250 },
                led.anode,
                led.cathode,
                { x: led.cathode.x, y: 320 },
                { x: bat.neg.x, y: 320 },
                bat.neg,
              ];
              flow.current.setPath(col, false);
              flow.current.set(
                p.id > 0.0004 ? Math.max(6, Math.min(36, p.id * 1200)) : 0,
                -Math.min(240, 40 + p.id * 4000),
              );
              flow.current.step(dt);
              flow.current.draw(ctx);

              const overlay =
                p.region === "cutoff"
                  ? "Id = 0  (cutoff)"
                  : p.region === "ohmic"
                    ? `Id = (VDD - Vf) / Rd = ${formatAmp(p.id)}`
                    : `Id = k (Vsg - |Vth|)^2 = ${formatAmp(p.id)}`;
              label(ctx, overlay, 560, 392, {
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
