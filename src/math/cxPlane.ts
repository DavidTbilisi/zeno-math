// The complex plane, found by tapping points (#732). Each round asks for one point: a number plotted, a sum, i times
// a number, a conjugate. A tap on the plane answers; a wrong one is named for what it is (the parts swapped, the
// difference for the sum, the turn the wrong way, i² taken as +1, the other mirror, the number negated), and the
// right one draws what it shows (the parts across and up, the arrows end to end, the quarter turn, the mirror in the
// real axis) before the rule is said. src/live/CxPlane.tsx draws it; everything here is plain data.

/** A point of the plane: [real part, imaginary part]. */
export type Pt = readonly [number, number];

export type CxKind = "plot" | "add" | "times" | "conj";
/** One round: what is asked, of z (and w for a sum). */
export type CxRound = { kind: CxKind; z: Pt; w?: Pt };

export const CX_LADDER: CxRound[] = [
  { kind: "plot", z: [3, 2] },
  { kind: "add", z: [2, 1], w: [1, 3] },
  { kind: "times", z: [3, 1] },
  { kind: "conj", z: [2, 3] },
];

/** The plane runs from LO to HI on both axes. */
export const LO = -5;
export const HI = 5;

export type LiveCxPlane = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** The point tapped last this round. */
  tapped: Pt | null;
  /** Whether it was the right one. */
  ok: boolean;
};

export const CX_PLANE_START: LiveCxPlane = { round: 0, tapped: null, ok: false };

export const roundOf = (s: LiveCxPlane) => CX_LADDER[s.round] ?? null;

const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

/** The point the round asks for. */
export function target(r: CxRound): Pt {
  const [a, b] = r.z;
  if (r.kind === "add") return [a + r.w![0], b + r.w![1]];
  if (r.kind === "times") return [-b, a];
  if (r.kind === "conj") return [a, -b];
  return [a, b];
}

export type CxMiss = "swapped" | "minus" | "wrongWay" | "iPlus" | "otherMirror" | "negated" | "other";

/** What a wrong point is: the slip it shows, or just another point. */
export function missOf(r: CxRound, p: Pt): CxMiss | null {
  if (same(p, target(r))) return null;
  const [a, b] = r.z;
  if (r.kind === "plot" && same(p, [b, a])) return "swapped";
  if (r.kind === "add" && (same(p, [a - r.w![0], b - r.w![1]]) || same(p, [r.w![0] - a, r.w![1] - b]))) return "minus";
  if (r.kind === "times" && same(p, [b, -a])) return "wrongWay";
  if (r.kind === "times" && same(p, [b, a])) return "iPlus";
  if (r.kind === "conj" && same(p, [-a, b])) return "otherMirror";
  if (r.kind === "conj" && same(p, [-a, -b])) return "negated";
  return "other";
}

/** A point tapped: kept on the plane; a right answer stands until Next. */
export function tap(s: LiveCxPlane, p: Pt): LiveCxPlane {
  const r = roundOf(s);
  if (!r || s.ok) return s;
  const q: Pt = [Math.max(LO, Math.min(HI, Math.round(p[0]))), Math.max(LO, Math.min(HI, Math.round(p[1])))];
  return { ...s, tapped: q, ok: same(q, target(r)) };
}

/** The next round, nothing tapped yet. */
export const next = (s: LiveCxPlane): LiveCxPlane => ({ round: Math.min(CX_LADDER.length, s.round + 1), tapped: null, ok: false });

/** The ladder started again. */
export const again = (): LiveCxPlane => CX_PLANE_START;

/** A point as a number: "3 + 2i", "−1 + 3i", "2 − 3i", "4i", "−5", "0". */
export function cxSay([a, b]: Pt): string {
  const m = (v: number) => String(v).replace(/^-/, "−");
  const im = (v: number) => (Math.abs(v) === 1 ? "i" : `${Math.abs(v)}i`);
  if (!b) return m(a);
  if (!a) return `${b < 0 ? "−" : ""}${im(b)}`;
  return `${m(a)} ${b < 0 ? "−" : "+"} ${im(b)}`;
}
