import { useMemo, useState } from "react";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { ProtocolBench } from "@/labs/protocol-bench";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { Ink, label, wire } from "@/lib/sim/draw";
import { icChip, pinLed } from "@/lib/sim/protocol-draw";
import { hex, linTrace } from "@/lib/sim/protocol";

export function LinLab() {
  const lab = LAB_BY_SLUG.lin!;
  const [id, setId] = useState(0x10);
  const [d0, setD0] = useState(0x01);
  const [d1, setD1] = useState(0xaa);
  const [play, setPlay] = useState(true);
  const trace = useMemo(() => linTrace({ id, data: [d0, d1] }), [id, d0, d1]);

  const insight = useMemo(() => {
    return `LIN is a cheap single-wire bus. The master always owns the schedule: a 13-bit BREAK wakes everyone, SYNC 0x55 lets slaves recover baud, then a protected ID. Slave ${hex(id)} answers with two data bytes and an enhanced checksum. No arbitration — if two slaves speak, the frame is garbage.`;
  }, [id]);

  return (
    <ProtocolBench
      lab={lab}
      playing={play}
      bitHz={18}
      trace={trace}
      meters={
        <>
          <Meter label="PID id" value={hex(id)} />
          <Meter label="D0" value={hex(d0)} />
          <Meter label="D1" value={hex(d1)} />
        </>
      }
      controls={
        <>
          <ToggleControl label="Run" checked={play} on="play" off="pause" onCheckedChange={setPlay} />
          <LinearControl label="Frame ID" value={id} display={hex(id)} min={0} max={0x3f} step={1} onChange={setId} hint="6-bit ID. Two parity bits are folded into the PID." />
          <LinearControl label="Slave D0" value={d0} display={hex(d0)} min={0} max={255} step={1} onChange={setD0} />
          <LinearControl label="Slave D1" value={d1} display={hex(d1)} min={0} max={255} step={1} onChange={setD1} />
        </>
      }
      insight={<p>{insight}</p>}
      drawScene={(ctx, _i, lv) => {
        icChip(ctx, 40, 36, 160, 100, "LIN master", "body controller");
        icChip(ctx, 600, 36, 160, 100, "Slave", `id ${hex(id)}`);
        pinLed(ctx, 200, 84, lv.LIN! > 0.5, "LIN", "left");
        pinLed(ctx, 600, 84, lv.LIN! > 0.5, "LIN", "right");
        wire(ctx, [{ x: 210, y: 84 }, { x: 590, y: 84 }], 3, lv.LIN! > 0.5 ? Ink.electron : Ink.copper);
        label(ctx, "single wire  ·  12 V recessive  ·  master schedule", 400, 160, { size: 12 });
      }}
    />
  );
}
