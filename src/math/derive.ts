// Differentiation, one rule at a time: from first principles (the limit of the difference quotient, for
// polynomials), by the rules (sum, constant multiple, power, product, quotient, chain and the standard derivatives)
// with every pending derivative (u)′ opened one level per line, the chain rule as a chain of layers
// dy/du · du/dv · dv/dx, tangents and normals at a point, and stationary points with the second-derivative test
// and a sign chart. A small symbolic engine (expression trees, a tidy-up and a simplifier) does the work; numbers are
// exact fractions, and every derivative is checked against a numerical one.
import { axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nf, r2, texLines, W, yRange, type Caption, type Frame, type TexLine } from "./chart";
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

let words: DerivWords;

// ---------- expressions ----------

type Fn = "sin" | "cos" | "tan" | "sec" | "csc" | "cot" | "ln" | "asin" | "acos" | "atan" | "sinh" | "cosh" | "tanh";
const FNS: Fn[] = ["sin", "cos", "tan", "sec", "csc", "cot", "ln", "asin", "acos", "atan", "sinh", "cosh", "tanh"];

export type E =
  | { k: "num"; v: Frac }
  | { k: "var"; name: string }
  | { k: "e" }
  | { k: "pi" }
  | { k: "add"; ts: E[] }
  | { k: "mul"; fs: E[] }
  | { k: "pow"; b: E; e: E }
  | { k: "fn"; f: Fn; a: E }
  | { k: "log"; base: Frac; a: E }
  | { k: "d"; a: E };

const F = (n: number, d = 1) => new Frac(n, d);
const N = (n: number | Frac, d = 1): E => ({ k: "num", v: typeof n === "number" ? F(n, d) : n });
const X: E = { k: "var", name: "x" };
const V = (name: string): E => ({ k: "var", name });
const E_: E = { k: "e" };
const add = (...ts: E[]): E => ({ k: "add", ts });
const mul = (...fs: E[]): E => ({ k: "mul", fs });
const pow = (b: E, e: E | number): E => ({ k: "pow", b, e: typeof e === "number" ? N(e) : e });
const neg = (a: E): E => mul(N(-1), a);
const sub = (a: E, b: E): E => add(a, neg(b));
const div = (a: E, b: E): E => mul(a, pow(b, -1));
const fn = (f: Fn, a: E): E => ({ k: "fn", f, a });
const D = (a: E): E => ({ k: "d", a });
const isNum = (e: E): e is { k: "num"; v: Frac } => e.k === "num";
const isN = (e: E, n: number) => isNum(e) && e.v.n === n && e.v.d === 1;

/** Does the expression contain the variable? */
function has(e: E, v = "x"): boolean {
  switch (e.k) {
    case "var":
      return e.name === v;
    case "num":
    case "e":
    case "pi":
      return false;
    case "add":
      return e.ts.some((t) => has(t, v));
    case "mul":
      return e.fs.some((f) => has(f, v));
    case "pow":
      return has(e.b, v) || has(e.e, v);
    default:
      return has(e.a, v);
  }
}

/** A structural key, for equality and for collecting like terms. */
function key(e: E): string {
  switch (e.k) {
    case "num":
      return `${e.v.n}/${e.v.d}`;
    case "var":
      return e.name;
    case "e":
      return "e";
    case "pi":
      return "π";
    case "add":
      return `(+ ${e.ts.map(key).join(" ")})`;
    case "mul":
      return `(* ${e.fs.map(key).join(" ")})`;
    case "pow":
      return `(^ ${key(e.b)} ${key(e.e)})`;
    case "fn":
      return `(${e.f} ${key(e.a)})`;
    case "log":
      return `(log${e.base.n}/${e.base.d} ${key(e.a)})`;
    case "d":
      return `(d ${key(e.a)})`;
  }
}
const same = (a: E, b: E) => key(a) === key(b);

/** The value at x (and at the other letters in env). */
export function evalE(e: E, x: number, env: Record<string, number> = {}): number {
  const R = (a: E) => evalE(a, x, env);
  switch (e.k) {
    case "num":
      return e.v.toNumber();
    case "var":
      return e.name === "x" ? x : env[e.name] ?? NaN;
    case "e":
      return Math.E;
    case "pi":
      return Math.PI;
    case "add":
      return e.ts.reduce((acc, t) => acc + R(t), 0);
    case "mul":
      return e.fs.reduce((acc, f) => acc * R(f), 1);
    case "pow": {
      const b = R(e.b);
      const p = R(e.e);
      // A real odd root of a negative number.
      if (b < 0 && isNum(e.e) && !e.e.v.isInt() && e.e.v.d % 2 === 1) return (e.e.v.n % 2 ? -1 : 1) * (-b) ** p;
      return b ** p;
    }
    case "fn": {
      const a = R(e.a);
      const f: Record<Fn, (t: number) => number> = {
        sin: Math.sin, cos: Math.cos, tan: Math.tan, sec: (t) => 1 / Math.cos(t), csc: (t) => 1 / Math.sin(t), cot: (t) => 1 / Math.tan(t),
        ln: Math.log, asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
      };
      return f[e.f](a);
    }
    case "log":
      return Math.log(R(e.a)) / Math.log(e.base.toNumber());
    case "d":
      return NaN;
  }
}

