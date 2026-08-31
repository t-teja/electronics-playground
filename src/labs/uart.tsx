import { useMemo, useState } from "react";
import { Control, LinearControl, Meter, Segmented, ToggleControl } from "@/components/control";
import { ProtocolBench } from "@/labs/protocol-bench";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { Ink, label, wire } from "@/lib/sim/draw";
import { icChip, pinLed } from "@/lib/sim/protocol-draw";
import { hex, uartTrace } from "@/lib/sim/protocol";

export function UartLab() {
  const lab = LAB_BY_SLUG.uart!;
  const [tx, setTx] = useState(0x41);
  const [echo, setEcho] = useState(true);
  const [parity, setParity] = useState<"none" | "even" | "odd">("none");
  const [baud, setBaud] = useState(9600);
  const [play, setPlay] = useState(true);
  const rx = echo ? (tx ^ 0x20) : undefined;
  const trace = useMemo(() => uartTrace({ tx, rx, parity, stopBits: 1 }), [tx, rx, parity]);

  const insight = useMemo(() => {
    const bits = 1 + 8 + (parity === "none" ? 0 : 1) + 1;
    return `Idle is high. A start bit (low) opens the frame, then 8 data bits LSB-first${parity === "none" ? "" : `, ${parity} parity`}, then a stop bit (high). At ${baud} baud a character lasts ${(bits / baud * 1000).toFixed(2)} ms. Two wires, no clock: both ends must agree on the rate.`;
  }, [baud, parity]);

  return (
    <ProtocolBench
      lab={lab}
      playing={play}
      bitHz={Math.max(8, baud / 120)}
      trace={trace}
      meters={
        <>
          <Meter label="Baud" value={`${baud}`} />
          <Meter label="TX" value={hex(tx)} />
          <Meter label="RX" value={echo ? hex(rx!) : "—"} />
        </>
      }
      controls={
        <>
          <ToggleControl label="Run" checked={play} on="play" off="pause" onCheckedChange={setPlay} />
          <LinearControl label="Baud" value={baud} display={`${baud} Bd`} min={1200} max={115200} step={100} onChange={setBaud} />
          <LinearControl label="TX byte" value={tx} display={`${hex(tx)}  '${String.fromCharCode(tx)}'`} min={32} max={126} step={1} onChange={setTx} />
          <ToggleControl label="Echo on RX" checked={echo} on="on" off="off" onCheckedChange={setEcho} />
          <Control label="Parity">
            <Segmented
              value={parity}
              onChange={setParity}
              options={[
                { id: "none", label: "none" },
                { id: "even", label: "even" },
                { id: "odd", label: "odd" },
              ]}
            />
          </Control>
        </>
      }
      insight={<p>{insight}</p>}
      drawScene={(ctx, _i, lv) => {
        icChip(ctx, 40, 36, 150, 88, "MCU", "async TX/RX");
        icChip(ctx, 610, 36, 150, 88, "FTDI", "USB-UART");
        pinLed(ctx, 190, 62, lv.TX! > 0.5, "TX", "left");
        pinLed(ctx, 190, 92, lv.RX! > 0.5, "RX", "left");
        pinLed(ctx, 610, 62, lv.RX! > 0.5, "RX", "right");
        pinLed(ctx, 610, 92, lv.TX! > 0.5, "TX", "right");
        wire(ctx, [{ x: 200, y: 62 }, { x: 600, y: 62 }], 2, lv.TX! > 0.5 ? Ink.electron : Ink.copper);
        wire(ctx, [{ x: 200, y: 92 }, { x: 600, y: 92 }], 2, lv.RX! > 0.5 ? Ink.electron : Ink.copper);
        label(ctx, "idle high · LSB first · no shared clock", 400, 150, { size: 12 });
        label(ctx, `${baud} baud`, 400, 168, { size: 11, mono: true });
      }}
    />
  );
}
