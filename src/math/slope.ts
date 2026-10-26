// Gradients: how steep a line is, as how far it goes up (or down) for each one along. Easy: 1, 2 or 3, on the first
// quadrant's grid; medium: whole gradients up or down, −3 to 3, on all four; hard: fractions such as 1/2, −2/3 or 3/2.
// The board's game has a line drawn through a point A with a gradient, by tapping a second point; the practice
// question draws a line through P and Q and asks for its gradient. Along over up, run ÷ rise, is the slip named (a
// line going the wrong way is the sign slip every number answer has).
import { withSteps } from "./angleGuess";
import { gridAt, gridDot, gridSide, gridSvg, samePt, signed, type Grid, type Pt } from "./plotPoint";
import { rng } from "./random";
import type { EndlessGame, TryGame } from "./ladder";

export type SlopeLevel = 1 | 2 | 3;
/** A gradient rise/run in lowest terms (run > 0), and a point A that a step of it from fits on the grid. */
export type SlopeTask = { level: SlopeLevel; a: Pt; rise: number; run: number };
export const slopeRange = (level: SlopeLevel): [number, number] => (level === 1 ? [0, 8] : [-6, 6]);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** The gradient's three kinds: easy 1 to 3; medium −3 to 3 but 0, a negative one half the time; hard a fraction that isn't whole. */
export function slopeTask(level: SlopeLevel, next: () => number): SlopeTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  let rise: number, run: number;
  if (level === 1) [rise, run] = [int(1, 3), 1];
  else if (level === 2) [rise, run] = [int(1, 3) * (next() < 0.5 ? -1 : 1), 1];
  else
    for (;;) {
      [rise, run] = [int(1, 3) * (next() < 0.5 ? -1 : 1), int(2, 4)];
      if (gcd(rise, run) === 1) break;
    }
  const [lo, hi] = slopeRange(level);
  // A and the point one step on both on the grid, with room for the step back too past the easy level.
  for (;;) {
    const a: Pt = [int(lo, hi), int(lo, hi)];
    const fits = (p: Pt) => p[0] >= lo && p[0] <= hi && p[1] >= lo && p[1] <= hi;
    if (fits([a[0] + run, a[1] + rise]) && (level === 1 || fits([a[0] - run, a[1] - rise]))) return { level, a, rise, run };
  }
}
/** A gradient as it is printed: 2, −3, 1/2, −2/3. */
export const gradText = (rise: number, run: number) => {
  const k = (gcd(rise, run) || 1) * Math.sign(run || 1);
  const [n, d] = [rise / k, run / k];
  return d === 1 ? signed(n) : `${signed(n)}/${d}`;
};
/** A gradient in LaTeX. */
export const gradTex = (rise: number, run: number) => {
  const k = (gcd(rise, run) || 1) * Math.sign(run || 1);
  const [n, d] = [rise / k, run / k];
  return d === 1 ? String(n) : `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`;
};
/** Whether the line from A to b has the task's gradient. */
export const onLine = (t: SlopeTask, b: Pt) => !samePt(b, t.a) && (b[1] - t.a[1]) * t.run === t.rise * (b[0] - t.a[0]);

// ---------- pictures ----------

const BLUE = "#1971c2";
export const SLOPE_CELL = 34;
/** The line through two points, across the whole grid. */
function fullLine(g: Grid, p: Pt, q: Pt, color: string): string {
  const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
  if (!dx && !dy) return "";
  // How far along the line from p each edge of the grid is, the nearest two either way.
  const ts: number[] = [];
  for (const [d, from] of [[dx, p[0]], [dy, p[1]]] as const) if (d) ts.push((g.lo - from) / d, (g.hi - from) / d);
  const sorted = ts.sort((u, v) => u - v);
  const [t0, t1] = dx && dy ? [sorted[1], sorted[2]] : [sorted[0], sorted[1]];
  const [x0, y0] = gridAt(g, [p[0] + t0 * dx, p[1] + t0 * dy]);
  const [x1, y1] = gridAt(g, [p[0] + t1 * dx, p[1] + t1 * dy]);
  return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
}
/** The step from p to q as a right-angled triangle: along first, then up or down, each with its length. */
function stepTriangle(g: Grid, p: Pt, q: Pt, color: string): string {
  const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
  const corner: Pt = [q[0], p[1]];
  const [px, py] = gridAt(g, p);
  const [cx, cy] = gridAt(g, corner);
  const [, qy] = gridAt(g, q);
  const label = (x: number, y: number, s: string, anchor = "middle") => `<text x="${x}" y="${y}" font-size="14" font-weight="700" text-anchor="${anchor}" fill="${color}" stroke="#fff" stroke-width="4" paint-order="stroke">${s}</text>`;
  return (
    `<path d="M${px},${py} H${cx} V${qy}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="6 4"/>` +
    label((px + cx) / 2, py + (dy > 0 ? 18 : -8), signed(dx)) +
    label(cx + (dx > 0 ? 8 : -8), (cy + qy) / 2 + 5, dy > 0 ? `+${dy}` : signed(dy), dx > 0 ? "start" : "end")
  );
}

/**
 * The grid of a task with A on it, and: `b`, a second point tapped, with the line through both (`color`) and, when
 * `step`, the triangle of the step from A to it.
 */
