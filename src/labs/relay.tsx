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
              battery(ctx, 70, 150);
              label(ctx, formatVolt(p.vcoil), 70, 202, { mono: true, size: 12 });
              const R = relayBody(ctx, 340, 168, p.on);
              const fly = diodeSymbol(ctx, 200, 200, 0.85);
              label(ctx, "flyback", 200, 236, { size: 10 });

              wire(ctx, [
                { x: 86, y: 150 },
                { x: 200, y: 150 },
                { x: R.coilTop.x, y: 150 },
                R.coilTop,
              ]);
              // cathode on coil + / battery +
              wire(ctx, [
                fly.cathode,
                { x: fly.cathode.x, y: 150 },
              ]);
              // anode on coil bottom / ground
              wire(ctx, [
                fly.anode,
                { x: fly.anode.x, y: R.coilBot.y },
                R.coilBot,
              ]);
              wire(ctx, [
                R.coilBot,
                { x: 54, y: R.coilBot.y },
                { x: 54, y: 150 },
              ]);

              battery(ctx, 620, 70);
              label(ctx, "load  9 V", 620, 122, { size: 11 });
              lamp(ctx, 720, 196, p.on ? 1 : 0.04);
              wire(ctx, [
                { x: 636, y: 70 },
                { x: 720, y: 70 },
                { x: 720, y: 168 },
              ]);
              wire(ctx, [
                { x: 748, y: 196 },
                { x: 770, y: 196 },
                { x: 770, y: 320 },
                { x: R.com.x, y: 320 },
                R.com,
              ]);
              wire(ctx, [R.no, { x: 692, y: R.no.y }, { x: 692, y: 196 }]);
              label(ctx, "load", 720, 240, { size: 11 });

              const coilPath: Pt[] = [
                { x: 86, y: 150 },
                { x: 200, y: 150 },
                R.coilTop,
              ];
              coilFlow.current.setPath(coilPath, false);
              coilFlow.current.set(
                p.icoil > 0.004 ? Math.max(5, Math.min(22, p.icoil * 400)) : 0,
                -90,
              );
              coilFlow.current.step(dt);
              coilFlow.current.draw(ctx);

              const loadPath: Pt[] = [
                { x: 636, y: 70 },
                { x: 720, y: 70 },
                { x: 720, y: 168 },
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
