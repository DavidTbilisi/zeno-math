// Embeddings by hand, the board's lab: words as arrows from the origin of a plane, their tips dragged about. How alike
// two words are is the cosine of the angle between their arrows, which ignores how long they are, while the dot
// product counts length too; a word's nearest neighbours are the words whose arrows point most nearly its way; and an
// analogy such as king − man + woman is a point found by adding the arrow from man to woman onto king. Eight puzzles
// ask for two words alike, unrelated and opposite, an arrow twice as long that is still as alike, a query placed so
// that its two nearest words are given ones, queen placed where king − man + woman lands, woman placed so that one
// direction serves two analogies, and a query that scores high with one key and low with another, as attention does.
// Free play takes the words given and says, for one, two or three picked, their nearest words, how alike they are,
// or where their analogy lands. Kept free of React so it can be tested on its own.
import { nf } from "./text";
import type { GameBase } from "./ladder";

export type Pt = [number, number];
/** A word's arrow: the word (a key into the words of the page's language) and where its tip is. */
export type WordVec = { id: string; v: Pt };

export const WORD_IDS = ["cat", "dog", "kitten", "car", "up", "down", "apple", "banana", "cherry", "bread", "king", "queen", "man", "woman", "uncle", "aunt", "it", "mat"] as const;
export type WordId = (typeof WORD_IDS)[number];

/** An analogy a − b + c ≈ d. */
export type Analogy = [WordId, WordId, WordId, WordId];

/** What a puzzle asks: the cosine of a and b within min and max; b at least `ratio` times as long as a with a cosine
 * of at least `cos`; q's two nearest words, by cosine, to be `top`; every analogy to land within `tol` of its word;
 * or q's dot product with `hi` at least `min` and with `lo` at most `max`. */
export type EmbedGoal =
  | { kind: "cos"; a: WordId; b: WordId; min: number; max: number }
  | { kind: "long"; a: WordId; b: WordId; ratio: number; cos: number }
  | { kind: "nearest"; q: WordId; top: [WordId, WordId] }
  | { kind: "analogy"; list: Analogy[]; tol: number }
  | { kind: "dot"; q: WordId; hi: WordId; min: number; lo: WordId; max: number };

export type EmbedNotice = "alike" | "unrelated" | "opposite" | "length" | "search" | "analogy" | "direction" | "dot";
export const EMBED_NOTICES: EmbedNotice[] = ["alike", "unrelated", "opposite", "length", "search", "analogy", "direction", "dot"];

/** A puzzle: the words and where they start, which of them can be dragged, what is asked, and what doing it shows. */
export type EmbedPuzzle = { vecs: [WordId, Pt][]; drag: WordId[]; goal: EmbedGoal; notice: EmbedNotice };

export const EMBED_LADDER: EmbedPuzzle[] = [
  { vecs: [["cat", [2.5, 1]], ["dog", [-1, 2.5]]], drag: ["dog"], goal: { kind: "cos", a: "cat", b: "dog", min: 0.95, max: 1 }, notice: "alike" },
  { vecs: [["cat", [2, 2]], ["car", [2.5, 0.8]]], drag: ["car"], goal: { kind: "cos", a: "cat", b: "car", min: -0.1, max: 0.1 }, notice: "unrelated" },
  { vecs: [["up", [0.5, 3]], ["down", [2.5, 1]]], drag: ["down"], goal: { kind: "cos", a: "up", b: "down", min: -1, max: -0.95 }, notice: "opposite" },
  { vecs: [["cat", [1.5, 0.4]], ["kitten", [-0.5, 1.5]]], drag: ["kitten"], goal: { kind: "long", a: "cat", b: "kitten", ratio: 2, cos: 0.99 }, notice: "length" },
  {
    vecs: [["apple", [-2, -1]], ["banana", [3, 1]], ["cherry", [2, 2.5]], ["bread", [2.5, -1.5]], ["car", [-2, 2]], ["dog", [-1.5, -2.5]]],
    drag: ["apple"],
    goal: { kind: "nearest", q: "apple", top: ["banana", "cherry"] },
    notice: "search",
  },
  {
    vecs: [["man", [-2.5, -1.5]], ["woman", [-2.5, 0.5]], ["king", [2, -1]], ["queen", [-0.5, 3]]],
    drag: ["queen"],
    goal: { kind: "analogy", list: [["king", "man", "woman", "queen"]], tol: 0.3 },
    notice: "analogy",
  },
  {
    vecs: [["man", [-2.5, -1.5]], ["woman", [-3, 2.5]], ["king", [2, -1]], ["queen", [2, 1]], ["uncle", [0, -2.8]], ["aunt", [0, -0.8]]],
    drag: ["woman"],
    goal: { kind: "analogy", list: [["king", "man", "woman", "queen"], ["uncle", "man", "woman", "aunt"]], tol: 0.3 },
    notice: "direction",
  },
  { vecs: [["it", [0.5, 1]], ["cat", [2, 1]], ["mat", [-1, 2]]], drag: ["it"], goal: { kind: "dot", q: "it", hi: "cat", min: 4, lo: "mat", max: 0 }, notice: "dot" },
];