// ---------- parsing ----------

const NORMAL: [RegExp, string][] = [
  [/[−–]/g, "-"], [/[×·]/g, "*"], [/÷/g, "/"], [/²/g, "^2"], [/³/g, "^3"], [/π/g, "pi"], [/√/g, "sqrt"], [/∛/g, "cbrt"], [/,/g, "."],
  [/\barc(sin|cos|tan)\b/g, "a$1"], [/\b(sin|cos|tan)\^-1/g, "a$1"],
];
const NAMES = ["sqrt", "cbrt", "exp", "log", "pi", "asin", "acos", "atan", "sinh", "cosh", "tanh", ...FNS].sort((a, b) => b.length - a.length);

/** + − × ÷ ^, brackets, implicit products (2x, 3 sin x), functions with or without brackets (sin 2x, sin^2 x). */
export function parseE(src: string): E {
  const s = NORMAL.reduce((acc, [re, to]) => acc.replace(re, to), src).replace(/\s+/g, " ").trim();
  type Tok = { t: "num" | "id" | "op"; v: string };
  const toks: Tok[] = [];
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    if (c === " ") {
      i++;
      continue;
    }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (m) {
      toks.push({ t: "num", v: m[0] });
      i += m[0].length;
      continue;
    }
    if (/[a-z]/i.test(c)) {
      const name = NAMES.find((n) => s.slice(i, i + n.length).toLowerCase() === n);
      toks.push({ t: "id", v: name ?? c });
      i += name ? name.length : 1;
      continue;
    }
    if ("+-*/^()_[]{}".includes(c)) {
      toks.push({ t: "op", v: c === "[" || c === "{" ? "(" : c === "]" || c === "}" ? ")" : c });
      i++;
      continue;
    }
    throw new Error(fill(words.bad, { s: src.trim() }));
  }
  let i = 0;
  const bad = () => new Error(fill(words.bad, { s: src.trim() }));
  const peek = () => toks[i];
  const isOp = (v: string) => peek()?.t === "op" && peek().v === v;
  const isFn = (t?: Tok) => !!t && t.t === "id" && (FNS as string[]).concat(["sqrt", "cbrt", "exp", "log"]).includes(t.v);
  const startsAtom = () => {
    const p = peek();
    return !!p && (p.t === "num" || p.t === "id" || (p.t === "op" && p.v === "("));
  };
  const expr = (): E => {
    const ts: E[] = [term()];
    while (isOp("+") || isOp("-")) {
      const op = toks[i++].v;
      const t = term();
      ts.push(op === "+" ? t : neg(t));
    }
    return ts.length === 1 ? ts[0] : add(...ts);
  };
  const term = (): E => {
    let a = unary();
    for (;;) {
      if (isOp("*")) (i++, (a = mul(a, unary())));
      else if (isOp("/")) (i++, (a = div(a, unary())));
      else if (startsAtom()) a = mul(a, power());
      else return a;
    }
  };
  const unary = (): E => {
    if (isOp("-")) return i++, neg(unary());
    if (isOp("+")) return i++, unary();
    return power();
  };
  const power = (): E => {
    const b = atom();
    if (!isOp("^")) return b;
    i++;
    return pow(b, unary());
  };
  const group = (): E => {
    i++;
    const a = expr();
    if (!isOp(")")) throw bad();
    i++;
    return a;
  };
  /** The argument of a function written without brackets: sin 2x, ln x, sin x^2 — numbers, x, e, π only. */
  const bareArg = (): E => {
    let a = power();
    while (peek() && (peek().t === "num" || (peek().t === "id" && !isFn(peek())))) a = mul(a, power());
    return a;
  };
  const atom = (): E => {
    const p = peek();
    if (!p) throw bad();
    if (p.t === "op" && p.v === "(") return group();
    if (p.t === "num") {
      i++;
      const f = Frac.parse(p.v);
      if (!f) throw bad();
      return N(f);
    }
    if (p.t !== "id") throw bad();
    i++;
    if (p.v === "pi") return { k: "pi" };
    if (p.v === "e") return E_;
    if (isFn(p)) {
      // sin^2 x = (sin x)²
      let outer: E | null = null;
      if (isOp("^")) {
        i++;
        outer = unary();
      }
      let base: Frac | null = null;
      if (p.v === "log" && isOp("_")) {
        i++;
        const b = peek();
        if (b?.t !== "num") throw bad();
        i++;
        base = Frac.parse(b.v);
      }
      const arg = isOp("(") ? group() : bareArg();
      const body: E =
        p.v === "sqrt" ? pow(arg, N(1, 2))
        : p.v === "cbrt" ? pow(arg, N(1, 3))
        : p.v === "exp" ? pow(E_, arg)
        : p.v === "log" ? { k: "log", base: base ?? F(10), a: arg }
        : fn(p.v as Fn, arg);
      return outer ? pow(body, outer) : body;
    }
    if (p.v !== "x") throw new Error(words.onlyX);
    return X;
  };
  if (!toks.length) throw bad();
  const e = expr();
  if (i < toks.length) throw bad();
  return e;
}

