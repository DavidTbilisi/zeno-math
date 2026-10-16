// Growing patterns: figures 1, 2 and 3 of a pattern of squares, each a step bigger than the one before, and what comes
// next. Easy: build figure 4 (an L, a T, a plus, steps); medium: how many squares in figure 10, 20 or 50; hard: a
// pattern that grows as a square or a rectangle (n², n(n + 1)), or which figure has so many squares. Seeing the part
// that stays and the part that grows is seeing the rule: an L of figure n is a corner and two arms of n, 2n + 1.
// Taking figure 10 for ten figure 1s (10 × 3 for 2n + 1) is the slip named.
import { rng } from "./random";

export type GrowLevel = 1 | 2 | 3;
export type GrowKind = "L" | "T" | "plus" | "U" | "steps" | "frame" | "square" | "rect" | "stairs";
/** A square at column x, row y (row 0 at the bottom), and the part it belongs to: 0 the part that stays, 1 the growing. */
export type Cell = { x: number; y: number; part: 0 | 1 };
export type GrowTask = { level: GrowLevel; kind: GrowKind; ask: { dir: "build"; k: 4 } | { dir: "count"; k: number } | { dir: "which"; count: number } };

const row = (n: number, x0: number, y: number, part: 0 | 1): Cell[] => Array.from({ length: n }, (_, i) => ({ x: x0 + i, y, part }));
const col = (n: number, x: number, y0: number, part: 0 | 1): Cell[] => Array.from({ length: n }, (_, i) => ({ x, y: y0 + i, part }));

/** The squares of figure n. */
export function figure(kind: GrowKind, n: number): Cell[] {
  switch (kind) {
    case "L":
      // A corner, an arm of n up and an arm of n along: 2n + 1.
      return [{ x: 0, y: 0, part: 0 }, ...col(n, 0, 1, 1), ...row(n, 1, 0, 1)];
    case "T":
      // A middle square on a stem of n, with arms of n either side of it: 3n + 1.
      return [{ x: n, y: n, part: 0 }, ...row(n, 0, n, 1), ...row(n, n + 1, n, 1), ...col(n, n, 0, 1)];
    case "plus":
      // A middle square and four arms of n: 4n + 1.
      return [{ x: n, y: n, part: 0 }, ...row(n, 0, n, 1), ...row(n, n + 1, n, 1), ...col(n, n, 0, 1), ...col(n, n, n + 1, 1)];
    case "U":
      // Two posts of n + 1 and a floor of n between them: 3n + 2.
      return [{ x: 0, y: 0, part: 0 }, { x: n + 1, y: 0, part: 0 }, ...col(n, 0, 1, 1), ...col(n, n + 1, 1, 1), ...row(n, 1, 0, 1)];
    case "steps":
      // Two rows of n + 1: 2n + 2.
      return [{ x: 0, y: 0, part: 0 }, { x: 0, y: 1, part: 0 }, ...row(n, 1, 0, 1), ...row(n, 1, 1, 1)];
    case "frame":
      // The four corners and four sides of n round a hole n × n: 4n + 4.
      return [
        ...[[0, 0], [n + 1, 0], [0, n + 1], [n + 1, n + 1]].map(([x, y]) => ({ x, y, part: 0 as const })),
        ...row(n, 1, 0, 1), ...row(n, 1, n + 1, 1), ...col(n, 0, 1, 1), ...col(n, n + 1, 1, 1),
      ];
    case "square":
      // n rows of n: n².
      return Array.from({ length: n }, (_, y) => row(n, 0, y, 1)).flat();
    case "rect":
      // n rows of n + 1: n(n + 1).
      return Array.from({ length: n }, (_, y) => row(n + 1, 0, y, 1)).flat();
    case "stairs":
      // A step of each length from n down to 1: n(n + 1)/2.
      return Array.from({ length: n }, (_, y) => row(n - y, 0, y, 1)).flat();
  }
}
/** How many squares figure n has, by its rule. */
export function countOf(kind: GrowKind, n: number): number {
  const by: Record<GrowKind, number> = { L: 2 * n + 1, T: 3 * n + 1, plus: 4 * n + 1, U: 3 * n + 2, steps: 2 * n + 2, frame: 4 * n + 4, square: n * n, rect: n * (n + 1), stairs: (n * (n + 1)) / 2 };
  return by[kind];
}
/** The rule as a LaTeX expression in n. */
export const RULE_TEX: Record<GrowKind, string> = { L: "2n + 1", T: "3n + 1", plus: "4n + 1", U: "3n + 2", steps: "2n + 2", frame: "4n + 4", square: "n^2", rect: "n(n + 1)", stairs: "\\frac{n(n + 1)}{2}" };
const LINEAR: GrowKind[] = ["L", "T", "plus", "U", "steps", "frame"];
/** Growing by the same number each time (a step of `step`, starting from `start` at figure 0), or not. */
export const linear = (kind: GrowKind) => LINEAR.includes(kind);
export const stepOf = (kind: GrowKind) => countOf(kind, 2) - countOf(kind, 1);

