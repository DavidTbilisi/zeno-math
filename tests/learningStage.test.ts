// Learning stages (issue #576): answer sequences replayed, with the spaced reviews of spacing.ts deciding which answer
// is a review, into each of the four stages; a stage is reached only in order; a review missed after gold drops the
// skill back to blue until it is mastered again and kept again; and the same answers give the same stage.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Level } from "../src/model/elo.ts";
import { FAST_RUN, learningStageOf, learnStage, PACE_MIN, type LearningStage, type Stages } from "../src/model/learningStage.ts";
import { DAY, isDue, learnSpacing, type Spacing } from "../src/model/spacing.ts";

const T = Date.UTC(2026, 10, 1, 9);
type Answer = { at: number; level?: Level; correct?: boolean; ms?: number; transfer?: boolean };

/** A learner on one skill: mastered after three right in a row, as free practice secures a level. */
function learner() {
  const spacing: Spacing = {};
  const stages: Stages = {};
  let run = 0;
  const answer = ({ at, level = 3, correct = true, ms, transfer }: Answer): LearningStage => {
    run = correct ? run + 1 : 0;
    const review = isDue(spacing.k, at);
    learnSpacing(spacing, "k", correct, run >= 3, at);
    learnStage(stages, "k", { level, correct, mastered: run >= 3, review, ms, transfer });
    return learningStageOf(stages, "k");
  };
  return { spacing, stages, answer };
}

/** Mastered at T (blue), and the review a day later right (green); the learner took 20 s over each top-level answer. */
function green() {
  const l = learner();
  for (let i = 0; i < 3; i++) l.answer({ at: T + i, ms: 20_000 });
  assert.equal(l.answer({ at: T + DAY + 10, ms: 20_000 }), 2);
  return l;
}
/** Then fast top-level answers, right, until gold. */
function gold() {
  const l = green();
  let at = T + DAY + 100;
  for (let i = 0; i < FAST_RUN; i++) l.answer({ at: at++, ms: 8_000 });
  assert.equal(learningStageOf(l.stages, "k"), 3);
  return l;
}

test("nothing until the skill is mastered; then blue", () => {
  const l = learner();
  assert.equal(learningStageOf(l.stages, "k"), 0);
  assert.equal(l.answer({ at: T }), 0);
  assert.equal(l.answer({ at: T + 1, correct: false }), 0);
  assert.equal(l.answer({ at: T + 2 }), 0);
  assert.equal(l.answer({ at: T + 3 }), 0);
  assert.equal(l.answer({ at: T + 4 }), 1, "three right in a row: mastered once");
  assert.equal(l.answer({ at: T + 5, correct: false }), 1, "a miss outside a review takes nothing away");
});

test("green only through a right spaced review, a day or more later", () => {
  const l = learner();
  for (let i = 0; i < 3; i++) l.answer({ at: T + i });
  // Right answers the same day are practice, not a review.
  for (let i = 0; i < 5; i++) assert.equal(l.answer({ at: T + 1000 + i }), 1);
  assert.equal(l.answer({ at: T + DAY + 5 }), 2, "the review a day later went right");
  green();
});

test("gold: after green, a run of right top-level answers at or under the learner's own pace", () => {
  const l = green();
  let at = T + DAY + 100;
  // A wrong one breaks the run, a slow one too; then FAST_RUN fast right ones in a row.
  assert.equal(l.answer({ at: at++, ms: 8_000 }), 2);
  assert.equal(l.answer({ at: at++, ms: 8_000, correct: false }), 2);
  assert.equal(l.answer({ at: at++, ms: 8_000 }), 2);
  assert.equal(l.answer({ at: at++, ms: 60_000 }), 2);
  for (let i = 1; i < FAST_RUN; i++) assert.equal(l.answer({ at: at++, ms: 8_000 }), 2);
  assert.equal(l.answer({ at: at++, ms: 8_000 }), 3);
  assert.equal(l.stages.k.fast, FAST_RUN);
  gold();
});

