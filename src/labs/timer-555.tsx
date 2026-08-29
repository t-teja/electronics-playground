import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LogControl, Meter, Segmented, ToggleControl } from "@/components/control";
import { Button } from "@/components/ui/button";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatFarad, formatHz, formatOhm, formatSec, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  capPlates,
  clearSim,
  dipPackage,
  gnd,
  graphPaper,
  Ink,
  junction,
  label,
  ledDome,
  resistorBody,
  scope,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const VCC = 5;
const LO = VCC / 3;
const HI = (2 * VCC) / 3;

type Mode = "astable" | "monostable";

export function Timer555Lab() {
  const lab = LAB_BY_SLUG["timer-555"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [mode, setMode] = useState<Mode>("astable");
  const [ra, setRa] = useState(2200);
  const [rb, setRb] = useState(4700);
  const [c, setC] = useState(47e-6);
  const [run, setRun] = useState(true);

  const sim = useRef({ vc: LO + 0.1, high: true, trigger: 0 });
  const [read, setRead] = useState({ vc: LO, out: 1, f: 0 });
  const vcSamples = useRef<number[]>(Array(140).fill(LO / VCC));
  const outSamples = useRef<number[]>(Array(140).fill(1));
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);
  const params = useRef({ mode, ra, rb, c, run });
  params.current = { mode, ra, rb, c, run };

  const th = 0.693 * (ra + rb) * c;
  const tl = 0.693 * rb * c;
  const fAstable = 1.44 / ((ra + 2 * rb) * c);
  const tMono = 1.1 * ra * c;
  const duty = (ra + rb) / (ra + 2 * rb);

  const insight = useMemo(() => {
    if (mode === "monostable") {
      return `One-shot. A falling edge on TRIG sets the latch; the capacitor charges through RA until \u2154 VCC, then the discharge transistor dumps it. Pulse width = 1.1 \u00b7 RA \u00b7 C = ${formatSec(tMono)}.`;
    }
    if (duty > 0.7) {
      return `Astable, but RA is large compared with RB so the high time dominates (${Math.round(duty * 100)}% duty). Frequency is ${formatHz(fAstable)} \u2014 TH = ${formatSec(th)}, TL = ${formatSec(tl)}.`;
    }
    return `Astable heartbeat. The capacitor hunts between \u2153 and \u2154 of VCC. Charge through RA+RB, discharge through RB. f = 1.44 / ((RA + 2 RB) C) = ${formatHz(fAstable)}.`;
  }, [mode, duty, fAstable, th, tl, tMono]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Output" value={read.out ? "HIGH" : "LOW"} />
          <Meter label="Vc" value={formatVolt(read.vc)} />
          <Meter
            label={mode === "astable" ? "Frequency" : "Pulse width"}
            value={mode === "astable" ? formatHz(fAstable) : formatSec(tMono)}
          />
        </>
      }
      controls={
        <>
          <Control label="Mode">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { id: "astable", label: "Astable" },
                { id: "monostable", label: "Monostable" },
              ]}
            />
          </Control>
          <ToggleControl label="Power" checked={run} on="on" off="off" onCheckedChange={setRun} />
          {mode === "monostable" ? (
            <Control label="Trigger" hint="Pulls pin 2 below \u2153 VCC for a moment.">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  sim.current.trigger = 0.08;
                }}
              >
                Pulse TRIG
              </Button>
            </Control>
          ) : null}
          <LogControl
            label="RA"
            value={ra}
            display={formatOhm(ra)}
            min={470}
            max={100000}
            onChange={setRa}
            hint={mode === "astable" ? "Charge path is RA + RB." : "Sets the one-shot width."}
          />
          {mode === "astable" ? (
            <LogControl
              label="RB"
              value={rb}
              display={formatOhm(rb)}
              min={470}
              max={100000}
              onChange={setRb}
              hint="Discharge path is RB only."
            />
          ) : null}
          <LogControl
            label="Timing capacitor"
            value={c}
            display={formatFarad(c)}
            min={1e-6}
            max={2.2e-4}
            onChange={setC}
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            const s = sim.current;
            if (!p.run) {
              s.high = false;
              s.vc = 0;
            } else if (p.mode === "astable") {
              if (s.high) {
                const i = (VCC - s.vc) / (p.ra + p.rb);
                s.vc += (i / p.c) * dt;
                if (s.vc >= HI) {
                  s.vc = HI;
                  s.high = false;
                }
              } else {
                const i = s.vc / p.rb;
                s.vc -= (i / p.c) * dt;
                if (s.vc <= LO) {
                  s.vc = LO;
                  s.high = true;
                }
              }
            } else {
              s.trigger = Math.max(0, s.trigger - dt);
              if (s.trigger > 0 && !s.high) {
                s.high = true;
              }
              if (s.high) {
                const i = (VCC - s.vc) / p.ra;
                s.vc += (i / p.c) * dt;
                if (s.vc >= HI) {
                  s.vc = HI;
                  s.high = false;
                }
              } else {
                s.vc = Math.max(0, s.vc - (s.vc / (p.ra * 0.05) + 8) * dt);
              }
            }

            const out = s.high ? 1 : 0;
            vcSamples.current.push(clamp(s.vc / VCC, 0, 1));
            outSamples.current.push(out);
            if (vcSamples.current.length > 160) vcSamples.current.shift();
            if (outSamples.current.length > 160) outSamples.current.shift();

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              label(ctx, p.mode === "astable" ? "astable oscillator" : "monostable pulse", 400, 14, {
                size: 13,
                color: Ink.text,
              });

              const bat = battery(ctx, 48, 160);
              label(ctx, formatVolt(VCC), 48, 212, { mono: true, size: 11 });

              const chipX = 455;
              const chipY = 148;
              const dip = dipPackage(ctx, chipX, chipY, 8, ["GND", "TRIG", "OUT", "RESET", "CONT", "THR", "DIS", "VCC"], {
                3: out,
                7: s.high ? 0 : 1,
                8: p.run ? 1 : 0,
                4: p.run ? 1 : 0,
                2: p.mode === "monostable" && s.trigger > 0 ? 1 : 0,
                1: 1,
              });
              label(ctx, "555", chipX, chipY, { size: 18, color: Ink.text, mono: true });

              const pinX = (i: number) => dip.left + 28 + i * dip.pinW;
              const botY = dip.top + dip.bodyH + 14;
              const topY = dip.top - 14;
              const P = {
                1: { x: pinX(0), y: botY },
                2: { x: pinX(1), y: botY },
                3: { x: pinX(2), y: botY },
                4: { x: pinX(3), y: botY },
                5: { x: pinX(3), y: topY },
                6: { x: pinX(2), y: topY },
                7: { x: pinX(1), y: topY },
                8: { x: pinX(0), y: topY },
              };

              const vccY = 40;
              const gndY = 280;
              const rightBus = dip.left + dip.bodyW + 20;

              // Pin 8 VCC: left along the pin row (does not drop across other top pins)
              wire(ctx, [
                bat.pos,
                { x: bat.pos.x, y: vccY },
                { x: 64, y: vccY },
              ]);
              wire(ctx, [P[8], { x: 64, y: topY }, { x: 64, y: vccY }]);
              junction(ctx, 64, vccY);

              // Pin 4 RESET to VCC, around the right of the package
              wire(ctx, [
                P[4],
                { x: rightBus, y: botY },
                { x: rightBus, y: vccY },
                { x: 64, y: vccY },
              ]);
              junction(ctx, rightBus, vccY);

              // RA from VCC to pin 7 DIS
              resistorBody(ctx, 90, 62, 80, p.ra, s.high ? 0.14 : 0.04);
              label(ctx, "RA", 130, 42, { size: 11 });
              wire(ctx, [
                { x: 90, y: vccY },
                { x: 90, y: 62 },
              ]);
              const disNode = { x: 190, y: 62 };
              wire(ctx, [disNode, { x: P[7].x, y: 62 }, P[7]]);
              junction(ctx, disNode.x, disNode.y);

              const tie = { x: 190, y: 168 };
              if (p.mode === "astable") {
                resistorBody(ctx, 90, 114, 80, p.rb, s.high ? 0.04 : 0.18);
                label(ctx, "RB", 130, 94, { size: 11 });
                wire(ctx, [disNode, { x: 190, y: 114 }]);
                wire(ctx, [
                  { x: 90, y: 114 },
                  { x: 90, y: 168 },
                  tie,
                ]);
              } else {
                wire(ctx, [disNode, tie]);
              }
              junction(ctx, tie.x, tie.y);

              // Pin 6 THR: approach from above the pin row so we do not scrape pin 7
              wire(ctx, [
                tie,
                { x: 250, y: 168 },
                { x: 250, y: 50 },
                { x: P[6].x, y: 50 },
                P[6],
              ]);
              // Pin 2 TRIG: below the package, then up onto the pin
              wire(ctx, [
                tie,
                { x: 190, y: botY + 16 },
                { x: P[2].x, y: botY + 16 },
                P[2],
              ]);

              capPlates(ctx, 140, 222, s.vc / VCC);
              label(ctx, formatFarad(p.c), 86, 222, { mono: true, size: 10, align: "right" });
              label(ctx, p.run ? (s.high ? "charging" : "discharging") : "idle", 140, 256, {
                size: 11,
                color: Ink.electron,
              });
              wire(ctx, [
                { x: 140, y: 206 },
                { x: 140, y: 168 },
                tie,
              ]);
              wire(ctx, [
                { x: 140, y: 238 },
                { x: 140, y: gndY },
              ]);
              junction(ctx, 140, gndY);

              // Pin 1 GND: left first so the TRIG run below the pins does not hit it
              wire(ctx, [P[1], { x: 64, y: botY }, { x: 64, y: gndY }]);
              wire(ctx, [
                bat.neg,
                { x: bat.neg.x, y: gndY },
                { x: 64, y: gndY },
                { x: 140, y: gndY },
              ]);
              gnd(ctx, 100, gndY);
              junction(ctx, 64, gndY);

              const led = ledDome(ctx, 680, 64, Ink.electron, out);
              label(ctx, out ? "OUT  HIGH" : "OUT  LOW", 680, 128, {
                size: 11,
                color: out ? Ink.electron : Ink.muted,
              });
              wire(ctx, [
                P[3],
                { x: 620, y: botY },
                { x: 620, y: led.anode.y },
                led.anode,
              ]);
              wire(ctx, [
                led.cathode,
                { x: led.cathode.x, y: gndY },
                { x: 140, y: gndY },
              ]);

              const path: Pt[] = [disNode, tie, { x: 140, y: 206 }];
              flow.current.setPath(path, false);
              flow.current.set(p.run ? 12 : 0, s.high ? -80 : 80);
              flow.current.step(dt);
              flow.current.draw(ctx);

              scope(ctx, 280, 308, 220, 96, vcSamples.current, Ink.electron, "Vc  1/3-2/3 VCC");
              scope(ctx, 520, 308, 250, 96, outSamples.current, Ink.pin, "OUT  pin 3");
            });

            ui.current += dt;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead((prev) => {
                if (Math.abs(prev.vc - s.vc) < 0.02 && prev.out === out) return prev;
                return { vc: s.vc, out, f: fAstable };
              });
            }
          }}
        />
      }
    />
  );
}
