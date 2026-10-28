// Be the replicas: the player is the coordinator of a store kept on N replicas, each holding a value and its version.
// A write goes down the preference list (from the replica the request names, round the ring, skipping replicas that
// are down) until W replicas have it; a read asks R replicas the same way, returns the newest version among their
// replies, then repairs each replica that replied with an older one. With fewer than W (or R) replicas up the request
// fails. Four set-ups: N = 3 with W = R = 2 (every read meets the last write), N = 3 with W = R = 1 (fast, but a read
// can come back stale), N = 3 with W = 1 and R = 3, and N = 5 with W = 4 and R = 2 while replicas go down and come back.
// Replicas going down and coming back happen by themselves. Each operation is checked against the code; a wrong one
// is not made and says the rule it broke. Kept free of React: the board keeps only the operations made so far, and
// the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type QuorumAlgo = "majority" | "one" | "readAll" | "outage";
export const QUORUM_ALGOS: readonly QuorumAlgo[] = ["majority", "one", "readAll", "outage"];
export type QuorumLevel = 1 | 2 | 3;
/** Each set-up's replicas, write quorum and read quorum. */
export const SETUP: Record<QuorumAlgo, { n: number; w: number; r: number }> = {
  majority: { n: 3, w: 2, r: 2 },
  one: { n: 3, w: 1, r: 1 },
  readAll: { n: 3, w: 1, r: 3 },
  outage: { n: 5, w: 4, r: 2 },
};
/** A write of a value (a letter's index) or a read, each starting at a replica; or a replica going down or coming back. */
export type QuorumEvent = { kind: "write"; v: number; from: number } | { kind: "read"; from: number } | { kind: "down"; i: number } | { kind: "up"; i: number };
export type QuorumTask = { algo: QuorumAlgo; events: QuorumEvent[] };
/** A replica: its value and version (0 before any write), and whether it is up. */
export type Replica = { v: number; ver: number; up: boolean };

export type QuorumNotice = "stale" | "overlap" | "unavailable" | "repaired" | "streak10";
export const QUORUM_NOTICES: QuorumNotice[] = ["stale", "overlap", "unavailable", "repaired", "streak10"];

/** A line of the step log, as code. */
export type QuorumLog =
  | { op: "start" }
  | { op: "down" | "up"; i: number }
  | { op: "put"; i: number; v: number; ver: number; acks: number }
  | { op: "reply"; i: number; v: number; ver: number; got: number }
  | { op: "fail"; read: boolean; up: number }
  | { op: "pick"; v: number; ver: number }
  | { op: "repair"; i: number; v: number; ver: number };

/**
 * The machine's memory after some operations: the event being served (e), the replicas, the newest version written,
 * the replicas the request has reached (acks for a write, replies for a read, in turn), what the read returned, the
 * lines the last operation ran, the log, and what the run has shown.
 */
export type QuorumMachine = {
  task: QuorumTask;
  e: number;
  reps: Replica[];
  ver: number;
  reached: number[];
  picked: { v: number; ver: number } | null;
  lines: number[];
  log: QuorumLog[];
  seen: QuorumNotice[];
};

export const letter = (v: number) => "abcdefghij"[v];
const upCount = (m: QuorumMachine) => m.reps.filter((r) => r.up).length;

/** Replicas going down and coming back: what happens by itself. */
function settle(m: QuorumMachine): void {
  const { events } = m.task;
  while (m.e < events.length) {
    const ev = events[m.e];
    if (ev.kind !== "down" && ev.kind !== "up") return;
    m.reps[ev.i].up = ev.kind === "up";
    m.log.push({ op: ev.kind, i: ev.i });
    m.e++;
  }
}

export function startMachine(task: QuorumTask): QuorumMachine {
  const { n } = SETUP[task.algo];
  const m: QuorumMachine = { task, e: 0, reps: Array.from({ length: n }, () => ({ v: 0, ver: 0, up: true })), ver: 0, reached: [], picked: null, lines: [], log: [{ op: "start" }], seen: [] };
  settle(m);
  return m;
}

