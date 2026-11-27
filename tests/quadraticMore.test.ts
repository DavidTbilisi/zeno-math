// Quadratics by square roots and in stories (#727): x² = n², √x = n, x³ = n³ and ∛x = n; a(x − h)² = k, which
// equation square roots solve straight away, the other solution someone missed; a stone's landing, a scarf's best
// price and profit, a garden's width; y = a(x − h)² + k from its graph, a fountain's jet, and which of two parabolas
// peaks higher. Every slip is named and its hint filled in, in every language; the roots solve their equations.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

const IDS: Partial<Record<SkillId, string[]>> = {
  quadratic: ["rootOnlyPositive", "halvedNotRoot", "rootNotSquared", "cubeRootAsThird", "cubeAsTripled", "cubeNegativeRoot", "rootShiftSignKept", "notDividedFirst", "otherRootNegated", "linearTermIgnored", "negativeRootKept", "vertexPartSwapped", "otherSideGiven"],
  quadraticGraph: ["shiftWrongWay", "shiftAxesSwapped", "parabolaOpensWrongWay", "vertexTimeForLanding", "vertexPartSwapped", "vertexXCompared"],
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
          assert.ok(!/undefined|NaN|\{\w+\}/.test(ex.prompt + ex.plain + (ex.pic ? ex.pic.svg(0, 0) : "")), ex.prompt);
          for (const t of trapInputs(ex)) {
            const v = check(ex, t.input, w);
            assert.equal(v.mistake, t.id, `${level} ${seed} ${ex.prompt} ${t.input}`);
            assert.ok(v.hint && !/\{\w+\}|undefined|NaN/.test(v.hint), v.hint);
            named.add(t.id);
          }
        }
    for (const id of ids) assert.ok(named.has(id), id);
  });

test("square-root equations: the roots solve them, and one root alone is not enough", () => {
  let n = 0;
  for (let seed = 1; seed <= 300; seed++)
    for (const level of [1, 2] as const) {
      const ex = exercise("quadratic", level, seed, en.pracWords);
      const mt = /^(\d?)\(?(x(?: [-+] \d+)?)\)?\^2(?: \+ (\d+))? = (\d+)$/.exec(ex.q);
      if (!mt || ex.answer.k !== "set") continue;
      const [a, c] = [Number(mt[1] || 1), Number(mt[3] || 0)];
      const f = new Function("x", `return ${a} * (${mt[2]}) ** 2 + ${c};`) as (x: number) => number;
      for (const x of ex.answer.vs) assert.equal(f(x), Number(mt[4]), `${ex.q} at ${x}`);
      assert.equal(ex.answer.vs.length, 2, ex.q);
      assert.equal(check(ex, String(ex.answer.vs[1]), en.pracWords).ok, false, ex.q);
      n++;
    }
  assert.ok(n > 50, String(n));
});
