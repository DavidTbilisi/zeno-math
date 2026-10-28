// Be the cache: a player who makes the code's operations returns what a plain cache simulation gives, on every puzzle
// and endless task, and leaves the same keys in the same order and the same database; every other operation is refused
// with the rule it broke; the tasks are worth playing; and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, CACHE_ALGOS, CACHE_LADDER, cacheNotice, cacheNow, cacheRun, cacheStars, cacheSvg, checkOp, CODE, expect as next, gets, hasDb, logText, OPS, replay, startMachine, victimAt, type CacheAttempt, type CacheLevel, type CacheMachine, type CacheTask, type CacheWhy } from "../src/math/beCache.ts";

const tasks = (): { t: CacheTask; where: string }[] => [
  ...CACHE_LADDER.map((_, stage) => ({ t: cacheNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as CacheLevel[]).flatMap((level) => Array.from({ length: 60 }, (_, i) => ({ t: cacheNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** The cache by a plain simulation: an array of keys used last first, their values, uses and dirty marks. */
function plain(t: CacheTask) {
  const order: number[] = [];
  const val = new Map<number, number>();
  const uses = new Map<number, number>();
  const dirty = new Set<number>();
  const db = [...t.db];
  const out: number[] = [];
  let writes = 0;
  const write = (k: number, v: number) => {
    db[k] = v;
    writes++;
  };
  for (const q of t.reqs) {
    if (order.includes(q.k)) {
      order.splice(order.indexOf(q.k), 1);
      order.unshift(q.k);
      uses.set(q.k, uses.get(q.k)! + 1);
      if (q.op === "get") out.push(val.get(q.k)!);
      else {
        val.set(q.k, q.v);
        if (t.algo === "back") dirty.add(q.k);
        if (t.algo === "through") write(q.k, q.v);
      }
      continue;
    }
    if (q.op === "get" && !hasDb(t.algo)) {
      out.push(-1);
      continue;
    }
    if (order.length === t.cap) {
      const least = Math.min(...order.map((k) => uses.get(k)!));
      const victim = t.algo === "lfu" ? order.filter((k) => uses.get(k) === least).at(-1)! : order.at(-1)!;
      if (dirty.has(victim)) write(victim, val.get(victim)!);
      dirty.delete(victim);
      order.splice(order.indexOf(victim), 1);
    }
    order.unshift(q.k);
    uses.set(q.k, 1);
    if (q.op === "get") {
      val.set(q.k, db[q.k]);
      out.push(db[q.k]);
    } else {
      val.set(q.k, q.v);
      if (t.algo === "back") dirty.add(q.k);
      if (t.algo === "through") write(q.k, q.v);
    }
  }
  return { out, order, vals: order.map((k) => val.get(k)), db, writes };
}

/** Every operation the board lets the player try. */
const attempts = (m: CacheMachine): CacheAttempt[] => {
  const db = hasDb(m.task.algo);
  return [
    ...m.list.map((n) => ({ kind: "hit" as const, k: n.k })),
    ...(db ? [] : [{ kind: "miss" as const }]),
    { kind: "insert" },
    ...(db ? [{ kind: "write" as const }] : []),
    ...m.list.flatMap((n) => [{ kind: "evict" as const, k: n.k }, ...(db ? [{ kind: "flush" as const, k: n.k }] : [])]),
    ...(db ? Array.from({ length: m.task.db.length - 1 }, (_, i) => ({ kind: "load" as const, k: i + 1 })) : []),
  ];
};
function right(m: CacheMachine, a: CacheAttempt): boolean {
  const e = next(m);
  const k = m.task.reqs[m.r].k;
  if (e === "hit" || e === "load") return a.kind === e && a.k === k;
  if (e === "evict" || e === "flush") return a.kind === e && a.k === m.list[victimAt(m)].k;
  return a.kind === e;
}

test("the code's own operations return what a plain cache gives, and leave the same keys, values and database", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = cacheRun(t);
    const p = plain(t);
    assert.deepEqual(gets(end), p.out, `${where}: ${JSON.stringify(t)}`);
    assert.deepEqual(end.list.map((n) => n.k), p.order, where);
    assert.deepEqual(end.list.map((n) => n.v), p.vals, where);
    assert.deepEqual(end.db, p.db, where);
    assert.equal(end.writes, p.writes, where);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
    // The cache never holds more than its slots, nor a key twice.
    let m = startMachine(t);
    for (const code of ops) {
      m = apply(m, code);
      assert.ok(m.list.length <= t.cap, where);
      assert.equal(new Set(m.list.map((n) => n.k)).size, m.list.length, where);
    }
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<CacheWhy>();
  for (const { t, where } of tasks().filter((_, i) => i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of cacheRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    const c = checkOp(m, { kind: "insert" });
    assert.equal(c.ok, false);
    if (!c.ok) why.add(c.why);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beCache.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: CacheMachine, a: CacheAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const op = (s: (typeof OPS)[number]) => OPS.indexOf(s);
  // LRU with 2 slots: put(1, a) put(2, b) get(1) put(3, c) get(2). The get moves 1 to the head, so 2 is the tail.
  const lru: CacheTask = { algo: "lru", cap: 2, reqs: [{ op: "put", k: 1, v: 0 }, { op: "put", k: 2, v: 1 }, { op: "get", k: 1, v: 0 }, { op: "put", k: 3, v: 2 }, { op: "get", k: 2, v: 0 }], db: [] };
  let m = startMachine(lru);
  assert.equal(say(m, { kind: "miss" }), `putAdds {"k":1}`);
  assert.equal(say(m, { kind: "evict", k: 1 }), `roomLeft {"n":0,"c":2}`);
  m = replay(lru, [op("insert"), op("insert")]);
  assert.equal(say(m, { kind: "insert" }), `inCache {"k":1}`);
  assert.equal(say(m, { kind: "hit", k: 2 }), `wrongKey {"k":2,"want":1}`);
  m = apply(m, op("hit"));
  assert.equal(logText(m.log.at(-1)!, lru), "return a; 1 to head");
  assert.deepEqual(m.seen, ["hitFront"]);
  assert.equal(say(m, { kind: "insert" }), `fullFirst {"c":2}`);
  assert.equal(say(m, { kind: "evict", k: 1 }), `lruTail {"t":2}`);
  m = [op("evict"), op("insert")].reduce(apply, m);
  assert.equal(logText(m.log.at(-2)!, lru), "evict 2 (tail)");
  assert.equal(say(m, { kind: "insert" }), `getMisses {"k":2}`);
  m = apply(m, op("miss"));
  assert.equal(logText(m.log.at(-1)!, lru), "get(2): not in map; return −1");
  assert.deepEqual(gets(m), [0, -1]);
  assert.equal(say(m, { kind: "insert" }), "allDone {}");
  // LFU with 2 slots: put(1, a) get(1) put(2, b) put(3, c): 1 is the oldest but used twice, so 2 goes.
  const lfu: CacheTask = { algo: "lfu", cap: 2, reqs: [{ op: "put", k: 1, v: 0 }, { op: "get", k: 1, v: 0 }, { op: "put", k: 2, v: 1 }, { op: "put", k: 3, v: 2 }], db: [] };
  const f = replay(lfu, [op("insert"), op("hit"), op("insert")]);
  assert.equal(say(f, { kind: "evict", k: 1 }), `lfuMin {"t":2,"f":1}`);
  assert.deepEqual(apply(f, op("evict")).seen, ["spared"]);
  assert.equal(logText(apply(f, op("evict")).log.at(-1)!, lfu), "evict 2 (uses 1)");
  // Write-back with 2 slots: put(1, a) put(2, b) get(3): the tail, 1, is dirty, so it is written back first.
  const back: CacheTask = { algo: "back", cap: 2, reqs: [{ op: "put", k: 1, v: 0 }, { op: "put", k: 2, v: 1 }, { op: "get", k: 3, v: 0 }, { op: "put", k: 2, v: 4 }], db: [0, 5, 6, 7, 8] };
  const b = replay(back, [op("insert"), op("insert")]);
  assert.equal(say(b, { kind: "evict", k: 1 }), `flushFirst {"t":1}`);
  assert.equal(say(b, { kind: "write" }), `backLater {"k":3}`);
  const b2 = apply(b, op("flush"));
  assert.equal(logText(b2.log.at(-1)!, back), "db[1] = a   # write-back");
  const b3 = apply(b2, op("evict"));
  assert.equal(say(b3, { kind: "load", k: 2 }), `loadKey {"k":3}`);
  assert.equal(say(b3, { kind: "insert" }), `readDb {"k":3}`);
  assert.equal(say(b3, { kind: "miss" }), `readDb {"k":3}`);
  assert.equal(logText(apply(b3, op("load")).log.at(-1)!, back), "map[3] = db[3] = h; return h");
  // Write-through with 1 slot: put(1, a) is cached, then written; get(2) evicts the clean 1.
  const thr: CacheTask = { algo: "through", cap: 1, reqs: [{ op: "put", k: 1, v: 0 }, { op: "get", k: 2, v: 0 }, { op: "put", k: 3, v: 2 }], db: [0, 5, 6, 7] };
  let w = startMachine(thr);
  assert.equal(say(w, { kind: "write" }), `cacheFirst {"k":1}`);
  w = apply(w, op("insert"));
  assert.equal(say(w, { kind: "hit", k: 1 }), `writeNow {"k":1,"v":"a"}`);
  w = apply(w, op("write"));
  assert.equal(logText(w.log.at(-1)!, thr), "db[1] = a   # write-through");
  assert.equal(say(w, { kind: "flush", k: 1 }), `cleanNoFlush {"t":1}`);
  assert.equal(say(w, { kind: "load", k: 2 }), `fullFirst {"c":1}`);
  w = [op("evict"), op("load")].reduce(apply, w);
  // put(3, c) finds the one slot full: a new key waits for the eviction, and isn't a miss.
  assert.equal(say(w, { kind: "load", k: 3 }), `fullFirst {"c":1}`);
  assert.equal(say(w, { kind: "miss" }), `putAdds {"k":3}`);
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = cacheRun(t);
    const count = (op: (typeof OPS)[number]) => ops.filter((c) => OPS[c] === op).length;
    assert.ok(count("hit") >= 2 && count("evict") >= 2, where);
    assert.ok(count(hasDb(t.algo) ? "load" : "miss") >= 1, where);
    if (t.algo === "lfu") assert.ok(end.seen.includes("spared"), where);
    if (t.algo === "back") assert.ok(end.seen.includes("flushed"), where);
  }
  CACHE_LADDER.forEach((s, stage) => {
    const end = cacheRun(cacheNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    if (s.algo) assert.equal(end.task.algo, s.algo);
    assert.equal(end.task.cap, s.cap);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(CACHE_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(cacheStars), [3, 2, 1, 1]);
  const end = cacheRun(cacheNow({ mode: "puzzle", stage: 4, level: 1, seed: 1 })).end;
  assert.deepEqual(end.seen, ["flushed", "fewerWrites"]);
  assert.equal(cacheNotice(end, 0, 2), "flushed");
  assert.equal(cacheNotice(end, 1, 2), null);
  assert.equal(cacheNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of cacheRun(t).ops) {
      const pic = cacheSvg(m, { hot: "head", sel: "req" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const k = t.reqs[m.r].k;
      const victim = m.list.length ? m.list[victimAt(m)].k : 0;
      const pair = {
        hit: ["req", `n${k}`], miss: ["req", "miss"], insert: ["req", "head"], write: ["req", "db"],
        evict: [`n${victim}`, "bin"], flush: [`n${victim}`, "db"], load: [`d${k}`, "head"],
      }[e];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(cacheSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beCache);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beCache));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeCache && dict.senseSystem);
  }
  for (const algo of CACHE_ALGOS) assert.ok(en.live.beCache.names[algo] && en.live.beCache.hint[algo] && en.live.beCache.right[algo].includes("{stars}"));
});
