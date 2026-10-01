import { useCallback, useEffect, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { FactoryShell } from "@/components/factory-shell";
import { useFactoryHotkeys } from "@/hooks/use-factory-hotkeys";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import { createAgvSim, type AgvSnapshot } from "@/labs/factory/agv-sim";
import { AgvViewport } from "@/labs/factory/agv-viewport";

const SPEED_MIN = 0.25;
const SPEED_MAX = 1.4;
const SPEED_STEP = 0.05;

const empty = (): AgvSnapshot => ({
  x: -2.5,
  z: 0,
  yaw: 0,
  station: 0,
  dwell: 0,
  warning: false,
  moving: false,
  laps: 0,
});

export function AgvLineLab() {
  const lab = LAB_BY_SLUG["agv-line"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const simRef = useRef<ReturnType<typeof createAgvSim> | null>(null);
  if (!simRef.current) simRef.current = createAgvSim();
  const sim = simRef.current;

  const [running, setRunning] = useState(false);
  const [eStop, setEStop] = useState(false);
  const [speed, setSpeed] = useState(0.7);
  const [snap, setSnap] = useState<AgvSnapshot>(empty);
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

  const onStart = useCallback(() => {
    if (eStop) return;
    setRunning(true);
    sim.setControls({ running: true, eStop: false, speed });
  }, [eStop, sim, speed]);
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
        <AgvViewport snap={snap} eStop={eStop} fitToken={fitToken} waypoints={sim.waypoints} />
      }
      meters={
        <>
          <Meter
            label="State"
            value={eStop ? "ESTOP" : snap.moving ? "MOVE" : running ? "DWELL" : "STOP"}
          />
          <Meter label="Laps" value={String(snap.laps)} />
          <Meter label="Station" value={String(snap.station)} />
          <Meter label="Lights" value={eStop ? "red" : snap.warning ? "amber" : "green"} />
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
            label="Cruise speed"
            value={speed}
            display={`${speed.toFixed(2)} m/s`}
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
              Reset route
            </button>
          </div>
        </>
      }
      insight={
        <>
          <p>
            Differential-drive AGV follows the floor path and dwells at marked stations. Amber while
            moving or dwelling; red on E-stop.
          </p>
          <p className="text-xs text-subtle">Orbit, zoom, pan. Fit view frames the route.</p>
        </>
      }
    />
  );
}
