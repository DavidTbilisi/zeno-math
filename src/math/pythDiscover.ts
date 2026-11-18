// Discover Pythagoras: the player finds a² + b² = c² before being told it. Easy draws a right triangle on a grid with
// a square on each side: drag the ends of the two shorter sides to make triangles of different shapes, measure them
// into a table, then make a rule from the sides or their squares (a or a², + − or ×, b or b², against c or c²) and
// claim the one that holds in every row; once found it is named. Later puzzles ask for a shorter side the same way
// (c² − a² = b²). Medium keeps the two shorter sides and opens or closes the corner between them: stop where the two
// small squares exactly make the big one (only at 90°), or where the big one is more or less, so the rule is a test
// for a right angle. Hard uses it: two sides measured, the third out of reach, four lengths to choose from (the sides
// added or taken away, the square left unrooted, the squares the wrong way round).
import type { EndlessGame, GameLevel, TryGame } from "./ladder";
import { rng } from "./random";

export type Side = "a" | "b" | "c";
/** A side or its square. */
export type Pow = 1 | 2;
export type POp = "+" | "−" | "×";
export const P_OPS: readonly POp[] = ["+", "−", "×"];
export type Legs = { a: number; b: number };
/** Which side a rule makes from the other two: the long one (c), or a shorter one (b, a). */
export type Form = Side;
/** The rule tried: the first side to a power, an operation, the second side to a power, against the third to a power. */
export type Rule = { form: Form; p1: Pow; op: POp; p2: Pow; pr: Pow };

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
export const numText = (v: number) => String(round(v, 2));
/** The shorter sides can be dragged from 1 to 5 squares. */
export const LEG_RANGE: [number, number] = [1, 5];

export const sideOf = (s: Side, l: Legs) => (s === "c" ? Math.hypot(l.a, l.b) : l[s]);
/** A side's length or its square: c² exactly as a² + b², as the grid's squares count it. */
export const termOf = (s: Side, p: Pow, l: Legs) => (p === 1 ? sideOf(s, l) : s === "c" ? l.a * l.a + l.b * l.b : l[s] * l[s]);
/** The rule's sides: the first two, then the one they make. */
export const partsOf = (f: Form): [Side, Side, Side] => (f === "c" ? ["a", "b", "c"] : f === "b" ? ["c", "a", "b"] : ["c", "b", "a"]);
export const leftOf = (r: Rule, l: Legs) => {
  const [x, y] = partsOf(r.form);
  const [u, v] = [termOf(x, r.p1, l), termOf(y, r.p2, l)];
  return r.op === "+" ? u + v : r.op === "−" ? u - v : u * v;
};
export const rightOf = (r: Rule, l: Legs) => termOf(partsOf(r.form)[2], r.pr, l);
export const holds = (r: Rule, l: Legs) => Math.abs(leftOf(r, l) - rightOf(r, l)) < 1e-9;
export const holdsAll = (r: Rule, rows: Legs[]) => rows.length > 0 && rows.every((l) => holds(r, l));
/** Pythagoras the way round the form asks: a² + b² = c², or c² − a² = b². */
export const isPythagoras = (r: Rule) => r.p1 === 2 && r.p2 === 2 && r.pr === 2 && r.op === (r.form === "c" ? "+" : "−");
export const termText = (s: Side, p: Pow) => (p === 2 ? `${s}²` : s);
export const leftText = (r: Rule) => {
  const [x, y] = partsOf(r.form);
  return `${termText(x, r.p1)} ${r.op} ${termText(y, r.p2)}`;
};
export const ruleText = (r: Rule) => `${leftText(r)} = ${termText(partsOf(r.form)[2], r.pr)}`;

/** The rows as legs: a measured triangle is kept as 10a + b. */
export const legsOf = (n: number): Legs => ({ a: Math.floor(n / 10), b: n % 10 });
export const codeOf = (l: Legs) => 10 * l.a + l.b;
/** Whether the rows are enough to claim a rule on: three triangles, both shorter sides changed at least once. */
export const enoughRows = (rows: Legs[]) => rows.length >= ROWS_NEEDED && new Set(rows.map((l) => l.a)).size > 1 && new Set(rows.map((l) => l.b)).size > 1;
export const ROWS_NEEDED = 3;
export const ROWS_MAX = 5;

// ---------- medium: the corner opened and closed ----------

/** The corner between the two shorter sides can be opened from 30° to 150°. */
export const CORNER_RANGE: [number, number] = [30, 150];
/** The long side's square with the corner at `deg`: the two small squares, less or more as the corner closes or opens. */
export const c2At = (l: Legs, deg: number) => round(l.a * l.a + l.b * l.b - 2 * l.a * l.b * Math.cos((deg * Math.PI) / 180), 2);
export type Goal = "equal" | "more" | "less";
/** The corners that answer a goal: only 90° makes the squares equal; wider makes c² more, sharper less. */
export const meets = (g: Goal, deg: number) => (g === "equal" ? deg === 90 : g === "more" ? deg > 90 : deg < 90);

// ---------- hard: a side out of reach ----------

