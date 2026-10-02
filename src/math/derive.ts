// Differentiation, one rule at a time: from first principles (the limit of the difference quotient, for
// polynomials), by the rules (sum, constant multiple, power, product, quotient, chain and the standard derivatives)
// with every pending derivative (u)′ opened one level per line, the chain rule as a chain of layers
// dy/du · du/dv · dv/dx, tangents and normals at a point, and stationary points with the second-derivative test
// and a sign chart. A small symbolic engine (expression trees, a tidy-up and a simplifier) does the work; numbers are
// exact fractions, and every derivative is checked against a numerical one.
import { axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nf, r2, texLines, W, yRange, type Caption, type Frame, type TexLine } from "./chart";
import {
  add, D, div, E_, exprMessages, F, fn, fromPoly, has, isN, isNum, key, mul, N, neg, pdeg, peval, pow, qsNum, qsPlain, qsTex, realRoots,
  simp, sub, substitute, tex, tidy, toPoly, V, X, approx, evalE, parseE, type E, type Fn, type QS,
} from "./expr";
import { Frac } from "./fraction";
import { latexToSvg, type RenderedSvg } from "./latex";

export type DerivTopic = "first" | "rules" | "chain" | "tangent" | "stationary";
export const DERIV_TOPICS: DerivTopic[] = ["first", "rules", "chain", "tangent", "stationary"];
export type DerivSpec = { topic: DerivTopic; src: string; at: string };

type RuleKey =
  | "sum" | "const" | "constMul" | "power" | "product" | "quotient" | "chain" | "exp" | "expA" | "logDiff"
  | "ln" | "log" | "sin" | "cos" | "tan" | "sec" | "csc" | "cot" | "asin" | "acos" | "atan" | "sinh" | "cosh" | "tanh";

export type DerivWords = {
  bad: string;
  tooBig: string;
  onlyX: string;
  needPoly: string;
  needAt: string;
  notDefined: string;
  rules: Record<RuleKey, string>;
  formulas: Record<RuleKey, string>;
  used: string;
  simplify: string;
  check: string;
  legendF: string;
  legendD: string;
  first: { fxh: string; diff: string; divide: string; limit: string; secants: string };
  chain: { notComposite: string; layers: string; local: string; multiply: string; back: string; picture: string };
  tangent: { derivative: string; value: string; slope: string; tangent: string; normal: string; normalVertical: string; summary: string };
  stat: {
    derivative: string;
    solve: string;
    none: string;
    second: string;
    max: string;
    min: string;
    flat: string;
    inflection: string;
    increasing: string;
    decreasing: string;
    approx: string;
    summary: string;
  };
};

let words: DerivWords | undefined;

// ---------- the rules ----------

/** The standard derivative of f at a (without the chain-rule factor). */
function outerDerivative(f: Fn, a: E): E {
  const sq = (g: E) => pow(g, 2);
  switch (f) {
    case "sin":
      return fn("cos", a);
    case "cos":
      return neg(fn("sin", a));
    case "tan":
      return sq(fn("sec", a));
    case "sec":
      return mul(fn("sec", a), fn("tan", a));
    case "csc":
      return neg(mul(fn("csc", a), fn("cot", a)));
    case "cot":
      return neg(sq(fn("csc", a)));
    case "ln":
      return pow(a, -1);
    case "asin":
      return pow(sub(N(1), sq(a)), N(-1, 2));
    case "acos":
      return neg(pow(sub(N(1), sq(a)), N(-1, 2)));
    case "atan":
      return pow(add(N(1), sq(a)), -1);
    case "sinh":
      return fn("cosh", a);
    case "cosh":
      return fn("sinh", a);
    case "tanh":
      return pow(sq(fn("cosh", a)), -1);
  }
}

/** A pending derivative — except that constants and x itself are done on the spot. */
function Dq(a: E, rules: Set<RuleKey>): E {
  if (!has(a)) return rules.add("const"), N(0);
  if (a.k === "var") return rules.add("power"), N(1);
  return D(a);
}

