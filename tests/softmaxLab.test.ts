// The softmax lab: the probabilities are e^(z/T) over their sum, positive and adding up to 1, unchanged when every
// score is shifted, with p(i) / p(j) = e^((zᵢ − zⱼ)/T); the loss is −ln p(target) and its gradient p − y agrees with a
// numerical derivative; every puzzle starts unsolved and has a solution on the slider's and the bars' steps, and each
// kind of failed try is told apart; the steps, the scale and the picture follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  columnAt,
  crossEntropy,
  FREE_Z,
  gradient,
  judgeSoftmax,
  num,
  prob,
  shifted,
  SHIFT_STEP,
  SM_PLOT,
  snapZ,
  softmax,
  SOFTMAX_LADDER,
  SOFTMAX_START,
  softmaxPuzzle,
  softmaxStars,
  softmaxSvg,
  targetOf,
  TEMPS,
  tempIndex,
  yToZ,
  Z_MAX,
  zToY,
} from "../src/math/softmaxLab.ts";

const P = SOFTMAX_LADDER;
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const words = { scores: "z", probs: "p", classes: ["cat", "dog", "bird", "fish", "frog"] };

test("softmax: e^(z/T) over their sum, adding up to 1, the same for shifted scores, ratios e^(difference)", () => {
  for (const z of [[2, 1, 0.1], [0, 0], [-3, 4, 1, 0.5, -1], [1000, 999, 990]]) {
    for (const T of [0.1, 1, 7]) {
      const p = softmax(z, T);
      assert.ok(close(p.reduce((a, b) => a + b, 0), 1) && p.every((v) => v >= 0 && Number.isFinite(v)));
      if (Math.max(...z) < 100) {
        const e = z.map((v) => Math.exp(v / T));
        const s = e.reduce((a, b) => a + b, 0);
        p.forEach((v, i) => assert.ok(close(v, e[i] / s)));
      }
      const q = softmax(z.map((v) => v + 3.7), T);
      p.forEach((v, i) => assert.ok(close(v, q[i])));
      assert.ok(close(Math.log(p[0] / p[1]), (z[0] - z[1]) / T, 1e-6));
    }
  }
  // Cold: nearly all to the top score; hot: nearly even.
  assert.ok(softmax([1, 0.5, 0], 0.05)[0] > 0.99);
  assert.ok(Math.max(...softmax([1, 0.5, 0], 1000)) - 1 / 3 < 0.001);
});

test("the loss is −ln p(target), and its gradient p − y is the loss's slope", () => {
  const z = [1, 0.5, -0.5];
  for (const t of [0, 1, 2]) {
    const p = softmax(z);
    assert.ok(close(crossEntropy(p, t), -Math.log(p[t])));
    const g = gradient(p, t);
    assert.ok(close(g.reduce((a, b) => a + b, 0), 0) && g[t] < 0);
    g.forEach((v, i) => {
      const h = 1e-6;
      const up = z.map((x, k) => (k === i ? x + h : x));
      const down = z.map((x, k) => (k === i ? x - h : x));
      assert.ok(close((crossEntropy(softmax(up), t) - crossEntropy(softmax(down), t)) / (2 * h), v, 1e-6));
    });
  }
});

test("every puzzle starts unsolved, and has a solution on the bars' and the slider's steps", () => {
  const solutions: { z?: number[]; T?: number }[] = [
    { z: [4, 1, 0] },
    { z: [0.5, 0.5, 0.5] },
    { z: [4.5, 1.5, 3] },
    { z: [1.7, 1, -1] },
    { T: 0.15 },
    { T: 8 },
    { z: [1, 0.5, 4] },
    { z: [5, 1.5, -1, 5, 1] },
  ];
  assert.equal(solutions.length, P.length);
  P.forEach((q, i) => {
    assert.equal(judgeSoftmax(q, q.z, q.T).state, "lost", `puzzle ${i + 1} starts solved`);
    const s = solutions[i];
    const z = s.z ?? q.z;
    const T = s.T ?? q.T;
    assert.equal(judgeSoftmax(q, z, T).state, "won", `puzzle ${i + 1}`);
    assert.ok(z.every((v) => close(snapZ(v), v)), `puzzle ${i + 1}: the bars have z`);
    assert.ok(TEMPS.includes(T), `puzzle ${i + 1}: the slider has T`);
    if (q.lockZ) assert.equal(s.z, undefined);
    if (q.lockT) assert.equal(s.T, undefined);
    assert.ok(q.z.every((v) => Math.abs(v) <= Z_MAX));
  });
  // The shift puzzle is reached by shifting: five steps up.
  let z: number[] | null = P[2].z;
  for (let k = 0; k < 5; k++) z = shifted(z!, SHIFT_STEP);
  assert.equal(judgeSoftmax(P[2], z!, 1).state, "won");
});

