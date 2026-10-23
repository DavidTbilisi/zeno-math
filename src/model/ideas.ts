// Skills made of ideas, asked by Zeno's own questions: does what src/model/atoms.ts found survive the questions the
// generators actually ask? There every question asked for one atom. Here a learner knows or does not know each idea of
// the fractions graph (src/model/conceptGraph.ts), and the questions are the generators' own, on times, hcf and
// fractions in curriculum order, each needing the ideas arithmeticUses and fractionsUses read from it: seven to ten at
// once on fractions, almost never one alone. An answer is right (but for a slip) only when every idea it needs is
// known, and otherwise a guess; a wrong answer may take the form of a mistake the checker recognises (addAcross,
// flipFirst) when the idea that mistake shows missing is among the unknown ones; a wrong answer no mistake explains may
// be followed by a checklist of the question's ideas, the ones the student found hard ticked. Each needed idea that is unknown may
// be learnt from the question. The skill is mastered when every idea its questions can need is known, which is the
// gradual worlds' definition here too: only then is the chance of a right answer on the next question 1 − slip. A
// share of the questions can be made to ask for one idea alone, which the generators do not do yet, to see what such
// questions would be worth.
//
// Compared, by H2's standard: BKT on the skill, EMA and the streak rule as H2 ran them; and BKT on each idea, which
// reads the ideas each question needs and updates them together (a conjunctive question: right only if all were
// known), started afresh in every skill, then with the blame of a recognised mistake put on its one idea (and the
// checklist's ticks read, when there is one), then also carried from skill to skill. Beyond cost and precision, the diagnosis: when exactly one of the skill's ideas is
// unknown, how often it is the one with the lowest P(known).
import { en } from "../locales/en.ts";
import { exercise } from "../math/practice.ts";
import { FRACTIONS, type FractionsNode } from "./conceptGraph.ts";
import { sigmoid } from "./elo.ts";
import { conjunctiveStep, gapIdea, IDEA_SKILLS, TICK_PRIOR, tickStep, usesOf, type IdeaSkill, type TickRates } from "./ideaState.ts";
import { bktStep, calibration, fitBkt, rmse, type BktParams, type Prediction } from "./evaluate.ts";
import {
  bktRule, bootstrapByStudent, cheapestAtPrecision, compareAtPrecision, costOf, decide, FINE_THRESHOLDS, fitRules, judge, masteryCalibration, PRECISION_TARGET,
  precisionOf, USUAL_THRESHOLD, usualRules, type AtPrecision, type Calibration, type Judgement, type MasteryRule, type Practice,
} from "./mastery.ts";
import { fixedChoice } from "./policy.ts";
import { rng } from "./random.ts";
import { DEFAULT_SIM } from "./simulate.ts";

// The skills with a graph, the ideas a question needs, the idea a mistake blames and the step on several ideas at once
// live in ideaState.ts, which the app reads too; here they are the world's.
export { conjunctiveStep, gapIdea, IDEA_SKILLS, usesOf, type IdeaSkill, type TickRates };

/** Questions generated per level to find which ideas a skill's questions can need. */
const SAMPLE = 300;
const ideas = new Map<IdeaSkill, FractionsNode[]>();
/** The ideas a skill's questions can need, in the graph's order, read off the generators: SKILL_IDEAS in ideaState.ts, checked. */
export function ideasOf(skill: IdeaSkill): FractionsNode[] {
  let found = ideas.get(skill);
  if (!found) {
    const seen = new Set<string>();
    for (const level of [1, 2, 3] as const) for (let seed = 1; seed <= SAMPLE; seed++) for (const n of usesOf(exercise(skill, level, seed, en.pracWords))) seen.add(n);
    ideas.set(skill, (found = (Object.keys(FRACTIONS.nodes) as FractionsNode[]).filter((n) => seen.has(n))));
  }
  return found;
}

