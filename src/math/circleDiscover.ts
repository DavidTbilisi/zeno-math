// Discover the unit circle: sin and cos past 90° found from the first quarter before they are told. Easy puts P on a
// circle of radius 1 in the first quarter and draws its mirror Q in another quarter (across the up axis, through the
// centre, or across the across axis): drag P to measure angles into a table (θ, P's across x and up y, Q's angle and
// its across and up), then make a rule for Q (its angle from θ, its across and up from x and y, signs included) and
// claim the one that holds in every row; once found it is named (sin(180° − θ) = sin θ). Medium lets P go all the way
// round: an angle's sin or cos is given, find the other angle with the same value. Hard uses it: sin or cos of an angle
// past 90° from the first-quarter angle it mirrors, four values to choose from (the sign wrong, sin and cos swapped,
// both), a wrong one told why.
import type { EndlessGame, GameLevel, TryGame } from "./ladder";
import { rng } from "./random";

/** The mirror that makes Q from P: across the up axis (second quarter), through the centre (third), across the across axis (fourth). */
export type Mirror = "up" | "centre" | "across";
export const MIRRORS: readonly Mirror[] = ["up", "centre", "across"];
/** Q's angle from θ. */
export type AngleRule = "180−" | "180+" | "360−" | "90+";
export const ANGLE_RULES: readonly AngleRule[] = ["180−", "180+", "360−", "90+"];
/** Q's across or up, made from P's: its across x or its up y, the same or turned negative. */
export type Coord = "x" | "−x" | "y" | "−y";
export const X_COORDS: readonly Coord[] = ["x", "−x", "y", "−y"];
export const Y_COORDS: readonly Coord[] = ["y", "−y", "x", "−x"];
export type MirrorRule = { angle: AngleRule; qx: Coord; qy: Coord };
export type CircleFn = "sin" | "cos";

const RAD = Math.PI / 180;
const EPS = 1e-9;
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
export const norm = (a: number) => ((Math.round(a) % 360) + 360) % 360;
/** A value to two places, with a proper minus: −0.5. */
export const numText = (v: number) => {
  const r = round(v, 2);
  return r < 0 ? `−${Math.abs(r)}` : String(Math.abs(r));
};
export const cosOf = (t: number) => (Math.abs(Math.cos(t * RAD)) < EPS ? 0 : Math.cos(t * RAD));
export const sinOf = (t: number) => (Math.abs(Math.sin(t * RAD)) < EPS ? 0 : Math.sin(t * RAD));
export const fnOf = (fn: CircleFn, t: number) => (fn === "sin" ? sinOf(t) : cosOf(t));
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
/** P snaps to every 5°; easy keeps it in the first quarter, off the axes. */
export const STEP = 5;
export const FIRST_RANGE: [number, number] = [5, 85];
export const ROWS_NEEDED = 3;
export const ROWS_MAX = 5;

// ---------- easy: the mirror ----------

export const mirrorAngle = (m: Mirror, t: number) => norm(m === "up" ? 180 - t : m === "centre" ? 180 + t : 360 - t);
export const ruleAngle = (a: AngleRule, t: number) => norm(a === "180−" ? 180 - t : a === "180+" ? 180 + t : a === "360−" ? 360 - t : 90 + t);
export const coordOf = (c: Coord, t: number) => {
  const v = c === "x" || c === "−x" ? cosOf(t) : sinOf(t);
  return c.startsWith("−") ? -v : v;
};
/** Which parts of a rule hold for P at θ: Q's angle, its across, its up. */
export function partsHold(r: Partial<MirrorRule>, m: Mirror, t: number) {
  const q = mirrorAngle(m, t);
  return {
    angle: r.angle ? ruleAngle(r.angle, t) === q : null,
    qx: r.qx ? near(coordOf(r.qx, t), cosOf(q)) : null,
    qy: r.qy ? near(coordOf(r.qy, t), sinOf(q)) : null,
  };
}
export const holds = (r: MirrorRule, m: Mirror, t: number) => {
  const p = partsHold(r, m, t);
  return !!(p.angle && p.qx && p.qy);
};
export const holdsAll = (r: MirrorRule, m: Mirror, rows: number[]) => rows.length > 0 && rows.every((t) => holds(r, m, t));
/** The rule each mirror makes: (−x, y) at 180° − θ, (−x, −y) at 180° + θ, (x, −y) at 360° − θ. */
export const MIRROR_RULE: Record<Mirror, MirrorRule> = {
  up: { angle: "180−", qx: "−x", qy: "y" },
  centre: { angle: "180+", qx: "−x", qy: "−y" },
  across: { angle: "360−", qx: "x", qy: "−y" },
};
export const angleText = (a: AngleRule) => (a === "180−" ? "180° − θ" : a === "180+" ? "180° + θ" : a === "360−" ? "360° − θ" : "90° + θ");
export const ruleText = (r: MirrorRule) => `Q = (${r.qx}, ${r.qy}), ${angleText(r.angle)}`;

// ---------- medium: the twin angle ----------

/** The other angle with the same sin (across the up axis) or the same cos (across the across axis). */
export const twinOf = (fn: CircleFn, t: number) => norm(fn === "sin" ? 180 - t : 360 - t);

