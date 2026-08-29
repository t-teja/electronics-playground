import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
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

const N = 16;

function nibble(d3: boolean, d2: boolean, d1: boolean, d0: boolean) {
  return (d3 ? 8 : 0) | (d2 ? 4 : 0) | (d1 ? 2 : 0) | (d0 ? 1 : 0);
}

function hex4(v: number) {
  return v.toString(16).toUpperCase();
}

function bitOf(v: number, i: number) {
  return ((v >> (3 - i)) & 1) === 1;
}

export function RamLab() {
  const lab = LAB_BY_SLUG.ram!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [power, setPower] = useState(true);
  const [addr, setAddr] = useState(3);
  const [d3, setD3] = useState(true);
  const [d2, setD2] = useState(false);
  const [d1, setD1] = useState(true);
  const [d0, setD0] = useState(true);
  const [cells, setCells] = useState<number[]>(() => Array.from({ length: N }, () => 0));
  const weHold = useRef(0);
  const flow = useRef(new ElectronFlow());

  const din = nibble(d3, d2, d1, d0);
  const dout = power ? (cells[addr] ?? 0) : 0;

  useEffect(() => {
    if (!power) setCells(Array.from({ length: N }, () => 0));
  }, [power]);

  const params = useRef({ power, addr, din, dout, cells });
  params.current = { power, addr, din, dout, cells };

  const insight = useMemo(() => {
    if (!power) {
      return `POWER is off. Every SRAM cell dumped its charge to 0 — volatile memory is a powered latch, not a stone tablet. Re-apply VCC and the array comes up empty.`;
    }
    if (weHold.current > 0) {
      return `WRITE strobe. data[${addr}] ← ${hex4(din)}h. Four bit-lines dump din into the addressed row of six-transistor cells.`;
    }
    const live = cells.filter((c) => c !== 0).length;
    if (live === 0) {
      return `Sixteen nibbles of SRAM, all zero. Set din, pick an address, pulse WRITE. Reading is free: the row at ${addr} already sits on the data bus as ${hex4(dout)}h.`;
    }
    return `Row ${addr} holds ${hex4(dout)}h. Flip din (${hex4(din)}h) and pulse WRITE to replace it. The other ${live} written nibble${live === 1 ? "" : "s"} keep state only while VCC is up.`;
  }, [power, addr, din, dout, cells]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="ADDR" value={`${addr}  ${hex4(addr)}h`} />
          <Meter label="DIN" value={`${hex4(din)}h  ${din.toString(2).padStart(4, "0")}`} />
          <Meter label="DOUT" value={power ? `${hex4(dout)}h  ${dout.toString(2).padStart(4, "0")}` : "0000"} />
        </>
      }
      controls={
        <>
          <ToggleControl label="POWER" checked={power} on="VCC" off="off" onCheckedChange={setPower} />
          <LinearControl
            label="Address"
            value={addr}
            display={`${addr}  (${hex4(addr)}h)`}
            min={0}
            max={15}
            step={1}
            onChange={setAddr}
            hint="A[3:0] selects one of 16 nibbles."
          />
          <ToggleControl label="DIN3" checked={d3} on="1" off="0" onCheckedChange={setD3} />
          <ToggleControl label="DIN2" checked={d2} on="1" off="0" onCheckedChange={setD2} />
          <ToggleControl label="DIN1" checked={d1} on="1" off="0" onCheckedChange={setD1} />
          <ToggleControl label="DIN0" checked={d0} on="1" off="0" onCheckedChange={setD0} />
          <Button
            variant="electron"
            disabled={!power}
            onClick={() => {
              if (!power) return;
              setCells((prev) => {
                const next = prev.slice();
                next[addr] = din;
                return next;
              });
              weHold.current = 0.22;
            }}
          >
            WRITE strobe
          </Button>
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">data[addr] ← din  (while powered)</p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            weHold.current = Math.max(0, weHold.current - dt);
            const we = weHold.current > 0;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 64, 200);
              label(ctx, p.power ? "5 V" : "0 V", 64, 256, { mono: true, size: 11 });

              const left = 168;
              const top = 36;
              const bodyW = 300;
              const bodyH = 348;
              roundRect(ctx, left, top, bodyW, bodyH, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.22)";
              ctx.stroke();
              label(ctx, "SRAM  16 × 4", left + bodyW / 2, top + 18, { size: 13, color: Ink.text, mono: true });
              label(ctx, p.power ? "volatile · powered" : "VCC lost · all 0", left + bodyW / 2, top + 34, {
                size: 10,
                color: p.power ? Ink.muted : Ink.heat,
              });

              const gx = left + 56;
              const gy = top + 52;
              const cw = 22;
              const ch = 16;
              for (let r = 0; r < N; r++) {
                const y = gy + r * (ch + 2);
                const hit = r === p.addr;
                if (hit) {
                  ctx.globalAlpha = 0.16;
                  ctx.fillStyle = Ink.electron;
                  ctx.fillRect(gx - 38, y - 2, 232, ch + 4);
                  ctx.globalAlpha = 1;
                }
                label(ctx, hex4(r), gx - 22, y + ch / 2, {
                  size: 9,
                  mono: true,
                  color: hit ? Ink.electron : Ink.faint,
                });
                const val = p.power ? (p.cells[r] ?? 0) : 0;
                for (let b = 0; b < 4; b++) {
                  const x = gx + b * (cw + 4);
                  const on = bitOf(val, b) && p.power;
                  roundRect(ctx, x, y, cw, ch, 3);
                  ctx.fillStyle = on ? Ink.electron : Ink.body;
                  ctx.globalAlpha = on ? 0.85 : 1;
                  ctx.fill();
                  ctx.globalAlpha = 1;
                  ctx.strokeStyle = hit ? Ink.electron : "rgba(128,128,128,0.2)";
                  ctx.stroke();
                  label(ctx, on ? "1" : "0", x + cw / 2, y + ch / 2, {
                    size: 9,
                    mono: true,
                    color: on ? Ink.text : Ink.faint,
                  });
                }
                label(ctx, hex4(val), gx + 4 * (cw + 4) + 14, y + ch / 2, {
                  size: 10,
                  mono: true,
                  color: hit ? Ink.text : Ink.muted,
                });
              }

              const busY = gy + p.addr * (ch + 2) + ch / 2;
              const busX = gx + 4 * (cw + 4) + 36;
              wire(
                ctx,
                [
                  { x: gx + 4 * (cw + 4) - 2, y: busY },
                  { x: busX, y: busY },
                ],
                2,
                we ? Ink.electron : Ink.copper,
              );

              label(ctx, "data bus", 620, 44, { size: 11, color: Ink.muted });
              label(ctx, we ? "WRITE" : "READ", 620, 62, {
                size: 12,
                mono: true,
                color: we ? Ink.heat : Ink.electron,
              });
              for (let b = 0; b < 4; b++) {
                const y = 96 + b * 44;
                const src = we ? p.din : p.dout;
                const on = p.power && bitOf(src, b);
                bitLed(ctx, 620, y, on);
                label(ctx, `D${3 - b}`, 650, y, { size: 11, mono: true, align: "left" });
                wire(ctx, [
                  { x: busX, y: busY },
                  { x: 560, y: busY },
                  { x: 560, y },
                  { x: 606, y },
                ]);
              }
              junction(ctx, busX, busY);
              junction(ctx, 560, busY);

              const topY = 24;
              const botY = 400;
              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }, { x: left + bodyW / 2, y: topY }, { x: left + bodyW / 2, y: top }]);
              wire(ctx, [
                { x: left + bodyW / 2, y: top + bodyH },
                { x: left + bodyW / 2, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ]);
              junction(ctx, bat.pos.x, topY);
              junction(ctx, bat.neg.x, botY);
              label(ctx, "VCC", left + bodyW / 2 + 18, top - 2, { size: 9, align: "left" });
              label(ctx, "GND", left + bodyW / 2 + 18, top + bodyH + 12, { size: 9, align: "left" });

              const loop: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                { x: left + bodyW / 2, y: topY },
                { x: left + bodyW / 2, y: top },
                { x: left + bodyW / 2, y: top + bodyH },
                { x: left + bodyW / 2, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              flow.current.setPath(loop, true);
              flow.current.set(p.power ? 12 : 0, -80);
              flow.current.step(dt);
              flow.current.draw(ctx);

              label(ctx, `data[${p.addr}] ${we ? "\u2190" : "="} ${hex4(we ? p.din : p.dout)}h`, 400, 408, {
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
