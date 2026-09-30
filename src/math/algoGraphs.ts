// Graph and tree pictures for the Algorithms tool: BFS, DFS, Dijkstra, Prim, Kruskal and Kahn's
// topological sort on an edge list (drawn on a circle, or in layers for a DAG) with a trace table;
// binary search trees and AVL trees (with rotations) and heaps built by heapify.
import type { AlgoWords, GraphSpec, TreeSpec } from "./algo";
import { drawRows, legendRow, parseNums, ROLES, table, txt, type Role, type Row, type TCol, type TRow } from "./algoArrays";
import { C, compose, esc, fill, FONT, nt, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

// ---------- graphs ----------

export type Edge = { u: string; v: string; w: number; id: number };
type Adj = Map<string, { to: string; w: number; id: number }[]>;

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** Parses "A-B 4, B-C" into nodes (in order of appearance) and edges; weights are optional. */
export function parseEdges(text: string, words: { noEdges: string; tooMany: string; badEdge: string }, maxNodes = 12, maxEdges = 30) {
  const toks = text.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
  if (!toks.length) throw new Error(words.noEdges);
  if (toks.length > maxEdges) throw new Error(fill(words.tooMany, { n: maxEdges }));
  const nodes: string[] = [];
  const edges: Edge[] = [];
  let weighted = false;
  for (const tok of toks) {
    const m = tok.match(/^([\p{L}\p{N}_]{1,8})\s*(?:-+>?|→|–|—)\s*([\p{L}\p{N}_]{1,8})(?:\s*[:=]?\s*([−-]?\d+(?:\.\d+)?))?$/u);
    if (!m || m[1] === m[2]) throw new Error(fill(words.badEdge, { s: tok }));
    for (const x of [m[1], m[2]]) if (!nodes.includes(x)) nodes.push(x);
    if (m[3] !== undefined) weighted = true;
    edges.push({ u: m[1], v: m[2], w: m[3] === undefined ? 1 : Number(m[3].replace("−", "-")), id: edges.length });
  }
  if (nodes.length > maxNodes) throw new Error(fill(words.tooMany, { n: maxNodes }));
  return { nodes, edges, weighted };
}

function parseGraph(spec: GraphSpec, words: AlgoWords) {
  const { nodes, edges, weighted } = parseEdges(spec.edges, words);
  const adjOf = (directed: boolean): Adj => {
    const adj: Adj = new Map(nodes.map((n) => [n, []]));
    for (const e of edges) {
      adj.get(e.u)!.push({ to: e.v, w: e.w, id: e.id });
      if (!directed) adj.get(e.v)!.push({ to: e.u, w: e.w, id: e.id });
    }
    for (const list of adj.values()) list.sort((a, b) => byName(a.to, b.to) || a.w - b.w);
    return adj;
  };
  return { nodes, edges, weighted, adjOf };
}

/** Layers by longest path from the sources, or null when the graph has a cycle. */
function layers(nodes: string[], edges: Edge[]): Map<string, number> | null {
  const indeg = new Map(nodes.map((n) => [n, 0]));
  for (const e of edges) indeg.set(e.v, indeg.get(e.v)! + 1);
  const level = new Map(nodes.map((n) => [n, 0]));
  const q = nodes.filter((n) => !indeg.get(n));
  let seen = 0;
  while (q.length) {
    const u = q.shift()!;
    seen++;
    for (const e of edges.filter((e) => e.u === u)) {
      level.set(e.v, Math.max(level.get(e.v)!, level.get(u)! + 1));
      indeg.set(e.v, indeg.get(e.v)! - 1);
      if (!indeg.get(e.v)) q.push(e.v);
    }
  }
  return seen === nodes.length ? level : null;
}

export type Look = {
  hl: Set<number>;
  fills: Map<string, Role>;
  badge: Map<string, string>;
  under: Map<string, string>;
  /** Free node colours (graph colouring), overriding fills. */
  colors?: Map<string, { fill: string; stroke: string }>;
  /** Small labels on edges (e.g. the order of an Euler trail). */
  edgeLabel?: Map<number, string>;
  /** Colour of the highlighted edges (default blue). */
  hlColor?: string;
};

export type LayoutOptions = { layered?: boolean; circle?: boolean; shells?: boolean };

export const nodeRx = (name: string) => Math.max(17, name.length * 4.2 + 9);

/** Node positions: layers for a DAG, a circle on request, otherwise a force-directed layout. */
export function layoutGraph(nodes: string[], edges: Edge[], H: number, opts: LayoutOptions = {}): Map<string, [number, number]> {
  const rx = new Map(nodes.map((n) => [n, nodeRx(n)]));
  const pos = new Map<string, [number, number]>();
  const lv = opts.layered ? layers(nodes, edges) : null;
  if (opts.shells) {
    // Two concentric rings, inner vertex k under outer vertex k (Petersen, prisms, cubes).
    const n = nodes.length;
    const m = Math.ceil(n / 2);
    const R = Math.min(H / 2 - 26, W / 2 - 16 - Math.max(...rx.values()));
    nodes.forEach((name, k) => {
      const outer = k < m;
      const j = outer ? k : k - m;
      const size = outer ? m : n - m;
      const t = -Math.PI / 2 + (2 * Math.PI * j) / size + (m % 2 ? 0 : Math.PI / m);
      const r = outer ? R : R * 0.5;
      pos.set(name, [W / 2 + r * Math.cos(t), H / 2 + r * Math.sin(t)]);
    });
  } else if (opts.circle) {
    const n = nodes.length;
    const maxRx = Math.max(...rx.values());
    const R = Math.min(H / 2 - 26, W / 2 - 16 - maxRx);
    nodes.forEach((name, k) => {
      const t = -Math.PI / 2 + (2 * Math.PI * k) / n;
      pos.set(name, [W / 2 + R * Math.cos(t), H / 2 + R * Math.sin(t)]);
    });
  } else if (lv && Math.max(...lv.values()) > 0) {
    // Layers left to right; within a layer, order by the mean place of the predecessors (fewer crossings).
    const L = Math.max(...lv.values()) + 1;
    const place = new Map<string, number>();
    for (let l = 0; l < L; l++) {
      const col = nodes.filter((n) => lv.get(n) === l);
      const bary = (n: string) => {
        const ps = edges.filter((e) => e.v === n && place.has(e.u)).map((e) => place.get(e.u)!);
        return ps.length ? ps.reduce((s, p) => s + p, 0) / ps.length : 0.5;
      };
      if (l > 0) col.sort((a, b) => bary(a) - bary(b));
      col.forEach((n, k) => {
        place.set(n, (k + 0.5) / col.length);
        const zig = col.length === 1 ? (l % 2 ? 1 : -1) * Math.min(60, H / 5) : 0; // so edges that skip a layer miss the node
        pos.set(n, [16 + ((l + 0.5) * (W - 32)) / L, 24 + ((k + 0.5) * (H - 48)) / col.length + zig]);
      });
    }
  } else {
    // Fruchterman–Reingold from a circle: deterministic, and usually untangles the edges.
    const n = nodes.length;
    const P = nodes.map((_, k) => {
      const t = -Math.PI / 2 + (2 * Math.PI * k) / n;
      return [Math.cos(t), Math.sin(t)];
    });
    const idx = new Map(nodes.map((name, k) => [name, k]));
    const links = edges.map((e) => [idx.get(e.u)!, idx.get(e.v)!]);
    const k0 = 1.8 / Math.sqrt(n);
    for (let it = 0; it < 500; it++) {
      const temp = 0.12 * (1 - it / 500) + 0.002;
      const D = P.map(() => [0, 0]);
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const dx = P[i][0] - P[j][0];
          const dy = P[i][1] - P[j][1];
          const dist = Math.max(Math.hypot(dx, dy), 0.01);
          const f = (k0 * k0) / dist / dist;
          D[i][0] += dx * f;
          D[i][1] += dy * f;
          D[j][0] -= dx * f;
          D[j][1] -= dy * f;
        }
      for (const [a, b] of links) {
        const dx = P[a][0] - P[b][0];
        const dy = P[a][1] - P[b][1];
        const f = Math.hypot(dx, dy) / k0;
        D[a][0] -= dx * f;
        D[a][1] -= dy * f;
        D[b][0] += dx * f;
        D[b][1] += dy * f;
      }
      P.forEach((p, i) => {
        const len = Math.hypot(D[i][0], D[i][1]);
        if (len > 1e-9) (p[0] += (D[i][0] / len) * Math.min(len, temp)), (p[1] += (D[i][1] / len) * Math.min(len, temp));
      });
    }
    const xs = P.map((p) => p[0]);
    const ys = P.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const maxRx = Math.max(...rx.values());
    const spanX = n <= 3 ? 300 : W - 32 - 2 * maxRx;
    nodes.forEach((name, k) => {
      const fx = x1 - x0 < 1e-6 ? 0.5 : (P[k][0] - x0) / (x1 - x0);
      const fy = y1 - y0 < 1e-6 ? 0.5 : (P[k][1] - y0) / (y1 - y0);
      pos.set(name, [W / 2 - spanX / 2 + fx * spanX, 26 + fy * (H - 60)]);
    });
  }
  return pos;
}

