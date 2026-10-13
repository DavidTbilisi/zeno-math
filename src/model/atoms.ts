// Skills made of atoms: does a skill that is really several atoms look, to BKT, like the gradual worlds of H2? In this
// world every skill is k atoms, and each atom is exactly what BKT assumes a skill is: known or not, learnt all at
// once, with a guess and a slip. A question on the skill asks for one atom, chosen at random, so the questions take
// the atoms in turn as Zeno's generators take the forms of a skill. The skill is mastered when every atom is known,
// which here is the same as the gradual worlds' definition: the chance of a right answer on the next question is at
// least 0.9 (one minus the slip) only then.
//
// Two ways of running BKT are compared on the same answers, by H2's own standard (the cheapest threshold whose
// declarations are right at least 90 % of the time on training learners, judged on the rest): BKT on the skill, as
// H2 ran it, which sees one known state where there are k; and BKT on each atom, which knows which atom each question
// asked for and declares the skill mastered when it would declare every atom. With one atom the two are the same and
// this is H2's plain BKT world. The expectation, if hidden atoms are what make learning look gradual, is that BKT on
// the skill fails as the gradual worlds made it fail once k is above 1, and BKT on each atom does not.
//
// Skills may also share atoms: with uses above 1 every atom is in that many skills, as multiplying whole numbers is in
// fractions, percentages and areas. A learner keeps what they know of an atom from one skill to the next, so a skill
// whose atoms were learnt in earlier skills starts known. BKT on each atom can then carry each atom's P(known) from
// skill to skill, which BKT on the skill cannot; comparing it with BKT on each atom started afresh in every skill
// measures what that credit is worth.
//
// The model may also be finer than the learner (G3 in docs/thesis/outline.md): with split above 1 every atom is
// modelled as that many components, and each question is tagged with one of its atom's components at random, so BKT
// on each component sees a piece of the evidence for something the learner learns as one thing. The truth and the
// answers are the same at every split, so the grains are compared on the same practices. Two things that going too
// fine costs are counted beside the usual comparison: fits at the grid's edge, and whether the threshold chosen on
// the training learners is still the right one on the held-out learners.
//
// A question may also ask for several atoms at once (G1 and G2): with perQuestion above 1 each question needs that
// many of the skill's atoms, drawn without repetition, and is right (but for a slip) only when all of them are known,
// as the generators' questions are in the world of ideas (ideas.ts). BKT on each atom then takes the conjunctive step
// of that world, with the skill's fitted guess and slip; a question on one atom stays that atom's own BKT step. Beside
// the cheapest threshold meeting the standard, every method is judged at the threshold a deployed system would use
// without a truth to set it by (usualRules in mastery.ts), since that is where a wrong grain shows in practice.
import { sigmoid } from "./elo.ts";
import { BKT_GRID, bktStep, calibration, fitBkt, rmse, type BktParams, type Prediction } from "./evaluate.ts";
import { conjunctiveStep } from "./ideaState.ts";
import { DEFAULT_SIM } from "./simulate.ts";
import {
  bktRule, bootstrapByStudent, cheapestAtPrecision, compareAtPrecision, costOf, decide, emaRule, FINE_THRESHOLDS, fitRules, judge, masteryCalibration, PRECISION_TARGET,
  precisionOf, USUAL_THRESHOLD, usualRules, type AtPrecision, type Calibration, type Judgement, type MasteryRule, type Practice,
} from "./mastery.ts";
import { rng } from "./random.ts";

/**
 * A skill's answers, with which components each question asked for (needs: for each question the indices into ids,
 * the components' names; one index unless questions ask for several atoms at once), whether each of the skill's atoms
 * was known after each answer, and how many components each atom is modelled as (split: 1 when the components are the
 * atoms; component c belongs to atom floor(c / split)).
 */
export type AtomPractice = Practice & { known: Uint8Array; ids: readonly string[]; needs: readonly (readonly number[])[]; atomKnown: Uint8Array[]; split: number };
/** The atom a component of a practice belongs to. */
export const atomOf = (p: AtomPractice, component: number) => Math.floor(component / p.split);

