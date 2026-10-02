// Applied calculus: every answer is compared with an independent numerical computation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { lastAnswer, renderApplied, type AppSpec } from "../src/math/applied.ts";

const w = en.appWords;
let seed = 9;
const rnd = (lo: number, hi: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), lo + (seed % (hi - lo + 1)));
const run = (spec: Partial<AppSpec> & { topic: AppSpec["topic"] }) => {
  const svg = renderApplied({ f: "", g: "", a: "", b: "", c: "", opt: "", ...spec }, w).svg;
  return { svg, value: lastAnswer() };
};
const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
/** ∫ g on [a, b] by Simpson with many steps. */
function integral(g: (x: number) => number, a: number, b: number, n = 20000): number {
  const h = (b - a) / n;
  let s = g(a) + g(b);
  for (let i = 1; i < n; i++) s += g(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}
const poly = (cs: number[]) => (x: number) => cs.reduce((acc, c, i) => acc + c * x ** i, 0);
const polySrc = (cs: number[]) => cs.map((c, i) => `${c < 0 ? "-" : "+"} ${Math.abs(c)}${i ? (i === 1 ? "x" : `x^${i}`) : ""}`).reverse().join(" ").replace(/^\+ /, "");

test("area: the exact area equals the numerical one, also between curves and across the axis", () => {
  for (let k = 0; k < 80; k++) {
    const cf = [rnd(-6, 6), rnd(-5, 5), rnd(-3, 3), rnd(-1, 1)];
    const cg = [rnd(-6, 6), rnd(-3, 3), 0, 0];
    const [a, b] = [rnd(-3, 0), rnd(1, 3)];
    const between = k % 2 === 0;
    const { value } = run({ topic: "area", f: polySrc(cf), g: between ? polySrc(cg) : "", a: String(a), b: String(b) });
    const f = poly(cf);
    const g = between ? poly(cg) : () => 0;
    const want = integral((x) => Math.abs(f(x) - g(x)), a, b);
    assert.ok(close(value, want, 1e-5), `${polySrc(cf)} vs ${between ? polySrc(cg) : "0"} on [${a}, ${b}]: ${value} vs ${want}`);
  }
  // Limits from where the curves meet: x² and 2 meet at ±√2.
  assert.ok(close(run({ topic: "area", f: "2", g: "x^2" }).value, (8 * Math.SQRT2) / 3));
  assert.match(run({ topic: "area", f: "2", g: "x^2" }).svg, /8√2\/3/);
  assert.ok(close(run({ topic: "area", f: "sin x", a: "0", b: "2pi" }).value, 4));
  assert.ok(close(run({ topic: "area", f: "1/x", a: "1", b: "e" }).value, 1));
  assert.throws(() => run({ topic: "area", f: "x^2 + 1" }), /both limits/);
});

test("volumes: discs, washers and shells agree with numerical integrals", () => {
  for (let k = 0; k < 60; k++) {
    const cf = [rnd(1, 5), rnd(0, 3), rnd(0, 2)];
    const [a, b] = [rnd(0, 2), rnd(3, 5)];
    const kind = k % 3;
    const f = poly(cf);
    const g = (x: number) => 0.5 * x;
    const spec = { topic: "volume" as const, f: polySrc(cf), g: kind === 1 ? "x/2" : "", a: String(a), b: String(b), opt: kind === 2 ? "y" : "x" };
    const { value } = run(spec);
    const want = kind === 2 ? 2 * Math.PI * integral((x) => x * f(x), a, b) : Math.PI * integral((x) => f(x) ** 2 - (kind === 1 ? g(x) ** 2 : 0), a, b);
    assert.ok(close(value, want, 1e-6), `${JSON.stringify(spec)}: ${value} vs ${want}`);
  }
  assert.ok(close(run({ topic: "volume", f: "sqrt(9 - x^2)", a: "-3", b: "3", opt: "x" }).value, 36 * Math.PI));
});

test("motion: distance travelled adds up every leg", () => {
  for (let k = 0; k < 60; k++) {
    const cs = [rnd(-5, 5), rnd(-9, 9), rnd(-6, 6), rnd(-2, 2)];
    const T = rnd(2, 6);
    const src = polySrc(cs).replace(/x/g, "t");
    const { value } = run({ topic: "motion", f: src, a: "0", b: String(T) });
    const v = (t: number) => cs[1] + 2 * cs[2] * t + 3 * cs[3] * t * t;
    const want = integral((t) => Math.abs(v(t)), 0, T, 40000);
    assert.ok(close(value, want, 1e-5), `${src} on [0, ${T}]: ${value} vs ${want}`);
  }
});

test("optimisation: the best x beats every other x in range", () => {
  for (let k = 0; k < 30; k++) {
    const [a, b] = [rnd(8, 40), rnd(8, 40)];
    const { value } = run({ topic: "optimise", opt: "box", a: String(a), b: String(b) });
    const V = (x: number) => x * (a - 2 * x) * (b - 2 * x);
    for (let i = 1; i < 200; i++) {
      const x = (i / 200) * (Math.min(a, b) / 2);
      assert.ok(V(value) >= V(x) - 1e-9, `box ${a} × ${b}: V(${value}) < V(${x})`);
    }
  }
  assert.ok(close(run({ topic: "optimise", opt: "fence", a: "100" }).value, 25));
  assert.ok(close(run({ topic: "optimise", opt: "can", a: "330" }).value, Math.cbrt(330 / (2 * Math.PI))));
  for (let k = 0; k < 30; k++) {
    const [p, q] = [rnd(-4, 4), rnd(-2, 5)];
    const { value } = run({ topic: "optimise", opt: "distance", a: String(p), b: String(q) });
    const d2 = (x: number) => (x - p) ** 2 + (x * x - q) ** 2;
    let best = Infinity;
    for (let i = -4000; i <= 4000; i++) best = Math.min(best, d2(i / 500));
    assert.ok(d2(value) <= best + 1e-9, `P(${p}, ${q}): d² at ${value} is ${d2(value)}, grid has ${best}`);
  }
});

test("related rates: the formulas", () => {
  assert.ok(close(run({ topic: "rates", opt: "ladder", a: "5", b: "0.5", c: "3" }).value, -0.375));
  assert.ok(close(run({ topic: "rates", opt: "ladder", a: "10", b: "1", c: "6" }).value, -0.75));
  assert.ok(close(run({ topic: "rates", opt: "ladder", a: "4", b: "1", c: "2" }).value, -2 / Math.sqrt(12)));
  assert.ok(close(run({ topic: "rates", opt: "balloon", a: "100", b: "5" }).value, 100 / (4 * Math.PI * 25)));
  assert.ok(close(run({ topic: "rates", opt: "cone", a: "3", b: "6", c: "2", f: "4" }).value, (2 * 36) / (Math.PI * 9 * 16)));
  assert.ok(close(run({ topic: "rates", opt: "ripple", a: "2", b: "10" }).value, 40 * Math.PI));
  assert.throws(() => run({ topic: "rates", opt: "ladder", a: "5", b: "1", c: "6" }), /positive number/);
});
