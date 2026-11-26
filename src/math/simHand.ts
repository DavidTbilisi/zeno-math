// Similar triangles worked by hand (#714). A right triangle ABC stands on the board beside a copy of it, A′B′C′, which
// the learner stretches by dragging its corner (or pressing where it should end, or the arrow keys). In the "side"
// rounds the copy is stretched until A′B′ reaches a mark; there every side of the copy shows that it grew by the same
// number, and only then does the right tile count: the side asked is that number times the old one, not the old one
// plus what A′B′ gained. In the "angle" round the corner at A′ stays as it was however far the copy is stretched. In
// the "test" rounds a second triangle DEF is drawn dashed, and the copy is stretched until A′B′ lies along DE: then it
// covers DEF, or a side sticks out and no stretch fits. The last round is a stick and its shadow, stretched along the
// ground to a tree's shadow. The rule is said only once the right tile is tapped.
// src/live/SimHand.tsx draws it; everything here is plain data.

export type SimRound =
  | { kind: "side"; base: number; height: number; k: number; ask: "height" | "hyp" }
  | { kind: "angle"; base: number; height: number; k: number }
  | { kind: "test"; base: number; height: number; other: [number, number] }
  | { kind: "shadow"; base: number; height: number; k: number };

export const SIM_LADDER: SimRound[] = [
  { kind: "side", base: 3, height: 4, k: 2, ask: "height" },
  { kind: "side", base: 4, height: 3, k: 1.5, ask: "hyp" },
  { kind: "angle", base: 4, height: 3, k: 3 },
  { kind: "test", base: 3, height: 4, other: [6, 9] },
  { kind: "test", base: 4, height: 3, other: [10, 7.5] },
  { kind: "shadow", base: 3, height: 2, k: 4 },
];

export type LiveSimHand = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** How many times as big as ABC the copy is. */
  k: number;
  /** The tile tapped last in this round, and whether it was right. */
  said: { v: string; ok: boolean } | null;
};

export const SIM_HAND_START: LiveSimHand = { round: 0, k: 1, said: null };
export const K_MIN = 0.5;
export const K_MAX = 4;

export const roundOf = (s: LiveSimHand) => SIM_LADDER[s.round] ?? null;

/** A length as it is shown: at most two decimals. */
export const fmt = (v: number) => String(Number(v.toFixed(2)));
export const hypOf = (r: SimRound) => Math.hypot(r.base, r.height);
/** The angle at A, between AB and AC, to the nearest degree. */
export const angleA = (r: SimRound) => Math.round((Math.atan2(r.height, r.base) * 180) / Math.PI);

/** The stretch the round is worked at: given, or (in a test round) the one that lays A′B′ along DE. */
export const targetOf = (r: SimRound) => (r.kind === "test" ? r.other[0] / r.base : r.k);

/** The copy stretched to k, snapped to halves and kept between K_MIN and K_MAX. */
export function stretch(s: LiveSimHand, k: number): LiveSimHand {
  if (!roundOf(s)) return s;
  return { ...s, k: Math.max(K_MIN, Math.min(K_MAX, Math.round(k * 2) / 2)) };
}

/** Whether the copy is at the stretch the round is worked at: the copy then shows how each side grew. */
export const atTarget = (s: LiveSimHand) => {
  const r = roundOf(s);
  return !!r && s.k === targetOf(r);
};

/** Whether DEF is a stretched copy of ABC: one number takes both legs onto DEF's. */
export const similarOf = (r: Extract<SimRound, { kind: "test" }>) => r.other[0] * r.height === r.other[1] * r.base;

/**
 * A round's tiles, the right one first (the piece shows them in order): side, the side times k, the old side plus what
 * A′B′ gained, and another side times k; angle, the angle, the angle times k, and the other sharp angle; test, yes or
 * no; shadow, the tree's height, the stick plus what the shadow gained, and the shadow divided by the stick.
 */
export function tiles(s: LiveSimHand): { right: string; slip: string; other?: string } | null {
  const r = roundOf(s);
  if (!r) return null;
  if (r.kind === "test") return similarOf(r) ? { right: "yes", slip: "no" } : { right: "no", slip: "yes" };
  if (r.kind === "angle") return { right: fmt(angleA(r)), slip: fmt(angleA(r) * r.k), other: fmt(90 - angleA(r)) };
  const gain = (r.k - 1) * r.base;
  if (r.kind === "shadow") return { right: fmt(r.height * r.k), slip: fmt(r.height + gain), other: fmt((r.base * r.k) / r.height) };
  const [side, rest] = r.ask === "height" ? [r.height, hypOf(r)] : [hypOf(r), r.height];
  return { right: fmt(side * r.k), slip: fmt(side + gain), other: fmt(rest * r.k) };
}

/** The numbers each round's rule (and its looks) are said with. */
export function ruleOf(r: SimRound): Record<string, string> {
  if (r.kind === "test") {
    const [de, ef] = r.other;
    return { ab: fmt(r.base), bc: fmt(r.height), de: fmt(de), ef: fmt(ef), k: fmt(de / r.base), m: fmt(ef / r.height), c: fmt((de / r.base) * r.height) };
  }
  if (r.kind === "angle") return { k: fmt(r.k), v: fmt(angleA(r)) };
  if (r.kind === "shadow") return { k: fmt(r.k), h: fmt(r.height), s: fmt(r.base), t: fmt(r.base * r.k), v: fmt(r.height * r.k) };
  const o = r.ask === "height" ? r.height : hypOf(r);
  return { k: fmt(r.k), t: fmt(r.base * r.k), o: fmt(o), v: fmt(o * r.k), s: r.ask === "height" ? "B′C′" : "A′C′" };
}

/** A tile tapped: right only once the copy is at the round's stretch. A right answer stands until Next. */
export function tap(s: LiveSimHand, v: string): LiveSimHand {
  const t = tiles(s);
  if (!t || s.said?.ok) return s;
  return { ...s, said: { v, ok: v === t.right && atTarget(s) } };
}

/** The next round, its copy back at the size of ABC. */
export function next(s: LiveSimHand): LiveSimHand {
  return { round: Math.min(SIM_LADDER.length, s.round + 1), k: 1, said: null };
}

/** The ladder started again. */
export const again = (): LiveSimHand => SIM_HAND_START;
