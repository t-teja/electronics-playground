/**
 * UR5e FK / position IK — joint chain matches public/robots/ur5e/ur5e.urdf
 * (UniversalRobots ROS2 Description default_kinematics, BSD-3-Clause).
 *
 * All six revolute joints rotate about local Z. Spherical wrist → analytic
 * seed + damped least-squares polish so the tip matches the URDF.
 */

export type Vec3 = { x: number; y: number; z: number };

/** Joint names in URDF / bridge order (urdf-loader setJointValue keys). */
export const JOINT_NAMES = [
  "shoulder_pan_joint",
  "shoulder_lift_joint",
  "elbow_joint",
  "wrist_1_joint",
  "wrist_2_joint",
  "wrist_3_joint",
] as const;

/** Short labels for the lab sliders. */
export const JOINT_LABELS = [
  "q1 shoulder pan",
  "q2 shoulder lift",
  "q3 elbow",
  "q4 wrist 1",
  "q5 wrist 2",
  "q6 wrist 3",
] as const;

/**
 * Nominal UR5e lengths (m) from Universal_Robots_ROS2_Description
 * config/ur5e/default_kinematics.yaml
 */
export const ARM_DH = {
  d1: 0.1625,
  a2: 0.425,
  a3: 0.3922,
  d4: 0.1333,
  d5: 0.0997,
  d6: 0.0996,
  lim: [
    [-2 * Math.PI, 2 * Math.PI],
    [-2 * Math.PI, 2 * Math.PI],
    [-Math.PI, Math.PI],
    [-2 * Math.PI, 2 * Math.PI],
    [-2 * Math.PI, 2 * Math.PI],
    [-2 * Math.PI, 2 * Math.PI],
  ] as [number, number][],
};

export const ARM_LINKS = {
  d1: ARM_DH.d1,
  a2: ARM_DH.a2,
  a3: ARM_DH.a3,
  d6: ARM_DH.d6,
  lim: ARM_DH.lim,
};

export function clampJoint(i: number, q: number) {
  const [lo, hi] = ARM_DH.lim[i]!;
  return Math.min(hi, Math.max(lo, q));
}

type Mat4 = number[];

function eye(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function mul(a: Mat4, b: Mat4): Mat4 {
  const o = new Array(16).fill(0) as number[];
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[0 * 4 + r]! * b[c * 4 + 0]! +
        a[1 * 4 + r]! * b[c * 4 + 1]! +
        a[2 * 4 + r]! * b[c * 4 + 2]! +
        a[3 * 4 + r]! * b[c * 4 + 3]!;
    }
  }
  return o;
}

