// Random variables: a table's mean and variance come out exact (a die, three coins, a bet), a density's by integrals
// (uniform, 2x, e^(−x) with its median ln 2, the normal bell), the rules for aX + b hold, a joint table's margins,
// covariance and independence are right (two coins independent; a table with no correlation that is still dependent),
// the covariance matrix's long axis is the PCA lab's PC1; and what is refused, with why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { moments, PCA_LADDER, principal } from "../src/math/pcaLab.ts";
import { covariance, jointOf, momentsOf, readList, readPoints, renderRandvar, RV_PRESETS, type RvSpec } from "../src/math/randvar.ts";
import { eigenSym } from "../src/math/multivar.ts";

const w = en.randvarWords;
/** The picture's words, its wrapped lines joined again. */
const text = (spec: RvSpec) => renderRandvar(spec, w).svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const tableOf = (xs: string, ps: string) => {
  const [x, p] = [readList(xs, w), readList(ps, w)];
  return momentsOf(x.q, x.v, p.q, p.v);
};

test("a table's mean and variance are exact", () => {
  const die = tableOf("1, 2, 3, 4, 5, 6", "1/6, 1/6, 1/6, 1/6, 1/6, 1/6");
  assert.deepEqual([die.meanQ?.n, die.meanQ?.d, die.varQ?.n, die.varQ?.d], [7, 2, 35, 12]);
  const coins = tableOf("0, 1, 2, 3", "1/8, 3/8, 3/8, 1/8");
  assert.deepEqual([coins.meanQ?.n, coins.meanQ?.d, coins.varQ?.n, coins.varQ?.d], [3, 2, 3, 4]);
  const bet = tableOf("1, -1", "18/37, 19/37");
  assert.deepEqual([bet.meanQ?.n, bet.meanQ?.d], [-1, 37], "a bet on red loses 1/37 a go");
  const lottery = tableOf("-2, 8, 98", "0.89, 0.1, 0.01");
  assert.ok(close(lottery.mean, -0.0));
  assert.ok(text(RV_PRESETS.discrete[0].spec).includes("E[X] = 3.5"));
});

test("a density's mean, variance and median, by integrals", () => {
  const cases: [string, string, string, number, number][] = [
    ["1/2", "0", "2", 1, Math.sqrt(1 / 3)],
    ["2x", "0", "1", 2 / 3, Math.sqrt(1 / 18)],
    ["e^(-x)", "0", "inf", 1, 1],
    ["e^(-x^2/2)/sqrt(2pi)", "-inf", "inf", 0, 1],
  ];
  for (const [f, a, b, m, s] of cases) {
    const t = text({ topic: "continuous", src: [f, a, b] });
    const got = /E\[X\] = (\S+), give or take σ = (\S+)\./.exec(t);
    assert.ok(got, f);
    assert.ok(close(Number(got![1].replace("−", "-")), m, 1e-3) && close(Number(got![2]), s, 1e-3), `${f}: ${got![1]}, ${got![2]}`);
  }
  // e^(−x): the median is ln 2, less than the mean; a symmetric density has no such line.
  assert.ok(text(RV_PRESETS.continuous[3].spec).includes("the median 0.693 differ"));
  assert.ok(!text(RV_PRESETS.continuous[0].spec).includes("differ"));
});

test("aX + b: the mean moves with it, the variance by a²", () => {
  const x = tableOf("1, 2, 3, 4, 5, 6", "1/6, 1/6, 1/6, 1/6, 1/6, 1/6");
  const y = tableOf("3, 5, 7, 9, 11, 13", "1/6, 1/6, 1/6, 1/6, 1/6, 1/6");
  assert.ok(close(y.mean, 2 * x.mean + 1) && close(y.variance, 4 * x.variance));
  assert.ok(text(RV_PRESETS.rules[0].spec).includes("multiplying by a stretches it"));
});

test("a joint table: margins, covariance, and independence cell by cell", () => {
  const coins = jointOf(RV_PRESETS.joint[1].spec.src, w);
  assert.equal(coins.bad, null);
  assert.ok(close(coins.cov, 0));
  const rain = jointOf(RV_PRESETS.joint[0].spec.src, w);
  assert.ok(rain.bad !== null && rain.cov > 0);
  assert.deepEqual(rain.pxV.map((v) => Math.round(v * 100)), [60, 40]);
  assert.ok(close(rain.cond[1], 7 / 8));
  // No correlation, and still not independent: knowing X = 0 makes Y = 0 certain.
  const curve = jointOf(RV_PRESETS.joint[4].spec.src, w);
  assert.ok(close(curve.cov, 0) && curve.bad !== null);
  assert.ok(jointOf(RV_PRESETS.joint[3].spec.src, w).cov < 0);
  assert.ok(text(RV_PRESETS.joint[1].spec).includes(w.joint.summaryIndependent));
  assert.ok(text(RV_PRESETS.joint[4].spec).includes(w.joint.summaryDependent));
});

test("the covariance matrix's long axis is the PCA lab's PC1", () => {
  const pts = readPoints(RV_PRESETS.cov[3].spec.src[0], w);
  assert.deepEqual(pts, PCA_LADDER[0].pts);
  const c = covariance(pts);
  const mo = moments(PCA_LADDER[0].pts);
  assert.ok(close(c.sxx, mo.sxx) && close(c.syy, mo.syy) && close(c.sxy, mo.sxy));
  const e = eigenSym(c.sxx, c.sxy, c.syy);
  const deg = (((e.angle * 180) / Math.PI) % 180 + 180) % 180;
  assert.ok(close(deg, principal(mo).angle, 1e-6));
  assert.ok(close(covariance([[0, 0], [1, 1], [2, 2]]).corr, 1));
});

test("what is refused, and why", () => {
  const why = (spec: RvSpec) => {
    try {
      renderRandvar(spec, w);
      return "";
    } catch (e) {
      return (e as Error).message;
    }
  };
  assert.equal(why({ topic: "discrete", src: ["0, 1", "0.5, 0.4"] }), "The probabilities add up to 0.9, not 1.");
  assert.equal(why({ topic: "discrete", src: ["0, 1, 2", "0.5, 0.5"] }), "There are 3 values and 2 probabilities: give one probability for each value.");
  assert.equal(why({ topic: "discrete", src: ["0, 1", "1.5, -0.5"] }), w.negative);
  assert.equal(why({ topic: "discrete", src: ["1, 1", "0.5, 0.5"] }), w.repeated);
  assert.equal(why({ topic: "discrete", src: ["", "1"] }), w.needNumbers);
  assert.equal(why({ topic: "continuous", src: ["x", "0", "1"] }), "The probabilities add up to 0.5, not 1.");
  assert.equal(why({ topic: "continuous", src: ["x", "-1", "1"] }), w.negative);
  assert.equal(why({ topic: "continuous", src: ["1", "1", "0"] }), w.needEnds);
  assert.equal(why({ topic: "joint", src: ["0, 1", "0, 1", "0.5 0.5", "0"] }), "The table needs 2 rows (one per x, separated by |), each with 2 numbers (one per y).");
  assert.equal(why({ topic: "joint", src: ["0, 1", "0, 1", "0.5 0.5 | 0 0", "1"] }), w.givenZero);
  assert.equal(why({ topic: "joint", src: ["0, 1", "0, 1", "0.25 0.25 | 0.25 0.25", "5"] }), w.givenNotX);
  assert.equal(why({ topic: "cov", src: ["1, 2"] }), w.fewPoints);
});
