import type { LabMeta } from "./catalog";

export const CATALOG_CHUNK_B2: LabMeta[] = [
  {
    slug: "spi",
    badge: "new",
    name: "SPI",
    symbol: "SPI",
    category: "protocol",
    tagline: "A clock, two data lines, one chip-select",
    summary:
      "Full duplex. CS low, then MOSI and MISO shift on the same clocks. Four modes from CPOL and CPHA. Fast, simple, one slave per CS.",
    principle:
      "Synchronous. The master owns SCK. Mode 0 idles clock low and samples on the rising edge. MOSI and MISO move together so a write is always also a read.",
    formula: "mode = (CPOL << 1) | CPHA",
    uses: [
      "Flash, SD cards, and displays",
      "ADCs and DACs next to an MCU",
      "Shift-register LED drivers",
      "IMU and radio modules",
    ],
  },
  {
    slug: "can",
    badge: "new",
    name: "CAN",
    symbol: "CAN",
    category: "protocol",
    tagline: "The quieter ID keeps talking",
    summary:
      "Multi-master on a twisted pair. Dominant 0 beats recessive 1. During arbitration the lowest 11-bit ID wins; losers back off without a collision retry.",
    principle:
      "Wired-AND on CANH/CANL. Transmitters sample the bus: a recessive bit they sent that reads dominant means they lost. Stuff bits break runs of five. CRC-15 then ACK from any healthy receiver.",
    formula: "lower 11-bit ID wins arbitration",
    uses: [
      "Vehicle powertrain and body buses",
      "Industrial CANopen and J1939",
      "Battery management systems",
      "Robot arms and medical carts",
    ],
  },
  {
    slug: "lin",
    badge: "new",
    name: "LIN",
    symbol: "LIN",
    category: "protocol",
    tagline: "One wire, one scheduler",
    summary:
      "A cheap automotive sub-bus. The master sends BREAK, SYNC 0x55, and a protected ID. The matching slave fills in data and a checksum. No arbitration.",
    principle:
      "UART bytes on a single 12 V wire. BREAK is ≥13 dominant bits so slaves can recover baud from the following 0x55. PID folds two parity bits into a 6-bit ID. Enhanced checksum covers PID plus data.",
    formula: "PID = ID[5:0] + parity",
    uses: [
      "Window lifts, mirrors, and HVAC flaps",
      "Seat and steering-wheel switches",
      "Rain sensors and interior lighting",
      "Anywhere CAN is too expensive",
    ],
  },
  {
    slug: "one-wire",
    badge: "new",
    name: "1-Wire",
    symbol: "1W",
    category: "protocol",
    tagline: "Power, ground, and data on two pins",
    summary:
      "Open-drain DQ. A long reset, a presence pulse, then time-slotted bits. Short low is 1, long low is 0. DS18B20 temperature lives in the scratchpad as 1/16 °C.",
    principle:
      "The master starts every slot. Parasitic-power devices steal energy while the line is high. ROM commands address one of many chips on the same pull-up; SKIP ROM talks to a lone sensor.",
    formula: "T = raw / 16  (°C)",
    uses: [
      "DS18B20 temperature chains",
      "iButton identity tokens",
      "Board serial-number EEPROMs",
      "Simple device authentication",
    ],
  },
  {
    slug: "rs485",
    badge: "new",
    name: "RS-485",
    symbol: "485",
    category: "protocol",
    tagline: "UART, but differential and multi-drop",
    summary:
      "Same start/data/stop bits as UART, driven onto A and B. Only one driver enable at a time. Receivers look at A−B, so ground shift of volts is fine.",
    principle:
      "Differential signalling. DE high: A follows TX, B is inverted. Idle is failsafe-biased high-Z. Two DEs at once leave A−B undefined. That is a bus fight, not a CAN-style arbitration.",
    formula: "Vdiff = VA − VB",
    uses: [
      "Modbus RTU on factory floors",
      "DMX lighting (electrically RS-485)",
      "Long cable runs between PLCs",
      "Building automation and HVAC buses",
    ],
  },
  {
    slug: "dc-motor",
    badge: "updated",
    name: "DC motor",
    symbol: "M",
    category: "electromechanical",
    tagline: "Current into torque",
    summary:
      "A spinning coil in a field. Voltage buys speed; current buys torque. Armature L is small but modeled. Stall is back-EMF gone to zero.",
    principle:
      "V = I·R + La·dI/dt + Ke·ω. Torque τ = Kt·I. At stall, ω = 0 so the motor is mostly resistance and current peaks. Unloaded, back-EMF rises until current only covers friction.",
    formula: "V = IR + La dI/dt + Ke ω",
    uses: [
      "Fans, pumps, and window motors",
      "Toys, robots, and CNC axes",
      "Printers and DVD trays",
      "Automotive wipers and seat adjusters",
    ],
  }
];
