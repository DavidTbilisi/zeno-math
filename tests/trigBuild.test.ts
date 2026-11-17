// Trig builder: every triangle is a right-angled one of its level, the right rearrangement gives what the triangle
// shows, the wrong ones are told apart the way the picture shows them, the sides swap names when θ is at the top, the
// scaffold fades up the levels, and the board's ladder, stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { GAME_LEVELS } from "../src/math/ladder.ts";
import { rng } from "../src/math/random.ts";
import {
  nameOf,
  opSlip,
  opText,
  opValue,
  ratioOf,
  ratioText,
  rightOp,
  sideOf,
  sidesOf,
  stepsOf,
  TRIG_LADDER,
  trigNotice,
  trigNow,
  trigParts,
  trigStars,
  trigTask,
  valueText,
  type TrigTask,
} from "../src/math/trigBuild.ts";

const RAD = Math.PI / 180;
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;
const every = (fn: (t: TrigTask, where: string) => void) => {
  for (const level of GAME_LEVELS)
    for (let seed = 1; seed <= 400; seed++) {
      const t = trigTask(level, rng(seed));
      fn(t, `level ${level} seed ${seed}: ${JSON.stringify(t)}`);
    }
};

test("every triangle is right-angled, its side given whole, its angle 25° to 65°", () => {
  every((t, where) => {
    assert.ok(near(t.len.hyp ** 2, t.len.base ** 2 + t.len.up ** 2, 1e-6), where);
    assert.ok(t.angle >= 25 - 1e-9 && t.angle <= 65 + 1e-9 || t.ask === "ang", where);
    for (const n of t.known) assert.ok(Number.isInteger(t.len[sideOf(t.top, n)]), where);
    // θ is the angle the picture has at its corner.
    const foot = Math.atan2(t.len.up, t.len.base) / RAD;
    assert.ok(near(t.top ? 90 - foot : foot, t.angle, 1e-6), where);
    if (t.scene === "ramp") assert.equal(t.top, false, where);
    assert.ok(!t.known.includes(t.ask as never), where);
  });
});

test("each level asks what it should: a leg from the slant, then a leg, then anything", () => {
  every((t, where) => {
    if (t.level === 1) assert.ok(t.known[0] === "hyp" && t.ask !== "ang" && rightOp(t) === "mul", where);
    if (t.level === 2) assert.ok(t.known.length === 1 && t.known[0] !== "hyp" && t.ask !== "ang", where);
    if (t.ask === "ang") assert.ok(t.level === 3 && t.known.length === 2, where);
  });
});

test("the right rearrangement gives the side or the angle the triangle has", () => {
  every((t, where) => {
    const v = opValue(t, rightOp(t));
    assert.ok(near(v, trigParts(t).answer), where);
    if (t.ask === "ang") assert.ok(near(v, t.angle, 1e-6), where);
    else assert.ok(near(v, t.len[sideOf(t.top, t.ask)], 1e-6), where);
    assert.equal(new Set(t.ops).size, 3, where);
    assert.ok(t.ops.includes(rightOp(t)), where);
  });
});

test("the wrong rearrangements are told apart as the picture shows them", () => {
  every((t, where) => {
    for (const op of t.ops.filter((o) => o !== rightOp(t))) {
      const slip = opSlip(t, op);
      const v = opValue(t, op);
      if (t.ask === "hyp") assert.equal(slip, "shortHyp", where);
      else if (t.ask !== "ang" && t.known[0] === "hyp" && op === "div") assert.equal(slip, "longLeg", where);
      if (op === "fwd") assert.equal(slip, "notAngle", where);
      if (op === "invFlip") {
        // sin⁻¹ or cos⁻¹ of more than 1 is no angle; tan⁻¹ upside down is the triangle's other angle.
        if (ratioOf(sidesOf(t)) === "tan") assert.ok(slip === "otherAngle" && near(v, 90 - t.angle, 1e-6), where);
        else assert.ok(slip === "noAngle" && Number.isNaN(v), where);
      }
    }
  });
});

