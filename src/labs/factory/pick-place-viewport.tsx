import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import URDFLoader from "urdf-loader";
import { fitCameraToObject } from "./fit";
import {
  addFactoryLights,
  alarmRed,
  brushedAluminum,
  enableShadows,
  machineBlue,
  makeFactoryFloor,
  matteBlack,
  rubber,
  paintedSteel,
  plastic,
  safetyYellow,
  steel,
  warnAmber,
} from "./materials";
import type { PpSnapshot } from "./pick-place-sim";

const JOINT_NAMES = [
  "shoulder_pan_joint",
  "shoulder_lift_joint",
  "elbow_joint",
  "wrist_1_joint",
  "wrist_2_joint",
  "wrist_3_joint",
];

function buildIndustrialTable(): THREE.Group {
  const g = new THREE.Group();
  // Thick top with slight edge lip (chamfer feel)
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.055, 1.08),
    paintedSteel(0x3f3f46, 0.55, 0.4),
  );
  top.position.set(0, 0.445, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(1.74, 0.02, 1.12),
    brushedAluminum(0x9aa3ad),
  );
  edge.position.set(0, 0.412, 0);
  g.add(edge);
  const undershelf = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.03, 0.95),
    paintedSteel(0x52525b, 0.5, 0.45),
  );
  undershelf.position.set(0, 0.18, 0);
  g.add(undershelf);
  // Legs with feet
  for (const [x, z] of [
    [-0.72, -0.44],
    [0.72, -0.44],
    [-0.72, 0.44],
    [0.72, 0.44],
  ] as const) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.42, 0.055),
      paintedSteel(0x52525b),
    );
    leg.position.set(x, 0.21, z);
    leg.castShadow = true;
    g.add(leg);
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.025, 0.1),
      matteBlack(),
    );
    foot.position.set(x, 0.012, z);
    g.add(foot);
  }
  // Cable trough under rear edge
  const trough = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.06, 0.1),
    paintedSteel(0x27272a, 0.4, 0.5),
  );
  trough.position.set(0, 0.36, -0.52);
  g.add(trough);
  const troughLip = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.02, 0.02),
    steel(0x71717a),
  );
  troughLip.position.set(0, 0.4, -0.47);
  g.add(troughLip);
  // Cable bundle in trough
  for (let i = 0; i < 4; i++) {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 1.2, 8),
      plastic(i % 2 === 0 ? 0x1e3a8a : 0xf59e0b, 0.55),
    );
    cable.rotation.z = Math.PI / 2;
    cable.position.set(0, 0.355, -0.52 + (i - 1.5) * 0.018);
    g.add(cable);
  }
  return g;
}

function buildNestFixture(x: number, z: number, nest: boolean): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0.47, z);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.035, 0.2),
    nest ? machineBlue(0x1e3a8a) : steel(0xcbd5e1, 0.82, 0.26),
  );
  plate.castShadow = true;
  g.add(plate);
  // Corner pins / bolts
  for (const [px, pz] of [
    [-0.075, -0.075],
    [0.075, -0.075],
    [-0.075, 0.075],
    [0.075, 0.075],
  ] as const) {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10),
      steel(0x94a3b8, 0.9, 0.2),
    );
    bolt.position.set(px, 0.028, pz);
    g.add(bolt);
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.006, 6),
      brushedAluminum(),
    );
    head.position.set(px, 0.042, pz);
    g.add(head);
  }
  if (nest) {
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.025, 0.16),
      safetyYellow(),
    );
    lip.position.y = 0.028;
    g.add(lip);
    const pocket = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.02, 0.09),
      matteBlack(0x0f172a),
    );
    pocket.position.y = 0.04;
    g.add(pocket);
  } else {
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.014, 0.07, 14),
      steel(0xe2e8f0, 0.9, 0.18),
    );
    pin.position.y = 0.05;
    g.add(pin);
    const bushing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.018, 16),
      brushedAluminum(),
    );
    bushing.position.y = 0.028;
    g.add(bushing);
  }
  return g;
}

