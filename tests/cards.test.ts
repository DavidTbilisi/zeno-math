// Playing cards (src/math/cards.ts): the events count right, P(A | B) is counted among B's cards, the two-card tree
// multiplies along its branches, draws without putting back empty the deck exactly, and the exact chances of a sample sum add to 1.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_CARDS, cardFile, cardName, cardsIn, conditional, drawMore, drawPairs, drawSamples, EVENTS, fracText, fracValue, freshDraw,
  freshMeans, groupCounts, meanBins, meanSd, meanStats, nextChance, POP_SD, reduce, sumDistribution, twoCards, valueOf,
} from "../src/math/cards.ts";

/** A fixed stream of numbers in [0, 1), the same each run. */
function seeded(seed = 7) {
  let x = seed;
  return () => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

describe("the deck", () => {
  it("names each card and its picture", () => {
    assert.equal(cardName(0), "A♠");
    assert.equal(cardName(13 + 11), "Q♥");
    assert.equal(cardFile(13 + 11), "queen_of_hearts.svg");
    assert.equal(cardFile(2 * 13 + 9), "10_of_diamonds.svg");
    assert.equal(new Set(ALL_CARDS.map(cardFile)).size, 52);
    assert.equal(ALL_CARDS.map(valueOf).reduce((a, b) => a + b, 0), 4 * 91);
  });

  it("counts the events", () => {
    const size = Object.fromEntries(EVENTS.map((e) => [e, cardsIn(e).length]));
    assert.deepEqual(size, { hearts: 13, spades: 13, diamonds: 13, clubs: 13, red: 26, black: 26, ace: 4, king: 4, face: 12, number: 36, high: 16 });
    assert.deepEqual(groupCounts("kind"), [4, 36, 12]);
    assert.deepEqual(groupCounts("colour"), [26, 26]);
  });

  it("writes fractions in lowest terms", () => {
    assert.equal(fracText({ n: 4, d: 12 }), "4/12 = 1/3");
    assert.equal(fracText({ n: 1, d: 13 }), "1/13");
    assert.equal(fracText({ n: 0, d: 26 }), "0/26 = 0");
    assert.equal(fracText({ n: 26, d: 26 }), "26/26 = 1");
    assert.deepEqual(reduce({ n: 12, d: 2652 }), { n: 1, d: 221 });
  });
});

describe("P(A | B)", () => {
  it("counts A among the cards of B", () => {
    const c = conditional("king", "face");
    assert.deepEqual(c.pa, { n: 4, d: 52 });
    assert.deepEqual(c.given, { n: 4, d: 12 });
    assert.equal(c.effect, 1);
    assert.ok(Math.abs((fracValue(c.pBoth) / fracValue(c.pb)) - (fracValue(c.given))) < 0.005, `${fracValue(c.pBoth) / fracValue(c.pb)} ≈ ${fracValue(c.given)}`);
  });

  it("finds independent events and impossible ones", () => {
    assert.equal(conditional("king", "red").effect, 0);
    assert.partialDeepStrictEqual(conditional("hearts", "black"), { given: { n: 0, d: 26 }, effect: -1 });
    assert.deepEqual(conditional("ace", "any").given, { n: 4, d: 52 });
  });
});

describe("two cards", () => {
  it("multiplies along the branches", () => {
    const t = twoCards("ace", "ace", false);
    assert.deepEqual(t.yes, { n: 3, d: 51 });
    assert.deepEqual(t.no, { n: 4, d: 51 });
    assert.deepEqual(reduce(t.both), { n: 1, d: 221 });
    assert.deepEqual(twoCards("ace", "ace", true).both, { n: 16, d: 2704 });
  });

  it("averages the second chance when only some first cards are B cards", () => {
    // Hearts then a king: 13/52 × (13·4 − 1)/(51·13) = 1/52, and a king second is still 4/52 overall.
    const t = twoCards("hearts", "king", false);
    assert.deepEqual(reduce(t.both), { n: 1, d: 52 });
    assert.ok(Math.abs((fracValue(t.both) + fracValue(t.notThen)) - (4 / 52)) < 0.005, `${fracValue(t.both) + fracValue(t.notThen)} ≈ ${4 / 52}`);
  });

  it("lands near the tree's chance", () => {
    const { tally } = drawPairs({ n: 0, firstHits: 0, both: 0 }, "red", "red", false, 20000, seeded());
    assert.ok(Math.abs((tally.firstHits / tally.n) - (0.5)) < 0.05, `${tally.firstHits / tally.n} ≈ ${0.5}`);
    assert.ok(Math.abs((tally.both / tally.n) - (fracValue(twoCards("red", "red", false).both))) < 0.05, `${tally.both / tally.n} ≈ ${fracValue(twoCards("red", "red", false).both)}`);
  });
});

describe("drawing and counting", () => {
  it("without putting back, a whole deck gives exactly the deck's counts", () => {
    const s = drawMore(freshDraw("suit", false), 52, seeded());
    assert.deepEqual(s.counts, [13, 13, 13, 13]);
    assert.equal(s.left.length, 0);
    assert.equal((s.shown).length, 6);
    const t = drawMore(s, 1, seeded(3));
    assert.equal((t.left).length, 51);
    assert.deepEqual(nextChance(t, Math.floor(t.shown.at(-1)! / 13)), { n: 12, d: 51 });
  });

  it("with putting back, the deck stays full", () => {
    const s = drawMore(freshDraw("colour", true), 1000, seeded());
    assert.equal(s.n, 1000);
    assert.equal(s.counts[0] + s.counts[1], 1000);
    assert.deepEqual(nextChance(s, 0), { n: 26, d: 52 });
  });
});

describe("sample means", () => {
  it("the exact chances of a sum add to 1 and centre on 7", () => {
    for (const n of [1, 2, 5, 10]) {
      const p = sumDistribution(n);
      assert.equal((p).length, 12 * n + 1);
      assert.ok(Math.abs((p.reduce((a, b) => a + b, 0)) - (1)) < 5e-13, `${p.reduce((a, b) => a + b, 0)} ≈ ${1}`);
      const mean = p.reduce((t, q, i) => t + q * ((i + n) / n), 0);
      assert.ok(Math.abs((mean) - (7)) < 5e-11, `${mean} ≈ ${7}`);
      const sd = Math.sqrt(p.reduce((t, q, i) => t + q * ((i + n) / n - 7) ** 2, 0));
      assert.ok(Math.abs((sd) - (meanSd(n))) < 5e-11, `${sd} ≈ ${meanSd(n)}`);
    }
    assert.ok(Math.abs((meanSd(1)) - (POP_SD)) < 0.005, `${meanSd(1)} ≈ ${POP_SD}`);
    assert.ok(Math.abs(sumDistribution(2)[0] - 6 / 1326) < 1e-12); // two aces: C(4, 2) / C(52, 2)
  });

  it("the means pile up round 7 and narrow", () => {
    const one = meanStats(drawSamples(freshMeans(1), 4000, seeded()))!;
    const ten = meanStats(drawSamples(freshMeans(10), 4000, seeded()))!;
    assert.ok(Math.abs((one.mean) - (7)) < 0.5, `${one.mean} ≈ ${7}`);
    assert.ok(Math.abs((ten.mean) - (7)) < 0.5, `${ten.mean} ≈ ${7}`);
    assert.ok(ten.sd < one.sd / 2.5);
    assert.ok(Math.abs((ten.sd) - (meanSd(10))) < 0.05, `${ten.sd} ≈ ${meanSd(10)}`);
  });

  it("puts each mean in a bar", () => {
    assert.partialDeepStrictEqual(meanBins(1), { width: 1, count: 13 });
    const b = meanBins(4);
    assert.equal(b.count, 25);
    assert.equal(b.binOf(0), 0); // four aces: mean 1
    assert.equal(b.binOf(48), 24); // four kings: mean 13
    assert.equal(b.centre(12), 7);
  });
});
