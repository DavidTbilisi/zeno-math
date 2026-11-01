// Class experiments (issue #268): a class tests one feature; the arm without it goes without that feature only, the
// policy feature alone changes the condition, and a student kept from before arms, or not in a class, has everything.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ARMS, armOfCondition, BLOCK, conditionOf, FEATURES, hasFeature } from "../src/model/arms.ts";
import { studentHas } from "../src/learner.ts";
import { formFor } from "../src/model/testForms.ts";

test("the arm without the feature under test goes without it, and only without it", () => {
  for (const feature of FEATURES)
    for (const f of FEATURES) {
      assert.equal(hasFeature({ feature, arm: "on" }, f), true, `${feature} on has ${f}`);
      assert.equal(hasFeature({ feature, arm: "off" }, f), f !== feature, `${feature} off and ${f}`);
    }
  assert.deepEqual([...BLOCK].sort(), ["off", "off", "on", "on"], "two of each arm in a block");
  assert.deepEqual(ARMS, ["on", "off"]);
});

test("only a class testing the policy puts an arm on the fixed sequence", () => {
  assert.equal(conditionOf("policy", "on"), "adaptive");
  assert.equal(conditionOf("policy", "off"), "fixed");
  for (const f of FEATURES.filter((f) => f !== "policy")) for (const arm of ARMS) assert.equal(conditionOf(f, arm), "adaptive", `${f} ${arm}`);
  // Students and exports from before arms: the adaptive condition had the feature.
  assert.deepEqual([armOfCondition("adaptive"), armOfCondition("fixed")], ["on", "off"]);
});

test("a student has every feature unless their arm goes without it", () => {
  assert.equal(studentHas(null, "spaced"), true, "nobody signed in");
  assert.equal(studentHas({}, "spaced"), true, "signed in before arms");
  assert.equal(studentHas({ feature: "spaced", arm: "off" }, "spaced"), false);
  assert.equal(studentHas({ feature: "spaced", arm: "off" }, "steps"), true);
  assert.equal(studentHas({ feature: "spaced", arm: "on" }, "spaced"), true);
});

test("the delayed post-test is form C for everyone, after A and B in either order", () => {
  assert.deepEqual([formFor("AB", "pre"), formFor("AB", "post"), formFor("AB", "delayed")], ["A", "B", "C"]);
  assert.deepEqual([formFor("BA", "pre"), formFor("BA", "post"), formFor("BA", "delayed")], ["B", "A", "C"]);
});
