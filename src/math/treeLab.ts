// The decision-tree lab: labelled points on a plane cut by straight splits, each across one feature (x < t or y < t)
// inside one region, so a tree draws boxes. Every box calls its points by their majority. The player grows a tree by
// hand first: tap a box, pick the feature, slide the cut, and see how much the impurity (Gini or entropy) falls, then
// split. Later puzzles grow the tree greedily to a depth, where a deep tree follows every noisy point and does worse
// on test points kept out, and a forest, many trees on resampled points voting together, is steadier than one. Kept
// free of React so it can be tested on its own.
import type { GameBase } from "./ladder";
import { rng } from "./random";
import { nf } from "./text";

/** A labelled point in the unit square, its coordinates in hundredths: class 1 (orange) or 0 (blue), and whether it is kept for testing. */
export type TPoint = { x: number; y: number; c: 0 | 1; test?: boolean };
/** Split on one line, two overlapping blobs, one class in a corner, and the two classes crossed (exclusive or). */
export type TreeData = "line" | "blobs" | "corner" | "xor";
export const FREE_DATA = ["blobs", "corner", "xor"] as const;
export type Measure = "gini" | "entropy";
export const MEASURES: Measure[] = ["gini", "entropy"];
export type Axis = 0 | 1;

const normal = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const hund = (v: number) => Math.round(Math.min(0.98, Math.max(0.02, v)) * 100) / 100;

/** The points of a dataset: the training points first, then any test points. */
export function pointsOf(data: TreeData, seed: number): TPoint[] {
  const r = rng(seed * 37 + data.length * 5);
  const out: TPoint[] = [];
  // Uniform points with a class by rule, away from the rule's edges so a clean cut exists.
  const ruled = (n: number, rule: (x: number, y: number) => 0 | 1 | null) => {
    while (out.length < n) {
      const [x, y] = [hund(r()), hund(r())];
      const c = rule(x, y);
      if (c !== null) out.push({ x, y, c });
    }
  };
  const near = (v: number) => Math.abs(v - 0.5) < 0.05;
  if (data === "line") ruled(36, (x) => (Math.abs(x - 0.6) < 0.05 ? null : x > 0.6 ? 1 : 0));
  else if (data === "corner") ruled(50, (x, y) => (near(x) || near(y) ? null : x > 0.5 && y > 0.5 ? 1 : 0));
  else if (data === "xor") ruled(48, (x, y) => (near(x) || near(y) ? null : (x > 0.5) !== (y > 0.5) ? 1 : 0));
  else {
    const blob = (c: 0 | 1, n: number, test: boolean) => {
      const [mx, my] = c ? [0.62, 0.6] : [0.38, 0.4];
      for (let i = 0; i < n; i++) out.push({ x: hund(mx + 0.16 * normal(r)), y: hund(my + 0.16 * normal(r)), c, ...(test ? { test } : {}) });
    };
    blob(1, 30, false);
    blob(0, 30, false);
    blob(1, 30, true);
    blob(0, 30, true);
  }
  return out;
}
export const trainOf = (ps: TPoint[]) => ps.filter((p) => !p.test);
export const testOf = (ps: TPoint[]) => ps.filter((p) => p.test);
const coord = (p: { x: number; y: number }, a: Axis) => (a ? p.y : p.x);

