// PDEs and Fourier series (degree level) in practice: the helpers behind the answers (exact sines and cosines of
// multiples of π, the wave solution, the discriminant type, the plain forms of multiples of πᵏ) checked by hand, and
// every question checked against its own answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { F, discriminant, piPow, sumTex, coefTex, trig, typeOf, waveAt } from "../src/math/pdes.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["fourier", "pdeClassify", "separation"];

test("exact sines and cosines, and the plucked string", () => {
  assert.equal(trig("sin", F(1, 2))!.toNumber(), 1);
  assert.equal(trig("sin", F(5, 6))!.toNumber(), 0.5);
  assert.equal(trig("cos", F(2, 3))!.toNumber(), -0.5);
  assert.equal(trig("cos", F(3))!.toNumber(), -1);
  assert.equal(trig("sin", F(-1, 2))!.toNumber(), -1);
  assert.equal(trig("sin", F(1, 4)), null);
  // u = 2 sin x cos t − sin 3x cos 3t at (π/2, π/3): 2·1·½ − (−1)(−1) = 0; at t = 0 it is 2 + 1 = 3.
  assert.equal(waveAt([[1, 2], [3, -1]], F(1, 2), F(1, 3)).toNumber(), 0);
  assert.equal(waveAt([[1, 2], [3, -1]], F(1, 2), F(0)).toNumber(), 3);
});

test("types by the discriminant, sums of terms, multiples of π", () => {
  assert.equal(typeOf(discriminant(1, 0, 1)), 0); // Laplace
  assert.equal(typeOf(discriminant(1, 0, 0)), 1); // heat
  assert.equal(typeOf(discriminant(1, 0, -1)), 2); // wave
  assert.equal(sumTex([coefTex(1, "u_{xx}"), coefTex(-2, "u_{xy}"), "", coefTex(0, "u")]), "u_{xx} - 2u_{xy}");
  const p = piPow(F(4, 3), -1);
  assert.equal(p.plain, "4/(3pi)");
  assert.ok(p.answer.k === "num" && Math.abs(p.answer.v - 4 / (3 * Math.PI)) < 1e-12);
  assert.equal(piPow(F(9, 4), 2).plain, "9pi^2/4");
  assert.equal(piPow(F(-1), 1).plain, "-pi");
});

test("every PDE and Fourier question accepts its own answer and names its slips", () => {
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
