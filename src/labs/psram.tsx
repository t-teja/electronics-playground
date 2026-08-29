import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatSec } from "@/lib/format";
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
const BITS = N * 4;
const RC = 1.15;

function hex4(v: number) {
  return v.toString(16).toUpperCase();
}

function nibbleFrom(charge: Float32Array, row: number) {
  let v = 0;
  for (let b = 0; b < 4; b++) {
    if ((charge[row * 4 + b] ?? 0) > 0.5) v |= 1 << (3 - b);
  }
  return v;
}

export function PsramLab() {
  const lab = LAB_BY_SLUG.psram!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [power, setPower] = useState(true);
  const [refresh, setRefresh] = useState(true);
  const [addr, setAddr] = useState(5);
  const [d3, setD3] = useState(true);
  const [d2, setD2] = useState(true);
  const [d1, setD1] = useState(false);
  const [d0, setD0] = useState(true);
  const [snap, setSnap] = useState(0);

  const charge = useRef(new Float32Array(BITS));
  const digital = useRef(new Uint8Array(N));
  const weHold = useRef(0);
  const cursor = useRef(0);
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);

  const din = (d3 ? 8 : 0) | (d2 ? 4 : 0) | (d1 ? 2 : 0) | (d0 ? 1 : 0);
  const dout = power ? nibbleFrom(charge.current, addr) : 0;
  const meanQ = charge.current.reduce((s, x) => s + x, 0) / BITS;

  useEffect(() => {
    if (!power) {
      charge.current.fill(0);
      digital.current.fill(0);
      setSnap((n) => n + 1);
    }
  }, [power]);

  const params = useRef({ power, refresh, addr, din, dout, meanQ });
  params.current = { power, refresh, addr, din, dout, meanQ };

  const insight = useMemo(() => {
    if (!power) {
      return `VCC gone. DRAM capacitors dumped. PSRAM is still volatile — the "static" is a lie the refresh engine tells the bus.`;
    }
    if (!refresh) {
      return `Refresh engine off. Charge leaks: Q(t) = Q0 e^{−t/RC} with RC ≈ ${formatSec(RC)}. Rows will read 0 once they fall under 0.5. Pseudo-static means a DRAM with a built-in refresh engine.`;
    }
    if (weHold.current > 0) {
      return `WRITE. Row ${addr} capacitors charged to din=${hex4(din)}h. The refresh cursor will top them up as it walks past.`;
    }
    return `Looks like SRAM: address, data, write. Under the lid a cursor is walking row ${Math.floor(cursor.current) % N} and restoring DRAM charge. That is the "pseudo" in PSRAM.`;
  }, [power, refresh, addr, din, snap]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="ADDR" value={`${addr}  ${hex4(addr)}h`} />
          <Meter label="DOUT" value={power ? `${hex4(dout)}h  ${dout.toString(2).padStart(4, "0")}` : "0000"} />
          <Meter label="CHARGE" value={`${Math.round(meanQ * 100)}%`} />
        </>
      }
      controls={
        <>
          <ToggleControl label="POWER" checked={power} on="VCC" off="off" onCheckedChange={setPower} />
          <ToggleControl
            label="Refresh"
            checked={refresh}
            on="engine"
            off="leaking"
            onCheckedChange={setRefresh}
          />
          <LinearControl
            label="Address"
            value={addr}
            display={`${addr}  (${hex4(addr)}h)`}
            min={0}
            max={15}
            step={1}
            onChange={setAddr}
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
              digital.current[addr] = din;
              for (let b = 0; b < 4; b++) {
                charge.current[addr * 4 + b] = ((din >> (3 - b)) & 1) === 1 ? 1 : 0;
              }
              weHold.current = 0.22;
              setSnap((n) => n + 1);
            }}
          >
            WRITE strobe
          </Button>
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">Q(t) = Q0 e^{−t/RC} unless refreshed</p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            weHold.current = Math.max(0, weHold.current - dt);

            if (p.power && !p.refresh) {
              const k = Math.exp(-dt / RC);
              for (let i = 0; i < BITS; i++) charge.current[i] *= k;
            }
            if (p.power && p.refresh) {
              cursor.current = (cursor.current + dt * 10) % N;
              const row = Math.floor(cursor.current) % N;
              const stored = digital.current[row] ?? 0;
              for (let b = 0; b < 4; b++) {
                charge.current[row * 4 + b] = ((stored >> (3 - b)) & 1) === 1 ? 1 : 0;
              }
            }

            ui.current += dt;
            if (ui.current > 0.08) {
              ui.current = 0;
              if (!p.refresh) setSnap((n) => n + 1);
            }

            const we = weHold.current > 0;
            const liveDout = p.power ? nibbleFrom(charge.current, p.addr) : 0;
            const refreshRow = Math.floor(cursor.current) % N;

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
              label(ctx, "PSRAM  16 × 4", left + bodyW / 2, top + 18, {
                size: 13,
                color: Ink.text,
                mono: true,
              });
              label(ctx, p.refresh ? "DRAM + refresh engine" : "leaking capacitors", left + bodyW / 2, top + 34, {
                size: 10,
                color: p.refresh ? Ink.muted : Ink.heat,
              });

              const gx = left + 56;
              const gy = top + 52;
              const cw = 22;
              const ch = 16;
              for (let r = 0; r < N; r++) {
                const y = gy + r * (ch + 2);
                const hit = r === p.addr;
                const refreshing = p.refresh && p.power && r === refreshRow;
                if (hit || refreshing) {
                  ctx.globalAlpha = 0.16;
                  ctx.fillStyle = refreshing && !hit ? Ink.heat : Ink.electron;
                  ctx.fillRect(gx - 38, y - 2, 232, ch + 4);
                  ctx.globalAlpha = 1;
                }
                label(ctx, hex4(r), gx - 22, y + ch / 2, {
                  size: 9,
                  mono: true,
                  color: hit ? Ink.electron : refreshing ? Ink.heat : Ink.faint,
                });
                let val = 0;
                for (let b = 0; b < 4; b++) {
                  const x = gx + b * (cw + 4);
                  const q = p.power ? (charge.current[r * 4 + b] ?? 0) : 0;
                  if (q > 0.5) val |= 1 << (3 - b);
                  roundRect(ctx, x, y, cw, ch, 3);
                  ctx.fillStyle = Ink.electron;
                  ctx.globalAlpha = 0.08 + q * 0.8;
                  ctx.fill();
                  ctx.globalAlpha = 1;
                  ctx.strokeStyle = hit ? Ink.electron : "rgba(128,128,128,0.2)";
                  ctx.stroke();
                  label(ctx, q > 0.5 ? "1" : "0", x + cw / 2, y + ch / 2, {
                    size: 9,
                    mono: true,
                    color: q > 0.35 ? Ink.text : Ink.faint,
                  });
                }
                label(ctx, hex4(val), gx + 4 * (cw + 4) + 14, y + ch / 2, {
                  size: 10,
                  mono: true,
                  color: hit ? Ink.text : Ink.muted,
                });
              }

              if (p.refresh && p.power) {
                const cy = gy + refreshRow * (ch + 2) + ch / 2;
                ctx.strokeStyle = Ink.heat;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(gx - 44, cy);
                ctx.lineTo(gx + 4 * (cw + 4) + 28, cy);
                ctx.stroke();
                label(ctx, "REF", gx - 58, cy, { size: 8, mono: true, color: Ink.heat });
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

              label(ctx, "data bus", 620, 36, { size: 11, color: Ink.muted });
              label(ctx, we ? "WRITE" : "READ", 620, 54, {
                size: 12,
                mono: true,
                color: we ? Ink.heat : Ink.electron,
              });
              const shown = we ? p.din : liveDout;
              for (let b = 0; b < 4; b++) {
                const y = 88 + b * 40;
                const on = p.power && ((shown >> (3 - b)) & 1) === 1;
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

              label(ctx, `Q(t) = Q0 e^{−t/RC}   row ${refreshRow}   dout=${hex4(liveDout)}h`, 400, 408, {
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
