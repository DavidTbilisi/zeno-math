// The binary search tree problems give the right answers: on their examples, on cases picked to catch a slip (a
// value deep down out of range, a one-node tree, equal values going right), and on random trees checked against
// working it out the slow way (sorting, trying every node, a plain recursive BST); bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { depth, listText, show, tree, writeTree, type TreeNode } from "../src/math/problems/core.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const B = w.bst;
const e = w.errors;
const trace = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w);
const answer = (id: ProblemId, ...input: string[]) => trace(id, ...input).answer;
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const num = (s: string) => Number(s.replace(/−/g, "-"));

/** A BST from inserting the values in order (equal ones go right); values that would make it too deep are left out. */
function bstOf(vals: number[], deepest = 5): TreeNode[] {
  const out: TreeNode[] = [];
  for (const v of vals) {
    if (!out.length) {
      out.push({ val: v, left: -1, right: -1 });
      continue;
    }
    let at = 0;
    let d = 1;
    for (;;) {
      const side = v < out[at].val ? "left" : "right";
      if (out[at][side] < 0) {
        if (d + 1 > deepest) break;
        out.push({ val: v, left: -1, right: -1 });
        out[at][side] = out.length - 1;
        break;
      }
      at = out[at][side];
      d++;
    }
  }
  return out;
}

/** A random binary tree of n nodes and at most 5 levels, read back the way the solvers read it. */
function randomTree(r: () => number, n: number, lo: number, hi: number): TreeNode[] {
  const nodes: TreeNode[] = [{ val: int(r, lo, hi), left: -1, right: -1 }];
  const d = [0];
  for (let k = 1; k < n; k++) {
    const free = nodes.flatMap((x, i) => (d[i] < 4 ? (["left", "right"] as const).filter((s) => x[s] < 0).map((s) => [i, s] as const) : []));
    const [i, s] = free[Math.floor(r() * free.length)];
    nodes.push({ val: int(r, lo, hi), left: -1, right: -1 });
    nodes[i][s] = nodes.length - 1;
    d.push(d[i] + 1);
  }
  return tree(writeTree(nodes), e);
}

const randomBst = (r: () => number, n: number, lo: number, hi: number, unique = false) => {
  const vals: number[] = [];
  while (vals.length < n) {
    const v = int(r, lo, hi);
    if (!unique || !vals.includes(v)) vals.push(v);
  }
  return tree(writeTree(bstOf(vals)), e);
};

const inOrder = (t: TreeNode[], at = 0): number[] => (at < 0 ? [] : [...inOrder(t, t[at].left), t[at].val, ...inOrder(t, t[at].right)]);
const preOrder = (t: TreeNode[], at = 0): number[] => (at < 0 ? [] : [t[at].val, ...preOrder(t, t[at].left), ...preOrder(t, t[at].right)]);
const postOrder = (t: TreeNode[], at = 0): number[] => (at < 0 ? [] : [...postOrder(t, t[at].left), ...postOrder(t, t[at].right), t[at].val]);
const below = (t: TreeNode[], at: number): number[] => (at < 0 ? [] : [at, ...below(t, t[at].left), ...below(t, t[at].right)]);
/** The BST rule checked the slow way: every value on the left smaller, every value on the right at least as big. */
const slowBst = (t: TreeNode[]) =>
  t.every((n) => below(t, n.left).every((i) => t[i].val < n.val) && below(t, n.right).every((i) => t[i].val >= n.val));

