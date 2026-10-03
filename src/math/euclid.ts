// School geometry: circle theorems (every angle and length found with its reason, unknowns in x solved for); similar
// and congruent triangles (the scale factor, missing sides and angles, the A- and X-shapes, which test proves it) with
// how lengths, areas and volumes scale; transformations on a grid (translate, reflect, rotate, enlarge, one after
// another, and describing the single transformation that maps a shape onto its image); surface area and volume of
// solids (exact in π, a missing dimension from the volume, composite solids, drawings and nets); constructions with
// ruler and compasses, and loci with the region they bound shaded.
import { arrow, C, compose, esc, fill, FONT, nf, r2, texLines, W, type Caption, type TexLine } from "./chart";
import { evalE, exprMessages, parseE, type E } from "./expr";
import { latexToSvg, type RenderedSvg } from "./latex";

export type EuclidTopic = "circle" | "similar" | "transform" | "solids" | "construct";
export const EUCLID_TOPICS: EuclidTopic[] = ["circle", "similar", "transform", "solids", "construct"];
export type EuclidSpec = { topic: EuclidTopic; src: string };

type CircleWhy =
  | "centre" | "semicircle" | "segment" | "cyclic" | "tangent" | "tangents" | "alternate" | "chord" | "chords" | "secant"
  | "triangle" | "quad" | "line" | "isosceles" | "symmetry" | "sum" | "pythagoras" | "trig";

export type EuclidWords = {
  bad: string;
  tooBig: string;
  need: Record<EuclidTopic, string>;
  notLinear: string;
  nonLinear: string;
  solveX: string;
  xIs: string;
  noX: string;
  circle: {
    scenes: string;
    unknownScene: string;
    unknownName: string;
    badClause: string;
    contradict: string;
    impossible: string;
    cantDraw: string;
    cannot: string;
    why: Record<CircleWhy, string>;
    thm: Record<CircleWhy, string>;
  };
  similar: {
    badShape: string;
    notTriangle: string;
    testNumbers: string;
    sameLetters: string;
    unknownPart: string;
    scale: string;
    corrSides: string;
    corrAngles: string;
    triangle: string;
    parts: string;
    ratios: string;
    notSimilar: string;
    noScale: string;
    cannot: string;
    congruent: string;
    similar: string;
    neither: string;
    notEnough: string;
    ssa: string;
    aaa: string;
    tests: Record<"SSS" | "SAS" | "ASA" | "AAS" | "RHS" | "AA" | "SSSs" | "SASs", string>;
    areaRatio: string;
    lengths: string;
    areas: string;
    volumes: string;
    scaleNeed: string;
    scaleCap: string;
    shape: string;
    image: string;
  };
  transform: {
    badPoints: string;
    badMove: string;
    badLine: string;
    tooFew: string;
    sameCount: string;
    rule: string;
    translate: string;
    reflect: string;
    rotate: string;
    enlarge: string;
    acw: string;
    cw: string;
    half: string;
    combined: string;
    single: string;
    noSingle: string;
    glide: string;
    spiral: string;
    stretch: string;
    identity: string;
    vector: string;
    mirror: string;
    centre: string;
    angle: string;
    factor: string;
    rays: string;
    bisectors: string;
    perpBis: string;
    sameVector: string;
    notMatch: string;
  };
  solids: {
    unknownSolid: string;
    badDim: string;
    missing: string;
    tooMany: string;
    stackOnly: string;
    holeOnly: string;
    volume: string;
    area: string;
    curved: string;
    slant: string;
    radius: string;
    height: string;
    hidden: string;
    hole: string;
    blind: string;
    total: string;
    solveFor: string;
    numeric: string;
    net: string;
    noNet: string;
    names: Record<SolidKind, string>;
    dims: Record<string, string>;
  };
  construct: {
    unknownCmd: string;
    needPoints: string;
    samePoint: string;
    noTriangle: string;
    noRegion: string;
    needSides: string;
    onlyAngles: string;
    flat: string;
    onLine: string;
    noMeet: string;
    meet: string;
    midpoint: string;
    foot: string;
    lineEq: string;
    angles: string;
    region: string;
    steps: Record<string, string[]>;
    locus: Record<string, string>;
  };
};

/** What the tests check: the values found for each topic. */
export type EuclidData = {
  values?: Record<string, number>;
  x?: number;
  k?: number;
  test?: string;
  images?: [number, number][][];
  kind?: string;
  centre?: [number, number];
  angle?: number;
  factor?: number;
  mirror?: [number, number, number];
  vector?: [number, number];
  V?: number;
  A?: number;
  dim?: number;
  points?: [number, number][];
  /** Circle theorems: angles and lengths measured on the figure as drawn (lengths in the figure's own units). */
  measured?: Record<string, number>;
};

let words: EuclidWords;
let data: EuclidData = {};

const err = (m: string, v: Record<string, string | number> = {}) => new Error(fill(m, v));

// ---------- numbers ----------

const big = (a: number, b: number) => Math.max(1, Math.abs(a), Math.abs(b));
const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * big(a, b);
/** v as n/d with d ≤ maxD, when it is one. */
function rat(v: number, maxD = 12): [number, number] | null {
  if (!Number.isFinite(v)) return null;
  for (let d = 1; d <= maxD; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n - v * d) < 1e-9 * Math.max(1, Math.abs(v * d))) return [n, d];
  }
  return null;
}
const igcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};
const terminates = (d: number) => {
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
};
/** The exact value when it is short: a decimal with up to 3 places, a fraction, or a surd k√m/d; null otherwise. */
function exactTex(v: number, o: { frac?: boolean } = {}): string | null {
  if (!Number.isFinite(v)) return null;
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  const q = rat(a, 1000);
  if (q) {
    const [n, d] = q;
    if (d === 1) return sign + n;
    if (d <= 12 && (o.frac || !terminates(d))) return `${sign}\\frac{${n}}{${d}}`;
    if (terminates(d) && d <= 1000) return sign + nf(a, 3);
  }
  const s = rat(a * a, 144);
  if (s && s[0] > 0) {
    // √(n/d) = √(nd)/d
    let inside = s[0] * s[1];
    let out = 1;
    for (let f = 2; f * f <= inside; f++)
      while (inside % (f * f) === 0) {
        inside /= f * f;
        out *= f;
      }
    if (inside > 1 && inside < 1e5) {
      const g = igcd(out, s[1]);
      const [n, d] = [out / g, s[1] / g];
      const root = `${n === 1 ? "" : n}\\sqrt{${inside}}`;
      return sign + (d === 1 ? root : `\\frac{${root}}{${d}}`);
    }
  }
  return null;
}
/** A number in LaTeX: exact when it can be, otherwise rounded to `dp` places. */
const numTex = (v: number, dp = 2, o: { frac?: boolean } = {}) => exactTex(v, o) ?? nf(v, dp);
const isExact = (v: number) => exactTex(v) !== null;
/** "= exact" or "= exact ≈ decimal" for surds and recurring fractions, or "≈ decimal". */
function resTex(v: number, ap: boolean, unit = "", dp = 2): string {
  const ex = ap ? null : exactTex(v);
  if (ex === null) return `\\approx ${nf(v, dp)}${unit}`;
  const plain = rat(Math.abs(v), 1000) && terminates(rat(Math.abs(v), 1000)![1]);
  return plain ? `= ${ex}${unit}` : `= ${ex}${unit} \\approx ${nf(v, dp)}${unit}`;
}
/** A plain-text number for labels on the pictures. */
const plainNum = (v: number, dp = 2) => {
  const q = rat(Math.abs(v), 12);
  if (q && q[1] > 1 && !terminates(q[1])) return `${v < 0 ? "−" : ""}${q[0]}/${q[1]}`;
  return nf(v, dp).replace("-", "−");
};

/** Reads a number: 3, -1/2, 2.5, sqrt(2), 36pi. */
function readNum(src: string): number {
  const s = src.replace(/π/g, "pi").replace(/−/g, "-").trim();
  let e: E;
  try {
    e = parseE(s);
  } catch {
    throw err(words.bad, { s: src });
  }
  const v = evalE(e, 0);
  if (!Number.isFinite(v)) throw err(words.bad, { s: src });
  return v + 0;
}

// ---------- linear expressions in x ----------

type Lin = { c: number; k: number }; // c + k·x
const lin = (c: number, k = 0): Lin => ({ c, k });
const ladd = (a: Lin, b: Lin, s = 1): Lin => ({ c: a.c + s * b.c, k: a.k + s * b.k });
const lscale = (a: Lin, s: number): Lin => ({ c: a.c * s, k: a.k * s });
const hasX = (a: Lin) => Math.abs(a.k) > 1e-12;
function lmul(a: Lin, b: Lin): Lin {
  if (hasX(a) && hasX(b)) throw new Error(words.nonLinear);
  return { c: a.c * b.c, k: a.k * b.c + b.k * a.c };
}
/** Reads a number or a linear expression in x (degrees and units are dropped). */
function readLin(src: string): Lin {
  const s = src.replace(/°|º/g, "").replace(/π/g, "pi").replace(/−/g, "-").replace(/\b(cm|mm|m|km|deg|degrees)\b/gi, "").trim();
  let e: E;
  try {
    e = parseE(s, ["x"]);
  } catch {
    throw err(words.bad, { s: src });
  }
  const f = (x: number) => evalE(e, x);
  const c = f(0);
  const k = f(1) - c;
  if (![c, k].every(Number.isFinite)) throw err(words.bad, { s: src });
  for (const x of [2, -3, 7.5]) if (!near(f(x), c + k * x, 1e-7)) throw err(words.notLinear, { s: src });
  return { c: c + 0, k: Math.abs(k) < 1e-12 ? 0 : k };
}
/** c + kx in LaTeX with a unit; bracketed when it has two terms and `paren` is set (or a unit follows). */
function linTex(l: Lin, unit = "", paren = false): string {
  if (!hasX(l)) return numTex(l.c) + unit;
  const k = l.k === 1 ? "" : l.k === -1 ? "-" : numTex(l.k);
  const xs = `${k}x`;
  if (Math.abs(l.c) < 1e-12) return unit ? `${xs}${unit}` : xs;
  const body = l.k < 0 ? `${numTex(l.c)} - ${l.k === -1 ? "" : numTex(-l.k)}x` : `${xs} ${l.c < 0 ? "-" : "+"} ${numTex(Math.abs(l.c))}`;
  return unit || paren ? `\\left(${body}\\right)${unit}` : body;
}
const linPlain = (l: Lin, unit = "") =>
  hasX(l)
    ? `(${linTex(l).replace(/\\left|\\right/g, "").replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2").replace(/-/g, "−")})${unit}`
    : plainNum(l.c) + unit;

/** Solves L = R for x, with the working. */
function solveLin(L: Lin, R: Lin): { x: number; rows: TexLine[] } {
  let k = L.k - R.k;
  let c = R.c - L.c;
  if (k < 0) [k, c] = [-k, -c];
  const rows: TexLine[] = [];
  const simple = `${linTex(L)} = ${linTex(R)}`;
  rows.push({ tex: simple });
  const x = c / k;
  if (Math.abs(L.k) > 1e-12 && Math.abs(R.k) > 1e-12) rows.push({ tex: `${linTex(lin(0, k))} = ${numTex(c)}` });
  rows.push({ tex: `x = ${numTex(x)}`, op: words.solveX });
  return { x: x + 0, rows };
}

// ---------- pictures ----------