/**
 * A skill's answers with the ideas behind them: the skill's ideas (ids), which of them each question needed (indices
 * into ids), the idea a recognised mistake blamed (an index, or −1), the ideas ticked as hard after a wrong answer
 * (indices, none when no checklist was asked or nothing was ticked), and whether each idea was known after each answer.
 */
export type IdeaPractice = Practice & {
  known: Uint8Array; ids: readonly string[]; needs: readonly (readonly number[])[]; gap: Int8Array; ticked?: readonly (readonly number[])[]; ideaKnown: Uint8Array[];
};

export type IdeaParams = {
  students: number;
  /** Questions on each skill. */
  length: number;
  /** As in the simulation: the chance one question teaches an unknown idea it needs is 2.5 times this (0.02 → 5 %). */
  learnRate: number;
  /** The chance a wrong answer takes the form of a recognised mistake when the question has one and its idea is unknown. */
  trapRate: number;
  /**
   * The share of questions that ask for one of the skill's ideas alone, chosen at random, in place of a generated
   * question: what the generators do not do yet, to see what it would be worth. 0 is the generators as they are, 1
   * every question.
   */
  isolateRate: number;
  /** The chance of a right answer when an idea the question needs is unknown. */
  guess: number;
  /**
   * Which wrong answers say what is missing. "mapped": the generators' own recognised mistakes, as above. "every": a
   * multiple-choice question whose every wrong option is the mistake of one idea it needs, so every wrong answer
   * blames one: a missing one trapRate of the time, else any of them at random (a slip, or a guess among the options).
   */
  distractors: "mapped" | "every";
  /**
   * "What exactly was hard?": after a wrong answer no recognised mistake explains, the student ticks each idea the
   * question needed that they are missing with chance hit, and each they know with chance falseAlarm. null: not asked.
   */
  checklist: TickRates | null;
  /**
   * Students who do not tick by what they know: each student is one of them, for every answer, with chance share, and
   * ticks every idea the checklist lists ("all"), only the first ("first"), nothing ("none"), or each at even odds
   * ("random"). The others tick by checklist's rates. null: every student does.
   */
  tickStyle: { kind: TickStyle; share: number } | null;
  seed: number;
};
export const TICK_STYLES = ["all", "first", "none", "random"] as const;
export type TickStyle = (typeof TICK_STYLES)[number];
export const DEFAULT_IDEAS: IdeaParams = { students: 400, length: 30, learnRate: 0.02, trapRate: 0.5, isolateRate: 0, guess: 0.2, distractors: "mapped", checklist: null, tickStyle: null, seed: 1 };

/** The BKT world's chance of a slip at level 2, where H2's questions are (its guess is DEFAULT_IDEAS.guess). */
const SLIP = 0.1;
const LEARN_PER_RATE = 2.5;

/**
 * Every learner practises times, hcf and fractions in turn, the levels dealt as the fixed sequence deals them (two
 * easy, two medium, two hard, again), each question one the generator makes. Ability is an overall part and one per
 * skill with the simulation's spreads; each idea has a difficulty, and ability against it, in the skill where the
 * learner first meets the idea, is the chance of knowing it at the start. A learner's ideas live in one map across all
 * their skills, so an idea learnt in one skill is known in every later skill that has it. After each answer the truth
 * is recorded: each of the skill's ideas, and whether all of them are known.
 */
