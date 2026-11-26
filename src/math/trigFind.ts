// Trig identities and the sine and cosine rules worked by hand (#716). One point is moved by dragging, by pressing where
// it should go, or with the arrow keys, and what the round is about is read off as it moves; only once the point has
// been moved to a few places does the right tile count, so the rule is found by watching what stays the same before it
// is said. Rounds: P round the unit circle (sin²θ + cos²θ), P and its mirror in the up axis (sin(180° − θ)), C round
// the circle through a triangle's corners (a ÷ sin A = b ÷ sin B = c ÷ sin C) and the angle between two sides opened
// (when c² = a² + b², and by how much it misses otherwise). src/live/TrigFind.tsx draws it; everything here is data.

export type TrigRound = { kind: "pyth" } | { kind: "mirror" } | { kind: "sine" } | { kind: "cosine" };

export const TRIG_LADDER: TrigRound[] = [{ kind: "pyth" }, { kind: "mirror" }, { kind: "sine" }, { kind: "cosine" }];

export type LiveTrigFind = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** The angle being moved, in degrees: θ round the circle, C's place on the circle, or the angle at C. */
  t: number;
  /** How many times the point has been moved somewhere new this round (at most 3). */
  seen: number;
  /** Where the point was when it last counted as moved. */
  from: number;
  /** The tile tapped last in this round, and whether it was right. */
  said: { v: string; ok: boolean } | null;
};

const START: Record<TrigRound["kind"], number> = { pyth: 35, mirror: 40, sine: 95, cosine: 60 };
const at = (round: number): LiveTrigFind => {
  const t = START[TRIG_LADDER[round]?.kind ?? "pyth"];
  return { round, t, seen: 0, from: t, said: null };
};
export const TRIG_FIND_START: LiveTrigFind = at(0);
/** Moves needed before a right tile counts. */
export const MOVES = 2;
/** Where A and B sit on the circle in the sine-rule round, in degrees round its centre. */
export const SINE_A = 205;
export const SINE_B = 335;
/** The circle's radius in the sine-rule round, in the units the sides are read in. */
export const SINE_R = 4;
/** The two sides that hold the angle C in the cosine-rule round: CB = a, CA = b. */
export const SIDE_A = 3;
export const SIDE_B = 4;

export const roundOf = (s: LiveTrigFind) => TRIG_LADDER[s.round] ?? null;

/** The range the angle keeps to, in degrees; the unit-circle rounds go all the way round. */
export function rangeOf(r: TrigRound): [number, number] {
  if (r.kind === "sine") return [SINE_B - 360 + 14, SINE_A - 14];
  if (r.kind === "cosine") return [20, 160];
  return [0, 359];
}

const turn = (a: number) => ((Math.round(a) % 360) + 360) % 360;
/** How far apart two angles are, the short way round. */
const apart = (a: number, b: number) => Math.min(Math.abs(a - b) % 360, 360 - (Math.abs(a - b) % 360));

/** The angle moved to t: counted as moved once it has gone far enough from where it last was. */
export function move(s: LiveTrigFind, t: number): LiveTrigFind {
  const r = roundOf(s);
  if (!r) return s;
  let nt: number;
  if (r.kind === "pyth" || r.kind === "mirror") nt = turn(t);
  else {
    const [lo, hi] = rangeOf(r);
    let v = t;
    while (v < lo - 180 + (hi - lo) / 2) v += 360;
    while (v > hi + 180 - (hi - lo) / 2) v -= 360;
    nt = Math.max(lo, Math.min(hi, Math.round(v)));
  }
  return apart(nt, s.from) >= 15 ? { ...s, t: nt, seen: Math.min(3, s.seen + 1), from: nt } : { ...s, t: nt };
}

const rad = (d: number) => (d * Math.PI) / 180;
const dp = (v: number, n: number) => Math.round(v * 10 ** n) / 10 ** n + 0;
export const onCircle = (deg: number, k = 1): [number, number] => [k * Math.cos(rad(deg)), k * Math.sin(rad(deg))];

