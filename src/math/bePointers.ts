// Be the two pointers: the player is the computer running a two-pointer scan, one operation at a time, by moving the
// pointers the code keeps. Three patterns: the pair sum (i and j from the two ends of a sorted array, i right when
// a[i] + a[j] is too small, j left when it is too big, until it hits t or they meet), the container with the most
// water (i and j from the ends, best = max(best, area), then the shorter side moves in) and removing repeats from a
// sorted array in place (i reads, k writes: a new value is copied to a[k] and k moves on, a repeat is skipped). Each
// operation the player makes is checked against the code; a wrong one is not made and says the rule it broke. Kept
// free of React: the board keeps only the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type PtrAlgo = "pairSum" | "water" | "dedupe";
export const PTR_ALGOS: readonly PtrAlgo[] = ["pairSum", "water", "dedupe"];
export type PtrLevel = 1 | 2 | 3;
/** The array, and the target t of the pair sum (0 for the others). */
export type PtrTask = { algo: PtrAlgo; a: number[]; t: number };

export type PtrNotice = "noPair" | "linear" | "tie" | "inPlace" | "streak10";
export const PTR_NOTICES: PtrNotice[] = ["noPair", "linear", "tie", "inPlace", "streak10"];

/** A line of the step log, as code. */
export type PtrLog =
  | { op: "start"; text: string }
  | { op: "sum"; x: number; y: number; t: number; p: "i" | "j"; to: number }
  | { op: "water"; i: number; j: number; hi: number; hj: number; p: "i" | "j"; to: number }
  | { op: "best"; was: number; w: number; h: number; v: number }
  | { op: "write"; k: number; i: number; v: number }
  | { op: "skip"; i: number; v: number; to: number; repeat: boolean }
  | { op: "return"; text: string };

/**
 * The machine's memory after some operations: the pointers (dedupe has i and k; the others i and j), the array as it
 * is now (dedupe writes into it), best (water), what the code returned (null before; the pair sum returns i, or −1),
 * the code lines the last operation ran, the log, and what the run has shown.
 */
export type PtrMachine = {
  task: PtrTask;
  i: number;
  j: number;
  k: number;
  w: number[];
  best: number;
  ret: number | null;
  lines: number[];
  log: PtrLog[];
  seen: PtrNotice[];
};

export function startMachine(task: PtrTask): PtrMachine {
  const n = task.a.length;
  const dedupe = task.algo === "dedupe";
  const text = dedupe ? "k = 1; i = 1" : task.algo === "water" ? `i = 0; j = ${n - 1}; best = 0` : `i = 0; j = ${n - 1}`;
  return { task, i: dedupe ? 1 : 0, j: n - 1, k: 1, w: [...task.a], best: 0, ret: null, lines: [0], log: [{ op: "start", text }], seen: [] };
}

/** The water between i and j: the width times the shorter side. */
export const area = (m: Pick<PtrMachine, "i" | "j" | "w">) => (m.j - m.i) * Math.min(m.w[m.i], m.w[m.j]);
/** The pair sum's s = a[i] + a[j]. */
export const sum = (m: Pick<PtrMachine, "i" | "j" | "w">) => m.w[m.i] + m.w[m.j];

/** The operations, by code: move i, move j, take the area as best, write a[i] at a[k], return. */
export const OPS = ["i", "j", "best", "write", "return"] as const;
export type PtrOp = (typeof OPS)[number];

/** What the code does next; null when it has returned. */
export function expect(m: PtrMachine): PtrOp | null {
  if (m.ret !== null) return null;
  const { algo, t } = m.task;
  if (algo === "dedupe") return m.i >= m.w.length ? "return" : m.w[m.i] !== m.w[m.k - 1] ? "write" : "i";
  if (m.i >= m.j) return "return";
  if (algo === "pairSum") return sum(m) === t ? "return" : sum(m) < t ? "i" : "j";
  return area(m) > m.best ? "best" : m.w[m.i] < m.w[m.j] ? "i" : "j";
}
/** What the code returns: the pair sum i (or −1), the most water, the count of values kept. */
export const returned = (m: PtrMachine) => (m.task.algo === "dedupe" ? m.k : m.task.algo === "water" ? m.best : m.i < m.j ? m.i : -1);

