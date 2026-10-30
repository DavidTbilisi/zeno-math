// The pictures for the ratio questions: the bar model with what is asked green, and the working through one part.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { ratioSteps, ratioSvg, type RatioSolution } from "../src/math/ratioPics.ts";

const w = en.pracWords;
const GREEN = "#b2f2bb";

/** The answer a picture stands for: a share, the total, the parts of each, or A's parts out of all. */
function pictured(s: RatioSolution): string {
  const t = s.vs.reduce((a, v) => a + v, 0);
  if (s.pic === "simplify") return s.vs.join(" : ");
  if (s.pic === "partKnown") return String(s.u * (s.whole ? t : s.vs[1]));
  if (s.pic === "share") return String(s.u * s.vs[s.who]);
  return `${s.vs[0]}/${t}`;
}

test("A has 42 in 6 : 1: one part is 7 and B's row is green; the working never names the total for B", () => {
  const s: RatioSolution = { pic: "partKnown", vs: [6, 1], u: 7, whole: false };
  assert.deepEqual(ratioSteps(s), ["A = 6\\square = 42", "1\\square = 42 \\div 6 = 7", "B = 1\\square = 1 \\times 7 = 7"]);
  assert.ok(ratioSvg(s).body.includes(GREEN));
  assert.deepEqual(ratioSteps({ pic: "simplify", vs: [7, 1], k: 5 }), ["35 : 5 = (35 \\div 5) : (5 \\div 5)", "= 7 : 1"]);
});

test("every ratio question draws its bar model, and the picture's answer is the answer", async () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("ratio", level, seed, w);
      const where = `level ${level} seed ${seed}`;
      assert.equal(ex.solution?.kind, "ratio", where);
      const s = ex.solution!.spec as RatioSolution;
      seen.add(s.pic);
      assert.equal(pictured(s), ex.plain, where);
      assert.deepEqual(check(ex, ex.plain, w), { ok: true });
      if (seed <= 8) assert.ok(!(await renderSolution(ex.solution!, en)).svg.includes("NaN"), where);
    }
  assert.deepEqual([...seen].sort(), ["fraction", "partKnown", "share", "simplify"]);
});
