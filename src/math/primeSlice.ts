// Prime slice: numbers are thrown up across the stage and fall back down; cut every one that is not prime, with a
// swipe across it or a tap, and leave the primes alone, for they are bombs. A number cut splits at its smallest prime
// factor into two pieces that fly apart: a prime piece is done with (green), and a piece that is not prime yet is
// thrown high and floats down slowly, to be cut in its turn, so 12 goes 2 × 6 and then 6 goes 2 × 3, down to the
// primes; the sides of the stage turn a piece back, so none flies out of reach. Three things are
// slips: cutting a prime, letting a number that is not prime fall, and letting a piece that is not prime fall. A wave is
// a fixed run of throws from a seed: nine puzzles go from 2–20, one at a time and slowly, to 2–200 three at once and
// fast, and more and more of the numbers that are not prime look as if they were (odd, and not a multiple of 5: 49,
// 51, 91). Three stars for a wave without a slip, two for one, else one; the endless run keeps a streak of clean waves.
// At the end every number thrown is marked right or wrong, with what went wrong.
// The flight of a number, the hit of a stroke and the run of a wave are worked out here, so the board's piece only
// draws them and passes on what happened.
import { isPrime } from "./numtheory";
import { rng } from "./random";
import type { EndlessGame, GameLevel } from "./ladder";

/** The stage in SVG units, and the size of a number thrown and of a piece. */
export const SLICE_W = 600;
export const SLICE_H = 380;
export const BALL_R = 30;
export const PIECE_R = 24;
/** How high a prime piece is thrown up when its number is cut, and how fast it flies off (units a second). */
const PIECE_RISE = 70;
const PIECE_SPREAD = 90;
/** A piece not prime yet goes up to the top third of the stage at least, drifts slowly toward the middle, and falls
 * under a lighter gravity, so there is time to see it and cut it again. */
const AGAIN_TOP = SLICE_H / 3;
const AGAIN_SPREAD = 50;
const AGAIN_FLOAT = 0.6;
/** The first throw leaves a moment after the wave starts, so the player sees it come. */
const LEAD = 600;

/** A wave: the numbers from `from` to `to`, `count` of them, thrown `volley` at a time every `gap` ms, each in the air for `flight` ms; `tricky` is the share of those not prime that look prime. */
export type WaveSpec = { from: number; to: number; count: number; volley: 1 | 2 | 3; gap: number; flight: number; tricky: number };
/** A number thrown: when, from where to where, and how high (above the bottom of the stage). */
export type Throw = { n: number; at: number; x0: number; x1: number; peak: number };

/** The smallest prime that divides n (n ≥ 2), and what is left: 12 → [2, 6], 91 → [7, 13]. */
export function splitOf(n: number): [number, number] {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return [p, n / p];
  return [n, 1];
}
/** Not prime, yet odd and not a multiple of 5, so the last digit gives nothing away: 21, 49, 91. */
export const looksPrime = (n: number) => n > 1 && !isPrime(n) && n % 2 !== 0 && n % 5 !== 0;
/** Not prime, and not a multiple of 2, 3 or 5 either: only 7 or more divides it (49, 77, 91, 119). */
export const fake = (n: number) => looksPrime(n) && splitOf(n)[0] >= 7;
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** n as a product of prime powers: 12 → "2² × 3", 97 → "97". */
export function factorText(n: number): string {
  const counts = new Map<number, number>();
  for (const p of primeFactors(n)) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts].map(([p, k]) => (k > 1 ? `${p}${[...String(k)].map((c) => SUP[+c]).join("")}` : String(p))).join(" × ");
}
/** Every prime factor of n, smallest first, with repeats: 12 → [2, 2, 3]. */
export function primeFactors(n: number): number[] {
  const out: number[] = [];
  for (let m = n; m > 1; ) {
    const [p, q] = splitOf(m);
    out.push(p);
    m = q;
  }
  return out;
}

