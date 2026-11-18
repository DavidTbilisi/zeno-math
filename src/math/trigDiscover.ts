// Discover trig: the player finds sin, cos and tan before being told them. Easy keeps θ fixed and lets the triangle
// grow and shrink: measure it at three sizes, then combine two sides (added, taken away, multiplied or divided) into a
// new column of the table, and claim one that stays the same in every row; only a ratio does, and once found it is
// named (opp ÷ hyp is sin θ). Medium keeps the hypotenuse at 10 and turns θ: measure as it turns, and stop at the angle
// where a ratio hits a value (opp ÷ hyp = 0.5 at 30°), so the angle alone decides the ratio. Hard uses it: a triangle
// too big to measure, one side known, and a small triangle with the same angle beside it; choose the length asked for
// from four, the others the same difference (adding where growing multiplies), the ratio upside down, the wrong side.
import type { EndlessGame, GameLevel, TryGame } from "./ladder";
import { rng } from "./random";
import { RATIO_PARTS, type TrigName, type TrigRatio } from "./trigBuild";

export type Op = "+" | "−" | "×" | "÷";
export const OPS: readonly Op[] = ["+", "−", "×", "÷"];
export const SIDE_NAMES: readonly TrigName[] = ["opp", "adj", "hyp"];
export type Sides = Record<TrigName, number>;
/** A column the player adds to the table: two sides and what is done with them. */
export type Column = { a: TrigName; op: Op; b: TrigName };
const RATIOS: TrigRatio[] = ["sin", "cos", "tan"];

/** Right triangles whose sides stay to one decimal at every tenth of their size: legs, then the hypotenuse. */
export const DISCOVER_TRIPLES: readonly [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
];
/** A triangle of easy and hard: a triple, and which of its legs is across from θ. */
export type Shape = { triple: [number, number, number]; across: 0 | 1 };

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
/** A number as the table writes it: at most two decimals, none trailing. */
export const numText = (v: number) => String(round(v, 2));

/** The sides at size `n` (tenths of the triple): one decimal each. */
export const sidesAt = (s: Shape, n: number): Sides => ({
  opp: (s.triple[s.across] * n) / 10,
  adj: (s.triple[1 - s.across] * n) / 10,
  hyp: (s.triple[2] * n) / 10,
});
/** θ in whole degrees. */
export const angleOf = (s: Shape) => Math.round((Math.atan2(s.triple[s.across], s.triple[1 - s.across]) * 180) / Math.PI);
/** The sizes a triangle can be dragged to: its hypotenuse from about 2.5 to about 10.5. */
export const sizeRange = (s: Shape): [number, number] => [Math.ceil(25 / s.triple[2]), Math.floor(105 / s.triple[2])];

/** The sides with the hypotenuse kept at 10 and θ in degrees: two decimals each. */
export const sidesTurned = (deg: number): Sides => {
  const r = (deg * Math.PI) / 180;
  return { opp: round(10 * Math.sin(r), 2), adj: round(10 * Math.cos(r), 2), hyp: 10 };
};
/** The angles medium can be turned to. */
export const TURN_RANGE: [number, number] = [5, 85];

export const valueOf = (c: Column, s: Sides): number => {
  const [x, y] = [s[c.a], s[c.b]];
  const v = c.op === "+" ? x + y : c.op === "−" ? x - y : c.op === "×" ? x * y : x / y;
  return round(v, 2);
};
export const columnText = (c: Column, short: Record<TrigName, string>) => `${short[c.a]} ${c.op} ${short[c.b]}`;
/** Whether a column has the same value in every row (two rows at least). */
export const steady = (c: Column, rows: Sides[]) => rows.length >= 2 && rows.every((r) => Math.abs(valueOf(c, r) - valueOf(c, rows[0])) < 1e-6);
/** The ratio a column is, and whether it is upside down (hyp ÷ opp is sin upside down). */
export function ratioOf(c: Column): { r: TrigRatio; flip: boolean } | null {
  if (c.op !== "÷") return null;
  for (const r of RATIOS) {
    const [p, q] = RATIO_PARTS[r];
    if (c.a === p && c.b === q) return { r, flip: false };
    if (c.a === q && c.b === p) return { r, flip: true };
  }
  return null;
}
/** The ratio of a pair of sides, whichever way round. */
export const ratioOfPair = (p: [TrigName, TrigName]) => RATIOS.find((r) => RATIO_PARTS[r].includes(p[0]) && RATIO_PARTS[r].includes(p[1]))!;
export const exactValue = (r: TrigRatio, deg: number) => {
  const x = (deg * Math.PI) / 180;
  return r === "sin" ? Math.sin(x) : r === "cos" ? Math.cos(x) : Math.tan(x);
};
/** The angle a ratio's value belongs to, in degrees. */
export const angleFor = (r: TrigRatio, v: number) => ((r === "sin" ? Math.asin(v) : r === "cos" ? Math.acos(v) : Math.atan(v)) * 180) / Math.PI;

