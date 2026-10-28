// Be the sliding window: the player is the computer sliding a window a[l..r] along an array, one operation at a time,
// by moving its two edges. Three patterns on one loop: r grows the window a cell at a time, l shrinks it from the left
// while it breaks the rule, and best takes the window when it is better. The largest sum of k in a row (the window
// shrinks once it is wider than k, and best takes s once it is k wide), the longest run with a sum at most S (it
// shrinks while s > S), and the longest stretch of letters without a repeat (it shrinks while the next letter is in it).
// Each operation the player makes is checked against the code; a wrong one is not made and says the rule it broke. Kept
// free of React: the board keeps only the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type WinAlgo = "fixed" | "atMost" | "unique";
export const WIN_ALGOS: readonly WinAlgo[] = ["fixed", "atMost", "unique"];
export type WinLevel = 1 | 2 | 3;
/** The array (letters, as their codes A = 0, for unique), and k (fixed) or S (atMost). */
export type WinTask = { algo: WinAlgo; a: number[]; k: number };

export type WinNotice = "slide" | "shrinkMany" | "linear" | "streak10";
export const WIN_NOTICES: WinNotice[] = ["slide", "shrinkMany", "linear", "streak10"];

/** A line of the step log, as code. */
export type WinLog =
  | { op: "start" }
  | { op: "R"; r: number; s: number; v: number; win: string }
  | { op: "L"; l: number; s: number; v: number; out: string }
  | { op: "best"; was: number; v: number }
  | { op: "return"; v: number };

/**
 * The machine's memory after some operations: the window a[l..r] (r = −1 before the first cell), its sum s, best (−∞
 * for the largest sum until a window is full), what the code returned (null before), the lines the last operation ran,
 * the log, how many shrinks came in a row, and what the run has shown.
 */
export type WinMachine = {
  task: WinTask;
  l: number;
  r: number;
  s: number;
  best: number;
  ret: number | null;
  lines: number[];
  log: WinLog[];
  shrinks: number;
  seen: WinNotice[];
};

export const letter = (c: number) => "ABCDEFGH"[c];
/** A value of the array as the board writes it: a letter for unique, else the number. */
export const shown = (t: WinTask, v: number) => (t.algo === "unique" ? letter(v) : String(v));
const num = (v: number) => (v === -Infinity ? "−∞" : v < 0 ? `−${-v}` : String(v));

export function startMachine(task: WinTask): WinMachine {
  return { task, l: 0, r: -1, s: 0, best: task.algo === "fixed" ? -Infinity : 0, ret: null, lines: [0], log: [{ op: "start" }], shrinks: 0, seen: [] };
}

/** The window's size, r − l + 1. */
export const size = (m: Pick<WinMachine, "l" | "r">) => m.r - m.l + 1;
/** What best weighs: the sum for the largest sum, else the window's length. */
export const value = (m: WinMachine) => (m.task.algo === "fixed" ? m.s : size(m));

/** The operations, by code: grow (r += 1), shrink (l += 1), best takes the window, return. */
export const OPS = ["R", "L", "best", "return"] as const;
export type WinOp = (typeof OPS)[number];

/** What the code does next; null when it has returned. */
export function expect(m: WinMachine): WinOp | null {
  if (m.ret !== null) return null;
  const { algo, a, k } = m.task;
  const n = a.length;
  if (algo === "fixed") {
    if (size(m) > k) return "L";
    if (size(m) === k && m.s > m.best) return "best";
  } else if (algo === "atMost") {
    if (m.s > k) return "L";
    if (size(m) > m.best) return "best";
  } else {
    if (size(m) > m.best) return "best";
    if (m.r < n - 1 && a.slice(m.l, m.r + 1).includes(a[m.r + 1])) return "L";
  }
  return m.r === n - 1 ? "return" : "R";
}