export function drawGraph(nodes: string[], edges: Edge[], directed: boolean, weighted: boolean, look: Look, H: number, opts: LayoutOptions = {}, given?: Map<string, [number, number]>): string {
  const rx = new Map(nodes.map((n) => [n, nodeRx(n)]));
  const RY = 16;
  const pos = given ?? layoutGraph(nodes, edges, H, opts);
  // Distance from an ellipse's centre to its edge in direction (dx, dy).
  const trim = (name: string, dx: number, dy: number) => {
    const a = rx.get(name)! + 2;
    const b = RY + 2;
    const len = Math.hypot(dx, dy) || 1;
    const c = dx / len;
    const s = dy / len;
    return (a * b) / Math.sqrt((b * c) ** 2 + (a * s) ** 2);
  };
  const parts: string[] = [
    `<defs>${[
      ["g-ah", "#868e96"],
      ["g-ah-hl", C.blue],
    ]
      .map(([id, col]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`)
      .join("")}</defs>`,
  ];
  const labels: string[] = [];
  for (const e of edges) {
    const [x1, y1] = pos.get(e.u)!;
    const [x2, y2] = pos.get(e.v)!;
    const hl = look.hl.has(e.id);
    // Parallel edges (and directed pairs) bend apart symmetrically, measured in one fixed direction.
    const same = edges.filter((f) => (f.u === e.u && f.v === e.v) || (f.u === e.v && f.v === e.u));
    const twin = same.length > 1;
    const flip = byName(e.u, e.v) > 0 ? -1 : 1;
    const dx = (x2 - x1) * flip;
    const dy = (y2 - y1) * flip;
    const len = Math.hypot(dx, dy) || 1;
    const off = twin ? (same.indexOf(e) - (same.length - 1) / 2) * 46 : 0;
    const cx = (x1 + x2) / 2 - (dy / len) * off;
    const cy = (y1 + y2) / 2 + (dx / len) * off;
    const t1 = trim(e.u, cx - x1, cy - y1);
    const t2 = trim(e.v, cx - x2, cy - y2);
    const l1 = Math.hypot(cx - x1, cy - y1) || 1;
    const l2 = Math.hypot(cx - x2, cy - y2) || 1;
    const sx = x1 + ((cx - x1) / l1) * t1;
    const sy = y1 + ((cy - y1) / l1) * t1;
    const ex = x2 + ((cx - x2) / l2) * t2;
    const ey = y2 + ((cy - y2) / l2) * t2;
    const stroke = hl ? look.hlColor ?? C.blue : "#adb5bd";
    const d = twin ? `M${r2(sx)} ${r2(sy)} Q${r2(cx)} ${r2(cy)} ${r2(ex)} ${r2(ey)}` : `M${r2(sx)} ${r2(sy)} L${r2(ex)} ${r2(ey)}`;
    parts.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${hl ? 3.6 : 1.7}"${directed ? ` marker-end="url(#${hl ? "g-ah-hl" : "g-ah"})"` : ""}/>`);
    const mx = twin ? (sx + 2 * cx + ex) / 4 : (sx + ex) / 2;
    const my = twin ? (sy + 2 * cy + ey) / 4 : (sy + ey) / 2;
    const el = look.edgeLabel?.get(e.id);
    // Off-centre on straight edges, so labels of crossing diagonals do not collide.
    const tl = twin ? 0.5 : e.id % 2 ? 0.38 : 0.62;
    const lx = twin ? mx : sx + (ex - sx) * tl;
    const ly = twin ? my : sy + (ey - sy) * tl;
    if (el)
      labels.push(
        `<circle cx="${r2(lx)}" cy="${r2(ly)}" r="10" fill="#ffffff" stroke="${look.hlColor ?? C.blue}" stroke-width="1.6"/>`,
        txt(lx, ly + 4, el, { size: 11, anchor: "middle", bold: true, color: look.hlColor ?? C.blue }),
      );
    else if (weighted) {
      labels.push(
        `<text x="${r2(mx)}" y="${r2(my + 4.5)}" ${FONT} font-size="13" font-weight="700" fill="${hl ? C.blue : "#495057"}" text-anchor="middle" paint-order="stroke" stroke="#ffffff" stroke-width="4" stroke-linejoin="round">${nt(e.w)}</text>`,
      );
    }
  }
  parts.push(...labels);
  for (const name of nodes) {
    const [x, y] = pos.get(name)!;
    const role = { ...ROLES[look.fills.get(name) ?? "plain"], ...(look.colors?.get(name) ?? {}) };
    const a = rx.get(name)!;
    parts.push(
      `<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(a)}" ry="${RY}" fill="${role.fill}" stroke="${role.stroke}" stroke-width="2"/>`,
      txt(x, y + 5, name, { size: 14, anchor: "middle", bold: true, color: role.text }),
    );
    const b = look.badge.get(name);
    if (b)
      parts.push(
        `<circle cx="${r2(x + a - 2)}" cy="${r2(y - RY + 1)}" r="9" fill="${C.orange}"/>`,
        txt(x + a - 2, y - RY + 5, b, { size: 11, anchor: "middle", bold: true, color: "#ffffff" }),
      );
    const u = look.under.get(name);
    if (u) parts.push(`<text x="${r2(x)}" y="${r2(y + RY + 15)}" ${FONT} font-size="12.5" font-weight="700" fill="${C.green}" text-anchor="middle" paint-order="stroke" stroke="#ffffff" stroke-width="3.5">${esc(u)}</text>`);
  }
  return parts.join("");
}

