// The formula parser and printer agree, and the usual spellings mean what they should.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { evalNode, parseFormula, toText, type Node } from "../src/math/logic.ts";

const w = en.logicWords;
const V = ["p", "q", "r", "s"];
const envs = Array.from({ length: 16 }, (_, i) => Object.fromEntries(V.map((v, k) => [v, ((i >> k) & 1) === 1])));
const same = (a: Node, b: Node) => envs.every((e) => evalNode(a, e) === evalNode(b, e));

test("printing then parsing gives the same formula", () => {
  const OPS = ["and", "or", "xor", "imp", "iff", "nand", "nor", "diff"];
  let seed = 7;
  const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
  const gen = (d: number): Node =>
    d === 0 || rnd(4) === 0
      ? { t: "var", name: V[rnd(4)] }
      : rnd(4) === 0
        ? { t: "not", a: gen(d - 1) }
        : ({ t: "bin", op: OPS[rnd(OPS.length)], a: gen(d - 1), b: gen(d - 1) } as Node);
  for (let i = 0; i < 2000; i++) {
    const n = gen(4);
    for (const style of ["logic", "set"] as const) {
      const text = toText(n, style);
      assert.ok(same(n, parseFormula(text, w)), `${style}: ${text}`);
    }
  }
});

test("spellings", () => {
  const eqs: [string, string][] = [
    ["p -> q -> r", "p -> (q -> r)"], ["~p & q | r", "((¬p) ∧ q) ∨ r"], ["AB + A'C", "(A and B) or (not A and C)"],
    ["p <-> q", "(p → q) ∧ (q → p)"], ["A(B+C)", "A*B + A*C"], ["A Δ B", "(A - B) ∪ (B \\ A)"], ["Aᶜ ∩ B", "¬A ∧ B"],
    ["p xor q", "p ^ q"], ["x1 & x2", "x₁ ∧ x₂"], ["!(p || q)", "~p && ~q"], ["p nand q", "¬(p ∧ q)"], ["true -> p", "p"],
  ];
  for (const [a, b] of eqs) {
    const A = parseFormula(a, w);
    const B = parseFormula(b, w);
    // Variable names as printed (x₁ is the variable x1).
    const vars = [...new Set([...toText(A).matchAll(/\p{L}[₀-₉]*/gu), ...toText(B).matchAll(/\p{L}[₀-₉]*/gu)].map((m) => m[0]))];
    const name = (v: string) => v.replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080));
    const rows = Array.from({ length: 1 << vars.length }, (_, i) => Object.fromEntries(vars.map((v, k) => [name(v), ((i >> k) & 1) === 1])));
    assert.ok(rows.every((e) => evalNode(A, e) === evalNode(B, e)), `${a}  vs  ${b}`);
  }
});

test("bad input is rejected", () => {
  for (const s of ["", "p &", "(p | q", "p q )", "p $ q"]) assert.throws(() => parseFormula(s, w), s);
});
