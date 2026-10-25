// Searching a grid from a square: a queue (BFS) or a stack (DFS) visits every passable square joined to it, stopping
// at the goal if one is given; components counts the separate blobs, and fill repaints the one the start is in.
import { grid2, row } from "../../problems/core";
import type { Role } from "../../patternSteps";
import { fill, say, slot, slotBool, tape, type Frame } from "../frames";
import type { PatternDef } from "../types";

const SCOPE = ["v", "r", "c", "g", "R", "C", "k"];
const rc = (r: number, c: number) => `(${r}, ${c})`;

export const gridsearch: PatternDef = {
  data: ["grid"],
  slots: [
    { id: "passable", kind: "bool", scope: SCOPE, default: "v == 1" },
    { id: "start", kind: "text", scope: [], default: "0, 0" },
    { id: "goalCell", kind: "bool", scope: SCOPE, default: "" },
    { id: "neighbours", kind: "select", options: ["four", "eight"], default: "four" },
    { id: "mode", kind: "select", options: ["bfs", "dfs", "components", "fill"], default: "bfs" },
  ],
  example: { grid: ["1 1 0 0 0; 1 1 0 0 0; 0 0 1 0 0; 0 0 0 1 1", ""] },
  run(env, s, w) {
    const p = w.gridsearch;
    const g = env.g as number[][];
    const [R, C] = [g.length, g[0].length];
    const passable = slot(w, "passable", s.passable);
    const goal = s.goalCell.trim() ? slot(w, "goalCell", s.goalCell) : null;
    const mode = s.mode;
    const at = (r: number, c: number) => ({ ...env, v: g[r][c], r, c });
    const pass = (r: number, c: number) => slotBool(passable, w, at(r, c));
    const m = s.start.replace(/[()[\]]/g, " ").trim().match(/^(\d+)\s*[,;\s]\s*(\d+)$/);
    const start: [number, number] | null = m ? [Number(m[1]), Number(m[2])] : null;
    if (mode !== "components" && (!start || start[0] >= R || start[1] >= C)) throw new Error(w.errors.start);
    const k = env.k;
    if (mode === "fill" && (typeof k !== "number" || !Number.isInteger(k) || k < 0 || k > 9)) throw new Error(fill(w.errors.range, { s: k === undefined ? "k" : say(k), lo: 0, hi: 9 }));
    const t = tape(w);
    const vals = g.map((r) => [...r]);
    const seen = grid2(R, C, () => false);
    const dist = grid2(R, C, () => 0);
    const parent = grid2<[number, number] | null>(R, C, () => null);
    const order: [number, number][] = [];
    const around = (r: number, c: number): [number, number][] => {
      const d = s.neighbours === "eight" ? [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]];
      return d.map(([dr, dc]): [number, number] => [r + dr, c + dc]).filter(([i, j]) => i >= 0 && j >= 0 && i < R && j < C);
    };
    // Visited squares are marked only when the search doesn't recolour them itself (fill and components do).
    const mark = mode === "bfs" || mode === "dfs";
    const pic = (cur: [number, number] | null, frontier: [number, number][], path: [number, number][] = []): Partial<Frame> => ({
      grid: {
        vals: vals.map((r) => [...r]),
        roles: grid2(R, C, (r, c): Role => (cur && cur[0] === r && cur[1] === c ? "key" : path.some(([i, j]) => i === r && j === c) ? "key" : frontier.some(([i, j]) => i === r && j === c) ? "compare" : mark && seen[r][c] ? "sorted" : "plain")),
      },
      rows: [row(mode === "dfs" ? w.stack : w.queue, frontier.map(([r, c]) => rc(r, c)))],
    });
    const pathTo = (r: number, c: number): [number, number][] => {
      const out: [number, number][] = [];
      for (let q: [number, number] | null = [r, c]; q; q = parent[q[0]][q[1]]) out.unshift(q);
      return out;
    };

    /** The search from one square; true when the goal was reached. */
    const search = (from: [number, number], comp: number): boolean => {
      const frontier: [number, number][] = [from];
      seen[from[0]][from[1]] = true;
      while (frontier.length) {
        const [r, c] = mode === "dfs" ? frontier.pop()! : frontier.shift()!;
        order.push([r, c]);
        if (mode === "fill") vals[r][c] = k as number;
        if (comp) vals[r][c] = Math.min(9, comp);
        if (goal && slotBool(goal, w, at(r, c))) {
          t.push({ note: fill(p.found, { r, c, d: dist[r][c] }), ...pic([r, c], frontier, pathTo(r, c)) });
          return true;
        }
        const fresh: [number, number][] = [];
        for (const [i, j] of around(r, c)) {
          if (seen[i][j] || !pass(i, j)) continue;
          seen[i][j] = true;
          dist[i][j] = dist[r][c] + 1;
          parent[i][j] = [r, c];
          frontier.push([i, j]);
          fresh.push([i, j]);
        }
        t.push({ note: fill(p.visit, { r, c, d: mode === "bfs" ? fill(p.dist, { d: dist[r][c] }) : "", n: fresh.length, list: fresh.length ? `: ${fresh.map(([i, j]) => rc(i, j)).join(", ")}` : "" }), ...pic([r, c], frontier) });
      }
      return false;
    };

    if (mode === "components") {
      let comp = 0;
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          if (seen[r][c] || !pass(r, c)) continue;
          comp++;
          t.push({ note: fill(p.component, { n: comp, r, c }), ...pic([r, c], []) });
          search([r, c], comp);
        }
      if (!t.frames.length) t.push({ note: fill(p.answerComponents, { n: 0 }), ...pic(null, []) });
      return t.done(fill(p.answerComponents, { n: comp }), pic(null, []));
    }
    const [r0, c0] = start!;
    if (!pass(r0, c0)) throw new Error(w.errors.blocked);
    t.push({ note: fill(p.start, { r: r0, c: c0 }), ...pic([r0, c0], [[r0, c0]]) });
    const hit = search([r0, c0], 0);
    const [r, c] = order[order.length - 1];
    if (mode === "fill") return t.done(fill(p.answerFill, { n: order.length, k: k as number }), pic(null, []));
    if (hit) return t.done(fill(p.found, { r, c, d: dist[r][c] }), pic(null, [], pathTo(r, c)));
    if (goal) return t.done(fill(p.answerNone, { n: order.length }), pic(null, []));
    return t.done(fill(p.answerVisited, { n: order.length, list: order.map(([i, j]) => rc(i, j)).join(" ") }), pic(null, []));
  },
};
