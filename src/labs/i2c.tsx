import { useMemo, useState } from "react";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { ProtocolBench } from "@/labs/protocol-bench";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { Ink, junction, label, wire } from "@/lib/sim/draw";
import { icChip, pinLed } from "@/lib/sim/protocol-draw";
import { hex, i2cTrace } from "@/lib/sim/protocol";

export function I2cLab() {
  const lab = LAB_BY_SLUG.i2c!;
  const [addr, setAddr] = useState(0x50);
  const [data, setData] = useState(0x3c);
  const [ack, setAck] = useState(true);
  const [stretch, setStretch] = useState(false);
  const [play, setPlay] = useState(true);
  const trace = useMemo(
    () => i2cTrace({ addr, write: true, payload: [0x00, data], ack, stretch }),
    [addr, data, ack, stretch],
  );

  const insight = useMemo(() => {
    if (!ack) {
      return `NACK. Address ${hex(addr)} did not pull SDA low on the 9th clock. Open-drain buses idle high through pull-ups; a missing ACK means nobody is home, or the slave is busy.`;
    }
    return `Write to ${hex(addr)}: START, 7-bit address + W, ACK, register 0x00, ACK, data ${hex(data)}, ACK, STOP. SDA only changes while SCL is low, except START/STOP. ${stretch ? "The slave stretches SCL low after the first data byte — legal wait." : "Both edges of SCL are the master's."}`;
  }, [ack, addr, data, stretch]);

  return (
    <ProtocolBench
      lab={lab}
      playing={play}
      bitHz={18}
      trace={trace}
      meters={
        <>
          <Meter label="Addr" value={hex(addr)} />
          <Meter label="Data" value={hex(data)} />
          <Meter label="9th bit" value={ack ? "ACK" : "NACK"} />
        </>
      }
      controls={
        <>
          <ToggleControl label="Run" checked={play} on="play" off="pause" onCheckedChange={setPlay} />
          <LinearControl label="7-bit address" value={addr} display={hex(addr)} min={0x08} max={0x77} step={1} onChange={setAddr} />
          <LinearControl label="Payload" value={data} display={hex(data)} min={0} max={255} step={1} onChange={setData} />
          <ToggleControl label="Slave ACK" checked={ack} on="ACK" off="NACK" onCheckedChange={setAck} />
          <ToggleControl label="Clock stretch" checked={stretch} on="on" off="off" onCheckedChange={setStretch} />
        </>
      }
      insight={<p>{insight}</p>}
      drawScene={(ctx, _i, lv) => {
        icChip(ctx, 30, 28, 140, 96, "MCU", "open-drain master");
        icChip(ctx, 430, 28, 130, 96, "EEPROM", hex(addr));
        icChip(ctx, 600, 28, 130, 96, "RTC", "0x68");
        pinLed(ctx, 170, 56, lv.SCL! > 0.5, "SCL", "left");
        pinLed(ctx, 170, 88, lv.SDA! > 0.5, "SDA", "left");
        wire(ctx, [{ x: 180, y: 56 }, { x: 760, y: 56 }], 2, lv.SCL! > 0.5 ? Ink.electron : Ink.copper);
        wire(ctx, [{ x: 180, y: 88 }, { x: 760, y: 88 }], 2, lv.SDA! > 0.5 ? Ink.electron : Ink.copper);
        junction(ctx, 495, 56);
        junction(ctx, 495, 88);
        junction(ctx, 665, 56);
        junction(ctx, 665, 88);
        wire(ctx, [{ x: 720, y: 56 }, { x: 720, y: 24 }], 2, Ink.pin);
        wire(ctx, [{ x: 748, y: 88 }, { x: 748, y: 24 }], 2, Ink.pin);
        label(ctx, "Rp", 720, 14, { size: 10 });
        label(ctx, "Rp", 748, 14, { size: 10 });
        label(ctx, "open-drain + pull-ups  ·  START/STOP are conditions, not bits", 400, 160, { size: 11 });
      }}
    />
  );
}
