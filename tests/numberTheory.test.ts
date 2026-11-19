// Number theory practice: base conversions and base arithmetic agree with parseInt, divisor counts with a count of the
// divisors, units digits and remainders with BigInt powers, repeating decimals with their value, congruences with a
// search; every slip gives another answer, the tool draws base arithmetic, and the questions read in all languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { baseWork, renderNt, type BaseOp } from "../src/math/numtheory.ts";
import {
  baseOpQuestion,
  congruenceQuestion,
  cycleOf,
  divisorQuestion,
  fromTenQuestion,
  productRemainderQuestion,
  repeatingQuestion,
  toTenQuestion,
  unitsDigitQuestion,
  type NumberTheoryQuestion,
} from "../src/math/numberTheory.ts";
import { check, exercise, LEVELS } from "../src/math/practice.ts";

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const bigPowMod = (a: number, n: number, m: number) => Number(BigInt(a) ** BigInt(n) % BigInt(m));
const divisorCount = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0).length;
const sub = (q: string) => q.match(/_\{(\d+)\}/g)!.map((s) => s.slice(2, -1));
const numerals = (q: string) => [...q.matchAll(/(\d+)_\{(\d+)\}/g)].map((m) => [m[1], Number(m[2])] as const);

function sane(q: NumberTheoryQuestion) {
  assert.ok(Number.isInteger(q.v) || q.frac, `${q.kind}: ${q.v}`);
  for (const t of q.traps) assert.notEqual(t.v, q.v, `${q.kind}: ${t.id} gives the answer`);
  assert.ok((q.steps ?? []).every((s) => !/NaN|undefined/.test(s)));
  assert.ok(q.spec || q.steps?.length, `${q.kind} has a worked solution`);
}

test("base arithmetic in columns: the tool's working equals the numbers' own arithmetic", () => {
  const r = rng(5);
  for (let i = 0; i < 2000; i++) {
    const base = 2 + Math.floor(r() * 15);
    const op = (["add", "sub", "mul"] as BaseOp[])[i % 3];
    let [x, y] = [Math.floor(r() * 5000), Math.floor(r() * (op === "mul" ? base ** 3 : 5000))];
    if (op === "sub" && x < y) [x, y] = [y, x];
    const [a, b] = [x.toString(base).toUpperCase(), y.toString(base).toUpperCase()];
    const want = op === "add" ? x + y : op === "sub" ? x - y : x * y;
    assert.equal(baseWork(a, b, op, base).result, want.toString(base).toUpperCase(), `${a} ${op} ${b} in base ${base}`);
  }
  // A carry above each column it goes into; a borrow shows the digit the column is worked with.
  assert.deepEqual(baseWork("254", "163", "add", 7).carries, [0, 1, 1]);
  assert.deepEqual(baseWork("523", "145", "sub", 6).tops, [9, 7, 4]);
  assert.deepEqual(baseWork("43", "24", "mul", 5).rows, ["332", "1410"]);
  const svg = renderNt({ topic: "baseOps", op: "add", a: "254", b: "163", base: "7" }, en.ntWords).svg;
  assert.ok(svg.includes("Check in base 10: 137 + 94 = 231"));
  assert.throws(() => renderNt({ topic: "baseOps", op: "sub", a: "12", b: "21", base: "3" }, en.ntWords), /at least/);
  assert.throws(() => renderNt({ topic: "baseOps", op: "add", a: "19", b: "2", base: "8" }, en.ntWords), /not a number in base 8/);
});

test("bases: to base 10, from base 10, and arithmetic in base b", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const one = toTenQuestion(rng(seed));
    sane(one);
    const [[s, b]] = numerals(one.q);
    assert.equal(one.v, parseInt(s, b));
    assert.equal(one.traps[0].v, one.v * b);

    const two = fromTenQuestion(rng(seed));
    sane(two);
    const { n, b: b2 } = two.vars as Record<string, number>;
    assert.equal(String(two.v), n.toString(b2));
    assert.equal(two.traps[0].v, Number([...n.toString(b2)].reverse().join("")));

    const three = baseOpQuestion(rng(seed));
    kinds.add(three.kind);
    sane(three);
    const [[x, bx], [y]] = numerals(three.q);
    const [vx, vy] = [parseInt(x, bx), parseInt(y, bx)];
    const want = three.kind === "add" ? vx + vy : three.kind === "sub" ? vx - vy : vx * vy;
    assert.equal(String(three.v), want.toString(bx), three.q);
    assert.equal(sub(three.q).length, 2);
    assert.equal(three.traps.length, 1, `${three.q} carries or borrows`);
  }
  assert.deepEqual([...kinds].sort(), ["add", "mul", "sub"]);
});

