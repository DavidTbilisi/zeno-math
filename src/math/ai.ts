// Math for AI, starting with tensors as NumPy and PyTorch see them: a box of numbers with a shape. A shape such as
// 2x3x4 (filled 1, 2, 3, … in memory order) or a nested list such as [[1, 2], [3, 4]] is drawn axis by axis — a
// scalar as one cell, a vector as a row, a matrix as a grid, an order-3 tensor as its slices with the box beside
// them, an order-4 one as rows of slices — with its order, shape, number of entries and strides, one entry picked out
// by its indices, and for a matrix its rank, which is a different thing from its order. Then what is done to tensors:
// reshape and permute (the same memory read with new strides, and when that stops being contiguous), sums and other
// reductions along an axis, entry-by-entry arithmetic with broadcasting, and the matrix product @ with batches, each
// drawn before and after with the entries that make up one entry of the result picked out. And gradient descent on a
// function of x, or of x and y: the steps on the curve or across the level curves, for up to three learning rates and
// with momentum, each path judged (settles, crawls, overshoots, runs away, stops on a maximum or a saddle), a lower
// point when a path settled in a local minimum, and the largest rate the curvature allows. And backpropagation: an
// expression in named inputs drawn as its computational graph, every node's value worked out forwards and its
// gradient ∂L/∂node backwards by the chain rule, the local derivative on every edge, one input's chain written out
// along each path, checked numerically, and an optional step of gradient descent. And softmax with cross-entropy:
// scores turned into probabilities (with the largest taken off first), at up to three temperatures, against a target
// class or distribution, with the loss, how it compares with a uniform guess, entropy and KL divergence for a soft
// target, and the gradient p − y.
import { arrow, axes, C, compose, contours, curve, dot, esc, fill, FONT, lbl, makeFrame, nt, r2, sampleY, W, yRange, type Caption } from "./chart";
import { derive } from "./derive";
import { evalE, exprMessages, has, parseE, simp, substitute, tex, V, X, type E } from "./expr";
import type { RenderedSvg } from "./latex";

export type AiTopic = "tensor" | "ops" | "descent" | "backprop" | "softmax";
export const AI_TOPICS: AiTopic[] = ["tensor", "ops", "descent", "backprop", "softmax"];
export type AiSpec = { topic: AiTopic; src: string };

export type AiWords = {
  bad: string;
  unknown: string;
  need: Record<AiTopic, string>;
  tensor: {
    ragged: string;
    mixed: string;
    empty: string;
    tooBig: string;
    pickCount: string;
    pickRange: string;
    axis: string;
    order0: string;
    order1: string;
    order2: string;
    orderN: string;
    shape0: string;
    shape: string;
    rank: string;
    rankLow: string;
    asMatrix: string;
    slices3: string;
    slices4: string;
    strides: string;
    pick: string;
  };
  ops: {
    oneOp: string;
    opMissing: string;
    unknownOp: string;
    noAxes: string;
    axisRange: string;
    reshapeCount: string;
    reshapeTwoFree: string;
    reshapeSplit: string;
    permBad: string;
    swapCount: string;
    incompatible: string;
    divZero: string;
    matScalar: string;
    inner: string;
    panel: string;
    stretched: string;
    reshape: string;
    reshapeFree: string;
    flatten: string;
    reshapePick: string;
    permute: string;
    contiguous: string;
    notContiguous: string;
    vectorT: string;
    permutePick: string;
    fn: { sum: string; mean: string; max: string; min: string };
    reduceAxis: string;
    reduceAll: string;
    keepdims: string;
    reducePick: string;
    same: string;
    lineUp: string;
    scalar: string;
    stretch: string;
    missing: string;
    strideZero: string;
    hadamard: string;
    broadcastPick: string;
    matShape: string;
    matBatch: string;
    matLeft: string;
    matRight: string;
    matDot: string;
    matPick: string;
  };
  descent: {
    vars: string;
    badOpt: string;
    badStart: string;
    badRate: string;
    badSteps: string;
    badMomentum: string;
    undefinedAt: string;
    first1: string;
    first2: string;
    momentum: string;
    converged: string;
    slow: string;
    small: string;
    bounce: string;
    diverged: string;
    max: string;
    saddle: string;
    zigzag1: string;
    zigzag2: string;
    local: string;
    everywhere: string;
    near: string;
    curve1: string;
    curve2: string;
    valley: string;
    table: string;
  };
  backprop: {
    noInputs: string;
    tooBig: string;
    notReal: string;
    notInput: string;
    badOpt: string;
    badRate: string;
    extraValue: string;
    badValue: string;
    noValue: string;
    forward: string;
    backward: string;
    manyPaths: string;
    fanout: string;
    check: string;
    dead: string;
    saturated: string;
    grads: string;
    step: string;
    lossDown: string;
    lossUp: string;
  };
  softmax: {
    count: string;
    badOpt: string;
    badLabels: string;
    badTemp: string;
    badTarget: string;
    normalise: string;
    overflow: string;
    two: string;
    temp: string;
    temps: string;
    hard: string;
    hardWhy: string;
    confident: string;
    soft: string;
    entropy: string;
    uniform: string;
    gradient: string;
    gradientSoft: string;
    classN: string;
  };
};

/** A tensor: its shape and its numbers in memory order (row-major, the last index changing fastest). */
export type Tensor = { shape: number[]; data: number[] };
/** What a picture shows, for the tests: the tensor, its strides, the entry picked and where it sits, a matrix's rank. */
export type AiData = { tensor: Tensor; strides: number[]; pick?: number[]; at?: number; rank?: number };
/** What an operation's picture shows, for the tests: the tensors it starts from and the result; for reshape and
 * permute the result's strides into the same memory and whether they are row-major; the entry of the result explained
 * and, for each input, the places in its memory of the entries that make it up. */
export type OpsData = { inputs: Tensor[]; out: Tensor; strides?: number[]; contiguous?: boolean; pick?: number[]; cells?: number[][] };

const MAX_ORDER = 4;
const MAX_AXIS = 12;
const MAX_ENTRIES = 144;

let words: AiWords;
const fail = (s: string, v: Record<string, string | number> = {}): never => {
  throw new Error(fill(s, v));
};

// ---------- reading ----------

type Nested = number | Nested[];

/** A nested list of numbers; commas or spaces between the items. */
function readList(s: string): Nested {
  let i = 0;
  const gap = () => {
    while (i < s.length && /[\s,]/.test(s[i])) i++;
  };
  const value = (): Nested => {
    gap();
    if (s[i] === "[") {
      i++;
      const items: Nested[] = [];
      for (;;) {
        gap();
        if (i >= s.length) return fail(words.bad, { s });
        if (s[i] === "]") {
          i++;
          return items;
        }
        items.push(value());
      }
    }
    const m = /^[-−]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i));
    if (!m) return fail(words.bad, { s: s.slice(i, i + 12) || s });
    i += m[0].length;
    return Number(m[0].replace("−", "-"));
  };
  const v = value();
  gap();
  if (i < s.length) fail(words.bad, { s: s.slice(i) });
  return v;
}

/** The box a nested list fills, or an error if it is not a full box. */
function boxOf(v: Nested): Tensor {
  if (typeof v === "number") return { shape: [], data: [v] };
  if (!v.length) return fail(words.tensor.empty);
  const parts = v.map(boxOf);
  const first = parts[0].shape;
  for (const p of parts) {
    if (p.shape.length !== first.length) fail(words.tensor.mixed);
    const k = p.shape.findIndex((d, j) => d !== first[j]);
    if (k >= 0) fail(words.tensor.ragged, { a: first[k], b: p.shape[k] });
  }
  return { shape: [v.length, ...first], data: parts.flatMap((p) => p.data) };
}

/** "2x3x4", "(2, 3)", "(5,)", "shape 5" or "()"; null when the text is not a shape. */
function readShape(src: string): number[] | null {
  let s = src.trim();
  const named = /^shape\b/i.test(s);
  if (named) s = s.slice(5).trim();
  const paren = /^\(.*\)$/.test(s);
  if (paren) s = s.slice(1, -1).trim();
  if (!named && !paren && !/^\d+\s*[x×*]/.test(s)) return null;
  const parts = s.split(/\s*[x×*,]\s*/).filter((p) => p !== "");
  if (!parts.every((p) => /^\d+$/.test(p))) fail(words.bad, { s: src });
  return parts.map(Number);
}

const size = (shape: number[]) => shape.reduce((a, b) => a * b, 1);

/** A tensor small enough to draw. */
function drawable(t: Tensor): Tensor {
  if (t.shape.includes(0)) fail(words.tensor.empty);
  if (t.shape.length > MAX_ORDER || t.shape.some((d) => d > MAX_AXIS) || t.data.length > MAX_ENTRIES)
    fail(words.tensor.tooBig, { order: MAX_ORDER, axis: MAX_AXIS, n: MAX_ENTRIES });
  return t;
}

function readTensor(src: string): Tensor {
  const shape = readShape(src);
  return drawable(shape ? { shape, data: Array.from({ length: size(shape) }, (_, i) => i + 1) } : boxOf(readList(src)));
}

/** "T[1, 2]", "out[1, 2]" or "[1, 2]": an entry picked by its indices; null when the text is not one. */
function readPick(src: string, shape: number[]): number[] | null {
  const m = /^(?:T|out)?\s*\[([^\]]*)\]$/i.exec(src);
  if (!m) return null;
  const idx = m[1].split(/[\s,]+/).filter(Boolean);
  if (idx.length !== shape.length || !idx.every((v) => /^\d+$/.test(v))) fail(words.tensor.pickCount, { n: shape.length });
  const pick = idx.map(Number);
  pick.forEach((v, k) => {
    if (v >= shape[k]) fail(words.tensor.pickRange, { i: v, k, m: shape[k] - 1 });
  });
  return pick;
}

/** How many places in memory one step along each axis moves. */
export const strides = (shape: number[]) => shape.map((_, k) => shape.slice(k + 1).reduce((a, b) => a * b, 1));

/** The rank of a matrix (independent rows), by elimination with a tolerance. */
export function matrixRank(rows: number[][]): number {
  const m = rows.map((r) => r.slice());
  const tol = 1e-9 * Math.max(1, ...m.flat().map(Math.abs));
  let rank = 0;
  for (let c = 0; c < (m[0]?.length ?? 0) && rank < m.length; c++) {
    let p = rank;
    for (let r = rank + 1; r < m.length; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) <= tol) continue;
    [m[rank], m[p]] = [m[p], m[rank]];
    for (let r = rank + 1; r < m.length; r++) {
      const k = m[r][c] / m[rank][c];
      for (let j = c; j < m[r].length; j++) m[r][j] -= k * m[rank][j];
    }
    rank++;
  }
  return rank;
}

// ---------- drawing ----------

// One tint per value of the first index, so a slice keeps its colour in the slices and in the box.
const TINT = ["#d0ebff", "#d3f9d8", "#ffe8cc", "#f3d9fa", "#fff3bf", "#ffe3e3", "#c5f6fa", "#e5dbff", "#e9ecef", "#ffdeeb", "#d8f5a2", "#ffec99"];
const EDGE = [C.blue, C.green, C.orange, C.purple, "#f08c00", C.red, "#0c8599", "#6741d9", C.grey, "#c2255c", "#5c940d", "#e67700"];
const HI = "#ff922b";
const GHOST = "#f8f9fa";

/** How an entry is drawn: picked out, a copy made by broadcasting, or plain. */
type Mark = "hi" | "ghost" | undefined;
/** The mark of the entry at each place in memory. */
type Marks = (at: number) => Mark;

const txt = (x: number, y: number, s: string, color: string, size: number, anchor = "middle", weight = "400", turn = "") =>
  `<text x="${r2(x)}" y="${r2(y)}" text-anchor="${anchor}" ${FONT} font-size="${r2(size)}" font-weight="${weight}" fill="${color}"${turn}>${esc(s)}</text>`;

/** A label running up the page beside a vertical arrow, so that a long word takes no room on the left. */
const upward = (x: number, y: number, s: string, color: string) => txt(x, y, s, color, 13, "middle", "700", ` transform="rotate(-90 ${r2(x)} ${r2(y)})"`);

/** A grid of cells with their numbers, each cell drawn as its mark says. */
function grid(x: number, y: number, rows: number, cols: number, cs: number, value: ((r: number, c: number) => number) | null, tint: string, edge: string, mark?: (r: number, c: number) => Mark): string {
  let s = "";
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const m = mark?.(r, c);
      const on = m === "hi";
      const ghost = m === "ghost";
      s += `<rect x="${r2(x + c * cs)}" y="${r2(y + r * cs)}" width="${r2(cs)}" height="${r2(cs)}" fill="${on ? HI : ghost ? GHOST : tint}" stroke="${ghost ? C.grey : edge}" stroke-width="${on ? 2.4 : 1.1}"${ghost ? ` stroke-dasharray="3 2"` : ""}/>`;
      if (!value) continue;
      const label = nt(value(r, c));
      const size = Math.min(15, cs * 0.42, (cs * 1.7) / Math.max(2, label.length));
      s += txt(x + (c + 0.5) * cs, y + (r + 0.5) * cs + size * 0.36, label, ghost ? C.grey : C.ink, size, "middle", on ? "700" : "400");
    }
  return s;
}

const axisName = (k: number) => fill(words.tensor.axis, { k });

