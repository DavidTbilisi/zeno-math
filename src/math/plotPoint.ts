// Plot the point: a coordinate grid, and a point to find on it. Easy: the first quadrant, 0 to 8; medium: all four
// quadrants, −6 to 6; hard: three corners of a rectangle drawn, and the fourth to find. The board's game takes a tap on
// a crossing of the grid; the practice question draws the point and asks for its coordinates. The numbers the wrong
// way round — up first, then along, (y, x) for (x, y) — is the slip named. The grid is shared with the gradient game.
import { withSteps } from "./angleGuess";
import { rng } from "./random";

export type PlotLevel = 1 | 2 | 3;
export type Pt = [number, number];
/** A point to find; at the hard level, the three corners of the rectangle it completes, in order round it. */
export type PlotTask = { level: PlotLevel; p: Pt; corners: Pt[] };
/** The grid of a level, the same on both axes. */
export const plotRange = (level: PlotLevel): [number, number] => (level === 1 ? [0, 8] : [-6, 6]);

export function plotTask(level: PlotLevel, next: () => number): PlotTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  if (level === 1) return { level, p: [int(0, 8), int(0, 8)], corners: [] };
  if (level === 2)
    for (;;) {
      const p: Pt = [int(-6, 6), int(-6, 6)];
      if (p[0] < 0 || p[1] < 0) return { level, p, corners: [] };
    }
  // A rectangle at least 3 by 3, its corners in order round it; the one after the three drawn is the one to find.
  for (;;) {
    const [x1, x2, y1, y2] = [int(-6, 6), int(-6, 6), int(-6, 6), int(-6, 6)];
    if (x2 - x1 < 3 || y2 - y1 < 3) continue;
    const round: Pt[] = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    const k = int(0, 3);
    return { level, p: round[k], corners: [1, 2, 3].map((j) => round[(k + j) % 4]) };
  }
}
/** The numbers the wrong way round: (y, x) for (x, y). */
export const swapped = (p: Pt): Pt => [p[1], p[0]];
export const samePt = (a: Pt | null, b: Pt | null) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
/** A number as it is printed, with a real minus sign. */
export const signed = (v: number) => (v < 0 ? `−${-v}` : String(v));
export const ptText = (p: Pt) => `(${signed(p[0])}, ${signed(p[1])})`;

// ---------- the grid ----------

const PAD = 30;
const INK = "#1e1e1e";
const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#e8590c";
export type Grid = { lo: number; hi: number; cell: number };
export const gridSide = (g: Grid) => (g.hi - g.lo) * g.cell + 2 * PAD;
/** Where a point of the grid is drawn. */
export const gridAt = (g: Grid, [x, y]: Pt): Pt => [PAD + (x - g.lo) * g.cell, PAD + (g.hi - y) * g.cell];
/** The crossing nearest a point of the picture, or null off the grid. */
export function gridSnap(g: Grid, px: number, py: number): Pt | null {
  const x = Math.round((px - PAD) / g.cell) + g.lo;
  const y = g.hi - Math.round((py - PAD) / g.cell);
  return x >= g.lo && x <= g.hi && y >= g.lo && y <= g.hi ? [x, y] : null;
}

/** The squares, the axes with arrows at their ends named x and y, and the numbers along them (0 once, at the corner of the axes). */
export function gridSvg(g: Grid): string {
  const n = g.hi - g.lo;
  const [x0, y0] = gridAt(g, [g.lo, g.hi]);
  const end = PAD + n * g.cell;
  let s = "";
  for (let k = 0; k <= n; k++) {
    const at = PAD + k * g.cell;
    s += `<line x1="${at}" y1="${y0}" x2="${at}" y2="${end}" stroke="#dee2e6" stroke-width="1"/>`;
    s += `<line x1="${x0}" y1="${at}" x2="${end}" y2="${at}" stroke="#dee2e6" stroke-width="1"/>`;
  }
  const [ox, oy] = gridAt(g, [0, 0]);
  s += `<line x1="${x0}" y1="${oy}" x2="${end + 14}" y2="${oy}" stroke="${INK}" stroke-width="2"/>`;
  s += `<line x1="${ox}" y1="${end}" x2="${ox}" y2="${y0 - 14}" stroke="${INK}" stroke-width="2"/>`;
  s += `<path d="M${end + 18},${oy} l-9,-5 v10 z M${ox},${y0 - 18} l-5,9 h10 z" fill="${INK}"/>`;
  s += `<text x="${end + 12}" y="${oy - 8}" font-size="15" font-style="italic" font-weight="700" fill="${INK}">x</text>`;
  s += `<text x="${ox + 9}" y="${y0 - 8}" font-size="15" font-style="italic" font-weight="700" fill="${INK}">y</text>`;
  for (let v = g.lo; v <= g.hi; v++) {
    if (v === 0) continue;
    const [px] = gridAt(g, [v, 0]);
    const [, py] = gridAt(g, [0, v]);
    s += `<text x="${px}" y="${oy + 16}" font-size="12" text-anchor="middle" fill="#495057">${signed(v)}</text>`;
    s += `<text x="${ox - 6}" y="${py + 4}" font-size="12" text-anchor="end" fill="#495057">${signed(v)}</text>`;
  }
  s += `<text x="${ox - 6}" y="${oy + 16}" font-size="12" text-anchor="end" fill="#495057">0</text>`;
  return s;
}

/** A point drawn as a dot, with its name beside it, away from the edges of the grid. */
export function gridDot(g: Grid, p: Pt, color: string, label = ""): string {
  const [x, y] = gridAt(g, p);
  const right = p[0] < g.hi - 1;
  const up = p[1] < g.hi - 1;
  const text = label ? `<text x="${x + (right ? 10 : -10)}" y="${y + (up ? -9 : 21)}" font-size="15" font-weight="700" text-anchor="${right ? "start" : "end"}" fill="${color}" stroke="#fff" stroke-width="4" paint-order="stroke">${label}</text>` : "";
  return `<circle cx="${x}" cy="${y}" r="7" fill="${color}" stroke="#fff" stroke-width="2"/>${text}`;
}

