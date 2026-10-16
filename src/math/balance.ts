// Balance puzzles: scales that balance with shapes and weights on their pans, and the weight of each shape to find.
// Easy: one shape, all on one side (■ ■ ■ + 2 = 14); medium: the same shape on both sides (■ ■ ■ + 2 = ■ + 10), so
// a ■ has to come off both pans first; hard: two shapes and two scales (● ● = ■, ● + ■ = 12). Whatever is done to one
// pan is done to the other, and the scales still balance — the idea that turns into solving equations. Leaving the
// shapes on the other pan out (■ ■ ■ + 2 = 10 for the medium one above) is the slip named.
import { rng } from "./random";

export type BalanceLevel = 1 | 2 | 3;
/** What is on a pan: how many of each shape (■, ●) and the weights, each a number. */
export type Pan = { shapes: number[]; weights: number[] };
export type Scale = { left: Pan; right: Pan };
/** The scales, and what each shape really weighs. */
export type BalanceTask = { level: BalanceLevel; scales: Scale[]; values: number[] };

export const SHAPE_GLYPHS = ["■", "●"] as const;
export const SHAPE_TEX = ["\\blacksquare", "\\bullet"] as const;
const SHAPE_COLORS = ["#1971c2", "#e8590c"];
/** The most a shape can be set to on the board. */
export const MAX_GUESS = 20;

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
/** What a pan weighs when each shape weighs `values`. */
export const panWeight = (p: Pan, values: number[]) => sum(p.weights) + p.shapes.reduce((s, k, i) => s + k * (values[i] ?? 0), 0);
const items = (p: Pan) => sum(p.shapes) + p.weights.length;
/** A total as one weight, or two when it is big (a 10 and the rest, from `next`). */
const weightsOf = (total: number, next: () => number): number[] => (total <= 0 ? [] : total > 12 && next() < 0.5 ? [10, total - 10] : [total]);
const pan = (shapes: number[], total: number, next: () => number): Pan => ({ shapes, weights: weightsOf(total, next) });
/** The scale turned round half the time, so the shapes aren't always on the left. */
const either = (s: Scale, next: () => number): Scale => (next() < 0.5 ? s : { left: s.right, right: s.left });

export function balanceTask(level: BalanceLevel, next: () => number): BalanceTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  if (level === 1) {
    // k ■ + b = k·v + b, with at least two things on the shapes' pan.
    const v = int(1, 9);
    const k = int(1, 4);
    const b = k === 1 ? int(1, 9) : next() < 0.4 ? 0 : int(1, 9);
    const scale = either({ left: pan([k], b, next), right: pan([0], k * v + b, next) }, next);
    return { level, scales: [scale], values: [v] };
  }
  if (level === 2) {
    for (;;) {
      // a ■ + b = c ■ + d, a > c ≥ 1: take c ■ off both pans, then the weights.
      const v = int(1, 10);
      const a = int(2, 5);
      const c = int(1, a - 1);
      const b = int(0, 9);
      const d = (a - c) * v + b;
      if (d > 30 || d === b || a * v + b > 40) continue;
      return { level, scales: [either({ left: pan([a], b, next), right: pan([c], d, next) }, next)], values: [v] };
    }
  }
  for (;;) {
    // Two shapes of different weights and two scales that pin both down, each with a few things on each pan.
    const values = [int(1, 9), int(1, 9)];
    if (values[0] === values[1]) continue;
    const scales: Scale[] = [];
    for (let s = 0; s < 2; s++) {
      const L = [int(0, 3), int(0, 3)];
      const R = [int(0, 2), int(0, 2)];
      // No shape on both pans of the same scale (that is the medium idea), and something on each.
      if (L.some((k, i) => k > 0 && R[i] > 0) || !sum(L)) continue;
      const diff = L[0] * values[0] + L[1] * values[1] - (R[0] * values[0] + R[1] * values[1]);
      if (diff < 0) continue;
      scales.push(either({ left: pan(L, 0, next), right: pan(R, diff, next) }, next));
    }
    if (scales.length < 2) continue;
    // The net count of each shape on each scale (left − right): the two must not say the same thing.
    const net = scales.map((sc) => sc.left.shapes.map((k, i) => k - sc.right.shapes[i]));
    if (net[0][0] * net[1][1] - net[0][1] * net[1][0] === 0) continue;
    // Each shape somewhere, not too much on a pan, and not so heavy the weights get silly.
    if (![0, 1].every((i) => scales.some((sc) => sc.left.shapes[i] + sc.right.shapes[i] > 0))) continue;
    if (scales.some((sc) => items(sc.left) > 5 || items(sc.right) > 5 || items(sc.left) + items(sc.right) < 3 || panWeight(sc.left, values) > 40)) continue;
    // Neither scale gives a shape straight away on its own: both need the other (that is the easy idea).
    if (net.filter((r) => r[0] === 0 || r[1] === 0).length > 1) continue;
    return { level, scales, values };
  }
}

/** Which way each scale tips when the shapes weigh `guess`: −1 down on the left, 1 down on the right, 0 level. */
export const tips = (t: Pick<BalanceTask, "scales">, guess: number[]) =>
  t.scales.map((s) => Math.sign(panWeight(s.right, guess) - panWeight(s.left, guess)));
