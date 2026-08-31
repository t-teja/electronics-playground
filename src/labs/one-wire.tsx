import { useMemo, useState } from "react";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { ProtocolBench } from "@/labs/protocol-bench";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { Ink, label, wire } from "@/lib/sim/draw";
import { icChip, pinLed } from "@/lib/sim/protocol-draw";
import { hex, oneWireTrace } from "@/lib/sim/protocol";

export function OneWireLab() {
  const lab = LAB_BY_SLUG["one-wire"]!;
  const [tC, setTC] = useState(22.5);
  const [play, setPlay] = useState(true);
  const raw = Math.round(tC * 16);
  const lo = raw & 0xff;
  const hi = (raw >> 8) & 0xff;
  const trace = useMemo(() => oneWireTrace({ scratch: [lo, hi] }), [lo, hi]);

  const insight = useMemo(() => {
    return `1-Wire is open-drain on a single DQ pin plus ground. A 480 µs reset, a presence pulse from the DS18B20, then SKIP ROM (0xCC) and READ SCRATCHPAD (0xBE). Each bit is a time slot: a short low is a 1, a long low is a 0. Scratchpad bytes ${hex(lo)} ${hex(hi)} are ${tC.toFixed(2)} °C in 1/16 °C LSBs.`;
  }, [lo, hi, tC]);

  return (
    <ProtocolBench
      lab={lab}
      playing={play}
      bitHz={14}
      trace={trace}
      meters={
        <>
          <Meter label="Temp" value={`${tC.toFixed(2)} °C`} />
          <Meter label="LSB" value={hex(lo)} />
          <Meter label="MSB" value={hex(hi)} />
        </>
      }
      controls={
        <>
          <ToggleControl label="Run" checked={play} on="play" off="pause" onCheckedChange={setPlay} />
          <LinearControl
            label="Temperature"
            value={tC}
            display={`${tC.toFixed(1)} °C`}
            min={-10}
            max={85}
            step={0.0625}
            onChange={setTC}
            hint="DS18B20 scratchpad is signed 12-bit, 0.0625 °C/bit."
          />
        </>
      }
      insight={<p>{insight}</p>}
      drawScene={(ctx, _i, lv) => {
        icChip(ctx, 40, 40, 170, 100, "MCU", "open-drain DQ");
        icChip(ctx, 560, 40, 200, 100, "DS18B20", `${tC.toFixed(1)} °C`);
        pinLed(ctx, 210, 88, lv.DQ! > 0.5, "DQ", "left");
        pinLed(ctx, 560, 88, lv.DQ! > 0.5, "DQ", "right");
        wire(ctx, [{ x: 220, y: 88 }, { x: 550, y: 88 }], 3, lv.DQ! > 0.5 ? Ink.electron : Ink.copper);
        wire(ctx, [{ x: 390, y: 88 }, { x: 390, y: 36 }], 2, Ink.pin);
        label(ctx, "Rp 4.7 kΩ", 390, 24, { size: 11 });
        label(ctx, "reset → presence → skip ROM → read scratchpad", 400, 170, { size: 12 });
      }}
    />
  );
}
