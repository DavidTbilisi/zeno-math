// Unit circle: a point P dragged round a circle of radius 1, its across (cos) and its up (sin) drawn as it goes. Easy:
// put P at an angle (30°s and 45°s, all the way round), then pick its coordinates, (cos θ, sin θ), from four; a wrong
// pair is drawn where it really is. Medium: an equation such as sin θ = ½, solved by putting P at both of its angles
// from 0° to 360°, with the line sin = ½ dashed across the circle to show where. Hard: no line; tan too (drawn where
// the ray through P meets the tangent at 1), and sin or cos with the sign of the other given, which leaves one angle.
// A wrong angle is told what its sin, cos or tan really is, and whether only the sign is wrong.
import type { EndlessGame, GameLevel, TryGame } from "./ladder";
import { rng } from "./random";

export type CircleFn = "sin" | "cos" | "tan";
/** A sign the other ratio must have, for an equation with one angle. */
export type CircleCond = "sinPos" | "sinNeg" | "cosPos" | "cosNeg";
export type PlaceTask = { level: 1; kind: "place"; angle: number; choices: number[] };
export type SolveTask = { level: GameLevel; kind: "solve"; fn: CircleFn; v: number; cond: CircleCond | null; answers: number[] };
export type CircleTask = PlaceTask | SolveTask;

/** P snaps to every 15°. */
export const SNAP = 15;
const RAD = Math.PI / 180;
export const norm = (a: number) => ((Math.round(a) % 360) + 360) % 360;
export const snap = (a: number) => norm(Math.round(a / SNAP) * SNAP);
const EPS = 1e-9;
export const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
/** sin, cos or tan of an angle in degrees; tan of 90° or 270° is NaN. */
export function fnAt(fn: CircleFn, a: number): number {
  const [c, s] = [Math.cos(a * RAD), Math.sin(a * RAD)];
  const clean = (v: number) => (Math.abs(v) < EPS ? 0 : v);
  if (fn === "sin") return clean(s);
  if (fn === "cos") return clean(c);
  return Math.abs(c) < EPS ? NaN : clean(s / c);
}

/** The exact values, as they are written. */
const EXACT: [number, string][] = [
  [0, "0"],
  [0.5, "½"],
  [Math.SQRT2 / 2, "√2/2"],
  [Math.sqrt(3) / 2, "√3/2"],
  [1, "1"],
  [Math.sqrt(3), "√3"],
  [Math.sqrt(3) / 3, "√3/3"],
];
/** A value as it is written: exactly when it is one of the special ones (−√3/2), else to two places. */
export function exactText(v: number): string {
  if (Number.isNaN(v)) return "—";
  const hit = EXACT.find(([x]) => near(Math.abs(v), x));
  const sign = v < -EPS ? "−" : "";
  return hit ? `${hit[1] === "0" ? "" : sign}${hit[1]}` : `${sign}${Math.abs(v).toFixed(2)}`;
}
/** The point at an angle, written as its coordinates: (−√3/2, ½). */
export const coordText = (a: number) => `(${exactText(fnAt("cos", a))}, ${exactText(fnAt("sin", a))})`;
const condOk = (c: CircleCond | null, a: number) =>
  !c || (c === "sinPos" ? fnAt("sin", a) > 0 : c === "sinNeg" ? fnAt("sin", a) < 0 : c === "cosPos" ? fnAt("cos", a) > 0 : fnAt("cos", a) < 0);
/** Every angle from 0° to 345° (on the snap) that solves an equation. */
export const solutions = (fn: CircleFn, v: number, cond: CircleCond | null) =>
  Array.from({ length: 360 / SNAP }, (_, i) => i * SNAP).filter((a) => near(fnAt(fn, a), v) && condOk(cond, a));

