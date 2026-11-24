// Number rain: tiles, each with a number fact on it (6 × 7), fall down the stage one after another; the one nearest
// to landing is the target, and its answer is typed before it lands. A right answer clears the tile, and the next
// nearest becomes the target, so no fact can be put off. An answer is judged digit by digit: the moment what is typed
// can no longer become the answer it is wrong, and the tile falls on to be tried again. A tile that lands stays as a
// block with its answer on it, and the tiles after it in that column have less far to fall. A fact missed (answered
// wrong, or let land) comes back once after the rest of the wave; got right then, its block is dug out. Each tile can
// slip once: three stars for a wave without a slip, two for one or two, else one. With nothing in the air the next tile
// comes at once, so a quick player is not kept waiting.
// Two games share it, each with its own ladder: + and − (within 10, past ten, the bonds) and × and ÷ (the tables in
// the order they are learnt, their divisions, the squares). The facts and how well each is known are math/facts.ts;
// the endless run draws with that book in hand, so the facts last missed come up most. The fall of a tile, the
// judging of what is typed and the run of a wave are worked out here, and the board's piece only draws them.
import { drawFacts, poolOf, QUICK_MS, type Fact, type FactBook, type FactFamily } from "./facts";
import { rng } from "./random";
import type { EndlessGame, GameLevel } from "./ladder";

/** The stage in SVG units, its columns and the size of a tile. */
export const RAIN_W = 600;
export const RAIN_H = 380;
export const RAIN_COLS = 4;
export const TILE_W = 134;
export const TILE_H = 42;
/** A column takes no more tiles once its blocks are this high (the next falls where the blocks are lowest). */
const STACK_MAX = 5;
/** The first tile comes a moment after the wave starts; with nothing in the air the next one comes this soon. */
const LEAD = 500;
const SOON = 350;
/** How long a tile that has ended stays on the stage, to be seen going. */
export const RAIN_FADE = 800;

/** A wave: `count` facts of these families, a new tile every `gap` ms, each `fall` ms from the top to an empty floor. */
export type RainSpec = { families: FactFamily[]; count: number; gap: number; fall: number };
/** A tile to come: its fact, when, in which column, and whether it is a missed fact coming back. */
export type Drop = { fact: Fact; at: number; col: number; again: boolean };

/** The wave's tiles: the facts drawn (with the book, the weak ones most), a column each, never the same twice running. */
export function wave(spec: RainSpec, next: () => number, book?: FactBook): Drop[] {
  let last = -1;
  return drawFacts(poolOf(spec.families), spec.count, next, book).map((fact, i) => {
    const col = last < 0 ? Math.floor(next() * RAIN_COLS) : (last + 1 + Math.floor(next() * (RAIN_COLS - 1))) % RAIN_COLS;
    last = col;
    return { fact, at: LEAD + i * spec.gap, col, again: false };
  });
}

/** How a tile left the air: answered right, answered right after a wrong try, or landed. */
export type TileEnd = { kind: "right" | "fixed" | "landed"; t: number; y: number };
export type Tile = {
  id: number;
  fact: Fact;
  col: number;
  /** When it appeared at the top, and since when it has been the target (-1: not yet). */
  t0: number;
  since: number;
  again: boolean;
  /** A wrong answer has been typed for it: its slip is counted. */
  tried: boolean;
  end: TileEnd | null;
};
export type Sim = {
  t: number;
  /** The tiles to come, missed facts added at the end as they are missed; `dropped` of them have come, and `early` is how many ms the rest have been brought forward. */
  queue: Drop[];
  dropped: number;
  early: number;
  tiles: Tile[];
  /** The blocks landed in each column, bottom first. */
  stacks: Fact[][];
  target: number | null;
  ids: number;
};
export const startSim = (drops: Drop[]): Sim => ({ t: 0, queue: drops, dropped: 0, early: 0, tiles: [], stacks: Array.from({ length: RAIN_COLS }, () => []), target: null, ids: 0 });

export type RainEvent =
  /** Right at the first try: in `ms` from when it was the target, quick or not; a fact come back whose block was dug out. */
  | { kind: "right"; fact: Fact; ms: number; quick: boolean; again: boolean; dug: boolean }
  /** Right after a wrong try: no credit. */
  | { kind: "fixed"; fact: Fact; again: boolean }
  /** A wrong answer typed; `slip` on the tile's first. */
  | { kind: "wrong"; fact: Fact; typed: string; slip: boolean; again: boolean }
  /** Reached the floor; `slip` unless a wrong answer had counted already. */
  | { kind: "landed"; fact: Fact; slip: boolean; again: boolean };

