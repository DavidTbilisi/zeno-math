// Mastery decisions: the three rules, the moving average they are compared with, practice with a known truth, and
// the measures H2 and H3 rest on (docs/thesis/outline.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Observation } from "../src/model/elo.ts";
import { bktStep, EmaModel, emaStep, fitEma, type BktParams } from "../src/model/evaluate.ts";
import {
  agreement, BEYOND_THRESHOLDS, bktRule, bootstrapByStudent, cheapestAtPrecision, compareAtCost, compareAtPrecision, decide, emaRule, FINE_THRESHOLDS, fitRules, judge,
  masteryCalibration, PRECISION_TARGET, practicesFrom, precisionOf, rightAfter, simulatePractice, streakRule, thresholdForCost, tradeOff, type Practice,
} from "../src/model/mastery.ts";
import { rng } from "../src/model/simulate.ts";

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const seq = (s: string) => Uint8Array.from([...s].map(Number));
/** Every sequence of 0s and 1s of length 1 to n. */
const everySequence = (n: number) => Array.from({ length: n }, (_, k) => k + 1).flatMap((len) => Array.from({ length: 2 ** len }, (_, b) => Uint8Array.from({ length: len }, (_, i) => (b >> i) & 1)));

test("N right in a row declares after the Nth, and never without the run", () => {
  const three = streakRule(3);
  assert.equal(three.declare("k", seq("0111")), 4);
  assert.equal(three.declare("k", seq("110111")), 6);
  assert.equal(three.declare("k", seq("1101101")), null);
  assert.equal(streakRule(1).declare("k", seq("01")), 2);
});

test("Proposition 1: three in a row is the EMA with α 0.6, start below 0.5 and θ 0.92, and not with a higher start", () => {
  const streak = streakRule(3);
  const sequences = everySequence(12);
  for (const start of [0, 0.3, 0.49]) {
    const ema = emaRule({ alpha: 0.6, start }, 0.92);
    for (const s of sequences) assert.equal(ema.declare("k", s), streak.declare("k", s), `start ${start}, ${s.join("")}`);
  }
  // At the fitted kind of start the EMA lets a student go after two right answers.
  assert.equal(emaRule({ alpha: 0.6, start: 0.65 }, 0.92).declare("k", seq("11")), 2);
  // Outside the band for θ: at 0.95 three in a row from nothing is not enough (1 − 0.4³ = 0.936).
  assert.equal(emaRule({ alpha: 0.6, start: 0 }, 0.95).declare("k", seq("111")), null);
});

test("the EMA moves a share α of the way to each answer, and its model starts at the start", () => {
  close(emaStep(0.5, 0.2, true), 0.6);
  close(emaStep(0.5, 0.2, false), 0.4);
  const m = new EmaModel({ alpha: 0.5, start: 0.6 });
  const o: Observation = { student: "s", skill: "k", level: 2, correct: true };
  close(m.predict(o), 0.6);
  m.update(o);
  close(m.predict(o), 0.8);
  close(m.predict({ ...o, student: "other" }), 0.6);
  m.fit([{ ...o, correct: false }]);
  assert.deepEqual(m.params, { alpha: 0.5, start: 0.6 }, "settings given are kept");
});

test("the EMA's start is the share of right first answers, and α follows how long answers persist", () => {
  // Every student answers the same way throughout: the last answer is the best guess, so α is the largest.
  const fit = fitEma([seq("1111"), seq("1111"), seq("1111"), seq("0000")]);
  assert.deepEqual(fit, { alpha: 0.9, start: 0.75 });
  // Answers that are independent coin flips at 70 %: a long memory, a small α.
  const r = rng(3);
  const flips = Array.from({ length: 400 }, () => Uint8Array.from({ length: 20 }, () => (r.next() < 0.7 ? 1 : 0)));
  assert.ok(fitEma(flips).alpha <= 0.05, `α ${fitEma(flips).alpha}`);
  const m = new EmaModel();
  m.fit([0, 1, 2].map((i): Observation => ({ student: `s${i}`, skill: "k", level: 2, correct: i > 0 })));
  close(m.params.start, 2 / 3);
});

test("BKT's rule declares when P(known) after the step first reaches θ", () => {
  const p: BktParams = { init: 0.3, learn: 0.1, guess: 0.2, slip: 0.1 };
  const answers = seq("0110111");
  let known = p.init;
  const path = [...answers].map((a) => (known = bktStep(known, p, a === 1).known));
  const first = path.findIndex((k) => k >= 0.95) + 1;
  assert.ok(first > 0);
  assert.equal(bktRule(() => p, 0.95).declare("k", answers), first);
  assert.equal(bktRule(() => p, 0.9999).declare("k", answers), null);
});

