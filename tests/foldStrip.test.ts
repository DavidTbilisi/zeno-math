// Fold to equal: every task is reachable within the strip's most pieces, folds keep the amount, unfolding only goes
// where a crease stays under the shading's end, the trail stops at a move that can't be made, and checks and notices
// follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import type { GameLevel } from "../src/math/ladder.ts";
import { fewestFolds, foldAll, foldNotice, foldNow, foldOnce, foldTask, foldTrail, FOLD_LADDER, judgeFold, MAX_PIECES } from "../src/math/fold.ts";

test("every task starts proper, asks for an equal fraction, and is reachable in a few moves", () => {
  for (const level of [1, 2, 3] as GameLevel[])
    for (let seed = 1; seed <= 300; seed++) {
      const t = foldTask(level, rng(seed));
      assert.ok(t.n > 0 && t.n < t.d && t.d <= MAX_PIECES && t.to <= MAX_PIECES, JSON.stringify(t));
      assert.notEqual(t.to, t.d);
      assert.equal((t.n * t.to) % t.d, 0, `${t.n}/${t.d} has no top over ${t.to}`);
      const best = fewestFolds(t);
      assert.ok(best >= 1 && best <= 4, `${JSON.stringify(t)}: ${best}`);
      if (level === 3) assert.ok(t.d > t.to || best >= 2, "level 3 unfolds first");
    }
});

test("the ladder climbs from folds in two to folds in three to unfolding", () => {
  const tasks = FOLD_LADDER.map((_, stage) => foldNow({ mode: "puzzle", stage, level: 1, seed: 1 })!);
  for (const t of tasks.slice(0, 3)) assert.ok([2, 4].includes(t.to / t.d));
  for (const t of tasks.slice(3, 6)) assert.ok([3, 6].includes(t.to / t.d));
  assert.equal(foldNow({ mode: "free", stage: 0, level: 1, seed: 1 }), null);
});

test("a fold keeps the amount; an unfold needs the shading to end on a crease that stays", () => {
  assert.deepEqual(foldOnce({ n: 2, d: 3 }, 2), { n: 4, d: 6 });
  assert.deepEqual(foldOnce({ n: 2, d: 3 }, 3), { n: 6, d: 9 });
  assert.deepEqual(foldOnce({ n: 6, d: 8 }, -2), { n: 3, d: 4 });
  assert.equal(foldOnce({ n: 3, d: 4 }, -2), null);
  assert.equal(foldOnce({ n: 3, d: 8 }, -2), null);
  assert.equal(foldOnce({ n: 1, d: 30 }, 2), null);
  assert.deepEqual(foldAll(6, 8, [-2, 3]), { n: 9, d: 12 });
  assert.deepEqual(foldTrail({ n: 1, d: 2 }, [2, -3, 2]), [{ n: 1, d: 2 }, { n: 2, d: 4 }]);
});

test("a check wants the asked-for pieces, then the top they show", () => {
  const t = { n: 2, d: 3, to: 12 };
  assert.equal(judgeFold(t, { path: [2], top: 4 }), "pieces");
  assert.equal(judgeFold(t, { path: [2, 2], top: 7 }), "top");
  assert.equal(judgeFold(t, { path: [2, 2], top: 8 }), null);
  assert.equal(judgeFold(t, { path: [3, 2, 2, -3], top: 8 }), null);
});

test("notices: simplified, the fewest moves, a fold in three, ten in a row", () => {
  assert.equal(foldNotice({ n: 6, d: 8, to: 4 }, { path: [-2] }, 1), "simplified");
  assert.equal(foldNotice({ n: 2, d: 3, to: 12 }, { path: [2, 2] }, 1), "fewest");
  assert.equal(foldNotice({ n: 2, d: 3, to: 12 }, { path: [2, 2, 3, -3] }, 1), "tripled");
  assert.equal(foldNotice({ n: 1, d: 2, to: 4 }, { path: [2] }, 1), null);
  assert.equal(foldNotice({ n: 1, d: 2, to: 4 }, { path: [2] }, 10), "streak10");
});
