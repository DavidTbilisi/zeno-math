// Transformations of functions (#662). y = a·f(x − h) + k is y = f(x) moved right h and up k, its heights multiplied
// by a (a minus flips it). The shift inside the bracket has the opposite sign to the move: the old point at x = 0 now
// sits where x − h = 0, at x = h. The piece `moveGraph` has the learner drag a graph and watch the formula follow.

/** The piece: the parent graph, its key point moved to (h, k), and the stretch a. */
export type LiveMoveGraph = { parent: number; h: number; k: number; a: number };
export const MOVE_START: LiveMoveGraph = { parent: 0, h: 0, k: 0, a: 1 };
export const MOVE_MAX = 5;
export const STRETCH_MAX = 3;
/** The parents: x², |x| and √x, each with its key point at the origin. */
export const PARENTS: readonly { name: string; f: (x: number) => number; from: number }[] = [
  { name: "x²", f: (x) => x * x, from: -Infinity },
  { name: "|x|", f: (x) => Math.abs(x), from: -Infinity },
  { name: "√x", f: (x) => Math.sqrt(x), from: 0 },
];
/** The moved graph's height at x, or NaN outside its domain. */
export function movedAt(s: LiveMoveGraph, x: number) {
  const p = PARENTS[s.parent];
  return x - s.h < p.from ? NaN : s.a * p.f(x - s.h) + s.k;
}
/** y = a·f(x − h) + k written out, with real minus signs. */
export function formulaOf(s: LiveMoveGraph) {
  const inner = s.h === 0 ? "x" : `x ${s.h > 0 ? "−" : "+"} ${Math.abs(s.h)}`;
  const body = s.parent === 0 ? (s.h === 0 ? "x²" : `(${inner})²`) : s.parent === 1 ? `|${inner}|` : `√(${inner})`;
  const lead = s.a === 1 ? "" : s.a === -1 ? "−" : String(s.a).replace("-", "−");
  const tail = s.k === 0 ? "" : ` ${s.k > 0 ? "+" : "−"} ${Math.abs(s.k)}`;
  return `y = ${lead}${body}${tail}`;
}
