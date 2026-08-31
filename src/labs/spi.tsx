import { useMemo, useState } from "react";
import { Control, LinearControl, Meter, Segmented, ToggleControl } from "@/components/control";
import { ProtocolBench } from "@/labs/protocol-bench";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { Ink, label, wire } from "@/lib/sim/draw";
import { icChip, pinLed } from "@/lib/sim/protocol-draw";
import { hex, spiTrace } from "@/lib/sim/protocol";

export function SpiLab() {
  const lab = LAB_BY_SLUG.spi!;
  const [mosi, setMosi] = useState(0xa5);
  const [miso, setMiso] = useState(0x3c);
  const [mode, setMode] = useState<"0" | "1" | "2" | "3">("0");
  const [play, setPlay] = useState(true);
  const m = Number(mode) as 0 | 1 | 2 | 3;
  const trace = useMemo(() => spiTrace({ mosi, miso, mode: m }), [mosi, miso, m]);

  const insight = useMemo(() => {
    const cpol = m >= 2 ? "high" : "low";
    const edge = m % 2 === 0 ? "leading (first edge)" : "trailing (second edge)";
    return `Full duplex: MOSI shifts ${hex(mosi)} while MISO returns ${hex(miso)}. CS is active-low. Mode ${m}: clock idles ${cpol}, data is sampled on the ${edge}. Four wires, one master, as many CS lines as slaves.`;
  }, [m, mosi, miso]);

  return (
    <ProtocolBench
      lab={lab}
      playing={play}
      bitHz={16}
      trace={trace}
      meters={
        <>
          <Meter label="Mode" value={`CPOL/CPHA ${m}`} />
          <Meter label="MOSI" value={hex(mosi)} />
          <Meter label="MISO" value={hex(miso)} />
        </>
      }
      controls={
        <>
          <ToggleControl label="Run" checked={play} on="play" off="pause" onCheckedChange={setPlay} />
          <Control label="SPI mode">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { id: "0", label: "Mode 0" },
                { id: "1", label: "Mode 1" },
                { id: "2", label: "Mode 2" },
                { id: "3", label: "Mode 3" },
              ]}
            />
          </Control>
          <LinearControl label="MOSI byte" value={mosi} display={hex(mosi)} min={0} max={255} step={1} onChange={setMosi} />
          <LinearControl label="MISO byte" value={miso} display={hex(miso)} min={0} max={255} step={1} onChange={setMiso} />
        </>
      }
      insight={<p>{insight}</p>}
      drawScene={(ctx, _i, lv) => {
        icChip(ctx, 36, 24, 160, 150, "MCU", "SPI master");
        icChip(ctx, 600, 24, 160, 150, "Flash", "slave");
        const pins = [
          ["CS", 50, lv.CS! < 0.5],
          ["SCK", 78, lv.SCK! > 0.5],
          ["MOSI", 106, lv.MOSI! > 0.5],
          ["MISO", 134, lv.MISO! > 0.5],
        ] as const;
        for (const [name, y, on] of pins) {
          pinLed(ctx, 196, y, on, name, "left");
          pinLed(ctx, 600, y, on, name, "right");
          wire(ctx, [{ x: 206, y }, { x: 590, y }], 2, on ? Ink.electron : Ink.copper);
        }
        label(ctx, "CS active low · MOSI and MISO move together (full duplex)", 400, 188, { size: 11 });
      }}
    />
  );
}
