// A logistic student model: the chance of a right first answer is σ of a weighted sum of what is known about the
// student and the question before it is answered. Its features follow the best logistic model of Gervet et al. (2020,
// "When is deep learning the best approach to knowledge tracing?", JEDM 12(3)), PFA's counts on a log scale (Pavlik et
// al. 2009) with the student's totals over every skill and a difficulty per question (IRT), and add three ideas from
// the study of memory, each kept because it lowered log-loss on training students held out from the fit:
//
//   recency  an exponentially weighted record of the student's last answers, on the skill and overall: what they did
//            lately counts more than what they did long ago (Galyardt & Goldin 2015, recent-performance factors)
//   gap      how many answers the student gave elsewhere since last practising the skill, on a log scale: forgetting
//            between practices (no clock is needed, so it works on data without timestamps)
//   areas    the student's counts on the skill's area: practice on a related skill transfers in part
//
//   P(correct) = σ(b + e_skill,level + e_item + Σ_layers [w_c·log(1 + right) + w_f·log(1 + wrong)] + recency + gap)
//
// Each weight belongs to its skill (or item, or area) where the feature is the skill's own, and is fitted on the
// training students by Adagrad over a few passes, which is enough to keep rare items' weights small. A question no
// training student saw starts at its skill's difficulty, and every question's difficulty keeps moving with the answers
// to it, by the same shrinking step U(n) = itemStep / (1 + 0.05·n) the Elo model uses (src/model/elo.ts).
import { areaOf, type SkillId } from "../math/practiceSkills.ts";
import type { Observation } from "./elo.ts";
import type { Predictor } from "./evaluate.ts";
import type { MasteryRule, Practice } from "./mastery.ts";
import { rng } from "./random.ts";

export type LogisticParams = {
  /** Passes over the training answers, and the Adagrad step. */
  epochs: number;
  rate: number;
  /** How much of the recency record each new answer replaces (0 turns the feature off). */
  recency: number;
  /** How fast a question's difficulty moves with the answers after the fit (0 keeps it where the fit left it). */
  itemStep: number;
  /** Whether a question has a difficulty of its own, where the data names its questions (Observation.item). */
  items: boolean;
  /** The area a skill belongs to: Zeno's areas by default, a data set's own grouping otherwise. */
  areaOf: (skill: string) => string;
  /** The order the training answers are passed in. */
  seed: number;
};
// Chosen on ASSISTments 2009–2010 students split from the training students (seed 2), never the test students.
export const LOGISTIC_PARAMS: LogisticParams = {
  epochs: 6,
  rate: 0.1,
  recency: 0.3,
  itemStep: 0.5,
  items: true,
  areaOf: (skill) => areaOf(skill as SkillId) ?? "other",
  seed: 1,
};

