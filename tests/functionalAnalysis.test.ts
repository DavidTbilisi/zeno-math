// The maths of the functional analysis elective (src/math/functionalAnalysis.ts) and its three skills.
import assert from "node:assert/strict";
import { test } from "node:test";
import { WHOLE_NORM, absLineIntegral, colNorm, colSigned, norm1, norm2sq, normInf, rowNorm, rowSigned } from "../src/math/functionalAnalysis.ts";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

test("vector norms, and the 2-norms of the norm questions come out whole", () => {
  assert.equal(norm1([3, -4, 0]), 7);
  assert.equal(norm2sq([3, -4, 0]), 25);
  assert.equal(normInf([3, -4, 0]), 4);
  for (const [x, two] of WHOLE_NORM) assert.equal(norm2sq(x), two * two);
});

test("the 1-norm of a matrix is its largest column sum, the ∞-norm its largest row sum", () => {
  const A = [
    [1, -2],
    [-3, 4],
  ];
  assert.equal(colNorm(A), 6);
  assert.equal(rowNorm(A), 7);
  assert.equal(colSigned(A), 2);
  assert.equal(rowSigned(A), 1);
});

test("∫₀¹ |a − b x| dx splits where the line crosses 0", () => {
  // 1 − 2x: two triangles of area 1/4
  assert.deepEqual(absLineIntegral(1, 2), [2, 4]);
  // a midpoint sum on a fine grid agrees
  for (const [a, b] of [[1, 3], [2, 5], [5, 6]]) {
    const [n, d] = absLineIntegral(a, b);
    let s = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) s += Math.abs(a - b * ((i + 0.5) / N)) / N;
    assert.ok(Math.abs(s - n / d) < 1e-6, `${a} ${b}`);
  }
});

test("every functional analysis question accepts its answer and names each trap", () => {
  const w = en.pracWords;
  for (const s of ["norms", "operatorNorms", "hilbertSpaces"] as SkillId[])
    for (const L of [1, 2, 3] as const)
      for (let seed = 0; seed < 40; seed++) {
        const e = exercise(s, L, seed, w);
        assert.ok(check(e, e.plain, w).ok, `${s} ${L} ${seed}`);
        for (const t of trapInputs(e)) assert.equal(check(e, t.input, w).mistake, t.id, `${s} ${L} ${seed} ${t.id}`);
      }
});
