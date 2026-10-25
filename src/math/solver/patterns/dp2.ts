// Dynamic programming in a table: the base cases go in first, then each cell from the rule, row by row; the cells a
// step reads light up, and the answer formula says which cell to read at the end.
import type { Role } from "../../patternSteps";
import { cellVal, fill, numberAsk, parseBase, showVal, slot, slotNum, tape, varsRow, type Frame, type Value } from "../frames";
import { LIMITS, type PatternDef } from "../types";

const SCOPE = ["i", "j", "dp", "a", "b", "g", "v", "w", "cap", "k", "n", "m", "R", "C"];

export const dp2: PatternDef = {
  data: ["pair", "grid", "items", "nums"],
  slots: [
    { id: "rows", kind: "expr", scope: ["n", "m", "R", "C", "cap", "k"], default: "n + 1" },
    { id: "cols", kind: "expr", scope: ["n", "m", "R", "C", "cap", "k"], default: "m + 1" },
    { id: "base", kind: "list", scope: SCOPE, default: "dp[i][0] = 0; dp[0][j] = 0" },
    { id: "rec2", kind: "expr", scope: SCOPE, default: "if(a[i-1] == b[j-1], dp[i-1][j-1] + 1, max(dp[i-1][j], dp[i][j-1]))" },
    { id: "answer", kind: "expr", scope: SCOPE, default: "dp[n][m]" },
  ],
  example: { pair: ["abcde", "ace"], grid: ["1 3 1; 1 5 1; 4 2 1", ""], items: ["[6, 1], [10, 2], [12, 3]", "5"], nums: ["1, 2, 5", "5"] },
  run(env, s, w) {
    const p = w.dp2;
    const R = slotNum(slot(w, "rows", s.rows), w, env);
    const C = slotNum(slot(w, "cols", s.cols), w, env);
    const max = LIMITS.dp2;
    if (!Number.isInteger(R) || !Number.isInteger(C) || R < 1 || C < 1 || R > max || C > max) throw new Error(fill(w.errors.gridSize, { r: max, c: max }));
    const rec = slot(w, "rec2", s.rec2);
    const answer = slot(w, "answer", s.answer);
    const t = tape(w);
    const dp: Value[][] = Array.from({ length: R }, () => Array(C).fill(NaN));
    const scope = { ...env, dp };
    const unset = (v: Value) => typeof v === "number" && Number.isNaN(v);

    const base: string[] = [];
    for (const b of parseBase(w, s.base, 2)) {
      const rows = b.idx[0] === "i" ? dp.map((_, i) => i) : [b.idx[0] as number];
      const cols = b.idx[1] === "j" ? dp[0].map((_, j) => j) : [b.idx[1] as number];
      for (const i of rows)
        for (const j of cols) {
          if (i >= R || j >= C) throw new Error(fill(w.errors.inSlot, { slot: w.slots.base, msg: fill(w.errors.index, { s: `dp[${i}][${j}]` }) }));
          dp[i][j] = b.rhs.run({ ...scope, i, j });
          base.push(`dp[${i}][${j}] = ${showVal(dp[i][j])}`);
        }
    }
    // The table's headings: the two lists' entries (with ∅ for none of them), the items, the amounts.
    const names = (xs: Value[]) => ["∅", ...xs.map(showVal)];
    const heads: { rowHeads?: string[]; colHeads?: string[] } = {};
    if (Array.isArray(env.a) && R === env.a.length + 1) heads.rowHeads = names(env.a as Value[]);
    if (Array.isArray(env.b) && C === env.b.length + 1) heads.colHeads = names(env.b as Value[]);
    if (Array.isArray(env.v) && R === env.v.length + 1) heads.rowHeads = ["∅", ...(env.v as number[]).map((x, i) => `${showVal(x)}/${showVal((env.w as number[])[i])}`)];

    type Reads = [number, number][];
    const has = (r: Reads, i: number, j: number) => r.some(([x, y]) => x === i && y === j);
    const hooks = (r: Reads) => ({ onRead: (name: string, idx: number[]) => void (name === "dp" && idx.length === 2 && r.push([idx[0], idx[1]])) });
    const pic = (i: number, j: number, r: Reads, role: (x: number, y: number) => Role): Partial<Frame> => ({
      mat: { vals: dp.map((row) => row.map(cellVal)), roles: dp.map((row, x) => row.map((_, y) => role(x, y))), ...heads },
      rows: i >= 0 ? [varsRow(w, { i, j, "dp[i][j]": dp[i][j] })] : [],
    });
    const filled = (x: number, y: number): Role => (unset(dp[x][y]) ? "idle" : "sorted");
    t.push({ note: base.length ? fill(p.base, { list: base.length > 8 ? `${base.slice(0, 8).join(", ")}, …` : base.join(", ") }) : p.noBase, ...pic(-1, -1, [], filled) });

    for (let i = 0; i < R; i++)
      for (let j = 0; j < C; j++) {
        if (!unset(dp[i][j])) continue;
        const r: Reads = [];
        const v = rec.run({ ...scope, i, j }, hooks(r));
        const last = t.last!;
        last.then = fill(p.then, { i, j, expr: rec.text });
        if (typeof v === "number" && Number.isFinite(v)) last.ask = numberAsk(fill(p.ask, { i, j }), v, [v + 1, v - 1, 2 * v, v - 2]);
        dp[i][j] = v;
        const from = [...new Set(r.map(([x, y]) => `dp[${x}][${y}]`))];
        t.push({ note: fill(p.fill, { i, j, v: showVal(v), from: from.length ? fill(p.from, { list: from.join(", ") }) : "" }), ...pic(i, j, r, (x, y) => (x === i && y === j ? "key" : has(r, x, y) ? "compare" : filled(x, y))) });
      }
    const r: Reads = [];
    const v = answer.run(scope, hooks(r));
    return t.done(fill(p.answer, { expr: answer.text, v: showVal(v) }), pic(-1, -1, r, (x, y) => (has(r, x, y) ? "sorted" : "idle")));
  },
};
