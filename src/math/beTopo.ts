// Be the topological sort: the player is the computer putting the nodes of a directed graph in an order where every
// edge points forward, one operation at a time. Kahn's way keeps indeg[] and a queue: a scan by index puts every node
// with no edge into it in the queue; then the queue's head goes into order[], u walks its edges in turn, each taking
// one off indeg[v], and a node whose indeg reaches 0 joins the queue. On a graph with a cycle the queue runs dry with
// nodes left over: they wait on each other. The depth-first way keeps a stack of open (gray) nodes: the top pushes its
// first unvisited neighbour, and a node with none left is finished, popped onto the front of order[]. Each operation
// the player makes is checked against the code; a wrong one is not made and says the rule it broke. Kept free of
// React: the board keeps only the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type TopoAlgo = "kahn" | "cycle" | "dfs";
export const TOPO_ALGOS: readonly TopoAlgo[] = ["kahn", "cycle", "dfs"];
export type TopoLevel = 1 | 2 | 3;
/** n nodes and the edges u → v; adj lists each node's targets in order. */
export type TopoTask = { algo: TopoAlgo; n: number; edges: [number, number][] };

export type TopoNotice = "many" | "cycle" | "reverse" | "streak10";
export const TOPO_NOTICES: TopoNotice[] = ["many", "cycle", "reverse", "streak10"];

/** A line of the step log, as code. */
export type TopoLog =
  | { op: "start" }
  | { op: "enqueue"; v: number; q: number[] }
  | { op: "dequeue"; u: number; order: number[] }
  | { op: "edge"; u: number; v: number; d: number }
  | { op: "cycle"; left: number[] }
  | { op: "push"; v: number; stack: number[] }
  | { op: "finish"; u: number; order: number[] };

/**
 * The machine's memory after some operations. Kahn: indeg[], whether the first scan runs and where it is, the queue
 * (with the head's place), order[], u with the edge it is at, and a node whose indeg just reached 0. Depth first: each
 * node's colour (0 unvisited, 1 open, 2 finished), the stack, where each node is in its neighbours, and order[] (the
 * finished nodes, the last finished first). The lines the last operation ran, the log, whether it is over, and what
 * the run has shown.
 */
export type TopoMachine = {
  task: TopoTask;
  indeg: number[];
  scanning: boolean;
  s: number;
  queue: number[];
  head: number;
  order: number[];
  u: number | null;
  ei: number;
  zero: number | null;
  color: number[];
  stack: number[];
  idx: number[];
  over: boolean;
  lines: number[];
  log: TopoLog[];
  seen: TopoNotice[];
};

/** Each node's targets, in order. */
export const adjOf = (t: TopoTask) => Array.from({ length: t.n }, (_, u) => t.edges.filter(([a]) => a === u).map(([, b]) => b).sort((x, y) => x - y));

/** The first node from s on with indeg 0 that the scan hasn't queued, or null. */
function nextZero(m: TopoMachine): number | null {
  for (let i = m.s; i < m.task.n; i++) if (m.indeg[i] === 0) return i;
  return null;
}
/** The first unvisited neighbour of the stack's top after the ones it has tried, or the first unvisited node when the stack is empty. */
export function nextWhite(m: TopoMachine): number | null {
  if (!m.stack.length) {
    const i = m.color.indexOf(0);
    return i < 0 ? null : i;
  }
  const u = m.stack[m.stack.length - 1];
  const adj = adjOf(m.task)[u];
  for (let k = m.idx[u]; k < adj.length; k++) if (m.color[adj[k]] === 0) return adj[k];
  return null;
}

export function startMachine(task: TopoTask): TopoMachine {
  const indeg = Array(task.n).fill(0);
  for (const [, b] of task.edges) indeg[b]++;
  const m: TopoMachine = {
    task, indeg, scanning: true, s: 0, queue: [], head: 0, order: [], u: null, ei: 0, zero: null,
    color: Array(task.n).fill(0), stack: [], idx: Array(task.n).fill(0), over: false, lines: [0], log: [{ op: "start" }], seen: [],
  };
  settle(m);
  return m;
}

