import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { fitCameraToObject } from "./fit";
import {
  ACCENT,
  addCoolingFins,
  addFactoryLights,
  alarmRed,
  applyFactoryEnvMap,
  brushedAluminum,
  emissiveAccent,
  glassBottle,
  liquid,
  machineBlue,
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
  machineFoot,
  motorHousing,
  pipeRun,
  pressureGauge,
  yellowHazardBand,
} from "./industrial-kit";
import {
  LINE_END,
  REJECT_LEN,
  STATIONS,
  type BottlingSnapshot,
  type StationId,
} from "./bottling-sim";

type BottleMesh = {
  root: THREE.Group;
  liquid: THREE.Mesh;
  cap: THREE.Object3D;
  label: THREE.Mesh;
  stripe: THREE.Mesh;
};

function buildConveyor(length: number, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.z = z;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(length + 0.3, 0.08, 0.42),
    paintedSteel(0x3f3f46, 0.6, 0.4),
  );
  frame.position.set(length / 2, 0.42, 0);
  frame.castShadow = true;
  g.add(frame);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.03, 0.34), rubber(0x1c1917));
  belt.position.set(length / 2, 0.48, 0);
  belt.receiveShadow = true;
  g.add(belt);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.06, 0.02),
      steel(0x9ca3af, 0.85, 0.28),
    );
    rail.position.set(length / 2, 0.58, side * 0.2);
    g.add(rail);
    const postCount = Math.max(2, Math.floor(length / 0.8));
    for (let i = 0; i <= postCount; i++) {
      const px = (i / postCount) * length;
      const stanchion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.012, 0.12, 8),
        brushedAluminum(),
      );
      stanchion.position.set(px, 0.52, side * 0.2);
      g.add(stanchion);
    }
  }

  for (let i = 0; i <= Math.floor(length / 1.5); i++) {
    const x = 0.2 + i * 1.5;
    if (x > length) break;
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.44, 0.05),
        paintedSteel(0x52525b, 0.55, 0.45),
      );
      leg.position.set(x, 0.22, side * 0.16);
      g.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.09), matteBlack());
      foot.position.set(x, 0.01, side * 0.16);
      g.add(foot);
    }
  }

  for (const x of [0.08, length - 0.08]) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.36, 20),
      steel(0xa8a29e, 0.9, 0.25),
    );
    roller.rotation.x = Math.PI / 2;
    roller.position.set(x, 0.48, 0);
    g.add(roller);
  }

  // Motor + gearbox drive end
  const drive = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.2, 0.3),
    paintedSteel(0x334155, 0.45, 0.42),
  );
  drive.position.set(length - 0.05, 0.35, 0.4);
  drive.castShadow = true;
  g.add(drive);
  addCoolingFins(g, length - 0.05 + 0.125, 0.35, 0.4, 8);
  const motor = motorHousing(0.16, 0.055, "x");
  motor.position.set(length - 0.22, 0.35, 0.4);
  g.add(motor);
  const coupling = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16),
    physicalSteel(0x94a3b8, 0.85, 0.25),
  );
  coupling.rotation.z = Math.PI / 2;
  coupling.position.set(length - 0.12, 0.35, 0.4);
  g.add(coupling);

  return g;
}

function buildPhotoeye(x: number, lit: boolean): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0.72, 0);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 10), steel(0x78716c));
  post.position.set(0, -0.1, 0.32);
  g.add(post);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.05),
    lit ? emissiveAccent(1.5) : paintedSteel(0x292524, 0.4, 0.5),
  );
  head.position.set(0, 0.12, 0.32);
  g.add(head);
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.01, 0.58),
    new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: lit ? 0.55 : 0.12,
    }),
  );
  beam.position.set(0, 0.12, 0);
  g.add(beam);
  const reflector = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.02),
    plastic(0xe7e5e4, 0.4),
  );
  reflector.position.set(0, 0.12, -0.32);
  g.add(reflector);
  return g;
}

function buildStarwheel(segments = 12): THREE.Group {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.04, 20),
    steel(0xcbd5e1, 0.85, 0.25),
  );
  hub.position.y = 0.62;
  g.add(hub);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.03, 0.035),
      paintedSteel(0x64748b, 0.5, 0.4),
    );
    spoke.position.set(Math.cos(a) * 0.12, 0.62, Math.sin(a) * 0.12);
    spoke.rotation.y = -a;
    g.add(spoke);
    const pocket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12, 1, true),
      brushedAluminum(),
    );
    pocket.position.set(Math.cos(a) * 0.22, 0.62, Math.sin(a) * 0.22);
    g.add(pocket);
  }
  return g;
}

