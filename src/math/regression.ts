// Linear and logistic regression as models that learn, one step at a time: several features fitted by the normal
// equations XᵀX w = Xᵀy and again by gradient descent to the same weights; a curve fitted as a linear model of the
// features 1, x, x², …; categories turned into one-hot features, whose weights are the categories' means; logistic
// regression trained step by step on log loss, with its straight decision boundary and the loss falling; and reading
// the weights: what one says (holding the others fixed), on the features' own scales and standardised, and why
// features that move together make their weights hard to read.
import { arrow, axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nt, r2, texLines, tn, W, yRange, type Frame, type TexLine } from "./chart";
import { evalE, exprMessages, has, parseE, simp } from "./expr";
import type { RenderedSvg } from "./latex";

export type RegTopic = "normal" | "features" | "onehot" | "logistic" | "weights";
export const REG_TOPICS: RegTopic[] = ["normal", "features", "onehot", "logistic", "weights"];
export type RegSpec = { topic: RegTopic; src: string[] };
export const REG_FIELDS: Record<RegTopic, ("rows" | "points" | "degree" | "groups" | "labelled" | "rate" | "steps")[]> = {
  normal: ["rows"],
  features: ["points", "degree"],
  onehot: ["groups"],
  logistic: ["labelled", "rate", "steps"],
  weights: ["rows"],
};

export type RegWords = {
  bad: string;
  tooBig: string;
  onlyX: string;
  needRows: string;
  ragged: string;
  fewRows: string;
  singular: string;
  needDegree: string;
  needGroups: string;
  oneGroup: string;
  needLabels: string;
  needRate: string;
  needSteps: string;
  normal: { model: string; design: string; equations: string; solve: string; fit: string; gd: string; gdTitle: string; fitTitle: string; actual: string; predicted: string; summary: string };
  features: { map: string; model: string; solve: string; fit: string; title: string; summary: string };
  onehot: { encode: string; model: string; solve: string; title: string; summary: string };
  logistic: { sigmoid: string; loss: string; grad: string; result: string; boundary: string; acc: string; title: string; lossTitle: string; summary: string; separable: string };
  weights: { fit: string; raw: string; scaled: string; read: string; rawTitle: string; scaledTitle: string; summary: string; together: string };
};

const MAX = 60;

// ---------- reading ----------

function readNum(p: string, w: RegWords): number {
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
}
/** Rows separated by semicolons, numbers in a row by commas or spaces; every row as long as the first. */
export function readRows(s: string, w: RegWords, min = 2): number[][] {
  const rows = s.split(";").map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[,\s]+/).filter(Boolean).map((p) => readNum(p, w)));
  if (!rows.length || rows[0].length < min) throw new Error(w.needRows);
  if (rows.length > MAX) throw new Error(w.tooBig);
  if (rows.some((r) => r.length !== rows[0].length)) throw new Error(w.ragged);
  return rows;
}

// ---------- linear algebra ----------

/** Solves A v = b by elimination with partial pivoting; null when A is singular. */
export function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    const scale = Math.max(1, ...M.map((r) => Math.abs(r[c])));
    if (Math.abs(M[p][c]) < 1e-10 * scale) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}