/** How mixed a box is: Gini 1 − Σ p², or entropy −Σ p log₂ p (in bits); 0 for a pure box or an empty one. */
export function impurity(n0: number, n1: number, m: Measure): number {
  const n = n0 + n1;
  if (!n) return 0;
  const ps = [n0 / n, n1 / n];
  return m === "gini" ? 1 - ps.reduce((s, p) => s + p * p, 0) : -ps.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
}
export const counts = (ps: TPoint[]): [number, number] => [ps.filter((p) => !p.c).length, ps.filter((p) => p.c).length];
/** The fall in impurity from a box to its two halves, each weighted by its share of the points. */
export function gain(ps: TPoint[], axis: Axis, t: number, m: Measure): number {
  if (!ps.length) return 0;
  const left = ps.filter((p) => coord(p, axis) < t);
  const right = ps.filter((p) => coord(p, axis) >= t);
  const [c, l, rr] = [counts(ps), counts(left), counts(right)];
  return impurity(c[0], c[1], m) - (left.length / ps.length) * impurity(l[0], l[1], m) - (right.length / ps.length) * impurity(rr[0], rr[1], m);
}
/** The split that lowers the impurity most: every cut half-way between two neighbouring values, on either feature. */
export function bestSplit(ps: TPoint[], m: Measure, axes: Axis[] = [0, 1]): { axis: Axis; t: number; gain: number } | null {
  let best: { axis: Axis; t: number; gain: number } | null = null;
  for (const axis of axes) {
    const vs = [...new Set(ps.map((p) => coord(p, axis)))].sort((a, b) => a - b);
    for (let i = 1; i < vs.length; i++) {
      const t = Math.round(((vs[i - 1] + vs[i]) / 2) * 1000) / 1000;
      const g = gain(ps, axis, t, m);
      if (!best || g > best.gain + 1e-12) best = { axis, t, gain: g };
    }
  }
  return best;
}

// ---------- trees ----------

/** A split made by hand: the box it cuts (its path from the top: L for the < side, R for the ≥ side), the feature and the cut. */
export type Split = { path: string; axis: Axis; t: number };
export type Box = { x0: number; x1: number; y0: number; y1: number };
export type TreeNode = { path: string; box: Box; n: [number, number]; split?: { axis: Axis; t: number }; kids?: [TreeNode, TreeNode] };
const WHOLE: Box = { x0: 0, x1: 1, y0: 0, y1: 1 };
const halves = (b: Box, axis: Axis, t: number): [Box, Box] => (axis ? [{ ...b, y1: t }, { ...b, y0: t }] : [{ ...b, x1: t }, { ...b, x0: t }]);

/** The tree that hand-made splits make; a split whose box is missing (its parent was never split) is left out. */
export function treeOf(splits: Split[], train: TPoint[]): TreeNode {
  const grow = (path: string, box: Box, ps: TPoint[]): TreeNode => {
    const node: TreeNode = { path, box, n: counts(ps) };
    const s = splits.find((q) => q.path === path);
    if (!s) return node;
    const [bl, br] = halves(box, s.axis, s.t);
    node.split = { axis: s.axis, t: s.t };
    node.kids = [grow(path + "L", bl, ps.filter((p) => coord(p, s.axis) < s.t)), grow(path + "R", br, ps.filter((p) => coord(p, s.axis) >= s.t))];
    return node;
  };
  return grow("", WHOLE, train);
}
/** A tree grown greedily: each box split the best way until it is pure, too small or at the depth. A forest's trees may
 * pick one feature at random for each box (`pick`). */
export function grow(train: TPoint[], depth: number, m: Measure, pick?: () => number): TreeNode {
  const go = (path: string, box: Box, ps: TPoint[]): TreeNode => {
    const node: TreeNode = { path, box, n: counts(ps) };
    if (path.length >= depth || ps.length < 2 || !node.n[0] || !node.n[1]) return node;
    const b = bestSplit(ps, m, pick ? [pick() < 0.5 ? 0 : 1] : [0, 1]);
    if (!b || b.gain <= 1e-12) return node;
    const [bl, br] = halves(box, b.axis, b.t);
    node.split = { axis: b.axis, t: b.t };
    node.kids = [go(path + "L", bl, ps.filter((p) => coord(p, b.axis) < b.t)), go(path + "R", br, ps.filter((p) => coord(p, b.axis) >= b.t))];
    return node;
  };
  return go("", WHOLE, train);
}
export function leafAt(t: TreeNode, p: { x: number; y: number }): TreeNode {
  let n = t;
  while (n.split && n.kids) n = coord(p, n.split.axis) < n.split.t ? n.kids[0] : n.kids[1];
  return n;
}
/** A box's call: its majority, orange on a tie. */
export const callOf = (n: TreeNode): 0 | 1 => (n.n[1] >= n.n[0] ? 1 : 0);
export const leaves = (t: TreeNode): TreeNode[] => (t.kids ? [...leaves(t.kids[0]), ...leaves(t.kids[1])] : [t]);
export const depthOf = (t: TreeNode): number => (t.kids ? 1 + Math.max(depthOf(t.kids[0]), depthOf(t.kids[1])) : 0);
export const findNode = (t: TreeNode, path: string): TreeNode | null => {
  if (t.path === path) return t;
  if (!t.kids || !path.startsWith(t.path)) return null;
  return findNode(t.kids[path[t.path.length] === "L" ? 0 : 1], path);
};

