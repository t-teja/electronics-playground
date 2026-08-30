import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, LogControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatAmp, formatOhm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  bjtSymbol,
  clearSim,
  graphPaper,
  Ink,
  junction,
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
const VF_LED = 2.0;

export function TransistorLab() {
  const lab = LAB_BY_SLUG.transistor!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [ibUa, setIbUa] = useState(20);
  const [rc, setRc] = useState(470);
  const ib = ibUa * 1e-6;
  const icSat = (VCC - VCE_SAT - VF_LED) / rc;
  const icActive = BETA * ib;
  const sat = icActive > icSat;
  const ic = sat ? icSat : icActive;
  const region = ib < 1e-7 ? "cutoff" : sat ? "saturation" : "active";

  const collector = useRef(new ElectronFlow());
  const base = useRef(new ElectronFlow());
  const params = useRef({ ib, ic, rc, region, ibUa, icSat });
  params.current = { ib, ic, rc, region, ibUa, icSat };

  const insight = useMemo(() => {
    if (region === "cutoff") {
      return `Base current is essentially zero. The BE junction is off, the collector path is closed, the LED is dark. A transistor at rest is an open switch.`;
    }
    if (region === "saturation") {
      return `Saturated. The collector cannot deliver more than ${formatAmp(icSat)} through ${formatOhm(rc)}. Extra base current is wasted. This is the ON switch.`;
    }
    return `Active region. ${formatAmp(ib)} into the base becomes ${formatAmp(ic)} at the collector. A gain of \u03b2 = ${BETA}. The small stream is steering the large one.`;
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
            display={`${ibUa.toFixed(0)} \u00b5A`}
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
            {"\u03b2 = "}{BETA}{" \u00b7 Ic sat = (Vcc - Vce_sat - Vf) / Rc = "}{formatAmp(icSat)}
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const lit = p.ic >= 0.001;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 70, 100);
              label(ctx, formatVolt(VCC), 70, 152, { mono: true, size: 12 });
              resistorBody(ctx, 200, 64, 80, p.rc, Math.min(1, p.ic * 8));
              const led = ledDome(ctx, 360, 40, lit ? "#5eead4" : Ink.body, lit ? 1 : 0);
              const q = bjtSymbol(ctx, 520, 140, "npn");

              wire(ctx, [
                bat.pos,
                { x: bat.pos.x, y: 64 },
                { x: 200, y: 64 },
              ]);
              wire(ctx, [
                { x: 290, y: 64 },
                { x: led.anode.x, y: 64 },
                led.anode,
              ]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: q.c.y },
                q.c,
              ]);
              wire(ctx, [
                q.e,
                { x: q.e.x, y: 250 },
                { x: bat.neg.x, y: 250 },
                bat.neg,
              ]);
              junction(ctx, bat.pos.x, 64);
              junction(ctx, led.cathode.x, q.c.y);
              junction(ctx, bat.neg.x, 250);
              wire(ctx, [
                { x: 200, y: 200 },
                q.b,
              ]);
              ctx.fillStyle = Ink.package;
              ctx.fillRect(160, 188, 80, 24);
              label(ctx, "Ib source", 200, 200, { size: 10, color: Ink.text });
              label(ctx, `${p.ibUa.toFixed(0)} \u00b5A`, 200, 224, { mono: true, size: 11 });
              label(ctx, "NPN  (low-side)", 520, 188, { size: 11 });
              label(ctx, p.region, 520, 206, { size: 12, color: Ink.electron });

              npnDie(ctx, 80, 288, 300, 70);
              label(ctx, "die cross-section", 230, 276, { size: 11, color: Ink.text });

              const col: Pt[] = [
                led.cathode,
                { x: led.cathode.x, y: q.c.y },
                q.c,
                q.e,
                { x: q.e.x, y: 250 },
                { x: bat.neg.x, y: 250 },
                bat.neg,
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
                q.b,
              ];
              base.current.setPath(bpath, false);
              base.current.radius = 1.7;
              base.current.set(p.ib > 2e-7 ? Math.max(3, Math.min(12, p.ib * 80000)) : 0, -70);
              base.current.step(dt);
              base.current.draw(ctx);

              const overlay =
                p.region === "saturation"
                  ? `Ic = (Vcc - Vce_sat - Vf) / Rc = ${formatAmp(p.ic)}`
                  : p.region === "cutoff"
                    ? "Ic = 0  (cutoff)"
                    : `Ic = \u03b2 Ib = ${formatAmp(p.ic)}`;
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
