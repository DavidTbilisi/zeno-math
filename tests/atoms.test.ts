// Skills made of atoms: the world keeps its truth straight, BKT on each atom is BKT on the skill when there is one
// atom, and with several atoms BKT on the skill fails H2's standard and loses its calibration while BKT on each atom
// keeps both. When skills share atoms, what a learner knows of an atom goes with them from skill to skill, and BKT on
// each atom carried along needs fewer answers than started afresh in every skill (src/model/atoms.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { atomsCalibration, atomsRule, byAtom, carried, compareAtoms, dealAtoms, fitAtoms, fitCarried, simulateAtoms, type AtomPractice } from "../src/model/atoms.ts";
import { bktStep, splitByStudent } from "../src/model/evaluate.ts";
import { bktRule, fitRules, masteryCalibration } from "../src/model/mastery.ts";

test("the atoms world: one atom asked per question, atoms learnt once and kept, the skill known when all its atoms are", () => {
  const ps = simulateAtoms({ students: 30, skills: 3, atoms: 3, length: 20 });
  assert.equal(ps.length, 90);
  for (const p of ps) {
    assert.ok(p.atom.every((a) => a < 3));
    for (let i = 0; i < p.answers.length; i++) {
      assert.equal(p.known[i], p.atomKnown.every((k) => k[i]) ? 1 : 0);
      if (i) for (const k of p.atomKnown) assert.ok(k[i] >= k[i - 1], "an atom once known stays known");
      // Only the atom asked for can be learnt from a question.
      if (i) p.atomKnown.forEach((k, a) => a !== p.atom[i] && assert.equal(k[i], k[i - 1]));
    }
  }
  assert.deepEqual(simulateAtoms({ students: 5, skills: 2 }), simulateAtoms({ students: 5, skills: 2 }));
  // Split by atom, every answer lands with the atom it asked for, in order.
  const split = byAtom(ps.slice(0, 1));
  assert.deepEqual(split.map((p) => p.skill), ["atom1", "atom2", "atom3"]);
  assert.equal(split.reduce((s, p) => s + p.answers.length, 0), 20);
  const first = [...ps[0].atom.keys()].filter((i) => ps[0].atom[i] === 0);
  assert.deepEqual([...split[0].answers], first.map((i) => ps[0].answers[i]));
});

test("with one atom, BKT on each atom is BKT on the skill: the same fit, declarations and calibration", () => {
  const ps = simulateAtoms({ students: 60, skills: 2, atoms: 1, learnRate: 0.1 });
  const skill = fitRules(ps).bkt, atom = fitAtoms(ps);
  assert.deepEqual(atom("atom1"), skill("skill1"));
  for (const t of [0.8, 0.95])
    for (const p of ps) assert.equal(atomsRule(atom, t).declare(p.skill, p.answers, p), bktRule(skill, t).declare(p.skill, p.answers));
  assert.equal(atomsCalibration(atom, ps).brier, masteryCalibration(fitRules(ps), ps)[0].brier);
});

test("with three atoms BKT on the skill never meets H2's standard and is the worst calibrated; BKT on each atom is neither", () => {
  const { train, test: held } = splitByStudent(simulateAtoms({ students: 200, skills: 4, atoms: 3, learnRate: 0.1 }), 0.3, 1);
  const c = compareAtoms(train, held, 0.9, 50);
  const [bkt, ema] = c.skill;
  assert.equal(bkt.rule, null);
  assert.ok(c.perAtom.judgement!.cost < ema.judgement!.cost, "BKT per atom is cheaper than EMA");
  assert.equal(c.perAtom.bktSaves, undefined, "nothing to compare with when BKT on the skill never meets the standard");
  const [known, , emaScore, perAtom, kept] = c.calibration.map((x) => x.brier);
  assert.ok(known > emaScore && perAtom < emaScore, `Brier P(known) ${known}, EMA ${emaScore}, per atom ${perAtom}`);
  // No atom is shared, so carrying changes nothing.
  assert.equal(c.carried.judgement!.cost, c.perAtom.judgement!.cost);
  assert.equal(kept, perAtom);
  assert.equal(c.carryingSaves!.estimate, 0);
});

test("with two atoms both meet the standard, and BKT on each atom needs fewer answers than BKT on the skill", () => {
  const { train, test: held } = splitByStudent(simulateAtoms({ students: 200, skills: 4, atoms: 2, learnRate: 0.1 }), 0.3, 1);
  const c = compareAtoms(train, held, 0.9, 50);
  assert.ok(c.skill[0].rule && c.perAtom.rule);
  assert.ok(c.perAtom.bktSaves!.estimate < 0, `per atom minus on the skill ${c.perAtom.bktSaves!.estimate}`);
});

