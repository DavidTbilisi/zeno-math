// Applied calculus: areas under and between curves (where they meet, which one is on top, exact values with surds),
// volumes of revolution (discs, washers, shells, with the solid drawn), motion along a line (s → v → a, when it is at
// rest, displacement against distance travelled), optimisation (the open box, the fence by the river, the can, the
// nearest point on a parabola) and related rates (the ladder, the balloon, the filling cone, the ripple).
// Polynomials are handled exactly, including surd limits; other functions by standard antiderivatives, checked
// against Simpson's rule.
import { axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, r2, simpson, texLines, W, yRange, type Caption, type Frame, type TexLine } from "./chart";
import { derive } from "./derive";
import {
  add, approx, coefOf, E_, evalE, exprMessages, F, fn, fromPoly, has, isNum, minus, mul, N, neg, parseE, pdeg, peval, pow, qs, qsAdd, qsNum,
  qsPlain, qsTex, realRoots, simp, sqrtSplit, sub, substitute, tex, toPoly, V, X, type E, type QS,
} from "./expr";
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";

export type AppTopic = "area" | "volume" | "motion" | "optimise" | "rates";
export const APP_TOPICS: AppTopic[] = ["area", "volume", "motion", "optimise", "rates"];
export type OptKind = "box" | "fence" | "can" | "distance";
export const OPT_KINDS: OptKind[] = ["box", "fence", "can", "distance"];
export type RateKind = "ladder" | "balloon" | "cone" | "ripple";
export const RATE_KINDS: RateKind[] = ["ladder", "balloon", "cone", "ripple"];
/** f, g: functions; a, b: limits or numbers; opt: the axis ("x" | "y"), the optimisation or the related-rates set-up. */
export type AppSpec = { topic: AppTopic; f: string; g: string; a: string; b: string; c: string; opt: string };

export type AppWords = {
  bad: string;
  tooBig: string;
  onlyX: string;
  needLimits: string;
  needNumber: string;
  noAntiderivative: string;
  simpsonNote: string;
  check: string;
  fields: { f: string; g: string; a: string; b: string; s: string; t0: string; t1: string; axisX: string; axisY: string };
  area: {
    diff: string;
    meet: string;
    roots: string;
    antiderivative: string;
    above: string;
    below: string;
    total: string;
    signed: string;
    none: string;
  };
  volume: { disc: string; washer: string; shell: string; square: string; antiderivative: string; evaluate: string; picture: string; pictureY: string };
  motion: {
    needTimes: string;
    velocity: string;
    acceleration: string;
    rest: string;
    noRest: string;
    positions: string;
    displacement: string;
    distance: string;
    summary: string;
    path: string;
  };
  opt: {
    kinds: Record<OptKind, string>;
    setup: Record<OptKind, string>;
    fields: Record<OptKind, string[]>;
    domain: string;
    derivative: string;
    solve: string;
    outside: string;
    second: string;
    max: string;
    min: string;
    answer: Record<OptKind, string>;
  };
  rates: {
    kinds: Record<RateKind, string>;
    setup: Record<RateKind, string>;
    fields: Record<RateKind, string[]>;
    relation: string;
    differentiate: string;
    know: string;
    substitute: string;
    answer: Record<RateKind, string>;
  };
};

let words: AppWords;
/** The number the last render arrived at (area, volume, distance, best x, rate), for the tests. */
let answer = NaN;
export const lastAnswer = () => answer;

// ---------- antiderivatives ----------

/** ∫ f dx for sums of standard pieces: polynomials, xⁿ, 1/x, (ax + b)ⁿ, e^(ax+b), k^(ax+b), sin, cos, sec² of ax + b. */
export function antiderivative(f0: E): E | null {
  const f = simp(f0);
  const p = toPoly(f);
  if (p) return fromPoly([F(0), ...p.map((c, k) => c.div(F(k + 1)))]);
  const out: E[] = [];
  for (const t of f.k === "add" ? f.ts : [f]) {
    const { c, rest } = coefOf(t);
    const one = piece(rest);
    if (!one) return null;
    out.push(mul(N(c), one));
  }
  return simp(add(...out));
}
function piece(g: E): E | null {
  const tp = toPoly(g);
  if (tp) return fromPoly([F(0), ...tp.map((c, k) => c.div(F(k + 1)))]);
  /** a when e is a·x + b. */
  const slope = (e: E): Frac | null => {
    const lp = toPoly(e);
    return lp && pdeg(lp) === 1 ? lp[1] : null;
  };
  if (g.k === "pow" && isNum(g.e)) {
    const n = g.e.v;
    const a = slope(g.b);
    if (a) {
      if (n.n === -1 && n.d === 1) return mul(N(F(1).div(a)), fn("ln", g.b));
      const n1 = n.add(F(1));
      return mul(N(F(1).div(a.mul(n1))), pow(g.b, N(n1)));
    }
    // sec²(ax + b) or 1/cos²(ax + b)
    if (g.b.k === "fn" && ((g.b.f === "sec" && n.n === 2 && n.d === 1) || (g.b.f === "cos" && n.n === -2 && n.d === 1))) {
      const s = slope(g.b.a);
      if (s) return mul(N(F(1).div(s)), fn("tan", g.b.a));
    }
    return null;
  }
  if (g.k === "pow" && !has(g.b)) {
    const a = slope(g.e);
    if (!a) return null;
    if (g.b.k === "e") return mul(N(F(1).div(a)), pow(E_, g.e));
    return mul(N(F(1).div(a)), pow(fn("ln", g.b), -1), g);
  }
  if (g.k === "fn") {
    const a = slope(g.a);
    if (!a) return null;
    const k = N(F(1).div(a));
    if (g.f === "sin") return mul(N(F(-1).div(a)), fn("cos", g.a));
    if (g.f === "cos") return mul(k, fn("sin", g.a));
    if (g.f === "sinh") return mul(k, fn("cosh", g.a));
    if (g.f === "cosh") return mul(k, fn("sinh", g.a));
  }
  return null;
}

// ---------- numbers for limits and answers ----------

/** A limit or a point: exact (rational or a + b√s) when possible, always with its value. */
type Pt = { q: QS | null; v: number; tex: string; plain: string; e?: E };
const ptOfQS = (r: QS): Pt => ({ q: r, v: qsNum(r), tex: qsTex(r), plain: qsPlain(r), e: r.b.isZero() ? N(r.a) : undefined });
/** A number, recognised as kπ/q when it is one (where sin x or cos x cross the axis). */
function ptOfNum(v: number): Pt {
  for (const q of [1, 2, 3, 4, 6]) {
    const k = Math.round((v * q) / Math.PI);
    if (k !== 0 && Math.abs(v - (k * Math.PI) / q) < 1e-9) {
      const c = F(k, q);
      const e = simp(mul(N(c), { k: "pi" }));
      const plain = `${c.isNeg() ? "−" : ""}${Math.abs(c.n) === 1 ? "" : Math.abs(c.n)}π${c.d === 1 ? "" : `/${c.d}`}`;
      return { q: null, v, tex: tex(e), plain, e };
    }
  }
  return { q: null, v, tex: approx(v).replace("−", "-"), plain: approx(v) };
}
function parsePt(src: string): Pt | null {
  if (!src.trim()) return null;
  const e = simp(parseE(src));
  if (has(e)) throw new Error(words.needNumber);
  if (isNum(e)) return ptOfQS(qs(e.v));
  const v = evalE(e, 0);
  if (!Number.isFinite(v)) throw new Error(words.needNumber);
  return { q: null, v, tex: tex(e), plain: approx(v), e };
}
/** b − a with surds, or null when the two surds differ. */
function qsSub(b: QS, a: QS): QS | null {
  if (a.s !== 1 && b.s !== 1 && a.s !== b.s) return null;
  return qsAdd(b, { a: a.a.neg(), b: a.b.neg(), s: a.s });
}
const qsAbs = (x: QS): QS => (qsNum(x) < 0 ? { a: x.a.neg(), b: x.b.neg(), s: x.s } : x);
const ax = (v: number) => approx(v).replace("−", "-");
/** "= 8√2/3 ≈ 3.771" or "≈ 3.771". */
const valueTex = (q: QS | null, v: number) => (q ? `${qsTex(q)}${q.b.isZero() && q.a.isInt() ? "" : ` \\approx ${ax(v)}`}` : `\\approx ${ax(v)}`);

