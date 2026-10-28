// Be the load balancer: the player is the balancer sending each request to a server, the way the code picks it. Four
// kinds: round robin (a pointer i goes round the servers, skipping one that is down), least connections (each request
// stays open for a number of requests to come; the up server with the fewest open wins, the first on a tie), smooth
// weighted round robin (nginx's: every server's current value cw gains its weight, the largest cw wins and gives back the
// total) and IP hash (the client's hash mod the number of live servers, so a client comes back to the same server until
// one goes down). A server going down and a connection ending happen by themselves; the player makes every choice. Each
// operation is checked against the code; a wrong one is not made and says the rule it broke. Kept free of React: the
// board keeps only the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type LbAlgo = "rr" | "least" | "weighted" | "hash";
export const LB_ALGOS: readonly LbAlgo[] = ["rr", "least", "weighted", "hash"];
export type LbLevel = 1 | 2 | 3;
/** A request from client c (its hash h; it stays open for d requests to come), or a server going down. */
export type LbEvent = { kind: "req"; c: number; h: number; d: number } | { kind: "down"; s: number };
/** The servers (n of them), their weights (all 1 unless weighted) and the events in turn. */
export type LbTask = { algo: LbAlgo; n: number; w: number[]; events: LbEvent[] };

export type LbNotice = "skipDown" | "cycle" | "uneven" | "remapped" | "sticky" | "wrap" | "streak10";
export const LB_NOTICES: LbNotice[] = ["skipDown", "cycle", "uneven", "remapped", "sticky", "wrap", "streak10"];

/** A line of the step log, as code. */
export type LbLog =
  | { op: "start" }
  | { op: "down"; s: number }
  | { op: "close"; s: number; open: number }
  | { op: "raise"; cw: number[] }
  | { op: "send"; c: number; s: number; h: number; live: number; ptr: number; open: number; d: number; cw: number; total: number };

/**
 * The machine's memory after some operations: the event being served (e), which servers are up, the round robin
 * pointer, the current values (weighted) and whether this request's weights are added, each server's open connections
 * (the requests each has left), the requests each was sent, the server each client went to last, the lines the last
 * operation ran, the log, and what the run has shown.
 */
export type LbMachine = {
  task: LbTask;
  e: number;
  up: boolean[];
  ptr: number;
  cw: number[];
  raised: boolean;
  open: number[][];
  sent: number[];
  home: Record<number, number>;
  lines: number[];
  log: LbLog[];
  seen: LbNotice[];
};

/** A server's name. */
export const serverName = (s: number) => "ABCDEF"[s];
const total = (m: LbMachine) => m.task.w.reduce((a, w, s) => a + (m.up[s] ? w : 0), 0);
/** The servers that are up, in order. */
export const liveServers = (m: LbMachine) => m.up.flatMap((u, s) => (u ? [s] : []));

/** Servers going down and, before a request, the connections that end: what happens by itself. */
function settle(m: LbMachine): void {
  const { events, algo } = m.task;
  while (m.e < events.length && events[m.e].kind === "down") {
    const s = (events[m.e] as { s: number }).s;
    m.up[s] = false;
    m.log.push({ op: "down", s });
    m.e++;
  }
  if (algo !== "least" || m.e === events.length) return;
  m.open = m.open.map((xs, s) => {
    const left = xs.map((x) => x - 1).filter((x) => x > 0);
    for (let k = left.length; k < xs.length; k++) m.log.push({ op: "close", s, open: left.length });
    return left;
  });
}

export function startMachine(task: LbTask): LbMachine {
  const m: LbMachine = {
    task, e: 0, up: task.w.map(() => true), ptr: 0, cw: task.w.map(() => 0), raised: false, open: task.w.map(() => []), sent: task.w.map(() => 0), home: {},
    lines: [0], log: [{ op: "start" }], seen: [],
  };
  settle(m);
  return m;
}

/** The server the code sends the current request to (for weighted, once the weights are added). */
export function choose(m: LbMachine): number {
  const live = liveServers(m);
  const req = m.task.events[m.e] as Extract<LbEvent, { kind: "req" }>;
  switch (m.task.algo) {
    case "rr": {
      let s = m.ptr;
      while (!m.up[s]) s = (s + 1) % m.task.n;
      return s;
    }
    case "least":
      return live.reduce((b, s) => (m.open[s].length < m.open[b].length ? s : b));
    case "weighted":
      return live.reduce((b, s) => (m.cw[s] > m.cw[b] ? s : b));
    case "hash":
      return live[req.h % live.length];
  }
}

