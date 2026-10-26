// Searching a graph from a node: a queue (BFS) or a stack (DFS) reaches every node joined to it, stopping at the goal
// if one is given; shortest path is BFS that keeps where each node was reached from; components starts again from
// every node not yet reached.
import { row } from "../../problems/core";
import { adjacency, pic, type Edge } from "../../problems/graphs";
import type { Role } from "../../patternSteps";
import { fill, slot, tape, type Frame } from "../frames";
import type { PatternDef } from "../types";

export const graphsearch: PatternDef = {
  data: ["edges"],
  slots: [
    { id: "startNode", kind: "text", scope: [], default: "A" },
    { id: "goalNode", kind: "text", scope: [], default: "" },
    { id: "mode", kind: "select", options: ["bfs", "dfs", "shortestPath", "components"], default: "bfs" },
  ],
  example: { edges: ["A-B, A-C, B-D, C-D, D-E"] },
  run(env, s, w) {
    const p = w.graphsearch;
    const names = env.nodes as string[];
    const directed = env.directed as boolean;
    const es: Edge[] = (env.edges as number[][]).map(([a, b]) => ({ a, b, w: 1, oneWay: directed }));
    const adj = adjacency(names.length, es, directed);
    const mode = s.mode;
    const nodeOf = (id: "startNode" | "goalNode"): number => {
      const name = slot(w, id, s[id]).text;
      const i = names.indexOf(name);
      if (i < 0) throw new Error(fill(w.errors.inSlot, { slot: w.slots[id], msg: fill(w.errors.unknownNode, { s: name }) }));
      return i;
    };
    const start = mode === "components" ? 0 : nodeOf("startNode");
    const goal = mode === "components" || !s.goalNode.trim() ? -1 : nodeOf("goalNode");
    const t = tape(w);
    const seen: boolean[] = Array(names.length).fill(false);
    const via: number[] = Array(names.length).fill(-1); // the edge each node was reached by
    const dist: number[] = Array(names.length).fill(0);
    const order: number[] = [];
    const tags: string[] = Array(names.length).fill("");
    const stacked = mode === "dfs";
    const picture = (cur: number, frontier: number[], path: number[] = []): Partial<Frame> => ({
      graph: pic(
        names,
        es,
        directed,
        (i): Role => (i === cur || path.includes(i) ? "key" : frontier.includes(i) ? "compare" : seen[i] ? "sorted" : "plain"),
        (k): Role => (path.length ? (path.some((i) => via[i] === k) ? "key" : "plain") : via.includes(k) ? "sorted" : "plain"),
        mode === "components" ? { tags } : {},
      ),
      rows: [row(stacked ? w.stack : w.queue, frontier.map((i) => names[i])), row(w.order, order.map((i) => names[i]), (k) => (k === order.length - 1 ? "key" : "sorted"))],
    });
    const pathTo = (v: number): number[] => {
      const out: number[] = [];
      for (let q = v; q >= 0; q = via[q] >= 0 ? (es[via[q]].a === q ? es[via[q]].b : es[via[q]].a) : -1) out.unshift(q);
      return out;
    };

    const search = (from: number, comp: number): boolean => {
      const frontier = [from];
      seen[from] = true;
      while (frontier.length) {
        const v = stacked ? frontier.pop()! : frontier.shift()!;
        order.push(v);
        if (comp) tags[v] = String(comp);
        if (v === goal) {
          const path = pathTo(v);
          t.push({ note: fill(p.found, { v: names[v], d: dist[v], path: path.map((i) => names[i]).join(" → ") }), ...picture(v, frontier, path) });
          return true;
        }
        const fresh: number[] = [];
        for (const { to, k } of adj[v]) {
          if (seen[to]) continue;
          seen[to] = true;
          via[to] = k;
          dist[to] = dist[v] + 1;
          frontier.push(to);
          fresh.push(to);
        }
        t.push({ note: fill(p.visit, { v: names[v], n: fresh.length, list: fresh.length ? `: ${fresh.map((i) => names[i]).join(", ")}` : "" }), ...picture(v, frontier) });
      }
      return false;
    };

    if (mode === "components") {
      let comp = 0;
      for (let v = 0; v < names.length; v++) {
        if (seen[v]) continue;
        comp++;
        t.push({ note: fill(p.component, { n: comp, v: names[v] }), ...picture(v, []) });
        search(v, comp);
      }
      return t.done(fill(p.answerComponents, { n: comp }), picture(-1, []));
    }
    t.push({ note: fill(p.start, { v: names[start] }), ...picture(start, [start]) });
    const hit = search(start, 0);
    const last = order[order.length - 1];
    if (hit) return t.done(fill(p.found, { v: names[last], d: dist[last], path: pathTo(last).map((i) => names[i]).join(" → ") }), picture(-1, [], pathTo(last)));
    if (goal >= 0) return t.done(fill(p.answerNone, { n: order.length, v: names[goal] }), picture(-1, []));
    return t.done(fill(p.answerVisited, { n: order.length, list: order.map((i) => names[i]).join(" ") }), picture(-1, []));
  },
};
