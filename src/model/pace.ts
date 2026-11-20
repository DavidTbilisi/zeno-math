// Relative response time (issue #63): how long a student takes over a question's first answer, against how long
// students usually take over that question. A log time is compared with the question's own norm, so a hard question
// that everybody takes a minute over doesn't make a student look slow. The relative time is then modelled with the same
// three layers as the learner model (the student overall, the student on an area, the student on a skill), the skill
// layer with a term for the answer's position in the practice, since students take far longer over the first answer
// on a skill than over the tenth. The model gives each student their own pace, so a run of answers far from it can be
// shown to the teacher, and it qualifies answers in the EMA mastery rule (a fast wrong answer or a fast right one
// counted more, or less, than a slow one), which `npm run pace` judges on ASSISTments by a verdict rule fixed before
// it was run (PACE_VERDICT). Not part of the thesis, whose title is about grain.
import { usableMs, type Observation } from "./elo.ts";
import { emaStep, solve, type EmaParams } from "./evaluate.ts";
import type { MasteryRule, Practice } from "./mastery.ts";

const logSeconds = (ms: number) => Math.log(ms / 1000);
const skillKey = (o: Observation) => `${o.skill}\u0000${o.level}`;

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---------- the question's norm ----------

/** A question's own norm needs this many timed answers; with fewer, the skill's norm stands in. */
export const ITEM_MIN = 20;
/** The median log seconds of each question (with ITEM_MIN answers or more), each skill at each level, and all questions.
 *  Zeno makes every question afresh, so its norm is always the skill's at the level. */
export type Norms = { item: ReadonlyMap<string, number>; skill: ReadonlyMap<string, number>; all: number };
export function fitNorms(train: readonly Observation[]): Norms {
  const item = new Map<string, number[]>();
  const skill = new Map<string, number[]>();
  const all: number[] = [];
  for (const o of train) {
    if (!usableMs(o.ms)) continue;
    const y = logSeconds(o.ms);
    all.push(y);
    (skill.get(skillKey(o)) ?? skill.set(skillKey(o), []).get(skillKey(o))!).push(y);
    const k = o.item ?? o.problem;
    if (k !== undefined) (item.get(k) ?? item.set(k, []).get(k)!).push(y);
  }
  return {
    item: new Map([...item].filter(([, ys]) => ys.length >= ITEM_MIN).map(([k, ys]) => [k, median(ys)])),
    skill: new Map([...skill].map(([k, ys]) => [k, median(ys)])),
    all: all.length ? median(all) : 0,
  };
}
/** Log time against the question's norm: 0 is the usual time, −0.69 half of it, +0.69 twice it; NaN without a time. */
export function relative(norms: Norms, o: Observation): number {
  if (!usableMs(o.ms)) return NaN;
  const k = o.item ?? o.problem;
  return logSeconds(o.ms) - ((k !== undefined ? norms.item.get(k) : undefined) ?? norms.skill.get(skillKey(o)) ?? norms.all);
}

// ---------- the three-layer model ----------

/** How much of each new relative time goes into each layer's moving average: slow, since pace is more a trait than a state. */
export const PACE_DECAY = 0.2;
/** Answers past this one on a skill share one position term. */
export const POSITION_CAP = 10;
const key = (o: Observation) => `${o.student}\u0000${o.skill}`;

/**
 * For each timed answer, what the model knows before it: the moving average of the student's relative times overall, on
 * the skill's area and on the skill (each falling back to the layer above when it has no answer yet), and the answer's
 * position in the student's practice of the skill. Answers before the student's first timed one are not predicted.
 */
export type PaceRow = { student: string; y: number; layers: [number, number, number]; position: number; correct: boolean };
export function paceRows(observations: readonly Observation[], norms: Norms, areaOf: (skill: string) => string): PaceRow[] {
  const ema = new Map<string, number>();
  const count = new Map<string, number>();
  const rows: PaceRow[] = [];
  for (const o of observations) {
    const position = Math.min(POSITION_CAP, (count.get(key(o)) ?? 0) + 1);
    count.set(key(o), position);
    const y = relative(norms, o);
    if (Number.isNaN(y)) continue;
    const ks = [`s\u0000${o.student}`, `a\u0000${o.student}\u0000${areaOf(o.skill)}`, `k\u0000${key(o)}`];
    const s = ema.get(ks[0]);
    if (s !== undefined) {
      const a = ema.get(ks[1]) ?? s;
      rows.push({ student: o.student, y, layers: [s, a, ema.get(ks[2]) ?? a], position, correct: o.correct });
    }
    for (const k of ks) ema.set(k, ema.has(k) ? (1 - PACE_DECAY) * ema.get(k)! + PACE_DECAY * y : y);
  }
  return rows;
}

