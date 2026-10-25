// Connect the towns: roads that could be built, each with its cost, and the cheapest set of them that joins every town
// — a minimum spanning tree, n − 1 roads and no loop. Easy: six towns; medium: nine; hard: twelve. Every cost is
// different, so the cheapest network is one. The board's game picks the roads by tapping them; the practice question
// asks for the least total. The n − 1 cheapest roads taken whether or not they make a loop is the slip named.
import { withSteps } from "./angleGuess";
import type { EndlessGame, TryGame } from "./ladder";
import { cheapestNetwork, degrees, graphSvg, joinsAll, latticeGraph, loopEdges, withLengths, type Graph } from "./graphPlay";
import { rng } from "./random";

export type TownLevel = 1 | 2 | 3;
export type TownTask = { level: TownLevel; g: Graph; best: { edges: number[]; total: number } };

/** The total of the n − 1 cheapest roads, loop or not. */
export const cheapestRoads = (g: Graph) => [...g.w].sort((a, b) => a - b).slice(0, g.pts.length - 1).reduce((s, w) => s + w, 0);

/** Easy: 3 × 2 towns; medium: 3 × 3; hard: 4 × 3. Each road a different cost; past easy, the cheapest roads make a loop. */
export function townTask(level: TownLevel, next: () => number): TownTask {
  const [cols, rows] = level === 1 ? [3, 2] : level === 2 ? [3, 3] : [4, 3];
  for (;;) {
    const g0 = latticeGraph(cols, rows, 0.6, next, { diagonals: true });
    const costs = g0.edges.map((_, i) => i + 1);
    for (let i = costs.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [costs[i], costs[j]] = [costs[j], costs[i]];
    }
    const g = withLengths(g0, costs);
    const best = cheapestNetwork(g);
    if (level > 1 && cheapestRoads(g) === best.total) continue;
    return { level, g, best };
  }
}

// ---------- pictures ----------

/** The roads: the ones chosen thick (blue, green when `done`), those on a loop red, the rest grey and dashed. */
export function townSvg(g: Graph, chosen: number[], o: { loop?: number[]; done?: boolean; scale?: number } = {}) {
  return graphSvg(g, {
    scale: o.scale,
    edgeColor: (e) => (o.loop?.includes(e) ? "#e03131" : chosen.includes(e) ? (o.done ? "#2f9e44" : "#1971c2") : "#adb5bd"),
    edgeWidth: (e) => (chosen.includes(e) ? 7 : 3),
    edgeDash: (e) => !chosen.includes(e),
    fill: () => "#fff3bf",
  });
}

// ---------- the board's game ----------

export const TOWN_LADDER: { level: TownLevel; seed: number }[] = [
  { level: 1, seed: 1401 },
  { level: 1, seed: 1402 },
  { level: 1, seed: 1403 },
  { level: 2, seed: 1411 },
  { level: 2, seed: 1412 },
  { level: 2, seed: 1413 },
  { level: 3, seed: 1421 },
  { level: 3, seed: 1422 },
  { level: 3, seed: 1423 },
];
/** Stars: right at the first check three, at the second two, else one. */
export const townStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What is wrong with the roads chosen: a town left out, a loop, or a network dearer than it need be; null when it is the cheapest. */
export function townProblem(t: TownTask, chosen: number[]): { kind: "apart" } | { kind: "loop"; edges: number[] } | { kind: "dearer"; by: number } | null {
  if (!joinsAll(t.g, chosen)) return { kind: "apart" };
  const loop = loopEdges(t.g, chosen);
  if (loop.length) return { kind: "loop", edges: loop };
  const total = chosen.reduce((s, e) => s + t.g.w[e], 0);
  return total > t.best.total ? { kind: "dearer", by: total - t.best.total } : null;
}
export type TownNotice = "bigMap" | "skipCheap" | "lonely" | "streak10";
export const TOWN_NOTICES: TownNotice[] = ["skipCheap", "lonely", "bigMap", "streak10"];
/** What a network right first time shows: twelve towns, a cheap road left out for making a loop, a town with one road; ten in a row. */
export function townNotice(t: TownTask, misses: number, streak: number): TownNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (t.g.pts.length >= 12) return "bigMap";
  const dearest = Math.max(...t.best.edges.map((e) => t.g.w[e]));
  if (t.g.edges.some((_, e) => !t.best.edges.includes(e) && t.g.w[e] < dearest)) return "skipCheap";
  if (degrees(t.g).includes(1)) return "lonely";
  return null;
}
/** The game's state: the shared shape, and the roads chosen; what is said besides a notice is what is wrong with them. */
export type LiveTowns = EndlessGame<TownNotice, TownLevel, { kind: "apart" } | { kind: "loop"; edges: number[] } | { kind: "dearer"; by: number }> & TryGame & { chosen: number[] };
export const townNow = (d: Pick<LiveTowns, "mode" | "stage" | "level" | "seed">): TownTask =>
  d.mode === "puzzle" ? townTask(TOWN_LADDER[d.stage].level, rng(TOWN_LADDER[d.stage].seed)) : townTask(d.level, rng(d.seed));

// ---------- the practice question ----------

/** The working: the roads of the cheapest network, cheapest first, added up. */
export const townSteps = (t: TownTask): string[] => [`${t.best.edges.map((e) => t.g.w[e]).sort((a, b) => a - b).join(" + ")} = ${t.best.total}`];

/** The worked solution: the cheapest network drawn, and its roads added up beneath. */
export type TownSolution = { task: TownTask };
export function renderTowns(spec: TownSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(townSvg(spec.task.g, spec.task.best.edges, { done: true, scale: 0.8 }), steps);
}
