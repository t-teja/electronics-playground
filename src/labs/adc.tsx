import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, Meter, Segmented } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  battery,
  bitLed,
  clearSim,
  graphPaper,
  Ink,
  junction,
  label,
  potentiometer,
  roundRect,
  wire,
  withFrame,
} from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const VREF = 5;

export function AdcLab() {
  const lab = LAB_BY_SLUG.adc!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [vin, setVin] = useState(1.7);
  const [bits, setBits] = useState<"4" | "8">("4");
  const n = bits === "8" ? 8 : 4;
  const levels = 2 ** n - 1;
  const code = Math.max(0, Math.min(levels, Math.round((vin / VREF) * levels)));
  const vq = (code / levels) * VREF;
  const err = vin - vq;
  const lsb = VREF / levels;

  const flow = useRef(new ElectronFlow());
  const params = useRef({ vin, n, levels, code, vq, err, lsb });
  params.current = { vin, n, levels, code, vq, err, lsb };

  const insight = useMemo(() => {
    if (vin < lsb / 2) {
      return `Vin is below half an LSB (${formatVolt(lsb)}). The converter reports code 0 — everything in that first bin looks like zero. That leftover is quantization error.`;
    }
    if (Math.abs(err) < lsb * 0.05) {
      return `Vin sits almost exactly on a code. D = round(Vin/Vref · (2ⁿ − 1)) = ${code}, Vq = ${formatVolt(vq)}. Error is ${formatVolt(err)}.`;
    }
    if (n === 4) {
      return `4 bits means 15 steps of ${formatVolt(lsb)}. Vin = ${formatVolt(vin)} snaps to code ${code} (${formatVolt(vq)}). The ${formatVolt(err)} gap is quantization — it shrinks if you add bits.`;
    }
    return `8 bits, 255 steps, LSB = ${formatVolt(lsb)}. Same voltage now lands on code ${code}. Finer ruler, smaller ${formatVolt(err)} error — never zero unless Vin hits a step exactly.`;
  }, [vin, n, lsb, code, vq, err]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Code" value={`${code}`} />
          <Meter label="Vq" value={formatVolt(vq)} />
          <Meter label="Error" value={formatVolt(err)} />
        </>
      }
      controls={
        <>
          <LinearControl
            label="Vin"
            value={vin}
            display={formatVolt(vin)}
            min={0}
            max={VREF}
            step={0.01}
            onChange={setVin}
            hint={`0 to Vref = ${formatVolt(VREF)}. Analog in.`}
          />
          <Control label="Bits" hint="2ⁿ − 1 steps between 0 and Vref.">
            <Segmented
              value={bits}
              onChange={setBits}
              options={[
                { id: "4", label: "4-bit" },
                { id: "8", label: "8-bit" },
              ]}
            />
          </Control>
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            D = round(Vin/Vref · (2ⁿ − 1)) = {code} · Vq = {formatVolt(vq)}
          </p>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              const bat = battery(ctx, 70, 150);
              label(ctx, `Vref ${formatVolt(VREF)}`, 70, 206, { mono: true, size: 11 });
              const topY = 64;
              const botY = 250;

              const pot = potentiometer(ctx, 160, 64, 160, p.vin / VREF, 10000);
              label(ctx, "Vin", pot.wiper.x, pot.wiper.y - 16, { size: 10 });

              roundRect(ctx, 380, 88, 150, 100, 8);
              ctx.fillStyle = Ink.package;
              ctx.fill();
              ctx.strokeStyle = "rgba(128,128,128,0.22)";
              ctx.stroke();
              label(ctx, "ADC", 455, 112, { size: 14, color: Ink.text });
              label(ctx, `${p.n}-bit`, 455, 132, { size: 11, mono: true });
              label(ctx, `D = ${p.code}`, 455, 154, { size: 13, color: Ink.electron, mono: true });

              const flash = (t * 6) % 1 < 0.12;
              if (flash) {
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = Ink.electron;
                ctx.fillRect(388, 140, 134, 8);
                ctx.globalAlpha = 1;
                label(ctx, "sample", 455, 172, { size: 10, color: Ink.electron });
              }

              wire(ctx, [bat.pos, { x: bat.pos.x, y: topY }, pot.left]);
              wire(ctx, [pot.right, { x: 360, y: 64 }, { x: 360, y: botY }, { x: bat.neg.x, y: botY }, bat.neg]);
              wire(ctx, [pot.wiper, { x: pot.wiper.x, y: 20 }, { x: 380, y: 20 }, { x: 380, y: 88 }]);
              wire(ctx, [bat.pos, { x: bat.pos.x, y: 150 }, { x: 380, y: 150 }]);
              wire(ctx, [
                { x: 455, y: 188 },
                { x: 455, y: botY },
                { x: bat.neg.x, y: botY },
              ]);
              junction(ctx, bat.pos.x, topY);
              junction(ctx, bat.pos.x, 150);
              junction(ctx, bat.neg.x, botY);
              junction(ctx, 360, 64);

              const nBits = p.n;
              for (let i = 0; i < nBits; i++) {
                const on = ((p.code >> (nBits - 1 - i)) & 1) === 1;
                const bx = 380 + i * (nBits === 8 ? 18 : 34);
                const by = 230;
                bitLed(ctx, bx, by, on);
                label(ctx, `b${nBits - 1 - i}`, bx, by + 20, { size: 8, mono: true });
              }

              const barX = 620;
              const barY = 48;
              const barW = 36;
              const barH = 260;
              roundRect(ctx, barX, barY, barW, barH, 4);
              ctx.fillStyle = Ink.body;
              ctx.fill();
              const hVin = (p.vin / VREF) * barH;
              ctx.fillStyle = Ink.electron;
              ctx.globalAlpha = 0.85;
              ctx.fillRect(barX, barY + barH - hVin, barW, hVin);
              ctx.globalAlpha = 1;
              const hVq = (p.vq / VREF) * barH;
              ctx.strokeStyle = Ink.heat;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(barX - 6, barY + barH - hVq);
              ctx.lineTo(barX + barW + 6, barY + barH - hVq);
              ctx.stroke();
              const tickN = p.n === 4 ? p.levels : 16;
              ctx.strokeStyle = Ink.faint;
              ctx.lineWidth = 1;
              for (let i = 0; i <= tickN; i++) {
                const yy = barY + barH - (i / tickN) * barH;
                ctx.beginPath();
                ctx.moveTo(barX + barW, yy);
                ctx.lineTo(barX + barW + 8, yy);
                ctx.stroke();
              }
              label(ctx, "Vin", barX + 18, barY - 16, { size: 11 });
              label(ctx, "Vq", barX + 56, barY + barH - hVq, { size: 10, color: Ink.heat, align: "left" });
              label(ctx, formatVolt(p.vin), barX + 18, barY + barH + 18, { mono: true, size: 11 });

              const loop: Pt[] = [
                bat.pos,
                { x: bat.pos.x, y: topY },
                pot.left,
                pot.right,
                { x: 360, y: 64 },
                { x: 360, y: botY },
                { x: bat.neg.x, y: botY },
                bat.neg,
              ];
              flow.current.setPath(loop, true);
              flow.current.set(10, -70);
              flow.current.step(dt);
              flow.current.draw(ctx);

              label(ctx, `D = round(Vin/Vref · (2ⁿ − 1)) = ${p.code}`, 400, 392, {
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
