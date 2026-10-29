// Overfitting by hand, the board's lab: noisy points from a hidden curve, and a polynomial of some degree fitted to
// them by least squares, with a ridge penalty λ on its coefficients. Training points (black) are what the fit sees;
// test points (orange), drawn from the same curve, are what it is judged on. A chart beside plots the errors against
// the knob being turned, a point for each setting tried, and bars show the coefficients. Eight puzzles: go through
// every training point (training error 0, a wild curve), find the degree with the least test error (overfitting), the
// simplest degree nearly as good (a straight line's data), the degree with the least bias² + variance (curves fitted
// to fresh samples), enough points to tame degree 9 (more data), a penalty that tames it instead (ridge), the degree
// cross-validation picks with the test points hidden, and a penalty that keeps every coefficient small while still
// fitting (small weights, smooth curve). Free play takes any points. Kept free of React so it can be tested on its own.
import type { GameBase } from "./ladder";
import { rng } from "./random";
import { nf } from "./text";

export type Pt = [number, number];
export type TruthId = "wave" | "line" | "bump";
export const TRUTHS: Record<TruthId, (x: number) => number> = {
  wave: (x) => Math.sin(Math.PI * x),
  line: (x) => 0.8 * x - 0.2,
  bump: (x) => 1.6 * Math.exp(-6 * x * x) - 0.6,
};
export const TRUTH_IDS: TruthId[] = ["wave", "line", "bump"];

/** The settings a knob runs through: the degree, the number of training points, the penalty λ. */
export const DEGREES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const SIZES = [10, 12, 15, 20, 25, 30, 40, 60, 80];
export const LAMBDAS = [0, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 0.1, 1, 10];
export const NOISES = [0, 0.1, 0.25, 0.5];
export type Knob = "degree" | "n" | "lambda";
/** A knob's settings, by index. */
export const knobValues = (k: Knob) => (k === "degree" ? DEGREES : k === "n" ? SIZES : LAMBDAS);
/** How many test points, and how many fresh samples make the bias and the variance. */
export const TEST_SIZE = 60;
export const FRESH = 40;
/** The fresh samples drawn in the picture. */
export const FRESH_DRAWN = 20;

