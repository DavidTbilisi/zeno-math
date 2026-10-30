// The picture for the rate questions: a double number line whose marked ticks agree with the answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rateAmount, rateSvg, type RateSolution } from "../src/math/ratePics.ts";

const w = en.pracWords;

/** The answer the line stands for. */
const pictured = (s: RateSolution) => (s.ask === "rate" ? rateAmount(s, s.u) : s.ask === "total" ? rateAmount(s, s.t) : s.ask === "units" ? String(s.n) : rateAmount(s, s.v!));

test("4 kg for 28: ÷ 4 on both lines, 7 green at one kilogram; minutes get a clock", () => {
  const s: RateSolution = { ask: "rate", u: 7, n: 4, t: 28, cost: true, top: "kg", bottom: "$" };
  const { body } = rateSvg(s);
  assert.equal(body.split(">÷ 4<").length - 1, 2);
  assert.ok(body.includes(`fill="#2f9e44" font-weight="700">7<`));
  assert.ok(rateSvg({ ...s, cost: false, top: "", bottom: "ℓ" }).body.includes("<circle"));
  assert.equal(rateAmount({ cost: true }, 1.5), "1.50");
  assert.equal(rateAmount({ cost: false }, 1.5), "1.5");
});

test("every rate question draws its double number line, and the line's answer is the answer", async () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("rate", level, seed, w);
      const where = `level ${level} seed ${seed}`;
      assert.equal(ex.solution?.kind, "rate", where);
      const s = ex.solution!.spec as RateSolution;
      seen.add(s.ask);
      assert.equal(pictured(s), ex.plain, where);
      assert.ok(Math.abs(s.u * s.n - s.t) < 1e-9 && (s.ask !== "two" || Math.abs(s.u * s.m! - s.v!) < 1e-9), where);
      assert.deepEqual(check(ex, ex.plain, w), { ok: true });
      if (seed <= 8) assert.ok(!(await renderSolution(ex.solution!, en)).svg.includes("NaN"), where);
    }
  assert.deepEqual([...seen].sort(), ["rate", "total", "two", "units"]);
});
