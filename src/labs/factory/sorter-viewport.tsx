import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { fitCameraToObject } from "./fit";
import {
  ACCENT,
  addFactoryLights,
  alarmRed,
  applyFactoryEnvMap,
  brushedAluminum,
  emissiveAccent,
  makeFactoryFloor,
  matteBlack,
  paintedSteel,
  physicalPaint,
  physicalSteel,
  plastic,
  rubber,
  safetyYellow,
  stationSign,
  steel,
  warnAmber,
} from "./materials";
import {
  boltCircle,
  cableCarrier,
  machineFoot,
  motorHousing,
  pneumaticCylinder,
  sheetBin,
  yellowHazardBand,
} from "./industrial-kit";
import { SORTER_LANES, type SorterSnapshot } from "./sorter-sim";

const COLOR_MAP = { red: 0xef4444, blue: 0x3b82f6, amber: 0xf59e0b };
/** Side bins sit at +Z beside the main belt (not under / not end-of-line). */
const BIN_Z = 0.95;
/** Kick blend distance along chute before part is fully in the spur. */
const DIVERT_PUSH = 0.28;

function belt(len: number, width = 0.4): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(len + 0.12, 0.09, width + 0.12),
    paintedSteel(0x3f3f46, 0.55, 0.4),
  );
  frame.position.set(len / 2, 0.4, 0);
  frame.castShadow = true;
  g.add(frame);
  // Side C-channel lips
  for (const side of [-1, 1]) {
    const channel = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.04, 0.03),
      paintedSteel(0x52525b, 0.5, 0.42),
    );
    channel.position.set(len / 2, 0.46, side * (width / 2 + 0.05));
    g.add(channel);
  }
  const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.028, width), rubber(0x1c1917));
  b.position.set(len / 2, 0.46, 0);
  b.receiveShadow = true;
  g.add(b);
  // Belt center rib
  const rib = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.006, 0.018),
    rubber(0x44403c),
  );
  rib.position.set(len / 2, 0.478, 0);
  g.add(rib);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.055, 0.016),
      physicalSteel(0x9ca3af, 0.82, 0.28),
    );
    rail.position.set(len / 2, 0.55, side * (width / 2 + 0.022));
    g.add(rail);
    const posts = Math.max(2, Math.floor(len / 0.7));
    for (let i = 0; i <= posts; i++) {
      const px = (i / posts) * len;
      const st = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.012, 0.11, 10),
        brushedAluminum(),
      );
      st.position.set(px, 0.52, side * (width / 2 + 0.022));
      g.add(st);
    }
  }
  for (let i = 0; i <= Math.floor(len / 1.1); i++) {
    const x = 0.14 + i * 1.1;
    if (x > len) break;
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.4, 0.045),
        paintedSteel(0x52525b),
      );
      leg.position.set(x, 0.2, side * (width / 2 - 0.02));
      g.add(leg);
      g.add(machineFoot(x, side * (width / 2 - 0.02)));
    }
  }
  for (const x of [0.06, len - 0.06]) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, width + 0.02, 22),
      physicalSteel(0xa8a29e, 0.88, 0.24),
    );
    roller.rotation.x = Math.PI / 2;
    roller.position.set(x, 0.46, 0);
    g.add(roller);
  }
  const drive = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.15, 0.22),
    paintedSteel(0x334155),
  );
  drive.position.set(len - 0.08, 0.28, width / 2 + 0.15);
  drive.castShadow = true;
  g.add(drive);
  const mot = motorHousing(0.13, 0.042, "x");
  mot.position.set(len - 0.22, 0.28, width / 2 + 0.15);
  g.add(mot);
  return g;
}