// ---------- the tasks ----------

/** Easy: one shape to measure at several sizes, and the pair of sides to combine (any pair, or one named). */
export type GrowTask = { level: 1; shape: Shape; goal: [TrigName, TrigName] | null; start: number };
/** Medium: a ratio and the value to make it, the hypotenuse kept at 10 and θ turned from `start`. */
export type TurnTask = { level: 2; ratio: TrigRatio; value: number; start: number };
/** Hard: a small triangle measured, a big one `times` as large with side `given` known; find side `want`. */
export type ReachTask = { level: 3; shape: Shape; given: TrigName; want: TrigName; times: number; choices: number[] };
export type DiscoverTask = GrowTask | TurnTask | ReachTask;

/** The angle medium is after: the whole degree nearest to the one with that value. */
export const turnTarget = (t: Pick<TurnTask, "ratio" | "value">) => Math.round(angleFor(t.ratio, t.value));
/** A ratio's value as medium asks it: two decimals. */
export const turnValue = (r: TrigRatio, deg: number) => round(exactValue(r, deg), 2);
/** Whether the ratio grows as θ does: sin and tan do, cos shrinks. */
export const grows = (r: TrigRatio) => r !== "cos";

export type ReachSlip = "add" | "flip" | "other";
/** Hard's four lengths: the right one, the same difference, the ratio upside down, the wrong side of the small one. */
export function reachChoices(t: Pick<ReachTask, "shape" | "given" | "want" | "times">): { v: number; slip: ReachSlip | null }[] {
  const s = sidesAt(t.shape, 10);
  const big = s[t.given] * t.times;
  const third = SIDE_NAMES.find((n) => n !== t.given && n !== t.want)!;
  return [
    { v: round(s[t.want] * t.times, 2), slip: null },
    { v: round(big + s[t.want] - s[t.given], 2), slip: "add" },
    { v: round((big * s[t.given]) / s[t.want], 2), slip: "flip" },
    { v: round((big * s[third]) / s[t.given], 2), slip: "other" },
  ];
}
export const reachSlip = (t: ReachTask, v: number): ReachSlip | null => reachChoices(t).find((c) => c.v === v)?.slip ?? null;
export const reachAnswer = (t: ReachTask) => reachChoices(t)[0].v;

