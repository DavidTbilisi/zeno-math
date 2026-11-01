// Ideas beyond fractions (issue #265): signed numbers, order of operations, rounding, powers and expanding brackets
// each have a concept graph. Each graph is whole and agrees with the others on the ideas they share. A question is
// read for the ideas its working needs. Every mistake the checker recognises on these skills names an idea its
// question uses. A trap typed as a student's first answer is blamed on that one idea, as on the server. Every idea of
// every skill can be asked. The ideas-world simulation keeps its three skills (tests/ideas.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { learnFromAttempt, stepDownExercise } from "../src/learner.ts";
import { exercise, LEVELS, trapInputs, type Exercise } from "../src/math/practice.ts";
import type { MistakeId } from "../src/math/mistakes.ts";
import {
  BRACKETS, BRACKETS_GAPS, bracketsUses, FRACTIONS_GAPS, GAPS, IDEAS, needsOf, ORDER, ORDER_GAPS, orderUses, POWERS, POWERS_GAPS, powersUses, ROUNDING, ROUNDING_GAPS,
  roundingUses, SIGNED, SIGNED_GAPS, signedUses, type ConceptGraph,
} from "../src/model/conceptGraph.ts";
import { rng } from "../src/model/random.ts";
import { asksWhatWasHard, gapIdea, hasIdeas, IDEA_PRIOR, SKILL_IDEAS, usesOf, type IdeaState } from "../src/model/ideaState.ts";

const w = en.pracWords;
const GRAPHS = { integers: [SIGNED, SIGNED_GAPS], order: [ORDER, ORDER_GAPS], rounding: [ROUNDING, ROUNDING_GAPS], indices: [POWERS, POWERS_GAPS], expand: [BRACKETS, BRACKETS_GAPS] } as const;
const SKILLS = Object.keys(GRAPHS) as (keyof typeof GRAPHS)[];
const questions = (skill: string, n = 300) => LEVELS.flatMap((L) => Array.from({ length: n }, (_, i) => exercise(skill as never, L, i + 1, w)));

test("the five graphs are whole, their needs have no cycle, and an idea shared between graphs is the same idea", () => {
  for (const skill of SKILLS) {
    const g = GRAPHS[skill][0] as ConceptGraph;
    for (const [a, b] of g.edges) assert.ok(a in g.nodes && b in g.nodes, `${skill}: ${a}→${b}`);
    for (const n of Object.keys(g.nodes)) {
      assert.ok(!needsOf(g, n).has(n), `${skill}: ${n} needs itself`);
      assert.equal(g.nodes[n], IDEAS[n as keyof typeof IDEAS], `${skill}: ${n} is one idea wherever it is used`);
    }
    assert.ok(hasIdeas(skill), skill);
  }
  // No mistake is in two tables, and the table the app reads has them all.
  const tables = [FRACTIONS_GAPS, ...SKILLS.map((s) => GRAPHS[s][1])];
  assert.equal(Object.keys(GAPS).length, tables.reduce((n, t) => n + Object.keys(t).length, 0));
  // "sign" is tried on every question, so it names no idea.
  assert.equal(gapIdea("sign"), undefined);
});