type Pic = { svg: string; h: number; w?: number };
const cache = new Map<string, RenderedSvg>();
function tx(t: string, color: string = C.ink): RenderedSvg {
  const key = `${color}|${t}`;
  let r = cache.get(key);
  if (!r) {
    if (cache.size > 800) cache.clear();
    r = latexToSvg(t, color);
    cache.set(key, r);
  }
  return r;
}
/** A LaTeX snippet with its vertical centre at y. */
function put(t: string, x: number, y: number, anchor: "start" | "middle" | "end" = "middle", color: string = C.ink, scale = 1): string {
  const r = tx(t, color);
  const [w, h] = [r.width * scale, r.height * scale];
  const x0 = anchor === "start" ? x : anchor === "middle" ? x - w / 2 : x - w;
  return r.svg
    .replace(/width="[\d.]+"/, `width="${r2(w)}"`)
    .replace(/height="[\d.]+"/, `height="${r2(h)}"`)
    .replace(/^<svg/, `<svg x="${r2(x0)}" y="${r2(y - h / 2)}"`);
}
const line = (x1: number, y1: number, x2: number, y2: number, color: string, width = 1.6, extra = "") =>
  `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
const DASH = `stroke-dasharray="5 4"`;
/** Text with a white halo. */
function text(x: number, y: number, s: string, color: string = C.ink, o: { anchor?: string; size?: number; italic?: boolean; bold?: boolean } = {}) {
  return `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 13}" ${o.italic ? `font-style="italic"` : ""} font-weight="${o.bold === false ? 400 : 700}" fill="${color}" text-anchor="${o.anchor ?? "middle"}" paint-order="stroke" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round">${esc(s)}</text>`;
}
/** Shrinks a picture that is too wide. */
function fit(svg: string, w: number, h: number, max = W - 24): Pic {
  if (w <= max) return { svg, h, w };
  const k = max / w;
  return { svg: `<g transform="scale(${r2(k * 1000) / 1000})">${svg}</g>`, h: h * k, w: max };
}
/** Pictures side by side while they fit, then on the next line. */
function flow(pics: Pic[], gap = 24): Pic[] {
  const out: Pic[] = [];
  let cur: Pic[] = [];
  const flush = () => {
    if (!cur.length) return;
    const tw = cur.reduce((s, p) => s + (p.w ?? W), 0) + gap * (cur.length - 1);
    let x = 0;
    const svg = cur.map((p) => {
      const s = `<g transform="translate(${r2(x)} ${r2((Math.max(...cur.map((q) => q.h)) - p.h) / 2)})">${p.svg}</g>`;
      x += (p.w ?? W) + gap;
      return s;
    });
    out.push({ svg: svg.join(""), h: Math.max(...cur.map((p) => p.h)), w: tw });
    cur = [];
  };
  for (const p of pics) {
    const tw = cur.reduce((s, q) => s + (q.w ?? W) + gap, 0) + (p.w ?? W);
    if (cur.length && tw > W - 24) flush();
    cur.push(p);
  }
  flush();
  return out;
}
function finish(header: string, rows: TexLine[], pics: Pic[], caps: Caption[]): RenderedSvg {
  const ln = texLines(rows, 4);
  let y = 4 + ln.h + (rows.length ? 10 : 0);
  let body = ln.svg;
  for (const p of flow(pics)) {
    body += `<g transform="translate(${r2((W - (p.w ?? W)) / 2)} ${r2(y)})">${p.svg}</g>`;
    y += p.h + 10;
  }
  return compose(header, body, y, caps);
}

// ---------- plane figures ----------

type P = [number, number];
const vsub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const vadd = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const vmul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const vlen = (a: P) => Math.hypot(a[0], a[1]);
const vdist = (a: P, b: P) => vlen(vsub(a, b));
const vunit = (a: P): P => vmul(a, 1 / (vlen(a) || 1));
const vdot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1];
const vcross = (a: P, b: P) => a[0] * b[1] - a[1] * b[0];
const rad = (d: number) => (d * Math.PI) / 180;
const degOf = (r: number) => (r * 180) / Math.PI;
const dir = (d: number): P => [Math.cos(rad(d)), Math.sin(rad(d))];
const rot = (p: P, d: number, c: P = [0, 0]): P => {
  const [x, y] = vsub(p, c);
  const [co, si] = [Math.cos(rad(d)), Math.sin(rad(d))];
  return [c[0] + x * co - y * si, c[1] + x * si + y * co];
};

/** A labelled figure: points, a circle, segments, lines drawn past their points, angle marks and length labels. */
type Fig = {
  pts: Record<string, P>;
  hide?: string[]; // points drawn without a letter
  circles?: { c: P; r: number }[];
  segs: [string, string][];
  dashed?: [string, string][];
  lines?: [string, string][]; // extended a little past both points
  angles: Record<string, [string, string, string]>;
  lengths?: Record<string, [string, string, number?, number?, number?]>; // other side?, distance from the line, where along it
  ticks?: [string, string, number][];
  arcs?: [string, string, string, number][]; // equal-angle marks: 1, 2 or 3 arcs
  fills?: { pts: string[]; color: string }[];
  centre?: P; // labels point away from it
};
type Tag = { text: string; color: string };

/** Draws a figure scaled into a box. */
function drawFig(f: Fig, tags: Record<string, Tag | undefined>, box: { w: number; h: number } = { w: 400, h: 300 }): Pic {
  const all = Object.values(f.pts);
  for (const c of f.circles ?? []) all.push([c.c[0] - c.r, c.c[1] - c.r], [c.c[0] + c.r, c.c[1] + c.r]);
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 30;
  const s = Math.min((box.w - 2 * pad) / Math.max(x1 - x0, 1e-6), (box.h - 2 * pad) / Math.max(y1 - y0, 1e-6));
  const w = (x1 - x0) * s + 2 * pad;
  const h = (y1 - y0) * s + 2 * pad;
  const px = (p: P): P => [pad + (p[0] - x0) * s, pad + (y1 - p[1]) * s];
  const at = (n: string) => px(f.pts[n]);
  const centre = px(f.centre ?? [(x0 + x1) / 2, (y0 + y1) / 2]);
  const out: string[] = [];
  for (const fl of f.fills ?? [])
    out.push(`<polygon points="${fl.pts.map((n) => at(n).map(r2).join(",")).join(" ")}" fill="${fl.color}" opacity="0.13"/>`);
  for (const c of f.circles ?? []) {
    const [cx, cy] = px(c.c);
    out.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(c.r * s)}" fill="none" stroke="${C.ink}" stroke-width="2"/>`);
  }
  for (const [a, b] of f.lines ?? []) {
    const [p, q] = [at(a), at(b)];
    const d = vmul(vunit(vsub(q, p)), 38);
    out.push(line(p[0] - d[0], p[1] - d[1], q[0] + d[0], q[1] + d[1], C.ink, 2));
  }
  for (const [a, b] of f.dashed ?? []) out.push(line(...at(a), ...at(b), C.grey, 1.4, DASH));
  for (const [a, b] of f.segs) out.push(line(...at(a), ...at(b), C.ink, 2));
  for (const [a, b, n] of f.ticks ?? []) {
    const [p, q] = [at(a), at(b)];
    const m = vmul(vadd(p, q), 0.5);
    const u = vunit(vsub(q, p));
    const nrm: P = [-u[1], u[0]];
    for (let i = 0; i < n; i++) {
      const c = vadd(m, vmul(u, (i - (n - 1) / 2) * 5));
      out.push(line(c[0] - nrm[0] * 6, c[1] - nrm[1] * 6, c[0] + nrm[0] * 6, c[1] + nrm[1] * 6, C.ink, 1.6));
    }
  }
  for (const [a, v, b, n] of f.arcs ?? []) out.push(arcMark(at(a), at(v), at(b), C.purple, n));
  // Angle marks and their values.
  for (const [name, [a, v, b]] of Object.entries(f.angles)) {
    const tag = tags[name];
    if (!tag) continue;
    const [P1, V, P2] = [at(a), at(v), at(b)];
    const u1 = vunit(vsub(P1, V));
    const u2 = vunit(vsub(P2, V));
    const ang = degOf(Math.acos(Math.max(-1, Math.min(1, vdot(u1, u2)))));
    const rr = Math.max(12, Math.min(22, 0.4 * Math.min(vdist(P1, V), vdist(P2, V))));
    let bis = vadd(u1, u2);
    if (vlen(bis) < 1e-6) bis = [-u1[1], u1[0]];
    bis = vunit(bis);
    const right = Math.abs(ang - 90) < 0.3 && /^90°$/.test(tag.text);
    if (Math.abs(ang - 90) < 0.3) {
      const c1 = vadd(V, vmul(u1, 11));
      const c2 = vadd(V, vmul(u2, 11));
      const c3 = vadd(c1, vmul(u2, 11));
      out.push(`<path d="M${r2(c1[0])},${r2(c1[1])}L${r2(c3[0])},${r2(c3[1])}L${r2(c2[0])},${r2(c2[1])}" fill="none" stroke="${tag.color}" stroke-width="1.6"/>`);
    } else out.push(arcMark(P1, V, P2, tag.color, 1, rr));
    if (right) continue;
    const dist = rr + 9 + Math.min(16, 4.5 / Math.max(Math.sin(rad(ang / 2)), 0.1));
    const L = vadd(V, vmul(bis, dist));
    out.push(text(L[0], L[1] + 4.5, tag.text, tag.color, { size: 12.5 }));
  }
  // Lengths, on the side away from the middle of the figure.
  for (const [name, [a, b, side, off, t]] of Object.entries(f.lengths ?? {})) {
    const tag = tags[name];
    if (!tag) continue;
    const [p, q] = [at(a), at(b)];
    const m = vadd(p, vmul(vsub(q, p), t ?? 0.5));
    const u = vunit(vsub(q, p));
    let nrm: P = [-u[1], u[0]];
    if (vdot(nrm, vsub(m, centre)) < 0) nrm = vmul(nrm, -1);
    if (side) nrm = vmul(nrm, -1);
    const L = vadd(m, vmul(nrm, off ?? 13));
    out.push(text(L[0], L[1] + 4.5, tag.text, tag.color, { size: 12.5 }));
  }
  for (const [n, p] of Object.entries(f.pts)) {
    const q = px(p);
    out.push(`<circle cx="${r2(q[0])}" cy="${r2(q[1])}" r="2.6" fill="${C.ink}"/>`);
    if (f.hide?.includes(n)) continue;
    let d = vsub(q, centre);
    if (vlen(d) < 1e-6) d = [-1, -1];
    const L = vadd(q, vmul(vunit(d), 14));
    out.push(text(L[0], L[1] + 5, n, C.ink, { size: 14, italic: true }));
  }
  return { svg: out.join(""), h, w };
}
/** n concentric arcs inside the angle a-v-b (pixel coordinates). */
function arcMark(a: P, v: P, b: P, color: string, n = 1, r = 18): string {
  const u1 = vunit(vsub(a, v));
  const u2 = vunit(vsub(b, v));
  const sweep = vcross(u1, u2) > 0 ? 1 : 0;
  let s = "";
  for (let i = 0; i < n; i++) {
    const rr = r + i * 4;
    const [p, q] = [vadd(v, vmul(u1, rr)), vadd(v, vmul(u2, rr))];
    s += `<path d="M${r2(p[0])},${r2(p[1])}A${r2(rr)},${r2(rr)} 0 0 ${sweep} ${r2(q[0])},${r2(q[1])}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
  }
  return s;
}

// ---------- the clauses of an input ----------

const norm = (s: string) =>
  s.replace(/[−–]/g, "-").replace(/∠|angle\s+/gi, "").replace(/\s+/g, " ").trim();
/** Splits an input into clauses at ; and new lines. */
const clausesOf = (src: string) => src.split(/[;\n]/).map(norm).filter(Boolean);

// ---------- circle theorems ----------

type Rel = { l: [number, string][]; r: [number, string][]; c: number; why: CircleWhy };
/** A right-angled triangle: legs a, b opposite the angles A, B; hypotenuse h. */
type RT = { a: string; b: string; h: string; A: string; B: string };
/** l₁·l₂ = r₁·r₂ (intersecting chords, tangent–secant). */
type Prod = { l: [string, string]; r: [string, string]; why: CircleWhy };
type Scene = {
  keys: string[];
  q: Record<string, "a" | "l">;
  alias?: Record<string, string>;
  coreA: string[];
  coreL: string[];
  rels: Rel[];
  rts?: RT[];
  prods?: Prod[];
  fig: (v: (n: string) => number | undefined, shown: (n: string) => boolean) => Fig;
};
const terms = (s: string): [number, string][] =>
  s.split("+").map((t) => {
    const m = /^\s*(\d*)\s*([A-Z]+)\s*$/.exec(t)!;
    return [m[1] ? Number(m[1]) : 1, m[2]];
  });
/** "AOB + OAB + OBA" = 180, or "AOB" = "2 ACB". */
const rel = (l: string, r: string | number, why: CircleWhy): Rel =>
  typeof r === "number" ? { l: terms(l), r: [], c: r, why } : { l: terms(l), r: terms(r), c: 0, why };
const angles = (...ns: string[]) => Object.fromEntries(ns.map((n) => [n, "a" as const]));
const lengths = (...ns: string[]) => Object.fromEntries(ns.map((n) => [n, "l" as const]));
const tri = (n: string): [string, string, string] => [n[0], n[1], n[2]];
const angleRays = (...ns: string[]) => Object.fromEntries(ns.map((n) => [n, tri(n)]));
const lenSegs = (...ns: string[]) => Object.fromEntries(ns.map((n) => [n, [n[0], n[1]] as [string, string]]));
const cantDraw = () => new Error(words.circle.cantDraw);
const first = (...vs: (number | undefined)[]) => vs.find((v) => v !== undefined && Number.isFinite(v));

const SCENES: Record<string, Scene> = {
  centre: {
    keys: ["centre", "center", "angle at the centre", "angle at the center", "centre angle", "center angle"],
    q: angles("AOB", "ACB", "OAB", "OBA", "RAOB"),
    alias: { OBA: "OBA", "REFLEX AOB": "RAOB", REFLEXAOB: "RAOB" },
    coreA: ["AOB", "ACB"],
    coreL: [],
    rels: [
      rel("AOB", "2 ACB", "centre"),
      rel("OAB", "OBA", "isosceles"),
      rel("AOB + OAB + OBA", 180, "triangle"),
      rel("AOB + RAOB", 360, "line"),
    ],
    fig(v, shown) {
      const t = first(v("AOB"), v("ACB") !== undefined ? 2 * v("ACB")! : undefined) ?? 110;
      if (!(t > 0 && t < 180)) throw cantDraw();
      const pts: Record<string, P> = { O: [0, 0], A: dir(-90 - t / 2), B: dir(-90 + t / 2), C: dir(112) };
      const segs: [string, string][] = [["O", "A"], ["O", "B"], ["C", "A"], ["C", "B"]];
      if (shown("OAB") || shown("OBA")) segs.push(["A", "B"]);
      return { pts, circles: [{ c: [0, 0], r: 1 }], segs, angles: { ...angleRays("AOB", "ACB", "OAB", "OBA"), RAOB: ["B", "O", "A"] }, centre: [0, 0] };
    },
  },
  semicircle: {
    keys: ["semicircle", "diameter", "angle in a semicircle", "thales"],
    q: angles("ACB", "CAB", "CBA", "OCA", "OCB", "AOC", "BOC"),
    alias: { OAC: "CAB", OBC: "CBA" },
    coreA: ["ACB", "CAB", "CBA"],
    coreL: [],
    rels: [
      rel("ACB", 90, "semicircle"),
      rel("CAB + CBA + ACB", 180, "triangle"),
      rel("OCA", "CAB", "isosceles"),
      rel("OCB", "CBA", "isosceles"),
      rel("AOC + BOC", 180, "line"),
      rel("AOC + OCA + CAB", 180, "triangle"),
      rel("BOC + OCB + CBA", 180, "triangle"),
      rel("OCA + OCB", "ACB", "sum"),
    ],
    fig(v, shown) {
      const a = first(v("CAB"), v("CBA") !== undefined ? 90 - v("CBA")! : undefined, v("BOC") !== undefined ? v("BOC")! / 2 : undefined) ?? 33;
      if (!(a > 0 && a < 90)) throw cantDraw();
      const pts: Record<string, P> = { O: [0, 0], A: [-1, 0], B: [1, 0], C: dir(2 * a) };
      const segs: [string, string][] = [["A", "B"], ["A", "C"], ["B", "C"]];
      if (["OCA", "OCB", "AOC", "BOC"].some(shown)) segs.push(["O", "C"]);
      return { pts, circles: [{ c: [0, 0], r: 1 }], segs, angles: angleRays("ACB", "CAB", "CBA", "OCA", "OCB", "AOC", "BOC"), centre: [0, 0] };
    },
  },
  segment: {
    keys: ["segment", "same segment", "angles in the same segment", "same arc"],
    q: angles("ACB", "ADB", "CAD", "CBD"),
    coreA: ["ACB", "ADB"],
    coreL: [],
    rels: [rel("ACB", "ADB", "segment"), rel("CAD", "CBD", "segment")],
    fig(v, shown) {
      const t = first(v("ACB"), v("ADB")) ?? 40;
      if (!(t > 0 && t < 180)) throw cantDraw();
      const [s, e] = [-90 + t, 270 - t];
      const f = first(v("CAD"), v("CBD")) ?? Math.min(28, (e - s) * 0.3);
      if (!(f > 0 && f + t < 180)) throw cantDraw();
      const m = (s + e) / 2;
      const pts: Record<string, P> = { A: dir(-90 - t), B: dir(-90 + t), C: dir(m + f), D: dir(m - f) };
      const segs: [string, string][] = [["A", "C"], ["B", "C"], ["A", "D"], ["B", "D"], ["A", "B"]];
      if (shown("CAD") || shown("CBD")) segs.push(["C", "D"]);
      return { pts, circles: [{ c: [0, 0], r: 1 }], segs, angles: angleRays("ACB", "ADB", "CAD", "CBD"), centre: [0, 0] };
    },
  },
  cyclic: {
    keys: ["cyclic", "cyclic quadrilateral", "abcd"],
    q: angles("DAB", "ABC", "BCD", "CDA", "DCE"),
    alias: { A: "DAB", B: "ABC", C: "BCD", D: "CDA", E: "DCE", ECD: "DCE" },
    coreA: ["DAB", "ABC", "BCD", "CDA"],
    coreL: [],
    rels: [rel("DAB + BCD", 180, "cyclic"), rel("ABC + CDA", 180, "cyclic"), rel("BCD + DCE", 180, "line")],
    fig(v, shown) {
      const a = first(v("DAB"), v("BCD") !== undefined ? 180 - v("BCD")! : undefined, v("DCE")) ?? 82;
      const b = first(v("ABC"), v("CDA") !== undefined ? 180 - v("CDA")! : undefined) ?? 98;
      if (!(a > 0 && a < 180 && b > 0 && b < 180)) throw cantDraw();
      // Arcs AB, BC, CD, DA: BC + CD = 2∠A, CD + DA = 2∠B; CD is chosen to keep every arc as wide as possible.
      let best = -1;
      let arcs = [90, 90, 90, 90];
      for (let cd = 0.5; cd < Math.min(2 * a, 2 * b); cd += 0.5) {
        const set = [360 - 2 * a - 2 * b + cd, 2 * a - cd, cd, 2 * b - cd];
        const m = Math.min(...set);
        if (m > best) [best, arcs] = [m, set];
      }
      if (best <= 0) throw cantDraw();
      const A = 235 - arcs[0] / 2 + 45;
      const at = [A, A + arcs[0], A + arcs[0] + arcs[1], A + arcs[0] + arcs[1] + arcs[2]];
      const pts: Record<string, P> = { A: dir(at[0]), B: dir(at[1]), C: dir(at[2]), D: dir(at[3]) };
      const segs: [string, string][] = [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]];
      if (shown("DCE")) {
        pts.E = vadd(pts.C, vmul(vsub(pts.C, pts.B), 0.55));
        segs.push(["C", "E"]);
      }
      return { pts, circles: [{ c: [0, 0], r: 1 }], segs, angles: angleRays("DAB", "ABC", "BCD", "CDA", "DCE"), centre: [0, 0] };
    },
  },
  tangent: {
    keys: ["tangent", "tangent radius", "tangent and radius", "radius tangent"],
    q: { ...angles("OAP", "AOP", "APO"), ...lengths("OA", "AP", "OP") },
    alias: { r: "OA", PA: "AP" },
    coreA: ["OAP", "AOP", "APO"],
    coreL: ["OA", "AP", "OP"],
    rels: [rel("OAP", 90, "tangent"), rel("OAP + AOP + APO", 180, "triangle")],
    rts: [{ a: "OA", b: "AP", h: "OP", A: "APO", B: "AOP" }],
    fig(v) {
      const lenAng = v("OA") && v("AP") ? degOf(Math.atan2(v("AP")!, v("OA")!)) : v("OA") && v("OP") ? degOf(Math.acos(v("OA")! / v("OP")!)) : undefined;
      const b = first(v("AOP"), v("APO") !== undefined ? 90 - v("APO")! : undefined, lenAng) ?? 58;
      if (!(b > 0 && b < 90)) throw cantDraw();
      const pts: Record<string, P> = { O: [0, 0], A: [0, -1], P: [Math.tan(rad(b)), -1] };
      return { pts, circles: [{ c: [0, 0], r: 1 }], segs: [["O", "A"], ["O", "P"]], lines: [["A", "P"]], angles: angleRays("OAP", "AOP", "APO"), lengths: lenSegs("OA", "AP", "OP"), centre: [0, 0] };
    },
  },
  tangents: {
    keys: ["tangents", "two tangents", "tangents from a point", "two tangents from a point"],
    q: { ...angles("APB", "AOB", "OAP", "OBP", "PAB", "PBA", "OAB", "OBA", "AOP", "APO"), ...lengths("PA", "PB", "OA", "OP") },
    alias: { r: "OA", OB: "OA", BO: "OA" },
    coreA: ["APB", "AOB", "OAP", "OBP"],
    coreL: ["PA", "PB", "OA", "OP"],
    rels: [
      rel("OAP", 90, "tangent"),
      rel("OBP", 90, "tangent"),
      rel("APB + AOB + OAP + OBP", 360, "quad"),
      rel("PA", "PB", "tangents"),
      rel("PAB", "PBA", "isosceles"),
      rel("PAB + PBA + APB", 180, "triangle"),
      rel("OAB", "OBA", "isosceles"),
      rel("OAB + OBA + AOB", 180, "triangle"),
      rel("OAB + PAB", "OAP", "sum"),
      rel("AOB", "2 AOP", "symmetry"),
      rel("APB", "2 APO", "symmetry"),
      rel("AOP + APO + OAP", 180, "triangle"),
    ],
    rts: [{ a: "OA", b: "PA", h: "OP", A: "APO", B: "AOP" }],
    fig(v, shown) {
      const lenAng = v("OA") && v("PA") ? degOf(Math.atan2(v("PA")!, v("OA")!)) : v("OA") && v("OP") ? degOf(Math.acos(v("OA")! / v("OP")!)) : undefined;
      const b = first(v("AOP"), v("AOB") !== undefined ? v("AOB")! / 2 : undefined, v("APB") !== undefined ? 90 - v("APB")! / 2 : undefined, lenAng) ?? 62;
      if (!(b > 0 && b < 90)) throw cantDraw();
      const pts: Record<string, P> = { O: [0, 0], A: dir(-90 - b), B: dir(-90 + b), P: [0, -1 / Math.cos(rad(b))] };
      const segs: [string, string][] = [["P", "A"], ["P", "B"], ["O", "A"], ["O", "B"]];
      if (["OP", "AOP", "APO"].some(shown)) segs.push(["O", "P"]);
      if (["PAB", "PBA", "OAB", "OBA"].some(shown)) segs.push(["A", "B"]);
      return { pts, circles: [{ c: [0, 0], r: 1 }], segs, angles: angleRays("APB", "AOB", "OAP", "OBP", "PAB", "PBA", "OAB", "OBA", "AOP", "APO"), lengths: lenSegs("PA", "PB", "OA", "OP"), centre: [0, -0.4] };
    },
  },
  alternate: {
    keys: ["alternate", "alternate segment", "alternate segment theorem", "tangent chord"],
    q: angles("TAB", "SAC", "BAC", "ABC", "ACB"),
    coreA: ["TAB", "SAC", "BAC", "ABC", "ACB"],
    coreL: [],
    rels: [rel("TAB", "ACB", "alternate"), rel("SAC", "ABC", "alternate"), rel("TAB + BAC + SAC", 180, "line"), rel("BAC + ABC + ACB", 180, "triangle")],
    fig(v) {
      const a = first(v("TAB"), v("ACB")) ?? 64;
      const b = first(v("SAC"), v("ABC")) ?? 50;
      if (!(a > 0 && b > 0 && a + b < 180)) throw cantDraw();
      const pts: Record<string, P> = { A: [0, -1], B: dir(-90 - 2 * a), C: dir(-90 + 2 * b), T: [-1.35, -1], S: [1.35, -1] };
      return { pts, circles: [{ c: [0, 0], r: 1 }], segs: [["A", "B"], ["A", "C"], ["B", "C"], ["T", "S"]], angles: angleRays("TAB", "SAC", "BAC", "ABC", "ACB"), centre: [0, 0] };
    },
  },
  chord: {
    keys: ["chord", "perpendicular bisector of a chord", "chord bisector", "chord and radius"],
    q: { ...angles("OMA", "AOM", "OAM", "AOB"), ...lengths("AB", "AM", "MB", "OM", "OA") },
    alias: { r: "OA", OB: "OA", BO: "OA", BM: "MB" },
    coreA: ["OMA", "AOM", "OAM"],
    coreL: ["AB", "AM", "OM", "OA"],
    rels: [rel("OMA", 90, "chord"), rel("AM", "MB", "chord"), rel("AB", "AM + MB", "sum"), rel("AOB", "2 AOM", "symmetry"), rel("AOM + OAM + OMA", 180, "triangle")],
    rts: [{ a: "OM", b: "AM", h: "OA", A: "OAM", B: "AOM" }],
    fig(v) {
      const half = first(v("AM"), v("AB") !== undefined ? v("AB")! / 2 : undefined);
      const lenAng =
        half && v("OA") ? degOf(Math.asin(Math.min(1, half / v("OA")!))) : half && v("OM") ? degOf(Math.atan2(half, v("OM")!)) : v("OM") && v("OA") ? degOf(Math.acos(Math.min(1, v("OM")! / v("OA")!))) : undefined;
      const g = first(v("AOM"), v("AOB") !== undefined ? v("AOB")! / 2 : undefined, v("OAM") !== undefined ? 90 - v("OAM")! : undefined, lenAng) ?? 55;
      if (!(g > 0 && g < 90)) throw cantDraw();
      const [sn, cs] = [Math.sin(rad(g)), Math.cos(rad(g))];
      const pts: Record<string, P> = { O: [0, 0], A: [-sn, -cs], B: [sn, -cs], M: [0, -cs] };
      return {
        pts,
        circles: [{ c: [0, 0], r: 1 }],
        segs: [["A", "B"], ["O", "A"], ["O", "B"], ["O", "M"]],
        angles: angleRays("OMA", "AOM", "OAM", "AOB"),
        lengths: { AB: ["A", "B", 0, 31], AM: ["A", "M"], MB: ["M", "B"], OM: ["O", "M"], OA: ["O", "A"] },
        centre: [0, 0],
      };
    },
  },
  chords: {
    keys: ["chords", "intersecting chords", "crossing chords"],
    q: lengths("AE", "EB", "CE", "ED", "AB", "CD"),
    alias: { BE: "EB", EA: "AE", EC: "CE", DE: "ED" },
    coreA: [],
    coreL: ["AE", "EB", "CE", "ED"],
    rels: [rel("AB", "AE + EB", "sum"), rel("CD", "CE + ED", "sum")],
    prods: [{ l: ["AE", "EB"], r: ["CE", "ED"], why: "chords" }],
    fig(v) {
      let [ae, eb, ce, ed] = ["AE", "EB", "CE", "ED"].map(v);
      ae ??= 4;
      eb ??= ce !== undefined && ed !== undefined ? (ce * ed) / ae : 3;
      ce ??= ed !== undefined ? (ae * eb) / ed : 6;
      ed ??= (ae * eb) / ce;
      if (![ae, eb, ce, ed].every((x) => x > 0)) throw cantDraw();
      const [u, w] = [dir(-12), dir(58)];
      const pts: Record<string, P> = { A: vmul(u, -ae), B: vmul(u, eb), C: vmul(w, -ce), D: vmul(w, ed), E: [0, 0] };
      const c = circumcentre(pts.A, pts.B, pts.C);
      return { pts, circles: [{ c, r: vdist(c, pts.A) }], segs: [["A", "B"], ["C", "D"]], angles: {}, lengths: lenSegs("AE", "EB", "CE", "ED"), centre: c };
    },
  },
  secant: {
    keys: ["secant", "tangent secant", "tangent and secant", "secant tangent"],
    q: lengths("PT", "PA", "PB", "AB"),
    alias: { TP: "PT", AP: "PA", BP: "PB", BA: "AB" },
    coreA: [],
    coreL: ["PT", "PA", "PB"],
    rels: [rel("PB", "PA + AB", "sum")],
    prods: [{ l: ["PT", "PT"], r: ["PA", "PB"], why: "secant" }],
    fig(v) {
      let [pt, pa, pb] = ["PT", "PA", "PB"].map(v);
      if (pa === undefined && pb !== undefined && v("AB") !== undefined) pa = pb - v("AB")!;
      if (pb === undefined && pa !== undefined && v("AB") !== undefined) pb = pa + v("AB")!;
      if (pa === undefined && pt !== undefined && pb !== undefined) pa = (pt * pt) / pb;
      if (pb === undefined && pt !== undefined && pa !== undefined) pb = (pt * pt) / pa;
      pa ??= 4;
      pb ??= 9;
      if (!(pa > 0 && pb > pa)) throw cantDraw();
      const r = pa / pb;
      const d = Math.min(2.4, ((1 + r) / (1 - r)) * 0.995);
      const ratio = (e: number) => {
        const [s, c] = [Math.sqrt(d * d - e * e), Math.sqrt(1 - e * e)];
        return (s - c) / (s + c);
      };
      let [lo, hi] = [0, 0.9999];
      for (let i = 0; i < 60; i++) {
        const m = (lo + hi) / 2;
        if (ratio(m) < r) lo = m;
        else hi = m;
      }
      const e = (lo + hi) / 2;
      const P0: P = [-d, 0];
      const u = rot([1, 0], degOf(Math.asin(e / d)));
      const [s, c] = [Math.sqrt(d * d - e * e), Math.sqrt(1 - e * e)];
      const pts: Record<string, P> = { P: P0, A: vadd(P0, vmul(u, s - c)), B: vadd(P0, vmul(u, s + c)), T: [-1 / d, -Math.sqrt(1 - 1 / (d * d))], O: [0, 0] };
      return {
        pts,
        hide: ["O"],
        circles: [{ c: [0, 0], r: 1 }],
        segs: [["P", "B"], ["P", "T"]],
        angles: {},
        lengths: { PT: ["P", "T"], PA: ["P", "A"], AB: ["A", "B"], PB: ["P", "B", 1] },
        centre: [-0.3, -0.2],
      };
    },
  },
};
function circumcentre(a: P, b: P, c: P): P {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const s = (p: P) => p[0] * p[0] + p[1] * p[1];
  return [(s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d];
}
export const CIRCLE_SCENES = Object.keys(SCENES);

type Fact = { v: Lin; ap: boolean; given?: boolean; from: string[]; rows: TexLine[]; n: number };

function renderCircle(src: string, figure?: { out?: Pic }): RenderedSvg {
  const Wc = words.circle;
  const cls = clausesOf(src);
  const head = cls[0].toLowerCase().replace(/[:.]$/, "").trim();
  const key = Object.keys(SCENES).find((k) => SCENES[k].keys.includes(head));
  if (!key) throw err(Wc.unknownScene, { s: cls[0], list: Object.keys(SCENES).join(", ") });
  const sc = SCENES[key];
  const kind = (n: string) => sc.q[n];
  const canon = (raw: string): string => {
    const s = raw.replace(/\s+/g, "").replace(/^∠/, "");
    const up = s.toUpperCase();
    if (s === "r" && sc.alias?.r) return sc.alias.r;
    for (const c of [up, [...up].reverse().join("")]) {
      if (sc.q[c]) return c;
      if (sc.alias?.[c]) return sc.alias[c];
    }
    if (/^reflex/i.test(raw) && sc.alias?.["REFLEX AOB"]) return "RAOB";
    throw err(Wc.unknownName, { s: raw, list: Object.keys(sc.q).filter((n) => n !== "RAOB").join(", ") });
  };
  const qTex = (n: string) => (n === "RAOB" ? `\\text{reflex } \\angle AOB` : kind(n) === "a" ? `\\angle ${n}` : n);
  const qPlain = (n: string) => (n === "RAOB" ? "reflex ∠AOB" : kind(n) === "a" ? `∠${n}` : n);
  const unit = (n: string) => (kind(n) === "a" ? "^\\circ" : "");

  // Givens, unknowns to find, x.
  const facts = new Map<string, Fact>();
  let order = 0;
  const targets: string[] = [];
  const mentioned: string[] = [];
  let xGiven: number | undefined;
  for (const c of cls.slice(1)) {
    const f = /^(?:find|calculate|work out|what is)\s+(.+)$/i.exec(c);
    if (f) {
      for (const n of f[1].split(/,|\band\b/).map((s) => s.trim()).filter(Boolean)) targets.push(canon(n)), mentioned.push(canon(n));
      continue;
    }
    for (const part of c.split(/,(?![^()]*\))/).map((s) => s.trim()).filter(Boolean)) {
      const m = /^([^=]+?)\s*=\s*(.+)$/.exec(part);
      if (!m) throw err(Wc.badClause, { s: part });
      if (m[1].trim() === "x") {
        xGiven = readLin(m[2]).c;
        continue;
      }
      const n = canon(m[1]);
      mentioned.push(n);
      if (m[2].trim() === "?") {
        targets.push(n);
        continue;
      }
      if (facts.has(n)) continue;
      facts.set(n, { v: readLin(m[2]), ap: false, given: true, from: [], rows: [], n: order++ });
    }
  }
  if (xGiven !== undefined) for (const f of facts.values()) if (hasX(f.v)) f.v = lin(f.v.c + f.v.k * xGiven);
  const givens = [...facts.keys()];
  const header = givens.length ? givens.map((n) => `${qTex(n)} = ${linTex(facts.get(n)!.v, unit(n))}`).join(",\\quad ") : `\\bigcirc`;
  const used = new Set<CircleWhy>();
  const xFact: { v?: number; rows: TexLine[]; from: string[] } = { rows: [], from: [] };
  if (xGiven !== undefined) xFact.v = xGiven;

  // Equal angles (and lengths) that are named together: base angles of an isosceles triangle, the same segment…
  const parent = new Map<string, string>();
  const find = (n: string): string => (parent.get(n) && parent.get(n) !== n ? find(parent.get(n)!) : n);
  const eqRels = sc.rels.filter((r) => r.l.length === 1 && r.r.length === 1 && r.l[0][0] === 1 && r.r[0][0] === 1 && r.c === 0);
  for (const r of eqRels) parent.set(find(r.l[0][1]), find(r.r[0][1]));

  const val = (n: string, paren = false) => {
    const f = facts.get(n)!;
    if (hasX(f.v)) return linTex(f.v, unit(n), paren);
    return (f.ap ? nf(f.v.c, kind(n) === "a" ? 1 : 2) : numTex(f.v.c)) + unit(n);
  };
  const isAp = (ns: string[]) => ns.some((n) => facts.get(n)?.ap);
  /** Σ a·q as LaTeX, by name or by value. */
  const sumTex = (ts: [number, string][], c: number, cUnit: string, byValue: boolean) => {
    const parts: string[] = [];
    const sorted = [...ts.filter(([a]) => a > 0), ...ts.filter(([a]) => a < 0)];
    if (c > 0 || (c !== 0 && !sorted.length)) parts.push(numTex(c) + cUnit);
    for (const [a, n] of sorted) {
      const coef = Math.abs(a) === 1 ? "" : `${numTex(Math.abs(a))}${byValue ? " \\times " : ""}`;
      const body = byValue ? val(n, Math.abs(a) !== 1 || a < 0) : qTex(n);
      parts.push(`${parts.length ? (a < 0 ? "- " : "+ ") : a < 0 ? "-" : ""}${coef}${body}`);
    }
    if (c < 0 && sorted.length) parts.push(`- ${numTex(-c)}${cUnit}`);
    return parts.join(" ") || "0";
  };
  const setFact = (n: string, v: Lin, ap: boolean, from: string[], rows: TexLine[]) => {
    facts.set(n, { v: { c: v.c + 0, k: v.k }, ap, from, rows, n: order++ });
  };
  const done = new Set<object>();

  /** A relation with every quantity known: a check, or an equation for x. */
  const check = (r: Rel) => {
    if (done.has(r)) return false;
    const ts: [number, string][] = [...r.l, ...r.r.map(([a, n]) => [-a, n] as [number, string])];
    let D = lin(-r.c);
    for (const [a, n] of ts) D = ladd(D, lscale(facts.get(n)!.v, a));
    done.add(r);
    if (hasX(D) && xFact.v === undefined) {
      let L = lin(0);
      let R = lin(r.c);
      for (const [a, n] of r.l) L = ladd(L, lscale(facts.get(n)!.v, a));
      for (const [a, n] of r.r) R = ladd(R, lscale(facts.get(n)!.v, a));
      const u = unit(ts[0][1]);
      const rows: TexLine[] = [
        { tex: `${sumTex(r.l, 0, u, false)} = ${sumTex(r.r, r.c, u, false)}`, op: Wc.why[r.why] },
        { tex: `${sumTex(r.l, 0, u, true)} = ${sumTex(r.r, r.c, u, true)}` },
      ];
      const s = solveLin(L, R);
      if (rows[1].tex.replace(/\^\\circ/g, "") === s.rows[0].tex) s.rows.shift();
      used.add(r.why);
      xFact.v = s.x;
      xFact.rows = [...rows, ...s.rows];
      xFact.from = ts.map(([, n]) => n);
      // Put x back into everything that was written with it.
      for (const [n, f] of facts)
        if (hasX(f.v)) {
          const v = f.v.c + f.v.k * s.x;
          const sub = `${f.v.k === 1 ? "" : `${numTex(f.v.k)} \\times `}${s.x < 0 ? `(${numTex(s.x)})` : numTex(s.x)}${Math.abs(f.v.c) > 1e-12 ? ` ${f.v.c < 0 ? "-" : "+"} ${numTex(Math.abs(f.v.c))}` : ""}`;
          f.rows = [...f.rows, { tex: `${qTex(n)} = ${linTex(f.v, unit(n))} = ${sub}${unit(n) ? "" : ""} = ${numTex(v)}${unit(n)}`, op: words.xIs.replace("{x}", nf(s.x, 4)) }];
          f.v = lin(v);
          f.from = [...f.from, "x"];
        }
      return true;
    }
    if (Math.abs(D.c) > 1e-6 * Math.max(1, ...ts.map(([a, n]) => Math.abs(a * facts.get(n)!.v.c)), Math.abs(r.c)))
      throw err(Wc.contradict, { s: `${sumTex(r.l, 0, "", false)} = ${sumTex(r.r, r.c, "", false)}`.replace(/\\angle /g, "∠").replace(/\\text\{reflex \} /g, "reflex ") });
    return false;
  };

  const tryRel = (r: Rel): boolean => {
    const ts: [number, string][] = [...r.l, ...r.r.map(([a, n]) => [-a, n] as [number, string])];
    const unknown = ts.filter(([, n]) => !facts.has(n));
    if (!unknown.length) return check(r);
    const root = find(unknown[0][1]);
    if (unknown.some(([, n]) => find(n) !== root)) return false;
    const A = unknown.reduce((s, [a]) => s + a, 0);
    if (Math.abs(A) < 1e-12) return false;
    const known = ts.filter(([, n]) => facts.has(n));
    let v = lin(r.c);
    for (const [a, n] of known) v = ladd(v, lscale(facts.get(n)!.v, -a));
    v = lscale(v, 1 / A);
    const sgn = A < 0 ? -1 : 1;
    const names = [...new Set(unknown.map(([, n]) => n))];
    const u = unit(names[0]);
    const rows: TexLine[] = [];
    if (names.length > 1) {
      const eq = eqRels.find((e) => names.includes(e.l[0][1]) && names.includes(e.r[0][1]));
      rows.push({ tex: names.map(qTex).join(" = "), op: eq ? Wc.why[eq.why] : undefined });
      if (eq) used.add(eq.why);
    }
    const numer = (byValue: boolean) => sumTex(known.map(([a, n]) => [-a * sgn, n] as [number, string]), r.c * sgn, u, byValue);
    const wrapD = (s: string) => (Math.abs(A) === 1 ? s : `\\frac{${s}}{${numTex(Math.abs(A))}}`);
    const ap = isAp(known.map(([, n]) => n));
    const a1 = wrapD(numer(false));
    const a2 = wrapD(numer(true));
    const res = hasX(v) ? `= ${linTex(v, u)}` : resTex(v.c, ap, u, kind(names[0]) === "a" ? 1 : 2);
    const chain = [a1, a2].filter((s, i, all) => all.indexOf(s) === i && `= ${s}` !== res);
    const lhs = names.map(qTex).join(" = ");
    if (known.length >= 3 && chain.length === 2) {
      rows.push({ tex: `${lhs} = ${chain[0]}`, op: Wc.why[r.why] });
      rows.push({ tex: `\\phantom{${lhs}} = ${chain[1]} ${res}` });
    } else rows.push({ tex: `${lhs} = ${chain.join(" = ")}${chain.length ? " " : ""}${res}`.replace("= = ", "= "), op: Wc.why[r.why] });
    used.add(r.why);
    const from = known.map(([, n]) => n);
    setFact(names[0], v, ap || !isExact(v.c), from, rows);
    for (const n of names.slice(1)) setFact(n, v, ap || !isExact(v.c), [names[0]], []);
    return true;
  };

  /** Pythagoras and SOH CAH TOA in a right-angled triangle; numbers only. */
  const tryRt = (t: RT): boolean => {
    const num = (n: string) => {
      const f = facts.get(n);
      return f && !hasX(f.v) ? f.v.c : undefined;
    };
    const [a, b, h] = [num(t.a), num(t.b), num(t.h)];
    const known = [a, b, h].filter((x) => x !== undefined).length;
    if (known === 2) {
      if (h === undefined) {
        const s = a! * a! + b! * b!;
        const v = Math.sqrt(s);
        const ap = isAp([t.a, t.b]);
        setFact(t.h, lin(v), ap || !isExact(v), [t.a, t.b], [
          { tex: `${t.h} = \\sqrt{${t.a}^2 + ${t.b}^2} = \\sqrt{${val(t.a, true)}^2 + ${val(t.b, true)}^2} = \\sqrt{${numTex(s)}} ${resTex(v, ap)}`, op: Wc.why.pythagoras },
        ]);
        used.add("pythagoras");
        return true;
      }
      const [leg, other] = a === undefined ? [t.a, t.b] : b === undefined ? [t.b, t.a] : [null, null];
      if (leg && other) {
        const s = h * h - num(other)! ** 2;
        if (!(s > 0)) throw err(Wc.impossible, { s: qPlain(leg), v: "√" + nf(s, 3) });
        const v = Math.sqrt(s);
        const ap = isAp([t.h, other]);
        setFact(leg, lin(v), ap || !isExact(v), [t.h, other], [
          { tex: `${leg} = \\sqrt{${t.h}^2 - ${other}^2} = \\sqrt{${val(t.h, true)}^2 - ${val(other, true)}^2} = \\sqrt{${numTex(s)}} ${resTex(v, ap)}`, op: Wc.why.pythagoras },
        ]);
        used.add("pythagoras");
        return true;
      }
    }
    // An angle and a side give the other sides.
    for (const [X, opp, adj] of [[t.A, t.a, t.b], [t.B, t.b, t.a]] as const) {
      const x = num(X);
      if (x === undefined || known !== 1) continue;
      const [o, j] = [num(opp), num(adj)];
      const s = Math.sin(rad(x));
      const c = Math.cos(rad(x));
      const T = `${qTex(X)}`;
      const vT = val(X);
      const make = (n: string, v: number, sym: string, sub: string, from: string[]) => {
        const ap = isAp(from) || !isExact(v) || !isExact(x);
        setFact(n, lin(v), ap, from, [{ tex: `${n} = ${sym} = ${sub} ${resTex(v, ap)}`, op: Wc.why.trig }]);
      };
      if (h !== undefined) {
        make(opp, h * s, `${t.h} \\sin ${T}`, `${val(t.h)} \\sin ${vT}`, [t.h, X]);
        make(adj, h * c, `${t.h} \\cos ${T}`, `${val(t.h)} \\cos ${vT}`, [t.h, X]);
      } else if (j !== undefined) {
        make(opp, j * Math.tan(rad(x)), `${adj} \\tan ${T}`, `${val(adj)} \\tan ${vT}`, [adj, X]);
        make(t.h, j / c, `\\frac{${adj}}{\\cos ${T}}`, `\\frac{${val(adj)}}{\\cos ${vT}}`, [adj, X]);
      } else if (o !== undefined) {
        make(adj, o / Math.tan(rad(x)), `\\frac{${opp}}{\\tan ${T}}`, `\\frac{${val(opp)}}{\\tan ${vT}}`, [opp, X]);
        make(t.h, o / s, `\\frac{${opp}}{\\sin ${T}}`, `\\frac{${val(opp)}}{\\sin ${vT}}`, [opp, X]);
      }
      used.add("trig");
      return true;
    }
    // Two sides give an angle.
    if (known >= 2 && num(t.A) === undefined && num(t.B) === undefined) {
      const X = t.A;
      let v: number;
      let sym: string;
      let sub: string;
      let from: string[];
      if (a !== undefined && b !== undefined) [v, sym, sub, from] = [degOf(Math.atan2(a, b)), `\\tan^{-1} \\frac{${t.a}}{${t.b}}`, `\\tan^{-1} \\frac{${val(t.a)}}{${val(t.b)}}`, [t.a, t.b]];
      else if (a !== undefined) [v, sym, sub, from] = [degOf(Math.asin(a / h!)), `\\sin^{-1} \\frac{${t.a}}{${t.h}}`, `\\sin^{-1} \\frac{${val(t.a)}}{${val(t.h)}}`, [t.a, t.h]];
      else [v, sym, sub, from] = [degOf(Math.acos(b! / h!)), `\\cos^{-1} \\frac{${t.b}}{${t.h}}`, `\\cos^{-1} \\frac{${val(t.b)}}{${val(t.h)}}`, [t.b, t.h]];
      const r = rat(v, 1);
      const exact = r !== null && !isAp(from);
      if (exact) v = r![0];
      setFact(X, lin(v), !exact, from, [{ tex: `${qTex(X)} = ${sym} = ${sub} ${resTex(v, !exact, "^\\circ", 1)}`, op: Wc.why.trig }]);
      used.add("trig");
      return true;
    }
    return false;
  };

  /** l₁·l₂ = r₁·r₂. */
  const tryProd = (p: Prod): boolean => {
    if (done.has(p)) return false;
    const names = [...p.l, ...p.r];
    const unknown = [...new Set(names.filter((n) => !facts.has(n)))];
    const prodTex = (ns: [string, string], byValue: boolean) =>
      ns[0] === ns[1] ? (byValue ? `${val(ns[0], true)}^2` : `${ns[0]}^2`) : ns.map((n) => (byValue ? val(n, true) : n)).join(" \\times ");
    if (!unknown.length) {
      done.add(p);
      const L = lmul(facts.get(p.l[0])!.v, facts.get(p.l[1])!.v);
      const R = lmul(facts.get(p.r[0])!.v, facts.get(p.r[1])!.v);
      if (hasX(L) || hasX(R)) {
        if (xFact.v !== undefined) return false;
        const s = solveLin(L, R);
        used.add(p.why);
        xFact.v = s.x;
        xFact.rows = [{ tex: `${prodTex(p.l, false)} = ${prodTex(p.r, false)}`, op: Wc.why[p.why] }, { tex: `${prodTex(p.l, true)} = ${prodTex(p.r, true)}` }, ...s.rows];
        xFact.from = names;
        for (const [n, f] of facts)
          if (hasX(f.v)) {
            const v = f.v.c + f.v.k * s.x;
            f.rows = [...f.rows, { tex: `${qTex(n)} = ${linTex(f.v)} = ${numTex(v)}`, op: words.xIs.replace("{x}", nf(s.x, 4)) }];
            f.v = lin(v);
            f.from = [...f.from, "x"];
          }
        return true;
      }
      if (!near(L.c, R.c, 1e-6)) throw err(Wc.contradict, { s: `${prodTex(p.l, false)} = ${prodTex(p.r, false)}`.replace(/ \\times /g, " × ").replace(/\^2/g, "²") });
      return false;
    }
    if (unknown.length !== 1) return false;
    const u = unknown[0];
    const side = p.l.includes(u) ? p.l : p.r;
    const other = side === p.l ? p.r : p.l;
    const Q = lmul(facts.get(other[0])!.v, facts.get(other[1])!.v);
    const ap = isAp(names.filter((n) => n !== u));
    let v: number;
    let rows: TexLine[];
    if (side[0] === side[1]) {
      if (hasX(Q)) return false;
      v = Math.sqrt(Q.c);
      rows = [{ tex: `${u}^2 = ${prodTex(other, false)} = ${prodTex(other, true)} = ${numTex(Q.c)}`, op: Wc.why[p.why] }, { tex: `${u} = \\sqrt{${numTex(Q.c)}} ${resTex(v, ap)}` }];
    } else {
      const partner = side[0] === u ? side[1] : side[0];
      const pv = facts.get(partner)!.v;
      if (hasX(pv)) return false;
      const res = lscale(Q, 1 / pv.c);
      done.add(p);
      used.add(p.why);
      setFact(u, res, ap || (!hasX(res) && !isExact(res.c)), [...other, partner], [
        {
          tex: `${u} = \\frac{${prodTex(other, false)}}{${partner}} = \\frac{${prodTex(other, true)}}{${val(partner)}} ${hasX(res) ? `= ${linTex(res)}` : resTex(res.c, ap)}`,
          op: Wc.why[p.why],
        },
      ]);
      return true;
    }
    done.add(p);
    used.add(p.why);
    setFact(u, lin(v), ap || !isExact(v), other, rows);
    return true;
  };

  for (let round = 0; round < 60; round++) {
    let changed = false;
    for (const r of sc.rels) if (tryRel(r)) changed = true;
    for (const p of sc.prods ?? []) if (tryProd(p)) changed = true;
    if (!changed) for (const t of sc.rts ?? []) if (tryRt(t)) changed = true;
    if (!changed) break;
  }

  // Everything found must be possible.
  for (const [n, f] of facts) {
    if (hasX(f.v)) continue;
    const v = f.v.c;
    const bad = kind(n) === "a" ? !(v > 1e-9 && v < 360 - 1e-9) || (n !== "RAOB" && v >= 180 - 1e-9 && !f.given && false) : !(v > 1e-9);
    if (bad) throw err(Wc.impossible, { s: qPlain(n), v: plainNum(v) + (kind(n) === "a" ? "°" : "") });
  }

  // What to show: the targets (or the usual quantities), and everything they were found from.
  const anyLen = mentioned.some((n) => kind(n) === "l");
  const anyAng = mentioned.some((n) => kind(n) === "a");
  const shownSet = new Set<string>(targets.length ? targets : [...mentioned, ...(anyAng || !anyLen ? sc.coreA : []), ...(anyLen ? sc.coreL : [])]);
  const need = new Set<string>();
  const visit = (n: string) => {
    if (need.has(n)) return;
    need.add(n);
    if (n === "x") xFact.from.forEach(visit);
    else facts.get(n)?.from.forEach(visit);
  };
  shownSet.forEach(visit);
  const rows: TexLine[] = [];
  const steps = [...facts.entries()].filter(([n, f]) => need.has(n) && f.rows.length).sort((a, b) => a[1].n - b[1].n);
  let xShown = false;
  for (const [, f] of steps) {
    if (!xShown && f.from.includes("x") && xFact.rows.length && need.has("x")) {
      rows.push(...xFact.rows);
      xShown = true;
    }
    // A fact found before x is known shows its x-form first, then its value.
    rows.push(...f.rows);
  }
  if (!xShown && xFact.rows.length && need.has("x")) rows.push(...xFact.rows);
  if (!xShown && xFact.rows.length && !rows.length) rows.push(...xFact.rows);

  data = { values: Object.fromEntries([...facts].filter(([, f]) => !hasX(f.v)).map(([n, f]) => [n, f.v.c])), x: xFact.v };

  // The figure, with the givens in blue, what was found in green and what is still unknown in red.
  const numVal = (n: string) => {
    const f = facts.get(n);
    return f && !hasX(f.v) ? f.v.c : undefined;
  };
  const visible = new Set([...givens, ...need, ...shownSet]);
  for (const [n, f] of facts) if (!f.rows.length && !f.given && f.from.length === 1 && visible.has(f.from[0])) visible.add(n);
  const fig = sc.fig(numVal, (n) => visible.has(n));
  const measured: Record<string, number> = {};
  for (const [n, [a, v, b]] of Object.entries(fig.angles))
    if (fig.pts[a] && fig.pts[v] && fig.pts[b]) {
      const [u1, u2] = [vsub(fig.pts[a], fig.pts[v]), vsub(fig.pts[b], fig.pts[v])];
      measured[n] = degOf(Math.acos(Math.max(-1, Math.min(1, vdot(u1, u2) / (vlen(u1) * vlen(u2))))));
    }
  for (const [n, [a, b]] of Object.entries(fig.lengths ?? {})) if (fig.pts[a] && fig.pts[b]) measured[n] = vdist(fig.pts[a], fig.pts[b]);
  data.measured = measured;
  const tags: Record<string, Tag> = {};
  for (const n of visible) {
    if (!sc.q[n]) continue;
    const f = facts.get(n);
    const u = kind(n) === "a" ? "°" : "";
    if (!f) tags[n] = { text: "?", color: C.red };
    else if (hasX(f.v)) tags[n] = { text: linPlain(f.v, u), color: f.given ? C.blue : C.green };
    else tags[n] = { text: (f.ap ? "≈" : "") + plainNum(f.v.c, kind(n) === "a" ? 1 : 2) + u, color: f.given ? C.blue : C.green };
  }
  if (figure) {
    // Only the figure, for a question: what was given, and a ? for what to find.
    const ask: Record<string, Tag> = {};
    for (const n of givens) ask[n] = tags[n];
    for (const n of targets) ask[n] = { text: "?", color: C.red };
    figure.out = drawFig(fig, ask, { w: 260, h: 220 });
    return { svg: "", width: 0, height: 0 };
  }
  const pic = drawFig(fig, tags, { w: 380, h: 300 });

  const caps: Caption[] = [];
  for (const w of ["centre", "semicircle", "segment", "cyclic", "tangent", "tangents", "alternate", "chord", "chords", "secant"] as CircleWhy[])
    if (used.has(w)) caps.push({ text: Wc.thm[w], color: C.ink });
  if (!used.size && !rows.length) caps.push({ text: Wc.thm[sc.rels[0]?.why ?? sc.prods![0].why], color: C.ink });
  const missing = [...shownSet].filter((n) => !facts.has(n) || hasX(facts.get(n)!.v));
  if (missing.length) caps.push({ text: fill(Wc.cannot, { s: missing.map(qPlain).join(", ") }), color: C.red });
  if (xFact.v !== undefined && xGiven === undefined) caps.push({ text: fill(words.xIs, { x: nf(xFact.v, 4).replace("-", "−") }), color: C.green });
  return finish(header, rows, [pic], caps);
}

// ---------- similar and congruent triangles ----------

type SFact = { v: Lin; ap: boolean; given?: boolean; rows: TexLine[] };

/** Corners of a triangle from what is known about it: three sides, two sides and the angle between, or the angles. */
function triangleOf(s: (number | undefined)[], a: (number | undefined)[]): P[] {
  // s[i] is the side opposite vertex i; a[i] the angle at vertex i (degrees).
  const ang = [...a];
  const kn = ang.filter((x) => x !== undefined).length;
  if (kn === 2) {
    const i = ang.findIndex((x) => x === undefined);
    ang[i] = 180 - ang.reduce<number>((t, x) => t + (x ?? 0), 0);
  }
  const place = (b: number, c: number, A: number): P[] => [[0, 0], [c, 0], [b * Math.cos(rad(A)), b * Math.sin(rad(A))]];
  const [a0, b0, c0] = s;
  if (a0 !== undefined && b0 !== undefined && c0 !== undefined) {
    const cosA = (b0 * b0 + c0 * c0 - a0 * a0) / (2 * b0 * c0);
    if (!(cosA > -1 + 1e-9 && cosA < 1 - 1e-9)) throw err(words.similar.notTriangle);
    return place(b0, c0, degOf(Math.acos(cosA)));
  }
  for (let m = 0; m < 3; m++) {
    const [i, j] = [(m + 1) % 3, (m + 2) % 3];
    if (s[i] !== undefined && s[j] !== undefined) {
      const A = ang[m] ?? 60;
      // Put vertex m at the origin, then rename.
      const p = place(s[i]!, s[j]!, A); // sides from m: to vertex j has length s[i], to vertex i has length s[j]
      const out: P[] = [[0, 0], [0, 0], [0, 0]];
      out[m] = p[0];
      out[i] = p[1];
      out[j] = p[2];
      return out;
    }
  }
  const A = ang.every((x) => x !== undefined) ? (ang as number[]) : [60, 55, 65];
  const known = s.findIndex((x) => x !== undefined);
  const scale = known >= 0 ? s[known]! / Math.sin(rad(A[known])) : 5 / Math.sin(rad(A[2]));
  return place(scale * Math.sin(rad(A[1])), scale * Math.sin(rad(A[2])), A[0]);
}

function renderSimilar(src: string): RenderedSvg {
  const Ws = words.similar;
  const cls = clausesOf(src);
  if (cls.some((c) => /^(lengths?|sides?|areas?|surface areas?|volumes?|k|scale factor|scale|perimeters?|capacit(?:y|ies))\b/i.test(c))) return renderScale(cls);
  const m = /^(?:triangles?\s+)?([A-Z])\s*([A-Z])\s*([A-Z])\s*(~|∼|≅|==|,|and|&|\?|vs)\s*(?:triangle\s+)?([A-Z])\s*([A-Z])\s*([A-Z])\s*\??$/.exec(cls[0]);
  if (!m) throw err(Ws.badShape);
  const T1 = [m[1], m[2], m[3]];
  const T2 = [m[5], m[6], m[7]];
  if (new Set(T1).size < 3 || new Set(T2).size < 3) throw err(Ws.sameLetters);
  const shared = T1.map((x, i) => (T2.includes(x) ? i : -1)).filter((i) => i >= 0);
  if (shared.length > 1 || (shared.length === 1 && T2[shared[0]] !== T1[shared[0]])) throw err(Ws.sameLetters);
  const sv = shared.length ? shared[0] : -1;
  const mode = m[4] === "~" || m[4] === "∼" ? "similar" : m[4] === "≅" || m[4] === "==" ? "congruent" : "test";
  let cross = false;

  const sideName = (T: string[], i: number) => T[(i + 1) % 3] + T[(i + 2) % 3]; // opposite vertex i
  const facts = new Map<string, SFact>();
  const qTex = (n: string) => (n.length === 1 ? `\\angle ${n}` : n);
  const isAng = (n: string) => n.length === 1;
  const unit = (n: string) => (isAng(n) ? "^\\circ" : "");
  const sides1 = [0, 1, 2].map((i) => sideName(T1, i));
  const sides2 = [0, 1, 2].map((i) => sideName(T2, i));
  // Parts of a side in the A-shape: V–X–Y with X on the inner triangle.
  const parts: { whole: string; inner: string; part: string; j: number }[] = [];
  if (sv >= 0)
    for (const j of [0, 1, 2]) if (j !== sv) parts.push({ whole: T2[sv] + T2[j], inner: T1[sv] + T1[j], part: T1[j] + T2[j], j });
  const canon = (raw: string): string => {
    const s = raw.replace(/\s+/g, "").replace(/^∠/, "").toUpperCase();
    if (s.length === 1 && (T1.includes(s) || T2.includes(s))) return s;
    if (s.length === 3 && (T1.includes(s[1]) || T2.includes(s[1]))) {
      const T = T1.includes(s[1]) && T1.includes(s[0]) && T1.includes(s[2]) ? T1 : T2;
      if (T.includes(s[0]) && T.includes(s[2]) && s[0] !== s[2]) return s[1];
    }
    if (s.length === 2) {
      const all = [...sides1, ...sides2, ...parts.flatMap((p) => [p.whole, p.inner, p.part])];
      for (const n of all) if (n === s || n === s[1] + s[0]) return n;
    }
    throw err(Ws.unknownPart, { s: raw });
  };
  const sideKey = (n: string) => {
    for (const T of [sides1, sides2]) for (const x of T) if (x === n || x === n[1] + n[0]) return x;
    for (const p of parts) for (const x of [p.whole, p.inner, p.part]) if (x === n || x === n[1] + n[0]) return x;
    return n;
  };
  const targets: string[] = [];
  const givens: string[] = [];
  for (const c of cls.slice(1)) {
    if (/^(x|bow-?tie|crossing|cross|vertically opposite)$/i.test(c)) {
      cross = true;
      continue;
    }
    if (/(∥|\|\||\/\/|parallel)/i.test(c)) continue;
    const f = /^(?:find|calculate|work out)\s+(.+)$/i.exec(c);
    if (f) {
      targets.push(...f[1].split(/,|\band\b/).map((s) => s.trim()).filter(Boolean).map(canon));
      continue;
    }
    for (const part of c.split(/,(?![^()]*\))/).map((s) => s.trim()).filter(Boolean)) {
      const q = /^([^=]+?)\s*=\s*(.+)$/.exec(part);
      if (!q) throw err(Ws.unknownPart, { s: part });
      const n = sideKey(canon(q[1]));
      if (q[2].trim() === "?") {
        targets.push(n);
        continue;
      }
      if (!facts.has(n)) {
        const v = readLin(q[2]);
        if (!hasX(v) && !(v.c > 0 && (n.length > 1 || v.c < 180))) throw err(words.circle.impossible, { s: n.length === 1 ? `∠${n}` : n, v: plainNum(v.c) + (n.length === 1 ? "°" : "") });
        facts.set(n, { v, ap: false, given: true, rows: [] });
        givens.push(n);
      }
    }
  }
  if (cross) parts.length = 0;
  const givenTex = givens.map((n) => `${qTex(n)} = ${linTex(facts.get(n)!.v, unit(n))}`);
  if (mode === "test" && [...facts.values()].some((f) => hasX(f.v))) throw new Error(Ws.testNumbers);

  const rows: TexLine[] = [];
  const val = (n: string, paren = false) => {
    const f = facts.get(n)!;
    return hasX(f.v) ? linTex(f.v, unit(n), paren) : (f.ap ? nf(f.v.c, isAng(n) ? 1 : 2) : numTex(f.v.c)) + unit(n);
  };
  const num = (n: string) => {
    const f = facts.get(n);
    return f && !hasX(f.v) ? f.v.c : undefined;
  };
  const set = (n: string, v: Lin, ap: boolean, row: TexLine) => {
    facts.set(n, { v, ap, rows: [row] });
    rows.push(row);
  };
  let k: number | undefined = mode === "congruent" ? 1 : undefined;
  let kAp = false;
  let x: number | undefined;
  const putX = (s: { x: number; rows: TexLine[] }, lead: TexLine[]) => {
    x = s.x;
    rows.push(...lead, ...s.rows);
    for (const [n, f] of facts)
      if (hasX(f.v)) {
        const v = f.v.c + f.v.k * s.x;
        rows.push({ tex: `${qTex(n)} = ${linTex(f.v, unit(n))} = ${numTex(v)}${unit(n)}`, op: fill(words.xIs, { x: nf(s.x, 4) }) });
        f.v = lin(v);
      }
  };

  /** Angles: corresponding angles are equal, and the three angles of a triangle add up to 180°. */
  const anglesStep = () => {
    let ch = false;
    for (let i = 0; i < 3; i++) {
      const [a, b] = [T1[i], T2[i]];
      if (a === b) continue;
      if (mode === "test" && !(k !== undefined)) continue;
      for (const [p, q] of [[a, b], [b, a]]) {
        if (facts.has(p) && !facts.has(q)) {
          set(q, facts.get(p)!.v, facts.get(p)!.ap, { tex: `${qTex(q)} = ${qTex(p)} = ${val(p)}`, op: Ws.corrAngles });
          ch = true;
        }
      }
    }
    for (const T of [T1, T2]) {
      const unknown = T.filter((n) => !facts.has(n));
      if (unknown.length !== 1) continue;
      const u = unknown[0];
      const ks = T.filter((n) => n !== u);
      let v = lin(180);
      for (const n of ks) v = ladd(v, facts.get(n)!.v, -1);
      const ap = ks.some((n) => facts.get(n)!.ap);
      set(u, v, ap, { tex: `${qTex(u)} = 180^\\circ - ${ks.map((n) => qTex(n)).join(" - ")} = 180^\\circ - ${ks.map((n) => val(n, true)).join(" - ")} ${hasX(v) ? `= ${linTex(v, "^\\circ")}` : resTex(v.c, ap, "^\\circ", 1)}`, op: Ws.triangle });
      if (!hasX(v) && !(v.c > 0)) throw err(words.circle.impossible, { s: `∠${u}`, v: plainNum(v.c) + "°" });
      ch = true;
    }
    return ch;
  };
  /** The A-shape: a whole side is the inner side plus the part beyond it. */
  const partsStep = () => {
    let ch = false;
    for (const p of parts) {
      const [W_, I, Pt] = [p.whole, p.inner, p.part].map((n) => facts.get(n));
      if (!W_ && I && Pt) {
        const v = ladd(I.v, Pt.v);
        set(p.whole, v, I.ap || Pt.ap, { tex: `${p.whole} = ${p.inner} + ${p.part} = ${val(p.inner)} + ${val(p.part)} = ${linTex(v)}`, op: Ws.parts });
        ch = true;
      } else if (W_ && I && !Pt) {
        const v = ladd(W_.v, I.v, -1);
        set(p.part, v, W_.ap || I.ap, { tex: `${p.part} = ${p.whole} - ${p.inner} = ${val(p.whole)} - ${val(p.inner, true)} = ${linTex(v)}`, op: Ws.parts });
        ch = true;
      } else if (W_ && !I && Pt) {
        const v = ladd(W_.v, Pt.v, -1);
        set(p.inner, v, W_.ap || Pt.ap, { tex: `${p.inner} = ${p.whole} - ${p.part} = ${val(p.whole)} - ${val(p.part, true)} = ${linTex(v)}`, op: Ws.parts });
        ch = true;
      }
    }
    return ch;
  };
  /** The scale factor from a pair of corresponding sides; then every side from its partner. */
  const sidesStep = () => {
    let ch = false;
    if (k === undefined && mode !== "test") {
      for (let i = 0; i < 3; i++) {
        const [a, b] = [num(sides1[i]), num(sides2[i])];
        if (a !== undefined && b !== undefined) {
          k = b / a;
          kAp = facts.get(sides1[i])!.ap || facts.get(sides2[i])!.ap;
          rows.push({ tex: `k = \\frac{${sides2[i]}}{${sides1[i]}} = \\frac{${val(sides2[i])}}{${val(sides1[i])}} ${resTex(k, kAp, "", 3)}`, op: Ws.scale });
          return true;
        }
      }
      // Two pairs with x in them: the ratios are equal.
      const full = [0, 1, 2].filter((i) => facts.has(sides1[i]) && facts.has(sides2[i]));
      if (full.length >= 2 && x === undefined) {
        const [i, j] = full;
        const [a1, b1, a2, b2] = [sides1[i], sides2[i], sides1[j], sides2[j]].map((n) => facts.get(n)!.v);
        const L = lmul(b1, a2);
        const R = lmul(b2, a1);
        if (hasX(L) || hasX(R)) {
          putX(solveLin(L, R), [
            { tex: `\\frac{${sides2[i]}}{${sides1[i]}} = \\frac{${sides2[j]}}{${sides1[j]}}`, op: Ws.ratios },
            { tex: `\\frac{${val(sides2[i])}}{${val(sides1[i])}} = \\frac{${val(sides2[j])}}{${val(sides1[j])}}` },
          ]);
          return true;
        }
      }
      return false;
    }
    if (k === undefined) return false;
    for (let i = 0; i < 3; i++) {
      const [n1, n2] = [sides1[i], sides2[i]];
      const [f1, f2] = [facts.get(n1), facts.get(n2)];
      if (f1 && !f2) {
        const v = lscale(f1.v, k);
        const ap = f1.ap || kAp;
        set(n2, v, ap, { tex: `${n2} = k \\times ${n1} = ${numTex(k, 3)} \\times ${val(n1, true)} ${hasX(v) ? `= ${linTex(v)}` : resTex(v.c, ap)}`, op: Ws.corrSides });
        ch = true;
      } else if (f2 && !f1) {
        const v = lscale(f2.v, 1 / k);
        const ap = f2.ap || kAp;
        set(n1, v, ap, { tex: `${n1} = \\frac{${n2}}{k} = \\frac{${val(n2)}}{${numTex(k, 3)}} ${hasX(v) ? `= ${linTex(v)}` : resTex(v.c, ap)}`, op: Ws.corrSides });
        ch = true;
      } else if (f1 && f2) {
        const L = f2.v;
        const R = lscale(f1.v, k);
        if ((hasX(L) || hasX(R)) && x === undefined) {
          putX(solveLin(L, R), [{ tex: `${n2} = k \\times ${n1}`, op: Ws.corrSides }, { tex: `${val(n2)} = ${numTex(k, 3)} \\times ${val(n1, true)}` }]);
          ch = true;
        } else if (!hasX(L) && !hasX(R) && !near(L.c, R.c, 1e-6)) throw err(Ws.notSimilar, { a: `${n2}/${n1}`, b: plainNum(L.c / f1.v.c, 3), k: plainNum(k, 3) });
      }
    }
    return ch;
  };

  // A test first: are the triangles congruent, similar, or can't we tell?
  let verdict: { kind: "congruent" | "similar" | "neither" | "unknown"; test?: string; note?: string } = { kind: "unknown" };
  if (mode === "test") {
    anglesStep();
    const A1 = T1.map((n) => num(n));
    const A2 = T2.map((n) => num(n));
    const S1 = sides1.map((n) => num(n));
    const S2 = sides2.map((n) => num(n));
    const aEq = [0, 1, 2].map((i) => A1[i] !== undefined && A2[i] !== undefined && near(A1[i]!, A2[i]!, 1e-7));
    const aNe = [0, 1, 2].some((i) => A1[i] !== undefined && A2[i] !== undefined && !aEq[i]);
    const ratio = [0, 1, 2].map((i) => (S1[i] !== undefined && S2[i] !== undefined ? S2[i]! / S1[i]! : undefined));
    const sEq = ratio.map((r) => r !== undefined && near(r, 1, 1e-9));
    // The comparison, pair by pair.
    for (let i = 0; i < 3; i++)
      if (ratio[i] !== undefined)
        rows.push(
          sEq[i]
            ? { tex: `${sides1[i]} = ${sides2[i]} = ${val(sides1[i])}`, op: "S" }
            : { tex: `\\frac{${sides2[i]}}{${sides1[i]}} = \\frac{${val(sides2[i])}}{${val(sides1[i])}} = ${numTex(ratio[i]!, 3)}`, op: Ws.ratios },
        );
    for (let i = 0; i < 3; i++)
      if (A1[i] !== undefined && A2[i] !== undefined && T1[i] !== T2[i])
        rows.push({ tex: aEq[i] ? `${qTex(T1[i])} = ${qTex(T2[i])} = ${val(T1[i])}` : `${qTex(T1[i])} \\ne ${qTex(T2[i])}`, op: aEq[i] ? "A" : undefined });
    const angEq = (i: number) => aEq[i] || T1[i] === T2[i];
    const nA = [0, 1, 2].filter(angEq).length;
    const nS = sEq.filter(Boolean).length;
    const sNe = ratio.some((r, i) => r !== undefined && !sEq[i]);
    const incl = (i: number, j: number) => 3 - i - j;
    let test: string | undefined;
    if (!sNe && !aNe) {
      if (nS === 3) test = "SSS";
      else
        for (let i = 0; i < 3 && !test; i++)
          for (let j = i + 1; j < 3 && !test; j++) {
            if (sEq[i] && sEq[j] && angEq(incl(i, j))) test = "SAS";
            else if (sEq[i] && sEq[j]) {
              const right = [i, j].find((h) => angEq(h) && A1[h] !== undefined && near(A1[h]!, 90));
              if (right !== undefined) test = "RHS";
            }
          }
      if (!test && nA >= 2 && nS >= 1) {
        const s = sEq.findIndex(Boolean);
        test = [0, 1, 2].filter((i) => i !== s).every((i) => angEq(i) && (facts.get(T1[i])?.given || facts.get(T2[i])?.given || T1[i] === T2[i])) ? "ASA" : "AAS";
      }
    }
    if (test) {
      verdict = { kind: "congruent", test };
      k = 1;
    } else {
      // Similar?
      const known = ratio.filter((r): r is number => r !== undefined);
      const prop = known.length >= 2 && known.every((r) => near(r, known[0], 1e-9));
      let stest: string | undefined;
      if (!aNe && nA >= 2) stest = "AA";
      else if (known.length === 3 && prop && !aNe) stest = "SSSs";
      else if (!aNe)
        for (let i = 0; i < 3 && !stest; i++)
          for (let j = i + 1; j < 3 && !stest; j++)
            if (ratio[i] !== undefined && ratio[j] !== undefined && near(ratio[i]!, ratio[j]!, 1e-9) && angEq(incl(i, j))) stest = "SASs";
      if (stest) {
        verdict = { kind: "similar", test: stest };
        if (known.length) k = known[0];
      } else if (aNe || (known.length >= 2 && !prop)) verdict = { kind: "neither" };
      else if (nS === 2 && !sNe) verdict = { kind: "unknown", note: Ws.ssa };
      else if (nA === 3 && !sNe && known.length === 0) verdict = { kind: "unknown", note: Ws.aaa };
      else verdict = { kind: "unknown" };
    }
    const rel = verdict.kind === "congruent" ? "\\cong" : verdict.kind === "similar" ? "\\sim" : verdict.kind === "neither" ? "\\nsim" : "?";
    rows.push({ tex: `\\triangle ${T1.join("")} ${rel} \\triangle ${T2.join("")}`, op: verdict.test ? verdict.test.replace(/s$/, "") : undefined, color: verdict.kind === "neither" ? C.red : verdict.kind === "unknown" ? C.grey : C.green });
    if (verdict.kind === "similar" && k !== undefined && !near(k, 1)) rows.push({ tex: `k = ${numTex(k, 3)}`, op: Ws.scale });
  }

  if (mode !== "test" || verdict.kind === "congruent" || verdict.kind === "similar")
    for (let round = 0; round < 40; round++) if (!(anglesStep() || partsStep() || sidesStep())) break;

  for (const [n, f] of facts) if (!hasX(f.v) && !(f.v.c > 0)) throw err(words.circle.impossible, { s: isAng(n) ? `∠${n}` : n, v: plainNum(f.v.c) });

  data = { values: Object.fromEntries([...facts].filter(([, f]) => !hasX(f.v)).map(([n, f]) => [n, f.v.c])), k, x, test: verdict.test };

  // The picture: the first triangle from what is known, the second one its image.
  const s1 = [0, 1, 2].map((i) => num(sides1[i]) ?? (k !== undefined && num(sides2[i]) !== undefined ? num(sides2[i])! / k : undefined));
  const a1 = [0, 1, 2].map((i) => num(T1[i]) ?? num(T2[i]));
  let p1 = triangleOf(s1, a1);
  const kd = k ?? (mode === "congruent" ? 1 : 1.5);
  const pts: Record<string, P> = {};
  let p2: P[];
  const centroid = (ps: P[]): P => [(ps[0][0] + ps[1][0] + ps[2][0]) / 3, (ps[0][1] + ps[1][1] + ps[2][1]) / 3];
  if (sv >= 0) {
    // Turn the shape so that the shared corner is on top (A-shape) or in the middle, facing left (X-shape).
    // The side opposite the shared corner lies flat (A-shape, corner on top) or upright (X-shape, corner on the right).
    const V = p1[sv];
    const [j, k2] = [0, 1, 2].filter((i) => i !== sv);
    const side = vsub(p1[k2], p1[j]);
    let turn = (cross ? 90 : 0) - degOf(Math.atan2(side[1], side[0]));
    p1 = p1.map((p) => rot(vsub(p, V), turn));
    const c = centroid(p1);
    if (cross ? c[0] > 0 : c[1] > 0) p1 = p1.map((p) => rot(p, 180));
    void turn;
    p2 = p1.map((p) => vmul(p, cross ? -kd : kd));
  } else {
    const xmax = Math.max(...p1.map((p) => p[0]));
    const xmin = Math.min(...p1.map((p) => p[0]));
    const gap = (xmax - xmin) * 0.35 + 0.5;
    p2 = p1.map((p) => [xmax + gap + (p[0] - xmin) * kd, p[1] * kd] as P);
  }
  T1.forEach((n, i) => (pts[n] = p1[i]));
  T2.forEach((n, i) => (pts[n] = p2[i]));
  const segs: [string, string][] = [];
  for (const T of [T1, T2]) for (let i = 0; i < 3; i++) segs.push([T[i], T[(i + 1) % 3]]);
  const fig: Fig = { pts, segs, angles: {}, lengths: {} };
  for (const T of [T1, T2]) for (let i = 0; i < 3; i++) fig.angles[T[i]] = [T[(i + 1) % 3], T[i], T[(i + 2) % 3]];
  // In the A-shape the two sides from the shared corner lie on one line: the short one is labelled inside, the long one further out.
  const nested = sv >= 0 && !cross;
  for (let i = 0; i < 3; i++)
    for (const [T, names, small] of [[T1, sides1, kd > 1], [T2, sides2, kd <= 1]] as const) {
      void T;
      const fromV = nested && i !== sv;
      fig.lengths![names[i]] = [names[i][0], names[i][1], fromV ? 1 : 0, undefined, fromV && !small ? (names[i][0] === T[sv] ? 0.72 : 0.28) : undefined];
    }
  for (const p of parts) fig.lengths![p.part] = [p.part[0], p.part[1]];
  if (sv >= 0 && !cross) fig.centre = vmul(centroid(kd > 1 ? p2 : p1), 1);
  if (mode === "test" && verdict.kind !== "unknown") {
    fig.ticks = [];
    fig.arcs = [];
    for (let i = 0; i < 3; i++) {
      if (verdict.kind === "congruent" && facts.has(sides1[i]) && facts.has(sides2[i])) {
        fig.ticks.push([sides1[i][0], sides1[i][1], i + 1], [sides2[i][0], sides2[i][1], i + 1]);
      }
      if (facts.has(T1[i]) && facts.has(T2[i]) && T1[i] !== T2[i])
        fig.arcs.push([T1[(i + 1) % 3], T1[i], T1[(i + 2) % 3], i + 1], [T2[(i + 1) % 3], T2[i], T2[(i + 2) % 3], i + 1]);
    }
  }
  fig.fills = [{ pts: T1, color: C.blue }, { pts: T2, color: C.orange }];
  const tags: Record<string, Tag> = {};
  const all = [...sides1, ...sides2, ...T1, ...T2, ...parts.map((p) => p.part)];
  for (const n of new Set(all)) {
    const f = facts.get(n);
    const u = isAng(n) ? "°" : "";
    if (f) tags[n] = { text: (f.ap ? "≈" : "") + (hasX(f.v) ? linPlain(f.v, u) : plainNum(f.v.c, isAng(n) ? 1 : 2) + u), color: f.given ? C.blue : C.green };
    else if (targets.includes(n)) tags[n] = { text: "?", color: C.red };
  }
  const pic = drawFig(fig, tags, { w: 560, h: 300 });

  const caps: Caption[] = [];
  if (mode === "test") {
    if (verdict.test) caps.push({ text: Ws.tests[verdict.test as keyof typeof Ws.tests], color: C.ink });
    caps.push({
      text: fill(verdict.kind === "congruent" ? Ws.congruent : verdict.kind === "similar" ? Ws.similar : verdict.kind === "neither" ? Ws.neither : Ws.notEnough, { a: T1.join(""), b: T2.join("") }),
      color: verdict.kind === "neither" ? C.red : verdict.kind === "unknown" ? C.grey : C.green,
    });
    if (verdict.note) caps.push({ text: verdict.note, color: C.grey });
  } else if (k === undefined) caps.push({ text: Ws.noScale, color: C.red });
  if (k !== undefined && !near(k, 1)) caps.push({ text: fill(Ws.areaRatio, { k: plainNum(k, 3), k2: plainNum(k * k, 3), k3: plainNum(k * k * k, 3) }), color: C.ink });
  const missing = targets.filter((n) => !facts.has(n) || hasX(facts.get(n)!.v));
  if (missing.length) caps.push({ text: fill(Ws.cannot, { s: missing.map((n) => (isAng(n) ? `∠${n}` : n)).join(", ") }), color: C.red });
  const rel = mode === "similar" ? "\\sim" : mode === "congruent" ? "\\cong" : ",";
  const header = `\\triangle ${T1.join("")} ${rel} \\triangle ${T2.join("")}${givens.length ? ":\\quad " + givenTex.join(",\\; ") : ""}`;
  return finish(header, rows, [pic], caps);
}

/** How lengths, areas and volumes scale: 1 : k, 1 : k², 1 : k³. */
function renderScale(cls: string[]): RenderedSvg {
  const Ws = words.similar;
  type Kind = "L" | "A" | "V";
  const pairs: { kind: Kind; a?: number; b?: number; src: string }[] = [];
  let k: number | undefined;
  const rows: TexLine[] = [];
  for (const c of cls) {
    const m = /^(lengths?|sides?|perimeters?|heights?|areas?|surface areas?|volumes?|capacit(?:y|ies)|masse?s?|k|scale factor|scale)\s*(?:=|:)?\s*(.+)$/i.exec(c);
    if (!m) throw err(Ws.scaleNeed);
    const w = m[1].toLowerCase();
    const kind: Kind = /^(area|surface)/.test(w) ? "A" : /^(volume|capacit|mass)/.test(w) ? "V" : "L";
    if (/^(k|scale)/.test(w)) {
      k = readNum(m[2].replace(/^factor\s*/i, "").replace(/^=\s*/, ""));
      continue;
    }
    const r = /^(.+?)\s*(?::|to)\s*(.+)$/.exec(m[2]);
    if (!r) throw err(Ws.scaleNeed);
    const read = (s: string) => {
      if (s.trim() === "?") return undefined;
      const v = readNum(s.replace(/\b(cm|mm|m|km|ml|l|g|kg)(²|³|\^?[23])?$/i, ""));
      if (!(v > 0)) throw err(Ws.scaleNeed);
      return v;
    };
    pairs.push({ kind, a: read(r[1]), b: read(r[2]), src: c });
  }
  const pw = { L: 1, A: 2, V: 3 } as const;
  const name = { L: "L", A: "A", V: "V" } as const;
  const header =
    pairs.map((p) => `${name[p.kind]}_1 : ${name[p.kind]}_2 = ${p.a !== undefined ? numTex(p.a) : "?"} : ${p.b !== undefined ? numTex(p.b) : "?"}`).join(",\\quad ") ||
    `k = ${numTex(k ?? 1, 4, { frac: true })}`;
  if (k === undefined) {
    const full = pairs.find((p) => p.a !== undefined && p.b !== undefined);
    if (!full) throw err(Ws.scaleNeed);
    const q = full.b! / full.a!;
    if (!(q > 0)) throw err(Ws.scaleNeed);
    k = q ** (1 / pw[full.kind]);
    const n = name[full.kind];
    const frac = `\\frac{${n}_2}{${n}_1} = \\frac{${numTex(full.b!)}}{${numTex(full.a!)}}`;
    if (full.kind === "L") rows.push({ tex: `k = ${frac} ${resTex(k, false, "", 3)}`, op: Ws.scale });
    else {
      const root = full.kind === "A" ? `\\sqrt{${numTex(q, 4, { frac: true })}}` : `\\sqrt[3]{${numTex(q, 4, { frac: true })}}`;
      rows.push({ tex: `k^${pw[full.kind]} = ${frac}${isExact(q) && numTex(q, 4, { frac: true }) !== `\\frac{${numTex(full.b!)}}{${numTex(full.a!)}}` ? ` = ${numTex(q, 4, { frac: true })}` : ""}`, op: Ws.scale });
      const kr = rat(k, 1000);
      rows.push({ tex: `k = ${root} ${resTex(kr ? kr[0] / kr[1] : k, !kr && !isExact(k), "", 3)}` });
    }
  } else rows.push({ tex: `k = ${numTex(k, 4, { frac: true })}`, op: Ws.scale });
  if (!(k > 0)) throw err(Ws.scaleNeed);
  const kk = k;
  const kTex = numTex(kk, 3, { frac: true });
  const kp = (p: number) => (p === 1 ? kTex : /^[\d.]+$/.test(kTex) ? `${kTex}^${p}` : `\\left(${kTex}\\right)^${p}`);
  for (const p of pairs) {
    const e = pw[p.kind];
    const f = kk ** e;
    const n = name[p.kind];
    if (p.a !== undefined && p.b === undefined) {
      p.b = p.a * f;
      rows.push({ tex: `${n}_2 = ${n}_1 \\times k^${e} = ${numTex(p.a)} \\times ${kp(e)} ${resTex(p.b, !isExact(kk))}`, op: Ws[p.kind === "L" ? "lengths" : p.kind === "A" ? "areas" : "volumes"].replace(/\{.*$/, "").trim() });
    } else if (p.b !== undefined && p.a === undefined) {
      p.a = p.b / f;
      rows.push({ tex: `${n}_1 = \\frac{${n}_2}{k^${e}} = \\frac{${numTex(p.b)}}{${kp(e)}} ${resTex(p.a, !isExact(kk))}`, op: Ws[p.kind === "L" ? "lengths" : p.kind === "A" ? "areas" : "volumes"].replace(/\{.*$/, "").trim() });
    } else if (p.a !== undefined && p.b !== undefined && !near(p.b / p.a, f, 1e-6)) throw err(Ws.notSimilar, { a: p.src, b: plainNum(p.b / p.a, 3), k: plainNum(f, 3) });
  }
  data = { k: kk, values: Object.fromEntries(pairs.flatMap((p, i) => [[`${p.kind}${i}a`, p.a!], [`${p.kind}${i}b`, p.b!]])) };

  // Two similar boxes, 1 : k.
  const cube = (x: number, y: number, s: number, color: string) => {
    const d = s * 0.4;
    const f = `<rect x="${r2(x)}" y="${r2(y - s)}" width="${r2(s)}" height="${r2(s)}" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2"/>`;
    const top = `<path d="M${r2(x)},${r2(y - s)}l${r2(d)},${r2(-d * 0.75)}h${r2(s)}l${r2(-d)},${r2(d * 0.75)}z" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2"/>`;
    const side = `<path d="M${r2(x + s)},${r2(y)}l${r2(d)},${r2(-d * 0.75)}v${r2(-s)}l${r2(-d)},${r2(d * 0.75)}z" fill="${color}" fill-opacity="0.32" stroke="${color}" stroke-width="2"/>`;
    return f + top + side;
  };
  const big = 150;
  const [s1, s2] = kk >= 1 ? [Math.max(28, big / kk), big] : [big, Math.max(28, big * kk)];
  const base = 30 + Math.max(s1, s2) * 1.3;
  const x2 = 40 + s1 * 1.4 + 50;
  const svg =
    cube(40, base, s1, C.blue) +
    cube(x2, base, s2, C.orange) +
    text(40 + s1 / 2, base + 22, "1", C.blue) +
    text(x2 + s2 / 2, base + 22, `k = ${plainNum(kk, 3)}`, C.orange);
  const pic = { svg, w: x2 + s2 * 1.4 + 20, h: base + 34 };
  const caps: Caption[] = [
    { text: fill(Ws.lengths, { a: "1", b: plainNum(kk, 3) }), color: C.ink },
    { text: fill(Ws.areas, { a: "1", b: plainNum(kk * kk, 3) }), color: C.ink },
    { text: fill(Ws.volumes, { a: "1", b: plainNum(kk ** 3, 3) }), color: C.ink },
    { text: Ws.scaleCap, color: C.grey },
  ];
  return finish(header, rows, [pic], caps);
}