/** Index numbers along a row of cells (above it) or a column (left of it). */
function indicesAcross(x: number, y: number, n: number, cs: number, size: number) {
  return Array.from({ length: n }, (_, i) => txt(x + (i + 0.5) * cs, y, String(i), C.grey, size)).join("");
}
function indicesDown(x: number, y: number, n: number, cs: number, size: number) {
  return Array.from({ length: n }, (_, i) => txt(x, y + (i + 0.5) * cs + size * 0.36, String(i), C.grey, size, "end")).join("");
}

/** A labelled arrow along an axis. */
function axisArrow(x0: number, y0: number, x1: number, y1: number, label: string, color: string, lx: number, ly: number, anchor = "middle") {
  return arrow(x0, y0, x1, y1, color, 2) + txt(lx, ly, label, color, 13, anchor, "700");
}

function drawScalar(t: Tensor, mark?: Marks): { svg: string; h: number } {
  const cs = 60;
  return { svg: grid((W - cs) / 2, 8, 1, 1, cs, () => t.data[0], TINT[0], EDGE[0], mark && (() => mark(0))), h: cs + 16 };
}

function drawVector(t: Tensor, mark?: Marks): { svg: string; h: number } {
  const n = t.shape[0];
  const cs = Math.min(50, (W - 80) / n);
  const x = (W - n * cs) / 2;
  let s = indicesAcross(x, 14, n, cs, 12);
  s += grid(x, 22, 1, n, cs, (_, c) => t.data[c], TINT[0], EDGE[0], mark && ((_, c) => mark(c)));
  const y = 22 + cs + 16;
  s += axisArrow(x, y, x + n * cs, y, axisName(0), C.blue, x + (n * cs) / 2, y + 20);
  return { svg: s, h: y + 30 };
}

function drawMatrix(t: Tensor, mark?: Marks): { svg: string; h: number } {
  const [rows, cols] = t.shape;
  const cs = Math.min(46, (W - 220) / cols, 300 / rows);
  const x = Math.max(150, (W - cols * cs) / 2);
  const y = 50;
  let s = axisArrow(x, 24, x + cols * cs, 24, axisName(1), C.orange, x + (cols * cs) / 2, 14);
  s += indicesAcross(x, y - 8, cols, cs, 12) + indicesDown(x - 8, y, rows, cs, 12);
  s += axisArrow(x - 30, y, x - 30, y + rows * cs, axisName(0), C.blue, x - 40, y + (rows * cs) / 2 + 5, "end");
  s += grid(x, y, rows, cols, cs, (r, c) => t.data[r * cols + c], TINT[0], EDGE[0], mark && ((r, c) => mark(r * cols + c)));
  return { svg: s, h: y + rows * cs + 12 };
}

/** The cell size of the order-3 box, which is 0.55 of a cell deeper per layer and 0.4 of one taller. */
const boxCell = ([d0, d1, d2]: number[]) => Math.min(30, 170 / (d2 + 0.55 * d0), 220 / (d1 + 0.4 * d0));

/** The order-3 box: the front face is the slice T[0], the depth runs along axis 0. */
function drawBox(t: Tensor, right: number, top: number): { svg: string; h: number } {
  const [d0, d1, d2] = t.shape;
  const b = boxCell(t.shape);
  const dx = 0.55 * b;
  const dy = 0.4 * b;
  const w = d2 * b + d0 * dx;
  const h = d1 * b + d0 * dy;
  const x0 = right - w;
  const y0 = top + d0 * dy; // the front face's top-left corner
  const poly = (pts: number[][], tint: string, edge: string) =>
    `<polygon points="${pts.map(([px, py]) => `${r2(px)},${r2(py)}`).join(" ")}" fill="${tint}" stroke="${edge}" stroke-width="1"/>`;
  let s = "";
  // Back to front, so the nearer layers cover the farther ones: the top strip and the side strip of each layer.
  for (let i = d0 - 1; i >= 0; i--) {
    const tint = TINT[i % TINT.length];
    const edge = EDGE[i % EDGE.length];
    for (let c = 0; c < d2; c++) {
      const px = x0 + c * b + i * dx;
      const py = y0 - i * dy;
      s += poly([[px, py], [px + b, py], [px + b + dx, py - dy], [px + dx, py - dy]], tint, edge);
    }
    for (let r = 0; r < d1; r++) {
      const px = x0 + d2 * b + i * dx;
      const py = y0 + r * b - i * dy;
      s += poly([[px, py], [px + dx, py - dy], [px + dx, py + b - dy], [px, py + b]], tint, edge);
    }
  }
  // The front face is too small for numbers on a big box: then the slices beside it carry them.
  s += grid(x0, y0, d1, d2, b, b >= 17 ? (r, c) => t.data[r * d2 + c] : null, TINT[0], EDGE[0]);
  s += txt(x0 + (d2 * b) / 2, y0 + d1 * b + 16, axisName(2), C.green, 12, "middle", "700");
  s += txt(x0 - 6, y0 + (d1 * b) / 2 + 4, axisName(1), C.orange, 12, "end", "700");
  s += txt(right, top - 6, axisName(0), C.blue, 12, "end", "700");
  return { svg: s, h: h + 22 };
}

/** Slices side by side, wrapping onto more lines when they do not fit. */
function drawOrder3(t: Tensor, mark?: Marks, name = "T"): { svg: string; h: number } {
  const [d0, d1, d2] = t.shape;
  const boxRight = W - 46;
  const boxW = boxCell(t.shape) * (d2 + 0.55 * d0) + 52;
  const avail = boxRight - boxW - 34 - 44;
  const gap = 22;
  // As few lines as keep the cells readable; more lines only when one line would make them tiny.
  let best = { cs: 0, per: d0, lines: 1 };
  for (let lines = 1; lines <= d0; lines++) {
    const per = Math.ceil(d0 / lines);
    const cs = Math.min(40, (avail - (per - 1) * gap) / (per * d2), (380 - lines * 40) / (lines * d1));
    if (cs > best.cs) best = { cs, per, lines };
    if (cs >= 26) break;
  }
  const { cs, per, lines } = best;
  const x0 = 44;
  const lineH = 26 + d1 * cs + 40;
  const span = per * d2 * cs + (per - 1) * gap;
  let s = axisArrow(x0, 18, x0 + span, 18, axisName(0), C.blue, x0 + span / 2, 10);
  for (let i = 0; i < d0; i++) {
    const x = x0 + (i % per) * (d2 * cs + gap);
    const y = 26 + Math.floor(i / per) * lineH;
    s += txt(x + (d2 * cs) / 2, y + 14, `${name}[${i}]`, EDGE[i % EDGE.length], 13, "middle", "700");
    s += grid(x, y + 22, d1, d2, cs, (r, c) => t.data[i * d1 * d2 + r * d2 + c], TINT[i % TINT.length], EDGE[i % EDGE.length], mark && ((r, c) => mark(i * d1 * d2 + r * d2 + c)));
  }
  const gy = 26 + 22;
  s += arrow(x0 - 12, gy, x0 - 12, gy + d1 * cs, C.orange, 2) + upward(x0 - 22, gy + (d1 * cs) / 2, axisName(1), C.orange);
  s += axisArrow(x0, gy + d1 * cs + 10, x0 + d2 * cs, gy + d1 * cs + 10, axisName(2), C.green, x0 + (d2 * cs) / 2, gy + d1 * cs + 28);
  const box = drawBox(t, boxRight, 34);
  const h = Math.max(26 + lines * lineH - 6, 34 + box.h + 10);
  return { svg: s + box.svg, h };
}

/** One line of slices T[i, 0], T[i, 1], … for each i. */
function drawOrder4(t: Tensor, mark?: Marks, name = "T"): { svg: string; h: number } {
  const [d0, d1, d2, d3] = t.shape;
  const gap = 18;
  const x0 = 110;
  const cs = Math.min(34, (W - x0 - 24 - (d1 - 1) * gap) / (d1 * d3), (440 / d0 - 44) / d2);
  const lineH = 22 + d2 * cs + 22;
  let s = axisArrow(x0, 12, x0 + d1 * d3 * cs + (d1 - 1) * gap, 12, axisName(1), C.orange, x0 - 8, 16, "end");
  for (let i = 0; i < d0; i++) {
    const y = 26 + i * lineH;
    s += txt(x0 - 14, y + 22 + (d2 * cs) / 2 + 5, `${name}[${i}]`, EDGE[i % EDGE.length], 13, "end", "700");
    for (let j = 0; j < d1; j++) {
      const x = x0 + j * (d3 * cs + gap);
      const at = (r: number, c: number) => ((i * d1 + j) * d2 + r) * d3 + c;
      s += txt(x + (d3 * cs) / 2, y + 14, `${name}[${i}, ${j}]`, EDGE[i % EDGE.length], 12, "middle", "700");
      s += grid(x, y + 22, d2, d3, cs, (r, c) => t.data[at(r, c)], TINT[i % TINT.length], EDGE[i % EDGE.length], mark && ((r, c) => mark(at(r, c))));
    }
  }
  const h = 26 + d0 * lineH;
  s += axisArrow(30, 30, 30, h - 22, axisName(0), C.blue, 36, h - 6, "start");
  return { svg: s, h: h + 4 };
}

/** A tensor as its order calls for; `name` heads the slices of an order-3 or order-4 one. */
function drawTensor(t: Tensor, mark?: Marks, name?: string): { svg: string; h: number } {
  const order = t.shape.length;
  return order === 0 ? drawScalar(t, mark) : order === 1 ? drawVector(t, mark) : order === 2 ? drawMatrix(t, mark) : order === 3 ? drawOrder3(t, mark, name) : drawOrder4(t, mark, name);
}

// ---------- the tensor topic ----------

const list = (xs: (string | number)[]) => xs.join(", ");
const vectorText = (xs: number[]) => `[${xs.map((v) => nt(v)).join(", ")}]`;

function renderTensor(main: string, opts: string[]): { svg: RenderedSvg; data: AiData } {
  const T = words.tensor;
  const t = readTensor(main);
  const { shape, data } = t;
  const order = shape.length;
  let pick: number[] | undefined;
  for (const o of opts) pick = readPick(o, shape) ?? fail(words.unknown, { s: o });

  const st = strides(shape);
  const at = pick && pick.reduce((a, v, k) => a + v * st[k], 0);
  const drawn = drawTensor(t, at === undefined ? undefined : (i) => (i === at ? "hi" : undefined));
  const space = `\\mathbb{R}^{${shape.join("\\times ")}}`;
  const entries = data.length;
  const tex = order === 0 ? `T = ${nt(data[0])} \\in \\mathbb{R}` : `T \\in ${space}` + (order > 1 ? `\\qquad ${shape.join(" \\cdot ")} = ${entries}` : "");

  const out: AiData = { tensor: t, strides: st, pick };
  const caps: Caption[] = [];
  const letters = "ijkl".slice(0, order).split("");
  caps.push({
    text: order === 0 ? T.order0 : order === 1 ? T.order1 : order === 2 ? T.order2 : fill(T.orderN, { n: order, idx: list(letters) }),
    color: C.blue,
  });
  caps.push({ text: order === 0 ? T.shape0 : fill(T.shape, { shape: list(shape), product: shape.join(" · "), n: entries }) });
  if (order === 2) {
    const rows = Array.from({ length: shape[0] }, (_, r) => data.slice(r * shape[1], (r + 1) * shape[1]));
    const rank = (out.rank = matrixRank(rows));
    caps.push({ text: fill(rank < Math.min(...shape) ? T.rankLow : T.rank, { r: rank }), color: rank < Math.min(...shape) ? C.red : C.purple });
    if (shape.includes(1)) caps.push({ text: fill(T.asMatrix, { r: shape[0], c: shape[1], v: vectorText(data), n: entries }), color: C.grey });
  }
  if (order === 3) caps.push({ text: fill(T.slices3, { n: shape[0], last: shape[0] - 1, r: shape[1], c: shape[2] }), color: C.grey });
  if (order === 4) caps.push({ text: fill(T.slices4, { n: shape[0], last: shape[0] - 1, shape: list(shape.slice(1)) }), color: C.grey });
  if (order >= 2) caps.push({ text: fill(T.strides, { s: list(st) }), color: C.grey });
  if (pick && at !== undefined) {
    out.at = at;
    const sum = pick.map((v, k) => `${v}·${st[k]}`).join(" + ");
    caps.push({ text: fill(T.pick, { idx: list(pick), v: nt(data[at]), sum: order > 1 ? `${sum} = ${at}` : String(at) }), color: HI });
  }
  return { svg: compose(tex, drawn.svg, drawn.h, caps), data: out };
}

// ---------- operations ----------

/** The place in memory of an entry, row-major. */
const ravel = (idx: number[], shape: number[]) => idx.reduce((a, v, k) => a * shape[k] + v, 0);
/** The indices of the entry at a place in memory. */
function unravel(at: number, shape: number[]): number[] {
  const idx: number[] = [];
  for (let k = shape.length - 1; k >= 0; k--) {
    idx[k] = at % shape[k];
    at = Math.floor(at / shape[k]);
  }
  return idx;
}
const tabulate = (shape: number[], f: (idx: number[]) => number): Tensor => drawable({ shape, data: Array.from({ length: size(shape) }, (_, i) => f(unravel(i, shape))) });
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const markAt = (cells: number[]): Marks => (i) => (cells.includes(i) ? "hi" : undefined);
/** A number as a term of a sum: a negative one in brackets. */
const term = (v: number) => (v < 0 ? `(${nt(v)})` : nt(v));
const R = (shape: number[]) => (shape.length ? `\\mathbb{R}^{${shape.join("\\times ")}}` : "\\mathbb{R}");
const isInt = (s: string) => /^[-−]?\d+$/.test(s);
const int = (s: string) => Number(s.replace("−", "-"));

