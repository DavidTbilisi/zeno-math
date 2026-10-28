// Be the topological sort: a player who makes the code's operations ends with the order a plain Kahn (a queue, the
// scan by index, the edges in order) or a recursive depth-first walk gives, every edge pointing forward, and a cycle
// called only when no order exists; every other operation is refused with the rule it broke; the tasks are worth
// playing; and the stars, notices, pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { adjOf, apply, checkOp, CODE, edgeTarget, expect as next, logText, OPS, putNode, replay, startMachine, TOPO_ALGOS, TOPO_LADDER, topoNotice, topoNow, topoRun, topoStars, topoSvg, type TopoAttempt, type TopoLevel, type TopoMachine, type TopoTask, type TopoWhy } from "../src/math/beTopo.ts";

const tasks = (): { t: TopoTask; where: string }[] => [
  ...TOPO_LADDER.map((_, stage) => ({ t: topoNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as TopoLevel[]).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ t: topoNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** Kahn as a textbook writes it. */
function kahn(t: TopoTask): number[] {
  const adj = adjOf(t);
  const indeg = Array(t.n).fill(0);
  for (const [, b] of t.edges) indeg[b]++;
  const q = [...Array(t.n).keys()].filter((v) => indeg[v] === 0);
  const order: number[] = [];
  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    for (const v of adj[u]) if (--indeg[v] === 0) q.push(v);
  }
  return order;
}
/** The depth-first order by recursion: each node in front of all it points to. */
function dfs(t: TopoTask): number[] {
  const adj = adjOf(t);
  const seen = new Set<number>();
  const order: number[] = [];
  const visit = (u: number) => {
    seen.add(u);
    for (const v of adj[u]) if (!seen.has(v)) visit(v);
    order.unshift(u);
  };
  for (let s = 0; s < t.n; s++) if (!seen.has(s)) visit(s);
  return order;
}
const forward = (t: TopoTask, order: number[]) => t.edges.every(([a, b]) => order.indexOf(a) < order.indexOf(b));

test("the code's own operations end with the order a plain Kahn or depth-first walk gives, every edge forward", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = topoRun(t);
    assert.deepEqual(end.order, t.algo === "dfs" ? dfs(t) : kahn(t), where);
    if (t.algo === "cycle") assert.ok(end.order.length < t.n && end.seen.includes("cycle"), where);
    else assert.ok(end.order.length === t.n && forward(t, end.order), where);
    assert.deepEqual(replay(t, ops), end, where);
    assert.equal(end.log.length, ops.length + 1, where);
  }
});

/** Every operation the board lets the player try. */
function attempts(m: TopoMachine): TopoAttempt[] {
  const idx = [...Array(m.task.n).keys()];
  const at: TopoAttempt[] = idx.map((v) => ({ kind: "put" as const, v }));
  if (m.task.algo === "dfs" ? m.stack.length : m.head < m.queue.length) at.push({ kind: "take" });
  if (m.task.algo !== "dfs") {
    at.push({ kind: "cycle" });
    if (next(m) === "edge") at.push(...idx.map((v) => ({ kind: "edge" as const, v })));
  }
  return at;
}
function right(m: TopoMachine, a: TopoAttempt): boolean {
  const e = next(m);
  if (e === "put") return a.kind === "put" && a.v === putNode(m);
  if (e === "edge") return a.kind === "edge" && a.v === edgeTarget(m);
  return a.kind === e;
}

test("every other operation is refused, with the rule it broke", () => {
  const why = new Set<TopoWhy>();
  for (const { t, where } of tasks().filter((_, i) => i < TOPO_LADDER.length || i % 3 === 0)) {
    let m = startMachine(t);
    for (const code of topoRun(t).ops) {
      for (const a of attempts(m)) {
        const c = checkOp(m, a);
        assert.equal(c.ok, right(m, a), `${where}: ${JSON.stringify(a)} ${JSON.stringify(c)}`);
        if (c.ok) assert.equal(c.code, code, where);
        else why.add(c.why);
      }
      m = apply(m, code);
    }
  }
  assert.deepEqual([...why].sort(), Object.keys(en.live.beTopo.why).sort());
});

