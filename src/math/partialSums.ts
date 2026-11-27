// The sum of a series seen as where its partial sums go (#751). Bars stand for S₁, S₂, S₃, … of a geometric series and
// the learner drags a line to the number they close in on. The first rounds show twelve bars, so the limit can be
// seen: 1/2 + 1/4 + … closing in on 1, 1 + 2/3 + … on 3, and 1 − 1/2 + 1/4 − … jumping either side of 2/3. A line put
// too low is passed by the sums; one put too high is never reached. Once found, each round says the rule it shows,
// a/(1 − r); the last rounds show only three bars, so the place must come from the rule. src/live/PartialSums.tsx
// draws it.

/** A round: the first term and the ratio as fractions, how many bars are shown, and the line's step and top. */
export type SumsRound = { a: readonly [number, number]; r: readonly [number, number]; shown: number; step: number; top: number };

export const SUMS_ROUNDS: readonly SumsRound[] = [
  { a: [1, 2], r: [1, 2], shown: 12, step: 0.05, top: 1.5 },
  { a: [1, 1], r: [2, 3], shown: 12, step: 0.25, top: 4 },
  { a: [1, 1], r: [-1, 2], shown: 12, step: 1 / 12, top: 1.25 },
  { a: [3, 1], r: [1, 4], shown: 3, step: 0.25, top: 5 },
  { a: [5, 1], r: [1, 6], shown: 3, step: 0.5, top: 8 },
];

/** How many bars there are room for. */
export const BARS = 12;

export type LivePartialSums = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** Where the line is, as a whole number of steps. */
  at: number;
  /** Whether the line has been let go at least once this round. */
  tried: boolean;
};

export const roundOf = (s: LivePartialSums) => SUMS_ROUNDS[s.round] ?? null;

const frac = ([n, d]: readonly [number, number]) => n / d;
/** The partial sum of the first n terms. */
export const partial = (r: SumsRound, n: number) => {
  const [a, q] = [frac(r.a), frac(r.r)];
  return (a * (1 - q ** n)) / (1 - q);
};
/** Where the partial sums go: a/(1 − r). */
export const limitOf = (r: SumsRound) => frac(r.a) / (1 - frac(r.r));
/** The line's place as a number. */
export const valueOf = (r: SumsRound, at: number) => at * r.step;
/** The step the limit sits on. */
export const targetOf = (r: SumsRound) => Math.round(limitOf(r) / r.step);

const startOf = (r: SumsRound | undefined) => (r ? Math.round(r.top / r.step / 4) : 0);
export const PARTIAL_SUMS_START: LivePartialSums = { round: 0, at: startOf(SUMS_ROUNDS[0]), tried: false };

/** The line at a value, snapped to the round's step and kept on the chart. */
export const snapAt = (r: SumsRound, v: number) => Math.max(0, Math.min(Math.round(r.top / r.step), Math.round(v / r.step)));

export function done(s: LivePartialSums): boolean {
  const r = roundOf(s);
  return !!r && s.tried && s.at === targetOf(r);
}

/** The line moved to the value v; `tried` once it is let go. Nothing moves once the round is done. */
export function moveLine(s: LivePartialSums, v: number, letGo: boolean): LivePartialSums {
  const r = roundOf(s);
  if (!r || done(s)) return s;
  return { ...s, at: snapAt(r, v), tried: s.tried || letGo };
}

/** Why the line is not right: too low, so a partial sum passes it (the first n that does), or too high, never reached. */
export type SumsMiss = { kind: "low"; n: number } | { kind: "high" };
export function missOf(r: SumsRound, at: number): SumsMiss | null {
  if (at === targetOf(r)) return null;
  const v = valueOf(r, at);
  if (v > limitOf(r)) return { kind: "high" };
  let n = 1;
  while (partial(r, n) <= v + 1e-9 && n < 200) n++;
  return { kind: "low", n };
}

/** The series written out: its first three terms and "…", minus signs as −. */
export function seriesText(r: SumsRound): string {
  const [a, q] = [r.a, r.r];
  const term = (k: number) => {
    const n = a[0] * q[0] ** k;
    const d = a[1] * q[1] ** k;
    const g = gcd(Math.abs(n), d);
    const [nn, dd] = [n / g, d / g];
    return dd === 1 ? String(nn) : `${nn}/${dd}`;
  };
  return [0, 1, 2].map(term).reduce((acc, t, i) => (i === 0 ? t : t.startsWith("-") ? `${acc} − ${t.slice(1)}` : `${acc} + ${t}`), "") + " + …";
}
const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);

/** A number to two places, minus written as −. */
export const show2 = (v: number) => String(Math.round(v * 100) / 100 || 0).replace("-", "−");

export const next = (s: LivePartialSums): LivePartialSums => {
  const round = Math.min(SUMS_ROUNDS.length, s.round + 1);
  return { round, at: startOf(SUMS_ROUNDS[round]), tried: false };
};
export const again = (): LivePartialSums => PARTIAL_SUMS_START;