export function growTask(level: GrowLevel, next: () => number): GrowTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T,>(xs: readonly T[]) => xs[int(0, xs.length - 1)];
  if (level === 1) return { level, kind: pick(["L", "T", "plus", "U", "steps"] as const), ask: { dir: "build", k: 4 } };
  if (level === 2) return { level, kind: pick(LINEAR), ask: { dir: "count", k: pick([10, 20, 50]) } };
  if (next() < 0.5) return { level, kind: pick(["square", "rect", "stairs"] as const), ask: { dir: "count", k: int(6, 12) } };
  const kind = pick(LINEAR);
  return { level, kind, ask: { dir: "which", count: countOf(kind, int(12, 30)) } };
}
/** The answer: figure 4's squares, how many in figure k, or which figure. */
export const growAnswer = (t: GrowTask): number =>
  t.ask.dir === "which" ? whichFigure(t.kind, t.ask.count) : countOf(t.kind, t.ask.dir === "build" ? 4 : t.ask.k);
export function whichFigure(kind: GrowKind, count: number): number {
  for (let n = 1; n <= 200; n++) if (countOf(kind, n) === count) return n;
  return 0;
}

// ---------- building a figure ----------

/** Cells as "x,y" from the bottom-left of the smallest box round them, sorted, to compare two figures where they lie. */
export function shapeKey(cells: { x: number; y: number }[]): string {
  if (!cells.length) return "";
  const [x0, y0] = [Math.min(...cells.map((c) => c.x)), Math.min(...cells.map((c) => c.y))];
  return [...new Set(cells.map((c) => `${c.x - x0},${c.y - y0}`))].sort().join(";");
}
/** A built figure (cells of a grid, 0 at the top left, `cols` across) against figure k: the same shape anywhere. */
export function judgeBuilt(kind: GrowKind, k: number, built: number[], cols: number, rows: number): { ok: boolean; count: number } {
  const cells = built.map((i) => ({ x: i % cols, y: rows - 1 - Math.floor(i / cols) }));
  return { ok: shapeKey(cells) === shapeKey(figure(kind, k)), count: new Set(built).size };
}
/** The grid to build on: room for figure 4 and a square more each way. */
export function buildGrid(kind: GrowKind): { cols: number; rows: number } {
  const f = figure(kind, 4);
  return { cols: Math.max(...f.map((c) => c.x)) + 3, rows: Math.max(...f.map((c) => c.y)) + 3 };
}

// ---------- the practice question ----------

/** Figure k taken for k figure 1s (k × 3 for 2n + 1), when that isn't the answer. */
export function scaledFigure(t: GrowTask): { v: number; k: number; f1: number; s: number } | null {
  if (t.ask.dir !== "count" || !linear(t.kind)) return null;
  const f1 = countOf(t.kind, 1);
  const v = t.ask.k * f1;
  return v !== countOf(t.kind, t.ask.k) ? { v, k: t.ask.k, f1, s: stepOf(t.kind) } : null;
}
/**
 * The practice question: easy, how many squares in figure 5 or 6; medium, figure 10 to 20; hard, a square or a
 * rectangle's figure, or which figure has so many squares.
 */
export function growQuestion(level: GrowLevel, next: () => number): GrowTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  if (level === 1) return { level, kind: LINEAR[int(0, LINEAR.length - 2)], ask: { dir: "count", k: int(5, 6) } };
  if (level === 2) return { level, kind: LINEAR[int(0, LINEAR.length - 1)], ask: { dir: "count", k: int(10, 20) } };
  return growTask(3, next);
}
/** The working: what stays and what grows, the rule, then the answer from it. */
export function growSteps(t: GrowTask): string[] {
  const rule = `n \\mapsto ${RULE_TEX[t.kind]}`;
  const lines = linear(t.kind) ? [`${countOf(t.kind, 1)}, \\; ${countOf(t.kind, 2)}, \\; ${countOf(t.kind, 3)}: \\; +${stepOf(t.kind)}`, rule] : [rule];
  if (t.ask.dir === "which") {
    const n = whichFigure(t.kind, t.ask.count);
    const [s, c] = [stepOf(t.kind), countOf(t.kind, 0)];
    lines.push(`${RULE_TEX[t.kind]} = ${t.ask.count}`, `${s}n = ${t.ask.count} - ${c} = ${t.ask.count - c}`, `n = ${t.ask.count - c} \\div ${s} = ${n}`);
  } else {
    const k = t.ask.dir === "build" ? 4 : t.ask.k;
    lines.push(`${k} \\mapsto ${RULE_TEX[t.kind].replace(/n/g, `(${k})`).replace(/(\d)\((\d+)\)/g, "$1 \\times $2").replace(/\((\d+)\)/g, "$1")} = ${countOf(t.kind, k)}`);
  }
  return lines;
}

