// A sliding window over numbers or a text: the right end takes one in, the left end drops one while the window
// breaks the rule (or, for the shortest window, while it keeps it), and the best window by the goal is remembered.
import { cells } from "../../problems/core";
import type { Role } from "../../patternSteps";
import type { Value } from "../expr";
import { fill, listText, say, slot, slotBool, tape, varsRow, type Frame } from "../frames";
import type { PatternDef } from "../types";

const SCOPE = ["sum", "len", "distinct", "maxFreq", "win", "l", "r", "a", "k", "n"];

export const window: PatternDef = {
  data: ["nums", "text"],
  slots: [
    { id: "valid", kind: "bool", scope: SCOPE, default: "sum <= k" },
    { id: "score", kind: "expr", scope: SCOPE, default: "sum" },
    { id: "goal", kind: "select", options: ["longest", "shortest", "count", "maxScore", "minScore"], default: "longest" },
    { id: "mode", kind: "select", options: ["grow", "fixed"], default: "grow" },
  ],
  example: { nums: ["2, 1, 5, 1, 3, 2", "7"], text: ["abcabcbb", ""] },
  run(env, s, w) {
    const a = env.a as Value[];
    const n = a.length;
    const p = w.window;
    const valid = slot(w, "valid", s.valid);
    const score = slot(w, "score", s.score);
    const fixed = s.mode === "fixed";
    const goal = s.goal;
    const t = tape(w);
    const k = typeof env.k === "number" ? env.k : NaN;
    if (fixed && (!Number.isInteger(k) || k < 1 || k > n)) throw new Error(fill(w.errors.range, { s: env.k === undefined ? "k" : say(env.k), lo: 1, hi: n }));

    let l = 0;
    let best: { l: number; r: number; v: number } | null = null;
    let count = 0;
    /** The names a formula sees for the window [l–r]. */
    const bind = (l: number, r: number) => {
      const win = a.slice(l, r + 1);
      const nums = win.filter((x): x is number => typeof x === "number");
      const freq = new Map<string, number>();
      for (const x of win) freq.set(JSON.stringify(x), (freq.get(JSON.stringify(x)) ?? 0) + 1);
      return { ...env, l, r, win, sum: nums.reduce((u, x) => u + x, 0), len: win.length, distinct: freq.size, maxFreq: Math.max(0, ...freq.values()) };
    };
    const state = (ok: boolean) => fill(ok ? p.holds : p.fails, { expr: valid.text });
    const pic = (l: number, r: number, hot: number, scope: ReturnType<typeof bind>, ok: boolean): Partial<Frame> => {
      const vars: Record<string, Value> = { l, r, len: scope.len };
      if (a.every((x) => typeof x === "number")) vars.sum = scope.sum;
      vars.distinct = scope.distinct;
      if (goal === "maxScore" || goal === "minScore" || fixed) vars.score = ok ? score.run(scope) : "—";
      if (goal === "count") vars.count = count;
      else if (best) vars.best = goal === "longest" || goal === "shortest" ? best.r - best.l + 1 : best.v;
      return {
        cells: cells(a.map((x) => (typeof x === "number" ? x : say(x))), (i): Role => (i < l || i > r ? "idle" : i === hot ? "compare" : "key"), { l, r }, l <= r ? [l, r] : undefined),
        rows: [varsRow(w, vars)],
      };
    };
    /** The window [l–r] is valid: remember it if it beats the best so far. */
    const record = (l: number, r: number, scope: ReturnType<typeof bind>) => {
      const len = r - l + 1;
      if (goal === "count") count += fixed ? 1 : len;
      else if (goal === "longest") best = !best || len > best.r - best.l + 1 ? { l, r, v: len } : best;
      else if (goal === "shortest") best = !best || len < best.r - best.l + 1 ? { l, r, v: len } : best;
      else {
        const v = score.run(scope);
        if (typeof v !== "number") throw new Error(fill(w.errors.inSlot, { slot: w.slots.score, msg: fill(w.errors.notNumber, { s: score.text }) }));
        best = !best || (goal === "maxScore" ? v > best.v : v < best.v) ? { l, r, v } : best;
      }
    };
    const before = (move: "grow" | "shrink", l: number, r: number) => {
      const last = t.last;
      if (!last) return;
      last.then = fill(move === "grow" ? p.thenGrow : p.thenShrink, { l, r });
      last.ask = { q: p.ask, options: [fill(p.optGrow, { r }), fill(p.optShrink, { l })], answer: move === "grow" ? 0 : 1 };
    };

    for (let r = 0; r < n; r++) {
      before("grow", l, r);
      if (fixed) {
        l = Math.max(0, r - k + 1);
        const scope = bind(l, r);
        const full = r - l + 1 === k;
        const ok = full && slotBool(valid, w, scope);
        if (ok) record(l, r, scope);
        t.push({ note: full ? fill(p.fixed, { l, r, v: say(score.run(scope)) }) : fill(p.grow, { x: say(a[r]), r, l, len: r - l + 1, state: state(slotBool(valid, w, scope)) }), ...pic(l, r, r, scope, ok) });
        continue;
      }
      let scope = bind(l, r);
      let ok = slotBool(valid, w, scope);
      if (ok && goal !== "shortest") record(l, r, scope);
      if (ok && goal === "shortest") record(l, r, scope);
      t.push({ note: fill(p.grow, { x: say(a[r]), r, l, len: r - l + 1, state: state(ok) }), ...pic(l, r, r, scope, ok) });
      // Shrink while the window is wrong (or, for the shortest, while it is still right), dropping from the left.
      while (l <= r && (goal === "shortest" ? ok : !ok)) {
        before("shrink", l, r);
        const x = a[l];
        l++;
        scope = bind(l, r);
        ok = l <= r && slotBool(valid, w, scope);
        if (ok) record(l, r, scope);
        t.push({ note: fill(p.shrink, { x: say(x), l: l - 1, l1: l, r, len: r - l + 1, state: l <= r ? state(ok) : state(false) }), ...pic(l, r, -1, scope, ok) });
      }
    }

    const final = (l: number, r: number): Partial<Frame> => ({ cells: cells(a.map((x) => (typeof x === "number" ? x : say(x))), (i): Role => (i < l || i > r ? "idle" : "sorted"), undefined, [l, r]) });
    if (goal === "count") return t.done(fill(p.answerCount, { n: count, expr: valid.text }), { cells: cells(a.map((x) => (typeof x === "number" ? x : say(x)))) });
    const b = best as { l: number; r: number; v: number } | null;
    if (!b) return t.done(fill(p.none, { expr: valid.text }), { cells: cells(a.map((x) => (typeof x === "number" ? x : say(x))), () => "idle") });
    const v = { l: b.l, r: b.r, n: b.r - b.l + 1, v: say(b.v), list: listText(a.slice(b.l, b.r + 1)) };
    const key = goal === "longest" ? p.answerLongest : goal === "shortest" ? p.answerShortest : goal === "maxScore" ? p.answerMax : p.answerMin;
    return t.done(fill(key, v), final(b.l, b.r));
  },
};
