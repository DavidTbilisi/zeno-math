// Be the union-find: the player is the computer keeping sets as a forest in parent[], one operation at a time. Each
// command finds the roots of its two nodes: cur climbs to parent[cur] until parent[cur] = cur, and then every node it
// passed is pointed straight at the root (path compression). Then the two roots decide: the same root means the nodes
// are joined already (skipped; for Kruskal, the edge would close a cycle), different roots are linked, the smaller tree
// under the bigger (union by size). Three patterns: a list of unions, unions with "are these connected?" queries
// between them, and Kruskal's cheapest spanning tree, the edges taken by weight until n − 1 are in. Each operation the
// player makes is checked against the code; a wrong one is not made and says the rule it broke. Kept free of React:
// the board keeps only the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type UfAlgo = "unions" | "connected" | "kruskal";
export const UF_ALGOS: readonly UfAlgo[] = ["unions", "connected", "kruskal"];
export type UfLevel = 1 | 2 | 3;
/** A command: join a and b (union, or Kruskal's edge of weight w), or ask whether a and b are connected. */
export type UfCmd = { op: "union" | "query" | "edge"; a: number; b: number; w?: number };
export type UfTask = { algo: UfAlgo; n: number; cmds: UfCmd[] };

export type UfNotice = "compress" | "cycle" | "early" | "streak10";
export const UF_NOTICES: UfNotice[] = ["compress", "cycle", "early", "streak10"];

/** A line of the step log, as code. */
export type UfLog =
  | { op: "start" }
  | { op: "up"; x: number; p: number }
  | { op: "compress"; x: number; r: number }
  | { op: "root"; x: number; r: number }
  | { op: "join"; child: number; root: number; size: number }
  | { op: "skip"; r: number }
  | { op: "answer"; a: number; b: number; yes: boolean };

/**
 * The machine's memory after some operations: parent[] and size[], the command being worked (ci), which find runs
 * (a, b, or both done: decide), cur and the nodes it has passed, the nodes still to point at the root (null before
 * the root is reached), the roots found, the answers to queries, the spanning tree's edges and weight, whether the run
 * is over, the lines the last operation ran, the log, and what the run has shown.
 */
export type UfMachine = {
  task: UfTask;
  parent: number[];
  size: number[];
  ci: number;
  phase: "a" | "b" | "decide";
  cur: number;
  path: number[];
  comp: number[] | null;
  ra: number;
  rb: number;
  answers: boolean[];
  mst: number[];
  total: number;
  over: boolean;
  lines: number[];
  log: UfLog[];
  seen: UfNotice[];
};

/** Move on through finds that need no operation: at a root with nothing to compress, the find is done. */
function settle(m: UfMachine): void {
  const see = (k: UfNotice) => m.seen.includes(k) || m.seen.push(k);
  while (!m.over && m.phase !== "decide" && m.parent[m.cur] === m.cur) {
    if (m.comp === null) {
      m.comp = m.path.filter((p) => m.parent[p] !== m.cur);
      if (m.comp.length) see("compress");
    }
    if (m.comp.length) return;
    const cmd = m.task.cmds[m.ci];
    m.log.push({ op: "root", x: m.phase === "a" ? cmd.a : cmd.b, r: m.cur });
    if (m.phase === "a") {
      m.ra = m.cur;
      [m.phase, m.cur, m.path, m.comp] = ["b", cmd.b, [], null];
    } else {
      m.rb = m.cur;
      m.phase = "decide";
    }
  }
}

/** Start the next command, or end the run. */
function nextCmd(m: UfMachine): void {
  const { task } = m;
  m.ci++;
  if (m.ci === task.cmds.length || (task.algo === "kruskal" && m.mst.length === task.n - 1)) {
    m.over = true;
    if (task.algo === "kruskal" && m.ci < task.cmds.length) m.seen.includes("early") || m.seen.push("early");
    return;
  }
  [m.phase, m.cur, m.path, m.comp] = ["a", task.cmds[m.ci].a, [], null];
  settle(m);
}

