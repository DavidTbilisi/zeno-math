// The picture for "divisible by?": a row for each divisor offered, whose ✓ or ✗ and check agree with the answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { divLook, divisibleSvg, ENDINGS, type DivSolution } from "../src/math/divisiblePics.ts";

const w = en.pracWords;

test("3748: the last digit for 2, the last two for 4, the digit sum as dots for 3 and 9, remainders red", () => {
  const { body } = divisibleSvg({ n: 3748, offered: [2, 3, 4, 5, 6, 8, 9, 10] });
  assert.ok(body.includes(">3740 + <tspan") && body.includes(">3700 + <tspan") && body.includes(">3000 + <tspan"));
  assert.ok(body.includes(">48 = 4 × 12<"), "48 is twelve fours");
  assert.ok(body.includes(`>748 = 8 × 93 <tspan fill="#e03131">+ 4</tspan>`), "748 leaves 4");
  assert.ok(body.includes(">3 + 7 + 4 + 8 = 22<") && body.includes(`22 = 3 × 7 <tspan fill="#e03131">+ 1</tspan>`));
  // 22 dots: seven threes and one over (red), then two nines and four over.
  assert.equal(body.split('fill="#e03131"/>').length - 1, 1 + 4);
  assert.equal(body.split(">✓<").length - 1, 2, "2 and 4");
  assert.deepEqual([divLook(8), divLook(9), divLook(6)], [{ by: "end", k: 3 }, { by: "sum" }, { by: "both" }]);
  // A three-digit number for 8: every digit looked at, nothing split off.
  assert.ok(!divisibleSvg({ n: 612, offered: [8] }).body.includes(" + <tspan"));
});

test("every divisibility question: one row per divisor, ticks where the answer is, the last digit's ending green", async () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 100; seed++) {
      const ex = exercise("divisibility", level, seed, w);
      const where = `level ${level} seed ${seed}`;
      assert.equal(ex.solution?.kind, "divisible", where);
      const s = ex.solution!.spec as DivSolution;
      if (ex.answer.k !== "divisors") throw new Error("not a divisors question");
      const { body } = divisibleSvg(s);
      assert.equal(body.split(">✓<").length - 1, ex.answer.right.length, where);
      assert.equal(body.split(">✗<").length - 1, s.offered.length - ex.answer.right.length, where);
      const ends = s.offered.filter((d) => ENDINGS[d]?.includes(s.n % 10)).length;
      assert.equal(body.split('fill="#ffffff" font-weight="700">').length - 1, ends + ex.answer.right.length, where);
      if (seed <= 5) {
        const r = await renderSolution(ex.solution!, en);
        assert.ok(!r.svg.includes("NaN") && !r.svg.includes("undefined"), where);
      }
    }
});
