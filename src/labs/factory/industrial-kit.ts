import * as THREE from "three";
import {
  brushedAluminum,
  machineBlue,
  matteBlack,
  paintedSteel,
  plastic,
  rubber,
  safetyYellow,
  steel,
} from "./materials";

/** Beveled box via slightly inset multi-mesh (top/side edge lip). */
export function bevelBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  bevel = 0.012,
): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(w - bevel * 2, h, d - bevel * 2),
    mat,
  );
  core.castShadow = true;
  core.receiveShadow = true;
  g.add(core);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(w, bevel, d),
    mat,
  );
  top.position.y = h / 2 - bevel / 2;
  top.castShadow = true;
  g.add(top);
  const bot = new THREE.Mesh(new THREE.BoxGeometry(w, bevel, d), mat);
  bot.position.y = -h / 2 + bevel / 2;
  g.add(bot);
  return g;
}

export function boltCircle(
  parent: THREE.Object3D,
  y: number,
  radius: number,
  count = 8,
  boltR = 0.01,
) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(boltR, boltR, 0.022, 10),
      steel(0x94a3b8, 0.9, 0.22),
    );
    bolt.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    parent.add(bolt);
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(boltR * 1.4, boltR * 1.4, 0.008, 6),
      brushedAluminum(),
    );
    head.position.set(Math.cos(a) * radius, y + 0.012, Math.sin(a) * radius);
    parent.add(head);
  }
}

/** Cylindrical motor can with end bell + cooling ribs. */
export function motorHousing(
  length = 0.18,
  radius = 0.055,
  axis: "x" | "y" | "z" = "x",
): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 28),
    brushedAluminum(0xb8c0c8),
  );
  body.castShadow = true;
  g.add(body);
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, 0.028, 28),
    paintedSteel(0x334155),
  );
  bell.position.y = length / 2 - 0.01;
  g.add(bell);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, length * 0.35, 12),
    steel(0xe2e8f0, 0.92, 0.18),
  );
  shaft.position.y = length / 2 + length * 0.12;
  g.add(shaft);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.006, length * 0.7, radius * 0.18),
      brushedAluminum(0xa8b0bc),
    );
    rib.position.set(Math.cos(a) * radius * 0.92, 0, Math.sin(a) * radius * 0.92);
    rib.rotation.y = -a;
    g.add(rib);
  }
  if (axis === "x") g.rotation.z = Math.PI / 2;
  else if (axis === "z") g.rotation.x = Math.PI / 2;
  return g;
}

/** Pneumatic cylinder with end caps, rod, clevis pad. */
export function pneumaticCylinder(
  bodyLen = 0.28,
  radius = 0.04,
  axis: "x" | "z" = "z",
): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, bodyLen, 24),
    brushedAluminum(0xc8d0d8),
  );
  body.castShadow = true;
  g.add(body);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.15, radius * 1.15, 0.022, 20),
      paintedSteel(0x334155),
    );
    cap.position.y = s * (bodyLen / 2);
    g.add(cap);
  }
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, bodyLen * 0.7, 12),
    steel(0xe2e8f0, 0.9, 0.2),
  );
  rod.position.y = -bodyLen * 0.55;
  g.add(rod);
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 2.2, 0.04, radius * 2.4),
    rubber(0x1c1917),
  );
  pad.position.y = -bodyLen * 0.9;
  g.add(pad);
  // Airline fitting
  const fit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.05, 8),
    plastic(0x0ea5e9, 0.45),
  );
  fit.position.set(radius * 0.9, bodyLen * 0.2, 0);
  fit.rotation.z = Math.PI / 2;
  g.add(fit);
  if (axis === "z") g.rotation.x = Math.PI / 2;
  else g.rotation.z = Math.PI / 2;
  return g;
}

