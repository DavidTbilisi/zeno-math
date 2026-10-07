// Synthetic learners with a known truth: each has an ability on every skill (overall + area + skill, like the model)
// that grows a little with every question practised, and every skill and level has a true difficulty. Answers are
// drawn from σ(ability − difficulty). A model that works should find the difficulties and rank the students; the
// simulation study compares ways of choosing questions on the same learners.
import { ALL_SKILLS, AREAS, SKILLS, areaOf, type Area, type SkillId } from "../math/practiceSkills.ts";
import { sigmoid, type Level, type Observation } from "./elo.ts";

export type SimParams = {
  students: number;
  /** Questions each student answers. */
  questions: number;
  seed: number;
  /** Spread (standard deviation) of each layer of true ability, and of skill difficulty. */
  spread: { global: number; area: number; skill: number; difficulty: number };
  /** How much harder each level is than the one below. */
  levelGap: number;
  /** How much one question practised raises the true ability on its skill. */
  learnRate: number;
};
export const DEFAULT_SIM: SimParams = {
  students: 120,
  questions: 150,
  seed: 1,
  spread: { global: 1, area: 0.5, skill: 0.5, difficulty: 0.7 },
  levelGap: 1,
  learnRate: 0.02,
};

/** mulberry32, with normal draws by Box–Muller. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (sd = 1) => sd * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  const pick = <T>(items: readonly T[]) => items[Math.floor(next() * items.length)];
  return { next, normal, pick };
}

export type SimLearner = { id: string; ability: Map<SkillId, number> };
export type World = {
  learners: SimLearner[];
  difficulty(skill: SkillId, level: Level): number;
  /** The true chance of a right answer now. */
  chance(learner: SimLearner, skill: SkillId, level: Level): number;
  /** Draws an answer and lets the learner learn from the question. */
  answer(learner: SimLearner, skill: SkillId, level: Level): boolean;
};

export function makeWorld(params: Partial<SimParams> = {}): World {
  const p = { ...DEFAULT_SIM, ...params, spread: { ...DEFAULT_SIM.spread, ...params.spread } };
  const r = rng(p.seed);
  const base = new Map(ALL_SKILLS.map((k) => [k, r.normal(p.spread.difficulty)]));
  const learners = Array.from({ length: p.students }, (_, i) => {
    const global = r.normal(p.spread.global);
    const area = new Map<Area, number>(AREAS.map((a) => [a, r.normal(p.spread.area)]));
    return { id: `sim${i + 1}`, ability: new Map(ALL_SKILLS.map((k) => [k, global + area.get(areaOf(k))! + r.normal(p.spread.skill)])) };
  });
  const difficulty = (skill: SkillId, level: Level) => base.get(skill)! + (level - 2) * p.levelGap;
  const chance = (l: SimLearner, skill: SkillId, level: Level) => sigmoid(l.ability.get(skill)! - difficulty(skill, level));
  return {
    learners,
    difficulty,
    chance,
    answer(l, skill, level) {
      const right = r.next() < chance(l, skill, level);
      l.ability.set(skill, l.ability.get(skill)! + p.learnRate);
      return right;
    },
  };
}

/**
 * A class practising at random: each student in turn picks an area, a skill in it and a level, so answers from
 * different students interleave as they would in a lesson. Returns the answers in order and the world they came from.
 */
export function simulateRandom(params: Partial<SimParams> = {}) {
  const p = { ...DEFAULT_SIM, ...params };
  const world = makeWorld(p);
  const r = rng(p.seed + 1);
  const observations: Observation[] = [];
  for (let q = 0; q < p.questions; q++)
    for (const l of world.learners) {
      const skill = r.pick(SKILLS[r.pick(AREAS)] as readonly SkillId[]);
      const level = r.pick([1, 2, 3] as const);
      observations.push({ student: l.id, skill, level, correct: world.answer(l, skill, level) });
    }
  return { observations, world };
}
