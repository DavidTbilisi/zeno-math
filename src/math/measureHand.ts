// A ruler and a kitchen scale worked by hand (#705). On the ruler a pencil lies still and the ruler is dragged under
// it: the marks at its two ends change but their difference does not, which is what a broken ruler with no 0 makes
// the pupil find. On the scale a known weight put on the pan moves the needle one small mark, which says what a small
// mark is worth; then fruit are read off dials whose small marks are worth 25, 50 and 20 g. The length or mass is
// tapped from three tiles; a rule is said only once the right one is tapped.
// src/live/MeasureHand.tsx draws it; everything here is plain data.

export type HandMode = "ruler" | "scale";

export type LiveMeasureHand = {
  mode: HandMode;
  /** The round being worked in each mode (its ladder's length once it is all done). */
  ruler: number;
  scale: number;
  /** Where the ruler's first mark lies on the mat, in cm from the mat's left end (halves allowed). */
  at: number;
  /** The weights on the scale's pan, in grams. */
  pan: number[];
  /** The tile tapped last in this round, and whether it was right. */
  said: { v: number; ok: boolean } | null;
};

/** The mat is this many cm wide; a ruler is RULER_LEN cm long. */
export const MAT_CM = 20;
export const RULER_LEN = 15;

export type RulerRound = {
  /** The pencil, from `a` cm along the mat, `n` cm long. */
  a: number;
  n: number;
  /** The number on the ruler's first mark: 0, or more on a broken ruler. */
  from: number;
  /** Where the ruler lies when the round starts. */
  at: number;
};
export const RULER_LADDER: RulerRound[] = [
  { a: 3, n: 7, from: 0, at: 3 },
  { a: 5, n: 8, from: 0, at: 2 },
  { a: 2, n: 6, from: 0, at: 0 },
  { a: 4, n: 6, from: 4, at: 2 },
  { a: 6, n: 9, from: 3, at: 3 },
];

export type ScaleRound = {
  /** The dial: up to `max`, labelled every `major`, a small mark every `minor`. */
  max: number;
  major: number;
  minor: number;
  /** The fruit on the pan and its mass; none in the first round, where a weight of `minor` grams is tried. */
  fruit: "pear" | "apple" | "melon" | null;
  v: number;
};
export const SCALE_LADDER: ScaleRound[] = [
  { max: 500, major: 100, minor: 25, fruit: null, v: 25 },
  { max: 500, major: 100, minor: 25, fruit: "pear", v: 275 },
  { max: 1000, major: 200, minor: 50, fruit: "apple", v: 650 },
  { max: 500, major: 100, minor: 20, fruit: "melon", v: 360 },
];

export const MEASURE_HAND_START: LiveMeasureHand = { mode: "ruler", ruler: 0, scale: 0, at: RULER_LADDER[0].at, pan: [], said: null };

export const rulerRound = (s: LiveMeasureHand) => RULER_LADDER[s.ruler] ?? null;
export const scaleRound = (s: LiveMeasureHand) => SCALE_LADDER[s.scale] ?? null;

/** The number on the ruler at a place on the mat, with the ruler's first mark at `at`. */
export const readAt = (r: RulerRound, at: number, x: number) => r.from + x - at;
/** The marks under the pencil's two ends. */
export function ends(r: RulerRound, at: number): [number, number] {
  return [readAt(r, at, r.a), readAt(r, at, r.a + r.n)];
}
/** Both ends of the pencil lie on the ruler. */
export const onRuler = (r: RulerRound, at: number) => at <= r.a && r.a + r.n <= at + (RULER_LEN - r.from);

/** The ruler dragged to `at`, snapped to half centimetres and kept on the mat. */
export function moveRuler(s: LiveMeasureHand, at: number): LiveMeasureHand {
  const r = rulerRound(s);
  const len = RULER_LEN - (r?.from ?? 0);
  const snapped = Math.round(at * 2) / 2;
  return { ...s, at: Math.max(-len + 1, Math.min(MAT_CM - 1, snapped)) };
}

/** What the scale's needle shows: the fruit and the weights on the pan, up to the dial's end. */
export function needle(s: LiveMeasureHand): number {
  const r = scaleRound(s);
  if (!r) return 0;
  return Math.min(r.max, (r.fruit ? r.v : 0) + s.pan.reduce((t, g) => t + g, 0));
}
/** The weights the tray offers in a round: in the first, the one worth a small mark, and a hundred. */
export const trayOf = (r: ScaleRound | null) => (r && !r.fruit ? [r.minor, r.major] : []);
/** A weight put on the pan, or (null) all taken off. A pan holds at most six. */
export const putWeight = (s: LiveMeasureHand, g: number | null): LiveMeasureHand =>
  g === null ? { ...s, pan: [], said: null } : s.pan.length >= 6 ? s : { ...s, pan: [...s.pan, g], said: null };
/** The weight at place i taken off the pan. */
export const takeWeight = (s: LiveMeasureHand, i: number): LiveMeasureHand => ({ ...s, pan: s.pan.filter((_, k) => k !== i), said: null });

/**
 * The tiles of a round, the right one first (the piece shows them in a fixed order of size): on the ruler the length,
 * the mark at the pencil's end, and the two marks added; on the scale the mass, each small mark taken for 1 gram, and
 * the next labelled mark. In the first scale round: what a small mark is worth.
 */
export function tiles(s: LiveMeasureHand): { right: number; slip: number; other: number } | null {
  if (s.mode === "ruler") {
    const r = rulerRound(s);
    if (!r) return null;
    // The marks under the ends where the round started: the tiles stay put while the ruler is dragged.
    const [p, q] = ends(r, r.at);
    return { right: r.n, slip: q === r.n ? q + p + 1 : q, other: p + q === r.n ? r.n + 2 : p + q };
  }
  const r = scaleRound(s);
  if (!r) return null;
  if (!r.fruit) return { right: r.minor, slip: 1, other: r.major };
  const lo = r.v - (r.v % r.major);
  return { right: r.v, slip: lo + (r.v % r.major) / r.minor, other: lo + r.major };
}

/** A tile tapped: right or not. A right answer stands until Next; a tap after it changes nothing. */
export function tap(s: LiveMeasureHand, v: number): LiveMeasureHand {
  const t = tiles(s);
  if (!t || s.said?.ok) return s;
  return { ...s, said: { v, ok: v === t.right } };
}

/** The next round of this mode, the ruler put back where that round starts and the pan emptied. */
export function next(s: LiveMeasureHand): LiveMeasureHand {
  if (s.mode === "ruler") {
    const k = Math.min(RULER_LADDER.length, s.ruler + 1);
    return { ...s, ruler: k, at: RULER_LADDER[k]?.at ?? 0, said: null };
  }
  return { ...s, scale: Math.min(SCALE_LADDER.length, s.scale + 1), pan: [], said: null };
}

/** The mode switched: what was tapped is forgotten, the rounds of both modes kept. */
export const switchMode = (s: LiveMeasureHand, mode: HandMode): LiveMeasureHand => (mode === s.mode ? s : { ...s, mode, said: null });

/** Each mode's ladder started again. */
export const again = (s: LiveMeasureHand): LiveMeasureHand =>
  s.mode === "ruler" ? { ...s, ruler: 0, at: RULER_LADDER[0].at, said: null } : { ...s, scale: 0, pan: [], said: null };
