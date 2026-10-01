import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Home } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { GLYPHS } from "@/components/glyph-registry";
import { Badge } from "@/components/ui/badge";
import { FactoryHotkeyLegend } from "@/hooks/use-factory-hotkeys";
import { CATEGORIES, labsIn, type Category, type LabMeta } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";

function openFor(category: Category): Record<Category, boolean> {
  return Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id === category])) as Record<
    Category,
    boolean
  >;
}

function useXlUp(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1280px)").matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return matches;
}

function BenchLink({
  item,
  active,
  seen,
}: {
  item: LabMeta;
  active: boolean;
  seen: boolean;
}) {
  const Glyph = GLYPHS[item.slug as keyof typeof GLYPHS];
  return (
    <Link
      to="/lab/$slug"
      params={{ slug: item.slug }}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-[background-color,color] duration-150 ease-out",
        active ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg",
      )}
    >
      <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-md bg-sim">
        {Glyph ? <Glyph className="h-full w-full text-muted" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {seen ? <Check className="size-3 shrink-0 text-electron" strokeWidth={2} /> : null}
    </Link>
  );
}

/**
 * Full-window 3D factory chrome. Canvas fills the stage; controls overlay on desktop.
 */
export function FactoryShell({
  lab,
  viewport,
  meters,
  controls,
  insight,
  showHotkeys = true,
  hotkeyLegend,
}: {
  lab: LabMeta;
  viewport: ReactNode;
  meters: ReactNode;
  controls: ReactNode;
  insight: ReactNode;
  showHotkeys?: boolean;
  hotkeyLegend?: ReactNode;
}) {
  const visited = useProgress((s) => s.visited);
  const desktop = useXlUp();
  const [open, setOpen] = useState<Record<Category, boolean>>(() => openFor(lab.category));
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setOpen((prev) => ({ ...prev, [lab.category]: true }));
  }, [lab.category]);

  const legend = hotkeyLegend ?? (showHotkeys ? <FactoryHotkeyLegend /> : null);

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-bg text-fg">
      <AppHeader className="h-11 shrink-0 md:h-12" />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-line xl:flex">
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-raised/60 hover:text-fg"
            >
              <Home className="size-3.5" strokeWidth={1.75} />
              Home
            </Link>
            {CATEGORIES.map((cat) => {
              const expanded = Boolean(open[cat.id]);
              return (
                <div key={cat.id} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-medium tracking-[0.16em] text-subtle uppercase hover:bg-raised/60 hover:text-fg"
                  >
                    <span>{cat.label}</span>
                    <ChevronDown
                      className={cn(
                        "size-3 shrink-0 transition-transform",
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
                        />
                      ))
                    : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1.5 md:px-4">
            <div className="min-w-0">
              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                <Badge>{CATEGORIES.find((c) => c.id === lab.category)?.label ?? lab.category}</Badge>
                <span className="font-mono text-[11px] text-subtle">{lab.formula}</span>
              </div>
              <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">{lab.name}</h1>
              <p className="truncate text-xs text-muted [@media(max-height:720px)]:hidden">
                {lab.tagline}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-raised px-2.5 py-1.5 text-xs xl:hidden"
                onClick={() => setNavOpen((v) => !v)}
              >
                Benches
              </button>
              <Link to="/" className="text-xs text-muted hover:text-fg">
                Home
              </Link>
            </div>
          </div>

          {navOpen ? (
            <div className="max-h-36 shrink-0 overflow-y-auto border-b border-line px-2 py-1 xl:hidden">
              {labsIn(lab.category).map((item) => (
                <BenchLink
                  key={item.slug}
                  item={item}
                  active={item.slug === lab.slug}
                  seen={Boolean(visited[item.slug])}
                />
              ))}
            </div>
          ) : null}

          {/* Main stage — single canvas; overlays never cause page scroll */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className="pointer-events-auto absolute inset-0 bg-[#1a2332]">{viewport}</div>

            {desktop ? (
              <>
                <div className="pointer-events-none absolute right-[min(20rem,32%)] bottom-0 left-0 z-10 px-2 py-2">
                  <div className="pointer-events-auto grid grid-cols-3 gap-1.5 2xl:grid-cols-5">
                    {meters}
                  </div>
                </div>
                <aside className="pointer-events-auto absolute top-0 right-0 bottom-0 z-20 flex w-[min(20rem,32%)] flex-col border-l border-line bg-surface/90 shadow-lg backdrop-blur">
                  <div className="shrink-0 border-b border-line p-3">
                    <h2 className="mb-2 text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">
                      Controls
                    </h2>
                    <div className="flex flex-col gap-3">{controls}</div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    {legend ? <div className="mb-4">{legend}</div> : null}
                    <section>
                      <h2 className="mb-2 text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">
                        Line status
                      </h2>
                      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted">
                        {insight}
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-subtle">{lab.principle}</p>
                    </section>
                  </div>
                </aside>
              </>
            ) : (
              <aside className="pointer-events-auto absolute right-0 bottom-0 left-0 z-20 flex max-h-[min(42dvh,22rem)] flex-col gap-3 overflow-y-auto border-t border-line bg-surface/95 p-3 backdrop-blur">
                <section className="shrink-0">
                  <h2 className="mb-2 text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">
                    Controls
                  </h2>
                  <div className="flex flex-col gap-3">{controls}</div>
                </section>
                <div className="grid shrink-0 grid-cols-3 gap-1.5 border-t border-line pt-3">
                  {meters}
                </div>
                {legend ? <div className="shrink-0 border-t border-line pt-3">{legend}</div> : null}
                <section className="shrink-0">
                  <h2 className="mb-2 text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">
                    Line status
                  </h2>
                  <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted">
                    {insight}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-subtle">{lab.principle}</p>
                </section>
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