export function startMachine(task: UfTask): UfMachine {
  const m: UfMachine = {
    task, parent: Array.from({ length: task.n }, (_, i) => i), size: Array(task.n).fill(1), ci: 0, phase: "a", cur: task.cmds[0].a, path: [],
    comp: null, ra: -1, rb: -1, answers: [], mst: [], total: 0, over: false, lines: [0], log: [{ op: "start" }], seen: [],
  };
  settle(m);
  return m;
}

/** The two roots in the order they are linked: the smaller tree's root first, then the one it goes under (on a tie, the second under the first). */
export function linkOrder(m: UfMachine): [number, number] {
  return m.size[m.ra] < m.size[m.rb] ? [m.ra, m.rb] : [m.rb, m.ra];
}

/** The operations, by code: cur up to its parent, a passed node pointed at the root, two roots linked, a command skipped (same root), a query answered yes or no. */
export const OPS = ["up", "compress", "join", "skip", "yes", "no"] as const;
export type UfOp = (typeof OPS)[number];

/** What the code does next; null when it is done. */
export function expect(m: UfMachine): UfOp | null {
  if (m.over) return null;
  if (m.phase !== "decide") return m.comp?.length ? "compress" : "up";
  const same = m.ra === m.rb;
  if (m.task.cmds[m.ci].op === "query") return same ? "yes" : "no";
  return same ? "skip" : "join";
}

const LINE: Record<UfAlgo, Record<UfOp, number[]>> = {
  unions: { up: [1, 2], compress: [3], join: [8, 9], skip: [7], yes: [], no: [] },
  connected: { up: [1, 2], compress: [3], join: [9], skip: [8], yes: [7], no: [7] },
  kruskal: { up: [1, 2], compress: [3], join: [8], skip: [7], yes: [], no: [] },
};

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: UfMachine, code: number): UfMachine {
  const m: UfMachine = { ...m0, parent: [...m0.parent], size: [...m0.size], path: [...m0.path], comp: m0.comp && [...m0.comp], answers: [...m0.answers], mst: [...m0.mst], log: [...m0.log], seen: [...m0.seen] };
  const op = OPS[code];
  const { algo, cmds } = m.task;
  m.lines = LINE[algo][op];
  if (op === "up") {
    m.path.push(m.cur);
    m.log.push({ op: "up", x: m.cur, p: m.parent[m.cur] });
    m.cur = m.parent[m.cur];
    settle(m);
    return m;
  }
  if (op === "compress") {
    const x = m.comp!.shift()!;
    m.parent[x] = m.cur;
    m.log.push({ op: "compress", x, r: m.cur });
    settle(m);
    return m;
  }
  if (op === "join") {
    const [child, root] = linkOrder(m);
    m.parent[child] = root;
    m.size[root] += m.size[child];
    m.log.push({ op: "join", child, root, size: m.size[root] });
    if (algo === "kruskal") {
      m.mst.push(m.ci);
      m.total += cmds[m.ci].w!;
      if (m.mst.length === m.task.n - 1) m.lines = [8, 9];
    }
  } else if (op === "skip") {
    m.log.push({ op: "skip", r: m.ra });
    m.seen.includes("cycle") || m.seen.push("cycle");
  } else {
    m.answers.push(op === "yes");
    m.log.push({ op: "answer", a: cmds[m.ci].a, b: cmds[m.ci].b, yes: op === "yes" });
  }
  nextCmd(m);
  return m;
}

export function ufRun(task: UfTask): { ops: number[]; end: UfMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: UfTask, ops: number[]): UfMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/** What the player tried: cur moved onto a node, a node dragged onto another (pointed at it), the command skipped, a query answered. */
export type UfAttempt = { kind: "move"; to: number } | { kind: "link"; from: number; to: number } | { kind: "skip" } | { kind: "answer"; yes: boolean };
export type UfWhy =
  | "toParent" | "findFirst" | "isRoot" | "compressNext" | "sameRoot" | "bySize" | "rootsOnly" | "different" | "querySame"
  | "queryDiff" | "answerIt";