/** One level of d/dx of u: the rule's result, with new pending derivatives (v)′ inside it. */
function rule(u: E, rules: Set<RuleKey>): E {
  const D = (a: E) => Dq(a, rules);
  if (!has(u)) {
    rules.add("const");
    return N(0);
  }
  const chain = (outer: E, inner: E) => (inner.k === "var" ? outer : (rules.add("chain"), mul(outer, D(inner))));
  switch (u.k) {
    case "var":
      rules.add("power");
      return N(1);
    case "add":
      rules.add("sum");
      return add(...u.ts.map(D));
    case "mul": {
      const cs = u.fs.filter((f) => !has(f));
      const vs = u.fs.filter((f) => has(f));
      const one = (fs: E[]) => (fs.length === 1 ? fs[0] : mul(...fs));
      if (cs.length) {
        rules.add("constMul");
        return mul(...cs, D(one(vs)));
      }
      const isDen = (f: E) => f.k === "pow" && isNum(f.e) && f.e.v.isNeg();
      const tops = vs.filter((f) => !isDen(f));
      const bots = vs.filter(isDen).map((f) => tidy(pow((f as { b: E }).b, N((f as { e: { v: Frac } }).e.v.neg()))));
      if (tops.length && bots.length) {
        rules.add("quotient");
        const [t, b] = [one(tops), one(bots)];
        return div(sub(mul(D(t), b), mul(t, D(b))), pow(b, 2));
      }
      rules.add("product");
      const [first, ...rest] = vs;
      const r = one(rest);
      return add(mul(D(first), r), mul(first, D(r)));
    }
    case "pow": {
      if (!has(u.e)) {
        rules.add("power");
        const n1 = isNum(u.e) ? N(u.e.v.sub(F(1))) : add(u.e, N(-1));
        return chain(mul(u.e, pow(u.b, n1)), u.b);
      }
      if (!has(u.b)) {
        if (u.b.k === "e") {
          rules.add("exp");
          return chain(pow(E_, u.e), u.e);
        }
        rules.add("expA");
        return chain(mul(pow(u.b, u.e), fn("ln", u.b)), u.e);
      }
      // xˣ = e^(x ln x): the derivative is xˣ times (x ln x)′.
      rules.add("logDiff");
      return mul(u, D(mul(u.e, fn("ln", u.b))));
    }
    case "fn":
      rules.add(u.f as RuleKey);
      return chain(outerDerivative(u.f, u.a), u.a);
    case "log":
      rules.add("log");
      return chain(pow(mul(u.a, fn("ln", N(u.base))), -1), u.a);
    default:
      return N(0);
  }
}

const hasD = (e: E): boolean =>
  e.k === "d" || (e.k === "add" ? e.ts.some(hasD) : e.k === "mul" ? e.fs.some(hasD) : e.k === "pow" ? hasD(e.b) || hasD(e.e) : e.k === "fn" || e.k === "log" ? hasD(e.a) : false);
function openD(e: E, rules: Set<RuleKey>): E {
  switch (e.k) {
    case "d":
      return rule(tidy(e.a), rules);
    case "add":
      return add(...e.ts.map((t) => openD(t, rules)));
    case "mul":
      return mul(...e.fs.map((f) => openD(f, rules)));
    case "pow":
      return pow(openD(e.b, rules), openD(e.e, rules));
    default:
      return e;
  }
}
/** The main rules first in the step labels. */
const RULE_ORDER: RuleKey[] = ["product", "quotient", "chain", "logDiff", "sum", "constMul", "power", "exp", "expA", "ln", "log", "sin", "cos", "tan", "sec", "csc", "cot", "asin", "acos", "atan", "sinh", "cosh", "tanh", "const"];

/** Lines "= …" from (f)′ down to the simplified derivative. */
export function differentiate(f: E): { rows: TexLine[]; result: E; used: RuleKey[] } {
  let cur: E = D(f);
  const rows: TexLine[] = [];
  const used = new Set<RuleKey>();
  for (let i = 0; i < 40 && hasD(cur); i++) {
    const rs = new Set<RuleKey>();
    cur = tidy(openD(cur, rs));
    rs.forEach((r) => used.add(r));
    const names = RULE_ORDER.filter((r) => rs.has(r) && (r !== "const" || rs.size === 1));
    // Without a tool's words (another tool asking for just the result) the step labels stay empty.
    rows.push({ tex: `= ${tex(cur)}`, op: words ? names.slice(0, 3).map((r) => words!.rules[r]).join(", ") : "" });
  }
  const result = simp(simp(cur));
  if (key(result) !== key(cur)) rows.push({ tex: `= ${tex(result)}`, op: words?.simplify });
  return { rows, result, used: RULE_ORDER.filter((r) => used.has(r) && r !== "const") };
}
/** Just the simplified derivative. */
/** Just the simplified derivative. */
export const derive = (f: E) => differentiate(f).result;

/** Points where f is defined, for the numerical check. */
function checkPoints(f: E, d: E): number[] {
  return [0.73, 1.37, -0.61, 2.21, 0.29, -1.43, 3.1].filter((x) => [f, d].every((g) => Number.isFinite(evalE(g, x))) && Number.isFinite(evalE(f, x + 1e-4)) && Number.isFinite(evalE(f, x - 1e-4)));
}
function numericCheck(f: E, d: E): Caption | null {
  const x = checkPoints(f, d)[0];
  if (x === undefined) return null;
  // Central differences with h and h/2 combined (Richardson), good even for fast-changing functions.
  const c = (h: number) => (evalE(f, x + h) - evalE(f, x - h)) / (2 * h);
  const [a, b] = [c(2e-5), c(1e-5)];
  const n = b + (b - a) / 3;
  return { text: fill(words!.check, { x, n: approx(n), d: approx(evalE(d, x)) }), color: C.green };
}

// ---------- pictures ----------

