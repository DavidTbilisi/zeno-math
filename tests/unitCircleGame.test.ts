// Round the unit circle: every task's answers really solve it and are all there are, the coordinates offered are
// four different points of the circle with the right one among them, the exact values are written as on paper, a
// wrong angle is told apart (sign, size, no tan, the condition), and the ladder, stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_LEVELS } from "../src/math/ladder.ts";
import { rng } from "../src/math/random.ts";
import {
  CIRCLE_LADDER,
  circleNotice,
  circleNow,
  circleStars,
  circleTask,
  coordText,
  exactText,
  fnAt,
  snap,
  solutions,
  solveSlip,
  type SolveTask,
} from "../src/math/unitCircleGame.ts";

const every = (fn: (t: ReturnType<typeof circleTask>, where: string) => void) => {
  for (const level of GAME_LEVELS)
    for (let seed = 1; seed <= 400; seed++) {
      const t = circleTask(level, rng(seed));
      fn(t, `level ${level} seed ${seed}: ${JSON.stringify(t)}`);
    }
};

test("easy places P at a 30° or 45° angle and offers four different points, its own among them", () => {
  every((t, where) => {
    if (t.level !== 1) return assert.equal(t.kind, "solve", where);
    assert.equal(t.kind, "place", where);
    if (t.kind !== "place") return;
    assert.ok(t.angle > 0 && t.angle < 360 && (t.angle % 30 === 0 || t.angle % 45 === 0), where);
    assert.equal(t.choices.length, 4, where);
    assert.ok(t.choices.includes(t.angle), where);
    assert.equal(new Set(t.choices.map(coordText)).size, 4, where);
  });
});

test("an equation's answers solve it, every one there is, one or two of them", () => {
  every((t, where) => {
    if (t.kind !== "solve") return;
    assert.ok(t.answers.length === 1 || t.answers.length === 2, where);
    if (t.level === 2) assert.ok(t.answers.length === 2 && t.fn !== "tan" && !t.cond, where);
    for (const a of t.answers) assert.ok(Math.abs(fnAt(t.fn, a) - t.v) < 1e-9, where);
    // Every angle, at every degree, that solves it is on the snap and among the answers.
    for (let a = 0; a < 360; a++) {
      const v = fnAt(t.fn, a);
      const fits: boolean = Math.abs(v - t.v) < 1e-9 && (!t.cond || (t.cond.startsWith("sin") ? Math.sign(fnAt("sin", a)) : Math.sign(fnAt("cos", a))) === (t.cond.endsWith("Pos") ? 1 : -1));
      assert.equal(fits, t.answers.includes(a), `${where} at ${a}`);
    }
  });
});

test("exact values are written as on paper", () => {
  assert.equal(exactText(0.5), "½");
  assert.equal(exactText(-Math.sqrt(3) / 2), "−√3/2");
  assert.equal(exactText(-1e-17), "0");
  assert.equal(exactText(Math.sqrt(3)), "√3");
  assert.equal(exactText(Math.tan((15 * Math.PI) / 180)), "0.27");
  assert.equal(exactText(NaN), "—");
  assert.equal(coordText(150), "(−√3/2, ½)");
  assert.equal(coordText(270), "(0, −1)");
  assert.deepEqual([snap(7), snap(8), snap(-10), snap(359)], [0, 15, 345, 0]);
});

test("a wrong angle is told apart: the sign, the size, no tan, the condition, found already", () => {
  const sin: SolveTask = { level: 2, kind: "solve", fn: "sin", v: 0.5, cond: null, answers: solutions("sin", 0.5, null) };
  assert.deepEqual(sin.answers, [30, 150]);
  assert.equal(solveSlip(sin, 30, []), null);
  assert.equal(solveSlip(sin, 30, [30]), "again");
  assert.equal(solveSlip(sin, 210, []), "sign");
  assert.equal(solveSlip(sin, 60, []), "size");
  const tan: SolveTask = { level: 3, kind: "solve", fn: "tan", v: 1, cond: null, answers: solutions("tan", 1, null) };
  assert.deepEqual(tan.answers, [45, 225]);
  assert.equal(solveSlip(tan, 90, []), "undef");
  assert.equal(solveSlip(tan, 135, []), "sign");
  const one: SolveTask = { level: 3, kind: "solve", fn: "cos", v: 0.5, cond: "sinNeg", answers: solutions("cos", 0.5, "sinNeg") };
  assert.deepEqual(one.answers, [300]);
  assert.equal(solveSlip(one, 60, []), "cond");
});

test("the ladder runs easy to hard, with tan and a one-angle equation on hard", () => {
  const tasks = CIRCLE_LADDER.map((_, stage) => circleNow({ mode: "puzzle", stage, level: 1, seed: 1 }));
  assert.deepEqual(tasks.map((t) => t.level), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
  assert.ok(tasks.slice(0, 3).every((t) => t.kind === "place"));
  const hard = tasks.slice(6) as SolveTask[];
  assert.ok(hard.some((t) => t.fn === "tan"));
  assert.ok(hard.some((t) => t.cond));
  assert.ok(tasks.slice(3, 6).some((t) => t.kind === "solve" && t.v < 0));
});

test("stars and notices follow the rules", () => {
  assert.deepEqual([0, 1, 2, 4].map(circleStars), [3, 2, 1, 1]);
  const third = circleTask(1, rng(13));
  assert.equal(third.kind === "place" && third.angle, 210);
  assert.equal(circleNotice(third, 0, 1), "third");
  assert.equal(circleNotice(third, 1, 1), null);
  assert.equal(circleNotice(third, 0, 10), "streak10");
  const [tan, one] = [circleNow({ mode: "puzzle", stage: 6, level: 1, seed: 1 }), circleNow({ mode: "puzzle", stage: 7, level: 1, seed: 1 })];
  assert.equal(circleNotice(tan, 0, 1), "tan");
  assert.equal(circleNotice(one, 0, 1), "onlyOne");
});
