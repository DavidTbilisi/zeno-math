// Synthetic learners with a known truth, for the tests and the simulation study (runStudy), which compares ways of
// choosing questions on the same kind of learners. Every skill and level has a true difficulty, and each learner an
// ability on every skill (overall + area + skill, like the model). How those turn into answers is the "world":
//
//   elo:    the chance of a right answer is σ(ability − difficulty), the learner model's own form. A model that works
//           should find the difficulties and rank the students; but a study run only here favours the model's view.
//   irt2pl: the same with a discrimination per skill, σ(a·(ability − difficulty)): some skills separate those who know
//           from those who don't more sharply than the model assumes.
//   bkt:    each skill is known or not, as in Bayesian Knowledge Tracing; a learner who knows it slips sometimes and
//           one who doesn't guesses sometimes (more often on easier levels). Ability sets the chance of knowing it at
//           the start, and practice may teach it, all at once.
//
// How much a question teaches is an assumption, not something the simulation can find out: "flat" says every
// question teaches the same; "zpd" says a question teaches most when the learner has about an even chance, and little
// when it is far too easy or too hard (the zone of proximal development, as a gain of 4p(1 − p)). Likewise transfer:
// whether practising a skill also helps the skills built on it (0: not at all, as the learner model assumes). Report
// results across these assumptions and worlds, never for one alone.
import { AREAS, FIRST_SKILLS, type Area, type SkillId } from "../math/practiceSkills.ts";
import { EloModel, sigmoid, type Level, type Observation } from "./elo.ts";
import { inCurriculumOrder, PREREQUISITES } from "./curriculum.ts";
import { choose, TARGET, type Policy } from "./policy.ts";
import { testItems } from "./testForms.ts";

/**
 * The skills simulated learners have: Zeno's skills as they were when the results in docs/results were made. The world
 * draws its random numbers skill by skill, so simulating a skill added later would change every number in them; new
 * skills are left out until the results are made again.
 */
export const SIM_SKILLS = FIRST_SKILLS;
const ALL_SKILLS: SkillId[] = AREAS.flatMap((a) => [...SIM_SKILLS[a]]);
const AREA_OF = new Map<SkillId, Area>(AREAS.flatMap((a) => SIM_SKILLS[a].map((s) => [s, a] as const)));
const areaOf = (s: SkillId): Area => AREA_OF.get(s)!;
export const isSimSkill = (s: SkillId) => ALL_SKILLS.includes(s);

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
  /** How answers come from what the learner knows (see the top of this file). */
  world: "elo" | "irt2pl" | "bkt";
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
  world: "elo",
};
export const WORLDS: readonly SimParams["world"][] = ["elo", "irt2pl", "bkt"];

/** BKT world: guessing is easier and slipping rarer on easy questions. */
const GUESS: Record<Level, number> = { 1: 0.3, 2: 0.2, 3: 0.1 };
const SLIP: Record<Level, number> = { 1: 0.05, 2: 0.1, 3: 0.2 };
/** BKT world: the chance that one question teaches an unknown skill, for a learning rate in ability units (0.02 → 5 %). */
const LEARN_PER_RATE = 2.5;

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

/** ability: the learner's true ability on each skill; known: in the BKT world, whether they know it. */
export type SimLearner = { id: string; ability: Map<SkillId, number>; known: Map<SkillId, boolean> };
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
  const learners: SimLearner[] = Array.from({ length: p.students }, (_, i) => {
    const global = r.normal(p.spread.global);
    const area = new Map<Area, number>(AREAS.map((a) => [a, r.normal(p.spread.area)]));
    return { id: `sim${i + 1}`, ability: new Map(ALL_SKILLS.map((k) => [k, global + area.get(areaOf(k))! + r.normal(p.spread.skill)])), known: new Map() };
  });
  const difficulty = (skill: SkillId, level: Level) => base.get(skill)! + (level - 2) * p.levelGap;
  const dependants = new Map<SkillId, SkillId[]>();
  for (const [k, pres] of Object.entries(PREREQUISITES)) for (const pre of pres!) if (isSimSkill(k as SkillId)) dependants.set(pre, [...(dependants.get(pre) ?? []), k as SkillId]);

  if (p.world === "bkt") {
    // Ability against the skill's middle difficulty is the chance of knowing it at the start.
    for (const l of learners) for (const k of ALL_SKILLS) l.known.set(k, r.next() < sigmoid(l.ability.get(k)! - base.get(k)!));
    const chance = (l: SimLearner, skill: SkillId, level: Level) => (l.known.get(skill) ? 1 - SLIP[level] : GUESS[level]);
    const teach = (l: SimLearner, skill: SkillId, pr: number) => {
      if (!l.known.get(skill) && r.next() < pr) l.known.set(skill, true);
    };
    return {
      learners,
      difficulty,
      chance,
      answer(l, skill, level) {
        const pr = chance(l, skill, level);
        const right = r.next() < pr;
        const learn = Math.min(1, LEARN_PER_RATE * p.learnRate) * (p.learning === "zpd" ? 4 * pr * (1 - pr) : 1);
        teach(l, skill, learn);
        if (p.transfer) for (const k of dependants.get(skill) ?? []) teach(l, k, p.transfer * learn);
        return right;
      },
    };
  }

  // How sharply each skill separates learners: 1 everywhere in the elo world, spread around 1 in the irt2pl world.
  const discrimination = new Map(ALL_SKILLS.map((k) => [k, p.world === "irt2pl" ? Math.exp(r.normal(0.4)) : 1]));
  const chance = (l: SimLearner, skill: SkillId, level: Level) => sigmoid(discrimination.get(skill)! * (l.ability.get(skill)! - difficulty(skill, level)));
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
      const skill = r.pick(SIM_SKILLS[r.pick(AREAS)] as readonly SkillId[]);
      const level = r.pick([1, 2, 3] as const);
      observations.push({ student: l.id, skill, level, correct: world.answer(l, skill, level) });
    }
  return { observations, world };
}

