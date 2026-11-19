// Bar-model word problems: every structure's answer follows from its numbers by its own working, the steps lead to it,
// each slip gives another answer the checker names, the bar models draw, and the questions read in all three languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { BAR_FORMS, barQuestion, type BarForm } from "../src/math/barProblems.ts";
import { renderModel, type ModelSpec } from "../src/math/models.ts";
import { check, exercise, LEVELS, stepsOf } from "../src/math/practice.ts";

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const FORMS = Object.values(BAR_FORMS).flat();

test("each structure's answer follows from its numbers", () => {
  const solve: Record<BarForm, (v: Record<string, number>) => number> = {
    less: (v) => v.a - v.d,
    posts: (v) => v.L / v.g + 1,
    howMuchMore: (v) => v.a - (v.t - v.a),
    sumDiff: (v) => (v.t - v.d) / 2,
    times: (v) => (v.t / (v.k + 1)) * v.k,
    loop: (v) => v.L / v.g,
    give: (v) => (v.k * (2 * v.g)) / (v.k - 1),
    leftShort: (v) => (v.l + v.s) / (v.q - v.p),
    three: (v) => (v.t - v.d) / 4 + v.d,
  };
  for (const form of FORMS)
    for (const seed of SEEDS) {
      const q = barQuestion(form, rng(seed));
      assert.equal(q.v, solve[form](q.vars), `${form} ${seed}`);
      assert.ok(Number.isInteger(q.v) && q.v > 0, `${form} ${seed}: ${q.v}`);
      // The amounts in the question are whole too.
      for (const [k, v] of Object.entries(q.vars)) assert.ok(Number.isInteger(v) && v > 0, `${form} ${seed} ${k}=${v}`);
    }
});

test("the steps lead to the answer: the units, the unit, the gaps, the stickers needed", () => {
  for (const seed of SEEDS) {
    const t = barQuestion("times", rng(seed));
    assert.deepEqual(t.steps.map((s) => s.v), [t.vars.k + 1, t.vars.t / (t.vars.k + 1)]);
    const g = barQuestion("give", rng(seed));
    // After the gift they are equal: Ann's k units less g is Ben's unit plus g.
    assert.equal(g.vars.k * g.vars.u - g.vars.g, g.vars.u + g.vars.g);
    const l = barQuestion("leftShort", rng(seed));
    // The stickers are the same both ways.
    assert.equal(l.vars.p * l.v + l.vars.l, l.vars.q * l.v - l.vars.s);
    const p = barQuestion("posts", rng(seed));
    assert.equal(p.steps[0].v + 1, p.v);
  }
});

test("every slip is another answer, and the checker names it", () => {
  const w = en.pracWords;
  const named = new Set<string>();
  for (const level of LEVELS)
    for (const seed of SEEDS) {
      const ex = exercise("barModels", level, seed, w);
      assert.equal(check(ex, ex.plain, w).ok, true, `${level} ${seed} ${ex.plain}`);
      for (const t of ex.answer.traps ?? []) {
        if (t.a.k !== "num") throw new Error(t.a.k);
        const verdict = check(ex, String(t.a.v), w);
        assert.equal(verdict.ok, false);
        assert.equal(verdict.mistake, t.id, `${level} ${seed} ${t.id}`);
        named.add(t.id);
      }
    }
  assert.deepEqual([...named].sort(), ["givenOnlyOnce", "leftShortSubtracted", "loopExtraPost", "moreMeansAdd", "oneStepOnly", "postsAreGaps", "sharedEqually", "unitsMiscount"]);
});

test("the worked steps come before the question, each with its bar model or lines", () => {
  const w = en.pracWords;
  const seen = new Set<string>();
  for (const level of LEVELS)
    for (const seed of SEEDS.slice(0, 60)) {
      const ex = exercise("barModels", level, seed, w);
      const steps = stepsOf(ex, w);
      seen.add(`${level}:${steps.length}`);
      for (const s of steps) {
        if (s.solution) renderModel(s.solution.spec as ModelSpec);
        else assert.ok(s.steps?.length, `${level} ${seed}: no working`);
      }
    }
  // Easy has questions of one step and of two; medium and hard always have steps before the answer.
  assert.ok(seen.has("1:0") && seen.has("1:2"));
  assert.ok([...seen].filter((k) => !k.startsWith("1:")).every((k) => !k.endsWith(":0")));
});

test("the questions read in all three languages, with nothing left unfilled", () => {
  for (const words of [en, ka, ru])
    for (const level of LEVELS)
      for (const seed of SEEDS.slice(0, 40)) {
        const ex = exercise("barModels", level, seed, words.pracWords);
        for (const s of [ex, ...stepsOf(ex, words.pracWords)]) assert.ok(!/[{}]/.test(s.prompt), s.prompt);
      }
  assert.match(exercise("barModels", 1, 1, ka.pracWords).prompt, /₾|მ/);
  assert.match(exercise("barModels", 2, 3, ru.pracWords).prompt, /₽|м/);
});
