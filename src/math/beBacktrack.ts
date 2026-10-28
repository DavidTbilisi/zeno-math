// Be the backtracking: the player is the computer running a recursive search with a call stack, one operation at a
// time. Five patterns on one loop: each call (a frame on the stack) tries its choices in turn, pushes the first one that
// may still lead somewhere onto path[] and calls itself one level deeper, and when its loop is done it returns and the
// caller pops the choice back off. A path that is a whole answer is recorded into res. All the subsets of a few letters
// (every path is one), the ways to choose k of n (a path k long), the orders of n letters (used[] says which are taken),
// the sets of numbers that add up to T (sorted, so the loop breaks at the first one too big), and the ways to set n
// queens on an n × n board with no two attacking (one queen per row, path[r] its column). Each operation the player
// makes is checked against the code; a wrong one is not made and says the rule it broke. Kept free of React: the board
// keeps only the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type BtAlgo = "subsets" | "combos" | "perms" | "sum" | "queens";
export const BT_ALGOS: readonly BtAlgo[] = ["subsets", "combos", "perms", "sum", "queens"];
export type BtLevel = 1 | 2 | 3;
/** The choices (letters as their codes A = 0, numbers sorted for sum, the columns for queens), and k (combos), T (sum) or 0. */
export type BtTask = { algo: BtAlgo; a: number[]; k: number };

export type BtNotice = "prune" | "deadEnd" | "powerSet" | "factorial" | "streak10";
export const BT_NOTICES: BtNotice[] = ["prune", "deadEnd", "powerSet", "factorial", "streak10"];

/** A line of the step log, as code. */
export type BtLog =
  | { op: "start" }
  | { op: "push"; v: string; path: string; s: number; d: number }
  | { op: "pop"; v: string; path: string; s: number }
  | { op: "record"; path: string; count: number }
  | { op: "return"; v: number };

/** A call on the stack: where its loop started, the next choice it tries (the loop's i, one past the choice whose call is running above it), and whether it has recorded its path. */
export type BtFrame = { start: number; next: number; recorded: boolean };

/**
 * The machine's memory after some operations: path[] (indexes into a), the call stack (one frame per level, the last
 * the running one), the paths recorded, what the code returned (null before), the lines the last operation ran, the
 * log, and what the run has shown.
 */
export type BtMachine = {
  task: BtTask;
  path: number[];
  frames: BtFrame[];
  res: number[][];
  ret: number | null;
  lines: number[];
  log: BtLog[];
  seen: BtNotice[];
};

export const letter = (c: number) => "ABCDEFGH"[c];
/** A choice as the board writes it: a letter, a number for sum, a column for queens. */
export const shown = (t: BtTask, v: number) => (t.algo === "sum" || t.algo === "queens" ? String(v) : letter(v));
/** path[] as the board writes it. */
export const pathText = (t: BtTask, path: number[]) => `[${path.map((i) => shown(t, t.a[i])).join(", ")}]`;
/** The sum of the path, for sum. */
export const sumOf = (m: Pick<BtMachine, "task" | "path">) => m.path.reduce((s, i) => s + m.task.a[i], 0);

export function startMachine(task: BtTask): BtMachine {
  return { task, path: [], frames: [{ start: 0, next: 0, recorded: false }], res: [], ret: null, lines: [0, 1], log: [{ op: "start" }], seen: [] };
}

/** Whether the path is a whole answer, to record. */
export function goal(m: BtMachine): boolean {
  const { algo, a, k } = m.task;
  if (algo === "subsets") return true;
  if (algo === "combos") return m.path.length === k;
  if (algo === "sum") return sumOf(m) === k;
  return m.path.length === a.length;
}
/** Whether the call returns once it has recorded, without trying a choice. */
const stops = (m: BtMachine) => m.task.algo !== "subsets" && goal(m);

/** The queen in an earlier row that attacks row r, column c (by column first, then by diagonal), or null when it is safe. */
export function attacker(path: number[], c: number): { row: number; how: "col" | "diag" } | null {
  const r = path.length;
  const col = path.findIndex((pc) => pc === c);
  if (col >= 0) return { row: col, how: "col" };
  const diag = path.findIndex((pc, q) => Math.abs(pc - c) === r - q);
  return diag >= 0 ? { row: diag, how: "diag" } : null;
}

