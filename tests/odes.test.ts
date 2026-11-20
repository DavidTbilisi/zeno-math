// Ordinary differential equations in practice: the functions the answers are made of, and every question checked
// against its own answer (right as shown, the named slips wrong and named), and the answers solve their equations.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { evalE, parseE } from "../src/math/expr.ts";
import { Frac } from "../src/math/fraction.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { coef, eTex, ex, linTex, sameFn, sumOf, T } from "../src/math/odes.ts";

const w = en.pracWords;

test("functions are written as typed and as LaTeX", () => {
  assert.equal(coef(3, ex(2)), "3e^(2x)");
  assert.equal(coef(-1, ex(-1)), "-e^(-x)");
  assert.equal(coef(new Frac(1, 2), ex(1)), "(1/2)e^(x)");
  assert.equal(coef(new Frac(-4, 3), ""), "-4/3");
  assert.equal(sumOf([[3, ex(2)], [new Frac(-1, 2), ex(-1)], [4, ""]]), "3e^(2x) - (1/2)e^(-x) + 4");
  assert.equal(sumOf([[0, "x"]]), "0");
  assert.equal(ex(0), "");
  assert.equal(ex(-2, "t"), "e^(-2t)");
  assert.equal(eTex(-1), "e^{-x}");
  assert.equal(eTex(3, "t"), "e^{3t}");
  assert.equal(linTex([[1, "y''"], [-4, "y'"], [13, "y"]]), "y'' - 4y' + 13y");
  assert.equal(linTex([[0, "r"]]), "0");
  assert.equal(T("2e^(3t)", ["t"]), "2 e^{3 t}");
});

test("functions are compared by value, up to a constant when asked", () => {
  const [a, b] = [parseE("2e^(x) - e^(x)"), parseE("e^(x)")];
  assert.ok(sameFn(a, b));
  assert.ok(!sameFn(a, parseE("e^(x) + 1")));
  assert.ok(sameFn(a, parseE("e^(x) + 1"), [], true));
  assert.ok(sameFn(parseE("x^2 y", ["y"]), parseE("y x^2", ["y"]), ["y"]));
});

const SKILLS: SkillId[] = ["odeFirst", "odeSecond", "odeSystems", "laplace", "stability"];

test("every differential-equation question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z0-9]+\}/.test(e.prompt), `${where}: a blank left in the prompt`);
        assert.equal(check(e, e.plain, w).ok, true, where);
        for (const t of trapInputs(e)) {
          assert.equal(check(e, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});

/** y(x) from a typed answer in x (central differences give y′ and y″). */
const fn = (src: string) => {
  const e = parseE(src);
  return (x: number) => evalE(e, x, {});
};
const d1 = (f: (x: number) => number, x: number, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);
const d2 = (f: (x: number) => number, x: number, h = 1e-3) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
const near = (a: number, b: number, tol = 1e-3) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

test("the answers solve their equations", () => {
  let linear = 0;
  for (let seed = 1; seed <= 60; seed++) {
    // y′ + ay = b with y(0) = y₀, read back from the question (a right-hand side ke^(mx) is left to the test above).
    const lin = exercise("odeFirst", 2, seed, w);
    const m = /^y' (?:([+-]) (\d*)y)? = (-?\d+), \\quad y\(0\) = (-?\d+)$/.exec(lin.q);
    if (m) {
      linear++;
      const a = (m[1] === "-" ? -1 : 1) * (m[2] ? Number(m[2]) : 1);
      const [b, y0] = [Number(m[3]), Number(m[4])];
      const y = fn(lin.plain);
      assert.ok(near(y(0), y0), `${lin.q}: y(0)`);
      for (const x of [0.3, 0.9]) assert.ok(near(d1(y, x) + a * y(x), b), `${lin.q} at ${x}`);
    }
    // y″ + py′ + qy = 0 with y(0), y′(0).
    for (const level of [1, 2] as Level[]) {
      const s = exercise("odeSecond", level, seed, w);
      const q = /^y'' (?:([+-]) (\d*)y' )?(?:([+-]) (\d*)y )?= 0, \\quad y\(0\) = (-?\d+), \\; y'\(0\) = (-?\d+)$/.exec(s.q);
      assert.ok(q, s.q);
      const coefOf = (sg?: string, n?: string) => (sg ? (sg === "-" ? -1 : 1) * (n ? Number(n) : 1) : 0);
      const [p, qq] = [coefOf(q[1], q[2]), coefOf(q[3], q[4])];
      const y = fn(s.plain);
      assert.ok(near(y(0), Number(q[5])) && near(d1(y, 0), Number(q[6])), `${s.q}: initial values`);
      for (const x of [0.2, 0.5]) assert.ok(near(d2(y, x) + p * d1(y, x) + qq * y(x), 0, 1e-2), `${s.q} at ${x}`);
    }
  }
  assert.ok(linear > 10, `${linear} linear equations with a constant right-hand side`);
});
