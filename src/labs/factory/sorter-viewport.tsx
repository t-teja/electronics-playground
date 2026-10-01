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
  motorHousing,
  pneumaticCylinder,
  sheetBin,
} from "./industrial-kit";
import { SORTER_LANES, type SorterSnapshot } from "./sorter-sim";

const COLOR_MAP = { red: 0xef4444, blue: 0x3b82f6, amber: 0xf59e0b };
const LANE_ZS = [-0.95, 0, 0.95] as const;

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
  // Drive motor at outfeed
  const drive = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.14, 0.2),
    paintedSteel(0x334155),
  );
  drive.position.set(len - 0.08, 0.28, width / 2 + 0.14);
  g.add(drive);
  const mot = motorHousing(0.12, 0.04, "x");
  mot.position.set(len - 0.2, 0.28, width / 2 + 0.14);
  g.add(mot);
  return g;
}

function buildVisionGate(x: number): { root: THREE.Group; eye: THREE.Mesh; ring: THREE.Mesh } {
  const root = new THREE.Group();
  root.position.set(x, 0, 0);

  // Tunnel hood / vision enclosure
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.45, 0.85),
    physicalPaint(0x1e40af, 0.4, 0.35),
  );
  hood.position.set(0, 0.95, 0);
  hood.castShadow = true;
  root.add(hood);
  // Inner tunnel void (dark)
  const voidBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.32, 0.5),
    matteBlack(0x0f172a),
  );
  voidBox.position.set(0, 0.72, 0);
  root.add(voidBox);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.9), safetyYellow());
  bar.position.y = 1.2;
  root.add(bar);

  // Side posts with cross-brace
  for (const z of [-0.4, 0.4]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 1.2, 0.09),
      paintedSteel(0x475569),
    );
    post.position.set(0, 0.6, z);
    post.castShadow = true;
    root.add(post);
  }
  const brace = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.78),
    brushedAluminum(),
  );
  brace.position.set(-0.2, 0.9, 0);
  root.add(brace);

  // Camera + LED ring under hood
  const camBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.12),
    matteBlack(0x1a1a1a),
  );
  camBody.position.set(0, 1.05, 0);
  root.add(camBody);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.038, 0.045, 18),
    physicalSteel(0xcbd5e1, 0.75, 0.22),
  );
  lens.position.set(0, 0.98, 0);
  root.add(lens);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.014, 10, 28),
    emissiveAccent(0.55),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.92, 0);
  root.add(ring);

  // Photoeye beam across belt
  for (const z of [-0.28, 0.28]) {
    const pePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.015, 0.28, 10),
      brushedAluminum(),
    );
    pePost.position.set(0.22, 0.62, z);
    root.add(pePost);
    const peHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.035),
      paintedSteel(0x292524),
    );
    peHead.position.set(0.22, 0.76, z);
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
  eye.position.set(0.22, 0.76, 0);
  root.add(eye);

  return { root, eye, ring };
}

/** Highly visible divert paddle + pneumatic actuator at each lane. */
function buildDivertGate(
  laneIndex: number,
  color: number,
): { root: THREE.Group; hinge: THREE.Group; restAngle: number; activeAngle: number } {
  const laneZ = LANE_ZS[laneIndex]!;
  const g = new THREE.Group();
  // Full lane Z - paddles sit at the spur entrance, not clustered at center
  g.position.set(SORTER_LANES.GATE_X + 0.12, 0.52, laneZ);

  const hinge = new THREE.Group();
  g.add(hinge);

  // Tall visible paddle blade
  const paddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.14, 0.045),
    paintedSteel(0xf8fafc, 0.5, 0.32),
  );
  paddle.position.x = 0.19;
  paddle.castShadow = true;
  hinge.add(paddle);
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.16, 0.055),
    plastic(color, 0.4),
  );
  edge.position.x = 0.38;
  hinge.add(edge);
  // Stripe so paddle reads even from Fit view
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.03, 0.05),
    new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.4 }),
  );
  stripe.position.set(0.18, 0.05, 0);
  hinge.add(stripe);

  // Pivot block
  const pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.08, 14),
    brushedAluminum(),
  );
  pivot.position.set(0, 0, 0);
  g.add(pivot);

  // Pneumatic cylinder (visible)
  const cyl = pneumaticCylinder(0.22, 0.028, "z");
  cyl.position.set(0.05, 0.1, laneIndex === 1 ? 0.12 : Math.sign(laneZ || 1) * 0.14);
  g.add(cyl);

  // Airline tubing
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.05, 0.14, 0.1),
        new THREE.Vector3(-0.1, 0.2, 0.15),
        new THREE.Vector3(-0.25, 0.15, 0.2),
      ]),
      12,
      0.008,
      6,
      false,
    ),
    plastic(0x0ea5e9, 0.45),
  );
  g.add(tube);

  // Rest: slightly open to main belt; active: swung to push into spur (-Z)
  const restAngle = laneIndex === 1 ? 0.15 : Math.sign(laneZ || 1) * 0.35;
  const activeAngle = laneIndex === 1 ? -0.85 : Math.sign(laneZ || 1) * -0.95;
  hinge.rotation.y = restAngle;
  return { root: g, hinge, restAngle, activeAngle };
}

