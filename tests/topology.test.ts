// Metric spaces and topology (degree level) in practice: the metrics, intervals and components checked by hand, the
// finite-space helpers (axioms, generated topologies, preimages) checked on small cases, every listed topology on
// {a, b, c} checked to be one, and every question checked against its own answer (right as shown, the named slips
// wrong and named).
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/math/practiceTypes.ts";
import { TOPOLOGIES_3 } from "../src/math/skills/topologies.ts";
import {
  componentsOf,
  d1,
  d2,
  dInf,
  generated,
  image,
  intersectionsOf,
  intervalPlain,
  intervalTex,
  isContinuous,
  isOpenMap,
  iv,
  point,
  preimage,
  subsetTex,
  topologyFault,
  unionsOf,
} from "../src/math/topology.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["metrics", "openClosed", "compactness", "connected", "topologies"];

test("the three metrics, intervals and the components of a union of pieces", () => {
  assert.deepEqual([d1(3, -4), d2(3, -4), dInf(3, -4)], [7, 5, 4]);
  assert.equal(intervalTex(iv(1, 3, false, true)), "(1, 3]");
  assert.equal(intervalPlain(iv(-2, 4, true, false)), "[-2, 4)");
  assert.equal(componentsOf([iv(0, 1, true, false), iv(1, 2, true, true), point(5)]), 2);
  assert.equal(componentsOf([iv(0, 1, false, false), iv(1, 2, false, false)]), 2);
  assert.equal(componentsOf([iv(0, 1, false, true), iv(1, 2, false, false), iv(2, 3, true, true)]), 1);
});

test("finite spaces: the axioms, the generated topology, preimages and images", () => {
  for (const t of TOPOLOGIES_3) assert.equal(topologyFault(t, 3), 0, t.join(","));
  assert.equal(topologyFault([0, 1], 3), 1);
  assert.equal(topologyFault([0, 1, 2, 7], 3), 2);
  assert.equal(topologyFault([0, 3, 5, 7], 3), 3);
  assert.equal(topologyFault([0, 1, 6, 7, 2], 3), 2);
  assert.equal(topologyFault([0, 1, 3, 6, 7], 3), 3);
  assert.equal(subsetTex(5, 3), "\\{a, c\\}");
  assert.equal(subsetTex(0, 3), "\\varnothing");
  assert.deepEqual(unionsOf([1, 2]), [0, 1, 2, 3]);
  assert.deepEqual(intersectionsOf([3, 6], 3), [2, 3, 6, 7]);
  assert.deepEqual(generated([3, 6], 3), [0, 2, 3, 6, 7]);
  // f = (a, b, c) ↦ (a, a, b): f⁻¹({a}) = {a, b}, f({c}) = {b}
  assert.equal(preimage([0, 0, 1], 1), 3);
  assert.equal(image([0, 0, 1], 4), 2);
  assert.equal(isContinuous([0, 1, 2], [0, 1, 7], [0, 1, 7]), true);
  assert.equal(isContinuous([1, 0, 2], [0, 1, 7], [0, 1, 7]), false);
  assert.equal(isOpenMap([0, 0, 0], [0, 1, 7], [0, 1, 7]), true);
  assert.equal(isOpenMap([0, 0, 0], [0, 1, 7], [0, 7]), false);
});

test("every metric-and-topology question accepts its own answer and names its slips", () => {
  for (const skill of SKILLS)
    for (const level of [1, 2, 3] as Level[]) {
      const named = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const e = exercise(skill, level, seed, w);
        const where = `${skill} ${level} #${seed}: ${e.q} → ${e.plain}`;
        assert.ok(!/NaN|undefined|Infinity/.test(e.prompt + e.q + e.show + e.plain + (e.steps ?? []).join(" ")), where);
        assert.ok(!/\{[a-zA-Z0-9]+\}/.test(e.prompt), `${where}: a blank left in the prompt`);
        assert.ok(!/\\text\{/.test((e.steps ?? []).join(" ")), `${where}: words in the steps`);
        assert.equal(check(e, e.plain, w).ok, true, where);
        for (const t of trapInputs(e)) {
          assert.equal(check(e, t.input, w).mistake, t.id, `${where}; ${t.id} ${t.input}`);
          named.add(t.id);
        }
      }
      assert.ok(named.size > 0, `${skill} ${level} names a slip`);
    }
});
