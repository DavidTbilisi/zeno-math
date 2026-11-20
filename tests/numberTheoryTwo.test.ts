// Number theory (degree level) in practice: the extended Euclidean algorithm, powers, factorisation, the CRT and the
// Legendre symbol checked against brute force, and every question checked against its own answer (right as shown,
// the named slips wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { crtSolve, euclid, extGcd, factorise, isPrime, legendre, powMod, residuesMod } from "../src/math/numberTheoryTwo.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";

const w = en.pracWords;
const gcdOf = (a: number, b: number): number => (b === 0 ? a : gcdOf(b, a % b));

test("Euclid, Bézout and powers match brute force", () => {
  for (let a = 1; a <= 60; a++)
    for (let b = 1; b <= 60; b++) {
      const { d, x, y } = extGcd(a, b);
      assert.equal(d, gcdOf(a, b), `${a}, ${b}`);
      assert.equal(a * x + b * y, d, `${a}x + ${b}y`);
      const rows = euclid(a, b);
      for (const r of rows) assert.equal(r.a, r.q * r.b + r.r);
      if (rows.length) assert.equal(rows.at(-1)!.r, 0);
    }
  for (let n = 2; n <= 40; n++)
    for (let a = 0; a < n; a++)
      for (let k = 0; k <= 30; k++) {
        let v = 1 % n;
        for (let i = 0; i < k; i++) v = (v * a) % n;
        assert.equal(powMod(a, k, n), v, `${a}^${k} mod ${n}`);
      }
});

test("factorisation, primes and the CRT", () => {
  for (let n = 2; n <= 2000; n++) {
    assert.equal(factorise(n).reduce((s, [p, e]) => s * p ** e, 1), n);
    assert.ok(factorise(n).every(([p]) => isPrime(p)));
  }
  assert.deepEqual(factorise(360), [[2, 3], [3, 2], [5, 1]]);
  for (const [ms, M] of [[[3, 5, 7], 105], [[4, 6], 12], [[6, 10, 15], 30]] as [number[], number][])
    for (let x = 0; x < M; x++) {
      const s = crtSolve(ms.map((m) => x % m), ms)!;
      assert.equal(s.m, M);
      assert.equal(s.x, x);
    }
  assert.equal(crtSolve([1, 2], [4, 6]), null);
});

test("the Legendre symbol and the quadratic residues", () => {
  for (const p of [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 97]) {
    const squares = new Set(Array.from({ length: p - 1 }, (_, i) => ((i + 1) ** 2) % p));
    assert.deepEqual(residuesMod(p), [...squares].sort((x, y) => x - y));
    assert.equal(residuesMod(p).length, (p - 1) / 2);
    for (let a = 1; a < p; a++) assert.equal(legendre(a, p), squares.has(a) ? 1 : -1, `(${a}/${p})`);
    assert.equal(legendre(p, p), 0);
  }
});

const SKILLS: SkillId[] = ["bezout", "congruences", "crt", "fermatEuler", "rsa", "residues"];

test("every number-theory question accepts its own answer and names its slips", () => {
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
