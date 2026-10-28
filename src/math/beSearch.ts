// Be the search: the player is the computer running a graph search, one operation at a time, on the data the code
// keeps. Breadth-first search on a queue in an array (FIFO): dequeue the front, queue[head], into v, then enqueue each
// new neighbour of v, in alphabetical order, at queue[tail], ticking visited[]. Depth-first search on a stack in an
// array (LIFO): pop the top, stack[top], into v, skip it if it was visited already, else tick visited[] and push its
// unvisited neighbours in reverse alphabetical order, so the first in the alphabet comes off next. Dijkstra's algorithm
// on dist[], prev[] and done[]: take the place not done with the smallest dist into v, then lower dist[u] (and set
// prev[u]) for each neighbour u that is nearer through v. Each operation the player makes is checked against the code;
// a wrong one is not made and says the rule it broke. Kept free of React: the board keeps only the operations made so
// far, and the machine's memory is the replay of them.
import { DOT_R, edgeOf, graphSvg, latticeGraph, name, neighbours, withLengths, type Graph } from "./graphPlay";
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type SearchAlgo = "bfs" | "dfs" | "dijkstra";
export const SEARCH_ALGOS: readonly SearchAlgo[] = ["bfs", "dfs", "dijkstra"];
export type SearchLevel = 1 | 2 | 3;
/** A graph (with road lengths for Dijkstra) and the place the search starts from. */
export type SearchTask = { algo: SearchAlgo; g: Graph; s: number };

export type SearchNotice = "layers" | "skipped" | "lowered" | "streak10";
export const SEARCH_NOTICES: SearchNotice[] = ["layers", "skipped", "lowered", "streak10"];

/** A line of the step log, as code: what an operation did to the machine's memory. */
export type LogLine =
  | { op: "start"; s: number }
  | { op: "dequeue" | "pop"; v: number; i: number; ptr: number }
  | { op: "visit"; v: number }
  | { op: "skip"; v: number }
  | { op: "enqueue" | "push"; v: number; i: number; ptr: number }
  | { op: "pick"; v: number; d: number }
  | { op: "relax"; v: number; from: number; a: number; w: number };

/**
 * The machine's memory after some operations: the queue or stack array (−1 an empty cell; a queue keeps what it has
 * dequeued, before `head`), its pointers, visited[]; Dijkstra's dist[], prev[] and done[]; v, the place being worked
 * on (−1 before the first), and whether DFS skipped it; `todo`, what v still has to send on (BFS, DFS: in the order the
 * code does it; Dijkstra: the neighbours it brings nearer, in any order); the places visited in turn; the code lines
 * the last operation ran; the log; and what the run has shown.
 */
export type Machine = {
  task: SearchTask;
  cells: number[];
  head: number;
  tail: number;
  top: number;
  visited: boolean[];
  dist: number[];
  prev: number[];
  done: boolean[];
  v: number;
  skip: boolean;
  todo: number[];
  order: number[];
  lines: number[];
  log: LogLine[];
  seen: SearchNotice[];
};

/** The places joined to v, in alphabetical order. */
const near = (g: Graph, v: number) => neighbours(g, v).sort((a, b) => a - b);
/** The length of the road between two places. */
export const roadLength = (g: Graph, a: number, b: number) => g.w[edgeOf(g, a, b)];

/** The machine before the first operation: the start queued, pushed, or at distance 0. */
export function startMachine(task: SearchTask, cap: number): Machine {
  const n = task.g.pts.length;
  const m: Machine = {
    task,
    cells: Array<number>(task.algo === "dijkstra" ? 0 : cap).fill(-1),
    head: 0,
    tail: 0,
    top: -1,
    visited: Array<boolean>(n).fill(false),
    dist: Array<number>(n).fill(Infinity),
    prev: Array<number>(n).fill(-1),
    done: Array<boolean>(n).fill(false),
    v: -1,
    skip: false,
    todo: [],
    order: [],
    lines: [0],
    log: [{ op: "start", s: task.s }],
    seen: [],
  };
  if (task.algo === "bfs") {
    m.cells[0] = task.s;
    m.tail = 1;
    m.visited[task.s] = true;
  } else if (task.algo === "dfs") {
    m.cells[0] = task.s;
    m.top = 0;
  } else m.dist[task.s] = 0;
  return m;
}

