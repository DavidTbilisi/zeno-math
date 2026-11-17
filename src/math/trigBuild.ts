// Trig builder: a right-angled triangle in a real setting (a ladder against a wall, a ramp, a pole's support cable),
// one angle and one side given, and a side or the angle to find, solved the way it is done on paper but one step at a
// time: name the sides from θ (opposite, adjacent, hypotenuse), choose the ratio that joins the two that matter (sin,
// cos or tan), and choose how to rearrange it (× or ÷, or the inverse). The scaffold fades up the levels: easy names
// all three sides and finds a side from the hypotenuse; medium names only the two that matter and may divide; hard
// names none and may ask for the angle. θ sits at the foot or at the top, so opposite and adjacent swap. A wrong
// rearrangement is worked out and drawn, so a wall taller than its ladder can be seen to be impossible.
import type { EndlessGame, GameLevel, TryGame } from "./ladder";
import { rng } from "./random";

export type TrigScene = "ladder" | "ramp" | "cable";
/** A side by where it is: along the ground, up the wall (or pole, or rise), or the slant. */
export type TrigSide = "base" | "up" | "hyp";
/** A side by what it is to θ. */
export type TrigName = "opp" | "adj" | "hyp";
export type TrigRatio = "sin" | "cos" | "tan";
/** A rearrangement: for a side, known × ratio, known ÷ ratio, or ratio ÷ known; for the angle, the inverse of the fraction, the ratio of it, or the inverse of it upside down. */
export type TrigOp = "mul" | "div" | "flip" | "inv" | "fwd" | "invFlip";

export type TrigTask = {
  level: GameLevel;
  scene: TrigScene;
  /** The picture drawn the other way round: the wall on the left. */
  mirror: boolean;
  /** θ at the top corner (between the slant and the wall) rather than at the foot. */
  top: boolean;
  /** θ in degrees, a whole number. */
  angle: number;
  /** The three sides, in metres. */
  len: Record<TrigSide, number>;
  /** The side given with its length, or two sides when the angle is asked. */
  known: TrigName[];
  /** What is to be found. */
  ask: TrigName | "ang";
  /** The rearrangements offered, in the order shown. */
  ops: TrigOp[];
};

const RAD = Math.PI / 180;
/** What a side is to θ: at the foot the wall is opposite; at the top the ground is. */
export const nameOf = (top: boolean, s: TrigSide): TrigName => (s === "hyp" ? "hyp" : (s === "up") !== top ? "opp" : "adj");
export const sideOf = (top: boolean, n: TrigName): TrigSide => (n === "hyp" ? "hyp" : (n === "opp") !== top ? "up" : "base");
/** A length as it is given and shown: to one decimal place, with no .0. */
export const r1 = (v: number) => Math.round(v * 10) / 10;
export const lenText = (v: number) => String(r1(v));

/** The two sides a task is about: the one given and the one to find, or the two given when the angle is asked. */
export const sidesOf = (t: Pick<TrigTask, "known" | "ask">): TrigName[] => (t.ask === "ang" ? t.known : [t.known[0], t.ask]);
/** The ratio that joins two sides. */
export function ratioOf(pair: readonly TrigName[]): TrigRatio {
  const has = (n: TrigName) => pair.includes(n);
  return !has("hyp") ? "tan" : has("opp") ? "sin" : "cos";
}
/** What a ratio is: the side on top and the side beneath. */
export const RATIO_PARTS: Record<TrigRatio, [TrigName, TrigName]> = { sin: ["opp", "hyp"], cos: ["adj", "hyp"], tan: ["opp", "adj"] };
const fn: Record<TrigRatio, (deg: number) => number> = { sin: (d) => Math.sin(d * RAD), cos: (d) => Math.cos(d * RAD), tan: (d) => Math.tan(d * RAD) };
const inv: Record<TrigRatio, (x: number) => number> = { sin: (x) => Math.asin(x) / RAD, cos: (x) => Math.acos(x) / RAD, tan: (x) => Math.atan(x) / RAD };

/** The task's numbers: the side given (rounded as shown), the angle, and the right answer. */
export function trigParts(t: TrigTask) {
  const ratio = ratioOf(sidesOf(t));
  const [topN, bottomN] = RATIO_PARTS[ratio];
  const given = (n: TrigName) => r1(t.len[sideOf(t.top, n)]);
  if (t.ask === "ang") {
    const [a, b] = [given(topN), given(bottomN)];
    return { ratio, topN, bottomN, a, b, answer: inv[ratio](a / b) };
  }
  const k = given(t.known[0]);
  // x on top (the side asked is the ratio's top): x = k × ratio; else x = k ÷ ratio.
  const onTop = t.ask === topN;
  return { ratio, topN, bottomN, k, onTop, answer: onTop ? k * fn[ratio](t.angle) : k / fn[ratio](t.angle) };
}
/** The right rearrangement. */
export function rightOp(t: TrigTask): TrigOp {
  if (t.ask === "ang") return "inv";
  return trigParts(t).onTop ? "mul" : "div";
}
/** What a rearrangement gives: a length or an angle, or NaN when there is none (sin⁻¹ of more than 1). */
export function opValue(t: TrigTask, op: TrigOp): number {
  const p = trigParts(t);
  if (t.ask === "ang") {
    const { a = 0, b = 1 } = p as { a?: number; b?: number };
    return op === "inv" ? inv[p.ratio](a / b) : op === "fwd" ? fn[p.ratio](a / b) : inv[p.ratio](b / a);
  }
  const k = (p as { k: number }).k;
  const f = fn[p.ratio](t.angle);
  return op === "mul" ? k * f : op === "div" ? k / f : f / k;
}

