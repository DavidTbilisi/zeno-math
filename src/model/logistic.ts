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
//   P(correct) = σ(b + e_skill,level + s·(level − 2) + e_item + Σ_layers [w_c·log(1 + right) + w_f·log(1 + wrong)] + recency + gap)
//
// The step s between levels is shared by every skill, so a skill no answer has fitted yet still has its levels in
// order (ASSISTments has one level, where it plays no part). This is the learner model the app runs, kept up to date
// with a class's answers by src/model/classModel.ts; its state goes to each student's browser (src/learner.ts).
//
// Each weight belongs to its skill (or item, or area) where the feature is the skill's own, and is fitted on the
// training students by Adagrad over a few passes, which is enough to keep rare items' weights small. A question no
// training student saw starts at its skill's difficulty, and every question's difficulty keeps moving with the answers
// to it, by the same shrinking step U(n) = itemStep / (1 + 0.05·n) the Elo model uses (src/model/elo.ts).
import { areaOf, type SkillId } from "../math/practiceSkills.ts";
import type { Level, Observation } from "./elo.ts";
import type { Predictor } from "./evaluate.ts";
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
/** One student's records: on every skill, each skill (with the answer at which it was last practised) and each area. */
type Learner = { answers: number; total: Tally; skills: Map<string, Tally & { lastAt: number }>; areas: Map<string, Tally> };
type Feature = [key: string, value: number];
/** What a prediction needs to know of an answer: whose, on what skill and level, and the question where there is one. */
export type Asked = Pick<Observation, "student" | "skill" | "level" | "item">;
const tally = (): Tally => ({ right: 0, wrong: 0, recent: 0 });
const learner = (): Learner => ({ answers: 0, total: tally(), skills: new Map(), areas: new Map() });
const phi = Math.log1p;
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** A tally as [right, wrong, recent]; a skill's adds the answer at which it was last practised. */
type TallyRow = [right: number, wrong: number, recent: number];
/** What the model has learnt, as plain JSON: every weight, the answers each question's step rests on and each skill's answers, and the records of the students asked for. */
export type LogisticState = {
  weights: Record<string, number>;
  seen: Record<string, number>;
  /** Answers counted on each skill, everyone's. */
  answers: Record<string, number>;
  students: Record<string, { answers: number; total: TallyRow; skills: Record<string, [...TallyRow, number]>; areas: Record<string, TallyRow> }>;
};
/** How well the student knows a skill: the chance of a right first answer at each level, and how many answers on it that rests on (as the Elo model gives it). */
export type LogisticMastery = { skill: string; n: number; p: Record<Level, number> };

export class LogisticModel implements Predictor {
  readonly name: string;
  readonly params: LogisticParams;
  private weights = new Map<string, number>();
  /** Answers each question's difficulty rests on, for its step after the fit. */
  private seen = new Map<string, number>();
  private skillAnswers = new Map<string, number>();
  private learners = new Map<string, Learner>();
  constructor(params: Partial<LogisticParams> = {}, name = "logistic") {
    this.params = { ...LOGISTIC_PARAMS, ...params };
    this.name = name;
  }

  private learner(student: string) {
    return this.learners.get(student) ?? this.learners.set(student, learner()).get(student)!;
  }
  private itemKey(o: Asked) {
    return this.params.items && o.item !== undefined ? `q:${o.item}` : null;
  }

  /** What is known before the answer, as (weight name, value) pairs. */
  features(o: Asked): Feature[] {
    const s = this.learners.get(o.student) ?? learner();
    const a = this.params.areaOf(o.skill);
    const skill = s.skills.get(o.skill), area = s.areas.get(a) ?? tally(), total = s.total;
    const x: Feature[] = [
      ["b", 1],
      [`e:${o.skill}:${o.level}`, 1],
      [`sr:${o.skill}`, phi(skill?.right ?? 0)], [`sw:${o.skill}`, phi(skill?.wrong ?? 0)],
      [`ar:${a}`, phi(area.right)], [`aw:${a}`, phi(area.wrong)],
      ["tr", phi(total.right)], ["tw", phi(total.wrong)],
    ];
    // One step between levels, shared by every skill, so a skill no answer has fitted yet still has its levels in order.
    if (o.level !== 2) x.push(["lv", o.level - 2]);
    const item = this.itemKey(o);
    if (item) x.push([item, 1]);
    if (this.params.recency) x.push([`sn:${o.skill}`, skill?.recent ?? 0], ["sn", skill?.recent ?? 0], ["tn", total.recent]);
    x.push(skill === undefined ? ["new", 1] : ["gap", phi(s.answers - skill.lastAt - 1)]);
    return x;
  }
  private logit(x: readonly Feature[]) {
    let z = 0;
    for (const [key, v] of x) z += (this.weights.get(key) ?? 0) * v;
    return z;
  }
  predict(o: Asked) {
    return sigmoid(this.logit(this.features(o)));
  }
  /** The same, without an object to build: the adaptive policy asks many times per question. */
  predictAt(student: string, skill: string, level: Level) {
    return this.predict({ student, skill, level });
  }
  mastery(student: string, skill: string): LogisticMastery {
    const t = this.learners.get(student)?.skills.get(skill);
    const at = (level: Level) => this.predictAt(student, skill, level);
    return { skill, n: t ? t.right + t.wrong : 0, p: { 1: at(1), 2: at(2), 3: at(3) } };
  }

