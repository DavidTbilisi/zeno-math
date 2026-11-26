// Inequalities on a number line (#723): the piece's rounds (the end point and the turned sign found by testing, a
// right tile counting only once both sides and the end have been tested), the line practice draws, and the new
// practice kinds, whose slips are each named with their working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { again, holds, INEQ_FIND_START, INEQ_LADDER, ineqLineSvg, lhs, lhsAt, missOf, next, ready, roundOf, solution, tap, test as tryAt, tiles } from "../src/math/ineqFind.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("the rounds: x < 3, x ≥ 3, then the sign turned round by −2x and by 3 − x", () => {
  assert.deepEqual(INEQ_LADDER.map(solution), [{ rel: "<", t: 3 }, { rel: ">=", t: 3 }, { rel: ">", t: -3 }, { rel: ">=", t: 2 }]);
  assert.deepEqual(INEQ_LADDER.map(lhs), ["x + 2", "x − 1", "−2x", "3 − x"]);
  assert.deepEqual([lhsAt(INEQ_LADDER[0], 1), lhsAt(INEQ_LADDER[2], -3), lhsAt(INEQ_LADDER[3], 4)], ["1 + 2", "−2 × (−3)", "3 − 4"]);
  for (const r of INEQ_LADDER) {
    const { rel, t } = solution(r);
    for (let x = -6; x <= 6; x++) assert.equal(holds(r, x), rel === "<" ? x < t : rel === "<=" ? x <= t : rel === ">" ? x > t : x >= t, `${lhs(r)} at ${x}`);
  }
  // The slip each round offers: the end taken the other way, then the side not turned round.
  assert.deepEqual(INEQ_LADDER.map((_, round) => tiles({ ...INEQ_FIND_START, round })!.slip), ["<=", ">", "<", "<="]);
});

test("a right tile counts only once both sides and the end have been tested", () => {
  let s = INEQ_FIND_START;
  s = tap(s, "<");
  assert.deepEqual(s.said, { v: "<", ok: false });
  s = tryAt(s, 0);
  s = tryAt(s, 5);
  assert.equal(ready(s), false, "the end, 3, not tested yet");
  s = tryAt(s, 3.2);
  assert.deepEqual(s.tested, [0, 5, 3]);
  assert.equal(ready(s), true);
  assert.equal(missOf(s, "<="), "end");
  assert.equal(missOf(s, ">"), "side");
  assert.equal(missOf(s, ">="), "both");
  assert.equal(tap(s, "<=").said?.ok, false);
  s = tap(s, "<");
  assert.deepEqual(s.said, { v: "<", ok: true });
  assert.equal(tap(s, ">"), s, "a right answer stands until Next");
  assert.deepEqual(tryAt(s, 0).tested, [5, 3, 0], "tested again: moved to the end");
  assert.deepEqual(tryAt(s, 40).tested.at(-1), 6, "kept on the line");
  s = next(s);
  assert.deepEqual([s.round, s.tested, s.said], [1, [], null]);
  let end = s;
  for (let i = 0; i < 4; i++) end = next(end);
  assert.equal(roundOf(end), null);
  assert.equal(tryAt(end, 1), end);
  assert.deepEqual(again(), INEQ_FIND_START);
});

test("the line practice draws: rays, a stretch, two rays, no NaN", () => {
  const one = ineqLineSvg(-2, 8, [{ lo: null, hi: { v: 3, closed: false } }]);
  assert.match(one.body, /fill="#fff"/);
  const two = ineqLineSvg(-4, 6, [{ lo: null, hi: { v: -1, closed: true } }, { lo: { v: 3, closed: false }, hi: null }]);
  assert.equal(two.body.match(/<circle/g)!.length, 2);
  assert.equal(two.body.match(/<path/g)!.length, 2);
  for (const p of [one, two]) assert.ok(!p.body.includes("NaN") && p.w > 300);
});

test("in practice: the new kinds' slips are named, their hints filled in", () => {
  const named = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("inequalities", level, seed, w);
      assert.equal(check(ex, ex.plain, w).ok, true, `${level} ${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, `${level} ${seed} ${ex.prompt} ${t.input}`);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
        named.add(t.id);
      }
    }
  for (const id of ["strictEndIncluded", "rayDirectionSwapped", "oneStepOpWrong", "wordsEndMisread", "roundedWrongWay", "orReadAsAnd", "boundary", "noFlip"]) assert.ok(named.has(id), id);
});
