import type { LabMeta } from "./catalog";

export const CONTROL_LABS: LabMeta[] = [
  {
    slug: "pid",
    badge: "new",
    name: "PID control",
    symbol: "PID",
    category: "digital",
    tagline: "P for gain, I for offset, D for damping",
    summary:
      "A classic controller on a mass-spring-damper plant. Step the setpoint and watch how P, I, and D reshape the response.",
    principle:
      "u = Kp e + Ki \u222be dt + Kd \u0117. Proportional alone leaves steady-state offset. Integral removes it. Derivative damps overshoot. Anti-windup clamps the integrator when the plant saturates.",
    formula: "u = Kp e + Ki \u222be + Kd \u0117",
    uses: [
      "Temperature and motion loops",
      "Process control in plants",
      "Any setpoint that must track without lag or ring",
    ],
  },
];
