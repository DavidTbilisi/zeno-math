// Be the message queue: a player who makes the code's operations gives each consumer what a plain partitioned log
// does, on every puzzle and endless task, and leaves the same logs and committed offsets; every message below a
// committed offset was read at least once; every other operation is refused with the rule it broke; the tasks are
// worth playing; and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, assignment, checkOp, CODE, expect as next, logText, partitionOf, QUEUE_ALGOS, QUEUE_LADDER, queueNotice, queueNow, queueRun, queueStars, queueSvg, replay, startMachine, target, type QueueAttempt, type QueueLevel, type QueueMachine, type QueueTask, type QueueWhy } from "../src/math/beQueue.ts";

const tasks = (): { t: QueueTask; where: string }[] => [
  ...QUEUE_LADDER.map((_, stage) => ({ t: queueNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as QueueLevel[]).flatMap((level) => Array.from({ length: 60 }, (_, i) => ({ t: queueNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** A plain partitioned log: the message numbers each consumer gets, the logs, and the committed offsets. */
function plain(t: QueueTask) {
  const P = t.parts;
  const logs: number[][] = Array.from({ length: P }, () => []);
  const pos = Array(P).fill(0);
  const done = Array(P).fill(0);
  const got: number[][] = [[], [], []];
  let live = [...t.start];
  // Range: consumer i of C (in order) takes the next P // C partitions, one more for the first P % C.
  const owners = () => {
    const cs = [...live].sort((a, b) => a - b);
    const out: (number | null)[] = Array(P).fill(null);
    let p = 0;
    cs.forEach((c, i) => {
      const size = Math.floor(P / cs.length) + (i < P % cs.length ? 1 : 0);
      for (const end = p + size; p < end; p++) out[p] = c;
    });
    return out;
  };
  let owner = owners();
  let id = 0;
  for (const ev of t.events) {
    if (ev.kind === "send") logs[t.keys.find((x) => x.k === ev.k)!.h % P].push(++id);
    else if (ev.kind === "poll") {
      const p = owner.findIndex((o, q) => o === ev.c && pos[q] < logs[q].length);
      if (p >= 0) got[ev.c].push(logs[p][pos[p]++]);
    } else if (ev.kind === "commit") owner.forEach((o, p) => o === ev.c && (done[p] = pos[p]));
    else {
      live = ev.kind === "crash" ? live.filter((c) => c !== ev.c) : [...live, ev.c];
      const now = owners();
      now.forEach((o, p) => o !== owner[p] && (pos[p] = done[p]));
      owner = now;
    }
  }
  return { got, logs, done };
}

/** Every operation the board lets the player try. */
const attempts = (m: QueueMachine): QueueAttempt[] => {
  const ps = m.logs.map((_, p) => p);
  return [
    ...ps.map((p) => ({ kind: "send" as const, p })),
    ...ps.filter((p) => m.pos[p] < m.logs[p].length).flatMap((p) => [0, 1].map((c) => ({ kind: "take" as const, p, c }))),
    { kind: "empty" },
    ...ps.map((p) => ({ kind: "commit" as const, p })),
  ];
};
function right(m: QueueMachine, a: QueueAttempt): boolean {
  const ev = m.task.events[m.e] as { kind: string; k: string; c: number };
  switch (next(m)) {
    case "send":
      return a.kind === "send" && a.p === partitionOf(m.task, ev.k);
    case "take":
      return a.kind === "take" && a.c === ev.c && a.p === target(m, ev.c);
    case "empty":
      return a.kind === "empty";
    default:
      return a.kind === "commit" && m.pending.includes(a.p);
  }
}

test("the code's own operations give each consumer what a plain log does, and read everything committed at least once", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = queueRun(t);
    const p = plain(t);
    assert.deepEqual(end.got.map((g) => g.map((x) => x.id)), p.got, `${where}: ${JSON.stringify(t)}`);
    assert.deepEqual(end.logs.map((l) => l.map((x) => x.id)), p.logs, where);
    assert.deepEqual(end.done, p.done, where);
    assert.deepEqual(replay(t, ops), end, where);
    const read = new Set(end.got.flat().map((x) => x.id));
    end.logs.forEach((l, q) => l.slice(0, end.done[q]).forEach((x) => assert.ok(read.has(x.id), where)));
    // One key's messages sit in one partition, in the order sent.
    for (const { k } of t.keys) assert.ok(end.logs.filter((l) => l.some((x) => x.k === k)).length <= 1, where);
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<QueueWhy>();
  for (const { t, where } of tasks().filter((_, i) => i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of queueRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.ok(c.code === code || (code >= 3 && c.code >= 3), where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    const c = checkOp(m, { kind: "empty" });
    assert.equal(c.ok, false);
    if (!c.ok) why.add(c.why);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beQueue.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: QueueMachine, a: QueueAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  assert.deepEqual(assignment(3, [1, 0]), [0, 0, 1]);
  assert.deepEqual(assignment(2, []), [null, null]);
  const keys = [{ k: "ann", h: 11 }, { k: "bob", h: 20 }];
  // A group of two on two partitions: ann goes to p1 (c2's), bob to p0 (c1's); c1's second poll finds nothing.
  const group: QueueTask = { algo: "group", parts: 2, keys, start: [0, 1], events: [{ kind: "send", k: "ann" }, { kind: "send", k: "bob" }, { kind: "poll", c: 0 }, { kind: "poll", c: 0 }] };
  let m = startMachine(group);
  assert.equal(say(m, { kind: "send", p: 0 }), `hashKey {"k":"ann","h":11,"P":2,"p":1}`);
  assert.equal(say(m, { kind: "empty" }), `sendNow {"k":"ann"}`);
  m = [0, 0].reduce(apply, m);
  assert.equal(logText(m.log.at(-1)!, group), "bob: 20 % 2 = 0 → p0[0]");
  assert.equal(say(m, { kind: "take", p: 1, c: 0 }), `notAssigned {"p":1,"c":"c1","owner":"c2"}`);
  assert.equal(say(m, { kind: "take", p: 0, c: 1 }), `pollWho {"c":"c1"}`);
  assert.equal(say(m, { kind: "empty" }), `hasMessages {"c":"c1","p":0}`);
  assert.equal(say(m, { kind: "commit", p: 0 }), `pollNow {"c":"c1"}`);
  m = apply(m, 1);
  assert.equal(logText(m.log.at(-1)!, group), "c1 ← p0[0] = bob#2; pos = 1");
  assert.equal(say(m, { kind: "take", p: 1, c: 0 }), `nothingNew {"c":"c1"}`);
  m = apply(m, 2);
  assert.equal(logText(m.log.at(-1)!, group), "c1: nothing new");
  assert.equal(say(m, { kind: "empty" }), "allDone {}");
  // One consumer on both partitions reads p0 first; it commits p0, not p1 where it read nothing.
  const one: QueueTask = { algo: "rebalance", parts: 2, keys, start: [0], events: [{ kind: "send", k: "ann" }, { kind: "send", k: "bob" }, { kind: "poll", c: 0 }, { kind: "commit", c: 0 }, { kind: "commit", c: 0 }] };
  m = replay(one, [0, 0]);
  assert.equal(say(m, { kind: "take", p: 1, c: 0 }), `firstPartition {"c":"c1","p":0}`);
  m = apply(m, 1);
  assert.equal(say(m, { kind: "commit", p: 1 }), `commitWhich {"p":1,"c":"c1","list":"p0"}`);
  assert.equal(say(m, { kind: "empty" }), `commitNow {"c":"c1","list":"p0"}`);
  m = apply(m, 3);
  assert.deepEqual(m.log.slice(-2).map((l) => logText(l, one)), ["c1 commits p0 at 1", "c1: nothing to commit"]);
  // c2 reads ann but crashes before committing: p1 moves to c1, which reads ann again.
  const crash: QueueTask = { algo: "commit", parts: 2, keys, start: [0, 1], events: [{ kind: "send", k: "ann" }, { kind: "poll", c: 1 }, { kind: "crash", c: 1 }, { kind: "poll", c: 0 }] };
  m = replay(crash, [0, 1]);
  assert.deepEqual(m.log.slice(-2).map((l) => logText(l, crash)), ["c2 crashes", "p1 → c1, from offset 0"]);
  m = apply(m, 1);
  assert.deepEqual(m.seen, ["moved", "redelivered", "parallel"]);
  assert.equal(logText(m.log[0], crash), "P = 2; group = c1, c2");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { end } = queueRun(t);
    assert.ok(end.seen.includes("orderKept") && !end.log.some((l) => l.op === "noCommit"), where);
    if (t.algo === "group") assert.ok(end.seen.includes("parallel"), where);
    if (t.algo === "commit") assert.ok(end.seen.includes("redelivered"), where);
    if (t.algo === "rebalance") assert.ok(end.seen.includes("moved") && end.got[1].length > 0, where);
  }
  QUEUE_LADDER.forEach((s, stage) => {
    const end = queueRun(queueNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    if (s.algo) assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(QUEUE_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(queueStars), [3, 2, 1, 1]);
  const end = queueRun(queueNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 })).end;
  assert.deepEqual(end.seen, ["orderKept"]);
  assert.equal(queueNotice(end, 0, 2), "orderKept");
  assert.equal(queueNotice(end, 1, 2), null);
  assert.equal(queueNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of queueRun(t).ops) {
      const pic = queueSvg(m, { hot: "part0", sel: "req" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const ev = t.events[m.e] as unknown as { k: string; c: number };
      const e = next(m)!;
      const pair = e === "send" ? ["req", `part${partitionOf(t, ev.k)}`] : e === "take" ? [`m${target(m, ev.c)}`, `c${ev.c}`] : e === "empty" ? ["req", "empty"] : ["req", `part${code - 3}`];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(queueSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beQueue);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beQueue));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeQueue);
  }
  for (const algo of QUEUE_ALGOS) assert.ok(en.live.beQueue.names[algo] && en.live.beQueue.hint[algo] && en.live.beQueue.right[algo].includes("{stars}"));
});
