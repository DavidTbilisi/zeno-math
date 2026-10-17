// Cube nets: six squares joined edge to edge, and whether they fold into a cube. Of the 35 shapes six squares make,
// 11 do. Easy: a row of four with a square either side (a cross, a T) against shapes that clearly don't; medium: the
// nets without a row of four (steps, a staircase) against shapes that look as if they might; hard: a net folded in the
// mind, with a face to find opposite another. A net is folded by rolling a cube along it, square by square; two
// squares on the same face mean it doesn't fold. Taking any six joined squares for a net, and a face next to another
// in the net for its opposite, are the slips named.
import { withSteps } from "./angleGuess";
import { rng } from "./random";

export type NetLevel = 1 | 2 | 3;
export type Cell = [number, number];
type V = [number, number, number];

/** Cells moved to start at (0, 0), in reading order. */
export const normal = (cells: Cell[]): Cell[] => {
  const [mx, my] = [Math.min(...cells.map((c) => c[0])), Math.min(...cells.map((c) => c[1]))];
  return cells.map(([x, y]): Cell => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};
const keyOf = (cells: Cell[]) => normal(cells).map((c) => c.join(",")).join(";");
/** The same for a shape turned or flipped any way: the first of its eight positions' keys. */
const freeKey = (cells: Cell[]) =>
  [0, 1, 2, 3, 4, 5, 6, 7]
    .map((k) => keyOf(cells.map(([x, y]): Cell => {
      const [a, b] = k & 1 ? [y, x] : [x, y];
      return [k & 2 ? -a : a, k & 4 ? -b : b];
    })))
    .sort()[0];
const STEPS: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

let hexominoes: Cell[][] | null = null;
/** Every shape of six squares joined edge to edge, in every position (216 of them), in a fixed order. */
export function allHexominoes(): Cell[][] {
  if (hexominoes) return hexominoes;
  let level = new Map<string, Cell[]>([["0,0", [[0, 0]]]]);
  for (let n = 1; n < 6; n++) {
    const grown = new Map<string, Cell[]>();
    for (const cells of level.values())
      for (const [x, y] of cells)
        for (const [dx, dy] of STEPS) {
          const c: Cell = [x + dx, y + dy];
          if (cells.some((o) => o[0] === c[0] && o[1] === c[1])) continue;
          const more = normal([...cells, c]);
          grown.set(keyOf(more), more);
        }
    level = grown;
  }
  hexominoes = [...level.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, c]) => c);
  return hexominoes;
}

const neg = (v: V): V => [-v[0], -v[1], -v[2]];
/** The face of the cube a vector points to: 0/1 ±x, 2/3 ±y, 4/5 ±z (a face and its opposite differ in the last bit). */
const faceOf = (v: V) => (v[0] ? 0 : v[1] ? 2 : 4) + ((v[0] || v[1] || v[2]) < 0 ? 1 : 0);
/**
 * The face of the cube each square lands on, rolling the cube from the first square across the shared edges: rolling
 * to the right the face that was on the right goes down, and so on. A net is the shape whose six squares land on six
 * faces.
 */
export function fold(cells: Cell[]): number[] {
  const at = (x: number, y: number) => cells.findIndex((c) => c[0] === x && c[1] === y);
  const frame: ({ n: V; r: V; u: V } | null)[] = cells.map(() => null);
  frame[0] = { n: [0, 0, -1], r: [1, 0, 0], u: [0, 1, 0] };
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    const { n, r, u } = frame[i]!;
    for (const [dx, dy] of STEPS) {
      const j = at(cells[i][0] + dx, cells[i][1] + dy);
      if (j < 0 || frame[j]) continue;
      frame[j] = dx === 1 ? { n: r, r: neg(n), u } : dx === -1 ? { n: neg(r), r: n, u } : dy === 1 ? { n: u, r, u: neg(n) } : { n: neg(u), r, u: n };
      queue.push(j);
    }
  }
  return frame.map((f) => faceOf(f!.n));
}
export const isNet = (cells: Cell[]) => new Set(fold(cells)).size === 6;
/** The squares of a shape that land on a face another square already has (none for a net). */
export const clashes = (cells: Cell[]): number[] => {
  const f = fold(cells);
  return f.flatMap((x, i) => (f.indexOf(x) !== i || f.lastIndexOf(x) !== i ? [i] : []));
};
/** Whether the shape has four squares in a row. */
export const hasRow4 = (cells: Cell[]) => cells.some(([x, y]) => [1, 2, 3].every((k) => cells.some((c) => c[0] === x + k && c[1] === y)) || [1, 2, 3].every((k) => cells.some((c) => c[0] === x && c[1] === y + k)));
/** Whether the shape has a 2 × 2 block, which never folds. */
export const hasBlock = (cells: Cell[]) => cells.some(([x, y]) => [[1, 0], [0, 1], [1, 1]].every(([dx, dy]) => cells.some((c) => c[0] === x + dx && c[1] === y + dy)));