/** The operations, by code: a node into the queue or onto the stack, the head or top into order[], u along an edge, the cycle called. */
export const OPS = ["put", "take", "edge", "cycle"] as const;
export type TopoOp = (typeof OPS)[number];

/** End the scan when no node is left for it, and the run when nothing is left to do. */
function settle(m: TopoMachine): void {
  if (m.scanning && nextZero(m) === null) m.scanning = false;
  if (expectRaw(m) === null) {
    m.over = true;
    if (m.task.algo === "dfs") m.seen.includes("reverse") || m.seen.push("reverse");
  }
}

function expectRaw(m: TopoMachine): TopoOp | null {
  const { algo, n } = m.task;
  if (algo === "dfs") return nextWhite(m) !== null ? "put" : m.stack.length ? "take" : null;
  if (m.scanning || m.zero !== null) return "put";
  if (m.u !== null && m.ei < adjOf(m.task)[m.u].length) return "edge";
  if (m.head < m.queue.length) return "take";
  return m.order.length < n && m.log[m.log.length - 1].op !== "cycle" ? "cycle" : null;
}
/** What the code does next; null when it is done. */
export const expect = (m: TopoMachine): TopoOp | null => (m.over ? null : expectRaw(m));

/** The node the next put puts in: the scan's next, the node just at 0, or (depth first) the next unvisited. */
export function putNode(m: TopoMachine): number {
  if (m.task.algo === "dfs") return nextWhite(m)!;
  return m.scanning ? nextZero(m)! : m.zero!;
}
/** The target of u's next edge. */
export const edgeTarget = (m: TopoMachine) => adjOf(m.task)[m.u!][m.ei];

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: TopoMachine, code: number): TopoMachine {
  const m: TopoMachine = { ...m0, indeg: [...m0.indeg], queue: [...m0.queue], order: [...m0.order], color: [...m0.color], stack: [...m0.stack], idx: [...m0.idx], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: TopoNotice) => m.seen.includes(k) || m.seen.push(k);
  const op = OPS[code];
  const { algo } = m.task;
  const adj = adjOf(m.task);
  if (algo === "dfs") {
    if (op === "put") {
      const v = nextWhite(m)!;
      if (m.stack.length) {
        const u = m.stack[m.stack.length - 1];
        m.idx[u] = adj[u].indexOf(v) + 1;
        m.lines = [3, 4];
      } else m.lines = [1];
      m.stack.push(v);
      m.color[v] = 1;
      m.log.push({ op: "push", v, stack: [...m.stack] });
    } else {
      const u = m.stack.pop()!;
      m.color[u] = 2;
      m.order.unshift(u);
      m.lines = [3, 5];
      m.log.push({ op: "finish", u, order: [...m.order] });
    }
  } else if (op === "put") {
    const v = putNode(m);
    m.queue.push(v);
    if (m.scanning) {
      m.s = v + 1;
      m.lines = [1];
    } else {
      m.zero = null;
      m.lines = [6];
    }
    if (m.queue.length - m.head >= 2) see("many");
    m.log.push({ op: "enqueue", v, q: m.queue.slice(m.head) });
  } else if (op === "take") {
    const u = m.queue[m.head++];
    m.order.push(u);
    [m.u, m.ei] = [u, 0];
    m.lines = [2, 3];
    m.log.push({ op: "dequeue", u, order: [...m.order] });
  } else if (op === "edge") {
    const v = edgeTarget(m);
    m.ei++;
    m.indeg[v]--;
    if (m.indeg[v] === 0) m.zero = v;
    m.lines = [4, 5];
    m.log.push({ op: "edge", u: m.u!, v, d: m.indeg[v] });
  } else {
    m.lines = [7];
    see("cycle");
    m.log.push({ op: "cycle", left: [...Array(m.task.n).keys()].filter((v) => !m.order.includes(v)) });
  }
  settle(m);
  return m;
}

