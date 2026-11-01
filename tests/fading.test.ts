// Worked examples that fade (issue #266): every calculus question comes apart into steps the checker accepts, whose
// last is the question itself; the fading gives the last step to the student after a miss, one more after each faded
// example done right, one fewer after a faded step missed, and stops when they solve it alone; the browser and the
// server read an attempt alike, and a faded example tells the learner model nothing about the whole question.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { diffParts, intParts } from "../src/math/calcSteps.ts";
import { parseE, tex } from "../src/math/expr.ts";
import { check, exampleLike, exercise, SKILLS, stepsOf, type Exercise } from "../src/math/practice.ts";
import { attemptEvidence, fadedOf, learnFromAttempt, type Attempt } from "../src/learner.ts";
import { givenSteps, learnFading, type Fading } from "../src/model/fading.ts";
import { learnIdeas, type IdeaState } from "../src/model/ideaState.ts";

const w = en.pracWords;

test("how a derivative and an integral come apart", () => {
  const d = (s: string) => {
    const p = diffParts(parseE(s));
    if (!p) return null;
    return p.kind === "sum" ? ["sum", ...p.terms.map(tex)] : p.kind === "chain" ? ["chain", tex(p.inner)] : [p.kind, tex(p.u), tex(p.v)];
  };
  assert.deepEqual(d("3x^4 - 2x + 5"), ["sum", "3 x^{4}", "-2 x"], "a constant term has nothing to differentiate");
  assert.deepEqual(d("x^2 e^x"), ["product", "x^{2}", "e^{x}"]);
  assert.deepEqual(d("x/(x + 2)"), ["quotient", "x", "x + 2"]);
  assert.deepEqual(d("(2x + 3)^4"), ["chain", "2 x + 3"]);
  assert.deepEqual(d("e^(x^2)"), ["chain", "x^{2}"], "x² is the inside of e to it");
  assert.deepEqual(d("-sin(3x)"), ["chain", "3 x"]);
  assert.deepEqual(d("1/(2x + 3)"), ["chain", "2 x + 3"]);
  for (const s of ["x^5 + 7", "2/x^2", "3sqrt(x)", "cos x", "7"]) assert.equal(d(s), null, s);
  const i = (s: string) => {
    const p = intParts(parseE(s));
    return !p ? null : p.kind === "sum" ? ["sum", p.terms.length] : ["linear", tex(p.inner)];
  };
  assert.deepEqual(i("x^2 + 3/x^2"), ["sum", 2]);
  assert.deepEqual(i("sin(4x)"), ["linear", "4 x"]);
  assert.deepEqual(i("e^(2x - 3)"), ["linear", "2 x - 3"]);
  for (const s of ["e^(x^2)", "3/x^2", "x^3", "x sin x"]) assert.equal(i(s), null, s);
});

test("every calculus question comes apart into steps the checker accepts, the last being the question itself", () => {
  for (const skill of SKILLS.calculus)
    for (const level of [1, 2, 3] as const) {
      let withSteps = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const ex = exercise(skill, level, seed, w);
        const steps = stepsOf(ex, w);
        if (steps.length >= 2) withSteps++;
        for (const s of steps) {
          assert.deepEqual([s.skill, s.level, s.seed], [skill, level, seed]);
          assert.ok(check(s, s.plain, w).ok, `${skill} ${level} ${seed}: ${s.q} → ${s.plain}`);
        }
        if (steps.length) assert.deepEqual([steps.at(-1)!.prompt, steps.at(-1)!.q, steps.at(-1)!.plain], [ex.prompt, ex.q, ex.plain]);
      }
      // Integrating a single power (3/x², √x) has no parts; everything else nearly always has.
      assert.ok(withSteps >= (skill === "integrate" && level === 2 ? 20 : 50), `${skill} ${level}: ${withSteps} of 60 with steps`);
    }
  // A question without steps has none; a fractions operation keeps its own.
  assert.deepEqual(stepsOf(exercise("linear", 2, 1, w), w), []);
});