/** Segmented cable carrier chain. */
export function cableCarrier(
  links = 8,
  step = 0.045,
  bend = 0.35,
): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < links; i++) {
    const link = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.032, 0.055),
      paintedSteel(0x57534e),
    );
    const t = i / Math.max(1, links - 1);
    link.position.set(i * step, Math.sin(t * Math.PI * bend) * 0.06, 0);
    link.rotation.z = Math.cos(t * Math.PI) * 0.25;
    link.castShadow = true;
    g.add(link);
  }
  return g;
}

/** Industrial HMI panel on pedestal. */
export function hmiPanel(height = 0.9): THREE.Group {
  const g = new THREE.Group();
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, height * 0.7, 16),
    paintedSteel(0x3f3f46),
  );
  pedestal.position.y = height * 0.35;
  g.add(pedestal);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.04, 20),
    matteBlack(),
  );
  base.position.y = 0.02;
  g.add(base);
  const box = bevelBox(0.38, 0.48, 0.14, paintedSteel(0x1e293b, 0.4, 0.48));
  box.position.y = height;
  g.add(box);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.025), matteBlack());
  bezel.position.set(0, height + 0.04, 0.08);
  g.add(bezel);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0x134e4a,
      emissive: 0x5eead4,
      emissiveIntensity: 0.55,
      metalness: 0.1,
      roughness: 0.35,
    }),
  );
  screen.position.set(0, height + 0.04, 0.095);
  g.add(screen);
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.012, 12),
      i === 0 ? plastic(0x22c55e, 0.4) : i === 1 ? plastic(0xf59e0b, 0.4) : plastic(0xef4444, 0.4),
    );
    btn.rotation.x = Math.PI / 2;
    btn.position.set(-0.09 + i * 0.09, height - 0.16, 0.08);
    g.add(btn);
  }
  return g;
}

/** Stack light (R/A/G) on pole. */
export function stackLight(poleH = 1.5): {
  tower: THREE.Group;
  red: THREE.Mesh;
  amber: THREE.Mesh;
  green: THREE.Mesh;
} {
  const tower = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.036, poleH, 14),
    paintedSteel(0x27272a),
  );
  pole.position.y = poleH / 2;
  tower.add(pole);
  const makeLamp = (y: number, color: number) => {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.1, 20),
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.25,
        roughness: 0.4,
        emissive: 0x000000,
        emissiveIntensity: 0,
      }),
    );
    lamp.position.y = y;
    tower.add(lamp);
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.075, 0.022, 18),
      matteBlack(0x171717),
    );
    shade.position.y = y + 0.055;
    tower.add(shade);
    return lamp;
  };
  const red = makeLamp(poleH + 0.28, 0xef4444);
  const amber = makeLamp(poleH + 0.14, 0xf59e0b);
  const green = makeLamp(poleH, 0x22c55e);
  return { tower, red, amber, green };
}

/** Conveyor segment with frame, belt, rails, legs, end rollers. */
export function conveyorSegment(
  length: number,
  width = 0.34,
  z = 0,
): THREE.Group {
  const g = new THREE.Group();
  g.position.z = z;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(length + 0.28, 0.08, width + 0.1),
    paintedSteel(0x3f3f46, 0.55, 0.4),
  );
  frame.position.set(length / 2, 0.42, 0);
  frame.castShadow = true;
  g.add(frame);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.03, width), rubber(0x1c1917));
  belt.position.set(length / 2, 0.48, 0);
  belt.receiveShadow = true;
  g.add(belt);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.055, 0.018),
      steel(0x9ca3af, 0.85, 0.28),
    );
    rail.position.set(length / 2, 0.58, side * (width / 2 + 0.025));
    g.add(rail);
    const postCount = Math.max(2, Math.floor(length / 0.75));
    for (let i = 0; i <= postCount; i++) {
      const px = (i / postCount) * length;
      const st = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.012, 0.12, 10),
        brushedAluminum(),
      );
      st.position.set(px, 0.52, side * (width / 2 + 0.025));
      g.add(st);
      const mount = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.025, 0.04),
        paintedSteel(0x52525b),
      );
      mount.position.set(px, 0.48, side * (width / 2 + 0.01));
      g.add(mount);
    }
  }
  for (let i = 0; i <= Math.floor(length / 1.4); i++) {
    const x = 0.18 + i * 1.4;
    if (x > length) break;
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.048, 0.44, 0.048),
        paintedSteel(0x52525b, 0.55, 0.45),
      );
      leg.position.set(x, 0.22, side * (width / 2 - 0.04));
      g.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.09), matteBlack());
      foot.position.set(x, 0.01, side * (width / 2 - 0.04));
      g.add(foot);
    }
  }
  for (const x of [0.08, length - 0.08]) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, width + 0.02, 24),
      steel(0xa8a29e, 0.9, 0.25),
    );
    roller.rotation.x = Math.PI / 2;
    roller.position.set(x, 0.48, 0);
    g.add(roller);
  }
  return g;
}