export const FOREST_DEPTH = 8;
const forestMemo = new Map<string, TreeNode[]>();
/** Many trees, each grown to FOREST_DEPTH on a resample of the training points (drawn with replacement) and picking one
 * feature at random for each box. */
export function forestOf(train: TPoint[], size: number, m: Measure, seed: number): TreeNode[] {
  const key = `${seed}|${size}|${m}|${train.map((p) => `${p.x},${p.y},${p.c}`).join(";")}`;
  const hit = forestMemo.get(key);
  if (hit) return hit;
  const r = rng(seed * 101 + size);
  const trees = Array.from({ length: size }, () => grow(Array.from({ length: train.length }, () => train[Math.floor(r() * train.length)]), FOREST_DEPTH, m, r));
  if (forestMemo.size > 40) forestMemo.clear();
  forestMemo.set(key, trees);
  return trees;
}
/** The share of a forest's trees calling a point orange. */
export const forestVote = (trees: TreeNode[], p: { x: number; y: number }) => trees.filter((t) => callOf(leafAt(t, p))).length / trees.length;

/** A model: one tree, or a forest voting (orange when at least half its trees say so). */
export type Model = { tree: TreeNode } | { forest: TreeNode[] };
export const predict = (mdl: Model, p: { x: number; y: number }): 0 | 1 => ("tree" in mdl ? callOf(leafAt(mdl.tree, p)) : forestVote(mdl.forest, p) >= 0.5 ? 1 : 0);
export function accuracy(mdl: Model, ps: TPoint[]): number {
  return ps.length ? ps.filter((p) => predict(mdl, p) === p.c).length / ps.length : NaN;
}

// ---------- the puzzles ----------

export type TreeGoal =
  | { kind: "pure"; leaves: number }
  | { kind: "bestRoot" }
  | { kind: "bestDepth" }
  | { kind: "forest"; min: number };
export type TreeControl = "split" | "measure" | "depth" | "forest";
export type TreeNotice = "pure" | "greedy" | "boxes" | "xor" | "deep" | "forest";
export const TREE_NOTICES: TreeNotice[] = ["pure", "greedy", "boxes", "xor", "deep", "forest"];
/** A puzzle: its data (and their seed), where it starts, what the player may change, what it asks and what it shows when won. */
export type TreePuzzle = { data: TreeData; seed: number; start: Partial<LiveTree>; controls: TreeControl[]; goal: TreeGoal; notice: TreeNotice };
const BASE: Partial<LiveTree> = { splits: [], sel: "", axis: 1, t: 0.5, measure: "gini", depth: 0, trees: 1 };
export const TREE_LADDER: TreePuzzle[] = [
  { data: "line", seed: 1, start: { ...BASE }, controls: ["split"], goal: { kind: "pure", leaves: 2 }, notice: "pure" },
  { data: "blobs", seed: 3, start: { ...BASE }, controls: ["split"], goal: { kind: "bestRoot" }, notice: "greedy" },
  { data: "corner", seed: 1, start: { ...BASE, axis: 0 }, controls: ["split"], goal: { kind: "pure", leaves: 3 }, notice: "boxes" },
  { data: "xor", seed: 3, start: { ...BASE, axis: 0 }, controls: ["split"], goal: { kind: "pure", leaves: 4 }, notice: "xor" },
  { data: "blobs", seed: 3, start: { ...BASE, depth: 10 }, controls: ["depth"], goal: { kind: "bestDepth" }, notice: "deep" },
  { data: "blobs", seed: 13, start: { ...BASE, depth: FOREST_DEPTH, trees: 1 }, controls: ["forest"], goal: { kind: "forest", min: 0.85 }, notice: "forest" },
];
export const DEPTH_MAX = 10;
export const FOREST_SIZES = [1, 3, 10, 30, 100];