function buildLaneChute(laneIndex: number, colorHex: number): THREE.Group {
  const z = LANE_ZS[laneIndex]!;
  const g = new THREE.Group();
  g.position.set(SORTER_LANES.GATE_X, 0, z);

  // Sheet-metal side walls along spur (-Z)
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.16, SORTER_LANES.LANE_LEN * 0.95),
      paintedSteel(0x64748b, 0.45, 0.4),
    );
    wall.position.set(side * 0.17, 0.56, -SORTER_LANES.LANE_LEN / 2);
    wall.castShadow = true;
    g.add(wall);
    // Thickness lip
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.03, SORTER_LANES.LANE_LEN * 0.95),
      brushedAluminum(),
    );
    lip.position.set(side * 0.185, 0.65, -SORTER_LANES.LANE_LEN / 2);
    g.add(lip);
  }

  // Floor pan
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.02, SORTER_LANES.LANE_LEN),
    paintedSteel(0x57534e),
  );
  floor.position.set(0, 0.45, -SORTER_LANES.LANE_LEN / 2);
  g.add(floor);

  // Large colored bin at spur end — must be obvious in Fit view
  const bin = sheetBin(0.5, 0.42, 0.48, 0x1e293b, colorHex);
  bin.position.set(0, 0.28, -SORTER_LANES.LANE_LEN - 0.28);
  g.add(bin);
  // Bin legs
  for (const [bx, bz] of [
    [-0.18, -0.15],
    [0.18, -0.15],
    [-0.18, 0.15],
    [0.18, 0.15],
  ] as const) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.04),
      paintedSteel(0x475569),
    );
    leg.position.set(bx, 0.06, -SORTER_LANES.LANE_LEN - 0.28 + bz);
    g.add(leg);
  }
  boltCircle(bin, 0.22, 0.18, 4, 0.007);

  return g;
}