export function wave(spec: WaveSpec, next: () => number): Throw[] {
  const int = (a: number, b: number) => a + Math.floor(next() * (b - a + 1));
  const range = Array.from({ length: spec.to - spec.from + 1 }, (_, i) => spec.from + i);
  const primes = range.filter(isPrime);
  const others = range.filter((n) => n > 1 && !isPrime(n));
  const tricky = others.filter(looksPrime);
  // Two primes in five, the rest not prime, each drawn without a repeat while there are numbers left to draw.
  const nPrimes = Math.round(spec.count * 0.4);
  const used = new Set<number>();
  const draw = (from: number[]) => {
    const left = from.filter((n) => !used.has(n));
    const n = (left.length ? left : from)[Math.floor(next() * (left.length || from.length))];
    used.add(n);
    return n;
  };
  const lookalike = () => tricky.some((n) => !used.has(n)) && next() < spec.tricky;
  const ns = Array.from({ length: spec.count }, (_, i) => (i < nPrimes ? draw(primes) : draw(lookalike() ? tricky : others)));
  for (let i = ns.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [ns[i], ns[j]] = [ns[j], ns[i]];
  }
  // A volley spreads across the stage, one lane each and a number's width apart; a number lands somewhere near where it
  // left (nearer in a volley, so they seldom cross), inside the stage.
  const lane = (SLICE_W - 160) / spec.volley;
  const drift = Math.round(140 / spec.volley);
  return ns.map((n, i) => {
    const k = i % spec.volley;
    const x0 = 80 + k * lane + (spec.volley > 1 ? int(BALL_R, Math.floor(lane) - BALL_R) : int(0, Math.floor(lane)));
    const x1 = Math.max(70, Math.min(SLICE_W - 70, x0 + int(-drift, drift)));
    return { n, at: LEAD + Math.floor(i / spec.volley) * spec.gap, x0, x1, peak: SLICE_H + BALL_R - int(70, 150) };
  });
}

/** A flight under gravity from a point at a time: where it is t ms into the wave. The sides of the stage turn it back
 * (a throw never reaches them; a piece may). */
export type Flight = { x0: number; y0: number; vx: number; vy: number; g: number; t0: number };
export function posAt(f: Flight, t: number): [number, number] {
  const s = (t - f.t0) / 1000;
  return [wall(f.x0 + f.vx * s), f.y0 - f.vy * s + (f.g * s * s) / 2];
}
const wall = (x: number) => {
  const [lo, span] = [PIECE_R, SLICE_W - 2 * PIECE_R];
  const u = (((x - lo) % (2 * span)) + 2 * span) % (2 * span);
  return lo + (u > span ? 2 * span - u : u);
};
/** A throw's flight: up from below the stage to its peak half way through `flight` ms and down again where it lands. */
export function throwFlight(th: Throw, flight: number): Flight {
  const T = flight / 1000;
  return { x0: th.x0, y0: SLICE_H + BALL_R, vx: (th.x1 - th.x0) / T, vy: (4 * th.peak) / T, g: (8 * th.peak) / (T * T), t0: th.at };
}
/** The two pieces of n cut at (x, y) at time t, its smallest prime and what is left: the prime thrown up a little and
 * away from the middle under the same gravity; what is left, if it is not prime yet, thrown high toward the middle to
 * float down (if prime, it goes the other way like the first). */
export function pieceFlights(n: number, x: number, y: number, t: number, g: number): [Flight, Flight] {
  const side = x < SLICE_W / 2 ? -1 : 1;
  const prime = (s: number): Flight => ({ x0: x, y0: y, vx: s * PIECE_SPREAD, vy: Math.sqrt(2 * g * PIECE_RISE), g, t0: t });
  const q = splitOf(n)[1];
  if (isPrime(q)) return [prime(side), prime(-side)];
  const ga = g * AGAIN_FLOAT;
  return [prime(side), { x0: x, y0: y, vx: -side * AGAIN_SPREAD, vy: Math.sqrt(2 * ga * Math.max(PIECE_RISE, y - AGAIN_TOP)), g: ga, t0: t }];
}

/** Whether a stroke from a to b passes within r of the point c (a tap is a stroke with a = b). */
export function hits(c: [number, number], a: [number, number], b: [number, number], r: number): boolean {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = dx * dx + dy * dy;
  const k = len ? Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / len)) : 0;
  return Math.hypot(a[0] + k * dx - c[0], a[1] + k * dy - c[1]) <= r;
}

/** How a number left the air: cut, cut though prime, fallen though not prime, fallen as a prime should, or a prime piece fallen. */
export type BallEnd = { kind: "cut" | "boom" | "dropped" | "spared" | "fell"; t: number; at: [number, number] };
export type Ball = {
  id: number;
  n: number;
  f: Flight;
  /** A piece of a number cut (not thrown), and the stroke that made it, which cannot cut it too. */
  piece: boolean;
  stroke: number;
  /** The number thrown it came from. */
  root: number;
  end: BallEnd | null;
};
/** A number to be judged: thrown, or a piece that is not prime yet. A prime piece is only done with. */
export const live = (b: Ball) => !b.piece || !isPrime(b.n);
export type Sim = { t: number; thrown: number; balls: Ball[]; ids: number };
export const startSim = (): Sim => ({ t: 0, thrown: 0, balls: [], ids: 0 });