// ---------- LaTeX ----------

const FN_TEX: Record<Fn, string> = {
  sin: "\\sin", cos: "\\cos", tan: "\\tan", sec: "\\sec", csc: "\\csc", cot: "\\cot", ln: "\\ln",
  asin: "\\arcsin", acos: "\\arccos", atan: "\\arctan", sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh",
};
const expTex = (f: Frac) => (f.isInt() ? `${f.n}` : `${f.n}/${f.d}`);
/** Order of factors on the page: number, x and its powers, constants, functions, brackets. */
function rank(e: E): number {
  if (e.k === "num") return 0;
  if (e.k === "var" || (e.k === "pow" && e.b.k === "var")) return 1;
  if (e.k === "pi" || (e.k === "pow" && (e.b.k === "e" || e.b.k === "pi" || e.b.k === "num")) || e.k === "e") return 2;
  if (e.k === "fn" || e.k === "log" || (e.k === "pow" && (e.b.k === "fn" || e.b.k === "log"))) return 3;
  if (e.k === "d") return 5;
  return 4;
}
/** A product's coefficient and its factors above and below the line. */
function splitMul(e: E): { c: Frac; top: E[]; bottom: E[] } {
  const fs = e.k === "mul" ? e.fs : [e];
  let c = F(1);
  const top: E[] = [];
  const bottom: E[] = [];
  for (const f of fs) {
    if (isNum(f)) c = c.mul(f.v);
    else if (f.k === "pow" && isNum(f.e) && f.e.v.isNeg()) bottom.push(f.e.v.isInt() && f.e.v.n === -1 ? f.b : pow(f.b, N(f.e.v.neg())));
    else top.push(f);
  }
  return { c, top, bottom };
}
/** Is this term written with a leading minus? */
function negative(e: E): boolean {
  if (isNum(e)) return e.v.isNeg();
  if (e.k === "mul") return splitMul(e).c.isNeg();
  return false;
}
export function tex(e: E): string {
  switch (e.k) {
    case "num":
      return e.v.tex();
    case "var":
      return e.name;
    case "e":
      return "e";
    case "pi":
      return "\\pi";
    case "add":
      return e.ts
        .map((t, i) => {
          if (negative(t)) {
            const p = simpNeg(t);
            return `${i ? "- " : "-"}${p.k === "add" ? `\\left(${tex(p)}\\right)` : tex(p)}`;
          }
          return i ? `+ ${tex(t)}` : tex(t);
        })
        .join(" ");
    case "mul": {
      const { c, top, bottom } = splitMul(e);
      const sign = c.isNeg() ? "-" : "";
      const a = c.abs();
      const inFrac = bottom.length > 0 || a.d !== 1;
      const join = (fs: E[], k: number) => {
        // While a (u)′ is still open, keep the order the rule wrote; otherwise number, x, functions, brackets.
        const ordered = fs.some((f) => f.k === "d") ? fs : [...fs].sort((p, q) => rank(p) - rank(q));
        // A lone sum above or below a fraction line needs no brackets.
        const parts = ordered.map((f) => (inFrac && ordered.length === 1 && k === 1 ? tex(f) : factorTex(f)));
        if (k !== 1 || !parts.length) parts.unshift(String(k));
        // Two numbers side by side need a dot, and so does x after a function (sin x · x).
        return parts.reduce((acc, p, j) => (j === 0 ? p : /^[\d.]/.test(p) || (/^[a-z]/.test(p) && /^\\[a-z]+ [a-z]$/.test(parts[j - 1])) ? `${acc} \\cdot ${p}` : `${acc} ${p}`), "");
      };
      if (!bottom.length && a.d === 1) return sign + join(top, a.n);
      return `${sign}\\frac{${join(top, a.n)}}{${join(bottom, a.d)}}`;
    }
    case "pow": {
      if (isNum(e.e)) {
        const p = e.e.v;
        if (p.isNeg()) return `\\frac{1}{${p.n === -1 && p.d === 1 ? tex(e.b) : tex(pow(e.b, N(p.neg())))}}`;
        if (p.n === 1 && p.d === 2) return `\\sqrt{${tex(e.b)}}`;
        if (p.n === 1 && p.d > 2) return `\\sqrt[${p.d}]{${tex(e.b)}}`;
        // sin²x
        if ((e.b.k === "fn" && e.b.f !== "ln") && p.isInt() && p.n > 0) return `${FN_TEX[e.b.f]}^{${p.n}} ${argTex(e.b.a)}`;
      }
      const b = e.b.k === "var" || e.b.k === "e" || e.b.k === "pi" || (isNum(e.b) && e.b.v.isInt() && !e.b.v.isNeg()) ? tex(e.b) : `\\left(${tex(e.b)}\\right)`;
      return `${b}^{${isNum(e.e) ? expTex(e.e.v) : tex(e.e)}}`;
    }
    case "fn":
      return `${FN_TEX[e.f]} ${argTex(e.a)}`;
    case "log":
      return `\\log_{${e.base.tex()}} ${argTex(e.a)}`;
    case "d":
      return `\\left(${tex(e.a)}\\right)'`;
  }
}
const argTex = (a: E) => (a.k === "var" || (isNum(a) && !a.v.isNeg() && a.v.isInt()) ? a.k === "var" ? a.name : tex(a) : `\\left(${tex(a)}\\right)`);
function factorTex(f: E): string {
  if (f.k === "add") return `\\left(${tex(f)}\\right)`;
  if (isNum(f) && (f.v.isNeg() || !f.v.isInt())) return `\\left(${tex(f)}\\right)`;
  return tex(f);
}
/** −t as a positive-looking term. */
function simpNeg(t: E): E {
  if (isNum(t)) return N(t.v.neg());
  const fs = (t as { fs: E[] }).fs;
  const c = fs.filter(isNum).reduce((acc, f) => acc.mul((f as { v: Frac }).v), F(1)).neg();
  const rest = fs.filter((f) => !isNum(f));
  if (!c.isOne()) return mul(N(c), ...rest);
  return rest.length === 1 ? rest[0] : mul(...rest);
}
/** For running text: an approximate value. */
const approx = (v: number) => nf(v, 4).replace("-", "−");

