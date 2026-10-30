// The convolution lab: a small kernel of weights slid over a signal or a picture of pixels; at every place it
// multiplies the pixels under it by its weights and adds them up, and the sums make a new picture, the feature map.
// An edge kernel lights up where brightness changes, a blur kernel averages, and a kernel fires most where the pixels
// look like it. Stride (how far it moves each time) and padding (a border of zeros) set the output's size,
// ⌊(n + 2p − k) / s⌋ + 1, and 2 × 2 max pooling keeps the strongest of every four. One kernel's few weights are used
// at every place, which is why a convolutional network finds a pattern wherever it is. Kept free of React so it can
// be tested on its own.
import type { GameBase } from "./ladder";
import { nf } from "./text";

export type Grid = number[][];
export type KernelId = "identity" | "blur" | "vertical" | "horizontal" | "diagonal" | "sharpen" | "step";
export const KERNELS: Record<KernelId, Grid> = {
  identity: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  blur: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]],
  vertical: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
  horizontal: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],
  diagonal: [[2, -1, -1], [-1, 2, -1], [-1, -1, 2]],
  sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
  step: [[-1, 1]],
};
/** The kernels a picture may be given (the 1-D step kernel is the first puzzle's own). */
export const PICKABLE = ["identity", "blur", "vertical", "horizontal", "diagonal", "sharpen"] as const;

/** A border of p zeros around a grid. */
export function padGrid(g: Grid, p: number): Grid {
  if (!p) return g;
  const w = g[0].length + 2 * p;
  const zeros = () => Array<number>(w).fill(0);
  return [...Array.from({ length: p }, zeros), ...g.map((r) => [...Array<number>(p).fill(0), ...r, ...Array<number>(p).fill(0)]), ...Array.from({ length: p }, zeros)];
}
/** The output's size along one side: ⌊(n + 2p − k) / s⌋ + 1 (0 when the kernel does not fit). */
export const outSize = (n: number, k: number, s: number, p: number) => Math.max(0, Math.floor((n + 2 * p - k) / s) + 1);
/** Slide the kernel over the padded grid with the stride: at each place, the sum of pixel × weight. */
export function convolve(g: Grid, k: Grid, s: number, p: number): Grid {
  const pg = padGrid(g, p);
  const [oh, ow] = [outSize(g.length, k.length, s, p), outSize(g[0].length, k[0].length, s, p)];
  return Array.from({ length: oh }, (_, i) => Array.from({ length: ow }, (_, j) => k.reduce((sum, row, a) => sum + row.reduce((t, wt, b) => t + wt * pg[i * s + a][j * s + b], 0), 0)));
}
/** 2 × 2 max pooling: the largest of every block of four (an odd last row or column is dropped). */
export function maxPool(g: Grid): Grid {
  const [h, w] = [Math.floor(g.length / 2), Math.floor((g[0]?.length ?? 0) / 2)];
  return Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => Math.max(g[2 * i][2 * j], g[2 * i][2 * j + 1], g[2 * i + 1][2 * j], g[2 * i + 1][2 * j + 1])));
}
export const blank = (h: number, w: number): Grid => Array.from({ length: h }, () => Array<number>(w).fill(0));
const bar = (): Grid => Array.from({ length: 8 }, () => [0, 0, 0, 1, 1, 0, 0, 0]);

// ---------- the puzzles ----------

export type ConvGoal = { kind: "pick"; at: [number, number] } | { kind: "kernel"; id: KernelId } | { kind: "size"; h: number; w: number } | { kind: "fires"; min: number; places: number };
export type ConvControl = "select" | "kernel" | "stride" | "pad" | "paint" | "pool";
export type ConvNotice = "slide" | "edges" | "size" | "template" | "sharing";
export const CONV_NOTICES: ConvNotice[] = ["slide", "edges", "size", "template", "sharing"];
export type ConvPuzzle = { start: Partial<LiveConv>; controls: ConvControl[]; goal: ConvGoal; notice: ConvNotice };
const BASE: Partial<LiveConv> = { stride: 1, pad: 0, pool: false, sel: null };
export const CONV_LADDER: ConvPuzzle[] = [
  { start: { ...BASE, img: [[0, 0, 0, 1, 1, 1, 1, 0, 0, 0]], kernel: "step" }, controls: ["select"], goal: { kind: "pick", at: [0, 2] }, notice: "slide" },
  { start: { ...BASE, img: bar(), kernel: "blur" }, controls: ["kernel", "select"], goal: { kind: "kernel", id: "vertical" }, notice: "edges" },
  { start: { ...BASE, img: bar(), kernel: "vertical" }, controls: ["stride", "pad", "select"], goal: { kind: "size", h: 4, w: 4 }, notice: "size" },
  { start: { ...BASE, img: blank(8, 8), kernel: "diagonal" }, controls: ["paint", "select"], goal: { kind: "fires", min: 6, places: 1 }, notice: "template" },
  { start: { ...BASE, img: blank(8, 8), kernel: "diagonal" }, controls: ["paint", "select"], goal: { kind: "fires", min: 6, places: 2 }, notice: "sharing" },
];

