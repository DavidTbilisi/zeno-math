// Be the tree: the player is the computer working a binary search tree, one operation at a time. Insert and search
// walk down from the root: x moves to the left child when it is smaller than the node, to the right when bigger, and at
// the end it drops into the empty place it belongs (insert), or onto the node holding it, or into an empty place when
// it isn't there (search, which then gives None). The traversals keep an explicit stack: inorder pushes cur and goes
// left until cur is None, then pops the top into out[] and goes right; preorder pops the top into out[] and pushes its
// right child, then its left. Each operation the player makes is checked against the code; a wrong one is not made and
// says the rule it broke. Kept free of React: the board keeps only the operations made so far, and the machine is the
// replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type TreeAlgo = "insert" | "search" | "inorder" | "preorder";
export const TREE_ALGOS: readonly TreeAlgo[] = ["insert", "search", "inorder", "preorder"];
export type TreeLevel = 1 | 2 | 3;
/** The values inserted in turn to build the tree, and the values to insert or look for (none for the traversals). */
export type TreeTask = { algo: TreeAlgo; a: number[]; q: number[] };

export type TreeNotice = "leaf" | "miss" | "sorted" | "rebuild" | "streak10";
export const TREE_NOTICES: TreeNotice[] = ["leaf", "miss", "sorted", "rebuild", "streak10"];

/** A node: its value and its children (indexes into nodes, −1 for none). */
export type TreeNode = { v: number; l: number; r: number };

/** A line of the step log, as code. */
export type TreeLog =
  | { op: "start" }
  | { op: "down"; x: number; v: number; side: "left" | "right"; to: number }
  | { op: "place"; x: number; v: number; side: "left" | "right" }
  | { op: "found"; x: number }
  | { op: "miss"; x: number }
  | { op: "push"; v: number; stack: number[] }
  | { op: "pop"; v: number; out: number[] };

/**
 * The machine's memory after some operations: the nodes and the root, which value of q is being
 * worked (qi) and the node it has reached (cur; for inorder, the code's cur, −1 for None), what each search returned,
 * the stack (node indexes, the top last), out[], the children preorder still has to push, the lines the last operation
 * ran, the log, and what the run has shown.
 */
export type TreeMachine = {
  task: TreeTask;
  nodes: TreeNode[];
  root: number;
  qi: number;
  cur: number;
  res: (number | null)[];
  stack: number[];
  out: number[];
  pend: number[];
  lines: number[];
  log: TreeLog[];
  seen: TreeNotice[];
};

/** The tree inserting the values in turn builds. */
export function build(a: number[]): { nodes: TreeNode[]; root: number } {
  const nodes: TreeNode[] = [];
  let root = -1;
  for (const v of a) {
    nodes.push({ v, l: -1, r: -1 });
    const i = nodes.length - 1;
    if (root < 0) {
      root = i;
      continue;
    }
    for (let c = root; ; ) {
      const side = v < nodes[c].v ? "l" : "r";
      if (nodes[c][side] < 0) {
        nodes[c][side] = i;
        break;
      }
      c = nodes[c][side];
    }
  }
  return { nodes, root };
}

export function startMachine(task: TreeTask): TreeMachine {
  const { nodes, root } = build(task.a);
  const walks = task.algo === "insert" || task.algo === "search";
  return {
    task, nodes, root, qi: 0, cur: task.algo === "preorder" ? -1 : root, res: [], out: [], pend: [],
    stack: task.algo === "preorder" && root >= 0 ? [root] : [], lines: walks ? [0, 1] : [0], log: [{ op: "start" }], seen: [],
  };
}

/** The value being inserted or looked for, or null when the walks are done. */
export const xOf = (m: TreeMachine) => (m.qi < m.task.q.length ? m.task.q[m.qi] : null);
/** The child of cur that x goes to, and which side. */
export function step(m: TreeMachine): { side: "l" | "r"; to: number } {
  const n = m.nodes[m.cur];
  const side = xOf(m)! < n.v ? "l" : "r";
  return { side, to: n[side] };
}

