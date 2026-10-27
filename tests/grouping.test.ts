// The grain chosen from the answers (src/model/grouping.ts): the clustered world keeps its truth straight (a cluster's
// ideas known together, learnt once and kept), grouping keeps every answer and folds a question's ideas into the units
// that hold them, one unit is BKT on the skill, the search returns a grouping of every idea once, and the measures
// count what they say.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bktStep } from "../src/model/evaluate.ts";
import {
  chooseGrouping, CLUSTER_WORLDS, judgeGrouping, pairedOverSeeds, pairsRight, practiceLosses, regroup, runGrouping, simulateClusters, unitName, type Grouping,
} from "../src/model/grouping.ts";
import { ideasOf, type IdeaFit } from "../src/model/ideas.ts";

const ideas = ideasOf("fractions");
const sorted = (g: Grouping) => g.flatMap((u) => u).sort();

test("the worlds group every idea of fractions once", () => {
  for (const [world, clusters] of Object.entries(CLUSTER_WORLDS)) assert.deepEqual(sorted(clusters), [...ideas].sort(), world);
  assert.equal(CLUSTER_WORLDS.sixteen.length, 16);
  assert.throws(() => simulateClusters([ideas.slice(1)], 1, 1, 0.1, 1), /every idea/);
});

test("simulateClusters: a cluster's ideas are known together, learnt once and kept, and the skill is known when all are", () => {
  const clusters = CLUSTER_WORLDS.three;
  const ps = simulateClusters(clusters, 30, 20, 0.1, 3);
  assert.equal(ps.length, 30);
  let learnt = 0;
  for (const p of ps) {
    assert.equal(p.skill, "fractions");
    assert.deepEqual([...p.ids], ideas);
    for (let i = 0; i < p.answers.length; i++) {
      for (const c of clusters) {
        const ks = c.map((id) => p.ideaKnown[p.ids.indexOf(id)][i]);
        assert.ok(ks.every((k) => k === ks[0]), "a cluster's ideas known together");
        if (i > 0 && p.ideaKnown[p.ids.indexOf(c[0])][i - 1] === 1) assert.equal(ks[0], 1, "kept once learnt");
        if (i > 0 && ks[0] === 1 && p.ideaKnown[p.ids.indexOf(c[0])][i - 1] === 0) learnt++;
      }
      assert.equal(p.known![i], p.ideaKnown.every((k) => k[i]) ? 1 : 0);
      if (p.gap[i] >= 0) assert.equal(p.answers[i], 0, "a recognised mistake only on a wrong answer");
    }
  }
  assert.ok(learnt > 0, "some clusters are learnt");
  // The same seed is the same class.
  assert.deepEqual(simulateClusters(clusters, 5, 20, 0.1, 3).map((p) => [...p.answers]), ps.slice(0, 5).map((p) => [...p.answers]));
});

