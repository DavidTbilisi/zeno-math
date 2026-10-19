// Math for AI, tensors: shapes and nested lists are read into the same box of numbers, in row-major order; boxes that
// are not full (ragged, mixed, empty) and ones too big to draw are refused with a message; strides follow the shape;
// a picked entry is the one an independent nested lookup finds, at the place its strides say; a matrix's rank agrees
// with a brute-force count, and the rank caption tells it apart from the order. Operations: reshape keeps memory and
// permute reads it with moved strides, as an independent lookup finds; reductions, broadcasting and @ agree with a
// direct computation over nested lists, and the entries said to make up one entry of the result are those that do;
// every mistake in an operation is refused with its message. Gradient descent: on quadratics the steps follow the
// closed form, with and without momentum, and overshoot, settle or run away as the curvature says; the gradient
// agrees with one worked out by hand; maxima, saddles, local minima and slow progress are told apart; and wrong
// options are refused. Backpropagation: on random expressions every input's gradient matches a central difference of
// the same expression written as plain JavaScript; implicit products, folded constants and inputs used more than once
// are read and added as they should be; the chain rule is written out along every path; a step of gradient descent
// moves the learnt inputs; and wrong inputs are refused. Softmax and cross-entropy: probabilities follow the formula,
// add up to 1 and ignore a shift of every score, sharpen and flatten with the temperature, stay finite for huge
// scores; the loss is −Σ y ln p and never below the target's entropy, the gradient p − y matches a central difference,
// and wrong options are refused. Embeddings: the cosine follows the formula, stays within [−1, 1], ignores length and
// is the dot product of unit vectors, with |â − b̂|² = 2 − 2 cos θ; the matrix is symmetric with 1 on the diagonal; a
// query's ranking and an analogy's nearest vector agree with a brute-force search; and wrong vectors are refused. SVD:
// U and V are orthonormal, σ falls, UΣVᵀ = A and AᵀA v = σ² v on random and low-rank matrices, the rank agrees with
// elimination, the first k pieces miss A by the root of the dropped σ² and nudged rank-k matrices do no better
// (Eckart–Young). PCA: the mean, covariance matrix, its eigenvectors and variances, uncorrelated scores and what keeping
// k loses agree with a direct computation; standardizing gives the correlation matrix and ignores units; and wrong
// matrices, points and options are refused.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { fill } from "../src/math/text.ts";
import { AI_DEFAULT, AI_PRESETS, AI_TOPICS, buildAi, buildBackprop, buildDescent, buildEmbed, buildOps, buildSoftmax, buildSvd, cosine, matrixRank, renderAi, softmax, strides } from "../src/math/ai.ts";

const w = en.aiWords;
const T = w.tensor;
const build = (src: string) => buildAi({ topic: "tensor", src }, w);
const tensor = (src: string) => build(src).data.tensor;
/** The captions as one text, so that a sentence wrapped over two lines can still be found. */
const captions = (src: string) => [...build(src).svg.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
const throws = (src: string, message: string) => assert.throws(() => build(src), { message }, src);

let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed / 2147483648);
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

type Nested = number | Nested[];
const nested = (shape: number[], at = { n: 0 }): Nested => (shape.length ? Array.from({ length: shape[0] }, () => nested(shape.slice(1), at)) : ++at.n);

test("a shape and the nested list it stands for are the same tensor", () => {
  for (let i = 0; i < 60; i++) {
    const shape = Array.from({ length: int(1, 4) }, () => int(1, 3));
    const list = JSON.stringify(nested(shape));
    // A lone number is a scalar, so a shape with one axis is written "shape 3".
    assert.deepEqual(tensor(shape.length > 1 ? shape.join("x") : `shape ${shape[0]}`), tensor(list), list);
    assert.deepEqual(tensor(list).shape, shape);
  }
  assert.deepEqual(tensor("2 × 3"), tensor("(2, 3)"));
  assert.deepEqual(tensor("shape 5"), { shape: [5], data: [1, 2, 3, 4, 5] });
  assert.deepEqual(tensor("(4,)").shape, [4]);
  assert.deepEqual(tensor("2*2").shape, [2, 2]);
  assert.deepEqual(tensor("()"), { shape: [], data: [1] });
});

test("numbers in a list: commas or spaces, signs, decimals and exponents", () => {
  assert.deepEqual(tensor("[5 3 7]"), { shape: [3], data: [5, 3, 7] });
  assert.deepEqual(tensor("[[−1.5, .5], [2e3, -4]]"), { shape: [2, 2], data: [-1.5, 0.5, 2000, -4] });
  assert.deepEqual(tensor("11"), { shape: [], data: [11] });
  assert.deepEqual(tensor("[[5], [1.5], [2]]").shape, [3, 1]);
});

test("not a full box, or too big: refused with the reason", () => {
  throws("[[1, 2], [3]]", fill(T.ragged, { a: 2, b: 1 }));
  throws("[[[1, 2], [3, 4]], [[5, 6, 7], [8, 9, 0]]]", fill(T.ragged, { a: 2, b: 3 }));
  throws("[1, [2]]", T.mixed);
  throws("[]", T.empty);
  throws("[[], []]", T.empty);
  throws("2x0", T.empty);
  const big = fill(T.tooBig, { order: 4, axis: 12, n: 144 });
  throws("2x2x2x2x2", big);
  throws("shape 13", big);
  throws("12x13", big);
  throws("6x5x5", big);
  throws("[1, 2", fill(w.bad, { s: "[1, 2" }));
  throws("[1, a]", fill(w.bad, { s: "a]" }));
  throws("[1] 2", fill(w.bad, { s: "2" }));
});

test("nothing typed, an unknown option, a wrong pick", () => {
  throws("", w.need.tensor);
  throws(" ; T[0]", w.need.tensor);
  throws("2x3; fill 0", fill(w.unknown, { s: "fill 0" }));
  throws("2x3; T[1]", fill(T.pickCount, { n: 2 }));
  throws("2x3; T[1, -1]", fill(T.pickCount, { n: 2 }));
  throws("2x3; T[1, 3]", fill(T.pickRange, { i: 3, k: 1, m: 2 }));
  throws("7; T[0]", fill(T.pickCount, { n: 0 }));
});

test("strides: one step along an axis skips the product of the later lengths", () => {
  assert.deepEqual(strides([2, 3, 4]), [12, 4, 1]);
  assert.deepEqual(strides([5]), [1]);
  assert.deepEqual(strides([]), []);
  assert.deepEqual(build("3x2x2x2").data.strides, [8, 4, 2, 1]);
});

test("a picked entry is the one a nested lookup finds, at the place its strides say", () => {
  for (let i = 0; i < 80; i++) {
    const shape = Array.from({ length: int(1, 4) }, () => int(1, 3));
    const list = nested(shape);
    // Random numbers instead of 1, 2, 3, … so that the value and the place cannot agree by accident.
    const values = JSON.parse(JSON.stringify(list), (_, v) => (typeof v === "number" ? int(-50, 50) : v)) as Nested;
    const pick = shape.map((d) => int(0, d - 1));
    const { data } = build(`${JSON.stringify(values)}; T[${pick.join(", ")}]`);
    const found = pick.reduce((v: Nested, k) => (v as Nested[])[k], values) as number;
    assert.equal(data.tensor.data[data.at!], found);
    assert.equal(data.at, pick.reduce((a, v, k) => a + v * data.strides[k], 0));
    assert.deepEqual(data.pick, pick);
  }
  assert.equal(build("[4, 9, 2]; [1]").data.at, 1);
});

/** The rank by brute force: the largest k with a nonzero k × k minor. */
function bruteRank(m: number[][]): number {
  const det = (a: number[][]): number => (a.length === 1 ? a[0][0] : a[0].reduce((s, v, j) => s + (j % 2 ? -1 : 1) * v * det(a.slice(1).map((r) => r.filter((_, c) => c !== j))), 0));
  const subsets = (n: number, k: number): number[][] => (k === 0 ? [[]] : n < k ? [] : [...subsets(n - 1, k), ...subsets(n - 1, k - 1).map((s) => [...s, n - 1])]);
  for (let k = Math.min(m.length, m[0].length); k > 0; k--)
    for (const rows of subsets(m.length, k)) for (const cols of subsets(m[0].length, k)) if (det(rows.map((r) => cols.map((c) => m[r][c]))) !== 0) return k;
  return 0;
}

test("matrix rank: agrees with the largest nonzero minor, and the caption says it is not the order", () => {
  for (let i = 0; i < 120; i++) {
    const r = int(1, 4);
    const c = int(1, 4);
    // Few distinct small numbers, so that dependent rows and zero rows come up often.
    const m = Array.from({ length: r }, () => Array.from({ length: c }, () => int(-1, 1)));
    if (rnd() < 0.4 && r > 1) m[r - 1] = m[0].map((v) => 2 * v);
    assert.equal(matrixRank(m), bruteRank(m), JSON.stringify(m));
    assert.equal(build(JSON.stringify(m)).data.rank, bruteRank(m));
  }
  assert.equal(matrixRank([[0.1, 0.2], [0.3, 0.6]]), 1);
  assert.ok(captions("[[1, 2, 3], [2, 4, 6]]").includes(fill(T.rankLow, { r: 1 }).replace(/“|”/g, "")));
  assert.ok(captions("[[4, 19, 8], [16, 3, 10]]").includes(fill(T.rank, { r: 2 }).split("“")[0]));
});

test("every order draws, with the order and shape in the captions", () => {
  for (const [src, cap] of [
    ["11", T.order0],
    ["[5, 3, 7]; T[2]", T.order1],
    ["[[5], [1.5], [2]]", T.order2],
    ["12x3x4; T[11, 2, 3]", fill(T.orderN, { n: 3, idx: "i, j, k" })],
    ["4x4x3x3", fill(T.orderN, { n: 4, idx: "i, j, k, l" })],
  ]) {
    const { svg } = build(src).svg;
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /NaN|undefined/, src);
    assert.ok(captions(src).includes(cap), src);
  }
  assert.ok(captions("[[5], [1.5], [2]]").includes(fill(T.asMatrix, { r: 3, c: 1, v: "[5, 1.5, 2]", n: 3 })));
});

