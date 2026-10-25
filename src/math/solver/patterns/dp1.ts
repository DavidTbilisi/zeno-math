// Dynamic programming in one row: the base cases go in first, then each cell from the rule, left to right; the cells
// a step reads light up, and the answer formula says which cell (or cells) to read at the end.
import { cells, row } from "../../problems/core";
import type { Role } from "../../patternSteps";
import { cellVal, fill, numberAsk, parseBase, say, showVal, slot, tape, varsRow, type Frame, type Value } from "../frames";
import { LIMITS, type PatternDef } from "../types";

export const DP1_MAX = 24;

export const dp1: PatternDef = {
  data: ["nums"],
  slots: [
    { id: "size", kind: "select", options: ["n", "k1"], default: "n" },
    { id: "base", kind: "list", scope: ["a", "k", "n"], default: "dp[0] = a[0]; dp[1] = max(a[0], a[1])" },
    { id: "rec", kind: "expr", scope: ["i", "dp", "a", "k", "n"], default: "max(dp[i-1], dp[i-2] + a[i])" },
    { id: "answer", kind: "expr", scope: ["dp", "a", "k", "n"], default: "dp[n-1]" },
  ],
  example: { nums: ["4, 9, 6, 2, 8, 7, 3", ""] },
  run(env, s, w) {
    const p = w.dp1;
    const a = env.a as number[];
    const n = a.length;
    const k = env.k;
    if (s.size === "k1" && (typeof k !== "number" || !Number.isInteger(k) || k < 0 || k > DP1_MAX - 1)) throw new Error(fill(w.errors.range, { s: k === undefined ? "k" : say(k), lo: 0, hi: DP1_MAX - 1 }));
    const size = s.size === "k1" ? (k as number) + 1 : n;
    if (size < 1 || size > DP1_MAX) throw new Error(fill(w.errors.tooMany, { n: DP1_MAX }));
    const rec = slot(w, "rec", s.rec);
    const answer = slot(w, "answer", s.answer);
    const t = tape(w);
    const dp: Value[] = Array(size).fill(NaN);
    const scope = { ...env, a, n, dp };

    // The base cases, each written as dp[0] = … (dp[i] = … fills every cell).
    const base: string[] = [];
    for (const b of parseBase(w, s.base, 1)) {
      const at = b.idx[0] === "i" ? dp.map((_, i) => i) : [b.idx[0] as number];
      for (const i of at) {
        if (i >= size) throw new Error(fill(w.errors.inSlot, { slot: w.slots.base, msg: fill(w.errors.index, { s: `dp[${i}]` }) }));
        dp[i] = b.rhs.run({ ...scope, i });
        base.push(`dp[${i}] = ${showVal(dp[i])}`);
      }
    }
    type Reads = { dp: number[]; a: number[] };
    const reads = (): Reads => ({ dp: [], a: [] });
    const hooks = (r: Reads) => ({ onRead: (name: string, idx: number[]) => void (name === "dp" ? r.dp.push(idx[0]) : name === "a" && r.a.push(idx[0])) });
    const pic = (i: number, r: Reads, role: (j: number) => Role): Partial<Frame> => ({
      cells: cells(dp.map(cellVal), role, i >= 0 ? { i } : undefined),
      rows: [row("a", a, (j) => (r.a.includes(j) ? "compare" : "plain")), ...(i >= 0 ? [varsRow(w, { i, "dp[i]": dp[i] })] : [])],
    });
    const filled = (j: number): Role => (typeof dp[j] === "number" && Number.isNaN(dp[j]) ? "idle" : "sorted");
    t.push({ note: base.length ? fill(p.base, { list: base.join(", ") }) : p.noBase, ...pic(-1, reads(), filled) });

    for (let i = 0; i < size; i++) {
      if (!(typeof dp[i] === "number" && Number.isNaN(dp[i]))) continue;
      const r = reads();
      const v = rec.run({ ...scope, i }, hooks(r));
      const last = t.last!;
      last.then = fill(p.then, { i, expr: rec.text });
      if (typeof v === "number" && Number.isFinite(v)) last.ask = numberAsk(fill(p.ask, { i }), v, [v + 1, v - 1, 2 * v, v - 2]);
      dp[i] = v;
      const from = [...new Set(r.dp)].map((j) => `dp[${j}]`).concat([...new Set(r.a)].map((j) => `a[${j}]`));
      t.push({ note: fill(p.fill, { i, v: showVal(v), from: from.length ? fill(p.from, { list: from.join(", ") }) : "" }), ...pic(i, r, (j) => (j === i ? "key" : r.dp.includes(j) ? "compare" : filled(j))) });
    }
    const r = reads();
    const v = answer.run(scope, hooks(r));
    return t.done(fill(p.answer, { expr: answer.text, v: showVal(v) }), pic(-1, r, (j) => (r.dp.includes(j) ? "sorted" : "idle")));
  },
};

export const DP1_LIMIT = LIMITS;
