// Multiplying two numbers as the area of a rectangle built of base-ten blocks: the same sum seen three ways that are
// kept in step. The rectangle is a units down and b units across; splitting each side into its tens and its ones cuts
// it into at most four parts. Tens by tens is filled with hundred flats, tens by ones (either way) with ten rods, ones
// by ones with unit cubes: each part is a partial product, the same number that stands in the box (the grid method)
// and in a line of the written working. A part is filled in by a tap, or with "your turn" by giving its product
// first, and the whole product is the parts added.
// src/live/AreaBlocks.tsx draws it; everything here is plain data.
import { rng } from "./random";

/** A part of the rectangle: t for a side's tens, o for its ones; the side down first, then the side across. */
export type PartKey = "tt" | "to" | "ot" | "oo";
export type AreaPart = {
  key: PartKey;
  /** How far down the side and across the top the part starts and how big it is, in units. */
  top: number; left: number; rows: number; cols: number;
  value: number;
  /** The block that fills it (hundred flat, ten rod, unit cube) and how many. */
  block: "h" | "t" | "o";
  count: number;
};

export type LiveAreaBlocks = {
  /** The side down, and the side across. */
  a: number;
  b: number;
  filled: PartKey[];
  /** Your turn: a part is filled by giving its product, and the whole by adding them. */
  ask: boolean;
  /** What is being asked for, and the digits given so far. */
  at: PartKey | "total" | null;
  typed: string;
  /** The wrong number last given for what is asked. */
  miss: number | null;
  /** The whole product has been given (your turn). */
  summed: boolean;
  seed: number;
};

export const AREA_RANGE: [number, number] = [1, 39];
export const AREA_START: LiveAreaBlocks = {
  a: 24, b: 16, filled: ["tt", "to"], ask: false, at: null, typed: "", miss: null, summed: false, seed: 1,
};

const clamp = (n: number) => Math.max(AREA_RANGE[0], Math.min(AREA_RANGE[1], Math.round(n) || AREA_RANGE[0]));
/** A side's tens and ones, the parts that are nothing dropped: 24 → 20 and 4, 20 → 20, 4 → 4. */
export function sideParts(n: number): { size: number; tens: boolean }[] {
  const tens = Math.floor(n / 10) * 10;
  return [{ size: tens, tens: true }, { size: n - tens, tens: false }].filter((p) => p.size > 0);
}

/** The parts of an a by b rectangle, row by row. */
export function areaParts(a: number, b: number): AreaPart[] {
  const out: AreaPart[] = [];
  let top = 0;
  for (const r of sideParts(a)) {
    let left = 0;
    for (const c of sideParts(b)) {
      const key = `${r.tens ? "t" : "o"}${c.tens ? "t" : "o"}` as PartKey;
      const block = key === "tt" ? "h" : key === "oo" ? "o" : "t";
      const count = (r.tens ? r.size / 10 : r.size) * (c.tens ? c.size / 10 : c.size);
      out.push({ key, top, left, rows: r.size, cols: c.size, value: r.size * c.size, block, count });
      left += c.size;
    }
    top += r.size;
  }
  return out;
}

export const isFilled = (s: Pick<LiveAreaBlocks, "filled">, key: PartKey) => s.filled.includes(key);
/** The parts filled in so far, added. */
export function runningTotal(s: LiveAreaBlocks): number {
  return areaParts(s.a, s.b).filter((p) => isFilled(s, p.key)).reduce((sum, p) => sum + p.value, 0);
}
export const allFilled = (s: LiveAreaBlocks) => areaParts(s.a, s.b).every((p) => isFilled(s, p.key));
/** The product is on show: every part is in, and with "your turn" the sum has been given too. */
export const areaDone = (s: LiveAreaBlocks) => allFilled(s) && (!s.ask || s.summed);

const fresh = { filled: [] as PartKey[], at: null, typed: "", miss: null, summed: false };

/** Other numbers: the rectangle starts empty again. */
export function withNumbers(s: LiveAreaBlocks, a: number, b: number): LiveAreaBlocks {
  const [na, nb] = [clamp(a), clamp(b)];
  return na === s.a && nb === s.b ? s : { ...s, ...fresh, a: na, b: nb };
}

/** Your turn on or off: either way the rectangle starts empty. */
export function withAsk(s: LiveAreaBlocks, ask: boolean): LiveAreaBlocks {
  return ask === s.ask ? s : { ...s, ...fresh, ask };
}

/** Two new numbers from the die, each of two digits so the rectangle has its four parts (or two, for a round number). */
export function dealtArea(s: LiveAreaBlocks): LiveAreaBlocks {
  const seed = s.seed + 1;
  const r = rng(seed * 104729);
  return { ...s, ...fresh, seed, a: 11 + Math.floor(r() * 19), b: 11 + Math.floor(r() * 9) };
}

/**
 * A part tapped (in the rectangle or in the box). Without "your turn" it is filled, or emptied again; with it, a part
 * not yet filled becomes the one asked about.
 */
export function tapPart(s: LiveAreaBlocks, key: PartKey): LiveAreaBlocks {
  if (!areaParts(s.a, s.b).some((p) => p.key === key)) return s;
  if (!s.ask) return { ...s, filled: isFilled(s, key) ? s.filled.filter((k) => k !== key) : [...s.filled, key] };
  if (isFilled(s, key) || s.at === key) return s;
  return { ...s, at: key, typed: "", miss: null };
}

/** The number asked for: a part's product, or all of them added. */
export function asked(s: LiveAreaBlocks): number | null {
  if (s.at === null) return null;
  if (s.at === "total") return s.a * s.b;
  return areaParts(s.a, s.b).find((p) => p.key === s.at)?.value ?? null;
}

/**
 * The digits given are checked against what is asked. Right: the part is filled and the next empty one is asked
 * about, then the sum of them all. Wrong: the number is kept as the miss, to be answered with a hint.
 */
export function checkTyped(s: LiveAreaBlocks): LiveAreaBlocks {
  const want = asked(s);
  if (want === null || s.at === null || !/^\d+$/.test(s.typed)) return s;
  const got = Number(s.typed);
  if (got !== want) return { ...s, typed: "", miss: got };
  if (s.at === "total") return { ...s, at: null, typed: "", miss: null, summed: true };
  const filled = [...s.filled, s.at];
  const next = areaParts(s.a, s.b).find((p) => !filled.includes(p.key));
  return { ...s, filled, at: next ? next.key : "total", typed: "", miss: null };
}

/** How a part's product is counted in blocks: 2 tens × 6 = 12 tens. `x` and `y` are the two sides in the part's own units. */
export function partCount(p: AreaPart): { x: number; y: number; n: number } {
  const x = p.key[0] === "t" ? p.rows / 10 : p.rows;
  const y = p.key[1] === "t" ? p.cols / 10 : p.cols;
  return { x, y, n: x * y };
}