/** Right when every scale balances: two scales that say different things leave only the real weights. */
export const balanced = (t: Pick<BalanceTask, "scales">, guess: number[]) => tips(t, guess).every((k) => k === 0);
/** The shapes the task uses: ■ alone below hard. */
export const shapesOf = (t: Pick<BalanceTask, "values">) => t.values.length;

// ---------- the equations ----------

/** A pan in LaTeX: 3■ + 2, with the shapes coloured. */
export function panTex(p: Pan): string {
  const parts = p.shapes.flatMap((k, i) => (k ? [`${k === 1 ? "" : k}{\\color{${SHAPE_COLORS[i]}}${SHAPE_TEX[i]}}`] : []));
  const w = sum(p.weights);
  return [...parts, ...(w || !parts.length ? [String(w)] : [])].join(" + ");
}
export const scaleTex = (s: Scale) => `${panTex(s.left)} = ${panTex(s.right)}`;
/** The working for one shape: take the shapes off both pans, then the weights, then share out. */
export function balanceSteps(t: BalanceTask): string[] {
  const sq = `{\\color{${SHAPE_COLORS[0]}}${SHAPE_TEX[0]}}`;
  const ci = `{\\color{${SHAPE_COLORS[1]}}${SHAPE_TEX[1]}}`;
  if (t.level < 3) {
    const s = t.scales[0];
    // Put the side with more shapes on the left.
    const [A, B] = s.left.shapes[0] >= s.right.shapes[0] ? [s.left, s.right] : [s.right, s.left];
    const [a, c, b, d] = [A.shapes[0], B.shapes[0], sum(A.weights), sum(B.weights)];
    const k = a - c;
    const lines = [scaleTex(s)];
    if (c) lines.push(`${k === 1 ? "" : k}${sq}${b ? ` + ${b}` : ""} = ${d}`);
    if (b) lines.push(`${k === 1 ? "" : k}${sq} = ${d} - ${b} = ${d - b}`);
    if (k > 1) lines.push(`${sq} = ${d - b} \\div ${k} = ${t.values[0]}`);
    else if (!b && !c) lines.push(`${sq} = ${t.values[0]}`);
    return lines;
  }
  return [...t.scales.map(scaleTex), `${sq} = ${t.values[0]}, \\quad ${ci} = ${t.values[1]}`, ...t.scales.map((s) => `${panWeight(s.left, t.values)} = ${panWeight(s.right, t.values)}`)];
}
/** The answer if the shapes on the lighter-looking pan are left out: (d − b) ÷ a for a■ + b = c■ + d, or null. */
export function oneSideOnly(t: BalanceTask): { v: number; a: number; b: number; c: number; d: number } | null {
  if (t.level !== 2) return null;
  const s = t.scales[0];
  const [A, B] = s.left.shapes[0] >= s.right.shapes[0] ? [s.left, s.right] : [s.right, s.left];
  const [a, c, b, d] = [A.shapes[0], B.shapes[0], sum(A.weights), sum(B.weights)];
  const v = (d - b) / a;
  return v > 0 && Math.abs(v - t.values[0]) > 1e-9 ? { v, a, b, c, d } : null;
}

// ---------- pictures ----------

export const SCALE_W = 300;
export const SCALE_H = 190;
const ARM = 100;
/** The most the beam turns, in degrees. */
const TILT = 10;
/** A shape or a weight, drawn with its middle at (x, y). */
function itemSvg(kind: number | "w", x: number, y: number, label = ""): string {
  if (kind === 0) return `<rect x="${x - 12}" y="${y - 12}" width="24" height="24" rx="3" fill="${SHAPE_COLORS[0]}"/>`;
  if (kind === 1) return `<circle cx="${x}" cy="${y}" r="12.5" fill="${SHAPE_COLORS[1]}"/>`;
  const w = 20 + 6 * label.length;
  return `<path d="M${x - w / 2 + 4},${y - 12} L${x + w / 2 - 4},${y - 12} L${x + w / 2},${y + 12} L${x - w / 2},${y + 12} Z" fill="#495057"/><text x="${x}" y="${y + 6}" font-size="15" font-weight="700" text-anchor="middle" fill="#ffffff">${label}</text>`;
}
/** What is on a pan, in rows of up to three from the bottom up, centred on x with the pan's floor at y. */
function panItems(p: Pan, x: number, y: number): string {
  const list: { kind: number | "w"; label?: string }[] = [
    ...p.shapes.flatMap((k, i) => Array.from({ length: k }, () => ({ kind: i }))),
    ...p.weights.map((v) => ({ kind: "w" as const, label: String(v) })),
  ];
  return list
    .map((it, k) => {
      const [row, col] = [Math.floor(k / 3), k % 3];
      const inRow = Math.min(3, list.length - row * 3);
      const step = list.some((o, j) => o.kind === "w" && Math.floor(j / 3) === row) ? 33 : 28;
      return itemSvg(it.kind, x + (col - (inRow - 1) / 2) * step, y - 14 - row * 28, it.label);
    })
    .join("");
}
/**
 * A scale as an SVG body of SCALE_W × SCALE_H: the stand, the beam turned by `tip` (−1 down on the left, 1 down on the
 * right, 0 level) and the pans hanging level from its ends with what is on them.
 */