// ---------- operations ----------

const O = w.ops;
const ops = (src: string) => buildOps({ topic: "ops", src }, w).data;
const opsCaptions = (src: string) => [...buildOps({ topic: "ops", src }, w).svg.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
const opsThrows = (src: string, message: string) => assert.throws(() => buildOps({ topic: "ops", src }, w), { message }, src);
const randomShape = (order: number, hi = 3) => Array.from({ length: order }, () => int(1, hi));
/** A nested list of the given shape with random small numbers, so that no value gives away its place. */
const randomList = (shape: number[]): Nested => (shape.length ? Array.from({ length: shape[0] }, () => randomList(shape.slice(1))) : int(-9, 9));
const at = (v: Nested, idx: number[]) => idx.reduce((x: Nested, k) => (x as Nested[])[k], v) as number;
/** Every index of a shape, in row-major order. */
const indices = (shape: number[]): number[][] => (shape.length ? Array.from({ length: shape[0] }, (_, i) => indices(shape.slice(1)).map((r) => [i, ...r])).flat() : [[]]);

test("reshape keeps the numbers in memory order; −1 is worked out; flatten is reshape to one axis", () => {
  for (let i = 0; i < 40; i++) {
    // At most 12 numbers, so that one axis can hold them all and still be drawn.
    let shape = randomShape(int(1, 3), 4);
    while (shape.reduce((x, y) => x * y, 1) > 12) shape = randomShape(int(1, 3), 4);
    const list = JSON.stringify(randomList(shape));
    const n = shape.reduce((a, b) => a * b, 1);
    const d = ops(`${list}; reshape ${n}`);
    assert.deepEqual(d.out.data, d.inputs[0].data);
    assert.deepEqual(d.out.shape, [n]);
    assert.deepEqual(ops(`${list}; flatten`).out, d.out);
    assert.deepEqual(ops(`${list}; reshape(1, -1)`).out.shape, [1, n]);
  }
  const d = ops("2x3x4; T.reshape(3, -1); out[2, 5]");
  assert.deepEqual(d.out.shape, [3, 8]);
  assert.deepEqual(d.strides, [8, 1]);
  assert.equal(d.contiguous, true);
  assert.deepEqual(d.cells, [[21]]);
  assert.equal(d.out.data[21], 22);
  assert.deepEqual(ops("2x3x4; view 4x6").out.shape, [4, 6]);
  assert.deepEqual(ops("7; reshape 1 1").out, { shape: [1, 1], data: [7] });
  assert.ok(opsCaptions("2x3x4; reshape 3x-1").includes(fill(O.reshapeFree, { n: 24, m: 3, k: 8 })));
});

test("permute and transpose read the same memory with the strides moved", () => {
  for (let i = 0; i < 60; i++) {
    const order = int(2, 4);
    const shape = randomShape(order);
    const list = randomList(shape);
    // A random order of the axes, by sorting on random keys.
    const perm = Array.from({ length: order }, (_, k) => [rnd(), k]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
    const d = ops(`${JSON.stringify(list)}; permute ${perm.join(" ")}`);
    assert.deepEqual(d.out.shape, perm.map((k) => shape[k]));
    for (const idx of indices(d.out.shape)) {
      const orig: number[] = [];
      perm.forEach((k, j) => (orig[k] = idx[j]));
      assert.equal(d.out.data[idx.reduce((a, v, k) => a * d.out.shape[k] + v, 0)], at(list, orig));
    }
    assert.deepEqual(d.strides, perm.map((k) => strides(shape)[k]));
    assert.equal(d.contiguous, d.out.shape.every((len, k) => len === 1 || d.strides![k] === strides(d.out.shape)[k]));
  }
  const t = ops("[[1, 2, 3], [4, 5, 6]]; T");
  assert.deepEqual(t.out, { shape: [3, 2], data: [1, 4, 2, 5, 3, 6] });
  assert.equal(t.contiguous, false);
  assert.ok(opsCaptions("[[1, 2, 3], [4, 5, 6]]; T").includes("0, 3, 1, 4, 2, 5"));
  assert.ok(opsCaptions("4x4x3; permute 2 0 1").includes("0, 3, 6, 9, 12, 15, 18, 21, …"));
  assert.deepEqual(ops("2x3; transpose").out, ops("2x3; T.T").out);
  assert.deepEqual(ops("2x3x4; transpose 0 -1").out.shape, [4, 3, 2]);
  assert.deepEqual(ops("2x3x4; swapaxes 1 2").out.shape, [2, 4, 3]);
  assert.deepEqual(ops("2x3x4; .T").out.shape, [4, 3, 2]);
  // Moving an axis of length 1 keeps the result contiguous.
  assert.equal(ops("[[1, 2, 3]]; T").contiguous, true);
  assert.equal(ops("2x3; permute 0 1").contiguous, true);
  const p = ops("4x4x3; permute 2 0 1; [1, 0, 2]");
  assert.deepEqual(p.cells, [[7]]);
  assert.equal(p.out.data[18], 8);
  // A vector's .T changes nothing, and says why.
  const v = ops("[5, 3, 7]; T; [2]");
  assert.deepEqual(v.out, v.inputs[0]);
  const vc = opsCaptions("[5, 3, 7]; T");
  assert.ok(vc.includes(fill(O.vectorT, { n: 3 }).split(":")[0]));
  assert.ok(!vc.includes(O.contiguous));
});

test("sum, mean, max and min along an axis or over everything, with keepdims", () => {
  const apply = { sum: (xs: number[]) => xs.reduce((a, b) => a + b, 0), mean: (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length, max: (xs: number[]) => Math.max(...xs), min: (xs: number[]) => Math.min(...xs) };
  for (let i = 0; i < 60; i++) {
    const shape = randomShape(int(1, 4));
    const list = randomList(shape);
    const fn = (["sum", "mean", "max", "min"] as const)[int(0, 3)];
    const axis = int(0, shape.length - 1);
    const keep = rnd() < 0.5;
    const d = ops(`${JSON.stringify(list)}; ${fn}(axis=${axis}${keep ? ", keepdims=True" : ""})`);
    const kept = shape.map((len, k) => (k === axis ? 1 : len));
    assert.deepEqual(d.out.shape, keep ? kept : shape.filter((_, k) => k !== axis));
    indices(kept).forEach((idx, o) => {
      const xs = Array.from({ length: shape[axis] }, (_, j) => at(list, idx.map((v, k) => (k === axis ? j : v))));
      assert.ok(Math.abs(d.out.data[o] - apply[fn](xs)) < 1e-9, `${fn} ${axis}`);
    });
    // The entries said to make up out[0, …] are the ones along the axis.
    assert.equal(d.cells![0].length, shape[axis]);
  }
  const all = ops("[[1, 2], [3, 4]]; sum");
  assert.deepEqual(all.out, { shape: [], data: [10] });
  assert.deepEqual(all.cells, [[0, 1, 2, 3]]);
  assert.deepEqual(ops("[[1, 2], [3, 4]]; mean keepdims").out, { shape: [1, 1], data: [2.5] });
  assert.deepEqual(ops("[[1, 2], [3, 4]]; sum dim 1 keepdim false").out.shape, [2]);
  assert.deepEqual(ops("2x3x4; max axis -1; [1, 2]").cells, [[20, 21, 22, 23]]);
  assert.ok(opsCaptions("2x3x4; max axis -1; [1, 2]").includes("out[1, 2] = max(21, 22, 23, 24) = 24"));
  assert.ok(opsCaptions("[[1, -2, 3], [4, 5, 6]]; mean axis 1").includes("out[0] = (1 + (−2) + 3) / 3 = 0.6667"));
  assert.ok(opsCaptions("shape 12; sum").includes("out = 1 + 2 + 3 + … + 12 = 78"));
  assert.ok(opsCaptions("2x3; sum axis 0 keepdims").includes(fill(O.keepdims, { k: 0, b: "1, 3", fn: "sum" })));
});

test("broadcasting: shapes lined up from the right, length 1 and missing axes stretched", () => {
  const apply: Record<string, (x: number, y: number) => number> = { "+": (x, y) => x + y, "-": (x, y) => x - y, "*": (x, y) => x * y };
  for (let i = 0; i < 60; i++) {
    const shape = randomShape(int(1, 3));
    // B: some trailing axes of the shape, each kept or made 1.
    const bShape = shape.slice(int(0, shape.length - 1)).map((len) => (rnd() < 0.4 ? 1 : len));
    const [A, B] = [randomList(shape), randomList(bShape)];
    const op = ["+", "-", "*"][int(0, 2)];
    const d = ops(`${JSON.stringify(A)} ${op} ${JSON.stringify(B)}`);
    assert.deepEqual(d.out.shape, shape);
    indices(shape).forEach((idx, o) => {
      const ib = idx.slice(shape.length - bShape.length).map((v, k) => (bShape[k] === 1 ? 0 : v));
      assert.equal(d.out.data[o], apply[op](at(A, idx), at(B, ib)));
    });
  }
  const d = ops("[[0], [10], [20]] + [1, 2, 3, 4]; [2, 1]");
  assert.deepEqual(d.out.shape, [3, 4]);
  assert.deepEqual(d.cells, [[2], [1]]);
  const c = opsCaptions("[[0], [10], [20]] + [1, 2, 3, 4]; [2, 1]");
  assert.ok(c.includes("out[2, 1] = A[2, 0] + B[1] = 20 + 2 = 22"));
  assert.ok(c.includes(fill(O.stretch, { name: "A", k: 1, n: 4 }).split(":")[0]));
  assert.ok(c.includes(fill(O.missing, { name: "B", k: 0, n: 3 }).split(":")[0]));
  assert.ok(opsCaptions("2x3 + 2x3").includes(O.same));
  assert.ok(opsCaptions("2x3 * 10").includes("out[0, 0] = A[0, 0] · B = 1 · 10 = 10"));
  assert.ok(opsCaptions("2x3 * 10").includes(fill(O.scalar, { name: "B" }).split(":")[0]));
  assert.deepEqual(ops("[2, 4] / [2, 8]").out.data, [1, 0.5]);
  assert.deepEqual(ops("3 − 5").out, { shape: [], data: [-2] });
  assert.deepEqual(ops("[[1], [2]] + [[10, 20]]").out.data, [11, 21, 12, 22]);
  // Without spaces the signs belong to the numbers and 2*3 stays a shape.
  assert.deepEqual(ops("[-1, -2, -3] + 2*3").out, { shape: [2, 3], data: [0, 0, 0, 3, 3, 3] });
});

test("the matrix product: rows times columns, vectors as a row or a column, batches broadcast", () => {
  for (let i = 0; i < 50; i++) {
    const [n, k, m] = [int(1, 4), int(1, 4), int(1, 4)];
    const [A, B] = [randomList([n, k]), randomList([k, m])];
    const d = ops(`${JSON.stringify(A)} @ ${JSON.stringify(B)}`);
    assert.deepEqual(d.out.shape, [n, m]);
    indices([n, m]).forEach(([r, c], o) => assert.equal(d.out.data[o], Array.from({ length: k }, (_, t) => at(A, [r, t]) * at(B, [t, c])).reduce((a, b) => a + b, 0)));
  }
  const d = ops("[[1, 2, 3], [4, 5, 6]] @ [[7, 8], [9, 10], [11, 12]]; [1, 0]");
  assert.deepEqual(d.out.data, [58, 64, 139, 154]);
  assert.deepEqual(d.cells, [[3, 4, 5], [0, 2, 4]]);
  assert.ok(opsCaptions("[[1, 2, 3], [4, 5, 6]] @ [[7, 8], [9, 10], [11, 12]]; [1, 0]").includes("out[1, 0] = 4·7 + 5·9 + 6·11 = 139"));
  assert.deepEqual(ops("[[1, 2], [3, 4], [5, 6]] @ [10, 1]").out, { shape: [3], data: [12, 34, 56] });
  assert.deepEqual(ops("[1, 1] @ [[1, 2], [3, 4]]").out, { shape: [2], data: [4, 6] });
  assert.deepEqual(ops("[1, 2, 3] @ [4, 5, 6]").out, { shape: [], data: [32] });
  assert.ok(opsCaptions("[1, 2, 3] @ [4, 5, 6]").includes(O.matDot));
  assert.ok(opsCaptions("[1, 1] @ [[1, 2], [3, 4]]").includes(fill(O.matLeft, { k: 2 }).split(";")[0]));
  // A batch of matrices times one matrix, and two batches that broadcast.
  const b = ops("2x2x3 @ 3x2; [1, 0, 1]");
  assert.deepEqual(b.out.data, [22, 28, 49, 64, 76, 100, 103, 136]);
  assert.deepEqual(b.cells, [[6, 7, 8], [1, 3, 5]]);
  assert.deepEqual(ops("2x1x2x2 @ 3x2x1").out.shape, [2, 3, 2, 1]);
  assert.deepEqual(ops("[1, 2] @ 2x2x3").out, { shape: [2, 3], data: [9, 12, 15, 27, 30, 33] });
});

test("mistakes in an operation are refused with the reason", () => {
  opsThrows("", w.need.ops);
  opsThrows("2x3", O.opMissing);
  opsThrows("2x3; T; flatten", O.oneOp);
  opsThrows("2x3 + 2x3; T", O.oneOp);
  opsThrows("2x3 + 2x3 + 2x3", O.oneOp);
  opsThrows("@ 2x3", fill(w.bad, { s: "@ 2x3" }));
  for (const op of ["fold", "reshape", "reshape a", "reshape 2 -3", "flatten 1", "sum axis 0 1", "sum by 0", "constructor", "permute a"]) opsThrows(`2x3; ${op}`, fill(O.unknownOp, { s: op }));
  opsThrows("2x3; reshape 4x2", fill(O.reshapeCount, { n: 6, shape: "4, 2", m: 8 }));
  opsThrows("2x3; reshape -1 -1", O.reshapeTwoFree);
  opsThrows("2x3; reshape 4 -1", fill(O.reshapeSplit, { n: 6, m: 4 }));
  opsThrows("2x3; reshape 0 6", T.empty);
  opsThrows("shape 12; reshape 2x2x1x1x3", fill(T.tooBig, { order: 4, axis: 12, n: 144 }));
  opsThrows("2x3x4; permute 0 1", fill(O.permBad, { last: 2, example: "2, 1, 0" }));
  opsThrows("2x3x4; permute 0 1 1", fill(O.permBad, { last: 2, example: "2, 1, 0" }));
  opsThrows("2x3x4; transpose 0", O.swapCount);
  opsThrows("2x3; sum axis 2", fill(O.axisRange, { k: 2, last: 1, n: 2 }));
  opsThrows("2x3; permute 0 -3", fill(O.axisRange, { k: -3, last: 1, n: 2 }));
  opsThrows("5; T", O.noAxes);
  opsThrows("5; sum axis 0", O.noAxes);
  opsThrows("2x3 + [1, 2]", fill(O.incompatible, { a: "2, 3", b: "2", x: 3, y: 2 }));
  opsThrows("[1, 2] / [1, 0]", fill(O.divZero, { idx: "1" }));
  opsThrows("2x3 @ 2x3", fill(O.inner, { k: 3, k2: 2, a: "2, 3", b: "2, 3" }));
  opsThrows("2 @ 2x3", O.matScalar);
  opsThrows("2x2x3 @ 3x3x2", fill(O.incompatible, { a: "2", b: "3", x: 2, y: 3 }));
  opsThrows("2x3; sum axis 0; [3]", fill(T.pickRange, { i: 3, k: 0, m: 2 }));
  opsThrows("2x3 @ 3x2; [1]", fill(T.pickCount, { n: 2 }));
});

test("every operation draws, each slice under its own name", () => {
  for (const src of ["2x3x4; reshape 4x6; [3, 5]", "2x2x3; flatten", "4x4x3; permute 2 0 1; [1, 0, 2]", "2x2x2x2; sum axis 3", "2x3 * 10", "[1, 2, 3] @ [4, 5, 6]", "2x2x3 @ 3x2; [1, 0, 1]", "3x1x2 + 4x1; [2, 3, 1]"]) {
    const { svg } = buildOps({ topic: "ops", src }, w).svg;
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /NaN|undefined/, src);
  }
  const c = opsCaptions("2x2x3 @ 3x2");
  assert.ok(c.includes("A[1]") && c.includes("out[1]") && !c.includes("T[1]"));
});

// ---------- gradient descent ----------

const G = w.descent;
const descent = (src: string) => buildDescent({ topic: "descent", src }, w).data;
const descentCaptions = (src: string) => [...buildDescent({ topic: "descent", src }, w).svg.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const descentThrows = (src: string, message: string) => assert.throws(() => buildDescent({ topic: "descent", src }, w), { message }, src);
const close = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)), `${what}: ${a} vs ${b}`);