/** The replica the request reaches next: the first up one on its preference list it hasn't reached. */
export function nextReplica(m: QuorumMachine): number {
  const ev = m.task.events[m.e] as { from: number };
  const { n } = SETUP[m.task.algo];
  // Asked only while the request still needs a replica, and has enough up to reach.
  return Array.from({ length: n }, (_, k) => (ev.from + k) % n).find((i) => m.reps[i].up && !m.reached.includes(i))!;
}
/** The replies of a read: the replicas it reached and their versions. */
const newestReply = (m: QuorumMachine) => m.reached.reduce((b, i) => (m.reps[i].ver > m.reps[b].ver ? i : b));
/** The replicas that replied with an older version than the one returned. */
export const staleReplies = (m: QuorumMachine) => (m.picked ? m.reached.filter((i) => m.reps[i].ver < m.picked!.ver) : []);

/** The operations: reach the next replica (code 0), fail the request (1), return the newest reply (2), repair replica i (3 + i). */
export type QuorumOp = "send" | "fail" | "pick" | "repair";
/** What the code does next; null when every event is done. */
export function expect(m: QuorumMachine): QuorumOp | null {
  if (m.e === m.task.events.length) return null;
  const ev = m.task.events[m.e];
  const { w, r } = SETUP[m.task.algo];
  if (!m.reached.length && upCount(m) < (ev.kind === "write" ? w : r)) return "fail";
  if (ev.kind === "write" || m.reached.length < r) return "send";
  return m.picked ? "repair" : "pick";
}

/** The request is done: on to the next event. */
function done(m: QuorumMachine): void {
  m.e++;
  m.reached = [];
  m.picked = null;
  settle(m);
}

/** The machine after one more operation, by its code. */
export function apply(m0: QuorumMachine, code: number): QuorumMachine {
  const m: QuorumMachine = { ...m0, reps: m0.reps.map((r) => ({ ...r })), reached: [...m0.reached], log: [...m0.log], seen: [...m0.seen] };
  const see = (k: QuorumNotice) => m.seen.includes(k) || m.seen.push(k);
  const ev = m.task.events[m.e] as Extract<QuorumEvent, { kind: "write" | "read" }>;
  const { w } = SETUP[m.task.algo];
  if (code === 0) {
    const i = nextReplica(m);
    m.reached.push(i);
    if (ev.kind === "write") {
      if (m.reached.length === 1) m.ver++;
      m.reps[i] = { ...m.reps[i], v: ev.v, ver: m.ver };
      m.log.push({ op: "put", i, v: ev.v, ver: m.ver, acks: m.reached.length });
      m.lines = [1, 2];
      if (m.reached.length === w) done(m);
    } else {
      m.log.push({ op: "reply", i, v: m.reps[i].v, ver: m.reps[i].ver, got: m.reached.length });
      m.lines = [5];
    }
  } else if (code === 1) {
    m.log.push({ op: "fail", read: ev.kind === "read", up: upCount(m) });
    m.lines = ev.kind === "write" ? [3] : [5];
    see("unavailable");
    done(m);
  } else if (code === 2) {
    const best = m.reps[newestReply(m)];
    m.picked = { v: best.v, ver: best.ver };
    m.log.push({ op: "pick", v: best.v, ver: best.ver });
    m.lines = [6];
    if (best.ver < m.ver) see("stale");
    else if (m.reached.some((i) => m.reps[i].ver < best.ver)) see("overlap");
    if (!staleReplies(m).length) done(m);
  } else {
    const i = code - 3;
    m.reps[i] = { ...m.reps[i], v: m.picked!.v, ver: m.picked!.ver };
    m.log.push({ op: "repair", i, v: m.picked!.v, ver: m.picked!.ver });
    m.lines = [7];
    see("repaired");
    if (!staleReplies(m).length) done(m);
  }
  return m;
}