export function simulateIdeas(params: Partial<IdeaParams> = {}): IdeaPractice[] {
  const p = { ...DEFAULT_IDEAS, ...params };
  const r = rng(p.seed);
  // The ticks draw from a stream of their own, so a seed is the same class of students with the checklist or without it.
  const tick = rng((p.seed ^ 0x9e3779b9) >>> 0);
  const { spread } = DEFAULT_SIM;
  const difficulty = new Map(Object.keys(FRACTIONS.nodes).map((id) => [id, r.normal(spread.difficulty)]));
  const learn = Math.min(1, LEARN_PER_RATE * p.learnRate);
  const words = en.pracWords;
  const out: IdeaPractice[] = [];
  for (let s = 0; s < p.students; s++) {
    const global = r.normal(spread.global);
    const known = new Map<string, boolean>();
    const style = p.tickStyle && tick.next() < p.tickStyle.share ? p.tickStyle.kind : null;
    for (const skill of IDEA_SKILLS) {
      const ids = ideasOf(skill);
      const ability = global + r.normal(spread.skill);
      for (const id of ids) if (!known.has(id)) known.set(id, r.next() < sigmoid(ability - difficulty.get(id)!));
      const answers = new Uint8Array(p.length), all = new Uint8Array(p.length), gap = new Int8Array(p.length).fill(-1);
      const needs: number[][] = [], ticked: number[][] = [];
      const ideaKnown = ids.map(() => new Uint8Array(p.length));
      for (let i = 0; i < p.length; i++) {
        // A question asking for one idea alone has no recognised mistakes; otherwise the generator's own question.
        const alone = p.isolateRate > 0 && r.next() < p.isolateRate;
        const ex = alone ? null : exercise(skill, fixedChoice([skill], i).level, Math.floor(r.next() * 2 ** 31) + 1, words);
        const needed = ex ? usesOf(ex) : [r.pick(ids)];
        needs.push(needed.map((n) => {
          const j = ids.indexOf(n);
          if (j < 0) throw new Error(`${skill} asked for ${n}, which its sample of questions never needed`);
          return j;
        }));
        const right = r.next() < (needed.every((n) => known.get(n)) ? 1 - SLIP : p.guess);
        answers[i] = right ? 1 : 0;
        if (!right && p.distractors === "every") {
          const missing = needed.filter((n) => !known.get(n));
          const shown = missing.length && r.next() < p.trapRate ? r.pick(missing) : r.pick(needed);
          gap[i] = ids.indexOf(shown);
        } else if (!right && ex) {
          // A wrong answer in the shape of a recognised mistake, when the question has one whose idea is missing.
          const missing = (ex.answer.traps ?? []).map((t) => gapIdea(t.id)).find((g) => g && needed.includes(g) && !known.get(g));
          if (missing && r.next() < p.trapRate) gap[i] = ids.indexOf(missing);
        }
        const asked = !right && p.checklist && gap[i] < 0;
        const ticks = (j: number, k: number) =>
          style === "all" ? true : style === "first" ? k === 0 : style === "none" ? false : tick.next() < (style === "random" ? 0.5 : known.get(ids[j]) ? p.checklist!.falseAlarm : p.checklist!.hit);
        ticked.push(asked ? needs[i].filter(ticks) : []);
        for (const n of needed) if (!known.get(n) && r.next() < learn) known.set(n, true);
        ids.forEach((id, j) => (ideaKnown[j][i] = known.get(id) ? 1 : 0));
        all[i] = ids.every((id) => known.get(id)) ? 1 : 0;
      }
      out.push({ student: `sim${s + 1}`, skill, answers, known: all, ids, needs, gap, ...(p.checklist ? { ticked } : {}), ideaKnown });
    }
  }
  return out;
}

// ---------- BKT on each idea ----------

/** BKT's parameters for each idea, the guess and slip of a question on each skill, and how the checklist's ticks are taken to follow what is known. */
export type IdeaFit = { idea: (id: string) => BktParams; question: (skill: string) => { guess: number; slip: number }; tick?: TickRates };
/** How the ideas' P(known) are read: a recognised mistake's blame on its one idea or not, and where each skill starts. */
export type IdeaOptions = { blame?: boolean; starts?: Starts };
/** Where each of a practice's ideas starts: its P(known) carried from the student's earlier skills (see carriedIdeas). */
export type Starts = ReadonlyMap<Practice, readonly number[]>;