/** The operations, by code: x one step down, x into an empty place (insert), x is here, x isn't in the tree, push, pop. */
export const OPS = ["down", "place", "found", "miss", "push", "pop"] as const;
export type TreeOp = (typeof OPS)[number];

/** What the code does next; null when it is done. */
export function expect(m: TreeMachine): TreeOp | null {
  const { algo } = m.task;
  if (algo === "insert" || algo === "search") {
    const x = xOf(m);
    if (x === null) return null;
    if (algo === "search" && m.nodes[m.cur].v === x) return "found";
    return step(m).to >= 0 ? "down" : algo === "insert" ? "place" : "miss";
  }
  if (algo === "inorder") return m.cur >= 0 ? "push" : m.stack.length ? "pop" : null;
  return m.pend.length ? "push" : m.stack.length ? "pop" : null;
}

const LINE: Record<TreeAlgo, Partial<Record<TreeOp, number[]>>> = {
  insert: { down: [3, 5], place: [3, 4] },
  search: { down: [2, 3], found: [2, 4], miss: [3, 4] },
  inorder: { push: [2, 3], pop: [4, 5] },
  preorder: { pop: [1, 2], push: [3] },
};

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: TreeMachine, code: number): TreeMachine {
  const m: TreeMachine = { ...m0, nodes: m0.nodes.map((n) => ({ ...n })), res: [...m0.res], stack: [...m0.stack], out: [...m0.out], pend: [...m0.pend], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: TreeNotice) => m.seen.includes(k) || m.seen.push(k);
  const op = OPS[code];
  const { algo } = m.task;
  m.lines = LINE[algo][op]!;
  const x = xOf(m)!;
  const nextQ = () => {
    m.qi++;
    m.cur = m.root;
  };
  if (op === "down") {
    const { side, to } = step(m);
    m.log.push({ op: "down", x, v: m.nodes[m.cur].v, side: side === "l" ? "left" : "right", to: m.nodes[to].v });
    m.cur = to;
  } else if (op === "place") {
    m.nodes.push({ v: x, l: -1, r: -1 });
    const { side } = step(m);
    m.nodes[m.cur][side] = m.nodes.length - 1;
    m.log.push({ op: "place", x, v: m.nodes[m.cur].v, side: side === "l" ? "left" : "right" });
    nextQ();
  } else if (op === "found" || op === "miss") {
    m.res.push(op === "found" ? x : null);
    m.log.push({ op, x });
    if (op === "miss") see("miss");
    nextQ();
  } else if (op === "push") {
    const v = algo === "inorder" ? m.cur : m.pend.shift()!;
    m.stack.push(v);
    if (algo === "inorder") m.cur = m.nodes[v].l;
    else m.lines = v === m.nodes[m.out[m.out.length - 1]].r ? [3] : [4];
    m.log.push({ op: "push", v: m.nodes[v].v, stack: m.stack.map((i) => m.nodes[i].v) });
  } else {
    const v = m.stack.pop()!;
    m.out.push(v);
    if (algo === "inorder") m.cur = m.nodes[v].r;
    else m.pend = [m.nodes[v].r, m.nodes[v].l].filter((c) => c >= 0);
    m.log.push({ op: "pop", v: m.nodes[v].v, out: m.out.map((i) => m.nodes[i].v) });
  }
  if (expect(m) === null) {
    if (algo === "insert") see("leaf");
    if (algo === "inorder") see("sorted");
    if (algo === "preorder") see("rebuild");
  }
  return m;
}

export function treeRun(task: TreeTask): { ops: number[]; end: TreeMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: TreeTask, ops: number[]): TreeMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/**
 * What the player tried: x dropped onto node `node` or into the empty place on `side` of cur, a node pushed onto the
 * stack, the stack's top popped into out[], a node dragged straight into out[].
 */
export type TreeAttempt =
  | { kind: "drop"; node: number }
  | { kind: "slot"; side: "l" | "r" }
  | { kind: "push"; node: number }
  | { kind: "pop" }
  | { kind: "out"; node: number };
export type TreeWhy =
  | "goLeft" | "goRight" | "oneStep" | "here" | "pushCur" | "leftFirst" | "popTop" | "pushChildren" | "rightFirst"
  | "pushChild" | "viaStack";
