// Vectors in 2D and 3D, exactly: combinations (a vector between points, kA + mB step by step, lengths as simplified
// surds, unit vectors, parallel vectors), the dot product (the angle between vectors, perpendicular vectors,
// projections), the cross product (by the 3×3 determinant, areas, the scalar triple product and volumes), lines (vector,
// parametric and Cartesian equations, the distance from a point, two lines meeting, parallel or skew) and planes
// (from an equation, a normal, three points or two directions; distance from a point, where a line meets a plane,
// the line where two planes meet and the angles between them).
// Every number is a fraction or a surd; every picture is to scale: on a grid in 2D, in an oblique projection in 3D.
import { arrow, axes, C, compose, dot, fill, lbl, makeFrame, r2, texLines, tn, W, type Caption, type TexLine } from "./chart";
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";

export type VecTopic = "basics" | "dot" | "cross" | "lines" | "planes";
export const VEC_TOPICS: VecTopic[] = ["basics", "dot", "cross", "lines", "planes"];
export type VecSpec = { topic: VecTopic; src: string };

export type VecWords = {
  bad: string;
  tooBig: string;
  dims: string;
  unknown: string;
  mixed: string;
  nonlinear: string;
  vecTimesVec: string;
  zeroDiv: string;
  zero: string;
  noParam: string;
  only3d: string;
  notLine: string;
  need: Record<VecTopic, string>;
  basics: {
    between: string;
    sub: string;
    scale: string;
    add: string;
    len: string;
    unit: string;
    unitCap: string;
    chain: string;
    diagonals: string;
    parallel: string;
    same: string;
    opposite: string;
  };
  dot: {
    def: string;
    lens: string;
    cos: string;
    angle: string;
    scalar: string;
    vector: string;
    acute: string;
    right: string;
    obtuse: string;
    same: string;
    opposite: string;
    proj: string;
  };
  cross: {
    det: string;
    expand: string;
    check: string;
    area: string;
    tri: string;
    triple: string;
    volume: string;
    flat: string;
    coplanar: string;
    lifted: string;
    shortened: string;
    areaCap: string;
    triCap: string;
    volumeCap: string;
  };
  lines: {
    dir: string;
    fromEq: string;
    vector: string;
    param: string;
    cart: string;
    general: string;
    each: string;
    ap: string;
    t: string;
    foot: string;
    check: string;
    dist: string;
    on: string;
    meetEq: string;
    solve: string;
    third: string;
    meet: string;
    meetCap: string;
    parallel: string;
    same: string;
    parallelCap: string;
    skewCross: string;
    skewDist: string;
    skew: string;
    angle: string;
    angleCap: string;
  };
  planes: {
    normal: string;
    normalForm: string;
    vectorForm: string;
    points: string;
    pointNormal: string;
    cart: string;
    intercepts: string;
    nP: string;
    on: string;
    dist: string;
    foot: string;
    distCap: string;
    nd: string;
    sub: string;
    meet: string;
    meetCap: string;
    inPlane: string;
    parallelLine: string;
    angleLine: string;
    dirLine: string;
    pointBoth: string;
    lineEq: string;
    lineCap: string;
    angle: string;
    parallelPlanes: string;
    samePlane: string;
    planeDist: string;
    parallelCap: string;
  };
};

let words: VecWords;

// ---------- exact numbers and vectors ----------

const F = (n: number, d = 1) => new Frac(n, d);
const ZERO = F(0);
const ONE = F(1);
const LIMIT = 1e9;
function guard(f: Frac): Frac {
  if (Math.abs(f.n) > LIMIT || f.d > LIMIT) throw new Error(words.tooBig);
  return f;
}

type V = Frac[];
const vadd = (a: V, b: V) => a.map((x, i) => guard(x.add(b[i])));
const vsub = (a: V, b: V) => a.map((x, i) => guard(x.sub(b[i])));
const vscale = (a: V, k: Frac) => a.map((x) => guard(x.mul(k)));
const vdot = (a: V, b: V) => a.reduce((s, x, i) => guard(s.add(x.mul(b[i]))), ZERO);
const vcross = (a: V, b: V): V =>
  [a[1].mul(b[2]).sub(a[2].mul(b[1])), a[2].mul(b[0]).sub(a[0].mul(b[2])), a[0].mul(b[1]).sub(a[1].mul(b[0]))].map(guard);
const isZeroV = (a: V) => a.every((x) => x.isZero());
const eqV = (a: V, b: V) => a.every((x, i) => x.sub(b[i]).isZero());
const num = (a: V) => a.map((x) => x.toNumber());
const zeros = (n: number): V => Array.from({ length: n }, () => ZERO);
/** k with b = k·a, or null when they are not parallel. */
function ratioOf(a: V, b: V): Frac | null {
  const i = a.findIndex((x) => !x.isZero());
  if (i < 0) return null;
  const k = b[i].div(a[i]);
  return eqV(vscale(a, k), b) ? k : null;
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
/** The same direction (or equation) with whole, coprime numbers: (1/2, 1, −3/2) → (1, 2, −3). */
function integral(v: V): V {
  const l = v.reduce((acc, f) => (acc / gcd(acc, f.d)) * f.d, 1);
  const ints = v.map((f) => f.mul(F(l)).n);
  const g = ints.reduce((acc, x) => gcd(acc, x), 0) || 1;
  return ints.map((x) => F(x / g));
}

/** out·√inner with a whole, square-free inner. */
type Root = { out: Frac; inner: number };
function squareFree(n: number): [number, number] {
  let k = 1;
  for (let p = 2; p * p <= n; p++) while (n % (p * p) === 0) (n /= p * p), (k *= p);
  return [k, n];
}
function sqrtR(v: Frac): Root {
  // √(n/d) = √(n·d) / d
  const n = v.n * v.d;
  if (n > 1e12) throw new Error(words.tooBig);
  const [k, m] = squareFree(n);
  return { out: F(k, v.d), inner: m };
}
function rmul(a: Root, b: Root): Root {
  const [k, m] = squareFree(a.inner * b.inner);
  return { out: a.out.mul(b.out).mul(F(k)), inner: m };
}
/** q / r, with the root moved to the top. */
const rdiv = (q: Frac, r: Root): Root => ({ out: q.div(r.out.mul(F(r.inner))), inner: r.inner });
const rnum = (r: Root) => r.out.toNumber() * Math.sqrt(r.inner);
const rational = (r: Root) => r.inner === 1 || r.out.isZero();
function rtex(r: Root): string {
  if (rational(r)) return r.out.tex();
  const a = r.out.abs();
  const s = r.out.isNeg() ? "-" : "";
  const top = `${a.n === 1 ? "" : a.n}\\sqrt{${r.inner}}`;
  return a.d === 1 ? `${s}${top}` : `${s}\\frac{${top}}{${a.d}}`;
}
function rplain(r: Root): string {
  if (rational(r)) return plainF(r.out);
  const a = r.out.abs();
  return `${r.out.isNeg() ? "−" : ""}${a.n === 1 ? "" : a.n}√${r.inner}${a.d === 1 ? "" : `/${a.d}`}`;
}
/** " ≈ 3.742" when it is not rational. */
const approx = (r: Root) => (rational(r) ? "" : ` \\approx ${tn(rnum(r), 3)}`);
const plainF = (a: Frac) => `${a.n < 0 ? "−" : ""}${Math.abs(a.n)}${a.d === 1 ? "" : `/${a.d}`}`;
/** "√14 ≈ 3.742" for captions. */
const rcap = (r: Root) => `${rplain(r)}${rational(r) ? "" : ` ≈ ${tn(rnum(r), 3).replace("-", "−")}`}`;

// ---------- LaTeX ----------

const col = (v: V) => `\\begin{pmatrix} ${v.map((x) => x.tex()).join(" \\\\ ")} \\end{pmatrix}`;
const vecPlain = (v: V) => `(${v.map(plainF).join(", ")})`;
const sqTex = (f: Frac) => (f.isInt() && !f.isNeg() ? `${f.tex()}^2` : `\\left(${f.tex()}\\right)^2`);
const par = (f: Frac) => f.texP();
/** Σ cᵢ·nameᵢ with signs, ones and zeros left out: 2x − y + 3z; "" names a constant. */
function linTex(cs: Frac[], names: string[]): string {
  const out: string[] = [];
  cs.forEach((c, i) => {
    if (c.isZero()) return;
    const a = c.abs();
    const body = !names[i] ? a.tex() : a.isOne() ? names[i] : `${a.tex()}${names[i]}`;
    out.push(out.length ? `${c.isNeg() ? "-" : "+"} ${body}` : `${c.isNeg() ? "-" : ""}${body}`);
  });
  return out.length ? out.join(" ") : "0";
}
/** a₁·b₁ + a₂·b₂ + … with brackets round negatives. */
const productsTex = (a: V, b: V) => a.map((x, i) => `${par(x)} \\cdot ${par(b[i])}`).join(" + ");
const XYZ = ["x", "y", "z"];
const paramTex = (p: string) => (p === "λ" ? "\\lambda" : p === "μ" ? "\\mu" : p);

/** The angle from its cosine: exact when it is a whole number of degrees. */
function angleTex(cos: number): { tex: string; deg: number; plain: string } {
  const deg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  const whole = Math.abs(deg - Math.round(deg)) < 1e-7;
  const v = whole ? String(Math.round(deg)) : tn(deg, 2);
  return { tex: `${whole ? "=" : "\\approx"} ${v}^\\circ`, deg, plain: `${whole ? "=" : "≈"} ${v}°` };
}

// ---------- reading the input ----------

type Node =
  | { k: "num"; v: Frac }
  | { k: "sym"; s: string }
  | { k: "pt"; s: string }
  | { k: "pair"; a: string; b: string }
  | { k: "lit"; cs: Node[] }
  | { k: "sum"; ts: { sign: 1 | -1; n: Node }[] }
  | { k: "mul"; a: Node; b: Node }
  | { k: "div"; a: Node; b: Node }
  | { k: "neg"; a: Node };

type Tok = { k: "num"; v: Frac } | { k: "id"; s: string } | { k: "pt"; s: string } | { k: "op"; s: string };

const SUBS = "₀₁₂₃₄₅₆₇₈₉";
function normal(src: string): string {
  return src
    .replace(/[−–]/g, "-")
    .replace(/[⋅•]/g, "·")
    .replace(/[₀-₉]/g, (c) => String(SUBS.indexOf(c)))
    .replace(/\\vec\s*\{([^}]*)\}/g, "$1")
    .replace(/→|\u20d7/g, "")
    .replace(/\blambda\b/g, "λ")
    .replace(/\bmu\b/g, "μ")
    .replace(/\s+/g, " ")
    .trim();
}

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    const c = src[i];
    let m: RegExpExecArray | null;
    if (c === " ") i++;
    else if ((m = /^(\d+\.?\d*|\.\d+)/.exec(rest))) {
      out.push({ k: "num", v: guard(Frac.parse(m[0])!) });
      i += m[0].length;
    } else if ((m = /^[a-z]\d*'?/.exec(rest)) || (m = /^[λμ]/.exec(rest))) {
      out.push({ k: "id", s: m[0] });
      i += m[0].length;
    } else if ((m = /^[A-Z]\d*'?/.exec(rest))) {
      out.push({ k: "pt", s: m[0] });
      i += m[0].length;
    } else if ("+-*/()<>[],;".includes(c)) {
      out.push({ k: "op", s: c });
      i++;
    } else if (c === "·" || c === "×") throw new Error(words.vecTimesVec);
    else throw new Error(fill(words.bad, { s: src }));
  }
  return out;
}

const CLOSE: Record<string, string> = { "(": ")", "<": ">", "[": "]" };