/** The weights of the layers, a constant, and with positions a term for each position (the first is 0). */
export type PaceWeights = { layers: [number, number, number]; constant: number; position: number[] };
const features = (r: PaceRow, layers: readonly number[], positions: boolean) => [
  ...layers.map((j) => r.layers[j]),
  1,
  ...(positions ? Array.from({ length: POSITION_CAP - 1 }, (_, i) => (r.position === i + 2 ? 1 : 0)) : []),
];
/** Least squares on training rows, with the chosen layers (0 student, 1 area, 2 skill) and the position term or not. */
export function fitPace(rows: readonly PaceRow[], layers: readonly number[] = [0, 1, 2], positions = true): PaceWeights {
  const n = features(rows[0] ?? ({ layers: [0, 0, 0], position: 1 } as PaceRow), layers, positions).length;
  const A = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const b = new Array<number>(n).fill(0);
  for (const r of rows) {
    const f = features(r, layers, positions);
    for (let p = 0; p < n; p++) {
      b[p] += f[p] * r.y;
      for (let q = 0; q < n; q++) A[p][q] += f[p] * f[q];
    }
  }
  // a tiny ridge keeps a position no training row reached from making the system singular
  for (let p = 0; p < n; p++) A[p][p] += 1e-9;
  const w = solve(A, b) ?? new Array<number>(n).fill(0);
  const weight = [0, 0, 0] as [number, number, number];
  layers.forEach((j, i) => (weight[j] = w[i]));
  return { layers: weight, constant: w[layers.length], position: positions ? [0, ...w.slice(layers.length + 1)] : new Array<number>(POSITION_CAP).fill(0) };
}
export const predictPace = (w: PaceWeights, r: PaceRow) => w.layers[0] * r.layers[0] + w.layers[1] * r.layers[1] + w.layers[2] * r.layers[2] + w.constant + w.position[r.position - 1];
/** The share of the variance of the relative time (around 0, the question's norm) that the predictions explain. */
export function explained(rows: readonly PaceRow[], predict: (r: PaceRow) => number) {
  let base = 0, err = 0;
  for (const r of rows) (base += r.y ** 2), (err += (r.y - predict(r)) ** 2);
  return rows.length && base ? 1 - err / base : NaN;
}

// ---------- the speed-qualified EMA mastery rule ----------

/** A practice with each answer's relative time (NaN where unknown). */
export type PacedPractice = Practice & { rel: Float64Array };
export function pacedPractices(observations: readonly Observation[], norms: Norms): PacedPractice[] {
  const by = new Map<string, { student: string; skill: string; answers: number[]; rel: number[] }>();
  for (const o of observations) {
    const p = by.get(key(o)) ?? by.set(key(o), { student: o.student, skill: o.skill, answers: [], rel: [] }).get(key(o))!;
    p.answers.push(o.correct ? 1 : 0);
    p.rel.push(relative(norms, o));
  }
  return [...by.values()].map((p) => ({ ...p, answers: Uint8Array.from(p.answers), rel: Float64Array.from(p.rel) }));
}

/**
 * How much a fast answer (quicker than the question's norm) moves the moving average, as a multiple of its α: 1 is the
 * plain EMA. A slow answer, or one with no time, always moves it by α.
 */
export type SpeedWeights = { fastRight: number; fastWrong: number };
/** The variants judged, fixed before the run: the issue's idea (a fast wrong answer is weaker evidence), the opposite
 *  (what the issue's own table suggests: a fast wrong answer is followed by worse ones), and a fast right one credited. */