export function renderGraph(spec: GraphSpec, w: AlgoWords): RenderedSvg {
  const { nodes, edges, weighted, adjOf } = parseGraph(spec, w);
  const algo = spec.algo;
  const start = spec.start.trim() || nodes[0];
  if (algo !== "topo" && algo !== "kruskal" && !nodes.includes(start)) throw new Error(fill(w.noNode, { v: start }));
  if (algo === "topo" && !spec.directed) throw new Error(w.needDirected);
  const mst = algo === "prim" || algo === "kruskal";
  const directed = spec.directed && !mst;
  const adj = adjOf(directed);
  const look: Look = { hl: new Set(), fills: new Map(), badge: new Map(), under: new Map() };
  let cols: TCol[] = [];
  const rows: TRow[] = [];
  const caps: Caption[] = [];
  const reached = new Set<string>();
  const arrow = " → ";

  if (algo === "bfs" || algo === "dfs") {
    const order: string[] = [];
    if (algo === "bfs") {
      cols = [{ head: w.cols.step, w: 60 }, { head: w.cols.visit, w: 90 }, { head: w.cols.queue, w: 300 }];
      const dist = new Map([[start, 0]]);
      const q = [start];
      reached.add(start);
      while (q.length) {
        const u = q.shift()!;
        order.push(u);
        for (const nb of adj.get(u)!)
          if (!reached.has(nb.to)) {
            reached.add(nb.to);
            dist.set(nb.to, dist.get(u)! + 1);
            look.hl.add(nb.id);
            q.push(nb.to);
          }
        rows.push({ cells: [String(order.length), u, q.join(", ") || "—"], bold: [false, true], colors: [undefined, C.blue] });
      }
      for (const [v, d] of dist) look.under.set(v, `d = ${d}`);
    } else {
      cols = [{ head: w.cols.step, w: 60 }, { head: w.cols.visit, w: 90 }, { head: w.cols.stack, w: 380 }];
      const visit = (u: string, path: string[]) => {
        reached.add(u);
        order.push(u);
        rows.push({ cells: [String(order.length), u, [...path, u].join(arrow)], bold: [false, true], colors: [undefined, C.blue] });
        for (const nb of adj.get(u)!)
          if (!reached.has(nb.to)) {
            look.hl.add(nb.id);
            visit(nb.to, [...path, u]);
          }
      };
      visit(start, []);
    }
    order.forEach((v, i) => look.badge.set(v, String(i + 1)));
    caps.push({ text: fill(w.order, { order: order.join(arrow) }), color: C.blue });
  } else if (algo === "dijkstra") {
    const neg = edges.find((e) => e.w < 0);
    if (neg) throw new Error(w.negative);
    const colW = Math.min(64, Math.floor((W - 32 - 136) / nodes.length));
    cols = [{ head: w.cols.step, w: 66 }, { head: w.cols.visit, w: 70 }, ...nodes.map((n) => ({ head: n, w: colW }))];
    const dist = new Map(nodes.map((n) => [n, Infinity]));
    const prev = new Map<string, { from: string; id: number }>();
    dist.set(start, 0);
    const done = new Set<string>();
    for (;;) {
      let u: string | null = null;
      for (const n of nodes) if (!done.has(n) && Number.isFinite(dist.get(n)!) && (u === null || dist.get(n)! < dist.get(u)!)) u = n;
      if (u === null) break;
      const before = new Set(done);
      done.add(u);
      const improved = new Set<string>();
      for (const nb of adj.get(u)!) {
        const nd = dist.get(u)! + nb.w;
        if (!done.has(nb.to) && nd < dist.get(nb.to)!) {
          dist.set(nb.to, nd);
          prev.set(nb.to, { from: u, id: nb.id });
          improved.add(nb.to);
        }
      }
      rows.push({
        cells: [String(done.size), u, ...nodes.map((n) => (before.has(n) ? "" : Number.isFinite(dist.get(n)!) ? nt(dist.get(n)!) : "∞"))],
        colors: [undefined, C.blue, ...nodes.map((n) => (n === u ? C.green : improved.has(n) ? C.orange : Number.isFinite(dist.get(n)!) ? C.ink : C.grey))],
        fills: [undefined, undefined, ...nodes.map((n) => (n === u ? ROLES.sorted.fill : improved.has(n) ? ROLES.compare.fill : undefined))],
        bold: [false, true, ...nodes.map((n) => n === u || improved.has(n))],
      });
    }
    for (const n of done) reached.add(n);
    for (const p of prev.values()) look.hl.add(p.id);
    for (const n of done) look.under.set(n, nt(dist.get(n)!));
    const paths = nodes
      .filter((n) => n !== start && done.has(n))
      .map((n) => {
        const path = [n];
        while (path[0] !== start) path.unshift(prev.get(path[0])!.from);
        return fill(w.pathTo, { v: n, path: path.join(arrow), d: nt(dist.get(n)!) });
      });
    if (paths.length <= 6) for (const p of paths) caps.push({ text: p, color: C.blue });
    else caps.push({ text: paths.join(" · "), color: C.blue });
  } else if (algo === "prim") {
    cols = [{ head: w.cols.step, w: 60 }, { head: w.cols.edge, w: 150 }, { head: w.cols.weight, w: 90 }, { head: w.cols.total, w: 90 }];
    reached.add(start);
    let total = 0;
    for (;;) {
      let best: { u: string; to: string; w: number; id: number } | null = null;
      for (const u of reached)
        for (const nb of adj.get(u)!)
          if (!reached.has(nb.to) && (!best || nb.w < best.w || (nb.w === best.w && byName(u + nb.to, best.u + best.to) < 0))) best = { u, ...nb };
      if (!best) break;
      reached.add(best.to);
      look.hl.add(best.id);
      total += best.w;
      rows.push({ cells: [String(rows.length + 1), `${best.u} – ${best.to}`, nt(best.w), nt(total)], bold: [false, true, false, true], colors: [undefined, C.blue] });
    }
    caps.push({ text: fill(w.mstTotal, { w: nt(total) }), color: C.blue });
  } else if (algo === "kruskal") {
    cols = [{ head: w.cols.step, w: 60 }, { head: w.cols.edge, w: 150 }, { head: w.cols.weight, w: 90 }, { head: w.cols.result, w: 200 }];
    const parent = new Map(nodes.map((n) => [n, n]));
    const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!));
    let total = 0;
    let taken = 0;
    const sorted = edges.slice().sort((a, b) => a.w - b.w || a.id - b.id);
    for (const e of sorted) {
      if (taken === nodes.length - 1) break;
      const ok = find(e.u) !== find(e.v);
      if (ok) {
        parent.set(find(e.u), find(e.v));
        look.hl.add(e.id);
        total += e.w;
        taken++;
      }
      rows.push({
        cells: [String(rows.length + 1), `${e.u} – ${e.v}`, nt(e.w), ok ? `✓ ${w.added}` : `✗ ${w.cycleSkip}`],
        colors: [undefined, ok ? C.blue : C.grey, ok ? C.ink : C.grey, ok ? C.green : C.red],
        bold: [false, ok, false, ok],
      });
    }
    const root = find(start);
    for (const n of nodes) if (find(n) === root) reached.add(n);
    caps.push({ text: fill(w.mstTotal, { w: nt(total) }), color: C.blue });
  } else {
    cols = [{ head: w.cols.step, w: 60 }, { head: w.cols.output, w: 110 }, { head: w.cols.queue, w: 300 }];
    const indeg = new Map(nodes.map((n) => [n, 0]));
    for (const e of edges) indeg.set(e.v, indeg.get(e.v)! + 1);
    const q = nodes.filter((n) => !indeg.get(n));
    const out: string[] = [];
    while (q.length) {
      const u = q.shift()!;
      out.push(u);
      reached.add(u);
      for (const nb of adj.get(u)!) {
        indeg.set(nb.to, indeg.get(nb.to)! - 1);
        if (!indeg.get(nb.to)) q.push(nb.to);
      }
      rows.push({ cells: [String(out.length), u, q.join(", ") || "—"], bold: [false, true], colors: [undefined, C.blue] });
    }
    out.forEach((v, i) => look.badge.set(v, String(i + 1)));
    if (out.length < nodes.length) {
      const left = nodes.filter((n) => !reached.has(n));
      left.forEach((n) => look.fills.set(n, "min"));
      caps.push({ text: fill(w.cycle, { nodes: left.join(", ") }), color: C.red });
    } else caps.push({ text: fill(w.topoOrder, { order: out.join(arrow) }), color: C.blue });
  }

  for (const n of nodes) if (!look.fills.has(n)) look.fills.set(n, reached.has(n) ? (n === start && algo !== "topo" && algo !== "kruskal" ? "compare" : "key") : "idle");
  const missing = nodes.filter((n) => !reached.has(n));
  if (missing.length && algo !== "topo") caps.push({ text: fill(w.unreachable, { nodes: missing.join(", ") }), color: C.orange });
  if (mst && spec.directed) caps.push({ text: w.undirectedOnly, color: C.orange });
  caps.push({ text: w.graphInfo[algo], color: "#495057" });

  const H = 300;
  const pic = drawGraph(nodes, edges, directed, weighted, look, H, { layered: algo === "topo" });
  const tw = cols.reduce((s, c) => s + c.w, 0);
  const tb = rows.length ? table(Math.max(16, (W - tw) / 2), H + 14, cols, rows) : { svg: "", h: -14 };
  const V = nodes.length;
  const E = edges.length;
  const cost = { bfs: "O(V + E)", dfs: "O(V + E)", topo: "O(V + E)", dijkstra: "O((V + E)\\log V)", prim: "O(E \\log V)", kruskal: "O(E \\log E)" }[algo];
  return compose(`V = ${V},\\quad E = ${E},\\qquad ${cost}`, pic + tb.svg, H + 14 + tb.h, caps);
}

