// The nearest-neighbours lab: labelled points on a plane and a new point dragged among them. Its k nearest points
// vote, and the most votes name its class (a tie goes to the nearest one's class). The regions every point of the
// plane would be called can be shaded, which shows k = 1 following every noisy point and a large k smoothing it all
// away, and test points kept out of the vote say how well each k does on data it has not seen. Distance can be
// straight-line or along the axes, and features in different units can be scaled to their spread first; unscaled,
// the feature with the larger numbers decides alone. A side panel measures distances in more dimensions, where the
// nearest and the farthest of many random points end up almost equally far. Puzzles ask for one idea each. Kept free
// of React so it can be tested on its own.
import type { GameBase } from "./ladder";
import { rng } from "./random";
import { nf } from "./text";

/** A labelled point on the plane, in the unit square: class 1 (orange) or 0 (blue), and whether it is kept for testing. */
export type KPoint = { x: number; y: number; c: 0 | 1; test?: boolean };
/** Two blobs with a little label noise, a disc inside a ring, features in different units, and the distance puzzle's few points. */
export type KnnData = "blobs" | "rings" | "units" | "metric";
export const FREE_DATA = ["blobs", "rings", "units"] as const;
export type Metric = "euclid" | "manhattan";
export const METRICS: Metric[] = ["euclid", "manhattan"];
/** The units of each feature: on "units" the first runs to 1000 and the second to 1. */
export const unitsOf = (data: KnnData): [number, number] => (data === "units" ? [1000, 1] : [1, 1]);

/** A normal draw from two uniform ones (Box–Muller). */
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const clip = (v: number) => Math.round(Math.min(0.97, Math.max(0.03, v)) * 1000) / 1000;

/** The points of a dataset: the training points first, then the test points. */
export function pointsOf(data: KnnData, seed: number): KPoint[] {
  const r = rng(seed * 31 + data.length);
  const out: KPoint[] = [];
  if (data === "blobs") {
    const blob = (c: 0 | 1, n: number, test: boolean) => {
      const [mx, my] = c ? [0.62, 0.6] : [0.38, 0.4];
      for (let i = 0; i < n; i++) out.push({ x: clip(mx + 0.15 * normal(r)), y: clip(my + 0.15 * normal(r)), c, ...(test ? { test } : {}) });
    };
    blob(1, 24, false);
    blob(0, 24, false);
    // Label noise: one of each class deep in the other's blob.
    out.push({ x: 0.3, y: 0.3, c: 1 }, { x: 0.71, y: 0.69, c: 0 });
    blob(1, 20, true);
    blob(0, 20, true);
  } else if (data === "rings") {
    const ring = (c: 0 | 1, n: number, test: boolean) => {
      for (let i = 0; i < n; i++) {
        const [a, rad] = [2 * Math.PI * r(), c ? 0.2 * Math.sqrt(r()) : 0.27 + 0.18 * r()];
        out.push({ x: clip(0.5 + rad * Math.cos(a)), y: clip(0.5 + rad * Math.sin(a)), c, ...(test ? { test } : {}) });
      }
    };
    ring(1, 22, false);
    ring(0, 34, false);
    ring(1, 10, true);
    ring(0, 14, true);
  } else if (data === "units") {
    // Orange when the second feature is above ½; the first says nothing about the class.
    for (let i = 0; i < 40; i++) {
      const [x, y] = [clip(r()), clip(r())];
      out.push({ x, y, c: y > 0.5 ? 1 : 0 });
    }
  } else {
    // Straight-line distance puts the blue point nearest, distance along the axes the orange one.
    out.push({ x: 0.8, y: 0.5, c: 1 }, { x: 0.7, y: 0.7, c: 0 }, { x: 0.12, y: 0.15, c: 1 }, { x: 0.15, y: 0.85, c: 0 }, { x: 0.85, y: 0.12, c: 0 }, { x: 0.2, y: 0.5, c: 1 });
  }
  return out;
}
export const trainOf = (ps: KPoint[]) => ps.filter((p) => !p.test);
export const testOf = (ps: KPoint[]) => ps.filter((p) => p.test);

/** How far apart two points are, in the features' own units unless scaled (each feature divided by its spread). */
export function distance(a: { x: number; y: number }, b: { x: number; y: number }, metric: Metric, units: [number, number], scaled: boolean): number {
  const [ux, uy] = scaled ? [1, 1] : units;
  const [dx, dy] = [Math.abs(a.x - b.x) * ux, Math.abs(a.y - b.y) * uy];
  return metric === "euclid" ? Math.hypot(dx, dy) : dx + dy;
}

