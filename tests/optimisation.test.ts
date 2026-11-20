// Optimisation (degree level) in practice: the helpers behind the answers (the corners of a linear programme, its
// shadow prices, the minimum ratio test, the KKT multiplier, the shape of a quadratic form) checked by hand, and every
// question checked against its own answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import { F } from "../src/math/calculusTwo.ts";
import { rngOf } from "../src/math/practiceKit.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { drawLp, fmax, kkt, maxCorners, minCorners, quadShape, ratioRow, shadowPrices, value, type Lp } from "../src/math/optimisation.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["linearProgramming", "simplex", "convex"];
// max 5x + 6y, 4x + y ≤ 26, 3x + 5y ≤ 28: the lines meet at (6, 2).
const LP: Lp = { a1: 4, b1: 1, c1: 26, a2: 3, b2: 5, c2: 28, X: 6, Y: 2, p: 5, q: 6 };

test("the corners of a linear programme, and its optimum where the lines meet", () => {
  assert.deepEqual(maxCorners(LP).map((pt) => value(LP, pt).tex()), ["0", "\\frac{65}{2}", "42", "\\frac{168}{5}"]);
  assert.deepEqual(minCorners(LP).map((pt) => value(LP, pt).tex()), ["156", "42", "\\frac{140}{3}"]);
  for (let seed = 1; seed <= 300; seed++) {
    const lp = drawLp(rngOf(seed));
    const z = (x: number, y: number) => lp.p * x + lp.q * y;
    // the meet beats every other corner, of max with ≤ and of min with ≥
    assert.equal(fmax(maxCorners(lp).map((pt) => value(lp, pt))).toNumber(), z(lp.X, lp.Y), `max ${seed}`);
    for (const pt of minCorners(lp)) assert.ok(value(lp, pt).toNumber() >= z(lp.X, lp.Y), `min ${seed}`);
  }
});

test("shadow prices solve the dual, the ratio test, the KKT multiplier and quadratic forms", () => {
  const [y1, y2] = shadowPrices(LP);
  assert.deepEqual([y1.tex(), y2.tex()], ["\\frac{7}{17}", "\\frac{19}{17}"]);
  // strong duality: c₁y₁ + c₂y₂ = z_max
  assert.equal(y1.mul(F(LP.c1)).add(y2.mul(F(LP.c2))).tex(), "42");
  assert.deepEqual(shadowPrices(LP, false).map((y) => y.tex()), ["\\frac{19}{17}", "\\frac{9}{17}"]);
  assert.equal(ratioRow([2, -2, 1], [3, 8, 15]), 0);
  assert.equal(ratioRow([1, 3, -1], [9, 12, 2]), 1);
  const k = kkt(3, 4, 5);
  assert.deepEqual([k.lambda, k.x.toNumber(), k.y.toNumber(), k.value.toNumber()], [2, 2, 3, 2]);
  assert.equal(kkt(1, 1, 5).lambda, 0);
  assert.deepEqual([quadShape(1, 3, 1), quadShape(1, 2, 1), quadShape(-1, 1, -1), quadShape(1, 1, 1)], [2, 0, 1, 0]);
});

test("every optimisation question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity|null/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z0-9]+\}/.test(e.prompt), `${where}: a blank left in the prompt`);
        assert.ok(!/\\text\{/.test((e.steps ?? []).join(" ")), `${where}: words in the steps`);
        assert.equal(check(e, e.plain, w).ok, true, where);
        for (const t of trapInputs(e)) {
          assert.equal(check(e, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});
