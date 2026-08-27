import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { GLYPHS } from "@/components/glyphs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LABS, type LabMeta } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";

export function LabShell({
  lab,
  canvas,
  meters,
  controls,
  insight,
}: {
  lab: LabMeta;
  canvas: ReactNode;
  meters: ReactNode;
  controls: ReactNode;
  insight: ReactNode;
}) {
  const visited = useProgress((s) => s.visited);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-line lg:block">
          <nav className="sticky top-16 flex max-h-[calc(100dvh-4rem)] flex-col gap-0.5 overflow-y-auto p-3">
            <p className="px-3 pt-2 pb-2 text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">
              Benches
            </p>
            {LABS.map((item) => {
              const Glyph = GLYPHS[item.slug as keyof typeof GLYPHS];
              const active = item.slug === lab.slug;
              return (
                <Link
                  key={item.slug}
                  to="/lab/$slug"
                  params={{ slug: item.slug }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-[background-color,color] duration-150 ease-out",
                    active ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg",
                  )}
                >
                  <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-sim">
                    {Glyph ? <Glyph className="h-8 w-14 text-muted" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {visited[item.slug] ? (
                    <Check className="size-3.5 shrink-0 text-electron" strokeWidth={2} />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-2 lg:hidden">
            {LABS.map((item) => (
              <Link
                key={item.slug}
                to="/lab/$slug"
                params={{ slug: item.slug }}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center rounded-full px-3.5 text-sm whitespace-nowrap transition-[background-color,color] duration-150 ease-out",
                  item.slug === lab.slug
                    ? "bg-raised text-fg"
                    : "bg-transparent text-muted hover:text-fg",
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-4 p-4 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <Badge>{lab.category}</Badge>
                  <span className="font-mono text-xs text-subtle">{lab.formula}</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{lab.name}</h1>
                <p className="mt-1 max-w-2xl text-sm text-muted">{lab.tagline}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-sim shadow-[var(--shadow-border)]">
              <div className="relative h-[280px] w-full sm:h-[340px] md:h-[420px]">{canvas}</div>
            </div>

            <div className="flex flex-wrap gap-2">{meters}</div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] md:p-5">
                <h2 className="mb-4 text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">
                  Controls
                </h2>
                <div className="flex flex-col gap-5">{controls}</div>
              </section>
              <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] md:p-5">
                <h2 className="mb-3 text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">
                  What’s happening
                </h2>
                <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted">
                  {insight}
                </div>
                <Separator className="my-4" />
                <p className="text-sm leading-relaxed text-subtle">{lab.principle}</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