test("the slips worked by hand", () => {
  const say = (m: TopoMachine, a: TopoAttempt) => {
    const c = checkOp(m, a);
    return c.ok ? "ok" : `${c.why} ${JSON.stringify(c.vars)}`;
  };
  const [P, T, E, C] = OPS.map((_, i) => i);
  // 0 → 2, 1 → 2, 2 → 3: the scan queues 0 and 1; 0's edge leaves indeg[2] = 1, 1's takes it to 0.
  const g: TopoTask = { algo: "kahn", n: 4, edges: [[0, 2], [1, 2], [2, 3]] };
  let m = startMachine(g);
  assert.equal(say(m, { kind: "put", v: 2 }), `hasIn {"v":2,"d":2}`);
  assert.equal(say(m, { kind: "put", v: 1 }), `scanOrder {"v":0}`);
  m = apply(m, P);
  assert.equal(say(m, { kind: "put", v: 0 }), `already {"v":0}`);
  assert.equal(say(m, { kind: "take" }), `scanFirst {"v":1}`);
  m = [P, T].reduce(apply, m);
  assert.deepEqual(m.seen, ["many"]);
  assert.equal(logText(m.log.at(-1)!, g), "u = q.popleft() = 0; order = [0]");
  assert.equal(say(m, { kind: "take" }), `edgesFirst {"u":0}`);
  assert.equal(say(m, { kind: "edge", v: 3 }), `notEdge {"u":0,"w":3}`);
  m = apply(m, E);
  assert.equal(logText(m.log.at(-1)!, g), "0 → 2: indeg[2] = 1");
  assert.equal(say(m, { kind: "put", v: 2 }), `takeHead {"h":1}`);
  m = [T, E].reduce(apply, m);
  assert.equal(say(m, { kind: "take" }), `zeroNow {"v":2}`);
  // A cycle 1 → 2 → 1 after 0: the queue runs dry with 1 and 2 left.
  const cy: TopoTask = { algo: "cycle", n: 3, edges: [[0, 1], [1, 2], [2, 1]] };
  const c = replay(cy, [P, T, E]);
  assert.equal(say(c, { kind: "put", v: 1 }), `queueEmpty {"left":2}`);
  assert.equal(logText(apply(c, C).log.at(-1)!, cy), "q is empty, [1, 2] left: a cycle");
  // Depth first on 0 → 1, 0 → 2, 1 → 2, and 3 alone: 0, 1, 2 open, 2 finishes first.
  const d: TopoTask = { algo: "dfs", n: 4, edges: [[0, 1], [0, 2], [1, 2]] };
  let s = startMachine(d);
  assert.equal(say(s, { kind: "put", v: 3 }), `startOrder {"v":0}`);
  s = apply(s, P);
  assert.equal(say(s, { kind: "put", v: 2 }), `neighborOrder {"u":0,"v":1}`);
  assert.equal(say(s, { kind: "put", v: 3 }), `notNeighbor {"u":0,"w":3}`);
  assert.equal(say(s, { kind: "put", v: 0 }), `onStack {"w":0}`);
  assert.equal(say(s, { kind: "take" }), `unvisited {"u":0,"v":1}`);
  s = [P, P].reduce(apply, s);
  assert.equal(logText(s.log.at(-1)!, d), "push 2 → stack = [0, 1, 2]");
  assert.equal(say(s, { kind: "put", v: 3 }), `allVisited {"u":2}`);
  s = [T, T].reduce(apply, s);
  assert.equal(logText(s.log.at(-1)!, d), "1 finished; order = [1, 2]");
  assert.equal(say(s, { kind: "put", v: 3 }), `allVisited {"u":0}`);
  s = apply(s, T);
  assert.equal(say(s, { kind: "put", v: 2 }), `doneAlready {"w":2}`);
  assert.deepEqual(topoRun(d).end.order, [3, 0, 1, 2]);
});

test("the tasks are worth playing, and the ladder shows what it should", () => {
  for (const { t, where } of tasks()) {
    const { ops, end } = topoRun(t);
    assert.ok(t.edges.length >= t.n && t.edges.length <= 2 * t.n - 2, where);
    if (t.algo === "kahn") assert.ok(end.seen.includes("many"), where);
    if (t.algo === "cycle") assert.ok(end.order.length >= t.n / 2 && ops.length >= t.n + 3, where);
    if (t.algo === "dfs") assert.ok(end.log.filter((l) => l.op === "push" && l.stack.length === 1).length >= 2, where);
  }
  TOPO_LADDER.forEach((s, stage) => assert.equal(topoNow({ mode: "puzzle", stage, level: 1, seed: 1 }).algo, s.algo));
  assert.deepEqual(new Set(tasks().map(({ t }) => t.algo)), new Set(TOPO_ALGOS));
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(topoStars), [3, 2, 1, 1]);
  const end = topoRun({ algo: "dfs", n: 2, edges: [[0, 1]] }).end;
  assert.deepEqual(end.seen, ["reverse"]);
  assert.equal(topoNotice(end, 0, 2), "reverse");
  assert.equal(topoNotice(end, 1, 2), null);
  assert.equal(topoNotice(end, 3, 10), "streak10");
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().filter((_, i) => i < TOPO_LADDER.length || i % 4 === 0)) {
    let m = startMachine(t);
    for (const code of topoRun(t).ops) {
      const pic = topoSvg(m, { hot: "box", sel: "n1" });
      assert.ok(!/NaN|undefined|null|Infinity/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      const e = next(m)!;
      const pair =
        e === "put" ? [`n${putNode(m)}`, "box"]
        : e === "take" ? [t.algo === "dfs" ? "top" : "head", "order"]
        : e === "edge" ? ["u", `n${edgeTarget(m)}`]
        : ["n0", "cycle"];
      const [from, to] = pair.map((id) => pic.spots.find((s) => s.id === id));
      assert.ok(from?.from && to?.to, `${where}: ${pair}`);
      m = apply(m, code);
    }
    assert.ok(!/NaN|undefined|null/.test(topoSvg(m, { finished: true }).body));
    for (const l of m.log) assert.ok(!/NaN|undefined|null|Infinity/.test(logText(l, t)), where);
    assert.ok(m.lines.every((i) => CODE[t.algo][i]), where);
  }
});

test("the words: every pattern, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beTopo);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beTopo));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    assert.ok(dict.shapes.names.liveBeTopo);
  }
  for (const algo of TOPO_ALGOS) assert.ok(en.live.beTopo.names[algo] && en.live.beTopo.hint[algo] && en.live.beTopo.right[algo].includes("{stars}"));
});