const LINE: Record<WinAlgo, Record<WinOp, number[]>> = {
  fixed: { R: [1, 2], L: [3], best: [4], return: [5] },
  atMost: { R: [1, 2], L: [3], best: [4], return: [5] },
  unique: { R: [1, 3], L: [2], best: [4], return: [5] },
};

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: WinMachine, code: number): WinMachine {
  const m: WinMachine = { ...m0, log: [...m0.log], seen: [...m0.seen] };
  const see = (k: WinNotice) => m.seen.includes(k) || m.seen.push(k);
  const op = OPS[code];
  const { algo, a, k } = m.task;
  const n = a.length;
  m.lines = LINE[algo][op];
  const win = () => a.slice(m.l, m.r + 1).map((v) => shown(m.task, v)).join("");
  if (op === "R") {
    m.r++;
    m.s += a[m.r];
    m.shrinks = 0;
    m.log.push({ op: "R", r: m.r, s: m.s, v: a[m.r], win: win() });
  } else if (op === "L") {
    m.s -= a[m.l];
    m.log.push({ op: "L", l: m.l + 1, s: m.s, v: a[m.l], out: shown(m.task, a[m.l]) });
    m.l++;
    if (++m.shrinks >= 2) see("shrinkMany");
  } else if (op === "best") {
    m.log.push({ op: "best", was: m.best, v: value(m) });
    m.best = value(m);
  } else {
    m.ret = m.best;
    m.log.push({ op: "return", v: m.best });
    if (algo === "fixed" && n - k >= 4) see("slide");
    if (n >= 10) see("linear");
  }
  return m;
}

export function winRun(task: WinTask): { ops: number[]; end: WinMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: WinTask, ops: number[]): WinMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/** What the player tried: an edge dragged to index `to`, the window's value into best, best or the value into return. */
export type WinAttempt = { kind: "move"; p: "l" | "r"; to: number } | { kind: "best" } | { kind: "return"; what: "best" | "value" };
export type WinWhy =
  | "oneStep" | "atEnd" | "returnEarly" | "returnWhat" | "bestFirst" | "bestNot" | "notFull"
  | "tooWide" | "keepK" | "overS" | "fits" | "repeatIn" | "noRepeat";
export type WinCheck = { ok: true; code: number } | { ok: false; why: WinWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: WinMachine, a: WinAttempt): WinCheck {
  const e = expect(m);
  const no = (why: WinWhy, vars: Record<string, string | number> = {}): WinCheck => ({ ok: false, why, vars });
  const ok = (op: WinOp): WinCheck => ({ ok: true, code: OPS.indexOf(op) });
  const { algo, a: arr, k } = m.task;
  const n = arr.length;
  const what = algo === "fixed" ? "s" : "len";
  // The run is over: nothing more to do (the board never asks).
  if (!e) return no("returnEarly", { r: m.r });
  if (a.kind === "return") {
    if (e !== "return") return no("returnEarly", { r: m.r });
    return a.what === "best" ? ok("return") : no("returnWhat", { best: num(m.best) });
  }
  if (a.kind === "best") {
    if (e === "best") return ok("best");
    if (algo === "fixed" && size(m) < k) return no("notFull", { size: size(m), k });
    if (e === "L") return algo === "fixed" ? no("tooWide", { size: size(m), k, v: arr[m.l] }) : no("overS", { s: m.s, S: k });
    return no("bestNot", { what, v: value(m), best: num(m.best) });
  }
  if (e === "return") return no("atEnd", { best: num(m.best) });
  if (e === "best") return no("bestFirst", { what, v: value(m), best: num(m.best) });
  if (a.p === "r" && e === "L") {
    if (algo === "fixed") return no("tooWide", { size: size(m), k, v: arr[m.l] });
    if (algo === "atMost") return no("overS", { s: m.s, S: k });
    return no("repeatIn", { c: letter(arr[m.r + 1]), at: arr.indexOf(arr[m.r + 1], m.l) });
  }
  if (a.p === "l" && e === "R") {
    if (algo === "fixed") return no("keepK", { size: size(m), k });
    if (algo === "atMost") return no("fits", { s: m.s, S: k });
    return no("noRepeat", { c: letter(arr[m.r + 1]) });
  }
  const to = a.p === "r" ? m.r + 1 : m.l + 1;
  return a.to === to && to < n ? ok(a.p === "r" ? "R" : "L") : no("oneStep", { p: a.p, to, got: a.to });
}

