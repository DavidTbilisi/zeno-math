// Join up: number tiles on a grid of four by four, slid all together up, down, left or right; two tiles pushed
// against each other join when they belong together. In the sums game two tiles join into their sum while it is no
// more than the target (3 and 4 make 7), and a pair that makes the target exactly (7 and 3 for 10) is cleared and
// counted; in the products game two tiles join into their product while it still divides the target (2 and 3 make 6),
// and a pair that makes it (4 and 6 for 24) is cleared. Tiles that do not belong together (9 and 8 for 10; 4 and 4
// for 24) only block each other. A new tile comes after every slide that moved something, and the round ends when the
// target has been made often enough (three stars) or no slide moves anything: two stars if it was made often enough
// to pass, else one. So the bonds of a number, or its factor pairs, are looked for again and again, and a tile is
// kept beside what it still needs. A round is its seed and the slides made, so it is replayed from those alone and
// one step back on the board takes one slide back.
import { rng } from "./random";
import type { EndlessGame, GameLevel } from "./ladder";

export const JOIN_N = 4;
export type Dir = "L" | "R" | "U" | "D";
export const DIRS: readonly Dir[] = ["L", "R", "U", "D"];
export type JoinKind = "sum" | "product";
/** A round: the target, the tiles that come (one listed twice comes twice as often), and how often the target must be made to pass and to finish. */
export type JoinSpec = { kind: JoinKind; target: number; tiles: number[]; pass: number; full: number };
export type Grid = (number | null)[];

/** What two tiles pushed together become: their sum or product, if they belong together; else null. */
export function joinOf(spec: Pick<JoinSpec, "kind" | "target">, a: number, b: number): number | null {
  const v = spec.kind === "sum" ? a + b : a * b;
  return spec.kind === "sum" ? (v <= spec.target ? v : null) : spec.target % v === 0 ? v : null;
}

/** The cells of each line of the grid, from the edge the tiles are pushed against. */
function lines(dir: Dir): number[][] {
  return Array.from({ length: JOIN_N }, (_, i) =>
    Array.from({ length: JOIN_N }, (_, k) => {
      const j = dir === "L" || dir === "U" ? k : JOIN_N - 1 - k;
      return dir === "L" || dir === "R" ? i * JOIN_N + j : j * JOIN_N + i;
    }),
  );
}
/** A pair joined in a slide: the two tiles, what they became, and whether that is the target (so they were cleared). */
export type Joined = { a: number; b: number; v: number; made: boolean };
/**
 * One slide: every tile goes as far as it can, and of two that meet the pair nearer the edge joins first, a tile
 * joining once in a slide. A pair that makes the target is cleared and the tiles behind close up.
 */
export function slide(grid: Grid, dir: Dir, spec: Pick<JoinSpec, "kind" | "target">): { grid: Grid; joined: Joined[]; moved: boolean } {
  const out: Grid = Array<number | null>(JOIN_N * JOIN_N).fill(null);
  const joined: Joined[] = [];
  for (const line of lines(dir)) {
    const tiles = line.map((c) => grid[c]).filter((x): x is number => x !== null);
    const next: number[] = [];
    for (let i = 0; i < tiles.length; i++) {
      const v = i + 1 < tiles.length ? joinOf(spec, tiles[i], tiles[i + 1]) : null;
      if (v === null) next.push(tiles[i]);
      else {
        joined.push({ a: tiles[i], b: tiles[i + 1], v, made: v === spec.target });
        if (v !== spec.target) next.push(v);
        i++;
      }
    }
    next.forEach((v, k) => (out[line[k]] = v));
  }
  return { grid: out, joined, moved: out.some((v, c) => v !== grid[c]) };
}
/** No slide moves anything. */
export const stuck = (grid: Grid, spec: Pick<JoinSpec, "kind" | "target">) => DIRS.every((d) => !slide(grid, d, spec).moved);

/** A new tile in an empty cell, both drawn at random. */
function drop(grid: Grid, spec: JoinSpec, next: () => number): { grid: Grid; at: number } {
  const empty = grid.flatMap((v, c) => (v === null ? [c] : []));
  if (!empty.length) return { grid, at: -1 };
  const at = empty[Math.floor(next() * empty.length)];
  const v = spec.tiles[Math.floor(next() * spec.tiles.length)];
  return { grid: grid.map((x, c) => (c === at ? v : x)), at };
}