function buildTeachPendant(): THREE.Group {
  const g = new THREE.Group();
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.014, 0.55, 10),
    paintedSteel(0x52525b),
  );
  arm.rotation.z = 0.35;
  arm.position.set(-0.55, 0.85, 0.55);
  g.add(arm);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.22, 0.05),
    matteBlack(0x1e293b),
  );
  body.position.set(-0.4, 1.05, 0.62);
  body.rotation.x = -0.25;
  body.castShadow = true;
  g.add(body);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x134e4a,
      emissive: 0x5eead4,
      emissiveIntensity: 0.35,
      metalness: 0.1,
      roughness: 0.4,
    }),
  );
  screen.position.set(-0.4, 1.07, 0.648);
  screen.rotation.x = -0.25;
  g.add(screen);
  const strap = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.006, 6, 16, Math.PI),
    rubber(),
  );
  strap.position.set(-0.4, 0.95, 0.62);
  strap.rotation.x = Math.PI / 2;
  g.add(strap);
  return g;
}


function buildTwoJawGripper(): THREE.Group {
  const g = new THREE.Group();
  // UR5e tool0 is Z-up in robot frame; after root rot, attach along tool axis
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.042, 0.055, 20),
    paintedSteel(0x334155, 0.5, 0.35),
  );
  housing.position.z = 0.03;
  g.add(housing);
  const flange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20),
    steel(0xcbd5e1, 0.85, 0.22),
  );
  flange.position.z = 0.004;
  g.add(flange);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.045, 0.06),
    brushedAluminum(0xb0b8c0),
  );
  body.position.z = 0.07;
  g.add(body);
  for (const side of [-1, 1]) {
    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.028, 0.055),
      plastic(0x5eead4, 0.4),
    );
    jaw.position.set(side * 0.028, 0, 0.11);
    g.add(jaw);
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.022, 0.02),
      matteBlack(),
    );
    tip.position.set(side * 0.028, 0, 0.145);
    g.add(tip);
  }
  return g;
}