// ---------- tidying and simplifying ----------

/** Flatten, fold numbers, drop 0 terms and 1 factors — but keep the shape the rules produced. */
export function tidy(e: E): E {
  switch (e.k) {
    case "add": {
      const ts = e.ts.map(tidy).flatMap((t) => (t.k === "add" ? t.ts : [t])).filter((t) => !isN(t, 0));
      return ts.length === 0 ? N(0) : ts.length === 1 ? ts[0] : add(...ts);
    }
    case "mul": {
      const fs = e.fs.map(tidy).flatMap((f) => (f.k === "mul" ? f.fs : [f]));
      let c = F(1);
      const rest: E[] = [];
      for (const f of fs) if (isNum(f)) c = c.mul(f.v);
      else rest.push(f);
      if (c.isZero()) return N(0);
      if (!rest.length) return N(c);
      if (c.isOne() && rest.length === 1) return rest[0];
      return c.isOne() ? mul(...rest) : mul(N(c), ...rest);
    }
    case "pow": {
      const b = tidy(e.b);
      const p = tidy(e.e);
      if (isN(p, 0)) return N(1);
      if (isN(p, 1)) return b;
      if (isN(b, 1)) return N(1);
      if (isNum(b) && isNum(p) && p.v.isInt() && Math.abs(p.v.n) <= 12 && !(b.v.isZero() && p.v.n < 0)) return N(powFrac(b.v, p.v.n));
      // 1/x² is x⁻²: whole powers of powers multiply.
      if (b.k === "pow" && isNum(b.e) && b.e.v.isInt() && isNum(p)) return tidy(pow(b.b, N(b.e.v.mul(p.v))));
      return pow(b, p);
    }
    case "fn":
      return fn(e.f, tidy(e.a));
    case "log":
      return { ...e, a: tidy(e.a) };
    case "d":
      return D(tidy(e.a));
    default:
      return e;
  }
}
function powFrac(b: Frac, n: number): Frac {
  let r = F(1);
  for (let i = 0; i < Math.abs(n); i++) r = r.mul(b);
  if (Math.abs(r.n) > 1e12 || r.d > 1e12) throw new Error(words.tooBig);
  return n < 0 ? F(1).div(r) : r;
}

