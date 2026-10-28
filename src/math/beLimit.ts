// Be the rate limiter: the player is a rate limiter deciding, request by request on a timeline of seconds, what to let
// through. Four kinds: the token bucket (a token is earned every R seconds up to the bucket's size; a request takes one
// or is rejected), the fixed window counter (a count of at most L per window of W seconds, reset as a new window
// starts), the sliding log (the times of the requests let through; those W seconds old or more drop out, and at most L
// may stay) and the leaky bucket (requests wait in a queue of a few places, one leaving every D seconds; a full queue
// rejects). Before each decision the player does the clean-up the code does first: refill, reset, drop the old times,
// or let the due requests out. Each operation is checked against the code; a wrong one is not made and says the rule
// it broke. Kept free of React: the board keeps only the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type LimitAlgo = "bucket" | "fixed" | "sliding" | "leaky";
export const LIMIT_ALGOS: readonly LimitAlgo[] = ["bucket", "fixed", "sliding", "leaky"];
export type LimitLevel = 1 | 2 | 3;
/**
 * The requests' times in order, and the limit: the bucket's size and seconds per token (bucket), the count per
 * window and the window's seconds (fixed, sliding), the queue's places and seconds per request out (leaky).
 */
export type LimitTask = { algo: LimitAlgo; times: number[]; cap: number; per: number };

export type LimitNotice = "boundary" | "edge" | "steady" | "burst" | "streak10";
export const LIMIT_NOTICES: LimitNotice[] = ["boundary", "edge", "steady", "burst", "streak10"];

/** A line of the step log, as code. */
export type LimitLog =
  | { op: "start" }
  | { op: "clean"; t: number; k: number; before: number; after: number; last: number; x: number }
  | { op: "allow"; t: number; left: number; list: number[] }
  | { op: "reject"; t: number; left: number };

/**
 * The machine's memory after some operations: the request being decided (r); the tokens and the time they were last
 * counted to (bucket); the count and its window (fixed); the times let through still in the window (sliding) or the
 * queue (leaky) and the time the queue has drained to; what each request got; the lines the last operation ran, the
 * log, and what the run has shown.
 */
export type LimitMachine = {
  task: LimitTask;
  r: number;
  tokens: number;
  last: number;
  count: number;
  window: number;
  list: number[];
  clock: number;
  got: boolean[];
  lines: number[];
  log: LimitLog[];
  seen: LimitNotice[];
};

export function startMachine(task: LimitTask): LimitMachine {
  return { task, r: 0, tokens: task.cap, last: 0, count: 0, window: 0, list: [], clock: 0, got: [], lines: [0], log: [{ op: "start" }], seen: [] };
}

/** The time the queue's next request leaves (leaky): the next multiple of D after the time it has drained to. */
export const nextOut = (m: LimitMachine) => (Math.floor(m.clock / m.task.per) + 1) * m.task.per;
/** The tokens earned since they were last counted (bucket). */
export const earned = (m: LimitMachine, t: number) => Math.floor((t - m.last) / m.task.per);

/** The operations, by code: the clean-up before a decision, let the request through, reject it. */
export const OPS = ["clean", "allow", "reject"] as const;
export type LimitOp = (typeof OPS)[number];

/** Whether the clean-up is due before the current request is decided. */
export function due(m: LimitMachine): boolean {
  const { algo, times, per } = m.task;
  const t = times[m.r];
  if (algo === "bucket") return earned(m, t) > 0;
  if (algo === "fixed") return Math.floor(t / per) !== m.window;
  if (algo === "sliding") return m.list.length > 0 && m.list[0] <= t - per;
  return m.list.length > 0 && nextOut(m) <= t;
}
/** Whether the request can go through now, the clean-up done. */
export function room(m: LimitMachine): boolean {
  const { algo, cap } = m.task;
  if (algo === "bucket") return m.tokens >= 1;
  if (algo === "fixed") return m.count < cap;
  return m.list.length < cap;
}

