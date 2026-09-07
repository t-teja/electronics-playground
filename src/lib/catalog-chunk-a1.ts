import type { LabMeta } from "./catalog";

export const CATALOG_CHUNK_A1: LabMeta[] = [

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
      "Current can flow only while the plates are charging or discharging. Once the capacitor voltage equals the source, the field stops further charge. The time constant τ = RC sets how quickly that happens.",
    formula: "I = C · dV/dt",
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
    badge: "updated",
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
      "Faraday's law: V = N · dφ/dt. Same flux through both windings means Vs / Vp = Ns / Np. Current transforms the other way so power is (almost) conserved.",
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
    formula: "I = Iₛ (e^{V/nVₜ} − 1)",
    uses: [
      "Bridge rectifiers that turn AC into DC",
      "Reverse-polarity protection on battery inputs",
      "Flyback / freewheel diodes across coils and motors",
      "Logic OR-ing of two power sources",
    ],
  }
];
