// Every practice question is what it was when tests/fixtures/practice-snapshot.json was saved: the same prompt,
// picture, answer, traps, steps and words for every skill, level, seed 1–20 and language. A change meant to move code
// keeps every hash; a change meant to alter a skill's questions saves the file again (npm run snapshot -- --write) and
// the diff shows which skills it touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SKILLS } from "../src/math/practiceSkills.ts";
import { savedSnapshot, skillHash } from "../scripts/snapshot-practice.ts";

const saved = savedSnapshot();

test("the snapshot lists every skill", () => {
  assert.deepEqual(Object.keys(saved), ALL_SKILLS);
});

test("every skill's questions are unchanged", () => {
  const changed = ALL_SKILLS.filter((s) => skillHash(s) !== saved[s]);
  assert.deepEqual(changed, [], "these skills ask something else now; if that is meant, run npm run snapshot -- --write");
});
