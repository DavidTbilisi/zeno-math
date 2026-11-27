// The counting principle as a tree of outfits (#738): the tree is grown branch by branch until every outfit is made,
// the predictions offer the right count beside the added and the short one, and "multiply" is said only once the learner
// has predicted a count right.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { again, COUNT_ROUNDS, COUNT_TREE_START, done, type LiveCountTree, made, missOf, next, openAt, pathsTo, pickCount, shown, slot, total } from "../src/math/countTree.ts";

test("a build round is done once every branch before the last stage is open, one tap per branch", () => {
  let s: LiveCountTree = COUNT_TREE_START;
  assert.equal(shown(s, "1"), true);
  assert.equal(shown(s, "1.0"), false);
  assert.equal(openAt(s, "1.0"), s);
  for (const p of ["0", "1"]) s = openAt(s, p);
  assert.equal(made(s), 4);
  assert.equal(done(s), false);
  assert.equal(openAt(s, "0"), s);
  s = openAt(s, "2");
  assert.equal(made(s), 6);
  assert.equal(done(s), true);
  assert.equal(openAt(s, "2.0"), s);

  s = next(s);
  assert.deepEqual(s, { round: 1, open: [], pick: null });
  for (const p of ["0", "0.0", "0.1", "1", "1.0"]) s = openAt(s, p);
  assert.equal(made(s), 6);
  s = openAt(s, "1.1");
  assert.equal(made(s), total(COUNT_ROUNDS[1].stages));
  assert.equal(done(s), true);
});

test("the tree lays every leaf on its own row, each node in the middle of its leaves", () => {
  const st = [3, 2, 4];
  assert.equal(pathsTo(st, 3).length, 24);
  assert.deepEqual(pathsTo(st, 3).map((p) => slot(st, p)), Array.from({ length: 24 }, (_, i) => i));
  assert.equal(slot(st, [1]), 11.5);
  assert.equal(slot(st, [1, 0]), 9.5);
});

test("a prediction is right only at the product; the sum and a stage left out are named", () => {
  let s: LiveCountTree = { round: 2, open: [], pick: null };
  for (const r of COUNT_ROUNDS.filter((r) => r.mode === "predict")) {
    assert.ok(r.options!.includes(total(r.stages)));
    assert.ok(r.options!.some((v) => missOf(r, v) === "added"));
  }
  assert.equal(missOf(COUNT_ROUNDS[3], 12), "dropped");
  assert.equal(missOf(COUNT_ROUNDS[2], 16), "other");
  s = pickCount(s, 7);
  assert.equal(done(s), false);
  s = pickCount(s, 12);
  assert.equal(done(s), true);
  assert.equal(pickCount(s, 16), s);
  assert.equal(openAt(s, "0"), s);
  s = next(next(s));
  assert.equal(s.round, COUNT_ROUNDS.length);
  assert.equal(done(s), false);
  assert.equal(next(s).round, COUNT_ROUNDS.length);
  assert.deepEqual(again(), COUNT_TREE_START);
});

test("the rule is not said before the first right prediction", () => {
  const w = en.live.countTree;
  for (const t of [w.ask0, w.ask1, w.ask2, w.ask3, w.done0, w.done1, w.miss_added, w.miss_dropped, w.miss_other, w.hint]) assert.doesNotMatch(t, /multipl|×/i, t);
  assert.match(w.rule2, /multiply/);
});
