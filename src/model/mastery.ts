// Deciding when a skill is mastered, and judging the decision (docs/thesis/outline.md, H2 and H3). A mastery rule
// reads one student's answers on one skill and says after how many it declares the skill mastered, if it ever does:
// BKT when P(known) reaches a threshold, the exponential moving average (EMA) when its score does, or N right in a
// row. On simulated learners the truth is recorded after every answer, so each declaration is right or wrong (H2); on
// real answers it is not, and the rules can only be compared with each other and with the answers that follow (H3).
//
// Rules are compared at equal practice: BKT's and EMA's thresholds are set on training learners so that they cost as
// many answers as N right in a row there, and are judged on the other learners. A practice never declared costs its
// full length, as a learner who is never let go practises to the end.
import { AREAS, type SkillId } from "../math/practiceSkills.ts";
import type { Level, Observation } from "./elo.ts";
import { bktStep, emaStep, fitBkt, fitEma, type BktParams, type EmaParams } from "./evaluate.ts";
import { DEFAULT_SIM, makeWorld, rng, SIM_SKILLS, type SimParams, type SimLearner } from "./simulate.ts";

/** One student's answers on one skill in order (1 right, 0 wrong), and in simulations whether they knew it after each. */
export type Practice = { student: string; skill: string; answers: Uint8Array; known?: Uint8Array };

/** Reads one practice's answers and says after how many it declares mastery, or null if it never does. */
export type MasteryRule = { readonly name: string; declare(skill: string, answers: ArrayLike<number>): number | null };

const shown = (threshold: number) => String(Number(threshold.toFixed(4)));
/** N right in a row: the rule deployed systems use (three in the ASSISTments skill builders). */
export const streakRule = (n: number): MasteryRule => ({
  name: `streak ${n}`,
  declare(_skill, answers) {
    let run = 0;
    for (let i = 0; i < answers.length; i++) if ((run = answers[i] ? run + 1 : 0) >= n) return i + 1;
    return null;
  },
});
/** Mastered once the moving average of the answers reaches the threshold. */
export const emaRule = (p: EmaParams, threshold: number): MasteryRule => ({
  name: `EMA θ ${shown(threshold)}`,
  declare(_skill, answers) {
    let score = p.start;
    for (let i = 0; i < answers.length; i++) if ((score = emaStep(score, p.alpha, answers[i] === 1)) >= threshold) return i + 1;
    return null;
  },
});
/** Mastered once BKT's P(known), after the answer and the chance to learn from it, reaches the threshold. */
export const bktRule = (paramsOf: (skill: string) => BktParams, threshold: number): MasteryRule => ({
  name: `BKT θ ${shown(threshold)}`,
  declare(skill, answers) {
    const p = paramsOf(skill);
    let known = p.init;
    for (let i = 0; i < answers.length; i++) if ((known = bktStep(known, p, answers[i] === 1).known) >= threshold) return i + 1;
    return null;
  },
});

// ---------- practice with a known truth ----------

/** In the gradual worlds, a skill counts as mastered when the true chance of a right answer is at least this. */
export const MASTERED_AT = 0.9;
export type PracticeParams = Partial<SimParams> & {
  skills?: readonly SkillId[];
  /** Questions each learner answers on each skill. */
  length?: number;
  /** The level every question is at, and the level the truth is judged at in the gradual worlds. */
  level?: Level;
  masteredAt?: number;
};
export const ALL_SIM_SKILLS: readonly SkillId[] = AREAS.flatMap((a) => [...SIM_SKILLS[a]]);

/**
 * Every learner practises every skill, one after another, all questions at one level, and the truth is recorded after
 * each answer, the moment BKT's P(known) refers to: in the bkt world whether the learner knows the skill, elsewhere
 * whether their true chance at that level is at least masteredAt. With one level, flat learning, no transfer and no
 * forgetting the bkt world is exactly BKT (Proposition 2 in the outline).
 */
export function simulatePractice(params: PracticeParams = {}): Practice[] {
  const { skills = ALL_SIM_SKILLS, length = 30, level = 2, masteredAt = MASTERED_AT, ...sim } = params;
  const world = makeWorld(sim);
  const knows = (sim.world ?? DEFAULT_SIM.world) === "bkt"
    ? (l: SimLearner, skill: SkillId) => l.known.get(skill)!
    : (l: SimLearner, skill: SkillId) => world.chance(l, skill, level) >= masteredAt;
  const out: Practice[] = [];
  for (const l of world.learners)
    for (const skill of skills) {
      const answers = new Uint8Array(length);
      const known = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        answers[i] = world.answer(l, skill, level) ? 1 : 0;
        known[i] = knows(l, skill) ? 1 : 0;
      }
      out.push({ student: l.id, skill, answers, known });
    }
  return out;
}