test("a worked example is another question of the same kind, with steps, the same everywhere", () => {
  const ex = exercise("differentiate", 3, 11, w);
  const like = exampleLike(ex, w)!;
  assert.deepEqual([like.skill, like.level], ["differentiate", 3]);
  assert.notEqual(like.plain, ex.plain);
  assert.ok(stepsOf(like, w).length >= 2);
  assert.equal(exampleLike(ex, w)!.seed, like.seed);
  assert.equal(exampleLike(exercise("linear", 1, 1, w), w), null, "no example for a skill without steps");
});

test("the fading: the last step after a miss, one more after each right, one back after a step missed, over once solved alone", () => {
  const f: Fading = {};
  const whole = (correct: boolean | null, steps = 4) => learnFading(f, "definite", { steps, given: 0, correct, stepsRight: false });
  const faded = (stepsRight: boolean) => learnFading(f, "definite", { steps: 4, given: givenSteps(f, "definite", 4), correct: null, stepsRight });
  assert.equal(givenSteps(f, "definite", 4), 0, "nothing given before a miss");
  whole(true);
  assert.deepEqual(f, {}, "right first time: nothing to fade");
  whole(null);
  whole(false, 1);
  assert.deepEqual(f, {}, "nothing to go by, or a question with one step: nothing moves");
  whole(false);
  assert.equal(givenSteps(f, "definite", 4), 3, "after a miss, three of four steps given");
  faded(true);
  assert.equal(givenSteps(f, "definite", 4), 2);
  faded(false);
  assert.equal(givenSteps(f, "definite", 4), 3, "a faded step missed: one step back");
  faded(true);
  faded(true);
  assert.equal(givenSteps(f, "definite", 4), 1);
  assert.equal(givenSteps(f, "definite", 2), 0, "a question with fewer steps than are left is asked whole");
  faded(true);
  assert.equal(givenSteps(f, "definite", 4), 0, "all four to do: asked whole");
  whole(false);
  assert.equal(givenSteps(f, "definite", 4), 1, "missed whole while fading: one step back");
  faded(true);
  whole(true);
  assert.deepEqual(f, {}, "solved alone: the fading is over");
  assert.equal(givenSteps({ x: 1 }, "definite", 4), 0, "another skill's fading");
});

test("an attempt tells the fading the same in the browser and on the server; a faded one tells the model nothing", () => {
  const ex = exercise("tangent", 3, 5, w);
  const steps = stepsOf(ex, w);
  assert.equal(steps.length, 4);
  const base = { skill: ex.skill, level: ex.level, seed: ex.seed } as const;
  const right = (s: Exercise) => ({ answers: [{ input: s.plain, verdict: "correct" as const, ms: 1 }], shown: false });
  const given = { answers: [], shown: true };
  const missed: Pick<Attempt, "skill" | "level" | "seed" | "outcome" | "answers"> = { ...base, outcome: "revealed", answers: [{ input: "y = 1", verdict: "wrong", ms: 1 }] };
  assert.deepEqual(fadedOf(missed), { steps: 4, given: 0, correct: false, stepsRight: false });
  const example = { ...base, outcome: "solved" as const, answers: [], faded: 2, steps: [given, given, right(steps[2]), right(steps[3])] };
  assert.deepEqual(fadedOf(example), { steps: 4, given: 2, correct: null, stepsRight: true });
  assert.equal(attemptEvidence(example), null);
  const slipped = { ...example, steps: [given, given, { answers: [{ input: "0", verdict: "wrong" as const, ms: 1 }, ...right(steps[2]).answers], shown: false }, right(steps[3])] };
  assert.equal(fadedOf(slipped).stepsRight, false);
  const left = { ...example, outcome: "skipped" as const, steps: [given, given, right(steps[2])] };
  assert.equal(fadedOf(left).stepsRight, false, "left before the last step");
  // On fractions, the ideas move only by the steps the student worked, not the ones given.
  const frac = exercise("fractions", 1, 7, w);
  const fs = stepsOf(frac, w);
  assert.ok(fs.length >= 2);
  const fb = { skill: frac.skill, level: frac.level, seed: frac.seed, outcome: "solved" as const, answers: [] };
  const got: IdeaState = {};
  learnFromAttempt(got, { ...fb, faded: fs.length - 1, steps: [...fs.slice(0, -1).map(() => given), right(fs.at(-1)!)] });
  const want: IdeaState = {};
  learnIdeas(want, fs.at(-1)!, true);
  assert.deepEqual(got, want, "only the last step, worked by the student, moves the ideas");
});