function buildVisionGate(x: number): {
  root: THREE.Group;
  eye: THREE.Mesh;
  ring: THREE.Mesh;
} {
  const root = new THREE.Group();
  root.position.set(x, 0, 0);

  // Floor plate + bolt circle
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.04, 1.05),
    paintedSteel(0x3f3f46, 0.5, 0.42),
  );
  plate.position.y = 0.02;
  plate.receiveShadow = true;
  root.add(plate);
  boltCircle(root, 0.045, 0.38, 8, 0.007);

  // Portal uprights (box columns with hazard stripe)
  for (const z of [-0.42, 0.42]) {
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.35, 0.12),
      paintedSteel(0x475569, 0.5, 0.4),
    );
    col.position.set(0, 0.68, z);
    col.castShadow = true;
    root.add(col);
    const stripe = yellowHazardBand(0.13, 0.06, 0.13);
    stripe.position.set(0, 0.55, z);
    root.add(stripe);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.04, 0.14),
      safetyYellow(),
    );
    cap.position.set(0, 1.38, z);
    root.add(cap);
  }

  // Cross-beam gantry
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.1, 0.95),
    physicalPaint(0x1e40af, 0.42, 0.32),
  );
  beam.position.set(0, 1.28, 0);
  beam.castShadow = true;
  root.add(beam);
  const beamLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.03, 0.98),
    brushedAluminum(),
  );
  beamLip.position.set(0, 1.34, 0);
  root.add(beamLip);

  // Vision hood / tunnel
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.38, 0.78),
    physicalPaint(0x1e3a8a, 0.4, 0.34),
  );
  hood.position.set(0, 0.98, 0);
  hood.castShadow = true;
  root.add(hood);
  const voidBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.28, 0.48),
    matteBlack(0x0f172a),
  );
  voidBox.position.set(0, 0.72, 0);
  root.add(voidBox);
  const bar = yellowHazardBand(0.54, 0.055, 0.82);
  bar.position.y = 1.18;
  root.add(bar);

  // Camera + LED ring under hood
  const camBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.085, 0.13),
    matteBlack(0x1a1a1a),
  );
  camBody.position.set(0, 1.08, 0);
  root.add(camBody);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.04, 0.05, 18),
    physicalSteel(0xcbd5e1, 0.78, 0.2),
  );
  lens.position.set(0, 1.0, 0);
  root.add(lens);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.015, 10, 28),
    emissiveAccent(0.55),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.94, 0);
  root.add(ring);

  // Side photoeyes + beam
  for (const z of [-0.3, 0.3]) {
    const pePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.015, 0.3, 10),
      brushedAluminum(),
    );
    pePost.position.set(0.24, 0.64, z);
    root.add(pePost);
    const peHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.032, 0.038),
      paintedSteel(0x292524),
    );
    peHead.position.set(0.24, 0.78, z);
    root.add(peHead);
  }
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.02, 0.58),
    new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.2,
    }),
  );
  eye.position.set(0.24, 0.78, 0);
  root.add(eye);

  // Cable carrier down column
  const carrier = cableCarrier(7, 0.04, 0.3);
  carrier.position.set(-0.22, 0.55, 0.42);
  carrier.rotation.y = Math.PI / 2;
  root.add(carrier);

  return { root, eye, ring };
}

