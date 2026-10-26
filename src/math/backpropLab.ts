// Backpropagation by hand, the board's lab: a small computational graph, its inputs on the left and the loss L on the
// right, each node with its value from the forward pass and under it a box for its gradient ∂L/∂node. The boxes are
// filled in going back from L, whose gradient is 1: a node's gradient is, over every arrow out of it, the gradient at
// the arrow's end times the arrow's local slope, added up. Eight puzzles ask for the boxes of a × gate (the inputs
// swap), a + gate (the gradient passes unchanged), one neuron's squared error (the slopes multiply along the chain), a
// value used twice (the two paths add), a sigmoid (its slope σ(1 − σ)), a ReLU that is off (nothing comes back), two
// layers (the later weight multiplies what reaches the first), and log loss on a sigmoid (σ − 1). Free play takes any
// of the graphs with inputs changed by hand, every gradient shown, and a nudge of 0.01 to an input to show what its
// gradient means. Kept free of React so it can be tested on its own.
import { nf } from "./text";
import type { GameBase } from "./ladder";

export type BpOp = "add" | "sub" | "mul" | "sq" | "sig" | "relu" | "nln";
/** A node: an input, or an operation on the nodes in `args`; where it is drawn, by column and row. Its id is its name. */
export type BpNode = { id: string; op: BpOp | "in"; args: string[]; col: number; row: number };
export type BpGraphId = "classic" | "neuron" | "fork" | "sigmoid" | "relu" | "deep" | "logloss";
/** A graph: its formula, its nodes with the arguments of each before it and the output L last, and its inputs' values. */
export type BpGraph = { id: BpGraphId; formula: string; nodes: BpNode[]; values: Record<string, number> };

const input = (id: string, col: number, row: number): BpNode => ({ id, op: "in", args: [], col, row });
const node = (id: string, op: BpOp, args: string[], col: number, row: number): BpNode => ({ id, op, args, col, row });
/** w × x + b, the start of a neuron, with w above, x below and b above the sum. */
const NEURON = [input("w", 0, 0), input("x", 0, 2), node("m", "mul", ["w", "x"], 1, 1), input("b", 1, 0), node("z", "add", ["m", "b"], 2, 1)];

export const BP_GRAPHS: BpGraph[] = [
  {
    id: "classic",
    formula: "L = (x + y) z",
    nodes: [input("x", 0, 0), input("y", 0, 1), node("q", "add", ["x", "y"], 1, 0.5), input("z", 1, 1.75), node("L", "mul", ["q", "z"], 2, 1.1)],
    values: { x: -2, y: 5, z: -4 },
  },
  {
    id: "neuron",
    formula: "L = (w x + b − y)²",
    nodes: [input("w", 0, 0), input("x", 0, 2), node("m", "mul", ["w", "x"], 1, 1), input("b", 1, 0), node("s", "add", ["m", "b"], 2, 1), input("y", 2, 2), node("e", "sub", ["s", "y"], 3, 1), node("L", "sq", ["e"], 4, 1)],
    values: { w: 3, x: 2, b: 1, y: 10 },
  },
  {
    id: "fork",
    formula: "L = x y + x",
    nodes: [input("x", 0, 0), input("y", 0, 2), node("p", "mul", ["x", "y"], 1, 1.4), node("L", "add", ["p", "x"], 2, 0.6)],
    values: { x: 2, y: 3 },
  },
  { id: "sigmoid", formula: "L = σ(w x + b)", nodes: [...NEURON, node("L", "sig", ["z"], 3, 1)], values: { w: 1, x: 2, b: -2 } },
  { id: "relu", formula: "L = ReLU(w x + b)", nodes: [...NEURON, node("L", "relu", ["z"], 3, 1)], values: { w: -2, x: 1, b: 1 } },
  {
    id: "deep",
    formula: "L = (v · ReLU(w x + b) − y)²",
    nodes: [...NEURON, node("h", "relu", ["z"], 3, 1), input("v", 3, 0), node("o", "mul", ["v", "h"], 4, 1), input("y", 4, 2), node("e", "sub", ["o", "y"], 5, 1), node("L", "sq", ["e"], 6, 1)],
    values: { w: 1, x: 2, b: -1, v: 3, y: 2 },
  },
  { id: "logloss", formula: "L = −ln σ(w x + b)", nodes: [...NEURON, node("p", "sig", ["z"], 3, 1), node("L", "nln", ["p"], 4, 1)], values: { w: 0.5, x: 2, b: -1 } },
];
export const bpGraph = (id: BpGraphId) => BP_GRAPHS.find((g) => g.id === id)!;
export const inputsOf = (g: BpGraph) => g.nodes.filter((n) => n.op === "in").map((n) => n.id);

