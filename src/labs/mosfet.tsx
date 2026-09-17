"use client";

import { useMemo, useState } from "react";
import { LabShell } from "@/components/lab-shell";
import { Meter, Readout, Slider } from "@/components/ui";
import { SimCanvas } from "@/components/sim-canvas";
import { formatAmp, formatOhm, formatVolt } from "@/lib/format";
import {
  Ink,
  battery,
  diode,
  ground,
  label,
  lamp,
  mosfet,
  resistor,
  wire,
} from "@/lib/sim/draw";

const VTH = 2.0;
const K = 0.45;
const RDSON = 0.35;

function compute(vgs: number, vdd: number, rd: number) {
  if (vgs < VTH) {
    return { id: 0, mode: "cut-off" as const, vds: vdd, lit: 0 };
  }
  const idSat = K * (vgs - VTH) ** 2;
  const idMax = Math.max(0, (vdd - 1.8) / (rd + RDSON));
  if (idSat >= idMax) {
    return { id: idMax, mode: "ohmic" as const, vds: idMax * RDSON, lit: Math.min(1, idMax / 0.08) };
  }
  return { id: idSat, mode: "saturation" as const, vds: vdd - idSat * rd, lit: Math.min(1, idSat / 0.08) };
}

export function MosfetLab() {
  const [vgs, setVgs] = useState(3.2);
  const [vdd, setVdd] = useState(9);
  const [rd, setRd] = useState(80);

  const p = useMemo(() => compute(vgs, vdd, rd), [vgs, vdd, rd]);
  const idMax = Math.max(0, (vdd - 1.8) / (rd + RDSON));

  const story =
    p.mode === "cut-off"
      ? `Vgs = ${formatVolt(vgs)} is below the ${formatVolt(VTH)} threshold. No inversion layer, no channel, the LED is dark. The gate draws (almost) no DC current.`
      : p.mode === "ohmic"
      ? `Ohmic. The channel is a closed switch. Drain current is limited by ${formatOhm(rd)} and the LED drop to ${formatAmp(idMax)}.`
      : `Saturation. The inverted n-channel is pinched off at the drain. Id ≈ k · (Vgs - Vth)^2 = ${formatAmp(p.id)}. Raise the gate, the channel gets denser.`;

  return (
    <LabShell
      title="N-MOSFET"
      subtitle="A voltage-built channel"
      meters={
        <>
          <Meter label="Vgs" value={formatVolt(vgs)} />
          <Meter label="Id" value={formatAmp(p.id)} lit={p.lit > 0.05} />
          <Meter label="Mode" value={p.mode} />
          <Meter label="Vds" value={formatVolt(p.vds)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Gate-source voltage"
            value={vgs}
            min={0}
            max={8}
            step={0.05}
            onChange={setVgs}
            format={formatVolt}
          />
          <Slider
            label="Supply VDD"
            value={vdd}
            min={3}
            max={15}
            step={0.1}
            onChange={setVdd}
            format={formatVolt}
          />
          <Slider
            label="Drain resistor"
            value={rd}
            min={10}
            max={220}
            step={1}
            onChange={setRd}
            format={formatOhm}
          />
          <Readout
            title="Channel physics"
            body={
              <>
            {"Vth = "}{formatVolt(VTH)}{" · Id sat = k · (Vgs - Vth)^2"}
              </>
            }
          />
        </>
      }
      canvas={
        <SimCanvas
          draw={(ctx, w, h) => {
            const midY = h * 0.42;
            const bat = battery(ctx, 70, midY + 40, { voltage: vdd });
            ground(ctx, bat.neg.x, bat.neg.y + 40);
            wire(ctx, bat.neg, { x: bat.neg.x, y: bat.neg.y + 40 });

            const m = mosfet(ctx, 340, midY, { on: p.mode !== "cut-off" });
            // Vgs between gate and source (return to source/GND)
            wire(ctx, { x: 140, y: midY - 20 }, m.g);
            wire(ctx, m.s, { x: m.s.x, y: bat.neg.y + 40 });
            wire(ctx, { x: m.s.x, y: bat.neg.y + 40 }, { x: bat.neg.x, y: bat.neg.y + 40 });
            label(ctx, "Vgs", 193, 150, { size: 11, color: Ink.text });
            label(ctx, "G", m.g.x - 18, m.g.y - 8, { size: 11, color: Ink.muted });
            label(ctx, "D", m.d.x + 8, m.d.y - 8, { size: 11, color: Ink.muted });
            label(ctx, "S", m.s.x + 8, m.s.y + 14, { size: 11, color: Ink.muted });
            label(ctx, "return to S", 280, 238, { size: 10, color: Ink.muted });

            const r = resistor(ctx, 340, midY - 110, { horizontal: true, ohms: rd });
            const led = diode(ctx, 480, midY - 110, { lit: p.lit > 0.05 });
            const bulb = lamp(ctx, 560, midY - 40, { lit: p.lit });

            wire(ctx, bat.pos, { x: bat.pos.x, y: r.a.y });
            wire(ctx, { x: bat.pos.x, y: r.a.y }, r.a);
            wire(ctx, r.b, led.anode);
            wire(ctx, led.cathode, { x: bulb.a.x, y: led.cathode.y });
            wire(ctx, { x: bulb.a.x, y: led.cathode.y }, bulb.a);
            wire(ctx, bulb.b, m.d);

            label(ctx, "Rd", 340, midY - 130, { size: 11 });
            label(ctx, "LED load", 560, midY + 20, { size: 11, color: Ink.muted });

            label(
              ctx,
              p.mode === "cut-off"
                ? "cut-off — no channel"
                : p.mode === "ohmic"
                  ? `ohmic · Id ≈ ${(p.id * 1000).toFixed(0)} mA`
                  : `Id = k (Vgs - Vth)^2 = ${formatAmp(p.id)}`,
              w / 2,
              h - 36,
              { size: 13, color: Ink.accent, align: "center" },
            );
          }}
        />
      }
      story={story}
    />
  );
}
