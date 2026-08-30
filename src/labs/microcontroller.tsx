import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, Meter, Segmented } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatHz } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  bitLed,
  clearSim,
  dipPackage,
  graphPaper,
  Ink,
  label,
  ledDome,
  roundRect,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

type Kind = "blink" | "chase" | "counter" | "pwm";

type Op =
  | { k: "SBI"; pin: number; asm: string }
  | { k: "CBI"; pin: number; asm: string }
  | { k: "TOG"; pin: number; asm: string }
  | { k: "INC"; asm: string }
  | { k: "WAIT"; n: number; asm: string }
  | { k: "JMP"; a: number; asm: string };

const PINS = ["GND", "P0", "P1", "P2", "P3", "RST", "CLK", "VCC"];

function firmware(kind: Kind, duty: number): Op[] {
  if (kind === "blink") {
    return [
      { k: "TOG", pin: 0, asm: "sbi PIN, 0" },
      { k: "WAIT", n: 6, asm: "rcall delay" },
      { k: "JMP", a: 0, asm: "rjmp loop" },
    ];
  }
  if (kind === "chase") {
    return [
      { k: "SBI", pin: 0, asm: "sbi PORT, 0" },
      { k: "WAIT", n: 3, asm: "rcall delay" },
      { k: "CBI", pin: 0, asm: "cbi PORT, 0" },
      { k: "SBI", pin: 1, asm: "sbi PORT, 1" },
      { k: "WAIT", n: 3, asm: "rcall delay" },
      { k: "CBI", pin: 1, asm: "cbi PORT, 1" },
      { k: "SBI", pin: 2, asm: "sbi PORT, 2" },
      { k: "WAIT", n: 3, asm: "rcall delay" },
      { k: "CBI", pin: 2, asm: "cbi PORT, 2" },
      { k: "SBI", pin: 3, asm: "sbi PORT, 3" },
      { k: "WAIT", n: 3, asm: "rcall delay" },
      { k: "CBI", pin: 3, asm: "cbi PORT, 3" },
      { k: "JMP", a: 0, asm: "rjmp loop" },
    ];
  }
  if (kind === "pwm") {
    const on = Math.max(1, Math.round(duty * 8));
    const off = Math.max(1, 8 - on);
    return [
      { k: "SBI", pin: 0, asm: "sbi PORT, 0" },
      { k: "WAIT", n: on, asm: `rcall on  ; ${on}` },
      { k: "CBI", pin: 0, asm: "cbi PORT, 0" },
      { k: "WAIT", n: off, asm: `rcall off ; ${off}` },
      { k: "JMP", a: 0, asm: "rjmp loop" },
    ];
  }
  return [
    { k: "INC", asm: "inc PORT" },
    { k: "WAIT", n: 4, asm: "rcall delay" },
    { k: "JMP", a: 0, asm: "rjmp loop" },
  ];
}

type Cpu = {
  pc: number;
  wait: number;
  port: number;
  phase: 0 | 1 | 2;
  acc: number;
};

function stepCpu(cpu: Cpu, prog: Op[]) {
  const op = prog[cpu.pc];
  if (!op) {
    cpu.pc = 0;
    return;
  }
  if (cpu.wait > 0) {
    cpu.wait -= 1;
    cpu.phase = 2;
    return;
  }
  cpu.phase = ((cpu.phase + 1) % 3) as 0 | 1 | 2;
  if (cpu.phase !== 2) return;
  switch (op.k) {
    case "SBI":
      cpu.port |= 1 << op.pin;
      cpu.pc += 1;
      break;
    case "CBI":
      cpu.port &= ~(1 << op.pin);
      cpu.pc += 1;
      break;
    case "TOG":
      cpu.port ^= 1 << op.pin;
      cpu.pc += 1;
      break;
    case "INC":
      cpu.port = (cpu.port + 1) & 0xf;
      cpu.pc += 1;
      break;
    case "WAIT":
      cpu.wait = op.n;
      cpu.pc += 1;
      break;
    case "JMP":
      cpu.pc = op.a;
      break;
  }
}

