// Tile it: which shapes cover a floor with no gaps and no overlaps, found by putting them round a point before it is
// told. Easy lays copies of one regular polygon round a point, one at a time, and asks whether it tiles: only when its
// angle goes into 360° exactly (triangles 60°, squares 90°, hexagons 120°); a pentagon's three leave a gap of 36° and a
// fourth overlaps. Medium mixes them: polygons are already at the point, and the gap is filled from a palette (triangle,
// square, hexagon, octagon, twelve-gon) until the angles make 360° exactly. Hard is the tangram: the seven pieces cut
// from a square, turned a quarter at a time, flipped and moved on a grid, to make an outline. Each piece and outline is
// a set of quarter cells (each grid square cut by its diagonals into four triangles), so a shape is made exactly when
// the pieces cover the outline's quarters, each once.
import type { EndlessGame, GameLevel, TryGame } from "./ladder";
import { rng } from "./random";

// ---------- regular polygons round a point ----------

export type Sides = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12;
/** The polygons easy asks about, and the ones medium's palette offers. */
export const EASY_SIDES: readonly Sides[] = [3, 4, 5, 6, 7, 8, 9, 10, 12];
export const PALETTE: readonly Sides[] = [3, 4, 6, 8, 12];
/** A regular polygon's angle, in degrees: 180° − 360°/n. */
export const angleOf = (n: number) => 180 - 360 / n;
const EPS = 1e-9;
/** An angle to one place, without a trailing .0: 108, 128.6. */
export const degText = (v: number) => `${Math.round(v * 10) / 10}°`;
/** Whether copies of one regular polygon fill the space round a point: its angle goes into 360° a whole number of times. */
export const tilesAlone = (n: number) => Math.abs(360 / angleOf(n) - Math.round(360 / angleOf(n))) < EPS;
/** How many copies fit round a point without overlapping, and the gap they leave. */
export function aroundPoint(n: number): { fit: number; gap: number } {
  const a = angleOf(n);
  const fit = Math.floor(360 / a + EPS);
  return { fit, gap: Math.max(0, 360 - fit * a) };
}
export const sumOf = (ns: readonly number[]) => ns.reduce((s, n) => s + angleOf(n), 0);
/** Where a sum stands against a full turn: short of it, exactly it, or past it. */
export const fullness = (sum: number): "gap" | "full" | "over" => (Math.abs(sum - 360) < EPS ? "full" : sum < 360 ? "gap" : "over");

/**
 * A regular polygon with one corner at the origin and its two sides there at angles `from` and `from` + its angle
 * (degrees, anticlockwise from the right), sides `s` long: its corners in order, the origin first, y up.
 */
export function polygonAt(n: number, from: number, s: number): [number, number][] {
  const out: [number, number][] = [[0, 0]];
  let [x, y, dir] = [0, 0, from];
  for (let i = 1; i < n; i++) {
    x += s * Math.cos((dir * Math.PI) / 180);
    y += s * Math.sin((dir * Math.PI) / 180);
    out.push([x, y]);
    dir += 360 / n;
  }
  return out;
}
/** How far a regular polygon of side 1 reaches from the corner it is put by: its farthest corner. */
export const reachOf = (n: number) => Math.max(...polygonAt(n, 0, 1).map(([x, y]) => Math.hypot(x, y)));

/** Every way to fill a point with polygons from the palette, two kinds or more, as sorted lists of sides. */
export const VERTEX_FILLS: readonly Sides[][] = (() => {
  const out: Sides[][] = [];
  const grow = (from: number, ns: Sides[], sum: number) => {
    if (Math.abs(sum - 360) < EPS) {
      if (new Set(ns).size > 1) out.push(ns);
      return;
    }
    for (let i = from; i < PALETTE.length; i++) if (sum + angleOf(PALETTE[i]) <= 360 + EPS) grow(i, [...ns, PALETTE[i]], sum + angleOf(PALETTE[i]));
  };
  grow(0, [], 0);
  return out;
})();

