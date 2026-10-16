// Make the target: sums are read as they are typed (× x · ÷, brackets, "= 24" at the end), worked out exactly in
// fractions with × and ÷ first; only the cards may be used, each at most once (all of them when asked), with the
// level's signs; a sum that hits the target only from left to right is named; every puzzle can be made, two ways that
// differ only in order are one way, and the board's stars, hint and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, preview } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import {
  addPiece,
  canonical,
  dropPiece,
  firstStep,
  judgeTarget,
  leftToRight,
  parseSum,
  piecesText,
  sumSource,
  sumText,
  sumValue,
  TARGET_LADDER,
  targetNotice,
  targetNow,
  targetPuzzle,
  targetStars,
  tokens,
  valueOf,
  type Piece,
} from "../src/math/target.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const v = (s: string) => valueOf(parseSum(s)!);

test("sums are read as typed and worked out exactly, × and ÷ first", () => {
  assert.deepEqual(v("3 + 4 * 5"), [23, 1]);
  assert.deepEqual(v("(3 + 4) × 5"), [35, 1]);
  assert.deepEqual(v("8 ÷ 3 x 6"), [16, 1]);
  assert.deepEqual(v("10 − 2 · 3"), [4, 1]);
  assert.deepEqual(v("1 / 3 + 1 / 6"), [1, 2]);
  assert.deepEqual(v("12 - 9 - 1"), [2, 1], "minus is worked from the left");
  assert.deepEqual(v("2 * (3 + 4) = 14"), [14, 1], "what it makes, at the end, is left off");
  assert.equal(valueOf(parseSum("4 / (2 - 2)")!), null);
  for (const bad of ["", "3 +", "(3 + 4", "3 + 4)", "3 4", "3 + a", "+ 3"]) assert.equal(parseSum(bad), null, bad);
  assert.equal(tokens("3 ^ 2"), null);
  assert.deepEqual(leftToRight("3 + 4 * 5"), [35, 1]);
  assert.equal(leftToRight("(3 + 4) * 5"), null);
  assert.equal(leftToRight("3 +"), null);
});

test("only the cards, each at most once, all when asked, with the level's signs; a left-to-right slip is named", () => {
  const p = { cards: [3, 4, 5, 2], target: 35, ops: ["+", "-", "*"] as ("+" | "-" | "*" | "/")[], all: false };
  assert.deepEqual(judgeTarget(p, "(3 + 4) × 5"), { ok: true });
  assert.deepEqual(judgeTarget(p, "3 + 3"), { ok: false, problem: "other" });
  assert.deepEqual(judgeTarget(p, "7 × 5"), { ok: false, problem: "other" });
  assert.deepEqual(judgeTarget(p, "(3 + 4) ÷ 5"), { ok: false, problem: "op" });
  assert.deepEqual(judgeTarget(p, "three"), { ok: false, problem: "unreadable" });
  assert.deepEqual(judgeTarget({ ...p, all: true }, "(3 + 4) × 5"), { ok: false, problem: "notAll" });
  assert.deepEqual(judgeTarget({ ...p, ops: ["/"] }, "3 / (4 / 2 / 5 / 3)"), { ok: false, problem: "other" });
  assert.deepEqual(judgeTarget({ cards: [4, 2, 2], target: 1, ops: ["/", "-"], all: false }, "4 / (2 - 2)"), { ok: false, problem: "divZero" });
  assert.deepEqual(judgeTarget(p, "3 + 4 × 5"), { ok: false, makes: [23, 1], leftToRight: true });
  assert.deepEqual(judgeTarget(p, "3 × 4 + 5"), { ok: false, makes: [17, 1], leftToRight: false });
  // In practice: the slip named with the order-of-operations mistake, any other sum told what it makes.
  const ex = exercise("makeTarget", 2, 1, w);
  if (ex.answer.k !== "target") throw new Error();
  const slip = { ...ex, answer: { ...ex.answer, puzzle: p } };
  assert.equal(check(slip, "3 + 4 × 5", w).mistake, "leftToRight");
  assert.equal(check(slip, "3 × 4 + 5", w).hint, "That makes 17, not 35.");
  assert.equal(check(slip, "3 + 3", w).why, w.reasons.target.other);
  assert.equal(check(slip, "5 ÷ 5", w).why, w.reasons.target.other);
  assert.equal(check({ ...slip, answer: { ...slip.answer, puzzle: { ...p, ops: ["+"] } } }, "3 × 4", w).why, "Only + can be used here.");
});