/** Real zeros of h strictly between a and b: exact for polynomials, by bisection otherwise. */
function zerosBetween(h: E, hp: Frac[] | null, a: number, b: number): Pt[] {
  const inside = (v: number) => v > a + 1e-9 && v < b - 1e-9;
  if (hp) {
    const r = realRoots(hp);
    return [...r.exact.filter((q) => inside(qsNum(q))).map(ptOfQS), ...r.approx.filter(inside).map(ptOfNum)].sort((p, q) => p.v - q.v);
  }
  const out: Pt[] = [];
  const n = 2000;
  const push = (v: number) => {
    if (inside(v) && !out.some((p) => Math.abs(p.v - v) < 1e-7)) out.push(ptOfNum(v));
  };
  let [px, prev] = [a, evalE(h, a)];
  for (let i = 1; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const cur = evalE(h, x);
    if (Number.isFinite(cur) && Math.abs(cur) < 1e-12) push(x);
    else if (Number.isFinite(prev) && Number.isFinite(cur) && Math.abs(prev) >= 1e-12 && prev * cur < 0) {
      // Bisect from the stored points, keeping the sign of the left one.
      let [lo, hi] = [px, x];
      const left = Math.sign(prev);
      for (let k = 0; k < 100; k++) {
        const mid = (lo + hi) / 2;
        if (Math.sign(evalE(h, mid)) === left) lo = mid;
        else hi = mid;
      }
      push((lo + hi) / 2);
    }
    [px, prev] = [x, cur];
  }
  return out.sort((p, q) => p.v - q.v);
}

/** ∫ₚ^q h dx: exact for polynomials at exact limits, from the antiderivative otherwise, Simpson as the last resort. */
function definite(h: E, H: E | null, Hp: Frac[] | null, p: Pt, q: Pt): { q: QS | null; v: number; sym?: E } {
  if (Hp && p.q && q.q) {
    const d = qsSub(peval(Hp, q.q), peval(Hp, p.q));
    if (d) return { q: d, v: qsNum(d) };
  }
  // Limits such as π, 2π or e: put them into the antiderivative and simplify (−cos π = 1, ln e = 1).
  if (H && p.e && q.e) {
    const d = simp(sub(substitute(H, "x", q.e), substitute(H, "x", p.e)));
    if (isNum(d)) return { q: qs(d.v), v: d.v.toNumber() };
    const v = evalE(d, 0);
    if (!has(d) && Number.isFinite(v)) return { q: null, v, sym: d };
  }
  if (H) {
    const v = evalE(H, q.v) - evalE(H, p.v);
    if (Number.isFinite(v)) return { q: null, v };
  }
  return { q: null, v: simpson((x) => evalE(h, x), p.v, q.v) };
}