export type ReachSlip = "sides" | "noRoot" | "wrongWay";
/** Right triangles with whole sides, shorter first, none too thin to draw. */
export const P_TRIPLES: readonly [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [9, 12, 15],
  [8, 15, 17],
  [12, 16, 20],
  [15, 20, 25],
];
/** Hard's four lengths for the side missing: the right one; the sides added (or taken away); the square not rooted; the squares the wrong way round. */
export function reachChoices(t: Pick<ReachTask, "sides" | "missing">): { v: number; slip: ReachSlip | null }[] {
  const { a, b, c } = t.sides;
  if (t.missing === "c") {
    return [
      { v: c, slip: null },
      { v: a + b, slip: "sides" },
      { v: a * a + b * b, slip: "noRoot" },
      { v: round(Math.sqrt(Math.abs(b * b - a * a)), 2), slip: "wrongWay" },
    ];
  }
  const known = t.missing === "a" ? b : a;
  return [
    { v: t.sides[t.missing], slip: null },
    { v: c - known, slip: "sides" },
    { v: c * c - known * known, slip: "noRoot" },
    { v: round(Math.sqrt(c * c + known * known), 2), slip: "wrongWay" },
  ];
}
export const reachSlip = (t: ReachTask, v: number): ReachSlip | null => reachChoices(t).find((x) => x.v === v)?.slip ?? null;

// ---------- the tasks ----------

export type GrowTask = { level: 1; form: Form; start: Legs };
export type TurnTask = { level: 2; legs: Legs; goal: Goal; start: number };
export type ReachTask = { level: 3; sides: { a: number; b: number; c: number }; missing: Side; choices: number[] };
export type PythTask = GrowTask | TurnTask | ReachTask;

const shuffle = <T>(xs: readonly T[], next: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const reach = (t: [number, number, number], missing: Side, next: () => number): ReachTask => {
  const sides = { a: t[0], b: t[1], c: t[2] };
  return { level: 3, sides, missing, choices: shuffle(reachChoices({ sides, missing }).map((x) => x.v), next) };
};

export function pythTask(level: GameLevel, next: () => number): PythTask {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
  const leg = () => 1 + Math.floor(next() * 5);
  if (level === 1) return { level, form: pick(["c", "b", "a"] as const), start: { a: leg(), b: leg() } };
  if (level === 2) {
    const goal = pick(["equal", "more", "less"] as const);
    // Started well away from the answer: sharp for a right angle or a wider one, wide for a sharper one.
    const start = goal === "less" ? 110 + 5 * Math.floor(next() * 7) : 40 + 5 * Math.floor(next() * 7);
    return { level, legs: { a: 2 + Math.floor(next() * 4), b: 2 + Math.floor(next() * 4) }, goal, start };
  }
  return reach(pick(P_TRIPLES), pick(["a", "b", "c"] as const), next);
}

// ---------- the board's game ----------

/** Nine puzzles: c from a and b, then b from c and a, then a from c and b; three corners; three sides out of reach. */
export const PYTH_LADDER: PythTask[] = [
  { level: 1, form: "c", start: { a: 2, b: 3 } },
  { level: 1, form: "b", start: { a: 3, b: 1 } },
  { level: 1, form: "a", start: { a: 4, b: 2 } },
  { level: 2, legs: { a: 3, b: 4 }, goal: "equal", start: 55 },
  { level: 2, legs: { a: 4, b: 4 }, goal: "more", start: 60 },
  { level: 2, legs: { a: 2, b: 5 }, goal: "less", start: 125 },
  reach([6, 8, 10], "c", rng(4)),
  reach([5, 12, 13], "b", rng(5)),
  reach([8, 15, 17], "a", rng(6)),
];
export const pythStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

export type PythNotice = "anyShape" | "onlyRight" | "outOfReach" | "streak10";
export const PYTH_NOTICES: PythNotice[] = ["anyShape", "onlyRight", "outOfReach", "streak10"];
export function pythNotice(t: PythTask, misses: number, streak: number): PythNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  return t.level === 1 ? "anyShape" : t.level === 2 ? "onlyRight" : "outOfReach";
}

export type PythSaid =
  | { kind: "again" }
  | { kind: "fewRows" }
  | { kind: "fails"; rule: Rule }
  | { kind: "off"; at: number }
  | { kind: "pick"; v: number };
export type LivePythDiscover = EndlessGame<PythNotice, GameLevel, PythSaid> &
  TryGame & {
    /** Easy: the shorter sides now, as 10a + b; medium: the corner now, in degrees; null before the first move. */
    n: number | null;
    /** The triangles (easy, as 10a + b) or corners (medium) measured, in order. */
    rows: number[];
    /** The rule being made: the powers of its three sides and the operation. */
    p1: Pow | null;
    op: POp | null;
    p2: Pow | null;
    pr: Pow | null;
    /** The rules tried, newest last. */
    tried: Rule[];
  };
export const pythNow = (d: Pick<LivePythDiscover, "mode" | "stage" | "level" | "seed">): PythTask =>
  d.mode === "puzzle" ? PYTH_LADDER[d.stage] : pythTask(d.level, rng(d.seed));
export const ruleOf = (form: Form, d: Pick<LivePythDiscover, "p1" | "op" | "p2" | "pr">): Rule | null =>
  d.p1 && d.op && d.p2 && d.pr ? { form, p1: d.p1, op: d.op, p2: d.p2, pr: d.pr } : null;