test("regroup: a question needs each unit holding an idea it needs, once; blame and truth move to the units", () => {
  const [p] = simulateClusters(CLUSTER_WORLDS.six, 1, 30, 0.1, 5);
  const g: Grouping = [ideas.slice(0, 4), ideas.slice(4)];
  const [q] = regroup([p], g);
  assert.deepEqual(q.ids, g.map(unitName));
  assert.deepEqual(q.answers, p.answers);
  for (let i = 0; i < p.answers.length; i++) {
    const want = [...new Set(p.needs[i].map((j) => (j < 4 ? 0 : 1)))];
    assert.deepEqual(q.needs[i], want);
    assert.equal(q.gap[i], p.gap[i] < 0 ? -1 : p.gap[i] < 4 ? 0 : 1);
    for (const k of [0, 1]) assert.equal(q.ideaKnown[k][i], (k === 0 ? [0, 1, 2, 3] : [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).every((j) => p.ideaKnown[j][i]) ? 1 : 0);
  }
  // One unit per idea changes nothing but the names.
  const [same] = regroup([p], ideas.map((id) => [id]));
  assert.deepEqual(same.needs, p.needs.map((n) => [...new Set(n)]));
});

test("practiceLosses: on one unit, each answer is predicted as BKT on the skill predicts it", () => {
  const [p] = regroup(simulateClusters(CLUSTER_WORLDS.three, 1, 12, 0.1, 7), [[...ideas]]);
  const params = { init: 0.3, learn: 0.1, guess: 0.2, slip: 0.1 };
  const fit: IdeaFit = { idea: () => params, question: () => params };
  let k = params.init, sum = 0;
  for (const a of p.answers) {
    const right = k * (1 - params.slip) + (1 - k) * params.guess;
    sum -= Math.log(a ? right : 1 - right);
    k = bktStep(k, params, a === 1).known;
  }
  const [loss] = practiceLosses(fit, [p]);
  assert.ok(Math.abs(loss - sum / p.answers.length) < 1e-12);
});

test("chooseGrouping: a grouping of every idea once, the same on every run; with confirmation, kept or one unit per idea", () => {
  const train = simulateClusters(CLUSTER_WORLDS.three, 16, 12, 0.1, 2);
  const a = chooseGrouping(train);
  assert.deepEqual(sorted(a.grouping), [...ideas].sort());
  assert.deepEqual(chooseGrouping(train).grouping, a.grouping);
  const s = a.scores;
  assert.ok(s.split <= s.coarse && s.merged <= s.fine, "the splits start from the whole skill and the merges from one unit per idea, and only improve");
  assert.equal(a.confirmation, undefined);
  const b = chooseGrouping(train, true, 1, 200);
  assert.deepEqual(sorted(b.grouping), [...ideas].sort());
  if (b.confirmation) assert.deepEqual(b.grouping.length === 16, !b.confirmation.kept);
  else assert.equal(b.grouping.length, 16, "no confirmation when one unit per idea scored best");
});

test("judgeGrouping and runGrouping: a loss per test practice, and a diagnosis share between 0 and 1", () => {
  const clusters = CLUSTER_WORLDS.six;
  const all = simulateClusters(clusters, 24, 20, 0.1, 4), train = all.slice(0, 16), test = all.slice(16);
  const j = judgeGrouping(train, test, clusters, clusters);
  assert.equal(j.units, 6);
  assert.equal(j.losses.length, test.length);
  assert.ok(j.losses.every((x) => x > 0 && Number.isFinite(x)));
  assert.ok(j.diagnosis === null || (j.diagnosis >= 0 && j.diagnosis <= 1));
  assert.ok(j.precision === null || (j.precision >= 0 && j.precision <= 1));
  const r = runGrouping({ world: "three", seed: 1, students: 8, length: 10, learnRate: 0.1, test: 12 });
  for (const label of ["coarse", "fine", "true", "chosen", "confirmed"] as const) assert.equal(r.judged[label].losses.length, 12, label);
  assert.equal(r.judged.coarse.units, 1);
  assert.equal(r.judged.fine.units, 16);
});

test("pairsRight counts the pairs put together that the world puts together", () => {
  const clusters: Grouping = [["a", "b"], ["c", "d"]];
  assert.equal(pairsRight([["a", "b"], ["c"], ["d"]], clusters), 1);
  assert.equal(pairsRight([["a", "c"], ["b"], ["d"]], clusters), 0);
  assert.equal(pairsRight([["a", "b", "c"], ["d"]], clusters), 1 / 3);
  assert.ok(Number.isNaN(pairsRight([["a"], ["b"]], clusters)));
});

test("pairedOverSeeds: the mean of the seeds' means, and a constant difference has no width", () => {
  assert.deepEqual(pairedOverSeeds([[0.5, 0.5], [0.5, 0.5, 0.5]], 100), { estimate: 0.5, interval: [0.5, 0.5] });
  const { estimate, interval } = pairedOverSeeds([[0, 1], [1, 1]], 500);
  assert.equal(estimate, 0.75);
  assert.ok(interval[0] >= 0.5 && interval[1] <= 1 && interval[0] < interval[1]);
});
