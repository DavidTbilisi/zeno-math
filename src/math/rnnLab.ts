// The recurrent-network lab: one unit whose state h is carried from step to step, h_t = tanh(w·h_{t−1} + u·x_t), so
// after T steps it holds something of every input before. Drawn unrolled, the recurrence is a deep network of T layers
// sharing w and u. Training it backpropagates through time, and the gradient reaching step 1 from step T is a product
// of T − 1 factors w·tanh′: below 1 they make it vanish, above 1 (with no squashing) explode. A gated cell adds to its
// state instead, c_t = f·c_{t−1} + tanh(u·x_t), so with the forget gate f near 1 both the memory and the gradient last.
// Kept free of React so it can be tested on its own.
import type { GameBase } from "./ladder";
import { nf } from "./text";

/** The kind of cell: squashed by tanh, plain (linear), or gated (adding to its state). */
export type Cell = "tanh" | "linear" | "gated";
export const CELLS: Cell[] = ["tanh", "linear", "gated"];
/** The inputs: one pulse, a pulse then its opposite, one pulse and a long wait. */
export type SeqId = "pulse" | "flip" | "long";
export const SEQS: Record<SeqId, number[]> = {
  pulse: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  flip: [1, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0],
  long: [1, ...Array<number>(29).fill(0)],
};
export const SEQ_IDS = Object.keys(SEQS) as SeqId[];

export type Params = { cell: Cell; w: number; u: number; f: number };
/** The states h₁ … h_T from h₀ = 0. */
export function unroll(xs: number[], p: Params): number[] {
  const hs: number[] = [];
  let h = 0;
  for (const x of xs) {
    h = p.cell === "gated" ? p.f * h + Math.tanh(p.u * x) : p.cell === "linear" ? p.w * h + p.u * x : Math.tanh(p.w * h + p.u * x);
    hs.push(h);
  }
  return hs;
}
/** How much the last state moves when the state at step t does, ∂h_T/∂h_t, for t = 1 … T: a product of one factor
 * per step after t (w·tanh′ = w·(1 − h²), w, or f). */
export function gradients(xs: number[], p: Params): number[] {
  const hs = unroll(xs, p);
  const factor = (t: number) => (p.cell === "gated" ? p.f : p.cell === "linear" ? p.w : p.w * (1 - hs[t] * hs[t]));
  const g = Array<number>(hs.length).fill(1);
  for (let t = hs.length - 2; t >= 0; t--) g[t] = g[t + 1] * factor(t + 1);
  return g;
}

// ---------- the puzzles ----------

export type RnnGoal = { kind: "remember"; min: number } | { kind: "below"; max: number } | { kind: "gradient"; lo: number; hi: number } | { kind: "both"; min: number; grad: number };
export type RnnControl = "w" | "u" | "f";
export type RnnNotice = "state" | "overwrite" | "vanish" | "explode" | "gate";
export const RNN_NOTICES: RnnNotice[] = ["state", "overwrite", "vanish", "explode", "gate"];
export type RnnPuzzle = { seq: SeqId; start: Partial<LiveRnn>; controls: RnnControl[]; goal: RnnGoal; notice: RnnNotice };
export const RNN_LADDER: RnnPuzzle[] = [
  { seq: "pulse", start: { cell: "tanh", w: 0.5, u: 1, f: 0.5 }, controls: ["w"], goal: { kind: "remember", min: 0.5 }, notice: "state" },
  { seq: "flip", start: { cell: "tanh", w: 1.5, u: 1, f: 0.5 }, controls: ["u"], goal: { kind: "below", max: -0.4 }, notice: "overwrite" },
  { seq: "pulse", start: { cell: "tanh", w: 0.5, u: 1, f: 0.5 }, controls: ["w", "u"], goal: { kind: "gradient", lo: 0.1, hi: 10 }, notice: "vanish" },
  { seq: "pulse", start: { cell: "linear", w: 1.5, u: 0.2, f: 0.5 }, controls: ["w"], goal: { kind: "gradient", lo: 0.1, hi: 10 }, notice: "explode" },
  { seq: "long", start: { cell: "gated", w: 1, u: 1, f: 0.8 }, controls: ["f"], goal: { kind: "both", min: 0.5, grad: 0.7 }, notice: "gate" },
];

export type RnnSlip = "forgot" | "notBelow" | "vanished" | "exploded" | "gateLow";
export type RnnVerdict = { state: "won" } | { state: "lost"; why: RnnSlip; have: number; want: number };

