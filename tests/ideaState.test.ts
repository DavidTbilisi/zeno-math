// The student's ideas as the app keeps them (src/model/ideaState.ts): a question moves only the ideas it needs, a
// recognised mistake is blamed on its one idea, a skill without a graph says nothing, what a student ticks as hard
// lowers the ticked ideas and raises the rest by Bayes; the weakest idea is the lowest,
// a random one while all are level; a question bears most on an idea when it asks for it alone, and exerciseFor
// (src/learner.ts) finds that question: on fractions, the form for the idea.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { AIM_TRIES, exerciseFor } from "../src/learner.ts";
import { exercise, trapInputs, type Exercise, type FractionForm, type Level } from "../src/math/practice.ts";
import { bktStep } from "../src/model/evaluate.ts";
import {
  asksWhatWasHard, bearing, conjunctiveStep, hasIdeas, IDEA_PRIOR, knownOf, learnIdeas, SKILL_IDEAS, TICK_PRIOR, tickStep, usesOf, weakestIdea, type IdeaState,
} from "../src/model/ideaState.ts";
import { rng } from "../src/model/random.ts";

const w = en.pracWords;
const formOf = (ex: Exercise) => (ex.solution?.spec as { form?: FractionForm }).form;
/** The first fractions question at the level that has the trap, or the form. */
function fractions(level: Level, want: { trap?: string; form?: FractionForm }): Exercise {
  for (let seed = 1; seed <= 2000; seed++) {
    const ex = exercise("fractions", level, seed, w);
    if (want.trap && !trapInputs(ex).some((t) => t.id === want.trap)) continue;
    if (want.form && formOf(ex) !== want.form) continue;
    return ex;
  }
  throw new Error(`no fractions question ${JSON.stringify(want)}`);
}

test("the skills made of ideas and their ideas", () => {
  assert.ok(hasIdeas("fractions") && hasIdeas("times") && hasIdeas("hcf") && !hasIdeas("linear"));
  assert.equal(SKILL_IDEAS.fractions.length, 16);
  assert.deepEqual(SKILL_IDEAS.times, ["addWhole", "multiplyFacts", "multiplyLong"]);
  assert.deepEqual(SKILL_IDEAS.hcf, ["addWhole", "multiplyFacts", "multiplyLong", "divideExact", "hcf", "lcm"]);
  assert.equal(knownOf({}, "part"), IDEA_PRIOR.init);
  assert.equal(knownOf({ part: 0.9 }, "part"), 0.9);
});

test("a question moves the ideas it needs; a recognised mistake is blamed on its idea alone; other skills say nothing", () => {
  const ex = fractions(1, { trap: "addAcross" });
  const needed = usesOf(ex);
  assert.ok(needed.length > 2 && needed.includes("addSub"));
  const right: IdeaState = {};
  learnIdeas(right, ex, true);
  assert.deepEqual(Object.keys(right).sort(), [...needed].sort(), "only the ideas the question needed are met");
  for (const id of needed) assert.ok(right[id]! > IDEA_PRIOR.init, `${id} rose`);
  const wrong: IdeaState = {};
  learnIdeas(wrong, ex, false);
  for (const id of needed) assert.ok(wrong[id]! < right[id]!, `${id} lower after a miss than after a hit`);
  // The blame of 3/10 for 1/5 + 2/5 falls on addSub alone, as a plain wrong answer on it would.
  const blamed: IdeaState = {};
  learnIdeas(blamed, ex, false, "addAcross");
  assert.deepEqual(blamed, { addSub: bktStep(IDEA_PRIOR.init, IDEA_PRIOR, false).known });
  assert.ok(blamed.addSub! < IDEA_PRIOR.init);
  // A mistake whose idea the question did not need, or a mistake on a right answer, is read as the plain answer.
  const stray: IdeaState = {};
  learnIdeas(stray, ex, false, "flipFirst");
  assert.deepEqual(stray, wrong);
  const rightAnyway: IdeaState = {};
  learnIdeas(rightAnyway, ex, true, "addAcross");
  assert.deepEqual(rightAnyway, right);
  // What is known already is where the step starts.
  const sure: IdeaState = { addSub: 0.99 };
  learnIdeas(sure, ex, false, "addAcross");
  assert.equal(sure.addSub, bktStep(0.99, IDEA_PRIOR, false).known);
  const none: IdeaState = {};
  learnIdeas(none, exercise("linear", 1, 1, w), true);
  learnIdeas(none, exercise("linear", 1, 2, w), false, "sign");
  assert.deepEqual(none, {});
  const arithmetic: IdeaState = {};
  learnIdeas(arithmetic, exercise("hcf", 2, 3, w), true);
  for (const id of Object.keys(arithmetic)) assert.ok(SKILL_IDEAS.hcf.includes(id as never), id);
});

