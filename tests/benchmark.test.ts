// Closer to?: every question has one clearly nearest benchmark (never a tie or a near one) in its level's kind, the
// benchmark is read however it is typed, a cut instead of a rounding is named, the steps give the distances, and the
// board's rounds, stars, clock and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, preview, trapInputs } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import {
  judgeNear,
  NEAR_LADDER,
  nearest,
  nearLimit,
  nearNotice,
  nearNow,
  nearRound,
  nearStars,
  nearSteps,
  nearTask,
  placeOn,
  readBench,
  ROUND,
} from "../src/math/benchmark.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("one benchmark is clearly nearest, in every question of every level", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = nearTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${t.text} against ${t.options.map((o) => o.text).join(", ")}`;
      assert.equal(t.right, nearest(t.v, t.options), where);
      const d = t.options.map((o) => Math.abs(o.v - t.v)).sort((a, b) => a - b);
      assert.ok(d[1] - d[0] >= 0.2 * Math.abs(t.options[1].v - t.options[0].v) - 1e-9, `${where}: too close to call`);
      assert.ok(t.options.every((o, i) => i === 0 || o.v > t.options[i - 1].v), `${where}: in order`);
      if (level === 2) assert.deepEqual(t.options.map((o) => o.text), ["0", "½", "1"]);
      if (level === 3) assert.ok(t.options[0].v > 0 && /[×÷+]/.test(t.text), where);
    }
  const right = Array.from({ length: 300 }, (_, i) => nearTask(3, rng(i + 1)).right);
  assert.ok([0, 1, 2].every((k) => right.includes(k)), "the nearest isn't always in the same place");
});

test("a benchmark is read however it is typed; anything else is sent back", () => {
  for (const [src, v] of [["40", 40], [" 1/2 ", 0.5], ["½", 0.5], ["0,5", 0.5], ["1500", 1500]] as const) assert.equal(readBench(src), v, src);
  for (const bad of ["", "half", "1/0", "4 0"]) assert.equal(readBench(bad), null, bad);
  const t = { options: [{ v: 30, text: "30", plain: "30", tex: "30" }, { v: 40, text: "40", plain: "40", tex: "40" }], right: 1 };
  assert.deepEqual(judgeNear(t, "40"), { ok: true });
  assert.deepEqual(judgeNear(t, "30"), { ok: false, picked: 0 });
  assert.deepEqual(judgeNear(t, "37"), { ok: false, problem: "notOption" });
  assert.deepEqual(judgeNear(t, "forty"), { ok: false, problem: "unreadable" });
});

test("the practice question: its benchmark, a cut named as one, a number not offered sent back, the steps", () => {
  for (const level of LEVELS) {
    const ex = exercise("closerTo", level, 7, w);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.equal(preview(ex, ex.plain), null);
    assert.ok(ex.steps!.length >= 1 && ex.steps!.at(-1)!.includes("|"));
  }
  const ex = exercise("closerTo", 1, 7, w);
  const [trap] = trapInputs(ex);
  assert.equal(trap.id, "truncated");
  assert.equal(check(ex, trap.input, w).mistake, "truncated");
  assert.equal(check(ex, "15", w).why, "Pick one of the numbers offered: 10, 20.");
  const q = { skill: "closerTo" as const, level: 2, seed: 7 };
  assert.deepEqual([mark(q, "½"), mark(q, "1"), mark(q, "2/3")], ["correct", "wrong", "form"]);
});

test("the steps: the distances, a fraction as a decimal, a calculation's value", () => {
  const t1 = nearTask(1, rng(7));
  assert.equal(nearSteps(t1).join(" / "), "|16 - 10| = 6, \\quad |16 - 20| = 4");
  const frac = { level: 2 as const, v: 2 / 3, text: "2/3", tex: "\\frac{2}{3}", options: nearTask(2, rng(1)).options, right: 2 };
  assert.deepEqual(nearSteps(frac), ["\\frac{2}{3} \\approx 0.667", "|\\frac{2}{3} - 0| \\approx 0.667, \\quad |\\frac{2}{3} - \\frac{1}{2}| \\approx 0.167, \\quad |\\frac{2}{3} - 1| \\approx 0.333"]);
  const calc = nearTask(3, rng(7));
  assert.match(nearSteps(calc)[0], /^17 \\times 96 = 1632$/);
});

test("the board: rounds of eight, stars, the clock, where a number sits, the notices", () => {
  NEAR_LADDER.forEach(({ level, seed }, stage) => {
    const r = nearRound(level, seed);
    assert.equal(r.length, ROUND);
    assert.equal(new Set(r.map((t) => t.text)).size, ROUND);
    assert.deepEqual(nearNow({ mode: "puzzle", stage, level: 1, seed: 0, i: 5 }), r[5]);
  });
  assert.deepEqual(nearNow({ mode: "endless", stage: 0, level: 3, seed: 4, i: 0 }), nearTask(3, rng(4)));
  assert.deepEqual([nearStars(8), nearStars(7), nearStars(6), nearStars(5)], [3, 2, 2, 1]);
  assert.equal(nearLimit(0), 4000);
  assert.ok(nearLimit(5) < nearLimit(4));
  assert.equal(nearLimit(30), 1500);
  const t = nearTask(1, rng(7));
  assert.equal(placeOn(t, 10), 0);
  assert.equal(placeOn(t, 16), 0.6);
  assert.equal(placeOn(t, -100), -0.08);
  const calc = { ...nearTask(3, rng(7)), v: 1510 };
  assert.equal(nearNotice(calc, true, 5000, null, 1), "onTheLine");
  assert.equal(nearNotice(t, true, 5000, Array(ROUND).fill(true), 0), "perfect");
  assert.equal(nearNotice(t, true, 5000, [...Array(ROUND - 1).fill(true), false], 0), null);
  assert.equal(nearNotice(t, true, 5000, null, 10), "streak10");
  assert.equal(nearNotice(t, true, 800, null, 2), "lightning");
  assert.equal(nearNotice(t, false, 800, null, 0), null);
});