// ---------- the tangram ----------

/** The seven pieces: two large triangles, a medium one, two small ones, a square and a parallelogram. */
export type PieceKind = "large" | "medium" | "small" | "square" | "para";
export const TANGRAM: readonly PieceKind[] = ["large", "large", "medium", "small", "small", "square", "para"];
export type Pt = [number, number];
/** Each piece unturned, on a grid where the whole square is 4 by 4; y grows downwards, as on the screen. */
export const PIECE_SHAPES: Record<PieceKind, Pt[]> = {
  large: [[0, 0], [4, 0], [2, 2]],
  medium: [[0, 0], [2, 0], [0, 2]],
  small: [[0, 0], [2, 0], [1, 1]],
  square: [[1, 0], [2, 1], [1, 2], [0, 1]],
  para: [[0, 0], [2, 0], [3, 1], [1, 1]],
};
/** A piece on the grid: its corner of least x and y at (x, y), turned a quarter `rot` times, flipped first if `flip`. */
export type Placed = { kind: PieceKind; x: number; y: number; rot: number; flip: boolean };

/** A piece's corners turned and flipped, moved so its least x and y are 0. */
export function orient(kind: PieceKind, rot: number, flip: boolean): Pt[] {
  let pts = PIECE_SHAPES[kind].map(([x, y]): Pt => (flip ? [-x, y] : [x, y]));
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) pts = pts.map(([x, y]): Pt => [-y, x]);
  const [mx, my] = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))];
  // + 0 turns −0 into 0, so the corners compare and print plainly.
  return pts.map(([x, y]): Pt => [x - mx + 0, y - my + 0]);
}
export const cornersOf = (p: Placed): Pt[] => orient(p.kind, p.rot, p.flip).map(([x, y]): Pt => [x + p.x, y + p.y]);
/** Width and height of a piece as it is turned. */
export function sizeOf(kind: PieceKind, rot: number): Pt {
  const pts = orient(kind, rot, false);
  return [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

/** A quarter cell: the square (x, y) to (x + 1, y + 1) and which of its four triangles (0 top, 1 right, 2 bottom, 3 left). */
export const quarterKey = (x: number, y: number, q: number) => `${x},${y},${q}`;
const CENTROID: Pt[] = [[0.5, 1 / 6], [5 / 6, 0.5], [0.5, 5 / 6], [1 / 6, 0.5]];
function inside([px, py]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [[xi, yi], [xj, yj]] = [poly[i], poly[j]];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
/** The quarter cells a polygon with whole-number corners and sides along the grid or its diagonals covers. */
export function quartersOf(poly: Pt[]): string[] {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const out: string[] = [];
  for (let x = Math.min(...xs); x < Math.max(...xs); x++)
    for (let y = Math.min(...ys); y < Math.max(...ys); y++)
      for (let q = 0; q < 4; q++) if (inside([x + CENTROID[q][0], y + CENTROID[q][1]], poly)) out.push(quarterKey(x, y, q));
  return out;
}
export const quartersOfPlaced = (p: Placed) => quartersOf(cornersOf(p));

/** How the pieces lie on an outline: the quarters covered twice or more, the quarters outside it, and whether it is made. */
export function coverOf(pieces: readonly Placed[], target: ReadonlySet<string>) {
  const count = new Map<string, number>();
  for (const p of pieces) for (const k of quartersOfPlaced(p)) count.set(k, (count.get(k) ?? 0) + 1);
  const twice = [...count].filter(([, c]) => c > 1).map(([k]) => k);
  const outside = [...count.keys()].filter((k) => !target.has(k));
  const covered = [...target].filter((k) => count.has(k)).length;
  return { twice, outside, covered, made: twice.length === 0 && outside.length === 0 && covered === target.size };
}
/** Two quarter cells side by side: in one square across a diagonal, or across a grid line in squares next to each other. */
export function neighbours(key: string): string[] {
  const [x, y, q] = key.split(",").map(Number);
  const across: Record<number, [number, number, number]> = { 0: [x, y - 1, 2], 1: [x + 1, y, 3], 2: [x, y + 1, 0], 3: [x - 1, y, 1] };
  return [quarterKey(x, y, (q + 1) % 4), quarterKey(x, y, (q + 3) % 4), quarterKey(...across[q])];
}

/** The tray: where each piece waits unturned, packed in rows to the right of the outline. */
export const BOARD = { cols: 19, rows: 10, trayFrom: 10 } as const;
export function trayOf(kinds: readonly PieceKind[]): Placed[] {
  const out: Placed[] = [];
  let [x, y, rowH] = [BOARD.trayFrom, 0, 0];
  for (const kind of kinds) {
    const [w, h] = sizeOf(kind, 0);
    if (x + w > BOARD.cols) [x, y, rowH] = [BOARD.trayFrom, y + rowH + 1, 0];
    out.push({ kind, x, y, rot: 0, flip: false });
    x += w + 1;
    rowH = Math.max(rowH, h);
  }
  return out;
}

/** An outline made from pieces laid by a solution, moved to sit in the middle of the left of the board. */
export function outlineOf(solution: readonly Placed[]): { target: string[]; solution: Placed[] } {
  const all = solution.flatMap(cornersOf);
  const [x0, y0] = [Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1]))];
  const [w, h] = [Math.max(...all.map((p) => p[0])) - x0, Math.max(...all.map((p) => p[1])) - y0];
  const [dx, dy] = [Math.floor((BOARD.trayFrom - 1 - w) / 2) - x0, Math.floor((BOARD.rows - h) / 2) - y0];
  const moved = solution.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
  return { target: moved.flatMap(quartersOfPlaced).sort(), solution: moved };
}

