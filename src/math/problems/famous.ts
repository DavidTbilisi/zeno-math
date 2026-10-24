// The famous algorithms: Kadane's running sum, Gale–Shapley's proposals, union–find's forest, Dijkstra, Kahn's
// topological order, Kruskal and Prim's spanning trees, Knuth–Morris–Pratt's prefix table and A* on a grid. Each
// solver leaves a frame at every step, with the graph, the table or the row it is working on.
import { cells, done, fill, grid2, listText, matrix, nums, row, show, text, type Errors, type Frame, type ProblemSet, type Role } from "./core";
import { adjacency, names, parseEdges, pic, type Edge } from "./graphs";

const rc = (r: number, c: number) => `(${r}, ${c})`;

/** Is every name joined to every other through the edges, either way round? */
function connected(n: number, es: readonly Edge[]): boolean {
  const adj = adjacency(n, es, false);
  const seen = [0];
  for (let k = 0; k < seen.length; k++) for (const { to } of adj[seen[k]]) if (!seen.includes(to)) seen.push(to);
  return seen.length === n;
}

/** A name among `all`, or the problem's own words saying it isn't one. */
function which(s: string, all: readonly string[], e: Errors, unknown: string): number {
  const t = text(s, e, 12);
  const i = all.indexOf(t);
  if (i < 0) throw new Error(fill(unknown, { s: t }));
  return i;
}

const treeText = (es: readonly Edge[], nm: readonly string[]) => es.map((x) => `${nm[x.a]}–${nm[x.b]} ${show(x.w)}`).join(", ");
const total = (es: readonly Edge[]) => show(Math.round(es.reduce((t, x) => t + x.w, 0) * 1000) / 1000);

