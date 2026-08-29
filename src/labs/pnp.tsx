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
  resistorBody,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const BETA = 100;
const VCC = 9;
const VCE_SAT = 0.2;
const VF_LED = 2.0;

export function PnpLab() {
  const lab = LAB_BY_SLUG.pnp!;
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
  const holes = useRef(new ElectronFlow());
  const params = useRef({ ib, ic, rc, region, ibUa });
  params.current = { ib, ic, rc, region, ibUa };

  const insight = useMemo(() => {
    if (region === "cutoff") {
      return `No current is being pulled out of the base. The emitter–base junction is off, the high-side path is closed, the LED is dark. A PNP at rest is an open switch sitting on VCC.`;
    }
    if (region === "saturation") {
      return `Saturated. The collector cannot source more than ${formatAmp(icSat)} through ${formatOhm(rc)}. Extra base current is wasted — this is the ON high-side switch.`;
    }
    return `Active region. ${formatAmp(ib)} leaving the base becomes ${formatAmp(ic)} at the collector — a gain of β = ${BETA}. Holes stream from emitter to collector; the load hangs toward ground.`;
  }, [region, ib, ic, icSat, rc]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Ib (out)" value={formatAmp(ib)} />
          <Meter label="Ic" value={formatAmp(ic)} />
          <Meter label="Region" value={region} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Base current (out)"
            value={ibUa}
            display={`${ibUa.toFixed(0)} µA`}
            min={0}
            max={120}
            step={1}
            onChange={setIbUa}
            hint="Pull current out of the base to turn a PNP on."
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
            β = {BETA} · Ic sat = (Vcc − Vce_sat − Vf) / Rc = {formatAmp(icSat)}
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
              const topY = 64;
              const botY = 268;
              const bat = battery(ctx, 70, 150);
              label(ctx, formatVolt(VCC), 70, 206, { mono: true, size: 12 });

              const q = bjtSymbol(ctx, 340, 150, "pnp");
              const led = ledDome(ctx, 560, 30, Ink.electron, Math.min(1, p.ic / 0.015));
              resistorBody(ctx, 520, botY, 80, p.rc, Math.min(1, p.ic * 8));

              wire(ctx, [
                bat.pos,
                { x: bat.pos.x, y: topY },
                { x: 420, y: topY },
                { x: 420, y: q.e.y },
                q.e,
              ]);
              wire(ctx, [q.c, { x: q.c.x, y: 64 }, { x: led.anode.x, y: 64 }, led.anode]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: botY },
                { x: 610, y: botY },
              ]);
              wire(ctx, [
                { x: 510, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);

              wire(ctx, [q.b, { x: 200, y: q.b.y }, { x: 200, y: botY }]);
              ctx.fillStyle = Ink.package;
              ctx.fillRect(160, q.b.y - 12, 80, 24);
              label(ctx, "Ib sink", 200, q.b.y, { size: 10, color: Ink.text });
              label(ctx, `${p.ibUa.toFixed(0)} µA out`, 200, q.b.y + 24, { mono: true, size: 11 });

              junction(ctx, 420, topY);
              junction(ctx, bat.pos.x, topY);
              junction(ctx, led.cathode.x, botY);
              junction(ctx, 200, botY);
              junction(ctx, bat.neg.x, botY);

              label(ctx, "PNP", 340, 204, { size: 10 });
              label(ctx, p.region, 340, 220, { size: 12, color: Ink.electron });
              label(ctx, "E → +VCC", 420, topY - 16, { size: 10, color: Ink.text });
              label(ctx, "arrow in", q.e.x + 36, q.e.y, { size: 10, align: "left" });

              const dx = 80;
              const dy = 300;
              const dw = 300;
              const dh = 70;
              const eW = dw * 0.34;
              const bW = dw * 0.16;
              const cW = dw * 0.5;
              ctx.fillStyle = Ink.pType;
              ctx.fillRect(dx, dy, eW, dh);
              ctx.fillStyle = Ink.nType;
              ctx.fillRect(dx + eW, dy, bW, dh);
              ctx.fillStyle = Ink.pType;
              ctx.fillRect(dx + eW + bW, dy, cW, dh);
              ctx.strokeStyle = "rgba(128,128,128,0.25)";
              ctx.strokeRect(dx, dy, dw, dh);
              label(ctx, "E  p", dx + eW / 2, dy + dh + 14, { size: 11, color: Ink.hole });
              label(ctx, "B  n", dx + eW + bW / 2, dy + dh + 14, { size: 11, color: Ink.electron });
              label(ctx, "C  p", dx + eW + bW + cW / 2, dy + dh + 14, { size: 11, color: Ink.hole });
              label(ctx, "die cross-section", 230, 288, { size: 11, color: Ink.text });

              const col: Pt[] = [
                bat.neg,
                { x: bat.neg.x, y: botY },
                { x: 510, y: botY },
                { x: 610, y: botY },
                { x: led.cathode.x, y: botY },
                led.cathode,
                led.anode,
                { x: led.anode.x, y: 64 },
                { x: q.c.x, y: 64 },
                q.c,
                q.e,
                { x: 420, y: q.e.y },
                { x: 420, y: topY },
                { x: bat.pos.x, y: topY },
                bat.pos,
              ];
              collector.current.setPath(col, true);
              collector.current.set(
                p.ic > 0.0004 ? Math.max(6, Math.min(40, p.ic * 1200)) : 0,
                Math.min(240, 40 + p.ic * 4000),
              );
              collector.current.step(dt);
              collector.current.draw(ctx);

              const bpath: Pt[] = [
                { x: 200, y: botY },
                { x: 200, y: q.b.y },
                q.b,
              ];
              base.current.setPath(bpath, false);
              base.current.radius = 1.7;
              base.current.set(p.ib > 2e-7 ? Math.max(3, Math.min(12, p.ib * 80000)) : 0, 70);
              base.current.step(dt);
              base.current.draw(ctx);

              holes.current.kind = "hole";
              holes.current.glow = false;
              holes.current.setPath([q.e, q.c], false);
              holes.current.set(p.ic > 0.0004 ? 8 : 0, 90);
              holes.current.step(dt);
              holes.current.draw(ctx);

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
