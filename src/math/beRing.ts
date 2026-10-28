// Be the hash ring: the player is consistent hashing at work on a ring of positions 0 to 99. Four kinds: lookup (each
// key goes to the first server clockwise from its hash, round past 99 to the first one if none is after it), a server
// added (only the keys between it and the server before it move to it; the player moves exactly those), a server removed
// (its keys move to the next server clockwise) and virtual nodes (each server sits at two points of the ring, and a key
// goes to the server of the first point clockwise). Servers joining and leaving happen by themselves; the player places
// and moves every key. Each operation is checked against the code; a wrong one is not made and says the rule it broke.
// Kept free of React: the board keeps only the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type RingAlgo = "lookup" | "add" | "remove" | "vnodes";
export const RING_ALGOS: readonly RingAlgo[] = ["lookup", "add", "remove", "vnodes"];
export type RingLevel = 1 | 2 | 3;
/** A point of the ring a server sits at: its id (the server's name, with the copy's number for virtual nodes), server, position. */
export type RingNode = { id: string; s: number; h: number };
/** A key on the ring: its name, position, and the id of the node it is on (null until placed). */
export type RingKey = { k: string; h: number; at: string | null };
/** A new key to place, a server joining at a position, or a server leaving. */
export type RingEvent = { kind: "key"; k: string; h: number } | { kind: "add"; s: number; h: number } | { kind: "remove"; s: number };
/** The ring's nodes and the keys already on it at the start, then the events in turn. */
export type RingTask = { algo: RingAlgo; nodes: RingNode[]; keys: { k: string; h: number }[]; events: RingEvent[] };

export type RingNotice = "fewMoved" | "toSuccessor" | "vnodes" | "wrap" | "streak10";
export const RING_NOTICES: RingNotice[] = ["fewMoved", "toSuccessor", "vnodes", "wrap", "streak10"];

/** A line of the step log, as code. */
export type RingLog =
  | { op: "start" }
  | { op: "place"; k: string; h: number; to: string; p: number; wrapped: boolean }
  | { op: "add"; s: number; h: number; moving: number }
  | { op: "remove"; s: number; moving: number }
  | { op: "move"; k: string; h: number; from: string; to: string }
  | { op: "gone"; s: number };

/**
 * The machine's memory after some operations: the event being served (e), the ring's nodes, the keys, the keys still to
 * move for a server joining or leaving, the server leaving, the lines the last operation ran, the log, and what the run
 * has shown.
 */
export type RingMachine = {
  task: RingTask;
  e: number;
  nodes: RingNode[];
  keys: RingKey[];
  pending: number[];
  leaving: number | null;
  lines: number[];
  log: RingLog[];
  seen: RingNotice[];
};

export const serverName = (s: number) => "ABCDEF"[s];
/** The node a position belongs to: the first at or after it clockwise, or round past 99 to the first of all. */
export function ownerOf(nodes: RingNode[], h: number): RingNode {
  const sorted = [...nodes].sort((a, b) => a.h - b.h);
  return sorted.find((n) => n.h >= h) ?? sorted[0];
}
/** Whether a position has no node after it, so its owner is found round past 99. */
export const wraps = (nodes: RingNode[], h: number) => nodes.every((n) => n.h < h);

