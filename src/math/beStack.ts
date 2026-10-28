// Be the monotonic stack: the player is the computer sweeping an array left to right with a stack that it keeps in
// order, one operation at a time. Four patterns: the next greater value of each (the stack's indexes have falling
// values; a bigger a[i] pops every smaller one and is its answer), the days to wait for a warmer day (the same, the
// answer i − j), the previous smaller value (rising values; a[i] pops every one not smaller, then the top is its
// answer, or −1), and the smallest number left after removing k digits (a smaller digit pops bigger ones while k lasts,
// and what k is left trims the end). Each operation the player makes is checked against the code; a wrong one is not
// made and says the rule it broke. Kept free of React: the board keeps only the operations made so far, and the
// machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type StackAlgo = "nextGreater" | "temps" | "prevSmaller" | "removeK";
export const STACK_ALGOS: readonly StackAlgo[] = ["nextGreater", "temps", "prevSmaller", "removeK"];
export type StackLevel = 1 | 2 | 3;
/** The array (digits for removeK), and k for removeK, else 0. */
export type StackTask = { algo: StackAlgo; a: number[]; k: number };

export type StackNotice = "many" | "leftover" | "trim" | "linear" | "streak10";
export const STACK_NOTICES: StackNotice[] = ["many", "leftover", "trim", "linear", "streak10"];

/** A line of the step log, as code. */
export type StackLog =
  | { op: "start" }
  | { op: "push"; i: number; stack: string }
  | { op: "resolve"; j: number; t: number; x: number; i: number }
  | { op: "pop"; j: number; t: number; x: number | null; k: number }
  | { op: "write"; i: number; j: number | null };

/**
 * The machine's memory after some operations: i, the stack (indexes, the top last), ans[] (null where the code has
 * not written; for removeK unused), whether ans[i] is written (prevSmaller), k left (removeK), the pops in a row, the
 * lines the last operation ran, the log, and what the run has shown.
 */
export type StackMachine = {
  task: StackTask;
  i: number;
  stack: number[];
  ans: (number | null)[];
  wrote: boolean;
  k: number;
  pops: number;
  lines: number[];
  log: StackLog[];
  seen: StackNotice[];
};

export function startMachine(task: StackTask): StackMachine {
  return { task, i: 0, stack: [], ans: task.a.map(() => null), wrote: false, k: task.k, pops: 0, lines: [0], log: [{ op: "start" }], seen: [] };
}

/** What ans[] starts as for the cells nothing answers: −1, or 0 days. */
export const fallback = (t: StackTask) => (t.algo === "temps" ? 0 : -1);
/** The value at the stack's top, or null when it is empty. */
export const topValue = (m: StackMachine) => (m.stack.length ? m.task.a[m.stack[m.stack.length - 1]] : null);

/** The operations, by code: push i, pop the top into its answer, pop the top away, write ans[i]. */
export const OPS = ["push", "resolve", "pop", "write"] as const;
export type StackOp = (typeof OPS)[number];

