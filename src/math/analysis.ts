// Real analysis made visible: ε–N for sequences, ε–δ for limits, secant → tangent, Riemann sums,
// partial sums of series and Taylor polynomials. Each picture is one standalone SVG: a LaTeX header
// (MathJax), a plot, and captions in the UI language (passed in as `words`, since MathJax can't
// typeset Cyrillic or Georgian).
import { compile, derivative, parse, type EvalFunction, type MathNode } from "mathjs";
import type { RenderedSvg } from "./latex";
import {
  fill,
  esc,
  clampInt,
  nf,
  nt,
  simpson,
  tn,
  paren,
  floorSig,
  SUB,
  sub,
  W,
  FONT,
  C,
  makeFrame,
  r2,
  axes,
  curve,
  sampleY,
  yRange,
  lbl,
  dot,
  hline,
  vline,
  band,
  legend,
  wrap,
  compose,
  PLOT,
  BODY_H,
  type Frame,
  type Caption,
} from "./chart";

export type RiemannMethod = "left" | "right" | "mid" | "trap" | "lower" | "upper";
export const RIEMANN_METHODS: RiemannMethod[] = ["left", "right", "mid", "trap", "lower", "upper"];

export type SequenceSpec = { topic: "sequence"; expr: string; limit: string; eps: number; nMax: number };
export type LimitSpec = { topic: "limit"; expr: string; a: string; limit: string; eps: number; zoom: string };
export type DerivativeSpec = { topic: "derivative"; expr: string; a: string; h: number; showDerivative: boolean };
export type RiemannSpec = { topic: "riemann"; expr: string; a: string; b: string; n: number; method: RiemannMethod };
export type SeriesSpec = { topic: "series"; expr: string; start: number; nMax: number; sum: string };
export type TaylorSpec = { topic: "taylor"; expr: string; a: string; order: number; xMin: string; xMax: string };
export type AnalysisSpec = SequenceSpec | LimitSpec | DerivativeSpec | RiemannSpec | SeriesSpec | TaylorSpec;
export type AnalysisTopic = AnalysisSpec["topic"];
export type SpecOf<K extends AnalysisTopic> = Extract<AnalysisSpec, { topic: K }>;

export const ANALYSIS_TOPICS: AnalysisTopic[] = ["sequence", "limit", "derivative", "riemann", "series", "taylor"];

/** Caption sentences in the UI language; {name} placeholders are filled in here. */
export type AnalysisWords = {
  seqN: string;
  seqBeyond: string;
  seqNone: string;
  limDelta: string;
  limWide: string;
  limNone: string;
  derHint: string;
  derNone: string;
  secant: string;
  tangent: string;
  methods: Record<RiemannMethod, string>;
  error: string;
  seriesPartial: string;
  seriesGap: string;
  taylorGood: string;
  taylorFail: string;
  notNumber: string;
  badInterval: string;
};