export type ConvSlip = "notPicked" | "notMax" | "wrongKernel" | "wrongSize" | "tooWeak" | "tooFew";
export type ConvVerdict = { state: "won" } | { state: "lost"; why: ConvSlip; have: number; want: number };

/** The game's state: the picture, the kernel, the stride and padding, whether the output is pooled, and the output
 * cell picked (its window is shown over the input). */
export type LiveConv = GameBase<ConvNotice, { kind: "wrong"; why: ConvSlip }> & {
  mode: "puzzle" | "free";
  img: Grid;
  kernel: KernelId;
  stride: number;
  pad: number;
  pool: boolean;
  sel: [number, number] | null;
  tries: number;
  done: boolean;
};
export const CONV_START: LiveConv = { mode: "puzzle", stage: 0, img: CONV_LADDER[0].start.img!, kernel: "step", stride: 1, pad: 0, pool: false, sel: null, tries: 0, done: false, said: null };
export const convPuzzle = (d: Pick<LiveConv, "mode" | "stage">) => (d.mode === "puzzle" ? CONV_LADDER[d.stage] : null);
export const controlsOf = (d: LiveConv): ConvControl[] => convPuzzle(d)?.controls ?? ["kernel", "stride", "pad", "paint", "pool", "select"];
export const convStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
export const outputOf = (d: LiveConv) => convolve(d.img, KERNELS[d.kernel], d.stride, d.pad);
/** The places where the output reaches `min`, counted once per 3 × 3 neighbourhood (a pattern lights up its neighbours a little too). */
export function firing(out: Grid, min: number): [number, number][] {
  const hits: [number, number][] = [];
  out.forEach((row, i) => row.forEach((v, j) => v >= min - 1e-9 && hits.push([i, j])));
  const kept: [number, number][] = [];
  for (const h of hits) if (!kept.some((k) => Math.abs(k[0] - h[0]) <= 2 && Math.abs(k[1] - h[1]) <= 2)) kept.push(h);
  return kept;
}

export function judgeConv(d: LiveConv, g: ConvGoal): ConvVerdict {
  const out = outputOf(d);
  const lost = (why: ConvSlip, have: number, want: number): ConvVerdict => ({ state: "lost", why, have, want });
  switch (g.kind) {
    case "pick": {
      if (!d.sel) return lost("notPicked", 0, 1);
      const v = out[d.sel[0]]?.[d.sel[1]] ?? NaN;
      const top = Math.max(...out.flat());
      return d.sel[0] === g.at[0] && d.sel[1] === g.at[1] ? { state: "won" } : lost("notMax", v, top);
    }
    case "kernel":
      return d.kernel === g.id ? { state: "won" } : lost("wrongKernel", 0, 0);
    case "size": {
      const [h, w] = [out.length, out[0]?.length ?? 0];
      return h === g.h && w === g.w ? { state: "won" } : lost("wrongSize", h, g.h);
    }
    case "fires": {
      const top = Math.max(...out.flat());
      if (top < g.min - 1e-9) return lost("tooWeak", top, g.min);
      const n = firing(out, g.min).length;
      return n >= g.places ? { state: "won" } : lost("tooFew", n, g.places);
    }
  }
}

// ---------- the picture ----------

