// The same answers at several grains (src/model/grain.ts): regraining keeps the order and folds a problem's skills
// that fall together into one observation, the primary answers are the ones every grain keeps, the comparison fits
// and judges each grain on the same held-out students and pairs the grains on the same answers, and a contrast of
// losses is the paired test's difference when it has two terms. With classes the tests are also made by resampling
// classes, and the topic grain can be set beside random groupings of the skills of the same sizes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AREAS, type SkillId } from "../src/math/practiceSkills.ts";
import type { Observation } from "../src/model/elo.ts";
import { BktModel, heldOutPredictions, logLoss, pairedLogLoss, splitByStudent } from "../src/model/evaluate.ts";
import { compareGrains, contrast, GRAINS, ONE_SKILL, primary, regrain, topicBaseline } from "../src/model/grain.ts";
import { SIM_SKILLS, simulateRandom } from "../src/model/simulate.ts";

const topicOf = (skill: string) => skill[0];
const o = (student: string, skill: string, correct: boolean, problem?: string): Observation => ({ student, skill, level: 2, correct, ...(problem === undefined ? {} : { problem }) });

test("regrain: skills to topics or to one skill, in order; a problem's skills that fall together become one observation", () => {
  const obs = [o("s", "a1", true, "p1"), o("s", "a2", true, "p1"), o("s", "b1", false, "p2"), o("s", "a1", false, "p3"), o("t", "a2", true, "p1")];
  assert.deepEqual(regrain(obs, "skill", topicOf), obs);
  assert.notEqual(regrain(obs, "skill", topicOf), obs, "a copy");
  assert.deepEqual(regrain(obs, "topic", topicOf), [o("s", "a", true, "p1"), o("s", "b", false, "p2"), o("s", "a", false, "p3"), o("t", "a", true, "p1")]);
  assert.deepEqual(regrain(obs, "one", topicOf), [o("s", ONE_SKILL, true, "p1"), o("s", ONE_SKILL, false, "p2"), o("s", ONE_SKILL, false, "p3"), o("t", ONE_SKILL, true, "p1")]);
  // Two skills of one problem in different topics stay two observations at the topic grain and become one at the coarsest.
  const apart = [o("s", "a1", true, "p1"), o("s", "b1", true, "p1")];
  assert.equal(regrain(apart, "topic", topicOf).length, 2);
  assert.equal(regrain(apart, "one", topicOf).length, 1);
  // Without problems nothing is folded.
  const bare = [o("s", "a1", true), o("s", "a2", true)];
  assert.equal(regrain(bare, "one", topicOf).length, 2);
  assert.deepEqual(primary(obs), [true, false, true, true, true]);
  assert.deepEqual(primary(bare), [true, true]);
  assert.deepEqual(GRAINS, ["skill", "topic", "one"]);
});

test("compareGrains: the same students held out at every grain, paired on the answers every grain has, the finest grain being H1's own replay", () => {
  const { observations } = simulateRandom({ students: 40, questions: 60, seed: 3 });
  const areaOf = new Map<string, string>(AREAS.flatMap((a) => (SIM_SKILLS[a] as readonly SkillId[]).map((s) => [s, a] as const)));
  const area = (skill: string) => areaOf.get(skill)!;
  const c = compareGrains(observations, area, { seed: 2, testShare: 0.25, resamples: 100, smallest: 0.01 });
  assert.deepEqual(c.grains.map((g) => g.grain), ["skill", "topic", "one"]);
  const [skill, topic, one] = c.grains;
  assert.ok(skill.skills > topic.skills && topic.skills > one.skills && one.skills === 1, `${skill.skills} > ${topic.skills} > ${one.skills}`);
  assert.equal(topic.skills, new Set(observations.map((x) => area(x.skill))).size);
  // Simulated answers name no problem, so every grain keeps every answer.
  for (const g of c.grains) assert.deepEqual(g.answers, skill.answers);
  // The finest grain is what H1 replays.
  const { train, test: held } = splitByStudent(observations, 0.25, 2);
  assert.ok(Math.abs(skill.bkt.logLoss - logLoss(heldOutPredictions(new BktModel(), train, held))) < 1e-12);
  assert.equal(skill.bkt.fits.fits, skill.skills);
  assert.ok(skill.ema.alpha > 0 && skill.ema.start > 0 && skill.ema.start < 1);
  assert.deepEqual(c.tests.map((t) => t.name), ["BKT skill against BKT one", "BKT skill against BKT topic", "BKT topic against BKT one", "EMA skill against EMA one", "EMA skill against EMA topic", "EMA topic against EMA one"]);
  for (const { test: t } of c.tests) {
    assert.equal(t.answers, skill.answers.test);
    assert.ok(t.interval[0] <= t.difference && t.difference <= t.interval[1]);
  }
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-12, `${a} ≉ ${b}`);
  close(c.tests[0].test.difference, skill.bkt.logLoss - one.bkt.logLoss);
  close(c.tests[3].test.difference, skill.ema.logLoss - one.ema.logLoss);
  const e = c.emaLosesLess;
  assert.ok(Math.abs(e.estimate - ((one.bkt.logLoss - skill.bkt.logLoss) - (one.ema.logLoss - skill.ema.logLoss))) < 1e-9);
  assert.ok(e.interval[0] <= e.estimate && e.estimate <= e.interval[1]);
  for (const g of c.grains) {
    assert.equal(g.declarations.length, 3);
    assert.ok(g.declarations[0].rule.startsWith("BKT") && g.declarations[2].rule.startsWith("streak"));
    for (const d of g.declarations) assert.ok(Number.isNaN(d.precision) && d.declared >= 0 && d.declared <= 1 && d.cost > 0);
  }
  assert.deepEqual({ seed: c.seed, testShare: c.testShare, resamples: c.resamples, smallest: c.smallest }, { seed: 2, testShare: 0.25, resamples: 100, smallest: 0.01 });
  assert.throws(() => compareGrains(observations.slice(0, 3), area, { testShare: 0.001 }), /too few students/);
});

