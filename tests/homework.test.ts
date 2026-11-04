// Homework made for one student (issue #297): spaced reviews that are due first, then the adaptive policy's questions,
// interleaved and aimed at the weakest idea, then one harder question; the browser asks the first one not answered,
// marks it answered once the attempt is applied, and keeps that across a fresh plan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { exercise, type SkillId } from "../src/math/practice.ts";
import { homeworkFor, repairLevel, type HomeworkInput } from "../src/homework.ts";
import { HOMEWORK_REPAIRS, HOMEWORK_REVIEWS, homeworkIndex, nextHomework, type Homework } from "../src/model/homework.ts";
import { hasIdeas } from "../src/model/ideaState.ts";
import { DAY, type Spacing } from "../src/model/spacing.ts";
import { rng } from "../src/model/random.ts";
import { applyAttempt, toClassPlan, withProtocol, type Attempt, type Plan } from "../src/learner.ts";
import { priorState } from "../src/model/classModel.ts";

const NOW = 100 * DAY;
/** A model that gives every skill the same chances: easy 0.9, medium 0.75 (the target), hard 0.55 (not mastered). */
const flat = { predictAt: (_s: string, _k: string, level: number) => ({ 1: 0.9, 2: 0.75, 3: 0.55 })[level as 1 | 2 | 3] };
const SKILLS: SkillId[] = ["times", "fractions", "linear"];
const input = (spacing: Spacing = {}): HomeworkInput => ({ model: flat, student: "me", skills: SKILLS, ideas: {}, ema: {}, spacing, now: NOW });

test("homework: reviews due first (oldest first, each skill once), then practice at the target, interleaved, then one stretch", () => {
  const spacing: Spacing = {
    linear: { step: 1, due: NOW - 2 * DAY },
    times: { step: 0, due: NOW - 5 * DAY },
    fractions: { step: 0, due: NOW + DAY }, // not due yet
    algebra: { step: 0, due: NOW - 9 * DAY }, // not one of the class's skills
  };
  const items = homeworkFor(input(spacing), 8, rng(7).next);
  assert.equal(items.length, 8);
  assert.deepEqual(items.slice(0, 2).map((i) => [i.why, i.skill, i.level]), [["review", "times", 3], ["review", "linear", 3]]);
  const practice = items.filter((i) => i.why === "practice");
  assert.equal(practice.length, 5);
  assert.ok(practice.every((i) => i.level === 2), "practice aims at three in four right");
  // The recency penalty keeps any skill from coming twice in a row.
  for (let i = 1; i < items.length - 1; i++) assert.notEqual(items[i].skill, items[i - 1].skill, `questions ${i} and ${i + 1}`);
  assert.deepEqual([items[7].why, items[7].level], ["stretch", 3], "the stretch aims at an even chance");
  // On a skill made of ideas, practice aims at an idea; elsewhere it doesn't.
  for (const i of items.filter((i) => i.why !== "review")) assert.equal(!!i.idea, hasIdeas(i.skill), i.skill);
  // Every question rebuilds from its skill, level and seed.
  for (const i of items) assert.equal(exercise(i.skill, i.level, i.seed, en.pracWords).skill, i.skill);
  // The same random numbers make the same homework.
  assert.deepEqual(homeworkFor(input(spacing), 8, rng(7).next), items);
});

test("homework: no more than two reviews, always at least one practice question and the stretch", () => {
  const due = Object.fromEntries(SKILLS.map((k, i) => [k, { step: 0, due: NOW - (i + 1) * DAY }]));
  assert.equal(homeworkFor(input(due), 8, rng(1).next).filter((i) => i.why === "review").length, HOMEWORK_REVIEWS);
  assert.deepEqual(homeworkFor(input(due), 4, rng(1).next).map((i) => i.why), ["review", "review", "practice", "stretch"]);
  assert.deepEqual(homeworkFor(input(), 4, rng(1).next).map((i) => i.why), ["practice", "practice", "practice", "stretch"]);
});

