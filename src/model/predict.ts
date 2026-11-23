// Predict, then reveal (issue #578): on a topic page, the first change to some live pieces is guessed before it is
// shown. The piece starts in `before`, the words say what change is about to be made, the learner picks what will
// happen to one quantity (up, down or the same), and the change plays from `before` to `after` in `frames` steps; the
// pick is then marked against what the quantity really did. One prediction per piece and lesson, none on a board.
//
// The three pieces are ones where the outcome surprises: a triangle's area when its top corner slides along a line
// parallel to the base (the same), a fraction tile with a bigger bottom (a smaller piece), and how far across a slope
// of length 1 goes as it gets steeper (less: cos falls as the angle grows).
import { area2, GEO_START, type LiveGeoLab } from "../math/geoLab.ts";
import { sumOf, type LiveWall } from "../math/fractionWall.ts";
import { walkParts, type LiveSlopeWalk } from "../math/slopeWalk.ts";
import type { LiveStates } from "../math/live.ts";
import type { TopicId } from "./topics.ts";

import { OUTCOMES, type Change, type PredictKind } from "./predictKinds.ts";
export { CHANGES, isPredictKind, OUTCOMES, type Change, type PredictKind } from "./predictKinds.ts";

export type Prediction<S> = {
  /** The topic page whose lesson asks it. */
  topic: TopicId;
  before: S;
  after: S;
  /** The state `i` steps of `n` along the change (0: before, n: after). */
  frame: (i: number, n: number) => S;
  /** The quantity the learner predicts. */
  measure: (s: S) => number;
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** A triangle on a base of 4 with its top corner at (1, 3), sliding along y = 3 to (3, 3). */
const tri = (x: number): LiveGeoLab => ({
  ...GEO_START,
  figs: [{ kind: "poly", pts: [[0, 0], [4, 0], [x, 3]] }],
  sel: 0,
  show: ["lengths", "heights", "grid"],
  view: { cx: 2, cy: 1.5, s: 70 },
});
const GEO: Prediction<LiveGeoLab> = {
  topic: "geometry",
  before: tri(1),
  after: tri(3),
  frame: (i, n) => tri(lerp(1, 3, i / n)),
  measure: (s) => {
    const f = s.figs[0];
    return f.kind === "poly" ? Math.abs(area2(f.pts)) / 2 : NaN;
  },
};

/** The first puzzle of the fraction wall (⅛ given, ⅞ to fill) with a ¼ tile in the gap, swapped for a ⅛ tile. */
const wall = (tile: number): LiveWall => ({ mode: "puzzle", stage: 0, level: 1, seed: 1, placed: [tile], best: 0, streak: 0, said: null });
const WALL: Prediction<LiveWall> = {
  topic: "fractions",
  before: wall(4),
  after: wall(8),
  frame: (i, n) => wall(i < n / 2 ? 4 : 8),
  measure: (s) => sumOf(s.placed).toNumber(),
};

/** A walker at the top of the slope, the slope turned from 30° to 60°: how far across they are. */
const slope = (theta: number): LiveSlopeWalk => ({ theta: Math.round(theta), at: 100 });
const SLOPE: Prediction<LiveSlopeWalk> = {
  topic: "trigonometry",
  before: slope(30),
  after: slope(60),
  frame: (i, n) => slope(lerp(30, 60, i / n)),
  measure: (s) => walkParts(s).far,
};

export const PREDICTIONS = { geoLab: GEO, fractionWall: WALL, slopeWalk: SLOPE } as const satisfies {
  [K in keyof LiveStates]?: Prediction<LiveStates[K]>;
};

/** What the quantity really did from before to after (a change under a thousandth is the same). */
export function outcomeOf<S>(p: Prediction<S>): Change {
  const d = p.measure(p.after) - p.measure(p.before);
  return Math.abs(d) < 1e-3 ? "same" : d > 0 ? "up" : "down";
}

// ---------- what this browser has predicted ----------

export type Guess = { pick: Change; right: boolean; at: number };
const KEY = "zeno.predictions.v1";

export function readGuesses(): Partial<Record<PredictKind, Guess>> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    return v && typeof v === "object" ? (v as Partial<Record<PredictKind, Guess>>) : {};
  } catch {
    return {};
  }
}
/** The first prediction on a piece is the one kept: a replay shows the change again but asks nothing new. */
export function keepGuess(kind: PredictKind, pick: Change): Guess {
  const all = readGuesses();
  const g = all[kind] ?? { pick, right: pick === OUTCOMES[kind], at: Date.now() };
  all[kind] = g;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage full or off: the guess is still marked on the page
  }
  return g;
}