// ---------- transformations ----------

type Affine = { m: [number, number, number, number]; t: P }; // p ↦ (m0 x + m1 y + t0, m2 x + m3 y + t1)
type Move =
  | { k: "translate"; v: P }
  | { k: "reflect"; n: P; d: number } // the mirror n·p = d, |n| = 1
  | { k: "rotate"; a: number; c: P }
  | { k: "enlarge"; f: number; c: P };
const apply = (A: Affine, p: P): P => [A.m[0] * p[0] + A.m[1] * p[1] + A.t[0], A.m[2] * p[0] + A.m[3] * p[1] + A.t[1]];
const compose2 = (B: Affine, A: Affine): Affine => {
  // B after A
  const [a, b, c, d] = A.m;
  const [e, f, g, h] = B.m;
  return { m: [e * a + f * c, e * b + f * d, g * a + h * c, g * b + h * d], t: apply(B, A.t) };
};
function affineOf(mv: Move): Affine {
  switch (mv.k) {
    case "translate":
      return { m: [1, 0, 0, 1], t: mv.v };
    case "reflect": {
      const [a, b] = mv.n;
      // p − 2(n·p − d)n
      return { m: [1 - 2 * a * a, -2 * a * b, -2 * a * b, 1 - 2 * b * b], t: [2 * mv.d * a, 2 * mv.d * b] };
    }
    case "rotate": {
      const [co, si] = [Math.cos(rad(mv.a)), Math.sin(rad(mv.a))];
      const [cx, cy] = mv.c;
      const c = (v: number) => (Math.abs(v) < 1e-12 ? 0 : Math.abs(v - Math.round(v)) < 1e-12 ? Math.round(v) : v);
      return { m: [c(co), c(-si), c(si), c(co)], t: [c(cx - co * cx + si * cy), c(cy - si * cx - co * cy)] };
    }
    case "enlarge":
      return { m: [mv.f, 0, 0, mv.f], t: [mv.c[0] * (1 - mv.f), mv.c[1] * (1 - mv.f)] };
  }
}
const clean = (v: number) => {
  const r = rat(v, 1000);
  return r ? r[0] / r[1] + 0 : v + 0;
};
const ptTex = (p: P) => `\\left(${numTex(clean(p[0]), 2, { frac: true })},\\ ${numTex(clean(p[1]), 2, { frac: true })}\\right)`;
const ptPlain = (p: P) => `(${plainNum(clean(p[0]))}, ${plainNum(clean(p[1]))})`;
/** A line n·p = d as y = mx + c, x = a or y = b. */
function lineStr(n: P, d: number): { tex: string; plain: string } {
  if (Math.abs(n[1]) < 1e-9) {
    const v = clean(d / n[0]);
    return { tex: `x = ${numTex(v, 2, { frac: true })}`, plain: `x = ${plainNum(v)}` };
  }
  const m = clean(-n[0] / n[1]);
  const c = clean(d / n[1]);
  if (Math.abs(m) < 1e-12) return { tex: `y = ${numTex(c, 2, { frac: true })}`, plain: `y = ${plainNum(c)}` };
  const mt = m === 1 ? "" : m === -1 ? "-" : numTex(m, 2, { frac: true });
  const mp = m === 1 ? "" : m === -1 ? "−" : plainNum(m);
  const ct = Math.abs(c) < 1e-12 ? "" : ` ${c < 0 ? "-" : "+"} ${numTex(Math.abs(c), 2, { frac: true })}`;
  const cp = Math.abs(c) < 1e-12 ? "" : ` ${c < 0 ? "−" : "+"} ${plainNum(Math.abs(c))}`;
  return { tex: `y = ${mt}x${ct}`, plain: `y = ${mp}x${cp}` };
}
/** (x, y) ↦ (…, …) */
function ruleTex(A: Affine): string {
  const comp = (a: number, b: number, t: number) => {
    const parts: string[] = [];
    for (const [c, v] of [[a, "x"], [b, "y"]] as const) {
      const cc = clean(c);
      if (Math.abs(cc) < 1e-12) continue;
      const coef = cc === 1 ? "" : cc === -1 ? "-" : numTex(cc, 3, { frac: true });
      parts.push(parts.length ? (cc < 0 ? `- ${coef.replace(/^-/, "")}${v}` : `+ ${coef}${v}`) : `${coef}${v}`);
    }
    const tt = clean(t);
    if (Math.abs(tt) > 1e-12 || !parts.length) parts.push(parts.length ? `${tt < 0 ? "-" : "+"} ${numTex(Math.abs(tt), 3, { frac: true })}` : numTex(tt, 3, { frac: true }));
    return parts.join(" ");
  };
  return `(x,\\ y) \\mapsto \\left(${comp(A.m[0], A.m[1], A.t[0])},\\ ${comp(A.m[2], A.m[3], A.t[1])}\\right)`;
}
function moveText(mv: Move): string {
  const Wt = words.transform;
  switch (mv.k) {
    case "translate":
      return fill(Wt.translate, { v: ptPlain(mv.v) });
    case "reflect":
      return fill(Wt.reflect, { l: lineStr(mv.n, mv.d).plain });
    case "rotate": {
      const a = ((mv.a % 360) + 540) % 360 - 180;
      if (Math.abs(Math.abs(a) - 180) < 1e-9) return fill(Wt.half, { c: ptPlain(mv.c) });
      return fill(Wt.rotate, { a: plainNum(Math.abs(a), 1), d: a > 0 ? Wt.acw : Wt.cw, c: ptPlain(mv.c) });
    }
    case "enlarge":
      return fill(Wt.enlarge, { k: plainNum(mv.f, 3), c: ptPlain(mv.c) });
  }
}