/**
 * One answer into the ideas' P(known). A wrong answer in the shape of a recognised mistake, with blame on, is a wrong
 * answer on that idea alone (the mistake says the student got as far as it); any other answer updates every idea the
 * question needed, together, with blame on after the ideas ticked as hard (tickStep).
 */
function stepIdeas(known: number[], p: IdeaPractice, i: number, fit: IdeaFit, blame: boolean | undefined) {
  const q = fit.question(p.skill), g = p.gap[i];
  if (blame && g >= 0) known[g] = bktStep(known[g], { ...q, init: 0, learn: fit.idea(p.ids[g]).learn }, false).known;
  else {
    const ticked = p.ticked?.[i];
    if (blame && fit.tick && ticked?.length) tickStep(known, p.needs[i], ticked, fit.tick);
    conjunctiveStep(known, p.needs[i], (j) => fit.idea(p.ids[j]).learn, q, p.answers[i] === 1);
  }
}

/**
 * BKT on each idea: the skill is declared mastered once every one of its ideas' P(known) has reached the threshold. It
 * needs the practice, to know the ideas. Each idea starts at its fitted init, or, given starts, where the student's
 * earlier skills left it.
 */
export const ideasRule = (fit: IdeaFit, threshold: number, options: IdeaOptions = {}): MasteryRule => ({
  name: `BKT per idea${options.blame ? ", blamed" : ""}${options.starts ? ", carried" : ""} θ ${threshold}`,
  declare(_skill, answers, practice) {
    const p = practice as IdeaPractice;
    const known = [...(options.starts?.get(p) ?? p.ids.map((id) => fit.idea(id).init))];
    for (let i = 0; i < answers.length; i++) {
      stepIdeas(known, p, i, fit, options.blame);
      if (known.every((k) => k >= threshold)) return i + 1;
    }
    return null;
  },
});

/**
 * Each practice's ideas' P(known) before its first answer, carried over every skill each student practised before it
 * (in the order given): an idea met before starts where its last answer left it, one never met at its fitted init.
 */
export function carriedIdeas(fit: IdeaFit, practices: readonly IdeaPractice[], blame?: boolean): Starts {
  const state = new Map<string, Map<string, number>>();
  const out = new Map<Practice, number[]>();
  for (const p of practices) {
    const mine = state.get(p.student) ?? state.set(p.student, new Map()).get(p.student)!;
    const known = p.ids.map((id) => mine.get(id) ?? fit.idea(id).init);
    out.set(p, [...known]);
    for (let i = 0; i < p.answers.length; i++) stepIdeas(known, p, i, fit, blame);
    p.ids.forEach((id, j) => mine.set(id, known[j]));
  }
  return out;
}

/**
 * BKT's parameters for each idea, fitted as if every answer were an answer on each idea its question needed: each
 * student's answers on the idea within one skill (afresh) or across every skill in order (carried) as one sequence.
 * A heuristic fit: the conjunctive model's own would need expectation–maximisation over the hidden states. An idea no
 * training question needed gets parameters fitted on every sequence together.
 */
export function fitIdeas(train: readonly IdeaPractice[], acrossSkills = false): (idea: string) => BktParams {
  const seqs = new Map<string, number[]>();
  for (const p of train)
    for (let i = 0; i < p.answers.length; i++)
      for (const j of p.needs[i]) {
        const key = `${p.ids[j]}\u0000${p.student}\u0000${acrossSkills ? "" : p.skill}`;
        (seqs.get(key) ?? seqs.set(key, []).get(key)!).push(p.answers[i]);
      }
  const byIdea = new Map<string, Uint8Array[]>();
  for (const [key, answers] of seqs) {
    const idea = key.split("\u0000")[0];
    (byIdea.get(idea) ?? byIdea.set(idea, []).get(idea)!).push(Uint8Array.from(answers));
  }
  const params = new Map([...byIdea].map(([idea, s]) => [idea, fitBkt(s)]));
  let pooled: BktParams | undefined;
  return (idea) => params.get(idea) ?? (pooled ??= fitBkt([...byIdea.values()].flat()));
}