export type SliceEvent =
  | { kind: "cut"; n: number; p: number; q: number; piece: boolean; root: number }
  | { kind: "boom"; n: number; root: number }
  | { kind: "dropped"; n: number; p: number; q: number; piece: boolean; root: number }
  | { kind: "spared"; n: number };
/** How long what has ended stays on the stage, to be seen going. */
export const FADE = 900;

/** Moves the wave on to time t: throws the numbers due, and settles those that have fallen out of the stage. */
export function advance(sim: Sim, throws: Throw[], flight: number, t: number): { sim: Sim; events: SliceEvent[] } {
  const events: SliceEvent[] = [];
  let { thrown, ids } = sim;
  const balls = [...sim.balls];
  for (; thrown < throws.length && throws[thrown].at <= t; thrown++) {
    const th = throws[thrown];
    balls.push({ id: ids++, n: th.n, f: throwFlight(th, flight), piece: false, stroke: -1, root: th.n, end: null });
  }
  const kept = balls
    .map((b): Ball => {
      if (b.end) return b;
      const [x, y] = posAt(b.f, t);
      // Still rising (a throw starts below the stage) or still on the stage.
      if (y < SLICE_H + BALL_R || (b.f.g * (t - b.f.t0)) / 1000 < b.f.vy) return b;
      const prime = isPrime(b.n);
      if (!live(b)) return { ...b, end: { kind: "fell", t, at: [x, SLICE_H] } };
      if (prime) events.push({ kind: "spared", n: b.n });
      else events.push({ kind: "dropped", n: b.n, ...pq(b.n), piece: b.piece, root: b.root });
      return { ...b, end: { kind: prime ? "spared" : "dropped", t, at: [Math.max(40, Math.min(SLICE_W - 40, x)), SLICE_H - 24] } };
    })
    .filter((b) => !b.end || t - b.end.t < FADE);
  return { sim: { t, thrown, balls: kept, ids }, events };
}
const pq = (n: number) => {
  const [p, q] = splitOf(n);
  return { p, q };
};

/** A stroke from a to b at the wave's time: every number in the air it crosses is cut (a prime goes off), its pieces thrown. */
export function cut(sim: Sim, a: [number, number], b: [number, number], stroke: number): { sim: Sim; events: SliceEvent[] } {
  const events: SliceEvent[] = [];
  let ids = sim.ids;
  const born: Ball[] = [];
  const balls = sim.balls.map((ball): Ball => {
    if (ball.end || !live(ball) || ball.stroke === stroke) return ball;
    const at = posAt(ball.f, sim.t);
    if (!hits(at, a, b, ball.piece ? PIECE_R : BALL_R)) return ball;
    if (isPrime(ball.n)) {
      events.push({ kind: "boom", n: ball.n, root: ball.root });
      return { ...ball, end: { kind: "boom", t: sim.t, at } };
    }
    const { p, q } = pq(ball.n);
    events.push({ kind: "cut", n: ball.n, p, q, piece: ball.piece, root: ball.root });
    const [left, right] = pieceFlights(ball.n, at[0], at[1], sim.t, ball.f.g);
    born.push({ id: ids++, n: p, f: left, piece: true, stroke, root: ball.root, end: null }, { id: ids++, n: q, f: right, piece: true, stroke, root: ball.root, end: null });
    return { ...ball, end: { kind: "cut", t: sim.t, at } };
  });
  return { sim: { ...sim, ids, balls: [...balls, ...born] }, events };
}

/** How a number thrown came out: right, or wrong with the number that slipped (itself, a prime cut or let fall, or a
 * piece of it let fall: 12 cut to 2 × 6 and the 6 let fall). */
export type SliceMark = { n: number; ok: boolean; slip?: number };
/** Every number thrown, in turn, marked by the slips of the wave (a slip names the number thrown it came from). */
export function markWave(throws: Throw[], slips: { n: number; root: number }[]): SliceMark[] {
  return throws.map(({ n }) => {
    const slip = slips.find((s) => s.root === n);
    return slip ? { n, ok: false, slip: slip.n } : { n, ok: true };
  });
}

