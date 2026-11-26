// Polynomials by division and structure (#728): a polynomial divided by kx, by x with its remainder, by x + p and by
// x − a; k from a factor; sums and differences of cubes, (x + k)³, a quartic factorised completely and a quadratic in
// (x + a) by substitution; and which pattern a quadratic fits. Every slip is named and its hint filled in, in every
// language; synthetic division gives back the polynomial.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import { divideLin } from "../src/math/skills/polynomials.ts";

const IDS: Partial<Record<SkillId, string[]>> = {
  polynomials: ["divisorPowerKept", "divisorNumberKept", "remainderDropped", "syntheticSignKept", "remainderAtMinusA", "cubeFactorSign", "cubeOfDifference", "cubeMiddleDropped", "notFullyFactored", "substituteNotReturned"],
  factor: ["sumOfSquaresFactored", "middleNotDouble"],
};

for (const [skill, ids] of Object.entries(IDS) as [SkillId, string[]][])
  test(`${skill}: the new kinds' slips are named, their hints filled in`, () => {
    const named = new Set<string>();
    for (const words of [en, ka, ru])
      for (const level of [1, 2, 3] as const)
        for (let seed = 1; seed <= 250; seed++) {
          const w = words.pracWords;
          const ex = exercise(skill, level, seed, w);
          assert.equal(check(ex, ex.plain, w).ok, true, `${level} ${seed} ${ex.prompt}`);
          assert.ok(!/undefined|NaN|\{\w+\}/.test(ex.prompt + ex.plain) && !ex.plain.includes("(x)"), ex.prompt);
          for (const t of trapInputs(ex)) {
            const v = check(ex, t.input, w);
            assert.equal(v.mistake, t.id, `${level} ${seed} ${ex.prompt} ${t.input}`);
            assert.ok(v.hint && !/\{\w+\}|undefined|NaN/.test(v.hint), v.hint);
            named.add(t.id);
          }
        }
    for (const id of ids) assert.ok(named.has(id), id);
  });

test("synthetic division: quotient times (x − a) plus the remainder is the polynomial", () => {
  const at = (cs: number[], x: number) => cs.reduceRight((acc, c) => acc * x + c, 0);
  for (const [cs, a] of [[[-4, 12, -7, 1], 2], [[5, 0, 3], -1], [[6, 11, 6, 1], -3], [[1, 1, 1, 1, 1], 4]] as [number[], number][]) {
    const { q, rem } = divideLin(cs, a);
    assert.equal(q.length, cs.length - 1);
    assert.equal(rem, at(cs, a), "the remainder is f(a)");
    for (const x of [-2, 0, 1, 3, 5]) assert.equal(at(q, x) * (x - a) + rem, at(cs, x), `${cs} at ${x}`);
  }
});
