// Interview problems on binary search trees (smaller values to the left, equal or bigger ones to the right, as
// AlgoExpert has it): each solver walks the tree the way the problem is meant to be solved (down one path, in order,
// with a range per node) and leaves a frame at every step; when the tree changes, each frame carries its own.
import { cells, depth, done, fill, int, listText, nums, row, show, tree, writeTree, type Frame, type ProblemSet, type Role, type TreeNode } from "./core";
import { bound, fits, inOrder, isBst, pack, type N } from "./trees";

function mustBst(nodes: readonly TreeNode[], msg: string) {
  if (!isBst(nodes)) throw new Error(msg);
}

/** A linked tree's values in order. */
const valsInOrder = (n: N | null): number[] => (n ? [...valsInOrder(n.left), n.val, ...valsInOrder(n.right)] : []);

/** Puts `n` into the BST under `root`, smaller to the left and the rest to the right; returns the nodes passed. */
function insert(root: N, n: N): N[] {
  const path: N[] = [];
  let at = root;
  for (;;) {
    path.push(at);
    const side = n.val < at.val ? "left" : "right";
    const next = at[side];
    if (!next) {
      at[side] = n;
      return path;
    }
    at = next;
  }
}

const OPS = ["insert", "remove", "contains"] as const;

export const BST: ProblemSet<"bst"> = {
  findClosestValueInBst: {
    level: 1,
    example: ["20, 9, 31, 4, 14, 25, 40, null, 7, 11, 17", "15"],
    solve: ([t, x], w, e) => {
      const nodes = tree(t, e);
      mustBst(nodes, w.notBst);
      const T = int(x, e, -999, 999);
      const frames: Frame[] = [];
      const path: number[] = [];
      let best = 0;
      let at = 0;
      const roles = (cur: number) => nodes.map((_, i): Role => (i === cur ? "compare" : i === best ? "sorted" : path.includes(i) ? "idle" : "plain"));
      while (at >= 0) {
        const v = nodes[at].val;
        if (Math.abs(v - T) < Math.abs(nodes[best].val - T)) best = at;
        const vars = { v: show(v), t: show(T), d: show(Math.abs(v - T)), b: show(nodes[best].val) };
        const rows = [row(w.closest, [show(nodes[best].val)], () => "sorted")];
        if (v === T) {
          frames.push({ note: fill(w.exact, vars), tree: { roles: roles(at) }, rows });
          break;
        }
        const next = T < v ? nodes[at].left : nodes[at].right;
        const note = fill(T < v ? w.left : w.right, vars);
        frames.push({ note: next < 0 ? `${note} ${w.end}` : note, tree: { roles: roles(at) }, rows });
        path.push(at);
        at = next;
      }
      const answer = fill(w.answer, { t: show(T), b: show(nodes[best].val) });
      return { ...done(frames, answer, { tree: { roles: nodes.map((_, i) => (i === best ? "sorted" : path.includes(i) || i === at ? "idle" : "plain")) } }), tree: nodes };
    },
  },

  bstConstruction: {
    level: 2,
    example: ["20, 11, 30, 6, 11, 26, 41, 28", "insert 24, remove 20, contains 28, remove 30, contains 30"],
    solve: ([a, b], w, e) => {
      const start = nums(a, e, { max: 15 });
      const ops = b.replace(/[−–—]/g, "-").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).map((s) => {
        const m = s.match(/^(\S+)\s+(-?[\d.]+)$/);
        const k = m ? OPS.findIndex((o, i) => o === m[1].toLowerCase() || w.ops[i] === m[1].toLowerCase()) : -1;
        if (!m || k < 0 || !Number.isFinite(Number(m[2]))) throw new Error(fill(w.badOp, { s }));
        return { op: OPS[k], x: Number(m[2]) };
      });
      if (!ops.length) throw new Error(e.empty);
      if (ops.length > 8) throw new Error(fill(e.tooMany, { n: 8 }));
      let id = 0;
      const make = (val: number): N => ({ val, left: null, right: null, id: id++ });
      let root = make(start[0]);
      for (const v of start.slice(1)) insert(root, make(v));
      fits(root, e);
      const frames: Frame[] = [];
      const snap = (note: string, role: (n: N) => Role = () => "plain") => {
        const p = pack(root, role);
        frames.push({ note, tree: { nodes: p.nodes, roles: p.roles }, rows: [row(w.inOrder, valsInOrder(root).map(show))] });
      };
      snap(fill(w.start, { list: listText(start) }));
      for (const { op, x } of ops) {
        const xs = show(x);
        if (op === "insert") {
          const n = make(x);
          const path = insert(root, n);
          fits(root, e);
          const p = path[path.length - 1];
          snap(fill(x < p.val ? w.insertLeft : w.insertRight, { x: xs, p: show(p.val) }), (m) => (m === n ? "key" : path.includes(m) ? "compare" : "plain"));
          continue;
        }
        // Down from the root to the first node holding x.
        const path: N[] = [];
        let parent: N | null = null;
        let at: N | null = root;
        while (at && at.val !== x) {
          path.push(at);
          parent = at;
          at = x < at.val ? at.left : at.right;
        }
        const found = at;
        if (op === "contains") {
          const walk = [...path, ...(found ? [found] : [])].map((n) => show(n.val)).join(" → ");
          snap(fill(found ? w.yes : w.no, { x: xs, path: walk }), (m) => (m === found ? "sorted" : path.includes(m) ? (found ? "compare" : "min") : "plain"));
        } else if (!found) snap(fill(w.removeNone, { x: xs }), (m) => (path.includes(m) ? "idle" : "plain"));
        else if (found.left && found.right) {
          // Two children: the smallest value on the right takes this node's place, and its own node goes.
          let sp: N = found;
          let s: N = found.right;
          while (s.left) [sp, s] = [s, s.left];
          snap(fill(w.removeTwo, { x: xs, s: show(s.val) }), (m) => (m === found ? "min" : m === s ? "pivot" : "plain"));
          found.val = s.val;
          if (sp === found) found.right = s.right;
          else sp.left = s.right;
          snap(fill(w.moved, { x: xs, s: show(s.val) }), (m) => (m === found ? "key" : "plain"));
        } else if (!found.left && !found.right && !parent) snap(fill(w.removeOnly, { x: xs }), (m) => (m === found ? "pivot" : "plain"));
        else {
          const child = found.left ?? found.right;
          snap(child ? fill(w.removeOne, { x: xs, c: show(child.val) }) : fill(w.removeLeaf, { x: xs }), (m) => (m === found ? "min" : m === child ? "compare" : "plain"));
          if (!parent) root = child!;
          else if (parent.left === found) parent.left = child;
          else parent.right = child;
          snap(fill(w.removed, { x: xs }), (m) => (m === child ? "key" : "plain"));
        }
      }
      const last = pack(root);
      return done(frames, fill(w.answer, { t: writeTree(last.nodes) }));
    },
  },

  validateBst: {
    level: 2,
    example: ["10, 5, 15, 2, 8, 11, 20, null, null, 6, 12"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const frames: Frame[] = [];
      const tags = nodes.map(() => "");
      const fine: number[] = [];
      let bad = -1;
      const walk = (at: number, lo: number, hi: number): boolean => {
        if (at < 0) return true;
        const v = nodes[at].val;
        tags[at] = `${bound(lo)}…${bound(hi)}`;
        const ok = v >= lo && v < hi;
        if (ok) fine.push(at);
        else bad = at;
        frames.push({
          note: fill(ok ? w.ok : w.bad, { v: show(v), lo: bound(lo), hi: bound(hi) }),
          tree: { roles: nodes.map((_, i) => (i === at ? (ok ? "key" : "min") : fine.includes(i) ? "sorted" : "plain")), tags: [...tags] },
        });
        return ok && walk(nodes[at].left, lo, v) && walk(nodes[at].right, v, hi);
      };
      const ok = walk(0, -Infinity, Infinity);
      return { ...done(frames, ok ? w.yes : fill(w.no, { v: show(nodes[bad].val) })), tree: nodes };
    },
  },

  bstTraversal: {
    level: 2,
    example: ["8, 4, 12, 2, 6, null, 14, null, 3"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      mustBst(nodes, w.notBst);
      const frames: Frame[] = [];
      const lists = { pre: [] as number[], in: [] as number[], post: [] as number[] };
      const open: number[] = [];
      const shut: number[] = [];
      const visit = (kind: "pre" | "in" | "post", at: number) => {
        lists[kind].push(nodes[at].val);
        const hot = (k: typeof kind) => (j: number) => (k === kind && j === lists[k].length - 1 ? "key" : "sorted") as Role;
        frames.push({
          note: fill(w[kind], { v: show(nodes[at].val) }),
          tree: { roles: nodes.map((_, i) => (i === at ? "key" : shut.includes(i) ? "sorted" : open.includes(i) ? "compare" : "plain")) },
          rows: [row(w.preOrder, lists.pre.map(show), hot("pre")), row(w.inOrder, lists.in.map(show), hot("in")), row(w.postOrder, lists.post.map(show), hot("post"))],
        });
      };
      const walk = (at: number) => {
        if (at < 0) return;
        open.push(at);
        visit("pre", at);
        walk(nodes[at].left);
        visit("in", at);
        walk(nodes[at].right);
        shut.push(at);
        visit("post", at);
      };
      walk(0);
      const answer = fill(w.answer, { a: listText(lists.in), b: listText(lists.pre), c: listText(lists.post) });
      return { ...done(frames, answer), tree: nodes };
    },
  },

  minHeightBst: {
    level: 2,
    example: ["3, 6, 8, 11, 17, 19, 24, 30, 35, 40"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 15 });
      if (xs.some((x, i) => i > 0 && x <= xs[i - 1])) throw new Error(w.notSorted);
      const frames: Frame[] = [];
      const top: { root: N | null } = { root: null };
      const placed = new Set<number>();
      // The middle value of each part goes in, then the part left of it and the part right of it, the same way.
      const build = (s: number, t: number, parent: N | null, side: "left" | "right") => {
        if (s > t) return;
        const m = Math.floor((s + t) / 2);
        const n: N = { val: xs[m], left: null, right: null, id: m };
        if (parent) parent[side] = n;
        else top.root = n;
        placed.add(m);
        const p = pack(top.root, (x) => (x === n ? "key" : "sorted"));
        const note = !parent ? w.root : side === "left" ? w.left : w.right;
        frames.push({
          note: fill(note, { a: show(xs[s]), b: show(xs[t]), v: show(xs[m]), p: parent ? show(parent.val) : "" }),
          cells: cells(xs, (i) => (i === m ? "key" : placed.has(i) ? "sorted" : i >= s && i <= t ? "plain" : "idle"), { mid: m }, [s, t]),
          tree: { nodes: p.nodes, roles: p.roles },
        });
        build(s, m - 1, n, "left");
        build(m + 1, t, n, "right");
      };
      build(0, xs.length - 1, null, "left");
      const last = pack(top.root);
      return done(frames, fill(w.answer, { t: writeTree(last.nodes), h: depth(last.nodes) }));
    },
  },

  findKthLargestValueInBst: {
    level: 2,
    example: ["12, 6, 19, 3, 9, 16, 25, 1, null, 7, 10", "5"],
    solve: ([t, kk], w, e) => {
      const nodes = tree(t, e);
      mustBst(nodes, w.notBst);
      const k = int(kk, e, 1, nodes.length);
      const frames: Frame[] = [];
      const seen: number[] = [];
      let found = -1;
      // Right side first, then the node, then the left side: the values come out largest first.
      const walk = (at: number) => {
        if (at < 0 || found >= 0) return;
        walk(nodes[at].right);
        if (found >= 0) return;
        seen.push(at);
        if (seen.length === k) found = at;
        frames.push({
          note: fill(found >= 0 ? w.stop : w.visit, { v: show(nodes[at].val), c: seen.length, k }),
          tree: { roles: nodes.map((_, i) => (i === at ? "key" : seen.includes(i) ? "sorted" : "plain")) },
          rows: [row(w.fromTop, seen.map((i) => show(nodes[i].val)), (j) => (j === seen.length - 1 ? "key" : "sorted"))],
        });
        walk(nodes[at].left);
      };
      walk(0);
      return { ...done(frames, fill(w.answer, { k, v: show(nodes[found].val) })), tree: nodes };
    },
  },

  reconstructBst: {
    level: 2,
    example: ["16, 9, 4, 12, 10, 14, 25, 20, 31, 28"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 15 });
      const frames: Frame[] = [];
      const top: { root: N | null } = { root: null };
      let idx = 0;
      const snap = (note: string, cur: N | null, i: number) => {
        const p = pack(top.root, (n) => (n === cur ? "key" : "sorted"));
        frames.push({ note, cells: cells(xs, (j) => (j === i ? (cur ? "key" : "compare") : j < idx ? "sorted" : "plain"), { i }), tree: { nodes: p.nodes, roles: p.roles } });
      };
      // The next value belongs here only if it fits this place's range; otherwise the place stays empty.
      const build = (lo: number, hi: number, parent: N | null, side: "left" | "right") => {
        if (idx === xs.length) return;
        const v = xs[idx];
        const vars = { v: show(v), lo: bound(lo), hi: bound(hi), p: parent ? show(parent.val) : "" };
        if (v < lo || v >= hi) {
          snap(fill(side === "left" ? w.noLeft : w.noRight, vars), null, idx);
          return;
        }
        const n: N = { val: v, left: null, right: null, id: idx };
        if (parent) parent[side] = n;
        else top.root = n;
        idx++;
        snap(fill(!parent ? w.root : side === "left" ? w.left : w.right, vars), n, idx - 1);
        build(lo, v, n, "left");
        build(v, hi, n, "right");
      };
      build(-Infinity, Infinity, null, "left");
      if (idx < xs.length) throw new Error(fill(w.notPre, { v: show(xs[idx]) }));
      fits(top.root, e);
      const last = pack(top.root);
      return done(frames, fill(w.answer, { t: writeTree(last.nodes) }), { tree: { nodes: last.nodes, roles: last.roles.map(() => "sorted") } });
    },
  },

  sameBsts: {
    level: 3,
    example: ["7, 3, 11, 9, 1, 5, 13, 4", "7, 11, 13, 3, 9, 5, 1, 4"],
    solve: ([a, b], w, e) => {
      const A = nums(a, e, { max: 12 });
      const B = nums(b, e, { max: 12 });
      const frames: Frame[] = [];
      const smaller = (xs: number[], i: number, lo: number) => xs.findIndex((x, j) => j > i && x < xs[i] && x >= lo);
      const bigger = (xs: number[], i: number, hi: number) => xs.findIndex((x, j) => j > i && x >= xs[i] && x < hi);
      // The root of this part in each array, and (lighter) the values that will hang below it.
      const roles = (xs: number[], i: number, lo: number, hi: number, bad: boolean) => (j: number): Role =>
        j === i ? (bad ? "min" : "key") : i >= 0 && j > i && xs[j] >= lo && xs[j] < hi ? "compare" : "idle";
      const snap = (note: string, i: number, j: number, lo: number, hi: number, bad = false) =>
        frames.push({ note, rows: [row(w.first, A.map(show), roles(A, i, lo, hi, bad)), row(w.second, B.map(show), roles(B, j, lo, hi, bad))] });
      const same = (i: number, j: number, lo: number, hi: number): boolean => {
        const range = { lo: bound(lo), hi: bound(hi) };
        if (i < 0 || j < 0) {
          if (i === j) return true;
          snap(fill(w.oneEmpty, { ...range, v: show(i < 0 ? B[j] : A[i]) }), i, j, lo, hi, true);
          return false;
        }
        if (A[i] !== B[j]) {
          snap(fill(w.diffRoot, { ...range, a: show(A[i]), b: show(B[j]) }), i, j, lo, hi, true);
          return false;
        }
        const v = A[i];
        snap(fill(w.roots, { ...range, v: show(v) }), i, j, lo, hi);
        return same(smaller(A, i, lo), smaller(B, j, lo), lo, v) && same(bigger(A, i, hi), bigger(B, j, hi), v, hi);
      };
      const yes = same(0, 0, -Infinity, Infinity);
      return done(frames, yes ? w.yes : w.no);
    },
  },

  validateThreeNodes: {
    level: 3,
    example: ["20, 10, 30, 5, 15, 25, 35, 2, 7, 12, 18", "12, 10, 20"],
    solve: ([t, v], w, e) => {
      const nodes = tree(t, e);
      mustBst(nodes, w.notBst);
      const vals = nums(v, e, { least: 3, max: 3 });
      if (new Set(vals).size < 3) throw new Error(w.distinct);
      const findNode = (x: number) => {
        let at = 0;
        while (at >= 0 && nodes[at].val !== x) at = x < nodes[at].val ? nodes[at].left : nodes[at].right;
        if (at < 0) throw new Error(fill(w.missing, { v: show(x) }));
        return at;
      };
      const [one, two, three] = vals.map(findNode);
      const tags = nodes.map((_, i) => (i === one ? w.one : i === two ? w.two : i === three ? w.three : ""));
      const shown = (i: number) => (i < 0 ? "∅" : show(nodes[i].val));
      const T = nodes[two].val;
      const frames: Frame[] = [];
      const passed = new Set<number>();
      const snap = (note: string, hot: number[], reached = -1) =>
        frames.push({ note, tree: { roles: nodes.map((_, i) => (i === reached ? "sorted" : hot.includes(i) ? "compare" : i === two ? "key" : passed.has(i) ? "idle" : "plain")), tags } });
      const names = { a: show(vals[0]), t: show(T), b: show(vals[2]) };
      snap(fill(w.start, names), [one, three]);
      // Search for two from one and from three at the same time, a step each.
      let [s1, s2] = [one, three];
      while (!(s1 === three || s2 === one || s1 === two || s2 === two || (s1 < 0 && s2 < 0))) {
        passed.add(s1).add(s2);
        if (s1 >= 0) s1 = nodes[s1].val > T ? nodes[s1].left : nodes[s1].right;
        if (s2 >= 0) s2 = nodes[s2].val > T ? nodes[s2].left : nodes[s2].right;
        snap(fill(w.step, { ...names, x: shown(s1), y: shown(s2) }), [s1, s2]);
      }
      if (s1 === three || s2 === one) {
        const [from, met] = s1 === three ? [vals[0], vals[2]] : [vals[2], vals[0]];
        return { ...done(frames, fill(w.noOther, { a: show(from), b: show(met), t: show(T) })), tree: nodes };
      }
      if (s1 !== two && s2 !== two) return { ...done(frames, fill(w.noTwo, names)), tree: nodes };
      const [from, target] = s1 === two ? [one, three] : [three, one];
      snap(fill(w.found, { a: show(nodes[from].val), t: show(T), b: show(nodes[target].val) }), [], two);
      let at = two;
      while (at >= 0 && at !== target) {
        passed.add(at);
        at = nodes[target].val < nodes[at].val ? nodes[at].left : nodes[at].right;
        snap(fill(w.down, { b: show(nodes[target].val), x: shown(at) }), [at], two);
      }
      const answer = at === target ? fill(w.yes, { a: show(nodes[from].val), t: show(T), b: show(nodes[target].val) }) : fill(w.no, { t: show(T), b: show(nodes[target].val) });
      return { ...done(frames, answer), tree: nodes };
    },
  },

  repairBst: {
    level: 3,
    example: ["10, 14, 15, 2, 7, 13, 22, 1, null, 6, null, null, 5"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const frames: Frame[] = [];
      const visited: number[] = [];
      const stack: number[] = [];
      let [cur, prev, a, b] = [0, -1, -1, -1];
      const wrong = (i: number) => i === a || i === b;
      // In order, a value smaller than the one before it gives away a swapped pair.
      while (cur >= 0 || stack.length) {
        while (cur >= 0) {
          stack.push(cur);
          cur = nodes[cur].left;
        }
        cur = stack.pop()!;
        let note = prev < 0 ? w.first : w.fine;
        if (prev >= 0 && nodes[prev].val > nodes[cur].val) {
          if (a < 0) [a, b, note] = [prev, cur, w.outOne];
          else [b, note] = [cur, w.outTwo];
        }
        visited.push(cur);
        frames.push({
          note: fill(note, { p: prev < 0 ? "" : show(nodes[prev].val), v: show(nodes[cur].val) }),
          tree: { roles: nodes.map((_, i) => (wrong(i) ? "min" : i === cur ? "key" : i === prev ? "compare" : visited.includes(i) ? "sorted" : "plain")) },
          rows: [row(w.order, visited.map((i) => show(nodes[i].val)), (j) => (wrong(visited[j]) ? "min" : "sorted")), row(w.stack, stack.map((i) => show(nodes[i].val)))],
        });
        prev = cur;
        cur = nodes[cur].right;
      }
      if (a < 0) throw new Error(w.already);
      const fixed = nodes.map((n) => ({ ...n }));
      [fixed[a].val, fixed[b].val] = [nodes[b].val, nodes[a].val];
      if (!isBst(fixed)) throw new Error(w.notTwo);
      const names = { a: show(nodes[a].val), b: show(nodes[b].val) };
      frames.push({
        note: fill(w.swap, names),
        tree: { nodes: fixed, roles: fixed.map((_, i) => (wrong(i) ? "key" : "sorted")) },
        rows: [row(w.order, inOrder(fixed).map((i) => show(fixed[i].val)), () => "sorted"), row(w.stack, [])],
      });
      return { ...done(frames, fill(w.answer, { ...names, t: writeTree(fixed) })), tree: nodes };
    },
  },

  sumBsts: {
    level: 3,
    example: ["8, 5, 15, 2, 6, 11, 20, 1, 3, 4, 7, 10, 12"],
    solve: ([t], w, e) => {
      const nodes = tree(t, e);
      const frames: Frame[] = [];
      const tags = nodes.map(() => "");
      const inBst = nodes.map(() => false);
      const counted = new Set<number>();
      const below = (at: number): number[] => (at < 0 ? [] : [at, ...below(nodes[at].left), ...below(nodes[at].right)]);
      type Info = { bst: boolean; size: number; lo: number; hi: number; total: number };
      const info = (at: number): Info => {
        if (at < 0) return { bst: true, size: 0, lo: Infinity, hi: -Infinity, total: 0 };
        const { left, right, val } = nodes[at];
        const [L, R] = [info(left), info(right)];
        // Everything on the left below the value, everything on the right at least the value, both sides BSTs.
        const bst = L.bst && R.bst && val > L.hi && val <= R.lo;
        const size = bst ? 1 + L.size + R.size : 0;
        const total = size >= 3 ? size : L.total + R.total;
        inBst[at] = bst;
        tags[at] = bst ? String(size) : "✗";
        if (size >= 3) for (const i of below(at)) counted.add(i);
        const note = !bst ? w.not : size >= 3 ? w.big : w.small;
        frames.push({
          note: fill(note, { v: show(val), s: size, t: total }),
          tree: { roles: nodes.map((_, i) => (i === at ? (bst ? "key" : "min") : counted.has(i) ? "sorted" : tags[i] === "✗" ? "idle" : "plain")), tags: [...tags] },
          rows: [row(w.total, [total], () => "key")],
        });
        return { bst, size, lo: Math.min(val, L.lo, R.lo), hi: Math.max(val, L.hi, R.hi), total };
      };
      const { total } = info(0);
      const keep = new Set<number>();
      // Only the largest BSTs count: a node is coloured if no BST of 3 or more above it already is.
      const mark = (at: number) => {
        if (at < 0) return;
        if (inBst[at] && below(at).length >= 3) {
          for (const i of below(at)) keep.add(i);
          return;
        }
        mark(nodes[at].left);
        mark(nodes[at].right);
      };
      mark(0);
      return { ...done(frames, fill(w.answer, { t: total }), { tree: { roles: nodes.map((_, i) => (keep.has(i) ? "sorted" : "idle")), tags } }), tree: nodes };
    },
  },

  rightSmallerThan: {
    level: 4,
    example: ["6, 9, 2, -4, 7, 3, 5"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 12 });
      const frames: Frame[] = [];
      const counts: (number | string)[] = xs.map(() => "");
      const leftSize = new Map<N, number>();
      let root: N | null = null;
      for (let i = xs.length - 1; i >= 0; i--) {
        const n: N = { val: xs[i], left: null, right: null, id: i };
        leftSize.set(n, 0);
        const role = new Map<N, Role>([[n, "key"]]);
        let c = 0;
        let turned = false;
        if (!root) root = n;
        else {
          // Going left, the node gets one more on its left; going right, it and its left side are all smaller.
          let at: N = root;
          for (;;) {
            if (xs[i] < at.val) {
              leftSize.set(at, leftSize.get(at)! + 1);
              role.set(at, "compare");
              if (!at.left) {
                at.left = n;
                break;
              }
              at = at.left;
            } else {
              c += leftSize.get(at)! + (xs[i] > at.val ? 1 : 0);
              turned = true;
              role.set(at, "sorted");
              if (!at.right) {
                at.right = n;
                break;
              }
              at = at.right;
            }
          }
        }
        fits(root, e, 12, 5);
        counts[i] = c;
        const p = pack(root, (m) => role.get(m) ?? "plain", (m) => `↙${leftSize.get(m)}`);
        const note = i === xs.length - 1 ? w.first : turned ? w.turn : w.noTurn;
        frames.push({
          note: fill(note, { v: show(xs[i]), c }),
          cells: cells(xs, (j) => (j === i ? "key" : j > i ? "sorted" : "plain"), { i }),
          tree: { nodes: p.nodes, roles: p.roles, tags: p.tags },
          rows: [row(w.counts, counts, (j) => (j === i ? "key" : j > i ? "sorted" : "idle"))],
        });
      }
      return done(frames, fill(w.answer, { list: listText(counts) }));
    },
  },
};