/** A normal draw (Box–Muller). */
function normal(r: () => number) {
  const u = 1 - r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** n points from the truth plus noise: spread evenly across −1 … 1, each at a random place in its own stretch. */
export function draw(truth: TruthId, n: number, noise: number, seed: number): Pt[] {
  const r = rng(seed);
  const f = TRUTHS[truth];
  return Array.from({ length: n }, (_, i): Pt => {
    const x = -1 + (2 * (i + r())) / n;
    return [r3(x), r3(f(x) + noise * normal(r))];
  });
}
/** The test points: the same curve and noise, another seed. */
export const testPoints = (truth: TruthId, noise: number, seed: number) => draw(truth, TEST_SIZE, noise, seed + 7919);

/** Solves A x = b by elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j];
    x[r] = s / M[r][r];
  }
  return x;
}

/**
 * The coefficients w₀ … w_d of the polynomial that minimises the mean squared error on the points plus λ times the
 * sum of the squares of w₁ … w_d (the constant is not penalised): the normal equations (XᵀX/n + λI) w = Xᵀy/n. A
 * whisker of penalty keeps them solvable when there are fewer points than coefficients.
 */
export function fit(pts: Pt[], degree: number, lambda: number): number[] {
  const k = degree + 1;
  const n = pts.length || 1;
  const G = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const b = new Array<number>(k).fill(0);
  for (const [x, y] of pts) {
    const p = [1];
    for (let j = 1; j < k; j++) p.push(p[j - 1] * x);
    for (let i = 0; i < k; i++) {
      b[i] += (p[i] * y) / n;
      for (let j = 0; j < k; j++) G[i][j] += (p[i] * p[j]) / n;
    }
  }
  G[0][0] += 1e-12;
  for (let j = 1; j < k; j++) G[j][j] += lambda + 1e-12;
  return solve(G, b);
}
/** The polynomial's value at x (Horner). */
export const predict = (w: number[], x: number) => w.reduceRight((s, c) => s * x + c, 0);
/** The mean squared error of a fit on some points. */
export const mse = (w: number[], pts: Pt[]) => (pts.length ? pts.reduce((s, [x, y]) => s + (predict(w, x) - y) ** 2, 0) / pts.length : 0);

/** k-fold cross-validation: each fold (every k-th point) is left out in turn, and judged by a fit to the rest. */
export function cvError(pts: Pt[], degree: number, lambda: number, k = 5): number {
  if (pts.length < k) return Infinity;
  let s = 0;
  for (let f = 0; f < k; f++) {
    const rest = pts.filter((_, i) => i % k !== f);
    const out = pts.filter((_, i) => i % k === f);
    s += mse(fit(rest, degree, lambda), out) * out.length;
  }
  return s / pts.length;
}

/** The x values the bias and the variance are averaged over. */
const GRID = Array.from({ length: 41 }, (_, i) => -1 + i / 20);
/** Fits to fresh samples of the same size from the same curve: the curves they draw, on a grid. */
export function freshFits(truth: TruthId, n: number, noise: number, degree: number, lambda: number, seed: number, count = FRESH): number[][] {
  return Array.from({ length: count }, (_, s) => fit(draw(truth, n, noise, seed * 1000 + s + 1), degree, lambda));
}
/**
 * Bias² and variance over fresh samples: how far the average fitted curve is from the truth, squared, and how much
 * the fitted curves spread about their average, both averaged across −1 … 1.
 */
export function biasVariance(truth: TruthId, n: number, noise: number, degree: number, lambda: number, seed: number): { bias2: number; variance: number } {
  const f = TRUTHS[truth];
  const ws = freshFits(truth, n, noise, degree, lambda, seed);
  let [b2, v] = [0, 0];
  for (const x of GRID) {
    const ys = ws.map((w) => predict(w, x));
    const m = ys.reduce((a, y) => a + y, 0) / ys.length;
    b2 += (m - f(x)) ** 2;
    v += ys.reduce((a, y) => a + (y - m) ** 2, 0) / ys.length;
  }
  return { bias2: b2 / GRID.length, variance: v / GRID.length };
}

/** What the chart shows: training and test error, training and cross-validation error (test hidden), or bias² and
 * variance with their sum. */
export type FitShow = "train" | "test" | "cv" | "bv";

/** What a puzzle asks: a training error at most `max`; the setting with the least test error (within `tol` of it, as
 * a share); the lowest degree with a test error within `within` of the least; the degree with the least bias² +
 * variance; a test error at most `max`; the degree with the least cross-validation error; or every coefficient at
 * most `max` in size with a training error at most `train`. */
export type FitGoal =
  | { kind: "trainBelow"; max: number }
  | { kind: "bestTest"; tol: number }
  | { kind: "simplest"; within: number }
  | { kind: "bestBv" }
  | { kind: "testBelow"; max: number }
  | { kind: "bestCv" }
  | { kind: "weights"; max: number; train: number };

export type FitNotice = "memorise" | "overfit" | "simple" | "biasVariance" | "moreData" | "ridge" | "cv" | "weights";
export const FIT_NOTICES: FitNotice[] = ["memorise", "overfit", "simple", "biasVariance", "moreData", "ridge", "cv", "weights"];

/** A puzzle: the curve, the noise and the seed of its points, how many, the degree and penalty (an index into
 * LAMBDAS) it starts at, the knob the player turns, what the chart shows, what is asked and what doing it shows. */
export type FitPuzzle = { truth: TruthId; noise: number; seed: number; n: number; degree: number; lam: number; knob: Knob; show: FitShow; goal: FitGoal; notice: FitNotice };

export const FIT_LADDER: FitPuzzle[] = [
  { truth: "wave", noise: 0.25, seed: 1, n: 10, degree: 1, lam: 0, knob: "degree", show: "train", goal: { kind: "trainBelow", max: 0.001 }, notice: "memorise" },
  { truth: "wave", noise: 0.25, seed: 1, n: 12, degree: 9, lam: 0, knob: "degree", show: "test", goal: { kind: "bestTest", tol: 0.2 }, notice: "overfit" },
  { truth: "line", noise: 0.3, seed: 2, n: 12, degree: 6, lam: 0, knob: "degree", show: "test", goal: { kind: "simplest", within: 0.02 }, notice: "simple" },
  { truth: "wave", noise: 0.25, seed: 1, n: 12, degree: 0, lam: 0, knob: "degree", show: "bv", goal: { kind: "bestBv" }, notice: "biasVariance" },
  { truth: "wave", noise: 0.25, seed: 1, n: 12, degree: 9, lam: 0, knob: "n", show: "test", goal: { kind: "testBelow", max: 0.1 }, notice: "moreData" },
  { truth: "wave", noise: 0.25, seed: 1, n: 12, degree: 9, lam: 0, knob: "lambda", show: "test", goal: { kind: "testBelow", max: 0.11 }, notice: "ridge" },
  { truth: "wave", noise: 0.25, seed: 3, n: 12, degree: 8, lam: 0, knob: "degree", show: "cv", goal: { kind: "bestCv" }, notice: "cv" },
  { truth: "wave", noise: 0.25, seed: 2, n: 12, degree: 9, lam: 0, knob: "lambda", show: "train", goal: { kind: "weights", max: 3, train: 0.05 }, notice: "weights" },
];

/** What a fit is set up from: the curve, noise and seed its points came from, the points, the degree, the penalty's
 * index. */
export type FitSetup = { truth: TruthId; noise: number; seed: number; n: number; degree: number; lam: number; pts: Pt[] };
/** The same setup with a knob turned to the setting at index `i` (a new size draws new points). */
export function turned(s: FitSetup, knob: Knob, i: number): FitSetup {
  if (knob === "degree") return { ...s, degree: DEGREES[i] };
  if (knob === "lambda") return { ...s, lam: i };
  return { ...s, n: SIZES[i], pts: draw(s.truth, SIZES[i], s.noise, s.seed) };
}
/** Where a knob is now, as an index into its settings. */
export const knobAt = (s: Pick<FitSetup, "degree" | "n" | "lam">, knob: Knob) => (knob === "degree" ? s.degree : knob === "lambda" ? s.lam : Math.max(0, SIZES.indexOf(s.n)));

export type FitScores = { w: number[]; train: number; test: number; cv: number; bias2: number; variance: number };
/** Everything about one setup: the fit, its training and test errors, and (when asked for) its cross-validation
 * error, bias² and variance. */
export function scores(s: FitSetup, more: { cv?: boolean; bv?: boolean } = {}): FitScores {
  const lambda = LAMBDAS[s.lam];
  const w = fit(s.pts, s.degree, lambda);
  const bv = more.bv ? biasVariance(s.truth, s.n, s.noise, s.degree, lambda, s.seed) : { bias2: NaN, variance: NaN };
  return { w, train: mse(w, s.pts), test: mse(w, testPoints(s.truth, s.noise, s.seed)), cv: more.cv ? cvError(s.pts, s.degree, lambda) : NaN, ...bv };
}
/** The scores at every setting of a knob, by index. */
export const sweep = (s: FitSetup, knob: Knob, more: { cv?: boolean; bv?: boolean } = {}) => knobValues(knob).map((_, i) => scores(turned(s, knob, i), more));

/** The index of the least of some values (the first, on a tie). */
const argmin = (vs: number[]) => vs.reduce((b, v, i) => (v < vs[b] ? i : b), 0);
/** The largest coefficient's size. */
export const biggest = (w: number[]) => Math.max(0, ...w.map(Math.abs));

export type FitSlip = "trainHigh" | "overfit" | "underfit" | "notSimplest" | "tooSimple" | "bias" | "variance" | "testHigh" | "cvOver" | "cvUnder" | "weightsBig" | "tooStiff";
/** A try: done, or wrong and why, with what it had and what was wanted. */
export type FitVerdict = { state: "won" } | { state: "lost"; why: FitSlip; have: number; want: number };

/** The setup a puzzle's try is at, from the state. */
export const setupOf = (d: FitSetup): FitSetup => ({ truth: d.truth, noise: d.noise, seed: d.seed, n: d.n, degree: d.degree, lam: d.lam, pts: d.pts });

export function judgeFit(p: FitPuzzle, d: FitSetup): FitVerdict {
  const s = setupOf(d);
  const g = p.goal;
  const at = knobAt(s, p.knob);
  const lost = (why: FitSlip, have: number, want: number): FitVerdict => ({ state: "lost", why, have, want });
  if (g.kind === "trainBelow") {
    const tr = scores(s).train;
    return tr <= g.max ? { state: "won" } : lost("trainHigh", tr, g.max);
  }
  if (g.kind === "testBelow") {
    const te = scores(s).test;
    return te <= g.max ? { state: "won" } : lost("testHigh", te, g.max);
  }
  if (g.kind === "weights") {
    const sc = scores(s);
    if (sc.train > g.train) return lost("tooStiff", sc.train, g.train);
    const big = biggest(sc.w);
    return big <= g.max ? { state: "won" } : lost("weightsBig", big, g.max);
  }
  const all = sweep(s, p.knob, { cv: g.kind === "bestCv", bv: g.kind === "bestBv" });
  if (g.kind === "bestTest") {
    const best = argmin(all.map((x) => x.test));
    if (all[at].test <= all[best].test * (1 + g.tol)) return { state: "won" };
    return lost(at > best ? "overfit" : "underfit", all[at].test, all[best].test);
  }
  if (g.kind === "simplest") {
    const least = Math.min(...all.map((x) => x.test));
    const want = all.findIndex((x) => x.test <= least + g.within);
    if (at === want) return { state: "won" };
    return lost(at > want ? "notSimplest" : "tooSimple", all[at].test, least);
  }
  if (g.kind === "bestBv") {
    const tot = all.map((x) => x.bias2 + x.variance);
    const best = argmin(tot);
    return at === best ? { state: "won" } : lost(at < best ? "bias" : "variance", tot[at], tot[best]);
  }
  const best = argmin(all.map((x) => x.cv));
  return at === best ? { state: "won" } : lost(at > best ? "cvOver" : "cvUnder", all[at].cv, all[best].cv);
}

/** Stars: done at the first try three, at the second two, else one. */
export const fitStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);