/**
 * A random outline from some of the pieces: each laid turned and flipped at random against the ones before, never on
 * them, sharing a side of a grid square or more, until the outline fits left of the tray.
 */
export function randomOutline(count: number, next: () => number): { kinds: PieceKind[]; target: string[]; solution: Placed[] } {
  const bag = [...TANGRAM];
  const kinds: PieceKind[] = [];
  for (let i = 0; i < count; i++) kinds.push(bag.splice(Math.floor(next() * bag.length), 1)[0]);
  // The large pieces first, so the small ones fill in round them.
  const order = ["large", "medium", "square", "para", "small"];
  kinds.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  for (;;) {
    const laid: Placed[] = [];
    const used = new Set<string>();
    for (const kind of kinds) {
      for (let tries = 0; tries < 400; tries++) {
        const p: Placed = { kind, rot: Math.floor(next() * 4), flip: kind === "para" && next() < 0.5, x: 20 + Math.floor(next() * 9) - 4, y: 20 + Math.floor(next() * 9) - 4 };
        const qs = quartersOfPlaced(p);
        if (qs.some((k) => used.has(k))) continue;
        const touching = laid.length === 0 ? 2 : qs.filter((k) => neighbours(k).some((n) => used.has(n))).length;
        if (touching < 2) continue;
        laid.push(p);
        qs.forEach((k) => used.add(k));
        break;
      }
    }
    if (laid.length < kinds.length) continue;
    const all = laid.flatMap(cornersOf);
    const w = Math.max(...all.map((p) => p[0])) - Math.min(...all.map((p) => p[0]));
    const h = Math.max(...all.map((p) => p[1])) - Math.min(...all.map((p) => p[1]));
    if (w > BOARD.trayFrom - 1 || h > BOARD.rows - 1) continue;
    return { kinds, ...outlineOf(laid) };
  }
}

// ---------- the tasks ----------

