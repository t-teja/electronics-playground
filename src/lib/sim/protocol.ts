/** Shared bit-accurate traces for the bus benches. Values: 0, 1, 0.5 = high-Z. */

export type Field = { start: number; end: number; label: string; detail?: string };

export type Lane = { name: string; samples: number[] };

export type Trace = {
  lanes: Lane[];
  fields: Field[];
  note?: string;
};

export function hex(n: number, w = 2) {
  return `0x${n.toString(16).toUpperCase().padStart(w, "0")}`;
}

export function bitsLsb(n: number, width: number) {
  const out: number[] = [];
  for (let i = 0; i < width; i++) out.push((n >> i) & 1);
  return out;
}

export function bitsMsb(n: number, width: number) {
  const out: number[] = [];
  for (let i = width - 1; i >= 0; i--) out.push((n >> i) & 1);
  return out;
}

class Builder {
  names: string[];
  lanes: Record<string, number[]>;
  fields: Field[] = [];
  constructor(names: string[], idle: Record<string, number>) {
    this.names = names;
    this.lanes = {};
    for (const n of names) this.lanes[n] = [];
    this.idle = idle;
  }
  idle: Record<string, number>;
  get i() {
    return this.lanes[this.names[0]!]!.length;
  }
  push(partial: Record<string, number>, n = 1) {
    for (let k = 0; k < n; k++) {
      for (const name of this.names) {
        const v = partial[name] ?? this.idle[name] ?? 1;
        this.lanes[name]!.push(v);
      }
    }
  }
  mark(label: string, start: number, detail?: string) {
    this.fields.push({ start, end: this.i, label, detail });
  }
  pad(n: number) {
    this.push({}, n);
  }
  done(): Trace {
    return {
      lanes: this.names.map((name) => ({ name, samples: this.lanes[name]! })),
      fields: this.fields,
    };
  }
}

export function uartTrace(opts: {
  tx: number;
  rx?: number;
  parity?: "none" | "even" | "odd";
  stopBits?: 1 | 2;
}): Trace {
  const stop = opts.stopBits ?? 1;
  const b = new Builder(["TX", "RX"], { TX: 1, RX: 1 });
  b.pad(4);
  const emit = (lane: "TX" | "RX", byte: number, tag: string) => {
    const start = b.i;
    b.push({ [lane]: 0 }, 2);
    b.mark("START", start);
    const dataStart = b.i;
    for (const bit of bitsLsb(byte, 8)) b.push({ [lane]: bit }, 2);
    b.mark("DATA " + hex(byte), dataStart, tag);
    if (opts.parity && opts.parity !== "none") {
      const ones = bitsLsb(byte, 8).reduce((a, d) => a + d, 0);
      const p = opts.parity === "even" ? ones % 2 : 1 - (ones % 2);
      const ps = b.i;
      b.push({ [lane]: p }, 2);
      b.mark("PARITY", ps);
    }
    const ss = b.i;
    b.push({ [lane]: 1 }, 2 * stop);
    b.mark("STOP", ss);
  };
  emit("TX", opts.tx, "MCU → device, LSB first, idle high");
  if (opts.rx !== undefined) emit("RX", opts.rx, "device → MCU");
  b.pad(4);
  return b.done();
}

export function i2cTrace(opts: {
  addr: number;
  write: boolean;
  payload: number[];
  ack: boolean;
  stretch?: boolean;
}): Trace {
  const b = new Builder(["SCL", "SDA"], { SCL: 1, SDA: 1 });
  b.pad(3);
  const startI = b.i;
  b.push({ SCL: 1, SDA: 1 }, 1);
  b.push({ SCL: 1, SDA: 0 }, 2);
  b.push({ SCL: 0, SDA: 0 }, 1);
  b.mark("START", startI, "SDA falls while SCL is high");

  const bit = (sda: number, stretch = false) => {
    b.push({ SCL: 0, SDA: sda }, 1);
    if (stretch) b.push({ SCL: 0, SDA: sda }, 3);
    b.push({ SCL: 1, SDA: sda }, 2);
    b.push({ SCL: 0, SDA: sda }, 1);
  };

  const byte = (v: number, label: string, ack: boolean, stretch = false) => {
    const s = b.i;
    for (const d of bitsMsb(v, 8)) bit(d);
    bit(ack ? 0 : 1, stretch);
    b.mark(label, s, ack ? "ACK (slave pulls SDA low)" : "NACK");
  };

  byte(((opts.addr & 0x7f) << 1) | (opts.write ? 0 : 1), `ADDR ${hex(opts.addr, 2)} ${opts.write ? "W" : "R"}`, opts.ack);
  if (opts.ack) {
    opts.payload.forEach((p, i) => {
      byte(p, `DATA ${hex(p)}`, true, Boolean(opts.stretch) && i === 0);
    });
  }
  const stopI = b.i;
  b.push({ SCL: 0, SDA: 0 }, 1);
  b.push({ SCL: 1, SDA: 0 }, 2);
  b.push({ SCL: 1, SDA: 1 }, 2);
  b.mark("STOP", stopI, "SDA rises while SCL is high");
  b.pad(3);
  return b.done();
}

