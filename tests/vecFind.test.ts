// 2D vectors by hand (#717): every round's tiles differ and its words fill in every language; what each round is about
// holds wherever the tip goes (|v| = √(x² + y²), tan θ = y ÷ x, a + b part by part and |a + b| ≤ |a| + |b|, and
// |v ÷ |v|| = 1); the tip keeps to the grid and off the origin; a right tap counts only once the tip has been moved a
// few times, and stands until Next.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { A_FIXED, again, MOVES, move, next, order, readings, REACH, roundOf, tap, tiles, VEC_FIND_START, VEC_LADDER } from "../src/math/vecFind.ts";

const at = (round: number) => {
  let s = VEC_FIND_START;
  for (let i = 0; i < round; i++) s = next(s);
  return s;
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

test("every round's tiles differ, are all shown, and its words are there in every language", () => {
  VEC_LADDER.forEach((r, k) => {
    const t = tiles(at(k))!;
    assert.equal(new Set([t.right, t.slip, t.other]).size, 3, `round ${k}`);
    assert.deepEqual([...order(at(k))].sort(), [t.right, t.slip, t.other].sort());
    for (const L of [en, ka, ru]) {
      const w = L.live.vecFind as Record<string, string>;
      const key = cap(r.kind);
      for (const words of [w[`ask${key}`], w[`rule${key}`], w[`slip${key}`], w[`other${key}`]]) assert.ok(words && !/\{\w+\}/.test(words), `${k}: ${words}`);
      for (const v of [t.right, t.slip, t.other]) assert.ok(w[v], `${k}: ${v}`);
    }
  });
  assert.ok(VEC_LADDER.some((_, k) => order(at(k))[0] !== tiles(at(k))!.right));
});

test("what each round is about holds wherever the tip goes", () => {
  VEC_LADDER.forEach((r, k) => {
    for (let x = -REACH; x <= REACH; x++)
      for (let y = -REACH; y <= REACH; y++) {
        if (!x && !y) continue;
        const got = readings(move(at(k), x, y));
        const where = `${r.kind} at ${x}, ${y}`;
        if (r.kind === "length") assert.ok(Math.abs(got.len - Math.sqrt(x * x + y * y)) < 0.006, where);
        if (r.kind === "direction" && x) assert.ok(Math.abs(got.tan - y / x) < 0.011, where);
        if (r.kind === "add") {
          assert.deepEqual([got.sx, got.sy], [A_FIXED[0] + x, A_FIXED[1] + y], where);
          assert.ok(got.ls <= got.la + got.lb + 0.011, where);
        }
        if (r.kind === "unit") assert.equal(got.ulen, 1, where);
      }
  });
});

test("the tip keeps to the grid and off the origin, counts as moved only when it goes somewhere new, and a right tap needs it moved", () => {
  let s = at(0);
  assert.deepEqual([move(s, 40, -40).x, move(s, 40, -40).y], [REACH, -REACH]);
  assert.deepEqual(move(s, 0, 0), s);
  assert.equal(move(s, s.x + 1, s.y).seen, 0);
  const t = tiles(s)!;
  assert.deepEqual(tap(s, t.right).said, { v: t.right, ok: false });
  for (const [x, y] of [[-3, 2], [5, -5], [1, 1]]) s = move(s, x, y);
  assert.ok(s.seen >= MOVES);
  s = tap(s, t.slip);
  assert.deepEqual(s.said, { v: t.slip, ok: false });
  s = tap(s, t.right);
  assert.deepEqual(s.said, { v: t.right, ok: true });
  assert.deepEqual(tap(s, t.other), s);
  s = next(s);
  assert.equal(s.seen, 0);
  for (let i = 0; i < VEC_LADDER.length + 2; i++) s = next(s);
  assert.equal(roundOf(s), null);
  assert.equal(tiles(s), null);
  assert.deepEqual(again(), VEC_FIND_START);
});
