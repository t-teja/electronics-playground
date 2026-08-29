import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatAmp, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  acSource,
  clearSim,
  graphPaper,
  Ink,
  label,
  lamp,
  resistorBody,
  scope,
  transformer,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

export function TransformerLab() {
  const lab = LAB_BY_SLUG.transformer!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vp, setVp] = useState(9);
  const [np, setNp] = useState(10);
  const [ns, setNs] = useState(20);
  const [rload, setRload] = useState(220);

  const ratio = ns / np;
  const vs = vp * ratio;
  const isec = vs / rload;
  const ipri = isec * ratio;

  const samples = useRef<number[]>(Array(120).fill(0.5));
  const flowP = useRef(new ElectronFlow());
  const flowS = useRef(new ElectronFlow());
  const params = useRef({ vp, np, ns, rload, vs, isec, ipri, ratio });
  params.current = { vp, np, ns, rload, vs, isec, ipri, ratio };

  const insight = useMemo(() => {
    if (ratio > 1.05) {
      return `Step-up. ${np} primary turns write the flux; ${ns} secondary turns read a higher voltage (${formatVolt(vs)}). Current on the secondary is smaller so power roughly matches.`;
    }
    if (ratio < 0.95) {
      return `Step-down. Fewer secondary turns, lower voltage (${formatVolt(vs)}), higher available current. This is how a wall wart feeds a lamp.`;
    }
    return `1:1 isolation. Voltage is unchanged; the circuits share flux, not copper. The lamp on the secondary never touches the primary.`;
  }, [ratio, np, ns, vs]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Vs" value={formatVolt(vs)} />
          <Meter label="Is" value={formatAmp(isec)} />
          <Meter label="Ns / Np" value={ratio.toFixed(2)} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Primary V (peak)"
            value={vp}
            display={formatVolt(vp)}
            min={2}
            max={18}
            step={0.1}
            onChange={setVp}
          />
          <LinearControl
            label="Primary turns"
            value={np}
            display={`${np.toFixed(0)}`}
            min={4}
            max={40}
            step={1}
            onChange={setNp}
          />
          <LinearControl
            label="Secondary turns"
            value={ns}
            display={`${ns.toFixed(0)}`}
            min={4}
            max={40}
            step={1}
            onChange={setNs}
          />
          <LinearControl
            label="Load"
            value={rload}
            display={`${rload.toFixed(0)} \u03a9`}
            min={40}
            max={800}
            step={10}
            onChange={setRload}
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            const ac = Math.sin(t * 4);
            const flux = Math.abs(ac);
            samples.current.push(0.5 + 0.45 * ac);
            if (samples.current.length > 160) samples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const T = transformer(ctx, 400, 180, flux, p.np, p.ns);
              label(ctx, `Np ${p.np.toFixed(0)}`, 300, 180, { size: 12, mono: true });
              label(ctx, `Ns ${p.ns.toFixed(0)}`, 500, 180, { size: 12, mono: true });
              label(ctx, "core", 400, 248, { size: 11, color: Ink.muted });

              const acSrc = acSource(ctx, 80, 180);
              label(ctx, formatVolt(p.vp * ac), 80, 226, { mono: true, size: 11 });

              wire(ctx, [T.priTop, acSrc.top]);
              wire(ctx, [T.priBot, acSrc.bot]);

              lamp(ctx, 680, 140, Math.min(1, (p.vs / 12) * flux));
              resistorBody(ctx, 640, 220, 70, p.rload, Math.min(1, p.isec * 8));
              wire(ctx, [T.secTop, { x: 652, y: 140 }]);
              wire(ctx, [
                { x: 708, y: 140 },
                { x: 740, y: 140 },
                { x: 740, y: 220 },
                { x: 720, y: 220 },
              ]);
              wire(ctx, [T.secBot, { x: 640, y: 220 }]);
              label(ctx, "load", 680, 100, { size: 11 });
              label(ctx, formatVolt(p.vs * ac), 680, 268, { mono: true, size: 11 });

              const pri: Pt[] = [T.priTop, acSrc.top, acSrc.bot, T.priBot];
              flowP.current.setPath(pri, false);
              flowP.current.set(Math.max(4, Math.min(20, p.ipri * 80)), ac >= 0 ? -90 : 90);
              flowP.current.step(dt);
              flowP.current.draw(ctx);

              const sec: Pt[] = [T.secTop, { x: 680, y: 140 }, { x: 740, y: 140 }, { x: 740, y: 220 }];
              flowS.current.setPath(sec, false);
              flowS.current.set(Math.max(4, Math.min(22, p.isec * 80)), ac >= 0 ? 90 : -90);
              flowS.current.step(dt);
              flowS.current.draw(ctx);

              scope(ctx, 540, 300, 220, 90, samples.current, Ink.electron, "flux / Vs");
              label(ctx, `Vs / Vp = Ns / Np = ${p.ratio.toFixed(2)}`, 280, 392, {
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
