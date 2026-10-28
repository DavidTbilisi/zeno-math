// Be the cache: the player is the computer serving get and put requests through a cache of a few slots, one operation
// at a time. The cache is a hash map from key to node and a list of nodes from the head (used last) to the tail (used
// longest ago). Four kinds: LRU (a hit moves the node to the head, a full cache evicts the tail, a get that misses
// returns −1), LFU (the same, but a full cache evicts the node used fewest times, the oldest on a tie), write-through (a
// miss reads the database, and every put is written to the database at once) and write-back (a put only marks the node
// dirty; a dirty node is written to the database when it is evicted). Each operation the player makes is checked
// against the code; a wrong one is not made and says the rule it broke. Kept free of React: the board keeps only the
// operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type CacheAlgo = "lru" | "lfu" | "through" | "back";
export const CACHE_ALGOS: readonly CacheAlgo[] = ["lru", "lfu", "through", "back"];
export type CacheLevel = 1 | 2 | 3;
/** A request: get(k), or put(k, v) with v a letter's index. */
export type Req = { op: "get" | "put"; k: number; v: number };
/** The requests, the slots, and the database's value of each key 1…K (index 0 unused; empty without a database). */
export type CacheTask = { algo: CacheAlgo; cap: number; reqs: Req[]; db: number[] };
/** A node of the list: its key, value, uses (LFU) and whether it changed since it was read (write-back). */
export type CacheNode = { k: number; v: number; f: number; dirty: boolean };

export type CacheNotice = "spared" | "flushed" | "fewerWrites" | "everyPut" | "hitFront" | "streak10";
export const CACHE_NOTICES: CacheNotice[] = ["spared", "flushed", "fewerWrites", "everyPut", "hitFront", "streak10"];

/** A line of the step log, as code. */
export type CacheLog =
  | { op: "start" }
  | { op: "hit"; k: number; v: number; f: number; put: boolean }
  | { op: "miss"; k: number }
  | { op: "evict"; k: number; f: number; tail: boolean }
  | { op: "flush"; k: number; v: number }
  | { op: "insert"; k: number; v: number }
  | { op: "load"; k: number; v: number }
  | { op: "write"; k: number; v: number };

/**
 * The machine's memory after some operations: the request being served (r), whether its cache part is done and the
 * database write is still to come (write-through), the list from head to tail, the database, the writes made to it,
 * the lines the last operation ran, the log, and what the run has shown.
 */
export type CacheMachine = {
  task: CacheTask;
  r: number;
  placed: boolean;
  list: CacheNode[];
  db: number[];
  writes: number;
  lines: number[];
  log: CacheLog[];
  seen: CacheNotice[];
};

export function startMachine(task: CacheTask): CacheMachine {
  return { task, r: 0, placed: false, list: [], db: [...task.db], writes: 0, lines: [], log: [{ op: "start" }], seen: [] };
}

/** Whether the kind has a database behind the cache. */
export const hasDb = (algo: CacheAlgo) => algo === "through" || algo === "back";
/** A value as the letter it stands for. */
export const letter = (v: number) => "abcdefghij"[v];
/** Where the node a full cache evicts sits: the tail, or for LFU the fewest uses, the one nearest the tail on a tie. */
export function victimAt(m: CacheMachine): number {
  if (m.task.algo !== "lfu") return m.list.length - 1;
  const least = Math.min(...m.list.map((n) => n.f));
  return m.list.map((n) => n.f).lastIndexOf(least);
}

/** The operations, by code: a hit, a get that misses, evict, write a dirty node back, a new key in, a key read from the database, a put written through. */
export const OPS = ["hit", "miss", "evict", "flush", "insert", "load", "write"] as const;
export type CacheOp = (typeof OPS)[number];

/** What the code does next; null when every request is served. */
export function expect(m: CacheMachine): CacheOp | null {
  const { algo, reqs, cap } = m.task;
  if (m.r === reqs.length) return null;
  if (m.placed) return "write";
  const q = reqs[m.r];
  if (m.list.some((n) => n.k === q.k)) return "hit";
  if (q.op === "get" && !hasDb(algo)) return "miss";
  if (m.list.length === cap) return algo === "back" && m.list[victimAt(m)].dirty ? "flush" : "evict";
  return q.op === "get" ? "load" : "insert";
}

