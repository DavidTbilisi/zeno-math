// Be the message queue: the player is a partitioned log with a consumer group, as Kafka keeps one. A message with a key
// goes to partition hash(key) mod P, appended at the next offset, so messages with one key stay in order. A consumer
// polls its partitions in turn and takes the next unread message from the first that has one (or comes back empty), and
// commits, for each of its partitions, the offset it has read to. When a consumer crashes or joins, the partitions are
// shared out again by range, and each partition's new owner starts from its committed offset, so what was read but not
// committed is read again. Four kinds: keys only, a group of two polling, commits with a crash, and a consumer joining.
// Crashes and joins happen by themselves; the player makes every send, poll and commit. Each operation is checked
// against the code; a wrong one is not made and says the rule it broke. Kept free of React: the board keeps only the
// operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type QueueAlgo = "keys" | "group" | "commit" | "rebalance";
export const QUEUE_ALGOS: readonly QueueAlgo[] = ["keys", "group", "commit", "rebalance"];
export type QueueLevel = 1 | 2 | 3;
/** A message sent with a key, a consumer polling or committing, a consumer crashing or joining. */
export type QueueEvent = { kind: "send"; k: string } | { kind: "poll" | "commit" | "crash" | "join"; c: number };
/** The partitions, the keys and their hashes, the consumers up at the start, and the events in turn. */
export type QueueTask = { algo: QueueAlgo; parts: number; keys: { k: string; h: number }[]; start: number[]; events: QueueEvent[] };
/** A message: its key and its number in the order sent. */
export type QMsg = { k: string; id: number };

export type QueueNotice = "redelivered" | "moved" | "idle" | "parallel" | "orderKept" | "streak10";
export const QUEUE_NOTICES: QueueNotice[] = ["redelivered", "moved", "idle", "parallel", "orderKept", "streak10"];

/** A line of the step log, as code. */
export type QueueLog =
  | { op: "start" }
  | { op: "send"; k: string; h: number; p: number; at: number }
  | { op: "take"; c: number; p: number; at: number; msg: QMsg }
  | { op: "empty"; c: number }
  | { op: "commit"; c: number; p: number; at: number }
  | { op: "noCommit"; c: number }
  | { op: "crash" | "join"; c: number }
  | { op: "assign"; p: number; c: number; at: number };

/**
 * The machine's memory after some operations: the event being served (e), each partition's log, the offset its owner
 * reads next, the offset committed and its owner; the consumers up; what each consumer has taken; the partitions a
 * commit still has to do; the messages sent so far; the lines the last operation ran, the log, and what the run has shown.
 */
export type QueueMachine = {
  task: QueueTask;
  e: number;
  logs: QMsg[][];
  pos: number[];
  done: number[];
  owner: (number | null)[];
  live: number[];
  got: QMsg[][];
  pending: number[];
  sent: number;
  lines: number[];
  log: QueueLog[];
  seen: QueueNotice[];
};

export const consumerName = (c: number) => `c${c + 1}`;
/** The owners by range: the partitions in order, shared out among the consumers up, the first ones taking one more. */
export function assignment(parts: number, live: number[]): (number | null)[] {
  const cs = [...live].sort((a, b) => a - b);
  if (!cs.length) return Array(parts).fill(null);
  const owners: number[] = [];
  cs.forEach((c, i) => {
    for (let k = 0; k < Math.floor(parts / cs.length) + (i < parts % cs.length ? 1 : 0); k++) owners.push(c);
  });
  return owners;
}
/** The partition a key goes to. */
export const partitionOf = (t: QueueTask, k: string) => t.keys.find((x) => x.k === k)!.h % t.parts;
/** The partition the polling consumer takes from: its first with an unread message, or null. */
export function target(m: QueueMachine, c: number): number | null {
  const p = m.owner.findIndex((o, p) => o === c && m.pos[p] < m.logs[p].length);
  return p < 0 ? null : p;
}
/** The partitions of a consumer with reads not yet committed. */
const uncommitted = (m: QueueMachine, c: number) => m.owner.flatMap((o, p) => (o === c && m.pos[p] > m.done[p] ? [p] : []));

