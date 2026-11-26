// Sequences and series (#729): recursive and explicit rules, the next term after negatives and fractions, a theatre's
// rows, a video's views, a row count's domain and a finite geometric series in a story. Every new kind's right answer
// passes, and each slip is named with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("new sequence and series kinds: right answers pass, every slip is named", () => {
  const named = new Set<string>();
  for (const [skill, levels] of [["sequences", [1, 2, 3]], ["series", [2]]] as const)
    for (const level of levels)
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
  for (const id of ["recursiveStepCount", "explicitStartOff", "startDiffSwapped", "addAsMultiply", "startRatioSwapped", "geomAsArith", "ratioSignDropped", "termNumberNotWhole", "domainStartsAtZero", "lastTermForSum", "seriesOneTooMany"])
    assert.ok(named.has(id), id);
});

test("a recursive rule is evaluated step by step, and a story's total is the sum of its days", () => {
  let evals = 0;
  let stories = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const ex = exercise("sequences", 1, seed, w);
    const m = /a\(1\) = (−?\d+), a\(n\) = (2)?a\(n − 1\) ([+−]) (\d+)\. Find a\((\d+)\)/.exec(ex.prompt);
    if (m) {
      const k = Number(m[5]);
      const c = (m[3] === "−" ? -1 : 1) * Number(m[4]);
      let v = Number(m[1].replace("−", "-"));
      for (let i = 1; i < k; i++) v = m[2] ? 2 * v + c : v + c;
      assert.equal((ex.answer as { v: number }).v, v, ex.prompt);
      evals++;
    }
    const s = exercise("series", 2, seed, w);
    const t = /^(\d+) people .* (twice|three times) as many .* first (\d+) days/.exec(s.prompt);
    if (t) {
      const [a, q, n] = [Number(t[1]), t[2] === "twice" ? 2 : 3, Number(t[3])];
      let sum = 0;
      for (let i = 0; i < n; i++) sum += a * q ** i;
      assert.equal((s.answer as { v: number }).v, sum, s.prompt);
      stories++;
    }
  }
  assert.ok(evals > 10 && stories > 10, `${evals} ${stories}`);
});
