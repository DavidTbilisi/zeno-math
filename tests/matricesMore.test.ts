// Matrices as data, maps of the plane, systems and determinants (#734): the new kinds in matrices, linearMaps and
// determinant. Every right answer passes, and each slip is named with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("matrix kinds: right answers pass, every slip is named", () => {
  const named = new Set<string>();
  for (const skill of ["matrices", "linearMaps", "determinant"] as const)
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 250; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(check(ex, ex.plain, w).ok, true, `${skill} ${level} ${seed} ${ex.prompt} ${ex.q}: ${ex.plain}`);
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, w);
          assert.equal(v.mistake, t.id, `${skill} ${level} ${seed} ${ex.prompt} ${ex.q} ${t.input}`);
          assert.ok(v.hint && !/\{[a-zA-Z]+\}/.test(v.hint), `${t.id}: ${v.hint}`);
          named.add(t.id);
        }
      }
  for (const id of ["scalarAdded", "matSubReversed", "entryIndexSwapped", "sumsMultiplied", "transposeUsed", "coefficientsByColumn", "signDroppedInMatrix", "detPlusUsed",
    "detNotDivided", "reflectAxisSwapped", "stretchAxisSwapped", "rotationClockwise", "projNotNormalized", "imagesAsRows", "matCompositionOrder", "kernelAsRow", "kernelAsImage",
    "kernelSignLost", "imageAllPlane", "imageAsRow", "ontoTooFewColumns", "ontoRankIgnored", "diagonalAdded", "swapSignKept", "rowScaleIgnored", "rowAddScales", "wholeScaleOnce", "areaSignKept"])
    assert.ok(named.has(id), id);
});

test("the picture of where e₁ and e₂ land is drawn, and a rank-one map's kernel is sent to 0", () => {
  let pics = 0;
  for (let seed = 1; seed <= 250; seed++) {
    const ex = exercise("linearMaps", 2, seed, w);
    if (ex.prompt === w.lmK.pictureQ) {
      assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
      pics++;
    }
    const k = exercise("linearMaps", 3, seed, w);
    if (k.prompt === w.lmK.kernelQ && k.answer.k === "pick") {
      const rows = [...k.q.matchAll(/(-?\d+) & (-?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      const [x, y] = k.answer.options[k.answer.right].plain.replace(/−/g, "-").slice(1, -1).split(", ").map(Number);
      for (const [a, b] of rows) assert.equal(a * x + b * y, 0, k.q);
    }
  }
  assert.ok(pics > 5, String(pics));
});
