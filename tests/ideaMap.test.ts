// The idea map (issue #285): every idea of a skill on it once, each below all the ideas it rests on, only edges inside
// the map; a tile lights at the mastery bar, and what is lit stays lit when the estimate falls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { exercise } from "../src/math/practice.ts";
import { ideaMap, LIT, newlyLit } from "../src/model/ideaMap.ts";
import { IDEA_SKILLS, learnIdeas, SKILL_IDEAS, usesOf, type IdeaState } from "../src/model/ideaState.ts";

test("each skill's map has every idea once, each row below the ideas it rests on, and only its own edges", () => {
  for (const skill of IDEA_SKILLS) {
    const { rows, edges } = ideaMap(skill);
    const all = rows.flat();
    assert.deepEqual([...all].sort(), [...SKILL_IDEAS[skill]].sort(), skill);
    const row = (id: string) => rows.findIndex((r) => r.includes(id as never));
    for (const [a, b] of edges) {
      assert.ok(all.includes(a) && all.includes(b), `${skill}: ${a}→${b} inside the map`);
      assert.ok(row(a) < row(b), `${skill}: ${a} above ${b}`);
    }
    // Every idea below the first row rests on one in the row just above it (so no row is empty or skipped).
    rows.slice(1).forEach((r, i) => r.forEach((b) => assert.ok(edges.some(([a, to]) => to === b && row(a) === i), `${skill}: ${b}`)));
  }
  assert.equal(ideaMap("fractions").rows.flat().length, 16);
  assert.deepEqual(ideaMap("fractions").rows[0], ["part", "addWhole", "multiplyFacts"]);
});

test("a tile lights at the mastery bar, and once lit is never newly lit again", () => {
  assert.equal(LIT, 0.95);
  assert.deepEqual(newlyLit([], { part: 0.94, equivalent: 0.95, lowest: 0.99 }), ["equivalent", "lowest"]);
  assert.deepEqual(newlyLit(["equivalent"], { part: 0.96, equivalent: 0.97 }), ["part"]);
  assert.deepEqual(newlyLit([], {}), []);
});

test("right answers light a question's ideas within a session; wrong ones after leave the lit list as it was", () => {
  // A question on three ideas: credit for a right answer is shared among the ideas it needs.
  const ex = Array.from({ length: 200 }, (_, i) => exercise("fractions", 1, i + 1, en.pracWords)).find((e) => usesOf(e).length === 3)!;
  const state: IdeaState = {};
  let lit: string[] = [];
  for (let i = 0; i < 5; i++) {
    learnIdeas(state, ex, true);
    lit = [...lit, ...newlyLit(lit, state)];
  }
  assert.deepEqual([...lit].sort(), [...usesOf(ex)].sort());
  for (let i = 0; i < 5; i++) {
    learnIdeas(state, ex, false);
    lit = [...lit, ...newlyLit(lit, state)];
  }
  assert.ok(usesOf(ex).every((id) => (state[id] ?? 0) < LIT), "the estimate fell");
  assert.deepEqual([...lit].sort(), [...usesOf(ex)].sort(), "the tiles did not");
});
