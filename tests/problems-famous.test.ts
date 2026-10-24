// The famous algorithms give the right answers: on their examples, on cases picked to catch a slip (all negative, a
// cycle, a vertex out of reach, a wall in the way), and on random inputs checked against working it out the slow way
// (every subarray, every matching, every spanning tree, Bellman–Ford, breadth-first search); bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const F = w.famous;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const pick = (r: () => number, n: number) => Math.floor(r() * n);
const num = (s: string) => Number(s.replace("−", "-"));
const NAMES = "ABCDEFGHIJ".split("");
const shuffle = <T>(r: () => number, a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = pick(r, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const perms = (n: number): number[][] => (n === 0 ? [[]] : perms(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)])));

test("Kadane's algorithm", () => {
  assert.equal(answer("kadanesAlgorithm", "3, -5, 4, -1, 2, 1, -6, 5, -2"), "The largest sum is 6: a[2] to a[5], [4, −1, 2, 1].");
  assert.equal(answer("kadanesAlgorithm", "-3, -1, -2"), "The largest sum is −1: a[1] to a[1], [−1].");
  assert.equal(answer("kadanesAlgorithm", "7"), "The largest sum is 7: a[0] to a[0], [7].");
  const r = rng(11);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 12), -9, 9);
    let best = -Infinity;
    for (let i = 0; i < xs.length; i++) for (let j = i; j < xs.length; j++) best = Math.max(best, xs.slice(i, j + 1).reduce((a, b) => a + b, 0));
    const m = answer("kadanesAlgorithm", xs.join(", ")).match(/is (−?\d+): a\[(\d+)\] to a\[(\d+)\]/)!;
    assert.equal(num(m[1]), best, `${xs}`);
    assert.equal(xs.slice(+m[2], +m[3] + 1).reduce((a, b) => a + b, 0), best, `${xs}`);
  }
  assert.throws(() => answer("kadanesAlgorithm", "1, x"), /isn't a number/);
});

test("stable internships", () => {
  assert.equal(answer("stableInternships", "0 1 2; 0 2 1; 1 0 2", "2 1 0; 0 1 2; 1 0 2"), "The pairs [intern, team]: [0, 1], [1, 2], [2, 0]");
  assert.equal(answer("stableInternships", "0", "0"), "The pairs [intern, team]: [0, 0]");
  const r = rng(12);
  for (let k = 0; k < 150; k++) {
    const n = 1 + (k % 5);
    const interns = Array.from({ length: n }, () => shuffle(r, [...Array(n).keys()]));
    const teams = Array.from({ length: n }, () => shuffle(r, [...Array(n).keys()]));
    const got = [...answer("stableInternships", interns.map((x) => x.join(" ")).join("; "), teams.map((x) => x.join(" ")).join("; ")).matchAll(/\[(\d+), (\d+)\]/g)].map((m) => [+m[1], +m[2]]);
    // The slow way: every matching, keep the stable ones, and give each intern the best team any of them gives.
    const rankI = interns.map((p) => p.reduce((a, t, i) => ((a[t] = i), a), [] as number[]));
    const rankT = teams.map((p) => p.reduce((a, t, i) => ((a[t] = i), a), [] as number[]));
    const stable = perms(n).filter((m) => {
      const holder = m.reduce((a, t, i) => ((a[t] = i), a), [] as number[]);
      return m.every((t, i) => interns[i].slice(0, rankI[i][t]).every((u) => rankT[u][holder[u]] < rankT[u][i]));
    });
    const best = Array.from({ length: n }, (_, i) => stable.map((m) => m[i]).sort((a, b) => rankI[i][a] - rankI[i][b])[0]);
    assert.deepEqual(got, best.map((t, i) => [i, t]), `${interns} / ${teams}`);
  }
  assert.throws(() => answer("stableInternships", "0 1; 1 1", "0 1; 1 0"), /once/);
  assert.throws(() => answer("stableInternships", "0 1; 1 0", "0"), /same number/);
});

