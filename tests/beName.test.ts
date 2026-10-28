// Name the pattern: every problem names one pattern and every pattern has three; a right tile is the problem's
// pattern and any other is refused with the tile chosen; the rounds draw problems of different patterns, with
// look-alikes when asked; the notices, stars and picture follow the rules; and each clue stands word for word in its
// problem in every language; and each problem opens its pattern's game at a puzzle of its own kind.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { fill } from "../src/math/text.ts";
import { initialLive } from "../src/math/live.ts";
import { SORT_LADDER } from "../src/math/beSort.ts";
import { SEARCH_LADDER } from "../src/math/beSearch.ts";
import { DP_LADDER } from "../src/math/beDp.ts";
import { BIN_LADDER } from "../src/math/beBinary.ts";
import { PTR_LADDER } from "../src/math/bePointers.ts";
import { WIN_LADDER } from "../src/math/beWindow.ts";
import { BT_LADDER } from "../src/math/beBacktrack.ts";
import { HEAP_LADDER } from "../src/math/beHeap.ts";
import { TREE_LADDER } from "../src/math/beTree.ts";
import { STACK_LADDER } from "../src/math/beStack.ts";
import { UF_LADDER } from "../src/math/beUnion.ts";
import { TOPO_LADDER } from "../src/math/beTopo.ts";
import { apply, checkOp, expect as next, GAMES, LOOKALIKE, NAME_LADDER, nameNotice, nameNow, nameRun, nameStars, nameSvg, PATTERNS, PLAY, PROBLEM_IDS, PROBLEMS, replay, startMachine, wrap, type NameLevel, type NameTask } from "../src/math/beName.ts";

