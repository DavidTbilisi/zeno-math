// Integer counters: zero pairs cancel and leave the value; every sum walked through ends on its answer; chips dropped
// anywhere line up, land on each other and are followed through a sum done by hand.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answer, cancelPairs, CHIP_CAP, CHIP_R, counterState, COUNTERS_START, freeColumn, freeSpot, keepOn, landsOn, MAT, matOf,
  NUM_RANGE, onMat, pairs, put, slots, stackedPairs, sumSteps, sumText, taskStep, tidy, toMat, value, type MatChip,
} from "../src/math/counters.ts";

test("zero pairs cancel and the value stays", () => {
  const m = { pos: 3, neg: 5 };
  assert.equal(pairs(m), 3);
  assert.deepEqual(cancelPairs(m), { pos: 0, neg: 2 });
  assert.equal(value(cancelPairs(m)), value(m));
  assert.deepEqual(put({ pos: CHIP_CAP, neg: 0 }, false), { pos: CHIP_CAP, neg: 0 });
});

test("the chips of a pair sit one above the other; the ones left over keep their place", () => {
  assert.deepEqual(slots({ pos: 3, neg: 5 }), { pos: [2, 3, 4], neg: [0, 1, 2, 3, 4], paired: 3 });
  assert.deepEqual(slots({ pos: 2, neg: 0 }), { pos: [0, 1], neg: [], paired: 0 });
  // After the pairs go, the two − left are still in slots 0 and 1.
  assert.deepEqual(slots(cancelPairs({ pos: 3, neg: 5 })).neg, [0, 1]);
});

test("the steps of a sum", () => {
  assert.deepEqual(sumSteps(3, "add", -5).map((s) => s.kind), ["start", "put", "cancel", "answer"]);
  // 2 − 5: too few + to take 5 away, so 3 zero pairs first; then 3 − are left.
  const sub = sumSteps(2, "sub", 5);
  assert.deepEqual(sub.map((s) => s.kind), ["start", "zeroPairs", "take", "answer"]);
  assert.deepEqual(sub[1], { kind: "zeroPairs", n: 3, take: 5, negative: false, mat: { pos: 5, neg: 3 } });
  assert.deepEqual(sub.at(-1)!.mat, { pos: 0, neg: 3 });
  // 2 − (−4): 4 zero pairs, take the 4 − away, 6 + left.
  assert.deepEqual(sumSteps(2, "sub", -4).at(-1)!.mat, { pos: 6, neg: 0 });
  assert.deepEqual(sumSteps(4, "add", 0).map((s) => s.kind), ["start", "answer"]);
  assert.equal(sumText(2, "sub", -4), "2 − (−4)");
  assert.equal(sumText(-3, "add", 5), "−3 + 5");
});

test("every sum in range ends on its answer with no pairs left and never over the cap", () => {
  for (let a = NUM_RANGE[0]; a <= NUM_RANGE[1]; a++)
    for (let b = NUM_RANGE[0]; b <= NUM_RANGE[1]; b++)
      for (const op of ["add", "sub"] as const) {
        const steps = sumSteps(a, op, b);
        const end = steps.at(-1)!.mat;
        assert.equal(value(end), answer(a, op, b), `${a} ${op} ${b}`);
        assert.equal(pairs(end), 0);
        for (const s of steps) assert.ok(s.mat.pos <= CHIP_CAP && s.mat.neg <= CHIP_CAP && s.mat.pos >= 0 && s.mat.neg >= 0);
      }
});

const chip = (id: number, x: number, y: number, neg: boolean): MatChip => ({ id, x, y, neg });

test("lined up, each + of a pair sits over its − and is seen as a pair; the fresh mat is 3 + (−5)", () => {
  const start = COUNTERS_START.chips;
  assert.deepEqual(matOf(start), { pos: 3, neg: 5 });
  assert.equal(stackedPairs(start).length, 3);
  assert.ok(start.every((c) => onMat(c.x, c.y)));
  // Tidy keeps the ids, and is the same however the chips lay.
  const messy = start.map((c, i) => ({ ...c, x: 200 + 37 * i, y: 100 + (i % 3) * 50 }));
  assert.deepEqual(tidy(messy), start);
  // Every count up to the cap lines up on the mat with no two chips in one place.
  const full = tidy([...Array(CHIP_CAP)].flatMap((_, i) => [chip(2 * i, 0, 0, false), chip(2 * i + 1, 0, 0, true)]));
  assert.ok(full.every((c) => onMat(c.x, c.y) && onMat(c.x - CHIP_R, c.y - CHIP_R) && onMat(c.x + CHIP_R, c.y + CHIP_R)));
  assert.equal(new Set(full.map((c) => `${c.x},${c.y}`)).size, full.length);
  assert.equal(stackedPairs(full).length, CHIP_CAP);
});

