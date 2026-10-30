// The pictures for rounding and estimation: what each picture shows agrees with the answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { renderRound, roundWork, type RoundSolution } from "../src/math/roundPics.ts";

const w = en.pracWords;

test("56789 to the nearest 100: between 56700 and 56800, the 8 decides, up", () => {
  assert.deepEqual(roundWork(56789, 0, -2), { lo: 56700, hi: 56800, want: 56800, decider: 8 });
  assert.deepEqual(roundWork(1234, 5, 3), { lo: 1200, hi: 1300, want: 1200, decider: 3 });
  // "3 < 5" is written escaped, so the picture stays valid XML.
  assert.ok(renderRound({ pic: "round", m: 1234, p: 5, k: 3 }, null).svg.includes("3 &lt; 5"));
});

test("every rounding and estimation question draws its picture, and the picture agrees with the answer", async () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("rounding", level, seed, w);
      const where = `level ${level} seed ${seed}`;
      assert.equal(ex.solution?.kind, "round", where);
      const s = ex.solution!.spec as RoundSolution;
      seen.add(s.pic);
      const v = Number(ex.plain.replace("*10^", "e"));
      if (s.pic === "round") assert.ok(Math.abs(roundWork(s.m, s.p, s.k).want / 10 ** s.p - v) < 1e-9, where);
      if (s.pic === "estimate") assert.ok(Math.abs(s.x1 * s.y1 - v) < 1e-6 * Math.max(1, v), where);
      if (s.pic === "bound") assert.ok(Math.abs(s.x + (s.low ? -s.unit : s.unit) / 2 - v) < 1e-9, where);
      if (s.pic === "boundTotal") assert.equal(s.n * (s.x + 0.5), v, where);
      if (s.pic === "std") assert.ok(Math.abs(Number(s.text) - v) < 1e-9 * Math.max(1, v) && Math.abs(Number(s.text) / 10 ** s.e) < 10, where);
      if (s.pic === "stdMul") assert.ok(Math.abs(Number(s.mant) * 10 ** s.e - v) < 1e-9 * Math.abs(v) && Number(s.mant) < 10, where);
      assert.deepEqual(check(ex, ex.plain, w), { ok: true }, where);
      if (seed <= 12) {
        assert.ok(!(await renderSolution(ex.solution!, en)).svg.includes("NaN"), where);
      }
    }
  assert.deepEqual([...seen].sort(), ["bound", "boundTotal", "estimate", "round", "std", "stdMul"]);
});
