// Equal amounts: every board has groups of the same value and no two groups alike, the cards are dealt in an order
// fixed by the seed, the practice question's four options are different with one equal, its slips are named, and
// the board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { readBench } from "../src/math/benchmark.ts";
import {
  cardOf,
  deal,
  EQ_LADDER,
  eqBoard,
  eqNotice,
  eqNow,
  eqQuestion,
  eqStars,
  groupSize,
  partsSvg,
  same,
} from "../src/math/equivMatch.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every board: groups of one value each, the level's kinds of card, no two groups alike", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 200; seed++) {
      const groups = eqBoard(level, rng(seed));
      const where = `level ${level} seed ${seed}`;
      assert.equal(groups.length, level === 3 ? 3 : 4, where);
      for (const g of groups) {
        assert.equal(g.length, groupSize(level), where);
        assert.ok(g.every((c) => same(c, g[0])), where);
        assert.deepEqual(g.map((c) => c.kind), level === 1 ? ["frac", "pic"] : level === 2 ? ["frac", "frac"] : ["frac", "dec", "pct"], where);
        if (level === 2) assert.ok(g[1].d > g[0].d && g[1].d <= 24, where);
      }
      assert.equal(new Set(groups.map((g) => g[0].v.toFixed(6))).size, groups.length, where);
    }
});

test("cards: written as fractions, decimals and percentages; dealt the same way from the same seed", () => {
  assert.equal(cardOf("dec", 3, 8).text, "0.375");
  assert.equal(cardOf("pct", 3, 8).text, "37.5%");
  assert.equal(cardOf("pct", 3, 4).text, "75%");
  assert.equal(cardOf("frac", 6, 8).text, "6/8");
  const groups = eqBoard(2, rng(4));
  assert.deepEqual(deal(groups, rng(9)), deal(groups, rng(9)));
  assert.equal(deal(groups, rng(9)).length, 8);
  EQ_LADDER.forEach(({ level, seed }, stage) => {
    const next = rng(seed);
    assert.deepEqual(eqNow({ mode: "puzzle", stage, level: 1, seed: 0 }), deal(eqBoard(level, next), next));
  });
  assert.equal(eqNow({ mode: "endless", stage: 0, level: 3, seed: 2 }).length, 9);
  assert.equal(partsSvg(3, 4).match(/<rect/g)!.length, 4);
  assert.equal(partsSvg(3, 4).match(/#4dabf7/g)!.length, 3);
});

test("the practice question: four different amounts, one equal, its slips where they should be", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 200; seed++) {
      const q = eqQuestion(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${q.n}/${q.d}`;
      assert.equal(new Set(q.options.map((o) => o.v.toFixed(6))).size, 4, where);
      assert.ok(Math.abs(q.options[q.right].v - q.n / q.d) < 1e-9, where);
      for (const t of q.traps) assert.notEqual(t.at, q.right, where);
      for (const o of q.options) assert.ok(Math.abs(readBench(o.plain)! - o.v) < 1e-9, `${where}: ${o.plain}`);
    }
  const ids = (level: 1 | 2 | 3) => new Set(Array.from({ length: 100 }, (_, i) => eqQuestion(level, rng(i + 1)).traps.map((t) => t.id)).flat());
  assert.deepEqual([...ids(1)].sort(), ["partToPart", "unshadedPart"]);
  assert.deepEqual([...ids(2)], ["addedToBoth"]);
  assert.deepEqual([...ids(3)], ["fractionDigits"]);
});

test("in practice: the equal one picked, each slip named, a fraction read as a percentage too; the server agrees", () => {
  for (const level of LEVELS) {
    const ex = exercise("equivalent", level, 7, w);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    for (const t of trapInputs(ex)) {
      const v = check(ex, t.input, w);
      assert.equal(v.mistake, t.id);
      assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
    }
  }
  assert.equal(readBench("37.5 %"), 0.375);
  const q = { skill: "equivalent" as const, level: 3, seed: 7 };
  // The answer is read as an amount: typed as the fraction itself it is still the equal one; one not offered is sent back.
  assert.deepEqual([mark(q, "15%"), mark(q, "0.15"), mark(q, "0.32"), mark(q, "3/20"), mark(q, "0.5")], ["correct", "correct", "wrong", "correct", "form"]);
  assert.equal(exercise("equivalent", 1, 7, w).steps![0], "1 + 2 = 3, \\quad \\frac{1}{3}");
});

test("the board: stars from misses, the notices", () => {
  assert.deepEqual([eqStars(0), eqStars(1), eqStars(2), eqStars(3)], [3, 2, 2, 1]);
  assert.equal(eqNotice(1, false, 0, 1000, 20), "streak20");
  assert.equal(eqNotice(1, false, 0, 1000, 3), null);
  assert.equal(eqNotice(3, true, 0, 60000, 3), "threes");
  assert.equal(eqNotice(2, true, 0, 15000, 3), "quick");
  assert.equal(eqNotice(2, true, 0, 60000, 3), "clean");
  assert.equal(eqNotice(2, true, 1, 15000, 3), null);
});
