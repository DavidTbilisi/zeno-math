// The graph games' shared graphs: drawn without crossings and always joined up, and the maths asked of them (degrees,
// loops, colourings, shortest distances, the cheapest network) checked against hand-made graphs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import { cheapestNetwork, chromatic, clashes, colourWith, degrees, distances, edgeName, graphSvg, hasOddLoop, joinsAll, latticeGraph, loopEdges, oddVertices, routeLength, withLengths, type Graph } from "../src/math/graphPlay.ts";

/** Whether two segments cross away from their ends. */
const cross = (p: number[], q: number[], r: number[], s: number[]) => {
  const side = (a: number[], b: number[], c: number[]) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return side(p, q, r) * side(p, q, s) < 0 && side(r, s, p) * side(r, s, q) < 0;
};

test("lattice graphs: joined up, edges between neighbours only, no two edges crossing unless asked to", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const [cols, rows] = seed % 2 ? [3, 3] : [4, 3];
    const g = latticeGraph(cols, rows, 0.5, rng(seed), { diagonals: true });
    assert.equal(g.pts.length, cols * rows);
    assert.ok(joinsAll(g), `seed ${seed}`);
    assert.equal(new Set(g.edges.map((e) => e.join())).size, g.edges.length);
    for (const [a, b] of g.edges) assert.ok(Math.abs((a % cols) - (b % cols)) <= 1 && Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) <= 1, `seed ${seed}: ${a}–${b}`);
    for (const [i, [a, b]] of g.edges.entries())
      for (const [c, d] of g.edges.slice(i + 1)) if (new Set([a, b, c, d]).size === 4) assert.ok(!cross(g.pts[a], g.pts[b], g.pts[c], g.pts[d]), `seed ${seed}: ${a}–${b} crosses ${c}–${d}`);
    // Without diagonals a lattice graph is bipartite.
    assert.ok(!hasOddLoop(latticeGraph(cols, rows, 0.5, rng(seed))));
  }
});

// A house: a square A B D C with a roof E on A and B, and one diagonal B–C.
const house: Graph = { pts: [[0, 50], [100, 50], [0, 150], [100, 150], [50, 0]], edges: [[0, 1], [0, 2], [1, 3], [2, 3], [0, 4], [1, 4], [1, 2]], w: [] };

test("the maths of a house: degrees, odd vertices, loops, colours", () => {
  assert.deepEqual(degrees(house), [3, 4, 3, 2, 2]);
  assert.deepEqual(oddVertices(house), [0, 2]);
  assert.equal(chromatic(house), 3);
  assert.ok(hasOddLoop(house));
  const col = colourWith(house, 3)!;
  assert.deepEqual(clashes(house, col), []);
  assert.equal(colourWith(house, 2), null);
  assert.deepEqual(clashes(house, [0, 0, 1, 2, -1]), [0]);
  assert.deepEqual(loopEdges(house, [0, 1, 2, 3]), [0, 1, 2, 3]);
  assert.deepEqual(loopEdges(house, [0, 1, 4]), []);
  assert.ok(!joinsAll(house, [0, 1, 2]));
  assert.ok(joinsAll(house, [0, 1, 2, 4]));
  assert.equal(edgeName(house, 6), "B–C");
});

test("lengths: shortest distances, route lengths, the cheapest network", () => {
  const g = withLengths(house, [4, 1, 2, 6, 3, 1, 5]);
  assert.deepEqual(distances(g, 0), [0, 4, 1, 6, 3]);
  assert.equal(routeLength(g, [0, 4, 1, 3]), 6);
  assert.equal(routeLength(g, [0, 3]), null);
  const net = cheapestNetwork(g);
  assert.deepEqual([...net.edges].sort(), [1, 2, 4, 5]);
  assert.equal(net.total, 7);
});

test("the picture: an edge and a letter for each, lengths when there are any, no letters when asked", () => {
  const plain = graphSvg(house);
  assert.equal((plain.body.match(/<line/g) ?? []).length, 7);
  assert.equal((plain.body.match(/>[A-E]</g) ?? []).length, 5);
  assert.doesNotMatch(graphSvg(house, { letters: false }).body, />[A-E]</);
  const lengths = graphSvg(withLengths(house, [4, 1, 2, 6, 3, 1, 5]), { scale: 0.5 });
  assert.match(lengths.body, />6</);
  assert.ok(!lengths.body.includes("NaN"));
});
