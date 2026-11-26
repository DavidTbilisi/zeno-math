// A percent bar worked by hand (#707). The bar is a whole amount, 0 % to 100 % along its top. Its shade is dragged:
// in the "of" rounds to the percent asked, and once it is there the bar shows itself cut into equal parts, each with
// what it is worth, so p % is a count of parts and the amount is that count times one part. In the "whole" rounds the
// shade is given with its amount and can only be dragged back, never past what is known: it says what each smaller
// share is worth, and the whole is so many of those. In the "what" rounds the shade says how much it holds, and the
// percent is read off the top once it holds the amount asked. Each round is answered on three tiles; the rule is said
// only once the right one is tapped.
// src/live/PercentHand.tsx draws it; everything here is plain data.

export type PercentRound =
  | { kind: "of"; whole: number; p: number }
  | { kind: "whole"; p: number; given: number }
  | { kind: "what"; whole: number; part: number };

export const PERCENT_LADDER: PercentRound[] = [
  { kind: "of", whole: 80, p: 50 },
  { kind: "of", whole: 80, p: 25 },
  { kind: "of", whole: 120, p: 10 },
  { kind: "of", whole: 120, p: 30 },
  { kind: "of", whole: 60, p: 75 },
  { kind: "whole", p: 40, given: 36 },
  { kind: "whole", p: 25, given: 15 },
  { kind: "what", whole: 72, part: 18 },
  { kind: "what", whole: 70, part: 21 },
];

export type LivePercentHand = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** Where the shade ends, in percent of the bar. */
  at: number;
  /** The tile tapped last in this round, and whether it was right. */
  said: { v: number; ok: boolean } | null;
};

/** The shade a round starts with: none, or in a "whole" round the part that is known. */
export const startAt = (r: PercentRound | undefined) => (r?.kind === "whole" ? r.p : 0);
export const PERCENT_HAND_START: LivePercentHand = { round: 0, at: startAt(PERCENT_LADDER[0]), said: null };

export const roundOf = (s: LivePercentHand) => PERCENT_LADDER[s.round] ?? null;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const clean = (v: number) => Number(v.toFixed(2));

/** The percent a part's worth is shown for: the part 100 % and the asked percent are both made of. */
export const stepOf = (p: number) => gcd(p, 100);

/** The whole amount of the bar: given, or (in a "whole" round) what is being found. */
export const wholeOf = (r: PercentRound) => (r.kind === "whole" ? (r.given * 100) / r.p : r.whole);

/** What the shade holds when it ends at `at` %: shown in the "whole" and "what" rounds, not in the "of" ones. */
export const shadeHolds = (r: PercentRound, at: number) => clean((wholeOf(r) * at) / 100);

/** The shade dragged to `at` %, snapped to 5 % and kept on the bar; in a "whole" round no further than is known. */
export function moveShade(s: LivePercentHand, at: number): LivePercentHand {
  const r = roundOf(s);
  if (!r) return s;
  const top = r.kind === "whole" ? r.p : 100;
  return { ...s, at: Math.max(0, Math.min(top, Math.round(at / 5) * 5)) };
}

/** In an "of" round the bar shows its parts, each with its worth, once the shade is at the percent asked. */
export const partsShown = (s: LivePercentHand) => {
  const r = roundOf(s);
  return r?.kind === "of" && s.at === r.p;
};

/**
 * The tiles of a round, the right one first (the piece shows them in order of size): of, the amount, the percent
 * taken for it, and the part left over; whole, the whole, one part taken for it, and the known amount and percent
 * added; what, the percent, the amount taken for it, and the rest of 100.
 */
export function tiles(s: LivePercentHand): { right: number; slip: number; other: number } | null {
  const r = roundOf(s);
  if (!r) return null;
  const distinct = (right: number, slip: number, other: number) => ({ right, slip, other: other === right || other === slip ? right * 2 : other });
  if (r.kind === "of") {
    const v = (r.whole * r.p) / 100;
    return distinct(v, r.p, r.whole - v);
  }
  if (r.kind === "whole") {
    const step = stepOf(r.p);
    return distinct(wholeOf(r), (r.given * step) / r.p, r.given + r.p);
  }
  const v = (r.part * 100) / r.whole;
  return distinct(v, r.part, 100 - v);
}

/** The numbers each round's rule is said with. */
export function ruleOf(r: PercentRound): Record<string, number> {
  if (r.kind === "of") {
    const s = stepOf(r.p);
    const u = (r.whole * s) / 100;
    return { p: r.p, s, k: r.p / s, n: 100 / s, a: r.whole, u, v: (r.whole * r.p) / 100 };
  }
  if (r.kind === "whole") {
    const s = stepOf(r.p);
    const u = (r.given * s) / r.p;
    return { p: r.p, g: r.given, s, k: r.p / s, u, n: 100 / s, v: wholeOf(r) };
  }
  return { a: r.part, b: r.whole, f: clean(r.part / r.whole), v: (r.part * 100) / r.whole };
}

/**
 * A tile tapped: right or not. In an "of" round it counts only once the shade is at the percent asked: the bar is
 * shaded first. A right answer stands until Next; a tap after it changes nothing.
 */
export function tap(s: LivePercentHand, v: number): LivePercentHand {
  const t = tiles(s);
  const r = roundOf(s);
  if (!t || !r || s.said?.ok) return s;
  return { ...s, said: { v, ok: v === t.right && (r.kind !== "of" || s.at === r.p) } };
}

/** The next round, its shade where that round starts. */
export function next(s: LivePercentHand): LivePercentHand {
  const k = Math.min(PERCENT_LADDER.length, s.round + 1);
  return { round: k, at: startAt(PERCENT_LADDER[k]), said: null };
}

/** The ladder started again. */
export const again = (): LivePercentHand => PERCENT_HAND_START;
