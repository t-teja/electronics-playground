export const SITE_URL = "https://t-teja.github.io/electronics-playground";
export const SITE_NAME = "Electronics Playground";
export const SITE_DESCRIPTION =
  "Interactive electronics laboratory. Watch electrons, fields, and logic — then change the values yourself.";

export function absUrl(path = ""): string {
  const cleaned = path.replace(/^\/+/, "");
  if (!cleaned) return `${SITE_URL}/`;
  return `${SITE_URL}/${cleaned}`;
}

export function ogImage(): string {
  return absUrl("og.jpg");
}
