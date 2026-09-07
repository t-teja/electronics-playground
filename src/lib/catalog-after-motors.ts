import type { LabMeta } from "./catalog";

export const CATALOG_AFTER_MOTORS: LabMeta[] = [
  {
    slug: "relay",
    badge: "updated",
    name: "Relay",
    symbol: "K",
    category: "electromechanical",
    tagline: "A magnet that throws a switch",
    summary:
      "A small coil current pulls an armature and slams metal contacts. The load never shares a wire with the coil. That is galvanic isolation you can hear.",
    principle:
      "Amp-turns in the coil build a field that beats the return spring. COM leaves NC and lands on NO. Opening the coil dumps the field; a flyback diode gives that energy a path so the driving transistor survives.",
    formula: "Icoil = Vcoil / Rcoil",
    uses: [
      "HVAC contactors and thermostat outputs",
      "Automotive horns, lamps, and starters",
      "PLC discrete outputs switching mains",
      "Isolating a low-voltage MCU from a dirty load",
    ],
  },
  {
    slug: "ldr",
    badge: "updated",
    name: "LDR",
    symbol: "LDR",
    category: "sensor",
    tagline: "Light as a resistor",
    summary:
      "A photocell. Photons free carriers; resistance falls as the room brightens, and a divider turns that into a voltage.",
    principle:
      "Photoconductivity: absorbed photons lift electrons into the conduction band, so R falls with illuminance roughly as 1/E^\u03b3. A voltage divider with a fixed resistor turns that resistance into a voltage a microcontroller can read.",
    formula: "R \u221d 1 / E^\u03b3",
    uses: [
      "Night lights and street-lamp dusk sensors",
      "Camera exposure meters",
      "Solar trackers and greenhouse shading",
      "DIY light-following robots",
    ],
  },
  {
    slug: "ir",
    badge: "updated",
    name: "IR sensor",
    symbol: "IR",
    category: "sensor",
    tagline: "Bounce light, measure closeness",
    summary:
      "An IR LED shouts; a photodiode listens for the echo. Close objects return more photons. Intensity falls as 1/d\u00b2.",
    principle:
      "Reflected optical power drops with the square of distance. Photodiode current follows that intensity. A comparator against a threshold turns proximity into a bit.",
    formula: "I \u221d 1 / d\u00b2",
    uses: [
      "Line-following robots and cliff sensors",
      "TV remotes and IR break-beams",
      "Proximity detect on hand dryers and taps",
      "Encoder wheels and slot sensors",
    ],
  },
  {
    slug: "pir",
    badge: "new",
    name: "PIR",
    symbol: "PIR",
    category: "sensor",
    tagline: "It sees change, not people",
    summary:
      "A pyroelectric element that only cares about a changing infrared flux. A still room is invisible; a walk-by is a pulse.",
    principle:
      "Pyroelectric crystals generate charge proportional to d\u03a6/dt, not \u03a6. Dual elements of opposite polarity cancel ambient temperature. A retriggerable window stretches the pulse into a usable alarm.",
    formula: "I \u221d d\u03a6_IR / dt",
    uses: [
      "Burglar alarms and hallway lighting",
      "Automatic doors and restroom faucets",
      "Wildlife cameras",
      "HVAC occupancy sensing",
    ],
  },
  {
    slug: "ultrasonic",
    badge: "new",
    name: "Ultrasonic",
    symbol: "US",
    category: "sensor",
    tagline: "Time of flight you can hear",
    summary:
      "A 40 kHz click, a wall, an echo. Distance is how long the sound took, times speed, over two.",
    principle:
      "The HC-SR04 fires a trigger pulse; the onboard transducer rings, the sound flies, reflects, and the echo pin stays high for the round trip. d = v t / 2 with v \u2248 343 m/s in air.",
    formula: "d = v t / 2",
    uses: [
      "Robot obstacle avoidance",
      "Parking sensors and tank level gauges",
      "Range finders in drones and toys",
      "Anemometers and flow meters",
    ],
  },
  {
    slug: "ram",
    badge: "new",
    name: "RAM",
    symbol: "RAM",
    category: "computer",
    tagline: "Bits that live only while the lights are on",
    summary:
      "Sixteen nibbles of SRAM. Address selects a row, din rides the data bus, a write strobe stores. Kill VCC and every cell becomes 0.",
    principle:
      "Each bit is a pair of cross-coupled inverters. The latch holds a 1 or a 0 only while current feeds the transistors. That is volatile: power is the memory.",
    formula: "data[addr] \u2190 din  (while powered)",
    uses: ["MCU SRAM", "CPU working memory", "framebuffers"],
  },
  {
    slug: "rom",
    badge: "updated",
    name: "ROM",
    symbol: "ROM",
    category: "computer",
    tagline: "A table the fab printed in metal",
    summary:
      "Same 16\u00d74 grid, but the pattern is mask-programmed at fab: here an increment table. Address and read. There is no write pin.",
    principle:
      "Mask ROM is vias and implants, not latches. The bits are baked in. Power-off does not clear them because there is nothing to dump.",
    formula: "dout = ROM[addr]",
    uses: ["boot firmware", "character generators", "lookup tables"],
  },
  {
    slug: "eprom",
    badge: "updated",
    name: "EPROM",
    symbol: "EPROM",
    category: "computer",
    tagline: "Floating gates you can UV-erase",
    summary:
      "A quartz window over 16\u00d74 floating-gate cells. UV empties the gates toward 1s. Vpp programs 0s. Power-off keeps the charge.",
    principle:
      "Erased floating gates read as 1. A programming pulse on Vpp injects electrons and turns selected bits to 0. Ultraviolet through the window photoemits those electrons back out.",
    formula: "UV empties the floating gate; Vpp programs 0s",
    uses: ["old BIOS chips", "firmware you can UV-erase and reburn"],
  },
  {
    slug: "psram",
    badge: "new",
    name: "PSRAM",
    symbol: "PSRAM",
    category: "computer",
    tagline: "SRAM pins, DRAM capacitors",
    summary:
      "Looks like SRAM until you kill the refresh engine. Each row is a DRAM capacitor. Charge leaks as Q(t) = Q0 e^{-t/RC} unless a cursor tops it up.",
    principle:
      "Pseudo-static means a DRAM with a built-in refresh engine. The bus looks static; under the lid a walker restores every row before the capacitors forget.",
    formula: "Q(t) = Q0 e^{\u2212t/RC} unless refreshed",
    uses: ["IoT RAM", "display buffers", "anything that wants SRAM timing with DRAM density"],
  },
  {
    slug: "cpu",
    badge: "new",
    name: "CPU",
    symbol: "CPU",
    category: "computer",
    tagline: "Fetch, decode, execute, then do it again",
    summary:
      "Not the GPIO toy. Registers A and PC, eight bytes of RAM, and a stored program: LDA, ADD, STA, JMP, HLT. Default: 3 + 5 = 8.",
    principle:
      "Each instruction cycle is fetch + decode + execute. The program lives in memory; the ALU is just a box the bus walks through. Power-off resets PC and A; RAM is kept.",
    formula: "instruction cycle = fetch + decode + execute",
    uses: ["every computer; this is the loop a phone still runs, just faster"],
  },
  {
    slug: "gpu",
    badge: "updated",
    name: "GPU",
    symbol: "GPU",
    category: "computer",
    tagline: "The same math, on many pixels at once",
    summary:
      "An 8\u00d78 framebuffer. One CPU painter versus 1, 4, or 8 parallel cores claiming tiles. GPUs win on width, not on a faster clock.",
    principle:
      "A CPU paints one pixel per clock. N cores paint N pixels per clock on the same job. That is why a GPU is not a faster CPU. It is many ALUs doing the same multiply on different data.",
    formula: "pixels/s \u2248 cores \u00d7 clocks",
    uses: ["displays", "games", "ML matmuls (same idea: lots of ALUs)"],
  },
];
