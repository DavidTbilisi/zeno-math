// Subspaces (#754): every question of rank and nullity, inner products and eigenvalues is right with its own answer
// and wrong with each slip, named with its hint filled in; each new slip comes up, and only at the level its kind is
// asked at; a projection matrix is idempotent and an orthogonal matrix's inverse is its transpose; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

const w = en.pracWords;
/** Each new slip and the levels it may come up at. */
const IDS: Record<string, Record<string, readonly number[]>> = {
  rankNullity: {
    onlyColumnsInSpan: [1], rowTakenForColumn: [1], rankFromNonzeroRows: [1, 2], leftNullAsNull: [2],
    rrefColumnsAsBasis: [3], dependentColumnsTaken: [3], rowsAsColumnBasis: [3],
  },
  innerProducts: {
    coordsUnnormalised: [1], standardCoordinatesKept: [1], subspaceForComplement: [1], complementOneVectorOnly: [1],
    projectionOneVectorOnly: [2], projectionAsComplement: [2], projMatrixNotDivided: [2], projMatrixOntoComplement: [2, 3],
    projNotInverted: [3], orthoInverseAsQ: [3], adjugateNotDivided: [3],
  },
  eigen: { eigenspaceDimAsRank: [2], eigenspaceDimAsMultiplicity: [2], eigvecOfOtherValue: [3], rowOfShiftedMatrix: [3] },
};

for (const [skill, ids] of Object.entries(IDS))
  test(`${skill}: every question is right with its answer and every new slip is named at its level`, () => {
    const seen = new Set<string>();
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 400; seed++) {
        const ex = exercise(skill as SkillId, level, seed, w);
        const at = `${level}/${seed} ${ex.prompt}`;
        assert.ok(!/\{\w+\}/.test(ex.prompt), at);
        assert.ok(!/NaN|undefined|Infinity/.test(ex.prompt + ex.q + ex.show + (ex.steps ?? []).join(" ")), at);
        assert.ok(check(ex, ex.plain, w).ok, `${at} ${ex.plain}`);
        for (const t of trapInputs(ex)) {
          if (!(t.id in ids)) continue;
          assert.ok(ids[t.id].includes(level), `${at} ${t.id} at level ${level}`);
          seen.add(t.id);
          const v = check(ex, t.input, w);
          assert.ok(!v.ok, `${at} ${t.id}`);
          assert.equal(v.mistake, t.id, `${at} ${t.input}`);
          assert.ok(v.hint && v.hint.length > 20 && !/\{\w+\}/.test(v.hint), `${at} ${t.id} ${v.hint}`);
        }
      }
    for (const id of Object.keys(ids)) assert.ok(seen.has(id), id);
  });

test("a projection matrix squared is itself, and an orthogonal matrix's inverse times it is I", () => {
  const mul = (A: number[][], B: number[][]) => A.map((row) => B[0].map((_, j) => row.reduce((t, x, k) => t + x * B[k][j], 0)));
  const near = (A: number[][], B: number[][]) => A.every((row, i) => row.every((x, j) => Math.abs(x - B[i][j]) < 1e-9));
  const seen = { proj: 0, ortho: 0 };
  for (const level of [2, 3] as const)
    for (let seed = 1; seed <= 300; seed++) {
      const ex = exercise("innerProducts", level, seed, w);
      if (ex.answer.k !== "matrix") continue;
      const P = ex.answer.rows;
      if (ex.prompt === w.ipK.orthoInvQ) {
        const Q = P[0].map((_, j) => P.map((row) => row[j]));
        assert.ok(near(mul(P, Q), P.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)))), `${seed}`);
        seen.ortho++;
      } else {
        assert.ok(near(mul(P, P), P), `${level}/${seed}`);
        seen.proj++;
      }
    }
  assert.ok(seen.proj > 0 && seen.ortho > 0);
});

test("the grades stay", () => {
  for (const s of Object.keys(IDS)) assert.deepEqual([1, 2, 3].map((L) => gradeOf(s as SkillId, L as 1 | 2 | 3)), [13, 13, 13], s);
});
