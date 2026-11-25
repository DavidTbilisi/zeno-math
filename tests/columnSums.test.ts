// Written addition and subtraction: every sum carries or takes a ten and its answer is right; the worked solution is
// the sum in columns; across zeros the crossed zero left at ten is named; a missing digit is the one that makes the
// written sum true, and read without the trade it is one off; a number typed in threes is read. Slips are named, in
// three languages.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { addColumns, subColumns } from "../src/math/addition.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { carriesDropped, carryWritten, tradeNotPaid, zeroTradeTen } from "../src/math/skills/columnSums.ts";
import { gradeOf } from "../src/model/curriculum.ts";

const w = en.pracWords;
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
/** The whole numbers of a question, in the order written. */
const numbers = (q: string) => (q.replace(/\\,/g, "").match(/\d+/g) ?? []).map(Number);
type Spec = { type: "addition" | "subtraction"; style: string; a: number; b: number };

test("every question takes its own answer in each language, and no slip is the right answer", () => {
  for (const words of [w, ka.pracWords, ru.pracWords])
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const ex = exercise("columnSums", level, seed, words);
        const where = `${level} #${seed}: ${ex.prompt} ${ex.q} → ${ex.plain}`;
        assert.equal(check(ex, ex.plain, words).ok, true, where);
        assert.equal(trapInputs(ex).length, ex.answer.traps?.length ?? 0, `${where}: every slip can be typed`);
        assert.equal(new Set(trapInputs(ex).map((t) => t.input)).size, trapInputs(ex).length, `${where}: no two slips give the same answer`);
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, words);
          assert.equal(v.mistake, t.id, `${where}; ${t.id} ${t.input}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), `${where}: ${v.hint}`);
        }
        assert.equal((ex.solution?.spec as Spec).style, "column", where);
      }
});

test("the slips, worked on known sums", () => {
  assert.equal(carriesDropped(367, 285), 542);
  assert.equal(carriesDropped(7384, 5829), 12103); // the last column's sum is written whole
  assert.equal(carryWritten(367, 285), 51412);
  assert.equal(tradeNotPaid(523, 278), 355);
  assert.equal(zeroTradeTen(4003, 1568), 2545);
  assert.equal(zeroTradeTen(523, 278), null); // no zero lends
  assert.equal(zeroTradeTen(4003, 1508), null); // a zero over a zero: 10 − 0 is no digit
});

test("level 1: three digits set out in columns, a ten carried or taken, within 1000", () => {
  let [adds, subs] = [0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("columnSums", 1, seed, w);
    const [a, b] = numbers(ex.q);
    assert.ok(a >= 100 && a <= 999 && b >= 100 && b <= 999 && ex.pic, `#${seed}: ${ex.q}`);
    if (ex.q.includes("+")) {
      adds++;
      assert.equal(Number(ex.plain), a + b);
      assert.ok(a + b <= 999 && addColumns(a, b).some((c) => c.out), `#${seed}: ${ex.q}`);
      assert.equal(check(ex, String(carryWritten(a, b)), w).mistake, "carryWritten");
    } else {
      subs++;
      assert.equal(Number(ex.plain), a - b);
      assert.ok(subColumns(a, b).some((c) => c.took) && !String(a).includes("0") && a - b >= 95, `#${seed}: ${ex.q}`);
      assert.equal(check(ex, String(tradeNotPaid(a, b)), w).mistake, tradeNotPaid(a, b) === Number(trapInputs(ex)[0].input) ? trapInputs(ex)[0].id : "tradeNotPaid");
    }
  }
  assert.ok(adds > 100 && subs > 100);
});

