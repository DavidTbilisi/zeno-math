// Complex numbers (#732): roots of negatives, powers of i, the parts and the kind of a number, differences, distances,
// midpoints and conjugates, factorising over the complex numbers and i·z. Every new kind's right answer passes, and
// each slip is named with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("new complex kinds: right answers pass, every slip is named", () => {
  const named = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 300; seed++) {
      const ex = exercise("complex", level, seed, w);
      assert.equal(check(ex, ex.plain, w).ok, true, `${level} ${seed} ${ex.prompt} ${ex.q}: ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, `${level} ${seed} ${ex.prompt} ${ex.q} ${t.input}`);
        assert.ok(v.hint && !/\{[a-zA-Z]+\}/.test(v.hint), v.hint);
        named.add(t.id);
      }
    }
  for (const id of ["negativeRootReal", "iPowerModTwo", "partsSwapped", "imagSignDropped", "zeroPartMisread", "bracketSignImag", "midpointNotHalved", "conjugateRealFlipped",
    "conjugateProductMinus", "modulusNoRoot", "realFactorsForSum", "complexFactorSquared", "sumNotSplit", "notFullyFactored", "rotatedWrongWay", "iSquaredPlusOne"])
    assert.ok(named.has(id), id);
});

test("a power of i follows the cycle 1, i, −1, −i", () => {
  let n = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const ex = exercise("complex", 1, seed, w);
    const m = /^i\^\{(\d+)\}$/.exec(ex.q);
    if (!m) continue;
    assert.equal(ex.plain, ["1", "i", "-1", "-i"][Number(m[1]) % 4], ex.q);
    n++;
  }
  assert.ok(n > 10, String(n));
});
