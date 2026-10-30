// Regression: the normal equations recover the weights a plane was made from, and gradient descent reaches the same
// ones; polynomial features fit a parabola exactly; one-hot weights are the groups' means; logistic regression's loss
// falls and its boundary separates two clusters; the weights scaled by the features' spreads, and the warning when two
// features move together; and what is refused, with why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { descend, leastSquares, REG_PRESETS, renderRegression, sigmoid, solve, trainLogistic, type RegSpec } from "../src/math/regression.ts";

const w = en.regressionWords;
const text = (spec: RegSpec) => renderRegression(spec, w).svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps * Math.max(1, Math.abs(b));

test("solving a small system, and a singular one refused", () => {
  assert.deepEqual(solve([[2, 1], [1, 3]], [5, 10])!.map((v) => Math.round(v * 1e9) / 1e9), [1, 3]);
  assert.equal(solve([[1, 2], [2, 4]], [1, 2]), null);
});

test("the normal equations recover a plane's weights, and gradient descent reaches the same", () => {
  // y = 1 + 2x₁ − 3x₂ exactly.
  const pts = [[0, 0], [1, 0], [0, 1], [2, 1], [1, 3], [3, 2]];
  const X = pts.map(([a, b]) => [1, a, b]);
  const y = pts.map(([a, b]) => 1 + 2 * a - 3 * b);
  const fit = leastSquares(X, y)!;
  assert.ok(close(fit.w[0], 1) && close(fit.w[1], 2) && close(fit.w[2], -3));
  assert.ok(close(fit.r2, 1) && fit.mse < 1e-18);
  const [, , , last] = descend(X, y, [1, 10, 100, 1000]);
  assert.ok(last.every((v, i) => close(v, fit.w[i], 1e-4)), String(last));
  assert.ok(text(REG_PRESETS.normal[1].spec).includes("Gradient descent from w = 0 reaches the same weights"));
});

test("polynomial features fit a parabola exactly, a line cannot", () => {
  const spec = { topic: "features" as const, src: ["-2, 4; -1, 1; 0, 0; 1, 1; 2, 4; 3, 9", "2"] };
  assert.ok(text(spec).includes("R² = 1."));
  assert.ok(!text({ ...spec, src: [spec.src[0], "1"] }).includes("R² = 1."));
});

test("one-hot weights are the groups' means", () => {
  const t = text(REG_PRESETS.onehot[0].spec);
  assert.ok(t.includes("each weight is just its group's mean: red 3.5, green 2.25, yellow 5."), t.slice(-200));
});

test("logistic regression: the loss falls and the boundary separates two clusters", () => {
  const rows = [[1, 1, 0], [2, 1, 0], [1, 2, 0], [4, 4, 1], [5, 4, 1], [4, 5, 1]];
  const X = rows.map(([a, b]) => [1, a, b]);
  const y = rows.map((r) => r[2]);
  const { ws, losses } = trainLogistic(X, y, 0.5, 300);
  assert.ok(losses.every((l, i) => i === 0 || l <= losses[i - 1] + 1e-12), "the loss never rises at this rate");
  assert.ok(close(losses[0], Math.log(2)), "from w = 0 every chance is ½");
  const wf = ws[ws.length - 1];
  assert.ok(X.every((r, i) => (sigmoid(r[0] * wf[0] + r[1] * wf[1] + r[2] * wf[2]) >= 0.5 ? 1 : 0) === y[i]));
  assert.ok(text(REG_PRESETS.logistic[0].spec).includes("100 % of the points are on their own side"));
  assert.ok(text(REG_PRESETS.logistic[0].spec).includes(w.logistic.separable));
  assert.ok(!text(REG_PRESETS.logistic[1].spec).includes(w.logistic.separable));
  assert.equal(sigmoid(0), 0.5);
});

test("reading the weights: scaled by the spreads, and a warning when features move together", () => {
  assert.ok(!text(REG_PRESETS.weights[0].spec).includes("move together"));
  assert.ok(text(REG_PRESETS.weights[1].spec).includes("x1 and x2 move together"));
});

test("what is refused, with why", () => {
  const no = (spec: RegSpec, re: RegExp) => assert.throws(() => renderRegression(spec, w), re);
  no({ topic: "normal", src: ["1, 2; 3"] }, /as many numbers as the first/);
  no({ topic: "normal", src: ["1, 2, 3; 2, 3, 4; 3, 4, 5"] }, /at least 4 rows/);
  no({ topic: "normal", src: ["1, 2, 3; 2, 4, 5; 3, 6, 7; 4, 8, 9"] }, /XᵀX has no inverse/);
  no({ topic: "normal", src: ["5"] }, /Type rows/);
  no({ topic: "features", src: ["1, 2; 2, 3; 3, 5", "7"] }, /degree from 1 to 6/);
  no({ topic: "onehot", src: ["red 3; red 4"] }, /at least two groups/);
  no({ topic: "onehot", src: ["red"] }, /a group's name and a value/);
  no({ topic: "logistic", src: ["1, 2, 0; 2, 3, 0", "0.5", "10"] }, /both labels present/);
  no({ topic: "logistic", src: ["1, 2, 0; 2, 3, 1", "", "10"] }, /learning rate above 0/);
  no({ topic: "logistic", src: ["1, 2, 0; 2, 3, 1", "0.5", "0"] }, /whole number of steps/);
});
