// Slice the pizza: guests walk up to the table, and before they get there the pizza must be cut into the slices the
// order asks for. Each tap on the pizza cuts it into one slice more, always equal; a fresh pizza starts again from one
// whole. Tapping the guests serves at once; when they reach the table it is served as it is. An order shares among k
// guests (k slices, each 1/k: more guests, smaller slices) or asks for slices of a size (each gets 1/m, with k guests).
// The orders, the clock and the judging are worked out here; the board's piece only draws them.
import { rng } from "./random";
import type { EndlessGame, GameLevel } from "./ladder";

/** The most slices a pizza is cut into. */
export const MAX_SLICES = 12;
/** How long a served order stays on the table before the next guests set off. */
export const SERVE_PAUSE = 1100;

export type PizzaOrder = { kind: "share" | "size"; k: number; want: number };
/** A wave: `orders` orders of a kind (or mixed), the slices wanted from `lo` to `hi`, the guests taking `walk` ms. */
export type PizzaSpec = { pick: "share" | "size" | "mix"; lo: number; hi: number; orders: number; walk: number };

export function pizzaWave(spec: PizzaSpec, next: () => number): PizzaOrder[] {
  const out: PizzaOrder[] = [];
  while (out.length < spec.orders) {
    const want = spec.lo + Math.floor(next() * (spec.hi - spec.lo + 1));
    if (out.length && out[out.length - 1].want === want) continue;
    const kind = spec.pick === "mix" ? (next() < 0.5 ? "share" : "size") : spec.pick;
    // Slices of a size feed fewer guests than slices, from 1 up.
    const k = kind === "share" ? want : 1 + Math.floor(next() * Math.min(want - 1, 5));
    out.push({ kind, k, want });
  }
  return out;
}

/** Why a pizza is not what the order asks: too few slices (or too big), too many (or too small). */
export type PizzaWhy = "few" | "many";
export const judgePizza = (o: PizzaOrder, n: number): PizzaWhy | null => (n === o.want ? null : n < o.want ? "few" : "many");

export type Served = { t: number; n: number; why: PizzaWhy | null; late: boolean };
export type PizzaSim = { t: number; at: number; n: number; since: number; served: Served | null; right: number; wrong: number };
export const startPizza = (): PizzaSim => ({ t: 0, at: 0, n: 1, since: 0, served: null, right: 0, wrong: 0 });
export type PizzaEvent = { kind: "served"; order: PizzaOrder; n: number; why: PizzaWhy | null; late: boolean };

export const pizzaOver = (sim: PizzaSim, orders: PizzaOrder[]) => sim.at >= orders.length;
const open = (sim: PizzaSim, orders: PizzaOrder[]) => !sim.served && !pizzaOver(sim, orders);

/** One more cut: one slice more, the slices kept equal. */
export const cutPizza = (sim: PizzaSim, orders: PizzaOrder[]): PizzaSim => (open(sim, orders) && sim.n < MAX_SLICES ? { ...sim, n: sim.n + 1 } : sim);
/** A fresh pizza: one whole again. */
export const freshPizza = (sim: PizzaSim, orders: PizzaOrder[]): PizzaSim => (open(sim, orders) ? { ...sim, n: 1 } : sim);

/** Serves the pizza as it is to the guests of the order under way. */
export function servePizza(sim: PizzaSim, orders: PizzaOrder[], late = false): { sim: PizzaSim; event: PizzaEvent | null } {
  if (!open(sim, orders)) return { sim, event: null };
  const order = orders[sim.at];
  const why = judgePizza(order, sim.n);
  const served = { t: sim.t, n: sim.n, why, late };
  return {
    sim: { ...sim, served, right: sim.right + (why ? 0 : 1), wrong: sim.wrong + (why ? 1 : 0) },
    event: { kind: "served", order, n: sim.n, why, late },
  };
}

