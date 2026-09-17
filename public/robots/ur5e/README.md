# UR5e (vendored)

Browser-ready URDF + STL meshes for the Electronics Playground 6-DoF arm lab.

| Item | Value |
|------|--------|
| Model | Universal Robots UR5e |
| Source | [UniversalRobots/Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) (rolling) |
| License | **BSD-3-Clause** (see `LICENSE`) |
| Meshes | Collision STLs (ASCII) used as visuals — compact for GitHub Pages offline |
| Joints | `shoulder_pan_joint` … `wrist_3_joint` (same names as ros2_control) |

Kinematics match `config/ur5e/default_kinematics.yaml` from that package.
Visual mesh offsets match `config/ur5e/visual_parameters.yaml`.