function parseExpr(src: string): Node {
  const toks = lex(src);
  let i = 0;
  const bad = () => new Error(fill(words.bad, { s: src }));
  const peek = () => toks[i];
  const isOp = (s: string) => {
    const t = peek();
    return t?.k === "op" && t.s === s;
  };
  const startsAtom = () => {
    const t = peek();
    return !!t && (t.k !== "op" || t.s in CLOSE);
  };
  const expr = (): Node => {
    const ts: { sign: 1 | -1; n: Node }[] = [{ sign: 1, n: term() }];
    while (isOp("+") || isOp("-")) {
      const sign = (toks[i++] as { s: string }).s === "+" ? 1 : -1;
      ts.push({ sign, n: term() });
    }
    return ts.length === 1 ? ts[0].n : { k: "sum", ts };
  };
  const term = (): Node => {
    let n = unary();
    for (;;) {
      if (isOp("*")) (i++, (n = { k: "mul", a: n, b: unary() }));
      else if (isOp("/")) (i++, (n = { k: "div", a: n, b: unary() }));
      else if (startsAtom()) n = { k: "mul", a: n, b: atom() };
      else return n;
    }
  };
  const unary = (): Node => {
    if (isOp("-")) return i++, { k: "neg", a: unary() };
    if (isOp("+")) return i++, unary();
    return atom();
  };
  const atom = (): Node => {
    const t = toks[i++];
    if (!t) throw bad();
    if (t.k === "num") return { k: "num", v: t.v };
    if (t.k === "id") return { k: "sym", s: t.s };
    if (t.k === "pt") {
      const u = peek();
      if (u?.k === "pt") return i++, { k: "pair", a: t.s, b: u.s };
      return { k: "pt", s: t.s };
    }
    const close = CLOSE[t.s];
    if (!close) throw bad();
    const cs = [expr()];
    while (isOp(",") || isOp(";")) (i++, cs.push(expr()));
    if (!isOp(close)) throw bad();
    i++;
    if (cs.length === 1 && t.s === "(") return cs[0];
    if (cs.length < 2 || cs.length > 3) throw bad();
    return { k: "lit", cs };
  };
  const n = expr();
  if (i < toks.length) throw bad();
  return n;
}

