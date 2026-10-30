// Judging a classifier by hand, the threshold lab: examples with a model's score each, the positives and the negatives
// on one strip, and a threshold dragged across it. Everything at or above the threshold is called positive, which
// makes a confusion matrix (true and false positives and negatives), and from it accuracy, precision, recall and F1.
// Moving the threshold trades precision for recall; every threshold at once makes the ROC curve (true against false
// positive rate, its area the AUC) and the precision–recall curve, each with the current threshold's point. Puzzles
// ask for thresholds that meet a goal, and on rare positives show how accuracy misleads. Kept free of React so it can
// be tested on its own.
import type { GameBase } from "./ladder";
import { rng } from "./random";
import { nf } from "./text";

/** An example: its score from the model and whether it is truly positive. */
export type Example = { s: number; pos: boolean };
/** The datasets: as many positives as negatives, or rare positives (1 in 10). */
export type DataId = "balanced" | "rare";
export const DATA_IDS: DataId[] = ["balanced", "rare"];
const SIZES: Record<DataId, [number, number]> = { balanced: [30, 30], rare: [8, 72] };

/** A normal draw from two uniform ones (Box–Muller). */
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
/** The examples: negatives' scores around 0.35 and positives' around 0.35 + gap, each spread 0.13, kept in [0, 1] and
 * rounded to two places. */
export function dataOf(id: DataId, seed: number, gap = 0.3): Example[] {
  const r = rng(seed * 13 + (id === "rare" ? 5 : 2));
  const [np, nn] = SIZES[id];
  const score = (m: number) => Math.round(Math.min(0.99, Math.max(0.01, m + 0.13 * normal(r))) * 100) / 100;
  return [...Array.from({ length: np }, () => ({ s: score(0.35 + gap), pos: true })), ...Array.from({ length: nn }, () => ({ s: score(0.35), pos: false }))];
}

export type Counts = { tp: number; fp: number; fn: number; tn: number };
/** The confusion matrix at threshold t: a score at or above t is called positive. */
export function confusion(xs: Example[], t: number): Counts {
  const c = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const x of xs) {
    const said = x.s >= t - 1e-9;
    if (x.pos) said ? c.tp++ : c.fn++;
    else said ? c.fp++ : c.tn++;
  }
  return c;
}
export type Metrics = { accuracy: number; precision: number; recall: number; f1: number; fpr: number };
/** Accuracy, precision (NaN when nothing is called positive), recall, F1 and the false positive rate. */
export function metricsOf(c: Counts): Metrics {
  const n = c.tp + c.fp + c.fn + c.tn;
  const precision = c.tp + c.fp ? c.tp / (c.tp + c.fp) : NaN;
  const recall = c.tp + c.fn ? c.tp / (c.tp + c.fn) : NaN;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { accuracy: (c.tp + c.tn) / n, precision, recall, f1: Number.isFinite(f1) ? f1 : 0, fpr: c.fp + c.tn ? c.fp / (c.fp + c.tn) : NaN };
}
/** The thresholds worth trying: every score, and one above them all (nothing called positive). */
export const cuts = (xs: Example[]) => [...new Set(xs.map((x) => x.s)), 1.01].sort((a, b) => a - b);
/** The ROC curve: (false positive rate, true positive rate) at every threshold, from (0, 0) to (1, 1). */
export function rocOf(xs: Example[]): [number, number][] {
  return cuts(xs).reverse().map((t) => {
    const m = metricsOf(confusion(xs, t));
    return [m.fpr, m.recall] as [number, number];
  }).concat([[1, 1]]);
}
/** The area under the ROC curve: the chance a random positive scores above a random negative (ties count half). */
export function aucOf(xs: Example[]): number {
  const P = xs.filter((x) => x.pos);
  const N = xs.filter((x) => !x.pos);
  let s = 0;
  for (const p of P) for (const n of N) s += p.s > n.s ? 1 : p.s === n.s ? 0.5 : 0;
  return s / (P.length * N.length);
}
/** The precision–recall curve: (recall, precision) at every threshold that calls something positive. */
export function prOf(xs: Example[]): [number, number][] {
  return cuts(xs).reverse().map((t) => metricsOf(confusion(xs, t))).filter((m) => Number.isFinite(m.precision)).map((m) => [m.recall, m.precision] as [number, number]);
}

// ---------- the puzzles ----------

export type RocGoal =
  | { kind: "recall"; min: number }
  | { kind: "precision"; min: number }
  | { kind: "bestF1" }
  | { kind: "both"; recall: number; precision: number }
  | { kind: "fpr"; max: number };
