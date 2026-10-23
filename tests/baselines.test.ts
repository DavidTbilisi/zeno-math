// Trying the learner model on real data: the streaming CSV reader, the ASSISTments importer, the student-wise split,
// the two standard baselines (PFA and BKT) and the Elo model with a data set's own grouping of skills, and H1's paired
// bootstrap of BKT against the moving average.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assistmentsTopic, csvRecords, fromAssistments, fromFile, longPractices, toFile } from "../src/model/datasets.ts";
import { EloModel, type Observation } from "../src/model/elo.ts";
import {
  BktModel, bktStep, bootstrapGroups, EmaModel, evaluateHeldOut, fitBkt, fitLogistic, globalRate, heldOutPredictions, pairedLogLoss, PfaModel, solve, splitByStudent,
  verdict, type StudentPrediction,
} from "../src/model/evaluate.ts";
import { rng } from "../src/model/simulate.ts";

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const collect = async <T>(it: AsyncIterable<T>) => {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
};

test("CSV records survive pieces that end anywhere, quoted commas, line breaks, doubled quotes and CRLF", async () => {
  const text = 'a,b,c\r\n1,"x, y",3\r\n2,"say ""hi""\nthere",4\n\n5,,"6"';
  const whole = await collect(csvRecords([text]));
  assert.deepEqual(whole, [["a", "b", "c"], ["1", "x, y", "3"], ["2", 'say "hi"\nthere', "4"], ["5", "", "6"]]);
  // Every split point, including inside "" and between \r and \n.
  for (let i = 1; i < text.length; i++) assert.deepEqual(await collect(csvRecords([text.slice(0, i), text.slice(i)])), whole, `split at ${i}`);
});

const ASSISTMENTS = [
  "order_id,assignment_id,user_id,assistment_id,problem_id,original,correct,attempt_count,skill_id,skill_name",
  "30,1,u1,1,1,1,1,1,10,Box and Whisker",
  "10,1,u1,2,2,1,0,2,11,Equation Solving Two or Fewer Steps",
  "10,1,u1,2,2,1,0,2,12,Area Rectangle", // the same problem with a second skill: one observation each
  "10,1,u1,2,2,1,0,2,12,Area Rectangle", // a repeated row: once
  "20,1,u2,3,3,0,1,1,11,Equation Solving Two or Fewer Steps", // scaffolding: left out
  "21,1,u2,3,3,1,0.5,1,11,Equation Solving Two or Fewer Steps", // not a 0/1 result: left out
  '22,1,u2,4,4,1,1,1,13,"Addition and Subtraction Fractions"',
  "23,1,u2,5,5,1,1,1,,", // no skill: left out
  "24,1,u2,6,6,1,1,1,NA,NA", // no skill written as NA, as the corrected file does: left out
  "25,1,u2,7,7,1,NA,1,13,Addition and Subtraction Fractions", // no result, written as NA: left out
];

test("the ASSISTments importer keeps main problems with a skill and a 0/1 result, once per skill, in the order given", async () => {
  const d = await fromAssistments(csvRecords([ASSISTMENTS.join("\n")]));
  assert.deepEqual(d.counts, { rows: 10, kept: 4, students: 2, skills: 4 });
  // The problem is the order_id: the two skills of problem 10 share it. The item is the problem_id.
  assert.deepEqual(d.observations, [
    { student: "u1", skill: "Equation Solving Two or Fewer Steps", level: 2, correct: false, problem: "10", item: "2" },
    { student: "u1", skill: "Area Rectangle", level: 2, correct: false, problem: "10", item: "2" },
    { student: "u2", skill: "Addition and Subtraction Fractions", level: 2, correct: true, problem: "22", item: "4" },
    { student: "u1", skill: "Box and Whisker", level: 2, correct: true, problem: "30", item: "1" },
  ]);
  assert.deepEqual(d.areas, {
    "Box and Whisker": "data",
    "Equation Solving Two or Fewer Steps": "algebra",
    "Area Rectangle": "geometry",
    "Addition and Subtraction Fractions": "number",
  });
  assert.deepEqual(fromFile(JSON.parse(JSON.stringify(toFile(d)))).observations, d.observations);
  // A file written before problems were kept reads back without them.
  const older = { ...toFile(d), rows: toFile(d).rows.map((r) => r.slice(0, 4) as [string, string, number, 0 | 1]) };
  assert.deepEqual(fromFile(older).observations.map((o) => o.problem), [undefined, undefined, undefined, undefined]);
  // And one written before items were kept, without those.
  const noItems = { ...toFile(d), rows: toFile(d).rows.map((r) => r.slice(0, 5) as [string, string, number, 0 | 1, string]) };
  assert.deepEqual(fromFile(noItems).observations.map((o) => [o.problem, o.item]), [["10", undefined], ["10", undefined], ["22", undefined], ["30", undefined]]);
  await assert.rejects(fromAssistments(csvRecords(["a,b\n1,2"])), /not an ASSISTments file/);
});

