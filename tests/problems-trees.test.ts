// The binary tree problems give the right answers: on their examples, on cases picked to catch a slip (one node, a
// lopsided tree, negatives, a leaf too many), and on random trees checked against working it out the slow way (every
// pair of nodes, plain recursion, positions in a full tree); bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { listText, show, tree, writeTree, type TreeNode } from "../src/math/problems/core.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const T = w.trees;
const e = w.errors;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

/** A random binary tree of n nodes and at most `levels` levels, read back the way the solvers read it. */
function randomTree(r: () => number, n: number, lo: number, hi: number, opts: { unique?: boolean; levels?: number } = {}): TreeNode[] {
  const { unique = false, levels = 5 } = opts;
  const used = new Set<number>();
  const value = () => {
    for (;;) {
      const v = int(r, lo, hi);
      if (!unique || !used.has(v)) return used.add(v), v;
    }
  };
  const nodes: TreeNode[] = [{ val: value(), left: -1, right: -1 }];
  const d = [0];
  for (let k = 1; k < n; k++) {
    const free = nodes.flatMap((x, i) => (d[i] < levels - 1 ? (["left", "right"] as const).filter((s) => x[s] < 0).map((s) => [i, s] as const) : []));
    if (!free.length) break;
    const [i, s] = free[Math.floor(r() * free.length)];
    nodes.push({ val: value(), left: -1, right: -1 });
    nodes[i][s] = nodes.length - 1;
    d.push(d[i] + 1);
  }
  return tree(writeTree(nodes), e);
}

const kids = (t: TreeNode[], i: number) => [t[i].left, t[i].right].filter((c) => c >= 0);
const parents = (t: TreeNode[]) => {
  const p = t.map(() => -1);
  t.forEach((_, i) => kids(t, i).forEach((c) => (p[c] = i)));
  return p;
};
/** Every node's distance from `from`, along edges either way. */
function distances(t: TreeNode[], from: number): number[] {
  const p = parents(t);
  const d = t.map(() => -1);
  d[from] = 0;
  const queue = [from];
  while (queue.length) {
    const i = queue.shift()!;
    for (const j of [...kids(t, i), p[i]]) if (j >= 0 && d[j] < 0) (d[j] = d[i] + 1), queue.push(j);
  }
  return d;
}
const inOrder = (t: TreeNode[], at = 0): number[] => (at < 0 ? [] : [...inOrder(t, t[at].left), at, ...inOrder(t, t[at].right)]);
const below = (t: TreeNode[], at: number): number[] => (at < 0 ? [] : [at, ...below(t, t[at].left), ...below(t, t[at].right)]);
const height = (t: TreeNode[], at: number): number => (at < 0 ? 0 : 1 + Math.max(height(t, t[at].left), height(t, t[at].right)));
const leaves = (t: TreeNode[], at = 0): number[] => (at < 0 ? [] : t[at].left < 0 && t[at].right < 0 ? [t[at].val] : [...leaves(t, t[at].left), ...leaves(t, t[at].right)]);
const mirror = (t: TreeNode[]) => t.map((n) => ({ val: n.val, left: n.right, right: n.left }));
/** Each node by its place in a full tree: the root 1, a node k's children 2k and 2k + 1. */
const places = (t: TreeNode[]) => {
  const out = new Map<number, number>();
  const walk = (at: number, k: number) => {
    if (at < 0) return;
    out.set(k, at);
    walk(t[at].left, 2 * k);
    walk(t[at].right, 2 * k + 1);
  };
  walk(0, 1);
  return out;
};

test("branch sums", () => {
  assert.equal(answer("branchSums", "4, 2, 9, 7, 1, null, 3, null, 5"), "Branch sums, left to right: [18, 7, 16]");
  assert.equal(answer("branchSums", "-3"), "Branch sums, left to right: [−3]");
  const r = rng(31);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), -9, 9);
    const sums: number[] = [];
    const walk = (at: number, s: number) => {
      if (at < 0) return;
      if (t[at].left < 0 && t[at].right < 0) sums.push(s + t[at].val);
      walk(t[at].left, s + t[at].val);
      walk(t[at].right, s + t[at].val);
    };
    walk(0, 0);
    assert.equal(answer("branchSums", writeTree(t)), `Branch sums, left to right: ${listText(sums)}`);
  }
  assert.throws(() => answer("branchSums", "null, 1"), /Write something/);
});

