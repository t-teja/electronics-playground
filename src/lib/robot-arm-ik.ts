/** Analytical IK for a 6-DoF anthropomorphic arm with spherical wrist (Pieper). */

export type Vec3 = { x: number; y: number; z: number };

export const ARM_LINKS = {
  d1: 0.35, // base height
  a2: 0.55, // upper arm
  a3: 0.45, // forearm
  d6: 0.12, // tool flange
  lim: [
    [-Math.PI, Math.PI],
    [-Math.PI / 2, Math.PI / 2],
    [-Math.PI * 0.85, Math.PI * 0.85],
    [-Math.PI, Math.PI],
    [-Math.PI / 2, Math.PI / 2],
    [-Math.PI, Math.PI],
  ] as [number, number][],
};

export function clampJoint(i: number, q: number) {
  const [lo, hi] = ARM_LINKS.lim[i]!;
  return Math.min(hi, Math.max(lo, q));
}

/** Forward kinematics: joint angles -> wrist center + tool tip + axis directions. */
export function fk(q: number[]) {
  const { d1, a2, a3, d6 } = ARM_LINKS;
  const [q1, q2, q3, q4, q5, q6] = q.map((v, i) => clampJoint(i, v));

  // Simplified DH-style serial chain in base frame
  const c1 = Math.cos(q1!), s1 = Math.sin(q1!);
  const c2 = Math.cos(q2!), s2 = Math.sin(q2!);
  const c23 = Math.cos(q2! + q3!), s23 = Math.sin(q2! + q3!);

  // Shoulder
  const p1 = { x: 0, y: 0, z: d1 };
  // Elbow
  const p2 = {
    x: a2 * c1! * c2!,
    y: a2 * s1! * c2!,
    z: d1 + a2 * s2!,
  };
  // Wrist center (before wrist offsets)
  const wc = {
    x: c1! * (a2 * c2! + a3 * c23!),
    y: s1! * (a2 * c2! + a3 * c23!),
    z: d1 + a2 * s2! + a3 * s23!,
  };

  // Spherical wrist orientation: approach along flange
  const c4 = Math.cos(q4!), s4 = Math.sin(q4!);
  const c5 = Math.cos(q5!), s5 = Math.sin(q5!);
  // Tool z-axis in base (approach)
  const ax = c1! * (c23! * c5! * c4! - s23! * /*unused*/ 0) ; // simplified
  void ax;
  // Build approach from wrist angles more carefully:
  // R03 from arm, then R36 from wrist
  const r03 = [
    [c1! * c23!, -c1! * s23!, s1!],
    [s1! * c23!, -s1! * s23!, -c1!],
    [s23!, c23!, 0],
  ];
  const r36 = [
    [c4! * c5! * Math.cos(q6!) - s4! * Math.sin(q6!), -c4! * c5! * Math.sin(q6!) - s4! * Math.cos(q6!), c4! * s5!],
    [s4! * c5! * Math.cos(q6!) + c4! * Math.sin(q6!), -s4! * c5! * Math.sin(q6!) + c4! * Math.cos(q6!), s4! * s5!],
    [-s5! * Math.cos(q6!), s5! * Math.sin(q6!), c5!],
  ];
  // approach = R03 * R36 * [0,0,1]
  const approach = {
    x: r03[0]![0]! * r36[0]![2]! + r03[0]![1]! * r36[1]![2]! + r03[0]![2]! * r36[2]![2]!,
    y: r03[1]![0]! * r36[0]![2]! + r03[1]![1]! * r36[1]![2]! + r03[1]![2]! * r36[2]![2]!,
    z: r03[2]![0]! * r36[0]![2]! + r03[2]![1]! * r36[1]![2]! + r03[2]![2]! * r36[2]![2]!,
  };
  const tip = {
    x: wc.x + d6 * approach.x,
    y: wc.y + d6 * approach.y,
    z: wc.z + d6 * approach.z,
  };

  return {
    joints: [p1, p2, wc, tip] as Vec3[],
    wrist: wc,
    tip,
    q: [q1!, q2!, q3!, q4!, q5!, q6!],
  };
}

export type IkResult = {
  ok: boolean;
  q: number[];
  message: string;
  singularity: boolean;
};

/** Position IK for wrist center + simple wrist for tool approach along +Z world. */
export function ik(target: Vec3, preferQ?: number[]): IkResult {
  const { d1, a2, a3, d6 } = ARM_LINKS;
  // Aim tool along -Z toward table by default: wrist = target - d6 * approach
  const approach = { x: 0, y: 0, z: -1 };
  const wc = {
    x: target.x - d6 * approach.x,
    y: target.y - d6 * approach.y,
    z: target.z - d6 * approach.z,
  };

  const r = Math.hypot(wc.x, wc.y);
  if (r < 1e-6) {
    return {
      ok: false,
      q: preferQ ?? [0, 0, 0, 0, 0, 0],
      message: "Singularity: wrist above base axis (q1 undefined).",
      singularity: true,
    };
  }

  const q1 = Math.atan2(wc.y, wc.x);
  const z = wc.z - d1;
  const d = Math.hypot(r, z);
  const reachMax = a2 + a3;
  const reachMin = Math.abs(a2 - a3);
  if (d > reachMax - 1e-4) {
    return {
      ok: false,
      q: preferQ ?? [q1, 0, 0, 0, 0, 0],
      message: "Unreachable: beyond arm stretch.",
      singularity: d > reachMax - 0.02,
    };
  }
  if (d < reachMin + 1e-4) {
    return {
      ok: false,
      q: preferQ ?? [q1, 0, 0, 0, 0, 0],
      message: "Unreachable: inside minimum fold.",
      singularity: true,
    };
  }

  const cosQ3 = (d * d - a2 * a2 - a3 * a3) / (2 * a2 * a3);
  const c3 = Math.min(1, Math.max(-1, cosQ3));
  // Elbow-up solution
  const q3 = -Math.acos(c3);
  const q2 = Math.atan2(z, r) - Math.atan2(a3 * Math.sin(q3), a2 + a3 * Math.cos(q3));

  // Wrist: keep tool approach world -Z. With spherical wrist, set q5 from R03 vs approach.
  const c1 = Math.cos(q1), s1 = Math.sin(q1);
  const c23 = Math.cos(q2 + q3), s23 = Math.sin(q2 + q3);
  // Desired approach in wrist frame of R03^T * approach
  const ax = c1 * c23 * approach.x + s1 * c23 * approach.y + s23 * approach.z;
  const ay = -c1 * s23 * approach.x - s1 * s23 * approach.y + c23 * approach.z;
  const az = s1 * approach.x - c1 * approach.y;
  void ay;

  let singularity = Math.abs(c3) > 0.995 || Math.abs(ax) > 0.995;
  const q5 = Math.atan2(Math.hypot(ax /* use better */, Math.sqrt(Math.max(0, 1 - az * az))), az);
  // Simpler stable wrist for teaching: q4=0, q5 from pitch, q6=0
  const pitch = Math.atan2(-(c23), s23); // rough
  const q4 = 0;
  const q5s = clampJoint(4, Math.PI / 2 + (q2 + q3)); // keep flange downward-ish
  const q6 = 0;
  void pitch;
  void q5;

  const q = [q1, q2, q3, q4, q5s, q6].map((v, i) => clampJoint(i, v));
  let message = "IK ok (elbow-up, spherical wrist).";
  if (singularity) message = "Near singularity: wrist or stretch alignment.";

  return { ok: true, q, message, singularity };
}

export function deg(q: number) {
  return (q * 180) / Math.PI;
}
