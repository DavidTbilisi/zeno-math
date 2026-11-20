// Complex analysis (degree level) in practice: the exact helpers (polynomials in z, π multiples, Laurent coefficients
// on an annulus) checked by hand and against a numerical contour integral, and every question checked against its own
// answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { annulusCoefficient, cderiv, cpoly, piCx, termsTex, twoPiI, zPow } from "../src/math/complexAnalysis.ts";
import { cx } from "../src/math/complexPractice.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["analytic", "contour", "laurent", "residueCalc"];

test("polynomials in z and their derivatives", () => {
  // z² + 1 at i is 0; its derivative 2z at 1 + i is 2 + 2i
  assert.deepEqual(cpoly([cx(1), cx(0), cx(1)], cx(0, 1)), cx(0, 0));
  assert.deepEqual(cpoly(cderiv([cx(1), cx(0), cx(1)]), cx(1, 1)), cx(2, 2));
  assert.equal(termsTex([[3, "x^{2}"], [-1, "xy"], [2, ""]]), "3x^{2} - xy + 2");
  assert.equal(termsTex([[0, "x"]]), "0");
});

test("multiples of π, typed and shown", () => {
  assert.equal(piCx(-4, 6).plain, "-4pi + 6pi i");
  assert.equal(piCx(0, 2).tex, "2\\pi i");
  assert.equal(piCx(1, 0).plain, "pi");
  assert.equal(piCx(0, 0).plain, "0");
  // 2πi(3 + 2i) = −4π + 6πi
  assert.equal(twoPiI(cx(3, 2)).plain, "-4pi + 6pi i");
  assert.equal(zPow(-2), "z⁻²");
});

test("the Laurent coefficients on the annulus agree with a contour integral", () => {
  for (const [a, b] of [[1, 3], [-2, 3], [2, -4], [-1, -4]])
    for (const k of [-2, -1, 0, 1]) {
      // c_k = (1/2πi) ∮ f(z) z^{−k−1} dz over |z| = ρ between the poles, by the trapezoid rule
      const rho = (Math.abs(a) + Math.abs(b)) / 2;
      const N = 2000;
      let re = 0;
      for (let j = 0; j < N; j++) {
        const t = (2 * Math.PI * j) / N;
        const z = [rho * Math.cos(t), rho * Math.sin(t)];
        const mul = (p: number[], q: number[]) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
        const inv = (p: number[]) => [p[0] / (p[0] ** 2 + p[1] ** 2), -p[1] / (p[0] ** 2 + p[1] ** 2)];
        const f = inv(mul([z[0] - a, z[1]], [z[0] - b, z[1]]));
        // dz/(2πi) = z dt/(2π), so the integrand is f(z) z^{−k} / N
        let zk = [1, 0];
        for (let i = 0; i < Math.abs(k); i++) zk = k > 0 ? mul(zk, inv(z)) : mul(zk, z);
        re += mul(f, zk)[0] / N;
      }
      const [p, q] = annulusCoefficient(a, b, k);
      assert.ok(Math.abs(re - p / q) < 1e-9, `${a} ${b} ${k}: ${re} against ${p}/${q}`);
    }
});

test("every complex-analysis question accepts its own answer and names its slips", () => {
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