// ---------- trees ----------

type TNode = { v: number; l: TNode | null; r: TNode | null; h: number };
const ht = (t: TNode | null) => (t ? t.h : -1);
const upd = (t: TNode) => (t.h = 1 + Math.max(ht(t.l), ht(t.r)));

export function renderTree(spec: TreeSpec, w: AlgoWords): RenderedSvg {
  return spec.kind === "minheap" || spec.kind === "maxheap" ? renderHeap(spec, w) : renderSearchTree(spec, w);
}

function renderSearchTree(spec: TreeSpec, w: AlgoWords): RenderedSvg {
  const vals = parseNums(spec.data, w, 24);
  const avl = spec.kind === "avl";
  const rotations: string[] = [];
  const dups: number[] = [];
  const rotR = (y: TNode) => {
    const x = y.l!;
    y.l = x.r;
    x.r = y;
    upd(y);
    upd(x);
    return x;
  };
  const rotL = (x: TNode) => {
    const y = x.r!;
    x.r = y.l;
    y.l = x;
    upd(x);
    upd(y);
    return y;
  };
  const insert = (t: TNode | null, v: number): TNode => {
    if (!t) return { v, l: null, r: null, h: 0 };
    if (v < t.v) t.l = insert(t.l, v);
    else t.r = insert(t.r, v);
    upd(t);
    if (!avl) return t;
    const bf = ht(t.l) - ht(t.r);
    if (bf > 1) {
      if (v < t.l!.v) return rotations.push(`LL(${nt(t.v)})`), rotR(t);
      t.l = rotL(t.l!);
      return rotations.push(`LR(${nt(t.v)})`), rotR(t);
    }
    if (bf < -1) {
      if (v > t.r!.v) return rotations.push(`RR(${nt(t.v)})`), rotL(t);
      t.r = rotR(t.r!);
      return rotations.push(`RL(${nt(t.v)})`), rotL(t);
    }
    return t;
  };
  let root: TNode | null = null;
  const seen = new Set<number>();
  for (const v of vals) {
    if (seen.has(v)) {
      dups.push(v);
      continue;
    }
    seen.add(v);
    root = insert(root, v);
  }
  const inorder: TNode[] = [];
  const pre: number[] = [];
  const post: number[] = [];
  const depth = new Map<TNode, number>();
  const walk = (t: TNode | null, d: number) => {
    if (!t) return;
    depth.set(t, d);
    pre.push(t.v);
    walk(t.l, d + 1);
    inorder.push(t);
    walk(t.r, d + 1);
    post.push(t.v);
  };
  walk(root, 0);
  const level: number[] = [];
  const q = root ? [root] : [];
  while (q.length) {
    const t = q.shift()!;
    level.push(t.v);
    if (t.l) q.push(t.l);
    if (t.r) q.push(t.r);
  }
  const n = inorder.length;
  const H = Math.max(...depth.values());
  const levelH = H ? Math.min(62, 330 / H) : 0;
  const rad = Math.max(11, Math.min(18, (W - 32) / n / 2 - 2));
  const pos = new Map<TNode, [number, number]>();
  inorder.forEach((t, i) => pos.set(t, [16 + ((i + 0.5) * (W - 32)) / n, 22 + depth.get(t)! * levelH]));
  const parts: string[] = [];
  for (const [t, [x, y]] of pos)
    for (const c of [t.l, t.r])
      if (c) {
        const [cx, cy] = pos.get(c)!;
        parts.push(`<line x1="${r2(x)}" y1="${r2(y)}" x2="${r2(cx)}" y2="${r2(cy)}" stroke="#868e96" stroke-width="1.6"/>`);
      }
  for (const [t, [x, y]] of pos) {
    const role = t === root ? ROLES.compare : ROLES.key;
    parts.push(`<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(rad)}" fill="${role.fill}" stroke="${role.stroke}" stroke-width="2"/>`);
    parts.push(txt(x, y + 4.5, nt(t.v), { size: Math.min(13.5, rad * 0.8), anchor: "middle", bold: true }));
    if (avl) {
      const bf = ht(t.l) - ht(t.r);
      parts.push(txt(x + rad + 1, y - rad + 3, bf > 0 ? `+${bf}` : bf < 0 ? `−${-bf}` : "0", { size: 10.5, color: C.purple, bold: true }));
    }
  }
  const bodyH = 22 + H * levelH + rad + 8;
  const list = (a: number[]) => a.map((v) => nt(v)).join(", ");
  const caps: Caption[] = [
    { text: fill(w.inorder, { list: list(inorder.map((t) => t.v)) }), color: C.green },
    { text: fill(w.preorder, { list: list(pre) }), color: C.ink },
    { text: fill(w.postorder, { list: list(post) }), color: C.ink },
    { text: fill(w.levelorder, { list: list(level) }), color: C.ink },
    { text: fill(w.height, { h: H, n, b: Math.floor(Math.log2(n)) }), color: C.blue },
  ];
  if (avl) caps.push(rotations.length ? { text: fill(w.rotations, { list: rotations.join(", ") }), color: C.purple } : { text: w.noRotations, color: C.purple });
  if (dups.length) caps.push({ text: fill(w.duplicates, { v: list(dups) }), color: C.orange });
  caps.push({ text: w.treeInfo[spec.kind], color: "#495057" });
  const tex = avl ? `\\left|\\, h(L) - h(R) \\,\\right| \\le 1` : `L < v < R`;
  return compose(`${tex}, \\qquad n = ${n},\\quad h = ${H}`, parts.join(""), bodyH, caps);
}

