// The rekenrek: beads move in groups and never change order, the words read the fives and tens, and a sum's two
// steps are ticked by what the beads show.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advance, beadColor, BEADS, cleared, dealTask, dealt, rackCap, rackTotal, REKENREK_START, says, setRow, shownRows, slideBead,
  tapBead, taskAnswer, withBeads, withRows, type LiveRekenrek,
} from "../src/math/rekenrek.ts";

const empty = Array(10).fill(0) as number[];
const rack = (rows: number, ...left: number[]): LiveRekenrek => ({
  ...REKENREK_START, rows, left: [...left, ...empty].slice(0, 10),
});

test("a bead slid left takes the beads on its left; slid back, the ones on its right", () => {
  const left = slideBead(empty, 0, 6, true);
  assert.equal(left[0], 7, "bead 7 and the six before it");
  assert.equal(slideBead(left, 0, 2, true), left, "already on the left: nothing moves");
  assert.equal(slideBead(left, 0, 4, false)[0], 4, "bead 5 goes back with 6 and 7");
  assert.equal(slideBead(left, 0, 8, false), left, "already on the right");
  assert.equal(slideBead(left, 3, 9, true)[3], BEADS);
  assert.equal(slideBead(left, 10, 0, true), left, "no such row");
  assert.equal(slideBead(left, 0, 10, true), left, "no such bead");
});

test("a tap sends a bead across; a row can be set outright", () => {
  const seven = tapBead(empty, 1, 6);
  assert.equal(seven[1], 7);
  assert.equal(tapBead(seven, 1, 6)[1], 6, "the last bead on the left goes back alone");
  assert.equal(tapBead(seven, 1, 0)[1], 0, "the first takes them all");
  assert.equal(setRow(empty, 0, 12)[0], BEADS);
  assert.equal(setRow(seven, 1, -3)[1], 0);
  assert.equal(setRow(seven, 1, 7), seven);
  assert.equal(setRow(seven, 11, 3), seven);
});

test("five and five in a row, swapped in the lower half of the hundred rack", () => {
  assert.deepEqual([0, 4, 5, 9].map((i) => beadColor(0, i)), [0, 0, 1, 1]);
  assert.deepEqual([0, 4, 5, 9].map((i) => beadColor(7, i)), [1, 1, 0, 0]);
});

test("the total counts only the rows the rack shows", () => {
  const s = rack(2, 10, 5, 4);
  assert.deepEqual(shownRows(s), [10, 5]);
  assert.equal(rackTotal(s), 15);
  assert.equal(rackTotal({ ...s, rows: 10 }), 19);
  assert.equal(rackCap(2), 20);
});

test("the words: fives in one row, rows added, tens in the hundred rack, and what is still to come", () => {
  assert.deepEqual(says(rack(1)), [{ kind: "empty" }]);
  assert.deepEqual(says(rack(1, 4)), [{ kind: "count", n: 4 }, { kind: "rest", n: 4, rest: 6, cap: 10 }]);
  assert.deepEqual(says(rack(1, 9)), [{ kind: "fives", more: 4, n: 9 }, { kind: "rest", n: 9, rest: 1, cap: 10 }]);
  assert.deepEqual(says(rack(1, 10)), [{ kind: "fives", more: 5, n: 10 }], "a full rack has nothing to come");
  assert.deepEqual(says(rack(2, 10, 5)), [{ kind: "sum", parts: [10, 5], n: 15 }, { kind: "rest", n: 15, rest: 5, cap: 20 }]);
  assert.deepEqual(says(rack(2, 0, 7))[0], { kind: "fives", more: 2, n: 7 }, "one row in use reads as a row");
  assert.deepEqual(says(rack(10, 10, 10, 10, 7))[0], { kind: "tens", tens: 3, ones: 7, n: 37 });
  assert.deepEqual(says(rack(10, 10, 10, 10))[0], { kind: "tens", tens: 3, ones: 0, n: 30 });
  assert.deepEqual(says(rack(10, 3, 3, 3))[0], { kind: "sum", parts: [3, 3, 3], n: 9 }, "no full row: added");
  assert.equal(says(rack(10, ...Array(10).fill(10))).length, 1);
});

test("a dealt sum fits the rack, with both numbers at least 1, and is the same for the same seed", () => {
  const ops = new Set<string>();
  for (const rows of [1, 2, 10]) {
    for (let seed = 1; seed <= 200; seed++) {
      const t = dealTask(rows, seed);
      ops.add(t.op);
      assert.ok(t.a >= 1 && t.b >= 1, `${t.a} ${t.op} ${t.b}`);
      assert.ok(taskAnswer(t) >= 1 && Math.max(t.a, taskAnswer(t)) <= rackCap(rows), `${t.a} ${t.op} ${t.b} on ${rows}`);
      assert.deepEqual(dealTask(rows, seed), t);
    }
  }
  assert.deepEqual([...ops].sort(), ["+", "−"]);
});

test("a sum is done in two steps: its first number, then its answer", () => {
  const task = { a: 15, b: 8, op: "−" } as const;
  assert.equal(advance(null, 1, 3), 0);
  assert.equal(advance(task, 0, 7), 0, "the answer before the first number does not count");
  assert.equal(advance(task, 0, 15), 1);
  assert.equal(advance(task, 1, 9), 1);
  assert.equal(advance(task, 1, 7), 2);
  assert.equal(advance(task, 2, 0), 2, "done stays done");
  assert.equal(taskAnswer({ a: 5, b: 4, op: "+" }), 9);

  let s: LiveRekenrek = { ...rack(2), task, stage: 0 };
  assert.equal(withBeads(s, s.left), s);
  s = withBeads(s, setRow(s.left, 0, 10));
  assert.equal(s.stage, 0);
  s = withBeads(s, setRow(s.left, 1, 5));
  assert.equal(s.stage, 1);
  s = withBeads(s, setRow(setRow(s.left, 1, 0), 0, 7));
  assert.equal(s.stage, 2);
});

test("the die clears the rack for a new sum; another rack keeps a sum only if it fits", () => {
  const d = dealt(rack(2, 10, 5));
  assert.equal(d.seed, REKENREK_START.seed + 1);
  assert.deepEqual(d.task, dealTask(2, d.seed));
  assert.equal(rackTotal(d), 0);
  assert.equal(d.stage, 0);

  const big: LiveRekenrek = { ...rack(2, 10, 5), task: { a: 15, b: 8, op: "−" }, stage: 1 };
  assert.equal(withRows(big, 2), big);
  assert.equal(withRows(big, 3), big, "no rack of three rows");
  const one = withRows(big, 1);
  assert.equal(one.task, null, "15 has no room on ten beads");
  assert.equal(one.stage, 0);
  const hundred = withRows(big, 10);
  assert.deepEqual(hundred.task, big.task);
  assert.equal(hundred.stage, 1, "the rack still shows 15");
  const small = withRows({ ...rack(2, 3), task: { a: 5, b: 4, op: "+" }, stage: 0 }, 1);
  assert.deepEqual(small.task, { a: 5, b: 4, op: "+" });

  const back = cleared(big);
  assert.equal(rackTotal(back), 0);
  assert.equal(back.stage, 0);
  assert.deepEqual(back.task, big.task);
});
