// Kakooma: every set has exactly one number made from two others, in one way, from the level's numbers; a grid's corners
// each answer one number of its middle; the slips are told apart and never the answer; in practice the answer is typed
// or picked and the slips are named; the board's stars, notices and ladder follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import { KAK, KAK_LADDER, KAK_RECENT, kakGrid, kakNotice, kakNow, kakOpen, kakSet, kakSlip, kakStars, kakSum, kakTask, kakTraps, partsOf, ways, type KakSet } from "../src/math/kakooma.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const set = (nums: number[], op: "+" | "*" = "+"): KakSet => {
  const [[answer, a, b]] = ways(nums, op);
  return { level: op === "+" ? 2 : 3, op, nums, answer, parts: [a, b] };
};

test("every set has one number made from two others, in one way, from the level's numbers, and the sets vary", () => {
  for (const level of LEVELS) {
    const { op, size, lo, hi, top } = KAK[level];
    const answers = new Set<number>();
    let largest = 0;
    let trapped = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = kakSet(level, rng(seed));
      assert.equal(s.nums.length, size);
      assert.equal(new Set(s.nums).size, size, `${s.nums} has a number twice`);
      assert.ok(s.nums.every((n) => n >= lo && n <= hi), `${s.nums}`);
      assert.deepEqual(ways(s.nums, op), [[s.answer, ...s.parts]], `${s.nums}`);
      assert.ok(s.parts[1] <= top, `${kakSum(s)}`);
      answers.add(s.answer);
      if (s.answer === Math.max(...s.nums)) largest++;
      if (kakTraps(s).some((x) => x.id !== "partForWhole")) trapped++;
    }
    assert.ok(answers.size >= (level === 1 ? 7 : 15), `level ${level}: ${[...answers]}`);
    // Above easy the biggest number is seldom the answer, and most sets lay a trap.
    if (level > 1) assert.ok(largest < 200 && trapped > 200, `level ${level}: largest ${largest}, trapped ${trapped} of 400`);
  }
});

test("the endless run keeps clear of its last sets: not their two parts again, nor the last two answers", () => {
  for (const level of LEVELS) {
    let recent: [number, number][] = [];
    for (let seed = 1; seed <= 300; seed++) {
      const s = kakNow({ mode: "endless", stage: 0, level, seed, recent }).sets[0];
      assert.ok(!recent.some(([a, b]) => a === s.parts[0] && b === s.parts[1]), `level ${level}: ${kakSum(s)} again`);
      assert.ok(!recent.slice(-2).some(([a, b]) => (s.op === "+" ? a + b : a * b) === s.answer), `level ${level}: ${s.answer} again`);
      recent = [...recent, s.parts].slice(-KAK_RECENT);
    }
  }
});

test("a set made to an answer has it, and partsOf lists the ways of making a number", () => {
  assert.deepEqual(partsOf(7, 1), [[1, 6], [2, 5], [3, 4]]);
  assert.deepEqual(partsOf(36, 3), [[4, 9]], "6 × 6 would use 6 twice; 2 × 18 and 3 × 12 aren't in the tables");
  assert.deepEqual(partsOf(2, 1), [], "1 + 1 uses 1 twice");
  for (const level of LEVELS)
    for (let seed = 1; seed <= 100; seed++) {
      const g = kakGrid(level, rng(seed));
      assert.equal(g.middle.nums.length, 4);
      assert.deepEqual(ways(g.middle.nums, KAK[level].op), [[g.middle.answer, ...g.middle.parts]]);
      g.corners.forEach((c, i) => {
        assert.equal(c.answer, g.middle.nums[i], `corner ${i} answers the middle's number ${i}`);
        assert.equal(c.nums.length, Math.min(KAK[level].size, 5), "hard's corners keep five numbers, to fit round the middle");
        assert.deepEqual(ways(c.nums, KAK[level].op), [[c.answer, ...c.parts]]);
      });
    }
});

