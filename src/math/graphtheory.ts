// Graph theory on an undirected (multi)graph typed as an edge list: properties (degrees and the
// handshake lemma, components, bipartite or an odd cycle, trees, regular/complete), Euler trails
// and circuits (Hierholzer), Hamiltonian cycles and paths (backtracking, Dirac/Ore), colouring
// (greedy vs the exact chromatic number, cliques), walks counted by powers of the adjacency matrix,
// and spanning trees counted by the matrix-tree theorem (with every tree drawn when there are few).
import { table, type TRow } from "./algoArrays";
import { drawGraph, layoutGraph, parseEdges, type Edge, type Look } from "./algoGraphs";
import { C, compose, fill, r2, texAt, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

export type GtTopic = "props" | "euler" | "hamilton" | "color" | "walks" | "spanning";
export const GT_TOPICS: GtTopic[] = ["props", "euler", "hamilton", "color", "walks", "spanning"];
export type GtLayout = "auto" | "circle" | "shells";
export const GT_LAYOUTS: GtLayout[] = ["auto", "circle", "shells"];
/** a, b: the end vertices for walks; k: the walk length. */
export type GtSpec = { topic: GtTopic; edges: string; layout: GtLayout; a: string; b: string; k: string };

export type GtWords = {
  noEdges: string;
  tooMany: string;
  badEdge: string;
  noNode: string;
  badK: string;
  yes: string;
  no: string;
  props: { vertices: string; edges: string; degrees: string; connected: string; bipartite: string; tree: string; regular: string; simple: string; complete: string };
  components: string;
  oddCycle: string;
  handshake: string;
  treeInfo: string;
  multi: string;
  eulerCircuit: string;
  eulerTrail: string;
  eulerNone: string;
  eulerDisconnected: string;
  eulerInfo: string;
  hamCycle: string;
  hamPath: string;
  hamNone: string;
  hamGaveUp: string;
  dirac: string;
  hamInfo: string;
  chromatic: string;
  greedyWorse: string;
  greedySame: string;
  clique: string;
  colorInfo: string;
  walks: string;
  walkList: string;
  triangles: string;
  walksInfo: string;
  order: string;
  spanning: string;
  cayley: string;
  spanningNone: string;
  spanningShown: string;
  spanningInfo: string;
};

// ---------- families for the presets ----------

const L = "ABCDEFGHIJKLMNOPQRST";
const complete = (n: number) => {
  const out: string[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push(`${L[i]}-${L[j]}`);
  return out.join(", ");
};
const cycle = (n: number) => Array.from({ length: n }, (_, i) => `${L[i]}-${L[(i + 1) % n]}`).join(", ");
const bipartiteK = (m: number, n: number) => {
  const out: string[] = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) out.push(`${L[i]}-${L[m + j]}`);
  return out.join(", ");
};
const PETERSEN = "A-B, B-C, C-D, D-E, E-A, A-F, B-G, C-H, D-I, E-J, F-H, H-J, J-G, G-I, I-F";
const CUBE = "000-001, 001-011, 011-010, 010-000, 100-101, 101-111, 111-110, 110-100, 000-100, 001-101, 011-111, 010-110";
const KONIGSBERG = "A-B, A-B, A-C, A-C, A-D, B-D, C-D";
const HOUSE = "A-B, B-C, C-D, D-A, A-C, B-D, C-E, D-E";
const WHEEL = "H-A, H-B, H-C, H-D, H-E, H-F, A-B, B-C, C-D, D-E, E-F, F-A";
const DODECAHEDRON =
  "1-2, 2-3, 3-4, 4-5, 5-1, 1-6, 2-7, 3-8, 4-9, 5-10, 6-11, 11-7, 7-12, 12-8, 8-13, 13-9, 9-14, 14-10, 10-15, 15-6, 11-16, 12-17, 13-18, 14-19, 15-20, 16-17, 17-18, 18-19, 19-20, 20-16";
const TREE = "A-B, A-C, B-D, B-E, C-F, C-G, E-H";
const MAP = "A-B, A-C, A-D, B-C, B-E, C-D, C-E, C-F, D-F, E-F, E-G, F-G";

const g = (edges: string, layout: GtLayout = "auto") => ({ edges, layout });

export const GT_PRESETS: { [K in GtTopic]: { label: string; spec: GtSpec }[] } = {
  props: [
    { label: "Petersen graph", spec: { topic: "props", ...g(PETERSEN, "shells"), a: "A", b: "B", k: "2" } },
    { label: "K₃,₃", spec: { topic: "props", ...g(bipartiteK(3, 3)), a: "A", b: "D", k: "2" } },
    { label: "Cube Q₃", spec: { topic: "props", ...g(CUBE, "shells"), a: "000", b: "111", k: "3" } },
    { label: "Tree", spec: { topic: "props", ...g(TREE), a: "A", b: "H", k: "2" } },
    { label: "C₅ (odd cycle)", spec: { topic: "props", ...g(cycle(5), "circle"), a: "A", b: "C", k: "2" } },
    { label: "Two components", spec: { topic: "props", ...g("A-B, B-C, C-A, D-E, E-F"), a: "A", b: "B", k: "2" } },
  ],
  euler: [
    { label: "Königsberg bridges", spec: { topic: "euler", ...g(KONIGSBERG), a: "A", b: "B", k: "2" } },
    { label: "House (Nikolaus)", spec: { topic: "euler", ...g(HOUSE), a: "A", b: "B", k: "2" } },
    { label: "K₅", spec: { topic: "euler", ...g(complete(5), "circle"), a: "A", b: "B", k: "2" } },
    { label: "Octahedron", spec: { topic: "euler", ...g("A-B, A-C, A-D, A-E, F-B, F-C, F-D, F-E, B-C, C-D, D-E, E-B"), a: "A", b: "B", k: "2" } },
  ],
  hamilton: [
    { label: "Dodecahedron (icosian game)", spec: { topic: "hamilton", ...g(DODECAHEDRON), a: "1", b: "2", k: "2" } },
    { label: "Cube Q₃", spec: { topic: "hamilton", ...g(CUBE, "shells"), a: "000", b: "111", k: "3" } },
    { label: "Petersen (no cycle)", spec: { topic: "hamilton", ...g(PETERSEN, "shells"), a: "A", b: "B", k: "2" } },
    { label: "Tree (no cycle)", spec: { topic: "hamilton", ...g(TREE), a: "A", b: "H", k: "2" } },
    { label: "K₄,₃", spec: { topic: "hamilton", ...g(bipartiteK(4, 3)), a: "A", b: "E", k: "2" } },
  ],
  color: [
    { label: "Map-like graph", spec: { topic: "color", ...g(MAP), a: "A", b: "B", k: "2" } },
    { label: "Petersen graph", spec: { topic: "color", ...g(PETERSEN, "shells"), a: "A", b: "B", k: "2" } },
    { label: "Wheel W₆", spec: { topic: "color", ...g(WHEEL), a: "H", b: "A", k: "2" } },
    { label: "K₅", spec: { topic: "color", ...g(complete(5), "circle"), a: "A", b: "B", k: "2" } },
    { label: "C₇", spec: { topic: "color", ...g(cycle(7), "circle"), a: "A", b: "B", k: "2" } },
    { label: "Crown graph (greedy trap)", spec: { topic: "color", ...g("U3-V2, V3-U4, U1-V3, U1-V2, V3-U2, V1-U4, U3-V4, V4-U2, U3-V1, V2-U4, V4-U1, V1-U2"), a: "U1", b: "V2", k: "2" } },
  ],
  walks: [
    { label: "Walks A → C of length 3", spec: { topic: "walks", ...g("A-B, B-C, C-D, D-A, A-C"), a: "A", b: "C", k: "3" } },
    { label: "K₄, length 2", spec: { topic: "walks", ...g(complete(4), "circle"), a: "A", b: "B", k: "2" } },
    { label: "C₆, length 4", spec: { topic: "walks", ...g(cycle(6), "circle"), a: "A", b: "A", k: "4" } },
    { label: "Petersen, length 5", spec: { topic: "walks", ...g(PETERSEN, "shells"), a: "A", b: "A", k: "5" } },
  ],
  spanning: [
    { label: "C₄ + diagonal", spec: { topic: "spanning", ...g("A-B, B-C, C-D, D-A, A-C"), a: "A", b: "B", k: "2" } },
    { label: "K₄ (Cayley 4² = 16)", spec: { topic: "spanning", ...g(complete(4), "circle"), a: "A", b: "B", k: "2" } },
    { label: "K₅ (5³ = 125)", spec: { topic: "spanning", ...g(complete(5), "circle"), a: "A", b: "B", k: "2" } },
    { label: "Cube Q₃", spec: { topic: "spanning", ...g(CUBE, "shells"), a: "000", b: "111", k: "3" } },
    { label: "Petersen graph", spec: { topic: "spanning", ...g(PETERSEN, "shells"), a: "A", b: "B", k: "2" } },
  ],
};

const PAL = [
  { fill: "#d0ebff", stroke: C.blue },
  { fill: "#ffe8cc", stroke: C.orange },
  { fill: "#d3f9d8", stroke: C.green },
  { fill: "#f3d9fa", stroke: C.purple },
  { fill: "#ffe3e3", stroke: C.red },
  { fill: "#c5f6fa", stroke: "#0c8599" },
  { fill: "#fff3bf", stroke: "#f08c00" },
  { fill: "#e9ecef", stroke: "#495057" },
];

// ---------- helpers ----------

type G = { nodes: string[]; edges: Edge[]; n: number; idx: Map<string, number>; A: number[][]; nb: number[][]; deg: number[]; simple: boolean };

function build(spec: GtSpec, w: GtWords): G {
  const { nodes, edges } = parseEdges(spec.edges, w, 20, 60);
  const n = nodes.length;
  const idx = new Map(nodes.map((v, i) => [v, i]));
  const A = Array.from({ length: n }, () => Array(n).fill(0));
  for (const e of edges) {
    const [i, j] = [idx.get(e.u)!, idx.get(e.v)!];
    A[i][j]++;
    A[j][i]++;
  }
  const nb = A.map((row) => row.flatMap((c, j) => (c ? [j] : [])));
  const deg = A.map((row) => row.reduce((s, c) => s + c, 0));
  return { nodes, edges, n, idx, A, nb, deg, simple: A.every((row) => row.every((c) => c <= 1)) };
}

function componentsOf(G: G): number[][] {
  const seen = Array(G.n).fill(false);
  const comps: number[][] = [];
  for (let s = 0; s < G.n; s++) {
    if (seen[s]) continue;
    const comp = [s];
    seen[s] = true;
    for (let k = 0; k < comp.length; k++)
      for (const v of G.nb[comp[k]])
        if (!seen[v]) (seen[v] = true), comp.push(v);
    comps.push(comp);
  }
  return comps;
}

/** A proper 2-colouring, or an odd cycle proving there is none. */
function twoColour(G: G): { side: number[] } | { odd: number[] } {
  const side = Array(G.n).fill(-1);
  const parent = Array(G.n).fill(-1);
  for (let s = 0; s < G.n; s++) {
    if (side[s] >= 0) continue;
    side[s] = 0;
    const q = [s];
    for (let k = 0; k < q.length; k++) {
      const u = q[k];
      for (const v of G.nb[u]) {
        if (side[v] < 0) (side[v] = 1 - side[u]), (parent[v] = u), q.push(v);
        else if (side[v] === side[u]) {
          const up = (x: number) => {
            const p = [x];
            while (parent[p[p.length - 1]] >= 0) p.push(parent[p[p.length - 1]]);
            return p;
          };
          const pu = up(u);
          const pv = up(v);
          const lca = pu.find((x) => pv.includes(x))!;
          return { odd: [...pu.slice(0, pu.indexOf(lca) + 1), ...pv.slice(0, pv.indexOf(lca)).reverse()] };
        }
      }
    }
  }
  return { side };
}

/** Edge ids along a vertex cycle/path (first matching edge between consecutive vertices). */
function edgesAlong(G: G, path: number[], closed: boolean): Set<number> {
  const out = new Set<number>();
  const k = closed ? path.length : path.length - 1;
  for (let i = 0; i < k; i++) {
    const [a, b] = [G.nodes[path[i]], G.nodes[path[(i + 1) % path.length]]];
    const e = G.edges.find((e) => !out.has(e.id) && ((e.u === a && e.v === b) || (e.u === b && e.v === a)));
    if (e) out.add(e.id);
  }
  return out;
}

const emptyLook = (): Look => ({ hl: new Set(), fills: new Map(), badge: new Map(), under: new Map() });
const H = 300;
const yes = (w: GtWords, b: boolean) => (b ? w.yes : w.no);

// ---------- topics ----------

function renderProps(spec: GtSpec, w: GtWords): RenderedSvg {
  const G = build(spec, w);
  const look = emptyLook();
  G.nodes.forEach((v, i) => look.under.set(v, `deg ${G.deg[i]}`));
  const comps = componentsOf(G);
  const tc = twoColour(G);
  const E = G.edges.length;
  const connected = comps.length === 1;
  const isTree = connected && E === G.n - 1 && G.simple;
  const regular = G.deg.every((d) => d === G.deg[0]);
  const completeG = G.simple && E === (G.n * (G.n - 1)) / 2;
  const caps: Caption[] = [];
  if ("side" in tc) {
    look.colors = new Map(G.nodes.map((v, i) => [v, PAL[tc.side[i]]]));
  } else {
    look.hl = edgesAlong(G, tc.odd, true);
    look.hlColor = C.red;
    tc.odd.forEach((i) => look.fills.set(G.nodes[i], "min"));
    caps.push({ text: fill(w.oddCycle, { cycle: [...tc.odd, tc.odd[0]].map((i) => G.nodes[i]).join(" – "), k: tc.odd.length }), color: C.red });
  }
  const pic = drawGraph(G.nodes, G.edges, false, false, look, H, { circle: spec.layout === "circle", shells: spec.layout === "shells" });
  const degSeq = G.deg.slice().sort((a, b) => b - a);
  const rows: TRow[] = [
    [w.props.vertices, String(G.n)],
    [w.props.edges, String(E)],
    [w.props.degrees, `(${degSeq.join(", ")})`],
    [w.props.connected, connected ? w.yes : `${w.no} — ${fill(w.components, { c: comps.length })}`],
    [w.props.bipartite, yes(w, "side" in tc)],
    [w.props.tree, yes(w, isTree)],
    [w.props.regular, regular ? `${w.yes} (${G.deg[0]})` : w.no],
    [w.props.simple, yes(w, G.simple)],
    [w.props.complete, yes(w, completeG)],
  ].map(([k, v]) => ({ cells: [k, v], bold: [true, false], colors: [C.ink, v === w.yes || v.startsWith(w.yes) ? C.green : v === w.no || v.startsWith(w.no) ? C.grey : C.blue] }));
  const tb = table((W - 440) / 2, H + 10, [{ head: "", w: 200 }, { head: "", w: 240 }], rows, 22);
  caps.unshift({ text: fill(w.handshake, { s: G.deg.reduce((a, b) => a + b, 0), e: E }), color: C.blue });
  if (isTree) caps.push({ text: w.treeInfo, color: C.green });
  if (!G.simple) caps.push({ text: w.multi, color: "#495057" });
  const tex = `\\sum_{v} \\deg v = ${G.deg.length <= 12 ? G.deg.join(" + ") + " = " : ""}${G.deg.reduce((a, b) => a + b, 0)} = 2 \\cdot ${E}`;
  return compose(tex, pic + tb.svg, H + 10 + tb.h, caps);
}

function renderEuler(spec: GtSpec, w: GtWords): RenderedSvg {
  const G = build(spec, w);
  const look = emptyLook();
  G.nodes.forEach((v, i) => look.under.set(v, `deg ${G.deg[i]}`));
  const odd = G.deg.flatMap((d, i) => (d % 2 ? [i] : []));
  const comps = componentsOf(G);
  const caps: Caption[] = [];
  let tex: string;
  if (comps.length > 1) {
    caps.push({ text: fill(w.eulerDisconnected, { c: comps.length }), color: C.red });
    tex = G.nodes.join(",\\ ");
  } else if (odd.length !== 0 && odd.length !== 2) {
    odd.forEach((i) => look.fills.set(G.nodes[i], "min"));
    caps.push({ text: fill(w.eulerNone, { c: odd.length, list: odd.map((i) => G.nodes[i]).join(", ") }), color: C.red });
    tex = odd.map((i) => `\\deg ${G.nodes[i]} = ${G.deg[i]}`).join(",\\ ");
  } else {
    // Hierholzer: walk until stuck, splicing in sub-circuits.
    const adj: { to: number; id: number }[][] = Array.from({ length: G.n }, () => []);
    for (const e of G.edges) {
      const [i, j] = [G.idx.get(e.u)!, G.idx.get(e.v)!];
      adj[i].push({ to: j, id: e.id });
      adj[j].push({ to: i, id: e.id });
    }
    adj.forEach((l) => l.sort((a, b) => a.to - b.to));
    const used = new Set<number>();
    const start = odd.length ? odd[0] : 0;
    const stack: { v: number; id: number }[] = [{ v: start, id: -1 }];
    const trail: { v: number; id: number }[] = [];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const next = adj[top.v].find((x) => !used.has(x.id));
      if (next) {
        used.add(next.id);
        stack.push({ v: next.to, id: next.id });
      } else trail.push(stack.pop()!);
    }
    trail.reverse();
    trail.slice(1).forEach((t, k) => {
      look.hl.add(t.id);
      look.edgeLabel = look.edgeLabel ?? new Map();
      look.edgeLabel.set(t.id, String(k + 1));
    });
    const seq = trail.map((t) => G.nodes[t.v]);
    look.colors = new Map([[seq[0], PAL[2]]]);
    if (seq[seq.length - 1] !== seq[0]) look.colors.set(seq[seq.length - 1], PAL[1]);
    caps.push({ text: fill(odd.length ? w.eulerTrail : w.eulerCircuit, { a: seq[0], b: seq[seq.length - 1], e: G.edges.length }), color: C.green });
    tex = seq.join(" \\to ");
  }
  caps.push({ text: w.eulerInfo, color: "#495057" });
  const pic = drawGraph(G.nodes, G.edges, false, false, look, H, { circle: spec.layout === "circle", shells: spec.layout === "shells" });
  return compose(tex, pic, H, caps);
}

