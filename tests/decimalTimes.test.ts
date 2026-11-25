// Multiplying and dividing decimals: every question takes its own answer in three languages and no slip is right; a
// product or quotient asked is the true one; tenths times tenths are drawn on the hundred grid; dividing by a decimal
// makes both numbers whole; the hard level asks powers of ten, stories and more-or-less. The grid model is checked too.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { renderMultiply, stepCount } from "../src/math/multiply.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { roughly } from "../src/math/skills/decimalTimes.ts";
import { gradeOf } from "../src/model/curriculum.ts";

const w = en.pracWords;
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
/** A slip as it is typed: a decimal or a fraction (9/5). */
const valueOf = (s: string) => (s.includes("/") ? Number(s.split("/")[0]) / Number(s.split("/")[1]) : Number(s));

test("every question takes its own answer in each language, and no slip is the right answer", () => {
  for (const words of [w, ka.pracWords, ru.pracWords])
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const ex = exercise("decimalTimes", level, seed, words);
        const where = `${level} #${seed}: ${ex.prompt} ${ex.q} → ${ex.plain}`;
        assert.equal(check(ex, ex.plain, words).ok, true, where);
        assert.ok(!/\{\w+\}/.test(ex.prompt), `${where}: the prompt is filled in`);
        assert.equal(trapInputs(ex).length, ex.answer.traps?.length ?? 0, `${where}: every slip can be typed`);
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, words);
          assert.equal(v.mistake, t.id, `${where}; ${t.id} ${t.input}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), `${where}: ${v.hint}`);
        }
      }
});

test("a product or a quotient asked is the true one", () => {
  let seen = 0;
  for (const level of LEVELS)
    for (const seed of SEEDS) {
      const ex = exercise("decimalTimes", level, seed, w);
      const m = ex.q.match(/^([\d.]+) \\(times|div) ([\d.]+)$/);
      if (!m || ex.answer.k !== "num") continue;
      seen++;
      const [a, b] = [Number(m[1]), Number(m[3])];
      assert.ok(close(ex.answer.v, m[2] === "times" ? a * b : a / b), `${level} #${seed}: ${ex.q} = ${ex.plain}`);
    }
  assert.ok(seen > 400);
});

test("tenths times tenths are worked on the hundred grid, and tenths for hundredths is the slip", () => {
  let grids = 0;
  for (const level of [1, 2] as const)
    for (const seed of SEEDS) {
      const ex = exercise("decimalTimes", level, seed, w);
      if (ex.solution?.kind !== "model") continue;
      grids++;
      const spec = ex.solution.spec as { style: string; a: number; b: number };
      assert.equal(spec.style, "grid");
      assert.equal(ex.q, `${spec.a / 10} \\times ${spec.b / 10}`);
      assert.ok(close(ex.answer.k === "num" ? ex.answer.v : NaN, (spec.a * spec.b) / 100));
      const slip = trapInputs(ex).find((t) => t.id === "placesNotAdded")!;
      assert.ok(close(valueOf(slip.input), (spec.a * spec.b) / 10), `${ex.q}: ${slip.input}`);
      if (level === 2) assert.ok(spec.a > 10, `${ex.q}: past one at the middle level`);
    }
  assert.ok(grids > 150);
});

test("every worked solution is drawn", async () => {
  for (const level of [1, 2] as const)
    for (const seed of SEEDS.slice(0, 40)) {
      const ex = exercise("decimalTimes", level, seed, w);
      if (ex.solution) assert.ok((await renderSolution(ex.solution, en))?.svg.includes("<svg"), `${level} #${seed}`);
    }
});