export type TreeSlip = "noSplit" | "impure" | "tooMany" | "notBest" | "notBestDepth" | "forestLow";
export type TreeVerdict = { state: "won" } | { state: "lost"; why: TreeSlip; have: number; want: number };

/** The game's state: the hand-made splits, the box picked and the cut being tried in it, or a grown tree's depth (0: by
 * hand) and how many trees vote. */
export type LiveTree = GameBase<TreeNotice, { kind: "wrong"; why: TreeSlip }> & {
  mode: "puzzle" | "free";
  splits: Split[];
  /** The box picked (a leaf's path), or null. */
  sel: string | null;
  axis: Axis;
  t: number;
  measure: Measure;
  depth: number;
  trees: number;
  data: TreeData;
  seed: number;
  tries: number;
  done: boolean;
};
export const TREE_START: LiveTree = { mode: "puzzle", stage: 0, splits: [], sel: "", axis: 1, t: 0.5, measure: "gini", depth: 0, trees: 1, data: "blobs", seed: 1, tries: 0, done: false, said: null };
export const treePuzzle = (d: Pick<LiveTree, "mode" | "stage">) => (d.mode === "puzzle" ? TREE_LADDER[d.stage] : null);
export const treePoints = (d: LiveTree) => {
  const p = treePuzzle(d);
  return p ? pointsOf(p.data, p.seed) : pointsOf(d.data, d.seed);
};
export const controlsOf = (d: LiveTree): TreeControl[] => treePuzzle(d)?.controls ?? ["split", "measure", "depth", "forest"];
export const treeStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
/** What the state shows: the hand-made tree (depth 0), a grown tree, or a forest. */
export function modelOf(d: LiveTree, train: TPoint[]): Model {
  if (!d.depth) return { tree: treeOf(d.splits, train) };
  if (d.trees > 1) return { forest: forestOf(train, d.trees, d.measure, treePuzzle(d)?.seed ?? d.seed) };
  return { tree: grow(train, d.depth, d.measure) };
}
/** Cuts move in steps of 0.005, so one can fall half-way between any two neighbouring values (in hundredths). */
export const snapT = (t: number) => Math.round(Math.min(1, Math.max(0, t)) * 200) / 200;

/** The best test accuracy any depth from 1 to DEPTH_MAX reaches. */
export function bestDepthAcc(ps: TPoint[], m: Measure): number {
  const [train, test] = [trainOf(ps), testOf(ps)];
  return Math.max(...Array.from({ length: DEPTH_MAX }, (_, i) => accuracy({ tree: grow(train, i + 1, m) }, test)));
}

export function judgeTree(d: LiveTree, g: TreeGoal): TreeVerdict {
  const ps = treePoints(d);
  const [train, test] = [trainOf(ps), testOf(ps)];
  const lost = (why: TreeSlip, have: number, want: number): TreeVerdict => ({ state: "lost", why, have, want });
  switch (g.kind) {
    case "pure": {
      const tree = treeOf(d.splits, train);
      const ls = leaves(tree);
      if (ls.length < 2) return lost("noSplit", 0, 1);
      const wrong = ls.reduce((s, l) => s + Math.min(l.n[0], l.n[1]), 0);
      if (wrong) return lost("impure", wrong, 0);
      return ls.length <= g.leaves ? { state: "won" } : lost("tooMany", ls.length, g.leaves);
    }
    case "bestRoot": {
      const root = treeOf(d.splits, train);
      if (!root.split) return lost("noSplit", 0, 1);
      const [have, best] = [gain(train, root.split.axis, root.split.t, d.measure), bestSplit(train, d.measure)!.gain];
      return have >= best - 1e-9 ? { state: "won" } : lost("notBest", have, best);
    }
    case "bestDepth": {
      const [have, best] = [accuracy(modelOf(d, train), test), bestDepthAcc(ps, d.measure)];
      return have >= best - 1e-9 ? { state: "won" } : lost("notBestDepth", have, best);
    }
    case "forest": {
      const have = accuracy(modelOf(d, train), test);
      return have >= g.min - 1e-9 ? { state: "won" } : lost("forestLow", have, g.min);
    }
  }
}

