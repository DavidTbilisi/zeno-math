// The graph problems give the right answers: on their examples, on cases picked to catch a slip (one node, no 1s, a
// self-loop, a bridge, a graph in two pieces), and on random inputs checked against working it out the slow way
// (recursion, flood fills square by square, every colouring, every cycle, removing each edge in turn); bad inputs say
// why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const G = w.graphs;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const pick = (r: () => number, n: number) => Math.floor(r() * n);
const NAMES = "ABCDEFGHIJKLMNO".split("");
const typeGrid = (g: number[][]) => g.map((row) => row.join(" ")).join("; ");
const randGrid = (r: () => number, R: number, C: number, p: number) => Array.from({ length: R }, () => Array.from({ length: C }, () => (r() < p ? 1 : 0)));
const four = (R: number, C: number, y: number, x: number) => [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < R && b < C);
/** The squares joined to (y, x) through squares that pass `ok`, by plain flood fill. */
function flood(R: number, C: number, y: number, x: number, ok: (a: number, b: number) => boolean): string[] {
  const seen = [`${y},${x}`];
  for (let k = 0; k < seen.length; k++) {
    const [a, b] = seen[k].split(",").map(Number);
    for (const [c, d] of four(R, C, a, b)) if (ok(c, d) && !seen.includes(`${c},${d}`)) seen.push(`${c},${d}`);
  }
  return seen;
}
/** A random tree: each node after the first hangs from an earlier one; the edges typed in a shuffled order. */
function randTree(r: () => number, n: number): { parent: number[]; typed: [number, number][] } {
  const parent = [-1, ...Array.from({ length: n - 1 }, (_, i) => pick(r, i + 1))];
  const typed = parent.flatMap((p, i) => (p < 0 ? [] : [[p, i] as [number, number]]));
  for (let i = typed.length - 1; i > 0; i--) {
    const j = pick(r, i + 1);
    [typed[i], typed[j]] = [typed[j], typed[i]];
  }
  return { parent, typed };
}

test("depth-first search", () => {
  assert.equal(answer("depthFirstSearch", "M-K, M-T, K-A, K-Z, T-B, T-Q, T-R, Z-E"), "Depth-first order: [M, K, A, Z, E, T, B, Q, R]");
  assert.equal(answer("depthFirstSearch", "A"), "Depth-first order: [A]");
  assert.equal(answer("depthFirstSearch", "B-C, A-B"), "Depth-first order: [A, B, C]");
  const r = rng(21);
  for (let k = 0; k < 150; k++) {
    const { typed } = randTree(r, 2 + (k % 13));
    const kids = (v: number) => typed.filter(([p]) => p === v).map(([, c]) => c);
    const out: number[] = [];
    const go = (v: number) => (out.push(v), kids(v).forEach(go));
    go(0);
    assert.equal(answer("depthFirstSearch", typed.map(([p, c]) => `${NAMES[p]}-${NAMES[c]}`).join(", ")), `Depth-first order: [${out.map((i) => NAMES[i]).join(", ")}]`);
  }
  assert.throws(() => answer("depthFirstSearch", "A-B, C-B"), /isn't one tree/);
  assert.throws(() => answer("depthFirstSearch", "A-B, B-A"), /isn't one tree/);
});

test("breadth-first search", () => {
  assert.equal(answer("breadthFirstSearch", "S-L, S-H, L-C, L-G, H-P, C-N, P-K, P-D"), "Breadth-first order: [S, L, H, C, G, P, N, K, D]");
  assert.equal(answer("breadthFirstSearch", "Q"), "Breadth-first order: [Q]");
  const r = rng(22);
  for (let k = 0; k < 150; k++) {
    const { typed } = randTree(r, 2 + (k % 13));
    const out = [0];
    for (let i = 0; i < out.length; i++) out.push(...typed.filter(([p]) => p === out[i]).map(([, c]) => c));
    assert.equal(answer("breadthFirstSearch", typed.map(([p, c]) => `${NAMES[p]}-${NAMES[c]}`).join(", ")), `Breadth-first order: [${out.map((i) => NAMES[i]).join(", ")}]`);
  }
  assert.throws(() => answer("breadthFirstSearch", "A-B, C-D"), /isn't one tree/);
});

test("single cycle check", () => {
  assert.equal(answer("singleCycleCheck", "2, -3, 3, -3, -1, -4"), "Yes: every entry is visited once, and jump 6 lands back on index 0.");
  assert.equal(answer("singleCycleCheck", "1, -1, 1"), "No: the walk is back at 0 after 2 of the 3 jumps, so some entries are never visited.");
  assert.equal(answer("singleCycleCheck", "1, 1, 0"), "No: after 3 jumps the walk is at index 2, not back at 0.");
  assert.equal(answer("singleCycleCheck", "5"), "Yes: every entry is visited once, and jump 1 lands back on index 0.");
  const r = rng(23);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 8), -9, 9);
    const n = xs.length;
    const seen = new Set<number>();
    let i = 0;
    for (let j = 0; j < n; j++) seen.add(i), (i = (((i + xs[i]) % n) + n) % n);
    const yes = seen.size === n && i === 0;
    assert.equal(answer("singleCycleCheck", xs.join(", ")).startsWith("Yes"), yes, `${xs}`);
  }
  assert.throws(() => answer("singleCycleCheck", "1, 2.5"), /whole/);
});

