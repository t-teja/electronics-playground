import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";
import { useTheme } from "@/lib/theme";
import { APP_VERSION } from "@/lib/version";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Light mode" : "Dark mode"}
      className="relative grid size-11 place-items-center rounded-md text-fg transition-[background-color,color] duration-150 ease-out hover:bg-raised"
    >
      <span className="relative size-4">
        <span
          className={cn(
            "absolute inset-0 grid place-items-center transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
            isDark ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none",
          )}
        >
          <Sun className="size-4" strokeWidth={1.75} />
        </span>
        <span
          className={cn(
            "absolute inset-0 grid place-items-center transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
            isDark ? "scale-100 opacity-100 blur-none" : "scale-[0.25] opacity-0 blur-[4px]",
          )}
        >
          <Moon className="size-4" strokeWidth={1.75} />
        </span>
      </span>
    </button>
  );
}

export function AppHeader({ className }: { className?: string }) {
  const hydrate = useProgress((s) => s.hydrate);
  useEffect(() => hydrate(), [hydrate]);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/90 px-3 backdrop-blur-sm md:h-16 md:px-6",
        className,
      )}
    >
      <Link to="/" className="flex min-w-0 items-center gap-2.5 text-fg">
        <span className="relative grid size-6 shrink-0 place-items-center">
          <span className="absolute inset-[3px] rounded-full border border-muted/70" />
          <span className="size-1.5 rounded-full bg-electron" />
        </span>
        <span className="truncate text-[13px] font-semibold tracking-tight sm:text-sm">
          Electronics Playground
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-subtle">
          v{APP_VERSION}
        </span>
      </Link>
      <div className="flex items-center gap-1">
        <p className="mr-1 hidden text-xs tracking-wide text-subtle lg:block">
          Interactive electronics laboratory
        </p>
        <ThemeToggle />
      </div>
    </header>
  );
}