export function MicrocontrollerLab() {
  const lab = LAB_BY_SLUG.microcontroller!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [kind, setKind] = useState<Kind>("blink");
  const [hz, setHz] = useState(8);
  const [duty, setDuty] = useState(0.4);
  const prog = useMemo(() => firmware(kind, duty), [kind, duty]);

  const cpu = useRef<Cpu>({ pc: 0, wait: 0, port: 0, phase: 0, acc: 0 });
  const [read, setRead] = useState({ pc: 0, port: 0, phase: 0 });
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);
  const params = useRef({ hz, prog, kind });
  params.current = { hz, prog, kind };

  useEffect(() => {
    cpu.current = { pc: 0, wait: 0, port: 0, phase: 0, acc: 0 };
    setRead({ pc: 0, port: 0, phase: 0 });
  }, [kind, duty]);

  const insight = useMemo(() => {
    if (kind === "blink") {
      return `A two-state loop. TOG flips GPIO0 each pass (write 1 to PIN). Each clock edge fetches, decodes, executes. Then the pin follows. Blink rate is the delay, not the CPU clock.`;
    }
    if (kind === "chase") {
      return `Walk a one across four pins. Same instructions, different addresses. This is how a microcontroller becomes a turn signal, a VU meter, a walking robot.`;
    }
    if (kind === "pwm") {
      return `Software PWM: the pin is only ever on or off. Duty cycle (${Math.round(duty * 100)}%) is the fraction of WAIT ticks spent high. The LED integrates the pulses into brightness.`;
    }
    return `PORT is a four-bit register. INC walks 0000 \u2192 1111 and wraps. You are watching a program counter, not a 555. The pattern is the firmware.`;
  }, [kind, duty]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Clock" value={formatHz(hz)} />
          <Meter label="PC" value={String(read.pc).padStart(2, "0")} />
          <Meter label="PORT" value={read.port.toString(2).padStart(4, "0")} />
        </>
      }
      controls={
        <>
          <Control label="Firmware">
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { id: "blink", label: "Blink" },
                { id: "chase", label: "Chase" },
                { id: "counter", label: "Counter" },
                { id: "pwm", label: "PWM" },
              ]}
            />
          </Control>
          <LinearControl
            label="CPU clock"
            value={hz}
            display={formatHz(hz)}
            min={1}
            max={24}
            step={1}
            onChange={setHz}
            hint="Slow enough to watch. A real part runs a million times faster."
          />
          {kind === "pwm" ? (
            <LinearControl
              label="Duty"
              value={duty}
              display={`${Math.round(duty * 100)}%`}
              min={0.125}
              max={0.875}
              step={0.125}
              onChange={setDuty}
            />
          ) : null}
          <Control label="Listing">
            <ol className="font-mono text-xs leading-6 text-muted">
              {prog.map((op, i) => (
                <li
                  key={`${op.asm}-${i}`}
                  className={i === read.pc ? "text-electron" : undefined}
                >
                  <span className="mr-3 text-subtle">{String(i).padStart(2, "0")}</span>
                  {op.asm}
                </li>
              ))}
            </ol>
          </Control>
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            const c = cpu.current;
            c.acc += dt * p.hz * 3;
            while (c.acc >= 1) {
              c.acc -= 1;
              stepCpu(c, p.prog);
            }

            const clk = (t * p.hz) % 1 < 0.45 ? 1 : 0;
            const g0 = (c.port & 1) !== 0;
            const g1 = (c.port & 2) !== 0;
            const g2 = (c.port & 4) !== 0;
            const g3 = (c.port & 8) !== 0;

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const pkg = dipPackage(ctx, 280, 160, 8, PINS, {
                2: g0 ? 1 : 0,
                3: g1 ? 1 : 0,
                4: g2 ? 1 : 0,
                5: g3 ? 1 : 0,
                7: clk,
                8: 1,
              });
              label(ctx, "EP-8", 280, 154, { size: 14, color: Ink.text, mono: true });
              label(ctx, "flash \u00b7 alu \u00b7 gpio", 280, 176, { size: 10, color: Ink.faint });

              ledDome(ctx, 520, 70, g0 ? "#5eead4" : Ink.body, g0 ? 1 : 0);
              label(ctx, "P0 LED", 520, 128, { size: 11 });
              wire(ctx, [
                { x: pkg.left + 28 + 1 * 34, y: pkg.top + pkg.bodyH + 14 },
                { x: pkg.left + 28 + 1 * 34, y: 250 },
                { x: 520, y: 250 },
                { x: 520, y: 108 },
              ]);

              bitLed(ctx, 620, 168, g0);
              bitLed(ctx, 656, 168, g1);
              bitLed(ctx, 692, 168, g2);
              bitLed(ctx, 728, 168, g3);
              label(ctx, "PORT[3:0]", 674, 198, { size: 11, mono: true });

              const names = ["FETCH", "DECODE", "EXECUTE"] as const;
              names.forEach((name, i) => {
                const x = 80 + i * 130;
                const on = c.phase === i;
                roundRect(ctx, x, 320, 110, 44, 8);
                ctx.fillStyle = on ? Ink.electron : Ink.body;
                ctx.globalAlpha = on ? 0.28 : 1;
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = on ? Ink.electron : "rgba(128,128,128,0.2)";
                ctx.stroke();
                label(ctx, name, x + 55, 342, {
                  size: 11,
                  mono: true,
                  color: on ? Ink.text : Ink.muted,
                });
              });

              label(ctx, `PC = ${String(c.pc).padStart(2, "0")}   clk ${clk ? "\u2191" : "\u00b7"}`, 280, 54, {
                mono: true,
                size: 13,
                color: Ink.text,
              });

              const loop: Pt[] = [
                { x: pkg.left + 62, y: pkg.top + pkg.bodyH + 14 },
                { x: pkg.left + 62, y: 250 },
                { x: 520, y: 250 },
                { x: 520, y: 108 },
              ];
              flow.current.setPath(loop, false);
              flow.current.set(g0 ? 12 : 0, 90);
              flow.current.step(dt);
              flow.current.draw(ctx);
            });

            ui.current += dt;
            if (ui.current > 0.08) {
              ui.current = 0;
              setRead((prev) => {
                if (prev.pc === c.pc && prev.port === c.port && prev.phase === c.phase) return prev;
                return { pc: c.pc, port: c.port, phase: c.phase };
              });
            }
          }}
        />
      }
    />
  );
}