/** The code's lines each operation runs. */
function linesOf(algo: CacheAlgo, op: CacheOp, get: boolean): number[] {
  const db = hasDb(algo);
  switch (op) {
    case "hit":
      return get ? [0, 1] : db ? [4, 5] : [3, 4];
    case "miss":
      return [0, 2];
    case "evict":
      return db ? [get ? 2 : 6, ...(algo === "back" ? [8] : [])] : [5];
    case "flush":
      return [7];
    case "insert":
      return [6];
    case "load":
      return [3];
    case "write":
      return [7];
  }
}

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: CacheMachine, code: number): CacheMachine {
  const m: CacheMachine = { ...m0, list: m0.list.map((n) => ({ ...n })), db: [...m0.db], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: CacheNotice) => m.seen.includes(k) || m.seen.push(k);
  const op = OPS[code];
  const { algo, reqs } = m.task;
  const q = reqs[m.r];
  m.lines = linesOf(algo, op, q.op === "get");
  // The request's cache part is done: a put written through waits for its database write, any other moves on.
  const served = () => {
    if (algo === "through" && q.op === "put") m.placed = true;
    else m.r++;
  };
  if (op === "hit") {
    const at = m.list.findIndex((n) => n.k === q.k);
    const [node] = m.list.splice(at, 1);
    if (q.op === "put") {
      node.v = q.v;
      if (algo === "back") node.dirty = true;
    }
    node.f++;
    m.list.unshift(node);
    if (at > 0) see("hitFront");
    m.log.push({ op: "hit", k: q.k, v: node.v, f: node.f, put: q.op === "put" });
    served();
  } else if (op === "miss") {
    m.log.push({ op: "miss", k: q.k });
    served();
  } else if (op === "evict") {
    const at = victimAt(m);
    const tail = at === m.list.length - 1;
    const [node] = m.list.splice(at, 1);
    if (!tail) see("spared");
    m.log.push({ op: "evict", k: node.k, f: node.f, tail });
  } else if (op === "flush") {
    const node = m.list[victimAt(m)];
    m.db[node.k] = node.v;
    node.dirty = false;
    m.writes++;
    see("flushed");
    m.log.push({ op: "flush", k: node.k, v: node.v });
  } else if (op === "insert") {
    m.list.unshift({ k: q.k, v: q.v, f: 1, dirty: algo === "back" });
    m.log.push({ op: "insert", k: q.k, v: q.v });
    served();
  } else if (op === "load") {
    m.list.unshift({ k: q.k, v: m.db[q.k], f: 1, dirty: false });
    m.log.push({ op: "load", k: q.k, v: m.db[q.k] });
    served();
  } else {
    m.db[q.k] = q.v;
    m.writes++;
    m.placed = false;
    m.r++;
    m.log.push({ op: "write", k: q.k, v: q.v });
  }
  if (m.r === reqs.length) {
    const puts = reqs.filter((x) => x.op === "put").length;
    if (algo === "through" && puts >= 2) see("everyPut");
    if (algo === "back" && m.writes < puts) see("fewerWrites");
  }
  return m;
}

export function cacheRun(task: CacheTask): { ops: number[]; end: CacheMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: CacheTask, ops: number[]): CacheMachine {
  return ops.reduce(apply, startMachine(task));
}

/** What each get returned, in turn (−1 for a miss), from the log. */
export function gets(m: CacheMachine): number[] {
  return m.log.flatMap((l) => (l.op === "hit" && !l.put ? [l.v] : l.op === "miss" ? [-1] : l.op === "load" ? [l.v] : []));
}

// ---------- checking an operation ----------

/**
 * What the player tried: the request onto a node (a hit), onto the −1 chip (a miss), onto the head (a new key) or onto
 * the database (its write); a node into the evict bin, or onto the database (written back); a database row onto the head.
 */
export type CacheAttempt =
  | { kind: "hit"; k: number }
  | { kind: "miss" }
  | { kind: "insert" }
  | { kind: "write" }
  | { kind: "evict"; k: number }
  | { kind: "flush"; k: number }
  | { kind: "load"; k: number };