/** Why choice i can't go onto the path from here, or null when it may: taken already (perms), attacked (queens), too big (sum). */
export function blocked(m: BtMachine, i: number): "used" | "col" | "diag" | "over" | null {
  const { algo, a, k } = m.task;
  if (algo === "perms" && m.path.includes(i)) return "used";
  if (algo === "queens") return attacker(m.path, i)?.how ?? null;
  if (algo === "sum" && sumOf(m) + a[i] > k) return "over";
  return null;
}

/** The choice the running call pushes next, or null when its loop is done (for sum, the first one too big breaks it). */
export function nextChoice(m: BtMachine): number | null {
  const top = m.frames[m.frames.length - 1];
  for (let i = top.next; i < m.task.a.length; i++) {
    const b = blocked(m, i);
    if (b === "over") return null;
    if (!b) return i;
  }
  return null;
}

/** The operations, by code: push the next choice and call, pop it after the call returns, record the path, return. */
export const OPS = ["push", "pop", "record", "return"] as const;
export type BtOp = (typeof OPS)[number];

/** What the code does next; null when it has returned. */
export function expect(m: BtMachine): BtOp | null {
  if (m.ret !== null) return null;
  const top = m.frames[m.frames.length - 1];
  if (goal(m) && !top.recorded) return "record";
  if (!stops(m) && nextChoice(m) !== null) return "push";
  return m.frames.length > 1 ? "pop" : "return";
}

const LINE: Record<BtAlgo, Record<BtOp, number[]>> = {
  subsets: { push: [3, 4], pop: [5], record: [2], return: [6] },
  combos: { push: [3, 4], pop: [5], record: [2], return: [6] },
  perms: { push: [3, 4, 5], pop: [6], record: [2], return: [7] },
  sum: { push: [3, 4, 5], pop: [6], record: [2], return: [7] },
  queens: { push: [3, 4, 5], pop: [6], record: [2], return: [7] },
};

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: BtMachine, code: number): BtMachine {
  const m: BtMachine = { ...m0, path: [...m0.path], frames: m0.frames.map((f) => ({ ...f })), res: [...m0.res], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: BtNotice) => m.seen.includes(k) || m.seen.push(k);
  const op = OPS[code];
  const { algo, a } = m.task;
  const n = a.length;
  const top = m.frames[m.frames.length - 1];
  m.lines = LINE[algo][op];
  // A call that ends: a queen row with no safe square is a dead end; a sum loop that broke with choices left was pruned.
  const ends = () => {
    if (algo === "queens" && m.path.length < n && top.next === 0) see("deadEnd");
    if (algo === "sum" && !goal(m) && top.next < n && blocked(m, top.next) === "over") see("prune");
  };
  if (op === "push") {
    const i = nextChoice(m)!;
    top.next = i + 1;
    m.path.push(i);
    const start = algo === "perms" || algo === "queens" ? 0 : i + 1;
    m.frames.push({ start, next: start, recorded: false });
    m.log.push({ op: "push", v: shown(m.task, a[i]), path: pathText(m.task, m.path), s: sumOf(m), d: m.path.length - 1 });
  } else if (op === "pop") {
    ends();
    m.frames.pop();
    const i = m.path.pop()!;
    m.log.push({ op: "pop", v: shown(m.task, a[i]), path: pathText(m.task, m.path), s: sumOf(m) });
  } else if (op === "record") {
    top.recorded = true;
    m.res.push([...m.path]);
    m.log.push({ op: "record", path: pathText(m.task, m.path), count: m.res.length });
  } else {
    ends();
    m.ret = m.res.length;
    m.log.push({ op: "return", v: m.ret });
    if (algo === "subsets") see("powerSet");
    if (algo === "perms") see("factorial");
  }
  return m;
}

export function btRun(task: BtTask): { ops: number[]; end: BtMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: BtTask, ops: number[]): BtMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/**
 * What the player tried: choice i pushed (for queens, a queen set on row `row`, column i), the top of the path popped,
 * the path recorded, res returned.
 */
