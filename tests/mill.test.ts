// Mill's methods: agreement, difference and the joint method read off a table of cases, the outcome written in any
// of its usual ways; correlation for concomitant variation; what is left for residues; and every example renders in
// every language.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderLogic, type LogicSpec } from "../src/math/logic.ts";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { correlation, MILL_PRESETS, readCases, readResidues, readSeries } from "../src/math/logicMill.ts";

const w = en.logicWords.mill;
const preset = (label: string) => MILL_PRESETS.find((p) => p.label === label)!.spec;

test("agreement, difference, the joint method and what is sufficient so far", () => {
  const food = readCases(preset("Food poisoning").f, w);
  assert.equal(food.effect, "sick");
  assert.deepEqual(food.factors, ["oysters", "salad", "cake", "bread"]);
  assert.deepEqual([food.agree, food.joint, food.sufficient], [["oysters"], ["oysters"], ["oysters"]]);
  assert.deepEqual(food.diffs, [{ p: 0, n: 3, f: "oysters" }]);
  // The 1848 case has autopsy hands and no fever, so nothing is in every fever case and none of the others.
  const sem = readCases(preset("Semmelweis").f, w);
  assert.deepEqual([sem.agree, sem.joint, sem.sufficient], [["poor mothers", "crowded", "autopsy hands"], [], []]);
  assert.deepEqual(sem.diffs.map((d) => d.f), ["autopsy hands"]);
  const two = readCases(preset("Two causes").f, w);
  assert.deepEqual([two.agree, two.diffs, two.sufficient], [[], [], ["pollen", "dust"]]);
});

test("an outcome is written as a word and its negation, two words, +/−, yes/no, in three languages", () => {
  const outcome = (src: string) => readCases(src, w).cases.map((c) => c.pos);
  assert.deepEqual(outcome("a, b -> sick\nb -> not sick\na -> ~sick\nc -> ¬Sick"), [true, false, false, false]);
  assert.deepEqual(outcome("a -> sick\nb -> well\nc -> Sick"), [true, false, true]);
  assert.deepEqual(outcome("a -> +\nb -> -\nc -> yes\nd -> no\ne -> 1\nf -> 0"), [true, false, true, false, true, false]);
  assert.deepEqual(outcome("a -> да\nb -> нет\nc -> კი\nd -> არა"), [true, false, true, false]);
  assert.equal(readCases("a -> +", w).effect, "the effect");
  // Factors are split on commas when there are any, else on spaces; a case without a name is numbered.
  const cs = readCases("A B C -> +\nice cream, hot day -> +", w);
  assert.deepEqual(cs.factors, ["A", "B", "C", "ice cream", "hot day"]);
  assert.deepEqual(cs.cases.map((c) => c.name), ["1", "2"]);
  assert.equal(readCases("x: a → e\ny: a, b => e", w).cases.length, 2);
});