function buildFillHead(): THREE.Group {
  const g = new THREE.Group();

  // Skid base plate with legs
  const skid = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.06, 0.72),
    paintedSteel(0x3f3f46, 0.5, 0.42),
  );
  skid.position.y = 0.48;
  skid.castShadow = true;
  g.add(skid);
  for (const [x, z] of [
    [-0.28, -0.28],
    [0.28, -0.28],
    [-0.28, 0.28],
    [0.28, 0.28],
  ] as const) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.46, 0.055),
      paintedSteel(0x52525b, 0.55, 0.4),
    );
    leg.position.set(x, 0.23, z);
    leg.castShadow = true;
    g.add(leg);
    g.add(machineFoot(x, z));
  }
  boltCircle(g, 0.515, 0.3, 8, 0.008);

  // Column / valve cabinet
  const column = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 1.05, 0.42),
    physicalPaint(0x1e40af, 0.42, 0.32),
  );
  column.position.y = 1.05;
  column.castShadow = true;
  g.add(column);
  const stripe = yellowHazardBand(0.44, 0.07, 0.44);
  stripe.position.y = 0.72;
  g.add(stripe);
  // Side access door seam + handle
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.55, 0.28),
    paintedSteel(0x1e3a8a, 0.4, 0.4),
  );
  door.position.set(0.22, 1.05, 0);
  g.add(door);
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.08, 0.02),
    brushedAluminum(),
  );
  handle.position.set(0.24, 1.05, 0.08);
  g.add(handle);

  // Product tank (glass cylinder) with manhole, legs residual, level sight
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.55, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      metalness: 0.05,
      roughness: 0.08,
      transmission: 0.4,
      transparent: true,
      opacity: 0.72,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
    }),
  );
  tank.position.set(0, 1.85, 0);
  tank.castShadow = true;
  g.add(tank);
  const product = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.21, 0.36, 32),
    liquid(0x0369a1),
  );
  product.position.set(0, 1.72, 0);
  g.add(product);
  // Manhole cover on tank top
  const manhole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.035, 24),
    physicalSteel(0x94a3b8, 0.88, 0.2),
  );
  manhole.position.set(0.08, 2.15, 0);
  g.add(manhole);
  boltCircle(g, 2.17, 0.085, 6, 0.006);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.255, 0.255, 0.04, 32),
    physicalSteel(0x94a3b8, 0.85, 0.22),
  );
  lid.position.set(0, 2.14, 0);
  g.add(lid);
  // Sight glass strip
  const sight = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.32, 0.02),
    new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      metalness: 0,
      roughness: 0.05,
      transmission: 0.7,
      transparent: true,
      opacity: 0.55,
    }),
  );
  sight.position.set(0.22, 1.85, 0.12);
  g.add(sight);

  // Pipework from tank to nozzle arm
  const drop = pipeRun(0.42, 0.03, physicalSteel(0xcbd5e1, 0.9, 0.18));
  drop.position.set(0.18, 1.55, 0.18);
  g.add(drop);
  const elbow = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.028, 12, 16, Math.PI / 2),
    physicalSteel(0xcbd5e1, 0.9, 0.18),
  );
  elbow.position.set(0.18, 1.34, 0.12);
  elbow.rotation.y = Math.PI / 2;
  g.add(elbow);
  const horiz = pipeRun(0.28, 0.028, physicalSteel(0xcbd5e1, 0.9, 0.18));
  horiz.rotation.z = Math.PI / 2;
  horiz.position.set(0.05, 1.34, 0.12);
  g.add(horiz);
  // Valve body
  const valve = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.08),
    paintedSteel(0x334155),
  );
  valve.position.set(0, 1.34, 0.05);
  g.add(valve);
  const handwheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.008, 8, 16),
    brushedAluminum(),
  );
  handwheel.position.set(0.08, 1.4, 0.05);
  handwheel.rotation.z = Math.PI / 2;
  g.add(handwheel);

  // Gauges on column
  const g1 = pressureGauge(0.04);
  g1.position.set(0.22, 1.25, 0.1);
  g1.rotation.y = -0.4;
  g.add(g1);
  const g2 = pressureGauge(0.035);
  g2.position.set(0.22, 1.05, -0.08);
  g2.rotation.y = -0.6;
  g.add(g2);

  // Fill arm + nozzle with bellows + drip pan
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.1, 0.5),
    physicalSteel(0xcbd5e1, 0.88, 0.2),
  );
  arm.position.set(0, 1.55, 0.08);
  arm.castShadow = true;
  g.add(arm);
  const nozzleTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.017, 0.36, 20),
    physicalSteel(0xe2e8f0, 0.92, 0.14),
  );
  nozzleTube.position.set(0, 1.28, 0);
  g.add(nozzleTube);
  for (let i = 0; i < 6; i++) {
    const bellow = new THREE.Mesh(
      new THREE.TorusGeometry(0.03, 0.007, 8, 20),
      rubber(0x44403c),
    );
    bellow.rotation.x = Math.PI / 2;
    bellow.position.set(0, 1.44 - i * 0.026, 0);
    g.add(bellow);
  }
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.009, 0.045, 14),
    brushedAluminum(),
  );
  tip.position.set(0, 1.08, 0);
  g.add(tip);
  const dripPan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.085, 0.025, 24),
    paintedSteel(0x57534e, 0.4, 0.5),
  );
  dripPan.position.set(0, 1.02, 0);
  g.add(dripPan);

  // Starwheel guide
  const guide = buildStarwheel(10);
  guide.position.set(0, 0, 0.3);
  g.add(guide);

  // Side cable tray stub
  for (let i = 0; i < 5; i++) {
    const link = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.05),
      paintedSteel(0x57534e),
    );
    link.position.set(-0.28, 0.85 + i * 0.08, 0.28);
    g.add(link);
  }

  return g;
}