export type BtAttempt = { kind: "push"; i: number; row?: number } | { kind: "pop" } | { kind: "record" } | { kind: "return" };
export type BtWhy =
  | "recordFirst" | "full" | "reached" | "nothingLeft" | "allDone" | "before" | "tried" | "used" | "sameCol" | "sameDiag"
  | "over" | "order" | "popEarly" | "recorded" | "notFull" | "notSum" | "returnEarly" | "wrongRow";
export type BtCheck = { ok: true; code: number } | { ok: false; why: BtWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: BtMachine, at: BtAttempt): BtCheck {
  const e = expect(m);
  const no = (why: BtWhy, vars: Record<string, string | number> = {}): BtCheck => ({ ok: false, why, vars });
  const ok = (op: BtOp): BtCheck => ({ ok: true, code: OPS.indexOf(op) });
  const { algo, a, k } = m.task;
  const top = m.frames[m.frames.length - 1];
  const path = pathText(m.task, m.path);
  const d = m.path.length;
  const s = sumOf(m);
  // The run is over: nothing more to do (the board never asks).
  if (!e) return no("returnEarly", { d });
  if (at.kind === "return") return e === "return" ? ok("return") : no("returnEarly", { d });
  if (at.kind === "record") {
    if (e === "record") return ok("record");
    if (goal(m)) return no("recorded", { path });
    return algo === "sum" ? no("notSum", { s, T: k }) : no("notFull", { d, n: algo === "combos" ? k : a.length });
  }
  if (e === "record") return no("recordFirst", { path });
  if (at.kind === "pop") {
    if (e === "pop") return ok("pop");
    if (e === "push") return no("popEarly", { c: shown(m.task, a[nextChoice(m)!]), i: nextChoice(m)! });
    return no("allDone");
  }
  // A push.
  if (algo === "queens" && at.row !== undefined && at.row !== d) return no("wrongRow", { r: d });
  if (stops(m)) return algo === "sum" ? no("reached", { s, T: k }) : no("full", { path });
  const c = shown(m.task, a[at.i]);
  const b = blocked(m, at.i);
  if (b === "used") return no("used", { c, i: at.i });
  if (b === "col" || b === "diag") return no(b === "col" ? "sameCol" : "sameDiag", { r: attacker(m.path, at.i)!.row, c: at.i });
  if (b === "over") return no("over", { s, v: a[at.i], sum: s + a[at.i], T: k });
  if (e !== "push") return e === "pop" ? no("nothingLeft", { d }) : no("allDone");
  const j = nextChoice(m)!;
  if (at.i === j) return ok("push");
  if (at.i < top.start) return no("before", { c, start: top.start });
  if (at.i < top.next) return no("tried", { c, i: top.next });
  return no("order", { c: shown(m.task, a[j]), i: j });
}

// ---------- the tasks ----------

type Spec = { algo: BtAlgo | null; n: number; k?: number; need?: BtNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));
/** n different values from lo..hi, sorted. */
function distinct(n: number, lo: number, hi: number, next: () => number): number[] {
  const xs = new Set<number>();
  while (xs.size < n) xs.add(int(lo, hi, next));
  return [...xs].sort((x, y) => x - y);
}

/**
 * A task worth playing: letters are n different ones of A–H in order; for sum, n different numbers up to 9 in order
 * and a T with two to four answers in 20 to 44 operations, at least one of them pruned. `need` asks for a run that
 * shows something.
 */