export function spiTrace(opts: {
  mosi: number;
  miso: number;
  mode: 0 | 1 | 2 | 3;
}): Trace {
  const cpol = opts.mode === 2 || opts.mode === 3 ? 1 : 0;
  const cpha = opts.mode === 1 || opts.mode === 3 ? 1 : 0;
  const b = new Builder(["CS", "SCK", "MOSI", "MISO"], { CS: 1, SCK: cpol, MOSI: 0, MISO: 0 });
  b.pad(2);
  const cs = b.i;
  b.push({ CS: 0, SCK: cpol }, 2);
  b.mark("CS↓", cs, "slave selected, active low");
  const mos = bitsMsb(opts.mosi, 8);
  const mis = bitsMsb(opts.miso, 8);
  for (let i = 0; i < 8; i++) {
    const s = b.i;
    const d0 = mos[i]!;
    const d1 = mis[i]!;
    if (cpha === 0) {
      b.push({ CS: 0, SCK: cpol, MOSI: d0, MISO: d1 }, 1);
      b.push({ CS: 0, SCK: 1 - cpol, MOSI: d0, MISO: d1 }, 2);
      b.push({ CS: 0, SCK: cpol, MOSI: d0, MISO: d1 }, 1);
    } else {
      b.push({ CS: 0, SCK: 1 - cpol, MOSI: d0, MISO: d1 }, 1);
      b.push({ CS: 0, SCK: cpol, MOSI: d0, MISO: d1 }, 2);
      b.push({ CS: 0, SCK: 1 - cpol, MOSI: d0, MISO: d1 }, 1);
    }
    b.mark(`bit ${7 - i}`, s, `MOSI ${d0}  MISO ${d1}`);
  }
  const cse = b.i;
  b.push({ CS: 1, SCK: cpol }, 3);
  b.mark("CS↑", cse, "slave released");
  return b.done();
}

function crc15Can(bits: number[]) {
  let crc = 0;
  for (const bit of bits) {
    const mix = ((crc >> 14) & 1) ^ bit;
    crc = (crc << 1) & 0x7fff;
    if (mix) crc ^= 0x4599;
  }
  return crc;
}

function stuff(bits: number[]) {
  const out: { v: number; stuffed: boolean }[] = [];
  let run = 0;
  let last = -1;
  for (const v of bits) {
    if (v === last) run += 1;
    else {
      run = 1;
      last = v;
    }
    out.push({ v, stuffed: false });
    if (run === 5) {
      const inv = 1 - v;
      out.push({ v: inv, stuffed: true });
      last = inv;
      run = 1;
    }
  }
  return out;
}

export function canTrace(opts: {
  idA: number;
  idB: number;
  data: number[];
}): Trace {
  const winner = Math.min(opts.idA & 0x7ff, opts.idB & 0x7ff);
  const loser = Math.max(opts.idA & 0x7ff, opts.idB & 0x7ff);
  const payload = opts.data.slice(0, 8);
  const hdr: number[] = [0];
  hdr.push(...bitsMsb(winner, 11));
  hdr.push(0, 0, 0);
  hdr.push(...bitsMsb(payload.length, 4));
  for (const p of payload) hdr.push(...bitsMsb(p, 8));
  const crc = crc15Can(hdr);
  const unstuffed = [...hdr, ...bitsMsb(crc, 15)];
  const stuffed = stuff(unstuffed);

  const b = new Builder(["CANH", "CANL", "bus"], { CANH: 0.5, CANL: 0.5, bus: 1 });
  const rec = () => b.push({ CANH: 0.45, CANL: 0.45, bus: 1 }, 1);
  const dom = () => b.push({ CANH: 1, CANL: 0, bus: 0 }, 1);
  b.pad(4);
  const put = (v: number) => (v ? rec() : dom());

  let i = 0;
  const sof = b.i;
  put(stuffed[i++]!.v);
  b.mark("SOF", sof, "dominant start of frame");

  const idS = b.i;
  for (let k = 0; k < 11 && i < stuffed.length; ) {
    const cell = stuffed[i++]!;
    put(cell.v);
    if (!cell.stuffed) k += 1;
  }
  b.mark(`ID ${hex(winner, 3)} wins`, idS, loser !== winner ? `${hex(loser, 3)} lost arbitration` : "single talker");

  const ctrl = b.i;
  while (i < stuffed.length - 15) {
    put(stuffed[i++]!.v);
  }
  b.mark(`DLC ${payload.length}`, ctrl);

  const crcS = b.i;
  for (let k = 0; k < 15; k++) put(stuffed[i++]!.v);
  b.mark("CRC", crcS, hex(crc, 4));

  const ackS = b.i;
  rec();
  b.mark("CRC del", ackS);
  const ack = b.i;
  dom();
  rec();
  b.mark("ACK", ack, "receiver drives dominant");
  const eof = b.i;
  for (let k = 0; k < 7; k++) rec();
  b.mark("EOF", eof, "seven recessive bits");
  b.pad(4);
  return b.done();
}