/** What the code does next; null when it is done. */
export function expect(m: StackMachine): StackOp | null {
  const { algo, a } = m.task;
  const t = topValue(m);
  if (m.i === a.length) return algo === "removeK" && m.k > 0 ? "pop" : null;
  const x = a[m.i];
  if (algo === "nextGreater" || algo === "temps") return t !== null && t < x ? "resolve" : "push";
  if (algo === "prevSmaller") return t !== null && t >= x ? "pop" : m.wrote ? "push" : "write";
  return m.k > 0 && t !== null && t > x ? "pop" : "push";
}

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: StackMachine, code: number): StackMachine {
  const m: StackMachine = { ...m0, stack: [...m0.stack], ans: [...m0.ans], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: StackNotice) => m.seen.includes(k) || m.seen.push(k);
  const op = OPS[code];
  const { algo, a } = m.task;
  const n = a.length;
  const x = m.i < n ? a[m.i] : null;
  if (op === "push") {
    m.stack.push(m.i);
    m.log.push({ op: "push", i: m.i, stack: algo === "removeK" ? m.stack.map((j) => a[j]).join(" ") : `[${m.stack.join(", ")}]` });
    m.i++;
    m.wrote = false;
    m.pops = 0;
    m.lines = [1, 4];
  } else if (op === "resolve") {
    const j = m.stack.pop()!;
    m.ans[j] = algo === "temps" ? m.i - j : x;
    m.log.push({ op: "resolve", j, t: a[j], x: x!, i: m.i });
    m.lines = [2, 3];
  } else if (op === "pop") {
    const j = m.stack.pop()!;
    if (algo === "removeK") m.k--;
    m.log.push({ op: "pop", j, t: a[j], x, k: m.k });
    m.lines = algo === "prevSmaller" ? [2] : x === null ? [5] : [2, 3];
    if (x === null) see("trim");
  } else {
    m.ans[m.i] = topValue(m) ?? -1;
    m.log.push({ op: "write", i: m.i, j: m.stack.length ? m.stack[m.stack.length - 1] : null });
    m.wrote = true;
    m.lines = [3];
  }
  if (op === "resolve" || (op === "pop" && x !== null)) if (++m.pops >= 2) see("many");
  if (expect(m) === null) {
    if ((algo === "nextGreater" || algo === "temps") && m.stack.length) see("leftover");
    if (n >= 10) see("linear");
  }
  return m;
}

export function stackRun(task: StackTask): { ops: number[]; end: StackMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: StackTask, ops: number[]): StackMachine {
  return ops.reduce(apply, startMachine(task));
}

/** What ans[] holds at the end, the cells nothing answered at their start value. */
export const answers = (m: StackMachine) => m.ans.map((v) => v ?? fallback(m.task));
/** The number removeK leaves: the stack's digits. */
export const kept = (m: StackMachine) => m.stack.map((j) => m.task.a[j]).join("");

// ---------- checking an operation ----------

/** What the player tried: a[i] pushed, the top dropped onto ans[to], the −1 chip dropped onto ans[to], the top into the pop bin. */
export type StackAttempt = { kind: "push" } | { kind: "ans"; to: number } | { kind: "none"; to: number } | { kind: "pop" };
export type StackWhy =
  | "popFirst" | "ownCell" | "notGreater" | "answerIt" | "popGe" | "hasSmaller" | "writeFirst" | "keepSmaller" | "written"
  | "popBigger" | "noK" | "keepDigit";
export type StackCheck = { ok: true; code: number } | { ok: false; why: StackWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: StackMachine, at: StackAttempt): StackCheck {
  const e = expect(m);
  const no = (why: StackWhy, vars: Record<string, string | number> = {}): StackCheck => ({ ok: false, why, vars });
  const ok = (op: StackOp): StackCheck => ({ ok: true, code: OPS.indexOf(op) });
  const { algo, a } = m.task;
  const t = topValue(m)!;
  const j = m.stack[m.stack.length - 1];
  const x = a[m.i];
  if (algo === "nextGreater" || algo === "temps") {
    if (e === "resolve") {
      if (at.kind === "ans") return at.to === j ? ok("resolve") : no("ownCell", { j });
      return at.kind === "pop" ? no("answerIt", { j }) : no("popFirst", { t, x });
    }
    return at.kind === "push" ? ok("push") : no("notGreater", { t, x });
  }
  if (algo === "prevSmaller") {
    if (e === "pop") return at.kind === "pop" ? ok("pop") : no("popGe", { t, x });
    if (e === "write") {
      const kind = m.stack.length ? "ans" : "none";
      if (at.kind === kind) return at.to === m.i ? ok("write") : no("ownCell", { j: m.i });
      if (at.kind === "push") return no("writeFirst", { i: m.i });
      return at.kind === "none" ? no("hasSmaller", { t }) : no("keepSmaller", { t, x });
    }
    if (at.kind === "push") return ok("push");
    return at.kind === "pop" ? no("keepSmaller", { t, x }) : no("written", { i: m.i });
  }
  if (e === "pop") return at.kind === "pop" ? ok("pop") : no("popBigger", { t, x, k: m.k });
  if (at.kind === "push") return ok("push");
  return m.k === 0 ? no("noK") : no("keepDigit", { t, x });
}