test("Proposition 2: with the true parameters, BKT's declarations are right at least θ of the time", () => {
  const truth: BktParams = { init: 0.3, learn: 0.1, guess: 0.25, slip: 0.1 };
  const r = rng(5);
  const practices: Practice[] = Array.from({ length: 20000 }, (_, i) => {
    let known = r.next() < truth.init;
    const answers = new Uint8Array(20);
    const state = new Uint8Array(20);
    for (let t = 0; t < 20; t++) {
      answers[t] = (known ? r.next() > truth.slip : r.next() < truth.guess) ? 1 : 0;
      if (!known && r.next() < truth.learn) known = true;
      state[t] = known ? 1 : 0;
    }
    return { student: `s${i}`, skill: "k", answers, known: state };
  });
  for (const theta of [0.8, 0.9, 0.95]) {
    const j = judge(bktRule(() => truth, theta), practices);
    assert.ok(j.precision >= theta - 0.01, `θ ${theta}: precision ${j.precision}`);
  }
});

test("judging counts a practice never declared at full length, and misses only skills known at the end", () => {
  const practices: Practice[] = [
    { student: "a", skill: "k", answers: seq("0111"), known: seq("0011") }, // declared at 4, known then: right
    { student: "b", skill: "k", answers: seq("1110"), known: seq("0000") }, // declared at 3, not known: wrong
    { student: "c", skill: "k", answers: seq("0101"), known: seq("0001") }, // never: costs 4, missed
    { student: "d", skill: "k", answers: seq("0000"), known: seq("0000") }, // never, never known
  ];
  const j = judge(streakRule(3), practices);
  assert.deepEqual(j, { rule: "streak 3", practices: 4, declared: 0.5, cost: (4 + 3 + 4 + 4) / 4, precision: 0.5, missed: 0.5 });
  assert.ok(Number.isNaN(judge(streakRule(3), practices.map(({ known: _, ...p }) => p)).precision), "no truth, no precision");
});

test("the threshold for a cost is found by bisection, and a higher one never costs less", () => {
  const r = rng(7);
  const practices: Practice[] = Array.from({ length: 300 }, (_, i) => ({ student: `s${i}`, skill: "k", answers: Uint8Array.from({ length: 15 }, () => (r.next() < 0.75 ? 1 : 0)) }));
  const make = (t: number) => emaRule({ alpha: 0.4, start: 0.5 }, t);
  const costs = [0.6, 0.7, 0.8, 0.9, 0.95].map((t) => judge(make(t), practices).cost);
  for (let i = 1; i < costs.length; i++) assert.ok(costs[i] >= costs[i - 1], `costs ${costs}`);
  const target = judge(streakRule(3), practices).cost;
  const t = thresholdForCost(make, practices, target);
  assert.ok(Math.abs(judge(make(t), practices).cost - target) < 0.2, `cost ${judge(make(t), practices).cost} for ${target}`);
});

test("the bootstrap draws whole students, and its interval holds the estimate", () => {
  const practices: Practice[] = Array.from({ length: 200 }, (_, i) => ({ student: `s${i >> 1}`, skill: `k${i & 1}`, answers: seq(i % 3 ? "111" : "000"), known: seq(i % 5 ? "111" : "000") }));
  const decisions = decide(streakRule(3), practices);
  const precision = precisionOf(decisions);
  const all = practices.map((_, i) => i);
  let sizes = true;
  const [lo, hi] = bootstrapByStudent(practices, (idx) => ((sizes &&= idx.length === practices.length), precision(idx)), 500, 1);
  assert.ok(sizes, "every resample has as many students, each with both practices");
  assert.ok(lo <= precision(all) && precision(all) <= hi, `${lo} ≤ ${precision(all)} ≤ ${hi}`);
  assert.ok(hi - lo > 0 && hi - lo < 0.3);
});

test("agreement and the answers after mastery, as counted by hand", () => {
  const practices: Practice[] = [
    { student: "a", skill: "k", answers: seq("11110") },
    { student: "b", skill: "k", answers: seq("0110") },
    { student: "c", skill: "k", answers: seq("000") },
  ];
  const a = agreement(streakRule(2), streakRule(3), practices);
  assert.deepEqual(a, { both: 1 / 3, onlyFirst: 1 / 3, onlySecond: 0, neither: 1 / 3, meanGap: -1 });
  // After two in a row: a has 1, 1, 0 next (2 of 3 right); b has 0 (none of 1).
  assert.deepEqual(rightAfter(streakRule(2), practices), { rule: "streak 2", practices: 2, answers: 4, right: 0.5 });
});

