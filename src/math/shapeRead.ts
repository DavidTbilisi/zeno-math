// The shape of a graph read from f′ and f″ (#746). f, f′ and f″ are drawn one above the other on a shared x-axis, and
// the learner drags a line across all three. The first rounds show all three graphs and ask for a place on f (where it
// stops rising, where it is lowest, where its bending changes); a line put elsewhere is named by what f′ or f″ says
// there, and each round once found says the rule it shows. The last rounds hide f and ask for the same places from
// f′ alone, the rule now used rather than seen. src/live/ShapeRead.tsx draws it.

/** A polynomial as its coefficients, constant first. */
export type Poly = readonly number[];

export const evalP = (p: Poly, x: number) => p.reduceRight((s, c) => s * x + c, 0);
export const derivP = (p: Poly): Poly => p.slice(1).map((c, i) => c * (i + 1));

export type ShapeAsk = "max" | "min" | "inflect";
/** A round: f, what to find on it, where it is, and whether f (and f″) are shown. */
export type ShapeRound = { f: Poly; ask: ShapeAsk; target: number; showF: boolean; showF2: boolean };

export const SHAPE_ROUNDS: readonly ShapeRound[] = [
  // f = x³/12 − x: f′ = x²/4 − 1, f″ = x/2. A maximum at −2, a minimum at 2, the bending changes at 0.
  { f: [0, -1, 0, 1 / 12], ask: "max", target: -2, showF: true, showF2: true },
  { f: [0, -1, 0, 1 / 12], ask: "min", target: 2, showF: true, showF2: true },
  // f = −(x − 1)³/12 + x = (1 + 9x + 3x² − x³)/12: f″ = (1 − x)/2, so the bending changes at 1.
  { f: [1 / 12, 3 / 4, 1 / 4, -1 / 12], ask: "inflect", target: 1, showF: true, showF2: true },
  // f′ = (x + 1)(x − 3)/4 = (x² − 2x − 3)/4: f falls then rises at 3.
  { f: [0, -3 / 4, -1 / 4, 1 / 12], ask: "min", target: 3, showF: false, showF2: false },
  // f′ = 2 − (x − 1)²/2 = (3 + 2x − x²)/2: f′ is largest at 1, where f bends the other way.
  { f: [0, 3 / 2, 1 / 2, -1 / 6], ask: "inflect", target: 1, showF: false, showF2: false },
];

/** The line moves in quarters, from −X_FAR to X_FAR. */
export const X_STEP = 0.25;
export const X_FAR = 4;

export type LiveShapeRead = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** Where the line is. */
  x: number;
  /** Whether the line has been let go at least once this round. */
  tried: boolean;
};

/** Each round starts with the line away from what it asks for. */
const startOf = (r: ShapeRound | undefined) => (r && r.target < 0 ? 1 : -3);
export const SHAPE_READ_START: LiveShapeRead = { round: 0, x: startOf(SHAPE_ROUNDS[0]), tried: false };

export const roundOf = (s: LiveShapeRead) => SHAPE_ROUNDS[s.round] ?? null;

export const snapX = (x: number) => Math.max(-X_FAR, Math.min(X_FAR, Math.round(x / X_STEP) * X_STEP)) || 0;

export function done(s: LiveShapeRead): boolean {
  const r = roundOf(s);
  return !!r && s.tried && s.x === r.target;
}

/** The line moved to x; `tried` once it is let go. Nothing moves once the round is done. */
export function moveLine(s: LiveShapeRead, x: number, letGo: boolean): LiveShapeRead {
  if (!roundOf(s) || done(s)) return s;
  return { ...s, x: snapX(x), tried: s.tried || letGo };
}

/** Why the line is not right: f still rising or already falling (f′'s sign), the other kind of turn, or f bending up or down (f″'s sign). */
export type ShapeMiss = "rising" | "falling" | "otherTurn" | "bendUp" | "bendDown";

const sign = (v: number) => (Math.abs(v) < 1e-9 ? 0 : Math.sign(v));

export function missOf(r: ShapeRound, x: number): ShapeMiss | null {
  if (x === r.target) return null;
  const d1 = derivP(r.f);
  if (r.ask === "inflect") return evalP(derivP(d1), x) > 0 ? "bendUp" : "bendDown";
  const s = sign(evalP(d1, x));
  return s > 0 ? "rising" : s < 0 ? "falling" : "otherTurn";
}

/** The values of f, f′ and f″ at x, rounded to two places, for the reading under the graphs. */
export function readAt(r: ShapeRound, x: number): [number, number, number] {
  const d1 = derivP(r.f);
  const r2 = (v: number) => Math.round(v * 100) / 100 || 0;
  return [r2(evalP(r.f, x)), r2(evalP(d1, x)), r2(evalP(derivP(d1), x))];
}

export const next = (s: LiveShapeRead): LiveShapeRead => {
  const round = Math.min(SHAPE_ROUNDS.length, s.round + 1);
  return { round, x: startOf(SHAPE_ROUNDS[round]), tried: false };
};
export const again = (): LiveShapeRead => SHAPE_READ_START;