test("on a parabola the steps shrink by 1 − 2aη each time: they settle, overshoot or run away as that says", () => {
  for (let i = 0; i < 60; i++) {
    const [a, c, x0] = [int(1, 4), int(-5, 5), int(-5, 5)];
    const eta = Math.round(rnd() * 120) / 100 / a;
    if (!eta) continue;
    const d = descent(`${a}(x - ${c})^2; start ${x0}; rate ${eta}; steps 12`);
    const p = d.paths[0];
    const r = 1 - 2 * a * eta;
    p.points.forEach(([x], k) => close(x, c + (x0 - c) * r ** k, `x${k}`));
    assert.equal(d.vars, 1);
    assert.deepEqual(d.curvature, [2 * a]);
    if (x0 === c) assert.equal(p.verdict, "converged");
    else if (Math.abs(r) > 1) assert.equal(p.verdict, "diverged");
    else if (Math.abs(r) ** 12 * 2 * a * Math.abs(x0 - c) <= 1e-3 * Math.max(1, 2 * a * Math.abs(x0 - c))) assert.equal(p.verdict, "converged");
    else assert.equal(p.verdict, r === -1 ? "bounce" : "slow");
    if (x0 !== c && Math.abs(r) > 1e-9) assert.equal(p.zigzag, r < 0, `zigzag at r = ${r}`);
  }
  const once = descent("(x - 3)^2; start 0; rate 0.5; steps 3").paths[0];
  assert.deepEqual(once.points.map((p) => p[0]), [0, 3, 3, 3]);
  assert.equal(once.settled, 1);
});

test("a bowl in two variables: each coordinate follows its own parabola, and the curvatures are the Hessian's eigenvalues", () => {
  for (let i = 0; i < 30; i++) {
    const [a, b] = [int(1, 6), int(1, 6)];
    const [x0, y0] = [int(-4, 4), int(-4, 4)];
    const eta = Math.round(rnd() * 15) / 100 + 0.01;
    const d = descent(`${a}x^2 + ${b}y^2; start (${x0}, ${y0}); rate ${eta}; steps 15`);
    d.paths[0].points.forEach(([x, y], k) => {
      close(x, x0 * (1 - 2 * a * eta) ** k, `x${k}`);
      close(y, y0 * (1 - 2 * b * eta) ** k, `y${k}`);
    });
    assert.equal(d.vars, 2);
    assert.deepEqual(d.curvature, [2 * Math.max(a, b), 2 * Math.min(a, b)]);
  }
  // A tilted bowl: x² + xy + y² has curvatures 3 and 1.
  descent("x^2 + x y + y^2; start (2, 1)").curvature!.forEach((c, i) => close(c, [3, 1][i], "curvature"));
});