test("union find", () => {
  assert.equal(answer("unionFind", "createSet 1, createSet 2, createSet 3, createSet 4, createSet 5, union 1 2, union 3 4, union 4 5, union 2 4, find 5, find 1"), "The finds give 5 → 1, 1 → 1.");
  assert.equal(answer("unionFind", "createSet 1, find 2"), "The finds give 2 → none.");
  assert.equal(answer("unionFind", "createSet 1, createSet 2, createSet 3, union 1 2"), "No find was asked; the sets are [1, 2], [3].");
  assert.equal(answer("unionFind", "createSet 1, union 1 9, find 1"), "The finds give 1 → 1.");
  const r = rng(13);
  for (let k = 0; k < 150; k++) {
    const made = [...new Set(randInts(r, 1 + (k % 8), 0, 9))];
    const ops = made.map((x) => `createSet ${x}`);
    const group = new Map(made.map((x) => [x, x]));
    for (let u = 0; u < 6; u++) {
      const [a, b] = randInts(r, 2, 0, 9);
      ops.push(`union ${a} ${b}`);
      if (group.has(a) && group.has(b)) {
        const [ga, gb] = [group.get(a)!, group.get(b)!];
        for (const [x, g] of group) if (g === gb) group.set(x, ga);
      }
    }
    const asked = randInts(r, 5, 0, 9);
    ops.push(...asked.map((x) => `find ${x}`));
    const got = answer("unionFind", ops.join(", ")).replace(/^The finds give /, "").replace(/\.$/, "").split(", ").map((x) => x.split(" → ")[1]);
    asked.forEach((x, i) => {
      if (!group.has(x)) return assert.equal(got[i], "none", ops.join(", "));
      // The root named is in x's set, and two finds agree exactly when their values share a set.
      assert.equal(group.get(Number(got[i])), group.get(x), ops.join(", "));
      asked.forEach((y, j) => group.has(y) && assert.equal(got[i] === got[j], group.get(x) === group.get(y), ops.join(", ")));
    });
  }
  assert.throws(() => answer("unionFind", "push 3"), /isn't an operation/);
  assert.throws(() => answer("unionFind", "union 3"), /isn't an operation/);
});

test("Dijkstra's algorithm", () => {
  assert.equal(answer("dijkstrasAlgorithm", "A, B, C, D, E, F", "A>B 4, A>C 1, C>B 2, B>D 1, C>D 5, D>E 3", "A"), "The shortest distances from A to A, B, C, D, E, F: [0, 3, 1, 4, 7, −1]");
  assert.equal(answer("dijkstrasAlgorithm", "A, B", "", "B"), "The shortest distances from B to A, B: [−1, 0]");
  assert.equal(answer("dijkstrasAlgorithm", "A, B, C", "A-B 2, B>C 0", "C"), "The shortest distances from C to A, B, C: [−1, −1, 0]");
  const r = rng(14);
  for (let k = 0; k < 150; k++) {
    const n = 2 + (k % 6);
    const arcs: [number, number, number][] = [];
    const typed: string[] = [];
    for (let m = 0; m < 1 + pick(r, 10); m++) {
      const [a, b, c] = [pick(r, n), pick(r, n), pick(r, 10)];
      const both = r() < 0.3;
      typed.push(`${NAMES[a]}${both ? "-" : ">"}${NAMES[b]} ${c}`);
      arcs.push([a, b, c]);
      if (both) arcs.push([b, a, c]);
    }
    const s = pick(r, n);
    const d = Array.from({ length: n }, (_, i) => (i === s ? 0 : Infinity));
    for (let it = 0; it < n; it++) for (const [a, b, c] of arcs) if (d[a] + c < d[b]) d[b] = d[a] + c;
    const want = `[${d.map((x) => (x === Infinity ? "−1" : x)).join(", ")}]`;
    assert.ok(answer("dijkstrasAlgorithm", NAMES.slice(0, n).join(", "), typed.join(", "), NAMES[s]).endsWith(want), typed.join(", "));
  }
  assert.throws(() => answer("dijkstrasAlgorithm", "A, B", "A>B -2", "A"), /negative/);
  assert.throws(() => answer("dijkstrasAlgorithm", "A, B", "A>C 2", "A"), /isn't one of the vertices/);
  assert.throws(() => answer("dijkstrasAlgorithm", "A, B", "A>B 2", "Z"), /isn't one of the vertices/);
});

test("topological sort", () => {
  assert.equal(answer("topologicalSort", "1, 2, 3, 4, 5, 6", "1>3, 2>3, 3>5, 4>5, 2>6, 6>4"), "An order: [1, 2, 3, 6, 4, 5]");
  assert.equal(answer("topologicalSort", "1, 2, 3", ""), "An order: [1, 2, 3]");
  assert.equal(answer("topologicalSort", "1, 2, 3", "1>2, 2>3, 3>2"), F.topologicalSort.none);
  assert.equal(answer("topologicalSort", "1", "1>1"), F.topologicalSort.none);
  const r = rng(15);
  for (let k = 0; k < 150; k++) {
    const n = 1 + (k % 6);
    const deps = Array.from({ length: pick(r, 8) }, () => [pick(r, n), pick(r, n)]);
    const ok = (order: number[]) => deps.every(([a, b]) => order.indexOf(a) < order.indexOf(b));
    const any = perms(n).some(ok);
    const got = answer("topologicalSort", Array.from({ length: n }, (_, i) => i + 1).join(", "), deps.map(([a, b]) => `${a + 1}>${b + 1}`).join(", "));
    if (!any) assert.equal(got, F.topologicalSort.none, `${deps}`);
    else {
      const order = got.match(/\[(.*)\]/)![1].split(", ").map((x) => Number(x) - 1);
      assert.deepEqual([...order].sort(), [...Array(n).keys()], `${deps}`);
      assert.ok(ok(order), `${deps} → ${got}`);
    }
  }
  assert.throws(() => answer("topologicalSort", "1, 2", "1>7"), /isn't one of the jobs/);
});

/** A random connected graph: a random tree, then a few more edges. */
function connectedGraph(r: () => number, n: number, extra: number): [number, number, number][] {
  const es: [number, number, number][] = [];
  for (let i = 1; i < n; i++) es.push([pick(r, i), i, 1 + pick(r, 9)]);
  for (let k = 0; k < extra; k++) {
    const [a, b] = [pick(r, n), pick(r, n)];
    if (a !== b) es.push([a, b, 1 + pick(r, 9)]);
  }
  return shuffle(r, es);
}
/** The cheapest spanning tree, the slow way: every set of n − 1 edges that joins everything. */
function cheapest(n: number, es: [number, number, number][]): number {
  let best = Infinity;
  const go = (from: number, chosen: number[]) => {
    if (chosen.length === n - 1) {
      const p = Array.from({ length: n }, (_, i) => i);
      const find = (x: number): number => (p[x] === x ? x : find(p[x]));
      let ok = true;
      for (const k of chosen) {
        const [a, b] = [find(es[k][0]), find(es[k][1])];
        if (a === b) ok = false;
        p[a] = b;
      }
      if (ok) best = Math.min(best, chosen.reduce((t, k) => t + es[k][2], 0));
      return;
    }
    for (let k = from; k < es.length; k++) go(k + 1, [...chosen, k]);
  };
  go(0, []);
  return best;
}
/** The tree an answer names: its edges span every vertex, and their weights add up to the total it says. */
function treeOf(got: string, n: number): number {
  const parts = [...got.matchAll(/([A-J])–([A-J]) (\d+)/g)].map((m) => [NAMES.indexOf(m[1]), NAMES.indexOf(m[2]), +m[3]]);
  assert.equal(parts.length, n - 1, got);
  const p = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (p[x] === x ? x : find(p[x]));
  for (const [a, b] of parts) {
    assert.notEqual(find(a), find(b), got);
    p[find(a)] = find(b);
  }
  const t = Number(got.match(/total (\d+)/)![1]);
  assert.equal(parts.reduce((s, x) => s + x[2], 0), t, got);
  return t;
}

test("Kruskal's algorithm", () => {
  assert.equal(answer("kruskalsAlgorithm", "A-B 4, A-C 1, B-C 2, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3"), "A minimum spanning tree: A–C 1, B–C 2, D–E 2, E–F 3, B–D 5; total 13.");
  assert.equal(answer("kruskalsAlgorithm", "A-B 3"), "A minimum spanning tree: A–B 3; total 3.");
  assert.equal(answer("kruskalsAlgorithm", "A-B -2, B-C 1, A-C 0"), "A minimum spanning tree: A–B −2, A–C 0; total −2.");
  const r = rng(16);
  for (let k = 0; k < 120; k++) {
    const n = 2 + (k % 5);
    const es = connectedGraph(r, n, pick(r, 5));
    const typed = es.map(([a, b, c]) => `${NAMES[a]}-${NAMES[b]} ${c}`).join(", ");
    const got = answer("kruskalsAlgorithm", typed);
    assert.equal(treeOf(got, n), cheapest(n, es), typed);
  }
  assert.throws(() => answer("kruskalsAlgorithm", "A-B 1, C-D 2"), /connected/);
  assert.throws(() => answer("kruskalsAlgorithm", "A-B"), /isn't an edge/);
});

test("Prim's algorithm", () => {
  assert.equal(answer("primsAlgorithm", "P-Q 3, P-R 1, Q-R 2, Q-S 4, R-S 5, S-T 2, R-T 6", "P"), "A minimum spanning tree: P–R 1, R–Q 2, Q–S 4, S–T 2; total 9.");
  assert.equal(answer("primsAlgorithm", "A-B 3", "B"), "A minimum spanning tree: B–A 3; total 3.");
  const r = rng(17);
  for (let k = 0; k < 120; k++) {
    const n = 2 + (k % 5);
    const es = connectedGraph(r, n, pick(r, 5));
    const typed = es.map(([a, b, c]) => `${NAMES[a]}-${NAMES[b]} ${c}`).join(", ");
    const got = answer("primsAlgorithm", typed, NAMES[pick(r, n)]);
    assert.equal(treeOf(got, n), cheapest(n, es), typed);
  }
  assert.throws(() => answer("primsAlgorithm", "A-B 1, C-D 2", "A"), /connected/);
  assert.throws(() => answer("primsAlgorithm", "A-B 1", "Q"), /isn't one of the vertices/);
});

test("Knuth–Morris–Pratt algorithm", () => {
  assert.equal(answer("knuthMorrisPrattAlgorithm", "aabaacaabaaa", "aabaaa"), "Yes: the text contains the pattern, from index 6.");
  assert.equal(answer("knuthMorrisPrattAlgorithm", "abc", "abcd"), F.knuthMorrisPrattAlgorithm.no);
  assert.equal(answer("knuthMorrisPrattAlgorithm", "aaaa", "a"), "Yes: the text contains the pattern, from index 0.");
  const r = rng(18);
  for (let k = 0; k < 200; k++) {
    const t = randInts(r, 1 + (k % 14), 0, 1).map((x) => "ab"[x]).join("");
    const p = randInts(r, 1 + (k % 5), 0, 1).map((x) => "ab"[x]).join("");
    const at = t.indexOf(p);
    assert.equal(answer("knuthMorrisPrattAlgorithm", t, p), at >= 0 ? `Yes: the text contains the pattern, from index ${at}.` : F.knuthMorrisPrattAlgorithm.no, `${t} / ${p}`);
  }
  assert.throws(() => answer("knuthMorrisPrattAlgorithm", "a".repeat(15), "a"), /At most 14/);
});

test("A* algorithm", () => {
  assert.equal(
    answer("aStarAlgorithm", "0 0 0 0 0 0; 0 1 1 1 1 0; 0 0 0 0 1 0; 1 1 1 0 1 0; 0 0 0 0 0 0", "2, 0", "4, 0"),
    "A shortest path, 8 steps: [2, 0], [2, 1], [2, 2], [2, 3], [3, 3], [4, 3], [4, 2], [4, 1], [4, 0]",
  );
  assert.equal(answer("aStarAlgorithm", "0 1 0", "0, 0", "0, 2"), F.aStarAlgorithm.none);
  assert.equal(answer("aStarAlgorithm", "0", "0, 0", "0, 0"), "A shortest path, 0 steps: [0, 0]");
  const r = rng(19);
  for (let k = 0; k < 150; k++) {
    const [R, C] = [2 + (k % 5), 2 + pick(r, 6)];
    const g = Array.from({ length: R }, () => Array.from({ length: C }, () => (r() < 0.3 ? 1 : 0)));
    const [s, e] = [[pick(r, R), pick(r, C)], [pick(r, R), pick(r, C)]];
    g[s[0]][s[1]] = g[e[0]][e[1]] = 0;
    // Breadth-first search for the length of a shortest path.
    const dist = g.map((row) => row.map(() => -1));
    dist[s[0]][s[1]] = 0;
    const q = [s];
    while (q.length) {
      const [y, x] = q.shift()!;
      for (const [a, b] of [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]])
        if (a >= 0 && b >= 0 && a < R && b < C && !g[a][b] && dist[a][b] < 0) (dist[a][b] = dist[y][x] + 1), q.push([a, b]);
    }
    const typed = g.map((row) => row.join(" ")).join("; ");
    const got = answer("aStarAlgorithm", typed, s.join(", "), e.join(", "));
    const want = dist[e[0]][e[1]];
    if (want < 0) {
      assert.equal(got, F.aStarAlgorithm.none, typed);
      continue;
    }
    const path = [...got.matchAll(/\[(\d+), (\d+)\]/g)].map((m) => [+m[1], +m[2]]);
    assert.equal(path.length - 1, want, typed);
    assert.deepEqual(path[0], s);
    assert.deepEqual(path[path.length - 1], e);
    path.forEach(([y, x], i) => {
      assert.equal(g[y][x], 0, typed);
      if (i) assert.equal(Math.abs(y - path[i - 1][0]) + Math.abs(x - path[i - 1][1]), 1, typed);
    });
  }
  assert.throws(() => answer("aStarAlgorithm", "0 1", "0, 1", "0, 0"), /is a wall/);
  assert.throws(() => answer("aStarAlgorithm", "0 0", "0, 5", "0, 0"), /outside/);
  assert.throws(() => answer("aStarAlgorithm", "0 2", "0, 0", "0, 0"), /doesn't fit/);
});
