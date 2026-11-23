// The practice menu's sections: every skill of an area in exactly one of that area's groups, and every group named
// in all three languages.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { AREAS, GROUPS, groupsOf, SKILLS } from "../src/math/practiceSkills.ts";

test("each area's groups hold each of its skills exactly once", () => {
  for (const a of AREAS) {
    const grouped = groupsOf(a).flatMap(([, s]) => s);
    assert.deepEqual([...grouped].sort(), [...SKILLS[a]].sort(), a);
  }
});

test("every group has a name in every language, and no name is left over", () => {
  const ids = AREAS.flatMap((a) => Object.keys(GROUPS[a]));
  assert.equal(new Set(ids).size, ids.length, "group ids are unique across areas");
  for (const d of [en, ka, ru]) assert.deepEqual(Object.keys(d.pracWords.groups).sort(), [...ids].sort());
});
