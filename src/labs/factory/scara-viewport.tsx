import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { fitCameraToObject } from "./fit";
import {
  addFactoryLights,
  alarmRed,
  brushedAluminum,
  emissiveAccent,
  machineBlue,
  makeFactoryFloor,
  matteBlack,
  paintedSteel,
  plastic,
  rubber,
  safetyYellow,
  steel,
  warnAmber,
} from "./materials";
import type { ScaraSnapshot } from "./scara-sim";

function buildBoltCircle(parent: THREE.Object3D, y: number, radius: number, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.025, 8),
      steel(0x94a3b8, 0.9, 0.22),
    );
    bolt.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    parent.add(bolt);
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.008, 6),
      brushedAluminum(),
    );
    head.position.set(Math.cos(a) * radius, y + 0.014, Math.sin(a) * radius);
    parent.add(head);
  }
}

function buildArmLink(length: number, radius: number, colorMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  // Capsule-like: cylinder + rounded end caps
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length - radius * 1.2, 20),
    colorMat,
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.x = length / 2;
  beam.castShadow = true;
  g.add(beam);
  const capA = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), colorMat);
  capA.position.x = radius * 0.55;
  g.add(capA);
  const capB = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.95, 16, 12), colorMat);
  capB.position.x = length - radius * 0.55;
  g.add(capB);
  // Top cover strip
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.7, radius * 0.35, radius * 1.1),
    matteBlack(0x1e293b),
  );
  cover.position.set(length / 2, radius * 0.55, 0);
  g.add(cover);
  return g;
}

function buildMotorHousing(y: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.075, 0.1, 24),
    paintedSteel(0x334155, 0.5, 0.38),
  );
  m.position.y = y;
  m.castShadow = true;
  return m;
}

function buildPerforatedTable(): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.05, 1.0),
    paintedSteel(0x3f3f46, 0.5, 0.42),
  );
  top.position.y = 0.02;
  top.receiveShadow = true;
  top.castShadow = true;
  g.add(top);
  // Tooling plate
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.02, 0.75),
    brushedAluminum(0xa8b0b8),
  );
  plate.position.y = 0.055;
  g.add(plate);
  // Perforation dots
  for (let ix = -4; ix <= 4; ix++) {
    for (let iz = -3; iz <= 3; iz++) {
      if (Math.abs(ix) < 1 && Math.abs(iz) < 1) continue;
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.025, 8),
        matteBlack(0x27272a),
      );
      hole.position.set(ix * 0.09, 0.06, iz * 0.09);
      g.add(hole);
    }
  }
  for (const [x, z] of [
    [-0.52, -0.42],
    [0.52, -0.42],
    [-0.52, 0.42],
    [0.52, 0.42],
  ] as const) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.35, 0.05),
      paintedSteel(0x52525b),
    );
    leg.position.set(x, -0.16, z);
    g.add(leg);
  }
  // Cable carrier stub
  const carrier = new THREE.Group();
  carrier.position.set(-0.55, 0.12, 0);
  for (let i = 0; i < 6; i++) {
    const link = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.035, 0.06),
      paintedSteel(0x57534e),
    );
    link.position.set(i * 0.045, Math.sin(i * 0.4) * 0.02, 0);
    carrier.add(link);
  }
  g.add(carrier);
  return g;
}