function transl(x: number, y: number, z: number): Mat4 {
  const m = eye();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

function rotX(a: number): Mat4 {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}
function rotY(a: number): Mat4 {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}
function rotZ(a: number): Mat4 {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/** Fixed origin (xyz + rpy) then revolute about local Z. */
function jointT(
  ox: number,
  oy: number,
  oz: number,
  rpy: [number, number, number],
  q: number,
): Mat4 {
  const [rr, rp, ry] = rpy;
  return mul(transl(ox, oy, oz), mul(rotZ(ry), mul(rotY(rp), mul(rotX(rr), rotZ(q)))));
}

function posOf(T: Mat4): Vec3 {
  return { x: T[12]!, y: T[13]!, z: T[14]! };
}

/** Forward kinematics matching ur5e.urdf (incl. base_link π yaw). */
export function fk(qIn: number[]) {
  const q = qIn.map((v, i) => clampJoint(i, v));
  const { d1, a2, a3, d4, d5, d6 } = ARM_DH;
  const halfPi = Math.PI / 2;
  const pi = Math.PI;

  // base_link → base_link_inertia
  let T = mul(transl(0, 0, 0), rotZ(pi));
  const T01 = mul(T, jointT(0, 0, d1, [0, 0, 0], q[0]!));
  const T02 = mul(T01, jointT(0, 0, 0, [halfPi, 0, 0], q[1]!));
  const T03 = mul(T02, jointT(-a2, 0, 0, [0, 0, 0], q[2]!));
  const T04 = mul(T03, jointT(-a3, 0, d4, [0, 0, 0], q[3]!));
  const T05 = mul(T04, jointT(0, -d5, 0, [halfPi, 0, 0], q[4]!));
  const T06 = mul(T05, jointT(0, d6, 0, [halfPi, pi, pi], q[5]!));
  // flange/tool0: zero translation
  const T0e = T06;

  return {
    joints: [posOf(T01), posOf(T02), posOf(T03), posOf(T04), posOf(T05), posOf(T0e)] as Vec3[],
    wrist: posOf(T04),
    tip: posOf(T0e),
    q,
  };
}

export type IkResult = {
  ok: boolean;
  q: number[];
  message: string;
  singularity: boolean;
};

/**
 * Position IK: UR-style geometric seed for q1..q3, wrist aiming for q4..q6,
 * then DLS polish so the tip matches URDF FK.
 */
export function ik(target: Vec3, preferQ?: number[]): IkResult {
  const { d1, a2, a3, d4, d5, d6 } = ARM_DH;
  const seed = preferQ ?? [0, -Math.PI / 2, Math.PI / 2, -Math.PI / 2, Math.PI / 2, 0];

  // Wrist center: tool0 is at wrist_3 origin; approach along tool Z ≈ −world offset by d6 roughly.
  // For position-only we pull the wrist center back along the vertical of the target by d6
  // as a seed (DLS finishes the rest).
  const wc = { x: target.x, y: target.y, z: target.z };

  const rxy = Math.hypot(wc.x, wc.y);
  if (rxy < 1e-5) {
    return {
      ok: false,
      q: seed.map((v, i) => clampJoint(i, v)),
      message: "Singularity: wrist above base axis.",
      singularity: true,
    };
  }

  // Account for d4 shoulder offset in the horizontal plane (UR layout).
  const q1 = Math.atan2(wc.y, wc.x);
  const r = Math.sqrt(Math.max(0, rxy * rxy - d4 * d4));
  const z = wc.z - d1;
  const d = Math.hypot(r, z);
  const reachMax = a2 + a3;
  const reachMin = Math.abs(a2 - a3);

  let q2 = -Math.PI / 2;
  let q3 = Math.PI / 2;
  let singularity = false;

  if (d <= reachMax - 1e-4 && d >= reachMin + 1e-4) {
    const cosQ3 = (d * d - a2 * a2 - a3 * a3) / (2 * a2 * a3);
    const c3 = Math.min(1, Math.max(-1, cosQ3));
    singularity = Math.abs(c3) > 0.995;
    // Elbow-up: q3 positive in UR joint sense after axis remaps → use −acos for seed
    q3 = -Math.acos(c3);
    const q2plan =
      Math.atan2(z, r) - Math.atan2(a3 * Math.sin(-q3), a2 + a3 * Math.cos(-q3));
    // shoulder_lift zero points along −Z after rpy(π/2,0,0); shift by −π/2
    q2 = q2plan - Math.PI / 2;
  } else {
    singularity = true;
  }

  const q4 = -Math.PI / 2 - (q2 + q3);
  let q = [q1, q2, q3, q4, Math.PI / 2, 0].map((v, i) => clampJoint(i, v));

  const polished = polishIk(target, q);
  if (polished.ok) {
    return {
      ok: true,
      q: polished.q,
      message: singularity
        ? "Near singularity: wrist or stretch alignment."
        : "IK ok (UR5e seed + polish).",
      singularity: singularity || polished.singularity,
    };
  }

  const retry = polishIk(
    target,
    seed.map((v, i) => clampJoint(i, v)),
  );
  if (retry.ok) {
    return {
      ok: true,
      q: retry.q,
      message: "IK ok (numerical fallback).",
      singularity: singularity || retry.singularity,
    };
  }

  return {
    ok: false,
    q,
    message: d > reachMax - 1e-4 ? "Unreachable: beyond arm stretch." : "IK did not converge.",
    singularity: true,
  };
}

function polishIk(target: Vec3, q0: number[]): IkResult {
  let q = q0.map((v, i) => clampJoint(i, v));
  const eps = 1e-4;
  let sing = false;
  for (let iter = 0; iter < 48; iter++) {
    const tip = fk(q).tip;
    const e = [target.x - tip.x, target.y - tip.y, target.z - tip.z];
    const err = Math.hypot(e[0]!, e[1]!, e[2]!);
    if (err < 1e-4) {
      return { ok: true, q, message: "IK ok (numerical polish).", singularity: sing };
    }
    const J: number[][] = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ];
    for (let j = 0; j < 6; j++) {
      const qp = q.slice();
      qp[j] = clampJoint(j, qp[j]! + eps);
      const tp = fk(qp).tip;
      J[0]![j] = (tp.x - tip.x) / eps;
      J[1]![j] = (tp.y - tip.y) / eps;
      J[2]![j] = (tp.z - tip.z) / eps;
    }
    const lambda = 2e-3;
    const A = [
      [lambda, 0, 0],
      [0, lambda, 0],
      [0, 0, lambda],
    ];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        for (let k = 0; k < 6; k++) A[r]![c]! += J[r]![k]! * J[c]![k]!;
      }
    }
    const det =
      A[0]![0]! * (A[1]![1]! * A[2]![2]! - A[1]![2]! * A[2]![1]!) -
      A[0]![1]! * (A[1]![0]! * A[2]![2]! - A[1]![2]! * A[2]![0]!) +
      A[0]![2]! * (A[1]![0]! * A[2]![1]! - A[1]![1]! * A[2]![0]!);
    if (Math.abs(det) < 1e-14) {
      sing = true;
      break;
    }
    const inv = [
      [
        (A[1]![1]! * A[2]![2]! - A[1]![2]! * A[2]![1]!) / det,
        (A[0]![2]! * A[2]![1]! - A[0]![1]! * A[2]![2]!) / det,
        (A[0]![1]! * A[1]![2]! - A[0]![2]! * A[1]![1]!) / det,
      ],
      [
        (A[1]![2]! * A[2]![0]! - A[1]![0]! * A[2]![2]!) / det,
        (A[0]![0]! * A[2]![2]! - A[0]![2]! * A[2]![0]!) / det,
        (A[0]![2]! * A[1]![0]! - A[0]![0]! * A[1]![2]!) / det,
      ],
      [
        (A[1]![0]! * A[2]![1]! - A[1]![1]! * A[2]![0]!) / det,
        (A[0]![1]! * A[2]![0]! - A[0]![0]! * A[2]![1]!) / det,
        (A[0]![0]! * A[1]![1]! - A[0]![1]! * A[1]![0]!) / det,
      ],
    ];
    const u = [
      inv[0]![0]! * e[0]! + inv[0]![1]! * e[1]! + inv[0]![2]! * e[2]!,
      inv[1]![0]! * e[0]! + inv[1]![1]! * e[1]! + inv[1]![2]! * e[2]!,
      inv[2]![0]! * e[0]! + inv[2]![1]! * e[1]! + inv[2]![2]! * e[2]!,
    ];
    for (let j = 0; j < 6; j++) {
      const dq = J[0]![j]! * u[0]! + J[1]![j]! * u[1]! + J[2]![j]! * u[2]!;
      q[j] = clampJoint(j, q[j]! + dq);
    }
  }
  const tip = fk(q).tip;
  const err = Math.hypot(tip.x - target.x, tip.y - target.y, tip.z - target.z);
  return {
    ok: err < 0.025,
    q,
    message: err < 0.025 ? "IK ok (numerical)." : "IK did not converge.",
    singularity: sing || err >= 0.025,
  };
}

export function deg(q: number) {
  return (q * 180) / Math.PI;
}

export function rad(d: number) {
  return (d * Math.PI) / 180;
}