test("node depths", () => {
  assert.equal(answer("nodeDepths", "5, 2, 8, 6, 1, null, 3, null, null, 4"), "The depths add up to 11.");
  assert.equal(answer("nodeDepths", "1"), "The depths add up to 0.");
  const r = rng(32);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), 0, 9);
    const want = distances(t, 0).reduce((s, d) => s + d, 0);
    assert.equal(answer("nodeDepths", writeTree(t)), `The depths add up to ${want}.`);
  }
  assert.throws(() => answer("nodeDepths", "1, 2, null, 3, null, 4, null, 5, null, 6"), /At most 5 levels/);
});

test("evaluate expression tree", () => {
  assert.equal(answer("evaluateExpressionTree", "*, +, -, 6, /, 9, 2, null, null, 8, 3"), "The tree's value is 56.");
  assert.equal(answer("evaluateExpressionTree", "7"), "The tree's value is 7.");
  assert.equal(answer("evaluateExpressionTree", "/, -, 2, 1, 8"), "The tree's value is −3.");
  assert.equal(answer("evaluateExpressionTree", "÷, ×, −, 3, 5, 9, 4"), "The tree's value is 3.");
  assert.throws(() => answer("evaluateExpressionTree", "/, 3, -, null, null, 4, 4"), /Division by zero/);
  assert.throws(() => answer("evaluateExpressionTree", "+, 3"), /needs two children/);
  assert.throws(() => answer("evaluateExpressionTree", "3, 4, 5"), /must be leaves/);
  assert.throws(() => answer("evaluateExpressionTree", "+, 0, 5"), /too small/);
  const r = rng(33);
  let done = 0;
  for (let k = 0; k < 300 && done < 150; k++) {
    // A random expression of at most 5 levels: operators inside, numbers 1–9 at the leaves.
    type X = { op?: string; v?: number; l?: X; r?: X };
    const make = (d: number): X => (d >= 4 || (d > 0 && r() < 0.35) ? { v: int(r, 1, 9) } : { op: "+-*/"[int(r, 0, 3)], l: make(d + 1), r: make(d + 1) });
    const x = make(0);
    const size = (y: X): number => (y.op ? 1 + size(y.l!) + size(y.r!) : 1);
    if (size(x) > 15) continue;
    const tokens: string[] = [];
    const queue: (X | null)[] = [x];
    while (queue.length) {
      const y = queue.shift()!;
      tokens.push(!y ? "null" : y.op ?? String(y.v));
      if (y) queue.push(y.l ?? null, y.r ?? null);
    }
    while (tokens[tokens.length - 1] === "null") tokens.pop();
    let zero = false;
    const value = (y: X): number => {
      if (!y.op) return y.v!;
      const [a, b] = [value(y.l!), value(y.r!)];
      if (y.op === "/" && b === 0) zero = true;
      return y.op === "+" ? a + b : y.op === "-" ? a - b : y.op === "*" ? a * b : b === 0 ? 0 : Math.trunc(a / b);
    };
    const want = value(x);
    if (zero) assert.throws(() => answer("evaluateExpressionTree", tokens.join(", ")), /Division by zero/);
    else assert.equal(answer("evaluateExpressionTree", tokens.join(", ")), `The tree's value is ${show(want)}.`, tokens.join(", "));
    done++;
  }
  assert.ok(done >= 150);
});

test("invert binary tree", () => {
  assert.equal(answer("invertBinaryTree", "6, 3, 9, 1, 4, null, 12, null, 2"), "Inverted, level by level: 6, 9, 3, 12, null, 4, 1, null, null, null, null, 2");
  assert.equal(answer("invertBinaryTree", "1"), "Inverted, level by level: 1");
  const r = rng(34);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), -9, 9);
    assert.equal(answer("invertBinaryTree", writeTree(t)), `Inverted, level by level: ${writeTree(mirror(t))}`);
  }
});

test("binary tree diameter", () => {
  assert.equal(answer("binaryTreeDiameter", "4, 9, 2, 1, 7, null, null, 3, null, 6, 8, 5, null, null, 10"), "The diameter is 6 edges.");
  assert.equal(answer("binaryTreeDiameter", "1"), "The diameter is 0 edges.");
  const r = rng(35);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), 0, 9);
    const want = Math.max(...t.map((_, i) => Math.max(...distances(t, i))));
    assert.equal(answer("binaryTreeDiameter", writeTree(t)), `The diameter is ${want} edges.`);
  }
});

