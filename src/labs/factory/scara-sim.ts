export type ScaraControls = { running: boolean; eStop: boolean; speed: number };

export type ScaraSnapshot = {
  theta1: number;
  theta2: number;
  z: number;
  wrist: number;
  phase: string;
  gripped: boolean;
  partVisible: boolean;
  partAtPlace: boolean;
  cycles: number;
  tip: { x: number; y: number };
};

export const SCARA_L1 = 0.35;
export const SCARA_L2 = 0.28;

/** Feeder / tray targets in planar XY (maps to world XZ). */
export const SCARA_FEEDER = { x: 0.45, y: 0.25 };
export const SCARA_TRAY = { x: -0.25, y: -0.2 };

const L1 = SCARA_L1;
const L2 = SCARA_L2;

export function scaraFk(t1: number, t2: number) {
  const a = (t1 * Math.PI) / 180;
  const b = ((t1 + t2) * Math.PI) / 180;
  return { x: L1 * Math.cos(a) + L2 * Math.cos(b), y: L1 * Math.sin(a) + L2 * Math.sin(b) };
}

/** Planar IK; elbowSign +1 elbow-left / -1 elbow-right. Angles in degrees. */
export function scaraIk(
  x: number,
  y: number,
  elbowSign: 1 | -1 = 1,
): { theta1: number; theta2: number; ok: boolean } {
  const c2 = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (c2 < -1.001 || c2 > 1.001) {
    return { theta1: 0, theta2: 0, ok: false };
  }
  const c2c = Math.min(1, Math.max(-1, c2));
  const s2 = elbowSign * Math.sqrt(Math.max(0, 1 - c2c * c2c));
  const t2 = Math.atan2(s2, c2c);
  const t1 = Math.atan2(y, x) - Math.atan2(L2 * s2, L1 + L2 * c2c);
  const wrap = (d: number) => {
    let v = (d * 180) / Math.PI;
    while (v > 180) v -= 360;
    while (v < -180) v += 360;
    return v;
  };
  return { theta1: wrap(t1), theta2: wrap(t2), ok: true };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const Z_UP = 0.15;
const Z_DOWN = 0.02;

export function createScaraSim() {
  const controls: ScaraControls = { running: false, eStop: false, speed: 1 };

  // Prefer elbow configs that stay continuous feeder <-> tray
  const pickIk = scaraIk(SCARA_FEEDER.x, SCARA_FEEDER.y, -1);
  const placeIk = scaraIk(SCARA_TRAY.x, SCARA_TRAY.y, -1);
  const homeIk = scaraIk(0.4, 0.1, -1);

  let phase = "idle";
  let t = 0;
  let theta1 = homeIk.theta1;
  let theta2 = homeIk.theta2;
  let z = Z_UP;
  let wrist = 0;
  let gripped = false;
  let partVisible = true;
  let partAtPlace = false;
  let cycles = 0;
  let from = { theta1, theta2, z, wrist };
  let to = { theta1, theta2, z, wrist };

  const snap = (): ScaraSnapshot => ({
    theta1,
    theta2,
    z,
    wrist,
    phase,
    gripped,
    partVisible,
    partAtPlace,
    cycles,
    tip: scaraFk(theta1, theta2),
  });

  const go = (p: string, target: typeof to) => {
    phase = p;
    t = 0;
    from = { theta1, theta2, z, wrist };
    to = target;
  };

  const step = (dt: number): ScaraSnapshot => {
    if (!controls.running || controls.eStop) return snap();
    const rate = 1.1 * controls.speed;
    t = Math.min(1, t + dt * rate);

    if (phase === "idle") {
      partVisible = true;
      partAtPlace = false;
      gripped = false;
      go("toPick", {
        theta1: pickIk.theta1,
        theta2: pickIk.theta2,
        z: Z_UP,
        wrist: 0,
      });
    } else {
      theta1 = lerp(from.theta1, to.theta1, t);
      theta2 = lerp(from.theta2, to.theta2, t);
      z = lerp(from.z, to.z, t);
      wrist = lerp(from.wrist, to.wrist, t);
      if (t >= 1) {
        if (phase === "toPick") go("downPick", { ...to, z: Z_DOWN });
        else if (phase === "downPick") {
          gripped = true;
          partVisible = true;
          go("upPick", { ...to, z: Z_UP });
        } else if (phase === "upPick") {
          go("toPlace", {
            theta1: placeIk.theta1,
            theta2: placeIk.theta2,
            z: Z_UP,
            wrist: 90,
          });
        } else if (phase === "toPlace") go("downPlace", { ...to, z: Z_DOWN });
        else if (phase === "downPlace") {
          gripped = false;
          partVisible = false;
          partAtPlace = true;
          go("upPlace", { ...to, z: Z_UP });
        } else if (phase === "upPlace") {
          cycles += 1;
          go("home", {
            theta1: homeIk.theta1,
            theta2: homeIk.theta2,
            z: Z_UP,
            wrist: 0,
          });
        } else if (phase === "home") {
          phase = "idle";
          t = 0;
        }
      }
    }
    return snap();
  };

  return {
    controls,
    step,
    snap: snap(),
    L1,
    L2,
    pickIk,
    placeIk,
    setControls: (p: Partial<ScaraControls>) => {
      Object.assign(controls, p);
      if (controls.eStop) controls.running = false;
    },
    reset: () => {
      phase = "idle";
      t = 0;
      theta1 = homeIk.theta1;
      theta2 = homeIk.theta2;
      z = Z_UP;
      wrist = 0;
      gripped = false;
      partVisible = true;
      partAtPlace = false;
      cycles = 0;
    },
  };
}
