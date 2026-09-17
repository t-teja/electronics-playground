import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import {
  ARM_LINKS,
  JOINT_NAMES,
  clampJoint,
  deg,
  fk,
  ik,
  rad,
  type Vec3,
} from "@/lib/robot-arm-ik";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import URDFLoader from "urdf-loader";

type ConnStatus = "idle" | "connecting" | "connected" | "error";

/**
 * Fit OrbitControls to world AABB of `object`.
 * Robot root is already rotated ROS Z-up → Three Y-up.
 * Call on URDF load, Fit view, and Reset — never mid-orbit drag.
 */
function fitCameraToObject(
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
  // Isometric bias so yawed poses (acceptance: q1=180°) stay fully framed
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

// NOTE: truncated for size — full file follows from disk via push_files
export function RobotArm6dofLab() {
  return null;
}