export const ANALYSIS_PRESETS: { [K in AnalysisTopic]: SpecOf<K>[] } = {
  sequence: [
    { topic: "sequence", expr: "1/n", limit: "0", eps: 0.1, nMax: 30 },
    { topic: "sequence", expr: "(-1)^n / n", limit: "0", eps: 0.1, nMax: 30 },
    { topic: "sequence", expr: "n / (n + 1)", limit: "1", eps: 0.05, nMax: 40 },
    { topic: "sequence", expr: "(1 + 1/n)^n", limit: "e", eps: 0.05, nMax: 60 },
    { topic: "sequence", expr: "sin(n) / n", limit: "0", eps: 0.05, nMax: 60 },
    { topic: "sequence", expr: "sqrt(n + 1) - sqrt(n)", limit: "0", eps: 0.1, nMax: 40 },
    { topic: "sequence", expr: "(-1)^n", limit: "1", eps: 0.5, nMax: 20 },
  ],
  limit: [
    { topic: "limit", expr: "x^2", a: "2", limit: "4", eps: 0.5, zoom: "2" },
    { topic: "limit", expr: "sin(x) / x", a: "0", limit: "1", eps: 0.1, zoom: "5" },
    { topic: "limit", expr: "(x^2 - 1) / (x - 1)", a: "1", limit: "2", eps: 0.5, zoom: "2" },
    { topic: "limit", expr: "x sin(1/x)", a: "0", limit: "0", eps: 0.2, zoom: "1" },
    { topic: "limit", expr: "sqrt(x)", a: "0", limit: "0", eps: 0.5, zoom: "2" },
    { topic: "limit", expr: "sign(x)", a: "0", limit: "1", eps: 0.5, zoom: "2" },
  ],
  derivative: [
    { topic: "derivative", expr: "x^2", a: "1", h: 1, showDerivative: false },
    { topic: "derivative", expr: "x^3 - 3x", a: "0.5", h: 1, showDerivative: true },
    { topic: "derivative", expr: "sin(x)", a: "0", h: 1.5, showDerivative: true },
    { topic: "derivative", expr: "e^x", a: "0", h: 1, showDerivative: true },
    { topic: "derivative", expr: "1/x", a: "1", h: 1, showDerivative: false },
    { topic: "derivative", expr: "abs(x)", a: "0", h: 1, showDerivative: false },
  ],
  riemann: [
    { topic: "riemann", expr: "x^2", a: "0", b: "2", n: 8, method: "left" },
    { topic: "riemann", expr: "x^2", a: "0", b: "2", n: 8, method: "right" },
    { topic: "riemann", expr: "sin(x)", a: "0", b: "pi", n: 6, method: "mid" },
    { topic: "riemann", expr: "1/x", a: "1", b: "3", n: 10, method: "lower" },
    { topic: "riemann", expr: "e^(-x^2)", a: "-2", b: "2", n: 10, method: "trap" },
    { topic: "riemann", expr: "x^3 - 2x", a: "-1", b: "2", n: 12, method: "mid" },
  ],
  series: [
    { topic: "series", expr: "1 / 2^n", start: 1, nMax: 20, sum: "1" },
    { topic: "series", expr: "1/n", start: 1, nMax: 40, sum: "" },
    { topic: "series", expr: "1 / n^2", start: 1, nMax: 40, sum: "pi^2 / 6" },
    { topic: "series", expr: "(-1)^(n + 1) / n", start: 1, nMax: 40, sum: "log(2)" },
    { topic: "series", expr: "1 / n!", start: 0, nMax: 12, sum: "e" },
    { topic: "series", expr: "4 (-1)^n / (2n + 1)", start: 0, nMax: 40, sum: "pi" },
  ],
  taylor: [
    { topic: "taylor", expr: "sin(x)", a: "0", order: 3, xMin: "-2pi", xMax: "2pi" },
    { topic: "taylor", expr: "cos(x)", a: "0", order: 4, xMin: "-2pi", xMax: "2pi" },
    { topic: "taylor", expr: "e^x", a: "0", order: 3, xMin: "-3", xMax: "3" },
    { topic: "taylor", expr: "log(1 + x)", a: "0", order: 5, xMin: "-1.5", xMax: "2.5" },
    { topic: "taylor", expr: "1 / (1 - x)", a: "0", order: 5, xMin: "-2", xMax: "2" },
    { topic: "taylor", expr: "sqrt(x)", a: "1", order: 3, xMin: "0", xMax: "4" },
  ],
};

// ---------- expressions ----------

/** A function of one variable; NaN wherever it is undefined (or not a real number). */
function fnOf(expr: string, v: string): (x: number) => number {
  const code = compile(expr);
  code.evaluate({ [v]: 2 }); // surfaces "Undefined symbol …" early
  return (x) => {
    try {
      const y = code.evaluate({ [v]: x });
      return typeof y === "number" ? y : NaN;
    } catch {
      return NaN;
    }
  };
}

function value(s: string, w: { notNumber: string }): number {
  let y: unknown;
  try {
    y = compile(s).evaluate({});
  } catch {
    y = NaN;
  }
  if (typeof y !== "number" || !Number.isFinite(y)) throw new Error(fill(w.notNumber, { s }));
  return y;
}

