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
  npnDie,
  resistorBody,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const BETA = 100;
const VCC = 9;
const VCE_SAT = 0.2;

export function TransistorLab() {
  const lab = LAB_BY_SLUG.transistor!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [ibUa, setIbUa] = useState(20);
  const [rc, setRc] = useState(470);
  const ib = ibUa * 1e-6;
  const icSat = (VCC - VCE_SAT) / rc;
  const icActive = BETA * ib;
  const sat = icActive > icSat;
  const ic = sat ? icSat : icActive;
  const region = ib < 1e-7 ? "cutoff" : sat ? "saturation" : "active";

  const collector = useRef(new ElectronFlow());
  const base = useRef(new ElectronFlow());
  const params = useRef({ ib, ic, rc, region, ibUa });
  params.current = { ib, ic, rc, region, ibUa };

  const insight = useMemo(() => {
    if (region === "cutoff") {
      return `Base current is essentially zero. The BE junction is off, the collector path is closed, the LED is dark. A transistor at rest is an open switch.`;
    }
    if (region === "saturation") {
      return `Saturated. The collector cannot deliver more than ${formatAmp(icSat)} through ${formatOhm(rc)}. Extra base current is wasted — this is the ON switch.`;
    }
    return `Active region. ${formatAmp(ib)} into the base becomes ${formatAmp(ic)} at the collector — a gain of β = ${BETA}. The small stream is steering the large one.`;
  }, [region, ib, ic, icSat, rc]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Ib" value={formatAmp(ib)} />
          <Meter label="Ic" value={formatAmp(ic)} />
          <Meter label="Region" value={region} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Base current"
            value={ibUa}
            display={`${ibUa.toFixed(0)} µA`}
            min={0}
            max={120}
            step={1}
            onChange={setIbUa}
            hint="A few tens of microamps open milliamps of collector current."
          />
          <LogControl
            label="Collector resistor"
            value={rc}
            display={formatOhm(rc)}
            min={100}
            max={4700}
            onChange={setRc}
            hint="Sets the maximum collector current (saturation)."
          />
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            β = {BETA} · Ic sat = (Vcc − 0.2) / Rc = {formatAmp(icSat)}
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              battery(ctx, 70, 100);
              label(ctx, formatVolt(VCC), 70, 152, { mono: true, size: 12 });
              resistorBody(ctx, 200, 64, 80, p.rc, Math.min(1, p.ic * 8));
              ledDome(ctx, 360, 40, Ink.electron, Math.min(1, p.ic / 0.015));

              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(520, 140, 34, 0, Math.PI * 2);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(498, 122);
              ctx.lineTo(498, 158);
              ctx.moveTo(498, 130);
              ctx.lineTo(536, 112);
              ctx.moveTo(498, 150);
              ctx.lineTo(536, 168);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(528, 164);
              ctx.lineTo(536, 168);
              ctx.lineTo(528, 172);
              ctx.stroke();

              wire(ctx, [
                { x: 88, y: 100 },
                { x: 88, y: 64 },
                { x: 200, y: 64 },
              ]);
              wire(ctx, [
                { x: 290, y: 64 },
                { x: 360, y: 64 },
              ]);
              wire(ctx, [
                { x: 360, y: 80 },
                { x: 360, y: 112 },
                { x: 536, y: 112 },
              ]);
              wire(ctx, [
                { x: 536, y: 168 },
                { x: 536, y: 250 },
                { x: 70, y: 250 },
                { x: 70, y: 128 },
              ]);
              wire(ctx, [
                { x: 200, y: 200 },
                { x: 498, y: 140 },
              ]);
              ctx.fillStyle = Ink.package;
              ctx.fillRect(160, 188, 80, 24);
              label(ctx, "Ib source", 200, 200, { size: 10, color: Ink.text });
              label(ctx, `${p.ibUa.toFixed(0)} µA`, 200, 224, { mono: true, size: 11 });
              label(ctx, "NPN", 520, 140, { size: 10 });
              label(ctx, p.region, 520, 190, { size: 12, color: Ink.electron });

              npnDie(ctx, 80, 288, 300, 70);
              label(ctx, "die cross-section", 230, 276, { size: 11, color: Ink.text });

              const col: Pt[] = [
                { x: 360, y: 112 },
                { x: 536, y: 112 },
                { x: 536, y: 168 },
              ];
              collector.current.setPath(col, false);
              collector.current.set(
                p.ic > 0.0004 ? Math.max(6, Math.min(40, p.ic * 1200)) : 0,
                -Math.min(240, 40 + p.ic * 4000),
              );
              collector.current.step(dt);
              collector.current.draw(ctx);

              const bpath: Pt[] = [
                { x: 240, y: 200 },
                { x: 498, y: 140 },
              ];
              base.current.setPath(bpath, false);
              base.current.radius = 1.7;
              base.current.set(p.ib > 2e-7 ? Math.max(3, Math.min(12, p.ib * 80000)) : 0, -70);
              base.current.step(dt);
              base.current.draw(ctx);

              label(ctx, `Ic = β Ib = ${formatAmp(p.ic)}`, 560, 392, {
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
