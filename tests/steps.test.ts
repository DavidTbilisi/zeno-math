// A fractions operation worked in steps: every step's own answer is right, the last step's is the question's, the
// steps together need what the question needs, each step names the mistakes its form names, and nothing else has steps.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, stepsOf, trapInputs, type StepForm } from "../src/math/practice.ts";
import { usesOf } from "../src/model/ideaState.ts";

const w = en.pracWords;
const formOf = (ex: { solution?: { spec: unknown } }) => (ex.solution!.spec as { form: StepForm }).form;

test("every fractions operation is worked in steps that add up to it", () => {
  let operations = 0;
  for (const L of [1, 2, 3] as const)
    for (let seed = 0; seed < 600; seed++) {
      const ex = exercise("fractions", L, seed, w);
      const steps = stepsOf(ex, w);
      const operation = (ex.solution!.spec as { type: string }).type === "fracop";
      assert.equal(steps.length > 0, operation, `${ex.q}: steps only for an operation`);
      if (!operation) continue;
      operations++;
      for (const s of steps) assert.ok(check(s, s.plain, w).ok, `${ex.q}: step ${s.q} takes ${s.plain}`);
      const last = steps.at(-1)!.answer as { v: number }, whole = ex.answer as { v: number };
      assert.ok(Math.abs(last.v - whole.v) < 1e-9, `${ex.q}: the last step is the answer`);
      // The steps need every idea the question needs; the lowest common denominator, asked alone, may need a long
      // product the question's reading leaves out, as the form asking for it does.
      const needed = new Set(usesOf(ex)), met = new Set(steps.flatMap((s) => usesOf(s)));
      for (const idea of needed) assert.ok(met.has(idea), `${ex.q}: ${idea} is in a step`);
      for (const idea of met) assert.ok(needed.has(idea) || idea === "multiplyLong", `${ex.q}: ${idea} is not needed`);
      // In the method's order: mixed numbers first, the operation's own step after the fractions are ready for it, lowest terms last.
      const forms = steps.map(formOf);
      assert.ok(forms.lastIndexOf("toImproper") < forms.findIndex((f) => f !== "toImproper") || !forms.includes("toImproper"));
      assert.ok(!forms.includes("lowest") || forms.at(-1) === "lowest");
    }
  assert.ok(operations > 900, `${operations} operations`);
});

test("a step names the mistakes its form names", () => {
  const find = (form: StepForm) => {
    for (let seed = 0; ; seed++) {
      const step = stepsOf(exercise("fractions", 3, seed, w), w).find((s) => formOf(s) === form && trapInputs(s).length);
      if (step) return step;
    }
  };
  for (const [form, id] of [["equivalent", "addedToBoth"], ["toImproper", "wholeTimesTop"]] as const) {
    const step = find(form);
    const trap = trapInputs(step).find((t) => t.id === id)!;
    assert.equal(check(step, trap.input, w).mistake, id);
  }
});

test("a step's answer is the method's own: unsimplified tops over the common denominator are right, lowest terms only when asked", () => {
  for (let seed = 0; seed < 200; seed++) {
    const steps = stepsOf(exercise("fractions", 2, seed, w), w);
    const tops = steps.find((s) => formOf(s) === "addTops" || formOf(s) === "timesTops");
    if (!tops || !steps.some((s) => formOf(s) === "lowest")) continue;
    assert.ok(check(tops, tops.plain, w).ok, `${tops.q}: ${tops.plain} is right before simplifying`);
    const lowest = steps.at(-1)!;
    assert.ok(!check(lowest, tops.plain, w).ok, `${lowest.q}: unsimplified is not lowest terms`);
    return;
  }
  assert.fail("no operation left a result to simplify");
});

test("no other question has steps", () => {
  for (const skill of ["times", "hcf", "linear", "percent"] as const) assert.deepEqual(stepsOf(exercise(skill, 2, 7, w), w), []);
});
