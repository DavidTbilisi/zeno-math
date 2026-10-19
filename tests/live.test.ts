// The live pieces' arithmetic: the geared clock, chance devices and tallies, dot multiplication, counters, and the
// live graph's letters, curves and frozen copies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import {
  clockTime,
  COMPARE_MAX,
  compareSign,
  FRACTION_PARTS,
  fracNumbers,
  fracSign,
  samePieces,
  halfSign,
  viaHalf,
  counters,
  DIE_SIDES,
  divisionAsk,
  divisionCase,
  divisionNumbers,
  dotProduct,
  dragHand,
  emptyTally,
  handAngles,
  judgeDigit,
  MAX_TRIALS,
  hundredJump,
  hundredPath,
  hundredSum,
  multiplesOf,
  outcomes,
  runTrials,
  snapTo,
  tapSquare,
  towerSpan,
  turn,
  wrapDay,
  type Device,
} from "../src/math/live.ts";
import { planDivision } from "../src/math/division.ts";
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

test("jumps on the hundred square", () => {
  assert.equal(hundredJump(100, -10), 90);
  assert.equal(hundredJump(10, 1), 11); // to the start of the next row
  assert.equal(hundredJump(95, 10), null);
  assert.equal(hundredJump(1, -1), null);
  // 100 − 36: three tens back, then six ones.
  const steps = [-10, -10, -10, -1, -1, -1, -1, -1, -1];
  assert.deepEqual(hundredPath(100, steps), [100, 90, 80, 70, 69, 68, 67, 66, 65, 64]);
  assert.deepEqual(hundredSum(100, steps), { long: "100 − 10 − 10 − 10 − 1 − 1 − 1 − 1 − 1 − 1 = 64", short: "100 − 36 = 64" });
  assert.equal(hundredSum(42, [10, -1])?.short, "42 + 9 = 51");
  assert.equal(hundredSum(42, []), null);
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

test("two centred towers joined top to top and bottom to bottom draw the sign", () => {
  assert.equal(compareSign(5, 2), ">");
  assert.equal(compareSign(2, 5), "<");
  assert.equal(compareSign(4, 4), "=");
  const [block, floor, mid] = [24, 286, 166];
  for (let a = 0; a <= COMPARE_MAX; a++) {
    // Standing on the floor, centred on the middle line, and half-way: always n blocks high.
    for (const c of [0, 0.5, 1]) {
      const [top, bottom] = towerSpan(a, block, floor, mid, c);
      assert.ok(close(bottom - top, a * block));
    }
    assert.equal(towerSpan(a, block, floor, mid, 0)[1], floor);
    const [top, bottom] = towerSpan(a, block, floor, mid, 1);
    assert.ok(close((top + bottom) / 2, mid));
    for (let b = 0; b <= COMPARE_MAX; b++) {
      // The gap between the pencils on each side is that tower's height, so the sign opens towards the bigger number.
      const [ta, ba] = towerSpan(a, block, floor, mid, 1);
      const [tb, bb] = towerSpan(b, block, floor, mid, 1);
      const opening = compareSign(ba - ta, bb - tb);
      assert.equal(opening, compareSign(a, b));
      // The pencils are parallel exactly when the numbers are equal.
      assert.equal(close(tb - ta, bb - ba), a === b);
    }
  }
});

test("long division on the board: answering each digit walks the whole division, and a wrong digit says which way", () => {
  for (const [a, b, decimals] of [[624, 12, 0], [8136, 4, 0], [98765, 43, 0], [7, 8, 4], [1, 3, 5], [0, 7, 0], [405, 3, 0]]) {
    const d = { ...initialLive("division"), a, b, decimals };
    let digits = "";
    while (true) {
      const ask = divisionAsk(d);
      if (!ask) break;
      // The right digit is the only one: one more is too big, one less leaves b still fitting.
      for (let g = 0; g <= 9; g++) {
        const v = judgeDigit(ask, g);
        assert.equal(v, g * b > ask.cur ? "tooBig" : ask.cur - g * b >= b ? "tooSmall" : "right", `${a} ÷ ${b}: ${g} into ${ask.cur}`);
      }
      digits += ask.q;
      d.step++;
    }
    // The digits asked for are the quotient: whole part, then as many decimal places as were worked.
    const plan = planDivision(a, b, decimals);
    const places = digits.length - (plan.intLen - plan.first);
    assert.equal(Number(digits), Math.floor((a * 10 ** places) / b), `${a} ÷ ${b}`);
  }
  assert.deepEqual(divisionNumbers({ a: -5, b: -3, decimals: 99 }), { a: 0, b: 0, decimals: 10 });
  assert.deepEqual(divisionNumbers({ a: 12.6, b: Number.NaN, decimals: 2 }), { a: 13, b: 1, decimals: 2 });
});

test("the special cases of division are named: by 0, 0 by n, by 1 and n by itself", () => {
  assert.equal(divisionCase(10, 0), "byZero");
  assert.equal(divisionCase(0, 0), "byZero");
  assert.equal(divisionCase(0, 10), "zeroBy");
  assert.equal(divisionCase(10, 1), "byOne");
  assert.equal(divisionCase(1, 1), "byOne");
  assert.equal(divisionCase(10, 10), "self");
  assert.equal(divisionCase(624, 12), null);
  // The working agrees with each rule it names.
  for (const [a, b, q] of [[0, 7, 0], [345, 1, 345], [48, 48, 1]]) {
    const plan = planDivision(a, b, 0);
    assert.ok(plan.exact);
    assert.equal(Number(plan.steps.map((s) => s.q).join("")), q);
  }
});

test("fraction bars compare like towers, and same-size pieces keep each amount", () => {
  assert.equal(fracSign({ n: 2, d: 3 }, { n: 3, d: 4 }), "<");
  assert.equal(fracSign({ n: 1, d: 2 }, { n: 2, d: 4 }), "=");
  assert.equal(fracSign({ n: 1, d: 3 }, { n: 1, d: 4 }), ">");
  assert.deepEqual(samePieces({ n: 2, d: 3 }, { n: 3, d: 4 }), { d: 12, a: 8, b: 9 });
  assert.deepEqual(samePieces({ n: 1, d: 4 }, { n: 5, d: 6 }), { d: 12, a: 3, b: 10 });
  assert.deepEqual(fracNumbers({ n: 9, d: 40 }), { n: 9, d: FRACTION_PARTS });
  assert.deepEqual(fracNumbers({ n: 5, d: 3 }), { n: 3, d: 3 });
  assert.deepEqual(fracNumbers({ n: -1, d: 0 }), { n: 0, d: 1 });
  const [whole, floor, mid] = [240, 286, 166];
  for (let d = 1; d <= FRACTION_PARTS; d++)
    for (let n = 0; n <= d; n++)
      for (let e = 1; e <= FRACTION_PARTS; e++)
        for (let m = 0; m <= e; m++) {
          const [a, b] = [{ n, d }, { n: m, d: e }];
          // The shaded parts are the towers: the pencils open towards the bigger fraction, parallel only for equal ones.
          const [ta, ba] = towerSpan(n, whole / d, floor, mid, 1);
          const [tb, bb] = towerSpan(m, whole / e, floor, mid, 1);
          const sign = fracSign(a, b);
          if (sign === "=") assert.ok(close(ba - ta, bb - tb));
          else assert.equal(compareSign(ba - ta, bb - tb), sign);
          assert.equal(close(tb - ta, bb - ba), sign === "=");
          // Cut into the same pieces, the amounts and the comparison stay the same.
          const s = samePieces(a, b);
          assert.ok(Number.isInteger(s.a) && Number.isInteger(s.b) && s.d % d === 0 && s.d % e === 0);
          assert.ok(close(s.a / s.d, n / d) && close(s.b / s.d, m / e));
          assert.equal(compareSign(s.a, s.b), sign);
        }
});

test("comparing with a half: n + n against d, and the half decides only when the two are on different sides of it", () => {
  assert.equal(halfSign({ n: 2, d: 5 }), "<");
  assert.equal(halfSign({ n: 3, d: 4 }), ">");
  assert.equal(halfSign({ n: 3, d: 6 }), "=");
  assert.equal(halfSign({ n: 0, d: 3 }), "<");
  assert.equal(halfSign({ n: 1, d: 1 }), ">");
  assert.deepEqual(viaHalf({ n: 2, d: 5 }, { n: 3, d: 4 }), ["<", "<"]); // 2/5 < 1/2 < 3/4
  assert.deepEqual(viaHalf({ n: 3, d: 4 }, { n: 2, d: 5 }), [">", ">"]);
  assert.deepEqual(viaHalf({ n: 2, d: 4 }, { n: 1, d: 3 }), ["=", ">"]); // 2/4 = 1/2 > 1/3
  assert.deepEqual(viaHalf({ n: 1, d: 2 }, { n: 3, d: 6 }), ["=", "="]);
  assert.equal(viaHalf({ n: 2, d: 5 }, { n: 1, d: 3 }), null);
  assert.equal(viaHalf({ n: 2, d: 3 }, { n: 3, d: 4 }), null);
  // Whenever it decides, the chain agrees with cross-multiplying.
  for (let d = 1; d <= 12; d++)
    for (let n = 0; n <= d; n++)
      for (let e = 1; e <= 12; e++)
        for (let m = 0; m <= e; m++) {
          const c = viaHalf({ n, d }, { n: m, d: e });
          if (c) assert.equal(c.includes("<") ? "<" : c.includes(">") ? ">" : "=", fracSign({ n, d }, { n: m, d: e }), `${n}/${d} ${m}/${e}`);
        }
});
