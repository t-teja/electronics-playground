import { NEURAL_CATEGORY, NEURAL_LABS } from "./neural-labs";
import { ELECTROMECHANICAL_BLURB, MOTOR_LABS } from "./motor-labs";
import { CONTROL_LABS } from "./control-labs";
import { CATALOG_CHUNK_A } from "./catalog-chunk-a";
import { CATALOG_CHUNK_B } from "./catalog-chunk-b";
import { CATALOG_AFTER_MOTORS } from "./catalog-after-motors";

export type Category =
  | "passive"
  | "semiconductor"
  | "digital"
  | "protocol"
  | "electromechanical"
  | "sensor"
  | "computer"
  | "neural";

export type LabBadge = "new" | "updated";

export type LabMeta = {
  slug: string;
  name: string;
  symbol: string;
  category: Category;
  tagline: string;
  summary: string;
  principle: string;
  formula: string;
  uses: string[];
  badge?: LabBadge;
};

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  {
    id: "passive",
    label: "Passive",
    blurb: "Energy is resisted, stored in electric fields, or stored in magnetic fields.",
  },
  {
    id: "semiconductor",
    label: "Semiconductor",
    blurb: "Junctions that let you steer, emit, and amplify charge.",
  },
  {
    id: "digital",
    label: "Digital",
    blurb: "Thresholds become bits, bits become clocks, clocks become programs.",
  },
  {
    id: "protocol",
    label: "Buses",
    blurb: "How chips talk: clocks, addresses, packets, and who owns the wire.",
  },
  {
    id: "electromechanical",
    label: "Electromechanical",
    blurb: ELECTROMECHANICAL_BLURB,
  },
  {
    id: "sensor",
    label: "Sensors",
    blurb: "Light, distance, and motion turned into voltage.",
  },
  {
    id: "computer",
    label: "Computers",
    blurb: "Memory that keeps bits, and processors that walk through them.",
  },
  NEURAL_CATEGORY,
];

export const LABS: LabMeta[] = [
  ...CATALOG_CHUNK_A,
  ...CATALOG_CHUNK_B,
  ...MOTOR_LABS,
  ...CATALOG_AFTER_MOTORS,
  ...CONTROL_LABS,
  ...NEURAL_LABS,
];

export const LAB_BY_SLUG = Object.fromEntries(LABS.map((l) => [l.slug, l])) as Record<
  string,
  LabMeta
>;

export function labsIn(category: Category) {
  return LABS.filter((l) => l.category === category);
}
