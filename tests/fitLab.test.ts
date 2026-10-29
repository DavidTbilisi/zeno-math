// The overfitting lab: the fit is least squares (with ridge, smaller coefficients the larger λ), a polynomial with as
// many coefficients as points goes through them all, the training error never rises with the degree, cross-validation
// leaves each point out once, and bias² and variance come out right where they are known; every puzzle starts unsolved
// and has a solution, each kind of failed try is told apart, and what the notices say is true of their puzzles; the
// readouts, stars and the picture follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  biasVariance,
  biggest,
  cvError,
  DEGREES,
  draw,
  FIT_LADDER,
  FIT_START,
  fit,
  fitPuzzle,
  fitStars,
  fitStart,
  fitSvg,
  fromPage,
  judgeFit,
  knobAt,
  knobText,
  knobValues,
  LAMBDAS,
  lambdaText,
  mse,
  num,
  predict,
  scores,
  SIZES,
  sweep,
  testPoints,
  toPage,
  TRUTHS,
  turned,
  type FitSetup,
  type Pt,
} from "../src/math/fitLab.ts";

const P = FIT_LADDER;
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const words = { train: "train", test: "test", cv: "cv", bias2: "b2", variance: "var", total: "sum", error: "error", coefs: "coefs", axis: { degree: "d", n: "n", lambda: "λ" } };
const setup = (i: number) => fitStart(P[i]) as FitSetup;

test("points are drawn the same for the same seed, one in each stretch of −1 … 1", () => {
  assert.deepEqual(draw("wave", 12, 0.25, 4), draw("wave", 12, 0.25, 4));
  assert.notDeepEqual(draw("wave", 12, 0.25, 4), draw("wave", 12, 0.25, 5));
  const pts = draw("line", 10, 0, 3);
  pts.forEach(([x, y], i) => {
    assert.ok(x >= -1 + (2 * i) / 10 - 1e-3 && x <= -1 + (2 * (i + 1)) / 10 + 1e-3, `point ${i} in its stretch`);
    assert.ok(close(y, Math.round(TRUTHS.line(x) * 1000) / 1000, 2e-3), "no noise, on the line");
  });
  assert.equal(testPoints("wave", 0.25, 1).length, 60);
});

test("the fit is least squares: the residuals are orthogonal to every power of x, and ridge shrinks the coefficients", () => {
  const pts = draw("wave", 15, 0.25, 7);
  for (const d of [0, 1, 3, 6]) {
    const w = fit(pts, d, 0);
    for (let k = 0; k <= d; k++) assert.ok(Math.abs(pts.reduce((s, [x, y]) => s + (predict(w, x) - y) * x ** k, 0)) < 1e-6, `degree ${d}, x^${k}`);
  }
  // A straight line through two points, and Horner's rule.
  const line = fit([[0, 1], [2, 5]], 1, 0);
  assert.ok(close(line[0], 1, 1e-6) && close(line[1], 2, 1e-6));
  assert.equal(predict([1, -2, 3], 2), 1 - 4 + 12);
  // The penalty: the coefficients' squares (all but the constant) only shrink as λ grows, and a huge λ leaves the mean.
  let last = Infinity;
  for (const l of LAMBDAS) {
    const w = fit(pts, 9, l);
    const size = w.slice(1).reduce((s, c) => s + c * c, 0);
    assert.ok(size <= last + 1e-9, `λ ${l}`);
    last = size;
  }
  const flat = fit(pts, 9, 1e9);
  assert.ok(close(flat[0], pts.reduce((s, p) => s + p[1], 0) / pts.length, 1e-6));
});

test("with as many coefficients as points the curve goes through them all, and the training error never rises with the degree", () => {
  const ten = draw("wave", 10, 0.25, 1);
  assert.ok(mse(fit(ten, 9, 0), ten) < 1e-6);
  for (const p of P) {
    const s = fitStart(p) as FitSetup;
    const tr = DEGREES.map((d) => scores({ ...s, degree: d, lam: 0 }).train);
    tr.slice(1).forEach((v, i) => assert.ok(v <= tr[i] + 1e-9, `degree ${i + 1}`));
  }
});

test("cross-validation leaves each point out once; bias² and variance are right where they are known", () => {
  // A constant fitted to points: leaving out every fifth point and judging it by the mean of the rest.
  const pts: Pt[] = Array.from({ length: 10 }, (_, i): Pt => [i / 10, (i * 7) % 5]);
  let want = 0;
  for (let f = 0; f < 5; f++) {
    const rest = pts.filter((_, i) => i % 5 !== f);
    const m = rest.reduce((s, p) => s + p[1], 0) / rest.length;
    want += pts.filter((_, i) => i % 5 === f).reduce((s, p) => s + (p[1] - m) ** 2, 0);
  }
  assert.ok(close(cvError(pts, 0, 0), want / 10, 1e-9));
  assert.equal(cvError(pts.slice(0, 3), 0, 0), Infinity);
  // No noise: every sample gives the same line (up to the points' rounding), so it has no variance and no bias.
  const line = biasVariance("line", 12, 0, 1, 0, 1);
  assert.ok(line.bias2 < 1e-6 && line.variance < 1e-6);
  // A constant fitted to the wave without noise: the bias is the wave's own spread, the samples barely differ.
  const flat = biasVariance("wave", 12, 0, 0, 0, 1);
  assert.ok(flat.bias2 > 0.4 && flat.variance < 0.01);
});