export type AtomParams = {
  students: number;
  /** Skills each learner practises, all made of the same number of atoms. */
  skills: number;
  /** Atoms in each skill. */
  atoms: number;
  /** Skills each atom is in: 1, none shared. skills × atoms must be a multiple of it. */
  uses: number;
  /** Questions on each skill. */
  length: number;
  /** As in the simulation: the chance one question teaches an unknown atom is 2.5 times this (0.02 → 5 %). */
  learnRate: number;
  seed: number;
  /** Components each atom is modelled as: 1, the model is at the learner's grain; above it, finer (G3). */
  split: number;
  /** Atoms each question asks for at once, 1 to atoms: above 1 the question is right only when all of them are known. */
  perQuestion: number;
};
export const DEFAULT_ATOMS: AtomParams = { students: 400, skills: 12, atoms: 2, uses: 1, length: 30, learnRate: 0.02, seed: 1, split: 1, perQuestion: 1 };

/** The BKT world's chances at level 2, where H2's questions are. */
const GUESS = 0.2, SLIP = 0.1;
const LEARN_PER_RATE = 2.5;

/**
 * Which atoms each skill is made of, by number: with uses 1 skill s has atoms s·k to s·k + k − 1; above it every atom
 * is put in uses skills, dealt at random (from a generator of its own, so the answers' draws stay as they are) and
 * dealt again until no skill has an atom twice.
 */
