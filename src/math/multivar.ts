// Calculus in several variables, one step at a time: partial derivatives (each one the slope of a slice of the surface
// z = f(x, y) through the point, every other letter held constant), the gradient (uphill, at right angles to the
// contour through the point), the chain rule through x(t) and y(t) drawn as a computation graph (the paths from t to f
// multiplied along and added up, as backprop does), the Jacobian of a map (x, y) ↦ (u, v) (a small square near the
// point turned into a parallelogram about |det J| times its area), and the Hessian (its eigenvalues are the
// curvatures: a minimum, a maximum or a saddle). The derivatives come from the rule-by-rule engine of derive.ts, and
// every value is checked against a numerical one.
import { arrow, axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nt, r2, texLines, W, yRange, contours, type Caption, type Frame, type TexLine } from "./chart";
import { partial } from "./derive";
import { add, approx, evalE, exprMessages, has, isNum, mul, parseE, simp, substitute, tex, tidy, type E } from "./expr";
import type { RenderedSvg } from "./latex";

export type MvTopic = "partial" | "gradient" | "chain" | "jacobian" | "hessian" | "convex" | "lagrange";
export const MV_TOPICS: MvTopic[] = ["partial", "gradient", "chain", "jacobian", "hessian", "convex", "lagrange"];
/** What a picture is made from: the function (for the chain rule also x(t) and y(t); for the Jacobian u and v; for
 * Lagrange the constraint's g), and the point (for the chain rule, the value of t; for convexity the middle of the map;
 * for Lagrange the constraint's c). */
export type MvSpec = { topic: MvTopic; src: string[]; at: string };

export type MvWords = {
  bad: string;
  tooBig: string;
  onlyX: string;
  onlyT: string;
  needPoint: string;
  needT: string;
  notDefined: string;
  holdY: string;
  holdX: string;
  atPoint: string;
  check: string;
  partial: { sliceX: string; sliceY: string; summary: string };
  gradient: { partials: string; grad: string; length: string; level: string; summary: string; flat: string; legend: { grad: string; level: string; field: string } };
  chain: { rule: string; partials: string; inner: string; together: string; values: string; total: string; check: string; summary: string; pathX: string; pathY: string; sum: string };
  jacobian: { matrix: string; det: string; summary: string; flipped: string; flat: string; legend: { square: string; linear: string } };
  hessian: {
    second: string;
    symmetric: string;
    matrix: string;
    grad: string;
    eigen: string;
    curvatures: string;
    min: string;
    max: string;
    saddle: string;
    flat: string;
    notStationary: string;
    descent: string;
    legend: string;
  };
  convex: {
    second: string;
    test: string;
    everywhere: string;
    fails: string;
    stationary: string;
    none: string;
    convex: string;
    notConvex: string;
    minima: string;
    oneMin: string;
    lower: string;
    saddles: string;
    chord: string;
    kinds: { min: string; max: string; saddle: string; flat: string; global: string };
    legend: { shade: string; chord: string };
  };
  lagrange: {
    grads: string;
    system: string;
    found: string;
    none: string;
    needC: string;
    summary: string;
    one: string;
    lambda: string;
    max: string;
    min: string;
    legend: { gradF: string; gradG: string; constraint: string; level: string };
  };
};

// ---------- reading ----------

/** The function: x and y, with e and π, tidied (2x y reads 2xy). */
const readF = (s: string, w: MvWords) => {
  if (!s.trim()) throw new Error(fill(w.bad, { s: "" }));
  return tidy(parseE(s, ["y"]));
};
/** A number typed: 2, −1/2, pi/4 (nothing with a letter but e and π). */
function readNumber(s: string, err: string): E {
  if (!s.trim()) throw new Error(err);
  let e: E;
  try {
    e = simp(parseE(s));
  } catch {
    throw new Error(err);
  }
  if (has(e) || !Number.isFinite(evalE(e, 0))) throw new Error(err);
  return e;
}
/** The point (a, b), typed as 1, 2 or (1, 2). */
export function readPoint(s: string, w: MvWords): [E, E] {
  const parts = s.trim().replace(/^\(|\)$/g, "").split(/[,;]/);
  if (parts.length !== 2) throw new Error(w.needPoint);
  return [readNumber(parts[0], w.needPoint), readNumber(parts[1], w.needPoint)];
}

/** f at (a, b): exact when the substitution leaves a number. */
const atPoint = (f: E, a: E, b: E) => simp(substitute(substitute(f, "x", a), "y", b));
const value = (f: E, a: number, b: number) => evalE(f, a, { y: b });
/** A value in LaTeX: a fraction when exact, else four decimals. */
function valTex(e: E, v: number): string {
  if (isNum(e)) return e.v.tex();
  return approx(clean(v)).replace("−", "-");
}
const clean = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
/** A value worked out by small steps: what is left below 10⁻⁸ is rounding, so it reads 0. */
const tiny = (v: number) => (Math.abs(v) < 1e-8 ? 0 : v);
/** A value squared, in brackets when it is negative or a fraction: (−1)², not −1². */
export const squared = (v: string) => (/^-|\\frac/.test(v) ? `\\left(${v}\\right)^{2}` : `${v}^{2}`);
const ptTex = (a: E, b: E) => `\\left(${tex(a)}, ${tex(b)}\\right)`;
const ptText = (a: number, b: number) => `(${nt(a, 3)}, ${nt(b, 3)})`;
/** The numerical partial derivatives at (a, b), by central differences. */
const numPartials = (f: E, a: number, b: number): [number, number] => {
  const h = 1e-5;
  return [(value(f, a + h, b) - value(f, a - h, b)) / (2 * h), (value(f, a, b + h) - value(f, a, b - h)) / (2 * h)];
};
const DX = "\\frac{\\partial f}{\\partial x}";
const DY = "\\frac{\\partial f}{\\partial y}";

/** The rows that take a partial derivative, from ∂/∂v (f) down to the result. */
function partialRows(f: E, v: "x" | "y", w: MvWords, color: string): { rows: TexLine[]; d: E } {
  const r = partial(f, v);
  const head = v === "x" ? DX : DY;
  const rows: TexLine[] = [{ tex: `${head} = \\frac{\\partial}{\\partial ${v}}\\left(${tex(f)}\\right)`, op: v === "x" ? w.holdY : w.holdX }, ...r.rows];
  rows[rows.length - 1] = { ...rows[rows.length - 1], color };
  return { rows, d: r.result };
}

/** A caption checking a derivative against a numerical one. */
const checkCap = (w: MvWords, p: string, pairs: [string, number, number][]): Caption => ({
  text: fill(w.check, { p, list: pairs.map(([name, n, d]) => `${name} ≈ ${nt(tiny(n), 4)} (${nt(tiny(d), 4)})`).join(", ") }),
  color: C.green,
});

// ---------- partial derivatives ----------

