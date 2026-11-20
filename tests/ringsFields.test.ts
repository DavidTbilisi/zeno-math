// Rings and fields (degree level) in practice: the helpers (units and zero divisors of ℤₙ, polynomial arithmetic over
// ℤ and ℤₚ, the cubic discriminant, Euler's φ, surds) checked by hand, GF(4) and GF(8) checked to be fields, and every
// question checked against its own answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import {
  cubicDiscriminant,
  evalMod,
  isSquare,
  mulIn,
  mulPoly,
  polyPlain,
  polyTex,
  reduceMod,
  remPoly,
  rootsMod,
  surdPlain,
  surdTex,
  totient,
  unitsOf,
  zeroDivisorsOf,
  type Poly,
} from "../src/math/ringsFields.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["rings", "polyRings", "fieldExt", "finiteFields", "galois"];

test("the units and zero divisors of ℤₙ split its non-zero elements", () => {
  assert.deepEqual(unitsOf(12), [1, 5, 7, 11]);
  assert.deepEqual(zeroDivisorsOf(12), [2, 3, 4, 6, 8, 9, 10]);
  assert.deepEqual(zeroDivisorsOf(7), []);
  for (const n of [8, 9, 10, 12, 14, 15]) assert.equal(unitsOf(n).length + zeroDivisorsOf(n).length, n - 1);
});

test("polynomial arithmetic over ℤ and ℤₚ", () => {
  // (x + 1)(x − 1) = x² − 1
  assert.deepEqual(mulPoly([1, 1], [-1, 1]), [-1, 0, 1]);
  // x³ on division by x³ + x + 1 leaves −x − 1, which is x + 1 mod 2
  assert.deepEqual(remPoly([0, 0, 0, 1], [1, 1, 0, 1]), [-1, -1]);
  assert.deepEqual(reduceMod([-1, -1], 2), [1, 1]);
  // in GF(4) = ℤ₂[x]/(x² + x + 1), x · x = x + 1
  assert.deepEqual(mulIn([0, 1], [0, 1], [1, 1, 1], 2), [1, 1]);
  assert.equal(evalMod([1, 0, 1], 2, 5), 0);
  assert.deepEqual(rootsMod([1, 0, 1], 5), [2, 3]);
  assert.equal(polyTex([-1, 2, 0, 1]), "x^{3} + 2x - 1");
  assert.equal(polyPlain([-1, 2, 0, 1]), "x^3 + 2x - 1");
  assert.equal(polyPlain([0, -1]), "-x");
  assert.equal(polyPlain([]), "0");
});

test("ℤₚ[x]/(f) is a field for the moduli the questions use", () => {
  const fields: [number, Poly][] = [[2, [1, 1, 1]], [2, [1, 1, 0, 1]], [3, [1, 0, 1]], [5, [2, 0, 1]], [7, [1, 0, 1]]];
  for (const [p, f] of fields) {
    // degree 2 or 3 with no root: irreducible
    assert.deepEqual(rootsMod(f, p), [], `${p} ${f}`);
    const n = f.length - 1;
    const all: Poly[] = Array.from({ length: p ** n }, (_, k) => Array.from({ length: n }, (_, i) => Math.floor(k / p ** i) % p));
    for (const a of all.slice(1)) assert.ok(all.some((b) => polyPlain(mulIn(a, b, f, p)) === "1"), `${a} has an inverse mod ${f}, p = ${p}`);
  }
  // the quadratics with no root over ℤ₂ and ℤ₃, whose products are the quartics that still factor
  for (const [p, g] of [[2, [1, 1, 1]], [3, [1, 0, 1]], [3, [2, 1, 1]], [3, [2, 2, 1]]] as [number, Poly][]) assert.deepEqual(rootsMod(g, p), []);
});

test("the discriminant, φ and surds", () => {
  assert.equal(cubicDiscriminant(-3, 1), 81);
  assert.equal(cubicDiscriminant(-21, 7), 189 ** 2);
  assert.equal(cubicDiscriminant(0, -2), -108);
  assert.ok(isSquare(81) && !isSquare(148) && !isSquare(-4));
  assert.deepEqual([1, 6, 12, 15, 26, 80].map(totient), [1, 2, 4, 8, 12, 32]);
  assert.equal(surdTex(3, -2, 2), "3 - 2\\sqrt{2}");
  assert.equal(surdPlain(0, -1, 5), "-sqrt(5)");
  assert.equal(surdPlain(1, 3, 7), "1 + 3sqrt(7)");
});

test("every rings-and-fields question accepts its own answer and names its slips", () => {
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
