// Trying the learner model on real data: the streaming CSV reader, the ASSISTments importer, the student-wise split,
// the two standard baselines (PFA and BKT) and the Elo model with a data set's own grouping of skills.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assistmentsTopic, csvRecords, fromAssistments, fromFile, toFile } from "../src/model/datasets.ts";
import { EloModel, type Observation } from "../src/model/elo.ts";
import { BktModel, bktStep, evaluateHeldOut, fitBkt, fitLogistic, globalRate, PfaModel, solve, splitByStudent } from "../src/model/evaluate.ts";
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
];

test("the ASSISTments importer keeps main problems with a skill and a 0/1 result, once per skill, in the order given", async () => {
  const d = await fromAssistments(csvRecords([ASSISTMENTS.join("\n")]));
  assert.deepEqual(d.counts, { rows: 8, kept: 4, students: 2, skills: 4 });
  assert.deepEqual(d.observations, [
    { student: "u1", skill: "Equation Solving Two or Fewer Steps", level: 2, correct: false },
    { student: "u1", skill: "Area Rectangle", level: 2, correct: false },
    { student: "u2", skill: "Addition and Subtraction Fractions", level: 2, correct: true },
    { student: "u1", skill: "Box and Whisker", level: 2, correct: true },
  ]);
  assert.deepEqual(d.areas, {
    "Box and Whisker": "data",
    "Equation Solving Two or Fewer Steps": "algebra",
    "Area Rectangle": "geometry",
    "Addition and Subtraction Fractions": "number",
  });
  assert.deepEqual(fromFile(JSON.parse(JSON.stringify(toFile(d)))).observations, d.observations);
  await assert.rejects(fromAssistments(csvRecords(["a,b\n1,2"])), /not an ASSISTments file/);
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
