// The solver's formula language: it reads the usual notation (including − ≤ ≥ ≠ and a lone =), binds tighter the way
// arithmetic does, indexes lists and texts, has the functions and aggregators the patterns' slots need, reports every
// indexed read, and says which part of a formula is wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUDGET, compile, evaluate, freeNames, parseExpr, RANGE_MAX, type Env, type ExprWords } from "../src/math/solver/expr.ts";

const w: ExprWords = {
  bad: "bad:{s}", name: "name:{s}", index: "index:{s}", unset: "unset:{s}", notNumber: "number:{s}", notBool: "bool:{s}", notList: "list:{s}", budget: "budget", args: "args:{s}",
};
const env: Env = { a: [3, 1, 4, 1, 5], s: "abca", i: 2, k: 4, n: 5, dp: [1, 1, 2, NaN], g: [[1, 2], [3, 4]], coins: [1, 2, 5] };
const ev = (src: string, more: Env = {}) => evaluate(parseExpr(src, w), { ...env, ...more }, w);

test("arithmetic, precedence and the usual notation", () => {
  assert.equal(ev("1 + 2 * 3 ^ 2"), 19);
  assert.equal(ev("2 ^ 3 ^ 2"), 512);
  assert.equal(ev("-2 ^ 2"), -4);
  assert.equal(ev("(1 + 2) * 3"), 9);
  assert.equal(ev("7 % 3"), 1);
  assert.equal(ev("7 / 2"), 3.5);
  assert.equal(ev("3 × 2 − 1"), 5);
  assert.equal(ev("i ≤ 2 and k ≥ 4 and i ≠ k"), true);
  assert.equal(ev("i = 2"), true);
  assert.equal(ev("!(i = 2) || i = 2"), true);
  assert.equal(ev("'b' < 'c'"), true);
  assert.equal(ev("inf > 10 ^ 9"), true);
  assert.equal(ev("if(i < k, 'yes', 'no')"), "yes");
  assert.equal(ev("not true or false"), false);
});

test("indexing lists, texts and tables", () => {
  assert.equal(ev("a[i]"), 4);
  assert.equal(ev("a[i + 1] + a[0]"), 4);
  assert.equal(ev("s[3]"), "a");
  assert.equal(ev("s[0] == s[3]"), true);
  assert.equal(ev("g[1][0]"), 3);
  assert.equal(ev("len(a) + len(s) + len(g[0])"), 11);
  assert.deepEqual(ev("0..3"), [0, 1, 2, 3]);
  assert.deepEqual(ev("i..n-1"), [2, 3, 4]);
  assert.deepEqual(ev("3..1"), []);
  assert.throws(() => ev("a[5]"), /index:a\[5\]/);
  assert.throws(() => ev("a[-1]"), /index:a\[-1\]/);
  assert.throws(() => ev("g[1][2]"), /index:g\[1\]\[2\]/);
  assert.throws(() => ev("dp[3]"), /unset:dp\[3\]/);
  assert.throws(() => ev("i[0]"), /list:i/);
  assert.throws(() => ev(`0..${RANGE_MAX + 1}`), /index:/);
});

test("functions and aggregators", () => {
  assert.equal(ev("min(a)"), 1);
  assert.equal(ev("max(a)"), 5);
  assert.equal(ev("min(3, 1, 2)"), 1);
  assert.equal(ev("max(3, 1, 2)"), 3);
  assert.equal(ev("sum(a)"), 14);
  assert.equal(ev("distinct(a)"), 4);
  assert.equal(ev("distinct(s)"), 3);
  assert.equal(ev("has(a, 4) and not has(a, 7) and has(s, 'c')"), true);
  assert.equal(ev("abs(-3) + floor(2.7) + ceil(2.1)"), 8);
  assert.equal(ev("max(j in 0..i-1 if a[j] < a[i]: dp[j])"), 1);
  assert.equal(ev("min(c in coins if c <= 2: dp[2 - c])", { dp: [0, 1, 1] }), 0);
  assert.equal(ev("sum(c in coins: c)"), 8);
  assert.equal(ev("count(x in a: x > 2)"), 3);
  assert.equal(ev("any(x in a: x == 5) and all(x in a: x > 0)"), true);
  assert.equal(ev("min(x in a if x > 10: x)"), Infinity);
  assert.equal(ev("max(x in a if x > 10: x)"), -Infinity);
  assert.equal(ev("sum(x in a if x > 10: x) + count(x in a: x > 10)"), 0);
  assert.equal(ev("any(x in a: x > 10) or not all(x in a: x > 10)"), true);
  assert.equal(ev("sum(c in s: if(c == 'a', 1, 0))"), 2);
  assert.equal(ev("min(x in 1..0: x)"), Infinity);
});

