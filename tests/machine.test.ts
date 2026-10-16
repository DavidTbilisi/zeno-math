// Guess my rule: every rule fits its level, answers and undoes itself, the table and working say what the rule does,
// the two slips are named only when they differ from the answer, and the board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { rng } from "../src/math/random.ts";
import {
  apply,
  MACHINE_LADDER,
  machineAnswer,
  machineNotice,
  machineNow,
  machineRule,
  machineStars,
  machineTask,
  readWhole,
  ruleQuestion,
  ruleSteps,
  ruleTable,
  ruleTex,
  scaledOutput,
  undo,
  undoOrder,
} from "../src/math/machine.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every rule fits its level; every question has a whole answer the rule gives back", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const r = machineRule(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${ruleTex(r)}`;
      if (level === 1) assert.ok((r.mul === 1) !== (r.add === 0), `${where}: one step`);
      else assert.ok(r.mul >= 2 && r.add !== 0, `${where}: two steps`);
      for (const t of [machineTask(level, rng(seed)), ruleQuestion(level, rng(seed))]) {
        const v = machineAnswer(t);
        assert.ok(Number.isInteger(v), where);
        if (t.ask.dir === "in") assert.equal(apply(t.rule, v), t.ask.out, where);
        else assert.ok(t.ask.n >= 10, `${where}: bigger than the table`);
        assert.match(ruleSteps(t).at(-1)!, new RegExp(`= ${v}$`), where);
      }
      assert.equal(undo(r, apply(r, 7)), 7);
    }
  assert.ok(Array.from({ length: 60 }, (_, i) => machineTask(3, rng(i + 1))).some((t) => t.ask.dir === "in"), "backwards at hard");
});

test("the table, the rule and the slips", () => {
  assert.equal(ruleTex({ mul: 3, add: -2 }), "3n - 2");
  assert.equal(ruleTex({ mul: 1, add: 7 }), "n + 7");
  assert.equal(ruleTex({ mul: 4, add: 0 }), "4n");
  const q = { level: 2 as const, rule: { mul: 3, add: 2 }, shown: [1, 2, 3, 10], ask: { dir: "out" as const, n: 20 } };
  assert.equal(ruleTable(q), "1 \\mapsto 5, \\quad 2 \\mapsto 8, \\quad 3 \\mapsto 11, \\quad 10 \\mapsto 32, \\quad 20 \\mapsto \\;?");
  assert.deepEqual(scaledOutput(q), { v: 64, m: 10, k: 2, o: 32 });
  assert.equal(scaledOutput({ ...q, rule: { mul: 3, add: 0 } }), null, "doubling does double when nothing is added");
  const back = { ...q, level: 3 as const, ask: { dir: "in" as const, out: 47 } };
  assert.equal(machineAnswer(back), 15);
  assert.ok(Math.abs(undoOrder(back)! - (47 / 3 - 2)) < 1e-9);
  assert.equal(undoOrder({ ...back, rule: { mul: 1, add: 5 } }), null);
  assert.equal(undoOrder(q), null);
  assert.deepEqual(["12", " -4 ", "−3", "1.5", "", "x"].map(readWhole), [12, -4, -3, null, null, null]);
});

test("in practice: the answer typed, the slips named; the server agrees", () => {
  for (const level of LEVELS) {
    const ex = exercise("findRule", level, 7, w);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.ok(ex.q.includes("\\mapsto") && ex.steps?.length);
  }
  const named = new Set<string>();
  for (const level of LEVELS)
    for (let seed = 1; seed <= 60; seed++) {
      const ex = exercise("findRule", level, seed, w);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
        named.add(t.id);
      }
    }
  assert.deepEqual([...named].sort(), ["scaledOutput", "undoOrder"]);
  const q = { skill: "findRule" as const, level: 1, seed: 7 };
  assert.deepEqual([mark(q, "22"), mark(q, "28")], ["correct", "wrong"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([machineStars(0), machineStars(1), machineStars(3)], [3, 2, 1]);
  const t = { level: 2 as const, rule: { mul: 3, add: 2 }, ask: { dir: "out" as const, n: 20 } };
  assert.equal(machineNotice(t, [0, 1], 0, 10), "streak10");
  assert.equal(machineNotice({ ...t, ask: { dir: "in", out: 47 } }, [4, 5, 6], 0, 1), "backwards");
  assert.equal(machineNotice(t, [4, 5], 0, 1), "fewTries");
  assert.equal(machineNotice(t, [0, 4, 5], 0, 1), "zero");
  assert.equal(machineNotice(t, [4, 5, 6], 1, 0), null);
  MACHINE_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(machineNow({ mode: "puzzle", stage, level: 1, seed: 0 }), machineTask(level, rng(seed))));
  assert.deepEqual(machineNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), machineTask(3, rng(8)));
});
