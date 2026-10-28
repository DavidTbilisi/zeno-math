// Be the heap: the player is the computer keeping a min-heap in an array, one operation at a time. The heap is drawn
// twice, as heap[] with its indexes and as the tree it stands for (the children of i at 2i + 1 and 2i + 2), and every
// change is a drag: a new value onto the end of the array, a value swapped with its parent or child as it sifts up or
// down, the root taken out, the last leaf moved into the hole at the root. Four patterns: push values in turn (each
// climbs while its parent is bigger), pop the smallest until the heap is empty (out[] comes out sorted: heap sort),
// heapify an array in place (s walks back from the last parent, each value sinking while a child is smaller), and the
// k-th largest with a heap that keeps only the k largest so far (a bigger value replaces the root and sinks, a smaller
// one is skipped). Each operation the player makes is checked against the code; a wrong one is not made and says the
// rule it broke. Kept free of React: the board keeps only the operations made so far, and the machine is the replay.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type HeapAlgo = "push" | "pop" | "heapify" | "topK";
export const HEAP_ALGOS: readonly HeapAlgo[] = ["push", "pop", "heapify", "topK"];
export type HeapLevel = 1 | 2 | 3;
/** The values: to push (push, topK), the heap to empty (pop), the array to heapify; and k for topK, else 0. */
export type HeapTask = { algo: HeapAlgo; a: number[]; k: number };

export type HeapNotice = "toRoot" | "heapSort" | "linear" | "kept" | "streak10";
export const HEAP_NOTICES: HeapNotice[] = ["toRoot", "heapSort", "linear", "kept", "streak10"];

/** A line of the step log, as code. */
export type HeapLog =
  | { op: "start" }
  | { op: "append"; v: number; at: number }
  | { op: "swap"; i: number; j: number; vi: number; vj: number }
  | { op: "take"; v: number; out: number[] }
  | { op: "fill"; v: number }
  | { op: "next"; s: number }
  | { op: "replace"; v: number; was: number }
  | { op: "skip"; v: number; root: number }
  | { op: "return"; v: number };

/**
 * The machine's memory after some operations: the heap (null at the root between taking it and filling the hole), the
 * next value to read (j), out[], the index being sifted and which way, s (heapify's loop, null before), what the code
 * returned, the swaps so far, the swaps of the sift running, the values skipped, the lines the last operation ran, the
 * log, and what the run has shown.
 */
export type HeapMachine = {
  task: HeapTask;
  heap: (number | null)[];
  j: number;
  out: number[];
  cur: number | null;
  dir: "up" | "down" | null;
  s: number | null;
  ret: number | null;
  swaps: number;
  climb: number;
  skips: number;
  lines: number[];
  log: HeapLog[];
  seen: HeapNotice[];
};

export const parent = (i: number) => (i - 1) >> 1;

export function startMachine(task: HeapTask): HeapMachine {
  const heap = task.algo === "pop" || task.algo === "heapify" ? [...task.a] : [];
  return { task, heap, j: 0, out: [], cur: null, dir: null, s: null, ret: null, swaps: 0, climb: 0, skips: 0, lines: [0], log: [{ op: "start" }], seen: [] };
}

/** How many cells heap[] can need: k for topK, else n. */
export const capacity = (t: HeapTask) => (t.algo === "topK" ? t.k : t.a.length);

/** The index the value being sifted swaps with next, or null when the sift is over (or none runs). */
export function partner(m: HeapMachine): number | null {
  const { heap: h, cur } = m;
  if (cur === null || h[0] === null) return null;
  if (m.dir === "up") return cur > 0 && h[parent(cur)]! > h[cur]! ? parent(cur) : null;
  const [l, r] = [2 * cur + 1, 2 * cur + 2];
  if (l >= h.length) return null;
  const c = r < h.length && h[r]! < h[l]! ? r : l;
  return h[c]! < h[cur]! ? c : null;
}

/** Where s goes next in heapify: the last parent first, then one step back. */
export const nextS = (m: HeapMachine) => (m.s === null ? (m.heap.length >> 1) - 1 : m.s - 1);

/** The operations, by code. */
export const OPS = ["append", "swap", "take", "fill", "next", "replace", "skip", "return"] as const;
export type HeapOp = (typeof OPS)[number];