test("momentum: v = βv − η∇f, x = x + v, step by step", () => {
  for (let i = 0; i < 20; i++) {
    const [a, b] = [int(1, 5), int(1, 10)];
    const eta = Math.round(rnd() * 8) / 100 + 0.01;
    const beta = Math.round(rnd() * 90) / 100;
    const d = descent(`${a}x^2 + ${b}y^2; start (5, 2); rate ${eta}; momentum ${beta}; steps 20`);
    let [x, y, vx, vy] = [5, 2, 0, 0];
    d.paths[0].points.forEach((p, k) => {
      close(p[0], x, `x${k}`);
      close(p[1], y, `y${k}`);
      [vx, vy] = [beta * vx - eta * 2 * a * x, beta * vy - eta * 2 * b * y];
      [x, y] = [x + vx, y + vy];
    });
  }
  // In the long valley, momentum gets there in fewer steps than the best plain rate.
  const plain = descent("x^2 + 10y^2; start (8, 1); rate 0.09").paths[0];
  const heavy = descent("x^2 + 10y^2; start (8, 1); rate 0.05; momentum 0.5").paths[0];
  assert.ok(heavy.settled! < plain.settled!);
  assert.ok(plain.zigzag);
  const c = descentCaptions("x^2 + 10y^2; start (8, 1); rate 0.05; momentum 0.5");
  assert.ok(c.includes(fill(G.momentum, { beta: "0.5" }).split(":")[0]));
  assert.ok(c.includes(fill(G.valley, { r: "10" }).split(":")[0]));
  assert.ok(!c.includes("η < 2 / 20"));
});

test("the gradient is the one worked out by hand", () => {
  for (let i = 0; i < 30; i++) {
    const [x, y] = [int(-20, 20) / 10, int(-20, 20) / 10];
    const g = descent(`sin(x) y + x^2 y^3 + e^(x - y); start (${x}, ${y}); steps 1`).paths[0].grad[0];
    close(g[0], Math.cos(x) * y + 2 * x * y ** 3 + Math.exp(x - y), "∂f/∂x");
    close(g[1], Math.sin(x) + 3 * x ** 2 * y ** 2 - Math.exp(x - y), "∂f/∂y");
  }
  close(descent("f(x) = x^3 - 2x; start 1.5; steps 1").paths[0].grad[0][0], 3 * 1.5 ** 2 - 2, "f′");
  close(descent("f(x, y) = x y; start (2, 3); steps 1").paths[0].grad[0][1], 2, "∂f/∂y");
});

test("a maximum, a saddle, a local minimum, slow progress and steps that run off to infinity", () => {
  const max = descent("x^4/4 - x^2; start 0");
  assert.equal(max.paths[0].verdict, "max");
  assert.equal(max.paths[0].settled, 0);
  assert.equal(descent("-(x^2 + y^2); start (0, 0)").paths[0].verdict, "max");
  assert.equal(descent("x^2 - y^2; start (3, 0); rate 0.1").paths[0].verdict, "saddle");
  const local = descent("x^4 - 3x^2 + x; start 1.5; rate 0.05");
  assert.equal(local.paths[0].verdict, "converged");
  assert.ok(Math.abs(local.lower![0] + 1.2979) < 0.02);
  assert.equal(descent("x^4 - 3x^2 + x; start -1.5; rate 0.05").lower, undefined);
  assert.equal(descent("(1 - x)^2 + 100(y - x^2)^2; start (-1.2, 1); rate 0.001; steps 100").paths[0].verdict, "slow");
  const away = descent("x^4; start 3; rate 0.5; steps 20").paths[0];
  assert.equal(away.verdict, "diverged");
  assert.ok(away.points.length < 21 && away.points.flat().every(Number.isFinite));
  const three = descent("(x - 3)^2; start 0; rate 0.02, 0.4, 1.05; steps 12").paths.map((p) => p.verdict);
  assert.deepEqual(three, ["slow", "converged", "diverged"]);
  const c = descentCaptions("(x - 3)^2; start 0; rate 0.02, 0.4, 1.05; steps 12");
  assert.ok(c.includes("f′(0) = −6, so x₁ = 0 − 0.02 · (−6) = 0.12"));
  assert.ok(c.includes("η < 2 / f″ = 1"));
  assert.ok(c.includes(fill(G.small, { eta: "0.02" })));
  assert.ok(!c.includes(fill(G.small, { eta: "1.05" })));
  const bounce = descent("(x - 3)^2; start 0; rate 1; steps 6").paths[0];
  assert.equal(bounce.verdict, "bounce");
  assert.deepEqual(bounce.points.map((p) => p[0]), [0, 6, 0, 6, 0, 6, 0]);
  assert.ok(descentCaptions("x^4 - 3x^2 + x; start 1.5; rate 0.05").includes("f is lower at −1.29"));
  assert.ok(descentCaptions("x^2 - y^2; start (3, 0); rate 0.1").includes("saddle point"));
});

test("wrong options are refused with the reason", () => {
  descentThrows("", w.need.descent);
  descentThrows("x + z", G.vars);
  descentThrows("x^2; speed 3", fill(G.badOpt, { s: "speed 3" }));
  descentThrows("x^2; start (1, 2)", fill(G.badStart, { n: 1, example: "4" }));
  descentThrows("x^2 + y^2; start 1", fill(G.badStart, { n: 2, example: "(4, 1)" }));
  descentThrows("x^2; start a", fill(G.badStart, { n: 1, example: "4" }));
  for (const r of ["0", "-0.1", "0.1, 0.2, 0.3, 0.4", ""]) descentThrows(`x^2; rate ${r}`, fill(G.badRate, { max: 3 }));
  for (const n of ["0", "101", "2.5", "1 2"]) descentThrows(`x^2; steps ${n}`, fill(G.badSteps, { max: 100 }));
  for (const m of ["1", "-0.1", "0.5 0.5"]) descentThrows(`x^2; momentum ${m}`, G.badMomentum);
  descentThrows("ln(x); start 0", fill(G.undefinedAt, { p: "0" }));
  descentThrows("sqrt(x) + y; start (-1, 0)", fill(G.undefinedAt, { p: "(−1, 0)" }));
});

test("every descent picture draws", () => {
  for (const src of ["(x - 3)^2; start 0; rate 0.1", "x^4/4 - x^2; start 0", "x^4 - 3x^2 + x; start 1.5; rate 0.05", "x^2 + 10y^2; start (8, 1); rate 0.09", "x^2; start 0", "7; start 1", "x^4; start 3; rate 0.5; steps 5"]) {
    const { svg } = buildDescent({ topic: "descent", src }, w).svg;
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /NaN|undefined/, src);
  }
});

// ---------- backpropagation ----------

