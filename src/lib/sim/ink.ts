export type InkPalette = {
  bg: string;
  grid: string;
  gridStrong: string;
  copper: string;
  copperDim: string;
  electron: string;
  electronGlow: string;
  hole: string;
  text: string;
  muted: string;
  faint: string;
  body: string;
  bodyHi: string;
  pin: string;
  heat: string;
  nType: string;
  pType: string;
  deplete: string;
  package: string;
  led: string;
  scope: string;
};

const DARK: InkPalette = {
  bg: "#0c0c0e",
  grid: "rgba(255,255,255,0.035)",
  gridStrong: "rgba(255,255,255,0.06)",
  copper: "#c4845a",
  copperDim: "#8a5c3c",
  electron: "#2dd4bf",
  electronGlow: "rgba(45, 212, 191, 0.18)",
  hole: "#e8a07a",
  text: "#e4e4e7",
  muted: "#8a8a93",
  faint: "#52525b",
  body: "#1a1a1f",
  bodyHi: "#24242b",
  pin: "#d4d4d8",
  heat: "#e07050",
  nType: "#1c4d58",
  pType: "#5a3030",
  deplete: "#14141a",
  package: "#16161a",
  led: "#f4f4f5",
  scope: "#121214",
};

const LIGHT: InkPalette = {
  bg: "#f4f2ec",
  grid: "rgba(28,28,26,0.055)",
  gridStrong: "rgba(28,28,26,0.1)",
  copper: "#b45e32",
  copperDim: "#8a4524",
  electron: "#0f766e",
  electronGlow: "rgba(15, 118, 110, 0.16)",
  hole: "#c26a3a",
  text: "#1c1c1a",
  muted: "#5c5c56",
  faint: "#8a8a84",
  body: "#e7e4dc",
  bodyHi: "#f0eee8",
  pin: "#3f3f3a",
  heat: "#c45c3a",
  nType: "#9ec9d1",
  pType: "#e0b4ae",
  deplete: "#d8d4cc",
  package: "#2a2a2c",
  led: "#1c1c1a",
  scope: "#fffdf8",
};

export const Ink: InkPalette = { ...DARK };

export function applyThemeInk(theme: string) {
  Object.assign(Ink, theme === "light" ? LIGHT : DARK);
}
