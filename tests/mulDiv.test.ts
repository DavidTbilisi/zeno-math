// Multiplication and division, meaning and properties (#699): pictures of groups, arrays, jumps and plates that agree
// with the answer; the stories' numbers make the answer; partial products add up to the product; the box makes each
// property true; a fact family divides the product; each new kind sits at the level whose grade fits it.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const W = w.mulDiv;
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const all = (skill: "tables" | "times" | "divide") => LEVELS.flatMap((level) => SEEDS.map((seed) => ({ level, seed, ex: exercise(skill, level, seed, w) })));
/** Does a prompt fill this template? */
const fills = (prompt: string, t: string) => new RegExp(`^${t.split(/\{\w+\}/).map((p) => p.replace(/[.*+?^$()|[\]\\]/g, "\\$&")).join(".+?")}$`).test(prompt);
const count = (svg: string, tag: string) => (svg.match(new RegExp(`<${tag} `, "g")) ?? []).length;
const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);

test("a picture of groups or an array has as many dots as the product; jumps and plates count the factors", () => {
  let seen = 0;
  for (const { ex, seed } of [...all("tables"), ...all("divide")]) {
    if (!ex.pic) continue;
    seen++;
    const svg = ex.pic.svg(0, 0);
    const where = `#${seed}: ${ex.prompt} ${ex.q}`;
    const dots = count(svg, "circle");
    if (ex.prompt === W.groupsTotal) assert.equal(dots, Number(ex.plain), where);
    if (fills(ex.prompt, W.share)) {
      const [a, b] = nums(ex.prompt);
      assert.equal(dots, a, where);
      assert.equal(count(svg, "ellipse"), b, where);
      assert.equal(Number(ex.plain) * b, a);
    }
    if (ex.prompt === W.whichTimes) {
      const [a, b] = nums(ex.show);
      const jumps = (svg.match(/ Q /g) ?? []).length;
      assert.ok(jumps === a || dots === a * b, where);
    }
    if (ex.q.includes("\\square \\times")) assert.equal(dots, nums(ex.q).at(-1)! * Number(ex.plain), where);
  }
  assert.ok(seen > 100);
});

test("stories: the numbers in each story make its answer", () => {
  const times = [W.bags, W.eggs, W.garden, W.pencils, W.timesAsTall, W.cinema, W.train];
  const per = [W.share, W.teams, W.packs];
  let stories = 0;
  for (const { ex } of [...all("tables"), ...all("times"), ...all("divide")]) {
    const n = nums(ex.prompt);
    const v = Number(ex.plain);
    if (times.some((t) => fills(ex.prompt, t))) {
      stories++;
      assert.equal(v, n[0] * n[1], ex.prompt);
      assert.ok(trapInputs(ex).length > 0, `${ex.prompt}: a slip is named`);
    }
    if (per.some((t) => fills(ex.prompt, t))) {
      stories++;
      const [a, b] = fills(ex.prompt, W.packs) ? [n[1], n[0]] : [n[0], n[1]];
      assert.equal(v * b, a, ex.prompt);
      assert.equal(check(ex, String(a * b), w).mistake, "multipliedForDivide");
    }
    if (fills(ex.prompt, W.baker)) {
      stories++;
      const [a, b, c] = n;
      assert.equal(v * c, a * b, ex.prompt);
      assert.equal(check(ex, String(a * b), w).mistake, "secondStepMissed");
    }
  }
  assert.ok(stories > 200, `${stories} stories`);
});

test("partial products add up to the product, and the box makes the sum true", () => {
  let parts = 0;
  for (const { ex, level, seed } of all("times")) {
    if (!ex.q.includes("\\square")) continue;
    parts++;
    const [left, right] = ex.q.replace("\\square", ex.plain).replace(/\\times/g, "*").split("=");
    const run = (s: string) => Function(`"use strict"; return (${s});`)() as number;
    assert.equal(run(left), run(right), `times ${level} #${seed}: ${ex.q} with ${ex.plain}`);
    const t = trapInputs(ex).find((t) => t.id === "partZerosDropped");
    if (t) assert.equal(Number(t.input) * 10 ** (ex.plain.length - t.input.length), Number(ex.plain), "the slip is the box without its zeros");
  }
  assert.ok(parts > 100);
});

test("a fact family divides the product; a sharing story's equation divides", () => {
  let picks = 0;
  for (const { ex } of all("divide")) {
    if (ex.answer.k !== "pick") continue;
    picks++;
    const right = ex.answer.options[ex.answer.right].text;
    if (fills(ex.prompt, W.family)) {
      const [a, b, c] = nums(ex.prompt);
      assert.equal(right, `${c} ÷ ${a} = ${b}`);
    } else if (fills(ex.prompt, W.estimateQuotient)) {
      // The estimate is of a number near a, one the divisor goes into: within a third of a place.
      const [a, b] = nums(ex.prompt);
      assert.ok(Math.abs(Number(right) * b - a) < a / 20, `${a} ÷ ${b} ≈ ${right}`);
    } else assert.match(right, /^\d+ ÷ \d+ = □$/);
    for (const t of trapInputs(ex)) assert.ok(check(ex, t.input, w).hint);
  }
  assert.ok(picks > 50);
});