export function slopeSvg(t: SlopeTask, o: { b?: Pt | null; color?: string; step?: boolean; cell?: number } = {}): { body: string; w: number; h: number } {
  const [lo, hi] = slopeRange(t.level);
  const g: Grid = { lo, hi, cell: o.cell ?? SLOPE_CELL };
  let body = gridSvg(g);
  const color = o.color ?? BLUE;
  if (o.b && !samePt(o.b, t.a)) {
    body += fullLine(g, t.a, o.b, color);
    if (o.step) body += stepTriangle(g, o.b[0] >= t.a[0] ? t.a : o.b, o.b[0] >= t.a[0] ? o.b : t.a, color);
    body += gridDot(g, o.b, color, "B");
  }
  body += gridDot(g, t.a, "#1e1e1e", "A");
  return { body, w: gridSide(g), h: gridSide(g) };
}

// ---------- the practice question ----------

/** A line drawn through P and Q, a few steps of the gradient apart, P on the left. */
export type SlopeQuestion = { task: SlopeTask; p: Pt; q: Pt };
export function slopeQuestion(level: SlopeLevel, next: () => number): SlopeQuestion {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const [lo, hi] = slopeRange(level);
  for (;;) {
    const task = slopeTask(level, next);
    const k = int(1, 3);
    const p = task.a;
    const q: Pt = [p[0] + k * task.run, p[1] + k * task.rise];
    // More than one step along, so the gradient takes a division, when the grid has room.
    if (q[0] > hi || q[1] > hi || q[1] < lo) continue;
    if (k === 1 && level < 3 && next() < 0.7) continue;
    return { task, p, q };
  }
}
/** The answer along over up gives: run ÷ rise. */
export const runOverRise = (q: SlopeQuestion) => (q.q[0] - q.p[0]) / (q.q[1] - q.p[1]);
export function slopeQuestionSvg(q: SlopeQuestion, o: { step?: boolean } = {}): { body: string; w: number; h: number } {
  const [lo, hi] = slopeRange(q.task.level);
  const g: Grid = { lo, hi, cell: 26 };
  let body = gridSvg(g) + fullLine(g, q.p, q.q, BLUE);
  if (o.step) body += stepTriangle(g, q.p, q.q, "#2f9e44");
  body += gridDot(g, q.p, "#1e1e1e", "P") + gridDot(g, q.q, "#1e1e1e", "Q");
  return { body, w: gridSide(g), h: gridSide(g) };
}
/** The working: up (or down) over along, then in lowest terms. */
export function slopeSteps(q: SlopeQuestion): string[] {
  const [dx, dy] = [q.q[0] - q.p[0], q.q[1] - q.p[1]];
  const [frac, m] = [`\\frac{${dy}}{${dx}}`, gradTex(dy, dx)];
  return [`m = ${frac}${m === frac ? "" : ` = ${m}`}`];
}

// ---------- the board's game ----------

export const SLOPE_LADDER: { level: SlopeLevel; seed: number }[] = [
  { level: 1, seed: 991 },
  { level: 1, seed: 992 },
  { level: 1, seed: 993 },
  { level: 2, seed: 1001 },
  { level: 2, seed: 1002 },
  { level: 2, seed: 1003 },
  { level: 3, seed: 1011 },
  { level: 3, seed: 1012 },
  { level: 3, seed: 1013 },
];
/** Stars: right at the first check three, at the second two, else one. */
export const slopeStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** Why a line through A and b is wrong: straight up, along over up, the wrong way, or another steepness. */
export function slopeSlip(t: SlopeTask, b: Pt): "upright" | "flipped" | "sign" | "steep" {
  const [dx, dy] = [b[0] - t.a[0], b[1] - t.a[1]];
  if (!dx) return "upright";
  if (dy * t.rise === dx * t.run && Math.abs(t.rise) !== t.run) return "flipped";
  if (dy * t.run === -t.rise * dx) return "sign";
  return "steep";
}
export type SlopeNotice = "farther" | "fraction" | "negative" | "streak10";
export const SLOPE_NOTICES: SlopeNotice[] = ["negative", "fraction", "farther", "streak10"];
/** What a line drawn right first time shows: B more than one step from A, a fraction, a negative gradient; ten in a row. */
export function slopeNotice(t: SlopeTask, b: Pt, misses: number, streak: number): SlopeNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (Math.abs(b[0] - t.a[0]) > t.run) return "farther";
  if (t.run > 1) return "fraction";
  if (t.rise < 0) return "negative";
  return null;
}
export type LiveSlope = EndlessGame<SlopeNotice, SlopeLevel, { kind: "wrong"; why: "upright" | "flipped" | "sign" | "steep" }> &
  TryGame & {
    /** The second point tapped. */
    b: Pt | null;
  };
export const slopeNow = (d: Pick<LiveSlope, "mode" | "stage" | "level" | "seed">): SlopeTask =>
  d.mode === "puzzle" ? slopeTask(SLOPE_LADDER[d.stage].level, rng(SLOPE_LADDER[d.stage].seed)) : slopeTask(d.level, rng(d.seed));

/** The worked solution: the line with the step from P to Q drawn as a triangle, and the working beneath. */
export type SlopeSolution = { q: SlopeQuestion };
export function renderSlope(spec: SlopeSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(slopeQuestionSvg(spec.q, { step: true }), steps);
}
