import type { LabMeta } from "./catalog";

export const CATALOG_CHUNK_B1: LabMeta[] = [
  {
    slug: "microcontroller",
    badge: "updated",
    name: "Microcontroller",
    symbol: "µC",
    category: "digital",
    tagline: "A clock that follows a list",
    summary:
      "Flash, a program counter, GPIO. A tiny computer that blinks an LED because a program told it to.",
    principle:
      "Each clock edge fetches the instruction at the program counter, executes it, and advances. Pins are just registers mapped to silicon pads. Firmware is the difference between a chip and a product.",
    formula: "T_clk = 1 / f_cpu",
    uses: [
      "Washing machines, thermostats, and appliances",
      "Robots, drones, and RC transmitters",
      "USB gadgets and sensor nodes",
      "The brain of almost every modern product",
    ],
  },
  {
    slug: "signal-generator",
    badge: "updated",
    name: "Signal generator",
    symbol: "GEN",
    category: "digital",
    tagline: "Shapes of voltage, on purpose",
    summary:
      "Sine, triangle, square, saw, PWM. Frequency sets how fast. Duty cycle sets how long the high part lasts, and that average is what motors and LEDs actually feel.",
    principle:
      "A square wave's duty cycle D is on-time over period; its average is V × D. PWM is that idea run fast enough that a coil or an RC filter cannot follow the pulses. It sees a smooth level. Analog shapes (sine, triangle, saw) are defined by frequency and amplitude, not pulse width.",
    formula: "Vavg = V × D",
    uses: [
      "Audio and RF test benches",
      "PWM motor speed and LED brightness",
      "Switch-mode charger control loops",
      "Clock and stimulus sources in the lab",
    ],
  },
  {
    slug: "adc",
    badge: "new",
    name: "ADC",
    symbol: "ADC",
    category: "digital",
    tagline: "A ruler for voltage",
    summary:
      "Analog in, bits out. The converter snaps a voltage onto the nearest code of a 2^n-1 step ladder.",
    principle:
      "An n-bit ADC divides Vref into 2^n-1 equal slices. The code is round(Vin/Vref × (2^n-1)). The reconstructed voltage Vq never quite equals Vin. That leftover is quantization error.",
    formula: "D = round(Vin/Vref · (2ⁿ − 1))",
    uses: [
      "Microphone and sensor front-ends on microcontrollers",
      "Audio interfaces and SDR receivers",
      "Battery-voltage monitoring",
      "Touch and temperature measurement",
    ],
  },
  {
    slug: "dac",
    badge: "updated",
    name: "DAC",
    symbol: "DAC",
    category: "digital",
    tagline: "Bits into a voltage",
    summary:
      "Bits in, analog out. Weighted resistors (or an R-2R ladder) turn a code into a fraction of Vref.",
    principle:
      "Vout = Vref × D / 2ⁿ. Each bit is a switch onto a binary-weighted rung of an R-2R ladder. Full-scale code 15 is 15/16 of Vref.",
    formula: "Vout = Vref · D / 2ⁿ",
    uses: [
      "Audio playback and synthesizer voices",
      "Analog control voltages from a microcontroller",
      "Function generators and AWG outputs",
      "Calibration and offset trim",
    ],
  },
  {
    slug: "uart",
    badge: "new",
    name: "UART",
    symbol: "UART",
    category: "protocol",
    tagline: "Two wires, agreed silence",
    summary:
      "Idle high. A start bit, eight data bits LSB-first, optional parity, a stop bit. No clock line: both ends must share a baud rate.",
    principle:
      "Asynchronous serial. The falling edge of START samples the rest of the character at 1/baud. LSB first. Framing error if STOP is not high. Full duplex on TX and RX.",
    formula: "Tbit = 1 / baud",
    uses: [
      "USB-serial consoles and GPS modules",
      "ESP32 / Arduino debug prints",
      "Bluetooth and GSM module AT ports",
      "MIDI and DMX (same framing, different voltage)",
    ],
  },
  {
    slug: "i2c",
    badge: "new",
    name: "I2C",
    symbol: "I2C",
    category: "protocol",
    tagline: "Open-drain, two wires, many addresses",
    summary:
      "SDA and SCL with pull-ups. START is SDA falling while SCL is high. 7-bit address plus R/W, then ACKs. Slaves may stretch the clock.",
    principle:
      "Wired-AND open-drain. Only a low is driven; highs come from resistors. Data is allowed to change only while SCL is low, except START and STOP, which are conditions on SDA during SCL high.",
    formula: "9th bit = ACK (slave pulls SDA)",
    uses: [
      "EEPROMs, RTCs, and sensor hubs",
      "PMIC and battery-gauge control",
      "HDMI DDC and display EDID",
      "SMBus on PC motherboards",
    ],
  }
];
