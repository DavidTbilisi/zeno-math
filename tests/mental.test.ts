// Mental math and problem-solving tactics state the right answers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { magicSquare, reciprocal, renderMental, type DivMethod, type MentalSpec } from "../src/math/mental.ts";
import { renderTactics, type TacticsSpec } from "../src/math/tactics.ts";

const mw = en.mentalWords;
const tw = en.tacticsWords;
const textOf = (svg: string) => [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ");
const M = (o: Partial<MentalSpec>): MentalSpec => ({ topic: "multiply", a: "", b: "", c: "", base: "", op: "*", sys: "en", words: "", ...o });
const T = (o: Partial<TacticsSpec>): TacticsSpec => ({ topic: "symmetry", n: "10", p: "10", h: "9", mode: "count", nums: "", rows: "8", cols: "8", removed: "", ...o });
const pretty = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

test("multiplication near a base: the stated product is right", () => {
  let seed = 5;
  const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
  for (let k = 0; k < 200; k++) {
    const a = 1 + rnd(1200);
    const b = 1 + rnd(1200);
    const base = k % 5 === 0 ? "50" : "";
    const shown = textOf(renderMental(M({ a: String(a), b: String(b), base }), mw).svg);
    assert.ok(shown.includes(`= ${pretty(a * b)}`), `${a} × ${b} (B ${base || "auto"}): ${shown.slice(0, 200)}`);
  }
});

test("digit-sum check: catches errors, passes truths, misses swaps", () => {
  const verdict = (o: Partial<MentalSpec>) => textOf(renderMental(M({ topic: "check", ...o }), mw).svg);
  assert.ok(verdict({ a: "467532", b: "107777", op: "*" }).includes(mw.chk.pass));
  assert.ok(verdict({ a: "4568", b: "3799", op: "+", c: "8357" }).includes(mw.chk.fail));
  assert.ok(verdict({ a: "32", b: "32", op: "*", c: "1240" }).includes(mw.chk.passWrong));
  assert.ok(verdict({ a: "2308682040", b: "36524", op: "/" }).includes(mw.chk.pass));
  assert.ok(verdict({ a: "9000", b: "2718", op: "-" }).includes(mw.chk.pass));
  assert.ok(verdict({ a: "100", b: "7", op: "/", c: "14 r 3" }).includes(mw.chk.fail));
});

test("roots of perfect squares and cubes", () => {
  for (let r = 1; r < 400; r += 7) {
    assert.match(renderMental(M({ topic: "sqrt", a: String(r * r) }), mw).svg, new RegExp(`So √N = ${r} `));
    assert.match(renderMental(M({ topic: "cbrt", a: String(r ** 3) }), mw).svg, new RegExp(`So ∛N = ${r} `));
  }
  assert.throws(() => renderMental(M({ topic: "sqrt", a: "7745" }), mw));
  assert.throws(() => renderMental(M({ topic: "cbrt", a: "1000001" }), mw));
});

test("Anurupya cubing gives n³", () => {
  for (let n = 10; n < 100; n++) assert.ok(textOf(renderMental(M({ topic: "cube", a: String(n) }), mw).svg).includes(`${n}³ = ${pretty(n ** 3)}`), String(n));
});

test("magic squares by the walk are magic", () => {
  for (const n of [3, 5, 7, 9]) {
    const { grid } = magicSquare(n);
    const target = (n * (n * n + 1)) / 2;
    const sums = [
      ...grid.map((r) => r.reduce((x, y) => x + y, 0)),
      ...grid.map((_, j) => grid.reduce((x, r) => x + r[j], 0)),
      grid.reduce((x, r, i) => x + r[i], 0),
      grid.reduce((x, r, i) => x + r[n - 1 - i], 0),
    ];
    assert.ok(sums.every((s) => s === target), `n = ${n}: ${sums}`);
    assert.deepEqual(grid.flat().sort((a, b) => a - b), Array.from({ length: n * n }, (_, i) => i + 1));
  }
  // The vault's trace for 5 × 5: 1 at (3,5), 2 at (4,1), 3 at (5,2), 4 at (1,3), 5 at (2,4), 6 at (2,3).
  const g = magicSquare(5).grid;
  assert.deepEqual([g[2][4], g[3][0], g[4][1], g[0][2], g[1][3], g[1][2]], [1, 2, 3, 4, 5, 6]);
});

test("Major System words decode back", () => {
  const ok = (o: Partial<MentalSpec>) => textOf(renderMental(M({ topic: "major", ...o }), mw).svg);
  assert.ok(ok({ a: "3.141592653589793", words: "mat rat lip notch lime lava puck beam" }).includes("All 8 words decode back"));
  assert.ok(ok({ a: "3.1415926535", sys: "ru", words: "кожа чиж пир тело бок бой" }).includes("All 6 words decode back"));
  assert.ok(ok({ a: "1789", words: "tack fob" }).includes("All 2 words"));
  assert.ok(ok({ a: "42", words: "lion" }).includes("0 of 1 words"));
});

test("tactics: Gauss, pigeonhole, dominoes", () => {
  assert.ok(textOf(renderTactics(T({ n: "10" }), tw).svg).includes("110 / 2 = 55"));
  const pig = textOf(renderTactics(T({ topic: "pigeonhole", mode: "residues", nums: "17, 42, 8, 91, 33, 64", h: "5" }), tw).svg);
  assert.ok(pig.includes("42 − 17 = 25 = 5 · 5"), pig);
  const tile = (o: Partial<TacticsSpec>) => textOf(renderTactics(T({ topic: "tiling", ...o }), tw).svg);
  assert.ok(tile({ removed: "a1 h8" }).includes("Impossible"));
  assert.ok(tile({ removed: "a1 b1" }).includes("here is a tiling with 31 dominoes"));
  assert.ok(tile({ rows: "3", cols: "4", removed: "1,2 2,1 2,4 3,3" }).includes("yet no tiling exists"));
  assert.ok(tile({ rows: "3", cols: "3", removed: "" }).includes("odd number"));
});

test("mental division: all three methods give the true quotient and remainder", () => {
  let seed = 11;
  const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
  const div = (method: DivMethod, N: number, d: number) => textOf(renderMental(M({ topic: "divide", a: String(N), b: String(d), method }), mw).svg);
  for (let k = 0; k < 120; k++) {
    const d = [2 + rnd(98), 10 + rnd(990), 100 + rnd(9900)][k % 3];
    const N = d * (1 + rnd(100000)) + rnd(d) + (k % 7 === 0 ? 0 : rnd(5));
    const want = `${pretty(N)} ÷ ${pretty(d)} = ${pretty(Math.floor(N / d))}, remainder ${pretty(N % d)}.`;
    for (const method of ["base", "flag", "table"] as const) {
      if (method === "flag" && d < 10) continue;
      if (String(N).length <= String(d).length) continue;
      const shown = div(method, N, d);
      assert.ok(shown.includes(want), `${method} ${N} ÷ ${d}: ${shown.slice(-160)}`);
    }
  }
  // The examples from the notes.
  assert.ok(div("table", 27483624, 62).includes("443 284, remainder 16"));
  assert.ok(div("table", 27483624, 62).includes("56 → 2 ✓"));
  assert.ok(div("flag", 8384, 32).includes("= 262, remainder 0"));
  assert.throws(() => renderMental(M({ topic: "divide", a: "5", b: "89", method: "base" }), mw), /more digits/);
  assert.throws(() => renderMental(M({ topic: "divide", a: "500", b: "7", method: "flag" }), mw), /two digits/);
});

test("divisibility rules agree with the remainder", () => {
  let seed = 3;
  const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
  for (let k = 0; k < 300; k++) {
    // Mostly multiples of the rule numbers, so every rule is hit both ways.
    const n = (1 + rnd(5000)) * [1, 7, 11, 13, 8, 9, 1001, 4][k % 8] + (k % 5 === 0 ? 1 : 0);
    const shown = textOf(renderMental(M({ topic: "rules", a: String(n) }), mw).svg);
    const yes = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13].filter((d) => n % d === 0);
    assert.ok(shown.includes(yes.length ? `is divisible by ${yes.join(", ")}.` : "divisible by none"), `${n}: ${shown.slice(-200)}`);
  }
});

test("reciprocals: the digits, the start of the cycle and its length", () => {
  for (let n = 2; n <= 400; n++) {
    const { digits, pre, period } = reciprocal(n);
    // Digits of 1/n straight from integer division.
    const big = (10n ** BigInt(digits.length)) / BigInt(n);
    assert.equal(digits.join(""), big.toString().padStart(digits.length, "0"), `1/${n}`);
    // Pre-period: the larger power of 2 or 5 in n; period: the order of 10 modulo the rest.
    let m = n;
    let twos = 0;
    let fives = 0;
    while (m % 2 === 0) (m /= 2), twos++;
    while (m % 5 === 0) (m /= 5), fives++;
    assert.equal(pre, Math.max(twos, fives), `pre of 1/${n}`);
    let order = 0;
    if (m > 1) for (let p = 10 % m, k = 1; ; p = (p * 10) % m, k++) if (p === 1) { order = k; break; }
    assert.equal(period, order, `period of 1/${n}`);
  }
  const seven = textOf(renderMental(M({ topic: "recip", a: "7" }), mw).svg);
  for (const r of ["142857", "285714", "428571", "571428", "714285", "857142"]) assert.ok(seven.includes(r), r);
});
