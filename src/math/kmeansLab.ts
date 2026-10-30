// The k-means lab: points without labels, k centres, and the two steps that find groups in them: assign every point
// to its nearest centre, then move every centre to the mean of its points. Each step lowers the error, the sum of the
// squared distances from the points to their centres, until nothing changes. A bad start gets stuck in a worse
// grouping (a local minimum), which k-means++ starts (each new centre drawn far from the ones already chosen) mostly
// avoid; the best error for each k, drawn as a curve, bends at the k the data hold (the elbow); and on a disc inside a
// ring k-means can only cut round pieces. Kept free of React so it can be tested on its own.
import type { GameBase } from "./ladder";
import { rng } from "./random";
import { nf } from "./text";

export type Pt = [number, number];
/** Three blobs, four blobs, a disc inside a ring, and points with no groups at all. */
export type KmData = "three" | "four" | "rings" | "even";
export const FREE_DATA: KmData[] = ["three", "four", "rings", "even"];

const normal = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const clip = (v: number) => Math.round(Math.min(0.98, Math.max(0.02, v)) * 1000) / 1000;

export function pointsOf(data: KmData, seed: number): Pt[] {
  const r = rng(seed * 41 + data.length * 3);
  const blobs = (centres: Pt[], n: number, sd: number) => centres.flatMap(([mx, my]) => Array.from({ length: n }, (): Pt => [clip(mx + sd * normal(r)), clip(my + sd * normal(r))]));
  if (data === "three") return blobs([[0.25, 0.7], [0.72, 0.76], [0.5, 0.24]], 18, 0.07);
  if (data === "four") return blobs([[0.22, 0.25], [0.25, 0.75], [0.75, 0.78], [0.76, 0.28]], 14, 0.065);
  if (data === "rings")
    return Array.from({ length: 60 }, (_, i): Pt => {
      const [a, rad] = [2 * Math.PI * r(), i < 18 ? 0.11 * Math.sqrt(r()) : 0.3 + 0.08 * r()];
      return [clip(0.5 + rad * Math.cos(a)), clip(0.5 + rad * Math.sin(a))];
    });
  return Array.from({ length: 50 }, (): Pt => [clip(r()), clip(r())]);
}
/** On the rings, the first 18 points are the disc's. */
export const DISC = 18;

const d2 = (a: Pt, b: Pt) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
/** Each point's nearest centre (the first on a tie). */
export const assignStep = (ps: Pt[], cs: Pt[]) => ps.map((p) => cs.reduce((best, c, j) => (d2(p, c) < d2(p, cs[best]) ? j : best), 0));
/** Each centre moved to the mean of its points; a centre with none stays where it is. */
export function moveStep(ps: Pt[], labels: number[], cs: Pt[]): Pt[] {
  return cs.map((c, j) => {
    const mine = ps.filter((_, i) => labels[i] === j);
    return mine.length ? [mine.reduce((s, p) => s + p[0], 0) / mine.length, mine.reduce((s, p) => s + p[1], 0) / mine.length] : c;
  });
}
/** The error: the sum of the squared distances from the points to their centres. */
export const sse = (ps: Pt[], labels: number[], cs: Pt[]) => ps.reduce((s, p, i) => s + d2(p, cs[labels[i]]), 0);
const same = (a: Pt[], b: Pt[]) => a.every((c, j) => Math.abs(c[0] - b[j][0]) < 1e-12 && Math.abs(c[1] - b[j][1]) < 1e-12);
/** Assign and move until nothing changes: the centres, the labels, and the error after every step. */
export function run(ps: Pt[], start: Pt[], labels0: number[] | null = null): { centres: Pt[]; labels: number[]; errs: number[] } {
  let cs = start;
  let labels = labels0 ?? assignStep(ps, cs);
  const errs = [sse(ps, labels, cs)];
  for (let it = 0; it < 200; it++) {
    const moved = moveStep(ps, labels, cs);
    const relabelled = assignStep(ps, moved);
    const done = same(moved, cs) && relabelled.every((l, i) => l === labels[i]);
    cs = moved;
    errs.push(sse(ps, labels, cs));
    if (done) break;
    labels = relabelled;
    errs.push(sse(ps, labels, cs));
  }
  return { centres: cs, labels, errs };
}
/** k centres at k different points picked at random. */
export function randomStart(ps: Pt[], k: number, seed: number): Pt[] {
  const r = rng(seed * 7 + k);
  const idx = [...ps.keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, k).map((i) => [...ps[i]] as Pt);
}
/** k-means++: the first centre a random point, each next one a point drawn with chance in proportion to its squared
 * distance from the nearest centre already chosen. */