test("find successor", () => {
  const ex = "20, 8, 30, 4, 12, null, null, null, null, 10, 14";
  assert.equal(answer("findSuccessor", ex, "14"), "The successor of 14 is 20.");
  assert.equal(answer("findSuccessor", ex, "8"), "The successor of 8 is 10.");
  assert.equal(answer("findSuccessor", ex, "30"), "30 is the last in order: it has no successor.");
  assert.throws(() => answer("findSuccessor", ex, "7"), /7 isn't in the tree/);
  assert.throws(() => answer("findSuccessor", "1, 2, 1", "2"), /appears twice/);
  const r = rng(36);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), -20, 20, { unique: true });
    const order = inOrder(t);
    const i = int(r, 0, t.length - 1);
    const at = order.indexOf(i);
    const v = show(t[i].val);
    const want = at === order.length - 1 ? `${v} is the last in order: it has no successor.` : `The successor of ${v} is ${show(t[order[at + 1]].val)}.`;
    assert.equal(answer("findSuccessor", writeTree(t), String(t[i].val)), want);
  }
});

test("height balanced binary tree", () => {
  assert.equal(answer("heightBalancedBinaryTree", "5, 3, 8, 1, 4, null, 9, null, 2, null, null, null, 11, null, null, 12"), "No: the tree is out of balance at 9.");
  assert.equal(answer("heightBalancedBinaryTree", "1, 2, 3, 4"), T.heightBalancedBinaryTree.yes);
  assert.equal(answer("heightBalancedBinaryTree", "1, 2, null, 3"), "No: the tree is out of balance at 1.");
  const r = rng(37);
  let yes = 0;
  for (let k = 0; k < 200; k++) {
    const t = randomTree(r, 1 + (k % 12), 0, 9);
    const ok = t.every((_, i) => Math.abs(height(t, t[i].left) - height(t, t[i].right)) <= 1);
    if (ok) yes++;
    assert.equal(answer("heightBalancedBinaryTree", writeTree(t)) === T.heightBalancedBinaryTree.yes, ok, writeTree(t));
  }
  assert.ok(yes > 20 && yes < 180);
});

test("merge binary trees", () => {
  assert.equal(answer("mergeBinaryTrees", "3, 1, 7, 2, null, 5", "4, 6, 2, null, 8, null, 9"), "The merged tree, level by level: 7, 7, 9, 2, 8, 5, 9");
  assert.equal(answer("mergeBinaryTrees", "1", "2, -3, 4"), "The merged tree, level by level: 3, −3, 4");
  assert.throws(() => answer("mergeBinaryTrees", "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15", "1, 2, null, 3, null, 4, null, 5"), /At most 15/);
  const r = rng(38);
  for (let k = 0; k < 150; k++) {
    const a = randomTree(r, 1 + (k % 8), -9, 9, { levels: 4 });
    const b = randomTree(r, 1 + ((k * 7) % 8), -9, 9, { levels: 4 });
    const [pa, pb] = [places(a), places(b)];
    const want = new Map<number, number>();
    for (const [k2, i] of pa) want.set(k2, a[i].val);
    for (const [k2, i] of pb) want.set(k2, (want.get(k2) ?? 0) + b[i].val);
    let got: TreeNode[];
    try {
      got = tree(answer("mergeBinaryTrees", writeTree(a), writeTree(b)).split(": ")[1], e);
    } catch (err) {
      assert.ok(want.size > 15, String(err));
      continue;
    }
    const pg = places(got);
    assert.deepEqual(new Map([...pg].map(([k2, i]) => [k2, got[i].val])), want);
  }
});

test("symmetrical tree", () => {
  assert.equal(answer("symmetricalTree", "7, 3, 3, 5, 1, 1, 5, 8, null, null, 2, 2, null, null, 8"), T.symmetricalTree.yes);
  assert.equal(answer("symmetricalTree", "1"), T.symmetricalTree.yes);
  assert.equal(answer("symmetricalTree", "1, 2, 2, null, 3, null, 3"), "No: 3 and ∅ don't mirror each other.");
  assert.equal(answer("symmetricalTree", "1, 2, 3"), "No: 2 and 3 don't mirror each other.");
  const r = rng(39);
  let yes = 0;
  for (let k = 0; k < 150; k++) {
    let t: TreeNode[];
    if (k % 2) t = randomTree(r, 1 + (k % 9), 0, 3);
    else {
      // A half and its mirror under one root, sometimes with one value changed.
      const half = randomTree(r, 1 + (k % 7), 0, 3, { levels: 4 });
      const m = mirror(half);
      const n = half.length;
      const shift = (x: number, by: number) => (x < 0 ? -1 : x + by);
      t = [{ val: 9, left: 1, right: 1 + n }, ...half.map((x) => ({ val: x.val, left: shift(x.left, 1), right: shift(x.right, 1) })), ...m.map((x) => ({ val: x.val, left: shift(x.left, 1 + n), right: shift(x.right, 1 + n) }))];
      if (k % 4 === 0) t[1 + n].val += 1;
      t = tree(writeTree(t), e);
    }
    const sym = writeTree(t) === writeTree(mirror(t));
    if (sym) yes++;
    assert.equal(answer("symmetricalTree", writeTree(t)) === T.symmetricalTree.yes, sym, writeTree(t));
  }
  assert.ok(yes > 30);
});