test("the sides take their names from θ: at the top, opposite and adjacent swap", () => {
  assert.equal(nameOf(false, "up"), "opp");
  assert.equal(nameOf(false, "base"), "adj");
  assert.equal(nameOf(true, "up"), "adj");
  assert.equal(nameOf(true, "base"), "opp");
  for (const top of [false, true]) for (const s of ["base", "up", "hyp"] as const) assert.equal(sideOf(top, nameOf(top, s)), s);
  assert.equal(ratioOf(["opp", "hyp"]), "sin");
  assert.equal(ratioOf(["hyp", "adj"]), "cos");
  assert.equal(ratioOf(["adj", "opp"]), "tan");
});

test("the scaffold fades: three sides named on easy, two on medium, none on hard", () => {
  every((t, where) => {
    const names = stepsOf(t).filter((s) => s.kind === "name");
    assert.equal(names.length, t.level === 1 ? 3 : t.level === 2 ? 2 : 0, where);
    assert.deepEqual(stepsOf(t).slice(-2).map((s) => s.kind), ["ratio", "op"], where);
  });
});

test("the working is written as on paper", () => {
  const rn = en.live.trigBuild.ratios;
  const t: TrigTask = { level: 1, scene: "ladder", mirror: false, top: false, angle: 35, len: { base: 12 * Math.cos(35 * RAD), up: 12 * Math.sin(35 * RAD), hyp: 12 }, known: ["hyp"], ask: "opp", ops: ["mul", "div", "flip"] };
  assert.equal(ratioText(t, rn), "sin 35° = x / 12");
  assert.equal(opText(t, "mul", rn), "x = 12 × sin 35°");
  assert.equal(opText(t, "div", rn), "x = 12 ÷ sin 35°");
  assert.equal(valueText(t, "mul"), "6.9 m");
  assert.equal(opSlip(t, "div"), "longLeg");
  const a: TrigTask = { ...t, level: 3, known: ["opp", "hyp"], ask: "ang", ops: ["inv", "fwd", "invFlip"], len: { base: 4, up: 3, hyp: 5 }, angle: Math.asin(3 / 5) / RAD };
  assert.equal(ratioText(a, rn), "sin θ = 3 / 5");
  assert.equal(opText(a, "inv", rn), "θ = sin⁻¹(3 ÷ 5)");
  assert.equal(valueText(a, "inv"), "36.9°");
  assert.equal(valueText(a, "invFlip"), "—");
});

test("the ladder runs easy to hard, with θ at the top, a division and an angle among its puzzles", () => {
  const tasks = TRIG_LADDER.map((_, stage) => trigNow({ mode: "puzzle", stage, level: 1, seed: 1 }));
  assert.deepEqual(tasks.map((t) => t.level), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
  assert.equal(tasks[0].top, false);
  assert.ok(tasks.slice(0, 3).some((t) => t.top));
  assert.ok(tasks.some((t) => rightOp(t) === "div"));
  assert.ok(tasks.some((t) => t.ask === "ang"));
  assert.ok(new Set(tasks.map((t) => t.scene)).size === 3);
});

test("stars and notices follow the rules", () => {
  assert.deepEqual([0, 1, 2, 5].map(trigStars), [3, 2, 1, 1]);
  const t = trigNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
  assert.equal(trigNotice(t, 0, 10), "streak10");
  assert.equal(trigNotice(t, 1, 3), null);
  const angle = TRIG_LADDER.map((_, stage) => trigNow({ mode: "puzzle", stage, level: 1, seed: 1 })).find((x) => x.ask === "ang")!;
  assert.equal(trigNotice(angle, 0, 1), "inverse");
  const div = TRIG_LADDER.map((_, stage) => trigNow({ mode: "puzzle", stage, level: 1, seed: 1 })).find((x) => x.ask !== "ang" && rightOp(x) === "div")!;
  assert.equal(trigNotice(div, 0, 1), "divide");
});
