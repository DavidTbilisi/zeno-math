// The recurrent-network lab: the state carried along, the gradient back through time as a product of one factor per
// step (checked against finite differences), every puzzle unsolved at its start and won by what it asks, each miss told
// apart, and the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import { controlsOf, gradients, judgeRnn, num, RNN_LADDER, RNN_START, rnnSvg, SEQS, unroll, type LiveRnn, type Params } from "../src/math/rnnLab.ts";

const words = { unrolled: "unrolled", state: "state", grad: "grad", steps: "steps", band: "band" };
const puzzle = (i: number, change: Partial<LiveRnn> = {}): LiveRnn => ({ ...RNN_START, stage: i, ...RNN_LADDER[i].start, ...change });
const won = (d: LiveRnn) => judgeRnn(d, RNN_LADDER[d.stage].goal).state === "won";

test("the state is carried along: tanh, linear and gated cells", () => {
  assert.deepEqual(unroll([1, 0], { cell: "linear", w: 2, u: 3, f: 0 }), [3, 6]);
  const h = unroll([1, 0], { cell: "tanh", w: 1, u: 1, f: 0 });
  assert.ok(Math.abs(h[0] - Math.tanh(1)) < 1e-12 && Math.abs(h[1] - Math.tanh(Math.tanh(1))) < 1e-12);
  assert.deepEqual(unroll([1, 0, 0], { cell: "gated", w: 0, u: 1, f: 0.5 }).map((v) => v / Math.tanh(1)), [1, 0.5, 0.25]);
});

test("the gradient back through time matches finite differences", () => {
  for (const p of [{ cell: "tanh", w: 0.9, u: 0.7, f: 0 }, { cell: "linear", w: 1.2, u: 0.3, f: 0 }, { cell: "gated", w: 0, u: 1, f: 0.8 }] as Params[]) {
    const xs = [0.5, -0.2, 0.3, 0, 0.1];
    const g = gradients(xs, p);
    // Nudge the state at step 2 and run the rest by hand.
    const hs = unroll(xs, p);
    const run = (h2: number) => {
      let h = h2;
      for (let t = 2; t < xs.length; t++) h = p.cell === "gated" ? p.f * h + Math.tanh(p.u * xs[t]) : p.cell === "linear" ? p.w * h + p.u * xs[t] : Math.tanh(p.w * h + p.u * xs[t]);
      return h;
    };
    const e = 1e-6;
    assert.ok(Math.abs((run(hs[1] + e) - run(hs[1] - e)) / (2 * e) - g[1]) < 1e-6, p.cell);
    assert.equal(g[g.length - 1], 1);
  }
});

test("every puzzle is unsolved at its start and won by what it asks", () => {
  RNN_LADDER.forEach((_, i) => assert.ok(!won(puzzle(i)), `puzzle ${i + 1} starts unsolved`));
  assert.ok(won(puzzle(0, { w: 1.3 })));
  assert.ok(won(puzzle(1, { u: 2.5 })));
  assert.ok(won(puzzle(2, { w: 1, u: 0.1 })) && !won(puzzle(2, { w: 1, u: 1 })), "saturation also kills the gradient");
  assert.ok(won(puzzle(3, { w: 1 })) && !won(puzzle(3, { w: 0.7 })));
  assert.ok(won(puzzle(4, { f: 0.99 })) && !won(puzzle(4, { f: 0.95 })));
  assert.equal(SEQS.long.length, 30);
  assert.deepEqual(controlsOf(puzzle(2)), ["w", "u"]);
  assert.deepEqual(controlsOf({ ...RNN_START, mode: "free", cell: "gated" }), ["u", "f"]);
});

test("a miss says why", () => {
  const why = (d: LiveRnn) => {
    const v = judgeRnn(d, RNN_LADDER[d.stage].goal);
    return v.state === "lost" ? v.why : null;
  };
  assert.equal(why(puzzle(0)), "forgot");
  assert.equal(why(puzzle(1)), "notBelow");
  assert.equal(why(puzzle(2)), "vanished");
  assert.equal(why(puzzle(3)), "exploded");
  assert.equal(why(puzzle(4)), "forgot");
  assert.equal(why(puzzle(4, { f: 1 })), null);
  assert.equal(why(puzzle(4, { u: 2, f: 0.98 })), "gateLow", "the pulse holds, the gradient does not");
});

test("numbers and the picture", () => {
  assert.equal(num(0.00002), "2.0e−5");
  assert.equal(num(-0.5), "−0.5");
  assert.equal(num(NaN), "—");
  for (const d of [puzzle(0), puzzle(1, { u: 3 }), puzzle(3), puzzle(4), { ...RNN_START, mode: "free" as const, cell: "linear" as const, w: 2, seq: "long" as const }]) assert.ok(!/NaN|Infinity/.test(rnnSvg(d, words)));
});