test("homework for a stuck student (issue #303): two repair questions first, on that skill at the level closest to 0.85, aimed at the idea; reviews and practice after", () => {
  const spacing: Spacing = { linear: { step: 0, due: NOW - DAY }, times: { step: 0, due: NOW - 2 * DAY } };
  const items = homeworkFor({ ...input(spacing), repair: { skill: "fractions", idea: "commonDenom" } }, 8, rng(5).next);
  assert.equal(items.length, 8);
  assert.deepEqual(items.slice(0, HOMEWORK_REPAIRS).map((i) => [i.why, i.skill, i.level, i.idea]), [["repair", "fractions", 1, "commonDenom"], ["repair", "fractions", 1, "commonDenom"]]);
  assert.deepEqual(items.slice(2, 4).map((i) => i.why), ["review", "review"]);
  assert.deepEqual(items.slice(4).map((i) => i.why), ["practice", "practice", "practice", "stretch"]);
  // Short homework: the repair keeps its place, the reviews give theirs up, and practice and the stretch stay.
  assert.deepEqual(homeworkFor({ ...input(spacing), repair: { skill: "fractions" } }, 4, rng(5).next).map((i) => i.why), ["repair", "repair", "practice", "stretch"]);
  // A skill the class doesn't practise gets no repair.
  assert.ok(!homeworkFor({ ...input(), repair: { skill: "integers" } }, 8, rng(5).next).some((i) => i.why === "repair"));
  // The level: closest to 0.85, the easier on a tie.
  assert.equal(repairLevel(flat, "me", "times"), 1);
  assert.equal(repairLevel({ predictAt: (_s, _k, L) => ({ 1: 0.99, 2: 0.86, 3: 0.6 })[L as 1 | 2 | 3] }, "me", "times"), 2);
  assert.equal(repairLevel({ predictAt: (_s, _k, L) => ({ 1: 0.95, 2: 0.75, 3: 0.6 })[L as 1 | 2 | 3] }, "me", "times"), 1);
});

test("homework in the browser: the first question not answered comes next, an attempt marks it answered, and a fresh plan keeps that", () => {
  const items = homeworkFor(input(), 4, rng(3).next);
  const homework: Homework = { id: 5, createdAt: NOW, items, done: [] };
  assert.deepEqual(nextHomework(homework), { item: items[0], index: 0 });
  assert.equal(nextHomework({ ...homework, done: [0, 1, 2, 3] }), null);
  assert.equal(nextHomework(null), null);
  assert.equal(homeworkIndex(homework, items[2]), 2);
  assert.equal(homeworkIndex(homework, { ...items[2], seed: items[2].seed + 1 }), -1);

  const raw = {
    class: "C", phase: "closed", sessionEnds: null, testLength: 4, tests: { pre: { form: "A", answered: [] }, post: { form: "B", answered: [] }, delayed: { form: "C", answered: [] } },
    condition: "fixed", feature: "policy", arm: "off", skills: SKILLS, position: 0, recent: [], state: priorState(), ideas: {}, ema: {}, homework,
  } as unknown as Plan;
  const plan = toClassPlan(structuredClone(raw));
  const a = (q: (typeof items)[number]): Attempt => ({
    clientId: `hw-${q.seed}`, student: "S", skill: q.skill, level: q.level, seed: q.seed, review: false, outcome: "solved", policy: "homework", predicted: 0.75,
    solutionViewed: false, msTotal: 9000, answers: [{ input: "1", verdict: "correct", ms: 9000 }], shownAt: NOW,
  });
  applyAttempt(plan, a(items[0]));
  assert.deepEqual(plan.homework!.done, [0]);
  assert.equal(plan.position, 0, "homework doesn't move the fixed sequence on");
  assert.deepEqual(nextHomework(plan.homework)?.index, 1);
  // The server hasn't got that answer yet: its plan says nothing is done, and the browser's mark stays.
  applyAttempt(plan, a(items[2]));
  const fresh = withProtocol(plan, { ...raw, homework: { ...homework, done: [1] } });
  assert.deepEqual(fresh.homework!.done.sort(), [0, 1, 2]);
  // New homework replaces the old, marks and all; none at all when the class has none open.
  assert.deepEqual(withProtocol(plan, { ...raw, homework: { ...homework, id: 6, done: [] } }).homework!.done, []);
  assert.equal(withProtocol(plan, { ...raw, homework: null }).homework, null);
});