/** One tensor of an operation's picture: the code that makes it, the name its slices go by, and its marks. */
type Panel = { code: string; name: string; t: Tensor; mark?: Marks; label?: string };

/** The tensors one under another, each under its line of code and its shape. */
function stack(panels: Panel[]): { svg: string; h: number } {
  let s = "";
  let y = 0;
  for (const p of panels) {
    s += txt(W / 2, y + 16, p.label ?? fill(words.ops.panel, { code: p.code, shape: list(p.t.shape) }), C.ink, 14, "middle", "700");
    const d = drawTensor(p.t, p.mark, p.name);
    s += `<g transform="translate(0 ${r2(y + 26)})">${d.svg}</g>`;
    y += 26 + d.h + 16;
  }
  return { svg: s, h: y - 16 };
}

type Built = { tex: string; panels: Panel[]; caps: Caption[]; data: OpsData };

/** An axis as typed (−1 for the last), as a number from 0. */
function axisOf(t: Tensor, s: string): number {
  const n = t.shape.length;
  const k = int(s);
  if (!n) fail(words.ops.noAxes);
  if (k >= n || k < -n) fail(words.ops.axisRange, { k, last: n - 1, n });
  return k < 0 ? k + n : k;
}

function reshape(t: Tensor, dims: number[], code: string, pickSrc?: string): Built {
  const O = words.ops;
  const n = t.data.length;
  const free = dims.filter((d) => d === -1).length;
  if (free > 1) fail(O.reshapeTwoFree);
  if (dims.includes(0)) fail(words.tensor.empty);
  const known = size(dims.filter((d) => d !== -1));
  if (free && n % known) fail(O.reshapeSplit, { n, m: known });
  const shape = dims.map((d) => (d === -1 ? n / known : d));
  if (size(shape) !== n) fail(O.reshapeCount, { n, shape: list(shape), m: size(shape) });
  const out = drawable({ shape, data: t.data });
  const data: OpsData = { inputs: [t], out, strides: strides(shape), contiguous: true };
  const caps: Caption[] = [{ text: fill(O.reshape, { a: list(strides(t.shape)), b: list(strides(shape)) }), color: C.blue }];
  if (code.includes("flatten")) caps.unshift({ text: fill(O.flatten, { n }), color: C.blue });
  if (free && dims.length > 1) caps.push({ text: fill(O.reshapeFree, { n, m: known, k: n / known }), color: C.grey });
  let mark: Marks | undefined;
  if (pickSrc) {
    const pick = readPick(pickSrc, shape)!;
    const at = ravel(pick, shape);
    Object.assign(data, { pick, cells: [[at]] });
    mark = markAt([at]);
    caps.push({ text: fill(O.reshapePick, { idx: list(pick), v: nt(t.data[at]), at, orig: list(unravel(at, t.shape)) }), color: HI });
  }
  return {
    tex: `${R(t.shape)} \\xrightarrow{\\texttt{${code.slice(1)}}} ${R(shape)}`,
    panels: [{ code: "T", name: "T", t, mark }, { code, name: "out", t: out, mark }],
    caps,
    data,
  };
}

function permute(t: Tensor, perm: number[], code: string, pickSrc?: string): Built {
  const O = words.ops;
  const st = strides(t.shape);
  const shape = perm.map((k) => t.shape[k]);
  const view = perm.map((k) => st[k]);
  const place = (idx: number[]) => idx.reduce((a, v, k) => a + v * view[k], 0);
  const out = tabulate(shape, (idx) => t.data[place(idx)]);
  const rowMajor = strides(shape);
  const contiguous = shape.every((d, k) => d === 1 || view[k] === rowMajor[k]);
  const data: OpsData = { inputs: [t], out, strides: view, contiguous };
  const caps: Caption[] = [{ text: fill(O.permute, { perm: list(perm), a: list(t.shape), b: list(shape), sa: list(st), sb: list(view) }), color: C.blue }];
  if (contiguous) caps.push({ text: O.contiguous, color: C.green });
  else {
    const n = Math.min(8, out.data.length);
    const places = range(n).map((o) => place(unravel(o, shape)));
    caps.push({ text: fill(O.notContiguous, { places: list(places) + (out.data.length > n ? ", …" : "") }), color: C.red });
  }
  let mark: Marks | undefined;
  let outMark: Marks | undefined;
  if (pickSrc) {
    const pick = readPick(pickSrc, shape)!;
    const at = place(pick);
    Object.assign(data, { pick, cells: [[at]] });
    mark = markAt([at]);
    outMark = markAt([ravel(pick, shape)]);
    const sum = pick.map((v, k) => `${v}·${view[k]}`).join(" + ");
    caps.push({ text: fill(O.permutePick, { idx: list(pick), orig: list(unravel(at, t.shape)), v: nt(t.data[at]), sum: `${sum} = ${at}` }), color: HI });
  }
  return {
    tex: `${R(t.shape)} \\xrightarrow{\\texttt{${code.slice(1)}}} ${R(shape)}`,
    panels: [{ code: "T", name: "T", t, mark }, { code, name: "out", t: out, mark: outMark }],
    caps,
    data,
  };
}

type Fn = "sum" | "mean" | "max" | "min";
const APPLY: Record<Fn, (xs: number[]) => number> = {
  sum: (xs) => xs.reduce((a, b) => a + b, 0),
  mean: (xs) => xs.reduce((a, b) => a + b, 0) / xs.length,
  max: (xs) => Math.max(...xs),
  min: (xs) => Math.min(...xs),
};

/** The working of a reduction, shortened in the middle when it has many terms. */
function working(fn: Fn, xs: number[]): string {
  const ts = xs.length > 8 ? [...xs.slice(0, 3).map(term), "…", term(xs[xs.length - 1])] : xs.map(term);
  if (fn === "sum") return ts.join(" + ");
  if (fn === "mean") return `(${ts.join(" + ")}) / ${xs.length}`;
  return `${fn}(${ts.join(", ")})`;
}

function reduce(t: Tensor, fn: Fn, axis: number | undefined, keep: boolean, code: string, pickSrc?: string): Built {
  const O = words.ops;
  const gone = (k: number) => axis === undefined || k === axis;
  const shape = t.shape.flatMap((d, k) => (!gone(k) ? [d] : keep ? [1] : []));
  // Each entry of the result gathers the places in memory of the entries that have its indices on the axes kept.
  const groups: number[][] = range(size(shape)).map(() => []);
  t.data.forEach((_, i) => {
    const idx = unravel(i, t.shape).flatMap((v, k) => (!gone(k) ? [v] : keep ? [0] : []));
    groups[ravel(idx, shape)].push(i);
  });
  const out = drawable({ shape, data: groups.map((g) => APPLY[fn](g.map((i) => t.data[i]))) });
  const pick = pickSrc ? readPick(pickSrc, shape)! : shape.map(() => 0);
  const o = ravel(pick, shape);
  const cells = groups[o];
  const caps: Caption[] = [];
  if (axis === undefined) caps.push({ text: fill(O.reduceAll, { fn: O.fn[fn], n: t.data.length }), color: C.blue });
  else {
    caps.push({ text: fill(O.reduceAxis, { fn: O.fn[fn], k: axis, a: list(t.shape), b: list(shape) }), color: C.blue });
    if (keep) caps.push({ text: fill(O.keepdims, { k: axis, b: list(shape), fn }), color: C.grey });
  }
  const idx = shape.length ? `out[${list(pick)}]` : "out";
  caps.push({ text: fill(O.reducePick, { idx, work: working(fn, cells.map((i) => t.data[i])), v: nt(out.data[o]) }), color: HI });
  return {
    tex: `${R(t.shape)} \\xrightarrow{\\texttt{${code.slice(1)}}} ${R(shape)}`,
    panels: [{ code: "T", name: "T", t, mark: markAt(cells) }, { code, name: "out", t: out, mark: markAt([o]) }],
    caps,
    data: { inputs: [t], out, pick, cells: [cells] },
  };
}

/** The shape two shapes broadcast to, lined up from the right. */
function broadcastShape(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length);
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    const x = a[a.length - i] ?? 1;
    const y = b[b.length - i] ?? 1;
    if (x !== y && x !== 1 && y !== 1) fail(words.ops.incompatible, { a: list(a), b: list(b), x, y });
    out.unshift(Math.max(x, y));
  }
  return out;
}

/** The indices in a broadcast operand of the entry that lands at `idx` in the result. */
const source = (idx: number[], shape: number[]) => idx.slice(idx.length - shape.length).map((v, k) => (shape[k] === 1 ? 0 : v));

const OP_TEX: Record<string, string> = { "+": "+", "−": "-", "*": "\\odot", "/": "\\oslash" };
const OP_APPLY: Record<string, (x: number, y: number) => number> = { "+": (x, y) => x + y, "−": (x, y) => x - y, "*": (x, y) => x * y, "/": (x, y) => x / y };

function broadcast(A: Tensor, op: string, B: Tensor, pickSrc?: string): Built {
  const O = words.ops;
  const shape = broadcastShape(A.shape, B.shape);
  const out = tabulate(shape, (idx) => {
    const y = B.data[ravel(source(idx, B.shape), B.shape)];
    if (op === "/" && y === 0) fail(O.divZero, { idx: list(idx) });
    return OP_APPLY[op](A.data[ravel(source(idx, A.shape), A.shape)], y);
  });
  const pick = pickSrc ? readPick(pickSrc, shape)! : shape.map(() => 0);
  const o = ravel(pick, shape);
  const caps: Caption[] = [];
  const named = [["A", A], ["B", B]] as const;
  const stretched = named.some(([, t]) => t.shape.length !== shape.length || t.shape.some((d, k) => d !== shape[k]));
  if (!stretched) caps.push({ text: O.same, color: C.blue });
  else {
    caps.push({ text: fill(O.lineUp, { a: list(A.shape), b: list(B.shape), c: list(shape) }), color: C.blue });
    for (const [name, t] of named) {
      if (!t.shape.length) {
        caps.push({ text: fill(O.scalar, { name }), color: C.grey });
        continue;
      }
      const off = shape.length - t.shape.length;
      shape.forEach((d, k) => {
        if (d === 1) return;
        if (k < off) caps.push({ text: fill(O.missing, { name, k, n: d }), color: C.grey });
        else if (t.shape[k - off] === 1) caps.push({ text: fill(O.stretch, { name, k, n: d }), color: C.grey });
      });
    }
    caps.push({ text: O.strideZero, color: C.grey });
  }
  if (op === "*") caps.push({ text: O.hadamard, color: C.purple });
  // Each operand drawn stretched to the result's shape: the entries copied by broadcasting are pale.
  const panels: Panel[] = named.map(([name, t]) => {
    const off = shape.length - t.shape.length;
    const big = tabulate(shape, (idx) => t.data[ravel(source(idx, t.shape), t.shape)]);
    const copy = (idx: number[]) => idx.some((v, k) => v > 0 && (k < off || t.shape[k - off] === 1));
    const same = off === 0 && t.shape.every((d, k) => d === shape[k]);
    return {
      code: name,
      name,
      t: big,
      mark: (i: number) => (i === o ? "hi" : copy(unravel(i, shape)) ? "ghost" : undefined),
      label: same ? undefined : fill(O.stretched, { name, a: list(t.shape), shape: list(shape) }),
    };
  });
  panels.push({ code: `A ${op} B`, name: "out", t: out, mark: markAt([o]) });
  const [ia, ib] = [source(pick, A.shape), source(pick, B.shape)];
  const ref = (name: string, idx: number[]) => (idx.length ? `${name}[${list(idx)}]` : name);
  const [x, y] = [A.data[ravel(ia, A.shape)], B.data[ravel(ib, B.shape)]];
  caps.push({
    text: fill(O.broadcastPick, { out: shape.length ? `out[${list(pick)}]` : "out", a: ref("A", ia), b: ref("B", ib), op, x: term(x), y: term(y), v: nt(out.data[o]) }).replace(/ \* /g, " · "),
    color: HI,
  });
  return {
    tex: `${R(A.shape)} ${OP_TEX[op]} ${R(B.shape)} \\to ${R(shape)}`,
    panels,
    caps,
    data: { inputs: [A, B], out, pick, cells: [[ravel(ia, A.shape)], [ravel(ib, B.shape)]] },
  };
}

