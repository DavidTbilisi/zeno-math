// Naive Bayes: words read from messages, counts and smoothed chances P(word | class), the two classes' scores and the
// posterior counted by hand, a word never seen in a class ruling it out without smoothing (0/0 when each class has
// one), the same clue counted again pushing the posterior to certainty without changing the call, Gaussian naive
// Bayes, every preset drawn, and what is refused, with why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, countAll, gaussFit, naiveCopies, NB_PRESETS, normalPdf, pWord, readMessages, renderNaiveBayes, wordsOf, type NbSpec } from "../src/math/naiveBayes.ts";
import { en } from "../src/locales/en.ts";

const w = en.naiveBayesWords;
const text = (spec: NbSpec) => renderNaiveBayes(spec, w).svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&amp;/g, "&");
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const SPAM = "win money now; free money offer";
const HAM = "lunch at noon; money for lunch";

test("words and messages are read", () => {
  assert.deepEqual(wordsOf("Win MONEY, now!"), ["win", "money", "now"]);
  assert.deepEqual(wordsOf("ფული ახლა"), ["ფული", "ახლა"], "any script");
  assert.deepEqual(readMessages("a b; c\nd", w), [["a", "b"], ["c"], ["d"]]);
  assert.throws(() => readMessages(" ; ", w), /Type each class's messages/);
});

test("counted by hand: smoothed chances, the scores and the posterior", () => {
  const c = countAll(readMessages(SPAM, w), readMessages(HAM, w));
  assert.deepEqual(c.docs, [2, 2]);
  assert.deepEqual(c.totals, [6, 6]);
  assert.equal(c.vocab.length, 9);
  // money: twice in spam, once in ham; with α = 1 over 9 words.
  assert.ok(close(pWord(c, 0, "money", 1), 3 / 15));
  assert.ok(close(pWord(c, 1, "money", 1), 2 / 15));
  const r = classify(c, ["free", "money", "zebra"], 1);
  assert.deepEqual(r.skipped, ["zebra"]);
  const s1 = 0.5 * (2 / 15) * (3 / 15);
  const s2 = 0.5 * (1 / 15) * (2 / 15);
  assert.ok(close(r.scores[0], s1) && close(r.scores[1], s2));
  assert.ok(close(r.post, s1 / (s1 + s2)));
  // Without smoothing, "free" never seen in ham rules ham out.
  assert.equal(classify(c, ["free", "money"], 0).post, 1);
  assert.ok(Number.isNaN(classify(c, ["free", "lunch"], 0).post), "each class has a word it never saw: 0/0");
});

test("the same clue counted again: more sure, the same call", () => {
  assert.ok(close(naiveCopies(0.5, 0.6, 0.3, 1), 2 / 3));
  const ps = [1, 2, 5, 10].map((k) => naiveCopies(0.5, 0.6, 0.3, k));
  ps.forEach((p, i) => i && assert.ok(p > ps[i - 1]));
  assert.ok(ps.every((p) => p > 0.5), "always the same class");
  assert.ok(ps[3] > 0.999);
});

test("Gaussian naive Bayes: a normal curve per class, ½ where the weighted curves cross", () => {
  assert.ok(close(normalPdf(0, 0, 1), 1 / Math.sqrt(2 * Math.PI)));
  const g = gaussFit([1, 3], [7, 9]);
  assert.deepEqual(g.m, [2, 8]);
  assert.deepEqual(g.s, [1, 1]);
  assert.equal(g.prior, 0.5);
  assert.ok(close(g.post(5), 0.5));
  assert.ok(g.post(2) > 0.99 && g.post(8) < 0.01);
  assert.equal(g.post(1e6), 0, "far out where both densities vanish, the nearer class");
});

test("every preset draws, and says what it should", () => {
  for (const ps of Object.values(NB_PRESETS)) for (const p of ps) assert.ok(!/NaN|Infinity|undefined/.test(renderNaiveBayes(p.spec, w).svg), p.label);
  assert.ok(text(NB_PRESETS.text[0].spec).includes("likely spam"));
  assert.ok(text(NB_PRESETS.smoothing[0].spec).includes(w.smoothing.never));
  assert.ok(!text(NB_PRESETS.smoothing[1].spec).includes(w.smoothing.never));
  assert.ok(text({ topic: "text", src: [SPAM, HAM, "free money zebra", "1"] }).includes("so skipped: zebra."));
  assert.ok(text(NB_PRESETS.copies[0].spec).includes("counted 5 times"));
  assert.ok(text(NB_PRESETS.gaussian[0].spec).includes("% chance"));
});

test("what is refused, with why", () => {
  const no = (spec: NbSpec, re: RegExp) => assert.throws(() => renderNaiveBayes(spec, w), re);
  no({ topic: "text", src: [SPAM, HAM, "", "1"] }, /Type the new message/);
  no({ topic: "text", src: [SPAM, HAM, "zebra", "1"] }, /nothing to count/);
  no({ topic: "text", src: [SPAM, HAM, "money", ""] }, /Type α/);
  no({ topic: "text", src: [SPAM, HAM, "money", "-1"] }, /Type α/);
  no({ topic: "text", src: [SPAM, HAM, "money", "x"] }, /Type numbers only/);
  no({ topic: "copies", src: ["1.2", "0.5", "0.5", "3"] }, /between 0 and 1/);
  no({ topic: "copies", src: ["0.5", "0.5", "0.5", "0"] }, /whole number from 1 to 20/);
  no({ topic: "gaussian", src: ["1", "2, 3", "1"] }, /at least two numbers/);
  no({ topic: "gaussian", src: ["1, 1", "2, 3", "1"] }, /spread is 0/);
  no({ topic: "gaussian", src: ["1, 2", "2, 3", ""] }, /Type the new x/);
  no({ topic: "text", src: [Array(31).fill("a").join(";"), HAM, "a", "1"] }, /At most 30/);
});
