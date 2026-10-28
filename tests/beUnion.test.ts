// Be the union-find: a player who makes the code's operations ends with what a plain union-find gives (the same
// parent[] and size[]), answers each question as a search of the joins so far does, and builds a tree as cheap as
// Prim's; every other operation is refused with the rule it broke; the tasks are worth playing; and the stars, notices,
// pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { apply, checkOp, CODE, expect as next, linkOrder, logText, OPS, replay, startMachine, UF_ALGOS, UF_LADDER, ufNotice, ufNow, ufRun, ufStars, ufSvg, type UfAttempt, type UfLevel, type UfMachine, type UfTask, type UfWhy } from "../src/math/beUnion.ts";

const tasks = (): { t: UfTask; where: string }[] => [
  ...UF_LADDER.map((_, stage) => ({ t: ufNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as UfLevel[]).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ t: ufNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** A plain union-find: find with full path compression, union by size, the second root under the first on a tie. */
function plain(t: UfTask) {
  const parent = Array.from({ length: t.n }, (_, i) => i);
  const size = Array(t.n).fill(1);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const answers: boolean[] = [];
  let total = 0;
  let edges = 0;
  for (const c of t.cmds) {
    if (t.algo === "kruskal" && edges === t.n - 1) break;
    const [ra, rb] = [find(c.a), find(c.b)];
    if (c.op === "query") {
      answers.push(ra === rb);
      continue;
    }
    if (ra === rb) continue;
    const [child, root] = size[ra] < size[rb] ? [ra, rb] : [rb, ra];
    parent[child] = root;
    size[root] += size[child];
    total += c.w ?? 0;
    edges++;
  }
  return { parent, size, answers, total };
}
/** Whether a and b are joined by the unions before command k, by a search. */
function joined(t: UfTask, k: number, a: number, b: number): boolean {
  const seen = new Set([a]);
  const todo = [a];
  const links = t.cmds.slice(0, k).filter((c) => c.op === "union");
  while (todo.length) {
    const x = todo.pop()!;
    for (const c of links) for (const [p, q] of [[c.a, c.b], [c.b, c.a]]) if (p === x && !seen.has(q)) seen.add(q) && todo.push(q);
  }
  return seen.has(b);
}
/** The cheapest spanning tree's weight, by Prim. */
function prim(t: UfTask): number {
  const inTree = new Set([0]);
  let total = 0;
  while (inTree.size < t.n) {
    const e = t.cmds.filter((c) => inTree.has(c.a) !== inTree.has(c.b)).sort((p, q) => p.w! - q.w!)[0];
    total += e.w!;
    inTree.add(e.a).add(e.b);
  }
  return total;
}

test("the code's own operations end with what a plain union-find gives, and the answers and tree are right", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = ufRun(t);
    const p = plain(t);
    assert.deepEqual([end.parent, end.size, end.answers, end.total], [p.parent, p.size, p.answers, p.total], where);
    if (t.algo === "connected") assert.deepEqual(end.answers, t.cmds.flatMap((c, k) => (c.op === "query" ? [joined(t, k, c.a, c.b)] : [])), where);
    if (t.algo === "kruskal") assert.deepEqual([end.total, end.mst.length], [prim(t), t.n - 1], where);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.filter((l) => l.op !== "root").length, ops.length + 1, where);
  }
});

