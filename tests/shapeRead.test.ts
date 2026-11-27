// The shape of a graph from f′ and f″ (#746): each round is right only at its own x, where f′ is zero and changes sign
// the way the round asks (a maximum or a minimum) or f″ is zero and changes sign (an inflection); every other place is
// named by f′'s or f″'s sign there; the line snaps to quarters and stands once right; the last rounds hide f.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { again, derivP, done, evalP, missOf, moveLine, next, readAt, SHAPE_READ_START, SHAPE_ROUNDS, snapX, X_FAR, X_STEP } from "../src/math/shapeRead.ts";

test("each round's x is the turn or the inflection it asks for", () => {
  for (const r of SHAPE_ROUNDS) {
    const d1 = derivP(r.f);
    const d2 = derivP(d1);
    const [g, t] = r.ask === "inflect" ? [d2, r.target] : [d1, r.target];
    assert.ok(Math.abs(evalP(g, t)) < 1e-9, `${r.ask} ${t}`);
    const [before, after] = [evalP(g, t - 0.25), evalP(g, t + 0.25)];
    assert.ok(before * after < 0, `${r.ask} changes sign at ${t}`);
    if (r.ask === "max") assert.ok(before > 0);
    if (r.ask === "min") assert.ok(before < 0);
  }
  assert.deepEqual(SHAPE_ROUNDS.map((r) => r.showF), [true, true, true, false, false]);
  assert.deepEqual(readAt(SHAPE_ROUNDS[0], -2), [1.33, 0, -1]);
});

test("only the round's x is right; elsewhere f′ or f″ names the miss", () => {
  for (const r of SHAPE_ROUNDS)
    for (let x = -X_FAR; x <= X_FAR; x += X_STEP) assert.equal(missOf(r, x) === null, x === r.target, `${r.ask} ${x}`);
  assert.equal(missOf(SHAPE_ROUNDS[0], -3), "rising");
  assert.equal(missOf(SHAPE_ROUNDS[0], 0), "falling");
  assert.equal(missOf(SHAPE_ROUNDS[0], 2), "otherTurn");
  assert.equal(missOf(SHAPE_ROUNDS[1], -2), "otherTurn");
  assert.equal(missOf(SHAPE_ROUNDS[2], 0), "bendUp");
  assert.equal(missOf(SHAPE_ROUNDS[2], 2), "bendDown");
  assert.equal(missOf(SHAPE_ROUNDS[3], -1), "otherTurn");
  assert.equal(missOf(SHAPE_ROUNDS[4], 3), "bendDown");
});

test("the line snaps to quarters, counts once let go and stands once right; Next and Start again", () => {
  assert.equal(snapX(1.13), 1.25);
  assert.equal(snapX(9), X_FAR);
  assert.equal(snapX(-0.1), 0);
  let s = moveLine(SHAPE_READ_START, -1.9, false);
  assert.deepEqual([s.x, s.tried, done(s)], [-2, false, false]);
  s = moveLine(s, -2.05, true);
  assert.ok(done(s));
  assert.equal(moveLine(s, 3, true), s);
  for (let i = 0; i < SHAPE_ROUNDS.length; i++) s = next(s);
  assert.equal(s.round, SHAPE_ROUNDS.length);
  assert.equal(moveLine(s, 1, true), s);
  assert.deepEqual(again(), SHAPE_READ_START);
  for (const r of SHAPE_ROUNDS.slice(1)) assert.notEqual(next({ ...SHAPE_READ_START, round: SHAPE_ROUNDS.indexOf(r) - 1 }).x, r.target, "a round starts away from its answer");
});

test("the words are there in every language", () => {
  for (const l of [ka, ru]) assert.deepEqual(Object.keys(l.live.shapeRead).sort(), Object.keys(en.live.shapeRead).sort());
  for (let i = 0; i < SHAPE_ROUNDS.length; i++) assert.ok(en.live.shapeRead[`ask${i}` as "ask0"] && en.live.shapeRead[`done${i}` as "done0"]);
});