function buildCapper(): THREE.Group {
  const g = new THREE.Group();

  // Base skid + legs
  const skid = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.055, 0.58),
    paintedSteel(0x3f3f46, 0.5, 0.42),
  );
  skid.position.y = 0.5;
  skid.castShadow = true;
  g.add(skid);
  for (const [x, z] of [
    [-0.25, -0.22],
    [0.25, -0.22],
    [-0.25, 0.22],
    [0.25, 0.22],
  ] as const) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.48, 0.05),
      paintedSteel(0x52525b),
    );
    leg.position.set(x, 0.24, z);
    g.add(leg);
    g.add(machineFoot(x, z));
  }

  // Main body casting
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.95, 0.5),
    physicalPaint(0x1e3a8a, 0.4, 0.32),
  );
  body.position.y = 1.05;
  body.castShadow = true;
  g.add(body);
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.1, 0.54),
    paintedSteel(0x334155, 0.5, 0.4),
  );
  hood.position.y = 1.58;
  g.add(hood);
  const banner = yellowHazardBand(0.54, 0.07, 0.02);
  banner.position.set(0, 1.35, 0.26);
  g.add(banner);

  // Drive gearbox on side
  const gearbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.22, 0.18),
    paintedSteel(0x334155, 0.55, 0.38),
  );
  gearbox.position.set(0.32, 1.2, 0);
  gearbox.castShadow = true;
  g.add(gearbox);
  const motor = motorHousing(0.16, 0.05, "x");
  motor.position.set(0.48, 1.2, 0);
  g.add(motor);
  addCoolingFins(g, 0.32 + 0.1, 1.2, 0, 5);

  // Spindle column
  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.5, 24),
    physicalSteel(0xd4d4d8, 0.88, 0.2),
  );
  spindle.position.y = 0.95;
  g.add(spindle);
  // Rotary chuck with jaw detail
  const chuck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.07, 0.12, 28),
    physicalSteel(0xf1f5f9, 0.9, 0.16),
  );
  chuck.position.y = 0.72;
  chuck.castShadow = true;
  g.add(chuck);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.07, 0.03),
      brushedAluminum(),
    );
    jaw.position.set(Math.cos(a) * 0.06, 0.68, Math.sin(a) * 0.06);
    jaw.rotation.y = -a;
    g.add(jaw);
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.04, 0.018),
      matteBlack(),
    );
    tip.position.set(Math.cos(a) * 0.038, 0.66, Math.sin(a) * 0.038);
    tip.rotation.y = -a;
    g.add(tip);
  }
  // Chuck collar ring
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.012, 10, 24),
    paintedSteel(0x475569),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.8;
  g.add(collar);

  // Cap hopper + feed chute
  const hopper = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.3, 20),
    plastic(0xfafafa, 0.4),
  );
  hopper.position.set(0.24, 1.58, 0.05);
  hopper.castShadow = true;
  g.add(hopper);
  const hopperRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.012, 8, 20),
    safetyYellow(),
  );
  hopperRim.rotation.x = Math.PI / 2;
  hopperRim.position.set(0.24, 1.72, 0.05);
  g.add(hopperRim);
  const feed = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.22),
    steel(0x94a3b8),
  );
  feed.position.set(0.1, 1.42, 0.05);
  feed.rotation.z = 0.35;
  g.add(feed);

  // Cap bowl vibratory base
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.08, 24),
    brushedAluminum(0xb0b8c0),
  );
  bowl.position.set(0.24, 1.38, 0.05);
  g.add(bowl);

  return g;
}