export const CONV_PLOT = { w: 640, h: 420 };
export const INPUT = { left: 24, top: 40, size: 260 };
const KER = { left: 300, top: 40, cell: 26 };
export const OUTPUT = { left: 400, top: 40, size: 220 };
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const RED = "#e03131";
const GREY = "#868e96";
const INK = "#1e1e1e";
const r2 = (v: number) => Math.round(v * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type TextStyle = { size?: number; fill?: string; bold?: boolean; anchor?: "start" | "middle" | "end" };
const txt = (x: number, y: number, s: string, o: TextStyle = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 12}" fill="${o.fill ?? "#495057"}"${o.bold ? ` font-weight="700"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
/** A weight or a sum for a cell: whole numbers as they are, others to two places (a ninth as 1/9). */
export const cellText = (v: number) => (Math.abs(v - 1 / 9) < 1e-9 ? "1/9" : Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)).replace("-", "−") : nf(v, 2).replace("-", "−"));
const tint = (hex: string, a: number) => `rgb(${[1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * a)).join(",")})`;

/** The cell size of a grid drawn into a square box (a single row gets the width's share). */
export const cellOf = (g: Grid, size: number) => Math.min(size / Math.max(1, g[0]?.length ?? 1), size / Math.max(1, g.length), 34);
/** The input's cell size: its padded grid fits the box. */
export const inputCell = (d: Pick<LiveConv, "img" | "pad">) => cellOf(padGrid(d.img, d.pad), INPUT.size);
/** The output cell under a page point, or null. */
export function outputCellAt(out: Grid, px: number, py: number): [number, number] | null {
  const c = cellOf(out.length ? out : [[0]], OUTPUT.size);
  const [i, j] = [Math.floor((py - OUTPUT.top) / c), Math.floor((px - OUTPUT.left) / c)];
  return i >= 0 && j >= 0 && i < out.length && j < (out[0]?.length ?? 0) ? [i, j] : null;
}
/** The input pixel under a page point (inside the padding), or null. */
export function pixelAt(d: Pick<LiveConv, "img" | "pad">, px: number, py: number): [number, number] | null {
  const c = inputCell(d);
  const [i, j] = [Math.floor((py - INPUT.top) / c) - d.pad, Math.floor((px - INPUT.left) / c) - d.pad];
  return i >= 0 && j >= 0 && i < d.img.length && j < d.img[0].length ? [i, j] : null;
}

export type ConvWords = { input: string; kernel: string; output: string; pooled: string; sum: string; size: string };

/**
 * The input (pixels dark where 1, the padding dashed around it), the kernel's weights, and the output map (orange for
 * positive sums, blue for negative); the output cell picked is framed, with its window framed over the input and its
 * sum written out. When pooling, the pooled map is drawn small under the output.
 */
