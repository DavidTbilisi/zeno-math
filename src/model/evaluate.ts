// Judging a learner model on logged answers. The replay goes through the answers in the order they were given; each
// one is predicted from what came before it, then learnt from, so no prediction has seen its own answer. The metrics
// are the usual ones for student models (Pelánek 2015, "Metrics for evaluation of student models"): log-loss and RMSE
// for how close the probabilities are, AUC for how well they rank right above wrong, and calibration bins for whether
// "70 %" comes true about 70 % of the time. Two baselines show what the model adds over simply counting.
import { ALL_SKILLS, type SkillId } from "../math/practiceSkills.ts";
import type { Level, Observation } from "./elo.ts";

export type Predictor = { readonly name: string; predict(o: Observation): number; update(o: Observation): void };

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
export function evaluate(model: Predictor, observations: readonly Observation[]): Metrics {
  const ps = replay(model, observations);
  return { name: model.name, n: ps.length, logLoss: logLoss(ps), rmse: rmse(ps), auc: auc(ps), accuracy: accuracy(ps), calibration: calibration(ps) };
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
