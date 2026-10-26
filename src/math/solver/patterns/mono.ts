// A monotonic stack: each new value pops every top the rule says it beats, and the record says what a pop means
// (the popped one learns the new value, the new one learns the top that is left, or how far apart they were).
import { cells, row } from "../../problems/core";
import type { Role } from "../../patternSteps";
import { fill, listText, say, showVal, slot, slotBool, tape, type Frame, type Value } from "../frames";
import type { PatternDef } from "../types";

export const mono: PatternDef = {
  data: ["nums"],
  slots: [
    { id: "popWhile", kind: "bool", scope: ["top", "cur", "topIdx", "i", "a", "k", "n"], default: "cur > top" },
    { id: "direction", kind: "select", options: ["l2r", "r2l"], default: "l2r" },
    { id: "record", kind: "select", options: ["poppedValue", "topValue", "poppedDist"], default: "poppedValue" },
  ],
  example: { nums: ["2, 1, 2, 4, 3", ""] },
  run(env, s, w) {
    const p = w.mono;
    const a = env.a as number[];
    const n = a.length;
    const popWhile = slot(w, "popWhile", s.popWhile);
    const record = s.record;
    const t = tape(w);
    const order = s.direction === "r2l" ? a.map((_, i) => n - 1 - i) : a.map((_, i) => i);
    const stack: number[] = [];
    const result: Value[] = Array(n).fill(record === "poppedDist" ? 0 : -1);
    const popped = new Set<number>();
    const pic = (i: number, set: number): Partial<Frame> => ({
      cells: cells(a, (j): Role => (j === i ? "key" : stack.includes(j) ? "compare" : popped.has(j) ? "sorted" : "plain"), { i }),
      rows: [row(w.stack, stack.map((j) => a[j])), row(w.result, result.map(showVal), (j) => (j === set ? "key" : "plain"))],
    });
    const decide = (pop: boolean, i: number, j: number) => {
      const last = t.last;
      if (!last) return;
      const v = { x: say(a[i]), i, y: say(a[j]), j };
      last.then = fill(pop ? p.optPop : p.optPush, v);
      last.ask = { q: fill(p.ask, v), options: [fill(p.optPop, v), fill(p.optPush, v)], answer: pop ? 0 : 1 };
    };

    for (const i of order) {
      let wasEmpty = !stack.length;
      while (stack.length) {
        const j = stack[stack.length - 1];
        const scope = { ...env, top: a[j], cur: a[i], topIdx: j, i };
        const pop = slotBool(popWhile, w, scope);
        decide(pop, i, j);
        const v = { x: say(a[i]), i, y: say(a[j]), j, expr: popWhile.text, set: "" };
        if (!pop) {
          t.push({ note: fill(p.stays, v), ...pic(i, -1) });
          break;
        }
        stack.pop();
        popped.add(j);
        let set = -1;
        if (record === "poppedValue") (result[j] = a[i]), (set = j);
        if (record === "poppedDist") (result[j] = Math.abs(i - j)), (set = j);
        t.push({ note: fill(p.pop, { ...v, set: set >= 0 ? fill(p.set, { j, v: showVal(result[j]) }) : "" }), ...pic(i, set) });
        wasEmpty = !stack.length;
      }
      let set = -1;
      if (record === "topValue") (result[i] = stack.length ? a[stack[stack.length - 1]] : -1), (set = i);
      stack.push(i);
      const setText = set >= 0 ? fill(p.set, { j: i, v: showVal(result[i]) }) : "";
      t.push({ note: fill(wasEmpty && !setText ? p.empty : p.push, { x: say(a[i]), i, set: setText }), ...pic(i, set) });
    }
    return t.done(fill(p.answer, { list: listText(result), left: stack.length ? listText(stack.map((j) => a[j])) : p.nothing }), {
      cells: cells(a, (j) => (stack.includes(j) ? "compare" : "sorted")),
      rows: [row(w.stack, stack.map((j) => a[j])), row(w.result, result.map(showVal), () => "sorted")],
    });
  },
};