/** Shapes of six squares by kind: nets with a row of four, nets without, shapes that look like nets, shapes with a block. */
let sorted: ReturnType<typeof sortKinds> | null = null;
export const kinds = () => (sorted ??= sortKinds());
function sortKinds() {
  const all = allHexominoes();
  return {
    rowNets: all.filter((c) => isNet(c) && hasRow4(c)),
    otherNets: all.filter((c) => isNet(c) && !hasRow4(c)),
    lookalikes: all.filter((c) => !isNet(c) && !hasBlock(c)),
    blocks: all.filter((c) => !isNet(c) && hasBlock(c)),
  };
}
const pickFrom = <T>(xs: T[], next: () => number) => xs[Math.floor(next() * xs.length)];
/** Two squares share an edge. */
export const touching = (a: Cell, b: Cell) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

// ---------- the practice question ----------

export const LETTERS = ["A", "B", "C", "D", "E"];
export type NetQuestion =
  /** Four shapes A to D, one a net; the look-alikes among the others. */
  | { level: 1 | 2; shapes: Cell[][]; right: number; lookalikes: number[] }
  /** A net, a face marked ★ and the others lettered A to E in reading order; which is opposite ★. */
  | { level: 3; net: Cell[]; star: number; right: number; beside: number[] };

/**
 * Which of four folds into a cube (easy: a net with a row of four, against one look-alike and two with a block;
 * medium: a net without a row of four, against three look-alikes); or, hard, which face is opposite ★.
 */
export function netQuestion(level: NetLevel, next: () => number): NetQuestion {
  const k = kinds();
  if (level === 3) {
    const net = pickFrom([...k.rowNets, ...k.otherNets], next);
    const star = Math.floor(next() * 6);
    const f = fold(net);
    const opp = f.indexOf(f[star] ^ 1);
    const letter = (i: number) => (i < star ? i : i - 1);
    return { level, net, star, right: letter(opp), beside: net.flatMap((c, i) => (i !== star && touching(c, net[star]) ? [letter(i)] : [])) };
  }
  for (;;) {
    const right = pickFrom(level === 1 ? k.rowNets : k.otherNets, next);
    const wrong = level === 1 ? [pickFrom(k.lookalikes, next), pickFrom(k.blocks, next), pickFrom(k.blocks, next)] : [pickFrom(k.lookalikes, next), pickFrom(k.lookalikes, next), pickFrom(k.lookalikes, next)];
    const shapes = [right, ...wrong].map((s) => [next(), s] as const).sort((a, b) => a[0] - b[0]).map(([, s]) => s);
    // Four different shapes, none too long to draw.
    if (new Set(shapes.map(freeKey)).size < 4 || shapes.some((s) => Math.max(...s.flat()) > 4)) continue;
    return { level, shapes, right: shapes.indexOf(right), lookalikes: shapes.flatMap((s, i) => (!isNet(s) && !hasBlock(s) ? [i] : [])) };
  }
}
/** The options to pick from: the letters of the shapes, or of the faces. */
export const netOptions = (q: NetQuestion) => LETTERS.slice(0, q.level === 3 ? 5 : 4).map((l) => ({ text: l, plain: l, tex: `\\text{${l}}` }));
/** The working: which shapes leave a face open, or the faces that are opposite. */
export function netSteps(q: NetQuestion): string[] {
  if (q.level < 3) {
    const no = LETTERS.slice(0, 4).filter((_, i) => i !== q.right);
    return [`\\text{${no.join(", ")}} \\; \\times, \\quad \\text{${LETTERS[q.right]}} \\; \\checkmark`];
  }
  return [`\\bigstar \\leftrightarrow \\text{${LETTERS[q.right]}}`];
}

// ---------- pictures ----------

