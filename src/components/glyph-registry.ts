import { GLYPHS as BASE } from "@/components/glyphs";
import {
  GlyphSplitPhase,
  GlyphInduction,
  GlyphPmsm,
  GlyphBldc,
  GlyphServo,
  GlyphPid,
} from "@/components/motor-glyphs";

export const GLYPHS = {
  ...BASE,
  "split-phase-motor": GlyphSplitPhase,
  "induction-motor": GlyphInduction,
  pmsm: GlyphPmsm,
  bldc: GlyphBldc,
  servo: GlyphServo,
  pid: GlyphPid,
} as const;
