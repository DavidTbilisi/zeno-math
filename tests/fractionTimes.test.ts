// A fraction times a whole number, scaling, and × ÷ stories (#703): each answer is the product or quotient its
// question or picture shows; the scaling pick is the side of the number the fraction puts it on; the area picture's
// shaded corner is the rectangle asked; every slip has its hint; each kind sits at its level.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const P = w.fracSums;
const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);
const all = ([1, 2, 3] as const).flatMap((level) => SEEDS.map((seed) => ({ level, seed, ex: exercise("fractionSums", level, seed, w) })));
const fills = (prompt: string, t: string) => new RegExp(`^${t.split(/\{\w+\}/).map((p) => p.replace(/[.*+?^$()|[\]\\]/g, "\\$&")).join(".+?")}$`).test(prompt);
const value = (s: string) => s.trim().split(" ").reduce((sum, part) => sum + part.split("/").map(Number).reduce((a, b) => a / b), 0);
const close = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} ≠ ${b}`);
/** The fractions and whole numbers in a prompt, in order: "3/4" → 0.75. */
const numbers = (s: string) => (s.match(/\d+ \d+\/\d+|\d+\/\d+|\d+/g) ?? []).map(value);

test("k × a fraction: the answer is k lots of it, and the picture shows k groups or k jumps of it", () => {
  let [bars, jumps, mixed] = [0, 0, 0];
  for (const { ex } of all) {
    const m = ex.q.match(/^(\d) \\times (\d*)\\frac\{(\d+)\}\{(\d+)\}$/);
    if (!m) continue;
    const [k, wh, n, d] = [Number(m[1]), Number(m[2] || 0), Number(m[3]), Number(m[4])];
    close(value(ex.plain), k * (wh + n / d), ex.q);
    if (wh) mixed++;
    const svg = ex.pic?.svg(0, 0) ?? "";
    if (svg.includes("<path d=\"M") && svg.includes("Q")) {
      jumps++;
      assert.equal((svg.match(/ Q /g) ?? []).length, k, ex.q);
    } else if (ex.pic) {
      bars++;
      assert.equal((svg.match(/#a5d8ff/g) ?? []).length, k * n, ex.q);
      assert.equal((svg.match(/<rect/g) ?? []).length, k * d, ex.q);
    }
  }
  assert.ok(bars > 10 && jumps > 10 && mixed > 10, `${bars} bars, ${jumps} jumps, ${mixed} mixed`);
});

test("the stories multiply, add or take away the numbers they give; the hard level's divisions and areas are right", () => {
  let n = 0;
  for (const { ex } of all) {
    const x = numbers(ex.prompt);
    const v = value(ex.plain);
    const is = (k: keyof typeof P) => fills(ex.prompt, P[k]);
    if (is("lunch") || is("walk")) close(v, x[0] + x[1], ex.prompt);
    else if (is("ribbon") || is("plank")) close(v, x[0] - x[1], ex.prompt);
    else if (is("laps") || is("sugar") || is("area") || is("ateOf")) close(v, x[0] * x[1], ex.prompt);
    else if (/\\times \\square$/.test(ex.q)) {
      // 1/d ÷ k = 1/d × □, or k ÷ 1/d = k × □: the box makes the multiplication equal the division.
      const [a, b] = numbers(ex.q.replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2"));
      close((a * v), a / b, ex.q);
    } else continue;
    n++;
  }
  assert.ok(n > 200, String(n));
});

test("scaling: more, less or equal as the fraction is more than, less than or equal to 1; the area's shaded corner is the rectangle", () => {
  let [scale, areas] = [0, 0];
  for (const { ex } of all) {
    if (fills(ex.prompt, P.scale)) {
      scale++;
      const [f, n] = numbers(ex.prompt);
      assert.equal(ex.plain, (f < 1 ? P.less : f > 1 ? P.more : P.equal).replace("{n}", String(n)), ex.prompt);
    }
    if (fills(ex.prompt, P.area)) {
      areas++;
      const [a, b] = numbers(ex.prompt);
      const svg = ex.pic!.svg(0, 0);
      const square = svg.match(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)" fill="#ffffff"/)!;
      const shaded = svg.match(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)" fill="#a5d8ff"/)!;
      assert.ok(Math.abs(Number(shaded[1]) / Number(square[1]) - a) < 1e-3 && Math.abs(Number(shaded[2]) / Number(square[2]) - b) < 1e-3, ex.prompt);
    }
  }
  assert.ok(scale > 20 && areas > 20, `${scale} scaling, ${areas} areas`);
});

test("every slip is named with its working, and each new kind sits at its level", () => {
  const where = (f: (ex: ReturnType<typeof exercise>) => boolean) => [...new Set(all.filter(({ ex }) => f(ex)).map(({ level }) => level))].sort();
  assert.deepEqual(where((ex) => fills(ex.prompt, P.lunch) || fills(ex.prompt, P.ribbon)), [1]);
  assert.deepEqual(where((ex) => /^\d \\times/.test(ex.q) || ["sameAs", "laps", "sugar", "scale", "walk", "plank"].some((k) => fills(ex.prompt, P[k as keyof typeof P]))), [2]);
  assert.deepEqual(where((ex) => /\\times \\square$/.test(ex.q) || ["asks", "area", "ateOf"].some((k) => fills(ex.prompt, P[k as keyof typeof P]))), [3]);
  const named = new Set<string>();
  for (const { ex } of all) {
    assert.ok(check(ex, ex.plain, w).ok, `${ex.prompt} ${ex.q} ${ex.plain}`);
    for (const t of trapInputs(ex)) {
      const v = check(ex, t.input, w);
      assert.equal(v.mistake, t.id, `${ex.prompt} ${ex.q} ${t.input}`);
      assert.ok(v.hint && !/\{\w+\}|undefined|\\frac/.test(v.hint), v.hint);
      named.add(t.id);
    }
  }
  for (const id of ["bottomTimesToo", "mixedPartNotTimes", "addedForTimes", "timesAlwaysBigger", "divisorNotFlipped", "divisionReadAsOf", "areaSidesAdded", "fractionOfLeftOut"]) assert.ok(named.has(id), id);
});
