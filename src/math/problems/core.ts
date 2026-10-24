// What every interview problem is made of: its category and level, the inputs it reads (each typed as text, with an
// example), and a solver that turns them into frames to step through — the same frames as the algorithm patterns,
// drawn by the same scenes. Also the readers for those inputs and the small helpers the frames are built with. Kept
// free of React so the problems can be tested on their own.
import type { Dict } from "../../locales/en";
import type { ArchBox, ArchKind, ArchLink, Cells, Frame, GraphEdge, Role, Trace, TreeNode } from "../patternSteps";
import { fill } from "../text";

export type { ArchBox, ArchKind, ArchLink, Cells, Frame, GraphEdge, Role, Trace, TreeNode };
export { fill };

export type ProblemsWords = Dict["live"]["problems"];
export type Errors = ProblemsWords["errors"];

/** AlgoExpert's categories of coding questions, in its order, then SystemsExpert's fundamentals and design questions. */
export const CATEGORIES = [
  "arrays", "bst", "trees", "dp", "famous", "graphs", "greedy", "heaps", "lists", "recursion", "searching", "sorting",
  "stacks", "strings", "tries", "sysBasics", "sysDesigns",
] as const;
export type Category = (typeof CATEGORIES)[number];
/** The categories of system design, which the piece lists apart from the coding questions. */
export const SYSTEM_CATEGORIES: readonly Category[] = ["sysBasics", "sysDesigns"];
/** Easy, medium, hard, very hard; 0 for the system design topics, which have no level. */
export type Level = 0 | 1 | 2 | 3 | 4;

/** Every problem's words: its name, the idea behind it, a label per input, then whatever its notes need. */
export type ProblemText = { name: string; idea: string; labels: readonly string[] };

export type Problem<W extends ProblemText> = {
  level: Level;
  /** One example per input, as typed; the length is the number of inputs. */
  example: readonly string[];
  solve: (input: readonly string[], w: W, e: Errors) => Trace;
};
/** Some of a category's problems, kept in a file of their own (their words likewise) and spread into the category. */
export type ProblemSubset<C extends Category, K extends keyof ProblemsWords[C]> = { [P in K]: ProblemsWords[C][P] extends ProblemText ? Problem<ProblemsWords[C][P]> : never };
export type ProblemSet<C extends Category> = { [K in keyof ProblemsWords[C]]: ProblemsWords[C][K] extends ProblemText ? Problem<ProblemsWords[C][K]> : never };

// ——— Reading the inputs ———

const minus = (s: string) => s.replace(/[−–—]/g, "-");
export const show = (v: number) => (v < 0 ? `−${-v}` : String(v));
export const listText = (a: readonly (number | string)[]) => `[${a.map((v) => (typeof v === "number" ? show(v) : v)).join(", ")}]`;

/** Numbers split by commas, semicolons or spaces: at most `max`, whole numbers only if `whole`. */
export function nums(s: string, e: Errors, opts: { max?: number; min?: number; whole?: boolean; least?: number } = {}): number[] {
  const { max = 16, whole = false, least = 1 } = opts;
  const parts = minus(s).split(/[,;\s]+/).filter(Boolean);
  if (parts.length < least) throw new Error(least > 1 ? fill(e.tooFew, { n: least }) : e.empty);
  const vals = parts.map((p) => {
    const v = Number(p);
    if (!Number.isFinite(v) || (whole && !Number.isInteger(v))) throw new Error(fill(whole ? e.whole : e.number, { s: p }));
    if (opts.min !== undefined && v < opts.min) throw new Error(fill(e.atLeast, { s: p, n: opts.min }));
    return v;
  });
  if (vals.length > max) throw new Error(fill(e.tooMany, { n: max }));
  return vals;
}

/** One whole number from lo to hi. */
export function int(s: string, e: Errors, lo: number, hi: number): number {
  const v = Number(minus(s).trim());
  if (!s.trim() || !Number.isInteger(v) || v < lo || v > hi) throw new Error(fill(e.range, { s: s.trim() || "…", lo: show(lo), hi: show(hi) }));
  return v;
}

/** A text, at most `max` characters; spaces are kept but not at the ends. */
export function text(s: string, e: Errors, max = 16, least = 1): string {
  const t = s.trim();
  if ([...t].length < least) throw new Error(e.empty);
  if ([...t].length > max) throw new Error(fill(e.tooLong, { n: max }));
  return t;
}

