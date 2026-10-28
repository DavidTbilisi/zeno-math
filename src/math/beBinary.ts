// Be the binary search: the player is the computer searching a sorted array, one operation at a time, by moving the
// pointers the code keeps. Each round the player drags mid to (lo + hi) // 2; the code compares a[mid] with x; then the
// player moves lo or hi past mid (or, in the bounds, hi onto mid), until x is found or the range is empty, and drags
// what the code returns into return. Three searches: find x (−1 when it isn't there), the lower bound (the first
// a[i] ≥ x) and the upper bound (the first a[i] > x), the bounds on arrays with repeats. Each operation the player makes
// is checked against the code; a wrong one is not made and says the rule it broke. Kept free of React: the board keeps
// only the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type BinAlgo = "find" | "lower" | "upper";
export const BIN_ALGOS: readonly BinAlgo[] = ["find", "lower", "upper"];
export type BinLevel = 1 | 2 | 3;
/** A sorted array and the x searched for. */
export type BinTask = { algo: BinAlgo; a: number[]; x: number };

export type BinNotice = "absent" | "dupes" | "pastEnd" | "logn" | "streak10";
export const BIN_NOTICES: BinNotice[] = ["absent", "dupes", "pastEnd", "logn", "streak10"];

/** A line of the step log, as code. */
export type BinLog =
  | { op: "start"; hi: number }
  | { op: "mid"; lo: number; hi: number; m: number; v: number; sign: string; x: number }
  | { op: "lo" | "hi"; expr: string; to: number }
  | { op: "return"; what: string; v: number };

/**
 * The machine's memory after some operations: the pointers (mid −1 before the first round), whether mid is placed in
 * the round under way, what the code returned (null before), how many times it looked, the code lines the last
 * operation ran, the log, and what the run has shown.
 */
export type BinMachine = {
  task: BinTask;
  lo: number;
  hi: number;
  mid: number;
  placed: boolean;
  ret: number | null;
  looks: number;
  lines: number[];
  log: BinLog[];
  seen: BinNotice[];
};

export function startMachine(task: BinTask): BinMachine {
  const hi = task.algo === "find" ? task.a.length - 1 : task.a.length;
  return { task, lo: 0, hi, mid: -1, placed: false, ret: null, looks: 0, lines: [0], log: [{ op: "start", hi }], seen: [] };
}

/** Whether the loop goes on: lo ≤ hi to find x, lo < hi for the bounds. */
const going = (m: BinMachine) => (m.task.algo === "find" ? m.lo <= m.hi : m.lo < m.hi);
/** Whether a[mid] sends lo past it: a[mid] < x, or a[mid] ≤ x for the upper bound. */
const below = (m: BinMachine) => (m.task.algo === "upper" ? m.task.a[m.mid] <= m.task.x : m.task.a[m.mid] < m.task.x);

/** What the code does next: place mid, move lo or hi, return a value; null when it has returned. */
export type BinExpect = { kind: "mid" | "lo" | "hi"; at: number } | { kind: "return"; v: number } | null;
export function expect(m: BinMachine): BinExpect {
  if (m.ret !== null) return null;
  const { algo, a, x } = m.task;
  if (!m.placed) return going(m) ? { kind: "mid", at: (m.lo + m.hi) >> 1 } : { kind: "return", v: algo === "find" ? -1 : m.lo };
  if (algo === "find" && a[m.mid] === x) return { kind: "return", v: m.mid };
  if (below(m)) return { kind: "lo", at: m.mid + 1 };
  return { kind: "hi", at: algo === "find" ? m.mid - 1 : m.mid };
}

/** The code's lines, per search: the line each kind of operation runs. */
const LINE = {
  find: { mid: [1, 2], eq: 3, lo: 4, hi: 5, none: 6 },
  lower: { mid: [1, 2], eq: -1, lo: 3, hi: 4, none: 5 },
  upper: { mid: [1, 2], eq: -1, lo: 3, hi: 4, none: 5 },
};

