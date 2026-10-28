// Be the search: a player who makes the code's operations empties the queue or the stack (or settles every place) on
// every puzzle and endless task, the places come out in the order a plain implementation of each search visits them,
// every other operation is refused with the rule it broke, the tasks are worth playing, and the stars, notices,
// pictures, log and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { distances, type Graph } from "../src/math/graphPlay.ts";
import { apply, checkOp, CODE, expect as next, logText, replay, SEARCH_ALGOS, SEARCH_LADDER, searchNotice, searchNow, searchRun, searchStars, searchSvg, startMachine, type Attempt, type Machine, type SearchLevel, type SearchTask, type SearchWhy } from "../src/math/beSearch.ts";

const tasks = (): { t: SearchTask; where: string }[] => [
  ...SEARCH_LADDER.map((_, stage) => ({ t: searchNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as SearchLevel[]).flatMap((level) => Array.from({ length: 50 }, (_, i) => ({ t: searchNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** The operation as the player makes it on the board: the cell at head or top into v, a place into tail or above top, a dist[] into v, a place onto its dist[]. */
function attempt(m: Machine, code: number): Attempt {
  const { algo } = m.task;
  if (algo === "dijkstra") return next(m)?.kind === "pick" ? { kind: "pick", v: code } : { kind: "relax", v: code, at: code };
  if (code < 0) return { kind: "out", i: algo === "bfs" ? m.head : m.top };
  return { kind: "in", v: code, i: algo === "bfs" ? m.tail : m.top + 1 };
}

/** The order each search visits the places in, written the plain way. */
function plainOrder(t: SearchTask, dfs: "stack" | "recursive" = "stack"): number[] {
  const n = t.g.pts.length;
  const adj = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  for (const [a, b] of t.g.edges) adj[a][b] = adj[b][a] = true;
  const seen = Array<boolean>(n).fill(false);
  const out: number[] = [];
  if (t.algo === "bfs") {
    const queue = [t.s];
    seen[t.s] = true;
    for (let h = 0; h < queue.length; h++) {
      out.push(queue[h]);
      for (let u = 0; u < n; u++) if (adj[queue[h]][u] && !seen[u]) (seen[u] = true), queue.push(u);
    }
  } else if (t.algo === "dfs" && dfs === "stack") {
    const stack = [t.s];
    while (stack.length) {
      const v = stack.pop()!;
      if (seen[v]) continue;
      seen[v] = true;
      out.push(v);
      for (let u = n - 1; u >= 0; u--) if (adj[v][u] && !seen[u]) stack.push(u);
    }
  } else if (t.algo === "dfs") {
    const go = (v: number) => {
      seen[v] = true;
      out.push(v);
      for (let u = 0; u < n; u++) if (adj[v][u] && !seen[u]) go(u);
    };
    go(t.s);
  } else {
    // Lengths are at least 1, so the places settle in order of their distance, a tie to the first in the alphabet.
    const d = distances(t.g, t.s);
    out.push(...d.map((_, v) => v).sort((a, b) => d[a] - d[b] || a - b));
  }
  return out;
}

test("the code's own operations end every task, visiting the places as a plain implementation does", () => {
  for (const { t, where } of tasks()) {
    const run = searchRun(t);
    assert.deepEqual(run.end.order, plainOrder(t), where);
    if (t.algo === "dfs") assert.deepEqual(run.end.order, plainOrder(t, "recursive"), `${where}: the stack visits as recursion does`);
    let m = startMachine(t, run.cap);
    for (const [k, code] of run.ops.entries()) {
      assert.deepEqual(checkOp(m, attempt(m, code)), { ok: true, code }, `${where} op ${k}`);
      m = apply(m, code);
    }
    assert.equal(next(m), null, where);
    assert.deepEqual(m, replay(t, run.ops), where);
    if (t.algo === "bfs") assert.ok(m.head === m.tail && m.tail === t.g.pts.length, where);
    if (t.algo === "dfs") assert.equal(m.top, -1, where);
    if (t.algo === "dijkstra") {
      assert.deepEqual(m.dist, distances(t.g, t.s), where);
      assert.ok(m.done.every(Boolean), where);
      m.prev.forEach((p, v) => v !== t.s && assert.equal(m.dist[p] + t.g.w[t.g.edges.findIndex(([a, b]) => (a === p && b === v) || (a === v && b === p))], m.dist[v], where));
    }
    assert.ok(run.cap >= 1 && m.cells.every((x) => x >= -1), where);
  }
});

const REASONS: Record<string, SearchWhy[]> = {
  bfs: ["enqueueFirst", "gone", "fifo", "queued", "dequeueFirst", "fromQueue", "notJoined", "alpha", "back"],
  dfs: ["pushFirst", "lifo", "doneDfs", "popFirst", "fromStack", "skipped", "notJoined", "allPushed", "twice", "reverse", "onTop"],
  dijkstra: ["relaxFirst", "settled", "unreached", "nearer", "tie", "ownColumn", "pickFirst", "noBetter", "notJoined"],
};
test("every other operation is refused, with a reason of its own search", () => {
  for (const { t, where } of tasks().slice(0, 40)) {
    const run = searchRun(t);
    const n = t.g.pts.length;
    let m = startMachine(t, run.cap);
    for (const code of run.ops) {
      const e = next(m)!;
      const tries: Attempt[] =
        t.algo === "dijkstra"
          ? Array.from({ length: n }, (_, v) => [{ kind: "pick", v } as Attempt, { kind: "relax", v, at: v } as Attempt, { kind: "relax", v, at: (v + 1) % n } as Attempt]).flat()
          : [
              ...m.cells.flatMap((x, i) => (x >= 0 && (t.algo === "dfs" || i < m.tail) ? [{ kind: "out", i } as Attempt] : [])),
              ...Array.from({ length: n }, (_, v) => [m.tail, m.top + 1, 0].map((i): Attempt => ({ kind: "in", v, i }))).flat(),
              { kind: "pick", v: 0 },
            ];
      for (const a of tries) {
        const c = checkOp(m, a);
        const right =
          e.kind === "out" ? a.kind === "out" && a.i === (t.algo === "bfs" ? m.head : m.top)
          : e.kind === "in" ? a.kind === "in" && a.v === e.v && a.i === (t.algo === "bfs" ? m.tail : m.top + 1)
          : e.kind === "pick" ? a.kind === "pick" && a.v === e.v
          : a.kind === "relax" && a.at === a.v && e.vs.includes(a.v);
        assert.equal(c.ok, right, `${where} ${JSON.stringify(a)}`);
        if (!c.ok) {
          assert.ok(REASONS[t.algo].includes(c.why), `${where}: ${c.why}`);
          assert.ok(Object.values(c.vars).every((x) => x !== undefined && x !== "" && !Number.isNaN(x)), `${where}: ${c.why} ${JSON.stringify(c.vars)}`);
        }
      }
      m = apply(m, code);
    }
  }
});

test("the slips worked by hand", () => {
  //   A ─ B ─ D ─ F        lengths: A–B 5, A–C 2, B–C 1, B–D 1, C–E 2, D–F 1
  //    ╲  │
  //     C ─ E
  const g: Graph = { pts: [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0]], edges: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 5]], w: [5, 2, 1, 1, 2, 1] };
  const [A, B, C, D, E, F] = [0, 1, 2, 3, 4, 5];
  const at = (t: SearchTask, ops: number[]) => replay(t, ops);
  const no = (why: SearchWhy, vars: Record<string, string | number> = {}) => ({ ok: false, why, vars });

  const bfs: SearchTask = { algo: "bfs", g, s: A };
  assert.deepEqual(searchRun(bfs).ops, [-1, B, C, -1, D, -1, E, -1, F, -1, -1]);
  assert.deepEqual(checkOp(at(bfs, []), { kind: "in", v: B, i: 1 }), no("dequeueFirst"));
  assert.deepEqual(checkOp(at(bfs, []), { kind: "pick", v: B }), no("fromQueue"));
  assert.deepEqual(checkOp(at(bfs, [-1]), { kind: "in", v: C, i: 1 }), no("alpha", { x: "C", y: "B", c: "A" }));
  assert.deepEqual(checkOp(at(bfs, [-1]), { kind: "in", v: B, i: 2 }), no("back", { t: 1, i: 2 }));
  assert.deepEqual(checkOp(at(bfs, [-1, B]), { kind: "out", i: 1 }), no("enqueueFirst", { c: "A", y: "C" }));
  assert.deepEqual(checkOp(at(bfs, [-1, B, C]), { kind: "out", i: 2 }), no("fifo", { i: 2, x: "C", h: 1, y: "B" }));
  assert.deepEqual(checkOp(at(bfs, [-1, B, C]), { kind: "out", i: 0 }), no("gone", { i: 0, x: "A", h: 1 }));
  assert.deepEqual(checkOp(at(bfs, [-1, B, C, -1]), { kind: "in", v: C, i: 3 }), no("queued", { x: "C", k: C }));
  assert.deepEqual(checkOp(at(bfs, [-1, B, C, -1]), { kind: "in", v: E, i: 3 }), no("notJoined", { x: "E", c: "B" }));

  const dfs: SearchTask = { algo: "dfs", g, s: A };
  // A pushes C then B; B pushes D then C again; C pushes E; E is a dead end; D pushes F; the second C is skipped.
  assert.deepEqual(searchRun(dfs).ops, [-1, C, B, -1, D, C, -1, E, -1, -1, F, -1, -1]);
  assert.deepEqual(searchRun(dfs).end.order, [A, B, C, E, D, F]);
  assert.deepEqual(checkOp(at(dfs, []), { kind: "pick", v: A }), no("fromStack"));
  assert.deepEqual(checkOp(at(dfs, []), { kind: "in", v: B, i: 1 }), no("popFirst"));
  assert.deepEqual(checkOp(at(dfs, [-1]), { kind: "in", v: B, i: 0 }), no("reverse", { x: "B", y: "C" }));
  assert.deepEqual(checkOp(at(dfs, [-1]), { kind: "in", v: C, i: 1 }), no("onTop", { t: 0, i: 1 }));
  assert.deepEqual(checkOp(at(dfs, [-1, C]), { kind: "in", v: C, i: 1 }), no("twice", { x: "C", c: "A", y: "B" }));
  assert.deepEqual(checkOp(at(dfs, [-1, C]), { kind: "out", i: 0 }), no("pushFirst", { c: "A", y: "B" }));
  assert.deepEqual(checkOp(at(dfs, [-1, C, B]), { kind: "in", v: C, i: 2 }), no("allPushed", { c: "A" }));
  assert.deepEqual(checkOp(at(dfs, [-1, C, B]), { kind: "in", v: D, i: 2 }), no("notJoined", { x: "D", c: "A" }));
  assert.deepEqual(checkOp(at(dfs, [-1, C, B, -1, D, C]), { kind: "out", i: 1 }), no("lifo", { i: 1, x: "D", t: 2, y: "C" }));
  assert.deepEqual(checkOp(at(dfs, [-1, C, B, -1, D, C, -1]), { kind: "in", v: A, i: 2 }), no("doneDfs", { x: "A", k: A }));
  const skipped = at(dfs, [-1, C, B, -1, D, C, -1, E, -1, -1, F, -1, -1]);
  assert.ok(skipped.skip && skipped.seen.includes("skipped"));
  assert.deepEqual(checkOp(at(dfs, [-1, C, B, -1, D, C, -1, E, -1, -1, F, -1]), { kind: "out", i: 0 }), { ok: true, code: -1 });

  // Dijkstra, with a road E–F 3 that never helps.
  const dij: SearchTask = { algo: "dijkstra", g: { ...g, edges: [...g.edges, [4, 5]], w: [...g.w, 3] }, s: A };
  assert.deepEqual(searchRun(dij).ops, [A, B, C, C, B, E, B, D, D, F, E, F]);
  assert.deepEqual(checkOp(at(dij, []), { kind: "pick", v: B }), no("unreached", { x: "B", k: B }));
  assert.deepEqual(checkOp(at(dij, []), { kind: "relax", v: B, at: B }), no("pickFirst"));
  assert.deepEqual(checkOp(at(dij, [A]), { kind: "pick", v: C }), no("relaxFirst", { c: "A", y: "B", a: 0, w: 5, s: 5, d: "∞", k: B }));
  assert.deepEqual(checkOp(at(dij, [A]), { kind: "relax", v: B, at: C }), no("ownColumn", { x: "B", k: B }));
  assert.deepEqual(checkOp(at(dij, [A]), { kind: "relax", v: C, at: C }), { ok: true, code: C });
  assert.deepEqual(checkOp(at(dij, [A, B, C]), { kind: "pick", v: B }), no("nearer", { x: "B", y: "C", a: 2, b: 5, k: C, j: B }));
  assert.deepEqual(checkOp(at(dij, [A, B, C]), { kind: "pick", v: A }), no("settled", { x: "A", k: A }));
  assert.deepEqual(checkOp(at(dij, [A, B, C, C]), { kind: "relax", v: D, at: D }), no("notJoined", { x: "D", c: "C" }));
  assert.deepEqual(checkOp(at(dij, [A, B, C, C, B, E, B, D]), { kind: "pick", v: E }), no("tie", { x: "E", y: "D", a: 4, b: 4, k: D, j: E }));
  assert.deepEqual(checkOp(at(dij, [A, B, C, C, B, E, B, D, D, F, E]), { kind: "relax", v: F, at: F }), no("noBetter", { x: "F", c: "E", a: 4, w: 3, s: 7, d: 5, k: F }));
  assert.deepEqual(at(dij, [A, B, C, C, B]).seen, ["lowered"]);
});

test("the tasks are worth playing: BFS and DFS part ways, Dijkstra isn't BFS, and the ladder grows", () => {
  for (const { t, where } of tasks()) {
    const run = searchRun(t);
    const other = searchRun({ ...t, algo: t.algo === "bfs" ? "dfs" : "bfs" });
    assert.notDeepEqual(run.end.order, other.end.order, where);
    assert.ok(run.ops.length <= 40, where);
    if (t.algo === "dijkstra") assert.ok(t.g.w.length === t.g.edges.length && t.g.w.every((x) => x >= 1 && x <= 9), where);
    else assert.equal(t.g.w.length, 0, where);
  }
  const ladder = SEARCH_LADDER.map((_, stage) => searchNow({ mode: "puzzle", stage, level: 1, seed: 1 }));
  assert.deepEqual(ladder.map((t) => [t.algo, t.g.pts.length]), [["bfs", 6], ["dfs", 6], ["dijkstra", 6], ["bfs", 9], ["dfs", 9], ["dijkstra", 9], ["bfs", 12], ["dfs", 9], ["dijkstra", 12]]);
  for (const stage of [4, 7]) assert.ok(searchRun(ladder[stage]).end.seen.includes("skipped"));
  for (const stage of [5, 8]) assert.ok(searchRun(ladder[stage]).end.seen.includes("lowered"));
  for (const level of [1, 2, 3] as SearchLevel[]) {
    const ts = Array.from({ length: 40 }, (_, i) => searchNow({ mode: "endless", stage: 0, level, seed: i }));
    if (level === 1) assert.ok(ts.every((t) => t.algo !== "dijkstra" && t.g.pts.length === 6));
    else assert.deepEqual(new Set(ts.map((t) => t.algo)), new Set(SEARCH_ALGOS), `level ${level}`);
    if (level === 3) assert.ok(ts.every((t) => t.g.pts.length >= 9));
  }
});

test("stars and notices: no miss three, one two; the first thing a clean run showed, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 5].map(searchStars), [3, 2, 1, 1]);
  const end = searchRun(searchNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 })).end;
  assert.equal(searchNotice(end, 0, 1), "layers");
  assert.equal(searchNotice(end, 1, 1), null);
  assert.equal(searchNotice(end, 1, 10), "streak10");
  for (const { t, where } of tasks()) {
    const seen = searchRun(t).end.seen;
    assert.ok(seen.every((k) => (k === "layers" ? t.algo === "bfs" : k === "skipped" ? t.algo === "dfs" : t.algo === "dijkstra")), where);
  }
});

test("every picture draws without a gap, and has a spot for each part of the next operation", () => {
  for (const { t, where } of tasks().slice(0, 40)) {
    const run = searchRun(t);
    const n = t.g.pts.length;
    let m = startMachine(t, run.cap);
    for (let k = 0; k <= run.ops.length; k++) {
      const pic = searchSvg(m, { cap: run.cap, finished: k === run.ops.length, hot: "v", sel: "n0" });
      assert.doesNotMatch(pic.body, /NaN|undefined|Infinity/, `${where} step ${k}`);
      assert.equal(pic.spots.length, n + 1 + (t.algo === "dijkstra" ? n : run.cap), where);
      assert.ok(pic.spots.every((s) => s.x + s.w / 2 > 0 && s.y + s.h / 2 > 0 && s.x + s.w / 2 < pic.w && s.y + s.h / 2 < pic.h), `${where} step ${k}`);
      for (const l of m.log) assert.doesNotMatch(logText(l, t.algo), /NaN|undefined|Infinity/, where);
      if (k === run.ops.length) break;
      const e = next(m)!;
      const spot = (id: string) => pic.spots.find((s) => s.id === id)!;
      const code = run.ops[k];
      if (e.kind === "out") assert.ok(spot(`c${t.algo === "bfs" ? m.head : m.top}`).from && spot("v").to, where);
      if (e.kind === "in") assert.ok(spot(`n${code}`).from && spot(`c${t.algo === "bfs" ? m.tail : m.top + 1}`).to, where);
      if (e.kind === "pick") assert.ok(spot(`d${code}`).from && spot("v").to, where);
      if (e.kind === "relax") assert.ok(spot(`n${code}`).from && spot(`d${code}`).to, where);
      m = apply(m, code);
    }
  }
  for (const algo of SEARCH_ALGOS) assert.ok(CODE[algo].length >= 7);
});

test("the words: every search, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beSearch);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beSearch));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
  }
  for (const algo of SEARCH_ALGOS) assert.ok(en.live.beSearch.names[algo] && en.live.beSearch.right[algo].includes("{stars}"));
  assert.deepEqual(Object.keys(en.live.beSearch.why).sort(), [...new Set(Object.values(REASONS).flat())].sort());
});
