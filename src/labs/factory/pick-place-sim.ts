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
  /** Gripper XYZ for part follow when gripped */
  tip: { x: number; y: number; z: number };
};

const HOME = [0, -70, 90, -90, 90, 0];
const PICK = [25, -85, 100, -105, 90, 20];
const PLACE = [-35, -75, 95, -100, 90, -15];

function lerp(a: number[], b: number[], t: number) {
  return a.map((v, i) => v + (b[i]! - v) * t);
}

function fkApprox(q: number[]) {
  const r = ((q[0] ?? 0) * Math.PI) / 180;
  const reach = 0.55 + 0.15 * Math.sin(((q[1] ?? 0) * Math.PI) / 180);
  const z = 0.35 + 0.25 * Math.cos(((q[2] ?? 0) * Math.PI) / 180);
  return { x: Math.cos(r) * reach, y: Math.sin(r) * reach, z };
}

export function createPickPlaceSim() {
  const controls: PpControls = { running: false, eStop: false, speed: 1 };
  let phase: PpPhase = "idle";
  let t = 0;
  let q = [...HOME];
  let gripped = false;
  let partVisible = true;
  let partAtPlace = false;
  let cycles = 0;
  let from = [...HOME];
  let to = [...HOME];

  const snap = (): PpSnapshot => ({
    phase,
    q: [...q],
    gripped,
    partVisible,
    partAtPlace,
    cycles,
    tip: fkApprox(q),
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
      go("approach", PICK.map((v, i) => (i === 1 ? v + 25 : v)));
    } else if (phase === "approach") {
      q = lerp(from, to, t);
      if (t >= 1) go("grip", PICK);
    } else if (phase === "grip") {
      q = lerp(from, to, t);
      if (t >= 1) {
        gripped = true;
        go("lift", PICK.map((v, i) => (i === 1 ? v + 30 : v)));
      }
    } else if (phase === "lift") {
      q = lerp(from, to, t);
      if (t >= 1) go("carry", PLACE.map((v, i) => (i === 1 ? v + 25 : v)));
    } else if (phase === "carry") {
      q = lerp(from, to, t);
      if (t >= 1) go("place", PLACE);
    } else if (phase === "place") {
      q = lerp(from, to, t);
      if (t >= 1) {
        gripped = false;
        partVisible = false;
        partAtPlace = true;
        go("retract", HOME);
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
    setControls: (p: Partial<PpControls>) => {
      Object.assign(controls, p);
      if (controls.eStop) controls.running = false;
    },
    reset: () => {
      phase = "idle";
      t = 0;
      q = [...HOME];
      gripped = false;
      partVisible = true;
      partAtPlace = false;
      cycles = 0;
    },
  };
}
