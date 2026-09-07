import type { LabMeta } from "./catalog";

export const ELECTROMECHANICAL_BLURB =
  "Current becomes torque. From brushed DC to AC, PMSM, BLDC, and position servos.";

export const MOTOR_LABS: LabMeta[] = [
  {
    slug: "split-phase-motor",
    badge: "updated",
    name: "Split-phase motor",
    symbol: "SP",
    category: "electromechanical",
    tagline: "Two windings, a phase shift, and a start switch",
    summary:
      "A main winding plus an auxiliary winding with a start capacitor. The phase shift makes starting torque. A centrifugal switch drops the aux once the rotor is up.",
    principle:
      "Two stator currents displaced in phase produce a rotating field component. Starting torque grows with Im Ia sin(phi). Above a speed threshold the switch opens the aux and the main winding alone makes run torque.",
    formula: "tau ~ Im Ia sin(phi)",
    uses: [
      "Household fans and blowers",
      "Washers and small compressors",
      "Bench tools that need a kick to start",
    ],
  },
  {
    slug: "induction-motor",
    badge: "updated",
    name: "Induction motor",
    symbol: "IM",
    category: "electromechanical",
    tagline: "Slip makes torque",
    summary:
      "A three-phase stator builds a rotating field. The rotor never quite catches sync speed. That slip induces current, and current makes torque.",
    principle:
      "Synchronous speed ns = 120 f / p. Slip s = (ns - n) / ns. Torque follows a Kloss-style curve with a breakdown peak near rated slip. Load sets the operating point on that curve.",
    formula: "ns = 120 f / p",
    uses: [
      "Pumps, conveyors, and machine tools",
      "HVAC blowers and compressors",
      "Most industrial AC drives",
    ],
  },
  {
    slug: "pmsm",
    badge: "updated",
    name: "PMSM",
    symbol: "PM",
    category: "electromechanical",
    tagline: "Permanent magnets locked to the field",
    summary:
      "A sinusoidal stator field and a magnetized rotor. With Id = 0, torque is set by Iq. Electrical speed tracks mechanical speed through the pole pairs.",
    principle:
      "Te = (3/2) p lambda_m Iq. Electrical speed we = p wm. Speed comes from torque balance J w' = Te - Tl - B w. The FOC frame stays synced to the rotor.",
    formula: "Te = (3/2) p lambda_m Iq",
    uses: [
      "Servo axes and robot joints",
      "EV traction and e-bikes",
      "Precision spindles",
    ],
  },
  {
    slug: "bldc",
    badge: "updated",
    name: "BLDC",
    symbol: "BLDC",
    category: "electromechanical",
    tagline: "Six-step commutation from hall sensors",
    summary:
      "Three phases, trapezoidal back-EMF, and hall sensors. Each 60 deg sector energizes two windings. Torque comes from the driven currents.",
    principle:
      "Hall state 0..5 picks which two of three phases are on. Trapezoidal back-EMF flats align with the six-step sectors so startup torque is nonzero.",
    formula: "sector = floor(theta / 60 deg)",
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
      "Feedback closes the loop: e = theta_ref - theta. Drive u = Kp e + Kd e_dot turns the motor. The pot reports position so the schematic matches the model.",
    formula: "u = Kp e + Kd e_dot",
    uses: [
      "RC hobby servos",
      "Camera gimbals and pan-tilt heads",
      "Small robot joints",
    ],
  },
];
