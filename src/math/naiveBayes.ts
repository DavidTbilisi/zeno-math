// Naive Bayes, one step at a time: Bayes' rule as a classifier, P(c | words) ∝ P(c) · Π P(word | c), counted by hand
// on short messages of two classes (spam or not), with the "naive" assumption that the words are independent given
// the class written out; add-α smoothing, without which one word never seen in a class rules the class out; what the
// assumption does when the same evidence is counted again and again (the call stays, the confidence runs away); and
// Gaussian naive Bayes, a normal curve per class for a number. Words stay out of the LaTeX (MathJax cannot set every
// script): they are drawn in the table and the captions.
import { axes, C, compose, curve, esc, fill, FONT, lbl, makeFrame, nt, r2, texLines, tn, W, type Frame, type TexLine } from "./chart";
import { evalE, exprMessages, has, parseE, simp } from "./expr";
import type { RenderedSvg } from "./latex";

export type NbTopic = "text" | "smoothing" | "copies" | "gaussian";
export const NB_TOPICS: NbTopic[] = ["text", "smoothing", "copies", "gaussian"];
export type NbSpec = { topic: NbTopic; src: string[] };
export type NbField = "first" | "second" | "message" | "alpha" | "prior" | "px1" | "px2" | "copies" | "values1" | "values2" | "x";
export const NB_FIELDS: Record<NbTopic, NbField[]> = {
  text: ["first", "second", "message", "alpha"],
  smoothing: ["first", "second", "message"],
  copies: ["prior", "px1", "px2", "copies"],
  gaussian: ["values1", "values2", "x"],
};

export type NbWords = {
  bad: string;
  onlyX: string;
  tooBig: string;
  needMessages: string;
  needMessage: string;
  unknownAll: string;
  tooMany: string;
  needAlpha: string;
  needChance: string;
  needCopies: string;
  needValues: string;
  flat: string;
  needX: string;
  classes: string;
  text: { rule: string; priors: string; smooth: string; one: string; two: string; posterior: string; word: string; inOne: string; inTwo: string; summary: string; skipped: string };
  smoothing: { zero: string; smooth: string; curve: string; summary: string; never: string };
  copies: { truth: string; naive: string; curve: string; truthName: string; naiveName: string; summary: string };
  gaussian: { fit: string; densities: string; posterior: string; at: string; densTitle: string; postTitle: string; summary: string };
};

const MAX_MESSAGES = 30;
const MAX_VALUES = 60;

// ---------- reading ----------

/** A message's words: lower case, split at anything that is not a letter, a digit or an apostrophe. */
export const wordsOf = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean);
/** Messages separated by semicolons or new lines, each as its words. */
export function readMessages(s: string, w: NbWords): string[][] {
  const ms = (s ?? "").split(/[;\n]+/).map(wordsOf).filter((m) => m.length);
  if (!ms.length) throw new Error(w.needMessages);
  if (ms.length > MAX_MESSAGES) throw new Error(fill(w.tooMany, { n: MAX_MESSAGES }));
  return ms;
}
function readNum(s: string, w: NbWords): number {
  let v: number;
  try {
    const e = simp(parseE((s ?? "").trim()));
    if (has(e)) throw new Error(w.onlyX);
    v = evalE(e, 0);
  } catch (err) {
    throw new Error((err as Error).message === w.onlyX ? w.onlyX : fill(w.bad, { s: (s ?? "").trim() }));
  }
  if (!Number.isFinite(v)) throw new Error(fill(w.bad, { s }));
  return v;
}
function readNums(s: string, w: NbWords): number[] {
  const parts = (s ?? "").split(/[,;\s]+/).filter(Boolean);
  if (parts.length < 2) throw new Error(w.needValues);
  if (parts.length > MAX_VALUES) throw new Error(fill(w.tooMany, { n: MAX_VALUES }));
  return parts.map((p) => readNum(p, w));
}

// ---------- the model ----------

