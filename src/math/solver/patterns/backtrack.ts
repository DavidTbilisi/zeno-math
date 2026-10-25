// Backtracking: choose, go deeper with what is left, undo, try the next. The choices explored grow into a tree; a
// choice the rule forbids is cut off at once, and every partial choice the accept rule likes is an answer.
import { row } from "../../problems/core";
import type { GraphEdge, Role } from "../../patternSteps";
import { fill, listText, say, slot, slotBool, tape, type Frame, type Value } from "../frames";
import { LIMITS, type PatternDef } from "../types";

export const backtrack: PatternDef = {
  data: ["nums"],
  slots: [
    { id: "choose", kind: "expr", scope: ["a", "k", "n"], default: "a" },
    { id: "allowed", kind: "bool", scope: ["x", "picked", "a", "k", "n"], default: "true" },
    { id: "accept", kind: "bool", scope: ["picked", "a", "k", "n"], default: "true" },
    { id: "reuse", kind: "select", options: ["once", "repeat", "ordered"], default: "once" },
  ],
  example: { nums: ["1, 2, 3", ""] },
  run(env, s, w) {
    const p = w.backtrack;
    const choose = slot(w, "choose", s.choose);
    const cands = choose.run(env);
    if (!Array.isArray(cands)) throw new Error(fill(w.errors.inSlot, { slot: w.slots.choose, msg: fill(w.errors.notList, { s: choose.text }) }));
    if (cands.length > LIMITS.candidates) throw new Error(fill(w.errors.candidates, { n: LIMITS.candidates }));
    const allowed = slot(w, "allowed", s.allowed);
    const accept = slot(w, "accept", s.accept);
    const reuse = s.reuse;
    const t = tape(w);

    // The tree of choices so far: the root is "nothing picked", each node one more choice under its parent.
    const labels = ["∅"];
    const depth = [0];
    const edges: GraphEdge[] = [];
    const state: ("plain" | "sorted" | "idle")[] = ["plain"];
    const path: number[] = [0];
    const picked: Value[] = [];
    const used = new Set<number>();
    const found: string[] = [];
    const add = (x: Value, parent: number): number => {
      if (labels.length >= LIMITS.nodes) throw new Error(fill(w.errors.tree, { n: LIMITS.nodes }));
      labels.push(say(x));
      depth.push(depth[parent] + 1);
      state.push("plain");
      edges.push({ a: parent, b: labels.length - 1 });
      return labels.length - 1;
    };
    const pic = (cur: number): Partial<Frame> => ({
      graph: {
        nodes: [...labels],
        edges: edges.map((e) => ({ ...e, role: (path.includes(e.b) ? "key" : state[e.b] === "idle" ? "idle" : "plain") as Role })),
        roles: labels.map((_, i): Role => (i === cur ? "key" : path.includes(i) ? "compare" : state[i])),
        directed: true,
        layer: [...depth],
      },
      rows: [row(w.picked, picked.map(say)), row(w.found, found, () => "sorted")],
    });

    const go = (from: number, node: number) => {
      if (slotBool(accept, w, { ...env, picked })) {
        found.push(listText(picked));
        state[node] = "sorted";
        t.push({ note: fill(p.accept, { list: listText(picked) }), ...pic(node) });
      }
      const idx = reuse === "ordered" ? cands.map((_, i) => i).filter((i) => !used.has(i)) : cands.map((_, i) => i).filter((i) => i >= from);
      for (const i of idx) {
        const x = cands[i];
        const child = add(x, node);
        if (!slotBool(allowed, w, { ...env, x, picked })) {
          state[child] = "idle";
          t.push({ note: fill(p.prune, { x: say(x), expr: allowed.text }), ...pic(node) });
          continue;
        }
        picked.push(x);
        used.add(i);
        path.push(child);
        t.push({ note: fill(p.choose, { x: say(x), list: listText(picked) }), ...pic(child) });
        go(reuse === "once" ? i + 1 : i, child);
        picked.pop();
        used.delete(i);
        path.pop();
        t.push({ note: fill(p.undo, { x: say(x), list: listText(picked) }), ...pic(node) });
      }
    };
    t.push({ note: fill(p.start, { n: cands.length }), ...pic(0) });
    go(0, 0);
    return t.done(found.length ? fill(p.answer, { n: found.length, list: found.join(", ") }) : p.none, pic(-1));
  },
};
