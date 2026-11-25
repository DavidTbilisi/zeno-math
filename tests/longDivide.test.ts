// Long division by two digits: how many times the divisor goes (the rounded estimate, unchecked, is named both ways);
// exact quotients, a zero in the quotient kept; the remainder; the remainder as a decimal and as a fraction in lowest
// terms, never written after the point; and the stories in which the remainder decides. Slips are named, in three
// languages.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { DECIMAL_DIVISORS, zeroDropped } from "../src/math/skills/longDivide.ts";
import { gradeOf } from "../src/model/curriculum.ts";

const w = en.pracWords;
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const numbers = (s: string) => (s.replace(/\\,|\u202f/g, "").match(/\d+/g) ?? []).map(Number);
/** A prompt with its numbers taken out, to tell the kinds of question apart. */
const shape = (s: string) => s.replace(/[\d\u202f]+/g, "n");
const is = (prompt: string, words: string) => shape(prompt) === shape(words.replace(/\{\w+\}/g, "1"));

test("every question takes its own answer in each language, and no slip is the right answer", () => {
  for (const words of [w, ka.pracWords, ru.pracWords])
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const ex = exercise("longDivide", level, seed, words);
        const where = `${level} #${seed}: ${ex.prompt} ${ex.q} → ${ex.plain}`;
        assert.equal(check(ex, ex.plain, words).ok, true, where);
        assert.ok(!/\{\w+\}/.test(ex.prompt), `${where}: the prompt is filled in`);
        assert.equal(trapInputs(ex).length, ex.answer.traps?.length ?? 0, `${where}: every slip can be typed`);
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, words);
          assert.equal(v.mistake, t.id, `${where}; ${t.id} ${t.input}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), `${where}: ${v.hint}`);
        }
      }
});

test("level 1: how many times a two-digit number goes, and three digits divided exactly", () => {
  let [fits, big, small, exact] = [0, 0, 0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("longDivide", 1, seed, w);
    if (is(ex.prompt, w.written.fits)) {
      fits++;
      const [b, a] = numbers(ex.prompt);
      const q = Math.floor(a / b);
      assert.equal(Number(ex.plain), q, `#${seed}: ${ex.prompt}`);
      assert.ok(b > 10 && b < 90 && b % 10 !== 0 && q >= 2 && q <= 9, `#${seed}: ${ex.prompt}`);
      // The estimate with the divisor rounded to a ten: named whenever it is not the answer.
      const e = Math.floor(a / (Math.round(b / 10) * 10));
      if (e !== q) {
        assert.equal(check(ex, String(e), w).mistake, e > q ? "estimateTooBig" : "estimateTooSmall", `#${seed}: ${ex.prompt} ${e}`);
        if (e > q) big++;
        else small++;
      } else assert.equal(trapInputs(ex).length, 0);
    } else {
      exact++;
      const [a, b] = numbers(ex.q);
      assert.equal(Number(ex.plain) * b, a, `#${seed}: ${ex.q}`);
      assert.ok(a >= 100 && a <= 999 && b > 10 && b < 40 && b % 10 !== 0 && Number(ex.plain) >= 11, `#${seed}: ${ex.q}`);
      assert.deepEqual(ex.solution, { kind: "model", spec: { type: "division", style: "bracket", a, b, decimals: 0, step: 999 } });
    }
  }
  assert.ok(fits > 60 && exact > 150 && big > 10 && small > 10, `${fits} ${exact} ${big} ${small}`);
});

test("level 2: four and five digits, a zero kept in the quotient, the whole quotient and the remainder", () => {
  assert.deepEqual([102, 180, 907, 258].map(zeroDropped), [12, 18, 97, 258]);
  let [zeros, rems, wholes] = [0, 0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("longDivide", 2, seed, w);
    const v = Number(ex.plain);
    if (ex.q) {
      const [a, b] = numbers(ex.q);
      assert.equal(v * b, a, `#${seed}: ${ex.q}`);
      assert.ok(a >= 1000 && a <= 99_999 && b > 10 && b % 10 !== 0, `#${seed}: ${ex.q}`);
      if (String(v).includes("0")) {
        zeros++;
        assert.equal(check(ex, String(zeroDropped(v)), w).mistake, "quotientZeroDropped", `#${seed}: ${ex.q}`);
      }
    } else if (is(ex.prompt, w.basics.remainder)) {
      rems++;
      const [a, b] = numbers(ex.prompt);
      assert.equal(v, a % b, `#${seed}: ${ex.prompt}`);
      assert.ok(v > 0);
      if (Math.floor(a / b) !== v) assert.equal(check(ex, String(Math.floor(a / b)), w).mistake, "quotientForRemainder");
    } else {
      wholes++;
      const [b, a] = numbers(ex.prompt);
      assert.equal(v, Math.floor(a / b), `#${seed}: ${ex.prompt}`);
      assert.ok(a % b > 0);
    }
  }
  assert.ok(zeros > 90 && rems > 30 && wholes > 30, `${zeros} ${rems} ${wholes}`);
});

