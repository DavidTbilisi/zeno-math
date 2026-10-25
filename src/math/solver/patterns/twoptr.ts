// Two pointers, L from the start and R from the end: at every step the score of the pair is worked out, a hit is
// found or counted (or the best score kept), and the rule says which pointer moves in.
import { cells } from "../../problems/core";
import type { Role } from "../../patternSteps";
import { fill, listText, say, slot, slotBool, slotNum, tape, varsRow, type Frame, type Value } from "../frames";
import type { PatternDef } from "../types";

const SCOPE = ["score", "a", "l", "r", "k", "n"];

export const twoptr: PatternDef = {
  data: ["nums"],
  slots: [
    { id: "sort", kind: "select", options: ["yes", "no"], default: "yes" },
    { id: "score", kind: "expr", scope: SCOPE.slice(1), default: "a[l] + a[r]" },
    { id: "hit", kind: "bool", scope: SCOPE, default: "score == k" },
    { id: "moveLeft", kind: "bool", scope: SCOPE, default: "score < k" },
    { id: "goal", kind: "select", options: ["find", "count", "maxScore", "minScore"], default: "find" },
  ],
  example: { nums: ["1, 2, 3, 4, 6, 8, 11", "10"] },
  run(env, s, w) {
    const p = w.twoptr;
    const typed = env.a as number[];
    const a = s.sort === "yes" ? [...typed].sort((x, y) => x - y) : typed;
    const n = a.length;
    const score = slot(w, "score", s.score);
    const hit = slot(w, "hit", s.hit);
    const moveLeft = slot(w, "moveLeft", s.moveLeft);
    const goal = s.goal;
    const t = tape(w);
    const pic = (l: number, r: number, vars: Record<string, Value>, role: (i: number) => Role = (i) => (i === l || i === r ? "compare" : i < l || i > r ? "idle" : "plain")): Partial<Frame> => ({
      cells: cells(a, role, { L: l, R: r }),
      rows: [varsRow(w, vars)],
    });
    if (s.sort === "yes" && typed.some((x, i) => x !== a[i])) t.push({ note: fill(p.sorted, { list: listText(a) }), cells: cells(a) });

    let [l, r] = [0, n - 1];
    let count = 0;
    let best: { l: number; r: number; v: number } | null = null;
    let found: { l: number; r: number; v: number } | null = null;
    while (l < r) {
      const scope = { ...env, a, l, r };
      const v = slotNum(score, w, scope);
      const scope2 = { ...scope, score: v };
      const h = slotBool(hit, w, scope2);
      if (goal === "count" && h) count++;
      if ((goal === "maxScore" || goal === "minScore") && (!best || (goal === "maxScore" ? v > best.v : v < best.v))) best = { l, r, v };
      const vars: Record<string, Value> = { L: l, R: r, score: v };
      if (goal === "count") vars.count = count;
      if (best) vars.best = best.v;
      const note = fill(h ? p.hit : p.look, { l, r, expr: score.text, v: say(v) });
      if (goal === "find" && h) {
        found = { l, r, v };
        t.push({ note, ...pic(l, r, vars) });
        break;
      }
      const both = goal === "count" && h;
      const left = !both && slotBool(moveLeft, w, scope2);
      const options = goal === "count" ? [p.moveL, p.moveR, p.both] : [p.moveL, p.moveR];
      const answer = both ? 2 : left ? 0 : 1;
      t.push({ note, then: options[answer], ask: { q: p.ask, options, answer }, ...pic(l, r, vars) });
      if (both) (l++, r--);
      else if (left) l++;
      else r--;
    }
    if (!t.frames.length) t.push({ note: fill(p.look, { l, r, expr: score.text, v: "—" }), ...pic(l, r, { L: l, R: r }) });

    const pair = (q: { l: number; r: number; v: number }) => ({ l: q.l, r: q.r, x: say(a[q.l]), y: say(a[q.r]), v: say(q.v), expr: score.text });
    const hot = (q: { l: number; r: number }): Partial<Frame> => ({ cells: cells(a, (i) => (i === q.l || i === q.r ? "sorted" : "idle"), { L: q.l, R: q.r }) });
    if (goal === "find") return found ? t.done(fill(p.answerFound, pair(found)), hot(found)) : t.done(p.answerNone, { cells: cells(a, () => "idle") });
    if (goal === "count") return t.done(fill(p.answerCount, { n: count }), { cells: cells(a) });
    return best ? t.done(fill(p.answerBest, pair(best)), hot(best)) : t.done(p.answerNever, { cells: cells(a, () => "idle") });
  },
};