test("a failed try says why", () => {
  const why = (i: number, z?: number[], T?: number) => {
    const v = judgeSoftmax(P[i], z ?? P[i].z, T ?? P[i].T);
    return v.state === "lost" ? v.why : v.state;
  };
  assert.deepEqual(P.map((_, i) => why(i)), ["low", "uneven", "notYet", "ratio", "low", "uneven", "loss", "pair"]);
  // Dragging one score in the shift puzzle changes the probabilities, however high it goes.
  assert.equal(why(2, [2, 1.5, 0.5]), "changed");
  // Two at the top but not equal, or equal but not high enough.
  assert.equal(why(7, [5, 1.5, -1, 4.5, 1]), "pair");
  assert.equal(why(7, [2, 1.5, -1, 2, 1]), "pair");
  const v = judgeSoftmax(P[3], [1, 1, -1], 1);
  assert.ok(v.state === "lost" && close(v.have, 1) && v.want === 2);
});

test("the steps: scores snap to 0.1 within ±5, shifts stop at the edge, temperatures from 0.1 to 10", () => {
  assert.deepEqual([snapZ(1.04), snapZ(-7), snapZ(5.2)].map((v) => Math.round(v * 10) / 10), [1, -5, 5]);
  assert.deepEqual(shifted([1, 2], 0.5), [1.5, 2.5]);
  assert.equal(shifted([4.8, 0], 0.5), null);
  assert.equal(TEMPS[0], 0.1);
  assert.equal(TEMPS[TEMPS.length - 1], 10);
  TEMPS.forEach((v, i) => {
    assert.ok(i === 0 || v > TEMPS[i - 1]);
    assert.equal(tempIndex(v), i);
  });
  assert.equal(tempIndex(1), TEMPS.indexOf(1));
  for (const q of P) assert.ok(TEMPS.includes(q.T));
});

test("the score panel's scale goes both ways, and a point finds its column", () => {
  for (const z of [-5, -1.3, 0, 4.2]) assert.ok(close(yToZ(zToY(z)), z));
  assert.ok(zToY(5) > SM_PLOT.top && zToY(-5) < SM_PLOT.top + SM_PLOT.panelH);
  assert.equal(columnAt(SM_PLOT.zLeft + 1, 3), 0);
  assert.equal(columnAt(SM_PLOT.zRight, 3), 2);
  assert.equal(columnAt((SM_PLOT.zLeft + SM_PLOT.zRight) / 2, 3), 1);
  assert.equal(columnAt(SM_PLOT.zRight + 5, 3), null);
});

test("every picture draws: each puzzle, a target, two and five classes, scores at the ends", () => {
  for (const q of P) {
    const svg = softmaxSvg(q.z, q.T, { target: q.target ?? null, locked: q.lockZ, words });
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
  }
  for (const [z, T] of [[[5, -5], 0.1], [[-5, -5, -5, -5, -5], 10], [[5, -5, 0, 2.5, -2.5], 1]] as [number[], number][]) {
    for (const target of [null, 0, z.length - 1]) assert.doesNotMatch(softmaxSvg(z, T, { target, words }), /NaN|undefined|Infinity/);
  }
  // The target is starred, and a score at the bottom is written inside its bar.
  assert.match(softmaxSvg([1, 0], 1, { target: 1, words }), /dog ★/);
  assert.match(softmaxSvg([1, -5], 1, { target: null, words }), /fill="#fff" text-anchor="middle">−5</);
  // Classes past the named ones are numbered.
  assert.match(softmaxSvg([1, 0, 0], 1, { target: null, words: { ...words, classes: ["a"] } }), />3</);
});

test("stars, the puzzle in play, its target, and numbers for the readout", () => {
  assert.deepEqual([softmaxStars(0), softmaxStars(1), softmaxStars(9)], [3, 2, 1]);
  assert.equal(softmaxPuzzle({ mode: "puzzle", stage: 6 }), P[6]);
  assert.equal(softmaxPuzzle({ mode: "free", stage: 6 }), null);
  assert.equal(targetOf(P[6], { target: 0 }), 2);
  assert.equal(targetOf(P[0], { target: 0 }), null);
  assert.equal(targetOf(null, { target: 1 }), 1);
  assert.deepEqual(SOFTMAX_START.z, P[0].z);
  assert.notEqual(SOFTMAX_START.z, P[0].z);
  assert.deepEqual(FREE_Z, [2, 1, 0.1]);
  assert.deepEqual([num(-1.5), num(0.15), num(2)], ["−1.5", "0.15", "2"]);
  assert.deepEqual([prob(0.5), prob(0.004), prob(1e-5)], ["0.50", "0.004", "<0.001"]);
});
