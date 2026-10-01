// Derivatives: every result is compared with a numerical derivative, on many random expressions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { derivOf, evalE, renderDeriv, type DerivTopic } from "../src/math/derive.ts";

const w = en.derivWords;
const textOf = (svg: string) => [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((m) => m[1]).join(" ").replace(/\s+/g, " ");
const render = (topic: DerivTopic, src: string, at = "") => textOf(renderDeriv({ topic, src, at }, w).svg);
let seed = 3;
const rnd = (lo: number, hi: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), lo + (seed % (hi - lo + 1)));
const val = (s: string) => Number(s.replace(/−/g, "-"));

/** A random expression in x, built from sums, products, quotients, powers and functions. */
function gen(depth: number): string {
  if (depth === 0) return [`x`, `${rnd(1, 9)}`, `${rnd(2, 5)}x`, `x^${rnd(2, 4)}`][rnd(0, 3)];
  const a = () => gen(depth - 1);
  switch (rnd(0, 11)) {
    case 0:
      return `${a()} + ${a()}`;
    case 1:
      return `${a()} - ${a()}`;
    case 2:
      return `(${a()})(${a()})`;
    case 3:
      return `(${a()})/(x^2 + ${rnd(1, 4)})`;
    case 4:
      return `(${a()})^${rnd(2, 3)}`;
    case 5:
      return `sin(${a()})`;
    case 6:
      return `cos(${a()})`;
    case 7:
      return `e^(${a()} / 10)`;
    case 8:
      return `ln((${a()})^2 + 1)`;
    case 9:
      return `sqrt((${a()})^2 + 1)`;
    case 10:
      return `arctan(${a()})`;
    default:
      return `${rnd(2, 7)}(${a()})`;
  }
}
/** Central differences, refined twice (Richardson), so the comparison can be tight. */
function numeric(f: (x: number) => number, x: number): number {
  const c = (h: number) => (f(x + h) - f(x - h)) / (2 * h);
  const [a, b] = [c(1e-3), c(5e-4)];
  return b + (b - a) / 3;
}

test("rules: the derivative agrees with a numerical one", () => {
  let checked = 0;
  for (let k = 0; k < 300; k++) {
    const src = gen(rnd(1, 3));
    const { f, d, lines } = derivOf(src, w);
    assert.ok(lines.length > 0 && lines.every((l) => !/NaN|undefined/.test(l)), src);
    for (const x of [0.37, -0.81, 1.23]) {
      const want = numeric((t) => evalE(f, t), x);
      const got = evalE(d, x);
      if (!Number.isFinite(want) || Math.abs(want) > 1e6) continue;
      assert.ok(Math.abs(got - want) <= 1e-5 * Math.max(1, Math.abs(want)), `${src} at ${x}: ${got} vs ${want}\n${lines.join("\n")}`);
      checked++;
    }
  }
  assert.ok(checked > 600, `only ${checked} checks`);
});

test("rules: the standard derivatives and the named rules", () => {
  const cases: [string, number, number][] = [
    ["tan x", 0.4, 1 / Math.cos(0.4) ** 2], ["sec x", 0.4, Math.tan(0.4) / Math.cos(0.4)], ["cot x", 0.7, -1 / Math.sin(0.7) ** 2],
    ["arcsin x", 0.3, 1 / Math.sqrt(1 - 0.09)], ["arccos x", 0.3, -1 / Math.sqrt(1 - 0.09)], ["log_2(x)", 3, 1 / (3 * Math.LN2)],
    ["2^x", 1.5, 2 ** 1.5 * Math.LN2], ["x^x", 1.7, 1.7 ** 1.7 * (Math.log(1.7) + 1)], ["sinh x", 0.5, Math.cosh(0.5)], ["sin^2 x", 1, Math.sin(2)],
    ["sin 2x", 1, 2 * Math.cos(2)], ["1/x", 2, -0.25], ["3/x^2", 1, -6], ["cbrt(x)", 8, 1 / 12],
  ];
  for (const [src, x, want] of cases) {
    const { d } = derivOf(src, w);
    assert.ok(Math.abs(evalE(d, x) - want) < 1e-9, `${src}: ${evalE(d, x)} vs ${want}`);
  }
  assert.match(render("rules", "x^2 sin x"), /product rule/);
  assert.match(render("rules", "x/(x+1)"), /quotient rule/);
  assert.match(render("rules", "sin(x^2)"), /chain rule/);
  assert.throws(() => renderDeriv({ topic: "rules", src: "y^2", at: "" }, w), /Use x/);
});

