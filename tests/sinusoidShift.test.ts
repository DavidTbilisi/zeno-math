// Sinusoids with a phase shift (#733): the first peak or trough and the top of a wave, how a·sin(bx − k) + d is
// moved, where a shifted sine first peaks, an equation from a shifted graph or from features, a tide and the warmest
// month. Every new kind's right answer passes, and each slip is named with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("sinusoid kinds: right answers pass, every slip is named", () => {
  const named = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 300; seed++) {
      const ex = exercise("trigGraphs", level, seed, w);
      assert.equal(check(ex, ex.plain, w).ok, true, `${level} ${seed} ${ex.prompt}: ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, `${level} ${seed} ${ex.prompt} ${t.input}`);
        assert.ok(v.hint && !/\{[a-zA-Z]+\}/.test(v.hint), v.hint);
        named.add(t.id);
      }
    }
  for (const id of ["peakNotScaled", "maxWithoutMidline", "phaseShiftSign", "shiftNotDividedByB", "bracketNotAroundShift", "sinPeakAtStart", "sinCosStartSwapped",
    "ampMidlineSwapped", "bAsPeriod", "amplitudeDoubled", "highTideAsMidline"])
    assert.ok(named.has(id), id);
});

test("a shifted graph is drawn with its question, and the warmest month is a quarter year after the shift", () => {
  let graphs = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const ex = exercise("trigGraphs", 3, seed, w);
    if (ex.prompt === w.tgP.graphQ) {
      assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
      graphs++;
    }
    const m = /sin\(30\(t − (\d)\)\)/.exec(ex.prompt);
    if (m && ex.answer.k === "num") assert.equal(ex.answer.v, Number(m[1]) + 3);
  }
  assert.ok(graphs > 3, String(graphs));
});
