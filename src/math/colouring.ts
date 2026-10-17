// Colour the graph: every vertex a colour, no edge joining two of the same, with as few colours as can be. Easy: a
// grid's graph, which two colours always do; medium: diagonals make triangles, so three; hard: the fewest colours to
// find, three or four. The board's game colours by tapping; the practice question asks for the fewest colours. The
// edges at the busiest vertex plus one taken for the number needed, and two colours for a graph with an odd loop
// (a triangle), are the slips named.
import { withSteps } from "./angleGuess";
import { chromatic, colourWith, degrees, graphSvg, hasOddLoop, latticeGraph, PALETTE, type Graph } from "./graphPlay";
import { rng } from "./random";

export type ColourLevel = 1 | 2 | 3;
/** A graph and the fewest colours it needs. */
export type ColourTask = { level: ColourLevel; g: Graph; k: number };

/** A graph on a cols × rows lattice that needs exactly k colours. */
function needing(k: number, cols: number, rows: number, next: () => number): Graph {
  for (;;) {
    const g = latticeGraph(cols, rows, k === 2 ? 0.6 : 0.5, next, { diagonals: k > 2, both: k === 4 ? 0.35 : 0 });
    if (chromatic(g) === k) return g;
  }
}
/** Easy: a 3 × 3 grid's graph (two colours); medium: three colours; hard: three or four, on nine or twelve vertices. */
export function colourTask(level: ColourLevel, next: () => number): ColourTask {
  if (level === 1) return { level, g: needing(2, 3, 3, next), k: 2 };
  if (level === 2) return { level, g: needing(3, 3, 3, next), k: 3 };
  const k = next() < 0.5 ? 3 : 4;
  const [cols, rows] = next() < 0.5 ? [3, 3] : [4, 3];
  return { level, g: needing(k, cols, rows, next), k };
}

// ---------- the practice question ----------

export type ColourMistake = "degreeColours" | "oddLoop";
/** The fewest colours: easy two (a grid of 3 × 2), medium three, hard three or four. */
export function colourQuestion(level: ColourLevel, next: () => number): ColourTask {
  if (level === 1) return { level, g: needing(2, 3, 2, next), k: 2 };
  return colourTask(level, next);
}
/** The answers the slips give: the busiest vertex's edges plus one, and two for a graph with an odd loop. */
export function colourTraps(t: ColourTask): { id: ColourMistake; v: number }[] {
  const out: { id: ColourMistake; v: number }[] = [];
  const busiest = Math.max(...degrees(t.g)) + 1;
  if (busiest !== t.k) out.push({ id: "degreeColours", v: busiest });
  if (t.k > 2 && hasOddLoop(t.g)) out.push({ id: "oddLoop", v: 2 });
  return out;
}

// ---------- the board's game ----------

export const COLOUR_LADDER: { level: ColourLevel; seed: number }[] = [
  { level: 1, seed: 1201 },
  { level: 1, seed: 1202 },
  { level: 1, seed: 1203 },
  { level: 2, seed: 1211 },
  { level: 2, seed: 1212 },
  { level: 2, seed: 1213 },
  { level: 3, seed: 1221 },
  { level: 3, seed: 1222 },
  { level: 3, seed: 1223 },
];
/** Stars: right at the first check three, at the second two, else one. */
export const colourStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** How many colours a colouring uses. */
export const coloursUsed = (col: number[]) => new Set(col.filter((c) => c >= 0)).size;
export type ColourNotice = "two" | "triangle" | "four" | "streak10";
export const COLOUR_NOTICES: ColourNotice[] = ["two", "triangle", "four", "streak10"];
/** What a graph coloured right first time shows: two colours, three for triangles, four; ten in a row. */
export function colourNotice(t: ColourTask, misses: number, streak: number): ColourNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  return t.k === 2 ? "two" : t.k === 3 ? "triangle" : "four";
}
export type LiveColour = {
  mode: "puzzle" | "endless";
  stage: number;
  level: ColourLevel;
  seed: number;
  /** Each vertex's colour (−1 none yet), the colour a tap puts, the misses, and whether it is done. */
  colours: number[];
  pen: number;
  misses: number;
  done: boolean;
  streak: number;
  said: { kind: "notice"; key: ColourNotice } | { kind: "clash" } | { kind: "fewer" } | null;
};
export const colourNow = (d: Pick<LiveColour, "mode" | "stage" | "level" | "seed">): ColourTask =>
  d.mode === "puzzle" ? colourTask(COLOUR_LADDER[d.stage].level, rng(COLOUR_LADDER[d.stage].seed)) : colourTask(d.level, rng(d.seed));
/** The graph coloured as far as it is, the edges whose ends clash red. */
export function colourSvg(g: Graph, col: number[], clash: number[], o: { scale?: number } = {}) {
  return graphSvg(g, {
    scale: o.scale,
    fill: (v) => (col[v] >= 0 ? PALETTE[col[v]] : undefined),
    edgeColor: (e) => (clash.includes(e) ? "#e03131" : undefined),
    edgeWidth: (e) => (clash.includes(e) ? 6 : 3),
  });
}

/** The worked solution: the graph in its fewest colours, with the working beneath. */
export type ColourSolution = { task: ColourTask };
export function renderColour(spec: ColourSolution, steps: { svg: string; width: number; height: number } | null) {
  return withSteps(colourSvg(spec.task.g, colourWith(spec.task.g, spec.task.k)!, [], { scale: 0.8 }), steps);
}
/** The working: a loop with an odd number of vertices needs three colours, a grid's graph two. */
export const colourSteps = (t: ColourTask): string[] => [`${t.k}`];
