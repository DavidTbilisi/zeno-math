// Skills made of ideas, asked by the generators' own questions: the world keeps its truth straight (the skill known
// when every idea is, ideas learnt once and kept, only the ideas a question needs learnt from it, a recognised mistake
// only on a wrong answer whose idea was missing), the conjunctive step is BKT's own step with one idea and leaves the
// ideas a question did not need alone, blame goes to one idea, carrying starts a skill where the last left its ideas,
// and the diagnosis counts the one missing idea found (src/model/ideas.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { bktStep, splitByStudent } from "../src/model/evaluate.ts";
import {
  carriedIdeas, compareIdeas, conjunctiveStep, diagnosis, fitIdeas, gapIdea, IDEA_SKILLS, ideasCalibration, ideasOf, ideasRule, simulateIdeas, type IdeaFit, type IdeaPractice,
} from "../src/model/ideas.ts";

const params = { init: 0.3, learn: 0.1, guess: 0.2, slip: 0.1 };
const fit: IdeaFit = { idea: () => params, question: () => params };
const step = (k: number, right: boolean) => bktStep(k, params, right).known;
const practice = (student: string, skill: string, ids: string[], needs: number[][], answers: number[], gap?: number[]): IdeaPractice => ({
  student, skill, ids, needs, answers: Uint8Array.from(answers), known: new Uint8Array(answers.length),
  gap: Int8Array.from(gap ?? answers.map(() => -1)), ideaKnown: ids.map(() => new Uint8Array(answers.length)),
});

test("each skill's ideas are those its questions can need: with the forms, fractions asks for every idea of the graph", () => {
  assert.deepEqual(ideasOf("times"), ["addWhole", "multiplyFacts", "multiplyLong"]);
  assert.deepEqual(ideasOf("hcf"), ["addWhole", "multiplyFacts", "multiplyLong", "divideExact", "hcf", "lcm"]);
  assert.equal(ideasOf("fractions").length, 16);
  assert.ok(ideasOf("fractions").includes("toMixed"));
  assert.equal(gapIdea("addAcross"), "addSub");
  assert.equal(gapIdea("flipFirst"), "divide", "a missing connection is blamed on its far end");
  assert.equal(gapIdea("sign"), undefined);
});

test("the ideas world: the skill known when every idea is, ideas kept once learnt, only the needed ones learnt, mistakes only where their idea was missing", () => {
  const ps = simulateIdeas({ students: 20, length: 12, learnRate: 0.1, trapRate: 1 });
  assert.equal(ps.length, 60);
  assert.deepEqual(ps.slice(0, 3).map((p) => p.skill), [...IDEA_SKILLS]);
  let gaps = 0;
  for (const p of ps) {
    assert.deepEqual(p.ids, ideasOf(p.skill as never));
    for (let i = 0; i < p.answers.length; i++) {
      assert.ok(p.needs[i].length > 0 && p.needs[i].every((j) => j < p.ids.length));
      assert.equal(p.known[i], p.ideaKnown.every((k) => k[i]) ? 1 : 0);
      if (i) {
        for (const k of p.ideaKnown) assert.ok(k[i] >= k[i - 1], "an idea once known stays known");
        p.ideaKnown.forEach((k, j) => !p.needs[i].includes(j) && assert.equal(k[i], k[i - 1], "only a needed idea can be learnt"));
      }
      const g = p.gap[i];
      if (g >= 0) {
        gaps++;
        assert.equal(p.answers[i], 0, "a recognised mistake is a wrong answer");
        assert.ok(p.needs[i].includes(g), "on a question that needs the idea");
        if (i) assert.equal(p.ideaKnown[g][i - 1], 0, "whose idea was missing");
        assert.equal(p.skill, "fractions", "only fractions has recognised mistakes");
      }
    }
  }
  assert.ok(gaps > 5, `${gaps} recognised mistakes`);
  assert.ok(simulateIdeas({ students: 20, length: 12, trapRate: 0 }).every((p) => p.gap.every((g) => g === -1)));
  // A learner keeps an idea from skill to skill: the times tables known at the end of times are known all through hcf and fractions.
  for (let s = 0; s < ps.length; s += 3) {
    const facts = (p: IdeaPractice) => p.ideaKnown[p.ids.indexOf("multiplyFacts")];
    if (facts(ps[s]).at(-1)) for (const later of [ps[s + 1], ps[s + 2]]) assert.ok(facts(later).every((k) => k === 1));
  }
  assert.deepEqual(simulateIdeas({ students: 4, length: 5 }), simulateIdeas({ students: 4, length: 5 }));
});

