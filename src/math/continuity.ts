// Continuity and limits (#666). The piece `closeIn` walks two points towards x = 2 from both sides on four functions:
// a hole, a jump, an asymptote, and two pieces joined by a k the learner drags. The limit is what both sides head for;
// f is continuous at 2 when that limit exists and equals f(2).

/** The piece: which function, how close the two points are (an index into CLOSE_GAPS), and k for the joined pieces. */
export type LiveCloseIn = { which: number; step: number; k: number };
export const CLOSE_START: LiveCloseIn = { which: 0, step: 0, k: -1 };
export const CLOSE_GAPS = [1, 0.5, 0.2, 0.1, 0.01] as const;
export const BREAK_X = 2;

/** f(x) for the four functions; null where f is not defined. */
export function breakAt(which: number, k: number, x: number): number | null {
  if (which === 0) return x === BREAK_X ? null : x + 2;
  if (which === 1) return x < BREAK_X ? x + 1 : x - 2;
  if (which === 2) return x === BREAK_X ? null : 1 / (x - BREAK_X);
  return x < BREAK_X ? x * x - 1 : x + k;
}

/** The one-sided limits at x = 2 (±Infinity for the asymptote) and f(2). */
export function sidesAt(which: number, k: number): { left: number; right: number; value: number | null } {
  if (which === 2) return { left: -Infinity, right: Infinity, value: null };
  return { left: [4, 3, 0, 3][which], right: [4, 0, 0, 2 + k][which], value: breakAt(which, k, BREAK_X) };
}

/** A number to at most 4 decimal places, with a real minus. */
export const n4 = (v: number) => String(Math.round(v * 10000) / 10000 || 0).replace("-", "−");