/** The view, ±4 both ways; how far in tips are kept, the step they snap to, and how near the origin they may come. */
export const VIEW = 4;
export const KEEP_IN = 3.8;
export const STEP = 0.1;
export const MIN_LEN = 0.3;

export const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
export const len = (a: Pt) => Math.hypot(a[0], a[1]);
/** The cosine of the angle between two arrows, 0 if either has no length. */
export const cosine = (a: Pt, b: Pt) => (len(a) && len(b) ? dot(a, b) / (len(a) * len(b)) : 0);
/** The angle between two arrows, in degrees. */
export const angleDeg = (a: Pt, b: Pt) => (Math.acos(Math.max(-1, Math.min(1, cosine(a, b)))) * 180) / Math.PI;
/** Where an analogy a − b + c lands. */
export const analogyPoint = (a: Pt, b: Pt, c: Pt): Pt => [a[0] - b[0] + c[0], a[1] - b[1] + c[1]];

/** A tip dragged to a point: snapped to the step and kept in the view, or null if it would come too near the origin. */
export function snapTip(p: Pt): Pt | null {
  const s = (v: number) => Math.round(Math.min(KEEP_IN, Math.max(-KEEP_IN, v)) / STEP) * STEP;
  const q: Pt = [Math.round(s(p[0]) * 10) / 10, Math.round(s(p[1]) * 10) / 10];
  return len(q) < MIN_LEN ? null : q;
}

/** The words nearest a point, by cosine, most alike first. */
export function nearest(vecs: WordVec[], to: Pt, skip: string[] = []): { id: string; cos: number }[] {
  return vecs
    .filter((w) => !skip.includes(w.id))
    .map((w) => ({ id: w.id, cos: cosine(w.v, to) }))
    .sort((a, b) => b.cos - a.cos);
}

const at = (vecs: WordVec[], id: string): Pt => vecs.find((w) => w.id === id)?.v ?? [0, 0];

export type EmbedSlip = "cos" | "direction" | "short" | "nearest" | "analogy" | "dotLow" | "dotHigh";
/** A try: done, or wrong and why, with what it had and what was wanted (and for nearest words, which they were). */
export type EmbedVerdict = { state: "won" } | { state: "lost"; why: EmbedSlip; have: number; want: number; names?: string[] };

