import { useEffect, useRef, useState } from "react";
import { LinearControl, Meter } from "@/components/control";
import { FactoryShell } from "@/components/factory-shell";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import { createSorterSim, type SorterSnapshot } from "@/labs/factory/sorter-sim";
import { SorterViewport } from "@/labs/factory/sorter-viewport";

const empty = (): SorterSnapshot => ({
  parts: [],
  counts: { red: 0, blue: 0, amber: 0 },
  photoeye: false,
  classified: 0,
});

export function SorterLab() {
  const lab = LAB_BY_SLUG["sorter"]!;
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

  return (
    <FactoryShell
      lab={lab}
      viewport={<SorterViewport snap={snap} eStop={eStop} fitToken={fitToken} />}
      meters={
        <>
          <Meter label="State" value={eStop ? "E-STOP" : running ? "RUN" : "STOP"} />
          <Meter label="Sorted" value={String(snap.classified)} />
          <Meter label="Red" value={String(snap.counts.red)} />
          <Meter label="Blue" value={String(snap.counts.blue)} />
          <Meter label="Amber" value={String(snap.counts.amber)} />
          <Meter label="Gate" value={snap.photoeye ? "DETECT" : "clear"} />
        </>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-electron/20 px-3 py-2 text-xs font-semibold text-electron disabled:opacity-40"
              disabled={eStop || running}
              onClick={() => setRunning(true)}
            >
              Start
            </button>
            <button
              type="button"
              className="rounded-lg bg-raised px-3 py-2 text-xs font-semibold"
              disabled={!running}
              onClick={() => setRunning(false)}
            >
              Stop
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-400"
              onClick={() => {
                setEStop(true);
                setRunning(false);
              }}
            >
              E-stop
            </button>
            {eStop ? (
              <button
                type="button"
                className="rounded-lg bg-raised px-3 py-2 text-xs font-semibold"
                onClick={() => setEStop(false)}
              >
                Reset E-stop
              </button>
            ) : null}
          </div>
          <LinearControl
            label="Belt speed"
            value={speed}
            display={`${speed.toFixed(2)} m/s`}
            min={0.15}
            max={0.9}
            step={0.05}
            onChange={setSpeed}
            disabled={eStop}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-raised px-3 py-1.5 text-xs font-medium"
              onClick={() => setFitToken((n) => n + 1)}
            >
              Fit view
            </button>
            <button
              type="button"
              className="rounded-lg bg-raised px-3 py-1.5 text-xs font-medium"
              onClick={() => {
                sim.reset();
                setSnap(empty());
                setRunning(false);
                setEStop(false);
                setFitToken((n) => n + 1);
              }}
            >
              Reset sorter
            </button>
          </div>
        </>
      }
      insight={
        <>
          <p>Vision gate classifies color; divert lanes send red, blue, and amber parts out. Size scales the part mesh.</p>
          <p className="text-xs text-subtle">Orbit, zoom, pan. Fit view frames the sorter.</p>
        </>
      }
    />
  );
}