/** Crashes and joins, and what a commit has to do: what happens by itself. */
function settle(m: QueueMachine, see: (k: QueueNotice) => void): void {
  const { events, parts } = m.task;
  while (m.e < events.length) {
    const ev = events[m.e];
    if (ev.kind === "crash" || ev.kind === "join") {
      m.live = ev.kind === "crash" ? m.live.filter((c) => c !== ev.c) : [...m.live, ev.c];
      m.log.push({ op: ev.kind, c: ev.c });
      const owners = assignment(parts, m.live);
      owners.forEach((c, p) => {
        if (c === m.owner[p]) return;
        // The new owner starts where the group committed: what was read since is read again.
        m.owner[p] = c;
        m.pos[p] = m.done[p];
        if (c !== null) m.log.push({ op: "assign", p, c, at: m.done[p] });
        if (m.got.some((g) => g.length)) see("moved");
      });
      m.e++;
      continue;
    }
    if (ev.kind === "commit" && !m.pending.length) {
      m.pending = uncommitted(m, ev.c);
      if (!m.pending.length) {
        m.log.push({ op: "noCommit", c: ev.c });
        m.e++;
        continue;
      }
    }
    return;
  }
}

export function startMachine(task: QueueTask): QueueMachine {
  const m: QueueMachine = {
    task, e: 0, logs: Array.from({ length: task.parts }, () => []), pos: Array(task.parts).fill(0), done: Array(task.parts).fill(0),
    owner: assignment(task.parts, task.start), live: [...task.start], got: [[], [], []], pending: [], sent: 0, lines: [], log: [{ op: "start" }], seen: [],
  };
  settle(m, () => {});
  return m;
}

/** The operations: send the message to its partition (code 0), take the next message (1), come back empty (2), commit partition p (3 + p). */
export type QueueOp = "send" | "take" | "empty" | "commit";
/** What the code does next; null when every event is done. */
export function expect(m: QueueMachine): QueueOp | null {
  if (m.e === m.task.events.length) return null;
  const ev = m.task.events[m.e] as Exclude<QueueEvent, { kind: "crash" | "join" }>;
  if (ev.kind === "send") return "send";
  if (ev.kind === "commit") return "commit";
  return target(m, ev.c) === null ? "empty" : "take";
}

/** The machine after one more operation, by its code. */
export function apply(m0: QueueMachine, code: number): QueueMachine {
  const m: QueueMachine = {
    ...m0, logs: m0.logs.map((l) => [...l]), pos: [...m0.pos], done: [...m0.done], owner: [...m0.owner], live: [...m0.live], got: m0.got.map((g) => [...g]), pending: [...m0.pending],
    log: [...m0.log], seen: [...m0.seen],
  };
  const see = (k: QueueNotice) => m.seen.includes(k) || m.seen.push(k);
  const ev = m.task.events[m.e] as Exclude<QueueEvent, { kind: "crash" | "join" }>;
  if (code === 0 && ev.kind === "send") {
    const p = partitionOf(m.task, ev.k);
    if (m.logs[p].some((x) => x.k === ev.k)) see("orderKept");
    m.logs[p].push({ k: ev.k, id: ++m.sent });
    m.log.push({ op: "send", k: ev.k, h: m.task.keys.find((x) => x.k === ev.k)!.h, p, at: m.logs[p].length - 1 });
    m.lines = [1];
    m.e++;
  } else if (code === 1 && ev.kind === "poll") {
    const p = target(m, ev.c)!;
    const msg = m.logs[p][m.pos[p]];
    if (m.got.some((g) => g.some((x) => x.id === msg.id))) see("redelivered");
    m.got[ev.c].push(msg);
    m.log.push({ op: "take", c: ev.c, p, at: m.pos[p], msg });
    m.pos[p]++;
    if (m.got.filter((g) => g.length).length >= 2) see("parallel");
    m.lines = [3, 5];
    m.e++;
  } else if (code === 2 && ev.kind === "poll") {
    m.log.push({ op: "empty", c: ev.c });
    see("idle");
    m.lines = [3, 4];
    m.e++;
  } else {
    const p = code - 3;
    m.done[p] = m.pos[p];
    m.pending = m.pending.filter((x) => x !== p);
    m.log.push({ op: "commit", c: (ev as { c: number }).c, p, at: m.pos[p] });
    m.lines = [6];
    if (!m.pending.length) m.e++;
  }
  settle(m, see);
  return m;
}