function matmul(A: Tensor, B: Tensor, pickSrc?: string): Built {
  const O = words.ops;
  if (!A.shape.length || !B.shape.length) fail(O.matScalar);
  // A vector on the left is a row, one on the right a column; that axis is dropped from the result again.
  const left = A.shape.length === 1;
  const right = B.shape.length === 1;
  const a = left ? [1, ...A.shape] : A.shape;
  const b = right ? [...B.shape, 1] : B.shape;
  const [n, k] = a.slice(-2);
  const [k2, m] = b.slice(-2);
  if (k !== k2) fail(O.inner, { k, k2, a: list(A.shape), b: list(B.shape) });
  const batch = broadcastShape(a.slice(0, -2), b.slice(0, -2));
  const nb = batch.length;
  const shape = [...batch, ...(left ? [] : [n]), ...(right ? [] : [m])];
  const full = (idx: number[]) => [...idx.slice(0, nb), left ? 0 : idx[nb], right ? 0 : idx[left ? nb : nb + 1]];
  /** The places in A's and B's memory of the row and the column that make up an entry of the result. */
  const parts = (idx: number[]) => {
    const f = full(idx);
    const ba = source(f.slice(0, nb), a.slice(0, -2));
    const bb = source(f.slice(0, nb), b.slice(0, -2));
    return [range(k).map((t) => ravel([...ba, f[nb], t], a)), range(k).map((t) => ravel([...bb, t, f[nb + 1]], b))];
  };
  const out = tabulate(shape, (idx) => {
    const [ra, cb] = parts(idx);
    return ra.reduce((s, at, t) => s + A.data[at] * B.data[cb[t]], 0);
  });
  const pick = pickSrc ? readPick(pickSrc, shape)! : shape.map(() => 0);
  const o = ravel(pick, shape);
  const [ra, cb] = parts(pick);
  const caps: Caption[] = [];
  if (left && right) caps.push({ text: O.matDot, color: C.blue });
  else {
    caps.push({ text: fill(O.matShape, { a: list(A.shape), b: list(B.shape), c: list(shape), k }), color: C.blue });
    if (left) caps.push({ text: fill(O.matLeft, { k }), color: C.grey });
    if (right) caps.push({ text: fill(O.matRight, { k }), color: C.grey });
  }
  if (nb) caps.push({ text: fill(O.matBatch, { batch: list(batch) }), color: C.grey });
  const terms = ra.map((at, t) => `${term(A.data[at])}·${term(B.data[cb[t]])}`).join(" + ");
  caps.push({ text: fill(O.matPick, { idx: shape.length ? `out[${list(pick)}]` : "out", terms, v: nt(out.data[o]) }), color: HI });
  return {
    tex: `${R(A.shape)} \\mathbin{@} ${R(B.shape)} \\to ${R(shape)}`,
    panels: [
      { code: "A", name: "A", t: A, mark: markAt(ra) },
      { code: "B", name: "B", t: B, mark: markAt(cb) },
      { code: "A @ B", name: "out", t: out, mark: markAt([o]) },
    ],
    caps,
    data: { inputs: [A, B], out, pick, cells: [ra, cb] },
  };
}

/** "A + B" split at its operator, outside brackets: + − * / need a space on each side, so −1 and 2*3 stay as they are. */
function splitBinary(s: string): [string, string, string] | null {
  let depth = 0;
  let found: [number, string] | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (depth === 0 && (ch === "@" || ("+-−*/".includes(ch) && /\s/.test(s[i - 1] ?? "") && /\s/.test(s[i + 1] ?? "")))) {
      if (found) fail(words.ops.oneOp);
      found = [i, ch === "-" ? "−" : ch];
    }
  }
  return found && [s.slice(0, found[0]).trim(), found[1], s.slice(found[0] + 1).trim()];
}

/** One operation on T, as typed after ";": reshape 4x6, T.reshape(4, -1), flatten, T, transpose 0 1, permute 2 0 1, sum axis 0, mean(axis=1, keepdims=True). */
function unary(t: Tensor, src: string, pickSrc?: string): Built {
  const O = words.ops;
  const bad = () => fail(O.unknownOp, { s: src });
  const s = src.replace(/^T?\s*\./, "");
  if (s === "T") {
    if (t.shape.length === 0) fail(O.noAxes);
    if (t.shape.length === 1) {
      const b = permute(t, [0], "T.T", pickSrc);
      b.caps = [{ text: fill(O.vectorT, { n: t.shape[0] }), color: C.blue }, ...b.caps.slice(2)];
      return b;
    }
    return permute(t, range(t.shape.length).reverse(), "T.T", pickSrc);
  }
  const tok = s.replace(/[(),=]/g, " ").replace(/(\d)\s*[x×]\s*(?=[-−\d])/g, "$1 ").trim().split(/\s+/);
  const name = tok[0].toLowerCase();
  const rest = tok.slice(1);
  const ints = () => (rest.every(isInt) ? rest.map(int) : bad());
  if (name === "reshape" || name === "view") {
    const dims = ints();
    if (!dims.length || dims.some((d) => d < -1)) bad();
    return reshape(t, dims, `T.${name}(${dims.join(", ")})`, pickSrc);
  }
  if (name === "flatten") return rest.length ? bad() : reshape(t, [-1], "T.flatten()", pickSrc);
  if (name === "permute") {
    const p = ints().map((k) => axisOf(t, String(k)));
    if (p.length !== t.shape.length || new Set(p).size !== p.length) fail(O.permBad, { last: t.shape.length - 1, example: list(range(t.shape.length).reverse()) });
    return permute(t, p, `T.permute(${rest.map(int).join(", ")})`, pickSrc);
  }
  if (name === "transpose" || name === "swapaxes") {
    if (!rest.length) return unary(t, "T", pickSrc);
    if (rest.length !== 2) fail(O.swapCount);
    const [i, j] = ints().map((k) => axisOf(t, String(k)));
    const p = range(t.shape.length);
    [p[i], p[j]] = [p[j], p[i]];
    return permute(t, p, `T.transpose(${rest.map(int).join(", ")})`, pickSrc);
  }
  if (Object.hasOwn(APPLY, name)) {
    let axis: number | undefined;
    let keep = false;
    for (let j = 0; j < rest.length; j++) {
      const w = rest[j].toLowerCase();
      if (w === "axis" || w === "dim") continue;
      if (w === "keepdims" || w === "keepdim") {
        keep = /^(true|false)$/i.test(rest[j + 1] ?? "") ? rest[++j].toLowerCase() === "true" : true;
        continue;
      }
      if (isInt(w) && axis === undefined) axis = axisOf(t, w);
      else bad();
    }
    const args = [...(axis === undefined ? [] : [`axis=${axis}`]), ...(keep ? ["keepdims=True"] : [])];
    return reduce(t, name as Fn, axis, keep, `T.${name}(${args.join(", ")})`, pickSrc);
  }
  return bad();
}

function renderOps(main: string, opts: string[]): { svg: RenderedSvg; data: OpsData } {
  const O = words.ops;
  const bin = splitBinary(main);
  let op: string | undefined;
  let pickSrc: string | undefined;
  for (const o of opts) {
    if (/^(?:T|out)?\s*\[/i.test(o)) pickSrc = o;
    else if (op || bin) fail(O.oneOp);
    else op = o;
  }
  let built: Built;
  if (bin) {
    const [a, sym, b] = bin;
    if (!a || !b) fail(words.bad, { s: main });
    const A = readTensor(a);
    const B = readTensor(b);
    built = sym === "@" ? matmul(A, B, pickSrc) : broadcast(A, sym, B, pickSrc);
  } else if (op) built = unary(readTensor(main), op, pickSrc);
  else return fail(O.opMissing);
  const drawn = stack(built.panels);
  return { svg: compose(built.tex, drawn.svg, drawn.h, built.caps), data: built.data };
}

// ---------- gradient descent ----------

const SUBS = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
const MAX_STEPS = 100;
const MAX_RATES = 3;
/** One colour per learning rate, so that each path and the sentence about it match. */
const PATH = [C.blue, C.orange, C.purple];

type Verdict = "converged" | "slow" | "bounce" | "diverged" | "max" | "saddle";
export type DescentPath = { eta: number; points: number[][]; f: number[]; grad: number[][]; verdict: Verdict; settled?: number; zigzag: boolean };
/** What a descent picture shows, for the tests: the number of variables, each rate's path and verdict, and a point
 * where f is lower than where a path settled, when there is one. */
export type DescentData = { vars: 1 | 2; paths: DescentPath[]; lower?: number[]; curvature?: number[] };

const norm = (v: number[]) => Math.hypot(...v);
const point = (p: number[]) => (p.length === 1 ? nt(p[0]) : `(${p.map((v) => nt(v)).join(", ")})`);

/** The eigenvalues of a symmetric matrix [[a, b], [b, c]], the larger first. */
function eigen2(a: number, b: number, c: number): [number, number] {
  const m = (a + c) / 2;
  const r = Math.hypot((a - c) / 2, b);
  return [m + r, m - r];
}

/** x_{k+1} = x_k + v_{k+1}, v_{k+1} = β v_k − η ∇f(x_k), until the steps run off to infinity. */
function descend(F: (p: number[]) => number, G: (p: number[]) => number[], start: number[], eta: number, beta: number, steps: number): Omit<DescentPath, "verdict" | "zigzag"> & { blewUp: boolean } {
  const points = [start];
  const f = [F(start)];
  const grad = [G(start)];
  let v = start.map(() => 0);
  let blewUp = false;
  for (let k = 0; k < steps; k++) {
    const p = points[k];
    v = v.map((vi, i) => beta * vi - eta * grad[k][i]);
    const q = p.map((pi, i) => pi + v[i]);
    const fq = F(q);
    const gq = G(q);
    if (![...q, fq, ...gq].every(Number.isFinite) || norm(q) > 1e12) {
      blewUp = true;
      break;
    }
    points.push(q);
    f.push(fq);
    grad.push(gq);
  }
  return { eta, points, f, grad, blewUp };
}

function renderDescent(main: string, opts: string[]): { svg: RenderedSvg; data: DescentData } {
  const Dw = words.descent;
  exprMessages({ bad: words.bad, onlyX: Dw.vars, tooBig: Dw.vars });
  const f = parseE(main.replace(/^f\s*(\([^)]*\))?\s*=/i, ""), ["y"]);
  const two = has(f, "y");
  const n = two ? 2 : 1;
  const num = (s: string) => Number(s.replace("−", "-"));
  let start = two ? [2, 2] : [2];
  let rates = [0.1];
  let steps = 50;
  let beta = 0;
  for (const o of opts) {
    const m = /^(start|x0|from|rate|lr|eta|η|steps|momentum|beta|β)\s*=?\s*(.*)$/i.exec(o);
    if (!m) fail(Dw.badOpt, { s: o });
    const name = m![1].toLowerCase();
    const vals = m![2].replace(/[()]/g, " ").split(/[\s,;]+/).filter(Boolean);
    const nums = vals.map(num);
    const ok = vals.length > 0 && nums.every(Number.isFinite);
    if (name === "start" || name === "x0" || name === "from") {
      if (!ok || nums.length !== n) fail(Dw.badStart, { n, example: two ? "(4, 1)" : "4" });
      start = nums;
    } else if (name === "steps") {
      if (!ok || nums.length !== 1 || !Number.isInteger(nums[0]) || nums[0] < 1 || nums[0] > MAX_STEPS) fail(Dw.badSteps, { max: MAX_STEPS });
      steps = nums[0];
    } else if (name === "momentum" || name === "beta" || name === "β") {
      if (!ok || nums.length !== 1 || nums[0] < 0 || nums[0] >= 1) fail(Dw.badMomentum);
      beta = nums[0];
    } else {
      if (!ok || nums.length > MAX_RATES || nums.some((r) => r <= 0)) fail(Dw.badRate, { max: MAX_RATES });
      rates = nums;
    }
  }

  // ∂/∂y is ∂/∂x with x and y swapped.
  const swap = (e: E) => substitute(substitute(substitute(e, "x", V("t")), "y", X), "t", V("y"));
  const dx = (e: E) => simp(derive(e));
  const dy = (e: E) => swap(dx(swap(e)));
  const grad = two ? [dx(f), dy(f)] : [dx(f)];
  const hess = two ? [dx(grad[0]), dy(grad[0]), dy(grad[1])] : [dx(grad[0])];
  const at = (e: E, p: number[]) => evalE(e, p[0], { y: p[1] ?? 0 });
  const F = (p: number[]) => at(f, p);
  const G = (p: number[]) => grad.map((g) => at(g, p));
  /** The curvatures at a point: f″, or the Hessian's eigenvalues, the larger first. */
  const curv = (p: number[]) => (two ? eigen2(at(hess[0], p), at(hess[1], p), at(hess[2], p)) : [at(hess[0], p)]);
  if (![F(start), ...G(start)].every(Number.isFinite)) fail(Dw.undefinedAt, { p: point(start) });

  const paths: DescentPath[] = rates.map((eta) => {
    const r = descend(F, G, start, eta, beta, steps);
    const last = r.points.length - 1;
    const tol = 1e-3 * Math.max(1, norm(r.grad[0]));
    const settled = r.grad.findIndex((g) => norm(g) <= tol);
    // A zigzag: along some axis most steps go back the other way from the one before.
    const moves = r.points.slice(1).map((q, k) => q.map((v, i) => v - r.points[k][i]));
    const zigzag = start.some((_, i) => {
      let pairs = 0;
      let flips = 0;
      for (let k = 1; k < moves.length; k++) {
        if (!moves[k][i] || !moves[k - 1][i]) continue;
        pairs++;
        if (Math.sign(moves[k][i]) !== Math.sign(moves[k - 1][i])) flips++;
      }
      return pairs > 1 && flips > pairs / 2;
    });
    const same = Math.abs(r.f[last] - r.f[0]) <= 1e-9 * Math.max(1, Math.abs(r.f[0]));
    let verdict: Verdict = r.blewUp || (r.f[last] > r.f[0] && !same) ? "diverged" : same && zigzag && last > 1 ? "bounce" : "slow";
    if (!r.blewUp && norm(r.grad[last]) <= tol) {
      const c = curv(r.points[last]);
      verdict = c.every((v) => v < -1e-9) ? "max" : c.some((v) => v < -1e-9) && c.some((v) => v > 1e-9) ? "saddle" : "converged";
    }
    return { eta, points: r.points, f: r.f, grad: r.grad, verdict, settled: verdict === "slow" || verdict === "bounce" || verdict === "diverged" ? undefined : settled, zigzag };
  });

  // The window: the start and the points near it, with room around them; a path that runs away leaves it.
  const lim = 10 * Math.max(1, ...start.map(Math.abs));
  const near = paths.flatMap((p) => p.points).filter((q) => q.every((v, i) => Math.abs(v - start[i]) <= lim));
  const lo = start.map((_, i) => Math.min(...near.map((q) => q[i])));
  const hi = start.map((_, i) => Math.max(...near.map((q) => q[i])));
  const half = lo.map((l, i) => Math.max(1, ((hi[i] - l) / 2) * 1.2));
  const mid = lo.map((l, i) => (l + hi[i]) / 2);
  // A lower point in a wider search shows that a path stopped in a local minimum.
  let lower: number[] | undefined;
  const best = paths.find((p) => p.verdict === "converged");
  if (best) {
    const end = best.points[best.points.length - 1];
    const reach = half.map((h) => Math.max(4, 2 * h));
    const grid = two ? 80 : 600;
    const cells: number[][] = [];
    if (two) for (let i = 0; i <= grid; i++) for (let j = 0; j <= grid; j++) cells.push([mid[0] - reach[0] + (2 * reach[0] * i) / grid, mid[1] - reach[1] + (2 * reach[1] * j) / grid]);
    else for (let i = 0; i <= grid; i++) cells.push([mid[0] - reach[0] + (2 * reach[0] * i) / grid]);
    const vals = cells.map(F);
    const fin = vals.filter(Number.isFinite);
    const margin = 1e-3 * (Math.max(...fin) - Math.min(...fin));
    let k = -1;
    vals.forEach((v, i) => {
      if (Number.isFinite(v) && v < F(end) - margin && norm(cells[i].map((c, j) => c - end[j])) > 0.1 * Math.max(...reach) && (k < 0 || v < vals[k])) k = i;
    });
    if (k >= 0) {
      lower = cells[k];
      lower.forEach((v, i) => {
        lo[i] = Math.min(lo[i], v);
        hi[i] = Math.max(hi[i], v);
        mid[i] = (lo[i] + hi[i]) / 2;
        half[i] = Math.max(1, ((hi[i] - lo[i]) / 2) * 1.2);
      });
    }
  }

  const caps: Caption[] = [];
  const first = paths[0];
  const g0 = first.grad[0];
  const p1 = first.points[1];
  if (p1) {
    const g = two ? `(${g0.map((v) => nt(v)).join(", ")})` : nt(g0[0]);
    caps.push({ text: fill(two ? Dw.first2 : Dw.first1, { p0: point(start), g, gt: two ? g : term(g0[0]), eta: nt(first.eta), p1: point(p1) }) });
  }
  if (beta) caps.push({ text: fill(Dw.momentum, { beta: nt(beta) }), color: C.grey });
  paths.forEach((p, i) => {
    const last = p.points.length - 1;
    const end = p.points[last];
    const v = {
      eta: nt(p.eta), p: point(end), f: nt(p.f[last]), k: p.settled ?? last, n: last,
      g: nt(norm(p.grad[last])), g0: nt(norm(p.grad[0])), f0: nt(p.f[0]),
    };
    caps.push({ text: fill(Dw[p.verdict], v), color: PATH[i] });
    if (p.zigzag && p.verdict !== "diverged" && p.verdict !== "bounce") caps.push({ text: fill(two ? Dw.zigzag2 : Dw.zigzag1, v), color: PATH[i] });
    else if (p.verdict === "slow") caps.push({ text: fill(Dw.small, v), color: PATH[i] });
  });
  if (lower) caps.push({ text: fill(Dw.local, { q: point(lower), f: nt(F(lower)) }), color: C.green });
  // How large a rate may be, from the curvature where a path settled, or anywhere when f is a quadratic.
  const quadratic = hess.every((h) => !has(h, "x") && !has(h, "y"));
  const where = best ? best.points[best.points.length - 1] : quadratic ? start : undefined;
  let curvature: number[] | undefined;
  if (where) {
    const c = curv(where);
    if (c.every((v) => v > 1e-9)) {
      curvature = c;
      const near = quadratic ? Dw.everywhere : fill(Dw.near, { p: point(where) });
      // The bounds on η are those of plain gradient descent; momentum moves them.
      if (beta) {
        if (two && c[0] / c[1] >= 4) caps.push({ text: fill(Dw.valley, { r: nt(c[0] / c[1], 2) }), color: C.grey });
      } else if (!two) caps.push({ text: fill(Dw.curve1, { near, c: nt(c[0]), lim: nt(2 / c[0]), half: nt(1 / c[0]) }), color: C.grey });
      else {
        caps.push({ text: fill(Dw.curve2, { near, a: nt(c[0]), b: nt(c[1]), lim: nt(2 / c[0]) }), color: C.grey });
        if (c[0] / c[1] >= 4) caps.push({ text: fill(Dw.valley, { r: nt(c[0] / c[1], 2) }), color: C.grey });
      }
    }
  }

  const body = two ? drawDescent2(F, paths, start, mid, half, lower) : drawDescent1(F, paths, mid[0], half[0], lower);
  const table = stepTable(first, two);
  const rule = beta
    ? `v_{k+1} = \\beta v_k - \\eta \\nabla f, \\quad ${two ? "\\mathbf{x}" : "x"}_{k+1} = ${two ? "\\mathbf{x}" : "x"}_k + v_{k+1}`
    : two ? "\\mathbf{x}_{k+1} = \\mathbf{x}_k - \\eta \\nabla f(\\mathbf{x}_k)" : "x_{k+1} = x_k - \\eta f'(x_k)";
  const def = two ? `f(x, y) = ${tex(f)}, \\quad \\nabla f = \\left(${tex(grad[0])},\\ ${tex(grad[1])}\\right)` : `f(x) = ${tex(f)}, \\quad f'(x) = ${tex(grad[0])}`;
  const svg = compose(`\\begin{gathered} ${def} \\\\ ${rule} \\end{gathered}`, body.svg + `<g transform="translate(0 ${r2(body.h + 8)})">${table.svg}</g>`, body.h + 8 + table.h, caps);
  return { svg, data: { vars: n as 1 | 2, paths, lower, curvature } };
}