export function ScaraViewport({
  snap,
  eStop,
  fitToken,
  L1,
  L2,
}: {
  snap: ScaraSnapshot;
  eStop: boolean;
  fitToken: number;
  L1: number;
  L2: number;
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
    scene.fog = new THREE.Fog(0x1a2332, 20, 42);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 50);
    camera.position.set(1.2, 1.1, 1.4);
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
    scene.add(makeFactoryFloor(10));

    const world = new THREE.Group();
    scene.add(world);

    const table = buildPerforatedTable();
    table.position.y = 0.18;
    world.add(table);

    // Cylindrical base with bolt circle
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 0.28, 32),
      machineBlue(0x1e3a8a),
    );
    base.position.y = 0.32;
    base.castShadow = true;
    world.add(base);
    const baseFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.035, 32),
      paintedSteel(0x334155),
    );
    baseFlange.position.y = 0.2;
    world.add(baseFlange);
    buildBoltCircle(world, 0.225, 0.22, 8);
    const baseStripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.205, 0.205, 0.04, 32),
      safetyYellow(),
    );
    baseStripe.position.y = 0.38;
    world.add(baseStripe);

    // Z column / ball-screw with bellows (shoulder low enough for jaws to meet parts)
    const J1_Y = 0.57;
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.36, 20),
      steel(0x94a3b8, 0.85, 0.28),
    );
    column.position.y = 0.42;
    world.add(column);
    for (let i = 0; i < 5; i++) {
      const bellow = new THREE.Mesh(
        new THREE.TorusGeometry(0.062, 0.008, 8, 20),
        rubber(0x44403c),
      );
      bellow.rotation.x = Math.PI / 2;
      bellow.position.y = 0.3 + i * 0.045;
      world.add(bellow);
    }
    // Ball-screw visible rod
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.32, 10),
      brushedAluminum(0xd0d8e0),
    );
    screw.position.set(0.08, 0.42, 0);
    world.add(screw);

    const j1 = new THREE.Group();
    j1.position.y = J1_Y;
    world.add(j1);
    j1.add(buildMotorHousing(0.06));
    const motorCap1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20),
      brushedAluminum(),
    );
    motorCap1.position.y = 0.12;
    j1.add(motorCap1);
    const link1 = buildArmLink(L1, 0.055, paintedSteel(0xf1f5f9, 0.45, 0.32));
    j1.add(link1);

    const j2 = new THREE.Group();
    j2.position.x = L1;
    j1.add(j2);
    j2.add(buildMotorHousing(0.05));
    const link2 = buildArmLink(L2, 0.045, machineBlue(0x1e40af));
    j2.add(link2);

    const zCarriage = new THREE.Group();
    zCarriage.position.x = L2;
    j2.add(zCarriage);
    const zHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.08),
      paintedSteel(0x475569),
    );
    zCarriage.add(zHousing);
    const zRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.3, 14),
      steel(0xcbd5e1, 0.88, 0.22),
    );
    zCarriage.add(zRail);
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.022, 0.004, 6, 14),
        rubber(0x292524),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.05 - i * 0.035;
      zCarriage.add(ring);
    }

    const tool = new THREE.Group();
    zCarriage.add(tool);
    const flange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.02, 18),
      steel(0xe2e8f0, 0.85, 0.2),
    );
    tool.add(flange);
    const gripperBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.06, 0.045),
      brushedAluminum(0xb0b8c0),
    );
    gripperBody.position.y = -0.04;
    tool.add(gripperBody);
    const jawL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.045, 0.028), plastic(0x5eead4));
    jawL.position.set(-0.025, -0.08, 0);
    tool.add(jawL);
    const jawR = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.045, 0.028), plastic(0x5eead4));
    jawR.position.set(0.025, -0.08, 0);
    tool.add(jawR);

    // Part nest / feeder with pins
    const feeder = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.05, 0.18),
      paintedSteel(0x3f3f46),
    );
    feeder.position.set(0.45, 0.26, 0.25);
    feeder.castShadow = true;
    world.add(feeder);
    const feederLip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), safetyYellow());
    feederLip.position.set(0.45, 0.295, 0.25);
    world.add(feederLip);
    for (const [px, pz] of [
      [-0.05, -0.05],
      [0.05, -0.05],
      [-0.05, 0.05],
      [0.05, 0.05],
    ] as const) {
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8),
        steel(),
      );
      pin.position.set(0.45 + px, 0.3, 0.25 + pz);
      world.add(pin);
    }

    const pallet = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.035, 0.28),
      paintedSteel(0x57534e),
    );
    pallet.position.set(0.35, 0.25, -0.3);
    world.add(pallet);
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.03, 0.18),
      paintedSteel(0x1e293b),
    );
    tray.position.set(-0.25, 0.26, -0.2);
    world.add(tray);
    const trayLip = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.015, 0.2),
      emissiveAccent(0.3),
    );
    trayLip.position.set(-0.25, 0.28, -0.2);
    world.add(trayLip);

    const part = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.03, 14),
      plastic(0xf59e0b),
    );
    part.position.set(0.45, 0.31, 0.25);
    part.castShadow = true;
    world.add(part);
    const placed = part.clone();
    placed.position.set(-0.25, 0.29, -0.2);
    placed.visible = false;
    world.add(placed);

    const amb = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 12), warnAmber(false));
    amb.position.set(0.55, 1.05, -0.4);
    world.add(amb);
    const red = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 12), alarmRed(false));
    red.position.set(0.55, 1.13, -0.4);
    world.add(red);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, 1.0, 10),
      paintedSteel(0x27272a),
    );
    pole.position.set(0.55, 0.55, -0.4);
    world.add(pole);
    for (const y of [1.05, 1.13]) {
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.045, 0.015, 12),
        matteBlack(),
      );
      shade.position.set(0.55, y + 0.04, -0.4);
      world.add(shade);
    }

    // Small controller box
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.45, 0.2),
      paintedSteel(0x1e293b),
    );
    cab.position.set(-0.55, 0.4, -0.4);
    cab.castShadow = true;
    world.add(cab);

    let disposed = false;
    let raf = 0;
    let lastFit = -1;

    const doFit = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 400;
      camera.aspect = w / Math.max(h, 1);
      fitCameraToObject(camera, controls, world, camera.aspect, 1.05);
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
      j1.rotation.y = (s.theta1 * Math.PI) / 180;
      j2.rotation.y = (s.theta2 * Math.PI) / 180;
      tool.position.y = -0.05 - (0.15 - s.z);
      tool.rotation.y = (s.wrist * Math.PI) / 180;
      const open = s.gripped ? 0.012 : 0.028;
      jawL.position.x = -open;
      jawR.position.x = open;

      // Jaw world Y: J1_Y + (z - 0.20) - 0.08 = J1_Y + z - 0.28 (~0.31 at pick-down)
      if (s.gripped) {
        part.visible = true;
        const wp = new THREE.Vector3();
        jawL.getWorldPosition(wp);
        part.position.set(s.tip.x, wp.y, s.tip.y);
      } else if (s.partAtPlace) {
        part.visible = false;
        part.position.set(-0.25, 0.29, -0.2);
      } else {
        part.visible = s.partVisible;
        part.position.set(0.45, 0.31, 0.25);
      }
      // Deposited part stays on the tray (no teleport); visible after first place
      placed.visible = s.partAtPlace || s.cycles > 0;
      placed.position.set(-0.25, 0.29, -0.2);

      (amb.material as THREE.Material).dispose();
      amb.material = warnAmber(!es && s.phase !== "idle");
      (red.material as THREE.Material).dispose();
      red.material = alarmRed(es);

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
  }, [L1, L2]);

  if (glError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted">{glError}</div>
    );
  }
  return <div ref={mountRef} className="h-full w-full touch-none" />;
}
