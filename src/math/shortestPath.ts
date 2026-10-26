// Shortest route: places joined by roads of different lengths, and the shortest way from one to another. Easy: six
// places; medium: nine, where the route with the fewest roads is never the shortest; hard: twelve. The board's game
// has the route tapped place by place; the practice question asks for its length. The route with the fewest roads,
// and the one that takes the shortest road from each place in turn, are the slips named.
import { withSteps } from "./angleGuess";
import { distances, edgeOf, graphSvg, latticeGraph, name, neighbours, routeLength, withLengths, type Graph } from "./graphPlay";
import { rng } from "./random";
import type { EndlessGame, TryGame } from "./ladder";

export type PathLevel = 1 | 2 | 3;
/** A graph with road lengths, the places to go from and to (opposite corners), and the shortest length. */
export type PathTask = { level: PathLevel; g: Graph; a: number; b: number; best: number };

/** The shortest length by a route with the fewest roads: the cheapest way down the layers of a search by roads. */
export function fewestRoads(g: Graph, a: number, b: number): { roads: number; length: number } {
  const hops = g.pts.map(() => Infinity);
  hops[a] = 0;
  const queue = [a];
  while (queue.length) {
    const v = queue.shift()!;
    for (const u of neighbours(g, v)) if (hops[u] === Infinity) (hops[u] = hops[v] + 1), queue.push(u);
  }
  const cost = g.pts.map(() => Infinity);
  cost[a] = 0;
  const order = g.pts.map((_, v) => v).sort((x, y) => hops[x] - hops[y]);
  for (const v of order) for (const u of neighbours(g, v)) if (hops[u] === hops[v] + 1) cost[u] = Math.min(cost[u], cost[v] + g.w[edgeOf(g, v, u)]);
  return { roads: hops[b], length: cost[b] };
}
/** The route the shortest road from each place gives (never back to a place already passed), or null if it gets stuck. */
export function greedyRoute(g: Graph, a: number, b: number): number[] | null {
  const route = [a];
  while (route[route.length - 1] !== b) {
    const v = route[route.length - 1];
    const next = neighbours(g, v).filter((u) => !route.includes(u)).sort((x, y) => g.w[edgeOf(g, v, x)] - g.w[edgeOf(g, v, y)] || x - y)[0];
    if (next === undefined) return null;
    route.push(next);
  }
  return route;
}
/** A shortest route, found back from b along roads that keep to the shortest distances. */
export function shortestRoute(g: Graph, a: number, b: number): number[] {
  const d = distances(g, a);
  const route = [b];
  while (route[0] !== a) {
    const v = route[0];
    route.unshift(neighbours(g, v).filter((u) => d[u] + g.w[edgeOf(g, u, v)] === d[v]).sort((x, y) => x - y)[0]);
  }
  return route;
}
/** How many different shortest routes there are. */
export function shortestCount(g: Graph, a: number): number[] {
  const d = distances(g, a);
  const count = g.pts.map((_, v) => (v === a ? 1 : 0));
  const order = g.pts.map((_, v) => v).sort((x, y) => d[x] - d[y]);
  for (const v of order) for (const u of neighbours(g, v)) if (d[v] + g.w[edgeOf(g, v, u)] === d[u]) count[u] += count[v];
  return count;
}

/** Easy: 3 × 2 places; medium: 3 × 3, a detour shorter than the fewest roads; hard: 4 × 3. Roads 1 to 9 long. */
export function pathTask(level: PathLevel, next: () => number): PathTask {
  const [cols, rows] = level === 1 ? [3, 2] : level === 2 ? [3, 3] : [4, 3];
  for (;;) {
    const g0 = latticeGraph(cols, rows, 0.55, next, { diagonals: true });
    const g = withLengths(g0, g0.edges.map(() => 1 + Math.floor(next() * 9)));
    const corner = Math.floor(next() * 2);
    const [a, b] = corner ? [cols - 1, cols * (rows - 1)] : [0, cols * rows - 1];
    const best = distances(g, a)[b];
    if (level === 2 && fewestRoads(g, a, b).length === best) continue;
    return { level, g, a, b, best };
  }
}