export type CacheWhy =
  | "wrongKey" | "inCache" | "getMisses" | "putAdds" | "readDb" | "loadKey" | "fullFirst" | "roomLeft" | "lruTail" | "lfuMin"
  | "flushFirst" | "cleanNoFlush" | "writeNow" | "backLater" | "cacheFirst" | "allDone";
export type CacheCheck = { ok: true; code: number } | { ok: false; why: CacheWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: CacheMachine, at: CacheAttempt): CacheCheck {
  const e = expect(m);
  const no = (why: CacheWhy, vars: Record<string, string | number> = {}): CacheCheck => ({ ok: false, why, vars });
  const ok = (op: CacheOp): CacheCheck => ({ ok: true, code: OPS.indexOf(op) });
  if (e === null) return no("allDone");
  const { algo, cap, reqs } = m.task;
  const q = reqs[m.r];
  const k = q.k;
  if (e === "write") return at.kind === "write" ? ok("write") : no("writeNow", { k, v: letter(q.v) });
  const inCache = () => no("inCache", { k });
  switch (at.kind) {
    case "write":
      return no(algo === "back" ? "backLater" : "cacheFirst", { k });
    case "hit":
      return at.k === k ? ok("hit") : no("wrongKey", { k: at.k, want: k });
    case "evict":
    case "flush": {
      if (e === "hit") return inCache();
      if (e === "miss") return no("getMisses", { k });
      if (e !== "evict" && e !== "flush") return no("roomLeft", { n: m.list.length, c: cap });
      const victim = m.list[victimAt(m)];
      if (at.k !== victim.k) return algo === "lfu" ? no("lfuMin", { t: victim.k, f: victim.f }) : no("lruTail", { t: victim.k });
      if (e === "flush") return at.kind === "flush" ? ok("flush") : no("flushFirst", { t: victim.k });
      return at.kind === "evict" ? ok("evict") : no("cleanNoFlush", { t: victim.k });
    }
    case "miss":
      if (e === "miss") return ok("miss");
      if (e === "hit") return inCache();
      return no(q.op === "put" ? "putAdds" : "readDb", { k });
    case "insert":
      if (e === "insert") return ok("insert");
      if (e === "hit") return inCache();
      if (e === "miss") return no("getMisses", { k });
      if (e === "load") return no("readDb", { k });
      return no("fullFirst", { c: cap });
    case "load":
      if (e === "load") return at.k === k ? ok("load") : no("loadKey", { k });
      if (e === "hit") return inCache();
      if (e === "insert") return no("putAdds", { k });
      return no("fullFirst", { c: cap });
  }
}

// ---------- the tasks ----------

