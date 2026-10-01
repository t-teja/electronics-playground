export type AgvControls = { running: boolean; eStop: boolean; speed: number };

export type AgvSnapshot = {
  x: number;
  z: number;
  yaw: number;
  station: number;
  dwell: number;
  warning: boolean;
  moving: boolean;
  laps: number;
};

const WAYPOINTS: { x: number; z: number; station?: boolean }[] = [
  { x: -2.5, z: 0, station: true },
  { x: -1.2, z: 0 },
  { x: 0, z: 0, station: true },
  { x: 1.2, z: 0 },
  { x: 2.5, z: 0, station: true },
  { x: 2.5, z: 1.8 },
  { x: 0, z: 1.8, station: true },
  { x: -2.5, z: 1.8 },
  { x: -2.5, z: 0 },
];

export function createAgvSim() {
  const controls: AgvControls = { running: false, eStop: false, speed: 0.7 };
  let idx = 0;
  let x = WAYPOINTS[0]!.x;
  let z = WAYPOINTS[0]!.z;
  let yaw = 0;
  let dwell = 0;
  let laps = 0;

  const snap = (): AgvSnapshot => ({
    x,
    z,
    yaw,
    station: idx,
    dwell,
    warning: dwell > 0 || controls.eStop,
    moving: controls.running && !controls.eStop && dwell <= 0,
    laps,
  });

  const step = (dt: number): AgvSnapshot => {
    if (!controls.running || controls.eStop) return snap();
    if (dwell > 0) {
      dwell -= dt;
      return snap();
    }
    const target = WAYPOINTS[(idx + 1) % WAYPOINTS.length]!;
    const dx = target.x - x;
    const dz = target.z - z;
    const dist = Math.hypot(dx, dz);
    const desiredYaw = Math.atan2(dx, dz);
    let dyaw = desiredYaw - yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    yaw += Math.max(-2.5, Math.min(2.5, dyaw * 4)) * dt;
    const v = controls.speed * (0.35 + 0.65 * Math.max(0, 1 - Math.abs(dyaw) * 1.2));
    if (dist < 0.08) {
      x = target.x;
      z = target.z;
      idx = (idx + 1) % WAYPOINTS.length;
      if (idx === 0) laps += 1;
      if (target.station) dwell = 1.1 / Math.max(0.4, controls.speed);
    } else {
      x += Math.sin(yaw) * v * dt;
      z += Math.cos(yaw) * v * dt;
    }
    return snap();
  };

  return {
    controls,
    step,
    snap: snap(),
    waypoints: WAYPOINTS,
    setControls: (p: Partial<AgvControls>) => {
      Object.assign(controls, p);
      if (controls.eStop) controls.running = false;
    },
    reset: () => {
      idx = 0;
      x = WAYPOINTS[0]!.x;
      z = WAYPOINTS[0]!.z;
      yaw = 0;
      dwell = 0;
      laps = 0;
    },
  };
}
