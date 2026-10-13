// The same real answers at several grains (G4 in docs/thesis/outline.md). A data set tags each answer with a skill;
// the same answers can be modelled at that grain, at the grain of the topics those skills fall into, or as one skill
// for everything, with nothing else changed. BKT and the moving average are fitted at each grain on the training
// students and predict the held-out students' answers, and the paired test of H1 (pairedLogLoss in evaluate.ts) says
// whether a finer grain predicts better: the finest against the coarsest is the one confirmatory test, the rest are
// description. Beside prediction, the mastery declarations each method makes at each grain are counted as H3 counts
// them, since there is no truth to judge them against.
//
// A problem tagged with several skills is one observation per skill at the finest grain, and when those skills fall
// together at a coarser grain it becomes one observation there (regrain). The paired tests therefore run on the
// answers every grain has: the first observation of each problem, which every grain keeps.
import { fitShares, type FitShares } from "./atoms.ts";
import type { Observation } from "./elo.ts";
import { answerLoss, BktModel, bootstrapGroups, EmaModel, heldOutPredictions, pairedLogLoss, sequencesBySkill, SMALLEST_DIFFERENCE, splitByStudent, type PairedTest, type StudentPrediction } from "./evaluate.ts";
import { judge, practicesFrom, rightAfter, usualRules, type Fitted, type Judgement } from "./mastery.ts";

export type Grain = "skill" | "topic" | "one";
/** Finest first. */
export const GRAINS: readonly Grain[] = ["skill", "topic", "one"];
/** The name of the one skill at the coarsest grain. */
export const ONE_SKILL = "mathematics";

/**
 * The same answers at a grain: each observation's skill replaced by its topic, or by the one skill, in the same order.
 * A problem tagged with several skills that fall together is then one observation, the first kept; without problems
 * (older files, simulated answers) nothing is dropped.
 */
