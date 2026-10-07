// The answer checker against a teacher's marking (tests/fixtures/answers.json, scripts/checker-agreement.ts). The
// thresholds are today's figures: a change to the checker may move answers between "sent back" and a verdict, but
// mustn't start crediting wrong answers, rejecting right ones, or agreeing less overall.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SKILLS } from "../src/math/practice.ts";
import { agreement, LABELS, loadAnswers } from "../scripts/checker-agreement.ts";

const answers = loadAnswers();

test("the labelled answers cover every skill and every verdict", () => {
  assert.deepEqual(new Set(answers.map((a) => a.skill)), new Set(ALL_SKILLS));
  for (const l of LABELS) assert.ok(answers.some((a) => a.label === l), l);
});

test("the checker agrees with the teacher's marking at least as often as it did", () => {
  const r = agreement(answers);
  assert.ok(r.agreed / r.n >= 0.89, `agreement ${r.agreed} of ${r.n}`);
  assert.ok(r.falseAccepts <= 2, `wrong answers accepted: ${r.disagreements.filter((d) => d.checker === "correct").map((d) => `${d.skill} ${d.input}`).join(", ")}`);
  assert.ok(r.falseRejects <= 1, `right answers rejected: ${r.disagreements.filter((d) => d.label === "correct" && d.checker !== "form").map((d) => `${d.skill} ${d.input}`).join(", ")}`);
  // Every wrong answer is marked wrong: nothing a teacher would mark wrong is credited or sent back.
  assert.equal(r.matrix.wrong.wrong, answers.filter((a) => a.label === "wrong").length);
});
