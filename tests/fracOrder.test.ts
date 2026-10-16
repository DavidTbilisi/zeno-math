// Fractions in order: every task has the level's fractions, apart enough to place, past 1 at hard; lists are read
// however they are written (commas, <, mixed numbers, decimals); biggest first is sent back, unit fractions by their
// bottoms are named; and the board's stars and notices follow the places.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import {
  bottomsOrder,
  itemOf,
  judgeOrder,
  ORDER_LADDER,
  orderNotice,
  orderNow,
  orderStars,
  orderSvg,
  orderTask,
  placedInOrder,
  readItem,
  readOrder,
  renderOrder,
  rightOrder,
} from "../src/math/fracOrder.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every task: the level's fractions, in lowest terms, apart by a twentieth of the line", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = orderTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${t.items.map((i) => i.text).join(", ")}`;
      assert.equal(t.items.length, level === 3 ? 5 : 4, where);
      assert.ok(t.items.every((i) => i.v > 0 && i.v < t.to), where);
      for (const [k, a] of t.items.entries()) for (const b of t.items.slice(k + 1)) assert.ok(Math.abs(a.v - b.v) >= 0.05 * t.to - 1e-9, where);
      if (level === 1) assert.ok(t.items.every((i) => i.n === 1) || new Set(t.items.map((i) => i.d)).size === 1, where);
      if (level === 3) assert.ok(t.items.some((i) => i.v > 1), where);
    }
  assert.ok(Array.from({ length: 60 }, (_, i) => orderTask(3, rng(i + 1))).some((t) => t.items.some((it) => it.text.includes(" "))), "mixed numbers");
});

test("items are written as fractions or mixed numbers; lists are read however they are typed", () => {
  assert.deepEqual([itemOf(5, 4, true).text, itemOf(5, 4, true).tex, itemOf(5, 4).text, itemOf(3, 4, true).text], ["1 1/4", "1\\frac{1}{4}", "5/4", "3/4"]);
  for (const [s, v] of [["3/4", 0.75], [" 1 1/4 ", 1.25], ["0.5", 0.5], ["2", 2], ["3 / 4", 0.75]] as const) assert.equal(readItem(s), v, s);
  for (const bad of ["", "a", "1/0", "1 1/0", "-1/2"]) assert.equal(readItem(bad), null, bad);
  const items = [itemOf(1, 2), itemOf(1, 4), itemOf(3, 4)];
  assert.deepEqual(readOrder(items, "1/4 < 1/2 < 3/4"), { seq: [1, 0, 2] });
  assert.deepEqual(readOrder(items, "0.25; 0.5; 0.75"), { seq: [1, 0, 2] });
  assert.deepEqual(readOrder(items, "1/4, 1/2"), { problem: "count" });
  assert.deepEqual(readOrder(items, "1/4, 1/2, 2/3"), { problem: "other" });
  assert.deepEqual(readOrder(items, "1/4, 1/2, 1/2"), { problem: "other" });
  assert.deepEqual(readOrder(items, "quarter, half"), { problem: "unreadable" });
  assert.deepEqual(judgeOrder(items, rightOrder(items), "1/4, 1/2, 3/4"), { ok: true });
  assert.deepEqual(judgeOrder(items, rightOrder(items), "1/2, 1/4, 3/4"), { ok: false, seq: [0, 1, 2] });
});

test("in practice: biggest first sent back, unit fractions by their bottoms named; the server agrees", () => {
  const ex = exercise("orderFractions", 2, 7, w);
  assert.equal(check(ex, "3/5, 1/2, 3/7, 2/7", w).why, w.reasons.order.reversed);
  assert.equal(check(ex, "2/7, 3/7", w).why, "List all 4 fractions.");
  const unit = Array.from({ length: 100 }, (_, i) => exercise("orderFractions", 1, i + 1, w)).find((e) => trapInputs(e).length)!;
  const [trap] = trapInputs(unit);
  const v = check(unit, trap.input, w);
  assert.equal(v.mistake, "biggerBottom");
  assert.ok(v.hint && !/\{\w+\}/.test(v.hint));
  assert.equal(bottomsOrder([itemOf(2, 5), itemOf(1, 2)]), null);
  const q = { skill: "orderFractions" as const, level: 3, seed: 7 };
  assert.deepEqual([mark(q, "1/9, 4/5, 1 2/5, 1 1/2, 1 2/3"), mark(q, "1/9, 4/5, 3/2, 7/5, 5/3"), mark(q, "5/3, 3/2, 7/5, 4/5, 1/9")], ["correct", "wrong", "form"]);
});

test("the board: in order, close enough for three stars, the notices; the ladder's lines", () => {
  const t = { level: 3 as const, to: 2 as const, items: [itemOf(1, 4), itemOf(9, 10), itemOf(3, 2)] };
  assert.ok(placedInOrder(t.items, [0.2, 0.95, 1.4]));
  assert.ok(!placedInOrder(t.items, [0.2, 1.6, 1.4]));
  assert.equal(orderStars(t, [0.25, 0.9, 1.5]), 3);
  assert.equal(orderStars(t, [0.25, 0.9, 1.75]), 2);
  assert.equal(orderStars(t, [0.25, 1.6, 1.5]), 1);
  assert.equal(orderNotice(t, [0.25, 0.9, 1.5], 1), "sharp");
  assert.equal(orderNotice(t, [0.4, 0.9, 1.55], 1), "pastOne");
  assert.equal(orderNotice({ ...t, items: [itemOf(1, 4), itemOf(9, 10)] }, [0.4, 0.89], 1), "nearOne");
  assert.equal(orderNotice(t, [0.25, 1.6, 1.5], 10), "streak10");
  assert.equal(orderNotice(t, [0.25, 1.6, 1.5], 1), null);
  ORDER_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(orderNow({ mode: "puzzle", stage, level: 1, seed: 0 }), orderTask(level, rng(seed))));
  assert.deepEqual(orderNow({ mode: "endless", stage: 0, level: 2, seed: 3 }), orderTask(2, rng(3)));
});

test("pictures: the line to its end with the fractions in their places", () => {
  const t = orderTask(3, rng(7));
  const pic = orderSvg(t);
  assert.ok(pic.body.includes(">2<") && pic.body.match(/<circle/g)!.length === 5);
  assert.equal(renderOrder({ task: t }, null).height, pic.h);
});