export type Counts = { docs: [number, number]; words: [Map<string, number>, Map<string, number>]; totals: [number, number]; vocab: string[] };
/** Counted from the two classes' messages: how many messages, how often each word, all words, and the vocabulary. */
export function countAll(one: string[][], two: string[][]): Counts {
  const tally = (ms: string[][]) => {
    const m = new Map<string, number>();
    ms.flat().forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
    return m;
  };
  const words: [Map<string, number>, Map<string, number>] = [tally(one), tally(two)];
  return { docs: [one.length, two.length], words, totals: [one.flat().length, two.flat().length], vocab: [...new Set([...one.flat(), ...two.flat()])].sort() };
}
/** P(word | class) with add-α smoothing: (count + α) / (all the class's words + α · vocabulary size). */
export const pWord = (c: Counts, k: 0 | 1, word: string, alpha: number) => ((c.words[k].get(word) ?? 0) + alpha) / (c.totals[k] + alpha * c.vocab.length);
export type Scores = { known: string[]; skipped: string[]; priors: [number, number]; scores: [number, number]; post: number };
/** The two classes' scores P(c) · Π P(word | c) over the message's known words (unknown ones are skipped), and
 * P(class 1 | message), NaN when both scores are 0. */
export function classify(c: Counts, message: string[], alpha: number): Scores {
  const known = message.filter((x) => c.vocab.includes(x));
  const skipped = message.filter((x) => !c.vocab.includes(x));
  const n = c.docs[0] + c.docs[1];
  const priors: [number, number] = [c.docs[0] / n, c.docs[1] / n];
  const scores = ([0, 1] as const).map((k) => known.reduce((s, x) => s * pWord(c, k, x, alpha), priors[k])) as [number, number];
  return { known, skipped, priors, scores, post: scores[0] + scores[1] > 0 ? scores[0] / (scores[0] + scores[1]) : NaN };
}
/** The same evidence counted k times: P(class 1 | x, …, x) = p·a^k / (p·a^k + (1 − p)·b^k). */
export const naiveCopies = (prior: number, a: number, b: number, k: number) => (prior * a ** k) / (prior * a ** k + (1 - prior) * b ** k);
const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const sd = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + (x - mean(v)) ** 2, 0) / v.length);
export const normalPdf = (x: number, m: number, s: number) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
/** Gaussian naive Bayes on one number: each class's mean and spread, its prior from its count, and P(class 1 | x). */
export function gaussFit(one: number[], two: number[]) {
  const [m, s] = [[mean(one), mean(two)], [sd(one), sd(two)]];
  const prior = one.length / (one.length + two.length);
  const post = (x: number) => {
    const [a, b] = [prior * normalPdf(x, m[0], s[0]), (1 - prior) * normalPdf(x, m[1], s[1])];
    return a + b > 0 ? a / (a + b) : x < (m[0] + m[1]) / 2 === m[0] < m[1] ? 1 : 0;
  };
  return { m, s, prior, post };
}

// ---------- drawing ----------

const title = (fr: Frame, text: string) => `<text x="${r2((fr.left + fr.right) / 2)}" y="${fr.top - 8}" ${FONT} font-size="13" font-weight="700" fill="#495057" text-anchor="middle">${esc(text)}</text>`;
const HALF = (W - 3 * 44) / 2;
const PH = 190;
function layout(rows: TexLine[], draw: (y: number) => { svg: string; h: number }) {
  const ln = texLines(rows, 4);
  const d = draw(4 + ln.h + 14);
  return { body: ln.svg + d.svg, h: 4 + ln.h + 14 + d.h };
}
/** A small probability in LaTeX: a decimal, or a × 10^k when it is tiny. */
function sci(v: number): string {
  if (v === 0) return "0";
  if (v >= 1e-3) return tn(v, 3);
  const e = Math.floor(Math.log10(v));
  return `${tn(v / 10 ** e, 3)} \\times 10^{${e}}`;
}
/** About six round ticks from lo to hi: steps of 1, 2 or 5 times a power of ten. */
function ticks(lo: number, hi: number) {
  const raw = (hi - lo) / 6;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw)!;
  const out: { v: number; label: string }[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push({ v, label: nt(Math.round(v / step) * step, 4) });
  return out;
}
/** A fraction a/b in LaTeX. */
const frac = (a: number, b: number) => `\\tfrac{${tn(a, 4)}}{${tn(b, 4)}}`;
const txt = (x: number, y: number, s: string, size: number, color: string, anchor = "start", bold = false) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${size}" fill="${color}" text-anchor="${anchor}"${bold ? ` font-weight="700"` : ""}>${esc(s)}</text>`;

