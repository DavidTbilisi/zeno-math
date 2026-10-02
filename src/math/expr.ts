// A small engine for expressions in x: trees (sums, products, powers, functions), a parser that reads what pupils
// type (2x, sin^2 x, sqrt(x), e^(2x), log_2(x)), LaTeX that reads like a textbook, a tidy-up that keeps the shape
// of a step and a simplifier that collects like terms, plus exact numbers a + b√s and the real roots of
// polynomials. The Derivatives and Applied calculus tools are built on it.
import { fill, nf } from "./chart";
import { Frac } from "./fraction";

/** Error messages, in the language of the tool that is rendering. */
export type ExprMessages = { bad: string; onlyX: string; tooBig: string };
let msgs: ExprMessages = { bad: "Could not read “{s}”.", onlyX: "Use x as the variable.", tooBig: "The numbers got too large." };
export function exprMessages(m: ExprMessages) {
  msgs = m;
}
export const minus = (t: string) => t.replace(/-/g, "−");

// ---------- expressions ----------

export type Fn = "sin" | "cos" | "tan" | "sec" | "csc" | "cot" | "ln" | "asin" | "acos" | "atan" | "sinh" | "cosh" | "tanh";
export const FNS: Fn[] = ["sin", "cos", "tan", "sec", "csc", "cot", "ln", "asin", "acos", "atan", "sinh", "cosh", "tanh"];

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

export const F = (n: number, d = 1) => new Frac(n, d);
export const N = (n: number | Frac, d = 1): E => ({ k: "num", v: typeof n === "number" ? F(n, d) : n });
export const X: E = { k: "var", name: "x" };
export const V = (name: string): E => ({ k: "var", name });
export const E_: E = { k: "e" };
export const add = (...ts: E[]): E => ({ k: "add", ts });
export const mul = (...fs: E[]): E => ({ k: "mul", fs });
export const pow = (b: E, e: E | number): E => ({ k: "pow", b, e: typeof e === "number" ? N(e) : e });
export const neg = (a: E): E => mul(N(-1), a);
export const sub = (a: E, b: E): E => add(a, neg(b));
export const div = (a: E, b: E): E => mul(a, pow(b, -1));
export const fn = (f: Fn, a: E): E => ({ k: "fn", f, a });
export const D = (a: E): E => ({ k: "d", a });
export const isNum = (e: E): e is { k: "num"; v: Frac } => e.k === "num";
export const isN = (e: E, n: number) => isNum(e) && e.v.n === n && e.v.d === 1;

/** Does the expression contain the variable? */
export function has(e: E, v = "x"): boolean {
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
export function key(e: E): string {
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
export const same = (a: E, b: E) => key(a) === key(b);

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

export const NORMAL: [RegExp, string][] = [
  [/[−–]/g, "-"], [/[×·]/g, "*"], [/÷/g, "/"], [/²/g, "^2"], [/³/g, "^3"], [/π/g, "pi"], [/√/g, "sqrt"], [/∛/g, "cbrt"], [/,/g, "."],
  [/\barc(sin|cos|tan)\b/g, "a$1"], [/\b(sin|cos|tan)\^-1/g, "a$1"],
];
export const NAMES = ["sqrt", "cbrt", "exp", "log", "pi", "asin", "acos", "atan", "sinh", "cosh", "tanh", ...FNS].sort((a, b) => b.length - a.length);

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
    throw new Error(fill(msgs.bad, { s: src.trim() }));
  }
  let i = 0;
  const bad = () => new Error(fill(msgs.bad, { s: src.trim() }));
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
    if (p.v !== "x") throw new Error(msgs.onlyX);
    return X;
  };
  if (!toks.length) throw bad();
  const e = expr();
  if (i < toks.length) throw bad();
  return e;
}

// ---------- LaTeX ----------