const sig = (t: number) => 1 / (1 + Math.exp(-t));
const FWD: Record<BpOp, (a: number, b: number) => number> = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  sq: (a) => a * a,
  sig,
  relu: (a) => Math.max(0, a),
  nln: (a) => -Math.log(a),
};
/** The local slopes ∂node/∂arg, from the arguments' values and the node's own. */
const SLOPES: Record<BpOp, (a: number, b: number, self: number) => number[]> = {
  add: () => [1, 1],
  sub: () => [1, -1],
  mul: (a, b) => [b, a],
  sq: (a) => [2 * a],
  sig: (_, __, s) => [s * (1 - s)],
  relu: (a) => [a > 0 ? 1 : 0],
  nln: (a) => [-1 / a],
};

/** Every node's value, the inputs' from `values`. */
export function forward(g: BpGraph, values: Record<string, number>): Record<string, number> {
  const v: Record<string, number> = {};
  for (const n of g.nodes) v[n.id] = n.op === "in" ? values[n.id] : FWD[n.op](v[n.args[0]], v[n.args[1]]);
  return v;
}
/** The local slope of each of a node's arguments. */
export function slopes(n: BpNode, v: Record<string, number>): number[] {
  return n.op === "in" ? [] : SLOPES[n.op](v[n.args[0]], v[n.args[1]], v[n.id]);
}
/** What reaches a node back along each arrow out of it: the gradient at the arrow's end times its local slope. */
export function paths(g: BpGraph, v: Record<string, number>, grad: Record<string, number>, id: string): { to: string; slope: number; part: number }[] {
  return g.nodes.flatMap((n) => {
    const s = slopes(n, v);
    return n.args.flatMap((a, k) => (a === id ? [{ to: n.id, slope: s[k], part: grad[n.id] * s[k] }] : []));
  });
}
/** Every node's gradient ∂L/∂node, from L back. */
export function backward(g: BpGraph, v: Record<string, number>): Record<string, number> {
  const grad: Record<string, number> = { L: 1 };
  for (let i = g.nodes.length - 2; i >= 0; i--) grad[g.nodes[i].id] = paths(g, v, grad, g.nodes[i].id).reduce((t, p) => t + p.part, 0);
  return grad;
}

export type BpNotice = "mul" | "add" | "chain" | "fork" | "sigmoid" | "dead" | "deep" | "logloss";
export const BP_NOTICES: BpNotice[] = ["mul", "add", "chain", "fork", "sigmoid", "dead", "deep", "logloss"];

/** A puzzle: its graph, the boxes to fill in (each after the boxes of the nodes it goes into), the gradients not
 * shown, and what doing it shows. */
export type BpPuzzle = { graph: BpGraphId; blanks: string[]; hide: string[]; notice: BpNotice };

export const BP_LADDER: BpPuzzle[] = [
  { graph: "classic", blanks: ["q", "z"], hide: ["x", "y"], notice: "mul" },
  { graph: "classic", blanks: ["x", "y"], hide: [], notice: "add" },
  { graph: "neuron", blanks: ["e", "s", "m", "b", "w"], hide: ["x", "y"], notice: "chain" },
  { graph: "fork", blanks: ["p", "y", "x"], hide: [], notice: "fork" },
  { graph: "sigmoid", blanks: ["z", "m", "b", "w"], hide: ["x"], notice: "sigmoid" },
  { graph: "relu", blanks: ["z", "m", "b", "w"], hide: ["x"], notice: "dead" },
  { graph: "deep", blanks: ["h", "v", "z", "b", "w"], hide: ["x", "y", "m"], notice: "deep" },
  { graph: "logloss", blanks: ["p", "z", "b", "w"], hide: ["x", "m"], notice: "logloss" },
];

