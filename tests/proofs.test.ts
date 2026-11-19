// Proof answers: lines typed in order (a look-alike named), a reason or a first wrong line picked, any counterexample
// accepted and tested by the claim's own rule (an example that fits the claim named, one it isn't about sent back),
// true or false decided with a counterexample, in the learner's words; and the proofs line up in every language.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rngOf } from "../src/math/practiceKit.ts";
import { CLAIMS, COUNTER_CLAIMS, FLAWS, HOLDS, isPrime, PROOFS, readLines, testObject, TRUE_CLAIMS, type ClaimId, type FlawId, type ProofId } from "../src/math/proofs.ts";
import { check, exercise, LEVELS, type Exercise } from "../src/math/practice.ts";
import { counterPart, decidePart, flawPart, orderPart } from "../src/math/skills/proofs.ts";

const w = en.pracWords;
const asExercise = (p: Omit<Exercise, "skill" | "level" | "seed">): Exercise => ({ skill: "proofs", level: 3, seed: 1, ...p });

test("the lines typed as letters, each once", () => {
  assert.deepEqual(readLines(5, "C, A, d, B"), { seq: [2, 0, 3, 1] });
  assert.deepEqual(readLines(5, "C A D"), { seq: [2, 0, 3] });
  assert.deepEqual(readLines(5, "C → A → D"), { seq: [2, 0, 3] });
  assert.deepEqual(readLines(3, "A, E"), { problem: "unreadable" });
  assert.deepEqual(readLines(5, "A, B, A"), { problem: "repeated" });
});

test("every false claim is broken by its example, and holds for the example that fits it", () => {
  for (const id of COUNTER_CLAIMS) {
    const ex = asExercise(counterPart(id, w.proofs));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true }, id);
    const held = HOLDS[id];
    if (held) {
      const v = check(ex, held.join(", "), w);
      assert.equal(v.mistake, "exampleNotCounter", id);
    }
  }
  // Any counterexample will do, not only the book's.
  const euler = asExercise(counterPart("euler41", w.proofs));
  assert.equal(check(euler, "41", w).ok, true);
  const bigger = asExercise(counterPart("squareBigger", w.proofs));
  for (const x of ["1", "0.3", "1/3"]) assert.equal(check(bigger, x, w).ok, true, x);
  // One the claim isn't about is sent back, not marked.
  assert.ok(check(bigger, "-2", w).why);
  assert.ok(check(asExercise(counterPart("mersenne", w.proofs)), "12", w).why);
  const nil = asExercise(counterPart("nilpotent", w.proofs));
  assert.equal(check(nil, "0, 0; 5, 0", w).ok, true);
  assert.equal(check(nil, "1, 0; 0, 1", w).mistake, "exampleNotCounter");
  assert.ok(check(nil, "1, 2, 3", w).why, "not a 2 × 2 matrix");
});

test("the claims' own rules: the Mersenne list up to 31, and the true claims hold everywhere tested", () => {
  const prime = (n: bigint) => {
    for (let p = 2n; p * p <= n; p++) if (n % p === 0n) return false;
    return n > 1n;
  };
  for (let p = 2; p <= 31; p++) if (isPrime(p)) assert.equal(testObject("mersenne", [p]) === "holds", prime(2n ** BigInt(p) - 1n), `p = ${p}`);
  for (const id of TRUE_CLAIMS)
    for (let a = -30; a <= 30; a++)
      for (let b = -6; b <= 6; b++) {
        const x = CLAIMS[id].kind === "pair" ? [a, b] : [a];
        assert.notEqual(testObject(id, x), "counter", `${id} ${x}`);
      }
});

test("deciding: true, or false with a counterexample, in each language", () => {
  const euler = asExercise(decidePart("euler41", w.proofs));
  assert.equal(check(euler, "false: 40", w).ok, true);
  assert.equal(check(euler, "False 41", w).ok, true);
  assert.ok(check(euler, "false", w).why, "a counterexample is needed");
  assert.equal(check(euler, "true", w).mistake, "calledTrue");
  assert.ok(check(euler, "maybe", w).why);
  const odd = asExercise(decidePart("oddSquare", w.proofs));
  assert.equal(check(odd, "true", w).ok, true);
  assert.equal(check(odd, "false: 3", w).mistake, "exampleNotCounter");
  for (const words of [ka, ru]) {
    const W = words.pracWords;
    const e = asExercise(decidePart("primeSum", W.proofs));
    assert.equal(check(e, `${W.proofs.false}: 2, 3`, W).ok, true, W.proofs.false);
    assert.equal(check(e, "false: 2, 3", W).ok, true, "English works in any language");
  }
});

test("lines in order, the look-alike line named; the first wrong line, a later one named", () => {
  for (let seed = 1; seed <= 50; seed++)
    for (const id of Object.keys(PROOFS) as ProofId[]) {
      const ex = asExercise(orderPart(id, rngOf(seed), w.proofs));
      assert.deepEqual(check(ex, ex.plain, w), { ok: true });
      const trap = ex.answer.traps![0].a;
      if (trap.k !== "lines") throw new Error(trap.k);
      assert.equal(check(ex, trap.seq.map((i) => "ABCDEFG"[i]).join(", "), w).mistake, "lookAlikeLine");
    }
  const flaw = asExercise(flawPart("oneIsTwo", w.proofs));
  assert.equal(check(flaw, "5", w).ok, true);
  assert.equal(check(flaw, "6", w).mistake, "laterLine");
  assert.equal(check(flaw, "2", w).ok, false);
});

test("every proof, faulty proof and claim has its words in every language, line for line", () => {
  for (const words of [en, ka, ru]) {
    const W = words.pracWords.proofs;
    for (const id of Object.keys(PROOFS) as ProofId[]) assert.equal(W.proofs[id].lines.length, PROOFS[id].reasons.length, id);
    for (const id of Object.keys(FLAWS) as FlawId[]) assert.equal(W.flaws[id].lines.length, FLAWS[id].lines, id);
    for (const id of Object.keys(CLAIMS) as ClaimId[]) assert.ok(W.claims[id], id);
    for (const level of LEVELS)
      for (let seed = 1; seed <= 30; seed++) {
        const ex = exercise("proofs", level, seed, words.pracWords);
        assert.ok(!/[{}]/.test(ex.prompt), ex.prompt);
        assert.deepEqual(check(ex, ex.plain, words.pracWords), { ok: true }, `${level} ${seed} ${ex.plain}`);
      }
  }
});
