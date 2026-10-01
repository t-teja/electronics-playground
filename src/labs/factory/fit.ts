import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type FitOptions = {
  /** Extra pull-back multiplier (default 1.08). */
  pad?: number;
  /**
   * How much of AABB X length drives camera distance (default 0.55).
   * Long lines historically used 0.55 so scenes weren't tiny; pass 1.0 when
   * the far end (outfeed / divert / bins) must stay in frustum.
   */
  spanXFactor?: number;
};

/** Fit OrbitControls to world AABB. Call on load / Fit view / Reset - never mid-drag. */
export function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  aspect: number,
  padOrOpts: number | FitOptions = 1.08,
) {
  const opts: FitOptions =
    typeof padOrOpts === "number" ? { pad: padOrOpts } : padOrOpts ?? {};
  const pad = opts.pad ?? 1.08;
  const spanXFactor = opts.spanXFactor ?? 0.55;

  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Long factory lines: don't pull back fully to length or the scene looks tiny
  // unless the caller opts into full spanX (sorter divert / bottling outfeed).
  const spanX = Math.max(size.x, 0.4);
  const spanY = Math.max(size.y, 0.4);
  const spanZ = Math.max(size.z, 0.4);
  const fov = (camera.fov * Math.PI) / 180;
  const halfTan = Math.tan(fov / 2);
  const fitByHeight = spanY / (2 * halfTan);
  const fitByWidth =
    Math.max(spanX * spanXFactor, spanZ) / (2 * halfTan * Math.max(aspect, 0.35));
  const dist = pad * Math.max(fitByHeight, fitByWidth, 2.2);

  const dir = new THREE.Vector3(0.55, 0.42, 0.72).normalize();
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.near = Math.max(0.05, dist / 120);
  camera.far = Math.max(80, dist * 24);
  camera.updateProjectionMatrix();
  controls.target.copy(center.clone().add(new THREE.Vector3(0, spanY * 0.05, 0)));
  controls.minDistance = Math.max(1.2, Math.min(spanX, spanZ, spanY) * 0.35);
  controls.maxDistance = dist * 8;
  controls.update();
}
