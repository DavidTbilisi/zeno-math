// Equations with roots (#661). Squaring both sides of √(x + a) = x + c gives x + a = (x + c)², whose answers also
// solve −√(x + a) = x + c: squaring cannot tell a root from its negative. So each answer is checked in the first
// equation, and one that makes x + c negative does not fit. The piece `squareCheck` shows it: the curve, its dashed
// mirror that squaring lets in, the line, and the two crossings to check.

/** The piece: which equation, whether it is squared, and which crossings are checked (0 the fitting one, 1 the other). */
export type LiveSquareCheck = { which: number; squared: boolean; checked: number[] };
export const SQUARE_CHECK_START: LiveSquareCheck = { which: 0, squared: false, checked: [] };
/** √(x + a) = x + c. */
export const ROOT_EQS: readonly { a: number; c: number }[] = [{ a: 2, c: -4 }, { a: 7, c: 1 }, { a: 5, c: -1 }];
/** The two answers of x + a = (x + c)², the fitting one first. */
export function rootsOf(a: number, c: number): [number, number] {
  const [B, C] = [2 * c - 1, c * c - a];
  const d = Math.sqrt(B * B - 4 * C);
  const xs = [(-B + d) / 2, (-B - d) / 2];
  return xs[0] + c >= 0 ? [xs[0], xs[1]] : [xs[1], xs[0]];
}
/** x + c written out. */
export const plusText = (c: number) => (c < 0 ? `x − ${-c}` : c > 0 ? `x + ${c}` : "x");
/** A tap on the equation squares it; a tap on a crossing checks it once squared. */
export const squareIt = (s: LiveSquareCheck): LiveSquareCheck => ({ ...s, squared: true });
export const checkAt = (s: LiveSquareCheck, i: number): LiveSquareCheck => (s.squared && !s.checked.includes(i) ? { ...s, checked: [...s.checked, i] } : s);
