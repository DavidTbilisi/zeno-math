// Everyday money: the piece's two changes (20 % off then 10 % off is 72, not 70; 20 % up then 20 % down is 96); every
// question right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { twoChanges } from "../src/math/moneySense.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("two changes in a row multiply: 72 not 70, 96 not 100", () => {
  const off = twoChanges({ mode: "offOff", first: 20, second: 10 });
  near(off.after1, 80);
  near(off.after2, 72);
  near(off.added, 70);
  const up = twoChanges({ mode: "upDown", first: 20, second: 20 });
  near(up.after1, 120);
  near(up.after2, 96);
  near(up.added, 100);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("moneySense", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  assert.ok(seen.has("loanRateOnly") && seen.has("unitBiggerCheaper") && seen.has("percentsAdded"), [...seen].join(", "));
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("moneySense", L as 1 | 2 | 3)), [7, 7, 8]);
});
