// Judging a learner model on logged answers. The replay goes through the answers in the order they were given; each
// one is predicted from what came before it, then learnt from, so no prediction has seen its own answer. The metrics
// are the usual ones for student models (Pelánek 2015, "Metrics for evaluation of student models"): log-loss and RMSE
// for how close the probabilities are, AUC for how well they rank right above wrong, and calibration bins for whether
// "70 %" comes true about 70 % of the time. Two baselines show what the model adds over simply counting.
import { ALL_SKILLS, type SkillId } from "../math/practiceSkills.ts";
import type { Level, Observation } from "./elo.ts";

/**
 * A model that predicts each answer before learning from it. One with fit() learns its parameters from training
 * students first (PFA and BKT); one without learns as it goes, so the training students only warm it up.
 */
export type Predictor = { readonly name: string; predict(o: Observation): number; update(o: Observation): void; fit?(train: readonly Observation[]): void };

/** Laplace-smoothed share of right answers among those seen so far, kept per key. */
class RunningRate implements Predictor {
  readonly name: string;
  private key: (o: Observation) => string;
  private counts = new Map<string, [number, number]>();
  constructor(name: string, key: (o: Observation) => string) {
    this.name = name;
    this.key = key;
  }
  predict(o: Observation) {
    const [right, all] = this.counts.get(this.key(o)) ?? [0, 0];
    return (right + 1) / (all + 2);
  }
  update(o: Observation) {
    const k = this.key(o);
    const [right, all] = this.counts.get(k) ?? [0, 0];
    this.counts.set(k, [right + (o.correct ? 1 : 0), all + 1]);
  }
}
/** Everyone, everything: the overall share of right answers. */
export const globalRate = () => new RunningRate("global rate", () => "");
/** How often this skill at this level has been answered right, whoever answered. */
export const itemRate = () => new RunningRate("item rate", (o) => `${o.skill}:${o.level}`);
/** How often this student has answered this skill right, at any level. */
export const studentSkillRate = () => new RunningRate("student-skill rate", (o) => `${o.student}:${o.skill}`);

export type Prediction = { p: number; correct: boolean };
export function replay(model: Predictor, observations: readonly Observation[]): Prediction[] {
  return observations.map((o) => {
    const p = model.predict(o);
    model.update(o);
    return { p, correct: o.correct };
  });
}

const EPS = 1e-6;
export function logLoss(ps: readonly Prediction[]) {
  let sum = 0;
  for (const { p, correct } of ps) {
    const q = Math.min(1 - EPS, Math.max(EPS, p));
    sum -= correct ? Math.log(q) : Math.log(1 - q);
  }
  return sum / ps.length;
}
export const rmse = (ps: readonly Prediction[]) => Math.sqrt(ps.reduce((s, { p, correct }) => s + ((correct ? 1 : 0) - p) ** 2, 0) / ps.length);
export const accuracy = (ps: readonly Prediction[]) => ps.filter(({ p, correct }) => (p >= 0.5) === correct).length / ps.length;
/** The chance that a right answer was given a higher probability than a wrong one (ties count half). NaN if all agree. */
export function auc(ps: readonly Prediction[]) {
  const sorted = [...ps].sort((a, b) => a.p - b.p);
  const pos = sorted.filter((x) => x.correct).length;
  const neg = sorted.length - pos;
  if (!pos || !neg) return NaN;
  // Rank sum of the right answers, with tied probabilities sharing their average rank.
  let rankSum = 0;
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j < sorted.length && sorted[j].p === sorted[i].p) j++;
    const rank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) if (sorted[k].correct) rankSum += rank;
    i = j;
  }
  return (rankSum - (pos * (pos + 1)) / 2) / (pos * neg);
}
export type Bin = { from: number; to: number; n: number; predicted: number; observed: number };
export function calibration(ps: readonly Prediction[], bins = 10): Bin[] {
  const out: Bin[] = Array.from({ length: bins }, (_, i) => ({ from: i / bins, to: (i + 1) / bins, n: 0, predicted: 0, observed: 0 }));
  for (const { p, correct } of ps) {
    const b = out[Math.min(bins - 1, Math.floor(p * bins))];
    b.n++;
    b.predicted += p;
    b.observed += correct ? 1 : 0;
  }
  return out.map((b) => (b.n ? { ...b, predicted: b.predicted / b.n, observed: b.observed / b.n } : b));
}

export type Metrics = { name: string; n: number; logLoss: number; rmse: number; auc: number; accuracy: number; calibration: Bin[] };
export function metrics(name: string, ps: readonly Prediction[]): Metrics {
  return { name, n: ps.length, logLoss: logLoss(ps), rmse: rmse(ps), auc: auc(ps), accuracy: accuracy(ps), calibration: calibration(ps) };
}
export const evaluate = (model: Predictor, observations: readonly Observation[]): Metrics => metrics(model.name, replay(model, observations));

/**
 * Judged on students it has never seen: the model fits (or warms up) on the training students, then predicts the test
 * students' answers one by one, still learning from each after predicting it, as it would in a class.
 */
