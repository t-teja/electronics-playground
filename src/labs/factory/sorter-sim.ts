export type PartColor = "red" | "blue" | "amber";
export type PartSize = "small" | "large";

export type SortPart = {
  id: number;
  x: number;
  /** Lateral travel into side chute (+Z), null while on main belt. */
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

/** Vision gate on main belt (world X). */
const GATE_X = 2.15;
/** Divert mouths staggered along belt — paddles kick into bins BESIDE (+Z). */
const DIVERT_XS = [2.45, 2.95, 3.45] as const;
/** Lateral chute length into side bin (world +Z). */
const LANE_LEN = 0.85;
/** End of main belt (reject / overrun). */
const END_X = 4.0;

let nextId = 1;

export function createSorterSim() {
  const controls: SorterControls = { running: false, eStop: false, speed: 0.45 };
  let parts: SortPart[] = [];
  let spawnAcc = 0;
  const counts: Record<PartColor, number> = { red: 0, blue: 0, amber: 0 };
  let classified = 0;

  const seedDemo = () => {
    // Idle Fit: only under hopper / early infeed. Never mid-belt or side chutes.
    const demo: Array<{ x: number; color: PartColor; size: PartSize }> = [
      { x: 0.3, color: "red", size: "large" },
      { x: 0.5, color: "blue", size: "small" },
      { x: 0.7, color: "amber", size: "large" },
      { x: 0.9, color: "red", size: "small" },
    ];
    parts = demo.map((d) => ({
      id: nextId++,
      x: d.x,
      lane: null,
      laneY: 0,
      color: d.color,
      size: d.size,
      done: false,
    }));
  };

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
      x: 0.05,
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
      const divertX = DIVERT_XS[LANE_FOR[p.color]]!;
      if (p.x >= divertX) {
        p.x = divertX;
        p.lane = LANE_FOR[p.color];
        p.laneY = 0;
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

  seedDemo();

  return {
    controls,
    step,
    snap: snap(),
    setControls: (p: Partial<SorterControls>) => {
      const wasRunning = controls.running && !controls.eStop;
      Object.assign(controls, p);
      if (controls.eStop) controls.running = false;
      const nowRunning = controls.running && !controls.eStop;
      if (nowRunning && !wasRunning) spawnAcc = 999;
    },
    reset: () => {
      spawnAcc = 0;
      counts.red = counts.blue = counts.amber = 0;
      classified = 0;
      nextId = 1;
      seedDemo();
    },
  };
}

export const SORTER_LANES = { GATE_X, END_X, LANE_LEN, LANE_FOR, DIVERT_XS };
