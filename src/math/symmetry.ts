// Lines of symmetry: a shape, and the lines it folds onto itself along. Easy: rectangles, squares, triangles and a kite,
// standing straight; medium: a rhombus, a parallelogram, a trapezium, regular pentagons and hexagons, turned; hard: an
// octagon, a star, and shapes made of squares (a plus, a T, an L, an S). The board's game offers lines through the
// shape's middle to tap, the diagonals among them, and folds the shape over each one chosen wrongly; the practice
// question asks how many there are. Taking a line that cuts a shape into two equal halves for a mirror line (a
// rectangle's diagonals) is the slip named.
import { withSteps } from "./angleGuess";
import { rng } from "./random";

export type SymLevel = 1 | 2 | 3;
type P = [number, number];
const regular = (n: number, start = 90): P[] => Array.from({ length: n }, (_, k) => [Math.cos(((start + (360 * k) / n) * Math.PI) / 180), Math.sin(((start + (360 * k) / n) * Math.PI) / 180)]);
const star = (): P[] => regular(10, 90).map(([x, y], k) => (k % 2 ? [0.45 * x, 0.45 * y] : [x, y]));
/** The shapes, each a polygon in maths coordinates (y upwards), by level. */
export const SYM_SHAPES = {
  rectangle: { level: 1, pts: [[-1.4, -0.8], [1.4, -0.8], [1.4, 0.8], [-1.4, 0.8]] },
  square: { level: 1, pts: [[-1, -1], [1, -1], [1, 1], [-1, 1]] },
  isosceles: { level: 1, pts: [[-0.9, -0.8], [0.9, -0.8], [0, 1.2]] },
  equilateral: { level: 1, pts: regular(3) },
  kite: { level: 1, pts: [[0, 1.2], [0.7, 0.4], [0, -1.2], [-0.7, 0.4]] },
  rightIsosceles: { level: 1, pts: [[-1, -1], [1, -1], [-1, 1]] },
  rhombus: { level: 2, pts: [[0, 1.2], [0.75, 0], [0, -1.2], [-0.75, 0]] },
  parallelogram: { level: 2, pts: [[-1.3, -0.7], [0.6, -0.7], [1.3, 0.7], [-0.6, 0.7]] },
  trapezium: { level: 2, pts: [[-1.3, -0.7], [1.3, -0.7], [0.7, 0.7], [-0.7, 0.7]] },
  pentagon: { level: 2, pts: regular(5) },
  hexagon: { level: 2, pts: regular(6, 0) },
  scalene: { level: 2, pts: [[-1.2, -0.7], [1.2, -0.7], [0.5, 1.0]] },
  octagon: { level: 3, pts: regular(8, 22.5) },
  star: { level: 3, pts: star() },
  plus: { level: 3, pts: [[-0.5, -1.5], [0.5, -1.5], [0.5, -0.5], [1.5, -0.5], [1.5, 0.5], [0.5, 0.5], [0.5, 1.5], [-0.5, 1.5], [-0.5, 0.5], [-1.5, 0.5], [-1.5, -0.5], [-0.5, -0.5]] },
  tee: { level: 3, pts: [[-0.5, -1.5], [0.5, -1.5], [0.5, 0.5], [1.5, 0.5], [1.5, 1.5], [-1.5, 1.5], [-1.5, 0.5], [-0.5, 0.5]] },
  ell: { level: 3, pts: [[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]] },
  ess: { level: 3, pts: [[-1.5, -1], [0.5, -1], [0.5, 0], [1.5, 0], [1.5, 1], [-0.5, 1], [-0.5, 0], [-1.5, 0]] },
  arrow: { level: 3, pts: [[-1.5, -0.4], [0.3, -0.4], [0.3, -1], [1.5, 0], [0.3, 1], [0.3, 0.4], [-1.5, 0.4]] },
} as const satisfies Record<string, { level: SymLevel; pts: readonly (readonly number[])[] }>;
export type SymShape = keyof typeof SYM_SHAPES;
export const SYM_IDS = Object.keys(SYM_SHAPES) as SymShape[];

/** A shape to look at: which one, and turned how far (degrees anticlockwise). */
export type SymTask = { level: SymLevel; shape: SymShape; turn: number };

