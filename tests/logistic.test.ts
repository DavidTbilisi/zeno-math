// The logistic student model (src/model/logistic.ts): what it knows before each answer, a difficulty per question
// where the data names its questions, and that it learns from training students what predicts held-out ones.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Observation } from "../src/model/elo.ts";
import { evaluateHeldOut, splitByStudent } from "../src/model/evaluate.ts";
import { LogisticModel, logisticRule, logisticScores } from "../src/model/logistic.ts";
import { agreement, practicesFrom, rightAfter, streakRule } from "../src/model/mastery.ts";
import { rng } from "../src/model/random.ts";

const answer = (student: string, skill: string, correct: boolean, item?: string): Observation => ({ student, skill, level: 2, correct, ...(item ? { item } : {}) });
const value = (m: LogisticModel, o: Observation, key: string) => m.features(o).find(([k]) => k === key)?.[1];

test("the features: counts on the skill, its area and overall, the recency record, and the gap since the skill was last practised", () => {
  const m = new LogisticModel({ areaOf: (k) => (k === "z" ? "other" : "same") });
  const next = answer("s", "x", true, "q1");
  assert.equal(value(m, next, "new"), 1, "a skill not practised yet");
  assert.equal(value(m, next, "q:q1"), 1);
  for (const o of [answer("s", "x", true), answer("s", "x", false), answer("s", "y", true), answer("s", "z", false)]) m.update(o);
  assert.equal(value(m, next, "sr:x"), Math.log1p(1));
  assert.equal(value(m, next, "sw:x"), Math.log1p(1));
  assert.equal(value(m, next, "ar:same"), Math.log1p(2), "x and y share an area");
  assert.equal(value(m, next, "aw:same"), Math.log1p(1));
  assert.equal(value(m, next, "tr"), Math.log1p(2));
  assert.equal(value(m, next, "tw"), Math.log1p(2));
  assert.equal(value(m, next, "gap"), Math.log1p(2), "two answers elsewhere since x");
  assert.equal(value(m, next, "new"), undefined);
  // +1 then −1, each replacing 0.3 of the record.
  assert.ok(Math.abs(value(m, next, "sn:x")! - (0.7 * 0.3 - 0.3)) < 1e-12);
  assert.equal(value(m, answer("t", "x", true), "tr"), 0, "another student starts from nothing");
  const plain = new LogisticModel({ recency: 0, items: false });
  assert.equal(value(plain, next, "sn"), undefined);
  assert.equal(value(plain, next, "q:q1"), undefined);
  assert.equal(value(new LogisticModel(), answer("s", "x", true), "ar:other"), 0, "an unknown skill has Zeno's catch-all area");
});

/** Students answering two questions of one skill, one easy and one hard, with their abilities spread out. */
function twoQuestions(students: number, seed: number) {
  const r = rng(seed);
  const os: Observation[] = [];
  for (let s = 0; s < students; s++) {
    const ability = 2 * r.next() - 1;
    for (let k = 0; k < 6; k++) {
      const item = r.next() < 0.5 ? "easy" : "hard";
      const p = 1 / (1 + Math.exp(-(ability + (item === "easy" ? 1.5 : -1.5))));
      os.push(answer(`s${s}`, "x", r.next() < p, item));
    }
  }
  return os;
}

test("a question gets a difficulty of its own, which helps on students it never saw; without one, only the skill's", () => {
  const { train, test: held } = splitByStudent(twoQuestions(400, 1), 0.25, 1);
  const withItems = new LogisticModel();
  const without = new LogisticModel({ items: false }, "logistic, no question difficulty");
  assert.equal(without.name, "logistic, no question difficulty");
  const a = evaluateHeldOut(withItems, train, held);
  const b = evaluateHeldOut(without, train, held);
  assert.ok(withItems.weight("q:easy") - withItems.weight("q:hard") > 2, "the easy question is easier");
  assert.equal(without.weight("q:easy"), 0);
  assert.ok(a.logLoss < b.logLoss - 0.05 && a.auc > b.auc + 0.1, `${a.logLoss} against ${b.logLoss}`);
  assert.ok(a.logLoss < Math.log(2) - 0.1, "better than a coin");
});