/**
 * Why a rearrangement is wrong, as the picture shows it: a leg made longer than the slant, a slant made shorter than
 * the side given, no angle at all (sin⁻¹ of more than 1), a ratio taken for an angle, the other angle, or just the
 * wrong size.
 */
export type TrigOpSlip = "longLeg" | "shortHyp" | "noAngle" | "notAngle" | "otherAngle" | "size";
export function opSlip(t: TrigTask, op: TrigOp): TrigOpSlip {
  const v = opValue(t, op);
  if (t.ask === "ang") return op === "fwd" ? "notAngle" : Number.isNaN(v) ? "noAngle" : "otherAngle";
  const k = (trigParts(t) as { k: number }).k;
  if (t.ask === "hyp" && v < k) return "shortHyp";
  if (t.ask !== "hyp" && t.known[0] === "hyp" && v > k) return "longLeg";
  return "size";
}

const shuffle = <T>(xs: T[], next: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * A task at a level. Easy: the slant given, a leg to find (× only). Medium: a leg given, the other leg or the slant to
 * find (× or ÷). Hard: any side, or the angle from two sides. θ is 25° to 65° so the picture stays readable; the side
 * given is a whole number of metres.
 */
export function trigTask(level: GameLevel, next: () => number): TrigTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
  const scene = pick(["ladder", "ramp", "cable"] as const);
  // A ramp has its angle at the foot; a ladder's or a cable's can be at the top.
  const top = scene !== "ramp" && next() < 0.45;
  const mirror = next() < 0.5;
  const angle = int(25, 65);
  // The angle at the foot, whichever corner θ is.
  const foot = top ? 90 - angle : angle;
  let known: TrigName[];
  let ask: TrigName | "ang";
  if (level === 1) [known, ask] = [["hyp"], pick(["opp", "adj"] as const)];
  else if (level === 2) {
    const k = pick(["opp", "adj"] as const);
    [known, ask] = [[k], pick([k === "opp" ? "adj" : "opp", "hyp"] as const)];
  } else if (next() < 0.4) {
    known = pick([["opp", "adj"], ["opp", "hyp"], ["adj", "hyp"]] as const).slice();
    ask = "ang";
  } else {
    const k = pick(["opp", "adj", "hyp"] as const);
    [known, ask] = [[k], pick((["opp", "adj", "hyp"] as const).filter((n) => n !== k))];
  }
  // The side given is whole: scale the triangle to it.
  const unit = { base: Math.cos(foot * RAD), up: Math.sin(foot * RAD), hyp: 1 };
  const first = sideOf(top, known[0]);
  // Two sides given need room for a whole second side that isn't as long as the slant.
  const size = ask === "ang" ? int(6, 15) : scene === "ramp" ? int(3, 12) : int(4, 15);
  const s = size / unit[first];
  let len: Record<TrigSide, number> = { base: s * unit.base, up: s * unit.up, hyp: s, [first]: size };
  let theta = angle;
  if (ask === "ang") {
    // Two whole sides: the angle is what they make, and the picture is drawn from them.
    const second = sideOf(top, known[1]);
    const whole = Math.max(1, Math.round(len[second]));
    // A leg is shorter than the slant, a slant longer than the leg.
    const b = first === "hyp" ? Math.min(whole, size - 1) : second === "hyp" ? Math.max(whole, size + 1) : whole;
    len = { ...len, [first]: size, [second]: b };
    if (first === "hyp" || second === "hyp") {
      const h = len.hyp;
      const leg = first === "hyp" ? second : first;
      const other = leg === "base" ? "up" : "base";
      len[other] = Math.sqrt(h * h - len[leg] * len[leg]);
    } else len.hyp = Math.hypot(len.base, len.up);
    const footNow = Math.atan2(len.up, len.base) / RAD;
    theta = top ? 90 - footNow : footNow;
  }
  const ops: TrigOp[] = ask === "ang" ? ["inv", "fwd", "invFlip"] : ["mul", "div", "flip"];
  return { level, scene, mirror, top, angle: theta, len, known, ask, ops: shuffle(ops, next) };
}

