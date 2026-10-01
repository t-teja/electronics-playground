export type PartColor = "red" | "blue" | "amber";
export type PartSize = "small" | "large";

export type SortPart = {
  id: number;
  x: number;
  lane: 0 | 1 | 2 | null;
  laneY: number;
  color: PartColor;
  size: PartSize;
  done: boolean;
};

export type SorterControls = { running: boolean; eStop: boolean; speed: number };

export type SorterSnapshot = {
  parts: SortPart[];
  counts: Record<PartColor, number>;
  photoeye: boolean;
  classified: number;
};

const COLORS: PartColor[] = ["red", "blue", "amber"];
const LANE_FOR: Record<PartColor, 0 | 1 | 2> = { red: 0, blue: 1, amber: 2 };
const GATE_X = 3.2;
const END_X = 5.5;
const LANE_LEN = 1.6;

let nextId = 1;

export function createSorterSim() {
  const controls: SorterControls = { running: false, eStop: false, speed: 0.45 };
  let parts: SortPart[] = [];
  let spawnAcc = 0;
  const counts: Record<PartColor, number> = { red: 0, blue: 0, amber: 0 };
  let classified = 0;

  const snap = (): SorterSnapshot => ({
    parts: parts.map((p) => ({ ...p })),
    counts: { ...counts },
    photoeye: parts.some((p) => !p.done && p.lane == null && Math.abs(p.x - GATE_X) < 0.12),
    classified,
  });

  const spawn = () => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
    const size: PartSize = Math.random() > 0.45 ? "large" : "small";
    parts.push({
      id: nextId++,
      x: 0,
      lane: null,
      laneY: 0,
      color,
      size,
      done: false,
    });
  };

  const step = (dt: number): SorterSnapshot => {
    const active = controls.running && !controls.eStop;
    const v = active ? controls.speed : 0;
    if (active) {
      spawnAcc += dt;
      if (spawnAcc > 0.7 / Math.max(0.3, controls.speed)) {
        spawnAcc = 0;
        if (parts.filter((p) => !p.done && p.lane == null).length < 6) spawn();
      }
    }
    const keep: SortPart[] = [];
    for (const p of parts) {
      if (p.done) continue;
      if (p.lane != null) {
        p.laneY += v * dt;
        if (p.laneY >= LANE_LEN) {
          p.done = true;
          counts[p.color] += 1;
          classified += 1;
          continue;
        }
        keep.push(p);
        continue;
      }
      p.x += v * dt;
      if (p.x >= GATE_X && p.lane == null) {
        // Large amber goes to lane 2 still; size only affects mesh scale.
        p.lane = LANE_FOR[p.color];
      }
      if (p.x >= END_X && p.lane == null) {
        p.done = true;
        continue;
      }
      keep.push(p);
    }
    parts = keep;
    return snap();
  };

  return {
    controls,
    step,
    snap: snap(),
    setControls: (p: Partial<SorterControls>) => {
      Object.assign(controls, p);
      if (controls.eStop) controls.running = false;
    },
    reset: () => {
      parts = [];
      spawnAcc = 0;
      counts.red = counts.blue = counts.amber = 0;
      classified = 0;
      nextId = 1;
    },
  };
}

export const SORTER_LANES = { GATE_X, END_X, LANE_LEN, LANE_FOR };