const text = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; italic?: boolean } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 13}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""}${o.italic ? ` font-style="italic"` : ""}>${esc(s)}</text>`;
/** A shaded band between two curves on [p, q]. */
function band(fr: Frame, top: (x: number) => number, bottom: (x: number) => number, p: number, q: number, color: string): string {
  const n = 120;
  const up: string[] = [];
  const down: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = p + ((q - p) * i) / n;
    up.push(`${r2(fr.sx(x))},${r2(fr.sy(top(x)))}`);
    down.unshift(`${r2(fr.sx(x))},${r2(fr.sy(bottom(x)))}`);
  }
  return `<g clip-path="url(#${fr.id})"><polygon points="${[...up, ...down].join(" ")}" fill="${color}" fill-opacity="0.28" stroke="none"/></g>`;
}

/** Steps, a picture, captions. */
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

// ---------- area ----------

function renderArea(s: AppSpec, w: AppWords): RenderedSvg {
  const Aw = w.area;
  const f = parseE(s.f);
  const g = s.g.trim() ? parseE(s.g) : N(0);
  const h = simp(sub(f, g));
  const { a, b, rootsRow } = limitsOf(h, s);
  const { hp, H, Hp } = primOf(h);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const hasG = !!s.g.trim();
  if (hasG) rows.push({ tex: `f(x) - g(x) = ${tex(h)}`, op: Aw.diff });
  const cuts = zerosBetween(h, hp, a.v, b.v);
  const shown = rootsRow.length ? rootsRow : cuts;
  if (shown.length) rows.push({ tex: `${tex(h)} = 0 \\;\\Rightarrow\\; ${shown.map((r) => `x ${r.q || r.e ? "=" : "\\approx"} ${r.tex}`).join(", \\; ")}`, op: hasG ? Aw.meet : Aw.roots });
  const hw = h.k === "add" ? `\\left(${tex(h)}\\right)` : tex(h);
  if (H) rows.push({ tex: `\\int ${hw}\\, dx = ${tex(H)} + C`, op: Aw.antiderivative });
  else caps.push({ text: w.noAntiderivative, color: "#495057" });
  // One integral per piece; pieces below count with their sign turned round.
  const pts = [a, ...cuts, b];
  const pieces = pts.slice(0, -1).map((lo, i) => {
    const d = definite(h, H, Hp, lo, pts[i + 1]);
    return { lo, hi: pts[i + 1], ex: d.q, v: d.v, sym: d.sym };
  });
  for (const pc of pieces) {
    const lim = `\\int_{${pc.lo.tex}}^{${pc.hi.tex}}`;
    const tail = pc.sym ? `= ${tex(pc.sym)} \\approx ${ax(pc.v)}` : `${pc.ex ? "=" : "\\approx"} ${valueTex(pc.ex, pc.v).replace(/^\\approx /, "")}`;
    const val = H ? `\\left[${tex(H)}\\right]_{${pc.lo.tex}}^{${pc.hi.tex}} ${tail}` : valueTex(pc.ex, pc.v);
    rows.push({ tex: `${lim} ${hw}\\, dx = ${val}`, op: pc.v >= 0 ? Aw.above : Aw.below, color: pc.v >= 0 ? C.green : C.red });
  }
  // Total: |piece| added up, exactly when every piece is exact (and in the same surd).
  let exactTotal: QS | null = pieces.every((pc) => pc.ex) ? qs(F(0)) : null;
  for (const pc of pieces) if (exactTotal && pc.ex) exactTotal = qsSub(exactTotal, { ...qsAbs(pc.ex), a: qsAbs(pc.ex).a.neg(), b: qsAbs(pc.ex).b.neg() });
  const total = pieces.reduce((acc, pc) => acc + Math.abs(pc.v), 0);
  if (pieces.length > 1)
    rows.push({ tex: `A = ${pieces.map((pc) => `\\left|${pc.ex ? qsTex(pc.ex) : ax(pc.v)}\\right|`).join(" + ")} ${exactTotal ? "=" : "\\approx"} ${valueTex(exactTotal, total).replace(/^\\approx /, "")}`, op: Aw.total, color: C.green });
  else rows[rows.length - 1].color = C.green;
  answer = total;
  const signed = pieces.reduce((acc, pc) => acc + pc.v, 0);
  if (pieces.some((pc) => pc.v < 0) && pieces.some((pc) => pc.v > 0)) caps.push({ text: fill(Aw.signed, { s: approx(signed), a: approx(total) }), color: "#495057" });
  caps.push({ text: fill(w.check, { v: approx(simpson((x) => Math.abs(evalE(h, x)), a.v, b.v, 4000)) }), color: C.green });
  const header = hasG ? `f(x) = ${tex(f)}, \\quad g(x) = ${tex(g)}` : `f(x) = ${tex(f)}`;
  return finish(header, rows, (y) => {
    const span = b.v - a.v;
    const [x0, x1] = [a.v - span * 0.25, b.v + span * 0.25];
    const ys: number[] = [];
    for (let i = 0; i <= 300; i++) {
      const x = x0 + ((x1 - x0) * i) / 300;
      ys.push(evalE(f, x), evalE(g, x));
    }
    const fr = makeFrame("ap-area", 48, y + 6, W - 48 - 24, 280, [x0, x1], yRange(ys, [0]));
    const ff = (x: number) => evalE(f, x);
    const gg = (x: number) => evalE(g, x);
    const parts = [axes(fr)];
    for (const pc of pieces) {
      parts.push(band(fr, ff, gg, pc.lo.v, pc.hi.v, pc.v >= 0 ? C.green : C.red));
      const mx = (pc.lo.v + pc.hi.v) / 2;
      parts.push(lbl(fr.sx(mx), fr.sy((ff(mx) + gg(mx)) / 2) + 5, pc.ex ? qsPlain(qsAbs(pc.ex)) : approx(Math.abs(pc.v)), pc.v >= 0 ? C.green : C.red, "middle", 13, false));
    }
    parts.push(curve(fr, ff, C.blue, 2.6));
    if (hasG) parts.push(curve(fr, gg, C.orange, 2.4));
    for (const p of pts) parts.push(dot(fr.sx(p.v), fr.sy(gg(p.v)), C.ink, 3.5));
    parts.push(lbl(fr.left + 10, fr.top + 18, `f(x) = ${minus(s.f.trim())}`, C.blue, "start", 13, false));
    if (hasG) parts.push(lbl(fr.left + 10, fr.top + 37, `g(x) = ${minus(s.g.trim())}`, C.orange, "start", 13, false));
    return { svg: parts.join(""), h: fr.bottom - y + 16 };
  }, caps);
}

// ---------- volumes of revolution ----------

const scaleQS = (x: QS, k: Frac): QS => ({ a: x.a.mul(k), b: x.b.mul(k), s: x.s });
/** kπ in LaTeX: 8π/3, (16 + 2√5)π. */
function piTex(x: QS | null, v: number): string {
  if (!x) return `\\approx ${ax(v * Math.PI)}`;
  const t = qsTex(x);
  const body = x.b.isZero() ? (x.a.isOne() ? "\\pi" : x.a.d === 1 ? `${x.a.n}\\pi` : `\\frac{${x.a.n}\\pi}{${x.a.d}}`) : `\\left(${t}\\right)\\pi`;
  return `${body} \\approx ${ax(v * Math.PI)}`;
}

function renderVolume(s: AppSpec, w: AppWords): RenderedSvg {
  const Vw = w.volume;
  const f = parseE(s.f);
  const hasG = !!s.g.trim();
  const g = hasG ? parseE(s.g) : N(0);
  const yAxis = s.opt === "y";
  const diff = simp(sub(f, g));
  const { a, b } = limitsOf(diff, s);
  // Without the π (and the 2 of the shells): f² − g², or x(f − g).
  const inner = simp(yAxis ? mul(X, diff) : sub(pow(f, 2), pow(g, 2)));
  const k = yAxis ? F(2) : F(1);
  const { H, Hp } = primOf(inner);
  const kPi = yAxis ? "2\\pi" : "\\pi";
  const rows: TexLine[] = [];
  const lim = `\\int_{${a.tex}}^{${b.tex}}`;
  const wrap = (e: E) => (e.k === "add" ? `\\left(${tex(e)}\\right)` : tex(e));
  const height = hasG ? `\\left(${tex(f)} - ${wrap(g)}\\right)` : wrap(f);
  if (yAxis) rows.push({ tex: `V = 2\\pi ${lim} x \\cdot ${height}\\, dx`, op: Vw.shell });
  else if (hasG) rows.push({ tex: `V = \\pi ${lim} \\left(${tex(pow(f, 2))} - ${tex(pow(g, 2))}\\right) dx`, op: Vw.washer });
  else rows.push({ tex: `V = \\pi ${lim} ${tex(pow(f, 2))}\\, dx`, op: Vw.disc });
  rows.push({ tex: `= ${kPi} ${lim} ${wrap(inner)}\\, dx`, op: Vw.square });
  const caps: Caption[] = [];
  if (H) rows.push({ tex: `= ${kPi} \\left[${tex(H)}\\right]_{${a.tex}}^{${b.tex}}`, op: Vw.antiderivative });
  else caps.push({ text: w.noAntiderivative, color: "#495057" });
  const d = definite(inner, H, Hp, a, b);
  const exact = d.q ? scaleQS(d.q, k) : null;
  const vol = d.v * k.toNumber();
  answer = vol * Math.PI;
  rows.push({ tex: `= ${piTex(exact, vol)}`, op: Vw.evaluate, color: C.green });
  caps.push({ text: yAxis ? Vw.pictureY : Vw.picture, color: "#495057" });
  caps.push({ text: fill(w.check, { v: approx(Math.PI * k.toNumber() * simpson((x) => evalE(inner, x), a.v, b.v, 4000)) }), color: C.green });
  const header = `${hasG ? `f(x) = ${tex(f)}, \\; g(x) = ${tex(g)}` : `f(x) = ${tex(f)}`}, \\quad ${a.tex} \\le x \\le ${b.tex}`;
  return finish(header, rows, (y) => solidPicture(f, g, hasG, a.v, b.v, yAxis, y), caps);
}

/** The region and the solid it sweeps out, drawn with cross-sections as ellipses. */
function solidPicture(f: E, g: E, hasG: boolean, a: number, b: number, yAxis: boolean, y0: number): { svg: string; h: number } {
  const ff = (x: number) => evalE(f, x);
  const gg = (x: number) => evalE(g, x);
  let M = 0;
  for (let i = 0; i <= 200; i++) {
    const x = a + ((b - a) * i) / 200;
    M = Math.max(M, Math.abs(ff(x)), Math.abs(gg(x)));
  }
  M = M || 1;
  const parts: string[] = [];
  let fr: Frame;
  if (!yAxis) {
    const pad = (b - a) * 0.2 || 1;
    fr = makeFrame("ap-vol", 48, y0 + 6, W - 48 - 24, 300, [Math.min(a - pad, 0), b + pad], [-M * 1.2, M * 1.2]);
    parts.push(axes(fr));
    parts.push(band(fr, ff, gg, a, b, C.blue));
    parts.push(band(fr, (x) => -ff(x), (x) => -gg(x), a, b, C.blue).replace('fill-opacity="0.28"', 'fill-opacity="0.12"'));
    // Cross-sections: discs (or washers) seen slightly from the side.
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const x = a + ((b - a) * i) / n;
      const ry = Math.abs(fr.sy(ff(x)) - fr.sy(0));
      const rx = Math.max(2, ry * 0.22);
      const solid = i === 0 || i === n;
      parts.push(`<ellipse cx="${r2(fr.sx(x))}" cy="${r2(fr.sy(0))}" rx="${r2(rx)}" ry="${r2(ry)}" fill="none" stroke="${C.blue}" stroke-width="${solid ? 1.8 : 1}" ${solid ? "" : `stroke-dasharray="4 3"`}/>`);
      if (hasG) {
        const ri = Math.abs(fr.sy(gg(x)) - fr.sy(0));
        parts.push(`<ellipse cx="${r2(fr.sx(x))}" cy="${r2(fr.sy(0))}" rx="${r2(Math.max(1.5, ri * 0.22))}" ry="${r2(ri)}" fill="none" stroke="${C.orange}" stroke-width="1" stroke-dasharray="3 3"/>`);
      }
    }
    parts.push(curve(fr, ff, C.blue, 2.6, "", a, b), curve(fr, (x) => -ff(x), C.blue, 1.6, `stroke-dasharray="6 4"`, a, b));
    if (hasG) parts.push(curve(fr, gg, C.orange, 2.2, "", a, b), curve(fr, (x) => -gg(x), C.orange, 1.4, `stroke-dasharray="6 4"`, a, b));
  } else {
    const R = Math.max(Math.abs(a), Math.abs(b)) * 1.2 || 1;
    let lo = 0;
    let hi = 0;
    for (let i = 0; i <= 200; i++) {
      const x = a + ((b - a) * i) / 200;
      lo = Math.min(lo, ff(x), gg(x));
      hi = Math.max(hi, ff(x), gg(x));
    }
    const padY = (hi - lo) * 0.25 || 1;
    fr = makeFrame("ap-vol", 48, y0 + 6, W - 48 - 24, 300, [-R, R], [lo - padY, hi + padY]);
    parts.push(axes(fr));
    parts.push(band(fr, ff, gg, a, b, C.blue));
    parts.push(band(fr, (x) => ff(-x), (x) => gg(-x), -b, -a, C.blue).replace('fill-opacity="0.28"', 'fill-opacity="0.12"'));
    // Shells: the rim of each cylinder as an ellipse around the y-axis.
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const x = a + ((b - a) * i) / n;
      const rx = Math.abs(fr.sx(x) - fr.sx(0));
      for (const yy of [ff(x), gg(x)]) parts.push(`<ellipse cx="${r2(fr.sx(0))}" cy="${r2(fr.sy(yy))}" rx="${r2(rx)}" ry="${r2(Math.max(2, rx * 0.12))}" fill="none" stroke="${C.purple}" stroke-width="1" stroke-dasharray="4 3"/>`);
      parts.push(`<line x1="${r2(fr.sx(x))}" y1="${r2(fr.sy(gg(x)))}" x2="${r2(fr.sx(x))}" y2="${r2(fr.sy(ff(x)))}" stroke="${C.purple}" stroke-width="1"/>`);
    }
    parts.push(curve(fr, ff, C.blue, 2.6, "", a, b), curve(fr, (x) => ff(-x), C.blue, 1.6, `stroke-dasharray="6 4"`, -b, -a));
    if (hasG) parts.push(curve(fr, gg, C.orange, 2.2, "", a, b), curve(fr, (x) => gg(-x), C.orange, 1.4, `stroke-dasharray="6 4"`, -b, -a));
  }
  return { svg: parts.join(""), h: fr.bottom - y0 + 16 };
}

/** Limits as typed, or from where the curves meet. */
function limitsOf(h: E, s: AppSpec): { a: Pt; b: Pt; rootsRow: Pt[] } {
  let a = parsePt(s.a);
  let b = parsePt(s.b);
  let rootsRow: Pt[] = [];
  if (!a || !b) {
    const hp = toPoly(h);
    if (!hp) throw new Error(words.needLimits);
    const r = realRoots(hp);
    const all = [...r.exact.map(ptOfQS), ...r.approx.map(ptOfNum)].sort((p, q) => p.v - q.v);
    if (all.length < 2) throw new Error(words.needLimits);
    rootsRow = all;
    a = a ?? all[0];
    b = b ?? all[all.length - 1];
  }
  if (a.v > b.v) [a, b] = [b, a];
  if (a.v === b.v) throw new Error(words.needLimits);
  return { a, b, rootsRow };
}
/** The antiderivative: as a polynomial when the integrand is one, otherwise from the table, or null. */
function primOf(h: E): { hp: Frac[] | null; H: E | null; Hp: Frac[] | null } {
  const hp = toPoly(h);
  const Hp = hp ? [F(0), ...hp.map((c, k) => c.div(F(k + 1)))] : null;
  return { hp, H: Hp ? fromPoly(Hp) : antiderivative(h), Hp };
}

// ---------- motion ----------

function renderMotion(s: AppSpec, w: AppWords): RenderedSvg {
  const Mw = w.motion;
  // Typed with t; worked with x underneath.
  const sx = parseE(s.f.replace(/(?<![a-z])t(?![a-z])/gi, "x"));
  const t0 = parsePt(s.a) ?? ptOfQS(qs(F(0)));
  const t1 = parsePt(s.b);
  if (!t1 || t1.v <= t0.v) throw new Error(w.motion.needTimes);
  const T = (e: E) => tex(substitute(e, "x", V("t")));
  const v = derive(sx);
  const acc = derive(v);
  const sp = toPoly(sx);
  const vp = toPoly(v);
  const rows: TexLine[] = [
    { tex: `v(t) = s'(t) = ${T(v)}`, op: Mw.velocity, color: C.orange },
    { tex: `a(t) = v'(t) = ${T(acc)}`, op: Mw.acceleration, color: C.purple },
  ];
  const caps: Caption[] = [];
  const rest = zerosBetween(v, vp, t0.v, t1.v);
  if (rest.length) rows.push({ tex: `v(t) = 0 \\;\\Rightarrow\\; ${rest.map((r) => `t ${r.q || r.e ? "=" : "\\approx"} ${r.tex}`).join(", \\; ")}`, op: Mw.rest });
  else caps.push({ text: Mw.noRest, color: "#495057" });
  // Positions at the start, at each stop and at the end.
  const times = [t0, ...rest, t1];
  const pos = times.map((t) => {
    if (sp && t.q) {
      const q = peval(sp, t.q);
      return { q: q as QS | null, v: qsNum(q) };
    }
    return { q: null as QS | null, v: evalE(sx, t.v) };
  });
  const posTex = (i: number) => (pos[i].q ? qsTex(pos[i].q!) : ax(pos[i].v));
  rows.push({ tex: times.map((t, i) => `s(${t.tex}) ${pos[i].q ? "=" : "\\approx"} ${posTex(i)}`).join(", \\; "), op: Mw.positions });
  const disp = pos[0].q && pos[pos.length - 1].q ? qsSub(pos[pos.length - 1].q!, pos[0].q!) : null;
  const dispV = pos[pos.length - 1].v - pos[0].v;
  rows.push({ tex: `s(${t1.tex}) - s(${t0.tex}) ${disp ? "=" : "\\approx"} ${disp ? qsTex(disp) : ax(dispV)}`, op: Mw.displacement, color: C.blue });
  // Distance: every leg counted forwards.
  const legs = pos.slice(1).map((p, i) => {
    const d = p.q && pos[i].q ? qsSub(p.q, pos[i].q!) : null;
    return { q: d ? qsAbs(d) : null, v: Math.abs(p.v - pos[i].v) };
  });
  let dist: QS | null = legs.every((l) => l.q) ? qs(F(0)) : null;
  for (const l of legs) if (dist && l.q) dist = qsSub(dist, scaleQS(l.q, F(-1)));
  const distV = legs.reduce((acc2, l) => acc2 + l.v, 0);
  answer = distV;
  if (legs.length > 1)
    rows.push({ tex: `${legs.map((l, i) => `\\left|s(${times[i + 1].tex}) - s(${times[i].tex})\\right|`).join(" + ")} ${dist ? "=" : "\\approx"} ${dist ? qsTex(dist) : ax(distV)}`, op: Mw.distance, color: C.green });
  else rows.push({ tex: `\\left|s(${t1.tex}) - s(${t0.tex})\\right| ${dist ? "=" : "\\approx"} ${dist ? qsTex(dist) : ax(distV)}`, op: Mw.distance, color: C.green });
  caps.unshift({ text: fill(Mw.summary, { s: approx(pos[0].v), v: approx(evalE(v, t0.v)), a: approx(evalE(acc, t0.v)) }), color: "#495057" });
  const header = `s(t) = ${T(sx)}, \\quad ${t0.tex} \\le t \\le ${t1.tex}`;
  return finish(header, rows, (y) => {
    const parts: string[] = [];
    const H = 104;
    const graphs: [E, string, string][] = [[sx, C.blue, "s"], [v, C.orange, "v"], [acc, C.purple, "a"]];
    let yy = y + 4;
    for (const [e, color, name] of graphs) {
      const ys: number[] = [];
      for (let i = 0; i <= 200; i++) ys.push(evalE(e, t0.v + ((t1.v - t0.v) * i) / 200));
      const fr = makeFrame(`ap-mo-${name}`, 48, yy, W - 48 - 24, H, [t0.v, t1.v], yRange(ys, [0]));
      parts.push(axes(fr), curve(fr, (x) => evalE(e, x), color, 2.4));
      for (const r of rest) parts.push(`<line x1="${r2(fr.sx(r.v))}" y1="${fr.top}" x2="${r2(fr.sx(r.v))}" y2="${fr.bottom}" stroke="${C.red}" stroke-dasharray="4 3"/>`);
      parts.push(lbl(fr.left + 8, fr.top + 16, `${name}(t)`, color, "start", 13, false));
      yy = fr.bottom + 12;
    }
    // The path on a line: one arrow per leg, each a little lower.
    const ps = pos.map((p) => p.v);
    const [lo, hi] = [Math.min(...ps), Math.max(...ps)];
    const span = hi - lo || 1;
    const sxp = (v2: number) => 70 + ((v2 - lo) / span) * (W - 140);
    parts.push(text(24, yy + 16, Mw.path, { size: 12, color: "#495057", bold: true }));
    yy += 44;
    parts.push(`<line x1="50" y1="${yy}" x2="${W - 50}" y2="${yy}" stroke="#495057" stroke-width="1.4"/>`);
    // Times at the same place share one label: t = 0, 3.
    const places = new Map<string, { p: number; ts: string[] }>();
    ps.forEach((p, i) => {
      const k = approx(p);
      if (!places.has(k)) places.set(k, { p, ts: [] });
      places.get(k)!.ts.push(times[i].plain);
    });
    for (const { p, ts } of places.values())
      parts.push(`<line x1="${r2(sxp(p))}" y1="${yy - 5}" x2="${r2(sxp(p))}" y2="${yy + 5}" stroke="#495057"/>`, text(sxp(p), yy - 9, `t = ${ts.join(", ")}`, { anchor: "middle", size: 11, color: "#495057" }), text(sxp(p), yy + 18, minus(approx(p)), { anchor: "middle", size: 11 }));
    legs.forEach((_, i) => {
      const [p, q] = [sxp(ps[i]), sxp(ps[i + 1])];
      const ly = yy + 32 + i * 14;
      parts.push(`<line x1="${r2(p)}" y1="${ly}" x2="${r2(q - Math.sign(q - p) * 6)}" y2="${ly}" stroke="${C.green}" stroke-width="2.2"/>`, `<path d="M${r2(q)},${ly} l${q > p ? -9 : 9},-4.5 l0,9 Z" fill="${C.green}"/>`);
    });
    yy += 32 + legs.length * 14;
    return { svg: parts.join(""), h: yy - y + 6 };
  }, caps);
}

