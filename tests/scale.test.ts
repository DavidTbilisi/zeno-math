// Scale drawings and maps: every question right with its own answer and wrong with each slip; areas scale by k², not k.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("scale", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id}`);
      }
    }
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("scale", L as 1 | 2 | 3)), [7, 7, 8]);
});

test("an area on a plan is the plan's area times k², and the slip is times k", () => {
  let seen = 0;
  for (let seed = 1; seed <= 200 && seen < 5; seed++) {
    const ex = exercise("scale", 3, seed, w);
    const m = ex.prompt.match(/1 cm : (\d+) m\. A room on it is (\d+) cm by (\d+) cm/);
    if (!m) continue;
    const [k, a, b] = m.slice(1).map(Number);
    assert.equal(Number(ex.plain), a * b * k * k);
    assert.ok(trapInputs(ex).some((t) => t.id === "areaScaledByK" && Number(t.input) === a * b * k));
    seen++;
  }
  assert.ok(seen > 0);
});
