// Decimals on grids and number lines, place value and estimates (#704): a grid's answer is its shaded squares over
// 100; a point's answer is where it is drawn between the line's two labels; ± on a grid shows both amounts; the best
// estimate rounds each number to a whole; the stories add, take away, compare and round what they give; every slip has
// its hint; each kind sits at its level.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import type { SkillId } from "../src/math/practiceSkills.ts";

const w = en.pracWords;
const D = w.decPics;
const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);
const all = (skill: SkillId) => ([1, 2, 3] as const).flatMap((level) => SEEDS.map((seed) => ({ level, seed, ex: exercise(skill, level, seed, w) })));
const fills = (prompt: string, t: string) => new RegExp(`^${t.split(/\{\w+\}/).map((p) => p.replace(/[.*+?^$()|[\]\\]/g, "\\$&")).join(".+?")}$`).test(prompt);
const value = (s: string) => s.split("/").map(Number).reduce((a, b) => a / b);
const close = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} ≠ ${b}`);
const nums = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).map(Number);
const cells = (svg: string, fill: string) => (svg.match(new RegExp(`fill="${fill}"`, "g")) ?? []).length;

test("a grid's answer is the shaded small squares over 100; a point's is where it is drawn between the labels", () => {
  let [grids, points] = [0, 0];
  for (const { ex, level } of all("convert")) {
    if (level !== 1 || !ex.pic) continue;
    const svg = ex.pic.svg(0, 0);
    if (fills(ex.prompt, D.gridDecimal) || fills(ex.prompt, D.gridFraction)) {
      grids++;
      close(value(ex.plain), cells(svg, "#a5d8ff") / 100, ex.prompt);
    }
    if (fills(ex.prompt, D.lineDecimal) || fills(ex.prompt, D.lineFraction)) {
      points++;
      const labels = [...svg.matchAll(/<text x="([\d.]+)"[^>]*>([\d.]+)<\/text>/g)].map((m) => [Number(m[1]), Number(m[2])]);
      const [[x0, a], [x1, b]] = labels;
      const cx = Number(svg.match(/<circle cx="([\d.]+)"/)![1]);
      assert.ok(Math.abs(a + ((cx - x0) / (x1 - x0)) * (b - a) - value(ex.plain)) < 1e-6, `${ex.plain} on ${a}–${b}`);
    }
  }
  assert.ok(grids > 40 && points > 40, `${grids} grids, ${points} points`);
});

test("± on a grid: blue and orange add to the sum, blue less the crossed squares is the difference", () => {
  let n = 0;
  for (const { ex } of all("decimals")) {
    if (!ex.pic || !ex.q) continue;
    n++;
    const svg = ex.pic.svg(0, 0);
    const [a, b] = nums(ex.q);
    close(cells(svg, "#a5d8ff") / 100, a, ex.q);
    if (ex.q.includes("+")) close(cells(svg, "#ffc078") / 100, b, ex.q);
    else close((svg.match(/stroke="#e03131"/g) ?? []).length / 100, b, ex.q);
    close(Number(ex.plain), ex.q.includes("+") ? a + b : a - b, ex.q);
  }
  assert.ok(n > 40, String(n));
});

test("the best estimate rounds each number to a whole; the stories add, take away, compare and round", () => {
  let n = 0;
  for (const { ex } of [...all("decimals"), ...all("placeValue")]) {
    const x = nums(ex.prompt);
    const is = (k: keyof typeof D) => fills(ex.prompt, D[k]);
    if (is("bestEstimate")) {
      const [a, b] = x;
      close(Number(ex.plain), ex.prompt.includes("+") ? Math.round(a) + Math.round(b) : Math.round(a) - Math.round(b), ex.prompt);
    } else if (is("jug") || is("laps")) close(Number(ex.plain), x[0] + x[1], ex.prompt);
    else if (is("rope")) close(Number(ex.plain), x[0] - x[1], ex.prompt);
    else if (is("faster")) close(Number(ex.plain), x[2] - x[1], ex.prompt); // "100 m in a s … in b s"
    else if (is("jump")) assert.equal(ex.plain, x[0] > x[1] ? D.nino : D.gio, ex.prompt);
    else if (is("pencil")) close(Number(ex.plain), Math.round(x[0] * 10) / 10, ex.prompt);
    else if (is("apples")) close(Number(ex.plain), Math.round(x[0]), ex.prompt);
    else if (is("placeTimes")) {
      // "the g in a … the g in b": the places between them, one or two.
      const [a, b] = [x[1], x[3]];
      close(Number(ex.plain), 10 ** (String(b).length - String(a).length), ex.prompt);
    } else continue;
    n++;
  }
  assert.ok(n > 150, String(n));
});

test("every slip is named with its working, and each new kind sits at its level", () => {
  const where = (skill: SkillId, f: (ex: ReturnType<typeof exercise>) => boolean) => [...new Set(all(skill).filter(({ ex }) => f(ex)).map(({ level }) => level))].sort();
  const story = (ex: ReturnType<typeof exercise>, keys: (keyof typeof D)[]) => keys.some((k) => fills(ex.prompt, D[k]));
  assert.deepEqual(where("convert", (ex) => Boolean(ex.pic) || ex.format === "sign"), [1]);
  assert.deepEqual(where("decimals", (ex) => Boolean(ex.pic) || story(ex, ["bestEstimate", "jug", "rope", "jump", "pencil", "apples"])), [1]);
  assert.deepEqual(where("decimals", (ex) => story(ex, ["laps", "faster"])), [3]);
  assert.deepEqual(where("placeValue", (ex) => story(ex, ["placeTimes"])), [3]);
  const named = new Set<string>();
  for (const skill of ["convert", "decimals", "placeValue"] as const)
    for (const { ex } of all(skill)) {
      assert.ok(check(ex, ex.plain, w).ok, `${skill}: ${ex.prompt} ${ex.q} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, `${skill}: ${ex.prompt} ${ex.q} ${t.input}`);
        assert.ok(v.hint && !/\{\w+\}|undefined/.test(v.hint), v.hint);
        named.add(t.id);
      }
    }
  for (const id of ["gridAsTenths", "wholeGridLeftOut", "stepAsTenth", "lineStartLeftOut", "sameDigitsSameValue", "placeRatioFlipped", "longerDecimal", "truncated", "alignedRight"]) assert.ok(named.has(id), id);
});