/** Divert paddle at lane mouth — swings to kick parts +Z into side chute. */
function buildDivertGate(
  laneIndex: number,
  color: number,
  divertX: number,
): { root: THREE.Group; hinge: THREE.Group; restAngle: number; activeAngle: number } {
  const g = new THREE.Group();
  // Mount on +Z lip of main belt at this color's divert X
  g.position.set(divertX, 0.5, 0.28);

  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.26, 0.2),
    paintedSteel(0x334155, 0.5, 0.4),
  );
  pedestal.position.set(0, 0.04, 0);
  pedestal.castShadow = true;
  g.add(pedestal);
  const flange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.11, 0.03, 18),
    physicalSteel(0x94a3b8, 0.85, 0.22),
  );
  flange.position.set(0, 0.18, 0);
  g.add(flange);
  boltCircle(g, 0.2, 0.085, 6, 0.006);

  const hinge = new THREE.Group();
  hinge.position.set(0, 0.2, 0);
  g.add(hinge);

  // Blade along belt (X); active swing sweeps part toward +Z
  const paddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.16, 0.045),
    paintedSteel(0xf8fafc, 0.45, 0.32),
  );
  paddle.position.x = 0.2;
  paddle.castShadow = true;
  hinge.add(paddle);
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.11, 0.012),
    plastic(color, 0.38),
  );
  face.position.set(0.2, 0.02, 0.03);
  hinge.add(face);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.03, 0.05),
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.2,
      roughness: 0.4,
      emissive: color,
      emissiveIntensity: 0.18,
    }),
  );
  stripe.position.set(0.18, 0.05, 0);
  hinge.add(stripe);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.055), rubber(0x1c1917));
  tip.position.x = 0.42;
  hinge.add(tip);

  const pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.1, 14),
    brushedAluminum(),
  );
  pivot.position.y = 0.2;
  g.add(pivot);

  const cyl = pneumaticCylinder(0.26, 0.032, "z");
  cyl.position.set(-0.06, 0.3, 0.12);
  g.add(cyl);
  const valve = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.05, 0.09),
    paintedSteel(0x1e293b),
  );
  valve.position.set(-0.12, 0.32, 0.08);
  g.add(valve);

  // Rest: open along belt; active: swung ~90° to kick +Z into chute mouth
  const restAngle = 0.12;
  const activeAngle = -1.35;
  hinge.rotation.y = restAngle;
  return { root: g, hinge, restAngle, activeAngle };
}

function buildLaneChute(laneIndex: number, colorHex: number, divertX: number): THREE.Group {
  const g = new THREE.Group();
  // Chute runs +Z from belt edge to bin — clearly BESIDE the main line
  g.position.set(divertX, 0, 0.22);

  const flare = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.07, 0.16),
    paintedSteel(0x64748b, 0.45, 0.4),
  );
  flare.position.set(0, 0.52, 0.08);
  flare.rotation.x = 0.2;
  g.add(flare);

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.18, SORTER_LANES.LANE_LEN * 0.9),
      paintedSteel(0x64748b, 0.45, 0.4),
    );
    wall.position.set(side * 0.16, 0.56, SORTER_LANES.LANE_LEN / 2);
    wall.castShadow = true;
    g.add(wall);
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.03, SORTER_LANES.LANE_LEN * 0.9),
      brushedAluminum(),
    );
    lip.position.set(side * 0.175, 0.66, SORTER_LANES.LANE_LEN / 2);
    g.add(lip);
  }

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.022, SORTER_LANES.LANE_LEN),
    paintedSteel(0x57534e),
  );
  floor.position.set(0, 0.45, SORTER_LANES.LANE_LEN / 2);
  g.add(floor);
  for (let i = 0; i < 4; i++) {
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.28, 12),
      physicalSteel(0xa8a29e, 0.85, 0.28),
    );
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.47, 0.12 + i * (SORTER_LANES.LANE_LEN / 4));
    g.add(roll);
  }

  const drop = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.055, 0.24),
    plastic(colorHex, 0.45),
  );
  drop.position.set(0, 0.4, SORTER_LANES.LANE_LEN + 0.02);
  drop.rotation.x = -0.35;
  g.add(drop);

  const bin = sheetBin(0.5, 0.45, 0.48, 0x1e293b, colorHex);
  bin.position.set(0, 0.28, SORTER_LANES.LANE_LEN + 0.38);
  g.add(bin);
  for (const [bx, bz] of [
    [-0.18, -0.16],
    [0.18, -0.16],
    [-0.18, 0.16],
    [0.18, 0.16],
  ] as const) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.04),
      paintedSteel(0x475569),
    );
    leg.position.set(bx, 0.06, SORTER_LANES.LANE_LEN + 0.38 + bz);
    g.add(leg);
  }
  boltCircle(bin, 0.22, 0.18, 6, 0.007);
  const idPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.07, 0.02),
    paintedSteel(0x0f172a),
  );
  idPlate.position.set(0, 0.4, SORTER_LANES.LANE_LEN + 0.38 + 0.25);
  g.add(idPlate);
  const idFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.05),
    new THREE.MeshBasicMaterial({ color: colorHex }),
  );
  idFace.position.set(0, 0.4, SORTER_LANES.LANE_LEN + 0.38 + 0.262);
  g.add(idFace);

  return g;
}