function renderHeap(spec: TreeSpec, w: AlgoWords): RenderedSvg {
  const a = parseNums(spec.data, w, 15);
  const max = spec.kind === "maxheap";
  const better = (x: number, y: number) => (max ? x > y : x < y);
  const n = a.length;
  const rows: Row[] = [{ vals: a.slice(), roles: Array(n).fill("plain"), note: w.start }];
  let swaps = 0;
  for (let i = (n >> 1) - 1; i >= 0; i--) {
    const v = a[i];
    const path = [i];
    let k = i;
    for (;;) {
      const l = 2 * k + 1;
      const r = l + 1;
      let m = k;
      if (l < n && better(a[l], a[m])) m = l;
      if (r < n && better(a[r], a[m])) m = r;
      if (m === k) break;
      [a[k], a[m]] = [a[m], a[k]];
      path.push(m);
      k = m;
    }
    if (path.length > 1) {
      swaps += path.length - 1;
      rows.push({ vals: a.slice(), roles: Array.from({ length: n }, (_, j): Role => (j === k ? "key" : path.includes(j) ? "compare" : "plain")), note: fill(w.sift, { v: nt(v), s: path.length - 1 }) });
    }
  }
  // Tree picture of the finished heap.
  const levels = Math.floor(Math.log2(n)) + 1;
  const levelH = 54;
  const parts: string[] = [];
  const p = (i: number): [number, number] => {
    const L = Math.floor(Math.log2(i + 1));
    const k = i + 1 - 2 ** L;
    return [16 + ((k + 0.5) * (W - 32)) / 2 ** L, 22 + L * levelH];
  };
  for (let i = 1; i < n; i++) {
    const [x, y] = p(i);
    const [px, py] = p((i - 1) >> 1);
    parts.push(`<line x1="${r2(px)}" y1="${r2(py)}" x2="${r2(x)}" y2="${r2(y)}" stroke="#868e96" stroke-width="1.6"/>`);
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = p(i);
    const role = i === 0 ? ROLES.sorted : ROLES.key;
    parts.push(`<circle cx="${r2(x)}" cy="${r2(y)}" r="17" fill="${role.fill}" stroke="${role.stroke}" stroke-width="2"/>`);
    parts.push(txt(x, y + 4.5, nt(a[i]), { size: 13, anchor: "middle", bold: true }));
    parts.push(txt(x, y + 30, String(i), { size: 10, anchor: "middle", color: C.grey }));
  }
  const treeH = 22 + (levels - 1) * levelH + 40;
  const tr = drawRows(rows, n, treeH);
  const leg = legendRow(
    [
      { role: "compare", text: w.legend.siftPath },
      { role: "key", text: w.legend.siftEnd },
    ],
    treeH + tr.h + 6,
  );
  const caps: Caption[] = [
    { text: fill(w.heapBuilt, { s: swaps, top: nt(a[0]) }), color: C.blue },
    { text: w.treeInfo[spec.kind], color: "#495057" },
  ];
  const rel = max ? "\\ge" : "\\le";
  return compose(`A[i] ${rel} A[2i+1],\\ \\ A[i] ${rel} A[2i+2]`, parts.join("") + tr.svg + leg.svg, treeH + tr.h + 6 + leg.h, caps);
}

