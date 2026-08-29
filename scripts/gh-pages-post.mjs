import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dest = join(root, "dist-pages");

const candidates = [
  join(root, "dist", "client"),
  join(root, ".output", "public"),
  join(root, "dist"),
];

function copyDir(src, out) {
  mkdirSync(out, { recursive: true });
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const to = join(out, name);
    if (statSync(from).isDirectory()) copyDir(from, to);
    else copyFileSync(from, to);
  }
}

const src = candidates.find(
  (dir) =>
    existsSync(join(dir, "index.html")) ||
    existsSync(join(dir, "_shell.html")) ||
    existsSync(join(dir, "assets")),
);
if (!src) {
  console.error("gh-pages-post: no static client output in", candidates);
  process.exit(1);
}

copyDir(src, dest);
writeFileSync(join(dest, ".nojekyll"), "");

const shell = ["index.html", "_shell.html"].map((n) => join(dest, n)).find((p) => existsSync(p));
if (!shell) {
  console.error("gh-pages-post: no index.html or _shell.html in", dest);
  process.exit(1);
}
copyFileSync(shell, join(dest, "index.html"));
copyFileSync(shell, join(dest, "404.html"));

const LAB_SLUGS = [
  "resistor",
  "capacitor",
  "inductor",
  "potentiometer",
  "transformer",
  "diode",
  "led",
  "transistor",
  "pnp",
  "mosfet",
  "logic-gates",
  "timer-555",
  "microcontroller",
  "signal-generator",
  "adc",
  "dac",
  "dc-motor",
  "relay",
  "ldr",
  "ir",
  "pir",
  "ultrasonic",
  "ram",
  "rom",
  "eprom",
  "psram",
  "cpu",
  "gpu",
];
for (const slug of LAB_SLUGS) {
  const dir = join(dest, "lab", slug);
  mkdirSync(dir, { recursive: true });
  copyFileSync(shell, join(dir, "index.html"));
}

console.log(
  `gh-pages-post: ${src} → ${dest} (index.html + 404.html + lab/*/index.html + .nojekyll)`,
);
