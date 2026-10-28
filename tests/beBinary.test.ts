// Be the binary search: a player who makes the code's operations returns what a plain scan of the array gives, on every
// puzzle and endless task and in no more looks than halving allows; every other operation is refused with the rule it
// broke; the tasks are worth playing; and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, BIN_ALGOS, BIN_LADDER, binNotice, binNow, binRun, binStars, binSvg, checkOp, CODE, columns, expect as next, logText, replay, startMachine, type BinAttempt, type BinLevel, type BinMachine, type BinTask, type BinWhy } from "../src/math/beBinary.ts";

const tasks = (): { t: BinTask; where: string }[] => [
  ...BIN_LADDER.map((_, stage) => ({ t: binNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as BinLevel[]).flatMap((level) => Array.from({ length: 60 }, (_, i) => ({ t: binNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** What each search returns, by a plain scan: the index of x (−1), the first a[i] ≥ x, the first a[i] > x (n when none). */
function plain(t: BinTask): number {
  if (t.algo === "find") return t.a.indexOf(t.x);
  const i = t.a.findIndex((v) => (t.algo === "lower" ? v >= t.x : v > t.x));
  return i < 0 ? t.a.length : i;
}

/** Every operation the board lets the player try: a pointer onto any column, and anything into return. */
const attempts = (m: BinMachine): BinAttempt[] => [
  ...columns(m.task).flatMap((at) => (["mid", "lo", "hi"] as const).map((kind) => ({ kind, at }))),
  ...(["mid", "lo", "hi", "none"] as const).map((what) => ({ kind: "return" as const, what })),
];
function right(m: BinMachine, a: BinAttempt): boolean {
  const e = next(m);
  if (!e) return false;
  if (e.kind !== "return") return a.kind === e.kind && a.at === e.at;
  if (a.kind !== "return") return false;
  if (m.task.algo !== "find") return a.what === "lo" || a.what === "hi";
  return a.what === (e.v < 0 ? "none" : "mid");
}

test("the code's own operations return what a plain scan gives, in no more looks than halving allows", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = binRun(t);
    assert.equal(end.ret, plain(t), `${where}: ${JSON.stringify(t)}`);
    assert.ok(end.looks <= Math.floor(Math.log2(t.a.length)) + 1, where);
    assert.ok(t.a.every((v, i) => i === 0 || t.a[i - 1] <= v), where);
    if (t.algo === "find") assert.equal(new Set(t.a).size, t.a.length, where);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
    // Each round places mid inside the range, then moves one pointer: the range shrinks every time.
    let m = startMachine(t);
    for (const code of ops) {
      const before = m.hi - m.lo;
      m = apply(m, code);
      if (!m.placed && m.ret === null) assert.ok(m.hi - m.lo < before, where);
      if (m.placed) assert.ok(m.mid >= m.lo && m.mid <= m.hi, where);
    }
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<BinWhy>();
  for (const { t, where } of tasks().filter((_, i) => i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of binRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    assert.equal(checkOp(m, { kind: "return", what: "lo" }).ok, false);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beBinary.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: BinMachine, a: BinAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  // Find 17 in 3 5 8 11 14 17 20 23: lo = 0, hi = 7, mid = 3.
  const find: BinTask = { algo: "find", a: [3, 5, 8, 11, 14, 17, 20, 23], x: 17 };
  let m = startMachine(find);
  assert.equal(say(m, { kind: "mid", at: 4 }), `midRound {"lo":0,"hi":7,"m":3,"got":4}`);
  assert.equal(say(m, { kind: "mid", at: 1 }), `midWrong {"lo":0,"hi":7,"m":3,"got":1}`);
  assert.equal(say(m, { kind: "lo", at: 4 }), "midFirst {}");
  assert.equal(say(m, { kind: "return", what: "none" }), `returnEarly {"cond":"lo ≤ hi"}`);
  m = apply(m, 3);
  assert.equal(logText(m.log.at(-1)!), "mid = (0 + 7) // 2 = 3; a[3] = 11 < x = 17");
  assert.equal(say(m, { kind: "hi", at: 2 }), `goRight {"m":3,"v":11,"op":"<","x":17}`);
  assert.equal(say(m, { kind: "lo", at: 3 }), `past {"m":3,"v":11,"to":4}`);
  assert.equal(say(m, { kind: "lo", at: 6 }), `moveWrong {"p":"lo","expr":"mid + 1","to":4,"got":6}`);
  assert.equal(say(m, { kind: "mid", at: 5 }), `midAgain {"m":3}`);
  m = apply(m, 4);
  assert.equal(say(m, { kind: "mid", at: 8 }), `midOut {"lo":4,"hi":7,"m":5,"got":8}`);
  m = apply(m, 5);
  assert.equal(say(m, { kind: "lo", at: 6 }), `isX {"m":5,"v":17}`);
  assert.equal(say(m, { kind: "return", what: "none" }), `returnMid {"m":5}`);
  assert.equal(say(m, { kind: "return", what: "mid" }), "ok");
  // Find 4 there: hi drops below lo, and the code returns −1.
  const gone: BinTask = { ...find, x: 4 };
  let g = replay(gone, binRun(gone).ops.slice(0, -1));
  assert.equal(g.lo, 1);
  assert.equal(g.hi, 0);
  assert.equal(say(g, { kind: "mid", at: 0 }), `overNone {"lo":1,"hi":0}`);
  assert.equal(say(g, { kind: "return", what: "mid" }), `returnNone {"lo":1,"hi":0}`);
  g = replay(gone, [3]);
  assert.equal(say(g, { kind: "hi", at: 3 }), `dropMid {"m":3,"v":11,"to":2}`);
  assert.equal(say(g, { kind: "lo", at: 4 }), `goLeft {"m":3,"v":11,"op":">","x":4}`);
  assert.deepEqual(binRun(gone).end.seen, ["absent"]);
  // The lower bound of 6 in 2 6 6 6 9: hi = mid keeps a 6 that could be the first.
  const low: BinTask = { algo: "lower", a: [2, 6, 6, 6, 9], x: 6 };
  const l = replay(low, [2]);
  assert.equal(say(l, { kind: "hi", at: 1 }), `keepMid {"m":2,"v":6}`);
  assert.equal(say(l, { kind: "lo", at: 3 }), `goLeft {"m":2,"v":6,"op":"≥","x":6}`);
  const lowEnd = binRun(low);
  assert.equal(lowEnd.end.ret, 1);
  assert.deepEqual(lowEnd.end.seen, ["dupes"]);
  const lowLast = replay(low, lowEnd.ops.slice(0, -1));
  assert.equal(say(lowLast, { kind: "return", what: "mid" }), `returnLo {"lo":1}`);
  assert.equal(say(lowLast, { kind: "mid", at: 1 }), `overLo {"lo":1}`);
  assert.equal(say(lowLast, { kind: "return", what: "hi" }), "ok");
  assert.equal(logText(lowEnd.end.log.at(-1)!), "return lo = 1");
  // The upper bound moves lo past equal values: the first a[i] > 6 is 9, at 4; above every value, n.
  const up: BinTask = { algo: "upper", a: [2, 6, 6, 6, 9], x: 6 };
  assert.equal(say(replay(up, [2]), { kind: "hi", at: 2 }), `goRight {"m":2,"v":6,"op":"≤","x":6}`);
  assert.equal(binRun(up).end.ret, 4);
  assert.deepEqual(binRun({ ...up, x: 12 }).end.seen, ["pastEnd"]);
  // hi = n for the bounds, so mid on n is outside the range.
  assert.equal(say(startMachine({ algo: "lower", a: [1, 2], x: 2 }), { kind: "mid", at: 2 }), `midOut {"lo":0,"hi":2,"m":1,"got":2}`);
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { end } = binRun(t);
    assert.ok(end.looks >= (t.a.length <= 7 ? 2 : 3), where);
    if (t.algo === "find") assert.notEqual(t.a[(t.a.length - 1) >> 1], t.x, where);
  }
  const notices = [null, "absent", "dupes", "logn", "dupes", "pastEnd", "absent", "dupes"];
  BIN_LADDER.forEach((s, stage) => {
    const end = binRun(binNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    if (s.algo) assert.equal(end.task.algo, s.algo);
    if (notices[stage]) assert.equal(binNotice(end, 0, 1), notices[stage], `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(BIN_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(binStars), [3, 2, 1, 1]);
  const end = binRun({ algo: "find", a: [1, 3, 5, 7, 9], x: 4 }).end;
  assert.equal(binNotice(end, 0, 2), "absent");
  assert.equal(binNotice(end, 1, 2), null);
  assert.equal(binNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of binRun(t).ops) {
      const pic = binSvg(m, { hot: "c0", sel: "pmid" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const pair = e.kind === "return" ? [t.algo === "find" ? (e.v < 0 ? "none" : "pmid") : "plo", "ret"] : [`p${e.kind}`, `c${e.at}`];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(binSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null/.test(logText(l)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every search, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beBinary);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beBinary));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeBinary);
  }
  for (const algo of BIN_ALGOS) assert.ok(en.live.beBinary.names[algo] && en.live.beBinary.hint[algo]);
  for (const k of ["found", "absent", "lower", "upper"] as const) assert.ok(en.live.beBinary.right[k].includes("{stars}"));
});
