// The first skills: addition and subtraction, the times tables, division, place value, squares and roots, fractions as
// decimals and percentages, area and perimeter from the measurements. Every question takes its own answer, its
// arithmetic is right, its slips are named and its worked picture can be drawn.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { renderModel } from "../src/math/models.ts";
import { check, exercise, LEVELS, trapInputs, type SkillId } from "../src/math/practice.ts";
import { digitwise, noCarry } from "../src/math/skills/addSubtract.ts";
import { spaced } from "../src/math/skills/placeValue.ts";

const w = en.pracWords;
const SKILLS: SkillId[] = ["placeValue", "addSubtract", "tables", "divide", "squares", "convert", "areaPerimeter"];
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

test("every question takes its own answer in each language, and no slip is the right answer", () => {
  for (const words of [w, ka.pracWords, ru.pracWords])
    for (const skill of SKILLS)
      for (const level of LEVELS)
        for (const seed of SEEDS) {
          const ex = exercise(skill, level, seed, words);
          const where = `${skill} ${level} #${seed}: ${ex.q || ex.prompt} → ${ex.plain}`;
          assert.equal(check(ex, ex.plain, words).ok, true, where);
          assert.ok(!/\{\w+\}/.test(ex.prompt), `${where}: the prompt is filled in`);
          for (const t of trapInputs(ex)) assert.ok(check(ex, t.input, words).mistake, `${where}; ${t.id} ${t.input}`);
        }
});

test("sums, differences, products and quotients are what the question's own numbers make", () => {
  const value = (q: string) => {
    const m = q.match(/^(\d+) (\+|-|\\times|\\div) (\d+)$/);
    if (!m) return null;
    const [a, b] = [Number(m[1]), Number(m[3])];
    return m[2] === "+" ? a + b : m[2] === "-" ? a - b : m[2] === "\\times" ? a * b : a / b;
  };
  let worked = 0;
  for (const skill of ["addSubtract", "tables", "divide", "placeValue"] as const)
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const ex = exercise(skill, level, seed, w);
        const v = value(ex.q);
        if (v === null) continue;
        worked++;
        assert.equal(Number(ex.plain), v, `${skill} ${level} #${seed}: ${ex.q}`);
      }
  assert.ok(worked > 800, `${worked} questions read`);
  // A missing number makes the equation true when it is put in the box.
  for (const skill of ["addSubtract", "tables", "divide", "placeValue"] as const)
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const ex = exercise(skill, level, seed, w);
        if (!ex.q.includes("\\square")) continue;
        const [left, right] = ex.q.replace("\\square", ex.plain).replace(/\\times/g, "*").replace(/\\div/g, "/").split("=");
        const run = (s: string) => Function(`"use strict"; return (${s});`)() as number;
        assert.equal(run(left), run(right), `${skill} ${level} #${seed}: ${ex.q} with ${ex.plain}`);
      }
});

test("the column slips: a carry left out, and the smaller digit taken from the larger", () => {
  assert.equal(noCarry(47, 38), 75);
  assert.equal(noCarry(268, 157), 315);
  assert.equal(digitwise(52, 38), 26);
  assert.equal(digitwise(703, 268), 565);
  assert.equal(spaced(248915), "248\u202f915");
});

test("a remainder is smaller than the divisor, and the quotient given for it is named", () => {
  let named = 0;
  for (const seed of SEEDS) {
    const ex = exercise("divide", 3, seed, w);
    const m = ex.prompt.match(/when (\d+) is divided by (\d+)/);
    if (!m) continue;
    const [a, b] = [Number(m[1]), Number(m[2])];
    assert.equal(Number(ex.plain), a % b);
    assert.ok(a % b > 0);
    const k = Math.floor(a / b);
    if (k !== a % b) {
      assert.equal(check(ex, String(k), w).mistake, "quotientForRemainder");
      named++;
    }
  }
  assert.ok(named > 20);
});

test("squares and roots undo each other, and a tenth squared is in hundredths", () => {
  for (const level of LEVELS)
    for (const seed of SEEDS) {
      const ex = exercise("squares", level, seed, w);
      const v = Number(ex.plain.includes("/") ? Number(ex.plain.split("/")[0]) / Number(ex.plain.split("/")[1]) : ex.plain);
      const sq = ex.q.match(/^([\d.]+)\^(\d)$/);
      if (sq) assert.ok(Math.abs(Number(sq[1]) ** Number(sq[2]) - v) < 1e-9, ex.q);
      const rt = ex.q.match(/^\\sqrt(\[3\])?\{(\d+)\}$/);
      if (rt) assert.ok(Math.abs(v ** (rt[1] ? 3 : 2) - Number(rt[2])) < 1e-9, ex.q);
    }
  const ex = SEEDS.map((s) => exercise("squares", 3, s, w)).find((e) => e.q === "0.3^2")!;
  assert.equal(ex.plain, "0.09");
  assert.equal(check(ex, "0.9", w).mistake, "decimalPlacesKept");
});