const LINE: Record<PtrAlgo, Partial<Record<PtrOp | "none", number[]>>> = {
  pairSum: { i: [2, 4], j: [2, 5], return: [2, 3], none: [6] },
  water: { best: [2], i: [3], j: [4], return: [5] },
  dedupe: { write: [2, 3], i: [1], return: [4] },
};

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: PtrMachine, code: number): PtrMachine {
  const m: PtrMachine = { ...m0, w: [...m0.w], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: PtrNotice) => m.seen.includes(k) || m.seen.push(k);
  const op = OPS[code];
  const { algo, t } = m.task;
  const n = m.w.length;
  m.lines = LINE[algo][op] ?? [];
  if (op === "return") {
    m.ret = returned(m);
    if (algo === "pairSum") {
      if (m.ret < 0) {
        m.lines = LINE.pairSum.none!;
        see("noPair");
        m.log.push({ op: "return", text: `i = ${m.i}, j = ${m.j}: return −1` });
      } else {
        if (n >= 10) see("linear");
        m.log.push({ op: "return", text: `s = ${m.w[m.i]} + ${m.w[m.j]} == ${t}: return (${m.i}, ${m.j})` });
      }
    } else m.log.push({ op: "return", text: `return ${algo === "water" ? "best" : "k"} = ${m.ret}` });
    if (algo === "dedupe" && n - m.k >= 3) see("inPlace");
  } else if (op === "best") {
    const v = area(m);
    m.log.push({ op: "best", was: m.best, w: m.j - m.i, h: Math.min(m.w[m.i], m.w[m.j]), v });
    m.best = v;
  } else if (op === "write") {
    m.log.push({ op: "write", k: m.k, i: m.i, v: m.w[m.i] });
    m.w[m.k] = m.w[m.i];
    m.k++;
  } else if (algo === "dedupe") {
    m.log.push({ op: "skip", i: m.i, v: m.w[m.i], to: m.i + 1, repeat: m.log.at(-1)?.op !== "write" });
    m.i++;
  } else {
    const to = op === "i" ? m.i + 1 : m.j - 1;
    if (algo === "pairSum") m.log.push({ op: "sum", x: m.w[m.i], y: m.w[m.j], t, p: op as "i" | "j", to });
    else {
      if (m.w[m.i] === m.w[m.j]) see("tie");
      m.log.push({ op: "water", i: m.i, j: m.j, hi: m.w[m.i], hj: m.w[m.j], p: op as "i" | "j", to });
    }
    if (op === "i") m.i = to;
    else m.j = to;
  }
  return m;
}

export function ptrRun(task: PtrTask): { ops: number[]; end: PtrMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: PtrTask, ops: number[]): PtrMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/** What the player tried: a pointer dragged to index `to`, a[from] copied onto a[to], the area into best, a chip into return. */
export type PtrAttempt =
  | { kind: "move"; p: "i" | "j" | "k"; to: number }
  | { kind: "write"; from: number; to: number }
  | { kind: "best" }
  | { kind: "return"; what: "pair" | "none" | "best" | "k" };
export type PtrWhy =
  | "oneStep" | "returnEarly" | "returnWhat"
  | "sumSmall" | "sumBig" | "sumHit" | "notYetPair" | "noneEarly" | "metNone"
  | "bestFirst" | "bestNot" | "shorter" | "tieJ" | "waterEnd"
  | "repeat" | "newValue" | "writeFrom" | "writeAt" | "kMoves" | "dedupeEnd";
