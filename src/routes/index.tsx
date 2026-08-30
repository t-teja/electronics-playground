import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { GLYPHS } from "@/components/glyphs";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, LABS, labsIn } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const visited = useProgress((s) => s.visited);
  const hydrate = useProgress((s) => s.hydrate);
  useEffect(() => hydrate(), [hydrate]);
  const done = LABS.filter((l) => visited[l.slug]).length;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-10 md:px-8 md:py-16">
        <section className="max-w-3xl">
          <p className="mb-4 text-xs font-medium tracking-[0.18em] text-subtle uppercase">
            Interactive laboratory
          </p>
          <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance md:text-6xl">
            Watch charge move.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            {LABS.length} live benches, from resistor to attention. Real equations, drifting
            electrons, fields you can feel. Drag a slider. The physics follows.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/lab/$slug"
              params={{ slug: "resistor" }}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-[scale,background-color] duration-150 ease-out hover:bg-accent/90 active:scale-[0.96]"
            >
              Open the first bench
              <ArrowRight className="size-4" strokeWidth={1.75} />
            </Link>
            <p className="text-sm text-subtle">
              {done === 0
                ? "Nothing visited yet. Pick a component."
                : `${done} of ${LABS.length} benches visited`}
            </p>
          </div>
        </section>

        {CATEGORIES.map((cat) => (
          <section key={cat.id} className="flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-medium tracking-[0.14em] text-subtle uppercase">
                {cat.label}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted">{cat.blurb}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {labsIn(cat.id).map((lab) => {
                const Glyph = GLYPHS[lab.slug as keyof typeof GLYPHS];
                const seen = Boolean(visited[lab.slug]);
                return (
                  <Link
                    key={lab.slug}
                    to="/lab/$slug"
                    params={{ slug: lab.slug }}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]",
                      "transition-[box-shadow,transform] duration-150 ease-out",
                      "hover:shadow-[var(--shadow-border-hover)] active:scale-[0.99]",
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="grid h-14 w-full max-w-[11rem] place-items-center overflow-hidden rounded-lg bg-sim">
                        {Glyph ? <Glyph className="h-14 w-full" /> : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {lab.badge === "new" ? (
                          <Badge className="bg-electron/15 text-electron">New</Badge>
                        ) : null}
                        {lab.badge === "updated" ? (
                          <Badge className="bg-raised text-fg">Updated</Badge>
                        ) : null}
                        {seen ? (
                          <Check className="size-4 text-electron" strokeWidth={2} aria-label="Visited" />
                        ) : null}
                      </div>
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-base font-semibold tracking-tight">{lab.name}</h3>
                      <Badge>{lab.symbol}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted">{lab.tagline}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </main>
      <footer className="border-t border-line px-4 py-6 text-center text-xs text-subtle md:px-8">
        Electronics Playground. Electrons left to right, conventional current the other way.
      </footer>
    </div>
  );
}
