// The kinds of data a pattern can start from, each read from its text boxes into the names a formula can use:
// numbers a (with k), a text s, a range lo..hi, two lists a and b, a grid g, items with a value and a weight, or
// the edges of a graph.
import { int, matrix, nums, text, type Errors as ProblemErrors } from "../problems/core";
import { parseEdges } from "../problems/graphs";
import { fill } from "../text";
import type { Env, Value } from "./expr";
import { LIMITS, type DataKind, type Errors, type SolverWords } from "./types";

export type DataDef = { fields: (keyof SolverWords["fields"])[]; read: (inputs: readonly string[], e: Errors) => Env };

const blank = (s: string | undefined) => !s || !s.trim();
/** k when it is typed: any number, so a formula can compare with it. */
function optional(s: string | undefined, e: Errors): Partial<Env> {
  if (blank(s)) return {};
  const v = Number(s!.replace(/[−–]/g, "-").trim());
  if (!Number.isFinite(v)) throw new Error(fill(e.number, { s: s!.trim() }));
  return { k: v };
}

/** A list of numbers, or of texts: written together ("abc") it is the characters, else the entries split by commas. */
function listOf(s: string, e: Errors): Value[] {
  const t = s.trim();
  if (!t) throw new Error(e.empty);
  const parts = /[,;\s]/.test(t) ? t.split(/[,;\s]+/).filter(Boolean) : [...t];
  if (parts.length > LIMITS.cells) throw new Error(fill(e.tooMany, { n: LIMITS.cells }));
  const numeric = parts.every((p) => Number.isFinite(Number(p.replace(/[−–]/g, "-"))));
  return numeric ? parts.map((p) => Number(p.replace(/[−–]/g, "-"))) : parts;
}

export const DATA: Record<DataKind, DataDef> = {
  nums: {
    fields: ["a", "k"],
    read: ([a, k], e) => {
      const xs = nums(a, e as ProblemErrors, { max: LIMITS.cells });
      return { a: xs, n: xs.length, ...optional(k, e) };
    },
  },
  text: {
    fields: ["s", "k"],
    read: ([s, k], e) => {
      const t = text(s, e as ProblemErrors, LIMITS.cells);
      return { s: t, a: [...t], n: [...t].length, ...optional(k, e) };
    },
  },
  range: {
    fields: ["lo", "hi", "k", "extra"],
    read: ([lo, hi, k, extra], e) => {
      const l = int(lo, e as ProblemErrors, -LIMITS.range, LIMITS.range);
      const h = int(hi, e as ProblemErrors, l, LIMITS.range);
      const out: Env = { lo: l, hi: h, ...optional(k, e) };
      if (!blank(extra)) out.a = nums(extra!, e as ProblemErrors, { max: LIMITS.cells });
      return out;
    },
  },
  pair: {
    fields: ["a", "b"],
    read: ([a, b], e) => {
      const [xs, ys] = [listOf(a, e), listOf(b, e)];
      return { a: xs, b: ys, n: xs.length, m: ys.length };
    },
  },
  grid: {
    fields: ["g", "k"],
    read: ([g, k], e) => {
      const rows = matrix(g, e as ProblemErrors, { rows: LIMITS.grid, cols: LIMITS.grid, whole: true, min: 0, max: 9 });
      return { g: rows, R: rows.length, C: rows[0].length, ...optional(k, e) };
    },
  },
  items: {
    fields: ["items", "cap"],
    read: ([items, cap], e) => {
      const pairs = [...items.replace(/[−–]/g, "-").matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].split(/[,\s]+/).filter(Boolean).map(Number));
      if (!pairs.length) throw new Error(e.empty);
      const bad = pairs.find((p) => p.length !== 2 || !p.every(Number.isFinite));
      if (bad) throw new Error(fill(e.interval, { s: bad.join(", ") }));
      if (pairs.length > LIMITS.dp2 - 1) throw new Error(fill(e.tooMany, { n: LIMITS.dp2 - 1 }));
      const c = int(cap, e as ProblemErrors, 0, LIMITS.dp2 - 1);
      return { v: pairs.map((p) => p[0]), w: pairs.map((p) => p[1]), n: pairs.length, cap: c };
    },
  },
  edges: {
    fields: ["edges"],
    read: ([edges], e) => {
      const g = parseEdges(edges, e as ProblemErrors, { max: 16, nodes: 10 });
      return { nodes: g.names, n: g.names.length, edges: g.list.map((x) => [x.a, x.b]), directed: g.list.some((x) => x.oneWay) };
    },
  },
};
