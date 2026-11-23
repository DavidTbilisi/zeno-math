// Today (#585): one session from the learner's own state, in the order of the four learning stages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { standing } from "../src/model/course.ts";
import { SECURE_RUN, type Cells } from "../src/model/placement.ts";
import { DAY, type Spacing } from "../src/model/spacing.ts";
import type { Stages } from "../src/model/learningStage.ts";
import { buildToday, TODAY_REVIEWS, todaySkills, type TodayInput } from "../src/model/today.ts";

const NOW = 100 * DAY;
const secure = (...keys: string[]): Cells => Object.fromEntries(keys.map((k) => [k, { seen: SECURE_RUN, right: SECURE_RUN, run: SECURE_RUN }]));
const input = (o: Partial<TodayInput> & { cells?: Cells } = {}): TodayInput => ({
  now: NOW, standing: standing(o.cells ?? {}, null), spacing: {}, stages: {}, toPredict: [], ...o,
});

test("an empty student: only the course's first new idea", () => {
  const parts = buildToday(input());
  assert.equal(parts.length, 1);
  assert.equal(parts[0].part, "idea");
});

test("a student with reviews due only: the reviews, oldest first, at most three, each skill once, cards on skills made of ideas", () => {
  const spacing: Spacing = {
    "times.2": { step: 1, due: NOW - 3 * DAY },
    "fractions.1": { step: 0, due: NOW - 5 * DAY },
    "fractions.2": { step: 0, due: NOW - 4 * DAY }, // fractions again: once is enough
    "integers.1": { step: 0, due: NOW - DAY },
    "percent.1": { step: 0, due: NOW - 2 * DAY },
    "decimals.1": { step: 0, due: NOW + DAY }, // not due yet
    "rounding.1": { step: 0, due: NOW - 9 * DAY, again: true }, // being practised again, not a review
  };
  // Nothing left to learn next: every level the course has is secure (the idea part is then left out).
  const all = standing({}, null);
  const done = { ...all, level: () => "secure" as const };
  const parts = buildToday(input({ spacing, standing: done }));
  assert.deepEqual(parts.map((p) => p.part), ["review", "review", "review"]);
  assert.equal(parts.length, TODAY_REVIEWS);
  assert.deepEqual(parts.map((p) => [p.skill, (p as { level: number }).level]), [["fractions", 1], ["times", 2], ["percent", 1]]);
  assert.deepEqual(parts.map((p) => (p as { card: boolean }).card), [true, true, false]);
});

test("a full student: reviews, a new idea with its prediction, a drill on the green skill, a problem for the gold one", () => {
  const cells = secure("times.1", "times.2", "times.3", "fractions.1", "fractions.2", "fractions.3", "ratio.1", "ratio.2", "ratio.3", "integers.1");
  const stages: Stages = { times: { stage: 3 }, fractions: { stage: 2 }, ratio: { stage: 3 }, integers: { stage: 1 } };
  const spacing: Spacing = { "integers.1": { step: 0, due: NOW - DAY } };
  const s = input({ cells, standing: standing(cells, null), stages, spacing, toPredict: ["fractions", "geometry", "numbers"] });
  const parts = buildToday(s);
  assert.deepEqual(parts.map((p) => p.part), ["review", "idea", "drill", "problem"]);
  assert.deepEqual(parts[0], { part: "review", skill: "integers", level: 1, card: true });
  const idea = parts[1] as Extract<(typeof parts)[number], { part: "idea" }>;
  assert.equal(s.standing.level(idea.skill, idea.level), "open", "the idea is a level still to learn");
  assert.ok(idea.predict === null || s.toPredict.includes(idea.predict));
  assert.deepEqual(parts[2], { part: "drill", skill: "fractions", level: 3 }, "green, on the top level: nearest to gold");
  const problem = parts[3] as Extract<(typeof parts)[number], { part: "problem" }>;
  assert.equal(problem.skill, "times", "gold first, in course order");
  assert.equal(problem.setting.via, "words");
  assert.equal(new Set(todaySkills(parts)).size, parts.length, "each part a different skill");
  assert.deepEqual(buildToday(s), parts, "the same state, the same session");
});

test("a blue skill only: the drill is its first level not yet secure; no problem without green or gold", () => {
  const cells = secure("fractions.1");
  const parts = buildToday(input({ cells, standing: standing(cells, null), stages: { fractions: { stage: 1 } } }));
  const drill = parts.find((p) => p.part === "drill");
  assert.deepEqual(drill, { part: "drill", skill: "fractions", level: 2 });
  assert.equal(parts.some((p) => p.part === "problem"), false);
});