/** f and f′ on one set of axes. */
function graphs(curves: { g: E; color: string; name: string }[], y0: number, around?: number, extra?: (fr: Frame) => string): { svg: string; h: number } {
  const trig = curves.some((c) => /\(sin|\(cos|\(tan|\(sec|\(csc|\(cot/.test(key(c.g)));
  const [x0, x1] = around !== undefined ? [around - 4, around + 4] : trig ? [-2 * Math.PI, 2 * Math.PI] : [-4, 4];
  const ys: number[] = [];
  for (const c of curves) for (let i = 0; i <= 400; i++) ys.push(evalE(c.g, x0 + ((x1 - x0) * i) / 400));
  // The middle of the values, so a vertical asymptote doesn't flatten everything else.
  const fin = ys.filter(Number.isFinite).sort((a, b) => a - b);
  const [q1, q9] = fin.length ? [fin[Math.floor(fin.length * 0.1)], fin[Math.ceil(fin.length * 0.9) - 1]] : [-1, 1];
  const spread = Math.max(q9 - q1, 1);
  const fr = makeFrame(`dv-${Math.round(x0 * 10)}-${curves.length}`, 48, y0 + 6, W - 48 - 24, 260, [x0, x1], yRange(fin.filter((v) => v > q1 - spread * 0.6 && v < q9 + spread * 0.6), [0]));
  const parts = [axes(fr)];
  for (const c of curves) parts.push(curve(fr, (x) => evalE(c.g, x), c.color, 2.4));
  if (extra) parts.push(extra(fr));
  curves.forEach((c, i) => parts.push(lbl(fr.left + 10, fr.top + 18 + i * 19, c.name, c.color, "start", 13, false)));
  return { svg: parts.join(""), h: fr.bottom - y0 + 22 };
}
const text = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 13}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""}>${esc(s)}</text>`;

// ---------- by the rules ----------

function renderRules(s: DerivSpec, w: DerivWords): RenderedSvg {
  const f = parseE(s.src);
  const { rows, result, used } = differentiate(f);
  if (rows.length) rows[rows.length - 1].color = C.green;
  const caps: Caption[] = [];
  if (used.length) caps.push({ text: `${w.used} ${used.slice(0, 4).map((r) => w.formulas[r]).join("; ")}`, color: "#495057" });
  const chk = numericCheck(f, result);
  if (chk) caps.push(chk);
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;
  const g = graphs([{ g: f, color: C.blue, name: w.legendF }, { g: result, color: C.orange, name: w.legendD }], y);
  body.push(g.svg);
  y += g.h;
  return compose(`\\frac{d}{dx}\\left(${tex(f)}\\right)`, body.join(""), y, caps);
}

/** LaTeX placed in the picture, shrunk to fit a width. */
function fitTex(t: string, cx0: number, cy: number, maxW: number, color = C.ink): { svg: string; h: number } {
  const r = latexToSvg(t, color);
  const k = Math.min(1, maxW / r.width);
  const [w, h] = [r.width * k, r.height * k];
  // Keep it on the page.
  const cx = Math.min(Math.max(cx0, w / 2 + 6), W - w / 2 - 6);
  return {
    svg: r.svg
      .replace(/width="[\d.]+"/, `width="${r2(w)}"`)
      .replace(/height="[\d.]+"/, `height="${r2(h)}"`)
      .replace(/^<svg/, `<svg x="${r2(cx - w / 2)}" y="${r2(cy - h / 2)}"`),
    h,
  };
}

// ---------- from first principles ----------

/** A polynomial in x and h: "i,j" → coefficient of xⁱhʲ. */
type XH = Map<string, Frac>;
function xhTex(p: XH): string {
  const terms = [...p.entries()]
    .filter(([, c]) => !c.isZero())
    .map(([k, c]) => ({ i: Number(k.split(",")[0]), j: Number(k.split(",")[1]), c }))
    .sort((a, b) => a.j - b.j || b.i - a.i);
  if (!terms.length) return "0";
  return terms
    .map((t, n) => {
      const vars = `${t.i ? (t.i === 1 ? "x" : `x^{${t.i}}`) : ""}${t.j ? (t.j === 1 ? "h" : `h^{${t.j}}`) : ""}`;
      const a = t.c.abs();
      const body = vars && a.isOne() ? vars : `${a.tex()}${vars}`;
      return `${t.c.isNeg() ? (n ? "- " : "-") : n ? "+ " : ""}${body}`;
    })
    .join(" ");
}
function binom(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

function renderFirst(s: DerivSpec, w: DerivWords): RenderedSvg {
  const W1 = w.first;
  const f = parseE(s.src);
  const p = toPoly(f);
  if (!p || pdeg(p) > 5) throw new Error(w.needPoly);
  // f(x + h) = Σ cₖ (x + h)ᵏ = Σ cₖ C(k, j) x^(k−j) hʲ
  const fxh: XH = new Map();
  p.forEach((c, k) => {
    for (let j = 0; j <= k; j++) {
      const key2 = `${k - j},${j}`;
      fxh.set(key2, (fxh.get(key2) ?? F(0)).add(c.mul(F(binom(k, j)))));
    }
  });
  const diff: XH = new Map([...fxh].filter(([k]) => !k.endsWith(",0")));
  const quot: XH = new Map([...diff].map(([k, c]) => {
    const [i, j] = k.split(",").map(Number);
    return [`${i},${j - 1}`, c];
  }));
  const lim: XH = new Map([...quot].filter(([k]) => k.endsWith(",0")));
  const result = fromPoly(p.map((c, k) => c.mul(F(k))).slice(1));
  const rows: TexLine[] = [
    { tex: `f(x + h) = ${tex(substitute(f, "x", add(X, V("h"))))}`, op: W1.fxh },
    { tex: `= ${xhTex(fxh)}` },
    { tex: `f(x + h) - f(x) = ${xhTex(diff)}`, op: W1.diff },
    { tex: `\\frac{f(x + h) - f(x)}{h} = ${xhTex(quot)}`, op: W1.divide },
    { tex: `f'(x) = \\lim_{h \\to 0}\\left(${xhTex(quot)}\\right) = ${xhTex(lim)}`, op: W1.limit, color: C.green },
  ];
  // Secants through x₀ for shrinking h close in on the tangent.
  const atE = s.at.trim() ? simp(parseE(s.at)) : N(1);
  if (has(atE)) throw new Error(w.needAt);
  const x0 = evalE(atE, 0);
  const fx = (x: number) => evalE(f, x);
  const m0 = evalE(result, x0);
  const hs = [2, 1, 0.5, 0.1];
  const caps: Caption[] = [
    { text: fill(W1.secants, { list: hs.map((h) => `h = ${h}: ${approx((fx(x0 + h) - fx(x0)) / h)}`).join(", "), m: approx(m0), x: approx(x0) }), color: "#495057" },
  ];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;
  const ys: number[] = [];
  for (let i = 0; i <= 300; i++) ys.push(fx(x0 - 1.5 + (4.5 * i) / 300));
  const fr = makeFrame("dv-first", 48, y + 6, W - 48 - 24, 260, [x0 - 1.5, x0 + 3], yRange(ys, [fx(x0)]));
  const parts = [axes(fr), curve(fr, fx, C.blue, 2.6)];
  const shades = ["#ffc078", "#ff922b", "#f76707", "#d9480f"];
  hs.forEach((h, i) => {
    const m = (fx(x0 + h) - fx(x0)) / h;
    parts.push(curve(fr, (x) => fx(x0) + m * (x - x0), shades[i], 1.6, `opacity="0.85"`), dot(fr.sx(x0 + h), fr.sy(fx(x0 + h)), shades[i], 3.5));
  });
  parts.push(curve(fr, (x) => fx(x0) + m0 * (x - x0), C.green, 2.4, `stroke-dasharray="7 4"`), dot(fr.sx(x0), fr.sy(fx(x0)), C.red, 5));
  body.push(parts.join(""));
  y = fr.bottom + 16;
  return compose(`f(x) = ${tex(f)}`, body.join(""), y, caps);
}

// ---------- the chain rule ----------

const LAYER_NAMES = ["u", "v", "w", "t", "s"];
/** The inner expression to peel off next, or null when the expression is just built from x. */
function innerOf(e: E): E | null {
  switch (e.k) {
    case "fn":
    case "log":
      return e.a.k === "var" ? null : e.a;
    case "pow":
      if (!has(e.e)) return e.b.k === "var" ? null : e.b;
      if (!has(e.b)) return e.e.k === "var" ? null : e.e;
      return null;
    case "mul": {
      const vs = e.fs.filter((f) => has(f));
      return vs.length === 1 ? innerOf(vs[0]) : null;
    }
    case "add": {
      const vs = e.ts.filter((t) => has(t));
      return vs.length === 1 ? innerOf(vs[0]) : null;
    }
    default:
      return null;
  }
}
/** Replace one particular sub-expression (by identity). */
function replaceNode(e: E, target: E, by: E): E {
  if (e === target) return by;
  switch (e.k) {
    case "add":
      return add(...e.ts.map((t) => replaceNode(t, target, by)));
    case "mul":
      return mul(...e.fs.map((f) => replaceNode(f, target, by)));
    case "pow":
      return pow(replaceNode(e.b, target, by), replaceNode(e.e, target, by));
    case "fn":
      return fn(e.f, replaceNode(e.a, target, by));
    case "log":
      return { ...e, a: replaceNode(e.a, target, by) };
    default:
      return e;
  }
}

function renderChain(s: DerivSpec, w: DerivWords): RenderedSvg {
  const Cw = w.chain;
  const f = parseE(s.src);
  // y = outer(u), u = g(v), …, innermost in x.
  const layers: { lhs: string; rhs: E; v: string }[] = [];
  let cur = f;
  let lhs = "y";
  for (let i = 0; i < LAYER_NAMES.length; i++) {
    const inner = innerOf(cur);
    if (!inner) break;
    const v = LAYER_NAMES[i];
    layers.push({ lhs, rhs: replaceNode(cur, inner, V(v)), v });
    cur = inner;
    lhs = v;
  }
  if (!layers.length) throw new Error(Cw.notComposite);
  layers.push({ lhs, rhs: cur, v: "x" });
  // Each layer differentiated by its own letter.
  const local = layers.map((L) => {
    const asX = substitute(L.rhs, L.v, X);
    return substitute(derive(asX), "x", V(L.v));
  });
  const dName = (L: { lhs: string; v: string }) => `\\frac{d${L.lhs}}{d${L.v}}`;
  const rows: TexLine[] = [
    { tex: layers.map((L) => `${L.lhs} = ${tex(L.rhs)}`).join(", \\quad "), op: Cw.layers },
    { tex: layers.map((L, i) => `${dName(L)} = ${tex(local[i])}`).join(", \\quad "), op: Cw.local },
  ];
  const product = mul(...local);
  rows.push({ tex: `\\frac{dy}{dx} = ${layers.map(dName).join(" \\cdot ")} = ${local.map((l) => (l.k === "add" ? `\\left(${tex(l)}\\right)` : tex(l))).join(" \\cdot ")}`, op: Cw.multiply });
  // Back to x: u, v, … replaced by what they stand for, outermost first.
  let back: E = product;
  for (const L of layers.slice(1)) back = substitute(back, L.lhs, L.rhs);
  back = tidy(back);
  rows.push({ tex: `= ${tex(back)}`, op: Cw.back });
  const result = simp(back);
  if (key(result) !== key(back)) rows.push({ tex: `= ${tex(result)}`, op: w.simplify });
  rows[rows.length - 1].color = C.green;
  const caps: Caption[] = [];
  const chk = numericCheck(f, result);
  if (chk) caps.push(chk);
  caps.unshift({ text: Cw.picture, color: "#495057" });

  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 10;
  // The chain: x → innermost → … → y, each arrow carrying its derivative.
  const nodes = ["x", ...[...layers].reverse().map((L) => L.lhs)];
  const n = nodes.length;
  const gap = (W - 80) / (n - 1);
  const cy = y + 46;
  const parts: string[] = [];
  nodes.forEach((name, i) => {
    const cx = 40 + i * gap;
    parts.push(`<circle cx="${r2(cx)}" cy="${cy}" r="17" fill="${i === 0 ? "#e7f5ff" : i === n - 1 ? "#ebfbee" : "#fff4e6"}" stroke="${i === 0 ? C.blue : i === n - 1 ? C.green : C.orange}" stroke-width="2"/>`);
    parts.push(text(cx, cy + 6, name, { anchor: "middle", size: 17, bold: true }));
    if (i > 0) {
      const L = layers[n - 1 - i];
      const def = fitTex(`${L.lhs} = ${tex(L.rhs)}`, cx, cy + 44, gap - 8);
      parts.push(def.svg);
      const ax = 40 + (i - 1) * gap + 20;
      const bx = cx - 20;
      parts.push(`<line x1="${r2(ax)}" y1="${cy}" x2="${r2(bx - 6)}" y2="${cy}" stroke="#495057" stroke-width="1.8"/>`, `<path d="M${r2(bx)},${cy} l-9,-4.5 l0,9 Z" fill="#495057"/>`);
      const lab = fitTex(`${dName(L)} = ${tex(local[n - 1 - i])}`, (ax + bx) / 2, cy - 30, gap - 30, C.purple);
      parts.push(lab.svg);
    }
  });
  body.push(parts.join(""));
  y = cy + 80;
  const g = graphs([{ g: f, color: C.blue, name: w.legendF }, { g: result, color: C.orange, name: w.legendD }], y);
  body.push(g.svg);
  y += g.h;
  return compose(`y = ${tex(f)}`, body.join(""), y, caps);
}

// ---------- tangent and normal ----------

function renderTangent(s: DerivSpec, w: DerivWords): RenderedSvg {
  const Tw = w.tangent;
  const f = parseE(s.src);
  if (!s.at.trim()) throw new Error(w.needAt);
  const aE = simp(parseE(s.at));
  if (has(aE)) throw new Error(w.needAt);
  const d = derive(f);
  const a = evalE(aE, 0);
  const clean = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  const fa = clean(evalE(f, a));
  const m = clean(evalE(d, a));
  if (!Number.isFinite(fa) || !Number.isFinite(m)) throw new Error(fill(w.notDefined, { a: approx(a) }));
  // Exact when substituting leaves a number.
  const at = (g: E) => simp(substitute(g, "x", aE));
  const faE = at(f);
  const mE = at(d);
  const exact = isNum(aE) && isNum(faE) && isNum(mE);
  const val = (e: E, v: number) => (isNum(e) ? e.v.tex() : `${tex(e)} \\approx ${approx(v).replace("−", "-")}`);
  const aT = tex(aE);
  const rows: TexLine[] = [
    { tex: `f'(x) = ${tex(d)}`, op: Tw.derivative },
    { tex: `f(${aT}) = ${val(faE, fa)}`, op: Tw.value },
    { tex: `f'(${aT}) = ${val(mE, m)}`, op: Tw.slope, color: C.orange },
  ];
  const lineTex = (slope: number, slopeE: E | null): string => {
    if (exact && slopeE && isNum(slopeE) && isNum(aE) && isNum(faE)) {
      const c = faE.v.sub(slopeE.v.mul(aE.v));
      return `y = ${tex(simp(add(mul(slopeE, X), N(c))))}`;
    }
    const c = fa - slope * a;
    return `y \\approx ${approx(slope).replace("−", "-")}x ${c < 0 ? "-" : "+"} ${approx(Math.abs(c))}`;
  };
  const pt = `\\left(${aT}, ${isNum(faE) ? faE.v.tex() : approx(fa).replace("−", "-")}\\right)`;
  rows.push({ tex: `y - ${isNum(faE) ? faE.v.texP() : `\\left(${approx(fa).replace("−", "-")}\\right)`} = ${isNum(mE) ? (mE.v.isOne() ? "" : mE.v.n === -1 && mE.v.d === 1 ? "-" : mE.v.texP()) : approx(m).replace("−", "-")}\\left(x - ${isNum(aE) ? aE.v.texP() : aT}\\right) \\;\\Rightarrow\\; ${lineTex(m, mE)}`, op: Tw.tangent, color: C.orange });
  const mN = Math.abs(m) < 1e-12 ? null : -1 / m;
  if (mN === null) rows.push({ tex: `x = ${aT}`, op: Tw.normalVertical, color: C.green });
  else {
    const mNE = isNum(mE) ? N(F(-1).div(mE.v)) : null;
    rows.push({ tex: `m_n = -\\frac{1}{${isNum(mE) ? mE.v.tex() : approx(m)}} ${isNum(mE) ? "=" : "\\approx"} ${mNE && isNum(mNE) ? mNE.v.tex() : approx(mN).replace("−", "-")} \\;\\Rightarrow\\; ${lineTex(mN, mNE)}`, op: Tw.normal, color: C.green });
  }
  const caps: Caption[] = [{ text: fill(Tw.summary, { p: plainTex(pt), m: isNum(mE) ? plainTex(mE.v.tex()) : approx(m) }), color: "#495057" }];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;
  // Equal units, so the normal looks perpendicular.
  const span = 3.2;
  const hPx = 300;
  const wPx = W - 48 - 24;
  const ySpan = (span * 2 * hPx) / wPx / 2;
  const fr = makeFrame("dv-tan", 48, y + 6, wPx, hPx, [a - span, a + span], [fa - ySpan, fa + ySpan]);
  const parts = [axes(fr), curve(fr, (x) => evalE(f, x), C.blue, 2.6), curve(fr, (x) => fa + m * (x - a), C.orange, 2.2)];
  if (mN === null) parts.push(`<line x1="${r2(fr.sx(a))}" y1="${fr.top}" x2="${r2(fr.sx(a))}" y2="${fr.bottom}" stroke="${C.green}" stroke-width="2" stroke-dasharray="7 4"/>`);
  else parts.push(curve(fr, (x) => fa + mN * (x - a), C.green, 2, `stroke-dasharray="7 4"`));
  parts.push(dot(fr.sx(a), fr.sy(fa), C.red, 5.5));
  body.push(parts.join(""));
  y = fr.bottom + 16;
  return compose(`f(x) = ${tex(f)}`, body.join(""), y, caps);
}
const minus = (t: string) => t.replace(/-/g, "−");
/** LaTeX of a simple value as running text: \frac{\pi}{2} → π/2. */
const plainTex = (t: string) =>
  minus(t.replace(/\\left|\\right|\\,/g, "").replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2").replace(/\\pi/g, "π").replace(/\s+/g, " ").replace(/[{}]/g, "").replace(/\(\s/g, "(").trim());

// ---------- stationary points ----------

function renderStationary(s: DerivSpec, w: DerivWords): RenderedSvg {
  const Sw = w.stat;
  const f = parseE(s.src);
  const p = toPoly(f);
  if (!p || pdeg(p) < 2 || pdeg(p) > 4) throw new Error(w.needPoly);
  const d1 = p.map((c, k) => c.mul(F(k))).slice(1);
  const d2 = d1.map((c, k) => c.mul(F(k))).slice(1);
  const rows: TexLine[] = [{ tex: `f'(x) = ${tex(fromPoly(d1))}`, op: Sw.derivative }];
  const found = realRoots(d1);
  type St = { x: number; xTex: string; xPlain: string; y: number; yTex: string; kind: "max" | "min" | "inflection" };
  const pts: St[] = [];
  const caps: Caption[] = [];
  const classify = (x: number, d2v: number): St["kind"] => {
    if (Math.abs(d2v) > 1e-12) return d2v < 0 ? "max" : "min";
    const fd = (t: number) => d1.reduceRight((acc, c) => acc * t + c.toNumber(), 0);
    const [l, r] = [fd(x - 1e-3), fd(x + 1e-3)];
    return l > 0 && r < 0 ? "max" : l < 0 && r > 0 ? "min" : "inflection";
  };
  // Exact roots and numerical ones, in order along the axis.
  const roots: ({ exact: QS } | { approx: number })[] = [...found.exact.map((r) => ({ exact: r })), ...found.approx.map((x) => ({ approx: x }))].sort(
    (u, v) => ("exact" in u ? qsNum(u.exact) : u.approx) - ("exact" in v ? qsNum(v.exact) : v.approx),
  );
  const ax = (v: number) => approx(v).replace("−", "-");
  if (!roots.length) rows.push({ tex: `f'(x) = 0`, op: Sw.none, color: C.red });
  else {
    rows.push({ tex: `f'(x) = 0 \\;\\Rightarrow\\; ${roots.map((r) => ("exact" in r ? `x = ${qsTex(r.exact)}` : `x \\approx ${ax(r.approx)}`)).join(", \\; ")}`, op: found.approx.length ? Sw.approx : Sw.solve });
    rows.push({ tex: `f''(x) = ${tex(fromPoly(d2))}`, op: Sw.second });
    for (const r of roots) {
      if ("exact" in r) {
        const v2 = peval(d2, r.exact);
        const fy = peval(p, r.exact);
        const kind = classify(qsNum(r.exact), qsNum(v2));
        const sign = Math.abs(qsNum(v2)) < 1e-12 ? "= 0" : qsNum(v2) > 0 ? "> 0" : "< 0";
        pts.push({ x: qsNum(r.exact), xTex: qsTex(r.exact), xPlain: qsPlain(r.exact), y: qsNum(fy), yTex: qsTex(fy), kind });
        rows.push({
          tex: `f''\\left(${qsTex(r.exact)}\\right) = ${qsTex(v2)} ${sign === "= 0" ? "" : sign}, \\quad f\\left(${qsTex(r.exact)}\\right) = ${qsTex(fy)}`,
          op: sign === "= 0" ? `${Sw.flat}: ${Sw[kind]}` : Sw[kind],
          color: kind === "max" ? C.red : kind === "min" ? C.green : C.purple,
        });
      } else {
        const x = r.approx;
        const v2 = d2.reduceRight((acc, c) => acc * x + c.toNumber(), 0);
        const fy = p.reduceRight((acc, c) => acc * x + c.toNumber(), 0);
        const kind = classify(x, v2);
        pts.push({ x, xTex: ax(x), xPlain: approx(x), y: fy, yTex: ax(fy), kind });
        rows.push({ tex: `f''(${ax(x)}) \\approx ${ax(v2)}, \\quad f \\approx ${ax(fy)}`, op: Sw[kind], color: kind === "max" ? C.red : kind === "min" ? C.green : C.purple });
      }
    }
  }
  // Where f rises and falls: the sign of f′ between its zeros.
  const xs = pts.map((t) => t.x);
  const fd = (t: number) => d1.reduceRight((acc, c) => acc * t + c.toNumber(), 0);
  const bounds = [-Infinity, ...xs, Infinity];
  const labels = ["−∞", ...pts.map((t) => t.xPlain), "∞"];
  const up: string[] = [];
  const down: string[] = [];
  const midOf = (i: number) => {
    const [lo, hi] = [bounds[i], bounds[i + 1]];
    return !Number.isFinite(lo) ? (Number.isFinite(hi) ? hi - 1 : 0) : !Number.isFinite(hi) ? lo + 1 : (lo + hi) / 2;
  };
  // Neighbouring intervals with the same sign (across a point of inflection) are one interval.
  for (let i = 0; i + 1 < bounds.length; ) {
    const pos = fd(midOf(i)) > 0;
    let j = i + 1;
    while (j + 1 < bounds.length && fd(midOf(j)) > 0 === pos) j++;
    (pos ? up : down).push(`(${labels[i]}, ${labels[j]})`);
    i = j;
  }
  if (up.length) caps.push({ text: fill(Sw.increasing, { i: up.join(", ") }), color: C.green });
  if (down.length) caps.push({ text: fill(Sw.decreasing, { i: down.join(", ") }), color: C.red });
  if (pts.length) caps.push({ text: pts.map((t) => fill(Sw.summary, { k: Sw[t.kind], x: t.xPlain, y: minus(approx(t.y)) })).join("; "), color: "#495057" });
  rows[rows.length - 1].color ??= C.green;

  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 10;
  // Sign chart of f′.
  const lo = xs.length ? Math.min(...xs) : -1;
  const hi = xs.length ? Math.max(...xs) : 1;
  const pad = Math.max(1.5, (hi - lo) * 0.4);
  const [x0, x1] = [lo - pad, hi + pad];
  const sx = (x: number) => 48 + ((x - x0) / (x1 - x0)) * (W - 72);
  const parts: string[] = [text(40, y + 22, "f′", { anchor: "end", bold: true, color: C.orange, size: 15 }), `<line x1="48" y1="${y + 18}" x2="${W - 24}" y2="${y + 18}" stroke="#495057" stroke-width="1.5"/>`];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const a = Math.max(bounds[i], x0);
    const b = Math.min(bounds[i + 1], x1);
    const mid = (a + b) / 2;
    const pos = fd(mid) > 0;
    parts.push(text(sx(mid), y + 12, pos ? "+" : "−", { anchor: "middle", bold: true, size: 16, color: pos ? C.green : C.red }), text(sx(mid), y + 42, pos ? "↗" : "↘", { anchor: "middle", size: 20, color: pos ? C.green : C.red }));
  }
  for (const t of pts) parts.push(`<line x1="${r2(sx(t.x))}" y1="${y + 6}" x2="${r2(sx(t.x))}" y2="${y + 30}" stroke="#495057" stroke-width="1.5"/>`, text(sx(t.x), y + 60, `${t.xPlain}`, { anchor: "middle", size: 12, color: "#495057" }));
  body.push(parts.join(""));
  y += 70;
  const fx = (x: number) => p.reduceRight((acc, c) => acc * x + c.toNumber(), 0);
  const ys: number[] = [];
  for (let i = 0; i <= 300; i++) ys.push(fx(x0 + ((x1 - x0) * i) / 300));
  const fr = makeFrame("dv-stat", 48, y + 6, W - 48 - 24, 260, [x0, x1], yRange(ys, pts.map((t) => t.y)));
  const g = [axes(fr), curve(fr, fx, C.blue, 2.6)];
  for (const t of pts) {
    const color = t.kind === "max" ? C.red : t.kind === "min" ? C.green : C.purple;
    g.push(dot(fr.sx(t.x), fr.sy(t.y), color, 5.5), lbl(fr.sx(t.x), fr.sy(t.y) + (t.kind === "max" ? -12 : 22), `${w.stat[t.kind]} (${t.xPlain}, ${minus(approx(t.y))})`, color, "middle", 12, false));
  }
  body.push(g.join(""));
  y = fr.bottom + 16;
  return compose(`f(x) = ${tex(f)}`, body.join(""), y, caps);
}

// ---------- entry ----------

export function renderDeriv(spec: DerivSpec, w: DerivWords): RenderedSvg {
  words = w;
  exprMessages(w);
  switch (spec.topic) {
    case "first":
      return renderFirst(spec, w);
    case "rules":
      return renderRules(spec, w);
    case "chain":
      return renderChain(spec, w);
    case "tangent":
      return renderTangent(spec, w);
    case "stationary":
      return renderStationary(spec, w);
  }
}

const P = (topic: DerivTopic, src: string, at = ""): DerivSpec => ({ topic, src, at });
export const DERIV_PRESETS: { [K in DerivTopic]: { label: string; spec: DerivSpec }[] } = {
  first: [
    { label: "x²", spec: P("first", "x^2", "1") },
    { label: "3x² − 2x", spec: P("first", "3x^2 - 2x", "1") },
    { label: "x³", spec: P("first", "x^3", "1") },
    { label: "x³ − 4x + 1", spec: P("first", "x^3 - 4x + 1", "2") },
    { label: "2x⁴", spec: P("first", "2x^4", "0.5") },
  ],
  rules: [
    { label: "x³ − 4x + 2", spec: P("rules", "x^3 - 4x + 2") },
    { label: "x² sin x", spec: P("rules", "x^2 sin x") },
    { label: "x / (x + 1)", spec: P("rules", "x/(x + 1)") },
    { label: "(x² + 1)/(x − 1)", spec: P("rules", "(x^2 + 1)/(x - 1)") },
    { label: "sin(x²)", spec: P("rules", "sin(x^2)") },
    { label: "(x² + 1)⁴", spec: P("rules", "(x^2 + 1)^4") },
    { label: "e^(2x) cos x", spec: P("rules", "e^(2x) cos x") },
    { label: "ln(x² + 1)", spec: P("rules", "ln(x^2 + 1)") },
    { label: "√(1 − x²)", spec: P("rules", "sqrt(1 - x^2)") },
    { label: "3/x²", spec: P("rules", "3/x^2") },
    { label: "tan x", spec: P("rules", "tan x") },
    { label: "xˣ", spec: P("rules", "x^x") },
  ],
  chain: [
    { label: "(x² + 1)⁴", spec: P("chain", "(x^2 + 1)^4") },
    { label: "sin(3x + 1)", spec: P("chain", "sin(3x + 1)") },
    { label: "e^(x²)", spec: P("chain", "e^(x^2)") },
    { label: "sin³(2x)", spec: P("chain", "sin^3(2x)") },
    { label: "ln(cos x)", spec: P("chain", "ln(cos x)") },
    { label: "√(1 + sin² x)", spec: P("chain", "sqrt(1 + sin^2 x)") },
    { label: "cos(e^(2x))", spec: P("chain", "cos(e^(2x))") },
  ],
  tangent: [
    { label: "x² − 3x + 1, x = 2", spec: P("tangent", "x^2 - 3x + 1", "2") },
    { label: "x³, x = 1", spec: P("tangent", "x^3", "1") },
    { label: "1/x, x = 2", spec: P("tangent", "1/x", "2") },
    { label: "√x, x = 4", spec: P("tangent", "sqrt(x)", "4") },
    { label: "eˣ, x = 0", spec: P("tangent", "e^x", "0") },
    { label: "ln x, x = 1", spec: P("tangent", "ln x", "1") },
    { label: "sin x, x = π/2", spec: P("tangent", "sin x", "pi/2") },
  ],
  stationary: [
    { label: "x³ − 3x", spec: P("stationary", "x^3 - 3x") },
    { label: "x³ − 6x² + 9x + 1", spec: P("stationary", "x^3 - 6x^2 + 9x + 1") },
    { label: "2x³ + 3x² − 12x", spec: P("stationary", "2x^3 + 3x^2 - 12x") },
    { label: "x⁴ − 2x²", spec: P("stationary", "x^4 - 2x^2") },
    { label: "x³ − 3x² − 3x + 1", spec: P("stationary", "x^3 - 3x^2 - 3x + 1") },
    { label: "x⁴ − 4x³", spec: P("stationary", "x^4 - 4x^3") },
    { label: "x³", spec: P("stationary", "x^3") },
    { label: "−x² + 4x", spec: P("stationary", "-x^2 + 4x") },
  ],
};

/** For tests: a typed expression, its simplified derivative and the lines in between. */
export function derivOf(src: string, w: DerivWords): { f: E; d: E; lines: string[] } {
  words = w;
  exprMessages(w);
  const f = parseE(src);
  const r = differentiate(f);
  return { f, d: r.result, lines: r.rows.map((row) => row.tex) };
}
