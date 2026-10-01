// Coordinate geometry, exactly: points (distance by Pythagoras, midpoint, gradient, a point dividing a segment),
// straight lines in every form (y = mx + c, through two points, point and gradient, general form, intercepts),
// parallel and perpendicular lines with the foot of the perpendicular and the distance from a point to a line,
// two lines meeting (substitution or elimination), circles (completing the square, a point inside / on / outside,
// tangents, a line cutting the circle) and polygons (side lengths, gradients, the shape's name, shoelace area).
// Coordinates are fractions, lengths are simplified surds; every picture is on a grid with equal units.
import { axes, C, compose, dot, esc, fill, FONT, lbl, makeFrame, nf, r2, texLines, W, type Caption, type Frame, type TexLine } from "./chart";
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";

export type CoordTopic = "points" | "line" | "perp" | "meet" | "circle" | "polygon";
export const COORD_TOPICS: CoordTopic[] = ["points", "line", "perp", "meet", "circle", "polygon"];
export type CoordSpec = { topic: CoordTopic; src: string };

export type CoordWords = {
  bad: string;
  tooBig: string;
  needPoints: string;
  needLine: string;
  needTwoLines: string;
  needCircle: string;
  samePoints: string;
  notLine: string;
  notCircle: string;
  pts: { diff: string; dist: string; mid: string; grad: string; vertical: string; horizontal: string; ratio: string; line: string };
  line: {
    rearrange: string;
    divide: string;
    gradient: string;
    pointGrad: string;
    expand: string;
    slopeInt: string;
    yInt: string;
    xInt: string;
    general: string;
    vertical: string;
    rise: string;
    run: string;
    summary: string;
    summaryVertical: string;
  };
  perp: { parallel: string; perpGrad: string; perpLine: string; foot: string; dist: string; onLine: string; summary: string };
  meet: { standard: string; sub: string; collect: string; back: string; scale: string; subtract: string; parallel: string; same: string; meetAt: string };
  circle: {
    divide: string;
    group: string;
    complete: string;
    readOff: string;
    expand: string;
    radiusFrom: string;
    centre: string;
    centreRow: string;
    point: string;
    empty: string;
    inside: string;
    on: string;
    outside: string;
    radiusGrad: string;
    tangent: string;
    substitute: string;
    two: string;
    one: string;
    none: string;
  };
  poly: {
    side: string;
    parallel: string;
    perp: string;
    equal: string;
    shoelace: string;
    area: string;
    degenerate: string;
    needShape: string;
    crossing: string;
    polygon: string;
    names: {
      right: string;
      isosceles: string;
      equilateral: string;
      scalene: string;
      acute: string;
      obtuse: string;
      triangle: string;
      square: string;
      rectangle: string;
      rhombus: string;
      parallelogram: string;
      trapezium: string;
      kite: string;
      quadrilateral: string;
    };
    areaIs: string;
  };
};

let words: CoordWords;

// ---------- exact numbers ----------

const F = (n: number, d = 1) => new Frac(n, d);
const ZERO = F(0);
const ONE = F(1);
const LIMIT = 1e9;
function guard(f: Frac): Frac {
  if (Math.abs(f.n) > LIMIT || f.d > LIMIT) throw new Error(words.tooBig);
  return f;
}
const eqF = (a: Frac, b: Frac) => a.n === b.n && a.d === b.d;
const sq = (a: Frac) => a.mul(a);
/** −1/2 for running text. */
const plain = (a: Frac) => `${a.n < 0 ? "−" : ""}${Math.abs(a.n)}${a.d === 1 ? "" : `/${a.d}`}`;
/** In a sum: + 3, − 1/2. */
const signed = (a: Frac) => (a.isNeg() ? `- ${a.neg().tex()}` : `+ ${a.tex()}`);
/** Inside a product or a power: (−3). */
const par = (a: Frac) => a.texP();
/** (−2) in a product. */
const pp = (a: Frac) => (a.isNeg() ? `(${plain(a)})` : plain(a));
const approx = (v: number) => nf(v, 3).replace("-", "−");

/** √v = out·√inner with a whole inner free of squares. */
type Root = { out: Frac; inner: number };
function sqrtF(v: Frac): Root {
  if (v.isNeg()) throw new Error(words.bad.replace("{s}", "√"));
  // √(n/d) = √(n·d) / d
  let n = v.n * v.d;
  if (n > 1e12) throw new Error(words.tooBig);
  let out = 1;
  for (let p = 2; p * p <= n; p++) while (n % (p * p) === 0) (n /= p * p), (out *= p);
  return { out: F(out, v.d), inner: n };
}
const rootNum = (r: Root) => r.out.toNumber() * Math.sqrt(r.inner);
function rootTex(r: Root): string {
  if (r.inner === 1 || r.out.isZero()) return r.out.tex();
  const a = r.out.abs();
  const s = r.out.isNeg() ? "-" : "";
  const top = `${a.n === 1 ? "" : a.n}\\sqrt{${r.inner}}`;
  return a.d === 1 ? `${s}${top}` : `${s}\\frac{${top}}{${a.d}}`;
}
const rootPlain = (r: Root) => {
  if (r.inner === 1 || r.out.isZero()) return plain(r.out);
  const a = r.out.abs();
  return `${r.out.isNeg() ? "−" : ""}${a.n === 1 ? "" : a.n}√${r.inner}${a.d === 1 ? "" : `/${a.d}`}`;
};
/** "= 6√2 ≈ 8.485" when it is not whole. */
const rootResult = (r: Root) => `${rootTex(r)}${r.inner === 1 ? "" : ` \\approx ${approx(rootNum(r)).replace("−", "-")}`}`;

// ---------- points, lines, circles ----------

export type Pt = { x: Frac; y: Frac; name?: string };
/** a·x + b·y + c = 0 */
type Line = { a: Frac; b: Frac; c: Frac };

const ptTex = (p: Pt, name = true) => `${name && p.name ? p.name : ""}\\left(${p.x.tex()}, ${p.y.tex()}\\right)`;
const ptPlain = (p: Pt) => `${p.name ?? ""}(${plain(p.x)}, ${plain(p.y)})`;
const ptNum = (p: Pt): [number, number] => [p.x.toNumber(), p.y.toNumber()];

/** The same line with whole, coprime coefficients and a positive first one: 2x + 3y − 6 = 0. */
function integral(L: Line): Line {
  const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
  const m = [L.a, L.b, L.c].reduce((acc, f) => lcm(acc, f.d), 1);
  let [a, b, c] = [L.a, L.b, L.c].map((f) => f.mul(F(m)).n);
  const g = [a, b, c].reduce((acc, v) => gcd(acc, v), 0) || 1;
  [a, b, c] = [a, b, c].map((v) => v / g);
  if (a < 0 || (a === 0 && b < 0)) [a, b, c] = [-a, -b, -c];
  return { a: F(a), b: F(b), c: F(c) };
}
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
const vertical = (L: Line) => L.b.isZero();
const slope = (L: Line) => L.a.neg().div(L.b);
const intercept = (L: Line) => L.c.neg().div(L.b);
const xOf = (L: Line) => L.c.neg().div(L.a); // for a vertical line