const P = w.backprop;
const backprop = (src: string) => buildBackprop({ topic: "backprop", src }, w).data;
const backpropCaptions = (src: string) => [...buildBackprop({ topic: "backprop", src }, w).svg.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
const backpropThrows = (src: string, message: string) => assert.throws(() => buildBackprop({ topic: "backprop", src }, w), { message }, src);

/** A random expression in a, b and c, as typed and as JavaScript. */
function randomExpr(depth: number): [string, string] {
  if (depth === 0 || rnd() < 0.2) {
    const v = ["a", "b", "c", "2", "0.5"][int(0, 4)];
    return [v, v];
  }
  const [x, jx] = randomExpr(depth - 1);
  const [y, jy] = randomExpr(depth - 1);
  switch (int(0, 8)) {
    case 0: return [`(${x} + ${y})`, `(${jx} + ${jy})`];
    case 1: return [`(${x} - ${y})`, `(${jx} - ${jy})`];
    case 2: return [`(${x}) (${y})`, `(${jx}) * (${jy})`];
    case 3: return [`(${x}) / ((${y})^2 + 1)`, `(${jx}) / ((${jy}) ** 2 + 1)`];
    case 4: return [`(${x})^2`, `(${jx}) ** 2`];
    case 5: return [`sigmoid(${x})`, `1 / (1 + Math.exp(-(${jx})))`];
    case 6: return [`tanh(${x})`, `Math.tanh(${jx})`];
    case 7: return [`sin(${x})`, `Math.sin(${jx})`];
    default: return [`-(${x})`, `-(${jx})`];
  }
}

test("on random expressions every gradient matches a central difference of the same expression in JavaScript", () => {
  let checked = 0;
  while (checked < 80) {
    const [src, js] = randomExpr(3);
    if (!/[abc]/.test(src.replace(/sigmoid|tanh|sin/g, ""))) continue;
    const f = new Function("a", "b", "c", `return ${js};`) as (a: number, b: number, c: number) => number;
    const vals = { a: int(-20, 20) / 10, b: int(-20, 20) / 10, c: int(-20, 20) / 10 };
    const names = src.replace(/sigmoid|tanh|sin/g, "");
    const used = (["a", "b", "c"] as const).filter((v) => names.includes(v));
    let d;
    try {
      d = backprop(`${src}; ${used.map((v) => `${v} = ${vals[v]}`).join(", ")}`);
    } catch (e) {
      // A random expression can be too big to draw; that is refused, not wrong.
      assert.equal((e as Error).message, fill(P.tooBig, { n: 24, c: 8 }));
      continue;
    }
    const L = (dv: Partial<typeof vals>) => f(dv.a ?? vals.a, dv.b ?? vals.b, dv.c ?? vals.c);
    close(d.nodes[d.nodes.length - 1].value, L({}), `L of ${src}`);
    for (const v of used) {
      const h = 1e-6;
      const num = (L({ [v]: vals[v] + h }) - L({ [v]: vals[v] - h })) / (2 * h);
      assert.ok(Math.abs(d.grads[v] - num) <= 1e-5 * Math.max(1, Math.abs(num)), `∂/∂${v} of ${src}: ${d.grads[v]} vs ${num}`);
    }
    checked++;
  }
});

test("names, implicit products, folded constants and an input used more than once", () => {
  const d = backprop("(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10");
  assert.deepEqual(d.nodes.map((n) => n.name), ["w", "x", "u₁", "b", "u₂", "y", "u₃", "L"]);
  assert.deepEqual(d.grads, { w: -12, x: -18, b: -6, y: 6 });
  assert.equal(d.nodes[7].label, "·²");
  assert.equal(d.explain, "w");
  assert.equal(d.paths, 1);
  close(d.check, -12, "check");
  assert.deepEqual(backprop("w1x1 + w_2 x2; w1 = 2, x1 = 3, w2 = 4, x2 = 5").grads, { w1: 3, x1: 2, w2: 5, x2: 4 });
  assert.deepEqual(backprop("2w + 3; w = 5").nodes.map((n) => n.label), ["w", "2 × ·", "· + 3"]);
  assert.deepEqual(backprop("1 - x / 4; x = 2").nodes.map((n) => n.label), ["x", "· ÷ 4", "1 − ·"]);
  assert.equal(backprop("-x^2; x = 3").nodes[2].value, -9);
  assert.equal(backprop("L = 2(x + 1); x = 1").grads.x, 2);
  close(backprop("σ(x) + log(x); x = 1").grads.x, Math.exp(-1) / (1 + Math.exp(-1)) ** 2 + 1, "σ′ + 1/x");
  close(backprop("2^x; x = 3").grads.x, 8 * Math.log(2), "2^x");
  close(backprop("x^y; x = 2, y = 3").grads.y, 8 * Math.log(2), "x^y in y");
  close(backprop("sqrt(x) + abs(y) + exp(z) + cos(t) - (2 + 3) * relu(u); x = 4, y = -2, z = 0, t = 0, u = 1").grads.u, -5, "folded 2 + 3");
  const twice = backprop("x x; x = 3; explain x");
  assert.equal(twice.grads.x, 6);
  assert.equal(twice.paths, 2);
  const many = backprop("x x x x x; x = 1.5");
  close(many.grads.x, 5 * 1.5 ** 4, "x⁵");
  assert.equal(many.paths, 5);
  assert.ok(backpropCaptions("x x x x x; x = 1.5").includes(fill(P.manyPaths, { v: "x", n: 5, g: "25.3125" })));
  const c = backpropCaptions("x y + x; x = 2, y = 3; explain x");
  assert.ok(c.includes("∂L/∂x = ∂L/∂u₁ · ∂u₁/∂x + ∂L/∂x = 1 · 3 + 1 = 4"));
  assert.ok(c.includes(fill(P.fanout, { v: "x", n: 2 }).split(",")[0]));
  assert.ok(backpropCaptions("(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10").includes("= (−6) · 1 · 1 · 2 = −12"));
  // A lone input is its own output.
  assert.deepEqual(backprop("w; w = 2").grads, { w: 1 });
});

test("dead ReLUs, saturated sigmoids and a step of gradient descent", () => {
  assert.ok(backpropCaptions("relu(w x + b); x = 1, w = -2, b = 1").includes(fill(P.dead, { node: "L", a: "−1" }).split(",")[0]));
  assert.deepEqual(backprop("relu(w x + b); x = 1, w = -2, b = 1").grads, { w: 0, x: 0, b: 0 });
  assert.ok(backpropCaptions("sigmoid(w x); x = 10, w = 1").includes("σ′ = 4.5e−5"));
  assert.ok(!backpropCaptions("sigmoid(w x); x = 1, w = 1").includes("saturated"));
  const s = backprop("(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10; learn w b; rate 0.01").step!;
  assert.deepEqual(s.values, { x: 2, w: 3.12, b: 1.06, y: 10 });
  close(s.loss, (3.12 * 2 + 1.06 - 10) ** 2, "new L");
  assert.ok(backpropCaptions("(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10; learn w b; rate 0.01").includes(fill(P.lossDown, { a: "9", b: "7.29" })));
  // learn alone takes η = 0.1; rate alone moves every input; too large a rate makes L rise.
  assert.equal(backprop("w^2; w = 1; learn w").step!.values.w, 0.8);
  assert.deepEqual(backprop("w x; w = 1, x = 2; rate 0.5").step!.values, { w: 0, x: 1.5 });
  assert.ok(backpropCaptions("w^2; w = 1; rate 1.5").includes(fill(P.lossUp, { a: "1", b: "4" })));
  assert.equal(backprop("(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10; learn b; explain x").explain, "x");
  assert.equal(backprop("(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10; learn b").explain, "b");
});

test("wrong expressions, values and options are refused with the reason", () => {
  backpropThrows("", w.need.backprop);
  backpropThrows("w +; w = 1", fill(w.bad, { s: "w +" }));
  backpropThrows("w $ 2", fill(w.bad, { s: "w $ 2" }));
  backpropThrows("(w + 1", fill(w.bad, { s: "(w + 1" }));
  backpropThrows("sigmoid w", fill(w.bad, { s: "sigmoid w" }));
  backpropThrows("2 + 3", P.noInputs);
  backpropThrows("ln(x); x = -1", fill(P.notReal, { node: "L", label: "ln" }));
  backpropThrows("x / y; x = 1, y = 0", fill(P.notReal, { node: "L", label: "÷" }));
  backpropThrows("sqrt(x); x = 0", fill(P.notReal, { node: "L", label: "√" }));
  backpropThrows("w x; w = 1, x = 2; explain z", fill(P.notInput, { v: "z" }));
  backpropThrows("w x; w = 1, x = 2; explain w x", fill(P.badOpt, { s: "explain w x" }));
  backpropThrows("w x; w = 1, x = 2; fast", fill(P.badOpt, { s: "fast" }));
  backpropThrows("w x; w = 1, x = 2, 3", fill(P.badOpt, { s: "3" }));
  backpropThrows("w x; w = 1, x = 2; rate 0", P.badRate);
  backpropThrows("w x; w = 1, x = 2, z = 3", fill(P.extraValue, { v: "z" }));
  backpropThrows("w x; w = 1, x = a", fill(P.badValue, { s: "x = a" }));
  backpropThrows("w x; w = 1", fill(P.noValue, { v: "x" }));
  backpropThrows(`${Array.from({ length: 13 }, (_, i) => `x${i}`).join(" + ")}; ${Array.from({ length: 13 }, (_, i) => `x${i} = 1`).join(", ")}`, fill(P.tooBig, { n: 24, c: 8 }));
  backpropThrows("sin(cos(sin(cos(sin(cos(sin(cos(x)))))))); x = 1", fill(P.tooBig, { n: 24, c: 8 }));
});

test("every backprop picture draws", () => {
  for (const src of ["(x + y) z; x = -2, y = 5, z = -4", "w; w = 2", "x x; x = 3", "(v relu(w x + b) + c - y)^2; x = 1, w = 2, b = -0.5, v = 3, c = 0.5, y = 3; learn w b v c; rate 0.01"]) {
    const { svg } = buildBackprop({ topic: "backprop", src }, w).svg;
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /NaN|undefined/, src);
  }
});

// ---------- softmax and cross-entropy ----------

