// Discover trig: every size a triangle can be dragged to has sides of one decimal; only a ratio of two different
// sides stays the same as the triangle grows (sums, differences and products never do), upside down included; a claim
// of another pair is told apart from one that changes; medium's value belongs to a whole angle; hard's four lengths
// are four different positive numbers with the right one the small side grown; and the ladder and notices follow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_LEVELS } from "../src/math/ladder.ts";
import { rng } from "../src/math/random.ts";
import {
  angleOf,
  DISCOVER_LADDER,
  DISCOVER_TRIPLES,
  discoverNotice,
  discoverTask,
  judgeClaim,
  OPS,
  ratioOf,
  reachAnswer,
  reachChoices,
  reachSlip,
  rowSides,
  SIDE_NAMES,
  sidesAt,
  sidesTurned,
  sizeRange,
  steady,
  turnTarget,
  turnValue,
  valueOf,
  type Column,
  type GrowTask,
  type Shape,
} from "../src/math/trigDiscover.ts";

const SHAPES: Shape[] = DISCOVER_TRIPLES.flatMap((triple) => [0, 1].map((across) => ({ triple, across: across as 0 | 1 })));
const tenths = (v: number) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;

test("every size has sides to one decimal, the hypotenuse from 2.5 to 10.5, θ the same", () => {
  for (const s of SHAPES) {
    const [lo, hi] = sizeRange(s);
    assert.ok(hi - lo >= 4, `at least five sizes for ${s.triple}`);
    for (let n = lo; n <= hi; n++) {
      const x = sidesAt(s, n);
      assert.ok(SIDE_NAMES.every((k) => tenths(x[k])));
      assert.ok(x.hyp >= 2.5 && x.hyp <= 10.5);
      assert.ok(Math.abs(x.opp ** 2 + x.adj ** 2 - x.hyp ** 2) < 1e-9);
    }
  }
  assert.deepEqual(SHAPES.map(angleOf), [37, 53, 23, 67, 28, 62]);
});

test("only a ratio of two different sides stays the same as the triangle grows", () => {
  for (const s of SHAPES) {
    const [lo, hi] = sizeRange(s);
    const rows = [lo, lo + 2, hi].map((n) => sidesAt(s, n));
    for (const a of SIDE_NAMES)
      for (const b of SIDE_NAMES) {
        if (a === b) continue;
        for (const op of OPS) assert.equal(steady({ a, op, b }, rows), op === "÷", `${a} ${op} ${b}`);
      }
  }
  assert.equal(steady({ a: "opp", op: "÷", b: "hyp" }, rowSides(DISCOVER_LADDER[0], [8])), false, "one row proves nothing");
  assert.deepEqual(ratioOf({ a: "opp", op: "÷", b: "hyp" }), { r: "sin", flip: false });
  assert.deepEqual(ratioOf({ a: "hyp", op: "÷", b: "adj" }), { r: "cos", flip: true });
  assert.deepEqual(ratioOf({ a: "adj", op: "÷", b: "opp" }), { r: "tan", flip: true });
  assert.equal(ratioOf({ a: "opp", op: "×", b: "adj" }), null);
});

test("a claim is right, true of another pair, or changing", () => {
  const t = DISCOVER_LADDER[1] as GrowTask;
  assert.deepEqual(t.goal, ["adj", "hyp"]);
  const rows = rowSides(t, [2, 4, 7]);
  const claim = (c: Column) => judgeClaim(t, c, rows);
  assert.equal(claim({ a: "adj", op: "÷", b: "hyp" }), "right");
  assert.equal(claim({ a: "hyp", op: "÷", b: "adj" }), "right");
  assert.equal(claim({ a: "opp", op: "÷", b: "hyp" }), "otherPair");
  assert.equal(claim({ a: "adj", op: "−", b: "hyp" }), "changes");
  // The first puzzle takes any ratio.
  const any = DISCOVER_LADDER[0] as GrowTask;
  assert.equal(judgeClaim(any, { a: "opp", op: "÷", b: "adj" }, rowSides(any, [5, 9, 14])), "right");
  // 4 ÷ 5 at every size of 3-4-5 with θ by the 4.
  assert.equal(valueOf({ a: "adj", op: "÷", b: "hyp" }, sidesAt(any.shape, 13)), 0.8);
});

test("medium's value belongs to one whole angle, and the start is well away from it", () => {
  const turns = [...DISCOVER_LADDER, ...Array.from({ length: 200 }, (_, i) => discoverTask(2, rng(i + 1)))].filter((t) => t.level === 2);
  for (const t of turns) {
    const at = turnTarget(t);
    assert.equal(turnValue(t.ratio, at), t.value, `${t.ratio} ${t.value}`);
    assert.ok(Math.abs(t.start - at) >= 10, `${t.ratio} ${t.value} from ${t.start}`);
    assert.ok(at >= 5 && at <= 85);
  }
  assert.deepEqual(DISCOVER_LADDER.filter((t) => t.level === 2).map((t) => t.level === 2 && turnTarget(t)), [30, 60, 45]);
  assert.deepEqual(sidesTurned(30), { opp: 5, adj: 8.66, hyp: 10 });
});

test("hard offers four different lengths, the right one the small side grown, each wrong one named", () => {
  const reaches = [...DISCOVER_LADDER, ...Array.from({ length: 200 }, (_, i) => discoverTask(3, rng(i + 1)))].filter((t) => t.level === 3);
  for (const t of reaches) {
    assert.equal(new Set(t.choices).size, 4);
    assert.ok(t.choices.every((v) => v > 0));
    assert.equal(reachAnswer(t), Math.round(sidesAt(t.shape, 10)[t.want] * t.times * 100) / 100);
    assert.deepEqual([...t.choices].sort(), reachChoices(t).map((c) => c.v).sort());
  }
  const first = DISCOVER_LADDER[6];
  assert.ok(first.level === 3);
  assert.deepEqual(reachChoices(first).map((c) => [c.v, c.slip]), [[12, null], [18, "add"], [33.33, "flip"], [16, "other"]]);
  assert.equal(reachSlip(first, 18), "add");
});

test("the ladder: three grown, three turned, three reached; the endless run at every level", () => {
  assert.deepEqual(DISCOVER_LADDER.map((t) => t.level), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
  const grown = DISCOVER_LADDER.filter((t): t is GrowTask => t.level === 1);
  assert.equal(new Set(grown.map((t) => angleOf(t.shape))).size, 3);
  for (const t of grown) {
    const [lo, hi] = sizeRange(t.shape);
    assert.ok(t.start >= lo && t.start <= hi);
  }
  for (const level of GAME_LEVELS)
    for (let seed = 1; seed <= 50; seed++) {
      const t = discoverTask(level, rng(seed));
      assert.equal(t.level, level);
      if (t.level === 1) {
        const [lo, hi] = sizeRange(t.shape);
        assert.ok(t.start >= lo && t.start <= hi && t.goal);
      }
    }
});

test("notices: ten in a row first, then a ratio upside down, then what a clean puzzle showed", () => {
  const [grow, , , turn, , , reach] = DISCOVER_LADDER;
  assert.equal(discoverNotice(grow, 0, 10, true), "streak10");
  assert.equal(discoverNotice(grow, 2, 0, true), "flipped");
  assert.equal(discoverNotice(grow, 1, 0, false), null);
  assert.equal(discoverNotice(grow, 0, 0, false), "anySize");
  assert.equal(discoverNotice(turn, 0, 0, false), "angleDecides");
  assert.equal(discoverNotice(reach, 0, 0, false), "outOfReach");
});
