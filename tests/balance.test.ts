// Balance puzzles: every task balances at its own weights and only there, fits its level and its pans, the working
// ends on the weight, the shapes left on the other pan are named, and the board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import {
  BALANCE_LADDER,
  balanced,
  balanceNotice,
  balanceNow,
  balanceStars,
  balanceSteps,
  balanceSvg,
  balanceTask,
  oneSideOnly,
  panTex,
  panWeight,
  renderBalance,
  scaleSvg,
  tips,
} from "../src/math/balance.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every task balances at its weights, and no other weights balance it", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = balanceTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${JSON.stringify(t)}`;
      assert.ok(balanced(t, t.values), where);
      assert.equal(t.values.length, level === 3 ? 2 : 1, where);
      assert.equal(t.scales.length, level === 3 ? 2 : 1, where);
      assert.ok(t.values.every((v) => Number.isInteger(v) && v >= 1 && v <= 10), where);
      // Any other weights a player could set tip some scale.
      for (let a = 0; a <= 20; a++)
        for (let b = 0; b <= (level === 3 ? 20 : 0); b++) {
          const g = level === 3 ? [a, b] : [a];
          if (g.some((v, i) => v !== t.values[i])) assert.ok(!balanced(t, g), `${where} also balances at ${g}`);
        }
      for (const s of t.scales) {
        const both = s.left.shapes.some((k, i) => k > 0 && s.right.shapes[i] > 0);
        assert.equal(both, level === 2, `${where}: a shape on both pans only at medium`);
        assert.ok(panWeight(s.left, t.values) <= 40, where);
      }
      const steps = balanceSteps(t);
      assert.match(steps.join(" "), new RegExp(`= ${t.values[0]}\\b`), where);
    }
});

test("the scales tip the way the weights say", () => {
  const t = { scales: [{ left: { shapes: [3], weights: [2] }, right: { shapes: [1], weights: [10] } }] };
  assert.deepEqual(tips(t, [4]), [0]);
  assert.deepEqual(tips(t, [5]), [-1], "too heavy: down on the left");
  assert.deepEqual(tips(t, [3]), [1]);
  assert.equal(panTex(t.scales[0].left), "3{\\color{#1971c2}\\blacksquare} + 2");
  assert.equal(panTex({ shapes: [0, 0], weights: [] }), "0");
  assert.match(scaleSvg(t.scales[0], -1, [14, 10]), />14<\/text>.*>10<\/text>/);
  // Down on the right: the beam's right end lower than its left (SVG y grows downwards).
  const beam = (tip: number) => scaleSvg(t.scales[0], tip).match(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#495057"/)!.slice(1).map(Number);
  assert.ok(beam(1)[3] > beam(1)[1] && beam(-1)[3] < beam(-1)[1] && beam(0)[3] === beam(0)[1]);
  const pic = balanceSvg(t, [5]);
  assert.ok(pic.w > 0 && pic.h > balanceSvg(t).h, "room for the totals once weighed");
  assert.ok(!renderBalance({ task: balanceTask(3, rng(2)) }, null).svg.includes("NaN"));
});

test("in practice: the weight typed, the other pan's shapes named, the solution drawn; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("balance", level, 7, w);
    assert.ok(ex.pic);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(r.svg.includes("#1971c2") && !r.svg.includes("NaN"));
  }
  let found = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const ex = exercise("balance", 2, seed, w);
    const trap = trapInputs(ex).find((x) => x.id === "oneSideOnly");
    if (!trap) continue;
    found++;
    const v = check(ex, trap.input, w);
    assert.equal(v.mistake, "oneSideOnly");
    assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
  }
  assert.ok(found > 20, `${found} medium questions name the other pan's shapes`);
  assert.equal(oneSideOnly(balanceTask(1, rng(3))), null, "nothing on the other pan at easy");
  const q = { skill: "balance" as const, level: 1, seed: 7 };
  assert.deepEqual([mark(q, "1"), mark(q, "19"), mark(q, "one")], ["correct", "wrong", "form"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([balanceStars(0), balanceStars(1), balanceStars(2)], [3, 2, 1]);
  const easy = balanceTask(1, rng(4));
  const two = balanceTask(2, rng(4));
  const hard = balanceTask(3, rng(4));
  assert.equal(balanceNotice(easy, 0, 10), "streak10");
  assert.equal(balanceNotice(hard, 0, 1), "twoShapes");
  assert.equal(balanceNotice(two, 0, 1), "bothSides");
  assert.equal(balanceNotice({ ...easy, values: [10] }, 1, 0), "heavy");
  assert.equal(balanceNotice({ ...easy, values: [3] }, 1, 0), null);
  BALANCE_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(balanceNow({ mode: "puzzle", stage, level: 1, seed: 0 }), balanceTask(level, rng(seed))));
  assert.deepEqual(balanceNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), balanceTask(3, rng(8)));
});