/** Every operation the board lets the player try. */
function attempts(m: UfMachine): UfAttempt[] {
  const idx = [...m.parent.keys()];
  const at: UfAttempt[] = [{ kind: "skip" }];
  if (m.phase !== "decide") at.push(...idx.map((to) => ({ kind: "move" as const, to })));
  for (const from of idx) for (const to of idx) if (from !== to) at.push({ kind: "link", from, to });
  if (m.task.algo === "connected") at.push({ kind: "answer", yes: true }, { kind: "answer", yes: false });
  return at;
}
function right(m: UfMachine, a: UfAttempt): boolean {
  const e = next(m);
  if (e === "up") return a.kind === "move" && a.to === m.parent[m.cur];
  if (e === "compress") return a.kind === "link" && a.from === m.comp![0] && a.to === m.cur;
  if (e === "join") return a.kind === "link" && [a.from, a.to].join() === linkOrder(m).join();
  if (e === "skip") return a.kind === "skip";
  return a.kind === "answer" && a.yes === (e === "yes");
}

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<UfWhy>();
  for (const { t, where } of tasks().filter((_, i) => i < UF_LADDER.length || i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of ufRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beUnion.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: UfMachine, a: UfAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const [U, C, J, S, Y, N] = OPS.map((_, i) => i);
  /** The log's last line of a kind: an operation can be followed by finds that need no operation. */
  const last = (m: UfMachine, op: string) => logText(m.log.filter((l) => l.op === op).at(-1)!, m.task);
  // union(0, 1), union(2, 1), then union(3, 2) and the question 3 ~ 0.
  const t: UfTask = { algo: "connected", n: 5, cmds: [{ op: "union", a: 0, b: 1 }, { op: "union", a: 2, b: 1 }, { op: "union", a: 3, b: 2 }, { op: "query", a: 3, b: 0 }, { op: "query", a: 4, b: 0 }] };
  let m = startMachine(t);
  assert.equal(say(m, { kind: "link", from: 0, to: 1 }), `bySize {"s":1,"ss":1,"b":0,"bs":1}`);
  m = apply(m, J);
  assert.equal(last(m, "join"), "parent[1] = 0; size[0] = 2");
  // find(1) climbs to 0; 2 is a root, and the smaller tree, so it goes under 0.
  assert.equal(say(m, { kind: "skip" }), `findFirst {"x":1,"p":0}`);
  assert.equal(say(m, { kind: "move", to: 2 }), `toParent {"x":1,"p":0}`);
  m = apply(m, U);
  assert.equal(last(m, "root"), "find(1) = 0");
  assert.equal(say(m, { kind: "skip" }), `different {"ra":2,"rb":0}`);
  assert.equal(say(m, { kind: "link", from: 1, to: 2 }), `rootsOnly {"ra":2,"rb":0}`);
  m = apply(m, J);
  // find(2) climbs to 0 and has nothing to compress; 3 goes under 0.
  // 3 ~ 0: find(3) climbs once to 0; find(0) is 0 at once: yes.
  m = [U, J, U].reduce(apply, m);
  assert.equal(say(m, { kind: "link", from: 3, to: 0 }), "answerIt {}");
  assert.equal(say(m, { kind: "answer", yes: false }), `querySame {"r":0}`);
  m = apply(m, Y);
  assert.equal(last(m, "answer"), "3 ~ 0: yes");
  assert.equal(say(m, { kind: "answer", yes: true }), `queryDiff {"ra":4,"rb":0}`);
  assert.deepEqual(apply(m, N).answers, [true, false]);
  // union(0, 1), union(2, 3), union(0, 2) leave 3 → 2 → 0; then union(3, 1) climbs twice and points 3 at 0.
  const ch: UfTask = { algo: "unions", n: 4, cmds: [{ op: "union", a: 0, b: 1 }, { op: "union", a: 2, b: 3 }, { op: "union", a: 0, b: 2 }, { op: "union", a: 3, b: 1 }] };
  let c = replay(ch, [J, J, J, U, U]);
  assert.deepEqual([c.comp, c.seen], [[3], ["compress"]]);
  assert.equal(say(c, { kind: "move", to: 1 }), `isRoot {"r":0}`);
  assert.equal(say(c, { kind: "link", from: 2, to: 0 }), `compressNext {"x":3,"r":0}`);
  c = apply(c, C);
  assert.equal(last(c, "compress"), "parent[3] = 0");
  c = apply(c, U);
  assert.deepEqual(c.parent, [0, 0, 0, 0]);
  assert.equal(say(c, { kind: "link", from: 0, to: 3 }), `sameRoot {"r":0}`);
  assert.equal(last(apply(c, S), "skip"), "same root 0: skip");
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = ufRun(t);
    const count = (op: string) => ops.filter((c) => OPS[c] === op).length;
    assert.ok(end.seen.includes("compress") && count("up") >= t.cmds.filter((c) => c.op !== "query").length, where);
    if (t.algo === "connected") assert.ok(count("yes") && count("no"), where);
    else assert.ok(end.seen.includes("cycle"), where);
  }
  UF_LADDER.forEach((s, stage) => {
    const end = ufRun(ufNow({ mode: "puzzle", stage, level: 1, seed: 1 })).end;
    assert.equal(end.task.algo, s.algo);
    if (s.need) assert.ok(end.seen.includes(s.need), `puzzle ${stage + 1}`);
  });
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(UF_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(ufStars), [3, 2, 1, 1]);
  const end = ufRun({ algo: "unions", n: 3, cmds: [{ op: "union", a: 0, b: 1 }, { op: "union", a: 1, b: 0 }] }).end;
  assert.deepEqual(end.seen, ["cycle"]);
  assert.equal(ufNotice(end, 0, 2), "cycle");
  assert.equal(ufNotice(end, 1, 2), null);
  assert.equal(ufNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i < UF_LADDER.length || i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of ufRun(t).ops) {
      const pic = ufSvg(m, { hot: "n1", sel: "cur" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const pair =
        e === "up" ? ["cur", `n${m.parent[m.cur]}`]
        : e === "compress" ? [`n${m.comp![0]}`, `n${m.cur}`]
        : e === "join" ? linkOrder(m).map((i) => `n${i}`)
        : e === "skip" ? ["n0", "skip"]
        : ["n0", e];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(ufSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beUnion);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beUnion));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeUnion);
  }
  for (const algo of UF_ALGOS) assert.ok(en.live.beUnion.names[algo] && en.live.beUnion.hint[algo] && en.live.beUnion.right[algo].includes("{stars}"));
});