/** The degrees of the angle at P between the rays to Q and R. */
function angleAt(p: [number, number], q: [number, number], r: [number, number]): number {
  const a = Math.atan2(q[1] - p[1], q[0] - p[0]) - Math.atan2(r[1] - p[1], r[0] - p[0]);
  const d = Math.abs((a * 180) / Math.PI) % 360;
  return d > 180 ? 360 - d : d;
}

/** The sine-rule triangle: A and B fixed on the circle of radius SINE_R, C at angle t on it. */
export function sineTriangle(t: number): Record<"A" | "B" | "C", [number, number]> {
  return { A: onCircle(SINE_A, SINE_R), B: onCircle(SINE_B, SINE_R), C: onCircle(t, SINE_R) };
}

/** What the round shows as the point moves. Angles to the nearest degree, lengths and ratios to two places. */
export function readings(s: LiveTrigFind): Record<string, number> {
  const r = roundOf(s);
  if (!r) return {};
  const t = s.t;
  if (r.kind === "pyth") {
    const [c, n] = [Math.cos(rad(t)), Math.sin(rad(t))];
    return { t, sin: dp(n, 2), cos: dp(c, 2), sin2: dp(n * n, 2), cos2: dp(c * c, 2), sum: dp(n * n + c * c, 2) };
  }
  if (r.kind === "mirror")
    return { t, u: 180 - t, sinP: dp(Math.sin(rad(t)), 2), sinQ: dp(Math.sin(rad(180 - t)), 2), cosP: dp(Math.cos(rad(t)), 2), cosQ: dp(Math.cos(rad(180 - t)), 2) };
  if (r.kind === "sine") {
    const { A, B, C } = sineTriangle(t);
    const len = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const [a, b, c] = [len(B, C), len(A, C), len(A, B)];
    const [aA, aB, aC] = [angleAt(A, B, C), angleAt(B, A, C), angleAt(C, A, B)];
    return {
      // The angles rounded so the three still make 180°.
      A: Math.round(aA), B: 180 - Math.round(aA) - Math.round(aC), C: Math.round(aC), a: dp(a, 2), b: dp(b, 2), c: dp(c, 2),
      ra: dp(a / Math.sin(rad(aA)), 2), rb: dp(b / Math.sin(rad(aB)), 2), rc: dp(c / Math.sin(rad(aC)), 2),
    };
  }
  const c2 = SIDE_A ** 2 + SIDE_B ** 2 - 2 * SIDE_A * SIDE_B * Math.cos(rad(t));
  return { C: t, sum: SIDE_A ** 2 + SIDE_B ** 2, c2: dp(c2, 1), gap: dp(SIDE_A ** 2 + SIDE_B ** 2 - c2, 1), twoab: dp(2 * SIDE_A * SIDE_B * Math.cos(rad(t)), 1) };
}

/** A round's tiles, the right one first; each is a key of the piece's words. */
export function tiles(s: LiveTrigFind): { right: string; slip: string; other: string } | null {
  const r = roundOf(s);
  if (!r) return null;
  if (r.kind === "pyth") return { right: "one", slip: "depends", other: "two" };
  if (r.kind === "mirror") return { right: "sameSin", slip: "oppositeSin", other: "cosOf" };
  if (r.kind === "sine") return { right: "allEqual", slip: "onlyIsosceles", other: "ratioGrows" };
  return { right: "only90", slip: "always", other: "never" };
}

/** The tiles in the order they are shown: turned round by one place each round, so the right one is not always first. */
export function order(s: LiveTrigFind): string[] {
  const t = tiles(s);
  if (!t) return [];
  const list = [t.right, t.slip, t.other];
  const k = (s.round * 2) % 3;
  return [...list.slice(k), ...list.slice(0, k)];
}

/** A tile tapped: right only once the point has been moved to a few places. A right answer stands until Next. */
export function tap(s: LiveTrigFind, v: string): LiveTrigFind {
  const t = tiles(s);
  if (!t || s.said?.ok) return s;
  return { ...s, said: { v, ok: v === t.right && s.seen >= MOVES } };
}

/** The next round, its point back where the round starts it. */
export const next = (s: LiveTrigFind): LiveTrigFind => at(Math.min(TRIG_LADDER.length, s.round + 1));

/** The ladder started again. */
export const again = (): LiveTrigFind => TRIG_FIND_START;