const X_ = w.softmax;
const sm = (src: string) => buildSoftmax({ topic: "softmax", src }, w).data;
const smCaptions = (src: string) => [...buildSoftmax({ topic: "softmax", src }, w).svg.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
const smThrows = (src: string, message: string) => assert.throws(() => buildSoftmax({ topic: "softmax", src }, w), { message }, src);
const randomLogits = () => Array.from({ length: int(2, 6) }, () => int(-40, 40) / 10);

test("softmax: the formula, a sum of 1, the order kept, a shift ignored, finite for huge scores", () => {
  for (let i = 0; i < 60; i++) {
    const z = randomLogits();
    const p = softmax(z);
    const sum = z.reduce((a, v) => a + Math.exp(v), 0);
    p.forEach((v, j) => close(v, Math.exp(z[j]) / sum, `p${j}`));
    close(p.reduce((a, b) => a + b, 0), 1, "Σp");
    softmax(z.map((v) => v + 1000)).forEach((v, j) => close(v, p[j], "shifted"));
    for (let a = 0; a < z.length; a++) for (let b = 0; b < z.length; b++) if (z[a] > z[b]) assert.ok(p[a] > p[b]);
    assert.deepEqual(sm(JSON.stringify(z)).probs[0], p);
  }
  const huge = sm("[1000, 999, 990]; target 1");
  assert.ok(huge.probs[0].every(Number.isFinite));
  close(huge.probs[0][0], 1 / (1 + Math.exp(-1) + Math.exp(-10)), "p₀ of huge scores");
  assert.ok(smCaptions("[1000, 999, 990]").includes(fill(X_.overflow, { m: "1000" }).split(" (")[0]));
  assert.ok(!smCaptions("[2, 1, 0.1]").includes("overflow a computer"));
  // Plain numbers without brackets are read too.
  assert.deepEqual(sm("2, 1, 0.1").logits, [2, 1, 0.1]);
});

test("temperature: low T heads for the largest score, high T for uniform; two classes are a sigmoid", () => {
  const z = [2, 1, 0.1];
  const d = sm("[2, 1, 0.1]; temperature 0.05, 1, 100");
  assert.deepEqual(d.temps, [0.05, 1, 100]);
  assert.ok(d.probs[0][0] > 0.9999);
  d.probs[2].forEach((v) => assert.ok(Math.abs(v - 1 / 3) < 0.01));
  d.probs.forEach((q, j) => q.forEach((v, i) => close(v, softmax(z.map((t) => t / d.temps[j]))[i], "p at T")));
  assert.equal(d.grad, undefined);
  assert.ok(smCaptions("[2, 1, 0.1]; T = 0.5").includes(fill(X_.temp, { t: "0.5", p: "0.8638", label: fill(X_.classN, { i: 0 }) })));
  const two = sm("[1.5, 0]; target 0");
  close(two.probs[0][0], 1 / (1 + Math.exp(-1.5)), "σ(1.5)");
  assert.ok(smCaptions("[1.5, 0]").includes("σ(1.5) = 0.8176"));
  assert.ok(!smCaptions("[1.5, 0, 1]").includes("sigmoid of the difference"));
});

test("cross-entropy: −ln p for a class, −Σ y ln p for a distribution, never below the target's entropy", () => {
  for (let i = 0; i < 40; i++) {
    const z = randomLogits();
    const c = int(0, z.length - 1);
    const d = sm(`${JSON.stringify(z)}; target ${c}`);
    close(d.loss![0], -Math.log(softmax(z)[c]), "−ln p");
    assert.deepEqual(d.target, z.map((_, j) => (j === c ? 1 : 0)));
    // A soft target: random weights that add up to 1.
    const raw = z.map(() => int(1, 9));
    const y = raw.map((v) => v / raw.reduce((a, b) => a + b, 0));
    const soft = sm(`${JSON.stringify(z)}; target ${JSON.stringify(y)}`);
    const H = -y.reduce((a, v) => a + v * Math.log(v), 0);
    close(soft.loss![0], -y.reduce((a, v, j) => a + v * Math.log(softmax(z)[j]), 0), "−Σ y ln p");
    assert.ok(soft.loss![0] >= H - 1e-12, "Gibbs");
    // Scores ln y give p = y, where the loss is the entropy itself.
    close(sm(`${JSON.stringify(y.map(Math.log))}; target ${JSON.stringify(y)}`).loss![0], H, "H(y)");
  }
  const labelled = sm("[2, 1, 0.1]; labels cat, dog, bird; target bird");
  close(labelled.loss![0], -Math.log(softmax([2, 1, 0.1])[2]), "by label");
  const c = smCaptions("[2, 1, 0.1]; labels cat, dog, bird; target cat");
  assert.ok(c.includes("Cross-entropy with target cat: L = −ln p = −ln 0.659 = 0.417."));
  assert.ok(c.includes(fill(X_.uniform, { k: 3, u: "1.0986" })));
  assert.ok(smCaptions("[8, 1, -2]; labels cat, dog, bird; target dog").includes(fill(X_.confident, { label: "cat", p: "0.9988", L: "7.001" }).split(":")[0]));
  assert.ok(!smCaptions("[2, 1, 0.1]; target 1").includes("Confidently wrong"));
  assert.ok(smCaptions("[2, 1, 0.1]; target [0.8, 0.1, 0.1]").includes("the KL divergence"));
  const temps = sm("[2, 1, 0.1]; temperature 0.5, 1, 5; target 0");
  temps.loss!.forEach((L, j) => close(L, -Math.log(softmax([2, 1, 0.1].map((v) => v / temps.temps[j]))[0]), "loss at T"));
  // When the labels are numbers themselves, a label wins over a class number, as target cat does.
  assert.deepEqual(sm("[1, 2]; labels 1 0; target 1").target, [1, 0]);
});

test("the gradient of the loss with respect to the scores is (p − y) / T", () => {
  for (let i = 0; i < 40; i++) {
    const z = randomLogits();
    const c = int(0, z.length - 1);
    const T = [1, 0.5, 2][int(0, 2)];
    const d = sm(`${JSON.stringify(z)}; target ${c}; temperature ${T}`);
    const L = (zs: number[]) => -Math.log(softmax(zs, T)[c]);
    z.forEach((_, j) => {
      const h = 1e-6;
      const num = (L(z.map((v, k) => (k === j ? v + h : v))) - L(z.map((v, k) => (k === j ? v - h : v)))) / (2 * h);
      assert.ok(Math.abs(d.grad![j] - num) < 1e-6, `∂L/∂z${j}: ${d.grad![j]} vs ${num}`);
    });
  }
  assert.ok(smCaptions("[2, 1, 0.1]; target 0").includes(fill(X_.gradient, { g: "pᵢ − yᵢ" }).split(":")[0]));
  assert.ok(smCaptions("[2, 1, 0.1]; target 0; T = 2").includes("(pᵢ − yᵢ) / T, with T = 2"));
  assert.ok(smCaptions("[2, 1, 0.1]; target [0.5, 0.5, 0]").includes(fill(X_.gradientSoft, { g: "pᵢ − yᵢ" }).split(":")[0]));
});

test("wrong scores and options are refused with the reason", () => {
  const count = fill(X_.count, { max: 10 });
  smThrows("", w.need.softmax);
  smThrows("[3]", count);
  smThrows(JSON.stringify(Array.from({ length: 11 }, (_, i) => i)), count);
  smThrows("[[1, 2], [3, 4]]", count);
  smThrows("[1, a]", fill(w.bad, { s: "a]" }));
  smThrows("[1, 2]; colour red", fill(X_.badOpt, { s: "colour red" }));
  smThrows("[1, 2, 3]; labels a, b", fill(X_.badLabels, { k: 3 }));
  for (const t of ["0", "-1", "1, 2, 3, 4", ""]) smThrows(`[1, 2]; temperature ${t}`, fill(X_.badTemp, { max: 3 }));
  const target = fill(X_.badTarget, { last: 2, k: 3 });
  for (const t of ["3", "cat", "[0.5, 0.5]", "[0.5, 0.6, -0.1]", "[0.3, 0.3, 0.3]"]) smThrows(`[1, 2, 3]; target ${t}`, target);
});

test("every softmax picture draws", () => {
  for (const src of ["[2, 1, 0.1]", "[2, 1, 0.1]; labels cat, dog, bird; target cat", "[2, 1, 0.1]; temperature 0.5, 1, 5; target 0", "[2, 1, 0.1]; target [0.8, 0.1, 0.1]", "[1000, 999, 990]; target 1", "[0.2, -1, 3.1, 0.5, -0.3, 1.2, 0, -2, 2.4, 0.1]; target 8"]) {
    const { svg } = buildSoftmax({ topic: "softmax", src }, w).svg;
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /NaN|undefined/, src);
  }
});

// ---------- embeddings and cosine similarity ----------

const Em = w.embed;
const emb = (src: string) => buildEmbed({ topic: "embed", src }, w).data;
const emCaptions = (src: string) => [...buildEmbed({ topic: "embed", src }, w).svg.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
const emThrows = (src: string, message: string) => assert.throws(() => buildEmbed({ topic: "embed", src }, w), { message }, src);
const len = (v: number[]) => Math.sqrt(v.reduce((a, x) => a + x * x, 0));
const dotP = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
/** A vector of whole tenths that is not all zeros. */
const randomVec = (n: number): number[] => {
  const v = Array.from({ length: n }, () => int(-30, 30) / 10);
  return len(v) ? v : randomVec(n);
};
const named = (vs: number[][]) => vs.map((v, i) => `w${i} ${JSON.stringify(v)}`).join(", ");
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

test("cosine: a · b / (|a| |b|), within [−1, 1], blind to length, the dot product of unit vectors", () => {
  for (let i = 0; i < 60; i++) {
    const n = int(2, 6);
    const [a, b] = [randomVec(n), randomVec(n)];
    const c = cosine(a, b);
    close(c, dotP(a, b) / (len(a) * len(b)), "cos");
    assert.ok(Math.abs(c) <= 1, "Cauchy–Schwarz");
    const s = int(1, 9) / 2;
    close(cosine(a.map((x) => x * s), b), c, "scaled");
    close(cosine(a.map((x) => -x * s), b), -c, "turned round");
    const [ua, ub] = [a.map((x) => x / len(a)), b.map((x) => x / len(b))];
    close(dotP(ua, ub), c, "â · b̂");
    close(len(ua.map((x, t) => x - ub[t])) ** 2, 2 - 2 * c, "|â − b̂|²");
    const d = emb(named([a, b]));
    assert.deepEqual(d.pair, [0, 1]);
    close(d.cos[0][1], c, "matrix");
    close(d.dot!, dotP(a, b), "dot");
    close(d.angle!, (Math.acos(c) * 180) / Math.PI, "angle");
    close(d.distance!, len(a.map((x, t) => x - b[t])), "distance");
    d.norms.forEach((v, j) => close(v, len([a, b][j]), "norm"));
  }
  for (let i = 0; i < 20; i++) {
    const vs = Array.from({ length: int(2, 8) }, () => randomVec(3));
    const { cos } = emb(named(vs));
    cos.forEach((row, r) => row.forEach((c, k) => (close(c, cos[k][r], "symmetric"), r === k && close(c, 1, "diagonal"))));
  }
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([1, 2], [-2, -4]), -1);
  const parallel = emb("a [1, 2], b [2, 4]");
  assert.equal(parallel.cos[0][1], 1);
  assert.equal(parallel.angle, 0);
  assert.ok(emCaptions("a [1, 2], b [2, 4]").includes("|2 · a − b| = 0"));
});

test("the angle is put in words: alike, something in common, unrelated, apart", () => {
  const how = (src: string, s: string, a = "a", b = "b") => assert.ok(emCaptions(src).includes(fill(s, { a, b }).split(" (")[0]), src);
  how("a [1, 0.1], b [1, 0]", Em.close);
  how("a [1, 1], b [1, 0]", Em.some);
  how("a [1, 0], b [0, 1]", Em.right);
  how("a [1, 0], b [-1, -0.2]", Em.apart);
  assert.ok(emCaptions("a [3, 1], b [1, 2]").includes("θ = 45°"));
  assert.ok(emCaptions("cat [0.9, 0.8, 0.1], dog [0.85, 0.75, 0.2]").includes("cat · dog = 0.9 · 0.85 + 0.8 · 0.75 + 0.1 · 0.2 = 1.385."));
  // Negative entries are bracketed in the products, and a long vector is cut short.
  assert.ok(emCaptions("a [1, -2], b [-3, 4]").includes("1 · (−3) + −2 · 4"));
  assert.ok(emCaptions(named([range(10).map((t) => t + 1), range(10).map(() => 1)])).includes("+ 4 · 1 + 5 · 1 + … ="));
});

