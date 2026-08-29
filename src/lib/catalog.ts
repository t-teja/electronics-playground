export type Category = "passive" | "semiconductor" | "digital" | "electromechanical" | "sensor" | "computer";

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
    id: "electromechanical",
    label: "Electromechanical",
    blurb: "Current becomes torque, or a magnetic click that throws a switch.",
  },
  {
    id: "sensor",
    label: "Sensors",
    blurb: "Light, heat, distance, and motion turned into voltage.",
  },
  {
    id: "computer",
    label: "Computers",
    blurb: "Memory that keeps bits, and processors that walk through them.",
  },
];

export const LABS: LabMeta[] = [
  {
    slug: "resistor",
    name: "Resistor",
    symbol: "R",
    category: "passive",
    tagline: "Ohm’s law, made of collisions",
    summary:
      "A resistor is a controlled bottleneck. Voltage pushes, resistance scatters, current is what remains.",
    principle:
      "Free electrons in a metal already move at random. An electric field adds a tiny drift. Collisions with the lattice convert that ordered motion into heat — that is resistance.",
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
    name: "Capacitor",
    symbol: "C",
    category: "passive",
    tagline: "Charge, field, time",
    summary:
      "Two plates that never touch. Charge piles up, an electric field grows, and current fades as the field fights back.",
    principle:
      "Current can flow only while the plates are charging or discharging. Once the capacitor voltage equals the source, the field stops further charge. The time constant τ = RC sets how quickly that happens.",
    formula: "I = C · dV/dt",
    uses: [
      "Smoothing ripple on power-supply rails",
      "Decoupling ICs so they don’t brown out on switching spikes",
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
      "A changing current produces a changing flux, which induces a voltage opposing the change (Lenz’s law). Energy lives in the magnetic field. The lamp is the load that current actually feeds — open the switch and that energy has to go somewhere.",
    formula: "V = L · dI/dt",
    uses: [
      "Energy storage in switch-mode power supplies (buck/boost)",
      "LC filters that keep noise off a power rail",
      "Ignition coils and flyback converters",
      "Chokes on USB and Ethernet cables",
    ],
  },
  {
    slug: "potentiometer",
    name: "Potentiometer",
    symbol: "POT",
    category: "passive",
    tagline: "A resistor you can tap",
    summary:
      "Three terminals: two ends of a track, and a wiper that slides between them. A voltage divider you can turn.",
    principle:
      "The wiper splits the track into two resistances that always add to the total. Output is V · (R_lower / R_total). Current into a light load still follows Ohm, but the ratio is the story.",
    formula: "Vout = V · k",
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
      "Faraday’s law: V = N · dφ/dt. Same flux through both windings means Vs / Vp = Ns / Np. Current transforms the other way so power is (almost) conserved.",
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
    name: "Diode",
    symbol: "D",
    category: "semiconductor",
    tagline: "A one-way valve for charge",
    summary:
      "A PN junction that conducts one way and blocks the other. Forward bias thins the barrier; reverse bias thickens it.",
    principle:
      "P-type silicon is rich in holes, N-type in electrons. At the junction they recombine and leave a depletion region — an insulating wall. Forward voltage lowers that wall past ~0.7 V; reverse voltage raises it.",
    formula: "I = Is (e^{V/nVt} - 1)",
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
    formula: "E = h · f  ≈  q · V_f",
    uses: [
      "Power and status indicators on every board",
      "Room and street lighting",
      "Optocouplers and IR remote transmitters",
      "Displays, traffic signals, and backlights",
    ],
  },
  {
    slug: "transistor",
    name: "NPN transistor",
    symbol: "Q",
    category: "semiconductor",
    tagline: "A small current running a large one",
    summary:
      "An NPN sandwich. A whisper of base current opens a wide path from collector to emitter — amplification, or a switch.",
    principle:
      "Forward-biasing the base-emitter junction injects electrons into the base. Most of them are swept into the collector before they can recombine. Collector current is beta times base current, until the device saturates.",
    formula: "I_c = β · I_b  (active)",
    uses: [
      "Audio and RF amplifiers",
      "Switching relays, buzzers, and small motors from a GPIO pin",
      "Discrete logic and level shifting",
      "Current sources and analog front-ends",
    ],
  },
  {
    slug: "pnp",
    name: "PNP transistor",
    symbol: "Q",
    category: "semiconductor",
    tagline: "Holes as the majority, current out of the base",
    summary:
      "A PNP sandwich. Pull a whisper of current out of the base and a wide path opens from emitter to collector — the high-side twin of the NPN.",
    principle:
      "Forward-biasing the emitter-base junction injects holes into the base. Most of them are swept into the collector before they recombine. Collector current is beta times the current leaving the base, until the device saturates. Emitter sits at +VCC; the load hangs off the collector toward ground.",
    formula: "I_c = β · I_b  (active)",
    uses: [
      "High-side switches that source current into a load",
      "Complementary pairs with NPN (push-pull stages)",
      "Level shifting and analog front-ends",
      "Discrete linear regulators and current sources",
    ],
  },
  {
    slug: "mosfet",
    name: "N-MOSFET",
    symbol: "M",
    category: "semiconductor",
    tagline: "A voltage-built channel",
    summary:
      "No base current. A gate voltage inverts the silicon under the oxide and a channel appears — a switch turned by field, not charge flow into the control pin.",
    principle:
      "Vgs above threshold inverts a p-type body into an n-channel between source and drain. Id grows with (Vgs - Vth)^2 in saturation. The gate is insulated, so DC gate current is essentially zero.",
    formula: "Id = k · (Vgs - Vth)^2",
    uses: [
      "Synchronous switches in DC-DC converters",
      "H-bridge drivers for DC motors",
      "LED dimming and PWM loads",
      "Load switches and battery protection FETs",
    ],
  },
  {
    slug: "logic-gates",
    name: "Logic gates",
    symbol: "Σ",
    category: "digital",
    tagline: "Voltage as true and false",
    summary:
      "Thresholds become bits. Combine them and you get every computation that exists.",
    principle:
      "A gate is just transistors biased as switches. Inputs above a threshold are 1, below are 0. AND, OR, NOT and the rest are wiring patterns on those switches — CMOS in silicon, truth tables on paper.",
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
    name: "555 timer",
    symbol: "IC",
    category: "digital",
    tagline: "The IC that oscillates",
    summary:
      "Comparators, a flip-flop, and a discharge transistor. Add two resistors and a capacitor, get a heartbeat.",
    principle:
      "In astable mode the capacitor charges through RA + RB and discharges through RB. Comparators at 1/3 and 2/3 of VCC set and reset an SR latch, which opens and closes the discharge transistor. Frequency follows the RC network.",
    formula: "f = 1.44 / ((RA + 2 RB) · C)",
    uses: [
      "LED blinkers and toy sirens",
      "PWM generation before a microcontroller existed",
      "Switch debounce and missing-pulse detectors",
      "Precision one-shots for camera flashes",
    ],
  },
  {
    slug: "microcontroller",
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
    name: "Signal generator",
    symbol: "GEN",
    category: "digital",
    tagline: "Shapes of voltage, on purpose",
    summary:
      "Sine, triangle, square, saw, PWM. Frequency sets how fast. Duty cycle sets how long the high part lasts — and that average is what motors and LEDs actually feel.",
    principle:
      "A square wave’s duty cycle D is on-time over period; its average is V × D. PWM is that idea run fast enough that a coil or an RC filter cannot follow the pulses — it sees a smooth level. Analog shapes (sine, triangle, saw) are defined by frequency and amplitude, not pulse width.",
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
    name: "ADC",
    symbol: "ADC",
    category: "digital",
    tagline: "A ruler for voltage",
    summary:
      "Analog in, bits out. The converter snaps a voltage onto the nearest code of a 2^n-1 step ladder.",
    principle:
      "An n-bit ADC divides Vref into 2^n-1 equal slices. The code is round(Vin/Vref × (2^n-1)). The reconstructed voltage Vq never quite equals Vin — that leftover is quantization error.",
    formula: "D = round(Vin/Vref · (2^n - 1))",
    uses: [
      "Microphone and sensor front-ends on microcontrollers",
      "Audio interfaces and SDR receivers",
      "Battery-voltage monitoring",
      "Touch and temperature measurement",
    ],
  },
  {
    slug: "dac",
    name: "DAC",
    symbol: "DAC",
    category: "digital",
    tagline: "Bits into a voltage",
    summary:
      "Bits in, analog out. Weighted resistors (or an R-2R ladder) turn a code into a fraction of Vref.",
    principle:
      "Vout = Vref × D / (2^n - 1). Each bit is a switch onto a binary-weighted rung. The LED on the output sees a voltage, not a number.",
    formula: "Vout = Vref · D / (2^n - 1)",
    uses: [
      "Audio playback and synthesizer voices",
      "Analog control voltages from a microcontroller",
      "Function generators and AWG outputs",
      "Calibration and offset trim",
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
      "V = I·R + Ke·ω. Torque τ = Kt·I. At stall, ω = 0 so the motor is a resistor and current peaks. Unloaded, back-EMF rises until current is only what’s needed to cover friction.",
    formula: "V = I R + Ke ω",
    uses: [
      "Fans, pumps, and window motors",
      "Toys, robots, and CNC axes",
      "Printers and DVD trays",
      "Automotive wipers and seat adjusters",
    ],
  },
  {
    slug: "relay",
    name: "Relay",
    symbol: "K",
    category: "electromechanical",
    tagline: "A magnet that throws a switch",
    summary:
      "A small coil current pulls an armature and slams metal contacts. The load never shares a wire with the coil — that is galvanic isolation you can hear.",
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
    name: "LDR",
    symbol: "LDR",
    category: "sensor",
    tagline: "Light as a resistor",
    summary:
      "A photocell. Photons free carriers; resistance falls as the room brightens, and a divider turns that into a voltage.",
    principle:
      "Photoconductivity: absorbed photons lift electrons into the conduction band, so R falls with illuminance roughly as 1/E^γ. A voltage divider with a fixed resistor turns that resistance into a voltage a microcontroller can read.",
    formula: "R ∝ 1 / E^γ",
    uses: [
      "Night lights and street-lamp dusk sensors",
      "Camera exposure meters",
      "Solar trackers and greenhouse shading",
      "DIY light-following robots",
    ],
  },
  {
    slug: "ir",
    name: "IR sensor",
    symbol: "IR",
    category: "sensor",
    tagline: "Bounce light, measure closeness",
    summary:
      "An IR LED shouts; a photodiode listens for the echo. Close objects return more photons — intensity falls as 1/d^2.",
    principle:
      "Reflected optical power drops with the square of distance. Photodiode current follows that intensity. A comparator against a threshold turns proximity into a bit.",
    formula: "I ∝ 1 / d^2",
    uses: [
      "Line-following robots and cliff sensors",
      "TV remotes and IR break-beams",
      "Proximity detect on hand dryers and taps",
      "Encoder wheels and slot sensors",
    ],
  },
  {
    slug: "pir",
    name: "PIR",
    symbol: "PIR",
    category: "sensor",
    tagline: "It sees change, not people",
    summary:
      "A pyroelectric element that only cares about a changing infrared flux. A still room is invisible; a walk-by is a pulse.",
    principle:
      "Pyroelectric crystals generate charge proportional to dΦ/dt, not Φ. Dual elements of opposite polarity cancel ambient temperature. A retriggerable window stretches the pulse into a usable alarm.",
    formula: "dΦ/dt",
    uses: [
      "Burglar alarms and hallway lighting",
      "Automatic doors and restroom faucets",
      "Wildlife cameras",
      "HVAC occupancy sensing",
    ],
  },
  {
    slug: "ultrasonic",
    name: "Ultrasonic",
    symbol: "US",
    category: "sensor",
    tagline: "Time of flight you can hear",
    summary:
      "A 40 kHz click, a wall, an echo. Distance is how long the sound took, times speed, over two.",
    principle:
      "The HC-SR04 fires a trigger pulse; the onboard transducer rings, the sound flies, reflects, and the echo pin stays high for the round trip. d = v t / 2 with v ≈ 343 m/s in air.",
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
    name: "RAM",
    symbol: "RAM",
    category: "computer",
    tagline: "Bits that live only while the lights are on",
    summary:
      "Sixteen nibbles of SRAM. Address selects a row, din rides the data bus, a write strobe stores. Kill VCC and every cell becomes 0.",
    principle:
      "Each bit is a pair of cross-coupled inverters. The latch holds a 1 or a 0 only while current feeds the transistors. That is volatile: power is the memory.",
    formula: "data[addr] <- din  (while powered)",
    uses: [
      "MCU SRAM",
      "CPU working memory",
      "framebuffers",
    ],
  },
  {
    slug: "rom",
    name: "ROM",
    symbol: "ROM",
    category: "computer",
    tagline: "A table the fab printed in metal",
    summary:
      "Same 16x4 grid, but the pattern is mask-programmed at fab — here an increment table. Address and read. There is no write pin.",
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
    name: "EPROM",
    symbol: "EPROM",
    category: "computer",
    tagline: "Floating gates you can UV-erase",
    summary:
      "A quartz window over 16x4 floating-gate cells. UV empties the gates toward 1s. Vpp programs 0s. Power-off keeps the charge.",
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
    name: "PSRAM",
    symbol: "PSRAM",
    category: "computer",
    tagline: "SRAM pins, DRAM capacitors",
    summary:
      "Looks like SRAM until you kill the refresh engine. Each row is a DRAM capacitor. Charge leaks as Q(t) = Q0 e^{-t/RC} unless a cursor tops it up.",
    principle:
      "Pseudo-static means a DRAM with a built-in refresh engine. The bus looks static; under the lid a walker restores every row before the capacitors forget.",
    formula: "Q(t) = Q0 e^{-t/RC} unless refreshed",
    uses: [
      "IoT RAM",
      "display buffers",
      "anything that wants SRAM timing with DRAM density",
    ],
  },
  {
    slug: "cpu",
    name: "CPU",
    symbol: "CPU",
    category: "computer",
    tagline: "Fetch, decode, execute — then do it again",
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
    name: "GPU",
    symbol: "GPU",
    category: "computer",
    tagline: "The same math, on many pixels at once",
    summary:
      "An 8x8 framebuffer. One CPU painter versus 1, 4, or 8 parallel cores claiming tiles. GPUs win on width, not on a faster clock.",
    principle:
      "A CPU paints one pixel per clock. N cores paint N pixels per clock on the same job. That is why a GPU is not a faster CPU — it is many ALUs doing the same multiply on different data.",
    formula: "pixels/s ≈ cores × clocks",
    uses: [
      "displays",
      "games",
      "ML matmuls (same idea: lots of ALUs)",
    ],
  },
];

export const LAB_BY_SLUG = Object.fromEntries(LABS.map((l) => [l.slug, l])) as Record<
  string,
  LabMeta
>;

export function labsIn(category: Category) {
  return LABS.filter((l) => l.category === category);
}