export type LiveFit = GameBase<FitNotice, { kind: "wrong"; why: FitSlip }> &
  FitSetup & {
    mode: "puzzle" | "free";
    /** The knob's settings tried on this puzzle, as indices: the chart shows them. */
    seen: number[];
    /** Free play's choices: the test points, curves fitted to fresh samples, and the hidden curve itself. */
    showTest: boolean;
    showFresh: boolean;
    showTruth: boolean;
    /** Tries that failed on this puzzle, and whether it is done. */
    tries: number;
    done: boolean;
  };

/** Free play's start: the wave, twelve points, degree 3. */
const FREE: FitSetup = { truth: "wave", noise: 0.25, seed: 1, n: 12, degree: 3, lam: 0, pts: draw("wave", 12, 0.25, 1) };

/** Where a try at a puzzle (or at free play) starts. */
export function fitStart(p: FitPuzzle | null): Pick<LiveFit, keyof FitSetup | "seen"> {
  if (!p) return { ...FREE, pts: FREE.pts.map((q): Pt => [q[0], q[1]]), seen: [] };
  const s: FitSetup = { truth: p.truth, noise: p.noise, seed: p.seed, n: p.n, degree: p.degree, lam: p.lam, pts: draw(p.truth, p.n, p.noise, p.seed) };
  return { ...s, seen: [knobAt(s, p.knob)] };
}