export function plusStart(ps: Pt[], k: number, seed: number): Pt[] {
  const r = rng(seed * 13 + k * 3);
  const cs: Pt[] = [[...ps[Math.floor(r() * ps.length)]] as Pt];
  while (cs.length < k) {
    const w = ps.map((p) => Math.min(...cs.map((c) => d2(p, c))));
    let u = r() * w.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < ps.length - 1 && (u -= w[i]) > 0) i++;
    cs.push([...ps[i]] as Pt);
  }
  return cs;
}
export const K_MAX = 8;
const bestMemo = new Map<string, number>();
/** The lowest error found for k clusters: the best of 30 k-means++ starts run to the end. */
export function bestSse(ps: Pt[], k: number): number {
  const key = `${k}|${ps.map((p) => p.join(",")).join(";")}`;
  const hit = bestMemo.get(key);
  if (hit !== undefined) return hit;
  let best = Infinity;
  for (let s = 1; s <= 30; s++) {
    const out = run(ps, plusStart(ps, k, s));
    best = Math.min(best, out.errs[out.errs.length - 1]);
  }
  if (bestMemo.size > 200) bestMemo.clear();
  bestMemo.set(key, best);
  return best;
}
export const elbowCurve = (ps: Pt[]) => Array.from({ length: K_MAX }, (_, i) => bestSse(ps, i + 1));

// ---------- the puzzles ----------

export type KmGoal = { kind: "converged" } | { kind: "error"; within: number } | { kind: "elbow"; k: number } | { kind: "disc"; share: number };
export type KmControl = "step" | "drag" | "run" | "starts" | "k";
export type KmNotice = "steps" | "error" | "local" | "elbow" | "round";
export const KM_NOTICES: KmNotice[] = ["steps", "error", "local", "elbow", "round"];
/** A puzzle: its data, where it starts, what the player may change, whether points always show their nearest centre
 * (live), what it asks and what it shows when won. */
export type KmPuzzle = { data: KmData; start: Partial<LiveKmeans>; controls: KmControl[]; live: boolean; goal: KmGoal; notice: KmNotice };
const fresh0 = { labels: null, errs: [], steps: 0 };
export const PUZZLE_SEED = 1;
/** Puzzle 3 opens where k-means stopped from a bad start: two centres in one blob, one between the other two. */
const stuck = run(pointsOf("three", PUZZLE_SEED), [[0.72, 0.8], [0.72, 0.7], [0.4, 0.45]]);
export const KM_LADDER: KmPuzzle[] = [
  { data: "three", start: { ...fresh0, k: 3, centres: [[0.1, 0.92], [0.2, 0.86], [0.08, 0.78]] }, controls: ["step"], live: false, goal: { kind: "converged" }, notice: "steps" },
  { data: "three", start: { ...fresh0, k: 3, centres: [[0.45, 0.5], [0.5, 0.55], [0.55, 0.5]] }, controls: ["drag"], live: true, goal: { kind: "error", within: 1.1 }, notice: "error" },
  { data: "three", start: { k: 3, centres: stuck.centres, labels: stuck.labels, errs: stuck.errs, steps: stuck.errs.length - 1 }, controls: ["run", "drag", "starts"], live: false, goal: { kind: "error", within: 1.02 }, notice: "local" },
  { data: "four", start: { ...fresh0, k: 2 }, controls: ["k"], live: false, goal: { kind: "elbow", k: 4 }, notice: "elbow" },
  { data: "rings", start: { ...fresh0, k: 2 }, controls: ["k"], live: false, goal: { kind: "disc", share: 0.8 }, notice: "round" },
];

