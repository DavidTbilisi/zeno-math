// Mill's methods for finding causes. Agreement, difference and the joint method read a table of cases (which factors
// each had, and whether the effect followed), marking the factor every case with the effect shares, the pairs of cases
// that differ in one factor only, and what is necessary or sufficient so far. Concomitant variation reads rows of
// numbers and draws each factor against the effect with its correlation. Residues takes the known parts away from
// the whole and leaves the rest to the factor not yet accounted for, drawn as a bar model.
import { txt } from "./algoArrays";
import { C, fill, r2, W, type Caption } from "./chart";
import type { RenderedSvg } from "./latex";
import type { LogicSpec } from "./logic";
import { composeText, tw } from "./logicPuzzles";

export type MillMode = "presence" | "variation" | "residues";
export const MILL_MODES: MillMode[] = ["presence", "variation", "residues"];

export type MillWords = {
  none: string;
  badLine: string;
  outcomes: string;
  noEffect: string;
  tooBig: string;
  presenceTitle: string;
  effect: string;
  agreeOne: string;
  agreeMany: string;
  agreeNone: string;
  diff: string;
  diffNone: string;
  diffNoNeg: string;
  joint: string;
  sufficient: string;
  caveat: string;
  legend: string;
  varBad: string;
  varLengths: string;
  varTooBig: string;
  varTitle: string;
  rises: string;
  falls: string;
  weak: string;
  flat: string;
  varBest: string;
  varNone: string;
  varCaveat: string;
  resBad: string;
  resFew: string;
  resOver: string;
  resTitle: string;
  rest: string;
  residue: string;
  resZero: string;
  resCaveat: string;
};

const lines = (src: string) => src.split("\n").map((l) => l.trim()).filter(Boolean);
const minus = (s: string) => s.replace(/[−–]/g, "-");
const num = (s: string) => {
  const v = Number(minus(s.trim()).replace(",", "."));
  return s.trim() && Number.isFinite(v) ? v : undefined;
};
/** Fits a drawing to the width, centred, never enlarged. */
const fitW = (svg: string, width: number, h: number) => {
  const k = Math.min(1, (W - 40) / width);
  return { svg: `<g transform="translate(${r2((W - width * k) / 2)} 0) scale(${r2(k * 1000) / 1000})">${svg}</g>`, h: h * k };
};

// ---------- agreement, difference, the joint method ----------

type Case = { name: string; factors: Set<string>; pos: boolean };
export type Presence = { cases: Case[]; factors: string[]; effect: string; agree: string[]; joint: string[]; sufficient: string[]; diffs: { p: number; n: number; f: string }[] };

const YES = /^(\+|yes|y|1|true|да|კი)$/iu;
const NO = /^(-|no|n|0|false|нет|არა)$/iu;
const NOT = /^(?:~|¬|!|not\s+|no\s+|не\s+|არ\s+|ar\s+)\s*(.+)$/iu;
const MAX_CASES = 10;
const MAX_FACTORS = 10;