/** Logged answers as practices, one per student and skill, in the order answered. */
export function practicesFrom(observations: readonly Observation[]): Practice[] {
  const by = new Map<string, { student: string; skill: string; answers: number[] }>();
  for (const o of observations) {
    const key = `${o.student}\u0000${o.skill}`;
    (by.get(key) ?? by.set(key, { student: o.student, skill: o.skill, answers: [] }).get(key)!).answers.push(o.correct ? 1 : 0);
  }
  return [...by.values()].map((p) => ({ ...p, answers: Uint8Array.from(p.answers) }));
}

/** BKT's parameters for each skill and EMA's α and start, fitted on training practices as the held-out replay fits them. */
export type Fitted = { bkt: (skill: string) => BktParams; ema: EmaParams };
export function fitRules(train: readonly Practice[]): Fitted {
  const bySkill = new Map<string, Uint8Array[]>();
  for (const p of train) (bySkill.get(p.skill) ?? bySkill.set(p.skill, []).get(p.skill)!).push(p.answers);
  const all = [...bySkill.values()].flat();
  const params = new Map([...bySkill].map(([skill, seqs]) => [skill, fitBkt(seqs)]));
  // A skill the training practices never had uses parameters fitted on all skills, fitted only if needed.
  let pooled: BktParams | undefined;
  return { bkt: (skill) => params.get(skill) ?? (pooled ??= fitBkt(all)), ema: fitEma(all) };
}

// ---------- judging the decisions ----------

/** A rule's decision on one practice: after how many answers (null: never), and in simulations whether it was right. */
export type Decision = { at: number | null; right: boolean | null };
export const decide = (rule: MasteryRule, practices: readonly Practice[]): Decision[] =>
  practices.map((p) => {
    const at = rule.declare(p.skill, p.answers);
    return { at, right: at === null || !p.known ? null : p.known[at - 1] === 1 };
  });

export type Judgement = {
  rule: string;
  practices: number;
  /** The share of practices in which mastery is declared at all. */
  declared: number;
  /** Mean answers until declared, a practice never declared counting its full length. */
  cost: number;
  /** The share of declarations made while the learner knew the skill (NaN without a truth or a declaration). */
  precision: number;
  /** The share of practices ending with the skill known in which mastery was never declared (NaN if none). */
  missed: number;
};
export function judge(rule: MasteryRule, practices: readonly Practice[], decisions = decide(rule, practices)): Judgement {
  let declared = 0, right = 0, cost = 0, knownAtEnd = 0, missed = 0;
  practices.forEach((p, i) => {
    const d = decisions[i];
    cost += d.at ?? p.answers.length;
    if (d.at !== null) (declared++, d.right && right++);
    if (p.known?.[p.known.length - 1]) (knownAtEnd++, d.at === null && missed++);
  });
  const truth = practices.some((p) => p.known);
  return {
    rule: rule.name,
    practices: practices.length,
    declared: declared / practices.length,
    cost: cost / practices.length,
    precision: truth && declared ? right / declared : NaN,
    missed: knownAtEnd ? missed / knownAtEnd : NaN,
  };
}

/**
 * The threshold at which a family of rules costs, on these practices, as near as it can to the given mean number of
 * answers. A higher threshold is never reached sooner, so cost never falls as it rises, and bisection finds it.
 */
export function thresholdForCost(make: (threshold: number) => MasteryRule, practices: readonly Practice[], cost: number, lo = 0.5, hi = 0.9999) {
  const costAt = (t: number) => judge(make(t), practices).cost;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (costAt(mid) < cost) lo = mid;
    else hi = mid;
  }
  return Math.abs(costAt(lo) - cost) <= Math.abs(costAt(hi) - cost) ? lo : hi;
}

/**
 * A 95 % percentile interval for a statistic, resampling students with all their practices together, since one
 * student's practices on different skills are not independent. The statistic gets the indices of the practices drawn.
 */
export function bootstrapByStudent(practices: readonly { student: string }[], statistic: (indices: readonly number[]) => number, resamples = 2000, seed = 1): [number, number] {
  const byStudent = new Map<string, number[]>();
  practices.forEach((p, i) => (byStudent.get(p.student) ?? byStudent.set(p.student, []).get(p.student)!).push(i));
  const groups = [...byStudent.values()];
  const r = rng(seed);
  const stats: number[] = [];
  for (let b = 0; b < resamples; b++) {
    const indices: number[] = [];
    for (let g = 0; g < groups.length; g++) for (const i of groups[Math.floor(r.next() * groups.length)]) indices.push(i);
    const s = statistic(indices);
    if (!Number.isNaN(s)) stats.push(s);
  }
  stats.sort((a, b) => a - b);
  const at = (q: number) => stats[Math.min(stats.length - 1, Math.floor(q * stats.length))] ?? NaN;
  return [at(0.025), at(0.975)];
}
/** The precision of decisions over the practices with the given indices (a statistic for bootstrapByStudent). */
export const precisionOf = (decisions: readonly Decision[]) => (indices: readonly number[]) => {
  let declared = 0, right = 0;
  for (const i of indices) if (decisions[i].at !== null) (declared++, decisions[i].right && right++);
  return declared ? right / declared : NaN;
};