test("the slips: one of the parts, a number used twice, a sum for a product; none for the answer", () => {
  // 9 = 4 + 5, with 8 = 4 + 4.
  const s = set([5, 9, 4, 8]);
  assert.deepEqual(kakSlip(s, 4), { id: "partForWhole", vars: { n: 4 } });
  assert.deepEqual(kakSlip(s, 8), { id: "usedTwice", vars: { n: 8, z: 4 } });
  assert.equal(kakSlip(s, 9), null);
  // 42 = 6 × 7, with 49 = 7 × 7 and 13 = 6 + 7; 60 is just there.
  const p = set([7, 49, 6, 13, 42, 60], "*");
  assert.deepEqual(kakSlip(p, 49), { id: "usedTwice", vars: { n: 49, z: 7 } });
  assert.deepEqual(kakSlip(p, 13), { id: "sumNotProduct", vars: { n: 13, a: 6, b: 7 } });
  assert.deepEqual(kakSlip(p, 6), { id: "partForWhole", vars: { n: 6 } });
  assert.equal(kakSlip(p, 60), null);
  assert.deepEqual(kakTraps(p).map((x) => x.n), [7, 49, 6, 13]);
  assert.equal(kakSum(p), "42 = 6 × 7");
  assert.equal(kakSum(s), "9 = 4 + 5");
});

test("in practice: the number typed or picked, the slips named; the server agrees", () => {
  let named = 0;
  for (const level of LEVELS)
    for (let seed = 1; seed <= 80; seed++) {
      const ex = exercise("kakooma", level, seed, w);
      if (ex.answer.k !== "near") throw new Error("not a pick of the numbers");
      assert.deepEqual(check(ex, ex.plain, w), { ok: true });
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, `${ex.q} ${t.input}`);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
        named++;
      }
    }
  assert.ok(named > 400, `${named} slips named`);
  const ex = exercise("kakooma", 1, 7, w);
  assert.match(check(ex, "100", w).why ?? "", /^Pick one of the numbers offered/);
  const q = { skill: "kakooma" as const, level: 1, seed: 7 };
  assert.deepEqual([mark(q, ex.plain), mark(q, "100"), mark(q, "seven")], ["correct", "form", "form"]);
});

test("the board: stars, the middle opening last, the notices, the ladder", () => {
  assert.deepEqual([kakStars(0, false), kakStars(1, false), kakStars(2, false), kakStars(0, true), kakStars(1, true), kakStars(3, true)], [3, 2, 1, 2, 1, 1]);
  const g = kakTask(2, true, 5);
  assert.equal(g.sets.length, 5);
  assert.ok([0, 1, 2, 3].every((i) => kakOpen(g, [], i)) && !kakOpen(g, [0, 1, 2], 4) && kakOpen(g, [3, 1, 0, 2], 4));
  const one = { level: 1 as const, sets: [set([7, 2, 5, 6])] };
  assert.ok(kakOpen(one, [], 0));
  assert.equal(kakNotice(g, 0, false, 60000, 0), "grid");
  assert.equal(kakNotice({ level: 2, sets: [set([5, 9, 4, 8])] }, 0, false, 9000, 0), "notFooled");
  assert.equal(kakNotice(one, 0, false, 3000, 1), "quick");
  assert.equal(kakNotice(one, 0, false, 9000, 1), null);
  assert.equal(kakNotice(one, 1, false, 3000, 0), null);
  assert.equal(kakNotice(one, 0, true, 3000, 0), null, "not with the hint");
  assert.equal(kakNotice(one, 0, false, 9000, 10), "streak10");
  KAK_LADDER.forEach(({ level, grid, seed }, stage) => assert.deepEqual(kakNow({ mode: "puzzle", stage, level: 1, seed: 0 }), kakTask(level, grid, seed)));
  const sums = KAK_LADDER.map((_, stage) => kakNow({ mode: "puzzle", stage, level: 1, seed: 0 })).filter((t) => t.sets.length === 1).map((t) => kakSum(t.sets[0]));
  assert.deepEqual(sums, ["7 = 2 + 5", "9 = 4 + 5", "4 = 1 + 3", "20 = 4 + 16", "24 = 4 × 6", "42 = 6 × 7"]);
  assert.deepEqual(kakNow({ mode: "endless", stage: 0, level: 3, seed: 9 }), kakTask(3, false, 9));
});