/** One case per line, Name: factor, factor -> outcome; the outcome is the effect or its absence. */
export function readCases(src: string, w: MillWords): Presence {
  const rows = lines(src);
  if (!rows.length) throw new Error(w.none);
  let named: string | undefined;
  let other: string | undefined;
  const cases = rows.map((line, i): Case => {
    const m = /^(?:([^:]+):)?\s*(.*?)\s*(?:->|→|=>)\s*(.+)$/u.exec(line);
    if (!m) throw new Error(fill(w.badLine, { s: line }));
    const list = m[2].includes(",") ? m[2].split(",") : m[2].split(/\s+/);
    const factors = new Set(list.map((f) => f.trim()).filter(Boolean));
    const out = m[3].trim();
    let pos: boolean;
    const neg = NOT.exec(out);
    if (YES.test(out)) pos = true;
    else if (NO.test(out)) pos = false;
    else if (neg && (!named || neg[1].toLowerCase() === named.toLowerCase())) {
      named ??= neg[1];
      pos = false;
    } else if (!named || out.toLowerCase() === named.toLowerCase()) {
      named ??= out;
      pos = true;
    } else if (!other || out.toLowerCase() === other.toLowerCase()) {
      other ??= out;
      pos = false;
    } else throw new Error(fill(w.outcomes, { a: named, b: other, s: out }));
    return { name: m[1]?.trim() || String(i + 1), factors, pos };
  });
  const factors = [...new Set(cases.flatMap((c) => [...c.factors]))];
  if (cases.length > MAX_CASES || factors.length > MAX_FACTORS) throw new Error(fill(w.tooBig, { n: MAX_CASES, m: MAX_FACTORS }));
  const pos = cases.filter((c) => c.pos);
  const neg = cases.filter((c) => !c.pos);
  if (!pos.length) throw new Error(w.noEffect);
  const agree = factors.filter((f) => pos.every((c) => c.factors.has(f)));
  // The joint method needs a case without the effect: with none, "in none of the others" would hold of anything.
  const joint = neg.length ? agree.filter((f) => neg.every((c) => !c.factors.has(f))) : [];
  // Sufficient so far: every case that had it had the effect too (only worth saying when some case lacks the effect).
  const sufficient = neg.length ? factors.filter((f) => neg.every((c) => !c.factors.has(f))) : [];
  const diffs: Presence["diffs"] = [];
  cases.forEach((p, pi) => {
    if (!p.pos) return;
    cases.forEach((n, ni) => {
      if (n.pos) return;
      const extra = [...p.factors].filter((f) => !n.factors.has(f));
      if (extra.length === 1 && [...n.factors].every((f) => p.factors.has(f))) diffs.push({ p: pi, n: ni, f: extra[0] });
    });
  });
  return { cases, factors, effect: named ?? w.effect, agree, joint, sufficient, diffs };
}

const list = (xs: readonly string[]) => xs.join(", ");

function drawPresence(pr: Presence): { svg: string; width: number; h: number } {
  const ROW = 28;
  const nameW = Math.max(...pr.cases.map((c) => tw(c.name, 13))) + 18;
  const colW = pr.factors.map((f) => Math.max(36, tw(f, 12.5) + 14));
  const effW = Math.max(60, tw(pr.effect, 12.5) + 20, ...pr.cases.map((c) => (c.pos ? tw(pr.effect, 12.5) + 20 : 0)));
  const x0 = nameW;
  const xs = colW.map((_, i) => x0 + colW.slice(0, i).reduce((a, b) => a + b, 0));
  const xe = x0 + colW.reduce((a, b) => a + b, 0);
  const head = 30;
  const tableW = xe + effW;
  const parts: string[] = [];
  // Columns: green for the joint method's factor, blue for the others every case with the effect shares.
  pr.factors.forEach((f, i) => {
    const tint = pr.joint.includes(f) ? "#d3f9d8" : pr.agree.includes(f) ? "#d0ebff" : "";
    if (tint) parts.push(`<rect x="${r2(xs[i])}" y="0" width="${r2(colW[i])}" height="${head + pr.cases.length * ROW}" fill="${tint}"/>`);
    parts.push(txt(xs[i] + colW[i] / 2, 20, f, { size: 12.5, anchor: "middle", bold: true, color: tint ? (pr.joint.includes(f) ? C.green : C.blue) : C.ink }));
  });
  parts.push(txt(xe + effW / 2, 20, pr.effect, { size: 12.5, anchor: "middle", bold: true, color: C.red }));
  pr.cases.forEach((c, r) => {
    const y = head + r * ROW;
    parts.push(txt(8, y + 18.5, c.name, { size: 13, bold: true }));
    pr.factors.forEach((f, i) => c.factors.has(f) && parts.push(`<circle cx="${r2(xs[i] + colW[i] / 2)}" cy="${y + ROW / 2}" r="6" fill="${C.ink}"/>`));
    parts.push(`<rect x="${r2(xe + 6)}" y="${y + 4}" width="${r2(effW - 12)}" height="${ROW - 8}" rx="4" fill="${c.pos ? "#ffe3e3" : "#f1f3f5"}"/>`);
    parts.push(txt(xe + effW / 2, y + 18.5, c.pos ? pr.effect : "—", { size: 12.5, anchor: "middle", color: c.pos ? C.red : "#868e96", bold: c.pos }));
    parts.push(`<line x1="0" y1="${y + ROW}" x2="${r2(tableW)}" y2="${y + ROW}" stroke="#dee2e6"/>`);
  });
  const h = head + pr.cases.length * ROW;
  parts.push(`<rect x="0" y="0" width="${r2(tableW)}" height="${h}" fill="none" stroke="#adb5bd"/>`);
  parts.push(`<line x1="0" y1="${head}" x2="${r2(tableW)}" y2="${head}" stroke="#adb5bd"/>`);
  parts.push(`<line x1="${r2(xe)}" y1="0" x2="${r2(xe)}" y2="${h}" stroke="#adb5bd"/>`);
  // Brackets on the right join two cases that differ in one factor, named beside it.
  let bx = tableW + 14;
  let extraW = 0;
  for (const d of pr.diffs.slice(0, 4)) {
    const [y1, y2] = [head + d.p * ROW + ROW / 2, head + d.n * ROW + ROW / 2];
    parts.push(`<path d="M${r2(bx)} ${y1} h10 V${y2} h-10" fill="none" stroke="${C.purple}" stroke-width="1.8"/>`);
    parts.push(txt(bx + 15, (y1 + y2) / 2 + 4.5, d.f, { size: 12, color: C.purple, bold: true }));
    const step = 28 + tw(d.f, 12);
    bx += step;
    extraW += step;
  }
  return { svg: parts.join(""), width: tableW + (extraW ? extraW + 14 : 0), h };
}