/** A number as typed: −4, -4, 0.25, 0,25, .5, +2 or 1/4; null if it is none of them. */
export function readAnswer(s: string): number | null {
  const t = s.replace(/[−–]/g, "-").replace(/,/g, ".").replace(/\s+/g, "");
  const m = /^([+-]?)(\d+\.?\d*|\.\d+)(?:\/(\d+\.?\d*|\.\d+))?$/.exec(t);
  if (!m) return null;
  const v = Number(m[2]) / (m[3] === undefined ? 1 : Number(m[3]));
  return Number.isFinite(v) ? (m[1] === "-" ? -v : v) : null;
}
/** Right to two decimals, or to half a percent of a large gradient. */
export const closeEnough = (a: number, want: number) => Math.abs(a - want) <= 0.01 + 0.005 * Math.abs(want);

export type BpSlip = "empty" | "bad" | "sign" | "path" | "above" | "off";
/** A try: done, or wrong at a box and why, with what was typed there. */
export type BpVerdict = { state: "won" } | { state: "lost"; why: BpSlip; node: string; have: string };

/** The boxes judged in the puzzle's order, which goes back from L, so that a slip is told where it starts: empty, not a number, the wrong sign, one path
 * of several, the local slopes without the gradient above, or just off. */
export function judgeBp(q: BpPuzzle, answers: Record<string, string>): BpVerdict {
  const g = bpGraph(q.graph);
  const v = forward(g, g.values);
  const grad = backward(g, v);
  for (const id of q.blanks) {
    const typed = (answers[id] ?? "").trim();
    const lost = (why: BpSlip): BpVerdict => ({ state: "lost", why, node: id, have: typed });
    if (!typed) return lost("empty");
    const a = readAnswer(typed);
    if (a === null) return lost("bad");
    const want = grad[id];
    if (closeEnough(a, want)) continue;
    const ps = paths(g, v, grad, id);
    if (Math.abs(want) > 0.01 && closeEnough(-a, want)) return lost("sign");
    if (ps.length > 1 && ps.some((p) => closeEnough(a, p.part))) return lost("path");
    if (ps.some((p) => Math.abs(grad[p.to] - 1) > 0.01) && closeEnough(a, ps.reduce((t, p) => t + p.slope, 0))) return lost("above");
    return lost("off");
  }
  return { state: "won" };
}

/** Stars: done at the first try three, at the second two, else one. */
export const bpStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);

export type LiveBackprop = GameBase<BpNotice, { kind: "wrong"; why: BpSlip }> & {
  mode: "puzzle" | "free";
  /** Free play's graph, its inputs' values, and the input chosen to change. */
  graph: BpGraphId;
  values: Record<string, number>;
  sel: string | null;
  /** What has been typed in each box. */
  answers: Record<string, string>;
  /** Tries that failed on this puzzle, and whether it is done. */
  tries: number;
  done: boolean;
};

export const BP_START: LiveBackprop = { mode: "puzzle", stage: 0, graph: "classic", values: { ...BP_GRAPHS[0].values }, sel: null, answers: {}, tries: 0, done: false, said: null };

/** The puzzle being played, or null in free play; the graph in play and its inputs' values. */
export const bpPuzzle = (d: Pick<LiveBackprop, "mode" | "stage">) => (d.mode === "puzzle" ? BP_LADDER[d.stage] : null);
export const graphOf = (d: Pick<LiveBackprop, "mode" | "stage" | "graph">) => bpGraph(bpPuzzle(d)?.graph ?? d.graph);
export const valuesOf = (d: Pick<LiveBackprop, "mode" | "stage" | "graph" | "values">) => (bpPuzzle(d) ? graphOf(d).values : d.values);

/** How far an input goes either way in free play, and its step. */
export const VALUE_MAX = 5;
export const VALUE_STEP = 0.5;
/** An input moved by a step, or null if it would leave the range. */
export function stepped(v: number, d: number): number | null {
  const out = Math.round((v + d) * 100) / 100;
  return Math.abs(out) <= VALUE_MAX + 1e-9 ? out : null;
}
/** L before and after a nudge of `by` to one input. */
export function nudge(g: BpGraph, values: Record<string, number>, id: string, by = 0.01): { before: number; after: number } {
  return { before: forward(g, values).L, after: forward(g, { ...values, [id]: values[id] + by }).L };
}

