import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { FactoryShell } from "@/components/factory-shell";
import { useFactoryHotkeys } from "@/hooks/use-factory-hotkeys";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import { createBottlingSim, type BottlingSnapshot } from "@/labs/factory/bottling-sim";
import { BottlingViewport } from "@/labs/factory/bottling-viewport";

const SPEED_MIN = 0.12;
const SPEED_MAX = 0.85;
const SPEED_STEP = 0.01;

const emptySnap = (): BottlingSnapshot => ({
  bottles: [],
  photoeyes: {
    infeed: false,
    fill: false,
    cap: false,
    label: false,
    reject: false,
    outfeed: false,
  },
  produced: 0,
  rejected: 0,
  fillingId: null,
});

export function BottlingLineLab() {
  const lab = LAB_BY_SLUG["bottling-line"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const simRef = useRef<ReturnType<typeof createBottlingSim> | null>(null);
  if (!simRef.current) simRef.current = createBottlingSim();
  const sim = simRef.current;

  const [running, setRunning] = useState(false);
  const [eStop, setEStop] = useState(false);
  const [speed, setSpeed] = useState(0.35);
  const [fillSetpoint, setFillSetpoint] = useState(0.92);
  const [snap, setSnap] = useState<BottlingSnapshot>(emptySnap);
  const [fitToken, setFitToken] = useState(0);

  useEffect(() => {
    sim.setControls({ running, eStop, speed, fillSetpoint });
  }, [sim, running, eStop, speed, fillSetpoint]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      setSnap(sim.step(dt));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sim]);

  const onStart = useCallback(() => {
    if (eStop) return;
    setRunning(true);
    sim.setControls({ running: true, eStop: false, speed, fillSetpoint });
  }, [eStop, sim, speed, fillSetpoint]);
  const onStop = useCallback(() => setRunning(false), []);
  const onEStop = useCallback(() => {
    setEStop(true);
    setRunning(false);
  }, []);
  const onClearEStop = useCallback(() => setEStop(false), []);
  const onFit = useCallback(() => setFitToken((n) => n + 1), []);
  const onReset = useCallback(() => {
    sim.reset();
    setSnap(emptySnap());
    setRunning(false);
    setEStop(false);
    setFitToken((n) => n + 1);
  }, [sim]);

  useFactoryHotkeys({
    running,
    eStop,
    onStart,
    onStop,
    onEStop,
    onClearEStop,
    speed,
    setSpeed,
    speedMin: SPEED_MIN,
    speedMax: SPEED_MAX,
    speedStep: SPEED_STEP,
    onFit,
    onReset,
  });

  const eyeList = useMemo(() => {
    const e = snap.photoeyes;
    const short: Record<keyof typeof e, string> = {
      infeed: "in",
      fill: "fill",
      cap: "cap",
      label: "lbl",
      reject: "rej",
      outfeed: "out",
    };
    const on = (Object.keys(e) as (keyof typeof e)[]).filter((k) => e[k]).map((k) => short[k]);
    return on.length ? on.join("+") : "clear";
  }, [snap.photoeyes]);

  return (
    <FactoryShell
      lab={lab}
      showHotkeys
      viewport={<BottlingViewport snap={snap} eStop={eStop} fitToken={fitToken} />}
      meters={
        <>
          <Meter label="State" value={eStop ? "ESTOP" : running ? "RUN" : "STOP"} />
          <Meter label="Out" value={String(snap.produced)} />
          <Meter label="Reject" value={String(snap.rejected)} />
          <Meter label="Line" value={String(snap.bottles.length)} />
          <Meter label="Eyes" value={eyeList} />
        </>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-electron/20 px-3 py-2 text-xs font-semibold text-electron disabled:opacity-40"
              disabled={eStop || running}
              onClick={onStart}
            >
              Start
            </button>
            <button
              type="button"
              className="rounded-lg bg-raised px-3 py-2 text-xs font-semibold text-fg"
              disabled={!running}
              onClick={onStop}
            >
              Stop
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-400"
              onClick={onEStop}
            >
              E-stop
            </button>
            {eStop ? (
              <button
                type="button"
                className="rounded-lg bg-raised px-3 py-2 text-xs font-semibold"
                onClick={onClearEStop}
              >
                Reset E-stop
              </button>
            ) : null}
          </div>
          <LinearControl
            label="Conveyor speed"
            value={speed}
            display={`${speed.toFixed(2)} m/s`}
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            onChange={setSpeed}
            disabled={eStop}
          />
          <LinearControl
            label="Fill setpoint"
            value={fillSetpoint}
            display={`${(fillSetpoint * 100).toFixed(0)} %`}
            min={0.55}
            max={1}
            step={0.01}
            onChange={setFillSetpoint}
            disabled={eStop}
            hint="Bottles under setpoint minus 6% divert to reject."
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-raised px-3 py-1.5 text-xs font-medium"
              onClick={onFit}
            >
              Fit view
            </button>
            <button
              type="button"
              className="rounded-lg bg-raised px-3 py-1.5 text-xs font-medium"
              onClick={onReset}
            >
              Reset line
            </button>
          </div>
        </>
      }
      insight={
        <>
          <p>
            Infeed to fill, cap, label, then reject or outfeed. Photoeyes light when a bottle
            breaks the beam.
          </p>
          <p className="text-xs text-subtle">
            Orbit drag, scroll zoom, right-drag or two-finger pan. Fit view frames the whole line.
          </p>
        </>
      }
    />
  );
}