export function judgeEmbed(p: EmbedPuzzle, vecs: WordVec[]): EmbedVerdict {
  const g = p.goal;
  const v = (id: string) => at(vecs, id);
  const lost = (why: EmbedSlip, have: number, want: number, names?: string[]): EmbedVerdict => ({ state: "lost", why, have, want, ...(names ? { names } : {}) });
  if (g.kind === "cos") {
    const c = cosine(v(g.a), v(g.b));
    return c >= g.min - 1e-9 && c <= g.max + 1e-9 ? { state: "won" } : lost("cos", c, c < g.min ? g.min : g.max);
  }
  if (g.kind === "long") {
    const c = cosine(v(g.a), v(g.b));
    const r = len(v(g.b)) / len(v(g.a));
    if (c < g.cos) return lost("direction", c, g.cos);
    return r >= g.ratio - 1e-9 ? { state: "won" } : lost("short", r, g.ratio);
  }
  if (g.kind === "nearest") {
    const top = nearest(vecs, v(g.q), [g.q]).slice(0, 2).map((n) => n.id);
    return g.top.every((t) => top.includes(t)) ? { state: "won" } : lost("nearest", 0, 0, top);
  }
  if (g.kind === "analogy") {
    const off = Math.max(...g.list.map(([a, b, c, d]) => len(sub(analogyPoint(v(a), v(b), v(c)), v(d)))));
    return off <= g.tol ? { state: "won" } : lost("analogy", off, g.tol);
  }
  const [hi, lo] = [dot(v(g.q), v(g.hi)), dot(v(g.q), v(g.lo))];
  if (hi < g.min - 1e-9) return lost("dotLow", hi, g.min);
  return lo <= g.max + 1e-9 ? { state: "won" } : lost("dotHigh", lo, g.max);
}
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];

/** Stars: done at the first try three, at the second two, else one. */
export const embedStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);

export type LiveEmbed = GameBase<EmbedNotice, { kind: "wrong"; why: EmbedSlip }> & {
  mode: "puzzle" | "free";
  vecs: WordVec[];
  /** Free play's picked words, the last three tapped. */
  sel: string[];
  /** Tries that failed on this puzzle, and whether it is done. */
  tries: number;
  done: boolean;
};

/** Free play's words. */
export const FREE_VECS: [WordId, Pt][] = [
  ["cat", [2.6, 1.2]],
  ["kitten", [1.6, 1]],
  ["dog", [2, 2.2]],
  ["car", [-2.6, 1.6]],
  ["man", [-1.5, -2]],
  ["woman", [-1.5, -0.2]],
  ["king", [1.8, -2.2]],
  ["queen", [1.8, -0.4]],
];
const toVecs = (list: [WordId, Pt][]): WordVec[] => list.map(([id, v]) => ({ id, v: [v[0], v[1]] }));
/** Where a try at a puzzle (or at free play) starts. */
export const embedStart = (p: EmbedPuzzle | null): WordVec[] => toVecs(p ? p.vecs : FREE_VECS);

export const EMBED_START: LiveEmbed = { mode: "puzzle", stage: 0, vecs: embedStart(EMBED_LADDER[0]), sel: [], tries: 0, done: false, said: null };

/** The puzzle being played, or null in free play. */
export const embedPuzzle = (d: Pick<LiveEmbed, "mode" | "stage">) => (d.mode === "puzzle" ? EMBED_LADDER[d.stage] : null);
/** Free play's picks, the last three, with a word tapped again let go. */
export const pick = (sel: string[], id: string) => (sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id].slice(-3));

// ---------- the readout ----------

/** A row of the readout: a label, the value as a bar on a scale from lo to hi, and whether it is where it should be. */
export type EmbedRow = { label: string; value: number; lo: number; hi: number; text: string; ok?: boolean };
export type EmbedWords = { names: Record<string, string>; ratio: string; off: string; picked: string; nearestTo: string; lands: string };

/** What the readout shows: for a puzzle, the numbers its goal is about; in free play, for the words picked, the
 * words nearest one, how alike two are, or where the analogy of three lands and the words nearest that. */