test("a chip dropped on one of the other sign lands on it; taps fill the first free places", () => {
  const chips = [chip(0, 200, 150, false), chip(1, 260, 150, true), chip(2, 205, 160, true)];
  assert.equal(landsOn(chips, 204, 152, true)?.id, 0, "a − dropped on the +");
  assert.equal(landsOn(chips, 204, 152, false)?.id, 2, "a + dropped there lands on the nearer −");
  assert.equal(landsOn(chips, 204, 152, false, [2])?.id, undefined, "the − near it is taken, the other too far");
  assert.equal(landsOn(chips, 400, 300, true), null);
  const s = freeSpot(COUNTERS_START.chips, false)!;
  assert.ok(!COUNTERS_START.chips.some((c) => c.x === s.x && c.y === s.y));
  const col = freeColumn(COUNTERS_START.chips)!;
  assert.equal(col.p.x, col.m.x);
  const withPair = [...COUNTERS_START.chips, chip(8, col.p.x, col.p.y, false), chip(9, col.m.x, col.m.y, true)];
  assert.equal(stackedPairs(withPair).length, 4);
  assert.deepEqual(keepOn(-50, 9999), { x: MAT.x + CHIP_R + 2, y: MAT.y + MAT.h - CHIP_R - 2 });
});

test("a sum done by hand is followed step by step, however the chips get there", () => {
  // 3 + (−5): start, put, cancel, answer.
  const go = (at: number, pos: number, neg: number) => taskStep(3, "add", -5, at, { pos, neg });
  assert.equal(go(0, 0, 0), 0);
  assert.equal(go(0, 2, 0), 0);
  assert.equal(go(0, 3, 0), 1, "a is out");
  assert.equal(go(1, 3, 4), 1);
  assert.equal(go(1, 3, 5), 2, "b is out");
  assert.equal(go(2, 1, 3), 2, "pairs cancelling");
  assert.equal(go(2, 0, 2), 3, "the answer");
  // −1 chips dropped on the + as they go out: the cancel comes with the put.
  assert.equal(go(1, 0, 2), 3);
  // 0 + 4: nothing to put out first.
  assert.equal(taskStep(0, "add", 4, 0, { pos: 0, neg: 0 }), 1);
  // 2 − 5: zero pairs, then take, then the answer.
  assert.equal(taskStep(2, "sub", 5, 0, { pos: 2, neg: 0 }), 1);
  assert.equal(taskStep(2, "sub", 5, 1, { pos: 5, neg: 3 }), 2);
  assert.equal(taskStep(2, "sub", 5, 2, { pos: 0, neg: 3 }), 3);
});

test("Show me makes the mat hold each step, and every sum shown ends on its answer", () => {
  for (const [a, op, b] of [[3, "add", -5], [2, "sub", -4], [-10, "sub", 10], [0, "add", 0]] as const) {
    const steps = sumSteps(a, op, b);
    let chips: MatChip[] = [];
    let next = 0;
    let at = taskStep(a, op, b, 0, { pos: 0, neg: 0 });
    while (at < steps.length - 1) {
      const r = toMat(chips, steps[at].mat, next);
      assert.deepEqual(matOf(r.chips), steps[at].mat);
      assert.equal(new Set(r.chips.map((c) => c.id)).size, r.chips.length, "ids stay distinct");
      [chips, next] = [r.chips, r.next];
      const was = at;
      at = taskStep(a, op, b, at, matOf(chips));
      assert.ok(at > was);
    }
    assert.equal(value(matOf(chips)), answer(a, op, b));
  }
});

test("a mat saved as counts comes back as chips", () => {
  const s = counterState({ pos: 2, neg: 4, a: 1, op: "sub", b: 3, step: 2 } as never);
  assert.deepEqual(matOf(s.chips), { pos: 2, neg: 4 });
  assert.equal(s.next, 6);
  assert.equal(s.task, null);
  assert.equal(s.op, "sub");
  assert.equal(counterState(COUNTERS_START), COUNTERS_START);
});
