import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { fitCameraToObject } from "./fit";
import {
  ACCENT,
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
  stationSign,
  steel,
  warnAmber,
} from "./materials";
import { SORTER_LANES, type SorterSnapshot } from "./sorter-sim";

const COLOR_MAP = { red: 0xef4444, blue: 0x3b82f6, amber: 0xf59e0b };

function belt(len: number, width = 0.4): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.08, width + 0.08),
    paintedSteel(0x3f3f46),
  );
  frame.position.set(len / 2, 0.4, 0);
  frame.castShadow = true;
  g.add(frame);
  const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, width), rubber());
  b.position.set(len / 2, 0.46, 0);
  b.receiveShadow = true;
  g.add(b);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.05, 0.015),
      steel(0x9ca3af, 0.8, 0.3),
    );
    rail.position.set(len / 2, 0.54, side * (width / 2 + 0.02));
    g.add(rail);
  }
  for (let i = 0; i <= Math.floor(len / 1.2); i++) {
    const x = 0.15 + i * 1.2;
    if (x > len) break;
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.4, 0.04),
        paintedSteel(0x52525b),
      );
      leg.position.set(x, 0.2, side * (width / 2 - 0.02));
      g.add(leg);
    }
  }
  return g;
}

function buildVisionGate(x: number): { root: THREE.Group; eye: THREE.Mesh; ring: THREE.Mesh } {
  const root = new THREE.Group();
  root.position.set(x, 0, 0);

  const gantry = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.95),
    machineBlue(0x1e40af),
  );
  gantry.position.y = 1.15;
  gantry.castShadow = true;
  root.add(gantry);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.98), safetyYellow());
  bar.position.y = 1.28;
  root.add(bar);

  // Side posts
  for (const z of [-0.42, 0.42]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.15, 0.08),
      paintedSteel(0x475569),
    );
    post.position.set(0, 0.57, z);
    post.castShadow = true;
    root.add(post);
  }

  // Camera housing
  const camBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.12),
    matteBlack(0x1a1a1a),
  );
  camBody.position.set(-0.12, 1.05, 0);
  root.add(camBody);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.035, 0.04, 16),
    steel(0xcbd5e1, 0.7, 0.25),
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.set(-0.16, 1.05, 0);
  root.add(lens);
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 16),
    new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      metalness: 0.2,
      roughness: 0.2,
    }),
  );
  glass.rotation.y = Math.PI / 2;
  glass.position.set(-0.182, 1.05, 0);
  root.add(glass);

  // LED ring around camera view
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.012, 10, 28),
    emissiveAccent(0.4),
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.set(-0.08, 0.85, 0);
  root.add(ring);

  // Photoeye posts across belt
  for (const z of [-0.28, 0.28]) {
    const pePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.015, 0.35, 10),
      brushedAluminum(),
    );
    pePost.position.set(0.05, 0.65, z);
    root.add(pePost);
    const peHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.035),
      paintedSteel(0x292524),
    );
    peHead.position.set(0.05, 0.82, z);
    root.add(peHead);
  }
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.02, 0.55),
    new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.2,
    }),
  );
  eye.position.set(0.05, 0.82, 0);
  root.add(eye);

  return { root, eye, ring };
}

function buildDivertGate(laneZ: number, color: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(SORTER_LANES.GATE_X + 0.15, 0.52, laneZ * 0.35);

  // Hinged paddle
  const hinge = new THREE.Group();
  hinge.position.set(0, 0, 0);
  g.add(hinge);
  const paddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.08, 0.04),
    paintedSteel(0xf1f5f9, 0.45, 0.35),
  );
  paddle.position.x = 0.14;
  paddle.castShadow = true;
  hinge.add(paddle);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.05), plastic(color, 0.45));
  tip.position.x = 0.28;
  hinge.add(tip);

  // Pneumatic cylinder actuator
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.18, 14),
    brushedAluminum(),
  );
  cyl.rotation.z = Math.PI / 2;
  cyl.position.set(0.05, 0.08, 0.08);
  g.add(cyl);
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8),
    steel(0xe2e8f0),
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0.16, 0.08, 0.08);
  g.add(rod);
  const mount = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.05, 0.06),
    paintedSteel(0x52525b),
  );
  mount.position.set(-0.02, 0.05, 0.08);
  g.add(mount);

  // Slight default divert angle toward lane
  hinge.rotation.y = laneZ * 0.35;
  return g;
}

function buildLaneChute(z: number, colorHex: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(SORTER_LANES.GATE_X, 0, z);
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.025, SORTER_LANES.LANE_LEN),
    paintedSteel(0x57534e),
  );
  floor.position.set(0.18, 0.44, -SORTER_LANES.LANE_LEN / 2);
  floor.rotation.y = 0;
  // Spur already has belt; add side walls on spur direction (-Z from gate when rotated)
  // Walls along spur (local after parent places spur)
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.14, SORTER_LANES.LANE_LEN * 0.9),
      paintedSteel(0x64748b),
    );
    wall.position.set(side * 0.18, 0.55, -SORTER_LANES.LANE_LEN / 2);
    g.add(wall);
  }
  // Bin mouth at end of spur
  const bin = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.35, 0.4),
    paintedSteel(0x334155),
  );
  bin.position.set(0, 0.25, -SORTER_LANES.LANE_LEN - 0.15);
  bin.castShadow = true;
  g.add(bin);
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.08, 0.36),
    matteBlack(0x0f172a),
  );
  mouth.position.set(0, 0.44, -SORTER_LANES.LANE_LEN - 0.15);
  g.add(mouth);
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.03, 0.4),
    new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.25, roughness: 0.45 }),
  );
  lip.position.set(0, 0.48, -SORTER_LANES.LANE_LEN - 0.15);
  g.add(lip);
  return g;
}

