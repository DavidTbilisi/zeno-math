// Information: surprise and entropy in bits (a fair coin 1, a fair die log₂ 6, a sure thing 0, never more than log₂ n),
// a coin's entropy at its peak, cross-entropy as entropy plus KL, KL never negative and not the same both ways round,
// log loss as the cross-entropy against a one-hot target (the softmax lab's loss); and what is refused, with why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { coinEntropy, crossEntropy, entropy, INFO_PRESETS, kl, renderInformation, surprise, type InfoSpec } from "../src/math/information.ts";
import { crossEntropy as softmaxLoss } from "../src/math/softmaxLab.ts";

const w = en.informationWords;
/** The picture's words, its wrapped lines joined again. */
const text = (spec: InfoSpec) => renderInformation(spec, w).svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test("surprise and entropy in bits", () => {
  assert.equal(surprise(1 / 2), 1);
  assert.equal(surprise(1 / 8), 3);
  assert.equal(entropy([1 / 2, 1 / 2]), 1);
  assert.ok(close(entropy(Array(6).fill(1 / 6)), Math.log2(6)));
  assert.equal(entropy([1, 0, 0]), 0);
  assert.ok(close(entropy([1 / 2, 1 / 4, 1 / 4]), 1.5));
  // Never more than log₂ n, reached only when all are equal.
  for (const p of [[0.9, 0.1], [0.5, 0.3, 0.2], [0.7, 0.1, 0.1, 0.1]]) assert.ok(entropy(p) < Math.log2(p.length));
  assert.ok(text(INFO_PRESETS.entropy[0].spec).includes(w.entropy.even));
  assert.ok(text(INFO_PRESETS.entropy[3].spec).includes("tells you H = 1.5 bits"));
});

test("a coin's entropy peaks at 1 bit when fair", () => {
  assert.equal(coinEntropy(0.5), 1);
  assert.equal(coinEntropy(0), 0);
  assert.equal(coinEntropy(1), 0);
  assert.ok(close(coinEntropy(0.1), coinEntropy(0.9)));
  for (const p of [0.01, 0.2, 0.4, 0.6, 0.99]) assert.ok(coinEntropy(p) < 1);
  assert.ok(text(INFO_PRESETS.coin[1].spec).includes("At p = 0.9 a flip tells you 0.469 bits"));
});

test("cross-entropy is entropy plus KL, and KL is never negative and not symmetric", () => {
  const pairs: [number[], number[]][] = [
    [[1 / 2, 1 / 4, 1 / 4], [1 / 3, 1 / 3, 1 / 3]],
    [[1 / 2, 1 / 2], [0.9, 0.1]],
    [[0.98, 0.01, 0.01], [0.5, 0.25, 0.25]],
  ];
  for (const [p, q] of pairs) {
    assert.ok(close(crossEntropy(p, q), entropy(p) + kl(p, q)));
    assert.ok(kl(p, q) > 0 && kl(q, p) > 0);
    assert.ok(Math.abs(kl(p, q) - kl(q, p)) > 1e-3, "not the same both ways round");
  }
  assert.equal(kl([0.3, 0.7], [0.3, 0.7]), 0);
  assert.ok(text(INFO_PRESETS.cross[2].spec).includes(w.cross.same));
  // Weather coded as if even: log₂ 3 bits each, 1.5 needed, the rest wasted.
  assert.ok(text(INFO_PRESETS.cross[0].spec).includes(`takes 1.585 bits each on average; the best code for p needs only H(p) = 1.5. The 0.085 bits`));
  assert.ok(text(INFO_PRESETS.kl[0].spec).includes("it is not a distance"));
});

test("log loss is the cross-entropy against a one-hot target", () => {
  const q = [0.7, 0.2, 0.1];
  assert.ok(close(-Math.log(q[0]), softmaxLoss(q, 0)));
  assert.ok(close(crossEntropy([1, 0, 0], q), -Math.log2(0.7)), "in bits, the same with log₂");
  assert.ok(text(INFO_PRESETS.onehot[0].spec).includes("The true class is cat, given q = 0.7, so the loss is −ln 0.7 = 0.3567"));
  assert.ok(text(INFO_PRESETS.onehot[1].spec).includes("−ln 0.1 = 2.3026"));
  assert.ok(text(INFO_PRESETS.onehot[2].spec).includes("The true class is 2"));
});

test("what is refused, with why", () => {
  const no = (spec: InfoSpec, re: RegExp) => assert.throws(() => renderInformation(spec, w), re);
  no({ topic: "entropy", src: ["", "1/2, 1/3"] }, /add up to 0\.8333, not 1/);
  no({ topic: "entropy", src: ["", "1.5, -0.5"] }, /cannot be negative/);
  no({ topic: "entropy", src: ["a b c", "1/2, 1/2"] }, /3 names for 2 chances/);
  no({ topic: "entropy", src: ["", ""] }, /Type chances/);
  no({ topic: "coin", src: ["1.5"] }, /one chance of heads/);
  no({ topic: "cross", src: ["", "1/2, 1/2", "1, 0"] }, /infinitely long/);
  no({ topic: "cross", src: ["", "1/2, 1/2", "1/3, 1/3, 1/3"] }, /p has 2 chances and q has 3/);
  no({ topic: "kl", src: ["", "1, 0", "1/2, 1/2"] }, /infinitely long/);
  no({ topic: "onehot", src: ["cat dog", "0.5, 0.5", "fish"] }, /one of the names, or a number from 1 to 2/);
  no({ topic: "onehot", src: ["", "1, 0", "2"] }, /infinitely long/);
});