/** A server joining or leaving: what happens by itself, and the keys it makes move. Moves past one that moves none. */
function settle(m: RingMachine): void {
  const { events } = m.task;
  for (;;) {
    if (m.e === events.length || m.pending.length) return;
    if (m.leaving !== null) {
      const s = m.leaving;
      m.nodes = m.nodes.filter((n) => n.s !== s);
      m.leaving = null;
      m.log.push({ op: "gone", s });
      m.e++;
      continue;
    }
    const ev = events[m.e];
    if (ev.kind === "key") return;
    if (ev.kind === "add") {
      m.nodes = [...m.nodes, { id: serverName(ev.s), s: ev.s, h: ev.h }];
      m.pending = m.keys.flatMap((key, i) => (ownerOf(m.nodes, key.h).id !== key.at ? [i] : []));
      m.log.push({ op: "add", s: ev.s, h: ev.h, moving: m.pending.length });
      // Hash mod n moves every key whose index changes when n grows by one; the ring moves only these.
      const n = new Set(m.nodes.map((x) => x.s)).size;
      const modMoved = m.keys.filter((key) => key.h % (n - 1) !== key.h % n).length;
      if (m.pending.length < modMoved) m.seen.includes("fewMoved") || m.seen.push("fewMoved");
      if (!m.pending.length) m.e++;
    } else {
      m.leaving = ev.s;
      m.pending = m.keys.flatMap((key, i) => (m.nodes.find((x) => x.id === key.at)!.s === ev.s ? [i] : []));
      m.log.push({ op: "remove", s: ev.s, moving: m.pending.length });
    }
  }
}

export function startMachine(task: RingTask): RingMachine {
  const keys = task.keys.map((key) => ({ ...key, at: ownerOf(task.nodes, key.h).id }));
  const m: RingMachine = { task, e: 0, nodes: [...task.nodes], keys, pending: [], leaving: null, lines: [0], log: [{ op: "start" }], seen: [] };
  settle(m);
  return m;
}

/** The nodes keys go to now: without the server leaving. */
const staying = (m: RingMachine) => m.nodes.filter((n) => n.s !== m.leaving);

/** The operations: place the new key (code 0), or move key i to its new node (code 1 + i). */
export type RingOp = "place" | "move";
/** What the code does next; null when every event is done. */
export function expect(m: RingMachine): RingOp | null {
  if (m.e === m.task.events.length) return null;
  return m.pending.length ? "move" : "place";
}

/** The machine after one more operation, by its code. */
export function apply(m0: RingMachine, code: number): RingMachine {
  const m: RingMachine = { ...m0, nodes: [...m0.nodes], keys: m0.keys.map((key) => ({ ...key })), pending: [...m0.pending], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: RingNotice) => m.seen.includes(k) || m.seen.push(k);
  const { algo } = m.task;
  if (code === 0) {
    const ev = m.task.events[m.e] as Extract<RingEvent, { kind: "key" }>;
    const to = ownerOf(m.nodes, ev.h);
    const wrapped = wraps(m.nodes, ev.h);
    m.keys.push({ k: ev.k, h: ev.h, at: to.id });
    m.log.push({ op: "place", k: ev.k, h: ev.h, to: to.id, p: to.h, wrapped });
    if (wrapped) see("wrap");
    m.lines = algo === "vnodes" ? [2, 3, 4] : wrapped ? [2, 3, 4, 5] : [2, 3, 5];
    m.e++;
    if (algo === "vnodes") {
      const via = (s: number) => new Set(m.keys.filter((key) => m.nodes.find((n) => n.id === key.at)!.s === s).map((key) => key.at)).size;
      if (m.nodes.some((n) => via(n.s) >= 2)) see("vnodes");
    }
  } else {
    const i = code - 1;
    const key = m.keys[i];
    const to = ownerOf(staying(m), key.h);
    m.log.push({ op: "move", k: key.k, h: key.h, from: key.at!, to: to.id });
    key.at = to.id;
    m.pending = m.pending.filter((x) => x !== i);
    m.lines = m.leaving !== null ? [1, 2] : [3, 4];
    if (!m.pending.length) {
      if (m.leaving !== null) see("toSuccessor");
      else m.e++;
    }
  }
  settle(m);
  return m;
}