export function PickPlaceViewport({
  snap,
  eStop,
  fitToken,
}: {
  snap: PpSnapshot;
  eStop: boolean;
  fitToken: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const live = useRef({ snap, eStop, fitToken });
  live.current = { snap, eStop, fitToken };
  const [glError, setGlError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 60);
    camera.position.set(1.8, 1.4, 1.8);

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
    scene.add(makeFactoryFloor(14));

    const world = new THREE.Group();
    scene.add(world);

    world.add(buildIndustrialTable());
    world.add(buildNestFixture(0.45, 0.25, true));
    world.add(buildNestFixture(-0.4, -0.2, false));
    world.add(buildTeachPendant());

    // Safety posts
    for (const [x, z] of [
      [-0.9, -0.58],
      [0.9, -0.58],
      [-0.9, 0.58],
      [0.9, 0.58],
    ] as const) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.95, 0.05),
        paintedSteel(0x52525b),
      );
      post.position.set(x, 0.48, z);
      post.castShadow = true;
      world.add(post);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.06, 0.065), safetyYellow());
      tip.position.set(x, 0.98, z);
      world.add(tip);
      const basePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.02, 0.1),
        paintedSteel(0x3f3f46),
      );
      basePlate.position.set(x, 0.01, z);
      world.add(basePlate);
    }

    // Controller cabinet with HMI stub
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.85, 0.28),
      paintedSteel(0x1e293b, 0.4, 0.48),
    );
    cab.position.set(-1.0, 0.42, 0);
    cab.castShadow = true;
    world.add(cab);
    const hmi = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.03),
      matteBlack(),
    );
    hmi.position.set(-1.0, 0.7, 0.155);
    world.add(hmi);
    const hmiScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x0f766e,
        emissive: 0x5eead4,
        emissiveIntensity: 0.45,
      }),
    );
    hmiScreen.position.set(-1.0, 0.7, 0.172);
    world.add(hmiScreen);

    const part = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.04, 0.06),
      plastic(0x5eead4, 0.4),
    );
    part.position.set(0.45, 0.54, 0.25);
    part.castShadow = true;
    world.add(part);

    const placed = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.04, 0.06),
      plastic(0x5eead4, 0.4),
    );
    placed.position.set(-0.4, 0.54, -0.2);
    placed.visible = false;
    world.add(placed);

    // Stack light with shades
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 1.35, 12),
      paintedSteel(0x27272a),
    );
    pole.position.set(0.9, 0.75, 0.58);
    world.add(pole);
    const redL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 16), alarmRed(false));
    redL.position.set(0.9, 1.48, 0.58);
    world.add(redL);
    const ambL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 16), warnAmber(false));
    ambL.position.set(0.9, 1.36, 0.58);
    world.add(ambL);
    for (const y of [1.48, 1.36, 1.24]) {
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.06, 0.02, 16),
        matteBlack(0x171717),
      );
      shade.position.set(0.9, y + 0.05, 0.58);
      world.add(shade);
    }
    const greenL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.09, 16),
      plastic(0x365314, 0.5),
    );
    greenL.position.set(0.9, 1.24, 0.58);
    world.add(greenL);

    type UrdfRobot = THREE.Object3D & {
      setJointValue: (n: string, v: number) => void;
      getObjectByName: (n: string) => THREE.Object3D | undefined;
    };
    let robot: UrdfRobot | null = null;
    const robotRoot = new THREE.Group();
    robotRoot.position.set(0, 0.47, 0);
    robotRoot.rotation.x = -Math.PI / 2;
    world.add(robotRoot);

    let disposed = false;
    let raf = 0;
    let lastFit = -1;

    const doFit = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 400;
      camera.aspect = w / Math.max(h, 1);
      fitCameraToObject(camera, controls, world, camera.aspect, 1.05);
    };

    const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
    const urdfUrl = `${base}robots/ur5e/ur5e.urdf`;
    const loader = new URDFLoader();
    loader.workingPath = `${base}robots/ur5e/`;
    loader.load(
      urdfUrl,
      (result) => {
        if (disposed) return;
        setLoadError(null);
        robot = result as UrdfRobot;
        result.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh || !mesh.material) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of mats) {
            const sm = mat as THREE.MeshStandardMaterial;
            sm.side = THREE.DoubleSide;
            if ("metalness" in sm) {
              sm.metalness = Math.max(sm.metalness ?? 0.35, 0.4);
              sm.roughness = Math.min(sm.roughness ?? 0.45, 0.42);
            }
            sm.needsUpdate = true;
          }
        });
        const gripper = buildTwoJawGripper();
        const tool =
          result.getObjectByName("tool0") ||
          result.getObjectByName("flange") ||
          result.getObjectByName("wrist_3_link");
        if (tool) tool.add(gripper);
        else {
          gripper.position.set(0, 0, 0.9);
          result.add(gripper);
        }
        enableShadows(gripper);
        robotRoot.add(result);
        requestAnimationFrame(() => {
          if (!disposed) doFit();
        });
      },
      undefined,
      (err) => {
        if (disposed) return;
        const detail =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : err && typeof err === "object" && "message" in err
                ? String((err as { message: unknown }).message)
                : String(err ?? "unknown error");
        setLoadError(`Could not load UR5e model: ${detail}`);
      },
    );

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
      const rad = s.q.map((d) => (d * Math.PI) / 180);
      if (robot) {
        for (let i = 0; i < JOINT_NAMES.length; i++) {
          robot.setJointValue(JOINT_NAMES[i]!, rad[i] ?? 0);
        }
        robot.updateMatrixWorld(true);
      }

      if (s.gripped) {
        part.visible = true;
        // Prefer live tool0: jaws sit ~0.10 m along tool +Z (tool-down → nest/fixture).
        let wx = s.tip.x;
        let wy = s.tip.y - 0.1;
        let wz = s.tip.z;
        if (robot) {
          const tool =
            robot.getObjectByName("tool0") ||
            robot.getObjectByName("wrist_3_link") ||
            robot.getObjectByName("flange");
          if (tool) {
            const jaw = new THREE.Vector3(0, 0, 0.1);
            tool.localToWorld(jaw);
            wx = jaw.x;
            wy = jaw.y;
            wz = jaw.z;
          }
        }
        part.position.set(wx, wy, wz);
      } else if (s.partAtPlace) {
        part.visible = false;
        placed.visible = true;
        placed.position.set(-0.4, 0.54, -0.2);
      } else {
        part.visible = s.partVisible;
        part.position.set(0.45, 0.54, 0.25);
        placed.visible = false;
      }

      (redL.material as THREE.Material).dispose();
      redL.material = alarmRed(es);
      (ambL.material as THREE.Material).dispose();
      ambL.material = warnAmber(!es && s.phase !== "idle");

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
  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full touch-none" />
      {loadError ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 px-2 text-center text-xs text-amber-300/90">
          {loadError}
        </div>
      ) : null}
    </div>
  );
}
