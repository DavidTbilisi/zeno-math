// Truth trees: a tree closes exactly when its formulas cannot all be true, and every open branch is a model —
// checked against the truth table on random formulas with every connective.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { evalNode, parseFormula, renderLogic, toText, varsOf, type LogicSpec, type Node } from "../src/math/logic.ts";
import { decompose, growTree, leavesOf, type Branch, type Line } from "../src/math/logicTree.ts";

const w = en.logicWords;
const OPS = ["and", "or", "xor", "imp", "iff", "nand", "nor", "diff"] as const;

let seed = 7;
const rand = (n: number) => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % n;
};
const randomFormula = (depth: number): Node => {
  const k = rand(depth > 0 ? 12 : 5);
  if (k < 3) return { t: "var", name: "pqr"[k] };
  if (k === 3) return { t: "const", v: rand(2) === 0 };
  if (k < 6) return { t: "not", a: randomFormula(depth - 1) };
  return { t: "bin", op: OPS[rand(OPS.length)], a: randomFormula(depth - 1), b: randomFormula(depth - 1) };
};

const envs = (vars: string[]) => Array.from({ length: 1 << vars.length }, (_, m) => Object.fromEntries(vars.map((v, i) => [v, ((m >> i) & 1) === 1])));
const pathTo = (root: Branch, leaf: Branch): Line[] | undefined => {
  if (root === leaf) return root.lines;
  for (const k of root.kids) {
    const rest = pathTo(k, leaf);
    if (rest) return [...root.lines, ...rest];
  }
  return undefined;
};

test("a tree closes exactly when its formulas cannot all be true, and each open branch is a model", () => {
  for (let i = 0; i < 400; i++) {
    const fs = [randomFormula(3), randomFormula(2)];
    const vars = varsOf(fs);
    const sat = envs(vars).some((e) => fs.every((f) => evalNode(f, e)));
    const tree = growTree(fs.map((f) => ({ f, tag: "given" as const })), w.tree);
    const open = leavesOf(tree).filter((l) => !l.closed);
    assert.equal(open.length > 0, sat, fs.map((f) => toText(f)).join(" ; "));
    for (const leaf of open) {
      // Every compound line on an open branch has been broken up, and any values for the free letters work.
      const path = pathTo(tree, leaf)!;
      assert.ok(path.every((l) => !decompose(l.f) || l.used));
      for (const fill of [false, true]) {
        const env = Object.fromEntries(vars.map((v) => [v, leaf.model![v] ?? fill]));
        assert.ok(fs.every((f) => evalNode(f, env)), `${fs.map((f) => toText(f)).join(" ; ")} with ${JSON.stringify(env)}`);
      }
    }
  }
});

test("rows count down each branch, and a split puts each part on its own side", () => {
  const tree = growTree([{ f: parseFormula("p | q", w), tag: "given" }, { f: parseFormula("~p & r", w), tag: "given" }], w.tree);
  // The stacking ∧ goes first, then the ∨ splits; its left side closes on ¬p.
  assert.deepEqual(tree.lines.map((l) => [l.row, toText(l.f), l.from, l.rule]), [
    [1, "p ∨ q", undefined, undefined],
    [2, "¬p ∧ r", undefined, undefined],
    [3, "¬p", 2, "∧"],
    [4, "r", 2, "∧"],
  ]);
  assert.deepEqual(tree.kids.map((k) => [k.lines.map((l) => [l.row, toText(l.f), l.from, l.rule]), k.closed]), [
    [[[5, "p", 1, "∨"]], [3, 5]],
    [[[5, "q", 1, "∨"]], undefined],
  ]);
  assert.deepEqual(tree.kids[1].model, { p: false, r: true, q: true });
});

test("⊥ and ¬⊤ close a branch on their own", () => {
  for (const f of ["⊥", "~⊤", "p & ⊥"]) {
    const tree = growTree([{ f: parseFormula(f, w), tag: "given" }], w.tree);
    assert.ok(leavesOf(tree).every((l) => l.closed), f);
  }
});

// The captions as one string: a long one wraps over several <text> lines.
const run = (f: string, g = "", tf = true) =>
  [...renderLogic({ topic: "tree", f, g, vals: "", tf } as LogicSpec, w).svg.matchAll(/font-size="14.5"[^>]*>([^<]*)</g)].map((m) => m[1]).join(" ");

test("the captions: valid, invalid with a counterexample, tautologies, consistency", () => {
  assert.match(run("p -> q; p", "q"), /Valid: every branch closes/);
  // ¬p | q under p → q: both sides stay open, and both make p false and q true.
  assert.match(run("p -> q; q", "p"), /Invalid: 2 of 2 branches stay open\. The first gives a counterexample: p\s=\sF, q\s=\sT\./);
  assert.match(run("p -> q; q", "p", false), /p\s=\s0, q\s=\s1/);
  assert.match(run("", "((p -> q) -> p) -> p"), /A tautology/);
  assert.match(run("", "p -> q"), /Not a tautology: an open branch makes it false: p\s=\sT, q\s=\sF\./);
  assert.match(run("p | q; ~p | r; ~q"), /Consistent: 1 of 3 branches stay open\. The first makes them all true: p\s=\sT, q\s=\sF, r\s=\sT\./);
  assert.match(run("p | q"), /p\s=\sT; q either way/);
  assert.match(run("p <-> q; q <-> ~p"), /Inconsistent/);
  assert.match(run("p <-> q; q <-> ~p"), /Closed branches: 4 of 4\./);
});

test("what is not a tree says why", () => {
  assert.throws(() => run("", ""), /Type a premise or a conclusion/);
  assert.throws(() => run("(a | b) & (c | d) & (e | f) & (g | h) & (i | j) & (k | l)"), /more than 32 branches/);
});
