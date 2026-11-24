// Stacked fractions: a fraction with a fraction inside it. Every question takes its own answer in each language, the
// answer is the top divided by the bottom, the three slips are named, and the worked solution starts at the long bar.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { planFracOp, renderFracOp, type FracOpSpec } from "../src/math/fracop.ts";
import { check, exercise, LEVELS, renderSteps, trapInputs } from "../src/math/practice.ts";
import { overTex } from "../src/math/practiceKit.ts";

const w = en.pracWords;
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const valueOf = (s: string) => (s.includes("/") ? Number(s.split("/")[0]) / Number(s.split("/")[1]) : Number(s));
/** "2/3" or "1 3/4" or "5" as a number. */
const read = (s: string) => s.split(" ").reduce((sum, part) => sum + valueOf(part), 0);

test("every question takes its own answer in each language, and no slip is the right answer or another slip", () => {
  for (const words of [w, ka.pracWords, ru.pracWords])
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const ex = exercise("stackedFractions", level, seed, words);
        const where = `${level} #${seed}: ${ex.q} → ${ex.plain}`;
        assert.equal(check(ex, ex.plain, words).ok, true, where);
        assert.ok(ex.q.startsWith("\\dfrac{"), `${where}: one long bar`);
        const slips = trapInputs(ex);
        assert.ok(slips.length >= 1, `${where}: a slip to name`);
        assert.equal(new Set(slips.map((t) => t.input)).size, slips.length, where);
        for (const t of slips) {
          const v = check(ex, t.input, words);
          assert.equal(v.mistake, t.id, `${where}; ${t.input}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), `${where}: the hint is filled in`);
        }
      }
});

test("the answer is the top divided by the bottom, in lowest terms, and never 1", () => {
  for (const level of LEVELS)
    for (const seed of SEEDS) {
      const ex = exercise("stackedFractions", level, seed, w);
      const spec = ex.solution?.spec as FracOpSpec | undefined;
      assert.ok(spec || ex.steps, "a tool's picture or lines of working");
      if (spec) {
        assert.deepEqual([spec.type, spec.op, spec.over], ["fracop", "÷", true]);
        assert.ok(Math.abs(read(spec.a) / read(spec.b) - valueOf(ex.plain)) < 1e-9, `${level} #${seed}: ${spec.a} over ${spec.b} → ${ex.plain}`);
        assert.equal(ex.q, planFracOp(spec).problem, "the tool writes the question the same way");
      }
      assert.notEqual(ex.plain, "1", `${level} #${seed}: ${ex.q}`);
      assert.equal(check(ex, ex.plain.includes("/") ? ex.plain.split("/").map((v) => Number(v) * 2).join("/") : `${Number(ex.plain) * 2}/2`, w).why, w.reasons.notLowest);
    }
});

test("which bar is the long one decides the answer: 1/2 over 3 is 1/6, 1 over 2/3 is 3/2", () => {
  const easy = SEEDS.map((s) => exercise("stackedFractions", 1, s, w));
  const fractionOnTop = easy.find((e) => (e.solution!.spec as FracOpSpec).a === "1/2" && (e.solution!.spec as FracOpSpec).b === "3")!;
  assert.equal(fractionOnTop.plain, "1/6");
  // Read with the short bar as the main one: 1 over 3/2.
  assert.equal(check(fractionOnTop, "3/2", w).mistake, "stackWrongBar");
  assert.equal(check(fractionOnTop, "6", w).mistake, "stackFlipTop");
  const wholeOnTop = easy.find((e) => (e.solution!.spec as FracOpSpec).a === "2" && (e.solution!.spec as FracOpSpec).b === "3/4")!;
  assert.equal(wholeOnTop.plain, "8/3");
  assert.equal(check(wholeOnTop, "1/6", w).mistake, "stackWrongBar", "2/3 over 4");
  assert.equal(check(wholeOnTop, "3/2", w).mistake, "stackNoFlip", "2 × 3/4");
  assert.equal(check(wholeOnTop, "3/8", w).mistake, "stackFlipTop");
  assert.equal(check(wholeOnTop, "2 2/3", w).ok, true, "a mixed number is taken");
  const medium = SEEDS.map((s) => exercise("stackedFractions", 2, s, w)).find((e) => (e.solution!.spec as FracOpSpec).a === "1/2" && (e.solution!.spec as FracOpSpec).b === "1/5")!;
  assert.equal(medium.plain, "5/2");
  assert.equal(check(medium, "1/10", w).mistake, "stackNoFlip");
  assert.equal(check(medium, "2/5", w).mistake, "stackFlipTop");
});

test("hard questions come in all three kinds: a sum beside the bar, 1 ± 1/n over 1 ± 1/m, mixed numbers", () => {
  const hard = SEEDS.map((s) => exercise("stackedFractions", 3, s, w));
  const sums = hard.filter((e) => e.steps?.length === 2);
  const ones = hard.filter((e) => e.steps?.length === 3);
  const mixed = hard.filter((e) => e.solution);
  for (const kind of [sums, ones, mixed]) assert.ok(kind.length > 30);
  assert.ok(sums.some((e) => /^\\dfrac\{[^{}]*\\dfrac\{\d+\}\{\d+\} [+-] /.test(e.q)) && sums.some((e) => / [+-] \\dfrac\{\d+\}\{\d+\}\\enspace\}$/.test(e.q)), "the sum above the bar, and below it");
  for (const e of [...sums, ...ones]) {
    const last = e.steps!.at(-1)!;
    assert.ok(last.startsWith("\\dfrac{") && last.includes("\\div") && last.includes("\\times"), "the long bar, then ÷, then × by the bottom turned over");
    assert.ok(last.endsWith(`= ${e.show.split(" = ")[0]}`), `${last} ends at ${e.show}`);
    assert.ok(!renderSteps(e.steps!).svg.includes("NaN"));
  }
  assert.ok(mixed.every((e) => / /.test((e.solution!.spec as FracOpSpec).a + (e.solution!.spec as FracOpSpec).b)));
});

test("the fraction tool works a stacked fraction from the long bar on, under the same picture as ÷", () => {
  const spec: FracOpSpec = { type: "fracop", op: "÷", a: "2/3", b: "1 3/4", step: 99, over: true };
  const [stacked, flat] = [planFracOp(spec), planFracOp({ ...spec, over: false })];
  assert.equal(stacked.problem, overTex("\\frac{2}{3}", "1\\frac{3}{4}"));
  assert.equal(stacked.lines[0].tex, `${stacked.problem} = \\frac{2}{3} \\div 1\\frac{3}{4}`);
  assert.deepEqual(stacked.lines.slice(1, -1), flat.lines.slice(0, -1), "then the working of the division");
  assert.deepEqual([stacked.res.n, stacked.res.d], [8, 21]);
  // The main bar is the longest: both parts are padded, and the fractions inside keep their size.
  assert.ok(stacked.problem.startsWith("\\dfrac{\\enspace \\dfrac{2}{3}\\enspace}"));
  const svg = renderFracOp(spec).svg;
  assert.ok(svg.includes("#a5d8ff") && !svg.includes("NaN"));
  assert.ok(renderFracOp(spec).height > renderFracOp({ ...spec, over: false }).height, "a stacked line is two fractions tall");
  // Only a division is written stacked.
  assert.equal(planFracOp({ ...spec, op: "+" }).problem, "\\frac{2}{3} + 1\\frac{3}{4}");
});