export function embedReadout(p: EmbedPuzzle | null, vecs: WordVec[], sel: string[], w: EmbedWords): { title?: string; rows: EmbedRow[] } {
  const v = (id: string) => at(vecs, id);
  const n = (id: string) => w.names[id] ?? id;
  const cosRow = (a: string, b: string, ok?: boolean): EmbedRow => {
    const c = cosine(v(a), v(b));
    return { label: `cos(${n(a)}, ${n(b)})`, value: c, lo: -1, hi: 1, text: `${num(c)} · ${Math.round(angleDeg(v(a), v(b)))}°`, ok };
  };
  if (p) {
    const g = p.goal;
    if (g.kind === "cos") {
      const c = cosine(v(g.a), v(g.b));
      return { rows: [cosRow(g.a, g.b, c >= g.min - 1e-9 && c <= g.max + 1e-9)] };
    }
    if (g.kind === "long") {
      const r = len(v(g.b)) / len(v(g.a));
      return { rows: [cosRow(g.a, g.b, cosine(v(g.a), v(g.b)) >= g.cos), { label: fill(w.ratio, { a: n(g.a), b: n(g.b) }), value: r, lo: 0, hi: 3, text: num(r), ok: r >= g.ratio - 1e-9 }] };
    }
    if (g.kind === "nearest") {
      const rank = nearest(vecs, v(g.q), [g.q]);
      return { title: fill(w.nearestTo, { q: n(g.q) }), rows: rank.map((r, i) => ({ ...cosRow(g.q, r.id), ok: i < 2 ? g.top.includes(r.id as WordId) : undefined })) };
    }
    if (g.kind === "analogy") {
      return {
        rows: g.list.map(([a, b, c, d]) => {
          const off = len(sub(analogyPoint(v(a), v(b), v(c)), v(d)));
          return { label: fill(w.off, { e: `${n(a)} − ${n(b)} + ${n(c)}`, d: n(d) }), value: off, lo: 0, hi: 4, text: num(off), ok: off <= g.tol };
        }),
      };
    }
    const row = (k: string, ok: boolean): EmbedRow => {
      const d = dot(v(g.q), v(k));
      return { label: `${n(g.q)} · ${n(k)}`, value: d, lo: -8, hi: 8, text: num(d), ok };
    };
    return { rows: [row(g.hi, dot(v(g.q), v(g.hi)) >= g.min - 1e-9), row(g.lo, dot(v(g.q), v(g.lo)) <= g.max + 1e-9)] };
  }
  const picked = sel.filter((id) => vecs.some((x) => x.id === id));
  if (picked.length === 0) return { title: w.picked, rows: [] };
  if (picked.length === 1) return { title: fill(w.nearestTo, { q: n(picked[0]) }), rows: nearest(vecs, v(picked[0]), picked).map((r) => cosRow(picked[0], r.id)) };
  if (picked.length === 2) {
    const [a, b] = picked;
    const d = dot(v(a), v(b));
    return { rows: [cosRow(a, b), { label: `${n(a)} · ${n(b)}`, value: d, lo: -16, hi: 16, text: num(d) }, ...[a, b].map((id) => ({ label: `|${n(id)}|`, value: len(v(id)), lo: 0, hi: 6, text: num(len(v(id))) }))] };
  }
  const [a, b, c] = picked;
  const x = analogyPoint(v(a), v(b), v(c));
  return {
    title: fill(w.lands, { e: `${n(a)} − ${n(b)} + ${n(c)}` }),
    rows: nearest(vecs, x, picked).map((r) => ({ label: n(r.id), value: len(sub(x, v(r.id))), lo: 0, hi: 8, text: num(len(sub(x, v(r.id)))) })).sort((p1, p2) => p1.value - p2.value),
  };
}
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

// ---------- the picture ----------

export const EMBED_PLOT = { w: 620, h: 404, left: 12, top: 12, size: 380 };
export const WORD_COLOURS: Record<string, string> = { fixed: "#495057", drag: "#1971c2", picked: "#e8590c" };
const GREEN = "#2f9e44";
const PURPLE = "#9c36b5";
const RED = "#e03131";
const r2 = (v: number) => Math.round(v * 100) / 100;

/** From the plane to the page and back. */
export const toPage = ([x, y]: Pt): Pt => [EMBED_PLOT.left + ((x + VIEW) / (2 * VIEW)) * EMBED_PLOT.size, EMBED_PLOT.top + ((VIEW - y) / (2 * VIEW)) * EMBED_PLOT.size];
export const fromPage = ([px, py]: Pt): Pt => [((px - EMBED_PLOT.left) / EMBED_PLOT.size) * 2 * VIEW - VIEW, VIEW - ((py - EMBED_PLOT.top) / EMBED_PLOT.size) * 2 * VIEW];

