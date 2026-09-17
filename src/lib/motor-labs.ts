import type { LabMeta } from "./catalog";

export const ELECTROMECHANICAL_BLURB =
  "Current becomes torque. From brushed DC to capacitor-start, steppers, PMSM, BLDC, servos, and a 6-DoF arm.";

export const MOTOR_LABS: LabMeta[] = [
  {
    slug: "split-phase-motor",
    badge: "updated",
    name: "Capacitor-start motor",
    symbol: "CS",
    category: "electromechanical",
    tagline: "Start capacitor, aux winding, centrifugal switch",
    summary:
      "A main winding plus an auxiliary winding with a start capacitor. The capacitor shifts phase for starting torque. A centrifugal switch drops the aux once the rotor is up.",
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
    badge: "updated",
    name: "Servo",
    symbol: "SRV",
    category: "electromechanical",
    tagline: "Angle in, shaft follows",
    summary:
      "A DC motor, a driver, a railed pot on the shaft, and an internal PD loop. You set a target angle; error becomes drive until the shaft arrives.",
    principle:
      "Feedback closes the loop: e = theta_ref - theta. Drive u = Kp e + Kd e_dot commands a driver that powers the armature. The shaft pot is railed to V+/GND; the wiper reports angle.",
    formula: "u = Kp e + Kd e_dot",
    uses: [
      "RC hobby servos",
      "Camera gimbals and pan-tilt heads",
      "Small robot joints",
    ],
  },
  {
    slug: "stepper",
    badge: "updated",
    name: "Stepper motor",
    symbol: "ST",
    category: "electromechanical",
    tagline: "Discrete steps from coil sequencing",
    summary:
      "Two coils, timed currents, and a toothed rotor. Full, half, and microstep modes trade torque and smoothness. Direction follows the phase sequence.",
    principle:
      "Energizing coils A and B in sequence locks the rotor to the next tooth. Step angle is 360 deg / (n_steps). Microstepping blends coil currents for finer motion; torque falls as speed rises.",
    formula: "theta_step = 360 / n",
    uses: [
      "3D printers and CNC axes",
      "Camera focus and iris drives",
      "Precision dispensers and valves",
    ],
  },
  {
    slug: "robot-arm-6dof",
    badge: "updated",
    name: "6-DoF robot arm",
    symbol: "ARM",
    category: "electromechanical",
    tagline: "URDF arm with orbit view and local bridge",
    summary:
      "A UR5-class 6-DoF arm from a bundled MIT URDF. Orbit the view, solve IK, or drive joints from a local LAN bridge.",
    principle:
      "Forward kinematics maps joint angles to the tool pose. Inverse kinematics for a spherical wrist decouples position and orientation. Singularities appear when wrist axes align or the arm stretches to its reach limit.",
    formula: "T = A1 A2 A3 A4 A5 A6",
    uses: [
      "Pick-and-place cells",
      "Welding and finishing arms",
      "Research and teaching manipulators",
    ],
  },
];
