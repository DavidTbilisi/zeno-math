// One stroke: a graph to draw without lifting the pen or going over an edge twice — an Euler trail. It can be done
// when the graph is joined up and no more than two vertices have an odd number of edges (an odd degree): a stroke
// goes in and out of every vertex it passes, so only its start and end can be odd, and with two odd vertices it must
// start at one of them. Easy: every degree even, start anywhere; medium: two odd vertices; hard: bigger graphs, and
// some that can't be done, to say so. The board's game traces the graph vertex by vertex; the practice question counts
// the odd vertices, or picks the one graph of four that can be drawn. The even vertices counted instead, and a graph
// with more than two odd vertices picked, are the slips named.
import { withSteps } from "./angleGuess";
import { degrees, edgeOf, graphSize, graphSvg, joinsAll, latticeGraph, name, oddVertices, type Graph } from "./graphPlay";
import { LETTERS as OPTION } from "./cubeNets";
import { rng } from "./random";
import type { EndlessGame, TryGame } from "./ladder";

export type StrokeLevel = 1 | 2 | 3;
export type StrokeTask = { level: StrokeLevel; g: Graph };
export const canTrace = (g: Graph) => joinsAll(g) && oddVertices(g).length <= 2;

/** A graph whose odd vertices number one of `odd`, with at least `min` edges, on a cols × rows lattice. */
function graphWith(cols: number, rows: number, odd: number[], min: number, next: () => number): Graph {
  for (;;) {
    const g = latticeGraph(cols, rows, 0.55, next, { diagonals: true });
    if (g.edges.length >= min && odd.includes(oddVertices(g).length)) return g;
  }
}

/** Easy: six vertices, every degree even; medium: nine, two odd; hard: nine or twelve, half of them impossible. */
export function strokeTask(level: StrokeLevel, next: () => number): StrokeTask {
  if (level === 1) return { level, g: graphWith(3, 2, [0], 6, next) };
  if (level === 2) return { level, g: graphWith(3, 3, [2], 10, next) };
  const [cols, rows] = next() < 0.5 ? [3, 3] : [4, 3];
  return { level, g: graphWith(cols, rows, next() < 0.5 ? [0, 2] : [4, 6], 10, next) };
}

// ---------- tracing ----------

/** The edges a trail (its vertices in order) has gone along. */
export const trailEdges = (g: Graph, trail: number[]) => trail.slice(1).map((v, i) => edgeOf(g, trail[i], v));
/** Whether the trail can go on to v: anywhere to start, then along an edge not gone along yet. */
export function canStep(g: Graph, trail: number[], v: number): boolean {
  if (!trail.length) return true;
  const e = edgeOf(g, trail[trail.length - 1], v);
  return e >= 0 && !trailEdges(g, trail).includes(e);
}
/** Stuck: edges left, but none from where the trail is. */
export function isStuck(g: Graph, trail: number[]): boolean {
  if (!trail.length) return false;
  const used = trailEdges(g, trail);
  const last = trail[trail.length - 1];
  return used.length < g.edges.length && !g.edges.some(([a, b], e) => (a === last || b === last) && !used.includes(e));
}
/** An Euler trail (Hierholzer), from an odd vertex when there are two; null if there is none. */
export function eulerTrail(g: Graph): number[] | null {
  if (!canTrace(g)) return null;
  const odd = oddVertices(g);
  const left = new Set(g.edges.map((_, i) => i));
  const stack = [odd[0] ?? 0];
  const out: number[] = [];
  while (stack.length) {
    const v = stack[stack.length - 1];
    const e = [...left].find((i) => g.edges[i][0] === v || g.edges[i][1] === v);
    if (e === undefined) out.push(stack.pop()!);
    else {
      left.delete(e);
      stack.push(g.edges[e][0] === v ? g.edges[e][1] : g.edges[e][0]);
    }
  }
  return out.reverse();
}

// ---------- pictures ----------

const BLUE = "#1971c2";
/** The graph as it is being traced: the edges gone along blue and thick, where the trail is ringed orange. */
export function strokeSvg(g: Graph, trail: number[], o: { done?: boolean } = {}) {
  const used = trailEdges(g, trail);
  const color = o.done ? "#2f9e44" : BLUE;
  return graphSvg(g, {
    edgeColor: (e) => (used.includes(e) ? color : undefined),
    edgeWidth: (e) => (used.includes(e) ? 7 : 3),
    fill: (v) => (v === trail[0] ? "#d0ebff" : undefined),
    ring: (v) => (!o.done && trail.length && v === trail[trail.length - 1] ? "#e8590c" : undefined),
  });
}

// ---------- the practice question ----------