/** Colours of the three pairs of opposite faces. */
export const PAIR_FILL = ["#ffc9c9", "#b2f2bb", "#a5d8ff"];
/** A shape as SVG squares of side `s` from (x, y): `fills` per square (default white), with `labels` in them. */
export function cellsSvg(cells: Cell[], x: number, y: number, s: number, fills: string[] = [], labels: string[] = []): string {
  return cells
    .map(([cx, cy], i) => {
      const [px, py] = [x + cx * s, y + cy * s];
      const label = labels[i] ? `<text x="${px + s / 2}" y="${py + s / 2 + s * 0.17}" font-size="${Math.round(s * 0.48)}" font-weight="700" text-anchor="middle" fill="#1e1e1e">${labels[i]}</text>` : "";
      return `<rect x="${px}" y="${py}" width="${s}" height="${s}" fill="${fills[i] ?? "#ffffff"}" stroke="#1e1e1e" stroke-width="2"/>${label}`;
    })
    .join("");
}
/** Fills for a net's squares: its opposite faces the same colour. */
export const pairFills = (cells: Cell[]) => fold(cells).map((f) => PAIR_FILL[f >> 1]);
const BOX = 130;
/** The question's picture: four shapes in boxes lettered A to D, or the net with ★ and its letters. An SVG body. */
export function netSvg(q: NetQuestion, solved = false): { body: string; w: number; h: number } {
  if (q.level === 3) {
    const s = 44;
    const labels = q.net.map((_, i) => (i === q.star ? "★" : LETTERS[i < q.star ? i : i - 1]));
    const fills = solved ? pairFills(q.net) : q.net.map((_, i) => (i === q.star ? "#ffec99" : "#ffffff"));
    const [w, h] = [Math.max(...q.net.map((c) => c[0])) + 1, Math.max(...q.net.map((c) => c[1])) + 1];
    return { body: cellsSvg(q.net, 4, 4, s, fills, labels), w: w * s + 8, h: h * s + 8 };
  }
  const s = 20;
  const body = q.shapes
    .map((cells, i) => {
      const [bx, by] = [(i % 2) * (BOX + 16), Math.floor(i / 2) * (BOX + 34)];
      const [w, h] = [Math.max(...cells.map((c) => c[0])) + 1, Math.max(...cells.map((c) => c[1])) + 1];
      const fills = solved && i === q.right ? pairFills(cells) : [];
      return `<text x="${bx + 4}" y="${by + 22}" font-size="20" font-weight="700" fill="#1e1e1e">${LETTERS[i]}</text>${cellsSvg(cells, bx + (BOX - w * s) / 2, by + 30 + (BOX - 20 - h * s) / 2, s, fills)}`;
    })
    .join("");
  return { body, w: 2 * BOX + 16, h: 2 * (BOX + 34) - 34 + 30 };
}

// ---------- the board's game ----------

export const NET_LADDER: { level: NetLevel; seed: number }[] = [
  { level: 1, seed: 1001 },
  { level: 1, seed: 1002 },
  { level: 1, seed: 1003 },
  { level: 2, seed: 1011 },
  { level: 2, seed: 1012 },
  { level: 2, seed: 1013 },
  { level: 3, seed: 1021 },
  { level: 3, seed: 1022 },
  { level: 3, seed: 1023 },
];
/**
 * A board: easy and medium, six shapes to sort (easy, three nets with a row of four, a look-alike and two with a
 * block; medium, two to four nets, at least one without a row of four, and look-alikes); hard, one net to pair the
 * faces of.
 */
export type NetBoard = { level: 1 | 2; shapes: Cell[][] } | { level: 3; net: Cell[] };
export function netBoard(level: NetLevel, next: () => number): NetBoard {
  const k = kinds();
  if (level === 3) return { level, net: pickFrom([...k.rowNets, ...k.otherNets], next) };
  for (;;) {
    const nets = level === 1 ? 3 : 2 + Math.floor(next() * 3);
    const shapes =
      level === 1
        ? [...Array.from({ length: 3 }, () => pickFrom(k.rowNets, next)), pickFrom(k.lookalikes, next), pickFrom(k.blocks, next), pickFrom(k.blocks, next)]
        : [pickFrom(k.otherNets, next), ...Array.from({ length: nets - 1 }, () => pickFrom([...k.rowNets, ...k.otherNets], next)), ...Array.from({ length: 6 - nets }, () => pickFrom(k.lookalikes, next))];
    if (new Set(shapes.map(freeKey)).size < 6) continue;
    return { level, shapes: shapes.map((s) => [next(), s] as const).sort((a, b) => a[0] - b[0]).map(([, s]) => s) };
  }
}
/** Stars: no misses three, one two, more one. */
export const netStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
export type NetNotice = "clean" | "noRow" | "opposites" | "streak10";
export const NET_NOTICES: NetNotice[] = ["clean", "noRow", "opposites", "streak10"];
/** What a board done with no misses shows: the nets sorted, one without a row of four among them, the faces paired; ten in a row. */
export function netNotice(b: NetBoard, misses: number, streak: number): NetNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (b.level === 3) return "opposites";
  return b.shapes.some((s) => isNet(s) && !hasRow4(s)) ? "noRow" : "clean";
}
export type LiveCubeNet = {
  mode: "puzzle" | "endless";
  stage: number;
  level: NetLevel;
  seed: number;
  /** Easy and medium: the shapes chosen, and whether the last check is showing. Hard: the squares paired so far. */
  chosen: number[];
  checked: boolean;
  misses: number;
  done: boolean;
  streak: number;
  said: { kind: "notice"; key: NetNotice } | { kind: "wrong"; extra: number; missing: number } | { kind: "notOpposite"; cell: number } | null;
};
export function netNow(d: Pick<LiveCubeNet, "mode" | "stage" | "level" | "seed">): NetBoard {
  const [level, seed] = d.mode === "puzzle" ? [NET_LADDER[d.stage].level, NET_LADDER[d.stage].seed] : [d.level, d.seed];
  return netBoard(level, rng(seed));
}

/** The worked solution: the net with its opposite faces coloured alike, and the working beneath. */
export type NetSolution = { q: NetQuestion };
export function renderNet(spec: NetSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(netSvg(spec.q, true), steps);
}
