// What the graph-theory games share: small graphs drawn without crossings, their vertices on a jittered lattice and
// their edges between neighbouring points (along a row or a column, or across a square by one diagonal), always
// connected; what is asked of them (degrees, components, loops, shortest routes, the cheapest connected network,
// colourings); and the picture, vertices as lettered dots and edges as lines with their lengths when they have any.
export type GPt = [number, number];
/** A graph: where each vertex is drawn, its edges as pairs of vertices, and each edge's length when it has one. */
export type Graph = { pts: GPt[]; edges: [number, number][]; w: number[] };

export const LETTERS = "ABCDEFGHIJKL";
export const name = (v: number) => LETTERS[v];
export const edgeName = (g: Graph, e: number) => `${name(g.edges[e][0])}–${name(g.edges[e][1])}`;

const GAP_X = 130;
const GAP_Y = 108;
const PAD = 34;

/**
 * A connected graph on a cols × rows lattice: every point a vertex, a random tree of the possible edges (along rows
 * and columns, and across each square by one diagonal when `diagonals`, both when `both`), and each other possible
 * edge kept with chance `extra`.
 */
export function latticeGraph(cols: number, rows: number, extra: number, next: () => number, o: { diagonals?: boolean; both?: number } = {}): Graph {
  const at = (c: number, r: number) => r * cols + c;
  const pts: GPt[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) pts.push([PAD + c * GAP_X + (next() - 0.5) * 36, PAD + r * GAP_Y + (next() - 0.5) * 30]);
  const can: [number, number][] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) can.push([at(c, r), at(c + 1, r)]);
      if (r + 1 < rows) can.push([at(c, r), at(c, r + 1)]);
      if (o.diagonals && c + 1 < cols && r + 1 < rows) {
        const both = next() < (o.both ?? 0);
        const down = next() < 0.5;
        if (both || down) can.push([at(c, r), at(c + 1, r + 1)]);
        if (both || !down) can.push([at(c + 1, r), at(c, r + 1)]);
      }
    }
  // A random spanning tree (Kruskal over shuffled edges), then the rest by chance.
  const order = can.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const root = pts.map((_, i) => i);
  const find = (v: number): number => (root[v] === v ? v : (root[v] = find(root[v])));
  const keep = new Set<number>();
  for (const i of order) {
    const [a, b] = can[i];
    if (find(a) !== find(b)) {
      root[find(a)] = find(b);
      keep.add(i);
    } else if (next() < extra) keep.add(i);
  }
  const edges = can.filter((_, i) => keep.has(i)).map(([a, b]): [number, number] => (a < b ? [a, b] : [b, a]));
  return { pts, edges, w: [] };
}

/** The same graph with each edge given a length from `lens` (a whole number for each edge). */
export const withLengths = (g: Graph, lens: number[]): Graph => ({ ...g, w: lens });

export const degrees = (g: Graph) => g.pts.map((_, v) => g.edges.filter(([a, b]) => a === v || b === v).length);
export const oddVertices = (g: Graph) => degrees(g).flatMap((d, v) => (d % 2 ? [v] : []));
/** The edge between two vertices, or −1. */
export const edgeOf = (g: Graph, a: number, b: number) => g.edges.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
export const neighbours = (g: Graph, v: number) => g.edges.flatMap(([a, b]) => (a === v ? [b] : b === v ? [a] : []));
/** Whether the edges listed (all of them when not given) join every vertex. */
export function joinsAll(g: Graph, edges = g.edges.map((_, i) => i)): boolean {
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const v = stack.pop()!;
    for (const e of edges) {
      const [a, b] = g.edges[e];
      const u = a === v ? b : b === v ? a : -1;
      if (u >= 0 && !seen.has(u)) {
        seen.add(u);
        stack.push(u);
      }
    }
  }
  return seen.size === g.pts.length;
}
/** The edges listed that lie on a loop of them (an edge whose removal leaves its ends still joined). */
export function loopEdges(g: Graph, edges: number[]): number[] {
  return edges.filter((e) => {
    const rest = edges.filter((x) => x !== e);
    const [a, b] = g.edges[e];
    const seen = new Set([a]);
    const stack = [a];
    while (stack.length) {
      const v = stack.pop()!;
      for (const x of rest) {
        const [p, q] = g.edges[x];
        const u = p === v ? q : q === v ? p : -1;
        if (u >= 0 && !seen.has(u)) {
          seen.add(u);
          stack.push(u);
        }
      }
    }
    return seen.has(b);
  });
}
/** A colouring with k colours (0 to k − 1) in which no edge joins two of one colour, or null if there is none. */
export function colourWith(g: Graph, k: number): number[] | null {
  const n = g.pts.length;
  const adj = g.pts.map((_, v) => neighbours(g, v));
  const col: number[] = Array(n).fill(-1);
  const go = (v: number): boolean => {
    if (v === n) return true;
    for (let c = 0; c < k; c++) {
      if (adj[v].some((u) => col[u] === c)) continue;
      col[v] = c;
      if (go(v + 1)) return true;
    }
    col[v] = -1;
    return false;
  };
  return go(0) ? col : null;
}
/** The fewest colours that colour the vertices so no edge joins two of one colour. */
export function chromatic(g: Graph): number {
  for (let k = 1; ; k++) if (colourWith(g, k)) return k;
}
/** The edges whose two ends have the same colour (uncoloured ends, −1, never clash). */
export const clashes = (g: Graph, col: number[]) => g.edges.flatMap(([a, b], e) => (col[a] >= 0 && col[a] === col[b] ? [e] : []));
/** Whether the graph has a loop with an odd number of vertices (so two colours can't do). */
export function hasOddLoop(g: Graph): boolean {
  const side = Array(g.pts.length).fill(-1);
  side[0] = 0;
  const stack = [0];
  while (stack.length) {
    const v = stack.pop()!;
    for (const u of neighbours(g, v)) {
      if (side[u] === -1) {
        side[u] = 1 - side[v];
        stack.push(u);
      } else if (side[u] === side[v]) return true;
    }
  }
  return false;
}
/** The shortest distance from a to every vertex by the edges' lengths (Dijkstra; small graphs, so a plain scan). */
export function distances(g: Graph, a: number): number[] {
  const d = g.pts.map(() => Infinity);
  const done = g.pts.map(() => false);
  d[a] = 0;
  for (let k = 0; k < g.pts.length; k++) {
    let v = -1;
    for (let u = 0; u < g.pts.length; u++) if (!done[u] && (v < 0 || d[u] < d[v])) v = u;
    if (v < 0 || d[v] === Infinity) break;
    done[v] = true;
    g.edges.forEach(([p, q], e) => {
      const u = p === v ? q : q === v ? p : -1;
      if (u >= 0 && d[v] + g.w[e] < d[u]) d[u] = d[v] + g.w[e];
    });
  }
  return d;
}
/** The length of a route given as its vertices, or null if two of them in a row aren't joined. */
export function routeLength(g: Graph, route: number[]): number | null {
  let s = 0;
  for (let i = 1; i < route.length; i++) {
    const e = edgeOf(g, route[i - 1], route[i]);
    if (e < 0) return null;
    s += g.w[e];
  }
  return s;
}
/** The cheapest edges joining every vertex (Kruskal), and their total. */
export function cheapestNetwork(g: Graph): { edges: number[]; total: number } {
  const order = g.edges.map((_, i) => i).sort((a, b) => g.w[a] - g.w[b] || a - b);
  const root = g.pts.map((_, i) => i);
  const find = (v: number): number => (root[v] === v ? v : (root[v] = find(root[v])));
  const edges: number[] = [];
  for (const e of order) {
    const [a, b] = g.edges[e];
    if (find(a) !== find(b)) {
      root[find(a)] = find(b);
      edges.push(e);
    }
  }
  return { edges, total: edges.reduce((s, e) => s + g.w[e], 0) };
}

