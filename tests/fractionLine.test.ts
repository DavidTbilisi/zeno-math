// Fractions as numbers on a line, equal parts, parts of a fraction and fractions compared in stories (#702): a point's
// answer is where the drawn point is; a lettered point picked is at the fraction asked; every slip has its hint; each
// kind sits at the level whose grade fits it.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import type { SkillId } from "../src/math/practiceSkills.ts";

const w = en.pracWords;
const W = w.fracLine;
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const all = (skill: SkillId) => ([1, 2, 3] as const).flatMap((level) => SEEDS.map((seed) => ({ level, seed, ex: exercise(skill, level, seed, w) })));
const fills = (prompt: string, t: string) => new RegExp(`^${t.split(/\{\w+\}/).map((p) => p.replace(/[.*+?^$()|[\]\\]/g, "\\$&")).join(".+?")}$`).test(prompt);
const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
const value = (plain: string) => plain.split("/").map(Number).reduce((a, b) => a / b);

/** Where on the drawn line a point is, in wholes: from the x of the labels 0 and 1 under the first line. */
function onLine(svg: string, cx: number) {
  const label = (s: string) => Number([...svg.matchAll(/<text x="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].find((m) => m[2] === s)![1]);
  const [x0, x1] = [label("0"), label("1")];
  return (cx - x0) / (x1 - x0);
}

test("a point read off the line is where it is drawn; a lettered point picked is at the fraction asked", () => {
  let points = 0, letters = 0;
  for (const { ex, level, seed } of all("equivalent")) {
    if (level !== 2 || !ex.pic) continue;
    const svg = ex.pic.svg(0, 0);
    const where = `#${seed}: ${ex.prompt}`;
    if (ex.prompt === W.point) {
      points++;
      const cx = Number(svg.match(/<circle cx="([\d.]+)"[^>]*r="6.5"/)![1]);
      assert.ok(Math.abs(onLine(svg, cx) - value(ex.plain)) < 1e-3, where); // drawn to two decimals
    }
    if (ex.answer.k === "pick" && (fills(ex.prompt, W.findOne) || fills(ex.prompt, W.barToLine))) {
      letters++;
      const at = (letter: string) => {
        const t = [...svg.matchAll(/<circle cx="([\d.]+)"[^>]*r="5"[^>]*\/><text[^>]*>([A-C])<\/text>/g)].find((m) => m[2] === letter)!;
        return onLine(svg, Number(t[1]));
      };
      // Finding 1, the line is labelled only at 0 and its first mark 1/d, whose top "1" stands at that mark: the
      // point at 1 is d first marks along. The bar's line is labelled at 0 and 1.
      const n = nums(ex.prompt);
      const want = fills(ex.prompt, W.findOne) ? n[2] : n[0] / n[1]; // "starts at 0 … is 1/d … at 1"
      assert.ok(Math.abs(at(ex.plain) - want) < 1e-3, `${where} → ${ex.plain}`);
    }
  }
  assert.ok(points > 30 && letters > 30, `${points} points, ${letters} letters`);
});

test("the box answers: a whole number as a fraction, the same point on a finer line, the part of a fraction left", () => {
  for (const skill of ["equivalent", "fractionSums"] as const)
    for (const { ex } of all(skill)) {
      if (!/\\square/.test(ex.q) || ex.format !== "number") continue;
      const n = nums(ex.q);
      const v = Number(ex.plain);
      if (skill === "equivalent" && n.length === 2) assert.equal(v, n[0] * n[1], ex.q); // m = □/d
      else if (skill === "equivalent") assert.equal(v * n[1], n[0] * n[2], ex.q); // a/b = □/e
      else assert.equal(v, n[0] - n[2], ex.q); // a/d = b/d + □/d
    }
});

test("the fence story's team is the one with the bigger fraction; the same part of the large pizza is more", () => {
  let stories = 0;
  for (const { ex } of all("compareFractions")) {
    if (ex.answer.k !== "pick") continue;
    stories++;
    if (fills(ex.prompt, W.fence)) {
      const [a, b, c, d] = nums(ex.prompt);
      const [x, y] = [a / b, c / d];
      assert.equal(ex.plain, x > y ? W.red : x < y ? W.blue : W.same, ex.prompt);
    } else assert.ok(fills(ex.plain, W.ofLarge), ex.prompt);
  }
  assert.ok(stories > 50);
});

test("every new kind's slips are named with their working, and each sits at its level", () => {
  const where = (skill: SkillId, f: (ex: ReturnType<typeof exercise>) => boolean) => [...new Set(all(skill).filter(({ ex }) => f(ex)).map(({ level }) => level))].sort();
  assert.deepEqual(where("equivalent", (ex) => ex.answer.k !== "near"), [2]);
  assert.deepEqual(where("shadeFraction", (ex) => fills(ex.prompt, W.equalParts)), [1]);
  assert.deepEqual(where("fractionSums", (ex) => fills(ex.prompt, w.fracSums.whichSum) || /\\frac\{\\square\}/.test(ex.q)), [1]);
  assert.deepEqual(where("compareFractions", (ex) => ex.answer.k === "pick"), [3]);
  const named = new Set<string>();
  for (const skill of ["equivalent", "shadeFraction", "fractionSums", "compareFractions"] as const)
    for (const { ex } of all(skill)) {
      assert.ok(check(ex, ex.plain, w).ok, `${skill}: ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, `${skill}: ${ex.prompt} ${t.input}`);
        assert.ok(v.hint && !/\{\w+\}|undefined/.test(v.hint), v.hint);
        named.add(t.id);
      }
    }
  for (const id of ["marksForParts", "oneTooSoon", "partsAfterWhole", "unshadedRead", "wholeNotScaled", "pastOneAsLess", "sameTopKept", "allPiecesAsBottom", "unequalParts", "partsAdded", "bottomSplit", "wholesIgnored"])
    assert.ok(named.has(id), id);
});
