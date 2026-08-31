import { useEffect, useRef, type ReactNode } from "react";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import type { LabMeta } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import { clearSim, graphPaper, Ink, label, withFrame } from "@/lib/sim/draw";
import { decodeLine, drawFields, drawTiming } from "@/lib/sim/protocol-draw";
import { laneValue, type Trace } from "@/lib/sim/protocol";

export function ProtocolBench({
  lab,
  meters,
  controls,
  insight,
  trace,
  playing,
  bitHz,
  drawScene,
}: {
  lab: LabMeta;
  meters: ReactNode;
  controls: ReactNode;
  insight: ReactNode;
  trace: Trace;
  playing: boolean;
  bitHz: number;
  drawScene: (ctx: CanvasRenderingContext2D, cursor: number, level: Record<string, number>) => void;
}) {
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);
  const cursor = useRef(0);
  const traceRef = useRef(trace);
  const playRef = useRef(playing);
  const hzRef = useRef(bitHz);
  traceRef.current = trace;
  playRef.current = playing;
  hzRef.current = bitHz;
  useEffect(() => {
    cursor.current = 0;
  }, [trace]);

  return (
    <LabShell
      lab={lab}
      meters={meters}
      controls={controls}
      insight={insight}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const tr = traceRef.current;
            const n = tr.lanes[0]?.samples.length ?? 1;
            if (playRef.current) cursor.current += dt * hzRef.current;
            if (cursor.current > n + 8) cursor.current = 0;
            const i = Math.floor(cursor.current);
            const level: Record<string, number> = {};
            for (const lane of tr.lanes) level[lane.name] = laneValue(tr, lane.name, i);

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              drawScene(ctx, i, level);
              drawTiming(ctx, 24, 210, 752, 148, tr, i);
              drawFields(ctx, 76, 362, 680, tr.fields, i);
              label(ctx, decodeLine(tr, i), 400, 396, { size: 12, color: Ink.text, mono: true });
            });
          }}
        />
      }
    />
  );
}