/** What the code does next; null when it is done. */
export function expect(m: HeapMachine): HeapOp | null {
  if (m.ret !== null) return null;
  if (partner(m) !== null) return "swap";
  const { algo, a, k } = m.task;
  const h = m.heap;
  if (algo === "push") return m.j < a.length ? "append" : null;
  if (algo === "pop") return h.length === 0 ? null : h[0] === null ? "fill" : "take";
  if (algo === "heapify") return nextS(m) >= 0 ? "next" : null;
  if (m.j === a.length) return "return";
  if (h.length < k) return "append";
  return a[m.j] > h[0]! ? "replace" : "skip";
}

const LINE: Record<HeapAlgo, Partial<Record<HeapOp, number[]>>> = {
  push: { append: [1, 2], swap: [3, 4] },
  pop: { take: [1, 2], fill: [3], swap: [4, 5] },
  heapify: { next: [1, 2], swap: [3, 4] },
  topK: { append: [1, 2], replace: [3], skip: [4], return: [5] },
};

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: HeapMachine, code: number): HeapMachine {
  const m: HeapMachine = { ...m0, heap: [...m0.heap], out: [...m0.out], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: HeapNotice) => m.seen.includes(k) || m.seen.push(k);
  const op = OPS[code];
  const { algo, a } = m.task;
  const h = m.heap;
  m.lines = op === "swap" && algo === "topK" ? (m.dir === "up" ? [2] : [3]) : LINE[algo][op]!;
  if (op === "append") {
    h.push(a[m.j]);
    m.log.push({ op: "append", v: a[m.j], at: h.length - 1 });
    m.j++;
    [m.cur, m.dir, m.climb] = [h.length - 1, "up", 0];
  } else if (op === "swap") {
    const p = partner(m)!;
    const i = m.cur!;
    [h[i], h[p]] = [h[p], h[i]];
    m.log.push({ op: "swap", i, j: p, vi: h[i]!, vj: h[p]! });
    m.cur = p;
    m.swaps++;
    m.climb++;
    if (algo === "push" && p === 0 && m.climb >= 2) see("toRoot");
  } else if (op === "take") {
    m.out.push(h[0]!);
    if (h.length === 1) h.pop();
    else h[0] = null;
    m.log.push({ op: "take", v: m.out[m.out.length - 1], out: [...m.out] });
    [m.cur, m.dir] = [null, null];
  } else if (op === "fill") {
    h[0] = h.pop()!;
    m.log.push({ op: "fill", v: h[0] });
    [m.cur, m.dir, m.climb] = [0, "down", 0];
  } else if (op === "next") {
    m.s = nextS(m);
    m.log.push({ op: "next", s: m.s });
    [m.cur, m.dir, m.climb] = [m.s, "down", 0];
  } else if (op === "replace") {
    m.log.push({ op: "replace", v: a[m.j], was: h[0]! });
    h[0] = a[m.j];
    m.j++;
    [m.cur, m.dir, m.climb] = [0, "down", 0];
  } else if (op === "skip") {
    m.log.push({ op: "skip", v: a[m.j], root: h[0]! });
    m.j++;
    m.skips++;
    [m.cur, m.dir] = [null, null];
  } else {
    m.ret = h[0]!;
    m.log.push({ op: "return", v: m.ret });
    if (m.skips >= 2) see("kept");
  }
  if (expect(m) === null) {
    if (algo === "pop") see("heapSort");
    if (algo === "heapify" && m.swaps < a.length) see("linear");
  }
  return m;
}

export function heapRun(task: HeapTask): { ops: number[]; end: HeapMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: HeapTask, ops: number[]): HeapMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/**
 * What the player tried: the next value put on heap[to] or into the skip bin, a node dragged onto another (a swap, or
 * the last leaf into the hole), heap[from] taken into out[] or into return, s moved onto index `to`.
 */
export type HeapAttempt =
  | { kind: "put"; to: number }
  | { kind: "skip" }
  | { kind: "node"; from: number; to: number }
  | { kind: "take"; from: number }
  | { kind: "next"; to: number }
  | { kind: "return"; from: number };
export type HeapWhy =
  | "siftFirst" | "notFamily" | "follow" | "upParent" | "downChild" | "smallerChild" | "inOrder" | "atEnd" | "rootOnly"
  | "fillFirst" | "lastFills" | "lastParent" | "downByOne" | "moveS" | "notFull" | "full" | "bigger" | "skipSmall"
  | "returnEarly";
