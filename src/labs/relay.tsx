import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatAmp, formatOhm, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  diodeSymbol,
  graphPaper,
  Ink,
  label,
  lamp,
  relayBody,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const RCOIL = 180;
const PULL = 0.018;

export function RelayLab() {
  const lab = LAB_BY_SLUG.relay!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [armed, setArmed] = useState(true);
  const [vcoil, setVcoil] = useState(12);
  const icoil = armed ? vcoil / RCOIL : 0;
  const on = icoil >= PULL;

  const coilFlow = useRef(new ElectronFlow());
  const loadFlow = useRef(new ElectronFlow());
  const params = useRef({ armed, vcoil, icoil, on });
  params.current = { armed, vcoil, icoil, on };

  const insight = useMemo(() => {
    if (!armed) {
      return `Coil open. The spring holds COM on NC. The load is dark. That click you don\u2019t hear is the isolation \u2014 coil and lamp never share copper.`;
    }
    if (!on) {
      return `Coil current is ${formatAmp(icoil)}, below pull-in (~${formatAmp(PULL)}). The field isn\u2019t strong enough to beat the spring yet. Raise the coil supply.`;
    }
    return `Pulled in. ${formatAmp(icoil)} in the coil slammed COM onto NO, and the lamp lights from its own supply. The diode across the coil is the flyback path for when you drop the field.`;
  }, [armed, on, icoil]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Coil" value={on ? "energized" : "off"} />
          <Meter label="I coil" value={formatAmp(icoil)} />
          <Meter label="Contact" value={on ? "NO" : "NC"} />
        </>
      }
      controls={
        <>
          <ToggleControl
            label="Coil drive"
            checked={armed}
            on="on"
            off="off"
            onCheckedChange={setArmed}
          />
          <LinearControl
            label="Coil supply"
            value={vcoil}
            display={formatVolt(vcoil)}
            min={3}
            max={24}
            step={0.1}
            onChange={setVcoil}
            hint={`${formatOhm(RCOIL)} coil. Pull-in near ${formatAmp(PULL)}.`}
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const coilBat = battery(ctx, 70, 150);
              label(ctx, formatVolt(p.vcoil), 70, 202, { mono: true, size: 12 });
              const R = relayBody(ctx, 340, 168, p.on);
              const fly = diodeSymbol(ctx, 200, 200, 0.85);
              label(ctx, "flyback", 200, 236, { size: 10 });

              wire(ctx, [coilBat.pos, { x: R.coilTop.x, y: coilBat.pos.y }, R.coilTop]);
              wire(ctx, [R.coilBot, { x: coilBat.neg.x, y: R.coilBot.y }, coilBat.neg]);
              wire(ctx, [fly.cathode, { x: fly.cathode.x, y: coilBat.pos.y }]);
              wire(ctx, [fly.anode, { x: fly.anode.x, y: R.coilBot.y }, R.coilBot]);

              const lampPads = lamp(ctx, 720, 168, p.on ? 1 : 0.04);
              label(ctx, "load", 720, 214, { size: 11 });
              const loadBat = battery(ctx, 640, 340);
              label(ctx, "load  9 V", 640, 392, { size: 11 });

              wire(ctx, [
                loadBat.pos,
                { x: loadBat.pos.x, y: lampPads.left.y },
                lampPads.left,
              ]);
              wire(ctx, [
                lampPads.right,
                { x: 770, y: lampPads.right.y },
                { x: 770, y: R.no.y },
                R.no,
              ]);
              wire(ctx, [
                R.com,
                { x: R.com.x, y: loadBat.neg.y },
                loadBat.neg,
              ]);

              const coilPath: Pt[] = [coilBat.pos, { x: R.coilTop.x, y: coilBat.pos.y }, R.coilTop];
              coilFlow.current.setPath(coilPath, false);
              coilFlow.current.set(
                p.icoil > 0.004 ? Math.max(5, Math.min(22, p.icoil * 400)) : 0,
                -90,
              );
              coilFlow.current.step(dt);
              coilFlow.current.draw(ctx);

              const loadPath: Pt[] = [
                loadBat.pos,
                { x: loadBat.pos.x, y: lampPads.left.y },
                lampPads.left,
                lampPads.right,
                { x: 770, y: lampPads.right.y },
                { x: 770, y: R.no.y },
                R.no,
                R.com,
                { x: R.com.x, y: loadBat.neg.y },
                loadBat.neg,
              ];
              loadFlow.current.setPath(loadPath, false);
              loadFlow.current.set(p.on ? 14 : 0, -100);
              loadFlow.current.step(dt);
              loadFlow.current.draw(ctx);

              label(ctx, `Icoil = V / R = ${formatAmp(p.icoil)}`, 400, 392, {
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
