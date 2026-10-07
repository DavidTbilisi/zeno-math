// The live pieces' arithmetic: the geared clock, chance devices and tallies, dot multiplication, counters, and the
// live graph's letters, curves and frozen copies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import {
  clockTime,
  counters,
  DIE_SIDES,
  dotProduct,
  dragHand,
  emptyTally,
  handAngles,
  MAX_TRIALS,
  multiplesOf,
  outcomes,
  runTrials,
  snapTo,
  tapSquare,
  turn,
  wrapDay,
  type Device,
} from "../src/math/live.ts";
import { allParams, compileWith, paramsOf, sample, slope, stepFor, substitute, syncParams, zoomView } from "../src/math/liveGraph.ts";
import { DEFAULT_LIVE_GRAPH, initialLive, LIVE_KINDS } from "../src/math/live.ts";

const words = { heads: "H", tails: "T" };
const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test("the clock's hands are geared", () => {
  assert.deepEqual(handAngles(0), { hour: 0, minute: 0 });
  assert.deepEqual(handAngles(3 * 60), { hour: 90, minute: 0 });
  assert.deepEqual(handAngles(10 * 60 + 10), { hour: 305, minute: 60 });
  // Dragging the minute hand past twelve moves on to the next hour; backwards goes back one.
  assert.equal(dragHand(10 * 60 + 50, "minute", 6), 11 * 60 + 1);
  assert.equal(dragHand(10 * 60 + 5, "minute", 330), 9 * 60 + 55);
  // Dragging the hour hand a quarter turn adds three hours, minute hand and all.
  assert.equal(dragHand(60, "hour", 120), 4 * 60);
  assert.equal(turn(350, 10), 20);
  assert.equal(turn(10, 350), -20);
  assert.equal(snapTo(62, 5), 60);
  assert.equal(clockTime(5), "12:05");
  assert.equal(clockTime(13 * 60 + 7), "1:07");
  assert.equal(wrapDay(-5), 1435);
});

test("chance devices: the probabilities add to one and the draws match them", () => {
  const devices: Device[] = [
    { kind: "coin" },
    ...DIE_SIDES.map((sides): Device => ({ kind: "die", sides })),
    { kind: "twoDice" },
    { kind: "spinner", sections: 5 },
    { kind: "bag", counts: [3, 2, 0, 5] },
  ];
  for (const d of devices) {
    const { p, labels } = outcomes(d, words);
    assert.equal(p.length, labels.length);
    assert.ok(close(p.reduce((a, b) => a + b, 0), 1), d.kind);
    const { tally } = runTrials(emptyTally(p.length), d, 60000, rng(11));
    assert.equal(tally.counts.reduce((a, b) => a + b, 0), 60000);
    tally.counts.forEach((c, i) => assert.ok(Math.abs(c / tally.n - p[i]) < 0.012, `${d.kind} outcome ${i}: ${c / tally.n} vs ${p[i]}`));
  }
  // The bag never draws a colour it has none of.
  const { tally } = runTrials(emptyTally(4), { kind: "bag", counts: [3, 2, 0, 5] }, 5000, rng(2));
  assert.equal(tally.counts[2], 0);
});

test("a tally keeps a few hundred snapshots however long it runs, and stops at the limit", () => {
  const d: Device = { kind: "die", sides: 6 };
  let t = emptyTally(6);
  for (const batch of [1, 10, 100, 1000, 10000, 100000]) t = runTrials(t, d, batch, rng(batch)).tally;
  assert.equal(t.n, 111111);
  assert.ok(t.history.length < 300, String(t.history.length));
  const ns = t.history.map((h) => h.n);
  assert.deepEqual(ns, [...ns].sort((a, b) => a - b));
  assert.deepEqual(ns.slice(0, 30), Array.from({ length: 30 }, (_, i) => i + 1));
  for (const h of t.history) assert.equal(h.counts.reduce((a, b) => a + b, 0), h.n);
  // The same seed gives the same experiment.
  assert.deepEqual(runTrials(emptyTally(6), d, 50, rng(4)), runTrials(emptyTally(6), d, 50, rng(4)));
  const full = runTrials({ ...emptyTally(2), n: MAX_TRIALS - 3 }, { kind: "coin" }, 10, rng(1)).tally;
  assert.equal(full.n, MAX_TRIALS);
});