test("logged answers become one practice per student and skill, in the order answered", () => {
  const o = (student: string, skill: string, correct: boolean): Observation => ({ student, skill, level: 2, correct });
  const ps = practicesFrom([o("a", "x", true), o("b", "x", false), o("a", "y", false), o("a", "x", false)]);
  assert.deepEqual(ps.map((p) => [p.student, p.skill, [...p.answers].join("")]), [["a", "x", "10"], ["b", "x", "0"], ["a", "y", "0"]]);
});

test("simulated practice records the truth: in the bkt world it is only lost with forgetting", () => {
  const params = { world: "bkt" as const, students: 40, skills: ["linear", "expand"] as const, length: 25, seed: 2 };
  const plain = simulatePractice(params);
  assert.deepEqual(simulatePractice(params), plain, "the same seed gives the same practice");
  assert.deepEqual(simulatePractice({ ...params, forget: 0 }), plain, "no forgetting draws nothing extra");
  const lost = (ps: Practice[]) => ps.some((p) => p.known!.some((k, i) => i > 0 && !k && p.known![i - 1]));
  assert.ok(!lost(plain));
  assert.ok(lost(simulatePractice({ ...params, forget: 0.1 })));
  const gradual = simulatePractice({ ...params, world: "elo", learnRate: 0.2 });
  assert.ok(gradual.some((p) => !p.known![0] && p.known!.at(-1)), "in a gradual world learners cross the line by practising");
});

test("H2 at equal cost: thresholds set on training learners, all three judged on the rest", () => {
  const practices = simulatePractice({ world: "bkt", students: 120, skills: ["linear", "expand"], length: 20, seed: 4 });
  const train = practices.filter((p) => Number(p.student.slice(3)) % 5);
  const held = practices.filter((p) => !(Number(p.student.slice(3)) % 5));
  const fitted = fitRules(train);
  const rows = compareAtCost(train, held, fitted, 3, 200, 1);
  assert.deepEqual(rows.map((r) => r.rule.split(" ")[0]), ["BKT", "EMA", "streak"]);
  assert.equal(rows[2].threshold, null);
  for (const r of rows) assert.ok(r.interval[0] <= r.precision && r.precision <= r.interval[1], `${r.rule}: ${r.precision} in ${r.interval}`);
  assert.equal(rows[0].bktAhead, undefined);
  close(rows[1].bktAhead!.estimate, rows[0].precision - rows[1].precision);
  const curve = tradeOff(fitted, held);
  assert.equal(curve.length, 20 + 20 + 5);
  const bkt = curve.filter((c) => c.method === "BKT");
  for (let i = 1; i < bkt.length; i++) assert.ok(bkt[i].cost >= bkt[i - 1].cost, "a higher θ never costs less");
});

test("the cheapest rule right often enough is chosen, and none when no rule is", () => {
  const practices: Practice[] = [
    { student: "a", skill: "k", answers: seq("1111"), known: seq("0111") }, // streak 1 declares too early here
    { student: "b", skill: "k", answers: seq("1100"), known: seq("0000") }, // streak 2 wrongly, streak 3 never
    { student: "c", skill: "k", answers: seq("0111"), known: seq("0011") },
  ];
  const streaks = [1, 2, 3, 4].map(streakRule);
  // Precision: streak 1 none of 3, streak 2 2/3 (a at 2 right, b at 2 wrong, c at 3 right), streak 3 all (a at 3, c at 4).
  assert.equal(cheapestAtPrecision(streaks, practices, 0.6)?.name, "streak 2");
  assert.equal(cheapestAtPrecision(streaks, practices, 0.9)?.name, "streak 3");
  assert.equal(cheapestAtPrecision([streakRule(1)], practices, 0.9), null);
  assert.ok(FINE_THRESHOLDS.includes(0.5) && FINE_THRESHOLDS.includes(0.99) && FINE_THRESHOLDS.at(-1) === 0.9999);
  for (let i = 1; i < FINE_THRESHOLDS.length; i++) assert.ok(FINE_THRESHOLDS[i] > FINE_THRESHOLDS[i - 1]);
  // The check above 0.9999 keeps every threshold fixed in advance and goes on, still rising, to 1 − 10^−15.
  assert.deepEqual(BEYOND_THRESHOLDS.slice(0, FINE_THRESHOLDS.length), FINE_THRESHOLDS);
  for (let i = 1; i < BEYOND_THRESHOLDS.length; i++) assert.ok(BEYOND_THRESHOLDS[i] > BEYOND_THRESHOLDS[i - 1]);
  close(BEYOND_THRESHOLDS.at(-1)!, 1 - 1e-15);
  assert.ok(BEYOND_THRESHOLDS.at(-1)! < 1);
  const names = BEYOND_THRESHOLDS.map((t) => bktRule(() => ({ init: 0.5, learn: 0.1, guess: 0.2, slip: 0.1 }), t).name);
  assert.equal(new Set(names).size, names.length, "every threshold has its own name");
  assert.equal(names[FINE_THRESHOLDS.length - 1], "BKT θ 0.9999");
  assert.equal(names.at(-1), "BKT θ 1 − 1e-15");
});