type Spec = { algo: CacheAlgo | null; cap: number; n: number; need?: CacheNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

/**
 * A task worth playing: two gets and two puts or more, two hits, two evictions; a miss that returns −1 (LRU, LFU) or
 * reads the database (write-through, write-back); LFU sparing an old node used more often; write-back writing a dirty
 * node back.
 */
export function cacheTask(spec: Spec, next: () => number): CacheTask {
  const algo = spec.algo ?? pick(CACHE_ALGOS, next);
  const keys = spec.cap + 2;
  for (;;) {
    const reqs: Req[] = Array.from({ length: spec.n }, () => (next() < 0.5 ? { op: "get", k: int(1, keys, next), v: 0 } : { op: "put", k: int(1, keys, next), v: int(0, 9, next) }));
    const t: CacheTask = { algo, cap: spec.cap, reqs, db: hasDb(algo) ? [0, ...Array.from({ length: keys }, () => int(0, 9, next))] : [] };
    const { ops, end } = cacheRun(t);
    const count = (op: CacheOp) => ops.filter((c) => OPS[c] === op).length;
    if (reqs.filter((x) => x.op === "get").length < 2 || reqs.filter((x) => x.op === "put").length < 2) continue;
    if (count("hit") < 2 || count("evict") < 2 || count(hasDb(algo) ? "load" : "miss") < 1) continue;
    if (algo === "lfu" && !end.seen.includes("spared")) continue;
    if (algo === "back" && !end.seen.includes("flushed")) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const CACHE_LADDER: (Spec & { seed: number })[] = [
  { algo: "lru", cap: 2, n: 7, seed: 3401 },
  { algo: "lru", cap: 3, n: 9, need: "hitFront", seed: 3402 },
  { algo: "lfu", cap: 2, n: 8, seed: 3403 },
  { algo: "through", cap: 2, n: 7, need: "everyPut", seed: 3404 },
  { algo: "back", cap: 2, n: 8, seed: 3405 },
  { algo: "lru", cap: 3, n: 11, seed: 3406 },
  { algo: "lfu", cap: 3, n: 11, seed: 3407 },
  { algo: "back", cap: 3, n: 10, need: "fewerWrites", seed: 3408 },
  { algo: null, cap: 3, n: 11, seed: 3409 },
];
/** The endless run: easy, LRU with two or three slots; medium, any kind with three; hard, any with three or four and more requests. */
export function levelSpec(level: CacheLevel, next: () => number): Spec {
  if (level === 1) return { algo: "lru", cap: int(2, 3, next), n: 8 };
  return level === 2 ? { algo: null, cap: 3, n: 9 } : { algo: null, cap: int(3, 4, next), n: int(11, 12, next) };
}

export const cacheStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function cacheNotice(m: CacheMachine, misses: number, streak: number): CacheNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (CACHE_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeCache = EndlessGame<CacheNotice, CacheLevel, { kind: "wrong"; why: CacheWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function cacheNow(d: Pick<LiveBeCache, "mode" | "stage" | "level" | "seed">): CacheTask {
  if (d.mode === "puzzle") {
    const s = CACHE_LADDER[d.stage];
    return cacheTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return cacheTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<CacheAlgo, string[]> = {
  lru: [
    "get(k):",
    "  if k in map: move node to head; return node.v",
    "  return −1",
    "put(k, v):",
    "  if k in map: node.v = v; move to head; return",
    "  if full: del map[tail.k]; unlink tail",
    "  map[k] = new node(k, v) at head",
  ],
  lfu: [
    "get(k):",
    "  if k in map: node.uses += 1; to head; return node.v",
    "  return −1",
    "put(k, v):",
    "  if k in map: node.v = v; uses += 1; to head; return",
    "  if full: evict fewest uses (nearest tail on a tie)",
    "  map[k] = new node(k, v, uses = 1) at head",
  ],
  through: [
    "get(k):",
    "  if k in map: move node to head; return node.v",
    "  if full: evict tail",
    "  map[k] = new node(k, db[k]) at head; return it",
    "put(k, v):",
    "  if k in map: node.v = v; move node to head",
    "  else: if full: evict tail; add node(k, v) at head",
    "  db[k] = v          # write-through",
  ],
  back: [
    "get(k):",
    "  if k in map: move node to head; return node.v",
    "  if full: evict()",
    "  map[k] = new node(k, db[k]) at head, clean",
    "put(k, v):",
    "  if k in map: node.v = v; dirty = True; to head",
    "  else: if full: evict(); add dirty node at head",
    "evict(): if tail.dirty: db[tail.k] = tail.v",
    "         del map[tail.k]; unlink tail",
  ],
};

/** A request as code: get(3), put(3, c). */
export const reqText = (q: Req) => (q.op === "get" ? `get(${q.k})` : `put(${q.k}, ${letter(q.v)})`);

export function logText(l: CacheLog, t: CacheTask): string {
  switch (l.op) {
    case "start":
      return `map = {}; capacity = ${t.cap}`;
    case "hit":
      return `${l.put ? `${l.k} = ${letter(l.v)}` : `return ${letter(l.v)}`}; ${l.k} to head${t.algo === "lfu" ? `; uses = ${l.f}` : ""}${l.put && t.algo === "back" ? "; dirty" : ""}`;
    case "miss":
      return `get(${l.k}): not in map; return −1`;
    case "evict":
      return `evict ${l.k}${t.algo === "lfu" ? ` (uses ${l.f})` : " (tail)"}`;
    case "flush":
      return `db[${l.k}] = ${letter(l.v)}   # write-back`;
    case "insert":
      return `map[${l.k}] = ${letter(l.v)} at head`;
    case "load":
      return `map[${l.k}] = db[${l.k}] = ${letter(l.v)}; return ${letter(l.v)}`;
    case "write":
      return `db[${l.k}] = ${letter(l.v)}   # write-through`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: the request, a node (n), the head, the evict bin, −1, the database and its rows (d). */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type CachePic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const RED = "#e03131";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const LEFT = 100;
const CARD = 82;
const NODE = 64;
const GAP = 26;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/**
 * The machine drawn as a computer keeps it: the capacity and size; the requests still to serve, the current one
 * framed; the map's keys; the list from the head to the tail, each node its key and value (and its uses for LFU, a dot
 * when dirty), the empty slots dashed; the evict bin; and the −1 chip, or the database with a row per key. `hot` lights
 * the spot a drag is over and `sel` the one picked up.
 */
export function cacheSvg(m: CacheMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): CachePic {
  const t = m.task;
  const db = hasDb(t.algo);
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const label = (y: number, s: string) => parts.push(tx(LEFT - 12, y, s, { size: 14, anchor: "end", bold: true, mono: true }));

  parts.push(tx(16, 24, `capacity = ${t.cap}`, { size: 15, anchor: "start", bold: true, mono: true, color: VIOLET }));
  parts.push(tx(170, 24, `size = ${m.list.length}`, { size: 15, anchor: "start", mono: true, color: MUTED }));
  if (db) parts.push(tx(290, 24, `db writes = ${m.writes}`, { size: 15, anchor: "start", mono: true, color: MUTED }));

  // The requests still to serve, the current one framed.
  let y = 42;
  label(y + 25, "requests");
  const shown = t.reqs.slice(m.r, m.r + 5);
  shown.forEach((q, i) => {
    const x = LEFT + i * (CARD + 8);
    const now = i === 0 && live;
    parts.push(box(x, y, CARD, 38, now ? glow("req", "#fff4e6") : "#fff", now ? ORANGE : "#adb5bd", false, now ? 2.4 : 1.4, 8));
    parts.push(tx(x + CARD / 2, y + 24, reqText(q), { size: 13, bold: now, mono: true, color: now ? INK : MUTED }));
    if (now) spots.push({ id: "req", x, y, w: CARD, h: 38, from: true, to: false, label: `request ${reqText(q)}` });
  });
  if (m.r + 5 < t.reqs.length) parts.push(tx(LEFT + 5 * (CARD + 8), y + 24, `+${t.reqs.length - m.r - 5}`, { size: 13, anchor: "start", mono: true, color: MUTED }));
  if (!shown.length) parts.push(tx(LEFT, y + 24, "— all served —", { size: 13, anchor: "start", mono: true, color: GREEN }));

  // The map's keys, in order.
  y += 50;
  label(y + 21, "map");
  const keys = m.list.map((n) => n.k).sort((a, b) => a - b);
  parts.push(tx(LEFT, y + 21, `{ ${keys.map((k) => `${k}: •`).join(", ")} }`, { size: 14, anchor: "start", mono: true, color: BLUE }));

  // The list from the head to the tail, the empty slots dashed.
  y += 44;
  const ny = y + 6;
  label(ny + 34, "list");
  parts.push(box(LEFT, ny, 52, 58, glow("head", "#f8f9fa"), lit("head") ? ORANGE : "#adb5bd", true, 1.8, 8));
  parts.push(tx(LEFT + 26, ny + 27, "head", { size: 13, bold: true, mono: true, color: MUTED }));
  parts.push(tx(LEFT + 26, ny + 44, "new →", { size: 11, mono: true, color: MUTED }));
  spots.push({ id: "head", x: LEFT, y: ny, w: 52, h: 58, from: false, to: true, label: "head" });
  const nx = (i: number) => LEFT + 52 + GAP + i * (NODE + GAP);
  const vi = m.list.length === t.cap && live ? victimAt(m) : -1;
  for (let i = 0; i < t.cap; i++) {
    const x = nx(i);
    parts.push(tx(x - GAP / 2, ny + 34, "⇄", { size: 14, color: MUTED }));
    const n = m.list[i];
    if (!n) {
      parts.push(box(x, ny, NODE, 58, "#fff", "#dee2e6", true, 1.4, 8));
      continue;
    }
    const id = `n${n.k}`;
    const stroke = lit(id) ? ORANGE : i === vi && (expect(m) === "evict" || expect(m) === "flush") ? RED : VIOLET;
    parts.push(box(x, ny, NODE, 58, glow(id, "#f3f0ff"), stroke, false, 2, 8));
    parts.push(tx(x + NODE / 2, ny + 26, String(n.k), { size: 20, bold: true }));
    parts.push(tx(x + NODE / 2, ny + 47, `= ${letter(n.v)}`, { size: 14, mono: true, color: BLUE }));
    if (t.algo === "lfu") parts.push(tx(x + NODE - 4, ny + 14, `×${n.f}`, { size: 11, anchor: "end", mono: true, bold: true, color: GREEN }));
    if (n.dirty) parts.push(`<circle cx="${x + 9}" cy="${ny + 10}" r="5" fill="${ORANGE}"/>`);
    spots.push({ id, x, y: ny, w: NODE, h: 58, from: live, to: true, label: `node ${n.k} = ${letter(n.v)}${t.algo === "lfu" ? `, uses ${n.f}` : ""}${n.dirty ? ", dirty" : ""}` });
  }
  if (m.list.length) parts.push(tx(nx(m.list.length - 1) + NODE / 2, ny + 76, "tail", { size: 12, mono: true, color: MUTED }));
  if (m.list.length) parts.push(tx(nx(0) + NODE / 2, ny - 6, "used last", { size: 10, mono: true, color: MUTED }));
  y = ny + 110;

  // The evict bin, and the −1 chip or the database.
  parts.push(box(LEFT, y, 84, 46, glow("bin", "#fff"), lit("bin") ? ORANGE : "#adb5bd", true, 1.8, 8));
  parts.push(tx(LEFT + 42, y + 29, "evict ✕", { size: 14, bold: true, mono: true, color: MUTED }));
  spots.push({ id: "bin", x: LEFT, y, w: 84, h: 46, from: false, to: true, label: "evict" });
  const bx = LEFT + 104;
  if (!db) {
    parts.push(box(bx, y + 4, 100, 38, glow("miss", "#fff"), lit("miss") ? ORANGE : BLUE, false, 2, 19));
    parts.push(tx(bx + 50, y + 28, "return −1", { size: 14, bold: true, mono: true, color: BLUE }));
    spots.push({ id: "miss", x: bx, y: y + 4, w: 100, h: 38, from: false, to: true, label: "return −1" });
    y += 56;
  } else {
    const K = t.db.length - 1;
    const rw = 50;
    const dw = K * (rw + 6) + 10;
    parts.push(box(bx, y - 18, dw, 76, glow("db", "#f8f9fa"), lit("db") ? ORANGE : GREEN, false, 2, 8));
    parts.push(tx(bx + 8, y - 3, "database", { size: 12, anchor: "start", bold: true, mono: true, color: GREEN }));
    spots.push({ id: "db", x: bx, y: y - 18, w: dw, h: 76, from: false, to: true, label: "database" });
    for (let k = 1; k <= K; k++) {
      const x = bx + 5 + (k - 1) * (rw + 6);
      const id = `d${k}`;
      parts.push(box(x, y + 6, rw, 30, glow(id, "#fff"), lit(id) ? ORANGE : "#ced4da", false, 1.4, 4));
      parts.push(tx(x + rw / 2, y + 26, `${k}: ${letter(m.db[k])}`, { size: 13, mono: true, bold: true }));
      spots.push({ id, x, y: y + 6, w: rw, h: 30, from: live, to: false, label: `db[${k}] = ${letter(m.db[k])}` });
    }
    y += 70;
  }
  const w = Math.max(LEFT + 5 * (CARD + 8) + 40, nx(t.cap) + 10, db ? bx + (t.db.length - 1) * 56 + 30 : 0);
  return { w, h: y + 6, body: parts.join(""), spots };
}
