// Long division done by hand with base-ten blocks: the dividend's hundreds, tens and ones in a pool, dragged into b
// groups, a block that can't go round changed for ten of the next place. The arrangement is the pupil's; it is read
// back as the steps of the written division it has reached (blocksState gives the arrangement after each step).
import type { DivisionPlan } from "./division";
import { blocksState } from "./divisionBlocks";
import type { Counts, PVKind } from "./placeValue";

export type Sharing = { pool: Counts; groups: Counts[] };
/** Where a block is: the pool, or group i. */
export type Spot = "pool" | number;

const LOWER: Partial<Record<PVKind, PVKind>> = { h: "t", t: "o" };
const KINDS: PVKind[] = ["h", "t", "o"];
const same = (x: Counts, y: Counts) => KINDS.every((k) => x[k] === y[k]);
export const countsValue = (c: Counts) => 100 * c.h + 10 * c.t + c.o;

/** The arrangement after the first k steps of the written division. */
export function sharingAt(plan: DivisionPlan, b: number, k: number): Sharing {
  const st = blocksState(plan, b, k);
  return { pool: { ...st.pool }, groups: Array.from({ length: b }, () => ({ ...st.group })) };
}

/** One block of a kind from one spot to another; null when there is none there to move. */
export function moveBlock(s: Sharing, kind: PVKind, from: Spot, to: Spot): Sharing | null {
  if (from === to) return null;
  const at = (x: Sharing, p: Spot) => (p === "pool" ? x.pool : x.groups[p]);
  if (!at(s, from) || !at(s, to) || at(s, from)[kind] < 1) return null;
  const next: Sharing = { pool: { ...s.pool }, groups: s.groups.map((g) => ({ ...g })) };
  at(next, from)[kind]--;
  at(next, to)[kind]++;
  return next;
}

/** A block in the pool changed for ten of the next place down; null for a one, or when the pool has none. */
export function tradeBlock(s: Sharing, kind: PVKind): Sharing | null {
  const lower = LOWER[kind];
  if (!lower || s.pool[kind] < 1) return null;
  return { pool: { ...s.pool, [kind]: s.pool[kind] - 1, [lower]: s.pool[lower] + 10 }, groups: s.groups };
}

/** The group a tapped pool block goes to: the first of those with the fewest of its kind. */
export const dealTo = (s: Sharing, kind: PVKind): number => s.groups.reduce((best, g, i) => (g[kind] < s.groups[best][kind] ? i : best), 0);

/** How many steps of the written division the groups show: the last k whose share every group holds exactly. */
export function stepsShared(plan: DivisionPlan, b: number, s: Sharing): number {
  let k = 0;
  for (let i = 1; i <= plan.steps.length; i++) if (s.groups.every((g) => same(g, blocksState(plan, b, i).group))) k = i;
  return k;
}

export type ShareStatus =
  | { kind: "unfair" }
  | { kind: "more"; place: PVKind }
  | { kind: "trade"; place: PVKind; n: number }
  | { kind: "done"; each: number; left: number };

/**
 * What to do next, place by place from the hundreds down as in the written division: share fairly, give out more of
 * the highest place that can go round, change what is left of it for ten of the next place, or finished.
 */
export function shareStatus(s: Sharing): ShareStatus {
  const b = s.groups.length;
  if (!s.groups.every((g) => same(g, s.groups[0]))) return { kind: "unfair" };
  for (const k of KINDS) {
    if (s.pool[k] >= b) return { kind: "more", place: k };
    if (k !== "o" && s.pool[k] > 0) return { kind: "trade", place: k, n: s.pool[k] };
  }
  return { kind: "done", each: countsValue(s.groups[0]), left: countsValue(s.pool) };
}
