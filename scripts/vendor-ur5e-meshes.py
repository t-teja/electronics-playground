#!/usr/bin/env python3
"""Download UR5e *visual* DAE meshes (BSD-3-Clause) and write binary STLs.

Source: UniversalRobots/Universal_Robots_ROS2_Description
Never ship gut-decimated teaching stubs (~18 facets).
"""
from __future__ import annotations

import struct
import sys
import urllib.request
import zipfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "robots" / "ur5e" / "meshes"
NAMES = ["base", "shoulder", "upperarm", "forearm", "wrist1", "wrist2", "wrist3"]
# Soft-cap only for GitHub Pages budget; still thousands of tris/link.
FACE_CAP = {
    "base": 12000,
    "shoulder": 16000,
    "upperarm": 20000,
    "forearm": 14000,
    "wrist1": 14000,
    "wrist2": 14000,
    "wrist3": 5000,
}
REPO_ZIP = (
    "https://codeload.github.com/UniversalRobots/"
    "Universal_Robots_ROS2_Description/zip/refs/heads/rolling"
)


def facet_count(data: bytes) -> int:
    if data[:5] == b"solid" and b"\x00" not in data[:120]:
        return data.count(b"facet normal")
    if len(data) < 84:
        return 0
    return struct.unpack_from("<I", data, 80)[0]


def already_dense() -> bool:
    if not OUT.is_dir():
        return False
    for name in NAMES:
        p = OUT / f"{name}.stl"
        if not p.is_file():
            return False
        n = facet_count(p.read_bytes())
        if n < 500:  # stubs were ~18-55
            return False
    return True


def main() -> int:
    if already_dense() and "--force" not in sys.argv:
        print("UR5e visual STLs already dense; skipping")
        for name in NAMES:
            p = OUT / f"{name}.stl"
            print(f"  {name}: {facet_count(p.read_bytes())} facets, {p.stat().st_size} bytes")
        return 0

    try:
        import trimesh
    except ImportError:
        print("trimesh required", file=sys.stderr)
        return 1

    print("Downloading Universal_Robots_ROS2_Description (rolling)...")
    with urllib.request.urlopen(REPO_ZIP, timeout=120) as resp:
        zdata = resp.read()
    zf = zipfile.ZipFile(BytesIO(zdata))
    prefix = None
    for info in zf.namelist():
        if info.endswith("/meshes/ur5e/visual/base.dae"):
            prefix = info[: -len("base.dae")]
            break
    if not prefix:
        print("visual DAEs not found in zip", file=sys.stderr)
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    tmp = ROOT / ".cache" / "ur5e-dae"
    tmp.mkdir(parents=True, exist_ok=True)

    for name in NAMES:
        member = f"{prefix}{name}.dae"
        dae_path = tmp / f"{name}.dae"
        dae_path.write_bytes(zf.read(member))
        print(f"Converting {name}.dae ...")
        loaded = trimesh.load(str(dae_path), force="mesh")
        if isinstance(loaded, trimesh.Scene):
            geoms = [g for g in loaded.geometry.values() if isinstance(g, trimesh.Trimesh)]
            mesh = trimesh.util.concatenate(geoms) if len(geoms) > 1 else geoms[0]
        else:
            mesh = loaded
        mesh.merge_vertices()
        n0 = len(mesh.faces)
        cap = FACE_CAP[name]
        if n0 > cap:
            try:
                mesh = mesh.simplify_quadric_decimation(face_count=cap)
            except Exception as e:
                print(f"  simplify skipped ({e})")
        try:
            trimesh.repair.fix_normals(mesh)
        except Exception:
            pass
        data = mesh.export(file_type="stl")
        if isinstance(data, str):
            data = data.encode("latin1")
        out_path = OUT / f"{name}.stl"
        out_path.write_bytes(data)
        n = facet_count(data)
        print(f"  wrote {out_path.name}: {n} facets ({n0} source), {len(data)} bytes")
        if n < 500:
            print(f"ERROR: {name} still too sparse", file=sys.stderr)
            return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
