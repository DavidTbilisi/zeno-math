// Mathematical statistics (degree level) in practice: the exact sums behind the answers (least-squares line, χ²,
// expected counts, ANOVA sums of squares, the binomial likelihood) checked by hand, and every question checked against
// its own answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { chiSquare, expectedTable, F, grandMean, likelihood, lsLine, meanOf, ssBetween, sxx, sxy } from "../src/math/mathStats.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["estimators", "mle", "regression", "chiSquared", "anova", "bayes"];

test("the least-squares line, χ², expected counts, ANOVA sums and the likelihood", () => {
  const xs = [1, 2, 3, 4];
  const ys = [2, 3, 5, 6];
  assert.equal(meanOf(xs).tex(), "\\frac{5}{2}");
  assert.equal(sxx(xs).toNumber(), 5);
  assert.equal(sxy(xs, ys).toNumber(), 7);
  const { a, b } = lsLine(xs, ys);
  assert.equal(b.toNumber(), 1.4);
  assert.equal(a.toNumber(), 0.5);
  // O = (10, 20, 30), E = 20 each: Σ(O − E)²/E = (100 + 0 + 100)/20 = 10.
  const c = chiSquare([10, 20, 30], [F(20), F(20), F(20)]);
  assert.equal(c.stat.toNumber(), 10);
  assert.equal(c.undivided.toNumber(), 200);
  assert.ok(Math.abs(c.byObserved.toNumber() - (10 + 100 / 30)) < 1e-12);
  const e = expectedTable([
    [10, 30],
    [20, 40],
  ]);
  assert.deepEqual(
    e.flat().map((v) => v.toNumber()),
    [12, 28, 18, 42],
  );
  // Groups of 2 and 4 with means 1 and 4: grand mean 3, SSB = 2·4 + 4·1 = 12.
  assert.equal(grandMean([2, 4], [1, 4]).toNumber(), 3);
  assert.equal(ssBetween([2, 4], [1, 4]).toNumber(), 12);
  assert.equal(likelihood(F(1, 2), 2, 3).toNumber(), 1 / 8);
  assert.equal(likelihood(F(1, 3), 1, 2).toNumber(), 2 / 9);
});

test("every statistics question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z0-9]+\}/.test(e.prompt), `${where}: a blank left in the prompt`);
        assert.ok(!/\\text\{/.test((e.steps ?? []).join(" ")), `${where}: words in the steps`);
        assert.equal(check(e, e.plain, w).ok, true, where);
        for (const t of trapInputs(e)) {
          assert.equal(check(e, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});
