// 2D vectors worked by hand (#717). The tip of a vector is dragged about a square grid (or pressed into place, or moved
// by the arrow keys) and its numbers are read off as it moves; only once the tip has been moved to a few places does
// the right tile count, so the rule is found by watching before it is said. Rounds: the length from the components, the
// direction's tangent, a + b by components (with |a + b| against |a| + |b|), and the unit vector v ÷ |v|.
// src/live/VecFind.tsx draws it; everything here is plain data.

export type VecRound = { kind: "length" } | { kind: "direction" } | { kind: "add" } | { kind: "unit" };

export const VEC_LADDER: VecRound[] = [{ kind: "length" }, { kind: "direction" }, { kind: "add" }, { kind: "unit" }];

export type LiveVecFind = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** The tip of the vector being moved, in grid units. */
  x: number;
  y: number;
  /** How many times the tip has been moved somewhere new this round (at most 3). */
  seen: number;
  /** Where the tip was when it last counted as moved. */
  from: [number, number];
  /** The tile tapped last in this round, and whether it was right. */
  said: { v: string; ok: boolean } | null;
};

/** How far the tip can go from the origin along each axis. */
export const REACH = 6;
/** The fixed vector a in the adding round. */
export const A_FIXED: [number, number] = [3, 1];
/** Moves needed before a right tile counts. */
export const MOVES = 2;

const START: Record<VecRound["kind"], [number, number]> = { length: [3, 4], direction: [4, 3], add: [1, 3], unit: [4, 2] };
const at = (round: number): LiveVecFind => {
  const [x, y] = START[VEC_LADDER[round]?.kind ?? "length"];
  return { round, x, y, seen: 0, from: [x, y], said: null };
};
export const VEC_FIND_START: LiveVecFind = at(0);

export const roundOf = (s: LiveVecFind) => VEC_LADDER[s.round] ?? null;

/** The tip moved to (x, y), rounded to the grid and kept on it (never at the origin): counted as moved once it has gone
 * two squares or more from where it last counted. */
export function move(s: LiveVecFind, x: number, y: number): LiveVecFind {
  if (!roundOf(s)) return s;
  const clamp = (v: number) => Math.max(-REACH, Math.min(REACH, Math.round(v)));
  const [nx, ny] = [clamp(x), clamp(y)];
  if (nx === 0 && ny === 0) return s;
  const far = Math.abs(nx - s.from[0]) + Math.abs(ny - s.from[1]) >= 2;
  return far ? { ...s, x: nx, y: ny, seen: Math.min(3, s.seen + 1), from: [nx, ny] } : { ...s, x: nx, y: ny };
}

const dp = (v: number, n: number) => Math.round(v * 10 ** n) / 10 ** n + 0;

/** What the round shows: components, lengths to two places, the angle to one place, the tangent to two. */
export function readings(s: LiveVecFind): Record<string, number> {
  const r = roundOf(s);
  if (!r) return {};
  const { x, y } = s;
  const len = Math.hypot(x, y);
  if (r.kind === "length") return { x, y, len: dp(len, 2) };
  if (r.kind === "direction") return { x, y, t: dp(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360, 1), tan: x === 0 ? NaN : dp(Math.tan(Math.atan2(y, x)), 2), ratio: x === 0 ? NaN : dp(y / x, 2) };
  if (r.kind === "add") {
    const [ax, ay] = A_FIXED;
    return { ax, ay, bx: x, by: y, sx: ax + x, sy: ay + y, la: dp(Math.hypot(ax, ay), 2), lb: dp(len, 2), ls: dp(Math.hypot(ax + x, ay + y), 2) };
  }
  return { x, y, len: dp(len, 2), ux: dp(x / len, 2), uy: dp(y / len, 2), ulen: dp(Math.hypot(x / len, y / len), 2) };
}

/** A round's tiles, the right one first; each is a key of the piece's words. */
export function tiles(s: LiveVecFind): { right: string; slip: string; other: string } | null {
  const r = roundOf(s);
  if (!r) return null;
  if (r.kind === "length") return { right: "rootSquares", slip: "addXY", other: "larger" };
  if (r.kind === "direction") return { right: "yOverX", slip: "xOverY", other: "yMinusX" };
  if (r.kind === "add") return { right: "addParts", slip: "addLengths", other: "multiplyParts" };
  return { right: "one", slip: "lenV", other: "dependsV" };
}

/** The tiles in the order they are shown: turned round by one place each round, so the right one is not always first. */
export function order(s: LiveVecFind): string[] {
  const t = tiles(s);
  if (!t) return [];
  const list = [t.right, t.slip, t.other];
  const k = (s.round * 2 + 1) % 3;
  return [...list.slice(k), ...list.slice(0, k)];
}

/** A tile tapped: right only once the tip has been moved to a few places. A right answer stands until Next. */
export function tap(s: LiveVecFind, v: string): LiveVecFind {
  const t = tiles(s);
  if (!t || s.said?.ok) return s;
  return { ...s, said: { v, ok: v === t.right && s.seen >= MOVES } };
}

/** The next round, its tip back where the round starts it. */
export const next = (s: LiveVecFind): LiveVecFind => at(Math.min(VEC_LADDER.length, s.round + 1));

/** The ladder started again. */
export const again = (): LiveVecFind => VEC_FIND_START;
