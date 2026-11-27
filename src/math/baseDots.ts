// Number bases by skip counting (#862): the place values of base b are 1, b, b², …; a dot under every k-th column picks
// b^0, b^k, b^2k, … = (b^k)^m, the place values of base B = b^k. So k neighbouring digits of base b make one digit of
// base B: binary grouped by 2, 3 and 4 is base 4, octal and hex. Dots started anywhere but 1 still step ×B, but they
// are base B shifted, and the digits don't group.
export type LiveBaseDots = { base: 2 | 3; start: number; k: number; digits: number[] };
export const COLS: Record<2 | 3, number> = { 2: 8, 3: 6 };
export const MAX_K: Record<2 | 3, number> = { 2: 4, 3: 3 };
export const placeValue = (b: number, n: number) => b ** n;
export const dotCols = (cols: number, start: number, k: number) => Array.from({ length: cols }, (_, n) => n).filter((n) => n >= start && (n - start) % k === 0);
/** Digits are lowest first. */
export const valueOf = (digits: readonly number[], b: number) => digits.reduce((s, d, n) => s + d * b ** n, 0);
/** Groups of k digits from the lowest, each read as one digit of base b^k (highest group first). */
export function groups(digits: readonly number[], b: number, k: number): { digits: number[]; value: number }[] {
  const out: { digits: number[]; value: number }[] = [];
  for (let i = 0; i < digits.length; i += k) {
    const part = digits.slice(i, i + k);
    out.push({ digits: part, value: valueOf(part, b) });
  }
  return out.reverse();
}
export const digitChar = (v: number) => (v < 10 ? String(v) : String.fromCharCode(55 + v));
export const BASE_START: LiveBaseDots = { base: 2, start: 0, k: 3, digits: [0, 1, 1, 0, 1, 1, 0, 1] };
/** Base 3's example: 2·243 + 1·81 + 0·27 + 2·9 + 1·3 + 2 = 590. */
export const BASE3_DIGITS = [2, 1, 2, 0, 1, 2];
