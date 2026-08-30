import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Control, LinearControl, Meter, Segmented, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatHz } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  clearSim,
  graphPaper,
  Ink,
  junction,
  label,
  roundRect,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const W = 8;
const H = 8;
const PIX = W * H;

type Cores = "1" | "4" | "8";
type Job = "fill" | "gradient";

function nCores(c: Cores) {
  return c === "8" ? 8 : c === "4" ? 4 : 1;
}

function pixelTarget(i: number, job: Job) {
  if (job === "fill") return 1;
  const x = i % W;
  const y = Math.floor(i / W);
  return (x + y) / (W + H - 2);
}

type Core = { id: number; next: number; end: number };

function makeCores(n: number): Core[] {
  const chunk = PIX / n;
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    next: i * chunk,
    end: (i + 1) * chunk,
  }));
}

export function GpuLab() {
  const lab = LAB_BY_SLUG.gpu!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [power, setPower] = useState(true);
  const [cores, setCores] = useState<Cores>("4");
  const [job, setJob] = useState<Job>("gradient");
  const [hz, setHz] = useState(8);
  const [painted, setPainted] = useState(0);
  const [clocks, setClocks] = useState(0);

  const fb = useRef(new Float32Array(PIX));
  const filled = useRef(new Uint8Array(PIX));
  const workers = useRef<Core[]>(makeCores(4));
  const cpu = useRef({ acc: 0, last: -1 });
  const flow = useRef(new ElectronFlow());
  const n = nCores(cores);

  const resetJob = () => {
    fb.current = new Float32Array(PIX);
    filled.current = new Uint8Array(PIX);
    workers.current = makeCores(nCores(cores));
    cpu.current.acc = 0;
    cpu.current.last = -1;
    setPainted(0);
    setClocks(0);
  };

  useEffect(() => {
    fb.current = new Float32Array(PIX);
    filled.current = new Uint8Array(PIX);
    workers.current = makeCores(nCores(cores));
    cpu.current.acc = 0;
    cpu.current.last = -1;
    setPainted(0);
    setClocks(0);
  }, [cores, job]);

  const params = useRef({ power, hz, job, n });
  params.current = { power, hz, job, n };

  const pps = power ? n * hz : 0;
  const done = painted >= PIX;

  const insight = useMemo(() => {
    if (!power) {
      return `POWER off. The framebuffer keeps the last picture (like video RAM), but the ALUs stop. GPUs win by doing the same math on many pixels at once, not by being a faster CPU.`;
    }
    if (done) {
      return `Job done in ${clocks} clocks. ${n} core${n === 1 ? "" : "s"} \u00d7 clocks \u2248 ${clocks * n} pixel-slots. A CPU painter (${n === 1 ? "this is one" : "one core"}) would need ${PIX} clocks for 64 pixels.`;
    }
    if (n === 1) {
      return `CPU painter: one pixel per clock. ${painted}/64. Same ALU, just walking the framebuffer. GPUs look slow per core and still win.`;
    }
    return `${n} cores claiming tiles. Each clock, every live ALU paints one pixel. pixels/s \u2248 cores \u00d7 clocks = ${n} \u00d7 ${hz} = ${pps}. ${painted}/64 filled.`;
  }, [power, done, clocks, n, painted, hz, pps]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="CORES" value={`${n}`} />
          <Meter label="px/s" value={`${pps}`} />
          <Meter label="PAINTED" value={`${painted} / ${PIX}`} />
        </>
      }
      controls={
        <>
          <ToggleControl label="POWER" checked={power} on="run" off="hold" onCheckedChange={setPower} />
          <Control label="Cores" hint="1 is a CPU painter. 4 and 8 split the 8\u00d78 into tiles.">
            <Segmented
              value={cores}
              onChange={(v) => setCores(v)}
              options={[
                { id: "1", label: "1" },
                { id: "4", label: "4" },
                { id: "8", label: "8" },
              ]}
            />
          </Control>
          <Control label="Job">
            <Segmented
              value={job}
              onChange={(v) => setJob(v)}
              options={[
                { id: "fill", label: "Fill" },
                { id: "gradient", label: "Gradient" },
              ]}
            />
          </Control>
          <LinearControl
            label="Clock"
            value={hz}
            display={formatHz(hz)}
            min={0}
            max={32}
            step={1}
            onChange={setHz}
          />
          <Button variant="secondary" onClick={resetJob}>
            Reset job
          </Button>
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">{"pixels/s \u2248 cores \u00b7 clocks"}</p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            const wrk = workers.current;
            if (p.power) {
              cpu.current.acc += dt * p.hz;
              let clocksAdd = 0;
              while (cpu.current.acc >= 1) {
                cpu.current.acc -= 1;
                let stepped = false;
                for (const core of wrk) {
                  if (core.next < core.end) {
                    const i = core.next;
                    fb.current[i] = pixelTarget(i, p.job);
                    filled.current[i] = 1;
                    core.next += 1;
                    cpu.current.last = i;
                    stepped = true;
                  }
                }
                if (stepped) clocksAdd += 1;
              }
              if (clocksAdd > 0) {
                let nPaint = 0;
                for (let i = 0; i < PIX; i++) nPaint += filled.current[i] ?? 0;
                setClocks((c) => c + clocksAdd);
                setPainted(nPaint);
              }
            }

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 56, 200);
              label(ctx, p.power ? "5 V" : "0 V", 56, 256, { mono: true, size: 11 });

              label(ctx, `${p.n} ALU${p.n === 1 ? "" : "s"}`, 200, 40, { size: 12, color: Ink.muted });
              for (let i = 0; i < p.n; i++) {
                const col = i % 4;
                const row = Math.floor(i / 4);
                const x = 120 + col * 54;
                const y = 58 + row * 54;
                const live = p.power;
                const worker = wrk[i];
                const busy = live && worker !== undefined && worker.next < worker.end;
                roundRect(ctx, x, y, 46, 46, 6);
                ctx.fillStyle = live ? Ink.electron : Ink.body;
                ctx.globalAlpha = live ? (busy ? 0.35 + 0.2 * Math.sin(t * 10 + i) : 0.18) : 1;
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = live ? Ink.electron : "rgba(128,128,128,0.2)";
                ctx.stroke();
                label(ctx, `ALU${i}`, x + 23, y + 23, {
                  size: 10,
                  mono: true,
                  color: live ? Ink.text : Ink.faint,
                });
              }
              label(ctx, p.n === 1 ? "CPU painter" : `${p.n}-wide SIMD`, 226, 172, {
                size: 12,
                color: Ink.text,
              });

              const fx = 430;
              const fy = 48;
              const cell = 32;
              roundRect(ctx, fx - 12, fy - 28, W * cell + 24, H * cell + 48, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.22)";
              ctx.stroke();
              label(ctx, "framebuffer  8x8", fx + (W * cell) / 2, fy - 12, {
                size: 12,
                color: Ink.text,
                mono: true,
              });

              const tileH = H / p.n;
              for (let i = 0; i < PIX; i++) {
                const x = i % W;
                const y = Math.floor(i / W);
                const px = fx + x * cell;
                const py = fy + y * cell;
                const v = fb.current[i] ?? 0;
                const written = filled.current[i] === 1;
                roundRect(ctx, px + 2, py + 2, cell - 4, cell - 4, 3);
                if (written) {
                  ctx.fillStyle = Ink.electron;
                  ctx.globalAlpha = 0.2 + v * 0.75;
                  ctx.fill();
                  ctx.globalAlpha = 1;
                } else {
                  ctx.fillStyle = Ink.body;
                  ctx.fill();
                }
                const owner = Math.min(p.n - 1, Math.floor(y / tileH));
                ctx.strokeStyle = owner === 0 ? "rgba(45,212,191,0.25)" : "rgba(128,128,128,0.15)";
                ctx.stroke();
                if (cpu.current.last === i) {
                  ctx.strokeStyle = Ink.heat;
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  ctx.lineWidth = 1;
                }
              }

              if (p.n > 1) {
                ctx.strokeStyle = Ink.heat;
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = 1.2;
                for (let k = 1; k < p.n; k++) {
                  const yy = fy + k * tileH * cell;
                  ctx.beginPath();
                  ctx.moveTo(fx, yy);
                  ctx.lineTo(fx + W * cell, yy);
                  ctx.stroke();
                }
                ctx.globalAlpha = 1;
              }

              const topY = 24;
              const botY = 400;
              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }, { x: 226, y: topY }, { x: 226, y: 58 }]);
              wire(ctx, [
                { x: 226, y: 164 },
                { x: 226, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);
              junction(ctx, bat.pos.x, topY);
              junction(ctx, bat.neg.x, botY);

              const loop: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                { x: 226, y: topY },
                { x: 226, y: 58 },
                { x: 226, y: 164 },
                { x: 226, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              flow.current.setPath(loop, true);
              flow.current.set(p.power ? 12 : 0, -80);
              flow.current.step(dt);
              flow.current.draw(ctx);

              label(ctx, `pixels/s \u2248 ${p.n} x ${p.hz} = ${p.n * p.hz}`, 400, 408, {
                mono: true,
                size: 13,
                color: Ink.text,
              });
            });
          }}
        />
      }
    />
  );
}