/** The single transformation an affine map is, if it is one of the four. */
function classify(A: Affine): { mv?: Move; text: string; kind: string } {
  const Wt = words.transform;
  const [a, b, c, d] = A.m;
  const det = a * d - b * c;
  const eq = (x: number, y: number) => Math.abs(x - y) < 1e-7;
  if (eq(a, 1) && eq(d, 1) && eq(b, 0) && eq(c, 0)) {
    if (eq(A.t[0], 0) && eq(A.t[1], 0)) return { text: Wt.identity, kind: "identity" };
    const mv: Move = { k: "translate", v: [clean(A.t[0]), clean(A.t[1])] };
    return { mv, text: moveText(mv), kind: "translate" };
  }
  if (det > 0 && eq(a, d) && eq(b, -c)) {
    const s = Math.sqrt(det);
    const th = degOf(Math.atan2(c, a));
    if (eq(s, 1)) {
      // Fixed point: (I − M)c = t.
      const [p, q, r, u] = [1 - a, -b, -c, 1 - d];
      const D = p * u - q * r;
      const cen: P = [clean((u * A.t[0] - q * A.t[1]) / D), clean((-r * A.t[0] + p * A.t[1]) / D)];
      const mv: Move = { k: "rotate", a: clean(th), c: cen };
      return { mv, text: moveText(mv), kind: "rotate" };
    }
    if (eq(th, 0) || eq(Math.abs(th), 180)) {
      const f = eq(th, 0) ? s : -s;
      const cen: P = [clean(A.t[0] / (1 - f)), clean(A.t[1] / (1 - f))];
      const mv: Move = { k: "enlarge", f: clean(f), c: cen };
      return { mv, text: moveText(mv), kind: "enlarge" };
    }
    return { text: fill(Wt.spiral, { k: plainNum(s, 3), a: plainNum(th, 1) }), kind: "spiral" };
  }
  if (det < 0 && eq(a, -d) && eq(b, c) && eq(-det, 1)) {
    const phi = degOf(Math.atan2(c, a)) / 2;
    const u = dir(phi);
    const n: P = [-u[1], u[0]];
    const along = vdot(A.t, u);
    const dd = vdot(A.t, n) / 2;
    const nn: P = n[1] < -1e-12 || (Math.abs(n[1]) < 1e-12 && n[0] < 0) ? [-n[0], -n[1]] : n;
    const ds = nn === n ? dd : -dd;
    if (Math.abs(along) < 1e-7) {
      const mv: Move = { k: "reflect", n: nn, d: clean(ds) };
      return { mv, text: moveText(mv), kind: "reflect" };
    }
    return { text: fill(Wt.glide, { l: lineStr(nn, ds).plain, v: ptPlain(vmul(u, along)) }), kind: "glide" };
  }
  return { text: Wt.stretch, kind: "other" };
}

const POINT_RE = /([A-Z][′'″]*)?\s*\(\s*([^,()]+(?:\([^()]*\))?[^,()]*)\s*,\s*([^,()]+(?:\([^()]*\))?[^,()]*)\s*\)/g;
function readPoints(s: string): { names: string[]; pts: P[] } {
  const names: string[] = [];
  const pts: P[] = [];
  for (const m of s.matchAll(POINT_RE)) {
    names.push(m[1] ?? "");
    pts.push([readNum(m[2]), readNum(m[3])]);
  }
  return { names, pts };
}
function readMove(c0: string): Move {
  const Wt = words.transform;
  const c = c0.toLowerCase().replace(/[−–]/g, "-").replace(/°|º|degrees?/g, " ").replace(/\s+/g, " ").trim();
  const pointIn = (s: string) => {
    const r = readPoints(s);
    return r.pts[0];
  };
  let m = /^(?:translat\w*|move\w*|shift\w*)\s*(?:by|through)?\s*(.*)$/.exec(c);
  if (m) {
    const v = /[([<]\s*([^,;]+?)\s*[,;]\s*([^\])>]+?)\s*[)\]>]/.exec(m[1]);
    if (!v) throw err(Wt.badMove, { s: c0 });
    return { k: "translate", v: [readNum(v[1]), readNum(v[2])] };
  }
  m = /^(?:reflect\w*)\s*(?:in|over|across|about|on)?\s*(?:the)?\s*(?:line)?\s*(.*)$/.exec(c);
  if (m) {
    const l = m[1].trim();
    if (/^x[- ]?axis$/.test(l)) return { k: "reflect", n: [0, 1], d: 0 };
    if (/^y[- ]?axis$/.test(l)) return { k: "reflect", n: [1, 0], d: 0 };
    const vx = /^x\s*=\s*(.+)$/.exec(l);
    if (vx) return { k: "reflect", n: [1, 0], d: readNum(vx[1]) };
    const vy = /^y\s*=\s*(.+)$/.exec(l);
    if (!vy) throw err(Wt.badLine, { s: m[1] });
    const L = readLin(vy[1]);
    // y = kx + c  →  −kx + y = c
    const len = Math.hypot(L.k, 1);
    return { k: "reflect", n: [-L.k / len, 1 / len], d: L.c / len };
  }
  m = /^(?:rotat\w*|turn\w*)\s*(.*)$/.exec(c);
  if (m) {
    const s = m[1];
    const [before, after] = s.split(/\b(?:about|around|centre|center|with centre|with center)\b/);
    let a = /half[- ]?turn/.test(s) ? 180 : /quarter[- ]?turn/.test(s) ? 90 : NaN;
    const num = /-?\d+(?:\.\d+)?/.exec(before.replace(/\([^)]*\)/g, ""));
    if (num) a = Number(num[0]);
    if (!Number.isFinite(a)) throw err(Wt.badMove, { s: c0 });
    if (/(anti|counter)[- ]?clockwise|\bacw\b|\bccw\b/.test(before)) a = Math.abs(a);
    else if (/clockwise|\bcw\b/.test(before)) a = -Math.abs(a);
    const cen = after ? pointIn(after) : undefined;
    if (after && !cen) throw err(Wt.badMove, { s: c0 });
    return { k: "rotate", a, c: cen ?? [0, 0] };
  }
  m = /^(?:enlarg\w*|dilat\w*)\s*(.*)$/.exec(c);
  if (m) {
    const [before, after] = m[1].split(/\b(?:about|around|centre|center|from|with centre|with center)\b/);
    const f = /(?:scale factor|sf|factor|by|k\s*=)?\s*(-?[\d./]+|-?\(?[\d.]+\s*\/\s*[\d.]+\)?)/.exec(before);
    if (!f) throw err(Wt.badMove, { s: c0 });
    const cen = after ? pointIn(after) : undefined;
    if (after && !cen) throw err(Wt.badMove, { s: c0 });
    const fv = readNum(f[1]);
    if (fv === 0) throw err(Wt.badMove, { s: c0 });
    return { k: "enlarge", f: fv, c: cen ?? [0, 0] };
  }
  throw err(Wt.badMove, { s: c0 });
}

const PRIMES = ["", "′", "″", "‴"];
const primeTex = (n: string, k: number) => `${n}${"'".repeat(k)}`;