/** The message's words in a table: counts in each class, P(word | c) for each, and a bar of their ratio. */
function wordTable(c: Counts, words: string[], alpha: number, w: NbWords, y: number): { svg: string; h: number } {
  const T = w.text;
  const rowH = 22;
  const cols = [44, 190, 260, 330, 420];
  let s = txt(cols[0], y + 14, T.word, 12, "#495057", "start", true) + txt(cols[1], y + 14, T.inOne, 12, C.orange, "middle", true) + txt(cols[2], y + 14, T.inTwo, 12, C.blue, "middle", true);
  s += txt(cols[3], y + 14, "P(w | c₁)", 12, C.orange, "middle", true) + txt(cols[4], y + 14, "P(w | c₂)", 12, C.blue, "middle", true);
  const shown = words.slice(0, 10);
  shown.forEach((x, i) => {
    const yy = y + 22 + (i + 1) * rowH - 6;
    const [a, b] = [pWord(c, 0, x, alpha), pWord(c, 1, x, alpha)];
    s += `<rect x="${cols[0] - 6}" y="${r2(yy - 15)}" width="${W - 2 * cols[0] + 12}" height="${rowH}" fill="${i % 2 ? "#fff" : "#f8f9fa"}"/>`;
    s += txt(cols[0], yy, x.length > 18 ? `${x.slice(0, 17)}…` : x, 12.5, C.ink);
    s += txt(cols[1], yy, String(c.words[0].get(x) ?? 0), 12.5, C.orange, "middle") + txt(cols[2], yy, String(c.words[1].get(x) ?? 0), 12.5, C.blue, "middle");
    s += txt(cols[3], yy, nt(a, 3), 12.5, C.orange, "middle") + txt(cols[4], yy, nt(b, 3), 12.5, C.blue, "middle");
    // The bar leans to the class the word speaks for, by log₂ of the ratio.
    const lean = a > 0 && b > 0 ? Math.max(-3, Math.min(3, Math.log2(a / b))) : a > 0 ? 3 : b > 0 ? -3 : 0;
    const mid = 540;
    s += `<line x1="${mid}" y1="${r2(yy - 13)}" x2="${mid}" y2="${r2(yy + 3)}" stroke="#adb5bd"/>`;
    s += `<rect x="${r2(lean >= 0 ? mid : mid + lean * 22)}" y="${r2(yy - 10)}" width="${r2(Math.abs(lean) * 22)}" height="10" fill="${lean >= 0 ? C.orange : C.blue}" opacity="0.8"/>`;
  });
  if (words.length > shown.length) s += txt(cols[0], y + 22 + (shown.length + 1) * rowH, "…", 12.5, "#495057");
  return { svg: s, h: 22 + (shown.length + 1) * rowH + 12 };
}

// ---------- counting by hand ----------

function readText(s: NbSpec, w: NbWords) {
  const [one, two] = [readMessages(s.src[0] ?? "", w), readMessages(s.src[1] ?? "", w)];
  const message = wordsOf(s.src[2] ?? "");
  if (!message.length) throw new Error(w.needMessage);
  const c = countAll(one, two);
  if (!message.some((x) => c.vocab.includes(x))) throw new Error(w.unknownAll);
  return { c, message };
}

