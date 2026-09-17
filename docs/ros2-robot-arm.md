# Local ROS2 visualization for the 6-DoF arm

The browser lab runs analytical FK/IK in Three.js. To mirror the same joint vector on a local ROS2 desktop:

## Topics

- `/joint_states` (`sensor_msgs/JointState`) — names `q1`..`q6`, positions in radians
- `/tf` — publish `base_link` → `link1` … → `tool0` with `robot_state_publisher`, or a small Python broadcaster

## Suggested loop

1. Install ROS2 (Humble or Jazzy) and `ros-humble-joint-state-publisher-gui` (or Jazzy equivalents).
2. Export the lab's joint vector `[q1..q6]` (radians) from the meters line, or stream it over rosbridge.
3. Publish `JointState` at ~30 Hz. `robot_state_publisher` + a minimal URDF with the same link lengths (`d1=0.35`, `a2=0.55`, `a3=0.45`, `d6=0.12`) will produce TF.
4. Open Foxglove Studio (or RViz) with a TF panel and a 3D view. Point Foxglove at `ws://localhost:9090` if you use `rosbridge_server`.

## rosbridge sketch

```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

Then publish joint states from any client that speaks the rosbridge JSON protocol. Keep the lab as the kinematics teacher; ROS2 is for visualization only.