test("a query ranks the others by cosine, and says when the plain dot product would not", () => {
  for (let i = 0; i < 40; i++) {
    const vs = Array.from({ length: int(2, 8) }, () => randomVec(3));
    const q = int(0, vs.length - 1);
    const d = emb(`${named(vs)}; query w${q}`);
    const want = vs.map((v, j) => ({ j, c: cosine(vs[q], v) })).filter((x) => x.j !== q);
    assert.equal(d.ranked!.length, vs.length - 1);
    d.ranked!.forEach((r, t) => {
      assert.notEqual(r.name, `w${q}`);
      close(r.cos, cosine(vs[q], vs[Number(r.name.slice(1))]), "ranked cos");
      if (t) assert.ok(d.ranked![t - 1].cos >= r.cos, "nearest first");
    });
    close(d.ranked![0].cos, Math.max(...want.map((x) => x.c)), "the nearest");
    assert.deepEqual(d.pair, [q, Number(d.ranked![0].name.slice(1))]);
  }
  const c = emCaptions("q [1, 0.1], near [0.9, 0.2], long [2, 1.5]; query q");
  assert.ok(c.includes("Nearest to q by cosine: near 0.993, long 0.856."));
  assert.ok(c.includes(fill(Em.byDot, { x: "long", y: "near", n: "2.5" }).split(":")[0]));
  assert.ok(!emCaptions("cat [0.9, 0.8, 0.1], dog [0.85, 0.75, 0.2], car [0.1, 0.2, 0.9]; query cat").includes("plain dot product"));
  // compare picks the pair whatever the query.
  assert.deepEqual(emb("a [1, 0], b [0, 1], c [1, 1]; query a; compare b c").pair, [1, 2]);
});

test("an analogy: a − b + c, and the nearest vector to it besides those three", () => {
  const royal = emb(AI_PRESETS.embed.find((p) => p.label === "king − man + woman")!.spec.src);
  assert.equal(royal.analogy!.best, "queen");
  assert.deepEqual(royal.analogy!.vector, [0.97, -0.75]);
  assert.equal(royal.pair, undefined);
  const capital = emb(AI_PRESETS.embed.find((p) => p.label === "Paris − France + Italy")!.spec.src);
  assert.equal(capital.analogy!.best, "rome");
  assert.deepEqual(capital.analogy!.vector, [0.9, 0, 0.9, 0]);
  for (let i = 0; i < 40; i++) {
    const vs = Array.from({ length: int(4, 8) }, () => randomVec(3));
    const [a, b, c] = [0, 1, 2];
    const v = vs[a].map((x, t) => x - vs[b][t] + vs[c][t]);
    if (!len(v)) continue;
    const d = emb(`${named(vs)}; analogy w${a} − w${b} + w${c}`);
    const others = range(vs.length).filter((j) => j > 2);
    const best = others.reduce((m, j) => (cosine(v, vs[j]) > cosine(v, vs[m]) ? j : m));
    close(d.analogy!.cos, cosine(v, vs[best]), "nearest cos");
    d.analogy!.vector.forEach((x, t) => close(x, v[t], "a − b + c"));
  }
  const c = emCaptions("king [0.95, 0.9], queen [0.92, -0.85], man [0.1, 0.85], woman [0.12, -0.8]; analogy king - man + woman");
  assert.ok(c.includes("king − man + woman = [0.97, −0.75]."));
  assert.ok(c.includes("man is to king as woman is to queen."));
  assert.deepEqual(emb("a [1, 0], b [0, 1], c [1, 1], d [2, 1]; analogy a - b + c; compare a d").pair, [0, 3]);
});

test("vectors are read named, with = or :, in any alphabet, or as the rows of a list", () => {
  assert.deepEqual(emb("[[1, 0, 1], [0, 1, 1]]").names, ["a", "b"]);
  assert.deepEqual(emb("[1, 0], [0, 1], [1, 1]").vectors, [[1, 0], [0, 1], [1, 1]]);
  assert.deepEqual(emb("кот [1, 0], ძაღლი = [0, 1], c_1: [1, 1]").names, ["кот", "ძაღლი", "c_1"]);
  assert.deepEqual(emb("x [1 2], y [−3 4]").vectors, [[1, 2], [-3, 4]]);
  // Two vectors have no matrix to speak of; three do.
  assert.ok(!emCaptions("a [1, 0], b [0, 1]").includes("EEᵀ"));
  assert.ok(emCaptions("a [1, 0], b [0, 1], c [1, 1]").includes("EEᵀ"));
});

test("wrong vectors and options are refused with the reason", () => {
  const count = fill(Em.count, { max: 8 });
  const dims = fill(Em.dims, { max: 12 });
  emThrows("", w.need.embed);
  emThrows("cat [1, 2]", count);
  emThrows("[1, 2]", count);
  emThrows(named(Array.from({ length: 9 }, () => [1, 2])), count);
  emThrows("a [1, 2], b [1, 2, 3]", dims);
  emThrows("a [1], b [2]", dims);
  emThrows("a [], b []", dims);
  emThrows(named([range(13), range(13)]), dims);
  emThrows("[[1, 2], [3, [4]]]", dims);
  emThrows("a [1, 2], a [3, 4]", fill(Em.twice, { s: "a" }));
  emThrows("a [0, 0], b [1, 2]", fill(Em.zero, { s: "a" }));
  emThrows("a [1, 2] b", fill(w.bad, { s: "b" }));
  emThrows("a [1, x], b [1, 2]", fill(w.bad, { s: "x]" }));
  const ab = "a [1, 2], b [2, 1], c [1, -1]";
  emThrows(`${ab}; colour red`, fill(Em.badOpt, { s: "colour red" }));
  emThrows(`${ab}; query z`, fill(Em.noName, { s: "z", names: "a, b, c" }));
  emThrows(`${ab}; analogy a b c`, Em.badAnalogy);
  emThrows(`${ab}; compare a`, Em.badPair);
  emThrows(`${ab}; compare a a`, Em.badPair);
  emThrows(`${ab}; analogy a - b + c`, fill(Em.analogyFew, { a: "a", b: "b", c: "c" }));
  emThrows(`${ab}, d [1, 1]; analogy a - b + c`, fill(Em.zero, { s: "a − b + c" }));
});

test("every embeddings picture draws", () => {
  for (const { spec } of [{ spec: AI_DEFAULT.embed }, ...AI_PRESETS.embed]) {
    const { svg } = buildEmbed(spec, w).svg;
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, spec.src);
  }
});

test("the tool draws every topic's default", () => {
  for (const topic of AI_TOPICS) assert.match(renderAi(AI_DEFAULT[topic], w).svg, /^<svg/, topic);
});