export function btTask(spec: Spec, next: () => number): BtTask {
  const algo = spec.algo ?? pick(["perms", "combos", "sum"] as const, next);
  for (;;) {
    let t: BtTask;
    if (algo === "queens") t = { algo, a: Array.from({ length: spec.n }, (_, i) => i), k: 0 };
    else if (algo === "sum") t = { algo, a: distinct(spec.n, 1, 9, next), k: int(6, 13, next) };
    else t = { algo, a: distinct(spec.n, 0, 7, next), k: algo === "combos" ? (spec.k ?? 2) : 0 };
    const { ops, end } = btRun(t);
    if (algo === "sum" && (end.res.length < 2 || end.res.length > 4 || ops.length < 20 || ops.length > 44 || !end.seen.includes("prune"))) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const BT_LADDER: (Spec & { seed: number })[] = [
  { algo: "subsets", n: 3, seed: 2701 },
  { algo: "combos", n: 4, k: 2, seed: 2702 },
  { algo: "sum", n: 4, seed: 2703 },
  { algo: "perms", n: 3, seed: 2704 },
  { algo: "sum", n: 5, seed: 2705 },
  { algo: "combos", n: 4, k: 3, seed: 2706 },
  { algo: "sum", n: 6, seed: 2707 },
  { algo: "combos", n: 5, k: 2, seed: 2708 },
  { algo: "queens", n: 4, need: "deadEnd", seed: 2709 },
];
/** The endless run: easy, the subsets, two of four or a sum of four; medium, an order, two or three of four or a sum of five; hard, any of these on more, or the queens. */
export function levelSpec(level: BtLevel, next: () => number): Spec {
  if (level === 1) {
    const algo = pick(["subsets", "combos", "sum"] as const, next);
    return { algo, n: algo === "subsets" ? 3 : 4, k: 2 };
  }
  if (level === 2) {
    const algo = pick(["perms", "combos", "sum"] as const, next);
    return { algo, n: algo === "perms" ? 3 : algo === "combos" ? 4 : 5, k: int(2, 3, next) };
  }
  const algo = pick(["queens", "combos", "sum"] as const, next);
  return { algo, n: algo === "queens" ? 4 : algo === "combos" ? 5 : 6, k: 2 };
}

export const btStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function btNotice(m: BtMachine, misses: number, streak: number): BtNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (BT_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeBacktrack = EndlessGame<BtNotice, BtLevel, { kind: "wrong"; why: BtWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function btNow(d: Pick<LiveBeBacktrack, "mode" | "stage" | "level" | "seed">): BtTask {
  if (d.mode === "puzzle") {
    const s = BT_LADDER[d.stage];
    return btTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return btTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<BtAlgo, string[]> = {
  subsets: ["res = []; path = []", "def bt(start):", "  res.append(path[:])", "  for i in range(start, n):", "    path.append(a[i]); bt(i + 1)", "    path.pop()", "bt(0); return len(res)"],
  combos: ["res = []; path = []", "def bt(start):", "  if len(path) == k: res.append(path[:]); return", "  for i in range(start, n):", "    path.append(a[i]); bt(i + 1)", "    path.pop()", "bt(0); return len(res)"],
  perms: ["res = []; path = []; used = [F] * n", "def bt():", "  if len(path) == n: res.append(path[:]); return", "  for i in range(n):", "    if used[i]: continue", "    used[i] = T; path.append(a[i]); bt()", "    path.pop(); used[i] = F", "bt(); return len(res)"],
  sum: ["res = []; path = []; s = 0   # a is sorted", "def bt(start):", "  if s == T: res.append(path[:]); return", "  for i in range(start, n):", "    if s + a[i] > T: break", "    path.append(a[i]); s += a[i]; bt(i + 1)", "    path.pop(); s −= a[i]", "bt(0); return len(res)"],
  queens: ["res = []; path = []   # path[r] = queen's column", "def bt(r):", "  if r == n: res.append(path[:]); return", "  for c in range(n):", "    if attacked(r, c): continue", "    path.append(c); bt(r + 1)", "    path.pop()", "bt(0); return len(res)"],
};

export function logText(l: BtLog, t: BtTask): string {
  switch (l.op) {
    case "start":
      return CODE[t.algo][0];
    case "push":
      if (t.algo === "queens") return `row ${l.d}: c = ${l.v}; path = ${l.path}`;
      return `path.append(${l.v}) → ${l.path}${t.algo === "sum" ? `; s = ${l.s}` : ""}`;
    case "pop":
      return `path.pop() → ${l.path}${t.algo === "sum" ? `; s = ${l.s}` : ""}`;
    case "record":
      return `res.append(${l.path}); ${l.count} found`;
    case "return":
      return `return len(res) = ${l.v}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a choice (a), the queen (Q), a square (q), path's next slot, its top, the pop bin, path, res, return. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type BtPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const CELL = 38;
const STEP = 44;
const LEFT = 76;
const SQ = 40;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/** How long path[] can grow: k for combos, else n. */
export const depth = (t: BtTask) => (t.algo === "combos" ? t.k : t.a.length);

/**
 * The machine drawn as a computer keeps it: k or T, the choices a[] with their indexes and the running call's loop
 * variable under them (used[] below for the orders), or for the queens the board with the row the call is on; path[]
 * with its indexes, its top to pop into the bin and its next slot to push into; the sum, res with what it has found,
 * return, and the call stack, the running call on top. `hot` lights the spot a drag is over and `sel` the one picked up.
 */
export function btSvg(m: BtMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): BtPic {
  const t = m.task;
  const { algo, a, k } = t;
  const n = a.length;
  const d = m.path.length;
  const top = m.frames[m.frames.length - 1];
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && m.ret === null;
  const e = expect(m);
  const col = (x: number) => LEFT + x * STEP;

  const head = algo === "combos" ? `k = ${k}` : algo === "sum" ? `T = ${k}` : null;
  if (head) parts.push(tx(16, 26, head, { size: 18, anchor: "start", bold: true, mono: true, color: ORANGE }));
  parts.push(tx(head ? 100 : 16, 26, `n = ${n}`, { size: 14, anchor: "start", mono: true, color: MUTED }));

  let y: number;
  const loopVar = algo === "queens" ? "c" : "i";
  const pointer = (x: number, yy: number) => {
    parts.push(box(x - 15, yy, 30, 24, "#fff", BLUE, false, 2, 12));
    parts.push(tx(x, yy + 17, loopVar, { size: 14, bold: true, mono: true, color: BLUE }));
  };
  if (algo === "queens") {
    // The board: a queen per row so far, the row the call is on framed orange.
    const bx = LEFT;
    const by = 60;
    for (let c = 0; c < n; c++) parts.push(tx(bx + c * SQ + SQ / 2, by - 8, String(c), { size: 11, color: MUTED, mono: true }));
    for (let r = 0; r < n; r++) {
      parts.push(tx(bx - 10, by + r * SQ + 25, `r = ${r}`, { size: 12, anchor: "end", mono: true, color: r === d && live ? ORANGE : MUTED, bold: r === d && live }));
      for (let c = 0; c < n; c++) {
        const id = `q${r}_${c}`;
        parts.push(box(bx + c * SQ, by + r * SQ, SQ, SQ, glow(id, (r + c) % 2 ? "#e9ecef" : "#f8f9fa"), lit(id) ? ORANGE : "#ced4da", false, lit(id) ? 2.4 : 1, 0));
        if (m.path[r] === c) parts.push(tx(bx + c * SQ + SQ / 2, by + r * SQ + 29, "♛", { size: 26, color: o.finished ? GREEN : BLUE }));
        spots.push({ id, x: bx + c * SQ, y: by + r * SQ, w: SQ, h: SQ, from: false, to: true, label: `row ${r}, column ${c}` });
      }
    }
    if (d < n && live) parts.push(`<rect x="${bx - 3}" y="${by + d * SQ - 3}" width="${n * SQ + 6}" height="${SQ + 6}" fill="none" stroke="${ORANGE}" stroke-width="2.5" rx="3"/>`);
    const qx = bx + n * SQ + 24;
    const qy = by + Math.min(d, n - 1) * SQ + 4;
    parts.push(box(qx, qy, 34, 32, glow("Q", "#e7f5ff"), lit("Q") ? ORANGE : BLUE, false, 2, 8));
    parts.push(tx(qx + 17, qy + 25, "♛", { size: 22, color: BLUE }));
    spots.push({ id: "Q", x: qx, y: qy, w: 34, h: 32, from: live, to: false, label: "queen" });
    y = by + n * SQ + 8;
    if (live) pointer(bx + Math.min(top.next, n) * SQ + SQ / 2, y);
    if (live) parts.push(tx(bx + n * SQ + 70, y + 17, `c = ${top.next}`, { size: 13, anchor: "start", mono: true, bold: true, color: BLUE }));
    y += 44;
  } else {
    // The choices with their indexes, those on the path blue, and the running call's loop variable under them.
    const y0 = 44;
    const cy = y0 + 16;
    parts.push(tx(LEFT - 12, cy + 25, "a[]", { size: 14, anchor: "end", bold: true, mono: true }));
    for (let i = 0; i < n; i++) {
      const id = `a${i}`;
      const on = m.path.includes(i);
      parts.push(tx(col(i) + CELL / 2, y0 + 8, String(i), { size: 11, color: MUTED, mono: true }));
      parts.push(box(col(i), cy, CELL, CELL, glow(id, on ? "#e7f5ff" : i < top.start ? "#f1f3f5" : "#fff"), lit(id) ? ORANGE : on ? BLUE : "#868e96", false, on || lit(id) ? 2 : 1.6));
      parts.push(tx(col(i) + CELL / 2, cy + 25, shown(t, a[i]), { size: 17, bold: true, color: i < top.start && !on ? "#adb5bd" : INK }));
      spots.push({ id, x: col(i), y: cy, w: CELL, h: CELL, from: live, to: false, label: `a[${i}] = ${shown(t, a[i])}` });
    }
    y = cy + CELL + 10;
    if (live) {
      pointer(col(Math.min(top.next, n)) + CELL / 2, y);
      parts.push(tx(col(n) + 30, y + 17, `${loopVar} = ${top.next}`, { size: 13, anchor: "start", mono: true, bold: true, color: BLUE }));
    }
    y += 34;
    if (algo === "perms") {
      parts.push(tx(LEFT - 12, y + 24, "used[]", { size: 14, anchor: "end", bold: true, mono: true }));
      for (let i = 0; i < n; i++) {
        const u = m.path.includes(i);
        parts.push(box(col(i), y, CELL, 34, u ? "#fff4e6" : "#fff", u ? ORANGE : "#ced4da"));
        parts.push(tx(col(i) + CELL / 2, y + 23, u ? "T" : "F", { size: 15, bold: true, mono: true, color: u ? ORANGE : MUTED }));
      }
      y += 46;
    }
  }

  // path[] with its indexes: the top to pop, the next slot to push into, and the pop bin beside it.
  const deep = depth(t);
  const py = y + 14;
  parts.push(tx(16, py + 25, "path", { size: 14, anchor: "start", bold: true, mono: true }));
  parts.push(box(10, py + 4, 56, 30, glow("path", "#f3f0ff"), lit("path") ? ORANGE : VIOLET, false, 2, 15));
  parts.push(tx(38, py + 25, "path", { size: 14, bold: true, mono: true, color: VIOLET }));
  spots.push({ id: "path", x: 10, y: py + 4, w: 56, h: 30, from: live, to: false, label: `path = ${pathText(t, m.path)}` });
  for (let x = 0; x < deep; x++) {
    parts.push(tx(col(x) + CELL / 2, py - 4, String(x), { size: 11, color: MUTED, mono: true }));
    if (x < d) {
      const id = x === d - 1 ? "top" : null;
      parts.push(box(col(x), py, CELL, CELL, id ? glow(id, "#e7f5ff") : "#e7f5ff", id && lit(id) ? ORANGE : BLUE, false, 2));
      parts.push(tx(col(x) + CELL / 2, py + 25, shown(t, a[m.path[x]]), { size: 17, bold: true }));
      if (id) spots.push({ id, x: col(x), y: py, w: CELL, h: CELL, from: live, to: false, label: `path[${x}] = ${shown(t, a[m.path[x]])}` });
    } else {
      const id = x === d ? "slot" : null;
      parts.push(box(col(x), py, CELL, CELL, id ? glow(id, "#fff") : "#fff", id && lit(id) ? ORANGE : "#ced4da", true));
      if (id && algo !== "queens") spots.push({ id, x: col(x), y: py, w: CELL, h: CELL, from: false, to: true, label: `path[${x}]` });
    }
  }
  const binX = col(Math.max(deep, n)) + 16;
  parts.push(box(binX, py, 62, CELL, glow("bin", "#fff"), lit("bin") ? ORANGE : e === "pop" ? ORANGE : "#adb5bd", true, 1.8, 8));
  parts.push(tx(binX + 31, py + 24, "pop ↩", { size: 13, bold: true, mono: true, color: MUTED }));
  spots.push({ id: "bin", x: binX, y: py, w: 62, h: CELL, from: false, to: true, label: "pop" });
  y = py + CELL + 30;
  if (algo === "sum") {
    const terms = m.path.map((i) => a[i]);
    const s = sumOf(m);
    parts.push(tx(16, y, `s = ${terms.length > 1 ? `${terms.join(" + ")} = ` : ""}${s}   ${s > k ? ">" : s === k ? "=" : "<"}  T = ${k}`, { size: 16, anchor: "start", mono: true, bold: true, color: s === k ? GREEN : INK }));
    y += 16;
  }

  // res with what it has found, and return.
  y += 8;
  parts.push(tx(16, y + 26, "res", { size: 16, anchor: "start", mono: true, bold: true }));
  parts.push(box(58, y, 64, 40, glow("res", "#f3f0ff"), lit("res") ? ORANGE : VIOLET, false, 2));
  parts.push(tx(90, y + 27, String(m.res.length), { size: 18, bold: true, color: VIOLET }));
  spots.push({ id: "res", x: 58, y, w: 64, h: 40, from: live, to: live, label: `res, ${m.res.length} found` });
  const found = m.res.slice(-4).map((p) => pathText(t, p));
  parts.push(tx(134, y + 26, `${m.res.length > 4 ? "… " : ""}${found.join(" ") || "[ ]"}`, { size: 13, anchor: "start", mono: true, color: MUTED }));
  y += 50;
  parts.push(tx(16, y + 26, "return", { size: 16, anchor: "start", mono: true, bold: true }));
  const rl = lit("ret");
  const got = m.ret !== null;
  parts.push(box(92, y, 60, 40, rl === "hot" ? "#fff3bf" : got ? "#d3f9d8" : "#fff", rl ? ORANGE : got ? GREEN : e === "return" ? ORANGE : "#adb5bd", !got, rl || e === "return" ? 2.4 : 1.6));
  if (got) parts.push(tx(122, y + 27, String(m.ret), { size: 18, bold: true, color: o.finished ? GREEN : INK }));
  spots.push({ id: "ret", x: 92, y, w: 60, h: 40, from: false, to: true, label: "return" });
  const h = y + 56;

  // The call stack, the running call on top.
  const sx = Math.max(binX + 90, 400);
  parts.push(tx(sx, 26, "call stack", { size: 14, anchor: "start", bold: true, mono: true, color: MUTED }));
  const call = (f: BtFrame, r: number) => (algo === "queens" ? `bt(r = ${r})` : algo === "perms" ? "bt()" : `bt(start = ${f.start})`);
  const frames = got ? [] : m.frames.map((f, r) => ({ f, r })).reverse();
  frames.forEach(({ f, r }, at) => {
    const fy = 40 + at * 34;
    const running = at === 0;
    parts.push(box(sx, fy, 220, 28, running ? "#fff4e6" : "#f8f9fa", running ? ORANGE : "#ced4da", false, running ? 2 : 1.2));
    parts.push(tx(sx + 10, fy + 19, call(f, r), { size: 13, anchor: "start", mono: true, bold: running }));
    parts.push(tx(sx + 210, fy + 19, `${loopVar} = ${running ? f.next : f.next - 1}`, { size: 13, anchor: "end", mono: true, color: running ? BLUE : MUTED, bold: running }));
  });
  if (got) parts.push(tx(sx, 58, "(empty)", { size: 13, anchor: "start", mono: true, color: MUTED }));
  const stackH = 40 + frames.length * 34 + 10;
  return { w: sx + 236, h: Math.max(h, stackH), body: parts.join(""), spots };
}