test("the conjunctive step is BKT's step with one idea, or with the others certainly known, and leaves ideas not needed alone", () => {
  const one = [0.3];
  conjunctiveStep(one, [0], () => 0.1, params, true);
  assert.equal(one[0], step(0.3, true));
  const wrong = [0.3];
  conjunctiveStep(wrong, [0], () => 0.1, params, false);
  assert.equal(wrong[0], step(0.3, false));
  const sure = [1, 0.3, 0.7];
  conjunctiveStep(sure, [0, 1], () => 0.1, params, true);
  assert.deepEqual(sure, [1, step(0.3, true), 0.7]);
  // Two uncertain ideas: a right answer raises both, a wrong one lowers both, by less than either alone would move.
  const up = [0.3, 0.5], down = [0.3, 0.5];
  conjunctiveStep(up, [0, 1], () => 0, params, true);
  conjunctiveStep(down, [0, 1], () => 0, params, false);
  assert.ok(up[0] > 0.3 && up[1] > 0.5 && down[0] < 0.3 && down[1] < 0.5);
  const alone = { ...params, learn: 0 };
  assert.ok(up[0] < bktStep(0.3, alone, true).known, "shared credit is lighter than sole credit");
  assert.ok(down[0] > bktStep(0.3, alone, false).known, "shared blame is lighter than sole blame");
});

test("blame puts a recognised mistake on its one idea; the rule declares when every idea is at the threshold", () => {
  const p = practice("s", "fractions", ["a", "b"], [[0, 1]], [0], [1]);
  const blamed = ideasRule(fit, 0.5, { blame: true }), together = ideasRule(fit, 0.5);
  assert.ok(blamed.name.startsWith("BKT per idea, blamed θ"));
  const known = [0.3, 0.3], both = [0.3, 0.3];
  // The same steps the rules take, by hand.
  known[1] = step(0.3, false);
  conjunctiveStep(both, [0, 1], () => 0.1, params, false);
  assert.ok(known[0] === 0.3 && known[1] < 0.3);
  // Shared over two ideas, the blame is so light that learning from the question outweighs it.
  assert.ok(both[0] === both[1] && both[1] > known[1] && both[1] > 0.3);
  assert.equal(blamed.declare(p.skill, p.answers, p), null);
  assert.equal(together.declare(p.skill, p.answers, p), null);
  const right = practice("s", "fractions", ["a", "b"], [[0], [1], [0, 1]], [1, 1, 1]);
  assert.equal(ideasRule(fit, step(0.3, true)).declare(right.skill, right.answers, right), 2);
  assert.equal(ideasRule(fit, 0.99).declare(right.skill, right.answers, right), null);
  assert.equal(ideasCalibration(fit, [right]).n, 3);
});

test("carried starts each idea where the student's earlier skills left it, and at its init when never met", () => {
  const one = practice("s", "times", ["a", "b"], [[0], [1]], [1, 1]);
  const two = practice("s", "hcf", ["b", "c"], [[0]], [1]);
  const other = practice("t", "hcf", ["b", "c"], [[0]], [1]);
  const starts = carriedIdeas(fit, [one, two, other]);
  assert.deepEqual(starts.get(one), [0.3, 0.3]);
  assert.deepEqual(starts.get(two), [step(0.3, true), 0.3]);
  assert.deepEqual(starts.get(other), [0.3, 0.3], "another student starts afresh");
  const θ = step(step(0.3, true), true);
  const rule = ideasRule(fit, θ, { starts });
  assert.ok(rule.name.startsWith("BKT per idea, carried"));
  const onlyB = practice("s", "fractions", ["b"], [[0]], [1]);
  assert.equal(ideasRule(fit, θ, { starts: carriedIdeas(fit, [one, onlyB]) }).declare("fractions", onlyB.answers, onlyB), 1);
  assert.equal(ideasRule(fit, θ).declare("fractions", onlyB.answers, onlyB), null);
});