export function topoRun(task: TopoTask): { ops: number[]; end: TopoMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: TopoTask, ops: number[]): TopoMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/** What the player tried: node v into the queue or onto the stack, the head or top into order[], u along its edge to v, a node into the cycle box. */
export type TopoAttempt = { kind: "put"; v: number } | { kind: "take" } | { kind: "edge"; v: number } | { kind: "cycle" };
export type TopoWhy =
  | "hasIn" | "already" | "scanOrder" | "scanFirst" | "takeHead" | "notEdge" | "edgeOrder" | "edgesFirst" | "zeroNow"
  | "queueEmpty" | "doneAlready" | "onStack" | "notNeighbor" | "neighborOrder" | "startOrder" | "unvisited" | "allVisited";
export type TopoCheck = { ok: true; code: number } | { ok: false; why: TopoWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: TopoMachine, at: TopoAttempt): TopoCheck {
  const e = expect(m);
  const no = (why: TopoWhy, vars: Record<string, string | number> = {}): TopoCheck => ({ ok: false, why, vars });
  const ok = (op: TopoOp): TopoCheck => ({ ok: true, code: OPS.indexOf(op) });
  const adj = adjOf(m.task);
  if (m.task.algo === "dfs") {
    const u = m.stack[m.stack.length - 1];
    if (e === "take") return at.kind === "take" ? ok("take") : no("allVisited", { u });
    const v = putNode(m);
    if (at.kind !== "put") return no("unvisited", { u, v });
    if (at.v === v) return ok("put");
    if (m.color[at.v] === 2) return no("doneAlready", { w: at.v });
    if (m.color[at.v] === 1) return no("onStack", { w: at.v });
    if (!m.stack.length) return no("startOrder", { v });
    return adj[u].includes(at.v) ? no("neighborOrder", { u, v }) : no("notNeighbor", { u, w: at.v });
  }
  if (e === "cycle") return at.kind === "cycle" ? ok("cycle") : no("queueEmpty", { left: m.task.n - m.order.length });
  const head = m.queue[m.head];
  if (e === "take") return at.kind === "take" ? ok("take") : no("takeHead", { h: head });
  const u = m.u!;
  if (e === "edge") {
    const v = edgeTarget(m);
    if (at.kind !== "edge") return no("edgesFirst", { u });
    if (at.v === v) return ok("edge");
    return adj[u].includes(at.v) ? no("edgeOrder", { u, v }) : no("notEdge", { u, w: at.v });
  }
  const v = putNode(m);
  if (!m.scanning) return at.kind === "put" && at.v === v ? ok("put") : no("zeroNow", { v });
  if (at.kind !== "put") return no("scanFirst", { v });
  if (at.v === v) return ok("put");
  if (m.queue.includes(at.v)) return no("already", { v: at.v });
  if (m.indeg[at.v] > 0) return no("hasIn", { v: at.v, d: m.indeg[at.v] });
  return no("scanOrder", { v });
}

// ---------- the tasks ----------

