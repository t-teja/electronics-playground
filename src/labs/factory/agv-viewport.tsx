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
  steel,
  warnAmber,
} from "./materials";
import type { AgvSnapshot } from "./agv-sim";

function buildDashedGuide(
  waypoints: { x: number; z: number; station?: boolean }[],
): THREE.Group {
  const g = new THREE.Group();
  // Magnetic strip (solid dark band under path)
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]!;
    const b = waypoints[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) continue;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.004, len),
      matteBlack(0x1c1917),
    );
    strip.position.set((a.x + b.x) / 2, 0.006, (a.z + b.z) / 2);
    strip.rotation.y = Math.atan2(dx, dz);
    g.add(strip);
    // Dashed yellow tape segments
    const segs = Math.max(2, Math.floor(len / 0.28));
    for (let s = 0; s < segs; s++) {
      if (s % 2 === 1) continue;
      const t0 = s / segs;
      const t1 = Math.min(1, (s + 0.55) / segs);
      const mx = a.x + dx * ((t0 + t1) / 2);
      const mz = a.z + dz * ((t0 + t1) / 2);
      const segLen = len * (t1 - t0);
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.005, segLen),
        safetyYellow(),
      );
      dash.position.set(mx, 0.01, mz);
      dash.rotation.y = Math.atan2(dx, dz);
      g.add(dash);
    }
  }
  return g;
}

function buildAgvBody(): {
  root: THREE.Group;
  amber: THREE.Mesh;
  red: THREE.Mesh;
  beacon: THREE.Mesh;
  wheels: THREE.Mesh[];
} {
  const root = new THREE.Group();

  // Beveled chassis: main + inset top + lower skirt
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.16, 1.0),
    machineBlue(0x1e3a8a),
  );
  chassis.position.y = 0.18;
  chassis.castShadow = true;
  root.add(chassis);
  const bevelTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.04, 0.94),
    machineBlue(0x1e40af),
  );
  bevelTop.position.y = 0.28;
  root.add(bevelTop);
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.04, 1.06),
    paintedSteel(0x1e293b, 0.4, 0.5),
  );
  skirt.position.y = 0.1;
  root.add(skirt);

  // Safety bumper strip (front + rear)
  for (const z of [0.52, -0.52]) {
    const bump = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.07, 0.05),
      safetyYellow(),
    );
    bump.position.set(0, 0.14, z);
    root.add(bump);
  }
  // Side bumpers
  for (const x of [-0.38, 0.38]) {
    const side = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.06, 0.85),
      safetyYellow(),
    );
    side.position.set(x, 0.14, 0);
    root.add(side);
  }

  // Payload deck with corner brackets + straps
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.04, 0.78),
    steel(0x94a3b8, 0.72, 0.32),
  );
  deck.position.y = 0.34;
  deck.castShadow = true;
  root.add(deck);
  for (const [cx, cz] of [
    [-0.26, -0.35],
    [0.26, -0.35],
    [-0.26, 0.35],
    [0.26, 0.35],
  ] as const) {
    const corner = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.035, 0.06),
      brushedAluminum(),
    );
    corner.position.set(cx, 0.38, cz);
    root.add(corner);
  }
  for (const z of [-0.12, 0.12]) {
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.008, 0.03),
      rubber(0x44403c),
    );
    strap.position.set(0, 0.365, z);
    root.add(strap);
  }

  // Drive wheels (rear pair larger) + front casters
  const wheels: THREE.Mesh[] = [];
  for (const [sx, sz] of [
    [-0.3, -0.28],
    [0.3, -0.28],
  ] as const) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 20), rubber());
    wh.rotation.z = Math.PI / 2;
    wh.position.set(sx, 0.11, sz);
    wh.castShadow = true;
    root.add(wh);
    wheels.push(wh);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.075, 12),
      brushedAluminum(),
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.set(sx, 0.11, sz);
    root.add(hub);
  }
  for (const [sx, sz] of [
    [-0.28, 0.32],
    [0.28, 0.32],
  ] as const) {
    const caster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14),
      rubber(0x1c1917),
    );
    caster.rotation.z = Math.PI / 2;
    caster.position.set(sx, 0.06, sz);
    root.add(caster);
    const fork = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.05, 0.06),
      paintedSteel(0x52525b),
    );
    fork.position.set(sx, 0.09, sz);
    root.add(fork);
  }

  // Lidar dome
  const lidarBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.025, 20),
    matteBlack(),
  );
  lidarBase.position.set(0, 0.38, 0.28);
  root.add(lidarBase);
  const lidar = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    plastic(0xe2e8f0, 0.35),
  );
  lidar.position.set(0, 0.392, 0.28);
  root.add(lidar);
  const lidarRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.048, 0.006, 8, 20),
    emissiveAccent(0.5),
  );
  lidarRing.rotation.x = Math.PI / 2;
  lidarRing.position.set(0, 0.4, 0.28);
  root.add(lidarRing);

  // Status light bar across rear
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.035, 0.04),
    matteBlack(),
  );
  bar.position.set(0, 0.4, -0.42);
  root.add(bar);
  const amber = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.025, 0.03),
    warnAmber(false),
  );
  amber.position.set(-0.12, 0.4, -0.42);
  root.add(amber);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.03), alarmRed(false));
  red.position.set(0.12, 0.4, -0.42);
  root.add(red);
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.06, 14),
    emissiveAccent(0.4),
  );
  beacon.position.set(0, 0.42, 0.05);
  root.add(beacon);

  // Side markers
  for (const x of [-0.37, 0.37]) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.04, 0.08),
      emissiveAccent(0.6),
    );
    marker.position.set(x, 0.22, 0.4);
    root.add(marker);
  }

  return { root, amber, red, beacon, wheels };
}