function renderText(s: NbSpec, w: NbWords): RenderedSvg {
  const T = w.text;
  const { c, message } = readText(s, w);
  if (!(s.src[3] ?? "").trim()) throw new Error(w.needAlpha);
  const alpha = readNum(s.src[3], w);
  if (!(alpha >= 0 && alpha <= 10)) throw new Error(w.needAlpha);
  const r = classify(c, message, alpha);
  const n = c.docs[0] + c.docs[1];
  const prods = ([0, 1] as const).map((k) => r.known.slice(0, 5).map((x) => tn(pWord(c, k, x, alpha), 3)).join(" \\cdot ") + (r.known.length > 5 ? " \\cdots" : ""));
  const rows: TexLine[] = [
    { tex: `P(c \\mid w_1, \\ldots, w_n) \\propto P(c)\\,P(w_1 \\mid c) \\cdots P(w_n \\mid c)`, op: T.rule },
    { tex: `P(c_1) = ${frac(c.docs[0], n)}, \\quad P(c_2) = ${frac(c.docs[1], n)}`, op: T.priors },
    { tex: `P(w \\mid c) = \\frac{\\text{n}(w, c) + ${tn(alpha, 3)}}{N_c + ${tn(alpha, 3)} \\cdot ${c.vocab.length}}, \\quad N_{c_1} = ${c.totals[0]}, \\ N_{c_2} = ${c.totals[1]}`, op: T.smooth },
    { tex: `${frac(c.docs[0], n)} \\cdot ${prods[0]} = ${sci(r.scores[0])}`, op: T.one, color: C.orange },
    { tex: `${frac(c.docs[1], n)} \\cdot ${prods[1]} = ${sci(r.scores[1])}`, op: T.two, color: C.blue },
    { tex: Number.isFinite(r.post) ? `P(c_1 \\mid w) = \\frac{${sci(r.scores[0])}}{${sci(r.scores[0])} + ${sci(r.scores[1])}} = ${tn(r.post, 4)}` : `P(c_1 \\mid w) = \\frac{0}{0}`, op: T.posterior, color: C.purple },
  ];
  const { body, h } = layout(rows, (y) => wordTable(c, r.known, alpha, w, y));
  const caps = [
    { text: w.classes, color: "#495057" },
    { text: Number.isFinite(r.post) ? fill(T.summary, { p: nt(r.post * 100, 3), q: nt((1 - r.post) * 100, 3) }) : w.smoothing.never, color: "#495057" },
  ];
  if (r.skipped.length) caps.push({ text: fill(T.skipped, { list: [...new Set(r.skipped)].join(", ") }), color: C.grey });
  return compose(Number.isFinite(r.post) ? `P(c_1 \\mid w) = ${tn(r.post, 4)}` : `P(c_1 \\mid w) = \\frac{0}{0}`, body, h, caps);
}

// ---------- smoothing ----------

function renderSmoothing(s: NbSpec, w: NbWords): RenderedSvg {
  const S = w.smoothing;
  const { c, message } = readText(s, w);
  const r0 = classify(c, message, 0);
  const r1 = classify(c, message, 1);
  const zeroIn = ([0, 1] as const).map((k) => r0.known.filter((x) => !c.words[k].get(x)));
  const rows: TexLine[] = [
    { tex: `\\alpha = 0: \\quad P(c_1 \\mid w) = ${Number.isFinite(r0.post) ? tn(r0.post, 4) : "\\frac{0}{0}"}`, op: S.zero, color: C.red },
    { tex: `\\alpha = 1: \\quad P(c_1 \\mid w) = ${tn(r1.post, 4)}`, op: S.smooth, color: C.blue },
  ];
  const { body, h } = layout(rows, (y) => {
    const fr = makeFrame("nb-s", 74, y + 18, W - 148, 200, [0, 3], [0, 1.05]);
    const at = (a: number) => {
      const p = classify(c, message, a).post;
      return Number.isFinite(p) ? p : NaN;
    };
    const svg = title(fr, S.curve) + axes(fr, { xAtBottom: true }) + `<line x1="${fr.left}" y1="${r2(fr.sy(0.5))}" x2="${fr.right}" y2="${r2(fr.sy(0.5))}" stroke="#ced4da" stroke-dasharray="5 4"/>` +
      curve(fr, (a) => at(Math.max(a, 1e-4)), C.purple, 2.6, "", 0, 3, 300) +
      lbl(fr.right - 4, fr.bottom - 6, "α", C.ink, "end", 13);
    return { svg, h: 18 + 200 + 26 };
  });
  const words0 = zeroIn.map((z) => [...new Set(z)].join(", ") || "—");
  const caps = [
    { text: w.classes, color: "#495057" },
    { text: fill(S.summary, { a: words0[0], b: words0[1] }), color: "#495057" },
  ];
  if (!Number.isFinite(r0.post)) caps.push({ text: S.never, color: C.red });
  return compose(`\\alpha = 1: \\ P(c_1 \\mid w) = ${tn(r1.post, 4)}`, body, h, caps);
}

// ---------- counting the same evidence again ----------