const texOf = (expr: string) => parse(expr).toTex({ parenthesis: "auto", implicit: "hide" });

// ---------- sequences: ε–N ----------

const SEQ_CHECK = 5000;

function renderSequence(s: SequenceSpec, w: AnalysisWords): RenderedSvg {
  const a = fnOf(s.expr, "n");
  const L = s.limit.trim() ? value(s.limit, w) : null;
  const nMax = clampInt(s.nMax, 2, 200);
  const eps = s.eps > 0 ? s.eps : 0.1;
  const vals = Array.from({ length: nMax }, (_, i) => a(i + 1));

  // N = one past the last term (checked far beyond the picture) that is outside the band.
  let N = 1;
  let none = false;
  if (L !== null) {
    let last = 0;
    for (let n = 1; n <= SEQ_CHECK; n++) if (!(Math.abs(a(n) - L) < eps)) last = n;
    N = last + 1;
    none = last > SEQ_CHECK * 0.8;
  }

  const f = makeFrame("cq", PLOT.left, PLOT.top, PLOT.w, PLOT.h, [0, nMax + 1], yRange(vals, L !== null ? [L - eps, L + eps] : [0]));
  const parts = [axes(f, true)];
  if (L !== null) {
    parts.push(band(f, L - eps, L + eps, "L", C.green, "#b2f2bb"), hline(f, L, C.green, `stroke-dasharray="6 4" stroke-width="1.3"`));
    if (!none && N <= nMax) parts.push(vline(f, N, C.orange, `stroke-dasharray="6 4" stroke-width="1.6"`), lbl(f.sx(N) + 5, f.top + 16, `N = ${N}`, C.orange));
  }
  const r = nMax > 80 ? 2.4 : nMax > 40 ? 3.2 : 4;
  vals.forEach((v, i) => {
    const n = i + 1;
    if (!Number.isFinite(v) || v < f.y0 || v > f.y1) return;
    const color = L === null ? C.blue : !none && n >= N ? C.green : Math.abs(v - L) < eps ? C.blue : C.red;
    parts.push(dot(f.sx(n), f.sy(v), color, r));
  });

  let tex = `a_n = ${texOf(s.expr)}`;
  const captions: Caption[] = [];
  if (L !== null) {
    tex += ` \\;${none ? "\\overset{?}{\\longrightarrow}" : "\\longrightarrow"}\\; ${texOf(s.limit)} \\qquad \\varepsilon = ${tn(eps)}`;
    if (!none) tex += `,\\;\\; N = ${N}`;
    captions.push(
      none
        ? { text: fill(w.seqNone, { max: SEQ_CHECK }), color: C.red }
        : { text: fill(w.seqN, { N, eps: nt(eps) }) + (N > nMax ? " " + w.seqBeyond : ""), color: C.green },
    );
  }
  return compose(tex, parts.join(""), BODY_H, captions);
}

// ---------- limits of functions: ε–δ ----------