/** What the code does next: take one out (dequeue, pop), put one in (enqueue, push), pick, lower one of `vs`; null when the run is over. */
export type Expect = { kind: "out" } | { kind: "in"; v: number } | { kind: "pick"; v: number } | { kind: "relax"; vs: number[] } | null;
export function expect(m: Machine): Expect {
  const { algo } = m.task;
  if (m.todo.length) return algo === "dijkstra" ? { kind: "relax", vs: m.todo } : { kind: "in", v: m.todo[0] };
  if (algo === "bfs") return m.head < m.tail ? { kind: "out" } : null;
  if (algo === "dfs") return m.top >= 0 ? { kind: "out" } : null;
  let best = -1;
  m.dist.forEach((d, u) => {
    if (!m.done[u] && d < Infinity && (best < 0 || d < m.dist[best])) best = u;
  });
  return best < 0 ? null : { kind: "pick", v: best };
}

/** The machine after one more operation: −1 takes one out of the queue or stack, a place puts it in, picks it, or lowers its dist. */
export function apply(m0: Machine, code: number): Machine {
  const m: Machine = { ...m0, cells: [...m0.cells], visited: [...m0.visited], dist: [...m0.dist], prev: [...m0.prev], done: [...m0.done], order: [...m0.order], log: [...m0.log], seen: [...m0.seen] };
  const { g, algo } = m.task;
  const see = (k: SearchNotice) => m.seen.includes(k) || m.seen.push(k);
  if (algo === "bfs") {
    if (code < 0) {
      const v = m.cells[m.head];
      m.log.push({ op: "dequeue", v, i: m.head, ptr: m.head + 1 });
      m.head++;
      [m.v, m.lines] = [v, [2]];
      m.order.push(v);
      m.todo = near(g, v).filter((u) => !m.visited[u]);
      if (m.order.length > 1) see("layers");
    } else {
      m.cells[m.tail] = code;
      m.log.push({ op: "enqueue", v: code, i: m.tail, ptr: m.tail + 1 });
      m.tail++;
      m.visited[code] = true;
      m.todo = m.todo.filter((u) => u !== code);
      m.lines = [5, 6];
    }
  } else if (algo === "dfs") {
    if (code < 0) {
      const v = m.cells[m.top];
      m.log.push({ op: "pop", v, i: m.top, ptr: m.top - 1 });
      m.cells[m.top] = -1;
      m.top--;
      m.v = v;
      m.skip = m.visited[v];
      if (m.skip) {
        m.log.push({ op: "skip", v });
        m.lines = [2, 3];
        m.todo = [];
        see("skipped");
      } else {
        m.visited[v] = true;
        m.log.push({ op: "visit", v });
        m.lines = [2, 4];
        m.order.push(v);
        m.todo = near(g, v).filter((u) => !m.visited[u]).reverse();
      }
    } else {
      m.top++;
      m.cells[m.top] = code;
      m.log.push({ op: "push", v: code, i: m.top, ptr: m.top });
      m.todo = m.todo.filter((u) => u !== code);
      m.lines = [7];
    }
  } else if (m.todo.length) {
    const w = roadLength(g, m.v, code);
    if (m.dist[code] < Infinity) see("lowered");
    m.log.push({ op: "relax", v: code, from: m.v, a: m.dist[m.v], w });
    m.dist[code] = m.dist[m.v] + w;
    m.prev[code] = m.v;
    m.todo = m.todo.filter((u) => u !== code);
    m.lines = [5, 6];
  } else {
    m.done[code] = true;
    m.v = code;
    m.order.push(code);
    m.log.push({ op: "pick", v: code, d: m.dist[code] });
    m.todo = near(g, code).filter((u) => !m.done[u] && m.dist[code] + roadLength(g, code, u) < m.dist[u]);
    m.lines = [2, 3];
  }
  return m;
}