export type Setting = { k: number; metric: Metric; scaled: boolean; units: [number, number] };
export type Vote = { near: { p: KPoint; d: number }[]; votes: [number, number]; c: 0 | 1 };
/** The k nearest training points to q, their votes for blue and orange, and the class they name (a tie: the nearest's). */
export function vote(q: { x: number; y: number }, train: KPoint[], s: Setting): Vote {
  const near = train.map((p) => ({ p, d: distance(q, p, s.metric, s.units, s.scaled) })).sort((a, b) => a.d - b.d).slice(0, s.k);
  const votes: [number, number] = [0, 0];
  near.forEach((n) => votes[n.p.c]++);
  const c = votes[1] > votes[0] ? 1 : votes[0] > votes[1] ? 0 : near[0].p.c;
  return { near, votes, c };
}
/** The share of points called their own class: the test points, or the training points (each among its own neighbours). */
export function accuracy(points: KPoint[], train: KPoint[], s: Setting): number {
  if (!points.length) return NaN;
  return points.filter((p) => vote(p, train, s).c === p.c).length / points.length;
}
export const K_MAX = 25;
/** The best test accuracy any k from 1 to K_MAX reaches. */
export function bestTest(ps: KPoint[], s: Omit<Setting, "k">): number {
  const [train, test] = [trainOf(ps), testOf(ps)];
  return Math.max(...Array.from({ length: K_MAX }, (_, i) => accuracy(test, train, { ...s, k: i + 1 })));
}

// ---------- distances in more dimensions ----------

export const DIMS = [1, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000];
const CLOUD = 100;
const curseMemo = new Map<number, { ds: number[]; ratio: number }>();
/** The distances from one random point to 100 others in the unit cube of d dimensions, as shares of the farthest (sorted), and nearest / farthest. */
export function curseOf(d: number): { ds: number[]; ratio: number } {
  const hit = curseMemo.get(d);
  if (hit) return hit;
  const r = rng(7000 + d);
  const pick = () => Array.from({ length: d }, r);
  const q = pick();
  const raw = Array.from({ length: CLOUD }, () => Math.hypot(...pick().map((v, i) => v - q[i]))).sort((a, b) => a - b);
  const far = raw[raw.length - 1];
  const out = { ds: raw.map((v) => v / far), ratio: raw[0] / far };
  curseMemo.set(d, out);
  return out;
}

// ---------- the puzzles ----------

export type KnnGoal = { kind: "class"; want: 0 | 1 } | { kind: "bestTest" } | { kind: "curse"; min: number };
export type KnnControl = "drag" | "k" | "scale" | "metric" | "dims";
export type KnnNotice = "vote" | "noise" | "smooth" | "scale" | "metric" | "curse";
export const KNN_NOTICES: KnnNotice[] = ["vote", "noise", "smooth", "scale", "metric", "curse"];
/** A puzzle: its data, where it starts, what the player may change, what it asks and what it shows when won. */
export type KnnPuzzle = { data: KnnData; start: Partial<LiveKnn>; controls: KnnControl[]; goal: KnnGoal; notice: KnnNotice };
const BASE = { k: 3, metric: "euclid" as Metric, scaled: true, regions: false, dims: 2 };
export const KNN_LADDER: KnnPuzzle[] = [
  { data: "blobs", start: { ...BASE, q: [0.3, 0.42] }, controls: ["drag"], goal: { kind: "class", want: 1 }, notice: "vote" },
  { data: "blobs", start: { ...BASE, k: 1, q: [0.31, 0.32] }, controls: ["k"], goal: { kind: "class", want: 0 }, notice: "noise" },
  { data: "blobs", start: { ...BASE, k: 1, q: [0.5, 0.5], regions: true }, controls: ["k", "drag"], goal: { kind: "bestTest" }, notice: "smooth" },
  { data: "units", start: { ...BASE, scaled: false, q: [0.5, 0.8] }, controls: ["scale"], goal: { kind: "class", want: 1 }, notice: "scale" },
  { data: "metric", start: { ...BASE, k: 1, q: [0.5, 0.5] }, controls: ["metric"], goal: { kind: "class", want: 1 }, notice: "metric" },
  { data: "blobs", start: { ...BASE, q: [0.5, 0.5] }, controls: ["dims"], goal: { kind: "curse", min: 0.6 }, notice: "curse" },
];
export const PUZZLE_SEED = 27;