// ---------- the tasks ----------

type Spec = { algo: WinAlgo | null; n: number; need?: WinNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

/**
 * A task worth playing: best is taken at least twice and is not the first window, and the variable windows shrink at
 * least twice and are never empty; the letters use four of A–E, the sums numbers up to S. `need` asks for a run that
 * shows something.
 */
export function winTask(spec: Spec, next: () => number): WinTask {
  const algo = spec.algo ?? pick(WIN_ALGOS, next);
  for (;;) {
    let t: WinTask;
    if (algo === "fixed") t = { algo, a: Array.from({ length: spec.n }, () => int(1, 9, next)), k: int(3, Math.min(5, spec.n - 3), next) };
    else if (algo === "atMost") {
      const S = int(8, 14, next);
      t = { algo, a: Array.from({ length: spec.n }, () => int(1, Math.min(6, S), next)), k: S };
    } else t = { algo, a: Array.from({ length: spec.n }, () => int(0, 3, next)), k: 0 };
    const { ops, end } = winRun(t);
    const count = (op: WinOp) => ops.filter((c) => OPS[c] === op).length;
    if (count("best") < 2) continue;
    if (algo !== "fixed" && count("L") < 2) continue;
    if (algo === "fixed" && end.best === t.a.slice(0, t.k).reduce((x, y) => x + y, 0)) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const WIN_LADDER: (Spec & { seed: number })[] = [
  { algo: "fixed", n: 7, seed: 2601 },
  { algo: "atMost", n: 7, seed: 2602 },
  { algo: "unique", n: 7, seed: 2603 },
  { algo: "fixed", n: 10, need: "slide", seed: 2604 },
  { algo: "atMost", n: 9, need: "shrinkMany", seed: 2605 },
  { algo: "unique", n: 9, need: "shrinkMany", seed: 2606 },
  { algo: "fixed", n: 12, seed: 2607 },
  { algo: "atMost", n: 12, seed: 2608 },
  { algo: "unique", n: 12, seed: 2609 },
];
/** The endless run: easy, the largest sum or a sum at most S on seven or eight; medium, any on eight to ten; hard, any on ten to twelve. */
export function levelSpec(level: WinLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["fixed", "atMost"] as const, next), n: int(7, 8, next) };
  return { algo: null, n: level === 2 ? int(8, 10, next) : int(10, 12, next) };
}

export const winStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function winNotice(m: WinMachine, misses: number, streak: number): WinNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (WIN_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeWindow = EndlessGame<WinNotice, WinLevel, { kind: "wrong"; why: WinWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function winNow(d: Pick<LiveBeWindow, "mode" | "stage" | "level" | "seed">): WinTask {
  if (d.mode === "puzzle") {
    const s = WIN_LADDER[d.stage];
    return winTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return winTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<WinAlgo, string[]> = {
  fixed: ["l = 0; r = −1; s = 0; best = −∞", "while r + 1 < n:", "  r += 1; s += a[r]", "  if r − l + 1 > k: s −= a[l]; l += 1", "  if r − l + 1 == k: best = max(best, s)", "return best"],
  atMost: ["l = 0; r = −1; s = 0; best = 0", "while r + 1 < n:", "  r += 1; s += a[r]", "  while s > S: s −= a[l]; l += 1", "  best = max(best, r − l + 1)", "return best"],
  unique: ["l = 0; r = −1; best = 0", "while r + 1 < n:", "  while a[r + 1] in a[l..r]: l += 1", "  r += 1", "  best = max(best, r − l + 1)", "return best"],
};

export function logText(l: WinLog, t: WinTask): string {
  switch (l.op) {
    case "start":
      return CODE[t.algo][0];
    case "R":
      return t.algo === "unique" ? `r = ${l.r}; window = ${l.win}` : `r = ${l.r}; s = ${l.s - l.v} + ${l.v} = ${l.s}`;
    case "L":
      return t.algo === "unique" ? `${l.out} leaves; l = ${l.l}` : `s = ${l.s + l.v} − ${l.v} = ${l.s}; l = ${l.l}`;
    case "best":
      return `best = max(${num(l.was)}, ${l.v}) = ${l.v}`;
    case "return":
      return `return best = ${num(l.v)}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a column (c), an edge (pl, pr), the window's value, best, return. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type WinPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const CELL = 38;
const STEP = 44;
const LEFT = 64;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/**
 * The machine drawn as a computer keeps it: k or S, the array with its indexes (a dashed column at −1 for r before the
 * first cell), the window a[l..r] framed blue with the cells it has passed grey, the next letter orange (unique), a row
 * for each edge with its chip, what the code works out about the window with its value as a chip, best and return.
 * `hot` lights the spot a drag is over and `sel` the one picked up.
 */
export function winSvg(m: WinMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): WinPic {
  const { algo, a, k } = m.task;
  const n = a.length;
  const col = (x: number) => LEFT + (x + 1) * STEP;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const right = col(n - 1) + CELL;
  const e = expect(m);

  if (algo !== "unique") parts.push(tx(16, 26, algo === "fixed" ? `k = ${k}` : `S = ${k}`, { size: 18, anchor: "start", bold: true, mono: true, color: ORANGE }));
  parts.push(tx(algo === "unique" ? 16 : 110, 26, `n = ${n}`, { size: 14, anchor: "start", mono: true, color: MUTED }));
  const y0 = 44;
  const cy = y0 + 16;
  const rowY = (r: number) => cy + CELL + 12 + r * 30;
  const bottom = rowY(2) + 4;
  for (let x = -1; x < n; x++) {
    const id = `c${x}`;
    const l = lit(id);
    parts.push(tx(col(x) + CELL / 2, y0 + 8, x < 0 ? "−1" : String(x), { size: 11, color: MUTED, mono: true }));
    if (l) parts.push(box(col(x) - 2, cy - 4, CELL + 4, bottom - cy + 4, l === "hot" ? "#fff3bf" : "#fff4e6", ORANGE, true, 1.4));
    if (x < 0) {
      parts.push(box(col(x), cy, CELL, CELL, "#fff", "#ced4da", true));
      spots.push({ id, x: col(x), y: cy, w: CELL, h: bottom - cy, from: false, to: true, label: "index −1" });
      continue;
    }
    const inside = x >= m.l && x <= m.r;
    const passed = x < m.l;
    const nextIn = algo === "unique" && x === m.r + 1 && m.ret === null;
    const fill = inside ? "#e7f5ff" : passed ? "#f1f3f5" : nextIn ? "#fff4e6" : "#fff";
    parts.push(box(col(x), cy, CELL, CELL, fill, inside ? BLUE : nextIn ? ORANGE : passed ? "#dee2e6" : "#868e96", false, inside || nextIn ? 2 : 1.6));
    parts.push(tx(col(x) + CELL / 2, cy + 25, shown(m.task, a[x]), { size: 17, bold: true, color: passed ? "#adb5bd" : INK }));
    spots.push({ id, x: col(x), y: cy, w: CELL, h: bottom - cy, from: false, to: true, label: `a[${x}] = ${shown(m.task, a[x])}` });
  }
  // The window's frame.
  if (m.r >= m.l) parts.push(`<rect x="${col(m.l) - 5}" y="${cy - 5}" width="${col(m.r) - col(m.l) + CELL + 10}" height="${CELL + 10}" rx="8" fill="none" stroke="${BLUE}" stroke-width="3"/>`);
  parts.push(tx(LEFT - 10, cy + 25, "a[]", { size: 14, anchor: "end", bold: true, mono: true }));
  (["l", "r"] as const).forEach((p, row) => {
    const id = `p${p}`;
    const l = lit(id);
    const cx = col(Math.min(m[p], n - 1)) + CELL / 2;
    const yy = rowY(row);
    parts.push(box(cx - 15, yy, 30, 24, l ? "#ffe8cc" : "#fff", l ? ORANGE : BLUE, false, 2, 12));
    parts.push(tx(cx, yy + 17, p, { size: 14, bold: true, mono: true, color: BLUE }));
    spots.push({ id, x: cx - 15, y: yy, w: 30, h: 24, from: !o.finished, to: false, label: p });
    parts.push(tx(right + 18, yy + 17, `${p} = ${m[p] < 0 ? "−1" : m[p]}`, { size: 13, anchor: "start", mono: true, bold: true, color: BLUE }));
  });

  // What the code works out about the window, its value as a chip.
  let y = bottom + 32;
  const say = (s: string, color = INK) => parts.push(tx(16, y, s, { size: 16, anchor: "start", mono: true, bold: true, color }));
  const inWin = a.slice(m.l, m.r + 1);
  let label: string;
  if (algo === "unique") {
    say(`window = {${inWin.map(letter).join(", ")}}${m.r < n - 1 ? `   a[r + 1] = ${letter(a[m.r + 1])}` : ""}`);
    y += 34;
    label = `r − l + 1 = ${size(m)}, len =`;
  } else {
    const terms = inWin.length > 1 ? `${inWin.join(" + ").length > 34 ? `sum(a[${m.l}..${m.r}])` : inWin.join(" + ")} = ` : "";
    say(`s = ${terms}${m.s}${algo === "atMost" ? `  ${m.s > k ? ">" : "≤"}  S = ${k}` : ""}`, algo === "atMost" && m.s > k ? ORANGE : INK);
    y += 34;
    label = algo === "fixed" ? `s, ${size(m)} wide =` : `r − l + 1 = ${size(m)}, len =`;
  }
  if (m.ret === null) {
    parts.push(tx(16, y, label, { size: 15, anchor: "start", mono: true, color: MUTED }));
    const vx = 16 + (label.length + 1) * 9;
    const vl = lit("val");
    parts.push(box(vx, y - 21, 52, 30, vl ? "#ffe8cc" : "#f3f0ff", VIOLET, false, 2, 15));
    parts.push(tx(vx + 26, y - 1, String(value(m)), { size: 16, bold: true, color: VIOLET }));
    spots.push({ id: "val", x: vx, y: y - 21, w: 52, h: 30, from: !o.finished, to: false, label: `${algo === "fixed" ? "s" : "len"} = ${value(m)}` });
  }
  y += 24;
  parts.push(tx(16, y + 26, "best", { size: 16, anchor: "start", mono: true, bold: true }));
  const bl = lit("best");
  parts.push(box(70, y, 60, 40, bl === "hot" ? "#fff3bf" : bl ? "#ffe8cc" : "#f3f0ff", bl ? ORANGE : VIOLET, false, 2));
  parts.push(tx(100, y + 27, num(m.best), { size: 18, bold: true, color: VIOLET }));
  spots.push({ id: "best", x: 70, y, w: 60, h: 40, from: !o.finished, to: true, label: `best = ${num(m.best)}` });
  y += 50;
  parts.push(tx(16, y + 26, "return", { size: 16, anchor: "start", mono: true, bold: true }));
  const rl = lit("ret");
  const got = m.ret !== null;
  parts.push(box(92, y, 60, 40, rl === "hot" ? "#fff3bf" : got ? "#d3f9d8" : "#fff", rl ? ORANGE : got ? GREEN : e === "return" ? ORANGE : "#adb5bd", !got, rl || e === "return" ? 2.4 : 1.6));
  if (got) parts.push(tx(122, y + 27, num(m.ret!), { size: 18, bold: true, color: o.finished ? GREEN : INK }));
  spots.push({ id: "ret", x: 92, y, w: 60, h: 40, from: false, to: true, label: "return" });
  return { w: Math.max(right + 90, 460), h: y + 56, body: parts.join(""), spots };
}
