// SOH CAH TOA: every triangle is right-angled with whole sides; easy lies flat with θ at the bottom and asks all three
// ratios; each ratio built from the right sides is accepted and every other fraction is told apart (another ratio,
// upside down, neither); hard leaves out the side its ratio doesn't use and offers four different lengths for it, the
// right one among them with each wrong one named; and the ladder, stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_LEVELS } from "../src/math/ladder.ts";
import { rng } from "../src/math/random.ts";
import {
  buildSlip,
  fractionOf,
  missingOf,
  nameOf,
  rootText,
  shownSides,
  SOH_LADDER,
  SOH_SIDES,
  sideOf,
  sohNotice,
  sohNow,
  sohStars,
  sohTask,
  stepsOf,
  thirdSlip,
  type SohTask,
} from "../src/math/sohcahtoa.ts";
import { RATIO_PARTS } from "../src/math/trigBuild.ts";

const every = (fn: (t: SohTask, where: string) => void) => {
  for (const level of GAME_LEVELS)
    for (let seed = 1; seed <= 400; seed++) {
      const t = sohTask(level, rng(seed));
      fn(t, `level ${level} seed ${seed}: ${JSON.stringify(t)}`);
    }
};

test("every triangle is right-angled with whole sides, and easy lies flat with θ at the bottom", () => {
  every((t, where) => {
    assert.equal(t.len.a ** 2 + t.len.b ** 2, t.len.c ** 2, where);
    SOH_SIDES.forEach((s) => assert.ok(Number.isInteger(t.len[s]), where));
    if (t.level === 1) assert.deepEqual([t.turn, t.at, t.given, t.order], [0, "a", null, ["sin", "cos", "tan"]], where);
    else assert.notEqual(t.turn, 0, where);
    assert.equal(new Set(t.order).size, t.order.length, where);
  });
});

test("opposite, adjacent and hypotenuse follow θ, and the names and sides undo each other", () => {
  assert.deepEqual(SOH_SIDES.map((s) => nameOf("a", s)), ["adj", "opp", "hyp"]);
  assert.deepEqual(SOH_SIDES.map((s) => nameOf("b", s)), ["opp", "adj", "hyp"]);
  for (const at of ["a", "b"] as const) for (const s of SOH_SIDES) assert.equal(sideOf(at, nameOf(at, s)), s);
});

test("the right sides make the ratio; any other pair of sides is told what it is", () => {
  const t = sohTask(1, rng(1));
  for (const r of ["sin", "cos", "tan"] as const)
    for (const top of SOH_SIDES)
      for (const bottom of SOH_SIDES) {
        if (top === bottom) continue;
        const [x, y] = [nameOf(t.at, top), nameOf(t.at, bottom)];
        const slip = buildSlip(t, r, top, bottom);
        const [p, q] = RATIO_PARTS[r];
        if (x === p && y === q) assert.equal(slip, null);
        else if (x === q && y === p) assert.equal(slip, "flip");
        else assert.equal(slip, ["opp/hyp", "adj/hyp", "opp/adj"].includes(`${x}/${y}`) ? "other" : "neither", `${r} ${x}/${y}`);
      }
  // A 3-4-5 triangle with θ at the end of the 4: sin θ = 3/5, cos θ = 4/5, tan θ = 3/4.
  const k: SohTask = { ...t, len: { a: 4, b: 3, c: 5 }, at: "a" };
  assert.deepEqual([fractionOf(k, "sin"), fractionOf(k, "cos"), fractionOf(k, "tan")], [[3, 5], [4, 5], [3, 4]]);
});

test("hard gives one ratio, leaves out the third side and offers four different lengths for it, each wrong one named", () => {
  every((t, where) => {
    if (t.level !== 3) return assert.equal(t.given, null, where);
    assert.ok(t.given, where);
    assert.ok(!t.order.includes(t.given!), where);
    assert.equal(t.order.length, 2, where);
    const missing = missingOf(t);
    assert.ok(!RATIO_PARTS[t.given!].map((n) => sideOf(t.at, n)).includes(missing), where);
    assert.equal(t.thirds.length, 4, where);
    assert.equal(new Set(t.thirds.map(rootText)).size, 4, where);
    assert.ok(t.thirds.includes(t.len[missing] ** 2), where);
    for (const sq of t.thirds) assert.equal(thirdSlip(t, sq) === null, sq === t.len[missing] ** 2, where);
    // The steps: the two numbers placed, the third side, two ratios built; the lengths show as they are placed.
    assert.deepEqual(stepsOf(t).map((s) => s.kind), ["place", "place", "third", "build", "build"], where);
    assert.deepEqual(shownSides(t, 0), [], where);
    assert.equal(shownSides(t, 3).length, 3, where);
  });
});

test("the root of a length is written whole when it is whole", () => {
  assert.deepEqual([rootText(144), rootText(194), rootText(1)], ["12", "√194", "1"]);
});

test("the ladder climbs the levels, three of each, and its triangles differ", () => {
  assert.deepEqual(SOH_LADDER.map((p) => p.level), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
  const tasks = SOH_LADDER.map((_, stage) => sohNow({ mode: "puzzle", stage, level: 1, seed: 1 }));
  assert.equal(new Set(tasks.map((t) => JSON.stringify(t.len))).size, tasks.length);
  // The hard ones give each ratio once.
  assert.deepEqual(new Set(tasks.filter((t) => t.given).map((t) => t.given)).size, 3);
});

test("stars by misses, and notices only for a puzzle with none", () => {
  assert.deepEqual([0, 1, 2, 5].map(sohStars), [3, 2, 1, 1]);
  const [easy, turned, hard] = [sohTask(1, rng(1)), { ...sohTask(2, rng(1)), turn: 30 }, sohTask(3, rng(1))];
  assert.equal(sohNotice(easy, 0, 1), "allThree");
  assert.equal(sohNotice(turned, 0, 1), "turned");
  assert.equal(sohNotice(hard, 0, 1), "fromOne");
  assert.equal(sohNotice(hard, 1, 1), null);
  assert.equal(sohNotice(easy, 2, 10), "streak10");
});
