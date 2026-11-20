// The maths of the logic and set theory elective (src/math/foundations.ts) and its three skills.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AXIOM_SETS,
  CARDINAL_SUMS,
  CLASS_FORMULAS,
  CONSTRUCTIONS,
  FREE_ITEMS,
  FREE_POOL,
  RULES,
  countX,
  kindOf,
  models,
  natProduct,
  natural,
  nat,
  oadd,
  omega,
  omul,
  ordText,
  resolvent,
  clauseText,
} from "../src/math/foundations.ts";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

test("models of statements of P, Q, R, and the two misreadings", () => {
  const P = { v: 0 as const };
  const Q = { v: 1 as const };
  const imp = { op: "imp" as const, a: P, b: Q };
  assert.equal(models(imp), 6);
  assert.equal(models(imp, "vacuous"), 2);
  assert.equal(models({ op: "or", a: P, b: Q }, "exclusive"), 4);
  const kinds = CLASS_FORMULAS.map(kindOf);
  for (const k of ["tautology", "satisfiable", "unsatisfiable"] as const) assert.ok(kinds.includes(k), k);
});

test("a resolvent drops the variable and keeps each other literal once", () => {
  const a = [{ v: 0 as const, neg: false }, { v: 1 as const, neg: true }];
  const b = [{ v: 0 as const, neg: true }, { v: 2 as const, neg: false }, { v: 1 as const, neg: true }];
  assert.equal(clauseText(resolvent(a, b, 0)), "¬Q ∨ R");
});

test("counting x with ∀y R(x, y) and ∃y R(x, y)", () => {
  const le = RULES[0];
  assert.equal(countX(le, 5, "all", false), 1); // only x = 1 is below every y
  assert.equal(countX(le, 5, "some", false), 5);
  assert.equal(countX(le, 5, "all", true), 1); // only x = 5 is above every y
});

test("the relation counts agree with brute force over every relation on 2 and 3 points", () => {
  for (const n of [2, 3]) {
    const pairs = n * n;
    const counts = AXIOM_SETS.map(() => 0);
    for (let m = 0; m < 2 ** pairs; m++) {
      const R = (x: number, y: number) => ((m >> (x * n + y)) & 1) === 1;
      const xs = Array.from({ length: n }, (_, i) => i);
      const refl = xs.every((x) => R(x, x));
      const irrefl = xs.every((x) => !R(x, x));
      const symm = xs.every((x) => xs.every((y) => !R(x, y) || R(y, x)));
      [refl, irrefl, symm, refl && symm, irrefl && symm].forEach((ok, i) => ok && counts[i]++);
    }
    AXIOM_SETS.forEach((ax, i) => assert.equal(2 ** ax.free(n), counts[i], `${ax.tex} n=${n}`));
  }
});

test("ordinal sums and products below ω^ω", () => {
  assert.equal(ordText(oadd(nat(1), omega())), "ω");
  assert.equal(ordText(oadd(omega(), nat(1))), "ω + 1");
  assert.equal(ordText(oadd([[1, 1], [0, 3]], [[2, 1]])), "ω²");
  assert.equal(ordText(oadd([[2, 1], [0, 3]], [[1, 2], [0, 1]])), "ω² + ω·2 + 1");
  assert.equal(ordText(omul(nat(2), omega())), "ω");
  assert.equal(ordText(omul(omega(), nat(2))), "ω·2");
  assert.equal(ordText(omul([[1, 1], [0, 1]], nat(2))), "ω·2 + 1");
  assert.equal(ordText(omul([[1, 1], [0, 1]], omega())), "ω²");
  assert.equal(ordText(omul([[1, 2], [0, 1]], [[1, 1], [0, 1]])), "ω² + ω·2 + 1");
  assert.equal(ordText(natural([[0, 1]], omega())), "ω + 1");
  assert.equal(ordText(natProduct([[1, 1], [0, 1]], nat(2))), "ω·2 + 2");
  // associativity, and the left distributive law α(β + γ) = αβ + αγ
  const xs: [number, number][][] = [nat(2), omega(), [[1, 1], [0, 2]], [[2, 1], [1, 3]], [[1, 2], [0, 1]]];
  for (const a of xs)
    for (const b of xs)
      for (const c of xs) {
        assert.equal(ordText(oadd(oadd(a, b), c)), ordText(oadd(a, oadd(b, c))));
        assert.equal(ordText(omul(omul(a, b), c)), ordText(omul(a, omul(b, c))));
        assert.equal(ordText(omul(a, oadd(b, c))), ordText(oadd(omul(a, b), omul(a, c))));
      }
});

test("the data of the free-variable, cardinal and axiom questions is well formed", () => {
  for (const it of FREE_ITEMS) for (const s of [it.free, it.boundOnce, it.allFree]) if (s) assert.ok(FREE_POOL.includes(s), s);
  for (const c of CARDINAL_SUMS) if (c.trap) assert.notEqual(c.trap[1], c.right);
  for (const c of CONSTRUCTIONS) if (c.trap) assert.notEqual(c.trap[1], c.right);
});

test("every logic and set theory question accepts its answer and names each trap", () => {
  const w = en.pracWords;
  for (const s of ["normalForms", "structures", "ordinalArith"] as SkillId[])
    for (const L of [1, 2, 3] as const)
      for (let seed = 0; seed < 40; seed++) {
        const e = exercise(s, L, seed, w);
        assert.ok(check(e, e.plain, w).ok, `${s} ${L} ${seed}`);
        for (const t of trapInputs(e)) assert.equal(check(e, t.input, w).mistake, t.id, `${s} ${L} ${seed} ${t.id}`);
      }
});