test("every puzzle can be made from its own cards, with a whole target in range that isn't just a card", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 200; seed++) {
      const p = targetPuzzle(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${p.cards.join(",")} → ${p.target} by ${p.sample}`;
      assert.deepEqual(judgeTarget(p, p.sample), { ok: true }, where);
      assert.equal(p.cards.length, level === 1 ? 3 : 4, where);
      assert.ok(!p.cards.includes(p.target), where);
      assert.ok(p.target >= (level === 1 ? 3 : 10) && p.target <= (level === 1 ? 20 : level === 2 ? 60 : 100), where);
      assert.equal(p.all, level === 3, where);
      const ex = exercise("makeTarget", level, seed, w);
      assert.deepEqual(check(ex, ex.plain, w), { ok: true }, where);
    }
});

test("sums are written with × ÷ and a true minus, brackets only where needed; the preview says what a sum makes", () => {
  for (const [src, out] of [["(3 + 4) * 5", "(3 + 4) × 5"], ["3 + 4 * 5", "3 + 4 × 5"], ["12 - (9 - 1)", "12 − (9 − 1)"], ["12 - 9 - 1", "12 − 9 − 1"], ["8 / (4 / 2)", "8 ÷ (4 ÷ 2)"], ["(8 * 2) / 4", "8 × 2 ÷ 4"]])
    assert.equal(sumText(parseSum(src)!), out, src);
  const ex = exercise("makeTarget", 2, 3, w);
  assert.equal(preview(ex, "(3 + 4) * 5"), "(3 + 4) \\times 5 = 35");
  assert.equal(preview(ex, "1 / 3"), "1 \\div 3 = \\frac{1}{3}");
  assert.equal(preview(ex, "3 +"), null);
  assert.equal(preview(ex, "4 / (2 - 2)"), "4 \\div (2 - 2)");
});

test("two ways count as one when they differ only in order", () => {
  const c = (s: string) => canonical(parseSum(s)!);
  assert.equal(c("3 + 4"), c("4 + 3"));
  assert.equal(c("(3 + 4) × 5"), c("5 × (4 + 3)"));
  assert.equal(c("12 - 9 + 1"), c("1 + 12 - 9"));
  assert.equal(c("a".length ? "2 × 3 × 4" : ""), c("4 × (3 × 2)"));
  assert.notEqual(c("12 - 9 + 1"), c("12 - (9 + 1)"));
  assert.notEqual(c("8 ÷ 4 × 2"), c("8 ÷ (4 × 2)"));
  assert.notEqual(c("3 × 4 + 5"), c("3 × (4 + 5)"));
});

test("the board: stars, the hint's first step, the sum being built, the notices", () => {
  assert.deepEqual([targetStars(0, false), targetStars(1, false), targetStars(2, false), targetStars(1, true), targetStars(3, true)], [0, 2, 3, 1, 1]);
  assert.equal(firstStep("9 + 1 × (12 − 1)"), "12 − 1");
  assert.equal(firstStep("(3 + 4) × 5"), "3 + 4");
  assert.equal(firstStep("9 + 1"), "9 + 1");
  const cards = [3, 4, 5];
  const sum: Piece[] = [{ paren: "(" }, { card: 0 }, { op: "+" }, { card: 1 }, { paren: ")" }, { op: "*" }, { card: 2 }];
  assert.equal(piecesText(sum, cards), "( 3 + 4 ) × 5");
  assert.equal(sumSource(sum, cards), "( 3 + 4 ) * 5");
  assert.deepEqual(sumValue(sum, cards), [35, 1]);
  assert.equal(sumValue(sum.slice(0, 3), cards), null);
  TARGET_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(targetNow({ mode: "puzzle", stage, level: 1, seed: 0 }), targetPuzzle(level, rng(seed))));
  assert.deepEqual(targetNow({ mode: "endless", stage: 0, level: 2, seed: 9 }), targetPuzzle(2, rng(9)));
  const p = { level: 2 as const, cards: [3, 4, 5, 2], target: 35, ops: ["+" as const, "*" as const], all: false, sample: "(3 + 4) × 5" };
  assert.equal(targetNotice(p, "(3 + 4) × 5", 2, 60000, 0), "twoWays");
  assert.equal(targetNotice(p, "3 + 4 × 5 + 2", 1, 60000, 0), "allCards");
  assert.equal(targetNotice({ ...p, all: true }, "3 + 4 + 5 + 2", 1, 60000, 0), null);
  assert.equal(targetNotice(p, "(3 + 4) × 5", 1, 60000, 10), "streak10");
  assert.equal(targetNotice(p, "(3 + 4) × 5", 1, 9000, 1), "speedy");
  assert.equal(targetNotice(p, "(3 + 4) × 5", 1, 60000, 1), null);
});

test("the buttons type a sum with spaces, and take its last piece back", () => {
  let s = "";
  for (const piece of ["(", "3", "+", "4", ")", "×", "12"]) s = addPiece(s, piece);
  assert.equal(s, "(3 + 4) × 12");
  assert.equal(dropPiece(s), "(3 + 4) ×");
  assert.equal(dropPiece("(3 + 4)"), "(3 + 4");
  assert.equal(dropPiece("5"), "");
});

test("the server marks a sum the way the browser does", () => {
  const q = { skill: "makeTarget" as const, level: 3, seed: 7 };
  assert.deepEqual([mark(q, "12 + 9 - 1 * 1"), mark(q, "12 + 9 - 1"), mark(q, "12 + 9 + 1 + 1")], ["correct", "form", "wrong"]);
});