/** The operations, by code: add the weights (weighted), send the request. */
export const OPS = ["raise", "send"] as const;
export type LbOp = (typeof OPS)[number];

/** What the code does next; null when every request is sent. */
export function expect(m: LbMachine): LbOp | null {
  if (m.e === m.task.events.length) return null;
  return m.task.algo === "weighted" && !m.raised ? "raise" : "send";
}

/** The machine after one more operation, by its code (an index of OPS). */
export function apply(m0: LbMachine, code: number): LbMachine {
  const m: LbMachine = {
    ...m0, up: [...m0.up], cw: [...m0.cw], open: m0.open.map((xs) => [...xs]), sent: [...m0.sent], home: { ...m0.home }, log: [...m0.log], seen: [...m0.seen],
  };
  const see = (k: LbNotice) => m.seen.includes(k) || m.seen.push(k);
  const { algo, n, w, events } = m.task;
  if (OPS[code] === "raise") {
    m.cw = m.cw.map((c, s) => (m.up[s] ? c + w[s] : c));
    m.raised = true;
    m.lines = [2];
    m.log.push({ op: "raise", cw: [...m.cw] });
    return m;
  }
  const req = events[m.e] as Extract<LbEvent, { kind: "req" }>;
  const s = choose(m);
  const live = liveServers(m).length;
  const ptr = m.ptr;
  const all = total(m);
  if (algo === "rr") {
    if (s !== m.ptr) see("skipDown");
    if (s === 0 && m.sent.some((x) => x > 0)) see("wrap");
    m.ptr = (s + 1) % n;
    m.lines = s !== ptr ? [2, 3, 4] : [3, 4];
  } else if (algo === "least") {
    m.open[s].push(req.d);
    m.lines = [2, 3];
  } else if (algo === "weighted") {
    m.cw[s] -= all;
    m.raised = false;
    m.lines = [3, 4, 5];
  } else {
    if (req.c in m.home) see(m.home[req.c] === s ? "sticky" : "remapped");
    m.home[req.c] = s;
    m.lines = [1, 2, 3];
  }
  m.sent[s]++;
  m.log.push({ op: "send", c: req.c, s, h: req.h, live, ptr: m.ptr, open: m.open[s].length, d: req.d, cw: m.cw[s], total: all });
  m.e++;
  settle(m);
  if (m.e === events.length) {
    if (algo === "weighted" && m.cw.every((c) => c === 0)) see("cycle");
    const counts = liveServers(m).map((x) => m.sent[x]);
    if (algo === "least" && Math.max(...counts) - Math.min(...counts) >= 2) see("uneven");
  }
  return m;
}

export function lbRun(task: LbTask): { ops: number[]; end: LbMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = OPS.indexOf(e);
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: LbTask, ops: number[]): LbMachine {
  return ops.reduce(apply, startMachine(task));
}

/** The server each request went to, in turn, from the log. */
export const sends = (m: LbMachine) => m.log.flatMap((l) => (l.op === "send" ? [l.s] : []));

// ---------- checking an operation ----------

/** What the player tried: the request dropped on a server, or the +w chip dropped on cw[]. */
export type LbAttempt = { kind: "send"; s: number } | { kind: "raise" };
export type LbWhy = "rrNext" | "isDown" | "fewest" | "tieLow" | "raiseFirst" | "raised" | "maxCw" | "modN" | "allDone";
export type LbCheck = { ok: true; code: number } | { ok: false; why: LbWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: LbMachine, at: LbAttempt): LbCheck {
  const e = expect(m);
  const no = (why: LbWhy, vars: Record<string, string | number> = {}): LbCheck => ({ ok: false, why, vars });
  const ok = (op: LbOp): LbCheck => ({ ok: true, code: OPS.indexOf(op) });
  if (e === null) return no("allDone");
  if (e === "raise") return at.kind === "raise" ? ok("raise") : no("raiseFirst");
  if (at.kind === "raise") return no("raised");
  const s = choose(m);
  if (at.s === s) return ok("send");
  if (!m.up[at.s]) return no("isDown", { s: serverName(at.s) });
  const { algo } = m.task;
  const name = serverName(s);
  if (algo === "rr") return no("rrNext", { i: m.ptr, s: name });
  if (algo === "least") {
    const c = m.open[s].length;
    return m.open[at.s].length === c ? no("tieLow", { s: name, c }) : no("fewest", { s: name, c });
  }
  if (algo === "weighted") return m.cw[at.s] === m.cw[s] ? no("tieLow", { s: name, c: m.cw[s] }) : no("maxCw", { s: name, c: m.cw[s] });
  const live = liveServers(m).length;
  const h = (m.task.events[m.e] as { h: number }).h;
  return no("modN", { h, n: live, i: h % live, s: name });
}