function buildInfeedHopper(): THREE.Group {
  const g = new THREE.Group();
  g.position.set(0.15, 0, 0);

  // Floor skid
  const skid = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.05, 0.7),
    paintedSteel(0x3f3f46, 0.5, 0.42),
  );
  skid.position.set(0.1, 0.025, 0);
  skid.receiveShadow = true;
  g.add(skid);
  for (const [x, z] of [
    [-0.15, -0.25],
    [0.35, -0.25],
    [-0.15, 0.25],
    [0.35, 0.25],
  ] as const) {
    g.add(machineFoot(x, z));
  }

  // Portal frame uprights + cross-brace
  for (const z of [-0.26, 0.26]) {
    const upright = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 1.15, 0.07),
      paintedSteel(0x475569),
    );
    upright.position.set(-0.05, 0.58, z);
    upright.castShadow = true;
    g.add(upright);
    const stripe = yellowHazardBand(0.08, 0.05, 0.08);
    stripe.position.set(-0.05, 0.45, z);
    g.add(stripe);
  }
  const cross = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, 0.52),
    brushedAluminum(),
  );
  cross.position.set(-0.05, 0.95, 0);
  g.add(cross);
  const cross2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.05, 0.05),
    brushedAluminum(),
  );
  cross2.position.set(0.15, 1.05, 0);
  g.add(cross2);

  // Vibratory bowl base
  const bowlBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.22, 0.12, 24),
    paintedSteel(0x334155),
  );
  bowlBase.position.set(0.05, 0.72, 0);
  bowlBase.castShadow = true;
  g.add(bowlBase);
  boltCircle(g, 0.79, 0.18, 8, 0.006);

  // Hopper funnel (octagonal industrial look)
  const hopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.11, 0.42, 8),
    paintedSteel(0x64748b, 0.45, 0.4),
  );
  hopper.position.set(0.05, 1.0, 0);
  hopper.castShadow = true;
  g.add(hopper);
  const funnelLip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8),
    safetyYellow(),
  );
  funnelLip.position.set(0.05, 1.2, 0);
  g.add(funnelLip);
  // Inner liner
  const liner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.09, 0.36, 8),
    matteBlack(0x1c1917),
  );
  liner.position.set(0.05, 0.98, 0);
  g.add(liner);
  // Top ring flange
  const flange = new THREE.Mesh(
    new THREE.TorusGeometry(0.29, 0.015, 8, 24),
    physicalSteel(0x94a3b8, 0.8, 0.25),
  );
  flange.rotation.x = Math.PI / 2;
  flange.position.set(0.05, 1.22, 0);
  g.add(flange);

  // Feed chute onto belt
  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.07, 0.42),
    physicalSteel(0x94a3b8, 0.72, 0.28),
  );
  chute.position.set(0.28, 0.62, 0);
  chute.rotation.z = -0.42;
  chute.castShadow = true;
  g.add(chute);
  // Chute side guides
  for (const z of [-0.14, 0.14]) {
    const guide = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.05, 0.022),
      brushedAluminum(),
    );
    guide.position.set(0.45, 0.56, z);
    g.add(guide);
  }
  // Discharge throat
  const throat = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.05, 0.2),
    paintedSteel(0x52525b),
  );
  throat.position.set(0.55, 0.52, 0);
  g.add(throat);

  // Small drive / vibrator motor on bowl
  const vib = motorHousing(0.1, 0.035, "z");
  vib.position.set(-0.12, 0.78, 0.18);
  g.add(vib);

  return g;
}

function makePartMesh(color: number, large: boolean): THREE.Group {
  const g = new THREE.Group();
  const s = large ? 0.11 : 0.075;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(s, s * 0.65, s),
    plastic(color, 0.4),
  );
  body.castShadow = true;
  g.add(body);
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(s * 1.06, s * 0.09, s * 1.06),
    plastic(color, 0.35),
  );
  lip.position.y = s * 0.3;
  g.add(lip);
  // Corner bevels so parts don't read as naked cubes
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const corner = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.12, s * 0.5, s * 0.12),
      plastic(color, 0.42),
    );
    corner.position.set(sx * s * 0.42, 0, sz * s * 0.42);
    g.add(corner);
  }
  return g;
}

