import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { applyThemeInk } from "@/lib/sim/ink";

export type FrameFn = (
  ctx: CanvasRenderingContext2D,
  size: { w: number; h: number },
  t: number,
  dt: number,
) => void;

function readTheme(): string {
  if (typeof document === "undefined") return "dark";
  const el = document.documentElement;
  if (el.dataset.theme === "light" || el.classList.contains("light")) return "light";
  if (el.dataset.theme === "dark" || el.classList.contains("dark")) return "dark";
  return "dark";
}

export function SimCanvas({
  onFrame,
  className,
  paused = false,
}: {
  onFrame: FrameFn;
  className?: string;
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fnRef = useRef(onFrame);
  fnRef.current = onFrame;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let visible = true;
    let dpr = 1;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry ? entry.isIntersecting || entry.intersectionRatio > 0 : true;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    resize();

    let lastW = 0;
    let lastH = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const raw = (now - last) / 1000;
      last = now;
      const dt = Math.min(raw, 0.05);
      if (!visible && document.visibilityState === "hidden") return;
      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
      const cw = Math.max(1, Math.floor(rect.width));
      const ch = Math.max(1, Math.floor(rect.height));
      if (cw !== lastW || ch !== lastH) {
        lastW = cw;
        lastH = ch;
        resize();
      }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 2 || h < 2) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      applyThemeInk(readTheme());
      const step = pausedRef.current ? 0 : dt;
      t += step;
      try {
        fnRef.current(ctx, { w, h }, t, step);
      } catch (err) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#c0453c";
        ctx.font = "12px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(err instanceof Error ? err.message : String(err), 12, 12);
        console.error("[sim]", err);
      }
    };
    raf = requestAnimationFrame(loop);

    const vis = () => {
      last = performance.now();
      visible = document.visibilityState !== "hidden";
    };
    document.addEventListener("visibilitychange", vis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return <canvas ref={canvasRef} className={cn("block size-full", className)} aria-hidden="true" />;
}
