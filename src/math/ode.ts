// Differential equations: slope fields with solution curves, Euler's method against an accurate
// (RK4) solution, first-order models solved step by step (separation of variables, logistic,
// integrating factor), second-order linear equations (characteristic equation, damping, forcing,
// resonance) and phase planes of 2-D systems (eigenvalues, classification, trajectories).
// Every closed-form answer is checked numerically against the equation and the initial condition.
import { compile, parse } from "mathjs";
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";
import { axes, C, compose, curve, dot, fill, hline, lbl, makeFrame, nt, r2, tn, type Caption, type Frame } from "./chart";

export type FirstKind = "growth" | "affine" | "logistic" | "linear";
export const FIRST_KINDS: FirstKind[] = ["growth", "affine", "logistic", "linear"];

export type FieldSpec = { topic: "field"; expr: string; points: string; xMin: string; xMax: string; yMin: string; yMax: string };
export type EulerSpec = { topic: "euler"; expr: string; x0: string; y0: string; h: number; steps: number };
/** growth: y′ = ky · affine: y′ = k(y − A) · logistic: y′ = ry(1 − y/K) · linear: y′ + py = b·e^(ct) */
export type FirstSpec = { topic: "first"; kind: FirstKind; k: string; A: string; K: string; p: string; b: string; c: string; y0: string; tMax: string };
/** a·y″ + b·y′ + c·y = F·cos(ωt) */
export type SecondSpec = { topic: "second"; a: string; b: string; c: string; F: string; w: string; y0: string; v0: string; tMax: string };
export type PhaseSpec = { topic: "phase"; f: string; g: string; points: string; xMin: string; xMax: string; yMin: string; yMax: string };
export type OdeSpec = FieldSpec | EulerSpec | FirstSpec | SecondSpec | PhaseSpec;
export type OdeTopic = OdeSpec["topic"];
export type OdeSpecOf<K extends OdeTopic> = Extract<OdeSpec, { topic: K }>;
export const ODE_TOPICS: OdeTopic[] = ["field", "euler", "first", "second", "phase"];

export type PhaseType = "saddle" | "stableNode" | "unstableNode" | "stableSpiral" | "unstableSpiral" | "center" | "degenerate";

export type OdeWords = {
  fieldHint: string;
  eulerResult: string;
  eulerHint: string;
  checked: string;
  checkFail: string;
  doubling: string;
  halfLife: string;
  approach: string;
  leave: string;
  logistic: string;
  resonance: string;
  damping: { over: string; critical: string; under: string; none: string; growing: string };
  types: Record<PhaseType, string>;
  phaseHint: string;
  nonlinear: string;
  badNumber: string;
  badPoints: string;
  zeroA: string;
  badWindow: string;
};

