// Trigonometry beyond the right angle: the answers agree with the figures, every slip gives another answer, the
// figures draw, and the practice questions read in all three languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { appliedQuestion, figureSvg, obtuseQuestion, renderRule, sineCosineQuestion, three, type RuleQuestion, type TriFig } from "../src/math/trigRules.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const units = { cm: "cm", km: "km", m: "m" };
const RAD = Math.PI / 180;
const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);

/** A drawn triangle is a triangle: its angles add to 180° and its sides follow the sine rule. */
function isTriangle(f: TriFig) {
  near(f.A + f.B + f.C, 180);
  for (const x of [f.A, f.B, f.C]) assert.ok(x > 0 && x < 180);
  near(f.a / Math.sin(f.A * RAD), f.b / Math.sin(f.B * RAD), 1e-6);
  near(f.a / Math.sin(f.A * RAD), f.c / Math.sin(f.C * RAD), 1e-6);
}
function sane(q: RuleQuestion) {
  assert.ok(Number.isFinite(q.v));
  for (const t of q.traps) assert.ok(Math.abs(t.v - q.v) > 0.02, `${q.kind}: ${t.id} gives the answer`);
  for (const worked of [false, true]) {
    const pic = figureSvg(q.fig, worked);
    assert.ok(!/NaN|undefined/.test(pic.body), `${q.kind} draws`);
    assert.ok(pic.w > 0 && pic.h > 0 && pic.w < 420);
  }
  if (q.fig.kind === "tri") isTriangle(q.fig);
}

test("obtuse angles: the same sine at 180° − t, the cosine the other sign, values from the unit circle", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = obtuseQuestion(rng(seed));
    kinds.add(q.kind);
    sane(q);
    if (q.kind === "value") {
      assert.ok(q.fig.kind === "circle" && q.fig.t > 90 && q.fig.t < 180);
      assert.ok(q.q.includes("cos") ? q.v < 0 : q.v > 0);
    } else {
      assert.ok(q.exact && q.v > 90 && q.v < 180);
      if (q.kind === "sinSame") near(Math.sin(q.v * RAD), Math.sin((180 - q.v) * RAD));
      else near(Math.cos(q.v * RAD), -Math.cos((180 - q.v) * RAD));
    }
  }
  assert.deepEqual([...kinds].sort(), ["cosNeg", "sinSame", "value"]);
});

test("sine rule, cosine rule and area: the answer fits the triangle drawn", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = sineCosineQuestion(rng(seed), "cm");
    kinds.add(q.kind);
    sane(q);
    const f = q.fig as TriFig;
    if (q.kind === "sineSide") near(q.v, f.b);
    if (q.kind === "sineAngle") near(q.v, f.B);
    if (q.kind === "cosSide") near(q.v, f.a);
    if (q.kind === "cosAngle") near(q.v, f.A);
    if (q.kind === "area") near(q.v, 0.5 * f.b * f.c * Math.sin(f.A * RAD));
    if (q.kind === "sineAngle") assert.ok(f.B < 90, "a shorter side: one triangle");
  }
  assert.equal(kinds.size, 5);
});

test("the ambiguous case, bearings and elevation: two triangles, the way back, the angle inside", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = appliedQuestion(rng(seed), units);
    kinds.add(q.kind);
    sane(q);
    if (q.kind === "ambiguous") {
      const f = q.fig as TriFig;
      near(q.v, f.B);
      assert.ok(f.B > 90 && f.a < f.b && f.a > f.b * Math.sin(f.A * RAD), "a between b sin A and b: two triangles");
    }
    if (q.kind === "back" && q.fig.kind === "bearing") {
      const b = q.fig.legs[0].brg;
      assert.equal(Math.abs(q.v - b), 180);
      assert.ok(q.v >= 0 && q.v < 360);
    }
    if (q.kind === "trip" && q.fig.kind === "bearing") {
      // From the coordinates of the end point.
      let [x, y] = [0, 0];
      for (const l of q.fig.legs) [x, y] = [x + l.d! * Math.sin(l.brg * RAD), y + l.d! * Math.cos(l.brg * RAD)];
      near(q.v, Math.hypot(x, y));
    }
    if (q.fig.kind === "elev") near(Math.tan((q.kind === "elevation" ? q.v : q.fig.ang) * RAD), q.fig.h / (q.kind === "elevation" ? q.fig.d : q.v));
  }
  assert.equal(kinds.size, 5);
  assert.equal(three(65), "065");
  assert.equal(three(425), "065");
});

test("practice: right to 2 dp, with a unit or without, and the worked solution draws", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 60; seed++) {
      const ex = exercise("trigRules", level, seed, en.pracWords);
      assert.ok(!/\{\w+\}/.test(ex.prompt) && !/ {2}/.test(ex.prompt), ex.prompt);
      assert.equal(check(ex, ex.plain, en.pracWords).ok, true, `${level} #${seed}: ${ex.prompt} ${ex.plain}`);
      // The sine and cosine rule kinds from #716 have no worked solution; tests/mistakes.test.ts checks their slips.
      if (!ex.solution) continue;
      const spec = ex.solution.spec as Parameters<typeof renderRule>[0];
      assert.ok(renderRule(spec, null).svg.startsWith("<svg"));
    }
  // A length with its unit; an angle with its degree sign.
  const side = Array.from({ length: 80 }, (_, i) => exercise("trigRules", 2, i + 1, en.pracWords)).find((e) => e.prompt.startsWith("Find x"))!;
  assert.equal(check(side, `${side.plain} cm`, en.pracWords).ok, true);
  const angle = Array.from({ length: 80 }, (_, i) => exercise("trigRules", 2, i + 1, en.pracWords)).find((e) => e.prompt.startsWith("Find the angle"))!;
  assert.equal(check(angle, `${angle.plain}°`, en.pracWords).ok, true);
  for (const t of [ka, ru])
    for (const level of LEVELS) {
      const ex = exercise("trigRules", level, 7, t.pracWords);
      assert.ok(!/\{\w+\}/.test(ex.prompt), ex.prompt);
    }
});