export function evaluateHeldOut(model: Predictor, train: readonly Observation[], test: readonly Observation[]): Metrics {
  if (model.fit) model.fit(train);
  else replay(model, train);
  return evaluate(model, test);
}

/** FNV-1a of a string, mixed with a seed: which side of the split a student falls on, the same on every run. */
function hashOf(text: string, seed: number) {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  return (h ^ (h >>> 12)) >>> 0;
}
/** Splits by student, not by answer, so no test student's answers have been seen; the order of answers is kept. */
export function splitByStudent(observations: readonly Observation[], testShare = 0.2, seed = 1) {
  const inTest = new Map<string, boolean>();
  const side = (s: string) => inTest.get(s) ?? inTest.set(s, hashOf(s, seed) / 2 ** 32 < testShare).get(s)!;
  const train: Observation[] = [];
  const test: Observation[] = [];
  for (const o of observations) (side(o.student) ? test : train).push(o);
  return { train, test };
}

// ---------- two standard student models, as baselines ----------

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/** Solves A x = b for a small square system (Gaussian elimination with partial pivoting); null if singular. */
export function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    if (Math.abs(M[pivot][c]) < 1e-12) return null;
    [M[c], M[pivot]] = [M[pivot], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * Logistic regression by Newton's method (iteratively reweighted least squares), with a small ridge penalty so a
 * skill whose answers are all right (or all wrong) still gets finite weights.
 */
export function fitLogistic(X: readonly number[][], y: readonly number[], ridge = 0.01, iterations = 25): number[] {
  const k = X[0]?.length ?? 0;
  let w = new Array<number>(k).fill(0);
  for (let it = 0; it < iterations; it++) {
    const H = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? ridge : 0)));
    const g = w.map((wi) => -ridge * wi);
    for (let r = 0; r < X.length; r++) {
      const x = X[r];
      const p = logistic(x.reduce((s, xi, i) => s + xi * w[i], 0));
      const q = p * (1 - p);
      for (let i = 0; i < k; i++) {
        g[i] += (y[r] - p) * x[i];
        for (let j = 0; j < k; j++) H[i][j] += q * x[i] * x[j];
      }
    }
    const step = solve(H, g);
    if (!step) break;
    w = w.map((wi, i) => wi + step[i]);
    if (Math.max(...step.map(Math.abs)) < 1e-8) break;
  }
  return w;
}

/**
 * Performance Factors Analysis (Pavlik, Cen & Koedinger 2009): the log-odds of a right answer are a skill's easiness
 * plus a weight for each earlier right answer and another for each earlier wrong one, by the same student on that
 * skill. The three weights of each skill are fitted on the training students; a skill they never answered uses
 * weights fitted on all skills together.
 */
export class PfaModel implements Predictor {
  readonly name = "PFA";
  private weights = new Map<string, number[]>();
  private pooled = [0, 0, 0];
  private counts = new Map<string, [number, number]>();
  private features(o: Observation) {
    const [right, wrong] = this.counts.get(`${o.student}\u0000${o.skill}`) ?? [0, 0];
    return [1, right, wrong];
  }
  fit(train: readonly Observation[]) {
    const rows = new Map<string, { X: number[][]; y: number[] }>();
    const all: { X: number[][]; y: number[] } = { X: [], y: [] };
    for (const o of train) {
      const x = this.features(o);
      const r = rows.get(o.skill) ?? rows.set(o.skill, { X: [], y: [] }).get(o.skill)!;
      for (const d of [r, all]) (d.X.push(x), d.y.push(o.correct ? 1 : 0));
      this.update(o);
    }
    this.pooled = fitLogistic(all.X, all.y);
    for (const [skill, d] of rows) this.weights.set(skill, fitLogistic(d.X, d.y));
    this.counts.clear();
  }
  predict(o: Observation) {
    const w = this.weights.get(o.skill) ?? this.pooled;
    const x = this.features(o);
    return logistic(w[0] * x[0] + w[1] * x[1] + w[2] * x[2]);
  }
  update(o: Observation) {
    const key = `${o.student}\u0000${o.skill}`;
    const [right, wrong] = this.counts.get(key) ?? [0, 0];
    this.counts.set(key, o.correct ? [right + 1, wrong] : [right, wrong + 1]);
  }
}