// ---------- optimisation ----------

function param(src: string, fallback: number): Frac {
  if (!src.trim()) return F(fallback);
  const f = Frac.parse(src.trim());
  if (!f || !(f.toNumber() > 0)) throw new Error(words.needNumber);
  return f;
}
const PI: E = { k: "pi" };
/** Polynomial in the letter v (r for the can). */
const texIn = (e: E, v: string) => tex(substitute(e, "x", V(v)));
/** q (+ b√s) as LaTeX with ≈ when it is not a whole number. */
const qv = (x: QS) => `${qsTex(x)}${x.b.isZero() && x.a.isInt() ? "" : ` \\approx ${ax(qsNum(x))}`}`;

function renderOptimise(s: AppSpec, w: AppWords): RenderedSvg {
  const Ow = w.opt;
  const kind = (OPT_KINDS as string[]).includes(s.opt) ? (s.opt as OptKind) : "box";
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const pt = (q: QS) => ({ q, v: qsNum(q) });
  if (kind === "can") {
    const Vc = param(s.a, 330);
    const S = add(mul(N(2), PI, pow(X, 2)), mul(N(Vc.mul(F(2))), pow(X, -1)));
    const dS = derive(S);
    const r = Math.cbrt(Vc.toNumber() / (2 * Math.PI));
    const Sv = evalE(S, r);
    answer = r;
    rows.push(
      { tex: `\\pi r^2 h = ${Vc.tex()} \\;\\Rightarrow\\; h = \\frac{${Vc.tex()}}{\\pi r^2}`, op: Ow.setup.can },
      { tex: `S(r) = 2\\pi r^2 + 2\\pi r h = ${texIn(S, "r")}` },
      { tex: `S'(r) = ${texIn(dS, "r")} = 0`, op: Ow.derivative },
      { tex: `r^3 = \\frac{${Vc.tex()}}{2\\pi} \\;\\Rightarrow\\; r = \\sqrt[3]{\\frac{${Vc.tex()}}{2\\pi}} \\approx ${ax(r)}`, op: Ow.solve },
      { tex: `S''(r) = ${texIn(derive(dS), "r")} > 0`, op: Ow.min },
      { tex: `h = \\frac{${Vc.tex()}}{\\pi r^2} = 2r \\approx ${ax(2 * r)}, \\quad S \\approx ${ax(Sv)}`, color: C.green },
    );
    caps.push({ text: fill(Ow.answer.can, { r: approx(r), h: approx(2 * r), s: approx(Sv) }), color: C.green });
    return finish(`V = ${Vc.tex()}`, rows, (y) => {
      const parts: string[] = [];
      // The can: height twice the radius.
      const [cx, top, R, Hc] = [130, y + 30, 60, 120];
      parts.push(
        `<ellipse cx="${cx}" cy="${top + Hc}" rx="${R}" ry="14" fill="#e7f5ff" stroke="${C.blue}" stroke-width="2"/>`,
        `<rect x="${cx - R}" y="${top}" width="${2 * R}" height="${Hc}" fill="#e7f5ff" stroke="none"/>`,
        `<line x1="${cx - R}" y1="${top}" x2="${cx - R}" y2="${top + Hc}" stroke="${C.blue}" stroke-width="2"/>`,
        `<line x1="${cx + R}" y1="${top}" x2="${cx + R}" y2="${top + Hc}" stroke="${C.blue}" stroke-width="2"/>`,
        `<ellipse cx="${cx}" cy="${top}" rx="${R}" ry="14" fill="#d0ebff" stroke="${C.blue}" stroke-width="2"/>`,
        `<line x1="${cx}" y1="${top}" x2="${cx + R}" y2="${top}" stroke="${C.red}" stroke-width="2"/>`,
        text(cx + R / 2, top - 6, `r ≈ ${approx(r)}`, { anchor: "middle", color: C.red, bold: true, size: 12 }),
        text(cx + R + 8, top + Hc / 2, `h ≈ ${approx(2 * r)}`, { color: C.purple, bold: true, size: 12 }),
      );
      const fr = makeFrame("ap-can", 260, y + 10, W - 260 - 24, 180, [0, 3 * r], yRange([Sv, evalE(S, 3 * r), Sv * 2.5], [0]));
      parts.push(axes(fr), curve(fr, (x) => evalE(S, x), C.blue, 2.4, "", 0.15 * r, 3 * r), dot(fr.sx(r), fr.sy(Sv), C.green, 5), lbl(fr.left + 8, fr.top + 16, "S(r)", C.blue, "start", 13, false));
      return { svg: parts.join(""), h: 210 };
    }, caps);
  }
  // Polynomial set-ups: the box, the fence, the nearest point.
  let f: E;
  let lo = 0;
  let hi = Infinity;
  let header: string;
  let goal: "max" | "min" = "max";
  // A point's coordinates may be 0 or negative; lengths may not.
  const a = kind === "distance" ? (s.a.trim() ? Frac.parse(s.a.trim()) ?? F(3) : F(3)) : param(s.a, kind === "box" ? 30 : 100);
  const b = kind === "distance" ? (s.b.trim() ? Frac.parse(s.b.trim()) ?? F(0) : F(0)) : param(s.b, 20);
  if (kind === "box") {
    f = mul(X, sub(N(a), mul(N(2), X)), sub(N(b), mul(N(2), X)));
    hi = Math.min(a.toNumber(), b.toNumber()) / 2;
    header = `${a.tex()} \\times ${b.tex()}`;
    rows.push({ tex: `V(x) = x\\left(${a.tex()} - 2x\\right)\\left(${b.tex()} - 2x\\right)`, op: Ow.setup.box }, { tex: `= ${tex(simp(f))}` });
    rows.push({ tex: `0 < x < ${F(Math.min(a.n * b.d, b.n * a.d), 2 * a.d * b.d).tex()}`, op: Ow.domain });
  } else if (kind === "fence") {
    f = mul(X, sub(N(a), mul(N(2), X)));
    hi = a.toNumber() / 2;
    header = `L = ${a.tex()}`;
    rows.push({ tex: `A(x) = x\\left(${a.tex()} - 2x\\right)`, op: Ow.setup.fence }, { tex: `= ${tex(simp(f))}` });
    rows.push({ tex: `0 < x < ${a.div(F(2)).tex()}`, op: Ow.domain });
  } else {
    // Distance from P(a, b) to y = x², squared so the root goes away.
    f = add(pow(sub(X, N(a)), 2), pow(sub(pow(X, 2), N(b)), 2));
    lo = -Infinity;
    goal = "min";
    header = `y = x^2, \\quad P\\left(${a.tex()}, ${b.tex()}\\right)`;
    rows.push({ tex: `d^2 = \\left(x - ${a.texP()}\\right)^2 + \\left(x^2 - ${b.texP()}\\right)^2`, op: Ow.setup.distance }, { tex: `= ${tex(simp(f))}` });
  }
  const fp = toPoly(simp(f))!;
  const d1 = fp.map((c, k) => c.mul(F(k))).slice(1);
  const d2 = d1.map((c, k) => c.mul(F(k))).slice(1);
  const name = kind === "box" ? "V" : kind === "fence" ? "A" : "\\left(d^2\\right)";
  rows.push({ tex: `${name}'(x) = ${tex(fromPoly(d1))} = 0`, op: Ow.derivative });
  const found = realRoots(d1);
  const crit = [...found.exact.map((q) => ({ q: q as QS | null, v: qsNum(q) })), ...found.approx.map((v) => ({ q: null as QS | null, v }))].sort((p, q) => p.v - q.v);
  const ok = crit.filter((c) => c.v > lo + 1e-12 && c.v < hi - 1e-12);
  const out = crit.filter((c) => !ok.includes(c));
  rows.push({ tex: crit.map((c) => `x ${c.q ? "=" : "\\approx"} ${c.q ? qsTex(c.q) : ax(c.v)}`).join(", \\; "), op: out.length ? fill(Ow.outside, { x: out.map((c) => (c.q ? qsPlain(c.q) : approx(c.v))).join(", ") }) : Ow.solve });
  if (!ok.length) throw new Error(words.needNumber);
  // The best: largest (or smallest) value among the critical points inside.
  const valAt = (c: { q: QS | null; v: number }) => (c.q ? qsNum(peval(fp, c.q)) : fp.reduceRight((acc, k) => acc * c.v + k.toNumber(), 0));
  const best = ok.reduce((p, q) => ((goal === "max" ? valAt(q) > valAt(p) : valAt(q) < valAt(p)) ? q : p));
  const fBest = best.q ? peval(fp, best.q) : null;
  const d2v = best.q ? qsNum(peval(d2, best.q)) : d2.reduceRight((acc, k) => acc * best.v + k.toNumber(), 0);
  const bx = best.q ? qsTex(best.q) : ax(best.v);
  rows.push({ tex: `${name}''\\left(${bx}\\right) ${best.q ? "=" : "\\approx"} ${best.q ? qsTex(peval(d2, best.q)) : ax(d2v)} ${d2v < 0 ? "< 0" : "> 0"}`, op: d2v < 0 ? Ow.max : Ow.min });
  const fv = fBest ? qsNum(fBest) : valAt(best);
  answer = best.v;
  let answerText: string;
  if (kind === "distance") {
    // d = √(d²): exact when d² is rational.
    const dd = fBest && fBest.b.isZero() ? sqrtSplit(fBest.a) : null;
    const dTex = dd ? (dd.s === 1 ? dd.out.tex() : `${dd.out.isOne() ? "" : dd.out.tex()}\\sqrt{${dd.s}}`) : `\\sqrt{${ax(fv)}}`;
    const yq = best.q ? qsTex(peval([F(0), F(0), F(1)], best.q)) : ax(best.v ** 2);
    rows.push({ tex: `Q\\left(${bx}, ${yq}\\right), \\quad d = ${dTex} \\approx ${ax(Math.sqrt(fv))}`, color: C.green });
    answerText = fill(Ow.answer.distance, { x: best.q ? qsPlain(best.q) : approx(best.v), y: approx(best.v ** 2), d: approx(Math.sqrt(fv)) });
  } else {
    rows.push({ tex: `x ${best.q ? "=" : "\\approx"} ${best.q ? qv(best.q) : ax(best.v)}, \\quad ${name} ${fBest ? "=" : "\\approx"} ${fBest ? qv(fBest) : ax(fv)}`, color: C.green });
    answerText = fill(kind === "box" ? Ow.answer.box : Ow.answer.fence, { x: approx(best.v), v: approx(fv), w: approx(a.toNumber() - 2 * best.v) });
  }
  caps.push({ text: answerText, color: C.green });
  return finish(header, rows, (y) => optPicture(kind, a, b, best.v, fv, fp, lo, hi, y), caps);
}