test("every puzzle starts unsolved and has a solution among its knob's settings", () => {
  P.forEach((p, i) => {
    const s = setup(i);
    assert.equal(judgeFit(p, s).state, "lost", `puzzle ${i + 1} starts unsolved`);
    const wins = knobValues(p.knob).map((_, k) => judgeFit(p, turned(s, p.knob, k)).state === "won");
    assert.ok(wins.some(Boolean), `puzzle ${i + 1} has a solution`);
  });
});

test("the answers are the ones the notices speak of", () => {
  const winsOf = (i: number) => knobValues(P[i].knob).filter((_, k) => judgeFit(P[i], turned(setup(i), P[i].knob, k)).state === "won");
  assert.deepEqual(winsOf(0), [9], "only degree 9 goes through 10 points");
  assert.deepEqual(winsOf(1), [3], "the least test error at degree 3");
  assert.deepEqual(winsOf(2), [1], "a straight line's data: degree 1");
  assert.deepEqual(winsOf(3), [3], "the least bias² + variance at degree 3");
  assert.equal(winsOf(4)[0], 25, "25 points tame degree 9");
  assert.deepEqual(winsOf(5), [1e-3, 1e-2], "a middling penalty");
  assert.deepEqual(winsOf(6), [3], "cross-validation picks degree 3");
  assert.deepEqual(winsOf(7), [1e-3], "one penalty both fits and keeps the coefficients small");
  // Overfitting: the training error falls all the way, the test error turns back up after degree 3.
  const all = sweep(setup(1), "degree");
  assert.ok(all[9].train < all[3].train && all[9].test > 5 * all[3].test);
  // Cross-validation picks what the hidden test points would.
  const cvs = sweep(setup(6), "degree", { cv: true });
  const best = (vs: number[]) => vs.indexOf(Math.min(...vs));
  assert.equal(best(cvs.map((x) => x.cv)), best(cvs.map((x) => x.test)));
  // Degree 9 at the start of the last puzzle needs huge coefficients.
  assert.ok(biggest(scores(setup(7)).w) > 100);
});

test("each kind of failed try is told apart", () => {
  const why = (i: number, k: number) => {
    const v = judgeFit(P[i], turned(setup(i), P[i].knob, k));
    return v.state === "lost" ? v.why : "won";
  };
  assert.equal(why(0, 3), "trainHigh");
  assert.equal(why(1, 0), "underfit");
  assert.equal(why(1, 9), "overfit");
  assert.equal(why(2, 0), "tooSimple");
  assert.equal(why(2, 4), "notSimplest");
  assert.equal(why(3, 1), "bias");
  assert.equal(why(3, 8), "variance");
  assert.equal(why(4, 0), "testHigh");
  assert.equal(why(6, 1), "cvUnder");
  assert.equal(why(6, 8), "cvOver");
  assert.equal(why(7, 0), "weightsBig");
  assert.equal(why(7, LAMBDAS.length - 1), "tooStiff");
});

test("knobs turn the right setting, a new size draws new points, and the start is puzzle 1", () => {
  const s = setup(4);
  const t = turned(s, "n", SIZES.indexOf(40));
  assert.equal(t.pts.length, 40);
  assert.equal(knobAt(t, "n"), SIZES.indexOf(40));
  assert.equal(knobAt(turned(s, "lambda", 4), "lambda"), 4);
  assert.equal(turned(s, "degree", 2).degree, 2);
  assert.deepEqual(fitStart(P[1]).seen, [9]);
  assert.equal(fitPuzzle(FIT_START), P[0]);
  assert.equal(fitPuzzle({ mode: "free", stage: 3 }), null);
  assert.equal(fitStart(null).pts.length, 12);
});

test("readouts, stars and the view", () => {
  assert.deepEqual([fitStars(0), fitStars(1), fitStars(5)], [3, 2, 1]);
  assert.equal(lambdaText(0), "0");
  assert.equal(lambdaText(1e-6), "10⁻⁶");
  assert.equal(lambdaText(0.1), "0.1");
  assert.equal(lambdaText(10), "10");
  assert.equal(knobText("degree", 4), "4");
  assert.equal(knobText("n", 0), "10");
  assert.equal(num(0.0629), "0.063");
  assert.equal(num(0.802), "0.8");
  assert.equal(num(781.97), "782");
  assert.equal(num(-2.5), "−2.5");
  assert.equal(num(Infinity), "∞");
  assert.equal(num(2.4e-8), "0");
  for (const p of [[0, 0], [1, -2], [-1.1, 2.2]] as Pt[]) {
    const back = fromPage(toPage(p));
    assert.ok(close(back[0], p[0]) && close(back[1], p[1]));
  }
});

test("the picture draws the curve, the points, the chart and the coefficients", () => {
  const s = setup(1);
  const svg = fitSvg(s, { knob: "degree", show: "test", seen: [9, 3], test: true, fresh: false, truth: true, words });
  assert.equal((svg.match(/r="4.6"/g) ?? []).length, 12, "a dot per training point");
  assert.equal((svg.match(/r="3.6"/g) ?? []).length, 60, "a circle per test point");
  assert.equal((svg.match(/r="3.2"/g) ?? []).length, 4, "two settings tried, two series");
  assert.ok(svg.includes("stroke-dasharray=\"8 6\""), "the hidden curve");
  assert.ok(svg.includes("w₉"), "ten coefficient bars");
  assert.ok(!svg.includes("NaN"));
  const bv = fitSvg(setup(3), { knob: "degree", show: "bv", seen: "all", test: false, fresh: true, truth: true, words });
  assert.equal((bv.match(/r="3.2"/g) ?? []).length, 30, "every degree, three series");
  assert.equal((bv.match(/opacity="0.25"/g) ?? []).length, 20, "twenty fresh fits");
  assert.ok(!bv.includes("NaN"));
});