export function symTask(level: SymLevel, next: () => number): SymTask {
  const ids = SYM_IDS.filter((id) => SYM_SHAPES[id].level === level);
  const shape = ids[Math.floor(next() * ids.length)];
  // Easy shapes stand straight; the others turn in 15s, and the shapes of squares in 90s or 45s.
  const turn = level === 1 ? 0 : level === 3 && ["plus", "tee", "ell", "ess"].includes(shape) ? 45 * Math.floor(next() * 8) : 15 * Math.floor(next() * 24);
  return { level, shape, turn };
}

/** The shape's corners, turned, centred on its corners' middle. */
export function cornersOf(t: Pick<SymTask, "shape" | "turn">): P[] {
  const pts = SYM_SHAPES[t.shape].pts as readonly (readonly number[])[];
  const [mx, my] = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const a = (t.turn * Math.PI) / 180;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return pts.map(([x, y]) => [c * (x - mx) - s * (y - my), s * (x - mx) + c * (y - my)]);
}
/** A point reflected in the line through the middle at `deg` degrees. */
export function reflect([x, y]: P, deg: number): P {
  const a = (2 * deg * Math.PI) / 180;
  return [Math.cos(a) * x + Math.sin(a) * y, Math.sin(a) * x - Math.cos(a) * y];
}
const same = (p: P, q: P) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;
/** Whether the line through the middle at `deg` folds the shape onto itself: every side lands on a side. */
export function isMirror(pts: P[], deg: number): boolean {
  const n = pts.length;
  return pts.every((p, i) => {
    const [a, b] = [reflect(p, deg), reflect(pts[(i + 1) % n], deg)];
    return pts.some((q, j) => (same(a, q) && same(b, pts[(j + 1) % n])) || (same(b, q) && same(a, pts[(j + 1) % n])));
  });
}
/** The directions of the mirror lines, 0° ≤ d < 180°, in half degrees. */
export function mirrorsOf(t: Pick<SymTask, "shape" | "turn">): number[] {
  const pts = cornersOf(t);
  return Array.from({ length: 360 }, (_, k) => k / 2).filter((d) => isMirror(pts, d));
}
const norm = (d: number) => Math.round(((((d % 180) + 180) % 180) * 2)) / 2;
const dirOf = ([x, y]: P) => norm((Math.atan2(y, x) * 180) / Math.PI);
/** A quadrilateral's diagonals that aren't mirror lines (each through the middle only when the shape is centred on it). */
export function falseDiagonals(t: Pick<SymTask, "shape" | "turn">): number {
  const pts = cornersOf(t);
  if (pts.length !== 4) return 0;
  return [0, 1].filter((k) => !isMirror(pts, dirOf([pts[k + 2][0] - pts[k][0], pts[k + 2][1] - pts[k][1]]))).length;
}
/**
 * The lines the board offers: the mirror lines, then the lines through the middle and a corner (a rectangle's
 * diagonals), then across and up the shape, then any others: six in all (or every mirror line, when there are more),
 * none closer than 10° to another.
 */
export function linesOf(t: SymTask, next: () => number): number[] {
  const out = [...mirrorsOf(t)];
  const most = Math.max(6, out.length);
  const add = (d: number) => {
    const n = norm(d);
    if (out.length < most && out.every((o) => Math.min(Math.abs(o - n), 180 - Math.abs(o - n)) >= 10)) out.push(n);
  };
  const pts = cornersOf(t);
  if (pts.length === 4) for (const k of [0, 1]) add(dirOf([pts[k + 2][0] - pts[k][0], pts[k + 2][1] - pts[k][1]]));
  const decoys = [...pts.map(dirOf), ...[0, 45, 90, 135].map((d) => d + t.turn)].map((d) => [next(), d] as const).sort((a, b) => a[0] - b[0]);
  for (const [, d] of decoys) add(d);
  // Any line through a square's middle halves it, so when the shape's own lines are used up, others in 15s.
  const more = Array.from({ length: 12 }, (_, k) => [next(), t.turn + 15 * k] as const).sort((a, b) => a[0] - b[0]);
  for (const [, d] of more) add(d);
  return out.sort((a, b) => a - b);
}

// ---------- pictures ----------

