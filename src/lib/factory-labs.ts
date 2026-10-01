import type { LabMeta } from "./catalog";

export const FACTORY_CATEGORY = {
  id: "factory" as const,
  label: "Factory",
  blurb: "Full-page 3D lines: conveyors, arms, AGVs, and cells you can orbit and drive.",
};

export const FACTORY_LABS: LabMeta[] = [
  {
    slug: "bottling-line",
    badge: "new",
    name: "Bottling line",
    symbol: "FILL",
    category: "factory",
    tagline: "Fill, cap, label, reject",
    summary:
      "A full-page filling line: infeed, fill, cap, label, then reject or outfeed. Photoeyes, speed, and fill setpoint drive the reject gate.",
    principle:
      "Each station waits on a photoeye. Fill stops at the setpoint; underfill by more than 6% diverts to reject. E-stop clears motion on the whole line.",
    formula: "reject if fill < setpoint - 6%",
    uses: ["Beverage packaging", "PLC interlocks", "Photoeye sequencing"],
  },
  {
    slug: "pick-and-place",
    badge: "new",
    name: "Pick and place",
    symbol: "PnP",
    category: "factory",
    tagline: "UR5e cell moves parts bin to fixture",
    summary:
      "A six-axis arm picks from an infeed nest and places on a fixture. Joint jogging, grip, and cycle run share one full-page viewport.",
    principle:
      "Pick-and-place is a taught cycle: approach, grasp, depart, place. Speed and blend radius trade cycle time against tip accuracy.",
    formula: "T_cycle ≈ Σ move + grasp + release",
    uses: ["PCB stuffing", "Machine tending", "Kitting"],
  },
  {
    slug: "agv-line",
    badge: "new",
    name: "AGV line",
    symbol: "AGV",
    category: "factory",
    tagline: "Differential drive with warning beacons",
    summary:
      "A factory AGV follows a lane with left/right wheel speeds. Beacons flash on fault, slow zone, and e-stop.",
    principle:
      "Differential drive: v = (vr + vl)/2, ω = (vr - vl)/track. Soft stops and beacon codes keep humans clear of the path.",
    formula: "v = (v_r + v_l)/2",
    uses: ["Warehouse carts", "Line-side delivery", "Safety beacons"],
  },
  {
    slug: "color-sorter",
    badge: "new",
    name: "Color sorter",
    symbol: "SORT",
    category: "factory",
    tagline: "Vision class then divert",
    summary:
      "Parts on a belt pass a color/size sensor. Gates divert into bins by class with a short teachable threshold.",
    principle:
      "A classifier maps hue and size to a bin index. Timing the divert to belt speed keeps the part on the paddle.",
    formula: "bin = class(hue, size)",
    uses: ["Recycling", "Food grading", "QC divert"],
  },
  {
    slug: "scara-cell",
    badge: "new",
    name: "SCARA cell",
    symbol: "SCARA",
    category: "factory",
    tagline: "Fast planar pick with Z plunge",
    summary:
      "A SCARA arm covers a planar work cell: two rotary links, Z, and wrist. Cycle a pick from feeder to pallet.",
    principle:
      "SCARA keeps the tool parallel to the plane. High stiffness in Z and fast XY make it ideal for assembly and palletizing light parts.",
    formula: "x = L1 cos θ1 + L2 cos(θ1+θ2)",
    uses: ["Electronics assembly", "Palletizing", "Dispense"],
  },
];