test("river sizes", () => {
  assert.equal(answer("riverSizes", "1 0 0 1 1; 1 1 0 0 1; 0 0 1 0 1; 1 0 1 1 0; 1 0 0 0 1"), "The river sizes: [3, 4, 3, 2, 1]");
  assert.equal(answer("riverSizes", "0 0; 0 0"), G.riverSizes.none);
  assert.equal(answer("riverSizes", "1 1; 1 1"), "The river sizes: [4]");
  const r = rng(24);
  for (let k = 0; k < 150; k++) {
    const [R, C] = [1 + (k % 6), 1 + pick(r, 8)];
    const g = randGrid(r, R, C, 0.5);
    const seen = new Set<string>();
    const sizes: number[] = [];
    for (let y = 0; y < R; y++)
      for (let x = 0; x < C; x++) {
        if (!g[y][x] || seen.has(`${y},${x}`)) continue;
        const river = flood(R, C, y, x, (a, b) => g[a][b] === 1);
        river.forEach((s) => seen.add(s));
        sizes.push(river.length);
      }
    assert.equal(answer("riverSizes", typeGrid(g)), sizes.length ? `The river sizes: [${sizes.join(", ")}]` : G.riverSizes.none, typeGrid(g));
  }
  assert.throws(() => answer("riverSizes", "1 2"), /doesn't fit/);
  assert.throws(() => answer("riverSizes", "1 0; 1"), /as many entries/);
});

test("youngest common ancestor", () => {
  assert.equal(answer("youngestCommonAncestor", "B>A, C>A, D>B, E>B, F>C, G>D, H>D, I>E, J>G", "A", "J", "I"), "The youngest common ancestor of J and I is B.");
  assert.equal(answer("youngestCommonAncestor", "B>A, C>B", "A", "C", "B"), "The youngest common ancestor of C and B is B.");
  assert.equal(answer("youngestCommonAncestor", "B>A, C>A", "A", "B", "B"), "The youngest common ancestor of B and B is B.");
  const r = rng(25);
  for (let k = 0; k < 150; k++) {
    const n = 2 + (k % 13);
    const { parent, typed } = randTree(r, n);
    const [a, b] = [pick(r, n), pick(r, n)];
    const up = (v: number) => {
      const out = [v];
      while (parent[out[out.length - 1]] >= 0) out.push(parent[out[out.length - 1]]);
      return out;
    };
    const mine = up(a);
    const want = up(b).find((v) => mine.includes(v))!;
    const links = typed.map(([p, c]) => `${NAMES[c]}>${NAMES[p]}`).join(", ");
    assert.equal(answer("youngestCommonAncestor", links, "A", NAMES[a], NAMES[b]), `The youngest common ancestor of ${NAMES[a]} and ${NAMES[b]} is ${NAMES[want]}.`, links);
  }
  assert.throws(() => answer("youngestCommonAncestor", "B>A, C>A", "B", "B", "C"), /isn't the top ancestor/);
  assert.throws(() => answer("youngestCommonAncestor", "B>A, C>A", "A", "Z", "C"), /isn't in the tree/);
  assert.throws(() => answer("youngestCommonAncestor", "B>A, B>C", "A", "B", "C"), /family tree/);
});

test("remove islands", () => {
  assert.equal(
    answer("removeIslands", "1 0 0 0 1 0; 0 1 1 0 1 0; 0 0 1 0 0 0; 1 0 0 1 1 0; 1 1 0 1 0 1"),
    "The matrix without its islands: [1, 0, 0, 0, 1, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0], [1, 0, 0, 1, 1, 0], [1, 1, 0, 1, 0, 1]",
  );
  assert.equal(answer("removeIslands", "0 0 0; 0 1 0; 0 0 0"), "The matrix without its islands: [0, 0, 0], [0, 0, 0], [0, 0, 0]");
  const r = rng(26);
  for (let k = 0; k < 150; k++) {
    const [R, C] = [1 + (k % 7), 1 + pick(r, 8)];
    const g = randGrid(r, R, C, 0.55);
    const out = g.map((row, y) => row.map((v, x) => (v && flood(R, C, y, x, (a, b) => g[a][b] === 1).some((s) => {
      const [a, b] = s.split(",").map(Number);
      return a === 0 || b === 0 || a === R - 1 || b === C - 1;
    }) ? 1 : 0)));
    assert.equal(answer("removeIslands", typeGrid(g)), `The matrix without its islands: ${out.map((row) => `[${row.join(", ")}]`).join(", ")}`, typeGrid(g));
  }
});

/** Does a directed graph have a cycle? The slow way: keep removing vertices with nothing coming in. */
function hasCycle(n: number, es: [number, number][]): boolean {
  const left = new Set(Array.from({ length: n }, (_, i) => i));
  for (let moved = true; moved; ) {
    moved = false;
    for (const v of left)
      if (!es.some(([a, b]) => b === v && left.has(a))) {
        left.delete(v);
        moved = true;
      }
  }
  return left.size > 0;
}

test("cycle in graph", () => {
  assert.equal(answer("cycleInGraph", "A>B, B>C, A>C, A>D, D>E, E>A"), "Yes: A → D → E → A is a cycle.");
  assert.equal(answer("cycleInGraph", "A>B, B>C, A>C"), G.cycleInGraph.no);
  assert.equal(answer("cycleInGraph", "A>A"), "Yes: A → A is a cycle.");
  const r = rng(27);
  for (let k = 0; k < 200; k++) {
    const n = 1 + (k % 7);
    const es = Array.from({ length: 1 + pick(r, 9) }, () => [pick(r, n), pick(r, n)] as [number, number]);
    const typed = es.map(([a, b]) => `${NAMES[a]}>${NAMES[b]}`).join(", ");
    const got = answer("cycleInGraph", typed);
    assert.equal(got.startsWith("Yes"), hasCycle(n, es), typed);
    if (got.startsWith("Yes")) {
      const c = got.match(/Yes: (.*) is a cycle/)![1].split(" → ").map((x) => NAMES.indexOf(x));
      assert.equal(c[0], c[c.length - 1], got);
      for (let i = 0; i + 1 < c.length; i++) assert.ok(es.some(([a, b]) => a === c[i] && b === c[i + 1]), `${typed}: ${got}`);
    }
  }
  assert.throws(() => answer("cycleInGraph", "A>B, B-C"), /has no direction/);
  assert.throws(() => answer("cycleInGraph", "Paris>Rome"), /At most 3 characters/);
});

test("minimum passes of matrix", () => {
  assert.equal(answer("minimumPassesOfMatrix", "0, -2, -1, 3; -4, 0, -5, -1; 2, -3, 0, -6"), "The fewest passes: 2.");
  assert.equal(answer("minimumPassesOfMatrix", "1, 0, -1"), G.minimumPassesOfMatrix.never);
  assert.equal(answer("minimumPassesOfMatrix", "1, 2; 0, 3"), "The fewest passes: 0.");
  assert.equal(answer("minimumPassesOfMatrix", "-1, -2"), G.minimumPassesOfMatrix.never);
  const r = rng(28);
  for (let k = 0; k < 150; k++) {
    const [R, C] = [1 + (k % 6), 1 + pick(r, 7)];
    let g = Array.from({ length: R }, () => randInts(r, C, -9, 9));
    const typed = g.map((row) => row.join(", ")).join("; ");
    // The slow way: a pass at a time, each looking at the matrix as the last one left it.
    let passes = 0;
    for (;;) {
      const next = g.map((row, y) => row.map((v, x) => (v < 0 && four(R, C, y, x).some(([a, b]) => g[a][b] > 0) ? -v : v)));
      if (next.flat().every((v, i) => v === g.flat()[i])) break;
      g = next;
      passes++;
    }
    const want = g.flat().some((v) => v < 0) ? G.minimumPassesOfMatrix.never : `The fewest passes: ${passes}.`;
    assert.equal(answer("minimumPassesOfMatrix", typed), want, typed);
  }
});

test("two-colorable", () => {
  assert.equal(answer("twoColorable", "A-B, B-C, C-D, D-E, E-F, F-A, B-E"), "Yes: A, C, E take one colour and B, D, F the other.");
  assert.equal(answer("twoColorable", "A-B, B-C, C-A"), "No: C and B are joined and must share a colour.");
  assert.equal(answer("twoColorable", "A-B, C-C"), "No: C is joined to itself.");
  assert.equal(answer("twoColorable", "A-B, C-D"), "Yes: A, C take one colour and B, D the other.");
  const r = rng(29);
  for (let k = 0; k < 200; k++) {
    const n = 2 + (k % 6);
    const es = Array.from({ length: 1 + pick(r, 8) }, () => [pick(r, n), pick(r, n)] as [number, number]);
    let some = false;
    for (let m = 0; m < 1 << n && !some; m++) some = es.every(([a, b]) => ((m >> a) & 1) !== ((m >> b) & 1));
    const typed = es.map(([a, b]) => `${NAMES[a]}-${NAMES[b]}`).join(", ");
    const got = answer("twoColorable", typed);
    assert.equal(got.startsWith("Yes"), some, typed);
    if (some) {
      const [one, two] = got.match(/Yes: (.*) take one colour and (.*) the other/)!.slice(1).map((s) => s.split(", "));
      for (const [a, b] of es) assert.notEqual(one.includes(NAMES[a]), one.includes(NAMES[b]), typed);
      assert.equal(one.length + two.length, new Set(es.flat()).size, typed);
    }
  }
});

test("boggle board", () => {
  assert.equal(answer("boggleBoard", "t e a m; r o s e; p e n t; l a i d", "tea, team, rose, rope, sent, ten"), "The words on the board: “tea”, “team”, “rose”, “rope”, “sent”, “ten”");
  assert.equal(answer("boggleBoard", "ab; cd", "abc, dcba, aa"), "The words on the board: “abc”, “dcba”");
  assert.equal(answer("boggleBoard", "ab; cd", "zz"), G.boggleBoard.none);
  const r = rng(30);
  for (let k = 0; k < 150; k++) {
    const [R, C] = [1 + (k % 4), 1 + pick(r, 4)];
    const board = Array.from({ length: R }, () => randInts(r, C, 0, 2).map((x) => "abc"[x]));
    const ws = [...new Set(Array.from({ length: 3 }, () => randInts(r, 1 + pick(r, 3), 0, 2).map((x) => "abc"[x]).join("")))];
    // The slow way: look for each word on its own, from every square.
    const on = (word: string) => {
      const used = board.map((row) => row.map(() => false));
      const go = (y: number, x: number, i: number): boolean => {
        if (y < 0 || x < 0 || y >= R || x >= C || used[y][x] || board[y][x] !== word[i]) return false;
        if (i === word.length - 1) return true;
        used[y][x] = true;
        let ok = false;
        for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1 && !ok; dx++) ok = go(y + dy, x + dx, i + 1);
        used[y][x] = false;
        return ok;
      };
      return board.some((row, y) => row.some((_, x) => go(y, x, 0)));
    };
    const want = ws.filter(on);
    const typed = board.map((row) => row.join(" ")).join("; ");
    assert.equal(answer("boggleBoard", typed, ws.join(", ")), want.length ? `The words on the board: ${want.map((x) => `“${x}”`).join(", ")}` : G.boggleBoard.none, `${typed} / ${ws}`);
  }
  assert.throws(() => answer("boggleBoard", "ab; cd", "abcdef, bcdefa, cdefab"), /trie/);
});

test("largest island", () => {
  assert.equal(answer("largestIsland", "0 1 1 0 0; 0 1 0 1 1; 1 1 1 1 0; 0 0 1 0 0"), "The largest island has size 6, by turning (1, 4) into land.");
  assert.equal(answer("largestIsland", "0 0; 0 0"), "There is no water: the whole grid is one island, of size 4.");
  assert.equal(answer("largestIsland", "1 1; 1 1"), "The largest island has size 1, by turning (0, 0) into land.");
  const r = rng(31);
  for (let k = 0; k < 150; k++) {
    const [R, C] = [1 + (k % 6), 1 + pick(r, 7)];
    const g = randGrid(r, R, C, 0.5);
    const biggest = (m: number[][]) => {
      let best = 0;
      m.forEach((row, y) => row.forEach((v, x) => v === 0 && (best = Math.max(best, flood(R, C, y, x, (a, b) => m[a][b] === 0).length))));
      return best;
    };
    let want = -1;
    let at = "";
    g.forEach((row, y) => row.forEach((v, x) => {
      if (!v) return;
      const m = g.map((rr) => [...rr]);
      m[y][x] = 0;
      const b = biggest(m);
      if (b > want) [want, at] = [b, `(${y}, ${x})`];
    }));
    const got = answer("largestIsland", typeGrid(g));
    if (want < 0) assert.equal(got, `There is no water: the whole grid is one island, of size ${R * C}.`);
    else assert.equal(got, `The largest island has size ${want}, by turning ${at} into land.`, typeGrid(g));
  }
});

test("detect arbitrage", () => {
  assert.equal(answer("detectArbitrage", "1, 0.8, 1.2; 1.25, 1, 1.6; 0.82, 0.62, 1"), "Yes: trading 1 → 2 → 0 → 1 multiplies money by 1.0496.");
  assert.equal(answer("detectArbitrage", "1, 2; 0.5, 1"), G.detectArbitrage.no);
  assert.equal(answer("detectArbitrage", "1, 0.5, 0.25; 2, 1, 0.5; 4, 2, 1"), G.detectArbitrage.no);
  const r = rng(32);
  for (let k = 0; k < 150; k++) {
    const n = 2 + (k % 4);
    // Rates in tenths, so a cycle's product is a fraction and exactly above 1 or not.
    const t = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 10 : 5 + pick(r, 16))));
    let some = false;
    const go = (path: number[]) => {
      for (let j = 0; j < n && !some; j++) {
        if (j === path[0]) {
          const cyc = [...path, j];
          let num = 1;
          for (let i = 0; i + 1 < cyc.length; i++) num *= t[cyc[i]][cyc[i + 1]];
          if (num > 10 ** (cyc.length - 1)) some = true;
        } else if (j > path[0] && !path.includes(j)) go([...path, j]);
      }
    };
    for (let s = 0; s < n; s++) go([s]);
    const typed = t.map((row) => row.map((v) => v / 10).join(", ")).join("; ");
    const got = answer("detectArbitrage", typed);
    assert.equal(got.startsWith("Yes"), some, typed);
    if (some) {
      const c = got.match(/trading (.*) multiplies/)![1].split(" → ").map(Number);
      let p = 1;
      for (let i = 0; i + 1 < c.length; i++) p *= t[c[i]][c[i + 1]] / 10;
      assert.equal(c[0], c[c.length - 1], got);
      assert.ok(p > 1, `${typed}: ${got}`);
    }
  }
  assert.throws(() => answer("detectArbitrage", "1, 2"), /as many rows as columns/);
  assert.throws(() => answer("detectArbitrage", "1, 0; 1, 1"), /above 0/);
});

