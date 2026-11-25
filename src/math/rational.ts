// Rational functions (#660). y = top ÷ bottom has no value where the bottom is 0: if the top is not 0 there, the
// bottom is tiny nearby and y huge, a vertical asymptote; if the top is 0 too, a factor cancels and the graph has only
// a hole. Far out the highest powers win: equal degrees give a horizontal asymptote at the ratio of the leading
// coefficients, a top one degree higher a slant line. The piece `asymptoteWalk` walks a point along three graphs.

/** The piece: which function, and x in tenths. */
export type LiveAsymptoteWalk = { which: number; v: number };
export const WALK_START: LiveAsymptoteWalk = { which: 0, v: 30 };
export const WALK_MAX = 60;
export type WalkFn = { top: (x: number) => number; bottom: (x: number) => number; topText: string; bottomText: string; wall: number; kind: "flat" | "hole" | "slant"; line: (x: number) => number };
export const WALK_FNS: readonly WalkFn[] = [
  { top: (x) => 2 * x + 1, bottom: (x) => x - 1, topText: "2x + 1", bottomText: "x − 1", wall: 1, kind: "flat", line: () => 2 },
  { top: (x) => x * x - 4, bottom: (x) => x - 2, topText: "x² − 4", bottomText: "x − 2", wall: 2, kind: "hole", line: (x) => x + 2 },
  { top: (x) => x * x + 1, bottom: (x) => x - 1, topText: "x² + 1", bottomText: "x − 1", wall: 1, kind: "slant", line: (x) => x + 1 },
];
/** A number to at most 2 decimal places, with a real minus sign. */
export const short = (v: number) => String(Math.round(v * 100) / 100 || 0).replace("-", "−");