/** A slice: one variable moving, the other held, with the tangent at the point. */
function slice(id: string, g: (t: number) => number, at: number, m: number, color: string, x0: number, width: number, top: number, title: string, axisName: string): string {
  const [t0, t1] = [at - 3, at + 3];
  const ys = Array.from({ length: 301 }, (_, i) => g(t0 + ((t1 - t0) * i) / 300)).filter(Number.isFinite);
  const fr = makeFrame(id, x0, top + 22, width, 210, [t0, t1], yRange(ys, [g(at)]));
  const tangent = (t: number) => g(at) + m * (t - at);
  return (
    `<text x="${r2(x0 + width / 2)}" y="${top + 12}" ${FONT} font-size="13" font-weight="700" fill="${color}" text-anchor="middle">${esc(title)}</text>` +
    axes(fr) +
    curve(fr, g, color, 2.4) +
    curve(fr, tangent, color, 1.8, `stroke-dasharray="7 5" opacity="0.8"`) +
    dot(fr.sx(at), fr.sy(g(at)), color, 5) +
    lbl(fr.right - 4, fr.bottom - 6, axisName, "#495057", "end", 12)
  );
}

function renderPartial(s: MvSpec, w: MvWords): RenderedSvg {
  const f = readF(s.src[0] ?? "", w);
  const [aE, bE] = readPoint(s.at, w);
  const [a, b] = [evalE(aE, 0), evalE(bE, 0)];
  const px = partialRows(f, "x", w, C.blue);
  const py = partialRows(f, "y", w, C.orange);
  const [mx, my] = [value(px.d, a, b), value(py.d, a, b)];
  if (![value(f, a, b), mx, my].every(Number.isFinite)) throw new Error(fill(w.notDefined, { p: ptText(a, b) }));
  const rows: TexLine[] = [
    ...px.rows,
    ...py.rows,
    { tex: `${DX}${ptTex(aE, bE)} = ${valTex(atPoint(px.d, aE, bE), mx)}, \\quad ${DY}${ptTex(aE, bE)} = ${valTex(atPoint(py.d, aE, bE), my)}`, op: w.atPoint, color: C.green },
  ];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 10;
  const half = (W - 3 * 40) / 2;
  body.push(slice("mv-sx", (t) => value(f, t, b), a, mx, C.blue, 48, half, y, fill(w.partial.sliceX, { b: nt(b, 3), m: nt(mx, 3) }), "x"));
  body.push(slice("mv-sy", (t) => value(f, a, t), b, my, C.orange, 48 + half + 40, half, y, fill(w.partial.sliceY, { a: nt(a, 3), m: nt(my, 3) }), "y"));
  y += 22 + 210 + 24;
  const [nx, ny] = numPartials(f, a, b);
  return compose(`f(x, y) = ${tex(f)}`, body.join(""), y, [{ text: w.partial.summary, color: "#495057" }, checkCap(w, ptText(a, b), [["∂f/∂x", nx, mx], ["∂f/∂y", ny, my]])]);
}

// ---------- contour maps ----------

/** A square map around (a, b), equal scales both ways so that right angles look right. */
function mapFrame(id: string, a: number, b: number, half: number, left: number, top: number, size: number): Frame {
  return makeFrame(id, left, top, size, size, [a - half, a + half], [b - half, b + half]);
}
/** Level values for a map: spread between the 3rd and 97th percentile of f over the frame, one through the point; evenly,
 * or (`near`) packed close to the point's level, k² steps away, so that the shape near a stationary point shows. */
function levelsOf(fr: Frame, g: (x: number, y: number) => number, through: number, count = 11, near = false): number[] {
  const vs: number[] = [];
  for (let i = 0; i <= 30; i++) for (let j = 0; j <= 30; j++) vs.push(g(fr.x0 + ((fr.x1 - fr.x0) * i) / 30, fr.y0 + ((fr.y1 - fr.y0) * j) / 30));
  const fin = vs.filter(Number.isFinite).sort((p, q) => p - q);
  if (!fin.length) return [through];
  const [lo, hi] = [fin[Math.floor(fin.length * 0.03)], fin[Math.ceil(fin.length * 0.97) - 1]];
  if (hi - lo < 1e-9) return [through];
  if (near) {
    const reach = Math.max(hi - through, through - lo);
    const c = reach / (count * count);
    const out: number[] = [];
    for (let k = 1; k <= count; k++) for (const v of [through + c * k * k, through - c * k * k]) if (v >= lo && v <= hi) out.push(v);
    return out;
  }
  const step = (hi - lo) / count;
  // Shifted so that one level passes through the point.
  const k0 = Math.ceil((lo - through) / step);
  const out: number[] = [];
  for (let k = k0; through + k * step <= hi; k++) if (k !== 0) out.push(through + k * step);
  return out;
}

// ---------- the gradient ----------

function renderGradient(s: MvSpec, w: MvWords): RenderedSvg {
  const W_ = w.gradient;
  const f = readF(s.src[0] ?? "", w);
  const [aE, bE] = readPoint(s.at, w);
  const [a, b] = [evalE(aE, 0), evalE(bE, 0)];
  const fx = partial(f, "x").result;
  const fy = partial(f, "y").result;
  const [p, q] = [clean(value(fx, a, b)), clean(value(fy, a, b))];
  const fab = value(f, a, b);
  if (![fab, p, q].every(Number.isFinite)) throw new Error(fill(w.notDefined, { p: ptText(a, b) }));
  const [pE, qE] = [atPoint(fx, aE, bE), atPoint(fy, aE, bE)];
  const len = Math.hypot(p, q);
  const flat = len < 1e-9;
  const rows: TexLine[] = [
    { tex: `${DX} = ${tex(fx)}, \\quad ${DY} = ${tex(fy)}`, op: W_.partials },
    { tex: `\\nabla f = \\left(${DX}, ${DY}\\right) = \\left(${tex(fx)}, ${tex(fy)}\\right)`, op: W_.grad },
    { tex: `\\nabla f${ptTex(aE, bE)} = \\left(${valTex(pE, p)}, ${valTex(qE, q)}\\right)`, op: w.atPoint, color: C.red },
    { tex: `\\left|\\nabla f\\right| = \\sqrt{${squared(valTex(pE, p))} + ${squared(valTex(qE, q))}} \\approx ${approx(len).replace("−", "-")}`, op: W_.length },
  ];
  if (!flat) rows.push({ tex: `\\nabla f \\cdot \\left(${approx(-q).replace("−", "-")}, ${approx(p).replace("−", "-")}\\right) = 0`, op: W_.level, color: C.green });
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 10;
  const size = 380;
  const fr = mapFrame("mv-grad", a, b, 2.5, (W - size) / 2, y, size);
  const g = (x: number, yy: number) => value(f, x, yy);
  const parts = [axes(fr), contours(fr, g, levelsOf(fr, g, fab), "#adb5bd", 1.2)];
  // The field of gradients on a grid, each scaled to its share of the largest.
  const grid: [number, number, number, number][] = [];
  for (let i = 0; i <= 8; i++)
    for (let j = 0; j <= 8; j++) {
      const [x, yy] = [fr.x0 + 0.3 + (i * (fr.x1 - fr.x0 - 0.6)) / 8, fr.y0 + 0.3 + (j * (fr.y1 - fr.y0 - 0.6)) / 8];
      const [gx, gy] = [value(fx, x, yy), value(fy, x, yy)];
      if (Number.isFinite(gx) && Number.isFinite(gy)) grid.push([x, yy, gx, gy]);
    }
  const big = Math.max(1e-12, ...grid.map(([, , gx, gy]) => Math.hypot(gx, gy)));
  for (const [x, yy, gx, gy] of grid) {
    const k = (0.22 + 0.33 * Math.sqrt(Math.hypot(gx, gy) / big)) / (Math.hypot(gx, gy) || 1);
    parts.push(arrow(fr.sx(x), fr.sy(yy), fr.sx(x + gx * k), fr.sy(yy + gy * k), "#ced4da", 1.4));
  }
  parts.push(contours(fr, g, [fab], C.green, 2.6));
  if (!flat) {
    const [ux, uy] = [p / len, q / len];
    parts.push(`<line x1="${r2(fr.sx(a - 1.2 * uy))}" y1="${r2(fr.sy(b + 1.2 * ux))}" x2="${r2(fr.sx(a + 1.2 * uy))}" y2="${r2(fr.sy(b - 1.2 * ux))}" stroke="${C.green}" stroke-width="1.8" stroke-dasharray="7 5"/>`);
    parts.push(arrow(fr.sx(a), fr.sy(b), fr.sx(a + 1.2 * ux), fr.sy(b + 1.2 * uy), C.red, 3.2));
    parts.push(lbl(fr.sx(a + 1.3 * ux), fr.sy(b + 1.3 * uy), "∇f", C.red, ux >= 0 ? "start" : "end", 15));
  }
  parts.push(dot(fr.sx(a), fr.sy(b), C.ink, 5));
  body.push(`<g>${parts.join("")}</g>`);
  body.push(legendRow(fr.left, fr.bottom + 22, [
    { text: W_.legend.grad, color: C.red },
    { text: W_.legend.level, color: C.green },
    { text: W_.legend.field, color: "#adb5bd" },
  ]));
  y = fr.bottom + 34;
  const [nx, ny] = numPartials(f, a, b);
  return compose(`f(x, y) = ${tex(f)}`, body.join(""), y, [{ text: flat ? W_.flat : W_.summary, color: "#495057" }, checkCap(w, ptText(a, b), [["∂f/∂x", nx, p], ["∂f/∂y", ny, q]])]);
}

