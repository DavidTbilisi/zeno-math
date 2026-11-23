// "Where it breaks" (issue #577): every skill made of ideas can show a worked answer to judge, made from a seed; the
// working with a mistake really comes to the answer that mistake gives (a trap's answer, typed in, is named by the
// checker as that trap), the right working comes to the right answer, and the right working is offered too. The run
// that brings one is worked out from the answers alone, and only the arm with the feature has it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ru } from "../src/locales/ru.ts";
import { ka } from "../src/locales/ka.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";
import { breakIdea, breakOf, judgedRight, namedIt, POOLS, SLIPS, whereItBreaks, workingsOf, type BreakId } from "../src/math/whereItBreaks.ts";
import { IDEA_SKILLS, knownOf, usesOf, type IdeaState } from "../src/model/ideaState.ts";
import { BREAK_AFTER, learnBreaks, noBreaks } from "../src/model/breaks.ts";
import { FEATURES, hasFeature, ON_TRIAL } from "../src/model/arms.ts";
import { classQuestion, learnFromAttempt, studentHas, toClassPlan, type Attempt, type Plan } from "../src/learner.ts";
import { LogisticModel } from "../src/model/logistic.ts";
import { rng } from "../src/model/random.ts";

const w = en.pracWords;
const isSlip = (id: string) => id in SLIPS;

test("each skill made of ideas makes a worked answer to judge from a seed, the same every time", () => {
  for (const skill of IDEA_SKILLS)
    for (const L of LEVELS) {
      const b = whereItBreaks(skill, L, w, rng(5).next);
      assert.equal(b.ex.skill, skill);
      assert.deepEqual(whereItBreaks(skill, L, w, rng(5).next), b, `${skill} ${L}: the same seed, the same question`);
      assert.deepEqual(breakOf(exercise(skill, b.ex.level, b.ex.seed, w), b.variant), b, `${skill} ${L}: rebuilt from its question and variant`);
      assert.equal(b.options.length, 3);
      assert.equal(new Set(b.options).size, 3);
      if (b.worked.mistake) assert.ok(b.options.includes(b.worked.mistake), `${skill}: the real mistake is offered`);
      for (const id of b.options) assert.ok((POOLS[skill] as readonly string[]).includes(id), `${skill}: ${id} is one of the skill's`);
    }
});

test("a working with a mistake comes to the answer the mistake gives; the right one to the right answer; both are offered", () => {
  for (const skill of IDEA_SKILLS) {
    const seen = new Set<BreakId>();
    let questions = 0;
    for (const L of LEVELS)
      for (let seed = 1; seed <= 150; seed++) {
        const ex = exercise(skill, L, seed, w);
        const all = workingsOf(ex);
        if (!all.length) continue;
        questions++;
        const [right, ...wrong] = all;
        assert.equal(right.mistake, null, "the right working comes first");
        assert.equal(right.wrong, null);
        assert.ok(check(ex, right.plain, w).ok, `${skill} ${L} ${seed}: the right working comes to ${right.plain}`);
        assert.ok(wrong.length >= 1, "and at least one with a mistake");
        for (const v of wrong) {
          const verdict = check(ex, v.plain, w);
          assert.equal(verdict.ok, false, `${skill} ${L} ${seed} ${v.mistake}: ${v.plain} is wrong`);
          // A trap's working comes to exactly the trap's answer: the checker names it.
          if (!isSlip(v.mistake!)) assert.equal(verdict.mistake, v.mistake, `${skill} ${L} ${seed}: ${v.plain} is ${v.mistake}`);
          assert.ok(usesOf(ex).includes(breakIdea(v.mistake!)), `${skill} ${L} ${seed}: the question needs the idea of ${v.mistake}`);
          assert.ok(v.wrong! >= 0 && v.wrong! < v.lines.length, "it goes wrong on one of its own lines");
          assert.notEqual(v.lines[v.wrong!], right.lines[v.wrong!], "on a line the right working hasn't");
          assert.deepEqual(v.lines.slice(0, v.wrong!), right.lines.slice(0, v.wrong!), "the lines before it are the right working's");
          seen.add(v.mistake!);
        }
      }
    assert.ok(questions > 30, `${skill}: ${questions} questions can be judged`);
    assert.deepEqual([...seen].sort(), [...POOLS[skill]].sort(), `${skill}: every mistake of its list is shown somewhere`);
  }
});

test("the right working is shown a quarter of the time or so, a working with a mistake the rest", () => {
  const random = rng(11).next;
  let right = 0;
  const n = 400;
  for (let i = 0; i < n; i++) if (whereItBreaks(IDEA_SKILLS[i % IDEA_SKILLS.length], 1, w, random).worked.mistake === null) right++;
  assert.ok(right > n * 0.15 && right < n * 0.35, `${right} of ${n} right`);
});