test("split binary tree", () => {
  assert.equal(answer("splitBinaryTree", "2, 4, 5, 1, 3, -6, 18, null, null, 7"), "Cutting the edge above 5 leaves two trees of 17 each: the answer is 17.");
  assert.equal(answer("splitBinaryTree", "2, 4, 5, 1, 3, -6, 9, null, null, 7"), "No cut leaves two equal trees: the answer is 0.");
  assert.equal(answer("splitBinaryTree", "4, 1, 3"), "No cut leaves two equal trees: the answer is 0.");
  assert.equal(answer("splitBinaryTree", "5"), "No cut leaves two equal trees: the answer is 0.");
  assert.throws(() => answer("splitBinaryTree", "1, 2.5"), /isn't a whole number/);
  const r = rng(40);
  let cuts = 0;
  for (let k = 0; k < 200; k++) {
    const t = randomTree(r, 1 + (k % 12), -5, 9);
    const sum = (at: number) => below(t, at).reduce((s, i) => s + t[i].val, 0);
    const total = sum(0);
    const ok = t.some((_, i) => i > 0 && 2 * sum(i) === total);
    if (ok) cuts++;
    const want = ok ? total / 2 : 0;
    const got = answer("splitBinaryTree", writeTree(t));
    assert.equal(got.match(/the answer is (\S+)\.$/)![1], show(want), writeTree(t));
  }
  assert.ok(cuts > 10);
});

test("max path sum in binary tree", () => {
  assert.equal(answer("maxPathSumInBinaryTree", "-2, 6, 3, -1, 4, -8, 5, null, null, 2, null, 7"), "The largest path sum is 18.");
  assert.equal(answer("maxPathSumInBinaryTree", "-5, -2, -9"), "The largest path sum is −2.");
  assert.equal(answer("maxPathSumInBinaryTree", "1, 2, 3"), "The largest path sum is 6.");
  const r = rng(41);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), -9, 9);
    // Every path, by its two ends: the values along the way from one end up and down to the other.
    const p = parents(t);
    let best = -Infinity;
    for (let a = 0; a < t.length; a++) {
      const d = distances(t, a);
      for (let b = 0; b < t.length; b++) {
        let s = 0;
        for (let x = b; ; ) {
          s += t[x].val;
          if (x === a) break;
          x = [...kids(t, x), p[x]].find((y) => y >= 0 && d[y] === d[x] - 1)!;
        }
        best = Math.max(best, s);
      }
    }
    assert.equal(answer("maxPathSumInBinaryTree", writeTree(t)), `The largest path sum is ${show(best)}.`, writeTree(t));
  }
});

test("find nodes distance k", () => {
  assert.equal(answer("findNodesDistanceK", "8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13", "6", "3"), "The nodes 3 away from 6: [10]");
  assert.equal(answer("findNodesDistanceK", "8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13", "6", "2"), "The nodes 2 away from 6: [1, 8]");
  assert.equal(answer("findNodesDistanceK", "1, 2", "1", "5"), "No node is 5 away from 1.");
  assert.throws(() => answer("findNodesDistanceK", "1, 2", "1", "0"), /from 1 to 14/);
  const r = rng(42);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), -20, 20, { unique: true });
    const i = int(r, 0, t.length - 1);
    const kk = int(r, 1, 5);
    const d = distances(t, i);
    const want = t.filter((_, j) => d[j] === kk).map((n) => n.val).sort((a, b) => a - b);
    const v = show(t[i].val);
    assert.equal(answer("findNodesDistanceK", writeTree(t), String(t[i].val), String(kk)), want.length ? `The nodes ${kk} away from ${v}: ${listText(want)}` : `No node is ${kk} away from ${v}.`);
  }
});

test("iterative in-order traversal", () => {
  assert.equal(answer("iterativeInOrderTraversal", "5, 3, 8, 1, 4, 7, null, null, 2"), "In order: [1, 2, 3, 4, 5, 7, 8]");
  assert.equal(answer("iterativeInOrderTraversal", "1, null, 2, 3"), "In order: [1, 3, 2]");
  const r = rng(43);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), -9, 9);
    assert.equal(answer("iterativeInOrderTraversal", writeTree(t)), `In order: ${listText(inOrder(t).map((i) => t[i].val))}`);
  }
});