const tasks = (): { t: NameTask; where: string; size: number; looks?: boolean }[] => [
  ...NAME_LADDER.map((s, stage) => ({ t: nameNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `round ${stage + 1}`, size: s.size, looks: s.looks })),
  ...([1, 2, 3] as NameLevel[]).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ t: nameNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}`, size: [4, 6, 8][level - 1], looks: level === 3 }))),
];

test("every pattern has three problems, and every problem one pattern", () => {
  for (const p of PATTERNS) assert.equal(PROBLEM_IDS.filter((id) => PROBLEMS[id] === p).length, 3, p);
  for (const ids of Object.values(LOOKALIKE)) for (const id of ids) assert.ok(PROBLEMS[id], id);
});

test("only the problem's own pattern is taken; any other tile is refused, naming it", () => {
  for (const { t, where } of tasks()) {
    let m = startMachine(t);
    for (const code of nameRun(t).ops) {
      PATTERNS.forEach((p, tile) => {
        const c = checkOp(m, tile);
        assert.equal(c.ok, p === next(m), where);
        if (!c.ok) assert.deepEqual(c.vars, { tile: p });
      });
      m = apply(m, code);
    }
    assert.equal(next(m), null);
    assert.deepEqual(m.answered, t.items.map((i) => PROBLEMS[i.id]), where);
    assert.deepEqual(replay(t, nameRun(t).ops), m, where);
  }
});

test("each round draws problems of different patterns, with look-alikes when asked", () => {
  for (const { t, where, size, looks } of tasks()) {
    const pats = t.items.map((i) => PROBLEMS[i.id]);
    assert.equal(t.items.length, size, where);
    assert.equal(new Set(pats).size, size, where);
    if (looks) assert.ok(Object.values(LOOKALIKE).some((g) => new Set(t.items.filter((i) => g.includes(i.id)).map((i) => PROBLEMS[i.id])).size >= 2), where);
    for (const i of t.items) assert.ok(i.n >= 5 && i.n <= 12 && i.x >= 10 && i.x <= 99 && i.k >= 2 && i.k <= 5, where);
  }
  assert.ok(NAME_LADDER.slice(0, 2).every((s) => s.size === 6) && NAME_LADDER[8].size === 12);
});

test("stars and notices: no miss three, one two; the look-alikes a clean round told apart, and ten in a row", () => {
  assert.deepEqual([0, 1, 2, 4].map(nameStars), [3, 2, 1, 1]);
  const item = (id: string) => ({ id, n: 5, x: 10, k: 2 });
  const sorted = nameRun({ items: [item("b1"), item("p1")] }).end;
  assert.deepEqual(sorted.seen, ["sorted"]);
  const graph = nameRun({ items: [item("q1"), item("u1"), item("o1")] }).end;
  assert.deepEqual(graph.seen, ["graph"]);
  assert.deepEqual(nameRun({ items: [item("q1"), item("q3")] }).end.seen, []);
  assert.equal(nameNotice(sorted, 0, 2), "sorted");
  assert.equal(nameNotice(sorted, 1, 2), null);
  assert.equal(nameNotice(graph, 3, 10), "streak10");
});

test("every picture draws without a gap, with the card and the right tile to drop it on", () => {
  const W = en.live.beName;
  const names = PATTERNS.map((p) => W.tiles[p]);
  for (const { t, where } of tasks().filter((_, i) => i % 5 === 0)) {
    let m = startMachine(t);
    for (const code of nameRun(t).ops) {
      const it = t.items[m.k];
      const pic = nameSvg(m, { text: fill(W.problems[it.id as keyof typeof W.problems], it), clue: "", names, showClue: false }, { hot: "tile0", sel: "card" });
      assert.ok(!/NaN|undefined|null/.test(pic.body), where);
      for (const s of pic.spots) assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= pic.w && s.y + s.h <= pic.h, `${where}: ${s.id}`);
      assert.ok(pic.spots.find((s) => s.id === "card")?.from && pic.spots.find((s) => s.id === `tile${code}`)?.to, where);
      m = apply(m, code);
    }
    assert.ok(!pic(m).spots.some((s) => s.from || s.to));
  }
  function pic(m: ReturnType<typeof startMachine>) {
    return nameSvg(m, { text: "done", clue: "x", names, showClue: true }, { finished: true });
  }
  assert.deepEqual(wrap("a bb ccc dddd", 6), ["a bb", "ccc", "dddd"]);
});

test("the words: every clue stands in its problem in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beName);
  for (const dict of [en, ka, ru]) {
    const W = dict.live.beName;
    const other = new Map(flat(W));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
    for (const id of PROBLEM_IDS) {
      const vars = { n: 7, x: 42, k: 3 };
      const [text, clue] = [fill(W.problems[id as keyof typeof W.problems], vars), fill(W.clues[id as keyof typeof W.clues], vars)];
      assert.ok(text.includes(clue), `${id}: ${clue}`);
    }
    assert.deepEqual(Object.keys(W.tiles).sort(), [...PATTERNS].sort());
    assert.deepEqual(Object.keys(W.needs).sort(), [...PATTERNS].sort());
    assert.ok(dict.shapes.names.liveBeName);
  }
});

test("each problem opens its pattern's game at the first puzzle that plays its kind", () => {
  const ladders: Record<string, readonly { algo?: string | null; p?: string | null }[]> = {
    sort: SORT_LADDER, search: SEARCH_LADDER, dp: DP_LADDER, binary: BIN_LADDER, pointers: PTR_LADDER, window: WIN_LADDER,
    backtrack: BT_LADDER, heap: HEAP_LADDER, tree: TREE_LADDER, stack: STACK_LADDER, union: UF_LADDER, topo: TOPO_LADDER,
  };
  // What each problem is, worked by hand: alphabetical order is any sort, two ordered piles a merge, a quickest trip Dijkstra…
  const kind: Record<string, string> = {
    s1: "bubble", s2: "bubble", s3: "merge", q1: "bfs", q2: "dijkstra", q3: "bfs", d1: "stairs", d2: "robber", d3: "coins",
    b1: "find", b2: "lower", b3: "find", p1: "pairSum", p2: "water", p3: "dedupe", w1: "fixed", w2: "unique", w3: "atMost",
    k1: "perms", k2: "queens", k3: "sum", h1: "topK", h2: "pop", h3: "pop", t1: "insert", t2: "insert", t3: "inorder",
    m1: "temps", m2: "nextGreater", m3: "removeK", u1: "connected", u2: "unions", u3: "kruskal", o1: "kahn", o2: "cycle", o3: "dfs",
  };
  assert.deepEqual(Object.keys(PLAY).sort(), [...PROBLEM_IDS].sort());
  for (const id of PROBLEM_IDS) {
    const ladder = ladders[PROBLEMS[id]];
    const of = (s: { algo?: string | null; p?: string | null }) => s.algo ?? s.p;
    assert.equal(of(ladder[PLAY[id]]), kind[id], id);
    assert.equal(ladder.findIndex((s) => of(s) === kind[id]), PLAY[id], `${id}: the first puzzle of its kind`);
    assert.equal((initialLive(GAMES[PROBLEMS[id]]) as { mode?: string }).mode, "puzzle", id);
  }
});
