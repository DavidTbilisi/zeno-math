// Be the replicas: a player who makes the code's operations returns what a plain quorum store returns, on every puzzle
// and endless task, and leaves every replica as it does; with R + W > N and every replica up, every read returns the
// last write; every other operation is refused with the rule it broke; the tasks are worth playing; and the stars,
// notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, checkOp, CODE, expect as next, logText, nextReplica, QUORUM_ALGOS, QUORUM_LADDER, quorumNotice, quorumNow, quorumRun, quorumStars, quorumSvg, reads, replay, SETUP, staleReplies, startMachine, type QuorumAttempt, type QuorumLevel, type QuorumMachine, type QuorumTask, type QuorumWhy } from "../src/math/beQuorum.ts";

const tasks = (): { t: QuorumTask; where: string }[] => [
  ...QUORUM_LADDER.map((_, stage) => ({ t: quorumNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as QuorumLevel[]).flatMap((level) => Array.from({ length: 60 }, (_, i) => ({ t: quorumNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** A plain quorum store, request by request: what each read returns, the last write's version then, and the replicas at the end. */
function plain(t: QuorumTask) {
  const { n, w, r } = SETUP[t.algo];
  const reps = Array.from({ length: n }, () => ({ v: 0, ver: 0, up: true }));
  const out: ({ v: number; ver: number } | null)[] = [];
  const latest: number[] = [];
  let ver = 0;
  for (const ev of t.events) {
    if (ev.kind === "down" || ev.kind === "up") {
      reps[ev.i].up = ev.kind === "up";
      continue;
    }
    const list = Array.from({ length: n }, (_, k) => (ev.from + k) % n).filter((i) => reps[i].up);
    const need = ev.kind === "write" ? w : r;
    if (list.length < need) {
      if (ev.kind === "read") out.push(null), latest.push(ver);
      continue;
    }
    const reached = list.slice(0, need);
    if (ev.kind === "write") {
      ver++;
      for (const i of reached) reps[i] = { ...reps[i], v: ev.v, ver };
      continue;
    }
    const top = Math.max(...reached.map((i) => reps[i].ver));
    const best = reps[reached.find((i) => reps[i].ver === top)!];
    out.push({ v: best.v, ver: best.ver });
    latest.push(ver);
    for (const i of reached) if (reps[i].ver < top) reps[i] = { ...reps[i], v: best.v, ver: best.ver };
  }
  return { out, latest, reps };
}

/** Every operation the board lets the player try. */
const attempts = (m: QuorumMachine): QuorumAttempt[] => {
  const all = m.reps.map((_, i) => i);
  return [
    ...all.map((i) => ({ kind: "send" as const, i })),
    { kind: "fail" },
    ...m.reached.map((i) => ({ kind: "pick" as const, i })),
    ...(m.picked ? all.map((i) => ({ kind: "repair" as const, i })) : []),
  ];
};
function right(m: QuorumMachine, a: QuorumAttempt): boolean {
  const e = next(m);
  if (e === "fail") return a.kind === "fail";
  if (e === "send") return a.kind === "send" && a.i === nextReplica(m);
  if (e === "pick") return a.kind === "pick" && m.reps[a.i].ver === Math.max(...m.reached.map((i) => m.reps[i].ver));
  return a.kind === "repair" && staleReplies(m).includes(a.i);
}

test("the code's own operations return what a plain quorum store does, and leave the replicas as it does", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = quorumRun(t);
    const p = plain(t);
    assert.deepEqual(reads(end), p.out, `${where}: ${JSON.stringify(t)}`);
    assert.deepEqual(end.reps, p.reps, where);
    assert.deepEqual(replay(t, ops), end, where);
    // With R + W > N and no replica down, every read returns the last write.
    const { n, w, r } = SETUP[t.algo];
    if (r + w > n && t.algo !== "outage") assert.deepEqual(p.out.map((x) => x?.ver), p.latest, where);
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<QuorumWhy>();
  for (const { t, where } of tasks().filter((_, i) => i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of quorumRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.ok(c.code === code || (code >= 3 && c.code >= 3), where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    const c = checkOp(m, { kind: "fail" });
    assert.equal(c.ok, false);
    if (!c.ok) why.add(c.why);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beQuorum.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: QuorumMachine, a: QuorumAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  // W = R = 2 on three replicas: write c from r1 reaches r1 and r2; a read from r0 meets r0 (nothing) and r1 (c).
  const maj: QuorumTask = { algo: "majority", events: [{ kind: "write", v: 2, from: 1 }, { kind: "read", from: 0 }] };
  let m = startMachine(maj);
  assert.equal(say(m, { kind: "send", i: 0 }), `prefOrder {"i":1,"got":0,"need":2,"q":"W"}`);
  assert.equal(say(m, { kind: "fail" }), `hasQuorum {"up":3,"need":2,"q":"W"}`);
  m = apply(m, 0);
  assert.equal(say(m, { kind: "send", i: 1 }), `already {"i":1}`);
  m = apply(m, 0);
  assert.equal(logText(m.log.at(-1)!, maj), "r2.put(c, v1); acks = 2 = W: ok");
  assert.equal(say(m, { kind: "send", i: 1 }), `prefOrder {"i":0,"got":0,"need":2,"q":"R"}`);
  m = [0, 0].reduce(apply, m);
  assert.equal(logText(m.log.at(-2)!, maj), "r0 replies nothing (v0); replies = 1");
  assert.equal(say(m, { kind: "pick", i: 0 }), `newest {"ver":1,"i":1}`);
  m = apply(m, 2);
  assert.deepEqual(m.seen, ["overlap"]);
  assert.equal(say(m, { kind: "repair", i: 2 }), `notStale {"i":2,"ver":1,"left":"r0"}`);
  m = apply(m, 3);
  assert.equal(logText(m.log.at(-1)!, maj), "repair r0.put(c, v1)");
  assert.deepEqual(m.seen, ["overlap", "repaired"]);
  assert.equal(say(m, { kind: "fail" }), "allDone {}");
  // A replica down is skipped; with fewer than W up, the write fails.
  const down: QuorumTask = { algo: "majority", events: [{ kind: "down", i: 1 }, { kind: "write", v: 0, from: 1 }, { kind: "down", i: 2 }, { kind: "write", v: 1, from: 0 }] };
  m = startMachine(down);
  assert.equal(say(m, { kind: "send", i: 1 }), `isDown {"i":1}`);
  m = [0, 0].reduce(apply, m);
  assert.equal(say(m, { kind: "send", i: 0 }), `noQuorum {"up":1,"need":2,"q":"W"}`);
  assert.equal(logText(apply(m, 1).log.at(-1)!, down), "write fails: 1 up < W = 2");
  // W = R = 1: the write reaches r0, the read asks r1 alone and returns nothing — stale.
  const one: QuorumTask = { algo: "one", events: [{ kind: "write", v: 0, from: 0 }, { kind: "read", from: 1 }] };
  m = replay(one, [0, 0, 2]);
  assert.equal(logText(m.log.at(-1)!, one), "return nothing (v0)");
  assert.deepEqual(m.seen, ["stale"]);
  assert.equal(logText(m.log[0], one), "N = 3, W = 1, R = 1");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { end } = quorumRun(t);
    assert.ok(t.events[0].kind === "write", where);
    if (t.algo === "one") assert.ok(end.seen.includes("stale"), where);
    else assert.ok(end.seen.includes("repaired"), where);
    if (t.algo === "outage") assert.ok(end.seen.includes("unavailable"), where);
  }
  QUORUM_LADDER.forEach((s, stage) => {
    const end = quorumRun(quorumNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    if (s.algo) assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(QUORUM_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(quorumStars), [3, 2, 1, 1]);
  const end = quorumRun(quorumNow({ mode: "puzzle", stage: 1, level: 1, seed: 1 })).end;
  assert.deepEqual(end.seen, ["stale"]);
  assert.equal(quorumNotice(end, 0, 2), "stale");
  assert.equal(quorumNotice(end, 1, 2), null);
  assert.equal(quorumNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of quorumRun(t).ops) {
      const pic = quorumSvg(m, { hot: "r0", sel: "req" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const top = m.reached.length ? m.reached.find((i) => m.reps[i].ver === Math.max(...m.reached.map((x) => m.reps[x].ver)))! : 0;
      const pair = e === "send" ? ["req", `r${nextReplica(m)}`] : e === "fail" ? ["req", "fail"] : e === "pick" ? [`p${top}`, "ret"] : ["val", `r${code - 3}`];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(quorumSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beQuorum);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beQuorum));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeQuorum);
  }
  for (const algo of QUORUM_ALGOS) assert.ok(en.live.beQuorum.names[algo] && en.live.beQuorum.hint[algo] && en.live.beQuorum.right[algo].includes("{stars}"));
});