test("a decimal typed back for a fraction is sent back, a fraction not cut down too, and a percentage may carry its sign", () => {
  const toFrac = SEEDS.map((s) => exercise("convert", 1, s, w)).find((e) => e.q === "0.6")!;
  assert.equal(toFrac.plain, "3/5");
  assert.deepEqual(check(toFrac, "0.6", w), { ok: false, close: true, why: w.reasons.notFraction });
  assert.equal(check(toFrac, "6/10", w).why, w.reasons.notLowest);
  assert.equal(check(toFrac, "6/100", w).mistake, "wrongPlaceBottom");
  assert.equal(check(toFrac, "3/5", w).ok, true);
  const toPct = SEEDS.map((s) => exercise("convert", 2, s, w)).find((e) => e.prompt === w.basics.toPercent && /^0\.\d+$/.test(e.q))!;
  const pct = Number(toPct.q) * 100;
  assert.equal(toPct.plain, `${Number(pct.toFixed(6))}%`);
  assert.equal(check(toPct, String(Number(pct.toFixed(6))), w).ok, true);
  assert.equal(check(toPct, toPct.plain, w).ok, true);
  assert.equal(check(toPct, `${Number((pct / 10).toFixed(6))}%`, w).mistake, "percentPointOnce");
  // Every conversion keeps the value: the answer is the question's number in another form.
  for (const level of LEVELS)
    for (const seed of SEEDS) {
      const e = exercise("convert", level, seed, w);
      const frac = e.q.match(/^(?:(\d+))?\\frac\{(\d+)\}\{(\d+)\}$/);
      const from = frac ? Number(frac[1] ?? 0) + Number(frac[2]) / Number(frac[3]) : e.q.endsWith("\\%") ? Number(e.q.replace("\\%", "")) / 100 : Number(e.q);
      const typed = e.plain.endsWith("%") ? Number(e.plain.slice(0, -1)) / 100 : e.plain.includes("/") ? Number(e.plain.split("/")[0]) / Number(e.plain.split("/")[1]) : Number(e.plain);
      assert.ok(Math.abs(from - typed) < 1e-9, `convert ${level} #${seed}: ${e.q} → ${e.plain}`);
    }
});

test("area and perimeter: a unit may follow the answer, and the other measure is named", () => {
  const rect = SEEDS.map((s) => exercise("areaPerimeter", 1, s, w)).find((e) => e.prompt === w.basics.area && trapInputs(e).length > 0)!;
  const unit = rect.show.match(/\\text\{(\w+)\}/)![1];
  assert.equal(check(rect, `${rect.plain} ${unit}²`, w).ok, true);
  assert.equal(check(rect, `${rect.plain} ${unit}2`, w).ok, true);
  assert.equal(check(rect, `${rect.plain}${unit}^2`, w).ok, true);
  assert.equal(check(rect, trapInputs(rect)[0].input, w).mistake, "perimeterNotArea");
  for (const level of LEVELS)
    for (const seed of SEEDS) {
      const e = exercise("areaPerimeter", level, seed, w);
      assert.ok(e.pic && e.pic.w > 0 && e.pic.h > 0 && e.pic.svg(0, 0).includes("<g"), `areaPerimeter ${level} #${seed} has its drawing`);
      assert.ok(Number(e.plain) > 0);
    }
  // A circle: the true π, to two places; 3.14 is close and says so.
  const circle = SEEDS.map((s) => exercise("areaPerimeter", 3, s, w)).find((e) => e.prompt === w.basics.circleArea && e.pic!.svg(0, 0).includes(">5 "))!;
  assert.equal(circle.plain, "78.54");
  assert.equal(check(circle, "78.5", w).close, true);
});

test("the worked pictures draw: counters, a bond, an array, long division", () => {
  let drawn = 0;
  for (const skill of SKILLS)
    for (const level of LEVELS)
      for (const seed of SEEDS.slice(0, 60)) {
        const ex = exercise(skill, level, seed, w);
        assert.ok(ex.solution || ex.steps?.length, `${skill} ${level} #${seed} is worked`);
        if (ex.solution?.kind !== "model") continue;
        const svg = renderModel(ex.solution.spec as never);
        assert.ok(svg.svg.includes("<svg") && svg.width > 0 && svg.height > 0, `${skill} ${level} #${seed}`);
        drawn++;
      }
  assert.ok(drawn > 200, `${drawn} pictures`);
});

test("the words are there in every language", () => {
  for (const d of [en, ka, ru]) {
    for (const s of SKILLS) assert.ok(d.pracWords.skills[s]);
    assert.deepEqual(Object.keys(d.pracWords.basics), Object.keys(en.pracWords.basics));
  }
});