function renderHamilton(spec: GtSpec, w: GtWords): RenderedSvg {
  const G = build(spec, w);
  const look = emptyLook();
  const n = G.n;
  let steps = 0;
  const CAP = 3e6;
  let gaveUp = false;
  const search = (closed: boolean, start: number): number[] | null => {
    const path = [start];
    const on = Array(n).fill(false);
    on[start] = true;
    const rec = (): boolean => {
      if (++steps > CAP) return (gaveUp = true), false;
      const u = path[path.length - 1];
      if (path.length === n) return !closed || G.A[u][start] > 0;
      for (const v of G.nb[u]) {
        if (on[v]) continue;
        on[v] = true;
        path.push(v);
        if (rec()) return true;
        path.pop();
        on[v] = false;
        if (gaveUp) return false;
      }
      return false;
    };
    return rec() ? path : null;
  };
  let found: number[] | null = n >= 3 ? search(true, 0) : null;
  const closed = !!found;
  if (!found && !gaveUp) for (let s = 0; s < n && !found && !gaveUp; s++) found = search(false, s);
  const caps: Caption[] = [];
  let tex: string;
  if (found) {
    look.hl = edgesAlong(G, found, closed);
    found.forEach((v, i) => look.badge.set(G.nodes[v], String(i + 1)));
    look.colors = new Map([[G.nodes[found[0]], PAL[2]]]);
    const seq = found.map((v) => G.nodes[v]);
    tex = (closed ? [...seq, seq[0]] : seq).join(" \\to ");
    caps.push({ text: fill(closed ? w.hamCycle : w.hamPath, { n }), color: C.green });
  } else if (gaveUp) {
    tex = `n = ${n}`;
    caps.push({ text: w.hamGaveUp, color: C.orange });
  } else {
    tex = `n = ${n}`;
    caps.push({ text: w.hamNone, color: C.red });
  }
  const minDeg = Math.min(...G.deg);
  if (n >= 3 && G.simple && minDeg >= n / 2) caps.push({ text: fill(w.dirac, { d: minDeg, n }), color: C.blue });
  caps.push({ text: w.hamInfo, color: "#495057" });
  const pic = drawGraph(G.nodes, G.edges, false, false, look, H, { circle: spec.layout === "circle", shells: spec.layout === "shells" });
  return compose(tex, pic, H, caps);
}