export function ringRun(task: RingTask): { ops: number[]; end: RingMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    // The keys to move go in order round the ring.
    const code = e === "place" ? 0 : 1 + [...m.pending].sort((a, b) => m.keys[a].h - m.keys[b].h)[0];
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: RingTask, ops: number[]): RingMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/** What the player tried: the new key, or key i on the ring, dropped on a node. */
export type RingAttempt = { key: "new" | number; to: string };
export type RingWhy = "clockwise" | "wrapRound" | "stays" | "toNew" | "notLeaving" | "successor" | "allDone";
export type RingCheck = { ok: true; code: number } | { ok: false; why: RingWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: RingMachine, at: RingAttempt): RingCheck {
  const e = expect(m);
  const no = (why: RingWhy, vars: Record<string, string | number> = {}): RingCheck => ({ ok: false, why, vars });
  if (e === null) return no("allDone");
  if (e === "place") {
    const ev = m.task.events[m.e] as Extract<RingEvent, { kind: "key" }>;
    const to = ownerOf(m.nodes, ev.h);
    if (at.key === "new" && at.to === to.id) return { ok: true, code: 0 };
    return no(wraps(m.nodes, ev.h) ? "wrapRound" : "clockwise", { h: ev.h, s: to.id, p: to.h });
  }
  const i = at.key as number;
  const key = m.keys[i];
  const to = ownerOf(staying(m), key.h);
  if (m.leaving === null) {
    const ev = m.task.events[m.e] as Extract<RingEvent, { kind: "add" }>;
    if (!m.pending.includes(i)) return no("stays", { k: key.k, s: key.at!, x: serverName(ev.s) });
    return at.to === to.id ? { ok: true, code: 1 + i } : no("toNew", { k: key.k, s: to.id });
  }
  if (!m.pending.includes(i)) return no("notLeaving", { k: key.k, s: serverName(m.leaving) });
  return at.to === to.id ? { ok: true, code: 1 + i } : no("successor", { k: key.k, s: to.id, x: serverName(m.leaving) });
}

// ---------- the tasks ----------

type Spec = { algo: RingAlgo | null; n: number; keys: number; changes?: number; need?: RingNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));
const NAMES = ["ant", "bee", "cat", "cow", "dog", "eel", "elk", "fox", "gnu", "hen", "owl", "ram", "yak"];

