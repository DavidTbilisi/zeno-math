// Synthetic learners with a known truth: each has an ability on every skill (overall + area + skill, like the model)
// that grows a little with every question practised, and every skill and level has a true difficulty. Answers are
// drawn from σ(ability − difficulty). A model that works should find the difficulties and rank the students; the
// simulation study (runStudy) compares the two ways of choosing questions on the same kind of learners.
//
// How much a question teaches is an assumption, not something the simulation can find out: "flat" says every
// question teaches the same; "zpd" says a question teaches most when the learner has about an even chance, and little
// when it is far too easy or too hard (the zone of proximal development, as a gain of 4p(1 − p)). Likewise transfer:
// whether practising a skill also helps the skills built on it (0: not at all, as the learner model assumes). Report
// results across these assumptions, never for one alone.
import { ALL_SKILLS, AREAS, SKILLS, areaOf, type Area, type SkillId } from "../math/practiceSkills.ts";
import { EloModel, sigmoid, type Level, type Observation } from "./elo.ts";
import { inCurriculumOrder, PREREQUISITES } from "./curriculum.ts";
import { choose, type Policy } from "./policy.ts";

export type SimParams = {
  students: number;
  /** Questions each student answers. */
  questions: number;
  seed: number;
  /** Spread (standard deviation) of each layer of true ability, and of skill difficulty. */
  spread: { global: number; area: number; skill: number; difficulty: number };
  /** How much harder each level is than the one below. */
  levelGap: number;
  /** How much one question practised raises the true ability on its skill (at most, under "zpd"). */
  learnRate: number;
  learning: "flat" | "zpd";
  /** The share of a question's learning that also goes to each skill built directly on its skill. */
  transfer: number;
};
export const DEFAULT_SIM: SimParams = {
  students: 120,
  questions: 150,
  seed: 1,
  spread: { global: 1, area: 0.5, skill: 0.5, difficulty: 0.7 },
  levelGap: 1,
  learnRate: 0.02,
  learning: "flat",
  transfer: 0,
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
  const dependants = new Map<SkillId, SkillId[]>();
  for (const [k, pres] of Object.entries(PREREQUISITES)) for (const pre of pres!) dependants.set(pre, [...(dependants.get(pre) ?? []), k as SkillId]);
  const chance = (l: SimLearner, skill: SkillId, level: Level) => sigmoid(l.ability.get(skill)! - difficulty(skill, level));
  return {
    learners,
    difficulty,
    chance,
    answer(l, skill, level) {
      const pr = chance(l, skill, level);
      const right = r.next() < pr;
      const gain = p.learnRate * (p.learning === "zpd" ? 4 * pr * (1 - pr) : 1);
      l.ability.set(skill, l.ability.get(skill)! + gain);
      if (p.transfer) for (const k of dependants.get(skill) ?? []) l.ability.set(k, l.ability.get(k)! + p.transfer * gain);
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

// ---------- the simulation study ----------

export type StudyParams = SimParams & { skills: readonly SkillId[] };
export type StudyResult = {
  learners: { condition: Policy; pre: number; post: number }[];
  /** The true chance of a right answer on every question chosen, by condition. */
  chosen: Record<Policy, number[]>;
};

/**
 * A simulated class study: students alternate between the conditions, everyone answers the same number of questions
 * on the class's skills, one question per student per round, and one learner model learns from everybody (as the
 * server's does). The test before and after is each student's true expected score on every skill at every level.
 * Reviews of missed questions are left out: they are the same in both conditions.
 */
export function runStudy(params: Partial<StudyParams> = {}): StudyResult {
  const p = { ...DEFAULT_SIM, skills: inCurriculumOrder(SKILLS.algebra), ...params };
  const world = makeWorld(p);
  const model = new EloModel();
  const r = rng(p.seed + 2);
  const levels = [1, 2, 3] as const;
  const test = (l: SimLearner) => p.skills.reduce((s, k) => s + levels.reduce((t, L) => t + world.chance(l, k, L), 0), 0) / (p.skills.length * levels.length);
  const learners = world.learners.map((l, i) => ({ l, condition: (i % 2 ? "fixed" : "adaptive") as Policy, pre: test(l), position: 0, recent: [] as SkillId[] }));
  const chosen: Record<Policy, number[]> = { adaptive: [], fixed: [] };
  for (let q = 0; q < p.questions; q++)
    for (const s of learners) {
      const c = choose(s.condition, model, s.l.id, p.skills, s.position, { recent: s.recent, random: r.next });
      chosen[s.condition].push(world.chance(s.l, c.skill, c.level));
      model.update({ student: s.l.id, skill: c.skill, level: c.level, correct: world.answer(s.l, c.skill, c.level) });
      s.position++;
      s.recent = [...s.recent, c.skill].slice(-3);
    }
  return { learners: learners.map((s) => ({ condition: s.condition, pre: s.pre, post: test(s.l) })), chosen };
}

const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = (xs: readonly number[]) => Math.sqrt(xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1));
/** Gains by condition and the standardised difference (Cohen's d, pooled SD) of adaptive over fixed. */
export function summarise(result: StudyResult) {
  const gains = (c: Policy) => result.learners.filter((l) => l.condition === c).map((l) => l.post - l.pre);
  const [a, f] = [gains("adaptive"), gains("fixed")];
  const pooled = Math.sqrt(((a.length - 1) * sd(a) ** 2 + (f.length - 1) * sd(f) ** 2) / (a.length + f.length - 2));
  const side = (c: Policy, g: number[]) => ({
    n: g.length,
    pre: mean(result.learners.filter((l) => l.condition === c).map((l) => l.pre)),
    gain: mean(g),
    sd: sd(g),
    /** How far the questions were, on average, from the target chance of a right answer. */
    offTarget: mean(result.chosen[c].map((x) => Math.abs(x - 0.75))),
  });
  return { adaptive: side("adaptive", a), fixed: side("fixed", f), d: (mean(a) - mean(f)) / pooled };
}
