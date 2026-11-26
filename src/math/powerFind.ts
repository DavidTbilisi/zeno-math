// The laws of powers found by hand (#720). Rows of 2s are made longer or shorter by dragging their ends (or by the
// arrow keys), and what they come to is counted as they change; only once the rows have been changed a few times does
// the right tile count, so the law is found by watching before it is said. Rounds: a product of powers (the rows
// joined), a quotient (pairs cancelled top against bottom), a power of a power (a row copied), and a quotient whose
// bottom may be the longer, where the exponent goes to zero and below. src/live/PowerFind.tsx draws it; everything
// here is plain data.

export type PowerRound = { kind: "product" } | { kind: "quotient" } | { kind: "power" } | { kind: "negative" };

export const POWER_LADDER: PowerRound[] = [{ kind: "product" }, { kind: "quotient" }, { kind: "power" }, { kind: "negative" }];

export type LivePowerFind = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** The two counts the rows show: m and n. */
  m: number;
  n: number;
  /** How many times a count has been changed this round (at most 3). */
  seen: number;
  /** The tile tapped last in this round, and whether it was right. */
  said: { v: string; ok: boolean } | null;
};

/** The base every row is made of. */
export const BASE = 2;
/** The longest a row can be. */
export const MOST = 6;
/** Changes needed before a right tile counts. */
export const MOVES = 2;

const START: Record<PowerRound["kind"], [number, number]> = { product: [3, 2], quotient: [5, 2], power: [3, 2], negative: [2, 4] };
const at = (round: number): LivePowerFind => {
  const [m, n] = START[POWER_LADDER[round]?.kind ?? "product"];
  return { round, m, n, seen: 0, said: null };
};
export const POWER_FIND_START: LivePowerFind = at(0);

export const roundOf = (s: LivePowerFind) => POWER_LADDER[s.round] ?? null;

/** The smallest n a round allows: a quotient keeps its bottom shorter than its top until the last round. */
const least = (s: LivePowerFind, which: "m" | "n") => (which === "m" && roundOf(s)?.kind === "quotient" ? s.n + 1 : 1);
const most = (s: LivePowerFind, which: "m" | "n") => (which === "n" && roundOf(s)?.kind === "quotient" ? s.m - 1 : MOST);

/** One count set to k, kept inside what the round allows; a change counts once. */
export function setCount(s: LivePowerFind, which: "m" | "n", k: number): LivePowerFind {
  if (!roundOf(s)) return s;
  const v = Math.max(least(s, which), Math.min(most(s, which), Math.round(k)));
  if (v === s[which]) return s;
  return { ...s, [which]: v, seen: Math.min(3, s.seen + 1) };
}

/** What the rows come to: how many 2s in all, how many cancel, and the exponent the result has. */
export function readings(s: LivePowerFind): { twos: number; cancel: number; exp: number; value: number } {
  const r = roundOf(s);
  const { m, n } = s;
  if (!r) return { twos: 0, cancel: 0, exp: 0, value: 1 };
  if (r.kind === "product") return { twos: m + n, cancel: 0, exp: m + n, value: BASE ** (m + n) };
  if (r.kind === "power") return { twos: m * n, cancel: 0, exp: m * n, value: BASE ** (m * n) };
  return { twos: Math.abs(m - n), cancel: Math.min(m, n), exp: m - n, value: BASE ** (m - n) };
}

/** A round's tiles, the right one first; each is a key of the piece's words. */
export function tiles(s: LivePowerFind): { right: string; slip: string; other: string } | null {
  const r = roundOf(s);
  if (!r) return null;
  if (r.kind === "product") return { right: "addExp", slip: "mulExp", other: "maxExp" };
  if (r.kind === "quotient") return { right: "subExp", slip: "divExp", other: "addExp" };
  if (r.kind === "power") return { right: "mulExp", slip: "addExp", other: "powExp" };
  return { right: "subBelow", slip: "zeroBelow", other: "flipSub" };
}

/** The tiles in the order they are shown: turned round by one place each round, so the right one is not always first. */
export function order(s: LivePowerFind): string[] {
  const t = tiles(s);
  if (!t) return [];
  const list = [t.right, t.slip, t.other];
  const k = (s.round * 2 + 1) % 3;
  return [...list.slice(k), ...list.slice(0, k)];
}

/** A tile tapped: right only once the rows have been changed a few times. A right answer stands until Next. */
export function tap(s: LivePowerFind, v: string): LivePowerFind {
  const t = tiles(s);
  if (!t || s.said?.ok) return s;
  return { ...s, said: { v, ok: v === t.right && s.seen >= MOVES } };
}

/** The next round, its rows as the round starts them. */
export const next = (s: LivePowerFind): LivePowerFind => at(Math.min(POWER_LADDER.length, s.round + 1));

/** The ladder started again. */
export const again = (): LivePowerFind => POWER_FIND_START;