/** Positions round the ring, drawn in turn: the first `lone` at least four apart from all, the rest six apart from each other too (their tags sit side by side). */
function spots(lone: number, count: number, next: () => number): number[] {
  const gap = (a: number, b: number) => Math.min(Math.abs(a - b), 100 - Math.abs(a - b));
  for (;;) {
    const xs: number[] = [];
    for (let tries = 0; xs.length < count && tries < 600; tries++) {
      const h = int(0, 99, next);
      if (xs.every((x, i) => gap(x, h) >= (xs.length >= lone && i >= lone ? 6 : 4))) xs.push(h);
    }
    if (xs.length === count) return xs;
  }
}
/** xs in a random order. */
const shuffle = <T>(xs: T[], next: () => number) => xs.map((x) => [next(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

/**
 * A task worth playing: lookups land on three servers or more, and some wrap round; a server joining takes some keys
 * from the server after it and leaves it some; a server leaving has keys to hand on; virtual nodes make a server take
 * keys at two of its points.
 */
export function ringTask(spec: Spec, next: () => number): RingTask {
  const algo = spec.algo ?? pick(RING_ALGOS, next);
  const changes = spec.changes ?? 1;
  for (;;) {
    const copies = algo === "vnodes" ? 2 : 1;
    const joining = algo === "add" ? changes : 0;
    const pos = spots(spec.n * copies + joining, spec.n * copies + joining + spec.keys, next);
    const names = shuffle([...NAMES], next).slice(0, spec.keys);
    const nodes: RingNode[] = Array.from({ length: spec.n * copies }, (_, j) => {
      const s = j % spec.n;
      return { id: copies > 1 ? `${serverName(s)}${Math.floor(j / spec.n) + 1}` : serverName(s), s, h: pos[j] };
    });
    const keyPos = pos.slice(spec.n * copies + joining);
    const keyed = names.map((k, i) => ({ k, h: keyPos[i] }));
    const lookups = algo === "lookup" || algo === "vnodes";
    const events: RingEvent[] = lookups
      ? keyed.map((x) => ({ kind: "key", ...x }))
      : algo === "add"
        ? Array.from({ length: changes }, (_, i) => ({ kind: "add", s: spec.n + i, h: pos[spec.n + i] }))
        : shuffle(Array.from({ length: spec.n }, (_, s) => s), next).slice(0, changes).map((s) => ({ kind: "remove", s }));
    const t: RingTask = { algo, nodes, keys: lookups ? [] : keyed, events };
    const { ops, end } = ringRun(t);
    if (lookups && new Set(end.keys.map((key) => end.nodes.find((n) => n.id === key.at)!.s)).size < Math.min(3, spec.n)) continue;
    if (algo === "lookup" && !end.seen.includes("wrap")) continue;
    if (algo === "vnodes" && !end.seen.includes("vnodes")) continue;
    if (!lookups) {
      const moves = end.log.filter((l) => l.op === "add" || l.op === "remove").map((l) => (l as { moving: number }).moving);
      if (moves.length !== changes || moves.some((x) => x === 0) || ops.length < 2) continue;
      // A server joining leaves the server after it some keys: not every key between them moves.
      if (algo === "add") {
        let m = startMachine(t);
        let fair = true;
        for (const code of ops) {
          const from = m.pending.length ? m.keys[m.pending[0]].at : null;
          if (from && !m.keys.some((key, i) => !m.pending.includes(i) && key.at === from)) fair = false;
          m = apply(m, code);
        }
        if (!fair) continue;
      }
    }
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const RING_LADDER: (Spec & { seed: number })[] = [
  { algo: "lookup", n: 3, keys: 6, seed: 3601 },
  { algo: "lookup", n: 4, keys: 7, seed: 3602 },
  { algo: "add", n: 3, keys: 7, need: "fewMoved", seed: 3603 },
  { algo: "remove", n: 4, keys: 7, seed: 3604 },
  { algo: "vnodes", n: 3, keys: 7, seed: 3605 },
  { algo: "add", n: 3, keys: 9, changes: 2, need: "fewMoved", seed: 3606 },
  { algo: "remove", n: 4, keys: 9, changes: 2, seed: 3607 },
  { algo: "vnodes", n: 3, keys: 8, seed: 3608 },
  { algo: null, n: 4, keys: 8, seed: 3609 },
];
/** The endless run: easy, lookups on three servers; medium, any kind; hard, any with more keys and two changes. */
export function levelSpec(level: RingLevel, next: () => number): Spec {
  if (level === 1) return { algo: "lookup", n: 3, keys: 6 };
  return level === 2 ? { algo: null, n: 3, keys: 7 } : { algo: null, n: int(3, 4, next), keys: int(8, 9, next), changes: 2 };
}

export const ringStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function ringNotice(m: RingMachine, misses: number, streak: number): RingNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (RING_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeRing = EndlessGame<RingNotice, RingLevel, { kind: "wrong"; why: RingWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far: 0 placed the new key, 1 + i moved key i. */
    ops: number[];
  };
export function ringNow(d: Pick<LiveBeRing, "mode" | "stage" | "level" | "seed">): RingTask {
  if (d.mode === "puzzle") {
    const s = RING_LADDER[d.stage];
    return ringTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return ringTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<RingAlgo, string[]> = {
  lookup: [
    "ring = servers sorted by hash(server)",
    "for key in keys:",
    "  p = hash(key)",
    "  s = first server at or after p   # clockwise",
    "  if none: s = ring[0]             # round past 99",
    "  put key on s",
  ],
  add: [
    "add(X at p):",
    "  s = next server clockwise after p",
    "  for key on s:",
    "    if key is after prev(p), up to p:",
    "      move key from s to X",
  ],
  remove: ["remove(X):", "  s = next server clockwise after X", "  for key on X: move key from X to s", "  delete X from the ring"],
  vnodes: [
    "for s in servers: put copies at hash(s#1), hash(s#2)",
    "for key in keys:",
    "  p = hash(key)",
    "  v = first copy at or after p (round past 99)",
    "  put key on server(v)",
  ],
};

export function logText(l: RingLog, t: RingTask): string {
  const at = (n: RingNode) => `${n.id}@${n.h}`;
  switch (l.op) {
    case "start":
      return `ring = [${[...t.nodes].sort((a, b) => a.h - b.h).map(at).join(", ")}]`;
    case "place":
      return `${l.k} @ ${l.h} → ${l.to}@${l.p}${l.wrapped ? " (round past 99)" : ""}`;
    case "add":
      return `${serverName(l.s)} joins @ ${l.h}; ${l.moving} key${l.moving === 1 ? "" : "s"} to move`;
    case "remove":
      return `${serverName(l.s)} leaves; ${l.moving} key${l.moving === 1 ? "" : "s"} to move`;
    case "move":
      return `${l.k} @ ${l.h}: ${l.from} → ${l.to}`;
    case "gone":
      return `${serverName(l.s)} deleted from the ring`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: the new key, a key on the ring (k), a node (n). */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type RingPic = { w: number; h: number; body: string; spots: Spot[] };

const COLORS = ["#1971c2", "#2f9e44", "#7048e8", "#e8590c", "#0c8599", "#c2255c"];
const ORANGE = "#f08c00";
const RED = "#e03131";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const MONO = "ui-monospace, Menlo, Consolas, monospace";
const R = 150;
const CX = 350;
const CY = 220;

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;
/** A point at position h (0 at the top, clockwise) and radius r. */
const at = (h: number, r: number): [number, number] => {
  const a = (h / 100) * 2 * Math.PI - Math.PI / 2;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};

/**
 * The machine drawn as a computer keeps it: on the left the sorted ring[] and the key to place (its hash) or the server
 * joining or leaving; the ring with 0, 25, 50 and 75 marked, each node a circle in its server's colour with its
 * position, each key a tag inside the ring at its hash in the colour of the server it is on (the keys still to move
 * framed), and a server leaving drawn dashed in red. `hot` lights the spot a drag is over and `sel` the one picked up.
 */
export function ringSvg(m: RingMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): RingPic {
  const t = m.task;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const e = live ? expect(m) : null;

  // The ring and its marks.
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#ced4da" stroke-width="3"/>`);
  for (const h of [0, 25, 50, 75]) {
    const [x1, y1] = at(h, R - 6);
    const [x2, y2] = at(h, R + 6);
    const [lx, ly] = at(h, R + 50);
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#adb5bd" stroke-width="2"/>`);
    // A server's own position, beside it, says it better than a mark next to it.
    if (m.nodes.every((n) => Math.min(Math.abs(n.h - h), 100 - Math.abs(n.h - h)) > 4)) parts.push(tx(lx, ly + 4, String(h), { size: 11, mono: true, color: MUTED }));
  }

  // The keys, inside the ring.
  m.keys.forEach((key, i) => {
    const [x, y] = at(key.h, R - 44);
    const node = m.nodes.find((n) => n.id === key.at)!;
    const id = `k${i}`;
    const moving = e === "move" && m.pending.includes(i);
    const color = COLORS[node.s];
    const [dx, dy] = at(key.h, R);
    parts.push(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${dx.toFixed(1)}" y2="${dy.toFixed(1)}" stroke="${color}" stroke-width="1" stroke-dasharray="2 2"/>`);
    parts.push(`<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="3" fill="${color}"/>`);
    parts.push(box(x - 18, y - 15, 36, 30, glow(id, "#fff"), lit(id) ? ORANGE : moving ? ORANGE : color, false, moving ? 2.4 : 1.4, 8));
    parts.push(tx(x, y - 2, key.k, { size: 11, bold: true, color }));
    parts.push(tx(x, y + 11, String(key.h), { size: 10, mono: true, color }));
    spots.push({ id, x: x - 18, y: y - 15, w: 36, h: 30, from: e === "move", to: false, label: `key ${key.k} at ${key.h}, on ${key.at}` });
  });

  // The nodes, on the ring.
  for (const n of m.nodes) {
    const [x, y] = at(n.h, R);
    const [lx, ly] = at(n.h, R + 30);
    const id = `n${n.id}`;
    const out = m.leaving === n.s;
    const color = COLORS[n.s];
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="17" fill="${glow(id, out ? "#fff5f5" : "#fff")}" stroke="${lit(id) ? ORANGE : out ? RED : color}" stroke-width="3"${out ? ` stroke-dasharray="4 3"` : ""}/>`);
    parts.push(tx(x, y + 5, n.id, { size: n.id.length > 1 ? 12 : 15, bold: true, color: out ? RED : color }));
    parts.push(tx(lx, ly + 4, String(n.h), { size: 11, mono: true, bold: true, color: MUTED }));
    spots.push({ id, x: x - 17, y: y - 17, w: 34, h: 34, from: false, to: true, label: `server ${n.id} at ${n.h}${out ? ", leaving" : ""}` });
  }

  // On the left: ring[] sorted, and what happens now.
  parts.push(tx(16, 24, "ring[]", { size: 14, anchor: "start", bold: true, mono: true }));
  [...m.nodes].sort((a, b) => a.h - b.h).forEach((n, i) => {
    parts.push(tx(16, 46 + i * 18, `${String(n.h).padStart(2, " ")}  ${n.id}${m.leaving === n.s ? " ✕" : ""}`, { size: 13, anchor: "start", mono: true, bold: true, color: m.leaving === n.s ? RED : COLORS[n.s] }));
  });
  const y0 = 46 + m.nodes.length * 18 + 16;
  if (e === "place") {
    const ev = t.events[m.e] as Extract<RingEvent, { kind: "key" }>;
    parts.push(tx(16, y0, "next key", { size: 12, anchor: "start", mono: true, color: MUTED }));
    parts.push(box(16, y0 + 8, 116, 48, glow("new", "#fff4e6"), ORANGE, false, 2.4, 10));
    parts.push(tx(74, y0 + 28, ev.k, { size: 16, bold: true }));
    parts.push(tx(74, y0 + 47, `hash = ${ev.h}`, { size: 12, mono: true, color: COLORS[0] }));
    spots.push({ id: "new", x: 16, y: y0 + 8, w: 116, h: 48, from: true, to: false, label: `new key ${ev.k}, hash ${ev.h}` });
  } else if (e === "move") {
    const ev = t.events[m.e] as Exclude<RingEvent, { kind: "key" }>;
    const text = ev.kind === "add" ? `${serverName(ev.s)} joins @ ${ev.h}` : `${serverName(ev.s)} leaves`;
    parts.push(box(16, y0 + 8, 116, 48, ev.kind === "add" ? "#ebfbee" : "#fff5f5", ev.kind === "add" ? COLORS[ev.s] : RED, false, 2, 10));
    parts.push(tx(74, y0 + 30, text, { size: 13, bold: true, mono: true, color: ev.kind === "add" ? COLORS[ev.s] : RED }));
    parts.push(tx(74, y0 + 47, "move its keys", { size: 11, mono: true, color: MUTED }));
  } else parts.push(tx(16, y0 + 30, "— all done —", { size: 13, anchor: "start", mono: true, color: COLORS[1] }));
  parts.push(tx(16, CY + R + 40, "↻ clockwise: 0 → 99 → 0", { size: 11, anchor: "start", mono: true, color: MUTED }));
  return { w: CX + R + 70, h: CY + R + 60, body: parts.join(""), spots };
}