export const FN_TEX: Record<Fn, string> = {
  sin: "\\sin", cos: "\\cos", tan: "\\tan", sec: "\\sec", csc: "\\csc", cot: "\\cot", ln: "\\ln",
  asin: "\\arcsin", acos: "\\arccos", atan: "\\arctan", sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh",
};
export const expTex = (f: Frac) => (f.isInt() ? `${f.n}` : `${f.n}/${f.d}`);
/** Order of factors on the page: number, x and its powers, constants, functions, brackets. */
export function rank(e: E): number {
  if (e.k === "num") return 0;
  if (e.k === "var" || (e.k === "pow" && e.b.k === "var")) return 1;
  if (e.k === "pi" || (e.k === "pow" && (e.b.k === "e" || e.b.k === "pi" || e.b.k === "num")) || e.k === "e") return 2;
  if (e.k === "fn" || e.k === "log" || (e.k === "pow" && (e.b.k === "fn" || e.b.k === "log"))) return 3;
  if (e.k === "d") return 5;
  return 4;
}
/** A product's coefficient and its factors above and below the line. */
export function splitMul(e: E): { c: Frac; top: E[]; bottom: E[] } {
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
export function negative(e: E): boolean {
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
export const argTex = (a: E) => (a.k === "var" || (isNum(a) && !a.v.isNeg() && a.v.isInt()) ? a.k === "var" ? a.name : tex(a) : `\\left(${tex(a)}\\right)`);
export function factorTex(f: E): string {
  if (f.k === "add") return `\\left(${tex(f)}\\right)`;
  if (isNum(f) && (f.v.isNeg() || !f.v.isInt())) return `\\left(${tex(f)}\\right)`;
  return tex(f);
}
/** −t as a positive-looking term. */
export function simpNeg(t: E): E {
  if (isNum(t)) return N(t.v.neg());
  const fs = (t as { fs: E[] }).fs;
  const c = fs.filter(isNum).reduce((acc, f) => acc.mul((f as { v: Frac }).v), F(1)).neg();
  const rest = fs.filter((f) => !isNum(f));
  if (!c.isOne()) return mul(N(c), ...rest);
  return rest.length === 1 ? rest[0] : mul(...rest);
}
/** For running text: an approximate value. */
export const approx = (v: number) => nf(v, 4).replace("-", "−");

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
export function powFrac(b: Frac, n: number): Frac {
  let r = F(1);
  for (let i = 0; i < Math.abs(n); i++) r = r.mul(b);
  if (Math.abs(r.n) > 1e12 || r.d > 1e12) throw new Error(msgs.tooBig);
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
export const pdeg = (p: Frac[]) => {
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
      // (eˣ)² = e^(2x): a whole power of a power multiplies the exponents.
      if (b.k === "pow" && isNum(p) && p.v.isInt()) return simp(pow(b.b, mul(b.e, p)));
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
export function piMultiple(e: E): Frac | null {
  if (e.k === "pi") return F(1);
  if (isN(e, 0)) return F(0);
  if (e.k === "mul" && e.fs.length === 2 && isNum(e.fs[0]) && e.fs[1].k === "pi") return e.fs[0].v;
  return null;
}
export function coefOf(t: E): { c: Frac; rest: E } {
  if (isNum(t)) return { c: t.v, rest: N(1) };
  if (t.k === "mul") {
    let c = F(1);
    const rest = t.fs.filter((f) => (isNum(f) ? ((c = c.mul(f.v)), false) : true));
    return { c, rest: rest.length === 1 ? rest[0] : mul(...rest) };
  }
  return { c: F(1), rest: t };
}
export function rootFrac(v: Frac, k: number): Frac | null {
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


/** Replace the letter `from` by an expression. */
export function substitute(e: E, from: string, to: E): E {
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


/** a + b√s, exactly (s free of squares; s = 1 means b = 0). */
export type QS = { a: Frac; b: Frac; s: number };
export const qs = (a: Frac, b = F(0), s = 1): QS => (s === 0 || b.isZero() ? { a, b: F(0), s: 1 } : s === 1 ? { a: a.add(b), b: F(0), s: 1 } : { a, b, s });
export const qsAdd = (x: QS, y: QS): QS => qs(x.a.add(y.a), x.b.add(y.b), x.s === 1 ? y.s : x.s);
export const qsMul = (x: QS, y: QS): QS => {
  const s = x.s === 1 ? y.s : x.s;
  return qs(x.a.mul(y.a).add(x.b.mul(y.b).mul(F(s))), x.a.mul(y.b).add(x.b.mul(y.a)), s);
};
export const qsNum = (x: QS) => x.a.toNumber() + x.b.toNumber() * Math.sqrt(x.s);
export const peval = (p: Frac[], x: QS) => p.reduceRight<QS>((acc, c) => qsAdd(qsMul(acc, x), qs(c)), qs(F(0)));
export function qsTex(x: QS): string {
  if (x.b.isZero() || x.s === 1) return x.a.tex();
  const den = (x.a.d * x.b.d) / gcd(x.a.d, x.b.d);
  const [A, B] = [x.a.mul(F(den)).n, x.b.mul(F(den)).n];
  const root = `${Math.abs(B) === 1 ? "" : Math.abs(B)}\\sqrt{${x.s}}`;
  const top = A === 0 ? `${B < 0 ? "-" : ""}${root}` : `${A} ${B < 0 ? "-" : "+"} ${root}`;
  return den === 1 ? top : `\\frac{${top}}{${den}}`;
}
export const qsPlain = (x: QS) =>
  minus(
    qsTex(x)
      .replace(/\\frac\{(.+)\}\{(\d+)\}/, (_, top: string, d: string) => (/\s/.test(top) ? `(${top})/${d}` : `${top}/${d}`))
      .replace(/\\sqrt\{(\d+)\}/g, "√$1")
      .replace(/\\/g, ""),
  );
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
/** √v = out·√s. */
export function sqrtSplit(v: Frac): { out: Frac; s: number } {
  let n = v.n * v.d;
  let out = 1;
  for (let p = 2; p * p <= n; p++) while (n % (p * p) === 0) (n /= p * p), (out *= p);
  return { out: F(out, v.d), s: n };
}
/** Real roots of a polynomial: exact where possible (rational roots taken out one by one, then the quadratic formula
 *  with surds), and numbers for whatever is left of degree 3 or more without rational roots. */
export function realRoots(p0: Frac[]): { exact: QS[]; approx: number[] } {
  let p = p0.slice(0, pdeg(p0) + 1);
  if (p.length === 1) return { exact: [], approx: [] };
  const exact: QS[] = [];
  const divisors = (n: number) => {
    n = Math.abs(n);
    const out: number[] = [];
    for (let i = 1; i <= Math.min(n, 1e5); i++) if (n % i === 0) out.push(i);
    return out;
  };
  const isRoot = (r: Frac) => {
    const v = peval(p, qs(r));
    return v.a.isZero() && v.b.isZero();
  };
  // Rational roots: p/q with p dividing the constant and q the leading coefficient.
  while (p.length > 3) {
    const lcm = p.reduce((acc, c) => (acc * c.d) / gcd(acc, c.d), 1);
    const ints = p.map((c) => c.mul(new Frac(lcm)).n);
    let root: Frac | null = ints[0] === 0 ? new Frac(0) : null;
    if (!root)
      outer: for (const a of divisors(ints[0]))
        for (const b of divisors(ints[ints.length - 1]))
          for (const sg of [1, -1])
            if (isRoot(new Frac(sg * a, b))) {
              root = new Frac(sg * a, b);
              break outer;
            }
    if (!root) break;
    exact.push(qs(root));
    // Divide by (x − root).
    const q: Frac[] = [];
    let carry = new Frac(0);
    for (let i = p.length - 1; i >= 1; i--) {
      carry = carry.mul(root).add(p[i]);
      q.unshift(carry);
    }
    p = q;
  }
  const approx: number[] = [];
  if (p.length === 3) {
    const [c, b, a] = p;
    const D2 = b.mul(b).sub(new Frac(4).mul(a).mul(c));
    if (!D2.isNeg()) {
      const { out, s } = sqrtSplit(D2);
      const two = a.mul(new Frac(2));
      for (const sg of [-1, 1]) exact.push(qs(b.neg().div(two), out.mul(new Frac(sg)).div(two), s));
    }
  } else if (p.length === 2) exact.push(qs(p[0].neg().div(p[1])));
  else if (p.length > 3) approx.push(...numericRoots(p.map((c) => c.toNumber())));
  const seen = new Set<string>();
  return {
    exact: exact
      .filter((r) => {
        const k = `${r.a.n}/${r.a.d}+${r.b.n}/${r.b.d}√${r.s}`;
        return seen.has(k) ? false : (seen.add(k), true);
      })
      .sort((x, y) => qsNum(x) - qsNum(y)),
    approx,
  };
}

/** Real roots of a polynomial with number coefficients: between the turning points (found the same way), by bisection. */
export function numericRoots(c: number[]): number[] {
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-300) c = c.slice(0, -1);
  const n = c.length - 1;
  if (n < 1) return [];
  if (n === 1) return [-c[0] / c[1]];
  const f = (x: number) => c.reduceRight((acc, k) => acc * x + k, 0);
  const B = 1 + Math.max(...c.slice(0, n).map((k) => Math.abs(k / c[n])));
  const turns = numericRoots(c.slice(1).map((k, i) => k * (i + 1)));
  const cuts = [-B, ...turns.filter((t) => t > -B && t < B).sort((a, b) => a - b), B];
  const out: number[] = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    let [lo, hi] = [cuts[i], cuts[i + 1]];
    const [flo, fhi] = [f(lo), f(hi)];
    if (Math.abs(flo) < 1e-12 * Math.max(1, Math.abs(c[n]))) {
      if (!out.some((r) => Math.abs(r - lo) < 1e-9)) out.push(lo);
      continue;
    }
    if (flo * fhi > 0) continue;
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2;
      if (f(lo) * f(mid) <= 0) hi = mid;
      else lo = mid;
    }
    const r = (lo + hi) / 2;
    if (!out.some((x) => Math.abs(x - r) < 1e-9)) out.push(r);
  }
  if (Math.abs(f(B)) < 1e-12 && !out.some((x) => Math.abs(x - B) < 1e-9)) out.push(B);
  return out.sort((a, b) => a - b);
}
