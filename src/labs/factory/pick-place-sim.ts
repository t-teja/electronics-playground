import { deg, fk, ik, rad, type Vec3 } from "@/lib/robot-arm-ik";

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

/** Aim tool0 slightly above part so jaws (~0.10 m along tool) meet the cube. */
const GRIP_OFFSET = 0.1;
/** Approach / lift clearance above the grasp tip (world Y). */
const APPROACH_CLEAR = 0.14;

const worldToRobot = (w: Vec3): Vec3 => ({ x: w.x, y: -w.z, z: w.y - ROOT_Y });
const robotToWorld = (r: Vec3): Vec3 => ({ x: r.x, y: r.z + ROOT_Y, z: -r.y });

/**
 * Prefer a 2π-equivalent joint vector near `prefer`, but only keep it when FK
 * tip error stays within 2 cm of the robot-frame target.
 */
function nearestGood(q: number[], prefer: number[], targetR: Vec3): number[] {
  const candidates: number[][] = [q];
  // Try shifting each joint by +/- 2π independently (small set)
  for (let i = 0; i < 6; i++) {
    for (const k of [-1, 1]) {
      const c = q.slice();
      c[i] = q[i]! + k * 2 * Math.PI;
      candidates.push(c);
    }
  }
  let best = q;
  let bestScore = Infinity;
  for (const c of candidates) {
    const tip = fk(c).tip;
    const err = Math.hypot(tip.x - targetR.x, tip.y - targetR.y, tip.z - targetR.z);
    if (err > 0.02) continue;
    const jump = c.reduce((s, v, i) => s + Math.abs(v - (prefer[i] ?? 0)), 0);
    if (jump < bestScore) {
      bestScore = jump;
      best = c;
    }
  }
  return best;
}

function solveWorld(targetW: Vec3, preferRad: number[]): number[] {
  const targetR = worldToRobot(targetW);
  const res = ik(targetR, preferRad);
  const q = nearestGood(res.q, preferRad, targetR);
  return q.map(deg);
}

function tipWorldFromQDeg(qDeg: number[]): { x: number; y: number; z: number } {
  const tip = fk(qDeg.map(rad)).tip;
  return robotToWorld(tip);
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
  const homeW = { x: 0.3, y: 0.85, z: 0.0 };

  const HOME = solveWorld(homeW, preferDown);
  const APPROACH_PICK = solveWorld(approachPickW, HOME.map(rad));
  const PICK = solveWorld(pickTipW, APPROACH_PICK.map(rad));
  const LIFT = solveWorld(approachPickW, PICK.map(rad));
  const APPROACH_PLACE = solveWorld(approachPlaceW, LIFT.map(rad));
  const PLACE = solveWorld(placeTipW, APPROACH_PLACE.map(rad));

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
