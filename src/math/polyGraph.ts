// Polynomial graphs (#659). y = s·(x − z₁)^m₁ … is 0 at each zᵢ; it crosses the x-axis where the power is odd and
// touches and turns back where it is even, since only an odd power changes the bracket's sign. Far out the leading
// term wins: the right end follows the leading sign, and the left end the same for an even degree, the opposite for
// an odd one. The piece `polyShape` puts three zeros on the axis whose powers and leading sign the learner changes.

/** The piece: the powers at −3, 0 and 2, and the leading sign. */
export type LivePolyShape = { m: number[]; lead: number };
export const POLY_START: LivePolyShape = { m: [1, 2, 1], lead: 1 };
export const POLY_ZEROS = [-3, 0, 2] as const;
/** A tap on a zero: its power goes 1, 2, 3 and round again. */
export const nextPower = (s: LivePolyShape, i: number): LivePolyShape => ({ ...s, m: s.m.map((m, j) => (j === i ? (m % 3) + 1 : m)) });
/** The polynomial before any scaling. */
export const polyAt = (zeros: readonly number[], m: readonly number[], lead: number, x: number) => zeros.reduce((p, z, i) => p * (x - z) ** m[i], lead);
/** The signs of the left and right ends, +1 up and −1 down. */
export const endsOf = (degree: number, lead: number): [number, number] => [lead * (degree % 2 ? -1 : 1), lead];
/** A scale making the biggest |y| between the outer zeros (a little past them) equal to `top`. */
export function scaleFor(zeros: readonly number[], m: readonly number[], top: number) {
  const [lo, hi] = [Math.min(...zeros) - 0.4, Math.max(...zeros) + 0.4];
  let big = 0;
  for (let x = lo; x <= hi; x += 0.02) big = Math.max(big, Math.abs(polyAt(zeros, m, 1, x)));
  return top / big;
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** A power as superscript digits, nothing for 1. */
export const sup = (n: number) => (n === 1 ? "" : [...String(n)].map((d) => SUP[Number(d)]).join(""));
/** (x − z)^m written out: x for z = 0. */
export const factorText = (z: number, m: number) => (z === 0 ? `x${sup(m)}` : `(x ${z > 0 ? "−" : "+"} ${Math.abs(z)})${sup(m)}`);
/** y = ±(x − z₁)^m₁ … written out. */
export const polyText = (zeros: readonly number[], m: readonly number[], lead: number) =>
  `y = ${lead < 0 ? "−" : ""}${zeros.map((z, i) => factorText(z, m[i])).join("")}`;
