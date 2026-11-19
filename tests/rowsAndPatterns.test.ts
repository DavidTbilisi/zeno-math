// Ordinal numbers and repeating patterns: the right shape is at the position asked, counted from the side asked; the
// slips (the other end, the other neighbour, the last shape repeated, the different shapes counted, the remainder
// counted from 0) are other answers the checker names; ordinals read in all three languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { indexFrom, itemAt, ordinalQuestion, ordinalText, patternQuestion, sameItem } from "../src/math/rowsAndPatterns.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

test("ordinals in each language", () => {
  const o = en.pracWords.rows.ordinal;
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 40, 52].map((n) => ordinalText(n, o)), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "40th", "52nd"]);
  assert.deepEqual([1, 4, 20].map((n) => ordinalText(n, ka.pracWords.rows.ordinal)), ["პირველი", "მე-4", "მე-20"]);
  assert.deepEqual([1, 4, 20].map((n) => ordinalText(n, ru.pracWords.rows.ordinal)), ["1-я", "4-я", "20-я"]);
});

test("the shape at a position, its position, and the one beside it", () => {
  for (const seed of SEEDS) {
    const a = ordinalQuestion(1, rng(seed));
    if (a.kind !== "which") throw new Error(a.kind);
    assert.equal(a.row[a.n - 1].shape, a.right);
    assert.equal(a.trap?.shape, a.row[a.row.length - a.n].shape);
    assert.notEqual(a.trap?.shape, a.right);
    assert.equal(new Set(a.options).size, 4);
    assert.ok(a.options.includes(a.right) && a.options.includes(a.trap!.shape));

    const b = ordinalQuestion(2, rng(seed));
    if (b.kind !== "position") throw new Error(b.kind);
    assert.equal(b.v, b.side === "left" ? b.at + 1 : b.row.length - b.at);
    assert.equal(b.trap.v + b.v, b.row.length + 1);
    assert.notEqual(b.trap.v, b.v);

    const c = ordinalQuestion(3, rng(seed));
    if (c.kind !== "beside") throw new Error(c.kind);
    const i = indexFrom(c.row.length, c.n, c.side);
    // Before is one earlier in the counting: towards the side counted from.
    const earlier = c.side === "left" ? i - 1 : i + 1;
    const later = c.side === "left" ? i + 1 : i - 1;
    assert.equal(c.right, c.row[c.dir === "before" ? earlier : later].shape);
    assert.equal(c.trap?.shape, c.row[c.dir === "before" ? later : earlier].shape);
    assert.notEqual(c.trap?.shape, c.right);
    assert.equal(new Set(c.options).size, 4);
  }
});

test("what comes next, how long the unit is, and the far shape by the remainder", () => {
  const kinds = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (const seed of SEEDS) {
      const q = patternQuestion(level, rng(seed));
      kinds.add(`${level}${q.kind}${q.by}`);
      if (q.kind === "length") {
        assert.equal(q.v, q.unit.length);
        assert.equal(q.trap?.v, new Set(q.unit.map((x) => `${x.shape}${x.colour}`)).size);
        assert.notEqual(q.trap?.v, q.v);
        continue;
      }
      assert.ok(sameItem(q.right!, itemAt(q.unit, q.n)), `${level} ${seed}`);
      assert.ok(q.options.some((o) => sameItem(o, q.right!)) && q.options.some((o) => sameItem(o, q.trap!.item!)));
      assert.ok(!sameItem(q.trap!.item!, q.right!));
      assert.equal(new Set(q.options.map((x) => `${x.shape}${x.colour}`)).size, q.options.length);
      if (q.kind === "next") assert.equal(q.n, q.shown + 1);
      else assert.ok(q.n > q.shown && (level === 2 ? q.n <= 15 : q.n >= 20));
    }
  for (const k of ["1nextshape", "1nextcolour", "2lengthshape", "2nthshape", "3nthcolour"]) assert.ok(kinds.has(k), k);
});

test("the checker takes the right answer and names every slip", () => {
  const w = en.pracWords;
  const named = new Set<string>();
  for (const skill of ["ordinals", "shapePatterns"] as const)
    for (const level of LEVELS)
      for (const seed of SEEDS.slice(0, 150)) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(check(ex, ex.plain, w).ok, true, `${skill} ${level} ${seed}`);
        for (const t of ex.answer.traps ?? []) {
          const typed = t.a.k === "pick" ? t.a.options[t.a.right].plain : t.a.k === "num" ? String(t.a.v) : "";
          const v = check(ex, typed, w);
          assert.equal(v.mistake, t.id, `${skill} ${level} ${seed} ${typed}`);
          named.add(t.id);
        }
        // The row is drawn.
        assert.ok(ex.pic && ex.pic.svg(0, 0).length > 100);
      }
  assert.deepEqual([...named].sort(), ["distinctNotUnit", "otherEnd", "remainderShift", "repeatedLast", "wrongNeighbour"]);
});

test("the questions read in all three languages, with nothing left unfilled", () => {
  for (const words of [en, ka, ru])
    for (const skill of ["ordinals", "shapePatterns"] as const)
      for (const level of LEVELS)
        for (const seed of SEEDS.slice(0, 30)) {
          const ex = exercise(skill, level, seed, words.pracWords);
          assert.ok(!/[{}]/.test(ex.prompt), ex.prompt);
        }
  assert.equal(exercise("ordinals", 1, 1, ru.pracWords).prompt.startsWith("Какая фигура"), true);
});