/** The first path's steps as a table: the start, the first steps and the last. */
function stepTable(p: DescentPath, two: boolean): { svg: string; h: number } {
  const last = p.points.length - 1;
  const rows = last > 6 ? [0, 1, 2, 3, 4, -1, last] : p.points.map((_, k) => k);
  const xs = two ? [70, 220, 380, 530] : [70, 175, 295, 415, 540];
  const head = two ? ["k", "(xₖ, yₖ)", "f", "∇f"] : ["k", "xₖ", "f(xₖ)", "f′(xₖ)", "−η f′(xₖ)"];
  let s = txt(W / 2, 14, fill(words.descent.table, { eta: nt(p.eta) }), PATH[0], 13, "middle", "700");
  s += head.map((h, i) => txt(xs[i], 36, h, C.grey, 12.5, "middle", "700")).join("");
  rows.forEach((k, r) => {
    const y = 56 + r * 19;
    if (k < 0) return (s += txt(xs[0], y, "…", C.grey, 12.5));
    const g = p.grad[k];
    const cells = two ? [String(k), point(p.points[k]), nt(p.f[k]), point(g)] : [String(k), nt(p.points[k][0]), nt(p.f[k]), nt(g[0]), nt(-p.eta * g[0])];
    cells.forEach((c, i) => (s += txt(xs[i], y, c, C.ink, 12.5)));
  });
  return { svg: s, h: 56 + rows.length * 19 - 8 };
}

/** The path's points on the curve, an arrow for each step. */
function drawDescent1(F: (p: number[]) => number, paths: DescentPath[], mid: number, half: number, lower?: number[]): { svg: string; h: number } {
  const [x0, x1] = [mid - half, mid + half];
  const g = (x: number) => F([x]);
  const inside = paths.flatMap((p) => p.points.map((q, k) => (q[0] >= x0 && q[0] <= x1 ? p.f[k] : NaN)));
  const fr = makeFrame("gd1", 48, 6, W - 48 - 18, 300, [x0, x1], yRange(sampleY(g, x0, x1), inside));
  let s = axes(fr) + curve(fr, g, C.ink, 2);
  s += `<g clip-path="url(#${fr.id})">`;
  paths.forEach((p, i) => {
    const pts = p.points.map((q, k) => [fr.sx(q[0]), fr.sy(p.f[k])]);
    for (let k = 0; k + 1 < pts.length; k++) s += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]) > 9 ? arrow(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], PATH[i], 1.8) : "";
    pts.forEach(([x, y]) => (s += dot(x, y, PATH[i], 3.2)));
  });
  if (lower) s += dot(fr.sx(lower[0]), fr.sy(g(lower[0])), C.green, 6, true);
  s += "</g>";
  const [sx, sy] = [fr.sx(paths[0].points[0][0]), fr.sy(paths[0].f[0])];
  s += lbl(sx + 6, sy - 8, `x${SUBS(0)}`, C.ink);
  return { svg: s, h: fr.bottom + 22 };
}

/** Level curves of f, equal scales on both axes so that −∇f crosses them at right angles, and the paths. */
function drawDescent2(F: (p: number[]) => number, paths: DescentPath[], start: number[], mid: number[], half: number[], lower?: number[]): { svg: string; h: number } {
  const fw = W - 48 - 18;
  const fh = 380;
  const scale = Math.max((2 * half[0]) / fw, (2 * half[1]) / fh);
  const xr = [mid[0] - (fw * scale) / 2, mid[0] + (fw * scale) / 2];
  const yr = [mid[1] - (fh * scale) / 2, mid[1] + (fh * scale) / 2];
  const fr = makeFrame("gd2", 48, 6, fw, fh, xr, yr);
  const g = (x: number, y: number) => F([x, y]);
  // Levels at quantiles of f over the window, so that they spread out whatever its scale, and one through the start.
  const vals = range(41).flatMap((i) => range(31).map((j) => g(xr[0] + ((xr[1] - xr[0]) * i) / 40, yr[0] + ((yr[1] - yr[0]) * j) / 30))).filter(Number.isFinite).sort((a, b) => a - b);
  const q = [0.02, 0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.88].map((t) => vals[Math.floor(t * (vals.length - 1))]);
  const levels = [...new Set([...q, g(start[0], start[1])])].filter(Number.isFinite);
  let s = axes(fr) + contours(fr, g, levels, "#adb5bd", 1.2);
  s += `<g clip-path="url(#${fr.id})">`;
  paths.forEach((p, i) => {
    const pts = p.points.map((pt) => [fr.sx(pt[0]), fr.sy(pt[1])]);
    for (let k = 0; k + 1 < pts.length; k++) {
      const [a, b] = [pts[k], pts[k + 1]];
      s += Math.hypot(b[0] - a[0], b[1] - a[1]) > 9 ? arrow(a[0], a[1], b[0], b[1], PATH[i], 1.8) : `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="${PATH[i]}" stroke-width="1.8"/>`;
    }
    pts.forEach(([x, y]) => (s += dot(x, y, PATH[i], 2.8)));
  });
  if (lower) s += dot(fr.sx(lower[0]), fr.sy(lower[1]), C.green, 6, true);
  s += "</g>";
  s += lbl(fr.sx(start[0]) + 6, fr.sy(start[1]) - 8, `x${SUBS(0)}`, C.ink);
  return { svg: s, h: fr.bottom + 22 };
}

// ---------- backpropagation ----------

type BFn = "sigmoid" | "relu" | "tanh" | "exp" | "ln" | "sin" | "cos" | "sqrt" | "abs";
type BOp = "+" | "-" | "*" | "/" | "^";
type Ast = { k: "num"; v: number } | { k: "var"; name: string } | { k: "bin"; op: BOp; a: Ast; b: Ast } | { k: "neg"; a: Ast } | { k: "fn"; f: BFn; a: Ast };

const B_FNS: Record<string, BFn> = { sigmoid: "sigmoid", σ: "sigmoid", relu: "relu", tanh: "tanh", exp: "exp", ln: "ln", log: "ln", sin: "sin", cos: "cos", sqrt: "sqrt", abs: "abs" };
const MAX_NODES = 24;
const MAX_COLS = 8;

/** + − × ÷ ^, brackets, the functions above, and implicit products (2w, w x, w1x1): a name is one letter with an
 * optional index (w1, x_2), so wx is w times x. */