/** Items separated by ";" or by commas outside brackets. */
function splitItems(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if ("(<[".includes(ch)) depth++;
    if (")>]".includes(ch)) depth--;
    if ((ch === ";" || ch === ",") && depth === 0) (parts.push(cur), (cur = ""));
    else cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

type Raw =
  | { k: "pt"; name: string; cs: Node[]; src: string }
  | { k: "vec"; name: string; node: Node; src: string }
  | { k: "expr"; node: Node; src: string }
  | { k: "r"; name?: string; node: Node; src: string }
  | { k: "normal"; name?: string; n: Node; d: Node; src: string }
  | { k: "eq"; name?: string; parts: Node[]; src: string };

const RESERVED = new Set(["r", "x", "y", "z", "i", "j", "k", "t", "s"]);

function readItem(p: string): Raw {
  const pt = /^([A-Z]\d*'?)\s*\((.*)\)$/.exec(p);
  if (pt && !p.includes("=")) {
    const lit = parseExpr(`(${pt[2]})`);
    if (lit.k !== "lit") throw new Error(fill(words.bad, { s: p }));
    return { k: "pt", name: pt[1], cs: lit.cs, src: p };
  }
  const label = /^([A-Za-zΠπℓ]\d*'?)\s*:\s*(.+)$/.exec(p);
  const name = label?.[1];
  const body = label ? label[2] : p;
  const nf = /^r\s*[·.*]\s*(.+?)\s*=\s*(.+)$/.exec(body) ?? /^(.+?)\s*[·.*]\s*r\s*=\s*(.+)$/.exec(body);
  if (nf && !/^\d/.test(nf[1])) return { k: "normal", name, n: parseExpr(nf[1]), d: parseExpr(nf[2]), src: p };
  const r = /^r\s*=\s*(.+)$/.exec(body);
  if (r) return { k: "r", name, node: parseExpr(r[1]), src: p };
  const vec = /^([a-z]\d*'?)\s*=\s*(.+)$/.exec(body);
  if (vec && !RESERVED.has(vec[1])) return { k: "vec", name: vec[1], node: parseExpr(vec[2]), src: p };
  if (body.includes("=")) return { k: "eq", name, parts: body.split("=").map(parseExpr), src: p };
  return { k: "expr", node: parseExpr(body), src: p };
}

/** 3 when anything has three components or mentions z or k. */
function dimOf(raws: Raw[]): 2 | 3 {
  let three = false;
  const walk = (n: Node): void => {
    if (n.k === "lit") {
      if (n.cs.length === 3) three = true;
      n.cs.forEach(walk);
    } else if (n.k === "sym") three ||= n.s === "k" || n.s === "z";
    else if (n.k === "sum") n.ts.forEach((t) => walk(t.n));
    else if (n.k === "mul" || n.k === "div") (walk(n.a), walk(n.b));
    else if (n.k === "neg") walk(n.a);
  };
  for (const r of raws) {
    if (r.k === "pt") three ||= r.cs.length === 3;
    for (const n of r.k === "pt" ? r.cs : r.k === "normal" ? [r.n, r.d] : r.k === "eq" ? r.parts : [r.node]) walk(n);
  }
  return three ? 3 : 2;
}

// Values: a constant ("") plus multiples of parameters (t, s, λ, μ) or of x, y, z in equations. Scalars are length 1.
type Val = { vec: boolean; m: Map<string, V> };
type Ctx = { dim: number; pts: Map<string, V>; vecs: Map<string, V>; eqVars: boolean };
const PARAMS = new Set(["t", "s", "λ", "μ"]);

const isConst = (a: Val) => [...a.m.keys()].every((k) => k === "");
const constOf = (a: Val, n: number) => a.m.get("") ?? zeros(n);
function clean(m: Map<string, V>): Map<string, V> {
  for (const [k, v] of m) if (k && isZeroV(v)) m.delete(k);
  return m;
}
function plus(a: Val, b: Val, sign: 1 | -1): Val {
  if (a.vec !== b.vec) throw new Error(words.mixed);
  const m = new Map(a.m);
  for (const [k, v] of b.m) {
    const cur = m.get(k) ?? zeros(v.length);
    m.set(k, cur.map((x, i) => guard(x.add(sign === 1 ? v[i] : v[i].neg()))));
  }
  return { vec: a.vec, m: clean(m) };
}
const scaleVal = (a: Val, k: Frac): Val => ({ vec: a.vec, m: clean(new Map([...a.m].map(([key, v]) => [key, vscale(v, k)]))) });
function times(a: Val, b: Val, src: string): Val {
  if (a.vec && b.vec) throw new Error(words.vecTimesVec);
  // s: the scalar factor, x: the other one.
  const [s, x] = !a.vec && (isConst(a) || b.vec) ? [a, b] : [b, a];
  if (isConst(s)) return scaleVal(x, constOf(s, 1)[0]);
  if (!isConst(x)) throw new Error(fill(words.nonlinear, { s: src }));
  const xv = constOf(x, x.vec ? 3 : 1);
  return { vec: x.vec, m: clean(new Map([...s.m].map(([key, v]) => [key, vscale(xv, v[0])]))) };
}

function evalNode(n: Node, ctx: Ctx, src: string): Val {
  const vecVal = (v: V): Val => ({ vec: true, m: new Map([["", v]]) });
  const unknown = (s: string) => new Error(fill(words.unknown, { s }));
  switch (n.k) {
    case "num":
      return { vec: false, m: new Map([["", [n.v]]]) };
    case "sym": {
      const v = ctx.vecs.get(n.s);
      if (v) return vecVal(v);
      if (PARAMS.has(n.s) || (ctx.eqVars && XYZ.includes(n.s))) return { vec: false, m: new Map([["", [ZERO]], [n.s, [ONE]]]) };
      const unit = ["i", "j", "k"].indexOf(n.s);
      if (unit >= 0 && unit < ctx.dim) return vecVal(zeros(ctx.dim).map((_, i) => (i === unit ? ONE : ZERO)));
      throw unknown(n.s);
    }
    case "pt": {
      const p = ctx.pts.get(n.s) ?? (n.s === "O" ? zeros(ctx.dim) : null);
      if (!p) throw unknown(n.s);
      return vecVal(p);
    }
    case "pair": {
      const a = ctx.pts.get(n.a) ?? (n.a === "O" ? zeros(ctx.dim) : null);
      const b = ctx.pts.get(n.b) ?? (n.b === "O" ? zeros(ctx.dim) : null);
      if (!a) throw unknown(n.a);
      if (!b) throw unknown(n.b);
      return vecVal(vsub(b, a));
    }
    case "lit": {
      if (n.cs.length !== ctx.dim) throw new Error(fill(words.dims, { s: src, n: ctx.dim }));
      const cs = n.cs.map((c) => evalNode(c, ctx, src));
      if (cs.some((c) => c.vec)) throw new Error(fill(words.bad, { s: src }));
      const keys = new Set(cs.flatMap((c) => [...c.m.keys()]));
      keys.add("");
      return { vec: true, m: clean(new Map([...keys].map((k) => [k, cs.map((c) => c.m.get(k)?.[0] ?? ZERO)]))) };
    }
    case "sum":
      return n.ts.slice(1).reduce((acc, t) => plus(acc, evalNode(t.n, ctx, src), t.sign), evalNode(n.ts[0].n, ctx, src));
    case "mul":
      return times(evalNode(n.a, ctx, src), evalNode(n.b, ctx, src), src);
    case "div": {
      const d = evalNode(n.b, ctx, src);
      if (d.vec || !isConst(d)) throw new Error(fill(words.nonlinear, { s: src }));
      const k = constOf(d, 1)[0];
      if (k.isZero()) throw new Error(words.zeroDiv);
      return scaleVal(evalNode(n.a, ctx, src), ONE.div(k));
    }
    case "neg":
      return scaleVal(evalNode(n.a, ctx, src), F(-1));
  }
}

/** A constant vector. */
function vecOf(n: Node, ctx: Ctx, src: string): V {
  const v = evalNode(n, ctx, src);
  if (!v.vec) throw new Error(fill(words.bad, { s: src }));
  if (!isConst(v)) throw new Error(fill(words.bad, { s: src }));
  return constOf(v, ctx.dim);
}
function scalarOf(n: Node, ctx: Ctx, src: string): Frac {
  const v = evalNode(n, ctx, src);
  if (v.vec || !isConst(v)) throw new Error(fill(words.bad, { s: src }));
  return constOf(v, 1)[0];
}

// The tex of a name: a → 𝐚, n1 → 𝐧₁, AB → AB with an arrow.
function nameTex(s: string): string {
  const m = /^([a-z])(\d*)('?)$/.exec(s);
  return m ? `\\mathbf{${m[1]}}${m[2] ? `_{${m[2]}}` : ""}${m[3]}` : s === "λ" || s === "μ" ? paramTex(s) : s;
}
const namePlain = (s: string) => s.replace(/\d/g, (d) => SUBS[Number(d)]);
const pairTex = (a: string, b: string) => `\\overrightarrow{${a}${b}}`;
/** A label name: ℓ1 → ℓ₁, L2 → L₂. */
const labelTex = (s: string) => s.replace(/^ℓ/, "\\ell ").replace(/^Π|^π/, "\\Pi ").replace(/(\d+)$/, "_{$1}");

/** The expression as typed (sub = false) or with every vector written out (sub = true). */
function texNode(n: Node, ctx: Ctx, sub: boolean): string {
  const t = (m: Node) => texNode(m, ctx, sub);
  const wrapSum = (m: Node) => (m.k === "sum" ? `\\left(${t(m)}\\right)` : t(m));
  switch (n.k) {
    case "num":
      return n.v.tex();
    case "sym": {
      const v = ctx.vecs.get(n.s);
      if (v) return sub ? col(v) : nameTex(n.s);
      if (["i", "j", "k"].includes(n.s)) return sub ? col(zeros(ctx.dim).map((_, i) => (i === "ijk".indexOf(n.s) ? ONE : ZERO))) : `\\mathbf{${n.s}}`;
      return paramTex(n.s);
    }
    case "pt":
      return sub ? col(ctx.pts.get(n.s) ?? zeros(ctx.dim)) : pairTex("O", n.s);
    case "pair":
      return sub ? col(vsub(ctx.pts.get(n.b) ?? zeros(ctx.dim), ctx.pts.get(n.a) ?? zeros(ctx.dim))) : pairTex(n.a, n.b);
    case "lit":
      return `\\begin{pmatrix} ${n.cs.map(t).join(" \\\\ ")} \\end{pmatrix}`;
    case "sum":
      return n.ts.map((x, i) => `${i === 0 ? (x.sign < 0 ? "-" : "") : x.sign < 0 ? " - " : " + "}${t(x.n)}`).join("");
    case "mul": {
      const thin = n.a.k === "num" && n.b.k === "num" ? " \\cdot " : n.b.k === "lit" || (sub && n.b.k !== "num") ? " " : "";
      return `${wrapSum(n.a)}${thin}${wrapSum(n.b)}`;
    }
    case "div":
      return `\\frac{${t(n.a)}}{${t(n.b)}}`;
    case "neg":
      return `-${wrapSum(n.a)}`;
  }
}
function plainNode(n: Node): string {
  switch (n.k) {
    case "num":
      return plainF(n.v);
    case "sym":
      return namePlain(n.s);
    case "pt":
      return `O${n.s}`;
    case "pair":
      return `${n.a}${n.b}`;
    case "lit":
      return `(${n.cs.map(plainNode).join(", ")})`;
    case "sum":
      return n.ts.map((x, i) => `${i === 0 ? (x.sign < 0 ? "−" : "") : x.sign < 0 ? " − " : " + "}${plainNode(x.n)}`).join("");
    case "mul":
      return `${plainNode(n.a)}${plainNode(n.b)}`;
    case "div":
      return `${plainNode(n.a)}/${plainNode(n.b)}`;
    case "neg":
      return `−${plainNode(n.a)}`;
  }
}
const pairsIn = (n: Node): [string, string][] =>
  n.k === "pair" ? [[n.a, n.b]] : n.k === "sum" ? n.ts.flatMap((t) => pairsIn(t.n)) : n.k === "mul" || n.k === "div" ? [...pairsIn(n.a), ...pairsIn(n.b)] : n.k === "neg" ? pairsIn(n.a) : n.k === "lit" ? n.cs.flatMap(pairsIn) : [];

/** A vector typed or named: a = (1, 2, 3), 2a − b, AB. */
type VItem = { tex: string; plain: string; v: V; node: Node; given: boolean; name?: string };
type LineT = { name: string; a: V; d: V; param: string; intro: TexLine[]; pts?: [string, string] };
/** A plane n·r = d; `dirs` are the directions it was given by, `mark` a point it was given through. */
type PlaneT = { name: string; n: V; d: Frac; intro: TexLine[]; at?: V; pts?: V[]; dirs?: [V, V]; mark?: { name: string; p: V } };
type Parsed = { dim: 2 | 3; ctx: Ctx; pts: { name: string; p: V }[]; vecs: VItem[]; lines: LineT[]; planes: PlaneT[]; header: string[] };

function parse(src: string): Parsed {
  const raws = splitItems(normal(src)).map(readItem);
  const dim = dimOf(raws);
  const ctx: Ctx = { dim, pts: new Map(), vecs: new Map(), eqVars: false };
  const out: Parsed = { dim, ctx, pts: [], vecs: [], lines: [], planes: [], header: [] };
  const lineName = () => `ℓ${out.lines.length + 1}`;
  const planeName = () => `Π${out.planes.length + 1}`;
  for (const r of raws) {
    if (r.k === "pt") {
      if (r.cs.length !== dim) throw new Error(fill(words.dims, { s: r.src, n: dim }));
      const p = r.cs.map((c) => scalarOf(c, ctx, r.src));
      ctx.pts.set(r.name, p);
      out.pts.push({ name: r.name, p });
      out.header.push(`${r.name}\\left(${p.map((x) => x.tex()).join(", ")}\\right)`);
    } else if (r.k === "vec" || r.k === "expr") {
      const v = vecOf(r.node, ctx, r.src);
      if (r.k === "vec") {
        const given = r.node.k === "lit" || (r.node.k === "sum" && r.node.ts.every((t) => isUnitTerm(t.n))) || isUnitTerm(r.node);
        out.vecs.push({ tex: nameTex(r.name), plain: namePlain(r.name), v, node: r.node, given, name: r.name });
        if (given) out.header.push(`${nameTex(r.name)} = ${col(v)}`);
        ctx.vecs.set(r.name, v);
      } else out.vecs.push({ tex: texNode(r.node, ctx, false), plain: plainNode(r.node), v, node: r.node, given: false });
    } else if (r.k === "r") {
      const val = evalNode(r.node, ctx, r.src);
      if (!val.vec) throw new Error(fill(words.bad, { s: r.src }));
      const params = [...val.m.keys()].filter(Boolean);
      const a = constOf(val, dim);
      if (params.length === 0) throw new Error(fill(words.noParam, { s: r.src }));
      if (params.length === 1) {
        const d = val.m.get(params[0])!;
        const name = r.name ?? lineName();
        out.lines.push({ name, a, d, param: params[0], intro: [] });
        out.header.push(`${labelTex(name)}: \\ \\mathbf{r} = ${col(a)} + ${paramTex(params[0])}${col(d)}`);
      } else if (params.length === 2 && dim === 3) {
        const [u, w] = params.map((p) => val.m.get(p)!);
        const n = vcross(u, w);
        if (isZeroV(n)) throw new Error(fill(words.bad, { s: r.src }));
        const name = r.name ?? planeName();
        const [p1, p2] = params.map(paramTex);
        out.planes.push({
          name, n, d: vdot(n, a), at: a, dirs: [u, w],
          intro: [
            { tex: `\\mathbf{n} = ${col(u)} \\times ${col(w)} = ${col(n)}`, op: words.planes.vectorForm },
            { tex: `${linTex(n, XYZ)} = ${productsTex(n, a)} = ${vdot(n, a).tex()}`, op: words.planes.pointNormal },
          ],
        });
        out.header.push(`${labelTex(name)}: \\ \\mathbf{r} = ${col(a)} + ${p1}${col(u)} + ${p2}${col(w)}`);
      } else throw new Error(fill(words.bad, { s: r.src }));
    } else if (r.k === "normal") {
      if (dim !== 3) throw new Error(words.only3d);
      const n = vecOf(r.n, ctx, r.src);
      const d = scalarOf(r.d, ctx, r.src);
      if (isZeroV(n)) throw new Error(fill(words.zero, { v: "n" }));
      const name = r.name ?? planeName();
      out.planes.push({ name, n, d, intro: [{ tex: `\\mathbf{r} \\cdot ${col(n)} = ${d.tex()} \\;\\Rightarrow\\; ${linTex(n, XYZ)} = ${d.tex()}`, op: words.planes.normalForm }] });
      out.header.push(`${labelTex(name)}: \\ \\mathbf{r} \\cdot ${col(n)} = ${d.tex()}`);
    } else {
      ctx.eqVars = true;
      const parts = r.parts.map((p) => evalNode(p, ctx, r.src));
      ctx.eqVars = false;
      if (parts.some((p) => p.vec)) throw new Error(fill(words.bad, { s: r.src }));
      const coef = (p: Val, v: string) => p.m.get(v)?.[0] ?? ZERO;
      if (parts.some((p) => [...p.m.keys()].some((k) => k && !XYZ.includes(k)))) throw new Error(fill(words.bad, { s: r.src }));
      if (parts.length === 2) {
        const diff = plus(parts[0], parts[1], -1);
        const n = XYZ.slice(0, dim).map((v) => coef(diff, v));
        const d = constOf(diff, 1)[0].neg();
        if (isZeroV(n)) throw new Error(fill(words.bad, { s: r.src }));
        if (dim === 3) {
          const name = r.name ?? planeName();
          out.planes.push({ name, n, d, intro: [{ tex: `\\mathbf{n} = ${col(n)}`, op: words.planes.normal }] });
          out.header.push(`${labelTex(name)}: \\ ${linTex(n, XYZ)} = ${d.tex()}`);
        } else {
          // ax + by = c runs along (b, −a) and passes through (0, c/b) or (c/a, 0).
          const [a, b] = n;
          const dir = integral([b, a.neg()]);
          const p = b.isZero() ? [d.div(a), ZERO] : [ZERO, d.div(b)];
          const name = r.name ?? lineName();
          const intro: TexLine[] = [{ tex: `${linTex(n, XYZ)} = ${d.tex()}: \\quad \\mathbf{d} = ${col(dir)}, \\; \\mathbf{a} = ${col(p)}`, op: words.lines.fromEq }];
          out.lines.push({ name, a: p, d: dir, param: "t", intro });
          out.header.push(`${labelTex(name)}: \\ ${linTex(n, XYZ)} = ${d.tex()}`);
        }
      } else if (parts.length === 3 && dim === 3) {
        // (x − a)/p = (y − b)/q = (z − c)/r: each part is one coordinate.
        const a = zeros(3);
        const d = zeros(3);
        const seen = new Set<number>();
        for (const p of parts) {
          const vs = XYZ.filter((v) => !coef(p, v).isZero());
          if (vs.length !== 1) throw new Error(fill(words.bad, { s: r.src }));
          const i = XYZ.indexOf(vs[0]);
          if (seen.has(i)) throw new Error(fill(words.bad, { s: r.src }));
          seen.add(i);
          const c = coef(p, vs[0]);
          a[i] = constOf(p, 1)[0].neg().div(c);
          d[i] = ONE.div(c);
        }
        const dir = integral(d);
        const name = r.name ?? lineName();
        out.lines.push({ name, a, d: dir, param: "t", intro: [{ tex: `\\mathbf{d} = ${col(dir)}, \\quad \\mathbf{a} = ${col(a)}`, op: words.lines.fromEq }] });
        out.header.push(`${labelTex(name)}: \\ ${symmTex(a, dir)}`);
      } else throw new Error(fill(words.bad, { s: r.src }));
    }
  }
  return out;
}
const isUnitTerm = (n: Node): boolean =>
  (n.k === "sym" && ["i", "j", "k"].includes(n.s)) || (n.k === "mul" && n.a.k === "num" && isUnitTerm(n.b)) || (n.k === "neg" && isUnitTerm(n.a));

// ---------- equations of a line ----------

function symmTex(a: V, d: V): string {
  const parts: string[] = [];
  const fixed: string[] = [];
  d.forEach((di, i) => {
    const top = linTex([ONE, a[i].neg()], [XYZ[i], ""]);
    if (di.isZero()) fixed.push(`${XYZ[i]} = ${a[i].tex()}`);
    else parts.push(di.isOne() ? top : `\\frac{${top}}{${di.tex()}}`);
  });
  return [parts.join(" = "), ...fixed].filter(Boolean).join(", \\; ");
}
const vecEqTex = (L: LineT) => `\\mathbf{r} = ${col(L.a)} + ${paramTex(L.param)}${col(L.d)}`;
const paramEqTex = (L: LineT) =>
  `\\begin{cases} ${L.a.map((ai, i) => `${XYZ[i]} = ${linTex([ai, L.d[i]], ["", paramTex(L.param)])}`).join(" \\\\ ")} \\end{cases}`;
const pointAt = (L: LineT, t: Frac) => vadd(L.a, vscale(L.d, t));

// ---------- pictures ----------

type Prim =
  | { k: "arrow"; a: number[]; b: number[]; color: string; label?: string; dashed?: boolean; width?: number; mid?: boolean | number }
  | { k: "seg"; a: number[]; b: number[]; color: string; dashed?: boolean; width?: number; label?: string }
  | { k: "line"; a: number[]; d: number[]; color: string; label?: string; dashed?: boolean; width?: number }
  | { k: "point"; p: number[]; label: string; color: string }
  | { k: "plane"; n: number[]; at: number[]; color: string; fill: string; label?: string }
  | { k: "poly"; ps: number[][]; color: string; fill: string }
  | { k: "angle"; at: number[]; u: number[]; v: number[]; color: string; label: string }
  | { k: "right"; at: number[]; u: number[]; v: number[] };

const nlen = (v: number[]) => Math.hypot(...v);
const nunit = (v: number[]) => v.map((x) => x / (nlen(v) || 1));
const nadd = (a: number[], b: number[], k = 1) => a.map((x, i) => x + k * b[i]);
const ndot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const ncross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function anchors(p: Prim): number[][] {
  switch (p.k) {
    case "arrow":
    case "seg":
      return [p.a, p.b];
    case "line":
      return [p.a];
    case "point":
      return [p.p];
    case "plane":
      return [p.at];
    case "poly":
      return p.ps;
    case "angle":
    case "right":
      return [p.at];
  }
}

/** Where the line a + t·d is inside the box, or null. */
function clip(a: number[], d: number[], lo: number[], hi: number[]): [number, number] | null {
  let [t0, t1] = [-Infinity, Infinity];
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (a[i] < lo[i] || a[i] > hi[i]) return null;
      continue;
    }
    const [ta, tb] = [(lo[i] - a[i]) / d[i], (hi[i] - a[i]) / d[i]];
    t0 = Math.max(t0, Math.min(ta, tb));
    t1 = Math.min(t1, Math.max(ta, tb));
  }
  return t0 < t1 ? [t0, t1] : null;
}

/** Lines become segments inside the box, planes become square patches with their normal. */
function resolve(prims: Prim[], lo: number[], hi: number[], size: number): Prim[] {
  const out: Prim[] = [];
  for (const p of prims) {
    if (p.k === "line") {
      const t = clip(p.a, p.d, lo, hi);
      if (t) out.push({ k: "seg", a: nadd(p.a, p.d, t[0]), b: nadd(p.a, p.d, t[1]), color: p.color, dashed: p.dashed, width: p.width ?? 2.4, label: p.label });
    } else if (p.k === "plane") {
      const n = nunit(p.n);
      const e = [0, 1, 2].reduce((best, i) => (Math.abs(n[i]) < Math.abs(n[best]) ? i : best), 0);
      const u = nunit(ncross(n, [0, 1, 2].map((i) => (i === e ? 1 : 0))));
      const w = ncross(n, u);
      const h = size * 0.42;
      const ps = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => p.at.map((x, i) => x + h * (a * u[i] + b * w[i])));
      out.push({ k: "poly", ps, color: p.color, fill: p.fill });
      if (p.label) out.push({ k: "seg", a: ps[0], b: ps[0], color: p.color, label: p.label });
    } else out.push(p);
  }
  return out;
}

/** The picture, from y0 down: a grid with equal units in 2D, an oblique view in 3D. */
function picture(prims: Prim[], dim: number, y0: number): { svg: string; h: number } {
  const all = [Array(dim).fill(0), ...prims.flatMap(anchors)];
  const lo = Array.from({ length: dim }, (_, i) => Math.min(...all.map((p) => p[i])));
  const hi = Array.from({ length: dim }, (_, i) => Math.max(...all.map((p) => p[i])));
  const size = Math.max(2, ...hi.map((h, i) => h - lo[i]));
  for (let i = 0; i < dim; i++) (lo[i] -= size * 0.15), (hi[i] += size * 0.15);
  return dim === 2 ? picture2(prims, lo, hi, size, y0) : picture3(prims, lo, hi, size, y0);
}

function picture2(prims: Prim[], lo: number[], hi: number[], size: number, y0: number) {
  let [x0, x1, ya, yb] = [lo[0], hi[0], lo[1], hi[1]];
  const wPx = W - 72;
  let hPx = (wPx * (yb - ya)) / (x1 - x0);
  if (hPx > 380) {
    const need = ((yb - ya) * wPx) / 380;
    const mid = (x0 + x1) / 2;
    [x0, x1, hPx] = [mid - need / 2, mid + need / 2, 380];
  } else if (hPx < 240) {
    const need = (240 * (x1 - x0)) / wPx;
    const mid = (ya + yb) / 2;
    [ya, yb, hPx] = [mid - need / 2, mid + need / 2, 240];
  }
  const fr = makeFrame("vec", 48, y0 + 6, wPx, hPx, [x0, x1], [ya, yb]);
  const P = (v: number[]): [number, number] => [fr.sx(v[0]), fr.sy(v[1])];
  const body = draw(resolve(prims, [x0, ya], [x1, yb], size), P, size);
  return { svg: axes(fr) + body, h: fr.bottom - y0 + 22 };
}

/** Screen (right, down) of an orthographic camera turned by az about z and raised by el (degrees). */
function camera(az: number, el: number): (v: number[]) => number[] {
  const [a, e] = [(az * Math.PI) / 180, (el * Math.PI) / 180];
  const [sa, ca, se, ce] = [Math.sin(a), Math.cos(a), Math.sin(e), Math.cos(e)];
  return ([x, y, z]) => [-sa * x + ca * y, se * ca * x + se * sa * y - ce * z];
}

/**
 * The view that shows the scene best: x towards the viewer on the left, y to the right, z up, turned so that no arrow,
 * line or plane is seen end-on and no two directions look parallel when they are not.
 */
function bestView(prims: Prim[]): (v: number[]) => number[] {
  const keys: number[][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const planes: number[][] = [];
  for (const p of prims) {
    if (p.k === "arrow" && nlen(nadd(p.b, p.a, -1)) > 1e-9) keys.push(nadd(p.b, p.a, -1));
    else if (p.k === "line") keys.push(p.d);
    else if (p.k === "plane") planes.push(p.n);
  }
  const sinOf = (u: number[], v: number[]) => {
    const c = ndot(u, v) / (nlen(u) * nlen(v));
    return Math.sqrt(Math.max(0, 1 - c * c));
  };
  const sin2 = (u: number[], v: number[]) => Math.abs(u[0] * v[1] - u[1] * v[0]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]) || 1);
  let best = { score: -Infinity, view: camera(30, 20) };
  for (let az = 5; az <= 75; az += 5)
    for (const el of [12, 20, 28, 36]) {
      const view = camera(az, el);
      let score = 1;
      for (const k of keys) score = Math.min(score, Math.hypot(...view(k).slice(0, 2)) / nlen(k));
      for (let i = 0; i < keys.length; i++)
        for (let j = i + 1; j < keys.length; j++) {
          const t = sinOf(keys[i], keys[j]);
          if (t > 0.05) score = Math.min(score, sin2(view(keys[i]), view(keys[j])) / t);
        }
      // A plane seen edge-on is a line: its normal must not lie flat on the screen.
      for (const n of planes) score = Math.min(score, Math.sqrt(Math.max(0, 1 - (Math.hypot(...view(n)) / nlen(n)) ** 2)));
      // Good enough is good enough: then the usual view wins.
      score = Math.min(score, 0.35) - 0.01 * (Math.abs(az - 30) / 5 + Math.abs(el - 20) / 8);
      if (score > best.score) best = { score, view };
    }
  return best.view;
}

function picture3(prims: Prim[], lo: number[], hi: number[], size: number, y0: number) {
  const res = resolve(prims, lo, hi, size);
  const axesEnds = [0, 1, 2].flatMap((i) => [0, 1].map((e) => [0, 1, 2].map((j) => (j === i ? (e ? hi[i] : lo[i]) : 0))));
  const proj = bestView(prims);
  const pts = [...axesEnds, ...res.flatMap(anchors)].map(proj);
  const [mnx, mxx] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  const [mny, mxy] = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
  const s = Math.min((W - 110) / (mxx - mnx || 1), 400 / (mxy - mny || 1));
  const ox = (W - s * (mxx - mnx)) / 2 - s * mnx;
  const oy = y0 + 16 - s * mny;
  const P = (v: number[]): [number, number] => {
    const [x, y] = proj(v);
    return [ox + s * x, oy + s * y];
  };
  const parts: string[] = [];
  for (let i = 0; i < 3; i++) {
    const [a, b] = [P(axesEnds[2 * i]), P(axesEnds[2 * i + 1])];
    parts.push(arrow(a[0], a[1], b[0], b[1], "#adb5bd", 1.3), lbl(b[0] + 7, b[1] + 4, XYZ[i], C.grey, "start", 13));
  }
  // Points and the tips of position vectors get a dashed drop to the floor z = 0 (and a shadow back to O) to show
  // where they are in depth.
  const faint = (a: [number, number], b: [number, number]) =>
    `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="#ced4da" stroke-width="1.2" stroke-dasharray="4 3"/>`;
  const fromO = (p: Prim) => p.k === "arrow" && p.a.every((x) => Math.abs(x) < 1e-9);
  for (const p of res) {
    const tip = p.k === "point" ? p.p : fromO(p) && p.k === "arrow" ? p.b : null;
    if (!tip || Math.abs(tip[2]) < 1e-9) continue;
    const foot = P([tip[0], tip[1], 0]);
    parts.push(faint(P(tip), foot), dot(foot[0], foot[1], "#ced4da", 2.5));
    if (p.k === "arrow") parts.push(faint(P([0, 0, 0]), foot));
  }
  return { svg: parts.join("") + draw(res, P, size), h: s * (mxy - mny) + 34 };
}

function draw(res: Prim[], P: (v: number[]) => [number, number], size: number): string {
  const layers: string[][] = [[], [], [], [], []];
  const labels: string[] = [];
  const line = (a: [number, number], b: [number, number], color: string, width: number, dashed?: boolean) =>
    `<line x1="${r2(a[0])}" y1="${r2(a[1])}" x2="${r2(b[0])}" y2="${r2(b[1])}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dashed ? ` stroke-dasharray="7 4"` : ""}/>`;
  /** A label that stays inside the picture (about 7.6 px per letter at 14 px). */
  const put = (x: number, y: number, text: string, color: string, anchor: string) => {
    const w = text.length * 7.6;
    const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
    const shift = left < 4 ? 4 - left : left + w > W - 4 ? W - 4 - (left + w) : 0;
    labels.push(lbl(x + shift, y, text, color, anchor, 14));
  };
  /** A label just past the end b, away from a. */
  const past = (a: [number, number], b: [number, number], text: string, color: string) => {
    if (!text) return;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(dx, dy);
    const [ux, uy] = L > 1e-6 ? [dx / L, dy / L] : [0.7, -0.7];
    put(b[0] + ux * 14, b[1] + uy * 14 + 5, text, color, Math.abs(ux) < 0.3 ? "middle" : ux > 0 ? "start" : "end");
  };
  /** A label beside the middle of a segment, on its left. */
  const beside = (a: [number, number], b: [number, number], text: string, color: string, at = 0.5) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(dx, dy) || 1;
    const [nx, ny] = [dy / L, -dx / L];
    put(a[0] + at * dx + nx * 14, a[1] + at * dy + ny * 14 + 5, text, color, Math.abs(nx) < 0.3 ? "middle" : nx > 0 ? "start" : "end");
  };
  for (const p of res) {
    if (p.k === "poly") {
      const ps = p.ps.map(P);
      layers[0].push(`<polygon points="${ps.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ")}" fill="${p.fill}" fill-opacity="0.55" stroke="${p.color}" stroke-width="1.2"/>`);
    } else if (p.k === "seg") {
      const [a, b] = [P(p.a), P(p.b)];
      if (p.a !== p.b) layers[1].push(line(a, b, p.color, p.width ?? 2.4, p.dashed));
      // A line's name sits beside it near its end, inside the picture.
      if (p.label && p.a !== p.b) beside(a, [a[0] + 0.92 * (b[0] - a[0]), a[1] + 0.92 * (b[1] - a[1])], p.label, p.color, 1);
      else if (p.label) past(a, b, p.label, p.color);
    } else if (p.k === "arrow") {
      const [a, b] = [P(p.a), P(p.b)];
      layers[3].push(arrow(a[0], a[1], b[0], b[1], p.color, p.width ?? 2.6, p.dashed));
      if (p.label && p.mid) beside(a, b, p.label, p.color, p.mid === true ? 0.5 : p.mid);
      else if (p.label) past(a, b, p.label, p.color);
    } else if (p.k === "angle") {
      const u = nunit(p.u);
      const v0 = nunit(p.v);
      const c = ndot(u, v0);
      const w0 = nadd(v0, u, -c);
      if (nlen(w0) < 1e-9) continue;
      const w = nunit(w0);
      const th = Math.acos(Math.max(-1, Math.min(1, c)));
      const r = Math.min(0.3 * Math.min(nlen(p.u), nlen(p.v)), 0.11 * size);
      const arc = Array.from({ length: 25 }, (_, i) => {
        const f = (th * i) / 24;
        return P(p.at.map((x, k) => x + r * (Math.cos(f) * u[k] + Math.sin(f) * w[k])));
      });
      layers[4].push(`<polyline points="${arc.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ")}" fill="none" stroke="${p.color}" stroke-width="1.8"/>`);
      const m = P(p.at.map((x, k) => x + 1.75 * r * (Math.cos(th / 2) * u[k] + Math.sin(th / 2) * w[k])));
      if (p.label) labels.push(lbl(m[0], m[1] + 5, p.label, p.color, "middle", 14));
    } else if (p.k === "right") {
      const r = 0.05 * size;
      const [u, v] = [nunit(p.u), nunit(p.v)];
      const q = [nadd(p.at, u, r), nadd(nadd(p.at, u, r), v, r), nadd(p.at, v, r)].map(P);
      layers[4].push(`<path d="M${q.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" L")}" fill="none" stroke="${C.grey}" stroke-width="1.4"/>`);
    } else if (p.k === "point") {
      const [x, y] = P(p.p);
      layers[2].push(dot(x, y, p.color, 4.5));
      if (p.label) labels.push(lbl(x + 8, y - 8, p.label, p.color, "start", 13, false));
    }
  }
  return layers.flat().join("") + labels.join("");
}