export function SorterViewport({
  snap,
  eStop,
  fitToken,
}: {
  snap: SorterSnapshot;
  eStop: boolean;
  fitToken: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const live = useRef({ snap, eStop, fitToken });
  live.current = { snap, eStop, fitToken };
  const [glError, setGlError] = useState<string | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setGlError("WebGL unavailable.");
      return;
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2332);
    scene.fog = new THREE.Fog(0x1a2332, 18, 40);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 60);
    camera.position.set(3.2, 2.6, 4.0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.enablePan = true;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    addFactoryLights(scene);
    applyFactoryEnvMap(renderer, scene);
    scene.add(makeFactoryFloor(18));

    const world = new THREE.Group();
    scene.add(world);
    // Main belt: hopper → vision → divert mouths → short overrun (bins BESIDE at +Z)
    world.add(belt(SORTER_LANES.END_X - 0.15));
    world.add(buildInfeedHopper());

    const laneLabels = ["RED", "BLUE", "AMBER"];
    const laneColors = [0xef4444, 0x3b82f6, 0xf59e0b];
    const divertGates: {
      root: THREE.Group;
      hinge: THREE.Group;
      restAngle: number;
      activeAngle: number;
    }[] = [];
    for (let i = 0; i < 3; i++) {
      const dx = SORTER_LANES.DIVERT_XS[i]!;
      world.add(buildLaneChute(i, laneColors[i]!, dx));
      const sign = stationSign(laneLabels[i]!, 0.5);
      sign.position.set(dx, 1.25, BIN_Z + 0.55);
      world.add(sign);
      const dgate = buildDivertGate(i, laneColors[i]!, dx);
      world.add(dgate.root);
      divertGates.push(dgate);
    }

    const gate = buildVisionGate(SORTER_LANES.GATE_X);
    world.add(gate.root);

    const inSign = stationSign("INFEED", 0.62);
    inSign.position.set(0.5, 1.35, -0.65);
    world.add(inSign);
    const gateSign = stationSign("GATE", 0.5);
    gateSign.position.set(SORTER_LANES.GATE_X, 1.55, -0.55);
    world.add(gateSign);

    // Stack light + cabinet (control end)
    const redL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.09, 14),
      alarmRed(false),
    );
    redL.position.set(-0.35, 1.4, 0.9);
    world.add(redL);
    const ambL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.09, 14),
      warnAmber(false),
    );
    ambL.position.set(-0.35, 1.28, 0.9);
    world.add(ambL);
    const grnL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.09, 14),
      emissiveAccent(0.35),
    );
    grnL.position.set(-0.35, 1.16, 0.9);
    world.add(grnL);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, 1.3, 10),
      paintedSteel(0x27272a),
    );
    pole.position.set(-0.35, 0.7, 0.9);
    world.add(pole);
    for (const y of [1.4, 1.28, 1.16]) {
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.058, 0.022, 14),
        matteBlack(),
      );
      shade.position.set(-0.35, y + 0.055, 0.9);
      world.add(shade);
    }

    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.85, 0.32),
      paintedSteel(0x1e293b),
    );
    cab.position.set(-0.6, 0.42, 0.9);
    cab.castShadow = true;
    world.add(cab);
    const cabStripe = yellowHazardBand(0.44, 0.05, 0.02);
    cabStripe.position.set(-0.6, 0.7, 1.07);
    world.add(cabStripe);
    for (let i = 0; i < 6; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.012, 0.01),
        matteBlack(),
      );
      vent.position.set(-0.6, 0.5 + i * 0.04, 1.065);
      world.add(vent);
    }
    // HMI stub on cabinet
    const hmi = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.03),
      matteBlack(),
    );
    hmi.position.set(-0.6, 0.95, 1.08);
    world.add(hmi);
    const hmiScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x134e4a,
        emissive: ACCENT,
        emissiveIntensity: 0.5,
        metalness: 0.1,
        roughness: 0.35,
      }),
    );
    hmiScreen.position.set(-0.6, 0.95, 1.1);
    world.add(hmiScreen);

    type PMesh = { root: THREE.Group; color: number; large: boolean };
    const pool: PMesh[] = [];
    for (let i = 0; i < 20; i++) {
      const root = makePartMesh(0xcccccc, true);
      root.visible = false;
      world.add(root);
      pool.push({ root, color: 0xcccccc, large: true });
    }

    let disposed = false;
    let raf = 0;
    let lastFit = -1;

    const doFit = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 400;
      camera.aspect = w / Math.max(h, 1);
      // Full spanX so hopper + gate + paddles + bins stay in frustum
      fitCameraToObject(camera, controls, world, camera.aspect, {
        pad: 1.08,
        spanXFactor: 1.0,
      });
    };
    const resize = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 400;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    requestAnimationFrame(() => {
      if (!disposed) doFit();
    });

    const tick = () => {
      const { snap: s, eStop: es, fitToken: ft } = live.current;
      if (ft !== lastFit) {
        lastFit = ft;
        doFit();
      }
      (gate.eye.material as THREE.MeshBasicMaterial).opacity = s.photoeye ? 0.55 : 0.12;
      (gate.ring.material as THREE.Material).dispose();
      gate.ring.material = s.photoeye ? emissiveAccent(1.5) : emissiveAccent(0.35);
      (redL.material as THREE.Material).dispose();
      redL.material = alarmRed(es);
      (ambL.material as THREE.Material).dispose();
      ambL.material = warnAmber(!es && s.photoeye);
      (grnL.material as THREE.Material).dispose();
      grnL.material = es
        ? paintedSteel(0x365314, 0.3, 0.5)
        : emissiveAccent(s.parts.some((p) => p.lane != null) ? 1.3 : 0.35);

      // Swing divert paddle hard when a part is entering that spur
      for (let li = 0; li < divertGates.length; li++) {
        const dg = divertGates[li]!;
        const active = s.parts.some(
          (p) => p.lane === li && !p.done && p.laneY < 0.75,
        );
        const target = active ? dg.activeAngle : dg.restAngle;
        dg.hinge.rotation.y += (target - dg.hinge.rotation.y) * 0.22;
      }

      for (let i = 0; i < pool.length; i++) {
        const slot = pool[i]!;
        const p = s.parts[i];
        if (!p) {
          slot.root.visible = false;
          continue;
        }
        const color = COLOR_MAP[p.color];
        const large = p.size === "large";
        if (slot.color !== color || slot.large !== large) {
          while (slot.root.children.length) {
            const ch = slot.root.children[0]!;
            slot.root.remove(ch);
            if ((ch as THREE.Mesh).geometry) (ch as THREE.Mesh).geometry.dispose();
          }
          const rebuilt = makePartMesh(color, large);
          for (const ch of [...rebuilt.children]) slot.root.add(ch);
          slot.color = color;
          slot.large = large;
        }
        slot.root.visible = true;
        if (p.lane != null) {
          const divertX = SORTER_LANES.DIVERT_XS[p.lane]!;
          const push = Math.min(1, p.laneY / DIVERT_PUSH);
          // Kick off belt (+Z) then travel down the side chute into the bin.
          const z = THREE.MathUtils.lerp(0, 0.22, push) + p.laneY;
          const xKick = divertX + Math.sin(push * Math.PI) * 0.04;
          slot.root.position.set(xKick, 0.52, z);
          slot.root.rotation.y = push * 0.55;
        } else {
          slot.root.position.set(p.x, 0.52, 0);
          slot.root.rotation.y = 0;
        }
      }

      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, []);

  if (glError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted">{glError}</div>
    );
  }
  return <div ref={mountRef} className="h-full w-full touch-none" />;
}
