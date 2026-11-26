// Accumulation (#668). The piece `fillUnder` fills the area under f(x) = x²/4 + 1 on [0, 4] with n rectangles whose
// heights are taken at the left ends, the right ends or the middles of their strips; the true area is 28/3.

/** The piece: which end sets the heights (0 left, 1 right, 2 middle) and how many rectangles. */
export type LiveFillUnder = { which: number; n: number };
export const FILL_START: LiveFillUnder = { which: 0, n: 4 };
export const FILL_MAX = 16;
export const fillF = (x: number) => (x * x) / 4 + 1;
export const FILL_AREA = 28 / 3;
/** The sum of n rectangles on [0, 4], with heights at the left (0), right (1) or middle (2) of each strip. */
export function riemann(which: number, n: number): number {
  const w = 4 / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += fillF(w * (i + [0, 1, 0.5][which])) * w;
  return s;
}