export const ODE_PRESETS: { [K in OdeTopic]: { label: string; spec: OdeSpecOf<K> }[] } = {
  field: [
    { label: "y′ = x − y", spec: { topic: "field", expr: "x - y", points: "0, 2; 0, 0; 0, -2; -2, 1", xMin: "-3", xMax: "3", yMin: "-3", yMax: "3" } },
    { label: "y′ = y", spec: { topic: "field", expr: "y", points: "0, 1; 0, 0.3; 0, -0.5", xMin: "-3", xMax: "2", yMin: "-3", yMax: "4" } },
    { label: "y′ = x² + y² − 1", spec: { topic: "field", expr: "x^2 + y^2 - 1", points: "0, 0; 0, -1; -1, 0.5", xMin: "-2", xMax: "2", yMin: "-2", yMax: "2" } },
    { label: "y′ = −x / y", spec: { topic: "field", expr: "-x / y", points: "0, 1; 0, 2; 0, -1.5", xMin: "-3", xMax: "3", yMin: "-3", yMax: "3" } },
    { label: "y′ = y(1 − y)", spec: { topic: "field", expr: "y (1 - y)", points: "-3, 0.05; -3, 1.8; 0, 0.5; -1, -0.1", xMin: "-3", xMax: "4", yMin: "-1", yMax: "2" } },
    { label: "y′ = sin(x) · y", spec: { topic: "field", expr: "sin(x) * y", points: "0, 1; 0, -1; 0, 0.5", xMin: "-6", xMax: "6", yMin: "-4", yMax: "4" } },
  ],
  euler: [
    { label: "y′ = y, y(0) = 1", spec: { topic: "euler", expr: "y", x0: "0", y0: "1", h: 0.5, steps: 4 } },
    { label: "y′ = y, h = 0.1", spec: { topic: "euler", expr: "y", x0: "0", y0: "1", h: 0.1, steps: 20 } },
    { label: "y′ = x + y, y(0) = 1", spec: { topic: "euler", expr: "x + y", x0: "0", y0: "1", h: 0.2, steps: 5 } },
    { label: "y′ = −2xy, y(0) = 1", spec: { topic: "euler", expr: "-2 x y", x0: "0", y0: "1", h: 0.25, steps: 8 } },
  ],
  first: [
    { label: "y′ = 0.3y (growth)", spec: { topic: "first", kind: "growth", k: "0.3", A: "0", K: "10", p: "1", b: "1", c: "0", y0: "2", tMax: "8" } },
    { label: "y′ = −ln2 / 5 · y (decay)", spec: { topic: "first", kind: "growth", k: "-log(2)/5", A: "0", K: "10", p: "1", b: "1", c: "0", y0: "100", tMax: "20" } },
    { label: "T′ = −0.2(T − 20) (cooling)", spec: { topic: "first", kind: "affine", k: "-0.2", A: "20", K: "10", p: "1", b: "1", c: "0", y0: "90", tMax: "25" } },
    { label: "y′ = y(1 − y/10) (logistic)", spec: { topic: "first", kind: "logistic", k: "1", A: "0", K: "10", p: "1", b: "1", c: "0", y0: "0.5", tMax: "10" } },
    { label: "y′ + 2y = 3", spec: { topic: "first", kind: "linear", k: "1", A: "0", K: "10", p: "2", b: "3", c: "0", y0: "0", tMax: "4" } },
    { label: "y′ + y = e^(−t)", spec: { topic: "first", kind: "linear", k: "1", A: "0", K: "10", p: "1", b: "1", c: "-1", y0: "1", tMax: "8" } },
  ],
  second: [
    { label: "y″ + y = 0", spec: { topic: "second", a: "1", b: "0", c: "1", F: "0", w: "1", y0: "1", v0: "0", tMax: "15" } },
    { label: "y″ + 0.4y′ + 4y = 0", spec: { topic: "second", a: "1", b: "0.4", c: "4", F: "0", w: "1", y0: "1", v0: "0", tMax: "15" } },
    { label: "y″ + 2y′ + y = 0", spec: { topic: "second", a: "1", b: "2", c: "1", F: "0", w: "1", y0: "1", v0: "1", tMax: "8" } },
    { label: "y″ + 5y′ + 6y = 0", spec: { topic: "second", a: "1", b: "5", c: "6", F: "0", w: "1", y0: "1", v0: "0", tMax: "5" } },
    { label: "y″ + 0.2y′ + y = cos 2t", spec: { topic: "second", a: "1", b: "0.2", c: "1", F: "1", w: "2", y0: "0", v0: "0", tMax: "40" } },
    { label: "y″ + 4y = cos 2t (resonance)", spec: { topic: "second", a: "1", b: "0", c: "4", F: "1", w: "2", y0: "0", v0: "0", tMax: "30" } },
  ],
  phase: [
    { label: "Saddle", spec: { topic: "phase", f: "x + y", g: "4x + y", points: "1, -1.9; -1, 1.9; 0.5, -1.5; -0.5, 1.5; 1.5, -2.5; -1.5, 2.5", xMin: "-3", xMax: "3", yMin: "-3", yMax: "3" } },
    { label: "Spiral sink", spec: { topic: "phase", f: "-0.3x - y", g: "x - 0.3y", points: "2.5, 0; -2.5, 1; 0, 2.8", xMin: "-3", xMax: "3", yMin: "-3", yMax: "3" } },
    { label: "Centre", spec: { topic: "phase", f: "y", g: "-x", points: "1, 0; 2, 0; 2.8, 0", xMin: "-3", xMax: "3", yMin: "-3", yMax: "3" } },
    { label: "Stable node", spec: { topic: "phase", f: "-2x", g: "-y", points: "2.5, 2.5; -2.5, 2; 2, -2.5; -1, -2.8; 2.8, 0.5; -2.8, -0.8", xMin: "-3", xMax: "3", yMin: "-3", yMax: "3" } },
    { label: "Predator–prey", spec: { topic: "phase", f: "x - x y", g: "-y + x y", points: "1.5, 1; 2, 1; 2.5, 1", xMin: "0", xMax: "4", yMin: "0", yMax: "4" } },
    { label: "Damped pendulum", spec: { topic: "phase", f: "y", g: "-sin(x) - 0.3y", points: "-3, 2.5; 3, -2.5; -1, 3; 1, -3", xMin: "-4", xMax: "4", yMin: "-3.5", yMax: "3.5" } },
  ],
};

// ---------- numbers ----------

type Par = { v: number; tex: string };
function par(s: string, w: OdeWords): Par {
  let v: unknown;
  try {
    v = compile(s).evaluate({});
  } catch {
    v = NaN;
  }
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(fill(w.badNumber, { s }));
  const f = Frac.parse(s);
  return { v, tex: f ? f.tex() : parse(s).toTex({ parenthesis: "auto", implicit: "hide" }) };
}

/** A number as TeX: a simple fraction when it is one (−1/2), else 4 decimals. */
function nice(v: number): string {
  if (Number.isInteger(v)) return String(v);
  for (let d = 2; d <= 12; d++) {
    const n = Math.round(v * d);
    if (Math.abs(v - n / d) < 1e-9) return new Frac(n, d).tex();
  }
  return tn(v);
}
/** c · body in TeX with 1 and −1 implicit; "" when c is 0. */
function times(c: number, body: string): string {
  if (Math.abs(c) < 1e-12) return "";
  if (!body) return nice(c);
  if (Math.abs(c - 1) < 1e-12) return body;
  if (Math.abs(c + 1) < 1e-12) return "-" + body;
  return `${nice(c)}${/^[\d.]/.test(body) ? " \\cdot " : "\\,"}${body}`;
}
const sumTex = (terms: string[]) => (terms.filter(Boolean).join(" + ").replace(/\+ -/g, "- ") || "0");
/** e^{rt} */
const expT = (r: number, v = "t") => (Math.abs(r) < 1e-12 ? "" : `e^{${times(r, v)}}`);

