import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

function basepath() {
  const raw = import.meta.env.BASE_URL ?? "/";
  if (!raw || raw === "/") return undefined;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    basepath: basepath(),
  });
}
