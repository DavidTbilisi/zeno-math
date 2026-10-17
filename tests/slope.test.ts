// Gradients: every gradient fits its level with its step on the grid, a line through A has it whichever point of it B
// is, the wrong lines are told apart, along over up is named in practice, and the board's stars and notices follow
// the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { gradTex, gradText, onLine, SLOPE_LADDER, slopeNotice, slopeNow, slopeQuestion, slopeRange, slopeSlip, slopeStars, slopeSteps, slopeSvg, slopeTask } from "../src/math/slope.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

test("every gradient fits its level, in lowest terms, with a step of it from A on the grid", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = slopeTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${JSON.stringify(t)}`;
      const [lo, hi] = slopeRange(level);
      const fits = ([x, y]: number[]) => x >= lo && x <= hi && y >= lo && y <= hi;
      assert.ok(fits(t.a) && fits([t.a[0] + t.run, t.a[1] + t.rise]), where);
      assert.equal(gcd(t.rise, t.run), 1, where);
      if (level === 1) assert.ok(t.run === 1 && t.rise >= 1 && t.rise <= 3, where);
      if (level === 2) assert.ok(t.run === 1 && t.rise !== 0 && Math.abs(t.rise) <= 3, where);
      if (level === 3) assert.ok(t.run >= 2 && t.run <= 4 && t.rise !== 0 && Math.abs(t.rise) <= 3, where);
    }
});

test("a line has the gradient whichever point of it B is; the wrong ones are told apart", () => {
  const t = { level: 3 as const, a: [0, 0] as [number, number], rise: 2, run: 3 };
  assert.ok(onLine(t, [3, 2]) && onLine(t, [-3, -2]) && onLine(t, [6, 4]));
  assert.ok(!onLine(t, [0, 0]) && !onLine(t, [2, 3]));
  assert.equal(slopeSlip(t, [2, 3]), "flipped");
  assert.equal(slopeSlip(t, [3, -2]), "sign");
  assert.equal(slopeSlip(t, [0, 4]), "upright");
  assert.equal(slopeSlip(t, [3, 1]), "steep");
  // A gradient of 1 turned upside down is still 1: that line is right, not flipped.
  assert.equal(slopeSlip({ ...t, rise: -1, run: 1 }, [1, 1]), "sign");
  assert.deepEqual([gradText(4, 2), gradText(-2, 3), gradText(3, -6), gradText(6, 4)], ["2", "−2/3", "−1/2", "3/2"]);
  assert.deepEqual([gradTex(-4, 2), gradTex(2, -3)], ["-2", "-\\frac{2}{3}"]);
});

test("the picture: the line across the whole grid, and the step from A to B as a triangle", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 40; seed++) {
      const t = slopeTask(level, rng(seed));
      const pic = slopeSvg(t, { b: [t.a[0] + t.run, t.a[1] + t.rise], step: true });
      assert.ok(!pic.body.includes("NaN"));
      // The line ends on the edge of the grid, never past it.
      const m = pic.body.match(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#1971c2" stroke-width="3"/)!;
      const [x1, y1, x2, y2] = m.slice(1).map(Number);
      for (const v of [x1, y1, x2, y2]) assert.ok(v >= 30 - 1e-6 && v <= pic.w - 30 + 1e-6, `${level} ${seed}: ${m[0]}`);
      assert.ok([x1, x2].some((x) => Math.abs(x - 30) < 1e-6 || Math.abs(x - (pic.w - 30)) < 1e-6) || [y1, y2].some((y) => Math.abs(y - 30) < 1e-6 || Math.abs(y - (pic.h - 30)) < 1e-6));
      assert.match(pic.body, /stroke-dasharray="6 4"/);
    }
});

test("in practice: the gradient typed, along over up named, the step drawn; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("slope", level, 7, w);
    assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN"));
  }
  for (const level of LEVELS)
    for (let seed = 1; seed <= 100; seed++) {
      const q = slopeQuestion(level, rng(seed));
      const [lo, hi] = slopeRange(level);
      assert.ok([...q.p, ...q.q].every((v) => v >= lo && v <= hi) && q.q[0] > q.p[0]);
      assert.ok(onLine(q.task, q.q));
    }
  for (const level of LEVELS) {
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const ex = exercise("slope", level, seed, w);
      const trap = trapInputs(ex).find((x) => x.id === "runOverRise");
      if (!trap) continue;
      found++;
      const v = check(ex, trap.input, w);
      assert.equal(v.mistake, "runOverRise");
      assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
    }
    assert.ok(found > 15, `${found} questions at level ${level} name runOverRise`);
  }
  assert.deepEqual(slopeSteps({ task: { level: 1, a: [0, 0], rise: 2, run: 1 }, p: [0, 0], q: [2, 4] }), ["m = \\frac{4}{2} = 2"]);
  assert.deepEqual(slopeSteps({ task: { level: 3, a: [0, 0], rise: -1, run: 2 }, p: [0, 0], q: [2, -1] }), ["m = \\frac{-1}{2} = -\\frac{1}{2}"]);
  const ex = exercise("slope", 3, 7, w);
  const q = { skill: "slope" as const, level: 3, seed: 7 };
  if (ex.answer.k !== "num") throw new Error();
  const [n, d] = ex.plain.replace("-", "").split("/").map(Number);
  const twice = `${ex.answer.v < 0 ? "-" : ""}${2 * n}/${2 * d}`;
  assert.deepEqual([mark(q, ex.plain), mark(q, twice), mark(q, String(-ex.answer.v)), mark(q, "steep")], ["correct", "form", "wrong", "form"], "not in lowest terms is sent back");
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([slopeStars(0), slopeStars(1), slopeStars(5)], [3, 2, 1]);
  const t = { level: 2 as const, a: [0, 0] as [number, number], rise: -2, run: 1 };
  assert.equal(slopeNotice(t, [1, -2], 0, 1), "negative");
  assert.equal(slopeNotice(t, [2, -4], 0, 1), "farther");
  assert.equal(slopeNotice({ ...t, rise: 1, run: 2 }, [2, 1], 0, 1), "fraction");
  assert.equal(slopeNotice({ ...t, rise: 2 }, [1, 2], 0, 1), null);
  assert.equal(slopeNotice(t, [1, -2], 1, 0), null);
  assert.equal(slopeNotice(t, [1, -2], 0, 10), "streak10");
  assert.deepEqual(slopeNow({ mode: "puzzle", stage: 4, level: 1, seed: 0 }), slopeTask(SLOPE_LADDER[4].level, rng(SLOPE_LADDER[4].seed)));
  assert.deepEqual(slopeNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), slopeTask(3, rng(8)));
});