// ---------- the tasks ----------

type Spec = { algo: LbAlgo | null; n: number; m: number; down?: boolean; need?: LbNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

/**
 * A task worth playing: round robin wraps round; least connections sees connections end and a server picked that isn't
 * simply next in turn; weighted has weights not all equal, enough requests for a full cycle; IP hash sees a client come
 * back. With a server going down, it goes down after a third of the requests, and round robin has to skip it.
 */
export function lbTask(spec: Spec, next: () => number): LbTask {
  const algo = spec.algo ?? pick(LB_ALGOS, next);
  const down = spec.down && (algo === "rr" || algo === "hash");
  for (;;) {
    const w = algo === "weighted" ? Array.from({ length: spec.n }, () => int(1, 4, next)) : Array(spec.n).fill(1);
    const all = w.reduce((a, b) => a + b, 0);
    const reqs = algo === "weighted" ? Math.max(spec.m, all) : spec.m;
    const clients = Array.from({ length: int(3, 4, next) }, (_, i) => ({ c: [3, 7, 12, 18, 25][i] + int(0, 2, next), h: int(10, 99, next) }));
    const events: LbEvent[] = Array.from({ length: reqs }, () => {
      const c = pick(clients, next);
      return { kind: "req", c: c.c, h: c.h, d: int(1, 5, next) };
    });
    if (down) events.splice(int(Math.ceil(reqs / 3), Math.ceil(reqs / 2), next), 0, { kind: "down", s: int(0, spec.n - 1, next) });
    const t: LbTask = { algo, n: spec.n, w, events };
    const { ops, end } = lbRun(t);
    const sent = sends(end);
    // The requests sent while the servers' open connections differ: the choices least connections really makes.
    const uneven = ops.filter((_, k) => {
      const m = replay(t, ops.slice(0, k));
      const open = liveServers(m).map((s) => m.open[s].length);
      return Math.min(...open) !== Math.max(...open);
    }).length;
    if (algo === "rr" && !end.seen.includes("wrap")) continue;
    if (down && algo === "rr" && !end.seen.includes("skipDown")) continue;
    if (algo === "least" && (!end.log.some((l) => l.op === "close") || uneven < 3)) continue;
    if (algo === "weighted" && (new Set(w).size === 1 || all > 9)) continue;
    if (algo === "hash" && (!end.seen.includes("sticky") || new Set(sent).size < 3)) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const LB_LADDER: (Spec & { seed: number })[] = [
  { algo: "rr", n: 3, m: 7, seed: 3501 },
  { algo: "least", n: 3, m: 7, seed: 3502 },
  { algo: "weighted", n: 3, m: 5, need: "cycle", seed: 3503 },
  { algo: "hash", n: 3, m: 7, seed: 3504 },
  { algo: "rr", n: 4, m: 8, down: true, seed: 3505 },
  { algo: "least", n: 4, m: 9, need: "uneven", seed: 3506 },
  { algo: "weighted", n: 3, m: 8, seed: 3507 },
  { algo: "hash", n: 4, m: 9, down: true, need: "remapped", seed: 3508 },
  { algo: null, n: 4, m: 9, down: true, seed: 3509 },
];
/** The endless run: easy, round robin or IP hash on three servers; medium, any kind; hard, any on four with one going down. */
export function levelSpec(level: LbLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["rr", "hash"] as const, next), n: 3, m: 7 };
  return level === 2 ? { algo: null, n: 3, m: 8 } : { algo: null, n: 4, m: int(9, 10, next), down: true };
}

export const lbStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function lbNotice(m: LbMachine, misses: number, streak: number): LbNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (LB_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeBalance = EndlessGame<LbNotice, LbLevel, { kind: "wrong"; why: LbWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far, by their index in OPS. */
    ops: number[];
  };
export function lbNow(d: Pick<LiveBeBalance, "mode" | "stage" | "level" | "seed">): LbTask {
  if (d.mode === "puzzle") {
    const s = LB_LADDER[d.stage];
    return lbTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return lbTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

export const CODE: Record<LbAlgo, string[]> = {
  rr: ["i = 0", "for req in requests:", "  while down[i]: i = (i + 1) % n", "  send(req, servers[i])", "  i = (i + 1) % n"],
  least: ["for req in requests:", "  close the connections that ended", "  s = up server, fewest open (first on a tie)", "  send(req, s); open[s] += 1"],
  weighted: ["cw = [0] * n; total = sum(w)", "for req in requests:", "  for s in servers: cw[s] += w[s]", "  best = argmax(cw)   # first on a tie", "  cw[best] −= total", "  send(req, best)"],
  hash: ["for req in requests:", "  live = [s for s in servers if up(s)]", "  i = hash(req.client) % len(live)", "  send(req, live[i])"],
};

/** A number with a true minus sign. */
const num = (x: number) => (x < 0 ? `−${-x}` : String(x));

export function logText(l: LbLog, t: LbTask): string {
  const name = serverName;
  switch (l.op) {
    case "start":
      return t.algo === "rr" ? "i = 0" : t.algo === "weighted" ? `cw = [${t.w.map(() => 0).join(", ")}]; total = ${t.w.reduce((a, b) => a + b, 0)}` : `servers = ${t.w.map((_, s) => name(s)).join(" ")}`;
    case "down":
      return `server ${name(l.s)} is down`;
    case "close":
      return `${name(l.s)}: a connection ends; open = ${l.open}`;
    case "raise":
      return `cw = [${l.cw.map(num).join(", ")}]`;
    case "send":
      switch (t.algo) {
        case "rr":
          return `client ${l.c} → ${name(l.s)}; i = ${l.ptr}`;
        case "least":
          return `client ${l.c} → ${name(l.s)}; open = ${l.open} (lasts ${l.d})`;
        case "weighted":
          return `client ${l.c} → ${name(l.s)}; cw[${name(l.s)}] = ${num(l.cw + l.total)} − ${l.total} = ${num(l.cw)}`;
        case "hash":
          return `client ${l.c}: ${l.h} % ${l.live} = ${l.h % l.live} → ${name(l.s)}`;
      }
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: the request, a server (s), the +w chip, cw[]. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type LbPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const RED = "#e03131";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const LEFT = 100;
const CARD = 82;
const SERVER = 104;
const SGAP = 18;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/** An event as shown on its card: the client (its hash, how long it stays), or a server going down. */
export function eventText(ev: LbEvent): string {
  if (ev.kind === "down") return `${serverName(ev.s)} down`;
  return `client ${ev.c}`;
}

/**
 * The machine drawn as a computer keeps it: the round robin pointer, the total weight or the live count; the events
 * still to come, the current request framed (its hash or how long it stays under it); the servers side by side, each its
 * name and index, what it was sent, and its open connections (least) or its live index (hash), a server that is down
 * greyed and crossed; under them i (round robin), or w[] and cw[] with the +w chip (weighted). `hot` lights the spot a
 * drag is over and `sel` the one picked up.
 */
export function lbSvg(m: LbMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): LbPic {
  const t = m.task;
  const { algo, n } = t;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const label = (y: number, s: string) => parts.push(tx(LEFT - 12, y, s, { size: 14, anchor: "end", bold: true, mono: true }));
  const sx = (s: number) => LEFT + s * (SERVER + SGAP);
  const lives = liveServers(m);

  const head = algo === "rr" ? `i = ${m.ptr}` : algo === "weighted" ? `total = ${total(m)}` : algo === "hash" ? `len(live) = ${lives.length}` : `servers = ${n}`;
  parts.push(tx(16, 24, head, { size: 15, anchor: "start", bold: true, mono: true, color: VIOLET }));

  // The events still to come, the current request framed.
  let y = 42;
  label(y + 22, "requests");
  const shown = t.events.slice(m.e, m.e + 5);
  shown.forEach((ev, i) => {
    const x = LEFT + i * (CARD + 8);
    const now = i === 0 && live;
    const down = ev.kind === "down";
    parts.push(box(x, y, CARD, 44, now ? glow("req", "#fff4e6") : down ? "#fff5f5" : "#fff", now ? ORANGE : down ? RED : "#adb5bd", false, now ? 2.4 : 1.4, 8));
    parts.push(tx(x + CARD / 2, y + 19, eventText(ev), { size: 13, bold: now, mono: true, color: now ? INK : down ? RED : MUTED }));
    if (ev.kind === "req" && (algo === "hash" || algo === "least")) parts.push(tx(x + CARD / 2, y + 36, algo === "hash" ? `hash = ${ev.h}` : `lasts ${ev.d}`, { size: 11, mono: true, color: now ? BLUE : MUTED }));
    if (now && ev.kind === "req") spots.push({ id: "req", x, y, w: CARD, h: 44, from: true, to: false, label: `request from client ${ev.c}` });
  });
  if (m.e + 5 < t.events.length) parts.push(tx(LEFT + 5 * (CARD + 8), y + 26, `+${t.events.length - m.e - 5}`, { size: 13, anchor: "start", mono: true, color: MUTED }));
  if (!shown.length) parts.push(tx(LEFT, y + 26, "— all sent —", { size: 13, anchor: "start", mono: true, color: GREEN }));

  // The servers.
  y += 70;
  if (algo === "hash") {
    label(y + 2, "live");
    lives.forEach((s, i) => parts.push(tx(sx(s) + SERVER / 2, y + 2, `live[${i}]`, { size: 12, mono: true, bold: true, color: BLUE })));
    y += 12;
  }
  const sy = y;
  const sh = algo === "least" ? 112 : 88;
  label(sy + 30, "servers");
  for (let s = 0; s < n; s++) {
    const x = sx(s);
    const id = `s${s}`;
    const up = m.up[s];
    parts.push(box(x, sy, SERVER, sh, up ? glow(id, "#f3f0ff") : "#f1f3f5", lit(id) ? ORANGE : up ? VIOLET : "#ced4da", false, 2, 8));
    parts.push(tx(x + 14, sy + 26, serverName(s), { size: 22, bold: true, anchor: "start", color: up ? INK : MUTED }));
    parts.push(tx(x + SERVER - 10, sy + 22, `[${s}]`, { size: 12, anchor: "end", mono: true, color: MUTED }));
    parts.push(tx(x + 14, sy + 48, `sent ${m.sent[s]}`, { size: 13, anchor: "start", mono: true, color: up ? INK : MUTED }));
    if (!up) parts.push(tx(x + SERVER / 2, sy + 74, "✕ down", { size: 15, bold: true, color: RED }));
    else if (algo === "least") {
      parts.push(tx(x + 14, sy + 68, `open = ${m.open[s].length}`, { size: 13, anchor: "start", mono: true, bold: true, color: BLUE }));
      m.open[s].forEach((left, k) => {
        parts.push(box(x + 12 + k * 22, sy + 78, 18, 22, "#e7f5ff", BLUE, false, 1.2, 3));
        parts.push(tx(x + 21 + k * 22, sy + 94, String(left), { size: 11, mono: true, color: BLUE }));
      });
    } else if (algo === "weighted") parts.push(tx(x + 14, sy + 70, `w = ${t.w[s]}`, { size: 13, anchor: "start", mono: true, color: GREEN }));
    spots.push({ id, x, y: sy, w: SERVER, h: sh, from: false, to: true, label: `server ${serverName(s)}${up ? "" : ", down"}` });
  }
  y = sy + sh + 12;
  if (algo === "rr" && live) {
    const x = sx(m.ptr) + SERVER / 2;
    parts.push(box(x - 15, y, 30, 24, "#fff", BLUE, false, 2, 12));
    parts.push(tx(x, y + 17, "i", { size: 14, bold: true, mono: true, color: BLUE }));
    y += 32;
  } else if (algo === "weighted") {
    const cy = y + 6;
    label(cy + 22, "cw[]");
    parts.push(box(LEFT - 6, cy - 4, n * (SERVER + SGAP) - SGAP + 12, 40, glow("cw", "#fff"), lit("cw") ? ORANGE : "#ced4da", true, 1.6, 6));
    spots.push({ id: "cw", x: LEFT - 6, y: cy - 4, w: n * (SERVER + SGAP) - SGAP + 12, h: 40, from: false, to: true, label: "cw[]" });
    for (let s = 0; s < n; s++) {
      const c = m.cw[s];
      parts.push(box(sx(s) + 20, cy, SERVER - 40, 32, "#fff", GREEN, false, 1.6));
      parts.push(tx(sx(s) + SERVER / 2, cy + 22, num(c), { size: 16, bold: true, mono: true }));
    }
    const px = LEFT + n * (SERVER + SGAP) + 4;
    parts.push(box(px, cy, 56, 32, glow("plus", "#ebfbee"), m.raised || !live ? "#ced4da" : GREEN, false, 2, 16));
    parts.push(tx(px + 28, cy + 21, "+w", { size: 15, bold: true, mono: true, color: GREEN }));
    spots.push({ id: "plus", x: px, y: cy, w: 56, h: 32, from: live, to: false, label: "+w" });
    y = cy + 48;
  }
  const w = Math.max(LEFT + 5 * (CARD + 8) + 40, sx(n) + (algo === "weighted" ? 80 : 10));
  return { w, h: y + 6, body: parts.join(""), spots };
}