export const FAMOUS: ProblemSet<"famous"> = {
  kadanesAlgorithm: {
    level: 2,
    example: ["3, -5, 4, -1, 2, 1, -6, 5, -2"],
    solve: ([a], w, e) => {
      const xs = nums(a, e, { max: 14 });
      let [cur, start, best, bs, be] = [xs[0], 0, xs[0], 0, 0];
      const frames: Frame[] = [{
        note: fill(w.start, { x: show(xs[0]) }),
        cells: cells(xs, (k) => (k === 0 ? "key" : "plain"), { i: 0 }, [0, 0]),
        rows: [row(w.here, [cur], () => "key"), row(w.best, [best], () => "sorted")],
      }];
      for (let i = 1; i < xs.length; i++) {
        const x = xs[i];
        const grow = cur >= 0;
        const v = { x: show(x), c: show(cur), n: show(cur + x) };
        if (grow) cur += x;
        else [cur, start] = [x, i];
        const better = cur > best;
        if (better) [best, bs, be] = [cur, start, i];
        frames.push({
          note: fill(grow ? w.extend : w.restart, v) + (better ? " " + fill(w.better, { b: show(best) }) : ""),
          cells: cells(xs, (k) => (k === i ? "key" : k >= start && k < i ? "compare" : k >= bs && k <= be ? "sorted" : k < i ? "idle" : "plain"), { i }, [start, i]),
          rows: [row(w.here, [cur], () => "key"), row(w.best, [best], () => (better ? "key" : "sorted"))],
        });
      }
      return done(frames, fill(w.answer, { s: show(best), i: bs, j: be, list: listText(xs.slice(bs, be + 1)) }), {
        cells: cells(xs, (k) => (k >= bs && k <= be ? "sorted" : "idle"), undefined, [bs, be]),
      });
    },
  },

  stableInternships: {
    level: 2,
    example: ["0 1 2; 0 2 1; 1 0 2", "2 1 0; 0 1 2; 1 0 2"],
    solve: ([a, b], w, e) => {
      const prefs = (s: string) => {
        const m = matrix(s, e, { rows: 6, cols: 6, whole: true, min: 0 });
        const n = m.length;
        if (m.some((r) => r.length !== n || [...r].sort((x, y) => x - y).some((v, k) => v !== k))) throw new Error(fill(w.perm, { n: n - 1 }));
        return m;
      };
      const interns = prefs(a);
      const teams = prefs(b);
      if (teams.length !== interns.length) throw new Error(e.sameLength);
      const n = interns.length;
      const I = (k: number) => fill(w.intern, { k });
      const T = (k: number) => fill(w.team, { k });
      const rank = teams.map((p) => {
        const r: number[] = [];
        p.forEach((x, k) => (r[x] = k));
        return r;
      });
      const next = interns.map(() => 0);
      const held = teams.map(() => -1);
      const free = interns.map((_, k) => k);
      const frames: Frame[] = [];
      const nodes = [...interns.map((_, k) => I(k)), ...teams.map((_, k) => T(k))];
      const layer = nodes.map((_, k) => (k < n ? 0 : 1));
      const shot = (note: string, i = -1, t = -1, ok = true, other = -1) => {
        const pairs = held.flatMap((x, k) => (x >= 0 && !(k === t && x === i) ? [{ a: x, b: n + k }] : []));
        const es = i >= 0 ? [...pairs, { a: i, b: n + t }] : pairs;
        frames.push({
          note,
          graph: pic(nodes, es, false, (k) => (k === i || k === n + t ? "key" : k === other ? "min" : (k < n ? held.includes(k) : held[k - n] >= 0) ? "sorted" : "plain"), (k) => (k < pairs.length ? "sorted" : ok ? "key" : "min"), { layer }),
          mat: {
            vals: interns.map((r) => r.map(T)),
            roles: grid2(n, n, (y, x): Role => (y === i && x === next[i] - 1 ? (ok ? "key" : "min") : held[interns[y][x]] === y ? "sorted" : x < next[y] ? "idle" : "plain")),
            rowHeads: interns.map((_, k) => I(k)),
          },
          rows: [
            ...(t >= 0 ? [row(fill(w.prefers, { t: T(t) }), teams[t].map(I), (k) => (teams[t][k] === i ? (ok ? "key" : "min") : teams[t][k] === other ? "compare" : "plain"))] : []),
            row(w.free, free.map(I), () => "compare"),
          ],
        });
      };
      shot(w.start);
      while (free.length) {
        const i = free.shift()!;
        const t = interns[i][next[i]++];
        const h = held[t];
        const v = { i: I(i), t: T(t), h: h >= 0 ? I(h) : "" };
        if (h < 0) {
          held[t] = i;
          shot(fill(w.take, v), i, t);
        } else if (rank[t][i] < rank[t][h]) {
          held[t] = i;
          free.unshift(h);
          shot(fill(w.swap, v), i, t, true, h);
        } else {
          free.unshift(i);
          shot(fill(w.reject, v), i, t, false, h);
        }
      }
      const pairs = interns.map((_, i) => `[${i}, ${held.indexOf(i)}]`);
      return done(frames, fill(w.answer, { list: pairs.join(", ") }));
    },
  },

  unionFind: {
    level: 2,
    example: ["createSet 1, createSet 2, createSet 3, createSet 4, createSet 5, union 1 2, union 3 4, union 4 5, union 2 4, find 5, find 1"],
    solve: ([s], w, e) => {
      const ops = s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => {
        const [word, ...rest] = x.split(/\s+/);
        const kind = /^(createset|create|makeset|make)$/i.test(word) ? "create" : /^union$/i.test(word) ? "union" : /^find$/i.test(word) ? "find" : null;
        if (!kind || rest.length !== (kind === "union" ? 2 : 1)) throw new Error(fill(w.op, { s: x }));
        const vals = nums(rest.join(" "), e, { whole: true, max: 2 });
        const big = vals.find((v) => Math.abs(v) > 99);
        if (big !== undefined) throw new Error(fill(e.range, { s: show(big), lo: show(-99), hi: 99 }));
        return { kind, vals };
      });
      if (!ops.length) throw new Error(e.empty);
      if (ops.length > 20) throw new Error(fill(e.tooMany, { n: 20 }));
      const parent = new Map<number, number>();
      const rank = new Map<number, number>();
      const made: number[] = [];
      const pathUp = (x: number) => {
        const path = [x];
        while (parent.get(path[path.length - 1]) !== path[path.length - 1]) path.push(parent.get(path[path.length - 1])!);
        return path;
      };
      const find = (x: number) => {
        const path = pathUp(x);
        const r = path[path.length - 1];
        for (const v of path) parent.set(v, r);
        return { r, path };
      };
      const frames: Frame[] = [];
      const finds: string[] = [];
      // The forest, a tree per root in the order made, drawn level by level with each node under its parent.
      const shot = (note: string, role: (v: number) => Role | null = () => null, edgeRole: (v: number) => Role | null = () => null) => {
        const kids = (v: number) => made.filter((u) => u !== v && parent.get(u) === v);
        const pre: [number, number][] = [];
        const walk = (v: number, d: number) => {
          pre.push([v, d]);
          kids(v).forEach((u) => walk(u, d + 1));
        };
        made.filter((v) => parent.get(v) === v).forEach((v) => walk(v, 0));
        const order = [...pre].sort((x, y) => x[1] - y[1]);
        const at = new Map(order.map(([v], i) => [v, i]));
        const links = order.flatMap(([v]) => (parent.get(v) === v ? [] : [{ a: at.get(v)!, b: at.get(parent.get(v)!)!, v }]));
        frames.push({
          note,
          graph: pic(order.map(([v]) => show(v)), links, true, (i) => role(order[i][0]) ?? (parent.get(order[i][0]) === order[i][0] ? "pivot" : "plain"), (k) => edgeRole(links[k].v) ?? "plain", {
            layer: order.map(([, d]) => d),
            tags: order.map(([v]) => (parent.get(v) === v ? fill(w.rank, { r: rank.get(v)! }) : "")),
          }),
          rows: finds.length ? [row(w.finds, finds, (k) => (k === finds.length - 1 ? "key" : "sorted"))] : [],
        });
      };
      for (const { kind, vals } of ops) {
        const [x, y] = vals;
        if (kind === "create") {
          if (parent.has(x)) {
            shot(fill(w.exists, { x: show(x) }), (v) => (v === x ? "compare" : null));
            continue;
          }
          if (made.length >= 12) throw new Error(fill(e.tooManyNodes, { n: 12 }));
          parent.set(x, x), rank.set(x, 0), made.push(x);
          shot(fill(w.create, { x: show(x) }), (v) => (v === x ? "key" : null));
        } else if (kind === "union") {
          const lost = [x, y].find((v) => !parent.has(v));
          if (lost !== undefined) {
            shot(fill(w.unionMissing, { a: show(x), b: show(y), x: show(lost) }), (v) => (v === x || v === y ? "min" : null));
            continue;
          }
          const [ra, rb] = [find(x).r, find(y).r];
          const v0 = { a: show(x), b: show(y) };
          if (ra === rb) {
            shot(fill(w.same, { ...v0, r: show(ra) }), (v) => (v === ra ? "sorted" : v === x || v === y ? "compare" : null));
            continue;
          }
          const [ka, kb] = [rank.get(ra)!, rank.get(rb)!];
          const [hi, lo] = ka < kb ? [rb, ra] : [ra, rb];
          parent.set(lo, hi);
          if (ka === kb) rank.set(hi, ka + 1);
          const note = ka === kb ? fill(w.tie, { ...v0, hi: show(hi), lo: show(lo), r: ka, r1: ka + 1 }) : fill(w.under, { ...v0, hi: show(hi), lo: show(lo) });
          shot(note, (v) => (v === hi ? "key" : v === lo ? "compare" : null), (v) => (v === lo ? "key" : null));
        } else {
          if (!parent.has(x)) {
            finds.push(`${show(x)} → ${w.nothing}`);
            shot(fill(w.findMissing, { x: show(x) }), () => null);
            continue;
          }
          const { r, path } = find(x);
          finds.push(`${show(x)} → ${show(r)}`);
          const v0 = { x: show(x), r: show(r), path: path.map(show).join(" → ") };
          shot(fill(path.length > 2 ? w.findPath : path.length === 2 ? w.findRoot : w.findSelf, v0), (v) => (v === r ? "sorted" : v === x ? "key" : path.includes(v) ? "compare" : null), (v) => (path.includes(v) ? "compare" : null));
        }
      }
      if (finds.length) return done(frames, fill(w.answer, { list: finds.join(", ") }));
      const sets = made.filter((v) => parent.get(v) === v).map((r) => listText(made.filter((v) => find(v).r === r)));
      return done(frames, fill(w.sets, { list: sets.join(", ") }));
    },
  },

  dijkstrasAlgorithm: {
    level: 3,
    example: ["A, B, C, D, E, F", "A>B 4, A>C 1, C>B 2, B>D 1, C>D 5, D>E 3", "A"],
    solve: ([vs, es, st], w, e) => {
      const nm = names(vs, e, 8);
      const g = parseEdges(es, e, { max: 14, names: nm, unknown: w.unknown, weighted: true, empty: true });
      const neg = g.list.find((x) => x.w < 0 || !Number.isInteger(x.w));
      if (neg) throw new Error(neg.w < 0 ? fill(w.negative, { s: show(neg.w) }) : fill(e.whole, { s: show(neg.w) }));
      const start = which(st, nm, e, w.unknown);
      const n = nm.length;
      // An edge typed A-B goes both ways.
      const arcs = g.list.flatMap((x) => (x.oneWay ? [x] : [x, { ...x, a: x.b, b: x.a }]));
      const dist = nm.map((_, i) => (i === start ? 0 : Number.POSITIVE_INFINITY));
      const via = nm.map(() => -1);
      const fixed = nm.map(() => false);
      const D = (d: number) => (Number.isFinite(d) ? show(d) : "∞");
      const N = (i: number) => nm[i];
      const frames: Frame[] = [];
      const shot = (note: string, cur = -1, arc = -1, arcRole: Role = "compare", lost = false) => {
        const heap = nm.map((_, i) => i).filter((i) => !fixed[i] && Number.isFinite(dist[i])).sort((x, y) => dist[x] - dist[y]);
        frames.push({
          note,
          graph: pic(nm, arcs, true, (i) => (i === cur ? "key" : fixed[i] ? "sorted" : Number.isFinite(dist[i]) ? "compare" : lost ? "min" : "plain"), (k) => (k === arc ? arcRole : via[arcs[k].b] === k ? "sorted" : "plain"), {
            weighted: true,
            tags: dist.map(D),
          }),
          rows: [row(w.heap, heap.map((i) => `${N(i)} ${D(dist[i])}`), () => "compare")],
        });
      };
      shot(fill(w.start, { s: N(start) }), start);
      for (;;) {
        let u = -1;
        for (let i = 0; i < n; i++) if (!fixed[i] && Number.isFinite(dist[i]) && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0) break;
        fixed[u] = true;
        shot(fill(w.pick, { v: N(u), d: D(dist[u]) }), u);
        arcs.forEach((x, k) => {
          if (x.a !== u || fixed[x.b]) return;
          const nd = dist[u] + x.w;
          const v = { v: N(u), u: N(x.b), d: D(dist[u]), w: show(x.w), nd: show(nd), old: D(dist[x.b]) };
          if (nd < dist[x.b]) {
            dist[x.b] = nd;
            via[x.b] = k;
            shot(fill(w.better, v), u, k, "key");
          } else shot(fill(w.worse, v), u, k, "idle");
        });
      }
      const lost = nm.filter((_, i) => !fixed[i]);
      if (lost.length) shot(fill(w.unreached, { list: lost.join(", ") }), -1, -1, "plain", true);
      return done(frames, fill(w.answer, { s: N(start), names: nm.join(", "), list: listText(dist.map((d) => (Number.isFinite(d) ? d : -1))) }));
    },
  },

  topologicalSort: {
    level: 3,
    example: ["1, 2, 3, 4, 5, 6", "1>3, 2>3, 3>5, 4>5, 2>6, 6>4"],
    solve: ([js, ds], w, e) => {
      const jobs = names(js, e, 10);
      const g = parseEdges(ds, e, { max: 16, names: jobs, unknown: w.unknown, empty: true });
      const n = jobs.length;
      const N = (i: number) => jobs[i];
      const wait = jobs.map((_, i) => g.list.filter((x) => x.b === i).length);
      const queue = jobs.map((_, i) => i).filter((i) => !wait[i]);
      const order: number[] = [];
      const frames: Frame[] = [];
      const shot = (note: string, cur = -1, stuck = false) =>
        frames.push({
          note,
          graph: pic(jobs, g.list, true, (i) => (i === cur ? "key" : order.includes(i) ? "sorted" : queue.includes(i) ? "compare" : stuck ? "min" : "plain"), (k) => (g.list[k].a === cur ? "key" : order.includes(g.list[k].a) ? "idle" : stuck ? "min" : "plain"), {
            tags: wait.map((c, i) => (order.includes(i) ? "" : String(c))),
          }),
          rows: [row(w.queue, queue.map(N), () => "compare"), row(w.order, order.map(N), (k) => (k === order.length - 1 && cur >= 0 ? "key" : "sorted"))],
        });
      shot(queue.length ? fill(w.start, { list: queue.map(N).join(", ") }) : w.startNone);
      while (queue.length) {
        const v = queue.shift()!;
        order.push(v);
        const after = g.list.filter((x) => x.a === v).map((x) => x.b);
        const ready: number[] = [];
        for (const b of after) if (--wait[b] === 0) queue.push(b), ready.push(b);
        const list = [...new Set(after)].map(N).join(", ");
        shot(!after.length ? fill(w.take, { v: N(v) }) : ready.length ? fill(w.ready, { v: N(v), list: ready.map(N).join(", ") }) : fill(w.lose, { v: N(v), list }), v);
      }
      if (order.length < n) {
        shot(fill(w.cycle, { list: jobs.filter((_, i) => !order.includes(i)).join(", ") }), -1, true);
        return done(frames, w.none);
      }
      return done(frames, fill(w.answer, { list: listText(order.map(N)) }));
    },
  },

  kruskalsAlgorithm: {
    level: 3,
    example: ["A-B 4, A-C 1, B-C 2, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3"],
    solve: ([s], w, e) => {
      const g = parseEdges(s, e, { max: 14, nodes: 10, weighted: true });
      const nm = g.names;
      const n = nm.length;
      if (!connected(n, g.list)) throw new Error(w.apart);
      const order = g.list.map((_, k) => k).sort((x, y) => g.list[x].w - g.list[y].w);
      const parent = nm.map((_, i) => i);
      const rank = nm.map(() => 0);
      const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
      const status: Role[] = g.list.map(() => "plain");
      const tree: Edge[] = [];
      const frames: Frame[] = [];
      const label = (k: number) => `${nm[g.list[k].a]}–${nm[g.list[k].b]} ${show(g.list[k].w)}`;
      const shot = (note: string, cur = -1) =>
        frames.push({
          note,
          graph: pic(nm, g.list, false, (i) => (cur >= 0 && (g.list[cur].a === i || g.list[cur].b === i) ? "compare" : tree.some((x) => x.a === i || x.b === i) ? "sorted" : "plain"), (k) => (k === cur ? (status[k] === "sorted" ? "key" : "min") : status[k]), {
            weighted: true,
            tags: nm.map((_, i) => nm[find(i)]),
          }),
          rows: [row(w.edges, order.map(label), (j) => (order[j] === cur ? (status[cur] === "sorted" ? "key" : "min") : status[order[j]]))],
        });
      shot(w.start);
      for (const [j, k] of order.entries()) {
        if (tree.length === n - 1) {
          for (const r of order.slice(j)) status[r] = "idle";
          shot(fill(w.enough, { k: n - 1 }));
          break;
        }
        const x = g.list[k];
        const [ra, rb] = [find(x.a), find(x.b)];
        const v = { a: nm[x.a], b: nm[x.b], w: show(x.w), ra: nm[ra], rb: nm[rb] };
        if (ra === rb) {
          status[k] = "min";
          shot(fill(w.skip, v), k);
          continue;
        }
        if (rank[ra] < rank[rb]) parent[ra] = rb;
        else if (rank[ra] > rank[rb]) parent[rb] = ra;
        else (parent[rb] = ra), rank[ra]++;
        status[k] = "sorted";
        tree.push(x);
        shot(fill(w.take, v), k);
      }
      return done(frames, fill(w.answer, { list: treeText(tree, nm), t: total(tree) }));
    },
  },

  primsAlgorithm: {
    level: 3,
    example: ["P-Q 3, P-R 1, Q-R 2, Q-S 4, R-S 5, S-T 2, R-T 6", "P"],
    solve: ([s, st], w, e) => {
      const g = parseEdges(s, e, { max: 14, nodes: 10, weighted: true });
      const nm = g.names;
      const n = nm.length;
      if (!connected(n, g.list)) throw new Error(w.apart);
      const start = which(st, nm, e, w.unknown);
      const adj = adjacency(n, g.list, false);
      const inTree = nm.map((_, i) => i === start);
      // The heap of edges leaving the tree: the cheapest first, the earliest pushed among equals.
      let heap: { w: number; a: number; b: number; k: number; seq: number }[] = [];
      let seq = 0;
      const push = (v: number) => adj[v].forEach(({ to, k }) => !inTree[to] && heap.push({ w: g.list[k].w, a: v, b: to, k, seq: seq++ }));
      const tree: Edge[] = [];
      const used = new Set<number>();
      const frames: Frame[] = [];
      const shot = (note: string, cur = -1, ok = true) => {
        heap.sort((x, y) => x.w - y.w || x.seq - y.seq);
        frames.push({
          note,
          graph: pic(nm, g.list, false, (i) => (inTree[i] ? "sorted" : heap.some((x) => x.b === i) ? "compare" : "plain"), (k) => (k === cur ? (ok ? "key" : "min") : used.has(k) ? "sorted" : heap.some((x) => x.k === k) ? "compare" : "plain"), { weighted: true }),
          rows: [row(w.heap, heap.map((x) => `${nm[x.a]}–${nm[x.b]} ${show(x.w)}`), () => "compare")],
        });
      };
      push(start);
      shot(fill(w.start, { s: nm[start] }));
      while (heap.length && tree.length < n - 1) {
        heap.sort((x, y) => x.w - y.w || x.seq - y.seq);
        const top = heap[0];
        heap = heap.slice(1);
        const v = { a: nm[top.a], b: nm[top.b], w: show(top.w) };
        if (inTree[top.b]) {
          shot(fill(w.skip, v), top.k, false);
          continue;
        }
        inTree[top.b] = true;
        used.add(top.k);
        tree.push({ a: top.a, b: top.b, w: top.w, oneWay: false });
        push(top.b);
        shot(fill(w.take, v), top.k);
      }
      return done(frames, fill(w.answer, { list: treeText(tree, nm), t: total(tree) }), {
        graph: pic(nm, g.list, false, () => "sorted", (k) => (used.has(k) ? "sorted" : "idle"), { weighted: true }),
      });
    },
  },

  knuthMorrisPrattAlgorithm: {
    level: 4,
    example: ["aabaacaabaaa", "aabaaa"],
    solve: ([a, b], w, e) => {
      const t = [...text(a, e, 14)];
      const p = [...text(b, e, 8)];
      const [n, m] = [t.length, p.length];
      const ch = (c: string) => (c === " " ? "␣" : c);
      const lps: number[] = p.map((_, k) => (k === 0 ? 0 : -1));
      const frames: Frame[] = [];
      const build = (note: string, i: number, j: number, hit: Role) =>
        frames.push({
          note,
          mat: {
            vals: [p.map(ch), lps.map((v) => (v < 0 ? "" : v))],
            roles: [p.map((_, k): Role => (k === i ? hit : k === j ? "compare" : "plain")), lps.map((v, k): Role => (k === i && v >= 0 ? "key" : v >= 0 ? "sorted" : "idle"))],
            rowHeads: [w.pattern, w.table],
          },
        });
      build(fill(w.build, { c: ch(p[0]) }), 0, -1, "key");
      for (let i = 1, j = 0; i < m; ) {
        if (p[i] === p[j]) {
          lps[i] = j + 1;
          build(fill(w.grow, { i, j, c: ch(p[i]), n: j + 1 }), i, j, "sorted");
          i++, j++;
        } else if (j > 0) {
          build(fill(w.back, { i, j, a: ch(p[i]), b: ch(p[j]), j1: j - 1, k: lps[j - 1] }), i, j, "min");
          j = lps[j - 1];
        } else {
          lps[i] = 0;
          build(fill(w.zero, { i, a: ch(p[i]), b: ch(p[0]) }), i, 0, "min");
          i++;
        }
      }
      const scan = (note: string, i: number, j: number, hit: Role) => {
        const off = i - j;
        frames.push({
          note,
          mat: {
            vals: [t.map(ch), t.map((_, c) => (c - off >= 0 && c - off < m ? ch(p[c - off]) : ""))],
            roles: [
              t.map((_, c): Role => (c === i ? hit : c >= off && c < i ? "sorted" : c < off ? "idle" : "plain")),
              t.map((_, c): Role => (c === i ? hit : c >= off && c < i ? "sorted" : c - off >= 0 && c - off < m ? "plain" : "idle")),
            ],
            rowHeads: [w.text, w.pattern],
          },
          rows: [row(w.table, lps, (k) => (hit === "min" && k === j - 1 ? "compare" : "plain"))],
        });
      };
      let found = -1;
      for (let i = 0, j = 0; i < n; ) {
        if (t[i] === p[j]) {
          if (j + 1 === m) {
            found = i - j;
            scan(fill(w.found, { i, j, m, k: found }), i, j, "sorted");
            break;
          }
          scan(fill(w.match, { i, j, c: ch(t[i]) }), i, j, "sorted");
          i++, j++;
        } else if (j > 0) {
          scan(fill(w.slide, { i, j, a: ch(t[i]), b: ch(p[j]), j1: j - 1, k: lps[j - 1] }), i, j, "min");
          j = lps[j - 1];
        } else {
          scan(fill(w.skip, { i, a: ch(t[i]), b: ch(p[0]) }), i, 0, "min");
          i++;
        }
      }
      return done(frames, found >= 0 ? fill(w.yes, { k: found }) : w.no);
    },
  },

  aStarAlgorithm: {
    level: 4,
    example: ["0 0 0 0 0 0; 0 1 1 1 1 0; 0 0 0 0 1 0; 1 1 1 0 1 0; 0 0 0 0 0 0", "2, 0", "4, 0"],
    solve: ([gs, ss, es], w, e) => {
      const grid = matrix(gs, e, { rows: 8, cols: 10, whole: true });
      const odd = grid.flat().find((v) => v !== 0 && v !== 1);
      if (odd !== undefined) throw new Error(fill(e.bad, { s: show(odd) }));
      const [R, C] = [grid.length, grid[0].length];
      const cell = (s: string): [number, number] => {
        const [r, c] = nums(s, e, { whole: true, least: 2, max: 2 });
        if (r < 0 || c < 0 || r >= R || c >= C) throw new Error(fill(w.outside, { p: rc(r, c) }));
        if (grid[r][c]) throw new Error(fill(w.wall, { p: rc(r, c) }));
        return [r, c];
      };
      const [sr, sc] = cell(ss);
      const [er, ec] = cell(es);
      const h = (r: number, c: number) => Math.abs(r - er) + Math.abs(c - ec);
      const g = grid2(R, C, () => Number.POSITIVE_INFINITY);
      const from = grid2(R, C, (): [number, number] | null => null);
      const closed = grid2(R, C, () => false);
      // The open set: each square with the order it came in, to break ties between equal f and h.
      const open: { r: number; c: number; seq: number }[] = [{ r: sr, c: sc, seq: 0 }];
      let seq = 1;
      g[sr][sc] = 0;
      const f = (r: number, c: number) => g[r][c] + h(r, c);
      const cmp = (x: { r: number; c: number; seq: number }, y: { r: number; c: number; seq: number }) => f(x.r, x.c) - f(y.r, y.c) || h(x.r, x.c) - h(y.r, y.c) || x.seq - y.seq;
      const frames: Frame[] = [];
      const shot = (note: string, cur: [number, number] | null, path: [number, number][] = []) => {
        const sorted = [...open].sort(cmp);
        frames.push({
          note,
          mat: {
            vals: grid2(R, C, (r, c) => (grid[r][c] ? "■" : Number.isFinite(g[r][c]) ? f(r, c) : "")),
            roles: grid2(R, C, (r, c): Role => {
              if (path.some(([y, x]) => y === r && x === c)) return "sorted";
              if (cur && cur[0] === r && cur[1] === c) return "key";
              if (r === er && c === ec) return "pivot";
              if (open.some((x) => x.r === r && x.c === c)) return "compare";
              return closed[r][c] ? "idle" : "plain";
            }),
          },
          rows: [row(w.open, sorted.map((x) => `${rc(x.r, x.c)} ${f(x.r, x.c)}`), () => "compare")],
        });
      };
      shot(fill(w.start, { s: rc(sr, sc), e: rc(er, ec), h: h(sr, sc) }), [sr, sc]);
      let path: [number, number][] = [];
      while (open.length) {
        let best = 0;
        open.forEach((x, k) => cmp(x, open[best]) < 0 && (best = k));
        const { r, c } = open.splice(best, 1)[0];
        const v = { p: rc(r, c), g: g[r][c], h: h(r, c), f: f(r, c) };
        if (r === er && c === ec) {
          for (let at: [number, number] | null = [r, c]; at; at = from[at[0]][at[1]]) path.push(at);
          path = path.reverse();
          shot(fill(w.reached, { ...v, k: path.length - 1 }), [r, c], path);
          break;
        }
        closed[r][c] = true;
        let k = 0;
        for (const [y, x] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as [number, number][]) {
          if (y < 0 || x < 0 || y >= R || x >= C || grid[y][x] || closed[y][x]) continue;
          if (g[r][c] + 1 >= g[y][x]) continue;
          g[y][x] = g[r][c] + 1;
          from[y][x] = [r, c];
          if (!open.some((o) => o.r === y && o.c === x)) open.push({ r: y, c: x, seq: seq++ });
          k++;
        }
        shot(fill(k ? w.expand : w.expandNone, { ...v, k }), [r, c]);
      }
      if (!path.length) {
        shot(w.stuck, null);
        return done(frames, w.none);
      }
      return done(frames, fill(w.answer, { k: path.length - 1, path: path.map(([r, c]) => `[${r}, ${c}]`).join(", ") }));
    },
  },
};
