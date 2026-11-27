// Exponential and logarithmic models (#730): the start and the rate read from a·bᵗ, the time to halve, the yearly
// factor of a·b^(kt), a decay function written, exponential passing linear, equations solved with logs, an equation
// turned into a log and back, the change of base rule, decibels and the Richter scale. Every new kind's right answer
// passes, and each slip is named with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("new exponential and log kinds: right answers pass, every slip is named", () => {
  const named = new Set<string>();
  for (const skill of ["exponential", "logs"] as const)
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 300; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(check(ex, ex.plain, w).ok, true, `${skill} ${level} ${seed} ${ex.prompt}: ${ex.plain}`);
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, w);
          assert.equal(v.mistake, t.id, `${skill} ${level} ${seed} ${ex.prompt} ${ex.q} ${t.input}`);
          assert.ok(v.hint && !/\{[a-zA-Z]+\}/.test(v.hint), v.hint);
          named.add(t.id);
        }
      }
  for (const id of ["factorForStart", "factorAsPercent", "timeScaleInverted", "exponentScaleIgnored", "decayAsGrowth", "logBeforeDivide", "exponentAsDivide",
    "logFormSwapped", "logResultSwapped", "changeBaseFlipped", "changeBaseAsQuotient", "decibelTenDropped", "magnitudeDiffAsTimes", "exponentDividedFirst"])
    assert.ok(named.has(id), id);
});

test("exponential passes linear in the year the answer says, and the log answers solve their equations", () => {
  let versus = 0;
  let solved = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const ex = exercise("exponential", 2, seed, w);
    const m = /start at (\d+) lari\. Plan A adds (\d+) lari a year; plan B grows by (\d+) %/.exec(ex.prompt);
    if (m) {
      const [P, d, p] = m.slice(1).map(Number);
      const n = (ex.answer as { v: number }).v;
      const b = (k: number) => P * (1 + p / 100) ** k;
      assert.ok(b(n) > P + d * n && b(n - 1) <= P + d * (n - 1), ex.prompt);
      versus++;
    }
    for (const skill of ["exponential", "logs"] as const) {
      const e = exercise(skill, 3, seed, w);
      const q = /^(\d*)e\^\{(\d*)x\} = (\d+)$/.exec(e.q) ?? /^(\d+)\^\{x\} = (\d+)$/.exec(e.q);
      if (!q) continue;
      const x = (e.answer as { v: number }).v;
      const lhs = q.length === 4 ? Number(q[1] || 1) * Math.exp(Number(q[2] || 1) * x) : Number(q[1]) ** x;
      const rhs = Number(q[q.length - 1]);
      assert.ok(Math.abs(lhs - rhs) / rhs < 0.03, `${e.q}: ${x}`);
      solved++;
    }
  }
  assert.ok(versus > 5 && solved > 20, `${versus} ${solved}`);
});