export function queueRun(task: QueueTask): { ops: number[]; end: QueueMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = e === "send" ? 0 : e === "take" ? 1 : e === "empty" ? 2 : 3 + m.pending[0];
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

export function replay(task: QueueTask, ops: number[]): QueueMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/**
 * What the player tried: the message onto partition p; the next message of partition p onto consumer c; the poll onto
 * empty; the commit onto partition p.
 */
export type QueueAttempt = { kind: "send"; p: number } | { kind: "take"; p: number; c: number } | { kind: "empty" } | { kind: "commit"; p: number };
export type QueueWhy = "hashKey" | "sendNow" | "nothingNew" | "pollWho" | "notAssigned" | "firstPartition" | "hasMessages" | "pollNow" | "commitWhich" | "commitNow" | "allDone";
export type QueueCheck = { ok: true; code: number } | { ok: false; why: QueueWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: QueueMachine, at: QueueAttempt): QueueCheck {
  const e = expect(m);
  const no = (why: QueueWhy, vars: Record<string, string | number> = {}): QueueCheck => ({ ok: false, why, vars });
  if (e === null) return no("allDone");
  const ev = m.task.events[m.e] as Exclude<QueueEvent, { kind: "crash" | "join" }>;
  if (ev.kind === "send") {
    const p = partitionOf(m.task, ev.k);
    if (at.kind !== "send") return no("sendNow", { k: ev.k });
    return at.p === p ? { ok: true, code: 0 } : no("hashKey", { k: ev.k, h: m.task.keys.find((x) => x.k === ev.k)!.h, P: m.task.parts, p });
  }
  const c = consumerName(ev.c);
  if (ev.kind === "commit") {
    if (at.kind !== "commit") return no("commitNow", { c, list: m.pending.map((p) => `p${p}`).join(", ") });
    return m.pending.includes(at.p) ? { ok: true, code: 3 + at.p } : no("commitWhich", { p: at.p, c, list: m.pending.map((p) => `p${p}`).join(", ") });
  }
  const p = target(m, ev.c);
  if (at.kind === "empty") return p === null ? { ok: true, code: 2 } : no("hasMessages", { c, p: p });
  if (at.kind !== "take") return no("pollNow", { c });
  if (p === null) return no("nothingNew", { c });
  if (at.c !== ev.c) return no("pollWho", { c });
  if (m.owner[at.p] !== ev.c) return no("notAssigned", { p: at.p, c, owner: m.owner[at.p] === null ? "nobody" : consumerName(m.owner[at.p]!) });
  return at.p === p ? { ok: true, code: 1 } : no("firstPartition", { c, p });
}

// ---------- the tasks ----------

type Spec = { algo: QueueAlgo | null; n: number; need?: QueueNotice };
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));
const KEYS = ["ann", "bob", "cat", "dan", "eve", "fay"];

/**
 * A task worth playing: messages over two partitions or more, a key sent twice, every commit with something to commit;
 * for a group, both consumers taking
 * messages and three polls or more; with commits and a crash, a message read again; with a consumer joining, a
 * partition moving to it and the newcomer taking a message.
 */
