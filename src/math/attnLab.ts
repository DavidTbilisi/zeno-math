// The attention lab: words as arrows (their keys) on a plane, and a query arrow dragged among them. Each word's score
// is the dot product of the query with its key, divided by √d; softmax turns the scores into weights that add up to 1,
// and the output is the weighted sum of the words' values (here, to draw them on the same plane, the values are the
// keys). Without the division the scores of long vectors grow like √d and softmax gives nearly all the weight to one
// word. Self-attention gives every word its own query: the weights make a matrix, a row per word. Attention alone
// cannot tell the order of the words, so position vectors are added first. And a transformer predicts the next word
// by comparing the last word's output with every word it knows. Kept free of React so it can be tested on its own.
import type { GameBase } from "./ladder";
import { nf } from "./text";

export type Pt = [number, number];
export const TOKEN_IDS = ["the", "cat", "sat", "on", "mat", "it", "animal", "crossed", "street", "because", "was", "tired", "dog", "bites", "man"] as const;
export type TokenId = (typeof TOKEN_IDS)[number];
/** A word in a sentence: its id, its key (also its value), and its own query for self-attention. */
export type Token = { id: TokenId; k: Pt; q: Pt };

export const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
export function softmax(xs: number[]): number[] {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
/** The scores of a query against keys: q · k grows like √(d/2) for vectors of d numbers like these, and is divided by √d when scaled. */
export const scores = (q: Pt, keys: Pt[], d: number, scaled: boolean) => keys.map((k) => (dot(q, k) * Math.sqrt(d / 2)) / (scaled ? Math.sqrt(d) : 1));
/** The weights and the output (the weighted sum of the values). */
export function attend(q: Pt, keys: Pt[], values: Pt[], d: number, scaled: boolean): { s: number[]; w: number[]; out: Pt } {
  const s = scores(q, keys, d, scaled);
  const w = softmax(s);
  return { s, w, out: values.reduce((o, v, i) => [o[0] + w[i] * v[0], o[1] + w[i] * v[1]] as Pt, [0, 0] as Pt) };
}
/** Position vectors: the i-th word's, added to its key and its query when positions are on. */
export const position = (i: number): Pt => [0.9 * Math.cos(1.1 * i), 0.9 * Math.sin(1.1 * i)];
const plus = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
/** The sentence as attention sees it: with positions added, or not. */
export const placed = (ts: Token[], pos: boolean): Token[] => (pos ? ts.map((t, i) => ({ ...t, k: plus(t.k, position(i)), q: plus(t.q, position(i)) })) : ts);
/** Self-attention: every word's query against every key; a row of weights per word. */
export const selfAttention = (ts: Token[], d: number, scaled: boolean) => ts.map((t) => attend(t.q, ts.map((u) => u.k), ts.map((u) => u.k), d, scaled));

const T = (id: TokenId, k: Pt, q: Pt = [0, 0]): Token => ({ id, k, q });
/** The words of the sentences, their keys and queries chosen by hand. */
export const SENTENCES = {
  cat: [T("the", [-1.5, 0.3]), T("cat", [2, 1.6]), T("sat", [0.4, 2.4]), T("on", [-0.6, -1.6]), T("mat", [2.2, -1])],
  animal: [T("the", [-1.4, 0.2], [0.3, 0.2]), T("animal", [2.1, 1.2], [0.2, 1.4]), T("crossed", [0.2, 2.2], [1.6, 0.4]), T("street", [1.8, -1.5], [0.4, 1.4]), T("because", [-1.2, -1.4], [0.8, 1.3]), T("it", [-0.4, 1.1], [2.2, 1.4]), T("was", [-1.8, -0.4], [-0.9, 0.9]), T("tired", [0.6, -2], [1.9, 1.1])],
  dogA: [T("dog", [1.8, 1.2], [0.5, 1.5]), T("bites", [-0.4, 2], [1.4, 0.6]), T("man", [1.4, -1.6], [-0.3, 1.2])],
  dogB: [T("man", [1.4, -1.6], [-0.3, 1.2]), T("bites", [-0.4, 2], [1.4, 0.6]), T("dog", [1.8, 1.2], [0.5, 1.5])],
  next: [T("the", [-1.5, 0.3]), T("cat", [2, 1.6]), T("sat", [0.4, 2.4]), T("on", [-0.6, -1.6]), T("the", [-1.5, 0.3])],
} satisfies Record<string, Token[]>;
export type SentenceId = keyof typeof SENTENCES;
/** The words the next-word puzzle chooses among, each with the vector its score is the output's dot product with. */
export const NEXT_WORDS: { id: TokenId; u: Pt }[] = [{ id: "mat", u: [-0.8, -2] }, { id: "cat", u: [1.6, 1.2] }, { id: "sat", u: [0.2, 2] }, { id: "dog", u: [1.8, 0.4] }];
export const nextProbs = (out: Pt) => softmax(NEXT_WORDS.map((n) => dot(out, n.u)));

// ---------- the puzzles ----------

export type AttnView = "query" | "matrix" | "order" | "next";
export type AttnGoal =
  | { kind: "weight"; on: number; min: number }
  | { kind: "spread"; max: number }
  | { kind: "cell"; row: number; col: number }
  | { kind: "order"; min: number }
  | { kind: "next"; word: TokenId; min: number };
export type AttnControl = "drag" | "scale" | "dims" | "select" | "positions";
export type AttnNotice = "softmax" | "scale" | "matrix" | "order" | "next";
export const ATTN_NOTICES: AttnNotice[] = ["softmax", "scale", "matrix", "order", "next"];
export type AttnPuzzle = { sentence: SentenceId; view: AttnView; start: Partial<LiveAttn>; controls: AttnControl[]; goal: AttnGoal; notice: AttnNotice };
const BASE: Partial<LiveAttn> = { q: [-2, -1], d: 2, scaled: true, pos: false, sel: null };
export const ATTN_LADDER: AttnPuzzle[] = [
  { sentence: "cat", view: "query", start: { ...BASE }, controls: ["drag"], goal: { kind: "weight", on: 1, min: 0.6 }, notice: "softmax" },
  { sentence: "cat", view: "query", start: { ...BASE, q: [1.5, 1.5], d: 64, scaled: false }, controls: ["scale"], goal: { kind: "spread", max: 0.75 }, notice: "scale" },
  { sentence: "animal", view: "matrix", start: { ...BASE }, controls: ["select"], goal: { kind: "cell", row: 5, col: 1 }, notice: "matrix" },
  { sentence: "dogA", view: "order", start: { ...BASE }, controls: ["positions"], goal: { kind: "order", min: 0.1 }, notice: "order" },
  { sentence: "next", view: "next", start: { ...BASE, q: [1, 1] }, controls: ["drag"], goal: { kind: "next", word: "mat", min: 0.5 }, notice: "next" },
];
export const DIMS = [2, 16, 64, 256];

export type AttnSlip = "weightLow" | "tooPeaked" | "notPicked" | "notMost" | "sameOrder" | "nextLow";
export type AttnVerdict = { state: "won" } | { state: "lost"; why: AttnSlip; have: number; want: number; word?: TokenId };

/** The game's state: the dragged query, d and whether scores are divided by √d, whether positions are added, and the
 * matrix cell picked; free play's view and sentence. */
export type LiveAttn = GameBase<AttnNotice, { kind: "wrong"; why: AttnSlip }> & {
  mode: "puzzle" | "free";
  q: Pt;
  d: number;
  scaled: boolean;
  pos: boolean;
  sel: [number, number] | null;
  view: AttnView;
  tries: number;
  done: boolean;
};
export const ATTN_START: LiveAttn = { mode: "puzzle", stage: 0, q: [-2, -1], d: 2, scaled: true, pos: false, sel: null, view: "query", tries: 0, done: false, said: null };
export const attnPuzzle = (d: Pick<LiveAttn, "mode" | "stage">) => (d.mode === "puzzle" ? ATTN_LADDER[d.stage] : null);
export const viewOf = (d: LiveAttn): AttnView => attnPuzzle(d)?.view ?? d.view;
const FREE_SENTENCE: Record<AttnView, SentenceId> = { query: "cat", matrix: "animal", order: "dogA", next: "next" };
export const sentenceOf = (d: LiveAttn): Token[] => SENTENCES[attnPuzzle(d)?.sentence ?? FREE_SENTENCE[d.view]];
export const controlsOf = (d: LiveAttn): AttnControl[] => attnPuzzle(d)?.controls ?? { query: ["drag", "scale", "dims"], matrix: ["select", "scale", "dims", "positions"], order: ["positions"], next: ["drag", "scale"] }[d.view] as AttnControl[];
export const attnStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
/** The query's attention over the sentence (the next-word view: the last word's dragged query). */
export const queryAttention = (d: LiveAttn) => {
  const ts = sentenceOf(d);
  return attend(d.q, ts.map((t) => t.k), ts.map((t) => t.k), d.d, d.scaled);
};
/** "bites" in both orders: its output each way, and how far apart the two are. */
export function orderOutputs(d: LiveAttn): { a: Pt; b: Pt; gap: number } {
  const out = (s: Token[]) => {
    const ts = placed(s, d.pos);
    const i = ts.findIndex((t) => t.id === "bites");
    return attend(ts[i].q, ts.map((t) => t.k), ts.map((t) => t.k), d.d, d.scaled).out;
  };
  const [a, b] = [out(SENTENCES.dogA), out(SENTENCES.dogB)];
  return { a, b, gap: Math.hypot(a[0] - b[0], a[1] - b[1]) };
}

export function judgeAttn(d: LiveAttn, g: AttnGoal): AttnVerdict {
  const lost = (why: AttnSlip, have: number, want: number, word?: TokenId): AttnVerdict => ({ state: "lost", why, have, want, ...(word ? { word } : {}) });
  const ts = sentenceOf(d);
  switch (g.kind) {
    case "weight": {
      const w = queryAttention(d).w[g.on];
      return w >= g.min - 1e-9 ? { state: "won" } : lost("weightLow", w, g.min, ts[g.on].id);
    }
    case "spread": {
      const top = Math.max(...queryAttention(d).w);
      return top <= g.max + 1e-9 ? { state: "won" } : lost("tooPeaked", top, g.max);
    }
    case "cell": {
      if (!d.sel) return lost("notPicked", 0, 0);
      return d.sel[0] === g.row && d.sel[1] === g.col ? { state: "won" } : lost("notMost", 0, 0, ts[g.row].id);
    }
    case "order": {
      const gap = orderOutputs(d).gap;
      return gap >= g.min ? { state: "won" } : lost("sameOrder", gap, g.min);
    }
    case "next": {
      const i = NEXT_WORDS.findIndex((n) => n.id === g.word);
      const p = nextProbs(queryAttention(d).out)[i];
      return p >= g.min - 1e-9 ? { state: "won" } : lost("nextLow", p, g.min, g.word);
    }
  }
}

// ---------- the picture ----------

export const ATTN_PLOT = { w: 640, h: 430 };
export const PLANE = { left: 24, top: 24, size: 360 };
export const VIEW = 3.5;
const SIDE = { left: 404, w: 226 };
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
export const num = (v: number) => (Number.isFinite(v) ? nf(v, 2) : "—");
/** A weight or chance to two places (anything under 0.005 is 0). */
export const share = (v: number) => (v < 0.005 ? "0" : v.toFixed(2));
const tint = (hex: string, a: number) => `rgb(${[1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * a)).join(",")})`;

export const toPage = (p: Pt): Pt => [PLANE.left + ((p[0] + VIEW) / (2 * VIEW)) * PLANE.size, PLANE.top + ((VIEW - p[1]) / (2 * VIEW)) * PLANE.size];
export const fromPage = (x: number, y: number): Pt => {
  const v: Pt = [((x - PLANE.left) / PLANE.size) * 2 * VIEW - VIEW, VIEW - ((y - PLANE.top) / PLANE.size) * 2 * VIEW];
  return [Math.round(Math.max(-3.4, Math.min(3.4, v[0])) * 10) / 10, Math.round(Math.max(-3.4, Math.min(3.4, v[1])) * 10) / 10];
};
/** The matrix's cells, for tapping: the side panel's grid. */
export const MATRIX = { left: SIDE.left + 58, top: 80, cell: 20 };
export function matrixCellAt(n: number, px: number, py: number): [number, number] | null {
  const [i, j] = [Math.floor((py - MATRIX.top) / MATRIX.cell), Math.floor((px - MATRIX.left) / MATRIX.cell)];
  return i >= 0 && j >= 0 && i < n && j < n ? [i, j] : null;
}

export type AttnWords = { tokens: Record<TokenId, string>; query: string; output: string; weights: string; scores: string; matrix: string; next: string; orderA: string; orderB: string; gap: string; scaled: string; unscaled: string };

function arrow(from: Pt, to: Pt, color: string, width: number, dash = false): string {
  const [a, b] = [toPage(from), toPage(to)];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const head = (s: number) => `${r2(b[0] - 10 * Math.cos(ang + s))},${r2(b[1] - 10 * Math.sin(ang + s))}`;
  return `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="6 4"` : ""}/><polygon points="${r2(b[0])},${r2(b[1])} ${head(0.4)} ${head(-0.4)}" fill="${color}"/>`;
}

/**
 * The plane: the words' keys as grey arrows labelled with the word (thicker as the query weighs them more), the query
 * in red and the output in purple. Beside it: the scores and weights as bars (the query view), the self-attention
 * matrix (the matrix view), "bites" in both orders (the order view), or the next word's chances.
 */
export function attnSvg(d: LiveAttn, w: AttnWords): string {
  const view = viewOf(d);
  const ts = view === "matrix" || view === "order" ? placed(sentenceOf(d), d.pos) : sentenceOf(d);
  let s = `<rect x="${PLANE.left}" y="${PLANE.top}" width="${PLANE.size}" height="${PLANE.size}" fill="#fff" stroke="#dee2e6"/>`;
  const [ox, oy] = toPage([0, 0]);
  s += `<line x1="${PLANE.left}" y1="${r2(oy)}" x2="${PLANE.left + PLANE.size}" y2="${r2(oy)}" stroke="#e9ecef"/><line x1="${r2(ox)}" y1="${PLANE.top}" x2="${r2(ox)}" y2="${PLANE.top + PLANE.size}" stroke="#e9ecef"/>`;
  // A label past an arrow's tip; the query's and the output's are moved off it sideways, so they do not sit on a word's.
  const label = (p: Pt, text: string, color: string, side = 0) => {
    const [x, y] = toPage(p);
    const out = Math.hypot(p[0], p[1]) || 1;
    const [nx, ny] = [-p[1] / out, p[0] / out];
    return txt(x + (p[0] / out) * 14 + nx * side, y - (p[1] / out) * 14 - ny * side + 4, text, { anchor: p[0] >= 0 ? "start" : "end", bold: true, fill: color, size: 12.5 });
  };
  const S = SIDE;
  if (view === "query" || view === "next") {
    const a = queryAttention(d);
    ts.forEach((t, i) => (s += arrow([0, 0], t.k, tint(INK, 0.25 + 0.75 * a.w[i]), 1.5 + 4 * a.w[i]) + label(t.k, w.tokens[t.id], INK)));
    s += arrow([0, 0], d.q, RED, 3) + label(d.q, w.query, RED, 16);
    s += arrow([0, 0], a.out, PURPLE, 3, true) + label(a.out, w.output, PURPLE, -16);
    // Scores and weights.
    s += txt(S.left, PLANE.top + 6, `${w.scores} · ${w.weights}`, { bold: true, size: 13 });
    s += txt(S.left, PLANE.top + 22, `d = ${d.d}, ${d.scaled ? w.scaled : w.unscaled}`, { size: 11, fill: GREY });
    ts.forEach((t, i) => {
      const y = PLANE.top + 44 + i * 30;
      s += txt(S.left, y + 12, w.tokens[t.id], { bold: true, fill: INK });
      s += txt(S.left + 70, y + 12, num(a.s[i]), { size: 11, fill: GREY });
      s += `<rect x="${S.left + 110}" y="${y + 2}" width="${S.w - 150}" height="13" fill="#f1f3f5"/><rect x="${S.left + 110}" y="${y + 2}" width="${r2((S.w - 150) * a.w[i])}" height="13" fill="${BLUE}"/>`;
      s += txt(S.left + S.w - 36, y + 13, share(a.w[i]), { bold: true, size: 11 });
    });
    if (view === "next") {
      const probs = nextProbs(a.out);
      const y0 = PLANE.top + 44 + ts.length * 30 + 20;
      s += txt(S.left, y0, w.next, { bold: true, size: 13 });
      NEXT_WORDS.forEach((n, i) => {
        const y = y0 + 12 + i * 26;
        s += txt(S.left, y + 12, w.tokens[n.id], { bold: true, fill: INK });
        s += `<rect x="${S.left + 70}" y="${y + 2}" width="${S.w - 110}" height="13" fill="#f1f3f5"/><rect x="${S.left + 70}" y="${y + 2}" width="${r2((S.w - 110) * probs[i])}" height="13" fill="${ORANGE}"/>`;
        s += txt(S.left + S.w - 36, y + 13, share(probs[i]), { bold: true, size: 11 });
      });
    }
  } else if (view === "matrix") {
    const rows = selfAttention(ts, d.d, d.scaled);
    const row = d.sel ? d.sel[0] : null;
    ts.forEach((t, i) => (s += arrow([0, 0], t.k, tint(INK, row === null ? 0.5 : 0.25 + 0.75 * rows[row].w[i]), row === null ? 2 : 1.5 + 4 * rows[row].w[i]) + label(t.k, w.tokens[t.id], INK)));
    if (row !== null) s += arrow([0, 0], ts[row].q, RED, 3) + label(ts[row].q, `${w.query}: ${w.tokens[ts[row].id]}`, RED, 16);
    const M = MATRIX;
    s += txt(S.left, PLANE.top + 6, w.matrix, { bold: true, size: 13 });
    ts.forEach((t, i) => {
      s += txt(M.left - 6, M.top + i * M.cell + 14, w.tokens[t.id], { anchor: "end", size: 10.5, fill: INK, bold: row === i });
      s += `<text x="${r2(M.left + i * M.cell + 13)}" y="${M.top - 6}" font-size="10" fill="${INK}" transform="rotate(-50 ${r2(M.left + i * M.cell + 13)} ${M.top - 6})">${esc(w.tokens[t.id])}</text>`;
      rows[i].w.forEach((v, j) => (s += `<rect x="${M.left + j * M.cell}" y="${M.top + i * M.cell}" width="${M.cell}" height="${M.cell}" fill="${tint(BLUE, 0.05 + 0.9 * v)}" stroke="#fff"/>`));
    });
    if (d.sel) s += `<rect x="${M.left + d.sel[1] * M.cell}" y="${M.top + d.sel[0] * M.cell}" width="${M.cell}" height="${M.cell}" fill="none" stroke="${RED}" stroke-width="2.5"/>` + txt(S.left, M.top + ts.length * M.cell + 22, `${w.weights}: ${num(rows[d.sel[0]].w[d.sel[1]])}`, { bold: true, fill: RED });
  } else {
    const o = orderOutputs(d);
    ts.forEach((t) => (s += arrow([0, 0], t.k, tint(INK, 0.5), 2) + label(t.k, w.tokens[t.id], INK)));
    s += arrow([0, 0], o.a, PURPLE, 3) + arrow([0, 0], o.b, ORANGE, 3, true);
    s += txt(S.left, PLANE.top + 6, w.output, { bold: true, size: 13 });
    s += `<line x1="${S.left}" y1="${PLANE.top + 26}" x2="${S.left + 24}" y2="${PLANE.top + 26}" stroke="${PURPLE}" stroke-width="3"/>` + txt(S.left + 30, PLANE.top + 30, w.orderA, { fill: PURPLE, bold: true });
    s += `<line x1="${S.left}" y1="${PLANE.top + 48}" x2="${S.left + 24}" y2="${PLANE.top + 48}" stroke="${ORANGE}" stroke-width="3" stroke-dasharray="6 4"/>` + txt(S.left + 30, PLANE.top + 52, w.orderB, { fill: ORANGE, bold: true });
    s += txt(S.left, PLANE.top + 80, `${w.gap} = ${num(o.gap)}`, { bold: true, fill: o.gap < 0.1 ? RED : INK });
  }
  return s;
}