/** As a polynomial in x (coefficients from x⁰ up), or null. */
export function toPoly(e: E): Frac[] | null {
  const addP = (a: Frac[], b: Frac[]) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? F(0)).add(b[i] ?? F(0)));
  const mulP = (a: Frac[], b: Frac[]) => {
    const r = Array.from({ length: a.length + b.length - 1 }, () => F(0));
    a.forEach((x, i) => b.forEach((y, j) => (r[i + j] = r[i + j].add(x.mul(y)))));
    return r;
  };
  switch (e.k) {
    case "num":
      return [e.v];
    case "var":
      return e.name === "x" ? [F(0), F(1)] : null;
    case "add": {
      let r: Frac[] = [F(0)];
      for (const t of e.ts) {
        const p = toPoly(t);
        if (!p) return null;
        r = addP(r, p);
      }
      return r;
    }
    case "mul": {
      let r: Frac[] = [F(1)];
      for (const f of e.fs) {
        const p = toPoly(f);
        if (!p) return null;
        r = mulP(r, p);
      }
      return r;
    }
    case "pow": {
      if (!isNum(e.e) || !e.e.v.isInt() || e.e.v.n < 0 || e.e.v.n > 12) return null;
      const b = toPoly(e.b);
      if (!b) return null;
      let r: Frac[] = [F(1)];
      for (let i = 0; i < e.e.v.n; i++) r = mulP(r, b);
      return r;
    }
    default:
      return null;
  }
}
const pdeg = (p: Frac[]) => {
  let d = p.length - 1;
  while (d > 0 && p[d].isZero()) d--;
  return d;
};
export function fromPoly(p: Frac[]): E {
  const ts: E[] = [];
  for (let k = pdeg(p); k >= 0; k--) {
    const c = p[k] ?? F(0);
    if (c.isZero()) continue;
    const xs = k === 0 ? null : k === 1 ? X : pow(X, k);
    ts.push(!xs ? N(c) : c.isOne() ? xs : mul(N(c), xs));
  }
  // 1 − x² reads better than −x² + 1.
  if (ts.length === 2 && negative(ts[0]) && !negative(ts[1])) ts.reverse();
  return ts.length === 0 ? N(0) : ts.length === 1 ? ts[0] : add(...ts);
}