export type Round = {
  grid: Grid;
  /** How often the target has been made, and the slides that moved something. */
  made: number;
  moves: number;
  /** What the last slide joined, and where the new tile came (-1: none). */
  last: Joined[];
  fresh: number;
  /** The most the target was made in one slide, and the fewest cells left empty after a new tile came. */
  most: number;
  least: number;
  /** Over: made often enough, or stuck. */
  full: boolean;
  stuck: boolean;
};
/** The round from its seed and its slides (a slide that moves nothing is passed over, as is any after the end). */
export function play(spec: JoinSpec, seed: number, slides: string): Round {
  const next = rng(seed);
  let grid: Grid = Array<number | null>(JOIN_N * JOIN_N).fill(null);
  for (let i = 0; i < 3; i++) grid = drop(grid, spec, next).grid;
  const r: Round = { grid, made: 0, moves: 0, last: [], fresh: -1, most: 0, least: JOIN_N * JOIN_N - 3, full: false, stuck: stuck(grid, spec) };
  for (const d of slides) {
    if (r.full || r.stuck || !DIRS.includes(d as Dir)) break;
    const s = slide(r.grid, d as Dir, spec);
    if (!s.moved) continue;
    const made = s.joined.filter((j) => j.made).length;
    const dropped = drop(s.grid, spec, next);
    r.grid = dropped.grid;
    r.fresh = dropped.at;
    r.last = s.joined;
    r.moves++;
    r.made += made;
    r.most = Math.max(r.most, made);
    r.least = Math.min(r.least, r.grid.filter((v) => v === null).length);
    r.full = r.made >= spec.full;
    r.stuck = !r.full && stuck(r.grid, spec);
  }
  return r;
}
/** Whether a slide would move anything now. */
export const canSlide = (spec: JoinSpec, r: Round, d: Dir) => !r.full && !r.stuck && slide(r.grid, d, spec).moved;

/** Stars: the target made often enough to finish three, to pass two, else one. */
export const joinStars = (spec: JoinSpec, made: number) => (made >= spec.full ? 3 : made >= spec.pass ? 2 : 1);

// ---------- the board's games ----------

export type JoinDeck = "sum" | "product";
export const JOIN_PIECES = { sum: "joinSum", product: "joinProduct" } as const;
const upTo = (a: number, b: number, k = 1) => Array.from({ length: Math.floor((b - a) / k) + 1 }, (_, i) => a + i * k);
const sum = (target: number, tiles: number[], pass: number, full: number): JoinSpec => ({ kind: "sum", target, tiles, pass, full });
const product = (target: number, tiles: number[], pass: number, full: number): JoinSpec => ({ kind: "product", target, tiles, pass, full });
/**
 * Easy to hard. Sums: 10 from small tiles, then from any; 20; 100 in tens and in fives; 20 from any tile. Products:
 * 12, 24, 36 and on to 144, from their factors. The goals and the seeds were set with the player at the foot of this
 * file: it finishes each round, and sliding at random seldom passes one after the first.
 */