/** What a node works out, written with its arguments' names, and the local slope of its k-th argument. */
export function exprOf(n: BpNode): string {
  const [a, b] = n.args;
  return { in: n.id, add: `${a} + ${b}`, sub: `${a} − ${b}`, mul: `${a} × ${b}`, sq: `${a}²`, sig: `σ(${a})`, relu: `ReLU(${a})`, nln: `−ln ${a}` }[n.op];
}
export function slopeOf(n: BpNode, k: number, reluRule: string): string {
  const [a, b] = n.args;
  if (n.op === "add") return "1";
  if (n.op === "sub") return k === 0 ? "1" : "−1";
  if (n.op === "mul") return k === 0 ? b : a;
  if (n.op === "sq") return `2${a}`;
  if (n.op === "sig") return `${n.id}(1 − ${n.id})`;
  if (n.op === "relu") return reluRule.replace("{a}", a);
  return `−1/${a}`;
}
/** The arrows out of a node, for the hint: where each goes, what is worked out there, and its local slope. */
export function usesOf(g: BpGraph, id: string, reluRule: string): { to: string; expr: string; slope: string }[] {
  return g.nodes.flatMap((n) => n.args.flatMap((a, k) => (a === id ? [{ to: n.id, expr: exprOf(n), slope: slopeOf(n, k, reluRule) }] : [])));
}

// ---------- the picture ----------

export const BP_PLOT = { w: 620, h: 268, top: 46, rowH: 84, margin: 48, maxColW: 150 };
const OP_SYM: Record<BpOp, string> = { add: "+", sub: "−", mul: "×", sq: "( )²", sig: "σ", relu: "ReLU", nln: "−ln" };
const R = 19;
const GRAD = "#9c36b5";
const r1 = (v: number) => Math.round(v * 10) / 10;
/** An input's box is as wide as its text. */
const inputW = (text: string) => text.length * 7.4 + 16;

/** Where each node is drawn: the columns as far apart as fits, at most maxColW, centred. */
export function bpPos(g: BpGraph): Record<string, [number, number]> {
  const { w, top, rowH, margin, maxColW } = BP_PLOT;
  const cols = Math.max(...g.nodes.map((n) => n.col));
  const colW = Math.min(maxColW, (w - 2 * margin) / cols);
  const x0 = (w - colW * cols) / 2;
  return Object.fromEntries(g.nodes.map((n) => [n.id, [x0 + n.col * colW, top + n.row * rowH]]));
}
/** The middle of a node's gradient box. */
const boxAt = (n: BpNode, [x, y]: [number, number]): [number, number] => [x, y + (n.op === "in" ? 14 : R) + 17];

/** The node whose shape or box a point is on, if any. */
export function bpHit(g: BpGraph, px: number, py: number): string | null {
  const pos = bpPos(g);
  let best: string | null = null;
  let bd = 26;
  for (const n of g.nodes) {
    for (const [x, y] of [pos[n.id], boxAt(n, pos[n.id])]) {
      const d = Math.hypot(x - px, y - py);
      if (d < bd) [best, bd] = [n.id, d];
    }
  }
  return best;
}

export type BpPicture = {
  /** The boxes to fill in and what is typed in them, the gradients not shown, the box being typed in, the box a
   * failed check points at, whether the puzzle is done, and free play's chosen input. */
  blanks: string[];
  answers: Record<string, string>;
  hide: string[];
  focus: string | null;
  wrong: string | null;
  done: boolean;
  sel: string | null;
  caption: string;
};

/**
 * The picture: arrows from each node to the ones that use it; the inputs as boxes with their values, the operations as
 * circles with their symbol and above them their name and value; under each node its gradient, purple when it is shown
 * and a dashed box when it is to be filled in (blue while typed in, red where a check went wrong, green once done).
 */