// ---------- the tasks ----------

type Spec = { algo: StackAlgo | null; n: number; need?: StackNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

/**
 * A task worth playing: a third or more of the cells popped (for removeK, all k digits dropped), some run of two pops
 * in a row, and for the next greater and the warmer day some left on the stack at the end.
 */
export function stackTask(spec: Spec, next: () => number): StackTask {
  const algo = spec.algo ?? pick(STACK_ALGOS, next);
  for (;;) {
    const lo = algo === "temps" ? 60 : 1;
    const t: StackTask = { algo, a: Array.from({ length: spec.n }, () => int(lo, lo + (algo === "temps" ? 19 : 8), next)), k: algo === "removeK" ? int(2, 3, next) : 0 };
    const { ops, end } = stackRun(t);
    const pops = ops.filter((c) => OPS[c] === "resolve" || OPS[c] === "pop").length;
    if (pops < (algo === "removeK" ? t.k : spec.n / 3) || !end.seen.includes("many")) continue;
    if ((algo === "nextGreater" || algo === "temps") && !end.seen.includes("leftover")) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const STACK_LADDER: (Spec & { seed: number })[] = [
  { algo: "nextGreater", n: 6, seed: 3001 },
  { algo: "temps", n: 7, seed: 3002 },
  { algo: "prevSmaller", n: 6, seed: 3003 },
  { algo: "removeK", n: 7, seed: 3004 },
  { algo: "nextGreater", n: 10, need: "linear", seed: 3005 },
  { algo: "prevSmaller", n: 9, seed: 3006 },
  { algo: "removeK", n: 8, need: "trim", seed: 3007 },
  { algo: "temps", n: 10, seed: 3008 },
  { algo: "prevSmaller", n: 11, seed: 3009 },
];
/** The endless run: easy, the next greater or the warmer day on six or seven; medium, any on eight; hard, on ten to twelve. */
export function levelSpec(level: StackLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["nextGreater", "temps"] as const, next), n: int(6, 7, next) };
  return { algo: null, n: level === 2 ? 8 : int(10, 12, next) };
}

export const stackStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function stackNotice(m: StackMachine, misses: number, streak: number): StackNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (STACK_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeStack = EndlessGame<StackNotice, StackLevel, { kind: "wrong"; why: StackWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function stackNow(d: Pick<LiveBeStack, "mode" | "stage" | "level" | "seed">): StackTask {
  if (d.mode === "puzzle") {
    const s = STACK_LADDER[d.stage];
    return stackTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return stackTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<StackAlgo, string[]> = {
  nextGreater: ["ans = [−1] * n; stack = []   # indexes, a[] falling", "for i in range(n):", "  while stack and a[stack[−1]] < a[i]:", "    ans[stack.pop()] = a[i]", "  stack.append(i)"],
  temps: ["ans = [0] * n; stack = []   # indexes, a[] falling", "for i in range(n):", "  while stack and a[stack[−1]] < a[i]:", "    j = stack.pop(); ans[j] = i − j", "  stack.append(i)"],
  prevSmaller: ["ans = [−1] * n; stack = []   # indexes, a[] rising", "for i in range(n):", "  while stack and a[stack[−1]] >= a[i]: stack.pop()", "  ans[i] = a[stack[−1]] if stack else −1", "  stack.append(i)"],
  removeK: ["stack = []   # digits, rising", "for d in digits:", "  while k > 0 and stack and stack[−1] > d:", "    stack.pop(); k −= 1", "  stack.append(d)", "while k > 0: stack.pop(); k −= 1"],
};

export function logText(l: StackLog, t: StackTask): string {
  switch (l.op) {
    case "start":
      return CODE[t.algo][0];
    case "push":
      return `stack.append(${t.algo === "removeK" ? t.a[l.i] : l.i}) → ${l.stack}`;
    case "resolve":
      return t.algo === "temps" ? `a[${l.j}] = ${l.t} < ${l.x}: ans[${l.j}] = ${l.i} − ${l.j} = ${l.i - l.j}` : `a[${l.j}] = ${l.t} < ${l.x}: ans[${l.j}] = ${l.x}`;
    case "pop":
      if (t.algo === "prevSmaller") return `a[${l.j}] = ${l.t} ≥ ${l.x}: stack.pop()`;
      return l.x === null ? `drop ${l.t} from the end; k = ${l.k}` : `${l.t} > ${l.x}: drop ${l.t}; k = ${l.k}`;
    case "write":
      return l.j === null ? `ans[${l.i}] = −1` : `ans[${l.i}] = a[${l.j}] = ${t.a[l.j]}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a[i] (x), the stack, its top, an answer cell (c), −1, the pop bin. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type StackPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const CELL = 38;
const STEP = 44;
const LEFT = 76;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/**
 * The machine drawn as a computer keeps it: k (removeK), a[] with its indexes and a[i] framed with i under it, the
 * stack lying left to right (bottom to top), each cell its value over its index, ans[] with its indexes (the cells not
 * yet written faint at their start value), the pop bin and the −1 chip (prevSmaller). `hot` lights the spot a drag is over and `sel`
 * the one picked up.
 */
export function stackSvg(m: StackMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): StackPic {
  const t = m.task;
  const { algo, a } = t;
  const n = a.length;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const col = (x: number) => LEFT + x * STEP;
  const answers = algo !== "removeK";

  if (algo === "removeK") parts.push(tx(16, 26, `k = ${m.k}`, { size: 18, anchor: "start", bold: true, mono: true, color: ORANGE }));
  parts.push(tx(algo === "removeK" ? 90 : 16, 26, `n = ${n}`, { size: 14, anchor: "start", mono: true, color: MUTED }));

  // a[] with a[i] framed, and i under it.
  let y = 44;
  const cy = y + 16;
  parts.push(tx(LEFT - 12, cy + 25, algo === "removeK" ? "digits" : "a[]", { size: 14, anchor: "end", bold: true, mono: true }));
  a.forEach((v, i) => {
    const now = i === m.i && live;
    parts.push(tx(col(i) + CELL / 2, y + 8, String(i), { size: 11, color: MUTED, mono: true }));
    parts.push(box(col(i), cy, CELL, CELL, now ? glow("x", "#fff4e6") : i < m.i ? "#f1f3f5" : "#fff", now ? ORANGE : i < m.i ? "#dee2e6" : "#868e96", false, now ? 2.4 : 1.6));
    parts.push(tx(col(i) + CELL / 2, cy + 25, String(v), { size: 16, bold: true, color: i < m.i ? "#868e96" : INK }));
    if (now) spots.push({ id: "x", x: col(i), y: cy, w: CELL, h: CELL, from: true, to: false, label: `a[${i}] = ${v}` });
  });
  y = cy + CELL + 8;
  if (m.i < n && live) {
    parts.push(box(col(m.i) + CELL / 2 - 15, y, 30, 24, "#fff", BLUE, false, 2, 12));
    parts.push(tx(col(m.i) + CELL / 2, y + 17, "i", { size: 14, bold: true, mono: true, color: BLUE }));
  }
  parts.push(tx(col(n) + 8, y + 17, live && m.i < n ? `i = ${m.i}` : "", { size: 13, anchor: "start", mono: true, bold: true, color: BLUE }));
  y += 40;

  // The stack, bottom to top, left to right.
  const sy = y + 6;
  parts.push(tx(LEFT - 12, sy + 25, "stack", { size: 14, anchor: "end", bold: true, mono: true }));
  const sw = Math.max(n, 4) * STEP + 8;
  parts.push(box(col(0) - 6, sy - 6, sw, CELL + 30, glow("stack", "#fff"), lit("stack") ? ORANGE : "#ced4da", true, 1.6, 6));
  spots.push({ id: "stack", x: col(0) - 6, y: sy - 6, w: sw, h: CELL + 30, from: false, to: true, label: "stack" });
  m.stack.forEach((j, k) => {
    const isTop = k === m.stack.length - 1;
    const id = isTop ? "top" : null;
    parts.push(box(col(k), sy, CELL, CELL, id ? glow(id, "#f3f0ff") : "#f3f0ff", id && lit(id) ? ORANGE : VIOLET, false, isTop ? 2.4 : 1.4));
    parts.push(tx(col(k) + CELL / 2, sy + 25, String(a[j]), { size: 16, bold: true }));
    if (algo !== "removeK") parts.push(tx(col(k) + CELL / 2, sy + CELL + 14, `i=${j}`, { size: 10, mono: true, color: MUTED }));
    if (id) spots.push({ id, x: col(k), y: sy, w: CELL, h: CELL, from: live, to: false, label: `stack top = ${a[j]}` });
  });
  if (m.stack.length) parts.push(tx(col(m.stack.length) - 2, sy + 24, "← top", { size: 12, anchor: "start", mono: true, color: MUTED }));
  y = sy + CELL + 36;

  if (answers) {
    const ay = y + 16;
    parts.push(tx(LEFT - 12, ay + 25, "ans[]", { size: 14, anchor: "end", bold: true, mono: true }));
    m.ans.forEach((v, j) => {
      const id = `c${j}`;
      parts.push(tx(col(j) + CELL / 2, y + 8, String(j), { size: 11, color: MUTED, mono: true }));
      parts.push(box(col(j), ay, CELL, CELL, glow(id, v === null ? "#fff" : "#d3f9d8"), lit(id) ? ORANGE : v === null ? "#ced4da" : GREEN, v === null, 1.8));
      const shown = v ?? fallback(t);
      const txt = shown < 0 ? `−${-shown}` : String(shown);
      parts.push(tx(col(j) + CELL / 2, ay + 25, txt, { size: 16, bold: v !== null, color: v === null ? "#ced4da" : INK }));
      spots.push({ id, x: col(j), y: ay, w: CELL, h: CELL, from: false, to: true, label: `ans[${j}]` });
    });
    y = ay + CELL + 12;
  }
  {
    const by = y + 8;
    parts.push(box(16, by, 76, 40, glow("bin", "#fff"), lit("bin") ? ORANGE : expect(m) === "pop" && live ? ORANGE : "#adb5bd", true, 1.8, 8));
    parts.push(tx(54, by + 26, "pop ↩", { size: 14, bold: true, mono: true, color: MUTED }));
    spots.push({ id: "bin", x: 16, y: by, w: 76, h: 40, from: false, to: true, label: "pop" });
    if (algo === "prevSmaller") {
      parts.push(box(112, by + 4, 44, 32, glow("none", "#fff"), lit("none") ? ORANGE : BLUE, false, 2, 16));
      parts.push(tx(134, by + 26, "−1", { size: 16, bold: true, color: BLUE }));
      spots.push({ id: "none", x: 112, y: by + 4, w: 44, h: 32, from: live, to: false, label: "−1" });
    } else if (algo === "removeK") parts.push(tx(124, by + 26, `kept: ${kept(m) || "—"}`, { size: 16, anchor: "start", mono: true, bold: true, color: o.finished ? GREEN : INK }));
    y = by + 52;
  }
  return { w: Math.max(col(n) + 90, col(0) + sw + 20, 420), h: y + 6, body: parts.join(""), spots };
}