export const JOIN_LADDERS: Record<JoinDeck, { spec: JoinSpec; seed: number }[]> = {
  sum: [
    { spec: sum(10, upTo(1, 5), 8, 12), seed: 6000 },
    { spec: sum(10, upTo(1, 7), 8, 12), seed: 6002 },
    { spec: sum(10, upTo(1, 9), 4, 6), seed: 6004 },
    { spec: sum(20, upTo(1, 10), 8, 12), seed: 6001 },
    { spec: sum(20, upTo(1, 14), 3, 5), seed: 6019 },
    { spec: sum(100, upTo(10, 90, 10), 4, 6), seed: 6004 },
    { spec: sum(100, upTo(5, 50, 5), 8, 12), seed: 6001 },
    { spec: sum(100, upTo(5, 70, 5), 3, 5), seed: 6019 },
    { spec: sum(20, upTo(1, 19), 3, 4), seed: 6006 },
  ],
  product: [
    { spec: product(12, [2, 2, 3, 3, 4, 6], 8, 12), seed: 6000 },
    { spec: product(24, [2, 2, 3, 3, 4, 6, 8, 12], 8, 12), seed: 6017 },
    { spec: product(36, [2, 2, 3, 3, 4, 6, 9, 12, 18], 8, 12), seed: 6008 },
    { spec: product(48, [2, 2, 3, 4, 6, 8, 12, 16, 24], 6, 10), seed: 6004 },
    { spec: product(60, [2, 2, 3, 5, 4, 6, 10, 12, 15, 20, 30], 5, 7), seed: 6000 },
    { spec: product(72, [2, 2, 3, 3, 4, 6, 8, 9, 12, 18, 24, 36], 6, 10), seed: 6020 },
    { spec: product(100, [2, 2, 5, 5, 4, 10, 20, 25, 50], 8, 12), seed: 6007 },
    { spec: product(120, [2, 2, 3, 5, 4, 6, 8, 10, 12, 15, 20, 24, 30, 40, 60], 4, 6), seed: 6002 },
    { spec: product(144, [2, 2, 3, 3, 4, 6, 8, 9, 12, 16, 18, 24, 36, 48, 72], 5, 7), seed: 6002 },
  ],
};
export const JOIN_LEVELS: Record<JoinDeck, Record<GameLevel, JoinSpec>> = {
  sum: { 1: sum(10, upTo(1, 7), 5, 8), 2: sum(20, upTo(1, 10), 5, 8), 3: sum(100, upTo(5, 50, 5), 5, 8) },
  product: { 1: product(24, [2, 2, 3, 3, 4, 6, 8, 12], 5, 8), 2: product(36, [2, 2, 3, 3, 4, 6, 9, 12, 18], 5, 8), 3: product(100, [2, 2, 5, 5, 4, 10, 20, 25, 50], 5, 8) },
};

export type JoinNotice = "double" | "swift" | "roomy" | "streak10";
export const JOIN_NOTICES: JoinNotice[] = ["double", "swift", "roomy", "streak10"];
/** What a round finished shows: done in four slides a target at most, or with five cells or more always empty. */
export const finishNotice = (spec: JoinSpec, r: Round, streak: number): JoinNotice | null =>
  !r.full ? null : r.moves <= 4 * spec.full ? "swift" : r.least >= 5 ? "roomy" : streak === 10 ? "streak10" : null;

export type LiveJoin = EndlessGame<JoinNotice, GameLevel> & {
  deck: JoinDeck;
  /** The slides made, one letter each (L, R, U, D). */
  slides: string;
  done: boolean;
};
export const joinStart = (deck: JoinDeck): LiveJoin => ({ deck, mode: "puzzle", stage: 0, level: 1, seed: 1, slides: "", done: false, streak: 0, said: null });
/** The round of a puzzle or of the endless run. */
export const joinNow = (d: Pick<LiveJoin, "deck" | "mode" | "stage" | "level" | "seed">): { spec: JoinSpec; seed: number } =>
  d.mode === "puzzle" ? JOIN_LADDERS[d.deck][d.stage] : { spec: JOIN_LEVELS[d.deck][d.level], seed: d.seed };
/** A pair joined, written out: 7 + 3 = 10, 4 × 6 = 24. */
export const joinText = (spec: Pick<JoinSpec, "kind">, j: Joined) => `${j.a} ${spec.kind === "sum" ? "+" : "×"} ${j.b} = ${j.v}`;
/** What a tile still needs to make the target: 3 for a 7 and 10, 4 for a 6 and 24. */
export const needs = (spec: Pick<JoinSpec, "kind" | "target">, v: number) => (spec.kind === "sum" ? spec.target - v : spec.target / v);

/** A player for the tests and for setting the goals: the slide that makes the target most, then leaves most cells empty, looking one slide further on. */
export function botSlide(spec: JoinSpec, grid: Grid): Dir | null {
  const worth = (g: Grid, depth: number): number => {
    let best = -1;
    for (const d of DIRS) {
      const s = slide(g, d, spec);
      if (!s.moved) continue;
      const here = 100 * s.joined.filter((j) => j.made).length + s.grid.filter((v) => v === null).length;
      best = Math.max(best, here + (depth ? Math.max(0, worth(s.grid, depth - 1)) * 0.5 : 0));
    }
    return best;
  };
  let pick: Dir | null = null;
  let top = -1;
  for (const d of DIRS) {
    const s = slide(grid, d, spec);
    if (!s.moved) continue;
    const v = 100 * s.joined.filter((j) => j.made).length + s.grid.filter((x) => x === null).length + 0.5 * Math.max(0, worth(s.grid, 1));
    if (v > top) [top, pick] = [v, d];
  }
  return pick;
}