export function convSvg(d: LiveConv, w: ConvWords): string {
  const k = KERNELS[d.kernel];
  const out = outputOf(d);
  const p = d.pad;
  const [h, wd] = [d.img.length, d.img[0].length];
  // The cells are sized so the padded grid fits the box.
  const ci = inputCell(d);
  let s = txt(INPUT.left, INPUT.top - 14, w.input, { bold: true, size: 13 });
  // Padding cells first, dashed, then the pixels.
  for (let i = -p; i < h + p; i++)
    for (let j = -p; j < wd + p; j++) {
      const [x, y] = [INPUT.left + (j + p) * ci, INPUT.top + (i + p) * ci];
      const inside = i >= 0 && j >= 0 && i < h && j < wd;
      const v = inside ? d.img[i][j] : 0;
      s += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(ci)}" height="${r2(ci)}" fill="${inside ? (v ? tint(INK, 0.15 + 0.7 * Math.min(1, v)) : "#fff") : "#f8f9fa"}" stroke="${inside ? "#ced4da" : "#dee2e6"}"${inside ? "" : ` stroke-dasharray="3 2"`}/>`;
      if (ci >= 22) s += txt(x + ci / 2, y + ci / 2 + 4, cellText(v), { anchor: "middle", size: 10, fill: v > 0.5 ? "#fff" : "#adb5bd" });
    }
  // The kernel.
  const kc = KER.cell;
  s += txt(KER.left, KER.top - 14, w.kernel, { bold: true, size: 13 });
  k.forEach((row, a) => row.forEach((v, b) => {
    const [x, y] = [KER.left + b * kc, KER.top + a * kc];
    s += `<rect x="${x}" y="${y}" width="${kc}" height="${kc}" fill="${v > 0 ? tint(ORANGE, Math.min(1, 0.15 + Math.abs(v) / 3)) : v < 0 ? tint(BLUE, Math.min(1, 0.15 + Math.abs(v) / 3)) : "#fff"}" stroke="${INK}"/>`;
    s += txt(x + kc / 2, y + kc / 2 + 4, cellText(v), { anchor: "middle", size: v === 1 / 9 ? 8.5 : 11, fill: INK, bold: true });
  }));
  s += txt(KER.left, KER.top + k.length * kc + 18, `s = ${d.stride}, p = ${d.pad}`, { size: 11.5 });
  // The output map.
  const co = cellOf(out.length ? out : [[0]], OUTPUT.size);
  s += txt(OUTPUT.left, OUTPUT.top - 14, `${w.output} ${out.length} × ${out[0]?.length ?? 0}`, { bold: true, size: 13 });
  const top = Math.max(1e-9, ...out.flat().map(Math.abs));
  out.forEach((row, i) => row.forEach((v, j) => {
    const [x, y] = [OUTPUT.left + j * co, OUTPUT.top + i * co];
    s += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(co)}" height="${r2(co)}" fill="${Math.abs(v) < 1e-9 ? "#fff" : tint(v > 0 ? ORANGE : BLUE, 0.12 + 0.7 * (Math.abs(v) / top))}" stroke="#ced4da"/>`;
    if (co >= 20) s += txt(x + co / 2, y + co / 2 + 4, cellText(v), { anchor: "middle", size: co >= 26 ? 10.5 : 9, fill: INK });
  }));
  // The picked cell, its window over the input and its sum.
  if (d.sel && out[d.sel[0]]?.[d.sel[1]] !== undefined) {
    const [i, j] = d.sel;
    s += `<rect x="${r2(OUTPUT.left + j * co)}" y="${r2(OUTPUT.top + i * co)}" width="${r2(co)}" height="${r2(co)}" fill="none" stroke="${RED}" stroke-width="3"/>`;
    s += `<rect x="${r2(INPUT.left + j * d.stride * ci)}" y="${r2(INPUT.top + i * d.stride * ci)}" width="${r2(k[0].length * ci)}" height="${r2(k.length * ci)}" fill="none" stroke="${RED}" stroke-width="3"/>`;
    const pg = padGrid(d.img, d.pad);
    const terms = k.flatMap((row, a) => row.map((wt, b) => [wt, pg[i * d.stride + a][j * d.stride + b]])).filter(([wt, v]) => wt !== 0 && v !== 0);
    const line = terms.length ? terms.slice(0, 6).map(([wt, v]) => `${cellText(wt)}·${cellText(v)}`).join(" + ") + (terms.length > 6 ? " + …" : "") : "0";
    s += txt(INPUT.left, INPUT.top + (h + 2 * p) * ci + 24, `${w.sum}: ${line} = ${cellText(out[i][j])}`, { bold: true, fill: RED, size: 12.5 });
  }
  s += txt(OUTPUT.left, OUTPUT.top + Math.max(co * out.length, 20) + 18, `${w.size}: ⌊(${wd} + 2·${d.pad} − ${k[0].length}) / ${d.stride}⌋ + 1 = ${out[0]?.length ?? 0}`, { size: 11, fill: GREY });
  if (d.pool && out.length >= 2) {
    const pooled = maxPool(out);
    const pc = Math.min(co, 22);
    const y0 = OUTPUT.top + co * out.length + 50;
    s += txt(OUTPUT.left, y0 - 8, `${w.pooled} ${pooled.length} × ${pooled[0]?.length ?? 0}`, { bold: true, size: 12 });
    pooled.forEach((row, i) => row.forEach((v, j) => {
      s += `<rect x="${r2(OUTPUT.left + j * pc)}" y="${r2(y0 + i * pc)}" width="${pc}" height="${pc}" fill="${Math.abs(v) < 1e-9 ? "#fff" : tint(v > 0 ? ORANGE : BLUE, 0.12 + 0.7 * (Math.abs(v) / top))}" stroke="#ced4da"/>`;
      if (pc >= 20) s += txt(OUTPUT.left + j * pc + pc / 2, y0 + i * pc + pc / 2 + 4, cellText(v), { anchor: "middle", size: 9, fill: INK });
    }));
  }
  return s;
}