test("divisors and units digits", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const d = divisorQuestion(rng(seed));
    kinds.add(d.kind);
    sane(d);
    const n = d.vars.n as number;
    if (n <= 100000) assert.equal(d.v, divisorCount(n), `d(${n})`);
    const u = unitsDigitQuestion(rng(seed));
    sane(u);
    const [, a, k] = u.q.match(/(\d+)\^\{(\d+)\}/)!.map(Number);
    assert.equal(u.v, bigPowMod(a, k, 10), u.q);
    assert.equal(u.traps.length, 1);
  }
  assert.deepEqual([...kinds].sort(), ["divisors", "divisorsOf"]);
  assert.deepEqual(cycleOf(7, 10), [7, 9, 3, 1]);
  assert.deepEqual(cycleOf(3, 7), [3, 2, 6, 4, 5, 1]);
});

test("repeating decimals and remainders of products", () => {
  for (const seed of SEEDS) {
    const q = repeatingQuestion(rng(seed));
    sane(q);
    const [n, d] = q.frac!;
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    assert.equal(gcd(n, d), 1, "lowest terms");
    // The value from the digits: the decimal written out to 12 places.
    const m = q.q.match(/^0\.(\d*)\\overline\{(\d+)\}$/)!;
    const digits = (m[1] + m[2].repeat(12)).slice(0, 12);
    assert.ok(Math.abs(n / d - Number(`0.${digits}`)) < 1e-11, `${q.q} = ${n}/${d}`);
    assert.ok(Math.abs(q.traps[0].v - n / d) > 1e-6);

    const r = productRemainderQuestion(rng(seed));
    sane(r);
    const mod = r.vars.m as number;
    const [a, b, c] = r.q.match(/\d+/g)!.map(BigInt);
    const val = r.q.includes("+") ? a * b + c : a * b * c;
    assert.equal(r.v, Number(val % BigInt(mod)));
    assert.ok(r.traps[0].v >= mod);
  }
});

test("congruences: powers, a x ≡ b and two at once", () => {
  const seen = new Set<string>();
  for (const seed of SEEDS) {
    const q = congruenceQuestion(rng(seed));
    sane(q);
    assert.ok(q.v > 0);
    if (q.kind === "remainder") {
      seen.add("power");
      const [, a, n] = q.q.match(/(\d+)\^\{(\d+)\}/)!.map(Number);
      assert.equal(q.v, bigPowMod(a, n, q.vars.m as number));
    } else if (q.q.includes(",")) {
      seen.add("system");
      const [r1, m1, r2, m2] = [...q.q.matchAll(/\\equiv (\d+) \\pmod\{(\d+)\}/g)].flatMap((m) => [Number(m[1]), Number(m[2])]);
      assert.equal(q.v % m1, r1);
      assert.equal(q.v % m2, r2);
      assert.ok(q.v <= m1 * m2);
      for (let x = 1; x < q.v; x++) assert.ok(x % m1 !== r1 || x % m2 !== r2, "the smallest");
    } else {
      seen.add("linear");
      const [, a, b, m] = q.q.match(/(\d+)x \\equiv (\d+) \\pmod\{(\d+)\}/)!.map(Number);
      assert.equal((a * q.v) % m, b);
      assert.ok(q.v < m);
    }
  }
  assert.deepEqual([...seen].sort(), ["linear", "power", "system"]);
});

test("practice: every level reads in every language and takes its own answer, with or without its base", () => {
  for (const words of [en, ka, ru])
    for (const skill of ["bases", "modular"] as const)
      for (const level of LEVELS)
        for (let seed = 1; seed <= 60; seed++) {
          const ex = exercise(skill, level, seed, words.pracWords);
          assert.ok(ex.prompt && !/\{\w+\}/.test(ex.prompt), ex.prompt);
          assert.equal(check(ex, ex.plain, words.pracWords).ok, true, `${skill} ${level} #${seed}: ${ex.prompt} ${ex.plain}`);
        }
  const ex = exercise("bases", 2, 3, en.pracWords);
  const b = (ex.q.match(/\?_\{(\d)\}/) ?? [])[1];
  assert.ok(b);
  for (const typed of [`${ex.plain}_${b}`, `${ex.plain}${"₀₁₂₃₄₅₆₇₈₉"[Number(b)]}`]) assert.equal(check(ex, typed, en.pracWords).ok, true, typed);
});
