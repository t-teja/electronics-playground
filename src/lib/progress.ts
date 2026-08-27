import { create } from "zustand";

const KEY = "ep.visited.v1";

function read(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, true>;
  } catch {
    return {};
  }
}

type Progress = {
  visited: Record<string, true>;
  mark: (slug: string) => void;
  hydrate: () => void;
};

export const useProgress = create<Progress>((set, get) => ({
  visited: {},
  hydrate: () => set({ visited: read() }),
  mark: (slug) => {
    if (get().visited[slug]) return;
    const next = { ...get().visited, [slug]: true as const };
    set({ visited: next });
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  },
}));