function renderColor(spec: GtSpec, w: GtWords): RenderedSvg {
  const G = build(spec, w);
  const n = G.n;
  // Welsh–Powell greedy: largest degree first, smallest colour that is free.
  const order = G.nodes.map((_, i) => i).sort((a, b) => G.deg[b] - G.deg[a] || a - b);
  const greedy = Array(n).fill(-1);
  for (const u of order) {
    const taken = new Set(G.nb[u].map((v) => greedy[v]));
    let c = 0;
    while (taken.has(c)) c++;
    greedy[u] = c;
  }
  const gCount = Math.max(...greedy) + 1;
  // Largest clique (a lower bound for χ).
  let clique: number[] = [];
  const grow = (cur: number[], cand: number[]) => {
    if (cur.length > clique.length) clique = cur;
    for (let i = 0; i < cand.length; i++) {
      if (cur.length + cand.length - i <= clique.length) return;
      const v = cand[i];
      grow([...cur, v], cand.slice(i + 1).filter((u) => G.A[v][u] > 0));
    }
  };
  grow([], G.nodes.map((_, i) => i));
  // Exact colouring with k colours by backtracking, from the clique size up.
  const tryK = (k: number): number[] | null => {
    const col = Array(n).fill(-1);
    let steps = 0;
    const rec = (i: number): boolean => {
      if (++steps > 2e6) return false;
      if (i === n) return true;
      const u = order[i];
      const taken = new Set(G.nb[u].map((v) => col[v]));
      for (let c = 0; c < k; c++) {
        if (taken.has(c)) continue;
        col[u] = c;
        if (rec(i + 1)) return true;
        col[u] = -1;
      }
      return false;
    };
    return rec(0) ? col : null;
  };
  let chi = gCount;
  let best = greedy;
  for (let k = Math.max(1, clique.length); k < gCount; k++) {
    const col = tryK(k);
    if (col) {
      chi = k;
      best = col;
      break;
    }
  }
  const look = emptyLook();
  look.colors = new Map(G.nodes.map((v, i) => [v, PAL[best[i] % PAL.length]]));
  look.badge = new Map(G.nodes.map((v, i) => [v, String(best[i] + 1)]));
  if (clique.length >= 3) {
    look.hl = edgesAlong(G, clique, true);
    if (clique.length > 3) for (let i = 0; i < clique.length; i++) for (let j = i + 1; j < clique.length; j++) edgesAlong(G, [clique[i], clique[j]], false).forEach((id) => look.hl.add(id));
    look.hlColor = C.red;
  }
  const caps: Caption[] = [{ text: fill(w.chromatic, { k: chi }), color: C.green }];
  caps.push({ text: fill(gCount > chi ? w.greedyWorse : w.greedySame, { g: gCount, k: chi }), color: gCount > chi ? C.orange : "#495057" });
  if (clique.length >= 3) caps.push({ text: fill(w.clique, { k: clique.length, list: clique.map((i) => G.nodes[i]).join(", ") }), color: C.red });
  caps.push({ text: w.colorInfo, color: "#495057" });
  const pic = drawGraph(G.nodes, G.edges, false, false, look, H, { circle: spec.layout === "circle", shells: spec.layout === "shells" });
  return compose(`\\chi(G) = ${chi}${clique.length >= 3 ? `, \\qquad \\omega(G) = ${clique.length}` : ""}`, pic, H, caps);
}