/** Collect like terms and equal bases, and write polynomial parts out in full (up to x⁴). */
export function simp(e0: E): E {
  const e = tidy(e0);
  switch (e.k) {
    case "add": {
      const ts = e.ts.map(simp).flatMap((t) => (t.k === "add" ? t.ts : [t]));
      // c·rest grouped by rest.
      const groups = new Map<string, { c: Frac; rest: E }>();
      const order: string[] = [];
      for (const t of ts) {
        const { c, rest } = coefOf(t);
        const k = key(rest);
        if (!groups.has(k)) (groups.set(k, { c: F(0), rest }), order.push(k));
        groups.get(k)!.c = groups.get(k)!.c.add(c);
      }
      const out = order.map((k) => groups.get(k)!).filter((g) => !g.c.isZero()).map((g) => tidy(mul(N(g.c), g.rest)));
      const r = tidy(add(...out));
      const p = toPoly(r);
      return p && pdeg(p) <= 4 ? fromPoly(p) : r;
    }
    case "mul": {
      const fs = e.fs.map(simp).flatMap((f) => (f.k === "mul" ? f.fs : [f]));
      let c = F(1);
      const bases = new Map<string, { b: E; p: E[] }>();
      const order: string[] = [];
      for (const f of fs) {
        if (isNum(f)) {
          c = c.mul(f.v);
          continue;
        }
        const [b, p] = f.k === "pow" ? [f.b, f.e] : [f, N(1)];
        const k = key(b);
        if (!bases.has(k)) (bases.set(k, { b, p: [] }), order.push(k));
        bases.get(k)!.p.push(p);
      }
      if (c.isZero()) return N(0);
      const rest: E[] = [];
      for (const k of order) {
        const { b, p } = bases.get(k)!;
        const s = simp(pow(b, p.length === 1 ? p[0] : add(...p)));
        if (isNum(s)) c = c.mul(s.v);
        else if (s.k === "mul") for (const f of s.fs) isNum(f) ? (c = c.mul(f.v)) : rest.push(f);
        else rest.push(s);
      }
      // A number times one bracket: share it out, 3(2x + 1) = 6x + 3.
      if (rest.length === 1 && rest[0].k === "add" && !c.isOne()) return simp(add(...rest[0].ts.map((t) => mul(N(c), t))));
      const r = tidy(mul(N(c), ...rest));
      return r;
    }
    case "pow": {
      const b = simp(e.b);
      const p = simp(e.e);
      if (isN(p, 0)) return N(1);
      if (isN(p, 1)) return b;
      if (isNum(b) && isNum(p)) {
        if (p.v.isInt() && Math.abs(p.v.n) <= 12) return N(powFrac(b.v, p.v.n));
        const r = rootFrac(b.v, p.v.d);
        if (r) return simp(pow(N(r), N(p.v.n)));
      }
      // (aᵐ)ⁿ = aᵐⁿ for number powers; (ab)ⁿ = aⁿbⁿ for whole n.
      if (b.k === "pow" && isNum(b.e) && isNum(p) && (p.v.isInt() || b.e.v.isInt())) return simp(pow(b.b, N(b.e.v.mul(p.v))));
      if (b.k === "mul" && isNum(p) && p.v.isInt()) return simp(mul(...b.fs.map((f) => pow(f, p))));
      // e^(ln u) = u
      if (b.k === "e" && p.k === "fn" && p.f === "ln") return p.a;
      return pow(b, p);
    }
    case "fn": {
      const a = simp(e.a);
      if (isN(a, 0) && (e.f === "sin" || e.f === "tan" || e.f === "asin" || e.f === "atan" || e.f === "sinh" || e.f === "tanh")) return N(0);
      if (isN(a, 0) && (e.f === "cos" || e.f === "cosh")) return N(1);
      // sin and cos at whole multiples of π/2.
      const k = piMultiple(a);
      if (k && k.mul(F(2)).isInt() && (e.f === "sin" || e.f === "cos")) {
        const q = ((k.mul(F(2)).n % 4) + 4 + (e.f === "cos" ? 1 : 0)) % 4; // sin(qπ/2): 0, 1, 0, −1
        return N([0, 1, 0, -1][q]);
      }
      if (e.f === "ln" && isN(a, 1)) return N(0);
      if (e.f === "ln" && a.k === "e") return N(1);
      if (e.f === "ln" && a.k === "pow" && a.b.k === "e") return a.e;
      return fn(e.f, a);
    }
    case "log":
      return { ...e, a: simp(e.a) };
    default:
      return e;
  }
}
/** k when e is k·π for a rational k. */
function piMultiple(e: E): Frac | null {
  if (e.k === "pi") return F(1);
  if (isN(e, 0)) return F(0);
  if (e.k === "mul" && e.fs.length === 2 && isNum(e.fs[0]) && e.fs[1].k === "pi") return e.fs[0].v;
  return null;
}
function coefOf(t: E): { c: Frac; rest: E } {
  if (isNum(t)) return { c: t.v, rest: N(1) };
  if (t.k === "mul") {
    let c = F(1);
    const rest = t.fs.filter((f) => (isNum(f) ? ((c = c.mul(f.v)), false) : true));
    return { c, rest: rest.length === 1 ? rest[0] : mul(...rest) };
  }
  return { c: F(1), rest: t };
}
function rootFrac(v: Frac, k: number): Frac | null {
  const r = (n: number): number | null => {
    if (n < 0) {
      if (k % 2 === 0) return null;
      const q = r(-n);
      return q === null ? null : -q;
    }
    const g = Math.round(n ** (1 / k));
    for (const c of [g - 1, g, g + 1]) if (c >= 0 && c ** k === n) return c;
    return null;
  };
  const n = r(v.n);
  const d = r(v.d);
  return n === null || d === null ? null : F(n, d);
}

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
    rows.push({ tex: `= ${tex(cur)}`, op: names.slice(0, 3).map((r) => words.rules[r]).join(", ") });
  }
  const result = simp(simp(cur));
  if (key(result) !== key(cur)) rows.push({ tex: `= ${tex(result)}`, op: words.simplify });
  return { rows, result, used: RULE_ORDER.filter((r) => used.has(r) && r !== "const") };
}
/** Just the simplified derivative. */
const derive = (f: E) => differentiate(f).result;

/** Replace the letter `from` by an expression. */
function substitute(e: E, from: string, to: E): E {
  switch (e.k) {
    case "var":
      return e.name === from ? to : e;
    case "add":
      return add(...e.ts.map((t) => substitute(t, from, to)));
    case "mul":
      return mul(...e.fs.map((f) => substitute(f, from, to)));
    case "pow":
      return pow(substitute(e.b, from, to), substitute(e.e, from, to));
    case "fn":
      return fn(e.f, substitute(e.a, from, to));
    case "log":
      return { ...e, a: substitute(e.a, from, to) };
    case "d":
      return D(substitute(e.a, from, to));
    default:
      return e;
  }
}

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
  return { text: fill(words.check, { x, n: approx(n), d: approx(evalE(d, x)) }), color: C.green };
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