test("speed is judged only on the top level, with a time, and against a pace of PACE_MIN answers or more", () => {
  // Fast answers on a lower level or without a usable time move nothing.
  const low = green();
  for (let i = 0; i < 2 * FAST_RUN; i++) assert.equal(low.answer({ at: T + DAY + 100 + i, level: 2, ms: 1_000 }), 2);
  for (let i = 0; i < 2 * FAST_RUN; i++) assert.equal(low.answer({ at: T + DAY + 200 + i }), 2);
  for (let i = 0; i < 2 * FAST_RUN; i++) assert.equal(low.answer({ at: T + DAY + 300 + i, ms: 10 }), 2);
  // A learner whose first top-level answers come after green has no pace to beat until PACE_MIN of them are timed.
  const l = learner();
  for (let i = 0; i < 3; i++) l.answer({ at: T + i, level: 1 });
  assert.equal(l.answer({ at: T + DAY + 10, level: 1 }), 2);
  let at = T + DAY + 100;
  for (let i = 0; i < PACE_MIN; i++) assert.equal(l.answer({ at: at++, ms: 9_000 }), 2);
  assert.equal(l.stages.k.fast, 0);
  for (let i = 1; i < FAST_RUN; i++) assert.equal(l.answer({ at: at++, ms: 9_000 }), 2);
  assert.equal(l.answer({ at: at++, ms: 9_000 }), 3, "as quick as their own pace counts");
});

test("fast answers before green don't count towards gold, and a stage is reached only in order", () => {
  const l = learner();
  // Quick from the start: mastered, and a run of fast right top-level answers the same day. Still blue.
  for (let i = 0; i < 10; i++) l.answer({ at: T + i, ms: i < 4 ? 20_000 : 5_000 });
  assert.equal(learningStageOf(l.stages, "k"), 1);
  assert.equal(l.answer({ at: T + 20, transfer: true, ms: 5_000 }), 1, "a mixed question right is not purple while blue");
  assert.equal(l.answer({ at: T + DAY + 10, ms: 5_000 }), 2, "the review: green, and the run starts over");
  assert.equal(l.stages.k.fast, 1);
  const g = green();
  assert.equal(g.answer({ at: T + DAY + 50, transfer: true }), 2, "nor while green");
});

test("purple: after gold, right on a question that mixes the skill or hides it in words", () => {
  const l = gold();
  assert.equal(l.answer({ at: T + DAY + 500, transfer: true, correct: false }), 3, "wrong on one: still gold");
  assert.equal(l.answer({ at: T + DAY + 501, transfer: true }), 4);
  assert.equal(l.answer({ at: T + DAY + 502, ms: 90_000 }), 4, "a slow answer takes nothing away");
});

test("a review failed after gold drops the skill to blue until it is mastered and kept again", () => {
  const l = gold();
  const due = l.spacing.k.due;
  assert.equal(l.answer({ at: due + 10, correct: false }), 1, "the review three days on went wrong");
  assert.equal(l.stages.k.fast, 0);
  assert.equal(l.spacing.k.again, true);
  // Mastered again: still blue, since nothing was kept. Fast answers now don't count until it is green.
  for (let i = 0; i < 3; i++) assert.equal(l.answer({ at: due + 20 + i, ms: 5_000 }), 1);
  for (let i = 0; i < 5; i++) assert.equal(l.answer({ at: due + 30 + i, ms: 5_000 }), 1);
  // The review a day after relearning goes right: green, then gold again with a new run.
  const back = l.spacing.k.due;
  assert.equal(l.answer({ at: back + 10, ms: 5_000 }), 2, "the review itself is the first of the new run");
  for (let i = 2; i < FAST_RUN; i++) assert.equal(l.answer({ at: back + 20 + i, ms: 5_000 }), 2);
  assert.equal(l.answer({ at: back + 40, ms: 5_000 }), 3);
  // And from purple too.
  assert.equal(l.answer({ at: back + 50, transfer: true }), 4);
  assert.equal(l.answer({ at: l.spacing.k.due + 1, correct: false }), 1);
});

test("the same answers give the same stage, whoever replays them", () => {
  const answers: Answer[] = [];
  let at = T;
  for (let i = 0; i < 60; i++) {
    at += (i % 7 === 0 ? DAY : 1000) + i;
    answers.push({ at, level: ((i % 3) + 1) as Level, correct: i % 5 !== 2, ms: 3_000 + ((i * 7919) % 20_000), transfer: i % 11 === 0 });
  }
  const a = learner();
  const b = learner();
  const seen = answers.map((x) => a.answer(x));
  assert.deepEqual(answers.map((x) => b.answer(x)), seen);
  assert.deepEqual(a.stages, b.stages);
  // A stage never jumps a stage: up by one at most, and only a missed review takes it down (to blue).
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] <= seen[i - 1] + 1 && (seen[i] >= seen[i - 1] || seen[i] === 1));
  assert.equal(learningStageOf(undefined, "k"), 0);
});