function optPicture(kind: OptKind, a: Frac, b: Frac, x: number, fv: number, fp: Frac[], lo: number, hi: number, y0: number): { svg: string; h: number } {
  const parts: string[] = [];
  const P = (t: number) => fp.reduceRight((acc, k) => acc * t + k.toNumber(), 0);
  if (kind === "box") {
    // The sheet with the corner squares cut out.
    const [A, B] = [a.toNumber(), b.toNumber()];
    const k = Math.min(200 / A, 150 / B);
    const [x0, yTop] = [24, y0 + 20];
    const c = x * k;
    parts.push(`<rect x="${x0}" y="${yTop}" width="${r2(A * k)}" height="${r2(B * k)}" fill="#e7f5ff" stroke="${C.blue}" stroke-width="2"/>`);
    for (const [cx, cy] of [[x0, yTop], [x0 + A * k - c, yTop], [x0, yTop + B * k - c], [x0 + A * k - c, yTop + B * k - c]])
      parts.push(`<rect x="${r2(cx)}" y="${r2(cy)}" width="${r2(c)}" height="${r2(c)}" fill="#ffe3e3" stroke="${C.red}" stroke-width="1.4"/>`);
    parts.push(
      `<rect x="${r2(x0 + c)}" y="${r2(yTop + c)}" width="${r2(A * k - 2 * c)}" height="${r2(B * k - 2 * c)}" fill="none" stroke="${C.blue}" stroke-dasharray="5 4"/>`,
      text(x0 + (A * k) / 2, yTop - 6, a.tex().replace(/\\frac\{(\d+)\}\{(\d+)\}/, "$1/$2"), { anchor: "middle", bold: true, size: 12 }),
      text(x0 + A * k + 6, yTop + (B * k) / 2, b.tex().replace(/\\frac\{(\d+)\}\{(\d+)\}/, "$1/$2"), { bold: true, size: 12 }),
      text(x0 + c / 2, yTop + c / 2 + 4, "x", { anchor: "middle", color: C.red, bold: true, size: 12 }),
    );
  } else if (kind === "fence") {
    // The river along the top, the fence on three sides.
    const L = a.toNumber();
    const k = 200 / Math.max(L - 2 * x, x * 2);
    const [x0, yR] = [24, y0 + 30];
    parts.push(
      `<rect x="${x0 - 10}" y="${yR - 18}" width="${r2((L - 2 * x) * k + 20)}" height="18" fill="#a5d8ff"/>`,
      `<path d="M${x0},${yR} L${x0},${r2(yR + x * k)} L${r2(x0 + (L - 2 * x) * k)},${r2(yR + x * k)} L${r2(x0 + (L - 2 * x) * k)},${yR}" fill="#ebfbee" stroke="${C.green}" stroke-width="2.4"/>`,
      text(x0 - 6, yR + (x * k) / 2, "x", { anchor: "end", bold: true, color: C.green }),
      text(x0 + ((L - 2 * x) * k) / 2, yR + x * k + 16, `${minus(approx(L - 2 * x))}`, { anchor: "middle", bold: true, color: C.green, size: 12 }),
    );
  } else {
    // y = x², the point P, the nearest point Q and the circle around P that just touches the parabola.
    const [p, q] = [a.toNumber(), b.toNumber()];
    const d = Math.sqrt(fv);
    const R = Math.max(Math.abs(p), Math.abs(x), 1) + d + 0.5;
    const fr = makeFrame("ap-dist", 48, y0 + 6, W - 48 - 24, 260, [-R, R], [Math.min(q, 0) - d - 0.5, Math.max(q, x * x) + d + 1]);
    parts.push(axes(fr), curve(fr, (t) => t * t, C.blue, 2.6));
    const rx = Math.abs(fr.sx(d) - fr.sx(0));
    const ry = Math.abs(fr.sy(d) - fr.sy(0));
    parts.push(
      `<ellipse cx="${r2(fr.sx(p))}" cy="${r2(fr.sy(q))}" rx="${r2(rx)}" ry="${r2(ry)}" fill="none" stroke="${C.orange}" stroke-dasharray="5 4"/>`,
      `<line x1="${r2(fr.sx(p))}" y1="${r2(fr.sy(q))}" x2="${r2(fr.sx(x))}" y2="${r2(fr.sy(x * x))}" stroke="${C.red}" stroke-width="2.4"/>`,
      dot(fr.sx(p), fr.sy(q), C.ink, 5),
      dot(fr.sx(x), fr.sy(x * x), C.green, 5.5),
      lbl(fr.sx(p) + 8, fr.sy(q) - 8, "P", C.ink, "start", 13, false),
      lbl(fr.sx(x) + 8, fr.sy(x * x) - 8, "Q", C.green, "start", 13, false),
    );
    return { svg: parts.join(""), h: fr.bottom - y0 + 16 };
  }
  const right = 260;
  const top = Math.max(lo, 0);
  const fr = makeFrame("ap-opt", right, y0 + 10, W - right - 24, 190, [top, hi], yRange([0, fv, P((top + hi) / 2)], [0]));
  parts.push(axes(fr), curve(fr, P, C.blue, 2.4, "", top, hi), dot(fr.sx(x), fr.sy(fv), C.green, 5.5), lbl(fr.left + 8, fr.top + 16, kind === "box" ? "V(x)" : "A(x)", C.blue, "start", 13, false));
  return { svg: parts.join(""), h: 220 };
}

