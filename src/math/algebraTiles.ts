// Algebra tiles: x² as a big square, x as a rod x long and 1 wide, 1 as a small square; red for the negative ones.
// Three ways to use them:
// - combine: put tiles out and take zero pairs away (an x and a −x make nothing) to simplify;
// - multiply: (ax + b)(cx + d) as a rectangle, the factors along two sides and the tiles inside its area;
// - factor: a trinomial's tiles to arrange into a rectangle, by finding the two sides that make it.
// The rod's length is not a whole number of small squares (X_LEN), so x never looks like a count of ones.
// Everything here is in tile units; src/live/AlgebraTiles.tsx scales it to the piece.

export type TileKind = "x2" | "x" | "one";
export const TILE_KINDS: TileKind[] = ["x2", "x", "one"];
export type TilesMode = "combine" | "multiply" | "factor";
export const TILE_MODES: TilesMode[] = ["combine", "multiply", "factor"];

/** Counts of each tile kind (x², x, 1). */
export type Counts = [number, number, number];
/** The two factors (ax + b)(cx + d) as [a, b, c, d]. */
export type Factors = [number, number, number, number];

export type LiveAlgebraTiles = {
  mode: TilesMode;
  /** combine: the positive tiles and the negative ones out on the mat. */
  pos: Counts;
  neg: Counts;
  /** multiply and factor: the rectangle's two sides. */
  f: Factors;
  /** factor: which of FACTOR_TARGETS is to be made. */
  target: number;
};

export const TILES_START: LiveAlgebraTiles = { mode: "multiply", pos: [1, 3, 2], neg: [0, 1, 4], f: [1, 2, 1, 3], target: 0 };

/** How long x is, in small squares: not a whole number, so x is never taken for a count of ones. */
export const X_LEN = 3.4;
/** The most of each kind on the mat in combine. */
export const TILE_CAP: Counts = [6, 8, 10];
/** a and c (the x's in a side) and b and d (the ones). */
export const X_RANGE: [number, number] = [0, 3];
export const ONE_RANGE: [number, number] = [-6, 6];

/** Trinomials [x², x, 1] that make a rectangle with sides inside the ranges above, easier ones first. */
export const FACTOR_TARGETS: Counts[] = [
  [1, 3, 2], [1, 5, 6], [1, 4, 4], [1, 7, 12], [1, 1, -2], [1, -5, 6], [1, -1, -6], [1, 0, -4],
  [1, 2, -8], [1, -6, 9], [2, 3, 1], [2, 7, 3], [2, 5, 2], [2, -1, -3], [3, 7, 2], [2, 0, -8], [3, 4, 1], [4, 4, 1],
];

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, Math.round(v)));
export const clampFactors = (f: Factors): Factors => [clamp(f[0], X_RANGE), clamp(f[1], ONE_RANGE), clamp(f[2], X_RANGE), clamp(f[3], ONE_RANGE)];

const MINUS = "−";

/** ax² + bx + c written as people write it: "x² − 3x + 2", "−x", "0". */
export function poly([a, b, c]: Counts): string {
  const terms: [number, string][] = [[a, "x²"], [b, "x"], [c, ""]];
  let out = "";
  for (const [k, v] of terms) {
    if (!k) continue;
    const size = Math.abs(k) === 1 && v ? v : `${Math.abs(k)}${v}`;
    out += out ? ` ${k < 0 ? MINUS : "+"} ${size}` : `${k < 0 ? MINUS : ""}${size}`;
  }
  return out || "0";
}

/** One side, ax + b: "x + 2", "2x − 1", "3". */
export const side = (a: number, b: number) => poly([0, a, b]);

/** (ax + b)(cx + d) multiplied out: [ac, ad + bc, bd]. */
export const product = ([a, b, c, d]: Factors): Counts => [a * c + 0, a * d + b * c + 0, b * d + 0]; // + 0: no −0

/** The four parts of the rectangle before like terms are collected: "x² + 3x + 2x + 6". */
export function partsText([a, b, c, d]: Factors): string {
  const parts: Counts[] = [[a * c, 0, 0], [0, a * d, 0], [0, b * c, 0], [0, 0, b * d]];
  return parts.filter((p) => p.some(Boolean)).map(poly).reduce((s, p) => (s ? `${s} ${p.startsWith(MINUS) ? `${MINUS} ${p.slice(1)}` : `+ ${p}`}` : p), "") || "0";
}

/** What the combine mat holds, net: positive tiles less negative ones. */
export const net = (pos: Counts, neg: Counts): Counts => [pos[0] - neg[0], pos[1] - neg[1], pos[2] - neg[2]];

/** How many zero pairs of each kind are on the mat (a tile and its negative). */
export const zeroPairs = (pos: Counts, neg: Counts): Counts => [Math.min(pos[0], neg[0]), Math.min(pos[1], neg[1]), Math.min(pos[2], neg[2])];