export type PtrCheck = { ok: true; code: number } | { ok: false; why: PtrWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: PtrMachine, a: PtrAttempt): PtrCheck {
  const e = expect(m);
  const no = (why: PtrWhy, vars: Record<string, string | number> = {}): PtrCheck => ({ ok: false, why, vars });
  const ok = (op: PtrOp): PtrCheck => ({ ok: true, code: OPS.indexOf(op) });
  const { algo, t } = m.task;
  const { i, j, k, w } = m;
  const cond = algo === "dedupe" ? `i = ${i} < n` : `i = ${i} < j = ${j}`;
  // The run is over: nothing more to do (the board never asks).
  if (!e) return no("returnEarly", { cond });
  if (a.kind === "return") {
    if (e === "return") {
      const want = algo === "dedupe" ? "k" : algo === "water" ? "best" : returned(m) < 0 ? "none" : "pair";
      if (a.what === want) return ok("return");
      const what = want === "k" ? `k = ${k}` : want === "best" ? `best = ${m.best}` : want === "none" ? "−1" : `(i, j) = (${i}, ${j})`;
      return no("returnWhat", { what });
    }
    if (algo === "pairSum" && a.what === "pair") return no("notYetPair", { s: sum(m), t });
    if (algo === "pairSum" && a.what === "none") return no("noneEarly", { i, j });
    return no("returnEarly", { cond });
  }
  const end = () => (algo === "dedupe" ? no("dedupeEnd", { k }) : algo === "water" ? no("waterEnd", { best: m.best }) : returned(m) < 0 ? no("metNone", { t }) : no("sumHit", { s: sum(m), t }));
  if (a.kind === "best") {
    if (e === "best") return ok("best");
    return e === "return" ? end() : no("bestNot", { area: area(m), best: m.best });
  }
  if (a.kind === "write") {
    if (e === "return") return end();
    if (e !== "write") return no("repeat", { v: w[i], k1: k - 1 });
    if (a.from !== i) return no("writeFrom", { i, got: a.from });
    if (a.to !== k) return no("writeAt", { k, got: a.to });
    return ok("write");
  }
  if (a.p === "k") return no("kMoves");
  if (e === "return") return end();
  if (e === "write") return no("newValue", { v: w[i], u: w[k - 1], k });
  if (e === "best") return no("bestFirst", { w: j - i, h: Math.min(w[i], w[j]), area: area(m), best: m.best });
  if (a.p !== e) {
    if (algo === "pairSum") return no(sum(m) < t ? "sumSmall" : "sumBig", { s: sum(m), t });
    if (w[i] === w[j]) return no("tieJ", { h: w[i] });
    const at = e === "i" ? i : j;
    return no("shorter", { p: e, s: at, h: w[at], o: e === "i" ? j : i, g: w[e === "i" ? j : i] });
  }
  const to = a.p === "i" ? i + 1 : j - 1;
  return a.to === to ? ok(a.p) : no("oneStep", { p: a.p, to, got: a.to, d: a.p === "i" ? "+" : "−" });
}

// ---------- the tasks ----------

type Spec = { algo: PtrAlgo | null; n: number; need?: PtrNotice; most?: number };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

/**
 * A task worth playing: the pair sum on distinct sorted numbers, with both pointers moving, more than n / 2 times in
 * all, before the pair (or the meeting); the water on heights 1–9 where best is taken at least twice and both sides move; repeats in a sorted array
 * with at least two of them and at least three values. `need` asks for a run that shows something.
 */
export function ptrTask(spec: Spec, next: () => number): PtrTask {
  const algo = spec.algo ?? pick(PTR_ALGOS, next);
  for (;;) {
    let a: number[];
    let t = 0;
    if (algo === "pairSum") {
      a = [int(1, 6, next)];
      for (let x = 1; x < spec.n; x++) a.push(a[x - 1] + int(1, 4, next));
      if (spec.need === "noPair" || (!spec.need && next() < 0.25)) t = int(a[0] + a[1], a[spec.n - 2] + a[spec.n - 1], next);
      else {
        const x = int(0, spec.n - 2, next);
        t = a[x] + a[int(x + 1, spec.n - 1, next)];
      }
    } else if (algo === "water") a = Array.from({ length: spec.n }, () => int(1, 9, next));
    else {
      a = [int(1, 5, next)];
      for (let x = 1; x < spec.n; x++) a.push(a[x - 1] + pick([0, 0, 1, 2, 3], next));
    }
    const task: PtrTask = { algo, a, t };
    const { ops, end } = ptrRun(task);
    const moved = (op: number) => ops.includes(op);
    if (algo !== "dedupe" && !(moved(0) && moved(1))) continue;
    if (algo === "pairSum" && ops.length <= spec.n / 2) continue;
    if (algo === "water" && ops.filter((c) => c === 2).length < 2) continue;
    if (algo === "dedupe" && (spec.n - end.k < 2 || end.k < 3)) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    if (!spec.need && end.seen.includes("noPair") && next() < 0.5) continue;
    if (spec.most && ops.length > spec.most) continue;
    return task;
  }
}