/** Short section of mesh safety fence. */
export function guardFence(
  width = 1.2,
  height = 1.1,
): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-width / 2, width / 2]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, height, 0.06),
      paintedSteel(0x3f3f46),
    );
    post.position.set(x, height / 2, 0);
    post.castShadow = true;
    g.add(post);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.07), safetyYellow());
    cap.position.set(x, height + 0.015, 0);
    g.add(cap);
  }
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.08, height - 0.15),
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.55,
      roughness: 0.4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      wireframe: false,
    }),
  );
  panel.position.set(0, height / 2, 0);
  g.add(panel);
  // Wire grid overlay
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.1, height - 0.18),
    new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    }),
  );
  grid.position.set(0, height / 2, 0.002);
  g.add(grid);
  return g;
}

/** Sheet-metal chute / bin with thickness lip. */
export function sheetBin(
  w: number,
  h: number,
  d: number,
  color = 0x334155,
  lipColor?: number,
): THREE.Group {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    paintedSteel(color, 0.4, 0.45),
  );
  shell.castShadow = true;
  g.add(shell);
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.85, h * 0.15, d * 0.85),
    matteBlack(0x0f172a),
  );
  mouth.position.y = h / 2 - h * 0.05;
  g.add(mouth);
  if (lipColor != null) {
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(w * 1.02, 0.03, d * 1.02),
      new THREE.MeshStandardMaterial({ color: lipColor, metalness: 0.3, roughness: 0.42 }),
    );
    lip.position.y = h / 2 + 0.01;
    g.add(lip);
  }
  return g;
}

/** Gauge / dial on a short stem. */
export function pressureGauge(radius = 0.045): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.022, 24),
    brushedAluminum(0xd0d8e0),
  );
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.85, 24),
    plastic(0xf8fafc, 0.35),
  );
  face.position.z = 0.012;
  g.add(face);
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, radius * 0.7, 0.004),
    matteBlack(),
  );
  needle.position.set(0, radius * 0.2, 0.014);
  needle.rotation.z = -0.4;
  g.add(needle);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.06, 8),
    steel(0x94a3b8),
  );
  stem.position.y = -0.04;
  g.add(stem);
  return g;
}

/** Pipe elbow / run helper. */
export function pipeRun(
  length: number,
  radius = 0.028,
  mat?: THREE.Material,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 16),
    mat ?? steel(0xcbd5e1, 0.85, 0.22),
  );
  m.castShadow = true;
  return m;
}

export function machineFoot(x: number, z: number, y = 0.02): THREE.Mesh {
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.04, 12),
    matteBlack(),
  );
  foot.position.set(x, y, z);
  return foot;
}

export function yellowHazardBand(w: number, h: number, d: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), safetyYellow());
}

export function blueMachineBody(w: number, h: number, d: number, color = 0x1e40af): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), machineBlue(color));
  m.castShadow = true;
  return m;
}
