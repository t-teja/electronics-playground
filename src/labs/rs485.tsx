import { useMemo, useState } from "react";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { ProtocolBench } from "@/labs/protocol-bench";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { Ink, label, wire } from "@/lib/sim/draw";
import { icChip, pinLed } from "@/lib/sim/protocol-draw";
import { hex, rs485Trace } from "@/lib/sim/protocol";

export function Rs485Lab() {
  const lab = LAB_BY_SLUG.rs485!;
  const [byte, setByte] = useState(0x55);
  const [collision, setCollision] = useState(false);
  const [play, setPlay] = useState(true);
  const trace = useMemo(() => rs485Trace({ byte, collision }), [byte, collision]);

  const insight = useMemo(() => {
    if (collision) {
      return `Two drivers enabled. A and B sit in the middle, neither a clean 0 nor 1. RS-485 is a party line: only one DE (driver enable) may be high. UART framing still rides on top — this is just the physical layer.`;
    }
    return `Same start/data/stop bits as UART, but on a differential pair. DE high means A follows TX and B is inverted. Receivers look at A−B, so a few volts of ground shift do not matter. Multi-drop: dozens of nodes, one talker at a time.`;
  }, [collision]);

  return (
    <ProtocolBench
      lab={lab}
      playing={play}
      bitHz={16}
      trace={trace}
      meters={
        <>
          <Meter label="Byte" value={hex(byte)} />
          <Meter label="DE" value={collision ? "conflict" : "one talker"} />
          <Meter label="A−B" value={collision ? "invalid" : "valid"} />
        </>
      }
      controls={
        <>
          <ToggleControl label="Run" checked={play} on="play" off="pause" onCheckedChange={setPlay} />
          <LinearControl label="UART byte" value={byte} display={hex(byte)} min={0} max={255} step={1} onChange={setByte} />
          <ToggleControl
            label="Second driver"
            checked={collision}
            on="collision"
            off="idle"
            onCheckedChange={setCollision}
          />
        </>
      }
      insight={<p>{insight}</p>}
      drawScene={(ctx, _i, lv) => {
        icChip(ctx, 24, 20, 140, 88, "Node 1", "DE master");
        icChip(ctx, 330, 20, 140, 88, "Node 2", "listen");
        icChip(ctx, 636, 20, 140, 88, "Node 3", collision ? "DE fight" : "listen");
        pinLed(ctx, 164, 48, lv.A! > 0.6, "A", "left");
        pinLed(ctx, 164, 76, lv.B! > 0.6, "B", "left");
        wire(ctx, [{ x: 174, y: 48 }, { x: 760, y: 48 }], 3, collision ? Ink.heat : lv.A! > 0.6 ? Ink.electron : Ink.copper);
        wire(ctx, [{ x: 174, y: 76 }, { x: 760, y: 76 }], 3, collision ? Ink.heat : lv.B! > 0.6 ? Ink.pin : Ink.copper);
        label(ctx, collision ? "bus fight — A/B undefined" : "A = TX,  B = ~TX,  receivers use A−B", 400, 160, {
          size: 12,
          color: collision ? Ink.heat : Ink.muted,
        });
      }}
    />
  );
}