function renderLimit(s: LimitSpec, w: AnalysisWords): RenderedSvg {
  const fn = fnOf(s.expr, "x");
  const a = value(s.a, w);
  const L = value(s.limit, w);
  const R = value(s.zoom, w);
  if (!(R > 0)) throw new Error(w.badInterval);
  const eps = s.eps > 0 ? s.eps : 0.1;

  // Largest sampled δ such that every x with 0 < |x − a| ≤ δ (in the domain) has |f(x) − L| < ε.
  const offsets = [
    ...Array.from({ length: 3000 }, (_, i) => (R * (i + 1)) / 3000),
    ...Array.from({ length: 600 }, (_, k) => R * 10 ** (-(k + 1) / 60)),
  ].sort((p, q) => p - q);
  const bad = (d: number) =>
    [a - d, a + d].some((x) => {
      const y = fn(x);
      return !Number.isNaN(y) && !(Math.abs(y - L) < eps);
    });
  let delta = R;
  let prev = 0;
  for (const d of offsets) {
    if (bad(d)) {
      // Sharpen the edge between the last good and the first bad sample.
      let hi = d;
      for (let i = 0; i < 40; i++) {
        const mid = (prev + hi) / 2;
        if (bad(mid)) hi = mid;
        else prev = mid;
      }
      delta = prev;
      break;
    }
    prev = d;
  }
  const wide = delta >= R;
  delta = wide ? R : floorSig(delta * (1 + 1e-7));

  const f = makeFrame("cl", PLOT.left, PLOT.top, PLOT.w, PLOT.h, [a - R, a + R], yRange(sampleY(fn, a - R, a + R), [L - eps, L + eps]));
  const parts = [axes(f)];
  if (delta > 0 && !wide) {
    const x0 = f.sx(a - delta);
    const x1 = f.sx(a + delta);
    parts.push(
      `<rect x="${r2(x0)}" y="${f.top}" width="${r2(x1 - x0)}" height="${f.bottom - f.top}" fill="#ffd8a8" opacity="0.5"/>`,
      vline(f, a - delta, C.orange, `stroke-width="1.3"`),
      vline(f, a + delta, C.orange, `stroke-width="1.3"`),
      lbl(x0 - 4, f.bottom - 8, "a − δ", C.orange, "end"),
      lbl(x1 + 4, f.bottom - 8, "a + δ", C.orange, "start"),
    );
  }
  parts.push(band(f, L - eps, L + eps, "L", C.green, "#b2f2bb"), vline(f, a, C.grey, `stroke-dasharray="5 4"`), hline(f, L, C.green, `stroke-dasharray="6 4"`));
  if (delta > 0 && !wide)
    parts.push(
      `<rect x="${r2(f.sx(a - delta))}" y="${r2(f.sy(L + eps))}" width="${r2(f.sx(a + delta) - f.sx(a - delta))}" height="${r2(f.sy(L - eps) - f.sy(L + eps))}" fill="none" stroke="${C.ink}" stroke-width="1.8"/>`,
    );
  parts.push(curve(f, fn, C.blue, 2.6, "", a - R, a + R, 3000));
  const fa = fn(a);
  if (Number.isFinite(fa) && Math.abs(fa - L) > 1e-9) parts.push(dot(f.sx(a), f.sy(fa), C.blue, 4.5));
  parts.push(dot(f.sx(a), f.sy(L), C.blue, 5, true));

  const eq = delta > 0 ? "=" : "\\overset{?}{=}";
  let tex = `\\lim_{x \\to ${texOf(s.a)}} ${texOf(s.expr)} ${eq} ${texOf(s.limit)} \\qquad \\varepsilon = ${tn(eps)}`;
  if (delta > 0) tex += wide ? `,\\;\\; \\delta \\ge ${tn(delta)}` : `\\;\\Rightarrow\\; \\delta = ${tn(delta)}`;
  const caption: Caption =
    delta === 0
      ? { text: fill(w.limNone, { eps: nt(eps) }), color: C.red }
      : { text: fill(wide ? w.limWide : w.limDelta, { delta: nt(delta), eps: nt(eps) }), color: C.green };
  return compose(tex, parts.join(""), BODY_H, [caption]);
}

// ---------- derivative: secant → tangent ----------

