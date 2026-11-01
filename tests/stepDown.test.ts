// Targeted step-down (issue #269): two wrong of the first three class-practice answers on a skill made of ideas bring
// three questions on its weakest idea, then the skill again; once per skill. It is on trial: nobody has it but the arm
// with it in a class testing it. A step-down question asks for the idea as nearly alone as any question does, on the
// easiest skill and level that can.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { classQuestion, stepDownExercise, studentHas, toClassPlan, type Plan } from "../src/learner.ts";
import { FEATURES, hasFeature, ON_TRIAL } from "../src/model/arms.ts";
import { bearing, IDEA_SKILLS, SKILL_IDEAS, usesOf, weakestIdea, type IdeaState } from "../src/model/ideaState.ts";
import { learnStepDown, noStepDown, STEP_DOWN_QUESTIONS, type StepDown } from "../src/model/stepDown.ts";
import { LogisticModel } from "../src/model/logistic.ts";
import { rng } from "../src/model/random.ts";

const w = en.pracWords;

test("two early misses step down to the weakest idea, three questions, then back to the skill, once", () => {
  const s = noStepDown();
  const ideas: IdeaState = { part: 0.9, lowest: 0.2, hcf: 0.2 };
  const answer = (correct: boolean | null, policy = "adaptive", skill = "fractions" as const) => learnStepDown(s, { skill, policy, correct }, ideas);
  const now = () => s.now;
  answer(true);
  answer(false);
  assert.equal(now(), undefined, "one miss of two");
  answer(null);
  answer(false, "review");
  answer(false, "spaced");
  answer(false, "free");
  assert.deepEqual(s.early, { fractions: { answered: 2, wrong: 1 } }, "nothing to go by, and anything but class practice, doesn't count");
  answer(false);
  assert.deepEqual(now(), { skill: "fractions", idea: weakestIdea(ideas, "fractions", () => 0), left: STEP_DOWN_QUESTIONS });
  assert.equal(now()?.idea, "lowest", "ties go to the first in the graph's order");
  for (let i = 0; i < STEP_DOWN_QUESTIONS - 1; i++) answer(true, "stepdown", "times" as never);
  assert.equal(now()?.left, 1);
  answer(false, "stepdown");
  assert.deepEqual([s.now, s.back], [undefined, "fractions"], "then back to the skill");
  answer(false, "review");
  assert.equal(s.back, "fractions", "a review is not the skill's question");
  answer(false);
  answer(false);
  assert.deepEqual(s, { early: { fractions: { answered: 3, wrong: 2 } } }, "back on the skill, and it steps down once only");
  answer(false, "stepdown");
  assert.deepEqual(s, { early: { fractions: { answered: 3, wrong: 2 } } }, "a stray step-down question moves nothing");
});

test("early answers: wrong on the third, a skill without ideas, and one step-down at a time", () => {
  const s: StepDown = noStepDown();
  const answer = (skill: "times" | "hcf" | "linear", correct: boolean) => learnStepDown(s, { skill: skill as never, policy: "fixed", correct }, {});
  for (const c of [false, false, false]) answer("linear", c);
  assert.deepEqual(s, { early: {} }, "a skill without ideas never steps down");
  answer("times", false);
  answer("times", true);
  answer("hcf", false);
  answer("times", false);
  assert.equal(s.now?.skill, "times", "two of three, the second on the third answer");
  answer("hcf", false);
  assert.equal(s.now?.skill, "times", "hcf failed early too, but one step-down at a time");
  answer("hcf", true);
  assert.deepEqual(s.early.hcf, { answered: 3, wrong: 2 }, "its early answers are over: hcf won't step down");
  answer("times", true);
  assert.deepEqual(s.early.times, { answered: 3, wrong: 2 }, "a skill's later answers aren't early");
});

test("step-down is on trial: only the arm with it in a class testing it has it", () => {
  assert.deepEqual([...ON_TRIAL], ["stepdown"]);
  assert.equal(FEATURES.at(-1), "stepdown", "a new feature joins at the end");
  assert.equal(studentHas(null, "stepdown"), false, "nobody signed in");
  assert.equal(studentHas({}, "stepdown"), false, "a student from before arms");
  assert.equal(studentHas(null, "spaced"), true);
  assert.equal(hasFeature({ feature: "stepdown", arm: "on" }, "stepdown"), true);
  assert.equal(hasFeature({ feature: "stepdown", arm: "off" }, "stepdown"), false);
  assert.equal(hasFeature({ feature: "spaced", arm: "on" }, "stepdown"), false, "not in a class testing something else");
  assert.equal(hasFeature({ feature: "stepdown", arm: "off" }, "spaced"), true, "the features not under test stay on");
});

test("a step-down question asks for the idea, as nearly alone as any question, on the easiest skill and level that can", () => {
  for (const idea of SKILL_IDEAS.fractions) {
    const ex = stepDownExercise(idea, w, rng(3).next);
    assert.ok(usesOf(ex).includes(idea), `${idea}: ${ex.skill} ${ex.level}`);
    // No question of any skill or level bears more on the idea than the one chosen.
    let most = 0;
    for (const skill of IDEA_SKILLS)
      for (const level of [1, 2, 3] as const)
        for (let seed = 1; seed <= 40; seed++) most = Math.max(most, bearing(exercise(skill, level, seed, w), idea));
    assert.ok(bearing(ex, idea) >= most - 1e-9, `${idea}: ${bearing(ex, idea)} of ${most}`);
  }
  assert.deepEqual([stepDownExercise("multiplyFacts", w, rng(1).next).skill, stepDownExercise("hcf", w, rng(1).next).skill], ["times", "hcf"], "the earliest skill");
  assert.equal(stepDownExercise("toMixed", w, rng(1).next).skill, "fractions");
  assert.throws(() => stepDownExercise("nothing", w), /no skill needs/);
});

test("class practice: a step-down question while one is under way, then the skill it came from, only for the arm with it", () => {
  const base: Plan = {
    class: "C", phase: "session", sessionEnds: null, testLength: 12, tests: {} as Plan["tests"],
    condition: "adaptive", feature: "stepdown", arm: "on", skills: ["times", "hcf", "fractions"], position: 0, recent: [], ideas: {}, ema: {},
    state: new LogisticModel().state([]),
  };
  const plan = toClassPlan({ ...base, stepDown: { early: {}, now: { skill: "fractions", idea: "lcm", left: 2 } } });
  const q = classQuestion(plan, w, {}, rng(2).next);
  assert.equal(q.policy, "stepdown");
  assert.ok(usesOf(q.ex).includes("lcm"));
  plan.stepDown = { early: {}, back: "fractions" };
  for (let seed = 1; seed <= 5; seed++) {
    const back = classQuestion(plan, w, {}, rng(seed).next);
    assert.deepEqual([back.policy, back.ex.skill], ["adaptive", "fractions"]);
  }
  // The arm without it, though a step-down were somehow kept: the condition's choice.
  const without = toClassPlan({ ...base, arm: "off", stepDown: { early: {}, now: { skill: "fractions", idea: "lcm", left: 2 } } });
  assert.equal(classQuestion(without, w, {}, rng(2).next).policy, "adaptive");
  assert.deepEqual(toClassPlan(base).stepDown, { early: {} }, "a plan from before step-down");
});