/** Right and wrong answers so far, and the recency record: +1 for right, −1 for wrong, weighted toward the latest. */
type Tally = { right: number; wrong: number; recent: number };
type Feature = [key: string, value: number];
const tally = (): Tally => ({ right: 0, wrong: 0, recent: 0 });
const phi = Math.log1p;
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export class LogisticModel implements Predictor {
  readonly name: string;
  readonly params: LogisticParams;
  private weights = new Map<string, number>();
  /** Answers each question's difficulty rests on, for its step after the fit. */
  private seen = new Map<string, number>();
  private records = new Map<string, Tally>();
  /** How many answers each student has given, and at which of them each skill was last practised. */
  private answers = new Map<string, number>();
  private lastAt = new Map<string, number>();
  constructor(params: Partial<LogisticParams> = {}, name = "logistic") {
    this.params = { ...LOGISTIC_PARAMS, ...params };
    this.name = name;
  }

  private record(key: string) {
    return this.records.get(key) ?? this.records.set(key, tally()).get(key)!;
  }
  private keys(o: Observation) {
    return { skill: `${o.student}\u0000${o.skill}`, area: `${o.student}\u0001${this.params.areaOf(o.skill)}`, total: o.student };
  }
  private itemKey(o: Observation) {
    return this.params.items && o.item !== undefined ? `q:${o.item}` : null;
  }

  /** What is known before the answer, as (weight name, value) pairs. */
  features(o: Observation): Feature[] {
    const k = this.keys(o);
    const skill = this.record(k.skill), area = this.record(k.area), total = this.record(k.total);
    const a = this.params.areaOf(o.skill);
    const x: Feature[] = [
      ["b", 1],
      [`e:${o.skill}:${o.level}`, 1],
      [`sr:${o.skill}`, phi(skill.right)], [`sw:${o.skill}`, phi(skill.wrong)],
      [`ar:${a}`, phi(area.right)], [`aw:${a}`, phi(area.wrong)],
      ["tr", phi(total.right)], ["tw", phi(total.wrong)],
    ];
    const item = this.itemKey(o);
    if (item) x.push([item, 1]);
    if (this.params.recency) x.push([`sn:${o.skill}`, skill.recent], ["sn", skill.recent], ["tn", total.recent]);
    const last = this.lastAt.get(k.skill);
    x.push(last === undefined ? ["new", 1] : ["gap", phi((this.answers.get(o.student) ?? 0) - last - 1)]);
    return x;
  }
  private logit(x: readonly Feature[]) {
    let z = 0;
    for (const [key, v] of x) z += (this.weights.get(key) ?? 0) * v;
    return z;
  }
  predict(o: Observation) {
    return sigmoid(this.logit(this.features(o)));
  }

  /** Counts the answer into the student's records, after it has been predicted. */
  private remember(o: Observation) {
    const k = this.keys(o);
    const r = this.params.recency;
    for (const key of [k.skill, k.area, k.total]) {
      const rec = this.record(key);
      if (o.correct) rec.right++;
      else rec.wrong++;
      rec.recent = (1 - r) * rec.recent + r * (o.correct ? 1 : -1);
    }
    const n = this.answers.get(o.student) ?? 0;
    this.lastAt.set(k.skill, n);
    this.answers.set(o.student, n + 1);
  }
  private forget() {
    this.records.clear();
    this.answers.clear();
    this.lastAt.clear();
  }

  fit(train: readonly Observation[]) {
    const rows: Feature[][] = [];
    const ys: number[] = [];
    for (const o of train) {
      rows.push(this.features(o));
      ys.push(o.correct ? 1 : 0);
      this.remember(o);
      const item = this.itemKey(o);
      if (item) this.seen.set(item, (this.seen.get(item) ?? 0) + 1);
    }
    // The training students' records are only for building their rows; the students predicted next are others.
    this.forget();
    const squares = new Map<string, number>();
    const order = rows.map((_, i) => i);
    const r = rng(this.params.seed);
    for (let epoch = 0; epoch < this.params.epochs; epoch++) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(r.next() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      for (const i of order) {
        const x = rows[i];
        const error = sigmoid(this.logit(x)) - ys[i];
        for (const [key, v] of x) {
          const g = error * v;
          if (g === 0) continue;
          const s = (squares.get(key) ?? 0) + g * g;
          squares.set(key, s);
          this.weights.set(key, (this.weights.get(key) ?? 0) - (this.params.rate * g) / Math.sqrt(s));
        }
      }
    }
  }

  update(o: Observation) {
    const item = this.itemKey(o);
    if (item && this.params.itemStep) {
      const n = this.seen.get(item) ?? 0;
      const surprise = (o.correct ? 1 : 0) - this.predict(o);
      this.weights.set(item, (this.weights.get(item) ?? 0) + (this.params.itemStep / (1 + 0.05 * n)) * surprise);
      this.seen.set(item, n + 1);
    }
    this.remember(o);
  }

  /** A fitted weight, by its name in features() (0 for one the fit never met). */
  weight(key: string) {
    return this.weights.get(key) ?? 0;
  }
}

// ---------- as a mastery rule (H3) ----------

const practiceKey = (student: string, skill: string) => `${student}\u0000${skill}`;
/**
 * After each answer of each held-out student on each skill, the fitted model's chance of a right answer on a next
 * question of that skill, one with no difficulty of its own: what the student's record says, not the question. The
 * held-out answers are replayed in order, so a score uses only answers already given, on every skill.
 */
export function logisticScores(train: readonly Observation[], test: readonly Observation[], params: Partial<LogisticParams> = {}): Map<string, number[]> {
  const model = new LogisticModel(params);
  model.fit(train);
  const scores = new Map<string, number[]>();
  for (const o of test) {
    model.update(o);
    const key = practiceKey(o.student, o.skill);
    (scores.get(key) ?? scores.set(key, []).get(key)!).push(model.predict({ student: o.student, skill: o.skill, level: o.level, correct: false }));
  }
  return scores;
}
/** Mastered once the logistic score after an answer reaches the threshold; it reads the scores of the practice's student and skill. */
export const logisticRule = (scores: ReadonlyMap<string, readonly number[]>, threshold: number): MasteryRule => ({
  name: `logistic θ ${Number(threshold.toFixed(4))}`,
  declare(_skill, answers, practice?: Practice) {
    if (!practice) throw new Error("the logistic rule needs the practice, for its student");
    const at = scores.get(practiceKey(practice.student, practice.skill)) ?? [];
    for (let i = 0; i < Math.min(answers.length, at.length); i++) if (at[i] >= threshold) return i + 1;
    return null;
  },
});
