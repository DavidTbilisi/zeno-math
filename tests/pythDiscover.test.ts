// Discover Pythagoras: once a and b have each changed, no rule but Pythagoras (the way round the puzzle asks) holds in
// every row, so a claim is judged by the rows alone; medium's corner makes c² equal to a² + b² only at 90°, more when
// wider and less when sharper; hard's four lengths are different with each wrong one named; the ladder and notices.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_LEVELS } from "../src/math/ladder.ts";
import { rng } from "../src/math/random.ts";
import {
  c2At,
  CORNER_RANGE,
  enoughRows,
  holdsAll,
  isPythagoras,
  LEG_RANGE,
  legsOf,
  codeOf,
  meets,
  P_OPS,
  PYTH_LADDER,
  pythNotice,
  pythTask,
  reachChoices,
  reachSlip,
  ruleText,
  type Legs,
  type Pow,
  type Rule,
} from "../src/math/pythDiscover.ts";

const LEGS: Legs[] = [];
for (let a = LEG_RANGE[0]; a <= LEG_RANGE[1]; a++) for (let b = LEG_RANGE[0]; b <= LEG_RANGE[1]; b++) LEGS.push({ a, b });
const POWS: Pow[] = [1, 2];
const RULES: Rule[] = (["c", "b", "a"] as const).flatMap((form) => POWS.flatMap((p1) => P_OPS.flatMap((op) => POWS.flatMap((p2) => POWS.map((pr) => ({ form, p1, op, p2, pr }))))));

test("with a and b each changed, only Pythagoras holds in every row of three", () => {
  assert.equal(RULES.length, 72);
  assert.deepEqual(RULES.filter(isPythagoras).map(ruleText), ["a² + b² = c²", "c² − a² = b²", "c² − b² = a²"]);
  let sets = 0;
  for (let i = 0; i < LEGS.length; i++)
    for (let j = i + 1; j < LEGS.length; j++)
      for (let k = j + 1; k < LEGS.length; k++) {
        const rows = [LEGS[i], LEGS[j], LEGS[k]];
        if (!enoughRows(rows)) continue;
        sets++;
        for (const r of RULES) assert.equal(holdsAll(r, rows), isPythagoras(r), `${ruleText(r)} on ${JSON.stringify(rows)}`);
      }
  assert.ok(sets > 1500);
  // a + b² = c² holds while a stays 1: why both sides must change.
  const stuck = [{ a: 1, b: 2 }, { a: 1, b: 3 }, { a: 1, b: 4 }];
  assert.equal(enoughRows(stuck), false);
  assert.equal(holdsAll({ form: "c", p1: 1, op: "+", p2: 2, pr: 2 }, stuck), true);
  assert.deepEqual(legsOf(codeOf({ a: 3, b: 4 })), { a: 3, b: 4 });
});

test("the corner: c² is a² + b² only at 90°, more when wider, less when sharper", () => {
  for (const l of LEGS)
    for (let t = CORNER_RANGE[0]; t <= CORNER_RANGE[1]; t++) {
      const [c2, sum] = [c2At(l, t), l.a * l.a + l.b * l.b];
      assert.equal(c2 === sum, t === 90, `${l.a},${l.b} at ${t}`);
      assert.equal(c2 > sum, t > 90);
      assert.equal(meets("equal", t), t === 90);
      assert.equal(meets("more", t), c2 > sum);
      assert.equal(meets("less", t), c2 < sum);
    }
  assert.equal(c2At({ a: 3, b: 4 }, 70), 16.79);
});

test("hard offers four different lengths; the right one is the side, each wrong one named", () => {
  const reaches = [...PYTH_LADDER, ...Array.from({ length: 200 }, (_, i) => pythTask(3, rng(i + 1)))].filter((t) => t.level === 3);
  for (const t of reaches) {
    assert.equal(new Set(t.choices).size, 4, JSON.stringify(t));
    assert.ok(t.choices.every((v) => v > 0));
    const { a, b, c } = t.sides;
    assert.equal(a * a + b * b, c * c);
    assert.equal(t.choices.filter((v) => reachSlip(t, v) === null).length, 1);
    assert.ok(t.choices.includes(t.sides[t.missing]));
  }
  const first = PYTH_LADDER[6];
  assert.ok(first.level === 3);
  assert.deepEqual(reachChoices(first).map((x) => [x.v, x.slip]), [[10, null], [14, "sides"], [100, "noRoot"], [5.29, "wrongWay"]]);
});

test("the ladder: three rules, three corners, three sides out of reach; endless at every level", () => {
  assert.deepEqual(PYTH_LADDER.map((t) => t.level), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
  assert.deepEqual(PYTH_LADDER.map((t) => (t.level === 1 ? t.form : t.level === 2 ? t.goal : t.missing)), ["c", "b", "a", "equal", "more", "less", "c", "b", "a"]);
  for (const t of PYTH_LADDER) if (t.level === 2) assert.equal(meets(t.goal, t.start), false, "starts away from an answer");
  for (const level of GAME_LEVELS)
    for (let seed = 1; seed <= 100; seed++) {
      const t = pythTask(level, rng(seed));
      assert.equal(t.level, level);
      if (t.level === 1) assert.ok([t.start.a, t.start.b].every((v) => v >= LEG_RANGE[0] && v <= LEG_RANGE[1]));
      if (t.level === 2) assert.equal(meets(t.goal, t.start), false);
    }
});

test("notices: ten in a row first, then what a clean puzzle showed", () => {
  const [grow, , , turn, , , reach] = PYTH_LADDER;
  assert.equal(pythNotice(grow, 2, 10), "streak10");
  assert.equal(pythNotice(grow, 1, 0), null);
  assert.equal(pythNotice(grow, 0, 0), "anyShape");
  assert.equal(pythNotice(turn, 0, 0), "onlyRight");
  assert.equal(pythNotice(reach, 0, 0), "outOfReach");
});
