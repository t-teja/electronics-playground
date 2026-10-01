import { useCallback, useEffect, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { FactoryShell } from "@/components/factory-shell";
import { useFactoryHotkeys } from "@/hooks/use-factory-hotkeys";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import { createSorterSim, type SorterSnapshot } from "@/labs/factory/sorter-sim";
import { SorterViewport } from "@/labs/factory/sorter-viewport";

const SPEED_MIN = 0.15;
const SPEED_MAX = 0.9;
const SPEED_STEP = 0.05;

const empty = (): SorterSnapshot => ({
  parts: [],
  counts: { red: 0, blue: 0, amber: 0 },
  photoeye: false,
  classified: 0,
});

export function ColorSorterLab() {
  const lab = LAB_BY_SLUG["color-sorter"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const simRef = useRef<ReturnType<typeof createSorterSim> | null>(null);
  if (!simRef.current) simRef.current = createSorterSim();
  const sim = simRef.current;

  const [running, setRunning] = useState(false);
  const [eStop, setEStop] = useState(false);
  const [speed, setSpeed] = useState(0.45);
  const [snap, setSnap] = useState<SorterSnapshot>(empty);
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
    setSnap(sim.step(0));
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
      viewport={<SorterViewport snap={snap} eStop={eStop} fitToken={fitToken} />}
      meters={
        <>
          <Meter label="State" value={eStop ? "ESTOP" : running ? "RUN" : "STOP"} />
          <Meter label="Gate" value={snap.photoeye ? "HIT" : "clear"} />
          <Meter label="Sorted" value={String(snap.classified)} />
          <Meter
            label="R/B/A"
            value={`${snap.counts.red}/${snap.counts.blue}/${snap.counts.amber}`}
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
            label="Belt speed"
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
              Reset sorter
            </button>
          </div>
        </>
      }
      insight={
        <>
          <p>
            Vision gate classifies color; divert lanes send red, blue, and amber parts out. Size
            scales the part mesh.
          </p>
          <p className="text-xs text-subtle">Orbit, zoom, pan. Fit view frames the sorter.</p>
        </>
      }
    />
  );
}