/** What the code does next; null when every request is decided. */
export function expect(m: LimitMachine): LimitOp | null {
  if (m.r === m.task.times.length) return null;
  if (due(m)) return "clean";
  return room(m) ? "allow" : "reject";
}

/** Which requests a fixed window counter lets through. */
export function fixedAllows(times: number[], w: number, limit: number): boolean[] {
  let window = 0;
  let count = 0;
  return times.map((t) => {
    if (Math.floor(t / w) !== window) [window, count] = [Math.floor(t / w), 0];
    return count < limit && ++count > 0;
  });
}

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: LimitMachine, code: number): LimitMachine {
  const m: LimitMachine = { ...m0, list: [...m0.list], got: [...m0.got], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: LimitNotice) => m.seen.includes(k) || m.seen.push(k);
  const { algo, times, cap, per } = m.task;
  const t = times[m.r];
  const op = OPS[code];
  if (op === "clean") {
    if (algo === "bucket") {
      const k = earned(m, t);
      const before = m.tokens;
      m.tokens = Math.min(cap, m.tokens + k);
      m.last += k * per;
      m.log.push({ op: "clean", t, k, before, after: m.tokens, last: m.last, x: 0 });
      m.lines = [2, 3];
    } else if (algo === "fixed") {
      m.window = Math.floor(t / per);
      m.count = 0;
      m.log.push({ op: "clean", t, k: m.window, before: 0, after: 0, last: 0, x: 0 });
      m.lines = [2];
    } else {
      const x = m.list.shift()!;
      if (algo === "leaky") m.clock = nextOut(m0);
      m.log.push({ op: "clean", t, k: 0, before: 0, after: m.list.length, last: m.clock, x });
      m.lines = [2];
    }
    return m;
  }
  // The queue drains to now when it is empty: a leave time with nobody waiting is lost.
  if (algo === "leaky" && !m.list.length) m.clock = t;
  if (op === "allow") {
    if (algo === "bucket") m.tokens--;
    else if (algo === "fixed") m.count++;
    else m.list.push(t);
    m.got.push(true);
    m.log.push({ op: "allow", t, left: algo === "bucket" ? m.tokens : algo === "fixed" ? m.count : m.list.length, list: [...m.list] });
    m.lines = algo === "bucket" ? [4] : [3];
  } else {
    m.got.push(false);
    m.log.push({ op: "reject", t, left: algo === "bucket" ? m.tokens : algo === "fixed" ? m.count : m.list.length });
    m.lines = algo === "bucket" ? [5] : [4];
  }
  m.r++;
  if (m.r === times.length) {
    const through = times.filter((_, i) => m.got[i]);
    const crowd = (at: number) => through.filter((x) => x === at).length;
    if (algo === "bucket" && through.some((x) => crowd(x) >= 2)) see("burst");
    if (algo === "leaky" && through.some((x) => crowd(x) >= 2)) see("steady");
    if (algo === "fixed" && through.some((x) => through.filter((y) => y >= x && y < x + per).length > cap)) see("boundary");
    if (algo === "sliding" && fixedAllows(times, per, cap).some((ok, i) => ok && !m.got[i])) see("edge");
  }
  return m;
}

export function limitRun(task: LimitTask): { ops: number[]; end: LimitMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: LimitTask, ops: number[]): LimitMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/** What the player tried: the clean-up (the clock onto the bucket or the counter, the oldest time or the queue's head out), the request onto allow or reject. */
export type LimitAttempt = { kind: LimitOp };
export type LimitWhy =
  | "refillFirst" | "newWindow" | "expireFirst" | "leakFirst" | "noRefill" | "sameWindow" | "stillIn" | "noLeak"
  | "noToken" | "atLimit" | "queueFull" | "hasToken" | "underLimit" | "roomInQueue" | "allDone";