type Spec = { algo: TopoAlgo | null; n: number; need?: TopoNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

/**
 * A task worth playing: a graph of n nodes with between n and 2n − 2 edges, every node on one, that has no cycle (or,
 * for the cycle, exactly one back edge that leaves at least half the nodes ordered and two caught); Kahn's queue holds
 * two at once somewhere, and the depth-first walk starts from at least two nodes.
 */
export function topoTask(spec: Spec, next: () => number): TopoTask {
  const algo = spec.algo ?? pick(TOPO_ALGOS, next);
  const n = spec.n;
  for (;;) {
    const rank = [...Array(n).keys()].map((i) => [next(), i] as const).sort((x, y) => x[0] - y[0]).map(([, i]) => i);
    const edges: [number, number][] = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (next() < 0.32) edges.push([rank[a], rank[b]]);
    if (algo === "cycle") {
      const [a, b] = [int(0, n - 2, next), int(1, n - 1, next)];
      if (b <= a || edges.some(([x, y]) => x === rank[b] && y === rank[a])) continue;
      edges.push([rank[b], rank[a]]);
    }
    if (edges.length < n || edges.length > 2 * n - 2) continue;
    if ([...Array(n).keys()].some((v) => !edges.some(([x, y]) => x === v || y === v))) continue;
    const t: TopoTask = { algo, n, edges: edges.sort((p, q) => p[0] - q[0] || p[1] - q[1]) };
    const { ops, end } = topoRun(t);
    if (algo === "cycle" && (end.order.length < n / 2 || n - end.order.length < 2 || ops.length < n + 3)) continue;
    if (algo === "kahn" && !end.seen.includes("many")) continue;
    if (algo === "dfs" && end.log.filter((l) => l.op === "push" && l.stack.length === 1).length < 2) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const TOPO_LADDER: (Spec & { seed: number })[] = [
  { algo: "kahn", n: 5, seed: 3201 },
  { algo: "dfs", n: 5, seed: 3202 },
  { algo: "cycle", n: 5, seed: 3203 },
  { algo: "kahn", n: 6, seed: 3204 },
  { algo: "dfs", n: 6, seed: 3205 },
  { algo: "cycle", n: 6, seed: 3206 },
  { algo: "kahn", n: 8, seed: 3207 },
  { algo: "dfs", n: 7, seed: 3208 },
  { algo: "cycle", n: 7, seed: 3209 },
];
/** The endless run: easy, Kahn or depth first on five; medium, any on six; hard, on seven or eight. */
export function levelSpec(level: TopoLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["kahn", "dfs"] as const, next), n: 5 };
  return { algo: null, n: level === 2 ? 6 : int(7, 8, next) };
}

export const topoStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function topoNotice(m: TopoMachine, misses: number, streak: number): TopoNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (TOPO_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeTopo = EndlessGame<TopoNotice, TopoLevel, { kind: "wrong"; why: TopoWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function topoNow(d: Pick<LiveBeTopo, "mode" | "stage" | "level" | "seed">): TopoTask {
  if (d.mode === "puzzle") {
    const s = TOPO_LADDER[d.stage];
    return topoTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return topoTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

const KAHN = ["indeg = in-degrees; q = deque(); order = []", "for v in range(n): if indeg[v] == 0: q.append(v)", "while q:", "  u = q.popleft(); order.append(u)", "  for v in adj[u]:", "    indeg[v] −= 1", "    if indeg[v] == 0: q.append(v)", "return order if len(order) == n else 'cycle'"];
export const CODE: Record<TopoAlgo, string[]> = {
  kahn: KAHN,
  cycle: KAHN,
  dfs: ["state = [unvisited] * n; stack = []; order = []", "for s in range(n): if unvisited: push s (open)", "  while stack:", "    u = stack[−1]; v = next unvisited of u", "    if v: push v (open)", "    else: pop(); u done; order.insert(0, u)", "return order"],
};

const list = (xs: number[]) => `[${xs.join(", ")}]`;
export function logText(l: TopoLog, t: TopoTask): string {
  switch (l.op) {
    case "start":
      return CODE[t.algo][0];
    case "enqueue":
      return `q.append(${l.v}) → q = ${list(l.q)}`;
    case "dequeue":
      return `u = q.popleft() = ${l.u}; order = ${list(l.order)}`;
    case "edge":
      return `${l.u} → ${l.v}: indeg[${l.v}] = ${l.d}`;
    case "cycle":
      return `q is empty, ${list(l.left)} left: a cycle`;
    case "push":
      return `push ${l.v} → stack = ${list(l.stack)}`;
    case "finish":
      return `${l.u} finished; order = ${list(l.order)}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a node (n), u, the queue or stack (box), its head or top, order[], the cycle box. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type TopoPic = { w: number; h: number; body: string; spots: Spot[] };

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
 * The machine drawn as a computer keeps it: the nodes on a circle with an arrow for each edge (Kahn: the edge u walks
 * next orange, the ones walked faded), the queue with its head (or the stack with its top), indeg[] with its indexes
 * (Kahn), order[] (filled from the back for the depth-first walk), and the cycle box. `hot` lights the spot a drag is
 * over and `sel` the one picked up.
 */
export function topoSvg(m: TopoMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): TopoPic {
  const t = m.task;
  const { n, algo } = t;
  const kahn = algo !== "dfs";
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const [CX, CY, RAD] = [LEFT + 120, 170, 120];
  const at = (i: number): [number, number] => [f1(CX + RAD * Math.sin((2 * Math.PI * i) / n)), f1(CY - RAD * Math.cos((2 * Math.PI * i) / n))];
  const adj = adjOf(t);
  const e = expect(m);

  parts.push(tx(16, 26, `n = ${n}`, { size: 14, anchor: "start", mono: true, color: MUTED }));
  for (const [a, b] of t.edges) {
    const walked = kahn && (m.order.includes(a) && (a !== m.u || adj[a].indexOf(b) < m.ei));
    const now = kahn && live && e === "edge" && a === m.u && b === edgeTarget(m);
    const [p, q] = [at(a), at(b)];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const [ux, uy] = [(q[0] - p[0]) / d, (q[1] - p[1]) / d];
    const [x1, y1, x2, y2] = [p[0] + ux * R, p[1] + uy * R, q[0] - ux * (R + 2), q[1] - uy * (R + 2)];
    const color = now ? ORANGE : walked ? "#dee2e6" : "#868e96";
    parts.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${color}" stroke-width="${now ? 3.4 : 2}"${walked ? ` stroke-dasharray="5 4"` : ""}/>`);
    const [hx, hy] = [-uy * 5, ux * 5];
    parts.push(`<polygon points="${f1(x2)},${f1(y2)} ${f1(x2 - ux * 11 + hx)},${f1(y2 - uy * 11 + hy)} ${f1(x2 - ux * 11 - hx)},${f1(y2 - uy * 11 - hy)}" fill="${color}"/>`);
  }
  const queued = new Set(m.queue.slice(m.head));
  for (let i = 0; i < n; i++) {
    const [x, y] = at(i);
    const id = `n${i}`;
    const ordered = m.order.includes(i);
    const open = !kahn && m.color[i] === 1;
    const isU = kahn && live && i === m.u && e === "edge";
    const fill = ordered ? "#d3f9d8" : queued.has(i) || open ? (open ? "#fff4e6" : "#f3f0ff") : "#fff";
    const stroke = lit(id) || isU ? ORANGE : ordered ? GREEN : queued.has(i) ? VIOLET : open ? ORANGE : BLUE;
    parts.push(`<circle cx="${x}" cy="${y}" r="${R}" fill="${glow(id, fill)}" stroke="${stroke}" stroke-width="${isU || lit(id) ? 3 : 2}"/>`);
    parts.push(tx(x, y + 5, String(i), { size: 15, bold: true }));
    spots.push({ id, x: x - R, y: y - R, w: 2 * R, h: 2 * R, from: live, to: live && kahn, label: `node ${i}` });
  }
  if (kahn && live && e === "edge") {
    const [x, y] = at(m.u!);
    const [dx, dy] = [(x - CX) / RAD, (y - CY) / RAD];
    const [chx, chy] = [f1(x + dx * 40 - 18), f1(y + dy * 36 - 12)];
    parts.push(box(chx, chy, 36, 24, glow("u", "#fff4e6"), ORANGE, false, 2, 12));
    parts.push(tx(chx + 18, chy + 17, "u", { size: 14, bold: true, mono: true, color: ORANGE }));
    spots.push({ id: "u", x: chx, y: chy, w: 36, h: 24, from: true, to: false, label: `u = ${m.u}` });
  }

  // indeg[] (Kahn), the queue or stack, order[].
  let y = CY + RAD + R + 24;
  const row = (name: string, cells: (string | null)[], hl: (k: number) => string | null, id: string | null, label = name) => {
    const cy = y + 14;
    parts.push(tx(LEFT - 12, cy + 25, name, { size: 14, anchor: "end", bold: true, mono: true }));
    if (id) {
      const w = n * STEP + 4;
      parts.push(box(LEFT - 4, cy - 4, w, CELL + 8, glow(id, "#fff"), lit(id) ? ORANGE : "#ced4da", true, 1.6, 6));
      spots.push({ id, x: LEFT - 4, y: cy - 4, w, h: CELL + 8, from: false, to: true, label });
    }
    cells.forEach((v, k) => {
      if (v === null) return;
      const color = hl(k);
      parts.push(box(LEFT + k * STEP, cy, CELL, CELL, color ? "#fff" : "#f8f9fa", color ?? "#adb5bd", false, 1.8));
      parts.push(tx(LEFT + k * STEP + CELL / 2, cy + 25, v, { size: 16, bold: true }));
    });
    y = cy + CELL + 8;
    return cy;
  };
  if (kahn) {
    const cy = y + 14;
    parts.push(tx(LEFT - 12, cy + 25, "indeg[]", { size: 14, anchor: "end", bold: true, mono: true }));
    m.indeg.forEach((d, i) => {
      parts.push(tx(LEFT + i * STEP + CELL / 2, y + 8, String(i), { size: 11, color: MUTED, mono: true }));
      parts.push(box(LEFT + i * STEP, cy, CELL, CELL, d === 0 ? "#e7f5ff" : "#fff", d === 0 ? BLUE : "#868e96"));
      parts.push(tx(LEFT + i * STEP + CELL / 2, cy + 25, String(d), { size: 16, bold: true, color: m.order.includes(i) ? "#adb5bd" : INK }));
    });
    y = cy + CELL + 8;
    const waiting = m.queue.slice(m.head);
    const qy = row("queue", waiting.map(String), () => VIOLET, "box", "queue");
    if (waiting.length) {
      parts.push(box(LEFT, qy, CELL, CELL, glow("head", "#f3f0ff"), lit("head") ? ORANGE : VIOLET, false, 2.6));
      parts.push(tx(LEFT + CELL / 2, qy + 25, String(waiting[0]), { size: 16, bold: true }));
      parts.push(tx(LEFT + CELL / 2, qy + CELL + 14, "head", { size: 10, mono: true, color: MUTED }));
      spots.push({ id: "head", x: LEFT, y: qy, w: CELL, h: CELL, from: live, to: false, label: `head = ${waiting[0]}` });
      y += 8;
    }
    row("order[]", m.order.map(String), () => GREEN, "order", "order");
  } else {
    const sy = row("stack", m.stack.map(String), () => ORANGE, "box", "stack");
    if (m.stack.length) {
      const k = m.stack.length - 1;
      const v = m.stack[k];
      parts.push(box(LEFT + k * STEP, sy, CELL, CELL, glow("top", "#fff4e6"), lit("top") ? ORANGE : ORANGE, false, 2.6));
      parts.push(tx(LEFT + k * STEP + CELL / 2, sy + 25, String(v), { size: 16, bold: true }));
      parts.push(tx(LEFT + k * STEP + CELL / 2, sy + CELL + 14, "top", { size: 10, mono: true, color: MUTED }));
      spots.push({ id: "top", x: LEFT + k * STEP, y: sy, w: CELL, h: CELL, from: live, to: false, label: `top = ${v}` });
      y += 8;
    }
    row("order[]", [...Array(n - m.order.length).fill(null), ...m.order.map(String)], () => GREEN, "order", "order");
  }
  let w = Math.max(CX + RAD + 120, LEFT + n * STEP + 20);
  if (kahn) {
    const bx = CX + RAD + 50;
    parts.push(box(bx, 40, 96, 44, glow("cycle", "#fff"), lit("cycle") ? ORANGE : RED, true, 2, 8));
    parts.push(tx(bx + 48, 68, "cycle!", { size: 15, bold: true, mono: true, color: RED }));
    spots.push({ id: "cycle", x: bx, y: 40, w: 96, h: 44, from: false, to: true, label: "cycle!" });
    w = Math.max(w, bx + 110);
  }
  return { w, h: y + 6, body: parts.join(""), spots };
}