export type RocNotice = "lower" | "higher" | "f1" | "accuracy" | "roc" | "pr";
export const ROC_NOTICES: RocNotice[] = ["lower", "higher", "f1", "accuracy", "roc", "pr"];
/** A puzzle: its data, the threshold it starts at, what it asks and what it shows when won. */
export type RocPuzzle = { data: DataId; start: number; goal: RocGoal; notice: RocNotice };
export const ROC_LADDER: RocPuzzle[] = [
  { data: "balanced", start: 0.8, goal: { kind: "recall", min: 0.9 }, notice: "lower" },
  { data: "balanced", start: 0.3, goal: { kind: "precision", min: 0.9 }, notice: "higher" },
  { data: "balanced", start: 0.9, goal: { kind: "bestF1" }, notice: "f1" },
  { data: "rare", start: 1.01, goal: { kind: "both", recall: 0.75, precision: 0.4 }, notice: "accuracy" },
  { data: "balanced", start: 0.3, goal: { kind: "fpr", max: 0.1 }, notice: "roc" },
  { data: "rare", start: 0.5, goal: { kind: "both", recall: 0.3, precision: 0.9 }, notice: "pr" },
];
export const PUZZLE_SEED = 1;

export type RocSlip = "recallLow" | "precisionLow" | "notBest" | "fprHigh" | "notHighest";
export type RocVerdict = { state: "won" } | { state: "lost"; why: RocSlip; have: number; want: number };

/** The best F1 any threshold reaches. */
export const bestF1 = (xs: Example[]) => Math.max(...cuts(xs).map((t) => metricsOf(confusion(xs, t)).f1));
/** The most recall any threshold reaches while keeping the false positive rate at most `max`. */
export const bestRecallAt = (xs: Example[], max: number) => Math.max(...cuts(xs).map((t) => metricsOf(confusion(xs, t))).filter((m) => m.fpr <= max + 1e-9).map((m) => m.recall));

/** A threshold judged against a goal. */
export function judgeRoc(xs: Example[], t: number, g: RocGoal): RocVerdict {
  const m = metricsOf(confusion(xs, t));
  const lost = (why: RocSlip, have: number, want: number): RocVerdict => ({ state: "lost", why, have, want });
  const prec = Number.isFinite(m.precision) ? m.precision : 0;
  switch (g.kind) {
    case "recall":
      return m.recall >= g.min - 1e-9 ? { state: "won" } : lost("recallLow", m.recall, g.min);
    case "precision":
      return prec >= g.min - 1e-9 ? { state: "won" } : lost("precisionLow", prec, g.min);
    case "bestF1": {
      const b = bestF1(xs);
      return m.f1 >= b - 1e-9 ? { state: "won" } : lost("notBest", m.f1, b);
    }
    case "both":
      if (m.recall < g.recall - 1e-9) return lost("recallLow", m.recall, g.recall);
      return prec >= g.precision - 1e-9 ? { state: "won" } : lost("precisionLow", prec, g.precision);
    case "fpr": {
      if (!(m.fpr <= g.max + 1e-9)) return lost("fprHigh", m.fpr, g.max);
      const b = bestRecallAt(xs, g.max);
      return m.recall >= b - 1e-9 ? { state: "won" } : lost("notHighest", m.recall, b);
    }
  }
}

/** The game's state: the shared shape (no endless run: free play instead), the threshold and the try. */
export type LiveRoc = GameBase<RocNotice, { kind: "wrong"; why: RocSlip }> & {
  mode: "puzzle" | "free";
  t: number;
  /** Free play's data, the seed of its examples and how far apart the classes' scores are. */
  data: DataId;
  seed: number;
  gap: number;
  tries: number;
  done: boolean;
};
export const ROC_START: LiveRoc = { mode: "puzzle", stage: 0, t: ROC_LADDER[0].start, data: "balanced", seed: 1, gap: 0.3, tries: 0, done: false, said: null };
export const GAPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
export const rocPuzzle = (d: Pick<LiveRoc, "mode" | "stage">) => (d.mode === "puzzle" ? ROC_LADDER[d.stage] : null);
/** The examples a state shows: the puzzle's, or free play's. */
export const examplesOf = (d: LiveRoc) => {
  const p = rocPuzzle(d);
  return p ? dataOf(p.data, PUZZLE_SEED) : dataOf(d.data, d.seed, d.gap);
};
export const rocStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
/** Thresholds move in hundredths, from 0 to 1.01 (above every score: nothing called positive). */
export const snap = (t: number) => Math.round(Math.min(1.01, Math.max(0, t)) * 100) / 100;

// ---------- the picture ----------