/** The code's own operations, start to end (a Dijkstra place's neighbours lowered in alphabetical order), and the machine at the end. */
export function searchRun(task: SearchTask): { ops: number[]; end: Machine; cap: number } {
  let m = startMachine(task, task.g.pts.length * task.g.pts.length);
  const ops: number[] = [];
  let cap = 1;
  for (let e = expect(m); e; e = expect(m)) {
    const code = e.kind === "out" ? -1 : e.kind === "relax" ? e.vs[0] : e.v;
    ops.push(code);
    m = apply(m, code);
    cap = Math.max(cap, m.tail, m.top + 1);
  }
  return { ops, end: m, cap: task.algo === "bfs" ? task.g.pts.length : cap };
}

/** The machine after the operations the player has made. */
export function replay(task: SearchTask, ops: number[]): Machine {
  return ops.reduce(apply, startMachine(task, searchRun(task).cap));
}

// ---------- checking an operation ----------

/** What the player tried: take cell i out into v, put place v into cell i, pick place v into v, drop place v on dist[at]. */
export type Attempt = { kind: "out"; i: number } | { kind: "in"; v: number; i: number } | { kind: "pick"; v: number } | { kind: "relax"; v: number; at: number };

/** Why an operation is not the code's next one; the words name places, indexes and numbers in `vars`. */
export type SearchWhy =
  | "enqueueFirst" | "gone" | "fifo" | "queued" | "dequeueFirst" | "fromQueue" | "notJoined" | "alpha" | "back"
  | "pushFirst" | "lifo" | "doneDfs" | "popFirst" | "fromStack" | "skipped" | "allPushed" | "twice" | "reverse" | "onTop"
  | "relaxFirst" | "settled" | "unreached" | "nearer" | "tie" | "ownColumn" | "pickFirst" | "noBetter";
export type SearchCheck = { ok: true; code: number } | { ok: false; why: SearchWhy; vars: Record<string, string | number> };

const shown = (d: number) => (d === Infinity ? "∞" : d);

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: Machine, a: Attempt): SearchCheck {
  const e = expect(m);
  const { g, algo } = m.task;
  const no = (why: SearchWhy, vars: Record<string, string | number> = {}): SearchCheck => ({ ok: false, why, vars });
  const c = m.v >= 0 ? name(m.v) : "";
  const joined = (v: number) => m.v >= 0 && edgeOf(g, m.v, v) >= 0;
  // The run is over: nothing more to do (the board never asks).
  if (!e) return no("dequeueFirst");
  if (algo === "bfs") {
    if (a.kind === "out") {
      if (e.kind === "in") return no("enqueueFirst", { c, y: name(e.v) });
      if (a.i < m.head) return no("gone", { i: a.i, x: name(m.cells[a.i]), h: m.head });
      if (a.i !== m.head) return no("fifo", { i: a.i, x: name(m.cells[a.i]), h: m.head, y: name(m.cells[m.head]) });
      return { ok: true, code: -1 };
    }
    if (a.kind !== "in") return no("fromQueue");
    if (m.v < 0) return no("dequeueFirst");
    const x = name(a.v);
    if (m.visited[a.v]) return no("queued", { x, k: a.v });
    if (!joined(a.v)) return no("notJoined", { x, c });
    if (e.kind === "in" && e.v !== a.v) return no("alpha", { x, y: name(e.v), c });
    if (a.i !== m.tail) return no("back", { t: m.tail, i: a.i });
    return { ok: true, code: a.v };
  }
  if (algo === "dfs") {
    if (a.kind === "out") {
      if (e.kind === "in") return no("pushFirst", { c, y: name(e.v) });
      if (a.i !== m.top) return no("lifo", { i: a.i, x: name(m.cells[a.i]), t: m.top, y: name(m.cells[m.top]) });
      return { ok: true, code: -1 };
    }
    if (a.kind !== "in") return no("fromStack");
    if (m.v < 0) return no("popFirst");
    const x = name(a.v);
    if (m.skip) return no("skipped", { c });
    if (m.visited[a.v]) return no("doneDfs", { x, k: a.v });
    if (!joined(a.v)) return no("notJoined", { x, c });
    if (e.kind === "out") return no("allPushed", { c });
    if (e.kind === "in" && e.v !== a.v) return m.todo.includes(a.v) ? no("reverse", { x, y: name(e.v) }) : no("twice", { x, c, y: name(e.v) });
    if (a.i !== m.top + 1) return no("onTop", { t: m.top + 1, i: a.i });
    return { ok: true, code: a.v };
  }
  // Dijkstra.
  if (a.kind === "pick") {
    const x = name(a.v);
    if (e.kind === "relax") {
      const y = e.vs[0];
      const w = roadLength(g, m.v, y);
      return no("relaxFirst", { c, y: name(y), a: m.dist[m.v], w, s: m.dist[m.v] + w, d: shown(m.dist[y]), k: y });
    }
    if (m.done[a.v]) return no("settled", { x, k: a.v });
    if (m.dist[a.v] === Infinity) return no("unreached", { x, k: a.v });
    if (e.kind === "pick" && e.v !== a.v) {
      const vars = { x, y: name(e.v), a: m.dist[e.v], b: m.dist[a.v], k: e.v, j: a.v };
      return m.dist[a.v] > m.dist[e.v] ? no("nearer", vars) : no("tie", vars);
    }
    return { ok: true, code: a.v };
  }
  if (a.kind !== "relax") return no("pickFirst");
  const x = name(a.v);
  if (a.v !== a.at) return no("ownColumn", { x, k: a.v });
  if (m.v < 0) return no("pickFirst");
  if (m.done[a.v]) return no("settled", { x, k: a.v });
  if (!joined(a.v)) return no("notJoined", { x, c });
  if (!m.todo.includes(a.v)) {
    const w = roadLength(g, m.v, a.v);
    return no("noBetter", { x, c, a: m.dist[m.v], w, s: m.dist[m.v] + w, d: shown(m.dist[a.v]), k: a.v });
  }
  return { ok: true, code: a.v };
}