/** The machine after one more operation: the place of mid, lo or hi, or the value returned. */
export function apply(m0: BinMachine, code: number): BinMachine {
  const m: BinMachine = { ...m0, log: [...m0.log], seen: [...m0.seen] };
  const see = (k: BinNotice) => m.seen.includes(k) || m.seen.push(k);
  const e = expect(m0);
  const { algo, a, x } = m.task;
  const L = LINE[algo];
  if (!e) return m;
  if (e.kind === "mid") {
    [m.mid, m.placed] = [code, true];
    m.looks++;
    const v = a[code];
    const sign = v === x ? "==" : v < x ? "<" : ">";
    m.log.push({ op: "mid", lo: m.lo, hi: m.hi, m: code, v, sign, x });
    m.lines = L.mid;
  } else if (e.kind === "lo" || e.kind === "hi") {
    m[e.kind] = code;
    m.placed = false;
    m.log.push({ op: e.kind, expr: e.kind === "lo" ? "mid + 1" : algo === "find" ? "mid − 1" : "mid", to: code });
    m.lines = [L[e.kind]];
  } else {
    m.ret = code;
    const found = algo === "find" && code >= 0;
    m.log.push({ op: "return", what: found ? "mid" : algo === "find" ? "" : "lo", v: code });
    m.lines = [found ? L.eq : L.none];
    if (algo === "find" && code < 0) see("absent");
    if (algo !== "find" && a.filter((v) => v === x).length > 1) see("dupes");
    if (algo !== "find" && code === a.length) see("pastEnd");
    if (a.length >= 15) see("logn");
  }
  return m;
}

/** The code's own operations, start to end, and the machine at the end. */
export function binRun(task: BinTask): { ops: number[]; end: BinMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = e.kind === "return" ? e.v : e.at;
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: BinTask, ops: number[]): BinMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/** What the player tried: mid, lo or hi dragged to index `at`; mid, lo, hi or −1 dragged into return. */
export type BinAttempt = { kind: "mid" | "lo" | "hi"; at: number } | { kind: "return"; what: "mid" | "lo" | "hi" | "none" };
export type BinWhy =
  | "midFirst" | "midOut" | "midRound" | "midWrong" | "midAgain" | "overNone" | "overLo" | "isX"
  | "goRight" | "goLeft" | "past" | "dropMid" | "keepMid" | "moveWrong" | "returnEarly" | "returnMid" | "returnNone" | "returnLo";
export type BinCheck = { ok: true; code: number } | { ok: false; why: BinWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: BinMachine, a: BinAttempt): BinCheck {
  const e = expect(m);
  const no = (why: BinWhy, vars: Record<string, string | number> = {}): BinCheck => ({ ok: false, why, vars });
  const { algo, x } = m.task;
  const { lo, hi, mid } = m;
  const v = mid >= 0 ? m.task.a[mid] : 0;
  const find = algo === "find";
  // The run is over: nothing more to do (the board never asks).
  if (!e) return no("returnEarly", { cond: find ? "lo ≤ hi" : "lo < hi" });
  const over = () => (find ? (m.placed ? no("isX", { m: mid, v }) : no("overNone", { lo, hi })) : no("overLo", { lo }));
  if (a.kind === "return") {
    if (e.kind !== "return") return no("returnEarly", { cond: find ? (m.placed ? `a[${mid}] ≠ x` : "lo ≤ hi") : "lo < hi" });
    if (!find) return a.what === "lo" || a.what === "hi" ? { ok: true, code: e.v } : no("returnLo", { lo });
    if (e.v < 0) return a.what === "none" ? { ok: true, code: -1 } : no("returnNone", { lo, hi });
    return a.what === "mid" ? { ok: true, code: e.v } : no("returnMid", { m: mid });
  }
  if (a.kind === "mid") {
    if (e.kind === "return") return over();
    if (e.kind !== "mid") return no("midAgain", { m: mid });
    if (a.at === e.at) return { ok: true, code: a.at };
    const vars = { lo, hi, m: e.at, got: a.at };
    if (a.at === (lo + hi + 1) >> 1) return no("midRound", vars);
    return no(a.at < lo || a.at > hi || (!find && a.at === hi) ? "midOut" : "midWrong", vars);
  }
  if (e.kind === "mid") return no("midFirst");
  if (e.kind === "return") return over();
  if (a.kind !== e.kind) {
    const op = e.kind === "lo" ? (algo === "upper" ? "≤" : "<") : algo === "lower" ? "≥" : ">";
    return no(e.kind === "lo" ? "goRight" : "goLeft", { m: mid, v, op, x });
  }
  if (a.at === e.at) return { ok: true, code: a.at };
  if (a.kind === "lo" && a.at === mid) return no("past", { m: mid, v, to: e.at });
  if (a.kind === "hi" && find && a.at === mid) return no("dropMid", { m: mid, v, to: e.at });
  if (a.kind === "hi" && !find && a.at === mid - 1) return no("keepMid", { m: mid, v });
  return no("moveWrong", { p: a.kind, expr: a.kind === "lo" ? "mid + 1" : find ? "mid − 1" : "mid", to: e.at, got: a.at });
}