export function bpSvg(g: BpGraph, values: Record<string, number>, o: BpPicture): string {
  const pos = bpPos(g);
  const v = forward(g, values);
  const grad = backward(g, v);
  const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
  const label = (n: BpNode) => `${n.id} = ${num(v[n.id])}`;
  let s = `<defs><marker id="bp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#adb5bd"/></marker></defs>`;
  s += `<text x="12" y="18" font-size="11" fill="#868e96">${o.caption}</text>`;
  for (const n of g.nodes) {
    for (const a of n.args) {
      const [[x0, y0], [x1, y1]] = [pos[a], pos[n.id]];
      const [dx, dy] = [x1 - x0, y1 - y0];
      const d = Math.hypot(dx, dy);
      const t1 = (R + 2) / d;
      // An input's arrow leaves from its side, clear of its gradient box underneath.
      const [sx, sy] = byId[a].op === "in" ? [x0 + inputW(label(byId[a])) / 2 + 1, y0] : [x0 + (dx * (R + 2)) / d, y0 + (dy * (R + 2)) / d];
      s += `<line x1="${r1(sx)}" y1="${r1(sy)}" x2="${r1(x1 - dx * t1)}" y2="${r1(y1 - dy * t1)}" stroke="#adb5bd" stroke-width="2" marker-end="url(#bp-arrow)"/>`;
    }
  }
  for (const n of g.nodes) {
    const [x, y] = pos[n.id];
    if (n.op === "in") {
      const wd = inputW(label(n));
      const on = o.sel === n.id;
      s += `<rect x="${r1(x - wd / 2)}" y="${y - 14}" width="${r1(wd)}" height="28" rx="6" fill="${on ? "#e7f5ff" : "#f8f9fa"}" stroke="${on ? "#1971c2" : "#868e96"}" stroke-width="${on ? 2.5 : 1.5}"/>`;
      s += `<text x="${r1(x)}" y="${y + 5}" font-size="14" font-weight="700" fill="#1e1e1e" text-anchor="middle">${label(n)}</text>`;
    } else {
      s += `<circle cx="${r1(x)}" cy="${y}" r="${R}" fill="#fff" stroke="#495057" stroke-width="2"/>`;
      const sym = OP_SYM[n.op];
      s += `<text x="${r1(x)}" y="${y + (sym.length > 2 ? 4 : 6)}" font-size="${sym.length > 2 ? 11 : 17}" font-weight="700" fill="#495057" text-anchor="middle">${sym}</text>`;
      s += `<text x="${r1(x)}" y="${y - R - 7}" font-size="13" font-weight="700" fill="#1e1e1e" text-anchor="middle">${label(n)}</text>`;
    }
    if (o.hide.includes(n.id)) continue;
    const [bx, by] = boxAt(n, pos[n.id]);
    if (o.blanks.includes(n.id)) {
      const typed = (o.answers[n.id] ?? "").trim();
      const colour = o.done ? "#2f9e44" : o.wrong === n.id ? "#e03131" : o.focus === n.id ? "#1971c2" : "#e8590c";
      const text = typed ? esc(typed.length > 7 ? `${typed.slice(0, 6)}…` : typed) : "?";
      s += `<rect x="${r1(bx - 28)}" y="${r1(by - 11)}" width="56" height="22" rx="4" fill="#fff" stroke="${colour}" stroke-width="${o.focus === n.id || o.wrong === n.id ? 2.5 : 1.5}"${o.done ? "" : ` stroke-dasharray="4 3"`}/>`;
      s += `<text x="${r1(bx)}" y="${r1(by + 5)}" font-size="13" font-weight="700" fill="${typed ? colour : "#adb5bd"}" text-anchor="middle">${text}</text>`;
    } else {
      s += `<rect x="${r1(bx - 28)}" y="${r1(by - 11)}" width="56" height="22" rx="4" fill="#f8f0fc" stroke="${GRAD}" stroke-width="1.5"/>`;
      s += `<text x="${r1(bx)}" y="${r1(by + 5)}" font-size="13" font-weight="700" fill="${GRAD}" text-anchor="middle">${num(grad[n.id])}</text>`;
    }
  }
  return s;
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A value or a gradient: up to two decimals, with a minus sign; and with four, for a nudge. */
export const num = (v: number) => (Math.abs(v) < 5e-3 ? "0" : nf(v, 2).replace(/^-/, "−"));
export const num4 = (v: number) => (Math.abs(v) < 5e-5 ? "0" : nf(v, 4).replace(/^-/, "−"));