/** How each idea's parameters are fitted: fitIdeas' heuristic, or on the conjunctive model's own likelihood (fitIdeasByLikelihood). */
export type IdeaFitting = "heuristic" | "likelihood";
const INIT_GRID = [0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.98];
const LEARN_GRID = [0.005, 0.01, 0.02, 0.03, 0.05, 0.1, 0.15, 0.2, 0.3];

/**
 * Each idea's init and learn fitted on the model the forms run: the chance it gives each answer before it, P(all the
 * question needs known)(1 − slip) + (1 − that)·guess with the skill's own guess and slip, summed in logs over the
 * training answers, walked as conjunctiveStep walks them (afresh in each skill, or carried from skill to skill). The
 * heuristic fit takes a wrong answer as a wrong answer on every idea the question needed, so an idea known but asked
 * beside a missing one is fitted as less often known than it is, and the P(known) it gives after a wrong answer is too
 * low; this one blames the ideas only as far as the product does. Ideas always asked together are told apart only by
 * the questions that ask for one without the other. Found by coordinate ascent from the heuristic fit, each idea's init
 * then learn on a grid in turn, three times over. A recognised mistake's blame is not read, as in the heuristic fit.
 */
export function fitIdeasByLikelihood(train: readonly IdeaPractice[], question: (skill: string) => { guess: number; slip: number }, acrossSkills = false): (idea: string) => BktParams {
  const start = fitIdeas(train, acrossSkills);
  const names = [...new Set(train.flatMap((p) => p.ids))];
  const init = names.map((id) => start(id).init), learn = names.map((id) => start(id).learn);
  const index = new Map(names.map((id, g) => [id, g]));
  const walks = train.map((p) => ({ p, global: p.ids.map((id) => index.get(id)!), q: question(p.skill) }));
  const known = new Float64Array(names.length), met = new Uint8Array(names.length);
  const logLikelihood = () => {
    let sum = 0, student = "";
    for (const { p, global, q } of walks) {
      if (!acrossSkills || p.student !== student) met.fill(0), (student = p.student);
      for (const g of global) if (!met[g]) (known[g] = init[g]), (met[g] = 1);
      for (let i = 0; i < p.answers.length; i++) {
        const needs = p.needs[i], right = p.answers[i] === 1;
        let all = 1;
        for (const j of needs) all *= known[global[j]];
        const seen = right ? all * (1 - q.slip) + (1 - all) * q.guess : all * q.slip + (1 - all) * (1 - q.guess);
        sum += Math.log(seen);
        for (const j of needs) {
          const g = global[j], joint = right ? all * (1 - q.slip) + (known[g] - all) * q.guess : all * q.slip + (known[g] - all) * (1 - q.guess);
          const posterior = joint / seen;
          known[g] = posterior + (1 - posterior) * learn[g];
        }
      }
    }
    return sum;
  };
  let top = logLikelihood();
  const tune = (values: number[], g: number, grid: readonly number[]) => {
    let best = values[g];
    for (const v of grid) {
      values[g] = v;
      const l = logLikelihood();
      if (l > top) (top = l), (best = v);
    }
    values[g] = best;
  };
  for (let round = 0; round < 3; round++)
    for (let g = 0; g < names.length; g++) {
      tune(init, g, INIT_GRID);
      tune(learn, g, LEARN_GRID);
    }
  return (idea) => {
    const g = index.get(idea), base = start(idea);
    return g === undefined ? base : { ...base, init: init[g], learn: learn[g] };
  };
}

/**
 * Each idea's own P(known) against whether it is known, after every answer: of every idea of the skill, or only of the
 * ideas the question needed at a wrong answer no recognised mistake explains, where the checklist asks.
 */