function readAst(src: string): Ast {
  const s = src.replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/²/g, "^2").replace(/³/g, "^3");
  type Tok = { t: "num" | "id" | "fn" | "op"; v: string };
  const toks: Tok[] = [];
  for (let i = 0; i < s.length; ) {
    const rest = s.slice(i);
    let m: RegExpExecArray | null;
    if (/^\s/.test(rest)) i++;
    else if ((m = /^(\d+\.?\d*|\.\d+)/.exec(rest))) (toks.push({ t: "num", v: m[0] }), (i += m[0].length));
    else if ((m = /^(sigmoid|relu|tanh|exp|ln|log|sin|cos|sqrt|abs|σ)(?=\s*\()/i.exec(rest))) (toks.push({ t: "fn", v: B_FNS[m[0].toLowerCase()] }), (i += m[0].length));
    // A function's name without its bracket is a mistake, not a product of letters.
    else if (/^(sigmoid|relu|tanh|exp|ln|log|sin|cos|sqrt|abs)/i.test(rest)) return fail(words.bad, { s: src.trim() });
    else if ((m = /^[a-z](_?\d+)?/i.exec(rest))) (toks.push({ t: "id", v: m[0].replace("_", "") }), (i += m[0].length));
    else if ("+-*/^()".includes(s[i])) (toks.push({ t: "op", v: s[i] }), i++);
    else return fail(words.bad, { s: src.trim() });
  }
  let i = 0;
  const bad = (): never => fail(words.bad, { s: src.trim() });
  const isOp = (v: string) => toks[i]?.t === "op" && toks[i].v === v;
  const startsAtom = () => !!toks[i] && (toks[i].t !== "op" || toks[i].v === "(");
  const expr = (): Ast => {
    let a = term();
    while (isOp("+") || isOp("-")) {
      const op = toks[i++].v as BOp;
      a = { k: "bin", op, a, b: term() };
    }
    return a;
  };
  const term = (): Ast => {
    let a = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = toks[i++].v as BOp;
        a = { k: "bin", op, a, b: unary() };
      } else if (startsAtom()) a = { k: "bin", op: "*", a, b: power() };
      else return a;
    }
  };
  const unary = (): Ast => (isOp("-") ? (i++, { k: "neg", a: unary() }) : power());
  const power = (): Ast => {
    const a = atom();
    return isOp("^") ? (i++, { k: "bin", op: "^", a, b: unary() }) : a;
  };
  const group = (): Ast => {
    if (!isOp("(")) bad();
    i++;
    const a = expr();
    if (!isOp(")")) bad();
    i++;
    return a;
  };
  const atom = (): Ast => {
    const tk = toks[i];
    if (!tk) return bad();
    if (tk.t === "num") return i++, { k: "num", v: Number(tk.v) };
    if (tk.t === "id") return i++, { k: "var", name: tk.v };
    if (tk.t === "fn") return i++, { k: "fn", f: tk.v as BFn, a: group() };
    return group();
  };
  const a = expr();
  if (i < toks.length) bad();
  return a;
}

const nameTex = (n: string) => n.replace(/^([a-z])(\d+)$/i, "$1_{$2}");
const FN_TEX_B: Record<BFn, (a: string) => string> = {
  sigmoid: (a) => `\\sigma\\left(${a}\\right)`, relu: (a) => `\\operatorname{ReLU}\\left(${a}\\right)`, tanh: (a) => `\\tanh\\left(${a}\\right)`,
  exp: (a) => `e^{${a}}`, ln: (a) => `\\ln\\left(${a}\\right)`, sin: (a) => `\\sin\\left(${a}\\right)`, cos: (a) => `\\cos\\left(${a}\\right)`,
  sqrt: (a) => `\\sqrt{${a}}`, abs: (a) => `\\left|${a}\\right|`,
};
/** The expression as it was typed, in TeX, with brackets only where the order of operations needs them. */
function astTex(a: Ast, outer = 0): string {
  const wrap = (s: string, level: number) => (level < outer ? `\\left(${s}\\right)` : s);
  switch (a.k) {
    case "num":
      return nt(a.v).replace("−", "-");
    case "var":
      return nameTex(a.name);
    case "fn":
      return FN_TEX_B[a.f](astTex(a.a));
    case "neg":
      return wrap(`-${astTex(a.a, 3)}`, 2);
    case "bin":
      if (a.op === "+" || a.op === "-") return wrap(`${astTex(a.a, 1)} ${a.op} ${astTex(a.b, 2)}`, 1);
      if (a.op === "/") return wrap(`\\frac{${astTex(a.a)}}{${astTex(a.b)}}`, 3);
      if (a.op === "*") return wrap(`${astTex(a.a, 2)}${a.a.k === "num" && a.b.k === "num" ? " \\cdot " : "\\,"}${astTex(a.b, 3)}`, 2);
      // A power as the base keeps its bracket: (x²)², not x²².
      return wrap(`${astTex(a.a, 5)}^{${astTex(a.b)}}`, 4);
  }
}

/** A node of the graph: an input, or an operation on the nodes in `args` (a constant is folded into its label). */
type GNode = {
  leaf: boolean;
  name: string;
  label: string;
  args: number[];
  fwd: (xs: number[]) => number;
  /** The local derivatives ∂node/∂arg, from the inputs' values and the node's own. */
  local: (xs: number[], self: number) => number[];
};

const sig = (t: number) => 1 / (1 + Math.exp(-t));
const FN_B: Record<BFn, { label: string; f: (t: number) => number; d: (t: number, self: number) => number }> = {
  sigmoid: { label: "σ", f: sig, d: (_, s) => s * (1 - s) },
  relu: { label: "ReLU", f: (t) => Math.max(0, t), d: (t) => (t > 0 ? 1 : 0) },
  tanh: { label: "tanh", f: Math.tanh, d: (_, s) => 1 - s * s },
  exp: { label: "exp", f: Math.exp, d: (_, s) => s },
  ln: { label: "ln", f: Math.log, d: (t) => 1 / t },
  sin: { label: "sin", f: Math.sin, d: (t) => Math.cos(t) },
  cos: { label: "cos", f: Math.cos, d: (t) => -Math.sin(t) },
  sqrt: { label: "√", f: Math.sqrt, d: (_, s) => 1 / (2 * s) },
  abs: { label: "|·|", f: Math.abs, d: (t) => Math.sign(t) },
};
const SYM: Record<BOp, string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" };
const BIN: Record<BOp, { f: (a: number, b: number) => number; d: (a: number, b: number, self: number) => [number, number] }> = {
  "+": { f: (a, b) => a + b, d: () => [1, 1] },
  "-": { f: (a, b) => a - b, d: () => [1, -1] },
  "*": { f: (a, b) => a * b, d: (a, b) => [b, a] },
  "/": { f: (a, b) => a / b, d: (a, b) => [1 / b, -a / (b * b)] },
  "^": { f: (a, b) => a ** b, d: (a, b, s) => [b * a ** (b - 1), s * Math.log(a)] },
};

/** The graph, children before parents, each input once however often it is used; the last node is the output. */
function buildGraph(ast: Ast): GNode[] {
  const nodes: GNode[] = [];
  const leaves = new Map<string, number>();
  const add = (n: Omit<GNode, "name">) => nodes.push({ ...n, name: "" }) - 1;
  type Built = { c: number } | { n: number };
  const build = (a: Ast): Built => {
    if (a.k === "num") return { c: a.v };
    if (a.k === "var") {
      if (!leaves.has(a.name)) leaves.set(a.name, add({ leaf: true, label: a.name, args: [], fwd: () => NaN, local: () => [] }));
      return { n: leaves.get(a.name)! };
    }
    if (a.k === "neg") {
      const x = build(a.a);
      return "c" in x ? { c: -x.c } : { n: add({ leaf: false, label: "−·", args: [x.n], fwd: ([t]) => -t, local: () => [-1] }) };
    }
    if (a.k === "fn") {
      const x = build(a.a);
      const F = FN_B[a.f];
      return "c" in x ? { c: F.f(x.c) } : { n: add({ leaf: false, label: F.label, args: [x.n], fwd: ([t]) => F.f(t), local: ([t], s) => [F.d(t, s)] }) };
    }
    const [x, y] = [build(a.a), build(a.b)];
    const op = BIN[a.op];
    if ("c" in x && "c" in y) return { c: op.f(x.c, y.c) };
    if ("n" in x && "n" in y) return { n: add({ leaf: false, label: SYM[a.op], args: [x.n, y.n], fwd: ([p, q]) => op.f(p, q), local: ([p, q], s) => op.d(p, q, s) }) };
    // One side is a number: a node with one input, the number in its label.
    if ("n" in x) {
      const c = (y as { c: number }).c;
      const label = a.op === "^" && (c === 2 || c === 3) ? `·${c === 2 ? "²" : "³"}` : `· ${SYM[a.op]} ${nt(c)}`;
      return { n: add({ leaf: false, label, args: [x.n], fwd: ([t]) => op.f(t, c), local: ([t], s) => [op.d(t, c, s)[0]] }) };
    }
    const c = x.c;
    return { n: add({ leaf: false, label: `${nt(c)} ${SYM[a.op]} ·`, args: [(y as { n: number }).n], fwd: ([t]) => op.f(c, t), local: ([t], s) => [op.d(c, t, s)[1]] }) };
  };
  const top = build(ast);
  if ("c" in top || !leaves.size) return fail(words.backprop.noInputs);
  // Names: the inputs keep theirs, the operations are u₁, u₂, … in the order they are worked out, the output is L.
  let k = 0;
  nodes.forEach((nd, i) => (nd.name = nd.leaf ? nd.label : i === nodes.length - 1 ? "L" : `u${SUBS(++k)}`));
  if (nodes.length > MAX_NODES) fail(words.backprop.tooBig, { n: MAX_NODES, c: MAX_COLS });
  return nodes;
}

/** Every node's value, inputs first. */
function forward(nodes: GNode[], values: Record<string, number>): number[] {
  const v: number[] = [];
  nodes.forEach((nd, i) => {
    v[i] = nd.leaf ? values[nd.label] : nd.fwd(nd.args.map((j) => v[j]));
    if (!Number.isFinite(v[i])) fail(words.backprop.notReal, { node: nd.name, label: nd.label });
  });
  return v;
}

/** Every node's gradient ∂L/∂node and every edge's local derivative, from the output back. */
function backward(nodes: GNode[], v: number[]): { grad: number[]; local: number[][] } {
  const grad = nodes.map((_, i) => (i === nodes.length - 1 ? 1 : 0));
  const local: number[][] = nodes.map(() => []);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const nd = nodes[i];
    if (nd.leaf) continue;
    local[i] = nd.local(nd.args.map((j) => v[j]), v[i]);
    if (!local[i].every(Number.isFinite)) fail(words.backprop.notReal, { node: nd.name, label: nd.label });
    nd.args.forEach((j, a) => (grad[j] += grad[i] * local[i][a]));
  }
  return { grad, local };
}

/** What a backprop picture shows, for the tests: each node's name, value and gradient, the inputs' gradients, the
 * numerical check of the one explained, and after a step the new values and the new L. */
export type BackpropData = {
  nodes: { name: string; label: string; value: number; grad: number }[];
  grads: Record<string, number>;
  explain: string;
  check: number;
  paths: number;
  step?: { values: Record<string, number>; loss: number };
};

function renderBackprop(main: string, opts: string[]): { svg: RenderedSvg; data: BackpropData } {
  const Bw = words.backprop;
  const ast = readAst(main.replace(/^L\s*=/i, ""));
  const nodes = buildGraph(ast);
  const inputs = nodes.filter((n) => n.leaf).map((n) => n.label);
  const values: Record<string, number> = {};
  let learn: string[] | undefined;
  let rate: number | undefined;
  let explain: string | undefined;
  const known = (v: string) => (inputs.includes(v) ? v : fail(Bw.notInput, { v }));
  for (const o of opts) {
    let m: RegExpExecArray | null;
    if ((m = /^(learn|explain)\s+(.+)$/i.exec(o))) {
      const vs = m[2].split(/[\s,]+/).filter(Boolean).map((v) => known(v.replace("_", "")));
      if (m[1].toLowerCase() === "learn") learn = vs;
      else if (vs.length === 1) explain = vs[0];
      else fail(Bw.badOpt, { s: o });
    } else if ((m = /^(?:rate|lr|eta|η)\s*=?\s*(.+)$/i.exec(o))) {
      rate = Number(m[1].replace("−", "-"));
      if (!(rate > 0)) fail(Bw.badRate);
    } else if (o.includes("=")) {
      for (const part of o.split(",")) {
        const a = /^\s*([a-z](?:_?\d+)?)\s*=\s*(.+?)\s*$/i.exec(part);
        if (!a) fail(Bw.badOpt, { s: part.trim() });
        const name = a![1].replace("_", "");
        if (!inputs.includes(name)) fail(Bw.extraValue, { v: name });
        const val = Number(a![2].replace("−", "-"));
        if (!Number.isFinite(val)) fail(Bw.badValue, { s: part.trim() });
        values[name] = val;
      }
    } else fail(Bw.badOpt, { s: o });
  }
  for (const v of inputs) if (!(v in values)) fail(Bw.noValue, { v });

  const v = forward(nodes, values);
  const { grad, local } = backward(nodes, v);
  const out = nodes.length - 1;
  const grads = Object.fromEntries(nodes.flatMap((n, i) => (n.leaf ? [[n.label, grad[i]]] : [])));
  explain ??= learn?.[0] ?? inputs[0];
  const ex = nodes.findIndex((n) => n.leaf && n.label === explain);

  // Every path from the explained input up to the output, as the edges (node, argument) it climbs.
  const parents: [number, number][][] = nodes.map(() => []);
  nodes.forEach((nd, i) => nd.args.forEach((j, a) => parents[j].push([i, a])));
  const paths: [number, number][][] = [];
  const climb = (j: number, path: [number, number][]) => {
    if (j === out) return void paths.push(path);
    for (const [i, a] of parents[j]) climb(i, [...path, [i, a]]);
  };
  climb(ex, []);
  const onPath = new Set(paths.flat().map(([i, a]) => `${i}:${a}`));

  // A numerical check of the explained input's gradient.
  const h = 1e-5;
  const at = (dv: number) => forward(nodes, { ...values, [explain]: values[explain] + dv })[out];
  const check = (at(h) - at(-h)) / (2 * h);

  const caps: Caption[] = [];
  caps.push({ text: fill(Bw.forward, { L: nt(v[out]) }) });
  caps.push({ text: Bw.backward, color: C.red });
  const d = (top: string, bottom: string) => `∂${top}/∂${bottom}`;
  if (paths.length && paths.length <= 4) {
    const sym = paths.map((p) => {
      const chain = [...p].reverse().map(([i], k, r) => d(nodes[i].name, k + 1 < r.length ? nodes[r[k + 1][0]].name : explain!));
      return chain.join(" · ");
    });
    const num = paths.map((p) => [...p].reverse().map(([i, a]) => term(local[i][a])).join(" · "));
    caps.push({ text: `${d("L", explain)} = ${sym.join(" + ")} = ${num.join(" + ")} = ${nt(grad[ex])}`, color: HI });
  } else caps.push({ text: fill(Bw.manyPaths, { v: explain, n: paths.length, g: nt(grad[ex]) }), color: HI });
  if (parents[ex].length > 1) caps.push({ text: fill(Bw.fanout, { v: explain, n: parents[ex].length }), color: HI });
  caps.push({ text: fill(Bw.check, { v: explain, n: nt(check) }), color: C.grey });
  nodes.forEach((nd, i) => {
    if (nd.label === "ReLU" && v[nd.args[0]] <= 0) caps.push({ text: fill(Bw.dead, { node: nd.name, a: nt(v[nd.args[0]]) }), color: C.purple });
    if (nd.label === "σ" && local[i][0] < 0.01) caps.push({ text: fill(Bw.saturated, { node: nd.name, a: nt(v[nd.args[0]]), d: nt(local[i][0]) }), color: C.purple });
  });
  if (inputs.length > 1) caps.push({ text: fill(Bw.grads, { list: inputs.map((n) => `${d("L", n)} = ${nt(grads[n])}`).join(", ") }) });

  let step: BackpropData["step"];
  if (learn || rate !== undefined) {
    const eta = rate ?? 0.1;
    const moved = { ...values };
    const which = learn ?? inputs;
    for (const n of which) moved[n] = values[n] - eta * grads[n];
    const loss = forward(nodes, moved)[out];
    step = { values: moved, loss };
    const moves = which.map((n) => `${n} = ${nt(values[n])} − ${nt(eta)} · ${term(grads[n])} = ${nt(moved[n])}`).join(", ");
    caps.push({ text: fill(Bw.step, { eta: nt(eta), moves }), color: C.green });
    caps.push({ text: fill(loss <= v[out] ? Bw.lossDown : Bw.lossUp, { a: nt(v[out]), b: nt(loss) }), color: C.green });
  }

  const drawn = drawGraph(nodes, v, grad, local, onPath, ex);
  return {
    svg: compose(`L = ${astTex(ast)}`, drawn.svg, drawn.h, caps),
    data: { nodes: nodes.map((n, i) => ({ name: n.name, label: n.label, value: v[i], grad: grad[i] })), grads, explain, check, paths: paths.length, step },
  };
}