test("chain rule: the layers multiply to the same derivative", () => {
  const outer = ["sin(#)", "cos(#)", "e^(#)", "ln(#^2 + 1)", "(#)^3", "sqrt(#^2 + 1)"];
  for (let k = 0; k < 80; k++) {
    // A gentle inner layer: a finite difference can't follow sin(e^(2x + 9)), which turns over every 10⁻⁴.
    let src = `0.${rnd(2, 9)}x + ${rnd(0, 2)}`;
    for (let i = 0; i < rnd(2, 3); i++) src = outer[rnd(0, outer.length - 1)].replace(/#/g, `(${src})`);
    const shown = render("chain", src);
    const m = /≈ (\S+), and f′\(x\) = (\S+?)\.( |$)/.exec(shown);
    assert.ok(m, `${src}: ${shown.slice(-160)}`);
    if (Math.abs(val(m[1])) > 1e4) continue;
    assert.ok(Math.abs(val(m[1]) - val(m[2])) <= 1e-3 * Math.max(1, Math.abs(val(m[1]))), `${src}: ${m[1]} vs ${m[2]}`);
  }
  assert.throws(() => renderDeriv({ topic: "chain", src: "x^2 + x", at: "" }, w), /not a function of a function/);
});

test("first principles and tangents: the slope at the point is f′(a)", () => {
  for (let k = 0; k < 60; k++) {
    const cs = [rnd(-5, 5), rnd(-5, 5), rnd(-5, 5), rnd(-3, 3)];
    const src = `${cs[3]}x^3 + ${cs[2]}x^2 + ${cs[1]}x + ${cs[0]}`.replace(/\+ -/g, "- ");
    const a = rnd(-3, 3);
    const slope = 3 * cs[3] * a * a + 2 * cs[2] * a + cs[1];
    const first = render("first", src, String(a));
    assert.ok(new RegExp(`the tangent's slope ${slope < 0 ? "−" : ""}${Math.abs(slope)}\\.`).test(first), `${src} at ${a}: ${first.slice(-80)}`);
    const tan = render("tangent", src, String(a));
    const m = /curve has gradient (\S+):/.exec(tan);
    assert.ok(m && val(m[1].replace(/\/(\d+)/, (_, d) => `/${d}`)) === slope, `${src} at ${a}: ${m?.[1]} vs ${slope}`);
  }
  assert.match(render("tangent", "sin x", "pi/2"), /the normal is vertical/);
  assert.throws(() => renderDeriv({ topic: "tangent", src: "ln x", at: "-1" }, w), /not defined/);
});

test("stationary points: maxima, minima and points of inflection where f′ = 0", () => {
  for (let k = 0; k < 60; k++) {
    // f′ = 3(x − p)(x − q): f = x³ − (3/2)(p + q)x² + 3pq·x
    const [p, q] = [rnd(-5, 2), rnd(3, 6)];
    const src = `x^3 - ${(3 * (p + q)) / 2}x^2 + ${3 * p * q}x`.replace(/\+ -/g, "- ").replace(/- -/g, "+ ");
    const shown = render("stationary", src);
    const fx = (x: number) => x ** 3 - 1.5 * (p + q) * x * x + 3 * p * q * x;
    const num = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(Math.round(v * 1e4) / 1e4)}`;
    assert.ok(shown.includes(`maximum at (${num(p)}, ${num(fx(p))})`), `${src}: ${shown.slice(-140)}`);
    assert.ok(shown.includes(`minimum at (${num(q)}, ${num(fx(q))})`), `${src}: ${shown.slice(-140)}`);
  }
  assert.match(render("stationary", "x^3"), /point of inflection at \(0, 0\)/);
  assert.match(render("stationary", "x^3 - 3x^2 - 3x + 1"), /maximum at \(1 − √2/);
  assert.match(render("stationary", "x^4 - 4x^3"), /decreasing on \(−∞, 3\)/);
  assert.throws(() => renderDeriv({ topic: "stationary", src: "sin x", at: "" }, w), /polynomial/);
});
