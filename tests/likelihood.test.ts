// Likelihood: each estimate is where its log-likelihood peaks (p̂ = k/n, μ̂ the mean with σ̂² dividing by n, λ̂ the mean
// count), checked against a fine search over the parameter; least squares gives the line a numeric search of the
// normal likelihood finds; log loss is −ℓ / n and the worst label is named; and what is refused, with why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { bernoulliFit, lineFit, LK_PRESETS, logLoss, normalFit, poissonFit, renderLikelihood, type LkSpec } from "../src/math/likelihood.ts";

const w = en.likelihoodWords;
/** The picture's words, its wrapped lines joined again. */
const text = (spec: LkSpec) => renderLikelihood(spec, w).svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
/** Where a function of one parameter is largest, on a fine grid. */
const argmax = (f: (v: number) => number, lo: number, hi: number, steps = 20000) => {
  let [best, at] = [-Infinity, lo];
  for (let i = 0; i <= steps; i++) {
    const v = lo + ((hi - lo) * i) / steps;
    if (f(v) > best) [best, at] = [f(v), v];
  }
  return at;
};

test("a coin: p̂ = k/n is where the likelihood peaks, and an all-heads run peaks at the end", () => {
  const f = bernoulliFit([1, 1, 0, 1, 1, 1, 0, 1, 0, 1]);
  assert.deepEqual([f.n, f.k, f.p], [10, 7, 0.7]);
  assert.ok(close(argmax(f.ll, 1e-6, 1 - 1e-6), 0.7, 1e-4));
  assert.ok(close(f.top, 7 * Math.log(0.7) + 3 * Math.log(0.3)));
  assert.ok(text(LK_PRESETS.bernoulli[0].spec).includes("the share of 1s"));
  const all = bernoulliFit([1, 1, 1, 1, 1]);
  assert.deepEqual([all.p, all.top], [1, 0]);
  assert.ok(text(LK_PRESETS.bernoulli[3].spec).includes("no flat top"));
  // 50 flips: L(p̂) is 2.43 · 10⁻¹⁵, drawn in units of that power of ten, and the picture stays small.
  const many = renderLikelihood(LK_PRESETS.bernoulli[2].spec, w).svg;
  assert.ok(text(LK_PRESETS.bernoulli[2].spec).includes("only 2.43 · 10⁻¹⁵"));
  assert.ok(many.includes("L(p), × 10⁻¹⁵") && many.length < 400_000, String(many.length));
});

test("a normal: μ̂ is the mean and σ̂² divides by n", () => {
  const xs = [2, 4, 9];
  const f = normalFit(xs);
  assert.ok(close(f.mu, 5) && close(f.v, 26 / 3) && close(f.s2, 13));
  assert.ok(close(argmax((m) => f.ll(m, f.sd), 0, 10), 5, 1e-3));
  assert.ok(close(argmax((s) => f.ll(f.mu, s), 0.5, 10), f.sd, 1e-3));
  assert.ok(text(LK_PRESETS.normal[2].spec).includes("σ̂² = 8.6667 divides by n"));
});

test("counts: λ̂ is the mean count", () => {
  const ks = [0, 1, 2, 1, 3, 0, 1, 2, 1, 0, 2, 1];
  const f = poissonFit(ks);
  assert.ok(close(f.lambda, 14 / 12));
  assert.ok(close(argmax(f.ll, 0.01, 5), 14 / 12, 1e-3));
  assert.ok(text(LK_PRESETS.poisson[0].spec).includes("λ̂ = 1.1667"));
  assert.ok(text({ topic: "poisson", src: ["0 0 0"] }).includes("no flat top"));
});

test("least squares is the normal likelihood's line", () => {
  const pts: [number, number][] = [[1, 2.1], [2, 2.9], [3, 4.2], [4, 4.8], [5, 6.1], [6, 6.8]];
  const f = lineFit(pts);
  // The likelihood for σ = 1 as a function of the slope, the intercept best for each slope, peaks at the same b̂.
  const ll = (b: number) => {
    const a = f.my - b * f.mx;
    return -pts.reduce((s, [x, y]) => s + (y - a - b * x) ** 2, 0) / 2;
  };
  assert.ok(close(argmax(ll, -5, 5), f.b, 1e-3));
  assert.ok(close(f.mse, pts.reduce((s, [x, y]) => s + (y - f.a - f.b * x) ** 2, 0) / pts.length));
  assert.ok(text(LK_PRESETS.squares[0].spec).includes("the least-squares line, y = 1.113 + 0.963x"));
});

test("log loss is −ℓ / n, and a confident mistake costs most", () => {
  const f = logLoss([1, 0], [0.8, 0.4]);
  assert.ok(close(f.loss, -(Math.log(0.8) + Math.log(0.6)) / 2));
  assert.ok(text(LK_PRESETS.logloss[1].spec).includes("number 4 (label 1, q = 0.02)"));
  const guess = logLoss([1, 1, 0], [0.5, 0.5, 0.5]);
  assert.ok(close(guess.loss, Math.log(2)));
});

test("what is refused, with why", () => {
  const no = (spec: LkSpec, re: RegExp) => assert.throws(() => renderLikelihood(spec, w), re);
  no({ topic: "bernoulli", src: ["1 0 2"] }, /Each one is 1 or 0/);
  no({ topic: "bernoulli", src: [""] }, /Type numbers/);
  no({ topic: "bernoulli", src: ["1 0 x"] }, /Could not read “x”/);
  no({ topic: "normal", src: ["5"] }, /at least two values/);
  no({ topic: "normal", src: ["3 3 3"] }, /no spread/);
  no({ topic: "poisson", src: ["1 2.5"] }, /whole numbers/);
  no({ topic: "poisson", src: ["1 -1"] }, /whole numbers/);
  no({ topic: "squares", src: ["1, 2"] }, /at least two points/);
  no({ topic: "squares", src: ["1, 2; 1, 3"] }, /same x/);
  no({ topic: "logloss", src: ["1 0", "0.5"] }, /2 labels and 1 chances/);
  no({ topic: "logloss", src: ["1 0", "1, 0.5"] }, /between 0 and 1/);
  no({ topic: "bernoulli", src: [Array(201).fill(1).join(" ")] }, /At most 200/);
});
