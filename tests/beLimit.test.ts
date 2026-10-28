// Be the rate limiter: a player who makes the code's operations lets through exactly the requests a plain limiter does,
// on every puzzle and endless task, and never more than the limit allows; every other operation is refused with the
// rule it broke; the tasks are worth playing; and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, checkOp, CODE, expect as next, fixedAllows, LIMIT_ALGOS, LIMIT_LADDER, limitNotice, limitNow, limitRun, limitStars, limitSvg, logText, OPS, replay, startMachine, type LimitAttempt, type LimitLevel, type LimitMachine, type LimitTask, type LimitWhy } from "../src/math/beLimit.ts";

const tasks = (): { t: LimitTask; where: string }[] => [
  ...LIMIT_LADDER.map((_, stage) => ({ t: limitNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as LimitLevel[]).flatMap((level) => Array.from({ length: 60 }, (_, i) => ({ t: limitNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** Which requests a plain limiter lets through: a token added every R seconds, counts of what got through, a queue drained tick by tick. */
function plain(t: LimitTask): boolean[] {
  const { times, cap, per } = t;
  const got: boolean[] = [];
  if (t.algo === "bucket") {
    let tokens = cap;
    let tick = per;
    for (const at of times) {
      for (; tick <= at; tick += per) tokens = Math.min(cap, tokens + 1);
      got.push(tokens >= 1 && tokens-- > 0);
    }
  } else if (t.algo === "leaky") {
    const queue: number[] = [];
    let done = 0;
    for (const at of times) {
      for (let s = (Math.floor(done / per) + 1) * per; s <= at; s += per) queue.shift();
      done = at;
      got.push(queue.length < cap && queue.push(at) > 0);
    }
  } else
    times.forEach((at, i) => {
      const counted = times.filter((x, j) => j < i && got[j] && (t.algo === "fixed" ? Math.floor(x / per) === Math.floor(at / per) : x > at - per));
      got.push(counted.length < cap);
    });
  return got;
}

const attempts: LimitAttempt[] = [{ kind: "clean" }, { kind: "allow" }, { kind: "reject" }];

test("the code's own operations let through exactly what a plain limiter does, never more than the limit", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = limitRun(t);
    assert.deepEqual(end.got, plain(t), `${where}: ${JSON.stringify(t)}`);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
    const through = t.times.filter((_, i) => end.got[i]);
    if (t.algo === "sliding") assert.ok(through.every((x) => through.filter((y) => y > x - t.per && y <= x).length <= t.cap), where);
    if (t.algo === "fixed") assert.deepEqual(end.got, fixedAllows(t.times, t.per, t.cap), where);
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<LimitWhy>();
  for (const { t, where } of tasks().filter((_, i) => i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of limitRun(t).ops) {
      for (const a of attempts) {
        const c = checkOp(m, a);
        assert.equal(c.ok, a.kind === next(m), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    const c = checkOp(m, { kind: "allow" });
    assert.equal(c.ok, false);
    if (!c.ok) why.add(c.why);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beLimit.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: LimitMachine, a: LimitAttempt["kind"]) => {
    const c = checkOp(m, { kind: a });
    return c.ok ? "ok" : `${c.why} ${[...new Set(en.live.beLimit.why[c.why].match(/\{\w+\}/g) ?? [])].map((k) => `${k}=${c.vars[k.slice(1, -1)]}`).join(" ")}`.trim();
  };
  const [CLEAN, ALLOW, REJECT] = OPS.map((_, i) => i);
  // A bucket of 2 earning one token every 3 s: two at t = 0 empty it; at t = 4 one token has been earned.
  const bucket: LimitTask = { algo: "bucket", times: [0, 0, 0, 4], cap: 2, per: 3 };
  let m = replay(bucket, [ALLOW, ALLOW]);
  assert.equal(say(m, "allow"), "noToken {n}=0");
  assert.equal(say(m, "clean"), "noRefill {t}=0 {last}=0 {R}=3");
  m = apply(m, REJECT);
  assert.equal(say(m, "allow"), "refillFirst {t}=4 {last}=0 {R}=3 {k}=1");
  m = apply(m, CLEAN);
  assert.equal(logText(m.log.at(-1)!, bucket), "t = 4: k = 1; tokens = min(2, 0 + 1) = 1; last = 3");
  assert.equal(say(m, "reject"), "hasToken {n}=1");
  // One per window of 4 s: t = 2 is over the limit; t = 5 starts window 1.
  const fixed: LimitTask = { algo: "fixed", times: [1, 2, 5], cap: 1, per: 4 };
  m = startMachine(fixed);
  assert.equal(say(m, "clean"), "sameWindow {t}=1 {W}=4 {w}=0");
  m = apply(m, ALLOW);
  assert.equal(say(m, "allow"), "atLimit {c}=1 {L}=1");
  m = apply(m, REJECT);
  assert.equal(say(m, "allow"), "newWindow {t}=5 {W}=4 {w}=1");
  m = apply(m, CLEAN);
  assert.equal(logText(m.log.at(-1)!, fixed), "t = 5: window 1 starts; count = 0");
  assert.equal(say(m, "reject"), "underLimit {c}=0 {L}=1");
  // One in any 4 s: 1 is still in the window at t = 3, and drops out at t = 5.
  const sliding: LimitTask = { algo: "sliding", times: [1, 3, 5], cap: 1, per: 4 };
  m = replay(sliding, [ALLOW]);
  assert.equal(say(m, "clean"), "stillIn {x}=1 {t}=3 {W}=4 {from}=-1");
  m = apply(m, REJECT);
  assert.equal(say(m, "reject"), "expireFirst {x}=1 {t}=5 {W}=4");
  m = apply(m, CLEAN);
  assert.equal(logText(m.log.at(-1)!, sliding), "t = 5: drop 1 (1 ≤ 5 − 4)");
  assert.equal(logText(apply(m, ALLOW).log.at(-1)!, sliding), "t = 5: allow; log = [5]");
  // A queue of 1 letting one out every 2 s: t = 1 finds it full; at t = 3 the request of t = 0 has left at t = 2.
  const leaky: LimitTask = { algo: "leaky", times: [0, 1, 3], cap: 1, per: 2 };
  m = replay(leaky, [ALLOW]);
  assert.equal(say(m, "clean"), "noLeak {t}=1");
  assert.equal(say(m, "allow"), "queueFull {c}=1 {L}=1");
  m = apply(m, REJECT);
  assert.equal(say(m, "reject"), "leakFirst {d}=2 {t}=3");
  m = apply(m, CLEAN);
  assert.equal(logText(m.log.at(-1)!, leaky), "t = 2: the request of t = 0 leaves the queue");
  assert.equal(say(m, "reject"), "roomInQueue {c}=0 {L}=1");
  assert.equal(say(apply(m, ALLOW), "allow"), "allDone");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = limitRun(t);
    assert.ok(ops.filter((c) => OPS[c] === "reject").length >= 2 && ops.filter((c) => OPS[c] === "clean").length >= 2, where);
    assert.ok(end.got.some((ok, i) => ok && end.got.slice(0, i).includes(false)), where);
  }
  LIMIT_LADDER.forEach((s, stage) => {
    const end = limitRun(limitNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    if (s.algo) assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(LIMIT_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(limitStars), [3, 2, 1, 1]);
  const end = limitRun(limitNow({ mode: "puzzle", stage: 4, level: 1, seed: 1 })).end;
  assert.deepEqual(end.seen, ["burst"]);
  assert.equal(limitNotice(end, 0, 2), "burst");
  assert.equal(limitNotice(end, 1, 2), null);
  assert.equal(limitNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of limitRun(t).ops) {
      const pic = limitSvg(m, { hot: "allow", sel: "req" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const pair = e === "clean" ? (t.algo === "bucket" || t.algo === "fixed" ? ["clock", "state"] : ["head", "bin"]) : ["req", e];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(limitSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beLimit);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beLimit));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeLimit);
  }
  for (const algo of LIMIT_ALGOS) assert.ok(en.live.beLimit.names[algo] && en.live.beLimit.hint[algo] && en.live.beLimit.right[algo].includes("{stars}"));
});
