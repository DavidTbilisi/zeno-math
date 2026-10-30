// Training on a dataset in batches, the descent lab's sibling: a line y = w·x + b fitted to points by gradient descent
// on the mean squared error, a batch of the points at a time. The batch size (one point, a few, or all of them), the
// learning rate η, how η changes from epoch to epoch (kept, halved every few epochs, or η/(1 + epoch)) and the step
// itself (plain, with momentum, or Adam's) are set with dials; the path of (w, b) is drawn on the loss's contours, the
// line on the points, and the loss after every step on a chart. Puzzles ask for settings that reach the best line in a
// number of epochs; a try that fails says why (too slow, blew up, still jittering). Kept free of React so it can be
// tested on its own.
import { niceStep } from "./scale";
import { rng } from "./random";
import { nf } from "./text";
import type { GameBase } from "./ladder";

export type Pt = [number, number];
/** The datasets: x from −1 to 3 (a valley not far from round), or x from 0 to 10 (a long, narrow valley). */
export type DataId = "line" | "wide";
export const DATA_IDS: DataId[] = ["line", "wide"];
const SPAN: Record<DataId, [number, number]> = { line: [-1, 3], wide: [0, 10] };
/** The line the points are drawn around, and their noise. */
const TRUE_W = 0.8;
const TRUE_B = 1;
const NOISE = 0.5;
export const N = 24;

/** The points: x spread evenly across the span with a little jitter, y on the line plus noise. */
export function dataOf(id: DataId, seed: number): Pt[] {
  const r = rng(seed * 7 + (id === "wide" ? 3 : 1));
  const [a, b] = SPAN[id];
  return Array.from({ length: N }, (_, i) => {
    const x = a + ((b - a) * (i + 0.2 + 0.6 * r())) / N;
    // A normal draw from two uniform ones (Box–Muller).
    const z = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    return [Math.round(x * 100) / 100, Math.round((TRUE_W * x + TRUE_B + NOISE * z) * 100) / 100] as Pt;
  });
}