export type TreeCheck = { ok: true; code: number } | { ok: false; why: TreeWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: TreeMachine, at: TreeAttempt): TreeCheck {
  const e = expect(m);
  const no = (why: TreeWhy, vars: Record<string, string | number> = {}): TreeCheck => ({ ok: false, why, vars });
  const ok = (op: TreeOp): TreeCheck => ({ ok: true, code: OPS.indexOf(op) });
  const { algo } = m.task;
  const val = (i: number) => m.nodes[i].v;
  if (algo === "insert" || algo === "search") {
    const x = xOf(m)!;
    const v = val(m.cur);
    if (e === "found") return at.kind === "drop" && at.node === m.cur ? ok("found") : no("here", { x });
    const { side, to } = step(m);
    if (at.kind === "drop" && at.node === to) return ok("down");
    if (at.kind === "slot" && at.side === side && to < 0) return ok(e!);
    const wrongWay = (at.kind === "drop" && at.node === m.nodes[m.cur][side === "l" ? "r" : "l"]) || at.kind === "slot" || (at.kind === "drop" && at.node === m.cur);
    if (!wrongWay && at.kind === "drop") return no("oneStep", { v });
    return no(side === "l" ? "goLeft" : "goRight", { x, v });
  }
  const top = m.stack.length ? val(m.stack[m.stack.length - 1]) : 0;
  if (at.kind === "out") return no("viaStack", { v: val(at.node) });
  if (at.kind === "pop") {
    if (e === "pop") return ok("pop");
    return algo === "inorder" ? no("leftFirst", { v: val(m.cur) }) : no("pushChildren", { v: val(m.out[m.out.length - 1]) });
  }
  if (at.kind !== "push") return no("viaStack", { v: 0 });
  if (e !== "push") return no("popTop", { t: top });
  if (algo === "inorder") return at.node === m.cur ? ok("push") : no("pushCur", { v: val(m.cur) });
  if (at.node === m.pend[0]) return ok("push");
  const done = m.out[m.out.length - 1];
  if (at.node === m.pend[1]) return no("rightFirst", { r: val(m.pend[0]), l: val(m.pend[1]) });
  return no("pushChild", { v: val(done) });
}

// ---------- the tasks ----------

type Spec = { algo: TreeAlgo | null; n: number; q?: number; need?: TreeNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));
/** n different numbers from 1 to 59, in a random order. */
function values(n: number, next: () => number): number[] {
  const xs: number[] = [];
  while (xs.length < n) {
    const v = int(1, 59, next);
    if (!xs.includes(v)) xs.push(v);
  }
  return xs;
}
/** How many levels the tree has. */
export function height(nodes: TreeNode[], i: number): number {
  return i < 0 ? 0 : 1 + Math.max(height(nodes, nodes[i].l), height(nodes, nodes[i].r));
}

/**
 * A task worth playing: a tree of three to five levels with both left and right children somewhere; inserts and
 * searches that walk at least two steps for most values, a search that finds one and misses one.
 */
export function treeTask(spec: Spec, next: () => number): TreeTask {
  const algo = spec.algo ?? pick(TREE_ALGOS, next);
  for (;;) {
    const walks = algo === "insert" || algo === "search";
    const nq = walks ? (spec.q ?? 3) : 0;
    const xs = values(spec.n + nq, next);
    const a = xs.slice(0, spec.n);
    const q = algo === "search" ? [...xs.slice(spec.n, spec.n + 1), ...a.slice(1).filter(() => next() < 0.5).slice(0, nq - 1)] : xs.slice(spec.n);
    if (q.length < nq) continue;
    const t: TreeTask = { algo, a, q: algo === "search" ? q.sort(() => next() - 0.5) : q };
    const { nodes, root } = build(algo === "insert" ? [...a, ...q] : a);
    const h = height(nodes, root);
    if (h < 3 || h > 5 || !nodes.some((n) => n.l >= 0) || !nodes.some((n) => n.r >= 0)) continue;
    const { ops, end } = treeRun(t);
    if (walks && ops.filter((c) => OPS[c] === "down").length < 2 * nq) continue;
    if (algo === "search" && !end.res.some((r) => r !== null)) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const TREE_LADDER: (Spec & { seed: number })[] = [
  { algo: "insert", n: 3, q: 3, seed: 2901 },
  { algo: "search", n: 6, q: 3, seed: 2902 },
  { algo: "inorder", n: 5, seed: 2903 },
  { algo: "preorder", n: 5, seed: 2904 },
  { algo: "insert", n: 5, q: 4, seed: 2905 },
  { algo: "search", n: 8, q: 4, seed: 2906 },
  { algo: "inorder", n: 7, seed: 2907 },
  { algo: "preorder", n: 7, seed: 2908 },
  { algo: "inorder", n: 9, seed: 2909 },
];
/** The endless run: easy, an insert or a search in a small tree; medium, any of the four on six; hard, on eight or nine. */
export function levelSpec(level: TreeLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["insert", "search"] as const, next), n: int(4, 5, next), q: 3 };
  return { algo: pick(TREE_ALGOS, next), n: level === 2 ? 6 : int(8, 9, next), q: level === 2 ? 3 : 4 };
}