// ---------- the simulation study ----------

/** A way of choosing questions: the two in the study, and a random one as a floor (simulations only). */
export type SimPolicy = Policy | "random";
/** One arm of a simulated study: a policy, and for adaptive the chance it aims at (TARGET unless given). */
export type Arm = { policy: SimPolicy; target?: number };
export const armName = (a: Arm) => (a.policy === "adaptive" && a.target !== undefined && a.target !== TARGET ? `adaptive ${a.target}` : a.policy);

export type StudyParams = SimParams & {
  skills: readonly SkillId[];
  /** The two arms compared; students alternate between them. */
  arms: readonly [Arm, Arm];
  /** Questions on each test, as in a class (src/model/testForms.ts). */
  testLength: number;
};
export type SimStudent = {
  arm: 0 | 1;
  /** True expected scores on every skill at every level, before and after: what the test tries to measure. */
  pre: number;
  post: number;
  /** Scores on a test of testLength questions, answered right or wrong by chance: what a class study would see. */
  preTest: number;
  postTest: number;
};
export type StudyResult = {
  arms: [string, string];
  learners: SimStudent[];
  /** The true chance of a right answer on every question chosen, by arm. */
  chosen: [number[], number[]];
  /** What each arm aimed at, for how far off target its questions were. */
  targets: [number, number];
};

/**
 * A simulated class study: students alternate between the arms, everyone answers the same number of questions on the
 * class's skills, one question per student per round, and one learner model learns from everybody (as the server's
 * does). Each student's true expected score is taken before and after, and so is a test as a class would sit it.
 * Reviews of missed questions are left out: they are the same in both conditions.
 */
export function runStudy(params: Partial<StudyParams> = {}): StudyResult {
  const p: StudyParams = { ...DEFAULT_SIM, skills: inCurriculumOrder(SIM_SKILLS.algebra), arms: [{ policy: "adaptive" }, { policy: "fixed" }], testLength: 12, ...params };
  const world = makeWorld(p);
  const model = new EloModel();
  const r = rng(p.seed + 2);
  const tr = rng(p.seed + 3); // the tests draw their own luck, so they don't change what happens in practice
  const levels = [1, 2, 3] as const;
  const truth = (l: SimLearner) => p.skills.reduce((s, k) => s + levels.reduce((t, L) => t + world.chance(l, k, L), 0), 0) / (p.skills.length * levels.length);
  const items = testItems("SIM", p.skills, "A", p.testLength);
  const sit = (l: SimLearner) => items.filter((q) => tr.next() < world.chance(l, q.skill, q.level)).length / items.length;
  const learners = world.learners.map((l, i) => ({ l, arm: (i % 2) as 0 | 1, pre: truth(l), preTest: sit(l), position: 0, recent: [] as SkillId[] }));
  const chosen: [number[], number[]] = [[], []];
  for (let q = 0; q < p.questions; q++)
    for (const s of learners) {
      const arm = p.arms[s.arm];
      const c = arm.policy === "random"
        ? { skill: r.pick(p.skills), level: r.pick(levels) }
        : choose(arm.policy, model, s.l.id, p.skills, s.position, { recent: s.recent, random: r.next, target: arm.target });
      chosen[s.arm].push(world.chance(s.l, c.skill, c.level));
      model.update({ student: s.l.id, skill: c.skill, level: c.level, correct: world.answer(s.l, c.skill, c.level) });
      s.position++;
      s.recent.push(c.skill);
      if (s.recent.length > 3) s.recent.shift();
    }
  const targetOf = (a: Arm) => (a.policy === "adaptive" ? a.target ?? TARGET : TARGET);
  return {
    arms: [armName(p.arms[0]), armName(p.arms[1])],
    learners: learners.map((s) => ({ arm: s.arm, pre: s.pre, post: truth(s.l), preTest: s.preTest, postTest: sit(s.l) })),
    chosen,
    targets: [targetOf(p.arms[0]), targetOf(p.arms[1])],
  };
}

export const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
export const sd = (xs: readonly number[]) => Math.sqrt(xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1));
/** Standardised difference of two groups' means (Cohen's d, pooled SD). */
export function cohensD(a: readonly number[], b: readonly number[]) {
  const pooled = Math.sqrt(((a.length - 1) * sd(a) ** 2 + (b.length - 1) * sd(b) ** 2) / (a.length + b.length - 2));
  return (mean(a) - mean(b)) / pooled;
}
/** Gains by arm and the standardised difference (Cohen's d) of the first arm over the second, in true and test gains. */
export function summarise(result: StudyResult) {
  const of = (arm: 0 | 1) => result.learners.filter((l) => l.arm === arm);
  const gains = (arm: 0 | 1) => of(arm).map((l) => l.post - l.pre);
  const testGains = (arm: 0 | 1) => of(arm).map((l) => l.postTest - l.preTest);
  const side = (arm: 0 | 1) => ({
    name: result.arms[arm],
    n: of(arm).length,
    pre: mean(of(arm).map((l) => l.pre)),
    gain: mean(gains(arm)),
    sd: sd(gains(arm)),
    /** How far the questions were, on average, from the chance the arm aimed at. */
    offTarget: mean(result.chosen[arm].map((x) => Math.abs(x - result.targets[arm]))),
  });
  return { a: side(0), b: side(1), d: cohensD(gains(0), gains(1)), dTest: cohensD(testGains(0), testGains(1)) };
}
