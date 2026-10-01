// Equations and polynomials: every stated answer is checked against the input.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { algebraFactors, algebraPoly, renderAlgebra, type AlgebraSpec, type QuadMethod } from "../src/math/algebra.ts";

const w = en.algebraWords;
const textOf = (svg: string) => [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((m) => m[1]).join(" ").replace(/\s+/g, " ");
const render = (topic: AlgebraSpec["topic"], eq: string, method: QuadMethod = "factor") => textOf(renderAlgebra({ topic, eq, method }, w).svg);
let seed = 7;
const rnd = (lo: number, hi: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), lo + (seed % (hi - lo + 1)));
const nz = (lo: number, hi: number) => {
  for (;;) {
    const v = rnd(lo, hi);
    if (v !== 0) return v;
  }
};
const sgn = (v: number) => (v < 0 ? `- ${-v}` : `+ ${v}`);
/** "−7/2" → −3.5 */
const val = (s: string) => {
  const [n, d = "1"] = s.replace("−", "-").split("/");
  return Number(n) / Number(d);
};

test("linear equations: the answer satisfies the equation", () => {
  for (let k = 0; k < 150; k++) {
    const [a, b, c, d] = [nz(-9, 9), rnd(-20, 20), nz(-9, 9), rnd(-20, 20)];
    if (a === c) continue;
    const shown = render("linear", `${a}x ${sgn(b)} = ${c}x ${sgn(d)}`);
    const m = /Check: x = (\S+) gives (\S+) on the left and (\S+) on the right/.exec(shown);
    assert.ok(m, shown);
    assert.ok(Math.abs(val(m[1]) - (d - b) / (a - c)) < 1e-9, `${a}x+${b}=${c}x+${d}: ${m[1]}`);
    assert.equal(m[2], m[3]);
  }
  assert.match(render("linear", "2(x + 3) = 2x + 6"), /every number is a solution/);
  assert.match(render("linear", "x + 1 = x + 2"), /no solution/);
  assert.match(render("linear", "x/2 + 1/3 = 2"), /x = 10\/3/);
});

test("inequalities: the boundary and the direction", () => {
  for (let k = 0; k < 120; k++) {
    const [a, b, c, d] = [nz(-9, 9), rnd(-20, 20), nz(-9, 9), rnd(-20, 20)];
    if (a === c) continue;
    const rel = ["<", "<=", ">", ">="][k % 4];
    const svg = renderAlgebra({ topic: "inequality", eq: `${a}x ${sgn(b)} ${rel} ${c}x ${sgn(d)}`, method: "factor" }, w).svg;
    const x = (d - b) / (a - c);
    const m = /x = (\S+?)</.exec(svg);
    assert.ok(m && Math.abs(val(m[1]) - x) < 1e-9, `${a}x+${b}${rel}${c}x+${d}`);
    // (a − c)·x rel (d − b): dividing by a negative turns it round. Solutions to the left ⇔ "x < …".
    const less = (rel[0] === "<") === (a - c > 0);
    assert.equal(svg.includes(`M24,`), less, `${a}x+${b}${rel}${c}x+${d}: arrow`);
    assert.equal(/fill="#ffffff" stroke="#1971c2" stroke-width="2.5"/.test(svg), !rel.includes("="), "open or filled dot");
    assert.equal(/sign flips/.test(textOf(svg)), a - c < 0);
  }
  const two = renderAlgebra({ topic: "inequality", eq: "4 >= (1 - x)/2 > -1", method: "factor" }, w).svg;
  assert.ok(two.includes(">x = −7<") && two.includes(">x = 3<"), "−7 ≤ x < 3");
  assert.match(render("inequality", "x + 1 < x"), /No number/);
});

test("expanding: the result is the product", () => {
  const same = (p: string, q: string) => assert.deepEqual(algebraPoly(p, w).coeffs, algebraPoly(q, w).coeffs, `${p} vs ${q}`);
  for (let k = 0; k < 80; k++) {
    const src = `(${nz(-6, 6)}x ${sgn(rnd(-9, 9))})(${nz(-6, 6)}x ${sgn(rnd(-9, 9))})${k % 3 === 0 ? `(x ${sgn(rnd(-5, 5))})` : ""}`;
    const m = /Result: (.*)$/.exec(render("expand", src));
    assert.ok(m, src);
    same(m[1], src);
  }
  same(/Result: (.*)$/.exec(render("expand", "-(x + 1)(x - 2)"))![1], "-(x+1)(x-2)");
});

