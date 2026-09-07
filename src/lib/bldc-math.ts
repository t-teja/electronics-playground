export const BLDC_J = 0.00025;
export const BLDC_B = 0.00005;
export const BLDC_KT = 0.08;
export const BLDC_KE = 0.08;
export const BLDC_COMMUTATION: [number, number, number][] = [
  [1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1],
];
export function trapBemf(angle: number, phase: number) {
  let a = ((angle - phase + Math.PI / 6) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const sector = a / (Math.PI / 3);
  if (sector < 1) return -1 + sector;
  if (sector < 3) return 1;
  if (sector < 4) return 1 - (sector - 3);
  return -1;
}
