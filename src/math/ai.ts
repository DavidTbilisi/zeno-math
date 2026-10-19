// Math for AI, starting with tensors as NumPy and PyTorch see them: a box of numbers with a shape. A shape such as
// 2x3x4 (filled 1, 2, 3, … in memory order) or a nested list such as [[1, 2], [3, 4]] is drawn axis by axis — a
// scalar as one cell, a vector as a row, a matrix as a grid, an order-3 tensor as its slices with the box beside
// them, an order-4 one as rows of slices — with its order, shape, number of entries and strides, one entry picked out
// by its indices, and for a matrix its rank, which is a different thing from its order.
import { arrow, C, compose, esc, fill, FONT, nt, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";

export type AiTopic = "tensor";
export const AI_TOPICS: AiTopic[] = ["tensor"];
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
};

/** A tensor: its shape and its numbers in memory order (row-major, the last index changing fastest). */
export type Tensor = { shape: number[]; data: number[] };
/** What a picture shows, for the tests: the tensor, its strides, the entry picked and where it sits, a matrix's rank. */
export type AiData = { tensor: Tensor; strides: number[]; pick?: number[]; at?: number; rank?: number };

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

function readTensor(src: string): Tensor {
  const shape = readShape(src);
  const t = shape ? { shape, data: Array.from({ length: shape.reduce((a, b) => a * b, 1) }, (_, i) => i + 1) } : boxOf(readList(src));
  if (t.shape.includes(0)) fail(words.tensor.empty);
  if (t.shape.length > MAX_ORDER || t.shape.some((d) => d > MAX_AXIS) || t.data.length > MAX_ENTRIES)
    fail(words.tensor.tooBig, { order: MAX_ORDER, axis: MAX_AXIS, n: MAX_ENTRIES });
  return t;
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

const txt = (x: number, y: number, s: string, color: string, size: number, anchor = "middle", weight = "400", turn = "") =>
  `<text x="${r2(x)}" y="${r2(y)}" text-anchor="${anchor}" ${FONT} font-size="${r2(size)}" font-weight="${weight}" fill="${color}"${turn}>${esc(s)}</text>`;

/** A label running up the page beside a vertical arrow, so that a long word takes no room on the left. */
const upward = (x: number, y: number, s: string, color: string) => txt(x, y, s, color, 13, "middle", "700", ` transform="rotate(-90 ${r2(x)} ${r2(y)})"`);

/** A grid of cells with their numbers; `hi` is the cell to pick out. */
function grid(x: number, y: number, rows: number, cols: number, cs: number, value: ((r: number, c: number) => number) | null, tint: string, edge: string, hi?: [number, number]): string {
  let s = "";
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const on = hi && hi[0] === r && hi[1] === c;
      s += `<rect x="${r2(x + c * cs)}" y="${r2(y + r * cs)}" width="${r2(cs)}" height="${r2(cs)}" fill="${on ? HI : tint}" stroke="${edge}" stroke-width="${on ? 2.4 : 1.1}"/>`;
      if (!value) continue;
      const label = nt(value(r, c));
      const size = Math.min(15, cs * 0.42, (cs * 1.7) / Math.max(2, label.length));
      s += txt(x + (c + 0.5) * cs, y + (r + 0.5) * cs + size * 0.36, label, C.ink, size, "middle", on ? "700" : "400");
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

function drawScalar(t: Tensor): { svg: string; h: number } {
  const cs = 60;
  return { svg: grid((W - cs) / 2, 8, 1, 1, cs, () => t.data[0], TINT[0], EDGE[0]), h: cs + 16 };
}

function drawVector(t: Tensor, pick?: number[]): { svg: string; h: number } {
  const n = t.shape[0];
  const cs = Math.min(50, (W - 80) / n);
  const x = (W - n * cs) / 2;
  let s = indicesAcross(x, 14, n, cs, 12);
  s += grid(x, 22, 1, n, cs, (_, c) => t.data[c], TINT[0], EDGE[0], pick && [0, pick[0]]);
  const y = 22 + cs + 16;
  s += axisArrow(x, y, x + n * cs, y, axisName(0), C.blue, x + (n * cs) / 2, y + 20);
  return { svg: s, h: y + 30 };
}

function drawMatrix(t: Tensor, pick?: number[]): { svg: string; h: number } {
  const [rows, cols] = t.shape;
  const cs = Math.min(46, (W - 220) / cols, 300 / rows);
  const x = Math.max(150, (W - cols * cs) / 2);
  const y = 50;
  let s = axisArrow(x, 24, x + cols * cs, 24, axisName(1), C.orange, x + (cols * cs) / 2, 14);
  s += indicesAcross(x, y - 8, cols, cs, 12) + indicesDown(x - 8, y, rows, cs, 12);
  s += axisArrow(x - 30, y, x - 30, y + rows * cs, axisName(0), C.blue, x - 40, y + (rows * cs) / 2 + 5, "end");
  s += grid(x, y, rows, cols, cs, (r, c) => t.data[r * cols + c], TINT[0], EDGE[0], pick && [pick[0], pick[1]]);
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
function drawOrder3(t: Tensor, pick?: number[]): { svg: string; h: number } {
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
    s += txt(x + (d2 * cs) / 2, y + 14, `T[${i}]`, EDGE[i % EDGE.length], 13, "middle", "700");
    s += grid(x, y + 22, d1, d2, cs, (r, c) => t.data[i * d1 * d2 + r * d2 + c], TINT[i % TINT.length], EDGE[i % EDGE.length], pick && pick[0] === i ? [pick[1], pick[2]] : undefined);
  }
  const gy = 26 + 22;
  s += arrow(x0 - 12, gy, x0 - 12, gy + d1 * cs, C.orange, 2) + upward(x0 - 22, gy + (d1 * cs) / 2, axisName(1), C.orange);
  s += axisArrow(x0, gy + d1 * cs + 10, x0 + d2 * cs, gy + d1 * cs + 10, axisName(2), C.green, x0 + (d2 * cs) / 2, gy + d1 * cs + 28);
  const box = drawBox(t, boxRight, 34);
  const h = Math.max(26 + lines * lineH - 6, 34 + box.h + 10);
  return { svg: s + box.svg, h };
}

/** One line of slices T[i, 0], T[i, 1], … for each i. */
function drawOrder4(t: Tensor, pick?: number[]): { svg: string; h: number } {
  const [d0, d1, d2, d3] = t.shape;
  const gap = 18;
  const x0 = 110;
  const cs = Math.min(34, (W - x0 - 24 - (d1 - 1) * gap) / (d1 * d3), (440 / d0 - 44) / d2);
  const lineH = 22 + d2 * cs + 22;
  let s = axisArrow(x0, 12, x0 + d1 * d3 * cs + (d1 - 1) * gap, 12, axisName(1), C.orange, x0 - 8, 16, "end");
  for (let i = 0; i < d0; i++) {
    const y = 26 + i * lineH;
    s += txt(x0 - 14, y + 22 + (d2 * cs) / 2 + 5, `T[${i}]`, EDGE[i % EDGE.length], 13, "end", "700");
    for (let j = 0; j < d1; j++) {
      const x = x0 + j * (d3 * cs + gap);
      const on = pick && pick[0] === i && pick[1] === j;
      s += txt(x + (d3 * cs) / 2, y + 14, `T[${i}, ${j}]`, EDGE[i % EDGE.length], 12, "middle", "700");
      s += grid(x, y + 22, d2, d3, cs, (r, c) => t.data[((i * d1 + j) * d2 + r) * d3 + c], TINT[i % TINT.length], EDGE[i % EDGE.length], on ? [pick[2], pick[3]] : undefined);
    }
  }
  const h = 26 + d0 * lineH;
  s += axisArrow(30, 30, 30, h - 22, axisName(0), C.blue, 36, h - 6, "start");
  return { svg: s, h: h + 4 };
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
  for (const o of opts) {
    const m = /^T?\s*\[([^\]]*)\]$/i.exec(o);
    if (!m) fail(words.unknown, { s: o });
    const idx = m![1].split(/[\s,]+/).filter(Boolean);
    if (idx.length !== order || !idx.every((v) => /^\d+$/.test(v))) fail(T.pickCount, { n: order });
    pick = idx.map(Number);
    pick.forEach((v, k) => {
      if (v >= shape[k]) fail(T.pickRange, { i: v, k, m: shape[k] - 1 });
    });
  }

  const drawn = order === 0 ? drawScalar(t) : order === 1 ? drawVector(t, pick) : order === 2 ? drawMatrix(t, pick) : order === 3 ? drawOrder3(t, pick) : drawOrder4(t, pick);
  const space = `\\mathbb{R}^{${shape.join("\\times ")}}`;
  const entries = data.length;
  const tex = order === 0 ? `T = ${nt(data[0])} \\in \\mathbb{R}` : `T \\in ${space}` + (order > 1 ? `\\qquad ${shape.join(" \\cdot ")} = ${entries}` : "");

  const st = strides(shape);
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
  if (pick) {
    const at = (out.at = pick.reduce((a, v, k) => a + v * st[k], 0));
    const sum = pick.map((v, k) => `${v}·${st[k]}`).join(" + ");
    caps.push({ text: fill(T.pick, { idx: list(pick), v: nt(data[at]), sum: order > 1 ? `${sum} = ${at}` : String(at) }), color: HI });
  }
  return { svg: compose(tex, drawn.svg, drawn.h, caps), data: out };
}

// ---------- the tool ----------

export function renderAi(spec: AiSpec, w: AiWords): RenderedSvg {
  return buildAi(spec, w).svg;
}
export function buildAi(spec: AiSpec, w: AiWords): { svg: RenderedSvg; data: AiData } {
  words = w;
  const src = spec.src.trim();
  if (!src) throw new Error(w.need[spec.topic]);
  const [main, ...opts] = src.split(";").map((p) => p.trim());
  if (!main) throw new Error(w.need[spec.topic]);
  return renderTensor(main, opts.filter(Boolean));
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
};

/** What the tool opens on: a tensor with three axes says more than the first example, a single number. */
export const AI_DEFAULT: Record<AiTopic, AiSpec> = { tensor: S("tensor", "2x3x4") };