/** a + b√s, exactly (s free of squares; s = 1 means b = 0). */
type QS = { a: Frac; b: Frac; s: number };
const qs = (a: Frac, b = F(0), s = 1): QS => (s === 0 || b.isZero() ? { a, b: F(0), s: 1 } : s === 1 ? { a: a.add(b), b: F(0), s: 1 } : { a, b, s });
const qsAdd = (x: QS, y: QS): QS => qs(x.a.add(y.a), x.b.add(y.b), x.s === 1 ? y.s : x.s);
const qsMul = (x: QS, y: QS): QS => {
  const s = x.s === 1 ? y.s : x.s;
  return qs(x.a.mul(y.a).add(x.b.mul(y.b).mul(F(s))), x.a.mul(y.b).add(x.b.mul(y.a)), s);
};
const qsNum = (x: QS) => x.a.toNumber() + x.b.toNumber() * Math.sqrt(x.s);
const peval = (p: Frac[], x: QS) => p.reduceRight<QS>((acc, c) => qsAdd(qsMul(acc, x), qs(c)), qs(F(0)));
function qsTex(x: QS): string {
  if (x.b.isZero() || x.s === 1) return x.a.tex();
  const den = (x.a.d * x.b.d) / gcd(x.a.d, x.b.d);
  const [A, B] = [x.a.mul(F(den)).n, x.b.mul(F(den)).n];
  const root = `${Math.abs(B) === 1 ? "" : Math.abs(B)}\\sqrt{${x.s}}`;
  const top = A === 0 ? `${B < 0 ? "-" : ""}${root}` : `${A} ${B < 0 ? "-" : "+"} ${root}`;
  return den === 1 ? top : `\\frac{${top}}{${den}}`;
}
const qsPlain = (x: QS) => minus(qsTex(x).replace(/\\frac\{(.+)\}\{(\d+)\}/, "($1)/$2").replace(/\\sqrt\{(\d+)\}/g, "√$1").replace(/\\/g, ""));
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
/** √v = out·√s. */
function sqrtSplit(v: Frac): { out: Frac; s: number } {
  let n = v.n * v.d;
  let out = 1;
  for (let p = 2; p * p <= n; p++) while (n % (p * p) === 0) (n /= p * p), (out *= p);
  return { out: F(out, v.d), s: n };
}
/** Real roots of a polynomial of degree ≤ 3: exact (rational root theorem + formula) or, failing that, numbers. */
function rootsOf(p0: Frac[]): { exact: QS[] } | { approx: number[] } {
  let p = p0.slice(0, pdeg(p0) + 1);
  const exact: QS[] = [];
  if (p.length === 4) {
    const lcm = p.reduce((acc, c) => (acc * c.d) / gcd(acc, c.d), 1);
    const ints = p.map((c) => c.mul(F(lcm)).n);
    const divisors = (n: number) => {
      n = Math.abs(n);
      const out: number[] = [];
      for (let i = 1; i <= Math.min(n, 1e5); i++) if (n % i === 0) out.push(i);
      return out;
    };
    let root: Frac | null = ints[0] === 0 ? F(0) : null;
    if (!root)
      outer: for (const a of divisors(ints[0]))
        for (const b of divisors(ints[3]))
          for (const sg of [1, -1]) {
            const r = F(sg * a, b);
            if (peval(p, qs(r)).a.isZero() && peval(p, qs(r)).b.isZero()) {
              root = r;
              break outer;
            }
          }
    if (!root) {
      // No rational root: bisection between the turning points of the cubic.
      const f = (x: number) => p.reduceRight((acc, c) => acc * x + c.toNumber(), 0);
      const d = [p[1].toNumber(), 2 * p[2].toNumber(), 3 * p[3].toNumber()];
      const disc = d[1] ** 2 - 4 * d[2] * d[0];
      const B = 1 + Math.max(...p.slice(0, 3).map((c) => Math.abs(c.toNumber() / p[3].toNumber())));
      const cuts = [-B, ...(disc > 0 ? [(-d[1] - Math.sqrt(disc)) / (2 * d[2]), (-d[1] + Math.sqrt(disc)) / (2 * d[2])].sort((a, b) => a - b) : []), B];
      const out: number[] = [];
      for (let i = 0; i + 1 < cuts.length; i++) {
        let [lo, hi] = [cuts[i], cuts[i + 1]];
        if (f(lo) * f(hi) > 0) continue;
        for (let k = 0; k < 200; k++) {
          const mid = (lo + hi) / 2;
          if (f(lo) * f(mid) <= 0) hi = mid;
          else lo = mid;
        }
        out.push((lo + hi) / 2);
      }
      return { approx: out };
    }
    exact.push(qs(root));
    // Divide by (x − root).
    const q: Frac[] = [];
    let carry = F(0);
    for (let i = 3; i >= 1; i--) {
      carry = carry.mul(root).add(p[i]);
      q.unshift(carry);
    }
    p = q;
  }
  if (p.length === 3) {
    const [c, b, a] = p;
    const D2 = b.mul(b).sub(F(4).mul(a).mul(c));
    if (!D2.isNeg()) {
      const { out, s } = sqrtSplit(D2);
      const two = a.mul(F(2));
      for (const sg of [-1, 1]) exact.push(qs(b.neg().div(two), out.mul(F(sg)).div(two), s));
    }
  } else if (p.length === 2) exact.push(qs(p[0].neg().div(p[1])));
  const seen = new Set<string>();
  return {
    exact: exact
      .filter((r) => {
        const k2 = `${r.a.n}/${r.a.d}+${r.b.n}/${r.b.d}√${r.s}`;
        return seen.has(k2) ? false : (seen.add(k2), true);
      })
      .sort((x, y) => qsNum(x) - qsNum(y)),
  };
}