test("what can't be read says why", () => {
  assert.throws(() => readCases("", w), /Type the cases/);
  assert.throws(() => readCases("Ann: oysters", w), /Couldn't read “Ann: oysters”/);
  assert.throws(() => readCases("a -> sick\nb -> well\nc -> fine", w), /“sick” and “well” are two already, so “fine” would be a third/);
  assert.throws(() => readCases("a -> -\nb -> no", w), /No case has the effect/);
  const many = Array.from({ length: 11 }, (_, i) => `f${i} -> +`).join("\n");
  assert.throws(() => readCases(many, w), /At most 10 cases and 10 factors/);
});

test("correlation, and rows of numbers with the effect marked or last", () => {
  assert.equal(correlation([1, 2, 3], [2, 4, 6]), 1);
  assert.equal(correlation([1, 2, 3], [6, 4, 2]), -1);
  assert.equal(correlation([1, 1, 1], [1, 2, 3]), undefined);
  assert.ok(Math.abs(correlation([1, 2, 3, 4], [1, 3, 2, 4])! - 0.8) < 1e-12);
  const marked = readSeries("-> y: 1, 2, 3\nx: 3, 2, 1", w);
  assert.deepEqual([marked.effect.name, marked.factors.map((f) => f.name)], ["y", ["x"]]);
  assert.equal(readSeries("x: 1 2 3\nz: −1; 0; 2.5\ny: 1, 2, 3", w).effect.name, "y");
  assert.deepEqual(readSeries("x: 1 2 3\nz: −1; 0; 2.5\ny: 1, 2, 3", w).factors[1].vals, [-1, 0, 2.5]);
  assert.throws(() => readSeries("", w), /Type the cases/);
  assert.throws(() => readSeries("x: 1, a, 3\ny: 1, 2, 3", w), /Couldn't read “x: 1, a, 3”/);
  assert.throws(() => readSeries("x 1, 2, 3", w), /Couldn't read/);
  assert.throws(() => readSeries("x: 1, 2\ny: 1, 2", w), /each with 3 to 12 numbers/);
  assert.throws(() => readSeries("y: 1, 2, 3", w), /Give one to 4 factors/);
  assert.throws(() => readSeries("x: 1, 2, 3, 4\ny: 1, 2, 3", w), /as many numbers as the effect's \(3\)/);
});

test("residues: the whole less the known parts, left to the factor named last", () => {
  const truck = readResidues(preset("A truck on the scale").f, w);
  assert.deepEqual([truck.whole.v, truck.known.map((k) => k.v), truck.rest, truck.left], [7400, [5200, 80], "Load", 2120]);
  assert.equal(readResidues("Whole = 10\nA = 4", w).rest, "the rest");
  assert.equal(readResidues("Whole: 10\nA: 4\n? the wind", w).rest, "the wind");
  assert.equal(readResidues("Whole: 10\nA: 10", w).left, 0);
  assert.throws(() => readResidues("", w), /Type the cases/);
  assert.throws(() => readResidues("Whole: 10", w), /at least one known part/);
  assert.throws(() => readResidues("Whole: 10\nA: 6\nB: 5", w), /add up to 11, more than the whole \(10\)/);
  assert.throws(() => readResidues("Whole: 10\nA: lots\nB", w), /Couldn't read “A: lots”/);
  assert.throws(() => readResidues("Whole\nA: 3", w), /Couldn't read “Whole”/);
});

/** The captions of a picture as one string (a long one wraps over several lines). */
const caps = (spec: LogicSpec, words = en.logicWords) =>
  [...renderLogic(spec, words).svg.matchAll(/font-size="14.5"[^>]*>([^<]*)</g)].map((m) => m[1]).join(" ").replace(/&#39;/g, "'");

test("the captions name each method's finding", () => {
  const food = caps(preset("Food poisoning"));
  assert.match(food, /Agreement: oysters is the one thing every case marked sick shares/);
  assert.match(food, /Difference: Ann and Eva differ only in oysters, and only Ann is marked sick/);
  assert.match(food, /Joint method: oysters is in every case marked sick and in none of the others/);
  assert.doesNotMatch(food, /Sufficient so far/);
  assert.match(caps(preset("Agreement can't choose")), /coffee, late night are in every case marked headache; agreement alone can't choose/);
  assert.match(caps(preset("Agreement can't choose")), /Difference needs a case not marked headache/);
  const two = caps(preset("Two causes"));
  assert.match(two, /no one factor is in every case marked sneezing/);
  assert.match(two, /Difference: no case left unmarked differs/);
  assert.match(two, /Sufficient so far: whenever pollen, dust turned up/);
  const fert = caps(preset("Fertiliser"));
  assert.match(fert, /fertiliser rises with growth \(r = 0\.99\)/);
  assert.match(fert, /rain hardly moves with growth/);
  assert.match(fert, /By concomitant variation, fertiliser is the best candidate/);
  const ice = caps(preset("Ice cream and drowning"));
  assert.match(ice, /ice cream sold, temperature all move with drownings/);
  assert.doesNotMatch(ice, /best candidate/);
  const variation = (f: string) => caps({ topic: "mill", f, g: "", vals: "", tf: true, mill: "variation" });
  assert.match(variation("x: 3, 2, 1\n-> y: 1, 2, 3"), /x falls as y rises \(r = −1\.00\)\. By concomitant variation, x is the best candidate/);
  assert.match(variation("k: 5, 5, 5\nn: 1, 3, 2\n-> y: 1, 2, 3"), /k doesn't change.*n rises with y \(r = 0\.50\).*Nothing moves closely with y/);
  assert.match(caps(preset("A truck on the scale")), /By residues: 7400 − 5200 − 80 = 2120\. What the known causes don't account for is left to Load\./);
  assert.match(caps({ topic: "mill", f: "Whole: 10\nA: 10", g: "", vals: "", tf: true, mill: "residues" }), /Nothing is left/);
});

test("every example renders in every language", () => {
  for (const words of [en.logicWords, ru.logicWords, ka.logicWords])
    for (const p of MILL_PRESETS) assert.doesNotMatch(renderLogic(p.spec, words).svg, /NaN|undefined|\{\w+\}/, p.label);
  // A spec without a mode reads the table of cases.
  assert.match(caps({ ...preset("Food poisoning"), mill: undefined }), /Agreement: oysters/);
});