const shuffle = <T>(xs: readonly T[], next: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const reach = (shape: Shape, given: TrigName, want: TrigName, times: number, next: () => number): ReachTask => {
  const t = { level: 3 as const, shape, given, want, times };
  return { ...t, choices: shuffle(reachChoices(t).map((c) => c.v), next) };
};
/** Whether hard's four lengths are four different positive numbers. */
const distinct = (t: Pick<ReachTask, "shape" | "given" | "want" | "times">) => {
  const vs = reachChoices(t).map((c) => c.v);
  return new Set(vs).size === vs.length && vs.every((v) => v > 0);
};

const PAIRS: [TrigName, TrigName][] = [
  ["opp", "hyp"],
  ["adj", "hyp"],
  ["opp", "adj"],
];
const TURN_ANGLES = [30, 37, 45, 53, 60];

export function discoverTask(level: GameLevel, next: () => number): DiscoverTask {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
  const shape: Shape = { triple: pick(DISCOVER_TRIPLES), across: next() < 0.5 ? 0 : 1 };
  if (level === 1) {
    const [lo, hi] = sizeRange(shape);
    return { level, shape, goal: pick(PAIRS), start: lo + Math.floor(next() * (hi - lo + 1)) };
  }
  if (level === 2) {
    const ratio = pick(RATIOS);
    const target = pick(TURN_ANGLES);
    const start = target < 45 ? 60 + Math.floor(next() * 20) : 10 + Math.floor(next() * 20);
    return { level, ratio, value: turnValue(ratio, target), start };
  }
  for (;;) {
    const given = pick(SIDE_NAMES);
    const want = pick(SIDE_NAMES.filter((n) => n !== given));
    const times = pick([2, 3, 4, 5]);
    if (distinct({ shape, given, want, times })) return reach(shape, given, want, times, next);
  }
}

// ---------- the board's game ----------

/** The nine puzzles: three triangles grown (any ratio, then cos's pair, then tan's), three turned, three reached. */
export const DISCOVER_LADDER: DiscoverTask[] = [
  { level: 1, shape: { triple: [3, 4, 5], across: 0 }, goal: null, start: 8 },
  { level: 1, shape: { triple: [5, 12, 13], across: 1 }, goal: ["adj", "hyp"], start: 3 },
  { level: 1, shape: { triple: [8, 15, 17], across: 0 }, goal: ["opp", "adj"], start: 3 },
  { level: 2, ratio: "sin", value: 0.5, start: 65 },
  { level: 2, ratio: "cos", value: 0.5, start: 20 },
  { level: 2, ratio: "tan", value: 1, start: 70 },
  reach({ triple: [3, 4, 5], across: 0 }, "hyp", "opp", 4, rng(7)),
  reach({ triple: [5, 12, 13], across: 1 }, "adj", "opp", 2, rng(8)),
  reach({ triple: [8, 15, 17], across: 0 }, "opp", "hyp", 3, rng(9)),
];
/** Stars by the wrong claims over the whole puzzle: none three, one two, more one. Measuring and trying cost nothing. */
export const discoverStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

export type DiscoverNotice = "anySize" | "flipped" | "angleDecides" | "outOfReach" | "streak10";
export const DISCOVER_NOTICES: DiscoverNotice[] = ["anySize", "flipped", "angleDecides", "outOfReach", "streak10"];
/** What a puzzle solved shows: a ratio found upside down; with no miss, the size not mattering, the angle deciding, a side out of reach; ten in a row. */
export function discoverNotice(t: DiscoverTask, misses: number, streak: number, flipped: boolean): DiscoverNotice | null {
  if (streak === 10) return "streak10";
  if (flipped) return "flipped";
  if (misses > 0) return null;
  return t.level === 1 ? "anySize" : t.level === 2 ? "angleDecides" : "outOfReach";
}

/** How many rows easy wants before a column can be claimed, and how many the table holds. */
export const ROWS_NEEDED = 3;
export const ROWS_MAX = 5;

export type DiscoverSaid =
  | { kind: "again" }
  | { kind: "changes"; col: Column }
  | { kind: "otherPair"; col: Column }
  | { kind: "off"; at: number }
  | { kind: "pick"; v: number };
export type LiveDiscover = EndlessGame<DiscoverNotice, GameLevel, DiscoverSaid> &
  TryGame & {
    /** The size now (easy, tenths of the triple) or θ now (medium, degrees); null before the first drag. */
    n: number | null;
    /** The sizes or angles measured, in the order they were. */
    rows: number[];
    /** The column being made: its first side, what is done, its second side. */
    a: TrigName | null;
    op: Op | null;
    b: TrigName | null;
    /** The columns tried, newest last. */
    tried: Column[];
    /** Easy: the column claimed was a ratio upside down. */
    flipped: boolean;
  };
export const discoverNow = (d: Pick<LiveDiscover, "mode" | "stage" | "level" | "seed">): DiscoverTask =>
  d.mode === "puzzle" ? DISCOVER_LADDER[d.stage] : discoverTask(d.level, rng(d.seed));
/** The column being made, once its three parts are chosen. */
export const columnOf = (d: Pick<LiveDiscover, "a" | "op" | "b">): Column | null => (d.a && d.op && d.b ? { a: d.a, op: d.op, b: d.b } : null);
/** The rows of the table as sides. */
export const rowSides = (t: DiscoverTask, rows: number[]): Sides[] =>
  t.level === 1 ? rows.map((n) => sidesAt(t.shape, n)) : t.level === 2 ? rows.map(sidesTurned) : [];
/** Easy's claim judged: right, true but of another pair, or not the same in every row. */
export function judgeClaim(t: GrowTask, c: Column, rows: Sides[]): "right" | "otherPair" | "changes" {
  if (!steady(c, rows)) return "changes";
  if (t.goal && !(t.goal.includes(c.a) && t.goal.includes(c.b))) return "otherPair";
  return "right";
}
