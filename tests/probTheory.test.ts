// Probability theory (degree level) in practice: the exact helpers (matrix products, the stationary distribution, the
// normal tail) checked by hand, and every question checked against its own answer (right as shown, the named slips
// wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { F, matMul, Phi, rowTimes, stationaryTwo, sum } from "../src/math/probTheory.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";

const w = en.pracWords;

test("matrix products, a step of a chain and the stationary distribution", () => {
  const P = [[F(1, 2), F(1, 2)], [F(1, 4), F(3, 4)]];
  const P2 = matMul(P, P);
  assert.deepEqual(P2.map((r) => r.map((x) => x.toNumber())), [[3 / 8, 5 / 8], [5 / 16, 11 / 16]]);
  for (const row of P2) assert.ok(sum(row).isOne());
  assert.deepEqual(rowTimes([F(1), F(0)], P).map((x) => x.toNumber()), [1 / 2, 1 / 2]);
  for (const [a, b] of [[F(1, 2), F(1, 4)], [F(1, 3), F(2, 5)], [F(4, 5), F(1, 5)]]) {
    const pi = stationaryTwo(a, b);
    const step = rowTimes(pi, [[F(1).sub(a), a], [b, F(1).sub(b)]]);
    assert.ok(step.every((x, i) => x.sub(pi[i]).isZero()));
    assert.ok(sum(pi).isOne());
  }
});

test("the normal distribution function", () => {
  assert.ok(Math.abs(Phi(0) - 0.5) < 1e-9);
  assert.ok(Math.abs(Phi(1.96) - 0.975) < 1e-3);
  assert.ok(Math.abs(Phi(-1) - 0.1587) < 1e-3);
  for (const z of [-2.5, -1, 0.3, 1.7]) assert.ok(Math.abs(Phi(z) + Phi(-z) - 1) < 1e-9);
});

const SKILLS: SkillId[] = ["densities", "jointDist", "mgf", "limitTheorems", "markov"];

test("every probability-theory question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z0-9]+\}/.test(e.prompt), `${where}: a blank left in the prompt`);
        assert.ok(!/\\text\{[^}]*\b(and|the|of|so|is)\b/.test((e.steps ?? []).join(" ")), `${where}: English in the steps`);
        assert.equal(check(e, e.plain, w).ok, true, where);
        for (const t of trapInputs(e)) {
          assert.equal(check(e, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});