/** c·x with the sign in front and 1 left out: −x, 2/3 x. */
function term(c: Frac, v: string, lead: boolean): string {
  if (c.isZero()) return "";
  const s = c.isNeg() ? "-" : lead ? "" : "+";
  const a = c.abs();
  const body = v && a.isOne() ? v : `${a.tex()}${v ? ` ${v}` : ""}`;
  return `${lead ? s : `${s} `}${body}`;
}
/** Σ cᵢ·vᵢ as LaTeX, "0" when empty. */
function sum(ts: [Frac, string][]): string {
  const out: string[] = [];
  for (const [c, v] of ts) {
    const t = term(c, v, out.length === 0);
    if (t) out.push(t);
  }
  return out.length ? out.join(" ") : "0";
}
/** y = mx + c, or x = k. */
function slopeTex(L: Line): string {
  if (vertical(L)) return `x = ${xOf(L).tex()}`;
  return `y = ${sum([[slope(L), "x"], [intercept(L), ""]])}`;
}
function generalTex(L: Line): string {
  const I = integral(L);
  return `${sum([[I.a, "x"], [I.b, "y"], [I.c, ""]])} = 0`;
}
const slopePlain = (L: Line) =>
  minus(slopeTex(L).replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2").replace(/\s+/g, " ").replace(/(^|[^/\d])(\d+) x/g, "$1$2x"));
const minus = (s: string) => s.replace(/-/g, "−");

function lineThrough(p: Pt, q: Pt): Line {
  // (y₂ − y₁)x − (x₂ − x₁)y + (x₂ − x₁)y₁ − (y₂ − y₁)x₁ = 0
  const dx = q.x.sub(p.x);
  const dy = q.y.sub(p.y);
  return { a: dy, b: dx.neg(), c: dx.mul(p.y).sub(dy.mul(p.x)) };
}
/** The line through p with gradient m (null: vertical). */
const lineGrad = (p: Pt, m: Frac | null): Line => (m === null ? { a: ONE, b: ZERO, c: p.x.neg() } : { a: m.neg(), b: ONE, c: m.mul(p.x).sub(p.y) });
function meet(L1: Line, L2: Line): Pt | null {
  const det = L1.a.mul(L2.b).sub(L2.a.mul(L1.b));
  if (det.isZero()) return null;
  // a₁x + b₁y = −c₁, a₂x + b₂y = −c₂ by Cramer's rule
  const x = L1.b.mul(L2.c).sub(L2.b.mul(L1.c)).div(det);
  const y = L2.a.mul(L1.c).sub(L1.a.mul(L2.c)).div(det);
  return { x: guard(x), y: guard(y) };
}
const onLine = (L: Line, p: Pt) => L.a.mul(p.x).add(L.b.mul(p.y)).add(L.c).isZero();
const dist2 = (p: Pt, q: Pt) => sq(q.x.sub(p.x)).add(sq(q.y.sub(p.y)));

// ---------- parsing ----------

/** A polynomial in x and y of degree ≤ 2: "i,j" → coefficient of xⁱyʲ. */
type Poly = Map<string, Frac>;
const pget = (p: Poly, i: number, j: number) => p.get(`${i},${j}`) ?? ZERO;
function padd(a: Poly, b: Poly, k = ONE): Poly {
  const r = new Map(a);
  for (const [key, c] of b) {
    const v = (r.get(key) ?? ZERO).add(c.mul(k));
    if (v.isZero()) r.delete(key);
    else r.set(key, guard(v));
  }
  return r;
}
function pmul(a: Poly, b: Poly): Poly {
  let r: Poly = new Map();
  for (const [ka, ca] of a)
    for (const [kb, cb] of b) {
      const [i1, j1] = ka.split(",").map(Number);
      const [i2, j2] = kb.split(",").map(Number);
      if (i1 + i2 + j1 + j2 > 2) throw new Error(words.notCircle);
      r = padd(r, new Map([[`${i1 + i2},${j1 + j2}`, ca.mul(cb)]]));
    }
  return r;
}
const pconst = (c: Frac): Poly => (c.isZero() ? new Map() : new Map([["0,0", c]]));
const pdeg = (p: Poly) => Math.max(0, ...[...p.keys()].map((k) => k.split(",").map(Number).reduce((a, b) => a + b)));

const NORMAL: [RegExp, string][] = [[/[−–]/g, "-"], [/[×·]/g, "*"], [/÷/g, "/"], [/²/g, "^2"], [/\s+/g, " "]];
const normal = (s: string) => NORMAL.reduce((acc, [re, to]) => acc.replace(re, to), s).trim();

/** + − × ÷ ^, brackets and implicit products over numbers, x and y. */
function parsePoly(src: string): Poly {
  const s = src.replace(/\s+/g, "");
  let i = 0;
  const bad = () => new Error(fill(words.bad, { s: src.trim() }));
  const peek = () => s[i];
  const expr = (): Poly => {
    let p = term_();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      p = padd(p, term_(), op === "+" ? ONE : F(-1));
    }
    return p;
  };
  const term_ = (): Poly => {
    let p = unary();
    for (;;) {
      const c = peek();
      if (c === "*") (i++, (p = pmul(p, unary())));
      else if (c === "/") {
        i++;
        const d = unary();
        if (pdeg(d) > 0 || !d.size) throw bad();
        p = pmul(p, pconst(ONE.div(pget(d, 0, 0))));
      } else if (c !== undefined && /[\d.(xy]/.test(c)) p = pmul(p, power());
      else return p;
    }
  };
  const unary = (): Poly => {
    if (peek() === "-") return i++, pmul(pconst(F(-1)), unary());
    if (peek() === "+") return i++, unary();
    return power();
  };
  const power = (): Poly => {
    const b = atom();
    if (peek() !== "^") return b;
    i++;
    const m = /^\d+/.exec(s.slice(i));
    if (!m || Number(m[0]) > 2) throw new Error(words.notCircle);
    i += m[0].length;
    return Number(m[0]) === 0 ? pconst(ONE) : Number(m[0]) === 1 ? b : pmul(b, b);
  };
  const atom = (): Poly => {
    const c = peek();
    if (c === "(") {
      i++;
      const p = expr();
      if (peek() !== ")") throw bad();
      i++;
      return p;
    }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (m) {
      i += m[0].length;
      return pconst(guard(Frac.parse(m[0])!));
    }
    if (c === "x" || c === "y") return i++, new Map([[c === "x" ? "1,0" : "0,1", ONE]]);
    throw bad();
  };
  if (!s) throw bad();
  const p = expr();
  if (i < s.length) throw bad();
  return p;
}

/** What one input item is. */
type Item =
  | { k: "pt"; p: Pt; centre: boolean }
  | { k: "eq"; poly: Poly; src: string; lhsY: boolean }
  | { k: "param"; name: "m" | "c" | "r"; v: Frac }
  | { k: "ratio"; m: number; n: number };

/** A number: 3, −1/2, 0.25, or any sum or quotient of them (4/−2). */
function num(src: string): Frac {
  const f = Frac.parse(src.trim());
  if (f) return guard(f);
  const p = parsePoly(src);
  if (pdeg(p) > 0) throw new Error(fill(words.bad, { s: src.trim() }));
  return pget(p, 0, 0);
}

/** Items separated by ";" or by commas outside brackets. */
export function parseItems(src: string): Item[] {
  const s = normal(src);
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if ((ch === ";" || ch === ",") && depth === 0) (parts.push(cur), (cur = ""));
    else cur += ch;
  }
  parts.push(cur);
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p): Item => {
      const pt = /^([^\s(=]*)\s*\(\s*([^,()]+),\s*([^,()]+)\)$/.exec(p);
      if (pt) {
        const word = pt[1];
        const centre = /^(centre|center|c|o|центр|ცენტრი)$/i.test(word) && word !== "C";
        const name = !centre && /^[A-Za-z][A-Za-z0-9']?$/.test(word) ? word : undefined;
        return { k: "pt", p: { x: num(pt[2]), y: num(pt[3]), name }, centre };
      }
      const param = /^(m|c|r)\s*=\s*([-+\d./() ]+)$/.exec(p);
      if (param) return { k: "param", name: param[1] as "m" | "c" | "r", v: num(param[2]) };
      const ratio = /^(?:ratio|отношение|შეფარდება)?\s*(\d+)\s*:\s*(\d+)$/i.exec(p);
      if (ratio) return { k: "ratio", m: Number(ratio[1]), n: Number(ratio[2]) };
      const eq = p.split("=");
      if (eq.length === 2 && /[xy]/.test(p)) {
        const poly = padd(parsePoly(eq[0]), parsePoly(eq[1]), F(-1));
        return { k: "eq", poly, src: p, lhsY: eq[0].trim() === "y" && !/y/.test(eq[1]) };
      }
      throw new Error(fill(words.bad, { s: p }));
    });
}

function asLine(it: Extract<Item, { k: "eq" }>): Line {
  if (pdeg(it.poly) !== 1) throw new Error(fill(words.notLine, { s: it.src }));
  const L = { a: pget(it.poly, 1, 0), b: pget(it.poly, 0, 1), c: pget(it.poly, 0, 0) };
  return L;
}

/** Default names A, B, C, … for points typed without one. */
function named(ps: Pt[], from = 0): Pt[] {
  return ps.map((p, i) => (p.name ? p : { ...p, name: String.fromCharCode(65 + from + i) }));
}

// ---------- the picture: a grid with equal units ----------

/** A frame with the same scale on both axes around the given points. */
function plane(id: string, pts: [number, number][], y0: number, maxH = 380): Frame {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  let [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0v, y1v] = [Math.min(...ys), Math.max(...ys)];
  // Keep the origin in view when it is not far away.
  const near = (lo: number, hi: number) => lo > 0 ? lo < (hi - lo) * 1.2 + 3 : hi < 0 ? -hi < (hi - lo) * 1.2 + 3 : true;
  if (near(x0, x1)) (x0 = Math.min(x0, 0)), (x1 = Math.max(x1, 0));
  if (near(y0v, y1v)) (y0v = Math.min(y0v, 0)), (y1v = Math.max(y1v, 0));
  const pad = Math.max(1, (Math.max(x1 - x0, y1v - y0v) || 4) * 0.15);
  [x0, x1, y0v, y1v] = [x0 - pad, x1 + pad, y0v - pad, y1v + pad];
  const wPx = W - 48 - 24;
  let hPx = (wPx * (y1v - y0v)) / (x1 - x0);
  if (hPx > maxH) {
    // Too tall: widen x so the units stay square.
    const need = ((y1v - y0v) * wPx) / maxH;
    const mid = (x0 + x1) / 2;
    [x0, x1] = [mid - need / 2, mid + need / 2];
    hPx = maxH;
  } else if (hPx < 220) {
    const need = (220 * (x1 - x0)) / wPx;
    const mid = (y0v + y1v) / 2;
    [y0v, y1v] = [mid - need / 2, mid + need / 2];
    hPx = 220;
  }
  return makeFrame(id, 48, y0 + 6, wPx, hPx, [x0, x1], [y0v, y1v]);
}
/** A whole line across the frame. */
function lineSvg(fr: Frame, L: Line, color: string, extra = ""): string {
  const big = (fr.x1 - fr.x0 + fr.y1 - fr.y0) * 2;
  let p: [number, number];
  let q: [number, number];
  if (vertical(L)) {
    const x = xOf(L).toNumber();
    [p, q] = [[x, fr.y0 - big], [x, fr.y1 + big]];
  } else {
    const m = slope(L).toNumber();
    const k = intercept(L).toNumber();
    [p, q] = [[fr.x0 - big, m * (fr.x0 - big) + k], [fr.x1 + big, m * (fr.x1 + big) + k]];
  }
  return `<g clip-path="url(#${fr.id})"><line x1="${r2(fr.sx(p[0]))}" y1="${r2(fr.sy(p[1]))}" x2="${r2(fr.sx(q[0]))}" y2="${r2(fr.sy(q[1]))}" stroke="${color}" stroke-width="2.4" ${extra}/></g>`;
}
const segSvg = (fr: Frame, p: [number, number], q: [number, number], color: string, extra = "") =>
  `<line x1="${r2(fr.sx(p[0]))}" y1="${r2(fr.sy(p[1]))}" x2="${r2(fr.sx(q[0]))}" y2="${r2(fr.sy(q[1]))}" stroke="${color}"${extra.includes("stroke-width") ? "" : ` stroke-width="2.4"`} stroke-linecap="round" ${extra}/>`;