export type KmSlip = "notConverged" | "errorHigh" | "fewK" | "manyK" | "discMixed";
export type KmVerdict = { state: "won" } | { state: "lost"; why: KmSlip; have: number; want: number };

/** The game's state: k, the centres, the points' clusters (null before the first assignment), the steps taken and the
 * error after each, and free play's data and seed. */
export type LiveKmeans = GameBase<KmNotice, { kind: "wrong"; why: KmSlip }> & {
  mode: "puzzle" | "free";
  k: number;
  centres: Pt[];
  labels: number[] | null;
  errs: number[];
  steps: number;
  data: KmData;
  seed: number;
  /** How many starts have been drawn, the seed of the next. */
  starts: number;
  tries: number;
  done: boolean;
};
export const KM_START: LiveKmeans = { mode: "puzzle", stage: 0, k: 3, centres: KM_LADDER[0].start.centres!, labels: null, errs: [], steps: 0, data: "three", seed: 1, starts: 0, tries: 0, done: false, said: null };
export const kmPuzzle = (d: Pick<LiveKmeans, "mode" | "stage">) => (d.mode === "puzzle" ? KM_LADDER[d.stage] : null);
export const kmPoints = (d: LiveKmeans) => {
  const p = kmPuzzle(d);
  return p ? pointsOf(p.data, PUZZLE_SEED) : pointsOf(d.data, d.seed);
};
export const controlsOf = (d: LiveKmeans): KmControl[] => kmPuzzle(d)?.controls ?? ["step", "drag", "run", "starts", "k"];
export const kmStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
/** The clusters shown: the state's, or each point's nearest centre when the puzzle shows them live. */
export const labelsOf = (d: LiveKmeans, ps: Pt[]) => d.labels ?? (kmPuzzle(d)?.live ? assignStep(ps, d.centres) : null);

/** The clustering a k-slider puzzle shows for k: a k-means++ start run to the end. */
export function settled(ps: Pt[], k: number, seed: number): Pick<LiveKmeans, "k" | "centres" | "labels" | "errs" | "steps"> {
  const out = run(ps, plusStart(ps, k, seed));
  return { k, centres: out.centres, labels: out.labels, errs: out.errs, steps: out.errs.length - 1 };
}
/** The largest share of the disc's points in one cluster with no ring point in it. */
export function discShare(labels: number[]): number {
  const k = Math.max(...labels) + 1;
  let best = 0;
  for (let j = 0; j < k; j++) {
    const members = labels.map((l, i) => (l === j ? i : -1)).filter((i) => i >= 0);
    if (members.length && members.every((i) => i < DISC)) best = Math.max(best, members.length / DISC);
  }
  return best;
}

export function judgeKm(d: LiveKmeans, g: KmGoal): KmVerdict {
  const ps = kmPoints(d);
  const lost = (why: KmSlip, have: number, want: number): KmVerdict => ({ state: "lost", why, have, want });
  const labels = labelsOf(d, ps);
  switch (g.kind) {
    case "converged": {
      if (!labels) return lost("notConverged", ps.length, 0);
      const moves = assignStep(ps, d.centres).filter((l, i) => l !== labels[i]).length;
      const still = same(moveStep(ps, labels, d.centres), d.centres);
      return !moves && still ? { state: "won" } : lost("notConverged", moves, 0);
    }
    case "error": {
      const [have, best] = [labels ? sse(ps, labels, d.centres) : Infinity, bestSse(ps, d.k)];
      return have <= best * g.within + 1e-12 ? { state: "won" } : lost("errorHigh", have, best * g.within);
    }
    case "elbow":
      return d.k === g.k ? { state: "won" } : d.k < g.k ? lost("fewK", d.k, d.k + 1) : lost("manyK", d.k, d.k - 1);
    case "disc": {
      const share = labels ? discShare(labels) : 0;
      return share >= g.share - 1e-9 ? { state: "won" } : lost("discMixed", share, g.share);
    }
  }
}