/** The mean squared error of the line (w, b) over points. */
export function lossOf(pts: Pt[], w: number, b: number): number {
  let s = 0;
  for (const [x, y] of pts) s += (w * x + b - y) ** 2;
  return s / pts.length;
}
/** Its gradient over a batch: (∂L/∂w, ∂L/∂b) = 2 · mean((w·x + b − y) · (x, 1)). */
export function gradOf(pts: Pt[], w: number, b: number): [number, number] {
  let [gw, gb] = [0, 0];
  for (const [x, y] of pts) {
    const e = w * x + b - y;
    gw += e * x;
    gb += e;
  }
  return [(2 * gw) / pts.length, (2 * gb) / pts.length];
}
/** The best line, by least squares. */
export function bestOf(pts: Pt[]): { w: number; b: number; loss: number } {
  const n = pts.length;
  const [mx, my] = [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  let [sxx, sxy] = [0, 0];
  for (const [x, y] of pts) {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (y - my);
  }
  const w = sxy / sxx;
  const b = my - w * mx;
  return { w, b, loss: lossOf(pts, w, b) };
}

export type Optimiser = "sgd" | "momentum" | "adam";
export const OPTIMISERS: Optimiser[] = ["sgd", "momentum", "adam"];
export type Schedule = "constant" | "step" | "decay";
export const SCHEDULES: Schedule[] = ["constant", "step", "decay"];
export const BATCHES = [1, 2, 4, 8, 24];
/** The learning rates the slider stops at: 1, 2 and 5 times the powers of ten, from 0.0001 to 2. */
export const ETAS: number[] = [-4, -3, -2, -1, 0].flatMap((e) => [1, 2, 5].map((m) => Number((m * 10 ** e).toPrecision(1)))).filter((v) => v <= 2);
/** Momentum's β, and Adam's β₁, β₂ and ε. */
export const BETA = 0.9;
const B1 = 0.9;
const B2 = 0.999;
const EPS = 1e-8;
/** The schedule halves η every this many epochs. */
export const HALF_EVERY = 5;

/** The rate in epoch e (from 0). */
export function rateAt(eta: number, schedule: Schedule, e: number): number {
  return schedule === "step" ? eta * 0.5 ** Math.floor(e / HALF_EVERY) : schedule === "decay" ? eta / (1 + e) : eta;
}

/** Everything a training run is made of. */
export type Setup = { data: DataId; seed: number; batch: number; eta: number; schedule: Schedule; opt: Optimiser; start: Pt; epochs: number };
/** A run: (w, b) after every step (the start first), the loss over all the points there, the step each epoch ends at,
 * and whether it blew up (then it stops early). */
export type Run = { path: Pt[]; losses: number[]; epochEnds: number[]; away: boolean };

/** Far enough away to say the run has blown up. */
const AWAY = 1e4;

/** Trains: each epoch the points are shuffled (the same way for the same seed and epoch) and cut into batches, and
 * each batch takes one step. */
export function train(pts: Pt[], s: Setup): Run {
  let [w, b] = s.start;
  let [vw, vb, mw, mb, qw, qb] = [0, 0, 0, 0, 0, 0];
  let t = 0;
  const path: Pt[] = [[w, b]];
  const losses = [lossOf(pts, w, b)];
  const epochEnds: number[] = [];
  for (let e = 0; e < s.epochs; e++) {
    const r = rng(s.seed * 1000 + e + 1);
    const order = pts.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const eta = rateAt(s.eta, s.schedule, e);
    for (let k = 0; k < order.length; k += s.batch) {
      const [gw, gb] = gradOf(order.slice(k, k + s.batch).map((i) => pts[i]), w, b);
      t++;
      if (s.opt === "sgd") [w, b] = [w - eta * gw, b - eta * gb];
      else if (s.opt === "momentum") {
        [vw, vb] = [BETA * vw + gw, BETA * vb + gb];
        [w, b] = [w - eta * vw, b - eta * vb];
      } else {
        [mw, mb] = [B1 * mw + (1 - B1) * gw, B1 * mb + (1 - B1) * gb];
        [qw, qb] = [B2 * qw + (1 - B2) * gw * gw, B2 * qb + (1 - B2) * gb * gb];
        const [c1, c2] = [1 - B1 ** t, 1 - B2 ** t];
        w -= (eta * (mw / c1)) / (Math.sqrt(qw / c2) + EPS);
        b -= (eta * (mb / c1)) / (Math.sqrt(qb / c2) + EPS);
      }
      if (!Number.isFinite(w) || !Number.isFinite(b) || Math.abs(w) > AWAY || Math.abs(b) > AWAY) return { path, losses, epochEnds, away: true };
      path.push([w, b]);
      losses.push(lossOf(pts, w, b));
    }
    epochEnds.push(path.length - 1);
  }
  return { path, losses, epochEnds, away: false };
}

// ---------- the puzzles ----------

/** What a puzzle asks: every step of the last epoch within `tol` of the best loss (settled), or the last step within it. */
export type BatchGoal = { kind: "settle" | "final"; tol: number };
export type Knob = "eta" | "batch" | "schedule" | "opt";
export type BatchNotice = "edge" | "noisy" | "schedule" | "minibatch" | "momentum" | "adam" | "blewUp";
export const BATCH_NOTICES: BatchNotice[] = ["edge", "noisy", "schedule", "minibatch", "momentum", "adam", "blewUp"];
/** A puzzle: the data, where (w, b) starts, the settings it starts with, the one dial that may be turned, the epochs it
 * has and what it asks. */
export type BatchPuzzle = { data: DataId; start: Pt; batch: number; eta: number; schedule: Schedule; opt: Optimiser; knob: Knob; epochs: number; goal: BatchGoal; notice: BatchNotice };

export const BATCH_LADDER: BatchPuzzle[] = [
  { data: "line", start: [-1, 4], batch: 24, eta: 0.05, schedule: "constant", opt: "sgd", knob: "eta", epochs: 20, goal: { kind: "settle", tol: 0.01 }, notice: "edge" },
  { data: "line", start: [-1, 4], batch: 1, eta: 0.01, schedule: "constant", opt: "sgd", knob: "eta", epochs: 3, goal: { kind: "final", tol: 0.1 }, notice: "noisy" },
  { data: "line", start: [-1, 4], batch: 1, eta: 0.1, schedule: "constant", opt: "sgd", knob: "schedule", epochs: 15, goal: { kind: "settle", tol: 0.06 }, notice: "schedule" },
  { data: "line", start: [-1, 4], batch: 24, eta: 0.1, schedule: "constant", opt: "sgd", knob: "batch", epochs: 4, goal: { kind: "settle", tol: 0.15 }, notice: "minibatch" },
  { data: "wide", start: [0, 0], batch: 4, eta: 0.002, schedule: "constant", opt: "sgd", knob: "opt", epochs: 40, goal: { kind: "settle", tol: 0.02 }, notice: "momentum" },
  { data: "wide", start: [0, 0], batch: 4, eta: 0.05, schedule: "constant", opt: "sgd", knob: "opt", epochs: 20, goal: { kind: "settle", tol: 0.02 }, notice: "adam" },
];
/** The seed every puzzle's points and shuffles come from. */
export const PUZZLE_SEED = 1;

export type BatchSlip = "blowUp" | "slow" | "jitter";
export type BatchVerdict = { state: "won" } | { state: "lost"; why: BatchSlip; gap: number };

/** A finished run judged against a goal: blown up, still above it and coming down steadily (slow), or near it at times
 * or going up and down (jitter). `gap` is how far above the best loss it ended. */
export function judgeRun(run: Run, best: number, goal: BatchGoal): BatchVerdict {
  const end = run.losses[run.losses.length - 1] - best;
  if (run.away) return { state: "lost", why: "blowUp", gap: end };
  const last = run.losses.slice(run.epochEnds[run.epochEnds.length - 2] ?? 0).map((l) => l - best);
  const ok = goal.kind === "settle" ? Math.max(...last) <= goal.tol : end <= goal.tol;
  if (ok) return { state: "won" };
  // Jittering: it came near enough at times, or the loss kept going up as often as one step in five.
  const rises = last.slice(1).filter((l, i) => l > last[i] * 1.05).length;
  return { state: "lost", why: Math.min(...last) <= goal.tol || rises >= Math.max(2, last.length / 5) ? "jitter" : "slow", gap: end };
}

/** The game's state: the shared shape (no endless run: free play instead), the dials, and the try. */
export type LiveBatch = GameBase<BatchNotice, { kind: "wrong"; why: BatchSlip }> & {
  mode: "puzzle" | "free";
  /** Free play's data and the seed of its points and shuffles. */
  data: DataId;
  seed: number;
  batch: number;
  eta: number;
  schedule: Schedule;
  opt: Optimiser;
  /** Steps taken in this try, tries that failed on this puzzle, whether it is done. */
  steps: number;
  tries: number;
  done: boolean;
};
const P0 = BATCH_LADDER[0];
export const BATCH_START: LiveBatch = { mode: "puzzle", stage: 0, data: "line", seed: 1, batch: P0.batch, eta: P0.eta, schedule: P0.schedule, opt: P0.opt, steps: 0, tries: 0, done: false, said: null };
/** Free play's start and how many epochs a free run may take. */
export const FREE_START: Pt = [-1, 4];
export const FREE_EPOCHS = 50;
/** The best line counts as reached in free play within this much of the best loss. */
export const FREE_TOL = 0.01;

export const batchPuzzle = (d: Pick<LiveBatch, "mode" | "stage">) => (d.mode === "puzzle" ? BATCH_LADDER[d.stage] : null);
/** The run a state makes: a puzzle's own settings with its dial as the player set it, or free play's. */
export function setupOf(d: LiveBatch): Setup {
  const p = batchPuzzle(d);
  if (!p) return { data: d.data, seed: d.seed, batch: d.batch, eta: d.eta, schedule: d.schedule, opt: d.opt, start: FREE_START, epochs: FREE_EPOCHS };
  const s: Setup = { data: p.data, seed: PUZZLE_SEED, batch: p.batch, eta: p.eta, schedule: p.schedule, opt: p.opt, start: p.start, epochs: p.epochs };
  return { ...s, [p.knob]: d[p.knob] };
}
/** A puzzle's try, judged on the whole run. */
export function judgeBatch(d: LiveBatch): BatchVerdict | null {
  const p = batchPuzzle(d);
  if (!p) return null;
  const s = setupOf(d);
  const pts = dataOf(s.data, s.seed);
  return judgeRun(train(pts, s), bestOf(pts).loss, p.goal);
}
/** Stars: done at the first try three, at the second two, else one. */
export const batchStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
/** The puzzle's settings, for a new try of it. */
export const puzzlePatch = (p: BatchPuzzle): Partial<LiveBatch> => ({ batch: p.batch, eta: p.eta, schedule: p.schedule, opt: p.opt });

// ---------- the picture ----------

export const BATCH_PLOT = { w: 640, h: 500 };
const MAP = { left: 46, top: 26, size: 268, h: 236 };
const DATA = { left: 360, top: 26, w: 266, h: 236 };
const CHART = { left: 46, top: 314, w: 580, h: 150 };
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const GREEN = "#2f9e44";
const GREY = "#868e96";
const r2 = (v: number) => Math.round(v * 100) / 100;
const t = (v: number) => nf(v, 3).replace(/^-/, "−");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const title = (x: number, y: number, s: string) => `<text x="${r2(x)}" y="${r2(y)}" font-size="13" font-weight="700" fill="#495057">${esc(s)}</text>`;

/** The loss's level curves: ellipses round the best line, since the mean squared error is quadratic in (w, b). */
function ellipse(pts: Pt[], best: { w: number; b: number }, c: number, X: (w: number) => number, Y: (b: number) => number): string {
  const n = pts.length;
  // L = L* + (θ − θ*)ᵀ A (θ − θ*) with A = [[mean x², mean x], [mean x, 1]].
  const [p, q, r] = [pts.reduce((s, [x]) => s + x * x, 0) / n, pts.reduce((s, [x]) => s + x, 0) / n, 1];
  const m = (p + r) / 2;
  const dd = Math.hypot((p - r) / 2, q);
  const [l1, l2] = [m + dd, m - dd];
  const th = Math.atan2(2 * q, p - r) / 2;
  const [u, v] = [[Math.cos(th), Math.sin(th)], [-Math.sin(th), Math.cos(th)]];
  const out: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const a = (2 * Math.PI * i) / 160;
    const [s1, s2] = [Math.sqrt(c / l1) * Math.cos(a), Math.sqrt(c / l2) * Math.sin(a)];
    out.push(`${r2(X(best.w + s1 * u[0] + s2 * v[0]))},${r2(Y(best.b + s1 * u[1] + s2 * v[1]))}`);
  }
  return out.join(" ");
}