test("what was ticked as hard: Bayes on each idea, nothing ticked says nothing, and a tick says nothing when it is as likely either way", () => {
  const rates = { hit: 0.6, falseAlarm: 0.1 };
  const known = [0.5, 0.5, 0.8];
  tickStep(known, [0, 1], [0], rates);
  assert.ok(Math.abs(known[0] - (0.5 * 0.1) / (0.5 * 0.1 + 0.5 * 0.6)) < 1e-12, "a ticked idea: P(known) · falseAlarm over P(tick)");
  assert.ok(Math.abs(known[1] - (0.5 * 0.9) / (0.5 * 0.9 + 0.5 * 0.4)) < 1e-12, "an unticked one: P(known) · (1 − falseAlarm) over P(no tick)");
  assert.equal(known[2], 0.8, "an idea the question did not need is left alone");
  const untouched = [0.5, 0.3];
  tickStep(untouched, [0, 1], [], rates);
  assert.deepEqual(untouched, [0.5, 0.3]);
  const blind = [0.5, 0.3];
  tickStep(blind, [0, 1], [1], { hit: 0.4, falseAlarm: 0.4 });
  assert.deepEqual(blind, [0.5, 0.3]);
});

test("a wrong answer with ticks: the ticked ideas fall below a plain miss and the others stay above it; ticks on a right answer, a named mistake or another question's ideas are passed over", () => {
  const ex = fractions(1, { trap: "addAcross" });
  const needed = usesOf(ex);
  const [ticked, other] = [needed[0], needed[1]];
  const stray = SKILL_IDEAS.fractions.find((id) => !needed.includes(id))!;
  const plain: IdeaState = {}, withTicks: IdeaState = {};
  learnIdeas(plain, ex, false);
  learnIdeas(withTicks, ex, false, undefined, [ticked, stray]);
  assert.ok(withTicks[ticked]! < plain[ticked]! && withTicks[other]! > plain[other]!);
  assert.equal(withTicks[stray], undefined, "an idea the question did not need is not met");
  // The step is the tick step then the plain one, at the prior's rates.
  const known = needed.map(() => IDEA_PRIOR.init), all = needed.map((_, j) => j);
  tickStep(known, all, [0], TICK_PRIOR);
  conjunctiveStep(known, all, () => IDEA_PRIOR.learn, IDEA_PRIOR, false);
  needed.forEach((id, j) => assert.equal(withTicks[id], known[j], id));
  const right: IdeaState = {}, rightTicked: IdeaState = {};
  learnIdeas(right, ex, true);
  learnIdeas(rightTicked, ex, true, undefined, [ticked]);
  assert.deepEqual(rightTicked, right);
  const blamed: IdeaState = {}, blamedTicked: IdeaState = {};
  learnIdeas(blamed, ex, false, "addAcross");
  learnIdeas(blamedTicked, ex, false, "addAcross", [ticked]);
  assert.deepEqual(blamedTicked, blamed);
  // The list is asked after a wrong answer on a skill with ideas, unless a mistake already named one of the question's.
  assert.ok(asksWhatWasHard(ex) && asksWhatWasHard(ex, "flipFirst") && !asksWhatWasHard(ex, "addAcross"));
  assert.ok(!asksWhatWasHard(exercise("linear", 1, 1, w)));
});