export const treeStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function treeNotice(m: TreeMachine, misses: number, streak: number): TreeNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (TREE_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeTree = EndlessGame<TreeNotice, TreeLevel, { kind: "wrong"; why: TreeWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function treeNow(d: Pick<LiveBeTree, "mode" | "stage" | "level" | "seed">): TreeTask {
  if (d.mode === "puzzle") {
    const s = TREE_LADDER[d.stage];
    return treeTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return treeTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<TreeAlgo, string[]> = {
  insert: ["for x in q:", "  cur = root", "  while True:", "    side = left if x < cur.val else right", "    if cur.side is None: cur.side = Node(x); break", "    cur = cur.side"],
  search: ["for x in q:", "  cur = root", "  while cur and cur.val != x:", "    cur = cur.left if x < cur.val else cur.right", "  res.append(cur.val if cur else None)"],
  inorder: ["out = []; stack = []; cur = root", "while cur or stack:", "  while cur:", "    stack.append(cur); cur = cur.left", "  cur = stack.pop(); out.append(cur.val)", "  cur = cur.right"],
  preorder: ["out = []; stack = [root]", "while stack:", "  node = stack.pop(); out.append(node.val)", "  if node.right: stack.append(node.right)", "  if node.left: stack.append(node.left)"],
};

export function logText(l: TreeLog, t: TreeTask): string {
  switch (l.op) {
    case "start":
      return CODE[t.algo][0];
    case "down":
      return `${l.x} ${l.side === "left" ? "<" : ">"} ${l.v}: cur = cur.${l.side} = ${l.to}`;
    case "place":
      return `${l.x} ${l.side === "left" ? "<" : ">"} ${l.v}: ${l.v}.${l.side} = Node(${l.x})`;
    case "found":
      return `${l.x} found: res.append(${l.x})`;
    case "miss":
      return `${l.x} isn't there: res.append(None)`;
    case "push":
      return `stack.append(${l.v}) → [${l.stack.join(", ")}]`;
    case "pop":
      return `stack.pop() = ${l.v}; out = [${l.out.join(", ")}]`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a node (n), an empty place under cur (sl, sr), x, the stack, its top, out. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type TreePic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const CELL = 38;
const STEP = 44;
const LEFT = 76;
const R = 18;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/** The depth of each node, by index. */
function depths(m: TreeMachine): number[] {
  const d: number[] = [];
  const walk = (i: number, at: number) => {
    if (i < 0) return;
    d[i] = at;
    walk(m.nodes[i].l, at + 1);
    walk(m.nodes[i].r, at + 1);
  };
  walk(m.root, 0);
  return d;
}

/**
 * The machine drawn as a computer keeps it: q[] with x framed (insert, search) and res[] (search), the tree laid out
 * by order (each node above its place in the sorted values, so it never moves) with cur ringed orange and the empty
 * places under it dashed, and for the traversals the stack (top up) and out[]. `hot` lights the spot a drag is over and
 * `sel` the one picked up.
 */
export function treeSvg(m: TreeMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): TreePic {
  const t = m.task;
  const { algo, q } = t;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const walks = algo === "insert" || algo === "search";
  const col = (x: number) => LEFT + x * STEP;
  const x = xOf(m);

  let y = 16;
  if (walks) {
    // q[] with the value being worked framed, and what each search gave.
    const cy = y + 16;
    parts.push(tx(LEFT - 12, cy + 25, "q[]", { size: 14, anchor: "end", bold: true, mono: true }));
    q.forEach((v, i) => {
      const now = i === m.qi && live;
      parts.push(tx(col(i) + CELL / 2, y + 8, String(i), { size: 11, color: MUTED, mono: true }));
      parts.push(box(col(i), cy, CELL, CELL, now ? glow("x", "#fff4e6") : i < m.qi ? "#f1f3f5" : "#fff", now ? ORANGE : i < m.qi ? "#dee2e6" : "#868e96", false, now ? 2.4 : 1.6));
      parts.push(tx(col(i) + CELL / 2, cy + 25, String(v), { size: 16, bold: true, color: i < m.qi ? "#adb5bd" : INK }));
      if (now) spots.push({ id: "x", x: col(i), y: cy, w: CELL, h: CELL, from: true, to: false, label: `x = ${v}` });
    });
    if (x !== null && live) parts.push(tx(col(q.length) + 8, cy + 25, `x = ${x}`, { size: 14, anchor: "start", mono: true, bold: true, color: ORANGE }));
    y = cy + CELL + 8;
    if (algo === "search") {
      parts.push(tx(LEFT - 12, y + 25, "res[]", { size: 14, anchor: "end", bold: true, mono: true }));
      m.res.forEach((r, i) => {
        parts.push(box(col(i), y, CELL, CELL, r === null ? "#f8f9fa" : "#d3f9d8", r === null ? "#adb5bd" : GREEN));
        parts.push(tx(col(i) + CELL / 2, y + 24, r === null ? "None" : String(r), { size: r === null ? 11 : 16, bold: true, mono: r === null, color: r === null ? MUTED : INK }));
      });
      for (let i = m.res.length; i < q.length; i++) parts.push(box(col(i), y, CELL, CELL, "#fff", "#dee2e6", true));
      y += CELL + 8;
    }
  }

  // The tree: each node above its place among the sorted values.
  const all = [...(algo === "insert" ? [...t.a, ...q] : t.a)].sort((p, r) => p - r);
  const d = depths(m);
  const top = y + R + 18;
  const at = (i: number): [number, number] => [col(all.indexOf(m.nodes[i].v)) + CELL / 2, top + d[i] * 56];
  const levels = height(m.nodes, m.root) + (walks ? 1 : 0);
  m.nodes.forEach((n, i) => {
    if (d[i] === undefined) return;
    for (const c of [n.l, n.r]) if (c >= 0) parts.push(`<line x1="${at(i)[0]}" y1="${at(i)[1]}" x2="${at(c)[0]}" y2="${at(c)[1]}" stroke="#adb5bd" stroke-width="2"/>`);
  });
  if (walks && live) {
    // The empty places under cur, where x drops in (insert) or falls out (search).
    const n = m.nodes[m.cur];
    const [cx, cy] = at(m.cur);
    for (const side of ["l", "r"] as const) {
      if (n[side] >= 0) continue;
      const sx = algo === "insert" && x !== null && (x < n.v) === (side === "l") ? col(all.indexOf(x)) + CELL / 2 : cx + (side === "l" ? -22 : 22);
      const id = `s${side}`;
      parts.push(`<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${cy + 56}" stroke="#dee2e6" stroke-width="2" stroke-dasharray="4 3"/>`);
      parts.push(`<circle cx="${sx}" cy="${cy + 56}" r="${R - 4}" fill="${glow(id, "#fff")}" stroke="${lit(id) ? ORANGE : "#adb5bd"}" stroke-width="1.8" stroke-dasharray="4 3"/>`);
      spots.push({ id, x: sx - R, y: cy + 56 - R, w: 2 * R, h: 2 * R, from: false, to: true, label: `empty, ${side === "l" ? "left" : "right"} of ${n.v}` });
    }
  }
  const visited = new Set(m.out);
  const onStack = new Set(m.stack);
  m.nodes.forEach((n, i) => {
    if (d[i] === undefined) return;
    const [nx, ny] = at(i);
    const id = `n${i}`;
    const isCur = i === m.cur && live && algo !== "preorder";
    const fill = visited.has(i) ? "#d3f9d8" : onStack.has(i) ? "#f3f0ff" : isCur ? "#fff4e6" : "#e7f5ff";
    const stroke = lit(id) ? ORANGE : isCur ? ORANGE : visited.has(i) ? GREEN : BLUE;
    parts.push(`<circle cx="${nx}" cy="${ny}" r="${R}" fill="${glow(id, fill)}" stroke="${stroke}" stroke-width="${isCur || lit(id) ? 2.8 : 1.8}"/>`);
    parts.push(tx(nx, ny + 5, String(n.v), { size: 15, bold: true }));
    if (isCur) parts.push(tx(nx - R - 2, ny - R + 2, "cur", { size: 11, anchor: "end", mono: true, bold: true, color: ORANGE }));
    spots.push({ id, x: nx - R, y: ny - R, w: 2 * R, h: 2 * R, from: live && !walks, to: live && walks, label: `node ${n.v}` });
  });
  y = top + (levels - 1) * 56 + R + 18;
  let w = col(all.length) + 40;
  if (algo === "inorder" && live) parts.push(tx(col(all.length) + 4, top + 5, m.cur < 0 ? "cur = None" : `cur = ${m.nodes[m.cur].v}`, { size: 13, anchor: "start", mono: true, bold: true, color: ORANGE }));
  if (algo === "inorder") w += 110;

  if (!walks) {
    // The stack, its top up, beside the tree; out[] below it.
    const sx = w;
    const n = t.a.length;
    const sh = Math.max(n, 3) * 34 + 12;
    parts.push(tx(sx + 30, 26, "stack", { size: 14, bold: true, mono: true, color: MUTED }));
    parts.push(box(sx, 36, 60, sh, glow("stack", "#fff"), lit("stack") ? ORANGE : "#ced4da", true, 1.6, 6));
    spots.push({ id: "stack", x: sx, y: 36, w: 60, h: sh, from: false, to: true, label: "stack" });
    m.stack.forEach((i, k) => {
      const cy = 36 + sh - 6 - (k + 1) * 34;
      const isTop = k === m.stack.length - 1;
      parts.push(box(sx + 6, cy, 48, 30, isTop ? glow("top", "#f3f0ff") : "#f3f0ff", isTop && lit("top") ? ORANGE : "#7048e8", false, isTop ? 2.2 : 1.4));
      parts.push(tx(sx + 30, cy + 21, String(m.nodes[i].v), { size: 15, bold: true }));
      if (isTop) {
        parts.push(tx(sx + 66, cy + 20, "← top", { size: 12, anchor: "start", mono: true, color: MUTED }));
        spots.push({ id: "top", x: sx + 6, y: cy, w: 48, h: 30, from: live, to: false, label: `stack top = ${m.nodes[i].v}` });
      }
    });
    w = sx + 120;
    y = Math.max(y, 36 + sh + 12);
    const oy = y + 18;
    parts.push(tx(LEFT - 12, oy + 25, "out[]", { size: 14, anchor: "end", bold: true, mono: true }));
    parts.push(box(col(0) - 4, oy - 4, n * STEP + 4, CELL + 8, glow("out", "#fff"), lit("out") ? ORANGE : "#ced4da", true, 1.6, 6));
    m.out.forEach((i, k) => {
      parts.push(box(col(k), oy, CELL, CELL, "#d3f9d8", GREEN, false, 1.8));
      parts.push(tx(col(k) + CELL / 2, oy + 25, String(m.nodes[i].v), { size: 16, bold: true }));
    });
    spots.push({ id: "out", x: col(0) - 4, y: oy - 4, w: n * STEP + 4, h: CELL + 8, from: false, to: true, label: "out" });
    y = oy + CELL + 14;
    w = Math.max(w, col(n) + 20);
  }
  return { w: Math.max(w, 420), h: y + 4, body: parts.join(""), spots };
}
