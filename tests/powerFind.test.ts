// The laws of powers by hand (#720): every round's tiles differ and its words fill in every language; what each round
// counts holds however long the rows are (m + n twos joined, m − n left after cancelling, m × n in the grid, and below
// zero once the bottom is longer); the rows keep their limits; a right tap counts only once the rows have been changed a
// few times, and stands until Next.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { again, BASE, MOST, MOVES, next, order, POWER_FIND_START, POWER_LADDER, readings, roundOf, setCount, tap, tiles } from "../src/math/powerFind.ts";

const at = (round: number) => {
  let s = POWER_FIND_START;
  for (let i = 0; i < round; i++) s = next(s);
  return s;
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

test("every round's tiles differ, are all shown, and its words are there in every language", () => {
  POWER_LADDER.forEach((r, k) => {
    const t = tiles(at(k))!;
    assert.equal(new Set([t.right, t.slip, t.other]).size, 3, `round ${k}`);
    assert.deepEqual([...order(at(k))].sort(), [t.right, t.slip, t.other].sort());
    for (const L of [en, ka, ru]) {
      const w = L.live.powerFind as Record<string, string>;
      const key = cap(r.kind);
      for (const words of [w[`ask${key}`], w[`rule${key}`], w[`slip${key}`], w[`other${key}`]]) assert.ok(words && !/\{\w+\}/.test(words), `${k}: ${words}`);
      for (const v of [t.right, t.slip, t.other]) assert.ok(w[v], `${k}: ${v}`);
    }
  });
});

test("each round counts its law for every length of the rows", () => {
  for (let k = 0; k < POWER_LADDER.length; k++)
    for (let m = 1; m <= MOST; m++)
      for (let n = 1; n <= MOST; n++) {
        const s = setCount(setCount(at(k), "m", m), "n", n);
        const read = readings(s);
        const kind = roundOf(s)!.kind;
        if (kind === "product") assert.equal(read.exp, s.m + s.n);
        else if (kind === "power") assert.equal(read.exp, s.m * s.n);
        else assert.equal(read.exp, s.m - s.n);
        assert.equal(read.value, BASE ** read.exp);
        if (kind === "quotient") assert.ok(s.n < s.m, "a quotient's bottom stays shorter until the last round");
      }
  const last = setCount(setCount(at(3), "m", 2), "n", 5);
  assert.deepEqual(readings(last), { twos: 3, cancel: 2, exp: -3, value: 1 / 8 });
});

test("the rows keep to 1 to 6, and a change counts once", () => {
  let s = setCount(POWER_FIND_START, "m", 40);
  assert.equal(s.m, MOST);
  s = setCount(s, "n", -3);
  assert.equal(s.n, 1);
  assert.equal(s.seen, 2);
  assert.equal(setCount(s, "n", 1), s, "the same length again is no change");
});

test("a right tile counts only after the rows have changed, and stands until Next", () => {
  const t = tiles(POWER_FIND_START)!;
  assert.equal(tap(POWER_FIND_START, t.right).said?.ok, false);
  let s = POWER_FIND_START;
  for (let i = 0; i < MOVES; i++) s = setCount(s, "m", s.m + 1);
  s = tap(s, t.slip);
  assert.equal(s.said?.ok, false);
  s = tap(s, t.right);
  assert.equal(s.said?.ok, true);
  assert.equal(tap(s, t.slip), s);
  let end = s;
  for (let i = 0; i < POWER_LADDER.length; i++) end = next(end);
  assert.equal(roundOf(end), null);
  assert.equal(tiles(end), null);
  assert.deepEqual(again(), POWER_FIND_START);
});