/** The top of a tile at time t: it appears at the top of the stage and falls at a steady speed. */
export const tileY = (tile: Pick<Tile, "t0">, t: number, fall: number) => ((t - tile.t0) / fall) * RAIN_H;
/** The top of a column's blocks: where a tile's bottom edge lands. */
export const floorOf = (sim: Pick<Sim, "stacks">, col: number) => RAIN_H - sim.stacks[col].length * TILE_H;
export const targetOf = (sim: Sim) => sim.tiles.find((x) => x.id === sim.target && !x.end) ?? null;
const live = (sim: Sim) => sim.tiles.filter((x) => !x.end);

/** The target stays until it ends; then the tile nearest to landing is the next. */
function aim(sim: Sim, fall: number): Sim {
  if (targetOf(sim)) return sim;
  const left = (x: Tile) => floorOf(sim, x.col) - TILE_H - tileY(x, sim.t, fall);
  const next = live(sim).sort((a, b) => left(a) - left(b) || a.id - b.id)[0];
  if (!next) return sim.target === null ? sim : { ...sim, target: null };
  return { ...sim, target: next.id, tiles: sim.tiles.map((x) => (x.id === next.id ? { ...x, since: sim.t } : x)) };
}
/** A missed fact comes back once, a gap after the last tile to come (or after now), in its own column. */
function comeBack(sim: Sim, tile: Tile, gap: number): Sim {
  if (tile.again) return sim;
  const lastAt = sim.queue.length > sim.dropped ? sim.queue[sim.queue.length - 1].at - sim.early : sim.t;
  return { ...sim, queue: [...sim.queue, { fact: tile.fact, at: Math.max(lastAt, sim.t) + gap + sim.early, col: tile.col, again: true }] };
}

/** Moves the wave on to time t: the tiles due appear, and those that have reached the floor land. */
export function advance(sim: Sim, spec: Pick<RainSpec, "gap" | "fall">, t: number): { sim: Sim; events: RainEvent[] } {
  const events: RainEvent[] = [];
  let s: Sim = { ...sim, t, tiles: sim.tiles.filter((x) => !x.end || t - x.end.t < RAIN_FADE) };
  // The landings, the lowest first, so two due in one column stack in order.
  for (const x of live(s).sort((a, b) => a.t0 - b.t0)) {
    const floor = floorOf(s, x.col);
    if (tileY(x, t, spec.fall) + TILE_H < floor) continue;
    events.push({ kind: "landed", fact: x.fact, slip: !x.tried, again: x.again });
    s = { ...s, stacks: s.stacks.map((st, c) => (c === x.col ? [...st, x.fact] : st)), tiles: s.tiles.map((y) => (y.id === x.id ? { ...y, end: { kind: "landed", t, y: floor - TILE_H } } : y)) };
    if (!x.tried) s = comeBack(s, x, spec.gap);
  }
  // With nothing in the air the next tile is brought forward.
  if (!live(s).length && s.dropped < s.queue.length) {
    const wait = s.queue[s.dropped].at - s.early - t;
    if (wait > SOON) s = { ...s, early: s.early + wait - SOON };
  }
  while (s.dropped < s.queue.length && s.queue[s.dropped].at - s.early <= t) {
    const d = s.queue[s.dropped];
    // A full column sends the tile to where the blocks are lowest.
    const col = s.stacks[d.col].length < STACK_MAX ? d.col : s.stacks.reduce((best, st, c) => (st.length < s.stacks[best].length ? c : best), 0);
    s = { ...s, dropped: s.dropped + 1, ids: s.ids + 1, tiles: [...s.tiles, { id: s.ids, fact: d.fact, col, t0: t, since: -1, again: d.again, tried: false, end: null }] };
  }
  return { sim: aim(s, spec.fall), events };
}

/**
 * What is typed, judged against the target: its answer clears the tile; the start of its answer waits for more;
 * anything else is wrong, and what was typed is cleared. `entry` is what stays typed.
 */