const shuffle = <T>(xs: T[], next: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
/** The 30°s and 45°s round the circle, the axes among them. */
const SPECIAL = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

/**
 * The four points offered for an angle's coordinates: its own, and three that are easily taken for it, each another
 * point of the circle: sin and cos swapped (90° − θ), and the same sizes in the other quadrants.
 */
function placeChoices(angle: number, next: () => number): number[] {
  const same = (a: number, b: number) => near(fnAt("cos", a), fnAt("cos", b)) && near(fnAt("sin", a), fnAt("sin", b));
  const out = [angle];
  for (const b of shuffle([90 - angle, 180 - angle, 360 - angle, 180 + angle, 270 - angle, 90 + angle].map(norm), next))
    if (out.length < 4 && !out.some((a) => same(a, b))) out.push(b);
  return shuffle(out, next);
}

/** A task at a level (see the head of the file). */
export function circleTask(level: GameLevel, next: () => number): CircleTask {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
  if (level === 1) {
    const angle = pick(SPECIAL.filter((a) => a !== 0));
    return { level: 1, kind: "place", angle, choices: placeChoices(angle, next) };
  }
  const halves = [0.5, Math.SQRT2 / 2, Math.sqrt(3) / 2];
  const signed = (v: number) => (next() < 0.5 ? -v : v);
  let fn: CircleFn;
  let v: number;
  let cond: CircleCond | null = null;
  if (level === 2) [fn, v] = [pick(["sin", "cos"] as const), signed(pick(halves))];
  else {
    const kind = pick(["tan", "cond", "axis"] as const);
    if (kind === "tan") [fn, v] = ["tan", signed(pick([1, Math.sqrt(3), Math.sqrt(3) / 3]))];
    else if (kind === "axis") [fn, v] = [pick(["sin", "cos"] as const), pick([0, 1, -1])];
    else {
      [fn, v] = [pick(["sin", "cos"] as const), signed(pick(halves))];
      // The other ratio's sign picks one of the two angles.
      const other = fn === "sin" ? "cos" : "sin";
      cond = `${other}${next() < 0.5 ? "Pos" : "Neg"}` as CircleCond;
    }
  }
  return { level, kind: "solve", fn, v, cond, answers: solutions(fn, v, cond) };
}

/** Why an angle is not an answer: only the sign wrong, the wrong size, tan with no value, the condition not met, or found already. */
export type SolveSlip = "sign" | "size" | "undef" | "cond" | "again";
export function solveSlip(t: SolveTask, a: number, found: readonly number[]): SolveSlip | null {
  if (found.includes(a) && t.answers.includes(a)) return "again";
  if (t.answers.includes(a)) return null;
  const v = fnAt(t.fn, a);
  if (Number.isNaN(v)) return "undef";
  if (near(v, t.v)) return "cond";
  return near(Math.abs(v), Math.abs(t.v)) ? "sign" : "size";
}

// ---------- the board's game ----------

export const CIRCLE_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 12 },
  { level: 1, seed: 13 },
  { level: 1, seed: 4 },
  { level: 2, seed: 7 },
  { level: 2, seed: 2 },
  { level: 2, seed: 8 },
  { level: 3, seed: 7 },
  { level: 3, seed: 1 },
  { level: 3, seed: 8 },
];
export const circleStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

export type CircleNotice = "third" | "tan" | "onlyOne" | "streak10";
export const CIRCLE_NOTICES: CircleNotice[] = ["third", "tan", "onlyOne", "streak10"];
/** What a puzzle done with no miss shows: a point with both coordinates negative, tan, one angle left by a sign; ten in a row. */
export function circleNotice(t: CircleTask, misses: number, streak: number): CircleNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (t.kind === "place") return t.angle > 180 && t.angle < 270 ? "third" : null;
  if (t.fn === "tan") return "tan";
  if (t.cond) return "onlyOne";
  return null;
}

export type CircleSaid =
  | { kind: "place"; a: number }
  | { kind: "coords"; b: number }
  | { kind: "solve"; a: number; why: SolveSlip };
export type LiveUnitCircle = EndlessGame<CircleNotice, GameLevel, CircleSaid> &
  TryGame & {
    /** Where P is, in degrees. */
    p: number;
    /** Easy: P put at the angle, and the coordinates to pick. */
    placed: boolean;
    /** The angles of the equation found so far. */
    found: number[];
  };
export const circleNow = (d: Pick<LiveUnitCircle, "mode" | "stage" | "level" | "seed">): CircleTask =>
  d.mode === "puzzle" ? circleTask(CIRCLE_LADDER[d.stage].level, rng(CIRCLE_LADDER[d.stage].seed)) : circleTask(d.level, rng(d.seed));
