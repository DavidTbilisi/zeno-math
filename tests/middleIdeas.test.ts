// The six middle-school skills made of ideas (#755): linear equations, expressions, decimals, percentages, ratio and
// proportion. Each graph is whole and shares its ideas with the others; every question names the ideas it needs, all in
// its skill's graph; every mistake a question lays is blamed on an idea it needs, and every one of the skill's own
// mistakes turns up; a trap typed first is blamed on that idea alone; every idea can be asked as a step-down question.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { learnFromAttempt, stepDownExercise } from "../src/learner.ts";
import { exercise, LEVELS, trapInputs, type Exercise } from "../src/math/practice.ts";
import type { MistakeId } from "../src/math/mistakes.ts";
import {
  DECIMALS, DECIMALS_GAPS, EQUATIONS, EQUATIONS_GAPS, EXPRESSIONS, EXPRESSIONS_GAPS, IDEAS, needsOf, PERCENT, PERCENT_GAPS, PROPORTION,
  PROPORTION_GAPS, RATIO, RATIO_GAPS, type ConceptGraph,
} from "../src/model/conceptGraph.ts";
import { rng } from "../src/model/random.ts";
import { asksWhatWasHard, gapIdea, hasIdeas, IDEA_PRIOR, SKILL_IDEAS, usesOf, type IdeaState } from "../src/model/ideaState.ts";

const w = en.pracWords;
const GRAPHS = {
  linear: [EQUATIONS, EQUATIONS_GAPS], sameExpression: [EXPRESSIONS, EXPRESSIONS_GAPS], decimals: [DECIMALS, DECIMALS_GAPS],
  percent: [PERCENT, PERCENT_GAPS], ratio: [RATIO, RATIO_GAPS], proportion: [PROPORTION, PROPORTION_GAPS],
} as const;
const SKILLS = Object.keys(GRAPHS) as (keyof typeof GRAPHS)[];
const questions = (skill: string): Exercise[] =>
  LEVELS.flatMap((L) => Array.from({ length: 300 }, (_, i) => exercise(skill as never, L, i + 1, w)));

test("the six graphs are whole, their needs have no cycle, and an idea shared between graphs is the same idea", () => {
  for (const skill of SKILLS) {
    const g = GRAPHS[skill][0] as ConceptGraph;
    for (const [a, b] of g.edges) assert.ok(a in g.nodes && b in g.nodes, `${skill}: ${a}→${b}`);
    for (const n of Object.keys(g.nodes)) {
      assert.ok(!needsOf(g, n).has(n), `${skill}: ${n} needs itself`);
      assert.equal(g.nodes[n], IDEAS[n as keyof typeof IDEAS], `${skill}: ${n} is one idea wherever it is used`);
    }
    assert.ok(hasIdeas(skill), skill);
    assert.deepEqual([...SKILL_IDEAS[skill]].sort(), Object.keys(g.nodes).sort(), `${skill}: its ideas are its graph's`);
  }
});

test("every question names the ideas it needs, all of them its skill's, and every idea is asked", () => {
  for (const skill of SKILLS) {
    const asked = new Set<string>();
    for (const ex of questions(skill)) {
      assert.ok(ex.ideas?.length, `${skill} ${ex.level}/${ex.seed}: no ideas named`);
      const uses = usesOf(ex);
      for (const id of uses) assert.ok(SKILL_IDEAS[skill].includes(id), `${skill} ${ex.level}/${ex.seed}: ${id} isn't one of its ideas`);
      uses.forEach((id) => asked.add(id));
    }
    for (const id of SKILL_IDEAS[skill]) assert.ok(asked.has(id), `${skill}: ${id} is never asked`);
  }
});

test("every mistake these skills recognise names an idea its question uses, and each table's every mistake turns up", () => {
  for (const skill of SKILLS) {
    const seen = new Set<string>();
    for (const ex of questions(skill)) {
      const uses = usesOf(ex);
      for (const t of ex.answer.traps ?? []) {
        const gap = gapIdea(t.id);
        if (!gap) continue;
        assert.ok(uses.includes(gap), `${skill} ${ex.level}/${ex.seed} ${t.id} → ${gap} needs ${uses}`);
        seen.add(t.id);
      }
    }
    // A mistake shared with an older skill (rounding's truncated, in decimals) stays in that skill's table.
    for (const id of Object.keys(GRAPHS[skill][1])) assert.ok(seen.has(id), `${skill}: ${id} never turns up`);
  }
});

test("a trap typed first is blamed on its one idea, as on the server; any other miss asks what was hard", () => {
  for (const skill of SKILLS) {
    const qs = questions(skill);
    for (const id of Object.keys(GRAPHS[skill][1]) as MistakeId[]) {
      const ex = qs.find((q) => trapInputs(q).some((t) => t.id === id))!;
      const trap = trapInputs(ex).find((t) => t.id === id)!;
      const state: IdeaState = {};
      learnFromAttempt(state, { skill: ex.skill, level: ex.level, seed: ex.seed, outcome: "revealed", answers: [{ input: trap.input, verdict: "wrong", ms: 1 }] });
      assert.deepEqual(Object.keys(state), [gapIdea(id)], `${skill} ${id}: ${trap.input}`);
      assert.ok(state[gapIdea(id)!]! < IDEA_PRIOR.init);
      assert.ok(!asksWhatWasHard(ex, id) && asksWhatWasHard(ex), `${skill} ${id}`);
    }
  }
});

test("every idea of every new skill can be asked: a step-down question on it needs it", () => {
  for (const skill of SKILLS)
    for (const idea of SKILL_IDEAS[skill]) assert.ok(usesOf(stepDownExercise(idea, w, rng(5).next)).includes(idea), `${skill}: ${idea}`);
});
