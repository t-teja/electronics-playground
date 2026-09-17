import { useEffect, useMemo, useRef, useState } from "react";
import { LinearControl, Meter, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import { ARM_LINKS, clampJoint, deg, fk, ik, type Vec3 } from "@/lib/robot-arm-ik";
import * as THREE from "three";

function ArmViewport({
  q,
  target,
  singularity,
}: {
  q: number[];
  target: Vec3;
  singularity: boolean;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef({ q, target, singularity });
  state.current = { q, target, singularity };

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 20);
    camera.position.set(1.6, 1.1, 1.6);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    el.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xb0c4ff, 0x1a1a1a, 1.1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(2, 3, 1);
    scene.add(dir);

    const grid = new THREE.GridHelper(3, 12, 0x2a3a55, 0x1a2740);
    scene.add(grid);

    const matLink = new THREE.MeshStandardMaterial({ color: 0x3d8a55, metalness: 0.35, roughness: 0.45 });
    const matJoint = new THREE.MeshStandardMaterial({ color: 0x5eead4, metalness: 0.2, roughness: 0.4 });
    const matTip = new THREE.MeshStandardMaterial({ color: 0xd9773a, metalness: 0.3, roughness: 0.4 });
    const matTgt = new THREE.MeshStandardMaterial({ color: 0x3b6ea8, metalness: 0.2, roughness: 0.5 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.08, 24), matJoint);
    base.position.y = 0.04;
    scene.add(base);

    const links: THREE.Mesh[] = [];
    const joints: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const j = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), matJoint);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 12), matLink);
      scene.add(j);
      scene.add(l);
      joints.push(j);
      links.push(l);
    }
    const tipMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08), matTip);
    scene.add(tipMesh);
    const tgtMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), matTgt);
    scene.add(tgtMesh);

    const setLink = (mesh: THREE.Mesh, a: Vec3, b: Vec3) => {
      const pa = new THREE.Vector3(a.x, a.z, a.y);
      const pb = new THREE.Vector3(b.x, b.z, b.y);
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      const dirV = pb.clone().sub(pa);
      const len = dirV.length();
      mesh.position.copy(mid);
      mesh.scale.set(1, Math.max(0.01, len), 1);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirV.clone().normalize());
    };

    let raf = 0;
    const resize = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const tick = () => {
      const { q: qq, target: tgt, singularity: sing } = state.current;
      const pose = fk(qq);
      const pts = [
        { x: 0, y: 0, z: 0 },
        pose.joints[0]!,
        pose.joints[1]!,
        pose.joints[2]!,
        pose.tip,
      ];
      for (let i = 0; i < 4; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        joints[i]!.position.set(a.x, a.z, a.y);
        setLink(links[i]!, a, b);
      }
      tipMesh.position.set(pose.tip.x, pose.tip.z, pose.tip.y);
      tgtMesh.position.set(tgt.x, tgt.z, tgt.y);
      (matTip.color as THREE.Color).set(sing ? 0xc0453c : 0xd9773a);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      matLink.dispose();
      matJoint.dispose();
      matTip.dispose();
      matTgt.dispose();
    };
  }, []);

  return <div ref={mount} className="h-full w-full" />;
}