export function ideaCalibration(fit: IdeaFit, practices: readonly IdeaPractice[], options: IdeaOptions = {}, atWrong = false): Calibration {
  const ps: Prediction[] = [];
  for (const p of practices) {
    const known = [...(options.starts?.get(p) ?? p.ids.map((id) => fit.idea(id).init))];
    for (let i = 0; i < p.answers.length; i++) {
      stepIdeas(known, p, i, fit, options.blame);
      if (atWrong && (p.answers[i] === 1 || p.gap[i] >= 0)) continue;
      for (const j of atWrong ? p.needs[i] : p.ids.map((_, j) => j)) ps.push({ p: known[j], correct: p.ideaKnown[j][i] === 1 });
    }
  }
  return { score: "BKT P(known)", n: ps.length, brier: rmse(ps) ** 2, bins: calibration(ps) };
}

/** How well BKT on each idea says the skill is mastered: the product of its ideas' P(known), against every idea known. */
export function ideasCalibration(fit: IdeaFit, practices: readonly IdeaPractice[], options: IdeaOptions = {}): Calibration {
  const ps: Prediction[] = [];
  for (const p of practices) {
    const known = [...(options.starts?.get(p) ?? p.ids.map((id) => fit.idea(id).init))];
    for (let i = 0; i < p.answers.length; i++) {
      stepIdeas(known, p, i, fit, options.blame);
      ps.push({ p: known.reduce((x, y) => x * y, 1), correct: p.known[i] === 1 });
    }
  }
  return { score: "BKT P(known)", n: ps.length, brier: rmse(ps) ** 2, bins: calibration(ps) };
}

export type Diagnosis = {
  /** Moments (a practice after one of its answers) at which exactly one of the skill's ideas was unknown. */
  moments: number;
  /** The share of them at which that idea had the lowest P(known). */
  right: number;
  /** What picking an idea at random would get: the mean of 1 / ideas over those moments. */
  chance: number;
};
/**
 * Whether BKT on each idea can say which idea is missing: at every moment exactly one of the skill's ideas is unknown
 * (a student one idea short of mastery), is that idea the one with the lowest P(known)? Ties count as misses.
 */
export function diagnosis(fit: IdeaFit, practices: readonly IdeaPractice[], options: IdeaOptions = {}): Diagnosis {
  let moments = 0, right = 0, chance = 0;
  for (const p of practices) {
    const known = [...(options.starts?.get(p) ?? p.ids.map((id) => fit.idea(id).init))];
    for (let i = 0; i < p.answers.length; i++) {
      stepIdeas(known, p, i, fit, options.blame);
      const unknown = p.ideaKnown.flatMap((k, j) => (k[i] ? [] : [j]));
      if (unknown.length !== 1) continue;
      moments++;
      chance += 1 / p.ids.length;
      const lowest = Math.min(...known);
      if (known[unknown[0]] === lowest && known.filter((k) => k === lowest).length === 1) right++;
    }
  }
  return { moments, right: moments ? right / moments : NaN, chance: moments ? chance / moments : NaN };
}

/**
 * The checklist's rates fitted on a class's ticks, as the parameters of each idea are fitted on its answers, so that
 * they need not be assumed. Walking each practice with the answers alone (fit without its tick), at every wrong answer
 * with something ticked, each needed idea's P(known) given the history and that wrong answer, before anything is
 * learnt from it, gives the chance it is ticked, q = (1 − P(known))·hit + P(known)·falseAlarm. The rates are the ones
 * under which the ticks seen are likeliest, given that at least one was ticked (nothing ticked is never read, since
 * the student may have passed the list by), found on a grid of twentieths, then hundredths, then thousandths. It needs the
 * P(known) to be calibrated: a class whose ideas the model misjudges gets rates that carry the misjudgement.
 */