/** Steps, then the picture, then captions. */
function finish(header: string, rows: TexLine[], prims: Prim[], dim: number, caps: Caption[]): RenderedSvg {
  if (rows.length) rows[rows.length - 1].color ??= C.green;
  let y = 4;
  const ln = texLines(rows, y);
  y += ln.h + 6;
  const pic = prims.length ? picture(prims, dim, y) : null;
  return compose(header, ln.svg + (pic?.svg ?? ""), y + (pic?.h ?? 0), caps);
}
const headerOf = (P: Parsed, fallback: string) => (P.header.length ? P.header.join(", \\quad ") : fallback);

// ---------- shared steps ----------

/** |v| = √(…) = … */
function lenRow(name: string, v: V, op = words.basics.len): { row: TexLine; r: Root } {
  const s2 = vdot(v, v);
  const r = sqrtR(s2);
  const simple = rtex(r) === `\\sqrt{${s2.tex()}}`;
  const tex = `\\left|${name}\\right| = \\sqrt{${v.map(sqTex).join(" + ")}} = ${simple ? rtex(r) : `\\sqrt{${s2.tex()}} = ${rtex(r)}`}${approx(r)}`;
  return { row: { tex, op }, r };
}
const lenOf = (v: V) => sqrtR(vdot(v, v));

