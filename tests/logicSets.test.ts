// Logic and sets: the equivalences offered are right (and the others aren't), the slips give other columns, the
// relations made have or lack their property by one pair, the kinds of function are read right, the listings of ℤ
// and ℕ × ℕ are one-to-one, Cantor's sequence differs from every one listed, and the induction proofs line up in
// every language.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import {
  breaks,
  closeUnder,
  column,
  covers,
  EQUIVALENCES,
  extremes,
  intAtPlace,
  kindOf,
  MAP_RULES,
  placeOfInt,
  placeOfPair,
  QUANT_ORDERS,
  REL_PROPS,
  sameColumn,
  TABLE_FORMULAS,
  truth,
  imp,
  P,
  Q,
} from "../src/math/logicSets.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";
import { rngOf } from "../src/math/practiceKit.ts";
import { INDUCTION, INDUCTION_FLAWS } from "../src/math/proofs.ts";
import { relationWith } from "../src/math/skills/relations.ts";
import { setOf, UNIVERSE, venn } from "../src/math/skills/sets.ts";

const w = en.pracWords;

test("P → Q is false only when P is true and Q false; the slips read it, and or, otherwise", () => {
  assert.deepEqual(column(imp(P, Q)), [1, 0, 1, 1]);
  assert.deepEqual(column(imp(P, Q), "vacuous"), [1, 0, 0, 0]);
  assert.equal(truth({ op: "or", a: P, b: Q }, true, true, "exclusive"), false);
  // Every table question has a column a slip changes, or none to name.
  for (const f of TABLE_FORMULAS) assert.equal(column(f).length, 4);
});

test("the statement offered as the same means the same, and none of the others do", () => {
  for (const e of EQUIVALENCES) {
    assert.ok(sameColumn(e.given, e.right));
    for (const o of e.others) assert.ok(!sameColumn(e.given, o.f), JSON.stringify(o.f));
  }
});

test("a quantifier order and its swap: the swapped answer differs exactly where a trap is offered", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const ex = exercise("quantifiers", 3, seed, w);
    if (ex.answer.k !== "pick" || ex.answer.options.length !== 2) continue;
    const o = QUANT_ORDERS.find((q) => q.tex === ex.q || q.swapped === ex.q)!;
    assert.equal((ex.answer.traps ?? []).length > 0, o.truth !== o.swappedTruth);
  }
});

test("a relation made to have a property has it; one made to lack it lacks it by a pair, named", () => {
  for (const prop of REL_PROPS)
    for (const n of [3, 4])
      for (let seed = 1; seed <= 40; seed++) {
        const r = rngOf(seed);
        assert.equal(breaks(closeUnder([[1, 2], [2, 3]], n, prop), n, prop), null);
        assert.equal(breaks(relationWith(r, n, prop, true), n, prop), null);
        assert.notEqual(breaks(relationWith(r, n, prop, false), n, prop), null);
      }
  assert.deepEqual(breaks([[1, 2], [2, 3]], 3, "transitive"), [1, 2, 3]);
  assert.deepEqual(breaks([[1, 1], [2, 2]], 3, "reflexive"), [3]);
});

test("minimal and maximal under divides, and the lines of the Hasse diagram", () => {
  const S = [2, 3, 4, 6, 9, 12];
  assert.deepEqual(extremes(S, "min"), [2, 3]);
  assert.deepEqual(extremes(S, "max"), [9, 12]);
  assert.ok(!covers(S).some(([a, b]) => a === 2 && b === 12), "2 | 12 goes through 4 or 6");
});

test("the kind of a function: arrows and rules", () => {
  assert.equal(kindOf([0, 1, 2], 3), "bij");
  assert.equal(kindOf([0, 1, 2], 4), "injOnly");
  assert.equal(kindOf([0, 1, 1, 2], 3), "surjOnly");
  assert.equal(kindOf([0, 0, 1], 3), "neither");
  // A rule's mistakes name what shows it: a missed value when it isn't surjective, two that meet when it isn't injective.
  for (const m of MAP_RULES) {
    if (m.kind === "injOnly" || m.kind === "neither") assert.ok(m.missed, m.tex);
    if (m.kind === "surjOnly" || m.kind === "neither") assert.ok(m.shared, m.tex);
  }
});

test("the Venn sets: every part is filled, and the set asked for is never empty", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const { A, B } = venn(rngOf(seed));
    for (const op of ["union", "inter", "diffAB", "diffBA", "compA"] as const) assert.ok(setOf(op, A, B).length > 0);
    assert.ok(UNIVERSE.some((x) => !A.includes(x) && !B.includes(x)));
  }
});

test("ℤ listed 0, 1, −1, 2, −2, …, and the pairs along the diagonals, each in one place", () => {
  for (let n = 1; n <= 50; n++) assert.equal(placeOfInt(intAtPlace(n)), n);
  assert.deepEqual([1, 2, 3, 4, 5].map(intAtPlace), [0, 1, -1, 2, -2]);
  const places = new Set<number>();
  for (let a = 1; a <= 6; a++) for (let b = 1; a + b <= 7; b++) places.add(placeOfPair(a, b));
  assert.deepEqual([...places].sort((x, y) => x - y), Array.from({ length: 21 }, (_, i) => i + 1));
  assert.deepEqual([placeOfPair(1, 1), placeOfPair(1, 2), placeOfPair(2, 1), placeOfPair(1, 3)], [1, 2, 3, 4]);
});

test("Cantor's sequence differs from the k-th sequence in its k-th digit", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const ex = exercise("cardinality", 3, seed, w);
    if (ex.answer.k !== "tuple") throw new Error(ex.answer.k);
    const right = ex.answer.vs;
    for (const t of ex.answer.traps ?? []) assert.notDeepEqual(t.a.k === "tuple" && t.a.vs, right);
  }
});

test("set answers are listed: one of the wrong length is wrong, not sent back with the count", () => {
  const ex = exercise("sets", 1, 7, w);
  const v = check(ex, "1", w);
  assert.equal(v.ok, false);
  assert.equal(v.why, undefined);
});

test("the induction proofs: a reason for each line, in every language", () => {
  for (const L of [en, ka, ru]) {
    const W = L.pracWords.proofs;
    for (const [id, p] of Object.entries(INDUCTION)) assert.equal(W.induction[id as keyof typeof INDUCTION].lines.length, p.reasons.length, id);
    for (const [id, f] of Object.entries(INDUCTION_FLAWS)) assert.equal(W.inductionFlaws[id as keyof typeof INDUCTION_FLAWS].lines.length, f.lines, id);
  }
});

test("every level of every new skill accepts its answer in every language", () => {
  for (const L of [en, ka, ru])
    for (const skill of ["logic", "quantifiers", "sets", "mappings", "relations", "induction", "cardinality"] as const)
      for (const level of LEVELS)
        for (let seed = 1; seed <= 30; seed++) {
          const ex = exercise(skill, level, seed, L.pracWords);
          assert.deepEqual(check(ex, ex.plain, L.pracWords), { ok: true }, `${skill} ${level} #${seed}: ${ex.plain}`);
        }
});
