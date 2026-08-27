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
  graphPaper,
  Ink,
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
      return `One-shot. A falling edge on TRIG sets the latch; the capacitor charges through RA until ⅔ VCC, then the discharge transistor dumps it. Pulse width = 1.1 · RA · C = ${formatSec(tMono)}.`;
    }
    if (duty > 0.7) {
      return `Astable, but RA is large compared with RB so the high time dominates (${Math.round(duty * 100)}% duty). Frequency is ${formatHz(fAstable)} — TH = ${formatSec(th)}, TL = ${formatSec(tl)}.`;
    }
    return `Astable heartbeat. The capacitor hunts between ⅓ and ⅔ of VCC. Charge through RA+RB, discharge through RB. f = 1.44 / ((RA + 2 RB) C) = ${formatHz(fAstable)}.`;
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
            <Control label="Trigger" hint="Pulls pin 2 below ⅓ VCC for a moment.">
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
              label(ctx, p.mode === "astable" ? "astable oscillator" : "monostable pulse", 400, 20, {
                size: 13,
                color: Ink.text,
              });

              battery(ctx, 50, 120);
              label(ctx, formatVolt(VCC), 50, 172, { mono: true, size: 11 });

              resistorBody(ctx, 100, 70, 80, p.ra, s.high ? 0.14 : 0.04);
              label(ctx, "RA", 140, 46, { size: 11 });

              if (p.mode === "astable") {
                resistorBody(ctx, 100, 148, 80, p.rb, s.high ? 0.04 : 0.18);
                label(ctx, "RB", 140, 124, { size: 11 });
              }

              capPlates(ctx, 140, 220, s.vc / VCC);
              label(ctx, formatFarad(p.c), 140, 268, { mono: true, size: 10 });
              label(ctx, p.run ? (s.high ? "charging" : "discharging") : "idle", 140, 286, {
                size: 11,
                color: Ink.electron,
              });

              dipPackage(ctx, 400, 130, 8, ["", "", "OUT", "", "", "", "DIS", "VCC"], {
                3: out,
                7: s.high ? 0 : 1,
                8: 1,
                2: p.mode === "monostable" && s.trigger > 0 ? 1 : 0,
              });
              label(ctx, "555", 400, 130, { size: 18, color: Ink.text, mono: true });

              wire(ctx, [
                { x: 70, y: 120 },
                { x: 70, y: 70 },
                { x: 100, y: 70 },
              ]);
              wire(ctx, [
                { x: 190, y: 70 },
                { x: 250, y: 70 },
                { x: 250, y: 90 },
                { x: 322, y: 90 },
              ]);
              wire(ctx, [
                { x: 140, y: 204 },
                { x: 140, y: 184 },
                { x: 190, y: 184 },
                { x: 190, y: p.mode === "astable" ? 148 : 70 },
              ]);
              wire(ctx, [
                { x: 140, y: 236 },
                { x: 140, y: 312 },
                { x: 50, y: 312 },
                { x: 50, y: 148 },
              ]);

              ledDome(ctx, 660, 86, Ink.electron, out);
              label(ctx, out ? "OUT  HIGH" : "OUT  LOW", 660, 146, {
                size: 11,
                color: out ? Ink.electron : Ink.muted,
              });
              wire(ctx, [
                { x: 434, y: 184 },
                { x: 434, y: 200 },
                { x: 660, y: 200 },
                { x: 660, y: 118 },
              ]);

              const path: Pt[] = [
                { x: 190, y: 70 },
                { x: 140, y: 70 },
                { x: 140, y: 204 },
              ];
              flow.current.setPath(path, false);
              flow.current.set(p.run ? 12 : 0, s.high ? -80 : 80);
              flow.current.step(dt);
              flow.current.draw(ctx);

              scope(ctx, 280, 300, 220, 100, vcSamples.current, Ink.electron, "Vc  1/3-2/3 VCC");
              scope(ctx, 520, 300, 250, 100, outSamples.current, Ink.pin, "OUT  pin 3");
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
