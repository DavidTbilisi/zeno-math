// Number line estimation: every number is on its line and its own pin is right, a pin is read back the way it was
// written, right means within 5 % of the line and close within 10 %, rounds have five different numbers, stars follow
// the average error, and the things noticed are noticed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import {
  currentTask,
  decodePin,
  encodePin,
  ESTIMATE_LADDER,
  estimateNotice,
  estimateTask,
  judgePin,
  lineSvg,
  offText,
  pinError,
  renderPin,
  ROUND,
  roundStars,
  roundTasks,
  shareAlong,
} from "../src/math/estimate.ts";
import { check, exercise, LEVELS, preview } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { readLadder, withBest } from "../src/math/ladder.ts";
import { rng } from "../src/math/random.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every number is inside its line, and its own pin is right", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = estimateTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${t.text} on ${t.play.from}…${t.play.to}`;
      assert.ok(t.v > t.play.from && t.v < t.play.to, where);
      assert.deepEqual(judgePin(t.play, t.v, encodePin(t.play, t.v)), { ok: true }, where);
      if (level === 1) assert.ok(t.play.from === 0 && t.play.to <= 20 && Number.isInteger(t.v), where);
      if (level === 2) assert.ok(t.play.to === 100 || t.play.to === 1000, where);
    }
  const hard = Array.from({ length: 200 }, (_, i) => estimateTask(3, rng(i + 1)));
  assert.ok(hard.some((t) => t.text.includes("/")) && hard.some((t) => t.text.includes(".")) && hard.some((t) => t.v < 0), "fractions, decimals and negatives");
  assert.ok(hard.filter((t) => t.v < 0).every((t) => t.text.startsWith("−")), "a minus sign, not a hyphen");
});

test("a pin is written to a thousandth of its line and read back however it is typed", () => {
  assert.equal(encodePin({ from: 0, to: 1 }, 0.66666), "pin:0.667");
  assert.equal(encodePin({ from: 0, to: 1000 }, 371.6), "pin:372");
  assert.equal(encodePin({ from: -20, to: 20 }, -7.0049), "pin:-7");
  assert.equal(encodePin({ from: 0, to: 10 }, 3.14159), "pin:3.14");
  for (const [src, v] of [["pin:36.8", 36.8], [" pin: -7 ", -7], ["−7", -7], ["0,5", 0.5], ["12", 12]] as const) assert.equal(decodePin(src), v, src);
  for (const bad of ["", "pin:", "pin:abc", "1/2", "3 4"]) assert.equal(decodePin(bad), null, bad);
});

test("right within 5 % of the line, close within 10 %, and which way it was off", () => {
  const p = { from: 0, to: 100 };
  assert.deepEqual(judgePin(p, 37, "pin:42"), { ok: true });
  assert.deepEqual(judgePin(p, 37, "pin:32"), { ok: true });
  assert.deepEqual(judgePin(p, 37, "pin:45"), { ok: false, close: true, side: "right" });
  assert.deepEqual(judgePin(p, 37, "pin:60"), { ok: false, close: false, side: "right" });
  assert.deepEqual(judgePin(p, 37, "pin:10"), { ok: false, close: false, side: "left" });
  assert.deepEqual(judgePin(p, 37, "pin:101"), { ok: false, problem: "offLine" });
  assert.deepEqual(judgePin(p, 37, "where"), { ok: false, problem: "unreadable" });
  assert.equal(pinError({ from: -20, to: 20 }, -7, -3), 0.1);
  assert.equal(offText(p, 37, 41.4), "4");
  assert.equal(offText({ from: 0, to: 10 }, 3, 3.46), "0.5");
  assert.equal(offText({ from: 0, to: 1 }, 0.25, 0.3), "0.05");
});

test("the practice question: its pin, its close and far answers, its picture and solution, and the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("estimateLine", level, 7, w);
    assert.ok(ex.play?.kind === "pin" && ex.pic && ex.answer.k === "pin");
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.equal(preview(ex, ex.plain), null);
    const r = await renderSolution(ex.solution!, en);
    assert.ok(r.svg.includes("#2f9e44") && !r.svg.includes("NaN"));
  }
  const ex = exercise("estimateLine", 2, 7, w);
  const far = check(ex, "pin:60", w);
  assert.equal(far.ok, false);
  assert.equal(far.hint, w.reasons.pin.right);
  assert.equal(check(ex, "pin:1", w).close, true);
  assert.equal(check(ex, "pin:1", w).hint, w.reasons.pin.left);
  assert.equal(check(ex, "pin:-5", w).why, w.reasons.pin.offLine);
  const q = { skill: "estimateLine" as const, level: 2, seed: 7 };
  assert.deepEqual([mark(q, "pin:8"), mark(q, "pin:15"), mark(q, "pin:60"), mark(q, "pin:x")], ["correct", "close", "wrong", "form"]);
  // The steps say how far along the line the number is, and which side of half way.
  const neg = Array.from({ length: 80 }, (_, i) => exercise("estimateLine", 3, i + 1, w)).find((e) => e.answer.k === "pin" && e.answer.play.from < 0)!;
  assert.match(neg.show, /^\\frac\{-?\d+ - \(-\d+\)\}/);
});

test("rounds: five different numbers of the round's level; stars from the average error; a peek caps them at two", () => {
  ESTIMATE_LADDER.forEach(({ level, seed }, stage) => {
    const r = roundTasks(level, seed);
    assert.equal(r.length, ROUND);
    assert.equal(new Set(r.map((t) => `${t.text}/${t.play.to}`)).size, ROUND);
    assert.ok(r.every((t) => t.level === level));
    assert.deepEqual(currentTask({ mode: "puzzle", stage, level: 1, seed: 0, i: 2 }), r[2]);
  });
  assert.deepEqual(currentTask({ mode: "endless", stage: 0, level: 2, seed: 99, i: 0 }), estimateTask(2, rng(99)));
  assert.equal(roundStars([0.01, 0.02, 0.03, 0.04, 0.05], false), 3);
  assert.equal(roundStars([0.05, 0.05, 0.06, 0.07, 0.05], false), 2);
  assert.equal(roundStars([0.3, 0.1, 0, 0, 0], false), 1);
  assert.equal(roundStars([0, 0, 0, 0, 0], true), 2);
  assert.equal(roundStars([0.2, 0.2, 0.2, 0.2, 0.2], true), 1);
});

test("things noticed: a bullseye, the middle, a sharp round, ten in a row", () => {
  const t = estimateTask(2, rng(1));
  const mid = { ...t, v: 50, text: "50", play: { from: 0, to: 100 } };
  assert.equal(estimateNotice(mid, 50.5, null, 0), "middle");
  assert.equal(estimateNotice(mid, 50.3, null, 0), "middle", "the middle comes before a bullseye");
  assert.equal(estimateNotice({ ...mid, v: 37 }, 37.3, null, 0), "bullseye");
  assert.equal(estimateNotice({ ...mid, v: 37 }, 39, [0.01, 0.02, 0.03, 0.01, 0.02], 0), "sharp");
  assert.equal(estimateNotice({ ...mid, v: 37 }, 39, [0.01, 0.02, 0.03, 0.01, 0.2], 0), null);
  assert.equal(estimateNotice({ ...mid, v: 37 }, 39, null, 10), "streak10");
  assert.equal(estimateNotice({ ...mid, v: 37 }, 45, null, 3), null);
});

test("pictures: the bare line for a worksheet, the solution with the number's place and the half-way mark", () => {
  const bare = lineSvg({ from: -10, to: 10 });
  assert.ok(bare.body.includes(">−10<") && bare.body.includes(">10<") && !bare.body.includes("#2f9e44"));
  const p = { from: 0, to: 100 };
  const sol = renderPin({ play: p, v: 37, text: "37" }, null);
  assert.ok(sol.svg.includes(">37<") && sol.svg.includes("stroke-dasharray"));
  assert.equal(shareAlong({ from: -20, to: 20 }, 0), 0.5);
  const withSteps = renderPin({ play: p, v: 37, text: "37" }, { svg: '<svg width="9" height="30"><g/></svg>', width: 9, height: 30 });
  assert.equal(withSteps.height, sol.height + 30);
});

test("the best streak is kept, and read back only when it makes sense", () => {
  const p = readLadder<"a">(null, 3, ["a"]);
  assert.equal(withBest(p, 4).best, 4);
  assert.equal(withBest(withBest(p, 4), 2).best, 4);
  assert.equal(withBest(p, 0), p);
  assert.equal(readLadder(JSON.stringify({ best: 7.6 }), 3, ["a"]).best, 7);
  assert.equal(readLadder(JSON.stringify({ best: -2 }), 3, ["a"]).best, 0);
  assert.equal(readLadder(JSON.stringify({ best: "x" }), 3, ["a"]).best, 0);
});