export type StrokeMistake = "countedEven" | "fourOdd";
/** How many odd vertices (easy, medium), or which of four graphs can be drawn in one stroke (hard). */
export type StrokeQuestion = { level: 1 | 2; g: Graph; odd: number } | { level: 3; options: Graph[]; right: number };
export function strokeQuestion(level: StrokeLevel, next: () => number): StrokeQuestion {
  if (level === 1) {
    const g = graphWith(3, 2, [2, 4], 6, next);
    return { level, g, odd: oddVertices(g).length };
  }
  if (level === 2) {
    const g = graphWith(3, 3, [2, 4, 6], 9, next);
    return { level, g, odd: oddVertices(g).length };
  }
  const right = Math.floor(next() * 4);
  const options = [0, 1, 2, 3].map((i) => graphWith(3, 2, i === right ? [0, 2] : [4, 6], 6, next));
  return { level, options, right };
}
/** The answer counting the even vertices gives. */
export const evenCount = (q: { g: Graph; odd: number }) => q.g.pts.length - q.odd;
/** The working: each vertex's degree, and the odd ones. */
export function strokeSteps(q: StrokeQuestion): string[] {
  if (q.level === 3) {
    const g = q.options[q.right];
    return [`\\text{${OPTION[q.right]}}: ${oddVertices(g).length} \\le 2`];
  }
  const ds = degrees(q.g);
  const odd = oddVertices(q.g);
  return [ds.map((d, v) => `\\text{${name(v)}}: ${d}`).join(", \\; "), `${odd.map((v) => `\\text{${name(v)}}`).join(", ")} \\; \\rightarrow \\; ${q.odd}`];
}
/** The question's picture: the graph, or the four graphs two by two with their letters (no vertex letters, to keep them apart). */
export function strokeQuestionSvg(q: StrokeQuestion): { body: string; w: number; h: number } {
  if (q.level < 3) return graphSvg((q as { g: Graph }).g, { scale: 0.8 });
  const qs = q as { options: Graph[] };
  const k = 0.55;
  const size = qs.options.map(graphSize);
  const [cw, ch] = [Math.max(...size.map((s) => s[0])) * k + 34, Math.max(...size.map((s) => s[1])) * k + 14];
  const body = qs.options
    .map((g, i) => {
      const pic = graphSvg(g, { scale: k, letters: false }).body;
      return `<g transform="translate(${(i % 2) * cw} ${Math.floor(i / 2) * ch})"><text x="4" y="22" font-size="17" font-weight="700" fill="#1e1e1e">${OPTION[i]}</text><g transform="translate(24 0)">${pic}</g></g>`;
    })
    .join("");
  return { body, w: 2 * cw, h: 2 * ch };
}

// ---------- the board's game ----------

export const STROKE_LADDER: { level: StrokeLevel; seed: number }[] = [
  { level: 1, seed: 1101 },
  { level: 1, seed: 1102 },
  { level: 1, seed: 1103 },
  { level: 2, seed: 1111 },
  { level: 2, seed: 1112 },
  { level: 2, seed: 1113 },
  { level: 3, seed: 1121 },
  { level: 3, seed: 1122 },
  { level: 3, seed: 1123 },
];
/** Stars: no misses three, one two, else one. A miss is getting stuck, or saying a graph can't be done when it can. */
export const strokeStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
export type StrokeNotice = "circuit" | "oddStart" | "impossible" | "streak10";
export const STROKE_NOTICES: StrokeNotice[] = ["circuit", "oddStart", "impossible", "streak10"];
/** What a graph done with no misses shows: a stroke back where it began, one from an odd vertex, an impossible graph seen for what it is; ten in a row. */
export function strokeNotice(g: Graph, trail: number[] | null, misses: number, streak: number): StrokeNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (!trail) return "impossible";
  if (trail[0] === trail[trail.length - 1]) return "circuit";
  return "oddStart";
}
export type LiveStroke = EndlessGame<StrokeNotice, StrokeLevel, { kind: "stuck"; oddStart: boolean } | { kind: "can" }> &
  TryGame & {
    /** The vertices of the stroke so far; done once the graph is drawn, or said to be impossible. */
    trail: number[];
  };
export const strokeNow = (d: Pick<LiveStroke, "mode" | "stage" | "level" | "seed">): StrokeTask =>
  d.mode === "puzzle" ? strokeTask(STROKE_LADDER[d.stage].level, rng(STROKE_LADDER[d.stage].seed)) : strokeTask(d.level, rng(d.seed));

/** The worked solution: the odd vertices filled in, or the graph that can be drawn with its stroke numbered edge by edge. */
export type StrokeSolution = { q: StrokeQuestion };
export function renderStroke(spec: StrokeSolution, steps: { svg: string; width: number; height: number } | null) {
  const q = spec.q;
  if (q.level < 3) {
    const g = (q as { g: Graph }).g;
    const odd = oddVertices(g);
    return withSteps(graphSvg(g, { scale: 0.8, fill: (v) => (odd.includes(v) ? "#ffc078" : undefined) }), steps);
  }
  const g = (q as { options: Graph[]; right: number }).options[(q as { right: number }).right];
  const trail = eulerTrail(g)!;
  const order = trailEdges(g, trail);
  const pic = graphSvg({ ...g, w: g.edges.map((_, e) => order.indexOf(e) + 1) }, { scale: 0.8, edgeColor: () => "#2f9e44", fill: (v) => (v === trail[0] ? "#d0ebff" : undefined) });
  return withSteps(pic, steps);
}
