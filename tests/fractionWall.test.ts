// Make a whole: every gap is positive and can be filled with the puzzle's tiles, the fewest tiles are the fewest, a
// fill is short, exact or over, the stars and notices follow the rules, and the practice question asks for the gap in
// lowest terms and names tops and bottoms added.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { Frac } from "../src/math/fraction.ts";
import {
  acrossGap,
  fewestTiles,
  fillState,
  fracSvg,
  lcm,
  renderWall,
  sumOf,
  WALL_LADDER,
  wallNotice,
  wallNow,
  wallStars,
  wallSvg,
  wallTask,
} from "../src/math/fractionWall.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every gap is positive, fits its tiles, and the fewest tiles fill it exactly", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = wallTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${t.fixed.join(",")} → ${t.target.n}/${t.target.d}`;
      assert.ok(!t.gap.isNeg() && !t.gap.isZero(), where);
      assert.ok(sumOf(t.fixed).add(t.gap).sub(t.target).isZero(), where);
      assert.equal(fillState(t, t.fewest), "exact", where);
      assert.ok(t.fixed.every((d) => t.sizes.includes(d)) && t.fewest.every((d) => t.sizes.includes(d)), where);
      if (level < 3) assert.ok(t.target.isOne(), where);
    }
  assert.ok(Array.from({ length: 50 }, (_, i) => wallTask(3, rng(i + 1))).some((t) => t.target.toNumber() > 1), "a target past 1");
});

test("the fewest tiles: a single tile when one fits, more otherwise, none when nothing can", () => {
  assert.deepEqual(fewestTiles(new Frac(1, 2), [2, 4, 8]), [2]);
  assert.deepEqual(fewestTiles(new Frac(3, 4), [2, 4, 8]), [2, 4]);
  assert.deepEqual(fewestTiles(new Frac(7, 8), [2, 4, 8]), [2, 4, 8]);
  assert.deepEqual(fewestTiles(new Frac(5, 12), [2, 3, 6, 12]), [3, 12]);
  assert.equal(fewestTiles(new Frac(1, 3), [2, 4, 8]), null);
  assert.equal(lcm([4, 6]), 12);
});

test("a fill is short, exact or over; stars for exact, three with the fewest tiles", () => {
  const t = { gap: new Frac(3, 4), fewest: [2, 4] };
  assert.equal(fillState(t, [2]), "short");
  assert.equal(fillState(t, [4, 4, 4]), "exact");
  assert.equal(fillState(t, [2, 2]), "over");
  assert.equal(wallStars(t, [2, 4]), 3);
  assert.equal(wallStars(t, [4, 4, 4]), 2);
  assert.equal(wallNotice([4], 0), "oneTile");
  assert.equal(wallNotice([2, 4, 8], 0), "threeSizes");
  assert.equal(wallNotice([8, 8, 8, 8, 8, 8], 0), "manySame");
  assert.equal(wallNotice([4, 4], 10), "streak10");
  assert.equal(wallNotice([4, 4], 2), null);
  WALL_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(wallNow({ mode: "puzzle", stage, level: 1, seed: 0 }), wallTask(level, rng(seed))));
  assert.deepEqual(wallNow({ mode: "endless", stage: 0, level: 2, seed: 5 }), wallTask(2, rng(5)));
});

test("tops and bottoms added: the gap that mistake gives, named in practice", () => {
  const t = wallTask(1, rng(7));
  assert.deepEqual(t.fixed, [4, 8]);
  const a = acrossGap(t)!;
  assert.deepEqual([a.across.n, a.across.d, a.gap.n, a.gap.d, a.big], [1, 6, 5, 6, 4]);
  assert.equal(acrossGap({ ...t, fixed: [2] }), null);
  // ¼ + ¼ added across is 2/8: the gap that gives is ¾, not ½.
  const same = acrossGap({ ...t, fixed: [4, 4], gap: new Frac(1, 2), target: Frac.ONE })!;
  assert.deepEqual([same.gap.n, same.gap.d], [3, 4]);
  // No trap when the slip leaves nothing missing (⅓ + ⅕ across is 2/8, all of a target of ¼).
  assert.equal(acrossGap({ ...t, fixed: [3, 5], gap: new Frac(-17, 60), target: new Frac(1, 4) }), null);
  const ex = exercise("makeWhole", 1, 7, w);
  const [trap] = trapInputs(ex);
  assert.equal(check(ex, trap.input, w).mistake, "addAcross");
  assert.equal(check(ex, "10/16", w).why, w.reasons.notLowest);
  assert.deepEqual(check(ex, "5/8", w), { ok: true });
});

test("the practice question: the bar drawn with its gap, the solution filled with the fewest tiles; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("makeWhole", level, 7, w);
    assert.ok(ex.pic && ex.q.includes("\\square"));
    const r = await renderSolution(ex.solution!, en);
    assert.ok(r.svg.includes("stroke-dasharray") === false || r.svg.includes("#2f9e44"), `level ${level}`);
    assert.ok(!r.svg.includes("NaN"));
  }
  const q = { skill: "makeWhole" as const, level: 2, seed: 7 };
  assert.deepEqual([mark(q, "5/12"), mark(q, "10/24"), mark(q, "6/7")], ["correct", "form", "wrong"]);
});

test("pictures: the gap with a ?, tiles labelled when they are wide enough, 1 marked when the target is more", () => {
  const t = wallTask(1, rng(7));
  const q = wallSvg(t, null);
  assert.ok(q.body.includes(">?<") && q.body.includes("stroke-dasharray"));
  const filled = wallSvg(t, t.fewest);
  assert.ok(!filled.body.includes(">?<") && filled.body.includes("#2f9e44"));
  const past = Array.from({ length: 80 }, (_, i) => wallTask(3, rng(i + 1))).find((x) => x.target.toNumber() > 1)!;
  assert.ok(wallSvg(past, null).body.includes(">1<"));
  assert.ok(wallSvg(past, null).h > q.h);
  assert.ok(fracSvg(3, 1, 0, 0).includes(">3<") && !fracSvg(3, 1, 0, 0).includes("<line"));
  assert.ok(fracSvg(3, 4, 0, 0).includes("<line"));
  assert.equal(renderWall({ task: t }, null).height, filled.h);
});
