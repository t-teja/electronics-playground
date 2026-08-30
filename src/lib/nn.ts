export function sigmoid(x: number) {
  const z = Math.max(-20, Math.min(20, x));
  return 1 / (1 + Math.exp(-z));
}

export function softmax(xs: number[]) {
  if (xs.length === 0) return [];
  let m = -Infinity;
  for (const v of xs) if (v > m) m = v;
  const e = xs.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0) || 1;
  return e.map((v) => v / s);
}

export function dot(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}