export const FIT_START: LiveFit = { mode: "puzzle", stage: 0, ...fitStart(FIT_LADDER[0]), showTest: true, showFresh: false, showTruth: false, tries: 0, done: false, said: null };

/** The puzzle being played, or null in free play. */
export const fitPuzzle = (d: Pick<LiveFit, "mode" | "stage">) => (d.mode === "puzzle" ? FIT_LADDER[d.stage] : null);

// ---------- the picture ----------

export const FIT_PLOT = { w: 620, h: 404, left: 12, top: 12, size: 380 };
/** The view: x from −1.1 to 1.1, y from −2.2 to 2.2. */
export const VIEW_X = 1.1;
export const VIEW_Y = 2.2;
const CHART = { x: 432, y: 30, w: 172, h: 168 };
const BARS = { x: 432, y: 262, w: 172, h: 120 };
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const PURPLE = "#9c36b5";
const GREEN = "#2f9e44";
const RED = "#e03131";
const INK = "#1e1e1e";
const GREY = "#868e96";
const r2 = (v: number) => Math.round(v * 100) / 100;

export const toPage = ([x, y]: Pt): Pt => [FIT_PLOT.left + ((x + VIEW_X) / (2 * VIEW_X)) * FIT_PLOT.size, FIT_PLOT.top + ((VIEW_Y - y) / (2 * VIEW_Y)) * FIT_PLOT.size];
export const fromPage = ([px, py]: Pt): Pt => [((px - FIT_PLOT.left) / FIT_PLOT.size) * 2 * VIEW_X - VIEW_X, VIEW_Y - ((py - FIT_PLOT.top) / FIT_PLOT.size) * 2 * VIEW_Y];

