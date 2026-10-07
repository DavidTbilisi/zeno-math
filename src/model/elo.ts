// The learner model: an Elo-style rating of students and questions (Pelánek 2016, "Applications of the Elo rating
// system in adaptive educational systems"; Klinkenberg et al. 2011, Math Garden). The chance that a student gets a
// question right first time is
//
//   P(correct) = σ(θ_student + θ_student,area + θ_student,skill − (b_skill + (level − 2)·step + r_skill,level))
//
// Ability has three layers, so a skill the student hasn't tried yet starts from what they showed in its area and
// overall. Difficulty belongs to a skill at a level, not to one generated question: seeds are endless and each is seen
// once. It has layers too: answers at any level move the skill's difficulty b, and only a smaller adjustment r is
// kept per level, so the levels of a skill keep their order until the answers really say otherwise. After each answer every term moves by the surprise (result − prediction), scaled by an uncertainty U(n) =
// α / (1 + β·n) that shrinks as the term collects evidence: new students and questions move fast, settled ones slowly.
// Imports name their .ts files: the server runs this with plain Node, which doesn't guess extensions.
import { areaOf, type Area, type SkillId } from "../math/practiceSkills.ts";

export type Level = 1 | 2 | 3;
/** One answer the model learns from: was the student's first counted answer to a question correct? */
export type Observation = { student: string; skill: SkillId; level: Level; correct: boolean };

export type EloParams = {
  /** Uncertainty U(n) = alpha / (1 + beta·n). */
  alpha: number;
  beta: number;
  /** How much of each surprise goes to each layer of ability. */
  weights: { global: number; area: number; skill: number };
  /** How much of each surprise goes to the skill's difficulty and to the level's own adjustment. */
  difficultyWeights: { skill: number; level: number };
  /** How much harder each level starts than the one below (level 2 starts at 0). */
  levelStep: number;
};
// Chosen on simulated classes (src/model/simulate.ts, seeds apart from the tests'); refit on real answers with
// `npm run model -- attempts.csv --fit`. Every answer moves three layers, so the total step is about 2·alpha.
export const DEFAULT_PARAMS: EloParams = {
  alpha: 0.4,
  beta: 0.05,
  weights: { global: 0.4, area: 0.6, skill: 1 },
  difficultyWeights: { skill: 1, level: 0.5 },
  levelStep: 0.8,
};

type Rating = { v: number; n: number };
type StudentState = { global: Rating; area: Map<Area, Rating>; skill: Map<SkillId, Rating> };
export type Mastery = { skill: SkillId; n: number; ability: number; p: Record<Level, number> };

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const itemKey = (skill: SkillId, level: Level) => `${skill}:${level}`;
const rating = (): Rating => ({ v: 0, n: 0 });
const get = <K>(m: Map<K, Rating>, k: K) => m.get(k) ?? m.set(k, rating()).get(k)!;

export class EloModel {
  readonly name = "elo";
  readonly params: EloParams;
  private students = new Map<string, StudentState>();
  /** b: the difficulty of each skill, whatever the level. */
  private skills = new Map<SkillId, Rating>();
  /** r: what each level of a skill adds on top of b and the level step. */
  private levels = new Map<string, Rating>();
  constructor(params: Partial<EloParams> = {}) {
    const d = DEFAULT_PARAMS;
    this.params = { ...d, ...params, weights: { ...d.weights, ...params.weights }, difficultyWeights: { ...d.difficultyWeights, ...params.difficultyWeights } };
  }

  private uncertainty(n: number) {
    return this.params.alpha / (1 + this.params.beta * n);
  }
  private student(id: string): StudentState {
    let s = this.students.get(id);
    if (!s) this.students.set(id, (s = { global: rating(), area: new Map(), skill: new Map() }));
    return s;
  }

  /** The student's ability on a skill: the three layers added up (0 for someone the model hasn't seen). */
  ability(student: string, skill: SkillId): number {
    const s = this.students.get(student);
    if (!s) return 0;
    return s.global.v + (s.area.get(areaOf(skill))?.v ?? 0) + (s.skill.get(skill)?.v ?? 0);
  }
  difficulty(skill: SkillId, level: Level): number {
    return (this.skills.get(skill)?.v ?? 0) + (level - 2) * this.params.levelStep + (this.levels.get(itemKey(skill, level))?.v ?? 0);
  }
  /** P(the student answers a question of this skill and level right first time). */
  predict(o: Pick<Observation, "student" | "skill" | "level">): number {
    return sigmoid(this.ability(o.student, o.skill) - this.difficulty(o.skill, o.level));
  }

  update(o: Observation) {
    const surprise = (o.correct ? 1 : 0) - this.predict(o);
    const s = this.student(o.student);
    const w = this.params.weights;
    // Every rating moves by its own uncertainty, read before any of them is counted.
    const layers: [Rating, number][] = [[s.global, w.global], [get(s.area, areaOf(o.skill)), w.area], [get(s.skill, o.skill), w.skill]];
    for (const [r, weight] of layers) {
      r.v += weight * this.uncertainty(r.n) * surprise;
      r.n++;
    }
    const dw = this.params.difficultyWeights;
    for (const [r, weight] of [[get(this.skills, o.skill), dw.skill], [get(this.levels, itemKey(o.skill, o.level)), dw.level]] as const) {
      r.v -= weight * this.uncertainty(r.n) * surprise;
      r.n++;
    }
  }

  /** How well the student knows a skill: the chance of a right first answer at each level, and how many answers that rests on. */
  mastery(student: string, skill: SkillId): Mastery {
    const at = (level: Level) => this.predict({ student, skill, level });
    return { skill, n: this.students.get(student)?.skill.get(skill)?.n ?? 0, ability: this.ability(student, skill), p: { 1: at(1), 2: at(2), 3: at(3) } };
  }

  /** What the model has learnt: every rating, for the dashboard and for checking the model against the data. */
  snapshot() {
    return {
      items: Object.fromEntries([...this.levels].map(([k, r]) => {
        const [skill, level] = k.split(":") as [SkillId, string];
        return [k, { d: this.difficulty(skill, Number(level) as Level), n: r.n }];
      })),
      students: Object.fromEntries([...this.students].map(([id, s]) => [id, {
        global: s.global.v,
        n: s.global.n,
        area: Object.fromEntries([...s.area].map(([a, r]) => [a, r.v])),
        skill: Object.fromEntries([...s.skill].map(([k, r]) => [k, { v: r.v, n: r.n }])),
      }])),
    };
  }
}
