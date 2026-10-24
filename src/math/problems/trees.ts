// Interview problems on binary trees: each solver reads the tree level by level, walks it the way the problem is meant
// to be walked (post-order handing results up, a queue a level at a time, parent links), and leaves a frame at every
// step: the tree coloured, small words under the nodes (a height, a sum, a depth) and rows for stacks and answers.
// Also the tree helpers the binary search tree problems share.
import { depth, done, fill, int, listText, row, show, tree, writeTree, type Errors, type Frame, type ProblemSet, type Role, type TreeNode } from "./core";

// ——— Helpers shared with the BST problems ———

/** A node that can be relinked while a trace changes the tree; `id` stays the node's own. */
export type N = { val: number; left: N | null; right: N | null; id: number };

/** The tree's nodes as linkable objects, by the same indices. */
export function linked(nodes: readonly TreeNode[]): N[] {
  const out: N[] = nodes.map((n, id) => ({ val: n.val, left: null, right: null, id }));
  nodes.forEach((n, i) => {
    out[i].left = n.left >= 0 ? out[n.left] : null;
    out[i].right = n.right >= 0 ? out[n.right] : null;
  });
  return out;
}

/** A linked tree written as the scenes want it: numbered in pre-order from the root (node 0), coloured and tagged. */
export function pack(root: N | null, role: (n: N) => Role = () => "plain", tag?: (n: N) => string): { nodes: TreeNode[]; roles: Role[]; tags?: string[] } {
  const nodes: TreeNode[] = [];
  const roles: Role[] = [];
  const tags: string[] = [];
  const walk = (n: N | null): number => {
    if (!n) return -1;
    const at = nodes.length;
    nodes.push({ val: n.val, left: -1, right: -1 });
    roles.push(role(n));
    if (tag) tags.push(tag(n));
    nodes[at].left = walk(n.left);
    nodes[at].right = walk(n.right);
    return at;
  };
  walk(root);
  return tag ? { nodes, roles, tags } : { nodes, roles };
}

/** How many nodes and levels a linked tree has. */
export const sizeOf = (n: N | null): number => (n ? 1 + sizeOf(n.left) + sizeOf(n.right) : 0);
export const levelsOf = (n: N | null): number => (n ? 1 + Math.max(levelsOf(n.left), levelsOf(n.right)) : 0);

/** A linked tree that must still fit the picture. */
export function fits(root: N | null, e: Errors, max = 15, deepest = 5) {
  if (sizeOf(root) > max) throw new Error(fill(e.tooMany, { n: max }));
  if (levelsOf(root) > deepest) throw new Error(fill(e.deep, { n: deepest }));
}

/** The nodes' indices in order: left subtree, node, right subtree. */
export function inOrder(nodes: readonly TreeNode[], at = 0): number[] {
  return at < 0 ? [] : [...inOrder(nodes, nodes[at].left), at, ...inOrder(nodes, nodes[at].right)];
}

/** Each node's parent (−1 for the root). */
export function parentsOf(nodes: readonly TreeNode[]): number[] {
  const out = nodes.map(() => -1);
  nodes.forEach((n, i) => {
    if (n.left >= 0) out[n.left] = i;
    if (n.right >= 0) out[n.right] = i;
  });
  return out;
}

/** Each node's depth (the root's is 0). */
export function depthsOf(nodes: readonly TreeNode[]): number[] {
  const out = nodes.map(() => 0);
  const walk = (at: number, d: number) => {
    if (at < 0) return;
    out[at] = d;
    walk(nodes[at].left, d + 1);
    walk(nodes[at].right, d + 1);
  };
  walk(0, 0);
  return out;
}

/** A BST as AlgoExpert has it: everything on the left smaller, everything on the right at least as big. */
export function isBst(nodes: readonly TreeNode[], at = 0, lo = -Infinity, hi = Infinity): boolean {
  if (at < 0) return true;
  const v = nodes[at].val;
  return v >= lo && v < hi && isBst(nodes, nodes[at].left, lo, v) && isBst(nodes, nodes[at].right, v, hi);
}

/** A bound that may be infinite, written for a note. */
export const bound = (v: number) => (v === Infinity ? "∞" : v === -Infinity ? "−∞" : show(v));

/** A second tree drawn as a graph in layers, so two trees can be on the screen at once. */
export function treeGraph(nodes: readonly TreeNode[], roles: Role[], tags?: string[]): NonNullable<Frame["graph"]> {
  const d = depthsOf(nodes);
  return {
    nodes: nodes.map((n) => show(n.val)),
    edges: nodes.flatMap((n, i) => [n.left, n.right].filter((c) => c >= 0).map((c) => ({ a: i, b: c }))),
    roles,
    directed: false,
    layer: d,
    ...(tags ? { tags } : {}),
  };
}

/** Values that must not repeat, for the problems that find a node by its value. */
function unique(nodes: readonly TreeNode[], msg: string) {
  const seen = new Set<number>();
  for (const n of nodes) {
    if (seen.has(n.val)) throw new Error(fill(msg, { v: show(n.val) }));
    seen.add(n.val);
  }
}

