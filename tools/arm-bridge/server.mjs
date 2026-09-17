#!/usr/bin/env node
/**
 * EP-Arm LAN bridge — WebSocket JSON + REST.
 * Default: http://0.0.0.0:9090  (WS upgrade on same port)
 *
 * WS messages (JSON):
 *   { "type": "hello", "role": "lab"|"controller" }
 *   { "type": "joint_command", "positions": [q1..q6] }  // rad → lab when Follow remote
 *   { "type": "joint_states", "names": [...], "positions": [...] } // lab → peers
 *
 * REST:
 *   GET  /health
 *   GET  /joints
 *   POST /joints   { "positions": [..] }
 *   GET  /fk?q=0,0,0,0,0,0
 *   POST /ik       { "x", "y", "z" }
 *
 * CORS open for GitHub Pages origin.
 */
import http from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 9090);
const HOST = process.env.HOST || "0.0.0.0";

/** @type {number[]} */
let joints = [0, -Math.PI / 2, Math.PI / 2, -Math.PI / 2, Math.PI / 2, 0];
const NAMES = [
  "shoulder_pan_joint",
  "shoulder_lift_joint",
  "elbow_joint",
  "wrist_1_joint",
  "wrist_2_joint",
  "wrist_3_joint",
];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function broadcast(wss, data, except) {
  const raw = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client !== except && client.readyState === 1) client.send(raw);
  }
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  try {
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, clients: wss.clients.size, joints }));
      return;
    }
    if (url.pathname === "/joints" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ names: NAMES, positions: joints }));
      return;
    }
    if (url.pathname === "/joints" && req.method === "POST") {
      const body = await readBody(req);
      if (!Array.isArray(body.positions) || body.positions.length < 6) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "positions[6] required (rad)" }));
        return;
      }
      joints = body.positions.slice(0, 6).map(Number);
      broadcast(wss, { type: "joint_command", positions: joints });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, positions: joints }));
      return;
    }
    if (url.pathname === "/fk") {
      // Tip estimate: planar reach proxy for bridge smoke tests (lab does real FK)
      const q = (url.searchParams.get("q") || "0,0,0,0,0,0").split(",").map(Number);
      const a2 = 0.425,
        a3 = 0.3922,
        d1 = 0.1625;
      const q1 = q[0] || 0,
        q2 = q[1] || 0,
        q3 = q[2] || 0;
      const r = a2 * Math.cos(q2) + a3 * Math.cos(q2 + q3);
      const z = d1 + a2 * Math.sin(q2) + a3 * Math.sin(q2 + q3);
      const tip = { x: r * Math.cos(q1), y: r * Math.sin(q1), z };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tip, q }));
      return;
    }
    if (url.pathname === "/ik" && req.method === "POST") {
      const body = await readBody(req);
      // Echo target; lab runs real IK. Bridge stores a rough joint guess for smoke tests.
      const x = Number(body.x) || 0.4;
      const y = Number(body.y) || 0;
      const z = Number(body.z) || 0.3;
      const q1 = Math.atan2(y, x);
      joints = [q1, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, Math.PI / 2, 0];
      broadcast(wss, { type: "joint_command", positions: joints });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, target: { x, y, z }, positions: joints }));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "joint_states", names: NAMES, positions: joints }));
  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(String(buf));
    } catch {
      return;
    }
    if (msg.type === "joint_states" && Array.isArray(msg.positions)) {
      joints = msg.positions.slice(0, 6).map(Number);
      broadcast(wss, { type: "joint_states", names: NAMES, positions: joints }, ws);
    } else if (msg.type === "joint_command" && Array.isArray(msg.positions)) {
      joints = msg.positions.slice(0, 6).map(Number);
      broadcast(wss, { type: "joint_command", positions: joints }, ws);
    } else if (msg.op === "publish" && msg.msg?.position) {
      joints = msg.msg.position.slice(0, 6).map(Number);
      broadcast(wss, { type: "joint_command", positions: joints }, ws);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`EP-Arm bridge http://${HOST}:${PORT}  (WS on same port)`);
  console.log(`Lab Bridge URL: ws://localhost:${PORT}`);
});