/** A row of coloured names under a picture. */
function legendRow(x: number, y: number, items: { text: string; color: string }[]): string {
  let s = "";
  let at = x;
  for (const it of items) {
    s += `<rect x="${r2(at)}" y="${r2(y - 9)}" width="14" height="4" fill="${it.color}"/><text x="${r2(at + 19)}" y="${r2(y - 4)}" ${FONT} font-size="12" fill="#495057">${esc(it.text)}</text>`;
    at += 19 + it.text.length * 6.6 + 18;
  }
  return s;
}

// ---------- the chain rule ----------

function renderChain(s: MvSpec, w: MvWords): RenderedSvg {
  const Ch = w.chain;
  const f = readF(s.src[0] ?? "", w);
  const inner = (src: string) => {
    if (!src.trim()) throw new Error(w.onlyT);
    const e = tidy(parseE(src, ["t"]));
    if (has(e, "x") || has(e, "y")) throw new Error(w.onlyT);
    return e;
  };
  const [xt, yt] = [inner(s.src[1] ?? ""), inner(s.src[2] ?? "")];
  const tE = readNumber(s.at, w.needT);
  const t = evalE(tE, 0);
  const fx = partial(f, "x").result;
  const fy = partial(f, "y").result;
  const xd = partial(xt, "t").result;
  const yd = partial(yt, "t").result;
  const T = (e: E) => evalE(e, 0, { t });
  const [x0, y0] = [T(xt), T(yt)];
  const [px, py, dx, dy] = [value(fx, x0, y0), value(fy, x0, y0), T(xd), T(yd)];
  const total = px * dx + py * dy;
  if (![x0, y0, value(f, x0, y0), px, py, dx, dy].every(Number.isFinite)) throw new Error(fill(w.notDefined, { p: `t = ${nt(t, 3)}` }));
  // f in terms of t alone: x and y put in.
  const both = simp(add(mul(fx, xd), mul(fy, yd)));
  const inT = simp(substitute(substitute(both, "x", xt), "y", yt));
  const n = (v: number) => approx(clean(v)).replace("−", "-");
  const p = (v: number) => (v < 0 ? `\\left(${n(v)}\\right)` : n(v));
  const rows: TexLine[] = [
    { tex: `\\frac{df}{dt} = ${DX}\\,\\frac{dx}{dt} + ${DY}\\,\\frac{dy}{dt}`, op: Ch.rule },
    { tex: `${DX} = ${tex(fx)}, \\quad ${DY} = ${tex(fy)}`, op: Ch.partials },
    { tex: `x = ${tex(xt)}, \\; \\frac{dx}{dt} = ${tex(xd)}, \\quad y = ${tex(yt)}, \\; \\frac{dy}{dt} = ${tex(yd)}`, op: Ch.inner },
    { tex: `\\frac{df}{dt} = ${tex(inT)}`, op: Ch.together },
    { tex: `t = ${tex(tE)}: \\; x = ${n(x0)}, \\; y = ${n(y0)}`, op: Ch.values },
    { tex: `\\frac{df}{dt} = ${p(px)} \\cdot ${p(dx)} + ${p(py)} \\cdot ${p(dy)} = ${n(total)}`, op: Ch.total, color: C.green },
  ];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 14;
  const g = chainGraph(y, { t, x: x0, y: y0, f: value(f, x0, y0), dx, dy, px, py }, Ch);
  body.push(g.svg);
  y += g.h;
  // Check: f(x(t), y(t)) differentiated numerically.
  const h = 1e-5;
  const F = (tt: number) => value(f, evalE(xt, 0, { t: tt }), evalE(yt, 0, { t: tt }));
  const num = (F(t + h) - F(t - h)) / (2 * h);
  return compose(`f(x, y) = ${tex(f)}`, body.join(""), y, [{ text: Ch.summary, color: "#495057" }, { text: fill(Ch.check, { t: nt(t, 3), n: nt(tiny(num), 4), d: nt(tiny(total), 4) }), color: C.green }]);
}

/** The computation graph t → x, y → f, each edge with its local derivative, and the two paths' products. */
function chainGraph(top: number, v: { t: number; x: number; y: number; f: number; dx: number; dy: number; px: number; py: number }, Ch: MvWords["chain"]): { svg: string; h: number } {
  const node = (cx: number, cy: number, name: string, val: number, color: string) =>
    `<rect x="${cx - 46}" y="${cy - 22}" width="92" height="44" rx="10" fill="#fff" stroke="${color}" stroke-width="2.4"/>` +
    `<text x="${cx}" y="${cy - 3}" ${FONT} font-size="15" font-weight="700" font-style="italic" fill="${color}" text-anchor="middle">${name}</text>` +
    `<text x="${cx}" y="${cy + 14}" ${FONT} font-size="12" fill="#495057" text-anchor="middle">${esc(nt(val, 3))}</text>`;
  const [T, X, Y, Fn] = [[90, top + 90], [W / 2, top + 34], [W / 2, top + 146], [W - 90, top + 90]] as const;
  const edge = (from: readonly [number, number], to: readonly [number, number], label: string, val: number, color: string, above: boolean) => {
    const [x0, y0] = [from[0] + 46, from[1]];
    const [x1, y1] = [to[0] - 46, to[1]];
    const [mx, my] = [(x0 + x1) / 2, (y0 + y1) / 2 + (above ? -12 : 20)];
    return arrow(x0, y0, x1, y1, color, 2.2) + `<text x="${r2(mx)}" y="${r2(my)}" ${FONT} font-size="12.5" font-weight="700" fill="${color}" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="3.5">${esc(`${label} = ${nt(val, 3)}`)}</text>`;
  };
  let s = "";
  s += edge(T, X, "dx/dt", v.dx, C.blue, true);
  s += edge(T, Y, "dy/dt", v.dy, C.orange, false);
  s += edge(X, Fn, "∂f/∂x", v.px, C.blue, true);
  s += edge(Y, Fn, "∂f/∂y", v.py, C.orange, false);
  s += node(T[0], T[1], "t", v.t, C.ink) + node(X[0], X[1], "x", v.x, C.blue) + node(Y[0], Y[1], "y", v.y, C.orange) + node(Fn[0], Fn[1], "f", v.f, C.green);
  const line = (yy: number, text: string, color: string) => `<text x="${W / 2}" y="${yy}" ${FONT} font-size="13" font-weight="600" fill="${color}" text-anchor="middle">${esc(text)}</text>`;
  s += line(top + 200, fill(Ch.pathX, { a: nt(v.px, 3), b: nt(v.dx, 3), p: nt(v.px * v.dx, 3) }), C.blue);
  s += line(top + 220, fill(Ch.pathY, { a: nt(v.py, 3), b: nt(v.dy, 3), p: nt(v.py * v.dy, 3) }), C.orange);
  s += line(top + 242, fill(Ch.sum, { s: nt(v.px * v.dx + v.py * v.dy, 3) }), C.green);
  return { svg: s, h: 256 };
}

