// Group theory in practice: the number theory and permutations the answers are made of, checked against brute force,
// and every question checked against its own answer (right as shown, the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { addOrder, compose, cyclesOf, cyclesTex, divisors, fromCycles, invMod, lcm, mod, mulOrder, multiples, permOrder, phi, powers, primesBelow, signOf, twoLineTex } from "../src/math/groups.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";

const w = en.pracWords;

test("orders, inverses and φ in ℤₙ and U(n) match counting by hand", () => {
  for (let n = 2; n <= 30; n++)
    for (let a = 1; a < n; a++) {
      let k = 1;
      while ((k * a) % n !== 0) k++;
      assert.equal(addOrder(a, n), k, `|${a}| in ℤ${n}`);
      const inv = Array.from({ length: n }, (_, b) => b).find((b) => (a * b) % n === 1);
      assert.equal(Number.isNaN(invMod(a, n)) ? undefined : invMod(a, n), inv, `${a}⁻¹ mod ${n}`);
      if (inv !== undefined) {
        assert.equal(mulOrder(a, n), powers(a, n).length);
        assert.equal(powers(a, n).at(-1), 1);
      }
    }
  assert.deepEqual([phi(1), phi(9), phi(12), phi(13)], [1, 6, 4, 12]);
  assert.deepEqual(primesBelow(12), [2, 3, 5, 7, 11]);
  assert.deepEqual(divisors(12), [1, 2, 3, 4, 6, 12]);
  assert.deepEqual(multiples(3, 12), [0, 3, 6, 9]);
  assert.equal(mod(-3, 7), 4);
  assert.equal(lcm(4, 6), 12);
});

test("permutations compose right to left and split into cycles", () => {
  const s = fromCycles([[1, 2, 3]], 4);
  const t = fromCycles([[1, 2]], 4);
  assert.deepEqual(s, [2, 3, 1, 4]);
  // στ: τ first. 1 → 2 → 3, 2 → 1 → 2, 3 → 3 → 1.
  assert.deepEqual(compose(s, t), [3, 2, 1, 4]);
  assert.deepEqual(cyclesOf(compose(s, t)), [[1, 3]]);
  assert.deepEqual(cyclesOf([1, 2, 3]), []);
  assert.equal(cyclesTex([]), "e");
  assert.equal(cyclesTex([[1, 4], [2, 3, 5]]), "(1\\,4)(2\\,3\\,5)");
  assert.equal(permOrder(fromCycles([[1, 2], [3, 4, 5]], 5)), 6);
  assert.equal(signOf([[1, 2, 3]]), 1);
  assert.equal(signOf([[1, 2, 3, 4]]), -1);
  assert.equal(twoLineTex([2, 1]), "\\begin{pmatrix} 1 & 2 \\\\ 2 & 1 \\end{pmatrix}");
});

const SKILLS: SkillId[] = ["groups", "elementOrder", "subgroups", "permutations", "homomorphisms"];

test("every group-theory question accepts its own answer and names its slips", () => {
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
