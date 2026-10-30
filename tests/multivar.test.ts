// Several variables: partial derivatives taken one rule at a time agree with small steps and leave the one-variable
// engine as it was; the Hessian's eigenvalues and what they say; every topic's picture, its checks and its captions
// (the gradient flat at a stationary point, the chain rule against f(x(t), y(t)), a map that flips, each kind of
// stationary point); convexity (a convex bowl, two valleys with the chord between them, a saddle, a minimum that is
// only local); Lagrange multipliers against the answers worked by hand; and what is refused, with why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { derive, partial, partialOf } from "../src/math/derive.ts";
import { D, evalE, parseE, tex, X } from "../src/math/expr.ts";
import { eigenSym, hessianKind, lagrangePoints, MV_PRESETS, readPoint, renderMultivar, squared, type MvSpec } from "../src/math/multivar.ts";

const w = en.multivarWords;
/** The picture's words, its wrapped lines joined again. */
const render = (spec: MvSpec) => renderMultivar(spec, w).svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const close = (a: number, b: number, eps = 1e-5) => Math.abs(a - b) < eps * Math.max(1, Math.abs(b));

test("partial derivatives agree with small steps, in x and in y", () => {
  const h = 1e-5;
  for (const s of ["x^2 y + sin(x y)", "x^2 + 3y^2", "e^(x y)", "x/y", "ln(x^2 + y^2)", "x^3 - 3x y^2", "(x + 2y)^3", "sqrt(x^2 + y^2)", "atan(y/x)", "x^y"]) {
    const f = parseE(s, ["y"]);
    for (const [a, b] of [[0.7, 1.3], [1.9, 0.4], [1.2, 2.1]]) {
      const F = (x: number, y: number) => evalE(f, x, { y });
      const nx = (F(a + h, b) - F(a - h, b)) / (2 * h);
      const ny = (F(a, b + h) - F(a, b - h)) / (2 * h);
      assert.ok(close(evalE(partialOf(f, "x"), a, { y: b }), nx), `∂/∂x ${s} at (${a}, ${b})`);
      assert.ok(close(evalE(partialOf(f, "y"), a, { y: b }), ny), `∂/∂y ${s} at (${a}, ${b})`);
    }
  }
  // A term without the variable is a constant: its partial derivative is 0.
  assert.equal(tex(partialOf(parseE("x^2 + sin x", ["y"]), "y")), "0");
});

test("a partial derivative's steps are written ∂/∂y, and the one-variable engine is left as it was", () => {
  const rows = partial(parseE("x^2 y + sin(x y)", ["y"]), "y").rows.map((r) => r.tex);
  assert.ok(rows.some((r) => r.includes("\\frac{\\partial}{\\partial y}")) && rows.every((r) => !r.includes(")'")));
  assert.equal(tex(D(X)), "\\left(x\\right)'");
  assert.equal(tex(derive(parseE("x^3"))), "3 x^{2}");
  // In the one-variable engine any other letter is still a constant.
  assert.equal(tex(derive(parseE("x y", ["y"]))), "y");
});

test("the Hessian's eigenvalues are its curvatures, and say what kind of point it is", () => {
  for (const [p, q, r] of [[2, 0, -2], [82, -40, 20], [3, 1, 2], [-1, 0.5, -4]]) {
    const { l1, l2, angle } = eigenSym(p, q, r);
    const [ux, uy] = [Math.cos(angle), Math.sin(angle)];
    assert.ok(close(p * ux + q * uy, l1 * ux) && close(q * ux + r * uy, l1 * uy), "H u₁ = λ₁ u₁");
    assert.ok(close(l1 + l2, p + r) && close(l1 * l2, p * r - q * q) && l1 >= l2);
  }
  assert.equal(hessianKind(3, 1), "min");
  assert.equal(hessianKind(-1, -3), "max");
  assert.equal(hessianKind(2, -2), "saddle");
  assert.equal(hessianKind(2, 0), "flat");
});

test("each Hessian example says the right kind of point", () => {
  const kinds = [w.hessian.min, w.hessian.saddle, w.hessian.max, w.hessian.min, w.hessian.saddle, w.hessian.flat, w.hessian.min];
  MV_PRESETS.hessian.slice(0, kinds.length).forEach((p, i) => {
    const svg = render(p.spec);
    assert.ok(svg.includes(kinds[i]), `${p.label}`);
    assert.ok(!svg.includes(w.hessian.notStationary), `${p.label} is stationary`);
  });
  const last = render(MV_PRESETS.hessian[7].spec);
  assert.ok(last.includes(w.hessian.notStationary), "x² + xy + y² at (1, 1) is not stationary");
  // The descent limit, 2/λ₁, only at a minimum.
  assert.ok(render(MV_PRESETS.hessian[0].spec).includes("2/6 = 0.333"));
  assert.ok(!render(MV_PRESETS.hessian[1].spec).includes("Gradient descent"));
});

test("the gradient is flat at a stationary point, the chain rule agrees with f(x(t), y(t)), and a mirror map flips", () => {
  assert.ok(render({ topic: "gradient", src: ["x^2 + 3y^2"], at: "0, 0" }).includes(w.gradient.flat));
  assert.ok(render(MV_PRESETS.gradient[0].spec).includes(w.gradient.summary));
  for (const p of MV_PRESETS.chain) {
    const m = /changes at (\S+); the chain rule gives (\S+)\.(?:\s|$)/.exec(render(p.spec));
    assert.ok(m && m[1] === m[2], `${p.label}: ${m?.[1]} vs ${m?.[2]}`);
  }
  // On a circle x² + y² does not change: the two paths cancel.
  assert.ok(render(MV_PRESETS.chain[2].spec).includes("df/dt = 0 "));
  assert.ok(render(MV_PRESETS.jacobian[3].spec).includes(w.jacobian.flipped), "(y, x) swaps the axes");
  assert.ok(!render(MV_PRESETS.jacobian[0].spec).includes(w.jacobian.flipped));
  assert.ok(render({ topic: "jacobian", src: ["x + y", "2x + 2y"], at: "1, 1" }).includes(w.jacobian.flat));
  assert.ok(render(MV_PRESETS.jacobian[0].spec).includes("= 8 times its area"));
});