export const PLOT_CELL = 34;
/**
 * The grid of a task, with a rectangle's three corners drawn (A, B, C), and: `asked`, the point to read (P, or the
 * fourth corner left to find); `tap`, where a tap landed; `shown`, the point itself, with dashed lines from the axes.
 */
export function plotSvg(t: PlotTask, o: { asked?: boolean; tap?: Pt | null; shown?: boolean; cell?: number } = {}): { body: string; w: number; h: number } {
  const [lo, hi] = plotRange(t.level);
  const g: Grid = { lo, hi, cell: o.cell ?? PLOT_CELL };
  let body = gridSvg(g);
  if (t.corners.length) {
    // The rectangle's sides so far, dashed; whole once the fourth corner shows.
    const ps = [...t.corners, ...(o.shown ? [t.p] : [])].map((c) => gridAt(g, c).join(",")).join(" ");
    body += o.shown ? `<polygon points="${ps}" fill="none" stroke="${BLUE}" stroke-width="2"/>` : `<polyline points="${ps}" fill="none" stroke="${BLUE}" stroke-width="2" stroke-dasharray="6 5"/>`;
    t.corners.forEach((c, k) => (body += gridDot(g, c, BLUE, "ABC"[k])));
  }
  if (o.shown) {
    const [x, y] = gridAt(g, t.p);
    const [ox, oy] = gridAt(g, [0, 0]);
    body += `<path d="M${x},${oy} V${y} M${ox},${y} H${x}" fill="none" stroke="${GREEN}" stroke-width="2.5" stroke-dasharray="6 4"/>`;
  }
  if (o.tap && !(o.shown && samePt(o.tap, t.p))) body += gridDot(g, o.tap, ORANGE, ptText(o.tap));
  if (o.shown) body += gridDot(g, t.p, GREEN, `${t.corners.length ? "D " : ""}${ptText(t.p)}`);
  else if (o.asked && !t.corners.length) body += gridDot(g, t.p, BLUE, "P");
  return { body, w: gridSide(g), h: gridSide(g) };
}

// ---------- the practice question ----------

/** The working: how far along and how far up or down the point is; for a corner, which corner each coordinate comes from. */
export function plotSteps(t: PlotTask): string[] {
  const [x, y] = t.p.map((v) => String(v));
  if (!t.corners.length) return [`x = ${x}, \\; y = ${y}`, `P = (${x}, ${y})`];
  // D is beside A and C: it shares one number with each.
  const [fromX, fromY] = t.corners[0][0] === t.p[0] ? ["A", "C"] : ["C", "A"];
  return [`x_D = x_${fromX} = ${x}, \\; y_D = y_${fromY} = ${y}`, `D = (${x}, ${y})`];
}

// ---------- the board's game ----------

export const PLOT_ROUND = 5;
export const PLOT_LADDER: { level: PlotLevel; seed: number }[] = [
  { level: 1, seed: 901 },
  { level: 1, seed: 902 },
  { level: 1, seed: 903 },
  { level: 2, seed: 911 },
  { level: 2, seed: 912 },
  { level: 2, seed: 913 },
  { level: 3, seed: 921 },
  { level: 3, seed: 922 },
  { level: 3, seed: 923 },
];
/** Five points of a level, no two the same. */
export function plotRound(level: PlotLevel, seed: number): PlotTask[] {
  const next = rng(seed);
  const out: PlotTask[] = [];
  while (out.length < PLOT_ROUND) {
    const t = plotTask(level, next);
    if (!out.some((o) => samePt(o.p, t.p))) out.push(t);
  }
  return out;
}
/** Stars for a round: every point found three, all but one two, else one. */
export const plotStars = (results: boolean[]) => {
  const missed = results.filter((r) => !r).length;
  return missed === 0 ? 3 : missed === 1 ? 2 : 1;
};
export type PlotNotice = "onAxis" | "negative" | "corner" | "streak10";
export const PLOT_NOTICES: PlotNotice[] = ["onAxis", "negative", "corner", "streak10"];
/** What a point found shows: one on an axis, one with both numbers negative, a rectangle's fourth corner; ten in a row. */
export function plotNotice(t: PlotTask, right: boolean, streak: number): PlotNotice | null {
  if (streak === 10) return "streak10";
  if (!right) return null;
  if (t.corners.length) return "corner";
  if (t.p[0] < 0 && t.p[1] < 0) return "negative";
  if (t.p[0] === 0 || t.p[1] === 0) return "onAxis";
  return null;
}
export type LivePlot = {
  mode: "puzzle" | "endless";
  stage: number;
  level: PlotLevel;
  seed: number;
  /** Which point of the round, whether each one so far was found, and where the last tap landed. */
  i: number;
  results: boolean[];
  tap: Pt | null;
  streak: number;
  said: { kind: "notice"; key: PlotNotice } | { kind: "done"; stars: number } | null;
};
export const plotNow = (d: Pick<LivePlot, "mode" | "stage" | "level" | "seed" | "i">): PlotTask =>
  d.mode === "puzzle" ? plotRound(PLOT_LADDER[d.stage].level, PLOT_LADDER[d.stage].seed)[d.i] : plotTask(d.level, rng(d.seed));

/** The worked solution: the point with the dashed lines that lead to it from the axes, and the working beneath. */
export type PlotSolution = { task: PlotTask };
export function renderPlot(spec: PlotSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(plotSvg(spec.task, { shown: true, cell: 26 }), steps);
}
