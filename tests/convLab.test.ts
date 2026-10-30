// The convolution lab: padding, the output size ⌊(n + 2p − k) / s⌋ + 1, the sliding sums, 2 × 2 max pooling, places
// where a kernel fires counted apart, every puzzle unsolved at its start and won by what it asks, each miss told
// apart, the cells under a point, and the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blank,
  cellText,
  CONV_LADDER,
  CONV_START,
  controlsOf,
  convolve,
  convSvg,
  firing,
  judgeConv,
  KERNELS,
  maxPool,
  outputCellAt,
  outputOf,
  outSize,
  padGrid,
  pixelAt,
  INPUT,
  OUTPUT,
  inputCell,
  type LiveConv,
} from "../src/math/convLab.ts";

const words = { input: "input", kernel: "kernel", output: "output", pooled: "pooled", sum: "sum", size: "size" };
const puzzle = (i: number, change: Partial<LiveConv> = {}): LiveConv => ({ ...CONV_START, stage: i, ...CONV_LADDER[i].start, ...change });
const won = (d: LiveConv) => judgeConv(d, CONV_LADDER[d.stage].goal).state === "won";
const diag = (at: [number, number][]) => {
  const img = blank(8, 8);
  for (const [i, j] of at) for (let k = 0; k < 3; k++) img[i + k][j + k] = 1;
  return img;
};

test("padding, the output size and the sliding sums", () => {
  assert.deepEqual(padGrid([[1]], 1), [[0, 0, 0], [0, 1, 0], [0, 0, 0]]);
  assert.equal(outSize(8, 3, 1, 0), 6);
  assert.equal(outSize(8, 3, 1, 1), 8);
  assert.equal(outSize(8, 3, 2, 1), 4);
  assert.equal(outSize(2, 3, 1, 0), 0);
  assert.deepEqual(convolve([[0, 0, 1, 1, 0]], KERNELS.step, 1, 0), [[0, 1, 0, -1]]);
  const g = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  assert.deepEqual(convolve(g, KERNELS.identity, 1, 1), g, "the identity kernel with padding 1 gives the picture back");
  assert.ok(Math.abs(convolve(g, KERNELS.blur, 1, 0)[0][0] - 5) < 1e-12, "blur averages");
  assert.deepEqual(maxPool([[1, 2, 0], [3, 0, 9], [5, 5, 5]]), [[3]]);
});

test("a kernel fires where the pixels look like it, counted once per place", () => {
  const one = convolve(diag([[1, 1]]), KERNELS.diagonal, 1, 0);
  assert.equal(Math.max(...one.flat()), 6);
  assert.equal(firing(one, 6).length, 1);
  assert.equal(firing(convolve(diag([[0, 0], [4, 4]]), KERNELS.diagonal, 1, 0), 6).length, 2);
  assert.equal(firing(convolve(diag([[0, 0], [1, 1]]), KERNELS.diagonal, 1, 0), 6).length, 1, "overlapping strokes are one place");
  const full = Array.from({ length: 8 }, () => Array<number>(8).fill(1));
  assert.equal(Math.max(...convolve(full, KERNELS.diagonal, 1, 0).flat()), 0, "a filled block is not a diagonal");
});

test("every puzzle is unsolved at its start and won by what it asks", () => {
  CONV_LADDER.forEach((_, i) => assert.ok(!won(puzzle(i)), `puzzle ${i + 1} starts unsolved`));
  assert.ok(won(puzzle(0, { sel: [0, 2] })));
  assert.ok(won(puzzle(1, { kernel: "vertical" })));
  assert.ok(won(puzzle(2, { stride: 2, pad: 1 })));
  assert.ok(won(puzzle(3, { img: diag([[2, 2]]) })));
  assert.ok(!won(puzzle(4, { img: diag([[2, 2]]) })) && won(puzzle(4, { img: diag([[0, 0], [5, 5]]) })));
  assert.deepEqual(controlsOf(puzzle(0)), ["select"]);
  assert.deepEqual(controlsOf({ ...CONV_START, mode: "free" }), ["kernel", "stride", "pad", "paint", "pool", "select"]);
});

test("a miss says why", () => {
  const why = (d: LiveConv) => {
    const v = judgeConv(d, CONV_LADDER[d.stage].goal);
    return v.state === "lost" ? [v.why, v.have, v.want] : null;
  };
  assert.deepEqual(why(puzzle(0)), ["notPicked", 0, 1]);
  assert.deepEqual(why(puzzle(0, { sel: [0, 6] })), ["notMax", -1, 1]);
  assert.equal(why(puzzle(1, { kernel: "horizontal" }))![0], "wrongKernel");
  assert.deepEqual(why(puzzle(2)), ["wrongSize", 6, 4]);
  assert.deepEqual(why(puzzle(3)), ["tooWeak", 0, 6]);
  assert.deepEqual(why(puzzle(4, { img: diag([[2, 2]]) })), ["tooFew", 1, 2]);
});

test("cells under a point, the numbers in cells, and the picture", () => {
  const d = puzzle(3, { pad: 1 });
  const c = inputCell(d);
  assert.deepEqual(pixelAt(d, INPUT.left + 1.5 * c, INPUT.top + 1.5 * c), [0, 0], "inside the padding is the first pixel");
  assert.equal(pixelAt(d, INPUT.left + 0.5 * c, INPUT.top + 0.5 * c), null, "a padding cell");
  const out = outputOf(puzzle(2));
  assert.deepEqual(outputCellAt(out, OUTPUT.left + 1, OUTPUT.top + 1), [0, 0]);
  assert.equal(outputCellAt(out, OUTPUT.left - 5, OUTPUT.top), null);
  assert.equal(cellText(1 / 9), "1/9");
  assert.equal(cellText(-3), "−3");
  assert.equal(cellText(0.25), "0.25");
  for (const s of [puzzle(0, { sel: [0, 2] }), puzzle(1, { sel: [2, 2] }), puzzle(2, { stride: 2, pad: 1, pool: true, sel: [1, 1] }), puzzle(4, { img: diag([[0, 0]]), sel: [9, 9] })]) {
    const svg = convSvg(s, words);
    assert.ok(!/NaN|Infinity|undefined/.test(svg));
  }
  assert.ok(convSvg(puzzle(0, { sel: [0, 2] }), words).includes("sum: 1·1 = 1"));
  assert.ok(convSvg(puzzle(2, { pool: true }), words).includes("pooled 3 × 3"));
});