// ---------- pictures ----------

/** The roads with the route on them blue and thick (green when `done`), the start and the end filled. */
export function pathSvg(t: Pick<PathTask, "g" | "a" | "b">, route: number[], o: { done?: boolean; scale?: number } = {}) {
  const on = route.slice(1).map((v, i) => edgeOf(t.g, route[i], v));
  return graphSvg(t.g, {
    scale: o.scale,
    edgeColor: (e) => (on.includes(e) ? (o.done ? "#2f9e44" : "#1971c2") : undefined),
    edgeWidth: (e) => (on.includes(e) ? 7 : 3),
    fill: (v) => (v === t.a ? "#b2f2bb" : v === t.b ? "#ffd8a8" : undefined),
  });
}

// ---------- the practice question ----------

export type PathMistake = "fewestRoads" | "greedyRoute";
/** The answers the slips give: the route with the fewest roads, and the shortest road from each place in turn. */
export function pathTraps(t: PathTask): { id: PathMistake; v: number; vars: Record<string, number> }[] {
  const out: { id: PathMistake; v: number; vars: Record<string, number> }[] = [];
  const few = fewestRoads(t.g, t.a, t.b).length;
  if (few !== t.best) out.push({ id: "fewestRoads", v: few, vars: { f: few, v: t.best } });
  const greedy = greedyRoute(t.g, t.a, t.b);
  const g = greedy && routeLength(t.g, greedy)!;
  if (g !== null && g !== t.best && g !== few) out.push({ id: "greedyRoute", v: g, vars: { g, v: t.best } });
  return out;
}
/** The working: the shortest route and its roads added up. */
export function pathSteps(t: PathTask): string[] {
  const route = shortestRoute(t.g, t.a, t.b);
  const lens = route.slice(1).map((v, i) => t.g.w[edgeOf(t.g, route[i], v)]);
  return [`${route.map((v) => `\\text{${name(v)}}`).join(" \\to ")}: \\; ${lens.join(" + ")} = ${t.best}`];
}

// ---------- the board's game ----------

export const PATH_LADDER: { level: PathLevel; seed: number }[] = [
  { level: 1, seed: 1301 },
  { level: 1, seed: 1302 },
  { level: 1, seed: 1303 },
  { level: 2, seed: 1311 },
  { level: 2, seed: 1312 },
  { level: 2, seed: 1313 },
  { level: 3, seed: 1321 },
  { level: 3, seed: 1322 },
  { level: 3, seed: 1323 },
];
/** Stars: right at the first check three, at the second two, else one. */
export const pathStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
export type PathNotice = "detour" | "tie" | "manyRoads" | "streak10";
export const PATH_NOTICES: PathNotice[] = ["detour", "tie", "manyRoads", "streak10"];
/** What a route found first time shows: more roads but shorter, one of two or more shortest routes, five roads or more; ten in a row. */
export function pathNotice(t: PathTask, route: number[], misses: number, streak: number): PathNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (route.length - 1 > fewestRoads(t.g, t.a, t.b).roads) return "detour";
  if (shortestCount(t.g, t.a)[t.b] > 1) return "tie";
  if (route.length - 1 >= 5) return "manyRoads";
  return null;
}
export type LivePath = EndlessGame<PathNotice, PathLevel, { kind: "longer"; len: number; fewest: boolean }> &
  TryGame & {
    /** The places of the route after the start. */
    route: number[];
  };
export const pathNow = (d: Pick<LivePath, "mode" | "stage" | "level" | "seed">): PathTask =>
  d.mode === "puzzle" ? pathTask(PATH_LADDER[d.stage].level, rng(PATH_LADDER[d.stage].seed)) : pathTask(d.level, rng(d.seed));

/** The worked solution: the shortest route drawn, and its roads added up beneath. */
export type PathSolution = { task: PathTask };
export function renderPath(spec: PathSolution, steps: { svg: string; width: number; height: number } | null) {
  const t = spec.task;
  return withSteps(pathSvg(t, shortestRoute(t.g, t.a, t.b), { done: true, scale: 0.8 }), steps);
}