export function scaleSvg(s: Scale, tip = 0, totals: [number, number] | null = null): string {
  const [cx, top] = [SCALE_W / 2, 50];
  const a = (tip * TILT * Math.PI) / 180;
  const end = (side: -1 | 1) => [cx + side * ARM * Math.cos(a), top + side * ARM * Math.sin(a)] as const;
  const pans = ([-1, 1] as const).map((side) => {
    const [x, y] = end(side);
    const floor = y + 110;
    const label = totals ? `<text x="${x}" y="${floor + 22}" font-size="15" text-anchor="middle" fill="#495057">${totals[side < 0 ? 0 : 1]}</text>` : "";
    return `<line x1="${x}" y1="${y}" x2="${x - 42}" y2="${floor}" stroke="#adb5bd" stroke-width="1.5"/><line x1="${x}" y1="${y}" x2="${x + 42}" y2="${floor}" stroke="#adb5bd" stroke-width="1.5"/><path d="M${x - 48},${floor} L${x + 48},${floor} L${x + 40},${floor + 6} L${x - 40},${floor + 6} Z" fill="#868e96"/>${panItems(side < 0 ? s.left : s.right, x, floor)}${label}`;
  });
  const [l, r] = [end(-1), end(1)];
  return `<path d="M${cx - 30},${SCALE_H - 4} L${cx + 30},${SCALE_H - 4} L${cx + 5},${top} L${cx - 5},${top} Z" fill="#dee2e6"/><line x1="${l[0]}" y1="${l[1]}" x2="${r[0]}" y2="${r[1]}" stroke="#495057" stroke-width="6" stroke-linecap="round"/><circle cx="${cx}" cy="${top}" r="6" fill="#495057"/>${pans.join("")}`;
}
/** The scales side by side: an SVG body and its size. */
export function balanceSvg(t: Pick<BalanceTask, "scales">, guess: number[] | null = null): { body: string; w: number; h: number } {
  const t2 = guess ? tips(t, guess) : t.scales.map(() => 0);
  const body = t.scales
    .map((s, i) => `<g transform="translate(${i * (SCALE_W + 20)} 0)">${scaleSvg(s, t2[i], guess ? [panWeight(s.left, guess), panWeight(s.right, guess)] : null)}</g>`)
    .join("");
  return { body, w: t.scales.length * (SCALE_W + 20) - 20, h: SCALE_H + (guess ? 26 : 0) };
}

// ---------- the board's game ----------

export const BALANCE_LADDER: { level: BalanceLevel; seed: number }[] = [
  { level: 1, seed: 306 },
  { level: 1, seed: 303 },
  { level: 1, seed: 307 },
  { level: 2, seed: 312 },
  { level: 2, seed: 321 },
  { level: 2, seed: 357 },
  { level: 3, seed: 331 },
  { level: 3, seed: 322 },
  { level: 3, seed: 323 },
];
/** Stars: balanced at the first weighing three, the second two, else one. */
export const balanceStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
export type BalanceNotice = "bothSides" | "twoShapes" | "heavy" | "streak10";
export const BALANCE_NOTICES: BalanceNotice[] = ["bothSides", "twoShapes", "heavy", "streak10"];
/**
 * What a balanced puzzle shows: a shape on both pans found at the first weighing, two shapes found at the first
 * weighing, a shape that weighs 10 or more, ten at the first weighing in a row.
 */
export function balanceNotice(t: BalanceTask, misses: number, streak: number): BalanceNotice | null {
  if (streak === 10) return "streak10";
  if (misses === 0 && t.level === 3) return "twoShapes";
  if (misses === 0 && t.scales.some((s) => s.left.shapes.some((k, i) => k > 0 && s.right.shapes[i] > 0))) return "bothSides";
  if (t.values.some((v) => v >= 10)) return "heavy";
  return null;
}
export type LiveBalance = {
  mode: "puzzle" | "endless";
  stage: number;
  level: BalanceLevel;
  seed: number;
  /** What the player says each shape weighs. */
  guess: number[];
  /** Whether the scales show the guess (until it changes). */
  weighed: boolean;
  misses: number;
  done: boolean;
  streak: number;
  said: { kind: "notice"; key: BalanceNotice } | null;
};
export const balanceNow = (d: Pick<LiveBalance, "mode" | "stage" | "level" | "seed">): BalanceTask =>
  d.mode === "puzzle" ? balanceTask(BALANCE_LADDER[d.stage].level, rng(BALANCE_LADDER[d.stage].seed)) : balanceTask(d.level, rng(d.seed));

/** The worked solution: the scales level, with the working beneath. */
export type BalanceSolution = { task: BalanceTask };
export function renderBalance(spec: BalanceSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = balanceSvg(spec.task);
  const w = Math.max(pic.w + 20, steps?.width ?? 0);
  const h = pic.h + 10 + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${pic.h + 10})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - pic.w) / 2} 6)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
