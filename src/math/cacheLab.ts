// The memory hierarchy and the cache (#855): a CPU asks for memory blocks one by one, and each goes into a cache of four
// lines. Direct mapped: the block number mod 4 picks its line. Two-way set associative: mod 2 picks a set of two lines.
// Fully associative: any line. When the place is full, the least recently used line is thrown out (Stallings 4.1-4.3;
// Tanenbaum 2.2.5).
import type { GameBase } from "./ladder";

export type Mapping = "direct" | "two" | "full";
export const MAPPINGS: readonly Mapping[] = ["direct", "two", "full"];
export const LINES = 4;
export const BLOCKS = 16;
/** Time to read from the cache and from main memory, in nanoseconds (Stallings 4.1's two-level memory). */
export const T_CACHE = 1;
export const T_MEMORY = 10;

export type Line = { block: number | null; used: number };
export const emptyCache = (): Line[] => Array.from({ length: LINES }, () => ({ block: null, used: -1 }));

/** The lines a block may go in: one for direct, a set of two, or all four. */
export function placeOf(m: Mapping, block: number): number[] {
  if (m === "direct") return [block % LINES];
  if (m === "two") return [0, 1].map((w) => (block % 2) * 2 + w);
  return [0, 1, 2, 3];
}
export const setName = (m: Mapping, block: number) => (m === "direct" ? block % LINES : m === "two" ? block % 2 : 0);

/** Where a miss may go: a free line of its place if there is one, or else the least recently used. */
export function choicesOf(c: readonly Line[], m: Mapping, block: number): number[] {
  const place = placeOf(m, block);
  const free = place.filter((i) => c[i].block === null);
  if (free.length) return free;
  return [place.reduce((a, b) => (c[b].used < c[a].used ? b : a))];
}

export type Access = { hit: boolean; line: number; out: number | null; cache: Line[] };
/** One request at time t: a hit where it already is, or a miss into `line` (the rule's own choice if not given). */
export function access(c: readonly Line[], m: Mapping, block: number, t: number, line?: number): Access {
  const at = placeOf(m, block).find((i) => c[i].block === block);
  if (at !== undefined) return { hit: true, line: at, out: null, cache: c.map((l, i) => (i === at ? { ...l, used: t } : l)) };
  const to = line ?? choicesOf(c, m, block)[0];
  return { hit: false, line: to, out: c[to].block, cache: c.map((l, i) => (i === to ? { block, used: t } : l)) };
}

/** A whole sequence run by the rules: hit or miss for each request, and the cache after. */
export function runSeq(m: Mapping, seq: readonly number[]): { hits: boolean[]; cache: Line[] } {
  let cache = emptyCache();
  const hits = seq.map((b, t) => {
    const a = access(cache, m, b, t);
    cache = a.cache;
    return a.hit;
  });
  return { hits, cache };
}
/** The average time a request takes, with this many hits out of n (Stallings 4.1: a miss reads memory too). */
export const averageTime = (hits: number, n: number) => (n ? (hits * T_CACHE + (n - hits) * (T_CACHE + T_MEMORY)) / n : 0);

export type CachePuzzle = { goal: "hand" | "predict" | "thrash"; mapping: Mapping; seq: readonly number[] };
export const CACHE_LADDER: readonly CachePuzzle[] = [
  { goal: "hand", mapping: "direct", seq: [1, 2, 1, 5, 2, 1, 9] },
  { goal: "hand", mapping: "two", seq: [1, 2, 3, 1, 5, 1, 3] },
  { goal: "hand", mapping: "full", seq: [0, 1, 2, 3, 0, 4, 0, 1] },
  { goal: "predict", mapping: "direct", seq: [0, 1, 2, 3, 0, 1, 2, 3, 4, 0] },
  { goal: "thrash", mapping: "direct", seq: [] },
];
/** The thrash puzzle: at least this long, no hit in the direct-mapped cache, and this many in the two-way one. */
export const THRASH = { length: 6, twoHits: 3 };
export const MAX_SEQ = 10;
export const thrashes = (seq: readonly number[]) => {
  const [d, t] = [runSeq("direct", seq).hits, runSeq("two", seq).hits];
  return seq.length >= THRASH.length && !d.some(Boolean) && t.filter(Boolean).length >= THRASH.twoHits;
};

export const CACHE_NOTICES = ["conflict", "locality", "lru"] as const;
export type CacheNotice = (typeof CACHE_NOTICES)[number];

export type LiveCache = GameBase<CacheNotice> & {
  mode: "puzzle" | "free";
  mapping: Mapping;
  seq: number[];
  /** How many requests are done, hit or miss for each, and the cache now. */
  at: number;
  hits: boolean[];
  cache: Line[];
  misses: number;
  done: boolean;
};
export function cacheStart(p: CachePuzzle | null): Pick<LiveCache, "mapping" | "seq" | "at" | "hits" | "cache" | "misses" | "done"> {
  return { mapping: p?.mapping ?? "direct", seq: [...(p?.seq ?? [])], at: 0, hits: [], cache: emptyCache(), misses: 0, done: false };
}
export const CACHE_START: LiveCache = { mode: "puzzle", stage: 0, said: null, ...cacheStart(CACHE_LADDER[0]) };
export const cachePuzzleOf = (s: Pick<LiveCache, "mode" | "stage">) => (s.mode === "puzzle" ? CACHE_LADDER[s.stage] ?? null : null);
/** A block number as four bits, split into its tag and its line (direct) or set (two-way). */
export function addressParts(m: Mapping, block: number): { tag: string; index: string } {
  const bits = block.toString(2).padStart(4, "0");
  const k = m === "direct" ? 2 : m === "two" ? 1 : 0;
  return { tag: bits.slice(0, 4 - k), index: bits.slice(4 - k) };
}
export const starsFor = (misses: number) => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