// ---------- related rates ----------

/** k·π^e in LaTeX: 40π, 2/(5π). */
function withPi(k: Frac, e: 1 | -1): string {
  const a = k.abs();
  const sign = k.isNeg() ? "-" : "";
  if (e === 1) return `${sign}${a.d === 1 ? `${a.n === 1 ? "" : a.n}\\pi` : `\\frac{${a.n === 1 ? "" : a.n}\\pi}{${a.d}}`}`;
  return `${sign}\\frac{${a.n}}{${a.d === 1 ? "" : a.d}\\pi}`;
}

function renderRates(s: AppSpec, w: AppWords): RenderedSvg {
  const Rw = w.rates;
  const kind = (RATE_KINDS as string[]).includes(s.opt) ? (s.opt as RateKind) : "ladder";
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  let header: string;
  let value: number;
  let pic: (y: number) => { svg: string; h: number };
  if (kind === "ladder") {
    const L = param(s.a, 5);
    const r = param(s.b, 0.5);
    const x0 = param(s.c, 3);
    if (x0.toNumber() >= L.toNumber()) throw new Error(words.needNumber);
    const y2 = L.mul(L).sub(x0.mul(x0));
    const yr = sqrtSplit(y2);
    const yTex = yr.s === 1 ? yr.out.tex() : `${yr.out.isOne() ? "" : yr.out.tex()}\\sqrt{${yr.s}}`;
    value = (-x0.toNumber() * r.toNumber()) / Math.sqrt(y2.toNumber());
    // −x₀r / (out·√s) = −(x₀r / (out·s))·√s
    const c = x0.mul(r).div(yr.out.mul(F(yr.s)));
    const exact = yr.s === 1 ? x0.mul(r).div(yr.out).neg().tex() : `-${c.isOne() ? "" : c.tex()}\\sqrt{${yr.s}}`;
    header = `L = ${L.tex()}, \\; \\frac{dx}{dt} = ${r.tex()}, \\; x = ${x0.tex()}`;
    rows.push(
      { tex: `x^2 + y^2 = ${L.tex()}^2`, op: Rw.relation },
      { tex: `2x\\frac{dx}{dt} + 2y\\frac{dy}{dt} = 0`, op: Rw.differentiate },
      { tex: `y = \\sqrt{${L.tex()}^2 - ${x0.tex()}^2} = ${yTex}`, op: Rw.know },
      { tex: `2 \\cdot ${x0.tex()} \\cdot ${r.tex()} + 2 \\cdot ${yTex} \\cdot \\frac{dy}{dt} = 0 \\;\\Rightarrow\\; \\frac{dy}{dt} = ${exact} \\approx ${ax(value)}`, op: Rw.substitute, color: C.green },
    );
    caps.push({ text: fill(Rw.answer.ladder, { v: approx(-value) }), color: C.green });
    pic = (y) => {
      const k = 150 / L.toNumber();
      const [wx, gy] = [80, y + 175];
      const X0 = wx + x0.toNumber() * k;
      const Y0 = gy - Math.sqrt(y2.toNumber()) * k;
      const parts = [
        `<line x1="${wx}" y1="${y + 10}" x2="${wx}" y2="${gy}" stroke="#495057" stroke-width="3"/>`,
        `<line x1="${wx}" y1="${gy}" x2="${wx + 260}" y2="${gy}" stroke="#495057" stroke-width="3"/>`,
        `<line x1="${r2(X0)}" y1="${gy}" x2="${wx}" y2="${r2(Y0)}" stroke="${C.orange}" stroke-width="5" stroke-linecap="round"/>`,
        text((X0 + wx) / 2 + 10, (gy + Y0) / 2, `L = ${L.tex()}`, { color: C.orange, bold: true }),
        text((X0 + wx) / 2, gy + 18, `x = ${x0.tex()}`, { anchor: "middle", color: C.blue, bold: true, size: 12 }),
        text(wx - 8, (gy + Y0) / 2, "y", { anchor: "end", color: C.purple, bold: true }),
        `<path d="M${r2(X0 + 8)},${gy - 10} l26,0 m0,0 l-7,-4 m7,4 l-7,4" stroke="${C.blue}" stroke-width="2" fill="none"/>`,
        `<path d="M${wx + 12},${r2(Y0 - 4)} l0,24 m0,0 l-4,-7 m4,7 l4,-7" stroke="${C.purple}" stroke-width="2" fill="none"/>`,
      ];
      return { svg: parts.join(""), h: 200 };
    };
  } else if (kind === "balloon") {
    const k = param(s.a, 100);
    const r0 = param(s.b, 5);
    const drdt = k.div(F(4).mul(r0).mul(r0));
    value = drdt.toNumber() / Math.PI;
    header = `\\frac{dV}{dt} = ${k.tex()}, \\; r = ${r0.tex()}`;
    rows.push(
      { tex: `V = \\frac{4}{3}\\pi r^3`, op: Rw.relation },
      { tex: `\\frac{dV}{dt} = 4\\pi r^2 \\frac{dr}{dt}`, op: Rw.differentiate },
      { tex: `${k.tex()} = 4\\pi \\cdot ${r0.tex()}^2 \\cdot \\frac{dr}{dt} \\;\\Rightarrow\\; \\frac{dr}{dt} = ${withPi(drdt, -1)} \\approx ${ax(value)}`, op: Rw.substitute, color: C.green },
    );
    caps.push({ text: fill(Rw.answer.balloon, { v: approx(value), s: approx((2 * k.toNumber()) / r0.toNumber()) }), color: C.green });
    pic = (y) => {
      const [cx, cy, R] = [W / 2, y + 95, 75];
      const parts = [`<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff0f6" stroke="#d6336c" stroke-width="2.4"/>`, `<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${C.red}" stroke-width="2"/>`, text(cx + R / 2, cy - 6, `r = ${r0.tex()}`, { anchor: "middle", color: C.red, bold: true })];
      for (let i = 0; i < 8; i++) {
        const t = (i * Math.PI) / 4 + 0.4;
        parts.push(`<path d="M${r2(cx + (R + 6) * Math.cos(t))},${r2(cy + (R + 6) * Math.sin(t))} L${r2(cx + (R + 22) * Math.cos(t))},${r2(cy + (R + 22) * Math.sin(t))}" stroke="#d6336c" stroke-width="1.6"/>`);
      }
      return { svg: parts.join(""), h: 200 };
    };
  } else if (kind === "cone") {
    const R = param(s.a, 3);
    const Hh = param(s.b, 6);
    const k = param(s.c, 2);
    const h0 = param(s.f, 4);
    const coef = k.mul(Hh).mul(Hh).div(R.mul(R).mul(h0).mul(h0));
    value = coef.toNumber() / Math.PI;
    const ratio = R.div(Hh);
    header = `R = ${R.tex()}, \\; H = ${Hh.tex()}, \\; \\frac{dV}{dt} = ${k.tex()}, \\; h = ${h0.tex()}`;
    rows.push(
      { tex: `\\frac{r}{h} = \\frac{${R.tex()}}{${Hh.tex()}} \\;\\Rightarrow\\; r = ${ratio.isOne() ? "" : ratio.tex()}h`, op: Rw.relation },
      { tex: `V = \\frac{1}{3}\\pi r^2 h = ${withPi(ratio.mul(ratio).div(F(3)), 1)} h^3` },
      { tex: `\\frac{dV}{dt} = ${withPi(ratio.mul(ratio), 1)} h^2 \\frac{dh}{dt}`, op: Rw.differentiate },
      { tex: `${k.tex()} = ${withPi(ratio.mul(ratio), 1)} \\cdot ${h0.tex()}^2 \\cdot \\frac{dh}{dt} \\;\\Rightarrow\\; \\frac{dh}{dt} = ${withPi(coef, -1)} \\approx ${ax(value)}`, op: Rw.substitute, color: C.green },
    );
    caps.push({ text: fill(Rw.answer.cone, { v: approx(value) }), color: C.green });
    pic = (y) => {
      const [cx, top, Hp] = [W / 2, y + 20, 160];
      const Rp = (R.toNumber() / Hh.toNumber()) * Hp;
      const hp = (h0.toNumber() / Hh.toNumber()) * Hp;
      const rp = (R.toNumber() / Hh.toNumber()) * hp;
      const apex = top + Hp;
      const parts = [
        `<path d="M${r2(cx - rp)},${r2(apex - hp)} L${cx},${apex} L${r2(cx + rp)},${r2(apex - hp)} Z" fill="#a5d8ff" stroke="none"/>`,
        `<ellipse cx="${cx}" cy="${r2(apex - hp)}" rx="${r2(rp)}" ry="${r2(rp * 0.18)}" fill="#74c0fc" stroke="${C.blue}"/>`,
        `<path d="M${r2(cx - Rp)},${top} L${cx},${apex} L${r2(cx + Rp)},${top}" fill="none" stroke="#495057" stroke-width="2.4"/>`,
        `<ellipse cx="${cx}" cy="${top}" rx="${r2(Rp)}" ry="${r2(Rp * 0.18)}" fill="none" stroke="#495057" stroke-width="2"/>`,
        text(cx + Rp + 8, top + 4, `R = ${R.tex()}`, { bold: true, size: 12 }),
        text(cx - Rp - 8, top + Hp / 2, `H = ${Hh.tex()}`, { anchor: "end", bold: true, size: 12 }),
        text(cx + rp + 8, apex - hp / 2, `h = ${h0.tex()}`, { color: C.blue, bold: true, size: 12 }),
      ];
      return { svg: parts.join(""), h: 200 };
    };
  } else {
    const k = param(s.a, 2);
    const r0 = param(s.b, 10);
    const dA = F(2).mul(r0).mul(k);
    value = dA.toNumber() * Math.PI;
    header = `\\frac{dr}{dt} = ${k.tex()}, \\; r = ${r0.tex()}`;
    rows.push(
      { tex: `A = \\pi r^2`, op: Rw.relation },
      { tex: `\\frac{dA}{dt} = 2\\pi r \\frac{dr}{dt}`, op: Rw.differentiate },
      { tex: `\\frac{dA}{dt} = 2\\pi \\cdot ${r0.tex()} \\cdot ${k.tex()} = ${withPi(dA, 1)} \\approx ${ax(value)}`, op: Rw.substitute, color: C.green },
    );
    caps.push({ text: fill(Rw.answer.ripple, { v: approx(value) }), color: C.green });
    pic = (y) => {
      const [cx, cy] = [W / 2, y + 95];
      const parts: string[] = [];
      for (const [R, o] of [[30, 0.35], [55, 0.5], [80, 0.9]] as const) parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${C.blue}" stroke-width="2" opacity="${o}"/>`);
      parts.push(`<line x1="${cx}" y1="${cy}" x2="${cx + 80}" y2="${cy}" stroke="${C.red}" stroke-width="2"/>`, text(cx + 40, cy - 6, `r = ${r0.tex()}`, { anchor: "middle", color: C.red, bold: true }));
      return { svg: parts.join(""), h: 200 };
    };
  }
  answer = value;
  caps.unshift({ text: Rw.setup[kind], color: "#495057" });
  return finish(header, rows, (y) => pic(y), caps);
}