const pmatrix = (M: (bigint | number)[][], mark?: [number, number]) =>
  `\\begin{pmatrix} ${M.map((row, i) => row.map((v, j) => (mark && mark[0] === i && mark[1] === j ? `\\color{red}{\\mathbf{${v}}}` : String(v))).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;

function renderWalks(spec: GtSpec, w: GtWords): RenderedSvg {
  const G = build(spec, w);
  const k = Number(spec.k.trim());
  if (!Number.isInteger(k) || k < 0 || k > 12) throw new Error(fill(w.badK, { s: spec.k }));
  for (const v of [spec.a.trim(), spec.b.trim()]) if (!G.idx.has(v)) throw new Error(fill(w.noNode, { v }));
  const [a, b] = [G.idx.get(spec.a.trim())!, G.idx.get(spec.b.trim())!];
  const A = G.A.map((r) => r.map(BigInt));
  let P: bigint[][] = G.A.map((_, i) => G.A.map((_, j) => (i === j ? 1n : 0n)));
  const mul = (X: bigint[][], Y: bigint[][]) => X.map((row) => Y[0].map((_, j) => row.reduce((s, x, t) => s + x * Y[t][j], 0n)));
  for (let i = 0; i < k; i++) P = mul(P, A);
  const count = P[a][b];
  const look = emptyLook();
  look.colors = new Map([
    [G.nodes[a], PAL[2]],
    [G.nodes[b], a === b ? PAL[2] : PAL[1]],
  ]);
  const pic = drawGraph(G.nodes, G.edges, false, false, look, H, { circle: spec.layout === "circle", shells: spec.layout === "shells" });
  const parts = [pic];
  let y = H + 10;
  if (G.n <= 10) {
    const s = G.n > 7 ? 0.7 : 0.85;
    const t1 = texAt(`A = ${pmatrix(G.A)}`, W / 4 + 8, y + 12 + G.n * 11 * s, "middle", s);
    const t2 = texAt(`A^{${k}} = ${pmatrix(P, [a, b])}`, (3 * W) / 4 - 8, y + 12 + G.n * 11 * s, "middle", s);
    parts.push(t1.svg, t2.svg);
    y += 24 + G.n * 22 * s + 10;
  }
  const caps: Caption[] = [{ text: fill(w.walks, { c: String(count), k, a: G.nodes[a], b: G.nodes[b] }), color: C.green }];
  if (G.simple && count > 0n && count <= 16n && k <= 6) {
    const out: string[] = [];
    const rec = (path: number[]) => {
      if (path.length === k + 1) return void (path[k] === b && out.push(path.map((i) => G.nodes[i]).join("")));
      for (const v of G.nb[path[path.length - 1]]) rec([...path, v]);
    };
    rec([a]);
    caps.push({ text: fill(w.walkList, { list: out.join(", ") }), color: C.blue });
  }
  if (G.simple) {
    const A3 = mul(mul(A, A), A);
    const tri = A3.reduce((s, row, i) => s + row[i], 0n) / 6n;
    caps.push({ text: fill(w.triangles, { t: String(tri) }), color: "#495057" });
  }
  caps.push({ text: fill(w.order, { list: G.nodes.join(", ") }), color: "#495057" });
  caps.push({ text: w.walksInfo, color: "#495057" });
  return compose(`\\left(A^{${k}}\\right)_{${G.nodes[a]},\\,${G.nodes[b]}} = ${count}`, parts.join(""), y, caps);
}

/** Integer determinant by Bareiss elimination (exact, no fractions). */
function detBareiss(M: bigint[][]): bigint {
  const n = M.length;
  if (!n) return 1n;
  const a = M.map((r) => r.slice());
  let sign = 1n;
  let prev = 1n;
  for (let k = 0; k < n - 1; k++) {
    if (a[k][k] === 0n) {
      const p = a.findIndex((r, i) => i > k && r[k] !== 0n);
      if (p < 0) return 0n;
      [a[k], a[p]] = [a[p], a[k]];
      sign = -sign;
    }
    for (let i = k + 1; i < n; i++)
      for (let j = k + 1; j < n; j++) a[i][j] = (a[i][j] * a[k][k] - a[i][k] * a[k][j]) / prev;
    prev = a[k][k];
  }
  return sign * a[n - 1][n - 1];
}

function renderSpanning(spec: GtSpec, w: GtWords): RenderedSvg {
  const G = build(spec, w);
  const n = G.n;
  const Lap = G.A.map((row, i) => row.map((c, j) => BigInt(i === j ? G.deg[i] : -c)));
  const reduced = Lap.slice(1).map((r) => r.slice(1));
  const tau = detBareiss(reduced);
  const look = emptyLook();
  const pos = layoutGraph(G.nodes, G.edges, H, { circle: spec.layout === "circle", shells: spec.layout === "shells" });
  // One spanning tree (BFS) highlighted in the main picture.
  if (tau > 0n) {
    const seen = new Set([0]);
    const q = [0];
    for (let k = 0; k < q.length; k++)
      for (const v of G.nb[q[k]])
        if (!seen.has(v)) {
          seen.add(v);
          q.push(v);
          edgesAlong(G, [q[k], v], false).forEach((id) => look.hl.add(id));
        }
    look.hlColor = C.green;
  }
  const parts = [drawGraph(G.nodes, G.edges, false, false, look, H, {}, pos)];
  let y = H + 10;
  if (n <= 10) {
    const s = n > 7 ? 0.7 : 0.85;
    parts.push(texAt(`L = D - A = ${pmatrix(Lap)}`, W / 2, y + 12 + n * 11 * s, "middle", s).svg);
    y += 24 + n * 22 * s + 10;
  }
  const caps: Caption[] = [];
  if (tau === 0n) caps.push({ text: w.spanningNone, color: C.red });
  else caps.push({ text: fill(w.spanning, { t: String(tau) }), color: C.green });
  const completeG = G.simple && G.edges.length === (n * (n - 1)) / 2;
  if (completeG && n >= 2) caps.push({ text: fill(w.cayley, { n, e: String(n - 2).replace(/d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]), t: String(BigInt(n) ** BigInt(Math.max(0, n - 2))) }), color: C.blue });
  // Draw every spanning tree when there are only a few.
  if (tau > 0n && tau <= 20n && G.edges.length <= 18 && n >= 2) {
    const trees: number[][] = [];
    const E = G.edges;
    const pick = (start: number, chosen: number[]) => {
      if (chosen.length === n - 1) {
        const parent = G.nodes.map((_, i) => i);
        const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
        for (const id of chosen) {
          const [u, v] = [find(G.idx.get(E[id].u)!), find(G.idx.get(E[id].v)!)];
          if (u === v) return;
          parent[u] = v;
        }
        trees.push(chosen);
        return;
      }
      for (let i = start; i <= E.length - (n - 1 - chosen.length); i++) pick(i + 1, [...chosen, i]);
    };
    pick(0, []);
    const xs = [...pos.values()].map((p) => p[0]);
    const ys = [...pos.values()].map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const tw = 112;
    const th = 84;
    const perRow = Math.floor((W - 32) / (tw + 8));
    const sc = Math.min((tw - 16) / Math.max(1, x1 - x0), (th - 16) / Math.max(1, y1 - y0));
    const rows = Math.ceil(trees.length / perRow);
    trees.forEach((t, i) => {
      const inRow = Math.min(perRow, trees.length - Math.floor(i / perRow) * perRow);
      const bx = (W - inRow * (tw + 8) + 8) / 2 + (i % perRow) * (tw + 8);
      const by = y + Math.floor(i / perRow) * (th + 8);
      const px = (p: [number, number]) => [bx + 8 + (p[0] - x0) * sc + (tw - 16 - (x1 - x0) * sc) / 2, by + 8 + (p[1] - y0) * sc + (th - 16 - (y1 - y0) * sc) / 2];
      parts.push(`<rect x="${r2(bx)}" y="${r2(by)}" width="${tw}" height="${th}" rx="6" fill="#f8f9fa" stroke="#dee2e6"/>`);
      for (const e of E) {
        const on = t.includes(e.id);
        const [ax, ay] = px(pos.get(e.u)!);
        const [cx, cy] = px(pos.get(e.v)!);
        parts.push(`<line x1="${r2(ax)}" y1="${r2(ay)}" x2="${r2(cx)}" y2="${r2(cy)}" stroke="${on ? C.green : "#e9ecef"}" stroke-width="${on ? 2.6 : 1}"/>`);
      }
      for (const v of G.nodes) {
        const [vx, vy] = px(pos.get(v)!);
        parts.push(`<circle cx="${r2(vx)}" cy="${r2(vy)}" r="3.2" fill="${C.ink}"/>`);
      }
    });
    y += rows * (th + 8) + 4;
    caps.push({ text: fill(w.spanningShown, { t: trees.length }), color: C.blue });
  }
  caps.push({ text: w.spanningInfo, color: "#495057" });
  return compose(`\\tau(G) = \\det L_{\\hat{1}} = ${tau}`, parts.join(""), y, caps);
}

export function renderGt(spec: GtSpec, words: GtWords): RenderedSvg {
  switch (spec.topic) {
    case "props":
      return renderProps(spec, words);
    case "euler":
      return renderEuler(spec, words);
    case "hamilton":
      return renderHamilton(spec, words);
    case "color":
      return renderColor(spec, words);
    case "walks":
      return renderWalks(spec, words);
    case "spanning":
      return renderSpanning(spec, words);
  }
}
