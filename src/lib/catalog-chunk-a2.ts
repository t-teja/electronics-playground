import type { LabMeta } from "./catalog";

export const CATALOG_CHUNK_A2: LabMeta[] = [
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
    badge: "updated",
    name: "NPN transistor",
    symbol: "Q",
    category: "semiconductor",
    tagline: "A small current running a large one",
    summary:
      "An NPN sandwich. A whisper of base current opens a wide path from collector to emitter: amplification, or a switch.",
    principle:
      "Forward-biasing the base-emitter junction injects electrons into the base. Most of them are swept into the collector before they can recombine. Collector current is β times base current, until the device saturates.",
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
    badge: "updated",
    name: "PNP transistor",
    symbol: "Q",
    category: "semiconductor",
    tagline: "Holes as the majority, current out of the base",
    summary:
      "A PNP sandwich. Pull a whisper of current out of the base and a wide path opens from emitter to collector. The high-side twin of the NPN.",
    principle:
      "Forward-biasing the emitter-base junction injects holes into the base. Most of them are swept into the collector before they recombine. Collector current is β times the current leaving the base, until the device saturates. Emitter sits at +VCC; the load hangs off the collector toward ground.",
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
    badge: "updated",
    name: "N-MOSFET",
    symbol: "M",
    category: "semiconductor",
    tagline: "A voltage-built channel",
    summary:
      "No base current. A gate voltage inverts the silicon under the oxide and a channel appears. A switch turned by field, not charge flow into the control pin.",
    principle:
      "Vgs above threshold inverts a p-type body into an n-channel between source and drain. Id grows with (Vgs - Vth)^2 in saturation. The gate is insulated, so DC gate current is essentially zero.",
    formula: "Id = k · (Vgs − Vth)²  (sat)",
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
    formula: "f = 1.44 / ((RA + 2 RB) · C)",
    uses: [
      "LED blinkers and toy sirens",
      "PWM generation before a microcontroller existed",
      "Switch debounce and missing-pulse detectors",
      "Precision one-shots for camera flashes",
    ],
  }
];