// ---------- the picture ----------

const INK = "#1e1e1e";
export const PALETTE = ["#ff8787", "#74c0fc", "#8ce99a", "#ffd43b"];
export const DOT_R = 17;
/** The size of a graph's picture. */
export const graphSize = (g: Graph) => [Math.max(...g.pts.map((p) => p[0])) + PAD, Math.max(...g.pts.map((p) => p[1])) + PAD];

/**
 * A graph: its edges (`edgeColor` and `edgeWidth` per edge; dashed when `edgeDash` says so), their lengths at their
 * middles when it has any, and its vertices as dots with their letters (`fill` per vertex, `ring` a coloured ring;
 * no letters when `letters` is false). `scale` shrinks it for a small picture.
 */
export function graphSvg(g: Graph, o: { edgeColor?: (e: number) => string | undefined; edgeWidth?: (e: number) => number; edgeDash?: (e: number) => boolean; fill?: (v: number) => string | undefined; ring?: (v: number) => string | undefined; letters?: boolean; scale?: number } = {}): { body: string; w: number; h: number } {
  const k = o.scale ?? 1;
  const [W, H] = graphSize(g);
  const P = g.pts.map(([x, y]) => [x * k, y * k]);
  let body = "";
  g.edges.forEach(([a, b], e) => {
    const dash = o.edgeDash?.(e) ? ` stroke-dasharray="7 6"` : "";
    body += `<line x1="${r1(P[a][0])}" y1="${r1(P[a][1])}" x2="${r1(P[b][0])}" y2="${r1(P[b][1])}" stroke="${o.edgeColor?.(e) ?? "#868e96"}" stroke-width="${(o.edgeWidth?.(e) ?? 3) * Math.max(k, 0.7)}" stroke-linecap="round"${dash}/>`;
  });
  if (g.w.length)
    g.edges.forEach(([a, b], e) => {
      const [x, y] = [(P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2];
      body += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${11 * k + 2}" fill="#fff" stroke="#dee2e6"/><text x="${r1(x)}" y="${r1(y + 5 * k + 0.5)}" font-size="${r1(14 * k + 1)}" font-weight="700" text-anchor="middle" fill="${INK}">${g.w[e]}</text>`;
    });
  g.pts.forEach((_, v) => {
    const ring = o.ring?.(v);
    body += `<circle cx="${r1(P[v][0])}" cy="${r1(P[v][1])}" r="${r1(DOT_R * k)}" fill="${o.fill?.(v) ?? "#fff"}" stroke="${ring ?? INK}" stroke-width="${ring ? 4 : 2}"/>`;
    if (o.letters !== false) body += `<text x="${r1(P[v][0])}" y="${r1(P[v][1] + 6 * k)}" font-size="${r1(16 * k)}" font-weight="700" text-anchor="middle" fill="${INK}">${name(v)}</text>`;
  });
  return { body, w: Math.ceil(W * k), h: Math.ceil(H * k) };
}
const r1 = (x: number) => Math.round(x * 10) / 10;
