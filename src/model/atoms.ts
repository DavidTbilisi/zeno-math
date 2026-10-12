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
import { sigmoid } from "./elo.ts";
import { bktStep, calibration, fitBkt, rmse, type BktParams, type Prediction } from "./evaluate.ts";
import { DEFAULT_SIM } from "./simulate.ts";
import {
  bktRule, bootstrapByStudent, cheapestAtPrecision, compareAtPrecision, costOf, decide, FINE_THRESHOLDS, fitRules, judge, masteryCalibration, PRECISION_TARGET,
  precisionOf, type AtPrecision, type Calibration, type MasteryRule, type Practice,
} from "./mastery.ts";
import { rng } from "./random.ts";

/** A skill's answers, with which atom each question asked for and whether each atom was known after each answer. */
export type AtomPractice = Practice & { known: Uint8Array; atom: Uint8Array; atomKnown: Uint8Array[] };

export type AtomParams = {
  students: number;
  /** Skills each learner practises, all made of the same number of atoms. */
  skills: number;
  /** Atoms in each skill. */
  atoms: number;
  /** Questions on each skill. */
  length: number;
  /** As in the simulation: the chance one question teaches an unknown atom is 2.5 times this (0.02 → 5 %). */
  learnRate: number;
  seed: number;
};
export const DEFAULT_ATOMS: AtomParams = { students: 400, skills: 12, atoms: 2, length: 30, learnRate: 0.02, seed: 1 };

/** The BKT world's chances at level 2, where H2's questions are. */
const GUESS = 0.2, SLIP = 0.1;
const LEARN_PER_RATE = 2.5;

/**
 * Every learner practises every skill, one after another. Ability is the simulation's (an overall part and one per
 * skill, with its spreads), each atom has a difficulty of its own, and ability against it is the chance of knowing
 * the atom at the start, as in the BKT world. After each answer the truth is recorded: each atom's state, and whether
 * all of them are known.
 */
export function simulateAtoms(params: Partial<AtomParams> = {}): AtomPractice[] {
  const p = { ...DEFAULT_ATOMS, ...params };
  const r = rng(p.seed);
  const { spread } = DEFAULT_SIM;
  const difficulty = Array.from({ length: p.skills }, () => Array.from({ length: p.atoms }, () => r.normal(spread.difficulty)));
  const learn = Math.min(1, LEARN_PER_RATE * p.learnRate);
  const out: AtomPractice[] = [];
  for (let s = 0; s < p.students; s++) {
    const global = r.normal(spread.global);
    for (let k = 0; k < p.skills; k++) {
      const ability = global + r.normal(spread.skill);
      const known = difficulty[k].map((d) => r.next() < sigmoid(ability - d));
      const answers = new Uint8Array(p.length), all = new Uint8Array(p.length), atom = new Uint8Array(p.length);
      const atomKnown = known.map(() => new Uint8Array(p.length));
      for (let i = 0; i < p.length; i++) {
        const a = Math.floor(r.next() * p.atoms);
        atom[i] = a;
        answers[i] = r.next() < (known[a] ? 1 - SLIP : GUESS) ? 1 : 0;
        if (!known[a] && r.next() < learn) known[a] = true;
        known.forEach((x, j) => (atomKnown[j][i] = x ? 1 : 0));
        all[i] = known.every(Boolean) ? 1 : 0;
      }
      out.push({ student: `sim${s + 1}`, skill: `skill${k + 1}`, answers, known: all, atom, atomKnown });
    }
  }
  return out;
}

const atomName = (skill: string, a: number) => `${skill}#${a + 1}`;

/** A skill's answers split by atom, each atom a practice of its own with its own truth. */
export function byAtom(practices: readonly AtomPractice[]): Practice[] {
  return practices.flatMap((p) =>
    p.atomKnown.map((known, a) => {
      const at = [...p.atom.keys()].filter((i) => p.atom[i] === a);
      return { student: p.student, skill: atomName(p.skill, a), answers: Uint8Array.from(at, (i) => p.answers[i]), known: Uint8Array.from(at, (i) => known[i]) };
    }),
  );
}

/**
 * BKT on each atom: each answer updates the P(known) of the atom its question asked for, and the skill is declared
 * mastered once every atom's P(known) has reached the threshold. It needs the practice, to know the atoms.
 */