function renderPresence(src: string, w: MillWords): RenderedSvg {
  const pr = readCases(src, w);
  const e = pr.effect;
  const neg = pr.cases.some((c) => !c.pos);
  const caps: Caption[] = [];
  if (pr.agree.length === 1) caps.push({ text: fill(w.agreeOne, { f: pr.agree[0], e }), color: C.blue });
  else if (pr.agree.length) caps.push({ text: fill(w.agreeMany, { fs: list(pr.agree), e }), color: C.blue });
  else caps.push({ text: fill(w.agreeNone, { e }), color: C.orange });
  if (!neg) caps.push({ text: fill(w.diffNoNeg, { e }), color: "#868e96" });
  else if (pr.diffs.length)
    for (const d of pr.diffs.slice(0, 4)) caps.push({ text: fill(w.diff, { p: pr.cases[d.p].name, n: pr.cases[d.n].name, f: d.f, e }), color: C.purple });
  else caps.push({ text: fill(w.diffNone, { e }), color: "#868e96" });
  if (neg && pr.joint.length) caps.push({ text: fill(w.joint, { fs: list(pr.joint), e }), color: C.green });
  const suff = pr.sufficient.filter((f) => !pr.joint.includes(f));
  if (suff.length) caps.push({ text: fill(w.sufficient, { fs: list(suff), e }), color: C.ink });
  caps.push({ text: w.caveat, color: C.ink });
  caps.push({ text: fill(w.legend, { e }), color: "#868e96" });
  const d = drawPresence(pr);
  const fit = fitW(d.svg, d.width, d.h);
  return composeText(fill(w.presenceTitle, { e }), fit.svg, fit.h, caps);
}

// ---------- concomitant variation ----------

export type Series = { name: string; vals: number[] };
const MAX_SERIES = 4;
const MAX_POINTS = 12;

/** Rows of numbers, name: n, n, n; the effect's row starts with -> (or is the last). */
export function readSeries(src: string, w: MillWords): { factors: Series[]; effect: Series } {
  const rows = lines(src);
  if (!rows.length) throw new Error(w.none);
  let effectAt = -1;
  const all = rows.map((line, i): Series => {
    const m = /^(?:(->|→|=>)\s*)?([^:]+):(.+)$/u.exec(line);
    const vals = m ? m[3].split(/[,;\s]+/).filter(Boolean).map(num) : [];
    if (!m || vals.some((v) => v === undefined)) throw new Error(fill(w.varBad, { s: line }));
    if (m[1]) effectAt = i;
    return { name: m[2].trim(), vals: vals as number[] };
  });
  const effect = all.splice(effectAt >= 0 ? effectAt : all.length - 1, 1)[0];
  const n = effect.vals.length;
  if (!all.length || all.length > MAX_SERIES || n < 3 || n > MAX_POINTS) throw new Error(fill(w.varTooBig, { k: MAX_SERIES, n: MAX_POINTS }));
  if (all.some((s) => s.vals.length !== n)) throw new Error(fill(w.varLengths, { n }));
  return { factors: all, effect };
}