export type HeapCheck = { ok: true; code: number } | { ok: false; why: HeapWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: HeapMachine, at: HeapAttempt): HeapCheck {
  const e = expect(m);
  const no = (why: HeapWhy, vars: Record<string, string | number> = {}): HeapCheck => ({ ok: false, why, vars });
  const ok = (op: HeapOp): HeapCheck => ({ ok: true, code: OPS.indexOf(op) });
  const { a, k } = m.task;
  const h = m.heap;
  const x = a[m.j];
  if (e === "swap") {
    const p = partner(m)!;
    const i = m.cur!;
    if (at.kind !== "node") return m.dir === "up" ? no("siftFirst", { hi: h[p]!, lo: h[i]! }) : no("siftFirst", { hi: h[i]!, lo: h[p]! });
    const [lo, hi] = [Math.min(at.from, at.to), Math.max(at.from, at.to)];
    if (lo === Math.min(i, p) && hi === Math.max(i, p)) return ok("swap");
    if (parent(hi) !== lo) return no("notFamily", { i: at.from, j: at.to });
    if (lo !== i && hi !== i) return no("follow", { i, v: h[i]! });
    const other = lo === i ? hi : lo;
    if (m.dir === "up") return no("upParent", { v: h[i]!, w: h[parent(i)]! });
    if (other === parent(i)) return no("downChild", { v: h[i]!, c: h[p]! });
    return no("smallerChild", { c: h[p]!, w: h[other]! });
  }
  if (e === "fill") {
    if (at.kind === "node" && at.to === 0) return at.from === h.length - 1 ? ok("fill") : no("lastFills", { v: h[h.length - 1]!, at: h.length - 1 });
    return no("fillFirst");
  }
  if (at.kind === "node") return e === "next" ? no("moveS", { s: nextS(m) }) : no("inOrder");
  if (at.kind === "put") {
    if (e === "append") return at.to === h.length ? ok("append") : no("atEnd", { n: h.length });
    if (e === "replace") return at.to === 0 ? ok("replace") : no("full", { k, x, root: h[0]! });
    // A value is still to read (the board offers it only then), so the code skips it.
    return no("skipSmall", { x, root: h[0]! });
  }
  if (at.kind === "skip") {
    if (e === "skip") return ok("skip");
    // Likewise: the heap is short of k, or the value replaces the root.
    return e === "append" ? no("notFull", { size: h.length, k }) : no("bigger", { x, root: h[0]! });
  }
  if (at.kind === "take") return e !== "take" ? no("inOrder") : at.from === 0 ? ok("take") : no("rootOnly", { root: h[0]! });
  if (at.kind === "next") {
    if (e !== "next") return no("inOrder");
    if (at.to === nextS(m)) return ok("next");
    return m.s === null ? no("lastParent", { s: nextS(m), n: h.length }) : no("downByOne", { s: nextS(m) });
  }
  if (e !== "return") return no("returnEarly", { left: a.length - m.j });
  return at.from === 0 ? ok("return") : no("rootOnly", { root: h[0]! });
}

// ---------- the tasks ----------

type Spec = { algo: HeapAlgo | null; n: number; k?: number; need?: HeapNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));
/** n different numbers from 1 to 39, in a random order. */
function values(n: number, next: () => number): number[] {
  const xs: number[] = [];
  while (xs.length < n) {
    const v = int(1, 39, next);
    if (!xs.includes(v)) xs.push(v);
  }
  return xs;
}
/** The heap pushing xs in turn gives. */
const built = (xs: number[]) => heapRun({ algo: "push", a: xs, k: 0 }).end.heap as number[];

/**
 * A task worth playing: at least eight operations (but for heapify, whose s steps are few) and three swaps (at least n / 2 for a push or heapify), and for topK at least two values
 * replacing the root and two skipped. `need` asks for a run that shows something.
 */