/** Words split by commas or spaces. */
export function words(s: string, e: Errors, max = 8, longest = 12): string[] {
  const out = s.split(/[,;\s]+/).filter(Boolean);
  if (!out.length) throw new Error(e.empty);
  if (out.length > max) throw new Error(fill(e.tooMany, { n: max }));
  const long = out.find((x) => [...x].length > longest);
  if (long) throw new Error(fill(e.tooLong, { n: longest }));
  return out;
}

/** Rows split by ";" or new lines, numbers by commas or spaces; every row as long as the first. */
export function matrix(s: string, e: Errors, opts: { rows?: number; cols?: number; whole?: boolean; min?: number; max?: number } = {}): number[][] {
  const { rows = 8, cols = 8 } = opts;
  const out = s.split(/[;\n]/).map((r) => r.trim()).filter(Boolean).map((r) => nums(r, e, { max: cols, whole: opts.whole, min: opts.min }));
  if (!out.length) throw new Error(e.empty);
  if (out.length > rows) throw new Error(fill(e.gridSize, { r: rows, c: cols }));
  if (!out.every((r) => r.length === out[0].length)) throw new Error(e.ragged);
  if (opts.max !== undefined) {
    const big = out.flat().find((v) => v > opts.max!);
    if (big !== undefined) throw new Error(fill(e.atMost, { s: show(big), n: opts.max }));
  }
  return out;
}

/** A board of letters: rows split by ";" or new lines, letters by spaces or written together. */
export function letters(s: string, e: Errors, rows = 6, cols = 6): string[][] {
  const out = s.split(/[;\n]/).map((r) => r.trim()).filter(Boolean).map((r) => (/[\s,]/.test(r) ? r.split(/[\s,]+/) : [...r]));
  if (!out.length) throw new Error(e.empty);
  if (out.length > rows || out.some((r) => r.length > cols)) throw new Error(fill(e.gridSize, { r: rows, c: cols }));
  if (!out.every((r) => r.length === out[0].length)) throw new Error(e.ragged);
  return out;
}

/** "[1, 3], [2, 6]" or "1-3, 2-6" or "1 3; 2 6". */
export function intervals(s: string, e: Errors, max = 8): [number, number][] {
  const t = minus(s);
  let pairs: string[][];
  if (t.includes("[")) pairs = [...t.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].split(/[,\s]+/).filter(Boolean));
  else pairs = t.split(/[,;]/).map((p) => p.trim()).filter(Boolean).map((p) => p.match(/^(-?[\d.]+)\s*(?:-|\s)\s*(-?[\d.]+)$/)?.slice(1) ?? [p]);
  if (!pairs.length) throw new Error(e.empty);
  const out = pairs.map((p): [number, number] => {
    const [a, b] = p.map(Number);
    if (p.length !== 2 || !Number.isFinite(a) || !Number.isFinite(b) || a > b) throw new Error(fill(e.interval, { s: p.join(", ") }));
    return [a, b];
  });
  if (out.length > max) throw new Error(fill(e.tooMany, { n: max }));
  return out;
}

/** Points "1,2 3,4" or "(1, 2) (3, 4)" or "1 2; 3 4": with ";" each part is a point, otherwise the numbers pair up. */
export function points(s: string, e: Errors, max = 10): [number, number][] {
  const t = minus(s).replace(/[()[\]]/g, " ");
  const groups = t.includes(";") ? t.split(";").map((g) => g.trim()).filter(Boolean) : [t];
  const out = groups.flatMap((g): [number, number][] => {
    const p = g.split(/[,\s]+/).filter(Boolean).map(Number);
    if (!p.length || p.length % 2 || (t.includes(";") && p.length !== 2) || !p.every(Number.isInteger)) throw new Error(fill(e.point, { s: g }));
    return Array.from({ length: p.length / 2 }, (_, k) => [p[2 * k], p[2 * k + 1]]);
  });
  if (!out.length) throw new Error(e.empty);
  if (out.length > max) throw new Error(fill(e.tooMany, { n: max }));
  return out;
}

/**
 * Edges "A-B, B-C 4" (or A>B for one way): the names in the order they first appear, and the edges between their
 * indices with the weight if one is given.
 */
