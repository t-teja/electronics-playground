import type { LabMeta } from "./catalog";

export const ELECTROMECHANICAL_BLURB =
  "Current becomes torque. From brushed DC to AC, PMSM, BLDC, and position servos.";

export const MOTOR_LABS: LabMeta[] = [
  {
    slug: "split-phase-motor",
    badge: "new",
    name: "Split-phase motor",
    symbol: "SP",
    category: "electromechanical",
    tagline: "Two windings, a phase shift, and a start switch",
    summary:
      "A main winding plus an auxiliary winding with a run capacitor. The phase shift makes starting torque. A centrifugal switch drops the aux once the rotor is up.",
    principle:
      "Two stator currents displaced in phase produce a rotating field component. Torque grows with Im Ia sin(\u03c6). Above a speed threshold the switch opens the aux circuit and the motor runs on the main winding alone.",
    formula: "\u03c4 \u221d Im Ia sin(\u03c6)",
    uses: [
      "Household fans and blowers",
      "Washers and small compressors",
      "Bench tools that need a kick to start",
    ],
  },
  {
    slug: "induction-motor",
    badge: "new",
    name: "Induction motor",
    symbol: "IM",
    category: "electromechanical",
    tagline: "Slip makes torque",
    summary:
      "A three-phase stator builds a rotating field. The rotor never quite catches sync speed. That slip induces current, and current makes torque.",
    principle:
      "Synchronous speed ns = 120 f / p. Slip s = (ns \u2212 n) / ns. Torque follows a Kloss-style curve with a breakdown peak near rated slip. Load sets the operating point on that curve.",
    formula: "ns = 120 f / p",
    uses: [
      "Pumps, conveyors, and machine tools",
      "HVAC blowers and compressors",
      "Most industrial AC drives",
    ],
  },
  {
    slug: "pmsm",
    badge: "new",
    name: "PMSM",
    symbol: "PM",
    category: "electromechanical",
    tagline: "Permanent magnets locked to the field",
    summary:
      "A sinusoidal stator field and a magnetized rotor. With Id = 0, torque is set by Iq. In sync, electrical and mechanical angles stay locked.",
    principle:
      "Te = (3/2) p \u03bbm Iq. Electrical speed \u03c9e = p \u03c9m. The rotor tracks the rotating field; load angle grows with torque demand until pull-out.",
    formula: "Te = (3/2) p \u03bbm Iq",
    uses: [
      "Servo axes and robot joints",
      "EV traction and e-bikes",
      "Precision spindles",
    ],
  },
  {
    slug: "bldc",
    badge: "new",
    name: "BLDC",
    symbol: "BLDC",
    category: "electromechanical",
    tagline: "Six-step commutation from hall sensors",
    summary:
      "Three phases, trapezoidal back-EMF, and hall sensors. Each 60\u00b0 sector energizes two windings. Torque comes from the driven currents.",
    principle:
      "Hall state 0..5 picks which two of three phases are on. Trapezoidal back-EMF and square-ish currents make nearly constant torque in each sector.",
    formula: "sector = floor(\u03b8 / 60\u00b0)",
    uses: [
      "Drone motors and RC props",
      "PC fans and pumps",
      "Appliance blowers",
    ],
  },
  {
    slug: "servo",
    badge: "new",
    name: "Servo",
    symbol: "SRV",
    category: "electromechanical",
    tagline: "Angle in, shaft follows",
    summary:
      "A DC motor, a pot on the shaft, and an internal PD loop. You set a target angle; error becomes drive until the shaft arrives.",
    principle:
      "Feedback closes the loop: e = \u03b8ref \u2212 \u03b8. Drive u = Kp e + Kd \u0117 turns the motor. The pot reports position so the schematic matches the model.",
    formula: "u = Kp e + Kd \u0117",
    uses: [
      "RC hobby servos",
      "Camera gimbals and pan-tilt heads",
      "Small robot joints",
    ],
  },
];