/** The graph left to right: inputs just before the first node they feed, each operation one column after its
 * latest input; rows as in a tree drawn from the output, nodes in a column kept apart. */
function drawGraph(nodes: GNode[], v: number[], grad: number[], local: number[][], onPath: Set<string>, ex: number): { svg: string; h: number } {
  const n = nodes.length;
  const depth: number[] = [];
  nodes.forEach((nd, i) => (depth[i] = nd.leaf ? 0 : 1 + Math.max(...nd.args.map((j) => depth[j]))));
  const col = depth.slice();
  nodes.forEach((nd, j) => {
    if (!nd.leaf) return;
    const feeds = nodes.flatMap((p, i) => (p.args.includes(j) ? [depth[i]] : []));
    // An input that feeds nothing is the whole expression.
    col[j] = feeds.length ? Math.min(...feeds) - 1 : 0;
  });
  const cols = Math.max(...col) + 1;
  if (cols > MAX_COLS) fail(words.backprop.tooBig, { n: MAX_NODES, c: MAX_COLS });
  // Rows: inputs take the next free row as a walk from the output meets them; an operation sits level with its inputs.
  const row: number[] = new Array(n).fill(NaN);
  let next = 0;
  const place = (i: number): number => {
    if (!Number.isNaN(row[i])) return row[i];
    if (nodes[i].leaf) return (row[i] = next++);
    const rs = nodes[i].args.map(place);
    return (row[i] = rs.reduce((a, b) => a + b, 0) / rs.length);
  };
  place(n - 1);
  for (let c = 0; c < cols; c++) {
    const ids = range(n).filter((i) => col[i] === c).sort((a, b) => row[a] - row[b]);
    ids.forEach((i, k) => k && (row[i] = Math.max(row[i], row[ids[k - 1]] + 1)));
  }
  const lo = Math.min(...row);
  const rows = Math.max(...row) - lo + 1;
  const gap = 26;
  const nw = Math.min(90, (W - 32 - (cols - 1) * gap) / cols);
  const step = cols > 1 ? (W - 32 - nw) / (cols - 1) : 0;
  const nh = 52;
  const rh = nh + 22;
  const X = (i: number) => 16 + col[i] * step + (cols === 1 ? (W - 32 - nw) / 2 : 0);
  const Y = (i: number) => 8 + (row[i] - lo) * rh;
  let s = "";
  nodes.forEach((nd, i) =>
    nd.args.forEach((j, a) => {
      const dup = nd.args.slice(0, a).filter((k) => k === j).length;
      const lit = onPath.has(`${i}:${a}`);
      const [x0, y0, x1, y1] = [X(j) + nw, Y(j) + nh / 2 + dup * 8, X(i), Y(i) + nh / 2 + dup * 8 + (nd.args.length > 1 ? (a ? 6 : -6) : 0)];
      s += arrow(x0, y0, x1 - 2, y1, lit ? HI : "#adb5bd", lit ? 2.4 : 1.6);
      s += lbl((x0 + x1) / 2, (y0 + y1) / 2 - 4, nt(local[i][a]), lit ? HI : C.grey, "middle", 11, false);
    }),
  );
  nodes.forEach((nd, i) => {
    const [x, y] = [X(i), Y(i)];
    const fillC = i === ex ? "#ffe8cc" : nd.leaf ? "#e7f5ff" : i === n - 1 ? "#fff3bf" : "#f8f9fa";
    const edge = i === ex ? HI : nd.leaf ? C.blue : "#868e96";
    s += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(nw)}" height="${nh}" rx="8" fill="${fillC}" stroke="${edge}" stroke-width="${i === ex ? 2.2 : 1.2}"/>`;
    const size = Math.min(12.5, Math.max(9.5, nw / 5.2));
    s += txt(x + nw / 2, y + 16, nd.leaf ? nd.name : `${nd.name}: ${nd.label}`, C.ink, size, "middle", "700");
    s += txt(x + nw / 2, y + 32, nt(v[i]), C.ink, size);
    s += txt(x + nw / 2, y + 47, nt(grad[i]), C.red, size, "middle", "700");
  });
  return { svg: s, h: 8 + rows * rh - 14 };
}

// ---------- softmax and cross-entropy ----------

const MAX_CLASSES = 10;
const MAX_TEMPS = 3;

/** What a softmax picture shows, for the tests: the scores, the temperatures, the probabilities at each, the target
 * as a distribution, the cross-entropy at each temperature and the gradient of the first. */
export type SoftmaxData = { logits: number[]; temps: number[]; probs: number[][]; target?: number[]; loss?: number[]; grad?: number[] };

