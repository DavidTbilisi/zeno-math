// Discover the unit circle: with three angles measured, only the mirror's own rule holds in every row, so a claim is
// judged by the rows alone; medium's twin is the one other angle with the same sin or cos; hard's four values are
// different with each wrong one named; the ladder and notices.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_LEVELS } from "../src/math/ladder.ts";
import { rng } from "../src/math/random.ts";
import {
  ANGLE_RULES,
  CIRCLE_DISCOVER_LADDER,
  circleDiscoverNotice,
  circleDiscoverTask,
  cosOf,
  FIRST_RANGE,
  fnOf,
  holdsAll,
  MIRROR_RULE,
  MIRRORS,
  mirrorAngle,
  numText,
  reachChoices,
  reachSlip,
  refOf,
  ruleText,
  sinOf,
  STEP,
  twinOf,
  X_COORDS,
  Y_COORDS,
  type MirrorRule,
} from "../src/math/circleDiscover.ts";

const ANGLES: number[] = [];
for (let t = FIRST_RANGE[0]; t <= FIRST_RANGE[1]; t += STEP) ANGLES.push(t);
const RULES: MirrorRule[] = ANGLE_RULES.flatMap((angle) => X_COORDS.flatMap((qx) => Y_COORDS.map((qy) => ({ angle, qx, qy }))));

test("with three angles measured, only the mirror's rule holds in every row", () => {
  assert.equal(RULES.length, 64);
  assert.deepEqual(MIRRORS.map((m) => ruleText(MIRROR_RULE[m])), ["Q = (−x, y), 180° − θ", "Q = (−x, −y), 180° + θ", "Q = (x, −y), 360° − θ"]);
  let sets = 0;
  for (const m of MIRRORS)
    for (let i = 0; i < ANGLES.length; i++)
      for (let j = i + 1; j < ANGLES.length; j++)
        for (let k = j + 1; k < ANGLES.length; k++) {
          const rows = [ANGLES[i], ANGLES[j], ANGLES[k]];
          sets++;
          for (const r of RULES) assert.equal(holdsAll(r, m, rows), ruleText(r) === ruleText(MIRROR_RULE[m]), `${ruleText(r)} on ${m} ${rows}`);
        }
  assert.ok(sets > 1500);
  // At 45° alone, x = y and 180° − θ = 90° + θ: why one row is not enough.
  assert.equal(holdsAll({ angle: "90+", qx: "−y", qy: "x" }, "up", [45]), true);
  // The mirror really is the point at its angle.
  for (const m of MIRRORS) for (const t of ANGLES) {
    const q = mirrorAngle(m, t);
    assert.ok(Math.abs(Math.hypot(cosOf(q), sinOf(q)) - 1) < 1e-12);
    assert.ok(q > 90 && q < 360);
  }
});

test("the twin: the one other angle on the 5° steps with the same sin or cos", () => {
  for (const fn of ["sin", "cos"] as const)
    for (let g = 0; g < 360; g += STEP) {
      if (g % 90 === 0) continue;
      const same = Array.from({ length: 72 }, (_, i) => i * STEP).filter((t) => t !== g && Math.abs(fnOf(fn, t) - fnOf(fn, g)) < 1e-9);
      assert.deepEqual(same, [twinOf(fn, g)], `${fn} ${g}`);
    }
  assert.equal(twinOf("sin", 40), 140);
  assert.equal(twinOf("cos", 70), 290);
  assert.equal(twinOf("sin", 200), 340);
  assert.equal(numText(-0.5), "−0.5");
  assert.equal(numText(sinOf(40)), "0.64");
});

test("hard offers four different values; the right one is the ratio, each wrong one named", () => {
  const reaches = [...CIRCLE_DISCOVER_LADDER, ...Array.from({ length: 300 }, (_, i) => circleDiscoverTask(3, rng(i + 1)))].filter((t) => t.level === 3);
  for (const t of reaches) {
    assert.equal(new Set(t.choices).size, 4, JSON.stringify(t));
    assert.ok(t.angle > 90 && t.angle < 360);
    assert.notEqual(refOf(t.angle), 45);
    assert.equal(t.choices.filter((v) => reachSlip(t, v) === null).length, 1);
    assert.ok(t.choices.includes(Math.round(fnOf(t.fn, t.angle) * 100) / 100));
  }
  const first = CIRCLE_DISCOVER_LADDER[6];
  assert.ok(first.level === 3);
  assert.deepEqual(reachChoices(first).map((x) => [x.v, x.slip]), [[0.34, null], [-0.34, "sign"], [0.94, "swap"], [-0.94, "both"]]);
  assert.deepEqual([160, 250, 310, 30].map(refOf), [20, 70, 50, 30]);
});

test("the ladder: three mirrors, three twins, three values out of reach; endless at every level", () => {
  assert.deepEqual(CIRCLE_DISCOVER_LADDER.map((t) => t.level), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
  assert.deepEqual(CIRCLE_DISCOVER_LADDER.map((t) => (t.level === 1 ? t.mirror : t.level === 2 ? `${t.fn} ${t.given}` : `${t.fn} ${t.angle}`)), ["up", "centre", "across", "sin 40", "cos 70", "sin 200", "sin 160", "cos 250", "sin 310"]);
  for (const level of GAME_LEVELS)
    for (let seed = 1; seed <= 100; seed++) {
      const t = circleDiscoverTask(level, rng(seed));
      assert.equal(t.level, level);
      if (t.level === 1) assert.ok(t.start >= FIRST_RANGE[0] && t.start <= FIRST_RANGE[1] && t.start % STEP === 0);
      if (t.level === 2) {
        assert.ok(t.given % 90 >= 15 && t.given % 90 <= 75, `${t.given}`);
        assert.notEqual(t.start, twinOf(t.fn, t.given));
      }
    }
});

test("notices: ten in a row first, then what a clean puzzle showed", () => {
  const [mirror, , , twin, , , reach] = CIRCLE_DISCOVER_LADDER;
  assert.equal(circleDiscoverNotice(mirror, 2, 10), "streak10");
  assert.equal(circleDiscoverNotice(mirror, 1, 0), null);
  assert.equal(circleDiscoverNotice(mirror, 0, 0), "anyAngle");
  assert.equal(circleDiscoverNotice(twin, 0, 0), "twice");
  assert.equal(circleDiscoverNotice(reach, 0, 0), "outOfReach");
});