export type LimitCheck = { ok: true; code: number } | { ok: false; why: LimitWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: LimitMachine, at: LimitAttempt): LimitCheck {
  const e = expect(m);
  const no = (why: LimitWhy, vars: Record<string, string | number> = {}): LimitCheck => ({ ok: false, why, vars });
  if (e === null) return no("allDone");
  if (at.kind === e) return { ok: true, code: OPS.indexOf(e) };
  const { algo, times, cap, per } = m.task;
  const t = times[m.r];
  const vars = { t, last: m.last, R: per, k: earned(m, t), w: Math.floor(t / per), W: per, x: m.list[0] ?? 0, from: t - per, d: m.list.length ? nextOut(m) : 0, c: algo === "fixed" ? m.count : m.list.length, L: cap, n: m.tokens };
  if (e === "clean") return no(({ bucket: "refillFirst", fixed: "newWindow", sliding: "expireFirst", leaky: "leakFirst" } as const)[algo], vars);
  if (at.kind === "clean") return no(({ bucket: "noRefill", fixed: "sameWindow", sliding: "stillIn", leaky: "noLeak" } as const)[algo], vars);
  if (at.kind === "allow") return no(algo === "bucket" ? "noToken" : algo === "leaky" ? "queueFull" : "atLimit", vars);
  return no(algo === "bucket" ? "hasToken" : algo === "leaky" ? "roomInQueue" : "underLimit", vars);
}

// ---------- the tasks ----------