test("H2 at equal precision: each method's cheapest threshold right often enough on training learners, judged on the rest", () => {
  const practices = simulatePractice({ world: "bkt", students: 120, skills: ["linear", "expand"], length: 20, seed: 4 });
  const train = practices.filter((p) => Number(p.student.slice(3)) % 5);
  const held = practices.filter((p) => !(Number(p.student.slice(3)) % 5));
  const fitted = fitRules(train);
  const rows = compareAtPrecision(train, held, fitted, PRECISION_TARGET, 200, 1);
  assert.deepEqual(rows.map((r) => r.method), ["BKT", "EMA", "streak"]);
  assert.equal(rows[0].bktSaves, undefined);
  for (const r of rows) {
    const j = r.judgement!;
    assert.ok(j.costInterval[0] <= j.cost && j.cost <= j.costInterval[1], `${r.rule}: ${j.cost} in ${j.costInterval}`);
    assert.ok(j.precisionInterval[0] <= j.precision && j.precision <= j.precisionInterval[1]);
  }
  for (const r of rows.slice(1)) close(r.bktSaves!.estimate, r.judgement!.cost - rows[0].judgement!.cost);
  const streak = Number(rows[2].rule!.split(" ")[1]);
  assert.ok(judge(streakRule(streak), train).precision >= PRECISION_TARGET, "right often enough where it was chosen");
  if (streak > 1) assert.ok(judge(streakRule(streak - 1), train).precision < PRECISION_TARGET, "and the one below it was not");
  // Searching further above 0.9999 cannot change a rule found below it, as a higher threshold never costs less.
  assert.deepEqual(compareAtPrecision(train, held, fitted, PRECISION_TARGET, 200, 1, BEYOND_THRESHOLDS).map((r) => r.rule), rows.map((r) => r.rule));
  // A standard no rule can meet: every method is reported as never reaching it.
  assert.deepEqual(compareAtPrecision(train, held, fitted, 1.01, 50, 1), [{ method: "BKT", rule: null }, { method: "EMA", rule: null }, { method: "streak", rule: null }]);
});

test("calibration scores every answer against the truth at that moment, each score as its rule reads it", () => {
  const b: BktParams = { init: 0.3, learn: 0.1, guess: 0.2, slip: 0.1 };
  const fitted = { bkt: () => b, ema: { alpha: 0.5, start: 0.5 } };
  const practice: Practice = { student: "s", skill: "k", answers: seq("101"), known: seq("001") };
  const [known, right, ema] = masteryCalibration(fitted, [practice, { student: "r", skill: "k", answers: seq("11") }]);
  assert.deepEqual([known.score, right.score, ema.score], ["BKT P(known)", "BKT P(right)", "EMA"]);
  // Only the practice with a truth counts, one score per answer.
  for (const c of [known, right, ema]) assert.equal(c.n, 3);
  let l = b.init, e = 0.5;
  const ls: number[] = [], es: number[] = [];
  for (const a of [1, 0, 1]) (ls.push((l = bktStep(l, b, a === 1).known)), es.push((e = emaStep(e, 0.5, a === 1))));
  const truth = [0, 0, 1];
  const brier = (xs: number[]) => xs.reduce((s, x, i) => s + (x - truth[i]) ** 2, 0) / 3;
  close(known.brier, brier(ls));
  close(right.brier, brier(ls.map((x) => x * 0.9 + (1 - x) * 0.2)));
  close(ema.brier, brier(es));
  // The bins hold every answer, and the last answer's EMA of 0.6875 is in the bin from 0.6, all of it mastered.
  assert.equal(ema.bins.reduce((s, x) => s + x.n, 0), 3);
  assert.deepEqual([ema.bins[6].n, ema.bins[6].observed], [1, 1]);
});

test("BKT's chance of a right answer never passes 1 − slip, whatever the answers", () => {
  const b: BktParams = { init: 0.5, learn: 0.3, guess: 0.25, slip: 0.2 };
  const practice: Practice = { student: "s", skill: "k", answers: new Uint8Array(30).fill(1), known: new Uint8Array(30).fill(1) };
  const [, right] = masteryCalibration({ bkt: () => b, ema: { alpha: 0.1, start: 0.5 } }, [practice]);
  assert.ok(right.bins.every((x) => !x.n || x.predicted <= 0.8 + 1e-12));
  assert.equal(right.bins[9].n, 0);
});
