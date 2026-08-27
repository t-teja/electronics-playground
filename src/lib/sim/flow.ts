import { Ink } from "./ink";

export type Pt = { x: number; y: number };

export function pathLength(pts: Pt[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    n += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return n;
}

export function pointAt(pts: Pt[], s: number, closed = false): Pt {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return { ...pts[0]! };
  const loop = closed ? [...pts, pts[0]!] : pts;
  let len = 0;
  const segs: number[] = [0];
  for (let i = 1; i < loop.length; i++) {
    const a = loop[i - 1]!;
    const b = loop[i]!;
    len += Math.hypot(b.x - a.x, b.y - a.y);
    segs.push(len);
  }
  if (len <= 0) return { ...loop[0]! };
  const d = ((s % len) + len) % len;
  for (let i = 1; i < loop.length; i++) {
    if (d <= segs[i]!) {
      const a = loop[i - 1]!;
      const b = loop[i]!;
      const span = segs[i]! - segs[i - 1]!;
      const t = span === 0 ? 0 : (d - segs[i - 1]!) / span;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return { ...loop[loop.length - 1]! };
}

type Particle = { s: number; seed: number };

export class ElectronFlow {
  particles: Particle[] = [];
  path: Pt[] = [];
  total = 1;
  closed = true;
  speed = 80;
  target = 18;
  radius = 2.3;
  kind: "electron" | "hole" = "electron";
  glow = true;

  setPath(path: Pt[], closed = true) {
    this.path = path;
    this.closed = closed;
    this.total = Math.max(1, pathLength(closed && path.length > 1 ? [...path, path[0]!] : path));
  }

  set(target: number, speed: number) {
    this.target = Math.max(0, Math.round(target));
    this.speed = speed;
  }

  step(dt: number) {
    const d = Math.min(dt, 0.05);
    while (this.particles.length < this.target) {
      this.particles.push({
        s: Math.random() * this.total,
        seed: Math.random(),
      });
    }
    if (this.particles.length > this.target) {
      this.particles.length = this.target;
    }
    const span = this.closed ? this.total : this.total + 40;
    for (const p of this.particles) {
      p.s += this.speed * d;
      if (this.closed) {
        p.s = ((p.s % this.total) + this.total) % this.total;
      } else if (p.s > span) {
        p.s = p.s % span;
      } else if (p.s < 0) {
        p.s = span + (p.s % span);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.path.length < 2 || this.target <= 0) return;
    const color = this.kind === "hole" ? Ink.hole : Ink.electron;
    for (const p of this.particles) {
      if (!this.closed && (p.s < 0 || p.s > this.total)) continue;
      const pt = pointAt(this.path, p.s, this.closed);
      const r = this.radius * (0.85 + p.seed * 0.3);
      if (this.glow) {
        ctx.beginPath();
        ctx.fillStyle = Ink.electronGlow;
        ctx.arc(pt.x, pt.y, r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class SparkField {
  sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  burst(x: number, y: number, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.25 + Math.random() * 0.35,
      });
    }
  }

  step(dt: number) {
    const d = Math.min(dt, 0.05);
    this.sparks = this.sparks.filter((s) => {
      s.life -= d;
      s.x += s.vx * d;
      s.y += s.vy * d;
      s.vy += 80 * d;
      return s.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, s.life * 3);
      ctx.fillStyle = Ink.text;
      ctx.fillRect(s.x, s.y, 1.6, 1.6);
      ctx.globalAlpha = 1;
    }
  }
}