function renderCopies(s: NbSpec, w: NbWords): RenderedSvg {
  const K = w.copies;
  const [prior, a, b] = [0, 1, 2].map((i) => {
    if (!(s.src[i] ?? "").trim()) throw new Error(w.needChance);
    const v = readNum(s.src[i], w);
    if (!(v > 0 && v < 1)) throw new Error(w.needChance);
    return v;
  });
  const k = Number((s.src[3] ?? "").trim());
  if (!Number.isInteger(k) || k < 1 || k > 20) throw new Error(w.needCopies);
  const truth = naiveCopies(prior, a, b, 1);
  const naive = naiveCopies(prior, a, b, k);
  const rows: TexLine[] = [
    { tex: `P(c_1 \\mid x) = \\frac{${tn(prior, 3)} \\cdot ${tn(a, 3)}}{${tn(prior, 3)} \\cdot ${tn(a, 3)} + ${tn(1 - prior, 3)} \\cdot ${tn(b, 3)}} = ${tn(truth, 4)}`, op: K.truth, color: C.blue },
    { tex: `\\frac{${tn(prior, 3)} \\cdot ${tn(a, 3)}^{${k}}}{${tn(prior, 3)} \\cdot ${tn(a, 3)}^{${k}} + ${tn(1 - prior, 3)} \\cdot ${tn(b, 3)}^{${k}}} = ${tn(naive, 4)}`, op: K.naive, color: C.orange },
  ];
  const { body, h } = layout(rows, (y) => {
    const fr = makeFrame("nb-c", 74, y + 18, W - 148, 200, [1, 20], [0, 1.05]);
    let svg = title(fr, K.curve) + axes(fr, { xAtBottom: true });
    svg += `<line x1="${fr.left}" y1="${r2(fr.sy(truth))}" x2="${fr.right}" y2="${r2(fr.sy(truth))}" stroke="${C.blue}" stroke-width="2.4" stroke-dasharray="7 5"/>`;
    svg += `<polyline points="${Array.from({ length: 20 }, (_, i) => `${r2(fr.sx(i + 1))},${r2(fr.sy(naiveCopies(prior, a, b, i + 1)))}`).join(" ")}" fill="none" stroke="${C.orange}" stroke-width="2.4"/>`;
    for (let i = 1; i <= 20; i++) svg += `<circle cx="${r2(fr.sx(i))}" cy="${r2(fr.sy(naiveCopies(prior, a, b, i)))}" r="${i === k ? 6 : 3}" fill="${i === k ? C.red : C.orange}"/>`;
    svg += lbl(fr.right - 4, fr.sy(truth) - 6, K.truthName, C.blue, "end", 12, false) + lbl(fr.left + 8, fr.top + 14, K.naiveName, C.orange, "start", 12, false);
    return { svg, h: 18 + 200 + 26 };
  });
  const caps = [{ text: fill(K.summary, { t: nt(truth * 100, 3), n: nt(naive * 100, 3), k }), color: "#495057" }];
  return compose(`${tn(truth, 4)} \\to ${tn(naive, 4)}`, body, h, caps);
}

// ---------- Gaussian naive Bayes ----------

