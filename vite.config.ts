import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import type { Plugin } from "vite";

const ghPages = process.env.GH_PAGES === "1";
const base = process.env.BASE_PATH || "/";

async function optionalPlugin(rel: string, exported: string): Promise<Plugin | null> {
  const full = join(process.cwd(), rel);
  if (!existsSync(full)) return null;
  const mod = (await import(pathToFileURL(full).href)) as Record<string, () => Plugin>;
  const fn = mod[exported];
  return typeof fn === "function" ? fn() : null;
}

export default defineConfig(async ({ command, isPreview }) => {
  const grokPlugins: Plugin[] = [];
  if (!ghPages) {
    const loaded = await Promise.all([
      optionalPlugin("scripts/app-env-plugin.mjs", "appEnvPlugin"),
      optionalPlugin("scripts/grok-pwa-plugin.mjs", "grokPwaPlugin"),
    ]);
    for (const p of loaded) if (p) grokPlugins.push(p);
  }

  const useNitro = (command === "build" || isPreview) && !ghPages && existsSync(join(process.cwd(), "server"));

  return {
    base,
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
    },
    preview: {
      host: "127.0.0.1",
      port: 8081,
      strictPort: true,
    },
    resolve: { tsconfigPaths: true },
    plugins: [
      ...grokPlugins,
      tailwindcss(),
      tanstackStart(
        ghPages
          ? {
              spa: { enabled: true },
              prerender: { enabled: true, crawlLinks: true },
            }
          : {},
      ),
      ...(useNitro
        ? [
            nitro({
              preset: "vercel",
              serverDir: "./server",
            }),
          ]
        : []),
      viteReact(),
    ],
  };
});
