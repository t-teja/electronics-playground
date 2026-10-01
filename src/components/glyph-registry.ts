import { GLYPHS as BASE } from "@/components/glyphs";
import {
  GlyphSplitPhase,
  GlyphInduction,
  GlyphPmsm,
  GlyphBldc,
  GlyphServo,
  GlyphPid,
  GlyphStepper,
  GlyphRobotArm,
  GlyphPmosfet,
} from "@/components/motor-glyphs";
import {
  GlyphBottling,
  GlyphPickPlace,
  GlyphAgv,
  GlyphSorter,
  GlyphScara,
} from "@/components/factory-glyphs";

export const GLYPHS = {
  ...BASE,
  "split-phase-motor": GlyphSplitPhase,
  "induction-motor": GlyphInduction,
  pmsm: GlyphPmsm,
  bldc: GlyphBldc,
  servo: GlyphServo,
  stepper: GlyphStepper,
  "robot-arm-6dof": GlyphRobotArm,
  pid: GlyphPid,
  pmosfet: GlyphPmosfet,
  "bottling-line": GlyphBottling,
  "pick-and-place": GlyphPickPlace,
  "agv-line": GlyphAgv,
  "color-sorter": GlyphSorter,
  "scara-cell": GlyphScara,
  sorter: GlyphSorter,
  scara: GlyphScara,
} as const;