/** The mat with its zero pairs taken away. */
export function removePairs(pos: Counts, neg: Counts): { pos: Counts; neg: Counts } {
  const z = zeroPairs(pos, neg);
  return { pos: pos.map((p, i) => p - z[i]) as Counts, neg: neg.map((n, i) => n - z[i]) as Counts };
}

/** Every tile on the combine mat, written out in order: "x² + 3x + 2 − x − 4". */
export function matText(pos: Counts, neg: Counts): string {
  const p = pos.some(Boolean) ? poly(pos) : "";
  const n = neg.some(Boolean) ? poly(neg) : "";
  if (!n) return p || "0";
  if (!p) return `${MINUS}${n.replace(/ \+ /g, ` ${MINUS} `)}`;
  return `${p} ${MINUS} ${n.replace(/ \+ /g, ` ${MINUS} `)}`;
}

/** Every pair of sides inside the ranges whose rectangle is `t` (a side with no x first counted once). */
export function factorings(t: Counts): Factors[] {
  const out: Factors[] = [];
  for (let a = X_RANGE[0]; a <= X_RANGE[1]; a++)
    for (let c = X_RANGE[0]; c <= X_RANGE[1]; c++)
      for (let b = ONE_RANGE[0]; b <= ONE_RANGE[1]; b++)
        for (let d = ONE_RANGE[0]; d <= ONE_RANGE[1]; d++) {
          const p = product([a, b, c, d]);
          if (p[0] === t[0] && p[1] === t[1] && p[2] === t[2]) out.push([a, b, c, d]);
        }
  return out;
}

export const same = (p: Counts, q: Counts) => p[0] === q[0] && p[1] === q[1] && p[2] === q[2];

/** One tile in a picture, in tile units: where its top-left corner is, how big, and its sign. */
export type Tile = { kind: TileKind; neg: boolean; x: number; y: number; w: number; h: number };

/**
 * The rectangle of (ax + b)(cx + d): the top side's a rods then |b| ones run left to right, the left side's c rods
 * then |d| ones run top to bottom, and each cell is the tile their lengths make, negative when just one of the two
 * is. Its corner is at (0, 0); the sides themselves (`top`, `left`) sit just outside it.
 */
export function rectangle([a, b, c, d]: Factors, gap = 0.3): { tiles: Tile[]; top: Tile[]; left: Tile[]; w: number; h: number } {
  const cols = [...Array<number>(a).fill(X_LEN), ...Array<number>(Math.abs(b)).fill(1)];
  const rows = [...Array<number>(c).fill(X_LEN), ...Array<number>(Math.abs(d)).fill(1)];
  const colNeg = (i: number) => i >= a && b < 0;
  const rowNeg = (j: number) => j >= c && d < 0;
  const kind = (u: number, v: number): TileKind => (u > 1 && v > 1 ? "x2" : u > 1 || v > 1 ? "x" : "one");
  const xs = cols.reduce<number[]>((s, w, i) => [...s, i ? s[i - 1] + cols[i - 1] : 0], []);
  const ys = rows.reduce<number[]>((s, h, j) => [...s, j ? s[j - 1] + rows[j - 1] : 0], []);
  const tiles: Tile[] = [];
  rows.forEach((h, j) =>
    cols.forEach((w, i) => tiles.push({ kind: kind(w, h), neg: colNeg(i) !== rowNeg(j), x: xs[i], y: ys[j], w, h })),
  );
  const top = cols.map((w, i): Tile => ({ kind: w > 1 ? "x" : "one", neg: colNeg(i), x: xs[i], y: -1 - gap, w, h: 1 }));
  const left = rows.map((h, j): Tile => ({ kind: h > 1 ? "x" : "one", neg: rowNeg(j), x: -1 - gap, y: ys[j], w: 1, h }));
  return { tiles, top, left, w: cols.reduce((s, v) => s + v, 0), h: rows.reduce((s, v) => s + v, 0) };
}

/** The tiles of [x², x, 1] counts laid in rows by kind, in tile units (a row per kind, wrapping at `width`). */
export function rows(pos: Counts, neg: Counts, width: number, gap = 0.3): { tiles: Tile[]; h: number } {
  const tiles: Tile[] = [];
  let y = 0;
  TILE_KINDS.forEach((kind, k) => {
    const [w, h] = kind === "x2" ? [X_LEN, X_LEN] : kind === "x" ? [1, X_LEN] : [1, 1];
    const all = [...Array<boolean>(pos[k]).fill(false), ...Array<boolean>(neg[k]).fill(true)];
    if (!all.length) return;
    let x = 0;
    for (const isNeg of all) {
      if (x + w > width + 1e-9) {
        x = 0;
        y += h + gap;
      }
      tiles.push({ kind, neg: isNeg, x, y, w, h });
      x += w + gap;
    }
    y += h + gap * 3;
  });
  return { tiles, h: Math.max(0, y - gap * 3) };
}