test("flatten binary tree", () => {
  assert.equal(answer("flattenBinaryTree", "6, 3, 9, 1, 4, 8, null, null, 2"), "The list from the leftmost node, 1: 1 ⇄ 2 ⇄ 3 ⇄ 4 ⇄ 6 ⇄ 8 ⇄ 9");
  assert.equal(answer("flattenBinaryTree", "-1"), "The list from the leftmost node, −1: −1");
  assert.throws(() => answer("flattenBinaryTree", "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13"), /At most 12/);
  const r = rng(44);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 12), -9, 9);
    const order = inOrder(t).map((i) => show(t[i].val));
    assert.equal(answer("flattenBinaryTree", writeTree(t)), `The list from the leftmost node, ${order[0]}: ${order.join(" ⇄ ")}`);
  }
});

test("right sibling tree", () => {
  assert.equal(
    answer("rightSiblingTree", "6, 2, 9, 1, 4, 8, 12, 0, null, 3, 5, null, null, 10"),
    "Each level: 6 → ∅; 2 → 9, 9 → ∅; 1 → 4, 4 → 8, 8 → 12, 12 → ∅; 0 → ∅, 3 → 5, 5 → ∅, 10 → ∅",
  );
  assert.equal(answer("rightSiblingTree", "1, null, 2"), "Each level: 1 → ∅; 2 → ∅");
  const r = rng(45);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), 0, 30);
    // The neighbour is whatever is in the very next place of a full tree, unless that place starts the next level.
    const at = places(t);
    const byLevel = new Map<number, number[]>();
    for (const p of [...at.keys()].sort((a, b) => a - b)) {
      const lv = Math.floor(Math.log2(p));
      byLevel.set(lv, [...(byLevel.get(lv) ?? []), p]);
    }
    const text = [...byLevel.values()]
      .map((ps) => ps.map((p) => `${show(t[at.get(p)!].val)} → ${(p + 1) & p && at.has(p + 1) ? show(t[at.get(p + 1)!].val) : "∅"}`).join(", "))
      .join("; ");
    assert.equal(answer("rightSiblingTree", writeTree(t)), `Each level: ${text}`, writeTree(t));
  }
});

test("all kinds of node depths", () => {
  assert.equal(answer("allKindsOfNodeDepths", "3, 8, 5, 1, null, 9, 2, 4, 6"), "All the depths, from every root, add up to 23.");
  assert.equal(answer("allKindsOfNodeDepths", "1"), "All the depths, from every root, add up to 0.");
  assert.equal(answer("allKindsOfNodeDepths", "1, 2, 3"), "All the depths, from every root, add up to 2.");
  const r = rng(46);
  for (let k = 0; k < 150; k++) {
    const t = randomTree(r, 1 + (k % 15), 0, 9);
    let want = 0;
    for (let i = 0; i < t.length; i++) {
      const d = distances(t, i);
      want += below(t, i).reduce((s, j) => s + d[j], 0);
    }
    assert.equal(answer("allKindsOfNodeDepths", writeTree(t)), `All the depths, from every root, add up to ${want}.`);
  }
});

test("compare leaf traversal", () => {
  assert.equal(answer("compareLeafTraversal", "5, 3, 9, 1, 4, null, 2, null, null, 7, 6", "8, 1, 3, null, null, 7, 0, null, null, 6, 2"), "Yes: both trees' leaves read [1, 7, 6, 2].");
  assert.equal(answer("compareLeafTraversal", "1, 2, 3", "1, 3, 2"), "No: the leaves part ways at 2 and 3.");
  assert.equal(answer("compareLeafTraversal", "1, 2, 3", "5, 2, 4, null, null, 3, 8"), "No: one tree has a leaf more (8).");
  assert.equal(answer("compareLeafTraversal", "4", "9, 4"), "Yes: both trees' leaves read [4].");
  const r = rng(47);
  for (let k = 0; k < 150; k++) {
    const a = randomTree(r, 1 + (k % 12), 0, 3);
    const b = randomTree(r, 1 + ((k * 5) % 12), 0, 3);
    const [la, lb] = [leaves(a), leaves(b)];
    const same = la.length === lb.length && la.every((v, i) => v === lb[i]);
    assert.equal(answer("compareLeafTraversal", writeTree(a), writeTree(b)).startsWith("Yes"), same, `${writeTree(a)} / ${writeTree(b)}`);
  }
});