test("the weakest idea is the lowest; while all are level, a random one of the skill's", () => {
  assert.equal(weakestIdea({ equivalent: 0.1, part: 0.9 }, "fractions", () => 0.99), "equivalent");
  assert.equal(weakestIdea({ equivalent: 0.1, part: 0.9 }, "fractions", () => 0), "equivalent");
  assert.equal(weakestIdea({ equivalent: 0.6 }, "fractions", () => 0), "part", "an idea never met stands at the prior, below one that rose");
  assert.equal(weakestIdea({}, "fractions", () => 0), SKILL_IDEAS.fractions[0]);
  assert.equal(weakestIdea({}, "fractions", () => 0.999), SKILL_IDEAS.fractions[15]);
  assert.equal(weakestIdea({}, "times", () => 0.5), "multiplyFacts");
  const tied = new Set([weakestIdea({ hcf: 0.2, toMixed: 0.2 }, "fractions", () => 0), weakestIdea({ hcf: 0.2, toMixed: 0.2 }, "fractions", () => 0.99)]);
  assert.deepEqual(tied, new Set(["hcf", "toMixed"]));
  assert.equal(weakestIdea({ lowest: 0.3 }, "times", () => 0), "addWhole", "an idea not of the skill does not count");
});

test("a question bears most on an idea when it asks for it alone", () => {
  const alone = fractions(2, { form: "toMixed" });
  assert.deepEqual(usesOf(alone), ["part", "toMixed"]);
  assert.equal(bearing(alone, "toMixed"), 0.5);
  assert.equal(bearing(alone, "addSub"), 0);
  const sum = fractions(1, { trap: "addAcross" });
  assert.ok(bearing(sum, "addSub") > 0 && bearing(sum, "addSub") < 0.5);
  assert.equal(bearing(sum, "toMixed"), 0);
  assert.equal(bearing(exercise("linear", 1, 1, w), "part"), 0);
});

test("exerciseFor: a fresh question on the skill and level, or, aimed at an idea, the one bearing most on it", () => {
  const r = rng(7);
  const plain = exerciseFor({ skill: "linear", level: 2 }, w, r.next);
  assert.deepEqual([plain.skill, plain.level], ["linear", 2]);
  assert.deepEqual(exerciseFor({ skill: "linear", level: 2 }, w, rng(7).next), plain, "the same draw gives the same question");
  // Each fractions idea with a form of its own gets that form.
  const forms: [string, FractionForm][] = [
    ["equivalent", "equivalent"], ["lowest", "lowest"], ["commonDenom", "lcd"], ["reciprocal", "reciprocal"], ["toImproper", "toImproper"], ["toMixed", "toMixed"],
  ];
  for (const [idea, form] of forms)
    for (const level of [1, 2, 3] as const) {
      const ex = exerciseFor({ skill: "fractions", level, idea }, w, r.next);
      assert.equal(formOf(ex), form, `${idea} at level ${level}: ${ex.prompt}`);
      assert.deepEqual([ex.skill, ex.level], ["fractions", level]);
    }
  // An idea no form asks for alone gets the operation that needs it with the fewest others.
  for (const idea of ["addSub", "multiply", "divide", "hcf", "lcm"]) {
    const ex = exerciseFor({ skill: "fractions", level: 2, idea }, w, r.next);
    assert.ok(usesOf(ex).includes(idea as never), `${idea}: ${ex.prompt} ${ex.q}`);
  }
  // On times every question needs the same ideas: the aim changes nothing but the draw. An idea nothing bears on, or a skill without a graph, gets a fresh question.
  assert.equal(exerciseFor({ skill: "times", level: 1, idea: "multiplyFacts" }, w, r.next).skill, "times");
  assert.equal(exerciseFor({ skill: "hcf", level: 1, idea: "toMixed" }, w, r.next).skill, "hcf");
  assert.equal(exerciseFor({ skill: "linear", level: 1, idea: "part" }, w, r.next).skill, "linear");
  assert.equal(AIM_TRIES, 100);
});
