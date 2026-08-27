import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppHeader } from "@/components/app-header";
import { ThemeProvider, THEME_BOOT, useTheme } from "@/lib/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Electronics Playground";
const BASE = import.meta.env.BASE_URL || "/";
const asset = (path: string) => `${BASE}${path.replace(/^\//, "")}`;

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-6">
        <p className="text-sm text-subtle">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">This bench does not exist.</h1>
        <Link to="/" className="text-sm text-electron hover:underline">
          Back to the laboratory
        </Link>
      </main>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Interactive electronics laboratory. Watch electrons, fields, and logic — then change the values yourself.",
      },
      { name: "theme-color", content: "#09090b" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: asset("favicon.svg") },
      { rel: "stylesheet", href: appCss },
      { rel: "apple-touch-icon", href: asset("favicon.svg") },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
    ],
  }),
  notFoundComponent: NotFound,
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider>
      <RootDocument />
    </ThemeProvider>
  );
}

function RootDocument() {
  const { theme } = useTheme();
  return (
    <html lang="en" className={`antialiased ${theme}`} data-theme={theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