/** AB = B − A for every pair in an expression. */
function pairRows(n: Node, ctx: Ctx, seen = new Set<string>()): TexLine[] {
  const rows: TexLine[] = [];
  for (const [a, b] of pairsIn(n)) {
    if (seen.has(a + b)) continue;
    seen.add(a + b);
    const [A, B] = [ctx.pts.get(a) ?? zeros(ctx.dim), ctx.pts.get(b) ?? zeros(ctx.dim)];
    rows.push({ tex: `${pairTex(a, b)} = ${col(B)} - ${col(A)} = ${col(vsub(B, A))}`, op: fill(words.basics.between, { a, b }) });
  }
  return rows;
}

/** The steps that work out a vector expression. */
function exprRows(item: VItem, ctx: Ctx, seen: Set<string>): TexLine[] {
  const n = item.node;
  const rows = pairRows(n, ctx, seen);
  if (n.k === "pair" || n.k === "lit" || (n.k === "sym" && ctx.vecs.has(n.s))) return rows;
  const lhs = item.tex;
  const ts = n.k === "sum" ? n.ts : [{ sign: 1 as const, n }];
  const atomic = (m: Node) => m.k === "sym" || m.k === "pair" || m.k === "pt" || m.k === "lit";
  const sub = texNode(n, ctx, true);
  rows.push({ tex: `${lhs} = ${sub}`, op: words.basics.sub });
  if (ts.some((t) => !atomic(t.n)) && ts.length > 1) {
    const scaled = ts
      .map((t, i) => {
        const v = vecOf(t.n, ctx, item.plain);
        return `${i === 0 ? (t.sign < 0 ? "-" : "") : t.sign < 0 ? " - " : " + "}${col(v)}`;
      })
      .join("");
    rows.push({ tex: `= ${scaled}`, op: words.basics.scale });
  }
  rows.push({ tex: `= ${col(item.v)}`, op: ts.length > 1 ? words.basics.add : words.basics.scale });
  return rows;
}

/** A sentence when one vector is a multiple of the other. */
function parallelCap(a: VItem, b: VItem): Caption | null {
  if (isZeroV(a.v) || isZeroV(b.v)) return null;
  const k = ratioOf(a.v, b.v);
  if (!k) return null;
  return { text: fill(words.basics.parallel, { a: a.plain, b: b.plain, k: plainF(k), dir: k.isNeg() ? words.basics.opposite : words.basics.same }), color: C.purple };
}

// ---------- vectors and their arithmetic ----------

const COLORS = [C.blue, C.red, C.purple, C.orange];

function renderBasics(P: Parsed): RenderedSvg {
  const W_ = words.basics;
  const { ctx, dim } = P;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const prims: Prim[] = [];
  const givens = P.vecs.filter((v) => v.given);
  let work = P.vecs.filter((v) => !v.given);
  let diagonals = false;
  if (!work.length) {
    if (givens.length >= 2) {
      const [a, b] = givens;
      const mk = (sign: 1 | -1): VItem => {
        const node: Node = { k: "sum", ts: [{ sign: 1, n: { k: "sym", s: a.name! } }, { sign, n: { k: "sym", s: b.name! } }] };
        return { tex: `${a.tex} ${sign > 0 ? "+" : "-"} ${b.tex}`, plain: `${a.plain} ${sign > 0 ? "+" : "−"} ${b.plain}`, v: sign > 0 ? vadd(a.v, b.v) : vsub(a.v, b.v), node, given: false };
      };
      work = [mk(1), mk(-1)];
      diagonals = true;
    } else if (givens.length === 1) work = [];
    else if (P.pts.length >= 2) {
      const [A, B] = P.pts;
      const node: Node = { k: "pair", a: A.name, b: B.name };
      work = [{ tex: pairTex(A.name, B.name), plain: `${A.name}${B.name}`, v: vsub(B.p, A.p), node, given: false }];
    } else throw new Error(words.need.basics);
  }
  const seen = new Set<string>();
  for (const it of work) rows.push(...exprRows(it, ctx, seen), lenRow(it.tex, it.v).row);
  // One vector on its own: its length and its unit vector.
  const single = !work.length ? givens[0] : work.length === 1 && work[0].node.k === "pair" ? work[0] : null;
  if (single) {
    if (!work.length) rows.push(lenRow(single.tex, single.v).row);
    if (isZeroV(single.v)) caps.push({ text: fill(words.zero, { v: single.plain }), color: C.red });
    else {
      const r = lenOf(single.v);
      const hat = /^\\mathbf\{[a-z]\}(_\{\d+\})?$/.test(single.tex) ? `\\hat{${single.tex}}` : "\\hat{\\mathbf{u}}";
      const comps = single.v.map((x) => rdiv(x, r));
      rows.push({
        tex: `${hat} = \\frac{${single.tex}}{\\left|${single.tex}\\right|} = ${rational(r) ? "" : `\\frac{${r.out.d}}{${r.out.n === 1 ? "" : r.out.n}\\sqrt{${r.inner}}}${col(single.v)} = `}\\begin{pmatrix} ${comps.map(rtex).join(" \\\\ ")} \\end{pmatrix}`,
        op: W_.unit,
      });
      caps.push({ text: W_.unitCap });
    }
  }
  // Parallel vectors among the ones given.
  for (let i = 0; i < givens.length; i++)
    for (let j = i + 1; j < givens.length; j++) {
      const c = parallelCap(givens[i], givens[j]);
      if (c) caps.push(c);
    }

  // The picture.
  const O = Array(dim).fill(0);
  for (const p of P.pts) prims.push({ k: "point", p: num(p.p), label: p.name, color: C.ink });
  if (diagonals) {
    const [a, b] = givens.map((g) => num(g.v));
    prims.push(
      { k: "arrow", a: O, b: a, color: C.blue, label: givens[0].plain },
      { k: "arrow", a: O, b: b, color: C.red, label: givens[1].plain },
      { k: "arrow", a: b, b: nadd(a, b), color: C.blue, dashed: true, width: 1.6 },
      { k: "arrow", a: a, b: nadd(a, b), color: C.red, dashed: true, width: 1.6 },
      { k: "arrow", a: O, b: nadd(a, b), color: C.green, label: work[0].plain, width: 3 },
      // The diagonals cross at their midpoints, so this label goes a quarter of the way along.
      { k: "arrow", a: b, b: a, color: C.orange, label: work[1].plain, width: 3, mid: 0.25 },
    );
    caps.unshift({ text: W_.diagonals });
  } else if (work.length) {
    for (const g of givens) prims.push({ k: "arrow", a: O, b: num(g.v), color: C.grey, label: g.plain, width: 1.6, dashed: true });
    const first = work[0];
    const n = first.node;
    if (n.k === "pair") {
      const [A, B] = [ctx.pts.get(n.a), ctx.pts.get(n.b)];
      if (A && B) {
        prims.push({ k: "arrow", a: O, b: num(A), color: C.grey, width: 1.4, dashed: true }, { k: "arrow", a: O, b: num(B), color: C.grey, width: 1.4, dashed: true });
        prims.push({ k: "arrow", a: num(A), b: num(B), color: C.green, label: first.plain, width: 3, mid: true });
      }
    } else {
      const ts = n.k === "sum" ? n.ts : [{ sign: 1 as const, n }];
      // A chain of AB + BC + … starts at A.
      const lead = ts[0].n;
      const start = lead.k === "pair" && ts[0].sign > 0 && ctx.pts.has(lead.a) ? num(ctx.pts.get(lead.a)!) : O;
      let at = start;
      if (ts.length > 1)
        ts.forEach((t, i) => {
          const v = num(vecOf(t.n, ctx, first.plain)).map((x) => x * t.sign);
          prims.push({ k: "arrow", a: at, b: nadd(at, v), color: COLORS[i % COLORS.length], label: `${t.sign < 0 ? "−" : ""}${plainNode(t.n)}`, width: 2.2, mid: true });
          at = nadd(at, v);
        });
      prims.push({ k: "arrow", a: start, b: nadd(start, num(first.v)), color: C.green, label: first.plain, width: 3, mid: ts.length > 1 });
      if (ts.length > 1) caps.unshift({ text: W_.chain });
    }
    for (const it of work.slice(1)) prims.push({ k: "arrow", a: O, b: num(it.v), color: C.purple, label: it.plain, width: 2.4 });
  } else if (single) prims.push({ k: "arrow", a: O, b: num(single.v), color: C.blue, label: single.plain, width: 3 });

  const fallback = work.length ? work.map((w) => w.tex).join(", \\; ") : "";
  return finish(headerOf(P, fallback), rows, prims, dim, caps);
}

// ---------- the dot product ----------

/** The two (or three) vectors a topic works on, with the steps that find them. */
function operands(P: Parsed, want: number, topic: VecTopic): { items: VItem[]; rows: TexLine[]; at?: V; corner?: string } {
  const { ctx } = P;
  // Expressions typed after the named vectors are what to work on; otherwise the vectors in order.
  const work = P.vecs.filter((v) => !v.given);
  const items = (work.length >= 2 ? work : P.vecs).slice(0, want);
  if (items.length >= 2) {
    const seen = new Set<string>();
    const rows = items.flatMap((it) => (it.given || it.node.k === "sym" ? [] : exprRows(it, ctx, seen)));
    return { items, rows };
  }
  // Points: the angle ABC at the middle one; areas and volumes from the first one.
  if (!items.length && P.pts.length >= 3) {
    const [A, B, Cc] = P.pts;
    const mk = (p: { name: string; p: V }, q: { name: string; p: V }): VItem => ({
      tex: pairTex(p.name, q.name), plain: `${p.name}${q.name}`, v: vsub(q.p, p.p), node: { k: "pair", a: p.name, b: q.name }, given: false,
    });
    const its = topic === "dot" ? [mk(B, A), mk(B, Cc)] : [mk(A, B), mk(A, Cc), ...(P.pts[3] ? [mk(A, P.pts[3])] : [])].slice(0, want);
    const seen = new Set<string>();
    return { items: its, rows: its.flatMap((it) => pairRows(it.node, ctx, seen)), at: topic === "dot" ? B.p : A.p, corner: topic === "dot" ? `${A.name}${B.name}${Cc.name}` : undefined };
  }
  throw new Error(words.need[topic]);
}