/** Every number has been thrown, and none still to be judged is in the air. */
export const waveOver = (sim: Sim, throws: Throw[]) => sim.thrown >= throws.length && sim.balls.every((b) => b.end || !live(b));
/** The cuts a wave asks for: one for each prime factor of each number not prime, but one. */
export const cutsIn = (throws: Throw[]) => throws.reduce((s, th) => s + Math.max(0, primeFactors(th.n).length - 1), 0);

// ---------- the board's game ----------

/** Easy to hard: the range grows, the numbers come faster and more at once, and more of them only look prime. */
export const SLICE_LADDER: { spec: WaveSpec; seed: number }[] = [
  { spec: { from: 2, to: 20, count: 8, volley: 1, gap: 1500, flight: 3400, tricky: 0 }, seed: 3001 },
  { spec: { from: 2, to: 30, count: 10, volley: 1, gap: 1300, flight: 3200, tricky: 0 }, seed: 3002 },
  { spec: { from: 2, to: 50, count: 10, volley: 1, gap: 1100, flight: 3000, tricky: 0.3 }, seed: 3003 },
  { spec: { from: 2, to: 50, count: 12, volley: 2, gap: 1700, flight: 3000, tricky: 0.5 }, seed: 3004 },
  { spec: { from: 50, to: 100, count: 12, volley: 1, gap: 1050, flight: 2800, tricky: 0.4 }, seed: 3005 },
  { spec: { from: 50, to: 100, count: 12, volley: 2, gap: 1500, flight: 2800, tricky: 0.7 }, seed: 3006 },
  { spec: { from: 2, to: 100, count: 14, volley: 2, gap: 1300, flight: 2500, tricky: 0.5 }, seed: 3007 },
  { spec: { from: 100, to: 200, count: 12, volley: 1, gap: 1100, flight: 2800, tricky: 0.6 }, seed: 3008 },
  { spec: { from: 2, to: 200, count: 15, volley: 3, gap: 1800, flight: 2500, tricky: 0.6 }, seed: 3009 },
];
export const SLICE_LEVELS: Record<GameLevel, WaveSpec> = {
  1: { from: 2, to: 50, count: 8, volley: 1, gap: 1100, flight: 3000, tricky: 0.3 },
  2: { from: 2, to: 100, count: 8, volley: 2, gap: 1400, flight: 2700, tricky: 0.5 },
  3: { from: 2, to: 200, count: 9, volley: 3, gap: 1700, flight: 2400, tricky: 0.6 },
};
/** Against the clock the numbers come and fall a fifth faster. */
const quicker = (s: WaveSpec): WaveSpec => ({ ...s, gap: Math.round(s.gap * 0.8), flight: Math.round(s.flight * 0.8) });

/** Stars: a wave without a slip three, with one two, else one. */
export const sliceStars = (slips: number) => (slips === 0 ? 3 : slips === 1 ? 2 : 1);

export type SliceNotice = "double" | "chain" | "fake" | "streak10";
export const SLICE_NOTICES: SliceNotice[] = ["double", "chain", "fake", "streak10"];
/** What cuts show: two numbers in one stroke; a piece cut again, so a number broken down to three primes or more; a number that only 7 or more divides. */
export function cutNotice(cuts: Extract<SliceEvent, { kind: "cut" }>[], inStroke: number): SliceNotice | null {
  if (inStroke >= 2) return "double";
  if (cuts.some((c) => c.piece)) return "chain";
  if (cuts.some((c) => fake(c.n))) return "fake";
  return null;
}

export type SliceSaid = Extract<SliceEvent, { kind: "cut" | "boom" | "dropped" }>;
export type LivePrimeSlice = EndlessGame<SliceNotice, GameLevel, SliceSaid> & {
  /** The wave is over. */
  done: boolean;
  /** Cuts made, primes let fall, and slips, in this wave. */
  cuts: number;
  spared: number;
  slips: number;
  /** Once the wave is over, every number thrown, right or wrong. */
  marks?: SliceMark[];
};
/** The wave of a puzzle or of the endless run, and how long each number is in the air. */
export function sliceNow(d: Pick<LivePrimeSlice, "mode" | "stage" | "level" | "seed" | "timed">): { spec: WaveSpec; throws: Throw[] } {
  const { spec: base, seed } = d.mode === "puzzle" ? SLICE_LADDER[d.stage] : { spec: SLICE_LEVELS[d.level], seed: d.seed };
  const spec = d.mode === "endless" && d.timed ? quicker(base) : base;
  return { spec, throws: wave(spec, rng(seed)) };
}