export function queueTask(spec: Spec, next: () => number): QueueTask {
  const algo = spec.algo ?? pick(QUEUE_ALGOS, next);
  for (;;) {
    const parts = algo === "keys" ? 3 : int(2, 3, next);
    const keys = KEYS.slice(0, int(3, 4, next)).map((k) => ({ k, h: int(10, 99, next) }));
    const start = algo === "rebalance" ? [0] : algo === "keys" ? [] : [0, 1];
    const send = (): QueueEvent => ({ kind: "send", k: pick(keys, next).k });
    const events: QueueEvent[] = [];
    let live = [...start];
    const turn = Math.floor(spec.n * 0.55);
    for (let i = 0; i < spec.n; i++) {
      if (i === turn && algo === "commit") {
        const c = pick(live, next);
        events.push({ kind: "crash", c });
        live = live.filter((x) => x !== c);
      }
      if (i === turn && algo === "rebalance") {
        events.push({ kind: "join", c: 1 });
        live = [...live, 1];
      }
      const r = next();
      if (algo === "keys" || i < 3 || r < 0.35) events.push(send());
      else if (algo === "group" || r < 0.8) events.push({ kind: "poll", c: pick(live, next) });
      else events.push({ kind: "commit", c: pick(live, next) });
    }
    const t: QueueTask = { algo, parts, keys, start, events };
    const { ops, end } = queueRun(t);
    if (end.logs.filter((l) => l.length).length < 2 || !end.seen.includes("orderKept")) continue;
    // A commit with nothing read since is skipped by the code: no task asks for one.
    if (end.log.some((l) => l.op === "noCommit")) continue;
    if (algo === "group" && (!end.seen.includes("parallel") || ops.filter((c) => c === 1 || c === 2).length < 3)) continue;
    if (algo === "commit" && !end.seen.includes("redelivered")) continue;
    if (algo === "rebalance" && (!end.seen.includes("moved") || !end.got[1].length)) continue;
    if (spec.need && !end.seen.includes(spec.need)) continue;
    return t;
  }
}

export const QUEUE_LADDER: (Spec & { seed: number })[] = [
  { algo: "keys", n: 7, seed: 3901 },
  { algo: "group", n: 8, seed: 3902 },
  { algo: "commit", n: 10, seed: 3903 },
  { algo: "rebalance", n: 10, seed: 3904 },
  { algo: "keys", n: 9, seed: 3905 },
  { algo: "group", n: 10, need: "idle", seed: 3906 },
  { algo: "commit", n: 12, seed: 3907 },
  { algo: "rebalance", n: 12, seed: 3908 },
  { algo: null, n: 12, seed: 3909 },
];
/** The endless run: easy, keys or a group on eight events; medium, any on ten; hard, any on twelve or thirteen. */
export function levelSpec(level: QueueLevel, next: () => number): Spec {
  if (level === 1) return { algo: pick(["keys", "group"] as const, next), n: 8 };
  return { algo: null, n: level === 2 ? 10 : int(12, 13, next) };
}