export type UfCheck = { ok: true; code: number } | { ok: false; why: UfWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: UfMachine, at: UfAttempt): UfCheck {
  const e = expect(m);
  const no = (why: UfWhy, vars: Record<string, string | number> = {}): UfCheck => ({ ok: false, why, vars });
  const ok = (op: UfOp): UfCheck => ({ ok: true, code: OPS.indexOf(op) });
  if (e === "up") {
    if (at.kind === "move") return at.to === m.parent[m.cur] ? ok("up") : no("toParent", { x: m.cur, p: m.parent[m.cur] });
    return no("findFirst", { x: m.cur, p: m.parent[m.cur] });
  }
  if (e === "compress") {
    if (at.kind === "link" && at.from === m.comp![0] && at.to === m.cur) return ok("compress");
    return at.kind === "move" ? no("isRoot", { r: m.cur }) : no("compressNext", { x: m.comp![0], r: m.cur });
  }
  const { ra, rb } = m;
  if (e === "yes" || e === "no") {
    if (at.kind !== "answer") return no("answerIt");
    if (at.yes === (e === "yes")) return ok(e);
    return e === "yes" ? no("querySame", { r: ra }) : no("queryDiff", { ra, rb });
  }
  if (e === "skip") return at.kind === "skip" ? ok("skip") : no("sameRoot", { r: ra });
  if (at.kind === "skip") return no("different", { ra, rb });
  const [child, root] = linkOrder(m);
  if (at.kind === "link" && at.from === child && at.to === root) return ok("join");
  if (at.kind === "link" && at.from === root && at.to === child) return no("bySize", { s: child, ss: m.size[child], b: root, bs: m.size[root] });
  return no("rootsOnly", { ra, rb });
}

// ---------- the tasks ----------

type Spec = { algo: UfAlgo | null; n: number; c: number; need?: UfNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));
const pair = (n: number, next: () => number): [number, number] => {
  const a = int(0, n - 1, next);
  let b = int(0, n - 2, next);
  if (b >= a) b++;
  return [a, b];
};

/**
 * A task worth playing: c commands on n nodes with some climbing (at least c ups), at least one path compressed and
 * one command skipped (or, for queries, a yes and a no among three); Kruskal on a connected graph with distinct
 * weights that skips an edge before the tree is done.
 */