test("a question is read for the ideas its working needs", () => {
  const signed = (src: string) => signedUses({ src } as Exercise).nodes;
  assert.deepEqual(signed("3 - (-5)"), ["minusNeg", "addWhole"]);
  assert.deepEqual(signed("7 + (-3)"), ["addNeg", "addWhole"]);
  assert.deepEqual(signed("4 - 9"), ["negLine", "addWhole"], "past zero");
  assert.deepEqual(signed("-4 + 9"), ["negLine", "addWhole"], "from below zero");
  assert.deepEqual(signed("-3 * (4)"), ["signTimes", "multiplyFacts"]);
  assert.deepEqual(signed("-12 / (4)"), ["signTimes", "divideExact"]);
  assert.deepEqual(signed("3 * (4) - (-5)"), ["minusNeg", "addWhole", "multiplyFacts"]);
  assert.deepEqual(signed("-3 * (4) - (-5)"), ["negLine", "minusNeg", "signTimes", "addWhole", "multiplyFacts"]);

  const order = (src: string) => orderUses({ src } as Exercise).nodes;
  assert.deepEqual(order("2 + 3 * 4"), ["mulFirst", "addWhole", "multiplyFacts"]);
  assert.deepEqual(order("2 * 3 + 4"), ["addWhole", "multiplyFacts"], "from the left comes out the same: no rule is tested");
  assert.deepEqual(order("9 - 4 - 2"), ["chainLeft", "addWhole"]);
  assert.deepEqual(order("3 * 2 ^ 2"), ["powFirst", "powValue", "multiplyFacts"]);
  assert.deepEqual(order("(2 + 3) * 4"), ["bracketsFirst", "addWhole", "multiplyFacts"]);
  assert.deepEqual(order("2 - 3 * 4"), ["mulFirst", "negLine", "addWhole", "multiplyFacts"]);

  const powers = (src: string) => powersUses({ solution: { kind: "powers", spec: { topic: "laws", src } } } as Exercise).nodes;
  assert.deepEqual(powers("2^5 * 2^3 / 2^4"), ["powValue", "powLaws", "addWhole", "multiplyFacts"]);
  assert.deepEqual(powers("5^2 * 5^3 / 5^1"), ["powValue", "powLaws", "addWhole", "multiplyFacts", "multiplyLong"], "5⁴ is 125 × 5");
  assert.deepEqual(powers("2^(-3)"), ["powValue", "negIndex", "multiplyFacts"]);
  assert.deepEqual(powers("3^(-1)"), ["negIndex"], "nothing to multiply");
  assert.deepEqual(powers("8^(2/3)"), ["powValue", "fracIndex", "multiplyFacts"]);
  assert.deepEqual(powers("(8/27)^(-2/3)"), ["powValue", "negIndex", "fracIndex", "multiplyFacts"]);
  assert.throws(() => powers("log(8)"), /not a powers question/);

  const brackets = (eq: string) => bracketsUses({ solution: { kind: "algebra", spec: { topic: "expand", eq } } } as Exercise).nodes;
  assert.deepEqual(brackets("(x + 2)(x + 3)"), ["twoBrackets", "addWhole", "multiplyFacts"]);
  assert.deepEqual(brackets("(2x - 3)^2"), ["twoBrackets", "squareBracket", "signTimes", "addWhole", "multiplyFacts"]);
  assert.deepEqual(brackets("-2(x + 1)(x + 3)"), ["distribute", "twoBrackets", "signTimes", "addWhole", "multiplyFacts"]);
  assert.deepEqual(brackets("(x - 1)(x^2 + 2x + 3)"), ["twoBrackets", "signTimes", "addWhole", "multiplyFacts"]);

  const rounding = (spec: object) => roundingUses({ solution: { kind: "round", spec } } as Exercise).nodes;
  assert.deepEqual(rounding({ pic: "round", m: 4372, p: 0, k: -2 }), ["roundPlace", "placeHolders"]);
  assert.deepEqual(rounding({ pic: "round", m: 3472, p: 3, k: 1 }), ["roundPlace"]);
  assert.deepEqual(rounding({ pic: "round", m: 3472, p: 5, k: 3, sf: 2 }), ["roundPlace", "sigFigs"]);
  assert.deepEqual(rounding({ pic: "std", text: "45000", e: 4 }), ["stdForm"]);
  assert.deepEqual(rounding({ pic: "stdMul", a: "1.2", m1: 3, b: "3.4", m2: -1, prod: "4.08", mant: "4.08", e: 2 }), ["stdForm", "powLaws", "addWhole", "multiplyFacts", "multiplyLong"]);
  assert.deepEqual(rounding({ pic: "estimate", x: 3.14, y: 412, x1: 3, y1: 400 }), ["roundPlace", "sigFigs", "multiplyFacts"]);
  assert.deepEqual(rounding({ pic: "bound", x: 7, unit: 1, low: false }), ["bounds"]);
  assert.deepEqual(rounding({ pic: "boundTotal", n: 4, x: 20 }), ["bounds", "addWhole", "multiplyFacts", "multiplyLong"]);
});

test("every mistake these skills recognise names an idea its question uses, and each table's every mistake turns up", () => {
  for (const skill of SKILLS) {
    const seen = new Set<string>();
    for (const ex of questions(skill)) {
      const uses = usesOf(ex);
      for (const t of ex.answer.traps ?? []) {
        const gap = gapIdea(t.id);
        assert.ok(gap && uses.includes(gap), `${skill} ${t.id} → ${gap}: ${ex.src ?? JSON.stringify(ex.solution?.spec)} needs ${uses}`);
        seen.add(t.id);
      }
    }
    assert.deepEqual([...seen].sort(), Object.keys(GRAPHS[skill][1]).sort(), `${skill}: the mistakes its questions lay are its table's`);
  }
});

test("a trap typed first is blamed on its one idea, as on the server; any other miss asks what was hard", () => {
  for (const skill of SKILLS)
    for (const id of Object.keys(GRAPHS[skill][1]) as MistakeId[]) {
      const ex = questions(skill).find((q) => trapInputs(q).some((t) => t.id === id))!;
      const trap = trapInputs(ex).find((t) => t.id === id)!;
      const state: IdeaState = {};
      learnFromAttempt(state, { skill: ex.skill, level: ex.level, seed: ex.seed, outcome: "revealed", answers: [{ input: trap.input, verdict: "wrong", ms: 1 }] });
      assert.deepEqual(Object.keys(state), [gapIdea(id)], `${skill} ${id}: ${trap.input}`);
      assert.ok(state[gapIdea(id)!]! < IDEA_PRIOR.init);
      assert.ok(!asksWhatWasHard(ex, id) && asksWhatWasHard(ex), `${skill} ${id}`);
    }
});

test("every idea of every new skill can be asked: a step-down question on it needs it", () => {
  for (const skill of SKILLS)
    for (const idea of SKILL_IDEAS[skill]) assert.ok(usesOf(stepDownExercise(idea, w, rng(5).next)).includes(idea), `${skill}: ${idea}`);
});