export function heapTask(spec: Spec, next: () => number): HeapTask {
  const algo = spec.algo ?? pick(HEAP_ALGOS, next);
  for (;;) {
    const xs = values(spec.n, next);
    const t: HeapTask = algo === "pop" ? { algo, a: built(xs), k: 0 } : { algo, a: xs, k: algo === "topK" ? (spec.k ?? 3) : 0 };
    const { ops, end } = heapRun(t);
    const count = (op: HeapOp) => ops.filter((c) => OPS[c] === op).length;
    if ((algo !== "heapify" && ops.length < 8) || count("swap") < Math.max(3, algo === "push" || algo === "heapify" ? spec.n >> 1 : 0)) continue;
    if (algo === "topK" && (count("replace") < 2 || count("skip") < 2)) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const HEAP_LADDER: (Spec & { seed: number })[] = [
  { algo: "push", n: 6, seed: 2801 },
  { algo: "pop", n: 5, seed: 2802 },
  { algo: "heapify", n: 7, need: "linear", seed: 2803 },
  { algo: "topK", n: 8, k: 3, need: "kept", seed: 2804 },
  { algo: "push", n: 8, need: "toRoot", seed: 2805 },
  { algo: "pop", n: 7, seed: 2806 },
  { algo: "heapify", n: 10, seed: 2807 },
  { algo: "topK", n: 11, k: 4, seed: 2808 },
  { algo: "pop", n: 9, seed: 2809 },
];
/** The endless run: easy, a push or a pop of five or six; medium, any of the four on seven or eight; hard, on nine to eleven. */
export function levelSpec(level: HeapLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["push", "pop"] as const, next), n: int(5, 6, next) };
  const algo = pick(HEAP_ALGOS, next);
  const n = level === 2 ? int(7, 8, next) : int(9, 11, next);
  return { algo, n: algo === "pop" ? Math.min(n, 9) : n, k: level === 2 ? 3 : 4 };
}