function buildInfeedHopper(): THREE.Group {
  const g = new THREE.Group();
  g.position.set(0.2, 0, 0);
  // Frame uprights + cross-brace
  for (const z of [-0.22, 0.22]) {
    const upright = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.05, 0.06),
      paintedSteel(0x475569),
    );
    upright.position.set(-0.05, 0.52, z);
    upright.castShadow = true;
    g.add(upright);
  }
  const cross = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.44),
    brushedAluminum(),
  );
  cross.position.set(-0.05, 0.85, 0);
  g.add(cross);

  const hopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.12, 0.4, 8),
    paintedSteel(0x475569, 0.45, 0.42),
  );
  hopper.position.set(0, 0.9, 0);
  hopper.castShadow = true;
  g.add(hopper);
  const funnelLip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.035, 8),
    safetyYellow(),
  );
  funnelLip.position.set(0, 1.1, 0);
  g.add(funnelLip);
  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.06, 0.38),
    physicalSteel(0x94a3b8, 0.7, 0.3),
  );
  chute.position.set(0.18, 0.62, 0);
  chute.rotation.z = -0.4;
  g.add(chute);
  for (const z of [-0.13, 0.13]) {
    const guide = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.04, 0.02),
      brushedAluminum(),
    );
    guide.position.set(0.5, 0.55, z);
    g.add(guide);
  }
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
  // Bevel lip so parts read as molded plastics
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(s * 1.05, s * 0.08, s * 1.05),
    plastic(color, 0.35),
  );
  lip.position.y = s * 0.3;
  g.add(lip);
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
    camera.position.set(3.6, 2.8, 4.2);
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
    world.add(belt(SORTER_LANES.GATE_X + 0.7));
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
      const spur = belt(SORTER_LANES.LANE_LEN, 0.32);
      spur.rotation.y = -Math.PI / 2;
      spur.position.set(SORTER_LANES.GATE_X, 0, LANE_ZS[i]);
      world.add(spur);
      world.add(buildLaneChute(i, laneColors[i]!));
      const sign = stationSign(laneLabels[i]!, 0.55);
      sign.position.set(SORTER_LANES.GATE_X + 0.15, 1.25, LANE_ZS[i]! - SORTER_LANES.LANE_LEN - 0.15);
      world.add(sign);
      const gate = buildDivertGate(i, laneColors[i]!);
      world.add(gate.root);
      divertGates.push(gate);
    }

    const gate = buildVisionGate(SORTER_LANES.GATE_X);
    world.add(gate.root);

    const inSign = stationSign("INFEED", 0.6);
    inSign.position.set(0.55, 1.2, -0.6);
    world.add(inSign);

    const redL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 14), alarmRed(false));
    redL.position.set(-0.3, 1.35, 0.85);
    world.add(redL);
    const ambL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 14), warnAmber(false));
    ambL.position.set(-0.3, 1.24, 0.85);
    world.add(ambL);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 1.25, 10),
      paintedSteel(0x27272a),
    );
    pole.position.set(-0.3, 0.7, 0.85);
    world.add(pole);
    for (const y of [1.35, 1.24]) {
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.055, 0.02, 14),
        matteBlack(),
      );
      shade.position.set(-0.3, y + 0.05, 0.85);
      world.add(shade);
    }

    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.75, 0.28),
      paintedSteel(0x1e293b),
    );
    cab.position.set(-0.55, 0.38, 0.85);
    cab.castShadow = true;
    world.add(cab);
    // Cabinet vents
    for (let i = 0; i < 5; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.012, 0.01),
        matteBlack(),
      );
      vent.position.set(-0.55, 0.55 + i * 0.04, 0.995);
      world.add(vent);
    }

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
      // Slightly looser Fit so bins + paddles + idle parts stay in frame
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
      (gate.eye.material as THREE.MeshBasicMaterial).opacity = s.photoeye ? 0.55 : 0.12;
      (gate.ring.material as THREE.Material).dispose();
      gate.ring.material = s.photoeye ? emissiveAccent(1.5) : emissiveAccent(0.35);
      (redL.material as THREE.Material).dispose();
      redL.material = alarmRed(es);
      (ambL.material as THREE.Material).dispose();
      ambL.material = warnAmber(!es && s.photoeye);

      // Swing divert paddle when a part is actively entering that lane
      for (let li = 0; li < divertGates.length; li++) {
        const dg = divertGates[li]!;
        const active = s.parts.some(
          (p) => p.lane === li && !p.done && p.laneY < 0.55,
        );
        const target = active ? dg.activeAngle : dg.restAngle;
        dg.hinge.rotation.y += (target - dg.hinge.rotation.y) * 0.18;
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
          // Rebuild part mesh materials/scale via children
          const body = slot.root.children[0] as THREE.Mesh;
          const lip = slot.root.children[1] as THREE.Mesh;
          const s0 = large ? 0.11 : 0.075;
          body.geometry.dispose();
          body.geometry = new THREE.BoxGeometry(s0, s0 * 0.65, s0);
          (body.material as THREE.MeshStandardMaterial).color.set(color);
          lip.geometry.dispose();
          lip.geometry = new THREE.BoxGeometry(s0 * 1.05, s0 * 0.08, s0 * 1.05);
          lip.position.y = s0 * 0.3;
          (lip.material as THREE.MeshStandardMaterial).color.set(color);
          slot.color = color;
          slot.large = large;
        }
        slot.root.visible = true;
        if (p.lane != null) {
          slot.root.position.set(SORTER_LANES.GATE_X, 0.52, LANE_ZS[p.lane]! - p.laneY);
        } else {
          slot.root.position.set(p.x, 0.52, 0);
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