test("judging: right of a right working; of one with a mistake, its line and its name. A named mistake is evidence on its idea", () => {
  const ex = exercise("fractions", 1, 1, w);
  let seed = 1;
  let b = breakOf(ex, 1);
  while (!b || b.worked.mistake !== "addAcross") b = breakOf(exercise("fractions", 1, ++seed, w), 1);
  const at = b.worked.wrong!;
  assert.equal(judgedRight(b, { variant: 1, said: "wrong", step: at, picked: "addAcross" }), true);
  assert.equal(judgedRight(b, { variant: 1, said: "wrong", step: at + 1, picked: "addAcross" }), false, "the wrong line");
  assert.equal(judgedRight(b, { variant: 1, said: "wrong", step: at, picked: b.options.find((o) => o !== "addAcross") }), false, "the wrong mistake");
  assert.equal(judgedRight(b, { variant: 1, said: "right" }), false, "missed it");
  const clean = breakOf(b.ex, 0)!;
  assert.equal(judgedRight(clean, { variant: 0, said: "right" }), true);
  assert.equal(judgedRight(clean, { variant: 0, said: "wrong", step: 0, picked: clean.options[0] }), false);

  // Named: the idea known more likely; missed, less; the right working moves nothing; nothing else moves.
  const after = (said: "right" | "wrong", picked?: string, variant = 1) => {
    const state: IdeaState = {};
    const a = { skill: "fractions", level: 1, seed, outcome: "solved", answers: [], breaks: { variant, said, step: at, picked } } as unknown as Attempt;
    learnFromAttempt(state, a);
    return state;
  };
  assert.equal(namedIt(b, { variant: 1, said: "wrong", step: 0, picked: "addAcross" }), true, "the line aside, it was named");
  assert.ok(knownOf(after("wrong", "addAcross"), "addSub") > 0.5);
  assert.ok(knownOf(after("right"), "addSub") < 0.5);
  assert.deepEqual(Object.keys(after("right")), ["addSub"], "only the mistake's idea");
  assert.deepEqual(after("right", undefined, 0), {}, "a right working says nothing of an idea");
});

test("a run of right answers in class practice on a skill made of ideas brings one, once, and only for the arm with it", () => {
  const s = noBreaks();
  const answer = (correct: boolean | null, policy = "adaptive", skill = "fractions") => learnBreaks(s, { skill: skill as never, policy, correct });
  for (let i = 0; i < BREAK_AFTER - 1; i++) answer(true);
  answer(false);
  assert.equal(s.due, undefined, "a wrong answer starts the run again");
  for (const p of ["review", "spaced", "free", "homework", "stepdown"]) answer(true, p);
  answer(true, "adaptive", "linear");
  answer(null);
  assert.equal(s.due, undefined, "only class practice on a skill made of ideas, with something to go by");
  for (let i = 0; i < BREAK_AFTER; i++) answer(true);
  assert.equal(s.due, "fractions");
  for (let i = 0; i < BREAK_AFTER; i++) answer(true, "fixed", "times");
  assert.equal(s.due, "fractions", "one at a time");
  answer(false, "breaks");
  assert.equal(s.due, undefined, "the worked answer judged clears it");

  assert.ok(ON_TRIAL.includes("breaks"));
  assert.equal(FEATURES.at(-1), "breaks", "a new feature joins at the end");
  assert.equal(studentHas(null, "breaks"), false, "nobody signed in");
  assert.equal(hasFeature({ feature: "breaks", arm: "on" }, "breaks"), true);
  assert.equal(hasFeature({ feature: "breaks", arm: "off" }, "breaks"), false);
  assert.equal(hasFeature({ feature: "stepdown", arm: "on" }, "breaks"), false, "not in a class testing something else");

  const base: Plan = {
    class: "C", phase: "session", sessionEnds: null, testLength: 12, tests: {} as Plan["tests"],
    condition: "adaptive", feature: "breaks", arm: "on", skills: ["times", "hcf", "fractions"], position: 0, recent: [], ideas: {}, ema: {},
    state: new LogisticModel().state([]),
  };
  const q = classQuestion(toClassPlan({ ...base, breaks: { run: {}, due: "hcf" } }), w, {}, rng(2).next);
  assert.deepEqual([q.policy, q.ex.skill, typeof q.breaks], ["breaks", "hcf", "number"]);
  assert.ok(breakOf(q.ex, q.breaks!), "a working the question has");
  assert.equal(classQuestion(toClassPlan({ ...base, arm: "off", breaks: { run: {}, due: "hcf" } }), w, {}, rng(2).next).policy, "adaptive", "not the arm without it");
  assert.deepEqual(toClassPlan(base).breaks, { run: {} }, "a plan from before the feature");
});

test("every mistake offered has a name, and every slip its reason, in every language", () => {
  for (const dict of [en, ka, ru]) {
    for (const ids of Object.values(POOLS)) for (const id of ids) assert.ok(dict.pracWords.breaks.names[id], id);
    for (const id of Object.keys(SLIPS)) assert.ok(dict.pracWords.breaks.why[id as keyof typeof SLIPS], id);
  }
});