export function quorumRun(task: QuorumTask): { ops: number[]; end: QuorumMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = e === "send" ? 0 : e === "fail" ? 1 : e === "pick" ? 2 : 3 + staleReplies(m)[0];
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: QuorumTask, ops: number[]): QuorumMachine {
  return ops.reduce(apply, startMachine(task));
}

/** What each read returned, in turn (null for one that failed), from the log. */
export function reads(m: QuorumMachine): ({ v: number; ver: number } | null)[] {
  return m.log.flatMap((l) => (l.op === "pick" ? [{ v: l.v, ver: l.ver }] : l.op === "fail" && l.read ? [null] : []));
}

// ---------- checking an operation ----------

/**
 * What the player tried: the request onto replica i or onto fail; a reply (from replica i) onto return; the value
 * returned onto replica i.
 */
export type QuorumAttempt = { kind: "send"; i: number } | { kind: "fail" } | { kind: "pick"; i: number } | { kind: "repair"; i: number };
export type QuorumWhy = "prefOrder" | "isDown" | "already" | "noQuorum" | "hasQuorum" | "newest" | "notStale" | "allDone";
export type QuorumCheck = { ok: true; code: number } | { ok: false; why: QuorumWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: QuorumMachine, at: QuorumAttempt): QuorumCheck {
  const e = expect(m);
  const no = (why: QuorumWhy, vars: Record<string, string | number> = {}): QuorumCheck => ({ ok: false, why, vars });
  if (e === null) return no("allDone");
  const ev = m.task.events[m.e] as Extract<QuorumEvent, { kind: "write" | "read" }>;
  const { w, r } = SETUP[m.task.algo];
  const need = ev.kind === "write" ? w : r;
  const quorum = { up: upCount(m), need, q: ev.kind === "write" ? "W" : "R" };
  if (e === "fail") return at.kind === "fail" ? { ok: true, code: 1 } : no("noQuorum", quorum);
  if (at.kind === "fail") return no("hasQuorum", quorum);
  if (e === "send") {
    if (at.kind !== "send") return no("prefOrder", { i: nextReplica(m), got: m.reached.length, need, q: quorum.q });
    if (!m.reps[at.i].up) return no("isDown", { i: at.i });
    if (m.reached.includes(at.i)) return no("already", { i: at.i });
    return at.i === nextReplica(m) ? { ok: true, code: 0 } : no("prefOrder", { i: nextReplica(m), got: m.reached.length, need, q: quorum.q });
  }
  const best = newestReply(m);
  // Two replies with the newest version are the same value: either may be returned.
  if (e === "pick") return at.kind === "pick" && m.reached.includes(at.i) && m.reps[at.i].ver === m.reps[best].ver ? { ok: true, code: 2 } : no("newest", { ver: m.reps[best].ver, i: best });
  if (at.kind === "repair" && staleReplies(m).includes(at.i)) return { ok: true, code: 3 + at.i };
  return no("notStale", { i: at.kind === "repair" || at.kind === "send" ? at.i : staleReplies(m)[0], ver: m.picked!.ver, left: staleReplies(m).map((i) => `r${i}`).join(", ") });
}

// ---------- the tasks ----------

