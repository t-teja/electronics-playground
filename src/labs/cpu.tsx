import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatHz } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  bitLed,
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

const MEM_N = 8;
const OP = { HLT: 0, LDA: 1, ADD: 2, STA: 3, JMP: 4 } as const;

function encode(op: number, addr: number) {
  return ((op & 0xf) << 4) | (addr & 0xf);
}

function opName(ir: number) {
  const k = ir >> 4;
  const a = ir & 0x7;
  if (k === OP.LDA) return `LDA ${a}`;
  if (k === OP.ADD) return `ADD ${a}`;
  if (k === OP.STA) return `STA ${a}`;
  if (k === OP.JMP) return `JMP ${a}`;
  return "HLT";
}

function defaultMem(): number[] {
  return [
    encode(OP.LDA, 5),
    encode(OP.ADD, 6),
    encode(OP.STA, 7),
    encode(OP.HLT, 0),
    0,
    3,
    5,
    0,
  ];
}

type Phase = 0 | 1 | 2;

type Cpu = {
  pc: number;
  a: number;
  ir: number;
  phase: Phase;
  halt: boolean;
  acc: number;
  bus: number;
};

function stepCpu(cpu: Cpu, mem: number[]) {
  if (cpu.halt) return;
  if (cpu.phase === 0) {
    cpu.ir = mem[cpu.pc & 7] ?? 0;
    cpu.bus = cpu.ir;
    cpu.phase = 1;
    return;
  }
  if (cpu.phase === 1) {
    cpu.phase = 2;
    return;
  }
  const k = cpu.ir >> 4;
  const arg = cpu.ir & 0x7;
  if (k === OP.LDA) {
    cpu.a = mem[arg] ?? 0;
    cpu.bus = cpu.a;
    cpu.pc = (cpu.pc + 1) & 7;
  } else if (k === OP.ADD) {
    const n = mem[arg] ?? 0;
    cpu.a = (cpu.a + n) & 0xff;
    cpu.bus = cpu.a;
    cpu.pc = (cpu.pc + 1) & 7;
  } else if (k === OP.STA) {
    mem[arg] = cpu.a;
    cpu.bus = cpu.a;
    cpu.pc = (cpu.pc + 1) & 7;
  } else if (k === OP.JMP) {
    cpu.pc = arg;
    cpu.bus = cpu.pc;
  } else {
    cpu.halt = true;
  }
  cpu.phase = 0;
}

