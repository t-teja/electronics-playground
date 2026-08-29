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
const BITS = N * 4;
const UV_S = 1.5;

function hex4(v: number) {
  return v.toString(16).toUpperCase();
}

function nibbleFrom(bits: Float32Array, row: number) {
  let v = 0;
  for (let b = 0; b < 4; b++) {
    if ((bits[row * 4 + b] ?? 0) > 0.5) v |= 1 << (3 - b);
  }
  return v;
}

export function EpromLab() {
  const lab = LAB_BY_SLUG.eprom!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [power, setPower] = useState(true);
  const [vpp, setVpp] = useState(false);
  const [uv, setUv] = useState(false);
  const [addr, setAddr] = useState(2);
  const [d3, setD3] = useState(false);
  const [d2, setD2] = useState(true);
  const [d1, setD1] = useState(false);
  const [d0, setD0] = useState(true);
  const [snap, setSnap] = useState(0);
  const bits = useRef(new Float32Array(BITS).fill(1));
  const weHold = useRef(0);
  const flow = useRef(new ElectronFlow());
  const ui = useRef(0);

  const din = (d3 ? 8 : 0) | (d2 ? 4 : 0) | (d1 ? 2 : 0) | (d0 ? 1 : 0);
  const dout = nibbleFrom(bits.current, addr);
  const erased = bits.current.reduce((s, x) => s + x, 0) / BITS;

  const params = useRef({ power, vpp, uv, addr, din, dout, erased });
  params.current = { power, vpp, uv, addr, din, dout, erased };

  const insight = useMemo(() => {
    if (uv) {
      return `UV through the quartz window. Photons empty the floating gates; bits fade toward 1 (erased = 0xF). Hold ~${UV_S.toFixed(1)} s for a blank chip.`;
    }
    if (weHold.current > 0 && !vpp) {
      return `WRITE without Vpp is a no-op. Programming needs a high-voltage pulse on Vpp to push electrons onto the gate.`;
    }
    if (weHold.current > 0 && vpp) {
      return `Vpp is high. Programming can only write 0s — electrons trapped on the floating gate. Ones stay ones until UV.`;
    }
    if (!power) {
      return `POWER is off, data is still ${hex4(dout)}h at address ${addr}. EPROM is non-volatile: the floating gate holds charge with no VCC.`;
    }
    if (!vpp) {
      return `Quartz window, floating gates. Row ${addr} reads ${hex4(dout)}h. Raise Vpp to program 0s, or hold UV to erase toward 0xF.`;
    }
    return `Vpp armed. Pulse WRITE to program din=${hex4(din)}h into row ${addr} (1→0 only). UV is the only way back to 1.`;
  }, [uv, vpp, power, addr, din, dout, snap]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="ADDR" value={`${addr}  ${hex4(addr)}h`} />
          <Meter label="DOUT" value={`${hex4(dout)}h  ${dout.toString(2).padStart(4, "0")}`} />
          <Meter label="ERASED" value={`${Math.round(erased * 100)}%`} />
        </>
      }
      controls={
        <>
          <ToggleControl label="POWER" checked={power} on="VCC" off="off" onCheckedChange={setPower} />
          <ToggleControl label="Vpp" checked={vpp} on="12 V" off="0 V" onCheckedChange={setVpp} />
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
            onClick={() => {
              weHold.current = 0.22;
              if (vpp) {
                for (let b = 0; b < 4; b++) {
                  const wantOne = ((din >> (3 - b)) & 1) === 1;
                  const idx = addr * 4 + b;
                  if (!wantOne) bits.current[idx] = 0;
                }
              }
              setSnap((n) => n + 1);
            }}
          >
            WRITE (needs Vpp)
          </Button>
          <Button
            variant={uv ? "electron" : "secondary"}
            onPointerDown={() => setUv(true)}
            onPointerUp={() => setUv(false)}
            onPointerCancel={() => setUv(false)}
            onPointerLeave={() => setUv(false)}
          >
            Hold UV erase
          </Button>
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">UV empties the floating gate; Vpp programs 0s</p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            weHold.current = Math.max(0, weHold.current - dt);
            if (p.uv) {
              const step = dt / UV_S;
              for (let i = 0; i < BITS; i++) {
                bits.current[i] = Math.min(1, (bits.current[i] ?? 1) + step);
              }
            }
            ui.current += dt;
            if (ui.current > 0.08) {
              ui.current = 0;
              if (p.uv) setSnap((n) => n + 1);
            }

            const we = weHold.current > 0;
            const liveDout = nibbleFrom(bits.current, p.addr);
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

              const wx = left + bodyW / 2;
              const wy = top + 28;
              ctx.beginPath();
              ctx.ellipse(wx, wy, 54, 16, 0, 0, Math.PI * 2);
              ctx.fillStyle = p.uv ? "rgba(180, 140, 255, 0.45)" : "rgba(180, 200, 220, 0.18)";
              ctx.fill();
              ctx.strokeStyle = p.uv ? "rgba(200, 160, 255, 0.9)" : "rgba(180, 200, 220, 0.45)";
              ctx.stroke();
              if (p.uv) {
                ctx.save();
                ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 8);
                ctx.fillStyle = "#c4a0ff";
                ctx.beginPath();
                ctx.ellipse(wx, wy, 70, 22, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                label(ctx, "UV", wx + 70, wy, { size: 11, color: "#c4a0ff" });
              } else {
                label(ctx, "quartz window", wx, wy, { size: 10, color: Ink.muted });
              }

              const gx = left + 56;
              const gy = top + 56;
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
                let val = 0;
                for (let b = 0; b < 4; b++) {
                  const x = gx + b * (cw + 4);
                  const q = bits.current[r * 4 + b] ?? 1;
                  if (q > 0.5) val |= 1 << (3 - b);
                  roundRect(ctx, x, y, cw, ch, 3);
                  ctx.fillStyle = Ink.electron;
                  ctx.globalAlpha = 0.12 + q * 0.75;
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

              const busY = gy + p.addr * (ch + 2) + ch / 2;
              const busX = gx + 4 * (cw + 4) + 36;
              wire(
                ctx,
                [
                  { x: gx + 4 * (cw + 4) - 2, y: busY },
                  { x: busX, y: busY },
                ],
                2,
                we && p.vpp ? Ink.heat : Ink.copper,
              );

              label(ctx, "data bus", 620, 36, { size: 11, color: Ink.muted });
              label(ctx, p.vpp ? "Vpp ARM" : we ? "no Vpp" : "READ", 620, 54, {
                size: 12,
                mono: true,
                color: p.vpp ? Ink.heat : Ink.electron,
              });
              const shown = we && p.vpp ? p.din : liveDout;
              for (let b = 0; b < 4; b++) {
                const y = 88 + b * 40;
                const on = ((shown >> (3 - b)) & 1) === 1;
                bitLed(ctx, 620, y, on, we && p.vpp ? Ink.heat : Ink.electron);
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
              flow.current.set(p.power ? 10 : 0, -70);
              flow.current.step(dt);
              flow.current.draw(ctx);

              label(ctx, `UV → 1s   Vpp programs 0s   dout=${hex4(liveDout)}h`, 400, 408, {
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