type Spec = { algo: LimitAlgo | null; n: number; need?: LimitNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

/**
 * A task worth playing: requests in bursts over a few windows' worth of seconds, two rejections and two clean-ups or
 * more, and a request let through after a rejection.
 */
export function limitTask(spec: Spec, next: () => number): LimitTask {
  const algo = spec.algo ?? pick(LIMIT_ALGOS, next);
  for (;;) {
    const cap = int(2, 3, next);
    const per = algo === "fixed" || algo === "sliding" ? int(4, 5, next) : int(2, 3, next);
    const times: number[] = [];
    let at = int(0, 1, next);
    while (times.length < spec.n) {
      times.push(at);
      at += next() < 0.45 ? 0 : int(1, 3, next);
    }
    const t: LimitTask = { algo, times, cap, per };
    const { ops, end } = limitRun(t);
    const count = (op: LimitOp) => ops.filter((c) => OPS[c] === op).length;
    if (count("reject") < 2 || count("clean") < 2) continue;
    if (!end.got.some((ok, i) => ok && end.got.slice(0, i).includes(false))) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const LIMIT_LADDER: (Spec & { seed: number })[] = [
  { algo: "bucket", n: 7, seed: 3701 },
  { algo: "fixed", n: 8, seed: 3702 },
  { algo: "sliding", n: 8, seed: 3703 },
  { algo: "leaky", n: 7, seed: 3704 },
  { algo: "bucket", n: 9, need: "burst", seed: 3705 },
  { algo: "fixed", n: 9, need: "boundary", seed: 3706 },
  { algo: "sliding", n: 10, need: "edge", seed: 3707 },
  { algo: "leaky", n: 9, need: "steady", seed: 3708 },
  { algo: null, n: 10, seed: 3709 },
];
/** The endless run: easy, the token bucket or the fixed window on seven requests; medium, any on eight; hard, any on ten or eleven. */
export function levelSpec(level: LimitLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["bucket", "fixed"] as const, next), n: 7 };
  return { algo: null, n: level === 2 ? 8 : int(10, 11, next) };
}

export const limitStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function limitNotice(m: LimitMachine, misses: number, streak: number): LimitNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (LIMIT_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeLimit = EndlessGame<LimitNotice, LimitLevel, { kind: "wrong"; why: LimitWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function limitNow(d: Pick<LiveBeLimit, "mode" | "stage" | "level" | "seed">): LimitTask {
  if (d.mode === "puzzle") {
    const s = LIMIT_LADDER[d.stage];
    return limitTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return limitTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<LimitAlgo, string[]> = {
  bucket: [
    "tokens = cap; last = 0",
    "on request at t:",
    "  k = (t − last) // R    # whole tokens earned",
    "  tokens = min(cap, tokens + k); last += k × R",
    "  if tokens ≥ 1: tokens −= 1; allow",
    "  else: reject",
  ],
  fixed: ["count = 0; window = 0", "on request at t:", "  if t // W != window: window = t // W; count = 0", "  if count < L: count += 1; allow", "  else: reject"],
  sliding: ["log = []      # times let through", "on request at t:", "  while log and log[0] ≤ t − W: log.pop(0)", "  if len(log) < L: log.append(t); allow", "  else: reject"],
  leaky: ["queue = []    # one leaves every D s", "on request at t:", "  while queue and its leave time ≤ t: queue.pop(0)", "  if len(queue) < cap: queue.append(t)   # waits", "  else: reject"],
};

export function logText(l: LimitLog, t: LimitTask): string {
  const { algo, cap, per } = t;
  switch (l.op) {
    case "start":
      return algo === "bucket"
        ? `tokens = ${cap}; last = 0; R = ${per} s`
        : algo === "fixed"
          ? `count = 0; window = 0; W = ${per} s, L = ${cap}`
          : algo === "sliding"
            ? `log = []; W = ${per} s, L = ${cap}`
            : `queue = []; cap = ${cap}; one out every ${per} s`;
    case "clean":
      if (algo === "bucket") return `t = ${l.t}: k = ${l.k}; tokens = min(${cap}, ${l.before} + ${l.k}) = ${l.after}; last = ${l.last}`;
      if (algo === "fixed") return `t = ${l.t}: window ${l.k} starts; count = 0`;
      if (algo === "sliding") return `t = ${l.t}: drop ${l.x} (${l.x} ≤ ${l.t} − ${per})`;
      return `t = ${l.last}: the request of t = ${l.x} leaves the queue`;
    case "allow":
      return algo === "bucket"
        ? `t = ${l.t}: allow; tokens = ${l.left}`
        : algo === "fixed"
          ? `t = ${l.t}: allow; count = ${l.left}`
          : algo === "sliding"
            ? `t = ${l.t}: allow; log = [${l.list.join(", ")}]`
            : `t = ${l.t}: queued; queue = [${l.list.join(", ")}]`;
    case "reject":
      return algo === "bucket"
        ? `t = ${l.t}: reject (no token)`
        : algo === "fixed"
          ? `t = ${l.t}: reject (count = ${l.left} = L)`
          : algo === "sliding"
            ? `t = ${l.t}: reject (${l.left} in the last ${per} s)`
            : `t = ${l.t}: reject (queue full)`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: the request, the clock, the oldest time or queue head (head), the state, allow, reject, the bin. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type LimitPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const RED = "#e03131";
const GOLD = "#f59f00";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const LEFT = 100;
const SPAN = 470;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/**
 * The machine drawn as a computer keeps it: the timeline of seconds with each request a dot (grey to come, orange now,
 * green let through, red rejected), the windows shaded (fixed), the last W seconds bracketed (sliding) or the leave
 * times marked (leaky); the request now; the limiter's state (the bucket's tokens with the clock beside it, the count
 * and its window, the log of times, or the queue) with what drags into or out of it; and allow and reject. `hot`
 * lights the spot a drag is over and `sel` the one picked up.
 */
export function limitSvg(m: LimitMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): LimitPic {
  const task = m.task;
  const { algo, times, cap, per } = task;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const now = live ? times[m.r] : null;
  const end = times[times.length - 1] + 1;
  const X = (t: number) => LEFT + (t / end) * SPAN;
  const label = (y: number, s: string) => parts.push(tx(LEFT - 12, y, s, { size: 14, anchor: "end", bold: true, mono: true }));

  // The timeline.
  let y = 8;
  const ty = y + 60;
  label(ty + 5, "time");
  if (algo === "fixed")
    for (let w = 0; w * per < end; w++) {
      const x1 = X(w * per);
      const x2 = X(Math.min(end, (w + 1) * per));
      parts.push(`<rect x="${x1.toFixed(1)}" y="${y}" width="${(x2 - x1).toFixed(1)}" height="70" fill="${w % 2 ? "#f8f9fa" : "#edf2ff"}"/>`);
      parts.push(tx((x1 + x2) / 2, y + 12, `window ${w}`, { size: 10, mono: true, color: MUTED }));
    }
  if (algo === "sliding" && now !== null) {
    const x1 = X(Math.max(0, now - per));
    parts.push(`<rect x="${x1.toFixed(1)}" y="${y}" width="${(X(now) - x1).toFixed(1)}" height="70" fill="#f3f0ff" stroke="${VIOLET}" stroke-dasharray="4 3"/>`);
    parts.push(tx((x1 + X(now)) / 2, y + 12, `(t − ${per}, t]`, { size: 10, mono: true, color: VIOLET }));
  }
  parts.push(`<line x1="${LEFT}" y1="${ty}" x2="${LEFT + SPAN}" y2="${ty}" stroke="#adb5bd" stroke-width="2"/>`);
  for (let s = 0; s <= end; s++) {
    parts.push(`<line x1="${X(s).toFixed(1)}" y1="${ty - 3}" x2="${X(s).toFixed(1)}" y2="${ty + 3}" stroke="#adb5bd"/>`);
    parts.push(tx(X(s), ty + 16, String(s), { size: 10, mono: true, color: MUTED }));
    if (algo === "leaky" && s > 0 && s % per === 0) parts.push(tx(X(s), ty + 28, "↧", { size: 11, color: BLUE }));
  }
  const stacked: Record<number, number> = {};
  times.forEach((t, i) => {
    const k = (stacked[t] = (stacked[t] ?? 0) + 1) - 1;
    const color = i < m.r ? (m.got[i] ? GREEN : RED) : i === m.r && live ? ORANGE : "#ced4da";
    parts.push(`<circle cx="${X(t).toFixed(1)}" cy="${ty - 10 - k * 12}" r="${i === m.r && live ? 6 : 5}" fill="${color}"/>`);
  });
  y = ty + 40;

  // The request now, and the state.
  const ry = y + 6;
  if (now !== null) {
    parts.push(box(LEFT, ry, 96, 46, glow("req", "#fff4e6"), ORANGE, false, 2.4, 10));
    parts.push(tx(LEFT + 48, ry + 20, "request", { size: 13, bold: true }));
    parts.push(tx(LEFT + 48, ry + 37, `t = ${now}`, { size: 13, mono: true, color: BLUE }));
    spots.push({ id: "req", x: LEFT, y: ry, w: 96, h: 46, from: true, to: false, label: `request at t = ${now}` });
  } else parts.push(tx(LEFT, ry + 28, "— all decided —", { size: 13, anchor: "start", mono: true, color: GREEN }));

  const sx = LEFT + 120;
  if (algo === "bucket" || algo === "fixed") {
    const sw = 170;
    parts.push(box(sx, ry - 6, sw, 58, glow("state", "#fff"), lit("state") ? ORANGE : VIOLET, false, 2, 10));
    spots.push({ id: "state", x: sx, y: ry - 6, w: sw, h: 58, from: false, to: true, label: algo === "bucket" ? "bucket" : "counter" });
    if (algo === "bucket") {
      for (let i = 0; i < cap; i++) parts.push(`<circle cx="${sx + 24 + i * 30}" cy="${ry + 12}" r="11" fill="${i < m.tokens ? GOLD : "#fff"}" stroke="${GOLD}" stroke-width="2"${i < m.tokens ? "" : ` stroke-dasharray="3 3"`}/>`);
      parts.push(tx(sx + 10, ry + 44, `tokens = ${m.tokens}; last = ${m.last}`, { size: 12, anchor: "start", mono: true, bold: true }));
    } else {
      parts.push(tx(sx + 10, ry + 18, `count = ${m.count} / ${cap}`, { size: 15, anchor: "start", mono: true, bold: true }));
      parts.push(tx(sx + 10, ry + 40, `window = ${m.window} (t ${m.window * per}–${m.window * per + per - 1})`, { size: 12, anchor: "start", mono: true, color: MUTED }));
    }
    const cx = sx + sw + 16;
    parts.push(box(cx, ry + 2, 96, 40, glow("clock", "#e7f5ff"), live ? BLUE : "#ced4da", false, 2, 20));
    parts.push(tx(cx + 48, ry + 27, algo === "bucket" ? "⏱ refill" : "⏱ new window", { size: 12, bold: true, mono: true, color: BLUE }));
    spots.push({ id: "clock", x: cx, y: ry + 2, w: 96, h: 40, from: live, to: false, label: algo === "bucket" ? "refill" : "new window" });
  } else {
    parts.push(tx(sx, ry - 2, algo === "sliding" ? "log[]" : "queue[]", { size: 13, anchor: "start", bold: true, mono: true }));
    for (let i = 0; i < cap; i++) {
      const x = sx + i * 50;
      const v = m.list[i];
      const id = i === 0 && v !== undefined ? "head" : null;
      parts.push(box(x, ry + 6, 44, 38, id ? glow(id, "#f3f0ff") : v !== undefined ? "#f3f0ff" : "#fff", v !== undefined ? VIOLET : "#dee2e6", v === undefined, 1.8));
      if (v !== undefined) parts.push(tx(x + 22, ry + 30, String(v), { size: 15, bold: true, mono: true }));
      if (id) spots.push({ id, x, y: ry + 6, w: 44, h: 38, from: live, to: false, label: `${algo === "sliding" ? "log[0]" : "queue head"} = ${v}` });
    }
    const bx = sx + cap * 50 + 12;
    parts.push(box(bx, ry + 4, 88, 42, glow("bin", "#fff"), lit("bin") ? ORANGE : "#adb5bd", true, 1.8, 8));
    parts.push(tx(bx + 44, ry + 30, algo === "sliding" ? "drop ✕" : "out ↧", { size: 13, bold: true, mono: true, color: MUTED }));
    spots.push({ id: "bin", x: bx, y: ry + 4, w: 88, h: 42, from: false, to: true, label: algo === "sliding" ? "drop" : "out" });
    if (algo === "leaky" && m.list.length) parts.push(tx(bx + 100, ry + 30, `next out t = ${nextOut(m)}`, { size: 12, anchor: "start", mono: true, color: BLUE }));
  }
  y = ry + 70;

  // Allow and reject.
  parts.push(box(LEFT, y, 120, 44, glow("allow", "#ebfbee"), lit("allow") ? ORANGE : GREEN, false, 2, 10));
  parts.push(tx(LEFT + 60, y + 28, algo === "leaky" ? "queue ✓" : "allow ✓", { size: 15, bold: true, color: GREEN }));
  spots.push({ id: "allow", x: LEFT, y, w: 120, h: 44, from: false, to: true, label: "allow" });
  parts.push(box(LEFT + 140, y, 120, 44, glow("reject", "#fff5f5"), lit("reject") ? ORANGE : RED, false, 2, 10));
  parts.push(tx(LEFT + 200, y + 28, "reject ✕", { size: 15, bold: true, color: RED }));
  spots.push({ id: "reject", x: LEFT + 140, y, w: 120, h: 44, from: false, to: true, label: "reject" });
  parts.push(tx(LEFT + 280, y + 28, `let through ${m.got.filter(Boolean).length}, rejected ${m.got.filter((g) => !g).length}`, { size: 12, anchor: "start", mono: true, color: MUTED }));
  return { w: LEFT + SPAN + 40, h: y + 56, body: parts.join(""), spots };
}