test("convexity: a bowl, two valleys and the chord between them, a saddle, a minimum that is only local", () => {
  const C = w.convex;
  assert.ok(render(MV_PRESETS.convex[0].spec).includes(C.convex));
  assert.ok(render(MV_PRESETS.convex[4].spec).includes(C.convex), "eˣ + y² is convex with no minimum on the map");
  const two = render(MV_PRESETS.convex[1].spec);
  // x⁴ − 3x² + y²: minima at x = ±√1.5 with f = −2.25, a saddle at the origin, the chord 2.25 under it there.
  assert.ok(two.includes("It has 2 minima: the lowest, f = −2.25") && two.includes("rises up to 2.25 above it") && two.includes(C.saddles));
  assert.ok(two.includes(C.kinds.global) && two.includes(C.kinds.saddle));
  const deeper = render(MV_PRESETS.convex[2].spec);
  assert.ok(/the lowest, f = −2\.0\d+ at \(−1\.10\d, 0\)/.test(deeper), "the deeper valley of x⁴ − 2x² + x is the left one");
  const saddle = render(MV_PRESETS.convex[3].spec);
  assert.ok(saddle.includes(C.notConvex) && saddle.includes(C.saddles));
  const local = render(MV_PRESETS.convex[5].spec);
  assert.ok(local.includes("Its minimum is at (1, 0), f = −2.") && local.includes("down to −8.125 at its edge"));
});

test("Lagrange multipliers: the points where ∇f = λ∇g on the constraint", () => {
  const on = (f: string, g: string, c: number) => lagrangePoints(parseE(f, ["y"]), parseE(g, ["y"]), c);
  // x + y on the unit circle: largest √2 at (1/√2, 1/√2) with λ = 1/√2, smallest −√2.
  const circle = on("x + y", "x^2 + y^2", 1);
  assert.equal(circle.length, 2);
  const r = Math.SQRT1_2;
  assert.ok(close(circle[0].x, r) && close(circle[0].y, r) && close(circle[0].l, r) && close(circle[0].v, Math.SQRT2));
  assert.ok(close(circle[1].v, -Math.SQRT2));
  // x² + y² on x + 2y = 5: the nearest point (1, 2), f = 5, λ = 2.
  const line = on("x^2 + y^2", "x + 2y", 5);
  assert.equal(line.length, 1);
  assert.ok(close(line[0].x, 1) && close(line[0].y, 2) && close(line[0].l, 2));
  // xy on x² + y² = 2: four points, largest 1 and smallest −1.
  const xy = on("x y", "x^2 + y^2", 2);
  assert.equal(xy.length, 4);
  assert.ok(close(xy[0].v, 1) && close(xy[3].v, -1));
  const text = render(MV_PRESETS.lagrange[4].spec);
  assert.ok(text.includes("f is largest, 8, at (0, 2), and smallest, 4, at (2, 0)") && text.includes("λ = 2 at the largest"));
  assert.ok(render(MV_PRESETS.lagrange[3].spec).includes("The one point found is (2, 2), f = 4, λ = 2"));
  // None: on the line y = 0, ∇f = (1, 1) of x + y is never a multiple of ∇g = (0, 1).
  assert.ok(render({ topic: "lagrange", src: ["x + y", "y"], at: "0" }).includes(w.lagrange.none));
});

test("what is refused, and why", () => {
  const why = (spec: MvSpec) => {
    try {
      render(spec);
      return "";
    } catch (e) {
      return (e as Error).message;
    }
  };
  assert.equal(why({ topic: "partial", src: ["x y"], at: "1" }), w.needPoint);
  assert.equal(why({ topic: "partial", src: ["x y"], at: "1, y" }), w.needPoint);
  assert.equal(why({ topic: "partial", src: ["x z"], at: "1, 2" }), w.onlyX);
  assert.equal(why({ topic: "chain", src: ["x y", "x + t", "t"], at: "1" }), w.onlyT);
  assert.equal(why({ topic: "chain", src: ["x y", "t", "t"], at: "" }), w.needT);
  assert.ok(why({ topic: "gradient", src: ["ln x + y"], at: "-1, 0" }).startsWith("f or one of its derivatives is not defined"));
  assert.equal(why({ topic: "lagrange", src: ["x y", "x + y"], at: "" }), w.lagrange.needC);
  assert.equal(why({ topic: "convex", src: ["x^2 + y^2"], at: "0" }), w.needPoint);
  const [a, b] = readPoint("(−1/2, pi/4)", w);
  assert.ok(close(evalE(a, 0), -0.5) && close(evalE(b, 0), Math.PI / 4));
});

test("a negative or fractional value is bracketed before it is squared", () => {
  assert.equal(squared("2"), "2^{2}");
  assert.equal(squared("-1"), "\\left(-1\\right)^{2}");
  assert.equal(squared("\\frac{1}{2}"), "\\left(\\frac{1}{2}\\right)^{2}");
});
