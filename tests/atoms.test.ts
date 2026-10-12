// Skills made of atoms: the world keeps its truth straight, BKT on each atom is BKT on the skill when there is one
// atom, and with several atoms BKT on the skill fails H2's standard and loses its calibration while BKT on each atom
// keeps both (src/model/atoms.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { atomsCalibration, atomsRule, byAtom, compareAtoms, fitAtoms, simulateAtoms } from "../src/model/atoms.ts";
import { splitByStudent } from "../src/model/evaluate.ts";
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
  assert.deepEqual(split.map((p) => p.skill), ["skill1#1", "skill1#2", "skill1#3"]);
  assert.equal(split.reduce((s, p) => s + p.answers.length, 0), 20);
  const first = [...ps[0].atom.keys()].filter((i) => ps[0].atom[i] === 0);
  assert.deepEqual([...split[0].answers], first.map((i) => ps[0].answers[i]));
});

test("with one atom, BKT on each atom is BKT on the skill: the same fit, declarations and calibration", () => {
  const ps = simulateAtoms({ students: 60, skills: 2, atoms: 1, learnRate: 0.1 });
  const skill = fitRules(ps).bkt, atom = fitAtoms(ps);
  assert.deepEqual(atom("skill1#1"), skill("skill1"));
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
  const [known, , emaScore, perAtom] = c.calibration.map((x) => x.brier);
  assert.ok(known > emaScore && perAtom < emaScore, `Brier P(known) ${known}, EMA ${emaScore}, per atom ${perAtom}`);
});

test("with two atoms both meet the standard, and BKT on each atom needs fewer answers than BKT on the skill", () => {
  const { train, test: held } = splitByStudent(simulateAtoms({ students: 200, skills: 4, atoms: 2, learnRate: 0.1 }), 0.3, 1);
  const c = compareAtoms(train, held, 0.9, 50);
  assert.ok(c.skill[0].rule && c.perAtom.rule);
  assert.ok(c.perAtom.bktSaves!.estimate < 0, `per atom minus on the skill ${c.perAtom.bktSaves!.estimate}`);
});