export function CpuLab() {
  const lab = LAB_BY_SLUG.cpu!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [power, setPower] = useState(true);
  const [hz, setHz] = useState(4);
  const mem = useRef(defaultMem());
  const cpu = useRef<Cpu>({ pc: 0, a: 0, ir: 0, phase: 0, halt: false, acc: 0, bus: 0 });
  const [read, setRead] = useState({ pc: 0, a: 0, ir: 0, phase: 0, halt: false, m7: 0 });
  const flow = useRef(new ElectronFlow());
  const busFlow = useRef(new ElectronFlow());
  const ui = useRef(0);
  const params = useRef({ power, hz });
  params.current = { power, hz };

  useEffect(() => {
    if (!power) {
      cpu.current.pc = 0;
      cpu.current.a = 0;
      cpu.current.ir = 0;
      cpu.current.phase = 0;
      cpu.current.halt = false;
      cpu.current.acc = 0;
      cpu.current.bus = 0;
      setRead({ pc: 0, a: 0, ir: 0, phase: 0, halt: false, m7: mem.current[7] ?? 0 });
    }
  }, [power]);

  const listing = mem.current.map((b, i) => {
    if (i <= 3) return `${String(i)}  ${opName(b)}`;
    return `${String(i)}  ${b}`;
  });

  const insight = useMemo(() => {
    if (!power) {
      return `POWER off. PC and A reset; RAM is kept (so the 3 and 5, and any stored result, survive). This is not the GPIO toy — it is fetch–decode–execute on a stored program.`;
    }
    if (read.halt) {
      return `HLT. A holds ${read.a} (3 + 5). The result sits in RAM[7]=${read.m7}. A phone still runs this loop, just a few billion times faster.`;
    }
    const names = ["FETCH", "DECODE", "EXECUTE"] as const;
    if (read.phase === 0) {
      return `FETCH. PC=${read.pc} drives the address bus; RAM dumps ${opName(mem.current[read.pc] ?? 0)} into IR. Instruction cycle = fetch + decode + execute.`;
    }
    if (read.phase === 1) {
      return `DECODE. IR=${opName(read.ir)}. The control unit is just a decoder: opcode nibble picks a data path, address nibble picks a RAM cell.`;
    }
    return `${names[read.phase]} ${opName(read.ir)}. A=${read.a}. Memory ↔ ALU ↔ A is the whole computer.`;
  }, [power, read]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="PC" value={String(read.pc)} />
          <Meter label="A" value={`${read.a}`} />
          <Meter label="IR" value={opName(read.ir)} />
        </>
      }
      controls={
        <>
          <ToggleControl label="POWER" checked={power} on="run" off="reset PC" onCheckedChange={setPower} />
          <LinearControl
            label="Clock"
            value={hz}
            display={formatHz(hz)}
            min={0}
            max={16}
            step={1}
            onChange={setHz}
            hint="One phase per tick. Three ticks make an instruction."
          />
          <Control label="Program">
            <ol className="font-mono text-xs leading-6 text-muted">
              {listing.map((line, i) => (
                <li key={i} className={i === read.pc ? "text-electron" : undefined}>
                  {line}
                </li>
              ))}
            </ol>
          </Control>
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">instruction cycle = fetch + decode + execute</p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            const c = cpu.current;
            if (p.power && !c.halt) {
              c.acc += dt * p.hz;
              while (c.acc >= 1) {
                c.acc -= 1;
                stepCpu(c, mem.current);
              }
            }

            ui.current += dt;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead((prev) => {
                const next = {
                  pc: c.pc,
                  a: c.a,
                  ir: c.ir,
                  phase: c.phase,
                  halt: c.halt,
                  m7: mem.current[7] ?? 0,
                };
                if (
                  prev.pc === next.pc &&
                  prev.a === next.a &&
                  prev.ir === next.ir &&
                  prev.phase === next.phase &&
                  prev.halt === next.halt &&
                  prev.m7 === next.m7
                ) {
                  return prev;
                }
                return next;
              });
            }

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 56, 200);
              label(ctx, p.power ? "5 V" : "0 V", 56, 256, { mono: true, size: 11 });

              roundRect(ctx, 130, 48, 200, 220, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.22)";
              ctx.stroke();
              label(ctx, "RAM  8 B", 230, 70, { size: 13, color: Ink.text, mono: true });
              for (let i = 0; i < MEM_N; i++) {
                const y = 92 + i * 20;
                const hit = i === c.pc && c.phase === 0;
                const tgt = (c.ir & 7) === i && c.phase === 2;
                label(ctx, String(i), 150, y, {
                  size: 10,
                  mono: true,
                  color: hit || tgt ? Ink.electron : Ink.faint,
                  align: "left",
                });
                const b = mem.current[i] ?? 0;
                roundRect(ctx, 168, y - 8, 140, 16, 3);
                ctx.fillStyle = hit || tgt ? Ink.electron : Ink.body;
                ctx.globalAlpha = hit || tgt ? 0.22 : 1;
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = "rgba(128,128,128,0.2)";
                ctx.stroke();
                const text = i <= 3 ? opName(b) : String(b);
                label(ctx, text, 238, y, { size: 11, mono: true, color: Ink.text });
              }

              roundRect(ctx, 380, 70, 120, 70, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = c.phase === 1 ? Ink.electron : "rgba(128,128,128,0.22)";
              ctx.stroke();
              label(ctx, "IR", 440, 90, { size: 11, color: Ink.muted });
              label(ctx, opName(c.ir), 440, 114, { size: 14, mono: true, color: Ink.text });

              roundRect(ctx, 540, 70, 120, 70, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.22)";
              ctx.stroke();
              label(ctx, "PC", 600, 90, { size: 11, color: Ink.muted });
              label(ctx, String(c.pc), 600, 114, { size: 18, mono: true, color: Ink.electron });

              roundRect(ctx, 380, 170, 160, 88, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = c.phase === 2 ? Ink.electron : "rgba(128,128,128,0.22)";
              ctx.stroke();
              label(ctx, "ALU", 460, 192, { size: 12, color: Ink.muted });
              label(ctx, c.phase === 2 && (c.ir >> 4) === OP.ADD ? "ADD" : "pass", 460, 216, {
                size: 16,
                mono: true,
                color: Ink.text,
              });

              roundRect(ctx, 580, 170, 120, 88, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.stroke();
              label(ctx, "A", 640, 192, { size: 11, color: Ink.muted });
              label(ctx, String(c.a), 640, 222, { size: 22, mono: true, color: Ink.electron });

              wire(ctx, [
                { x: 330, y: 160 },
                { x: 380, y: 160 },
                { x: 380, y: 105 },
              ]);
              wire(ctx, [
                { x: 500, y: 105 },
                { x: 540, y: 105 },
              ]);
              wire(ctx, [
                { x: 440, y: 140 },
                { x: 440, y: 170 },
              ]);
              wire(ctx, [
                { x: 540, y: 214 },
                { x: 580, y: 214 },
              ]);
              junction(ctx, 380, 160);
              label(ctx, "bus", 354, 148, { size: 10, color: Ink.muted });

              const names = ["FETCH", "DECODE", "EXECUTE"] as const;
              names.forEach((name, i) => {
                const x = 160 + i * 150;
                const on = p.power && c.phase === i;
                roundRect(ctx, x, 300, 130, 44, 8);
                ctx.fillStyle = on ? Ink.electron : Ink.body;
                ctx.globalAlpha = on ? 0.28 : 1;
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = on ? Ink.electron : "rgba(128,128,128,0.2)";
                ctx.stroke();
                label(ctx, name, x + 65, 322, {
                  size: 12,
                  mono: true,
                  color: on ? Ink.text : Ink.muted,
                });
              });

              bitLed(ctx, 700, 320, p.power && !c.halt);
              label(ctx, c.halt ? "HLT" : p.power ? "RUN" : "OFF", 700, 348, { size: 11, mono: true });

              const clk = p.power && (t * Math.max(p.hz, 0.4)) % 1 < 0.45;
              label(ctx, `clk ${clk ? "^" : "."}   3 + 5 → A`, 400, 370, { size: 12, mono: true, color: Ink.muted });

              const topY = 24;
              const botY = 400;
              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }, { x: 230, y: topY }, { x: 230, y: 48 }]);
              wire(ctx, [
                { x: 230, y: 268 },
                { x: 230, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);
              junction(ctx, bat.pos.x, topY);
              junction(ctx, bat.neg.x, botY);

              const loop: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                { x: 230, y: topY },
                { x: 230, y: 48 },
                { x: 230, y: 268 },
                { x: 230, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              flow.current.setPath(loop, true);
              flow.current.set(p.power ? 10 : 0, -70);
              flow.current.step(dt);
              flow.current.draw(ctx);

              if (p.power && !c.halt) {
                const bus: Pt[] = [
                  { x: 330, y: 160 },
                  { x: 380, y: 160 },
                  { x: 440, y: 160 },
                  { x: 440, y: 214 },
                  { x: 640, y: 214 },
                ];
                busFlow.current.setPath(bus, false);
                busFlow.current.set(8, 90);
                busFlow.current.step(dt);
                busFlow.current.draw(ctx);
              }

              label(ctx, "instruction cycle = fetch + decode + execute", 400, 408, {
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
