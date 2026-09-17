import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const names = ["base", "shoulder", "upperarm", "forearm", "wrist1", "wrist2", "wrist3"];

function facetCount(buf) {
  if (buf.subarray(0, 5).toString("ascii") === "solid" && !buf.subarray(0, 120).includes(0)) {
    return (buf.toString("ascii").match(/facet normal/g) || []).length;
  }
  if (buf.length < 84) return 0;
  return buf.readUInt32LE(80);
}

let sparse = false;
for (const n of names) {
  const p = join(root, "public/robots/ur5e/meshes", `${n}.stl`);
  if (!existsSync(p)) {
    sparse = true;
    break;
  }
  const buf = readFileSync(p);
  const faces = facetCount(buf);
  if (faces < 500) {
    console.warn(`[ur5e] ${n}.stl looks sparse (${faces} faces, ${buf.length} bytes)`);
    sparse = true;
  }
}

if (!sparse) {
  console.log("[ur5e] visual meshes look dense");
  process.exit(0);
}

console.warn("[ur5e] attempting scripts/vendor-ur5e-meshes.py to replace sparse STLs...");
const r = spawnSync("python3", ["scripts/vendor-ur5e-meshes.py", "--force"], {
  cwd: root,
  stdio: "inherit",
});
if (r.status !== 0) {
  console.warn(
    "[ur5e] vendor script failed (install: pip install trimesh pycollada numpy scipy fast_simplification). CI/pages will regenerate.",
  );
}
