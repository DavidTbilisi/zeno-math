// The learner model: ratings move the right way and by less as evidence builds up, a new skill starts from the
// student's area and overall ability, and on simulated learners with a known truth the model beats counting, is
// calibrated, and finds the true difficulties and the true order of the students. The simulation study runs both
// conditions alike, and adaptive questions sit nearer the target. Also the metrics, and reading the CSV export.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EloModel, type Observation } from "../src/model/elo.ts";
import { auc, calibration, evaluate, globalRate, itemRate, logLoss, observation, parseCsv, studentSkillRate } from "../src/model/evaluate.ts";
import { makeWorld, runStudy, simulateRandom, summarise, WORLDS } from "../src/model/simulate.ts";
import { ALL_SKILLS, LEVELS } from "../src/math/practice.ts";

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
/** Rank correlation. */
function spearman(xs: number[], ys: number[]) {
  const rank = (v: number[]) => {
    const order = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(v.length);
    order.forEach(([, i], k) => (r[i] = k));
    return r;
  };
  const [a, b] = [rank(xs), rank(ys)];
  const n = xs.length;
  const d2 = a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

test("ratings move the right way, by less as evidence builds up", () => {
  const m = new EloModel();
  const o: Observation = { student: "s1", skill: "linear", level: 2, correct: true };
  assert.equal(m.predict(o), 0.5); // a new student on a medium question
  assert.ok(m.predict({ ...o, level: 1 }) > 0.5 && m.predict({ ...o, level: 3 }) < 0.5);

  const steps: number[] = [];
  for (let i = 0; i < 6; i++) {
    const before = m.ability("s1", "linear");
    m.update(o);
    steps.push(m.ability("s1", "linear") - before);
  }
  assert.ok(steps.every((s) => s > 0), "right answers raise ability");
  assert.ok(steps.every((s, i) => i === 0 || s < steps[i - 1]), "each step smaller than the last");
  assert.ok(m.difficulty("linear", 2) < 0, "a question everyone gets right looks easier");

  const before = m.ability("s1", "linear");
  m.update({ ...o, correct: false });
  assert.ok(m.ability("s1", "linear") < before, "a wrong answer lowers ability");
});

test("a new skill starts from the student's area and overall ability", () => {
  const m = new EloModel();
  for (let i = 0; i < 15; i++) m.update({ student: "s1", skill: "linear", level: 2, correct: true });
  const p = (skill: Observation["skill"], student = "s1") => m.predict({ student, skill, level: 2 });
  // Factorising is algebra, like linear equations; averages are data; s2 has answered nothing.
  assert.ok(p("factor") > p("average"), "same area counts for more");
  assert.ok(p("average") > p("average", "s2"), "overall ability carries across areas");
  const mastery = m.mastery("s1", "linear");
  assert.equal(mastery.n, 15);
  assert.ok(mastery.p[1] > mastery.p[2] && mastery.p[2] > mastery.p[3]);
});

test("on simulated learners the model beats counting, is calibrated and finds the truth", () => {
  const { observations, world } = simulateRandom({ students: 80, questions: 120, seed: 7 });
  const model = new EloModel();
  const elo = evaluate(model, observations);
  for (const base of [globalRate(), itemRate(), studentSkillRate()]) {
    const b = evaluate(base, observations);
    assert.ok(elo.logLoss < b.logLoss - 0.02, `log-loss ${elo.logLoss} vs ${b.name} ${b.logLoss}`);
    assert.ok(elo.auc > b.auc + 0.03, `AUC ${elo.auc} vs ${b.name} ${b.auc}`);
  }
  for (const bin of elo.calibration.filter((b) => b.n >= 300))
    assert.ok(Math.abs(bin.predicted - bin.observed) < 0.05, `bin ${bin.from}: ${bin.predicted} predicted, ${bin.observed} observed`);

  // The 114 difficulties (38 skills × 3 levels) in the right order.
  const items = ALL_SKILLS.flatMap((k) => LEVELS.map((L) => [k, L] as const));
  const rho = spearman(items.map(([k, L]) => world.difficulty(k, L)), items.map(([k, L]) => model.difficulty(k, L)));
  assert.ok(rho > 0.9, `difficulty rank correlation ${rho}`);

  // Students in the right order, by their ability averaged over every skill.
  const mean = (f: (k: (typeof ALL_SKILLS)[number]) => number) => ALL_SKILLS.reduce((s, k) => s + f(k), 0) / ALL_SKILLS.length;
  const truth = world.learners.map((l) => mean((k) => l.ability.get(k)!));
  const found = world.learners.map((l) => mean((k) => model.ability(l.id, k)));
  const rhoStudents = spearman(truth, found);
  assert.ok(rhoStudents > 0.85, `student rank correlation ${rhoStudents}`);
});

test("metrics", () => {
  const ps = (pairs: [number, boolean][]) => pairs.map(([p, correct]) => ({ p, correct }));
  close(logLoss(ps([[0.5, true], [0.5, false]])), Math.LN2);
  assert.equal(auc(ps([[0.9, true], [0.8, true], [0.2, false]])), 1);
  assert.equal(auc(ps([[0.1, true], [0.9, false]])), 0);
  assert.equal(auc(ps([[0.5, true], [0.5, false]])), 0.5);
  assert.ok(Number.isNaN(auc(ps([[0.3, true]]))));
  const bins = calibration(ps([[0.05, false], [0.15, true], [0.95, true], [0.97, false]]), 10);
  assert.deepEqual(bins.map((b) => b.n), [1, 1, 0, 0, 0, 0, 0, 0, 0, 2]);
  close(bins[9].predicted, 0.96);
  close(bins[9].observed, 0.5);
});

test("the CSV export becomes observations", () => {
  const csv = [
    "attempt,student,condition,skill,level,outcome,first_correct,retries,n_answers,answers",
    '1,s1,fixed,linear,2,solved,1,0,1,"[{""input"":""3"",""verdict"":""correct""}]"',
    '2,s1,fixed,linear,2,solved,0,0,2,"[{""input"":""a, b""}]"', // wrong, then right: a miss
    "3,s2,adaptive,factor,1,revealed,0,0,0,[]", // revealed without trying: a miss
    '4,s2,adaptive,factor,1,skipped,0,1,1,"[]"', // left after a form message only: no evidence
    "5,s2,adaptive,astrology,1,solved,1,0,1,[]", // not a skill
    "6,s2,adaptive,ci,3,solved,1,1,2,[]\r\n", // a form message, then right: right first time
  ].join("\n");
  const rows = parseCsv(csv);
  assert.equal(rows.length, 6);
  assert.equal(rows[1].answers, '[{"input":"a, b"}]');
  const obs = rows.map(observation);
  assert.deepEqual(obs.map((o) => o && o.correct), [true, false, false, null, null, true]);
  assert.deepEqual(obs[2] && { student: obs[2].student, skill: obs[2].skill, level: obs[2].level, condition: obs[2].condition }, {
    student: "s2", skill: "factor", level: 1, condition: "adaptive",
  });
});

test("the simulation study runs both conditions alike, and adaptive questions sit nearer the target", () => {
  const params = { students: 20, questions: 30, seed: 5 };
  const result = runStudy(params);
  assert.deepEqual(runStudy(params), result, "the same seed gives the same study");
  assert.deepEqual(result.arms, ["adaptive", "fixed"]);
  assert.equal(result.learners.filter((l) => l.arm === 0).length, 10);
  assert.equal(result.chosen[0].length, 10 * 30);
  assert.equal(result.chosen[1].length, 10 * 30);
  const s = summarise(result);
  assert.ok(s.a.gain > 0 && s.b.gain > 0, "practice teaches");
  assert.ok(s.a.offTarget < s.b.offTarget - 0.05, `off target: adaptive ${s.a.offTarget}, fixed ${s.b.offTarget}`);
  assert.ok(Number.isFinite(s.d) && Number.isFinite(s.dTest));
  // The test a class sits is a noisy reading of the truth: whole questions out of twelve, close to it on average.
  for (const l of result.learners) assert.ok(Number.isInteger(l.preTest * 12) && Number.isInteger(l.postTest * 12));
  const meanOf = (f: (l: (typeof result.learners)[number]) => number) => result.learners.reduce((t, l) => t + f(l), 0) / result.learners.length;
  assert.ok(Math.abs(meanOf((l) => l.preTest) - meanOf((l) => l.pre)) < 0.1, "the test is about right on average");
});

test("every simulated world teaches with practice, and adaptive and random arms run like the others", () => {
  for (const world of WORLDS) {
    const s = summarise(runStudy({ students: 20, questions: 30, seed: 9, world }));
    assert.ok(s.a.gain > 0 && s.b.gain > 0, `${world}: practice teaches`);
  }
  const vsRandom = runStudy({ students: 20, questions: 20, seed: 9, arms: [{ policy: "adaptive", target: 0.6 }, { policy: "random" }] });
  assert.deepEqual(vsRandom.arms, ["adaptive 0.6", "random"]);
  assert.deepEqual(vsRandom.targets, [0.6, 0.75]);
  const s = summarise(vsRandom);
  assert.ok(s.a.offTarget < s.b.offTarget, "adaptive is nearer its own target than random choice is");
});

test("the BKT world: a known skill is answered right but for slips, an unknown one only by guessing, and practice can teach it", () => {
  const world = makeWorld({ students: 200, seed: 4, world: "bkt", learnRate: 0.4 });
  const l = world.learners.find((x) => !x.known.get("linear"))!;
  assert.equal(world.chance(l, "linear", 2), 0.2);
  let answered = 0;
  while (!l.known.get("linear") && answered < 1000) world.answer(l, "linear", 2), answered++;
  assert.ok(l.known.get("linear"), "practice teaches it in the end");
  assert.equal(world.chance(l, "linear", 3), 0.8);
  // Abler learners know more skills at the start.
  const knownShare = (x: (typeof world.learners)[number]) => [...x.known.values()].filter(Boolean).length / x.known.size;
  const byAbility = [...world.learners].sort((a, b) => a.ability.get("linear")! - b.ability.get("linear")!);
  const lowHalf = byAbility.slice(0, 100).reduce((t, x) => t + knownShare(x), 0);
  const highHalf = byAbility.slice(100).reduce((t, x) => t + knownShare(x), 0);
  assert.ok(highHalf > lowHalf);
});

test("simulated learning: zpd teaches most at an even chance, transfer reaches the skills built on it", () => {
  const gainOn = (opts: Parameters<typeof makeWorld>[0], skill: "linear" | "expand", level: 1 | 2 | 3) => {
    const world = makeWorld({ students: 1, seed: 3, ...opts });
    const l = world.learners[0];
    const before = { linear: l.ability.get("linear")!, expand: l.ability.get("expand")! };
    world.answer(l, "linear", level);
    return l.ability.get(skill)! - before[skill];
  };
  close(gainOn({ learning: "flat" }, "linear", 1), 0.02);
  assert.ok(gainOn({ learning: "zpd" }, "linear", 2) <= 0.02);
  assert.equal(gainOn({ transfer: 0 }, "expand", 2), 0);
  close(gainOn({ transfer: 0.5 }, "expand", 2), 0.01); // expand builds on linear
});
