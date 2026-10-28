// Be the sliding window: a player who makes the code's operations returns what brute force over every window gives, on
// every puzzle and endless task, each cell entering and leaving once; every other operation is refused with the rule it
// broke; the tasks are worth playing; and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, checkOp, CODE, expect as next, logText, OPS, replay, startMachine, WIN_ALGOS, WIN_LADDER, winNotice, winNow, winRun, winStars, winSvg, type WinAttempt, type WinLevel, type WinMachine, type WinTask, type WinWhy } from "../src/math/beWindow.ts";

const tasks = (): { t: WinTask; where: string }[] => [
  ...WIN_LADDER.map((_, stage) => ({ t: winNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as WinLevel[]).flatMap((level) => Array.from({ length: 60 }, (_, i) => ({ t: winNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** The answer by brute force over every window a[l..r]. */
function plain(t: WinTask): number {
  const n = t.a.length;
  let best = t.algo === "fixed" ? -Infinity : 0;
  for (let l = 0; l < n; l++)
    for (let r = l; r < n; r++) {
      const w = t.a.slice(l, r + 1);
      const s = w.reduce((x, y) => x + y, 0);
      if (t.algo === "fixed" && w.length === t.k) best = Math.max(best, s);
      if (t.algo === "atMost" && s <= t.k) best = Math.max(best, w.length);
      if (t.algo === "unique" && new Set(w).size === w.length) best = Math.max(best, w.length);
    }
  return best;
}

/** Every operation the board lets the player try: either edge onto any column, the value into best, best or the value into return. */
const attempts = (m: WinMachine): WinAttempt[] => [
  ...(["l", "r"] as const).flatMap((p) => Array.from({ length: m.task.a.length + 1 }, (_, x) => ({ kind: "move" as const, p, to: x - 1 }))),
  { kind: "best" },
  { kind: "return", what: "best" },
  { kind: "return", what: "value" },
];
function right(m: WinMachine, a: WinAttempt): boolean {
  const e = next(m);
  if (e === "R" || e === "L") return a.kind === "move" && a.p === (e === "R" ? "r" : "l") && a.to === (e === "R" ? m.r + 1 : m.l + 1);
  if (e === "best") return a.kind === "best";
  return e === "return" && a.kind === "return" && a.what === "best";
}

test("the code's own operations return what brute force over every window gives, each cell entering once and leaving at most once", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = winRun(t);
    const n = t.a.length;
    assert.equal(end.ret, plain(t), `${where}: ${JSON.stringify(t)}`);
    assert.equal(ops.filter((c) => OPS[c] === "R").length, n, where);
    assert.ok(ops.filter((c) => OPS[c] === "L").length <= n, where);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
    // The window keeps its rule after every shrink is done: k wide, s ≤ S, no letter twice.
    let m = startMachine(t);
    for (const code of ops) {
      m = apply(m, code);
      if (next(m) === "L") continue;
      const w = t.a.slice(m.l, m.r + 1);
      assert.equal(m.s, w.reduce((x, y) => x + y, 0), where);
      if (t.algo === "fixed") assert.ok(w.length <= t.k, where);
      if (t.algo === "atMost") assert.ok(m.s <= t.k, where);
      if (t.algo === "unique") assert.equal(new Set(w).size, w.length, where);
    }
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<WinWhy>();
  for (const { t, where } of tasks().filter((_, i) => i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of winRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    assert.equal(checkOp(m, { kind: "return", what: "best" }).ok, false);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beWindow.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: WinMachine, a: WinAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const R = OPS.indexOf("R");
  const L = OPS.indexOf("L");
  const B = OPS.indexOf("best");
  // The largest sum of 3 in a row of 2 1 5 1 3 2: the first full window is 8, then 7, 9, 6.
  const fx: WinTask = { algo: "fixed", a: [2, 1, 5, 1, 3, 2], k: 3 };
  let m = startMachine(fx);
  assert.equal(say(m, { kind: "move", p: "r", to: 1 }), `oneStep {"p":"r","to":0,"got":1}`);
  assert.equal(say(m, { kind: "move", p: "l", to: 1 }), `keepK {"size":0,"k":3}`);
  m = [R, R].reduce(apply, m);
  assert.equal(say(m, { kind: "best" }), `notFull {"size":2,"k":3}`);
  m = apply(m, R);
  assert.equal(say(m, { kind: "move", p: "r", to: 3 }), `bestFirst {"what":"s","v":8,"best":"−∞"}`);
  m = apply(m, B);
  assert.equal(logText(m.log.at(-1)!, fx), "best = max(−∞, 8) = 8");
  assert.equal(say(m, { kind: "best" }), `bestNot {"what":"s","v":8,"best":"8"}`);
  m = apply(m, R);
  assert.equal(logText(m.log.at(-1)!, fx), "r = 3; s = 8 + 1 = 9");
  assert.equal(say(m, { kind: "move", p: "r", to: 4 }), `tooWide {"size":4,"k":3,"v":2}`);
  assert.equal(say(m, { kind: "best" }), `tooWide {"size":4,"k":3,"v":2}`);
  m = apply(m, L);
  assert.equal(logText(m.log.at(-1)!, fx), "s = 9 − 2 = 7; l = 1");
  assert.equal(say(m, { kind: "return", what: "best" }), `returnEarly {"r":3}`);
  assert.equal(winRun(fx).end.ret, 9);
  const fxLast = replay(fx, winRun(fx).ops.slice(0, -1));
  assert.equal(say(fxLast, { kind: "move", p: "r", to: 6 }), `atEnd {"best":"9"}`);
  assert.equal(say(fxLast, { kind: "return", what: "value" }), `returnWhat {"best":"9"}`);
  // The longest run with sum ≤ 6 in 3 1 2 4 1: 3 1 2 fits, then 4 pushes s to 10.
  const am: WinTask = { algo: "atMost", a: [3, 1, 2, 4, 1], k: 6 };
  let a = replay(am, [R, B, R, B, R, B, R]);
  assert.equal(say(a, { kind: "move", p: "r", to: 4 }), `overS {"s":10,"S":6}`);
  assert.equal(say(a, { kind: "best" }), `overS {"s":10,"S":6}`);
  a = [L, L].reduce(apply, a);
  assert.deepEqual(a.seen, ["shrinkMany"]);
  assert.equal(say(a, { kind: "move", p: "l", to: 3 }), `fits {"s":6,"S":6}`);
  assert.equal(winRun(am).end.ret, 3);
  // The longest stretch without a repeat in ABCA: when the next letter is A, l moves past the first A.
  const un: WinTask = { algo: "unique", a: [0, 1, 2, 0], k: 0 };
  const u = replay(un, [R, B, R, B, R, B]);
  assert.equal(say(u, { kind: "move", p: "r", to: 3 }), `repeatIn {"c":"A","at":0}`);
  assert.equal(say(replay(un, [R, B]), { kind: "move", p: "l", to: 1 }), `noRepeat {"c":"B"}`);
  assert.equal(logText(apply(u, L).log.at(-1)!, un), "A leaves; l = 1");
  assert.equal(logText(u.log[5], un), "r = 2; window = ABC");
  assert.equal(winRun(un).end.ret, 3);
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops } = winRun(t);
    assert.ok(ops.filter((c) => OPS[c] === "best").length >= 2, where);
    if (t.algo !== "fixed") assert.ok(ops.filter((c) => OPS[c] === "L").length >= 2, where);
  }
  WIN_LADDER.forEach((s, stage) => {
    const end = winRun(winNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(WIN_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(winStars), [3, 2, 1, 1]);
  const end = winRun({ algo: "fixed", a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1], k: 3 }).end;
  assert.deepEqual(end.seen, ["slide", "linear"]);
  assert.equal(winNotice(end, 0, 2), "slide");
  assert.equal(winNotice(end, 1, 2), null);
  assert.equal(winNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of winRun(t).ops) {
      const pic = winSvg(m, { hot: "c0", sel: "pr" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const pair = e === "R" ? ["pr", `c${m.r + 1}`] : e === "L" ? ["pl", `c${m.l + 1}`] : e === "best" ? ["val", "best"] : ["best", "ret"];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(winSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beWindow);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beWindow));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeWindow);
  }
  for (const algo of WIN_ALGOS) assert.ok(en.live.beWindow.names[algo] && en.live.beWindow.hint[algo] && en.live.beWindow.right[algo].includes("{stars}"));
});
