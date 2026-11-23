// Every menu entry has a grade band, and every grade of school has something to open.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MENUS } from "../src/menus.ts";
import { entryKey, GRADE_BANDS, gradeSections } from "../src/menuGrades.ts";
import { GRADES } from "../src/model/curriculum.ts";

const keys = MENUS.flatMap((m) => m.sections.flatMap((s) => s.items.map(entryKey)));

test("every menu entry has a band, and every band is an entry's", () => {
  assert.deepEqual(keys.filter((k) => !GRADE_BANDS[k]), []);
  assert.deepEqual(Object.keys(GRADE_BANDS).filter((k) => !keys.includes(k)), []);
});

test("a band runs from a grade to the same or a later one", () => {
  for (const [k, [a, b]] of Object.entries(GRADE_BANDS)) assert.ok(GRADES.includes(a) && GRADES.includes(b) && a <= b, k);
});

test("every grade has entries, and grade 6 has its fractions, ratio and algebra pieces", () => {
  for (const g of GRADES) assert.ok(gradeSections(g).length > 0, String(g));
  const six = gradeSections(6).flatMap((s) => s.items.map(entryKey));
  for (const k of ["fractions", "fitTiles", "balance", "algebraTiles", "counters", "makeDiagram", "statistics"]) assert.ok(six.includes(k), k);
  for (const k of ["tenFrame", "quickLook", "deriv", "beCache"]) assert.ok(!six.includes(k), k);
});