function linPid(id: number) {
  const i = id & 0x3f;
  const p0 = (i ^ (i >> 1) ^ (i >> 2) ^ (i >> 4)) & 1;
  const p1 = (~((i >> 1) ^ (i >> 3) ^ (i >> 4) ^ (i >> 5))) & 1;
  return i | (p0 << 6) | (p1 << 7);
}

function linChecksum(pid: number, data: number[], enhanced: boolean) {
  let s = enhanced ? pid : 0;
  for (const d of data) s += d;
  while (s > 0xff) s = (s & 0xff) + (s >> 8);
  return (~s) & 0xff;
}

function uartByteOn(builder: Builder, lane: string, byte: number, idle: Record<string, number>, dataLabel?: string) {
  const start = builder.i;
  builder.push({ ...idle, [lane]: 0 }, 2);
  builder.mark("START", start);
  const ds = builder.i;
  for (const bit of bitsLsb(byte, 8)) builder.push({ ...idle, [lane]: bit }, 2);
  builder.mark(dataLabel ?? hex(byte), ds);
  const ss = builder.i;
  builder.push({ ...idle, [lane]: 1 }, 2);
  builder.mark("STOP", ss);
}

export function linTrace(opts: { id: number; data: number[] }): Trace {
  const pid = linPid(opts.id);
  const data = opts.data.slice(0, 8);
  const chk = linChecksum(pid, data, true);
  const b = new Builder(["LIN"], { LIN: 1 });
  b.pad(3);
  const br = b.i;
  b.push({ LIN: 0 }, 13);
  b.mark("BREAK", br, "≥13 dominant bits, wakes the bus");
  const del = b.i;
  b.push({ LIN: 1 }, 2);
  b.mark("DEL", del);
  uartByteOn(b, "LIN", 0x55, { LIN: 1 }, "SYNC 0x55");
  uartByteOn(b, "LIN", pid, { LIN: 1 }, `PID ${hex(pid)}`);
  for (const d of data) uartByteOn(b, "LIN", d, { LIN: 1 }, `DATA ${hex(d)}`);
  uartByteOn(b, "LIN", chk, { LIN: 1 }, `CHK ${hex(chk)}`);
  b.pad(3);
  return b.done();
}

export function oneWireTrace(opts: { scratch: number[] }): Trace {
  const b = new Builder(["DQ"], { DQ: 1 });
  b.pad(2);
  const rst = b.i;
  b.push({ DQ: 0 }, 16);
  b.push({ DQ: 1 }, 2);
  b.mark("RESET", rst, "master holds 480 µs");
  const pr = b.i;
  b.push({ DQ: 0 }, 6);
  b.push({ DQ: 1 }, 4);
  b.mark("PRESENCE", pr, "slave pulls for 60–240 µs");

  const slot = (bit: number) => {
    if (bit) {
      b.push({ DQ: 0 }, 1);
      b.push({ DQ: 1 }, 4);
    } else {
      b.push({ DQ: 0 }, 4);
      b.push({ DQ: 1 }, 1);
    }
  };
  const byte = (v: number, label: string) => {
    const s = b.i;
    for (const d of bitsLsb(v, 8)) slot(d);
    b.mark(label, s);
  };
  byte(0xcc, "SKIP ROM 0xCC");
  byte(0xbe, "READ SP 0xBE");
  opts.scratch.forEach((p, i) => byte(p, `T[${i}] ${hex(p)}`));
  b.pad(3);
  return b.done();
}

export function rs485Trace(opts: { byte: number; collision: boolean }): Trace {
  const b = new Builder(["DE", "A", "B"], { DE: 0, A: 0.5, B: 0.5 });
  b.pad(3);
  const drive = (d: number, n = 1) => {
    if (opts.collision) {
      b.push({ DE: 1, A: 0.5, B: 0.5 }, n);
    } else {
      b.push({ DE: 1, A: d, B: 1 - d }, n);
    }
  };
  const de = b.i;
  drive(1, 2);
  b.mark("DE↑", de, "driver enabled, A/B leave high-Z");
  const st = b.i;
  drive(0, 2);
  b.mark("START", st);
  const ds = b.i;
  for (const bit of bitsLsb(opts.byte, 8)) drive(bit, 2);
  b.mark("DATA " + hex(opts.byte), ds, "A follows TX, B is inverted");
  const sp = b.i;
  drive(1, 2);
  b.mark("STOP", sp);
  const dz = b.i;
  b.push({ DE: 0, A: 0.5, B: 0.5 }, 4);
  b.mark("DE↓", dz, "line idles in failsafe / bias");
  return b.done();
}

export function fieldAt(trace: Trace, i: number): Field | null {
  for (const f of trace.fields) {
    if (i >= f.start && i < f.end) return f;
  }
  return null;
}

export function laneValue(trace: Trace, name: string, i: number) {
  const lane = trace.lanes.find((l) => l.name === name);
  if (!lane || lane.samples.length === 0) return 1;
  const idx = Math.max(0, Math.min(lane.samples.length - 1, i));
  return lane.samples[idx] ?? 1;
}
