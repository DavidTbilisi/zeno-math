// Functions (#725): k·f(a), a tank's depth read either way, the domain of a graph, of √(x − a) and 1/(x − a) and of a
// count, what C(a) = b means, extrema and signs read off a graph; composites and inverses from tables, graphs and
// formulas, whether g undoes f, whether a table is invertible, the domain that makes a parabola invertible, and the
// fuel for a drive. Every slip is named and its hint filled in, in every language.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

const IDS: Partial<Record<SkillId, string[]>> = {
  readFunction: ["outsideInsideSwapped", "inputOutputSwapped", "notationAsProduct", "openDotIncluded", "rootZeroExcluded", "domainSignFlipped", "extremumXForY", "relativeForAbsolute", "signIntervalsSwapped", "increasingForPositive", "domainNotWhole", "domainRangeSwapped"],
  functions: ["compositeOrderSwapped", "compositeAsProduct", "inverseReadForward", "innerConstantNotScaled", "inverseOrderWrong", "inverseAsReciprocal", "inverseSolvedWrong", "inverseNotComposed", "repeatedOutputInvertible", "restrictWrongPoint"],
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
          assert.ok(!/undefined|NaN|\{\w+\}/.test(ex.prompt + ex.plain), ex.prompt);
          for (const t of trapInputs(ex)) {
            const v = check(ex, t.input, w);
            assert.equal(v.mistake, t.id, `${level} ${seed} ${ex.prompt} ${t.input}`);
            assert.ok(v.hint && !/\{\w+\}|undefined|NaN/.test(v.hint), v.hint);
            named.add(t.id);
          }
        }
    for (const id of ids) assert.ok(named.has(id), id);
  });

test("an inverse read off a table undoes f, a composite from the table goes inside out", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const ex = exercise("functions", 1, seed, en.pracWords);
    const rows = [...ex.q.matchAll(/\\hline (\w)\(x\) & ([^\\]*)/g)].map((m) => [m[1], m[2].split(" & ").map(Number)] as const);
    if (!rows.length) continue;
    const t = Object.fromEntries(rows);
    const inv = ex.prompt.match(/f⁻¹\((\d+)\)/);
    if (inv) assert.equal(t.f[Number(ex.plain) - 1], Number(inv[1]), ex.q);
    const comp = ex.prompt.match(/(\w)\((\w)\((\d)\)\)/);
    if (comp) assert.equal(t[comp[1]][t[comp[2]][Number(comp[3])]], Number(ex.plain), ex.q);
  }
});