// ---------- the tasks ----------

/** Where x is: in the array, not in it, past its end (the bounds), or one of a run of repeats (the bounds). */
type Where = "in" | "out" | "past" | "dupes";
type Spec = { algo: BinAlgo | null; n: number; where: Where | null };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

/**
 * A task worth playing: a sorted array (repeats only for the bounds) and x where the spec says, and a search that
 * looks at least three times (or twice on seven) and doesn't hit x on its first look.
 */
export function binTask(spec: Spec, next: () => number): BinTask {
  const algo = spec.algo ?? pick(BIN_ALGOS, next);
  for (;;) {
    const where = spec.where ?? (algo === "find" ? pick(["in", "out"] as const, next) : pick(["in", "out", "dupes", "past"] as const, next));
    const a: number[] = [int(1, 9, next)];
    for (let i = 1; i < spec.n; i++) a.push(a[i - 1] + (algo === "find" ? int(1, 5, next) : pick([0, 0, 1, 2, 3, 4], next)));
    let x: number;
    if (where === "in") x = pick(a, next);
    else if (where === "past") x = a[a.length - 1] + int(1, 5, next);
    else if (where === "dupes") {
      const twice = a.filter((v, i) => a.indexOf(v) !== i);
      if (!twice.length) continue;
      x = pick(twice, next);
    } else {
      x = int(a[0] + 1, a[a.length - 1] - 1, next);
      if (a.includes(x)) continue;
    }
    const t: BinTask = { algo, a, x };
    const run = binRun(t);
    if (run.end.looks < (spec.n <= 7 ? 2 : 3)) continue;
    if (algo === "find" && a[(a.length - 1) >> 1] === x) continue;
    return t;
  }
}

export const BIN_LADDER: (Spec & { seed: number })[] = [
  { algo: "find", n: 7, where: "in", seed: 2401 },
  { algo: "find", n: 7, where: "out", seed: 2402 },
  { algo: "lower", n: 8, where: "dupes", seed: 2403 },
  { algo: "find", n: 15, where: "in", seed: 2404 },
  { algo: "upper", n: 8, where: "dupes", seed: 2405 },
  { algo: "lower", n: 10, where: "past", seed: 2406 },
  { algo: "find", n: 15, where: "out", seed: 2407 },
  { algo: "upper", n: 12, where: "dupes", seed: 2408 },
  { algo: null, n: 15, where: null, seed: 2409 },
];
/** The endless run: easy, find on seven to nine; medium, find or the lower bound on ten to twelve; hard, any on thirteen to fifteen. */
export function levelSpec(level: BinLevel, next: () => number): Spec {
  if (level === 1) return { algo: "find", n: int(7, 9, next), where: null };
  if (level === 2) return { algo: pick(["find", "lower"] as const, next), n: int(10, 12, next), where: null };
  return { algo: null, n: int(13, 15, next), where: null };
}