export const queueStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function queueNotice(m: QueueMachine, misses: number, streak: number): QueueNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (QUEUE_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeQueue = EndlessGame<QueueNotice, QueueLevel, { kind: "wrong"; why: QueueWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far: 0 sent, 1 took, 2 came back empty, 3 + p committed partition p. */
    ops: number[];
  };
export function queueNow(d: Pick<LiveBeQueue, "mode" | "stage" | "level" | "seed">): QueueTask {
  if (d.mode === "puzzle") {
    const s = QUEUE_LADDER[d.stage];
    return queueTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return queueTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

const LINES = [
  "send(key, msg):",
  "  p = hash(key) % P; log[p].append(msg)",
  "poll(c):",
  "  p = c's first partition with unread messages",
  "  if none: return nothing",
  "  msg = log[p][pos[p]]; pos[p] += 1; return msg",
  "commit(c): for p of c: committed[p] = pos[p]",
  "on crash/join: reassign; pos = committed",
];
export const CODE: Record<QueueAlgo, string[]> = { keys: LINES, group: LINES, commit: LINES, rebalance: LINES };

/** A message as shown: its key and number, "ann#3". */
export const msgText = (x: QMsg) => `${x.k}#${x.id}`;

export function logText(l: QueueLog, t: QueueTask): string {
  switch (l.op) {
    case "start":
      return `P = ${t.parts}${t.start.length ? `; group = ${t.start.map(consumerName).join(", ")}` : ""}`;
    case "send":
      return `${l.k}: ${l.h} % ${t.parts} = ${l.p} → p${l.p}[${l.at}]`;
    case "take":
      return `${consumerName(l.c)} ← p${l.p}[${l.at}] = ${msgText(l.msg)}; pos = ${l.at + 1}`;
    case "empty":
      return `${consumerName(l.c)}: nothing new`;
    case "commit":
      return `${consumerName(l.c)} commits p${l.p} at ${l.at}`;
    case "noCommit":
      return `${consumerName(l.c)}: nothing to commit`;
    case "crash":
      return `${consumerName(l.c)} crashes`;
    case "join":
      return `${consumerName(l.c)} joins`;
    case "assign":
      return `p${l.p} → ${consumerName(l.c)}, from offset ${l.at}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: the event, a partition (part), its next message (m), a consumer (c), empty. */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type QueuePic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const VIOLET = "#7048e8";
const RED = "#e03131";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const LEFT = 100;
const CARD = 84;
const CELL = 44;
const MONO = "ui-monospace, Menlo, Consolas, monospace";
const CONSUMER = ["#1971c2", "#2f9e44", "#e8590c"];

const tx = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s.replace(/ /g, " ")}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;

/** An event as its card shows it. */
export function eventText(ev: QueueEvent): string {
  if (ev.kind === "send") return `send ${ev.k}`;
  return `${consumerName(ev.c)} ${ev.kind === "poll" ? "polls" : ev.kind === "commit" ? "commits" : ev.kind === "crash" ? "crashes" : "joins"}`;
}

/**
 * The machine drawn as a computer keeps it: P and the group; the events to come, the current one framed (a send shows
 * its key's hash); each partition a row of messages by offset, with the committed offset (green bar) and the owner's
 * next read (blue arrow) marked and the owner named at the end; the consumers, each with what it has taken, a crashed
 * one greyed; and the empty box. `hot` lights the spot a drag is over and `sel` the one picked up.
 */
export function queueSvg(m: QueueMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): QueuePic {
  const t = m.task;
  const spots: Spot[] = [];
  const parts: string[] = [];
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  const glow = (id: string, fill: string) => (lit(id) === "hot" ? "#fff3bf" : lit(id) ? "#ffe8cc" : fill);
  const live = !o.finished && expect(m) !== null;
  const e = live ? expect(m) : null;
  const label = (y: number, s: string) => parts.push(tx(LEFT - 12, y, s, { size: 14, anchor: "end", bold: true, mono: true }));
  const width = Math.max(...m.logs.map((l) => l.length), 6);

  parts.push(tx(16, 24, `P = ${t.parts}`, { size: 15, anchor: "start", bold: true, mono: true, color: VIOLET }));
  if (m.live.length) parts.push(tx(90, 24, `group = ${m.live.map(consumerName).join(", ")}`, { size: 13, anchor: "start", mono: true, color: MUTED }));

  // The events to come.
  let y = 38;
  label(y + 24, "events");
  t.events.slice(m.e, m.e + 5).forEach((x, k) => {
    const cx = LEFT + k * (CARD + 8);
    const now = k === 0 && live;
    const side = x.kind === "crash" || x.kind === "join";
    parts.push(box(cx, y, CARD, 40, now ? glow("req", "#fff4e6") : side ? "#f8f9fa" : "#fff", now ? ORANGE : side ? (x.kind === "crash" ? RED : GREEN) : "#adb5bd", false, now ? 2.4 : 1.4, 8));
    parts.push(tx(cx + CARD / 2, y + (x.kind === "send" ? 18 : 25), eventText(x), { size: 12, bold: now, mono: true, color: now ? INK : side ? (x.kind === "crash" ? RED : GREEN) : MUTED }));
    if (x.kind === "send") parts.push(tx(cx + CARD / 2, y + 33, `hash ${t.keys.find((y2) => y2.k === x.k)!.h}`, { size: 11, mono: true, color: now ? BLUE : MUTED }));
    if (now) spots.push({ id: "req", x: cx, y, w: CARD, h: 40, from: true, to: false, label: eventText(x) });
  });
  if (!live) parts.push(tx(LEFT, y + 24, "— all done —", { size: 13, anchor: "start", mono: true, color: GREEN }));

  // The partitions.
  y += 62;
  for (let p = 0; p < t.parts; p++) {
    const py = y + p * 76;
    const id = `part${p}`;
    const owner = m.owner[p];
    label(py + 30, `p${p}`);
    parts.push(box(LEFT - 4, py + 4, width * CELL + 8, 44, glow(id, "#f8f9fa"), lit(id) ? ORANGE : "#dee2e6", false, 1.4, 6));
    spots.push({ id, x: LEFT - 4, y: py + 4, w: width * CELL + 8, h: 44, from: false, to: true, label: `partition p${p}` });
    m.logs[p].forEach((msg, i) => {
      const x = LEFT + i * CELL;
      const next = i === m.pos[p] && e === "take";
      const mid = `m${p}`;
      const read = i < m.pos[p];
      parts.push(box(x, py + 8, CELL - 4, 36, next ? glow(mid, "#e7f5ff") : read ? "#f1f3f5" : "#fff", next ? BLUE : read ? "#ced4da" : VIOLET, false, next ? 2.4 : 1.4));
      parts.push(tx(x + (CELL - 4) / 2, py + 23, msg.k, { size: 11, bold: true, color: read ? MUTED : INK }));
      parts.push(tx(x + (CELL - 4) / 2, py + 38, `#${msg.id}`, { size: 10, mono: true, color: MUTED }));
      if (next) spots.push({ id: mid, x, y: py + 8, w: CELL - 4, h: 36, from: true, to: false, label: `p${p}[${i}] = ${msgText(msg)}` });
    });
    for (let i = 0; i <= width; i++) if (i < width) parts.push(tx(LEFT + i * CELL + (CELL - 4) / 2, py + 59, String(i), { size: 9, mono: true, color: "#adb5bd" }));
    const dx = LEFT + m.done[p] * CELL - 2;
    parts.push(`<line x1="${dx}" y1="${py + 2}" x2="${dx}" y2="${py + 50}" stroke="${GREEN}" stroke-width="3"/>`);
    if (owner !== null) parts.push(tx(LEFT + m.pos[p] * CELL + (CELL - 4) / 2, py + 2, "▼", { size: 11, color: CONSUMER[owner] }));
    parts.push(tx(LEFT + width * CELL + 14, py + 30, owner === null ? "—" : `→ ${consumerName(owner)}`, { size: 13, anchor: "start", bold: true, mono: true, color: owner === null ? MUTED : CONSUMER[owner] }));
  }
  y += t.parts * 76 + 4;

  // The consumers and the empty box.
  const cs = [...new Set([...t.start, ...t.events.flatMap((x) => (x.kind === "send" ? [] : [x.c]))])].sort((a, b) => a - b);
  if (cs.length) label(y + 30, "group");
  cs.forEach((c, k) => {
    const x = LEFT + k * 158;
    const id = `c${c}`;
    const up = m.live.includes(c);
    const color = CONSUMER[c];
    parts.push(box(x, y, 148, 50, up ? glow(id, "#fff") : "#f1f3f5", lit(id) ? ORANGE : up ? color : "#ced4da", !up, 2, 8));
    parts.push(tx(x + 10, y + 20, `${consumerName(c)}${up ? "" : " ✕"}`, { size: 14, anchor: "start", bold: true, color: up ? color : MUTED }));
    parts.push(tx(x + 10, y + 40, m.got[c].slice(-3).map(msgText).join(" ") || "—", { size: 11, anchor: "start", mono: true, color: up ? INK : MUTED }));
    spots.push({ id, x, y, w: 148, h: 50, from: false, to: true, label: `consumer ${consumerName(c)}` });
  });
  const ex = LEFT + Math.max(cs.length, 1) * 158;
  if (cs.length) {
    parts.push(box(ex, y + 6, 88, 38, glow("empty", "#fff"), lit("empty") ? ORANGE : "#adb5bd", true, 1.8, 8));
    parts.push(tx(ex + 44, y + 30, "∅ empty", { size: 13, bold: true, mono: true, color: MUTED }));
    spots.push({ id: "empty", x: ex, y: y + 6, w: 88, h: 38, from: false, to: true, label: "empty" });
  }
  return { w: Math.max(LEFT + width * CELL + 70, LEFT + 5 * (CARD + 8) + 20, ex + 100), h: y + 60, body: parts.join(""), spots };
}