/** A labelled point; the label goes up-right unless told otherwise. */
function ptSvg(fr: Frame, p: [number, number], label: string, color: string, dx = 8, dy = -8, anchor = "start"): string {
  return dot(fr.sx(p[0]), fr.sy(p[1]), color, 5) + (label ? lbl(fr.sx(p[0]) + dx, fr.sy(p[1]) + dy, label, color, anchor, 13, false) : "");
}
/** The little square of a right angle at p between directions u and v (in units). */
function rightMark(fr: Frame, p: [number, number], u: [number, number], v: [number, number], color = C.grey): string {
  const toPx = (d: [number, number]) => {
    const dx = fr.sx(p[0] + d[0]) - fr.sx(p[0]);
    const dy = fr.sy(p[1] + d[1]) - fr.sy(p[1]);
    const n = Math.hypot(dx, dy) || 1;
    return [(dx / n) * 11, (dy / n) * 11];
  };
  const [ux, uy] = toPx(u);
  const [vx, vy] = toPx(v);
  const [px, py] = [fr.sx(p[0]), fr.sy(p[1])];
  return `<path d="M${r2(px + ux)},${r2(py + uy)} L${r2(px + ux + vx)},${r2(py + uy + vy)} L${r2(px + vx)},${r2(py + vy)}" fill="none" stroke="${color}" stroke-width="1.4"/>`;
}
const text = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 13}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""}>${esc(s)}</text>`;

/** Steps, then the picture, then captions. */
function finish(header: string, rows: TexLine[], pic: (y: number) => { svg: string; h: number } | null, caps: Caption[]): RenderedSvg {
  if (rows.length) rows[rows.length - 1].color ??= C.green;
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;
  const p = pic(y);
  if (p) {
    body.push(p.svg);
    y += p.h;
  }
  return compose(header, body.join(""), y, caps);
}
const frameH = (fr: Frame, y0: number) => fr.bottom - y0 + 22;

// ---------- points ----------

function renderPoints(items: Item[], w: CoordWords): RenderedSvg {
  const W_ = w.pts;
  const ps = named(items.flatMap((it) => (it.k === "pt" ? [it.p] : [])));
  if (ps.length < 2) throw new Error(w.needPoints);
  const [A, B] = ps;
  if (eqF(A.x, B.x) && eqF(A.y, B.y)) throw new Error(w.samePoints);
  const ratio = items.find((it): it is Extract<Item, { k: "ratio" }> => it.k === "ratio");
  const [a, b] = [A.name!, B.name!];
  const dx = B.x.sub(A.x);
  const dy = B.y.sub(A.y);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  rows.push({ tex: `\\Delta x = ${B.x.tex()} - ${par(A.x)} = ${dx.tex()}, \\quad \\Delta y = ${B.y.tex()} - ${par(A.y)} = ${dy.tex()}`, op: W_.diff });
  const d2 = sq(dx).add(sq(dy));
  const d = sqrtF(d2);
  rows.push({ tex: `${a}${b} = \\sqrt{${par(dx)}^2 + ${par(dy)}^2} = \\sqrt{${d2.tex()}}${d.inner === d2.n * d2.d && d.out.isOne() ? "" : ` = ${rootTex(d)}`}${d.inner === 1 ? "" : ` \\approx ${approx(rootNum(d)).replace("−", "-")}`}`, op: W_.dist, color: C.blue });
  const M: Pt = { x: A.x.add(B.x).div(F(2)), y: A.y.add(B.y).div(F(2)), name: "M" };
  rows.push({ tex: `M = \\left(\\frac{${A.x.tex()} ${signed(B.x)}}{2}, \\frac{${A.y.tex()} ${signed(B.y)}}{2}\\right) = ${ptTex(M, false)}`, op: W_.mid, color: C.purple });
  if (dx.isZero()) rows.push({ tex: `\\Delta x = 0`, op: W_.vertical, color: C.orange });
  else {
    const m = dy.div(dx);
    rows.push({ tex: `m = \\frac{\\Delta y}{\\Delta x} = \\frac{${dy.tex()}}{${dx.tex()}}${m.isInt() && dx.isOne() ? "" : ` = ${m.tex()}`}`, op: dy.isZero() ? W_.horizontal : W_.grad, color: C.orange });
  }
  let P: Pt | null = null;
  if (ratio) {
    const [m, n] = [F(ratio.m), F(ratio.n)];
    P = { x: n.mul(A.x).add(m.mul(B.x)).div(m.add(n)), y: n.mul(A.y).add(m.mul(B.y)).div(m.add(n)), name: "P" };
    rows.push({
      tex: `P = \\left(\\frac{${ratio.n} \\cdot ${par(A.x)} + ${ratio.m} \\cdot ${par(B.x)}}{${ratio.m + ratio.n}}, \\frac{${ratio.n} \\cdot ${par(A.y)} + ${ratio.m} \\cdot ${par(B.y)}}{${ratio.m + ratio.n}}\\right) = ${ptTex(P, false)}`,
      op: fill(W_.ratio, { r: `${ratio.m} : ${ratio.n}` }),
      color: C.green,
    });
  }
  const L = lineThrough(A, B);
  caps.push({ text: fill(W_.line, { a, b, eq: slopePlain(L) }), color: "#495057" });
  const header = `${ptTex(A)}, \\; ${ptTex(B)}`;
  return finish(header, rows, (y) => {
    const [pa, pb] = [ptNum(A), ptNum(B)];
    const fr = plane("cg-pts", [pa, pb], y);
    const corner: [number, number] = [pb[0], pa[1]];
    const parts = [axes(fr)];
    if (!dx.isZero() && !dy.isZero()) {
      parts.push(
        segSvg(fr, pa, corner, C.orange, `stroke-dasharray="7 4"`),
        segSvg(fr, corner, pb, C.red, `stroke-dasharray="7 4"`),
        rightMark(fr, corner, [pa[0] - corner[0], 0], [0, pb[1] - corner[1]]),
        lbl((fr.sx(pa[0]) + fr.sx(corner[0])) / 2, fr.sy(corner[1]) + (pb[1] > pa[1] ? 18 : -8), `Δx = ${plain(dx)}`, C.orange, "middle", 13, false),
        lbl(fr.sx(corner[0]) + (pb[0] > pa[0] ? 8 : -8), (fr.sy(corner[1]) + fr.sy(pb[1])) / 2 + 4, `Δy = ${plain(dy)}`, C.red, pb[0] > pa[0] ? "start" : "end", 13, false),
      );
    }
    parts.push(segSvg(fr, pa, pb, C.blue), ptSvg(fr, pa, ptPlain(A), C.blue, -8, -8, "end"), ptSvg(fr, pb, ptPlain(B), C.blue), ptSvg(fr, ptNum(M), ptPlain(M), C.purple, -8, -8, "end"));
    if (P) parts.push(ptSvg(fr, ptNum(P), ptPlain(P), C.green, 8, 16));
    return { svg: parts.join(""), h: frameH(fr, y) };
  }, caps);
}

// ---------- the equation of a line ----------

/** Rows from a typed equation to y = mx + c (or x = k). */
function rearrange(L: Line, typedY: boolean, rows: TexLine[], w: CoordWords) {
  if (vertical(L)) {
    if (!L.a.isOne() || !L.c.isZero()) rows.push({ tex: `x = ${xOf(L).tex()}`, op: w.line.vertical });
    return;
  }
  if (typedY) return;
  // b·y = −a·x − c, then ÷ b.
  rows.push({ tex: `${term(L.b, "y", true)} = ${sum([[L.a.neg(), "x"], [L.c.neg(), ""]])}`, op: w.line.rearrange });
  if (!L.b.isOne()) rows.push({ tex: slopeTex(L), op: fill(w.line.divide, { b: plain(L.b) }) });
}

/** Gradient, intercepts and the general form. */
function lineFacts(L: Line, rows: TexLine[], w: CoordWords) {
  const Lw = w.line;
  if (vertical(L)) {
    rows.push({ tex: `${generalTex(L)}`, op: Lw.general });
    return;
  }
  const m = slope(L);
  const k = intercept(L);
  rows.push({ tex: `m = ${m.tex()}, \\quad (0, ${k.tex()})`, op: Lw.yInt, color: C.orange });
  if (!m.isZero()) {
    const x0 = k.neg().div(m);
    rows.push({ tex: `0 = ${sum([[m, "x"], [k, ""]])} \\;\\Rightarrow\\; x = ${x0.tex()}`, op: Lw.xInt, color: C.purple });
  }
  rows.push({ tex: generalTex(L), op: Lw.general });
}

function linePicture(L: Line, given: Pt[], y: number): { svg: string; h: number } {
  const marks: [number, number][] = given.map(ptNum);
  const vert = vertical(L);
  const k = vert ? null : intercept(L);
  const m = vert ? null : slope(L);
  if (k) marks.push([0, k.toNumber()]);
  if (m && !m.isZero()) marks.push([k!.neg().div(m).toNumber(), 0]);
  if (vert) marks.push([xOf(L).toNumber(), 0]);
  // The slope triangle: run q, rise p for m = p/q, from the y-intercept (or the first given point).
  const base: [number, number] | null = m && !m.isZero() ? (given.length ? ptNum(given[0]) : [0, k!.toNumber()]) : null;
  if (base && m) marks.push([base[0] + m.d, base[1] + m.n]);
  const fr = plane("cg-line", marks.length ? marks : [[0, 0]], y);
  const parts = [axes(fr), lineSvg(fr, L, C.blue)];
  if (base && m) {
    const corner: [number, number] = [base[0] + m.d, base[1]];
    const top: [number, number] = [base[0] + m.d, base[1] + m.n];
    parts.push(
      segSvg(fr, base, corner, C.orange, `stroke-dasharray="6 4"`),
      segSvg(fr, corner, top, C.red, `stroke-dasharray="6 4"`),
      lbl((fr.sx(base[0]) + fr.sx(corner[0])) / 2, fr.sy(base[1]) + (m.n > 0 ? 17 : -8), fill(words.line.run, { v: m.d }), C.orange, "middle", 12, false),
      lbl(fr.sx(corner[0]) + 7, (fr.sy(corner[1]) + fr.sy(top[1])) / 2 + 4, fill(words.line.rise, { v: plain(F(m.n)) }), C.red, "start", 12, false),
    );
  }
  if (k) parts.push(ptSvg(fr, [0, k.toNumber()], `(0, ${plain(k)})`, C.orange, 8, 16));
  if (m && !m.isZero() && !k!.isZero()) parts.push(ptSvg(fr, [k!.neg().div(m).toNumber(), 0], `(${plain(k!.neg().div(m))}, 0)`, C.purple, 6, -10));
  for (const p of given) parts.push(ptSvg(fr, ptNum(p), ptPlain(p), C.blue, -8, -8, "end"));
  parts.push(lbl(fr.right - 8, fr.top + 18, slopePlain(L), C.blue, "end", 14, false));
  return { svg: parts.join(""), h: frameH(fr, y) };
}

function renderLine(items: Item[], w: CoordWords): RenderedSvg {
  const Lw = w.line;
  const eq = items.find((it): it is Extract<Item, { k: "eq" }> => it.k === "eq");
  const ps = named(items.flatMap((it) => (it.k === "pt" ? [it.p] : [])));
  const param = (name: "m" | "c") => items.find((it): it is Extract<Item, { k: "param" }> => it.k === "param" && it.name === name)?.v;
  const [m, c] = [param("m"), param("c")];
  const rows: TexLine[] = [];
  let L: Line;
  let header: string;
  if (eq) {
    L = asLine(eq);
    header = eq.src.replace(/\*/g, " \\cdot ");
    rearrange(L, eq.lhsY, rows, w);
  } else if (ps.length >= 2) {
    const [A, B] = ps;
    if (eqF(A.x, B.x) && eqF(A.y, B.y)) throw new Error(w.samePoints);
    header = `${ptTex(A)}, \\; ${ptTex(B)}`;
    const dx = B.x.sub(A.x);
    const dy = B.y.sub(A.y);
    L = lineThrough(A, B);
    if (dx.isZero()) rows.push({ tex: `x = ${A.x.tex()}`, op: Lw.vertical });
    else {
      const mm = dy.div(dx);
      rows.push({ tex: `m = \\frac{${B.y.tex()} - ${par(A.y)}}{${B.x.tex()} - ${par(A.x)}} = \\frac{${dy.tex()}}{${dx.tex()}}${dx.isOne() ? "" : ` = ${mm.tex()}`}`, op: Lw.gradient });
      pointGradRows(A, mm, rows, w);
    }
  } else if (ps.length === 1 && m) {
    const [A] = ps;
    header = `${ptTex(A)}, \\; m = ${m.tex()}`;
    L = lineGrad(A, m);
    pointGradRows(A, m, rows, w);
  } else if (m && c) {
    header = `m = ${m.tex()}, \\; c = ${c.tex()}`;
    L = { a: m.neg(), b: ONE, c: c.neg() };
    rows.push({ tex: slopeTex(L), op: Lw.slopeInt });
  } else throw new Error(w.needLine);
  lineFacts(L, rows, w);
  const caps: Caption[] = [{ text: vertical(L) ? Lw.summaryVertical : fill(Lw.summary, { m: plain(slope(L)), c: plain(intercept(L)) }), color: "#495057" }];
  return finish(header, rows, (y) => linePicture(L, ps.slice(0, 2), y), caps);
}

/** y − y₁ = m(x − x₁), then expanded to y = mx + c. */
function pointGradRows(A: Pt, m: Frac, rows: TexLine[], w: CoordWords) {
  const inner = A.x.isZero() ? "x" : `\\left(x ${signed(A.x.neg())}\\right)`;
  const lhs = A.y.isZero() ? "y" : `y ${signed(A.y.neg())}`;
  rows.push({ tex: `${lhs} = ${m.isOne() ? "" : m.texP()}${inner}`, op: w.line.pointGrad });
  rows.push({ tex: slopeTex(lineGrad(A, m)), op: w.line.expand });
}

// ---------- parallel and perpendicular ----------

function renderPerp(items: Item[], w: CoordWords): RenderedSvg {
  const Pw = w.perp;
  const eq = items.find((it): it is Extract<Item, { k: "eq" }> => it.k === "eq");
  const pt = items.find((it): it is Extract<Item, { k: "pt" }> => it.k === "pt");
  if (!eq || !pt) throw new Error(w.needLine);
  const L = asLine(eq);
  const P = { ...pt.p, name: pt.p.name ?? "P" };
  const header = `${eq.src.replace(/\*/g, " \\cdot ")}, \\; ${ptTex(P)}`;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  rearrange(L, eq.lhsY, rows, w);
  // Gradients: m, and −1/m for the perpendicular (a horizontal line's perpendicular is vertical).
  const m = vertical(L) ? null : slope(L);
  const mPerp = m === null ? ZERO : m.isZero() ? null : ONE.neg().div(m);
  const par_ = lineGrad(P, m);
  const perp = lineGrad(P, mPerp);
  rows.push({ tex: `${m === null ? "x" : "m"} ${m === null ? `= ${xOf(L).tex()}` : `= ${m.tex()}`} \\;\\Rightarrow\\; ${slopeTex(par_)}`, op: Pw.parallel, color: C.green });
  if (m !== null && mPerp !== null) {
    const raw = `-\\frac{1}{${m.tex()}}`;
    rows.push({ tex: `m_\\perp = ${raw}${raw === mPerp.tex() ? "" : ` = ${mPerp.tex()}`}`, op: Pw.perpGrad });
  }
  rows.push({ tex: slopeTex(perp), op: Pw.perpLine, color: C.orange });
  const Fp = meet(L, perp)!;
  const Fpt: Pt = { ...Fp, name: "F" };
  rows.push({ tex: `F = ${ptTex(Fpt, false)}`, op: Pw.foot });
  // |ax₀ + by₀ + c| / √(a² + b²)
  const I = integral(L);
  const top = I.a.mul(P.x).add(I.b.mul(P.y)).add(I.c);
  const den2 = sq(I.a).add(sq(I.b));
  const d = sqrtF(sq(top).div(den2));
  if (top.isZero()) caps.push({ text: Pw.onLine, color: C.green });
  else
    rows.push({
      tex: `d = \\frac{\\left|${I.a.tex()} \\cdot ${par(P.x)} ${signed(I.b)} \\cdot ${par(P.y)} ${signed(I.c)}\\right|}{\\sqrt{${par(I.a)}^2 + ${par(I.b)}^2}} = \\frac{${top.abs().tex()}}{\\sqrt{${den2.tex()}}} = ${rootResult(d)}`,
      op: Pw.dist,
      color: C.red,
    });
  if (!top.isZero()) caps.push({ text: fill(Pw.summary, { p: ptPlain(P), f: ptPlain(Fpt), d: rootPlain(d) }), color: "#495057" });
  return finish(header, rows, (y) => {
    const [pp, ff] = [ptNum(P), ptNum(Fpt)];
    const fr = plane("cg-perp", [pp, ff, ...(vertical(L) ? [] : [[0, intercept(L).toNumber()] as [number, number]])], y);
    const parts = [axes(fr), lineSvg(fr, L, C.blue), lineSvg(fr, par_, C.green, `stroke-dasharray="8 5"`), lineSvg(fr, perp, C.orange)];
    if (!top.isZero()) {
      const along: [number, number] = vertical(L) ? [0, 1] : [1, slope(L).toNumber()];
      parts.push(segSvg(fr, pp, ff, C.red, `stroke-width="3.2"`), rightMark(fr, ff, along, [pp[0] - ff[0], pp[1] - ff[1]]));
      parts.push(lbl((fr.sx(pp[0]) + fr.sx(ff[0])) / 2 + 8, (fr.sy(pp[1]) + fr.sy(ff[1])) / 2, `d = ${rootPlain(d)}`, C.red, "start", 13, false));
    }
    parts.push(ptSvg(fr, pp, ptPlain(P), C.ink), ptSvg(fr, ff, ptPlain(Fpt), C.red, 8, 18));
    parts.push(lbl(fr.right - 8, fr.top + 18, slopePlain(L), C.blue, "end", 13, false), lbl(fr.right - 8, fr.top + 36, slopePlain(par_), C.green, "end", 13, false), lbl(fr.right - 8, fr.top + 54, slopePlain(perp), C.orange, "end", 13, false));
    return { svg: parts.join(""), h: frameH(fr, y) };
  }, caps);
}

// ---------- two lines ----------

function renderMeet(items: Item[], w: CoordWords): RenderedSvg {
  const Mw = w.meet;
  const eqs = items.filter((it): it is Extract<Item, { k: "eq" }> => it.k === "eq");
  if (eqs.length < 2) throw new Error(w.needTwoLines);
  const [e1, e2] = eqs;
  const [L1, L2] = [asLine(e1), asLine(e2)];
  const header = `${e1.src.replace(/\*/g, " \\cdot ")}, \\quad ${e2.src.replace(/\*/g, " \\cdot ")}`;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const std = (L: Line) => {
    const I = integral(L);
    return { a: I.a, b: I.b, d: I.c.neg() };
  };
  const stdTex = (s: { a: Frac; b: Frac; d: Frac }) => `${sum([[s.a, "x"], [s.b, "y"]])} = ${s.d.tex()}`;
  const P = meet(L1, L2);
  if (!P) {
    const same = onLine(L2, { x: vertical(L1) ? xOf(L1) : ZERO, y: vertical(L1) ? ZERO : intercept(L1) });
    rows.push({ tex: vertical(L1) ? `${slopeTex(L1)}, \\quad ${slopeTex(L2)}` : `m_1 = m_2 = ${slope(L1).tex()}`, op: Mw.parallel, color: same ? C.green : C.red });
    caps.push({ text: same ? Mw.same : Mw.parallel, color: same ? C.green : C.red });
  } else {
    const ySub = e1.lhsY ? 0 : e2.lhsY ? 1 : -1;
    if (ySub >= 0 || vertical(L1) || vertical(L2)) {
      // Substitution: put y = mx + k (or x = h) into the other equation.
      const [S, O] = ySub === 1 || (ySub < 0 && vertical(L2)) ? [L2, L1] : [L1, L2];
      const o = std(O);
      if (vertical(S)) {
        const h = xOf(S);
        const yPart = `${o.b.isNeg() ? "-" : "+"} ${o.b.abs().isOne() ? "" : o.b.abs().tex()}y`;
        rows.push({ tex: `${o.a.isZero() ? term(o.b, "y", true) : `${o.a.tex()} \\cdot ${par(h)} ${yPart}`} = ${o.d.tex()}`, op: fill(Mw.sub, { v: "x" }) });
      } else {
        const [m, k] = [slope(S), intercept(S)];
        rows.push({ tex: `(1)\\; ${slopeTex(S)}, \\quad (2)\\; ${stdTex(o)}`, op: Mw.standard });
        const inner = `\\left(${sum([[m, "x"], [k, ""]])}\\right)`;
        rows.push({ tex: `${sum([[o.a, "x"], [o.b, inner]])} = ${o.d.tex()}`, op: fill(Mw.sub, { v: "y" }) });
        const cx = o.a.add(o.b.mul(m));
        const rhs = o.d.sub(o.b.mul(k));
        if (!cx.isOne()) rows.push({ tex: `${term(cx, "x", true)} = ${rhs.tex()}`, op: Mw.collect });
      }
      rows.push({ tex: `x = ${P.x.tex()}`, color: C.green });
      if (vertical(S)) rows.push({ tex: `y = ${P.y.tex()}`, op: Mw.back, color: C.green });
      else rows.push({ tex: `y = ${slope(S).isZero() ? intercept(S).tex() : `${slope(S).isOne() ? "" : `${slope(S).tex()} \\cdot `}${par(P.x)} ${signed(intercept(S))}`} = ${P.y.tex()}`, op: Mw.back, color: C.green });
    } else {
      // Elimination: make the y-coefficients equal and subtract.
      const s1 = std(L1);
      const s2 = std(L2);
      rows.push({ tex: `(1)\\; ${stdTex(s1)}, \\quad (2)\\; ${stdTex(s2)}`, op: Mw.standard });
      const lcm = (Math.abs(s1.b.n) / gcd(s1.b.n, s2.b.n)) * Math.abs(s2.b.n);
      const k1 = F(lcm).div(s1.b);
      const k2 = F(lcm).div(s2.b);
      const t1 = { a: s1.a.mul(k1), b: s1.b.mul(k1), d: s1.d.mul(k1) };
      const t2 = { a: s2.a.mul(k2), b: s2.b.mul(k2), d: s2.d.mul(k2) };
      const tag = (n: number, k: Frac) => (k.isOne() ? `(${n})` : `(${n}) \\times ${par(k)}`);
      rows.push({ tex: `${tag(1, k1)}:\\; ${stdTex(t1)}, \\quad ${tag(2, k2)}:\\; ${stdTex(t2)}`, op: Mw.scale });
      const ax = t1.a.sub(t2.a);
      const dd = t1.d.sub(t2.d);
      rows.push({ tex: `${term(ax, "x", true)} = ${dd.tex()}`, op: Mw.subtract });
      rows.push({ tex: `x = ${P.x.tex()}`, color: C.green });
      const back = s1.d.sub(s1.a.mul(P.x));
      rows.push({ tex: `${term(s1.b, "y", true)} = ${s1.d.tex()} ${signed(s1.a.mul(P.x).neg())} = ${back.tex()} \\;\\Rightarrow\\; y = ${P.y.tex()}`, op: Mw.back, color: C.green });
    }
    caps.push({ text: fill(Mw.meetAt, { p: ptPlain(P) }), color: C.green });
  }
  return finish(header, rows, (y) => {
    const marks: [number, number][] = P ? [ptNum(P)] : [];
    for (const L of [L1, L2]) marks.push(vertical(L) ? [xOf(L).toNumber(), 0] : [0, intercept(L).toNumber()]);
    const fr = plane("cg-meet", marks, y);
    const parts = [axes(fr), lineSvg(fr, L1, C.blue), lineSvg(fr, L2, C.orange)];
    if (P) parts.push(ptSvg(fr, ptNum(P), ptPlain(P), C.green, 9, -9));
    parts.push(lbl(fr.right - 8, fr.top + 18, slopePlain(L1), C.blue, "end", 13, false), lbl(fr.right - 8, fr.top + 36, slopePlain(L2), C.orange, "end", 13, false));
    return { svg: parts.join(""), h: frameH(fr, y) };
  }, caps);
}

// ---------- circles ----------

/** p ± q√s in LaTeX. */
function pmTex(p: Frac, q: Frac, s: number, sign: 1 | -1): string {
  if (q.isZero() || s === 0) return p.tex();
  if (s === 1) return p.add(q.mul(F(sign))).tex();
  const qq = q.mul(F(sign));
  const root = rootTex({ out: qq.abs(), inner: s });
  return p.isZero() ? `${qq.isNeg() ? "-" : ""}${root}` : `${p.tex()} ${qq.isNeg() ? "-" : "+"} ${root}`;
}
const pmNum = (p: Frac, q: Frac, s: number, sign: 1 | -1) => p.toNumber() + sign * q.toNumber() * Math.sqrt(s);
/** (x − a)² with a = 0 written as x². */
const sqTex = (v: string, a: Frac) => (a.isZero() ? `${v}^2` : `\\left(${v} ${signed(a.neg())}\\right)^2`);

function renderCircle(items: Item[], w: CoordWords): RenderedSvg {
  const Cw = w.circle;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  let a: Frac;
  let b: Frac;
  let r2v: Frac;
  let header: string;
  let rest: Item[];
  const eqCircle = items.find((it): it is Extract<Item, { k: "eq" }> => it.k === "eq" && pdeg(it.poly) === 2);
  if (eqCircle) {
    const p = eqCircle.poly;
    const k = pget(p, 2, 0);
    if (k.isZero() || !eqF(k, pget(p, 0, 2)) || !pget(p, 1, 1).isZero()) throw new Error(w.notCircle);
    const [D, E, F0] = [pget(p, 1, 0).div(k), pget(p, 0, 1).div(k), pget(p, 0, 0).div(k)];
    a = D.div(F(-2));
    b = E.div(F(-2));
    r2v = sq(a).add(sq(b)).sub(F0);
    header = eqCircle.src.replace(/\*/g, " \\cdot ");
    if ((/\(\s*[xy]\s*[-+]/.test(eqCircle.src) && k.isOne()) || (D.isZero() && E.isZero() && k.isOne())) {
      rows.push({ tex: `${sqTex("x", a)} + ${sqTex("y", b)} = ${r2v.tex()}`, op: Cw.readOff });
    } else {
      if (!k.isOne()) rows.push({ tex: `${sum([[ONE, "x^2"], [ONE, "y^2"], [D, "x"], [E, "y"], [F0, ""]])} = 0`, op: fill(Cw.divide, { k: plain(k) }) });
      const grp = (v: string, c: Frac) => (c.isZero() ? `${v}^2` : `\\left(${v}^2 ${signed(c)}${v}\\right)`);
      rows.push({ tex: `${grp("x", D)} + ${grp("y", E)} = ${F0.neg().tex()}`, op: Cw.group });
      const half = (v: string, c: Frac) => (c.isZero() ? `${v}^2` : `\\left(${v} ${signed(c.div(F(2)))}\\right)^2 - ${par(c.div(F(2)))}^2`);
      if (!D.isZero() || !E.isZero()) rows.push({ tex: `${half("x", D)} + ${half("y", E)} = ${F0.neg().tex()}`, op: Cw.complete });
      rows.push({ tex: `${sqTex("x", a)} + ${sqTex("y", b)} = ${r2v.tex()}` });
    }
    rest = items.filter((it) => it !== eqCircle);
  } else {
    const pts = items.filter((it): it is Extract<Item, { k: "pt" }> => it.k === "pt");
    const centre = pts.find((p) => p.centre) ?? pts[0];
    if (!centre) throw new Error(w.needCircle);
    [a, b] = [centre.p.x, centre.p.y];
    const rItem = items.find((it): it is Extract<Item, { k: "param" }> => it.k === "param" && it.name === "r");
    const others = pts.filter((p) => p !== centre);
    header = `${ptTex({ ...centre.p, name: undefined })}`;
    if (rItem) {
      r2v = sq(rItem.v);
      header += `, \\; r = ${rItem.v.tex()}`;
      rest = items.filter((it) => it !== centre && it !== rItem);
    } else if (others.length) {
      const on = others[0].p;
      r2v = dist2(centre.p, on);
      header += `, \\; ${ptTex(on)}`;
      rows.push({ tex: `r^2 = ${par(on.x.sub(a))}^2 + ${par(on.y.sub(b))}^2 = ${r2v.tex()}`, op: fill(Cw.radiusFrom, { p: ptPlain(on) }) });
      rest = items.filter((it) => it !== centre && it !== others[0]);
    } else throw new Error(w.needCircle);
    rows.push({ tex: `${sqTex("x", a)} + ${sqTex("y", b)} = ${r2v.tex()}` });
    rows.push({ tex: `${sum([[ONE, "x^2"], [ONE, "y^2"], [a.mul(F(-2)), "x"], [b.mul(F(-2)), "y"], [sq(a).add(sq(b)).sub(r2v), ""]])} = 0`, op: Cw.expand });
  }
  const O: Pt = { x: a, y: b, name: "O" };
  if (!r2v.isNeg() && !r2v.isZero()) {
    const r = sqrtF(r2v);
    rows.push({ tex: `O = ${ptTex(O, false)}, \\quad r = ${r.inner === 1 ? r.out.tex() : `\\sqrt{${r2v.tex()}} = ${rootResult(r)}`}`, op: Cw.centreRow, color: C.green });
  } else {
    caps.push({ text: r2v.isZero() ? fill(Cw.point, { p: ptPlain(O) }) : Cw.empty, color: C.red });
    return finish(header, rows, (y) => {
      const fr = plane("cg-circ", [ptNum(O)], y);
      return { svg: axes(fr) + ptSvg(fr, ptNum(O), ptPlain(O), C.red), h: frameH(fr, y) };
    }, caps);
  }
  const r = sqrtF(r2v);
  const rNum = rootNum(r);

  // A point: inside, on or outside — and the tangent there when it is on the circle.
  const extraPt = rest.find((it): it is Extract<Item, { k: "pt" }> => it.k === "pt")?.p;
  const extraLine = rest.find((it): it is Extract<Item, { k: "eq" }> => it.k === "eq");
  let tangent: Line | null = null;
  let Q: Pt | null = null;
  if (extraPt) {
    Q = { ...extraPt, name: extraPt.name ?? "Q" };
    const v = dist2(O, Q);
    const cmp = v.sub(r2v);
    const rel = cmp.isZero() ? "=" : cmp.isNeg() ? "<" : ">";
    rows.push({ tex: `${par(Q.x.sub(a))}^2 + ${par(Q.y.sub(b))}^2 = ${v.tex()} \\;${rel}\\; r^2 = ${r2v.tex()}`, op: fill(rel === "=" ? Cw.on : rel === "<" ? Cw.inside : Cw.outside, { p: ptPlain(Q) }), color: rel === "=" ? C.green : C.orange });
    if (rel === "=") {
      const dx = Q.x.sub(a);
      const dy = Q.y.sub(b);
      const mt = dy.isZero() ? null : dx.neg().div(dy);
      if (!dx.isZero() && !dy.isZero()) rows.push({ tex: `m_{OQ} = \\frac{${dy.tex()}}{${dx.tex()}}${dx.isOne() ? "" : ` = ${dy.div(dx).tex()}`}, \\quad m_t = ${mt!.tex()}`, op: Cw.radiusGrad });
      tangent = lineGrad(Q, mt);
      rows.push({ tex: slopeTex(tangent), op: Cw.tangent, color: C.orange });
    }
  }
  // A line: substitute it and look at the discriminant.
  const hits: [number, number][] = [];
  let line: Line | null = null;
  if (extraLine) {
    line = asLine(extraLine);
    const vert = vertical(line);
    // Along x (or along y for a vertical line): A t² + B t + C = 0.
    let A: Frac, B: Frac, Cc: Frac;
    if (vert) {
      const h = xOf(line);
      rows.push({ tex: `${sqTex(h.tex(), a).replace(`\\left(${h.tex()} `, `\\left(${h.tex()} `)} + ${sqTex("y", b)} = ${r2v.tex()}`, op: fill(Cw.substitute, { v: "x" }) });
      [A, B, Cc] = [ONE, b.mul(F(-2)), sq(b).add(sq(h.sub(a))).sub(r2v)];
    } else {
      const m = slope(line);
      const k = intercept(line);
      rows.push({ tex: `${sqTex("x", a)} + \\left(${sum([[m, "x"], [k.sub(b), ""]])}\\right)^2 = ${r2v.tex()}`, op: fill(Cw.substitute, { v: "y" }) });
      [A, B, Cc] = [ONE.add(sq(m)), a.mul(F(-2)).add(F(2).mul(m).mul(k.sub(b))), sq(a).add(sq(k.sub(b))).sub(r2v)];
    }
    const t = vert ? "y" : "x";
    rows.push({ tex: `${sum([[A, `${t}^2`], [B, t], [Cc, ""]])} = 0` });
    const disc = sq(B).sub(F(4).mul(A).mul(Cc));
    const n = disc.isZero() ? 1 : disc.isNeg() ? 0 : 2;
    rows.push({ tex: `\\Delta = ${par(B)}^2 - 4 \\cdot ${par(A)} \\cdot ${par(Cc)} = ${disc.tex()} ${n === 2 ? ">" : n === 1 ? "=" : "<"} 0`, op: n === 2 ? Cw.two : n === 1 ? Cw.one : Cw.none, color: n ? C.green : C.red });
    if (n) {
      const p = B.neg().div(A.mul(F(2)));
      const rt = n === 2 ? sqrtF(disc) : { out: ZERO, inner: 1 };
      const qv = rt.out.div(A.mul(F(2)));
      const pts: string[] = [];
      for (const sgn of n === 2 ? ([-1, 1] as const) : ([1] as const)) {
        const tv = pmTex(p, qv, rt.inner, sgn);
        const tn = pmNum(p, qv, rt.inner, sgn);
        if (vert) {
          pts.push(`\\left(${xOf(line).tex()}, ${tv}\\right)`);
          hits.push([xOf(line).toNumber(), tn]);
        } else {
          const m = slope(line);
          const k = intercept(line);
          // y = m·t + k = (m·p + k) ± m·q√s
          const yv = pmTex(m.mul(p).add(k), m.mul(qv), rt.inner, sgn);
          pts.push(`\\left(${tv}, ${yv}\\right)`);
          hits.push([tn, m.toNumber() * tn + k.toNumber()]);
        }
      }
      rows.push({ tex: pts.join(", \\quad "), color: C.green });
    }
  }
  caps.push({ text: fill(Cw.centre, { o: ptPlain(O), r: rootPlain(r) }), color: "#495057" });
  return finish(header, rows, (y) => {
    const marks: [number, number][] = [
      [a.toNumber() - rNum, b.toNumber() - rNum],
      [a.toNumber() + rNum, b.toNumber() + rNum],
    ];
    if (Q) marks.push(ptNum(Q));
    const fr = plane("cg-circ", marks, y, 400);
    const o = ptNum(O);
    const R = fr.sx(rNum) - fr.sx(0);
    const parts = [axes(fr), `<circle cx="${r2(fr.sx(o[0]))}" cy="${r2(fr.sy(o[1]))}" r="${r2(R)}" fill="#e7f5ff" fill-opacity="0.5" stroke="${C.blue}" stroke-width="2.4"/>`];
    const rimTo: [number, number] = Q && tangent ? ptNum(Q) : [o[0] + rNum * Math.cos(0.6), o[1] + rNum * Math.sin(0.6)];
    parts.push(segSvg(fr, o, rimTo, C.purple, `stroke-dasharray="6 4"`), lbl((fr.sx(o[0]) + fr.sx(rimTo[0])) / 2 + 6, (fr.sy(o[1]) + fr.sy(rimTo[1])) / 2 - 6, `r = ${rootPlain(r)}`, C.purple, "start", 13, false));
    if (tangent && Q) parts.push(lineSvg(fr, tangent, C.orange), rightMark(fr, ptNum(Q), [o[0] - ptNum(Q)[0], o[1] - ptNum(Q)[1]], vertical(tangent) ? [0, 1] : [1, slope(tangent).toNumber()]));
    if (line) parts.push(lineSvg(fr, line, C.orange));
    for (const h of hits) parts.push(dot(fr.sx(h[0]), fr.sy(h[1]), C.green, 5.5));
    parts.push(ptSvg(fr, o, ptPlain(O), C.red, 8, 16));
    if (Q) parts.push(ptSvg(fr, ptNum(Q), ptPlain(Q), tangent ? C.green : C.orange));
    if (line) parts.push(lbl(fr.right - 8, fr.top + 18, slopePlain(line), C.orange, "end", 13, false));
    return { svg: parts.join(""), h: frameH(fr, y) };
  }, caps);
}

// ---------- polygons ----------

function renderPolygon(items: Item[], w: CoordWords): RenderedSvg {
  const Pw = w.poly;
  const ps = named(items.flatMap((it) => (it.k === "pt" ? [it.p] : [])));
  if (ps.length < 3) throw new Error(Pw.needShape);
  if (ps.length > 8) throw new Error(w.tooBig);
  // Sides that cross (a bow-tie) make the shoelace meaningless: the corners must go round in order.
  const cross = (o: Pt, a: Pt, b: Pt) => Math.sign(a.x.sub(o.x).mul(b.y.sub(o.y)).sub(a.y.sub(o.y).mul(b.x.sub(o.x))).toNumber());
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 2; j < ps.length; j++) {
      if (i === 0 && j === ps.length - 1) continue;
      const [a1, a2, b1, b2] = [ps[i], ps[(i + 1) % ps.length], ps[j], ps[(j + 1) % ps.length]];
      if (cross(a1, a2, b1) * cross(a1, a2, b2) < 0 && cross(b1, b2, a1) * cross(b1, b2, a2) < 0) throw new Error(Pw.crossing);
    }
  const n = ps.length;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const side = (i: number) => {
    const [p, q] = [ps[i], ps[(i + 1) % n]];
    const dx = q.x.sub(p.x);
    const dy = q.y.sub(p.y);
    return { name: `${p.name}${q.name}`, dx, dy, d2: sq(dx).add(sq(dy)), len: sqrtF(sq(dx).add(sq(dy))) };
  };
  const sides = ps.map((_, i) => side(i));
  sides.forEach((s, i) => {
    // A vertical side has no gradient, so none is written.
    const m = s.dx.isZero() ? "" : `, \\quad m_{${s.name}} = ${s.dy.div(s.dx).tex()}`;
    rows.push({ tex: `${s.name} = \\sqrt{${par(s.dx)}^2 + ${par(s.dy)}^2} = ${s.len.inner === 1 ? s.len.out.tex() : rootTex(s.len)}${m}`, op: i === 0 ? Pw.side : undefined });
  });
  // Facts: parallel opposite sides, right angles, equal sides.
  const parallel: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) if (!(i === 0 && j === n - 1) && sides[i].dx.mul(sides[j].dy).sub(sides[i].dy.mul(sides[j].dx)).isZero()) parallel.push([i, j]);
  const rightAt: number[] = [];
  for (let i = 0; i < n; i++) {
    const [s1, s2] = [sides[(i - 1 + n) % n], sides[i]];
    if (s1.dx.mul(s2.dx).add(s1.dy.mul(s2.dy)).isZero()) rightAt.push(i);
  }
  const groups = new Map<string, number[]>();
  sides.forEach((s, i) => groups.set(s.d2.tex(), [...(groups.get(s.d2.tex()) ?? []), i]));
  const equal = [...groups.values()].filter((g) => g.length > 1);
  if (parallel.length) rows.push({ tex: parallel.map(([i, j]) => `${sides[i].name} \\parallel ${sides[j].name}`).join(", \\; "), op: Pw.parallel, color: C.blue });
  if (rightAt.length) rows.push({ tex: rightAt.map((i) => `${sides[(i - 1 + n) % n].name} \\perp ${sides[i].name}`).join(", \\; "), op: Pw.perp, color: C.purple });
  if (equal.length) rows.push({ tex: equal.map((g) => g.map((i) => sides[i].name).join(" = ")).join(", \\; "), op: Pw.equal, color: C.orange });
  // Shoelace.
  const terms = ps.map((p, i) => {
    const q = ps[(i + 1) % n];
    return { tex: `${par(p.x)} \\cdot ${par(q.y)} - ${par(q.x)} \\cdot ${par(p.y)}`, v: p.x.mul(q.y).sub(q.x.mul(p.y)) };
  });
  const total = terms.reduce((acc, t) => acc.add(t.v), ZERO);
  const area = total.abs().div(F(2));
  rows.push({ tex: `S = \\frac{1}{2}\\left|${terms.map((t) => `(${t.tex})`).join(" + ")}\\right|`, op: Pw.shoelace });
  rows.push({ tex: `= \\frac{1}{2}\\left|${terms.map((t, i) => (i === 0 ? t.v.tex() : signed(t.v))).join(" ")}\\right| = ${area.tex()}`, op: Pw.area, color: C.green });
  // The name.
  let name = "";
  if (area.isZero()) caps.push({ text: Pw.degenerate, color: C.red });
  else if (n === 3) {
    const [s1, s2, s3] = sides.map((s) => s.d2).sort((x, y) => x.toNumber() - y.toNumber());
    const big = s1.add(s2).sub(s3);
    const N = Pw.names;
    const angle = big.isZero() ? N.right : big.isNeg() ? N.obtuse : N.acute;
    const kinds = eqF(s1, s3) ? N.equilateral : eqF(s1, s2) || eqF(s2, s3) ? N.isosceles : N.scalene;
    name = `${angle} ${kinds} ${N.triangle}`;
  } else if (n === 4) {
    const N = Pw.names;
    const pairs = parallel.length;
    const allEqual = equal.some((g) => g.length === 4);
    const kite = (eqF(sides[0].d2, sides[1].d2) && eqF(sides[2].d2, sides[3].d2)) || (eqF(sides[1].d2, sides[2].d2) && eqF(sides[3].d2, sides[0].d2));
    name =
      pairs === 2 ? (rightAt.length && allEqual ? N.square : rightAt.length ? N.rectangle : allEqual ? N.rhombus : N.parallelogram)
      : pairs === 1 ? N.trapezium
      : kite ? N.kite
      : N.quadrilateral;
  } else name = fill(Pw.polygon, { n });
  if (name) caps.unshift({ text: name.charAt(0).toUpperCase() + name.slice(1), color: C.blue });
  caps.push({ text: fill(Pw.areaIs, { s: area.tex().includes("frac") ? `${plain(area)} = ${approx(area.toNumber())}` : plain(area) }), color: C.green });
  const header = ps.map((p) => ptTex(p)).join(", \\; ");
  return finish(header, rows, (y) => {
    const pts = ps.map(ptNum);
    const fr = plane("cg-poly", pts, y, 340);
    const path = pts.map((p, i) => `${i ? "L" : "M"}${r2(fr.sx(p[0]))},${r2(fr.sy(p[1]))}`).join(" ") + " Z";
    const parts = [axes(fr), `<path d="${path}" fill="#e7f5ff" fill-opacity="0.7" stroke="${C.blue}" stroke-width="2.4" stroke-linejoin="round"/>`];
    const cx = pts.reduce((acc, p) => acc + p[0], 0) / n;
    const cy = pts.reduce((acc, p) => acc + p[1], 0) / n;
    // Parallel sides get the same number of arrow ticks; right angles their square.
    parallel.forEach(([i, j], k) => {
      for (const s of [i, j]) {
        const [p, q] = [pts[s], pts[(s + 1) % n]];
        const [mx, my] = [(fr.sx(p[0]) + fr.sx(q[0])) / 2, (fr.sy(p[1]) + fr.sy(q[1])) / 2];
        // Both arrows of a pair point the same way.
        const flip = s === j && sides[i].dx.mul(sides[j].dx).add(sides[i].dy.mul(sides[j].dy)).isNeg() ? Math.PI : 0;
        const ang = Math.atan2(fr.sy(q[1]) - fr.sy(p[1]), fr.sx(q[0]) - fr.sx(p[0])) + flip;
        for (let t = 0; t <= k; t++) {
          const off = (t - k / 2) * 10;
          const [ax, ay] = [mx + Math.cos(ang) * off, my + Math.sin(ang) * off];
          parts.push(`<path d="M${r2(ax - Math.cos(ang - 0.6) * 7)},${r2(ay - Math.sin(ang - 0.6) * 7)} L${r2(ax)},${r2(ay)} L${r2(ax - Math.cos(ang + 0.6) * 7)},${r2(ay - Math.sin(ang + 0.6) * 7)}" fill="none" stroke="${C.blue}" stroke-width="1.8"/>`);
        }
      }
    });
    for (const i of rightAt) {
      const [p, a1, b1] = [pts[i], pts[(i - 1 + n) % n], pts[(i + 1) % n]];
      parts.push(rightMark(fr, p, [a1[0] - p[0], a1[1] - p[1]], [b1[0] - p[0], b1[1] - p[1]], C.purple));
    }
    sides.forEach((s, i) => {
      const [p, q] = [pts[i], pts[(i + 1) % n]];
      const [mx, my] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      // Push the label away from the middle of the shape.
      const [ox, oy] = [mx - cx, my - cy];
      const len = Math.hypot(ox, oy) || 1;
      parts.push(lbl(fr.sx(mx) + (ox / len) * 16, fr.sy(my) - (oy / len) * 16 + 4, rootPlain(s.len), C.ink, "middle", 12, false));
    });
    ps.forEach((p, i) => {
      const [ox, oy] = [pts[i][0] - cx, pts[i][1] - cy];
      const len = Math.hypot(ox, oy) || 1;
      parts.push(dot(fr.sx(pts[i][0]), fr.sy(pts[i][1]), C.blue, 4.5), lbl(fr.sx(pts[i][0]) + (ox / len) * 16, fr.sy(pts[i][1]) - (oy / len) * 16 + 4, ptPlain(p), C.blue, "middle", 12.5, false));
    });
    let h = frameH(fr, y);
    // The shoelace itself: the coordinates in two columns, first point again at the bottom.
    const top = fr.bottom + 34;
    const [xc, yc] = [W / 2 - 150, W / 2 - 90];
    parts.push(text(xc, top - 8, "x", { anchor: "middle", bold: true, color: "#495057" }), text(yc, top - 8, "y", { anchor: "middle", bold: true, color: "#495057" }));
    for (let i = 0; i <= n; i++) {
      const p = ps[i % n];
      const yy = top + 12 + i * 24;
      parts.push(
        text(xc - 40, yy + 4, p.name ?? "", { anchor: "end", color: C.blue, bold: true }),
        text(xc, yy + 4, plain(p.x), { anchor: "middle" }),
        text(yc, yy + 4, plain(p.y), { anchor: "middle" }),
      );
      if (i < n) {
        parts.push(
          `<line x1="${xc + 10}" y1="${yy + 2}" x2="${yc - 10}" y2="${yy + 20}" stroke="${C.blue}" stroke-width="1.4"/>`,
          `<line x1="${yc - 10}" y1="${yy + 2}" x2="${xc + 10}" y2="${yy + 20}" stroke="${C.red}" stroke-width="1.4"/>`,
          text(yc + 40, yy + 16, `${pp(p.x)}·${pp(ps[(i + 1) % n].y)} − ${pp(ps[(i + 1) % n].x)}·${pp(p.y)} = ${plain(terms[i].v)}`, { color: "#495057", size: 12.5 }),
        );
      }
    }
    h += 34 + (n + 1) * 24 + 4;
    return { svg: parts.join(""), h };
  }, caps);
}

// ---------- entry ----------

export function renderCoord(spec: CoordSpec, w: CoordWords): RenderedSvg {
  words = w;
  const items = parseItems(spec.src);
  switch (spec.topic) {
    case "points":
      return renderPoints(items, w);
    case "line":
      return renderLine(items, w);
    case "perp":
      return renderPerp(items, w);
    case "meet":
      return renderMeet(items, w);
    case "circle":
      return renderCircle(items, w);
    case "polygon":
      return renderPolygon(items, w);
  }
}

const P = (topic: CoordTopic, src: string): CoordSpec => ({ topic, src });
export const COORD_PRESETS: { [K in CoordTopic]: { label: string; spec: CoordSpec }[] } = {
  points: [
    { label: "A(1, 2), B(7, 10)", spec: P("points", "A(1, 2), B(7, 10)") },
    { label: "P(−3, 4), Q(5, −2)", spec: P("points", "P(-3, 4), Q(5, -2)") },
    { label: "A(1, 1), B(4, 3) · √13", spec: P("points", "A(1, 1), B(4, 3)") },
    { label: "A(2, 1), B(8, 10), 1 : 2", spec: P("points", "A(2, 1), B(8, 10), 1:2") },
    { label: "A(−2, 3), B(−2, −1)", spec: P("points", "A(-2, 3), B(-2, -1)") },
  ],
  line: [
    { label: "2x + 3y = 6", spec: P("line", "2x + 3y = 6") },
    { label: "y = 3x − 2", spec: P("line", "y = 3x - 2") },
    { label: "(1, 2), (3, 8)", spec: P("line", "(1, 2), (3, 8)") },
    { label: "(2, −1), m = −1/2", spec: P("line", "(2, -1), m = -1/2") },
    { label: "m = 2/3, c = 1", spec: P("line", "m = 2/3, c = 1") },
    { label: "y − 2 = 3(x − 1)", spec: P("line", "y - 2 = 3(x - 1)") },
    { label: "x = 4", spec: P("line", "x = 4") },
  ],
  perp: [
    { label: "y = 2x + 1; P(3, −1)", spec: P("perp", "y = 2x + 1; P(3, -1)") },
    { label: "3x + 4y = 12; P(5, 4)", spec: P("perp", "3x + 4y = 12; P(5, 4)") },
    { label: "x − 2y + 4 = 0; P(1, 5)", spec: P("perp", "x - 2y + 4 = 0; P(1, 5)") },
    { label: "y = 4; P(2, 1)", spec: P("perp", "y = 4; P(2, 1)") },
  ],
  meet: [
    { label: "y = 2x − 1; x + y = 5", spec: P("meet", "y = 2x - 1; x + y = 5") },
    { label: "3x + 2y = 16; 5x − 3y = 5", spec: P("meet", "3x + 2y = 16; 5x - 3y = 5") },
    { label: "2x + 3y = 7; 3x − 4y = 2", spec: P("meet", "2x + 3y = 7; 3x - 4y = 2") },
    { label: "x = 3; y = −x + 1", spec: P("meet", "x = 3; y = -x + 1") },
    { label: "y = 2x + 1; y = 2x − 3", spec: P("meet", "y = 2x + 1; y = 2x - 3") },
    { label: "2x − y = 1; 4x − 2y = 2", spec: P("meet", "2x - y = 1; 4x - 2y = 2") },
  ],
  circle: [
    { label: "x² + y² − 4x + 6y − 12 = 0", spec: P("circle", "x^2 + y^2 - 4x + 6y - 12 = 0") },
    { label: "(x − 1)² + (y + 2)² = 9", spec: P("circle", "(x - 1)^2 + (y + 2)^2 = 9") },
    { label: "centre (2, −1), r = 3", spec: P("circle", "centre (2, -1), r = 3") },
    { label: "centre (1, 2), (4, 6)", spec: P("circle", "centre (1, 2), (4, 6)") },
    { label: "x² + y² = 25; Q(3, 4) · tangent", spec: P("circle", "x^2 + y^2 = 25; Q(3, 4)") },
    { label: "x² + y² = 25; y = x + 1", spec: P("circle", "x^2 + y^2 = 25; y = x + 1") },
    { label: "(x − 2)² + y² = 4; y = x", spec: P("circle", "(x - 2)^2 + y^2 = 4; y = x") },
    { label: "x² + y² = 8; y = −x + 4", spec: P("circle", "x^2 + y^2 = 8; y = -x + 4") },
    { label: "2x² + 2y² − 8x + 4y − 8 = 0", spec: P("circle", "2x^2 + 2y^2 - 8x + 4y - 8 = 0") },
  ],
  polygon: [
    { label: "(0, 0), (4, 0), (4, 3)", spec: P("polygon", "A(0, 0), B(4, 0), C(4, 3)") },
    { label: "(1, 1), (5, 2), (4, 6), (0, 5)", spec: P("polygon", "A(1, 1), B(5, 2), C(4, 6), D(0, 5)") },
    { label: "(0, 0), (5, 0), (7, 3), (2, 3)", spec: P("polygon", "A(0, 0), B(5, 0), C(7, 3), D(2, 3)") },
    { label: "(0, 0), (6, 0), (4, 3), (1, 3)", spec: P("polygon", "A(0, 0), B(6, 0), C(4, 3), D(1, 3)") },
    { label: "(0, 0), (3, −2), (6, 0), (3, 5)", spec: P("polygon", "A(0, 0), B(3, -2), C(6, 0), D(3, 5)") },
    { label: "(−2, 1), (3, −1), (4, 4), (1, 6), (−2, 4)", spec: P("polygon", "A(-2, 1), B(3, -1), C(4, 4), D(1, 6), E(-2, 4)") },
  ],
};
