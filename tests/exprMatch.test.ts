// Equal expressions: every card is what its poly says (checked against the expression parser), every board pairs up
// one way, every question's options are four different expressions with one right; a typed option is read however it
// is spaced; the slips are named; and the board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { evalE, parseE } from "../src/math/expr.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import {
  EXPR_LADDER,
  exprBoard,
  exprNotice,
  exprNow,
  exprQuestion,
  exprStars,
  exprSteps,
  judgePick,
  key,
  plainOf,
  same,
  simplest,
  squash,
  termsText,
  type ExprCard,
} from "../src/math/exprMatch.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const value = (text: string, x: number) => evalE(parseE(plainOf(text)), x);
const equal = (c: ExprCard) => [-2, 1, 3, 7].every((x) => Math.abs(value(c.text, x) - (c.poly[0] + c.poly[1] * x + c.poly[2] * x * x)) < 1e-9);

test("every card is what it says, and every board pairs up one way", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const pairs = exprBoard(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${pairs.map(([a, b]) => `${a.text} = ${b.text}`).join(" | ")}`;
      assert.equal(pairs.length, 4, where);
      for (const [a, b] of pairs) {
        assert.ok(equal(a) && equal(b) && same(a, b), where);
        assert.notEqual(a.text, b.text, where);
        assert.equal(b.text, simplest(b.poly), where);
      }
      assert.equal(new Set(pairs.map(([a]) => key(a.poly))).size, 4, where);
      if (level === 3) assert.ok(pairs.some(([a]) => a.text === "x · x") && pairs.some(([a]) => a.text === "x + x"), where);
    }
});

test("terms written as they are typed and read", () => {
  assert.equal(termsText([[3, 1], [-2, 0]]), "3x − 2");
  assert.equal(termsText([[-1, 1], [4, 0]]), "−x + 4");
  assert.equal(termsText([[1, 2], [2, 1]]), "x² + 2x");
  assert.equal(simplest([0, 0, 0]), "0");
  assert.equal(squash(" 2X^2 −  3 * x "), squash("2x² - 3·x"));
  const t = { options: ["2x + 6", "2x + 3"].map((text) => ({ text, plain: plainOf(text), tex: "" })), right: 0 };
  assert.deepEqual(judgePick(t, "2x+6"), { ok: true });
  assert.deepEqual(judgePick(t, "2x + 3"), { ok: false, picked: 1 });
  assert.deepEqual(judgePick(t, "6 + 2x"), { ok: false, problem: "notOption" });
});

test("every question: four different options, the right one equal to the expression, the slips named", () => {
  const named = new Set<string>();
  for (const level of LEVELS)
    for (let seed = 1; seed <= 200; seed++) {
      const q = exprQuestion(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${q.given.text} → ${q.options.map((o) => o.text).join(", ")}`;
      assert.equal(new Set(q.options.map((o) => squash(o.plain))).size, 4, where);
      for (const x of [2, 5]) assert.ok(Math.abs(value(q.given.text, x) - value(q.options[q.right].text, x)) < 1e-9, where);
      for (const [i, o] of q.options.entries()) if (i !== q.right) assert.ok(Math.abs(value(o.text, 2) - value(q.given.text, 2)) > 1e-9 || Math.abs(value(o.text, 5) - value(q.given.text, 5)) > 1e-9, where);
      assert.match(exprSteps(q)[0], new RegExp(`= ${q.options[q.right].tex.replace(/[\\^+()]/g, "\\$&")}$`), where);
      const ex = exercise("sameExpression", level, seed, w);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, where);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
        named.add(t.id);
      }
    }
  assert.deepEqual([...named].sort(), ["firstTermOnly", "joinedUnlike", "squareAsDouble"]);
  const ex = exercise("sameExpression", 1, 7, w);
  assert.equal(check(ex, "1 + 2x", w).why, "Pick one of the expressions offered: 2x + 1, 3x + 1, 3x, x + 2.");
  const q = { skill: "sameExpression" as const, level: 2, seed: 7 };
  assert.deepEqual([mark(q, "5x - 5"), mark(q, "5x - 1"), mark(q, "5(x-1)")], ["correct", "wrong", "form"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([exprStars(0), exprStars(2), exprStars(3)], [3, 2, 1]);
  assert.equal(exprNotice(1, false, 0, 20), "streak20");
  assert.equal(exprNotice(1, false, 0, 1), null);
  assert.equal(exprNotice(1, true, 1, 1), null);
  assert.deepEqual([exprNotice(1, true, 0, 1), exprNotice(2, true, 0, 1), exprNotice(3, true, 0, 1)], ["clean", "nearMiss", "powers"]);
  EXPR_LADDER.forEach((_, stage) => {
    const cards = exprNow({ mode: "puzzle", stage, level: 1, seed: 0 });
    assert.equal(cards.length, 8);
    assert.ok(cards.every((c) => cards.filter((d) => same(c, d)).length === 2), `stage ${stage}: every card has one partner`);
  });
  assert.equal(exprNow({ mode: "endless", stage: 0, level: 3, seed: 8 }).length, 8);
});
