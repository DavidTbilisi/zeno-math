// Graphs that limits and continuity are read from (#744): pieces of curve on a square grid, an open dot where a piece
// stops short of a point, a filled dot where the function has its value, and dashed asymptotes. A piece is sampled
// from a formula and cut where it leaves the grid, so a curve running up a vertical asymptote stops at the edge.
import { C } from "./chart";
import { graphSvg, type Pt } from "./readFunction";

export type LimitGraph = {
  /** The pieces, each a formula over [from, to]. */
  pieces: readonly { f: (x: number) => number; from: number; to: number }[];
  /** Points the function stops short of. */
  open?: readonly Pt[];
  /** Points where the function has its value. */
  closed?: readonly Pt[];
  /** Vertical asymptotes x = a. */
  vert?: readonly number[];
  /** Horizontal asymptotes y = b. */
  horiz?: readonly number[];
};

export const LO = -6;
export const HI = 6;
const U = 22;
const X = (x: number) => 20 + (x - LO) * U;
const Y = (y: number) => 20 + (HI - y) * U;

/** The points of y = f(x) from a to b that stay on the grid, split where the curve leaves it. */
export function sample(f: (x: number) => number, a: number, b: number): Pt[][] {
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (let i = 0; i <= 240; i++) {
    const x = a + ((b - a) * i) / 240;
    const y = f(x);
    if (Number.isFinite(y) && y >= LO && y <= HI) run.push([x, y]);
    else if (run.length) (runs.push(run), (run = []));
  }
  if (run.length) runs.push(run);
  return runs.filter((p) => p.length > 1);
}

export function limitGraphSvg(g: LimitGraph): { body: string; w: number; h: number } {
  const runs = g.pieces.flatMap((p) => sample(p.f, p.from, p.to));
  const base = graphSvg(runs[0], { lo: LO, hi: HI });
  const out = [base.body];
  for (const run of runs.slice(1)) out.push(`<polyline points="${run.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ")}" fill="none" stroke="${C.blue}" stroke-width="2.5"/>`);
  for (const a of g.vert ?? []) out.push(`<line x1="${X(a)}" y1="${Y(HI)}" x2="${X(a)}" y2="${Y(LO)}" stroke="${C.orange}" stroke-width="1.6" stroke-dasharray="6 5"/>`);
  for (const b of g.horiz ?? []) out.push(`<line x1="${X(LO)}" y1="${Y(b)}" x2="${X(HI)}" y2="${Y(b)}" stroke="${C.orange}" stroke-width="1.6" stroke-dasharray="6 5"/>`);
  for (const [x, y] of g.open ?? []) out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="#fff" stroke="${C.blue}" stroke-width="2.2"/>`);
  for (const [x, y] of g.closed ?? []) out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="${C.blue}"/>`);
  return { body: out.join(""), w: base.w, h: base.h };
}

/** The picture of a practice question. */
export const limitPic = (g: LimitGraph) => {
  const p = limitGraphSvg(g);
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${p.body}</g>`, w: p.w, h: p.h };
};