/** The sides a puzzle has named, in turn: all three on easy, the two that matter on medium, none on hard. */
export function namesToTap(t: TrigTask): TrigName[] {
  if (t.level === 1) return ["hyp", "opp", "adj"];
  if (t.level === 2) return sidesOf(t);
  return [];
}
/** A puzzle's steps: each side to name, then the ratio, then the rearrangement. */
export type TrigStep = { kind: "name"; n: TrigName } | { kind: "ratio" } | { kind: "op" };
export const stepsOf = (t: TrigTask): TrigStep[] => [...namesToTap(t).map((n) => ({ kind: "name" as const, n })), { kind: "ratio" }, { kind: "op" }];

/** Why a side tapped is not the one asked for. */
export type TrigNameSlip = "isHyp" | "isOpp" | "isAdj";
export const nameSlip = (top: boolean, s: TrigSide): TrigNameSlip => ({ hyp: "isHyp", opp: "isOpp", adj: "isAdj" } as const)[nameOf(top, s)];

// ---------- the board's game ----------

export const TRIG_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 8 },
  { level: 1, seed: 6 },
  { level: 1, seed: 7 },
  { level: 2, seed: 10 },
  { level: 2, seed: 9 },
  { level: 2, seed: 20 },
  { level: 3, seed: 19 },
  { level: 3, seed: 13 },
  { level: 3, seed: 17 },
];
/** Stars by the misses over the whole puzzle: none three, one two, more one. */
export const trigStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

export type TrigNotice = "top" | "divide" | "inverse" | "streak10";
export const TRIG_NOTICES: TrigNotice[] = ["top", "divide", "inverse", "streak10"];
/** What a puzzle solved with no miss shows: θ at the top (the sides swap), a division, an angle found; ten in a row. */
export function trigNotice(t: TrigTask, misses: number, streak: number): TrigNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (t.ask === "ang") return "inverse";
  if (rightOp(t) === "div") return "divide";
  if (t.top) return "top";
  return null;
}

export type TrigSaid =
  | { kind: "name"; why: TrigNameSlip }
  | { kind: "ratio"; r: TrigRatio }
  | { kind: "op"; op: TrigOp };
export type LiveTrigBuild = EndlessGame<TrigNotice, GameLevel, TrigSaid> &
  TryGame & {
    /** How many of the puzzle's steps are done. */
    at: number;
  };
export const trigNow = (d: Pick<LiveTrigBuild, "mode" | "stage" | "level" | "seed">): TrigTask =>
  d.mode === "puzzle" ? trigTask(TRIG_LADDER[d.stage].level, rng(TRIG_LADDER[d.stage].seed)) : trigTask(d.level, rng(d.seed));

// ---------- the working, as it is written ----------

/** θ as the working writes it: its size, or θ when it is the angle asked. */
const thetaText = (t: TrigTask) => (t.ask === "ang" ? "θ" : `${Math.round(t.angle)}°`);
/** A side as the working writes it: its length, or x when it is the side asked. */
const sideText = (t: TrigTask, n: TrigName) => (t.ask === n ? "x" : lenText(t.len[sideOf(t.top, n)]));
/** The ratio written out for this triangle: sin 35° = x / 12. */
export function ratioText(t: TrigTask, rn: Record<TrigRatio, string>): string {
  const r = ratioOf(sidesOf(t));
  const [a, b] = RATIO_PARTS[r];
  return `${rn[r]} ${thetaText(t)} = ${sideText(t, a)} / ${sideText(t, b)}`;
}
/** A rearrangement written out: x = 12 × sin 35°, or θ = sin⁻¹(5 ÷ 12). */
export function opText(t: TrigTask, op: TrigOp, rn: Record<TrigRatio, string>): string {
  const p = trigParts(t);
  const r = rn[p.ratio];
  if (t.ask === "ang") {
    const { a, b } = p as { a: number; b: number };
    return op === "inv" ? `θ = ${r}⁻¹(${a} ÷ ${b})` : op === "fwd" ? `θ = ${r}(${a} ÷ ${b})` : `θ = ${r}⁻¹(${b} ÷ ${a})`;
  }
  const k = (p as { k: number }).k;
  const f = `${r} ${thetaText(t)}`;
  return op === "mul" ? `x = ${k} × ${f}` : op === "div" ? `x = ${k} ÷ ${f}` : `x = ${f} ÷ ${k}`;
}
/** What a rearrangement comes to, as it is said: 6.9 m, 37.6°, a ratio to two places, or nothing. */
export function valueText(t: TrigTask, op: TrigOp, m = "m"): string {
  const v = opValue(t, op);
  if (Number.isNaN(v)) return "—";
  if (t.ask === "ang") return op === "fwd" ? v.toFixed(2) : `${r1(v)}°`;
  return v < 1 ? `${v.toFixed(2)} ${m}` : `${r1(v)} ${m}`;
}
