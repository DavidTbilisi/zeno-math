// Be the load balancer: a player who makes the code's operations sends each request where a plain balancer does, on
// every puzzle and endless task; a full smooth weighted cycle gives each server its weight; every other operation is
// refused with the rule it broke; the tasks are worth playing; and the stars, notices, pictures, log and words follow
// the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, checkOp, choose, CODE, expect as next, LB_ALGOS, LB_LADDER, lbNotice, lbNow, lbRun, lbStars, lbSvg, logText, OPS, replay, sends, startMachine, type LbAttempt, type LbEvent, type LbLevel, type LbMachine, type LbTask, type LbWhy } from "../src/math/beBalance.ts";

const tasks = (): { t: LbTask; where: string }[] => [
  ...LB_LADDER.map((_, stage) => ({ t: lbNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as LbLevel[]).flatMap((level) => Array.from({ length: 60 }, (_, i) => ({ t: lbNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** Where a plain balancer sends each request. */
function plain(t: LbTask): number[] {
  const up = t.w.map(() => true);
  const cw = t.w.map(() => 0);
  const opened: { s: number; at: number; d: number }[] = [];
  const out: number[] = [];
  let i = 0;
  let r = 0;
  for (const ev of t.events) {
    if (ev.kind === "down") {
      up[ev.s] = false;
      continue;
    }
    const live = up.flatMap((u, s) => (u ? [s] : []));
    let s: number;
    if (t.algo === "rr") {
      while (!up[i]) i = (i + 1) % t.n;
      s = i;
      i = (i + 1) % t.n;
    } else if (t.algo === "least") {
      // A connection opened at request a, lasting d, is open while the requests a + 1 … a + d − 1 are placed.
      const open = (x: number) => opened.filter((c) => c.s === x && c.at < r && r < c.at + c.d).length;
      s = live.reduce((b, x) => (open(x) < open(b) ? x : b));
      opened.push({ s, at: r, d: ev.d });
    } else if (t.algo === "weighted") {
      live.forEach((x) => (cw[x] += t.w[x]));
      s = live.reduce((b, x) => (cw[x] > cw[b] ? x : b));
      cw[s] -= live.reduce((a, x) => a + t.w[x], 0);
    } else s = live[ev.h % live.length];
    out.push(s);
    r++;
  }
  return out;
}

/** Every operation the board lets the player try: the request onto any server, and +w onto cw[] (weighted). */
const attempts = (m: LbMachine): LbAttempt[] => [...Array.from({ length: m.task.n }, (_, s) => ({ kind: "send" as const, s })), ...(m.task.algo === "weighted" ? [{ kind: "raise" as const }] : [])];
const right = (m: LbMachine, a: LbAttempt) => (next(m) === "raise" ? a.kind === "raise" : a.kind === "send" && a.s === choose(m));

test("the code's own operations send each request where a plain balancer does", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = lbRun(t);
    assert.deepEqual(sends(end), plain(t), `${where}: ${JSON.stringify(t)}`);
    assert.deepEqual(replay(t, ops), end, where);
    assert.ok(sends(end).every((s) => end.up[s] || t.events.some((ev) => ev.kind === "down" && ev.s === s)), where);
    // A full smooth weighted cycle gives each server exactly its weight.
    const reqs = t.events.filter((ev) => ev.kind === "req").length;
    const all = t.w.reduce((a, b) => a + b, 0);
    if (t.algo === "weighted" && reqs % all === 0) assert.deepEqual(end.sent, t.w.map((w) => (w * reqs) / all), where);
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<LbWhy>();
  for (const { t, where } of tasks().filter((_, i) => i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of lbRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    const c = checkOp(m, { kind: "send", s: 0 });
    assert.equal(c.ok, false);
    if (!c.ok) why.add(c.why);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beBalance.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: LbMachine, a: LbAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const req = (c: number, h = 10, d = 1): LbEvent => ({ kind: "req", c, h, d });
  const [RAISE, SEND] = [OPS.indexOf("raise"), OPS.indexOf("send")];
  // Round robin on A B C, C going down after two requests: the third skips C and wraps round to A.
  const rr: LbTask = { algo: "rr", n: 3, w: [1, 1, 1], events: [req(1), req(2), { kind: "down", s: 2 }, req(3)] };
  let m = startMachine(rr);
  assert.equal(say(m, { kind: "send", s: 1 }), `rrNext {"i":0,"s":"A"}`);
  m = replay(rr, [SEND, SEND]);
  assert.equal(logText(m.log.at(-1)!, rr), "server C is down");
  assert.equal(say(m, { kind: "send", s: 2 }), `isDown {"s":"C"}`);
  assert.equal(say(m, { kind: "send", s: 1 }), `rrNext {"i":2,"s":"A"}`);
  m = apply(m, SEND);
  assert.equal(logText(m.log.at(-1)!, rr), "client 3 → A; i = 1");
  assert.deepEqual(m.seen, ["skipDown", "wrap"]);
  assert.equal(say(m, { kind: "send", s: 0 }), "allDone {}");
  // Least connections on A B: the first request ties at 0 and stays open; the second goes to B, and ends at once.
  const least: LbTask = { algo: "least", n: 2, w: [1, 1], events: [req(1, 10, 3), req(2, 10, 1), req(3, 10, 2)] };
  m = startMachine(least);
  assert.equal(say(m, { kind: "send", s: 1 }), `tieLow {"s":"A","c":0}`);
  m = apply(m, SEND);
  assert.equal(say(m, { kind: "send", s: 0 }), `fewest {"s":"B","c":0}`);
  m = apply(m, SEND);
  assert.equal(logText(m.log.at(-1)!, least), "B: a connection ends; open = 0");
  assert.equal(choose(m), 1);
  // Smooth weighted round robin on A (2) and B (1): add the weights first, then the largest cw gives back the total.
  const wt: LbTask = { algo: "weighted", n: 2, w: [2, 1], events: [req(1), req(2), req(3)] };
  m = startMachine(wt);
  assert.equal(say(m, { kind: "send", s: 0 }), "raiseFirst {}");
  m = apply(m, RAISE);
  assert.equal(logText(m.log.at(-1)!, wt), "cw = [2, 1]");
  assert.equal(say(m, { kind: "raise" }), "raised {}");
  assert.equal(say(m, { kind: "send", s: 1 }), `maxCw {"s":"A","c":2}`);
  m = apply(m, SEND);
  assert.equal(logText(m.log.at(-1)!, wt), "client 1 → A; cw[A] = 2 − 3 = −1");
  const tie = apply(startMachine({ algo: "weighted", n: 2, w: [1, 1], events: [req(1)] }), RAISE);
  assert.equal(say(tie, { kind: "send", s: 1 }), `tieLow {"s":"A","c":1}`);
  // IP hash on A B C: client 5 hashes to 13, 13 mod 3 = 1 is B; with A down, 13 mod 2 = 1 is C.
  const hash: LbTask = { algo: "hash", n: 3, w: [1, 1, 1], events: [req(5, 13), { kind: "down", s: 0 }, req(5, 13)] };
  m = startMachine(hash);
  assert.equal(say(m, { kind: "send", s: 2 }), `modN {"h":13,"n":3,"i":1,"s":"B"}`);
  m = apply(m, SEND);
  assert.equal(logText(m.log.at(-2)!, hash), "client 5: 13 % 3 = 1 → B");
  assert.equal(say(m, { kind: "send", s: 1 }), `modN {"h":13,"n":2,"i":1,"s":"C"}`);
  assert.deepEqual(apply(m, SEND).seen, ["remapped"]);
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { end } = lbRun(t);
    if (t.algo === "rr") assert.ok(end.seen.includes("wrap"), where);
    if (t.algo === "least") assert.ok(end.log.some((l) => l.op === "close"), where);
    if (t.algo === "weighted") assert.ok(new Set(t.w).size > 1, where);
    if (t.algo === "hash") assert.ok(end.seen.includes("sticky") && new Set(sends(end)).size >= 3, where);
  }
  LB_LADDER.forEach((s, stage) => {
    const end = lbRun(lbNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    if (s.algo) assert.equal(end.task.algo, s.algo);
    assert.equal(end.task.n, s.n);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(LB_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(lbStars), [3, 2, 1, 1]);
  const end = lbRun(lbNow({ mode: "puzzle", stage: 4, level: 1, seed: 1 })).end;
  assert.deepEqual(end.seen, ["skipDown", "wrap"]);
  assert.equal(lbNotice(end, 0, 2), "skipDown");
  assert.equal(lbNotice(end, 1, 2), null);
  assert.equal(lbNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of lbRun(t).ops) {
      const pic = lbSvg(m, { hot: "s0", sel: "req" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const pair = next(m) === "raise" ? ["plus", "cw"] : ["req", `s${choose(m)}`];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(lbSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beBalance);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beBalance));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeBalance);
  }
  for (const algo of LB_ALGOS) assert.ok(en.live.beBalance.names[algo] && en.live.beBalance.hint[algo] && en.live.beBalance.right[algo].includes("{stars}"));
});
