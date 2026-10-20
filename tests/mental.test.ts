// Mental math and problem-solving tactics state the right answers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { magicSquare, reciprocal, renderMental, type DivMethod, type MentalSpec } from "../src/math/mental.ts";
import { chameleonPath, inversions, renderTactics, TACTICS_PRESETS, TACTICS_TOPICS, type TacticsSpec } from "../src/math/tactics.ts";

const mw = en.mentalWords;
const tw = en.tacticsWords;
const textOf = (svg: string) => [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ");
const M = (o: Partial<MentalSpec>): MentalSpec => ({ topic: "multiply", a: "", b: "", c: "", base: "", op: "*", sys: "en", words: "", ...o });
const T = (o: Partial<TacticsSpec>): TacticsSpec => ({ topic: "symmetry", n: "10", p: "10", h: "9", mode: "count", nums: "", rows: "8", cols: "8", removed: "", pts: "", t: "0", abc: "13 15 17", ...o });
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

test("extreme principle: the closest pair squirt each other, and an odd crowd always leaves someone dry", () => {
  let seed = 7;
  const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
  let odd = 0;
  for (let k = 0; k < 300; k++) {
    const n = 2 + rnd(9);
    const pts: [number, number][] = [];
    while (pts.length < n) {
      const p: [number, number] = [rnd(13), rnd(13)];
      if (!pts.some(([x, y]) => x === p[0] && y === p[1])) pts.push(p);
    }
    const d2 = (i: number, j: number) => (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2;
    const all = pts.flatMap((_, i) => pts.map((_, j) => (i < j ? d2(i, j) : -1))).filter((d) => d >= 0);
    if (new Set(all).size < all.length) continue; // ties are refused; tested below
    const aim = pts.map((_, i) => pts.map((_, j) => j).filter((j) => j !== i).sort((a, b) => d2(i, a) - d2(i, b))[0]);
    const dry = pts.map((_, i) => i).filter((i) => !aim.includes(i)).map((i) => "ABCDEFGHIJKLMNO"[i]);
    const text = textOf(renderTactics(T({ topic: "extreme", pts: pts.map((p) => p.join(",")).join(" ") }), tw).svg);
    if (n % 2) {
      odd++;
      assert.ok(dry.length > 0, "an odd crowd leaves someone dry");
    }
    assert.ok(text.includes(n % 2 ? `here ${dry.join(", ")}.` : `dry here: ${dry.length ? dry.join(", ") : "nobody"}.`), text);
  }
  assert.ok(odd > 50, `${odd} odd crowds`);
  const ext = (pts: string) => () => renderTactics(T({ topic: "extreme", pts }), tw);
  assert.ok(textOf(ext("0,3 9,7 7,5 9,4 3,0")().svg).includes("C and D are the closest pair (√5 apart)"));
  assert.ok(textOf(ext("0,0 3,4")().svg).includes("A and B are the closest pair (5 apart)"));
  // Every example shows what its label says.
  const dryOf = (label: string) => textOf(renderTactics(TACTICS_PRESETS.extreme.find((p) => p.label === label)!.spec, tw).svg);
  assert.ok(dryOf("4 people, all hit").includes("dry here: nobody."));
  assert.match(dryOf("6 people, two dry"), /dry here: [A-F], [A-F]\./);
  assert.throws(ext("0,0 3,0 0,4 3,4"), /same distance apart/);
  assert.throws(ext("0,0 13,1"), /not a point/);
  assert.throws(ext("1,1 1,1"), /typed twice/);
  assert.throws(ext("1,1"), /from 2 to 15 points/);
});

test("parity: ±1 ±2 … ±n = t exactly when t has the parity of 1 + … + n and is in reach, and the signs given work", () => {
  for (let n = 1; n <= 20; n++) {
    const S = (n * (n + 1)) / 2;
    for (let t = Math.max(-210, -S - 2); t <= Math.min(210, S + 2); t++) {
      const text = textOf(renderTactics(T({ topic: "parity", n: String(n), t: String(t) }), tw).svg);
      const can = Math.abs(t) <= S && (S - t) % 2 === 0;
      assert.equal(text.includes("it can be done"), can, `${n} ${t}`);
      if (!can) {
        assert.ok(text.includes(Math.abs(t) > S ? "out of reach" : "Impossible"), text);
        continue;
      }
      const ks = text.match(/give (.*?) a minus sign/)![1];
      const minus = ks === "—" ? [] : ks.split(", ").map(Number);
      assert.equal(S - 2 * minus.reduce((a, b) => a + b, 0), t, `${n} ${t}: ${ks}`);
    }
  }
});

test("chameleons: the meetings are legal, and they reach one colour exactly when two remainders mod 3 agree", () => {
  for (let a = 0; a <= 12; a++)
    for (let b = 0; b <= 12; b++)
      for (let c = 0; c <= 12; c++) {
        if (!(a + b + c)) continue;
        const path = chameleonPath([a, b, c]);
        assert.equal(path !== null, new Set([a % 3, b % 3, c % 3]).size < 3, `${a} ${b} ${c}`);
        if (!path) continue;
        assert.equal(path.at(-1)!.filter((x) => x === 0).length >= 2, true);
        for (let i = 1; i < path.length; i++) {
          const d: number[] = path[i].map((x, j) => x - path[i - 1][j]).sort((u, v) => u - v);
          assert.deepEqual(d, [-1, -1, 2], "two of different colours meet and both take the third");
        }
      }
  const mod = (abc: string) => textOf(renderTactics(T({ topic: "modular", abc }), tw).svg);
  assert.ok(mod("13 15 17").includes("all three remainders differ"));
  assert.ok(mod("4 7 10").includes("Two remainders agree, and it can be done: 7 meetings"), mod("4 7 10"));
  assert.ok(mod("0 0 5").includes("already all one colour"));
  assert.ok(mod("20 2 35").includes(`… ${chameleonPath([20, 2, 35])!.length - 9} more meetings …`), mod("20 2 35"));
  assert.throws(() => renderTactics(T({ topic: "modular", abc: "0 0 0" }), tw), /not all 0/);
  assert.throws(() => renderTactics(T({ topic: "modular", abc: "1 2" }), tw), /three counts/);
});

test("monovariant: every swap of out-of-order neighbours removes one inversion, so it ends after exactly that many", () => {
  let seed = 3;
  const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
  for (let k = 0; k < 200; k++) {
    const nums = Array.from({ length: 2 + rnd(9) }, () => rnd(41) - 20);
    const inv = inversions(nums);
    let brute = 0;
    for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (nums[i] > nums[j]) brute++;
    assert.equal(inv, brute);
    const text = textOf(renderTactics(T({ topic: "monovariant", nums: nums.join(" ") }), tw).svg);
    assert.ok(inv ? text.includes(`after exactly ${inv} swaps`) : text.includes("Already in order"), text);
    assert.ok(text.includes("inv = 0"), "the last row is in order");
  }
  assert.ok(textOf(renderTactics(T({ topic: "monovariant", nums: "6 5 4 3 2 1" }), tw).svg).includes("… 7 more swaps …"));
  assert.throws(() => renderTactics(T({ topic: "monovariant", nums: "4" }), tw), /from 2 to 10 whole numbers/);
  // Only the pair about to be swapped is marked: one pair per row but the last, which is in order.
  const marked = renderTactics(T({ topic: "monovariant", nums: "3 1 2" }), tw).svg.match(/fill="#ffe8cc"/g) ?? [];
  assert.equal(marked.length, 2 * 2);
});

test("tactics: every topic has examples, and every example renders", () => {
  for (const topic of TACTICS_TOPICS) {
    assert.ok(TACTICS_PRESETS[topic].length >= 3, topic);
    for (const p of TACTICS_PRESETS[topic]) assert.equal(p.spec.topic, topic, p.label);
  }
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
  // 1 000 ÷ 12 by the flag: 1 ÷ 1 would give 1, but paying 2 × 1 for the flag next leaves 0 − 2, so the method takes 0
  // (starred), and so on down the steps.
  const flag = div("flag", 1000, 12);
  assert.ok(flag.includes("= 83, remainder 4"), flag);
  assert.ok(flag.includes("0 *"), flag);
  assert.ok(flag.includes(mw.div.smaller), flag);
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
  assert.throws(() => renderMental(M({ topic: "recip", a: "10000" }), mw), { message: mw.recip.tooBig });
});

test("division, divisibility and reciprocals end with their sentence of use, like the other topics", () => {
  const start = (s: string) => s.split(" ").slice(0, 5).join(" ");
  for (const [topic, spec] of [["divide", { a: "1234", b: "89", method: "base" }], ["rules", { a: "1001" }], ["recip", { a: "7" }]] as const) {
    const shown = textOf(renderMental(M({ topic, ...spec }), mw).svg);
    assert.ok(shown.includes(start(mw.info[topic])), topic);
  }
});