/** A curve as a path, in pieces where it stays a little beyond the view (so a wild fit is cut at the frame). */
export function curvePath(f: (x: number) => number): string {
  let d = "";
  let pen = false;
  for (let i = 0; i <= 160; i++) {
    const x = -VIEW_X + (2 * VIEW_X * i) / 160;
    const y = f(x);
    if (!Number.isFinite(y) || Math.abs(y) > 3 * VIEW_Y) {
      pen = false;
      continue;
    }
    const [px, py] = toPage([x, y]).map(r2);
    d += `${pen ? "L" : "M"}${px},${py}`;
    pen = true;
  }
  return d;
}

/** A number for the readout: small errors with three decimals (0 below half a thousandth), others with two, large
 * ones whole. */
export const num = (v: number) => (!Number.isFinite(v) ? "∞" : Math.abs(v) < 5e-4 ? "0" : Math.abs(v) >= 100 ? nf(Math.round(v), 0) : nf(v, Math.abs(v) < 0.1 ? 3 : 2)).replace(/^-/, "−");
/** A penalty for the readout: 0, or a power of ten. */
export const lambdaText = (l: number) => (l === 0 ? "0" : l >= 0.01 ? nf(l, 2) : `10${String(Math.round(Math.log10(l))).replace("-", "⁻").replace(/\d/g, (c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(c)])}`);
/** A knob's setting for the chart's axis. */
export const knobText = (k: Knob, i: number) => (k === "degree" ? String(DEGREES[i]) : k === "n" ? String(SIZES[i]) : lambdaText(LAMBDAS[i]));

export type FitWords = { train: string; test: string; cv: string; bias2: string; variance: string; total: string; error: string; coefs: string; axis: Record<Knob, string> };

/** The chart's y scale: errors from 0.001 to 10 on a log scale, larger ones at the top with an arrow. */
const LOG_LO = -3;
const LOG_HI = 1;
const chartY = (v: number) => CHART.y + CHART.h - ((Math.min(LOG_HI, Math.max(LOG_LO, Math.log10(Math.max(v, 1e-9)))) - LOG_LO) / (LOG_HI - LOG_LO)) * CHART.h;

/**
 * The picture: on the left the points, each training point's distance from the fitted curve, the curve, and (when
 * shown) the test points, curves fitted to fresh samples and the hidden curve dashed. On the right the chart of the
 * errors at each setting tried, the current one marked, and below it the coefficients as bars.
 */
