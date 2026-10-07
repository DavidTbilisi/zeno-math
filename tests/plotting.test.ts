// Function plots, the plane-transformation picture and matrix operations: checked against independent arithmetic,
// not against the code's own output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Frac } from "../src/math/fraction.ts";
import { det, gaussJordan, matrixLatex, MatrixError, mul, parseMatrix, type MatrixCalcSpec } from "../src/math/matrix.ts";
import { niceStep, plotToSvg, type PlotSpec } from "../src/math/plot.ts";
import { DEFAULT_TRANSFORM, transformToSvg } from "../src/math/transform.ts";

const plot = (exprs: string[], extra: Partial<PlotSpec> = {}): string =>
  plotToSvg({ functions: exprs.map((expr) => ({ expr, color: "#1971c2" })), xMin: -5, xMax: 5, yMin: null, yMax: null, grid: true, ...extra } as PlotSpec).svg;
const curves = (svg: string) => (svg.match(/<polyline /g) ?? []).length;

test("axis steps are 1, 2 or 5 times a power of ten, about a tenth of the range", () => {
  assert.equal(niceStep(10), 1);
  assert.equal(niceStep(25), 2);
  assert.equal(niceStep(60), 5);
  assert.equal(niceStep(90), 10);
  assert.ok(Math.abs(niceStep(0.08) - 0.01) < 1e-15);
});

test("a plot draws each curve, breaks it at an asymptote, and refuses an empty range", () => {
  const smooth = plot(["x^2"]);
  assert.match(smooth, /^<svg/);
  assert.equal(curves(smooth), 1, "a parabola is one unbroken curve");
  assert.ok(curves(plot(["1/x"])) >= 2, "1/x is broken at x = 0");
  assert.ok(curves(plot(["sqrt(x)"])) === 1, "a function undefined on part of the range is drawn where it exists");
  assert.equal(curves(plot(["x", "-x", ""])), 2, "an empty row draws nothing");
  assert.ok(plot(["x"], { grid: true }).length > plot(["x"], { grid: false }).length, "the grid adds lines");
  assert.throws(() => plot(["x"], { xMin: 3, xMax: 3 }), /min must be less than max/);
  const fixed = plot(["x"], { yMin: -1, yMax: 1 });
  assert.match(fixed, /<polyline /, "a line through a fixed window still shows");
});

test("a plane transformation shows its determinant: area scale, zero when it flattens, sign when it flips", () => {
  const detOf = (m: [number, number, number, number], t = 1) =>
    transformToSvg({ ...DEFAULT_TRANSFORM, m, t }).svg.match(/<tspan font-weight="700" fill="#e8590c">([^<]*)<\/tspan>/)![1];
  assert.equal(detOf([2, 1, 1, 2]), "3");
  assert.equal(detOf([2, 1, 1, 2], 0), "1", "at t = 0 it is the identity");
  assert.equal(detOf([1, 0, 0, -1]), "−1", "a reflection flips orientation (a typographic minus)");
  assert.equal(detOf([1, 2, 2, 4]), "0", "a singular matrix flattens the plane");
  const halfway = transformToSvg({ ...DEFAULT_TRANSFORM, m: [3, 0, 0, 1], t: 0.5 }).svg;
  assert.match(halfway, />2<\/tspan>/, "halfway from the identity to diag(3, 1) is diag(2, 1)");
});

const m = (rows: (number | string)[][]) => parseMatrix(rows.map((r) => r.map(String)));
const same = (a: Frac[][], b: Frac[][]) => a.length === b.length && a.every((r, i) => r.every((x, j) => x.sub(b[i][j]).isZero()));
const identity = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? Frac.ONE : Frac.ZERO)));

test("matrix determinants and inverses agree with cofactor expansion and A·A⁻¹ = I", () => {
  const A = m([[2, -1, 0], [1, 3, 4], [0, 5, -2]]);
  // Cofactor expansion along the first row: 2(3·−2 − 4·5) − (−1)(1·−2 − 4·0) + 0 = 2(−26) + (−2) = −54.
  assert.ok(det(A).sub(new Frac(-54)).isZero());
  const inv = gaussJordan(A.map((r, i) => [...r, ...identity(3)[i]]), 3).result.map((r) => r.slice(3));
  assert.ok(same(mul(A, inv), identity(3)));
  assert.ok(same(mul(inv, A), identity(3)));
  assert.ok(det(m([[1, 2], [2, 4]])).isZero());
  assert.ok(det(m([["1/2", "1/3"], ["1/4", "1/5"]])).sub(new Frac(1, 10).sub(new Frac(1, 12))).isZero(), "fractions stay exact");
});

const calc = (op: MatrixCalcSpec["op"], A: (number | string)[][], B: (number | string)[][] = [[0]], k = "2") =>
  matrixLatex({ type: "calc", op, A: A.map((r) => r.map(String)), B: B.map((r) => r.map(String)), k, steps: true });
const keyOf = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof MatrixError ? e.key : String(e);
  }
  return null;
};

test("every matrix operation writes its result, and wrong sizes are named", () => {
  assert.match(calc("add", [[1, 2]], [[3, 4]]), /4 & 6/);
  assert.match(calc("sub", [[1, 2]], [[3, 4]]), /-2 & -2/);
  assert.match(calc("mul", [[1, 2], [3, 4]], [[5], [6]]), /17 \\\\ 39/);
  assert.match(calc("scalar", [[1, -2]]), /2 & -4/);
  assert.match(calc("transpose", [[1, 2, 3]]), /1 \\\\ 2 \\\\ 3/);
  assert.match(calc("det", [[1, 2], [3, 4]]), /-2/);
  assert.match(calc("inverse", [[1, 2], [3, 4]]), /-2 & 1/);
  assert.match(calc("inverse", [[1, 2], [2, 4]]), /nexists/, "a singular matrix has no inverse");
  assert.match(calc("inverse", [[2, 0, 0], [0, 4, 0], [0, 0, 5]]), /\\frac\{1\}\{4\}/);
  assert.equal(keyOf(() => calc("add", [[1, 2]], [[1, 2, 3]])), "sameSize");
  assert.equal(keyOf(() => calc("mul", [[1, 2]], [[1, 2]])), "mulSize");
  assert.equal(keyOf(() => calc("det", [[1, 2, 3]])), "square");
  assert.equal(keyOf(() => calc("det", [[1, ""]])), "empty");
  assert.equal(keyOf(() => calc("det", [[1, "x"]])), "invalid");
  assert.equal(keyOf(() => calc("solve", [[1]])), "solveSize");
});

test("systems: a unique solution, none, and a family with a parameter", () => {
  const unique = calc("solve", [[1, 1, 3], [1, -1, 1]]);
  assert.match(unique, /x = 2/);
  assert.match(unique, /y = 1/);
  assert.match(calc("solve", [[1, 1, 1], [1, 1, 2]]), /varnothing/, "parallel lines never meet");
  const family = calc("solve", [[1, 1, 2], [2, 2, 4]]);
  assert.match(family, /y = t/);
  assert.match(family, /x = 2 - t/);
  assert.match(family, /mathbb\{R\}/);
});