export function dealAtoms(skills: number, atoms: number, uses: number, seed: number): number[][] {
  const pool = (skills * atoms) / uses;
  if (!Number.isInteger(pool)) throw new Error(`${skills} skills of ${atoms} atoms cannot put every atom in ${uses} skills`);
  const slots = Array.from({ length: skills * atoms }, (_, i) => Math.floor(i / uses));
  const deal = () => Array.from({ length: skills }, (_, k) => slots.slice(k * atoms, (k + 1) * atoms));
  if (uses === 1) return deal();
  const r = rng(seed + 1);
  for (let tries = 0; tries < 10_000; tries++) {
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(r.next() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    const dealt = deal();
    if (dealt.every((m) => new Set(m).size === atoms)) return dealt;
  }
  throw new Error(`no deal of ${skills} skills of ${atoms} atoms, each atom in ${uses}, without an atom twice in a skill`);
}

/**
 * Every learner practises every skill, one after another. Ability is the simulation's (an overall part and one per
 * skill, with its spreads), each atom has a difficulty of its own, and ability against it, in the skill where the
 * learner first meets the atom, is the chance of knowing it at the start, as in the BKT world. An atom is learnt or
 * kept whichever skill asks for it. After each answer the truth is recorded: each of the skill's atoms' state, and
 * whether all of them are known. With split above 1 the question is also tagged with one of its atom's components,
 * drawn from a generator of its own so that the answers and the truth are the same at every split. With perQuestion
 * above 1 each question draws that many distinct atoms, is right only when all are known, and may teach each of them.
 */
export function simulateAtoms(params: Partial<AtomParams> = {}): AtomPractice[] {
  const p = { ...DEFAULT_ATOMS, ...params };
  if (!Number.isInteger(p.split) || p.split < 1) throw new Error(`split must be a whole number above 0, not ${p.split}`);
  if (!Number.isInteger(p.perQuestion) || p.perQuestion < 1 || p.perQuestion > p.atoms) throw new Error(`perQuestion must be a whole number from 1 to the ${p.atoms} atoms of a skill, not ${p.perQuestion}`);
  const members = dealAtoms(p.skills, p.atoms, p.uses, p.seed);
  const r = rng(p.seed);
  const parts = rng(p.seed + 2);
  const { spread } = DEFAULT_SIM;
  const difficulty = Array.from({ length: (p.skills * p.atoms) / p.uses }, () => r.normal(spread.difficulty));
  const ids = members.map((m) => m.flatMap((id) => (p.split === 1 ? [`atom${id + 1}`] : Array.from({ length: p.split }, (_, c) => `atom${id + 1}.${c + 1}`))));
  const learn = Math.min(1, LEARN_PER_RATE * p.learnRate);
  const out: AtomPractice[] = [];
  for (let s = 0; s < p.students; s++) {
    const global = r.normal(spread.global);
    const known = new Map<number, boolean>();
    for (let k = 0; k < p.skills; k++) {
      const ability = global + r.normal(spread.skill);
      for (const id of members[k]) if (!known.has(id)) known.set(id, r.next() < sigmoid(ability - difficulty[id]));
      const answers = new Uint8Array(p.length), all = new Uint8Array(p.length);
      const needs: number[][] = [];
      const atomKnown = members[k].map(() => new Uint8Array(p.length));
      for (let i = 0; i < p.length; i++) {
        // One atom drawn as before; several drawn without repetition, the first draw the same.
        const asked = [Math.floor(r.next() * p.atoms)];
        while (asked.length < p.perQuestion) {
          const a = Math.floor(r.next() * p.atoms);
          if (!asked.includes(a)) asked.push(a);
        }
        needs.push(asked.map((a) => (p.split === 1 ? a : a * p.split + Math.floor(parts.next() * p.split))));
        const allAsked = asked.every((a) => known.get(members[k][a]));
        answers[i] = r.next() < (allAsked ? 1 - SLIP : GUESS) ? 1 : 0;
        for (const a of asked) {
          const id = members[k][a];
          if (!known.get(id) && r.next() < learn) known.set(id, true);
        }
        members[k].forEach((m, j) => (atomKnown[j][i] = known.get(m) ? 1 : 0));
        all[i] = members[k].every((m) => known.get(m)) ? 1 : 0;
      }
      out.push({ student: `sim${s + 1}`, skill: `skill${k + 1}`, answers, known: all, ids: ids[k], needs, atomKnown, split: p.split });
    }
  }
  return out;
}

/** A skill's answers split by component, each component a practice of its own with its atom's truth: the answers of every question that asked for it. */
export function byAtom(practices: readonly AtomPractice[]): Practice[] {
  return practices.flatMap((p) =>
    p.ids.map((id, c) => {
      const at = [...p.needs.keys()].filter((i) => p.needs[i].includes(c));
      const known = p.atomKnown[atomOf(p, c)];
      return { student: p.student, skill: id, answers: Uint8Array.from(at, (i) => p.answers[i]), known: Uint8Array.from(at, (i) => known[i]) };
    }),
  );
}

/** Where each of a practice's atoms starts: its P(known) carried from the student's earlier skills (see carried). */
export type Starts = ReadonlyMap<Practice, readonly number[]>;
/** The guess and slip of a question on a skill, for a question asking for several atoms at once (BKT fitted on the skill). */
export type QuestionOf = (skill: string) => { guess: number; slip: number };

/**
 * One answer into the components' P(known): a question on one component is that component's own BKT step; one on
 * several is the conjunctive step with the question's guess and slip (the skill's, as in the world of ideas), or,
 * without them, the first component's own.
 */
function stepAtoms(known: number[], params: readonly BktParams[], p: AtomPractice, i: number, question: QuestionOf | undefined) {
  const needed = p.needs[i], right = p.answers[i] === 1;
  if (needed.length === 1) known[needed[0]] = bktStep(known[needed[0]], params[needed[0]], right).known;
  else conjunctiveStep(known, needed, (c) => params[c].learn, question?.(p.skill) ?? params[needed[0]], right);
}

/**
 * BKT on each atom: each answer updates the P(known) of the atoms its question asked for, and the skill is declared
 * mastered once every atom's P(known) has reached the threshold. It needs the practice, to know the atoms. Each atom
 * starts at its fitted init, or, given starts, where the student's earlier skills left it.
 */
export const atomsRule = (paramsOf: (atom: string) => BktParams, threshold: number, starts?: Starts, question?: QuestionOf): MasteryRule => ({
  name: `BKT per atom${starts ? ", carried" : ""} θ ${threshold}`,
  declare(_skill, answers, practice) {
    const p = practice as AtomPractice;
    const params = p.ids.map(paramsOf);
    const known = [...(starts?.get(p) ?? params.map((b) => b.init))];
    for (let i = 0; i < answers.length; i++) {
      stepAtoms(known, params, p, i, question);
      if (known.every((k) => k >= threshold)) return i + 1;
    }
    return null;
  },
});

/**
 * Each practice's atoms' P(known) before its first answer, carried over every skill each student practised before it
 * (in the order given): an atom met before starts where its last answer left it, one never met at its fitted init.
 */
export function carried(paramsOf: (atom: string) => BktParams, practices: readonly AtomPractice[], question?: QuestionOf): Starts {
  const state = new Map<string, Map<string, number>>();
  const out = new Map<Practice, number[]>();
  for (const p of practices) {
    const mine = state.get(p.student) ?? state.set(p.student, new Map()).get(p.student)!;
    const params = p.ids.map(paramsOf);
    const known = p.ids.map((id, c) => mine.get(id) ?? params[c].init);
    out.set(p, [...known]);
    for (let i = 0; i < p.answers.length; i++) stepAtoms(known, params, p, i, question);
    p.ids.forEach((id, c) => mine.set(id, known[c]));
  }
  return out;
}

const fitEach = (sequences: Iterable<readonly [string, Uint8Array]>) => {
  const byName = new Map<string, Uint8Array[]>();
  for (const [name, seq] of sequences) (byName.get(name) ?? byName.set(name, []).get(name)!).push(seq);
  const params = new Map([...byName].map(([name, seqs]) => [name, fitBkt(seqs)]));
  return (atom: string) => params.get(atom)!;
};
/** BKT's parameters for each atom, fitted on the training practices split by atom, each skill's answers on their own. */
export const fitAtoms = (train: readonly AtomPractice[]) => fitEach(byAtom(train).map((p) => [p.skill, p.answers] as const));
/** BKT's parameters for each atom, fitted on each student's answers on it across every skill, in order. */
export function fitCarried(train: readonly AtomPractice[]): (atom: string) => BktParams {
  const seqs = new Map<string, number[]>();
  for (const p of train)
    for (let i = 0; i < p.answers.length; i++)
      for (const c of p.needs[i]) {
        const key = `${p.student}\u0000${p.ids[c]}`;
        (seqs.get(key) ?? seqs.set(key, []).get(key)!).push(p.answers[i]);
      }
  return fitEach([...seqs].map(([key, answers]) => [key.split("\u0000")[1], Uint8Array.from(answers)] as const));
}

/** How well BKT on each atom says the skill is mastered: the product of its atoms' P(known), against every atom known. */
export function atomsCalibration(paramsOf: (atom: string) => BktParams, practices: readonly AtomPractice[], starts?: Starts, question?: QuestionOf): Calibration {
  const ps: Prediction[] = [];
  for (const p of practices) {
    const params = p.ids.map(paramsOf);
    const known = [...(starts?.get(p) ?? params.map((b) => b.init))];
    for (let i = 0; i < p.answers.length; i++) {
      stepAtoms(known, params, p, i, question);
      ps.push({ p: known.reduce((x, y) => x * y, 1), correct: p.known[i] === 1 });
    }
  }
  return { score: "BKT P(known)", n: ps.length, brier: rmse(ps) ** 2, bins: calibration(ps) };
}

/** How many of a set of fitted parameters sit on the grid's edge: guess or slip at their bound (the degenerate fits the bound is there to stop), or any parameter at the end of its grid. */
export type FitShares = { fits: number; atBound: number; atEdge: number };
const ends = (grid: readonly number[]) => [grid[0], grid[grid.length - 1]];
export const atBound = (p: BktParams) => p.guess >= ends(BKT_GRID.guess)[1] || p.slip >= ends(BKT_GRID.slip)[1];
export const atEdge = (p: BktParams) => atBound(p) || ends(BKT_GRID.init).includes(p.init) || ends(BKT_GRID.learn).includes(p.learn);
export function fitShares(params: readonly BktParams[]): FitShares {
  const n = params.length;
  return { fits: n, atBound: n ? params.filter(atBound).length / n : NaN, atEdge: n ? params.filter(atEdge).length / n : NaN };
}

/**
 * Whether the threshold a family of rules gets on the training learners is the one it would get on the held-out
 * learners: the cheapest threshold meeting the target on each, and the precision the training one reaches on the
 * held-out learners (below the target, the threshold did not transfer). Null where no threshold meets the target.
 */
export type Stability = { method: string; onTrain: number | null; onTest: number | null; precisionOnTest: number | null };
export function stability(method: string, make: (threshold: number) => MasteryRule, thresholds: readonly number[], train: readonly Practice[], test: readonly Practice[], target: number): Stability {
  const rules = thresholds.map(make);
  const chosen = (on: readonly Practice[]) => {
    const rule = cheapestAtPrecision(rules, on, target);
    return rule ? thresholds[rules.indexOf(rule)] : null;
  };
  const onTrain = chosen(train);
  return { method, onTrain, onTest: chosen(test), precisionOnTest: onTrain === null ? null : judge(make(onTrain), test).precision };
}

export type AtomsComparison = {
  /** H2's comparison on the skill: BKT, EMA and the streak rule, as compareAtPrecision gives it. */
  skill: AtPrecision[];
  /** BKT on each atom, started afresh in every skill, at the same standard, with its cost minus BKT on the skill's. */
  perAtom: AtPrecision;
  /** BKT on each atom carried from skill to skill, the same, with its cost minus BKT on the skill's. */
  carried: AtPrecision;
  /** Carried's cost minus afresh's, with its interval (below zero, carrying saves answers), when both meet the standard. */
  carryingSaves?: { estimate: number; interval: [number, number] };
  /** Calibration against the truth after every answer: the skill's three scores, then BKT on each atom afresh and carried. */
  calibration: Calibration[];
  /** Fits at the grid's edge: BKT on the skill (one fit per skill), BKT on each component afresh and carried (one per component). */
  fits: { skill: FitShares; perAtom: FitShares; carried: FitShares };
  /** Whether each family's training threshold transfers to the held-out learners: BKT on the skill, EMA, per component afresh, carried. */
  stability: Stability[];
  /**
   * Every method judged on the held-out practices at the threshold a deployed system would use, chosen without a truth
   * (usualRules): BKT on the skill at 0.95, the EMA at the streak rule's cost, the streak rule, then BKT per component
   * afresh and carried at 0.95. The precision here is what a wrong grain costs a system that does not know it is wrong.
   */
  usual: Judgement[];
};
/**
 * H2's comparison in a world of atoms, with BKT on each atom, afresh in every skill and carried from skill to skill,
 * added beside BKT on the skill. Each is the cheapest of its family meeting the target on the training practices,
 * judged on the test practices, with intervals over students. With no atom shared the two per-atom rules are the same.
 */
export function compareAtoms(train: readonly AtomPractice[], test: readonly AtomPractice[], target = PRECISION_TARGET, resamples = 2000, seed = 1, thresholds: readonly number[] = FINE_THRESHOLDS): AtomsComparison {
  const fitted = fitRules(train);
  const skill = compareAtPrecision(train, test, fitted, target, resamples, seed, thresholds);
  const all = test.map((_, i) => i);
  const minus = (a: (idx: readonly number[]) => number, b: (idx: readonly number[]) => number) => ({
    estimate: a(all) - b(all), interval: bootstrapByStudent(test, (idx) => a(idx) - b(idx), resamples, seed),
  });
  const best = (family: MasteryRule[]) => {
    const rule = cheapestAtPrecision(family, train, target);
    if (!rule) return { row: { method: "BKT", rule: null } as AtPrecision, cost: null };
    const d = decide(rule, test), cost = costOf(d, test);
    const row: AtPrecision = {
      method: "BKT",
      rule: rule.name,
      judgement: { ...judge(rule, test, d), costInterval: bootstrapByStudent(test, cost, resamples, seed), precisionInterval: bootstrapByStudent(test, precisionOf(d), resamples, seed) },
    };
    return { row, cost };
  };
  // BKT on the skill chosen again as compareAtPrecision chose it, for the paired differences.
  const onSkill = best(thresholds.map((t) => bktRule(fitted.bkt, t))).cost;
  const afreshParams = fitAtoms(train), carriedParams = fitCarried(train);
  const starts = carried(carriedParams, [...train, ...test], fitted.bkt);
  const afresh = best(thresholds.map((t) => atomsRule(afreshParams, t, undefined, fitted.bkt)));
  const kept = best(thresholds.map((t) => atomsRule(carriedParams, t, starts, fitted.bkt)));
  for (const r of [afresh, kept]) if (r.cost && onSkill) r.row.bktSaves = minus(r.cost, onSkill);
  const skills = [...new Set(train.map((p) => p.skill))], components = [...new Set(train.flatMap((p) => p.ids))];
  return {
    skill,
    perAtom: afresh.row,
    carried: kept.row,
    ...(afresh.cost && kept.cost ? { carryingSaves: minus(kept.cost, afresh.cost) } : {}),
    calibration: [...masteryCalibration(fitted, test), atomsCalibration(afreshParams, test, undefined, fitted.bkt), atomsCalibration(carriedParams, test, starts, fitted.bkt)],
    fits: { skill: fitShares(skills.map(fitted.bkt)), perAtom: fitShares(components.map(afreshParams)), carried: fitShares(components.map(carriedParams)) },
    stability: [
      stability("BKT on the skill", (t) => bktRule(fitted.bkt, t), thresholds, train, test, target),
      stability("EMA", (t) => emaRule(fitted.ema, t), thresholds, train, test, target),
      stability("BKT per atom", (t) => atomsRule(afreshParams, t, undefined, fitted.bkt), thresholds, train, test, target),
      stability("BKT per atom, carried", (t) => atomsRule(carriedParams, t, starts, fitted.bkt), thresholds, train, test, target),
    ],
    usual: [...usualRules(fitted, train), atomsRule(afreshParams, USUAL_THRESHOLD, undefined, fitted.bkt), atomsRule(carriedParams, USUAL_THRESHOLD, starts, fitted.bkt)].map((rule) => judge(rule, test)),
  };
}