test("dividing by a decimal makes both whole; making only the divisor whole is the slip", () => {
  let seen = 0;
  for (const seed of SEEDS) {
    const ex = exercise("decimalTimes", 3, seed, w);
    if (!ex.steps?.[0]?.includes("\\div") || !ex.steps[0].includes("(")) continue;
    seen++;
    const m = ex.steps[0].match(/^([\d.]+) \\div ([\d.]+) = \(\1 \\times (\d+)\)/)!;
    const [x, y, k] = [Number(m[1]), Number(m[2]), Number(m[3])];
    assert.ok(Number.isInteger(Math.round(y * k * 1e9) / 1e9), `${ex.steps[0]}: the divisor is made whole`);
    assert.ok(close(ex.answer.k === "num" ? ex.answer.v : NaN, x / y));
    const slip = trapInputs(ex).find((t) => t.id === "divisorOnlyScaled");
    if (slip) assert.ok(close(valueOf(slip.input), x / (y * k)));
  }
  assert.ok(seen > 100);
});

test("the hard level: powers of ten, stories and more or less, each with its slip", () => {
  let [powers, stories, more, less] = [0, 0, 0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("decimalTimes", 3, seed, w);
    if (ex.q.includes("10^{")) {
      powers++;
      const n = Number(ex.q.match(/10\^\{(\d)\}/)![1]);
      if (ex.q.startsWith("10^")) {
        assert.equal(ex.plain, String(10 ** n));
        assert.equal(check(ex, String(10 * n), w).mistake, "powerTimesExponent");
      } else if (ex.q.includes("\\times")) assert.equal(check(ex, ex.q.split(" ")[0], w).mistake, "zerosTacked");
    } else if (ex.q === "") stories++;
    else if (ex.answer.k === "pick") {
      const [a, op, b] = ex.q.split(" ");
      const v = op === "\\times" ? Number(a) * Number(b) : Number(a) / Number(b);
      assert.equal(ex.plain, v > Number(a) ? w.decTimes.more : w.decTimes.less, ex.q);
      if (v > Number(a)) more++;
      else less++;
      if (Number(b) < 1) assert.equal(trapInputs(ex)[0].id, op === "\\times" ? "timesAlwaysBigger" : "divideAlwaysSmaller");
    }
  }
  assert.ok(powers > 40 && stories > 40 && more > 15 && less > 15, `${powers} ${stories} ${more} ${less}`);
});

test("the grid model: three steps, the overlap counted in hundredths", () => {
  const spec = { type: "multiply" as const, style: "grid" as const, a: 3, b: 4, step: 999 };
  assert.equal(stepCount(spec), 3);
  assert.ok(renderMultiply(spec).svg.includes("0.3 × 0.4 = 12 × 0.01 = 0.12"));
  assert.ok(renderMultiply({ ...spec, step: 0 }).svg.includes("0.3 × 0.4 = ?"));
  assert.ok(renderMultiply({ ...spec, a: 13, b: 24 }).svg.includes("1.3 × 2.4 = 312 × 0.01 = 3.12"));
  // Tenths of 1 are not × 1: no rule for one is written under the grid.
  assert.ok(!renderMultiply({ ...spec, a: 10, b: 4 }).svg.includes("n × 1"));
  assert.throws(() => renderMultiply({ ...spec, a: 31 }));
  for (const [a, b] of [[0, 4], [3, 0], [0, 0], [30, 30], [1, 1]]) {
    const r = renderMultiply({ ...spec, a, b });
    assert.doesNotMatch(r.svg, /NaN|Infinity|undefined/, `${a} × ${b}`);
    assert.ok(r.svg.includes(`= ${a * b} × 0.01 = ${Number(((a * b) / 100).toFixed(2))}<`), `${a} × ${b}`);
  }
});

test("an estimate rounds to one figure", () => {
  assert.deepEqual([0.35, 2.4, 17.5, 0.06, 9.7].map(roughly), [0.4, 2, 20, 0.06, 10]);
});

test("its grades: two levels in grade 5, dividing by a decimal in grade 6", () => {
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("decimalTimes", L as 1 | 2 | 3)), [5, 5, 6]);
});