export type AloneTask = { level: 1; n: Sides };
export type FillTask = { level: 2; given: Sides[] };
export type ShapeTask = { level: 3; name: OutlineName; kinds: PieceKind[]; target: string[] };
export type TessellateTask = AloneTask | FillTask | ShapeTask;
/** What an outline is called: three made in the ladder, and any other shape from the endless run. */
export type OutlineName = "triangle" | "square" | "bigSquare" | "shape";

const place = (kind: PieceKind, x: number, y: number, rot = 0, flip = false): Placed => ({ kind, x, y, rot, flip });
/** The seven pieces in their square: the classic solution, unturned but for the second large triangle and the small ones. */
export const SQUARE_SOLUTION: Placed[] = [
  place("large", 0, 0),
  place("large", 0, 0, 3),
  place("medium", 2, 2, 2),
  place("para", 3, 0, 1),
  place("small", 2, 1, 1),
  place("square", 1, 2),
  place("small", 0, 3, 2),
];
const shape = (name: OutlineName, solution: Placed[]): ShapeTask => ({ level: 3, name, kinds: solution.map((p) => p.kind), target: outlineOf(solution).target });

export function tessellateTask(level: GameLevel, next: () => number): TessellateTask {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
  if (level === 1) return { level, n: pick(EASY_SIDES) };
  if (level === 2) {
    const fill = pick(VERTEX_FILLS.filter((f) => f.length >= 3));
    const order = [...fill];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return { level, given: order.slice(0, Math.max(1, order.length - 2 - Math.floor(next() * 2))) };
  }
  const { kinds, target } = randomOutline(3 + Math.floor(next() * 3), next);
  return { level, name: "shape", kinds, target };
}

// ---------- the board's game ----------

/** Nine puzzles: squares, pentagons and hexagons alone; three points to fill; two small triangles, three pieces, all seven in their square. */
export const TESSELLATE_LADDER: TessellateTask[] = [
  { level: 1, n: 4 },
  { level: 1, n: 5 },
  { level: 1, n: 6 },
  { level: 2, given: [8] },
  { level: 2, given: [12] },
  { level: 2, given: [6, 4] },
  shape("triangle", [place("small", 0, 0), place("small", 0, 0, 3)]),
  shape("square", [place("medium", 0, 0), place("small", 1, 0, 1), place("small", 0, 1, 2)]),
  shape("bigSquare", SQUARE_SOLUTION),
];
export const tessellateStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

export type TessellateNotice = "threeAlone" | "fullTurn" | "sameArea" | "streak10";
export const TESSELLATE_NOTICES: TessellateNotice[] = ["threeAlone", "fullTurn", "sameArea", "streak10"];
export function tessellateNotice(t: TessellateTask, misses: number, streak: number): TessellateNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  return t.level === 1 ? "threeAlone" : t.level === 2 ? "fullTurn" : "sameArea";
}

export type TessellateSaid =
  /** Easy: a claim that it tiles, or that it doesn't, which was wrong. */
  | { kind: "claim"; tiles: boolean }
  /** Medium: a polygon that would go past 360°. */
  | { kind: "over"; n: Sides };
export type LiveTessellate = EndlessGame<TessellateNotice, GameLevel, TessellateSaid> &
  TryGame & {
    /** Easy: how many copies are round the point. */
    count: number;
    /** Medium: the polygons put in the gap, in order. */
    added: Sides[];
    /** Hard: where each piece is, in the task's order of pieces; empty before the first move (the tray). */
    pieces: Placed[];
    /** Hard: the piece picked to turn, flip or move with the keys. */
    picked: number | null;
  };
export const tessellateNow = (d: Pick<LiveTessellate, "mode" | "stage" | "level" | "seed">): TessellateTask =>
  d.mode === "puzzle" ? TESSELLATE_LADDER[d.stage] : tessellateTask(d.level, rng(d.seed));
/** The pieces as they lie: the tray until the first move. */
export const piecesNow = (t: ShapeTask, pieces: readonly Placed[]): Placed[] => (pieces.length === t.kinds.length ? [...pieces] : trayOf(t.kinds));