test("a question no training student saw starts at its skill's difficulty and moves with its answers, unless the step is 0", () => {
  const train = twoQuestions(100, 2);
  const moving = new LogisticModel();
  const fixed = new LogisticModel({ itemStep: 0 });
  moving.fit(train);
  fixed.fit(train);
  const fresh = answer("new", "x", false, "unseen");
  assert.equal(moving.weight("q:unseen"), 0);
  const { item: _, ...unnamed } = fresh;
  assert.equal(moving.predict(fresh), moving.predict(unnamed), "the same as an answer naming no question");
  const before = moving.predict(fresh);
  for (let i = 0; i < 5; i++) (moving.update(answer(`n${i}`, "x", false, "unseen")), fixed.update(answer(`n${i}`, "x", false, "unseen")));
  assert.ok(moving.weight("q:unseen") < -0.5, "five wrong answers make it harder");
  assert.equal(fixed.weight("q:unseen"), 0);
  assert.ok(moving.predict(answer("other", "x", true, "unseen")) < before);
});

test("the fit is the same on every run with the same seed, and learns that right answers on a skill predict more", () => {
  const train = twoQuestions(150, 3);
  const a = new LogisticModel(), b = new LogisticModel();
  a.fit(train);
  b.fit(train);
  for (const key of ["b", "e:x:2", "sr:x", "sw:x", "q:easy", "gap", "new"]) assert.equal(a.weight(key), b.weight(key), key);
  assert.ok(a.weight("sr:x") > a.weight("sw:x"));
  // Fitting forgets the training students' records: a training student predicted afterwards starts from nothing.
  assert.equal(value(a, answer("s0", "x", true), "tr"), 0);
});

test("as a mastery rule: a score after every held-out answer, from the answers already given on every skill", () => {
  const train = twoQuestions(200, 4);
  const held = [answer("a", "x", true, "easy"), answer("b", "x", false, "hard"), answer("a", "y", true), answer("a", "x", true, "hard"), answer("b", "x", false, "easy")];
  const scores = logisticScores(train, held, { areaOf: () => "all" });
  assert.deepEqual([...scores.keys()], ["a\u0000x", "b\u0000x", "a\u0000y"]);
  const [a1, a2] = scores.get("a\u0000x")!, [b1, b2] = scores.get("b\u0000x")!;
  assert.ok(a2 > a1 && b2 < b1 && a1 > b1, "right answers raise the score and wrong ones lower it");
  // The score after a's first answer on x is the same whatever comes later: it uses only the answers before.
  assert.equal(logisticScores(train, held.slice(0, 1), { areaOf: () => "all" }).get("a\u0000x")![0], a1);
  const practices = practicesFrom(held);
  const rule = logisticRule(scores, (a1 + a2) / 2);
  assert.equal(rule.name, `logistic θ ${Number(((a1 + a2) / 2).toFixed(4))}`);
  assert.deepEqual(practices.map((p) => rule.declare(p.skill, p.answers, p)), [2, null, scores.get("a\u0000y")![0] >= (a1 + a2) / 2 ? 1 : null]);
  assert.equal(logisticRule(scores, 0).declare("x", Uint8Array.of(1), { student: "nobody", skill: "x", answers: Uint8Array.of(1) }), null, "no scores, no declaration");
  assert.throws(() => rule.declare("x", Uint8Array.of(1)), /needs the practice/);
  // H3's comparisons pass each practice to the rule.
  assert.equal(rightAfter(logisticRule(scores, 0), practices).practices, 2);
  assert.equal(agreement(logisticRule(scores, 0), streakRule(1), practices).both, 2 / 3, "b never answers x right");
});