test("the diagnosis counts the moments one idea is missing at which it has the lowest P(known), ties as misses", () => {
  const p = practice("s", "fractions", ["a", "b"], [[0], [0, 1]], [1, 0]);
  p.ideaKnown[0].fill(1);
  const d = diagnosis(fit, [p]);
  assert.deepEqual(d, { moments: 2, right: 1, chance: 0.5 });
  const tie = practice("s", "fractions", ["a", "b"], [[0, 1]], [1]);
  tie.ideaKnown[0].fill(1);
  assert.equal(diagnosis(fit, [tie]).right, 0);
  const none = practice("s", "fractions", ["a", "b"], [[0, 1]], [1]);
  assert.ok(Number.isNaN(diagnosis(fit, [none]).right));
});

test("on fractions, with the forms that ask for one idea alone, BKT on each idea finds the missing idea far above chance; nothing decides in 30 answers", () => {
  const { train, test: held } = splitByStudent(simulateIdeas({ students: 150, learnRate: 0.1 }), 0.2, 1);
  const c = compareIdeas(train, held, "fractions", 0.9, 50);
  assert.equal(c.onSkill[0].rule, null, "BKT on the skill never meets the standard");
  assert.ok(c.onSkill[1].judgement!.declared < 0.2, "the EMA meets it only by hardly ever declaring");
  const [afresh, blamed, carried] = c.diagnosis;
  assert.ok(afresh.moments > 100 && afresh.right > 5 * afresh.chance, `afresh finds the missing idea ${afresh.right} of the time, chance ${afresh.chance}`);
  assert.ok(blamed.right >= afresh.right && carried.right > blamed.right, `blamed ${blamed.right}, carried ${carried.right}`);
  // Before the forms (commit 7dbd426) afresh was at chance and carried found it one time in seven.
  const [, , , perIdea, , kept] = c.calibration.map((x) => x.brier);
  assert.ok(kept < perIdea && perIdea < c.calibration[2].brier, "BKT on each idea is better calibrated than the EMA");
});

test("on hcf, carried from times, BKT on each idea is better calibrated and finds the missing idea; afresh does not", () => {
  const { train, test: held } = splitByStudent(simulateIdeas({ students: 150, learnRate: 0.1 }), 0.2, 1);
  const c = compareIdeas(train, held, "hcf", 0.9, 50);
  assert.ok(c.carryingSaves!.estimate < 0, `carried minus afresh ${c.carryingSaves!.estimate} ${c.carryingSaves!.interval}`);
  const [, , , afresh, , carried] = c.calibration.map((x) => x.brier);
  assert.ok(carried < afresh, `Brier carried ${carried}, afresh ${afresh}`);
  assert.ok(c.diagnosis[2].right > 0.5 && c.diagnosis[0].right < c.diagnosis[0].chance, `carried ${c.diagnosis[2].right}, afresh ${c.diagnosis[0].right}`);
  // On times, every question needs all three ideas: BKT on the skill meets the standard and BKT on each idea is no cheaper.
  const t = compareIdeas(train, held, "times", 0.9, 50);
  assert.ok(t.onSkill[0].rule && t.perIdea.bktSaves!.estimate >= 0, `per idea minus on the skill ${t.perIdea.bktSaves?.estimate}`);
});

test("fitting each idea on the answers of the questions that needed it, within a skill or across skills", () => {
  const ps = simulateIdeas({ students: 30, length: 10, learnRate: 0.1 });
  const afresh = fitIdeas(ps), across = fitIdeas(ps, true);
  for (const id of ideasOf("fractions")) for (const f of [afresh, across]) assert.ok(f(id).init > 0 && f(id).learn > 0);
  // An idea no question needed gets the pooled fit.
  assert.deepEqual(afresh("never"), afresh("nothing"));
});