// ---------- entry ----------

export function renderApplied(spec: AppSpec, w: AppWords): RenderedSvg {
  words = w;
  exprMessages(w);
  switch (spec.topic) {
    case "area":
      return renderArea(spec, w);
    case "volume":
      return renderVolume(spec, w);
    case "motion":
      return renderMotion(spec, w);
    case "optimise":
      return renderOptimise(spec, w);
    case "rates":
      return renderRates(spec, w);
  }
}

/** The input boxes a topic (and set-up) needs, with their labels. */
export function appFields(spec: AppSpec, w: AppWords): { key: "f" | "g" | "a" | "b" | "c"; label: string }[] {
  const L = w.fields;
  switch (spec.topic) {
    case "area":
      return [{ key: "f", label: L.f }, { key: "g", label: L.g }, { key: "a", label: L.a }, { key: "b", label: L.b }];
    case "volume":
      return [{ key: "f", label: L.f }, { key: "g", label: L.g }, { key: "a", label: L.a }, { key: "b", label: L.b }];
    case "motion":
      return [{ key: "f", label: L.s }, { key: "a", label: L.t0 }, { key: "b", label: L.t1 }];
    case "optimise": {
      const kind = (OPT_KINDS as string[]).includes(spec.opt) ? (spec.opt as OptKind) : "box";
      return w.opt.fields[kind].map((label, i) => ({ key: (["a", "b"] as const)[i], label }));
    }
    case "rates": {
      const kind = (RATE_KINDS as string[]).includes(spec.opt) ? (spec.opt as RateKind) : "ladder";
      return w.rates.fields[kind].map((label, i) => ({ key: (["a", "b", "c", "f"] as const)[i], label }));
    }
  }
}

