// Guess the angle: every angle fits its level, the size offered nearest it is clearly nearest, the other scale's size
// (or the inside angle) is offered and named, the picture draws what it says, and the board's stars and notices follow
// the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { angleQuestion, angleSvg, angleTask, GUESS_LADDER, guessNotice, guessNow, guessRound, guessStars, ROUND } from "../src/math/angleGuess.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every angle fits its level", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = angleTask(level, rng(seed));
      const [lo, hi] = level === 1 ? [10, 170] : level === 2 ? [5, 175] : [185, 355];
      assert.ok(Number.isInteger(t.size) && t.size >= lo && t.size <= hi, JSON.stringify(t));
      if (level === 1) assert.ok(t.size % 5 === 0 && t.turn === 0, JSON.stringify(t));
    }
});

test("the size offered nearest the angle is clearly nearest; the slip's size is another one", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const q = angleQuestion(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${JSON.stringify(q)}`;
      const v = q.task.size;
      const vs = q.options.map((o) => o.v);
      assert.equal(new Set(vs).size, vs.length, where);
      assert.deepEqual(vs, [...vs].sort((a, b) => a - b), where);
      const d = vs.map((x) => Math.abs(x - v)).sort((a, b) => a - b);
      assert.equal(Math.abs(vs[q.right] - v), d[0], where);
      assert.ok(d[1] - d[0] >= 10, `${where}: not clearly nearest`);
      if (q.trap) {
        assert.notEqual(q.trap.at, q.right, where);
        const other = level === 3 ? 360 - v : 180 - v;
        const nearOther = vs.map((x) => Math.abs(x - other));
        assert.equal(nearOther[q.trap.at], Math.min(...nearOther), where);
      }
    }
});

test("the picture: two arms, the arc, the size once shown and the guess dashed", () => {
  const pic = angleSvg({ size: 40, turn: 0 }, { shown: true, guess: 60 });
  assert.ok(!pic.body.includes("NaN"));
  assert.match(pic.body, />40°</);
  assert.match(pic.body, />60°</);
  assert.match(pic.body, /stroke-dasharray/);
  // A reflex angle's arc takes the long way round.
  assert.match(angleSvg({ size: 300, turn: 0 }).body, /A36,36 0 1 0/);
  assert.match(angleSvg({ size: 60, turn: 0 }).body, /A36,36 0 0 0/);
});

test("in practice: the nearest size typed or picked, the slips named, the solution drawn; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("estimateAngle", level, 7, w);
    assert.ok(ex.pic);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.deepEqual(check(ex, `${ex.plain}°`, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN") && r.svg.includes("°"));
  }
  for (const [level, id] of [[1, "acuteObtuse"], [2, "acuteObtuse"], [3, "insideAngle"]] as const) {
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const ex = exercise("estimateAngle", level, seed, w);
      const trap = trapInputs(ex).find((x) => x.id === id);
      if (!trap) continue;
      found++;
      const v = check(ex, trap.input, w);
      assert.equal(v.mistake, id);
      assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
    }
    assert.ok(found > 10, `${found} questions at level ${level} name ${id}`);
  }
  const q = { skill: "estimateAngle" as const, level: 1, seed: 7 };
  assert.deepEqual([mark(q, "30"), mark(q, "90"), mark(q, "10")], ["correct", "wrong", "form"]);
});

test("the board: rounds of different angles, stars from the mean error, the notices, the ladder", () => {
  for (const { level, seed } of GUESS_LADDER) {
    const round = guessRound(level, seed);
    assert.equal(round.length, ROUND);
    assert.ok(round.every((t, i) => round.every((o, j) => i === j || Math.abs(o.size - t.size) >= 10)));
  }
  assert.deepEqual([guessStars([0, 5, 10, 5, 5]), guessStars([10, 10, 10, 5, 15]), guessStars([30, 0, 0, 0, 30])], [3, 2, 1]);
  // A round finished is always worth a star, however far off: the next round opens.
  assert.equal(guessStars([180, 180, 180, 180, 180]), 1);
  const t = { level: 1 as const, size: 40, turn: 0 };
  assert.equal(guessNotice(t, 40, 1), "spotOn");
  assert.equal(guessNotice({ ...t, size: 90 }, 90, 1), "rightAngle");
  assert.equal(guessNotice({ level: 3, size: 250, turn: 0 }, 246, 1), "reflex");
  assert.equal(guessNotice(t, 50, 10), "streak10");
  assert.equal(guessNotice(t, 50, 3), null);
  assert.deepEqual(guessNow({ mode: "puzzle", stage: 4, level: 1, seed: 0, i: 2 }), guessRound(GUESS_LADDER[4].level, GUESS_LADDER[4].seed)[2]);
  assert.deepEqual(guessNow({ mode: "endless", stage: 0, level: 3, seed: 8, i: 0 }), angleTask(3, rng(8)));
});