// ---------- the picture ----------

export const KM_PLOT = { w: 640, h: 446 };
export const PLANE = { left: 44, top: 24, size: 390 };
const SIDE = { left: 466, w: 160 };
export const CLUSTER_COLOURS = ["#1971c2", "#e8590c", "#2f9e44", "#9c36b5", "#e03131", "#0c8599", "#f08c00", "#5c940d"];
const GREY = "#868e96";
const INK = "#1e1e1e";
const r2 = (v: number) => Math.round(v * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type TextStyle = { size?: number; fill?: string; bold?: boolean; anchor?: "start" | "middle" | "end" };
const txt = (x: number, y: number, s: string, o: TextStyle = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 12}" fill="${o.fill ?? "#495057"}"${o.bold ? ` font-weight="700"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
export const num = (v: number) => (Number.isFinite(v) ? nf(v, 3) : "—");

export const toPx = (x: number, y: number): Pt => [PLANE.left + x * PLANE.size, PLANE.top + (1 - y) * PLANE.size];
export const fromPx = (px: number, py: number): Pt => [
  Math.round(Math.min(1, Math.max(0, (px - PLANE.left) / PLANE.size)) * 1000) / 1000,
  Math.round(Math.min(1, Math.max(0, 1 - (py - PLANE.top) / PLANE.size)) * 1000) / 1000,
];
/** The centre nearest a page point, if within 18 pixels. */
export function centreAt(cs: Pt[], px: number, py: number): number | null {
  let best: number | null = null;
  cs.forEach((c, j) => {
    const [cx, cy] = toPx(c[0], c[1]);
    if (Math.hypot(cx - px, cy - py) <= 18 && (best === null || Math.hypot(cx - px, cy - py) < Math.hypot(toPx(...cs[best])[0] - px, toPx(...cs[best])[1] - py))) best = j;
  });
  return best;
}

export type KmWords = { error: string; steps: string; elbow: string; k: string };

/**
 * The plane: the points in their cluster's colour (grey before any assignment) with a faint line to their centre, and
 * the centres as large crosses. Beside it the error now and after each step, and the best error for every k with the
 * current k marked.
 */
export function kmSvg(d: LiveKmeans, w: KmWords): string {
  const ps = kmPoints(d);
  const labels = labelsOf(d, ps);
  let out = `<rect x="${PLANE.left}" y="${PLANE.top}" width="${PLANE.size}" height="${PLANE.size}" fill="#fff" stroke="#dee2e6"/>`;
  for (let k = 0; k <= 4; k++) {
    const [gx, gy] = toPx(k / 4, k / 4);
    out += `<line x1="${r2(gx)}" y1="${PLANE.top}" x2="${r2(gx)}" y2="${PLANE.top + PLANE.size}" stroke="#f1f3f5"/><line x1="${PLANE.left}" y1="${r2(gy)}" x2="${PLANE.left + PLANE.size}" y2="${r2(gy)}" stroke="#f1f3f5"/>`;
    out += txt(gx, PLANE.top + PLANE.size + 15, nf(k / 4, 3), { anchor: "middle", size: 10.5, fill: GREY }) + txt(PLANE.left - 6, gy + 4, nf(k / 4, 3), { anchor: "end", size: 10.5, fill: GREY });
  }
  const colour = (j: number) => CLUSTER_COLOURS[j % CLUSTER_COLOURS.length];
  if (labels) ps.forEach((p, i) => {
    const [a, b] = [toPx(p[0], p[1]), toPx(...d.centres[labels[i]])];
    out += `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="${colour(labels[i])}" stroke-opacity="0.22"/>`;
  });
  ps.forEach((p, i) => {
    const [x, y] = toPx(p[0], p[1]);
    out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="4.2" fill="${labels ? colour(labels[i]) : "#adb5bd"}"/>`;
  });
  d.centres.forEach((c, j) => {
    const [x, y] = toPx(c[0], c[1]);
    out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="11" fill="#fff" stroke="${colour(j)}" stroke-width="3"/>`;
    out += `<path d="M${r2(x - 6)} ${r2(y - 6)}L${r2(x + 6)} ${r2(y + 6)}M${r2(x - 6)} ${r2(y + 6)}L${r2(x + 6)} ${r2(y - 6)}" stroke="${INK}" stroke-width="2.4"/>`;
  });

  // The error, now and after each step.
  const S = SIDE;
  let y = PLANE.top + 6;
  const now = labels ? sse(ps, labels, d.centres) : NaN;
  out += txt(S.left, y, `${w.error} = ${num(now)}`, { bold: true, size: 13 });
  out += txt(S.left, y + 17, w.steps.replace("{n}", String(d.steps)), { size: 11 });
  const errs = d.errs.length ? d.errs : Number.isFinite(now) ? [now] : [];
  const box = { left: S.left, top: y + 28, w: S.w - 8, h: 110 };
  out += `<rect x="${box.left}" y="${box.top}" width="${box.w}" height="${box.h}" fill="#fff" stroke="#dee2e6"/>`;
  if (errs.length) {
    const top = Math.max(...errs) * 1.05 || 1;
    const X = (i: number) => box.left + 6 + ((box.w - 12) * i) / Math.max(1, errs.length - 1);
    const Y = (v: number) => box.top + box.h - 6 - ((box.h - 12) * v) / top;
    out += `<polyline points="${errs.map((v, i) => `${r2(X(i))},${r2(Y(v))}`).join(" ")}" fill="none" stroke="#9c36b5" stroke-width="2"/>`;
    errs.forEach((v, i) => (out += `<circle cx="${r2(X(i))}" cy="${r2(Y(v))}" r="2.5" fill="#9c36b5"/>`));
  }

  // The best error for every k: the elbow.
  y = box.top + box.h + 34;
  const curve = elbowCurve(ps);
  out += txt(S.left, y, w.elbow, { bold: true, size: 12 });
  const eb = { left: S.left, top: y + 10, w: S.w - 8, h: 120 };
  out += `<rect x="${eb.left}" y="${eb.top}" width="${eb.w}" height="${eb.h}" fill="#fff" stroke="#dee2e6"/>`;
  const top = curve[0] * 1.05;
  const X = (k: number) => eb.left + 10 + ((eb.w - 20) * (k - 1)) / (K_MAX - 1);
  const Y = (v: number) => eb.top + eb.h - 8 - ((eb.h - 16) * v) / top;
  out += `<polyline points="${curve.map((v, i) => `${r2(X(i + 1))},${r2(Y(v))}`).join(" ")}" fill="none" stroke="${GREY}" stroke-width="2"/>`;
  curve.forEach((v, i) => (out += `<circle cx="${r2(X(i + 1))}" cy="${r2(Y(v))}" r="${i + 1 === d.k ? 5.5 : 3}" fill="${i + 1 === d.k ? "#e03131" : GREY}"/>`));
  for (let k = 1; k <= K_MAX; k++) out += txt(X(k), eb.top + eb.h + 13, String(k), { anchor: "middle", size: 10, fill: k === d.k ? "#e03131" : GREY, bold: k === d.k });
  out += txt(S.left + eb.w, eb.top + eb.h + 28, w.k, { anchor: "end", size: 10.5 });
  return out;
}