test("level 3: the remainder as a decimal or a fraction in lowest terms, never written after the point", () => {
  for (const [b, step] of DECIMAL_DIVISORS)
    for (let rem = step; rem < b; rem += step) assert.equal(Number((rem / b).toFixed(2)), rem / b, `${rem}/${b}`);
  let [decimals, mixed, unreduced] = [0, 0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("longDivide", 3, seed, w);
    if (!ex.q) continue;
    const [a, b] = numbers(ex.q);
    const [q, rem] = [Math.floor(a / b), a % b];
    assert.ok(rem > 0 && b > 10 && b < 100, `#${seed}: ${ex.q}`);
    const after = `${q}.${rem}`;
    assert.equal(check(ex, after, w).mistake, "remainderAfterPoint", `#${seed}: ${ex.q} ${after}`);
    if (ex.prompt === w.written.asDecimal) {
      decimals++;
      assert.equal(Number(ex.plain), a / b, `#${seed}: ${ex.q}`);
      assert.ok(/^\d+\.\d{1,2}$/.test(ex.plain), ex.plain);
      // The right value as a fraction is sent back, not marked wrong.
      assert.equal(check(ex, `${a}/${b}`, w).why, w.reasons.notDecimal);
    } else {
      mixed++;
      assert.equal(ex.prompt, w.written.asMixed);
      const [whole, n, d] = numbers(ex.plain);
      assert.ok(whole === q && n * b === rem * d, `#${seed}: ${ex.q} → ${ex.plain}`);
      assert.equal(check(ex, String(a / b), w).why, w.reasons.notMixed);
      if (d !== b) {
        unreduced++;
        assert.equal(check(ex, `${q} ${rem}/${b}`, w).why, w.reasons.notLowest, `#${seed}: ${q} ${rem}/${b}`);
      }
    }
  }
  assert.ok(decimals > 60 && mixed > 60 && unreduced > 20, `${decimals} ${mixed} ${unreduced}`);
});

test("level 3: in a story the remainder decides: one more coach, only the full boxes, what is left over", () => {
  let [coaches, boxes, left] = [0, 0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("longDivide", 3, seed, w);
    if (ex.q) continue;
    const [n, b] = numbers(ex.prompt);
    const [q, rem] = [Math.floor(n / b), n % b];
    assert.ok(rem > 0, ex.prompt);
    if (is(ex.prompt, w.written.coaches)) {
      coaches++;
      assert.equal(Number(ex.plain), q + 1, ex.prompt);
      assert.equal(check(ex, String(q), w).mistake, "remainderLeftBehind");
    } else if (is(ex.prompt, w.written.boxes)) {
      boxes++;
      assert.equal(Number(ex.plain), q, ex.prompt);
      assert.equal(check(ex, String(q + 1), w).mistake, "partGroupCounted");
    } else {
      left++;
      assert.ok(is(ex.prompt, w.written.left), ex.prompt);
      assert.equal(Number(ex.plain), rem, ex.prompt);
      if (q !== rem) assert.equal(check(ex, String(q), w).mistake, "quotientForRemainder");
    }
  }
  assert.ok(coaches > 15 && boxes > 15 && left > 15, `${coaches} ${boxes} ${left}`);
});

test("its grades: two levels in grade 5, the remainder's forms in grade 6", () => {
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("longDivide", L as 1 | 2 | 3)), [5, 5, 6]);
});

test("every worked solution is drawn", async () => {
  for (const level of LEVELS)
    for (const seed of SEEDS.slice(0, 60)) {
      const ex = exercise("longDivide", level, seed, w);
      assert.ok(ex.solution || ex.steps?.length, `${level} #${seed}`);
      if (!ex.solution) continue;
      const r = await renderSolution(ex.solution, en);
      assert.ok(r.width > 0 && r.height > 0 && !/NaN|undefined/.test(r.svg), `${level} #${seed}: ${ex.q}`);
    }
});
