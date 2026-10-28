// Be the two pointers: a player who makes the code's operations returns what brute force gives, on every puzzle and
// endless task, in one pass; every other operation is refused with the rule it broke; the tasks are worth playing; and
// the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, checkOp, CODE, expect as next, logText, OPS, PTR_ALGOS, PTR_LADDER, ptrNotice, ptrNow, ptrRun, ptrStars, ptrSvg, replay, startMachine, type PtrAttempt, type PtrLevel, type PtrMachine, type PtrTask, type PtrWhy } from "../src/math/bePointers.ts";

const tasks = (): { t: PtrTask; where: string }[] => [
  ...PTR_LADDER.map((_, stage) => ({ t: ptrNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as PtrLevel[]).flatMap((level) => Array.from({ length: 60 }, (_, i) => ({ t: ptrNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];
const pairs = (n: number) => Array.from({ length: n }, (_, i) => Array.from({ length: n - i - 1 }, (_, d) => [i, i + d + 1] as const)).flat();

/** Every operation the board lets the player try in this game: its pointers onto any column, a cell onto a cell, the area into best, its chips into return. */
function attempts(m: PtrMachine): PtrAttempt[] {
  const { algo } = m.task;
  const cols = Array.from({ length: m.w.length + (algo === "dedupe" ? 1 : 0) }, (_, x) => x);
  const ptrs = algo === "dedupe" ? (["i", "k"] as const) : (["i", "j"] as const);
  return [
    ...ptrs.flatMap((p) => cols.map((to) => ({ kind: "move" as const, p, to }))),
    ...(algo === "dedupe" ? cols.flatMap((from) => cols.map((to) => ({ kind: "write" as const, from, to }))) : []),
    ...(algo === "water" ? [{ kind: "best" as const }] : []),
    ...(["pair", algo === "pairSum" ? "none" : algo === "water" ? "best" : "k"] as const).map((what) => ({ kind: "return" as const, what })),
  ];
}
function right(m: PtrMachine, a: PtrAttempt): boolean {
  const e = next(m);
  if (e === "i" || e === "j") return a.kind === "move" && a.p === e && a.to === (e === "i" ? m.i + 1 : m.j - 1);
  if (e === "best") return a.kind === "best";
  if (e === "write") return a.kind === "write" && a.from === m.i && a.to === m.k;
  if (e !== "return" || a.kind !== "return") return false;
  const { algo } = m.task;
  return a.what === (algo === "dedupe" ? "k" : algo === "water" ? "best" : m.i < m.j ? "pair" : "none");
}

test("the code's own operations return what brute force gives, each pointer passing each cell once", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = ptrRun(t);
    const n = t.a.length;
    if (t.algo === "pairSum") {
      const any = pairs(n).some(([i, j]) => t.a[i] + t.a[j] === t.t);
      assert.equal(end.ret! >= 0, any, where);
      if (end.ret! >= 0) assert.ok(end.i < end.j && t.a[end.i] + t.a[end.j] === t.t, where);
      assert.ok(ops.length <= n, where);
    } else if (t.algo === "water") {
      assert.equal(end.ret, Math.max(...pairs(n).map(([i, j]) => (j - i) * Math.min(t.a[i], t.a[j]))), where);
      assert.equal(ops.filter((c) => OPS[c] === "i" || OPS[c] === "j").length, n - 1, where);
    } else {
      const kept = [...new Set(t.a)];
      assert.equal(end.ret, kept.length, where);
      assert.deepEqual(end.w.slice(0, end.k), kept, where);
      assert.equal(ops.length, n - 1 + kept.length, where);
    }
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<PtrWhy>();
  // Every third task, and puzzle 2, where no pair adds up.
  for (const { t, where } of tasks().filter((_, i) => i % 3 === 0 || i === 1)) {
    let m = startMachine(t);
    for (const code of ptrRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    assert.equal(checkOp(m, { kind: "return", what: "k" }).ok, false);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.bePointers.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: PtrMachine, a: PtrAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  // A pair adding to 13 in 1 3 4 6 9 11: 1 + 11 = 12 is too small, so i moves; 3 + 11 = 14 too big, so j moves.
  const ps: PtrTask = { algo: "pairSum", a: [1, 3, 4, 6, 9, 11], t: 13 };
  let m = startMachine(ps);
  assert.equal(say(m, { kind: "move", p: "j", to: 4 }), `sumSmall {"s":12,"t":13}`);
  assert.equal(say(m, { kind: "move", p: "i", to: 2 }), `oneStep {"p":"i","to":1,"got":2,"d":"+"}`);
  assert.equal(say(m, { kind: "return", what: "pair" }), `notYetPair {"s":12,"t":13}`);
  assert.equal(say(m, { kind: "return", what: "none" }), `noneEarly {"i":0,"j":5}`);
  m = apply(m, 0);
  assert.equal(logText(m.log.at(-1)!), "s = 1 + 11 = 12 < 13; i = 1");
  assert.equal(say(m, { kind: "move", p: "i", to: 2 }), `sumBig {"s":14,"t":13}`);
  m = [1, 0].reduce(apply, m);
  assert.equal(m.i + m.j, 6);
  assert.equal(say(m, { kind: "move", p: "i", to: 3 }), `sumHit {"s":13,"t":13}`);
  assert.equal(say(m, { kind: "return", what: "none" }), `returnWhat {"what":"(i, j) = (2, 4)"}`);
  m = apply(m, OPS.indexOf("return"));
  assert.equal(logText(m.log.at(-1)!), "s = 4 + 9 == 13: return (2, 4)");
  // No pair adds to 8 in 1 3 4 6: i and j meet.
  const none: PtrTask = { algo: "pairSum", a: [1, 3, 4, 6], t: 8 };
  const met = replay(none, ptrRun(none).ops.slice(0, -1));
  assert.equal(say(met, { kind: "move", p: "j", to: 1 }), `metNone {"t":8}`);
  assert.equal(say(met, { kind: "return", what: "pair" }), `returnWhat {"what":"−1"}`);
  assert.deepEqual(ptrRun(none).end.seen, ["noPair"]);
  // The water on 1 8 6 2 5 4 8 3 7: 49 at the end; the shorter side moves, a tie moves j.
  const water: PtrTask = { algo: "water", a: [1, 8, 6, 2, 5, 4, 8, 3, 7], t: 0 };
  let wm = startMachine(water);
  assert.equal(say(wm, { kind: "move", p: "i", to: 1 }), `bestFirst {"w":8,"h":1,"area":8,"best":0}`);
  wm = apply(wm, OPS.indexOf("best"));
  assert.equal(logText(wm.log.at(-1)!), "best = max(0, 8 × 1) = 8");
  assert.equal(say(wm, { kind: "best" }), `bestNot {"area":8,"best":8}`);
  assert.equal(say(wm, { kind: "move", p: "j", to: 7 }), `shorter {"p":"i","s":0,"h":1,"o":8,"g":7}`);
  assert.equal(say(wm, { kind: "return", what: "best" }), `returnEarly {"cond":"i = 0 < j = 8"}`);
  assert.equal(ptrRun(water).end.ret, 49);
  const tie: PtrTask = { algo: "water", a: [3, 1, 3], t: 0 };
  const tm = replay(tie, [OPS.indexOf("best")]);
  assert.equal(say(tm, { kind: "move", p: "i", to: 1 }), `tieJ {"h":3}`);
  const tieEnd = ptrRun(tie);
  assert.deepEqual(tieEnd.end.seen, ["tie"]);
  const tieLast = replay(tie, tieEnd.ops.slice(0, -1));
  assert.equal(say(tieLast, { kind: "best" }), `waterEnd {"best":6}`);
  assert.equal(say(tieLast, { kind: "return", what: "pair" }), `returnWhat {"what":"best = 6"}`);
  // Repeats out of 1 1 2 2 2 3: i reads, k writes.
  const dd: PtrTask = { algo: "dedupe", a: [1, 1, 2, 2, 2, 3], t: 0 };
  let dm = startMachine(dd);
  assert.equal(say(dm, { kind: "write", from: 1, to: 1 }), `repeat {"v":1,"k1":0}`);
  dm = apply(dm, OPS.indexOf("i"));
  assert.equal(logText(dm.log.at(-1)!), "a[1] = 1 repeats; i = 2");
  assert.equal(say(dm, { kind: "move", p: "i", to: 3 }), `newValue {"v":2,"u":1,"k":1}`);
  assert.equal(say(dm, { kind: "write", from: 3, to: 1 }), `writeFrom {"i":2,"got":3}`);
  assert.equal(say(dm, { kind: "write", from: 2, to: 2 }), `writeAt {"k":1,"got":2}`);
  assert.equal(say(dm, { kind: "move", p: "k", to: 2 }), "kMoves {}");
  dm = apply(dm, OPS.indexOf("write"));
  assert.equal(logText(dm.log.at(-1)!), "a[1] = a[2] = 2; k = 2");
  assert.deepEqual(dm.w, [1, 2, 2, 2, 2, 3]);
  const ddEnd = ptrRun(dd);
  assert.deepEqual(ddEnd.end.w.slice(0, 3), [1, 2, 3]);
  assert.deepEqual(ddEnd.end.seen, ["inPlace"]);
  const ddLast = replay(dd, ddEnd.ops.slice(0, -1));
  assert.equal(say(ddLast, { kind: "move", p: "i", to: 7 }), `dedupeEnd {"k":3}`);
  assert.equal(say(ddLast, { kind: "write", from: 5, to: 3 }), `dedupeEnd {"k":3}`);
  assert.equal(say(ddLast, { kind: "return", what: "pair" }), `returnWhat {"what":"k = 3"}`);
  assert.equal(logText(ddEnd.end.log.at(-1)!), "return k = 3");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = ptrRun(t);
    if (t.algo !== "dedupe") assert.ok(ops.includes(0) && ops.includes(1), where);
    if (t.algo === "pairSum") assert.ok(ops.length > t.a.length / 2, where);
    if (t.algo === "water") assert.ok(ops.filter((c) => OPS[c] === "best").length >= 2, where);
    if (t.algo === "dedupe") assert.ok(t.a.length - end.k >= 2 && end.k >= 3, where);
  }
  PTR_LADDER.forEach((s, stage) => {
    const end = ptrRun(ptrNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(PTR_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(ptrStars), [3, 2, 1, 1]);
  const end = ptrRun({ algo: "pairSum", a: [1, 3, 4, 6], t: 8 }).end;
  assert.equal(ptrNotice(end, 0, 2), "noPair");
  assert.equal(ptrNotice(end, 1, 2), null);
  assert.equal(ptrNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of ptrRun(t).ops) {
      const pic = ptrSvg(m, { hot: "c0", sel: "pi" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const pair =
        e === "i" ? ["pi", `c${m.i + 1}`]
        : e === "j" ? ["pj", `c${m.j - 1}`]
        : e === "best" ? ["area", "best"]
        : e === "write" ? [`c${m.i}`, `c${m.k}`]
        : [t.algo === "dedupe" ? "pk" : t.algo === "water" ? "best" : m.i < m.j ? "pi" : "none", "ret"];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(ptrSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null/.test(logText(l)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.bePointers);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.bePointers));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBePointers);
  }
  for (const algo of PTR_ALGOS) assert.ok(en.live.bePointers.names[algo] && en.live.bePointers.hint[algo]);
  for (const k of ["found", "none", "water", "dedupe"] as const) assert.ok(en.live.bePointers.right[k].includes("{stars}"));
});