export const PTR_LADDER: (Spec & { seed: number })[] = [
  { algo: "pairSum", n: 6, seed: 2501 },
  { algo: "pairSum", n: 8, need: "noPair", seed: 2502 },
  { algo: "dedupe", n: 7, seed: 2503 },
  { algo: "water", n: 6, seed: 2504 },
  { algo: "pairSum", n: 10, need: "linear", seed: 2505 },
  { algo: "dedupe", n: 10, need: "inPlace", seed: 2506 },
  { algo: "water", n: 8, need: "tie", seed: 2507 },
  { algo: "pairSum", n: 12, need: "linear", seed: 2508 },
  { algo: "water", n: 10, seed: 2509 },
];
/** The endless run: easy, the pair sum or repeats on six to eight; medium, any on eight to ten; hard, any on ten to twelve. */
export function levelSpec(level: PtrLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["pairSum", "dedupe"] as const, next), n: int(6, 8, next) };
  if (level === 2) return { algo: null, n: int(8, 10, next) };
  return { algo: null, n: int(10, 12, next) };
}

export const ptrStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function ptrNotice(m: PtrMachine, misses: number, streak: number): PtrNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (PTR_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBePointers = EndlessGame<PtrNotice, PtrLevel, { kind: "wrong"; why: PtrWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function ptrNow(d: Pick<LiveBePointers, "mode" | "stage" | "level" | "seed">): PtrTask {
  if (d.mode === "puzzle") {
    const s = PTR_LADDER[d.stage];
    return ptrTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return ptrTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<PtrAlgo, string[]> = {
  pairSum: ["i = 0; j = n − 1", "while i < j:", "  s = a[i] + a[j]", "  if s == t: return (i, j)", "  if s < t: i += 1", "  else: j −= 1", "return −1"],
  water: ["i = 0; j = n − 1; best = 0", "while i < j:", "  best = max(best, (j − i) × min(a[i], a[j]))", "  if a[i] < a[j]: i += 1", "  else: j −= 1", "return best"],
  dedupe: ["k = 1", "for i in 1..n − 1:", "  if a[i] != a[k − 1]:", "    a[k] = a[i]; k += 1", "return k        # a[0..k − 1] has no repeats"],
};

export function logText(l: PtrLog): string {
  switch (l.op) {
    case "start":
    case "return":
      return l.text;
    case "sum": {
      const s = l.x + l.y;
      return `s = ${l.x} + ${l.y} = ${s} ${s < l.t ? "<" : ">"} ${l.t}; ${l.p} = ${l.to}`;
    }
    case "water":
      return `a[${l.i}] = ${l.hi} ${l.p === "i" ? "<" : "≥"} a[${l.j}] = ${l.hj}; ${l.p} = ${l.to}`;
    case "best":
      return `best = max(${l.was}, ${l.w} × ${l.h}) = ${l.v}`;
    case "write":
      return `a[${l.k}] = a[${l.i}] = ${l.v}; k = ${l.k + 1}`;
    case "skip":
      return `${l.repeat ? `a[${l.i}] = ${l.v} repeats; ` : ""}i = ${l.to}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a column (c), a pointer (pi, pj, pk), the area, best, −1, return. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type PtrPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const CELL = 38;
const STEP = 44;
const LEFT = 64;
const BAR = 13;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/**
 * The machine drawn as a computer keeps it: t or best, the water's bars (with the water between i and j), the array with
 * its indexes (dedupe: the kept part green, the left-over part grey, a[i] orange), a row for each pointer with its chip
 * under the index it holds, what the code works out from them, and return. `hot` lights the spot a drag is over and
 * `sel` the one picked up.
 */
export function ptrSvg(m: PtrMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): PtrPic {
  const { algo, t } = m.task;
  const n = m.w.length;
  const col = (x: number) => LEFT + x * STEP;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const ptrs: ("i" | "j" | "k")[] = algo === "dedupe" ? ["k", "i"] : ["i", "j"];
  const last = algo === "dedupe" ? n : n - 1;
  const right = col(last) + CELL;
  const e = expect(m);

  let y = 26;
  if (algo === "pairSum") parts.push(tx(16, y, `t = ${t}`, { size: 18, anchor: "start", bold: true, mono: true, color: ORANGE }));
  parts.push(tx(algo === "pairSum" ? 130 : 16, y, `n = ${n}`, { size: 14, anchor: "start", mono: true, color: MUTED }));
  y = 44;
  if (algo === "water") {
    // The bars, the water held between i and j, and the base line.
    const base = y + 9 * BAR + 6;
    if (m.i < m.j && m.ret === null) {
      const h = Math.min(m.w[m.i], m.w[m.j]) * BAR;
      parts.push(`<rect x="${col(m.i) + CELL / 2}" y="${base - h}" width="${col(m.j) - col(m.i)}" height="${h}" fill="#a5d8ff" opacity="0.55"/>`);
    }
    m.w.forEach((v, x) => parts.push(`<rect x="${col(x) + CELL / 2 - 5}" y="${base - v * BAR}" width="10" height="${v * BAR}" rx="2" fill="${x === m.i || x === m.j ? BLUE : "#adb5bd"}"/>`));
    parts.push(`<line x1="${col(0)}" y1="${base}" x2="${right}" y2="${base}" stroke="#495057" stroke-width="1.5"/>`);
    y = base + 8;
  }
  const cy = y + 16;
  const rowY = (r: number) => cy + CELL + 10 + r * 30;
  const bottom = rowY(ptrs.length) + 4;
  for (let x = 0; x <= last; x++) {
    const id = `c${x}`;
    const l = lit(id);
    parts.push(tx(col(x) + CELL / 2, y + 8, String(x), { size: 11, color: MUTED, mono: true }));
    if (l) parts.push(box(col(x) - 2, cy - 4, CELL + 4, bottom - cy + 4, l === "hot" ? "#fff3bf" : "#fff4e6", ORANGE, true, 1.4));
    if (x >= n) {
      parts.push(box(col(x), cy, CELL, CELL, "#fff", "#ced4da", true));
      spots.push({ id, x: col(x), y: cy, w: CELL, h: bottom - cy, from: false, to: true, label: `index ${x}, past the end` });
      continue;
    }
    let fill = "#fff";
    let stroke = "#868e96";
    let ink = INK;
    if (algo === "dedupe") {
      if (x < m.k) [fill, stroke] = ["#ebfbee", GREEN];
      else if (x < m.i) [fill, stroke, ink] = ["#f1f3f5", "#dee2e6", "#adb5bd"];
      if (x === m.i && m.ret === null) [fill, stroke, ink] = ["#fff4e6", ORANGE, INK];
    } else {
      const inside = x >= m.i && x <= m.j;
      if (!inside) [fill, stroke, ink] = ["#f1f3f5", "#dee2e6", "#adb5bd"];
      if ((x === m.i || x === m.j) && m.ret === null) [fill, stroke] = ["#e7f5ff", BLUE];
      if (m.ret !== null && algo === "pairSum" && m.ret >= 0 && (x === m.i || x === m.j)) [fill, stroke] = ["#d3f9d8", GREEN];
    }
    parts.push(box(col(x), cy, CELL, CELL, fill, stroke, false, stroke === "#868e96" || stroke === "#dee2e6" ? 1.6 : 2.4));
    parts.push(tx(col(x) + CELL / 2, cy + 25, String(m.w[x]), { size: 17, bold: true, color: ink }));
    spots.push({ id, x: col(x), y: cy, w: CELL, h: bottom - cy, from: algo === "dedupe" && !o.finished, to: true, label: `a[${x}] = ${m.w[x]}` });
  }
  parts.push(tx(LEFT - 10, cy + 25, "a[]", { size: 14, anchor: "end", bold: true, mono: true }));
  ptrs.forEach((p, r) => {
    const id = `p${p}`;
    const l = lit(id);
    const at = m[p];
    const cx = col(Math.min(at, last)) + CELL / 2;
    const yy = rowY(r);
    const color = p === "k" ? GREEN : p === "i" && algo === "dedupe" ? ORANGE : BLUE;
    parts.push(box(cx - 15, yy, 30, 24, l ? "#ffe8cc" : "#fff", l ? ORANGE : color, false, 2, 12));
    parts.push(tx(cx, yy + 17, p, { size: 14, bold: true, mono: true, color }));
    spots.push({ id, x: cx - 15, y: yy, w: 30, h: 24, from: !o.finished, to: false, label: p });
    parts.push(tx(right + 18, yy + 17, `${p} = ${at}`, { size: 13, anchor: "start", mono: true, bold: true, color }));
  });

  // What the code works out from the pointers.
  y = bottom + 30;
  const say = (s: string, color = INK) => parts.push(tx(16, y, s, { size: 16, anchor: "start", mono: true, bold: true, color }));
  if (m.ret === null) {
    if (algo === "pairSum") say(m.i < m.j ? `s = a[${m.i}] + a[${m.j}] = ${m.w[m.i]} + ${m.w[m.j]} = ${sum(m)}  ${sum(m) === t ? "==" : sum(m) < t ? "<" : ">"}  t = ${t}` : `i = ${m.i} = j: the loop ends`, m.i < m.j ? INK : MUTED);
    else if (algo === "dedupe") say(m.i < n ? `a[i] = a[${m.i}] = ${m.w[m.i]}  ${m.w[m.i] === m.w[m.k - 1] ? "==" : "!="}  a[k − 1] = a[${m.k - 1}] = ${m.w[m.k - 1]}` : "i = n: the loop ends", m.i < n ? INK : MUTED);
    else if (m.i < m.j) say(`(j − i) × min(a[i], a[j]) = ${m.j - m.i} × ${Math.min(m.w[m.i], m.w[m.j])} =`);
    else say(`i = ${m.i} = j: the loop ends`, MUTED);
  }
  // The water's area chip and best.
  if (algo === "water") {
    if (m.ret === null && m.i < m.j) {
      const ax = 16 + (`(j − i) × min(a[i], a[j]) = ${m.j - m.i} × ${Math.min(m.w[m.i], m.w[m.j])} =`.length + 1) * 9.6;
      const al = lit("area");
      parts.push(box(ax, y - 21, 52, 30, al ? "#ffe8cc" : "#f3f0ff", VIOLET, false, 2, 15));
      parts.push(tx(ax + 26, y - 1, String(area(m)), { size: 16, bold: true, color: VIOLET }));
      spots.push({ id: "area", x: ax, y: y - 21, w: 52, h: 30, from: !o.finished, to: false, label: `area = ${area(m)}` });
    }
    y += 22;
    parts.push(tx(16, y + 26, "best", { size: 16, anchor: "start", mono: true, bold: true }));
    const bl = lit("best");
    parts.push(box(70, y, 60, 40, bl === "hot" ? "#fff3bf" : bl ? "#ffe8cc" : "#f3f0ff", bl ? ORANGE : VIOLET, false, 2));
    parts.push(tx(100, y + 27, String(m.best), { size: 18, bold: true, color: VIOLET }));
    spots.push({ id: "best", x: 70, y, w: 60, h: 40, from: !o.finished, to: true, label: `best = ${m.best}` });
    y += 50;
  } else y += 18;
  // return, and the −1 the pair sum returns when no pair adds up.
  parts.push(tx(16, y + 26, "return", { size: 16, anchor: "start", mono: true, bold: true }));
  const rl = lit("ret");
  const got = m.ret !== null;
  const shown = got ? (algo === "pairSum" && m.ret! >= 0 ? `(${m.i}, ${m.j})` : m.ret! < 0 ? "−1" : String(m.ret)) : "";
  const rw = algo === "pairSum" ? 84 : 60;
  parts.push(box(92, y, rw, 40, rl === "hot" ? "#fff3bf" : got ? "#d3f9d8" : "#fff", rl ? ORANGE : got ? GREEN : e === "return" ? ORANGE : "#adb5bd", !got, rl || e === "return" ? 2.4 : 1.6));
  if (got) parts.push(tx(92 + rw / 2, y + 27, shown, { size: 17, bold: true, color: o.finished ? GREEN : INK }));
  spots.push({ id: "ret", x: 92, y, w: rw, h: 40, from: false, to: true, label: "return" });
  if (algo === "pairSum") {
    const nl = lit("none");
    parts.push(box(200, y + 4, 44, 32, nl ? "#ffe8cc" : "#f8f9fa", nl ? ORANGE : "#868e96", false, 2, 16));
    parts.push(tx(222, y + 26, "−1", { size: 16, bold: true, mono: true }));
    spots.push({ id: "none", x: 200, y: y + 4, w: 44, h: 32, from: !o.finished, to: false, label: "−1" });
  }
  return { w: Math.max(right + 90, 460), h: y + 56, body: parts.join(""), spots };
}