// ---------- the tasks ----------

type Spec = { algo: SearchAlgo | null; size: 6 | 9 | 12; need?: SearchNotice; most?: number };
const GRID = { 6: [3, 2], 9: [3, 3], 12: [4, 3] } as const;
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * A task that is worth playing: a connected graph on a lattice, the start anywhere; BFS and DFS visit the places in
 * different orders, and Dijkstra's order is not BFS's (so the road lengths matter); `need` asks for a run that shows
 * something (a DFS that pops a place twice, a Dijkstra distance that goes down), and `most` caps the operations.
 */
export function searchTask(spec: Spec, next: () => number): SearchTask {
  const algo = spec.algo ?? pick(SEARCH_ALGOS, next);
  const [cols, rows] = GRID[spec.size];
  for (;;) {
    const g0 = latticeGraph(cols, rows, 0.4, next, { diagonals: true });
    const g = algo === "dijkstra" ? withLengths(g0, g0.edges.map(() => 1 + Math.floor(next() * 9))) : g0;
    const t: SearchTask = { algo, g, s: Math.floor(next() * g.pts.length) };
    const run = searchRun(t);
    const other = searchRun({ ...t, algo: algo === "bfs" ? "dfs" : "bfs" });
    if (same(run.end.order, other.end.order)) continue;
    if (spec.need && !run.end.seen.includes(spec.need)) continue;
    if (spec.most && run.ops.length > spec.most) continue;
    return t;
  }
}

export const SEARCH_LADDER: (Spec & { seed: number })[] = [
  { algo: "bfs", size: 6, seed: 2201 },
  { algo: "dfs", size: 6, seed: 2202 },
  { algo: "dijkstra", size: 6, seed: 2203 },
  { algo: "bfs", size: 9, seed: 2204 },
  { algo: "dfs", size: 9, need: "skipped", most: 30, seed: 2205 },
  { algo: "dijkstra", size: 9, need: "lowered", seed: 2206 },
  { algo: "bfs", size: 12, seed: 2207 },
  { algo: "dfs", size: 9, need: "skipped", most: 34, seed: 2208 },
  { algo: "dijkstra", size: 12, need: "lowered", seed: 2209 },
];
/** The endless run: easy, BFS or DFS on six places; medium, any on six or nine; hard, any on nine or twelve (DFS on nine). */
export function levelSpec(level: SearchLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["bfs", "dfs"] as const, next), size: 6 };
  if (level === 2) return { algo: null, size: next() < 0.5 ? 6 : 9, most: 30 };
  const algo = pick(SEARCH_ALGOS, next);
  return { algo, size: algo === "dfs" || next() < 0.5 ? 9 : 12, most: 40 };
}