/** Moves on to time t: guests who reach the table are served what there is; a served order gives way to the next. */
export function advancePizza(sim: PizzaSim, orders: PizzaOrder[], walk: number, t: number): { sim: PizzaSim; event: PizzaEvent | null } {
  let s = { ...sim, t };
  if (s.served && t - s.served.t >= SERVE_PAUSE) s = { ...s, at: s.at + 1, n: 1, since: t, served: null };
  if (open(s, orders) && t - s.since >= walk) return servePizza(s, orders, true);
  return { sim: s, event: null };
}

/** How far the guests have come, 0 at the door to 1 at the table. */
export const walked = (sim: PizzaSim, walk: number) => Math.min(1, (sim.served ? sim.served.t - sim.since : sim.t - sim.since) / walk);
export const pizzaStars = (wrong: number) => (wrong === 0 ? 3 : wrong === 1 ? 2 : 1);

// ---------- the board's game ----------

export const PIZZA_LADDER: { spec: PizzaSpec; seed: number }[] = [
  { spec: { pick: "share", lo: 2, hi: 4, orders: 4, walk: 9000 }, seed: 6002 },
  { spec: { pick: "share", lo: 2, hi: 6, orders: 5, walk: 8000 }, seed: 6008 },
  { spec: { pick: "share", lo: 3, hi: 8, orders: 5, walk: 7000 }, seed: 6003 },
  { spec: { pick: "size", lo: 2, hi: 6, orders: 4, walk: 8000 }, seed: 6007 },
  { spec: { pick: "size", lo: 4, hi: 8, orders: 5, walk: 7000 }, seed: 6015 },
  { spec: { pick: "mix", lo: 2, hi: 8, orders: 5, walk: 6500 }, seed: 6006 },
  { spec: { pick: "mix", lo: 3, hi: 10, orders: 6, walk: 6000 }, seed: 6009 },
  { spec: { pick: "mix", lo: 4, hi: 12, orders: 6, walk: 5500 }, seed: 6011 },
  { spec: { pick: "mix", lo: 2, hi: 12, orders: 7, walk: 5000 }, seed: 6011 },
];
export const PIZZA_LEVELS: Record<GameLevel, PizzaSpec> = {
  1: { pick: "share", lo: 3, hi: 8, orders: 5, walk: 7000 },
  2: { pick: "mix", lo: 2, hi: 8, orders: 5, walk: 6500 },
  3: { pick: "mix", lo: 2, hi: 12, orders: 6, walk: 5000 },
};
const quicker = (s: PizzaSpec): PizzaSpec => ({ ...s, walk: Math.round(s.walk * 0.8) });

export type PizzaNotice = "many" | "leftover" | "streak10";
export const PIZZA_NOTICES: PizzaNotice[] = ["many", "leftover", "streak10"];
/** What a right order shows: eight slices or more are small ones; slices of a size can leave some over. */
export const pizzaNotice = (o: PizzaOrder): PizzaNotice | null => (o.kind === "size" && o.k < o.want ? "leftover" : o.want >= 8 ? "many" : null);

export type PizzaSaid =
  | { kind: "right"; n: number; k: number; size: boolean }
  | { kind: "wrong"; why: PizzaWhy; n: number; want: number; size: boolean; late: boolean };
export type LivePizza = EndlessGame<PizzaNotice, GameLevel, PizzaSaid> & {
  done: boolean;
  right: number;
  wrong: number;
  /** Once the wave is over, each order and what it was served: [slices wanted, slices served]. */
  log?: [number, number][];
};
export const PIZZA_START: LivePizza = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, done: false, right: 0, wrong: 0, log: [] };

export function pizzaNow(d: Pick<LivePizza, "mode" | "stage" | "level" | "seed" | "timed">): { spec: PizzaSpec; orders: PizzaOrder[] } {
  const { spec: base, seed } = d.mode === "puzzle" ? PIZZA_LADDER[d.stage] : { spec: PIZZA_LEVELS[d.level], seed: d.seed };
  const spec = d.mode === "endless" && d.timed ? quicker(base) : base;
  return { spec, orders: pizzaWave(spec, rng(seed)) };
}