/** A square grid with axes, big enough for every point. */
function gridPic(groups: { pts: P[]; names: string[]; color: string; fill?: boolean; dashed?: boolean }[], extra: (px: (p: P) => P, s: number, box: [number, number, number, number]) => string, focus: P[] = []): Pic {
  const all = [...groups.flatMap((g) => g.pts), ...focus];
  let [x0, x1] = [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
  let [y0, y1] = [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
  if (x0 > 0 && x0 < 4) x0 = 0;
  if (x1 < 0 && x1 > -4) x1 = 0;
  if (y0 > 0 && y0 < 4) y0 = 0;
  if (y1 < 0 && y1 > -4) y1 = 0;
  [x0, x1, y0, y1] = [Math.floor(x0) - 1, Math.ceil(x1) + 1, Math.floor(y0) - 1, Math.ceil(y1) + 1];
  if (x1 - x0 > 60 || y1 - y0 > 60) throw new Error(words.tooBig);
  const s = Math.min(36, 560 / (x1 - x0), 380 / (y1 - y0));
  const pad = 18;
  const w = (x1 - x0) * s + 2 * pad;
  const h = (y1 - y0) * s + 2 * pad;
  const px = (p: P): P => [pad + (p[0] - x0) * s, pad + (y1 - p[1]) * s];
  const out: string[] = [`<clipPath id="tg"><rect x="${pad}" y="${pad}" width="${r2(w - 2 * pad)}" height="${r2(h - 2 * pad)}"/></clipPath>`];
  const step = s < 14 ? 5 : s < 22 ? 2 : 1;
  for (let x = x0; x <= x1; x++) out.push(line(...px([x, y0]), ...px([x, y1]), x % step === 0 ? "#dee2e6" : "#f1f3f5", 1));
  for (let y = y0; y <= y1; y++) out.push(line(...px([x0, y]), ...px([x1, y]), y % step === 0 ? "#dee2e6" : "#f1f3f5", 1));
  if (y0 <= 0 && y1 >= 0) out.push(line(...px([x0, 0]), ...px([x1, 0]), "#495057", 1.3));
  if (x0 <= 0 && x1 >= 0) out.push(line(...px([0, y0]), ...px([0, y1]), "#495057", 1.3));
  const labels: string[] = [];
  const [ox, oy] = px([Math.min(Math.max(0, x0), x1), Math.min(Math.max(0, y0), y1)]);
  for (let x = x0 + 1; x < x1; x++) if (x !== 0 && x % step === 0) labels.push(`<text x="${r2(px([x, 0])[0])}" y="${r2(Math.min(oy + 13, h - 4))}" text-anchor="middle">${x < 0 ? "−" + -x : x}</text>`);
  for (let y = y0 + 1; y < y1; y++) if (y !== 0 && y % step === 0) labels.push(`<text x="${r2(Math.max(ox - 5, 12))}" y="${r2(px([0, y])[1] + 4)}" text-anchor="end">${y < 0 ? "−" + -y : y}</text>`);
  out.push(`<g ${FONT} font-size="10.5" fill="#868e96">${labels.join("")}</g>`);
  out.push(`<g clip-path="url(#tg)">${extra(px, s, [x0, x1, y0, y1])}</g>`);
  for (const g of groups) {
    const ps = g.pts.map(px);
    const pts = ps.map((p) => p.map(r2).join(",")).join(" ");
    if (g.pts.length >= 3)
      out.push(`<polygon points="${pts}" fill="${g.color}" fill-opacity="${g.fill === false ? 0 : 0.2}" stroke="${g.color}" stroke-width="2.2" stroke-linejoin="round" ${g.dashed ? DASH : ""}/>`);
    else if (g.pts.length === 2) out.push(line(...ps[0], ...ps[1], g.color, 2.2));
    const cen: P = [ps.reduce((t, p) => t + p[0], 0) / ps.length, ps.reduce((t, p) => t + p[1], 0) / ps.length];
    ps.forEach((p, i) => {
      out.push(`<circle cx="${r2(p[0])}" cy="${r2(p[1])}" r="3" fill="${g.color}"/>`);
      if (!g.names[i]) return;
      let d = vsub(p, cen);
      if (vlen(d) < 1e-6) d = [1, -1];
      const L = vadd(p, vmul(vunit(d), 13));
      out.push(text(L[0], L[1] + 5, g.names[i], g.color, { size: 13.5, italic: true }));
    });
  }
  return { svg: out.join(""), w, h };
}

function renderTransform(src: string): RenderedSvg {
  const Wt = words.transform;
  const s = src.replace(/[−–]/g, "-");
  const arrowSplit = s.split(/->|→|↦|\bonto\b|\bmaps to\b/);
  if (arrowSplit.length === 2) return describeTransform(arrowSplit[0], arrowSplit[1]);
  const cls = s.split(/;|\n|\bthen\b|,\s*(?=(?:translat|reflect|rotat|enlarg|move|turn|shift|dilat))/i).map((c) => c.trim()).filter(Boolean);
  const obj = readPoints(cls[0]);
  if (!obj.pts.length) throw new Error(Wt.badPoints);
  if (obj.pts.length > 12) throw new Error(words.tooBig);
  const names = obj.names.map((n, i) => n || "ABCDEFGHIJKL"[i]);
  const rest = cls[0].replace(POINT_RE, "").replace(/[,\s]|(?:triangle|shape|square|polygon|point|points|quadrilateral|rectangle|kite|trapezium|parallelogram|flag|segment)/gi, "");
  const moves: Move[] = [];
  if (rest) moves.push(readMove(cls[0].replace(POINT_RE, "").replace(/^[,\s]*(?:triangle|shape|square|polygon|points?|quadrilateral|rectangle)?[,\s]*/i, "")));
  for (const c of cls.slice(1)) moves.push(readMove(c));
  if (!moves.length) throw err(Wt.badMove, { s: "" });
  if (moves.length > 3) throw new Error(words.tooBig);

  const rows: TexLine[] = [];
  const stages: P[][] = [obj.pts];
  let total: Affine = { m: [1, 0, 0, 1], t: [0, 0] };
  moves.forEach((mv, i) => {
    const A = affineOf(mv);
    total = compose2(A, total);
    const next = stages[i].map((p) => apply(A, p).map(clean) as P);
    stages.push(next);
    rows.push({ tex: ruleTex(A), op: moveText(mv) });
    const pairs = names.map((n, j) => `${primeTex(n, i)}${ptTex(stages[i][j])} \\mapsto ${primeTex(n, i + 1)}${ptTex(next[j])}`);
    for (let j = 0; j < pairs.length; j += 2) rows.push({ tex: pairs.slice(j, j + 2).join(",\\qquad ") });
  });
  const caps: Caption[] = [];
  let single: ReturnType<typeof classify> | undefined;
  if (moves.length > 1) {
    single = classify(total);
    rows.push({ tex: ruleTex(total), op: Wt.combined });
    caps.push({ text: fill(single.mv || single.kind === "identity" ? Wt.single : Wt.noSingle, { s: single.text }), color: single.mv ? C.green : C.grey });
  }
  data = { images: stages.slice(1), kind: single?.kind };

  const colors = [C.blue, C.orange, C.green, C.purple];
  const focus: P[] = [];
  for (const mv of moves) if (mv.k === "rotate" || mv.k === "enlarge") focus.push(mv.c);
  const pic = gridPic(
    stages.map((ps, i) => ({ pts: ps, names: names.map((n) => n + PRIMES[i]), color: colors[i % 4], dashed: i > 0 && i < stages.length - 1 })),
    (px, sc, [x0, x1, y0, y1]) => {
      let out = "";
      moves.forEach((mv, i) => {
        const [from, to] = [stages[i], stages[i + 1]];
        const col = colors[(i + 1) % 4];
        if (mv.k === "translate") from.forEach((p, j) => (out += arrow(...px(p), ...px(to[j]), C.grey, 1.4, true)));
        if (mv.k === "reflect") {
          const u: P = [-mv.n[1], mv.n[0]];
          const o = vmul(mv.n, mv.d);
          const R = (x1 - x0 + y1 - y0) * 2;
          out += line(...px(vadd(o, vmul(u, -R))), ...px(vadd(o, vmul(u, R))), C.purple, 2.2);
          from.forEach((p, j) => (out += line(...px(p), ...px(to[j]), C.grey, 1.2, DASH)));
        }
        if (mv.k === "rotate") {
          const c = px(mv.c);
          from.forEach((p, j) => {
            out += line(...c, ...px(p), C.grey, 1.1, DASH) + line(...c, ...px(to[j]), C.grey, 1.1, DASH);
          });
          const p0 = px(from[0]);
          const r = vdist(p0, c);
          if (r > 4) {
            const q0 = px(to[0]);
            const large = Math.abs(mv.a) % 360 > 180 ? 1 : 0;
            out += `<path d="M${r2(p0[0])},${r2(p0[1])}A${r2(r)},${r2(r)} 0 ${large} ${mv.a > 0 ? 0 : 1} ${r2(q0[0])},${r2(q0[1])}" fill="none" stroke="${col}" stroke-width="1.4" ${DASH}/>`;
          }
          out += `<circle cx="${r2(c[0])}" cy="${r2(c[1])}" r="4.5" fill="${C.red}"/>`;
        }
        if (mv.k === "enlarge") {
          const c = px(mv.c);
          from.forEach((p, j) => {
            // Through the centre from the object to the image when the factor is negative.
            const far = [px(p), px(to[j])].reduce((a, b) => (vdist(a, c) > vdist(b, c) ? a : b));
            out += mv.f < 0 ? line(...px(p), ...px(to[j]), C.grey, 1.1, DASH) : line(...c, ...far, C.grey, 1.1, DASH);
          });
          out += `<circle cx="${r2(c[0])}" cy="${r2(c[1])}" r="4.5" fill="${C.red}"/>`;
        }
        void sc;
      });
      return out;
    },
    focus,
  );
  for (const [i, mv] of moves.entries()) caps.push({ text: `${moves.length > 1 ? `${i + 1}. ` : ""}${moveText(mv)}`, color: colors[(i + 1) % 4] });
  const header = names.map((n, j) => `${n}${ptTex(obj.pts[j])}`).join(",\\; ");
  return finish(header, rows, [fit(pic.svg, pic.w!, pic.h)], caps);
}

/** Which single transformation maps the shape onto its image, found from the points and shown with its construction. */
function describeTransform(a: string, b: string): RenderedSvg {
  const Wt = words.transform;
  const o = readPoints(a);
  const im = readPoints(b);
  if (o.pts.length < 2) throw new Error(Wt.tooFew);
  if (o.pts.length !== im.pts.length) throw new Error(Wt.sameCount);
  const names = o.names.map((n, i) => n || "ABCDEFGHIJKL"[i]);
  const [P0, P1] = o.pts;
  let A: Affine;
  // Three corners that are not in a line fix the map; with two, it keeps the turning direction.
  let k3 = -1;
  for (let i = 2; i < o.pts.length && k3 < 0; i++) if (Math.abs(vcross(vsub(o.pts[1], P0), vsub(o.pts[i], P0))) > 1e-9) k3 = i;
  if (k3 > 0) {
    const [p, q, r] = [P0, P1, o.pts[k3]];
    const [p2, q2, r2_] = [im.pts[0], im.pts[1], im.pts[k3]];
    const D = vcross(vsub(q, p), vsub(r, p));
    const solve = (u: number, v: number, w: number): [number, number, number] => {
      // α, β with α(q − p) + β(r − p) mapping: rows of M from the images' coordinates.
      const [dq, dr] = [v - u, w - u];
      const m0 = (dq * (r[1] - p[1]) - dr * (q[1] - p[1])) / D;
      const m1 = (dr * (q[0] - p[0]) - dq * (r[0] - p[0])) / D;
      return [m0, m1, u - m0 * p[0] - m1 * p[1]];
    };
    const [a0, a1, t0] = solve(p2[0], q2[0], r2_[0]);
    const [b0, b1, t1] = solve(p2[1], q2[1], r2_[1]);
    A = { m: [a0, a1, b0, b1], t: [t0, t1] };
  } else {
    // z ↦ αz + β
    const dz = vsub(P1, P0);
    const dw = vsub(im.pts[1], im.pts[0]);
    const n2 = vdot(dz, dz);
    if (n2 < 1e-12) throw new Error(Wt.tooFew);
    const al: P = [(dw[0] * dz[0] + dw[1] * dz[1]) / n2, (dw[1] * dz[0] - dw[0] * dz[1]) / n2];
    const m: Affine["m"] = [al[0], -al[1], al[1], al[0]];
    A = { m, t: vsub(im.pts[0], [m[0] * P0[0] + m[1] * P0[1], m[2] * P0[0] + m[3] * P0[1]]) };
  }
  A = { m: A.m.map(clean) as Affine["m"], t: [clean(A.t[0]), clean(A.t[1])] };
  o.pts.forEach((p, i) => {
    if (vdist(apply(A, p), im.pts[i]) > 1e-6) throw new Error(Wt.notMatch);
  });
  const cl = classify(A);
  const rows: TexLine[] = [];
  const mv = cl.mv;
  const n0 = names[0];
  const [I0, I1] = [im.pts[0], im.pts[1]];
  const mid = (p: P, q: P): P => vmul(vadd(p, q), 0.5);
  if (mv?.k === "translate") {
    rows.push({ tex: `\\overrightarrow{${n0}${n0}'} = \\begin{pmatrix} ${numTex(mv.v[0], 2, { frac: true })} \\\\ ${numTex(mv.v[1], 2, { frac: true })} \\end{pmatrix}`, op: Wt.vector });
    data = { kind: "translate", vector: mv.v };
  } else if (mv?.k === "reflect") {
    const L = lineStr(mv.n, mv.d);
    let j = o.pts.findIndex((p, i) => vdist(p, im.pts[i]) > 1e-9);
    if (j < 0) j = 0;
    rows.push({ tex: `M_{${names[j]}${names[j]}'} = ${ptTex(mid(o.pts[j], im.pts[j]))}`, op: Wt.perpBis });
    rows.push({ tex: L.tex, op: Wt.mirror });
    data = { kind: "reflect", mirror: [mv.n[0], mv.n[1], mv.d] };
  } else if (mv?.k === "rotate") {
    rows.push({ tex: `O = ${ptTex(mv.c)}`, op: Wt.bisectors });
    const a = ((mv.a % 360) + 540) % 360 - 180;
    rows.push({ tex: `\\angle ${n0}\\,O\\,${n0}' = ${numTex(Math.abs(a), 1)}^\\circ`, op: Math.abs(Math.abs(a) - 180) < 1e-9 ? Wt.angle : `${Wt.angle}, ${a > 0 ? Wt.acw : Wt.cw}` });
    data = { kind: "rotate", centre: mv.c, angle: a };
  } else if (mv?.k === "enlarge") {
    rows.push({ tex: `O = ${ptTex(mv.c)}`, op: Wt.rays });
    const [L0, L1] = [vdist(P0, P1), vdist(I0, I1)];
    rows.push({ tex: `k = ${mv.f < 0 ? "-" : ""}\\frac{${names[0]}'${names[1]}'}{${names[0]}${names[1]}} = ${mv.f < 0 ? "-" : ""}\\frac{${numTex(L1)}}{${numTex(L0)}} = ${numTex(mv.f, 3, { frac: true })}`, op: Wt.factor });
    data = { kind: "enlarge", centre: mv.c, factor: mv.f };
  } else data = { kind: cl.kind };
  rows.push({ tex: ruleTex(A), op: Wt.rule });

  const focus: P[] = mv && (mv.k === "rotate" || mv.k === "enlarge") ? [mv.c] : [];
  const pic = gridPic(
    [
      { pts: o.pts, names, color: C.blue },
      { pts: im.pts, names: names.map((n) => n + "′"), color: C.orange },
    ],
    (px, _s, [x0, x1, y0, y1]) => {
      let out = "";
      const R = (x1 - x0 + y1 - y0) * 2;
      const bis = (p: P, q: P) => {
        const m = mid(p, q);
        const u = vunit([-(q[1] - p[1]), q[0] - p[0]]);
        return line(...px(vadd(m, vmul(u, -R))), ...px(vadd(m, vmul(u, R))), C.purple, 1.3, DASH);
      };
      if (mv?.k === "translate") o.pts.forEach((p, i) => (out += arrow(...px(p), ...px(im.pts[i]), C.grey, 1.4, true)));
      if (mv?.k === "reflect") {
        const u: P = [-mv.n[1], mv.n[0]];
        const c = vmul(mv.n, mv.d);
        out += line(...px(vadd(c, vmul(u, -R))), ...px(vadd(c, vmul(u, R))), C.purple, 2.2);
        o.pts.forEach((p, i) => (out += line(...px(p), ...px(im.pts[i]), C.grey, 1.2, DASH)));
      }
      if (mv?.k === "rotate") {
        const moved = o.pts.map((p, i) => [p, im.pts[i]] as [P, P]).filter(([p, q]) => vdist(p, q) > 1e-9);
        for (const [p, q] of moved.slice(0, 2)) out += bis(p, q);
        const c = px(mv.c);
        out += line(...c, ...px(o.pts[0]), C.grey, 1.1, DASH) + line(...c, ...px(im.pts[0]), C.grey, 1.1, DASH);
        out += `<circle cx="${r2(c[0])}" cy="${r2(c[1])}" r="4.5" fill="${C.red}"/>`;
      }
      if (mv?.k === "enlarge") {
        const c = px(mv.c);
        o.pts.forEach((p, i) => {
          const far = [px(p), px(im.pts[i])].reduce((a2, b2) => (vdist(a2, c) > vdist(b2, c) ? a2 : b2));
          out += mv.f < 0 ? line(...px(p), ...px(im.pts[i]), C.grey, 1.1, DASH) : line(...c, ...far, C.grey, 1.1, DASH);
        });
        out += `<circle cx="${r2(c[0])}" cy="${r2(c[1])}" r="4.5" fill="${C.red}"/>`;
      }
      return out;
    },
    focus,
  );
  const caps: Caption[] = [{ text: cl.mv ? fill(Wt.single, { s: cl.text }) : cl.text, color: cl.mv ? C.green : C.grey }];
  if (mv?.k === "translate") caps.push({ text: Wt.sameVector, color: C.grey });
  const header = `${names.map((n, i) => `${n}${ptTex(o.pts[i])}`).join(",\\; ")} \\;\\to\\; ${names.map((n, i) => `${n}'${ptTex(im.pts[i])}`).join(",\\; ")}`;
  return finish(header, rows, [fit(pic.svg, pic.w!, pic.h)], caps);
}

// ---------- surface area and volume ----------

export type SolidKind = "cube" | "cuboid" | "prism" | "cylinder" | "cone" | "sphere" | "hemisphere" | "pyramid" | "frustum";
const SOLID_KEYS: Record<SolidKind, string[]> = {
  cube: ["cube"],
  cuboid: ["cuboid", "box", "rectangular prism", "rectangular box"],
  prism: ["prism", "triangular prism"],
  cylinder: ["cylinder"],
  cone: ["cone"],
  sphere: ["sphere", "ball"],
  hemisphere: ["hemisphere"],
  pyramid: ["pyramid", "square pyramid", "rectangular pyramid", "square-based pyramid"],
  frustum: ["frustum", "truncated cone"],
};
type PiNum = { a: number; b: number }; // a + bπ
const pn = (a: number, b = 0): PiNum => ({ a, b });
const pnAdd = (x: PiNum, y: PiNum, s = 1): PiNum => ({ a: x.a + s * y.a, b: x.b + s * y.b });
const pnScale = (x: PiNum, s: number): PiNum => ({ a: x.a * s, b: x.b * s });
const pnVal = (x: PiNum) => x.a + x.b * Math.PI;
const pnMin = (x: PiNum, y: PiNum) => (pnVal(x) <= pnVal(y) ? x : y);
function pnTex(x: PiNum): string {
  const coef = (b: number) => {
    const t = numTex(b, 2, { frac: true });
    return t === "1" ? "" : t === "-1" ? "-" : t;
  };
  const exact = (v: number) => exactTex(v, { frac: true });
  if (Math.abs(x.b) < 1e-12) return exact(x.a) ?? nf(x.a, 2);
  const pi = `${coef(x.b)}\\pi`;
  if (Math.abs(x.a) < 1e-12) return exact(x.b) !== null ? pi : nf(pnVal(x), 2);
  if (exact(x.a) === null || exact(x.b) === null) return nf(pnVal(x), 2);
  return `${exact(x.a)} ${x.b < 0 ? "-" : "+"} ${coef(Math.abs(x.b))}\\pi`;
}
/** "= 90π ≈ 282.74" */
const pnExact = (x: PiNum) => (Math.abs(x.b) < 1e-12 ? isExact(x.a) : (Math.abs(x.a) < 1e-12 || isExact(x.a)) && isExact(x.b));
function pnRes(x: PiNum, u = ""): string {
  const v = pnVal(x);
  if (!pnExact(x)) return `\\approx ${nf(v, 2)}${u}`;
  const t = pnTex(x);
  if (Math.abs(x.b) < 1e-12) return resTex(x.a, false, u);
  return `= ${t}${u} \\approx ${nf(v, 2)}${u}`;
}

type Dims = Record<string, number>;
type Formula = { sym: string; sub: (t: (k: string) => string) => string; val: (d: Dims) => PiNum };
type SolidDef = {
  dims: string[];
  alias: Record<string, string>;
  /** Fills in what follows from the rest (r from d, the slant height…), with the working; null when too little is known. */
  complete: (d: Partial<Dims>, rows: TexLine[] | null) => Dims | null;
  V: Formula;
  A: Formula & { terms?: Formula[] };
  bottom: (d: Dims) => PiNum;
  top: (d: Dims) => PiNum;
  /** Only one flat face: a first part stands on its point with the face up. */
  oneFace?: boolean;
  hole?: { depth: (d: Dims) => number; face: (d: Dims) => PiNum; side: (d: Dims) => PiNum };
};
const sq = (t: string) => (/^[\d.]+$|^[a-zA-Z]$/.test(t) ? `${t}^2` : `\\left(${t}\\right)^2`);
const cb = (t: string) => (/^[\d.]+$|^[a-zA-Z]$/.test(t) ? `${t}^3` : `\\left(${t}\\right)^3`);
const tm = (...ts: string[]) => ts.join(" \\times ");
/** A missing length from Pythagoras, with the working. */
function pyth(rows: TexLine[] | null, name: string, legs: [string, number][], hyp?: [string, number]): number {
  const why = words.circle.why.pythagoras;
  let v: number;
  let tex: string;
  if (!hyp) {
    const s = legs.reduce((t, [, x]) => t + x * x, 0);
    v = Math.sqrt(s);
    tex = `${name} = \\sqrt{${legs.map(([n]) => sq(n)).join(" + ")}} = \\sqrt{${legs.map(([, x]) => sq(numTex(x))).join(" + ")}} = \\sqrt{${numTex(s)}}`;
  } else {
    const s = hyp[1] * hyp[1] - legs[0][1] * legs[0][1];
    if (!(s > 0)) throw err(words.circle.impossible, { s: name, v: `√(${plainNum(s)})` });
    v = Math.sqrt(s);
    tex = `${name} = \\sqrt{${sq(hyp[0])} - ${sq(legs[0][0])}} = \\sqrt{${sq(numTex(hyp[1]))} - ${sq(numTex(legs[0][1]))}} = \\sqrt{${numTex(s)}}`;
  }
  rows?.push({ tex: `${tex} ${resTex(v, false)}`, op: why });
  return v;
}
const radius = (d: Partial<Dims>, rows: TexLine[] | null, R = "r", D = "d") => {
  if (d[R] === undefined && d[D] !== undefined) {
    d[R] = d[D]! / 2;
    rows?.push({ tex: `${R} = \\frac{${D}}{2} = \\frac{${numTex(d[D]!)}}{2} = ${numTex(d[R]!)}`, op: words.solids.radius });
  }
};
const SOLIDS: Record<SolidKind, SolidDef> = {
  cube: {
    dims: ["a"],
    alias: { side: "a", s: "a", l: "a", length: "a", x: "a", edge: "a" },
    complete: (d) => (d.a !== undefined ? { a: d.a } : null),
    V: { sym: "a^3", sub: (t) => cb(t("a")), val: (d) => pn(d.a ** 3) },
    A: { sym: "6a^2", sub: (t) => `6 \\times ${sq(t("a"))}`, val: (d) => pn(6 * d.a ** 2) },
    bottom: (d) => pn(d.a ** 2),
    top: (d) => pn(d.a ** 2),
    hole: { depth: (d) => d.a, face: (d) => pn(d.a ** 2), side: (d) => pn(4 * d.a ** 2) },
  },
  cuboid: {
    dims: ["l", "w", "h"],
    alias: { length: "l", width: "w", b: "w", breadth: "w", depth: "w", height: "h" },
    complete: (d) => (d.l !== undefined && d.w !== undefined && d.h !== undefined ? { l: d.l, w: d.w, h: d.h } : null),
    V: { sym: "lwh", sub: (t) => tm(t("l"), t("w"), t("h")), val: (d) => pn(d.l * d.w * d.h) },
    A: {
      sym: "2(lw + lh + wh)",
      sub: (t) => `2\\left(${tm(t("l"), t("w"))} + ${tm(t("l"), t("h"))} + ${tm(t("w"), t("h"))}\\right)`,
      val: (d) => pn(2 * (d.l * d.w + d.l * d.h + d.w * d.h)),
    },
    bottom: (d) => pn(d.l * d.w),
    top: (d) => pn(d.l * d.w),
    hole: { depth: (d) => d.h, face: (d) => pn(d.l * d.w), side: (d) => pn(2 * (d.l + d.w) * d.h) },
  },
  prism: {
    dims: ["b", "h", "l"],
    alias: { base: "b", height: "h", length: "l" },
    complete(d, rows) {
      if (d.b === undefined || d.h === undefined || d.l === undefined) return null;
      const s = d.s ?? pyth(rows, "s", [["h", d.h], ["\\tfrac{b}{2}", d.b / 2]]);
      return { b: d.b, h: d.h, l: d.l, s };
    },
    V: { sym: "\\tfrac{1}{2} b h l", sub: (t) => `\\tfrac{1}{2} \\times ${tm(t("b"), t("h"), t("l"))}`, val: (d) => pn((d.b * d.h * d.l) / 2) },
    A: {
      sym: "bh + bl + 2sl",
      sub: (t) => `${tm(t("b"), t("h"))} + ${tm(t("b"), t("l"))} + 2 \\times ${tm(t("s"), t("l"))}`,
      val: (d) => pn(d.b * d.h + d.b * d.l + 2 * d.s * d.l),
    },
    bottom: (d) => pn(d.b * d.l),
    top: () => pn(0),
    oneFace: true,
    hole: { depth: (d) => d.l, face: (d) => pn((d.b * d.h) / 2), side: (d) => pn((d.b + 2 * d.s) * d.l) },
  },
  cylinder: {
    dims: ["r", "h"],
    alias: { radius: "r", height: "h", diameter: "d" },
    complete(d, rows) {
      radius(d, rows);
      return d.r !== undefined && d.h !== undefined ? { r: d.r, h: d.h } : null;
    },
    V: { sym: "\\pi r^2 h", sub: (t) => `\\pi \\times ${sq(t("r"))} \\times ${t("h")}`, val: (d) => pn(0, d.r * d.r * d.h) },
    A: {
      sym: "2\\pi r^2 + 2\\pi r h",
      sub: (t) => `2\\pi \\times ${sq(t("r"))} + 2\\pi \\times ${tm(t("r"), t("h"))}`,
      val: (d) => pn(0, 2 * d.r * d.r + 2 * d.r * d.h),
      terms: [
        { sym: "2\\pi r^2", sub: () => "", val: (d) => pn(0, 2 * d.r * d.r) },
        { sym: "2\\pi r h", sub: () => "", val: (d) => pn(0, 2 * d.r * d.h) },
      ],
    },
    bottom: (d) => pn(0, d.r * d.r),
    top: (d) => pn(0, d.r * d.r),
    hole: { depth: (d) => d.h, face: (d) => pn(0, d.r * d.r), side: (d) => pn(0, 2 * d.r * d.h) },
  },
  cone: {
    dims: ["r", "h", "l"],
    alias: { radius: "r", height: "h", slant: "l", diameter: "d", s: "l" },
    complete(d, rows) {
      radius(d, rows);
      const { r, h, l } = d;
      if (r !== undefined && h !== undefined) return { r, h, l: l ?? pyth(rows, "l", [["r", r], ["h", h]]) };
      if (r !== undefined && l !== undefined) return { r, l, h: pyth(rows, "h", [["r", r]], ["l", l]) };
      if (h !== undefined && l !== undefined) return { h, l, r: pyth(rows, "r", [["h", h]], ["l", l]) };
      return null;
    },
    V: { sym: "\\tfrac{1}{3}\\pi r^2 h", sub: (t) => `\\tfrac{1}{3}\\pi \\times ${sq(t("r"))} \\times ${t("h")}`, val: (d) => pn(0, (d.r * d.r * d.h) / 3) },
    A: {
      sym: "\\pi r^2 + \\pi r l",
      sub: (t) => `\\pi \\times ${sq(t("r"))} + \\pi \\times ${tm(t("r"), t("l"))}`,
      val: (d) => pn(0, d.r * d.r + d.r * d.l),
      terms: [
        { sym: "\\pi r^2", sub: () => "", val: (d) => pn(0, d.r * d.r) },
        { sym: "\\pi r l", sub: () => "", val: (d) => pn(0, d.r * d.l) },
      ],
    },
    bottom: (d) => pn(0, d.r * d.r),
    top: () => pn(0),
    oneFace: true,
  },
  sphere: {
    dims: ["r"],
    alias: { radius: "r", diameter: "d" },
    complete(d, rows) {
      radius(d, rows);
      return d.r !== undefined ? { r: d.r } : null;
    },
    V: { sym: "\\tfrac{4}{3}\\pi r^3", sub: (t) => `\\tfrac{4}{3}\\pi \\times ${cb(t("r"))}`, val: (d) => pn(0, (4 * d.r ** 3) / 3) },
    A: { sym: "4\\pi r^2", sub: (t) => `4\\pi \\times ${sq(t("r"))}`, val: (d) => pn(0, 4 * d.r * d.r) },
    bottom: () => pn(0),
    top: () => pn(0),
  },
  hemisphere: {
    dims: ["r"],
    alias: { radius: "r", diameter: "d" },
    complete(d, rows) {
      radius(d, rows);
      return d.r !== undefined ? { r: d.r } : null;
    },
    V: { sym: "\\tfrac{2}{3}\\pi r^3", sub: (t) => `\\tfrac{2}{3}\\pi \\times ${cb(t("r"))}`, val: (d) => pn(0, (2 * d.r ** 3) / 3) },
    A: {
      sym: "2\\pi r^2 + \\pi r^2",
      sub: (t) => `2\\pi \\times ${sq(t("r"))} + \\pi \\times ${sq(t("r"))}`,
      val: (d) => pn(0, 3 * d.r * d.r),
      terms: [
        { sym: "2\\pi r^2", sub: () => "", val: (d) => pn(0, 2 * d.r * d.r) },
        { sym: "\\pi r^2", sub: () => "", val: (d) => pn(0, d.r * d.r) },
      ],
    },
    bottom: (d) => pn(0, d.r * d.r),
    top: () => pn(0),
    oneFace: true,
  },
  pyramid: {
    dims: ["l", "w", "h"],
    alias: { length: "l", width: "w", height: "h", base: "a", side: "a", b: "w" },
    complete(d, rows) {
      if (d.a !== undefined) d.l = d.w = d.a;
      if (d.l === undefined || d.w === undefined || d.h === undefined) return null;
      const sq_ = near(d.l, d.w);
      const sl = pyth(rows, sq_ ? "s" : "s_l", [["h", d.h], [sq_ ? "\\tfrac{a}{2}" : "\\tfrac{w}{2}", d.w / 2]]);
      const sw = sq_ ? sl : pyth(rows, "s_w", [["h", d.h], ["\\tfrac{l}{2}", d.l / 2]]);
      return { l: d.l, w: d.w, h: d.h, sl, sw };
    },
    V: { sym: "\\tfrac{1}{3} l w h", sub: (t) => `\\tfrac{1}{3} \\times ${tm(t("l"), t("w"), t("h"))}`, val: (d) => pn((d.l * d.w * d.h) / 3) },
    A: {
      sym: "lw + l s_l + w s_w",
      sub: (t) => `${tm(t("l"), t("w"))} + ${tm(t("l"), t("sl"))} + ${tm(t("w"), t("sw"))}`,
      val: (d) => pn(d.l * d.w + d.l * d.sl + d.w * d.sw),
    },
    bottom: (d) => pn(d.l * d.w),
    top: () => pn(0),
    oneFace: true,
  },
  frustum: {
    dims: ["R", "r", "h"],
    alias: { height: "h", slant: "s" },
    complete(d, rows) {
      if (d.R === undefined || d.r === undefined || d.h === undefined) return null;
      if (d.r > d.R) [d.R, d.r] = [d.r, d.R];
      const s = pyth(rows, "s", [["h", d.h], ["(R - r)", d.R - d.r]]);
      return { R: d.R, r: d.r, h: d.h, s };
    },
    V: {
      sym: "\\tfrac{1}{3}\\pi h\\left(R^2 + Rr + r^2\\right)",
      sub: (t) => `\\tfrac{1}{3}\\pi \\times ${t("h")} \\times \\left(${sq(t("R"))} + ${tm(t("R"), t("r"))} + ${sq(t("r"))}\\right)`,
      val: (d) => pn(0, (d.h * (d.R * d.R + d.R * d.r + d.r * d.r)) / 3),
    },
    A: {
      sym: "\\pi R^2 + \\pi r^2 + \\pi (R + r) s",
      sub: (t) => `\\pi \\times ${sq(t("R"))} + \\pi \\times ${sq(t("r"))} + \\pi \\times (${t("R")} + ${t("r")}) \\times ${t("s")}`,
      val: (d) => pn(0, d.R * d.R + d.r * d.r + (d.R + d.r) * d.s),
    },
    bottom: (d) => pn(0, d.R * d.R),
    top: (d) => pn(0, d.r * d.r),
  },
};
const DIM_TEX: Record<string, string> = { sl: "s_l", sw: "s_w" };

/** complete() without the working, null when the measurements can't fit together. */
function tryComplete(def: SolidDef, d: Partial<Dims>): Dims | null {
  try {
    return def.complete(d, null);
  } catch {
    return null;
  }
}

type Part = { kind: SolidKind; d: Partial<Dims>; V?: PiNum; A?: PiNum; asked: string[] };
function readPart(src: string): Part {
  const Wd = words.solids;
  let s = src.trim().replace(/π/g, "pi").replace(/×/g, "x");
  const low = s.toLowerCase();
  let kind: SolidKind | undefined;
  let keyLen = 0;
  for (const [k, keys] of Object.entries(SOLID_KEYS) as [SolidKind, string[]][])
    for (const key of keys) if ((low === key || low.startsWith(key + " ") || low.startsWith(key + ":") || low.startsWith(key + ",")) && key.length > keyLen) [kind, keyLen] = [k, key.length];
  if (!kind) throw err(Wd.unknownSolid, { s: src.split(/\s/)[0], list: Object.keys(SOLID_KEYS).join(", ") });
  s = s.slice(keyLen).replace(/^[:,\s]+/, "");
  const def = SOLIDS[kind];
  const part: Part = { kind, d: {}, asked: [] };
  const keyOf = (raw: string): string => {
    const k = raw.trim();
    if (/^(v|vol|volume)$/i.test(k)) return "V";
    if (k === "A" || /^(sa|area|surface area|surface|tsa)$/i.test(k)) return "A";
    if (kind === "frustum" && (k === "R" || k === "r")) return k;
    const lk = k.toLowerCase();
    if (def.dims.includes(lk) || ["d", "a", "s"].includes(lk)) return def.alias[lk] ?? lk;
    if (def.alias[lk]) return def.alias[lk];
    throw err(Wd.badDim, { s: raw });
  };
  const named = [...s.matchAll(/([A-Za-z][A-Za-z ]*?)\s*=\s*([^,;=]+?)(?=\s+[A-Za-z][A-Za-z ]*\s*=|,|$)/g)];
  if (named.length) {
    for (const m of named) {
      const k = keyOf(m[1]);
      const raw = m[2].trim().replace(/\s*(mm|cm|m|km|in|ft)(\^?[23²³])?$/i, "");
      if (raw === "?") {
        part.asked.push(k);
        continue;
      }
      const v = readNum(raw);
      if (!(v > 0)) throw err(Wd.badDim, { s: m[0] });
      if (k === "V" || k === "A") part[k] = /pi/i.test(raw) ? pn(0, v / Math.PI) : pn(v);
      else part.d[k] = v;
    }
  } else {
    // Plain numbers in the order of the dimensions: cuboid 3 x 4 x 5, cube 4, cylinder 3 10.
    const nums = s.split(/\s*(?:x|by|,|\s)\s*/).filter((t) => t.trim()).map((t) => t.replace(/(mm|cm|m|km)$/i, ""));
    if (nums.length > def.dims.length) throw err(Wd.tooMany, { s: src });
    nums.forEach((t, i) => {
      const v = readNum(t);
      if (!(v > 0)) throw err(Wd.badDim, { s: t });
      part.d[kind === "pyramid" && nums.length === 2 ? ["a", "h"][i] : def.dims[i]] = v;
    });
  }
  return part;
}

/** Solves f(u) = T for one dimension, with the working. */
function solveDim(def: SolidDef, part: Part, which: "V" | "A", u: string, rows: TexLine[], unit: string): number {
  const Wd = words.solids;
  const T = part[which]!;
  const f = (x: number): PiNum | null => {
    const c = tryComplete(def, { ...part.d, [u]: x });
    return c ? def[which].val(c) : null;
  };
  const F = (x: number) => {
    const v = f(x);
    return v ? pnVal(v) : NaN;
  };
  const sym = which === "V" ? "V" : "A";
  const uTex = DIM_TEX[u] ?? u;
  const tt = (k: string) => (k === u ? uTex : part.d[k] !== undefined ? numTex(part.d[k]!) : DIM_TEX[k] ?? k);
  rows.push({ tex: `${sym} = ${def[which].sym}`, op: which === "V" ? Wd.volume : Wd.area });
  rows.push({ tex: `${pnTex(T)} = ${def[which].sub(tt)}`, op: fill(Wd.solveFor, { s: u }) });
  const Tv = pnVal(T);
  const [f1, f2, f3] = [F(1), F(2), F(3)];
  let x: number;
  const pw = Math.log2(f2 / f1);
  const p = Math.round(pw);
  const ratioTex = (c: PiNum) => {
    const cT = pnTex(c);
    const same = (Math.abs(T.a) < 1e-12 && Math.abs(c.a) < 1e-12) || (Math.abs(T.b) < 1e-12 && Math.abs(c.b) < 1e-12);
    const q = same ? (Math.abs(T.b) > 1e-12 ? T.b / c.b : T.a / c.a) : pnVal(T) / pnVal(c);
    return { tex: `\\frac{${pnTex(T)}}{${cT}}`, q, exact: same };
  };
  if (p >= 1 && p <= 3 && near(pw, p, 1e-9) && near(f3 / f1, 3 ** p, 1e-9)) {
    // T = c·uᵖ
    const c = f(1)!;
    const r = ratioTex(c);
    x = r.q ** (1 / p);
    const qt = r.exact && isExact(r.q) ? numTex(r.q, 2, { frac: true }) : null;
    rows.push({ tex: `${p === 1 ? uTex : `${uTex}^${p}`} = ${r.tex}${qt && qt !== r.tex ? ` = ${qt}` : r.exact ? "" : ` \\approx ${nf(r.q, 3)}`}` });
    if (p > 1) {
      const xr = rat(x, 1000);
      const exact = r.exact && (xr !== null || (p === 2 && isExact(x)));
      if (xr) x = xr[0] / xr[1];
      rows.push({ tex: `${uTex} = ${p === 2 ? "\\sqrt" : "\\sqrt[3]"}{${qt ?? nf(r.q, 3)}} ${resTex(x, !exact, unit)}` });
    }
  } else {
    const [f0, d1, d2] = [F(0), f2 - f1, f3 - f2];
    const lin0 = f(0);
    if (lin0 && near(d1, f1 - f0, 1e-9) && near(d2, d1, 1e-9)) {
      // T = c₁u + c₀
      const c1 = pnAdd(f(1)!, lin0, -1);
      const top = pnAdd(T, lin0, -1);
      x = pnVal(top) / pnVal(c1);
      rows.push({ tex: `${uTex} = \\frac{${pnTex(T)} - ${pnTex(lin0).includes("+") ? `\\left(${pnTex(lin0)}\\right)` : pnTex(lin0)}}{${pnTex(c1)}} ${resTex(x, !isExact(x), unit)}` });
    } else if (lin0 && near(f3 - 3 * f2 + 3 * f1 - f0, 0, 1e-7) && Math.abs(f2 - 2 * f1 + f0) > 1e-9) {
      // T = au² + bu + c₀
      const a = pnScale(pnAdd(pnAdd(f(2)!, f(1)!, -2), lin0), 0.5);
      const b = pnAdd(pnAdd(f(1)!, lin0, -1), a, -1);
      const [av, bv, cv] = [pnVal(a), pnVal(b), pnVal(lin0) - Tv];
      const disc = bv * bv - 4 * av * cv;
      x = (-bv + Math.sqrt(disc)) / (2 * av);
      rows.push({ tex: `${pnTex(a)}${uTex}^2 + ${pnTex(b)}${uTex} ${pnVal(lin0) - Tv < 0 ? "-" : "+"} ${nf(Math.abs(cv), 3)} = 0`, op: "" });
      rows.push({ tex: `${uTex} = \\frac{-b + \\sqrt{b^2 - 4ac}}{2a} \\approx ${nf(x, 2)}${unit}` });
    } else {
      // Halve the gap until it is small enough.
      let [lo, hi] = [1e-9, 1];
      for (let i = 0; i < 80 && !(F(hi) > Tv); i++) hi *= 2;
      if (!(F(hi) >= Tv) || !(F(lo) <= Tv)) throw err(Wd.missing, { s: u });
      for (let i = 0; i < 100; i++) {
        const m = (lo + hi) / 2;
        if (F(m) < Tv) lo = m;
        else hi = m;
      }
      x = (lo + hi) / 2;
      rows.push({ tex: `${uTex} \\approx ${nf(x, 2)}${unit}`, op: Wd.numeric });
    }
  }
  if (!(x > 0) || !Number.isFinite(x)) throw err(words.circle.impossible, { s: u, v: plainNum(x) });
  return x;
}

/** One solid drawn in a box: its bottom centre at (cx, by), s pixels to a unit. */
function solidPic(kind: SolidKind, d: Dims, s: number, cx: number, by: number, o: { flip?: boolean; hole?: { kind: SolidKind; d: Dims }; labels?: boolean; unit: string; skip?: string[]; ask?: string } = { unit: "" }): { svg: string; top: number } {
  const st = `fill="none" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"`;
  const fillC = `fill="${C.blue}" fill-opacity="0.12" stroke="none"`;
  const lab = (x: number, y: number, t: string, anchor = "middle") => (o.labels === false || !t ? "" : text(x, y, t, C.blue, { anchor, size: 12.5 }));
  const u = o.unit ? ` ${o.unit}` : "";
  const L = (n: string) => (o.skip?.includes(n) ? "" : `${n} = ${n === o.ask ? "?" : plainNum(d[n]) + u}`);
  const ell = (x: number, y: number, rx: number, ry: number, part: "full" | "front" | "back", fillWith = "none") => {
    if (part === "full") return `<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(rx)}" ry="${r2(ry)}" fill="${fillWith}" stroke="${C.ink}" stroke-width="2"/>`;
    const sweep = part === "front" ? 0 : 1;
    const look = part === "back" ? `stroke="${C.grey}" stroke-width="1.4" ${DASH}` : `stroke="${C.ink}" stroke-width="2"`;
    return `<path d="M${r2(x - rx)},${r2(y)}A${r2(rx)},${r2(ry)} 0 0 ${sweep} ${r2(x + rx)},${r2(y)}" fill="none" ${look}/>`;
  };
  const box = (x: number, y: number, w: number, h: number, dp: number) => {
    const [dx, dy] = [dp * 0.5, -dp * 0.35];
    const back = `<path d="M${r2(x + dx)},${r2(y + dy)}L${r2(x + dx)},${r2(y - h + dy)}M${r2(x + dx)},${r2(y + dy)}L${r2(x)},${r2(y)}M${r2(x + dx)},${r2(y + dy)}L${r2(x + w + dx)},${r2(y + dy)}" fill="none" stroke="${C.grey}" stroke-width="1.3" ${DASH}/>`;
    return (
      `<path d="M${r2(x)},${r2(y)}h${r2(w)}v${r2(-h)}h${r2(-w)}z" ${fillC}/>` +
      `<path d="M${r2(x)},${r2(y - h)}l${r2(dx)},${r2(dy)}h${r2(w)}l${r2(-dx)},${r2(-dy)}z" fill="${C.blue}" fill-opacity="0.06"/>` +
      `<path d="M${r2(x + w)},${r2(y)}l${r2(dx)},${r2(dy)}v${r2(-h)}l${r2(-dx)},${r2(-dy)}z" fill="${C.blue}" fill-opacity="0.2"/>` +
      back +
      `<path d="M${r2(x)},${r2(y)}h${r2(w)}v${r2(-h)}h${r2(-w)}z M${r2(x)},${r2(y - h)}l${r2(dx)},${r2(dy)}h${r2(w)}l${r2(-dx)},${r2(-dy)} M${r2(x + w)},${r2(y)}l${r2(dx)},${r2(dy)}v${r2(-h)}" ${st}/>`
    );
  };
  let svg = "";
  let top = by;
  switch (kind) {
    case "cube":
    case "cuboid": {
      const [l, w, h] = kind === "cube" ? [d.a, d.a, d.a] : [d.l, d.w, d.h];
      const [W_, H, D] = [l * s, h * s, w * s];
      const x = cx - (W_ + D * 0.5) / 2;
      svg += box(x, by, W_, H, D);
      if (o.hole) {
        const hd = o.hole.d;
        const hy = by - H + (-D * 0.35) / 2;
        const hx = x + W_ / 2 + D * 0.25;
        const hw = (hd.r ?? (hd.l ?? hd.a) / 2) * s;
        svg += line(hx - hw, hy, hx - hw, hy + H, C.grey, 1.3, DASH) + line(hx + hw, hy, hx + hw, hy + H, C.grey, 1.3, DASH);
        if (o.hole.kind === "cylinder") svg += ell(hx, hy, hd.r * s, hd.r * s * 0.3, "full", "#ffffff");
        else svg += `<rect x="${r2(hx - ((hd.l ?? hd.a) * s) / 2)}" y="${r2(hy - ((hd.w ?? hd.a) * s * 0.3) / 2)}" width="${r2((hd.l ?? hd.a) * s)}" height="${r2((hd.w ?? hd.a) * s * 0.3)}" fill="#ffffff" stroke="${C.ink}" stroke-width="1.6"/>`;
      }
      if (kind === "cube") svg += lab(x + W_ / 2, by + 17, L("a"));
      else svg += lab(x + W_ / 2, by + 17, L("l")) + lab(x - 6, by - H / 2 + 4, L("h"), "end") + lab(x + W_ + D * 0.25 + 8, by - D * 0.18 + 4, L("w"), "start");
      top = by - H;
      break;
    }
    case "cylinder":
    case "frustum": {
      const [R1, R2] = kind === "cylinder" ? [d.r, d.r] : [d.R, d.r];
      const [rb, rt] = o.flip ? [R2 * s, R1 * s] : [R1 * s, R2 * s];
      const H = d.h * s;
      const [eb, et] = [rb * 0.3, rt * 0.3];
      svg += `<path d="M${r2(cx - rb)},${r2(by)}L${r2(cx - rt)},${r2(by - H)}L${r2(cx + rt)},${r2(by - H)}L${r2(cx + rb)},${r2(by)}z" ${fillC}/>`;
      svg += ell(cx, by, rb, eb, "front") + ell(cx, by, rb, eb, "back") + ell(cx, by - H, rt, et, "full");
      svg += line(cx - rb, by, cx - rt, by - H, C.ink, 2) + line(cx + rb, by, cx + rt, by - H, C.ink, 2);
      if (o.hole) {
        const hr = (o.hole.d.r ?? o.hole.d.a / 2) * s;
        svg += line(cx - hr, by - H, cx - hr, by, C.grey, 1.3, DASH) + line(cx + hr, by - H, cx + hr, by, C.grey, 1.3, DASH);
        svg += o.hole.kind === "cylinder" ? ell(cx, by - H, hr, hr * 0.3, "full", "#ffffff") : `<rect x="${r2(cx - hr)}" y="${r2(by - H - hr * 0.3)}" width="${r2(2 * hr)}" height="${r2(hr * 0.6)}" fill="#ffffff" stroke="${C.ink}" stroke-width="1.6"/>`;
      }
      svg += line(cx, by - H, cx + rt, by - H, C.blue, 1.4) + lab(cx + rt / 2, by - H - et - 6, kind === "cylinder" ? L("r") : L(o.flip ? "R" : "r"));
      if (kind === "frustum") svg += line(cx, by, cx + rb, by, C.blue, 1.4) + lab(cx + rb / 2, by + 16, L(o.flip ? "r" : "R"));
      svg += lab(cx + Math.max(rb, rt) + 8, by - H / 2 + 4, L("h"), "start");
      top = by - H;
      break;
    }
    case "cone": {
      const R = d.r * s;
      const H = d.h * s;
      const e = R * 0.3;
      if (!o.flip) {
        svg += `<path d="M${r2(cx - R)},${r2(by)}L${r2(cx)},${r2(by - H)}L${r2(cx + R)},${r2(by)}z" ${fillC}/>`;
        svg += ell(cx, by, R, e, "front") + ell(cx, by, R, e, "back") + line(cx - R, by, cx, by - H, C.ink, 2) + line(cx + R, by, cx, by - H, C.ink, 2);
        svg += line(cx, by, cx, by - H, C.grey, 1.3, DASH) + line(cx, by, cx + R, by, C.blue, 1.4);
        svg += lab(cx + R / 2, by + 16, L("r")) + lab(cx - 5, by - H / 3, L("h"), "end") + lab(cx + R / 2 + 10, by - H / 2, L("l"), "start");
        top = by - H;
      } else {
        svg += `<path d="M${r2(cx - R)},${r2(by - H)}L${r2(cx)},${r2(by)}L${r2(cx + R)},${r2(by - H)}z" ${fillC}/>`;
        svg += ell(cx, by - H, R, e, "full") + line(cx - R, by - H, cx, by, C.ink, 2) + line(cx + R, by - H, cx, by, C.ink, 2);
        svg += line(cx, by, cx, by - H, C.grey, 1.3, DASH) + lab(cx + R / 2 + 10, by - H / 2 + 8, L("h"), "start");
        top = by - H;
      }
      break;
    }
    case "sphere": {
      const R = d.r * s;
      svg += `<circle cx="${r2(cx)}" cy="${r2(by - R)}" r="${r2(R)}" fill="${C.blue}" fill-opacity="0.12" stroke="${C.ink}" stroke-width="2"/>`;
      svg += ell(cx, by - R, R, R * 0.3, "front") + ell(cx, by - R, R, R * 0.3, "back") + line(cx, by - R, cx + R, by - R, C.blue, 1.4) + lab(cx + R / 2, by - R - 6, L("r"));
      top = by - 2 * R;
      break;
    }
    case "hemisphere": {
      const R = d.r * s;
      const e = R * 0.3;
      if (!o.flip) {
        svg += `<path d="M${r2(cx - R)},${r2(by)}A${r2(R)},${r2(R)} 0 0 1 ${r2(cx + R)},${r2(by)}z" fill="${C.blue}" fill-opacity="0.12"/>`;
        svg += `<path d="M${r2(cx - R)},${r2(by)}A${r2(R)},${r2(R)} 0 0 1 ${r2(cx + R)},${r2(by)}" ${st}/>` + ell(cx, by, R, e, "front") + ell(cx, by, R, e, "back");
        svg += line(cx, by, cx + R, by, C.blue, 1.4) + lab(cx + R / 2, by + 16, L("r"));
        top = by - R;
      } else {
        svg += `<path d="M${r2(cx - R)},${r2(by - R)}A${r2(R)},${r2(R)} 0 0 0 ${r2(cx + R)},${r2(by - R)}z" fill="${C.blue}" fill-opacity="0.12"/>`;
        svg += `<path d="M${r2(cx - R)},${r2(by - R)}A${r2(R)},${r2(R)} 0 0 0 ${r2(cx + R)},${r2(by - R)}" ${st}/>` + ell(cx, by - R, R, e, "full");
        top = by - R;
      }
      break;
    }
    case "pyramid": {
      const [W_, D, H] = [d.l * s, d.w * s, d.h * s];
      const [dx, dy] = [D * 0.5, -D * 0.35];
      const x = cx - (W_ + dx) / 2;
      const apex: P = o.flip ? [x + W_ / 2 + dx / 2, by] : [x + W_ / 2 + dx / 2, by - H + dy / 2];
      const y = o.flip ? by - H : by;
      const corners: P[] = [[x, y], [x + W_, y], [x + W_ + dx, y + dy], [x + dx, y + dy]];
      svg += `<path d="M${corners.map((p) => p.map(r2).join(",")).join("L")}z" ${fillC}/>`;
      svg += `<path d="M${r2(corners[0][0])},${r2(corners[0][1])}L${r2(apex[0])},${r2(apex[1])}L${r2(corners[1][0])},${r2(corners[1][1])}z" ${fillC}/>`;
      const hidden = o.flip ? [] : [[3, 0], [2, 3]];
      const solid = o.flip ? [[0, 1], [1, 2], [2, 3], [3, 0]] : [[0, 1], [1, 2]];
      for (const [i, j] of hidden) svg += line(...corners[i], ...corners[j], C.grey, 1.3, DASH);
      for (const [i, j] of solid) svg += line(...corners[i], ...corners[j], C.ink, 2);
      corners.forEach((p, i) => (svg += line(...p, ...apex, i === 3 && !o.flip ? C.grey : C.ink, i === 3 && !o.flip ? 1.3 : 2, i === 3 && !o.flip ? DASH : "")));
      const base: P = [x + W_ / 2 + dx / 2, y + dy / 2];
      svg += line(...base, ...apex, C.grey, 1.3, DASH);
      svg += lab(x + W_ / 2, y + 17, near(d.l, d.w) ? `a = ${plainNum(d.l)}${u}` : L("l")) + lab(apex[0] + 6, (apex[1] + base[1]) / 2, L("h"), "start");
      if (!near(d.l, d.w)) svg += lab(x + W_ + dx / 2 + 8, y + dy / 2 + 4, L("w"), "start");
      top = by - H;
      break;
    }
    case "prism": {
      const [B, H, Ln] = [d.b * s, d.h * s, d.l * s];
      const [dx, dy] = [Ln * 0.55, -Ln * 0.3];
      const x = cx - (B + dx) / 2;
      const tri: P[] = [[x, by], [x + B, by], [x + B / 2, by - H]];
      const back = tri.map((p) => [p[0] + dx, p[1] + dy] as P);
      svg += `<path d="M${tri.map((p) => p.map(r2).join(",")).join("L")}z" ${fillC}/>`;
      svg += line(...back[0], ...back[1], C.grey, 1.3, DASH) + line(...tri[0], ...back[0], C.grey, 1.3, DASH) + line(...back[0], ...back[2], C.grey, 1.3, DASH);
      svg += `<path d="M${tri.map((p) => p.map(r2).join(",")).join("L")}z" ${st}/>`;
      svg += line(...back[1], ...back[2], C.ink, 2) + line(...tri[1], ...back[1], C.ink, 2) + line(...tri[2], ...back[2], C.ink, 2);
      svg += line(x + B / 2, by, x + B / 2, by - H, C.grey, 1.3, DASH);
      svg += lab(x + B / 2, by + 17, L("b")) + lab(x + B / 2 - 5, by - H / 3, L("h"), "end") + lab(x + B + dx / 2 + 8, by + dy / 2 + 6, L("l"), "start");
      top = by - H;
      break;
    }
  }
  return { svg, top };
}
/** Width and height of a solid's drawing, in units. */
function solidSize(kind: SolidKind, d: Dims): [number, number] {
  switch (kind) {
    case "cube":
      return [d.a * 1.5, d.a * 1.35];
    case "cuboid":
      return [d.l + d.w * 0.5, d.h + d.w * 0.35];
    case "cylinder":
      return [2 * d.r, d.h + d.r * 0.6];
    case "frustum":
      return [2 * Math.max(d.R, d.r), d.h + d.R * 0.6];
    case "cone":
      return [2 * d.r, d.h + d.r * 0.3];
    case "sphere":
      return [2 * d.r, 2 * d.r];
    case "hemisphere":
      return [2 * d.r, d.r * 1.3];
    case "pyramid":
      return [d.l + d.w * 0.5, d.h + d.w * 0.35];
    case "prism":
      return [d.b + d.l * 0.55, d.h + d.l * 0.3];
  }
}

/** The net of a solid, with the area of each face. */
function netPic(kind: SolidKind, d: Dims, unit: string): Pic | null {
  const lab = (x: number, y: number, t: string, c: string = C.ink) => text(x, y, t, c, { size: 11.5, bold: false });
  const face = (pts: P[], color: string = C.blue) => `<polygon points="${pts.map((p) => p.map(r2).join(",")).join(" ")}" fill="${color}" fill-opacity="0.12" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
  const rect = (x: number, y: number, w: number, h: number, color?: string) => face([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color);
  const area = (v: PiNum) => pnTex(v).replace(/\\pi/g, "π").replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2").replace(/\\sqrt\{(\d+)\}/g, "√$1").replace(/\\/g, "");
  const uu = unit ? ` ${unit}²` : "";
  let svg = "";
  let [w, h] = [0, 0];
  switch (kind) {
    case "cube":
    case "cuboid": {
      const [l, wd, ht] = kind === "cube" ? [d.a, d.a, d.a] : [d.l, d.w, d.h];
      const s = Math.min(260 / (2 * l + 2 * wd), 260 / (2 * wd + ht), 40);
      const [L, Wd, H] = [l * s, wd * s, ht * s];
      // A row of four sides, with the top and bottom on the second.
      const y0 = Wd;
      const xs = [0, Wd, Wd + L, 2 * Wd + L];
      const ws = [Wd, L, Wd, L];
      xs.forEach((x, i) => (svg += rect(x, y0, ws[i], H, i === 1 ? C.orange : C.blue)));
      svg += rect(Wd, 0, L, Wd, C.green) + rect(Wd, y0 + H, L, Wd, C.green);
      svg += lab(Wd + L / 2, y0 + H / 2 + 4, area(pn(l * ht))) + lab(Wd + L / 2, Wd / 2 + 4, area(pn(l * wd))) + lab(Wd / 2, y0 + H / 2 + 4, area(pn(wd * ht)));
      [w, h] = [2 * Wd + 2 * L, 2 * Wd + H];
      break;
    }
    case "cylinder": {
      const s = Math.min(300 / (2 * Math.PI * d.r), 180 / (d.h + 4 * d.r), 30);
      const [Lr, H, R] = [2 * Math.PI * d.r * s, d.h * s, d.r * s];
      svg += rect(0, 2 * R, Lr, H, C.orange);
      svg += `<circle cx="${r2(Lr / 2)}" cy="${r2(R)}" r="${r2(R)}" fill="${C.green}" fill-opacity="0.12" stroke="${C.ink}" stroke-width="1.6"/>`;
      svg += `<circle cx="${r2(Lr / 2)}" cy="${r2(3 * R + H)}" r="${r2(R)}" fill="${C.green}" fill-opacity="0.12" stroke="${C.ink}" stroke-width="1.6"/>`;
      svg += lab(Lr / 2, 2 * R + H / 2 + 4, `${area(pn(0, 2 * d.r * d.h))}`) + lab(Lr / 2, R + 4, area(pn(0, d.r * d.r)));
      svg += text(Lr / 2, 2 * R + H - 6, "2πr", C.grey, { size: 11, bold: false });
      [w, h] = [Lr, 4 * R + H];
      break;
    }
    case "cone": {
      const s = Math.min(105 / d.l, 30);
      const Lp = d.l * s;
      const R = d.r * s;
      const th = (360 * d.r) / d.l;
      const c: P = [Lp, Lp];
      const a0 = -90 - th / 2;
      const p0 = vadd(c, vmul(dir(a0), Lp));
      const p1 = vadd(c, vmul(dir(a0 + th), Lp));
      svg += `<path d="M${r2(c[0])},${r2(c[1])}L${r2(p0[0])},${r2(p0[1])}A${r2(Lp)},${r2(Lp)} 0 ${th > 180 ? 1 : 0} 1 ${r2(p1[0])},${r2(p1[1])}z" fill="${C.orange}" fill-opacity="0.12" stroke="${C.ink}" stroke-width="1.6" transform="scale(1,-1) translate(0,${r2(-2 * Lp)})"/>`;
      svg += `<circle cx="${r2(c[0])}" cy="${r2(2 * Lp + R + 4)}" r="${r2(R)}" fill="${C.green}" fill-opacity="0.12" stroke="${C.ink}" stroke-width="1.6"/>`;
      svg += lab(c[0], Lp + Lp * 0.5, area(pn(0, d.r * d.l))) + lab(c[0], 2 * Lp + R + 8, area(pn(0, d.r * d.r)));
      svg += text(c[0], Lp + 18, `${plainNum(th, 1)}°`, C.grey, { size: 11, bold: false });
      [w, h] = [2 * Lp, 2 * Lp + 2 * R + 8];
      break;
    }
    case "prism": {
      const s = Math.min(280 / (d.l + 2 * d.s + d.h * 0.2), 240 / (d.b + 2 * d.h), 30);
      const [B, H, L, S] = [d.b * s, d.h * s, d.l * s, d.s * s];
      // Rectangles side by side (s, b, s), the triangles on the middle one.
      svg += rect(0, H, S, L) + rect(S, H, B, L, C.orange) + rect(S + B, H, S, L);
      svg += face([[S, H], [S + B, H], [S + B / 2, 0]], C.green) + face([[S, H + L], [S + B, H + L], [S + B / 2, 2 * H + L]], C.green);
      svg += lab(S + B / 2, H + L / 2 + 4, area(pn(d.b * d.l))) + lab(S / 2, H + L / 2 + 4, area(pn(d.s * d.l))) + lab(S + B / 2, H * 0.7 + 4, area(pn((d.b * d.h) / 2)));
      [w, h] = [2 * S + B, 2 * H + L];
      break;
    }
    case "pyramid": {
      const s = Math.min(260 / (d.l + 2 * d.sw), 260 / (d.w + 2 * d.sl), 30);
      const [L, Wd, SL, SW] = [d.l * s, d.w * s, d.sl * s, d.sw * s];
      const [x0, y0] = [SW, SL];
      svg += rect(x0, y0, L, Wd, C.green);
      svg += face([[x0, y0], [x0 + L, y0], [x0 + L / 2, 0]]) + face([[x0, y0 + Wd], [x0 + L, y0 + Wd], [x0 + L / 2, y0 + Wd + SL]]);
      svg += face([[x0, y0], [x0, y0 + Wd], [0, y0 + Wd / 2]], C.orange) + face([[x0 + L, y0], [x0 + L, y0 + Wd], [x0 + L + SW, y0 + Wd / 2]], C.orange);
      svg += lab(x0 + L / 2, y0 + Wd / 2 + 4, area(pn(d.l * d.w))) + lab(x0 + L / 2, y0 - SL * 0.3 + 4, area(pn((d.l * d.sl) / 2)));
      [w, h] = [L + 2 * SW, Wd + 2 * SL];
      break;
    }
    default:
      return null;
  }
  void uu;
  const pad = 16;
  return { svg: `<g transform="translate(${pad} ${pad})">${svg}</g>${text(w / 2 + pad, h + pad + 18, words.solids.net, C.grey, { size: 12, bold: false })}`, w: w + 2 * pad, h: h + 2 * pad + 22 };
}

function renderSolids(src: string): RenderedSvg {
  const Wd = words.solids;
  let unit = "";
  const body = src
    .replace(/[;\n]\s*(mm|cm|m|km|in|ft)\s*$/i, (_, u: string) => {
      unit = u;
      return "";
    })
    .replace(/−/g, "-");
  const um = /\d\s*(mm|cm|m|km|in|ft)\b/i.exec(body);
  if (!unit && um) unit = um[1];
  const pieces = body.split(/\s+([+-])\s+(?=[a-z])/i);
  const parts: Part[] = [readPart(pieces[0])];
  const ops: string[] = [];
  for (let i = 1; i < pieces.length; i += 2) {
    ops.push(pieces[i]);
    parts.push(readPart(pieces[i + 1]));
  }
  if (parts.length > 4) throw new Error(words.tooBig);
  const minus = ops.includes("-");
  if (minus && (parts.length !== 2 || ops[0] !== "-")) throw new Error(Wd.holeOnly);
  // The header says what was given, before anything is worked out.
  const header = parts
    .map((p) => {
      const given = Object.entries(p.d).map(([k, v]) => `${DIM_TEX[k] ?? k} = ${numTex(v!)}`);
      if (p.V) given.push(`V = ${pnTex(p.V)}`);
      if (p.A) given.push(`A = ${pnTex(p.A)}`);
      return given.join(",\\ ");
    })
    .join(ops.length ? `\\quad ${ops[0] === "-" ? "-" : "+"} \\quad ` : "");
  const uL = unit ? `\\ \\mathrm{${unit}}` : "";
  const u2 = unit ? `\\ \\mathrm{${unit}}^2` : "";
  const u3 = unit ? `\\ \\mathrm{${unit}}^3` : "";
  const rows: TexLine[] = [];
  const done: { kind: SolidKind; d: Dims; V: PiNum; A: PiNum }[] = [];
  const many = parts.length > 1;
  for (const [i, part] of parts.entries()) {
    const def = SOLIDS[part.kind];
    const pre: TexLine[] = [];
    let d = def.complete({ ...part.d }, pre);
    if (!d) {
      // One dimension is missing: it comes from the volume or the surface area.
      const which = part.V ? "V" : part.A ? "A" : null;
      if (!which) throw err(Wd.missing, { s: Wd.names[part.kind] });
      const cand = (part.kind === "cone" ? (which === "V" ? ["h", "r", "l"] : ["l", "r", "h"]) : part.kind === "pyramid" && part.d.l === undefined && part.d.w === undefined ? ["a", "h"] : def.dims).filter(
        (k) => part.d[k] === undefined && tryComplete(def, { ...part.d, [k]: 1 }) !== null,
      );
      if (!cand.length) throw err(Wd.missing, { s: Wd.names[part.kind] });
      const u = cand[0];
      const x = solveDim(def, part, which, u, rows, uL);
      part.d[u] = x;
      d = def.complete({ ...part.d }, pre)!;
      data = { ...data, dim: x };
    }
    rows.push(...pre);
    const tt = (k: string) => numTex(d![k] ?? NaN);
    const V = def.V.val(d);
    const A = def.A.val(d);
    const sfx = many ? `_${i + 1}` : "";
    if (!part.V || part.A || many) rows.push({ tex: `V${sfx} = ${def.V.sym} = ${def.V.sub(tt)} ${pnRes(V, u3)}`, op: many ? Wd.names[part.kind] : Wd.volume });
    if (!many || !minus) {
      const terms = def.A.terms;
      const mid = terms && terms.length > 1 && !(V.b && 0) ? ` = ${terms.map((t) => pnTex(t.val(d!))).join(" + ")}` : "";
      if (!part.A || part.V || many) {
        // Long sums go on two lines.
        const head = `A${sfx} = ${def.A.sym} = ${def.A.sub(tt)}`;
        if (tx(`${head}${mid} ${pnRes(A, u2)}`).width > 430) rows.push({ tex: head, op: many ? Wd.names[part.kind] : Wd.area }, { tex: `\\phantom{A${sfx}}${mid} ${pnRes(A, u2)}` });
        else rows.push({ tex: `${head}${mid} ${pnRes(A, u2)}`, op: many ? Wd.names[part.kind] : Wd.area });
      }
    }
    done.push({ kind: part.kind, d, V, A });
  }
  let V = done[0].V;
  let A = done[0].A;
  const caps: Caption[] = [];
  if (many && !minus) {
    V = done.reduce((t, p) => pnAdd(t, p.V), pn(0));
    rows.push({ tex: `V = ${done.map((_, i) => `V_${i + 1}`).join(" + ")} ${pnRes(V, u3)}`, op: Wd.total });
    let hidden = pn(0);
    for (let i = 0; i + 1 < done.length; i++) {
      const lower = done[i];
      const upper = done[i + 1];
      const defL = SOLIDS[lower.kind];
      const t = i === 0 && defL.oneFace ? defL.bottom(lower.d) : defL.top(lower.d);
      hidden = pnAdd(hidden, pnScale(pnMin(t, SOLIDS[upper.kind].bottom(upper.d)), 2));
    }
    A = pnAdd(done.reduce((t, p) => pnAdd(t, p.A), pn(0)), hidden, -1);
    rows.push({ tex: `A = ${done.map((_, i) => `A_${i + 1}`).join(" + ")} - ${pnTex(hidden)} ${pnRes(A, u2)}`, op: Wd.hidden });
    if (pnVal(hidden) > 0) caps.push({ text: Wd.hidden, color: C.grey });
  } else if (minus) {
    const [outer, hole] = done;
    const hd = SOLIDS[hole.kind].hole;
    const od = SOLIDS[outer.kind].hole;
    if (!hd || !od) throw new Error(Wd.holeOnly);
    V = pnAdd(outer.V, hole.V, -1);
    if (!(pnVal(V) > 0)) throw new Error(Wd.holeOnly);
    const both = Math.abs(V.a) > 1e-12 && Math.abs(V.b) > 1e-12;
    rows.push({ tex: `V = V_1 - V_2${both ? "" : ` = ${pnTex(outer.V)} - ${pnTex(hole.V)}`} ${pnRes(V, u3)}`, op: Wd.hole });
    const through = near(hd.depth(hole.d), od.depth(outer.d), 1e-9);
    const face = hd.face(hole.d);
    const side = hd.side(hole.d);
    A = through ? pnAdd(pnAdd(outer.A, pnScale(face, 2), -1), side) : pnAdd(outer.A, side);
    const ta = pnTex(outer.A);
    rows.push({ tex: through ? `A = ${ta} - 2 \\times ${pnTex(face)} + ${pnTex(side)} ${pnRes(A, u2)}` : `A = ${ta} + ${pnTex(side)} ${pnRes(A, u2)}`, op: through ? Wd.hole : Wd.blind });
    if (hd.depth(hole.d) > od.depth(outer.d) + 1e-9) throw new Error(Wd.holeOnly);
  }
  data = { ...data, V: pnVal(V), A: pnVal(A) };

  // Drawings: the solid (or the stack) and, for one solid, its net.
  const pics: Pic[] = [];
  const sizes = done.map((p) => solidSize(p.kind, p.d));
  const stackW = Math.max(...sizes.map((s) => s[0]));
  const stackH = minus ? sizes[0][1] : sizes.reduce((t, s) => t + s[1], 0);
  const s = Math.min(190 / stackW, 230 / stackH, 60);
  const PW = Math.max(stackW * s + 130, 200);
  const PH = stackH * s + 50;
  let svg = "";
  let by = PH - 26;
  if (minus) svg += solidPic(done[0].kind, done[0].d, s, PW / 2, by, { hole: { kind: done[1].kind, d: done[1].d }, unit }).svg;
  else
    done.forEach((p, i) => {
      const flip = i === 0 && many && SOLIDS[p.kind].oneFace;
      // A radius already labelled on the part below is not labelled again.
      const prev = done[i - 1]?.d;
      const skip = prev && p.d.r !== undefined && (near(p.d.r, prev.r ?? NaN) || near(p.d.r, prev.R ?? NaN)) ? ["r"] : [];
      const r = solidPic(p.kind, p.d, s, PW / 2, by, { flip, unit, skip });
      // The next part sits on this one's top face (its flat side down).
      svg += r.svg;
      by = r.top;
    });
  pics.push({ svg, w: PW, h: PH });
  if (!many) {
    const net = netPic(done[0].kind, done[0].d, unit);
    if (net) pics.push(net);
  }
  return finish(header, rows, pics, caps);
}

// ---------- constructions and loci ----------

function circles2(c1: P, r1: number, c2: P, r2: number): P[] {
  const d = vdist(c1, c2);
  if (d < 1e-12 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const u = vunit(vsub(c2, c1));
  const m = vadd(c1, vmul(u, a));
  const n: P = [-u[1], u[0]];
  return h < 1e-12 ? [m] : [vadd(m, vmul(n, h)), vadd(m, vmul(n, -h))];
}
/** Where the line p + t·u meets a circle. */
function lineCircle(p: P, u: P, c: P, r: number): P[] {
  const w = vsub(p, c);
  const b = vdot(w, u);
  const cc = vdot(w, w) - r * r;
  const D = b * b - cc;
  if (D < -1e-12) return [];
  const s = Math.sqrt(Math.max(0, D));
  return D < 1e-12 ? [vadd(p, vmul(u, -b))] : [vadd(p, vmul(u, -b - s)), vadd(p, vmul(u, -b + s))];
}
const angleOf = (c: P, p: P) => degOf(Math.atan2(p[1] - c[1], p[0] - c[0]));
/** A compass arc around the point it marks: centre c, through p, ±span degrees. */
function compassArc(px: (p: P) => P, s: number, c: P, p: P, span = 22, color: string = C.grey): string {
  const r = vdist(c, p);
  const a = angleOf(c, p);
  const [a1, a2] = [a - span, a + span];
  const q1 = px(vadd(c, vmul(dir(a1), r)));
  const q2 = px(vadd(c, vmul(dir(a2), r)));
  return `<path d="M${r2(q1[0])},${r2(q1[1])}A${r2(r * s)},${r2(r * s)} 0 0 0 ${r2(q2[0])},${r2(q2[1])}" fill="none" stroke="${color}" stroke-width="1.3"/>`;
}
/** A long line through p and q, clipped by the grid. */
const longLine = (px: (p: P) => P, p: P, q: P, color: string, width = 2.4, extra = "") => {
  const u = vunit(vsub(q, p));
  return line(...px(vadd(p, vmul(u, -200))), ...px(vadd(p, vmul(u, 200))), color, width, extra);
};
const stepNo = (px: (p: P) => P, p: P, n: number) => {
  const q = px(p);
  return `<circle cx="${r2(q[0])}" cy="${r2(q[1])}" r="7.5" fill="#ffffff" stroke="${C.grey}"/><text x="${r2(q[0])}" y="${r2(q[1] + 3.8)}" ${FONT} font-size="10" font-weight="700" fill="${C.grey}" text-anchor="middle">${n}</text>`;
};

type Region =
  | { k: "disc"; c: P; r: number; out: boolean; strict: boolean }
  | { k: "half"; n: P; d: number; strict: boolean } // n·p < d
  | { k: "stadium"; a: P; b: P; r: number; out: boolean; strict: boolean }
  | { k: "poly"; pts: P[] };
type Curve = { k: "circle"; c: P; r: number } | { k: "line"; p: P; u: P } | { k: "stadium"; a: P; b: P; r: number };

function renderConstruct(src: string): RenderedSvg {
  const Wc = words.construct;
  const s0 = src.replace(/[−–]/g, "-");
  // Every named point, wherever it is written.
  const named: Record<string, P> = {};
  for (const m of s0.matchAll(POINT_RE)) if (m[1]) named[m[1]] = [readNum(m[2]), readNum(m[3])];
  const cls = s0.split(/;|\n/).map((c) => c.trim()).filter(Boolean);
  const cmdIdx = cls.findIndex((c) => /[a-z]{3}/i.test(c.replace(POINT_RE, "")));
  if (cmdIdx < 0) throw err(Wc.unknownCmd, { s: src });
  const cmdSrc = cls.slice(cmdIdx).join(" ; ");
  const plain = cls[cmdIdx].replace(POINT_RE, (m0, n: string | undefined) => ` ${n ?? ""} `).toLowerCase().replace(/\s+/g, " ").trim();
  /** The points a clause names, in order: written with coordinates or by name. */
  const ptsIn = (c: string, want: string[], defaults: P[]): { names: string[]; pts: P[] } => {
    const names: string[] = [];
    const pts: P[] = [];
    const re = new RegExp(`${POINT_RE.source}|\\b([A-Z])\\b`, "g");
    for (const m of c.matchAll(re)) {
      if (m[2] !== undefined) {
        names.push(m[1] ?? want[names.length] ?? "P");
        pts.push([readNum(m[2]), readNum(m[3])]);
      } else if (m[4] && named[m[4]]) {
        names.push(m[4]);
        pts.push(named[m[4]]);
      }
    }
    while (pts.length < want.length && defaults[pts.length]) {
      const n = want[pts.length];
      names.push(named[n] ? n : n);
      pts.push(named[n] ?? defaults[pts.length]);
    }
    return { names: names.slice(0, Math.max(want.length, names.length)), pts };
  };
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const steps = (key: string, v: Record<string, string>) => Wc.steps[key].forEach((t, i) => caps.push({ text: `${i + 1}. ${fill(t, v)}`, color: C.ink }));
  const groups: { pts: P[]; names: string[]; color: string }[] = [];
  const mark = (names: string[], pts: P[], color: string = C.ink) => names.forEach((n, i) => groups.push({ pts: [pts[i]], names: [n], color }));
  let extra: (px: (p: P) => P, s: number) => string = () => "";
  const focus: P[] = [];
  const same = (p: P, q: P) => vdist(p, q) < 1e-9;
  data = {};

  if (/perp\w*\s*bisector|bisect\s+(?:the\s+)?(?:line|segment)|^bisect\b(?!.*angle)/.test(plain) && !/angle/.test(plain)) {
    const { names, pts } = ptsIn(cls[cmdIdx], ["A", "B"], [[1, 1], [7, 4]]);
    const [A, B] = pts;
    if (same(A, B)) throw new Error(Wc.samePoint);
    const r = vdist(A, B) * 0.7;
    const [X, Y] = circles2(A, r, B, r);
    const M = vmul(vadd(A, B), 0.5);
    const n = vunit(vsub(B, A));
    const L = lineStr(n, vdot(n, M));
    rows.push({ tex: `M = \\left(\\frac{${numTex(A[0])} + ${numTex(B[0])}}{2},\\ \\frac{${numTex(A[1])} + ${numTex(B[1])}}{2}\\right) = ${ptTex(M)}`, op: Wc.midpoint });
    rows.push({ tex: L.tex, op: Wc.lineEq });
    data = { points: [M], mirror: [n[0], n[1], vdot(n, M)] };
    mark(names, pts);
    mark(["M"], [M], C.green);
    focus.push(X, Y);
    extra = (px, s) =>
      line(...px(A), ...px(B), C.ink, 2.2) +
      compassArc(px, s, A, X) + compassArc(px, s, A, Y) + compassArc(px, s, B, X) + compassArc(px, s, B, Y) +
      longLine(px, X, Y, C.green) + stepNo(px, vadd(X, vmul(vsub(X, M), 0.25)), 3);
    steps("bisector", { A: names[0], B: names[1] });
  } else if (/angle\s*bisector|bisect\s+(?:the\s+)?angle/.test(plain)) {
    const { names, pts } = ptsIn(cls[cmdIdx], ["A", "B", "C"], [[7, 1], [1, 1], [5, 6]]);
    const [A, B, Cc] = pts;
    if (same(A, B) || same(B, Cc)) throw new Error(Wc.samePoint);
    const u1 = vunit(vsub(A, B));
    const u2 = vunit(vsub(Cc, B));
    const th = degOf(Math.acos(Math.max(-1, Math.min(1, vdot(u1, u2)))));
    if (th < 1e-4 || th > 180 - 1e-4) throw new Error(Wc.flat);
    const r1 = 0.45 * Math.min(vdist(A, B), vdist(Cc, B));
    const P1 = vadd(B, vmul(u1, r1));
    const Q1 = vadd(B, vmul(u2, r1));
    const r2_ = vdist(P1, Q1) * 0.85;
    const R = circles2(P1, r2_, Q1, r2_).sort((a, b) => vdist(b, B) - vdist(a, B))[0];
    rows.push({ tex: `\\angle ${names.join("")} = ${numTex(th, 1)}^\\circ`, op: Wc.angles });
    rows.push({ tex: `\\angle ${names[0]}${names[1]}R = \\angle R${names[1]}${names[2]} = \\frac{${numTex(th, 1)}^\\circ}{2} ${resTex(th / 2, !isExact(th), "^\\circ", 1)}` });
    data = { angle: th / 2, points: [R] };
    mark(names, pts);
    mark(["R"], [R], C.green);
    extra = (px, s) => {
      const a1 = angleOf(B, P1);
      const a2 = angleOf(B, Q1);
      const [lo, hi] = vcross(u1, u2) > 0 ? [a1, a1 + th] : [a2, a2 + th];
      const q1 = px(vadd(B, vmul(dir(lo - 10), r1)));
      const q2 = px(vadd(B, vmul(dir(hi + 10), r1)));
      return (
        line(...px(B), ...px(A), C.ink, 2.2) + line(...px(B), ...px(Cc), C.ink, 2.2) +
        `<path d="M${r2(q1[0])},${r2(q1[1])}A${r2(r1 * s)},${r2(r1 * s)} 0 0 0 ${r2(q2[0])},${r2(q2[1])}" fill="none" stroke="${C.grey}" stroke-width="1.3"/>` +
        compassArc(px, s, P1, R) + compassArc(px, s, Q1, R) +
        `<circle cx="${r2(px(P1)[0])}" cy="${r2(px(P1)[1])}" r="2.5" fill="${C.grey}"/><circle cx="${r2(px(Q1)[0])}" cy="${r2(px(Q1)[1])}" r="2.5" fill="${C.grey}"/>` +
        line(...px(B), ...px(vadd(B, vmul(vunit(vsub(R, B)), 200))), C.green, 2.4)
      );
    };
    steps("angleBisector", { A: names[0], B: names[1], C: names[2] });
  } else if (/perp\w*\s+(?:from|to)/.test(plain) || /perp\w*\s+(?:at|through)/.test(plain)) {
    const from = /perp\w*\s+(?:from|to)/.test(plain);
    const { names, pts } = ptsIn(cls[cmdIdx], ["P", "A", "B"], from ? [[4, 6], [0, 1], [9, 2]] : [[4, 1.5], [0, 1], [9, 2]]);
    let [Pp] = pts;
    const [, A, B] = pts;
    if (same(A, B)) throw new Error(Wc.samePoint);
    const u = vunit(vsub(B, A));
    const n: P = [-u[1], u[0]];
    const F = vadd(A, vmul(u, vdot(vsub(Pp, A), u)));
    const dist = vdist(Pp, F);
    if (!from) Pp = F;
    else if (dist < 1e-9) throw new Error(Wc.onLine);
    let Q: P, R: P, S: P;
    if (from) {
      const r = dist * 1.45;
      [Q, R] = lineCircle(A, u, Pp, r);
      const r2_ = vdist(Q, R) * 0.75;
      const side = vdot(vsub(Pp, F), n) > 0 ? -1 : 1;
      S = circles2(Q, r2_, R, r2_).sort((a, b) => side * (vdot(vsub(b, F), n) - vdot(vsub(a, F), n)))[0];
    } else {
      const r = Math.max(1, vdist(A, B) * 0.18);
      [Q, R] = [vadd(Pp, vmul(u, -r)), vadd(Pp, vmul(u, r))];
      const r2_ = 2 * r * 0.85;
      S = circles2(Q, r2_, R, r2_).sort((a, b) => vdot(vsub(b, F), n) - vdot(vsub(a, F), n))[0];
    }
    const L = lineStr(u, vdot(u, Pp));
    if (from) {
      rows.push({ tex: `F = ${ptTex(F)}`, op: Wc.foot });
      rows.push({ tex: `${names[0]}F = ${numTex(dist)} ${resTex(dist, !isExact(dist))}`.replace(/= (\S+) = \1/, "= $1"), op: "" });
    }
    rows.push({ tex: L.tex, op: Wc.lineEq });
    data = { points: [F], mirror: [u[0], u[1], vdot(u, Pp)] };
    mark(from ? names : [names[0]], from ? pts : [Pp]);
    if (from) mark(["F"], [F], C.green);
    mark(names.slice(1), [A, B]);
    focus.push(S);
    extra = (px, s) =>
      longLine(px, A, B, C.ink, 2) +
      compassArc(px, s, Pp, Q, 14) + compassArc(px, s, Pp, R, 14) +
      compassArc(px, s, Q, S) + compassArc(px, s, R, S) +
      `<circle cx="${r2(px(Q)[0])}" cy="${r2(px(Q)[1])}" r="2.5" fill="${C.grey}"/><circle cx="${r2(px(R)[0])}" cy="${r2(px(R)[1])}" r="2.5" fill="${C.grey}"/>` +
      longLine(px, Pp, S, C.green) +
      (() => {
        const f = px(F);
        const a = vmul(vunit(vsub(px(vadd(F, u)), f)), 10);
        const b = vmul(vunit(vsub(px(vadd(F, n)), f)), 10);
        return `<path d="M${r2(f[0] + a[0])},${r2(f[1] + a[1])}l${r2(b[0])},${r2(b[1])}l${r2(-a[0])},${r2(-a[1])}" fill="none" stroke="${C.green}" stroke-width="1.4"/>`;
      })();
    steps(from ? "perpFrom" : "perpAt", { P: names[0], A: names[1], B: names[2] });
  } else if (/^(?:construct\s+)?(?:a\s+)?triangle/.test(plain)) {
    const raw = cls[cmdIdx].replace(/^\D*?(?=[A-Z]{2}\s*=|\d)/, "");
    let [c, a, b] = [NaN, NaN, NaN];
    const ab = /AB\s*=\s*([\d.]+)/i.exec(raw);
    const bc = /BC\s*=\s*([\d.]+)/i.exec(raw);
    const ac = /(?:AC|CA)\s*=\s*([\d.]+)/i.exec(raw);
    if (ab && bc && ac) [c, a, b] = [Number(ab[1]), Number(bc[1]), Number(ac[1])];
    else {
      const ns = [...raw.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      if (ns.length < 3) throw new Error(Wc.needSides);
      [c, a, b] = ns;
    }
    if (!(a > 0 && b > 0 && c > 0) || a + b <= c || a + c <= b || b + c <= a) throw new Error(Wc.noTriangle);
    if (Math.max(a, b, c) > 40) throw new Error(words.tooBig);
    const A: P = [1, 1];
    const B: P = [1 + c, 1];
    const Cc = circles2(A, b, B, a).sort((p, q) => q[1] - p[1])[0];
    const ang = (o: number, p: number, q: number) => degOf(Math.acos((p * p + q * q - o * o) / (2 * p * q)));
    const [aA, aB, aC] = [ang(a, b, c), ang(b, a, c), ang(c, a, b)];
    rows.push({ tex: `\\cos A = \\frac{b^2 + c^2 - a^2}{2bc} = \\frac{${numTex(b)}^2 + ${numTex(c)}^2 - ${numTex(a)}^2}{2 \\times ${numTex(b)} \\times ${numTex(c)}}`, op: Wc.angles });
    rows.push({ tex: `\\angle A \\approx ${nf(aA, 1)}^\\circ,\\quad \\angle B \\approx ${nf(aB, 1)}^\\circ,\\quad \\angle C \\approx ${nf(aC, 1)}^\\circ` });
    data = { points: [A, B, Cc], values: { A: aA, B: aB, C: aC } };
    mark(["A", "B", "C"], [A, B, Cc]);
    extra = (px, s) =>
      compassArc(px, s, A, Cc, 18) + compassArc(px, s, B, Cc, 18) +
      line(...px(A), ...px(B), C.ink, 2.4) + line(...px(A), ...px(Cc), C.green, 2.4) + line(...px(B), ...px(Cc), C.green, 2.4) +
      text(...(vadd(px(vmul(vadd(A, B), 0.5)), [0, 16]) as [number, number]), `${plainNum(c)}`, C.blue, { size: 12 }) +
      text(...(vadd(px(vmul(vadd(A, Cc), 0.5)), [-14, 0]) as [number, number]), `${plainNum(b)}`, C.blue, { size: 12 }) +
      text(...(vadd(px(vmul(vadd(B, Cc), 0.5)), [14, 0]) as [number, number]), `${plainNum(a)}`, C.blue, { size: 12 });
    steps("triangle", { a: plainNum(a), b: plainNum(b), c: plainNum(c) });
  } else if (/^(?:construct\s+)?(?:an?\s+)?angle\s*(?:of\s*)?\d/.test(plain) && !/angle\s*(?:of\s*)?(60|30|90|45)\b/.test(plain)) {
    throw new Error(Wc.onlyAngles);
  } else if (/equilateral|angle\s*(?:of\s*)?(60|30|90|45)|\b(60|30|90|45)\s*°?\s*angle/.test(plain)) {
    const want = Number((/(60|30|90|45)/.exec(plain) ?? ["", "60"])[1]);
    const { names, pts } = ptsIn(cls[cmdIdx], ["A", "B"], [[1, 1], [7, 1]]);
    const [A, B] = pts;
    if (same(A, B)) throw new Error(Wc.samePoint);
    const u = vunit(vsub(B, A));
    const n: P = [-u[1], u[0]];
    const r = vdist(A, B);
    let ray: P;
    let arcs: (px: (p: P) => P, s: number) => string;
    if (want === 60 || want === 30) {
      const Cc = circles2(A, r, B, r).sort((p, q) => vdot(vsub(q, A), n) - vdot(vsub(p, A), n))[0];
      ray = Cc;
      mark(["C"], [Cc], C.grey);
      arcs = (px, s) => compassArc(px, s, A, Cc, 30) + compassArc(px, s, B, Cc, 30) + line(...px(B), ...px(Cc), C.grey, 1.2, DASH) + line(...px(A), ...px(Cc), want === 30 ? C.grey : C.green, want === 30 ? 1.4 : 2.4);
      if (want === 30) {
        const Dd = vadd(vmul(vadd(B, Cc), 0.5), [0, 0]);
        const r2_ = r * 0.7;
        const R = circles2(B, r2_, Cc, r2_).sort((p, q) => vdist(q, A) - vdist(p, A))[0];
        ray = R;
        void Dd;
        const prev = arcs;
        arcs = (px, s) => prev(px, s) + compassArc(px, s, B, R) + compassArc(px, s, Cc, R);
      }
    } else {
      // 90°: a perpendicular at A, by extending BA past A.
      const Q = vadd(A, vmul(u, -r * 0.5));
      const R = vadd(A, vmul(u, r * 0.5));
      const r2_ = r * 0.8;
      const S = circles2(Q, r2_, R, r2_).sort((p, q) => vdot(vsub(q, A), n) - vdot(vsub(p, A), n))[0];
      ray = S;
      arcs = (px, s) => line(...px(A), ...px(Q), C.ink, 2) + compassArc(px, s, A, Q, 14) + compassArc(px, s, A, R, 14) + compassArc(px, s, Q, S) + compassArc(px, s, R, S);
      if (want === 45) {
        const Pq = vadd(A, vmul(vunit(vsub(S, A)), r * 0.5));
        const r3 = vdist(R, Pq) * 0.8;
        const T = circles2(R, r3, Pq, r3).sort((p, q) => vdist(q, A) - vdist(p, A))[0];
        ray = T;
        const prev = arcs;
        arcs = (px, s) => prev(px, s) + line(...px(A), ...px(S), C.grey, 1.4) + compassArc(px, s, A, Pq, 12) + compassArc(px, s, R, T) + compassArc(px, s, Pq, T);
      }
    }
    const got = degOf(Math.acos(vdot(u, vunit(vsub(ray, A)))));
    rows.push({ tex: `\\angle ${names[1]}${names[0]}X = ${numTex(Math.round(got * 1e6) / 1e6, 1)}^\\circ`, op: Wc.angles });
    data = { angle: got };
    mark(names, pts);
    focus.push(ray);
    extra = (px, s) => line(...px(A), ...px(B), C.ink, 2.4) + arcs(px, s) + line(...px(A), ...px(vadd(A, vmul(vunit(vsub(ray, A)), r * 1.25))), C.green, 2.4) + text(...(vadd(px(vadd(A, vmul(vunit(vsub(ray, A)), r * 1.25))), [8, -6]) as [number, number]), "X", C.green, { italic: true });
    steps(`angle${want}`, { A: names[0], B: names[1] });
  } else return renderLocus(cmdSrc, named);

  const pic = gridPic(groups, (px, s) => extra(px, s), focus);
  return finish(rowsHeader(cls[cmdIdx]), rows, [fit(pic.svg, pic.w!, pic.h)], caps);
}
const rowsHeader = (c: string) => {
  const pts = [...c.matchAll(POINT_RE)].map((m) => `${m[1] ?? ""}\\left(${numTex(readNum(m[2]))},\\ ${numTex(readNum(m[3]))}\\right)`);
  return pts.length ? pts.join(",\\; ") : "\\triangle";
};

/** Loci: circles, perpendicular bisectors, angle bisectors and bands; the region that meets every condition is shaded. */
function renderLocus(src: string, named: Record<string, P>): RenderedSvg {
  const Wc = words.construct;
  // "and" joins conditions, except in "from A and B".
  const conds = src
    .replace(POINT_RE, (_, n: string | undefined) => ` ${n ?? ""} `)
    .split(/;|\band\b(?!\s+[A-Z]{1,2}\b)/)
    .map((c) => c.trim())
    .filter((c) => /[a-z]{3}/i.test(c));
  if (!conds.length) throw err(Wc.unknownCmd, { s: src });
  const P_ = (n: string) => {
    if (!named[n]) throw err(Wc.needPoints, { s: n });
    return named[n];
  };
  const regions: Region[] = [];
  const curves: Curve[] = [];
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const focus: P[] = [];
  const num = (s: string) => readNum(s);
  for (const c0 of conds) {
    const c = c0.replace(/^(?:the\s+)?(?:locus\s+of\s+)?(?:points?\s+)?(?:that\s+are\s+|which\s+are\s+|are\s+)?/i, "").replace(/\s+/g, " ").trim();
    let m: RegExpExecArray | null;
    const lc = c.toLowerCase();
    if ((m = /^(?:inside|within|in)\s+(?:the\s+)?(?:rectangle|square|polygon|triangle|field|garden|shape)?\s*((?:[A-Z]\s*){3,})$/.exec(c))) {
      const pts = m[1].replace(/\s/g, "").split("").map(P_);
      regions.push({ k: "poly", pts });
      caps.push({ text: fill(Wc.locus.inside, { s: m[1].replace(/\s/g, "") }), color: C.ink });
      continue;
    }
    if ((m = /^(?:equidistant|the same distance)\s+from\s+([A-Z])\s*(?:and|,)?\s*([A-Z])$/i.exec(c))) {
      const [A, B] = [P_(m[1]), P_(m[2])];
      const M = vmul(vadd(A, B), 0.5);
      const n = vunit(vsub(B, A));
      curves.push({ k: "line", p: M, u: [-n[1], n[0]] });
      rows.push({ tex: lineStr(n, vdot(n, M)).tex, op: fill(Wc.locus.equidistantShort, { a: m[1], b: m[2] }) });
      caps.push({ text: fill(Wc.locus.equidistant, { a: m[1], b: m[2] }), color: C.ink });
      continue;
    }
    if ((m = /^(?:equidistant|the same distance)\s+from\s+([A-Z])([A-Z])\s*(?:and|,)?\s*([A-Z])([A-Z])$/i.exec(c))) {
      const shared = [m[1], m[2]].find((x) => x === m![3] || x === m![4]);
      if (!shared) throw err(Wc.needPoints, { s: c });
      const V = P_(shared);
      const p1 = P_(m[1] === shared ? m[2] : m[1]);
      const p2 = P_(m[3] === shared ? m[4] : m[3]);
      const u = vunit(vadd(vunit(vsub(p1, V)), vunit(vsub(p2, V))));
      curves.push({ k: "line", p: V, u });
      const n: P = [-u[1], u[0]];
      rows.push({ tex: lineStr(n, vdot(n, V)).tex, op: fill(Wc.locus.linesShort, { a: m[1] + m[2], b: m[3] + m[4] }) });
      caps.push({ text: fill(Wc.locus.lines, { a: m[1] + m[2], b: m[3] + m[4] }), color: C.ink });
      continue;
    }
    if ((m = /^(?:closer|nearer)\s+to\s+([A-Z])([A-Z])?\s+than\s+(?:to\s+)?([A-Z])([A-Z])?$/i.exec(c))) {
      if (m[2] && m[4]) {
        const shared = [m[1], m[2]].find((x) => x === m![3] || x === m![4]);
        if (!shared) throw err(Wc.needPoints, { s: c });
        const V = P_(shared);
        const p1 = P_(m[1] === shared ? m[2] : m[1]);
        const p2 = P_(m[3] === shared ? m[4] : m[3]);
        const u = vunit(vadd(vunit(vsub(p1, V)), vunit(vsub(p2, V))));
        let n: P = [-u[1], u[0]];
        if (vdot(vsub(p1, V), n) > 0) n = vmul(n, -1);
        regions.push({ k: "half", n, d: vdot(n, V), strict: true });
        curves.push({ k: "line", p: V, u });
        caps.push({ text: fill(Wc.locus.closerLines, { a: m[1] + m[2], b: m[3] + m[4] }), color: C.ink });
      } else {
        const [A, B] = [P_(m[1]), P_(m[3])];
        const n = vunit(vsub(A, B)); // closer to A: n·p > n·M  →  (−n)·p < −n·M
        const M = vmul(vadd(A, B), 0.5);
        regions.push({ k: "half", n: vmul(n, -1), d: -vdot(n, M), strict: true });
        curves.push({ k: "line", p: M, u: [-n[1], n[0]] });
        const L = lineStr(n, vdot(n, M));
        const sideTex = Math.abs(n[1]) < 1e-9 ? L.tex.replace("=", n[0] > 0 ? ">" : "<") : L.tex.replace("=", n[1] > 0 ? ">" : "<");
        rows.push({ tex: sideTex, op: fill(Wc.locus.closerShort, { a: m[1], b: m[3] }) });
        caps.push({ text: fill(Wc.locus.closer, { a: m[1], b: m[3] }), color: C.ink });
      }
      continue;
    }
    // Distances from a point or a segment.
    m = /^(?:(less than|under|within|at most|no more than|not more than|up to|more than|over|further than|farther than|at least|no less than|not less than|exactly)\s+)?(?:a\s+distance\s+(?:of\s+)?)?([\d./]+)\s*(?:cm|m|km|units?)?\s*(?:from|of|away from)\s+(?:the\s+)?(?:point\s+|line\s+|segment\s+)?([A-Z])([A-Z])?$/i.exec(c);
    if (!m && (m = /^(?:distance|exactly)\s+([\d./]+)\s*(?:cm|m|units?)?\s+from\s+([A-Z])([A-Z])?$/i.exec(c))) m = [m[0], "exactly", m[1], m[2], m[3]] as unknown as RegExpExecArray;
    if (m) {
      const q = (m[1] ?? "exactly").toLowerCase();
      const r = num(m[2]);
      if (!(r > 0)) throw err(words.bad, { s: m[2] });
      const out = /more|over|further|farther|at least|less than/.test(q) && !/^less than|^no more|^not more/.test(q) ? /more|over|further|farther|at least|no less|not less/.test(q) : false;
      const strict = /less than|more than|under|over|further|farther/.test(q);
      const exact = q === "exactly";
      const A = P_(m[3]);
      const rs = plainNum(r);
      if (m[4]) {
        const B = P_(m[4]);
        if (exact) curves.push({ k: "stadium", a: A, b: B, r });
        else regions.push({ k: "stadium", a: A, b: B, r, out, strict });
        focus.push(vadd(A, [r, r]), vadd(A, [-r, -r]), vadd(B, [r, r]), vadd(B, [-r, -r]));
        caps.push({ text: fill(exact ? Wc.locus.band : out ? Wc.locus.outBand : Wc.locus.inBand, { r: rs, s: m[3] + m[4] }), color: C.ink });
      } else {
        if (exact) curves.push({ k: "circle", c: A, r });
        else regions.push({ k: "disc", c: A, r, out, strict });
        focus.push(vadd(A, [r, r]), vadd(A, [-r, -r]));
        const eq = `\\left(x ${A[0] < 0 ? "+" : "-"} ${numTex(Math.abs(A[0]))}\\right)^2 + \\left(y ${A[1] < 0 ? "+" : "-"} ${numTex(Math.abs(A[1]))}\\right)^2`.replace(/\\left\(x - 0\\right\)\^2/, "x^2").replace(/\\left\(y - 0\\right\)\^2/, "y^2");
        rows.push({ tex: `${eq} ${exact ? "=" : out ? (strict ? ">" : "\\ge") : strict ? "<" : "\\le"} ${numTex(r * r)}`, op: fill(Wc.locus.circleShort, { r: rs, a: m[3] }) });
        caps.push({ text: fill(exact ? Wc.locus.circle : out ? Wc.locus.outDisc : Wc.locus.disc, { r: rs, a: m[3] }), color: C.ink });
      }
      continue;
    }
    throw err(Wc.unknownCmd, { s: c0 });
  }

  // Where the curves cross.
  const meets: P[] = [];
  const asLines = curves.filter((c): c is Extract<Curve, { k: "line" }> => c.k === "line");
  const asCircles = curves.filter((c): c is Extract<Curve, { k: "circle" }> => c.k === "circle");
  for (let i = 0; i < asLines.length; i++)
    for (let j = i + 1; j < asLines.length; j++) {
      const [a, b] = [asLines[i], asLines[j]];
      const D = vcross(a.u, b.u);
      if (Math.abs(D) > 1e-12) meets.push(vadd(a.p, vmul(a.u, vcross(vsub(b.p, a.p), b.u) / D)));
    }
  for (const l of asLines) for (const c of asCircles) meets.push(...lineCircle(l.p, l.u, c.c, c.r));
  for (let i = 0; i < asCircles.length; i++) for (let j = i + 1; j < asCircles.length; j++) meets.push(...circles2(asCircles[i].c, asCircles[i].r, asCircles[j].c, asCircles[j].r));
  const inside = (p: P) =>
    regions.every((g) => {
      switch (g.k) {
        case "disc":
          return g.out ? vdist(p, g.c) >= g.r - 1e-9 : vdist(p, g.c) <= g.r + 1e-9;
        case "half":
          return vdot(g.n, p) <= g.d + 1e-9;
        case "stadium": {
          const u = vsub(g.b, g.a);
          const t = Math.max(0, Math.min(1, vdot(vsub(p, g.a), u) / vdot(u, u)));
          const dd = vdist(p, vadd(g.a, vmul(u, t)));
          return g.out ? dd >= g.r - 1e-9 : dd <= g.r + 1e-9;
        }
        case "poly": {
          let ins = false;
          for (let i = 0, j = g.pts.length - 1; i < g.pts.length; j = i++) {
            const [a, b] = [g.pts[i], g.pts[j]];
            if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) ins = !ins;
          }
          return ins;
        }
      }
    });
  const good = meets.filter(inside);
  if (curves.length > 1 || (curves.length && regions.length)) {
    if (good.length) rows.push({ tex: good.map((p, i) => `X_{${i + 1}} = ${ptTex(p)}`).join(",\\quad "), op: Wc.meet });
    else if (curves.length > 1) caps.push({ text: Wc.noMeet, color: C.red });
  }
  // Is anything left of the region? Sample it.
  const pts = Object.values(named);
  const all = [...pts, ...focus, ...good];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [bx0, bx1, by0, by1] = [Math.min(...xs) - 1, Math.max(...xs) + 1, Math.min(...ys) - 1, Math.max(...ys) + 1];
  if (regions.length) {
    let any = false;
    for (let i = 0; i <= 60 && !any; i++) for (let j = 0; j <= 60 && !any; j++) any = inside([bx0 + ((bx1 - bx0) * i) / 60, by0 + ((by1 - by0) * j) / 60]);
    caps.push(any ? { text: curves.length ? Wc.region.replace("{s}", "") : Wc.region, color: C.green } : { text: Wc.noRegion, color: C.red });
  }
  data = { points: good };

  const groups = Object.entries(named).map(([n, p]) => ({ pts: [p], names: [n], color: C.ink }));
  const pic = gridPic(
    [...groups, ...good.map((p, i) => ({ pts: [p], names: [`X${["₁", "₂", "₃", "₄", "₅", "₆"][i] ?? ""}`], color: C.red }))],
    (px, s) => {
      const path = (g: Region | Curve) => {
        switch (g.k) {
          case "disc":
          case "circle": {
            const [cx, cy] = px(g.c);
            return `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(g.r * s)}"/>`;
          }
          case "stadium": {
            const u = vunit(vsub(g.b, g.a));
            const n: P = [-u[1], u[0]];
            const q = [vadd(g.a, vmul(n, g.r)), vadd(g.b, vmul(n, g.r)), vadd(g.b, vmul(n, -g.r)), vadd(g.a, vmul(n, -g.r))].map(px);
            const R = r2(g.r * s);
            return `<path d="M${q[0].map(r2).join(",")}L${q[1].map(r2).join(",")}A${R},${R} 0 0 1 ${q[2].map(r2).join(",")}L${q[3].map(r2).join(",")}A${R},${R} 0 0 1 ${q[0].map(r2).join(",")}z"/>`;
          }
          case "half": {
            const u: P = [-g.n[1], g.n[0]];
            const o = vmul(g.n, g.d);
            const q = [vadd(o, vmul(u, -500)), vadd(o, vmul(u, 500)), vadd(vadd(o, vmul(u, 500)), vmul(g.n, -1000)), vadd(vadd(o, vmul(u, -500)), vmul(g.n, -1000))].map(px);
            return `<polygon points="${q.map((p) => p.map(r2).join(",")).join(" ")}"/>`;
          }
          case "poly":
            return `<polygon points="${g.pts.map(px).map((p) => p.map(r2).join(",")).join(" ")}"/>`;
          case "line":
            return "";
        }
      };
      let out = "";
      // The region: every condition is a mask; nested masks give the overlap.
      let shade = `<rect x="-2000" y="-2000" width="5000" height="5000" fill="${C.green}" fill-opacity="0.28"/>`;
      regions.forEach((g, i) => {
        const outside = (g.k === "disc" || g.k === "stadium") && g.out;
        out += `<mask id="lm${i}" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000"><rect x="-2000" y="-2000" width="5000" height="5000" fill="${outside ? "#fff" : "#000"}"/><g fill="${outside ? "#000" : "#fff"}">${path(g)}</g></mask>`;
        shade = `<g mask="url(#lm${i})">${shade}</g>`;
      });
      if (regions.length) out += shade;
      for (const g of regions) {
        const dash = "strict" in g && g.strict ? DASH : "";
        if (g.k !== "half") out += path(g).replace("/>", ` fill="none" stroke="${g.k === "poly" ? C.ink : C.blue}" stroke-width="${g.k === "poly" ? 2.2 : 1.8}" ${dash}/>`);
      }
      for (const g of curves) {
        if (g.k === "line") out += longLine(px, g.p, vadd(g.p, g.u), regions.some((r) => r.k === "half") && !curves.some((c) => c.k !== "line") && false ? C.grey : C.purple, 2.2);
        else out += path(g).replace("/>", ` fill="none" stroke="${C.purple}" stroke-width="2.4"/>`);
      }
      return out;
    },
    focus,
  );
  const header = Object.entries(named).map(([n, p]) => `${n}${ptTex(p)}`).join(",\\; ") || "\\cdot";
  return finish(header, rows, [fit(pic.svg, pic.w!, pic.h)], caps);
}