function buildInfeedHopper(): THREE.Group {
  const g = new THREE.Group();
  g.position.set(0.15, 0, 0);
  const hopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.12, 0.35, 6),
    paintedSteel(0x475569),
  );
  hopper.position.set(0, 0.85, 0);
  hopper.castShadow = true;
  g.add(hopper);
  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.08, 0.35),
    steel(0x94a3b8),
  );
  chute.position.set(0.15, 0.62, 0);
  chute.rotation.z = -0.35;
  g.add(chute);
  // Rail guides onto belt
  for (const z of [-0.12, 0.12]) {
    const guide = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.04, 0.02),
      brushedAluminum(),
    );
    guide.position.set(0.45, 0.55, z);
    g.add(guide);
  }
  const funnelLip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.03, 6),
    safetyYellow(),
  );
  funnelLip.position.set(0, 1.02, 0);
  g.add(funnelLip);
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
    scene.fog = new THREE.Fog(0x1a2332, 16, 36);
    const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 60);
    camera.position.set(3.2, 2.6, 3.8);
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
    scene.add(makeFactoryFloor(18));

    const world = new THREE.Group();
    scene.add(world);
    world.add(belt(SORTER_LANES.GATE_X + 0.6));
    world.add(buildInfeedHopper());

    const laneZs = [-0.85, 0, 0.85];
    const laneLabels = ["RED", "BLUE", "AMBER"];
    const laneColors = [0xef4444, 0x3b82f6, 0xf59e0b];
    for (let i = 0; i < 3; i++) {
      const spur = belt(SORTER_LANES.LANE_LEN, 0.32);
      spur.rotation.y = -Math.PI / 2;
      spur.position.set(SORTER_LANES.GATE_X, 0, laneZs[i]);
      world.add(spur);
      const chute = buildLaneChute(laneZs[i]!, laneColors[i]!);
      // Align chute walls with spur: spur goes in -local Z after rotation
      // buildLaneChute places walls in -Z; position at lane
      world.add(chute);
      const sign = stationSign(laneLabels[i]!, 0.5);
      sign.position.set(SORTER_LANES.GATE_X + 0.55, 1.15, laneZs[i]!);
      world.add(sign);
      world.add(buildDivertGate(laneZs[i]! / 0.85, laneColors[i]!));
    }

    const gate = buildVisionGate(SORTER_LANES.GATE_X);
    world.add(gate.root);

    const inSign = stationSign("INFEED", 0.6);
    inSign.position.set(0.55, 1.15, -0.55);
    world.add(inSign);

    const redL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 14), alarmRed(false));
    redL.position.set(-0.3, 1.35, 0.75);
    world.add(redL);
    const ambL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 14), warnAmber(false));
    ambL.position.set(-0.3, 1.24, 0.75);
    world.add(ambL);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 1.25, 10),
      paintedSteel(0x27272a),
    );
    pole.position.set(-0.3, 0.7, 0.75);
    world.add(pole);
    for (const y of [1.35, 1.24]) {
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.055, 0.02, 14),
        matteBlack(),
      );
      shade.position.set(-0.3, y + 0.05, 0.75);
      world.add(shade);
    }

    // Control cabinet
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.7, 0.25),
      paintedSteel(0x1e293b),
    );
    cab.position.set(-0.5, 0.35, 0.75);
    cab.castShadow = true;
    world.add(cab);

    type PMesh = { root: THREE.Mesh };
    const pool: PMesh[] = [];
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), plastic(0xcccccc));
      m.castShadow = true;
      m.visible = false;
      world.add(m);
      pool.push({ root: m });
    }

    let disposed = false;
    let raf = 0;
    let lastFit = -1;

    const doFit = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 400;
      camera.aspect = w / Math.max(h, 1);
      fitCameraToObject(camera, controls, world, camera.aspect, 0.92);
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

      for (let i = 0; i < pool.length; i++) {
        const mesh = pool[i]!.root;
        const p = s.parts[i];
        if (!p) {
          mesh.visible = false;
          continue;
        }
        mesh.visible = true;
        const scale = p.size === "large" ? 0.12 : 0.08;
        mesh.scale.set(scale, scale * 0.7, scale);
        (mesh.material as THREE.MeshStandardMaterial).color.set(COLOR_MAP[p.color]);
        if (p.lane != null) {
          mesh.position.set(SORTER_LANES.GATE_X, 0.52, laneZs[p.lane]! - p.laneY);
        } else {
          mesh.position.set(p.x, 0.52, 0);
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
