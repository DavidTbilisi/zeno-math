// Interview problems on graphs: trees walked depth first and breadth first, grids searched for rivers and islands,
// graphs coloured, searched for cycles and bridges, and rates searched for arbitrage. Each solver leaves a frame at
// every step: the graph with its nodes coloured as the search sees them, or the grid as a table.
import { done, fill, grid2, letters, listText, matrix, nums, row, rolesOf, show, text, words, type Errors, type Frame, type GraphEdge, type ProblemSet, type Role } from "./core";

// ——— Shared with the famous algorithms ———

type Graph = NonNullable<Frame["graph"]>;
/** An edge as typed: between the indices of two names, its weight (1 if none), and whether it goes one way. */
export type Edge = { a: number; b: number; w: number; oneWay: boolean };

/**
 * Edges "A-B, B-C 4" or "A>B" (one way), each remembering which way it was written. With `names` given, every name
 * must be one of them (`unknown` says so otherwise); without, the names (three letters at most) are collected in the
 * order they appear.
 */
export function parseEdges(
  s: string,
  e: Errors,
  opts: { max?: number; nodes?: number; weighted?: boolean; names?: readonly string[]; unknown?: string; empty?: boolean } = {},
): { names: string[]; list: Edge[] } {
  const { max = 16, nodes = 10 } = opts;
  const names = opts.names ? [...opts.names] : [];
  const at = (n: string) => {
    let i = names.indexOf(n);
    if (i < 0) {
      if (opts.names) throw new Error(fill(opts.unknown ?? e.bad, { s: n }));
      // A name is written inside its node's circle, so it has to be short.
      if ([...n].length > 3) throw new Error(fill(e.tooLong, { n: 3 }));
      i = names.length;
      names.push(n);
    }
    return i;
  };
  const parts = s.replace(/[−–—]/g, "-").split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length && !opts.empty) throw new Error(e.empty);
  if (parts.length > max) throw new Error(fill(e.tooMany, { n: max }));
  const list = parts.map((x): Edge => {
    const m = x.match(/^([\p{L}\d_]+)\s*(->|>|-)\s*([\p{L}\d_]+)(?:\s+(-?\d+(?:\.\d+)?))?$/u);
    if (!m || (opts.weighted && m[4] === undefined)) throw new Error(fill(e.edge, { s: x }));
    return { a: at(m[1]), b: at(m[3]), w: m[4] === undefined ? 1 : Number(m[4]), oneWay: m[2] !== "-" };
  });
  if (names.length > nodes) throw new Error(fill(e.tooManyNodes, { n: nodes }));
  return { names, list };
}

/** Names split by commas or spaces, each once. */
export function names(s: string, e: Errors, max = 10): string[] {
  const out = words(s, e, max, 3);
  const twice = out.find((x, i) => out.indexOf(x) !== i);
  if (twice !== undefined) throw new Error(fill(e.bad, { s: twice }));
  return out;
}

/** A graph's picture: its nodes coloured by `role`, its edges by `edgeRole`, weights written when `weighted`. */
export function pic(
  nodes: readonly string[],
  es: readonly { a: number; b: number; w?: number }[],
  directed: boolean,
  role: (i: number) => Role,
  edgeRole: (k: number) => Role = () => "plain",
  more: { tags?: string[]; layer?: number[]; weighted?: boolean } = {},
): Graph {
  return {
    nodes: [...nodes],
    edges: es.map((x, k): GraphEdge => ({ a: x.a, b: x.b, ...(more.weighted && x.w !== undefined ? { w: show(x.w) } : {}), role: edgeRole(k) })),
    roles: rolesOf(nodes.length, role),
    directed,
    ...(more.layer ? { layer: more.layer } : {}),
    ...(more.tags ? { tags: more.tags } : {}),
  };
}

/** Each node's neighbours, in the order the edges were typed (both ends of an edge unless it goes one way). */
export function adjacency(n: number, es: readonly Edge[], directed: boolean): { to: number; k: number }[][] {
  const out: { to: number; k: number }[][] = Array.from({ length: n }, () => []);
  es.forEach((x, k) => {
    out[x.a].push({ to: x.b, k });
    if (!directed) out[x.b].push({ to: x.a, k });
  });
  return out;
}