function buildLabeler(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.62), paintedSteel(0x3f3f46, 0.4, 0.4));
  body.position.set(0, 0.95, 0.38);
  body.castShadow = true;
  g.add(body);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 28), plastic(0xf8fafc, 0.35));
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 1.22, 0.42);
  g.add(roll);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 12), steel());
  core.rotation.z = Math.PI / 2;
  core.position.set(0, 1.22, 0.42);
  g.add(core);
  const applicator = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.22), steel(0xa1a1aa));
  applicator.position.set(0, 0.78, 0.1);
  g.add(applicator);
  const peel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.2), plastic(0xfef3c7));
  peel.position.set(0, 0.95, 0.15);
  g.add(peel);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.35), paintedSteel(0x52525b));
  foot.position.set(0, 0.55, 0.2);
  g.add(foot);
  return g;
}

function buildRejectPusher(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.5), paintedSteel(0x44403c));
  base.position.set(0, 0.62, 0.45);
  base.castShadow = true;
  g.add(base);
  // Pneumatic cylinder body + rod + end caps
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.38, 20),
    brushedAluminum(0xc8d0d8),
  );
  cylinder.rotation.x = Math.PI / 2;
  cylinder.position.set(0, 0.72, 0.32);
  g.add(cylinder);
  for (const zz of [0.12, 0.52]) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.025, 16),
      paintedSteel(0x334155),
    );
    cap.rotation.x = Math.PI / 2;
    cap.position.set(0, 0.72, zz);
    g.add(cap);
  }
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.28, 10),
    steel(0xe2e8f0, 0.9, 0.2),
  );
  rod.rotation.x = Math.PI / 2;
  rod.position.set(0, 0.72, 0.0);
  g.add(rod);
  const ram = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), safetyYellow());
  ram.position.set(0, 0.72, -0.12);
  g.add(ram);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.05), rubber(0x1c1917));
  pad.position.set(0, 0.72, -0.18);
  g.add(pad);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.7), paintedSteel(0x78716c));
  chute.position.set(0, 0.5, 0.85);
  chute.rotation.x = -0.15;
  g.add(chute);
  // Airline fittings
  const fitting = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8),
    plastic(0x0ea5e9, 0.45),
  );
  fitting.position.set(0.08, 0.78, 0.45);
  g.add(fitting);
  return g;
}

function buildHmiPanel(): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.55, 0.18),
    paintedSteel(0x1e293b, 0.4, 0.48),
  );
  box.position.set(0, 0.9, 0);
  box.castShadow = true;
  g.add(box);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.03), matteBlack());
  bezel.position.set(0, 1.0, 0.1);
  g.add(bezel);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.2),
    new THREE.MeshStandardMaterial({
      color: 0x134e4a,
      emissive: 0x5eead4,
      emissiveIntensity: 0.55,
      metalness: 0.1,
      roughness: 0.35,
    }),
  );
  screen.position.set(0, 1.0, 0.118);
  g.add(screen);
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.012, 12),
      i === 0 ? plastic(0x22c55e, 0.4) : i === 1 ? plastic(0xf59e0b, 0.4) : plastic(0xef4444, 0.4),
    );
    btn.rotation.x = Math.PI / 2;
    btn.position.set(-0.1 + i * 0.1, 0.78, 0.1);
    g.add(btn);
  }
  return g;
}