export const binStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function binNotice(m: BinMachine, misses: number, streak: number): BinNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (BIN_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeBinary = EndlessGame<BinNotice, BinLevel, { kind: "wrong"; why: BinWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far: where mid, lo or hi went, or the value returned. */
    ops: number[];
  };
export function binNow(d: Pick<LiveBeBinary, "mode" | "stage" | "level" | "seed">): BinTask {
  if (d.mode === "puzzle") {
    const s = BIN_LADDER[d.stage];
    return binTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return binTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<BinAlgo, string[]> = {
  find: ["lo = 0; hi = n − 1", "while lo ≤ hi:", "  mid = (lo + hi) // 2", "  if a[mid] == x: return mid", "  if a[mid] < x: lo = mid + 1", "  else: hi = mid − 1", "return −1"],
  lower: ["lo = 0; hi = n", "while lo < hi:", "  mid = (lo + hi) // 2", "  if a[mid] < x: lo = mid + 1", "  else: hi = mid", "return lo        # the first a[i] ≥ x"],
  upper: ["lo = 0; hi = n", "while lo < hi:", "  mid = (lo + hi) // 2", "  if a[mid] ≤ x: lo = mid + 1", "  else: hi = mid", "return lo        # the first a[i] > x"],
};

const num = (v: number) => (v < 0 ? `−${-v}` : String(v));

export function logText(l: BinLog): string {
  switch (l.op) {
    case "start":
      return `lo = 0; hi = ${l.hi}`;
    case "mid":
      return `mid = (${l.lo} + ${l.hi}) // 2 = ${l.m}; a[${l.m}] = ${l.v} ${l.sign} x = ${l.x}`;
    case "lo":
    case "hi":
      return `${l.op} = ${l.expr} = ${num(l.to)}`;
    case "return":
      return `return ${l.what ? `${l.what} = ` : ""}${num(l.v)}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a column (c), a pointer (plo, pmid, phi), −1 (none), return (ret). */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type BinPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const CELL = 36;
const STEP = 40;
const LEFT = 64;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const t = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/** The columns the pointers can stand on: −1 (find's hi when x is below every value) through n (lo past the end). */
export function columns(t0: BinTask): number[] {
  const n = t0.a.length;
  return Array.from({ length: n + (t0.algo === "find" ? 2 : 1) }, (_, k) => k - (t0.algo === "find" ? 1 : 0));
}

/**
 * The machine drawn as a computer keeps it: x, the array with its indexes (the cells still in the range white, the
 * ones ruled out grey, a[mid] orange once mid is placed, what is returned green), a dashed column past each end, a row
 * for each pointer with its chip under the index it holds, the compare of a[mid] with x, and return. `hot` lights the
 * spot a drag is over and `sel` the one picked up.
 */
export function binSvg(m: BinMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): BinPic {
  const { a, x, algo } = m.task;
  const n = a.length;
  const cols = columns(m.task);
  const off = algo === "find" ? 1 : 0;
  const col = (i: number) => LEFT + (i + off) * STEP;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const right = col(cols[cols.length - 1]) + CELL;

  parts.push(t(16, 26, `x = ${x}`, { size: 18, anchor: "start", bold: true, mono: true, color: ORANGE }));
  parts.push(t(130, 26, `n = ${n}`, { size: 14, anchor: "start", mono: true, color: MUTED }));
  const y0 = 44;
  const cy = y0 + 16;
  const rowY = (k: number) => cy + CELL + 10 + k * 30;
  const bottom = rowY(3) + 4;
  for (const i of cols) {
    const x0 = col(i);
    const id = `c${i}`;
    const l = lit(id);
    parts.push(t(x0 + CELL / 2, y0 + 8, String(i < 0 ? "−1" : i), { size: 11, color: MUTED, mono: true }));
    if (l) parts.push(box(x0 - 2, cy - 4, CELL + 4, bottom - cy + 4, l === "hot" ? "#fff3bf" : "#fff4e6", ORANGE, true, 1.4));
    if (i < 0 || i >= n) parts.push(box(x0, cy, CELL, CELL, "#fff", "#ced4da", true));
    else {
      const inRange = i >= m.lo && i <= m.hi;
      const isMid = m.placed && i === m.mid;
      const isRet = m.ret !== null && m.ret === i;
      const fill = isRet ? "#d3f9d8" : isMid ? "#fff4e6" : inRange ? "#fff" : "#f1f3f5";
      parts.push(box(x0, cy, CELL, CELL, fill, isRet ? GREEN : isMid ? ORANGE : inRange ? "#868e96" : "#dee2e6", false, isMid || isRet ? 2.6 : 1.6));
      parts.push(t(x0 + CELL / 2, cy + 24, String(a[i]), { size: a[i] > 99 ? 13 : 16, bold: true, color: inRange || isRet ? INK : "#adb5bd" }));
    }
    spots.push({ id, x: x0, y: cy, w: CELL, h: bottom - cy, from: false, to: true, label: i >= 0 && i < n ? `a[${i}] = ${a[i]}` : i < 0 ? "index −1" : `index ${i}, past the end` });
  }
  parts.push(t(LEFT - 10, cy + 24, "a[]", { size: 14, anchor: "end", bold: true, mono: true }));
  // The pointer rows: lo, mid, hi; mid waits at the left of its row until it is first placed.
  const chip = (name: "lo" | "mid" | "hi", at: number | null, k: number) => {
    const id = `p${name}`;
    const l = lit(id);
    const w = 34;
    const cx = at === null ? LEFT - 30 : col(at) + CELL / 2;
    const y = rowY(k);
    const color = name === "mid" ? ORANGE : BLUE;
    parts.push(box(cx - w / 2, y, w, 24, l ? "#ffe8cc" : name === "mid" ? "#fff4e6" : "#e7f5ff", l ? ORANGE : color, false, 2, 12));
    parts.push(t(cx, y + 17, name, { size: 13, bold: true, mono: true, color }));
    spots.push({ id, x: cx - w / 2, y, w, h: 24, from: !o.finished, to: false, label: name });
  };
  chip("lo", m.lo, 0);
  chip("mid", m.mid >= 0 ? m.mid : null, 1);
  chip("hi", m.hi, 2);
  // What the pointers hold, beside the array.
  const sx = right + 18;
  [`lo = ${num(m.lo)}`, `mid = ${m.mid >= 0 ? m.mid : "?"}`, `hi = ${num(m.hi)}`].forEach((s, k) => parts.push(t(sx, rowY(k) + 17, s, { size: 13, anchor: "start", mono: true, bold: true, color: k === 1 ? ORANGE : BLUE })));

  // The compare, once mid is placed.
  let y = bottom + 30;
  if (m.placed && m.ret === null) {
    const v = a[m.mid];
    const sign = v === x ? "==" : v < x ? "<" : ">";
    parts.push(t(16, y, `a[mid] = a[${m.mid}] = ${v}  ${sign}  x = ${x}`, { size: 16, anchor: "start", mono: true, bold: true }));
  } else if (m.ret === null && !m.placed && expect(m)?.kind === "return") {
    parts.push(t(16, y, algo === "find" ? `lo = ${num(m.lo)} > hi = ${num(m.hi)}: the loop ends` : `lo = hi = ${m.lo}: the loop ends`, { size: 16, anchor: "start", mono: true, bold: true, color: MUTED }));
  }
  y += 18;
  // return, and the −1 that find returns when x isn't there.
  parts.push(t(16, y + 26, "return", { size: 16, anchor: "start", mono: true, bold: true }));
  const rl = lit("ret");
  const got = m.ret !== null;
  parts.push(box(92, y, 60, 40, rl === "hot" ? "#fff3bf" : got ? "#d3f9d8" : "#fff", rl ? ORANGE : got ? GREEN : "#adb5bd", !got, rl ? 2.4 : 1.6));
  if (got) parts.push(t(122, y + 27, num(m.ret!), { size: 18, bold: true, color: o.finished ? GREEN : INK }));
  spots.push({ id: "ret", x: 92, y, w: 60, h: 40, from: false, to: true, label: "return" });
  if (algo === "find") {
    const nl = lit("none");
    parts.push(box(176, y + 4, 44, 32, nl ? "#ffe8cc" : "#f8f9fa", nl ? ORANGE : "#868e96", false, 2, 16));
    parts.push(t(198, y + 26, "−1", { size: 16, bold: true, mono: true }));
    spots.push({ id: "none", x: 176, y: y + 4, w: 44, h: 32, from: !o.finished, to: false, label: "−1" });
  }
  return { w: Math.max(sx + 90, 420), h: y + 56, body: parts.join(""), spots };
}