test("the importer counts each student in the class they answered most in, and a file without classes reads as none", async () => {
  const d = await fromAssistments(csvRecords([[
    "order_id,user_id,original,correct,skill_name,student_class_id",
    "1,u1,1,1,Area,A",
    "2,u1,1,0,Area,B",
    "3,u1,1,1,Area,A",
    "4,u2,1,1,Area,B", // u2: one in B, then one in A; a tie goes to the class met first
    "5,u2,1,0,Area,A",
    "6,u3,1,1,Area,", // no class: left out of the classes, kept as an answer
    "7,u4,0,1,Area,C", // scaffolding: left out, so class C never appears
  ].join("\n")]));
  assert.deepEqual(d.classes, { u1: "A", u2: "B" });
  assert.deepEqual(d.counts, { rows: 7, kept: 6, students: 3, skills: 1, classes: 2, inSeveralClasses: 2 });
  assert.deepEqual(fromFile(JSON.parse(JSON.stringify(toFile(d)))).classes, d.classes);
  const { classes: _, ...older } = toFile(d);
  assert.deepEqual(fromFile(older).classes, {});
  const without = await fromAssistments(csvRecords([ASSISTMENTS.join("\n")]));
  assert.deepEqual(without.classes, {});
  assert.equal(without.counts.classes, undefined);
});

test("skill names fall into coarse topics, and the unplaceable into other", () => {
  assert.equal(assistmentsTopic("Circle Graph"), "data");
  assert.equal(assistmentsTopic("Pythagorean Theorem"), "geometry");
  assert.equal(assistmentsTopic("Finding Slope From Equation"), "algebra");
  assert.equal(assistmentsTopic("Multiplication Whole Numbers"), "number");
  assert.equal(assistmentsTopic("Write Linear Equation from Situation"), "algebra");
  assert.equal(assistmentsTopic("Reading a Ruler or Scale"), "other");
});

/** Students taking turns, each right two times in three. */
function answers(students: number, perStudent: number) {
  const r = rng(5);
  return Array.from({ length: students * perStudent }, (_, i): Observation => ({ student: `s${i % students}`, skill: "k", level: 2, correct: r.next() < 2 / 3 }));
}

test("only the practices long enough are kept, each whole and in order", () => {
  const o = (student: string, skill: string, correct: boolean): Observation => ({ student, skill, level: 2, correct });
  const answers = [o("a", "x", false), o("b", "x", true), o("a", "y", true), o("a", "x", true), o("b", "x", true), o("a", "x", false)];
  assert.deepEqual(longPractices(answers, 3), [answers[0], answers[3], answers[5]]);
  assert.deepEqual(longPractices(answers, 2), [answers[0], answers[1], answers[3], answers[4], answers[5]]);
  assert.deepEqual(longPractices(answers, 1), answers);
});

test("the split keeps each student whole, on the same side every run, in the order answered", () => {
  const all = answers(500, 4);
  const { train, test: held } = splitByStudent(all, 0.2, 7);
  const trainers = new Set(train.map((o) => o.student));
  assert.ok(held.every((o) => !trainers.has(o.student)), "no student on both sides");
  assert.equal(train.length + held.length, all.length);
  const share = new Set(held.map((o) => o.student)).size / 500;
  assert.ok(share > 0.15 && share < 0.25, `about a fifth held out (${share})`);
  assert.deepEqual(splitByStudent(all, 0.2, 7).test, held);
  assert.notDeepEqual(splitByStudent(all, 0.2, 8).test, held, "another seed, another split");
  assert.deepEqual(held, all.filter((o) => !trainers.has(o.student)), "order kept");
});

