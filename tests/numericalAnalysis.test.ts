// Numerical analysis (degree level) in practice: the exact arithmetic behind the answers (Lagrange bases, divided
// differences, Euler, Heun and RK4 steps, the Doolittle factorisation, matrix norms, bisection counts) checked by hand,
// and every question checked against its own answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { bisectionSteps, dividedDifferences, doolittle, eulerStep, F, heunStep, interpolate, inverse2, lagrangeBasis, norm1, normInf, rk4Step } from "../src/math/numericalAnalysis.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["floatingPoint", "interpolation", "numericalOde", "linearSolvers", "convergenceOrder"];

test("Lagrange bases, interpolation and divided differences", () => {
  // Nodes 0, 1, 2: L₀(3) = (3 − 1)(3 − 2) / ((0 − 1)(0 − 2)) = 1, and the bases sum to 1 anywhere.
  assert.equal(lagrangeBasis([0, 1, 2], 0, F(3)).toNumber(), 1);
  assert.equal([0, 1, 2].reduce((s, i) => s + lagrangeBasis([0, 1, 2], i, F(7, 2)).toNumber(), 0), 1);
  // Through (0, 0), (1, 1), (2, 4) the quadratic is x², so p(3) = 9 and f[x₀, x₁, x₂] = 1.
  assert.equal(interpolate([0, 1, 2], [0, 1, 4], F(3)).toNumber(), 9);
  const d = dividedDifferences([0, 1, 3], [1, 3, 13]);
  assert.deepEqual([d.d01.toNumber(), d.d12.toNumber(), d.d012.toNumber()], [2, 5, 1]);
});

test("one Euler, Heun and RK4 step", () => {
  // y′ = y, y(0) = 1, h = 1/2: Euler 3/2, Heun 1 + (1 + 3/2)/4 = 13/8, RK4 the degree-4 Taylor polynomial of e^h.
  const f = (_x: ReturnType<typeof F>, y: ReturnType<typeof F>) => y;
  assert.equal(eulerStep(f, F(0), F(1), F(1, 2)).tex(), "\\frac{3}{2}");
  assert.equal(heunStep(f, F(0), F(1), F(1, 2)).y1.tex(), "\\frac{13}{8}");
  const h = 1 / 2;
  assert.ok(Math.abs(rk4Step(f, F(0), F(1), F(1, 2)).y1.toNumber() - (1 + h + h ** 2 / 2 + h ** 3 / 6 + h ** 4 / 24)) < 1e-12);
});

test("LU, matrix norms and bisection counts", () => {
  const { L, U } = doolittle([
    [2, 1, 1],
    [4, 3, 3],
    [8, 7, 9],
  ])!;
  assert.deepEqual(L.map((r) => r.map((x) => x.toNumber())), [[1, 0, 0], [2, 1, 0], [4, 3, 1]]);
  assert.deepEqual(U.map((r) => r.map((x) => x.toNumber())), [[2, 1, 1], [0, 1, 1], [0, 0, 2]]);
  assert.equal(doolittle([[0, 1], [1, 0]]), null);
  const inv = inverse2([[4, 1], [2, 3]]);
  assert.deepEqual(inv.flat().map((x) => x.toNumber()), [0.3, -0.1, -0.2, 0.4]);
  const A = [[4, 1], [2, 3]].map((r) => r.map((x) => F(x)));
  assert.equal(normInf(A).toNumber(), 5);
  assert.equal(norm1(A).toNumber(), 6);
  // 2⁶ = 64 < 100 ≤ 128 = 2⁷; a bracket of length 4 needs two more.
  assert.equal(bisectionSteps(1, 2), 7);
  assert.equal(bisectionSteps(4, 2), 9);
});

test("every numerical-analysis question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
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
