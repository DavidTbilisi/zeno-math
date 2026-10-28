// Be the backtracking: a player who makes the code's operations records just what brute force over every choice finds,
// on every puzzle and endless task, each push undone by a pop; every other operation is refused with the rule it broke;
// the tasks are worth playing; and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, attacker, BT_ALGOS, BT_LADDER, btNotice, btNow, btRun, btStars, btSvg, checkOp, CODE, expect as next, logText, nextChoice, OPS, replay, startMachine, sumOf, type BtAttempt, type BtLevel, type BtMachine, type BtTask, type BtWhy } from "../src/math/beBacktrack.ts";

const tasks = (): { t: BtTask; where: string }[] => [
  ...BT_LADDER.map((_, stage) => ({ t: btNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as BtLevel[]).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ t: btNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** Every answer by brute force, as lists of indexes into a: every subset of the indexes, or every order, kept if it is one. */
function plain(t: BtTask): number[][] {
  const n = t.a.length;
  const subsets = Array.from({ length: 2 ** n }, (_, mask) => [...Array(n).keys()].filter((i) => mask & (1 << i)));
  const orders = (xs: number[]): number[][] => (xs.length ? xs.flatMap((x) => orders(xs.filter((y) => y !== x)).map((o) => [x, ...o])) : [[]]);
  if (t.algo === "subsets") return subsets;
  if (t.algo === "combos") return subsets.filter((s) => s.length === t.k);
  if (t.algo === "sum") return subsets.filter((s) => s.reduce((x, i) => x + t.a[i], 0) === t.k);
  const all = orders([...Array(n).keys()]);
  return t.algo === "perms" ? all : all.filter((p) => p.every((c, r) => p.every((c2, r2) => r2 === r || Math.abs(c - c2) !== Math.abs(r - r2))));
}
const sorted = (xs: number[][]) => xs.map((x) => x.join()).sort();

/** Every operation the board lets the player try: each choice pushed (a queen onto each row), pop, record, return. */
const attempts = (m: BtMachine): BtAttempt[] => [
  ...m.task.a.flatMap((_, i) => (m.task.algo === "queens" ? m.task.a.map((_, row) => ({ kind: "push" as const, i, row })) : [{ kind: "push" as const, i }])),
  { kind: "pop" },
  { kind: "record" },
  { kind: "return" },
];
function right(m: BtMachine, a: BtAttempt): boolean {
  const e = next(m);
  if (e === "push") return a.kind === "push" && a.i === nextChoice(m) && (a.row === undefined || a.row === m.path.length);
  return a.kind === e;
}

test("the code's own operations record just what brute force finds, each push undone by a pop, the path always one that may lead somewhere", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = btRun(t);
    assert.deepEqual(sorted(end.res), sorted(plain(t)), `${where}: ${JSON.stringify(t)}`);
    assert.equal(end.ret, end.res.length, where);
    assert.equal(ops.filter((c) => OPS[c] === "push").length, ops.filter((c) => OPS[c] === "pop").length, where);
    assert.deepEqual(end.path, [], where);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
    let m = startMachine(t);
    for (const code of ops) {
      m = apply(m, code);
      assert.equal(m.frames.length, m.path.length + 1, where);
      if (t.algo === "perms") assert.equal(new Set(m.path).size, m.path.length, where);
      else if (t.algo === "queens") m.path.forEach((c, r) => assert.equal(attacker(m.path.slice(0, r), c), null, where));
      else assert.ok(m.path.every((i, x) => x === 0 || i > m.path[x - 1]), where);
      if (t.algo === "sum") assert.ok(sumOf(m) <= t.k, where);
      if (t.algo === "combos") assert.ok(m.path.length <= t.k, where);
    }
  }
});

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<BtWhy>();
  for (const { t, where } of tasks().filter((_, i) => i < BT_LADDER.length || i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of btRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
    assert.equal(checkOp(m, { kind: "return" }).ok, false);
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beBacktrack.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: BtMachine, a: BtAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const [P, O, R] = (["push", "pop", "record"] as const).map((op) => OPS.indexOf(op));
  // The subsets of A B C: the empty path is recorded first, then A, AB, ABC, and back up.
  const ss: BtTask = { algo: "subsets", a: [0, 1, 2], k: 0 };
  let m = startMachine(ss);
  assert.equal(say(m, { kind: "push", i: 0 }), `recordFirst {"path":"[]"}`);
  m = [R, P].reduce(apply, m);
  assert.equal(logText(m.log.at(-1)!, ss), "path.append(A) → [A]");
  assert.equal(say(m, { kind: "record" }), "ok");
  m = [R, P, R, P, R].reduce(apply, m);
  assert.equal(say(m, { kind: "record" }), `recorded {"path":"[A, B, C]"}`);
  assert.equal(say(m, { kind: "push", i: 0 }), `nothingLeft {"d":3}`);
  m = apply(m, O);
  assert.equal(logText(m.log.at(-1)!, ss), "path.pop() → [A, B]");
  m = apply(m, O);
  assert.equal(say(m, { kind: "push", i: 1 }), `tried {"c":"B","i":2}`);
  assert.equal(say(m, { kind: "push", i: 0 }), `before {"c":"A","start":1}`);
  assert.equal(say(m, { kind: "pop" }), `popEarly {"c":"C","i":2}`);
  assert.equal(say(m, { kind: "return" }), `returnEarly {"d":1}`);
  assert.equal(btRun(ss).end.ret, 8);
  // The orders of A B C: used letters are skipped, a full path is recorded and popped.
  const pm: BtTask = { algo: "perms", a: [0, 1, 2], k: 0 };
  let p = replay(pm, [P]);
  assert.equal(say(p, { kind: "push", i: 0 }), `used {"c":"A","i":0}`);
  assert.equal(say(p, { kind: "push", i: 2 }), `order {"c":"B","i":1}`);
  assert.equal(say(p, { kind: "record" }), `notFull {"d":1,"n":3}`);
  p = [P, P].reduce(apply, p);
  assert.equal(say(p, { kind: "push", i: 0 }), `recordFirst {"path":"[A, B, C]"}`);
  p = apply(p, R);
  assert.equal(logText(p.log.at(-1)!, pm), "res.append([A, B, C]); 1 found");
  assert.equal(say(p, { kind: "push", i: 0 }), `full {"path":"[A, B, C]"}`);
  // Sets of 2 3 5 6 adding up to 8: 2 + 3 + 5 and 2 + 5 + 6 are over, so the loops break; 2 + 6 and 3 + 5 are found.
  const sm: BtTask = { algo: "sum", a: [2, 3, 5, 6], k: 8 };
  let s = replay(sm, [P, P]);
  assert.equal(logText(s.log.at(-1)!, sm), "path.append(3) → [2, 3]; s = 5");
  assert.equal(say(s, { kind: "push", i: 2 }), `over {"s":5,"v":5,"sum":10,"T":8}`);
  assert.equal(say(s, { kind: "record" }), `notSum {"s":5,"T":8}`);
  s = [O, P].reduce(apply, s);
  assert.equal(say(s, { kind: "push", i: 3 }), `over {"s":7,"v":6,"sum":13,"T":8}`);
  assert.equal(say(s, { kind: "pop" }), "ok");
  s = [O, P].reduce(apply, s);
  assert.equal(say(s, { kind: "push", i: 3 }), `recordFirst {"path":"[2, 6]"}`);
  s = apply(s, R);
  assert.equal(say(s, { kind: "push", i: 3 }), `reached {"s":8,"T":8}`);
  assert.deepEqual(btRun(sm).end.seen, ["prune"]);
  assert.equal(btRun(sm).end.ret, 2);
  // Four queens: row 1 can't take column 0 or 1 once the queen in row 0 is in column 0; row 2 is then a dead end.
  const qs: BtTask = { algo: "queens", a: [0, 1, 2, 3], k: 0 };
  let q = replay(qs, [P]);
  assert.equal(say(q, { kind: "push", i: 0, row: 1 }), `sameCol {"r":0,"c":0}`);
  assert.equal(say(q, { kind: "push", i: 1, row: 1 }), `sameDiag {"r":0,"c":1}`);
  assert.equal(say(q, { kind: "push", i: 2, row: 2 }), `wrongRow {"r":1}`);
  q = apply(q, P);
  assert.equal(logText(q.log.at(-1)!, qs), "row 1: c = 2; path = [0, 2]");
  assert.equal(next(q), "pop");
  assert.ok(q.seen.length === 0 && apply(q, O).seen.includes("deadEnd"));
  const qEnd = btRun(qs).end;
  assert.equal(logText(qEnd.log.at(-1)!, qs), "return len(res) = 2");
  assert.equal(say(replay(qs, btRun(qs).ops.slice(0, -1)), { kind: "pop" }), "allDone {}");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = btRun(t);
    assert.ok(ops.length >= 20 && ops.length <= 44, `${where}: ${ops.length}`);
    if (t.algo === "sum") assert.ok(end.res.length >= 2 && end.res.length <= 4 && end.seen.includes("prune"), where);
  }
  BT_LADDER.forEach((s, stage) => {
    const end = btRun(btNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(BT_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(btStars), [3, 2, 1, 1]);
  const end = btRun({ algo: "perms", a: [0, 1, 2], k: 0 }).end;
  assert.deepEqual(end.seen, ["factorial"]);
  assert.equal(btNotice(end, 0, 2), "factorial");
  assert.equal(btNotice(end, 1, 2), null);
  assert.equal(btNotice(end, 3, 10), "streak10");
  assert.deepEqual(btRun({ algo: "subsets", a: [0, 1, 2], k: 0 }).end.seen, ["powerSet"]);
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i < BT_LADDER.length || i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of btRun(t).ops) {
      const pic = btSvg(m, { hot: "bin", sel: "top" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const j = nextChoice(m);
      const pair =
        e === "push" ? (t.algo === "queens" ? ["Q", `q${m.path.length}_${j}`] : [`a${j}`, "slot"])
        : e === "pop" ? ["top", "bin"]
        : e === "record" ? ["path", "res"]
        : ["res", "ret"];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(btSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beBacktrack);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beBacktrack));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeBacktrack);
  }
  for (const algo of BT_ALGOS) assert.ok(en.live.beBacktrack.names[algo] && en.live.beBacktrack.hint[algo] && en.live.beBacktrack.right[algo].includes("{stars}"));
});