// ---------- pictures ----------

const PART_FILL = ["#ffa94d", "#74c0fc"];
/** A figure as squares of `s`, coloured by part when `parts` (else all one colour): an SVG body and its size. */
export function figureSvg(cells: Cell[], s: number, parts: boolean): { body: string; w: number; h: number } {
  const [w, h] = [Math.max(...cells.map((c) => c.x)) + 1, Math.max(...cells.map((c) => c.y)) + 1];
  const body = cells
    .map((c) => `<rect x="${c.x * s}" y="${(h - 1 - c.y) * s}" width="${s}" height="${s}" fill="${parts ? PART_FILL[c.part] : "#74c0fc"}" stroke="#1e1e1e" stroke-width="1.5"/>`)
    .join("");
  return { body, w: w * s, h: h * s };
}
/** Figures 1, 2 and 3 side by side with their numbers beneath, scaled to fit `width`: an SVG body and its size. */
export function figuresSvg(kind: GrowKind, parts: boolean, width = 460, label = (n: number) => String(n)): { body: string; w: number; h: number } {
  const figs = [1, 2, 3].map((n) => figure(kind, n));
  const units = figs.map((f) => Math.max(...f.map((c) => c.x)) + 1);
  const tall = Math.max(...figs.map((f) => Math.max(...f.map((c) => c.y)) + 1));
  const s = Math.min(22, (width - 60) / units.reduce((a, b) => a + b, 0));
  const gap = (width - s * units.reduce((a, b) => a + b, 0)) / 3;
  let x = gap / 2;
  const h = tall * s;
  const body = figs
    .map((f, i) => {
      const pic = figureSvg(f, s, parts);
      const out = `<g transform="translate(${x.toFixed(1)} ${(h - pic.h).toFixed(1)})">${pic.body}</g><text x="${(x + pic.w / 2).toFixed(1)}" y="${h + 22}" font-size="15" text-anchor="middle" fill="#495057">${label(i + 1)}</text>`;
      x += pic.w + gap;
      return out;
    })
    .join("");
  return { body, w: width, h: h + 28 };
}

// ---------- the board's game ----------

export const GROW_LADDER: { level: GrowLevel; seed: number }[] = [
  { level: 1, seed: 505 },
  { level: 1, seed: 504 },
  { level: 1, seed: 503 },
  { level: 2, seed: 557 },
  { level: 2, seed: 522 },
  { level: 2, seed: 517 },
  { level: 3, seed: 548 },
  { level: 3, seed: 527 },
  { level: 3, seed: 526 },
];
/** Stars: right first time three, after one miss two, else one. */
export const growStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
export type GrowNotice = "bigFigure" | "squares" | "backwards" | "streak10";
export const GROW_NOTICES: GrowNotice[] = ["bigFigure", "squares", "backwards", "streak10"];
/** What a right answer shows: figure 50, a pattern that isn't a step each time, which figure, ten in a row — first time. */
export function growNotice(t: GrowTask, misses: number, streak: number): GrowNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (t.ask.dir === "which") return "backwards";
  if (!linear(t.kind)) return "squares";
  if (t.ask.dir === "count" && t.ask.k >= 50) return "bigFigure";
  return null;
}
export type LiveGrow = {
  mode: "puzzle" | "endless";
  stage: number;
  level: GrowLevel;
  seed: number;
  /** The squares tapped on the grid (figure 4), or the number typed. */
  built: number[];
  typed: string;
  misses: number;
  done: boolean;
  streak: number;
  said: { kind: "notice"; key: GrowNotice } | { kind: "wrong"; v: number } | null;
};
export const growNow = (d: Pick<LiveGrow, "mode" | "stage" | "level" | "seed">): GrowTask =>
  d.mode === "puzzle" ? growTask(GROW_LADDER[d.stage].level, rng(GROW_LADDER[d.stage].seed)) : growTask(d.level, rng(d.seed));

/** The worked solution: figures 1 to 3 coloured by part, with the working beneath. */
export type GrowSolution = { task: GrowTask };
export function renderGrow(spec: GrowSolution, steps: { svg: string; width: number; height: number } | null) {
  const pic = figuresSvg(spec.task.kind, true, 420);
  const w = Math.max(pic.w + 20, steps?.width ?? 0);
  const h = pic.h + 16 + (steps?.height ?? 0);
  const below = steps ? `<g transform="translate(0 ${pic.h + 16})">${steps.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>` : "";
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/><g transform="translate(${(w - pic.w) / 2} 10)">${pic.body}</g>${below}</svg>`,
    width: w,
    height: h,
  };
}