function renderDot(P: Parsed): RenderedSvg {
  const W_ = words.dot;
  const { items, rows, at, corner } = operands(P, 2, "dot");
  const [a, b] = items;
  const caps: Caption[] = [];
  for (const it of [a, b]) if (isZeroV(it.v)) throw new Error(fill(words.zero, { v: it.plain }));
  const d = vdot(a.v, b.v);
  const products = a.v.map((x, i) => x.mul(b.v[i]));
  rows.push({ tex: `${a.tex} \\cdot ${b.tex} = ${productsTex(a.v, b.v)}`, op: W_.def });
  rows.push({ tex: `= ${products.map((x, i) => (i === 0 ? x.tex() : x.isNeg() ? `- ${x.neg().tex()}` : `+ ${x.tex()}`)).join(" ")} = ${d.tex()}`, op: "", color: C.blue });
  const ra = lenOf(a.v);
  const rb = lenOf(b.v);
  rows.push({ tex: `\\left|${a.tex}\\right| = \\sqrt{${vdot(a.v, a.v).tex()}}${rtex(ra) === `\\sqrt{${vdot(a.v, a.v).tex()}}` ? "" : ` = ${rtex(ra)}`}, \\quad \\left|${b.tex}\\right| = \\sqrt{${vdot(b.v, b.v).tex()}}${rtex(rb) === `\\sqrt{${vdot(b.v, b.v).tex()}}` ? "" : ` = ${rtex(rb)}`}`, op: W_.lens });
  const cos = rdiv(d, rmul(ra, rb));
  const theta = corner ? `\\angle ${corner}` : "\\theta";
  rows.push({ tex: `\\cos ${theta} = \\frac{${a.tex} \\cdot ${b.tex}}{\\left|${a.tex}\\right| \\left|${b.tex}\\right|} = \\frac{${d.tex()}}{${rtex(ra)} \\cdot ${rtex(rb)}} = ${rtex(cos)}`, op: W_.cos });
  const ang = angleTex(rnum(cos));
  rows.push({ tex: `${theta} = \\arccos\\left(${rtex(cos)}\\right) ${ang.tex}`, op: W_.angle, color: C.purple });
  const k = ratioOf(a.v, b.v);
  caps.push({
    text: fill(d.isZero() ? W_.right : k ? (k.isNeg() ? W_.opposite : W_.same) : d.isNeg() ? W_.obtuse : W_.acute, { a: a.plain, b: b.plain, d: plainF(d), t: ang.plain }),
    color: d.isZero() ? C.green : C.ink,
  });
  // Projection of a on b.
  const bb = vdot(b.v, b.v);
  const comp = rdiv(d, rb);
  const proj = vscale(b.v, d.div(bb));
  rows.push({ tex: `\\frac{${a.tex} \\cdot ${b.tex}}{\\left|${b.tex}\\right|} = ${rational(rb) ? "" : `\\frac{${d.tex()}}{${rtex(rb)}} = `}${rtex(comp)}${approx(comp)}`, op: fill(W_.scalar, { a: a.plain, b: b.plain }) });
  rows.push({ tex: `\\frac{${a.tex} \\cdot ${b.tex}}{${b.tex} \\cdot ${b.tex}}\\, ${b.tex} = \\frac{${d.tex()}}{${bb.tex()}} ${col(b.v)} = ${col(proj)}`, op: fill(W_.vector, { a: a.plain, b: b.plain }) });
  if (!k) caps.push({ text: fill(W_.proj, { a: a.plain, b: b.plain, c: rcap(comp) }), color: C.green });

  const dim = P.dim;
  const O = at ? num(at) : Array(dim).fill(0);
  const [av, bv, pv] = [num(a.v), num(b.v), num(proj)];
  const prims: Prim[] = [{ k: "line", a: O, d: bv, color: "#ced4da", width: 1.4, dashed: true }];
  if (at) for (const p of P.pts.slice(0, 3)) prims.push({ k: "point", p: num(p.p), label: p.name, color: C.ink });
  prims.push(
    { k: "arrow", a: O, b: nadd(O, av), color: C.blue, label: a.plain, mid: !!at },
    { k: "arrow", a: O, b: nadd(O, bv), color: C.red, label: b.plain, mid: !!at },
    { k: "angle", at: O, u: av, v: bv, color: C.purple, label: corner ? "" : "θ" },
  );
  if (!k && !d.isZero()) {
    const F_ = nadd(O, pv);
    prims.push({ k: "seg", a: nadd(O, av), b: F_, color: C.grey, dashed: true, width: 1.5 });
    prims.push({ k: "arrow", a: O, b: F_, color: C.green, width: 4 });
    prims.push({ k: "right", at: F_, u: nadd(av, pv, -1), v: d.isNeg() ? bv : bv.map((x) => -x) });
  } else if (d.isZero()) prims.push({ k: "right", at: O, u: av, v: bv });
  return finish(headerOf(P, `${a.tex}, \\; ${b.tex}`), rows, prims, dim, caps);
}

// ---------- the cross product ----------

function crossRows(a: VItem, b: VItem): { rows: TexLine[]; c: V } {
  const W_ = words.cross;
  const [u, v] = [a.v, b.v];
  const c = vcross(u, v);
  const name = `${a.tex} \\times ${b.tex}`;
  const minor = (i: number, j: number) => `${par(u[i])} \\cdot ${par(v[j])} - ${par(u[j])} \\cdot ${par(v[i])}`;
  return {
    c,
    rows: [
      { tex: `${name} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ ${u.map((x) => x.tex()).join(" & ")} \\\\ ${v.map((x) => x.tex()).join(" & ")} \\end{vmatrix}`, op: W_.det },
      { tex: `= \\mathbf{i}\\left(${minor(1, 2)}\\right) - \\mathbf{j}\\left(${minor(0, 2)}\\right) + \\mathbf{k}\\left(${minor(0, 1)}\\right)`, op: W_.expand },
      { tex: `= ${col(c)}`, op: "", color: C.blue },
      { tex: `\\left(${name}\\right) \\cdot ${a.tex} = ${vdot(c, u).tex()}, \\quad \\left(${name}\\right) \\cdot ${b.tex} = ${vdot(c, v).tex()}`, op: W_.check },
    ],
  };
}

function renderCross(P: Parsed): RenderedSvg {
  const W_ = words.cross;
  const lifted = P.dim === 2;
  const lift = (v: V) => (v.length === 2 ? [...v, ZERO] : v);
  const op = operands(P, 3, "cross");
  const items = op.items.map((it) => ({ ...it, v: lift(it.v) }));
  const [a, b, c3] = items;
  const caps: Caption[] = [];
  if (lifted) caps.push({ text: W_.lifted, color: C.grey });
  const { rows: cr, c } = crossRows(a, b);
  const rows = [...op.rows, ...cr];
  const name = `${a.tex} \\times ${b.tex}`;
  const r = lenOf(c);
  const fromPts = !!op.at;
  if (isZeroV(c)) caps.push({ text: fill(W_.flat, { a: a.plain, b: b.plain }), color: C.red });
  else {
    rows.push({ ...lenRow(name, c, W_.area).row, color: C.green });
    const half = { out: r.out.div(F(2)), inner: r.inner };
    rows.push({ tex: `\\tfrac{1}{2}\\left|${name}\\right| = ${rtex(half)}${approx(half)}`, op: W_.tri, color: C.green });
    caps.push({ text: fill(fromPts ? W_.triCap : W_.areaCap, { a: a.plain, b: b.plain, s: rcap(r), h: rcap(half), abc: P.pts.slice(0, 3).map((p) => p.name).join("") }) });
  }
  if (c3) {
    const V_ = vdot(c, c3.v);
    rows.push({ tex: `\\left(${name}\\right) \\cdot ${c3.tex} = ${productsTex(c, c3.v)} = ${V_.tex()}`, op: W_.triple, color: C.purple });
    if (V_.isZero()) caps.push({ text: fill(W_.coplanar, { a: a.plain, b: b.plain, c: c3.plain }), color: C.purple });
    else {
      const abs = V_.abs();
      rows.push({ tex: `V = \\left|${V_.tex()}\\right| = ${abs.tex()}, \\quad \\tfrac{1}{6} V = ${abs.div(F(6)).tex()}`, op: W_.volume, color: C.purple });
      caps.push({ text: fill(W_.volumeCap, { v: plainF(abs), t: plainF(abs.div(F(6))) }), color: C.purple });
    }
  }

  const O = op.at ? num(lift(op.at)) : [0, 0, 0];
  const [av, bv, cv] = [num(a.v), num(b.v), num(c)];
  const prims: Prim[] = [];
  if (fromPts) prims.push({ k: "poly", ps: [O, nadd(O, av), nadd(O, bv)], color: C.blue, fill: "#a5d8ff" });
  else prims.push({ k: "poly", ps: [O, nadd(O, av), nadd(nadd(O, av), bv), nadd(O, bv)], color: C.blue, fill: "#d0ebff" });
  if (fromPts) for (const p of P.pts.slice(0, items.length + 1)) prims.push({ k: "point", p: num(lift(p.p)), label: p.name, color: C.ink });
  prims.push({ k: "arrow", a: O, b: nadd(O, av), color: C.blue, label: a.plain, mid: fromPts }, { k: "arrow", a: O, b: nadd(O, bv), color: C.red, label: b.plain, mid: fromPts });
  if (c3) {
    const cv3 = nadd(O, num(c3.v));
    prims.push({ k: "arrow", a: O, b: cv3, color: C.orange, label: c3.plain, mid: fromPts });
    // The other edges of the tetrahedron (points) or of the box (vectors).
    const edge = (p: number[], q: number[]) => prims.push({ k: "seg", a: p, b: q, color: C.orange, dashed: true, width: 1.3 });
    const [A1, B1] = [nadd(O, av), nadd(O, bv)];
    if (fromPts) (edge(A1, cv3), edge(B1, cv3));
    else {
      const up = num(c3.v);
      const base = [A1, nadd(A1, bv), B1];
      for (const q of base) edge(q, nadd(q, up));
      [cv3, ...base.map((q) => nadd(q, up)), cv3].reduce((p, q) => (edge(p, q), q));
    }
  }
  if (!isZeroV(c)) {
    const longest = Math.max(nlen(av), nlen(bv));
    const k = nlen(cv) > 1.6 * longest ? (1.2 * longest) / nlen(cv) : 1;
    prims.push({ k: "arrow", a: O, b: nadd(O, cv, k), color: C.purple, label: k < 1 ? `${a.plain} × ${b.plain} (${W_.shortened})` : `${a.plain} × ${b.plain}`, width: 3 });
    prims.push({ k: "right", at: O, u: cv, v: av });
  }
  return finish(headerOf(P, `${a.tex}, \\; ${b.tex}${c3 ? `, \\; ${c3.tex}` : ""}`), rows, prims, 3, caps);
}

// ---------- lines ----------

/** The lines the input gives: typed ones, or the line through the first two points. */
function linesOf(P: Parsed): { lines: LineT[]; extra: { name: string; p: V }[] } {
  if (P.planes.length) throw new Error(fill(words.notLine, { s: P.planes[0].name }));
  if (P.lines.length) return { lines: P.lines, extra: P.pts };
  if (P.pts.length >= 2) {
    const [A, B] = P.pts;
    const d = vsub(B.p, A.p);
    if (isZeroV(d)) throw new Error(fill(words.zero, { v: `${A.name}${B.name}` }));
    const intro: TexLine[] = [{ tex: `\\mathbf{d} = ${pairTex(A.name, B.name)} = ${col(B.p)} - ${col(A.p)} = ${col(d)}`, op: fill(words.lines.dir, { a: A.name, b: B.name }) }];
    return { lines: [{ name: "ℓ", a: A.p, d, param: "t", intro, pts: [A.name, B.name] }], extra: P.pts.slice(2) };
  }
  throw new Error(words.need.lines);
}

/** The foot of the perpendicular from p to the line, with the steps. */
function footRows(L: LineT, p: { name: string; p: V }): { rows: TexLine[]; F: V; t: Frac; dist: Root } {
  const W_ = words.lines;
  const ap = vsub(p.p, L.a);
  const dd = vdot(L.d, L.d);
  const t = vdot(ap, L.d).div(dd);
  const F_ = pointAt(L, t);
  const fp = vsub(p.p, F_);
  const dist = lenOf(fp);
  const pt = paramTex(L.param);
  const rows: TexLine[] = [
    { tex: `\\mathbf{a} = ${col(L.a)}, \\quad ${p.name} - \\mathbf{a} = ${col(ap)}`, op: fill(W_.ap, { p: p.name }) },
    { tex: `${pt} = \\frac{(${p.name} - \\mathbf{a}) \\cdot \\mathbf{d}}{\\mathbf{d} \\cdot \\mathbf{d}} = \\frac{${vdot(ap, L.d).tex()}}{${dd.tex()}} = ${t.tex()}`, op: W_.t },
    { tex: `F = \\mathbf{a} + ${t.isOne() ? "" : t.texP()}\\mathbf{d} = ${col(F_)}`, op: W_.foot, color: C.purple },
  ];
  if (!isZeroV(fp)) {
    rows.push({ tex: `\\overrightarrow{F${p.name}} = ${col(fp)}, \\quad \\overrightarrow{F${p.name}} \\cdot \\mathbf{d} = ${vdot(fp, L.d).tex()}`, op: W_.check });
    rows.push({ ...lenRow(`\\overrightarrow{F${p.name}}`, fp, W_.dist).row, color: C.green });
  }
  return { rows, F: F_, t, dist };
}

