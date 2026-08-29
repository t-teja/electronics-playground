import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Home } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { GLYPHS } from "@/components/glyphs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CATEGORIES, labsIn, type Category, type LabMeta } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";

function openFor(category: Category): Record<Category, boolean> {
  return Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id === category])) as Record<
    Category,
    boolean
  >;
}

function HomeLink({ dense }: { dense?: boolean }) {
  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-2 rounded-lg text-sm text-muted transition-[background-color,color] duration-150 ease-out hover:bg-raised/60 hover:text-fg",
        dense ? "px-2 py-1.5" : "px-2.5 py-2",
      )}
    >
      <Home className="size-4 shrink-0" strokeWidth={1.75} />
      Home
    </Link>
  );
}

function BenchLink({
  item,
  active,
  seen,
  dense,
}: {
  item: LabMeta;
  active: boolean;
  seen: boolean;
  dense?: boolean;
}) {
  const Glyph = GLYPHS[item.slug as keyof typeof GLYPHS];
  return (
    <Link
      to="/lab/$slug"
      params={{ slug: item.slug }}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-sm transition-[background-color,color] duration-150 ease-out",
        dense ? "px-2 py-1.5" : "px-2.5 py-2",
        active ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg",
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-md bg-sim",
          dense ? "size-7" : "size-8",
        )}
      >
        {Glyph ? <Glyph className={dense ? "h-7 w-12 text-muted" : "h-8 w-14 text-muted"} /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {seen ? <Check className="size-3.5 shrink-0 text-electron" strokeWidth={2} /> : null}
    </Link>
  );
}

function CategoryList({
  lab,
  visited,
  open,
  onToggle,
  dense,
}: {
  lab: LabMeta;
  visited: Record<string, true>;
  open: Record<Category, boolean>;
  onToggle: (id: Category) => void;
  dense?: boolean;
}) {
  return (
    <>
      {CATEGORIES.map((cat) => {
        const expanded = Boolean(open[cat.id]);
        return (
          <div key={cat.id} className="flex flex-col gap-0.5">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => onToggle(cat.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg text-left text-[10px] font-medium tracking-[0.16em] text-subtle uppercase",
                "transition-[background-color,color] duration-150 ease-out hover:bg-raised/60 hover:text-fg",
                dense ? "px-2 py-1.5" : "px-2.5 py-2",
              )}
            >
              <span>{cat.label}</span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 transition-transform duration-150 ease-out",
                  expanded ? "rotate-180" : null,
                )}
                strokeWidth={2}
              />
            </button>
            {expanded
              ? labsIn(cat.id).map((item) => (
                  <BenchLink
                    key={item.slug}
                    item={item}
                    active={item.slug === lab.slug}
                    seen={Boolean(visited[item.slug])}
                    dense={dense}
                  />
                ))
              : null}
          </div>
        );
      })}
    </>
  );
}

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
  const [open, setOpen] = useState<Record<Category, boolean>>(() => openFor(lab.category));

  useEffect(() => {
    setOpen((prev) => ({ ...prev, [lab.category]: true }));
  }, [lab.category]);

  const onToggle = (id: Category) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-line lg:block">
          <nav className="sticky top-16 flex max-h-[calc(100dvh-4rem)] flex-col gap-0.5 overflow-y-auto p-3">
            <HomeLink />
            <CategoryList lab={lab} visited={visited} open={open} onToggle={onToggle} />
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="max-h-48 overflow-y-auto border-b border-line px-3 py-2 lg:hidden">
            <nav className="flex flex-col gap-0.5">
              <HomeLink dense />
              <CategoryList lab={lab} visited={visited} open={open} onToggle={onToggle} dense />
            </nav>
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
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted transition-[color] duration-150 ease-out hover:text-fg"
              >
                <Home className="size-3.5" strokeWidth={1.75} />
                Home / All benches
              </Link>
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
                  What's happening
                </h2>
                <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted">
                  {insight}
                </div>
                <Separator className="my-4" />
                <p className="text-sm leading-relaxed text-subtle">{lab.principle}</p>
                {lab.uses.length > 0 ? (
                  <>
                    <Separator className="my-4" />
                    <h3 className="mb-2 text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">
                      Where you'll see it
                    </h3>
                    <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-muted">
                      {lab.uses.map((use) => (
                        <li key={use} className="flex gap-2">
                          <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-electron" />
                          <span>{use}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