export const SPEED_VARIANTS: readonly { name: string; weights: SpeedWeights }[] = [
  { name: "fast wrong ×½", weights: { fastRight: 1, fastWrong: 0.5 } },
  { name: "fast wrong ×1.5", weights: { fastRight: 1, fastWrong: 1.5 } },
  { name: "fast right ×1.5", weights: { fastRight: 1.5, fastWrong: 1 } },
];
/** The EMA score after each answer, with fast answers weighted. */
export function speedEmaStep(score: number, alpha: number, correct: boolean, rel: number, w: SpeedWeights) {
  const m = rel < 0 ? (correct ? w.fastRight : w.fastWrong) : 1;
  return emaStep(score, Math.min(1, alpha * m), correct);
}
export const speedEmaRule = (p: EmaParams, threshold: number, w: SpeedWeights, name = "speed EMA"): MasteryRule => ({
  name: `${name} θ ${Number(threshold.toFixed(4))}`,
  declare(_skill, answers, practice) {
    const rel = (practice as PacedPractice | undefined)?.rel;
    let score = p.start;
    for (let i = 0; i < answers.length; i++) if ((score = speedEmaStep(score, p.alpha, answers[i] === 1, rel ? rel[i] : NaN, w)) >= threshold) return i + 1;
    return null;
  },
});
/** The mean log-loss of each answer predicted by the score before it. */
export function speedEmaLogLoss(practices: readonly PacedPractice[], p: EmaParams, w: SpeedWeights) {
  let sum = 0, n = 0;
  for (const pr of practices) {
    let score = p.start;
    for (let i = 0; i < pr.answers.length; i++) {
      const q = Math.min(1 - 1e-6, Math.max(1e-6, score));
      sum -= pr.answers[i] ? Math.log(q) : Math.log(1 - q);
      n++;
      score = speedEmaStep(score, p.alpha, pr.answers[i] === 1, pr.rel[i], w);
    }
  }
  return n ? sum / n : NaN;
}

/**
 * The verdict rule, fixed before `npm run pace` was first run on ASSISTments. Each variant and the plain EMA get the
 * threshold that costs, on the training students, what the streak rule costs there (as H3 sets the EMA's). On the
 * held-out students, a variant is adopted only if the share right of the next three answers after it declares mastery
 * beats the plain EMA's by at least one percentage point, with the 95 % interval from resampling students wholly above
 * zero. Otherwise the plain EMA stays. The log-loss of the scores as forecasts of the next answer is reported beside it,
 * against the thesis's smallest difference that counts (0.005), as description.
 */
export const PACE_VERDICT = { minGain: 0.01 } as const;
export const adopted = (gain: number, interval: readonly [number, number]) => gain >= PACE_VERDICT.minGain && interval[0] > 0;

// ---------- a change of pace, for the teacher ----------

/** The last PACE_RECENT timed answers are set against the student's own pace over at least PACE_HISTORY earlier ones. */
export const PACE_RECENT = 5;
export const PACE_HISTORY = 10;
/** A run of answers counts as a change of pace when its mean relative time is this many times the student's own (or a part of it). */
export const JUMP_FACTOR = 2;
export type PaceJump = { direction: "faster" | "slower"; factor: number };
/**
 * Whether the student's last PACE_RECENT timed answers depart from their own pace: the mean relative time of those answers
 * against the mean over all their earlier timed answers, as a factor in time. Null without enough answers or a jump.
 */
export function paceJump(rel: readonly number[], factor = JUMP_FACTOR): PaceJump | null {
  const timed = rel.filter((x) => !Number.isNaN(x));
  if (timed.length < PACE_RECENT + PACE_HISTORY) return null;
  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const d = mean(timed.slice(-PACE_RECENT)) - mean(timed.slice(0, -PACE_RECENT));
  if (Math.abs(d) < Math.log(factor)) return null;
  return { direction: d < 0 ? "faster" : "slower", factor: Math.exp(Math.abs(d)) };
}

/** A class's norm for a skill at a level needs this many timed answers; with fewer, those answers say nothing about pace. */
export const CLASS_NORM_MIN = 5;
/**
 * The students of a class whose last answers depart from their own pace, for the teacher page. Zeno makes every question
 * afresh, so the norm is the class's median time at each skill and level. On ASSISTments (npm run pace) the answer after
 * a run flagged faster was right 8 to 12 points less often than the student's own share, after one flagged slower no
 * less often: a faster run suggests rushing or guessing, a slower one tiredness or harder work.
 */
export function classPace(observations: readonly Observation[]): Map<string, PaceJump & { answers: number }> {
  const count = new Map<string, number>();
  for (const o of observations) if (usableMs(o.ms)) count.set(skillKey(o), (count.get(skillKey(o)) ?? 0) + 1);
  const norms = fitNorms(observations.filter((o) => (count.get(skillKey(o)) ?? 0) >= CLASS_NORM_MIN));
  const rel = new Map<string, number[]>();
  for (const o of observations)
    if ((count.get(skillKey(o)) ?? 0) >= CLASS_NORM_MIN && usableMs(o.ms)) (rel.get(o.student) ?? rel.set(o.student, []).get(o.student)!).push(relative(norms, o));
  const out = new Map<string, PaceJump & { answers: number }>();
  for (const [student, xs] of rel) {
    const j = paceJump(xs);
    if (j) out.set(student, { ...j, answers: xs.length });
  }
  return out;
}
