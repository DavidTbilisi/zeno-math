// The teacher's stuck list (issue #267): stuck is ten questions or more on a skill since the last three right in a row
// (or since the teacher marked it seen); the reason is the mistake repeated, else the idea ticked as hard, else the
// weakest idea; students sharing a reason are grouped, the biggest group first and those with none last.
import { test } from "node:test";
import assert from "node:assert/strict";
import { becauseOf, groupByReason, isStuckNow, mostOften, reasonKey, sinceLastStreak, type Because, type Example, type Try } from "../src/model/stuckList.ts";
import type { MistakeId } from "../src/math/mistakes.ts";

const tries = (pattern: string, from = 1): Try[] => [...pattern].map((c, i) => ({ id: from + i, correct: c === "1" }));
const ids = (ts: readonly Try[]) => ts.map((t) => t.id);

test("the questions since the last three right in a row, or since the attempt marked seen", () => {
  assert.deepEqual(ids(sinceLastStreak(tries("0000000000"))), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(isStuckNow(sinceLastStreak(tries("0000000000"))));
  assert.ok(!isStuckNow(sinceLastStreak(tries("000000000"))), "nine is not yet stuck");
  // Two right in a row don't end it, three do; a fourth right starts a new count.
  assert.equal(sinceLastStreak(tries("0110110110")).length, 10);
  assert.deepEqual(ids(sinceLastStreak(tries("0000000111"))), []);
  assert.deepEqual(ids(sinceLastStreak(tries("00001110100"))), [8, 9, 10, 11]);
  assert.deepEqual(ids(sinceLastStreak(tries("1111"))), [4]);
  // Seen through attempt 6: only what came after counts, and a streak can't straddle it.
  assert.deepEqual(ids(sinceLastStreak(tries("0000110000000"), 6)), [7, 8, 9, 10, 11, 12, 13]);
  assert.deepEqual(ids(sinceLastStreak(tries("0000011000"), 5)), [6, 7, 8, 9, 10]);
  assert.deepEqual(ids(sinceLastStreak(tries("0000"), 99)), []);
});

test("what comes up on the most questions, each question counted once, the latest on a tie, and only when repeated", () => {
  assert.deepEqual(mostOften([["a", "a"], ["b"]]), null, "a twice on one question is not repeated");
  assert.deepEqual(mostOften([["a"], ["b"], ["a"], ["b"], ["c"]]), { key: "b", times: 2 });
  assert.deepEqual(mostOften([["a"], ["a"], ["b"], ["b"], ["b"]]), { key: "b", times: 3 });
  assert.deepEqual(mostOften([["a"]], 1), { key: "a", times: 1 });
  assert.deepEqual(mostOften([]), null);
});

test("the reason: a repeated mistake with its latest example, else a repeated tick, else the weakest idea, else none", () => {
  const ex = (input: string): Example => ({ skill: "fractions", level: 1, seed: 7, input });
  const found = new Map<number, { mistake: MistakeId; example: Example }[]>([
    [1, [{ mistake: "addAcross", example: ex("2/7") }]],
    [3, [{ mistake: "sign", example: ex("-1") }]],
    [4, [{ mistake: "addAcross", example: ex("3/9") }, { mistake: "addAcross", example: ex("3/10") }]],
  ]);
  const since: Try[] = [...tries("00000"), { id: 6, correct: false, hard: ["lowest"] }, { id: 7, correct: false, hard: ["lowest", "part"] }];
  const weakest = { idea: "commonDenom", known: 0.2 };
  assert.deepEqual(becauseOf(since, (t) => found.get(t.id) ?? [], weakest), { kind: "mistake", mistake: "addAcross", times: 2, example: ex("3/10") });
  assert.deepEqual(becauseOf(since, () => [], weakest), { kind: "ticked", idea: "lowest", times: 2 });
  assert.deepEqual(becauseOf(tries("000"), () => [], weakest), { kind: "weakest", idea: "commonDenom", known: 0.2 });
  assert.equal(becauseOf(tries("000"), () => []), null);
});

test("students grouped by a shared reason: ideas ticked or weakest alike, the biggest group first, no reason last", () => {
  const mistake: Because = { kind: "mistake", mistake: "addAcross", times: 2, example: { skill: "fractions", level: 1, seed: 1, input: "2/7" } };
  const rows = [
    { name: "a", answers: 12, because: null },
    { name: "b", answers: 10, because: { kind: "ticked", idea: "lowest", times: 3 } as Because },
    { name: "c", answers: 11, because: mistake },
    { name: "d", answers: 14, because: { kind: "weakest", idea: "lowest", known: 0.3 } as Because },
    { name: "e", answers: 10, because: { kind: "weakest", idea: "part", known: 0.4 } as Because },
  ];
  const groups = groupByReason(rows);
  assert.deepEqual(groups.map((g) => [g.key, g.rows.map((r) => r.name)]), [
    ["idea:lowest", ["d", "b"]], ["idea:part", ["e"]], ["mistake:addAcross", ["c"]], ["", ["a"]],
  ]);
  assert.equal(reasonKey(null), "");
  assert.deepEqual(groupByReason([]), []);
});
