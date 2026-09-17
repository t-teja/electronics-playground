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
import { ArmViewport } from "./robot-arm-viewport";

type ConnStatus = "idle" | "connecting" | "connected" | "error";

export function RobotArm6dofLab() {
  const lab = LAB_BY_SLUG["robot-arm-6dof"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  // Home pose: upright teaching stance (framed on load).
  // Acceptance fail pose [180,25,-40,0,20,0] recovers via Fit view.
  const [cartMode, setCartMode] = useState(false);
  const [q1, setQ1] = useState(0);
  const [q2, setQ2] = useState(-70);
  const [q3, setQ3] = useState(90);
  const [q4, setQ4] = useState(-90);
  const [q5, setQ5] = useState(90);
  const [q6, setQ6] = useState(0);
  const [tx, setTx] = useState(0.4);
  const [ty, setTy] = useState(0.15);
  const [tz, setTz] = useState(0.35);
  const [fitToken, setFitToken] = useState(0);

  const [bridgeUrl, setBridgeUrl] = useState("ws://localhost:9090");
  const [conn, setConn] = useState<ConnStatus>("idle");
  const [followRemote, setFollowRemote] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const jointQ = useMemo(
    () => [q1, q2, q3, q4, q5, q6].map((d, i) => clampJoint(i, rad(d))),
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

  const applyRemoteJoints = useCallback((positions: number[]) => {
    if (positions.length < 6) return;
    setQ1(deg(clampJoint(0, positions[0]!)));
    setQ2(deg(clampJoint(1, positions[1]!)));
    setQ3(deg(clampJoint(2, positions[2]!)));
    setQ4(deg(clampJoint(3, positions[3]!)));
    setQ5(deg(clampJoint(4, positions[4]!)));
    setQ6(deg(clampJoint(5, positions[5]!)));
    setCartMode(false);
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConn("idle");
  }, []);

  const connect = useCallback(() => {
    disconnect();
    setConn("connecting");
    try {
      const ws = new WebSocket(bridgeUrl.trim());
      wsRef.current = ws;
      ws.onopen = () => {
        setConn("connected");
        ws.send(JSON.stringify({ type: "hello", role: "lab" }));
      };
      ws.onerror = () => setConn("error");
      ws.onclose = () => {
        setConn((s) => (s === "connecting" ? "error" : "idle"));
        wsRef.current = null;
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type?: string;
            op?: string;
            positions?: number[];
            msg?: { position?: number[] };
          };
          if (!followRemote) return;
          if (
            (msg.type === "joint_command" || msg.type === "joint_states") &&
            Array.isArray(msg.positions)
          ) {
            applyRemoteJoints(msg.positions);
          } else if (msg.op === "publish" && msg.msg?.position) {
            applyRemoteJoints(msg.msg.position);
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      setConn("error");
    }
  }, [bridgeUrl, disconnect, followRemote, applyRemoteJoints]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || followRemote) return;
    ws.send(
      JSON.stringify({
        type: "joint_states",
        names: [...JOINT_NAMES],
        positions: solved.q,
      }),
    );
  }, [solved.q, followRemote, conn]);

  const insight = useMemo(() => {
    if (solved.singularity) {
      return `${solved.message} Near a singularity the Jacobian loses rank — ease the target or change the wrist.`;
    }
    if (cartMode && !solved.ok) return solved.message;
    if (cartMode) {
      return `Cartesian IK. Spherical-wrist seed, then a short polish so the tip matches the URDF. Tip at (${solved.tip.x.toFixed(2)}, ${solved.tip.y.toFixed(2)}, ${solved.tip.z.toFixed(2)}) m.`;
    }
    return `Joint space. URDF EP-Arm-6 (a2=${ARM_LINKS.a2} m, a3=${ARM_LINKS.a3} m). Tip at (${solved.tip.x.toFixed(2)}, ${solved.tip.y.toFixed(2)}, ${solved.tip.z.toFixed(2)}) m.`;
  }, [solved, cartMode]);

  const connLabel =
    conn === "connected"
      ? "connected"
      : conn === "connecting"
        ? "connecting…"
        : conn === "error"
          ? "error"
          : "offline";

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
          <Meter label="Bridge" value={connLabel} />
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
              <LinearControl label="q2 shoulder" value={q2} display={`${q2.toFixed(0)} deg`} min={-180} max={180} step={1} onChange={setQ2} />
              <LinearControl label="q3 elbow" value={q3} display={`${q3.toFixed(0)} deg`} min={-180} max={180} step={1} onChange={setQ3} />
              <LinearControl label="q4 wrist" value={q4} display={`${q4.toFixed(0)} deg`} min={-180} max={180} step={1} onChange={setQ4} />
              <LinearControl label="q5 bend" value={q5} display={`${q5.toFixed(0)} deg`} min={-180} max={180} step={1} onChange={setQ5} />
              <LinearControl label="q6 roll" value={q6} display={`${q6.toFixed(0)} deg`} min={-180} max={180} step={1} onChange={setQ6} />
            </>
          ) : (
            <>
              <LinearControl label="Target X" value={tx} display={`${tx.toFixed(2)} m`} min={-0.8} max={0.8} step={0.01} onChange={setTx} />
              <LinearControl label="Target Y" value={ty} display={`${ty.toFixed(2)} m`} min={-0.8} max={0.8} step={0.01} onChange={setTy} />
              <LinearControl label="Target Z" value={tz} display={`${tz.toFixed(2)} m`} min={0} max={0.9} step={0.01} onChange={setTz} />
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-raised px-3 py-1.5 text-xs font-medium text-fg shadow-[var(--shadow-border)] hover:bg-raised/80"
              onClick={() => setFitToken((n) => n + 1)}
            >
              Fit view
            </button>
            <button
              type="button"
              className="rounded-lg bg-raised px-3 py-1.5 text-xs font-medium text-fg shadow-[var(--shadow-border)] hover:bg-raised/80"
              onClick={() => {
                setQ1(0);
                setQ2(-70);
                setQ3(90);
                setQ4(-90);
                setQ5(90);
                setQ6(0);
                setCartMode(false);
                setFitToken((n) => n + 1);
              }}
            >
              Reset pose
            </button>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-sim/40 p-3">
            <label className="text-[10px] font-medium tracking-[0.14em] text-subtle uppercase">
              Bridge URL
            </label>
            <input
              className="w-full rounded-md border border-line bg-bg px-2 py-1.5 font-mono text-xs text-fg"
              value={bridgeUrl}
              onChange={(e) => setBridgeUrl(e.target.value)}
              spellCheck={false}
              aria-label="Bridge URL"
            />
            <div className="flex flex-wrap gap-2">
              {conn === "connected" ? (
                <button
                  type="button"
                  className="rounded-lg bg-raised px-3 py-1.5 text-xs font-medium"
                  onClick={disconnect}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-lg bg-electron/20 px-3 py-1.5 text-xs font-medium text-electron"
                  onClick={connect}
                >
                  Connect
                </button>
              )}
            </div>
            <ToggleControl
              label="Follow remote"
              checked={followRemote}
              on="on"
              off="off"
              onCheckedChange={setFollowRemote}
            />
          </div>
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
            Drag to orbit, scroll to zoom, right-drag or two-finger to pan. Fit view frames the whole
            arm. Local bridge: docs/ros2-robot-arm.md.
          </p>
        </>
      }
      canvas={
        <ArmViewport q={solved.q} target={target} singularity={solved.singularity} fitToken={fitToken} />
      }
    />
  );
}