test("two-edge-connected graph", () => {
  assert.equal(answer("twoEdgeConnectedGraph", "A-B, B-C, C-A, C-D, D-E, E-F, F-D"), "No: removing the edge C–D cuts the graph in two.");
  assert.equal(answer("twoEdgeConnectedGraph", "A-B, B-C, C-A, C-D, D-E, E-C"), G.twoEdgeConnectedGraph.yes);
  assert.equal(answer("twoEdgeConnectedGraph", "A-B, A-B"), G.twoEdgeConnectedGraph.yes);
  assert.equal(answer("twoEdgeConnectedGraph", "A-B, B-A, C-D, D-C"), G.twoEdgeConnectedGraph.noApart);
  const r = rng(33);
  for (let k = 0; k < 200; k++) {
    const n = 2 + (k % 6);
    const es = Array.from({ length: 1 + pick(r, 10) }, () => [pick(r, n), pick(r, n)] as [number, number]).filter(([a, b]) => a !== b);
    if (!es.length) continue;
    const names = [...new Set(es.flat())];
    const joined = (skip: number) => {
      const seen = [names[0]];
      for (let i = 0; i < seen.length; i++) for (const [x, [a, b]] of es.entries()) if (x !== skip && (a === seen[i] || b === seen[i])) for (const v of [a, b]) if (!seen.includes(v)) seen.push(v);
      return seen.length === names.length;
    };
    const want = joined(-1) && es.every((_, x) => joined(x));
    const typed = es.map(([a, b]) => `${NAMES[a]}-${NAMES[b]}`).join(", ");
    const got = answer("twoEdgeConnectedGraph", typed);
    assert.equal(got === G.twoEdgeConnectedGraph.yes, want, typed);
    const m = got.match(/the edge (\w)–(\w) cuts/);
    if (m) {
      const x = es.findIndex(([a, b]) => (NAMES[a] === m[1] && NAMES[b] === m[2]) || (NAMES[a] === m[2] && NAMES[b] === m[1]));
      assert.ok(!joined(x), `${typed}: ${got}`);
    }
  }
});

