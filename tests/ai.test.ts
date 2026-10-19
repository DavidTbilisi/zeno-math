// Math for AI, tensors: shapes and nested lists are read into the same box of numbers, in row-major order; boxes that
// are not full (ragged, mixed, empty) and ones too big to draw are refused with a message; strides follow the shape;
// a picked entry is the one an independent nested lookup finds, at the place its strides say; a matrix's rank agrees
// with a brute-force count, and the rank caption tells it apart from the order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { fill } from "../src/math/text.ts";
import { buildAi, matrixRank, strides } from "../src/math/ai.ts";

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