  /** Counts the answer into the student's records, after it has been predicted. */
  private remember(o: Observation) {
    const s = this.learner(o.student);
    const r = this.params.recency;
    const a = this.params.areaOf(o.skill);
    const skill = s.skills.get(o.skill) ?? s.skills.set(o.skill, { ...tally(), lastAt: 0 }).get(o.skill)!;
    const area = s.areas.get(a) ?? s.areas.set(a, tally()).get(a)!;
    for (const t of [skill, area, s.total]) {
      if (o.correct) t.right++;
      else t.wrong++;
      t.recent = (1 - r) * t.recent + r * (o.correct ? 1 : -1);
    }
    skill.lastAt = s.answers++;
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
    this.learners.clear();
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
    this.skillAnswers.set(o.skill, (this.skillAnswers.get(o.skill) ?? 0) + 1);
    this.remember(o);
  }

  /** Counts an answer into the records without learning from it: how the records are rebuilt after a fit on those answers. */
  track(o: Observation) {
    this.skillAnswers.set(o.skill, (this.skillAnswers.get(o.skill) ?? 0) + 1);
    this.remember(o);
  }

  /** A fitted weight, by its name in features() (0 for one the fit never met). */
  weight(key: string) {
    return this.weights.get(key) ?? 0;
  }

  /** What the model has learnt, as plain JSON: every weight, and the records of the students asked for (all if none). */
  state(students?: readonly string[]): LogisticState {
    const row = (t: Tally): TallyRow => [t.right, t.wrong, t.recent];
    const ids = students ?? [...this.learners.keys()];
    return {
      weights: Object.fromEntries(this.weights),
      seen: Object.fromEntries(this.seen),
      answers: Object.fromEntries(this.skillAnswers),
      students: Object.fromEntries(ids.flatMap((id) => {
        const s = this.learners.get(id);
        return s ? [[id, {
          answers: s.answers, total: row(s.total),
          skills: Object.fromEntries([...s.skills].map(([k, t]) => [k, [...row(t), t.lastAt] as [...TallyRow, number]])),
          areas: Object.fromEntries([...s.areas].map(([k, t]) => [k, row(t)])),
        }]] : [];
      })),
    };
  }
  /** A model that carries on from a saved state (the server's, sent to a student's browser). */
  static fromState(state: LogisticState, params: Partial<LogisticParams> = {}): LogisticModel {
    const m = new LogisticModel(params);
    const t = ([right, wrong, recent]: readonly number[]): Tally => ({ right, wrong, recent });
    m.weights = new Map(Object.entries(state.weights));
    m.seen = new Map(Object.entries(state.seen));
    m.skillAnswers = new Map(Object.entries(state.answers));
    for (const [id, s] of Object.entries(state.students))
      m.learners.set(id, {
        answers: s.answers, total: t(s.total),
        skills: new Map(Object.entries(s.skills).map(([k, r]) => [k, { ...t(r), lastAt: r[3] }])),
        areas: new Map(Object.entries(s.areas).map(([k, r]) => [k, t(r)])),
      });
    return m;
  }
}

/** A student no model has seen: what the logistic model expects of someone with no answers yet. */
const NEWCOMER = "\u0000newcomer";
/** The chance of a right medium question for a student with no answers, per skill: the adaptive policy's unlock floor (src/model/policy.ts). */
export const newcomerChance = (model: LogisticModel) => (skill: string) => model.predictAt(NEWCOMER, skill, 2);