const rc = (r: number, c: number) => `(${r}, ${c})`;
/** The four squares next to (r, c) inside an R × C grid: up, down, left, right. */
const four = (R: number, C: number, r: number, c: number): [number, number][] =>
  ([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as [number, number][]).filter(([i, j]) => i >= 0 && j >= 0 && i < R && j < C);

/** A matrix of 0s and 1s only. */
function bits(s: string, e: Errors, rows = 8, cols = 10): number[][] {
  const m = matrix(s, e, { rows, cols, whole: true });
  const odd = m.flat().find((v) => v !== 0 && v !== 1);
  if (odd !== undefined) throw new Error(fill(e.bad, { s: show(odd) }));
  return m;
}

const matRows = (m: readonly (readonly number[])[]) => m.map((r) => listText(r)).join(", ");

// ——— Trees with named nodes ———

type Named = { names: string[]; kids: number[][]; parent: number[]; layer: number[]; links: { a: number; b: number }[] };

/**
 * A tree from (parent, child) pairs of names: one root, which no pair names as a child, and every other name the
 * child of exactly one. Renumbered level by level, children in the order they were typed, so it draws in layers.
 */
function namedTree(pairs: readonly [string, string][], loose: readonly string[], bad: string): Named {
  const all = [...loose];
  for (const [p, c] of pairs) for (const x of [p, c]) if (!all.includes(x)) all.push(x);
  const up = new Map<string, string>();
  const down = new Map<string, string[]>(all.map((x) => [x, []]));
  for (const [p, c] of pairs) {
    if (up.has(c) || p === c) throw new Error(bad);
    up.set(c, p);
    down.get(p)!.push(c);
  }
  const roots = all.filter((x) => !up.has(x));
  if (roots.length !== 1) throw new Error(bad);
  const order = [roots[0]];
  for (let k = 0; k < order.length; k++) order.push(...down.get(order[k])!);
  if (order.length !== all.length) throw new Error(bad);
  const idx = new Map(order.map((x, i) => [x, i]));
  const parent = order.map((x) => (up.has(x) ? idx.get(up.get(x)!)! : -1));
  const layer: number[] = [];
  parent.forEach((p, i) => (layer[i] = p < 0 ? 0 : layer[p] + 1));
  return {
    names: order,
    kids: order.map((x) => down.get(x)!.map((c) => idx.get(c)!)),
    parent,
    layer,
    links: parent.flatMap((p, i) => (p < 0 ? [] : [{ a: p, b: i }])),
  };
}

/** "A-B, A-C, B-D": each edge from parent to child; or a single name for a tree of one node. */
function readTree(s: string, e: Errors, bad: string): Named {
  const one = s.trim();
  if (/^[\p{L}\d_]+$/u.test(one)) return namedTree([], [one], bad);
  const g = parseEdges(s, e, { max: 14, nodes: 15 });
  return namedTree(g.list.map((x) => [g.names[x.a], g.names[x.b]]), [], bad);
}

export const GRAPHS: ProblemSet<"graphs"> = {
  depthFirstSearch: {
    level: 1,
    example: ["M-K, M-T, K-A, K-Z, T-B, T-Q, T-R, Z-E"],
    solve: ([s], w, e) => {
      const t = readTree(s, e, w.notTree);
      const order: number[] = [];
      const path: number[] = [];
      const frames: Frame[] = [];
      const visit = (v: number) => {
        path.push(v);
        order.push(v);
        const kids = t.kids[v].map((k) => t.names[k]);
        frames.push({
          note: kids.length ? fill(w.visit, { v: t.names[v], list: kids.join(", ") }) : fill(w.leaf, { v: t.names[v] }),
          graph: pic(t.names, t.links, false, (i) => (i === v ? "key" : path.includes(i) ? "compare" : order.includes(i) ? "sorted" : "plain"), (k) => (order.includes(t.links[k].b) ? "sorted" : "plain"), { layer: t.layer }),
          rows: [row(w.path, path.map((i) => t.names[i]), () => "compare"), row(w.order, order.map((i) => t.names[i]), (k) => (k === order.length - 1 ? "key" : "sorted"))],
        });
        for (const k of t.kids[v]) visit(k);
        path.pop();
      };
      visit(0);
      return done(frames, fill(w.answer, { list: listText(order.map((i) => t.names[i])) }), {
        graph: pic(t.names, t.links, false, () => "sorted", () => "sorted", { layer: t.layer }),
      });
    },
  },

  singleCycleCheck: {
    level: 2,
    example: ["2, -3, 3, -3, -1, -4"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { whole: true, max: 14 });
      const n = xs.length;
      const seen: number[] = [];
      const frames: Frame[] = [];
      let i = 0;
      for (let k = 0; k < n; k++) {
        if (k > 0 && i === 0) {
          frames.push({ note: fill(w.early, { k }), cells: { vals: xs, roles: rolesOf(n, (j) => (j === 0 ? "min" : seen.includes(j) ? "sorted" : "plain")), ptrs: { i } } });
          return done(frames, fill(w.noEarly, { k, n }));
        }
        seen.push(i);
        const to = (((i + xs[i]) % n) + n) % n;
        frames.push({
          note: fill(w.jump, { k: k + 1, i, v: show(xs[i]), j: to }),
          cells: { vals: xs, roles: rolesOf(n, (j) => (j === to ? "key" : j === i ? "compare" : seen.includes(j) ? "sorted" : "plain")), ptrs: { i, next: to } },
        });
        i = to;
      }
      const yes = i === 0;
      return done(frames, yes ? fill(w.yes, { n }) : fill(w.noEnd, { n, j: i }), {
        cells: { vals: xs, roles: rolesOf(n, (j) => (yes ? "sorted" : j === i ? "min" : seen.includes(j) ? "sorted" : "plain")), ptrs: { i } },
      });
    },
  },

  breadthFirstSearch: {
    level: 2,
    example: ["S-L, S-H, L-C, L-G, H-P, C-N, P-K, P-D"],
    solve: ([s], w, e) => {
      const t = readTree(s, e, w.notTree);
      const queue = [0];
      const order: number[] = [];
      const frames: Frame[] = [{
        note: fill(w.start, { v: t.names[0] }),
        graph: pic(t.names, t.links, false, (i) => (i === 0 ? "compare" : "plain"), () => "plain", { layer: t.layer }),
        rows: [row(w.queue, [t.names[0]], () => "compare"), row(w.order, [])],
      }];
      while (queue.length) {
        const v = queue.shift()!;
        order.push(v);
        queue.push(...t.kids[v]);
        const kids = t.kids[v].map((k) => t.names[k]);
        frames.push({
          note: kids.length ? fill(w.take, { v: t.names[v], list: kids.join(", ") }) : fill(w.leaf, { v: t.names[v] }),
          graph: pic(t.names, t.links, false, (i) => (i === v ? "key" : order.includes(i) ? "sorted" : queue.includes(i) ? "compare" : "plain"), (k) => (t.links[k].a === v ? "compare" : order.includes(t.links[k].b) ? "sorted" : "plain"), { layer: t.layer }),
          rows: [
            row(w.queue, queue.map((i) => t.names[i]), (k) => (k >= queue.length - kids.length ? "key" : "compare")),
            row(w.order, order.map((i) => t.names[i]), (k) => (k === order.length - 1 ? "key" : "sorted")),
          ],
        });
      }
      return done(frames, fill(w.answer, { list: listText(order.map((i) => t.names[i])) }), {
        graph: pic(t.names, t.links, false, () => "sorted", () => "sorted", { layer: t.layer }),
      });
    },
  },

  riverSizes: {
    level: 2,
    example: ["1 0 0 1 1; 1 1 0 0 1; 0 0 1 0 1; 1 0 1 1 0; 1 0 0 0 1"],
    solve: ([s], w, e) => {
      const m = bits(s, e);
      const [R, C] = [m.length, m[0].length];
      // 0: not seen yet; k > 0: in the k-th river.
      const river = grid2(R, C, () => 0);
      const sizes: number[] = [];
      const frames: Frame[] = [];
      const roles = (cur: [number, number] | null, stack: [number, number][]) =>
        grid2(R, C, (r, c): Role => {
          if (cur && cur[0] === r && cur[1] === c) return "key";
          if (stack.some(([i, j]) => i === r && j === c)) return "pivot";
          if (river[r][c] === sizes.length + 1) return "compare";
          if (river[r][c] > 0) return "sorted";
          return m[r][c] ? "plain" : "idle";
        });
      const at = (cur: [number, number] | null, stack: [number, number][]): Partial<Frame> => ({
        mat: { vals: m, roles: roles(cur, stack) },
        rows: [row(w.stack, stack.map(([i, j]) => rc(i, j)), () => "pivot"), row(w.sizes, sizes, () => "sorted")],
      });
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          if (!m[r][c] || river[r][c]) continue;
          const id = sizes.length + 1;
          const stack: [number, number][] = [[r, c]];
          river[r][c] = id;
          let size = 0;
          while (stack.length) {
            const [i, j] = stack.pop()!;
            size++;
            for (const [y, x] of four(R, C, i, j))
              if (m[y][x] && !river[y][x]) {
                river[y][x] = id;
                stack.push([y, x]);
              }
            const v = { p: rc(i, j), k: size };
            frames.push({ note: fill(size === 1 ? w.found : w.grow, v), ...at([i, j], stack) } as Frame);
          }
          sizes.push(size);
          frames.push({ note: fill(w.river, { k: size }), ...at(null, []) } as Frame);
        }
      if (!frames.length) frames.push({ note: w.dry, ...at(null, []) } as Frame);
      return done(frames, sizes.length ? fill(w.answer, { list: listText(sizes) }) : w.none);
    },
  },

  youngestCommonAncestor: {
    level: 2,
    example: ["B>A, C>A, D>B, E>B, F>C, G>D, H>D, I>E, J>G", "A", "J", "I"],
    solve: ([s, top, one, two], w, e) => {
      const g = parseEdges(s, e, { max: 14, nodes: 15 });
      const t = namedTree(g.list.map((x) => [g.names[x.b], g.names[x.a]]), [], w.notTree);
      const find = (x: string) => {
        const i = t.names.indexOf(text(x, e, 12));
        if (i < 0) throw new Error(fill(w.unknown, { s: x.trim() }));
        return i;
      };
      if (find(top) !== 0) throw new Error(fill(w.notTop, { s: top.trim(), r: t.names[0] }));
      let [a, b] = [find(one), find(two)];
      const walked = new Set<number>();
      const frames: Frame[] = [];
      const shot = (note: string) =>
        frames.push({
          note,
          graph: pic(t.names, t.links, false, (i) => (i === a && i === b ? "sorted" : i === a ? "key" : i === b ? "compare" : walked.has(i) ? "idle" : "plain"), (k) => (walked.has(t.links[k].b) ? "idle" : "plain"), {
            layer: t.layer,
            tags: t.names.map((_, i) => (i === a && i === b ? "1, 2" : i === a ? "1" : i === b ? "2" : "")),
          }),
        });
      const N = (i: number) => t.names[i];
      shot(fill(w.depths, { a: N(a), da: t.layer[a], b: N(b), db: t.layer[b], top: N(0) }));
      while (t.layer[a] !== t.layer[b]) {
        const deeper = t.layer[a] > t.layer[b];
        const x = deeper ? a : b;
        walked.add(x);
        const p = t.parent[x];
        if (deeper) a = p;
        else b = p;
        shot(fill(w.climb, { x: N(x), p: N(p) }));
      }
      while (a !== b) {
        walked.add(a), walked.add(b);
        const v = { a: N(a), b: N(b), pa: N(t.parent[a]), pb: N(t.parent[b]) };
        [a, b] = [t.parent[a], t.parent[b]];
        shot(fill(a === b ? w.meet : w.both, v));
      }
      return done(frames, fill(w.answer, { a: one.trim(), b: two.trim(), v: N(a) }));
    },
  },

  removeIslands: {
    level: 2,
    example: ["1 0 0 0 1 0; 0 1 1 0 1 0; 0 0 1 0 0 0; 1 0 0 1 1 0; 1 1 0 1 0 1"],
    solve: ([s], w, e) => {
      const m = bits(s, e);
      const [R, C] = [m.length, m[0].length];
      // 0: not reached; k > 0: kept, reached from the k-th border square.
      const kept = grid2(R, C, () => 0);
      const frames: Frame[] = [];
      let groups = 0;
      const roles = (f: (r: number, c: number) => Role | null) => grid2(R, C, (r, c): Role => f(r, c) ?? (kept[r][c] ? "sorted" : m[r][c] ? "plain" : "idle"));
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          const edge = r === 0 || c === 0 || r === R - 1 || c === C - 1;
          if (!edge || !m[r][c] || kept[r][c]) continue;
          const id = ++groups;
          const stack: [number, number][] = [[r, c]];
          kept[r][c] = id;
          let size = 0;
          while (stack.length) {
            const [i, j] = stack.pop()!;
            size++;
            for (const [y, x] of four(R, C, i, j))
              if (m[y][x] && !kept[y][x]) {
                kept[y][x] = id;
                stack.push([y, x]);
              }
          }
          frames.push({
            note: fill(size === 1 ? w.border1 : w.border, { p: rc(r, c), k: size }),
            mat: { vals: m, roles: roles((y, x) => (y === r && x === c ? "key" : kept[y][x] === id ? "compare" : null)) },
          });
        }
      const islands = m.flatMap((rw, r) => rw.flatMap((v, c) => (v && !kept[r][c] ? [[r, c]] : [])));
      const out = m.map((rw, r) => rw.map((v, c) => (kept[r][c] ? v : 0)));
      if (islands.length) {
        frames.push({ note: fill(w.islands, { k: islands.length }), mat: { vals: m, roles: roles((y, x) => (m[y][x] && !kept[y][x] ? "min" : null)) } });
        frames.push({ note: w.removed, mat: { vals: out, roles: roles((y, x) => (m[y][x] && !kept[y][x] ? "idle" : null)) } });
      } else frames.push({ note: w.nothing, mat: { vals: m, roles: roles(() => null) } });
      return done(frames, fill(w.answer, { rows: matRows(out) }));
    },
  },

  cycleInGraph: {
    level: 2,
    example: ["A>B, B>C, A>C, A>D, D>E, E>A"],
    solve: ([s], w, e) => {
      const g = parseEdges(s, e, { max: 16, nodes: 10 });
      const flat = g.list.find((x) => !x.oneWay);
      if (flat) throw new Error(fill(w.oneWay, { a: g.names[flat.a], b: g.names[flat.b] }));
      const n = g.names.length;
      const adj = adjacency(n, g.list, true);
      // 0 white (not reached), 1 grey (on the path now), 2 black (finished).
      const colour = Array.from({ length: n }, () => 0);
      const path: number[] = [];
      const frames: Frame[] = [];
      const N = (i: number) => g.names[i];
      const shot = (note: string, cur: number, edge = -1, edgeRole: Role = "compare") =>
        frames.push({
          note,
          graph: pic(g.names, g.list, true, (i) => (i === cur ? "key" : colour[i] === 1 ? "compare" : colour[i] === 2 ? "sorted" : "plain"), (k) => {
            if (k === edge) return edgeRole;
            const x = g.list[k];
            const pa = path.indexOf(x.a);
            return pa >= 0 && path[pa + 1] === x.b ? "compare" : "plain";
          }),
          rows: [row(w.path, path.map(N), () => "compare")],
        });
      let cycle: number[] | null = null;
      const visit = (v: number): boolean => {
        colour[v] = 1;
        path.push(v);
        shot(fill(w.enter, { v: N(v) }), v);
        for (const { to, k } of adj[v]) {
          if (colour[to] === 1) {
            cycle = [...path.slice(path.indexOf(to)), to];
            shot(fill(w.back, { v: N(v), u: N(to), cycle: cycle.map(N).join(" → ") }), v, k, "min");
            return true;
          }
          if (colour[to] === 2) shot(fill(w.black, { v: N(v), u: N(to) }), v, k, "idle");
          else if (visit(to)) return true;
        }
        colour[v] = 2;
        path.pop();
        shot(fill(w.finish, { v: N(v) }), v);
        return false;
      };
      for (let v = 0; v < n; v++) if (colour[v] === 0 && visit(v)) break;
      const c = cycle as number[] | null;
      return done(frames, c ? fill(w.yes, { cycle: c.map(N).join(" → ") }) : w.no);
    },
  },

  minimumPassesOfMatrix: {
    level: 2,
    example: ["0, -2, -1, 3; -4, 0, -5, -1; 2, -3, 0, -6"],
    solve: ([s], w, e) => {
      const m = matrix(s, e, { rows: 8, cols: 10, whole: true }).map((r) => [...r]);
      const [R, C] = [m.length, m[0].length];
      const roles = (fresh: [number, number][], queue: [number, number][]) =>
        grid2(R, C, (r, c): Role => (fresh.some(([i, j]) => i === r && j === c) ? "key" : queue.some(([i, j]) => i === r && j === c) ? "compare" : m[r][c] > 0 ? "sorted" : m[r][c] < 0 ? "min" : "idle"));
      let queue: [number, number][] = m.flatMap((rw, r) => rw.flatMap((v, c) => (v > 0 ? [[r, c] as [number, number]] : [])));
      const negatives = () => m.flat().filter((v) => v < 0).length;
      const frames: Frame[] = [{ note: fill(w.start, { k: queue.length, n: negatives() }), mat: { vals: m.map((r) => [...r]), roles: roles([], queue) } }];
      let passes = 0;
      while (queue.length) {
        const next: [number, number][] = [];
        for (const [r, c] of queue)
          for (const [i, j] of four(R, C, r, c))
            if (m[i][j] < 0) {
              m[i][j] = -m[i][j];
              next.push([i, j]);
            }
        if (!next.length) break;
        passes++;
        frames.push({ note: fill(w.pass, { p: passes, k: next.length, n: negatives() }), mat: { vals: m.map((r) => [...r]), roles: roles(next, []) } });
        queue = next;
      }
      const left = negatives();
      if (left) frames.push({ note: fill(w.stuck, { n: left }), mat: { vals: m.map((r) => [...r]), roles: roles([], []) } });
      return done(frames, left ? w.never : fill(w.answer, { p: passes }));
    },
  },

  twoColorable: {
    level: 2,
    example: ["A-B, B-C, C-D, D-E, E-F, F-A, B-E"],
    solve: ([s], w, e) => {
      const g = parseEdges(s, e, { max: 16, nodes: 10 });
      const n = g.names.length;
      const N = (i: number) => g.names[i];
      const adj = adjacency(n, g.list, false);
      const colour = Array.from({ length: n }, () => 0);
      const frames: Frame[] = [];
      const shot = (note: string, cur: number, hot: number[] = [], bad = -1, edgeRole: (k: number) => Role = () => "plain") =>
        frames.push({
          note,
          graph: pic(g.names, g.list, false, (i) => (hot.includes(i) && bad >= 0 ? "min" : colour[i] === 1 ? "key" : colour[i] === 2 ? "pivot" : "plain"), (k) => (k === bad ? "min" : edgeRole(k)), {
            tags: colour.map((c, i) => (i === cur ? `${c}•` : c ? String(c) : "")),
          }),
        });
      const loop = g.list.findIndex((x) => x.a === x.b);
      if (loop >= 0) {
        shot(fill(w.self, { v: N(g.list[loop].a) }), g.list[loop].a, [g.list[loop].a], loop);
        return done(frames, fill(w.noSelf, { v: N(g.list[loop].a) }));
      }
      for (let s0 = 0; s0 < n; s0++) {
        if (colour[s0]) continue;
        colour[s0] = 1;
        shot(fill(w.start, { v: N(s0) }), s0);
        const stack = [s0];
        while (stack.length) {
          const v = stack.pop()!;
          const fresh: number[] = [];
          for (const { to, k } of adj[v]) {
            if (colour[to] === colour[v]) {
              shot(fill(w.clash, { v: N(v), u: N(to), c: colour[v] }), v, [v, to], k);
              return done(frames, fill(w.no, { v: N(v), u: N(to) }));
            }
            if (!colour[to]) {
              colour[to] = 3 - colour[v];
              fresh.push(to);
              stack.push(to);
            }
          }
          const mine = (k: number) => (g.list[k].a === v || g.list[k].b === v ? "compare" : "plain");
          shot(fresh.length ? fill(w.spread, { v: N(v), c: colour[v], list: fresh.map(N).join(", "), d: 3 - colour[v] }) : fill(w.fine, { v: N(v), c: colour[v] }), v, [], -1, mine);
        }
      }
      const side = (c: number) => g.names.filter((_, i) => colour[i] === c).join(", ");
      return done(frames, fill(w.yes, { a: side(1), b: side(2) }));
    },
  },

  boggleBoard: {
    level: 3,
    example: ["t e a m; r o s e; p e n t; l a i d", "tea, team, rose, rope, sent, ten"],
    solve: ([b, ws], w, e) => {
      const board = letters(b, e, 6, 6).map((r) => r.map((x) => x.toLowerCase()));
      const list = [...new Set(words(ws, e, 8, 6).map((x) => x.toLowerCase()))];
      const [R, C] = [board.length, board[0].length];
      // The trie: node 0 the root, each node its letter, its children by letter, and the word ending there.
      const trie: { ch: string; kids: Map<string, number>; end: string | null; depth: number }[] = [{ ch: "·", kids: new Map(), end: null, depth: 0 }];
      for (const word of list) {
        let at = 0;
        for (const ch of [...word]) {
          if (!trie[at].kids.has(ch)) {
            trie.push({ ch, kids: new Map(), end: null, depth: trie[at].depth + 1 });
            trie[at].kids.set(ch, trie.length - 1);
          }
          at = trie[at].kids.get(ch)!;
        }
        trie[at].end = word;
      }
      if (trie.length > 16) throw new Error(fill(w.trieSize, { n: 15 }));
      // Number the trie level by level so it draws in layers.
      const order = [0];
      for (let k = 0; k < order.length; k++) order.push(...[...trie[order[k]].kids.values()]);
      const pos = new Map(order.map((x, i) => [x, i]));
      const links = order.flatMap((x) => [...trie[x].kids.values()].map((y) => ({ a: pos.get(x)!, b: pos.get(y)! })));
      const frames: Frame[] = [{
        note: fill(w.trie, { k: trie.length - 1 }),
        graph: pic(order.map((x) => trie[x].ch), links, false, (i) => (i === 0 ? "pivot" : trie[order[i]].end ? "sorted" : "plain"), () => "plain", { layer: order.map((x) => trie[x].depth) }),
      }];
      const found: string[] = [];
      const used = grid2(R, C, () => false);
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          const first = trie[0].kids.get(board[r][c]);
          if (first === undefined) continue;
          const touched = grid2(R, C, () => false);
          const paths: [number, number][][] = [];
          const here: string[] = [];
          const path: [number, number][] = [];
          const explore = (i: number, j: number, node: number) => {
            used[i][j] = touched[i][j] = true;
            path.push([i, j]);
            const end = trie[node].end;
            if (end && !found.includes(end)) found.push(end), here.push(end), paths.push([...path]);
            for (let y = i - 1; y <= i + 1; y++)
              for (let x = j - 1; x <= j + 1; x++) {
                if (y < 0 || x < 0 || y >= R || x >= C || used[y][x]) continue;
                const next = trie[node].kids.get(board[y][x]);
                if (next !== undefined) explore(y, x, next);
              }
            used[i][j] = false;
            path.pop();
          };
          explore(r, c, first);
          const k = touched.flat().filter(Boolean).length;
          const v = { p: rc(r, c), l: board[r][c], k, list: here.map((x) => fill(w.quote, { s: x })).join(", ") };
          frames.push({
            note: fill(here.length ? w.spell : w.nothing, v),
            mat: {
              vals: board,
              roles: grid2(R, C, (y, x): Role => (y === r && x === c ? "key" : paths.some((p) => p.some(([i, j]) => i === y && j === x)) ? "sorted" : touched[y][x] ? "compare" : "plain")),
            },
            rows: [row(w.found, found.map((x) => fill(w.quote, { s: x })), (i) => (i >= found.length - here.length ? "key" : "sorted"))],
          });
        }
      if (frames.length === 1) frames.push({ note: w.noStart, mat: { vals: board, roles: grid2(R, C, () => "idle") } });
      const inOrder = list.filter((x) => found.includes(x));
      return done(frames, inOrder.length ? fill(w.answer, { list: inOrder.map((x) => fill(w.quote, { s: x })).join(", ") }) : w.none);
    },
  },

  largestIsland: {
    level: 3,
    example: ["0 1 1 0 0; 0 1 0 1 1; 1 1 1 1 0; 0 0 1 0 0"],
    solve: ([s], w, e) => {
      const m = bits(s, e, 7, 8);
      const [R, C] = [m.length, m[0].length];
      // Each square of land gets its island's number (from 0), water stays −1.
      const id = grid2(R, C, () => -1);
      const sizes: number[] = [];
      const name = (k: number) => (k < 26 ? String.fromCharCode(65 + k) : String(k + 1));
      const vals = () => grid2(R, C, (r, c) => (m[r][c] ? "~" : id[r][c] >= 0 ? name(id[r][c]) : "·"));
      const frames: Frame[] = [];
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          if (m[r][c] || id[r][c] >= 0) continue;
          const k = sizes.length;
          const stack: [number, number][] = [[r, c]];
          id[r][c] = k;
          let size = 0;
          while (stack.length) {
            const [i, j] = stack.pop()!;
            size++;
            for (const [y, x] of four(R, C, i, j))
              if (!m[y][x] && id[y][x] < 0) {
                id[y][x] = k;
                stack.push([y, x]);
              }
          }
          sizes.push(size);
          frames.push({
            note: fill(w.label, { a: name(k), p: rc(r, c), k: size }),
            mat: { vals: vals(), roles: grid2(R, C, (y, x): Role => (id[y][x] === k ? "key" : id[y][x] >= 0 ? "sorted" : m[y][x] ? "plain" : "idle")) },
            rows: [row(w.sizes, sizes.map((z, i) => `${name(i)} ${z}`), (i) => (i === k ? "key" : "sorted"))],
          });
        }
      const sizeRow = row(w.sizes, sizes.map((z, i) => `${name(i)} ${z}`));
      let best = -1;
      let bestAt: [number, number] | null = null;
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          if (!m[r][c]) continue;
          const near = [...new Set(four(R, C, r, c).map(([y, x]) => id[y][x]).filter((k) => k >= 0))];
          const total = 1 + near.reduce((t, k) => t + sizes[k], 0);
          const better = total > best;
          if (better) [best, bestAt] = [total, [r, c]];
          const v = { p: rc(r, c), list: near.map(name).join(", "), sum: near.map((k) => sizes[k]).join(" + "), s: total };
          frames.push({
            note: fill(near.length ? w.join : w.alone, v) + (better ? " " + w.better : ""),
            mat: { vals: vals(), roles: grid2(R, C, (y, x): Role => (y === r && x === c ? "key" : near.includes(id[y][x]) ? "compare" : id[y][x] >= 0 ? "idle" : "plain")) },
            rows: [sizeRow, row(w.best, [best], () => (better ? "key" : "sorted"))],
          });
        }
      if (!bestAt) {
        frames.push({ note: fill(w.noWater, { k: sizes[0] }), mat: { vals: vals(), roles: grid2(R, C, () => "sorted") }, rows: [sizeRow] });
        return done(frames, fill(w.allLand, { k: sizes[0] }));
      }
      const [br, bc] = bestAt;
      const join = new Set(four(R, C, br, bc).map(([y, x]) => id[y][x]));
      return done(frames, fill(w.answer, { k: best, p: rc(br, bc) }), {
        mat: { vals: vals(), roles: grid2(R, C, (y, x): Role => ((y === br && x === bc) || (id[y][x] >= 0 && join.has(id[y][x])) ? "sorted" : id[y][x] >= 0 ? "idle" : "plain")) },
      });
    },
  },

  detectArbitrage: {
    level: 4,
    example: ["1, 0.8, 1.2; 1.25, 1, 1.6; 0.82, 0.62, 1"],
    solve: ([s], w, e) => {
      const rate = matrix(s, e, { rows: 6, cols: 6 });
      const n = rate.length;
      if (rate[0].length !== n) throw new Error(w.square);
      if (n < 2) throw new Error(fill(e.tooFew, { n: 2 }));
      const low = rate.flat().find((v) => v <= 0);
      if (low !== undefined) throw new Error(fill(w.positive, { s: show(low) }));
      const dist = Array.from({ length: n }, (_, i) => (i === 0 ? 0 : Number.POSITIVE_INFINITY));
      const prev = Array.from({ length: n }, () => -1);
      const r2 = (x: number) => (Number.isFinite(x) ? show(Math.round(x * 100) / 100) : "∞");
      const frames: Frame[] = [];
      const shot = (note: string, i: number, j: number, hot: Role) =>
        frames.push({
          note,
          mat: { vals: rate, roles: grid2(n, n, (y, x): Role => (y === i && x === j ? hot : y === i ? "compare" : "plain")) },
          rows: [row(w.distance, dist.map(r2), (k) => (k === j && hot === "key" ? "key" : "plain"))],
        });
      shot(w.start, -1, -1, "plain");
      const EPS = 1e-12;
      const relax = (pass: number): [number, number] | null => {
        let changed: [number, number] | null = null;
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            if (!Number.isFinite(dist[i])) continue;
            const nd = dist[i] - Math.log(rate[i][j]);
            if (nd < dist[j] - EPS) {
              const old = dist[j];
              dist[j] = nd;
              prev[j] = i;
              changed = [i, j];
              if (pass < n) shot(fill(w.relax, { p: pass, i, j, di: r2(dist[i]), r: show(rate[i][j]), nd: r2(nd), old: r2(old) }), i, j, "key");
              else return changed;
            }
          }
        return changed;
      };
      let pass = 1;
      for (; pass < n; pass++) {
        if (!relax(pass)) {
          shot(fill(w.settled, { p: pass }), -1, -1, "plain");
          break;
        }
      }
      const still = pass === n ? relax(n) : null;
      if (!still) {
        if (pass === n) shot(w.check, -1, -1, "plain");
        return done(frames, w.no);
      }
      // Walk back n steps to be sure of standing on the cycle, then round it once.
      let v = still[1];
      for (let k = 0; k < n; k++) v = prev[v];
      const cycle = [v];
      for (let u = prev[v]; u !== v; u = prev[u]) cycle.push(u);
      cycle.push(v);
      cycle.reverse();
      let product = 1;
      for (let k = 0; k + 1 < cycle.length; k++) product *= rate[cycle[k]][cycle[k + 1]];
      const [i, j] = still;
      shot(fill(w.again, { i, j }), i, j, "min");
      const on = (y: number, x: number) => cycle.some((c, k) => k + 1 < cycle.length && c === y && cycle[k + 1] === x);
      return done(frames, fill(w.yes, { cycle: cycle.join(" → "), x: String(Math.round(product * 10000) / 10000) }), {
        mat: { vals: rate, roles: grid2(n, n, (y, x): Role => (on(y, x) ? "sorted" : "plain")) },
      });
    },
  },

  twoEdgeConnectedGraph: {
    level: 4,
    example: ["A-B, B-C, C-A, C-D, D-E, E-F, F-D"],
    solve: ([s], w, e) => {
      const g = parseEdges(s, e, { max: 16, nodes: 10 });
      const n = g.names.length;
      const N = (i: number) => g.names[i];
      const adj = adjacency(n, g.list, false);
      const arrive = Array.from({ length: n }, () => -1);
      const low = Array.from({ length: n }, () => -1);
      const done_ = Array.from({ length: n }, () => false);
      const path: number[] = [];
      const tree = new Set<number>();
      const back = new Set<number>();
      let time = 0;
      const frames: Frame[] = [];
      const shot = (note: string, cur: number, edge = -1, edgeRole: Role = "compare") =>
        frames.push({
          note,
          graph: pic(g.names, g.list, false, (i) => (i === cur ? "key" : path.includes(i) ? "compare" : done_[i] ? "sorted" : "plain"), (k) => (k === edge ? edgeRole : back.has(k) ? "pivot" : tree.has(k) ? "sorted" : "plain"), {
            tags: g.names.map((_, i) => (arrive[i] < 0 ? "" : `${arrive[i]}/${low[i]}`)),
          }),
        });
      let bridge = -1;
      const visit = (v: number, via: number): boolean => {
        arrive[v] = low[v] = time++;
        path.push(v);
        shot(fill(w.arrive, { v: N(v), t: arrive[v] }), v, via, "key");
        for (const { to, k } of adj[v]) {
          if (k === via) continue;
          if (arrive[to] >= 0) {
            // An edge down to a vertex already finished below was seen from there, as its way back up.
            if (arrive[to] > arrive[v]) continue;
            if (arrive[to] < low[v]) low[v] = arrive[to];
            back.add(k);
            shot(fill(w.back, { v: N(v), u: N(to), t: arrive[to], l: low[v] }), v, k, "pivot");
            continue;
          }
          tree.add(k);
          if (visit(to, k)) return true;
          if (low[to] <= arrive[v]) {
            low[v] = Math.min(low[v], low[to]);
            shot(fill(w.up, { v: N(v), u: N(to), lu: low[to], tv: arrive[v], l: low[v] }), v, k, "sorted");
          } else {
            bridge = k;
            shot(fill(w.bridge, { v: N(v), u: N(to), lu: low[to], tv: arrive[v] }), v, k, "min");
            return true;
          }
        }
        path.pop();
        done_[v] = true;
        return false;
      };
      if (visit(0, -1)) return done(frames, fill(w.noBridge, { a: N(g.list[bridge].a), b: N(g.list[bridge].b) }));
      const missed = g.names.filter((_, i) => arrive[i] < 0);
      if (missed.length) {
        shot(fill(w.unreached, { list: missed.join(", ") }), -1);
        return done(frames, w.noApart);
      }
      shot(w.allDone, -1);
      return done(frames, w.yes);
    },
  },

  airportConnections: {
    level: 4,
    example: ["S, A, B, C, D, E, F, G", "S>A, A>B, C>D, D>C, D>E, F>G, G>F, E>B", "S"],
    solve: ([as, rs, st], w, e) => {
      const ports = names(as, e, 10);
      const g = parseEdges(rs, e, { max: 16, names: ports, unknown: w.unknown, empty: true });
      const flat = g.list.find((x) => !x.oneWay);
      if (flat) throw new Error(fill(w.oneWay, { a: ports[flat.a], b: ports[flat.b] }));
      const n = ports.length;
      const start = ports.indexOf(text(st, e, 12));
      if (start < 0) throw new Error(fill(w.unknown, { s: st.trim() }));
      const adj = adjacency(n, g.list, true);
      const reach = (from: number, inside: (i: number) => boolean) => {
        const seen = [from];
        for (let k = 0; k < seen.length; k++) for (const { to } of adj[seen[k]]) if (inside(to) && !seen.includes(to)) seen.push(to);
        return seen;
      };
      const ok = Array.from({ length: n }, () => false);
      for (const i of reach(start, () => true)) ok[i] = true;
      const added: { a: number; b: number; w?: number }[] = [];
      const all = () => [...g.list, ...added];
      const tags = Array.from({ length: n }, () => "");
      const frames: Frame[] = [];
      const shot = (note: string, hot: number[] = [], fresh = -1) =>
        frames.push({
          note,
          graph: pic(ports, all(), true, (i) => (i === start ? "pivot" : hot.includes(i) ? "key" : ok[i] ? "sorted" : "plain"), (k) => (k >= g.list.length ? (k === g.list.length + fresh ? "key" : "sorted") : "plain"), { tags: [...tags] }),
        });
      const cut = ports.flatMap((_, i) => (ok[i] ? [] : [i]));
      const P = (i: number) => ports[i];
      shot(fill(w.start, { s: P(start), list: ports.filter((_, i) => ok[i]).join(", ") }));
      if (!cut.length) return done(frames, fill(w.none, { s: P(start) }));
      // How many cut-off airports each cut-off airport leads to (not counting itself).
      const leads = new Map(cut.map((i) => [i, reach(i, (j) => !ok[j])]));
      for (const i of cut) tags[i] = String(leads.get(i)!.length - 1);
      const order = [...cut].sort((x, y) => leads.get(y)!.length - leads.get(x)!.length);
      shot(fill(w.count, { list: order.map((i) => `${P(i)} ${leads.get(i)!.length - 1}`).join(", ") }));
      for (const i of order) {
        if (ok[i]) {
          shot(fill(w.skip, { a: P(i) }), [i]);
          continue;
        }
        const brought = leads.get(i)!.filter((j) => !ok[j]);
        for (const j of brought) ok[j] = true;
        added.push({ a: start, b: i });
        shot(fill(w.add, { s: P(start), a: P(i), list: brought.map(P).join(", ") }), brought, added.length - 1);
      }
      return done(frames, fill(w.answer, { k: added.length, list: added.map((x) => `${P(x.a)}→${P(x.b)}`).join(", ") }));
    },
  },
};