/** "y (1 - y)" would parse as calling a function y; make products with variables explicit. */
const norm = (e: string) => e.replace(/\b([xyt]|\d+(?:\.\d+)?)\s*\(/g, "$1*(").replace(/\)\s*\(/g, ")*(");
const texOf = (e: string) => parse(norm(e)).toTex({ parenthesis: "auto", implicit: "hide" });

function fn2(expr: string, a: string, b: string): (x: number, y: number) => number {
  const code = compile(norm(expr));
  code.evaluate({ [a]: 0.3, [b]: 0.7 }); // unknown symbols fail early
  return (x, y) => {
    try {
      const v = code.evaluate({ [a]: x, [b]: y });
      return typeof v === "number" ? v : NaN;
    } catch {
      return NaN;
    }
  };
}

function window(s: { xMin: string; xMax: string; yMin: string; yMax: string }, w: OdeWords): [number, number, number, number] {
  const [a, b, c, d] = [s.xMin, s.xMax, s.yMin, s.yMax].map((x) => par(x, w).v);
  if (!(b > a) || !(d > c)) throw new Error(w.badWindow);
  return [a, b, c, d];
}

function pointsOf(s: string, w: OdeWords): [number, number][] {
  if (!s.trim()) return [];
  const v = s.replace(/[()]/g, " ").split(/[\s,;]+/).filter(Boolean).map(Number);
  if (v.length % 2 || !v.every(Number.isFinite)) throw new Error(w.badPoints);
  return Array.from({ length: v.length / 2 }, (_, i) => [v[2 * i], v[2 * i + 1]] as [number, number]);
}

/** One RK4 step for y′ = f(x, y). */
function rk4(f: (x: number, y: number) => number, x: number, y: number, h: number): number {
  const k1 = f(x, y);
  const k2 = f(x + h / 2, y + (h / 2) * k1);
  const k3 = f(x + h / 2, y + (h / 2) * k2);
  const k4 = f(x + h, y + h * k3);
  return y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

/** RK4 solution through (x0, y0), both directions, as polyline point lists in pixels. */
function solutionPath(fr: Frame, f: (x: number, y: number) => number, x0: number, y0: number): string[] {
  const span = fr.y1 - fr.y0;
  const segs: string[] = [];
  for (const dir of [1, -1]) {
    const h = (dir * (fr.x1 - fr.x0)) / 800;
    const pts = [`${r2(fr.sx(x0))},${r2(fr.sy(y0))}`];
    let [x, y] = [x0, y0];
    for (let i = 0; i < 1000; i++) {
      const ny = rk4(f, x, y, h);
      x += h;
      // Stop at the edge, and where the slope blows up (y′ = −x/y at y = 0): no jumping across.
      if (!Number.isFinite(ny) || x < fr.x0 || x > fr.x1 || ny < fr.y0 - span || ny > fr.y1 + span || Math.abs(ny - y) > span / 25) break;
      y = ny;
      pts.push(`${r2(fr.sx(x))},${r2(fr.sy(y))}`);
    }
    if (pts.length > 1) segs.push(pts.join(" "));
  }
  return segs;
}

/** Short dashes with slope f(x, y) on a grid. */
function slopeField(fr: Frame, f: (x: number, y: number) => number, n = 21, color = "#adb5bd"): string {
  const [kx, ky] = [(fr.right - fr.left) / (fr.x1 - fr.x0), (fr.bottom - fr.top) / (fr.y1 - fr.y0)];
  const cell = Math.min((fr.right - fr.left) / n, (fr.bottom - fr.top) / n);
  const out: string[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = fr.x0 + ((i + 0.5) * (fr.x1 - fr.x0)) / n;
      const y = fr.y0 + ((j + 0.5) * (fr.y1 - fr.y0)) / n;
      const s = f(x, y);
      if (!Number.isFinite(s)) continue;
      const [dx, dy] = [kx, -ky * s];
      const len = Math.hypot(dx, dy);
      const [ux, uy] = [(dx / len) * cell * 0.36, (dy / len) * cell * 0.36];
      const [px, py] = [fr.sx(x), fr.sy(y)];
      out.push(`M${r2(px - ux)},${r2(py - uy)}L${r2(px + ux)},${r2(py + uy)}`);
    }
  return `<path d="${out.join("")}" stroke="${color}" stroke-width="1.4" stroke-linecap="round"/>`;
}

const PALETTE = [C.blue, C.red, C.green, C.purple, C.orange, "#0c8599"];

/** Does y(t) satisfy y′ = f(t, y) and y(t0) = y0? */
function verifyFirst(y: (t: number) => number, f: (t: number, y: number) => number, t0: number, y0: number, t1: number): boolean {
  if (Math.abs(y(t0) - y0) > 1e-6 * Math.max(1, Math.abs(y0))) return false;
  let n = 0;
  for (let i = 1; i < 30; i++) {
    const t = t0 + ((t1 - t0) * (i + 0.3)) / 30;
    const h = 1e-5 * Math.max(1, Math.abs(t));
    const d = (y(t + h) - y(t - h)) / (2 * h);
    const rhs = f(t, y(t));
    if (!Number.isFinite(d) || !Number.isFinite(rhs) || Math.abs(rhs) > 1e7) continue;
    if (Math.abs(d - rhs) > 1e-4 * Math.max(1, Math.abs(rhs))) return false;
    n++;
  }
  return n >= 3;
}

// ---------- slope field ----------

function renderField(s: FieldSpec, w: OdeWords): RenderedSvg {
  const f = fn2(s.expr, "x", "y");
  const [x0, x1, y0, y1] = window(s, w);
  const fr = makeFrame("of", 48, 6, 574, 380, [x0, x1], [y0, y1]);
  const parts = [axes(fr), slopeField(fr, f, 25)];
  pointsOf(s.points, w).forEach(([px, py], i) => {
    const color = PALETTE[i % PALETTE.length];
    parts.push(
      `<g clip-path="url(#of)" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round">${solutionPath(fr, f, px, py)
        .map((p) => `<polyline points="${p}"/>`)
        .join("")}</g>`,
      dot(fr.sx(px), fr.sy(py), color, 4.5),
    );
  });
  const tex = `\\frac{dy}{dx} = ${texOf(s.expr)}`;
  return compose(tex, parts.join(""), 396, [{ text: w.fieldHint }]);
}

// ---------- Euler's method ----------

function renderEuler(s: EulerSpec, w: OdeWords): RenderedSvg {
  const f = fn2(s.expr, "x", "y");
  const x0 = par(s.x0, w).v;
  const y0 = par(s.y0, w).v;
  const h = s.h > 0 ? s.h : 0.1;
  const n = Math.max(1, Math.min(200, Math.round(s.steps)));
  const xs = [x0];
  const ys = [y0];
  const slopes: number[] = [];
  for (let i = 0; i < n; i++) {
    const m = f(xs[i], ys[i]);
    slopes.push(m);
    xs.push(xs[i] + h);
    ys.push(ys[i] + h * m);
  }
  // Accurate reference: RK4 with 200 small steps per Euler step.
  const fine = (x: number) => {
    let y = y0;
    const k = Math.max(1, Math.ceil(((x - x0) / h) * 200));
    const dh = (x - x0) / k;
    for (let i = 0; i < k; i++) y = rk4(f, x0 + i * dh, y, dh);
    return y;
  };
  const xEnd = xs[n];
  const yTrue = fine(xEnd);

  const allY = [...ys, yTrue, ...Array.from({ length: 41 }, (_, i) => fine(x0 + ((xEnd - x0) * i) / 40))].filter(Number.isFinite);
  const [lo, hi] = [Math.min(...allY), Math.max(...allY)];
  const pad = (hi - lo) * 0.12 || 1;
  const xpad = (xEnd - x0) * 0.08;
  const fr = makeFrame("oe", 48, 6, 574, 360, [x0 - xpad, xEnd + xpad], [lo - pad, hi + pad]);
  const parts = [axes(fr), slopeField(fr, f, 19, "#dee2e6")];
  parts.push(`<g clip-path="url(#oe)" fill="none" stroke="${C.green}" stroke-width="2.6">${solutionPath(fr, f, x0, y0).map((p) => `<polyline points="${p}"/>`).join("")}</g>`);
  parts.push(`<polyline points="${xs.map((x, i) => `${r2(fr.sx(x))},${r2(fr.sy(ys[i]))}`).join(" ")}" fill="none" stroke="${C.orange}" stroke-width="2.2"/>`);
  if (n <= 60) xs.forEach((x, i) => parts.push(dot(fr.sx(x), fr.sy(ys[i]), C.orange, 3.6)));
  parts.push(
    lbl(fr.left + 10, fr.top + 18, "Euler", C.orange, "start", 13, false),
    lbl(fr.left + 10, fr.top + 37, "RK4", C.green, "start", 13, false),
  );

  // Step table (first rows, then the last one).
  const shown = n <= 6 ? [...Array(n + 1).keys()] : [0, 1, 2, 3, -1, n];
  const rows = shown
    .map((i) =>
      i < 0
        ? "\\vdots & \\vdots & \\vdots & \\vdots"
        : `${i} & ${nice(Math.round(xs[i] * 1e6) / 1e6)} & ${tn(ys[i])} & ${i < n ? tn(slopes[i]) : ""}`,
    )
    .join(" \\\\ ");
  const tex =
    `\\begin{gathered} \\frac{dy}{dx} = ${texOf(s.expr)}, \\quad y(${nice(x0)}) = ${nice(y0)}, \\quad h = ${nice(h)} \\qquad ` +
    `y_{n+1} = y_n + h\\,f(x_n, y_n) \\\\[4pt] ` +
    `\\begin{array}{c|c|c|c} n & x_n & y_n & f(x_n, y_n) \\\\ \\hline ${rows} \\end{array} \\end{gathered}`;
  const captions: Caption[] = [
    { text: fill(w.eulerResult, { h: nt(h), x: nt(xEnd), ye: nt(ys[n]), yt: nt(yTrue), err: nt(Math.abs(yTrue - ys[n])) }), color: C.orange },
    { text: w.eulerHint },
  ];
  return compose(tex, parts.join(""), 376, captions);
}

// ---------- first-order models ----------

function renderFirst(s: FirstSpec, w: OdeWords): RenderedSvg {
  const y0 = par(s.y0, w);
  const tMax = par(s.tMax, w).v;
  if (!(tMax > 0)) throw new Error(w.badWindow);
  let rows: [string, string][];
  let y: (t: number) => number;
  let f: (t: number, y: number) => number;
  let eqTex: string;
  const lines: number[] = [];
  const captions: Caption[] = [];

  if (s.kind === "growth") {
    const k = par(s.k, w);
    eqTex = `\\frac{dy}{dt} = ${k.tex}\\,y`;
    f = (_t, v) => k.v * v;
    y = (t) => y0.v * Math.exp(k.v * t);
    rows = [
      ["\\int \\frac{dy}{y}", `= \\int ${k.tex}\\,dt`],
      ["\\ln|y|", `= ${k.tex}\\,t + C`],
      ["y", `= C e^{${k.tex}\\,t}, \\qquad y(0) = ${y0.tex} \\Rightarrow C = ${y0.tex}`],
      ["y", `= ${times(y0.v, `e^{${k.tex}\\,t}`)}`],
    ];
    if (Math.abs(k.v) > 1e-12) captions.push({ text: fill(k.v > 0 ? w.doubling : w.halfLife, { t: nt(Math.LN2 / Math.abs(k.v), 3) }) });
  } else if (s.kind === "affine") {
    const k = par(s.k, w);
    const A = par(s.A, w);
    const Cc = y0.v - A.v;
    eqTex = `\\frac{dy}{dt} = ${k.tex}\\,(y - ${A.tex})`;
    f = (_t, v) => k.v * (v - A.v);
    y = (t) => A.v + Cc * Math.exp(k.v * t);
    rows = [
      [`\\int \\frac{dy}{y - ${A.tex}}`, `= \\int ${k.tex}\\,dt`],
      [`\\ln|y - ${A.tex}|`, `= ${k.tex}\\,t + C`],
      ["y", `= ${A.tex} + C e^{${k.tex}\\,t}, \\qquad C = ${y0.tex} - ${A.tex} = ${nice(Cc)}`],
      ["y", `= ${sumTex([A.tex, times(Cc, `e^{${k.tex}\\,t}`)])}`],
    ];
    lines.push(A.v);
    captions.push({ text: fill(k.v < 0 ? w.approach : w.leave, { A: nt(A.v) }) });
  } else if (s.kind === "logistic") {
    const r = par(s.k, w);
    const K = par(s.K, w);
    if (y0.v === 0) throw new Error(fill(w.badNumber, { s: s.y0 }));
    const Aq = (K.v - y0.v) / y0.v;
    eqTex = `\\frac{dy}{dt} = ${r.tex}\\,y\\left(1 - \\frac{y}{${K.tex}}\\right)`;
    f = (_t, v) => r.v * v * (1 - v / K.v);
    y = (t) => K.v / (1 + Aq * Math.exp(-r.v * t));
    rows = [
      [`\\int \\frac{${K.tex}\\,dy}{y(${K.tex} - y)}`, `= \\int \\left(\\frac{1}{y} + \\frac{1}{${K.tex} - y}\\right) dy = \\int ${r.tex}\\,dt`],
      [`\\ln\\left|\\frac{y}{${K.tex} - y}\\right|`, `= ${r.tex}\\,t + C`],
      ["y", `= \\frac{${K.tex}}{1 + A e^{-${r.tex}\\,t}}, \\qquad A = \\frac{${K.tex} - ${y0.tex}}{${y0.tex}} = ${nice(Aq)}`],
      ["y", `= \\frac{${K.tex}}{${sumTex(["1", times(Aq, `e^{-${r.tex}\\,t}`)])}}`],
    ];
    lines.push(0, K.v);
    if (Aq > 0 && r.v > 0) captions.push({ text: fill(w.logistic, { h: nt(K.v / 2), t: nt(Math.log(Aq) / r.v, 3) }) });
  } else {
    const p = par(s.p, w);
    const b = par(s.b, w);
    const c = par(s.c, w);
    const forcing = Math.abs(c.v) < 1e-12 ? b.tex : `${b.v === 1 ? "" : b.tex}e^{${c.tex}\\,t}`;
    eqTex = `\\frac{dy}{dt} + ${p.tex}\\,y = ${forcing}`;
    f = (t, v) => b.v * Math.exp(c.v * t) - p.v * v;
    const s2 = p.v + c.v;
    const mu = `e^{${p.tex}\\,t}`;
    rows = [[`\\mu`, `= e^{\\int ${p.tex}\\,dt} = ${mu}`], [`\\left(${mu}\\,y\\right)'`, `= ${times(b.v, expT(s2))}`]];
    if (Math.abs(s2) < 1e-12) {
      // Resonant case: the forcing matches the homogeneous solution.
      y = (t) => (b.v * t + y0.v) * Math.exp(-p.v * t);
      rows.push([`${mu}\\,y`, `= ${times(b.v, "t")} + C, \\qquad C = ${y0.tex}`], ["y", `= \\left(${sumTex([times(b.v, "t"), y0.tex])}\\right)e^{${times(-p.v, "t")}}`]);
    } else {
      const P = b.v / s2;
      const Cc = y0.v - P;
      y = (t) => P * Math.exp(c.v * t) + Cc * Math.exp(-p.v * t);
      rows.push(
        [`${mu}\\,y`, `= ${times(P, expT(s2))} + C`],
        ["y", `= ${sumTex([times(P, expT(c.v)) || nice(P), "C" + expT(-p.v)])}, \\qquad C = ${nice(Cc)}`],
        ["y", `= ${sumTex([Math.abs(c.v) < 1e-12 ? nice(P) : times(P, expT(c.v)), times(Cc, expT(-p.v))])}`],
      );
      if (Math.abs(c.v) < 1e-12 && p.v > 0) lines.push(P);
    }
  }

  const ok = verifyFirst(y, f, 0, y0.v, tMax);
  const ys = Array.from({ length: 201 }, (_, i) => y((tMax * i) / 200)).filter(Number.isFinite);
  const all = [...ys, ...lines, 0];
  const [lo, hi] = [Math.min(...all), Math.max(...all)];
  const pad = (hi - lo) * 0.1 || 1;
  const fr = makeFrame("o1", 48, 6, 574, 300, [0, tMax], [lo - pad, hi + pad]);
  const parts = [axes(fr, { xAtBottom: lo - pad > 0 }), slopeField(fr, f, 19, "#dee2e6")];
  lines.forEach((v) => parts.push(hline(fr, v, C.grey, `stroke-dasharray="6 4" stroke-width="1.4"`), lbl(fr.right - 6, fr.sy(v) - 5, `y = ${nt(v)}`, C.grey, "end", 12)));
  parts.push(curve(fr, y, C.blue, 2.8), dot(fr.sx(0), fr.sy(y0.v), C.blue, 4.5), lbl(fr.right - 6, fr.bottom - 8, "t", C.ink, "end", 14));

  const tex = `\\begin{aligned} & ${eqTex}, \\qquad y(0) = ${y0.tex} \\\\[3pt] ${rows.map(([l, r]) => `${l} &${r}`).join(" \\\\[3pt] ")} \\end{aligned}`;
  captions.push(ok ? { text: w.checked, color: C.green } : { text: w.checkFail, color: C.red });
  return compose(tex, parts.join(""), 316, captions);
}

// ---------- second-order linear ----------

function renderSecond(s: SecondSpec, w: OdeWords): RenderedSvg {
  const [a, b, c, F, om, y0, v0] = [s.a, s.b, s.c, s.F, s.w, s.y0, s.v0].map((x) => par(x, w));
  const tMax = par(s.tMax, w).v;
  if (a.v === 0) throw new Error(w.zeroA);
  if (!(tMax > 0)) throw new Error(w.badWindow);

  // Particular solution for F·cos(ωt).
  const forced = Math.abs(F.v) > 1e-12;
  let yp = (_t: number) => 0;
  let ypd = (_t: number) => 0;
  let ypTex = "";
  let resonant = false;
  if (forced) {
    const W = om.v;
    const m = c.v - a.v * W * W;
    const n = b.v * W;
    const det = m * m + n * n;
    if (det < 1e-12) {
      resonant = true;
      const k = F.v / (2 * a.v * W);
      yp = (t) => k * t * Math.sin(W * t);
      ypd = (t) => k * (Math.sin(W * t) + W * t * Math.cos(W * t));
      ypTex = times(k, `t\\sin(${nice(W)}t)`);
    } else {
      const P = (F.v * m) / det;
      const Q = (F.v * n) / det;
      yp = (t) => P * Math.cos(W * t) + Q * Math.sin(W * t);
      ypd = (t) => -P * W * Math.sin(W * t) + Q * W * Math.cos(W * t);
      ypTex = sumTex([times(P, `\\cos(${nice(W)}t)`), times(Q, `\\sin(${nice(W)}t)`)]);
    }
  }
  const Y0 = y0.v - yp(0);
  const V0 = v0.v - ypd(0);

  const D = b.v * b.v - 4 * a.v * c.v;
  const rows: [string, string][] = [[`${sumTex([times(a.v, "r^2"), times(b.v, "r"), nice(c.v)])}`, `= 0`]];
  let yh: (t: number) => number;
  let yhTex: string;
  let consts: string;
  let envelope: ((t: number) => number) | null = null;
  const al = -b.v / (2 * a.v);
  if (D > 1e-12) {
    const sq = Math.sqrt(D);
    const [r1, r2] = [(-b.v + sq) / (2 * a.v), (-b.v - sq) / (2 * a.v)];
    const C2 = (V0 - r1 * Y0) / (r2 - r1);
    const C1 = Y0 - C2;
    yh = (t) => C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t);
    rows.push(["r", `= \\frac{${nice(-b.v)} \\pm \\sqrt{${nice(D)}}}{${nice(2 * a.v)}} = ${nice(r1)},\\ ${nice(r2)}`]);
    rows.push(["y_h", `= C_1 ${expT(r1)} + C_2 ${expT(r2)}`]);
    consts = `C_1 = ${nice(C1)},\\ C_2 = ${nice(C2)}`;
    yhTex = sumTex([times(C1, expT(r1)) || (Math.abs(r1) < 1e-12 ? nice(C1) : ""), times(C2, expT(r2)) || (Math.abs(r2) < 1e-12 ? nice(C2) : "")]);
  } else if (D > -1e-12) {
    const C1 = Y0;
    const C2 = V0 - al * Y0;
    yh = (t) => (C1 + C2 * t) * Math.exp(al * t);
    rows.push(["r", `= ${nice(al)} \\ \\text{(double root)}`]);
    rows.push(["y_h", `= (C_1 + C_2\\,t)${expT(al)}`]);
    consts = `C_1 = ${nice(C1)},\\ C_2 = ${nice(C2)}`;
    yhTex = `\\left(${sumTex([nice(C1) === "0" ? "" : nice(C1), times(C2, "t")])}\\right)${expT(al)}`;
  } else {
    const be = Math.sqrt(-D) / (2 * Math.abs(a.v));
    const C1 = Y0;
    const C2 = (V0 - al * Y0) / be;
    yh = (t) => Math.exp(al * t) * (C1 * Math.cos(be * t) + C2 * Math.sin(be * t));
    const amp = Math.hypot(C1, C2);
    envelope = (t) => amp * Math.exp(al * t);
    rows.push(["r", `= ${Math.abs(al) < 1e-12 ? "" : nice(al) + " "}\\pm ${Math.abs(be - 1) < 1e-12 ? "" : nice(be) + "\\,"}i`]);
    rows.push(["y_h", `= ${expT(al)}\\left(C_1\\cos ${nice(be)}t + C_2 \\sin ${nice(be)}t\\right)`]);
    consts = `C_1 = ${nice(C1)},\\ C_2 = ${nice(C2)}`;
    const inner = sumTex([times(C1, `\\cos ${nice(be)}t`), times(C2, `\\sin ${nice(be)}t`)]);
    yhTex = Math.abs(al) < 1e-12 ? inner : `${expT(al)}\\left(${inner}\\right)`;
  }
  if (forced) rows.push(["y_p", `= ${ypTex}`]);
  rows.push([`y(0) = ${y0.tex},\\ y'(0) = ${v0.tex}`, `\\ \\Rightarrow\\ ${consts}`]);
  const yhPart = yhTex === "0" || /^\\left\(0\\right\)/.test(yhTex) ? "" : yhTex;
  // A long homogeneous part and a particular part go on two lines.
  if (yhPart && ypTex && yhPart.length + ypTex.length > 90) rows.push(["y", `= ${yhPart}`], ["", `\\quad ${ypTex.startsWith("-") ? ypTex : "+ " + ypTex}`]);
  else rows.push(["y", `= ${sumTex([yhPart, ypTex])}`]);

  const y = (t: number) => yh(t) + yp(t);
  // Check a·y″ + b·y′ + c·y = F·cos(ωt) and the initial values.
  let ok = Math.abs(y(0) - y0.v) < 1e-6 && Math.abs((y(1e-5) - y(-1e-5)) / 2e-5 - v0.v) < 1e-4 * Math.max(1, Math.abs(v0.v));
  for (let i = 1; i < 25 && ok; i++) {
    const t = (tMax * (i + 0.3)) / 25;
    const h = 1e-3;
    const [ym, yc, yq] = [y(t - h), y(t), y(t + h)];
    const res = a.v * ((yq - 2 * yc + ym) / (h * h)) + b.v * ((yq - ym) / (2 * h)) + c.v * yc - F.v * Math.cos(om.v * t);
    const scale = Math.max(1, Math.abs(c.v * yc), Math.abs(F.v));
    if (Number.isFinite(res) && Math.abs(res) > 1e-3 * scale) ok = false;
  }

  const ys = Array.from({ length: 401 }, (_, i) => y((tMax * i) / 400)).filter(Number.isFinite);
  const m = Math.max(...ys.map(Math.abs), 0.1);
  const fr = makeFrame("o2", 48, 6, 574, 280, [0, tMax], [-m * 1.12, m * 1.12]);
  const parts = [axes(fr)];
  if (envelope && Math.abs(al) > 1e-12 && !forced) {
    const env = envelope;
    parts.push(curve(fr, env, C.grey, 1.4, `stroke-dasharray="5 4"`), curve(fr, (t) => -env(t), C.grey, 1.4, `stroke-dasharray="5 4"`));
  }
  if (resonant) {
    const k = Math.abs(F.v / (2 * a.v * om.v));
    parts.push(curve(fr, (t) => k * t, C.red, 1.4, `stroke-dasharray="5 4"`), curve(fr, (t) => -k * t, C.red, 1.4, `stroke-dasharray="5 4"`));
  }
  parts.push(curve(fr, y, C.blue, 2.6, "", 0, tMax, 1500), dot(fr.sx(0), fr.sy(y0.v), C.blue, 4.5), lbl(fr.right - 6, fr.bottom - 8, "t", C.ink, "end", 14));

  const forcing = forced ? times(F.v, `\\cos(${nice(om.v)}t)`) : "0";
  const eq = `${sumTex([times(a.v, "y''"), times(b.v, "y'"), times(c.v, "y")])} = ${forcing}`;
  const tex = `\\begin{aligned} & ${eq} \\\\[3pt] ${rows.map(([l, r]) => `${l} &${r}`).join(" \\\\[3pt] ")} \\end{aligned}`;

  const captions: Caption[] = [];
  if (resonant) captions.push({ text: w.resonance, color: C.red });
  else if (a.v > 0 && c.v > 0 && b.v >= 0 && !forced)
    captions.push({ text: b.v === 0 ? w.damping.none : D > 1e-12 ? w.damping.over : D > -1e-12 ? w.damping.critical : w.damping.under });
  else if (al > 0 || (D > 0 && (-b.v + Math.sqrt(D)) / (2 * a.v) > 0)) captions.push({ text: w.damping.growing, color: C.red });
  captions.push(ok ? { text: w.checked, color: C.green } : { text: w.checkFail, color: C.red });
  return compose(tex, parts.join(""), 296, captions);
}

// ---------- phase plane ----------

function classify(a: number, b: number, c: number, d: number): { type: PhaseType; l1: string; l2: string; real: [number, number] | null } {
  const T = a + d;
  const D = a * d - b * c;
  const disc = T * T - 4 * D;
  const eps = 1e-9;
  let type: PhaseType;
  if (Math.abs(D) < eps) type = "degenerate";
  else if (D < 0) type = "saddle";
  else if (disc >= -eps) type = T < 0 ? "stableNode" : "unstableNode";
  else if (Math.abs(T) < eps) type = "center";
  else type = T < 0 ? "stableSpiral" : "unstableSpiral";
  if (disc >= -eps) {
    const sq = Math.sqrt(Math.max(0, disc));
    const [l1, l2] = [(T + sq) / 2, (T - sq) / 2];
    return { type, l1: nice(l1), l2: nice(l2), real: [l1, l2] };
  }
  const re = T / 2;
  const im = Math.sqrt(-disc) / 2;
  const imT = Math.abs(im - 1) < eps ? "i" : `${nice(im)}\\,i`;
  const z = (sg: string) => `${Math.abs(re) < eps ? "" : nice(re) + " "}${sg} ${imT}`.replace(/^ ?\+ /, "").trim();
  return { type, l1: z("+"), l2: z("-"), real: null };
}

function renderPhase(s: PhaseSpec, w: OdeWords): RenderedSvg {
  const f = fn2(s.f, "x", "y");
  const g = fn2(s.g, "x", "y");
  const [x0, x1, y0, y1] = window(s, w);
  const fr = makeFrame("op", 48, 6, 574, 390, [x0, x1], [y0, y1]);
  const parts = [axes(fr)];

  // Direction arrows on a grid.
  const n = 19;
  const [kx, ky] = [(fr.right - fr.left) / (x1 - x0), (fr.bottom - fr.top) / (y1 - y0)];
  const cell = Math.min((fr.right - fr.left) / n, (fr.bottom - fr.top) / n);
  const arrows: string[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = x0 + ((i + 0.5) * (x1 - x0)) / n;
      const y = y0 + ((j + 0.5) * (y1 - y0)) / n;
      const [u, v] = [f(x, y) * kx, -g(x, y) * ky];
      const len = Math.hypot(u, v);
      if (!Number.isFinite(len) || len < 1e-12) continue;
      const [ux, uy] = [(u / len) * cell * 0.38, (v / len) * cell * 0.38];
      const [px, py] = [fr.sx(x), fr.sy(y)];
      const [hx, hy] = [px + ux, py + uy];
      arrows.push(
        `M${r2(px - ux)},${r2(py - uy)}L${r2(hx)},${r2(hy)}` +
          `M${r2(hx - ux * 0.5 - uy * 0.35)},${r2(hy - uy * 0.5 + ux * 0.35)}L${r2(hx)},${r2(hy)}L${r2(hx - ux * 0.5 + uy * 0.35)},${r2(hy - uy * 0.5 - ux * 0.35)}`,
      );
    }
  parts.push(`<path d="${arrows.join("")}" stroke="#adb5bd" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);

  // Linear system? Then eigenvalues, the type and the eigenvector lines.
  const h = 1e-4;
  const [a, b, c, d] = [(f(h, 0) - f(-h, 0)) / (2 * h), (f(0, h) - f(0, -h)) / (2 * h), (g(h, 0) - g(-h, 0)) / (2 * h), (g(0, h) - g(0, -h)) / (2 * h)];
  const linear = [[0.7, -1.3], [2.1, 0.4], [-1.7, 2.6], [0, 0]].every(([x, y]) => Math.abs(f(x, y) - (a * x + b * y)) < 1e-6 && Math.abs(g(x, y) - (c * x + d * y)) < 1e-6);
  let tex: string;
  const captions: Caption[] = [];
  if (linear) {
    const cl = classify(a, b, c, d);
    if (cl.real && cl.type !== "degenerate") {
      for (const l of cl.real) {
        const [ex, ey] = Math.abs(b) > 1e-9 ? [b, l - a] : Math.abs(c) > 1e-9 ? [l - d, c] : Math.abs(l - a) < 1e-9 ? [1, 0] : [0, 1];
        const L = Math.hypot(ex, ey);
        const big = (x1 - x0 + y1 - y0) * 2;
        const [dx, dy] = [(ex / L) * big, (ey / L) * big];
        parts.push(`<line clip-path="url(#op)" x1="${r2(fr.sx(-dx))}" y1="${r2(fr.sy(-dy))}" x2="${r2(fr.sx(dx))}" y2="${r2(fr.sy(dy))}" stroke="${C.orange}" stroke-width="1.8" stroke-dasharray="7 5"/>`);
      }
    }
    const M = `\\begin{pmatrix} ${nice(a)} & ${nice(b)} \\\\ ${nice(c)} & ${nice(d)} \\end{pmatrix}`;
    tex =
      `\\begin{pmatrix} x \\\\ y \\end{pmatrix}' = ${M}\\begin{pmatrix} x \\\\ y \\end{pmatrix} \\qquad ` +
      `\\operatorname{tr} = ${nice(a + d)},\\ \\det = ${nice(a * d - b * c)} \\qquad \\lambda_{1,2} = ${cl.l1},\\ ${cl.l2}`;
    captions.push({ text: w.types[cl.type], color: /stable|center/i.test(cl.type) && !/unstable/i.test(cl.type) ? C.green : cl.type === "degenerate" ? C.grey : C.red });
  } else {
    tex = `x' = ${texOf(s.f)}, \\qquad y' = ${texOf(s.g)}`;
    captions.push({ text: w.nonlinear });
  }
  captions.push({ text: w.phaseHint });

  // Trajectories from each start point, forwards and backwards in time.
  const span = Math.max(x1 - x0, y1 - y0);
  pointsOf(s.points, w).forEach(([px, py], i) => {
    const color = PALETTE[i % PALETTE.length];
    const segs: string[] = [];
    let mid: [number, number, number, number] | null = null;
    for (const dir of [1, -1]) {
      let [x, y] = [px, py];
      const pts = [`${r2(fr.sx(x))},${r2(fr.sy(y))}`];
      const dt = (dir * span) / 1500;
      for (let k = 0; k < 6000; k++) {
        const step = (X: number, Y: number): [number, number] => [f(X, Y), g(X, Y)];
        const k1 = step(x, y);
        const k2 = step(x + (dt / 2) * k1[0], y + (dt / 2) * k1[1]);
        const k3 = step(x + (dt / 2) * k2[0], y + (dt / 2) * k2[1]);
        const k4 = step(x + dt * k3[0], y + dt * k3[1]);
        const [nx, ny] = [x + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
        if (!Number.isFinite(nx) || !Number.isFinite(ny) || nx < x0 - span || nx > x1 + span || ny < y0 - span || ny > y1 + span) break;
        if (dir === 1 && k === 120) mid = [x, y, nx - x, ny - y];
        [x, y] = [nx, ny];
        pts.push(`${r2(fr.sx(x))},${r2(fr.sy(y))}`);
        if (Math.hypot(k1[0], k1[1]) < 1e-6) break;
      }
      segs.push(pts.join(" "));
    }
    parts.push(`<g clip-path="url(#op)" fill="none" stroke="${color}" stroke-width="2.3" stroke-linejoin="round">${segs.map((p) => `<polyline points="${p}"/>`).join("")}</g>`);
    if (mid) {
      const [mx, my, dx, dy] = mid;
      const [u, v] = [dx * kx, -dy * ky];
      const L = Math.hypot(u, v) || 1;
      const [ux, uy] = [(u / L) * 9, (v / L) * 9];
      const [hx, hy] = [fr.sx(mx), fr.sy(my)];
      parts.push(`<path d="M${r2(hx - ux - uy * 0.6)},${r2(hy - uy + ux * 0.6)}L${r2(hx + ux * 0.4)},${r2(hy + uy * 0.4)}L${r2(hx - ux + uy * 0.6)},${r2(hy - uy - ux * 0.6)}z" fill="${color}"/>`);
    }
    parts.push(dot(fr.sx(px), fr.sy(py), color, 3.8));
  });
  return compose(tex, parts.join(""), 406, captions);
}

export function renderOde(spec: OdeSpec, words: OdeWords): RenderedSvg {
  switch (spec.topic) {
    case "field":
      return renderField(spec, words);
    case "euler":
      return renderEuler(spec, words);
    case "first":
      return renderFirst(spec, words);
    case "second":
      return renderSecond(spec, words);
    case "phase":
      return renderPhase(spec, words);
  }
}