test("level 2: four and five digits, and taking away across zeros with the zero left at ten named", () => {
  let [zeros, named, five] = [0, 0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("columnSums", 2, seed, w);
    const [a, b] = numbers(ex.q);
    const plus = ex.q.includes("+");
    assert.equal(Number(ex.plain), plus ? a + b : a - b, `#${seed}: ${ex.q}`);
    assert.ok(a >= 1000 && a <= 99_999 && b >= 100 && (plus ? a + b <= 99_999 : b < a) && !ex.pic, `#${seed}: ${ex.q}`);
    if (a >= 10_000) five++;
    if (!plus && subColumns(a, b).some((c) => c.x === 0 && c.lent)) {
      zeros++;
      const slip = zeroTradeTen(a, b);
      if (slip !== null) {
        named++;
        assert.equal(check(ex, String(slip), w).mistake, "zeroTradeTen", `#${seed}: ${ex.q} ${slip}`);
      }
    }
  }
  assert.ok(zeros > 80 && named > 80 && five > 100);
});

test("level 3: six digits to a million, a digit missing from a written sum and a number missing from one", () => {
  let [six, digits, boxes] = [0, 0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("columnSums", 3, seed, w);
    const spec = ex.solution!.spec as Spec;
    if (ex.prompt === w.written.missingDigit) {
      digits++;
      const d = Number(ex.plain);
      assert.ok(Number.isInteger(d) && d >= 0 && d <= 9 && ex.pic, `#${seed}: ${ex.q}`);
      // With the digit in its box the written sum is true, and with any other digit it is not.
      const sum = (x: number) => {
        const [a, b, c] = numbers(ex.q.replace("\\square ", String(x)));
        return ex.q.includes("+") ? a + b === c : a - b === c;
      };
      assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(sum), [d], `#${seed}: ${ex.q}`);
      const [trap] = trapInputs(ex);
      assert.equal(Number(trap.input), ex.q.includes("+") ? (d + 1) % 10 : (d + 9) % 10, `#${seed}: ${ex.q}`);
      assert.equal(trap.id, ex.q.includes("+") ? "digitCarryMissed" : "digitTradeMissed");
    } else if (ex.q.includes("\\square")) {
      boxes++;
      const [b, c] = numbers(ex.q);
      assert.equal(Number(ex.plain), ex.q.includes("+") ? c - b : c + b, `#${seed}: ${ex.q}`);
      assert.equal(trapInputs(ex)[0].id, "inverseMissed");
      // The sum that undoes it is the one worked in columns.
      assert.equal(spec.type, ex.q.includes("+") ? "subtraction" : "addition");
    } else {
      six++;
      const [a, b] = numbers(ex.q);
      assert.ok(a >= 100_000 && a + b <= 1_999_998, `#${seed}: ${ex.q}`);
      assert.equal(Number(ex.plain), ex.q.includes("+") ? a + b : a - b);
      if (ex.q.includes("+")) assert.ok(a + b <= 999_999, `#${seed}: ${ex.q}`);
    }
  }
  assert.ok(six > 100 && digits > 40 && boxes > 40);
});

test("an answer typed in threes, as it is printed, is read", () => {
  const ex = SEEDS.map((s) => exercise("columnSums", 3, s, w)).find((e) => Number(e.plain) >= 100_000)!;
  const typed = ex.plain.replace(/\B(?=(\d{3})+$)/g, " ");
  assert.notEqual(typed, ex.plain);
  assert.equal(check(ex, typed, w).ok, true, typed);
  assert.equal(check(ex, typed.replace(/ /g, "\u202f"), w).ok, true);
  // A gap anywhere else is not a number in threes.
  assert.equal(check(ex, `${ex.plain.slice(0, 2)} ${ex.plain.slice(2)}`, w).ok, false);
});

test("its grades: three digits in grade 3, the rest in grade 4", () => {
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("columnSums", L as 1 | 2 | 3)), [3, 4, 4]);
});

test("every worked solution is drawn", async () => {
  for (const level of LEVELS)
    for (const seed of SEEDS.slice(0, 60)) {
      const ex = exercise("columnSums", level, seed, w);
      assert.ok(ex.solution || ex.steps?.length, `${level} #${seed}`);
      if (!ex.solution) continue;
      const r = await renderSolution(ex.solution, en);
      assert.ok(r.width > 0 && r.height > 0 && !/NaN|undefined/.test(r.svg), `${level} #${seed}: ${ex.q}`);
    }
});