test("dot multiplication gives the product for every pair, whatever the row length", () => {
  for (const k of [3, 4, 5, 6, 10])
    for (let top = 0; top <= k; top++)
      for (let bottom = 0; bottom <= k; bottom++) {
        const r = dotProduct(k, top, bottom);
        assert.equal(r.product, r.a * r.b, `${k}: ${r.a} × ${r.b}`);
      }
  // The worked example: 8 × 6 with five squares a row.
  assert.deepEqual(dotProduct(5, 3, 1), { a: 8, b: 6, value: 10, empty: [2, 4], dots: 4, dotValue: 40, emptyProduct: 8, product: 48 });
  assert.equal(tapSquare(0, 2), 3); // fill through the third square
  assert.equal(tapSquare(3, 2), 2); // the last dot again takes it away
  assert.equal(tapSquare(3, 0), 1);
});

test("counters and multiples", () => {
  assert.deepEqual(counters([1, 1, 2, 0, 1, 0, 0, 0, 2, 0]), { a: 3, b: 2, n: 5 });
  assert.deepEqual(multiplesOf(15), [15, 30, 45, 60, 75, 90]);
});

test("the live graph finds its letters and draws with them", () => {
  assert.deepEqual(paramsOf("a*x^2 + b*x + c"), ["a", "b", "c"]);
  assert.deepEqual(paramsOf("y = A sin(k x + phi) + pi"), ["A", "k"]);
  assert.deepEqual(paramsOf("sqrt(x) + e"), []);
  assert.deepEqual(allParams(["m x + c", "x^", "m^2 + d"]), ["m", "c", "d"]);
  const c = compileWith("a*x^2 + c");
  assert.ok("f" in c);
  assert.equal(c.f(3, { a: 2, c: 1 }), 19);
  assert.ok("error" in compileWith("x^"));
  // A curve with an asymptote comes in two pieces.
  const runs = sample((x) => 1 / x, -5, 5, -5, 5, 1000);
  assert.equal(runs.length, 2);
  assert.ok(close(slope((x) => x * x, 3), 6, 1e-6));
  assert.equal(stepFor({ v: 0, min: -5, max: 5 }), 0.1);
  assert.equal(stepFor({ v: 0, min: 0, max: 200 }), 2);
});

test("a frozen copy puts the numbers in", () => {
  assert.equal(substitute("a*x^2 + b*x + c", { a: 2, b: -3, c: 0.5 }), "2 * x ^ 2 + (-3) * x + 0.5");
  assert.equal(substitute("A sin(k x)", { A: 3, k: 2 }), "3 * sin(2 * x)");
  const frozen = compileWith(substitute("a*x^2 + b*x + c", { a: 2, b: -3, c: 0.5 }));
  assert.ok("f" in frozen && frozen.f(2, {}) === 2 * 4 - 6 + 0.5);
  // New letters get sliders, old sliders keep their values, unused ones go.
  const params = syncParams({ ...DEFAULT_LIVE_GRAPH, fns: [{ expr: "a x + k", color: "#000" }], params: { ...DEFAULT_LIVE_GRAPH.params, a: { v: 3, min: 0, max: 9 } } });
  assert.deepEqual(params, { a: { v: 3, min: 0, max: 9 }, k: { v: 1, min: -5, max: 5 } });
  assert.deepEqual(zoomView({ xMin: -10, xMax: 10, yMin: -5, yMax: 5 }, [0, 0], 0.5), { xMin: -5, xMax: 5, yMin: -2.5, yMax: 2.5 });
});

test("every live piece has a size and a starting state that survives saving", () => {
  for (const kind of LIVE_KINDS) {
    const s = initialLive(kind);
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s, kind);
    // Each piece gets its own copy, so changing one never changes the next.
    assert.notEqual(initialLive(kind), initialLive(kind));
  }
  const chance = initialLive("chance");
  assert.equal(chance.tally.counts.length, outcomes(chance.device, words).p.length);
  const spinner = initialLive("spinner");
  assert.equal(spinner.counts.length, spinner.sections);
  const fractions = initialLive("fractions");
  assert.equal(fractions.shaded.length, fractions.parts);
  assert.deepEqual(initialLive("graph"), DEFAULT_LIVE_GRAPH);
});