// ---------- figures for questions ----------

/** Every word is empty: figures drawn for a question show no text from the locale. */
const quiet: EuclidWords = new Proxy(Object.assign(() => "", {}), {
  get: (_t, k) => (k === Symbol.toPrimitive || k === "toString" ? () => "" : k === "replace" ? () => "" : quiet),
}) as unknown as EuclidWords;

/** The figure of a circle theorem question, with ? on what to find; null if it can't be drawn. */
export function circleFigure(src: string): { svg: string; w: number; h: number } | null {
  words = quiet;
  try {
    const o: { out?: Pic } = {};
    renderCircle(src, o);
    return o.out ? { svg: o.out.svg, w: o.out.w ?? 260, h: o.out.h } : null;
  } catch {
    return null;
  }
}
/** A solid drawn with its measurements, for a question; `ask` is labelled with a ?. */
export function solidFigure(src: string, ask?: string): { svg: string; w: number; h: number } | null {
  words = quiet;
  try {
    const part = readPart(src);
    const d = SOLIDS[part.kind].complete({ ...part.d }, null);
    if (!d) return null;
    const [sw, sh] = solidSize(part.kind, d);
    const s = Math.min(150 / sw, 130 / sh, 40);
    const w = sw * s + 120;
    const h = sh * s + 40;
    // Only what the question gives is labelled: a slant height worked out from r and h would give the answer away.
    const skip = Object.keys(d).filter((k) => part.d[k] === undefined && k !== ask);
    return { svg: solidPic(part.kind, d, s, w / 2, h - 22, { unit: "", ask, skip }).svg, w, h };
  } catch {
    return null;
  }
}