/** The game's state: the cell, its weights w and u, the forget gate f, and free play's inputs. */
export type LiveRnn = GameBase<RnnNotice, { kind: "wrong"; why: RnnSlip }> & {
  mode: "puzzle" | "free";
  cell: Cell;
  w: number;
  u: number;
  f: number;
  seq: SeqId;
  tries: number;
  done: boolean;
};
export const RNN_START: LiveRnn = { mode: "puzzle", stage: 0, cell: "tanh", w: 0.5, u: 1, f: 0.5, seq: "pulse", tries: 0, done: false, said: null };
export const rnnPuzzle = (d: Pick<LiveRnn, "mode" | "stage">) => (d.mode === "puzzle" ? RNN_LADDER[d.stage] : null);
export const seqOf = (d: LiveRnn) => SEQS[rnnPuzzle(d)?.seq ?? d.seq];
export const controlsOf = (d: LiveRnn): RnnControl[] => rnnPuzzle(d)?.controls ?? (d.cell === "gated" ? ["u", "f"] : ["w", "u"]);
export const rnnStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
/** Weights move in tenths, the gate in hundredths. */
export const W_RANGE = { min: -2, max: 2, step: 0.1 };
export const U_RANGE = { min: 0, max: 4, step: 0.1 };
export const F_RANGE = { min: 0, max: 1, step: 0.01 };

export function judgeRnn(d: LiveRnn, g: RnnGoal): RnnVerdict {
  const xs = seqOf(d);
  const hs = unroll(xs, d);
  const last = hs[hs.length - 1];
  const g1 = Math.abs(gradients(xs, d)[0]);
  const lost = (why: RnnSlip, have: number, want: number): RnnVerdict => ({ state: "lost", why, have, want });
  switch (g.kind) {
    case "remember":
      return last >= g.min - 1e-9 ? { state: "won" } : lost("forgot", last, g.min);
    case "below":
      return last <= g.max + 1e-9 ? { state: "won" } : lost("notBelow", last, g.max);
    case "gradient":
      if (g1 < g.lo) return lost("vanished", g1, g.lo);
      return g1 <= g.hi ? { state: "won" } : lost("exploded", g1, g.hi);
    case "both":
      if (last < g.min - 1e-9) return lost("forgot", last, g.min);
      return g1 >= g.grad - 1e-9 ? { state: "won" } : lost("gateLow", g1, g.grad);
  }
}

// ---------- the picture ----------