export function answer(sim: Sim, typed: string, spec: Pick<RainSpec, "gap" | "fall">): { sim: Sim; events: RainEvent[]; entry: string } {
  const x = targetOf(sim);
  if (!x || !typed) return { sim, events: [], entry: x ? typed : "" };
  const right = String(x.fact.answer);
  if (typed !== right && right.startsWith(typed)) return { sim, events: [], entry: typed };
  if (typed !== right) {
    let s: Sim = { ...sim, tiles: sim.tiles.map((y) => (y.id === x.id ? { ...y, tried: true } : y)) };
    if (!x.tried) s = comeBack(s, x, spec.gap);
    return { sim: s, events: [{ kind: "wrong", fact: x.fact, typed, slip: !x.tried, again: x.again }], entry: "" };
  }
  const end: TileEnd = { kind: x.tried ? "fixed" : "right", t: sim.t, y: tileY(x, sim.t, spec.fall) };
  let s: Sim = { ...sim, target: null, tiles: sim.tiles.map((y) => (y.id === x.id ? { ...y, end } : y)) };
  if (x.tried) return { sim: aim(s, spec.fall), events: [{ kind: "fixed", fact: x.fact, again: x.again }], entry: "" };
  // A fact come back and got right digs its block out, wherever it landed.
  let dug = false;
  if (x.again) {
    const col = s.stacks.findIndex((st) => st.some((f) => f.key === x.fact.key));
    if (col >= 0) {
      const at = s.stacks[col].findIndex((f) => f.key === x.fact.key);
      s = { ...s, stacks: s.stacks.map((st, c) => (c === col ? st.filter((_, i) => i !== at) : st)) };
      dug = true;
    }
  }
  const ms = sim.t - Math.max(x.t0, x.since);
  return { sim: aim(s, spec.fall), events: [{ kind: "right", fact: x.fact, ms, quick: ms <= QUICK_MS, again: x.again, dug }], entry: "" };
}

/** A fact with its answer in it: 6 × 7 = 42, and 7 + 3 = 10 for 7 + □ = 10. */
export const shown = (text: string, answer: number) => (text.includes("□") ? text.replace("□", String(answer)) : `${text} = ${answer}`);

/** Every tile has come, and none is in the air. */
export const waveOver = (sim: Sim) => sim.dropped >= sim.queue.length && !live(sim).length;

/** How a fact of the wave came out: right at once (and quick or not), or missed, and then got right when it came back or not. */
export type RainMark = { text: string; answer: number; ok: boolean; quick: boolean; mended: boolean };
/** The marks after one more event: a first tile's ending is its fact's mark; a fact come back and got right is mended. */
export function markUp(marks: RainMark[], e: RainEvent): RainMark[] {
  if (e.again) return e.kind === "right" ? marks.map((m) => (m.text === e.fact.text && !m.ok ? { ...m, mended: true } : m)) : marks;
  if (e.kind === "right") return [...marks, { text: e.fact.text, answer: e.fact.answer, ok: true, quick: e.quick, mended: false }];
  if ((e.kind === "wrong" || e.kind === "landed") && e.slip) return [...marks, { text: e.fact.text, answer: e.fact.answer, ok: false, quick: false, mended: false }];
  return marks;
}

// ---------- the board's games ----------

