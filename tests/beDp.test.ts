// Be the DP: a player who makes the code's operations fills the table of every puzzle and endless task to what a plain
// implementation of each problem gives, every other operation is refused with the rule it broke, the tasks are worth
// playing, and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { answerCells, apply, bestOf, checkOp, CODE, DP_LADDER, DP_PROBLEMS, dpNotice, dpNow, dpRun, dpStars, dpSvg, expect as next, greedyCoins, logText, replay, startMachine, type DpArr, type DpAttempt, type DpLevel, type DpMachine, type DpTask, type DpWhy } from "../src/math/beDp.ts";

const tasks = (): { t: DpTask; where: string }[] => [
  ...DP_LADDER.map((_, stage) => ({ t: dpNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as DpLevel[]).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ t: dpNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** The answer each problem has, worked out the plain way (by brute force where that is short). */
function plain(t: DpTask): number {
  if (t.p === "stairs") {
    const ways = (n: number): number => (n === 0 ? 1 : t.a.filter((s) => s <= n).reduce((x, s) => x + ways(n - s), 0));
    return ways(t.k);
  }
  if (t.p === "robber") {
    let best = 0;
    for (let mask = 0; mask < 1 << t.a.length; mask++) if (!(mask & (mask >> 1))) best = Math.max(best, t.a.reduce((x, v, i) => x + (mask >> i & 1 ? v : 0), 0));
    return best;
  }
  if (t.p === "kadane") {
    let best = -Infinity;
    for (let i = 0; i < t.a.length; i++) for (let j = i; j < t.a.length; j++) best = Math.max(best, t.a.slice(i, j + 1).reduce((x, y) => x + y, 0));
    return best;
  }
  if (t.p === "coins") {
    // Breadth first over the amounts made: the first time k is reached is the fewest coins.
    for (let n = 0, made = new Set([0]); ; n++, made = new Set([...made].flatMap((x) => t.a.map((c) => x + c)).filter((x) => x <= t.k))) if (made.has(t.k)) return n;
  }
  const R = t.p === "lcs" ? t.s.length : t.g.length;
  const C = t.p === "lcs" ? t.t.length : t.g[0].length;
  if (t.p === "paths") {
    const choose = (n: number, k: number): number => (k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);
    return choose(R + C - 2, R - 1);
  }
  if (t.p === "minPath") {
    const cost = (i: number, j: number): number => t.g[i][j] + (i === R - 1 && j === C - 1 ? 0 : Math.min(i < R - 1 ? cost(i + 1, j) : Infinity, j < C - 1 ? cost(i, j + 1) : Infinity));
    return cost(0, 0);
  }
  // The longest common subsequence: every subsequence of a, the longest that is also one of b.
  const isSub = (x: string, y: string) => [...x].every(((k) => (ch: string) => (k = y.indexOf(ch, k) + 1) > 0)(0));
  let best = 0;
  for (let mask = 0; mask < 1 << R; mask++) {
    const sub = [...t.s].filter((_, i) => mask >> i & 1).join("");
    if (isSub(sub, t.t)) best = Math.max(best, sub.length);
  }
  return best;
}

/** Every operation the board lets the player try at this point: any cell into any slot shown, any result into any cell of the table, any cell into return. */
function attempts(m: DpMachine): DpAttempt[] {
  const e = next(m);
  const at = e && e.kind !== "answer" ? e.at : -1;
  const plan = e?.kind === "read" || e?.kind === "write" ? (e.kind === "write" ? e.plan : null) : null;
  const slots = e?.kind === "read" ? 4 : 1;
  const cands = plan?.cands.length ?? 3;
  const cells: [DpArr, number][] = [
    ...m.dp.map((_, k) => ["dp", k] as [DpArr, number]),
    ...(m.task.p === "lcs" ? [...[...m.task.s].map((_, k) => ["a", k]), ...[...m.task.t].map((_, k) => ["b", k])] : m.task.p === "minPath" ? m.dp.map((_, k) => ["g", k]) : m.task.p === "robber" || m.task.p === "kadane" ? m.task.a.map((_, k) => ["a", k]) : []) as [DpArr, number][],
  ];
  return [
    ...cells.flatMap(([arr, k]) => Array.from({ length: slots }, (_, s) => ({ kind: "read" as const, arr, at: k, k: s }))),
    ...(at >= 0 ? m.dp.flatMap((_, k) => Array.from({ length: cands }, (_, c) => ({ kind: "write" as const, k: c, at: k }))) : []),
    ...m.dp.map((_, k) => ({ kind: "answer" as const, at: k })),
  ];
}
/** Whether an attempt is one the code would make now. */
function right(m: DpMachine, a: DpAttempt): boolean {
  const e = next(m);
  if (!e) return false;
  if (e.kind === "read") return a.kind === "read" && a.k === e.k && a.arr === e.slot.arr && a.at === e.slot.at;
  if (e.kind === "write") return a.kind === "write" && a.at === e.at && bestOf(e.plan).includes(a.k);
  return a.kind === "answer" && e.cells.includes(a.at);
}

test("the code's own operations fill every table and return the answer a plain implementation gives", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = dpRun(t);
    assert.ok(end.dp.every((v) => v !== null), where);
    assert.equal(end.step, end.order.length, where);
    assert.equal(end.dp[end.answer], plain(t), `${where}: ${JSON.stringify(t)}`);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(next(end), null, where);
    // Every cell is filled once, by the loops in order, and the log has a line for each operation.
    assert.deepEqual(end.order, [...end.order].sort((x, y) => x - y), where);
    assert.equal(end.log.length, ops.length + 1, where);
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<DpWhy>();
  for (const { t, where } of tasks().filter((_, i) => i % 6 === 0)) {
    let m = startMachine(t);
    for (const code of dpRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where} step ${m.log.length}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.deepEqual(apply(m, c.code).dp, apply(m, code).dp, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    // The run is over: the board stops asking, and the machine says there is nothing more.
    assert.equal(checkOp(m, { kind: "answer", at: 0 }).ok, false);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beDp.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: DpMachine, a: DpAttempt) => {
    const c = checkOp(m, a);
    assert.equal(c.ok, false);
    return c.ok ? "" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  // House robber on 2 7 9 3 1: the base is dp[0] = 2, dp[1] = 7, and i starts at 2.
  const rob: DpTask = { p: "robber", a: [2, 7, 9, 3, 1], k: 0, g: [], s: "", t: "" };
  let m = startMachine(rob);
  assert.deepEqual(m.dp, [2, 7, null, null, null]);
  assert.equal(say(m, { kind: "read", arr: "dp", at: 0, k: 0 }), `index {"slot":"dp[i−1]","at":"i = 2","want":"dp[1]","got":"dp[0]"}`);
  assert.equal(say(m, { kind: "read", arr: "a", at: 1, k: 0 }), `array {"slot":"dp[i−1]","arr":"dp","got":"a"}`);
  assert.equal(say(m, { kind: "read", arr: "dp", at: 3, k: 0 }), `empty {"x":"dp[3]"}`);
  assert.equal(say(m, { kind: "read", arr: "dp", at: 0, k: 1 }), `order {"want":"dp[i−1]"}`);
  assert.equal(say(m, { kind: "write", k: 1, at: 2 }), `readFirst {"want":"dp[i−1]"}`);
  assert.equal(say(m, { kind: "answer", at: 4 }), `notFull {"x":"dp[2]"}`);
  m = [0, 0, 0].reduce(apply, m);
  assert.equal(say(m, { kind: "read", arr: "a", at: 2, k: 2 }), `allRead {"x":"dp[2]"}`);
  assert.equal(say(m, { kind: "write", k: 0, at: 2 }), `max {"a":"11","b":"7"}`);
  assert.equal(say(m, { kind: "write", k: 1, at: 3 }), `here {"want":"dp[2]","at":"i = 2","got":"dp[3]"}`);
  m = apply(m, 1);
  assert.equal(logText(m.log.at(-1)!, rob), "dp[2] = max(7, 2 + 9) = 11; i = 3");
  const robEnd = dpRun(rob).end;
  assert.deepEqual(robEnd.dp, [2, 7, 11, 11, 12]);
  // Kadane on −2 4 −1 3 −6: the best run, 4 −1 3 = 6, ends at index 3, not at the end.
  const kad: DpTask = { p: "kadane", a: [-2, 4, -1, 3, -6], k: 0, g: [], s: "", t: "" };
  const full = replay(kad, dpRun(kad).ops.slice(0, -1));
  assert.deepEqual(full.dp, [-2, 4, 3, 6, 0]);
  assert.equal(say(full, { kind: "answer", at: 4 }), `answerMax {"v":"6","want":"dp[3]","got":"dp[4]"}`);
  assert.equal(say(full, { kind: "read", arr: "a", at: 0, k: 0 }), "full {}");
  assert.equal(logText(full.log[3], kad), "dp[1] = max(4 + 0, 4 + (−2)) = 4; i = 2");
  assert.deepEqual(apply(full, 3).seen, ["notLast"]);
  // Coins 1 3 4 making 6: min keeps 3 + 3, two coins, where the biggest coin first takes three.
  const coins: DpTask = { p: "coins", a: [1, 3, 4], k: 6, g: [], s: "", t: "" };
  const c6 = replay(coins, dpRun(coins).ops.slice(0, -2));
  assert.deepEqual(next(c6)?.kind, "write");
  assert.equal(say(c6, { kind: "write", k: 2, at: 6 }), `min {"a":"2","b":"3"}`);
  assert.equal(greedyCoins([1, 3, 4], 6), 3);
  assert.deepEqual(dpRun(coins).end.seen, ["greedy"]);
  // The longest common subsequence of ABC and AC: a 2-D table, its answer at dp[3][2], the diagonal on equal letters.
  const lcs: DpTask = { p: "lcs", a: [], k: 0, g: [], s: "ABC", t: "AC" };
  const l = dpRun(lcs);
  assert.deepEqual(l.end.dp, [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 2]);
  const lm = replay(lcs, l.ops.slice(0, -1));
  assert.equal(say(lm, { kind: "answer", at: 10 }), `answerAt {"ret":"dp[n][m]","want":"dp[3][2]","got":"dp[3][1]"}`);
  assert.equal(say(startMachine(lcs), { kind: "read", arr: "b", at: 0, k: 0 }), `array {"slot":"a[i−1]","arr":"a","got":"b"}`);
  assert.deepEqual(l.end.seen, ["diagonal"]);
  assert.equal(logText(l.end.log[1], lcs), "a[i−1] → a[0] = A");
  assert.equal(logText(l.end.log.at(-1)!, lcs), "return dp[3][2]  # 2");
  // Climbing five stairs a step of one or two at a time: the Fibonacci numbers.
  const st = dpRun({ p: "stairs", a: [1, 2], k: 5, g: [], s: "", t: "" }).end;
  assert.deepEqual(st.dp, [1, 1, 2, 3, 5, 8]);
  assert.deepEqual(st.seen, ["fib"]);
  // A cheapest path's first row reads the cell to the left only, and its first column the one above.
  const mp: DpTask = { p: "minPath", a: [], k: 0, g: [[1, 3, 1], [1, 5, 1], [4, 2, 1]], s: "", t: "" };
  const mpEnd = dpRun(mp).end;
  assert.deepEqual(mpEnd.dp, [1, 4, 5, 2, 7, 6, 6, 8, 7]);
  assert.deepEqual(answerCells(mpEnd), [8]);
});

test("the tasks are worth playing: more than one result wins, the ladder shows what it should, and none is too long", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = dpRun(t);
    assert.ok(ops.length <= 45, `${where}: ${ops.length} operations`);
    if (t.p !== "stairs" && t.p !== "paths") assert.ok(new Set(end.won).size >= 2, where);
    if (t.p === "lcs") assert.ok(end.dp[end.answer]! >= 2, where);
  }
  DP_LADDER.forEach((s, stage) => {
    const end = dpRun(dpNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    assert.equal(end.task.p, s.p);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  // Every problem turns up in the endless run, and the levels grow.
  const seen = new Set(tasks().map(({ t }) => t.p));
  assert.deepEqual([...seen].sort(), [...DP_PROBLEMS].sort());
  const mean = (level: DpLevel) => tasks().filter(({ where }) => where.startsWith(`level ${level}`)).reduce((x, { t }) => x + dpRun(t).ops.length, 0) / 40;
  assert.ok(mean(1) < mean(2) + 3 && mean(2) < mean(3));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 5].map(dpStars), [3, 2, 1, 1]);
  const end = dpRun({ p: "stairs", a: [1, 2], k: 5, g: [], s: "", t: "" }).end;
  assert.equal(dpNotice(end, 0, 3), "fib");
  assert.equal(dpNotice(end, 1, 3), null);
  assert.equal(dpNotice(end, 2, 10), "streak10");
  assert.equal(dpNotice(dpRun({ p: "paths", a: [], k: 0, g: [[0, 0, 0], [0, 0, 0]], s: "", t: "" }).end, 0, 1), null);
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i % 5 === 0)) {
    let m = startMachine(t);
    for (const code of dpRun(t).ops) {
      const pic = dpSvg(m, { hot: "s0", sel: "d0" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      const ids = new Set(pic.spots.map((s) => s.id));
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const pair =
        e.kind === "read" ? [`${e.slot.arr === "dp" ? "d" : e.slot.arr}${e.slot.at}`, `s${e.k}`]
        : e.kind === "write" ? [`k${code}`, `d${e.at}`]
        : [`d${code}`, "ans"];
      for (const id of pair) assert.ok(ids.has(id), `${where}: ${id} for ${e.kind}`);
      assert.ok(pic.spots.find((s) => s.id === pair[0])!.from && pic.spots.find((s) => s.id === pair[1])!.to, where);
      m = apply(m, code);
    }
    const last = dpSvg(m, { finished: true });
    assert.ok(!/NaN|undefined|null/.test(last.body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.p][i]), where);
  }
});

test("the words: every problem, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beDp);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beDp));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeDp);
  }
  for (const p of DP_PROBLEMS) assert.ok(en.live.beDp.names[p] && en.live.beDp.ask[p] && en.live.beDp.right[p].includes("{stars}"));
});
