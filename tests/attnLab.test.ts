// The attention lab: softmax, scores growing with d unless divided by √d, the output as the weighted mix, positions
// telling word orders apart, self-attention rows, the next word's chances, every puzzle unsolved at its start and won
// by what it asks, each miss told apart, the plane and matrix under a point, and the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attend,
  ATTN_LADDER,
  ATTN_START,
  attnSvg,
  controlsOf,
  fromPage,
  judgeAttn,
  MATRIX,
  matrixCellAt,
  nextProbs,
  orderOutputs,
  placed,
  scores,
  selfAttention,
  SENTENCES,
  share,
  softmax,
  toPage,
  TOKEN_IDS,
  viewOf,
  type LiveAttn,
} from "../src/math/attnLab.ts";

const tokens = Object.fromEntries(TOKEN_IDS.map((t) => [t, t])) as Record<(typeof TOKEN_IDS)[number], string>;
const words = { tokens, query: "query", output: "output", weights: "weight", scores: "score", matrix: "matrix", next: "next", orderA: "A", orderB: "B", gap: "gap", scaled: "scaled", unscaled: "unscaled" };
const puzzle = (i: number, change: Partial<LiveAttn> = {}): LiveAttn => ({ ...ATTN_START, stage: i, ...ATTN_LADDER[i].start, ...change });
const won = (d: LiveAttn) => judgeAttn(d, ATTN_LADDER[d.stage].goal).state === "won";
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("softmax, scaled scores and the weighted output", () => {
  const w = softmax([0, Math.log(3)]);
  assert.ok(close(w[0], 0.25) && close(w[1], 0.75));
  assert.ok(close(softmax([1000, 1000])[0], 0.5), "large scores do not overflow");
  // Scaled, the scores do not depend on d; unscaled they grow like √d.
  assert.ok(close(scores([1, 0], [[2, 0]], 64, true)[0], scores([1, 0], [[2, 0]], 2, true)[0]));
  assert.ok(close(scores([1, 0], [[2, 0]], 64, false)[0], 2 * Math.sqrt(32)));
  const a = attend([0, 0], [[1, 0], [0, 1]], [[2, 0], [0, 2]], 2, true);
  assert.deepEqual(a.w, [0.5, 0.5]);
  assert.deepEqual(a.out, [1, 1]);
});

test("self-attention rows add up to 1, and positions tell word orders apart", () => {
  for (const r of selfAttention(SENTENCES.animal, 2, true)) assert.ok(close(r.w.reduce((s, v) => s + v, 0), 1));
  assert.deepEqual(placed(SENTENCES.dogA, false), SENTENCES.dogA);
  assert.notDeepEqual(placed(SENTENCES.dogA, true)[0].k, SENTENCES.dogA[0].k);
  assert.ok(orderOutputs(puzzle(3)).gap < 1e-9, "without positions the orders look the same");
  assert.ok(orderOutputs(puzzle(3, { pos: true })).gap > 0.1);
  const p = nextProbs([0.4, -3]);
  assert.ok(close(p.reduce((s, v) => s + v, 0), 1));
  assert.ok(p[0] > 0.5, "an output like on's points to mat");
});

test("every puzzle is unsolved at its start and won by what it asks", () => {
  ATTN_LADDER.forEach((_, i) => assert.ok(!won(puzzle(i)), `puzzle ${i + 1} starts unsolved`));
  assert.ok(won(puzzle(0, { q: [2.4, 2] })));
  assert.ok(won(puzzle(1, { scaled: true })));
  assert.ok(won(puzzle(2, { sel: [5, 1] })));
  assert.ok(!won(puzzle(2, { sel: [5, 2] })));
  assert.ok(won(puzzle(3, { pos: true })));
  assert.ok(won(puzzle(4, { q: [0.4, -3.4] })));
  assert.deepEqual(controlsOf(puzzle(1)), ["scale"]);
  assert.deepEqual(controlsOf({ ...ATTN_START, mode: "free", view: "matrix" }), ["select", "scale", "dims", "positions"]);
  assert.equal(viewOf({ ...ATTN_START, mode: "free", view: "next" }), "next");
});

test("a miss says why", () => {
  const why = (d: LiveAttn) => {
    const v = judgeAttn(d, ATTN_LADDER[d.stage].goal);
    return v.state === "lost" ? [v.why, v.word] : null;
  };
  assert.deepEqual(why(puzzle(0)), ["weightLow", "cat"]);
  assert.deepEqual(why(puzzle(1)), ["tooPeaked", undefined]);
  assert.deepEqual(why(puzzle(2)), ["notPicked", undefined]);
  assert.deepEqual(why(puzzle(2, { sel: [5, 3] })), ["notMost", "it"]);
  assert.deepEqual(why(puzzle(3)), ["sameOrder", undefined]);
  assert.deepEqual(why(puzzle(4)), ["nextLow", "mat"]);
});

test("the plane and the matrix under a point, and the picture", () => {
  assert.deepEqual(fromPage(...toPage([1.5, -2])), [1.5, -2]);
  assert.deepEqual(fromPage(-999, -999), [-3.4, 3.4], "kept on the plane");
  assert.deepEqual(matrixCellAt(8, MATRIX.left + 1, MATRIX.top + 1), [0, 0]);
  assert.equal(matrixCellAt(8, MATRIX.left - 2, MATRIX.top), null);
  assert.equal(share(0.001), "0");
  assert.equal(share(0.456), "0.46");
  const states = [puzzle(0), puzzle(1), puzzle(2), puzzle(2, { sel: [5, 1] }), puzzle(3, { pos: true }), puzzle(4), { ...ATTN_START, mode: "free" as const, view: "matrix" as const, sel: null }];
  for (const d of states) assert.ok(!/NaN|Infinity|undefined/.test(attnSvg(d, words)));
  assert.ok(attnSvg(puzzle(4), words).includes(">next<"));
  assert.ok(attnSvg(puzzle(2, { sel: [5, 1] }), words).includes("query: it"));
});
