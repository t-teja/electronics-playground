import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Lit industrial accent (teal). */
export const ACCENT = 0x5eead4;

export function steel(color = 0x9ca3af, metalness = 0.78, roughness = 0.28) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

export function paintedSteel(color = 0x4b5563, metalness = 0.45, roughness = 0.38) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

export function machineBlue(color = 0x1d4ed8) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.4 });
}

export function safetyYellow() {
  return new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.25, roughness: 0.45 });
}

export function rubber(color = 0x292524) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.85 });
}

export function plastic(color = 0xe7e5e4, roughness = 0.5) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.08, roughness });
}

export function brushedAluminum(color = 0xc0c8d0) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.88, roughness: 0.32 });
}

export function matteBlack(color = 0x1a1a1a) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.78 });
}

export function glassClear() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    metalness: 0,
    roughness: 0.05,
    transmission: 0.62,
    thickness: 0.03,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
  });
}

export function glassBottle() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xdbeafe,
    metalness: 0.02,
    roughness: 0.04,
    transmission: 0.7,
    thickness: 0.018,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    clearcoat: 0.4,
    clearcoatRoughness: 0.1,
  });
}

export function liquid(color = 0x0284c7) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.08,
    roughness: 0.22,
    transparent: true,
    opacity: 0.92,
    emissive: color,
    emissiveIntensity: 0.15,
  });
}

export function emissiveAccent(intensity = 1.2) {
  return new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: intensity,
    metalness: 0.2,
    roughness: 0.4,
  });
}

export function warnAmber(on: boolean) {
  return new THREE.MeshStandardMaterial({
    color: on ? 0xf59e0b : 0x57534e,
    emissive: on ? 0xf59e0b : 0x000000,
    emissiveIntensity: on ? 1.5 : 0,
    metalness: 0.3,
    roughness: 0.4,
  });
}

export function alarmRed(on: boolean) {
  return new THREE.MeshStandardMaterial({
    color: on ? 0xef4444 : 0x57534e,
    emissive: on ? 0xef4444 : 0x000000,
    emissiveIntensity: on ? 1.7 : 0,
    metalness: 0.3,
    roughness: 0.4,
  });
}

export function enableShadows(obj: THREE.Object3D, cast = true, receive = true) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = cast;
    m.receiveShadow = receive;
  });
}

/** Concrete factory floor with subtle grid wear. */
export function makeFactoryFloor(size = 24): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#5c6570";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#6b7380";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 12; i++) {
    const p = (i / 12) * 512;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 22, 3 + Math.random() * 10);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(size / 4, size / 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xb8c0cc,
    metalness: 0.04,
    roughness: 0.88,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function addFactoryLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xeef2ff, 0x3f3f46, 0.95));
  const key = new THREE.DirectionalLight(0xfffaf0, 1.85);
  key.position.set(5, 14, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 45;
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -14;
  key.shadow.bias = -0.00015;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcbd5e1, 0.7);
  fill.position.set(-7, 8, -4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x93c5fd, 0.45);
  rim.position.set(2, 4, -8);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xfde68a, 0.28);
  rim2.position.set(-3, 3.5, 7);
  scene.add(rim2);
  const accent = new THREE.PointLight(ACCENT, 0.9, 22, 2);
  accent.position.set(4, 3.5, 1.5);
  scene.add(accent);
  const bay1 = new THREE.PointLight(0xfff1c1, 0.65, 16, 2);
  bay1.position.set(2, 4.2, 0.5);
  scene.add(bay1);
  const bay2 = new THREE.PointLight(0xfff1c1, 0.55, 16, 2);
  bay2.position.set(7, 4.2, 0.5);
  scene.add(bay2);
  return { key, fill, accent };
}

export function stationSign(label: string, width = 0.7): THREE.Group {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.18, 0.03),
    paintedSteel(0x111827, 0.35, 0.45),
  );
  g.add(plate);
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 384, 96);
  ctx.fillStyle = "#5eead4";
  ctx.font = "bold 42px IBM Plex Sans, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 192, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.92, 0.14),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  face.position.z = 0.018;
  g.add(face);
  return g;
}

/** Thin cooling fins on a drive/motor box. */
export function addCoolingFins(parent: THREE.Object3D, x: number, y: number, z: number, count = 6) {
  for (let i = 0; i < count; i++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.12, 0.1),
      brushedAluminum(0xa8b0bc),
    );
    fin.position.set(x, y, z + (i - (count - 1) / 2) * 0.022);
    parent.add(fin);
  }
}

let sharedEnvMap: THREE.Texture | null = null;

/**
 * Shared PMREM RoomEnvironment for industrial metal reflections.
 * Call once per viewport after creating the renderer; assigns scene.environment.
 */
export function applyFactoryEnvMap(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
): THREE.Texture {
  if (!sharedEnvMap) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    sharedEnvMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  scene.environment = sharedEnvMap;
  scene.environmentIntensity = 0.85;
  return sharedEnvMap;
}

export function physicalSteel(color = 0x9ca3af, metalness = 0.82, roughness = 0.22) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness,
    roughness,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
    envMapIntensity: 1.1,
  });
}

export function physicalPaint(color = 0x1e40af, metalness = 0.4, roughness = 0.35) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness,
    roughness,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.95,
  });
}