export function fitSvg(
  d: FitSetup,
  o: { knob: Knob; show: FitShow; seen: number[] | "all"; test: boolean; fresh: boolean; truth: boolean; words: FitWords },
): string {
  const { left, top, size } = FIT_PLOT;
  const lambda = LAMBDAS[d.lam];
  const sc = scores(d);
  const at = (p: Pt) => toPage(p).map(r2);
  let body = `<clipPath id="fit-clip"><rect x="${left}" y="${top}" width="${size}" height="${size}"/></clipPath>`;
  body += `<rect x="${left}" y="${top}" width="${size}" height="${size}" fill="#fff" stroke="#dee2e6"/>`;
  for (let k = -2; k <= 2; k++) {
    const [gx] = at([k / 2, 0]);
    const [, gy] = at([0, k]);
    const stroke = k === 0 ? "#ced4da" : "#f1f3f5";
    body += `<line x1="${gx}" y1="${top}" x2="${gx}" y2="${top + size}" stroke="${stroke}"/><line x1="${left}" y1="${gy}" x2="${left + size}" y2="${gy}" stroke="${stroke}"/>`;
  }
  body += `<g clip-path="url(#fit-clip)">`;
  if (o.fresh) for (const w of freshFits(d.truth, d.n, d.noise, d.degree, lambda, d.seed, FRESH_DRAWN)) body += `<path d="${curvePath((x) => predict(w, x))}" fill="none" stroke="${BLUE}" stroke-width="1" opacity="0.25"/>`;
  if (o.truth) body += `<path d="${curvePath(TRUTHS[d.truth])}" fill="none" stroke="${GREEN}" stroke-width="2.4" stroke-dasharray="8 6"/>`;
  // Each training point's distance from the curve, then the curve.
  for (const [x, y] of d.pts) {
    const [px, py] = at([x, y]);
    const fy = toPage([x, Math.max(-3 * VIEW_Y, Math.min(3 * VIEW_Y, predict(sc.w, x)))])[1];
    body += `<line x1="${px}" y1="${py}" x2="${px}" y2="${r2(fy)}" stroke="${RED}" stroke-width="1.4" opacity="0.7"/>`;
  }
  body += `<path d="${curvePath((x) => predict(sc.w, x))}" fill="none" stroke="${BLUE}" stroke-width="3"/>`;
  if (o.test) for (const p of testPoints(d.truth, d.noise, d.seed)) body += `<circle cx="${at(p)[0]}" cy="${at(p)[1]}" r="3.6" fill="#fff" stroke="${ORANGE}" stroke-width="1.8"/>`;
  for (const p of d.pts) body += `<circle cx="${at(p)[0]}" cy="${at(p)[1]}" r="4.6" fill="${INK}"/>`;
  body += `</g>`;
  return body + chart(d, o) + coefBars(sc.w, o.words);
}

