// Moving shapes on a grid: a slide (translation), a flip in a line (reflection), a turn about a point (rotation) and an
// enlargement from a centre. Points are whole grid points, y up. The piece `moveShape` hands the learner a shape and
// the outline of its image, made by one hidden move; they pick a move and set it by hand until the copy lands on the
// outline. `planeSvg` draws the practice pictures: a grid with axes, shapes, points and a mirror line.
import { C } from "./chart";
import { rngOf } from "./practiceKit";

export type P2 = [number, number];
export type Tool = "slide" | "flip" | "turn" | "enlarge";
/** A mirror line: upright x = c, level y = c, or a diagonal y = x + c or y = −x + c. */
export type Mirror = { dir: "v" | "h" | "d1" | "d2"; c: number };
export const TOOLS: readonly Tool[] = ["slide", "flip", "turn", "enlarge"];
/** The scale factors the piece offers, in order. */
export const SCALES: readonly number[] = [-3, -2, -1, -0.5, 0.5, 2, 3];
/** The grid the piece is drawn on. */
export const GRID = { x: [-8, 8], y: [-6, 6] } as const;

export const slide = (p: P2, dx: number, dy: number): P2 => [p[0] + dx, p[1] + dy];
export function flip([x, y]: P2, m: Mirror): P2 {
  if (m.dir === "v") return [2 * m.c - x, y];
  if (m.dir === "h") return [x, 2 * m.c - y];
  if (m.dir === "d1") return [y - m.c, x + m.c];
  return [m.c - y, m.c - x];
}
/** A turn by q quarter turns anticlockwise about (a, b). */
export function turnAbout(p: P2, [a, b]: P2, q: number): P2 {
  let [x, y] = p;
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) [x, y] = [a - (y - b), b + (x - a)];
  return [x, y];
}
export const enlarge = ([x, y]: P2, [a, b]: P2, k: number): P2 => [a + k * (x - a), b + k * (y - b)];

/** The same polygon: the same corners, in any order (a reflection reverses them). */
export const sameShape = (A: P2[], B: P2[]) => A.length === B.length && A.every((p) => B.some((q) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9));
const inGrid = (ps: P2[]) => ps.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y) && x >= GRID.x[0] && x <= GRID.x[1] && y >= GRID.y[0] && y <= GRID.y[1]);

/** Shapes with no symmetry, so that each move has only one way of being done. */
export const BASE_SHAPES: readonly P2[][] = [
  [[0, 0], [2, 0], [0, 1]],
  [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]],
  [[0, 0], [2, 0], [3, 2], [0, 1]],
];

export type MoveTask = { base: P2[]; target: P2[]; tool: Tool };
/** A shape somewhere on the grid and its image under one move, all on whole grid points. */
export function moveTask(seed: number): MoveTask {
  const r = rngOf(seed);
  for (;;) {
    const shape = r.pick(BASE_SHAPES);
    const [ox, oy] = [r.int(-5, 3), r.int(-4, 2)];
    const base = shape.map(([x, y]) => [x + ox, y + oy] as P2);
    const tool = r.pick(TOOLS);
    const centre: P2 = [r.int(-3, 3), r.int(-3, 3)];
    const [q, k] = [r.int(1, 3), r.pick([2, -1, -2, 0.5, 3])];
    const target =
      tool === "slide" ? (([dx, dy]) => base.map((p) => slide(p, dx, dy)))([r.int(-6, 6), r.int(-5, 5)])
      : tool === "flip" ? (() => { const m: Mirror = { dir: r.pick(["v", "h", "d1", "d2"] as const), c: r.int(-2, 2) }; return base.map((p) => flip(p, m)); })()
      : tool === "turn" ? base.map((p) => turnAbout(p, centre, q))
      : base.map((p) => enlarge(p, centre, k));
    if (inGrid(target) && !sameShape(base, target)) return { base, target, tool };
  }
}

