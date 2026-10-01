export type StationId = "infeed" | "fill" | "cap" | "label" | "reject" | "outfeed";

export type Bottle = {
  id: number;
  /** Position along main line in meters (0 = infeed start). */
  x: number;
  /** On reject spur when true. */
  onReject: boolean;
  rejectY: number;
  fill: number;
  fillTarget: number;
  capped: boolean;
  labeled: boolean;
  rejected: boolean;
  done: boolean;
};

export type Photoeyes = Record<StationId, boolean>;

export type BottlingControls = {
  running: boolean;
  eStop: boolean;
  /** Conveyor speed m/s, typically 0.15..0.9 */
  speed: number;
  /** Desired fill fraction 0.55..1 */
  fillSetpoint: number;
};

export type BottlingSnapshot = {
  bottles: Bottle[];
  photoeyes: Photoeyes;
  produced: number;
  rejected: number;
  fillingId: number | null;
};

/** Station centers along X (meters). */
export const STATIONS: Record<StationId, number> = {
  infeed: 0.4,
  fill: 2.0,
  cap: 3.4,
  label: 4.8,
  reject: 6.0,
  outfeed: 7.4,
};

export const LINE_END = 8.2;
export const REJECT_LEN = 1.4;

const SPAWN_GAP = 0.55;
const FILL_ZONE = 0.18;
const PHOTOEYE_W = 0.12;

let nextId = 1;

export function createBottlingSim(): {
  controls: BottlingControls;
  snap: BottlingSnapshot;
  step: (dt: number) => BottlingSnapshot;
  reset: () => void;
  setControls: (patch: Partial<BottlingControls>) => void;
} {
  const controls: BottlingControls = {
    running: false,
    eStop: false,
    speed: 0.35,
    fillSetpoint: 0.92,
  };

  let bottles: Bottle[] = [];
  let produced = 0;
  let rejected = 0;
  let spawnAcc = 0;
  let fillingId: number | null = null;

  const emptyEyes = (): Photoeyes => ({
    infeed: false,
    fill: false,
    cap: false,
    label: false,
    reject: false,
    outfeed: false,
  });

  const snapshot = (): BottlingSnapshot => ({
    bottles: bottles.map((b) => ({ ...b })),
    photoeyes: sense(),
    produced,
    rejected,
    fillingId,
  });

  const sense = (): Photoeyes => {
    const eyes = emptyEyes();
    for (const b of bottles) {
      if (b.done) continue;
      if (b.onReject) {
        if (Math.abs(b.rejectY - REJECT_LEN * 0.5) < PHOTOEYE_W) eyes.reject = true;
        continue;
      }
      for (const id of Object.keys(STATIONS) as StationId[]) {
        if (id === "reject") continue;
        if (Math.abs(b.x - STATIONS[id]) < PHOTOEYE_W) eyes[id] = true;
      }
    }
    return eyes;
  };

  const spawn = () => {
    const last = bottles.filter((b) => !b.onReject && !b.done).sort((a, c) => a.x - c.x)[0];
    if (last && last.x < SPAWN_GAP) return;
    // Slight fill variance so underfill rejects are visible when setpoint is high.
    const variance = (Math.random() - 0.55) * 0.18;
    const fillTarget = Math.min(1, Math.max(0.35, controls.fillSetpoint + variance));
    bottles.push({
      id: nextId++,
      x: 0,
      onReject: false,
      rejectY: 0,
      fill: 0,
      fillTarget,
      capped: false,
      labeled: false,
      rejected: false,
      done: false,
    });
  };

  const step = (dt: number): BottlingSnapshot => {
    const active = controls.running && !controls.eStop;
    const v = active ? controls.speed : 0;

    if (active) {
      spawnAcc += dt;
      const period = SPAWN_GAP / Math.max(v, 0.08);
      if (spawnAcc >= period) {
        spawnAcc = 0;
        spawn();
      }
    } else {
      spawnAcc = 0;
    }

    fillingId = null;
    const keep: Bottle[] = [];

    for (const b of bottles) {
      if (b.done) continue;

      if (b.onReject) {
        b.rejectY += v * dt;
        if (b.rejectY >= REJECT_LEN) {
          b.done = true;
          continue;
        }
        keep.push(b);
        continue;
      }

      // Hold at fill while filling.
      const atFill = Math.abs(b.x - STATIONS.fill) < FILL_ZONE && b.fill < b.fillTarget - 0.01;
      if (atFill && active) {
        fillingId = b.id;
        const rate = 0.55 * (0.6 + controls.speed);
        b.fill = Math.min(b.fillTarget, b.fill + rate * dt);
        // Nudge toward fill center while filling.
        b.x += (STATIONS.fill - b.x) * Math.min(1, 4 * dt);
      } else {
        b.x += v * dt;
      }

      // Cap
      if (!b.capped && b.x >= STATIONS.cap - 0.05 && b.fill >= b.fillTarget - 0.02) {
        b.capped = true;
      }
      // Label
      if (!b.labeled && b.capped && b.x >= STATIONS.label - 0.05) {
        b.labeled = true;
      }

      // Reject decision at divert
      if (!b.rejected && b.x >= STATIONS.reject - 0.02) {
        const underfill = b.fill < controls.fillSetpoint - 0.06;
        if (underfill) {
          b.rejected = true;
          b.onReject = true;
          rejected += 1;
          keep.push(b);
          continue;
        }
      }

      if (b.x >= LINE_END) {
        b.done = true;
        produced += 1;
        continue;
      }
      keep.push(b);
    }

    bottles = keep;
    return snapshot();
  };

  const reset = () => {
    bottles = [];
    produced = 0;
    rejected = 0;
    spawnAcc = 0;
    fillingId = null;
    nextId = 1;
  };

  const setControls = (patch: Partial<BottlingControls>) => {
    Object.assign(controls, patch);
    if (controls.eStop) controls.running = false;
  };

  return { controls, snap: snapshot(), step, reset, setControls };
}