function renderLines(P: Parsed): RenderedSvg {
  const W_ = words.lines;
  const { lines, extra } = linesOf(P);
  const dim = P.dim;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const prims: Prim[] = [];
  const [L1, L2] = lines;
  for (const L of lines) if (isZeroV(L.d)) throw new Error(fill(words.zero, { v: "d" }));
  if (L2 && L2.param === L1.param) L2.param = L1.param === "s" ? "t" : "s";
  const nm = (L: LineT) => (lines.length > 1 ? `${labelTex(L.name)}: \\ ` : "");
  rows.push(...L1.intro);
  rows.push({ tex: `${nm(L1)}${vecEqTex(L1)}`, op: W_.vector, color: C.blue });
  if (!L2) {
    rows.push({ tex: paramEqTex(L1), op: W_.param });
    if (dim === 3) rows.push({ tex: symmTex(L1.a, L1.d), op: W_.cart });
    else {
      const [a, b] = [L1.d[1], L1.d[0].neg()];
      const n = integral([a, b, vdot([a, b], L1.a)]);
      rows.push({ tex: `${linTex(n.slice(0, 2), XYZ)} = ${n[2].tex()}`, op: W_.general });
    }
    caps.push({ text: fill(W_.each, { t: L1.param }) });
  }
  const color = [C.blue, C.red];
  lines.slice(0, 2).forEach((L, i) => {
    prims.push({ k: "line", a: num(L.a), d: num(L.d), color: color[i], label: namePlain(L.name), width: 2.4 });
    prims.push({ k: "arrow", a: num(L.a), b: nadd(num(L.a), num(L.d)), color: color[i], label: i === 0 && !L2 ? "d" : "", width: 1.8, dashed: true });
  });
  if (L1.pts) for (const p of P.pts.slice(0, 2)) prims.push({ k: "point", p: num(p.p), label: p.name, color: C.ink });
  else prims.push({ k: "point", p: num(L1.a), label: "", color: C.blue });

  // A point: on the line, or how far from it.
  const p = extra[0];
  if (p && !L2) {
    const f = footRows(L1, p);
    rows.push(...f.rows);
    if (isZeroV(vsub(p.p, f.F))) caps.push({ text: fill(W_.on, { p: p.name, t: `${L1.param} = ${plainF(f.t)}` }), color: C.green });
    else {
      caps.push({ text: fill(words.planes.distCap, { p: p.name, f: vecPlain(f.F), d: rcap(f.dist) }), color: C.green });
      prims.push({ k: "seg", a: num(p.p), b: num(f.F), color: C.green, dashed: true, width: 2 });
      prims.push({ k: "right", at: num(f.F), u: nadd(num(p.p), num(f.F), -1), v: num(L1.d) });
      prims.push({ k: "point", p: num(f.F), label: "F", color: C.purple });
    }
    prims.push({ k: "point", p: num(p.p), label: p.name, color: C.green });
  }

  if (L2) {
    rows.push(...L2.intro);
    rows.push({ tex: `${nm(L2)}${vecEqTex(L2)}`, op: W_.vector, color: C.red });
    const k = ratioOf(L1.d, L2.d);
    if (k) {
      rows.push({ tex: `\\mathbf{d}_2 = ${k.tex()}\\,\\mathbf{d}_1`, op: W_.parallel });
      const f = footRows(L1, { name: "A_2", p: L2.a });
      if (isZeroV(vsub(L2.a, f.F))) caps.push({ text: W_.same, color: C.purple });
      else {
        rows.push(...f.rows);
        caps.push({ text: fill(W_.parallelCap, { d: rcap(f.dist) }), color: C.green });
        prims.push({ k: "seg", a: num(L2.a), b: num(f.F), color: C.green, dashed: true, width: 2 });
      }
    } else {
      const [t, s] = [paramTex(L1.param), paramTex(L2.param)];
      const eqs = L1.a.map((_, i) => `${linTex([L1.a[i], L1.d[i]], ["", t])} = ${linTex([L2.a[i], L2.d[i]], ["", s])}`);
      rows.push({ tex: `\\begin{cases} ${eqs.join(" \\\\ ")} \\end{cases}`, op: W_.meetEq });
      // t·d₁ − s·d₂ = a₂ − a₁ in two rows with a non-zero determinant.
      const rhs = vsub(L2.a, L1.a);
      const pairs = dim === 3 ? [[0, 1], [0, 2], [1, 2]] : [[0, 1]];
      const [i, j] = pairs.find(([i, j]) => !L1.d[i].mul(L2.d[j].neg()).sub(L2.d[i].neg().mul(L1.d[j])).isZero())!;
      const det = L1.d[i].mul(L2.d[j].neg()).sub(L2.d[i].neg().mul(L1.d[j]));
      const tv = rhs[i].mul(L2.d[j].neg()).sub(L2.d[i].neg().mul(rhs[j])).div(det);
      const sv = L1.d[i].mul(rhs[j]).sub(rhs[i].mul(L1.d[j])).div(det);
      rows.push({ tex: `${t} = ${tv.tex()}, \\quad ${s} = ${sv.tex()}`, op: fill(W_.solve, { a: String(i + 1), b: String(j + 1) }) });
      const X = pointAt(L1, tv);
      const Y = vadd(L2.a, vscale(L2.d, sv));
      if (dim === 3) {
        const m = [0, 1, 2].find((q) => q !== i && q !== j)!;
        const ok = X[m].sub(Y[m]).isZero();
        const sides = `${linTex([L1.a[m], L1.d[m]], ["", `(${tv.tex()})`])} = ${X[m].tex()}, \\quad ${linTex([L2.a[m], L2.d[m]], ["", `(${sv.tex()})`])} = ${Y[m].tex()}`;
        rows.push({ tex: `${sides} \\;\\Rightarrow\\; ${X[m].tex()} ${ok ? "=" : "\\ne"} ${Y[m].tex()}${ok ? " \\; \\checkmark" : ""}`, op: fill(W_.third, { n: String(m + 1) }), color: ok ? C.ink : C.red });
        if (!ok) {
          const n = vcross(L1.d, L2.d);
          const nn = vdot(n, n);
          const top = vdot(rhs, n);
          const dist = rdiv(top.abs(), sqrtR(nn));
          rows.push({ tex: `\\mathbf{n} = \\mathbf{d}_1 \\times \\mathbf{d}_2 = ${col(n)}`, op: W_.skewCross });
          rows.push({ tex: `\\frac{\\left|(\\mathbf{a}_2 - \\mathbf{a}_1) \\cdot \\mathbf{n}\\right|}{|\\mathbf{n}|} = \\frac{\\left|${top.tex()}\\right|}{\\sqrt{${nn.tex()}}} = ${rtex(dist)}${approx(dist)}`, op: W_.skewDist, color: C.green });
          caps.push({ text: fill(W_.skew, { d: rcap(dist) }), color: C.green });
          // The common perpendicular, for the picture.
          const w0 = vsub(L1.a, L2.a);
          const [A, B, Cc, D, E] = [vdot(L1.d, L1.d), vdot(L1.d, L2.d), vdot(L2.d, L2.d), vdot(L1.d, w0), vdot(L2.d, w0)];
          const den = A.mul(Cc).sub(B.mul(B));
          const sc = B.mul(E).sub(Cc.mul(D)).div(den);
          const tc = A.mul(E).sub(B.mul(D)).div(den);
          const [Pp, Q] = [pointAt(L1, sc), vadd(L2.a, vscale(L2.d, tc))];
          prims.push({ k: "seg", a: num(Pp), b: num(Q), color: C.green, width: 2.4, dashed: true }, { k: "point", p: num(Pp), label: "", color: C.green }, { k: "point", p: num(Q), label: "", color: C.green });
        }
        if (ok) {
          rows.push({ tex: `X = ${col(X)}`, op: W_.meet, color: C.green });
          caps.push({ text: fill(W_.meetCap, { p: vecPlain(X) }), color: C.green });
          prims.push({ k: "point", p: num(X), label: "X", color: C.green });
        }
      } else {
        rows.push({ tex: `X = ${col(X)}`, op: W_.meet, color: C.green });
        caps.push({ text: fill(W_.meetCap, { p: vecPlain(X) }), color: C.green });
        prims.push({ k: "point", p: num(X), label: "X", color: C.green });
      }
      const cos = rdiv(vdot(L1.d, L2.d).abs(), rmul(lenOf(L1.d), lenOf(L2.d)));
      const ang = angleTex(rnum(cos));
      rows.push({ tex: `\\cos\\theta = \\frac{|\\mathbf{d}_1 \\cdot \\mathbf{d}_2|}{|\\mathbf{d}_1|\\,|\\mathbf{d}_2|} = ${rtex(cos)}, \\quad \\theta ${ang.tex}`, op: W_.angle, color: C.purple });
      caps.push({ text: fill(W_.angleCap, { t: ang.plain }), color: C.purple });
    }
  }
  return finish(headerOf(P, vecEqTex(L1)), rows, prims, dim, caps);
}

// ---------- planes ----------

function planesOf(P: Parsed): { planes: PlaneT[]; extra: { name: string; p: V }[] } {
  const W_ = words.planes;
  if (P.dim !== 3) throw new Error(words.only3d);
  if (P.planes.length) return { planes: P.planes, extra: P.pts };
  const n = P.vecs.find((v) => /^\\mathbf\{n\}/.test(v.tex));
  if (n && P.pts.length) {
    const A = P.pts[0];
    if (isZeroV(n.v)) throw new Error(fill(words.zero, { v: "n" }));
    const d = vdot(n.v, A.p);
    return {
      planes: [{
        name: "Π", n: n.v, d, at: A.p, mark: A,
        intro: [
          { tex: `\\mathbf{n} \\cdot \\left(\\mathbf{r} - \\overrightarrow{O${A.name}}\\right) = 0`, op: W_.normalForm },
          { tex: `${linTex(n.v, XYZ)} = ${productsTex(n.v, A.p)} = ${d.tex()}`, op: W_.pointNormal },
        ],
      }],
      extra: P.pts.slice(1),
    };
  }
  if (P.pts.length >= 3) {
    const [A, B, Cc] = P.pts;
    const [u, v] = [vsub(B.p, A.p), vsub(Cc.p, A.p)];
    const c = vcross(u, v);
    if (isZeroV(c)) throw new Error(fill(words.cross.flat, { a: `${A.name}${B.name}`, b: `${A.name}${Cc.name}` }));
    const n = integral(c);
    const d = vdot(n, A.p);
    const ab = pairTex(A.name, B.name);
    const ac = pairTex(A.name, Cc.name);
    const intro: TexLine[] = [
      { tex: `${ab} = ${col(u)}, \\quad ${ac} = ${col(v)}`, op: W_.points },
      { tex: `${ab} \\times ${ac} = ${col(c)}${eqV(c, n) ? "" : ` \\;\\Rightarrow\\; \\mathbf{n} = ${col(n)}`}`, op: words.cross.det },
      { tex: `${linTex(n, XYZ)} = ${productsTex(n, A.p)} = ${d.tex()}`, op: fill(W_.pointNormal, {}) },
    ];
    return { planes: [{ name: "Π", n, d, at: A.p, intro, pts: [A.p, B.p, Cc.p] }], extra: P.pts.slice(3) };
  }
  throw new Error(words.need.planes);
}

/** The point of the plane nearest the origin: d/|n|² · n. */
const nearest = (p: PlaneT) => vscale(p.n, p.d.div(vdot(p.n, p.n)));