export function edges(s: string, e: Errors, opts: { max?: number; nodes?: number; weighted?: boolean } = {}): { names: string[]; edges: { a: number; b: number; w: number }[]; oneWay: boolean } {
  const { max = 16, nodes = 10 } = opts;
  const names: string[] = [];
  const at = (n: string) => {
    let i = names.indexOf(n);
    if (i < 0) (i = names.length), names.push(n);
    return i;
  };
  let oneWay = false;
  const out = minus(s).split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => {
    const m = x.match(/^([\p{L}\d_]+)\s*(->|>|-)\s*([\p{L}\d_]+)(?:\s+(-?[\d.]+))?$/u);
    if (!m || (opts.weighted && m[4] === undefined)) throw new Error(fill(e.edge, { s: x }));
    if (m[2] !== "-") oneWay = true;
    return { a: at(m[1]), b: at(m[3]), w: m[4] === undefined ? 1 : Number(m[4]) };
  });
  if (!out.length) throw new Error(e.empty);
  if (out.length > max) throw new Error(fill(e.tooMany, { n: max }));
  if (names.length > nodes) throw new Error(fill(e.tooManyNodes, { n: nodes }));
  return { names, edges: out, oneWay };
}

/** A binary tree written level by level, as LeetCode writes it: "1, null, 2, 3". */
export function tree(s: string, e: Errors, max = 15, deepest = 5): TreeNode[] {
  const parts = minus(s).split(/[,;\s]+/).filter(Boolean);
  if (!parts.length || /^(null|-|#)$/i.test(parts[0])) throw new Error(e.empty);
  const vals = parts.map((p) => {
    if (/^(null|-|#)$/i.test(p)) return null;
    const v = Number(p);
    if (!Number.isFinite(v)) throw new Error(fill(e.number, { s: p }));
    return v;
  });
  const out: TreeNode[] = [{ val: vals[0]!, left: -1, right: -1 }];
  const queue = [0];
  let i = 1;
  while (queue.length && i < vals.length) {
    const p = queue.shift()!;
    for (const side of ["left", "right"] as const) {
      if (i >= vals.length) break;
      const v = vals[i++];
      if (v === null) continue;
      out.push({ val: v, left: -1, right: -1 });
      out[p][side] = out.length - 1;
      queue.push(out.length - 1);
    }
  }
  if (out.length > max) throw new Error(fill(e.tooMany, { n: max }));
  if (depth(out) > deepest) throw new Error(fill(e.deep, { n: deepest }));
  return out;
}

/** How many levels a tree has. */
export function depth(nodes: readonly TreeNode[], at = 0): number {
  return at < 0 || !nodes.length ? 0 : 1 + Math.max(depth(nodes, nodes[at].left), depth(nodes, nodes[at].right));
}

/** A tree written level by level again, without the nulls at the end. */
export function writeTree(nodes: readonly TreeNode[], root = 0): string {
  if (root < 0 || !nodes.length) return "";
  const out: string[] = [];
  const queue = [root];
  while (queue.length) {
    const at = queue.shift()!;
    if (at < 0) {
      out.push("null");
      continue;
    }
    out.push(show(nodes[at].val));
    queue.push(nodes[at].left, nodes[at].right);
  }
  while (out[out.length - 1] === "null") out.pop();
  return out.join(", ");
}

// ——— Building frames ———

export const rolesOf = (n: number, f: (i: number) => Role): Role[] => Array.from({ length: n }, (_, i) => f(i));
export const grid2 = <T>(r: number, c: number, f: (i: number, j: number) => T): T[][] => Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => f(i, j)));

/** A row of cells with pointers under them. */
export const cells = (vals: readonly (number | string)[], role: (i: number) => Role = () => "plain", ptrs?: Record<string, number>, range?: [number, number]): Cells => ({
  vals: [...vals],
  roles: rolesOf(vals.length, role),
  ...(ptrs ? { ptrs } : {}),
  ...(range ? { range } : {}),
});

/** A labelled row under the picture. */
export const row = (label: string, vals: readonly (number | string)[], role: (i: number) => Role = () => "plain"): Cells => ({ label, vals: [...vals], roles: rolesOf(vals.length, role) });

/** The frames end with the answer said once more, the picture as the last step left it. */
export function done(frames: Frame[], answer: string, extra: Partial<Frame> = {}): Trace {
  const last = frames[frames.length - 1];
  frames.push({ ...last, ...extra, note: answer, then: undefined, ask: undefined });
  return { frames, answer };
}