const P = (topic: AppTopic, f: string, g = "", a = "", b = "", opt = "", c = ""): AppSpec => ({ topic, f, g, a, b, c, opt });
export const APP_PRESETS: { [K in AppTopic]: { label: string; spec: AppSpec }[] } = {
  area: [
    { label: "x² on [0, 3]", spec: P("area", "x^2", "", "0", "3") },
    { label: "sin x on [0, 2π]", spec: P("area", "sin x", "", "0", "2pi") },
    { label: "x³ − 4x", spec: P("area", "x^3 - 4x") },
    { label: "x² and 2", spec: P("area", "2", "x^2") },
    { label: "x and x²", spec: P("area", "x", "x^2") },
    { label: "4 − x² and x + 2", spec: P("area", "4 - x^2", "x + 2") },
    { label: "eˣ on [0, 1]", spec: P("area", "e^x", "", "0", "1") },
    { label: "1/x on [1, e]", spec: P("area", "1/x", "", "1", "e") },
  ],
  volume: [
    { label: "y = x², 0 ≤ x ≤ 2", spec: P("volume", "x^2", "", "0", "2", "x") },
    { label: "y = √x, 0 ≤ x ≤ 4", spec: P("volume", "sqrt(x)", "", "0", "4", "x") },
    { label: "sphere: √(9 − x²)", spec: P("volume", "sqrt(9 - x^2)", "", "-3", "3", "x") },
    { label: "cone: y = x/2, 0 ≤ x ≤ 4", spec: P("volume", "x/2", "", "0", "4", "x") },
    { label: "washer: x and x²", spec: P("volume", "x", "x^2", "", "", "x") },
    { label: "shells: y = x² about y", spec: P("volume", "x^2", "", "0", "2", "y") },
    { label: "shells: 2x − x² about y", spec: P("volume", "2x - x^2", "", "0", "2", "y") },
  ],
  motion: [
    { label: "s = t³ − 6t² + 9t", spec: P("motion", "t^3 - 6t^2 + 9t", "", "0", "5") },
    { label: "s = 20t − 5t² (thrown up)", spec: P("motion", "20t - 5t^2", "", "0", "4") },
    { label: "s = t² − 4t + 3", spec: P("motion", "t^2 - 4t + 3", "", "0", "6") },
    { label: "s = 2t³ − 9t² + 12t", spec: P("motion", "2t^3 - 9t^2 + 12t", "", "0", "3") },
    { label: "s = t³ − 3t² − 2t", spec: P("motion", "t^3 - 3t^2 - 2t", "", "0", "4") },
  ],
  optimise: [
    { label: "box 30 × 20", spec: P("optimise", "", "", "30", "20", "box") },
    { label: "box 12 × 12", spec: P("optimise", "", "", "12", "12", "box") },
    { label: "fence 100", spec: P("optimise", "", "", "100", "", "fence") },
    { label: "can 330", spec: P("optimise", "", "", "330", "", "can") },
    { label: "y = x², P(3, 0)", spec: P("optimise", "", "", "3", "0", "distance") },
    { label: "y = x², P(0, 2)", spec: P("optimise", "", "", "0", "2", "distance") },
  ],
  rates: [
    { label: "ladder 5, 0.5, x = 3", spec: P("rates", "", "", "5", "0.5", "ladder", "3") },
    { label: "ladder 10, 1, x = 6", spec: P("rates", "", "", "10", "1", "ladder", "6") },
    { label: "balloon 100, r = 5", spec: P("rates", "", "", "100", "5", "balloon") },
    { label: "cone 3, 6, 2, h = 4", spec: { ...P("rates", "4", "", "3", "6", "cone", "2") } },
    { label: "ripple 2, r = 10", spec: P("rates", "", "", "2", "10", "ripple") },
  ],
};