export type KnnSlip = "wrongClass" | "notBest" | "tooSpread";
export type KnnVerdict = { state: "won" } | { state: "lost"; why: KnnSlip; have: number; want: number };

/** The game's state: the shared shape (no endless run: free play instead), the new point, the setting and the try. */
export type LiveKnn = GameBase<KnnNotice, { kind: "wrong"; why: KnnSlip }> & {
  mode: "puzzle" | "free";
  q: [number, number];
  k: number;
  metric: Metric;
  scaled: boolean;
  regions: boolean;
  dims: number;
  /** Free play's data and the seed of its points. */
  data: KnnData;
  seed: number;
  tries: number;
  done: boolean;
};
export const KNN_START: LiveKnn = { mode: "puzzle", stage: 0, ...BASE, q: [0.3, 0.42], data: "blobs", seed: 1, tries: 0, done: false, said: null };
export const knnPuzzle = (d: Pick<LiveKnn, "mode" | "stage">) => (d.mode === "puzzle" ? KNN_LADDER[d.stage] : null);
/** The data a state shows: the puzzle's, or free play's. */
export const dataOf = (d: LiveKnn): KnnData => knnPuzzle(d)?.data ?? d.data;
export const knnPoints = (d: LiveKnn) => (knnPuzzle(d) ? pointsOf(dataOf(d), PUZZLE_SEED) : pointsOf(d.data, d.seed));
export const settingOf = (d: LiveKnn): Setting => ({ k: d.k, metric: d.metric, scaled: d.scaled, units: unitsOf(dataOf(d)) });
export const knnStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
/** What the player may change: a puzzle's controls, or all of them in free play. */
export const controlsOf = (d: LiveKnn): KnnControl[] => knnPuzzle(d)?.controls ?? ["drag", "k", "scale", "metric", "dims"];

/** A state judged against a goal. */
export function judgeKnn(d: LiveKnn, g: KnnGoal): KnnVerdict {
  const ps = knnPoints(d);
  const s = settingOf(d);
  const lost = (why: KnnSlip, have: number, want: number): KnnVerdict => ({ state: "lost", why, have, want });
  switch (g.kind) {
    case "class": {
      const c = vote({ x: d.q[0], y: d.q[1] }, trainOf(ps), s).c;
      return c === g.want ? { state: "won" } : lost("wrongClass", c, g.want);
    }
    case "bestTest": {
      const [have, best] = [accuracy(testOf(ps), trainOf(ps), s), bestTest(ps, s)];
      return have >= best - 1e-9 ? { state: "won" } : lost("notBest", have, best);
    }
    case "curse": {
      const r = curseOf(d.dims).ratio;
      return r >= g.min ? { state: "won" } : lost("tooSpread", r, g.min);
    }
  }
}

// ---------- the picture ----------