/** Pearson's r; undefined when either row doesn't change. */
export function correlation(a: readonly number[], b: readonly number[]): number | undefined {
  const mean = (x: readonly number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const [ma, mb] = [mean(a), mean(b)];
  let [sab, saa, sbb] = [0, 0, 0];
  a.forEach((_, i) => {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  });
  return saa < 1e-12 || sbb < 1e-12 ? undefined : sab / Math.sqrt(saa * sbb);
}

const show = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** r to two places, so 0.995 shows as 1.00 and not as a perfect 1. */
const rText = (r: number) => (r < 0 ? `−${(-r).toFixed(2)}` : r.toFixed(2));

/** One small scatter of a factor (across) against the effect (up), with its least-squares line. */
function scatter(f: Series, e: Series, r: number | undefined, x: number, size: number): string {
  const pad = 26;
  const span = (v: readonly number[]) => {
    const [lo, hi] = [Math.min(...v), Math.max(...v)];
    return hi > lo ? [lo, hi] : [lo - 1, hi + 1];
  };
  const [x0, x1] = span(f.vals);
  const [y0, y1] = span(e.vals);
  const px = (v: number) => x + pad + ((v - x0) / (x1 - x0)) * (size - pad - 8);
  const py = (v: number) => 24 + (size - 30) - ((v - y0) / (y1 - y0)) * (size - 30);
  const parts = [
    txt(x + size / 2, 14, f.name, { size: 12.5, anchor: "middle", bold: true }),
    `<line x1="${r2(x + pad)}" y1="${size - 6}" x2="${r2(x + size)}" y2="${size - 6}" stroke="#adb5bd"/>`,
    `<line x1="${r2(x + pad)}" y1="24" x2="${r2(x + pad)}" y2="${size - 6}" stroke="#adb5bd"/>`,
  ];
  if (r !== undefined) {
    // The least-squares line through the points.
    const mx = f.vals.reduce((s, v) => s + v, 0) / f.vals.length;
    const my = e.vals.reduce((s, v) => s + v, 0) / e.vals.length;
    const sxx = f.vals.reduce((s, v) => s + (v - mx) ** 2, 0);
    const slope = f.vals.reduce((s, v, i) => s + (v - mx) * (e.vals[i] - my), 0) / sxx;
    const at = (v: number) => Math.max(y0, Math.min(y1, my + slope * (v - mx)));
    parts.push(`<line x1="${r2(px(x0))}" y1="${r2(py(at(x0)))}" x2="${r2(px(x1))}" y2="${r2(py(at(x1)))}" stroke="${C.orange}" stroke-width="1.6" stroke-dasharray="4 3"/>`);
  }
  f.vals.forEach((v, i) => parts.push(`<circle cx="${r2(px(v))}" cy="${r2(py(e.vals[i]))}" r="4" fill="${C.blue}"/>`));
  parts.push(txt(x + size / 2, size + 14, r === undefined ? "r = —" : `r = ${rText(r)}`, { size: 12.5, anchor: "middle", color: r !== undefined && Math.abs(r) >= 0.8 ? C.green : "#495057", bold: true }));
  return parts.join("");
}

function renderVariation(src: string, w: MillWords): RenderedSvg {
  const { factors, effect } = readSeries(src, w);
  const e = effect.name;
  const rs = factors.map((f) => correlation(f.vals, effect.vals));
  const caps: Caption[] = factors.map((f, i) => {
    const r = rs[i];
    if (r === undefined) return { text: fill(w.flat, { f: f.name, e }), color: "#868e96" };
    if (Math.abs(r) < 0.5) return { text: fill(w.weak, { f: f.name, e, r: rText(r) }), color: "#868e96" };
    return { text: fill(r > 0 ? w.rises : w.falls, { f: f.name, e, r: rText(r) }), color: Math.abs(r) >= 0.8 ? C.green : C.ink };
  });
  const strong = factors.map((f, i) => ({ f, r: rs[i] ?? 0 })).filter((x) => Math.abs(x.r) >= 0.8).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  // Two factors that both move with the effect may only follow each other, so none is named the best.
  if (strong.length === 1) caps.push({ text: fill(w.varBest, { f: strong[0].f.name, e }), color: C.blue });
  else if (strong.length) caps.push({ text: fill(w.varCaveat, { fs: list(strong.map((x) => x.f.name)), e }), color: C.orange });
  else caps.push({ text: fill(w.varNone, { e }), color: C.orange });
  const size = Math.min(170, (W - 60) / factors.length - 16);
  const gap = 16;
  const total = factors.length * size + (factors.length - 1) * gap;
  const left = (W - total) / 2;
  const body = factors.map((f, i) => scatter(f, effect, rs[i], left + i * (size + gap), size)).join("") + txt(W / 2, size + 34, `↑ ${e}`, { size: 12, anchor: "middle", color: "#868e96" });
  return composeText(fill(w.varTitle, { e }), body, size + 40, caps);
}

// ---------- residues ----------

export type Residues = { whole: { name: string; v: number }; known: { name: string; v: number }[]; rest: string; left: number };

/** The whole, Name: number; the known parts the same way; last, the name of what is left over (optional). */
export function readResidues(src: string, w: MillWords): Residues {
  const rows = lines(src);
  if (!rows.length) throw new Error(w.none);
  const out: { name: string; v: number }[] = [];
  let rest = w.rest;
  rows.forEach((line, i) => {
    const m = /^([^:=]+)[:=]\s*(.+)$/u.exec(line);
    const v = m ? num(m[2]) : undefined;
    if (m && v !== undefined && v >= 0) out.push({ name: m[1].trim(), v });
    else if (!m && i === rows.length - 1) rest = line.replace(/^\?\s*/, "");
    else throw new Error(fill(w.resBad, { s: line }));
  });
  if (out.length < 2) throw new Error(w.resFew);
  const [whole, ...known] = out;
  const sum = known.reduce((s, k) => s + k.v, 0);
  if (sum > whole.v + 1e-9) throw new Error(fill(w.resOver, { p: show(r2(sum)), t: show(whole.v) }));
  return { whole, known, rest, left: r2(whole.v - sum) };
}

const SHADES = ["#4dabf7", "#74c0fc", "#a5d8ff", "#339af0", "#91a7ff", "#748ffc"];

/** The bar model: the whole on top, below it the known parts and what is left, to the same scale. */
function drawResidues(rd: Residues): { svg: string; h: number } {
  const L = 40;
  const R = W - 40;
  const k = (R - L) / rd.whole.v;
  const parts: string[] = [];
  parts.push(`<rect x="${L}" y="18" width="${r2(R - L)}" height="34" rx="3" fill="#ffe8cc" stroke="${C.ink}" stroke-width="1.4"/>`);
  parts.push(txt((L + R) / 2, 40, `${rd.whole.name}: ${show(rd.whole.v)}`, { size: 13.5, anchor: "middle", bold: true }));
  let x = L;
  const segs = [...rd.known.map((p, i) => ({ ...p, fill: SHADES[i % SHADES.length], left: false })), { name: rd.rest, v: rd.left, fill: "#ffd8a8", left: true }];
  for (const s of segs) {
    const wd = s.v * k;
    if (wd <= 0) continue;
    parts.push(`<rect x="${r2(x)}" y="70" width="${r2(wd)}" height="34" fill="${s.fill}" stroke="${C.ink}" stroke-width="1.4"${s.left ? ` stroke-dasharray="5 3"` : ""}/>`);
    const label = show(s.v);
    // A label goes inside when it fits, else under the bar.
    const fits = tw(label, 13) + 8 < wd;
    parts.push(txt(x + wd / 2, fits ? 92 : 122, label, { size: 13, anchor: "middle", bold: true, color: s.left ? C.orange : C.ink }));
    const nameY = fits ? 122 : 138;
    parts.push(txt(x + wd / 2, nameY, s.name, { size: 12, anchor: "middle", color: s.left ? C.orange : "#495057", bold: s.left }));
    x += wd;
  }
  // A brace over the part that is left.
  if (rd.left > 0) {
    const [a, b] = [R - rd.left * k, R];
    parts.push(`<path d="M${r2(a)} 66 v-5 H${r2(b)} v5" fill="none" stroke="${C.orange}" stroke-width="1.6"/>`);
  }
  return { svg: parts.join(""), h: 146 };
}

function renderResidues(src: string, w: MillWords): RenderedSvg {
  const rd = readResidues(src, w);
  const caps: Caption[] = [];
  if (rd.left > 0) caps.push({ text: fill(w.residue, { t: show(rd.whole.v), parts: rd.known.map((p) => show(p.v)).join(" − "), r: show(rd.left), f: rd.rest }), color: C.orange });
  else caps.push({ text: w.resZero, color: C.green });
  caps.push({ text: w.resCaveat, color: C.ink });
  const d = drawResidues(rd);
  return composeText(w.resTitle, d.svg, d.h, caps);
}

export function renderMill(spec: LogicSpec, w: MillWords): RenderedSvg {
  const mode = spec.mill ?? "presence";
  return mode === "variation" ? renderVariation(spec.f, w) : mode === "residues" ? renderResidues(spec.f, w) : renderPresence(spec.f, w);
}

// ---------- examples ----------

const ml = (mill: MillMode, f: string): LogicSpec => ({ topic: "mill", f, g: "", vals: "", tf: true, mill });

export const MILL_PRESETS: { label: string; spec: LogicSpec }[] = [
  { label: "Food poisoning", spec: ml("presence", "Ann: oysters, salad, cake -> sick\nBen: oysters, bread -> sick\nCara: salad, cake, bread -> well\nEva: salad, cake -> well") },
  { label: "Semmelweis", spec: ml("presence", "First clinic: poor mothers, crowded, autopsy hands -> fever\nSecond clinic: poor mothers, crowded -> no fever\nFirst clinic, 1848: poor mothers, crowded, autopsy hands, chlorine wash -> no fever") },
  { label: "Agreement can't choose", spec: ml("presence", "Day 1: coffee, late night, exam -> headache\nDay 2: coffee, late night -> headache\nDay 3: coffee, late night, rain -> headache") },
  { label: "Two causes", spec: ml("presence", "Mon: pollen -> sneezing\nTue: dust -> sneezing\nWed: rain -> no sneezing") },
  { label: "Fertiliser", spec: ml("variation", "fertiliser: 0, 1, 2, 3, 4\nrain: 5, 3, 6, 4, 5\n-> growth: 2, 4, 6, 7, 9") },
  { label: "Ice cream and drowning", spec: ml("variation", "ice cream sold: 10, 25, 40, 60, 80\ntemperature: 12, 18, 24, 29, 33\n-> drownings: 1, 3, 4, 6, 8") },
  { label: "A truck on the scale", spec: ml("residues", "Truck with its load: 7400\nEmpty truck: 5200\nDriver: 80\nLoad") },
  { label: "The electricity bill", spec: ml("residues", "Bill: 120\nFridge: 35\nLights: 15\nHeating: 50\nWater heater") },
  { label: "Отравление", spec: ml("presence", "Аня: устрицы, салат, торт -> болен\nБоря: устрицы, хлеб -> болен\nВера: салат, торт, хлеб -> здоров\nЕва: салат, торт -> здоров") },
  { label: "მოწამვლა", spec: ml("presence", "ანა: ხამანწკა, სალათი, ნამცხვარი -> ავად\nბექა: ხამანწკა, პური -> ავად\nდათო: სალათი, ნამცხვარი, პური -> კარგად\nეკა: სალათი, ნამცხვარი -> კარგად") },
];
