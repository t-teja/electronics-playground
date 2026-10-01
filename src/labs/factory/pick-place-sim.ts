import { clampJoint, deg, fk, ik, rad, type Vec3 } from "@/lib/robot-arm-ik";

export type PpPhase = "idle" | "approach" | "grip" | "lift" | "carry" | "place" | "retract";

export type PpControls = {
  running: boolean;
  eStop: boolean;
  speed: number;
};

export type PpSnapshot = {
  phase: PpPhase;
  /** Joint angles deg q1..q6 */
  q: number[];
  gripped: boolean;
  partVisible: boolean;
  partAtPlace: boolean;
  cycles: number;
  /** Gripper / tool tip in world XYZ */
  tip: { x: number; y: number; z: number };
};

/** Nest / fixture payload centers (world). */
export const PP_NEST = { x: 0.45, y: 0.54, z: 0.25 };
export const PP_PLACE = { x: -0.4, y: 0.54, z: -0.2 };

/** Robot root: position (0, 0.47, 0), rotation.x = -pi/2 */
const ROOT_Y = 0.47;
/** Keep every FK joint above table top (~0.47). */
const TABLE_CLEAR_Y = 0.5;

/** Aim tool0 slightly above part so jaws (~0.10 m along tool +Z) meet the cube. */
const GRIP_OFFSET = 0.1;
/** Approach / lift clearance above the grasp tip (world Y). */
const APPROACH_CLEAR = 0.28;

const worldToRobot = (w: Vec3): Vec3 => ({ x: w.x, y: -w.z, z: w.y - ROOT_Y });
const robotToWorld = (r: Vec3): Vec3 => ({ x: r.x, y: r.z + ROOT_Y, z: -r.y });

/** Tool +Z in robot frame that maps to world −Y after root Rx(−π/2). */
const TOOL_DOWN_R: Vec3 = { x: 0, y: 0, z: -1 };

function toolZRobot(q: number[]): Vec3 {
  const f = fk(q);
  const a = f.joints[4]!;
  const b = f.tip;
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const L = Math.hypot(d.x, d.y, d.z) || 1;
  return { x: d.x / L, y: d.y / L, z: d.z / L };
}

function minJointWorldY(q: number[]): number {
  let m = Infinity;
  for (const j of fk(q).joints) {
    const y = robotToWorld(j).y;
    if (y < m) m = y;
  }
  return m;
}

/**
 * Position IK + tool-down orientation (+ table clearance). Prefer seed near
 * `preferRad` so consecutive waypoints stay continuous in joint space.
 */
function solveWorldToolDown(targetW: Vec3, preferRad: number[]): number[] {
  const targetR = worldToRobot(targetW);
  const seeds: number[][] = [
    preferRad.slice(),
    ik(targetR, preferRad).q,
    [0, -Math.PI / 2, Math.PI / 2, -Math.PI / 2, Math.PI / 2, 0],
  ];

  let bestQ = preferRad.slice();
  let bestScore = Infinity;

  for (const seed of seeds) {
    let q = seed.map((v, i) => clampJoint(i, v));
    const eps = 1e-4;
    for (let iter = 0; iter < 100; iter++) {
      const tip = fk(q).tip;
      const tz = toolZRobot(q);
      const below = Math.max(0, TABLE_CLEAR_Y - minJointWorldY(q));
      const e = [
        targetR.x - tip.x,
        targetR.y - tip.y,
        targetR.z - tip.z,
        0.4 * (TOOL_DOWN_R.x - tz.x),
        0.4 * (TOOL_DOWN_R.y - tz.y),
        0.4 * (TOOL_DOWN_R.z - tz.z),
      ];
      if (Math.hypot(e[0]!, e[1]!, e[2]!, e[3]!, e[4]!, e[5]!) < 1e-3 && below < 1e-3) {
        break;
      }
      const J: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
      for (let j = 0; j < 6; j++) {
        const qp = q.slice();
        qp[j] = clampJoint(j, qp[j]! + eps);
        const tp = fk(qp).tip;
        const tzp = toolZRobot(qp);
        J[0]![j] = (tp.x - tip.x) / eps;
        J[1]![j] = (tp.y - tip.y) / eps;
        J[2]![j] = (tp.z - tip.z) / eps;
        J[3]![j] = (0.4 * (tzp.x - tz.x)) / eps;
        J[4]![j] = (0.4 * (tzp.y - tz.y)) / eps;
        J[5]![j] = (0.4 * (tzp.z - tz.z)) / eps;
      }
      const lambda = 8e-3;
      const A: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          let s = r === c ? lambda : 0;
          for (let k = 0; k < 6; k++) s += J[r]![k]! * J[c]![k]!;
          A[r]![c] = s;
        }
      }
      const M = A.map((row, i) => [...row, e[i]!]);
      for (let i = 0; i < 6; i++) {
        let piv = i;
        for (let r = i + 1; r < 6; r++) {
          if (Math.abs(M[r]![i]!) > Math.abs(M[piv]![i]!)) piv = r;
        }
        [M[i], M[piv]] = [M[piv]!, M[i]!];
        const div = M[i]![i]! || 1e-12;
        for (let c = i; c < 7; c++) M[i]![c] = M[i]![c]! / div;
        for (let r = 0; r < 6; r++) {
          if (r === i) continue;
          const f = M[r]![i]!;
          for (let c = i; c < 7; c++) M[r]![c] = M[r]![c]! - f * M[i]![c]!;
        }
      }
      const u = M.map((row) => row[6]!);
      for (let j = 0; j < 6; j++) {
        let dq = 0;
        for (let r = 0; r < 6; r++) dq += J[r]![j]! * u[r]!;
        if (below > 0 && j === 1) dq -= 0.15 * below;
        q[j] = clampJoint(j, q[j]! + dq);
      }
    }

    const tip = fk(q).tip;
    const tz = toolZRobot(q);
    const tipErr = Math.hypot(tip.x - targetR.x, tip.y - targetR.y, tip.z - targetR.z);
    const oriErr = Math.hypot(
      tz.x - TOOL_DOWN_R.x,
      tz.y - TOOL_DOWN_R.y,
      tz.z - TOOL_DOWN_R.z,
    );
    const below = Math.max(0, TABLE_CLEAR_Y - minJointWorldY(q));
    const jump = q.reduce((s, v, i) => s + Math.abs(v - (preferRad[i] ?? 0)), 0);
    const score = tipErr * 12 + oriErr * 3 + below * 25 + jump * 0.02;
    if (score < bestScore) {
      bestScore = score;
      bestQ = q;
    }
  }
  return bestQ.map(deg);
}