test("each new kind is asked at the level whose grade fits it", () => {
  const where = (skill: "tables" | "times" | "divide", f: (ex: ReturnType<typeof exercise>) => boolean) => [...new Set(all(skill).filter(({ ex }) => f(ex)).map(({ level }) => level))].sort();
  assert.deepEqual(where("tables", (ex) => ex.prompt === W.groupsTotal || ex.prompt === W.whichTimes), [1]);
  assert.deepEqual(where("tables", (ex) => ex.q.includes(" + \\square") || ex.q.includes("\\times (")), [2]);
  assert.deepEqual(where("tables", (ex) => fills(ex.prompt, W.timesAsTall)), [3]);
  assert.deepEqual(where("times", (ex) => /= \\square \+|\+ \\square/.test(ex.q) && (ex.q.match(/\+/g) ?? []).length >= 2), [2]);
  assert.deepEqual(where("times", (ex) => fills(ex.prompt, W.cinema) || fills(ex.prompt, W.train)), [3]);
  assert.deepEqual(where("divide", (ex) => fills(ex.prompt, W.family) || fills(ex.prompt, W.share)), [1]);
  assert.deepEqual(where("divide", (ex) => fills(ex.prompt, W.stickers)), [2]);
  assert.deepEqual(where("divide", (ex) => fills(ex.prompt, W.baker)), [3]);
});

test("an area model's parts make the product, the asked part is the answer; estimates round, then multiply or divide", () => {
  const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  let areas = 0;
  for (const { ex, seed } of [...all("times"), ...all("divide")]) {
    const where = `#${seed}: ${ex.prompt} ${ex.q}`;
    if (ex.pic && ex.q.includes("\\square") && /\\times|\\div/.test(ex.q)) {
      areas++;
      // The q is a × b = parts (times) or a ÷ b = parts (divide); the drawn labels are the sides and the cells.
      // The sides' lengths are drawn first, then each cell's area.
      const svg = ex.pic.svg(0, 0);
      const shown = texts(svg).map((t) => (t === "?" ? Number(ex.plain) : Number(t)));
      if (ex.q.includes("\\times")) {
        const [a, b] = nums(ex.q);
        const cells = shown.slice(shown.length - count(svg, "rect"));
        assert.equal(cells.reduce((s, c) => s + c, 0), a * b, where);
      } else {
        const [a, b] = nums(ex.q);
        const [top1, top2, side, c1, c2] = shown;
        assert.deepEqual([side, top1 + top2, c1 + c2], [b, a / b, a], where);
      }
    }
    if (ex.answer.k === "pick" && fills(ex.prompt, W.bestEstimate)) {
      const [a, b] = nums(ex.prompt);
      const lead = (n: number) => Math.round(n / 10 ** Math.floor(Math.log10(n))) * 10 ** Math.floor(Math.log10(n));
      assert.equal(ex.plain, String(lead(a) * lead(b)), where);
    }
  }
  assert.ok(areas > 80, `${areas}`);
});

test("the multi-digit kinds sit where their grade is: estimates and area models at P4, stories in two steps at the top", () => {
  const where = (skill: "times" | "divide", f: (ex: ReturnType<typeof exercise>) => boolean) => [...new Set(all(skill).filter(({ ex }) => f(ex)).map(({ level }) => level))].sort();
  assert.deepEqual(where("times", (ex) => fills(ex.prompt, W.bestEstimate)), [2]);
  assert.deepEqual(where("times", (ex) => fills(ex.prompt, W.packsLeft) || fills(ex.prompt, W.treeFromTower)), [3]);
  assert.deepEqual(where("divide", (ex) => fills(ex.prompt, W.estimateQuotient) || (!!ex.pic && ex.q.includes("\\div"))), [3]);
  // Three and four digits divided by one, with a remainder.
  const big = all("divide").filter(({ ex }) => fills(ex.prompt, w.written.fits) || fills(ex.prompt, w.basics.remainder));
  assert.ok(big.some(({ ex }) => nums(ex.prompt)[0] >= 1000));
  for (const { ex } of big) {
    // "How many whole times does b go into a?" names the divisor first.
    const fits = fills(ex.prompt, w.written.fits);
    const [a, b] = fits ? nums(ex.prompt).reverse() : nums(ex.prompt);
    assert.equal(Number(ex.plain), fits ? Math.floor(a / b) : a % b);
  }
});
