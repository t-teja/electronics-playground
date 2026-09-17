import { useEffect, useRef, useState } from "react";
import {
  JOINT_NAMES,
  type Vec3,
} from "@/lib/robot-arm-ik";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import URDFLoader from "urdf-loader";

/**
 * Fit OrbitControls to world AABB of `object`.
 * Robot root is already rotated ROS Z-up -> Three Y-up.
 * Call on URDF load, Fit view, and Reset -- never mid-orbit drag.
 */
export function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  aspect: number,
  pad = 1.45,
) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z, 0.2);
  const fov = (camera.fov * Math.PI) / 180;
  const fitH = maxDim / (2 * Math.tan(fov / 2));
  const fitW = fitH / Math.max(aspect, 0.25);
  const dist = pad * Math.max(fitH, fitW);
  const dir = new THREE.Vector3(0.9, 0.55, 0.9).normalize();
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.near = Math.max(0.01, dist / 120);
  camera.far = Math.max(40, dist * 25);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.minDistance = maxDim * 0.3;
  controls.maxDistance = dist * 8;
  controls.update();
}

export function ArmViewport({
  q,
  target,
  singularity,
  fitToken,
}: {
  q: number[];
  target: Vec3;
  singularity: boolean;
  fitToken: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const live = useRef({ q, target, singularity, fitToken });
  live.current = { q, target, singularity, fitToken };

  const [glError, setGlError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "default" });
    } catch {
      setGlError("WebGL unavailable in this browser. Joint meters still work.");
      return;
    }
    if (!renderer.getContext()) {
      setGlError("WebGL context failed. Joint meters still work.");
      renderer.dispose();
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
    camera.position.set(1.2, 0.9, 1.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.enablePan = true;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xb0c4ff, 0x1a1a1a, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2.5, 4, 1.5);
    scene.add(key);
    scene.add(new THREE.GridHelper(2.4, 12, 0x2a3a55, 0x1a2740));

    const tgtMat = new THREE.MeshStandardMaterial({
      color: 0x3b6ea8,
      metalness: 0.2,
      roughness: 0.5,
    });
    const tgtMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), tgtMat);
    scene.add(tgtMesh);

    const robotRoot = new THREE.Group();
    robotRoot.rotation.x = -Math.PI / 2;
    scene.add(robotRoot);

    type UrdfRobot = THREE.Object3D & {
      setJointValue: (name: string, value: number) => void;
    };
    let robot: UrdfRobot | null = null;
    let disposed = false;
    let raf = 0;
    let lastFit = -1;

    const applyJoints = (qq: number[]) => {
      if (!robot) return;
      for (let i = 0; i < JOINT_NAMES.length; i++) {
        robot.setJointValue(JOINT_NAMES[i]!, qq[i] ?? 0);
      }
      robot.updateMatrixWorld(true);
    };

    const doFit = () => {
      if (!robot) return;
      applyJoints(live.current.q);
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 360;
      camera.aspect = w / Math.max(h, 1);
      fitCameraToObject(camera, controls, robotRoot, camera.aspect, 1.45);
    };

    const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
    const urdfUrl = `${base}robots/ur5e/ur5e.urdf`;

    const loader = new URDFLoader();
    loader.load(
      urdfUrl,
      (result) => {
        if (disposed) return;
        robot = result as UrdfRobot;
        result.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh || !mesh.material) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of mats) {
            const sm = mat as THREE.MeshStandardMaterial;
            sm.side = THREE.DoubleSide;
            if ("metalness" in sm) {
              sm.metalness = 0.35;
              sm.roughness = 0.45;
            }
            sm.needsUpdate = true;
          }
        });
        robotRoot.add(result);
        applyJoints(live.current.q);
        requestAnimationFrame(() => {
          if (!disposed) doFit();
        });
      },
      undefined,
      () => {
        if (!disposed) setLoadError("Could not load arm model.");
      },
    );

    const resize = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 360;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const tick = () => {
      const { q: qq, target: tgt, singularity: sing, fitToken: ft } = live.current;
      applyJoints(qq);
      tgtMesh.position.set(tgt.x, tgt.z, -tgt.y);
      tgtMat.color.set(sing ? 0xc0453c : 0x3b6ea8);
      if (ft !== lastFit) {
        lastFit = ft;
        doFit();
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
      tgtMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, []);

  if (glError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0b1220] px-4 text-center text-sm text-muted">
        {glError}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full touch-none" />
      {loadError ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-amber-300/90">
          {loadError}
        </div>
      ) : null}
    </div>
  );
}