test("every indexed read is reported with its indices", () => {
  const reads: [string, number[]][] = [];
  evaluate(parseExpr("dp[i-1] + a[i] + g[1][i-1] + min(j in 0..1: dp[j])", w), env, w, { onRead: (name, idx) => reads.push([name, idx]) });
  assert.deepEqual(reads, [["dp", [1]], ["a", [2]], ["g", [1, 1]], ["dp", [0]], ["dp", [1]]]);
});

test("what cannot be read or run says which part", () => {
  assert.throws(() => ev(""), /bad:…/);
  assert.throws(() => ev("1 +"), /bad:/);
  assert.throws(() => ev("1 + * 2"), /bad:\* 2/);
  assert.throws(() => ev("a[1"), /bad:/);
  assert.throws(() => ev("2 3"), /bad:3/);
  assert.throws(() => ev("foo(1)"), /bad:/);
  assert.throws(() => ev("if"), /bad:/);
  assert.throws(() => ev("min(if in a: 1)"), /bad:/);
  assert.throws(() => ev("#"), /bad:#/);
  assert.throws(() => ev("x + 1"), /name:x/);
  assert.throws(() => ev("1 + 'a'"), /number:'a'/);
  assert.throws(() => ev("1 < 'a'"), /number:1 < 'a'/);
  assert.throws(() => ev("1 and true"), /bool:1/);
  assert.throws(() => ev("not 1"), /bool:1/);
  assert.throws(() => ev("if(1, 2, 3)"), /bool:1/);
  assert.throws(() => ev("sum(1)"), /list:1/);
  assert.throws(() => ev("sum(s)"), /number:s/);
  assert.throws(() => ev("has(1, 2)"), /list:1/);
  assert.throws(() => ev("len(1, 2)"), /args:len\(1, 2\)/);
  assert.throws(() => ev("if(true, 1)"), /args:/);
  assert.throws(() => ev("min()"), /args:/);
  assert.throws(() => ev("1.5..3"), /number:1.5..3/);
  assert.throws(() => ev("-'a'"), /number:'a'/);
  assert.throws(() => ev("sum(x in 1: x)"), /list:1/);
  assert.throws(() => ev("count(x in a: x)"), /bool:x/);
  assert.throws(() => ev("min(x in a: s)"), /number:s/);
});

test("a runaway formula stops at the budget", () => {
  const deep = `sum(x in 0..60: sum(y in 0..60: sum(z in 0..60: 1)))`;
  assert.throws(() => ev(deep), /budget/);
  assert.ok(BUDGET > 1000);
});

test("compiled formulas and free names", () => {
  const f = compile("a[i] * k", w);
  assert.equal(f(env), 16);
  assert.equal(f({ ...env, i: 0 }), 12);
  assert.deepEqual(freeNames(parseExpr("a[i] + min(j in 0..n if dp[j] > 0: dp[j] + k)", w)).sort(), ["a", "dp", "i", "k", "n"]);
  assert.deepEqual(freeNames(parseExpr("if(true, -x, not y)", w), ["x"]), ["y"]);
  assert.deepEqual(freeNames(parseExpr("1 + 'a' + inf", w)), []);
});
