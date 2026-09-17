# Local bridge for the 6-DoF arm

The browser lab loads a bundled MIT URDF (EP-Arm-6) and runs FK/IK in-page.
To drive the same joints from your LAN, run the local bridge — no cloud viewer required.

## Quick start

```bash
cd tools/arm-bridge
npm install
npm start
```

In the lab, set **Bridge URL** to `ws://localhost:9090` (or `ws://<your-lan-ip>:9090`), click **Connect**, and optionally enable **Follow remote**.

Docker:

```bash
cd tools/arm-bridge
docker compose up
```

## Protocol

WebSocket JSON (same port as HTTP):

| Message | Direction | Purpose |
|--------|-----------|---------|
| `joint_command` `{ positions: number[6] }` | controller → lab | Set joints (rad) when Follow remote is on |
| `joint_states` `{ names, positions }` | lab ↔ peers | Current joint vector |

REST:

- `GET /health`
- `GET /joints` / `POST /joints` `{ "positions": [q1..q6] }`
- `GET /fk?q=...` (smoke-test tip estimate)
- `POST /ik` `{ "x","y","z" }` (broadcasts a joint guess; lab does real IK)

CORS is open so the GitHub Pages origin can call the bridge.

## rosbridge (optional)

If you already run ROS 2 + `rosbridge_websocket` on port 9090, point the lab at that URL instead.
Topic names may differ; the Node bridge above is the supported path for this lab.

## URDF

Bundled at `public/robots/ep-arm-6/` (MIT). Lengths match `src/lib/robot-arm-ik.ts`.