test("factoring: the factors multiply back", () => {
  for (let k = 0; k < 120; k++) {
    const [p, q, r, s, g] = [nz(-6, 6), rnd(-9, 9), nz(-6, 6), nz(-9, 9), nz(-3, 3)];
    const coeffs = [g * q * s, g * (p * s + q * r), g * p * r].map((x) => x + 0); // g(px + q)(rx + s)
    const src = `${coeffs[2]}x^2 ${sgn(coeffs[1])}x ${sgn(coeffs[0])}`;
    const f = algebraFactors(src, w);
    assert.ok(f, `${src} should factor`);
    // The product of the factors is the input up to a whole-number factor in front.
    let prod = [1];
    for (const [c0, c1] of f) prod = prod.map((x, i) => x * c0 + (prod[i - 1] ?? 0) * c1).concat(prod[prod.length - 1] * c1);
    const ratio = coeffs[2] / prod[2];
    assert.ok(Number.isInteger(ratio), `${src}: ${JSON.stringify(f)}`);
    assert.deepEqual(prod.map((x) => x * ratio + 0), coeffs, `${src}: ${JSON.stringify(f)}`);
  }
  assert.equal(algebraFactors("x^2 + x + 1", w), null);
  assert.match(render("factor", "4x^2 - 9"), /difference of two squares/);
});

test("quadratics: all four methods give the same roots", () => {
  for (let k = 0; k < 60; k++) {
    // a(x − r1)(x − r2) with rational roots, or a random one.
    const a = nz(-4, 4);
    const [r1, r2] = [rnd(-8, 8), rnd(-8, 8)];
    const coeffs = k % 4 === 3 ? [rnd(-9, 9), rnd(-9, 9), a] : [a * r1 * r2, -a * (r1 + r2), a];
    const src = `${coeffs[2]}x^2 ${sgn(coeffs[1])}x ${sgn(coeffs[0])} = 0`;
    const D = coeffs[1] ** 2 - 4 * coeffs[2] * coeffs[0];
    const expected = D < 0 ? [] : [(-coeffs[1] - Math.sqrt(D)) / (2 * a), (-coeffs[1] + Math.sqrt(D)) / (2 * a)].sort((p, q) => p - q);
    for (const method of ["factor", "square", "formula", "vertex"] as const) {
      const shown = render("quadratic", src, method);
      if (D < 0) {
        assert.match(shown, /No real solutions/, `${src} ${method}`);
        continue;
      }
      const two = /Two solutions: x = (\S+) and x = (\S+?)\.( |$)/.exec(shown);
      const one = /One \(double\) solution: x = (\S+?)\.( |$)/.exec(shown);
      const got = two ? [val(two[1]), val(two[2])] : one ? [val(one[1]), val(one[1])] : null;
      assert.ok(got, `${src} ${method}: ${shown.slice(-200)}`);
      got.forEach((g, i) => assert.ok(Math.abs(g - expected[i]) < 1e-3, `${src} ${method}: ${got} vs ${expected}`));
    }
  }
});

test("parsing: friendly input and clear errors", () => {
  assert.deepEqual(algebraPoly("2·(x − 1)² ", w).coeffs, [2, -4, 2]);
  assert.deepEqual(algebraPoly("x/2 + 0.25", w).coeffs, [0.25, 0.5]);
  assert.throws(() => renderAlgebra({ topic: "linear", eq: "x^2 = 4", method: "factor" }, w), /not linear/);
  assert.throws(() => renderAlgebra({ topic: "linear", eq: "x + y = 2", method: "factor" }, w), /one letter/);
  assert.throws(() => renderAlgebra({ topic: "linear", eq: "1/x = 2", method: "factor" }, w), /not by the letter/);
  assert.throws(() => renderAlgebra({ topic: "quadratic", eq: "x + 1 = 0", method: "factor" }, w), /not a quadratic/);
});
