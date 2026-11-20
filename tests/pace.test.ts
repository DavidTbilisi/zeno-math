// Relative response time (issue #63, src/model/pace.ts): the question's norm, the three-layer model, the speed-qualified
// EMA rule and the change of pace for the teacher. The ASSISTments verdict comes from npm run pace, not from here.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Observation } from "../src/model/elo.ts";
import { emaRule } from "../src/model/mastery.ts";
import {
  adopted, classPace, explained, fitNorms, fitPace, ITEM_MIN, pacedPractices, paceJump, paceRows, predictPace, relative, speedEmaLogLoss, speedEmaRule,
} from "../src/model/pace.ts";

const obs = (student: string, ms: number | undefined, extra: Partial<Observation> = {}): Observation => ({ student, skill: "s", level: 2, correct: true, ms, ...extra });

test("a time is measured against its question's norm, or its skill's when the question has too few answers, and unusable times are NaN", () => {
  const train = [
    ...Array.from({ length: ITEM_MIN }, (_, i) => obs(`u${i}`, 10_000, { item: "a" })),
    ...Array.from({ length: 3 }, (_, i) => obs(`v${i}`, 40_000, { item: "b" })),
  ];
  const norms = fitNorms(train);
  assert.equal(norms.item.size, 1, "b has too few answers for its own norm");
  assert.ok(Math.abs(relative(norms, obs("x", 20_000, { item: "a" })) - Math.log(2)) < 1e-12, "twice a's time is +ln 2");
  assert.ok(Math.abs(relative(norms, obs("x", 10_000, { item: "b" })) - 0) < 1e-12, "b falls back to the skill's median, 10 s");
  for (const ms of [undefined, 50, 4_000_000, NaN]) assert.ok(Number.isNaN(relative(norms, obs("x", ms, { item: "a" }))), String(ms));
});

test("the layers follow a student's own pace, and the fit finds the weight of a layer that predicts it", () => {
  const norms = fitNorms([obs("n", 10_000)]);
  // Two students, one always twice the norm, one always half: the student layer predicts every answer after the first.
  const all = Array.from({ length: 30 }, (_, i) => [obs("slow", 20_000, { skill: `k${i % 3}` }), obs("fast", 5_000, { skill: `k${i % 3}` })]).flat();
  const rows = paceRows(all, norms, () => "area");
  assert.equal(rows.length, 58, "each student's first timed answer has nothing before it");
  assert.equal(rows[0].position, 1);
  const w = fitPace(rows, [0], false);
  assert.ok(Math.abs(w.layers[0] - 1) < 1e-6 && Math.abs(w.constant) < 1e-6);
  assert.ok(Math.abs(explained(rows, (r) => predictPace(w, r)) - 1) < 1e-9);
});

test("the speed-qualified EMA with every weight 1 is the plain EMA, and a fast wrong answer weighs as told", () => {
  const p = { alpha: 0.3, start: 0.4 };
  const norms = fitNorms([obs("n", 10_000)]);
  const answers = [0, 1, 1, 0, 1, 1, 1, 1].map((c, i) => obs("u", i % 2 ? 2_000 : 30_000, { correct: c === 1 }));
  const [pr] = pacedPractices(answers, norms);
  for (const t of [0.5, 0.7, 0.8])
    assert.equal(speedEmaRule(p, t, { fastRight: 1, fastWrong: 1 }).declare("s", pr.answers, pr), emaRule(p, t).declare("s", pr.answers, pr));
  // Every right answer fast and credited ×2 declares sooner than the plain EMA.
  const fastRight = speedEmaRule(p, 0.8, { fastRight: 2, fastWrong: 1 }).declare("s", pr.answers, pr)!;
  assert.ok(fastRight < emaRule(p, 0.8).declare("s", pr.answers, pr)!);
  assert.ok(Number.isFinite(speedEmaLogLoss([pr], p, { fastRight: 1, fastWrong: 0.5 })));
});

test("the verdict needs a gain of a point with its interval above zero", () => {
  assert.equal(adopted(0.012, [0.002, 0.02]), true);
  assert.equal(adopted(0.009, [0.002, 0.02]), false);
  assert.equal(adopted(0.02, [-0.001, 0.04]), false);
});

test("a change of pace: five answers set against at least ten before, at a factor of two", () => {
  const steady = new Array(14).fill(0);
  assert.equal(paceJump([...steady, Math.log(0.1)]), null, "fourteen answers are too few");
  assert.equal(paceJump([...steady, 0, 0, 0, 0, -Math.log(1.9)]), null, "not two times");
  const j = paceJump([...new Array(10).fill(0), ...new Array(5).fill(-Math.log(4))])!;
  assert.equal(j.direction, "faster");
  assert.ok(Math.abs(j.factor - 4) < 1e-9);
  assert.equal(paceJump([...new Array(10).fill(0), NaN, ...new Array(5).fill(Math.log(3))])!.direction, "slower", "answers without a time are passed over");
  // In a class, the norm is the class's own at each skill and level, with five answers or more.
  const cls = [
    ...Array.from({ length: 15 }, () => [obs("a", 20_000), obs("b", 20_000)]).flat(),
    ...Array.from({ length: 5 }, () => [obs("a", 5_000), obs("b", 20_000)]).flat(),
    ...Array.from({ length: 4 }, () => obs("a", 1_000, { skill: "rare" })),
  ];
  assert.deepEqual([...classPace(cls)].map(([s, j]) => [s, j.direction, Math.round(j.factor), j.answers]), [["a", "faster", 4, 20]]);
});

test("a data set file keeps first-response times beside its rows, and reads an older one without them", async () => {
  const { toFile, fromFile } = await import("../src/model/datasets.ts");
  const d = { source: "t", counts: { rows: 2, kept: 2, students: 1, skills: 1 }, areas: { s: "other" }, classes: {}, observations: [obs("u", 1234, { problem: "1", item: "9" }), obs("u", undefined, { problem: "2", item: "9" })] };
  const f = JSON.parse(JSON.stringify(toFile(d)));
  assert.deepEqual(f.ms, [1234, null]);
  assert.deepEqual(fromFile(f).observations.map((o) => o.ms), [1234, undefined]);
  delete f.ms;
  assert.deepEqual(fromFile(f).observations.map((o) => o.ms), [undefined, undefined]);
});
