// Systems of equations (#724): checking a pair, counting solutions from a graph, from the equations and from a story,
// the elimination factor, ticket, age and shop stories, the k for infinitely many solutions; and in rootEquations a
// linear equation solved on its graph, the points a parabola and a line meet at, a quadratic system's larger x and
// the drone. Every slip is named and its hint filled in, in every language.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const IDS = {
  simultaneous: ["oneEquationChecked", "pointCoordsSwapped", "linesCountMisread", "eliminationSignWrong", "otherUnknownGiven", "systemCoefficientsSwapped", "systemScaleMissed"],
  rootEquations: ["crossingYGiven", "quadMeetCount", "laterMeetingGiven"],
};

for (const [skill, ids] of Object.entries(IDS))
  test(`${skill}: the new kinds' slips are named, their hints filled in`, () => {
    const named = new Set<string>();
    for (const words of [en, ka, ru])
      for (const level of [1, 2, 3] as const)
        for (let seed = 1; seed <= 150; seed++) {
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

test("the systems' answers hold: a pair checked, a count from the equations", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const ex = exercise("simultaneous", 2, seed, en.pracWords);
    if (ex.prompt !== en.pracWords.sysP.algCount) continue;
    const m = ex.q.match(/cases\} (.*) \\\\ (.*) \\end/)!;
    const coef = (e: string) => {
      const [, a, b, c] = e.match(/^(-?\d*)x ([+-] \d*)y = (-?\d+)$/)!;
      const n = (s: string) => (s === "" ? 1 : s === "-" ? -1 : Number(s));
      return [n(a), n(b.replace(" ", "")) || (b.startsWith("-") ? -1 : 1), Number(c)];
    };
    const [[a1, b1, c1], [a2, b2, c2]] = [coef(m[1]), coef(m[2])];
    const count = a1 * b2 !== a2 * b1 ? "one" : a1 * c2 === a2 * c1 && b1 * c2 === b2 * c1 ? "many" : "none";
    assert.equal(ex.plain, en.pracWords.sysP[count], ex.q);
  }
});