test("airport connections", () => {
  assert.equal(answer("airportConnections", "S, A, B, C, D, E, F, G", "S>A, A>B, C>D, D>C, D>E, F>G, G>F, E>B", "S"), "The fewest new routes: 2 (S→C, S→F).");
  assert.equal(answer("airportConnections", "S, A", "S>A", "S"), "No new routes: every airport is reachable from S already.");
  assert.equal(answer("airportConnections", "S, A, B", "", "S"), "The fewest new routes: 2 (S→A, S→B).");
  const r = rng(34);
  for (let k = 0; k < 150; k++) {
    const n = 2 + (k % 6);
    const es = Array.from({ length: pick(r, 9) }, () => [pick(r, n), pick(r, n)] as [number, number]);
    const s = pick(r, n);
    const covers = (from: number[]) => {
      const seen = [...from];
      for (let i = 0; i < seen.length; i++) for (const [a, b] of es) if (a === seen[i] && !seen.includes(b)) seen.push(b);
      return seen.length === n;
    };
    // The slow way: the smallest set of airports which, with the start, reach everything.
    let want = 0;
    for (let m = 0; m < 1 << n; m++) {
      const set = Array.from({ length: n }, (_, i) => i).filter((i) => (m >> i) & 1);
      if ((want === 0 || set.length < want) && covers([s, ...set])) want = set.length || -1;
      if (want === -1) break;
    }
    if (want === -1) want = 0;
    const got = answer("airportConnections", NAMES.slice(0, n).join(", "), es.map(([a, b]) => `${NAMES[a]}>${NAMES[b]}`).join(", "), NAMES[s]);
    assert.equal(want === 0 ? 0 : Number(got.match(/routes: (\d+)/)![1]), want, `${es} from ${s}: ${got}`);
  }
  assert.throws(() => answer("airportConnections", "S, A", "S>Z", "S"), /isn't one of the airports/);
  assert.throws(() => answer("airportConnections", "S, A", "S-A", "S"), /has no direction/);
  assert.throws(() => answer("airportConnections", "S, S", "", "S"), /doesn't fit/);
});