export const KNN_PLOT = { w: 640, h: 446 };
export const PLANE = { left: 44, top: 24, size: 390 };
const SIDE = { left: 462, w: 160 };
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const RED = "#e03131";
const GREY = "#868e96";
const INK = "#1e1e1e";
const r2 = (v: number) => Math.round(v * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type TextStyle = { size?: number; fill?: string; bold?: boolean; anchor?: "start" | "middle" | "end" };
const txt = (x: number, y: number, s: string, o: TextStyle = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 12}" fill="${o.fill ?? "#495057"}"${o.bold ? ` font-weight="700"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
/** A share for the readout: up to three digits, or a dash when there is none. */
export const num = (v: number) => (Number.isFinite(v) ? nf(v, 3) : "—");

/** From the unit square to the plane's pixels and back (y grows upwards). */
export const toPx = (x: number, y: number): [number, number] => [PLANE.left + x * PLANE.size, PLANE.top + (1 - y) * PLANE.size];
export const fromPx = (px: number, py: number): [number, number] => [
  Math.round(Math.min(1, Math.max(0, (px - PLANE.left) / PLANE.size)) * 100) / 100,
  Math.round(Math.min(1, Math.max(0, 1 - (py - PLANE.top) / PLANE.size)) * 100) / 100,
];

export type KnnWords = { vote: string; called: string; test: string; train: string; dims: string; ratio: string; near: string; far: string; classes: readonly string[] };
const COLOURS = [BLUE, ORANGE];
const G = 40;

/**
 * The plane: the regions each point would be called (when shown), the training points (orange filled, blue hollow),
 * the test points as small squares (ringed red when called wrong), the new point's neighbourhood out to its k-th
 * neighbour (a circle, or a diamond for distance along the axes, stretched when the units differ) with a line to each
 * neighbour, and the new point in the colour it is called. Beside it the vote, the accuracies, and distances in d dimensions.
 */
export function knnSvg(d: LiveKnn, w: KnnWords): string {
  const ps = knnPoints(d);
  const [train, test] = [trainOf(ps), testOf(ps)];
  const s = settingOf(d);
  const q = { x: d.q[0], y: d.q[1] };
  const v = vote(q, train, s);
  const [ux, uy] = s.scaled ? [1, 1] : s.units;
  let out = `<clipPath id="knn-clip"><rect x="${PLANE.left}" y="${PLANE.top}" width="${PLANE.size}" height="${PLANE.size}"/></clipPath>`;
  out += `<rect x="${PLANE.left}" y="${PLANE.top}" width="${PLANE.size}" height="${PLANE.size}" fill="#fff" stroke="#dee2e6"/>`;
  if (d.regions) {
    // One group's opacity over solid cells, so the cells leave no seams.
    const cell = PLANE.size / G;
    let g = "";
    for (let i = 0; i < G; i++)
      for (let j = 0; j < G; j++) {
        const c = vote({ x: (i + 0.5) / G, y: (j + 0.5) / G }, train, s).c;
        g += `<rect x="${r2(PLANE.left + i * cell)}" y="${r2(PLANE.top + (G - 1 - j) * cell)}" width="${r2(cell + 0.6)}" height="${r2(cell + 0.6)}" fill="${COLOURS[c]}"/>`;
      }
    out += `<g opacity="0.16">${g}</g>`;
  }
  // The grid and the features' own numbers.
  for (let t = 0; t <= 4; t++) {
    const [gx, gy] = toPx(t / 4, t / 4);
    out += `<line x1="${r2(gx)}" y1="${PLANE.top}" x2="${r2(gx)}" y2="${PLANE.top + PLANE.size}" stroke="#f1f3f5"/><line x1="${PLANE.left}" y1="${r2(gy)}" x2="${PLANE.left + PLANE.size}" y2="${r2(gy)}" stroke="#f1f3f5"/>`;
    out += txt(gx, PLANE.top + PLANE.size + 15, nf((t / 4) * s.units[0], 3), { anchor: "middle", size: 10.5, fill: GREY });
    out += txt(PLANE.left - 6, gy + 4, nf((t / 4) * s.units[1], 3), { anchor: "end", size: 10.5, fill: GREY });
  }
  // The neighbourhood out to the k-th neighbour, in the plane's pixels.
  const reach = v.near[v.near.length - 1].d;
  const [rx, ry] = [(reach / ux) * PLANE.size, (reach / uy) * PLANE.size];
  const [qx, qy] = toPx(q.x, q.y);
  const shape =
    d.metric === "euclid"
      ? `<ellipse cx="${r2(qx)}" cy="${r2(qy)}" rx="${r2(rx)}" ry="${r2(ry)}"`
      : `<polygon points="${r2(qx - rx)},${r2(qy)} ${r2(qx)},${r2(qy - ry)} ${r2(qx + rx)},${r2(qy)} ${r2(qx)},${r2(qy + ry)}"`;
  out += `<g clip-path="url(#knn-clip)">${shape} fill="${COLOURS[v.c]}" fill-opacity="0.08" stroke="${COLOURS[v.c]}" stroke-dasharray="5 4" stroke-width="1.5"/>`;
  out += v.near.map((n) => `<line x1="${r2(qx)}" y1="${r2(qy)}" x2="${r2(toPx(n.p.x, n.p.y)[0])}" y2="${r2(toPx(n.p.x, n.p.y)[1])}" stroke="${GREY}" stroke-width="1.2"/>`).join("") + "</g>";
  for (const p of train) {
    const [px, py] = toPx(p.x, p.y);
    out += p.c ? `<circle cx="${r2(px)}" cy="${r2(py)}" r="4.5" fill="${ORANGE}"/>` : `<circle cx="${r2(px)}" cy="${r2(py)}" r="4" fill="#fff" stroke="${BLUE}" stroke-width="1.8"/>`;
  }
  for (const n of v.near) out += `<circle cx="${r2(toPx(n.p.x, n.p.y)[0])}" cy="${r2(toPx(n.p.x, n.p.y)[1])}" r="7.5" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
  for (const p of test) {
    const [px, py] = toPx(p.x, p.y);
    out += `<rect x="${r2(px - 3.5)}" y="${r2(py - 3.5)}" width="7" height="7" fill="${COLOURS[p.c]}" opacity="0.75"/>`;
    if (vote(p, train, s).c !== p.c) out += `<rect x="${r2(px - 6.5)}" y="${r2(py - 6.5)}" width="13" height="13" fill="none" stroke="${RED}" stroke-width="1.6"/>`;
  }
  out += `<circle cx="${r2(qx)}" cy="${r2(qy)}" r="9" fill="${COLOURS[v.c]}" stroke="${INK}" stroke-width="2.5"/>`;
  out += `<path d="M${r2(qx - 4)} ${r2(qy)}H${r2(qx + 4)}M${r2(qx)} ${r2(qy - 4)}V${r2(qy + 4)}" stroke="#fff" stroke-width="2"/>`;

  // The vote.
  const S = SIDE;
  let y = PLANE.top + 6;
  out += txt(S.left, y, `${w.vote}, k = ${d.k}`, { bold: true, size: 13 });
  [1, 0].forEach((c, i) => {
    const yy = y + 12 + i * 26;
    out += `<rect x="${S.left}" y="${yy}" width="${S.w - 34}" height="16" fill="#f1f3f5"/><rect x="${S.left}" y="${yy}" width="${r2(((S.w - 34) * v.votes[c]) / d.k)}" height="16" fill="${COLOURS[c]}"/>`;
    out += txt(S.left + S.w - 28, yy + 13, String(v.votes[c]), { bold: true, fill: COLOURS[c] });
  });
  y += 80;
  out += txt(S.left, y, `${w.called}: ${w.classes[v.c]}`, { bold: true, size: 13, fill: COLOURS[v.c] });

  // How well this k does on the training points and on the test points.
  if (test.length) {
    y += 30;
    const accs: [string, number][] = [[w.train, accuracy(train, train, s)], [w.test, accuracy(test, train, s)]];
    accs.forEach(([name, a], i) => {
      const yy = y + i * 34;
      out += txt(S.left, yy, name, { size: 11.5, bold: true });
      out += `<rect x="${S.left}" y="${yy + 5}" width="${S.w - 44}" height="12" fill="#f1f3f5"/><rect x="${S.left}" y="${yy + 5}" width="${r2((S.w - 44) * a)}" height="12" fill="${i ? INK : GREY}"/>`;
      out += txt(S.left + S.w - 38, yy + 16, num(a), { bold: true });
    });
    y += 58;
  }

  // Distances in d dimensions: 100 random points' distances from one, as shares of the farthest.
  const cu = curseOf(d.dims);
  y = Math.max(y + 34, 270);
  out += txt(S.left, y, w.dims.replace("{d}", String(d.dims)), { bold: true, size: 12 });
  const [x0, x1] = [S.left, S.left + S.w - 6];
  const sy = y + 46;
  out += `<line x1="${x0}" y1="${sy}" x2="${x1}" y2="${sy}" stroke="#adb5bd"/>`;
  const stack = new Map<number, number>();
  for (const v2 of cu.ds) {
    const b = Math.round(v2 * 40);
    const k = stack.get(b) ?? 0;
    stack.set(b, k + 1);
    if (k < 8) out += `<circle cx="${r2(x0 + v2 * (x1 - x0))}" cy="${r2(sy - 4 - k * 4.4)}" r="2" fill="${GREY}"/>`;
  }
  out += txt(x0, sy + 14, "0", { size: 10, fill: GREY }) + txt(x1, sy + 14, "1", { size: 10, fill: GREY, anchor: "end" });
  const nx = x0 + cu.ratio * (x1 - x0);
  out += `<line x1="${r2(nx)}" y1="${sy - 40}" x2="${r2(nx)}" y2="${sy + 4}" stroke="${RED}" stroke-width="2"/>`;
  out += txt(S.left, sy + 32, `${w.ratio} = ${nf(cu.ratio, 2)}`, { bold: true, fill: RED });
  out += txt(S.left, sy + 48, w.near, { size: 10.5 }) + txt(S.left, sy + 62, w.far, { size: 10.5 });
  return out;
}