export type AtCost = Judgement & {
  /** The threshold set on the training practices (null for the streak rule, whose cost is the target). */
  threshold: number | null;
  /** 95 % interval of the precision, over test students. */
  interval: [number, number];
  /** BKT's precision minus this rule's, with its interval (absent on BKT's own row). */
  bktAhead?: { estimate: number; interval: [number, number] };
};
/**
 * H2's comparison: BKT and EMA with their thresholds set on the training practices to cost what N right in a row costs
 * there, and all three judged on the test practices, with intervals over test students.
 */
export function compareAtCost(train: readonly Practice[], test: readonly Practice[], fitted: Fitted, n = 3, resamples = 2000, seed = 1): AtCost[] {
  const streak = streakRule(n);
  const target = judge(streak, train).cost;
  const bktAt = thresholdForCost((t) => bktRule(fitted.bkt, t), train, target);
  const emaAt = thresholdForCost((t) => emaRule(fitted.ema, t), train, target);
  const rules = [bktRule(fitted.bkt, bktAt), emaRule(fitted.ema, emaAt), streak];
  const thresholds = [bktAt, emaAt, null];
  const decisions = rules.map((r) => decide(r, test));
  const bkt = precisionOf(decisions[0]);
  return rules.map((rule, i) => {
    const own = precisionOf(decisions[i]);
    const row: AtCost = { ...judge(rule, test, decisions[i]), threshold: thresholds[i], interval: bootstrapByStudent(test, own, resamples, seed) };
    if (i) {
      const all = test.map((_, j) => j);
      row.bktAhead = { estimate: bkt(all) - own(all), interval: bootstrapByStudent(test, (idx) => bkt(idx) - own(idx), resamples, seed) };
    }
    return row;
  });
}

/** Thresholds swept for the trade-off curves: θ from 0.80 to 0.99 for BKT and EMA, N from 2 to 6 for the streak rule. */
export const CURVE_THRESHOLDS = Array.from({ length: 20 }, (_, i) => Number((0.8 + i / 100).toFixed(2)));
export const CURVE_STREAKS = [2, 3, 4, 5, 6];
export type CurvePoint = Judgement & { method: "BKT" | "EMA" | "streak"; threshold: number };
/** Cost against precision for every threshold of every method: the description around H2's single comparison. */
export function tradeOff(fitted: Fitted, practices: readonly Practice[]): CurvePoint[] {
  return [
    ...CURVE_THRESHOLDS.map((t): CurvePoint => ({ method: "BKT", threshold: t, ...judge(bktRule(fitted.bkt, t), practices) })),
    ...CURVE_THRESHOLDS.map((t): CurvePoint => ({ method: "EMA", threshold: t, ...judge(emaRule(fitted.ema, t), practices) })),
    ...CURVE_STREAKS.map((n): CurvePoint => ({ method: "streak", threshold: n, ...judge(streakRule(n), practices) })),
  ];
}

// ---------- real answers, where the truth is unknown (H3) ----------

export type Agreement = {
  /** Shares of practices in which both rules, only the first, only the second, or neither declare mastery. */
  both: number;
  onlyFirst: number;
  onlySecond: number;
  neither: number;
  /** Where both declare: the mean of the first rule's answer count minus the second's (negative: the first is sooner). */
  meanGap: number;
};
export function agreement(first: MasteryRule, second: MasteryRule, practices: readonly Practice[]): Agreement {
  let both = 0, onlyFirst = 0, onlySecond = 0, gap = 0;
  for (const p of practices) {
    const a = first.declare(p.skill, p.answers);
    const b = second.declare(p.skill, p.answers);
    if (a !== null && b !== null) (both++, (gap += a - b));
    else if (a !== null) onlyFirst++;
    else if (b !== null) onlySecond++;
  }
  const n = practices.length;
  return { both: both / n, onlyFirst: onlyFirst / n, onlySecond: onlySecond / n, neither: (n - both - onlyFirst - onlySecond) / n, meanGap: both ? gap / both : NaN };
}

/**
 * How the student did on the next k answers after mastery was declared, in practices that have any: the share right,
 * over all those answers. Few practices have them when the data were collected under the streak rule itself.
 */
export function rightAfter(rule: MasteryRule, practices: readonly Practice[], k = 3) {
  let withAnswers = 0, answers = 0, right = 0;
  for (const p of practices) {
    const at = rule.declare(p.skill, p.answers);
    if (at === null || at >= p.answers.length) continue;
    withAnswers++;
    for (let i = at; i < Math.min(p.answers.length, at + k); i++) (answers++, (right += p.answers[i]));
  }
  return { rule: rule.name, practices: withAnswers, answers, right: answers ? right / answers : NaN };
}
