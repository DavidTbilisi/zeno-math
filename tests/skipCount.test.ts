// Counting in steps: every row goes by one step and the missing number is the one that fits it; tens and ones make
// their number; the odd one out is odd; the step asked for is the row's own; a count says a number exactly when the
// step divides how far away it is; a sum's parity is told without adding. Slips are named, in three languages.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { gradeOf } from "../src/model/curriculum.ts";

const w = en.pracWords;
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
/** The numbers of a row as asked, null for the box. */
const rowOf = (q: string) => q.split(",\\enspace ").map((s) => (s === "\\square" ? null : Number(s)));

test("every question takes its own answer in each language, and no slip is the right answer", () => {
  for (const words of [w, ka.pracWords, ru.pracWords])
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const ex = exercise("skipCount", level, seed, words);
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

test("a row goes by one step, stays in range, and the answer is the number that fits", () => {
  const steps = new Map<number, Set<number>>();
  let rows = 0;
  for (const level of LEVELS)
    for (const seed of SEEDS) {
      const ex = exercise("skipCount", level, seed, w);
      if (!ex.q.includes("\\square")) continue;
      rows++;
      const row = rowOf(ex.q).map((v) => v ?? Number(ex.plain));
      const d = row[1] - row[0];
      row.forEach((v, i) => i && assert.equal(v - row[i - 1], d, `${level} #${seed}: ${ex.q}`));
      const top = level === 3 ? 1000 : 100;
      assert.ok(Math.min(...row) >= 0 && Math.max(...row) <= top, `${level} #${seed}: ${row.join(" ")}`);
      steps.set(level, (steps.get(level) ?? new Set()).add(Math.abs(d)));
      // The first worked line is between two numbers that are in the question, and is true.
      const m = ex.steps![0].match(/^(\d+) ([+-]) (\d+) = (\d+)$/)!;
      assert.equal(Number(m[1]) + (m[2] === "+" ? 1 : -1) * Number(m[3]), Number(m[4]));
      assert.ok(ex.q.includes(m[1]) && ex.q.includes(m[4]), `${level} #${seed}: ${ex.steps![0]} from ${ex.q}`);
    }
  assert.ok(rows > 300);
  assert.deepEqual([...steps.get(1)!].sort((a, b) => a - b), [1, 10]);
  assert.deepEqual([...steps.get(2)!].sort((a, b) => a - b), [2, 5, 10]);
  assert.deepEqual([...steps.get(3)!].sort((a, b) => a - b), [3, 4, 20, 25, 50, 100]);
});

test("a row goes back as well as on, and at the hard level the first number can be the one missing", () => {
  const hard = SEEDS.map((s) => exercise("skipCount", 3, s, w)).filter((e) => e.q.includes("\\square"));
  assert.ok(hard.some((e) => e.q.startsWith("\\square")));
  for (const level of LEVELS) {
    const rows = SEEDS.map((s) => rowOf(exercise("skipCount", level, s, w).q)).filter((r) => r.length > 2 && r.some((v) => v === null));
    const known = rows.map((r) => r.filter((v): v is number => v !== null));
    assert.ok(known.some((r) => r[0] < r[1]) && known.some((r) => r[0] > r[1]), `level ${level}`);
  }
});

test("tens and ones: the number, and the slips of swapping and of adding", () => {
  const ex = SEEDS.map((s) => exercise("skipCount", 1, s, w)).find((e) => /tens and \d ones/.test(e.prompt))!;
  const [t, o] = ex.prompt.match(/\d/g)!.map(Number);
  assert.equal(ex.plain, String(10 * t + o));
  assert.equal(check(ex, String(10 * o + t), w).mistake, "tensOnesSwapped");
  assert.equal(check(ex, String(t + o), w).mistake, "tensOnesAdded");
  const tens = SEEDS.map((s) => exercise("skipCount", 1, s, w)).find((e) => e.prompt.startsWith("How many tens"))!;
  assert.equal(tens.plain, String(Math.floor(Number(tens.prompt.match(/\d+/)![0]) / 10)));
});

test("odd or even: one of the four is right, and the one whose tens digit looks right is named", () => {
  let seen = 0;
  for (const seed of SEEDS) {
    const ex = exercise("skipCount", 2, seed, w);
    if (ex.answer.k !== "pick") continue;
    seen++;
    const odd = ex.prompt === w.count.whichOdd;
    const ns = ex.answer.options.map((o) => Number(o.plain));
    assert.equal(new Set(ns).size, 4);
    assert.deepEqual(ns.filter((n) => (n % 2 === 1) === odd), [Number(ex.plain)], `#${seed}: ${ns.join(" ")}`);
    const [trap] = trapInputs(ex);
    const decoy = Number(trap.input);
    assert.equal((Math.floor(decoy / 10) % 2 === 1) === odd, true, `#${seed}: ${decoy} has a tens digit of the kind asked for`);
    assert.equal(check(ex, trap.input, w).mistake, "lastDigitDecides");
  }
  assert.ok(seen > 40);
});

test("the hard level: the step of a row, whether a count says a number, the parity of a sum", () => {
  let [steps, said, sums, yes, no] = [0, 0, 0, 0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("skipCount", 3, seed, w);
    if (ex.prompt === w.count.step) {
      steps++;
      const row = rowOf(ex.q) as number[];
      assert.equal(Number(ex.plain), Math.abs(row[1] - row[0]));
      if (Number(ex.plain) <= 6) assert.equal(check(ex, String(Number(ex.plain) - 1), w).mistake, "gapNotStep");
    } else if (ex.answer.k === "pick" && ex.q === "" && !ex.prompt.includes("times table")) {
      said++;
      const [a, s, n] = ex.prompt.match(/\d+/g)!.map(Number);
      const right = (n - a) % s === 0;
      assert.equal(ex.plain, right ? "yes" : "no", `#${seed}: ${ex.prompt}`);
      if (right) yes++;
      else no++;
    } else if (ex.answer.k === "pick" && ex.q !== "") {
      sums++;
      const [a, b] = ex.q.split(" + ").map(Number);
      assert.equal(ex.plain, (a + b) % 2 ? "odd" : "even");
    }
  }
  assert.ok(steps > 40 && said > 40 && sums > 40 && yes > 10 && no > 10);
});

test("a hundred square: the number below is ten more, the one above ten less, and the one beside is named", () => {
  let [below, above] = [0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("skipCount", 2, seed, w);
    const m = ex.prompt.match(/just (below|above) (\d+)/);
    if (!m) continue;
    const [down, n] = [m[1] === "below", Number(m[2])];
    if (down) below++;
    else above++;
    assert.equal(Number(ex.plain), down ? n + 10 : n - 10, `#${seed}: ${ex.prompt}`);
    assert.equal(check(ex, String(down ? n + 1 : n - 1), w).mistake, "besideNotBelow");
  }
  assert.ok(below > 5 && above > 5, `${below} below, ${above} above`);
});

test("a times table: one of the four is in it, two are odd, and the even one that is not is named", () => {
  let seen = 0;
  for (const seed of SEEDS) {
    const ex = exercise("skipCount", 3, seed, w);
    const m = ex.prompt.match(/the (\d+) times table/);
    if (!m || ex.answer.k !== "pick") continue;
    seen++;
    const s = Number(m[1]);
    const ns = ex.answer.options.map((o) => Number(o.plain));
    assert.equal(new Set(ns).size, 4);
    assert.deepEqual(ns.filter((n) => n % s === 0), [Number(ex.plain)], `#${seed}: ${ns.join(" ")}`);
    assert.equal(ns.filter((n) => n % 2 === 0).length, 2);
    const [trap] = trapInputs(ex);
    assert.ok(Number(trap.input) % 2 === 0 && Number(trap.input) % s !== 0);
    assert.equal(check(ex, trap.input, w).mistake, "evenNotInTable");
  }
  assert.ok(seen > 20, `${seen} seen`);
});

test("its grades: the first level in grade 1, the others in grade 2", () => {
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("skipCount", L as 1 | 2 | 3)), [1, 2, 2]);
});