export function RobotArm6dofLab() {
  const lab = LAB_BY_SLUG["robot-arm-6dof"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [cartMode, setCartMode] = useState(false);
  const [q1, setQ1] = useState(30);
  const [q2, setQ2] = useState(25);
  const [q3, setQ3] = useState(-40);
  const [q4, setQ4] = useState(0);
  const [q5, setQ5] = useState(20);
  const [q6, setQ6] = useState(0);
  const [tx, setTx] = useState(0.55);
  const [ty, setTy] = useState(0.15);
  const [tz, setTz] = useState(0.35);

  const jointQ = useMemo(
    () =>
      [q1, q2, q3, q4, q5, q6].map((d, i) => clampJoint(i, (d * Math.PI) / 180)),
    [q1, q2, q3, q4, q5, q6],
  );

  const target = useMemo(() => ({ x: tx, y: ty, z: tz }), [tx, ty, tz]);

  const solved = useMemo(() => {
    if (!cartMode) {
      const pose = fk(jointQ);
      return {
        q: jointQ,
        tip: pose.tip,
        message: "Joint-space control.",
        singularity: false,
        ok: true,
      };
    }
    const r = ik(target, jointQ);
    const pose = fk(r.q);
    return {
      q: r.q,
      tip: pose.tip,
      message: r.message,
      singularity: r.singularity,
      ok: r.ok,
    };
  }, [cartMode, jointQ, target]);

  const insight = useMemo(() => {
    if (solved.singularity) {
      return `${solved.message} Near a singularity the Jacobian loses rank — wrist axes align or the arm stretches. Ease the target inward or change the wrist.`;
    }
    if (cartMode && !solved.ok) {
      return solved.message;
    }
    if (cartMode) {
      return `Cartesian IK. Wrist center from the target, then elbow-up analytical solution for a spherical wrist. Tip at (${solved.tip.x.toFixed(2)}, ${solved.tip.y.toFixed(2)}, ${solved.tip.z.toFixed(2)}) m.`;
    }
    return `Joint space. Forward kinematics maps q1..q6 through links a2=${ARM_LINKS.a2} m and a3=${ARM_LINKS.a3} m. Tip at (${solved.tip.x.toFixed(2)}, ${solved.tip.y.toFixed(2)}, ${solved.tip.z.toFixed(2)}) m.`;
  }, [solved, cartMode]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Mode" value={cartMode ? "Cartesian" : "Joint"} />
          <Meter
            label="Tip"
            value={`${solved.tip.x.toFixed(2)}, ${solved.tip.y.toFixed(2)}, ${solved.tip.z.toFixed(2)} m`}
          />
          <Meter label="Status" value={solved.singularity ? "singularity" : solved.ok ? "ok" : "fail"} />
        </>
      }
      controls={
        <>
          <ToggleControl
            label="Cartesian target"
            checked={cartMode}
            on="IK"
            off="joints"
            onCheckedChange={setCartMode}
          />
          {!cartMode ? (
            <>
              <LinearControl label="q1 base" value={q1} display={`${q1.toFixed(0)} deg`} min={-180} max={180} step={1} onChange={setQ1} />
              <LinearControl label="q2 shoulder" value={q2} display={`${q2.toFixed(0)} deg`} min={-90} max={90} step={1} onChange={setQ2} />
              <LinearControl label="q3 elbow" value={q3} display={`${q3.toFixed(0)} deg`} min={-150} max={150} step={1} onChange={setQ3} />
              <LinearControl label="q4 wrist" value={q4} display={`${q4.toFixed(0)} deg`} min={-180} max={180} step={1} onChange={setQ4} />
              <LinearControl label="q5 bend" value={q5} display={`${q5.toFixed(0)} deg`} min={-90} max={90} step={1} onChange={setQ5} />
              <LinearControl label="q6 roll" value={q6} display={`${q6.toFixed(0)} deg`} min={-180} max={180} step={1} onChange={setQ6} />
            </>
          ) : (
            <>
              <LinearControl label="Target X" value={tx} display={`${tx.toFixed(2)} m`} min={0.1} max={0.95} step={0.01} onChange={setTx} />
              <LinearControl label="Target Y" value={ty} display={`${ty.toFixed(2)} m`} min={-0.7} max={0.7} step={0.01} onChange={setTy} />
              <LinearControl label="Target Z" value={tz} display={`${tz.toFixed(2)} m`} min={0.05} max={0.9} step={0.01} onChange={setTz} />
            </>
          )}
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <p className="font-mono text-xs text-subtle">
            {"q = ["}
            {solved.q.map((v) => deg(v).toFixed(0)).join(", ")}
            {"] deg"}
          </p>
          <p className="text-xs text-subtle">
            Local ROS2 visualization path is in docs/ros2-robot-arm.md (joint_states / tf / Foxglove).
          </p>
        </>
      }
      canvas={<ArmViewport q={solved.q} target={target} singularity={solved.singularity} />}
    />
  );
}
