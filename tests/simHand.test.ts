// Similar triangles by hand (#714): every round's tiles differ and the right one is the round's rule; the copy snaps to
// halves and stays in range; the sides show how they grew only at the round's stretch; the test rounds hold one
// similar and one not; a rule comes only with a right tap.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { fill } from "../src/math/chart.ts";
import { again, atTarget, K_MAX, K_MIN, next, roundOf, ruleOf, SIM_HAND_START, SIM_LADDER, similarOf, stretch, tap, targetOf, tiles } from "../src/math/simHand.ts";

const at = (round: number) => ({ ...SIM_HAND_START, round });

test("every round's tiles differ, the right one is what its rule says, and the rules fill in every language", () => {
  SIM_LADDER.forEach((r, k) => {
    const t = tiles(at(k))!;
    const all = [t.right, t.slip, ...(t.other ? [t.other] : [])];
    assert.equal(new Set(all).size, all.length, `round ${k}`);
    if (r.kind !== "test") assert.equal(ruleOf(r).v, t.right, `round ${k}`);
    for (const L of [en, ka, ru]) {
      const w = L.live.simHand;
      const rule = r.kind === "side" ? w.ruleSide : r.kind === "angle" ? w.ruleAngle : r.kind === "shadow" ? w.ruleShadow : similarOf(r) ? w.ruleTestYes : w.ruleTestNo;
      assert.ok(!/\{\w+\}/.test(fill(rule, ruleOf(r))), `${k}: ${rule}`);
    }
    assert.ok(targetOf(r) >= K_MIN && targetOf(r) <= K_MAX && Number.isInteger(targetOf(r) * 2), `round ${k}`);
  });
  const tests = SIM_LADDER.filter((r) => r.kind === "test");
  assert.deepEqual(tests.map((r) => similarOf(r as Extract<typeof r, { kind: "test" }>)).sort(), [false, true]);
});

test("the copy snaps to halves, stays in range, and shows how it grew only at the round's stretch", () => {
  let s = at(0);
  assert.equal(atTarget(s), false);
  s = stretch(s, 2.2);
  assert.equal(s.k, 2);
  assert.equal(atTarget(s), true);
  assert.equal(stretch(s, 9).k, K_MAX);
  assert.equal(stretch(s, -1).k, K_MIN);
});

test("a wrong tap can be tried again; the right one counts only stretched and stands until Next; the ladder ends", () => {
  let s = at(0);
  const t = tiles(s)!;
  assert.equal(tap(s, t.right).said?.ok, false);
  s = stretch(s, targetOf(roundOf(s)!));
  s = tap(s, t.slip);
  assert.deepEqual(s.said, { v: t.slip, ok: false });
  s = tap(s, t.right);
  assert.deepEqual(s.said, { v: t.right, ok: true });
  assert.deepEqual(tap(s, t.other!), s);
  s = next(s);
  assert.equal(s.k, 1);
  for (let i = 0; i < SIM_LADDER.length + 2; i++) s = next(s);
  assert.equal(roundOf(s), null);
  assert.equal(tiles(s), null);
  assert.deepEqual(again(), SIM_HAND_START);
});