export function fitTicks(fit: IdeaFit, practices: readonly IdeaPractice[], options: IdeaOptions = {}): TickRates {
  const untick: IdeaFit = { ...fit, tick: undefined };
  const seen: { known: number[]; on: boolean[] }[] = [];
  for (const p of practices) {
    const known = [...(options.starts?.get(p) ?? p.ids.map((id) => fit.idea(id).init))];
    for (let i = 0; i < p.answers.length; i++) {
      const ticked = p.ticked?.[i];
      if (ticked?.length) {
        const before = [...known];
        conjunctiveStep(before, p.needs[i], () => 0, fit.question(p.skill), false);
        seen.push({ known: p.needs[i].map((j) => before[j]), on: p.needs[i].map((j) => ticked.includes(j)) });
      }
      stepIdeas(known, p, i, untick, options.blame);
    }
  }
  const logLikelihood = (hit: number, falseAlarm: number) => {
    let sum = 0;
    for (const { known, on } of seen) {
      let none = 1;
      for (let k = 0; k < known.length; k++) {
        const q = (1 - known[k]) * hit + known[k] * falseAlarm;
        sum += Math.log(on[k] ? q : 1 - q);
        none *= 1 - q;
      }
      sum -= Math.log(1 - none);
    }
    return sum;
  };
  const search = (around: TickRates, step: number, reach: number) => {
    let best = around, top = -Infinity;
    for (let h = around.hit - reach; h <= around.hit + reach + 1e-9; h += step)
      for (let f = around.falseAlarm - reach; f <= around.falseAlarm + reach + 1e-9; f += step) {
        if (h < 0.005 || h > 0.995 || f < 0.005 || f > 0.995) continue;
        const l = logLikelihood(h, f);
        if (l > top) [best, top] = [{ hit: h, falseAlarm: f }, l];
      }
    return best;
  };
  if (!seen.length) return TICK_PRIOR;
  const coarse = search({ hit: 0.5, falseAlarm: 0.5 }, 0.05, 0.45);
  return search(search(coarse, 0.01, 0.05), 0.001, 0.01);
}

export type IdeasComparison = {
  skill: IdeaSkill;
  /** H2's comparison on the skill: BKT, EMA and the streak rule, as compareAtPrecision gives it. */
  onSkill: AtPrecision[];
  /** BKT on each idea afresh in every skill, with a mistake's blame on its idea, and carried from skill to skill with blame; each with its cost minus BKT on the skill's. */
  perIdea: AtPrecision;
  blamed: AtPrecision;
  carried: AtPrecision;
  /** Carried's cost minus blamed's, with its interval (below zero, carrying saves answers), when both meet the standard. */
  carryingSaves?: { estimate: number; interval: [number, number] };
  /** Calibration against the truth after every answer: the skill's three scores, then the three forms of BKT on each idea. */
  calibration: Calibration[];
  /** Whether each form of BKT on each idea finds the one missing idea. */
  diagnosis: Diagnosis[];
  /**
   * Every method judged on the test practices at the threshold a deployed system would use, chosen without a truth
   * (usualRules): BKT on the skill at 0.95, the EMA at the streak rule's cost, the streak rule, then the three forms
   * of BKT on each idea at 0.95.
   */
  usual: Judgement[];
  /** Each idea's own P(known) under carried BKT on each idea against the truth (ideaCalibration): after every answer, then at the wrong answers the checklist asks after. */
  ideaCalibration: Calibration[];
  /** The checklist's rates fitted on the training practices (fitTicks), when they were fitted rather than given. */
  fittedTicks?: TickRates;
};
/**
 * H2's comparison on one skill in the world of ideas, with the three forms of BKT on each idea added beside BKT on the
 * skill. Each is the cheapest of its family meeting the target on the training practices, judged on the test practices,
 * with intervals over students. The fits use every skill's training practices; carrying walks every student's practices
 * in order, so the skills before the one judged are what it carries from. tick is how the blamed forms take the
 * checklist's ticks to follow what is known: the world's own rates, others to see what a wrong guess at them costs, or
 * "fit" to fit them on the training practices' ticks (fitTicks). fitting is how each idea's parameters are fitted.
 */
