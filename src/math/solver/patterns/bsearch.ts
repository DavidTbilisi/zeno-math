// Binary search over the positions of a sorted list or over a range of whole numbers: ok(mid) must turn from false
// to true somewhere, and each step keeps the half that still holds the boundary.
import { cells } from "../../problems/core";
import type { Role } from "../../patternSteps";
import { fill, say, slot, slotBool, tape, varsRow, type Frame } from "../frames";
import { LIMITS, type PatternDef } from "../types";

export const bsearch: PatternDef = {
  data: ["nums", "range"],
  slots: [
    { id: "ok", kind: "bool", scope: ["mid", "a", "k", "lo", "hi", "n"], default: "a[mid] >= k" },
    { id: "find", kind: "select", options: ["firstTrue", "lastFalse"], default: "firstTrue" },
  ],
  example: { nums: ["1, 3, 5, 7, 9, 11, 13", "7"], range: ["0", "40", "26", ""] },
  run(env, s, w) {
    const p = w.bsearch;
    const ok = slot(w, "ok", s.ok);
    const overList = Array.isArray(env.a) && typeof env.lo !== "number";
    const a = overList ? (env.a as number[]) : null;
    const [lo0, hi0] = a ? [0, a.length - 1] : [env.lo as number, env.hi as number];
    const t = tape(w);
    const few = hi0 - lo0 + 1 <= LIMITS.rangeCells;
    const vals = a ?? (few ? Array.from({ length: hi0 - lo0 + 1 }, (_, i) => lo0 + i) : null);
    const at = (m: number) => (a ? fill(p.at, { m, x: say(a[m]) }) : "");
    const pic = (lo: number, hi: number, mid: number, role: (v: number) => Role): Partial<Frame> =>
      vals
        ? { cells: cells(vals, (i) => role(lo0 + i), { lo: lo - lo0, mid: mid - lo0, hi: hi - lo0 }, lo <= hi ? [lo - lo0, hi - lo0] : undefined) }
        : { cells: cells([lo, mid, hi], (i) => (i === 1 ? "compare" : "plain"), { lo: 0, mid: 1, hi: 2 }) };

    let [lo, hi] = [lo0, hi0];
    let first: number | null = null;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const v = slotBool(ok, w, { ...env, mid, lo, hi });
      t.push({
        note: fill(p.mid, { lo, hi, m: mid, at: at(mid), expr: ok.text, yn: v ? p.yes : p.no }),
        then: v ? p.left : p.right,
        ask: { q: p.ask, options: [p.optLeft, p.optRight], answer: v ? 0 : 1 },
        ...pic(lo, hi, mid, (x) => (x === mid ? "compare" : x < lo || x > hi ? "idle" : "plain")),
        rows: [varsRow(w, { lo, mid, hi, [ok.text]: v })],
      });
      if (v) (first = mid), (hi = mid - 1);
      else lo = mid + 1;
    }
    const answerAt = (m: number | null): Partial<Frame> => (vals ? { cells: cells(vals, (i) => (lo0 + i === m ? "sorted" : "idle")) } : { cells: cells([m ?? "—"], () => "sorted") });
    if (s.find === "firstTrue") return first === null ? t.done(fill(p.never, { expr: ok.text }), answerAt(null)) : t.done(fill(p.answerFirst, { expr: ok.text, m: first, at: at(first) }), answerAt(first));
    const last = lo - 1;
    return last < lo0 ? t.done(fill(p.always, { expr: ok.text }), answerAt(null)) : t.done(fill(p.answerLast, { expr: ok.text, m: last, at: at(last) }), answerAt(last));
  },
};