test("a small linear system and a logistic regression come out as worked by hand", () => {
  const x = solve([[2, 1], [1, 3]], [3, 5])!;
  close(x[0], 0.8);
  close(x[1], 1.4);
  assert.equal(solve([[1, 2], [2, 4]], [1, 2]), null);
  // Draws from log-odds 0.5 + 1.5·x; the fit should find the weights.
  const r = rng(3);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 20000; i++) {
    const v = r.normal();
    X.push([1, v]);
    y.push(r.next() < 1 / (1 + Math.exp(-(0.5 + 1.5 * v))) ? 1 : 0);
  }
  const [b0, b1] = fitLogistic(X, y, 0);
  close(b0, 0.5, 0.06);
  close(b1, 1.5, 0.08);
});

test("PFA learns that practice helps, and an earlier right answer raises the next prediction", () => {
  // Every student: wrong, wrong, then right from the third question on.
  const train = Array.from({ length: 200 }, (_, s) => [0, 1, 2, 3, 4, 5].map((i): Observation => ({ student: `t${s}`, skill: "k", level: 2, correct: i >= 2 }))).flat();
  const m = new PfaModel();
  m.fit(train);
  const o: Observation = { student: "new", skill: "k", level: 2, correct: true };
  const first = m.predict(o);
  assert.ok(first < 0.2, `a new student is expected to miss (${first})`);
  m.update({ ...o, correct: false });
  m.update({ ...o, correct: false });
  m.update(o);
  assert.ok(m.predict(o) > 0.9, `after two misses and a right answer, right next (${m.predict(o)})`);
  // A skill nobody trained on gets the pooled weights, not a crash.
  assert.ok(Number.isFinite(m.predict({ ...o, skill: "unseen" })));
});

test("one BKT step is Bayes' rule and then the chance to learn, as worked by hand", () => {
  const p = { init: 0.5, learn: 0.1, guess: 0.2, slip: 0.1 };
  const right = bktStep(0.5, p, true);
  close(right.right, 0.55);
  close(right.known, 0.45 / 0.55 + (1 - 0.45 / 0.55) * 0.1);
  const wrong = bktStep(0.5, p, false);
  close(wrong.known, 0.05 / 0.45 + (1 - 0.05 / 0.45) * 0.1);
});

test("BKT's grid search finds the parameters answers were drawn from", () => {
  const truth = { init: 0.25, learn: 0.2, guess: 0.2, slip: 0.1 };
  const r = rng(11);
  const sequences = Array.from({ length: 3000 }, () => {
    let known = r.next() < truth.init;
    return Uint8Array.from({ length: 8 }, () => {
      const correct = known ? r.next() > truth.slip : r.next() < truth.guess;
      if (!known && r.next() < truth.learn) known = true;
      return correct ? 1 : 0;
    });
  });
  const fit = fitBkt(sequences);
  close(fit.init, truth.init, 0.1 + 1e-9);
  close(fit.learn, truth.learn, 0.05 + 1e-9);
  close(fit.guess, truth.guess, 0.05 + 1e-9);
  close(fit.slip, truth.slip, 0.05 + 1e-9);
  const m = new BktModel();
  m.fit(sequences.flatMap((s, i) => [...s].map((c): Observation => ({ student: `s${i}`, skill: "k", level: 2, correct: c === 1 }))));
  close(m.predict({ student: "new", skill: "k", level: 2, correct: true }), fit.init * (1 - fit.slip) + (1 - fit.init) * fit.guess);
});

test("the Elo model groups a data set's skills by the areas it is given", () => {
  const areas: Record<string, string> = { a1: "A", a2: "A", b1: "B" };
  const m = new EloModel({ areaOf: (k) => areas[k] });
  for (let i = 0; i < 10; i++) m.update({ student: "s", skill: "a1", level: 2, correct: true });
  const p = (skill: string) => m.predict({ student: "s", skill, level: 2 });
  assert.ok(p("a2") > p("b1"), "a skill in the same area gains more than one in another");
  assert.ok(p("b1") > 0.5, "the overall layer still lifts every skill");
});

test("held-out scoring warms up a learning model and fits a fitted one, then scores only the test students", () => {
  const { train, test: held } = splitByStudent(answers(100, 6), 0.3, 1);
  for (const m of [globalRate(), new PfaModel(), new EloModel()]) {
    const r = evaluateHeldOut(m, train, held);
    assert.equal(r.n, held.length);
    assert.ok(r.logLoss < Math.log(2), `${r.name} does better than a coin (${r.logLoss})`);
  }
});

