// Two-way tables: one count is three shares (12 of Year 7's 30, of the sport column's 22, of all 70); the rows split
// alike when their shares are equal; every question is right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { pct, sameSplit, sharesOf, TABLE_START } from "../src/math/twoWay.ts";

const w = en.pracWords;

test("a count out of its row, its column and everyone; rows alike when their shares match", () => {
  assert.deepEqual(sharesOf(TABLE_START.cells, 0), { n: 12, row: 30, col: 22, all: 70 });
  assert.deepEqual(sharesOf(TABLE_START.cells, 3), { n: 30, row: 40, col: 48, all: 70 });
  assert.equal(pct(12 / 30), "40");
  assert.equal(pct(1 / 3), "33.3");
  assert.equal(sameSplit(TABLE_START.cells), false);
  assert.equal(sameSplit([12, 18, 8, 12]), true);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  const answers = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("twoWay", level, seed, w);
      if (level === 3 && ex.prompt === w.twy.likely) answers.add(ex.plain);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["cellWrongTotal", "grandOneRow", "shareOfColumn", "shareOfRow", "shareOfAll", "assocByCounts", "likelyByCount"]) assert.ok(seen.has(id), id);
  assert.equal(answers.size, 2, "walkers and bus riders are each the answer sometimes");
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("twoWay", L as 1 | 2 | 3)), [8, 8, 10]);
});