/** softmax(z / T), with the largest score taken off first so that e^z cannot overflow. */
export function softmax(z: number[], T = 1): number[] {
  const s = z.map((v) => v / T);
  const m = Math.max(...s);
  const e = s.map((v) => Math.exp(v - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

/** −Σ yᵢ ln pᵢ, the terms with yᵢ = 0 left out (they add nothing, even where pᵢ is 0). */
const crossEntropy = (y: number[], p: number[]) => -y.reduce((s, yi, i) => s + (yi ? yi * Math.log(p[i]) : 0), 0);

function renderSoftmax(main: string, opts: string[]): { svg: RenderedSvg; data: SoftmaxData } {
  const Sw = words.softmax;
  const list = readList(/^\[/.test(main) ? main : `[${main}]`);
  if (!Array.isArray(list) || !list.every((v) => typeof v === "number") || list.length < 2 || list.length > MAX_CLASSES) fail(Sw.count, { max: MAX_CLASSES });
  const z = list as number[];
  const k = z.length;
  let labels = range(k).map(String);
  let temps = [1];
  let targetSrc: string | undefined;
  const nums = (s: string) => s.replace(/[[\]()]/g, " ").split(/[\s,]+/).filter(Boolean).map((v) => Number(v.replace("−", "-")));
  for (const o of opts) {
    const m = /^(labels|classes|target|y|temperature|temp|t)\b\s*=?\s*(.*)$/i.exec(o);
    if (!m) fail(Sw.badOpt, { s: o });
    const name = m![1].toLowerCase();
    if (name === "labels" || name === "classes") {
      const ls = m![2].split(/\s*,\s*|\s+/).filter(Boolean);
      if (ls.length !== k) fail(Sw.badLabels, { k });
      labels = ls;
    } else if (name === "temperature" || name === "temp" || name === "t") {
      const ts = nums(m![2]);
      if (!ts.length || ts.length > MAX_TEMPS || !ts.every((t) => t > 0)) fail(Sw.badTemp, { max: MAX_TEMPS });
      temps = ts;
    } else targetSrc = m![2].trim();
  }
  // A class is called by its label, or "class 2" when it has none.
  const named = labels.some((l, i) => l !== String(i));
  const call = (i: number) => (named ? labels[i] : fill(Sw.classN, { i }));
  // The target: a class by number or label, or a whole distribution.
  let y: number[] | undefined;
  if (targetSrc !== undefined) {
    const bad = (): never => fail(Sw.badTarget, { last: k - 1, k });
    const at = labels.indexOf(targetSrc);
    if (at >= 0 && named) y = z.map((_, i) => (i === at ? 1 : 0));
    else if (/^\d+$/.test(targetSrc)) {
      const c = Number(targetSrc);
      if (c >= k) bad();
      y = z.map((_, i) => (i === c ? 1 : 0));
    } else {
      const ys = nums(targetSrc);
      if (ys.length !== k || !ys.every((v) => v >= 0 && Number.isFinite(v)) || Math.abs(ys.reduce((a, b) => a + b, 0) - 1) > 1e-6) bad();
      y = ys;
    }
  }
  const probs = temps.map((T) => softmax(z, T));
  const p = probs[0];
  const T0 = temps[0];
  const hard = y && y.filter((v) => v === 1).length === 1 ? y.indexOf(1) : -1;
  const loss = y && probs.map((q) => crossEntropy(y!, q));
  // Comparing temperatures, a gradient at one of them would be misleading, so there is none.
  const many = temps.length > 1;
  const grad = y && !many ? p.map((v, i) => (v - y![i]) / T0) : undefined;

  const caps: Caption[] = [];
  const mx = Math.max(...z.map((v) => v / T0));
  const sum = z.reduce((a, v) => a + Math.exp(v / T0 - mx), 0);
  const top = p.indexOf(Math.max(...p));
  caps.push({ text: fill(Sw.normalise, { sum: nt(sum), m: nt(mx), label: call(top), p: nt(p[top]) }) });
  if (Math.max(...z.map((v) => Math.abs(v / T0))) > 709) caps.push({ text: fill(Sw.overflow, { m: nt(mx) }), color: C.red });
  if (k === 2) caps.push({ text: fill(Sw.two, { d: nt((z[0] - z[1]) / T0), p: nt(p[0]) }), color: C.grey });
  if (many || T0 !== 1) {
    if (!y) probs.forEach((q, j) => caps.push({ text: fill(Sw.temp, { t: nt(temps[j]), p: nt(Math.max(...q)), label: call(q.indexOf(Math.max(...q))) }), color: PATH[j] }));
    caps.push({ text: fill(Sw.temps, { k, u: nt(1 / k) }), color: C.grey });
  }
  if (y && loss) {
    if (hard >= 0) {
      probs.forEach((q, j) => caps.push({ text: fill(Sw.hard, { label: call(hard), p: nt(q[hard]), L: nt(loss[j]), t: many ? ` (T = ${nt(temps[j])})` : "" }), color: many ? PATH[j] : HI }));
      caps.push({ text: Sw.hardWhy, color: C.grey });
      if (p[hard] < 0.05 && p[top] > 0.8 && top !== hard) caps.push({ text: fill(Sw.confident, { label: call(top), p: nt(p[top]), L: nt(loss[0]) }), color: C.red });
    } else {
      const terms = y.flatMap((yi, i) => (yi ? [`${nt(yi)} · ln ${nt(p[i])}`] : [])).join(" + ");
      const H = crossEntropy(y, y);
      caps.push({ text: fill(Sw.soft, { terms, L: nt(loss[0]) }), color: HI });
      caps.push({ text: fill(Sw.entropy, { H: nt(H), kl: nt(loss[0] - H) }), color: C.grey });
    }
    caps.push({ text: fill(Sw.uniform, { k, u: nt(Math.log(k)) }), color: C.grey });
    const g = T0 === 1 ? "pᵢ − yᵢ" : `(pᵢ − yᵢ) / T, with T = ${nt(T0)}`;
    if (grad) caps.push({ text: fill(hard >= 0 ? Sw.gradient : Sw.gradientSoft, { g }), color: C.green });
  }

  const byT = T0 !== 1 || many ? " / T" : "";
  let tex = `p_i = \\frac{e^{z_i${byT}}}{\\sum_j e^{z_j${byT}}}`;
  if (y && loss) {
    tex += hard >= 0 ? `, \\quad L = -\\ln p_{${hard}}` : `, \\quad L = -\\sum_i y_i \\ln p_i`;
    if (!many) tex += hard >= 0 ? ` = -\\ln ${nt(p[hard])} = ${nt(loss[0])}` : ` = ${nt(loss[0])}`;
  }
  const drawn = drawSoftmax(z, labels, probs, temps, y, grad);
  return { svg: compose(tex, drawn.svg, drawn.h, caps), data: { logits: z, temps, probs, target: y, loss, grad } };
}

/** One row per class: its score, e^(z − max), its probability as a bar over the target's dashed one, and p − y. */
function drawSoftmax(z: number[], labels: string[], probs: number[][], temps: number[], y?: number[], grad?: number[]): { svg: string; h: number } {
  const many = temps.length > 1;
  const T0 = temps[0];
  const mx = Math.max(...z.map((v) => v / T0));
  const rowH = many ? 12 + 13 * temps.length : 30;
  const top = 34;
  const [bx, bw] = many ? [220, 340] : grad ? [262, 190] : [262, 300];
  const [gx, gw] = [566, 52];
  let s = "";
  const head = (x: number, t: string, anchor = "middle") => txt(x, 18, t, C.grey, 12.5, anchor, "700");
  s += head(16, "", "start") + head(120, "zᵢ") + (many ? "" : head(198, "e^(zᵢ − max)")) + head(bx, "pᵢ", "start");
  if (grad) s += head(gx, T0 === 1 ? "pᵢ − yᵢ" : "(pᵢ − yᵢ) / T");
  z.forEach((v, i) => {
    const yy = top + i * rowH;
    const on = y?.[i] === 1;
    if (on) s += `<rect x="8" y="${yy}" width="${W - 16}" height="${rowH - 4}" rx="6" fill="#fff4e6"/>`;
    s += txt(16, yy + rowH / 2 + 3, labels[i], on ? HI : C.ink, 13, "start", "700");
    s += txt(120, yy + rowH / 2 + 3, nt(v), C.ink, 12.5);
    if (!many) s += txt(198, yy + rowH / 2 + 3, nt(Math.exp(v / T0 - mx)), C.ink, 12.5);
    if (y && y[i] > 0) s += `<rect x="${bx}" y="${yy + 4}" width="${r2(bw * y[i])}" height="${rowH - 12}" fill="none" stroke="${HI}" stroke-width="1.6" stroke-dasharray="5 3"/>`;
    const h = (rowH - 12) / probs.length;
    probs.forEach((q, j) => {
      s += `<rect x="${bx}" y="${r2(yy + 4 + j * h)}" width="${r2(Math.max(1, bw * q[i]))}" height="${r2(h - 1)}" fill="${PATH[j]}" opacity="0.85"/>`;
      s += txt(bx + bw * q[i] + 5, yy + 4 + j * h + h / 2 + 4, nt(q[i], 3), PATH[j], many ? 10.5 : 12, "start");
    });
    if (grad) {
      const g = Math.max(-1, Math.min(1, grad[i] * T0));
      const [x0, x1] = [gx, gx + g * gw];
      s += `<rect x="${r2(Math.min(x0, x1))}" y="${yy + 6}" width="${r2(Math.abs(x1 - x0))}" height="${rowH - 16}" fill="${grad[i] < 0 ? C.green : C.red}" opacity="0.8"/>`;
      s += txt(g >= 0 ? gx - 4 : gx + 4, yy + rowH / 2 + 3, nt(grad[i], 3), grad[i] < 0 ? C.green : C.red, 11, g >= 0 ? "end" : "start");
    }
  });
  const bottom = top + z.length * rowH;
  s += `<line x1="${bx}" y1="${top - 2}" x2="${bx}" y2="${bottom}" stroke="#868e96" stroke-width="1.2"/>`;
  for (const t of [0, 0.5, 1]) s += txt(bx + bw * t, bottom + 14, String(t), C.grey, 11);
  if (grad) s += `<line x1="${gx}" y1="${top - 2}" x2="${gx}" y2="${bottom}" stroke="#868e96" stroke-width="1.2"/>`;
  if (many) s += temps.map((t, j) => txt(bx + 60 + j * 90, bottom + 32, `T = ${nt(t)}`, PATH[j], 12.5, "middle", "700")).join("");
  return { svg: s, h: bottom + (many ? 40 : 22) };
}

// ---------- the tool ----------

/** The main part of the input and what follows it after semicolons. */
function parts(spec: AiSpec, w: AiWords): [string, string[]] {
  words = w;
  const src = spec.src.trim();
  if (!src) throw new Error(w.need[spec.topic]);
  const [main, ...opts] = src.split(";").map((p) => p.trim());
  if (!main) throw new Error(w.need[spec.topic]);
  return [main, opts.filter(Boolean)];
}

export function renderAi(spec: AiSpec, w: AiWords): RenderedSvg {
  if (spec.topic === "ops") return buildOps(spec, w).svg;
  if (spec.topic === "descent") return buildDescent(spec, w).svg;
  if (spec.topic === "backprop") return buildBackprop(spec, w).svg;
  if (spec.topic === "softmax") return buildSoftmax(spec, w).svg;
  return buildAi(spec, w).svg;
}
export function buildAi(spec: AiSpec, w: AiWords): { svg: RenderedSvg; data: AiData } {
  return renderTensor(...parts(spec, w));
}
export function buildOps(spec: AiSpec, w: AiWords): { svg: RenderedSvg; data: OpsData } {
  return renderOps(...parts(spec, w));
}
export function buildDescent(spec: AiSpec, w: AiWords): { svg: RenderedSvg; data: DescentData } {
  return renderDescent(...parts(spec, w));
}
export function buildBackprop(spec: AiSpec, w: AiWords): { svg: RenderedSvg; data: BackpropData } {
  return renderBackprop(...parts(spec, w));
}
export function buildSoftmax(spec: AiSpec, w: AiWords): { svg: RenderedSvg; data: SoftmaxData } {
  return renderSoftmax(...parts(spec, w));
}

const S = (topic: AiTopic, src: string): AiSpec => ({ topic, src });
export const AI_PRESETS: { [K in AiTopic]: { label: string; spec: AiSpec }[] } = {
  tensor: [
    { label: "scalar 11", spec: S("tensor", "11") },
    { label: "vector [5, 3, 7]", spec: S("tensor", "[5, 3, 7]") },
    { label: "column vector 3 × 1", spec: S("tensor", "[[5], [1.5], [2]]") },
    { label: "matrix 2 × 3", spec: S("tensor", "[[4, 19, 8], [16, 3, 10]]") },
    { label: "rank 1, order 2", spec: S("tensor", "[[1, 2, 3], [2, 4, 6]]") },
    { label: "order 3: 2 × 3 × 4", spec: S("tensor", "2x3x4") },
    { label: "pick T[1, 2, 3]", spec: S("tensor", "2x3x4; T[1, 2, 3]") },
    { label: "an RGB image 3 × 4 × 4", spec: S("tensor", "3x4x4") },
    { label: "order 4: a batch 2 × 3 × 2 × 2", spec: S("tensor", "2x3x2x2; T[1, 0, 1, 1]") },
  ],
  ops: [
    { label: "reshape 2 × 3 × 4 → 4 × 6", spec: S("ops", "2x3x4; reshape 4x6") },
    { label: "reshape (3, −1)", spec: S("ops", "2x3x4; reshape(3, -1); [2, 5]") },
    { label: "flatten", spec: S("ops", "2x2x3; flatten") },
    { label: "transpose T.T", spec: S("ops", "[[1, 2, 3], [4, 5, 6]]; T") },
    { label: "image HWC → CHW: permute(2, 0, 1)", spec: S("ops", "4x4x3; permute 2 0 1; [1, 0, 2]") },
    { label: "sum over axis 0", spec: S("ops", "[[1, 2, 3], [4, 5, 6]]; sum axis 0") },
    { label: "mean over axis 1, keepdims", spec: S("ops", "[[1, 2, 3], [4, 5, 6]]; mean(axis=1, keepdims=True)") },
    { label: "max over the last axis", spec: S("ops", "2x3x4; max axis -1; [1, 2]") },
    { label: "broadcast (3, 1) + (4)", spec: S("ops", "[[0], [10], [20]] + [1, 2, 3, 4]; [2, 1]") },
    { label: "add a bias to a batch", spec: S("ops", "[[1, 2, 3], [4, 5, 6]] + [10, 20, 30]") },
    { label: "scale by a number", spec: S("ops", "2x3 * 10") },
    { label: "matrix product", spec: S("ops", "[[1, 2, 3], [4, 5, 6]] @ [[7, 8], [9, 10], [11, 12]]; [1, 0]") },
    { label: "matrix times vector", spec: S("ops", "[[1, 2], [3, 4], [5, 6]] @ [10, 1]") },
    { label: "dot product", spec: S("ops", "[1, 2, 3] @ [4, 5, 6]") },
    { label: "batched: (2, 2, 3) @ (3, 2)", spec: S("ops", "2x2x3 @ 3x2; [1, 0, 1]") },
  ],
  descent: [
    { label: "(x − 3)², η = 0.1", spec: S("descent", "(x - 3)^2; start 0; rate 0.1") },
    { label: "three rates: too small, good, too big", spec: S("descent", "(x - 3)^2; start 0; rate 0.02, 0.4, 1.05; steps 12") },
    { label: "η = 1 / f″: one step", spec: S("descent", "(x - 3)^2; start 0; rate 0.5; steps 3") },
    { label: "a local minimum", spec: S("descent", "x^4 - 3x^2 + x; start 1.5; rate 0.05") },
    { label: "stuck on a maximum", spec: S("descent", "x^4/4 - x^2; start 0") },
    { label: "a round bowl", spec: S("descent", "x^2 + y^2; start (4, 3); rate 0.2; steps 25") },
    { label: "a long valley zigzags", spec: S("descent", "x^2 + 10y^2; start (8, 1); rate 0.09") },
    { label: "momentum in the valley", spec: S("descent", "x^2 + 10y^2; start (8, 1); rate 0.05; momentum 0.5") },
    { label: "a saddle point", spec: S("descent", "x^2 - y^2; start (3, 0); rate 0.1") },
    { label: "Rosenbrock's banana", spec: S("descent", "(1 - x)^2 + 100(y - x^2)^2; start (-1.2, 1); rate 0.001; steps 100") },
  ],
  backprop: [
    { label: "the classic: (x + y) z", spec: S("backprop", "(x + y) z; x = -2, y = 5, z = -4") },
    { label: "one neuron, squared error", spec: S("backprop", "(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10; explain w") },
    { label: "and one step of gradient descent", spec: S("backprop", "(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10; learn w b; rate 0.01") },
    { label: "a sigmoid neuron", spec: S("backprop", "sigmoid(w1 x1 + w2 x2 + b); x1 = 1, x2 = -2, w1 = 0.5, w2 = 0.3, b = 0.1; explain w2") },
    { label: "sigmoid with log loss", spec: S("backprop", "-ln(sigmoid(w x + b)); x = 2, w = 0.5, b = -1; explain w") },
    { label: "a variable used twice", spec: S("backprop", "x y + x; x = 2, y = 3; explain x") },
    { label: "a dead ReLU", spec: S("backprop", "relu(w x + b); x = 1, w = -2, b = 1") },
    { label: "a saturated sigmoid", spec: S("backprop", "sigmoid(w x); x = 10, w = 1") },
    { label: "two layers", spec: S("backprop", "(v relu(w x + b) + c - y)^2; x = 1, w = 2, b = -0.5, v = 3, c = 0.5, y = 3; explain w") },
  ],
  softmax: [
    { label: "scores → probabilities", spec: S("softmax", "[2, 1, 0.1]") },
    { label: "cross-entropy: right class", spec: S("softmax", "[2, 1, 0.1]; labels cat, dog, bird; target cat") },
    { label: "cross-entropy: wrong class", spec: S("softmax", "[2, 1, 0.1]; labels cat, dog, bird; target bird") },
    { label: "confidently wrong", spec: S("softmax", "[8, 1, -2]; labels cat, dog, bird; target dog") },
    { label: "temperature 0.5, 1, 5", spec: S("softmax", "[2, 1, 0.1]; temperature 0.5, 1, 5; target 0") },
    { label: "a soft target (label smoothing)", spec: S("softmax", "[2, 1, 0.1]; target [0.8, 0.1, 0.1]") },
    { label: "two classes: the sigmoid", spec: S("softmax", "[1.5, 0]; target 0") },
    { label: "huge scores: subtract the max", spec: S("softmax", "[1000, 999, 990]; target 1") },
    { label: "ten digits", spec: S("softmax", "[0.2, -1, 3.1, 0.5, -0.3, 1.2, 0, -2, 2.4, 0.1]; target 8") },
  ],
};

/** What the tool opens on: a tensor with three axes says more than the first example, a single number. */
export const AI_DEFAULT: Record<AiTopic, AiSpec> = {
  tensor: S("tensor", "2x3x4"),
  ops: S("ops", "2x3x4; reshape 4x6"),
  descent: S("descent", "(x - 3)^2; start 0; rate 0.02, 0.4, 1.05; steps 12"),
  backprop: S("backprop", "(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10; explain w"),
  softmax: S("softmax", "[2, 1, 0.1]; labels cat, dog, bird; target cat"),
};