type Spec = { algo: QuorumAlgo | null; n: number; need?: QuorumNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

/**
 * A task worth playing: it starts with a write and has two writes and two reads or more; W = R = 1 returns a stale
 * value (with one reply to a read it has nothing to repair); the other quorums meet a stale reply among fresh ones and
 * repair it; the outage fails a request.
 */
export function quorumTask(spec: Spec, next: () => number): QuorumTask {
  const algo = spec.algo ?? pick(QUORUM_ALGOS, next);
  const { n } = SETUP[algo];
  for (;;) {
    const events: QuorumEvent[] = Array.from({ length: spec.n }, (_, k) =>
      k === 0 || next() < 0.5 ? { kind: "write", v: int(0, 9, next), from: int(0, n - 1, next) } : { kind: "read", from: int(0, n - 1, next) },
    );
    if (algo === "outage") {
      const a = int(0, n - 1, next);
      const b = (a + int(1, n - 1, next)) % n;
      const at = int(2, spec.n - 3, next);
      events.splice(at, 0, { kind: "down", i: a }, { kind: "down", i: b });
      if (next() < 0.6) events.splice(int(at + 3, events.length - 1, next), 0, { kind: "up", i: a });
    }
    const t: QuorumTask = { algo, events };
    const { end } = quorumRun(t);
    const ops = events.filter((ev) => ev.kind === "write" || ev.kind === "read");
    if (ops.filter((ev) => ev.kind === "write").length < 2 || ops.filter((ev) => ev.kind === "read").length < 2) continue;
    if (algo !== "one" && !end.seen.includes("repaired")) continue;
    if (algo === "one" && !end.seen.includes("stale")) continue;
    if ((algo === "majority" || algo === "readAll") && !end.seen.includes("overlap")) continue;
    if (algo === "outage" && !end.seen.includes("unavailable")) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const QUORUM_LADDER: (Spec & { seed: number })[] = [
  { algo: "majority", n: 6, seed: 3801 },
  { algo: "one", n: 6, seed: 3802 },
  { algo: "readAll", n: 6, seed: 3803 },
  { algo: "outage", n: 7, seed: 3804 },
  { algo: "majority", n: 8, seed: 3805 },
  { algo: "one", n: 8, seed: 3806 },
  { algo: "readAll", n: 8, seed: 3807 },
  { algo: "outage", n: 9, seed: 3808 },
  { algo: null, n: 9, seed: 3809 },
];
/** The endless run: easy, the majority quorum on six requests; medium, any on seven; hard, any on nine or ten. */
export function levelSpec(level: QuorumLevel, next: () => number): Spec {
  if (level === 1) return { algo: "majority", n: 6 };
  return { algo: null, n: level === 2 ? 7 : int(9, 10, next) };
}

export const quorumStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function quorumNotice(m: QuorumMachine, misses: number, streak: number): QuorumNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (QUORUM_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeQuorum = EndlessGame<QuorumNotice, QuorumLevel, { kind: "wrong"; why: QuorumWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far: 0 reached a replica, 1 failed, 2 returned, 3 + i repaired replica i. */
    ops: number[];
  };
export function quorumNow(d: Pick<LiveBeQuorum, "mode" | "stage" | "level" | "seed">): QuorumTask {
  if (d.mode === "puzzle") {
    const s = QUORUM_LADDER[d.stage];
    return quorumTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return quorumTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

const LINES = [
  "write(v, from):",
  "  for r on the list from `from`, up only:",
  "    r.put(v, ver); stop once W have it",
  "  fail if fewer than W are up",
  "read(from):",
  "  replies = R up replicas on the list",
  "  return the newest version among them",
  "  repair each older reply: r.put(newest)",
];
export const CODE: Record<QuorumAlgo, string[]> = { majority: LINES, one: LINES, readAll: LINES, outage: LINES };

export function logText(l: QuorumLog, t: QuorumTask): string {
  const { n, w, r } = SETUP[t.algo];
  switch (l.op) {
    case "start":
      return `N = ${n}, W = ${w}, R = ${r}`;
    case "down":
      return `r${l.i} goes down`;
    case "up":
      return `r${l.i} is back up (with what it had)`;
    case "put":
      return `r${l.i}.put(${letter(l.v)}, v${l.ver}); acks = ${l.acks}${l.acks === w ? " = W: ok" : ""}`;
    case "reply":
      return `r${l.i} replies ${l.ver ? `${letter(l.v)}, v${l.ver}` : "nothing (v0)"}; replies = ${l.got}`;
    case "fail":
      return `${l.read ? "read" : "write"} fails: ${l.up} up < ${l.read ? `R = ${r}` : `W = ${w}`}`;
    case "pick":
      return `return ${l.ver ? `${letter(l.v)} (v${l.ver})` : "nothing (v0)"}`;
    case "repair":
      return `repair r${l.i}.put(${letter(l.v)}, v${l.ver})`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: the request, a replica (r), fail, a reply (p), return, the value returned. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type QuorumPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const RED = "#e03131";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const LEFT = 100;
const CARD = 84;
const REP = 80;
const RGAP = 12;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/** An event as its card shows it. */
export function eventText(ev: QuorumEvent): string {
  if (ev.kind === "write") return `write ${letter(ev.v)}`;
  if (ev.kind === "read") return "read";
  return `r${ev.i} ${ev.kind}`;
}
/** A value and version as shown: "c v2", or "—" before any write. */
const shown = (v: number, ver: number) => (ver ? `${letter(v)} v${ver}` : "— v0");

/**
 * The machine drawn as a computer keeps it: N, W, R and whether R + W > N; the events to come, the current request
 * framed with the replica it starts from; the replicas side by side (value and version, the newest version marked,
 * a replica that is down greyed and crossed, the order the request reaches them in, and a tick on those it has
 * reached); for a read, the replies in turn, the return box and the value returned; and fail. `hot` lights the spot a
 * drag is over and `sel` the one picked up.
 */
export function quorumSvg(m: QuorumMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): QuorumPic {
  const t = m.task;
  const { n, w, r } = SETUP[t.algo];
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const e = live ? expect(m) : null;
  const ev = live ? (t.events[m.e] as Extract<QuorumEvent, { kind: "write" | "read" }>) : null;
  const label = (y: number, s: string) => parts.push(tx(LEFT - 12, y, s, { size: 14, anchor: "end", bold: true, mono: true }));
  const rx = (i: number) => LEFT + i * (REP + RGAP);

  parts.push(tx(16, 24, `N = ${n}, W = ${w}, R = ${r}`, { size: 15, anchor: "start", bold: true, mono: true, color: VIOLET }));
  parts.push(tx(220, 24, `R + W = ${r + w} ${r + w > n ? "> N: reads meet the last write" : "≤ N: a read can miss it"}`, { size: 12, anchor: "start", mono: true, color: r + w > n ? GREEN : RED }));

  // The events to come.
  let y = 40;
  label(y + 24, "requests");
  t.events.slice(m.e, m.e + 5).forEach((x, k) => {
    const cx = LEFT + k * (CARD + 8);
    const now = k === 0 && live;
    const side = x.kind === "down" || x.kind === "up";
    parts.push(box(cx, y, CARD, 40, now ? glow("req", "#fff4e6") : side ? "#f8f9fa" : "#fff", now ? ORANGE : side ? (x.kind === "down" ? RED : GREEN) : "#adb5bd", false, now ? 2.4 : 1.4, 8));
    parts.push(tx(cx + CARD / 2, y + 18, eventText(x), { size: 13, bold: now, mono: true, color: now ? INK : side ? (x.kind === "down" ? RED : GREEN) : MUTED }));
    if (x.kind === "write" || x.kind === "read") parts.push(tx(cx + CARD / 2, y + 33, `from r${x.from}`, { size: 11, mono: true, color: now ? BLUE : MUTED }));
    if (now) spots.push({ id: "req", x: cx, y, w: CARD, h: 40, from: true, to: false, label: `${eventText(x)} from r${(x as { from: number }).from}` });
  });
  if (!live) parts.push(tx(LEFT, y + 24, "— all done —", { size: 13, anchor: "start", mono: true, color: GREEN }));

  // The replicas.
  y += 64;
  const order: number[] = [];
  if (ev) for (let k = 0; k < n; k++) order.push((ev.from + k) % n);
  label(y + 40, "replicas");
  for (let i = 0; i < n; i++) {
    const x = rx(i);
    const id = `r${i}`;
    const rep = m.reps[i];
    const newest = rep.ver === m.ver && m.ver > 0;
    const reached = m.reached.includes(i);
    parts.push(box(x, y + 14, REP, 64, rep.up ? glow(id, "#f3f0ff") : "#f1f3f5", lit(id) ? ORANGE : !rep.up ? "#ced4da" : reached ? BLUE : VIOLET, false, reached ? 2.6 : 2, 8));
    parts.push(tx(x + 10, y + 34, `r${i}`, { size: 14, bold: true, anchor: "start", color: rep.up ? INK : MUTED }));
    if (ev) parts.push(tx(x + REP - 8, y + 34, `#${order.indexOf(i) + 1}`, { size: 11, anchor: "end", mono: true, color: MUTED }));
    parts.push(tx(x + REP / 2, y + 58, shown(rep.v, rep.ver), { size: 15, bold: true, mono: true, color: !rep.up ? MUTED : newest ? GREEN : RED }));
    if (!rep.up) parts.push(tx(x + REP / 2, y + 74, "✕ down", { size: 11, bold: true, color: RED }));
    else if (reached) parts.push(tx(x + REP / 2, y + 74, ev?.kind === "write" ? "✓ ack" : "✓ replied", { size: 11, bold: true, color: BLUE }));
    spots.push({ id, x, y: y + 14, w: REP, h: 64, from: false, to: true, label: `replica r${i}: ${shown(rep.v, rep.ver)}${rep.up ? "" : ", down"}` });
  }
  parts.push(tx(rx(n) - 4, y + 10, `newest = v${m.ver}`, { size: 11, anchor: "end", mono: true, color: GREEN }));
  y += 96;

  // A read's replies, the return box and the value returned; and fail.
  if (ev?.kind === "read" && m.reached.length) {
    label(y + 22, "replies");
    m.reached.forEach((i, k) => {
      const x = LEFT + k * 96;
      const id = `p${i}`;
      const rep = m.reps[i];
      parts.push(box(x, y + 2, 88, 32, glow(id, "#e7f5ff"), lit(id) ? ORANGE : BLUE, false, 1.8, 16));
      parts.push(tx(x + 44, y + 23, `r${i}: ${shown(rep.v, rep.ver)}`, { size: 12, bold: true, mono: true, color: BLUE }));
      spots.push({ id, x, y: y + 2, w: 88, h: 32, from: e === "pick", to: false, label: `reply from r${i}: ${shown(rep.v, rep.ver)}` });
    });
    y += 44;
  }
  parts.push(box(LEFT, y, 120, 42, glow("ret", "#ebfbee"), lit("ret") ? ORANGE : GREEN, false, 2, 10));
  parts.push(tx(LEFT + 60, y + 26, m.picked ? `return ${shown(m.picked.v, m.picked.ver)}` : "return", { size: 13, bold: true, mono: true, color: GREEN }));
  spots.push({ id: "ret", x: LEFT, y, w: 120, h: 42, from: false, to: true, label: "return" });
  if (m.picked && e === "repair") {
    parts.push(box(LEFT + 136, y + 5, 108, 32, glow("val", "#ebfbee"), GREEN, false, 2, 16));
    parts.push(tx(LEFT + 190, y + 26, `${shown(m.picked.v, m.picked.ver)} ↑`, { size: 13, bold: true, mono: true, color: GREEN }));
    spots.push({ id: "val", x: LEFT + 136, y: y + 5, w: 108, h: 32, from: true, to: false, label: `returned ${shown(m.picked.v, m.picked.ver)}` });
  }
  // Fail sits right of the value returned, under the last replica when there is room.
  const fx = Math.max(LEFT + 264, rx(n) - 120 - RGAP);
  parts.push(box(fx, y, 120, 42, glow("fail", "#fff5f5"), lit("fail") ? ORANGE : RED, false, 2, 10));
  parts.push(tx(fx + 60, y + 26, "fail ✕", { size: 14, bold: true, color: RED }));
  spots.push({ id: "fail", x: fx, y, w: 120, h: 42, from: false, to: true, label: "fail" });
  return { w: Math.max(rx(n) + 20, LEFT + 5 * (CARD + 8) + 20), h: y + 52, body: parts.join(""), spots };
}