/** The node holding this value, or a message saying it isn't there. */
function find(nodes: readonly TreeNode[], v: number, msg: string): number {
  const at = nodes.findIndex((n) => n.val === v);
  if (at < 0) throw new Error(fill(msg, { v: show(v) }));
  return at;
}

const nul = "∅";
const showAt = (nodes: readonly TreeNode[], i: number) => (i < 0 ? nul : show(nodes[i].val));

// ——— Expression trees ———

const OPS: Record<string, string> = { "+": "+", "-": "−", "*": "×", "x": "×", "×": "×", "/": "÷", ":": "÷", "÷": "÷" };

/** A tree of operators and positive whole numbers, level by level: the nodes (operators as −1…−4) and their labels. */
function expressionTree(s: string, e: Errors, w: { leafOp: string; innerNum: string }): { nodes: TreeNode[]; labels: string[] } {
  const parts = s.replace(/[−–—]/g, "-").split(/[,;\s]+/).filter(Boolean);
  if (!parts.length || /^(null|#)$/i.test(parts[0])) throw new Error(e.empty);
  const code = { "+": -1, "−": -2, "÷": -3, "×": -4 } as Record<string, number>;
  const read = (p: string): { val: number; label: string } | null => {
    if (/^(null|#)$/i.test(p)) return null;
    if (OPS[p.toLowerCase()]) return { val: code[OPS[p.toLowerCase()]], label: OPS[p.toLowerCase()] };
    const v = Number(p);
    if (!Number.isInteger(v)) throw new Error(fill(e.bad, { s: p }));
    if (v < 1) throw new Error(fill(e.atLeast, { s: p, n: 1 }));
    return { val: v, label: String(v) };
  };
  const vals = parts.map(read);
  const nodes: TreeNode[] = [{ val: vals[0]!.val, left: -1, right: -1 }];
  const labels = [vals[0]!.label];
  const queue = [0];
  let i = 1;
  while (queue.length && i < vals.length) {
    const p = queue.shift()!;
    for (const side of ["left", "right"] as const) {
      if (i >= vals.length) break;
      const v = vals[i++];
      if (!v) continue;
      nodes.push({ val: v.val, left: -1, right: -1 });
      labels.push(v.label);
      nodes[p][side] = nodes.length - 1;
      queue.push(nodes.length - 1);
    }
  }
  if (i < vals.length && vals.slice(i).some(Boolean)) throw new Error(fill(e.bad, { s: parts[i] }));
  if (nodes.length > 15) throw new Error(fill(e.tooMany, { n: 15 }));
  if (depth(nodes) > 5) throw new Error(fill(e.deep, { n: 5 }));
  nodes.forEach((n, k) => {
    const leaf = n.left < 0 && n.right < 0;
    if (n.val < 0 && (n.left < 0 || n.right < 0)) throw new Error(fill(w.leafOp, { op: labels[k] }));
    if (n.val > 0 && !leaf) throw new Error(fill(w.innerNum, { v: labels[k] }));
  });
  return { nodes, labels };
}

export const TREES: ProblemSet<"trees"> = {
  branchSums: {
    level: 1,
    example: ["4, 2, 9, 7, 1, null, 3, null, 5"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const frames: Frame[] = [];
      const sums: number[] = [];
      const path: number[] = [];
      const roles = (at: number) => nodes.map((_, i): Role => (i === at ? "key" : path.includes(i) ? "compare" : "plain"));
      const walk = (at: number, sum: number) => {
        if (at < 0) return;
        const s = sum + nodes[at].val;
        const n = nodes[at];
        const leaf = n.left < 0 && n.right < 0;
        if (leaf) sums.push(s);
        frames.push({
          note: fill(leaf ? w.leaf : w.down, { v: show(n.val), s: show(s) }),
          tree: { roles: roles(at) },
          rows: [row(w.sums, sums.map(show), (k) => (leaf && k === sums.length - 1 ? "key" : "sorted"))],
        });
        path.push(at);
        walk(n.left, s);
        walk(n.right, s);
        path.pop();
      };
      walk(0, 0);
      const answer = fill(w.answer, { list: listText(sums) });
      return { ...done(frames, answer, { tree: { roles: nodes.map((n) => (n.left < 0 && n.right < 0 ? "sorted" : "plain")) } }), tree: nodes };
    },
  },

  nodeDepths: {
    level: 1,
    example: ["5, 2, 8, 6, 1, null, 3, null, null, 4"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const d = depthsOf(nodes);
      const frames: Frame[] = [];
      const seen: number[] = [];
      let total = 0;
      // A stack of nodes still to visit, the root first.
      const stack = [0];
      while (stack.length) {
        const at = stack.pop()!;
        total += d[at];
        seen.push(at);
        frames.push({
          note: fill(at === 0 ? w.root : w.node, { v: show(nodes[at].val), d: d[at], t: total }),
          tree: { roles: nodes.map((_, i) => (i === at ? "key" : seen.includes(i) ? "sorted" : "plain")), tags: nodes.map((_, i) => (seen.includes(i) ? String(d[i]) : "")) },
          rows: [row(w.total, [total], () => "key")],
        });
        if (nodes[at].right >= 0) stack.push(nodes[at].right);
        if (nodes[at].left >= 0) stack.push(nodes[at].left);
      }
      return { ...done(frames, fill(w.answer, { t: total })), tree: nodes };
    },
  },

  evaluateExpressionTree: {
    level: 1,
    example: ["*, +, -, 6, /, 9, 2, null, null, 8, 3"],
    solve: ([t], w, e) => {
      const { nodes, labels } = expressionTree(t, e, w);
      const frames: Frame[] = [];
      const value: (number | null)[] = nodes.map(() => null);
      const tags = () => value.map((v, i) => (v === null || nodes[i].val > 0 ? "" : `= ${show(v)}`));
      const roles = (at: number) => nodes.map((_, i): Role => (i === at ? "key" : i === nodes[at].left || i === nodes[at].right ? "compare" : value[i] !== null ? "sorted" : "plain"));
      const evaluate = (at: number): number => {
        const n = nodes[at];
        if (n.val > 0) return (value[at] = n.val);
        const [a, b] = [evaluate(n.left), evaluate(n.right)];
        if (n.val === -3 && b === 0) throw new Error(fill(w.zero, { a: show(a) }));
        const r = n.val === -1 ? a + b : n.val === -2 ? a - b : n.val === -3 ? Math.trunc(a / b) : a * b;
        value[at] = r;
        const exact = n.val !== -3 || a % b === 0;
        frames.push({ note: fill(exact ? w.apply : w.divide, { a: show(a), op: labels[at], b: show(b), r: show(r) }), tree: { roles: roles(at), labels, tags: tags() } });
        return r;
      };
      const v = evaluate(0);
      if (!frames.length) frames.push({ note: fill(w.single, { v: show(v) }), tree: { roles: ["key"], labels } });
      return { ...done(frames, fill(w.answer, { v: show(v) }), { tree: { roles: nodes.map((_, i) => (i === 0 ? "sorted" : "idle")), labels, tags: tags() } }), tree: nodes };
    },
  },

  invertBinaryTree: {
    level: 2,
    example: ["6, 3, 9, 1, 4, null, 12, null, 2"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const now = nodes.map((n) => ({ ...n }));
      const frames: Frame[] = [];
      const swapped: number[] = [];
      const queue = [0];
      while (queue.length) {
        const at = queue.shift()!;
        const n = now[at];
        [n.left, n.right] = [n.right, n.left];
        swapped.push(at);
        if (n.left >= 0) queue.push(n.left);
        if (n.right >= 0) queue.push(n.right);
        if (n.left < 0 && n.right < 0) continue;
        frames.push({
          note: fill(w.swap, { v: show(n.val), a: showAt(now, n.right), b: showAt(now, n.left) }),
          tree: { nodes: now.map((x) => ({ ...x })), roles: now.map((_, i) => (i === at ? "key" : i === n.left || i === n.right ? "compare" : swapped.includes(i) ? "sorted" : "plain")) },
          rows: [row(w.queue, queue.map((i) => show(now[i].val)))],
        });
      }
      if (!frames.length) frames.push({ note: fill(w.single, { v: show(nodes[0].val) }), tree: { nodes: now, roles: ["key"] }, rows: [row(w.queue, [])] });
      return { ...done(frames, fill(w.answer, { t: writeTree(now) }), { tree: { nodes: now, roles: now.map(() => "sorted") } }), tree: nodes };
    },
  },

  binaryTreeDiameter: {
    level: 2,
    example: ["4, 9, 2, 1, 7, null, null, 3, null, 6, 8, 5, null, null, 10"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const frames: Frame[] = [];
      const height = nodes.map(() => 0);
      const seen: number[] = [];
      let best = 0;
      let bestAt = 0;
      const walk = (at: number) => {
        if (at < 0) return;
        const { left, right } = nodes[at];
        walk(left);
        walk(right);
        const [l, r] = [left < 0 ? 0 : height[left], right < 0 ? 0 : height[right]];
        height[at] = 1 + Math.max(l, r);
        seen.push(at);
        const through = l + r;
        const better = through > best;
        if (better) [best, bestAt] = [through, at];
        frames.push({
          note: fill(better ? w.better : w.node, { v: show(nodes[at].val), h: height[at], p: through, d: best }),
          tree: { roles: nodes.map((_, i) => (i === at ? "key" : i === left || i === right ? "compare" : seen.includes(i) ? "idle" : "plain")), tags: nodes.map((_, i) => (seen.includes(i) ? `h ${height[i]}` : "")) },
          rows: [row(w.best, [best], () => (better ? "key" : "plain"))],
        });
      };
      walk(0);
      // The longest path: down the taller side from each end of the best node.
      const onPath = new Set([bestAt]);
      for (const start of [nodes[bestAt].left, nodes[bestAt].right]) {
        let at = start;
        while (at >= 0) {
          onPath.add(at);
          const { left, right } = nodes[at];
          at = left < 0 ? right : right < 0 ? left : height[left] >= height[right] ? left : right;
        }
      }
      const answer = fill(w.answer, { d: best });
      return { ...done(frames, answer, { tree: { roles: nodes.map((_, i) => (onPath.has(i) ? "sorted" : "idle")), tags: nodes.map((_, i) => `h ${height[i]}`) } }), tree: nodes };
    },
  },

  findSuccessor: {
    level: 2,
    example: ["20, 8, 30, 4, 12, null, null, null, null, 10, 14", "14"],
    solve: ([t, x], w, e) => {
      const nodes = tree(t, e);
      unique(nodes, w.unique);
      const at = find(nodes, int(x, e, -999, 999), w.missing);
      const parent = parentsOf(nodes);
      const frames: Frame[] = [];
      const path: number[] = [];
      const roles = (cur: number) => nodes.map((_, i): Role => (i === at ? "pivot" : i === cur ? "key" : path.includes(i) ? "compare" : "plain"));
      const v = show(nodes[at].val);
      let found = -1;
      if (nodes[at].right >= 0) {
        let cur = nodes[at].right;
        frames.push({ note: fill(w.right, { v, r: show(nodes[cur].val) }), tree: { roles: roles(cur) } });
        while (nodes[cur].left >= 0) {
          path.push(cur);
          cur = nodes[cur].left;
          frames.push({ note: fill(w.left, { c: show(nodes[cur].val) }), tree: { roles: roles(cur) } });
        }
        found = cur;
      } else {
        frames.push({ note: fill(w.noRight, { v }), tree: { roles: roles(at) } });
        let cur = at;
        while (parent[cur] >= 0 && nodes[parent[cur]].right === cur) {
          path.push(cur);
          cur = parent[cur];
          frames.push({ note: fill(w.upRight, { c: show(nodes[cur].val) }), tree: { roles: roles(cur) } });
        }
        if (parent[cur] >= 0) {
          path.push(cur);
          found = parent[cur];
          frames.push({ note: fill(w.upLeft, { c: show(nodes[found].val), from: show(nodes[cur].val) }), tree: { roles: roles(found) } });
        }
      }
      const answer = found < 0 ? fill(w.none, { v }) : fill(w.answer, { v, s: show(nodes[found].val) });
      return { ...done(frames, answer, { tree: { roles: nodes.map((_, i) => (i === found ? "sorted" : i === at ? "pivot" : "plain")) } }), tree: nodes };
    },
  },

  heightBalancedBinaryTree: {
    level: 2,
    example: ["5, 3, 8, 1, 4, null, 9, null, 2, null, null, null, 11, null, null, 12"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const frames: Frame[] = [];
      const height = nodes.map(() => 0);
      const seen: number[] = [];
      let bad = -1;
      const walk = (at: number): boolean => {
        if (at < 0) return true;
        const { left, right } = nodes[at];
        if (!walk(left) || !walk(right)) return false;
        const [l, r] = [left < 0 ? 0 : height[left], right < 0 ? 0 : height[right]];
        height[at] = 1 + Math.max(l, r);
        seen.push(at);
        const ok = Math.abs(l - r) <= 1;
        if (!ok) bad = at;
        frames.push({
          note: fill(ok ? w.ok : w.off, { v: show(nodes[at].val), l, r, h: height[at] }),
          tree: { roles: nodes.map((_, i) => (i === at ? (ok ? "key" : "min") : i === left || i === right ? "compare" : seen.includes(i) ? "sorted" : "plain")), tags: nodes.map((_, i) => (seen.includes(i) ? `h ${height[i]}` : "")) },
        });
        return ok;
      };
      const ok = walk(0);
      const answer = ok ? w.yes : fill(w.no, { v: show(nodes[bad].val) });
      return { ...done(frames, answer), tree: nodes };
    },
  },

  mergeBinaryTrees: {
    level: 2,
    example: ["3, 1, 7, 2, null, 5", "4, 6, 2, null, 8, null, 9"],
    solve: ([a, b], w, e) => {
      const one = tree(a, e);
      const two = tree(b, e);
      // The merged shape must fit too: count the places either tree has a node.
      const union = (x: number, y: number): [number, number] => {
        if (x < 0 && y < 0) return [0, 0];
        const [l, ld] = union(x < 0 ? -1 : one[x].left, y < 0 ? -1 : two[y].left);
        const [r, rd] = union(x < 0 ? -1 : one[x].right, y < 0 ? -1 : two[y].right);
        return [1 + l + r, 1 + Math.max(ld, rd)];
      };
      const [size, levels] = union(0, 0);
      if (size > 15) throw new Error(fill(e.tooMany, { n: 15 }));
      if (levels > 5) throw new Error(fill(e.deep, { n: 5 }));
      const nodes = linked(one);
      const root = nodes[0];
      const frames: Frame[] = [];
      const merged = new Set<N>();
      const used: number[] = [];
      let id = nodes.length;
      const copy = (y: number): N | null => {
        if (y < 0) return null;
        used.push(y);
        const n: N = { val: two[y].val, left: null, right: null, id: id++ };
        merged.add(n);
        n.left = copy(two[y].left);
        n.right = copy(two[y].right);
        return n;
      };
      const snap = (note: string, cur: N | null, y: number) => {
        const p = pack(root, (n) => (n === cur ? "key" : merged.has(n) ? "sorted" : "plain"));
        frames.push({ note, tree: { nodes: p.nodes, roles: p.roles }, graph: treeGraph(two, two.map((_, i) => (i === y ? "compare" : used.includes(i) ? "sorted" : "plain"))) });
      };
      const merge = (x: N | null, y: number): N | null => {
        if (y < 0) return x;
        if (!x) return copy(y);
        const before = x.val;
        x.val += two[y].val;
        used.push(y);
        merged.add(x);
        snap(fill(w.add, { a: show(before), b: show(two[y].val), s: show(x.val) }), x, y);
        const yl = two[y].left;
        if (!x.left && yl >= 0) {
          x.left = merge(null, yl);
          snap(fill(w.attachLeft, { b: show(two[yl].val), p: show(x.val) }), x.left, yl);
        } else x.left = merge(x.left, yl);
        const yr = two[y].right;
        if (!x.right && yr >= 0) {
          x.right = merge(null, yr);
          snap(fill(w.attachRight, { b: show(two[yr].val), p: show(x.val) }), x.right, yr);
        } else x.right = merge(x.right, yr);
        return x;
      };
      merge(root, 0);
      const p = pack(root, () => "sorted");
      return { ...done(frames, fill(w.answer, { t: writeTree(p.nodes) }), { tree: { nodes: p.nodes, roles: p.roles } }), tree: p.nodes };
    },
  },

  symmetricalTree: {
    level: 2,
    example: ["7, 3, 3, 5, 1, 1, 5, 8, null, null, 2, 2, null, null, 8"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const frames: Frame[] = [];
      const checked: number[] = [];
      const L = [nodes[0].left];
      const R = [nodes[0].right];
      const stacks = () => [row(w.leftStack, L.map((i) => showAt(nodes, i))), row(w.rightStack, R.map((i) => showAt(nodes, i)))];
      frames.push({ note: w.start, tree: { roles: nodes.map((_, i) => (i === 0 ? "key" : "plain")) }, rows: stacks() });
      while (L.length) {
        const [a, b] = [L.pop()!, R.pop()!];
        if (a < 0 && b < 0) continue;
        const same = a >= 0 && b >= 0 && nodes[a].val === nodes[b].val;
        const roles = nodes.map((_, i): Role => (i === a || i === b ? (same ? "compare" : "min") : checked.includes(i) ? "sorted" : "plain"));
        if (!same) {
          frames.push({ note: fill(w.differ, { a: showAt(nodes, a), b: showAt(nodes, b) }), tree: { roles }, rows: stacks() });
          return { ...done(frames, fill(w.no, { a: showAt(nodes, a), b: showAt(nodes, b) })), tree: nodes };
        }
        checked.push(a, b);
        L.push(nodes[a].left, nodes[a].right);
        R.push(nodes[b].right, nodes[b].left);
        frames.push({ note: fill(w.match, { a: show(nodes[a].val), b: show(nodes[b].val) }), tree: { roles }, rows: stacks() });
      }
      return { ...done(frames, w.yes, { tree: { roles: nodes.map(() => "sorted") } }), tree: nodes };
    },
  },

  splitBinaryTree: {
    level: 2,
    example: ["2, 4, 5, 1, 3, -6, 18, null, null, 7"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const odd = nodes.find((n) => !Number.isInteger(n.val));
      if (odd) throw new Error(fill(e.whole, { s: show(odd.val) }));
      const total = nodes.reduce((s, n) => s + n.val, 0);
      const frames: Frame[] = [];
      const sums: (number | null)[] = nodes.map(() => null);
      const tags = () => sums.map((s) => (s === null ? "" : `Σ ${show(s)}`));
      if (total % 2 !== 0) {
        frames.push({ note: fill(w.odd, { t: show(total) }), tree: { roles: nodes.map(() => "plain") } });
        return { ...done(frames, fill(w.none, { s: 0 })), tree: nodes };
      }
      const half = total / 2;
      frames.push({ note: fill(w.total, { t: show(total), h: show(half) }), tree: { roles: nodes.map(() => "plain") } });
      let cut = -1;
      const walk = (at: number): number => {
        if (at < 0) return 0;
        const { left, right } = nodes[at];
        const s = nodes[at].val + walk(left) + walk(right);
        if (cut >= 0) return s;
        sums[at] = s;
        const hit = at !== 0 && s === half;
        if (hit) cut = at;
        frames.push({
          note: fill(hit ? w.hit : w.node, { v: show(nodes[at].val), s: show(s), h: show(half) }),
          tree: { roles: nodes.map((_, i) => (i === at ? (hit ? "sorted" : "key") : i === left || i === right ? "compare" : sums[i] !== null ? "idle" : "plain")), tags: tags() },
        });
        return s;
      };
      walk(0);
      const inside = (at: number): number[] => (at < 0 ? [] : [at, ...inside(nodes[at].left), ...inside(nodes[at].right)]);
      if (cut < 0) return { ...done(frames, fill(w.none, { s: 0 })), tree: nodes };
      const part = new Set(inside(cut));
      const answer = fill(w.answer, { v: show(nodes[cut].val), s: show(half) });
      return { ...done(frames, answer, { tree: { roles: nodes.map((_, i) => (part.has(i) ? "sorted" : "pivot")), tags: tags() } }), tree: nodes };
    },
  },

  maxPathSumInBinaryTree: {
    level: 3,
    example: ["-2, 6, 3, -1, 4, -8, 5, null, null, 2, null, 7"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const frames: Frame[] = [];
      const branch = nodes.map(() => 0);
      const seen: number[] = [];
      let best = -Infinity;
      let bestAt = 0;
      const walk = (at: number) => {
        if (at < 0) return;
        const { left, right, val } = nodes[at];
        walk(left);
        walk(right);
        const [l, r] = [left < 0 ? 0 : branch[left], right < 0 ? 0 : branch[right]];
        branch[at] = Math.max(Math.max(l, r) + val, val);
        const through = Math.max(l + val + r, branch[at]);
        const better = through > best;
        if (better) [best, bestAt] = [through, at];
        seen.push(at);
        frames.push({
          note: fill(better ? w.better : w.node, { v: show(val), b: show(branch[at]), p: show(through), m: show(best) }),
          tree: { roles: nodes.map((_, i) => (i === at ? "key" : i === left || i === right ? "compare" : seen.includes(i) ? "idle" : "plain")), tags: nodes.map((_, i) => (seen.includes(i) ? show(branch[i]) : "")) },
          rows: [row(w.best, [show(best)], () => (better ? "key" : "plain"))],
        });
      };
      walk(0);
      // The best path: its top node, and each side's best branch if it adds anything.
      const onPath = new Set([bestAt]);
      for (const start of [nodes[bestAt].left, nodes[bestAt].right]) {
        let at = start;
        while (at >= 0 && branch[at] > 0) {
          onPath.add(at);
          const { left, right, val } = nodes[at];
          const next = [left, right].filter((c) => c >= 0 && branch[c] > 0 && branch[at] === val + branch[c]);
          at = next.length ? next[0] : -1;
        }
      }
      return { ...done(frames, fill(w.answer, { m: show(best) }), { tree: { roles: nodes.map((_, i) => (onPath.has(i) ? "sorted" : "idle")), tags: nodes.map((_, i) => show(branch[i])) } }), tree: nodes };
    },
  },

  findNodesDistanceK: {
    level: 3,
    example: ["8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13", "6", "3"],
    solve: ([t, x, kk], w, e) => {
      const nodes = tree(t, e);
      unique(nodes, w.unique);
      const at = find(nodes, int(x, e, -999, 999), w.missing);
      const k = int(kk, e, 1, 14);
      const parent = parentsOf(nodes);
      const frames: Frame[] = [];
      const dist: number[] = nodes.map(() => -1);
      const tags = () => dist.map((d) => (d < 0 ? "" : `d ${d}`));
      frames.push({ note: fill(w.parents, { v: show(nodes[at].val) }), tree: { roles: nodes.map((_, i) => (i === at ? "key" : "plain")), tags: nodes.map((_, i) => (parent[i] < 0 ? "" : `↑${show(nodes[parent[i]].val)}`)) } });
      dist[at] = 0;
      let level = [at];
      for (let d = 1; d <= k && level.length; d++) {
        const next: number[] = [];
        for (const i of level)
          for (const j of [nodes[i].left, nodes[i].right, parent[i]])
            if (j >= 0 && dist[j] < 0) {
              dist[j] = d;
              next.push(j);
            }
        level = next;
        const vals = [...level].sort((p, q) => nodes[p].val - nodes[q].val).map((i) => nodes[i].val);
        const note = !level.length ? fill(w.empty, { d }) : d === k ? fill(w.last, { d, list: listText(vals) }) : fill(w.level, { d, list: listText(vals) });
        frames.push({
          note,
          tree: { roles: nodes.map((_, i) => (level.includes(i) ? (d === k ? "sorted" : "key") : i === at ? "pivot" : dist[i] >= 0 ? "idle" : "plain")), tags: tags() },
          rows: [row(w.queue, level.map((i) => show(nodes[i].val)))],
        });
      }
      const vals = level.map((i) => nodes[i].val).sort((p, q) => p - q);
      const answer = vals.length ? fill(w.answer, { k, v: show(nodes[at].val), list: listText(vals) }) : fill(w.none, { k, v: show(nodes[at].val) });
      return { ...done(frames, answer), tree: nodes };
    },
  },

  iterativeInOrderTraversal: {
    level: 4,
    example: ["5, 3, 8, 1, 4, 7, null, null, 2"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const parent = parentsOf(nodes);
      const frames: Frame[] = [];
      const out: number[] = [];
      let prev = -1;
      let cur = 0;
      while (cur >= 0) {
        const n = nodes[cur];
        const v = show(n.val);
        let next: number;
        let note: string;
        if (prev === parent[cur] && n.left >= 0) {
          next = n.left;
          note = fill(w.goLeft, { v, n: show(nodes[next].val) });
        } else if (prev === parent[cur] || prev === n.left) {
          // Coming down to a node with no left child, or back up from its left child: its turn now.
          out.push(cur);
          next = n.right >= 0 ? n.right : parent[cur];
          const why = fill(prev === parent[cur] ? w.fromParent : w.fromLeft, { v });
          const then = next < 0 ? w.thenEnd : n.right >= 0 ? w.thenRight : w.thenUp;
          note = `${why} ${fill(then, { n: showAt(nodes, next) })}`;
        } else {
          next = parent[cur];
          note = next < 0 ? fill(w.fromRightEnd, { v }) : fill(w.fromRight, { v, n: show(nodes[next].val) });
        }
        frames.push({
          note,
          tree: { roles: nodes.map((_, i) => (i === cur ? "key" : i === prev ? "pivot" : out.includes(i) ? "sorted" : "plain")) },
          rows: [row(w.prevCur, [showAt(nodes, prev), v], (k) => (k ? "key" : "pivot")), row(w.visited, out.map((i) => show(nodes[i].val)), (k) => (k === out.length - 1 && out[k] === cur ? "key" : "sorted"))],
        });
        prev = cur;
        cur = next;
      }
      return { ...done(frames, fill(w.answer, { list: listText(out.map((i) => nodes[i].val)) }), { tree: { roles: nodes.map(() => "sorted") } }), tree: nodes };
    },
  },

  flattenBinaryTree: {
    level: 4,
    example: ["6, 3, 9, 1, 4, 8, null, null, 2"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e, 12);
      const order = inOrder(nodes);
      const pos = nodes.map((_, i) => order.indexOf(i));
      const next = order.map(() => -1);
      const frames: Frame[] = [];
      const linkedTo = new Set<number>();
      const link = (a: number, b: number, at: number) => {
        next[pos[a]] = pos[b];
        linkedTo.add(a).add(b);
        frames.push({
          note: fill(w.link, { a: show(nodes[a].val), b: show(nodes[b].val), v: show(nodes[at].val) }),
          tree: { roles: nodes.map((_, i) => (i === a || i === b ? "key" : i === at ? "compare" : linkedTo.has(i) ? "sorted" : "plain")) },
          list: { vals: order.map((i) => nodes[i].val), next: [...next], roles: order.map((i) => (i === a || i === b ? "key" : linkedTo.has(i) ? "sorted" : "plain")), ptrs: {} },
        });
      };
      // Each subtree flattens to a piece of list; the node goes between its left piece's end and its right piece's start.
      const flatten = (at: number): [number, number] => {
        const { left, right } = nodes[at];
        let first = at;
        let last = at;
        if (left >= 0) {
          const [lf, ll] = flatten(left);
          link(ll, at, at);
          first = lf;
        }
        if (right >= 0) {
          const [rf, rl] = flatten(right);
          link(at, rf, at);
          last = rl;
        }
        return [first, last];
      };
      const [head] = flatten(0);
      if (!frames.length) frames.push({ note: fill(w.single, { v: show(nodes[0].val) }), tree: { roles: ["key"] }, list: { vals: [nodes[0].val], next: [-1], roles: ["key"], ptrs: {} } });
      const answer = fill(w.answer, { v: show(nodes[head].val), list: order.map((i) => show(nodes[i].val)).join(" ⇄ ") });
      return { ...done(frames, answer, { tree: { roles: nodes.map(() => "sorted") }, list: { vals: order.map((i) => nodes[i].val), next: [...next], roles: order.map(() => "sorted"), ptrs: { head: 0 } } }), tree: nodes };
    },
  },

  rightSiblingTree: {
    level: 4,
    example: ["6, 2, 9, 1, 4, 8, 12, 0, null, 3, 5, null, null, 10"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const d = depthsOf(nodes);
      const levels = 1 + Math.max(...d);
      // Each level left to right: the order the nodes were read in is level by level already.
      const byLevel = Array.from({ length: levels }, (_, k) => nodes.map((_, i) => i).filter((i) => d[i] === k));
      const sib: (number | null)[] = nodes.map(() => null);
      const frames: Frame[] = [];
      const chainRows = () =>
        byLevel.map((lv, k) =>
          row(
            fill(w.level, { d: k }),
            lv.map((i) => (sib[i] === null ? show(nodes[i].val) : `${show(nodes[i].val)} → ${showAt(nodes, sib[i]!)}`)),
            (j) => (sib[lv[j]] === null ? "plain" : "sorted"),
          ),
        );
      const set = (at: number, to: number, note: string) => {
        sib[at] = to;
        frames.push({ note, tree: { roles: nodes.map((_, i) => (i === at ? "key" : i === to ? "compare" : sib[i] !== null ? "sorted" : "plain")) }, rows: chainRows() });
      };
      // In order: the left subtree first (it still needs this node's right child), then this node, then the right.
      const mutate = (at: number, par: number, isLeft: boolean) => {
        if (at < 0) return;
        const { left, right } = nodes[at];
        mutate(left, at, true);
        const v = show(nodes[at].val);
        if (par < 0) set(at, -1, fill(w.root, { v }));
        else if (isLeft) {
          const to = nodes[par].right;
          set(at, to, to < 0 ? fill(w.leftNone, { v, p: show(nodes[par].val) }) : fill(w.left, { v, s: show(nodes[to].val) }));
        } else {
          const q = sib[par]!;
          const to = q < 0 ? -1 : nodes[q].left;
          set(at, to, q < 0 ? fill(w.rightEnd, { v, p: show(nodes[par].val) }) : fill(w.right, { v, p: show(nodes[par].val), q: show(nodes[q].val), s: showAt(nodes, to) }));
        }
        mutate(right, at, false);
      };
      mutate(0, -1, false);
      const text = byLevel.map((lv) => lv.map((i) => `${show(nodes[i].val)} → ${showAt(nodes, sib[i]!)}`).join(", ")).join("; ");
      return { ...done(frames, fill(w.answer, { list: text }), { tree: { roles: nodes.map(() => "sorted") } }), tree: nodes };
    },
  },

  allKindsOfNodeDepths: {
    level: 4,
    example: ["3, 8, 5, 1, null, 9, 2, 4, 6"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const frames: Frame[] = [];
      const count = nodes.map(() => 0);
      const sum = nodes.map(() => 0);
      const seen: number[] = [];
      let total = 0;
      const walk = (at: number) => {
        if (at < 0) return;
        const { left, right } = nodes[at];
        walk(left);
        walk(right);
        const [lc, rc] = [left < 0 ? 0 : count[left], right < 0 ? 0 : count[right]];
        const [ls, rs] = [left < 0 ? 0 : sum[left], right < 0 ? 0 : sum[right]];
        count[at] = 1 + lc + rc;
        // Seen from this node, every node below is one deeper than from its child.
        sum[at] = ls + lc + rs + rc;
        total += sum[at];
        seen.push(at);
        frames.push({
          note: fill(lc + rc ? w.node : w.leaf, { v: show(nodes[at].val), n: count[at], ls, lc, rs, rc, s: sum[at], t: total }),
          tree: { roles: nodes.map((_, i) => (i === at ? "key" : i === left || i === right ? "compare" : seen.includes(i) ? "sorted" : "plain")), tags: nodes.map((_, i) => (seen.includes(i) ? `Σ ${sum[i]}` : "")) },
          rows: [row(w.total, [total], () => "key")],
        });
      };
      walk(0);
      return { ...done(frames, fill(w.answer, { t: total })), tree: nodes };
    },
  },

  compareLeafTraversal: {
    level: 4,
    example: ["5, 3, 9, 1, 4, null, 2, null, null, 7, 6", "8, 1, 3, null, null, 7, 0, null, null, 6, 2"],
    solve: ([a, b], w, e) => {
      const one = tree(a, e, 12, 5);
      const two = tree(b, e, 12, 5);
      const frames: Frame[] = [];
      const S1 = [0];
      const S2 = [0];
      const seen1: number[] = [];
      const seen2: number[] = [];
      // Pop until a leaf turns up, pushing the right child before the left so the left comes out first.
      const nextLeaf = (nodes: TreeNode[], stack: number[]): number => {
        while (stack.length) {
          const at = stack.pop()!;
          const { left, right } = nodes[at];
          if (left < 0 && right < 0) return at;
          if (right >= 0) stack.push(right);
          if (left >= 0) stack.push(left);
        }
        return -1;
      };
      const picture = (x: number, y: number, ok: boolean): Omit<Frame, "note"> => ({
        tree: { roles: one.map((_, i) => (i === x ? (ok ? "key" : "min") : seen1.includes(i) ? "sorted" : "plain")) },
        graph: treeGraph(two, two.map((_, i) => (i === y ? (ok ? "key" : "min") : seen2.includes(i) ? "sorted" : "plain"))),
        rows: [row(w.stackOne, S1.map((i) => show(one[i].val))), row(w.stackTwo, S2.map((i) => show(two[i].val)))],
      });
      const leaves: number[] = [];
      for (;;) {
        const x = nextLeaf(one, S1);
        const y = nextLeaf(two, S2);
        if (x < 0 && y < 0) break;
        if (x < 0 || y < 0) {
          const rest = x < 0 ? show(two[y].val) : show(one[x].val);
          frames.push({ note: fill(x < 0 ? w.oneOut : w.twoOut, { v: rest }), ...picture(x, y, false) });
          return { ...done(frames, fill(w.noCount, { v: rest })), tree: one };
        }
        const same = one[x].val === two[y].val;
        frames.push({ note: fill(same ? w.same : w.differ, { a: show(one[x].val), b: show(two[y].val) }), ...picture(x, y, same) });
        if (!same) return { ...done(frames, fill(w.no, { a: show(one[x].val), b: show(two[y].val) })), tree: one };
        seen1.push(x);
        seen2.push(y);
        leaves.push(one[x].val);
      }
      return { ...done(frames, fill(w.yes, { list: listText(leaves) }), picture(-1, -1, true)), tree: one };
    },
  },
};
