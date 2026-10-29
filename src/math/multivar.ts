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

export type MvTopic = "partial" | "gradient" | "chain" | "jacobian" | "hessian";
export const MV_TOPICS: MvTopic[] = ["partial", "gradient", "chain", "jacobian", "hessian"];
/** What a picture is made from: the function (for the chain rule also x(t) and y(t); for the Jacobian u and v), and
 * the point (for the chain rule, the value of t). */
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
};