const Sv = w.svd;
const sv = (src: string) => buildSvd({ topic: "svd", src }, w).data;
const svCaptions = (src: string) => [...buildSvd({ topic: "svd", src }, w).svg.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
const svThrows = (src: string, message: string) => assert.throws(() => buildSvd({ topic: "svd", src }, w), { message }, src);
const col = (M: number[][], j: number) => M.map((r) => r[j]);
const mul = (A: number[][], B: number[][]) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const tr = (M: number[][]) => M[0].map((_, j) => M.map((r) => r[j]));
const frob = (M: number[][]) => Math.sqrt(M.flat().reduce((s, v) => s + v * v, 0));
const minus = (A: number[][], B: number[][]) => A.map((r, i) => r.map((v, j) => v - B[i][j]));
const near = (a: number, b: number, what: string, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${what}: ${a} vs ${b}`);
const randomMatrix = (m: number, n: number) => Array.from({ length: m }, () => Array.from({ length: n }, () => int(-90, 90) / 10));
/** A random m × n matrix of rank at most r, as the product of an m × r and an r × n one. */
const lowRank = (m: number, n: number, r: number) => mul(randomMatrix(m, r), randomMatrix(r, n)).map((row) => row.map((v) => Math.round(v * 1e6) / 1e6));
const asList = (M: number[][]) => JSON.stringify(M).replace(/,/g, ", ");

test("SVD: U and V orthonormal, σ falling and ≥ 0, UΣVᵀ = A, AᵀA v = σ² v, and the rank found by elimination", () => {
  for (let i = 0; i < 120; i++) {
    const [m, n] = [int(1, 8), int(1, 8)];
    const A = i % 3 ? randomMatrix(m, n) : lowRank(m, n, int(1, Math.min(m, n)));
    const src = asList(A);
    const { U, sigma, V, rank } = sv(src);
    const p = Math.min(m, n);
    assert.equal(sigma.length, p, src);
    assert.deepEqual([U.length, U[0].length, V.length, V[0].length], [m, p, n, p], src);
    for (const Q of [U, V])
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) near(col(Q, a).reduce((s, v, k) => s + v * col(Q, b)[k], 0), a === b ? 1 : 0, `${src} orthonormal`);
    sigma.forEach((s, k) => assert.ok(s >= 0 && (k === 0 || s <= sigma[k - 1] + 1e-12), `${src}: σ = ${sigma}`));
    const big = Math.max(1, ...A.flat().map(Math.abs));
    const back = mul(mul(U, sigma.map((s, r) => sigma.map((_, c) => (r === c ? s : 0)))), tr(V));
    back.forEach((r, a) => r.forEach((v, b) => near(v, A[a][b], `${src} UΣVᵀ`, 1e-9 * big)));
    const AtA = mul(tr(A), A);
    sigma.forEach((s, k) => mul(AtA, col(V, k).map((v) => [v])).forEach(([v], j) => near(v, s * s * V[j][k], `${src} AᵀA v${k}`, 1e-8 * big * big)));
    near(sigma.reduce((t, s) => t + s * s, 0), frob(A) ** 2, `${src} Σσ² = ‖A‖²`, 1e-9 * big * big);
    assert.equal(rank, matrixRank(A), src);
    // Each pair is turned so that the largest entry of v is positive.
    sigma.forEach((_, k) => {
      const v = col(V, k);
      const top = Math.max(...v.map(Math.abs));
      assert.ok(v[v.findIndex((x) => Math.abs(x) > top - 1e-9)] > 0, `${src} sign of v${k}`);
    });
  }
});

test("SVD: known singular values", () => {
  assert.deepEqual(sv("[[3, 2, 2], [2, 3, -2]]").sigma, [5, 3]);
  const e = sv("[[3, 0], [4, 5]]").sigma;
  near(e[0], 3 * Math.sqrt(5), "3√5");
  near(e[1], Math.sqrt(5), "√5");
  assert.deepEqual(sv("[[0.6, -0.8], [0.8, 0.6]]").sigma, [1, 1]);
  assert.deepEqual(sv("[[1, 2], [2, 4], [3, 6]]").sigma, [Math.round(Math.sqrt(70) * 1e12) / 1e12, 0]);
  assert.deepEqual(sv("[[0, 0, 2], [0, -5, 0]]").sigma, [5, 2]);
  assert.deepEqual(sv("[4, 3]").sigma, [5]);
  assert.deepEqual(sv("7").sigma, [7]);
  assert.equal(sv("[[1, 2], [2, 4], [3, 6]]").rank, 1);
});

test("Eckart–Young: the first k pieces miss A by the root of the dropped σ², and no rank-k matrix nearby does better", () => {
  for (let i = 0; i < 60; i++) {
    const [m, n] = [int(2, 7), int(2, 7)];
    const A = randomMatrix(m, n);
    const p = Math.min(m, n);
    const k = int(1, p);
    const src = `${asList(A)}; rank ${k}`;
    const { U, sigma, V, approx, error, keep } = sv(src);
    assert.equal(keep, k);
    near(error!, Math.sqrt(sigma.slice(k).reduce((t, s) => t + s * s, 0)), `${src} error`);
    near(frob(minus(A, approx!)), error!, `${src} ‖A − Ak‖`, 1e-8);
    assert.equal(matrixRank(approx!), Math.min(k, matrixRank(A)), src);
    // Nudging the kept factors gives other matrices of rank k, all further away.
    const Uk = U.map((r) => r.slice(0, k));
    const SVk = tr(V.map((r) => r.slice(0, k).map((v, c) => v * sigma[c])));
    for (let t = 0; t < 5; t++) {
      const nudge = (M: number[][]) => M.map((r) => r.map((v) => v + (rnd() - 0.5) * 0.02));
      assert.ok(frob(minus(A, mul(nudge(Uk), nudge(SVk)))) >= error! - 1e-9, src);
    }
  }
});

test("SVD captions: rank, keeping all, a symmetric matrix's eigenvalues, the ellipse, a flattened circle, the condition number", () => {
  assert.ok(svCaptions("[[1, 2], [2, 4], [3, 6]]").includes(fill(Sv.lowRank, { r: 1 })));
  assert.ok(svCaptions("[[3, 2, 2], [2, 3, -2]]").includes(fill(Sv.fullRank, { r: 2 })));
  assert.ok(svCaptions("[[1, 2], [2, 4], [3, 6]]; rank 2").includes(fill(Sv.keepAll, { k: 2, r: 1 })));
  assert.ok(svCaptions("[[3, 2, 2], [2, 3, -2]]; rank 1").includes("misses A by √9 = 3"));
  assert.ok(svCaptions("[[1, 2], [2, -2]]").includes(fill(Sv.symmetric, { list: "−3, 2" })));
  assert.ok(!svCaptions("[[1, 2], [3, 4]]").includes("symmetric"));
  assert.ok(svCaptions("[[3, 0], [4, 5]]").includes("|det A| = σ₁σ₂ = 15"));
  assert.ok(svCaptions("[[1, 1], [2, 2]]").includes(Sv.line));
  assert.ok(svCaptions("[[1, 1], [1, 1.001]]").includes("σ₁ / σ₂ = 4002"));
  assert.ok(!svCaptions("[[1, 1], [2, 2]]").includes("condition"));
});

test("PCA: centred data, the covariance matrix, its eigenvectors and variances, the scores and what keeping k loses", () => {
  for (let i = 0; i < 60; i++) {
    const [m, n] = [int(2, 30), int(2, 6)];
    const X = randomMatrix(m, n);
    if (X.every((r) => r.every((v, j) => v === X[0][j]))) continue;
    const src = `${asList(X)}; pca`;
    const d = sv(src);
    const { mean, cov, variance, explained, scores } = d.pca!;
    const p = Math.min(m, n);
    range(n).forEach((j) => near(mean[j], X.reduce((s, r) => s + r[j], 0) / m, `${src} mean`));
    const Xc = X.map((r) => r.map((v, j) => v - mean[j]));
    range(n).forEach((a) => range(n).forEach((b) => near(cov[a][b], Xc.reduce((s, r) => s + r[a] * r[b], 0) / (m - 1), `${src} cov`, 1e-8)));
    variance.forEach((l, k) => mul(cov, col(d.V, k).map((v) => [v])).forEach(([v], j) => near(v, l * d.V[j][k], `${src} C v${k}`, 1e-8 * Math.max(1, variance[0]))));
    near(variance.reduce((s, l) => s + l, 0), range(n).reduce((s, j) => s + cov[j][j], 0), `${src} Σλ = trace C`, 1e-8);
    near(explained.reduce((s, e) => s + e, 0), 1, `${src} shares`);
    // The scores along each component have that component's variance, and are uncorrelated.
    range(p).forEach((a) => range(p).forEach((b) => near(col(scores, a).reduce((s, v, r) => s + v * scores[r][b], 0) / (m - 1), a === b ? variance[a] : 0, `${src} scores`, 1e-7 * Math.max(1, variance[0]))));
    const k = d.keep!;
    assert.equal(k, n === 2 ? 1 : 2, src);
    // What keeping k loses is the squared distances from each point to its projection onto the first k components.
    const Vk = d.V.map((r) => r.slice(0, k));
    const lost = Xc.reduce((s, r) => {
      const t = Vk[0].map((_, c) => r.reduce((u, v, j) => u + v * Vk[j][c], 0));
      return s + r.reduce((u, v, j) => u + (v - t.reduce((z, tc, c) => z + tc * Vk[j][c], 0)) ** 2, 0);
    }, 0);
    near(d.error! ** 2, lost, `${src} lost`, 1e-7);
    near(lost, (m - 1) * variance.slice(k).reduce((s, l) => s + l, 0), `${src} lost = (m − 1) Σ dropped λ`, 1e-7);
  }
});

test("PCA: standardizing gives the correlation matrix and ignores units; without it, units decide", () => {
  const pts = [[6, 62], [7.5, 75], [8, 88], [5.5, 55], [7, 70], [9, 92], [6.5, 60], [8.5, 80]];
  const inMinutes = pts.map(([h, s]) => [h * 60, s]);
  const a = sv(`${asList(pts)}; standardize`).pca!;
  const b = sv(`${asList(inMinutes)}; standardize`).pca!;
  a.cov.forEach((r, i) => r.forEach((v, j) => (i === j ? near(v, 1, "diagonal") : assert.ok(Math.abs(v) <= 1))));
  a.variance.forEach((l, k) => near(l, b.variance[k], "units ignored"));
  assert.ok(svCaptions(`${asList(pts)}; pca`).includes(fill(Sv.units, { a: "x₂", b: "x₁", r: "120" })));
  assert.ok(!svCaptions(`${asList(pts)}; standardize`).includes("standardize to"));
  assert.ok(svCaptions(`${asList(pts)}; standardize`).includes(Sv.scaled.slice(-20)));
  assert.notDeepEqual(sv(`${asList(pts)}; pca`).V, sv(`${asList(inMinutes)}; pca`).V);
});

test("matrices and points are read as rows, with brackets or parentheses", () => {
  assert.deepEqual(sv("(1, 2), (3, 5), (4, 4); pca").pca, sv("[[1, 2], [3, 5], [4, 4]]; PCA").pca);
  assert.deepEqual(sv("[1, 2], [3, 4]").A, [[1, 2], [3, 4]]);
  assert.deepEqual(sv("[1, 2, 3]").A, [[1, 2, 3]]);
  assert.deepEqual(sv("[[1, 2], [3, 4]]; k = 1").keep, 1);
  assert.deepEqual(sv("[[1, 2], [3, 4]]; keep 2").keep, 2);
  assert.equal(sv("(1, 2, 0), (3, 5, 1), (4, 4, 2); pca; keep 1").keep, 1);
});

test("wrong matrices, points and options are refused with the reason", () => {
  const matrix = fill(Sv.matrix, { max: 8 });
  const points = fill(Sv.points, { max: 30, f: 8 });
  svThrows("", w.need.svd);
  svThrows("[[1, 2], [3]]", matrix);
  svThrows("[[1, [2]], [3, 4]]", matrix);
  svThrows("[]", matrix);
  svThrows(asList([range(9)]), matrix);
  svThrows(asList(range(9).map(() => [1])), matrix);
  svThrows("[[1, 2], [x, 4]]", fill(w.bad, { s: "x, 4]]" }));
  svThrows("[[0, 0], [0, 0]]", Sv.zero);
  svThrows("[[1, 2]]; pca", points);
  svThrows("[[1], [2]]; pca", points);
  svThrows(`${asList(range(31).map((i) => [i, 1]))}; pca`, points);
  svThrows(`${asList(range(3).map((i) => range(9).map((j) => i * j)))}; pca`, points);
  svThrows("(1, 2), (1, 2); pca", Sv.flat);
  svThrows("(1, 2), (1, 3); standardize", fill(Sv.constant, { x: "x₁" }));
  svThrows("[[1, 2], [3, 4]]; colour red", fill(Sv.badOpt, { s: "colour red" }));
  svThrows("[[1, 2], [3, 4]]; pca 2", fill(Sv.badOpt, { s: "pca 2" }));
  for (const k of ["0", "3", "x", ""]) svThrows(`[[1, 2], [3, 4]]; rank ${k}`.trim(), fill(Sv.badKeep, { p: 2 }));
});

test("every SVD and PCA picture draws", () => {
  for (const { spec } of [{ spec: AI_DEFAULT.svd }, ...AI_PRESETS.svd]) {
    const { svg } = buildSvd(spec, w).svg;
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity|e[−-]\d/, spec.src);
  }
});