export type LiveMoveShape = {
  tool: Tool;
  task: number;
  dx: number;
  dy: number;
  mirror: Mirror;
  centre: P2;
  q: number;
  /** The scale factor, as an index into SCALES. */
  k: number;
};
export const MOVE_SHAPE_START: LiveMoveShape = { tool: "slide", task: 1, dx: 0, dy: 0, mirror: { dir: "v", c: 0 }, centre: [0, 0], q: 0, k: 5 };
/** The copy the learner has made: the shape moved by the chosen tool as it is set now. */
export function imageOf(s: LiveMoveShape, base: P2[]): P2[] {
  if (s.tool === "slide") return base.map((p) => slide(p, s.dx, s.dy));
  if (s.tool === "flip") return base.map((p) => flip(p, s.mirror));
  if (s.tool === "turn") return base.map((p) => turnAbout(p, s.centre, s.q));
  return base.map((p) => enlarge(p, s.centre, SCALES[s.k]));
}

const f1 = (v: number) => Math.round(v * 10) / 10;
export type Drawn = { body: string; w: number; h: number };
/**
 * A grid from −n to n both ways with axes, the shapes on it (each a polygon or a single point), and optionally a
 * mirror line, dashed. Labels are written beside points.
 */
export function planeSvg(n: number, items: { pts: P2[]; color: string; dashed?: boolean; label?: string }[], mirror?: Mirror, u = 18): Drawn {
  const size = 2 * n * u + 40;
  const o = size / 2;
  const X = (x: number) => f1(o + x * u);
  const Y = (y: number) => f1(o - y * u);
  const out: string[] = [];
  for (let i = -n; i <= n; i++) {
    out.push(`<line x1="${X(i)}" y1="${Y(-n)}" x2="${X(i)}" y2="${Y(n)}" stroke="${i === 0 ? C.ink : "#dee2e6"}" stroke-width="${i === 0 ? 1.6 : 1}"/>`);
    out.push(`<line x1="${X(-n)}" y1="${Y(i)}" x2="${X(n)}" y2="${Y(i)}" stroke="${i === 0 ? C.ink : "#dee2e6"}" stroke-width="${i === 0 ? 1.6 : 1}"/>`);
  }
  const font = `font-family="Helvetica, Arial, 'Noto Sans Georgian', sans-serif"`;
  out.push(`<text x="${X(n) + 6}" y="${Y(0) + 5}" font-size="13" ${font} fill="${C.ink}">x</text>`, `<text x="${X(0) - 4}" y="${Y(n) - 6}" font-size="13" ${font} fill="${C.ink}">y</text>`);
  for (const t of [-n, -n / 2, n / 2, n].filter(Number.isInteger)) {
    out.push(`<text x="${X(t)}" y="${Y(0) + 14}" font-size="11" text-anchor="middle" ${font} fill="${C.grey}">${t < 0 ? `−${-t}` : t}</text>`);
    out.push(`<text x="${X(0) - 4}" y="${Y(t) + 4}" font-size="11" text-anchor="end" ${font} fill="${C.grey}">${t < 0 ? `−${-t}` : t}</text>`);
  }
  if (mirror) {
    const ends: [P2, P2] = mirror.dir === "v" ? [[mirror.c, -n], [mirror.c, n]] : mirror.dir === "h" ? [[-n, mirror.c], [n, mirror.c]]
      : mirror.dir === "d1" ? [[-n, -n + mirror.c], [n, n + mirror.c]] : [[-n, n + mirror.c], [n, -n + mirror.c]];
    out.push(`<line x1="${X(ends[0][0])}" y1="${Y(ends[0][1])}" x2="${X(ends[1][0])}" y2="${Y(ends[1][1])}" stroke="${C.purple}" stroke-width="2.5" stroke-dasharray="8 5"/>`);
  }
  for (const it of items) {
    if (it.pts.length === 1) out.push(`<circle cx="${X(it.pts[0][0])}" cy="${Y(it.pts[0][1])}" r="4.5" fill="${it.color}"/>`);
    else out.push(`<polygon points="${it.pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")}" fill="${it.dashed ? "none" : it.color}" fill-opacity="0.25" stroke="${it.color}" stroke-width="2.5"${it.dashed ? ` stroke-dasharray="6 4"` : ""}/>`);
    if (it.label) {
      const [x, y] = it.pts[0];
      out.push(`<text x="${X(x) + 7}" y="${Y(y) - 7}" font-size="14" font-weight="700" ${font} fill="${it.color}" stroke="#fff" stroke-width="3" paint-order="stroke">${it.label}</text>`);
    }
  }
  return { body: out.join(""), w: size, h: size };
}
