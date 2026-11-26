// The percent bar by hand (#707): the parts show once the shade is at the percent asked; finding the whole the shade
// starts at the known part and cannot pass it; the tiles hold the right answer and the usual slip; a rule comes only
// with a right tap.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { fill } from "../src/math/chart.ts";
import { again, moveShade, next, PERCENT_HAND_START, PERCENT_LADDER, partsShown, roundOf, ruleOf, shadeHolds, tap, tiles } from "../src/math/percentHand.ts";

const at = (round: number) => ({ ...PERCENT_HAND_START, round, at: PERCENT_LADDER[round].kind === "whole" ? (PERCENT_LADDER[round] as { p: number }).p : 0 });

test("every round has three different tiles, the right one whole, and its rule comes to it", () => {
  PERCENT_LADDER.forEach((r, k) => {
    const t = tiles(at(k))!;
    assert.equal(new Set([t.right, t.slip, t.other]).size, 3, `round ${k}`);
    assert.ok(Number.isInteger(t.right), `round ${k}`);
    assert.equal(ruleOf(r).v, t.right, `round ${k}`);
    const say = fill(r.kind === "of" ? en.live.percentHand.ruleOf : r.kind === "whole" ? en.live.percentHand.ruleWhole : en.live.percentHand.ruleWhat, ruleOf(r));
    assert.ok(!/\{\w+\}/.test(say), say);
  });
});

test("the parts show only once the shade is at the percent asked; the shade snaps to 5 % and stays on the bar", () => {
  let s = at(1);
  assert.equal(partsShown(s), false);
  s = moveShade(s, 23.4);
  assert.equal(s.at, 25);
  assert.equal(partsShown(s), true);
  assert.equal(moveShade(s, 140).at, 100);
  assert.equal(moveShade(s, -8).at, 0);
});

test("finding the whole: the shade starts at the known part, cannot go past it, and says what each share holds", () => {
  const k = PERCENT_LADDER.findIndex((r) => r.kind === "whole");
  let s = next({ ...PERCENT_HAND_START, round: k - 1 });
  const r = roundOf(s)!;
  assert.equal(r.kind, "whole");
  assert.equal(s.at, (r as { p: number }).p);
  assert.equal(moveShade(s, 90).at, (r as { p: number }).p);
  s = moveShade(s, 10);
  assert.equal(shadeHolds(r, 10), 9);
});

test("a wrong tap can be tried again; the right one stands until Next; the ladder ends and starts again", () => {
  let s = at(0);
  const t = tiles(s)!;
  // Not shaded yet: even the right tile waits for the bar.
  assert.equal(tap(s, t.right).said?.ok, false);
  s = moveShade(s, 50);
  s = tap(s, t.slip);
  assert.deepEqual(s.said, { v: t.slip, ok: false });
  s = tap(s, t.right);
  assert.deepEqual(s.said, { v: t.right, ok: true });
  assert.deepEqual(tap(s, t.other), s);
  for (let i = 0; i < PERCENT_LADDER.length + 2; i++) s = next(s);
  assert.equal(roundOf(s), null);
  assert.equal(tiles(s), null);
  assert.deepEqual(again(), PERCENT_HAND_START);
});