function buildLightStack(): { tower: THREE.Group; red: THREE.Mesh; amber: THREE.Mesh; green: THREE.Mesh } {
  const tower = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.04, 1.55, 12),
    paintedSteel(0x27272a),
  );
  pole.position.y = 0.78;
  tower.add(pole);
  const makeLamp = (y: number, mat: THREE.Material) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.11, 18), mat);
    lamp.position.y = y;
    tower.add(lamp);
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.08, 0.025, 18),
      matteBlack(0x171717),
    );
    shade.position.y = y + 0.06;
    tower.add(shade);
    return lamp;
  };
  const red = makeLamp(1.62, alarmRed(false));
  const amber = makeLamp(1.48, warnAmber(false));
  const green = makeLamp(1.34, emissiveAccent(0.3));
  return { tower, red, amber, green };
}

function makeBottle(): BottleMesh {
  const root = new THREE.Group();
  const bodyMat = glassBottle();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.22, 24), bodyMat);
  body.position.y = 0.11;
  body.castShadow = true;
  root.add(body);
  // Shoulder taper
  const shoulder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.055, 0.04, 20),
    bodyMat,
  );
  shoulder.position.y = 0.24;
  root.add(shoulder);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.055, 16), bodyMat);
  neck.position.y = 0.285;
  root.add(neck);
  // Neck ring / finish
  const neckRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.026, 0.005, 8, 20),
    steel(0xe2e8f0, 0.7, 0.3),
  );
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.y = 0.305;
  root.add(neckRing);
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.054, 1, 22), liquid(0x0369a1));
  liq.position.y = 0.02;
  liq.scale.y = 0.001;
  root.add(liq);
  // Cap with knurl rings
  const capGroup = new THREE.Group();
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.032, 20),
    plastic(0x0f766e, 0.4),
  );
  cap.position.y = 0.32;
  capGroup.add(cap);
  for (let i = 0; i < 3; i++) {
    const knurl = new THREE.Mesh(
      new THREE.TorusGeometry(0.031, 0.0025, 6, 20),
      plastic(0x115e59, 0.45),
    );
    knurl.rotation.x = Math.PI / 2;
    knurl.position.y = 0.31 + i * 0.008;
    capGroup.add(knurl);
  }
  const capTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.006, 16),
    plastic(0x134e4a, 0.4),
  );
  capTop.position.y = 0.338;
  capGroup.add(capTop);
  capGroup.visible = false;
  root.add(capGroup);
  // Label wrap band
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.062, 0.085, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.05,
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  label.position.y = 0.12;
  label.visible = false;
  root.add(label);
  // Accent stripe on label band (printed look)
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.059, 0.063, 0.012, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      metalness: 0.1,
      roughness: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  stripe.position.y = 0.145;
  stripe.visible = false;
  root.add(stripe);
  root.visible = false;
  return { root, liquid: liq, cap: capGroup, label, stripe };
}