export const RNN_PLOT = { w: 640, h: 420 };
const CHAIN = { left: 30, top: 34, w: 580 };
const PLOTS = { top: 200, h: 170 };
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const RED = "#e03131";
const PURPLE = "#9c36b5";
const GREY = "#868e96";
const INK = "#1e1e1e";
const r2 = (v: number) => Math.round(v * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type TextStyle = { size?: number; fill?: string; bold?: boolean; anchor?: "start" | "middle" | "end" };
const txt = (x: number, y: number, s: string, o: TextStyle = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 12}" fill="${o.fill ?? "#495057"}"${o.bold ? ` font-weight="700"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
export const num = (v: number) => (!Number.isFinite(v) ? "—" : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(1).replace("-", "−") : nf(v, 3).replace("-", "−"));
const tint = (hex: string, a: number) => `rgb(${[1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * a)).join(",")})`;

export type RnnWords = { unrolled: string; state: string; grad: string; steps: string; band: string };

/**
 * The recurrence unrolled: one circle per step, coloured by its state (orange above 0, blue below), its input under
 * it and an arrow to the next. Below: the state over the steps, and |∂h_T/∂h_t| on a log scale with the band from
 * 0.1 to 10 where gradients neither vanish nor explode.
 */
export function rnnSvg(d: LiveRnn, w: RnnWords): string {
  const xs = seqOf(d);
  const hs = unroll(xs, d);
  const gs = gradients(xs, d).map(Math.abs);
  const T = xs.length;
  const step = CHAIN.w / T;
  const r = Math.min(16, step * 0.36);
  let s = txt(CHAIN.left, CHAIN.top - 14, w.unrolled, { bold: true, size: 13 });
  hs.forEach((h, t) => {
    const cx = CHAIN.left + (t + 0.5) * step;
    const cy = CHAIN.top + 40;
    if (t < T - 1) s += `<line x1="${r2(cx + r)}" y1="${cy}" x2="${r2(cx + step - r - 3)}" y2="${cy}" stroke="${GREY}" stroke-width="1.5"/><polygon points="${r2(cx + step - r)},${cy} ${r2(cx + step - r - 6)},${cy - 3.5} ${r2(cx + step - r - 6)},${cy + 3.5}" fill="${GREY}"/>`;
    const a = Math.min(1, Math.abs(h));
    s += `<circle cx="${r2(cx)}" cy="${cy}" r="${r2(r)}" fill="${tint(h >= 0 ? ORANGE : BLUE, 0.08 + 0.8 * a)}" stroke="${INK}" stroke-width="1.2"/>`;
    if (step >= 30) s += txt(cx, cy + 4, nf(h, 2).replace("-", "−"), { anchor: "middle", size: 10, fill: a > 0.6 ? "#fff" : INK, bold: true });
    s += `<line x1="${r2(cx)}" y1="${cy + r + 18}" x2="${r2(cx)}" y2="${r2(cy + r + 3)}" stroke="${GREY}" stroke-width="1.2"/>`;
    if (step >= 16 || xs[t]) s += txt(cx, cy + r + 32, String(xs[t]).replace("-", "−"), { anchor: "middle", size: 11, fill: xs[t] ? INK : "#adb5bd", bold: !!xs[t] });
  });
  s += txt(CHAIN.left - 4, CHAIN.top + 44, "h", { anchor: "end", bold: true, fill: INK }) + txt(CHAIN.left - 4, CHAIN.top + 40 + r + 32, "x", { anchor: "end", bold: true, fill: INK });

  // The state over the steps.
  const half = (CHAIN.w - 40) / 2;
  const left = { left: CHAIN.left, top: PLOTS.top, w: half, h: PLOTS.h };
  const top = Math.max(1, ...hs.map(Math.abs)) * 1.1;
  const X = (box: typeof left, t: number) => box.left + (box.w * (t + 0.5)) / T;
  const Ys = (v: number) => left.top + left.h / 2 - (left.h / 2) * (v / top);
  s += txt(left.left, left.top - 8, w.state, { bold: true, size: 12.5 });
  s += `<rect x="${left.left}" y="${left.top}" width="${left.w}" height="${left.h}" fill="#fff" stroke="#dee2e6"/><line x1="${left.left}" y1="${r2(Ys(0))}" x2="${left.left + left.w}" y2="${r2(Ys(0))}" stroke="#adb5bd"/>`;
  s += `<polyline points="${hs.map((h, t) => `${r2(X(left, t))},${r2(Ys(h))}`).join(" ")}" fill="none" stroke="${PURPLE}" stroke-width="2.2"/>`;
  hs.forEach((h, t) => (s += `<circle cx="${r2(X(left, t))}" cy="${r2(Ys(h))}" r="2.6" fill="${PURPLE}"/>`));
  s += txt(left.left + 4, left.top + 12, num(top), { size: 9.5, fill: GREY }) + txt(left.left + 4, left.top + left.h - 4, num(-top), { size: 9.5, fill: GREY });
  s += txt(left.left + left.w, left.top + left.h + 14, w.steps, { anchor: "end", size: 10.5, fill: GREY });

  // The gradient back to each step, on a log scale from 10⁻⁶ to 10⁶.
  const right = { left: CHAIN.left + half + 40, top: PLOTS.top, w: half, h: PLOTS.h };
  const Yg = (v: number) => right.top + right.h / 2 - (right.h / 2) * (Math.max(-6, Math.min(6, Math.log10(Math.max(v, 1e-12)))) / 6);
  s += txt(right.left, right.top - 8, w.grad, { bold: true, size: 12.5 });
  s += `<rect x="${right.left}" y="${right.top}" width="${right.w}" height="${right.h}" fill="#fff" stroke="#dee2e6"/>`;
  s += `<rect x="${right.left}" y="${r2(Yg(10))}" width="${right.w}" height="${r2(Yg(0.1) - Yg(10))}" fill="#ebfbee"/>` + txt(right.left + right.w - 4, Yg(10) + 12, w.band, { anchor: "end", size: 9.5, fill: "#2f9e44" });
  for (const e of [-6, -3, 0, 3, 6]) s += txt(right.left - 4, Yg(10 ** e) + 4, e ? `10${e < 0 ? "⁻" : ""}${"⁰¹²³⁴⁵⁶"[Math.abs(e)]}` : "1", { anchor: "end", size: 9.5, fill: GREY });
  s += `<polyline points="${gs.map((g, t) => `${r2(X(right, t))},${r2(Yg(g))}`).join(" ")}" fill="none" stroke="${RED}" stroke-width="2.2"/>`;
  s += `<circle cx="${r2(X(right, 0))}" cy="${r2(Yg(gs[0]))}" r="5" fill="${RED}"/>` + txt(X(right, 0) + 8, Yg(gs[0]) - 6, num(gs[0]), { bold: true, fill: RED, size: 11 });
  s += txt(right.left + right.w, right.top + right.h + 14, w.steps, { anchor: "end", size: 10.5, fill: GREY });
  return s;
}