export const ROC_PLOT = { w: 640, h: 574 };
export const STRIP = { left: 30, right: 610, top: 30, h: 110 };
const MATRIX = { left: 30, top: 204, cell: 70 };
const BARS = { left: 220, top: 204, w: 140, rowH: 30 };
const ROC = { left: 420, top: 204, size: 190 };
const PR = { left: 250, top: 412, size: 140 };
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const GREEN = "#2f9e44";
const RED = "#e03131";
const GREY = "#868e96";
const r2 = (v: number) => Math.round(v * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type TextStyle = { size?: number; fill?: string; bold?: boolean; anchor?: "start" | "middle" | "end"; extra?: string };
const txt = (x: number, y: number, s: string, o: TextStyle = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 12}" fill="${o.fill ?? "#495057"}"${o.bold ? ` font-weight="700"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.extra ? ` ${o.extra}` : ""}>${esc(s)}</text>`;
/** A rate for the readout: two decimals, or a dash when it is not defined. */
export const num = (v: number) => (Number.isFinite(v) ? nf(v, 3) : "—");

/** From the strip's page x to a threshold and back. */
export const tToX = (t: number) => STRIP.left + Math.min(1.01, t) * ((STRIP.right - STRIP.left) / 1.01);
export const xToT = (x: number) => snap(((x - STRIP.left) / (STRIP.right - STRIP.left)) * 1.01);

export type RocWords = {
  strip: string; pos: string; neg: string; called: string; matrix: string; actual: string; predicted: string;
  metrics: { accuracy: string; precision: string; recall: string; f1: string };
  roc: string; pr: string; auc: string; fpr: string; tpr: string; recallAxis: string; precisionAxis: string;
};

/**
 * The strip of scores (positives above the line in orange, negatives below in blue, the called-positive side shaded,
 * the threshold as a line with a handle), the confusion matrix, the four measures as bars, the ROC curve with its area
 * and the current point, and the precision–recall curve with its point.
 */
export function rocSvg(xs: Example[], t: number, w: RocWords): string {
  const c = confusion(xs, t);
  const m = metricsOf(c);
  let s = "";
  // The strip: stacked dots, positives above the middle and negatives below.
  const mid = STRIP.top + STRIP.h / 2;
  s += txt(STRIP.left, STRIP.top - 10, w.strip, { bold: true, size: 13 });
  s += `<rect x="${r2(tToX(t))}" y="${STRIP.top}" width="${r2(Math.max(0, STRIP.right - tToX(t)))}" height="${STRIP.h}" fill="${ORANGE}" opacity="0.08"/>`;
  s += `<line x1="${STRIP.left}" y1="${mid}" x2="${STRIP.right}" y2="${mid}" stroke="#adb5bd"/>`;
  for (let v = 0; v <= 1.001; v += 0.1) s += `<line x1="${r2(tToX(v))}" y1="${mid - 3}" x2="${r2(tToX(v))}" y2="${mid + 3}" stroke="#adb5bd"/>` + txt(tToX(v), STRIP.top + STRIP.h + 14, nf(v, 1), { anchor: "middle", fill: GREY, size: 10.5 });
  const stack = new Map<string, number>();
  for (const x of xs) {
    const key = `${x.pos}${Math.round(x.s * 50)}`;
    const k = stack.get(key) ?? 0;
    stack.set(key, k + 1);
    const y = x.pos ? mid - 7 - k * 7.5 : mid + 7 + k * 7.5;
    if (y < STRIP.top + 3 || y > STRIP.top + STRIP.h - 3) continue;
    s += x.pos ? `<circle cx="${r2(tToX(x.s))}" cy="${r2(y)}" r="3.4" fill="${ORANGE}"/>` : `<circle cx="${r2(tToX(x.s))}" cy="${r2(y)}" r="3.4" fill="none" stroke="${BLUE}" stroke-width="1.5"/>`;
  }
  s += txt(STRIP.left + 4, STRIP.top + 12, w.pos, { fill: ORANGE, bold: true }) + txt(STRIP.left + 4, STRIP.top + STRIP.h - 4, w.neg, { fill: BLUE, bold: true });
  const tx = tToX(t);
  s += `<line x1="${r2(tx)}" y1="${STRIP.top - 4}" x2="${r2(tx)}" y2="${STRIP.top + STRIP.h + 2}" stroke="${RED}" stroke-width="2.5"/>`;
  s += `<rect x="${r2(tx - 9)}" y="${STRIP.top - 8}" width="18" height="12" rx="3" fill="${RED}"/>`;
  s += txt(tx + (tx > STRIP.right - 70 ? -14 : 14), STRIP.top + 2, t > 1 ? "t > 1" : `t = ${nf(t, 2)}`, { fill: RED, bold: true, anchor: tx > STRIP.right - 70 ? "end" : "start" });
  if (tx < STRIP.right - 190) s += txt(STRIP.right - 6, STRIP.top + 14, w.called, { fill: ORANGE, anchor: "end", size: 11 });

  // The confusion matrix: rows what is true, columns what was said.
  const M = MATRIX;
  s += txt(M.left, M.top - 22, w.matrix, { bold: true, size: 13 });
  s += txt(M.left + 34 + M.cell, M.top - 6, w.predicted, { anchor: "middle", size: 11 });
  const cell = (row: number, col: number, n: number, name: string, good: boolean) => {
    const [x, y] = [M.left + 34 + col * M.cell, M.top + row * M.cell];
    return `<rect x="${x}" y="${y}" width="${M.cell - 3}" height="${M.cell - 3}" rx="5" fill="${good ? GREEN : RED}" opacity="${0.12 + 0.5 * Math.min(1, n / Math.max(1, xs.length / 2))}"/>` +
      txt(x + (M.cell - 3) / 2, y + 30, String(n), { anchor: "middle", size: 20, bold: true, fill: "#1e1e1e" }) + txt(x + (M.cell - 3) / 2, y + 50, name, { anchor: "middle", size: 11 });
  };
  s += cell(0, 0, c.tp, "TP", true) + cell(0, 1, c.fn, "FN", false) + cell(1, 0, c.fp, "FP", false) + cell(1, 1, c.tn, "TN", true);
  s += txt(M.left + 34 + M.cell / 2, M.top + 2 * M.cell + 14, "+", { anchor: "middle", bold: true }) + txt(M.left + 34 + 1.5 * M.cell, M.top + 2 * M.cell + 14, "−", { anchor: "middle", bold: true });
  s += txt(M.left + 24, M.top + M.cell / 2 + 4, "+", { anchor: "end", bold: true }) + txt(M.left + 24, M.top + 1.5 * M.cell + 4, "−", { anchor: "end", bold: true });
  s += `<text x="${M.left + 4}" y="${M.top + M.cell}" font-size="11" fill="#495057" text-anchor="middle" transform="rotate(-90 ${M.left + 4} ${M.top + M.cell})">${esc(w.actual)}</text>`;

  // The measures as bars from 0 to 1.
  const B = BARS;
  const rows: [string, number, string][] = [[w.metrics.accuracy, m.accuracy, GREY], [w.metrics.precision, m.precision, BLUE], [w.metrics.recall, m.recall, ORANGE], [w.metrics.f1, m.f1, GREEN]];
  rows.forEach(([name, v, color], i) => {
    const y = B.top + i * (B.rowH + 14);
    s += txt(B.left, y, name, { size: 11.5, bold: true });
    s += `<rect x="${B.left}" y="${y + 5}" width="${B.w}" height="14" fill="#f1f3f5"/>`;
    if (Number.isFinite(v)) s += `<rect x="${B.left}" y="${y + 5}" width="${r2(B.w * v)}" height="14" fill="${color}"/>`;
    s += txt(B.left + B.w + 6, y + 17, num(v), { bold: true });
  });

  // The ROC curve, its area shaded, and the threshold's point.
  const curveBox = (box: { left: number; top: number; size: number }, pts: [number, number][], area: boolean, color: string, at: [number, number] | null, title: string, ax: [string, string], extra = "") => {
    const X = (v: number) => box.left + v * box.size;
    const Y = (v: number) => box.top + (1 - v) * box.size;
    let g = txt(box.left, box.top - 8, title, { bold: true, size: 13 });
    g += `<rect x="${box.left}" y="${box.top}" width="${box.size}" height="${box.size}" fill="#fff" stroke="#dee2e6"/>`;
    const line = pts.map(([a, b]) => `${r2(X(a))},${r2(Y(b))}`).join(" ");
    if (area) g += `<polygon points="${r2(X(0))},${r2(Y(0))} ${line} ${r2(X(1))},${r2(Y(0))}" fill="${color}" opacity="0.12"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(1)}" stroke="#ced4da" stroke-dasharray="4 4"/>`;
    g += `<polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>`;
    if (at && at.every(Number.isFinite)) g += `<circle cx="${r2(X(at[0]))}" cy="${r2(Y(at[1]))}" r="5.5" fill="${RED}" stroke="#fff" stroke-width="1.5"/>`;
    g += txt(box.left + box.size / 2, box.top + box.size + 14, ax[0], { anchor: "middle", size: 10.5 });
    g += `<text font-size="10.5" fill="#495057" text-anchor="middle" transform="translate(${box.left - 7} ${box.top + box.size / 2}) rotate(-90)">${esc(ax[1])}</text>`;
    return g + extra;
  };
  const auc = aucOf(xs);
  s += curveBox(ROC, rocOf(xs), true, BLUE, [m.fpr, m.recall], w.roc, [w.fpr, w.tpr], txt(ROC.left + ROC.size - 6, ROC.top + ROC.size - 8, `${w.auc} = ${nf(auc, 3)}`, { anchor: "end", bold: true, fill: BLUE }));
  s += curveBox(PR, prOf(xs), false, GREEN, [m.recall, m.precision], w.pr, [w.recallAxis, w.precisionAxis]);
  return s;
}