const f1 = (x: number) => Math.round(x * 10) / 10;
/** The scale and middle of a shape drawn in a box of side `side`. */
function fit(pts: P[], side: number, margin: number) {
  const r = Math.max(...pts.map(([x, y]) => Math.hypot(x, y)));
  return { s: (side / 2 - margin) / r, c: side / 2 };
}
const pathOf = (pts: P[], s: number, c: number) => `M${pts.map(([x, y]) => `${f1(c + s * x)},${f1(c - s * y)}`).join(" L")} Z`;
/** The end points of the line at `deg` through the middle of a box of side `side`, `len` from it. */
export function lineEnds(deg: number, side: number, len: number): [number, number, number, number] {
  const a = (deg * Math.PI) / 180;
  const c = side / 2;
  return [c - len * Math.cos(a), c + len * Math.sin(a), c + len * Math.cos(a), c - len * Math.sin(a)];
}
export const SYM_SIDE = 380;
/** The shape in a box of side `side`, its mirror lines dashed when `lines` (the worked solution): an SVG body. */
export function symSvg(t: Pick<SymTask, "shape" | "turn">, side = 240, lines = false): { body: string; w: number; h: number } {
  const pts = cornersOf(t);
  const { s, c } = fit(pts, side, lines ? 34 : 14);
  let body = `<path d="${pathOf(pts, s, c)}" fill="#a5d8ff" stroke="#1971c2" stroke-width="3" stroke-linejoin="round"/>`;
  if (lines)
    for (const d of mirrorsOf(t)) {
      const [x1, y1, x2, y2] = lineEnds(d, side, side / 2 - 6);
      body += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#e03131" stroke-width="2.5" stroke-dasharray="9 6"/>`;
    }
  return { body, w: side, h: side };
}
/** The shape folded over the line at `deg`, as a path in the box of side `side` (for the board's game). */
export function foldedPath(t: Pick<SymTask, "shape" | "turn">, deg: number, side: number): string {
  const pts = cornersOf(t);
  const { s, c } = fit(pts, side, 40);
  return pathOf(pts.map((p) => reflect(p, deg)), s, c);
}
export function shapePath(t: Pick<SymTask, "shape" | "turn">, side: number): string {
  const pts = cornersOf(t);
  const { s, c } = fit(pts, side, 40);
  return pathOf(pts, s, c);
}

// ---------- the board's game ----------

export const SYM_LADDER: { level: SymLevel; seed: number }[] = [
  { level: 1, seed: 906 },
  { level: 1, seed: 901 },
  { level: 1, seed: 908 },
  { level: 2, seed: 910 },
  { level: 2, seed: 911 },
  { level: 2, seed: 915 },
  { level: 3, seed: 936 },
  { level: 3, seed: 922 },
  { level: 3, seed: 926 },
];
/** Stars: every mirror line at the first check three, the second two, else one. */
export const symStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
export type SymNotice = "none" | "notDiagonal" | "many" | "streak10";
export const SYM_NOTICES: SymNotice[] = ["none", "notDiagonal", "many", "streak10"];
/** What a shape done at the first check shows: no mirror line at all, diagonals left alone, six or more; ten in a row. */
export function symNotice(t: SymTask, misses: number, streak: number): SymNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  const n = mirrorsOf(t).length;
  if (n === 0) return "none";
  if (n >= 6) return "many";
  if (falseDiagonals(t) > 0) return "notDiagonal";
  return null;
}
export type LiveMirror = {
  mode: "puzzle" | "endless";
  stage: number;
  level: SymLevel;
  seed: number;
  /** The lines chosen (places in `linesOf`), those shown folding wrongly since the last check, and the misses. */
  chosen: number[];
  wrong: number[];
  misses: number;
  done: boolean;
  streak: number;
  said: { kind: "notice"; key: SymNotice } | { kind: "wrong"; more: boolean } | null;
};
/** The shape of a puzzle or of the endless run, and the lines offered. */
export function symNow(d: Pick<LiveMirror, "mode" | "stage" | "level" | "seed">): { task: SymTask; lines: number[] } {
  const [level, seed] = d.mode === "puzzle" ? [SYM_LADDER[d.stage].level, SYM_LADDER[d.stage].seed] : [d.level, d.seed];
  const r = rng(seed);
  const task = symTask(level, r);
  return { task, lines: linesOf(task, r) };
}

/** The worked solution: the shape with its mirror lines, and the working beneath. */
export type SymSolution = { task: SymTask };
export function renderSym(spec: SymSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(symSvg(spec.task, 260, true), steps);
}