function renderGaussian(s: NbSpec, w: NbWords): RenderedSvg {
  const G = w.gaussian;
  const [one, two] = [readNums(s.src[0] ?? "", w), readNums(s.src[1] ?? "", w)];
  if (sd(one) < 1e-9 || sd(two) < 1e-9) throw new Error(w.flat);
  if (!(s.src[2] ?? "").trim()) throw new Error(w.needX);
  const x = readNum(s.src[2], w);
  const g = gaussFit(one, two);
  const rows: TexLine[] = [
    { tex: `\\mu_1 = ${tn(g.m[0], 3)},\\ \\sigma_1 = ${tn(g.s[0], 3)}; \\quad \\mu_2 = ${tn(g.m[1], 3)},\\ \\sigma_2 = ${tn(g.s[1], 3)}; \\quad P(c_1) = ${frac(one.length, one.length + two.length)}`, op: G.fit },
    { tex: `p(x \\mid c) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-(x - \\mu)^2 / 2\\sigma^2}`, op: G.densities },
    { tex: `P(c_1 \\mid x) = \\frac{P(c_1)\\,p(x \\mid c_1)}{P(c_1)\\,p(x \\mid c_1) + P(c_2)\\,p(x \\mid c_2)}`, op: G.posterior },
    { tex: `P(c_1 \\mid ${tn(x, 3)}) = ${tn(g.post(x), 4)}`, op: G.at, color: C.purple },
  ];
  const all = [...one, ...two, x];
  const [lo, hi] = [Math.min(...all), Math.max(...all)];
  const pad = (hi - lo) * 0.15 || 1;
  const xr: [number, number] = [lo - pad, hi + pad];
  const { body, h } = layout(rows, (y) => {
    const peak = Math.max(g.prior * normalPdf(g.m[0], g.m[0], g.s[0]), (1 - g.prior) * normalPdf(g.m[1], g.m[1], g.s[1]));
    const left = makeFrame("nb-g-d", 44, y + 18, HALF, PH, xr, [0, peak * 1.15]);
    let svg = title(left, G.densTitle) + axes(left, { xAtBottom: true, xTicks: ticks(...xr) });
    svg += curve(left, (v) => g.prior * normalPdf(v, g.m[0], g.s[0]), C.orange, 2.4) + curve(left, (v) => (1 - g.prior) * normalPdf(v, g.m[1], g.s[1]), C.blue, 2.4);
    one.forEach((v) => (svg += `<circle cx="${r2(left.sx(v))}" cy="${r2(left.bottom - 5)}" r="3" fill="${C.orange}"/>`));
    two.forEach((v) => (svg += `<circle cx="${r2(left.sx(v))}" cy="${r2(left.bottom - 12)}" r="3" fill="none" stroke="${C.blue}" stroke-width="1.5"/>`));
    svg += `<line x1="${r2(left.sx(x))}" y1="${left.top}" x2="${r2(left.sx(x))}" y2="${left.bottom}" stroke="${C.red}" stroke-width="2" stroke-dasharray="5 4"/>`;
    const right = makeFrame("nb-g-p", 88 + HALF, y + 18, HALF, PH, xr, [0, 1.05]);
    svg += title(right, G.postTitle) + axes(right, { xAtBottom: true, xTicks: ticks(...xr) }) + curve(right, g.post, C.purple, 2.6);
    svg += `<circle cx="${r2(right.sx(x))}" cy="${r2(right.sy(g.post(x)))}" r="6" fill="${C.red}" stroke="#fff" stroke-width="1.5"/>`;
    return { svg, h: 18 + PH + 26 };
  });
  return compose(`P(c_1 \\mid ${tn(x, 3)}) = ${tn(g.post(x), 4)}`, body, h, [{ text: fill(G.summary, { p: nt(g.post(x) * 100, 3) }), color: "#495057" }]);
}

// ---------- entry ----------

export function renderNaiveBayes(spec: NbSpec, w: NbWords): RenderedSvg {
  exprMessages(w);
  switch (spec.topic) {
    case "text":
      return renderText(spec, w);
    case "smoothing":
      return renderSmoothing(spec, w);
    case "copies":
      return renderCopies(spec, w);
    case "gaussian":
      return renderGaussian(spec, w);
  }
}

const SPAM = "win money now; free money offer; claim your free prize now; win a prize";
const HAM = "meeting at noon; see you at lunch; the report is ready; lunch money for the trip";
const P_ = (topic: NbTopic, ...src: string[]): NbSpec => ({ topic, src });
export const NB_PRESETS: { [K in NbTopic]: { label: string; spec: NbSpec }[] } = {
  text: [
    { label: "spam or not: free money", spec: P_("text", SPAM, HAM, "free money now", "1") },
    { label: "spam or not: lunch money", spec: P_("text", SPAM, HAM, "money for lunch", "1") },
    { label: "no smoothing, α = 0", spec: P_("text", SPAM, HAM, "free lunch now", "0") },
  ],
  smoothing: [
    { label: "a word seen in one class only", spec: P_("smoothing", SPAM, HAM, "free lunch now") },
    { label: "words seen in both", spec: P_("smoothing", SPAM, HAM, "money now") },
  ],
  copies: [
    { label: "the same word five times", spec: P_("copies", "0.5", "0.6", "0.3", "5") },
    { label: "a weak clue repeated", spec: P_("copies", "0.2", "0.55", "0.45", "12") },
  ],
  gaussian: [
    { label: "heights of two groups", spec: P_("gaussian", "158, 162, 165, 160, 167, 163, 161", "172, 178, 175, 181, 176, 174, 179, 177", "170") },
    { label: "unequal spreads", spec: P_("gaussian", "4.8, 5.1, 5, 4.9, 5.2, 5.05", "3, 7, 4, 6.5, 2.5, 8, 5.5", "6") },
  ],
};