// ---------- hard: past 90° from the first quarter ----------

/** The first-quarter angle an angle mirrors: how far it is from the across axis. */
export function refOf(t: number) {
  const a = norm(t);
  return a <= 90 ? a : a <= 180 ? 180 - a : a <= 270 ? a - 180 : 360 - a;
}
export type ReachSlip = "sign" | "swap" | "both";
/** Hard's four values: the right one; the sign wrong; the other ratio of the reference angle; that with the sign wrong. */
export function reachChoices(t: Pick<ReachTask, "fn" | "angle">): { v: number; slip: ReachSlip | null }[] {
  const ref = refOf(t.angle);
  const v = round(fnOf(t.fn, t.angle), 2);
  const sign = v < 0 ? -1 : 1;
  const other = round(fnOf(t.fn === "sin" ? "cos" : "sin", ref), 2);
  return [
    { v, slip: null },
    { v: -v, slip: "sign" },
    { v: sign * other, slip: "swap" },
    { v: -sign * other, slip: "both" },
  ];
}
export const reachSlip = (t: ReachTask, v: number): ReachSlip | null => reachChoices(t).find((x) => x.v === v)?.slip ?? null;

// ---------- the tasks ----------

export type MirrorTask = { level: 1; mirror: Mirror; start: number };
export type TwinTask = { level: 2; fn: CircleFn; given: number; start: number };
export type ReachTask = { level: 3; fn: CircleFn; angle: number; choices: number[] };
export type CircleDiscoverTask = MirrorTask | TwinTask | ReachTask;

const shuffle = <T>(xs: readonly T[], next: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const reach = (fn: CircleFn, angle: number, next: () => number): ReachTask => ({ level: 3, fn, angle, choices: shuffle(reachChoices({ fn, angle }).map((x) => x.v), next) });

export function circleDiscoverTask(level: GameLevel, next: () => number): CircleDiscoverTask {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
  // Reference angles far enough from the axes that two places tell them apart: 15° to 75°.
  const ref = () => 15 + STEP * Math.floor(next() * 13);
  if (level === 1) return { level, mirror: pick(MIRRORS), start: 5 + STEP * Math.floor(next() * 17) };
  if (level === 2) return { level, fn: pick(["sin", "cos"] as const), given: 90 * Math.floor(next() * 4) + ref(), start: 0 };
  // Past 90°, and never 45° off an axis, where sin and cos are the same size.
  let r = ref();
  while (r === 45) r = ref();
  const quarter = 1 + Math.floor(next() * 3);
  return reach(pick(["sin", "cos"] as const), quarter === 1 ? 180 - r : quarter === 2 ? 180 + r : 360 - r, next);
}

// ---------- the board's game ----------

/** Nine puzzles: three mirrors; three twins (sin 40°, cos 70°, sin 200°); three values out of reach. */
export const CIRCLE_DISCOVER_LADDER: CircleDiscoverTask[] = [
  { level: 1, mirror: "up", start: 30 },
  { level: 1, mirror: "centre", start: 20 },
  { level: 1, mirror: "across", start: 50 },
  { level: 2, fn: "sin", given: 40, start: 0 },
  { level: 2, fn: "cos", given: 70, start: 0 },
  { level: 2, fn: "sin", given: 200, start: 0 },
  reach("sin", 160, rng(4)),
  reach("cos", 250, rng(5)),
  reach("sin", 310, rng(6)),
];
export const circleDiscoverStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

export type CircleDiscoverNotice = "anyAngle" | "twice" | "outOfReach" | "streak10";
export const CIRCLE_DISCOVER_NOTICES: CircleDiscoverNotice[] = ["anyAngle", "twice", "outOfReach", "streak10"];
export function circleDiscoverNotice(t: CircleDiscoverTask, misses: number, streak: number): CircleDiscoverNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  return t.level === 1 ? "anyAngle" : t.level === 2 ? "twice" : "outOfReach";
}

export type CircleDiscoverSaid =
  | { kind: "again" }
  | { kind: "fails"; rule: MirrorRule }
  | { kind: "off"; at: number }
  | { kind: "pick"; v: number };
export type LiveCircleDiscover = EndlessGame<CircleDiscoverNotice, GameLevel, CircleDiscoverSaid> &
  TryGame & {
    /** Where P is, in degrees; null before the first move. */
    n: number | null;
    /** The angles measured, in order. */
    rows: number[];
    /** Easy: the rule being made for Q. */
    qa: AngleRule | null;
    qx: Coord | null;
    qy: Coord | null;
    /** The rules tried, newest last. */
    tried: MirrorRule[];
  };
export const circleDiscoverNow = (d: Pick<LiveCircleDiscover, "mode" | "stage" | "level" | "seed">): CircleDiscoverTask =>
  d.mode === "puzzle" ? CIRCLE_DISCOVER_LADDER[d.stage] : circleDiscoverTask(d.level, rng(d.seed));
export const mirrorRuleOf = (d: Pick<LiveCircleDiscover, "qa" | "qx" | "qy">): MirrorRule | null => (d.qa && d.qx && d.qy ? { angle: d.qa, qx: d.qx, qy: d.qy } : null);