export function compareIdeas(
  train: readonly IdeaPractice[], test: readonly IdeaPractice[], skill: IdeaSkill = "fractions", target = PRECISION_TARGET, resamples = 2000, seed = 1,
  thresholds: readonly number[] = FINE_THRESHOLDS, rates?: TickRates | "fit", fitting: IdeaFitting = "heuristic",
): IdeasComparison {
  const fitted = fitRules(train);
  const trainS = train.filter((p) => p.skill === skill), testS = test.filter((p) => p.skill === skill);
  const onSkill = compareAtPrecision(trainS, testS, fitted, target, resamples, seed, thresholds);
  const all = testS.map((_, i) => i);
  const minus = (a: (idx: readonly number[]) => number, b: (idx: readonly number[]) => number) => ({
    estimate: a(all) - b(all), interval: bootstrapByStudent(testS, (idx) => a(idx) - b(idx), resamples, seed),
  });
  const best = (family: MasteryRule[]) => {
    const rule = cheapestAtPrecision(family, trainS, target);
    if (!rule) return { row: { method: "BKT", rule: null } as AtPrecision, cost: null };
    const d = decide(rule, testS), cost = costOf(d, testS);
    const row: AtPrecision = {
      method: "BKT",
      rule: rule.name,
      judgement: { ...judge(rule, testS, d), costInterval: bootstrapByStudent(testS, cost, resamples, seed), precisionInterval: bootstrapByStudent(testS, precisionOf(d), resamples, seed) },
    };
    return { row, cost };
  };
  // BKT on the skill chosen again as compareAtPrecision chose it, for the paired differences.
  const bktOnSkill = best(thresholds.map((t) => bktRule(fitted.bkt, t))).cost;
  const ideaFit = (acrossSkills: boolean) => (fitting === "likelihood" ? fitIdeasByLikelihood(train, fitted.bkt, acrossSkills) : fitIdeas(train, acrossSkills));
  const ideaAfresh = ideaFit(false), ideaAcross = ideaFit(true);
  // Fitted on the training practices of every skill, read from the answers alone carried from skill to skill.
  const answersAlone: IdeaFit = { idea: ideaAcross, question: fitted.bkt };
  const tick = rates !== "fit" ? rates : fitTicks(answersAlone, train, { blame: true, starts: carriedIdeas(answersAlone, train, true) });
  const afresh: IdeaFit = { idea: ideaAfresh, question: fitted.bkt, tick };
  const across: IdeaFit = { idea: ideaAcross, question: fitted.bkt, tick };
  const starts = carriedIdeas(across, [...train, ...test], true);
  const forms = [
    { fit: afresh, options: {} },
    { fit: afresh, options: { blame: true } },
    { fit: across, options: { blame: true, starts } },
  ];
  const rows = forms.map(({ fit, options }) => best(thresholds.map((t) => ideasRule(fit, t, options))));
  for (const r of rows) if (r.cost && bktOnSkill) r.row.bktSaves = minus(r.cost, bktOnSkill);
  return {
    skill,
    onSkill,
    perIdea: rows[0].row,
    blamed: rows[1].row,
    carried: rows[2].row,
    ...(rows[1].cost && rows[2].cost ? { carryingSaves: minus(rows[2].cost, rows[1].cost) } : {}),
    calibration: [...masteryCalibration(fitted, testS), ...forms.map(({ fit, options }) => ideasCalibration(fit, testS, options))],
    diagnosis: forms.map(({ fit, options }) => diagnosis(fit, testS, options)),
    usual: [...usualRules(fitted, trainS), ...forms.map(({ fit, options }) => ideasRule(fit, USUAL_THRESHOLD, options))].map((rule) => judge(rule, testS)),
    ideaCalibration: [false, true].map((atWrong) => ideaCalibration(across, testS, { blame: true, starts }, atWrong)),
    ...(rates === "fit" ? { fittedTicks: tick } : {}),
  };
}
