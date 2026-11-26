// Models in words (#731): what a formula's numbers stand for, the axes' labels, a year at a gym and a profit written
// in letters, someone's working with algebraic fractions checked, two pipes together and two juices mixed. Every new
// kind's right answer passes, and each slip is named with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("new formula and algebraic fraction kinds: right answers pass, every slip is named", () => {
  const named = new Set<string>();
  for (const skill of ["formulae", "algFractions"] as const)
    for (const level of [2, 3] as const)
      for (let seed = 1; seed <= 300; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(check(ex, ex.plain, w).ok, true, `${skill} ${level} ${seed} ${ex.prompt}: ${ex.plain}`);
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, w);
          assert.equal(v.mistake, t.id, `${skill} ${level} ${seed} ${ex.prompt} ${t.input}`);
          assert.ok(v.hint && !/\{[a-zA-Z]+\}/.test(v.hint), v.hint);
          named.add(t.id);
        }
      }
  for (const id of ["termMeaningSwapped", "axisLabelsSwapped", "rateNotScaled", "bracketSignKept", "cancelTerms", "divisionNotFlipped", "workTimesAdded", "workTimesAveraged", "mixtureEqualParts"])
    assert.ok(named.has(id), id);
});

test("the pipes' time and the juice's litres balance", () => {
  let pipes = 0;
  let mixes = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const ex = exercise("algFractions", 3, seed, w);
    const v = (ex.answer as { v?: number }).v;
    const p = /in (\d+) hours and another in (\d+) hours/.exec(ex.prompt);
    if (p && v !== undefined) {
      assert.ok(Math.abs(v * (1 / Number(p[1]) + 1 / Number(p[2])) - 1) < 1e-9, ex.prompt);
      pipes++;
    }
    const m = /of a (\d+) % juice must be added to (\d+) litres of a (\d+) % juice to make a (\d+) %/.exec(ex.prompt);
    if (m && v !== undefined) {
      const [hi, V, lo, mix] = m.slice(1).map(Number);
      assert.ok(Math.abs(hi * v + lo * V - mix * (V + v)) < 1e-9, ex.prompt);
      mixes++;
    }
  }
  assert.ok(pipes > 5 && mixes > 3, `${pipes} ${mixes}`);
});