const xtx = (X: number[][]) => X[0].map((_, i) => X[0].map((__, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
const xty = (X: number[][], y: number[]) => X[0].map((_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0));
const dotv = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

/** Least squares by the normal equations: the weights (intercept first), predictions, MSE and R². */
export function leastSquares(X: number[][], y: number[]) {
  const w = solve(xtx(X), xty(X, y));
  if (!w) return null;
  const yhat = X.map((r) => dotv(r, w));
  const n = y.length;
  const mean = y.reduce((a, b) => a + b, 0) / n;
  const sse = y.reduce((s, v, i) => s + (v - yhat[i]) ** 2, 0);
  const sst = y.reduce((s, v) => s + (v - mean) ** 2, 0);
  return { w, yhat, mse: sse / n, r2: sst > 0 ? 1 - sse / sst : 1 };
}
/** Gradient descent on the mean squared error from w = 0, with the features standardised so one rate suits them all,
 * the weights turned back to the features' own scales; the weights after each of the steps asked for. */
export function descend(X: number[][], y: number[], steps: number[]): number[][] {
  const p = X[0].length;
  const n = X.length;
  const mu = X[0].map((_, j) => (j === 0 ? 0 : X.reduce((s, r) => s + r[j], 0) / n));
  const sd = X[0].map((_, j) => (j === 0 ? 1 : Math.sqrt(X.reduce((s, r) => s + (r[j] - mu[j]) ** 2, 0) / n) || 1));
  const Z = X.map((r) => r.map((v, j) => (j === 0 ? 1 : (v - mu[j]) / sd[j])));
  let v = Array(p).fill(0);
  const out: number[][] = [];
  const back = (u: number[]) => {
    const w = u.map((x, j) => (j === 0 ? x : x / sd[j]));
    w[0] = u[0] - u.slice(1).reduce((s, x, j) => s + (x * mu[j + 1]) / sd[j + 1], 0);
    return w;
  };
  let k = 0;
  for (const target of steps) {
    for (; k < target; k++) {
      const g = Array(p).fill(0);
      Z.forEach((r, i) => {
        const e = dotv(r, v) - y[i];
        r.forEach((x, j) => (g[j] += (2 * e * x) / n));
      });
      v = v.map((x, j) => x - 0.1 * g[j]);
    }
    out.push(back(v));
  }
  return out;
}
export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
/** Logistic regression trained by gradient descent on the mean log loss from w = 0: the weights and loss after every
 * step. */
export function trainLogistic(X: number[][], y: number[], eta: number, steps: number) {
  let w = Array(X[0].length).fill(0);
  const n = X.length;
  const lossOf = (u: number[]) => -X.reduce((s, r, i) => {
    const p = Math.min(1 - 1e-12, Math.max(1e-12, sigmoid(dotv(r, u))));
    return s + (y[i] ? Math.log(p) : Math.log(1 - p));
  }, 0) / n;
  const ws = [w];
  const losses = [lossOf(w)];
  for (let k = 0; k < steps; k++) {
    const g = Array(w.length).fill(0);
    X.forEach((r, i) => {
      const e = sigmoid(dotv(r, w)) - y[i];
      r.forEach((x, j) => (g[j] += (e * x) / n));
    });
    w = w.map((x, j) => x - eta * g[j]);
    ws.push(w);
    losses.push(lossOf(w));
  }
  return { ws, losses };
}

// ---------- drawing ----------

const n4 = (v: number) => tn(Math.abs(v) < 1e-10 ? 0 : v, 4);
const pm = (rows: string[][]) => `\\begin{pmatrix} ${rows.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
/** The first rows of a matrix, and ⋮ under them when there are more. */
const firstRows = (M: number[][], k = 3) => {
  const rows = M.slice(0, k).map((r) => r.map((v) => tn(v, 3)));
  if (M.length > k) rows.push(M[0].map(() => "\\vdots"));
  return pm(rows);
};
const title = (fr: Frame, text: string) => `<text x="${r2((fr.left + fr.right) / 2)}" y="${fr.top - 8}" ${FONT} font-size="13" font-weight="700" fill="#495057" text-anchor="middle">${esc(text)}</text>`;
const HALF = (W - 3 * 44) / 2;
const PH = 200;
function layout(rows: TexLine[], draw: (y: number) => { svg: string; h: number }) {
  const ln = texLines(rows, 4);
  const d = draw(4 + ln.h + 14);
  return { body: ln.svg + d.svg, h: 4 + ln.h + 14 + d.h };
}
const span = (vs: number[]): [number, number] => {
  const [lo, hi] = [Math.min(...vs), Math.max(...vs)];
  const pad = Math.max(0.5, (hi - lo) * 0.1);
  return [lo - pad, hi + pad];
};
/** ŷ = w₀ + w₁x₁ + …, the signs folded in. */
function eqTex(w: number[], names: string[], lhs = "\\hat y"): string {
  let s = `${lhs} = ${n4(w[0])}`;
  w.slice(1).forEach((v, i) => (s += ` ${v < 0 ? "-" : "+"} ${n4(Math.abs(v))}\\,${names[i]}`));
  return s;
}
const xNames = (k: number) => (k === 1 ? ["x"] : Array.from({ length: k }, (_, i) => `x_{${i + 1}}`));

// ---------- several features: the normal equations, and gradient descent to the same weights ----------

function fitRows(s: RegSpec, w: RegWords) {
  const rows = readRows(s.src[0] ?? "", w);
  const k = rows[0].length - 1;
  if (rows.length < k + 2) throw new Error(fill(w.fewRows, { n: k + 2 }));
  const X = rows.map((r) => [1, ...r.slice(0, k)]);
  const y = rows.map((r) => r[k]);
  const fit = leastSquares(X, y);
  if (!fit) throw new Error(w.singular);
  return { rows, k, X, y, fit };
}

function renderNormal(s: RegSpec, w: RegWords): RenderedSvg {
  const N = w.normal;
  const { k, X, y, fit } = fitRows(s, w);
  const names = xNames(k);
  const steps = [1, 10, 100, 1000];
  const gd = descend(X, y, steps);
  const A = xtx(X);
  const b = xty(X, y);
  const rows: TexLine[] = [
    { tex: `\\hat y = w_0 + ${names.map((nm, j) => `w_{${j + 1}}${nm}`).join(" + ")}`, op: N.model },
    { tex: `X = ${firstRows(X)}, \\quad y = ${firstRows(y.map((v) => [v]))}`, op: N.design },
    { tex: `X^\\top X = ${pm(A.map((r) => r.map((v) => tn(v, 3))))}, \\quad X^\\top y = ${pm(b.map((v) => [tn(v, 3)]))}`, op: N.equations },
    { tex: `w = (X^\\top X)^{-1} X^\\top y = ${pm(fit.w.map((v) => [n4(v)]))}`, op: N.solve, color: C.blue },
    { tex: `${eqTex(fit.w, names)}, \\quad \\mathrm{MSE} = ${n4(fit.mse)}, \\quad R^2 = ${n4(fit.r2)}`, op: N.fit, color: C.blue },
    { tex: `w^{(1000)} = (${gd[3].map(n4).join(", ")})`, op: N.gd, color: C.purple },
  ];
  const errs = gd.map((g) => Math.max(...g.map((v, i) => Math.abs(v - fit.w[i]))));
  const { body, h } = layout(rows, (yy) => {
    const left = k === 1
      ? makeFrame("reg-n-fit", 44, yy + 18, HALF, PH, span(X.map((r) => r[1])), span(y))
      : makeFrame("reg-n-fit", 44, yy + 18, HALF, PH, span([...y, ...fit.yhat]), span([...y, ...fit.yhat]));
    let svg = title(left, k === 1 ? N.fitTitle : `${N.predicted} ↔ ${N.actual}`) + axes(left, { xAtBottom: true });
    if (k === 1) {
      svg += curve(left, (x) => fit.w[0] + fit.w[1] * x, C.blue, 2.4);
      X.forEach((r, i) => (svg += dot(left.sx(r[1]), left.sy(y[i]), C.ink, 3.6)));
    } else {
      svg += `<line x1="${r2(left.sx(left.x0))}" y1="${r2(left.sy(left.x0))}" x2="${r2(left.sx(left.x1))}" y2="${r2(left.sy(left.x1))}" stroke="${C.grey}" stroke-dasharray="5 4"/>`;
      fit.yhat.forEach((v, i) => (svg += dot(left.sx(v), left.sy(y[i]), C.blue, 3.6)));
      svg += lbl(left.right - 4, left.bottom - 6, N.predicted, "#495057", "end", 11, false) + lbl(left.left + 4, left.top + 13, N.actual, "#495057", "start", 11, false);
    }
    const right = makeFrame("reg-n-gd", 88 + HALF, yy + 18, HALF, PH, [0, 3.2], [-6, Math.max(1, Math.ceil(Math.log10(Math.max(...errs, 1e-6)))) ]);
    svg += title(right, N.gdTitle) + axes(right, { xTicks: steps.map((st, i) => ({ v: i, label: String(st) })), xAtBottom: true, yFormat: (v) => `10${v < 0 ? "⁻" : ""}${"⁰¹²³⁴⁵⁶⁷⁸⁹"[Math.abs(Math.round(v))] ?? ""}` });
    svg += `<polyline points="${errs.map((e, i) => `${r2(right.sx(i))},${r2(right.sy(Math.log10(Math.max(e, 1e-6))))}`).join(" ")}" fill="none" stroke="${C.purple}" stroke-width="2.4"/>`;
    errs.forEach((e, i) => (svg += dot(right.sx(i), right.sy(Math.log10(Math.max(e, 1e-6))), C.purple, 4.5)));
    return { svg, h: 18 + PH + 26 };
  });
  return compose(eqTex(fit.w, names), body, h, [{ text: fill(N.summary, { r: nt(fit.r2, 3), e: nt(errs[3], 2) }), color: "#495057" }]);
}

// ---------- polynomial features: a curve as a linear model ----------

function renderFeatures(s: RegSpec, w: RegWords): RenderedSvg {
  const F = w.features;
  const pts = readRows(s.src[0] ?? "", w);
  if (pts[0].length !== 2) throw new Error(w.needRows);
  const d = Number((s.src[1] ?? "").trim());
  if (!Number.isInteger(d) || d < 1 || d > 6) throw new Error(w.needDegree);
  if (pts.length < d + 2) throw new Error(fill(w.fewRows, { n: d + 2 }));
  const X = pts.map(([x]) => Array.from({ length: d + 1 }, (_, j) => x ** j));
  const y = pts.map((p) => p[1]);
  const fit = leastSquares(X, y);
  if (!fit) throw new Error(w.singular);
  const phiNames = Array.from({ length: d }, (_, j) => (j === 0 ? "x" : `x^{${j + 1}}`));
  const rows: TexLine[] = [
    { tex: `\\varphi(x) = (1, ${phiNames.join(", ")})`, op: F.map },
    { tex: `\\hat y = w^\\top \\varphi(x) = ${["w_0", ...phiNames.map((nm, j) => `w_{${j + 1}}${nm}`)].join(" + ")}`, op: F.model },
    { tex: `X = ${firstRows(X)}, \\quad w = (X^\\top X)^{-1}X^\\top y`, op: F.solve },
    { tex: eqTex(fit.w, phiNames), op: F.fit, color: C.blue },
  ];
  const poly = (x: number) => fit.w.reduce((a, c, j) => a + c * x ** j, 0);
  const xs = span(pts.map((p) => p[0]));
  const ys = Array.from({ length: 101 }, (_, i) => poly(xs[0] + ((xs[1] - xs[0]) * i) / 100));
  const { body, h } = layout(rows, (yy) => {
    const fr = makeFrame("reg-f", 74, yy + 18, W - 148, 220, xs, yRange([...y, ...ys], y));
    let svg = title(fr, F.title) + axes(fr, { xAtBottom: true }) + curve(fr, poly, C.blue, 2.6);
    pts.forEach(([x, v]) => (svg += dot(fr.sx(x), fr.sy(v), C.ink, 4)));
    return { svg, h: 18 + 220 + 26 };
  });
  return compose(eqTex(fit.w, phiNames), body, h, [{ text: fill(F.summary, { d, p: d + 1, r: nt(fit.r2, 3) }), color: "#495057" }]);
}

// ---------- one-hot features ----------

function renderOnehot(s: RegSpec, w: RegWords): RenderedSvg {
  const O = w.onehot;
  const items = (s.src[0] ?? "").split(";").map((r) => r.trim()).filter(Boolean).map((r) => {
    const parts = r.split(/[,\s]+/).filter(Boolean);
    if (parts.length !== 2) throw new Error(w.needGroups);
    return { g: parts[0], y: readNum(parts[1], w) };
  });
  if (!items.length) throw new Error(w.needGroups);
  const groups = [...new Set(items.map((it) => it.g))];
  if (groups.length < 2) throw new Error(w.oneGroup);
  // One column per group, no separate intercept: each weight is then that group's mean.
  const X = items.map((it) => groups.map((g) => (g === it.g ? 1 : 0)));
  const y = items.map((it) => it.y);
  const fit = leastSquares(X, y)!;
  const means = groups.map((g) => items.filter((it) => it.g === g).reduce((a, it, _, arr) => a + it.y / arr.length, 0));
  // The groups are named by number in the formulas (names typed in any script stay out of LaTeX), by name on the chart.
  const head = groups.map((_, i) => `[c = ${i + 1}]`);
  const rows: TexLine[] = [
    { tex: `X = ${firstRows(X)}`, op: O.encode },
    { tex: `\\hat y = ${groups.map((_, i) => `w_{${i + 1}} ${head[i]}`).join(" + ")}`, op: O.model },
    { tex: `w = (${fit.w.map(n4).join(", ")})`, op: O.solve, color: C.blue },
  ];
  const { body, h } = layout(rows, (yy) => {
    const fr = makeFrame("reg-o", 74, yy + 18, W - 148, 220, [0.4, groups.length + 0.6], yRange([...y, 0], [0]));
    let svg = title(fr, O.title) + axes(fr, { xTicks: groups.map((g, i) => ({ v: i + 1, label: `${i + 1}: ${g}` })), xAtBottom: true });
    groups.forEach((g, i) => {
      svg += `<line x1="${r2(fr.sx(i + 1) - 30)}" y1="${r2(fr.sy(fit.w[i]))}" x2="${r2(fr.sx(i + 1) + 30)}" y2="${r2(fr.sy(fit.w[i]))}" stroke="${C.blue}" stroke-width="3"/>`;
      svg += lbl(fr.sx(i + 1) + 34, fr.sy(fit.w[i]) + 4, `w${i + 1} = ${nt(fit.w[i], 3)}`, C.blue, "start", 11.5, false);
      items.filter((it) => it.g === g).forEach((it, k) => (svg += dot(fr.sx(i + 1) + ((k % 5) - 2) * 6, fr.sy(it.y), C.ink, 3.6)));
    });
    return { svg, h: 18 + 220 + 26 };
  });
  return compose(`\\hat y = ${groups.map((_, i) => `${n4(fit.w[i])}\\,${head[i]}`).join(" + ")}`.replace(/\+ -/g, "- "), body, h, [
    { text: fill(O.summary, { list: groups.map((g, i) => `${g} ${nt(means[i], 3)}`).join(", ") }), color: "#495057" },
  ]);
}

// ---------- logistic regression ----------

/** A colour mixed with white: a of the colour, 1 − a of white. */
function tint(hex: string, a: number): string {
  const c = [1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * a));
  return `rgb(${c.join(",")})`;
}

function renderLogistic(s: RegSpec, w: RegWords): RenderedSvg {
  const L = w.logistic;
  const rows0 = readRows(s.src[0] ?? "", w, 3);
  if (rows0[0].length !== 3) throw new Error(w.needLabels);
  if (rows0.some((r) => r[2] !== 0 && r[2] !== 1)) throw new Error(w.needLabels);
  if (new Set(rows0.map((r) => r[2])).size < 2) throw new Error(w.needLabels);
  if (!(s.src[1] ?? "").trim()) throw new Error(w.needRate);
  const eta = readNum(s.src[1], w);
  if (!(eta > 0 && eta <= 50)) throw new Error(w.needRate);
  const steps = Number((s.src[2] ?? "").trim());
  if (!Number.isInteger(steps) || steps < 1 || steps > 5000) throw new Error(w.needSteps);
  const X = rows0.map((r) => [1, r[0], r[1]]);
  const y = rows0.map((r) => r[2]);
  const { ws, losses } = trainLogistic(X, y, eta, steps);
  const wf = ws[ws.length - 1];
  const acc = X.filter((r, i) => (sigmoid(dotv(r, wf)) >= 0.5 ? 1 : 0) === y[i]).length / X.length;
  // Every point on its own side: a line separates them, so the loss has no lowest point.
  const sep = acc === 1;
  const rows: TexLine[] = [
    { tex: `P(y = 1 \\mid x) = \\sigma(z) = \\frac{1}{1 + e^{-z}}, \\quad z = w_0 + w_1 x_1 + w_2 x_2`, op: L.sigmoid },
    { tex: `L(w) = -\\frac{1}{n}\\sum \\left[y\\ln\\sigma(z) + (1 - y)\\ln(1 - \\sigma(z))\\right]`, op: L.loss },
    { tex: `\\nabla L = \\frac{1}{n}\\sum (\\sigma(z) - y)\\,(1, x_1, x_2), \\quad w \\leftarrow w - ${tn(eta, 3)}\\,\\nabla L`, op: L.grad },
    { tex: `w^{(${steps})} = (${wf.map(n4).join(", ")}), \\quad L = ${n4(losses[losses.length - 1])}`, op: L.result, color: C.blue },
    { tex: `${eqTex(wf, ["x_1", "x_2"], "z")} = 0`, op: L.boundary, color: C.red },
  ];
  const { body, h } = layout(rows, (yy) => {
    const [xa, xb] = span(rows0.map((r) => r[0]));
    const [ya, yb] = span(rows0.map((r) => r[1]));
    const left = makeFrame("reg-l", 44, yy + 18, HALF, PH, [xa, xb], [ya, yb]);
    // The chance of 1 as a shade over the plane (opaque tints, so the cells leave no seams), then the boundary where it is ½.
    let svg = title(left, L.title);
    const G = 24;
    for (let i = 0; i < G; i++)
      for (let j = 0; j < G; j++) {
        const [x, v] = [xa + ((xb - xa) * (i + 0.5)) / G, ya + ((yb - ya) * (j + 0.5)) / G];
        const p = sigmoid(wf[0] + wf[1] * x + wf[2] * v);
        svg += `<rect x="${r2(left.sx(xa + ((xb - xa) * i) / G))}" y="${r2(left.sy(ya + ((yb - ya) * (j + 1)) / G))}" width="${r2(HALF / G + 0.5)}" height="${r2(PH / G + 0.5)}" fill="${tint(p >= 0.5 ? C.orange : C.blue, 0.05 + 0.25 * Math.abs(p - 0.5) * 2)}"/>`;
      }
    svg += axes(left, { xAtBottom: true });
    if (Math.abs(wf[2]) > 1e-9) svg += `<g clip-path="url(#${left.id})">${curve(left, (x) => -(wf[0] + wf[1] * x) / wf[2], C.red, 2.6)}</g>`;
    else if (Math.abs(wf[1]) > 1e-9) svg += `<line x1="${r2(left.sx(-wf[0] / wf[1]))}" y1="${left.top}" x2="${r2(left.sx(-wf[0] / wf[1]))}" y2="${left.bottom}" stroke="${C.red}" stroke-width="2.6"/>`;
    rows0.forEach(([x, v, lab]) => (svg += lab ? dot(left.sx(x), left.sy(v), C.orange, 4.2) : dot(left.sx(x), left.sy(v), C.blue, 4.2, true)));
    const gx = (wf[1] / Math.hypot(wf[1], wf[2] || 1e-9)) * (xb - xa) * 0.12;
    const gy = (wf[2] / Math.hypot(wf[1], wf[2] || 1e-9)) * (yb - ya) * 0.12;
    const [cx, cy] = [(xa + xb) / 2, Math.abs(wf[2]) > 1e-9 ? -(wf[0] + wf[1] * ((xa + xb) / 2)) / wf[2] : (ya + yb) / 2];
    if (cy > ya && cy < yb && Math.hypot(wf[1], wf[2]) > 1e-9) svg += arrow(left.sx(cx), left.sy(cy), left.sx(cx + gx), left.sy(cy + gy), C.red, 2);
    const right = makeFrame("reg-l-loss", 88 + HALF, yy + 18, HALF, PH, [0, steps], [0, Math.max(...losses) * 1.1]);
    svg += title(right, L.lossTitle) + axes(right, { xAtBottom: true }) + `<polyline points="${losses.map((v, i) => `${r2(right.sx(i))},${r2(right.sy(v))}`).join(" ")}" fill="none" stroke="${C.purple}" stroke-width="2.2"/>`;
    return { svg, h: 18 + PH + 26 };
  });
  const caps = [{ text: fill(L.summary, { a: nt(acc * 100, 3), l: nt(losses[losses.length - 1], 3) }), color: "#495057" }];
  if (sep) caps.push({ text: L.separable, color: C.orange });
  return compose(`${eqTex(wf, ["x_1", "x_2"], "z")}, \\quad L = ${n4(losses[losses.length - 1])}`, body, h, caps);
}

// ---------- reading the weights ----------

function renderWeights(s: RegSpec, w: RegWords): RenderedSvg {
  const R = w.weights;
  const { k, X, fit } = fitRows(s, w);
  const names = xNames(k);
  const n = X.length;
  const sd = (j: number) => Math.sqrt(X.reduce((a, r) => a + (r[j] - X.reduce((b, q) => b + q[j], 0) / n) ** 2, 0) / n);
  const sds = names.map((_, j) => sd(j + 1));
  const scaled = fit.w.slice(1).map((v, j) => v * sds[j]);
  // How far the features move together: the largest correlation between two of them.
  let together = 0;
  let pair = [0, 0];
  for (let a = 1; a <= k; a++)
    for (let b = a + 1; b <= k; b++) {
      const ma = X.reduce((s2, r) => s2 + r[a], 0) / n;
      const mb = X.reduce((s2, r) => s2 + r[b], 0) / n;
      const cov = X.reduce((s2, r) => s2 + (r[a] - ma) * (r[b] - mb), 0) / n;
      const r = cov / (sds[a - 1] * sds[b - 1] || 1);
      if (Math.abs(r) > Math.abs(together)) [together, pair] = [r, [a, b]];
    }
  const rows: TexLine[] = [
    { tex: eqTex(fit.w, names), op: R.fit, color: C.blue },
    { tex: names.map((nm, j) => `\\frac{\\partial \\hat y}{\\partial ${nm}} = ${n4(fit.w[j + 1])}`).join(", \\quad "), op: R.read },
    { tex: names.map((nm, j) => `w_{${j + 1}}\\,\\sigma_{${nm}} = ${n4(scaled[j])}`).join(", \\quad "), op: R.scaled, color: C.orange },
  ];
  const { body, h } = layout(rows, (yy) => {
    const bars = (fr: Frame, v: number[], color: string) =>
      v.map((x, j) => `<rect x="${r2(fr.sx(j + 1) - 16)}" y="${r2(Math.min(fr.sy(x), fr.sy(0)))}" width="32" height="${r2(Math.abs(fr.sy(0) - fr.sy(x)))}" fill="${color}" opacity="0.85"/>` + lbl(fr.sx(j + 1), Math.min(fr.sy(x), fr.sy(0)) - 5, nt(x, 3), color, "middle", 11, false)).join("");
    const ticks = names.map((_, j) => ({ v: j + 1, label: k === 1 ? "x" : `x${"₁₂₃₄₅₆"[j]}` }));
    const rawW = fit.w.slice(1);
    const left = makeFrame("reg-w-raw", 44, yy + 18, HALF, PH, [0.4, k + 0.6], yRange([0, ...rawW], [0]));
    const right = makeFrame("reg-w-sc", 88 + HALF, yy + 18, HALF, PH, [0.4, k + 0.6], yRange([0, ...scaled], [0]));
    // The ticks along the bottom, so a negative bar does not hide its name; a line marks 0.
    const zero = (fr: Frame) => `<line x1="${fr.left}" y1="${r2(fr.sy(0))}" x2="${fr.right}" y2="${r2(fr.sy(0))}" stroke="${C.ink}" stroke-width="1.2"/>`;
    const svg = title(left, R.rawTitle) + axes(left, { xTicks: ticks, xAtBottom: true }) + bars(left, rawW, C.blue) + zero(left) + title(right, R.scaledTitle) + axes(right, { xTicks: ticks, xAtBottom: true }) + bars(right, scaled, C.orange) + zero(right);
    return { svg, h: 18 + PH + 26 };
  });
  const caps = [{ text: R.summary, color: "#495057" }];
  if (Math.abs(together) > 0.8) caps.push({ text: fill(R.together, { a: pair[0], b: pair[1], r: nt(together, 2) }), color: C.red });
  return compose(eqTex(fit.w, names), body, h, caps);
}

// ---------- entry ----------

export function renderRegression(spec: RegSpec, w: RegWords): RenderedSvg {
  exprMessages(w);
  switch (spec.topic) {
    case "normal":
      return renderNormal(spec, w);
    case "features":
      return renderFeatures(spec, w);
    case "onehot":
      return renderOnehot(spec, w);
    case "logistic":
      return renderLogistic(spec, w);
    case "weights":
      return renderWeights(spec, w);
  }
}

const P_ = (topic: RegTopic, ...src: string[]): RegSpec => ({ topic, src });
export const REG_PRESETS: { [K in RegTopic]: { label: string; spec: RegSpec }[] } = {
  normal: [
    { label: "one feature: a line", spec: P_("normal", "1, 2.1; 2, 2.9; 3, 4.2; 4, 4.8; 5, 6.1; 6, 6.8") },
    { label: "house prices: size and rooms", spec: P_("normal", "50, 2, 150; 60, 2, 170; 75, 3, 210; 80, 3, 225; 95, 4, 260; 110, 4, 290; 120, 5, 330") },
    { label: "three features", spec: P_("normal", "1, 0, 2, 5.1; 2, 1, 0, 4.8; 0, 2, 1, 6.2; 3, 1, 1, 7.9; 1, 3, 0, 7.1; 2, 2, 2, 10.2; 4, 0, 1, 7.0") },
  ],
  features: [
    { label: "a parabola, degree 2", spec: P_("features", "-2, 4.2; -1, 1.1; 0, 0.2; 1, 0.9; 2, 4.1; 3, 9.2", "2") },
    { label: "the same with a line", spec: P_("features", "-2, 4.2; -1, 1.1; 0, 0.2; 1, 0.9; 2, 4.1; 3, 9.2", "1") },
    { label: "a wave, degree 3", spec: P_("features", "0, 0.1; 0.5, 0.6; 1, 0.8; 1.5, 0.5; 2, -0.1; 2.5, -0.6; 3, -0.7; 3.5, -0.3", "3") },
  ],
  onehot: [
    { label: "fruit prices by colour", spec: P_("onehot", "red 3; red 4; red 3.5; green 2; green 2.5; yellow 5; yellow 4.5; yellow 5.5") },
    { label: "test scores by class", spec: P_("onehot", "A 71; A 78; A 74; B 65; B 70; C 82; C 88; C 79; C 85") },
  ],
  logistic: [
    { label: "two clusters", spec: P_("logistic", "1, 1, 0; 1.5, 2, 0; 2, 1.2, 0; 2.5, 2.5, 0; 3, 1.5, 0; 4, 4, 1; 4.5, 3, 1; 5, 4.5, 1; 5.5, 3.5, 1; 3.5, 4.2, 1", "0.5", "200") },
    { label: "overlapping classes", spec: P_("logistic", "1, 2, 0; 2, 1, 0; 2.5, 3, 0; 3, 2, 1; 3.5, 1.5, 0; 3, 3.5, 1; 4, 2.5, 1; 4.5, 4, 1; 2, 3.5, 1; 5, 3, 1", "0.5", "300") },
    { label: "one step only", spec: P_("logistic", "1, 1, 0; 1.5, 2, 0; 2, 1.2, 0; 2.5, 2.5, 0; 3, 1.5, 0; 4, 4, 1; 4.5, 3, 1; 5, 4.5, 1; 5.5, 3.5, 1; 3.5, 4.2, 1", "0.5", "1") },
  ],
  weights: [
    { label: "size in m² and age in years", spec: P_("weights", "50, 30, 140; 60, 5, 190; 75, 20, 200; 80, 40, 195; 95, 10, 270; 110, 35, 265; 120, 15, 320") },
    { label: "two features that move together", spec: P_("weights", "1, 1.1, 3.0; 2, 2.0, 5.2; 3, 3.1, 6.9; 4, 3.9, 9.1; 5, 5.2, 11.0; 6, 5.9, 13.1") },
  ],
};