/** The analogies to draw: a puzzle's, or free play's when three words are picked. */
export function analogiesOf(p: EmbedPuzzle | null, sel: string[]): string[][] {
  if (p) return p.goal.kind === "analogy" ? p.goal.list : [];
  return sel.length === 3 ? [[...sel, ""]] : [];
}

/**
 * The picture: the plane with every word as an arrow from the origin, the ones that can be dragged ringed at the tip
 * and the picked ones in orange; the angle between the two words a puzzle compares, marked with its size; each
 * analogy a − b + c drawn as the arrow from b to c laid again from a's tip, landing on a hollow point; and on the
 * right the readout's rows as bars.
 */
export function embedSvg(vecs: WordVec[], o: { drag: string[]; sel: string[]; pair?: [string, string]; analogies: string[][]; readout: { title?: string; rows: EmbedRow[] }; names: Record<string, string> }): string {
  const { left, top, size } = EMBED_PLOT;
  const at2 = (p: Pt) => toPage(p).map(r2);
  const v = (id: string) => at(vecs, id);
  const n = (id: string) => o.names[id] ?? id;
  let s = `<rect x="${left}" y="${top}" width="${size}" height="${size}" fill="#fff" stroke="#dee2e6"/>`;
  for (let k = -VIEW + 1; k < VIEW; k++) {
    const [gx] = at2([k, 0]);
    const [, gy] = at2([0, k]);
    const stroke = k === 0 ? "#ced4da" : "#f1f3f5";
    s += `<line x1="${gx}" y1="${top}" x2="${gx}" y2="${top + size}" stroke="${stroke}"/><line x1="${left}" y1="${gy}" x2="${left + size}" y2="${gy}" stroke="${stroke}"/>`;
  }
  const [ox, oy] = at2([0, 0]);
  const arrow = (from: Pt, to: Pt, colour: string, width: number, extra = "") => {
    const [a, b] = [at2(from), at2(to)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < 1) return "";
    const [ux, uy] = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
    const head = Math.min(11, d / 2);
    return `<line x1="${a[0]}" y1="${a[1]}" x2="${r2(b[0] - ux * head * 0.7)}" y2="${r2(b[1] - uy * head * 0.7)}" stroke="${colour}" stroke-width="${width}" ${extra}/><path d="M${b[0]},${b[1]}L${r2(b[0] - ux * head - uy * head * 0.45)},${r2(b[1] - uy * head + ux * head * 0.45)}L${r2(b[0] - ux * head + uy * head * 0.45)},${r2(b[1] - uy * head - ux * head * 0.45)}z" fill="${colour}"/>`;
  };
  // The angle between the pair, as an arc near the origin.
  if (o.pair) {
    const [a, b] = o.pair.map(v);
    const [ta, tb] = [Math.atan2(a[1], a[0]), Math.atan2(b[1], b[0])];
    let d = tb - ta;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const R = 34;
    const steps = 24;
    let path = "";
    for (let i = 0; i <= steps; i++) {
      const t = ta + (d * i) / steps;
      path += `${i ? "L" : "M"}${r2(ox + R * Math.cos(t))},${r2(oy - R * Math.sin(t))}`;
    }
    const tm = ta + d / 2;
    s += `<path d="${path}" fill="none" stroke="${PURPLE}" stroke-width="2"/><text x="${r2(ox + (R + 16) * Math.cos(tm))}" y="${r2(oy - (R + 16) * Math.sin(tm) + 4)}" font-size="12" font-weight="700" fill="${PURPLE}" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${Math.round(angleDeg(a, b))}°</text>`;
  }
  // The analogies: b → c laid again from a's tip, landing on a hollow point.
  for (const [a, b, c, d] of o.analogies) {
    const x = analogyPoint(v(a), v(b), v(c));
    // Named unless it has landed on its word.
    const named = !d || len(sub(x, v(d))) > 0.3;
    s += arrow(v(b), v(c), GREEN, 2, `stroke-dasharray="5 4"`);
    s += arrow(v(a), x, GREEN, 2, `stroke-dasharray="5 4"`);
    const [px, py] = at2(x);
    const inside = Math.abs(x[0]) <= VIEW && Math.abs(x[1]) <= VIEW;
    if (inside) s += `<circle cx="${px}" cy="${py}" r="7" fill="#fff" stroke="${GREEN}" stroke-width="2.5"/>`;
    if (inside && named) s += `<text x="${px}" y="${r2(py + 21)}" font-size="11" font-weight="700" fill="${GREEN}" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${n(a)} − ${n(b)} + ${n(c)}</text>`;
  }
  // The words.
  for (const wv of vecs) {
    const colour = o.sel.includes(wv.id) ? WORD_COLOURS.picked : o.drag.includes(wv.id) ? WORD_COLOURS.drag : WORD_COLOURS.fixed;
    s += arrow([0, 0], wv.v, colour, o.sel.includes(wv.id) ? 3.5 : 2.5);
    const [tx, ty] = at2(wv.v);
    if (o.drag.includes(wv.id)) s += `<circle cx="${tx}" cy="${ty}" r="11" fill="none" stroke="${colour}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
    const L = len(wv.v);
    // The word past its tip, on the side the arrow points to, kept inside the frame (its width guessed from its length).
    const [lx, ly] = [tx + (wv.v[0] / L) * 16, ty - (wv.v[1] / L) * 16];
    const wide = n(wv.id).length * 7.6;
    const from = wv.v[0] / L > 0.35 ? lx : wv.v[0] / L < -0.35 ? lx - wide : lx - wide / 2;
    const x = Math.min(left + size - 3 - wide, Math.max(left + 3, from));
    s += `<text x="${r2(x)}" y="${r2(Math.min(top + size - 4, Math.max(top + 14, ly + 4)))}" font-size="13" font-weight="700" fill="${colour}" stroke="#fff" stroke-width="3" paint-order="stroke">${n(wv.id)}</text>`;
  }
  s += `<circle cx="${ox}" cy="${oy}" r="3" fill="#1e1e1e"/>`;
  // The readout.
  const x0 = left + size + 22;
  const width = EMBED_PLOT.w - x0 - 12;
  let y = top + 14;
  if (o.readout.title) {
    s += `<text x="${x0}" y="${y}" font-size="12" font-weight="700" fill="#495057">${o.readout.title}</text>`;
    y += 20;
  }
  for (const row of o.readout.rows.slice(0, 7)) {
    const colour = row.ok === true ? GREEN : row.ok === false ? RED : "#495057";
    s += `<text x="${x0}" y="${y}" font-size="12" fill="${colour}" font-weight="700">${row.label}</text>`;
    s += `<text x="${x0 + width}" y="${y + 15}" font-size="12" fill="${colour}" text-anchor="end">${row.text}</text>`;
    const zero = row.lo < 0 ? x0 + ((0 - row.lo) / (row.hi - row.lo)) * (width - 70) : x0;
    const end = x0 + ((Math.max(row.lo, Math.min(row.hi, row.value)) - row.lo) / (row.hi - row.lo)) * (width - 70);
    s += `<rect x="${x0}" y="${y + 6}" width="${width - 70}" height="10" fill="#f1f3f5"/>`;
    s += `<rect x="${r2(Math.min(zero, end))}" y="${y + 6}" width="${r2(Math.abs(end - zero))}" height="10" fill="${colour}" opacity="0.8"/>`;
    if (row.lo < 0) s += `<line x1="${r2(zero)}" y1="${y + 3}" x2="${r2(zero)}" y2="${y + 19}" stroke="#868e96"/>`;
    y += 44;
  }
  return s;
}

/** A number for the readout: up to two decimals, with a minus sign. */
export const num = (v: number) => (Math.abs(v) < 5e-3 ? "0" : nf(v, 2).replace(/^-/, "−"));
