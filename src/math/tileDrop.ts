// Tile drop: fraction bars fall toward a wall of three rows, each row one whole long. A tap on a row slides the
// lowest bar still falling into it, laid after the bars already there. A row holding exactly one whole clears; a bar
// that would take a row past one jams (it sticks out past the row's end, red, and keeps falling, to go elsewhere); a
// bar that reaches the wall unplaced is lost. A wave is a run of bars from a seed: groups that make one, their bars
// mixed in with those of up to `open` other groups, so the rows must be kept apart. The fall, the slide and the wall
// are worked out here; the board's piece only draws them.
import { Frac } from "./fraction";
import { rng } from "./random";
import type { EndlessGame, GameLevel } from "./ladder";
import { oneNotice, sumOf, waysToOne, type MakeNotice } from "./makeOne";

/** The stage in SVG units, the wall's rows and where the bars are lost (the wall's top). */
export const TILE_W = 600;
export const ROWS = 3;
export const ROW_X = 90;
export const ROW_W = 420;
export const ROW_H = 50;
export const ROW_GAP = 22;
export const FLOOR = 170;
export const TILE_H = 36;
export const TILE_FLOOR = FLOOR - TILE_H / 2;
export const rowY = (r: number) => FLOOR + 20 + r * (ROW_H + ROW_GAP);
export const TILE_H_ALL = rowY(ROWS) + 6;
const LEAD = 600;

/** A wave: bars with these bottoms; `goal` groups that make one, of `parts` bars each, at most `open` of them under way
 *  at a time; a bar every `gap` ms, each falling for `fall` ms. */
export type TileSpec = { dens: number[]; parts: [number, number]; goal: number; open: 1 | 2 | 3; gap: number; fall: number };
export type TileDrop = { f: Frac; at: number; group: number };

export function tileWave(spec: TileSpec, next: () => number): TileDrop[] {
  const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  const ways = waysToOne(spec.dens, spec.parts);
  const groups = Array.from({ length: spec.goal }, () => {
    const way = [...pick(ways)];
    for (let i = way.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [way[i], way[j]] = [way[j], way[i]];
    }
    return way;
  });
  // Groups open in turn, at most `open` under way; each bar comes from one of those under way, at random.
  const out: { f: Frac; group: number }[] = [];
  const under: number[] = [];
  let opened = 0;
  const left = groups.map((g) => g.length);
  while (out.length < groups.reduce((s, g) => s + g.length, 0)) {
    while (under.length < spec.open && opened < spec.goal) under.push(opened++);
    const g = pick(under);
    out.push({ f: groups[g][groups[g].length - left[g]], group: g });
    if (--left[g] === 0) under.splice(under.indexOf(g), 1);
  }
  return out.map((d, i) => ({ ...d, at: LEAD + i * spec.gap }));
}

/** A row for each bar so that every group clears: a group takes the first empty row when its first bar comes. */
export function planRows(drops: TileDrop[]): number[] {
  const rowOf = new Map<number, number>();
  const busy = Array<number>(ROWS).fill(-1);
  const left = new Map<number, number>();
  for (const d of drops) left.set(d.group, (left.get(d.group) ?? 0) + 1);
  return drops.map((d) => {
    if (!rowOf.has(d.group)) {
      const r = busy.indexOf(-1);
      rowOf.set(d.group, r);
      busy[r] = d.group;
    }
    const r = rowOf.get(d.group)!;
    left.set(d.group, left.get(d.group)! - 1);
    if (!left.get(d.group)) busy[r] = -1;
    return r;
  });
}

/** How far down a bar is t ms into the wave: from above the stage to the wall's top in `fall` ms. */
export const tileY = (d: TileDrop, fall: number, t: number) => -TILE_H / 2 + ((t - d.at) / fall) * (TILE_FLOOR + TILE_H / 2);

export type TileEnd = { kind: "placed" | "lost"; t: number; y: number; row?: number };
export type Tile = { i: number; end: TileEnd | null };
export type TileSim = { t: number; dropped: number; tiles: Tile[]; rows: Frac[][]; cleared: number; jams: number };
export const startTiles = (): TileSim => ({ t: 0, dropped: 0, tiles: [], rows: Array.from({ length: ROWS }, () => []), cleared: 0, jams: 0 });
export const TILE_FADE = 600;

export type TileEvent =
  | { kind: "in"; row: number; f: Frac; sum: Frac }
  | { kind: "clear"; row: number; parts: Frac[] }
  | { kind: "jam"; row: number; parts: Frac[]; f: Frac; sum: Frac };

/** Moves the wave on to time t: drops the bars due, and loses those that reach the wall. */
export function advanceTiles(sim: TileSim, drops: TileDrop[], fall: number, t: number): TileSim {
  let dropped = sim.dropped;
  const tiles = [...sim.tiles];
  for (; dropped < drops.length && drops[dropped].at <= t; dropped++) tiles.push({ i: dropped, end: null });
  const kept = tiles
    .map((p): Tile => (p.end || t - drops[p.i].at < fall ? p : { ...p, end: { kind: "lost", t, y: TILE_FLOOR } }))
    .filter((p) => !p.end || t - p.end.t < TILE_FADE);
  return { ...sim, t, dropped, tiles: kept };
}