function renderPlanes(P: Parsed): RenderedSvg {
  const W_ = words.planes;
  const { planes, extra } = planesOf(P);
  const [P1, P2] = planes;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const prims: Prim[] = [];
  const nm = (p: PlaneT) => (planes.length > 1 ? `${labelTex(p.name)}: \\ ` : "");
  // With two planes their normals are n₁ and n₂.
  const intro = (p: PlaneT, i: number) => (P2 ? p.intro.map((r) => ({ ...r, tex: r.tex.replace(/\\mathbf\{n\}/g, `\\mathbf{n}_${i}`) })) : p.intro);
  const cart = (p: PlaneT) => {
    const z = integral([...p.n, p.d]);
    return `${linTex(z.slice(0, 3), XYZ)} = ${z[3].tex()}`;
  };
  rows.push(...intro(P1, 1), { tex: `${nm(P1)}${cart(P1)}`, op: W_.cart, color: C.blue });
  let centre = P1.pts ? P1.pts.reduce((s, q) => vadd(s, vscale(q, F(1, 3))), zeros(3)) : P1.at ?? nearest(P1);
  if (!P2 && !P.lines.length && !extra.length) {
    const cuts = P1.n.map((c, i) => (c.isZero() || P1.d.isZero() ? null : `${XYZ[i]} = ${plainF(P1.d.div(c))}`)).filter(Boolean);
    if (cuts.length) caps.push({ text: fill(W_.intercepts, { list: cuts.join(", ") }) });
  }
  if (P1.pts) P.pts.slice(0, 3).forEach((q) => prims.push({ k: "point", p: num(q.p), label: q.name, color: C.ink }));
  if (P1.mark) prims.push({ k: "point", p: num(P1.mark.p), label: P1.mark.name, color: C.ink });
  if (P1.dirs && P1.at) {
    const a = num(P1.at);
    prims.push({ k: "point", p: a, label: "", color: C.blue });
    for (const [i, u] of P1.dirs.entries()) prims.push({ k: "arrow", a, b: nadd(a, num(u)), color: [C.red, C.purple][i], width: 2 });
  }

  const nn = vdot(P1.n, P1.n);
  const rn = lenOf(P1.n);
  // A point: on the plane, or its distance and foot.
  const p = extra[0];
  if (p) {
    const v = vdot(P1.n, p.p);
    rows.push({ tex: `\\mathbf{n} \\cdot ${p.name} = ${productsTex(P1.n, p.p)} = ${v.tex()}`, op: fill(W_.nP, { p: p.name }) });
    if (v.sub(P1.d).isZero()) {
      caps.push({ text: fill(W_.on, { p: p.name }), color: C.green });
      centre = p.p;
    } else {
      const dist = rdiv(v.sub(P1.d).abs(), rn);
      const over = `\\frac{\\left|${v.tex()} - ${par(P1.d)}\\right|}{\\sqrt{${nn.tex()}}} = \\frac{${v.sub(P1.d).abs().tex()}}{${rtex(rn)}}`;
      rows.push({ tex: `${over}${rational(rn) && rn.out.isInt() ? "" : ` = ${rtex(dist)}`}${approx(dist)}`, op: W_.dist, color: C.green });
      const k = v.sub(P1.d).div(nn);
      const F_ = vsub(p.p, vscale(P1.n, k));
      rows.push({ tex: `F = ${p.name} - \\frac{${v.sub(P1.d).tex()}}{${nn.tex()}}\\,\\mathbf{n} = ${col(F_)}`, op: W_.foot, color: C.purple });
      caps.push({ text: fill(W_.distCap, { p: p.name, f: vecPlain(F_), d: rcap(dist) }), color: C.green });
      prims.push({ k: "seg", a: num(p.p), b: num(F_), color: C.green, dashed: true, width: 2 }, { k: "point", p: num(F_), label: "F", color: C.purple });
      centre = F_;
    }
    prims.push({ k: "point", p: num(p.p), label: p.name, color: C.green });
  }

  // A line: where it meets the plane, or why it doesn't.
  const L = P.lines[0];
  if (L) {
    const pt = paramTex(L.param);
    rows.push({ tex: `${vecEqTex(L)}`, op: words.lines.vector, color: C.red });
    const nd = vdot(P1.n, L.d);
    const na = vdot(P1.n, L.a);
    rows.push({ tex: `\\mathbf{n} \\cdot \\mathbf{d} = ${productsTex(P1.n, L.d)} = ${nd.tex()}`, op: W_.nd });
    if (nd.isZero()) caps.push({ text: na.sub(P1.d).isZero() ? W_.inPlane : W_.parallelLine, color: C.purple });
    else {
      const t = P1.d.sub(na).div(nd);
      const X = pointAt(L, t);
      rows.push({ tex: `${linTex([na, nd], ["", pt])} = ${P1.d.tex()} \\;\\Rightarrow\\; ${pt} = ${t.tex()}`, op: W_.sub });
      rows.push({ tex: `X = ${col(X)}`, op: W_.meet, color: C.green });
      caps.push({ text: fill(W_.meetCap, { p: vecPlain(X) }), color: C.green });
      const sin = rdiv(nd.abs(), rmul(rn, lenOf(L.d)));
      const ang = angleTex(Math.sqrt(Math.max(0, 1 - rnum(sin) ** 2)));
      rows.push({ tex: `\\sin\\theta = \\frac{|\\mathbf{n} \\cdot \\mathbf{d}|}{|\\mathbf{n}|\\,|\\mathbf{d}|} = ${rtex(sin)}, \\quad \\theta ${ang.tex}`, op: W_.angleLine, color: C.purple });
      prims.push({ k: "point", p: num(X), label: "X", color: C.green });
      centre = X;
    }
    prims.push({ k: "line", a: num(L.a), d: num(L.d), color: C.red, label: namePlain(L.name) });
  }

  // A second plane: the line where they meet, or the gap between them.
  if (P2) {
    rows.push(...intro(P2, 2), { tex: `${nm(P2)}${cart(P2)}`, op: W_.cart, color: C.orange });
    const dir = vcross(P1.n, P2.n);
    if (isZeroV(dir)) {
      const k = ratioOf(P1.n, P2.n)!;
      rows.push({ tex: `\\mathbf{n}_2 = ${k.tex()}\\,\\mathbf{n}_1`, op: W_.parallelPlanes });
      const d2 = P2.d.div(k);
      if (d2.sub(P1.d).isZero()) caps.push({ text: W_.samePlane, color: C.purple });
      else {
        const dist = rdiv(d2.sub(P1.d).abs(), rn);
        rows.push({ tex: `\\frac{\\left|${d2.tex()} - ${par(P1.d)}\\right|}{${rtex(rn)}} = ${rtex(dist)}${approx(dist)}`, op: W_.planeDist, color: C.green });
        caps.push({ text: fill(W_.parallelCap, { d: rcap(dist) }), color: C.green });
      }
    } else {
      rows.push({ tex: `\\mathbf{d} = \\mathbf{n}_1 \\times \\mathbf{n}_2 = ${col(dir)}`, op: W_.dirLine });
      // Set a coordinate that changes along the line to 0 and solve for the other two.
      const z = [0, 1, 2].find((i) => !dir[i].isZero())!;
      const [i, j] = [0, 1, 2].filter((q) => q !== z);
      const det = P1.n[i].mul(P2.n[j]).sub(P1.n[j].mul(P2.n[i]));
      const pi = P1.d.mul(P2.n[j]).sub(P2.d.mul(P1.n[j])).div(det);
      const pj = P1.n[i].mul(P2.d).sub(P2.n[i].mul(P1.d)).div(det);
      const A = zeros(3);
      A[i] = pi;
      A[j] = pj;
      const sys = [P1, P2].map((q) => `${linTex([q.n[i], q.n[j]], [XYZ[i], XYZ[j]])} = ${q.d.tex()}`);
      rows.push({ tex: `${XYZ[z]} = 0: \\; \\begin{cases} ${sys.join(" \\\\ ")} \\end{cases} \\Rightarrow ${XYZ[i]} = ${pi.tex()}, \\; ${XYZ[j]} = ${pj.tex()}`, op: fill(W_.pointBoth, { v: XYZ[z] }) });
      const line: LineT = { name: "ℓ", a: A, d: dir, param: "t", intro: [] };
      rows.push({ tex: vecEqTex(line), op: W_.lineEq, color: C.green });
      caps.push({ text: fill(W_.lineCap, { p: vecPlain(A), d: vecPlain(dir) }), color: C.green });
      const cos = rdiv(vdot(P1.n, P2.n).abs(), rmul(rn, lenOf(P2.n)));
      const ang = angleTex(rnum(cos));
      rows.push({ tex: `\\cos\\theta = \\frac{|\\mathbf{n}_1 \\cdot \\mathbf{n}_2|}{|\\mathbf{n}_1|\\,|\\mathbf{n}_2|} = ${rtex(cos)}, \\quad \\theta ${ang.tex}`, op: W_.angle, color: C.purple });
      // Centre both patches on the point of the common line nearest the origin.
      const t = vdot(A, dir).neg().div(vdot(dir, dir));
      centre = pointAt(line, t);
      prims.push({ k: "line", a: num(centre), d: num(dir), color: C.green, width: 3.2 });
    }
    const c2 = isZeroV(dir) ? nearest(P2) : centre;
    prims.unshift({ k: "plane", n: num(P2.n), at: num(c2), color: C.orange, fill: "#ffd8a8", label: namePlain(P2.name) });
  }
  // A plane through three points is drawn as their triangle; any other as a square patch.
  if (P1.pts && !P2) prims.unshift({ k: "poly", ps: P1.pts.map(num), color: C.blue, fill: "#a5d8ff" });
  else prims.unshift({ k: "plane", n: num(P1.n), at: num(centre), color: C.blue, fill: "#a5d8ff", label: P2 ? namePlain(P1.name) : undefined });
  const scale = Math.max(1.5, ...prims.flatMap(anchors).map((q) => nlen(q))) * 0.35;
  prims.push({ k: "arrow", a: num(centre), b: nadd(num(centre), nunit(num(P1.n)), scale), color: C.blue, label: P2 ? "n₁" : "n", width: 2.2 });
  return finish(headerOf(P, cart(P1)), rows, prims, 3, caps);
}

// ---------- entry ----------

export function renderVectors(spec: VecSpec, w: VecWords): RenderedSvg {
  words = w;
  const P = parse(spec.src);
  switch (spec.topic) {
    case "basics":
      return renderBasics(P);
    case "dot":
      return renderDot(P);
    case "cross":
      return renderCross(P);
    case "lines":
      return renderLines(P);
    case "planes":
      return renderPlanes(P);
  }
}

const S = (topic: VecTopic, src: string): VecSpec => ({ topic, src });
export const VEC_PRESETS: { [K in VecTopic]: { label: string; spec: VecSpec }[] } = {
  basics: [
    { label: "a = (3, 1), b = (1, 2)", spec: S("basics", "a = (3, 1); b = (1, 2)") },
    { label: "2a − 3b", spec: S("basics", "a = (2, 1, -1); b = (1, -2, 3); 2a - 3b") },
    { label: "A(1, 2), B(4, 6)", spec: S("basics", "A(1, 2); B(4, 6)") },
    { label: "|a|, â", spec: S("basics", "a = (2, -1, 2)") },
    { label: "3i − 2j + 6k", spec: S("basics", "a = 3i - 2j + 6k") },
    { label: "AB + BC = AC", spec: S("basics", "A(1, 1); B(4, 2); C(2, 5); AB + BC") },
    { label: "b ∥ a", spec: S("basics", "a = (2, -1, 3); b = (-4, 2, -6)") },
  ],
  dot: [
    { label: "(3, 4)·(5, −2)", spec: S("dot", "a = (3, 4); b = (5, -2)") },
    { label: "(1, 2, 2)·(2, −1, 2)", spec: S("dot", "a = (1, 2, 2); b = (2, -1, 2)") },
    { label: "⟂: (2, 1, −1)·(1, 1, 3)", spec: S("dot", "a = (2, 1, -1); b = (1, 1, 3)") },
    { label: "60°", spec: S("dot", "a = (1, 1, 0); b = (0, 1, 1)") },
    { label: "∠ABC", spec: S("dot", "A(1, 0, 2); B(2, 1, 0); C(4, -1, 1)") },
  ],
  cross: [
    { label: "(1, 2, 3) × (4, 5, 6)", spec: S("cross", "a = (1, 2, 3); b = (4, 5, 6)") },
    { label: "(2, −1, 1) × (1, 3, −2)", spec: S("cross", "a = (2, -1, 1); b = (1, 3, -2)") },
    { label: "△ABC", spec: S("cross", "A(1, 0, 0); B(0, 2, 0); C(0, 0, 3)") },
    { label: "a·(b × c)", spec: S("cross", "a = (1, 2, 0); b = (0, 1, 3); c = (2, 0, 1)") },
    { label: "ABCD", spec: S("cross", "A(0, 0, 0); B(2, 0, 0); C(0, 3, 0); D(1, 1, 4)") },
  ],
  lines: [
    { label: "A(1, 2, 3), B(3, 1, 4)", spec: S("lines", "A(1, 2, 3); B(3, 1, 4)") },
    { label: "r = (1, 0, 2) + t(2, −1, 1); P", spec: S("lines", "r = (1, 0, 2) + t(2, -1, 1); P(4, 3, 1)") },
    { label: "meet", spec: S("lines", "r = (1, 2, 0) + t(1, -1, 2); r = (2, 4, 1) + s(0, 3, -1)") },
    { label: "skew", spec: S("lines", "r = (1, 0, 0) + t(1, 1, 0); r = (0, 1, 2) + s(1, 0, 1)") },
    { label: "(x − 1)/2 = (y + 1)/3 = z", spec: S("lines", "(x - 1)/2 = (y + 1)/3 = z") },
    { label: "2D: (1, 2) + t(3, 1); P(2, 6)", spec: S("lines", "r = (1, 2) + t(3, 1); P(2, 6)") },
    { label: "2D: meet", spec: S("lines", "r = (0, 1) + t(2, 1); r = (5, 0) + s(-1, 2)") },
  ],
  planes: [
    { label: "2x − y + 2z = 6; P(4, 1, 5)", spec: S("planes", "2x - y + 2z = 6; P(4, 1, 5)") },
    { label: "A, B, C", spec: S("planes", "A(1, 0, 0); B(0, 2, 0); C(0, 0, 3)") },
    { label: "A(1, 2, −1), n = (3, 1, 2)", spec: S("planes", "A(1, 2, -1); n = (3, 1, 2)") },
    { label: "r·(1, 1, 1) = 6; line", spec: S("planes", "r·(1, 1, 1) = 6; r = (1, 0, 0) + t(1, 2, 3)") },
    { label: "two planes", spec: S("planes", "x + y + z = 6; 2x - y + z = 3") },
    { label: "r = a + λu + μv", spec: S("planes", "r = (1, 1, 0) + λ(1, 0, 2) + μ(0, 1, -1)") },
  ],
};
