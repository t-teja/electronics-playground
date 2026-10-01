export type ScaraControls = { running: boolean; eStop: boolean; speed: number };

export type ScaraSnapshot = {
  theta1: number;
  theta2: number;
  z: number;
  wrist: number;
  phase: string;
  gripped: boolean;
  cycles: number;
  tip: { x: number; y: number };
};

const L1 = 0.35;
const L2 = 0.28;

function fk(t1: number, t2: number) {
  const a = (t1 * Math.PI) / 180;
  const b = ((t1 + t2) * Math.PI) / 180;
  return { x: L1 * Math.cos(a) + L2 * Math.cos(b), y: L1 * Math.sin(a) + L2 * Math.sin(b) };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function createScaraSim() {
  const controls: ScaraControls = { running: false, eStop: false, speed: 1 };
  let phase = "idle";
  let t = 0;
  let theta1 = 20;
  let theta2 = 50;
  let z = 0.15;
  let wrist = 0;
  let gripped = false;
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
    cycles,
    tip: fk(theta1, theta2),
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
      go("toPick", { theta1: 55, theta2: 40, z: 0.15, wrist: 0 });
    } else {
      theta1 = lerp(from.theta1, to.theta1, t);
      theta2 = lerp(from.theta2, to.theta2, t);
      z = lerp(from.z, to.z, t);
      wrist = lerp(from.wrist, to.wrist, t);
      if (t >= 1) {
        if (phase === "toPick") go("downPick", { ...to, z: 0.02 });
        else if (phase === "downPick") {
          gripped = true;
          go("upPick", { ...to, z: 0.15 });
        } else if (phase === "upPick") go("toPlace", { theta1: -40, theta2: 55, z: 0.15, wrist: 90 });
        else if (phase === "toPlace") go("downPlace", { ...to, z: 0.02 });
        else if (phase === "downPlace") {
          gripped = false;
          go("upPlace", { ...to, z: 0.15 });
        } else if (phase === "upPlace") {
          cycles += 1;
          go("home", { theta1: 20, theta2: 50, z: 0.15, wrist: 0 });
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
    setControls: (p: Partial<ScaraControls>) => {
      Object.assign(controls, p);
      if (controls.eStop) controls.running = false;
    },
    reset: () => {
      phase = "idle";
      t = 0;
      theta1 = 20;
      theta2 = 50;
      z = 0.15;
      wrist = 0;
      gripped = false;
      cycles = 0;
    },
  };
}