export const heapStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function heapNotice(m: HeapMachine, misses: number, streak: number): HeapNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (HEAP_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeHeap = EndlessGame<HeapNotice, HeapLevel, { kind: "wrong"; why: HeapWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function heapNow(d: Pick<LiveBeHeap, "mode" | "stage" | "level" | "seed">): HeapTask {
  if (d.mode === "puzzle") {
    const s = HEAP_LADDER[d.stage];
    return heapTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return heapTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<HeapAlgo, string[]> = {
  push: ["heap = []", "for x in a:", "  heap.append(x); i = len(heap) − 1", "  while i > 0 and heap[(i − 1) // 2] > heap[i]:", "    swap(i, (i − 1) // 2); i = (i − 1) // 2"],
  pop: ["out = []   # heap is a min-heap", "while heap:", "  out.append(heap[0])", "  heap[0] = heap.pop(); i = 0   # if any are left", "  while heap[c] < heap[i], c the smaller child of i:", "    swap(i, c); i = c"],
  heapify: ["# make heap[] a min-heap in place", "for s in range(n // 2 − 1, −1, −1):", "  i = s", "  while heap[c] < heap[i], c the smaller child of i:", "    swap(i, c); i = c"],
  topK: ["heap = []   # the k largest so far, the smallest on top", "for x in a:", "  if len(heap) < k: heap.append(x); sift up", "  elif x > heap[0]: heap[0] = x; sift down", "  else: skip x", "return heap[0]"],
};

export function logText(l: HeapLog, t: HeapTask): string {
  switch (l.op) {
    case "start":
      return CODE[t.algo][0];
    case "append":
      return `heap.append(${l.v}) → heap[${l.at}] = ${l.v}`;
    case "swap":
      return `swap(${l.i}, ${l.j}): heap[${l.i}] = ${l.vi}, heap[${l.j}] = ${l.vj}`;
    case "take":
      return `out.append(${l.v}) → out = [${l.out.join(", ")}]`;
    case "fill":
      return `heap[0] = heap.pop() = ${l.v}`;
    case "next":
      return `s = ${l.s}; i = ${l.s}`;
    case "replace":
      return `${l.v} > heap[0] = ${l.was}: heap[0] = ${l.v}`;
    case "skip":
      return `${l.v} ≤ heap[0] = ${l.root}: skip`;
    case "return":
      return `return heap[0] = ${l.v}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a node (t, in the tree; h, in heap[]), the next value (x), s, out, skip, return. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type HeapPic = { w: number; h: number; body: string; spots: Spot[] };

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

/**
 * The machine drawn as a computer keeps it: the values still to read with the next one framed (push, topK), the tree
 * the heap stands for, heap[] with its indexes and i under the value being sifted (s under it for heapify), the hole at
 * the root dashed orange, out[], the skip bin and return. `hot` lights the spot a drag is over and `sel` the one picked
 * up.
 */
export function heapSvg(m: HeapMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): HeapPic {
  const t = m.task;
  const { algo, a, k } = t;
  const h = m.heap;
  const cap = capacity(t);
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const e = expect(m);
  const col = (x: number) => LEFT + x * STEP;
  const reads = algo === "push" || algo === "topK";

  if (algo === "topK") parts.push(tx(16, 26, `k = ${k}`, { size: 18, anchor: "start", bold: true, mono: true, color: ORANGE }));
  parts.push(tx(algo === "topK" ? 90 : 16, 26, `n = ${a.length}`, { size: 14, anchor: "start", mono: true, color: MUTED }));

  let y = 44;
  if (reads) {
    // The values to read, those read grey, the next one framed and dragged.
    const cy = y + 16;
    parts.push(tx(LEFT - 12, cy + 25, "a[]", { size: 14, anchor: "end", bold: true, mono: true }));
    a.forEach((v, i) => {
      const next = i === m.j && live;
      parts.push(tx(col(i) + CELL / 2, y + 8, String(i), { size: 11, color: MUTED, mono: true }));
      parts.push(box(col(i), cy, CELL, CELL, next ? glow("x", "#fff4e6") : i < m.j ? "#f1f3f5" : "#fff", next ? ORANGE : i < m.j ? "#dee2e6" : "#868e96", false, next ? 2.4 : 1.6));
      parts.push(tx(col(i) + CELL / 2, cy + 25, String(v), { size: 16, bold: true, color: i < m.j ? "#adb5bd" : INK }));
      if (next) spots.push({ id: "x", x: col(i), y: cy, w: CELL, h: CELL, from: true, to: false, label: `x = a[${i}] = ${v}` });
    });
    if (m.j < a.length && live) parts.push(tx(col(a.length) + 8, cy + 25, `x = ${a[m.j]}`, { size: 14, anchor: "start", mono: true, bold: true, color: ORANGE }));
    y = cy + CELL + 22;
  }

  // The tree: node i at depth ⌊log2(i + 1)⌋, the next free place dashed.
  const depth = Math.max(1, Math.ceil(Math.log2(cap + 1)));
  const width = Math.max(2 ** (depth - 1) * 46, (cap - 1) * STEP + CELL);
  const top = y + R + 4;
  const at = (i: number): [number, number] => {
    const lvl = Math.floor(Math.log2(i + 1));
    const pos = i - (2 ** lvl - 1);
    return [LEFT + ((pos + 0.5) * width) / 2 ** lvl, top + lvl * 58];
  };
  const showNext = reads && h.length < cap && live;
  const nodes = h.length + (showNext ? 1 : 0);
  for (let i = 1; i < nodes; i++) {
    const [x1, y1] = at(parent(i));
    const [x2, y2] = at(i);
    parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${i < h.length ? "#adb5bd" : "#dee2e6"}" stroke-width="2"${i < h.length ? "" : ` stroke-dasharray="4 3"`}/>`);
  }
  for (let i = 0; i < nodes; i++) {
    const [x, yy] = at(i);
    const id = `t${i}`;
    const v = h[i];
    const free = i >= h.length || v === null;
    const sifting = i === m.cur && live;
    const stroke = lit(id) ? ORANGE : free ? (v === null && i === 0 ? ORANGE : "#adb5bd") : sifting ? ORANGE : o.finished ? GREEN : BLUE;
    parts.push(`<circle cx="${x}" cy="${yy}" r="${R}" fill="${glow(id, free ? "#fff" : sifting ? "#fff4e6" : "#e7f5ff")}" stroke="${stroke}" stroke-width="${sifting || lit(id) ? 2.6 : 1.8}"${free ? ` stroke-dasharray="4 3"` : ""}/>`);
    if (!free) parts.push(tx(x, yy + 5, String(v), { size: 15, bold: true }));
    parts.push(tx(x + R + 2, yy - R + 4, String(i), { size: 10, anchor: "start", color: MUTED, mono: true }));
    spots.push({ id, x: x - R, y: yy - R, w: 2 * R, h: 2 * R, from: live && !free, to: true, label: free ? `node ${i}, empty` : `node ${i} = ${v}` });
  }
  y = top + (depth - 1) * 58 + R + 22;

  // heap[] with its indexes, i under the value being sifted and s for heapify.
  const cy = y + 14;
  parts.push(tx(LEFT - 12, cy + 25, "heap[]", { size: 14, anchor: "end", bold: true, mono: true }));
  for (let i = 0; i < cap; i++) {
    const id = `h${i}`;
    const v = h[i];
    const free = i >= h.length || v === null;
    const sifting = i === m.cur && live;
    parts.push(tx(col(i) + CELL / 2, y + 8, String(i), { size: 11, color: MUTED, mono: true }));
    parts.push(box(col(i), cy, CELL, CELL, glow(id, free ? "#fff" : sifting ? "#fff4e6" : "#e7f5ff"), lit(id) ? ORANGE : free ? (v === null && i === 0 ? ORANGE : "#ced4da") : sifting ? ORANGE : BLUE, free, 2));
    if (!free) parts.push(tx(col(i) + CELL / 2, cy + 25, String(v), { size: 16, bold: true }));
    spots.push({ id, x: col(i), y: cy, w: CELL, h: CELL, from: live && !free, to: true, label: free ? `heap[${i}], empty` : `heap[${i}] = ${v}` });
  }
  y = cy + CELL + 8;
  const chip = (x: number, yy: number, s: string, id: string | null) => {
    parts.push(box(x - 15, yy, 30, 24, id ? glow(id, "#fff") : "#fff", id && lit(id) ? ORANGE : BLUE, false, 2, 12));
    parts.push(tx(x, yy + 17, s, { size: 14, bold: true, mono: true, color: BLUE }));
  };
  if (m.cur !== null && live) chip(col(m.cur) + CELL / 2, y, "i", null);
  parts.push(tx(col(cap) + 8, y + 17, m.cur !== null && live ? `i = ${m.cur}` : "", { size: 13, anchor: "start", mono: true, bold: true, color: BLUE }));
  y += 32;
  if (algo === "heapify") {
    const sx = m.s === null ? LEFT - 40 : col(m.s) + CELL / 2;
    chip(sx, y, "s", "s");
    spots.push({ id: "s", x: sx - 15, y, w: 30, h: 24, from: live, to: false, label: m.s === null ? "s" : `s = ${m.s}` });
    parts.push(tx(col(cap) + 8, y + 17, `s = ${m.s ?? "?"}`, { size: 13, anchor: "start", mono: true, bold: true, color: BLUE }));
    y += 34;
  }

  if (algo === "pop") {
    const oy = y + 18;
    parts.push(tx(LEFT - 12, oy + 25, "out[]", { size: 14, anchor: "end", bold: true, mono: true }));
    parts.push(box(col(0) - 4, oy - 4, a.length * STEP + 4, CELL + 8, glow("out", "#fff"), lit("out") ? ORANGE : e === "take" ? ORANGE : "#ced4da", true, 1.6, 6));
    m.out.forEach((v, i) => {
      parts.push(box(col(i), oy, CELL, CELL, "#d3f9d8", GREEN, false, 1.8));
      parts.push(tx(col(i) + CELL / 2, oy + 25, String(v), { size: 16, bold: true }));
    });
    spots.push({ id: "out", x: col(0) - 4, y: oy - 4, w: a.length * STEP + 4, h: CELL + 8, from: false, to: true, label: "out" });
    y = oy + CELL + 20;
  }
  if (algo === "topK") {
    const by = y + 8;
    parts.push(box(16, by, 76, 40, glow("skip", "#fff"), lit("skip") ? ORANGE : "#adb5bd", true, 1.8, 8));
    parts.push(tx(54, by + 26, "skip ✕", { size: 14, bold: true, mono: true, color: MUTED }));
    spots.push({ id: "skip", x: 16, y: by, w: 76, h: 40, from: false, to: true, label: "skip" });
    parts.push(tx(120, by + 26, "return", { size: 16, anchor: "start", mono: true, bold: true }));
    const rl = lit("ret");
    const got = m.ret !== null;
    parts.push(box(196, by, 60, 40, rl === "hot" ? "#fff3bf" : got ? "#d3f9d8" : "#fff", rl ? ORANGE : got ? GREEN : e === "return" ? ORANGE : "#adb5bd", !got, rl || e === "return" ? 2.4 : 1.6));
    if (got) parts.push(tx(226, by + 27, String(m.ret), { size: 18, bold: true, color: o.finished ? GREEN : INK }));
    spots.push({ id: "ret", x: 196, y: by, w: 60, h: 40, from: false, to: true, label: "return" });
    y = by + 56;
  }
  const w = Math.max(col(Math.max(cap, reads ? a.length : 0)) + 90, LEFT + width + 40, 420);
  return { w, h: y + 6, body: parts.join(""), spots };
}