test("H1's verdict follows the rule fixed in advance", () => {
  assert.equal(verdict(-0.02, [-0.03, -0.01], 0.005), "first better");
  assert.equal(verdict(0.02, [0.01, 0.03], 0.005), "second better");
  assert.equal(verdict(-0.003, [-0.004, -0.002], 0.005), "real but negligible");
  assert.equal(verdict(0.001, [-0.002, 0.004], 0.005), "no practical difference");
  assert.equal(verdict(-0.004, [-0.01, 0.002], 0.005), "inconclusive");
});

test("the group bootstrap draws as many groups as there are, the same on every run", () => {
  let sizes = true;
  const mean = (drawn: readonly number[]) => ((sizes &&= drawn.length === 50), drawn.reduce((s, g) => s + g, 0) / drawn.length);
  const [lo, hi] = bootstrapGroups(50, mean, 2000, 3);
  assert.ok(sizes);
  assert.ok(lo < 24.5 && 24.5 < hi && hi - lo < 20, `[${lo}, ${hi}]`);
  assert.deepEqual(bootstrapGroups(50, mean, 2000, 3), [lo, hi]);
  assert.deepEqual(bootstrapGroups(5, () => NaN, 10, 1).map(Number.isNaN), [true, true], "no usable resample, no interval");
});

test("the paired test takes the difference per answer, resamples students or their classes, and needs the same answers", () => {
  const ps = (student: string, p: number, correct: boolean): StudentPrediction => ({ student, p, correct });
  const a = [ps("s1", 0.8, true), ps("s1", 0.6, false), ps("s2", 0.9, true)];
  const b = [ps("s1", 0.5, true), ps("s1", 0.5, false), ps("s2", 0.5, true)];
  const r = pairedLogLoss({ name: "A", predictions: a }, { name: "B", predictions: b }, { resamples: 500 });
  const lossA = -(Math.log(0.8) + Math.log(0.4) + Math.log(0.9)) / 3;
  close(r.firstLogLoss, lossA);
  close(r.secondLogLoss, Math.log(2));
  close(r.difference, lossA - Math.log(2));
  assert.deepEqual([r.answers, r.students, r.groups], [3, 2, 2]);
  assert.ok(r.interval[0] <= r.difference && r.difference <= r.interval[1]);
  // One class holding both students: every resample is the whole class, so the interval is the estimate.
  const oneClass = pairedLogLoss({ name: "A", predictions: a }, { name: "B", predictions: b }, { resamples: 200, groupOf: () => "class" });
  assert.equal(oneClass.groups, 1);
  for (const x of oneClass.interval) close(x, r.difference);
  assert.throws(() => pairedLogLoss({ name: "A", predictions: a }, { name: "B", predictions: b.slice(1) }), /same answers/);
  assert.throws(() => pairedLogLoss({ name: "A", predictions: a }, { name: "B", predictions: [b[0], b[1], ps("s3", 0.5, true)] }), /same answers/);
});

test("H1 on answers BKT's way of learning made: BKT better than the moving average, and a model level with itself", () => {
  const truth = { init: 0.2, learn: 0.25, guess: 0.15, slip: 0.05 };
  const r = rng(13);
  const observations: Observation[] = [];
  for (let s = 0; s < 1500; s++) {
    let known = r.next() < truth.init;
    for (let i = 0; i < 10; i++) {
      observations.push({ student: `s${s}`, skill: "k", level: 2, correct: known ? r.next() > truth.slip : r.next() < truth.guess });
      if (!known && r.next() < truth.learn) known = true;
    }
  }
  const { train, test: held } = splitByStudent(observations, 0.2, 1);
  const bkt = heldOutPredictions(new BktModel(), train, held);
  assert.deepEqual(bkt.map((p) => p.student), held.map((o) => o.student));
  close(evaluateHeldOut(new BktModel(), train, held).logLoss, pairedLogLoss({ name: "BKT", predictions: bkt }, { name: "BKT", predictions: bkt }, { resamples: 100 }).firstLogLoss);
  const ema = heldOutPredictions(new EmaModel(), train, held);
  const h1 = pairedLogLoss({ name: "BKT", predictions: bkt }, { name: "EMA", predictions: ema }, { resamples: 2000 });
  assert.equal(h1.verdict, "first better", `${h1.difference} in ${h1.interval}`);
  const same = pairedLogLoss({ name: "BKT", predictions: bkt }, { name: "BKT", predictions: bkt }, { resamples: 200 });
  assert.deepEqual([same.difference, same.interval, same.verdict], [0, [0, 0], "no practical difference"]);
});