function renderDerivative(s: DerivativeSpec, w: AnalysisWords): RenderedSvg {
  const fn = fnOf(s.expr, "x");
  const a = value(s.a, w);
  const h = Math.abs(s.h) < 1e-6 ? 1e-3 : s.h;
  const fa = fn(a);
  const fb = fn(a + h);
  const slope = (fb - fa) / h;

  // One-sided slopes decide differentiability (|x| at 0: −1 vs 1).
  const e = 1e-5;
  const left = (fa - fn(a - e)) / e;
  const right = (fn(a + e) - fa) / e;
  const ok = [fa, left, right].every(Number.isFinite) && Math.abs(left - right) < 1e-3 * Math.max(1, Math.abs(left), Math.abs(right)) && Math.abs(left) < 1e6;
  const d = ok ? (fn(a + e) - fn(a - e)) / (2 * e) : NaN;
  const dfn = (x: number) => (fn(x + e) - fn(x - e)) / (2 * e);

  const half = Math.max(3, Math.abs(h) + 0.6);
  const [x0, x1] = [a - half, a + half];
  const ys = sampleY(fn, x0, x1);
  if (s.showDerivative) ys.push(...sampleY(dfn, x0, x1));
  const f = makeFrame("cd", PLOT.left, PLOT.top, PLOT.w, PLOT.h, [x0, x1], yRange(ys, [fa, fb]));
  const parts = [axes(f)];
  if (s.showDerivative) parts.push(curve(f, dfn, C.purple, 1.8));
  parts.push(curve(f, fn, C.blue, 2.8));
  if (ok) parts.push(curve(f, (x) => fa + d * (x - a), C.green, 2, `stroke-dasharray="8 5"`, x0, x1, 2));
  if (Number.isFinite(slope)) {
    parts.push(curve(f, (x) => fa + slope * (x - a), C.orange, 2.2, "", x0, x1, 2));
    const [px, py, qx, qy] = [f.sx(a), f.sy(fa), f.sx(a + h), f.sy(fb)];
    parts.push(
      `<g stroke="${C.grey}" stroke-width="1.6" stroke-dasharray="4 3"><line x1="${r2(px)}" y1="${r2(py)}" x2="${r2(qx)}" y2="${r2(py)}"/><line x1="${r2(qx)}" y1="${r2(py)}" x2="${r2(qx)}" y2="${r2(qy)}"/></g>`,
      lbl((px + qx) / 2, py + (qy < py ? 17 : -7), "h", C.ink, "middle"),
      lbl(qx + (h > 0 ? 6 : -6), (py + qy) / 2 + 4, "Δy", C.ink, h > 0 ? "start" : "end"),
      dot(px, py, C.ink, 4.5),
      dot(qx, qy, C.orange, 4.5),
    );
  }
  parts.push(
    legend(f, [
      { text: "f(x)", color: C.blue },
      { text: w.secant, color: C.orange },
      ...(ok ? [{ text: w.tangent, color: C.green, dash: true }] : []),
      ...(s.showDerivative ? [{ text: "f′(x)", color: C.purple }] : []),
    ]),
  );

  const tex =
    `\\begin{gathered} f(x) = ${texOf(s.expr)}, \\quad a = ${texOf(s.a)}, \\quad h = ${tn(h)} \\\\ ` +
    `\\frac{f(a+h) - f(a)}{h} = \\frac{${tn(fb)} - ${paren(fa)}}{${tn(h)}} = ${tn(slope)}` +
    (ok ? ` \\qquad f'(a) = ${tn(d)}` : "") +
    ` \\end{gathered}`;
  const caption: Caption = ok
    ? { text: w.derHint }
    : { text: fill(w.derNone, { l: nt(left, 3), r: nt(right, 3) }), color: C.red };
  return compose(tex, parts.join(""), BODY_H, [caption]);
}

// ---------- Riemann sums ----------

const RIEMANN_SYM: Record<RiemannMethod, string> = { left: "L", right: "R", mid: "M", trap: "T", lower: "\\underline{S}", upper: "\\overline{S}" };