/** The chart: each series a line through the settings tried, with a dot at each; the current setting marked. */
function chart(d: FitSetup, o: { knob: Knob; show: FitShow; seen: number[] | "all"; words: FitWords }): string {
  const vals = knobValues(o.knob);
  const xs = (i: number) => r2(CHART.x + (i / (vals.length - 1)) * CHART.w);
  const seen = (o.seen === "all" ? vals.map((_, i) => i) : [...new Set(o.seen)]).filter((i) => i >= 0 && i < vals.length).sort((a, b) => a - b);
  const pick = o.show === "bv" ? { bv: true } : o.show === "cv" ? { cv: true } : {};
  const at = new Map(seen.map((i) => [i, scores(turned(d, o.knob, i), pick)]));
  const series: { color: string; label: string; of: (s: FitScores) => number }[] =
    o.show === "bv"
      ? [
          { color: GREEN, label: o.words.bias2, of: (s) => s.bias2 },
          { color: RED, label: o.words.variance, of: (s) => s.variance },
          { color: INK, label: o.words.total, of: (s) => s.bias2 + s.variance },
        ]
      : [
          { color: BLUE, label: o.words.train, of: (s) => s.train },
          ...(o.show === "test" ? [{ color: ORANGE, label: o.words.test, of: (s: FitScores) => s.test }] : []),
          ...(o.show === "cv" ? [{ color: PURPLE, label: o.words.cv, of: (s: FitScores) => s.cv }] : []),
        ];
  // The title, and the series' names in a row under it.
  let s = `<text x="${CHART.x - 24}" y="${CHART.y - 20}" font-size="12" font-weight="700" fill="#495057">${o.words.error}</text>`;
  let lx = CHART.x - 24;
  for (const ser of series) {
    s += `<text x="${lx}" y="${CHART.y - 6}" font-size="11" font-weight="700" fill="${ser.color}">${ser.label}</text>`;
    lx += ser.label.length * 6.4 + 12;
  }
  s += `<rect x="${CHART.x}" y="${CHART.y}" width="${CHART.w}" height="${CHART.h}" fill="#fff" stroke="#dee2e6"/>`;
  for (let e = LOG_LO; e <= LOG_HI; e++) {
    const y = r2(chartY(10 ** e));
    s += `<line x1="${CHART.x}" y1="${y}" x2="${CHART.x + CHART.w}" y2="${y}" stroke="#f1f3f5"/><text x="${CHART.x - 4}" y="${r2(y + 4)}" font-size="10" fill="${GREY}" text-anchor="end">${nf(10 ** e, 3)}</text>`;
  }
  // The current setting, then the series over it.
  const cur = knobAt(d, o.knob);
  s += `<line x1="${xs(cur)}" y1="${CHART.y}" x2="${xs(cur)}" y2="${CHART.y + CHART.h}" stroke="${GREY}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  for (const ser of series) {
    const pts = seen.map((i) => [xs(i), r2(chartY(ser.of(at.get(i)!)))]);
    if (pts.length > 1) s += `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${ser.color}" stroke-width="2"/>`;
    for (const [i, [x, y]] of pts.map((p, k) => [seen[k], p] as const)) {
      const v = ser.of(at.get(i)!);
      s += `<circle cx="${x}" cy="${y}" r="3.2" fill="${ser.color}"/>`;
      if (v > 10 ** LOG_HI) s += `<text x="${x}" y="${r2(y - 5)}" font-size="11" fill="${ser.color}" text-anchor="middle">↑</text>`;
    }
  }
  // The axis: every setting's label, or every other one when they are many.
  vals.forEach((_, i) => {
    if (vals.length > 9 && i % 2 === 1 && i !== cur) return;
    s += `<text x="${xs(i)}" y="${CHART.y + CHART.h + 13}" font-size="10" fill="${i === cur ? INK : GREY}" font-weight="${i === cur ? 700 : 400}" text-anchor="middle">${knobText(o.knob, i)}</text>`;
  });
  s += `<text x="${CHART.x + CHART.w / 2}" y="${CHART.y + CHART.h + 28}" font-size="11" fill="#495057" text-anchor="middle">${o.words.axis[o.knob]}</text>`;
  return s;
}

/** The coefficients w₀ … w_d as bars up and down from a line, cut at ±5 and red when cut; the largest size above. */
function coefBars(w: number[], words: FitWords): string {
  const mid = BARS.y + BARS.h / 2;
  const step = BARS.w / 10;
  const lim = 5;
  let s = `<text x="${BARS.x - 24}" y="${BARS.y - 10}" font-size="12" font-weight="700" fill="#495057">${words.coefs}</text>`;
  s += `<text x="${BARS.x + BARS.w}" y="${BARS.y - 10}" font-size="12" fill="#495057" text-anchor="end">max |w| = ${num(biggest(w))}</text>`;
  s += `<line x1="${BARS.x}" y1="${mid}" x2="${BARS.x + BARS.w}" y2="${mid}" stroke="#ced4da"/>`;
  w.forEach((c, k) => {
    const h = (Math.min(lim, Math.abs(c)) / lim) * (BARS.h / 2);
    const x = r2(BARS.x + k * step + 3);
    const y = r2(c >= 0 ? mid - h : mid);
    s += `<rect x="${x}" y="${y}" width="${r2(step - 6)}" height="${r2(Math.max(1, h))}" fill="${Math.abs(c) > lim ? RED : PURPLE}"/>`;
    s += `<text x="${r2(x + (step - 6) / 2)}" y="${BARS.y + BARS.h + 12}" font-size="10" fill="${GREY}" text-anchor="middle">w${"₀₁₂₃₄₅₆₇₈₉"[k]}</text>`;
  });
  return s;
}
