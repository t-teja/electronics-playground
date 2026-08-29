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
/** Mask-programmed increment table, baked at fab. */
const MASK: number[] = Array.from({ length: N }, (_, i) => (i + 1) & 0xf);

function hex4(v: number) {
  return v.toString(16).toUpperCase();
}

function bitOf(v: number, i: number) {
  return ((v >> (3 - i)) & 1) === 1;
}

export function RomLab() {
  const lab = LAB_BY_SLUG.rom!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [power, setPower] = useState(true);
  const [addr, setAddr] = useState(4);
  const [d3, setD3] = useState(true);
  const [d2, setD2] = useState(false);
  const [d1, setD1] = useState(true);
  const [d0, setD0] = useState(false);
  const [writeTries, setWriteTries] = useState(0);

  const din = (d3 ? 8 : 0) | (d2 ? 4 : 0) | (d1 ? 2 : 0) | (d0 ? 1 : 0);
  const dout = MASK[addr] ?? 0;

  const flow = useRef(new ElectronFlow());
  const params = useRef({ power, addr, din, dout, writeTries });
  params.current = { power, addr, din, dout, writeTries };

  const insight = useMemo(() => {
    if (writeTries > 0) {
      return `There is no write pin. Mask ROM is a pattern of vias and implants, not latches. The fab printed ${(addr + 1) & 0xf} at address ${addr}; toggling din (${hex4(din)}h) does not change a thing.`;
    }
    if (!power) {
      return `POWER is off, and the nibble is still ${hex4(dout)}h. Metal links do not need VCC. That is non-volatile: the increment table survives a brown-out.`;
    }
    return `Address ${addr} reads ${hex4(dout)}h — that is (addr + 1) masked to 4 bits, burned in at fab. Walk the slider: every row is a lookup, never a latch.`;
  }, [power, addr, din, dout, writeTries]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="ADDR" value={`${addr}  ${hex4(addr)}h`} />
          <Meter label="DOUT" value={`${hex4(dout)}h  ${dout.toString(2).padStart(4, "0")}`} />
          <Meter label="MASK" value="increment" />
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
            hint="A[3:0] indexes the mask. Read-only."
          />
          <ToggleControl label="DIN3" checked={d3} on="1" off="0" onCheckedChange={setD3} />
          <ToggleControl label="DIN2" checked={d2} on="1" off="0" onCheckedChange={setD2} />
          <ToggleControl label="DIN1" checked={d1} on="1" off="0" onCheckedChange={setD1} />
          <ToggleControl label="DIN0" checked={d0} on="1" off="0" onCheckedChange={setD0} />
          <Button
            variant="secondary"
            className="opacity-40"
            onClick={() => setWriteTries((n) => n + 1)}
          >
            WRITE (no pin)
          </Button>
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">dout = ROM[addr]  ·  mask ROM is baked in; there is no write pin.</p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
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
              label(ctx, "MASK ROM  16 × 4", left + bodyW / 2, top + 18, {
                size: 13,
                color: Ink.text,
                mono: true,
              });
              label(ctx, "increment table · fab links", left + bodyW / 2, top + 34, {
                size: 10,
                color: Ink.muted,
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
                const val = MASK[r] ?? 0;
                for (let b = 0; b < 4; b++) {
                  const x = gx + b * (cw + 4);
                  const on = bitOf(val, b);
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
                Ink.copper,
              );

              label(ctx, "data bus", 620, 44, { size: 11, color: Ink.muted });
              label(ctx, "READ ONLY", 620, 62, { size: 12, mono: true, color: Ink.electron });
              for (let b = 0; b < 4; b++) {
                const y = 96 + b * 44;
                const on = bitOf(p.dout, b);
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

              roundRect(ctx, 560, 300, 140, 44, 6);
              ctx.fillStyle = Ink.body;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.25)";
              ctx.stroke();
              label(ctx, "WE  (n/c)", 630, 322, { size: 12, mono: true, color: Ink.faint });

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
              flow.current.set(p.power ? 10 : 0, -70);
              flow.current.step(dt);
              flow.current.draw(ctx);

              label(ctx, `dout = ROM[${p.addr}] = ${hex4(p.dout)}h`, 400, 408, {
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
