import { NEURAL_CATEGORY, NEURAL_LABS } from "./neural-labs";

export type Category =
  | "passive"
  | "semiconductor"
  | "digital"
  | "protocol"
  | "electromechanical"
  | "sensor"
  | "computer"
  | "neural";

export type LabBadge = "new" | "updated";

export type LabMeta = {
  slug: string;
  name: string;
  symbol: string;
  category: Category;
  tagline: string;
  summary: string;
  principle: string;
  formula: string;
  uses: string[];
  badge?: LabBadge;
};

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  {
    id: "passive",
    label: "Passive",
    blurb: "Energy is resisted, stored in electric fields, or stored in magnetic fields.",
  },
  {
    id: "semiconductor",
    label: "Semiconductor",
    blurb: "Junctions that let you steer, emit, and amplify charge.",
  },
  {
    id: "digital",
    label: "Digital",
    blurb: "Thresholds become bits, bits become clocks, clocks become programs.",
  },
  {
    id: "protocol",
    label: "Buses",
    blurb: "How chips talk: clocks, addresses, packets, and who owns the wire.",
  },
  {
    id: "electromechanical",
    label: "Electromechanical",
    blurb: "Current becomes torque, or a magnetic click that throws a switch.",
  },
  {
    id: "sensor",
    label: "Sensors",
    blurb: "Light, distance, and motion turned into voltage.",
  },
  {
    id: "computer",
    label: "Computers",
    blurb: "Memory that keeps bits, and processors that walk through them.",
  },
  NEURAL_CATEGORY,
];