test("atoms are dealt to skills in order when none is shared, and otherwise each into exactly that many skills, never twice in one", () => {
  assert.deepEqual(dealAtoms(2, 3, 1, 1), [[0, 1, 2], [3, 4, 5]]);
  const dealt = dealAtoms(12, 3, 3, 1);
  assert.ok(dealt.every((m) => m.length === 3 && new Set(m).size === 3));
  const count = new Map<number, number>();
  for (const id of dealt.flat()) count.set(id, (count.get(id) ?? 0) + 1);
  assert.deepEqual([...count.keys()].sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i));
  assert.ok([...count.values()].every((n) => n === 3));
  assert.deepEqual(dealAtoms(12, 3, 3, 1), dealt);
  assert.throws(() => dealAtoms(4, 3, 5, 1), /cannot put every atom in 5 skills/);
  // One skill of two atoms, each atom in two skills: the only atom has to go in it twice.
  assert.throws(() => dealAtoms(1, 2, 2, 1), /without an atom twice/);
});

test("a shared atom goes with the learner from skill to skill: known at the end of one skill, known all through the next", () => {
  const ps = simulateAtoms({ students: 40, skills: 6, atoms: 3, uses: 3, learnRate: 0.1 });
  let checked = 0;
  const last = new Map<string, number>();
  for (const p of ps) {
    p.ids.forEach((id, a) => {
      if (last.get(`${p.student} ${id}`) === 1) (assert.ok(p.atomKnown[a].every((k) => k === 1), `${p.student} ${id}`), checked++);
      last.set(`${p.student} ${id}`, p.atomKnown[a][p.answers.length - 1]);
    });
  }
  assert.ok(checked > 100, `${checked} carried atoms checked`);
});

test("carried starts each atom where the student's earlier skills left it, and at its init when never met", () => {
  const params = { init: 0.3, learn: 0.1, guess: 0.2, slip: 0.1 };
  const practice = (student: string, skill: string, ids: string[], atom: number[], answers: number[]): AtomPractice => ({
    student, skill, ids, atom: Uint8Array.from(atom), answers: Uint8Array.from(answers), known: new Uint8Array(answers.length), atomKnown: ids.map(() => new Uint8Array(answers.length)),
  });
  const one = practice("s", "skill1", ["a", "b"], [0, 0, 1], [1, 0, 1]);
  const two = practice("s", "skill2", ["b", "c"], [0], [1]);
  const other = practice("t", "skill2", ["b", "c"], [0], [1]);
  const starts = carried(() => params, [one, two, other]);
  const step = (k: number, right: boolean) => bktStep(k, params, right).known;
  assert.deepEqual(starts.get(one), [0.3, 0.3]);
  assert.deepEqual(starts.get(two), [step(0.3, true), 0.3]);
  assert.deepEqual(starts.get(other), [0.3, 0.3], "another student starts afresh");
  // A skill of b alone: carried from where skill 1 left b, one right answer reaches a threshold that afresh it does not.
  const onlyB = practice("s", "skill3", ["b"], [0], [1]);
  const θ = step(step(0.3, true), true);
  const rule = atomsRule(() => params, θ, carried(() => params, [one, onlyB]));
  assert.ok(rule.name.startsWith("BKT per atom, carried"));
  assert.equal(rule.declare("skill3", onlyB.answers, onlyB), 1);
  assert.equal(atomsRule(() => params, θ).declare("skill3", onlyB.answers, onlyB), null);
});

test("when skills share atoms, carrying them from skill to skill needs fewer answers than starting each skill afresh", () => {
  const { train, test: held } = splitByStudent(simulateAtoms({ students: 200, skills: 6, atoms: 3, uses: 3, learnRate: 0.1 }), 0.3, 1);
  const c = compareAtoms(train, held, 0.9, 50);
  assert.ok(c.carryingSaves!.interval[1] < 0, `carried minus afresh ${c.carryingSaves!.estimate} ${c.carryingSaves!.interval}`);
  const [, , , afresh, kept] = c.calibration.map((x) => x.brier);
  assert.ok(kept < afresh, `Brier carried ${kept}, afresh ${afresh}`);
  // With no atom shared the carried fit is the afresh fit.
  const alone = simulateAtoms({ students: 30, skills: 2, atoms: 2 });
  assert.deepEqual(fitCarried(alone)("atom3"), fitAtoms(alone)("atom3"));
});
