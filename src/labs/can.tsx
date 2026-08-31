import { useMemo, useState } from "react";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { ProtocolBench } from "@/labs/protocol-bench";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { Ink, label, wire } from "@/lib/sim/draw";
import { icChip, pinLed } from "@/lib/sim/protocol-draw";
import { canTrace, hex } from "@/lib/sim/protocol";

export function CanLab() {
  const lab = LAB_BY_SLUG.can!;
  const [idA, setIdA] = useState(0x123);
  const [idB, setIdB] = useState(0x456);
  const [data, setData] = useState(0x42);
  const [play, setPlay] = useState(true);
  const winner = Math.min(idA, idB);
  const trace = useMemo(() => canTrace({ idA, idB, data: [data] }), [idA, idB, data]);

  const insight = useMemo(() => {
    const same = idA === idB;
    return `CAN is wired-AND on a differential pair. Dominant (0) beats recessive (1). ${same ? "One talker." : `Node A ${hex(idA, 3)} vs node B ${hex(idB, 3)}: the lower ID wins arbitration bit by bit. Winner ${hex(winner, 3)} keeps sending; the loser backs off.`} After five identical bits the transmitter inserts a stuff bit.`;
  }, [idA, idB, winner]);

  return (
    <ProtocolBench
      lab={lab}
      playing={play}
      bitHz={22}
      trace={trace}
      meters={
        <>
          <Meter label="Winner ID" value={hex(winner, 3)} />
          <Meter label="DLC" value="1" />
          <Meter label="Data" value={hex(data)} />
        </>
      }
      controls={
        <>
          <ToggleControl label="Run" checked={play} on="play" off="pause" onCheckedChange={setPlay} />
          <LinearControl label="Node A ID" value={idA} display={hex(idA, 3)} min={0} max={0x7ff} step={1} onChange={setIdA} hint="11-bit standard identifier. Lower wins." />
          <LinearControl label="Node B ID" value={idB} display={hex(idB, 3)} min={0} max={0x7ff} step={1} onChange={setIdB} />
          <LinearControl label="Payload" value={data} display={hex(data)} min={0} max={255} step={1} onChange={setData} />
        </>
      }
      insight={<p>{insight}</p>}
      drawScene={(ctx, _i, lv) => {
        icChip(ctx, 40, 28, 150, 100, "ECU A", hex(idA, 3));
        icChip(ctx, 610, 28, 150, 100, "ECU B", hex(idB, 3));
        pinLed(ctx, 190, 56, lv.CANH! > 0.7, "CANH", "left");
        pinLed(ctx, 190, 92, lv.CANL! < 0.3, "CANL", "left");
        pinLed(ctx, 610, 56, lv.CANH! > 0.7, "CANH", "right");
        pinLed(ctx, 610, 92, lv.CANL! < 0.3, "CANL", "right");
        wire(ctx, [{ x: 200, y: 56 }, { x: 600, y: 56 }], 3, lv.bus! < 0.5 ? Ink.electron : Ink.copper);
        wire(ctx, [{ x: 200, y: 92 }, { x: 600, y: 92 }], 3, lv.bus! < 0.5 ? Ink.copper : Ink.pin);
        label(ctx, lv.bus! < 0.5 ? "DOMINANT  0" : "recessive  1", 400, 74, {
          size: 12,
          color: lv.bus! < 0.5 ? Ink.electron : Ink.muted,
          mono: true,
        });
        label(ctx, "twisted pair  ·  120 Ω at each end  ·  multi-master", 400, 168, { size: 11 });
      }}
    />
  );
}