export function regrain(observations: readonly Observation[], grain: Grain, topicOf: (skill: string) => string): Observation[] {
  if (grain === "skill") return [...observations];
  const seen = new Set<string>();
  const out: Observation[] = [];
  for (const o of observations) {
    const skill = grain === "one" ? ONE_SKILL : topicOf(o.skill);
    if (o.problem !== undefined) {
      const key = `${o.student}\u0000${o.problem}\u0000${skill}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push({ ...o, skill });
  }
  return out;
}

/** Which observations are the first of their problem for their student: the answers every grain keeps (all of them, without problems). */
export function primary(observations: readonly Observation[]): boolean[] {
  const seen = new Set<string>();
  return observations.map((o) => {
    if (o.problem === undefined) return true;
    const key = `${o.student}\u0000${o.problem}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type GrainOptions = { seed?: number; testShare?: number; resamples?: number; smallest?: number; streak?: number };
export type GrainResult = {
  grain: Grain;
  /** Skills at this grain in the training answers. */
  skills: number;
  answers: { train: number; test: number };
  bkt: { logLoss: number; fits: FitShares };
  ema: { logLoss: number; alpha: number; start: number };
  /**
   * Mastery declarations on the held-out practices (one per student and skill at this grain), as H3 makes them: BKT at
   * 0.95, the EMA at the threshold costing what the streak rule costs on the training practices, and the streak rule;
   * precision is NaN, there being no truth, and rightAfter is the share right on the next three answers.
   */
  declarations: (Judgement & { rightAfter: number })[];
};
export type GrainComparison = {
  seed: number;
  testShare: number;
  resamples: number;
  smallest: number;
  grains: GrainResult[];
  /** Paired tests on the answers every grain has, each the finer grain first (below zero, the finer predicts better); the first, BKT skill against one, is the confirmatory one. */
  tests: { name: string; test: PairedTest }[];
  /** What coarsening from skills to one costs BKT minus what it costs the EMA, per answer, with its interval over students: above zero, BKT loses more. */
  emaLosesLess: { estimate: number; interval: [number, number] };
};

/**
 * G4: the answers at every grain, split by student (the same students held out at each), BKT and the EMA fitted and
 * replayed at each, the paired tests between grains, and the declarations each method makes at each grain.
 */
export function compareGrains(observations: readonly Observation[], topicOf: (skill: string) => string, { seed = 1, testShare = 0.2, resamples = 10000, smallest = SMALLEST_DIFFERENCE, streak = 3 }: GrainOptions = {}): GrainComparison {
  const predictions = new Map<string, StudentPrediction[]>();
  const grains = GRAINS.map((grain): GrainResult => {
    const at = regrain(observations, grain, topicOf);
    const { train, test } = splitByStudent(at, testShare, seed);
    if (!train.length || !test.length) throw new Error("too few students to hold some out");
    const bkt = new BktModel(), ema = new EmaModel();
    const keep = primary(test);
    const shared = (ps: StudentPrediction[]) => ps.filter((_, i) => keep[i]);
    const bktPs = heldOutPredictions(bkt, train, test), emaPs = heldOutPredictions(ema, train, test);
    predictions.set(`BKT ${grain}`, shared(bktPs));
    predictions.set(`EMA ${grain}`, shared(emaPs));
    const skills = [...sequencesBySkill(train).keys()];
    const fitted: Fitted = { bkt: (skill) => bkt.paramsOf(skill), ema: ema.params };
    const trainPractices = practicesFrom(train), testPractices = practicesFrom(test);
    const rules = usualRules(fitted, trainPractices, streak);
    return {
      grain,
      skills: skills.length,
      answers: { train: train.length, test: test.length },
      bkt: { logLoss: meanLoss(bktPs), fits: fitShares(skills.map(fitted.bkt)) },
      ema: { logLoss: meanLoss(emaPs), alpha: ema.params.alpha, start: ema.params.start },
      declarations: rules.map((rule) => ({ ...judge(rule, testPractices), rightAfter: rightAfter(rule, testPractices).right })),
    };
  });
  const of = (name: string) => ({ name, predictions: predictions.get(name)! });
  const pair = (first: string, second: string) => ({ name: `${first} against ${second}`, test: pairedLogLoss(of(first), of(second), { resamples, seed, smallest }) });
  const tests = [pair("BKT skill", "BKT one"), pair("BKT skill", "BKT topic"), pair("BKT topic", "BKT one"), pair("EMA skill", "EMA one"), pair("EMA skill", "EMA topic"), pair("EMA topic", "EMA one")];
  return { seed, testShare, resamples, smallest, grains, tests, emaLosesLess: contrast([["BKT one", 1], ["BKT skill", -1], ["EMA one", -1], ["EMA skill", 1]].map(([name, w]) => [predictions.get(name as string)!, w as number]), resamples, seed) };
}

const meanLoss = (ps: readonly StudentPrediction[]) => ps.reduce((s, p) => s + answerLoss(p), 0) / ps.length;

/**
 * A weighted sum of several models' log-losses on the same answers, per answer, with its interval from resampling
 * students: the mean over all answers of Σ weight × loss. Models must predict the same answers in the same order.
 */
export function contrast(terms: readonly (readonly [readonly StudentPrediction[], number])[], resamples = 10000, seed = 1): { estimate: number; interval: [number, number] } {
  const [first] = terms[0];
  for (const [ps] of terms) if (ps.length !== first.length || ps.some((p, i) => p.student !== first[i].student || p.correct !== first[i].correct)) throw new Error("the models must predict the same answers in the same order");
  const index = new Map<string, number>();
  const sums: number[] = [], counts: number[] = [];
  let total = 0;
  first.forEach((p, i) => {
    let k = index.get(p.student);
    if (k === undefined) index.set(p.student, (k = sums.length)), sums.push(0), counts.push(0);
    let v = 0;
    for (const [ps, w] of terms) v += w * answerLoss(ps[i]);
    (sums[k] += v), counts[k]++, (total += v);
  });
  const meanOver = (drawn: readonly number[]) => {
    let s = 0, n = 0;
    for (const g of drawn) (s += sums[g]), (n += counts[g]);
    return n ? s / n : NaN;
  };
  return { estimate: total / first.length, interval: bootstrapGroups(sums.length, meanOver, resamples, seed) };
}