function renderRiemann(s: RiemannSpec, w: AnalysisWords): RenderedSvg {
  const fn = fnOf(s.expr, "x");
  const a = value(s.a, w);
  const b = value(s.b, w);
  if (!(b > a)) throw new Error(w.badInterval);
  const n = clampInt(s.n, 1, 500);
  const dx = (b - a) / n;

  const strips = Array.from({ length: n }, (_, i) => {
    const xl = a + i * dx;
    const xr = xl + dx;
    const [fl, fr] = [fn(xl), fn(xr)];
    let hgt: number;
    if (s.method === "lower" || s.method === "upper") {
      const ys = Array.from({ length: 41 }, (_, j) => fn(xl + (dx * j) / 40));
      hgt = s.method === "lower" ? Math.min(...ys) : Math.max(...ys);
    } else hgt = s.method === "left" ? fl : s.method === "right" ? fr : s.method === "mid" ? fn(xl + dx / 2) : (fl + fr) / 2;
    return { xl, xr, fl, fr, hgt };
  });
  const sum = strips.reduce((acc, st) => acc + st.hgt * dx, 0);
  const exact = simpson(fn, a, b);

  const pad = (b - a) * 0.08;
  const f = makeFrame("cr", PLOT.left, PLOT.top, PLOT.w, PLOT.h, [a - pad, b + pad], yRange(sampleY(fn, a - pad, b + pad), [0, ...strips.map((st) => st.hgt)]));
  const parts = [axes(f)];
  const sw = n > 80 ? 0 : 1.2;
  for (const st of strips) {
    if (!Number.isFinite(st.hgt)) continue;
    const pos = st.hgt >= 0;
    const style = `fill="${pos ? "#a5d8ff" : "#ffc9c9"}" fill-opacity="0.75" stroke="${pos ? C.blue : C.red}" stroke-width="${sw}"`;
    const [xl, xr, y0] = [f.sx(st.xl), f.sx(st.xr), f.sy(0)];
    if (s.method === "trap")
      parts.push(`<polygon points="${r2(xl)},${r2(y0)} ${r2(xl)},${r2(f.sy(st.fl))} ${r2(xr)},${r2(f.sy(st.fr))} ${r2(xr)},${r2(y0)}" ${style}/>`);
    else {
      const yt = f.sy(st.hgt);
      parts.push(`<rect x="${r2(xl)}" y="${r2(Math.min(yt, y0))}" width="${r2(xr - xl)}" height="${r2(Math.abs(y0 - yt))}" ${style}/>`);
    }
    if (s.method === "mid" && n <= 40) parts.push(dot(f.sx(st.xl + dx / 2), f.sy(st.hgt), C.blue, 2.6));
  }
  parts.push(curve(f, fn, C.ink, 2.4));

  const tex =
    `\\int_{${texOf(s.a)}}^{${texOf(s.b)}} ${texOf(s.expr)}\\,dx` +
    (Number.isFinite(exact) ? ` \\approx ${tn(exact)}` : "") +
    ` \\qquad ${RIEMANN_SYM[s.method]}_{${n}} = ${tn(sum)}`;
  const caption = `${w.methods[s.method]} (n = ${n}): ${nt(sum)}` + (Number.isFinite(exact) ? ` · ${w.error}: ${nt(Math.abs(sum - exact))}` : "");
  return compose(tex, parts.join(""), BODY_H, [{ text: caption }]);
}

// ---------- series: partial sums ----------