// ---------- entry ----------

export function renderEuclid(spec: EuclidSpec, w: EuclidWords): RenderedSvg {
  return buildEuclid(spec, w).svg;
}
export function buildEuclid(spec: EuclidSpec, w: EuclidWords): { svg: RenderedSvg; data: EuclidData } {
  words = w;
  data = {};
  exprMessages({ bad: w.bad, onlyX: w.bad, tooBig: w.tooBig });
  const src = spec.src.trim();
  if (!src) throw new Error(w.need[spec.topic]);
  let svg: RenderedSvg;
  switch (spec.topic) {
    case "circle":
      svg = renderCircle(src);
      break;
    case "similar":
      svg = renderSimilar(src);
      break;
    case "transform":
      svg = renderTransform(src);
      break;
    case "solids":
      svg = renderSolids(src);
      break;
    case "construct":
      svg = renderConstruct(src);
      break;
  }
  if (/NaN|undefined|Infinity/.test(svg.svg)) throw new Error(w.tooBig);
  return { svg, data };
}

const S = (topic: EuclidTopic, src: string): EuclidSpec => ({ topic, src });
export const EUCLID_PRESETS: { [K in EuclidTopic]: { label: string; spec: EuclidSpec }[] } = {
  circle: [
    { label: "angle at the centre", spec: S("circle", "centre; AOB = 130; find ACB, OAB") },
    { label: "semicircle", spec: S("circle", "semicircle; CAB = 35") },
    { label: "same segment", spec: S("circle", "segment; ACB = 42; CAD = 30") },
    { label: "cyclic quadrilateral", spec: S("circle", "cyclic; A = 2x; C = x + 30; B = 95") },
    { label: "two tangents", spec: S("circle", "tangents; APB = 50; find AOB, PAB, OAB") },
    { label: "tangent & radius", spec: S("circle", "tangent; OA = 5; AP = 12; find OP, AOP") },
    { label: "alternate segment", spec: S("circle", "alternate; TAB = 68; SAC = 55") },
    { label: "chord", spec: S("circle", "chord; AB = 16; OA = 10; find OM") },
    { label: "intersecting chords", spec: S("circle", "chords; AE = x; EB = 6; CE = 4; ED = 9") },
    { label: "tangent–secant", spec: S("circle", "secant; PA = 4; AB = 5; find PT") },
  ],
  similar: [
    { label: "missing sides", spec: S("similar", "ABC ~ DEF; AB = 6; BC = 8; AC = 10; DE = 9") },
    { label: "A-shape (DE ∥ BC)", spec: S("similar", "ADE ~ ABC; AD = 4; DB = 6; DE = 5; find BC") },
    { label: "X-shape", spec: S("similar", "EAB ~ EDC; X; AB = 6; DC = 9; EA = 4; find ED") },
    { label: "with x", spec: S("similar", "ABC ~ PQR; AB = 4; BC = x; PQ = 10; QR = x + 6") },
    { label: "congruent? SAS", spec: S("similar", "ABC, DEF; AB = 5; BC = 7; B = 40; DE = 5; EF = 7; E = 40") },
    { label: "similar? AA", spec: S("similar", "ABC, PQR; A = 50; B = 60; P = 50; R = 70") },
    { label: "area & volume", spec: S("similar", "lengths 2 : 3; area 20 : ?; volume ? : 54") },
    { label: "from areas", spec: S("similar", "areas 25 : 64; volume 250 : ?") },
  ],
  transform: [
    { label: "rotate 90°", spec: S("transform", "A(1, 1), B(4, 1), C(1, 3); rotate 90 anticlockwise about (0, 0)") },
    { label: "reflect in y = x", spec: S("transform", "A(1, 2), B(4, 2), C(4, 4); reflect in y = x") },
    { label: "enlarge ×2", spec: S("transform", "A(1, 1), B(3, 1), C(1, 2); enlarge by scale factor 2 about (0, 0)") },
    { label: "enlarge −½", spec: S("transform", "A(2, 2), B(6, 2), C(6, 4); enlarge by -1/2 about (0, 0)") },
    { label: "translate", spec: S("transform", "A(-3, 1), B(-1, 1), C(-1, 4); translate (5, -3)") },
    { label: "two in a row", spec: S("transform", "A(1, 1), B(3, 1), C(1, 2); reflect in x = 0; then rotate 90 clockwise about (0, 0)") },
    { label: "describe: rotation", spec: S("transform", "A(1, 1), B(3, 1), C(1, 2) -> (1, 3), (1, 5), (0, 3)") },
    { label: "describe: enlargement", spec: S("transform", "A(1, 1), B(3, 1), C(1, 2) -> (2, 3), (6, 3), (2, 5)") },
  ],
  solids: [
    { label: "cylinder", spec: S("solids", "cylinder r = 3 h = 10; cm") },
    { label: "cone", spec: S("solids", "cone r = 5 h = 12; cm") },
    { label: "sphere", spec: S("solids", "sphere r = 6") },
    { label: "cuboid", spec: S("solids", "cuboid 3 x 4 x 5; cm") },
    { label: "triangular prism", spec: S("solids", "prism b = 6 h = 4 l = 10; cm") },
    { label: "square pyramid", spec: S("solids", "pyramid a = 6 h = 4; m") },
    { label: "r from the volume", spec: S("solids", "sphere V = 36pi") },
    { label: "h from the volume", spec: S("solids", "cylinder r = 4 V = 400; cm") },
    { label: "cylinder + hemisphere", spec: S("solids", "cylinder r = 3 h = 8 + hemisphere r = 3; cm") },
    { label: "cube with a hole", spec: S("solids", "cube 10 - cylinder r = 2 h = 10; cm") },
  ],
  construct: [
    { label: "perpendicular bisector", spec: S("construct", "perpendicular bisector A(1, 1) B(7, 4)") },
    { label: "angle bisector", spec: S("construct", "angle bisector A(8, 1) B(1, 1) C(5, 6)") },
    { label: "perpendicular from a point", spec: S("construct", "perpendicular from P(4, 6) to A(0, 1) B(9, 2)") },
    { label: "triangle from 3 sides", spec: S("construct", "triangle AB = 7, BC = 5, AC = 6") },
    { label: "60° angle", spec: S("construct", "angle 60 at A(1, 1) B(7, 1)") },
    { label: "region", spec: S("construct", "A(1, 1); B(8, 5); C(6, 1); closer to A than B and within 4 of C") },
    { label: "two loci meet", spec: S("construct", "A(1, 2); B(7, 2); C(4, 6); equidistant from A and B; exactly 3 from C") },
    { label: "garden", spec: S("construct", "A(0, 0); B(10, 0); C(10, 6); D(0, 6); inside ABCD and more than 3 from A and within 2 of BC") },
  ],
};