export type BatchChartWords = { map: string; data: string; loss: string; epoch: string; target: string; best: string };

/**
 * The run so far, after `k` steps: on the left (w, b) on the loss's contours with the path taken (a dot where each
 * epoch ends) and the best line's star, on the right the points with the line now and the best one dashed, and under
 * them the loss above the best after every step, on a log scale by epoch, with the goal's line.
 */
export function batchSvg(pts: Pt[], s: Setup, run: Run, k: number, o: { tol: number; words: BatchChartWords }): string {
  const best = bestOf(pts);
  const n = Math.min(k, run.path.length - 1);
  const path = run.path.slice(0, n + 1);
  const [w, b] = path[n];
  // The map: the start, the best line and where the run is, with room around them (a run far away is drawn at the edge).
  const ws = [s.start[0], best.w, ...path.map((p) => p[0]).filter((v) => Math.abs(v - best.w) < 6)];
  const bs = [s.start[1], best.b, ...path.map((p) => p[1]).filter((v) => Math.abs(v - best.b) < 6)];
  const pad = (lo: number, hi: number): [number, number] => {
    const d = Math.max(0.6, hi - lo) * 0.18;
    return [lo - d, hi + d];
  };
  const [w0, w1] = pad(Math.min(...ws), Math.max(...ws));
  const [b0, b1] = pad(Math.min(...bs), Math.max(...bs));
  const X = (v: number) => MAP.left + ((v - w0) / (w1 - w0)) * MAP.size;
  const Y = (v: number) => MAP.top + ((b1 - v) / (b1 - b0)) * MAP.h;
  const clampX = (v: number) => Math.min(MAP.left + MAP.size, Math.max(MAP.left, X(v)));
  const clampY = (v: number) => Math.min(MAP.top + MAP.h, Math.max(MAP.top, Y(v)));
  let svg = `<clipPath id="batch-map"><rect x="${MAP.left}" y="${MAP.top}" width="${MAP.size}" height="${MAP.h}"/></clipPath>`;
  svg += title(MAP.left, MAP.top - 8, o.words.map);
  svg += `<rect x="${MAP.left}" y="${MAP.top}" width="${MAP.size}" height="${MAP.h}" fill="#fff" stroke="#dee2e6"/>`;
  const startGap = lossOf(pts, s.start[0], s.start[1]) - best.loss;
  for (let i = 0; i < 9; i++) {
    const c = startGap * 2 * 0.45 ** i;
    svg += `<polyline points="${ellipse(pts, best, c, X, Y)}" fill="none" stroke="#ced4da" stroke-width="1.1" clip-path="url(#batch-map)"/>`;
  }
  const [sw, sb] = [niceStep(w1 - w0, 4), niceStep(b1 - b0, 4)];
  for (let v = Math.ceil(w0 / sw) * sw; v <= w1 + 1e-9; v += sw) svg += `<text x="${r2(X(v))}" y="${MAP.top + MAP.h + 14}" font-size="10.5" fill="${GREY}" text-anchor="middle">${t(v)}</text>`;
  for (let v = Math.ceil(b0 / sb) * sb; v <= b1 + 1e-9; v += sb) svg += `<text x="${MAP.left - 5}" y="${r2(Y(v) + 4)}" font-size="10.5" fill="${GREY}" text-anchor="end">${t(v)}</text>`;
  svg += `<text x="${MAP.left + MAP.size}" y="${MAP.top + MAP.h + 28}" font-size="12" font-style="italic" font-weight="700" fill="#495057" text-anchor="end">w</text>`;
  svg += `<text x="${MAP.left + 4}" y="${MAP.top + 13}" font-size="12" font-style="italic" font-weight="700" fill="#495057">b</text>`;
  svg += `<polyline points="${path.map(([pw, pb]) => `${r2(clampX(pw))},${r2(clampY(pb))}`).join(" ")}" fill="none" stroke="${ORANGE}" stroke-width="1.6" stroke-linejoin="round" opacity="0.8" clip-path="url(#batch-map)"/>`;
  for (const e of run.epochEnds) if (e <= n) svg += `<circle cx="${r2(clampX(run.path[e][0]))}" cy="${r2(clampY(run.path[e][1]))}" r="2.6" fill="${ORANGE}"/>`;
  svg += `<path d="M${r2(X(best.w))},${r2(Y(best.b) - 7)}l2,5l5,.4l-4,3.4l1.5,5l-4.5,-2.8l-4.5,2.8l1.5,-5l-4,-3.4l5,-.4z" fill="${GREEN}"/>`;
  svg += `<circle cx="${r2(X(s.start[0]))}" cy="${r2(Y(s.start[1]))}" r="5" fill="#fff" stroke="${ORANGE}" stroke-width="2"/>`;
  svg += `<circle cx="${r2(clampX(w))}" cy="${r2(clampY(b))}" r="7" fill="${ORANGE}" stroke="#1e1e1e" stroke-width="1.4"/>`;

  // The points and the lines.
  const xs = pts.map((p) => p[0]);
  const ysAll = pts.map((p) => p[1]);
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs));
  const [y0, y1] = pad(Math.min(...ysAll), Math.max(...ysAll));
  const DX = (v: number) => DATA.left + ((v - x0) / (x1 - x0)) * DATA.w;
  const DY = (v: number) => DATA.top + ((y1 - v) / (y1 - y0)) * DATA.h;
  svg += `<clipPath id="batch-data"><rect x="${DATA.left}" y="${DATA.top}" width="${DATA.w}" height="${DATA.h}"/></clipPath>`;
  svg += title(DATA.left, DATA.top - 8, o.words.data);
  svg += `<rect x="${DATA.left}" y="${DATA.top}" width="${DATA.w}" height="${DATA.h}" fill="#fff" stroke="#dee2e6"/>`;
  const [sx, sy] = [niceStep(x1 - x0, 5), niceStep(y1 - y0, 5)];
  for (let v = Math.ceil(x0 / sx) * sx; v <= x1 + 1e-9; v += sx) svg += `<text x="${r2(DX(v))}" y="${DATA.top + DATA.h + 14}" font-size="10.5" fill="${GREY}" text-anchor="middle">${t(v)}</text>`;
  for (let v = Math.ceil(y0 / sy) * sy; v <= y1 + 1e-9; v += sy) svg += `<text x="${DATA.left - 5}" y="${r2(DY(v) + 4)}" font-size="10.5" fill="${GREY}" text-anchor="end">${t(v)}</text>`;
  const line = (lw: number, lb: number, color: string, extra: string) => `<line x1="${r2(DX(x0))}" y1="${r2(DY(lw * x0 + lb))}" x2="${r2(DX(x1))}" y2="${r2(DY(lw * x1 + lb))}" stroke="${color}" ${extra} clip-path="url(#batch-data)"/>`;
  svg += line(best.w, best.b, GREEN, `stroke-width="1.8" stroke-dasharray="6 4"`);
  for (const [px, py] of pts) svg += `<circle cx="${r2(DX(px))}" cy="${r2(DY(py))}" r="3.6" fill="#495057"/>`;
  svg += line(w, b, BLUE, `stroke-width="2.6"`);

  // The loss above the best, step by step, on a log scale.
  const total = Math.max(1, s.epochs * Math.ceil(pts.length / s.batch));
  const gaps = run.losses.slice(0, n + 1).map((l) => Math.max(1e-5, l - best.loss));
  const [lo, hi] = [-4, Math.max(1, Math.ceil(Math.log10(Math.max(startGap, 10))))];
  const CX = (i: number) => CHART.left + (i / total) * CHART.w;
  const CY = (g: number) => CHART.top + ((hi - Math.min(hi, Math.max(lo, Math.log10(g)))) / (hi - lo)) * CHART.h;
  svg += title(CHART.left, CHART.top - 8, o.words.loss);
  svg += `<rect x="${CHART.left}" y="${CHART.top}" width="${CHART.w}" height="${CHART.h}" fill="#fff" stroke="#dee2e6"/>`;
  for (let p = lo; p <= hi; p++) svg += `<line x1="${CHART.left}" y1="${r2(CY(10 ** p))}" x2="${CHART.left + CHART.w}" y2="${r2(CY(10 ** p))}" stroke="#f1f3f5"/><text x="${CHART.left - 5}" y="${r2(CY(10 ** p) + 4)}" font-size="10.5" fill="${GREY}" text-anchor="end">${p === 0 ? "1" : `10${p < 0 ? "⁻" : ""}${"⁰¹²³⁴⁵⁶⁷⁸⁹"[Math.abs(p)]}`}</text>`;
  const per = Math.ceil(pts.length / s.batch);
  const every = Math.max(1, Math.ceil(s.epochs / 10));
  for (let e = 0; e <= s.epochs; e += every) svg += `<line x1="${r2(CX(e * per))}" y1="${CHART.top}" x2="${r2(CX(e * per))}" y2="${CHART.top + CHART.h}" stroke="#f1f3f5"/><text x="${r2(CX(e * per))}" y="${CHART.top + CHART.h + 14}" font-size="10.5" fill="${GREY}" text-anchor="middle">${e}</text>`;
  svg += `<text x="${CHART.left + CHART.w}" y="${CHART.top + CHART.h + 28}" font-size="11" fill="#495057" text-anchor="end">${esc(o.words.epoch)}</text>`;
  svg += `<line x1="${CHART.left}" y1="${r2(CY(o.tol))}" x2="${CHART.left + CHART.w}" y2="${r2(CY(o.tol))}" stroke="${GREEN}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
  svg += `<text x="${CHART.left + 6}" y="${r2(CY(o.tol) - 5)}" font-size="11" font-weight="700" fill="${GREEN}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(o.words.target)}</text>`;
  if (gaps.length > 1) svg += `<polyline points="${gaps.map((g, i) => `${r2(CX(i))},${r2(CY(g))}`).join(" ")}" fill="none" stroke="${BLUE}" stroke-width="1.5" stroke-linejoin="round"/>`;
  svg += `<circle cx="${r2(CX(n))}" cy="${r2(CY(gaps[n]))}" r="3.5" fill="${BLUE}"/>`;
  return svg;
}

/** A number for the readout: three significant decimals with a minus sign. */
export const num = (v: number) => (Math.abs(v) < 5e-5 ? "0" : nf(v, Math.abs(v) < 0.01 ? 4 : 3).replace(/^-/, "−").replace("e-", "e−"));