function renderSeries(s: SeriesSpec, w: AnalysisWords): RenderedSvg {
  const a = fnOf(s.expr, "n");
  const start = clampInt(s.start, 0, 1000);
  const count = clampInt(s.nMax, 2, 200);
  const S = s.sum.trim() ? value(s.sum, w) : null;
  const ns = Array.from({ length: count }, (_, i) => start + i);
  const terms = ns.map(a);
  const partial: number[] = [];
  terms.reduce((acc, t, i) => (partial[i] = acc + t), 0);

  const xr = [start - 1, start + count];
  const ft = makeFrame("ct", PLOT.left, PLOT.top, PLOT.w, 130, xr, yRange(terms, [0]));
  const fs = makeFrame("cs", PLOT.left, PLOT.top + 152, PLOT.w, PLOT.h - 152, xr, yRange(partial, S !== null ? [S] : []));
  const r = count > 80 ? 2.2 : count > 40 ? 3 : 3.8;
  const parts = [axes(ft, true), axes(fs, true)];
  ns.forEach((n, i) => {
    const v = terms[i];
    if (!Number.isFinite(v) || v < ft.y0 || v > ft.y1) return;
    parts.push(`<line x1="${r2(ft.sx(n))}" y1="${r2(ft.sy(0))}" x2="${r2(ft.sx(n))}" y2="${r2(ft.sy(v))}" stroke="${C.purple}" stroke-width="2"/>`, dot(ft.sx(n), ft.sy(v), C.purple, r));
  });
  if (S !== null) parts.push(hline(fs, S, C.green, `stroke-dasharray="7 4" stroke-width="1.8"`), lbl(fs.right - 6, fs.sy(S) - 6, "S", C.green, "end", 15));
  parts.push(
    curve(fs, (x) => partial[Math.round(x) - start] ?? NaN, "#adb5bd", 1.2, "", start, start + count - 1, count - 1),
    ...ns.map((n, i) => (Number.isFinite(partial[i]) && partial[i] >= fs.y0 && partial[i] <= fs.y1 ? dot(fs.sx(n), fs.sy(partial[i]), C.blue, r) : "")),
    // Terms usually shrink and partial sums climb, so the empty corners are top-right and bottom-right.
    lbl(ft.right - 8, ft.top + 18, "aₙ", C.purple, "end", 15),
    lbl(fs.right - 8, fs.bottom - 10, `Sₙ = a${sub(start)} + … + aₙ`, C.blue, "end", 15),
  );

  const sumTex = s.sum.trim() ? texOf(s.sum) : "";
  let tex = `\\sum_{n=${start}}^{\\infty} ${texOf(s.expr)}`;
  if (S !== null) tex += ` = ${sumTex}` + (/^-?[\d.]+$/.test(s.sum.trim()) ? "" : ` \\approx ${tn(S)}`);
  const last = partial[count - 1];
  const captions: Caption[] = [{ text: fill(w.seriesPartial, { k: count, s: nt(last, 6) }) }];
  if (S !== null) captions.push({ text: fill(w.seriesGap, { g: nt(Math.abs(S - last), 6) }), color: C.green });
  return compose(tex, parts.join(""), BODY_H, captions);
}

// ---------- Taylor polynomials ----------

const derivCache = new Map<string, { node: MathNode; code: EvalFunction }[]>();

function derivatives(expr: string, order: number) {
  let list = derivCache.get(expr);
  if (!list) {
    const node = parse(expr);
    list = [{ node, code: node.compile() }];
    derivCache.set(expr, list);
  }
  while (list.length <= order) {
    const node = derivative(list[list.length - 1].node, "x");
    list.push({ node, code: node.compile() });
  }
  return list.slice(0, order + 1);
}

/** p/q if x is (numerically) a fraction whose denominator has only small prime factors, like 1/6 or −5/128. */
function niceFraction(x: number): [number, number] | null {
  let [h1, h0, k1, k0, b] = [1, 0, 0, 1, Math.abs(x)];
  for (let i = 0; i < 30; i++) {
    const ai = Math.floor(b);
    [h1, h0] = [ai * h1 + h0, h1];
    [k1, k0] = [ai * k1 + k0, k1];
    if (k1 > 1e10) return null;
    if (Math.abs(Math.abs(x) - h1 / k1) <= 1e-10 * Math.max(1, Math.abs(x))) {
      let q = k1;
      for (const p of [2, 3, 5, 7, 11, 13]) while (q % p === 0) q /= p;
      return q === 1 ? [Math.sign(x) * h1, k1] : null;
    }
    const frac = b - ai;
    if (frac < 1e-12) return null;
    b = 1 / frac;
  }
  return null;
}

function polyTex(coefs: number[], s: TaylorSpec, a: number): string[] {
  const aT = s.a.trim();
  const base = a === 0 ? "x" : aT.startsWith("-") ? `(x + ${texOf(aT.slice(1))})` : `(x - ${texOf(aT)})`;
  const terms: string[] = [];
  coefs.forEach((c, k) => {
    if (Math.abs(c) < 1e-12) return;
    const fr = niceFraction(c);
    const neg = c < 0;
    let mag = fr ? (fr[1] === 1 ? String(Math.abs(fr[0])) : `\\frac{${Math.abs(fr[0])}}{${fr[1]}}`) : tn(Math.abs(c));
    const pow = k === 0 ? "" : k === 1 ? base : `${base}^{${k}}`;
    if (k > 0 && mag === "1") mag = "";
    else if (k > 0 && !fr) mag += "\\,";
    terms.push(`${neg ? "-" : "+"} ${mag}${pow}`);
  });
  if (!terms.length) return ["0"];
  // Four terms per line so high orders stay readable.
  const lines: string[] = [];
  for (let i = 0; i < terms.length; i += 4) lines.push(terms.slice(i, i + 4).join(" "));
  lines[0] = lines[0].replace(/^\+ /, "");
  return lines;
}