export const atomsRule = (paramsOf: (atom: string) => BktParams, threshold: number): MasteryRule => ({
  name: `BKT per atom θ ${threshold}`,
  declare(skill, answers, practice) {
    const { atom, atomKnown } = practice as AtomPractice;
    const params = atomKnown.map((_, a) => paramsOf(atomName(skill, a)));
    const known = params.map((b) => b.init);
    for (let i = 0; i < answers.length; i++) {
      const a = atom[i];
      known[a] = bktStep(known[a], params[a], answers[i] === 1).known;
      if (known.every((k) => k >= threshold)) return i + 1;
    }
    return null;
  },
});

/** BKT's parameters for each atom, fitted on the training practices split by atom. */
export function fitAtoms(train: readonly AtomPractice[]): (atom: string) => BktParams {
  const bySkill = new Map<string, Uint8Array[]>();
  for (const p of byAtom(train)) (bySkill.get(p.skill) ?? bySkill.set(p.skill, []).get(p.skill)!).push(p.answers);
  const params = new Map([...bySkill].map(([atom, seqs]) => [atom, fitBkt(seqs)]));
  return (atom) => params.get(atom)!;
}

/** How well BKT on each atom says the skill is mastered: the product of its atoms' P(known), against every atom known. */
export function atomsCalibration(paramsOf: (atom: string) => BktParams, practices: readonly AtomPractice[]): Calibration {
  const ps: Prediction[] = [];
  for (const p of practices) {
    const params = p.atomKnown.map((_, a) => paramsOf(atomName(p.skill, a)));
    const known = params.map((b) => b.init);
    for (let i = 0; i < p.answers.length; i++) {
      known[p.atom[i]] = bktStep(known[p.atom[i]], params[p.atom[i]], p.answers[i] === 1).known;
      ps.push({ p: known.reduce((x, y) => x * y, 1), correct: p.known[i] === 1 });
    }
  }
  return { score: "BKT P(known)", n: ps.length, brier: rmse(ps) ** 2, bins: calibration(ps) };
}

export type AtomsComparison = {
  /** H2's comparison on the skill: BKT, EMA and the streak rule, as compareAtPrecision gives it. */
  skill: AtPrecision[];
  /** BKT on each atom at the same standard, with its cost minus BKT-on-the-skill's (above zero, the skill is cheaper). */
  perAtom: AtPrecision;
  /** Calibration against the truth after every answer: the skill's three scores, then BKT on each atom's. */
  calibration: Calibration[];
};
/** H2's comparison in a world of atoms, with BKT on each atom added beside BKT on the skill. */
export function compareAtoms(train: readonly AtomPractice[], test: readonly AtomPractice[], target = PRECISION_TARGET, resamples = 2000, seed = 1, thresholds: readonly number[] = FINE_THRESHOLDS): AtomsComparison {
  const fitted = fitRules(train);
  const skill = compareAtPrecision(train, test, fitted, target, resamples, seed, thresholds);
  const atoms = fitAtoms(train);
  const rule = cheapestAtPrecision(thresholds.map((t) => atomsRule(atoms, t)), train, target);
  const perAtom: AtPrecision = { method: "BKT", rule: rule?.name ?? null };
  if (rule) {
    const d = decide(rule, test), cost = costOf(d, test);
    perAtom.judgement = {
      ...judge(rule, test, d),
      costInterval: bootstrapByStudent(test, cost, resamples, seed),
      precisionInterval: bootstrapByStudent(test, precisionOf(d), resamples, seed),
    };
    // BKT on the skill chosen again as compareAtPrecision chose it, for the paired difference.
    const onSkill = cheapestAtPrecision(thresholds.map((t) => bktRule(fitted.bkt, t)), train, target);
    if (onSkill) {
      const bktCost = costOf(decide(onSkill, test), test), all = test.map((_, i) => i);
      perAtom.bktSaves = { estimate: cost(all) - bktCost(all), interval: bootstrapByStudent(test, (idx) => cost(idx) - bktCost(idx), resamples, seed) };
    }
  }
  return { skill, perAtom, calibration: [...masteryCalibration(fitted, test), atomsCalibration(atoms, test)] };
}