/** Stars: no miss three, one two, else one. */
export const searchStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function searchNotice(m: Machine, misses: number, streak: number): SearchNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (SEARCH_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeSearch = EndlessGame<SearchNotice, SearchLevel, { kind: "wrong"; why: SearchWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far: −1 takes one out of the queue or stack, a place puts it in, picks it, or lowers its dist. */
    ops: number[];
  };
export function searchNow(d: Pick<LiveBeSearch, "mode" | "stage" | "level" | "seed">): SearchTask {
  if (d.mode === "puzzle") {
    const s = SEARCH_LADDER[d.stage];
    return searchTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return searchTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

/** The code each search runs, line by line; `Machine.lines` lights the lines the last operation ran. */
export const CODE: Record<SearchAlgo, string[]> = {
  bfs: [
    "queue.enqueue(s); visited[s] = true",
    "while queue is not empty:",
    "  v = queue.dequeue()        # queue[head++]",
    "  for u in neighbours(v):    # A → Z",
    "    if not visited[u]:",
    "      visited[u] = true",
    "      queue.enqueue(u)       # queue[tail++] = u",
  ],
  dfs: [
    "stack.push(s)",
    "while stack is not empty:",
    "  v = stack.pop()            # stack[top--]",
    "  if visited[v]: continue",
    "  visited[v] = true",
    "  for u in neighbours(v):    # Z → A",
    "    if not visited[u]:",
    "      stack.push(u)          # stack[++top] = u",
  ],
  dijkstra: [
    "dist[*] = ∞; dist[s] = 0",
    "while some place is not done:",
    "  v = the place not done with least dist[v]",
    "  done[v] = true",
    "  for u in neighbours(v):",
    "    if dist[v] + w(v,u) < dist[u]:",
    "      dist[u] = dist[v] + w(v,u); prev[u] = v",
  ],
};

/** A log line as code, its places by letter and their indexes in the arrays. */
export function logText(l: LogLine, algo: SearchAlgo): string {
  const x = (v: number) => `${name(v)}`;
  switch (l.op) {
    case "start":
      return algo === "bfs" ? `queue[0] = ${x(l.s)}; tail = 1; visited[${l.s}] = true` : algo === "dfs" ? `stack[0] = ${x(l.s)}; top = 0` : `dist[${l.s}] = 0  # ${x(l.s)}`;
    case "dequeue":
      return `v = queue[${l.i}] = ${x(l.v)}; head = ${l.ptr}`;
    case "pop":
      return `v = stack[${l.i}] = ${x(l.v)}; top = ${l.ptr}`;
    case "visit":
      return `visited[${l.v}] = true  # ${x(l.v)}`;
    case "skip":
      return `visited[${l.v}] is true: continue  # ${x(l.v)}`;
    case "enqueue":
      return `queue[${l.i}] = ${x(l.v)}; tail = ${l.ptr}; visited[${l.v}] = true`;
    case "push":
      return `stack[${l.i}] = ${x(l.v)}; top = ${l.ptr}`;
    case "pick":
      return `v = ${x(l.v)}  # dist[${l.v}] = ${l.d}; done[${l.v}] = true`;
    case "relax":
      return `dist[${l.v}] = ${l.a} + ${l.w} = ${l.a + l.w}; prev[${l.v}] = ${x(l.from)}  # ${x(l.v)}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a place of the graph, a cell of the array, the v box, a dist[] cell. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type SearchPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const SCALE = 0.78;
const CELL = 38;
const STEP = 42;
const LEFT = 92;

const t = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="ui-monospace, Menlo, Consolas, monospace"` : ""}>${s}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.6"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/**
 * The machine drawn as a computer keeps it: the graph (v ringed blue, places visited or done pale blue, the start green,
 * the roads the search came by blue), the v box with the pointers beside it, and the arrays with their indexes: the
 * queue (cells before head greyed, ▲ head and tail) or the stack (▲ top) and visited[]; Dijkstra's dist[], prev[] and
 * done[] in columns by place. `hot` lights the spot a drag is over and `sel` the spot picked up by a tap.
 */
export function searchSvg(m: Machine, o: { cap: number; hot?: string | null; sel?: string | null; finished?: boolean }): SearchPic {
  const { g, s, algo } = m.task;
  const n = g.pts.length;
  const spots: Spot[] = [];
  const parts: string[] = [];
  // The roads the search came by: Dijkstra's prev[]; BFS, the road from the place that queued each place; DFS, the road
  // from the place that pushed it last before it was visited.
  const came = new Set<number>();
  if (algo === "dijkstra") m.prev.forEach((p, v) => p >= 0 && came.add(edgeOf(g, p, v)));
  else {
    const by = new Map<number, number>();
    let v = -1;
    for (const l of m.log) {
      if (l.op === "dequeue" || l.op === "pop") v = l.v;
      if (l.op === "enqueue") came.add(edgeOf(g, v, l.v));
      if (l.op === "push") by.set(l.v, v);
      if (l.op === "visit" && by.has(l.v)) came.add(edgeOf(g, by.get(l.v)!, l.v));
    }
  }
  const seenPlace = (u: number) => (algo === "dijkstra" ? m.done[u] : algo === "bfs" ? m.order.includes(u) : m.visited[u]);
  const pic = graphSvg(g, {
    scale: SCALE,
    edgeColor: (e) => (came.has(e) ? (o.finished ? GREEN : BLUE) : undefined),
    edgeWidth: (e) => (came.has(e) ? 6 : 3),
    fill: (u) => (u === s ? "#b2f2bb" : seenPlace(u) ? "#d0ebff" : undefined),
    ring: (u) => (o.sel === `n${u}` ? ORANGE : u === m.v && !o.finished ? BLUE : undefined),
  });
  parts.push(pic.body);
  g.pts.forEach(([x, y], u) => {
    const r = DOT_R * SCALE + 7;
    spots.push({ id: `n${u}`, x: x * SCALE - r, y: y * SCALE - r, w: 2 * r, h: 2 * r, from: true, to: false, label: name(u) });
  });

  // The v box and the pointers, right of the graph.
  const bx = Math.max(pic.w, 250) + 34;
  parts.push(t(bx + 36, 22, "v", { size: 15, bold: true, mono: true }));
  const vHot = o.hot === "v";
  parts.push(box(bx, 30, 72, 52, vHot ? "#fff3bf" : m.v >= 0 && !o.finished ? "#e7f5ff" : "#fff", vHot ? ORANGE : BLUE));
  if (m.v >= 0) parts.push(t(bx + 36, 64, name(m.v), { size: 24, bold: true, color: m.skip ? MUTED : INK }));
  if (m.skip) parts.push(t(bx + 36, 98, "continue", { size: 12, color: MUTED, mono: true }));
  spots.push({ id: "v", x: bx, y: 30, w: 72, h: 52, from: false, to: true, label: "v" });
  const ptrs = algo === "bfs" ? [`head = ${m.head}`, `tail = ${m.tail}`] : algo === "dfs" ? [`top = ${m.top}`] : m.v >= 0 ? [`dist[v] = ${m.dist[m.v]}`] : [];
  ptrs.forEach((p, i) => parts.push(t(bx + 92, 50 + i * 22, p, { size: 14, anchor: "start", mono: true, color: BLUE, bold: true })));

  let y = Math.max(pic.h, 120) + 18;
  const col = (i: number) => LEFT + i * STEP;
  const label = (yy: number, s2: string) => parts.push(t(LEFT - 12, yy, s2, { size: 14, anchor: "end", mono: true, bold: true }));
  const indexRow = (yy: number, count: number) => {
    for (let i = 0; i < count; i++) parts.push(t(col(i) + CELL / 2, yy, String(i), { size: 11, color: MUTED, mono: true }));
  };
  const lettersRow = (yy: number) => g.pts.forEach((_, u) => parts.push(t(col(u) + CELL / 2, yy, name(u), { size: 13, bold: true })));

  if (algo !== "dijkstra") {
    // The queue or the stack: its cells, the indexes beneath, and its pointers.
    const isQ = algo === "bfs";
    label(y + 25, isQ ? "queue[]" : "stack[]");
    for (let i = 0; i < o.cap; i++) {
      const v = m.cells[i] ?? -1;
      const live = isQ ? i >= m.head && i < m.tail : i <= m.top;
      const id = `c${i}`;
      const hot = o.hot === id;
      const sel = o.sel === id;
      parts.push(box(col(i), y, CELL, CELL, hot ? "#fff3bf" : sel ? "#ffe8cc" : live ? "#e7f5ff" : "#f8f9fa", hot || sel ? ORANGE : live ? BLUE : "#ced4da", !live && v < 0));
      if (v >= 0) parts.push(t(col(i) + CELL / 2, y + 25, name(v), { size: 17, bold: true, color: live ? INK : "#adb5bd" }));
      spots.push({ id, x: col(i), y, w: CELL, h: CELL, from: live, to: true, label: v >= 0 ? `${isQ ? "queue" : "stack"}[${i}] = ${name(v)}` : `${isQ ? "queue" : "stack"}[${i}]` });
    }
    indexRow(y + CELL + 14, o.cap);
    const marks: [number, string][] = isQ ? [[m.head, "head"], [m.tail, "tail"]] : [[Math.max(m.top, 0), m.top < 0 ? "top = −1" : "top"]];
    const at = new Map<number, string[]>();
    marks.forEach(([i, s2]) => at.set(i, [...(at.get(i) ?? []), s2]));
    at.forEach((names, i) => {
      const cx = Math.min(col(i), col(o.cap - 1) + STEP) + CELL / 2;
      parts.push(`<path d="M ${cx} ${y + CELL + 20} l -6 10 h 12 z" fill="${BLUE}"/>`);
      parts.push(t(cx, y + CELL + 44, names.join(" "), { size: 12, color: BLUE, bold: true, mono: true }));
    });
    y += CELL + 64;
    // visited[]: the places' letters above, ticks in the cells, the indexes beneath.
    lettersRow(y);
    label(y + 30, "visited[]");
    g.pts.forEach((_, u) => {
      parts.push(box(col(u), y + 6, CELL, 34, m.visited[u] ? "#d3f9d8" : "#fff", m.visited[u] ? GREEN : "#ced4da"));
      parts.push(t(col(u) + CELL / 2, y + 29, m.visited[u] ? "T" : "F", { size: 14, bold: true, color: m.visited[u] ? GREEN : "#adb5bd", mono: true }));
    });
    indexRow(y + 54, n);
    y += 62;
  } else {
    lettersRow(y);
    indexRow(y + 14, n);
    y += 22;
    const rows: [string, (u: number) => string, (u: number) => string][] = [
      ["dist[]", (u) => String(shown(m.dist[u])), (u) => (m.done[u] ? "#d0ebff" : m.dist[u] < Infinity ? "#fff4e6" : "#fff")],
      ["prev[]", (u) => (m.prev[u] >= 0 ? name(m.prev[u]) : "–"), () => "#fff"],
      ["done[]", (u) => (m.done[u] ? "T" : "F"), (u) => (m.done[u] ? "#d3f9d8" : "#fff")],
    ];
    rows.forEach(([lab, val, fill], r) => {
      label(y + 25, lab);
      g.pts.forEach((_, u) => {
        const id = `d${u}`;
        const hot = r === 0 && o.hot === id;
        const sel = r === 0 && o.sel === id;
        parts.push(box(col(u), y, CELL, CELL - 4, hot ? "#fff3bf" : sel ? "#ffe8cc" : fill(u), hot || sel ? ORANGE : r === 0 && m.done[u] ? BLUE : "#ced4da"));
        parts.push(t(col(u) + CELL / 2, y + 23, val(u), { size: 15, bold: r !== 1, mono: true, color: r === 2 && !m.done[u] ? "#adb5bd" : INK }));
        if (r === 0) spots.push({ id, x: col(u), y, w: CELL, h: CELL - 4, from: true, to: true, label: `dist[${u}] = ${shown(m.dist[u])}` });
      });
      y += CELL + 2;
    });
    y += 6;
  }
  const w = Math.max(bx + 200, LEFT + Math.max(o.cap + 1, n) * STEP + 10);
  return { w, h: y, body: parts.join(""), spots };
}