export function BottlingViewport({
  snap,
  eStop,
  fitToken,
}: {
  snap: BottlingSnapshot;
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
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setGlError("WebGL unavailable.");
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2332);
    scene.fog = new THREE.Fog(0x1a2332, 22, 48);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 100);
    camera.position.set(4.2, 2.8, 5.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.enablePan = true;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controls.maxPolarAngle = Math.PI * 0.49;

    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    addFactoryLights(scene);
    applyFactoryEnvMap(renderer, scene);
    scene.add(makeFactoryFloor(22));

    const world = new THREE.Group();
    scene.add(world);

    const main = buildConveyor(LINE_END);
    world.add(main);

    const spur = buildConveyor(REJECT_LEN, 0);
    spur.rotation.y = -Math.PI / 2;
    spur.position.set(STATIONS.reject, 0, 0);
    world.add(spur);

    const fillHead = buildFillHead();
    fillHead.position.set(STATIONS.fill, 0, 0);
    world.add(fillHead);

    const capper = buildCapper();
    capper.position.set(STATIONS.cap, 0, 0);
    world.add(capper);

    const labeler = buildLabeler();
    labeler.position.set(STATIONS.label, 0, 0);
    world.add(labeler);

    const pusher = buildRejectPusher();
    pusher.position.set(STATIONS.reject, 0, 0);
    world.add(pusher);

    const labels: [StationId, string][] = [
      ["infeed", "INFEED"],
      ["fill", "FILL"],
      ["cap", "CAP"],
      ["label", "LABEL"],
      ["reject", "REJECT"],
      ["outfeed", "OUTFEED"],
    ];
    for (const [id, text] of labels) {
      const sign = stationSign(text, id === "outfeed" || id === "infeed" ? 0.85 : 0.72);
      sign.position.set(STATIONS[id], 2.05, -0.72);
      world.add(sign);
    }

    const eyeMeshes: Partial<Record<StationId, THREE.Group>> = {};
    for (const id of Object.keys(STATIONS) as StationId[]) {
      if (id === "reject") continue;
      const pe = buildPhotoeye(STATIONS[id], false);
      eyeMeshes[id] = pe;
      world.add(pe);
    }
    const rejectEye = buildPhotoeye(0, false);
    rejectEye.position.set(STATIONS.reject, 0.72, REJECT_LEN * 0.55);
    rejectEye.rotation.y = Math.PI / 2;
    world.add(rejectEye);
    eyeMeshes.reject = rejectEye;

    const stack = buildLightStack();
    stack.tower.position.set(-0.4, 0, 1.1);
    world.add(stack.tower);
    const redLamp = stack.red;
    const amberLamp = stack.amber;
    const greenLamp = stack.green;

    const hmi = buildHmiPanel();
    hmi.position.set(-0.95, 0, 0.95);
    world.add(hmi);

    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.1, 0.35),
      paintedSteel(0x1e293b, 0.45, 0.5),
    );
    cab.position.set(-1.35, 0.55, 0.5);
    cab.castShadow = true;
    world.add(cab);

    const pool: BottleMesh[] = [];
    for (let i = 0; i < 24; i++) {
      const b = makeBottle();
      world.add(b.root);
      pool.push(b);
    }

    let disposed = false;
    let raf = 0;
    let lastFit = -1;

    const doFit = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 400;
      camera.aspect = w / Math.max(h, 1);
      fitCameraToObject(camera, controls, world, camera.aspect, 1.02);
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

    const updateEyes = (eyes: BottlingSnapshot["photoeyes"]) => {
      for (const id of Object.keys(eyeMeshes) as StationId[]) {
        const pe = eyeMeshes[id];
        if (!pe) continue;
        const lit = eyes[id];
        const head = pe.children[1] as THREE.Mesh;
        const beam = pe.children[2] as THREE.Mesh;
        if (head?.material) {
          (head.material as THREE.MeshStandardMaterial).dispose();
          head.material = lit ? emissiveAccent(1.6) : paintedSteel(0x292524, 0.4, 0.5);
        }
        if (beam?.material) {
          (beam.material as THREE.MeshBasicMaterial).opacity = lit ? 0.55 : 0.1;
        }
      }
    };

    const tick = () => {
      const { snap: s, eStop: estop, fitToken: ft } = live.current;
      if (ft !== lastFit) {
        lastFit = ft;
        doFit();
      }

      if (redLamp) {
        (redLamp.material as THREE.MeshStandardMaterial).dispose();
        redLamp.material = alarmRed(estop);
      }
      if (amberLamp) {
        (amberLamp.material as THREE.MeshStandardMaterial).dispose();
        amberLamp.material = warnAmber(!estop && s.fillingId != null);
      }
      if (greenLamp) {
        (greenLamp.material as THREE.MeshStandardMaterial).dispose();
        greenLamp.material = estop
          ? paintedSteel(0x365314, 0.3, 0.5)
          : emissiveAccent(s.bottles.length > 0 ? 1.2 : 0.25);
      }

      updateEyes(s.photoeyes);

      for (let i = 0; i < pool.length; i++) {
        const mesh = pool[i]!;
        const b = s.bottles[i];
        if (!b) {
          mesh.root.visible = false;
          continue;
        }
        mesh.root.visible = true;
        if (b.onReject) {
          mesh.root.position.set(STATIONS.reject, 0.48, b.rejectY);
        } else {
          mesh.root.position.set(b.x, 0.48, 0);
        }
        const h = Math.max(0.01, b.fill * 0.2);
        mesh.liquid.scale.y = h;
        mesh.liquid.position.y = h / 2 + 0.01;
        mesh.cap.visible = b.capped;
        mesh.label.visible = b.labeled;
        mesh.stripe.visible = b.labeled;
        if (b.rejected) {
          (mesh.label.material as THREE.MeshStandardMaterial).color.set(0xfca5a5);
        } else {
          (mesh.label.material as THREE.MeshStandardMaterial).color.set(0xf8fafc);
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
      <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-muted">
        {glError}
      </div>
    );
  }

  return <div ref={mountRef} className="h-full w-full touch-none" />;
}
