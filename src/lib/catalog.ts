export type Category = "passive" | "semiconductor" | "digital" | "electromechanical";

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
    formula: "I = Iₛ (e^{V/nVₜ} − 1)",
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
    name: "Transistor",
    symbol: "Q",
    category: "semiconductor",
    tagline: "A small current running a large one",
    summary:
      "An NPN sandwich. A whisper of base current opens a wide path from collector to emitter — amplification, or a switch.",
    principle:
      "Forward-biasing the base–emitter junction injects electrons into the base. Most of them are swept into the collector before they can recombine. Collector current is β times base current, until the device saturates.",
    formula: "I_c = β · I_b  (active)",
    uses: [
      "Audio and RF amplifiers",
      "Switching relays, buzzers, and small motors from a GPIO pin",
      "Discrete logic and level shifting",
      "Current sources and analog front-ends",
    ],
  },
  {
    slug: "mosfet",
    name: "MOSFET",
    symbol: "M",
    category: "semiconductor",
    tagline: "A voltage-built channel",
    summary:
      "No base current. A gate voltage inverts the silicon under the oxide and a channel appears — a switch turned by field, not charge flow into the control pin.",
    principle:
      "Vgs above threshold inverts a p-type body into an n-channel between source and drain. Id grows with (Vgs − Vth)² in saturation. The gate is insulated, so DC gate current is essentially zero.",
    formula: "Id = k · (Vgs − Vth)²",
    uses: [
      "Synchronous switches in DC–DC converters",
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
      "In astable mode the capacitor charges through RA + RB and discharges through RB. Comparators at ⅓ and ⅔ of VCC set and reset an SR latch, which opens and closes the discharge transistor. Frequency follows the RC network.",
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
];

export const LAB_BY_SLUG = Object.fromEntries(LABS.map((l) => [l.slug, l])) as Record<
  string,
  LabMeta
>;

export function labsIn(category: Category) {
  return LABS.filter((l) => l.category === category);
}
