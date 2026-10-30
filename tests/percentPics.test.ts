// The pictures for the percentage questions: bars cut into equal chunks, each chunk's amount in it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { percentStep, percentSteps, renderPercent, type PercentSolution } from "../src/math/percentPics.ts";
import { check, exercise } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";

const w = en.pracWords;

test("40% of 60 in chunks of 20% (12 each); 60 → 78 is three chunks of 10%; 130% = 78 makes 10% = 6", () => {
  assert.deepEqual(percentStep({ pic: "of", p: 40, a: 60 }), { step: 20, p: 40, whole: 60, unit: 12 });
  assert.deepEqual(percentSteps({ pic: "of", p: 40, a: 60 }), ["100\\% = 60", "20\\% = 60 \\div 5 = 12", "40\\% = 2 \\times 12 = 24"]);
  assert.deepEqual(percentStep({ pic: "change", a: 60, b: 78 }), { step: 10, p: 30, whole: 60, unit: 6 });
  assert.equal(percentSteps({ pic: "change", a: 600, b: 570 }).at(-1), "-1 \\times 5\\% = -5\\%");
  assert.deepEqual(percentStep({ pic: "reverse", p: 30, now: 78, up: true }), { step: 10, p: 30, whole: 60, unit: 6 });
  const svg = renderPercent({ pic: "change", a: 600, b: 570 }, null).svg;
  assert.ok(svg.includes("−30 = −5%") && svg.includes("stroke-dasharray"));
});

test("every percentage question's chunks are whole amounts and add up to its answer", async () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("percent", level, seed, w);
      const where = `level ${level} seed ${seed}`;
      assert.equal(ex.solution?.kind, "percent", where);
      const s = ex.solution!.spec as PercentSolution;
      const { step, p, whole, unit } = percentStep(s);
      assert.ok(Number.isInteger(unit) && 100 % step === 0 && p % step === 0, where);
      const answer = Number.parseFloat(ex.plain);
      if (s.pic === "of") assert.equal((p / step) * unit, answer, where);
      else if (s.pic === "change") assert.equal(s.b > s.a ? p : -p, answer, where);
      else assert.equal(whole, answer, where);
      assert.deepEqual(check(ex, ex.plain, w), { ok: true });
      if (seed <= 10) assert.ok(!(await renderSolution(ex.solution!, en)).svg.includes("NaN"), where);
    }
});