function renderStationary(s: DerivSpec, w: DerivWords): RenderedSvg {
  const Sw = w.stat;
  const f = parseE(s.src);
  const p = toPoly(f);
  if (!p || pdeg(p) < 2 || pdeg(p) > 4) throw new Error(w.needPoly);
  const d1 = p.map((c, k) => c.mul(F(k))).slice(1);
  const d2 = d1.map((c, k) => c.mul(F(k))).slice(1);
  const rows: TexLine[] = [{ tex: `f'(x) = ${tex(fromPoly(d1))}`, op: Sw.derivative }];
  const found = rootsOf(d1);
  type St = { x: number; xTex: string; xPlain: string; y: number; yTex: string; kind: "max" | "min" | "inflection" };
  const pts: St[] = [];
  const caps: Caption[] = [];
  const classify = (x: number, d2v: number): St["kind"] => {
    if (Math.abs(d2v) > 1e-12) return d2v < 0 ? "max" : "min";
    const fd = (t: number) => d1.reduceRight((acc, c) => acc * t + c.toNumber(), 0);
    const [l, r] = [fd(x - 1e-3), fd(x + 1e-3)];
    return l > 0 && r < 0 ? "max" : l < 0 && r > 0 ? "min" : "inflection";
  };
  if ("exact" in found) {
    if (!found.exact.length) rows.push({ tex: `f'(x) = 0`, op: Sw.none, color: C.red });
    else {
      rows.push({ tex: `f'(x) = 0 \\;\\Rightarrow\\; ${found.exact.map((r) => `x = ${qsTex(r)}`).join(", \\; ")}`, op: Sw.solve });
      rows.push({ tex: `f''(x) = ${tex(fromPoly(d2))}`, op: Sw.second });
      for (const r of found.exact) {
        const v2 = peval(d2, r);
        const fy = peval(p, r);
        const kind = classify(qsNum(r), qsNum(v2));
        const sign = Math.abs(qsNum(v2)) < 1e-12 ? "= 0" : qsNum(v2) > 0 ? "> 0" : "< 0";
        pts.push({ x: qsNum(r), xTex: qsTex(r), xPlain: qsPlain(r), y: qsNum(fy), yTex: qsTex(fy), kind });
        rows.push({
          tex: `f''\\left(${qsTex(r)}\\right) = ${qsTex(v2)} ${sign === "= 0" ? "" : sign}, \\quad f\\left(${qsTex(r)}\\right) = ${qsTex(fy)}`,
          op: sign === "= 0" ? `${Sw.flat}: ${Sw[kind]}` : Sw[kind],
          color: kind === "max" ? C.red : kind === "min" ? C.green : C.purple,
        });
      }
    }
  } else {
    rows.push({ tex: `f'(x) = 0 \\;\\Rightarrow\\; ${found.approx.map((r) => `x \\approx ${approx(r).replace("−", "-")}`).join(", \\; ")}`, op: Sw.approx });
    rows.push({ tex: `f''(x) = ${tex(fromPoly(d2))}`, op: Sw.second });
    for (const x of found.approx) {
      const v2 = d2.reduceRight((acc, c) => acc * x + c.toNumber(), 0);
      const fy = p.reduceRight((acc, c) => acc * x + c.toNumber(), 0);
      const kind = classify(x, v2);
      pts.push({ x, xTex: approx(x).replace("−", "-"), xPlain: approx(x), y: fy, yTex: approx(fy).replace("−", "-"), kind });
      rows.push({ tex: `f''(${approx(x).replace("−", "-")}) \\approx ${approx(v2).replace("−", "-")}, \\quad f \\approx ${approx(fy).replace("−", "-")}`, op: Sw[kind], color: kind === "max" ? C.red : kind === "min" ? C.green : C.purple });
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
  const f = parseE(src);
  const r = differentiate(f);
  return { f, d: r.result, lines: r.rows.map((row) => row.tex) };
}
