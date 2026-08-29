import { useEffect, useMemo, useRef, useState } from "react";
import { Control, Meter } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatSec, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  graphPaper,
  Ink,
  junction,
  label,
  ledDome,
  roundRect,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const VCC = 5;
const HOLD = 2;
const WALK = 0.65;
const VF_LED = 2.0;
const R_LED = 470;

export function PirLab() {
  const lab = LAB_BY_SLUG.pir!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [pulseAt, setPulseAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const simT = useRef(0);

  useEffect(() => {
    if (pulseAt == null) return;
    const id = window.setInterval(() => {
      const n = simT.current;
      setNow(n);
      if (n > pulseAt + HOLD) setPulseAt(null);
    }, 50);
    return () => window.clearInterval(id);
  }, [pulseAt]);

  function walkBy() {
    const n = simT.current;
    setPulseAt(n);
    setNow(n);
  }

  const remaining = pulseAt == null ? 0 : Math.max(0, pulseAt + HOLD - now);
  const outHigh = remaining > 0;
  const iOut = outHigh ? Math.max(0, (VCC - VF_LED) / R_LED) : 0;
  const walkAge = pulseAt == null ? 99 : now - pulseAt;
  const walking = walkAge >= 0 && walkAge < WALK;
  const dPhi = walking ? Math.sin((walkAge / WALK) * Math.PI * 2) : 0;

  const flow = useRef(new ElectronFlow());
  const outFlow = useRef(new ElectronFlow());
  const params = useRef({ remaining, outHigh, iOut, walking, dPhi, walkAge, pulseAt });
  params.current = { remaining, outHigh, iOut, walking, dPhi, walkAge, pulseAt };

  const insight = useMemo(() => {
    if (walking && dPhi > 0.15) {
      return `A warm body crossed the left element. dΦ/dt is positive — the pyroelectric pair generates a pulse. The digital window snaps high and will hold for ${formatSec(HOLD)}.`;
    }
    if (walking && dPhi < -0.15) {
      return `Now the right element. Opposite polarity, still a change. PIR does not measure temperature; it measures how fast the infrared flux is changing.`;
    }
    if (outHigh) {
      return `The room is still again, but the output stays high for a retriggerable ${formatSec(HOLD)} window (${formatSec(remaining)} left). Walk by again to stretch it.`;
    }
    return `Idle. Dual elements see the same static scene, so dΦ/dt ≈ 0 and the output is dark. A person standing still is invisible. Press Walk by.`;
  }, [walking, dPhi, outHigh, remaining]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="dΦ/dt" value={dPhi.toFixed(2)} />
          <Meter label="OUT" value={outHigh ? "HIGH" : "LOW"} />
          <Meter label="Hold" value={formatSec(remaining)} />
        </>
      }
      controls={
        <Control label="Motion" hint="Pyroelectric sensors fire on change, not on a still body.">
          <button
            type="button"
            onClick={walkBy}
            className="h-9 rounded-md bg-raised px-4 text-xs font-medium text-fg"
          >
            Walk by
          </button>
        </Control>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">dΦ/dt · retriggerable window = {formatSec(HOLD)}</p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            simT.current = t;
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 64, 160);
              label(ctx, formatVolt(VCC), 64, 216, { mono: true, size: 12 });
              const topY = 72;
              const botY = 268;

              roundRect(ctx, 160, 96, 220, 120, 10);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.25)";
              ctx.stroke();
              label(ctx, "PIR", 270, 112, { size: 11, color: Ink.text });

              ctx.beginPath();
              ctx.ellipse(270, 168, 78, 36, 0, 0, Math.PI * 2);
              ctx.strokeStyle = Ink.pin;
              ctx.lineWidth = 1.6;
              ctx.stroke();
              ctx.fillStyle = "rgba(45, 212, 191, 0.06)";
              ctx.fill();
              label(ctx, "window", 270, 130, { size: 10 });

              roundRect(ctx, 214, 150, 44, 36, 4);
              ctx.fillStyle = p.dPhi > 0.1 ? Ink.pType : Ink.body;
              ctx.fill();
              roundRect(ctx, 282, 150, 44, 36, 4);
              ctx.fillStyle = p.dPhi < -0.1 ? Ink.nType : Ink.body;
              ctx.fill();
              label(ctx, "+", 236, 168, { size: 12, color: Ink.hole });
              label(ctx, "−", 304, 168, { size: 12, color: Ink.electron });

              const personX = p.walking ? 200 + (p.walkAge / WALK) * 280 : 170;
              ctx.fillStyle = p.walking ? Ink.heat : Ink.faint;
              ctx.beginPath();
              ctx.arc(personX, 64, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = p.walking ? Ink.heat : Ink.faint;
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.moveTo(personX, 72);
              ctx.lineTo(personX, 102);
              ctx.moveTo(personX - 10, 84);
              ctx.lineTo(personX + 10, 84);
              ctx.moveTo(personX, 102);
              ctx.lineTo(personX - 8, 122);
              ctx.moveTo(personX, 102);
              ctx.lineTo(personX + 8, 122);
              ctx.stroke();
              if (p.walking) {
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = Ink.heat;
                ctx.beginPath();
                ctx.moveTo(personX, 122);
                ctx.lineTo(236, 150);
                ctx.moveTo(personX, 122);
                ctx.lineTo(304, 150);
                ctx.stroke();
                ctx.globalAlpha = 1;
              }

              const led = ledDome(
                ctx,
                640,
                48,
                Ink.electron,
                p.outHigh ? Math.min(1, p.iOut / 0.012) : 0,
              );
              label(ctx, "OUT", 640, 24, { size: 11 });

              roundRect(ctx, 430, 124, 90, 44, 6);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              label(ctx, p.outHigh ? "HOLD" : "idle", 475, 146, {
                size: 12,
                color: p.outHigh ? Ink.electron : Ink.muted,
              });

              const holdW = 160;
              roundRect(ctx, 430, 184, holdW, 10, 4);
              ctx.fillStyle = Ink.body;
              ctx.fill();
              if (p.remaining > 0) {
                ctx.fillStyle = Ink.electron;
                ctx.fillRect(430, 184, holdW * (p.remaining / HOLD), 10);
              }
              label(ctx, formatSec(p.remaining), 510, 210, { mono: true, size: 11 });

              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }, { x: 160, y: topY }, { x: 160, y: 96 }]);
              wire(ctx, [
                { x: 270, y: 216 },
                { x: 270, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);
              wire(ctx, [
                { x: 380, y: 146 },
                { x: 430, y: 146 },
              ]);
              wire(ctx, [
                { x: 520, y: 146 },
                { x: led.anode.x, y: 146 },
                led.anode,
              ]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: botY },
                { x: bat.neg.x, y: botY },
              ]);
              junction(ctx, bat.neg.x, botY);
              junction(ctx, led.anode.x, 146);

              const pwr: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                { x: 160, y: topY },
                { x: 160, y: 96 },
                { x: 270, y: 96 },
                { x: 270, y: 216 },
                { x: 270, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              flow.current.setPath(pwr, true);
              flow.current.set(6, -50);
              flow.current.step(dt);
              flow.current.draw(ctx);

              if (p.outHigh) {
                const oLoop: Pt[] = [
                  { x: 520, y: 146 },
                  { x: led.anode.x, y: 146 },
                  led.anode,
                  led.cathode,
                  { x: led.cathode.x, y: botY },
                  { x: bat.neg.x, y: botY },
                ];
                outFlow.current.setPath(oLoop, false);
                outFlow.current.set(12, -120);
                outFlow.current.step(dt);
                outFlow.current.draw(ctx);
              }

              label(ctx, "dΦ/dt", 400, 392, { mono: true, size: 13, color: Ink.text });
            });
          }}
        />
      }
    />
  );
}