// ---------- the Jacobian ----------

const pm = (a: string, b: string, c: string, d: string) => `\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}`;

function renderJacobian(s: MvSpec, w: MvWords): RenderedSvg {
  const Jw = w.jacobian;
  const u = readF(s.src[0] ?? "", w);
  const v = readF(s.src[1] ?? "", w);
  const [aE, bE] = readPoint(s.at, w);
  const [a, b] = [evalE(aE, 0), evalE(bE, 0)];
  const ds = [partial(u, "x").result, partial(u, "y").result, partial(v, "x").result, partial(v, "y").result];
  const vals = ds.map((d) => clean(value(d, a, b)));
  const [u0, v0] = [value(u, a, b), value(v, a, b)];
  if (![u0, v0, ...vals].every(Number.isFinite)) throw new Error(fill(w.notDefined, { p: ptText(a, b) }));
  const exact = ds.map((d, i) => valTex(atPoint(d, aE, bE), vals[i]));
  const det = clean(vals[0] * vals[3] - vals[1] * vals[2]);
  const P = (sv: string) => (sv.startsWith("-") ? `\\left(${sv}\\right)` : sv);
  const rows: TexLine[] = [
    { tex: `J = ${pm("\\frac{\\partial u}{\\partial x}", "\\frac{\\partial u}{\\partial y}", "\\frac{\\partial v}{\\partial x}", "\\frac{\\partial v}{\\partial y}")} = ${pm(...(ds.map(tex) as [string, string, string, string]))}`, op: Jw.matrix },
    { tex: `J${ptTex(aE, bE)} = ${pm(...(exact as [string, string, string, string]))}`, op: w.atPoint, color: C.orange },
    { tex: `\\det J = ${exact[0]} \\cdot ${P(exact[3])} - ${P(exact[1])} \\cdot ${P(exact[2])} = ${approx(det).replace("−", "-")}`, op: Jw.det, color: C.green },
  ];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 14;
  const size = 250;
  const h = 0.5;
  // Left: a small square of grid lines around (a, b). Right: where the map sends them, and where J sends them.
  const left = mapFrame("mv-jsq", a, b, 1.1, 40, y + 18, size);
  const map = (x: number, yy: number): [number, number] => [value(u, x, yy), value(v, x, yy)];
  const lin = (x: number, yy: number): [number, number] => [u0 + vals[0] * (x - a) + vals[1] * (yy - b), v0 + vals[2] * (x - a) + vals[3] * (yy - b)];
  const lines: [number, number][][] = [];
  for (let k = 0; k <= 4; k++) {
    const c = -h + (2 * h * k) / 4;
    lines.push(Array.from({ length: 21 }, (_, i): [number, number] => [a - h + (2 * h * i) / 20, b + c]));
    lines.push(Array.from({ length: 21 }, (_, i): [number, number] => [a + c, b - h + (2 * h * i) / 20]));
  }
  const imgs = lines.map((ln2) => ln2.map(([x, yy]) => map(x, yy)));
  const lins = lines.map((ln2) => ln2.map(([x, yy]) => lin(x, yy)));
  const all = [...imgs.flat(), ...lins.flat()].filter(([p, q]) => Number.isFinite(p) && Number.isFinite(q));
  const [lo0, hi0] = [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
  const [lo1, hi1] = [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
  const halfR = Math.max(0.3, (hi0 - lo0) / 2, (hi1 - lo1) / 2) * 1.2;
  const right = mapFrame("mv-jimg", (lo0 + hi0) / 2, (lo1 + hi1) / 2, halfR, W - 40 - size, y + 18, size);
  const poly = (fr: Frame, pts: [number, number][], color: string, width: number, extra = "") =>
    `<polyline clip-path="url(#${fr.id})" points="${pts.filter(([p, q]) => Number.isFinite(p) && Number.isFinite(q)).map(([p, q]) => `${r2(fr.sx(p))},${r2(fr.sy(q))}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
  const parts = [axes(left), axes(right)];
  for (const l of lines) parts.push(poly(left, l, C.blue, 1.8));
  for (const l of imgs) parts.push(poly(right, l, C.blue, 1.8));
  for (const l of lins) parts.push(poly(right, l, C.orange, 1.6, `stroke-dasharray="5 4"`));
  parts.push(dot(left.sx(a), left.sy(b), C.ink, 4.5), dot(right.sx(u0), right.sy(v0), C.ink, 4.5));
  parts.push(arrow(left.right + 14, y + 18 + size / 2, right.left - 14, y + 18 + size / 2, "#495057", 2));
  parts.push(`<text x="${r2(left.left + size / 2)}" y="${y + 10}" ${FONT} font-size="13" font-weight="700" fill="#495057" text-anchor="middle">(x, y)</text>`);
  parts.push(`<text x="${r2(right.left + size / 2)}" y="${y + 10}" ${FONT} font-size="13" font-weight="700" fill="#495057" text-anchor="middle">(u, v)</text>`);
  body.push(parts.join(""));
  body.push(legendRow(left.left, y + 18 + size + 26, [
    { text: Jw.legend.square, color: C.blue },
    { text: Jw.legend.linear, color: C.orange },
  ]));
  y += 18 + size + 36;
  const caps: Caption[] = [{ text: Math.abs(det) < 1e-9 ? Jw.flat : fill(Jw.summary, { d: nt(Math.abs(det), 3) }), color: "#495057" }];
  if (det < -1e-9) caps.push({ text: Jw.flipped, color: C.orange });
  const [ux, uy] = numPartials(u, a, b);
  const [vx, vy] = numPartials(v, a, b);
  caps.push(checkCap(w, ptText(a, b), [["∂u/∂x", ux, vals[0]], ["∂u/∂y", uy, vals[1]], ["∂v/∂x", vx, vals[2]], ["∂v/∂y", vy, vals[3]]]));
  return compose(`(u, v) = \\left(${tex(u)}, \\; ${tex(v)}\\right)`, body.join(""), y, caps);
}

// ---------- the Hessian ----------

/** The eigenvalues λ₁ ≥ λ₂ of a symmetric 2 × 2 matrix, and the angle of λ₁'s eigenvector. */
export function eigenSym(p: number, q: number, r: number): { l1: number; l2: number; angle: number } {
  const m = (p + r) / 2;
  const d = Math.hypot((p - r) / 2, q);
  return { l1: m + d, l2: m - d, angle: Math.atan2(2 * q, p - r) / 2 };
}
export type HessianKind = "min" | "max" | "saddle" | "flat";
/** What the curvatures say about a stationary point. */
export const hessianKind = (l1: number, l2: number, tol = 1e-9): HessianKind => (l2 > tol ? "min" : l1 < -tol ? "max" : l1 > tol && l2 < -tol ? "saddle" : "flat");

function renderHessian(s: MvSpec, w: MvWords): RenderedSvg {
  const Hw = w.hessian;
  const f = readF(s.src[0] ?? "", w);
  const [aE, bE] = readPoint(s.at, w);
  const [a, b] = [evalE(aE, 0), evalE(bE, 0)];
  const fx = partial(f, "x").result;
  const fy = partial(f, "y").result;
  const fxx = partial(fx, "x").result;
  const fxy = partial(fx, "y").result;
  const fyx = partial(fy, "x").result;
  const fyy = partial(fy, "y").result;
  const [gx, gy] = [clean(value(fx, a, b)), clean(value(fy, a, b))];
  const [hxx, hxy, hyy] = [clean(value(fxx, a, b)), clean(value(fxy, a, b)), clean(value(fyy, a, b))];
  if (![value(f, a, b), gx, gy, hxx, hxy, hyy].every(Number.isFinite)) throw new Error(fill(w.notDefined, { p: ptText(a, b) }));
  const ex = (d: E, v: number) => valTex(atPoint(d, aE, bE), v);
  const { l1, l2, angle } = eigenSym(hxx, hxy, hyy);
  const stationary = Math.hypot(gx, gy) < 1e-9;
  const kind = hessianKind(l1, l2);
  const n = (v: number) => approx(clean(v)).replace("−", "-");
  const rows: TexLine[] = [
    { tex: `f_{xx} = ${tex(fxx)}, \\quad f_{xy} = ${tex(fxy)}, \\quad f_{yy} = ${tex(fyy)}`, op: Hw.second },
    { tex: `f_{yx} = ${tex(fyx)} = f_{xy}`, op: Hw.symmetric },
    { tex: `H = ${pm("f_{xx}", "f_{xy}", "f_{yx}", "f_{yy}")} , \\quad H${ptTex(aE, bE)} = ${pm(ex(fxx, hxx), ex(fxy, hxy), ex(fxy, hxy), ex(fyy, hyy))}`, op: w.atPoint, color: C.orange },
    { tex: `\\nabla f${ptTex(aE, bE)} = \\left(${ex(fx, gx)}, ${ex(fy, gy)}\\right)`, op: Hw.grad },
    { tex: `\\lambda = \\frac{f_{xx} + f_{yy}}{2} \\pm \\sqrt{\\left(\\frac{f_{xx} - f_{yy}}{2}\\right)^{2} + f_{xy}^{2}}`, op: Hw.eigen },
    { tex: `\\lambda_1 = ${n(l1)}, \\quad \\lambda_2 = ${n(l2)}`, op: Hw.curvatures, color: C.green },
  ];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 10;
  const size = 360;
  const fr = mapFrame("mv-hess", a, b, 2, (W - size) / 2, y, size);
  const g = (x: number, yy: number) => value(f, x, yy);
  const parts = [axes(fr), contours(fr, g, levelsOf(fr, g, value(f, a, b), 9, true), C.blue, 1.4)];
  // The two eigenvector directions through the point, each named with its curvature.
  const dir = (th: number, lam: number, color: string) => {
    const [ux, uy] = [Math.cos(th), Math.sin(th)];
    return (
      `<line x1="${r2(fr.sx(a - 1.3 * ux))}" y1="${r2(fr.sy(b - 1.3 * uy))}" x2="${r2(fr.sx(a + 1.3 * ux))}" y2="${r2(fr.sy(b + 1.3 * uy))}" stroke="${color}" stroke-width="2.6"/>` +
      lbl(fr.sx(a + 1.35 * ux), fr.sy(b + 1.35 * uy) - 8, `λ = ${nt(lam, 3)}`, color, ux >= 0.5 ? "end" : ux >= 0 ? "start" : "end", 13)
    );
  };
  parts.push(dir(angle, l1, C.red), dir(angle + Math.PI / 2, l2, C.green), dot(fr.sx(a), fr.sy(b), C.ink, 5));
  body.push(`<g>${parts.join("")}</g>`);
  body.push(legendRow(fr.left, fr.bottom + 22, [{ text: Hw.legend, color: C.red }]));
  y = fr.bottom + 34;
  const caps: Caption[] = [];
  if (!stationary) caps.push({ text: Hw.notStationary, color: C.orange });
  caps.push({ text: Hw[kind], color: kind === "flat" ? C.orange : "#495057" });
  if (kind === "min") caps.push({ text: fill(Hw.descent, { l: nt(l1, 3), lim: nt(2 / l1, 3) }), color: C.purple });
  return compose(`f(x, y) = ${tex(f)}`, body.join(""), y, caps);
}

// ---------- convexity, local and global minima, saddles ----------

/** The points of a map where ∇f = 0, by Newton's method from a grid of starts, each with its kind and value. */
function stationaryPoints(f: E, fr: Frame) {
  const fx = partial(f, "x").result;
  const fy = partial(f, "y").result;
  const [fxx, fxy, fyy] = [partial(fx, "x").result, partial(fx, "y").result, partial(fy, "y").result];
  const found: { x: number; y: number; v: number; kind: HessianKind; l2: number }[] = [];
  const span = fr.x1 - fr.x0;
  for (let i = 0; i <= 8; i++)
    for (let j = 0; j <= 8; j++) {
      let [x, y] = [fr.x0 + (span * (i + 0.5)) / 9, fr.y0 + ((fr.y1 - fr.y0) * (j + 0.5)) / 9];
      for (let it = 0; it < 60; it++) {
        const [g1, g2] = [value(fx, x, y), value(fy, x, y)];
        const [a, b, c] = [value(fxx, x, y), value(fxy, x, y), value(fyy, x, y)];
        const det = a * c - b * b;
        if (![g1, g2, a, b, c].every(Number.isFinite) || Math.abs(det) < 1e-14) break;
        const [dx, dy] = [(c * g1 - b * g2) / det, (a * g2 - b * g1) / det];
        [x, y] = [x - dx, y - dy];
        if (Math.hypot(dx, dy) < 1e-12) break;
      }
      const inside = x >= fr.x0 && x <= fr.x1 && y >= fr.y0 && y <= fr.y1;
      if (!inside || Math.hypot(value(fx, x, y), value(fy, x, y)) > 1e-7) continue;
      if (found.some((q) => Math.hypot(q.x - x, q.y - y) < 1e-4 * span)) continue;
      const { l1, l2 } = eigenSym(value(fxx, x, y), value(fxy, x, y), value(fyy, x, y));
      found.push({ x: clean(Math.round(x * 1e9) / 1e9), y: clean(Math.round(y * 1e9) / 1e9), v: value(f, x, y), kind: hessianKind(l1, l2, 1e-7), l2 });
    }
  return found.sort((p, q) => p.v - q.v);
}

function renderConvex(s: MvSpec, w: MvWords): RenderedSvg {
  const Cw = w.convex;
  const f = readF(s.src[0] ?? "", w);
  const [aE, bE] = readPoint(s.at, w);
  const [a, b] = [evalE(aE, 0), evalE(bE, 0)];
  const fx = partial(f, "x").result;
  const fy = partial(f, "y").result;
  const [fxx, fxy, fyy] = [partial(fx, "x").result, partial(fx, "y").result, partial(fy, "y").result];
  const size = 380;
  const half = 2.5;
  const n = (v: number) => approx(clean(v)).replace("−", "-");
  // The smaller curvature over a grid of the map: where it is below 0, f is not convex.
  const G = 60;
  const bad: [number, number][] = [];
  let worst = { l: Infinity, x: a, y: b };
  for (let i = 0; i <= G; i++)
    for (let j = 0; j <= G; j++) {
      const [x, y] = [a - half + (2 * half * i) / G, b - half + (2 * half * j) / G];
      const { l2 } = eigenSym(value(fxx, x, y), value(fxy, x, y), value(fyy, x, y));
      if (!Number.isFinite(l2)) continue;
      if (l2 < worst.l) worst = { l: l2, x, y };
      if (l2 < -1e-9) bad.push([x, y]);
    }
  if (!Number.isFinite(worst.l)) throw new Error(fill(w.notDefined, { p: ptText(a, b) }));
  const convex = bad.length === 0;
  const body: string[] = [];
  let y0 = 4;
  const fr0 = mapFrame("mv-cvx", a, b, half, (W - size) / 2, 0, size);
  const pts = stationaryPoints(f, fr0);
  const mins = pts.filter((p) => p.kind === "min");
  const saddles = pts.filter((p) => p.kind === "saddle");
  const kindText = (k: HessianKind, i: number) => (k === "min" && i === 0 && mins.length > 1 ? Cw.kinds.global : Cw.kinds[k]);
  const listed = pts.slice(0, 5).map((p) => `(${n(p.x)}, ${n(p.y)})`);
  const rows: TexLine[] = [
    { tex: `f_{xx} = ${tex(fxx)}, \\quad f_{xy} = ${tex(fxy)}, \\quad f_{yy} = ${tex(fyy)}`, op: Cw.second },
    { tex: `H \\succeq 0 \\iff f_{xx} \\ge 0,\\ f_{yy} \\ge 0,\\ f_{xx}f_{yy} - f_{xy}^2 \\ge 0`, op: Cw.test },
    convex
      ? { tex: `\\min \\lambda_2 = ${n(worst.l)} \\ge 0`, op: Cw.everywhere, color: C.green }
      : { tex: `\\lambda_2\\left(${n(worst.x)}, ${n(worst.y)}\\right) = ${n(worst.l)} < 0`, op: Cw.fails, color: C.red },
    pts.length ? { tex: `\\nabla f = 0: \\ ${listed.join(", \\ ")}`, op: Cw.stationary, color: C.purple } : { tex: `\\nabla f \\ne 0`, op: Cw.none },
  ];
  const ln = texLines(rows, y0);
  body.push(ln.svg);
  y0 += ln.h + 10;
  const fr = mapFrame("mv-cvx", a, b, half, (W - size) / 2, y0, size);
  const g = (x: number, yy: number) => value(f, x, yy);
  const cell = (2 * half) / G;
  const shade = bad
    .map(([x, yy]) => `<rect x="${r2(fr.sx(x - cell / 2))}" y="${r2(fr.sy(yy + cell / 2))}" width="${r2(fr.sx(x + cell / 2) - fr.sx(x - cell / 2) + 0.4)}" height="${r2(fr.sy(yy - cell / 2) - fr.sy(yy + cell / 2) + 0.4)}" fill="${C.red}"/>`)
    .join("");
  // One opacity for the whole shading, so that the cells' overlaps do not show as a grid.
  const parts = [`<g opacity="0.13">${shade}</g>`, axes(fr), contours(fr, g, levelsOf(fr, g, mins[0]?.v ?? g(a, b), 12), C.blue, 1.3)];
  const caps: Caption[] = [];
  // With two minima, the chord between them: f rises above it on the way, which a convex function never does.
  if (mins.length >= 2) {
    const [p, q] = [mins[0], mins[1]];
    let top = { t: 0, gap: -Infinity };
    for (let i = 1; i < 100; i++) {
      const t = i / 100;
      const gap = g(p.x + t * (q.x - p.x), p.y + t * (q.y - p.y)) - (p.v + t * (q.v - p.v));
      if (gap > top.gap) top = { t, gap };
    }
    parts.push(`<line x1="${r2(fr.sx(p.x))}" y1="${r2(fr.sy(p.y))}" x2="${r2(fr.sx(q.x))}" y2="${r2(fr.sy(q.y))}" stroke="${C.orange}" stroke-width="2.4" stroke-dasharray="7 5"/>`);
    if (top.gap > 1e-9) caps.push({ text: fill(Cw.chord, { d: nt(top.gap, 3) }), color: C.orange });
  }
  pts.forEach((p) => {
    const [px, py] = [fr.sx(p.x), fr.sy(p.y)];
    if (p.kind === "saddle") parts.push(`<path d="M${r2(px - 6)},${r2(py - 6)}l12,12m0,-12l-12,12" stroke="${C.purple}" stroke-width="2.8"/>`);
    else if (p.kind === "min") parts.push(dot(px, py, C.green, p === mins[0] ? 7 : 5, p !== mins[0] && mins.length > 1));
    else parts.push(dot(px, py, p.kind === "max" ? C.red : C.grey, 5));
    const color = p.kind === "min" ? C.green : p.kind === "saddle" ? C.purple : p.kind === "max" ? C.red : C.grey;
    // A saddle's name goes under it, the others' over them, so that neighbours on one line do not run together.
    parts.push(lbl(px, p.kind === "saddle" ? py + 22 : py - 12, kindText(p.kind, mins.indexOf(p)), color, "middle", 12.5, false));
  });
  body.push(`<g>${parts.join("")}</g>`);
  const legend = [...(convex ? [] : [{ text: Cw.legend.shade, color: "#f5b7b7" }]), ...(mins.length >= 2 ? [{ text: Cw.legend.chord, color: C.orange }] : [])];
  if (legend.length) body.push(legendRow(fr.left, fr.bottom + 22, legend));
  const y = fr.bottom + 34;
  const g0 = mins[0];
  caps.unshift(
    convex
      ? { text: Cw.convex, color: "#495057" }
      : { text: mins.length > 1 ? fill(Cw.minima, { n: mins.length, v: nt(g0.v, 4), p: ptText(g0.x, g0.y) }) : mins.length === 1 ? fill(Cw.oneMin, { v: nt(g0.v, 4), p: ptText(g0.x, g0.y) }) : Cw.notConvex, color: "#495057" },
  );
  // A minimum need not be the lowest point: f may go lower towards the map's edge.
  let low = Infinity;
  for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) low = Math.min(low, g(fr.x0 + (fr.x1 - fr.x0) * (i / 40), fr.y0 + (fr.y1 - fr.y0) * (j / 40)));
  if (g0 && low < g0.v - 1e-6 * Math.max(1, Math.abs(g0.v))) caps.push({ text: fill(Cw.lower, { v: nt(low, 4) }), color: C.orange });
  if (saddles.length) caps.push({ text: Cw.saddles, color: C.purple });
  return compose(`f(x, y) = ${tex(f)}`, body.join(""), y, caps);
}

// ---------- Lagrange multipliers ----------

/** The points of g(x, y) = c where ∇f = λ∇g, by Newton's method on (x, y, λ) from a grid of starts. */
export function lagrangePoints(f: E, gE: E, c: number) {
  const d1 = (e: E) => [partial(e, "x").result, partial(e, "y").result] as const;
  const [fx, fy] = d1(f);
  const [gx, gy] = d1(gE);
  const [fxx, fxy] = d1(fx);
  const fyy = partial(fy, "y").result;
  const [gxx, gxy] = d1(gx);
  const gyy = partial(gy, "y").result;
  const out: { x: number; y: number; l: number; v: number }[] = [];
  for (let i = 0; i <= 10; i++)
    for (let j = 0; j <= 10; j++) {
      let [x, y] = [-4 + 0.8 * i + 0.013, -4 + 0.8 * j + 0.017];
      const [a0, b0] = [value(gx, x, y), value(gy, x, y)];
      let l = (value(fx, x, y) * a0 + value(fy, x, y) * b0) / (a0 * a0 + b0 * b0 || 1);
      let okRun = false;
      for (let it = 0; it < 80; it++) {
        const [Gx, Gy] = [value(gx, x, y), value(gy, x, y)];
        const F = [value(fx, x, y) - l * Gx, value(fy, x, y) - l * Gy, value(gE, x, y) - c];
        const J = [
          [value(fxx, x, y) - l * value(gxx, x, y), value(fxy, x, y) - l * value(gxy, x, y), -Gx],
          [value(fxy, x, y) - l * value(gxy, x, y), value(fyy, x, y) - l * value(gyy, x, y), -Gy],
          [Gx, Gy, 0],
        ];
        if (![...F, ...J.flat()].every(Number.isFinite)) break;
        const det3 = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        const D = det3(J);
        if (Math.abs(D) < 1e-14) break;
        const col = (k: number) => J.map((row, r) => row.map((v, q) => (q === k ? F[r] : v)));
        const [dx, dy, dl] = [det3(col(0)) / D, det3(col(1)) / D, det3(col(2)) / D];
        [x, y, l] = [x - dx, y - dy, l - dl];
        if (Math.abs(x) > 1e3 || Math.abs(y) > 1e3) break;
        if (Math.hypot(dx, dy, dl) < 1e-12) {
          okRun = true;
          break;
        }
      }
      if (!okRun) continue;
      const res = Math.hypot(value(fx, x, y) - l * value(gx, x, y), value(fy, x, y) - l * value(gy, x, y), value(gE, x, y) - c);
      if (!(res < 1e-8) || out.some((q) => Math.hypot(q.x - x, q.y - y) < 1e-5)) continue;
      out.push({ x: clean(Math.round(x * 1e9) / 1e9), y: clean(Math.round(y * 1e9) / 1e9), l: clean(Math.round(l * 1e9) / 1e9), v: value(f, x, y) });
    }
  return out.sort((p, q) => q.v - p.v);
}

function renderLagrange(s: MvSpec, w: MvWords): RenderedSvg {
  const Lw = w.lagrange;
  const f = readF(s.src[0] ?? "", w);
  const gE = readF(s.src[1] ?? "", w);
  const c = evalE(readNumber(s.at, Lw.needC), 0);
  const [fx, fy] = [partial(f, "x").result, partial(f, "y").result];
  const [gx, gy] = [partial(gE, "x").result, partial(gE, "y").result];
  const sols = lagrangePoints(f, gE, c);
  const n = (v: number) => approx(clean(v)).replace("−", "-");
  const ct = n(c);
  const rows: TexLine[] = [
    { tex: `\\nabla f = \\left(${tex(fx)}, ${tex(fy)}\\right), \\quad \\nabla g = \\left(${tex(gx)}, ${tex(gy)}\\right)`, op: Lw.grads },
    { tex: `${tex(fx)} = \\lambda \\left(${tex(gx)}\\right), \\quad ${tex(fy)} = \\lambda \\left(${tex(gy)}\\right), \\quad ${tex(gE)} = ${ct}`, op: Lw.system, color: C.purple },
  ];
  if (!sols.length) rows.push({ tex: `\\nabla f \\ne \\lambda \\nabla g`, op: Lw.none, color: C.red });
  sols.slice(0, 4).forEach((p, i) => rows.push({ tex: `(x, y) = (${n(p.x)}, ${n(p.y)}), \\quad \\lambda = ${n(p.l)}, \\quad f = ${n(p.v)}`, op: i === 0 ? Lw.found : undefined, color: sols.length > 1 && i === 0 ? C.red : sols.length > 1 && i === sols.length - 1 ? C.green : C.ink }));
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 10;
  const size = 380;
  const reach = Math.max(2.5, ...sols.map((p) => 1.35 * Math.max(Math.abs(p.x), Math.abs(p.y))));
  const half = Math.min(10, reach);
  const fr = mapFrame("mv-lag", 0, 0, half, (W - size) / 2, y, size);
  const g = (x: number, yy: number) => value(f, x, yy);
  const gg = (x: number, yy: number) => value(gE, x, yy);
  const parts = [axes(fr), contours(fr, g, levelsOf(fr, g, sols[0]?.v ?? 0, 12), "#ced4da", 1.1), contours(fr, gg, [c], C.blue, 3)];
  const big = sols.length > 1 ? [sols[0], sols[sols.length - 1]] : sols;
  for (const p of sols.slice(0, 6)) {
    const at = big.includes(p);
    if (at) parts.push(contours(fr, g, [p.v], C.green, 2));
    const [g1, g2] = [value(fx, p.x, p.y), value(fy, p.x, p.y)];
    const [h1, h2] = [value(gx, p.x, p.y), value(gy, p.x, p.y)];
    const unit = (u: number, v: number): [number, number] => {
      const L = Math.hypot(u, v) || 1;
      return [(u / L) * half * 0.22, (v / L) * half * 0.22];
    };
    const [ux, uy] = unit(g1, g2);
    const [vx, vy] = unit(h1, h2);
    if (Math.hypot(g1, g2) > 1e-9) parts.push(arrow(fr.sx(p.x), fr.sy(p.y), fr.sx(p.x + ux), fr.sy(p.y + uy), C.red, 2.6));
    if (Math.hypot(h1, h2) > 1e-9) parts.push(arrow(fr.sx(p.x), fr.sy(p.y), fr.sx(p.x + 0.7 * vx), fr.sy(p.y + 0.7 * vy), C.blue, 2.6, true));
    parts.push(dot(fr.sx(p.x), fr.sy(p.y), C.ink, 4.5));
    if (sols.length > 1 && (p === sols[0] || p === sols[sols.length - 1])) parts.push(lbl(fr.sx(p.x) + 8, fr.sy(p.y) + 16, p === sols[0] ? Lw.max : Lw.min, p === sols[0] ? C.red : C.green, "start", 13, false));
  }
  body.push(`<g>${parts.join("")}</g>`);
  body.push(legendRow(fr.left, fr.bottom + 22, [
    { text: Lw.legend.constraint, color: C.blue },
    { text: Lw.legend.level, color: C.green },
    { text: Lw.legend.gradF, color: C.red },
  ]));
  y = fr.bottom + 34;
  const caps: Caption[] = [];
  if (sols.length > 1) {
    const [hi, lo] = [sols[0], sols[sols.length - 1]];
    caps.push({ text: fill(Lw.summary, { hi: nt(hi.v, 4), ph: ptText(hi.x, hi.y), lo: nt(lo.v, 4), pl: ptText(lo.x, lo.y) }), color: "#495057" });
    caps.push({ text: fill(Lw.lambda, { l: nt(hi.l, 3) }), color: C.purple });
  } else if (sols.length === 1) caps.push({ text: fill(Lw.one, { v: nt(sols[0].v, 4), p: ptText(sols[0].x, sols[0].y), l: nt(sols[0].l, 3) }), color: "#495057" });
  return compose(`f(x, y) = ${tex(f)}, \\quad ${tex(gE)} = ${ct}`, body.join(""), y, caps);
}

// ---------- entry ----------

export function renderMultivar(spec: MvSpec, w: MvWords): RenderedSvg {
  exprMessages(w);
  switch (spec.topic) {
    case "partial":
      return renderPartial(spec, w);
    case "gradient":
      return renderGradient(spec, w);
    case "chain":
      return renderChain(spec, w);
    case "jacobian":
      return renderJacobian(spec, w);
    case "hessian":
      return renderHessian(spec, w);
    case "convex":
      return renderConvex(spec, w);
    case "lagrange":
      return renderLagrange(spec, w);
  }
}

const P = (topic: MvTopic, src: string[], at: string): MvSpec => ({ topic, src, at });
export const MV_PRESETS: { [K in MvTopic]: { label: string; spec: MvSpec }[] } = {
  partial: [
    { label: "x²y + sin(xy), (1, 2)", spec: P("partial", ["x^2 y + sin(x y)"], "1, 2") },
    { label: "x² + 3y², (1, 1)", spec: P("partial", ["x^2 + 3y^2"], "1, 1") },
    { label: "e^(xy), (1, 0)", spec: P("partial", ["e^(x y)"], "1, 0") },
    { label: "x³ − 3xy², (1, 1)", spec: P("partial", ["x^3 - 3x y^2"], "1, 1") },
    { label: "ln(x² + y²), (1, 1)", spec: P("partial", ["ln(x^2 + y^2)"], "1, 1") },
    { label: "x / y, (2, 1)", spec: P("partial", ["x/y"], "2, 1") },
  ],
  gradient: [
    { label: "x² + 3y², (1, 1)", spec: P("gradient", ["x^2 + 3y^2"], "1, 1") },
    { label: "x² − y², (1, 0.5)", spec: P("gradient", ["x^2 - y^2"], "1, 0.5") },
    { label: "sin x + cos y, (1, 1)", spec: P("gradient", ["sin x + cos y"], "1, 1") },
    { label: "xy, (1, 2)", spec: P("gradient", ["x y"], "1, 2") },
    { label: "(x − 1)² + (y + 1)², (0, 0)", spec: P("gradient", ["(x - 1)^2 + (y + 1)^2"], "0, 0") },
    { label: "x⁴ − 3x² + y², (1, 0.5)", spec: P("gradient", ["x^4 - 3x^2 + y^2"], "1, 0.5") },
  ],
  chain: [
    { label: "x²y, x = cos t, y = sin t, t = 1", spec: P("chain", ["x^2 y", "cos t", "sin t"], "1") },
    { label: "xy, x = t², y = 3t, t = 1", spec: P("chain", ["x y", "t^2", "3t"], "1") },
    { label: "x² + y² on a circle, t = 1", spec: P("chain", ["x^2 + y^2", "cos t", "sin t"], "1") },
    { label: "e^(xy), x = t, y = 2t, t = 0.5", spec: P("chain", ["e^(x y)", "t", "2t"], "0.5") },
    { label: "x / y, x = eᵗ, y = t + 1, t = 0", spec: P("chain", ["x/y", "e^t", "t + 1"], "0") },
  ],
  jacobian: [
    { label: "(x² − y², 2xy), (1, 1)", spec: P("jacobian", ["x^2 - y^2", "2x y"], "1, 1") },
    { label: "(x cos y, x sin y), (2, 0.5)", spec: P("jacobian", ["x cos y", "x sin y"], "2, 0.5") },
    { label: "(2x + y, x + 3y), (0, 0)", spec: P("jacobian", ["2x + y", "x + 3y"], "0, 0") },
    { label: "(y, x), (1, 2)", spec: P("jacobian", ["y", "x"], "1, 2") },
    { label: "(x², y²), (1, 1)", spec: P("jacobian", ["x^2", "y^2"], "1, 1") },
    { label: "(sin x, sin y), (0.5, 1)", spec: P("jacobian", ["sin x", "sin y"], "0.5, 1") },
  ],
  hessian: [
    { label: "x² + 3y², (0, 0)", spec: P("hessian", ["x^2 + 3y^2"], "0, 0") },
    { label: "x² − y², (0, 0)", spec: P("hessian", ["x^2 - y^2"], "0, 0") },
    { label: "−x² − 2y² + xy, (0, 0)", spec: P("hessian", ["-x^2 - 2y^2 + x y"], "0, 0") },
    { label: "x³ − 3x + y², (1, 0)", spec: P("hessian", ["x^3 - 3x + y^2"], "1, 0") },
    { label: "x³ − 3x + y², (−1, 0)", spec: P("hessian", ["x^3 - 3x + y^2"], "-1, 0") },
    { label: "x⁴ + y⁴, (0, 0)", spec: P("hessian", ["x^4 + y^4"], "0, 0") },
    { label: "(1 − x)² + 10(y − x²)², (1, 1)", spec: P("hessian", ["(1 - x)^2 + 10(y - x^2)^2"], "1, 1") },
    { label: "x² + xy + y², (1, 1)", spec: P("hessian", ["x^2 + x y + y^2"], "1, 1") },
  ],
  convex: [
    { label: "x² + xy + y²: convex", spec: P("convex", ["x^2 + x y + y^2"], "0, 0") },
    { label: "x⁴ − 3x² + y²: two valleys", spec: P("convex", ["x^4 - 3x^2 + y^2"], "0, 0") },
    { label: "x⁴ − 2x² + x + y²: a deeper valley", spec: P("convex", ["x^4 - 2x^2 + x + y^2"], "0, 0") },
    { label: "x² − y²: a saddle", spec: P("convex", ["x^2 - y^2"], "0, 0") },
    { label: "eˣ + y²: convex, no minimum", spec: P("convex", ["e^x + y^2"], "0, 0") },
    { label: "x³ − 3x + y²", spec: P("convex", ["x^3 - 3x + y^2"], "0, 0") },
  ],
  lagrange: [
    { label: "xy on x² + y² = 2", spec: P("lagrange", ["x y", "x^2 + y^2"], "2") },
    { label: "x + y on x² + y² = 1", spec: P("lagrange", ["x + y", "x^2 + y^2"], "1") },
    { label: "x² + y² on x + 2y = 5", spec: P("lagrange", ["x^2 + y^2", "x + 2y"], "5") },
    { label: "xy on x + y = 4: a fence", spec: P("lagrange", ["x y", "x + y"], "4") },
    { label: "x² + 2y² on x² + y² = 4", spec: P("lagrange", ["x^2 + 2y^2", "x^2 + y^2"], "4") },
  ],
};