test("with problems named, a coarser grain has fewer observations and the tests run on the primary answers only", () => {
  const obs: Observation[] = [];
  let problem = 0;
  for (let s = 0; s < 24; s++)
    for (let q = 0; q < 12; q++) {
      const skill = ["a1", "a2", "b1"][q % 3];
      const right = (s + q) % 3 !== 0;
      obs.push(o(`s${s}`, skill, right, `p${++problem}`));
      // Every fourth problem is tagged with a second skill of the same topic as well.
      if (q % 4 === 0) obs.push(o(`s${s}`, skill === "b1" ? "b2" : "a2", right, `p${problem}`));
    }
  const c = compareGrains(obs, topicOf, { seed: 1, testShare: 0.25, resamples: 100 });
  const [skill, topic, one] = c.grains;
  assert.ok(skill.answers.test > topic.answers.test && topic.answers.test >= one.answers.test);
  const shared = c.tests[0].test.answers;
  assert.equal(shared, primary(splitByStudent(obs, 0.25, 1).test).filter(Boolean).length);
  for (const { test: t } of c.tests) assert.equal(t.answers, shared);
  assert.equal(one.answers.test, shared, "the coarsest grain keeps exactly the primary answers");
});

test("a contrast of two losses is the paired test's difference; the terms must be the same answers", () => {
  const { observations } = simulateRandom({ students: 20, questions: 30, seed: 5 });
  const { train, test: held } = splitByStudent(observations, 0.3, 1);
  const a = heldOutPredictions(new BktModel(), train, held);
  const b = a.map((p) => ({ ...p, p: Math.min(0.9, p.p + 0.1) }));
  const paired = pairedLogLoss({ name: "a", predictions: a }, { name: "b", predictions: b }, { resamples: 200, seed: 1 });
  const con = contrast([[a, 1], [b, -1]], 200, 1);
  assert.ok(Math.abs(con.estimate - paired.difference) < 1e-12);
  assert.deepEqual(con.interval, paired.interval);
  assert.throws(() => contrast([[a, 1], [b.slice(1), -1]]), /same answers in the same order/);
  assert.throws(() => contrast([[a, 1], [b.map((p) => ({ ...p, correct: !p.correct })), -1]]), /same answers in the same order/);
});

test("with classes, every paired test and the contrast also resample whole classes; without, they do not", () => {
  const { observations } = simulateRandom({ students: 40, questions: 40, seed: 4 });
  const areaOf = new Map<string, string>(AREAS.flatMap((a) => (SIM_SKILLS[a] as readonly SkillId[]).map((s) => [s, a] as const)));
  const area = (skill: string) => areaOf.get(skill)!;
  const classOf = (student: string) => `class ${student.length % 3}`;
  const without = compareGrains(observations, area, { seed: 1, testShare: 0.25, resamples: 100 });
  assert.ok(without.tests.every((t) => t.byClass === undefined) && without.emaLosesLess.byClass === undefined);
  const c = compareGrains(observations, area, { seed: 1, testShare: 0.25, resamples: 100, classOf });
  for (const [i, t] of c.tests.entries()) {
    assert.deepEqual(t.test, without.tests[i].test, "the student-level test is unchanged");
    assert.equal(t.byClass!.difference, t.test.difference);
    assert.ok(t.byClass!.groups <= 3);
  }
  assert.equal(c.emaLosesLess.estimate, without.emaLosesLess.estimate);
  assert.ok(c.emaLosesLess.byClass![0] <= c.emaLosesLess.estimate && c.emaLosesLess.estimate <= c.emaLosesLess.byClass![1]);
});

test("topicBaseline: the topics' losses are compareGrains' topic grain, the random groupings keep the topics' sizes, and the share is a permutation p-value", () => {
  const { observations } = simulateRandom({ students: 40, questions: 60, seed: 3 });
  const areaOf = new Map<string, string>(AREAS.flatMap((a) => (SIM_SKILLS[a] as readonly SkillId[]).map((s) => [s, a] as const)));
  const area = (skill: string) => areaOf.get(skill)!;
  const b = topicBaseline(observations, area, { seed: 2, testShare: 0.25, partitions: 9 });
  const topic = compareGrains(observations, area, { seed: 2, testShare: 0.25, resamples: 100 }).grains[1];
  const close = (a: number, x: number) => assert.ok(Math.abs(a - x) < 1e-12, `${a} ≉ ${x}`);
  close(b.topics.bkt, topic.bkt.logLoss);
  close(b.topics.ema, topic.ema.logLoss);
  const skills = new Set(observations.map((x) => x.skill));
  assert.equal(Object.values(b.sizes).reduce((s, k) => s + k, 0), skills.size);
  assert.equal(b.random.length, 9);
  for (const model of ["bkt", "ema"] as const) {
    assert.ok(b.beaten[model] >= 0.1 && b.beaten[model] <= 1);
    assert.equal(b.beaten[model], (1 + b.random.filter((x) => x[model] <= b.topics[model]).length) / 10);
  }
  assert.deepEqual(topicBaseline(observations, area, { seed: 2, testShare: 0.25, partitions: 9 }), b, "seeded");
});
