// Information, one step at a time: the surprise −log₂ p of each outcome and the entropy as its average (bits for coins
// and dice), a coin's entropy as its chance of heads goes from 0 to 1, cross-entropy H(p, q) as the length of coding p
// with a code built for q, KL divergence as the bits that wastes (never negative, and not the same both ways round),
// and log loss as the cross-entropy against a one-hot target, the loss of the softmax lab.
import { axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nt, r2, texLines, tn, W, type AxesOptions, type Frame, type TexLine } from "./chart";
import { evalE, exprMessages, has, parseE, simp } from "./expr";
import type { RenderedSvg } from "./latex";

export type InfoTopic = "entropy" | "coin" | "cross" | "kl" | "onehot";
export const INFO_TOPICS: InfoTopic[] = ["entropy", "coin", "cross", "kl", "onehot"];
/** What a picture is made from, one typed line per field of the topic (see `INFO_FIELDS`). */
export type InfoSpec = { topic: InfoTopic; src: string[] };
export const INFO_FIELDS: Record<InfoTopic, ("names" | "p" | "q" | "heads" | "target")[]> = {
  entropy: ["names", "p"],
  coin: ["heads"],
  cross: ["names", "p", "q"],
  kl: ["names", "p", "q"],
  onehot: ["names", "q", "target"],
};

export type InfoWords = {
  bad: string;
  tooBig: string;
  onlyX: string;
  needNumbers: string;
  tooMany: string;
  needOne: string;
  negative: string;
  sameCount: string;
  namesCount: string;
  zeroQ: string;
  needHeads: string;
  needTarget: string;
  entropy: { surprise: string; average: string; most: string; bars: string; surpriseBars: string; summary: string; even: string };
  coin: { formula: string; value: string; most: string; curve: string; summary: string };
  cross: { code: string; cross: string; entropy: string; kl: string; bars: string; lengths: string; summary: string; same: string };
  kl: { pq: string; qp: string; never: string; terms: string; pqTitle: string; qpTitle: string; summary: string; same: string };
  onehot: { y: string; cross: string; one: string; bits: string; bars: string; curve: string; summary: string };
};

const MAX = 40;

// ---------- reading ----------

/** Numbers separated by commas, semicolons or spaces: 1/2, 0.25, 1/6. */
export function readNums(s: string, w: InfoWords): number[] {
  const parts = s.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) throw new Error(w.needNumbers);
  if (parts.length > MAX) throw new Error(fill(w.tooMany, { n: MAX }));
  return parts.map((p) => {
    let v: number;
    try {
      const e = simp(parseE(p));
      if (has(e)) throw new Error();
      v = evalE(e, 0);
    } catch {
      throw new Error(fill(w.bad, { s: p }));
    }
    if (!Number.isFinite(v)) throw new Error(fill(w.bad, { s: p }));
    return v;
  });
}
/** A distribution: numbers at least 0 that add up to 1. */
export function readDist(s: string, w: InfoWords): number[] {
  const v = readNums(s, w);
  if (v.some((x) => x < 0)) throw new Error(w.negative);
  const total = v.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 1) > 1e-6) throw new Error(fill(w.needOne, { s: nt(total, 4) }));
  return v;
}
/** The outcomes' names: as typed (commas or spaces), or 1, 2, 3, … when the field is empty. */
function readNames(s: string, n: number, w: InfoWords): string[] {
  const parts = (s ?? "").split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return Array.from({ length: n }, (_, i) => String(i + 1));
  if (parts.length !== n) throw new Error(fill(w.namesCount, { a: parts.length, b: n }));
  return parts;
}

// ---------- the measures ----------

/** −log₂ p: how surprising an outcome of chance p is, in bits (∞ for an outcome that cannot happen). */
export const surprise = (p: number) => -Math.log2(p);
/** p · log₂(1/q), with 0 · anything = 0 (an outcome that never happens costs nothing). */
const term = (p: number, q: number) => (p === 0 ? 0 : -p * Math.log2(q));
/** H(p) = Σ p · (−log₂ p), in bits. */
export const entropy = (p: number[]) => p.reduce((s, x) => s + term(x, x), 0);
/** H(p, q) = Σ p · (−log₂ q): the average length, in bits, of coding draws from p with a code built for q. */
export const crossEntropy = (p: number[], q: number[]) => p.reduce((s, x, i) => s + term(x, q[i]), 0);
/** KL(p ‖ q) = H(p, q) − H(p) = Σ p · log₂(p/q). */
export const kl = (p: number[], q: number[]) => p.reduce((s, x, i) => s + (x === 0 ? 0 : x * Math.log2(x / q[i])), 0);
/** A coin's entropy, H(p) = −p log₂ p − (1 − p) log₂(1 − p). */
export const coinEntropy = (p: number) => entropy([p, 1 - p]);