export type RainDeck = "plus" | "times";
export const RAIN_PIECES = { plus: "rainPlus", times: "rainTimes" } as const;
const SLOW = { gap: 4500, fall: 12000 };
const STEADY = { gap: 3400, fall: 10000 };
const BRISK = { gap: 2600, fall: 8000 };
const QUICK = { gap: 2200, fall: 7000 };
/** Easy to hard: one kind of fact at a time and slowly, then mixed, then faster. */
export const RAIN_LADDERS: Record<RainDeck, { spec: RainSpec; seed: number }[]> = {
  plus: [
    { spec: { families: ["add10"], count: 8, ...SLOW }, seed: 4101 },
    { spec: { families: ["sub10"], count: 8, ...SLOW }, seed: 4102 },
    { spec: { families: ["bond10"], count: 9, ...SLOW }, seed: 4103 },
    { spec: { families: ["add10", "sub10", "bond10"], count: 12, ...STEADY }, seed: 4104 },
    { spec: { families: ["add20"], count: 10, ...SLOW }, seed: 4105 },
    { spec: { families: ["sub20"], count: 10, ...SLOW }, seed: 4106 },
    { spec: { families: ["add20", "sub20"], count: 12, ...STEADY }, seed: 4107 },
    { spec: { families: ["bond20", "bond100"], count: 10, ...STEADY }, seed: 4108 },
    { spec: { families: ["add10", "sub10", "add20", "sub20", "bond10", "bond20", "bond100"], count: 14, ...BRISK }, seed: 4109 },
  ],
  times: [
    { spec: { families: ["times2", "times5", "times10"], count: 10, ...SLOW }, seed: 4201 },
    { spec: { families: ["div2", "div5", "div10"], count: 10, ...SLOW }, seed: 4202 },
    { spec: { families: ["times3", "times4"], count: 10, ...SLOW }, seed: 4203 },
    { spec: { families: ["div3", "div4"], count: 10, ...SLOW }, seed: 4204 },
    { spec: { families: ["times6", "times7"], count: 12, ...STEADY }, seed: 4205 },
    { spec: { families: ["times8", "times9"], count: 12, ...STEADY }, seed: 4206 },
    { spec: { families: ["div6", "div7", "div8", "div9"], count: 12, ...STEADY }, seed: 4207 },
    { spec: { families: ["times6", "times7", "times8", "times9", "div6", "div7", "div8", "div9"], count: 14, ...BRISK }, seed: 4208 },
    { spec: { families: ["times11", "times12", "squares"], count: 12, ...STEADY }, seed: 4209 },
  ],
};
export const RAIN_LEVELS: Record<RainDeck, Record<GameLevel, RainSpec>> = {
  plus: {
    1: { families: ["add10", "sub10", "bond10"], count: 8, ...STEADY },
    2: { families: ["add20", "sub20", "bond20"], count: 8, ...STEADY },
    3: { families: ["add10", "sub10", "add20", "sub20", "bond10", "bond20", "bond100"], count: 10, ...QUICK },
  },
  times: {
    1: { families: ["times2", "times3", "times4", "times5", "times10", "div2", "div3", "div4", "div5", "div10"], count: 8, ...STEADY },
    2: { families: ["times6", "times7", "times8", "times9", "div6", "div7", "div8", "div9"], count: 8, ...STEADY },
    3: { families: ["times6", "times7", "times8", "times9", "times11", "times12", "div6", "div7", "div8", "div9", "div11", "div12", "squares"], count: 10, ...QUICK },
  },
};
/** Against the clock the tiles come and fall a fifth faster; in calm, half as fast again more slowly. */
export const paced = (s: RainSpec, k: number): RainSpec => ({ ...s, gap: Math.round(s.gap * k), fall: Math.round(s.fall * k) });

/** Stars: a wave without a slip three, with one or two two, else one. */
export const rainStars = (slips: number) => (slips === 0 ? 3 : slips <= 2 ? 2 : 1);

export type RainNotice = "quick5" | "dug" | "allQuick" | "streak10";
export const RAIN_NOTICES: RainNotice[] = ["quick5", "dug", "allQuick", "streak10"];

export type RainSaid =
  | { kind: "right"; text: string; answer: number; quick: boolean; dug: boolean }
  | { kind: "fixed"; text: string; answer: number }
  | { kind: "wrong"; text: string; typed: string }
  | { kind: "landed"; text: string; answer: number };
export const saidOf = (e: RainEvent): RainSaid =>
  e.kind === "right" ? { kind: "right", text: e.fact.text, answer: e.fact.answer, quick: e.quick, dug: e.dug }
  : e.kind === "wrong" ? { kind: "wrong", text: e.fact.text, typed: e.typed }
  : { kind: e.kind, text: e.fact.text, answer: e.fact.answer };

export type LiveRain = EndlessGame<RainNotice, GameLevel, RainSaid> & {
  deck: RainDeck;
  /** The wave is over. */
  done: boolean;
  /** Facts right at the first try, how many of those quick, and slips, in this wave. */
  right: number;
  quick: number;
  slips: number;
  /** Once the wave is over, every fact of it, right or missed. */
  marks?: RainMark[];
};
export const rainStart = (deck: RainDeck): LiveRain => ({ deck, mode: "puzzle", stage: 0, level: 1, seed: 1, done: false, right: 0, quick: 0, slips: 0, marks: [], streak: 0, said: null });

/** The wave of a puzzle (always the same) or of the endless run (drawn with the book, when there is one), and its pace. */
export function rainNow(d: Pick<LiveRain, "deck" | "mode" | "stage" | "level" | "seed" | "timed">, o: { book?: FactBook; calm?: boolean } = {}): { spec: RainSpec; drops: Drop[] } {
  const puzzle = d.mode === "puzzle";
  const { spec: base, seed } = puzzle ? RAIN_LADDERS[d.deck][d.stage] : { spec: RAIN_LEVELS[d.deck][d.level], seed: d.seed };
  const spec = paced(base, (o.calm ? 1.5 : 1) * (!puzzle && d.timed && !o.calm ? 0.8 : 1));
  return { spec, drops: wave(spec, rng(seed), puzzle ? undefined : o.book) };
}
