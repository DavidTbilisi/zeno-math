// Skills made of atoms: the world keeps its truth straight, BKT on each atom is BKT on the skill when there is one
// atom, and with several atoms BKT on the skill fails H2's standard and loses its calibration while BKT on each atom
// keeps both. When skills share atoms, what a learner knows of an atom goes with them from skill to skill, and BKT on
// each atom carried along needs fewer answers than started afresh in every skill. Modelled finer than the learner
// (split), the answers and the truth stay the same, each component takes its atom's truth, and BKT on each component
// needs more answers for no better precision; fits at the grid's edge and threshold stability are counted
// (src/model/atoms.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { atBound, atEdge, atomOf, atomsCalibration, atomsRule, byAtom, carried, compareAtoms, dealAtoms, fitAtoms, fitCarried, fitShares, simulateAtoms, stability, type AtomPractice } from "../src/model/atoms.ts";
import { bktStep, splitByStudent } from "../src/model/evaluate.ts";
import { conjunctiveStep } from "../src/model/ideaState.ts";
import { bktRule, emaRule, fitRules, judge, masteryCalibration, streakRule, usualRules } from "../src/model/mastery.ts";

test("the atoms world: one atom asked per question, atoms learnt once and kept, the skill known when all its atoms are", () => {
  const ps = simulateAtoms({ students: 30, skills: 3, atoms: 3, length: 20 });
  assert.equal(ps.length, 90);
  for (const p of ps) {
    assert.ok(p.needs.every((n) => n.length === 1 && n[0] < 3));
    for (let i = 0; i < p.answers.length; i++) {
      assert.equal(p.known[i], p.atomKnown.every((k) => k[i]) ? 1 : 0);
      if (i) for (const k of p.atomKnown) assert.ok(k[i] >= k[i - 1], "an atom once known stays known");
      // Only the atom asked for can be learnt from a question.
      if (i) p.atomKnown.forEach((k, a) => !p.needs[i].includes(a) && assert.equal(k[i], k[i - 1]));
    }
  }
  assert.deepEqual(simulateAtoms({ students: 5, skills: 2 }), simulateAtoms({ students: 5, skills: 2 }));
  // Split by atom, every answer lands with the atom it asked for, in order.
  const split = byAtom(ps.slice(0, 1));
  assert.deepEqual(split.map((p) => p.skill), ["atom1", "atom2", "atom3"]);
  assert.equal(split.reduce((s, p) => s + p.answers.length, 0), 20);
  const first = [...ps[0].needs.keys()].filter((i) => ps[0].needs[i][0] === 0);
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
    student, skill, ids, needs: atom.map((a) => [a]), answers: Uint8Array.from(answers), known: new Uint8Array(answers.length), atomKnown: ids.map(() => new Uint8Array(answers.length)), split: 1,
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

test("modelled finer than the learner: the same answers and truth, each component its atom's truth, more answers for no better precision", () => {
  const whole = simulateAtoms({ students: 40, skills: 3, atoms: 2, learnRate: 0.1 });
  const halves = simulateAtoms({ students: 40, skills: 3, atoms: 2, learnRate: 0.1, split: 2 });
  assert.equal(halves.length, whole.length);
  halves.forEach((h, i) => {
    const w = whole[i];
    assert.deepEqual([h.answers, h.known, h.atomKnown], [w.answers, w.known, w.atomKnown], "the world is the same at every split");
    assert.deepEqual(h.ids, ["atom1.1", "atom1.2", "atom2.1", "atom2.2"].map((id) => id.replace(/atom(\d)/, (_, n) => `atom${Number(n) + 2 * (Number(h.skill.slice(5)) - 1)}`)));
    assert.equal(h.split, 2);
    for (let q = 0; q < h.answers.length; q++) assert.equal(atomOf(h, h.needs[q][0]), w.needs[q][0], "a component's question is its atom's question");
  });
  // Split by component: each component's practice carries its atom's truth, and the two halves together are the atom.
  const [a1, a2] = byAtom(halves.slice(0, 1));
  const [whole1] = byAtom(whole.slice(0, 1));
  assert.deepEqual([a1.skill, a2.skill], ["atom1.1", "atom1.2"]);
  assert.equal(a1.answers.length + a2.answers.length, whole1.answers.length);
  const knownCount = (p: { known?: Uint8Array }) => p.known!.filter((k) => k === 1).length;
  assert.equal(knownCount(a1) + knownCount(a2), knownCount(whole1), "the halves' truth is the atom's truth");
  assert.throws(() => simulateAtoms({ split: 0 }), /split must be a whole number above 0/);
  assert.throws(() => simulateAtoms({ split: 1.5 }), /split must be a whole number above 0/);
  // Over-split, BKT per component is dearer than at the learner's grain and no more precise, on the same held-out practices.
  const at = (split: number) => {
    const { train, test: held } = splitByStudent(simulateAtoms({ students: 200, skills: 4, atoms: 2, learnRate: 0.1, split }), 0.3, 1);
    return compareAtoms(train, held, 0.9, 50);
  };
  const one = at(1), two = at(2);
  assert.deepEqual(two.skill, one.skill, "BKT on the skill, EMA and streak see the same answers whatever the split");
  assert.ok(two.perAtom.judgement!.cost > one.perAtom.judgement!.cost, `per component ${two.perAtom.judgement!.cost} > per atom ${one.perAtom.judgement!.cost}`);
  assert.ok(two.perAtom.judgement!.precision <= one.perAtom.judgement!.precision + 0.05);
  assert.equal(two.fits.perAtom.fits, 2 * one.fits.perAtom.fits);
  assert.equal(one.fits.skill.fits, 4);
  assert.equal(one.stability.length, 4);
  assert.deepEqual(one.stability.map((s) => s.method), ["BKT on the skill", "EMA", "BKT per atom", "BKT per atom, carried"]);
  for (const s of one.stability) if (s.onTrain !== null) assert.ok(s.precisionOnTest! >= 0 && s.precisionOnTest! <= 1);
});

test("fits at the grid's edge, and whether a training threshold transfers", () => {
  assert.ok(atBound({ init: 0.5, learn: 0.1, guess: 0.3, slip: 0.1 }) && atBound({ init: 0.5, learn: 0.1, guess: 0.1, slip: 0.3 }));
  assert.ok(!atBound({ init: 0.05, learn: 0.01, guess: 0.25, slip: 0.25 }));
  assert.ok(atEdge({ init: 0.05, learn: 0.1, guess: 0.1, slip: 0.1 }) && atEdge({ init: 0.95, learn: 0.1, guess: 0.1, slip: 0.1 }));
  assert.ok(atEdge({ init: 0.5, learn: 0.01, guess: 0.1, slip: 0.1 }) && atEdge({ init: 0.5, learn: 0.3, guess: 0.1, slip: 0.1 }));
  assert.ok(!atEdge({ init: 0.5, learn: 0.1, guess: 0.1, slip: 0.1 }));
  assert.deepEqual(fitShares([{ init: 0.5, learn: 0.1, guess: 0.3, slip: 0.1 }, { init: 0.05, learn: 0.1, guess: 0.1, slip: 0.1 }, { init: 0.5, learn: 0.1, guess: 0.1, slip: 0.1 }]), { fits: 3, atBound: 1 / 3, atEdge: 2 / 3 });
  assert.ok(Number.isNaN(fitShares([]).atBound));
  const ps = simulateAtoms({ students: 120, skills: 3, atoms: 1, learnRate: 0.1 });
  const { train, test: held } = splitByStudent(ps, 0.3, 1);
  const fitted = fitRules(train);
  const thresholds = [0.6, 0.8, 0.95, 0.99];
  const s = stability("BKT", (t) => bktRule(fitted.bkt, t), thresholds, train, held, 0.9);
  assert.ok(s.onTrain !== null && thresholds.includes(s.onTrain) && s.onTest !== null && thresholds.includes(s.onTest));
  assert.ok(s.precisionOnTest! > 0.5);
  // A target nobody meets: no threshold on either side, no precision.
  assert.deepEqual(stability("EMA", (t) => emaRule(fitted.ema, t), thresholds, train, held, 1.01), { method: "EMA", onTrain: null, onTest: null, precisionOnTest: null });
  // The same practices on both sides choose the same threshold.
  const same = stability("streak", (n) => streakRule(n), [1, 2, 3, 4, 5], train, train, 0.9);
  assert.equal(same.onTrain, same.onTest);
});

test("several atoms a question: distinct atoms drawn, right only when all are known, each of them may be learnt, the conjunctive step with the skill's guess and slip", () => {
  const ps = simulateAtoms({ students: 40, skills: 3, atoms: 4, perQuestion: 2, learnRate: 0.1 });
  let rightUnknown = 0, rightKnown = 0, askedUnknown = 0, askedKnown = 0;
  for (const p of ps) {
    for (let i = 0; i < p.answers.length; i++) {
      const n = p.needs[i];
      assert.ok(n.length === 2 && n[0] !== n[1] && n.every((a) => a < 4));
      if (i) p.atomKnown.forEach((k, a) => !n.includes(a) && assert.equal(k[i], k[i - 1], "only an asked atom can be learnt"));
      // Right (but for a slip) only when every asked atom was known before the answer.
      const before = (a: number) => (i ? p.atomKnown[a][i - 1] : NaN);
      if (i) {
        const all = n.every((a) => before(a) === 1);
        if (all) (askedKnown++, p.answers[i] && rightKnown++);
        else (askedUnknown++, p.answers[i] && rightUnknown++);
      }
    }
  }
  assert.ok(rightKnown / askedKnown > 0.8 && rightUnknown / askedUnknown < 0.35, `${rightKnown / askedKnown} right when all known, ${rightUnknown / askedUnknown} when not`);
  // The first draw is the one-atom world's: the same answers follow where the second atom was known too.
  assert.throws(() => simulateAtoms({ atoms: 2, perQuestion: 3 }), /perQuestion must be a whole number from 1 to the 2 atoms/);
  assert.throws(() => simulateAtoms({ perQuestion: 0 }), /perQuestion must be/);
  // The rule on a two-atom question takes the conjunctive step with the question's guess and slip, and declares when both atoms reach the threshold.
  const params = { init: 0.3, learn: 0.1, guess: 0.2, slip: 0.1 };
  const question = { guess: 0.25, slip: 0.05 };
  const p: AtomPractice = { student: "s", skill: "k", ids: ["a", "b"], needs: [[0, 1], [0, 1]], answers: Uint8Array.from([1, 1]), known: new Uint8Array(2), atomKnown: [new Uint8Array(2), new Uint8Array(2)], split: 1 };
  const known = [0.3, 0.3];
  conjunctiveStep(known, [0, 1], () => 0.1, question, true);
  assert.equal(atomsRule(() => params, known[0], undefined, () => question).declare("k", p.answers, p), 1);
  assert.equal(atomsRule(() => params, known[0] + 1e-9, undefined, () => question).declare("k", p.answers, p), 2);
  // Without the question's guess and slip the first atom's own serve.
  const own = [0.3, 0.3];
  conjunctiveStep(own, [0, 1], () => 0.1, params, true);
  assert.equal(atomsRule(() => params, own[0]).declare("k", p.answers, p), 1);
  assert.deepEqual(carried(() => params, [p], () => question).get(p), [0.3, 0.3]);
  // Split by atom, a two-atom question's answer lands with both.
  assert.deepEqual(byAtom([p]).map((x) => [...x.answers]), [[1, 1], [1, 1]]);
  // The whole comparison runs with several atoms a question, and judges every method at the usual thresholds too.
  const { train, test: held } = splitByStudent(ps, 0.3, 1);
  const c = compareAtoms(train, held, 0.9, 50);
  const fitted = fitRules(train);
  assert.equal(c.usual.length, 5);
  assert.deepEqual(c.usual.map((u) => u.rule.replace(/θ .*$/, "θ")), ["BKT θ", "EMA θ", "streak 3", "BKT per atom θ", "BKT per atom, carried θ"]);
  assert.deepEqual(c.usual[0], judge(bktRule(fitted.bkt, 0.95), held));
  assert.deepEqual(c.usual[2], judge(streakRule(3), held));
  for (const u of c.usual) assert.ok(u.declared >= 0 && u.declared <= 1 && u.cost > 0 && (Number.isNaN(u.precision) || u.precision <= 1));
  // When every question asks for every atom, the skill is one unit again: BKT on the skill meets the standard.
  const whole = splitByStudent(simulateAtoms({ students: 200, skills: 4, atoms: 3, perQuestion: 3, learnRate: 0.1 }), 0.3, 1);
  const w = compareAtoms(whole.train, whole.test, 0.9, 50);
  assert.ok(w.skill[0].rule, "BKT on the skill meets the standard when a question needs every atom");
});

test("the usual rules: BKT at 0.95, the EMA at the streak rule's cost on the training practices, the streak rule", () => {
  const { train, test: held } = splitByStudent(simulateAtoms({ students: 60, skills: 2, atoms: 1, learnRate: 0.1 }), 0.3, 1);
  const fitted = fitRules(train);
  const rules = usualRules(fitted, train);
  assert.deepEqual(rules.map((r) => r.name.replace(/θ .*$/, "θ")), ["BKT θ", "EMA θ", "streak 3"]);
  assert.equal(rules[0].name, "BKT θ 0.95");
  assert.ok(Math.abs(judge(rules[1], train).cost - judge(streakRule(3), train).cost) < 0.5, "the EMA costs what the streak rule costs");
  assert.equal(usualRules(fitted, train, 4)[2].name, "streak 4");
  const c = compareAtoms(train, held, 0.9, 50);
  assert.deepEqual(c.usual.slice(0, 3), rules.map((r) => judge(r, held)));
});
