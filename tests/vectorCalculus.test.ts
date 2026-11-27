// Multivariable and vector calculus in practice: the polynomials in x, y and z the questions are made of, and every
// question checked against its own answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { at, d, polyTex, term, tidyPoly } from "../src/math/vectorCalculus.ts";

const w = en.pracWords;

test("a polynomial in x, y and z is differentiated, evaluated and written", () => {
  const f = [term(3, 2, 1), term(-1, 1, 2), term(4, 0, 0, 1), term(-5, 0)];
  assert.equal(polyTex(f), "3x^{2}y - xy^{2} + 4z - 5");
  assert.equal(polyTex(d(f, 0)), "6xy - y^{2}");
  assert.equal(polyTex(d(f, 1)), "3x^{2} - 2xy");
  assert.equal(polyTex(d(f, 2)), "4");
  assert.equal(at(f, 1, 2, 3), 3 * 2 - 4 + 12 - 5);
  assert.equal(polyTex(tidyPoly([term(2, 1), term(-2, 1)])), "0");
  assert.equal(polyTex([term(-1, 1, 1)], ["s", "t"]), "-st");
});

const SKILLS: SkillId[] = ["partials", "chainMulti", "extremaMulti", "multipleIntegrals", "changeVariables", "lineIntegrals", "divCurl", "vectorTheorems"];

test("every vector-calculus question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const ex = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${ex.q} → ${ex.plain}`;
        assert.ok(!/NaN|undefined|Infinity/.test(ex.prompt + ex.q + ex.show + ex.plain + (ex.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z]+\}/.test(ex.prompt), `${where}: a blank left in the prompt`);
        assert.equal(check(ex, ex.plain, w).ok, true, where);
        for (const t of trapInputs(ex)) {
          assert.equal(check(ex, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});

test("the worked answers agree with known values", () => {
  // ∬ over the unit disc of x² + y² is π/2; the ball of radius 1 has volume 4π/3.
  const seen = { polar: false, ball: false };
  for (let seed = 1; seed <= 300; seed++) {
    const a = exercise("changeVariables", 1, seed, w);
    if (a.q === "\\iint_{x^{2} + y^{2} \\le 1} x^{2} + y^{2} \\, dA") {
      assert.equal(a.plain, "pi/2");
      seen.polar = true;
    }
    const b = exercise("changeVariables", 3, seed, w);
    if (b.q === "\\iiint_{x^{2} + y^{2} + z^{2} \\le 1} 1 \\, dV") {
      assert.equal(b.plain, "4pi/3");
      seen.ball = true;
    }
  }
  assert.ok(seen.polar && seen.ball);
});
