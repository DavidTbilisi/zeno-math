// Quick look: every arrangement has as many dots as its number, in the range of its level, never overlapping and
// inside the box; the steps say how the groups add up; rounds don't repeat a number twice running; stars, the
// endless flash and the things noticed follow the rules; and the practice question is a number like any other.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, renderPractice } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import {
  dotsHeight,
  dotsSvg,
  flashFor,
  frameCell,
  LOOK_H,
  LOOK_LADDER,
  LOOK_W,
  lookNotice,
  lookNow,
  lookRound,
  lookStars,
  lookSteps,
  lookTask,
  MIN_FLASH_MS,
  padMax,
  renderDots,
  ROUND,
} from "../src/math/quickLook.ts";
import { rng } from "../src/math/random.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const RANGE = { 1: [1, 6], 2: [4, 12], 3: [9, 20] } as const;

test("every arrangement: its number of dots, in its level's range, apart from each other and inside the box", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = lookTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${t.kind} ${t.parts.join("+")}`;
      assert.equal(t.dots.length, t.n, where);
      assert.equal(t.parts.reduce((s, k) => s + k, 0), t.n, where);
      assert.ok(t.n >= RANGE[level][0] && t.n <= RANGE[level][1] && t.n <= padMax(level), where);
      for (const [i, p] of t.dots.entries()) {
        assert.ok(p.x >= 13 && p.x <= LOOK_W - 13 && p.y >= 13 && p.y <= dotsHeight(t) - 13, `${where}: dot ${i} at ${p.x},${p.y}`);
        for (const q of t.dots.slice(i + 1)) assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= 26, `${where}: dots overlap`);
      }
    }
  const kinds = new Set(Array.from({ length: 300 }, (_, i) => lookTask(((i % 3) + 1) as 1 | 2 | 3, rng(i + 1)).kind));
  assert.deepEqual([...kinds].sort(), ["dice", "die", "frame", "frames", "groups", "scatter"]);
});

test("the steps say how the dots add up", () => {
  const frame = (n: number) => ({ level: 2 as const, kind: "frame" as const, n, parts: [n], dots: [] });
  assert.equal(lookSteps(frame(9)), "10 - 1 = 9");
  assert.equal(lookSteps(frame(7)), "5 + 2 = 7");
  assert.equal(lookSteps(frame(5)), "5");
  assert.equal(lookSteps({ level: 3, kind: "groups", n: 12, parts: [4, 3, 5], dots: [] }), "4 + 3 + 5 = 12");
  assert.equal(lookSteps({ level: 1, kind: "die", n: 4, parts: [4], dots: [] }), "4");
  assert.deepEqual(frameCell(12), { x: 160, y: 143 });
});

test("rounds, stars, the endless flash and the buttons", () => {
  LOOK_LADDER.forEach(({ level, seed }, stage) => {
    const r = lookRound(level, seed);
    assert.equal(r.length, ROUND);
    assert.ok(r.every((t, i) => i === 0 || t.n !== r[i - 1].n));
    assert.deepEqual(lookNow({ mode: "puzzle", stage, level: 1, seed: 0, i: 3 }), r[3]);
  });
  assert.deepEqual(lookNow({ mode: "endless", stage: 0, level: 3, seed: 5, i: 0 }), lookTask(3, rng(5)));
  assert.deepEqual([lookStars(5, false), lookStars(4, false), lookStars(2, false), lookStars(5, true), lookStars(1, true)], [3, 2, 1, 2, 1]);
  assert.equal(flashFor(2, 0), 1200);
  assert.ok(flashFor(2, 3) < flashFor(2, 2));
  assert.equal(flashFor(1, 40), MIN_FLASH_MS);
});

test("things noticed: a full frame, three groups, ten in a row, a quick answer — only when right", () => {
  const full = { level: 2 as const, kind: "frame" as const, n: 10, parts: [10], dots: [] };
  const three = { level: 3 as const, kind: "groups" as const, n: 12, parts: [4, 3, 5], dots: [] };
  const die = { level: 1 as const, kind: "die" as const, n: 4, parts: [4], dots: [] };
  assert.equal(lookNotice(full, true, 3000, 0), "fullFrame");
  assert.equal(lookNotice({ ...full, kind: "frames", n: 20 }, true, 3000, 0), "fullFrame");
  assert.equal(lookNotice(three, true, 3000, 0), "threeGroups");
  assert.equal(lookNotice(die, true, 3000, 10), "streak10");
  assert.equal(lookNotice(die, true, 800, 2), "quick");
  assert.equal(lookNotice(die, true, 3000, 2), null);
  assert.equal(lookNotice(full, false, 300, 0), null);
});

test("the practice question: a number, the dots to flash, a picture for paper but not on a screen, and its solution", async () => {
  for (const level of LEVELS) {
    const ex = exercise("quickLook", level, 7, w);
    assert.ok(ex.play?.kind === "flash" && ex.play.body.includes("<circle") && ex.play.ms >= 1000);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(r.svg.includes("<circle") && !r.svg.includes("NaN"), `level ${level}`);
    const spec = { area: "number" as const, skill: "quickLook" as const, level, seed: 7, count: 1, answers: false };
    assert.ok(renderPractice(spec, w).svg.includes("<circle"), "the dots on paper");
    assert.ok(!renderPractice({ ...spec, screen: true }, w).svg.includes("<circle"), "not on a screen that flashes them");
  }
  const q = { skill: "quickLook" as const, level: 3, seed: 7 };
  assert.deepEqual([mark(q, "11"), mark(q, "10"), mark(q, "eleven")], ["correct", "wrong", "form"]);
});

test("pictures: frames drawn round the cells, groups coloured in the solution", () => {
  const t = lookTask(3, rng(2));
  const twoFrames = Array.from({ length: 50 }, (_, i) => lookTask(3, rng(i + 1))).find((x) => x.kind === "frames")!;
  assert.equal(dotsSvg(twoFrames).match(/<rect/g)!.length, 20);
  assert.equal(dotsHeight(twoFrames), 236);
  assert.equal(dotsHeight(t.kind === "frames" ? lookTask(1, rng(1)) : t), LOOK_H);
  assert.ok(!dotsSvg(t).includes("#e8590c") && dotsSvg({ ...t, parts: [1, 1], dots: [{ x: 1, y: 1, g: 1 }] }, true).includes("#e8590c"));
  const r = renderDots({ task: t }, null);
  assert.equal(r.height, dotsHeight(t));
});