test("find closest value in BST", () => {
  assert.equal(answer("findClosestValueInBst", "20, 9, 31, 4, 14, 25, 40, null, 7, 11, 17", "15"), "The closest value to 15 is 14.");
  assert.equal(answer("findClosestValueInBst", "8", "-3"), "The closest value to −3 is 8.");
  assert.equal(answer("findClosestValueInBst", "10, 5, 15", "15"), "The closest value to 15 is 15.");
  assert.throws(() => answer("findClosestValueInBst", "10, 12, 15", "3"), /isn't a BST/);
  const r = rng(11);
  for (let k = 0; k < 200; k++) {
    const t = randomBst(r, 1 + (k % 12), -30, 30);
    const x = int(r, -40, 40);
    const got = num(answer("findClosestValueInBst", writeTree(t), String(x)).match(/is (\S+)\.$/)![1]);
    const best = Math.min(...t.map((n) => Math.abs(n.val - x)));
    assert.equal(Math.abs(got - x), best, `${writeTree(t)} → ${x}`);
  }
});

// A plain recursive BST to check the construction against, removing as AlgoExpert does.
type R = { v: number; l: R | null; r: R | null } | null;
const rInsert = (t: R, v: number): R => (!t ? { v, l: null, r: null } : v < t.v ? { ...t, l: rInsert(t.l, v) } : { ...t, r: rInsert(t.r, v) });
const rMin = (t: NonNullable<R>): number => (t.l ? rMin(t.l) : t.v);
function rRemove(t: R, v: number, top = true): R {
  if (!t) return t;
  if (v < t.v) return { ...t, l: rRemove(t.l, v, false) };
  if (v > t.v) return { ...t, r: rRemove(t.r, v, false) };
  if (t.l && t.r) {
    const m = rMin(t.r);
    return { ...t, v: m, r: rRemove(t.r, m, false) };
  }
  if (top && !t.l && !t.r) return t;
  return t.l ?? t.r;
}
const rLevels = (t: R): number => (t ? 1 + Math.max(rLevels(t.l), rLevels(t.r)) : 0);
function rWrite(t: R): string {
  const nodes: TreeNode[] = [];
  const walk = (x: R): number => {
    if (!x) return -1;
    const at = nodes.push({ val: x.v, left: -1, right: -1 }) - 1;
    nodes[at].left = walk(x.l);
    nodes[at].right = walk(x.r);
    return at;
  };
  walk(t);
  return writeTree(nodes);
}

test("BST construction", () => {
  assert.equal(
    answer("bstConstruction", "20, 11, 30, 6, 11, 26, 41, 28", "insert 24, remove 20, contains 28, remove 30, contains 30"),
    "The tree now, level by level: 24, 11, 41, 6, 11, 26, null, null, null, null, null, null, 28",
  );
  const notes = trace("bstConstruction", "5, 3", "contains 3, contains 4, remove 5, remove 3, remove 9").frames.map((f) => f.note);
  assert.ok(notes.includes("contains 3: the walk 5 → 3 finds it, so yes."));
  assert.ok(notes.includes("contains 4: the walk 5 → 3 ends without finding it, so no."));
  assert.ok(notes.includes(fillX(B.bstConstruction.removeOnly, "3")));
  assert.equal(answer("bstConstruction", "5, 3", "remove 5"), "The tree now, level by level: 3");
  // Equal values go right; in Russian and Georgian their own names for the operations work too, besides English.
  assert.equal(answer("bstConstruction", "5", "insert 5, insert 7, insert 2"), "The tree now, level by level: 5, 2, 5, null, null, null, 7");
  assert.match(problemTrace("bstConstruction", ["5", "insert 5, Вставить 7, удалить 2"], ru.live.problems).answer, /5, null, 5, null, 7$/);
  assert.match(problemTrace("bstConstruction", ["5", "ჩასმა 2, contains 2"], ka.live.problems).answer, /5, 2$/);
  assert.throws(() => answer("bstConstruction", "5", "push 3"), /isn't an operation/);
  assert.throws(() => answer("bstConstruction", "1, 2, 3, 4, 5", "insert 6"), /At most 5 levels/);
  const r = rng(12);
  let checked = 0;
  for (let k = 0; k < 200; k++) {
    const start = Array.from({ length: 1 + (k % 6) }, () => int(r, 0, 12));
    const ops = Array.from({ length: 1 + (k % 5) }, () => [["insert", "remove", "contains"][int(r, 0, 2)], int(r, 0, 12)] as const);
    let ref: R = null;
    let deep = false;
    for (const v of start) ref = rInsert(ref, v);
    deep ||= rLevels(ref) > 5;
    for (const [op, x] of ops) {
      if (op === "insert") ref = rInsert(ref, x);
      if (op === "remove") ref = rRemove(ref, x);
      deep ||= rLevels(ref) > 5;
    }
    const input = [start.join(", "), ops.map(([op, x]) => `${op} ${x}`).join(", ")];
    if (deep) {
      assert.throws(() => answer("bstConstruction", ...input), /At most 5 levels/);
      continue;
    }
    checked++;
    const got = answer("bstConstruction", ...input);
    assert.equal(got, `The tree now, level by level: ${rWrite(ref)}`, input.join(" / "));
    const final = tree(got.split(": ")[1], e);
    assert.ok(slowBst(final));
  }
  assert.ok(checked > 120);
});

function fillX(s: string, x: string) {
  return s.replace("{x}", x);
}

test("validate BST", () => {
  assert.equal(answer("validateBst", "10, 5, 15, 2, 8, 11, 20, null, null, 6, 12"), "No: 12 is out of place, so this isn't a BST.");
  assert.equal(answer("validateBst", "10, 5, 15, 2, 8, 11, 20"), B.validateBst.yes);
  assert.equal(answer("validateBst", "4"), B.validateBst.yes);
  // An equal value belongs on the right, not on the left.
  assert.equal(answer("validateBst", "5, null, 5"), B.validateBst.yes);
  assert.equal(answer("validateBst", "5, 5"), "No: 5 is out of place, so this isn't a BST.");
  assert.throws(() => answer("validateBst", "1, x"), /isn't a number/);
  const r = rng(13);
  for (let k = 0; k < 200; k++) {
    const t = k % 2 ? randomTree(r, 1 + (k % 10), 0, 9) : randomBst(r, 1 + (k % 13), 0, 20);
    assert.equal(answer("validateBst", writeTree(t)) === B.validateBst.yes, slowBst(t), writeTree(t));
  }
});

test("BST traversal", () => {
  assert.equal(answer("bstTraversal", "8, 4, 12, 2, 6, null, 14, null, 3"), "In-order [2, 3, 4, 6, 8, 12, 14]; pre-order [8, 4, 2, 3, 6, 12, 14]; post-order [3, 2, 6, 4, 14, 12, 8]");
  assert.equal(answer("bstTraversal", "-1"), "In-order [−1]; pre-order [−1]; post-order [−1]");
  assert.throws(() => answer("bstTraversal", "1, 2, 3"), /isn't a BST/);
  const r = rng(14);
  for (let k = 0; k < 100; k++) {
    const t = randomBst(r, 1 + (k % 15), -9, 30);
    assert.equal(answer("bstTraversal", writeTree(t)), `In-order ${listText(inOrder(t))}; pre-order ${listText(preOrder(t))}; post-order ${listText(postOrder(t))}`);
  }
});

test("min height BST", () => {
  assert.equal(answer("minHeightBst", "3, 6, 8, 11, 17, 19, 24, 30, 35, 40"), "A BST with 4 levels: 17, 6, 30, 3, 8, 19, 35, null, null, null, 11, null, 24, null, 40");
  assert.equal(answer("minHeightBst", "-2"), "A BST with 1 levels: −2");
  assert.throws(() => answer("minHeightBst", "1, 3, 2"), /sorted/);
  assert.throws(() => answer("minHeightBst", "1, 1"), /different/);
  const r = rng(15);
  for (let k = 0; k < 100; k++) {
    const xs = [...new Set(Array.from({ length: 1 + (k % 15) }, () => int(r, -40, 40)))].sort((a, b) => a - b);
    const got = answer("minHeightBst", xs.join(", "));
    const t = tree(got.split(": ")[1], e);
    assert.deepEqual(inOrder(t), xs);
    assert.equal(depth(t), Math.ceil(Math.log2(xs.length + 1)), got);
    assert.ok(slowBst(t));
  }
});

test("find kth largest value in BST", () => {
  assert.equal(answer("findKthLargestValueInBst", "12, 6, 19, 3, 9, 16, 25, 1, null, 7, 10", "5"), "With k = 5, the kth largest value is 10.");
  assert.equal(answer("findKthLargestValueInBst", "5, 3, 7, null, null, 5", "2"), "With k = 2, the kth largest value is 5.");
  assert.throws(() => answer("findKthLargestValueInBst", "5, 3, 7", "4"), /from 1 to 3/);
  const r = rng(16);
  for (let k = 0; k < 200; k++) {
    const t = randomBst(r, 1 + (k % 14), -20, 20);
    const kk = int(r, 1, t.length);
    const want = t.map((n) => n.val).sort((a, b) => b - a)[kk - 1];
    assert.equal(answer("findKthLargestValueInBst", writeTree(t), String(kk)), `With k = ${kk}, the kth largest value is ${show(want)}.`);
  }
});

test("reconstruct BST", () => {
  assert.equal(answer("reconstructBst", "16, 9, 4, 12, 10, 14, 25, 20, 31, 28"), "The tree, level by level: 16, 9, 25, 4, 12, 20, 31, null, null, 10, 14, null, null, 28");
  assert.equal(answer("reconstructBst", "2, 2, 2"), "The tree, level by level: 2, null, 2, null, 2");
  assert.throws(() => answer("reconstructBst", "5, 3, 4, 2"), /no place/);
  assert.throws(() => answer("reconstructBst", "1, 2, 3, 4, 5, 6"), /At most 5 levels/);
  const r = rng(17);
  for (let k = 0; k < 200; k++) {
    const t = randomBst(r, 1 + (k % 15), -15, 15);
    assert.equal(answer("reconstructBst", preOrder(t).join(", ")), `The tree, level by level: ${writeTree(t)}`);
  }
});

test("same BSTs", () => {
  assert.equal(answer("sameBsts", "7, 3, 11, 9, 1, 5, 13, 4", "7, 11, 13, 3, 9, 5, 1, 4"), B.sameBsts.yes);
  assert.equal(answer("sameBsts", "7, 3, 11", "7, 11, 3, 3"), B.sameBsts.no);
  assert.equal(answer("sameBsts", "2, 1", "1, 2"), B.sameBsts.no);
  assert.equal(answer("sameBsts", "5, 5, 4", "5, 4, 5"), B.sameBsts.yes);
  const r = rng(18);
  let yes = 0;
  for (let k = 0; k < 200; k++) {
    const a = Array.from({ length: 1 + (k % 10) }, () => int(r, 0, 12));
    let b: number[];
    if (k % 2) b = [...a].sort(() => r() - 0.5);
    else {
      // Another order that inserts the same tree: any order in which each value comes after its parent.
      const t = bstOf(a, 99);
      const ready = [0];
      b = [];
      while (ready.length) {
        const i = ready.splice(Math.floor(r() * ready.length), 1)[0];
        b.push(t[i].val);
        ready.push(...[t[i].left, t[i].right].filter((c) => c >= 0));
      }
    }
    const same = writeTree(bstOf(a, 99)) === writeTree(bstOf(b, 99));
    if (same) yes++;
    assert.equal(answer("sameBsts", a.join(", "), b.join(", ")) === B.sameBsts.yes, same, `${a} / ${b}`);
  }
  assert.ok(yes > 80 && yes < 180);
});

test("validate three nodes", () => {
  assert.equal(answer("validateThreeNodes", "20, 10, 30, 5, 15, 25, 35, 2, 7, 12, 18", "12, 10, 20"), "Yes: 20 is above 10, and 12 is below it.");
  assert.equal(answer("validateThreeNodes", "20, 10, 30, 5, 15, 25, 35, 2, 7, 12, 18", "20, 10, 7"), "Yes: 20 is above 10, and 7 is below it.");
  assert.equal(answer("validateThreeNodes", "20, 10, 30, 5, 15, 25, 35, 2, 7, 12, 18", "20, 30, 7"), "No: 7 isn't below 30.");
  assert.equal(answer("validateThreeNodes", "20, 10, 30, 5, 15, 25, 35, 2, 7, 12, 18", "20, 7, 10"), "No: going down from 20 met 10 before 7, so 7 isn't between them.");
  assert.equal(answer("validateThreeNodes", "20, 10, 30, 5, 15, 25, 35, 2, 7, 12, 18", "5, 15, 25"), "No: 15 is below neither 5 nor 25.");
  assert.throws(() => answer("validateThreeNodes", "2, 1, 3", "1, 2, 4"), /4 isn't in the tree/);
  assert.throws(() => answer("validateThreeNodes", "2, 1, 3", "1, 2, 1"), /different/);
  assert.throws(() => answer("validateThreeNodes", "2, 1, 3", "1, 2"), /At least 3/);
  const r = rng(19);
  for (let k = 0; k < 200; k++) {
    const t = randomBst(r, 3 + (k % 13), 0, 40, true);
    const par = t.map(() => -1);
    t.forEach((n, i) => [n.left, n.right].forEach((c) => c >= 0 && (par[c] = i)));
    const above = (a: number, b: number) => {
      for (let x = par[b]; x >= 0; x = par[x]) if (x === a) return true;
      return false;
    };
    const pick: number[] = [];
    while (pick.length < 3) {
      const i = int(r, 0, t.length - 1);
      if (!pick.includes(i)) pick.push(i);
    }
    // Pick a chain now and then, so the yes answers turn up too.
    if (k % 3 === 0) {
      const leaf = int(r, 0, t.length - 1);
      const chain = [leaf];
      for (let x = par[leaf]; x >= 0; x = par[x]) chain.push(x);
      if (chain.length >= 3) {
        // Three places on the way up from the leaf, deepest first.
        const at: number[] = [];
        while (at.length < 3) {
          const i = int(r, 0, chain.length - 1);
          if (!at.includes(i)) at.push(i);
        }
        const [low, mid, high] = at.sort((x, y) => x - y).map((i) => chain[i]);
        pick.splice(0, 3, ...(r() < 0.5 ? [high, mid, low] : [low, mid, high]));
      }
    }
    const [o, m, th] = pick;
    const yes = (above(o, m) && above(m, th)) || (above(th, m) && above(m, o));
    const got = answer("validateThreeNodes", writeTree(t), pick.map((i) => t[i].val).join(", "));
    assert.equal(got.startsWith("Yes"), yes, `${writeTree(t)} / ${pick.map((i) => t[i].val)}: ${got}`);
  }
});

test("repair BST", () => {
  assert.equal(answer("repairBst", "10, 14, 15, 2, 7, 13, 22, 1, null, 6, null, null, 5"), "Swap 14 and 5: 10, 5, 15, 2, 7, 13, 22, 1, null, 6, null, null, 14");
  assert.equal(answer("repairBst", "1, 2"), "Swap 2 and 1: 2, 1");
  assert.throws(() => answer("repairBst", "2, 1, 3"), /already/);
  assert.throws(() => answer("repairBst", "1, 2, 3, 4"), /can't make/);
  const r = rng(20);
  for (let k = 0; k < 200; k++) {
    const t = randomBst(r, 2 + (k % 14), -30, 30, true);
    const [i, j] = [int(r, 0, t.length - 1), int(r, 0, t.length - 1)];
    if (i === j) continue;
    const broken = t.map((n) => ({ ...n }));
    [broken[i].val, broken[j].val] = [t[j].val, t[i].val];
    const got = answer("repairBst", writeTree(broken));
    const pair = [t[i].val, t[j].val].sort((a, b) => a - b).map(show);
    assert.match(got, new RegExp(`^Swap (${pair[0]} and ${pair[1]}|${pair[1]} and ${pair[0]}): `));
    assert.equal(got.split(": ")[1], writeTree(t));
  }
});

test("sum BSTs", () => {
  assert.equal(answer("sumBsts", "8, 5, 15, 2, 6, 11, 20, 1, 3, 4, 7, 10, 12"), "The largest BSTs of 3 or more nodes hold 11 nodes in all.");
  assert.equal(answer("sumBsts", "2, 1, 3"), "The largest BSTs of 3 or more nodes hold 3 nodes in all.");
  assert.equal(answer("sumBsts", "2, 1"), "The largest BSTs of 3 or more nodes hold 0 nodes in all.");
  assert.equal(answer("sumBsts", "1, 2, 3"), "The largest BSTs of 3 or more nodes hold 0 nodes in all.");
  const r = rng(21);
  for (let k = 0; k < 200; k++) {
    const t = k % 3 ? randomTree(r, 1 + (k % 15), 0, 9) : randomBst(r, 1 + (k % 15), 0, 20);
    const big = t.map((_, i) => slowBst(subtree(t, i)) && below(t, i).length >= 3);
    const par = t.map(() => -1);
    t.forEach((n, i) => [n.left, n.right].forEach((c) => c >= 0 && (par[c] = i)));
    let want = 0;
    t.forEach((_, i) => {
      if (!big[i]) return;
      for (let x = par[i]; x >= 0; x = par[x]) if (big[x]) return;
      want += below(t, i).length;
    });
    assert.equal(answer("sumBsts", writeTree(t)), `The largest BSTs of 3 or more nodes hold ${want} nodes in all.`, writeTree(t));
  }
});

/** The subtree under a node as a tree of its own. */
function subtree(t: TreeNode[], at: number): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (i: number): number => {
    if (i < 0) return -1;
    const k = out.push({ val: t[i].val, left: -1, right: -1 }) - 1;
    out[k].left = walk(t[i].left);
    out[k].right = walk(t[i].right);
    return k;
  };
  walk(at);
  return out;
}

test("right smaller than", () => {
  assert.equal(answer("rightSmallerThan", "6, 9, 2, -4, 7, 3, 5"), "Counts: [4, 5, 1, 0, 2, 0, 0]");
  assert.equal(answer("rightSmallerThan", "3"), "Counts: [0]");
  assert.equal(answer("rightSmallerThan", "2, 2, 1, 2"), "Counts: [1, 1, 0, 0]");
  assert.throws(() => answer("rightSmallerThan", "1, 2, 3, 4, 5, 6"), /At most 5 levels/);
  const r = rng(22);
  let checked = 0;
  for (let k = 0; k < 200; k++) {
    const xs = Array.from({ length: 1 + (k % 12) }, () => int(r, -9, 9));
    const want = xs.map((x, i) => xs.slice(i + 1).filter((y) => y < x).length);
    if (depth(bstOf([...xs].reverse(), 99)) > 5) {
      assert.throws(() => answer("rightSmallerThan", xs.join(", ")), /At most 5 levels/);
      continue;
    }
    checked++;
    assert.equal(answer("rightSmallerThan", xs.join(", ")), `Counts: ${listText(want)}`, `${xs}`);
  }
  assert.ok(checked > 100);
});
