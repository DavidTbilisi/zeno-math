// Sort the shapes: two overlapping rings, each asking one thing of a shape (four sides; all sides equal; four right
// angles; two pairs of parallel sides…), and a row of shapes to put where they belong: in one ring, in both, or
// outside. The shapes in both rings are the ones with both properties, which is how a square turns out to be a
// rectangle and a rhombus at once. Whether a shape has a property is read from its points (src/math/shapeKinds.ts),
// so a square turned on its corner still goes with the squares.
import type { EndlessGame } from "./ladder";
import { rngOf } from "./practiceKit";
import { marks, polygon, quad, triangleAngles, triangleOf, turn, type Pt } from "./shapeKinds";

export type SortLevel = 1 | 2 | 3;
export type Ring = "fourSides" | "allEqual" | "fourRight" | "twoParallel" | "aRight";
export type Region = "a" | "b" | "both" | "out";
export type SortShape = { pts: Pt[] };

/** What each ring asks of a shape. */
export const RING_TEST: Record<Ring, (pts: Pt[]) => boolean> = {
  fourSides: (p) => p.length === 4,
  allEqual: (p) => marks(p).equal.some((g) => g.length === p.length),
  fourRight: (p) => p.length === 4 && marks(p).right.length === 4,
  twoParallel: (p) => marks(p).parallel.length >= 2,
  aRight: (p) => marks(p).right.length >= 1,
};
/** The two rings of each level. */
export const RINGS: Record<SortLevel, [Ring, Ring]> = { 1: ["fourSides", "allEqual"], 2: ["fourRight", "allEqual"], 3: ["twoParallel", "aRight"] };

/** Where a shape belongs among the two rings. */
export function regionOf(pts: Pt[], [a, b]: [Ring, Ring]): Region {
  const [x, y] = [RING_TEST[a](pts), RING_TEST[b](pts)];
  return x && y ? "both" : x ? "a" : y ? "b" : "out";
}

/** The shapes a level draws from, made fresh from the seed; at least one goes in each place. */
export function sortBoard(level: SortLevel, seed: number): SortShape[] {
  const r = rngOf(seed);
  const tri = (k: Parameters<typeof triangleAngles>[0]) => {
    const [A, B] = triangleAngles(k, r);
    return triangleOf(A, B);
  };
  const tilt = (p: Pt[]) => turn(p, r.pick([0, 0, 20, 45, -30]));
  const pools: Record<SortLevel, (() => Pt[])[]> = {
    1: [() => quad("square", r), () => quad("rectangle", r), () => tri("equilateral"), () => tilt(quad("rhombus", r)), () => tri("scalene"), () => polygon(6, r), () => polygon(5, r, true), () => quad("kite", r)],
    2: [() => quad("square", r), () => turn(quad("square", r), 45), () => quad("rectangle", r), () => tilt(quad("rhombus", r)), () => quad("parallelogram", r), () => quad("kite", r), () => quad("trapezium", r), () => tri("equilateral")],
    3: [() => tilt(quad("rectangle", r)), () => quad("square", r), () => quad("parallelogram", r), () => tri("right"), () => tilt(quad("rhombus", r)), () => quad("kite", r), () => tri("equilateral"), () => polygon(6, r)],
  };
  const rings = RINGS[level];
  for (;;) {
    const pool = [...pools[level]];
    const picked: SortShape[] = [];
    while (picked.length < 6) picked.push({ pts: pool.splice(r.int(0, pool.length - 1), 1)[0]() });
    const places = new Set(picked.map((s) => regionOf(s.pts, rings)));
    if (places.size === 4) return picked;
  }
}

export const SORT_LADDER: { level: SortLevel; seed: number }[] = [
  { level: 1, seed: 201 },
  { level: 1, seed: 202 },
  { level: 1, seed: 203 },
  { level: 2, seed: 211 },
  { level: 2, seed: 212 },
  { level: 2, seed: 213 },
  { level: 3, seed: 221 },
  { level: 3, seed: 222 },
  { level: 3, seed: 223 },
];
export const sortStars = (misses: number) => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
export type SortNotice = "clean" | "quick" | "bothFirst" | "streak10";
export const SORT_NOTICES: SortNotice[] = ["clean", "quick", "bothFirst", "streak10"];
/**
 * What a sorted board (or a shape put right) shows: ten in a row, the board with no misses in under thirty seconds or
 * with none at all, and a shape that has both properties put in the middle at the first go.
 */
export function sortNotice(done: boolean, misses: number, ms: number, streak: number, both: boolean): SortNotice | null {
  if (streak === 10) return "streak10";
  if (!done) return both && misses === 0 ? "bothFirst" : null;
  if (misses === 0 && ms <= 30000) return "quick";
  if (misses === 0) return "clean";
  return null;
}
export type LiveSort = EndlessGame<SortNotice, SortLevel, { kind: "miss"; i: number; to: Region }> & {
  /** Where each shape has been put, null while it waits in the row; the shape picked up; the misses so far. */
  placed: (Region | null)[];
  picked: number | null;
  misses: number;
};
export const SORT_START: LiveSort = { mode: "puzzle", stage: 0, level: 1, seed: 1, placed: [], picked: null, misses: 0, streak: 0, said: null };
export function sortNow(d: Pick<LiveSort, "mode" | "stage" | "level" | "seed">): { level: SortLevel; shapes: SortShape[]; rings: [Ring, Ring] } {
  const [level, seed] = d.mode === "puzzle" ? [SORT_LADDER[d.stage].level, SORT_LADDER[d.stage].seed] : [d.level, d.seed];
  return { level, shapes: sortBoard(level, seed), rings: RINGS[level] };
}
