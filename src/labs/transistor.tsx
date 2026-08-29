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
  gnd,
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
  const params = useRef({ ib, ic, rc, region, ibUa });
  params.current = { ib, ic, rc, region, ibUa };

  const insight = useMemo(() => {
    if (region === "cutoff") {
      return `Base current is essentially zero. The BE junction is off, the collector path is closed, the LED is dark. A transistor at rest is an open switch.`;
    }
    if (region === "saturation") {
      return `Saturated. The collector cannot deliver more than ${formatAmp(icSat)} through ${formatOhm(rc)}. Extra base current is wasted \u2014 this is the ON switch.`;
    }
    return `Active region. ${formatAmp(ib)} into the base becomes ${formatAmp(ic)} at the collector \u2014 a gain of \u03b2 = ${BETA}. The small stream is steering the large one.`;
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
            {"\u03b2"} = {BETA} · Ic sat = (Vcc - Vce_sat - Vf) / Rc = {formatAmp(icSat)}
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
              const vccY = 64;
              const botY = 250;
              const bat = battery(ctx, 70, 100);
              label(ctx, formatVolt(VCC), 70, 152, { mono: true, size: 12 });

              const rcX = 200;
              const rcW = 80;
              resistorBody(ctx, rcX, vccY, rcW, p.rc, Math.min(1, p.ic * 8));
              const rcLeft: Pt = { x: rcX - 10, y: vccY };
              const rcRight: Pt = { x: rcX + rcW + 10, y: vccY };

              const led = ledDome(ctx, 360, vccY - 34, Ink.electron, Math.min(1, p.ic / 0.015));
              const q = bjtSymbol(ctx, 520, 140, "npn");

              wire(ctx, [bat.pos, { x: bat.pos.x, y: vccY }, rcLeft]);
              wire(ctx, [rcRight, { x: led.anode.x, y: vccY }, led.anode]);
              wire(ctx, [led.cathode, { x: led.cathode.x, y: q.c.y }, q.c]);
              wire(ctx, [q.e, { x: q.e.x, y: botY }, { x: bat.neg.x, y: botY }, bat.neg]);
              wire(ctx, [{ x: 240, y: q.b.y }, q.b]);
              gnd(ctx, 200, botY);
              junction(ctx, bat.pos.x, vccY);
              junction(ctx, led.cathode.x, q.c.y);
              junction(ctx, q.e.x, botY);
              junction(ctx, bat.neg.x, botY);

              ctx.fillStyle = Ink.package;
              ctx.fillRect(160, q.b.y - 12, 80, 24);
              label(ctx, "Ib source", 200, q.b.y, { size: 10, color: Ink.text });
              label(ctx, `${p.ibUa.toFixed(0)} \u00b5A`, 200, q.b.y + 24, { mono: true, size: 11 });
              label(ctx, "NPN", 520, 188, { size: 10 });
              label(ctx, p.region, 520, 206, { size: 12, color: Ink.electron });

              npnDie(ctx, 80, 288, 300, 70);
              label(ctx, "die cross-section", 230, 276, { size: 11, color: Ink.text });

              const col: Pt[] = [
                led.cathode,
                { x: led.cathode.x, y: q.c.y },
                q.c,
                q.e,
                { x: q.e.x, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              collector.current.setPath(col, false);
              collector.current.set(
                p.ic > 0.0004 ? Math.max(6, Math.min(40, p.ic * 1200)) : 0,
                -Math.min(240, 40 + p.ic * 4000),
              );
              collector.current.step(dt);
              collector.current.draw(ctx);

              const bpath: Pt[] = [{ x: 240, y: q.b.y }, q.b];
              base.current.setPath(bpath, false);
              base.current.radius = 1.7;
              base.current.set(p.ib > 2e-7 ? Math.max(3, Math.min(12, p.ib * 80000)) : 0, -70);
              base.current.step(dt);
              base.current.draw(ctx);

              label(ctx, `Ic = \u03b2 Ib = ${formatAmp(p.ic)}`, 560, 392, {
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