export function ufTask(spec: Spec, next: () => number): UfTask {
  const algo = spec.algo ?? pick(UF_ALGOS, next);
  for (;;) {
    let cmds: UfCmd[];
    if (algo === "kruskal") {
      const ws = new Set<number>();
      const seen = new Set<string>();
      const edges: UfCmd[] = [];
      while (edges.length < spec.c) {
        const [a, b] = pair(spec.n, next);
        const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
        const w = int(1, 19, next);
        if (seen.has(key) || ws.has(w)) continue;
        seen.add(key);
        ws.add(w);
        edges.push({ op: "edge", a: Math.min(a, b), b: Math.max(a, b), w });
      }
      cmds = edges.sort((p, q) => p.w! - q.w!);
    } else {
      cmds = Array.from({ length: spec.c }, () => {
        const [a, b] = pair(spec.n, next);
        return { op: "union" as const, a, b };
      });
      if (algo === "connected") for (const at of [2, 4, spec.c - 1].map((x, k) => x + k + 1)) cmds.splice(Math.min(at, cmds.length), 0, { op: "query", ...(([a, b]) => ({ a, b }))(pair(spec.n, next)) });
    }
    const t: UfTask = { algo, n: spec.n, cmds };
    const { ops, end } = ufRun(t);
    const count = (op: UfOp) => ops.filter((c) => OPS[c] === op).length;
    if (count("up") < spec.c || !end.seen.includes("compress")) continue;
    if (algo === "kruskal" ? end.mst.length < spec.n - 1 || !end.seen.includes("cycle") : algo === "unions" ? count("skip") < 1 : count("yes") < 1 || count("no") < 1) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const UF_LADDER: (Spec & { seed: number })[] = [
  { algo: "unions", n: 5, c: 5, seed: 3101 },
  { algo: "connected", n: 6, c: 5, seed: 3102 },
  { algo: "kruskal", n: 5, c: 7, seed: 3103 },
  { algo: "unions", n: 7, c: 7, seed: 3104 },
  { algo: "connected", n: 7, c: 6, seed: 3105 },
  { algo: "kruskal", n: 6, c: 9, need: "early", seed: 3106 },
  { algo: "unions", n: 8, c: 9, seed: 3107 },
  { algo: "connected", n: 8, c: 7, seed: 3108 },
  { algo: "kruskal", n: 7, c: 11, need: "early", seed: 3109 },
];
/** The endless run: easy, unions on five or six; medium, any on six or seven; hard, any on eight. */
export function levelSpec(level: UfLevel, next: () => number): Spec {
  const algo = level === 1 ? "unions" : pick(UF_ALGOS, next);
  const n = level === 1 ? int(5, 6, next) : level === 2 ? int(6, 7, next) : 8;
  return { algo, n, c: algo === "kruskal" ? n + 3 : n };
}

export const ufStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function ufNotice(m: UfMachine, misses: number, streak: number): UfNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (UF_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeUnion = EndlessGame<UfNotice, UfLevel, { kind: "wrong"; why: UfWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function ufNow(d: Pick<LiveBeUnion, "mode" | "stage" | "level" | "seed">): UfTask {
  if (d.mode === "puzzle") {
    const s = UF_LADDER[d.stage];
    return ufTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return ufTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

const FIND = ["parent = list(range(n)); size = [1] * n", "def find(x):", "  while parent[x] != x: x = parent[x]", "  point each node passed at x   # compress", "  return x"];
export const CODE: Record<UfAlgo, string[]> = {
  unions: [...FIND, "for a, b in unions:", "  ra, rb = find(a), find(b)", "  if ra == rb: continue", "  if size[ra] < size[rb]: ra, rb = rb, ra", "  parent[rb] = ra; size[ra] += size[rb]"],
  connected: [...FIND, "for cmd, a, b in script:", "  ra, rb = find(a), find(b)", "  if cmd == '?': answer(ra == rb); continue", "  if ra == rb: continue", "  smaller root under bigger: parent[rb] = ra"],
  kruskal: [...FIND, "for w, u, v in sorted(edges):", "  ru, rv = find(u), find(v)", "  if ru == rv: continue   # a cycle", "  union(ru, rv); tree.append((u, v)); total += w", "  if len(tree) == n − 1: break"],
};

/** A command as the board writes it. */
export const cmdText = (c: UfCmd) => (c.op === "edge" ? `${c.a}–${c.b}  w = ${c.w}` : c.op === "query" ? `${c.a} ~ ${c.b} ?` : `union(${c.a}, ${c.b})`);

export function logText(l: UfLog, t: UfTask): string {
  switch (l.op) {
    case "start":
      return CODE[t.algo][0];
    case "up":
      return `parent[${l.x}] = ${l.p}: x = ${l.p}`;
    case "compress":
      return `parent[${l.x}] = ${l.r}`;
    case "root":
      return `find(${l.x}) = ${l.r}`;
    case "join":
      return `parent[${l.child}] = ${l.root}; size[${l.root}] = ${l.size}`;
    case "skip":
      return t.algo === "kruskal" ? `same root ${l.r}: a cycle, skip` : `same root ${l.r}: skip`;
    case "answer":
      return `${l.a} ~ ${l.b}: ${l.yes ? "yes" : "no"}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a node (n), cur, the skip bin, yes, no. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type UfPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const RED = "#e03131";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const CELL = 38;
const STEP = 44;
const LEFT = 96;
const R = 18;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;
const f1 = (v: number) => Math.round(v * 10) / 10;

/**
 * The machine drawn as a computer keeps it: the nodes on a circle with an arrow from each to its parent (for Kruskal,
 * over the graph's edges and their weights, the tree's edges green), cur ringed orange with the nodes it passed, the
 * script of commands with the one being worked framed, parent[] and size[] with their indexes, and the skip bin and the
 * yes and no boxes. `hot` lights the spot a drag is over and `sel` the one picked up.
 */
export function ufSvg(m: UfMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): UfPic {
  const t = m.task;
  const { n, cmds, algo } = t;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const [CX, CY, RAD] = [LEFT + 120, 170, 120];
  const at = (i: number): [number, number] => [f1(CX + RAD * Math.sin((2 * Math.PI * i) / n)), f1(CY - RAD * Math.cos((2 * Math.PI * i) / n))];
  const cmd = cmds[m.ci];

  parts.push(tx(16, 26, `n = ${n}`, { size: 14, anchor: "start", mono: true, color: MUTED }));
  if (algo === "kruskal") {
    cmds.forEach((c, k) => {
      const [a, b] = [at(c.a), at(c.b)];
      const inTree = m.mst.includes(k);
      const now = k === m.ci && live;
      parts.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${inTree ? GREEN : now ? ORANGE : "#dee2e6"}" stroke-width="${inTree ? 5 : now ? 4 : 2.5}" stroke-linecap="round"/>`);
      const [mx, my] = [f1((a[0] + b[0]) / 2), f1((a[1] + b[1]) / 2)];
      parts.push(`<rect x="${mx - 11}" y="${my - 9}" width="22" height="17" rx="4" fill="#fff" stroke="${now ? ORANGE : "#ced4da"}"/>`);
      parts.push(tx(mx, my + 4, String(c.w), { size: 11, bold: true, color: now ? ORANGE : MUTED }));
    });
  }
  // Each node's arrow to its parent.
  for (let i = 0; i < n; i++) {
    const p = m.parent[i];
    if (p === i) continue;
    const [a, b] = [at(i), at(p)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const [ux, uy] = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
    const [x1, y1, x2, y2] = [a[0] + ux * R, a[1] + uy * R, b[0] - ux * (R + 2), b[1] - uy * (R + 2)];
    parts.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${VIOLET}" stroke-width="2.2"/>`);
    const [hx, hy] = [-uy * 5, ux * 5];
    parts.push(`<polygon points="${f1(x2)},${f1(y2)} ${f1(x2 - ux * 10 + hx)},${f1(y2 - uy * 10 + hy)} ${f1(x2 - ux * 10 - hx)},${f1(y2 - uy * 10 - hy)}" fill="${VIOLET}"/>`);
  }
  const passed = new Set(m.path);
  for (let i = 0; i < n; i++) {
    const [x, y] = at(i);
    const id = `n${i}`;
    const isCur = i === m.cur && live && m.phase !== "decide";
    const root = m.parent[i] === i;
    const found = live && m.phase !== "a" && (i === m.ra || (m.phase === "decide" && i === m.rb));
    const fill = passed.has(i) && live ? "#fff4e6" : root ? "#e7f5ff" : "#f8f9fa";
    parts.push(`<circle cx="${x}" cy="${y}" r="${R}" fill="${glow(id, fill)}" stroke="${lit(id) || isCur ? ORANGE : found ? GREEN : root ? BLUE : "#adb5bd"}" stroke-width="${isCur || found || lit(id) ? 3 : root ? 2.2 : 1.6}"/>`);
    if (root) parts.push(`<circle cx="${x}" cy="${y}" r="${R - 4}" fill="none" stroke="${BLUE}" stroke-width="1" opacity="0.5"/>`);
    parts.push(tx(x, y + 5, String(i), { size: 15, bold: true }));
    spots.push({ id, x: x - R, y: y - R, w: 2 * R, h: 2 * R, from: live, to: live, label: `node ${i}` });
  }
  if (live && m.phase !== "decide") {
    // cur's chip, outside the circle by its node.
    const [x, y] = at(m.cur);
    const [dx, dy] = [(x - CX) / RAD, (y - CY) / RAD];
    const [chx, chy] = [f1(x + dx * 40 - 20), f1(y + dy * 36 - 12)];
    parts.push(box(chx, chy, 40, 24, glow("cur", "#fff4e6"), ORANGE, false, 2, 12));
    parts.push(tx(chx + 20, chy + 17, "cur", { size: 13, bold: true, mono: true, color: ORANGE }));
    spots.push({ id: "cur", x: chx, y: chy, w: 40, h: 24, from: true, to: false, label: `cur = ${m.cur}` });
  }

  // The script, the command being worked framed.
  const sx = CX + RAD + 70;
  parts.push(tx(sx, 26, algo === "kruskal" ? "edges, by weight" : "script", { size: 14, anchor: "start", bold: true, mono: true, color: MUTED }));
  cmds.forEach((c, k) => {
    const y = 38 + k * 26;
    const now = k === m.ci && live;
    const done = k < m.ci || o.finished;
    const mark = algo === "kruskal" ? (m.mst.includes(k) ? "✓" : done && k < m.ci ? "✗" : "") : c.op === "query" && k < m.ci ? (m.answers[cmds.slice(0, k).filter((q) => q.op === "query").length] ? "yes" : "no") : "";
    if (now) parts.push(box(sx - 6, y, 190, 22, "#fff4e6", ORANGE, false, 1.6, 4));
    parts.push(tx(sx, y + 16, cmdText(c), { size: 13, anchor: "start", mono: true, bold: now, color: done && !now ? MUTED : INK }));
    if (mark) parts.push(tx(sx + 178, y + 16, mark, { size: 12, anchor: "end", mono: true, bold: true, color: mark === "✗" || mark === "no" ? RED : GREEN }));
  });
  let sy = 38 + cmds.length * 26 + 18;
  if (live) {
    const finds = [m.phase === "a" ? null : `find(${cmd.a}) = ${m.ra}`, m.phase === "decide" ? `find(${cmd.b}) = ${m.rb}` : null].filter(Boolean) as string[];
    finds.forEach((s, k) => parts.push(tx(sx, sy + k * 22, s, { size: 14, anchor: "start", mono: true, bold: true, color: GREEN })));
    sy += 44;
  }
  if (algo === "kruskal") parts.push(tx(sx, sy, `total = ${m.total}`, { size: 15, anchor: "start", mono: true, bold: true, color: o.finished ? GREEN : INK }));

  // parent[] and size[], then the bins.
  let y = Math.max(CY + RAD + R + 24, sy + 10);
  const rows: [string, number[]][] = [["parent[]", m.parent], ["size[]", m.size]];
  for (const [name, vals] of rows) {
    const cy = y + 14;
    parts.push(tx(LEFT - 12, cy + 25, name, { size: 14, anchor: "end", bold: true, mono: true }));
    vals.forEach((v, i) => {
      parts.push(tx(LEFT + i * STEP + CELL / 2, y + 8, String(i), { size: 11, color: MUTED, mono: true }));
      const self = name === "parent[]" && v === i;
      parts.push(box(LEFT + i * STEP, cy, CELL, CELL, self ? "#e7f5ff" : "#fff", name === "parent[]" ? (self ? BLUE : VIOLET) : "#868e96", false, 1.6));
      parts.push(tx(LEFT + i * STEP + CELL / 2, cy + 25, String(v), { size: 16, bold: true, color: name === "size[]" && m.parent[i] !== i ? "#ced4da" : INK }));
    });
    y = cy + CELL + 8;
  }
  const by = y + 8;
  const bin = (id: string, x: number, w: number, label: string, color: string) => {
    parts.push(box(x, by, w, 40, glow(id, "#fff"), lit(id) ? ORANGE : color, true, 1.8, 8));
    parts.push(tx(x + w / 2, by + 26, label, { size: 14, bold: true, mono: true, color }));
    spots.push({ id, x, y: by, w, h: 40, from: false, to: true, label });
  };
  bin("skip", LEFT, 110, algo === "kruskal" ? "skip: cycle" : "skip", MUTED);
  if (algo === "connected") {
    bin("yes", LEFT + 126, 70, "yes", GREEN);
    bin("no", LEFT + 212, 70, "no", RED);
  }
  return { w: Math.max(sx + 200, LEFT + n * STEP + 20), h: by + 52, body: parts.join(""), spots };
}
