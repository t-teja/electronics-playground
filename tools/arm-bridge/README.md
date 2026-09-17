# EP-Arm local bridge

LAN bridge for the 6-DoF arm lab (WebSocket JSON + REST). No Foxglove required.

## Run (Node)

```bash
cd tools/arm-bridge
npm install
npm start
```

Bridge URL in the lab: `ws://localhost:9090` (or `ws://<lan-ip>:9090`).

## Run (Docker)

```bash
cd tools/arm-bridge
docker compose up
```

## Try REST

```bash
curl -s http://localhost:9090/health
curl -s -X POST http://localhost:9090/joints \
  -H 'content-type: application/json' \
  -d '{"positions":[3.14,0.44,-0.7,0,0.35,0]}'
```

Enable **Follow remote** in the lab to apply `joint_command` / POST `/joints`.
