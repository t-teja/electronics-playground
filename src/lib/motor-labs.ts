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
      "Two stator currents displaced in phase produce a rotating field component. Starting torque grows with Im Ia sin(phi) and fades with slip. Run torque follows slip and is zero at sync.",
    formula: "tau ~ Im Ia sin(phi) * slip",
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
      "A sinusoidal stator field and a magnetized rotor. With Id = 0, torque is set by Iq until bus voltage and back-EMF limit Vq. Electrical speed tracks mechanical speed through the pole pairs.",
    principle:
      "Te = (3/2) p lambda_m Iq. Vq = R Iq + we lambda_m with we = p wm. When Vq hits Vbus/sqrt(3), I_eff drops. Speed comes from torque balance under that limit.",
    formula: "Vq = R Iq + we lambda_m",
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
      "Three phases, trapezoidal back-EMF, and hall sensors. Each 60 deg sector energizes two windings in series. Line current and torque come from that path.",
    principle:
      "Hall state 0..5 picks which two of three phases are on. The two ON phases share one line current. Trapezoidal back-EMF flats align with the six-step sectors so startup torque is nonzero.",
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