// ---------- drawing ----------

const title = (fr: Frame, text: string) => `<text x="${r2((fr.left + fr.right) / 2)}" y="${fr.top - 8}" ${FONT} font-size="13" font-weight="700" fill="#495057" text-anchor="middle">${esc(text)}</text>`;
const HALF = (W - 3 * 44) / 2;
const PH = 190;
/** The rows, then whatever is drawn under them; returns the picture's body and its height. */
function layout(rows: TexLine[], draw: (y: number) => { svg: string; h: number }) {
  const ln = texLines(rows, 4);
  const d = draw(4 + ln.h + 14);
  return { body: ln.svg + d.svg, h: 4 + ln.h + 14 + d.h };
}
/** A frame over outcomes 1…n (as x), its y from 0 to top. */
const barFrame = (id: string, left: number, y: number, n: number, top: number, w = HALF) => makeFrame(id, left, y + 18, w, PH, [0.4, n + 0.6], [0, top]);
/** The outcomes' names under a bar frame instead of numbers. */
function nameAxis(fr: Frame, names: string[]): AxesOptions {
  return { xTicks: names.map((label, i) => ({ v: i + 1, label: label.length > 6 ? `${label.slice(0, 5)}…` : label })), xAtBottom: true };
}
/** Bars at each outcome: one series fills the slot, two share it side by side. */
function bars(fr: Frame, series: { v: number[]; color: string }[], labels = true): string {
  const k = series.length;
  const slot = Math.min(44, (fr.sx(2) - fr.sx(1)) * 0.7);
  const bw = slot / k;
  let s = "";
  series.forEach((ser, j) =>
    ser.v.forEach((v, i) => {
      const x = fr.sx(i + 1) - slot / 2 + j * bw;
      const top = fr.sy(Math.min(v, fr.y1));
      const base = fr.sy(Math.max(0, fr.y0));
      s += `<rect x="${r2(x)}" y="${r2(Math.min(top, base))}" width="${r2(bw - 1)}" height="${r2(Math.abs(base - top))}" fill="${ser.color}" opacity="0.85"/>`;
      if (labels && ser.v.length <= 10) s += `<text x="${r2(x + bw / 2)}" y="${r2(Math.min(top, base) - 4)}" ${FONT} font-size="10" fill="#495057" text-anchor="middle">${esc(nt(v, 2))}</text>`;
    }),
  );
  return s;
}
function legendRow(x: number, y: number, items: { text: string; color: string }[]): string {
  let s = "";
  let at = x;
  for (const it of items) {
    s += `<rect x="${r2(at)}" y="${r2(y - 9)}" width="14" height="6" fill="${it.color}"/><text x="${r2(at + 19)}" y="${r2(y - 3)}" ${FONT} font-size="11.5" fill="#495057">${esc(it.text)}</text>`;
    at += 19 + it.text.length * 6.2 + 16;
  }
  return s;
}
/** A sum written out: every term, or the first two and the last when there are more than four. */
const terms = (ts: string[]) => (ts.length <= 4 ? ts.join(" + ") : `${ts.slice(0, 2).join(" + ")} + \\cdots + ${ts[ts.length - 1]}`);
/** A probability in LaTeX: a fraction 1/n when it is one, else a decimal. */
function pt(p: number): string {
  for (let d = 2; d <= 12; d++) {
    const n = Math.round(p * d);
    if (n > 0 && n < d && Math.abs(p - n / d) < 1e-9 && gcd(n, d) === 1) return `\\tfrac{${n}}{${d}}`;
  }
  return tn(p, 3);
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const bitsTex = (v: number) => (Number.isFinite(v) ? tn(v, 4) : "\\infty");

// ---------- surprise and entropy ----------

function renderEntropy(s: InfoSpec, w: InfoWords): RenderedSvg {
  const E = w.entropy;
  const p = readDist(s.src[1] ?? "", w);
  const names = readNames(s.src[0] ?? "", p.length, w);
  const H = entropy(p);
  const most = Math.log2(p.length);
  const shown = p.map((x, i) => i).filter((i) => p[i] > 0);
  const rows: TexLine[] = [
    { tex: `-\\log_2 p: \\quad ${shown.slice(0, 4).map((i) => `-\\log_2 ${pt(p[i])} = ${tn(surprise(p[i]), 3)}`).join(", \\quad ")}${shown.length > 4 ? ", \\ \\ldots" : ""}`, op: E.surprise, color: C.orange },
    { tex: `H(p) = \\sum p \\cdot (-\\log_2 p) = ${terms(shown.map((i) => `${pt(p[i])} \\cdot ${tn(surprise(p[i]), 3)}`))} = ${tn(H, 4)}`, op: E.average, color: C.blue },
    { tex: `H(p) \\le \\log_2 ${p.length} = ${tn(most, 4)}`, op: E.most },
  ];
  const sur = p.map((x) => (x > 0 ? surprise(x) : 0));
  const { body, h } = layout(rows, (y) => {
    const left = barFrame("info-e-p", 44, y, p.length, 1.12);
    const right = barFrame("info-e-s", 88 + HALF, y, p.length, Math.max(1, ...sur) * 1.2);
    const svg =
      title(left, E.bars) + axes(left, nameAxis(left, names)) + bars(left, [{ v: p, color: C.blue }]) +
      title(right, E.surpriseBars) + axes(right, nameAxis(right, names)) + bars(right, [{ v: sur, color: C.orange }]) +
      `<line x1="${right.left}" y1="${r2(right.sy(H))}" x2="${right.right}" y2="${r2(right.sy(H))}" stroke="${C.blue}" stroke-width="2" stroke-dasharray="6 4"/>` +
      lbl(right.right - 4, right.sy(H) - 5, `H = ${nt(H, 3)}`, C.blue, "end", 12, false);
    return { svg, h: 18 + PH + 26 };
  });
  const caps = [{ text: fill(E.summary, { h: nt(H, 4), n: p.length, m: nt(most, 4) }), color: "#495057" }];
  if (Math.abs(H - most) < 1e-9 && p.length > 1) caps.push({ text: E.even, color: C.blue });
  return compose(`H(p) = ${tn(H, 4)}`, body, h, caps);
}

// ---------- a coin ----------

function renderCoin(s: InfoSpec, w: InfoWords): RenderedSvg {
  const K = w.coin;
  const v = readNums(s.src[0] ?? "", w);
  if (v.length !== 1 || !(v[0] >= 0 && v[0] <= 1)) throw new Error(w.needHeads);
  const p = v[0];
  const H = coinEntropy(p);
  const rows: TexLine[] = [
    { tex: `H(p) = -p\\log_2 p - (1 - p)\\log_2(1 - p)`, op: K.formula },
    { tex: `H(${pt(p)}) = ${p === 0 || p === 1 ? "0" : `-${pt(p)}\\log_2 ${pt(p)} - ${pt(1 - p)}\\log_2 ${pt(1 - p)}`} = ${tn(H, 4)}`, op: K.value, color: C.blue },
    { tex: `H\\left(\\tfrac12\\right) = 1`, op: K.most },
  ];
  const { body, h } = layout(rows, (y) => {
    const fr = makeFrame("info-coin", 74, y + 18, W - 148, 220, [0, 1], [0, 1.12]);
    const svg = title(fr, K.curve) + axes(fr, { xAtBottom: true }) + curve(fr, (x) => (x <= 0 || x >= 1 ? 0 : coinEntropy(x)), C.blue, 2.6) + dot(fr.sx(p), fr.sy(H), C.orange, 6) + lbl(fr.sx(p) + (p < 0.5 ? 8 : -8), fr.sy(H) - 10, `p = ${nt(p, 3)}, H = ${nt(H, 3)}`, C.orange, p < 0.5 ? "start" : "end", 12.5, false);
    return { svg, h: 18 + 220 + 26 };
  });
  return compose(`H(${pt(p)}) = ${tn(H, 4)}`, body, h, [{ text: fill(K.summary, { h: nt(H, 3), p: nt(p, 3) }), color: "#495057" }]);
}

// ---------- cross-entropy ----------

function readPair(s: InfoSpec, w: InfoWords) {
  const p = readDist(s.src[1] ?? "", w);
  const q = readDist(s.src[2] ?? "", w);
  if (p.length !== q.length) throw new Error(fill(w.sameCount, { a: p.length, b: q.length }));
  if (p.some((x, i) => x > 0 && q[i] === 0)) throw new Error(w.zeroQ);
  return { p, q, names: readNames(s.src[0] ?? "", p.length, w) };
}

function renderCross(s: InfoSpec, w: InfoWords): RenderedSvg {
  const X = w.cross;
  const { p, q, names } = readPair(s, w);
  const [Hp, Hpq, D] = [entropy(p), crossEntropy(p, q), kl(p, q)];
  const shown = p.map((_, i) => i).filter((i) => p[i] > 0);
  const rows: TexLine[] = [
    { tex: `-\\log_2 q: \\quad ${q.slice(0, 4).map((x) => (x > 0 ? tn(surprise(x), 3) : "\\infty")).join(", \\ ")}${q.length > 4 ? ", \\ \\ldots" : ""}`, op: X.code, color: C.orange },
    { tex: `H(p, q) = \\sum p \\cdot (-\\log_2 q) = ${terms(shown.map((i) => `${pt(p[i])} \\cdot ${tn(surprise(q[i]), 3)}`))} = ${bitsTex(Hpq)}`, op: X.cross, color: C.purple },
    { tex: `H(p) = \\sum p \\cdot (-\\log_2 p) = ${tn(Hp, 4)}`, op: X.entropy, color: C.blue },
    { tex: `D_{KL}(p \\,\\|\\, q) = H(p, q) - H(p) = ${bitsTex(Hpq)} - ${tn(Hp, 4)} = ${tn(D, 4)}`, op: X.kl, color: C.red },
  ];
  const lens = q.map((x) => surprise(x));
  const own = p.map((x) => (x > 0 ? surprise(x) : 0));
  const { body, h } = layout(rows, (y) => {
    const left = barFrame("info-x-p", 44, y, p.length, Math.max(...p, ...q) * 1.25);
    const right = barFrame("info-x-l", 88 + HALF, y, p.length, Math.max(1, ...lens.filter(Number.isFinite), ...own) * 1.2);
    const svg =
      title(left, X.bars) + axes(left, nameAxis(left, names)) + bars(left, [{ v: p, color: C.blue }, { v: q, color: C.orange }]) +
      legendRow(left.left, left.bottom + 34, [{ text: "p", color: C.blue }, { text: "q", color: C.orange }]) +
      title(right, X.lengths) + axes(right, nameAxis(right, names)) + bars(right, [{ v: own, color: C.blue }, { v: lens, color: C.orange }]) +
      legendRow(right.left, right.bottom + 34, [{ text: "−log₂ p", color: C.blue }, { text: "−log₂ q", color: C.orange }]);
    return { svg, h: 18 + PH + 40 };
  });
  const same = D < 1e-12;
  return compose(`H(p, q) = ${bitsTex(Hpq)}, \\quad H(p) = ${tn(Hp, 4)}, \\quad D_{KL} = ${tn(D, 4)}`, body, h, [
    { text: same ? X.same : fill(X.summary, { c: nt(Hpq, 4), h: nt(Hp, 4), d: nt(D, 4) }), color: "#495057" },
  ]);
}

// ---------- KL divergence both ways round ----------

function renderKl(s: InfoSpec, w: InfoWords): RenderedSvg {
  const K = w.kl;
  const { p, q, names } = readPair(s, w);
  if (q.some((x, i) => x > 0 && p[i] === 0)) throw new Error(w.zeroQ);
  const [Dpq, Dqp] = [kl(p, q), kl(q, p)];
  const tPQ = p.map((x, i) => (x === 0 ? 0 : x * Math.log2(x / q[i])));
  const tQP = q.map((x, i) => (x === 0 ? 0 : x * Math.log2(x / p[i])));
  const show = (a: number[], b: number[]) => terms(a.map((x, i) => i).filter((i) => a[i] > 0).map((i) => `${pt(a[i])}\\log_2\\frac{${pt(a[i])}}{${pt(b[i])}}`));
  const rows: TexLine[] = [
    { tex: `D_{KL}(p \\,\\|\\, q) = \\sum p \\log_2 \\frac{p}{q} = ${show(p, q)} = ${tn(Dpq, 4)}`, op: K.pq, color: C.blue },
    { tex: `D_{KL}(q \\,\\|\\, p) = \\sum q \\log_2 \\frac{q}{p} = ${show(q, p)} = ${tn(Dqp, 4)}`, op: K.qp, color: C.orange },
    { tex: `D_{KL} \\ge 0, \\quad D_{KL} = 0 \\iff p = q`, op: K.never },
  ];
  const lo = Math.min(0, ...tPQ, ...tQP);
  const hi = Math.max(0.1, ...tPQ, ...tQP);
  const pad = (hi - lo) * 0.2;
  const { body, h } = layout(rows, (y) => {
    const left = makeFrame("info-k-pq", 44, y + 18, HALF, PH, [0.4, p.length + 0.6], [lo - (lo < 0 ? pad : 0), hi + pad]);
    const right = makeFrame("info-k-qp", 88 + HALF, y + 18, HALF, PH, [0.4, p.length + 0.6], [lo - (lo < 0 ? pad : 0), hi + pad]);
    const svg =
      title(left, fill(K.pqTitle, { d: nt(Dpq, 3) })) + axes(left, nameAxis(left, names)) + bars(left, [{ v: tPQ, color: C.blue }]) +
      title(right, fill(K.qpTitle, { d: nt(Dqp, 3) })) + axes(right, nameAxis(right, names)) + bars(right, [{ v: tQP, color: C.orange }]);
    return { svg, h: 18 + PH + 26 };
  });
  const same = Math.abs(Dpq - Dqp) < 1e-9;
  return compose(`D_{KL}(p \\,\\|\\, q) = ${tn(Dpq, 4)}, \\quad D_{KL}(q \\,\\|\\, p) = ${tn(Dqp, 4)}`, body, h, [
    { text: same ? K.same : fill(K.summary, { a: nt(Dpq, 4), b: nt(Dqp, 4) }), color: "#495057" },
    { text: K.terms, color: C.grey },
  ]);
}

// ---------- log loss is cross-entropy against a one-hot target ----------

function renderOnehot(s: InfoSpec, w: InfoWords): RenderedSvg {
  const O = w.onehot;
  const q = readDist(s.src[1] ?? "", w);
  const names = readNames(s.src[0] ?? "", q.length, w);
  const t = (s.src[2] ?? "").trim();
  const k = names.indexOf(t) >= 0 ? names.indexOf(t) : /^\d+$/.test(t) ? Number(t) - 1 : -1;
  if (k < 0 || k >= q.length) throw new Error(fill(w.needTarget, { n: q.length }));
  if (q[k] === 0) throw new Error(w.zeroQ);
  const y = q.map((_, i) => (i === k ? 1 : 0));
  const nats = -Math.log(q[k]);
  const rows: TexLine[] = [
    { tex: `y = (${y.join(", ")})`, op: O.y },
    { tex: `H(y, q) = -\\sum y \\ln q = -\\left(${y.map((v, i) => `${v} \\cdot \\ln ${tn(q[i], 3)}`).slice(0, 4).join(" + ")}${q.length > 4 ? " + \\cdots" : ""}\\right)`, op: O.cross },
    { tex: `= -\\ln q_{${k + 1}} = -\\ln ${tn(q[k], 3)} = ${tn(nats, 4)}`, op: O.one, color: C.red },
    { tex: `-\\log_2 ${tn(q[k], 3)} = ${tn(nats / Math.LN2, 4)}`, op: O.bits },
  ];
  const { body, h } = layout(rows, (yy) => {
    const left = barFrame("info-o-q", 44, yy, q.length, 1.15);
    const right = makeFrame("info-o-c", 88 + HALF, yy + 18, HALF, PH, [0, 1], [0, Math.max(4.7, nats * 1.1)]);
    const svg =
      title(left, O.bars) + axes(left, nameAxis(left, names)) + bars(left, [{ v: q, color: C.blue }]) +
      `<rect x="${r2(left.sx(k + 1) - 24)}" y="${left.top}" width="48" height="${left.bottom - left.top}" fill="none" stroke="${C.red}" stroke-width="2" stroke-dasharray="5 4"/>` +
      title(right, O.curve) + axes(right, { xAtBottom: true }) + curve(right, (x) => -Math.log(x), C.red, 2.4, "", 1e-3, 1) + dot(right.sx(q[k]), right.sy(nats), C.red, 5.5) +
      lbl(right.sx(q[k]) + 8, right.sy(nats) - 8, `−ln ${nt(q[k], 3)} = ${nt(nats, 3)}`, C.red, "start", 12, false);
    return { svg, h: 18 + PH + 26 };
  });
  return compose(`H(y, q) = -\\ln q_{${k + 1}} = ${tn(nats, 4)}`, body, h, [{ text: fill(O.summary, { c: names[k], q: nt(q[k], 3), l: nt(nats, 4) }), color: "#495057" }]);
}

// ---------- entry ----------

export function renderInformation(spec: InfoSpec, w: InfoWords): RenderedSvg {
  exprMessages(w);
  switch (spec.topic) {
    case "entropy":
      return renderEntropy(spec, w);
    case "coin":
      return renderCoin(spec, w);
    case "cross":
      return renderCross(spec, w);
    case "kl":
      return renderKl(spec, w);
    case "onehot":
      return renderOnehot(spec, w);
  }
}

const P_ = (topic: InfoTopic, ...src: string[]): InfoSpec => ({ topic, src });
export const INFO_PRESETS: { [K in InfoTopic]: { label: string; spec: InfoSpec }[] } = {
  entropy: [
    { label: "a fair coin: 1 bit", spec: P_("entropy", "H T", "1/2, 1/2") },
    { label: "a fair die", spec: P_("entropy", "", "1/6, 1/6, 1/6, 1/6, 1/6, 1/6") },
    { label: "a bent coin", spec: P_("entropy", "H T", "0.9, 0.1") },
    { label: "weather: sun, cloud, rain", spec: P_("entropy", "sun cloud rain", "1/2, 1/4, 1/4") },
    { label: "a sure thing: 0 bits", spec: P_("entropy", "", "1, 0, 0") },
  ],
  coin: [
    { label: "fair", spec: P_("coin", "1/2") },
    { label: "bent, 0.9", spec: P_("coin", "0.9") },
    { label: "rare, 0.01", spec: P_("coin", "0.01") },
  ],
  cross: [
    { label: "weather coded as if even", spec: P_("cross", "sun cloud rain", "1/2, 1/4, 1/4", "1/3, 1/3, 1/3") },
    { label: "a fair coin coded for a bent one", spec: P_("cross", "H T", "1/2, 1/2", "0.9, 0.1") },
    { label: "the right code: KL = 0", spec: P_("cross", "sun cloud rain", "1/2, 1/4, 1/4", "1/2, 1/4, 1/4") },
    { label: "a die coded for a loaded die", spec: P_("cross", "", "1/6, 1/6, 1/6, 1/6, 1/6, 1/6", "1/2, 1/10, 1/10, 1/10, 1/10, 1/10") },
  ],
  kl: [
    { label: "fair and bent coins", spec: P_("kl", "H T", "1/2, 1/2", "0.9, 0.1") },
    { label: "weather against even", spec: P_("kl", "sun cloud rain", "1/2, 1/4, 1/4", "1/3, 1/3, 1/3") },
    { label: "a rare outcome missed", spec: P_("kl", "a b c", "0.98, 0.01, 0.01", "0.5, 0.25, 0.25") },
  ],
  onehot: [
    { label: "cat, fairly sure", spec: P_("onehot", "cat dog bird", "0.7, 0.2, 0.1", "cat") },
    { label: "cat, but the model says dog", spec: P_("onehot", "cat dog bird", "0.1, 0.8, 0.1", "cat") },
    { label: "a guess among four", spec: P_("onehot", "", "1/4, 1/4, 1/4, 1/4", "2") },
  ],
};
