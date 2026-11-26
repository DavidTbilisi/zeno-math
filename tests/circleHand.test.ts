// Circle theorems by hand (#715): every round's tiles differ and its words fill in every language; what the round reads
// stays the same wherever the point goes (the angle at the circle half the one at the centre, a right angle in a
// semicircle, opposite angles making 180°, equal tangents); the point keeps to its arc; a right tap counts only once the
// point has been moved a few times, and stands until Next.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { fill } from "../src/math/chart.ts";
import { again, CIRCLE_HAND_START, CIRCLE_LADDER, D_MAX, D_MIN, MOVES, move, next, rangeOf, readings, roundOf, ruleOf, tap, tiles } from "../src/math/circleHand.ts";

const at = (round: number) => {
  let s = CIRCLE_HAND_START;
  for (let i = 0; i < round; i++) s = next(s);
  return s;
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

test("every round's tiles differ and its words fill in every language", () => {
  CIRCLE_LADDER.forEach((r, k) => {
    const t = tiles(at(k))!;
    assert.equal(new Set([t.right, t.slip, t.other]).size, 3, `round ${k}`);
    for (const L of [en, ka, ru]) {
      const w = L.live.circleHand as Record<string, string>;
      const key = cap(r.kind);
      for (const words of [w[`ask${key}`], w[`rule${key}`], w[`slip${key}`], w[`other${key}`]]) assert.ok(words && !/\{\w+\}/.test(fill(words, ruleOf(r))), `${k}: ${words}`);
      for (const v of [t.right, t.slip, t.other]) if (Number.isNaN(Number(v))) assert.ok(w[v], `${k}: ${v}`);
    }
  });
});

test("what each round reads stays the same wherever the point goes", () => {
  CIRCLE_LADDER.forEach((r, k) => {
    const [lo, hi] = rangeOf(r);
    const seen = new Set<string>();
    for (let a = lo; a <= hi; a += 7)
      for (const d of r.kind === "tangents" ? [D_MIN, 1.8, D_MAX] : [1]) {
        const got = readings(move(at(k), a, d));
        if (r.kind === "compare" || r.kind === "centre") assert.equal(2 * got.C, got.O, `${k} at ${a}`);
        if (r.kind === "semi") assert.equal(got.C, 90, `${k} at ${a}`);
        if (r.kind === "cyclic") assert.equal(got.A + got.C, 180, `${k} at ${a}`);
        if (r.kind === "tangents") assert.equal(got.PA, got.PB);
        seen.add(JSON.stringify(got));
      }
    // The tangents change length as P moves; the angles never do.
    assert.equal(seen.size > 1, r.kind === "tangents", `round ${k}`);
  });
  assert.equal(readings(at(0)).O, 120);
});

test("the point keeps to its arc, counts as moved only when it goes somewhere new, and a right tap needs it moved", () => {
  let s = at(0);
  const [lo, hi] = rangeOf(roundOf(s)!);
  assert.equal(move(s, 270).t === lo || move(s, 270).t === hi, true);
  assert.equal(move(s, 95).seen, 0);
  const t = tiles(s)!;
  assert.deepEqual(tap(s, t.right).said, { v: t.right, ok: false });
  for (const a of [40, 140, 60]) s = move(s, a);
  assert.ok(s.seen >= MOVES);
  s = tap(s, t.slip);
  assert.deepEqual(s.said, { v: t.slip, ok: false });
  s = tap(s, t.right);
  assert.deepEqual(s.said, { v: t.right, ok: true });
  assert.deepEqual(tap(s, t.other), s);
  s = next(s);
  assert.equal(s.seen, 0);
  const p = move(at(CIRCLE_LADDER.length - 1), 0, 9);
  assert.equal(p.d, D_MAX);
  for (let i = 0; i < CIRCLE_LADDER.length + 2; i++) s = next(s);
  assert.equal(roundOf(s), null);
  assert.equal(tiles(s), null);
  assert.deepEqual(again(), CIRCLE_HAND_START);
});
