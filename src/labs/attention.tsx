import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, Meter, Segmented } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { dot, softmax } from "@/lib/nn";
import { useProgress } from "@/lib/progress";
import { clearSim, graphPaper, Ink, label, roundRect, withFrame } from "@/lib/sim/draw";

const LIT = "#5eead4";

const TOKENS = [
  { id: "the", word: "the", k: [1, 0] as [number, number], tint: "#94a3b8" },
  { id: "cat", word: "cat", k: [0.15, 1] as [number, number], tint: LIT },
  { id: "sat", word: "sat", k: [-1, 0.15] as [number, number], tint: "#fbbf24" },
  { id: "mat", word: "mat", k: [0.25, 0.95] as [number, number], tint: "#5eead4" },
] as const;

type Tok = (typeof TOKENS)[number]["id"];

export function AttentionLab() {
  const lab = LAB_BY_SLUG.attention!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [qid, setQid] = useState<Tok>("cat");
  const [temp, setTemp] = useState(1);

  const q = TOKENS.find((t) => t.id === qid)!;
  const scores = TOKENS.map((t) => dot(q.k, t.k) / Math.max(0.2, temp));
  const weights = softmax(scores);
  const mix = [0, 0];
  TOKENS.forEach((t, i) => {
    mix[0] += weights[i]! * t.k[0];
    mix[1] += weights[i]! * t.k[1];
  });
  const topI = weights.indexOf(Math.max(...weights));
  const top = TOKENS[topI]!;
  const params = useRef({ qid, temp, weights, mix, top: top.word });
  params.current = { qid, temp, weights, mix, top: top.word };

  const insight = useMemo(() => {
    const pct = Math.round((weights[topI] ?? 0) * 100);
    if (temp >= 2) {
      return `Temperature ${temp.toFixed(1)} flattens the mix. Query "${q.word}" still leans ${pct}% toward "${top.word}".`;
    }
    if (temp <= 0.4) {
      return `Low temperature sharpens the ask. Query "${q.word}" puts ${pct}% on "${top.word}".`;
    }
    return `Query "${q.word}" attends mostly to "${top.word}" (${pct}%). Nearby words share the rest.`;
  }, [q.word, temp, top.word, topI, weights]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          {TOKENS.map((t, i) => (
            <Meter key={t.id} label={t.word} value={`${Math.round((weights[i] ?? 0) * 100)}%`} />
          ))}
        </>
      }
      controls={
        <>
          <Control label="Query">
            <Segmented
              value={qid}
              onChange={setQid}
              options={TOKENS.map((t) => ({ id: t.id, label: t.word }))}
            />
          </Control>
          <LinearControl
            label="Temperature"
            value={temp}
            display={temp.toFixed(1)}
            min={0.2}
            max={3}
            step={0.05}
            onChange={setTemp}
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size) => {
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const ys = [70, 150, 230, 310];
              const kx = 430;
              const qx = 140;
              const qy = 190;

              roundRect(ctx, qx - 54, qy - 28, 108, 56, 10);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = LIT;
              ctx.lineWidth = 2;
              ctx.stroke();
              label(ctx, "query", qx, qy - 8, { size: 10, color: Ink.muted });
              label(ctx, p.qid, qx, qy + 12, { size: 16, color: Ink.text });

              TOKENS.forEach((t, i) => {
                const yy = ys[i]!;
                const w = p.weights[i] ?? 0;
                ctx.beginPath();
                ctx.moveTo(qx + 54, qy);
                ctx.lineTo(kx - 70, yy);
                ctx.strokeStyle = t.tint;
                ctx.globalAlpha = 0.15 + w * 0.85;
                ctx.lineWidth = 1.5 + w * 14;
                ctx.stroke();
                ctx.globalAlpha = 1;

                roundRect(ctx, kx - 70, yy - 24, 140, 48, 10);
                ctx.fillStyle = Ink.package;
                ctx.fill();
                ctx.strokeStyle = t.id === p.qid ? LIT : "rgba(128,128,128,0.28)";
                ctx.lineWidth = t.id === p.qid ? 2 : 1.2;
                ctx.stroke();
                label(ctx, t.word, kx, yy, { size: 16, color: Ink.text });

                const barX = 620;
                const barW = 140 * w;
                roundRect(ctx, barX, yy - 10, 140, 20, 6);
                ctx.fillStyle = Ink.body;
                ctx.fill();
                if (barW > 2) {
                  roundRect(ctx, barX, yy - 10, barW, 20, 6);
                  ctx.fillStyle = LIT;
                  ctx.globalAlpha = 0.35 + w * 0.65;
                  ctx.fill();
                  ctx.globalAlpha = 1;
                }
                label(ctx, `${Math.round(w * 100)}%`, barX + 150, yy, {
                  size: 12,
                  mono: true,
                  align: "left",
                  color: Ink.text,
                });
              });

              label(ctx, "keys", kx, 32, { size: 12, color: Ink.muted });
              label(ctx, "a = softmax(q · k / T)", 400, 392, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
              label(ctx, `mix → ${p.top}`, qx, qy + 56, { size: 12, color: LIT });
            });
          }}
        />
      }
    />
  );
}