function renderTaylor(s: TaylorSpec, w: AnalysisWords): RenderedSvg {
  const fn = fnOf(s.expr, "x");
  const a = value(s.a, w);
  const x0 = value(s.xMin, w);
  const x1 = value(s.xMax, w);
  if (!(x1 > x0)) throw new Error(w.badInterval);
  const order = clampInt(s.order, 0, 12);

  let fact = 1;
  const coefs = derivatives(s.expr, order).map((d, k) => {
    if (k > 0) fact *= k;
    const v = d.code.evaluate({ x: a });
    return typeof v === "number" ? v / fact : NaN;
  });
  if (!coefs.every(Number.isFinite)) throw new Error(fill(w.taylorFail, { a: nt(a) }));
  const T = (x: number) => coefs.reduceRight((acc, c) => acc * (x - a) + c, 0);

  // The strip around a where T is within 0.01 of f.
  const TOL = 0.01;
  const step = (x1 - x0) / 2000;
  const good = (x: number) => Math.abs(fn(x) - T(x)) < TOL;
  let lo = a;
  let hi = a;
  const inside = a >= x0 && a <= x1;
  if (inside) {
    while (lo - step >= x0 && good(lo - step)) lo -= step;
    while (hi + step <= x1 && good(hi + step)) hi += step;
  }

  const f = makeFrame("cy", PLOT.left, PLOT.top, PLOT.w, PLOT.h, [x0, x1], yRange(sampleY(fn, x0, x1), [fn(a)]));
  const parts: string[] = [];
  if (inside && hi > lo) parts.push(`<rect x="${r2(f.sx(lo))}" y="${f.top}" width="${r2(f.sx(hi) - f.sx(lo))}" height="${f.bottom - f.top}" fill="#b2f2bb" opacity="0.5"/>`);
  parts.push(axes(f), vline(f, a, C.grey, `stroke-dasharray="5 4"`), curve(f, fn, C.blue, 3), curve(f, T, C.red, 2.2));
  if (Number.isFinite(fn(a))) parts.push(dot(f.sx(a), f.sy(fn(a)), C.ink, 4.5));
  parts.push(legend(f, [{ text: "f(x)", color: C.blue }, { text: `T${sub(order)}(x)`, color: C.red }]));

  const lines = polyTex(coefs, s, a);
  const tex =
    `\\begin{aligned} f(x) &= ${texOf(s.expr)}, \\qquad a = ${texOf(s.a)} \\\\ ` +
    `T_{${order}}(x) &= ${lines[0]}` +
    lines.slice(1).map((l) => ` \\\\ &\\quad ${l}`).join("") +
    ` \\end{aligned}`;
  const captions: Caption[] = inside && hi > lo ? [{ text: fill(w.taylorGood, { lo: nt(lo, 2), hi: nt(hi, 2) }), color: C.green }] : [];
  return compose(tex, parts.join(""), BODY_H, captions);
}

export function renderAnalysis(spec: AnalysisSpec, words: AnalysisWords): RenderedSvg {
  switch (spec.topic) {
    case "sequence":
      return renderSequence(spec, words);
    case "limit":
      return renderLimit(spec, words);
    case "derivative":
      return renderDerivative(spec, words);
    case "riemann":
      return renderRiemann(spec, words);
    case "series":
      return renderSeries(spec, words);
    case "taylor":
      return renderTaylor(spec, words);
  }
}