export const LABS: LabMeta[] = [
  {
    slug: "resistor",
    name: "Resistor",
    symbol: "R",
    category: "passive",
    tagline: "Ohm's law, made of collisions",
    summary:
      "A resistor is a controlled bottleneck. Voltage pushes, resistance scatters, current is what remains.",
    principle:
      "Free electrons in a metal already move at random. An electric field adds a tiny drift. Collisions with the lattice convert that ordered motion into heat. That is resistance.",
    formula: "I = V / R",
    uses: [
      "Current-limiting resistors in front of LEDs",
      "Voltage dividers for sensors and ADC inputs",
      "Pull-up / pull-down resistors on digital pins",
      "Dummy loads and power dissipation in test rigs",
    ],
  },
  {
    slug: "capacitor",
    badge: "updated",
    name: "Capacitor",
    symbol: "C",
    category: "passive",
    tagline: "Charge, field, time",
    summary:
      "Two plates that never touch. Charge piles up, an electric field grows, and current fades as the field fights back.",
    principle:
      "Current can flow only while the plates are charging or discharging. Once the capacitor voltage equals the source, the field stops further charge. The time constant \u03c4 = RC sets how quickly that happens.",
    formula: "I = C \u00b7 dV/dt",
    uses: [
      "Smoothing ripple on power-supply rails",
      "Decoupling ICs so they don't brown out on switching spikes",
      "Timing networks (with a resistor) in 555s and RC filters",
      "Energy storage in camera flashes and motor snubbers",
    ],
  },
  {
    slug: "inductor",
    name: "Inductor",
    symbol: "L",
    category: "passive",
    tagline: "Current with inertia",
    summary:
      "A coil that hates change. Current builds a magnetic field; the field fights any attempt to alter that current.",
    principle:
      "A changing current produces a changing flux, which induces a voltage opposing the change (Lenz's law). Energy lives in the magnetic field. The lamp is the load that current actually feeds. Open the switch and that energy has to go somewhere.",
    formula: "V = L \u00b7 dI/dt",
    uses: [
      "Energy storage in switch-mode power supplies (buck/boost)",
      "LC filters that keep noise off a power rail",
      "Ignition coils and flyback converters",
      "Chokes on USB and Ethernet cables",
    ],
  },
  {
    slug: "potentiometer",
    badge: "updated",
    name: "Potentiometer",
    symbol: "POT",
    category: "passive",
    tagline: "A resistor you can tap",
    summary:
      "Three terminals: two ends of a track, and a wiper that slides between them. A voltage divider you can turn.",
    principle:
      "The wiper splits the track into two resistances that always add to the total. Output is V \u00b7 (R_lower / R_total). Current into a light load still follows Ohm, but the ratio is the story.",
    formula: "Vout = V \u00b7 k",
    uses: [
      "Volume and tone knobs on audio gear",
      "Lamp dimmers and analog set-points",
      "Calibrating sensor offsets on a board",
      "Joystick axes and panel controls",
    ],
  },
  {
    slug: "transformer",
    name: "Transformer",
    symbol: "T",
    category: "passive",
    tagline: "Flux as a messenger",
    summary:
      "Two coils, one core. A changing current on the primary writes a flux; the secondary reads it as a voltage.",
    principle:
      "Faraday's law: V = N \u00b7 d\u03c6/dt. Same flux through both windings means Vs / Vp = Ns / Np. Current transforms the other way so power is (almost) conserved.",
    formula: "Vs / Vp = Ns / Np",
    uses: [
      "Stepping mains down in phone chargers and laptop PSUs",
      "Isolation so the secondary is not tied to earth/live",
      "Distribution transformers on the pole outside a house",
      "Audio matching and gate-drive isolation",
    ],
  },
  {
    slug: "diode",
    badge: "updated",
    name: "Diode",
    symbol: "D",
    category: "semiconductor",
    tagline: "A one-way valve for charge",
    summary:
      "A PN junction that conducts one way and blocks the other. Forward bias thins the barrier; reverse bias thickens it.",
    principle:
      "P-type silicon is rich in holes, N-type in electrons. At the junction they recombine and leave a depletion region, an insulating wall. Forward voltage lowers that wall past ~0.7 V; reverse voltage raises it.",
    formula: "I = I\u209b (e^{V/nV\u209c} \u2212 1)",
    uses: [
      "Bridge rectifiers that turn AC into DC",
      "Reverse-polarity protection on battery inputs",
      "Flyback / freewheel diodes across coils and motors",
      "Logic OR-ing of two power sources",
    ],
  },
  {
    slug: "led",
    name: "LED",
    symbol: "LED",
    category: "semiconductor",
    tagline: "Recombination you can see",
    summary:
      "A diode whose recombination energy leaves as a photon. Color is band-gap. Brightness is current.",
    principle:
      "When an electron drops from the conduction band into a hole, the energy difference can be emitted as light. Larger band-gap means bluer light and a higher forward voltage.",
    formula: "E = h \u00b7 f  \u2248  q \u00b7 V_f",
    uses: [
      "Power and status indicators on every board",
      "Room and street lighting",
      "Optocouplers and IR remote transmitters",
      "Displays, traffic signals, and backlights",
    ],
  },
  {
    slug: "transistor",
    badge: "updated",
    name: "NPN transistor",
    symbol: "Q",
    category: "semiconductor",
    tagline: "A small current running a large one",
    summary:
      "An NPN sandwich. A whisper of base current opens a wide path from collector to emitter: amplification, or a switch.",
    principle:
      "Forward-biasing the base-emitter junction injects electrons into the base. Most of them are swept into the collector before they can recombine. Collector current is \u03b2 times base current, until the device saturates.",
    formula: "I_c = \u03b2 \u00b7 I_b  (active)",
    uses: [
      "Audio and RF amplifiers",
      "Switching relays, buzzers, and small motors from a GPIO pin",
      "Discrete logic and level shifting",
      "Current sources and analog front-ends",
    ],
  },
  {
    slug: "pnp",
    badge: "updated",
    name: "PNP transistor",
    symbol: "Q",
    category: "semiconductor",
    tagline: "Holes as the majority, current out of the base",
    summary:
      "A PNP sandwich. Pull a whisper of current out of the base and a wide path opens from emitter to collector. The high-side twin of the NPN.",
    principle:
      "Forward-biasing the emitter-base junction injects holes into the base. Most of them are swept into the collector before they recombine. Collector current is \u03b2 times the current leaving the base, until the device saturates. Emitter sits at +VCC; the load hangs off the collector toward ground.",
    formula: "I_c = \u03b2 \u00b7 I_b  (active)",
    uses: [
      "High-side switches that source current into a load",
      "Complementary pairs with NPN (push-pull stages)",
      "Level shifting and analog front-ends",
      "Discrete linear regulators and current sources",
    ],
  },
  {
    slug: "mosfet",
    badge: "updated",
    name: "N-MOSFET",
    symbol: "M",
    category: "semiconductor",
    tagline: "A voltage-built channel",
    summary:
      "No base current. A gate voltage inverts the silicon under the oxide and a channel appears. A switch turned by field, not charge flow into the control pin.",
    principle:
      "Vgs above threshold inverts a p-type body into an n-channel between source and drain. Id grows with (Vgs - Vth)^2 in saturation. The gate is insulated, so DC gate current is essentially zero.",
    formula: "Id = k \u00b7 (Vgs \u2212 Vth)\u00b2  (sat)",
    uses: [
      "Synchronous switches in DC-DC converters",
      "H-bridge drivers for DC motors",
      "LED dimming and PWM loads",
      "Load switches and battery protection FETs",
    ],
  },
  {
    slug: "logic-gates",
    badge: "updated",
    name: "Logic gates",
    symbol: "&",
    category: "digital",
    tagline: "Voltage as true and false",
    summary:
      "Thresholds become bits. Combine them and you get every computation that exists.",
    principle:
      "A gate is just transistors biased as switches. Inputs above a threshold are 1, below are 0. AND, OR, NOT and the rest are wiring patterns on those switches. CMOS in silicon, truth tables on paper.",
    formula: "Y = f(A, B)",
    uses: [
      "ALUs and every digital chip",
      "Glue logic between mismatched ICs",
      "Safety interlocks (AND of two enables)",
      "Address decoding on memory buses",
    ],
  },
  {
    slug: "timer-555",
    badge: "updated",
    name: "555 timer",
    symbol: "IC",
    category: "digital",
    tagline: "The IC that oscillates",
    summary:
      "Comparators, a flip-flop, and a discharge transistor. Add two resistors and a capacitor, get a heartbeat.",
    principle:
      "In astable mode the capacitor charges through RA + RB and discharges through RB. Comparators at 1/3 and 2/3 of VCC set and reset an SR latch, which opens and closes the discharge transistor. Frequency follows the RC network.",
    formula: "f = 1.44 / ((RA + 2 RB) \u00b7 C)",
    uses: [
      "LED blinkers and toy sirens",
      "PWM generation before a microcontroller existed",
      "Switch debounce and missing-pulse detectors",
      "Precision one-shots for camera flashes",
    ],
  },
  {
    slug: "microcontroller",
    badge: "updated",
    name: "Microcontroller",
    symbol: "\u00b5C",
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
      "A square wave's duty cycle D is on-time over period; its average is V \u00d7 D. PWM is that idea run fast enough that a coil or an RC filter cannot follow the pulses. It sees a smooth level. Analog shapes (sine, triangle, saw) are defined by frequency and amplitude, not pulse width.",
    formula: "Vavg = V \u00d7 D",
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
      "An n-bit ADC divides Vref into 2^n-1 equal slices. The code is round(Vin/Vref \u00d7 (2^n-1)). The reconstructed voltage Vq never quite equals Vin. That leftover is quantization error.",
    formula: "D = round(Vin/Vref \u00b7 (2\u207f \u2212 1))",
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
      "Vout = Vref \u00d7 D / 2\u207f. Each bit is a switch onto a binary-weighted rung of an R-2R ladder. Full-scale code 15 is 15/16 of Vref.",
    formula: "Vout = Vref \u00b7 D / 2\u207f",
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
  },
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
      "Differential signalling. DE high: A follows TX, B is inverted. Idle is failsafe-biased high-Z. Two DEs at once leave A−B undefined — that is a bus fight, not a CAN-style arbitration.",
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
    name: "DC motor",
    symbol: "M",
    category: "electromechanical",
    tagline: "Current into torque",
    summary:
      "A spinning coil in a field. Voltage buys speed; current buys torque. Stall is just back-EMF gone to zero.",
    principle:
      "V = I\u00b7R + Ke\u00b7\u03c9. Torque \u03c4 = Kt\u00b7I. At stall, \u03c9 = 0 so the motor is a resistor and current peaks. Unloaded, back-EMF rises until current is only what's needed to cover friction.",
    formula: "V = I R + Ke \u03c9",
    uses: [
      "Fans, pumps, and window motors",
      "Toys, robots, and CNC axes",
      "Printers and DVD trays",
      "Automotive wipers and seat adjusters",
    ],
  },
  {
    slug: "relay",
    badge: "updated",
    name: "Relay",
    symbol: "K",
    category: "electromechanical",
    tagline: "A magnet that throws a switch",
    summary:
      "A small coil current pulls an armature and slams metal contacts. The load never shares a wire with the coil. That is galvanic isolation you can hear.",
    principle:
      "Amp-turns in the coil build a field that beats the return spring. COM leaves NC and lands on NO. Opening the coil dumps the field; a flyback diode gives that energy a path so the driving transistor survives.",
    formula: "Icoil = Vcoil / Rcoil",
    uses: [
      "HVAC contactors and thermostat outputs",
      "Automotive horns, lamps, and starters",
      "PLC discrete outputs switching mains",
      "Isolating a low-voltage MCU from a dirty load",
    ],
  },
  {
    slug: "ldr",
    badge: "updated",
    name: "LDR",
    symbol: "LDR",
    category: "sensor",
    tagline: "Light as a resistor",
    summary:
      "A photocell. Photons free carriers; resistance falls as the room brightens, and a divider turns that into a voltage.",
    principle:
      "Photoconductivity: absorbed photons lift electrons into the conduction band, so R falls with illuminance roughly as 1/E^\u03b3. A voltage divider with a fixed resistor turns that resistance into a voltage a microcontroller can read.",
    formula: "R \u221d 1 / E^\u03b3",
    uses: [
      "Night lights and street-lamp dusk sensors",
      "Camera exposure meters",
      "Solar trackers and greenhouse shading",
      "DIY light-following robots",
    ],
  },
  {
    slug: "ir",
    badge: "updated",
    name: "IR sensor",
    symbol: "IR",
    category: "sensor",
    tagline: "Bounce light, measure closeness",
    summary:
      "An IR LED shouts; a photodiode listens for the echo. Close objects return more photons. Intensity falls as 1/d\u00b2.",
    principle:
      "Reflected optical power drops with the square of distance. Photodiode current follows that intensity. A comparator against a threshold turns proximity into a bit.",
    formula: "I \u221d 1 / d\u00b2",
    uses: [
      "Line-following robots and cliff sensors",
      "TV remotes and IR break-beams",
      "Proximity detect on hand dryers and taps",
      "Encoder wheels and slot sensors",
    ],
  },
  {
    slug: "pir",
    badge: "new",
    name: "PIR",
    symbol: "PIR",
    category: "sensor",
    tagline: "It sees change, not people",
    summary:
      "A pyroelectric element that only cares about a changing infrared flux. A still room is invisible; a walk-by is a pulse.",
    principle:
      "Pyroelectric crystals generate charge proportional to d\u03a6/dt, not \u03a6. Dual elements of opposite polarity cancel ambient temperature. A retriggerable window stretches the pulse into a usable alarm.",
    formula: "I \u221d d\u03a6_IR / dt",
    uses: [
      "Burglar alarms and hallway lighting",
      "Automatic doors and restroom faucets",
      "Wildlife cameras",
      "HVAC occupancy sensing",
    ],
  },
  {
    slug: "ultrasonic",
    badge: "new",
    name: "Ultrasonic",
    symbol: "US",
    category: "sensor",
    tagline: "Time of flight you can hear",
    summary:
      "A 40 kHz click, a wall, an echo. Distance is how long the sound took, times speed, over two.",
    principle:
      "The HC-SR04 fires a trigger pulse; the onboard transducer rings, the sound flies, reflects, and the echo pin stays high for the round trip. d = v t / 2 with v \u2248 343 m/s in air.",
    formula: "d = v t / 2",
    uses: [
      "Robot obstacle avoidance",
      "Parking sensors and tank level gauges",
      "Range finders in drones and toys",
      "Anemometers and flow meters",
    ],
  },
  {
    slug: "ram",
    badge: "new",
    name: "RAM",
    symbol: "RAM",
    category: "computer",
    tagline: "Bits that live only while the lights are on",
    summary:
      "Sixteen nibbles of SRAM. Address selects a row, din rides the data bus, a write strobe stores. Kill VCC and every cell becomes 0.",
    principle:
      "Each bit is a pair of cross-coupled inverters. The latch holds a 1 or a 0 only while current feeds the transistors. That is volatile: power is the memory.",
    formula: "data[addr] \u2190 din  (while powered)",
    uses: [
      "MCU SRAM",
      "CPU working memory",
      "framebuffers",
    ],
  },
  {
    slug: "rom",
    badge: "updated",
    name: "ROM",
    symbol: "ROM",
    category: "computer",
    tagline: "A table the fab printed in metal",
    summary:
      "Same 16\u00d74 grid, but the pattern is mask-programmed at fab: here an increment table. Address and read. There is no write pin.",
    principle:
      "Mask ROM is vias and implants, not latches. The bits are baked in. Power-off does not clear them because there is nothing to dump.",
    formula: "dout = ROM[addr]",
    uses: [
      "boot firmware",
      "character generators",
      "lookup tables",
    ],
  },
  {
    slug: "eprom",
    badge: "updated",
    name: "EPROM",
    symbol: "EPROM",
    category: "computer",
    tagline: "Floating gates you can UV-erase",
    summary:
      "A quartz window over 16\u00d74 floating-gate cells. UV empties the gates toward 1s. Vpp programs 0s. Power-off keeps the charge.",
    principle:
      "Erased floating gates read as 1. A programming pulse on Vpp injects electrons and turns selected bits to 0. Ultraviolet through the window photoemits those electrons back out.",
    formula: "UV empties the floating gate; Vpp programs 0s",
    uses: [
      "old BIOS chips",
      "firmware you can UV-erase and reburn",
    ],
  },
  {
    slug: "psram",
    badge: "new",
    name: "PSRAM",
    symbol: "PSRAM",
    category: "computer",
    tagline: "SRAM pins, DRAM capacitors",
    summary:
      "Looks like SRAM until you kill the refresh engine. Each row is a DRAM capacitor. Charge leaks as Q(t) = Q0 e^{-t/RC} unless a cursor tops it up.",
    principle:
      "Pseudo-static means a DRAM with a built-in refresh engine. The bus looks static; under the lid a walker restores every row before the capacitors forget.",
    formula: "Q(t) = Q0 e^{\u2212t/RC} unless refreshed",
    uses: [
      "IoT RAM",
      "display buffers",
      "anything that wants SRAM timing with DRAM density",
    ],
  },
  {
    slug: "cpu",
    badge: "new",
    name: "CPU",
    symbol: "CPU",
    category: "computer",
    tagline: "Fetch, decode, execute, then do it again",
    summary:
      "Not the GPIO toy. Registers A and PC, eight bytes of RAM, and a stored program: LDA, ADD, STA, JMP, HLT. Default: 3 + 5 = 8.",
    principle:
      "Each instruction cycle is fetch + decode + execute. The program lives in memory; the ALU is just a box the bus walks through. Power-off resets PC and A; RAM is kept.",
    formula: "instruction cycle = fetch + decode + execute",
    uses: [
      "every computer; this is the loop a phone still runs, just faster",
    ],
  },
  {
    slug: "gpu",
    badge: "updated",
    name: "GPU",
    symbol: "GPU",
    category: "computer",
    tagline: "The same math, on many pixels at once",
    summary:
      "An 8\u00d78 framebuffer. One CPU painter versus 1, 4, or 8 parallel cores claiming tiles. GPUs win on width, not on a faster clock.",
    principle:
      "A CPU paints one pixel per clock. N cores paint N pixels per clock on the same job. That is why a GPU is not a faster CPU. It is many ALUs doing the same multiply on different data.",
    formula: "pixels/s \u2248 cores \u00d7 clocks",
    uses: [
      "displays",
      "games",
      "ML matmuls (same idea: lots of ALUs)",
    ],
  },
  ...NEURAL_LABS,
];

export const LAB_BY_SLUG = Object.fromEntries(LABS.map((l) => [l.slug, l])) as Record<
  string,
  LabMeta
>;

export function labsIn(category: Category) {
  return LABS.filter((l) => l.category === category);
}
