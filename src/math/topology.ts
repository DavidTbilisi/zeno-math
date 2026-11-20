// Metric spaces and topology as a degree teaches them after real analysis (Sutherland, Introduction to Metric and
// Topological Spaces; Munkres, Topology; Mendelson, Introduction to Topology): metrics and their balls; open and
// closed sets, interior, closure and boundary; compactness by Heine–Borel, covers and sequences; connectedness and
// path-connectedness; topological spaces on a finite set, bases and subbases, continuity and homeomorphisms. The
// words, and the finite-set arithmetic the answers are made of; the questions are in
// src/math/skills/{metrics,openClosed,compactness,connected,topologies}.ts.
import type { Bound } from "./practiceTypes";

/** The words of these questions (the locale's `top` block). */
export type TopologyWords = {
  axiom: { metric: string; identity: string; symmetry: string; triangle: string };
  ball: { disc: string; diamond: string; square: string; point: string; plane: string };
  openness: { open: string; closed: string; both: string; neither: string };
  compact: string;
  notCompact: string;
  connected: string;
  notConnected: string;
  path: { path: string; only: string; not: string };
  space: { topology: string; whole: string; unions: string; intersections: string };
  continuous: string;
  notContinuous: string;
  homeomorphic: string;
  notHomeomorphic: string;
  prompt: {
    distance: string;
    isMetric: string;
    ballShape: string;
    ballArea: string;
    openClosed: string;
    interior: string;
    closure: string;
    boundary: string;
    compact: string;
    subsequence: string;
    subcover: string;
    nested: string;
    extreme: string;
    connected: string;
    components: string;
    pathConnected: string;
    isTopology: string;
    generated: string;
    continuous: string;
    homeomorphic: string;
  };
};

// ---------- the three metrics on ℝ² ----------

/** d₁(p, q) = |Δx| + |Δy|, d₂ = √(Δx² + Δy²), d∞ = max(|Δx|, |Δy|). */
export const d1 = (dx: number, dy: number) => Math.abs(dx) + Math.abs(dy);
export const d2 = (dx: number, dy: number) => Math.hypot(dx, dy);
export const dInf = (dx: number, dy: number) => Math.max(Math.abs(dx), Math.abs(dy));

// ---------- intervals of ℝ ----------

/** An interval [a, b), (a, b], …, as its two ends. */
export type Interval = { lo: Bound; hi: Bound };
export const iv = (a: number, b: number, loClosed: boolean, hiClosed: boolean): Interval => ({ lo: { v: a, closed: loClosed }, hi: { v: b, closed: hiClosed } });
/** [a, b) as LaTeX. */
export const intervalTex = ({ lo, hi }: Interval) => `${lo.closed ? "[" : "("}${lo.v}, ${hi.v}${hi.closed ? "]" : ")"}`;
/** [a, b) as typed. */
export const intervalPlain = ({ lo, hi }: Interval) => `${lo.closed ? "[" : "("}${lo.v}, ${hi.v}${hi.closed ? "]" : ")"}`;

/** A piece of a subset of ℝ: an interval (a < b) or a single point (a = b, both ends closed). */
export type Piece = Interval;
export const point = (a: number): Piece => iv(a, a, true, true);
export const pieceTex = (p: Piece) => (p.lo.v === p.hi.v ? `\\{${p.lo.v}\\}` : intervalTex(p));
/** A union of pieces written left to right. */
export const unionTex = (ps: Piece[]) => ps.map(pieceTex).join(" \\cup ");

/** The connected components of a union of pieces sorted left to right: touching pieces with a shared point join. */
export function componentsOf(ps: Piece[]): number {
  let count = 0;
  let last: Piece | null = null;
  for (const p of ps) {
    const joins: boolean = last !== null && last.hi.v === p.lo.v && (last.hi.closed || p.lo.closed);
    if (!joins) count++;
    last = joins && last ? iv(last.lo.v, p.hi.v, last.lo.closed, p.hi.closed) : p;
  }
  return count;
}

// ---------- finite topological spaces, subsets of {1, …, n} as bit masks ----------

/** The subset {a, b, …} of X = {a, b, c, d} as LaTeX, letters for 1, 2, 3, 4; the empty set as ∅. */
export function subsetTex(mask: number, n: number): string {
  const xs = Array.from({ length: n }, (_, i) => i).filter((i) => mask & (1 << i));
  return xs.length ? `\\{${xs.map((i) => "abcd"[i]).join(", ")}\\}` : "\\varnothing";
}
/** A collection of subsets as LaTeX, smallest first. */
export const collectionTex = (ms: number[], n: number) => `\\{${sortMasks(ms).map((m) => subsetTex(m, n)).join(", ")}\\}`;
const popcount = (m: number) => m.toString(2).replace(/0/g, "").length;
export const sortMasks = (ms: number[]) => [...new Set(ms)].sort((a, b) => popcount(a) - popcount(b) || a - b);

/** Which axiom a collection of subsets of X (|X| = n) breaks first: 0 none, 1 ∅ or X missing, 2 a union, 3 an intersection. */
export function topologyFault(ms: number[], n: number): 0 | 1 | 2 | 3 {
  const all = (1 << n) - 1;
  const s = new Set(ms);
  if (!s.has(0) || !s.has(all)) return 1;
  for (const a of s) for (const b of s) if (!s.has(a | b)) return 2;
  for (const a of s) for (const b of s) if (!s.has(a & b)) return 3;
  return 0;
}

/** The pair of subsets whose union or intersection is missing, for the steps. */
export function faultPair(ms: number[], fault: 2 | 3): [number, number] {
  const s = new Set(ms);
  for (const a of s) for (const b of s) if (!s.has(fault === 2 ? a | b : a & b)) return [a, b];
  return [0, 0];
}

/** Every union of some of the sets (the empty union is ∅). */
export function unionsOf(ms: number[]): number[] {
  const out = new Set<number>([0]);
  for (const m of ms) for (const u of [...out]) out.add(u | m);
  return sortMasks([...out]);
}
/** Every intersection of finitely many of the sets (the empty intersection is X). */
export function intersectionsOf(ms: number[], n: number): number[] {
  const out = new Set<number>([(1 << n) - 1]);
  for (const m of ms) for (const u of [...out]) out.add(u & m);
  return sortMasks([...out]);
}
/** The topology on X a subbasis generates: the unions of the finite intersections. */
export const generated = (sub: number[], n: number) => unionsOf(intersectionsOf(sub, n));

/** The preimage of a subset of Y under f : X → Y (f[i] is the image of the i-th point). */
export const preimage = (f: number[], m: number) => f.reduce((acc, y, i) => (m & (1 << y) ? acc | (1 << i) : acc), 0);
/** The image of a subset of X. */
export const image = (f: number[], m: number) => f.reduce((acc, y, i) => (m & (1 << i) ? acc | (1 << y) : acc), 0);
/** f is continuous: every open set of Y has an open preimage. */
export const isContinuous = (f: number[], tx: number[], ty: number[]) => ty.every((v) => tx.includes(preimage(f, v)));
/** f is open: every open set of X has an open image. */
export const isOpenMap = (f: number[], tx: number[], ty: number[]) => tx.every((u) => ty.includes(image(f, u)));