/** Bayesian Knowledge Tracing's four parameters: known at the start, learnt at each step, guessed, slipped. */
export type BktParams = { init: number; learn: number; guess: number; slip: number };
const BKT_GRID = {
  init: [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95],
  learn: [0.01, 0.03, 0.05, 0.1, 0.15, 0.2, 0.3],
  // Guess and slip stay under 0.3, the usual bound against "degenerate" fits where knowing makes a right answer less likely.
  guess: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3],
  slip: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3],
};
/** The chance of a right answer, and what is known after seeing it and then practising (one BKT step). */
export function bktStep(known: number, p: BktParams, correct: boolean) {
  const right = known * (1 - p.slip) + (1 - known) * p.guess;
  const posterior = correct ? (known * (1 - p.slip)) / right : (known * p.slip) / (1 - right);
  return { right, known: posterior + (1 - posterior) * p.learn };
}
/** The log-likelihood of sequences of answers (one per student) under BKT parameters. */
function bktLogLikelihood(sequences: readonly Uint8Array[], p: BktParams) {
  let ll = 0;
  for (const seq of sequences) {
    let known = p.init;
    for (let i = 0; i < seq.length; i++) {
      const right = known * (1 - p.slip) + (1 - known) * p.guess;
      const correct = seq[i] === 1;
      ll += Math.log(correct ? right : 1 - right);
      const posterior = correct ? (known * (1 - p.slip)) / right : (known * p.slip) / (1 - right);
      known = posterior + (1 - posterior) * p.learn;
    }
  }
  return ll;
}
/** The grid point with the highest likelihood: brute-force fitting, a common way to fit BKT. */
export function fitBkt(sequences: readonly Uint8Array[]): BktParams {
  let best: BktParams = { init: 0.5, learn: 0.1, guess: 0.2, slip: 0.1 };
  let bestLl = -Infinity;
  for (const init of BKT_GRID.init)
    for (const learn of BKT_GRID.learn)
      for (const guess of BKT_GRID.guess)
        for (const slip of BKT_GRID.slip) {
          const p = { init, learn, guess, slip };
          const ll = bktLogLikelihood(sequences, p);
          if (ll > bestLl) (bestLl = ll), (best = p);
        }
  return best;
}

/**
 * Bayesian Knowledge Tracing (Corbett & Anderson 1994): each skill is known or not; a student who knows it slips
 * sometimes, one who doesn't guesses sometimes, and every question practised may teach it. Parameters per skill are
 * fitted on the training students; a skill they never answered uses parameters fitted on all skills together. Levels
 * are ignored: BKT has one difficulty per skill.
 */
export class BktModel implements Predictor {
  readonly name = "BKT";
  private params = new Map<string, BktParams>();
  private pooled: BktParams = { init: 0.5, learn: 0.1, guess: 0.2, slip: 0.1 };
  private known = new Map<string, number>();
  fit(train: readonly Observation[]) {
    const bySkill = new Map<string, Map<string, number[]>>();
    for (const o of train) {
      const students = bySkill.get(o.skill) ?? bySkill.set(o.skill, new Map()).get(o.skill)!;
      (students.get(o.student) ?? students.set(o.student, []).get(o.student)!).push(o.correct ? 1 : 0);
    }
    const sequences = new Map([...bySkill].map(([skill, students]) => [skill, [...students.values()].map((s) => Uint8Array.from(s))]));
    this.pooled = fitBkt([...sequences.values()].flat());
    for (const [skill, seqs] of sequences) this.params.set(skill, fitBkt(seqs));
  }
  private paramsOf(skill: string) {
    return this.params.get(skill) ?? this.pooled;
  }
  predict(o: Observation) {
    const p = this.paramsOf(o.skill);
    const known = this.known.get(`${o.student}\u0000${o.skill}`) ?? p.init;
    return known * (1 - p.slip) + (1 - known) * p.guess;
  }
  update(o: Observation) {
    const p = this.paramsOf(o.skill);
    const key = `${o.student}\u0000${o.skill}`;
    this.known.set(key, bktStep(this.known.get(key) ?? p.init, p, o.correct).known);
  }
}

// ---------- the CSV export (server/research.ts) ----------

/** RFC 4180: quoted fields may hold commas, line breaks and doubled quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return head ? body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""]))) : [];
}

/**
 * What an attempt says about the student, the same wherever it is read (server, browser, CSV): right first time is
 * right; a first counted answer that was wrong or nearly right is wrong; so is revealing the answer without trying.
 * null for a question left after only form messages ("lowest terms"): the student had the right idea and never got
 * as far as a counted answer. counted = answers that weren't sent back for their form.
 */
export function evidence(counted: number, outcome: string, firstCorrect: boolean): boolean | null {
  if (counted > 0) return firstCorrect;
  return outcome === "revealed" ? false : null;
}

/** The observation an exported attempt gives, or null when it says nothing about what the student knows. */
export function observation(row: Record<string, string>): (Observation & { condition: string; attempt: number }) | null {
  const skill = row.skill as SkillId;
  const level = Number(row.level) as Level;
  if (!ALL_SKILLS.includes(skill) || ![1, 2, 3].includes(level)) return null;
  const correct = evidence(Number(row.n_answers) - Number(row.retries), row.outcome, row.first_correct === "1");
  return correct === null ? null : { student: row.student, skill, level, correct, condition: row.condition, attempt: Number(row.attempt) };
}
/** Every usable attempt in the order it was stored. */
export const observationsFromCsv = (text: string) =>
  parseCsv(text).map(observation).filter((o) => o !== null).sort((a, b) => a.attempt - b.attempt);