// ---------- the picture ----------

export const TREE_PLOT = { w: 640, h: 446 };
export const PLANE = { left: 44, top: 24, size: 390 };
const SIDE = { left: 458, w: 170 };
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const RED = "#e03131";
const GREY = "#868e96";
const INK = "#1e1e1e";
const COLOURS = [BLUE, ORANGE];
const r2 = (v: number) => Math.round(v * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type TextStyle = { size?: number; fill?: string; bold?: boolean; anchor?: "start" | "middle" | "end" };
const txt = (x: number, y: number, s: string, o: TextStyle = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 12}" fill="${o.fill ?? "#495057"}"${o.bold ? ` font-weight="700"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
export const num = (v: number) => (Number.isFinite(v) ? nf(v, 3) : "—");
/** A colour mixed with white: a of the colour. */
const tint = (hex: string, a: number) => `rgb(${[1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * a)).join(",")})`;

export const toPx = (x: number, y: number): [number, number] => [PLANE.left + x * PLANE.size, PLANE.top + (1 - y) * PLANE.size];
export const fromPx = (px: number, py: number): [number, number] => [
  Math.min(1, Math.max(0, (px - PLANE.left) / PLANE.size)),
  Math.min(1, Math.max(0, 1 - (py - PLANE.top) / PLANE.size)),
];
const AXIS_NAMES = ["x", "y"];
export const cutText = (axis: Axis, t: number) => `${AXIS_NAMES[axis]} < ${nf(t, 3)}`;

export type TreeWords = {
  box: string; cut: string; after: string; fall: string; best: string; treeSize: string; depthIs: string;
  train: string; test: string; forest: string; tapBox: string; measures: { gini: string; entropy: string };
};

/**
 * The plane: every box shaded by its call (a forest: by the share of trees saying orange), the cuts as lines, the box
 * picked outlined with the cut being tried dashed across it, the training points (orange filled, blue hollow) and test
 * points as small squares (ringed red when called wrong). Beside it: the box picked and how its impurity falls with the
 * cut, the tree drawn small, and the accuracies.
 */
export function treeSvg(d: LiveTree, w: TreeWords, showBest: boolean): string {
  const ps = treePoints(d);
  const [train, test] = [trainOf(ps), testOf(ps)];
  const mdl = modelOf(d, train);
  let out = `<rect x="${PLANE.left}" y="${PLANE.top}" width="${PLANE.size}" height="${PLANE.size}" fill="#fff" stroke="#dee2e6"/>`;
  const boxRect = (b: Box, fill: string, extra = "") => {
    const [x0, y1] = toPx(b.x0, b.y1);
    const [x1, y0] = toPx(b.x1, b.y0);
    return `<rect x="${r2(x0)}" y="${r2(y1)}" width="${r2(x1 - x0)}" height="${r2(y0 - y1)}" fill="${fill}"${extra}/>`;
  };
  if ("tree" in mdl) {
    for (const l of leaves(mdl.tree)) out += boxRect(l.box, tint(COLOURS[callOf(l)], l.n[0] + l.n[1] ? 0.16 : 0.05));
  } else {
    const G = 40;
    const cell = PLANE.size / G;
    for (let i = 0; i < G; i++)
      for (let j = 0; j < G; j++) {
        const v = forestVote(mdl.forest, { x: (i + 0.5) / G, y: (j + 0.5) / G });
        out += `<rect x="${r2(PLANE.left + i * cell)}" y="${r2(PLANE.top + (G - 1 - j) * cell)}" width="${r2(cell + 0.5)}" height="${r2(cell + 0.5)}" fill="${tint(v >= 0.5 ? ORANGE : BLUE, 0.04 + 0.3 * Math.abs(v - 0.5) * 2)}"/>`;
      }
  }
  for (let k = 0; k <= 4; k++) {
    const [gx, gy] = toPx(k / 4, k / 4);
    out += txt(gx, PLANE.top + PLANE.size + 15, nf(k / 4, 3), { anchor: "middle", size: 10.5, fill: GREY }) + txt(PLANE.left - 6, gy + 4, nf(k / 4, 3), { anchor: "end", size: 10.5, fill: GREY });
  }
  out += txt(PLANE.left + PLANE.size, PLANE.top + PLANE.size + 30, "x", { anchor: "end", bold: true }) + txt(PLANE.left - 30, PLANE.top + 4, "y", { bold: true });
  // The cuts, each across its own box.
  const cutLine = (b: Box, axis: Axis, t: number, extra: string) => {
    const [a, c] = axis ? [toPx(b.x0, t), toPx(b.x1, t)] : [toPx(t, b.y0), toPx(t, b.y1)];
    return `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(c[0])}" y2="${r2(c[1])}" ${extra}/>`;
  };
  const tree = "tree" in mdl ? mdl.tree : null;
  if (tree) {
    const walk = (n: TreeNode) => {
      if (!n.split || !n.kids) return;
      out += cutLine(n.box, n.split.axis, n.split.t, `stroke="${INK}" stroke-width="2"`);
      walk(n.kids[0]);
      walk(n.kids[1]);
    };
    walk(tree);
  }
  for (const p of train) {
    const [px, py] = toPx(p.x, p.y);
    out += p.c ? `<circle cx="${r2(px)}" cy="${r2(py)}" r="4.5" fill="${ORANGE}"/>` : `<circle cx="${r2(px)}" cy="${r2(py)}" r="4" fill="#fff" stroke="${BLUE}" stroke-width="1.8"/>`;
  }
  for (const p of test) {
    const [px, py] = toPx(p.x, p.y);
    out += `<rect x="${r2(px - 3.5)}" y="${r2(py - 3.5)}" width="7" height="7" fill="${COLOURS[p.c]}" opacity="0.75"/>`;
    if (predict(mdl, p) !== p.c) out += `<rect x="${r2(px - 6.5)}" y="${r2(py - 6.5)}" width="13" height="13" fill="none" stroke="${RED}" stroke-width="1.6"/>`;
  }

  // The box picked, the cut being tried, and what it does to the impurity.
  const S = SIDE;
  let y = PLANE.top + 6;
  const picked = !d.depth && tree && d.sel !== null ? findNode(tree, d.sel) : null;
  const leaf = picked && !picked.kids ? picked : null;
  const M = w.measures[d.measure];
  if (leaf) {
    out += boxRect(leaf.box, "none", ` stroke="${RED}" stroke-width="2.5"`);
    out += cutLine(leaf.box, d.axis, Math.min(Math.max(d.t, d.axis ? leaf.box.y0 : leaf.box.x0), d.axis ? leaf.box.y1 : leaf.box.x1), `stroke="${RED}" stroke-width="2.5" stroke-dasharray="7 5"`);
    const inBox = train.filter((p) => leafAt(tree!, p) === leaf);
    const left = counts(inBox.filter((p) => coord(p, d.axis) < d.t));
    const right = counts(inBox.filter((p) => coord(p, d.axis) >= d.t));
    const before = impurity(leaf.n[0], leaf.n[1], d.measure);
    const g = gain(inBox, d.axis, d.t, d.measure);
    out += txt(S.left, y, w.box, { bold: true, size: 13 });
    out += txt(S.left, y + 18, `${leaf.n[1]}`, { bold: true, fill: ORANGE }) + txt(S.left + 22, y + 18, `${leaf.n[0]}`, { bold: true, fill: BLUE }) + txt(S.left + 44, y + 18, `${M} ${nf(before, 3)}`, { size: 11.5 });
    out += txt(S.left, y + 40, `${w.cut}: ${cutText(d.axis, d.t)}`, { bold: true, fill: RED });
    out += txt(S.left, y + 58, `< : `, { size: 11.5 }) + txt(S.left + 22, y + 58, `${left[1]}`, { bold: true, fill: ORANGE }) + txt(S.left + 44, y + 58, `${left[0]}`, { bold: true, fill: BLUE });
    out += txt(S.left + 80, y + 58, `≥ : `, { size: 11.5 }) + txt(S.left + 102, y + 58, `${right[1]}`, { bold: true, fill: ORANGE }) + txt(S.left + 124, y + 58, `${right[0]}`, { bold: true, fill: BLUE });
    out += txt(S.left, y + 76, `${w.after} ${nf(before - g, 3)}`, { size: 11.5 });
    out += txt(S.left, y + 94, `${w.fall} ${nf(g, 3)}`, { bold: true, fill: g > 1e-9 ? "#2f9e44" : GREY });
    const b = showBest ? bestSplit(inBox, d.measure) : null;
    if (b) out += txt(S.left, y + 112, `${w.best}: ${cutText(b.axis, b.t)}, ${nf(b.gain, 3)}`, { size: 11 });
  } else if (!d.depth) out += txt(S.left, y, w.tapBox, { size: 11.5 });
  else out += txt(S.left, y, d.trees > 1 ? `${w.forest}: ${d.trees}` : w.depthIs.replace("{d}", String(depthOf(tree!))), { bold: true, size: 13 });

  // The tree, drawn small when it has few enough leaves.
  y = PLANE.top + 150;
  if (tree && leaves(tree).length <= 8) {
    const ls = leaves(tree);
    const pos = new Map<string, [number, number]>();
    const place = (n: TreeNode): number => {
      const x = n.kids ? (place(n.kids[0]) + place(n.kids[1])) / 2 : S.left + 10 + ((S.w - 20) * (ls.indexOf(n) + 0.5)) / ls.length;
      pos.set(n.path, [x, y + 22 + n.path.length * 34]);
      return x;
    };
    place(tree);
    out += txt(S.left, y, w.treeSize.replace("{n}", String(ls.length)), { bold: true, size: 12 });
    const draw = (n: TreeNode) => {
      const [x, yy] = pos.get(n.path)!;
      if (n.kids && n.split) {
        for (const k of n.kids) out += `<line x1="${r2(x)}" y1="${r2(yy)}" x2="${r2(pos.get(k.path)![0])}" y2="${r2(pos.get(k.path)![1])}" stroke="#adb5bd" stroke-width="1.5"/>`;
        out += `<rect x="${r2(x - 24)}" y="${r2(yy - 9)}" width="48" height="15" rx="4" fill="#fff" stroke="${INK}"/>` + txt(x, yy + 2, cutText(n.split.axis, n.split.t), { anchor: "middle", size: 8.5, fill: INK });
        n.kids.forEach(draw);
      } else {
        const sel = n.path === d.sel && !d.depth;
        out += `<rect x="${r2(x - 9)}" y="${r2(yy - 8)}" width="18" height="16" rx="3" fill="${tint(COLOURS[callOf(n)], 0.35)}" stroke="${sel ? RED : COLOURS[callOf(n)]}" stroke-width="${sel ? 2.5 : 1}"/>`;
        out += txt(x, yy + 4, String(n.n[0] + n.n[1]), { anchor: "middle", size: 9, fill: INK });
      }
    };
    draw(tree);
  }

  // How well the model calls the training points and the test points.
  y = PLANE.top + PLANE.size - (test.length ? 62 : 28);
  const accs: [string, number][] = [[w.train, accuracy(mdl, train)], ...(test.length ? ([[w.test, accuracy(mdl, test)]] as [string, number][]) : [])];
  accs.forEach(([name, a], i) => {
    const yy = y + i * 34;
    out += txt(S.left, yy, name, { size: 11.5, bold: true });
    out += `<rect x="${S.left}" y="${yy + 5}" width="${S.w - 50}" height="12" fill="#f1f3f5"/><rect x="${S.left}" y="${yy + 5}" width="${r2((S.w - 50) * a)}" height="12" fill="${i ? INK : GREY}"/>`;
    out += txt(S.left + S.w - 44, yy + 16, num(a), { bold: true });
  });
  return out;
}