function tipWorldFromQDeg(qDeg: number[]): { x: number; y: number; z: number } {
  return robotToWorld(fk(qDeg.map(rad)).tip);
}

function buildTargets() {
  const preferDown = [0, -Math.PI / 2, Math.PI / 2, -Math.PI / 2, Math.PI / 2, 0];
  const pickTipW = { x: PP_NEST.x, y: PP_NEST.y + GRIP_OFFSET, z: PP_NEST.z };
  const placeTipW = { x: PP_PLACE.x, y: PP_PLACE.y + GRIP_OFFSET, z: PP_PLACE.z };
  const approachPickW = {
    x: PP_NEST.x,
    y: PP_NEST.y + GRIP_OFFSET + APPROACH_CLEAR,
    z: PP_NEST.z,
  };
  const approachPlaceW = {
    x: PP_PLACE.x,
    y: PP_PLACE.y + GRIP_OFFSET + APPROACH_CLEAR,
    z: PP_PLACE.z,
  };
  const homeW = { x: 0.3, y: 0.95, z: 0.1 };

  const HOME = solveWorldToolDown(homeW, preferDown);
  const APPROACH_PICK = solveWorldToolDown(approachPickW, HOME.map(rad));
  const PICK = solveWorldToolDown(pickTipW, APPROACH_PICK.map(rad));
  // Same Cartesian as approach — reuse joints so lift is a pure retract
  const LIFT = [...APPROACH_PICK];
  const APPROACH_PLACE = solveWorldToolDown(approachPlaceW, LIFT.map(rad));
  const PLACE = solveWorldToolDown(placeTipW, APPROACH_PLACE.map(rad));

  return { HOME, APPROACH_PICK, PICK, LIFT, APPROACH_PLACE, PLACE };
}

const TARGETS = buildTargets();

function lerp(a: number[], b: number[], t: number) {
  return a.map((v, i) => v + (b[i]! - v) * t);
}

export function createPickPlaceSim() {
  const controls: PpControls = { running: false, eStop: false, speed: 1 };
  let phase: PpPhase = "idle";
  let t = 0;
  let q = [...TARGETS.HOME];
  let gripped = false;
  let partVisible = true;
  let partAtPlace = false;
  let cycles = 0;
  let from = [...TARGETS.HOME];
  let to = [...TARGETS.HOME];

  const snap = (): PpSnapshot => ({
    phase,
    q: [...q],
    gripped,
    partVisible,
    partAtPlace,
    cycles,
    tip: tipWorldFromQDeg(q),
  });

  const go = (next: PpPhase, target: number[]) => {
    phase = next;
    t = 0;
    from = [...q];
    to = [...target];
  };

  const step = (dt: number): PpSnapshot => {
    if (controls.eStop || !controls.running) return snap();
    const rate = 0.9 * controls.speed;
    t = Math.min(1, t + dt * rate);

    if (phase === "idle") {
      partVisible = true;
      partAtPlace = false;
      gripped = false;
      go("approach", TARGETS.APPROACH_PICK);
    } else if (phase === "approach") {
      q = lerp(from, to, t);
      if (t >= 1) go("grip", TARGETS.PICK);
    } else if (phase === "grip") {
      q = lerp(from, to, t);
      if (t >= 1) {
        gripped = true;
        go("lift", TARGETS.LIFT);
      }
    } else if (phase === "lift") {
      q = lerp(from, to, t);
      if (t >= 1) go("carry", TARGETS.APPROACH_PLACE);
    } else if (phase === "carry") {
      q = lerp(from, to, t);
      if (t >= 1) go("place", TARGETS.PLACE);
    } else if (phase === "place") {
      q = lerp(from, to, t);
      if (t >= 1) {
        gripped = false;
        partVisible = false;
        partAtPlace = true;
        go("retract", TARGETS.HOME);
      }
    } else if (phase === "retract") {
      q = lerp(from, to, t);
      if (t >= 1) {
        cycles += 1;
        phase = "idle";
        t = 0;
      }
    }
    return snap();
  };

  return {
    controls,
    step,
    snap: snap(),
    targets: TARGETS,
    setControls: (p: Partial<PpControls>) => {
      Object.assign(controls, p);
      if (controls.eStop) controls.running = false;
    },
    reset: () => {
      phase = "idle";
      t = 0;
      q = [...TARGETS.HOME];
      gripped = false;
      partVisible = true;
      partAtPlace = false;
      cycles = 0;
    },
  };
}
