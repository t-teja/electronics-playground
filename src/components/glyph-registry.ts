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
} from "@/components/motor-glyphs";

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
} as const;