function buildChargingDock(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.025, 1.1),
    paintedSteel(0x1e293b, 0.35, 0.55),
  );
  pad.position.y = 0.012;
  g.add(pad);
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.85, 0.18),
    paintedSteel(0x334155),
  );
  post.position.set(0, 0.42, -0.55);
  post.castShadow = true;
  g.add(post);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.2, 0.12),
    machineBlue(0x1e3a8a),
  );
  head.position.set(0, 0.75, -0.45);
  g.add(head);
  const contact = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.04, 0.06),
    brushedAluminum(0xd4d4d8),
  );
  contact.position.set(0, 0.2, -0.35);
  g.add(contact);
  const light = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.04, 12),
    emissiveAccent(0.8),
  );
  light.position.set(0, 0.9, -0.55);
  g.add(light);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.02), safetyYellow());
  stripe.position.set(0, 0.5, -0.46);
  g.add(stripe);
  return g;
}

function buildStationPost(x: number, z: number, label: string): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 1.1, 12),
    paintedSteel(0x52525b),
  );
  pole.position.y = 0.55;
  pole.castShadow = true;
  g.add(pole);
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.14, 0.03),
    paintedSteel(0x111827),
  );
  sign.position.y = 1.15;
  g.add(sign);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = "#5eead4";
  ctx.font = "bold 36px IBM Plex Sans, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.11),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  face.position.set(0, 1.15, 0.02);
  g.add(face);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.04, 12),
    paintedSteel(0x3f3f46),
  );
  base.position.y = 0.02;
  g.add(base);
  return g;
}

export function AgvViewport({
  snap,
  eStop,
  fitToken,
  waypoints,
}: {
  snap: AgvSnapshot;
  eStop: boolean;
  fitToken: number;
  waypoints: { x: number; z: number; station?: boolean }[];
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
    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 60);
    camera.position.set(4, 5, 5);
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
    scene.add(makeFactoryFloor(20));

    const world = new THREE.Group();
    scene.add(world);

    world.add(buildDashedGuide(waypoints));

    // Soft accent path line
    const pts = waypoints.map((w) => new THREE.Vector3(w.x, 0.018, w.z));
    const pathGeom = new THREE.BufferGeometry().setFromPoints(pts);
    const pathLine = new THREE.Line(
      pathGeom,
      new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.25 }),
    );
    world.add(pathLine);

    let stationIdx = 0;
    for (const w of waypoints) {
      if (!w.station) continue;
      stationIdx += 1;
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.02, 28),
        paintedSteel(0x1e293b, 0.3, 0.6),
      );
      pad.position.set(w.x, 0.012, w.z);
      world.add(pad);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.015, 8, 28),
        emissiveAccent(0.55),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(w.x, 0.028, w.z);
      world.add(ring);
      // Waypoint chevron markers
      const mark = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.08, 4),
        safetyYellow(),
      );
      mark.rotation.x = Math.PI;
      mark.position.set(w.x, 0.06, w.z);
      world.add(mark);
      world.add(buildStationPost(w.x, w.z + 0.85, `ST-${stationIdx}`));
    }

    // Charging dock at first station
    const first = waypoints.find((w) => w.station) ?? waypoints[0]!;
    world.add(buildChargingDock(first.x, first.z - 0.15));

    const agv = buildAgvBody();
    world.add(agv.root);

    let disposed = false;
    let raf = 0;
    let lastFit = -1;
    let spin = 0;

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
      agv.root.position.set(s.x, 0, s.z);
      agv.root.rotation.y = s.yaw;
      spin += s.moving ? 0.2 : 0;
      for (const wh of agv.wheels) {
        wh.rotation.x = spin;
      }
      (agv.amber.material as THREE.Material).dispose();
      agv.amber.material = warnAmber(s.warning || s.moving);
      (agv.red.material as THREE.Material).dispose();
      agv.red.material = alarmRed(es);
      (agv.beacon.material as THREE.Material).dispose();
      agv.beacon.material = es ? paintedSteel(0x365314) : emissiveAccent(s.moving ? 1.4 : 0.35);
      agv.beacon.rotation.y = spin;

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
  }, [waypoints]);

  if (glError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted">{glError}</div>
    );
  }
  return <div ref={mountRef} className="h-full w-full touch-none" />;
}
