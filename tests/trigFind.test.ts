// Trig rules by hand (#716): every round's tiles differ and its words fill in every language; what each round is about
// holds wherever the point goes (sin²θ + cos²θ = 1, sin(180° − θ) = sin θ, the three sine-rule ratios equal and the
// same, c² = a² + b² − 2ab cos C and equal to a² + b² only at 90°); the point keeps to its range; a right tap counts
// only once the point has been moved a few times, and stands until Next.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { fill } from "../src/math/chart.ts";
import { again, MOVES, move, next, order, rangeOf, readings, roundOf, SIDE_A, SIDE_B, SINE_R, tap, tiles, TRIG_FIND_START, TRIG_LADDER } from "../src/math/trigFind.ts";

const at = (round: number) => {
  let s = TRIG_FIND_START;
  for (let i = 0; i < round; i++) s = next(s);
  return s;
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

test("every round's tiles differ, are all shown, and its words fill in every language", () => {
  TRIG_LADDER.forEach((r, k) => {
    const t = tiles(at(k))!;
    assert.equal(new Set([t.right, t.slip, t.other]).size, 3, `round ${k}`);
    assert.deepEqual([...order(at(k))].sort(), [t.right, t.slip, t.other].sort());
    for (const L of [en, ka, ru]) {
      const w = L.live.trigFind as Record<string, string>;
      const key = cap(r.kind);
      for (const words of [w[`ask${key}`], w[`rule${key}`], w[`slip${key}`], w[`other${key}`]]) assert.ok(words && !/\{\w+\}/.test(fill(words, { d: 8 })), `${k}: ${words}`);
      for (const v of [t.right, t.slip, t.other]) assert.ok(w[v], `${k}: ${v}`);
    }
  });
  // The right tile is not always the first one shown.
  assert.ok(TRIG_LADDER.some((_, k) => order(at(k))[0] !== tiles(at(k))!.right));
});

test("what each round is about holds wherever the point goes", () => {
  TRIG_LADDER.forEach((r, k) => {
    const [lo, hi] = rangeOf(r);
    for (let a = lo; a <= hi; a += 7) {
      const got = readings(move(at(k), a));
      if (r.kind === "pyth") assert.equal(got.sum, 1, `${a}`);
      if (r.kind === "mirror") {
        assert.equal(got.sinP, got.sinQ, `${a}`);
        assert.equal(got.cosP, -got.cosQ || 0, `${a}`);
      }
      if (r.kind === "sine") {
        assert.equal(got.ra, 2 * SINE_R, `${a}`);
        assert.equal(got.rb, 2 * SINE_R, `${a}`);
        assert.equal(got.rc, 2 * SINE_R, `${a}`);
        assert.equal(got.A + got.B + got.C, 180, `${a}`);
      }
      if (r.kind === "cosine") {
        assert.ok(Math.abs(got.gap - got.twoab) < 0.11, `${a}`);
        assert.equal(Math.abs(got.c2 - got.sum) < 0.05, got.C === 90, `${a}`);
      }
    }
  });
  const c = readings(move(at(3), 90));
  assert.equal(c.c2, SIDE_A ** 2 + SIDE_B ** 2);
});

test("the point keeps to its range, counts as moved only when it goes somewhere new, and a right tap needs it moved", () => {
  const cos = at(3);
  assert.equal(move(cos, 200).t, rangeOf(roundOf(cos)!)[1]);
  assert.equal(move(at(0), -10).t, 350);
  let s = at(0);
  assert.equal(move(s, s.t + 10).seen, 0);
  const t = tiles(s)!;
  assert.deepEqual(tap(s, t.right).said, { v: t.right, ok: false });
  for (const a of [100, 200, 300]) s = move(s, a);
  assert.ok(s.seen >= MOVES);
  s = tap(s, t.slip);
  assert.deepEqual(s.said, { v: t.slip, ok: false });
  s = tap(s, t.right);
  assert.deepEqual(s.said, { v: t.right, ok: true });
  assert.deepEqual(tap(s, t.other), s);
  s = next(s);
  assert.equal(s.seen, 0);
  for (let i = 0; i < TRIG_LADDER.length + 2; i++) s = next(s);
  assert.equal(roundOf(s), null);
  assert.equal(tiles(s), null);
  assert.deepEqual(again(), TRIG_FIND_START);
});