/** The bar a tap on a row sends: the lowest still falling (the first dropped). */
export const lowest = (sim: TileSim) => sim.tiles.find((p) => !p.end) ?? null;

/** A tap on a row: the lowest bar slides in; exactly one whole clears the row, past one jams and the bar falls on. */
export function sendTo(sim: TileSim, drops: TileDrop[], fall: number, row: number): { sim: TileSim; event: TileEvent | null } {
  const p = lowest(sim);
  if (!p) return { sim, event: null };
  const f = drops[p.i].f;
  const parts = [...sim.rows[row], f];
  const sum = sumOf(parts);
  if (sum.toNumber() > 1) return { sim: { ...sim, jams: sim.jams + 1 }, event: { kind: "jam", row, parts: sim.rows[row], f, sum } };
  const tiles = sim.tiles.map((q) => (q === p ? { ...q, end: { kind: "placed" as const, t: sim.t, y: tileY(drops[p.i], fall, sim.t), row } } : q));
  const one = sum.isOne();
  const rows = sim.rows.map((r, k) => (k !== row ? r : one ? [] : parts));
  if (one) return { sim: { ...sim, tiles, rows, cleared: sim.cleared + 1 }, event: { kind: "clear", row, parts } };
  return { sim: { ...sim, tiles, rows }, event: { kind: "in", row, f, sum } };
}

export const tilesOver = (sim: TileSim, drops: TileDrop[]) => sim.dropped >= drops.length && sim.tiles.every((p) => p.end);
/** Slips: every jam, and every row short of the goal. */
export const tileSlips = (cleared: number, jams: number, goal: number) => jams + Math.max(0, goal - cleared);
export const tileStars = (slips: number) => (slips === 0 ? 3 : slips === 1 ? 2 : 1);

// ---------- the board's game ----------

export const TILE_LADDER: { spec: TileSpec; seed: number }[] = [
  { spec: { dens: [2, 4], parts: [2, 3], goal: 3, open: 1, gap: 1600, fall: 4600 }, seed: 5001 },
  { spec: { dens: [3, 6], parts: [2, 3], goal: 3, open: 1, gap: 1500, fall: 4400 }, seed: 5002 },
  { spec: { dens: [2, 4, 8], parts: [2, 3], goal: 3, open: 2, gap: 1500, fall: 4200 }, seed: 5003 },
  { spec: { dens: [2, 3, 6], parts: [2, 3], goal: 3, open: 2, gap: 1450, fall: 4000 }, seed: 5004 },
  { spec: { dens: [2, 4, 8], parts: [2, 4], goal: 4, open: 2, gap: 1400, fall: 3800 }, seed: 5005 },
  { spec: { dens: [3, 6, 12], parts: [2, 3], goal: 4, open: 2, gap: 1350, fall: 3600 }, seed: 5006 },
  { spec: { dens: [2, 5, 10], parts: [2, 3], goal: 4, open: 3, gap: 1350, fall: 3500 }, seed: 5007 },
  { spec: { dens: [2, 3, 4, 6, 12], parts: [2, 4], goal: 4, open: 3, gap: 1300, fall: 3300 }, seed: 5008 },
  { spec: { dens: [2, 3, 4, 6, 8, 12], parts: [2, 4], goal: 5, open: 3, gap: 1250, fall: 3100 }, seed: 5009 },
];
export const TILE_LEVELS: Record<GameLevel, TileSpec> = {
  1: { dens: [2, 4, 8], parts: [2, 3], goal: 3, open: 2, gap: 1500, fall: 4200 },
  2: { dens: [2, 3, 6, 12], parts: [2, 3], goal: 4, open: 2, gap: 1350, fall: 3600 },
  3: { dens: [2, 3, 4, 6, 8, 12], parts: [2, 4], goal: 4, open: 3, gap: 1250, fall: 3100 },
};
const quicker = (s: TileSpec): TileSpec => ({ ...s, gap: Math.round(s.gap * 0.8), fall: Math.round(s.fall * 0.8) });

export type TileNotice = MakeNotice;
export const TILE_NOTICES: TileNotice[] = ["three", "mixed", "streak10"];
export const tileNotice = oneNotice;

export type LiveTileDrop = EndlessGame<TileNotice, GameLevel, { kind: "clear" | "jam"; parts: string; sum?: string } | { kind: "in"; sum: string }> & {
  done: boolean;
  cleared: number;
  jams: number;
  /** Once the wave is over, the rows cleared and the jams, written out. */
  rowsDone?: string[];
  jammed?: string[];
};
export const TILE_START: LiveTileDrop = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, done: false, cleared: 0, jams: 0, rowsDone: [], jammed: [] };

export function tileNow(d: Pick<LiveTileDrop, "mode" | "stage" | "level" | "seed" | "timed">): { spec: TileSpec; drops: TileDrop[] } {
  const { spec: base, seed } = d.mode === "puzzle" ? TILE_LADDER[d.stage] : { spec: TILE_LEVELS[d.level], seed: d.seed };
  const spec = d.mode === "endless" && d.timed ? quicker(base) : base;
  return { spec, drops: tileWave(spec, rng(seed)) };
}
