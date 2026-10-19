// Math for AI, tensors: shapes and nested lists are read into the same box of numbers, in row-major order; boxes that
// are not full (ragged, mixed, empty) and ones too big to draw are refused with a message; strides follow the shape;
// a picked entry is the one an independent nested lookup finds, at the place its strides say; a matrix's rank agrees
// with a brute-force count, and the rank caption tells it apart from the order. Operations: reshape keeps memory and
// permute reads it with moved strides, as an independent lookup finds; reductions, broadcasting and @ agree with a
// direct computation over nested lists, and the entries said to make up one entry of the result are those that do;
// every mistake in an operation is refused with its message.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { fill } from "../src/math/text.ts";
import { buildAi, buildOps, matrixRank, strides } from "../src/math/ai.ts";

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
