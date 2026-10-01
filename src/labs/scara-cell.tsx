import { useCallback, useEffect, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { FactoryShell } from "@/components/factory-shell";
import { useFactoryHotkeys } from "@/hooks/use-factory-hotkeys";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import { createScaraSim, type ScaraSnapshot } from "@/labs/factory/scara-sim";
import { ScaraViewport } from "@/labs/factory/scara-viewport";

const SPEED_MIN = 0.3;
const SPEED_MAX = 2;
const SPEED_STEP = 0.05;

const empty = (): ScaraSnapshot => ({
  theta1: 20,
  theta2: 50,
  z: 0.15,
  wrist: 0,
  phase: "idle",
  gripped: false,
  cycles: 0,
  tip: { x: 0.4, y: 0.2 },
});

export function ScaraCellLab() {
  const lab = LAB_BY_SLUG["scara-cell"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const simRef = useRef<ReturnType<typeof createScaraSim> | null>(null);
  if (!simRef.current) simRef.current = createScaraSim();
  const sim = simRef.current;

  const [running, setRunning] = useState(false);
  const [eStop, setEStop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [snap, setSnap] = useState<ScaraSnapshot>(empty);
  const [fitToken, setFitToken] = useState(0);

  useEffect(() => {
    sim.setControls({ running, eStop, speed });
  }, [sim, running, eStop, speed]);

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

  const onStart = useCallback(() => setRunning(true), []);
  const onStop = useCallback(() => setRunning(false), []);
  const onEStop = useCallback(() => {
    setEStop(true);
    setRunning(false);
  }, []);
  const onClearEStop = useCallback(() => setEStop(false), []);
  const onFit = useCallback(() => setFitToken((n) => n + 1), []);
  const onReset = useCallback(() => {
    sim.reset();
    setSnap(empty());
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

  return (
    <FactoryShell
      lab={lab}
      showHotkeys
      viewport={
        <ScaraViewport snap={snap} eStop={eStop} fitToken={fitToken} L1={sim.L1} L2={sim.L2} />
      }
      meters={
        <>
          <Meter label="State" value={eStop ? "ESTOP" : running ? "RUN" : "STOP"} />
          <Meter label="Phase" value={snap.phase} />
          <Meter label="Cycles" value={String(snap.cycles)} />
          <Meter
            label="Joints"
            value={`${snap.theta1.toFixed(0)}, ${snap.theta2.toFixed(0)} deg`}
          />
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
              className="rounded-lg bg-raised px-3 py-2 text-xs font-semibold"
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
            label="Cycle speed"
            value={speed}
            display={`${speed.toFixed(2)} x`}
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            onChange={setSpeed}
            disabled={eStop}
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
              Reset cell
            </button>
          </div>
        </>
      }
      insight={
        <>
          <p>
            SCARA picks from the feeder and places into the tray. Horizontal joints cover the plane;
            Z and wrist finish the pose.
          </p>
          <p className="text-xs text-subtle">Orbit, zoom, pan. Fit view frames the cell.</p>
        </>
      }
    />
  );
}
