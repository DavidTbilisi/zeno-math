// Divisible by?: every number divides by at least one divisor offered and the right ones are exactly those that divide
// it; the divisors are read in any order and spacing, one not offered is sent back, and the four slips are named; the
// worked solution is the Divisibility tab's table for those divisors; the board's stars, hint and notices follow the
// rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { DIV_LADDER, DIVISORS, divide, divNotice, divNow, divSlips, divStars, divTask, hintDivisor, judgeDivisors, readDivisors, ruleTest, type DivTask } from "../src/math/divisible.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const task = (level: 1 | 2 | 3, n: number): DivTask => ({ level, n, offered: DIVISORS[level], right: DIVISORS[level].filter((d) => n % d === 0) });

test("every number divides by one divisor offered at least, the right ones are those that divide it, and the sets vary", () => {
  for (const level of LEVELS) {
    const sets = new Set<string>();
    let all = 0;
    for (let seed = 1; seed <= 600; seed++) {
      const t = divTask(level, rng(seed));
      assert.deepEqual(t.offered, DIVISORS[level]);
      assert.deepEqual(t.right, t.offered.filter((d) => t.n % d === 0), `${t.n}`);
      assert.ok(t.right.length >= 1, `${t.n} divides by none`);
      assert.ok(t.n >= 10 && t.n <= (level === 3 ? 9999 : 999), `${t.n}`);
      sets.add(t.right.join(","));
      if (t.right.length === t.offered.length) all++;
    }
    assert.ok(sets.size >= (level === 1 ? 3 : 8), `level ${level}: ${[...sets].join(" | ")}`);
    // On easy every number ending in 0 does; above it, now and then.
    assert.ok(all > 0 && all < (level === 1 ? 300 : 60), `level ${level}: ${all} of 600 divide by every one`);
  }
});

test("the divisors are read in any order and spacing; one not offered is sent back; some missing is said", () => {
  assert.deepEqual(readDivisors("10, 2,5"), [2, 5, 10]);
  assert.deepEqual(readDivisors(" 2 ; 5 and 10 "), [2, 5, 10]);
  assert.deepEqual(readDivisors("{2, 2, 5}"), [2, 5]);
  for (const bad of ["", "two", "2.5", "2, x", ","]) assert.equal(readDivisors(bad), null, bad);
  const t = task(3, 534);
  assert.deepEqual(t.right, [2, 3, 6]);
  assert.deepEqual(judgeDivisors(t, "6 3 2"), { ok: true });
  assert.deepEqual(judgeDivisors(t, "2, 3, 6, 7"), { ok: false, problem: "notOffered", d: 7 });
  assert.deepEqual(judgeDivisors(t, "2, 3"), { ok: false, more: true });
  assert.deepEqual(judgeDivisors(t, "2, 3, 4, 6"), { ok: false, more: false });
  assert.deepEqual(judgeDivisors(t, "none"), { ok: false, problem: "unreadable" });
});

test("the slips each number invites, never its right answer", () => {
  const ids = (level: 1 | 2 | 3, n: number) => divSlips(task(level, n)).map((s) => s.id);
  assert.deepEqual(ids(3, 534), ["evenForFour", "threeForNine"]);
  assert.deepEqual(ids(3, 9555), ["threeForNine", "oddSix"]);
  assert.deepEqual(ids(3, 4320), []);
  assert.deepEqual(ids(1, 660), ["tenOnly"]);
  assert.deepEqual(ids(3, 6800), [], "a multiple of 4 brings 2 back");
  assert.deepEqual(divSlips(task(1, 660))[0].right, [10]);
  assert.deepEqual(divSlips(task(3, 534))[0], { id: "evenForFour", right: [2, 3, 4, 6], vars: { n: 534, t: 34 } });
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = divTask(level, rng(seed));
      for (const s of divSlips(t)) {
        assert.notDeepEqual(s.right, t.right, `${t.n} ${s.id}`);
        assert.ok(s.right.length && s.right.every((d) => t.offered.includes(d)), `${t.n} ${s.id}`);
      }
    }
});

test("in practice: typed or tapped in any order, the slips named, the table of tests drawn; the server agrees", async () => {
  let named = 0;
  for (const level of LEVELS)
    for (let seed = 1; seed <= 80; seed++) {
      const ex = exercise("divisibility", level, seed, w);
      if (ex.answer.k !== "divisors") throw new Error("not a divisors question");
      assert.deepEqual(check(ex, [...ex.answer.right].reverse().join(" "), w), { ok: true });
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, `${ex.q} ${t.input}`);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
        named++;
      }
    }
  assert.ok(named > 60, `${named} slips named`);
  const ex = exercise("divisibility", 3, 7, w);
  if (ex.answer.k !== "divisors") throw new Error("not a divisors question");
  assert.match(check(ex, `${ex.plain}, 7`, w).why ?? "", /^Only 2, 3, 4, 5, 6, 8, 9, 10 are asked about: 7 isn't one of them\.$/);
  const r = await renderSolution(ex.solution!, en);
  assert.ok(!r.svg.includes("NaN"));
  // One row for each divisor offered: 7, 11 and 13 aren't there.
  assert.ok(r.svg.includes("last two digits divisible by 4") && !r.svg.includes("alternating digit sum"));
  const q = { skill: "divisibility" as const, level: 1, seed: 7 };
  const easy = exercise("divisibility", 1, 7, w).plain;
  assert.deepEqual([mark(q, easy), mark(q, "3"), mark(q, "two")], ["correct", "form", "form"]);
});

test("the board: stars from misses and the hint, the hint's divisor, the notices, the ladder", () => {
  assert.deepEqual([divStars(0, false), divStars(1, false), divStars(2, false), divStars(0, true), divStars(1, true), divStars(3, true)], [3, 2, 1, 2, 1, 1]);
  const t = task(3, 534);
  assert.equal(hintDivisor(t, [2, 3, 4]), 4, "the one chosen wrongly");
  assert.equal(hintDivisor(t, [2]), 3, "the first one missed");
  assert.equal(hintDivisor(t, [2, 3, 6]), 3, "all right: the first not read from the last digit");
  assert.equal(ruleTest(534, 4), "…34");
  assert.equal(ruleTest(534, 3), "12 → 3");
  assert.deepEqual(divide(534, 4), { q: 133, r: 2 });
  assert.equal(divNotice(task(3, 4320), 0, false, 9000, 1), "all");
  assert.equal(divNotice(t, 0, false, 9000, 1), "notFooled");
  assert.equal(divNotice(task(1, 660), 0, false, 9000, 1), null, "easy: every one is just a number ending in 0");
  assert.equal(divNotice(task(1, 232), 0, false, 3000, 1), "quick");
  assert.equal(divNotice(t, 1, false, 3000, 0), null);
  assert.equal(divNotice(t, 0, true, 3000, 0), null, "not with the hint");
  assert.equal(divNotice(t, 0, false, 3000, 10), "streak10");
  DIV_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(divNow({ mode: "puzzle", stage, level: 1, seed: 0 }), divTask(level, rng(seed))));
  const ns = DIV_LADDER.map((_, stage) => divNow({ mode: "puzzle", stage, level: 1, seed: 0 }).n);
  assert.deepEqual(ns, [352, 585, 660, 387, 366, 945, 6214, 8757, 5040]);
});
