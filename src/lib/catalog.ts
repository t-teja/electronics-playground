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
    blurb: "Current becomes torque. A spinning armature is just an inductor with a job.",
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
  },
];

export const LAB_BY_SLUG = Object.fromEntries(LABS.map((l) => [l.slug, l])) as Record<
  string,
  LabMeta
>;

export function labsIn(category: Category) {
  return LABS.filter((l) => l.category === category);
}
