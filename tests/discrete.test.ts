// Discrete mathematics (degree level) in practice: the exact helpers (recurrence terms, bounded solutions, derangements,
// matchings, the Erdős–Gallai test) checked by hand, and every question checked against its own answer (right as
// shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { boundedSolutions, choose, derangements, divisibleCount, factorial, graphical, matchings, recurrenceTerms, twoGeometric } from "../src/math/discrete.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["recurrences", "generating", "inclusionExclusion", "pigeonhole", "graphTheory"];

test("recurrence terms and their closed form", () => {
  assert.deepEqual(recurrenceTerms(1, 1, 0, 1, 10), [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
  // aₙ = 5aₙ₋₁ − 6aₙ₋₂ with a₀ = 2, a₁ = 5 is 2ⁿ + 3ⁿ
  recurrenceTerms(5, -6, 2, 5, 8).forEach((a, n) => assert.equal(a, 2 ** n + 3 ** n));
});

test("counting with generating functions", () => {
  assert.equal(choose(7, 2), 21);
  assert.equal(choose(3, 5), 0);
  // the number of ways to choose k from m kinds with repeats is the coefficient of xᵏ in 1/(1 − x)ᵐ
  for (const [k, m] of [[3, 4], [5, 3], [6, 6]]) assert.equal(boundedSolutions(Array(m).fill(k), k), choose(k + m - 1, m - 1));
  // x₁ + x₂ + x₃ = 5 with every xᵢ ≤ 2: (1,2,2) in 3 orders
  assert.equal(boundedSolutions([2, 2, 2], 5), 3);
  assert.equal(boundedSolutions([2, 2, 2], 7), 0);
  for (const [a, b, n] of [[2, 1, 4], [3, 2, 5], [4, 3, 3]]) assert.equal(twoGeometric(a, b, n), (a ** (n + 1) - b ** (n + 1)) / (a - b));
});

test("inclusion–exclusion, derangements and matchings", () => {
  assert.equal(divisibleCount(100, [2, 3]), 50 + 33 - 16);
  assert.equal(divisibleCount(300, [2, 3, 5]), 150 + 100 + 60 - 50 - 30 - 20 + 10);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(derangements), [1, 0, 1, 2, 9, 44, 265, 1854]);
  for (let n = 1; n <= 8; n++) assert.equal(Math.round(factorial(n) / Math.E), derangements(n));
  assert.deepEqual([1, 2, 3, 4, 5].map(matchings), [1, 3, 15, 105, 945]);
  for (let n = 1; n <= 5; n++) assert.equal(matchings(n), factorial(2 * n) / (2 ** n * factorial(n)));
});

test("which degree sequences are a simple graph's", () => {
  assert.equal(graphical([3, 3, 3, 3]), true); // K₄
  assert.equal(graphical([2, 2, 2]), true); // a triangle
  assert.equal(graphical([3, 3, 1, 1]), false); // even sum, but two vertices of degree 3 need three neighbours each
  assert.equal(graphical([3, 2, 2]), false); // odd sum
  assert.equal(graphical([4, 2, 1, 1]), false); // even sum, but degree 4 on 4 vertices
});

test("every discrete-mathematics question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z0-9]+\}/.test(e.prompt), `${where}: a blank left in the prompt`);
        assert.ok(!/\\text\{[^}]*\b(and|the|of|so|is)\b/.test((e.steps ?? []).join(" ")), `${where}: English in the steps`);
        assert.equal(check(e, e.plain, w).ok, true, where);
        for (const t of trapInputs(e)) {
          assert.equal(check(e, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});
