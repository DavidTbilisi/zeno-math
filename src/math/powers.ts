// Powers, roots and logarithms, one step at a time: the index laws (with the factors drawn as chips that cancel),
// scientific notation (the decimal point hopping), surds (pairs of prime factors leaving the root, rationalising
// with the conjugate), logarithms (as "which power?", the laws, change of base, the graph mirrored in y = x) and
// exponential / logarithmic equations (a common base or taking logs; the domain check that throws out false roots).
// Arithmetic is exact wherever the answer is exact; an approximation is always marked ≈.
import { axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nf, r2, texLines, W, type Caption, type TexLine } from "./chart";
import type { RenderedSvg } from "./latex";

export type PowersTopic = "laws" | "sci" | "surds" | "logs" | "equations";
export const POWERS_TOPICS: PowersTopic[] = ["laws", "sci", "surds", "logs", "equations"];
export type PowersSpec = { topic: PowersTopic; src: string };

export type PowersWords = {
  bad: string;
  tooBig: string;
  divZero: string;
  check: string;
  approx: string;
  laws: {
    noSums: string;
    expNumber: string;
    negBase: string;
    zeroBase: string;
    product: string;
    quotient: string;
    powerProduct: string;
    powerQuotient: string;
    powerPower: string;
    rootPower: string;
    multiply: string;
    zero: string;
    negative: string;
    fracPower: string;
    numbers: string;
    signOdd: string;
    signEven: string;
    chips: string;
    chipsCancel: string;
    rootNote: string;
  };
  sci: {
    noLetters: string;
    zero: string;
    standard: string;
    ordinary: string;
    notStandard: string;
    adjust: string;
    mulRule: string;
    divRule: string;
    addRule: string;
    align: string;
    hopsLeft: string;
    hopsRight: string;
    hopsNone: string;
    rounded: string;
  };
  surds: {
    noLetters: string;
    negRoot: string;
    mixed: string;
    divHard: string;
    rootOfSurd: string;
    largest: string;
    largestCube: string;
    splitFrac: string;
    expand: string;
    multiplyRoots: string;
    collect: string;
    byRoot: string;
    byConj: string;
    denomSq: string;
    denomConj: string;
    denomCube: string;
    between: string;
    groups: string;
    groupsCube: string;
    outside: string;
    inside: string;
  };
  logs: {
    positive: string;
    base: string;
    form: string;
    powerRule: string;
    productRule: string;
    asPower: string;
    commonBase: string;
    changeBase: string;
    between: string;
    graph: string;
    mirror: string;
  };
  eq: {
    needEq: string;
    expForm: string;
    logForm: string;
    noX: string;
    linearOnly: string;
    divideBy: string;
    rewrite: string;
    equate: string;
    takeLog: string;
    takeLn: string;
    solve: string;
    noSolution: string;
    positive: string;
    every: string;
    domain: string;
    domainNote: string;
    combine: string;
    sameBase: string;
    toExp: string;
    expand: string;
    tooHigh: string;
    lnOne: string;
    valid: string;
    rejected: string;
    noneLeft: string;
    allRejected: string;
    discNeg: string;
  };
};

// ---------- exact rationals ----------

type Q = { n: number; d: number };
let words: PowersWords; // the words of the current render, for errors deep inside the arithmetic

const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
function q(n: number, d = 1): Q {
  if (d === 0) throw new Error(words.divZero);
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  const r = { n: n / g + 0, d: d / g };
  if (!Number.isSafeInteger(r.n) || !Number.isSafeInteger(r.d)) throw new Error(words.tooBig);
  return r;
}
const ZERO = q(0);
const ONE = q(1);
const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const neg = (a: Q) => q(-a.n, a.d);
const sub = (a: Q, b: Q) => add(a, neg(b));
const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
const isZero = (a: Q) => a.n === 0;
const eqQ = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
const num = (a: Q) => a.n / a.d;
const isInt = (a: Q) => a.d === 1;
const absQ = (a: Q) => q(Math.abs(a.n), a.d);
/** aᵏ for a whole k (negative k: the reciprocal). */
function qpow(a: Q, k: number): Q {
  if (Math.abs(k) > 200) throw new Error(words.tooBig);
  let r = ONE;
  for (let i = 0; i < Math.abs(k); i++) r = mul(r, a);
  return k < 0 ? div(ONE, r) : r;
}
/** The whole k-th root of n ≥ 0, or null. */
function iroot(n: number, k: number): number | null {
  const g = Math.round(n ** (1 / k));
  for (const c of [g - 1, g, g + 1]) if (c >= 0 && c ** k === n) return c;
  return null;
}
/** The exact rational k-th root of a, or null. */
function qroot(a: Q, k: number): Q | null {
  if (a.n < 0) {
    if (k % 2 === 0) return null;
    const r = qroot(neg(a), k);
    return r && neg(r);
  }
  const n = iroot(a.n, k);
  const d = iroot(a.d, k);
  return n === null || d === null ? null : q(n, d);
}

/** a/b in LaTeX, the sign in front. */
const texQ = (a: Q) => (a.d === 1 ? `${a.n}` : `${a.n < 0 ? "-" : ""}\\frac{${Math.abs(a.n)}}{${a.d}}`);
/** In an exponent: 2/3 rather than a tall fraction. */
const texExp = (a: Q) => (a.d === 1 ? `${a.n}` : `${a.n < 0 ? "-" : ""}${Math.abs(a.n)}/${a.d}`);
/** For running text: 3, −1/2. */
const plainQ = (a: Q) => `${a.n < 0 ? "−" : ""}${Math.abs(a.n)}${a.d === 1 ? "" : `/${a.d}`}`;
const minus = (s: string) => s.replace(/-/g, "−");
const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** 10⁻⁴ in running text. */
const tenTo = (n: number) => `10${[...String(n)].map((c) => (c === "-" ? "⁻" : SUPER[Number(c)])).join("")}`;
/** A rough value for captions. */
const approx = (v: number, digits = 4) => minus(nf(v, digits));

/** Prime factors of a whole number ≥ 1 (trial division, so keep it below ~10¹²). */
function factorize(n: number): [number, number][] {
  if (n > 1e12) throw new Error(words.tooBig);
  const out: [number, number][] = [];
  for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2)
    if (n % p === 0) {
      let a = 0;
      while (n % p === 0) (n /= p), a++;
      out.push([p, a]);
    }
  if (n > 1) out.push([n, 1]);
  return out;
}

// ---------- parsing ----------

export type Node =
  | { k: "num"; v: Q; src: string }
  | { k: "var"; name: string }
  | { k: "add"; a: Node; b: Node; op: "+" | "-" }
  | { k: "neg"; a: Node }
  | { k: "mul"; a: Node; b: Node; implicit: boolean }
  | { k: "div"; a: Node; b: Node }
  | { k: "pow"; a: Node; b: Node }
  | { k: "root"; n: number; a: Node }
  | { k: "log"; base: Node | null; ln: boolean; a: Node }
  | { k: "paren"; a: Node };

const NORMAL: [RegExp, string][] = [
  [/[−–]/g, "-"], [/[×·∙⋅]/g, "*"], [/÷/g, "/"], [/,/g, "."], [/√/g, " sqrt "], [/∛/g, " cbrt "], [/π/g, "pi"],
];
function normal(src: string): string {
  let s = NORMAL.reduce((acc, [re, to]) => acc.replace(re, to), src);
  // Runs of superscripts (x⁻², 10¹²) become ^(…).
  s = s.replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^(${[...m].map((c) => (c === "⁻" ? "-" : String(SUPER.indexOf(c)))).join("")})`);
  return s;
}

type Tok = { t: "num" | "id" | "op"; v: string };
const FUNCS = ["sqrt", "cbrt", "log", "ln", "lg", "pi"];
function tokenize(src: string): Tok[] {
  const s = normal(src);
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (m) {
      out.push({ t: "num", v: m[0] });
      i += m[0].length;
      continue;
    }
    if (/[a-z]/i.test(c)) {
      const f = FUNCS.find((name) => s.slice(i, i + name.length).toLowerCase() === name);
      const v = f ?? c;
      out.push({ t: "id", v: f ?? c });
      i += v.length;
      continue;
    }
    if ("+-*/^()_{}[]=<>".includes(c)) {
      out.push({ t: "op", v: c === "{" || c === "[" ? "(" : c === "}" || c === "]" ? ")" : c });
      i++;
      continue;
    }
    throw new Error(fill(words.bad, { s: src.trim() }));
  }
  return out;
}

function decimalQ(src: string): Q {
  const [whole, frac = ""] = src.split(".");
  return q(Number(whole + frac || "0"), 10 ** frac.length);
}

/** Recursive descent over + − × ÷ ^, brackets, implicit products (2x, 3√2, 2log₃ 6), √ ∛ log ln. */
export function parseExpr(src: string): Node {
  const toks = tokenize(src);
  let i = 0;
  const bad = () => new Error(fill(words.bad, { s: src.trim() }));
  const peek = () => toks[i];
  const isOp = (v: string) => peek()?.t === "op" && peek().v === v;
  const startsAtom = () => {
    const p = peek();
    return !!p && (p.t === "num" || p.t === "id" || (p.t === "op" && p.v === "("));
  };
  const expr = (): Node => {
    let a = term();
    while (isOp("+") || isOp("-")) {
      const op = toks[i++].v as "+" | "-";
      a = { k: "add", a, b: term(), op };
    }
    return a;
  };
  const term = (): Node => {
    let a = unary();
    for (;;) {
      if (isOp("*")) {
        i++;
        a = { k: "mul", a, b: unary(), implicit: false };
      } else if (isOp("/")) {
        i++;
        a = { k: "div", a, b: unary() };
      } else if (startsAtom()) a = { k: "mul", a, b: power(), implicit: true };
      else return a;
    }
  };
  const unary = (): Node => {
    if (isOp("-")) return i++, { k: "neg", a: unary() };
    if (isOp("+")) return i++, unary();
    return power();
  };
  const power = (): Node => {
    const a = atom();
    if (!isOp("^")) return a;
    i++;
    return { k: "pow", a, b: unary() };
  };
  const group = (): Node => {
    i++;
    const a = expr();
    if (!isOp(")")) throw bad();
    i++;
    return a;
  };
  const atom = (): Node => {
    const p = peek();
    if (!p) throw bad();
    if (p.t === "op" && p.v === "(") return { k: "paren", a: group() };
    if (p.t === "num") {
      i++;
      return { k: "num", v: decimalQ(p.v), src: p.v };
    }
    if (p.t !== "id") throw bad();
    i++;
    if (p.v === "sqrt" || p.v === "cbrt") return { k: "root", n: p.v === "sqrt" ? 2 : 3, a: isOp("(") ? group() : power() };
    if (p.v === "log" || p.v === "ln" || p.v === "lg") {
      let base: Node | null = null;
      if (p.v === "log" && isOp("_")) {
        i++;
        const b = peek();
        if (b?.t === "op" && b.v === "(") base = group();
        else if (b?.t === "num") (i++, (base = { k: "num", v: decimalQ(b.v), src: b.v }));
        else if (b?.t === "id" && b.v.length === 1) (i++, (base = { k: "var", name: b.v }));
        else throw bad();
      }
      const a = isOp("(") ? group() : power();
      return { k: "log", base, ln: p.v === "ln", a };
    }
    return { k: "var", name: p.v };
  };
  if (!toks.length) throw bad();
  const n = expr();
  if (i < toks.length) throw bad();
  return n;
}

/** Splits at one "=". */
function splitEq(src: string): [string, string] | null {
  const parts = src.split("=");
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

const strip = (n: Node): Node => (n.k === "paren" ? strip(n.a) : n);

// ---------- LaTeX of what was typed ----------

function texNode(n: Node, times = "\\cdot", over?: (n: Node) => string | undefined): string {
  const T = (m: Node) => texNode(m, times, over);
  const o = over?.(n);
  if (o !== undefined) return o;
  switch (n.k) {
    case "num":
      return n.src;
    case "var":
      return n.name === "pi" ? "\\pi" : n.name;
    case "paren":
      return `\\left(${T(n.a)}\\right)`;
    case "neg":
      return `-${T(n.a)}`;
    case "add":
      return `${T(n.a)} ${n.op} ${T(n.b)}`;
    case "mul": {
      // 2x, 3√2 and x²y read better without a dot; a number on the right keeps it.
      const b = T(n.b);
      const tight = n.implicit && !/^(\d|-|\\frac|\\left\(\\frac)/.test(b);
      return `${T(n.a)}${tight ? " " : ` ${times} `}${b}`;
    }
    case "div":
      return `\\frac{${T(strip(n.a))}}{${T(strip(n.b))}}`;
    case "pow": {
      const a = strip(n.a);
      const base = a.k === "num" || a.k === "var" ? T(a) : `\\left(${T(a)}\\right)`;
      // A fraction up in the exponent reads better as −1/3 than as a tiny stacked fraction.
      const e = constQ(n.b);
      return `${base}^{${e && !isInt(e) && strip(n.b).k !== "num" ? texExp(e) : T(strip(n.b))}}`;
    }
    case "root":
      return n.n === 2 ? `\\sqrt{${T(strip(n.a))}}` : `\\sqrt[${n.n}]{${T(strip(n.a))}}`;
    case "log": {
      const name = n.ln ? "\\ln" : "\\log";
      const base = n.base ? `_{${T(strip(n.base))}}` : "";
      const a = strip(n.a);
      const arg = a.k === "num" || a.k === "var" ? ` ${T(a)}` : `\\left(${T(a)}\\right)`;
      return `${name}${base}${arg}`;
    }
  }
}

/** A numeric value, for checks (letters get fixed test values). */
function evalNode(n: Node, env: Record<string, number>): number {
  const E = (m: Node) => evalNode(m, env);
  switch (n.k) {
    case "num":
      return num(n.v);
    case "var":
      return n.name === "e" && !(n.name in env) ? Math.E : n.name === "pi" ? Math.PI : env[n.name] ?? NaN;
    case "paren":
      return E(n.a);
    case "neg":
      return -E(n.a);
    case "add":
      return n.op === "+" ? E(n.a) + E(n.b) : E(n.a) - E(n.b);
    case "mul":
      return E(n.a) * E(n.b);
    case "div":
      return E(n.a) / E(n.b);
    case "pow": {
      const a = E(n.a);
      const b = E(n.b);
      // A real odd root of a negative number: (−8)^(1/3) = −2.
      if (a < 0 && !Number.isInteger(b)) {
        const r = Math.round(1 / b);
        if (Math.abs(1 / b - r) < 1e-9 && r % 2) return -((-a) ** b);
      }
      return a ** b;
    }
    case "root": {
      const a = E(n.a);
      return n.n % 2 && a < 0 ? -((-a) ** (1 / n.n)) : a ** (1 / n.n);
    }
    case "log": {
      const b = n.base ? E(n.base) : n.ln ? Math.E : 10;
      return Math.log(E(n.a)) / Math.log(b);
    }
  }
}

/** A constant rational the node stands for (2, −1/2, (2/3), 0.5), or null. */
function constQ(n: Node): Q | null {
  switch (n.k) {
    case "num":
      return n.v;
    case "paren":
      return constQ(n.a);
    case "neg": {
      const a = constQ(n.a);
      return a && neg(a);
    }
    case "add": {
      const a = constQ(n.a);
      const b = constQ(n.b);
      return a && b && (n.op === "+" ? add(a, b) : sub(a, b));
    }
    case "mul": {
      const a = constQ(n.a);
      const b = constQ(n.b);
      return a && b && mul(a, b);
    }
    case "div": {
      const a = constQ(n.a);
      const b = constQ(n.b);
      return a && b && div(a, b);
    }
    case "pow": {
      const a = constQ(n.a);
      const b = constQ(n.b);
      if (!a || !b || !isInt(b)) return null;
      if (isZero(a) && b.n <= 0) return null;
      return qpow(a, b.n);
    }
    default:
      return null;
  }
}

const hasVar = (n: Node, name?: string): boolean => {
  switch (n.k) {
    case "var":
      return name === undefined ? n.name !== "e" && n.name !== "pi" : n.name === name;
    case "num":
      return false;
    case "paren":
    case "neg":
    case "root":
      return hasVar(n.a, name);
    case "log":
      return hasVar(n.a, name) || (!!n.base && hasVar(n.base, name));
    default:
      return hasVar(n.a, name) || hasVar(n.b, name);
  }
};

// ---------- drawing helpers ----------

const PALETTE = [C.blue, C.orange, C.green, C.purple, C.red, "#0c8599"];
const TINT: Record<string, string> = { [C.blue]: "#d0ebff", [C.orange]: "#fff4e6", [C.green]: "#d3f9d8", [C.purple]: "#f3d9fa", [C.red]: "#ffe3e3", "#0c8599": "#c5f6fa" };
const text = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; italic?: boolean } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 13}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""}${o.italic ? ` font-style="italic"` : ""}>${esc(s)}</text>`;
/** A rounded chip with a label: one factor. */
function chip(x: number, y: number, label: string, color: string, crossed = false, w = 28, h = 28): string {
  const italic = /^[a-z]$/i.test(label);
  return (
    `<rect x="${r2(x)}" y="${r2(y)}" width="${w}" height="${h}" rx="7" fill="${TINT[color] ?? "#f1f3f5"}" stroke="${color}" stroke-width="1.5"${crossed ? ` opacity="0.4"` : ""}/>` +
    text(x + w / 2, y + h / 2 + 5, label, { anchor: "middle", bold: true, italic, color, size: label.length > 2 ? 11 : 14 }) +
    (crossed ? `<line x1="${r2(x - 2)}" y1="${r2(y + h + 2)}" x2="${r2(x + w + 2)}" y2="${r2(y - 2)}" stroke="${C.red}" stroke-width="2.2"/>` : "")
  );
}

// ---------- index laws ----------

type Base = { key: string; tex: string; label: string; v?: Q; name?: string };
/** One factor as typed (after brackets are opened): base^(e₁·e₂·…), above or below the line. */
type Occ = { base: Base; exps: Q[]; den: boolean };
type LawKey = "powerProduct" | "powerQuotient" | "powerPower" | "rootPower" | "signOdd" | "signEven";

const numBase = (v: Q): Base => ({
  key: `n:${v.n}/${v.d}`,
  tex: v.d === 1 ? `${v.n}` : `\\left(\\frac{${v.n}}{${v.d}}\\right)`,
  label: plainQ(v),
  v,
});
const varBase = (name: string): Base => ({ key: `v:${name}`, tex: name, label: name, name });
const prodQ = (xs: Q[]) => xs.reduce(mul, ONE);

function flatten(n: Node, exps: Q[], den: boolean, out: Occ[], laws: Set<LawKey>, sign: { neg: boolean }) {
  const w = words.laws;
  const total = () => prodQ(exps);
  const flipSign = () => {
    const t = total();
    if (!isInt(t)) throw new Error(w.negBase);
    if (t.n % 2) sign.neg = !sign.neg;
    if (exps.length) laws.add(t.n % 2 ? "signOdd" : "signEven");
  };
  switch (n.k) {
    case "paren":
      return flatten(n.a, exps, den, out, laws, sign);
    case "num": {
      if (isZero(n.v)) throw new Error(w.zeroBase);
      if (n.v.n < 0) flipSign();
      const v = absQ(n.v);
      if (!eqQ(v, ONE)) out.push({ base: numBase(v), exps, den });
      return;
    }
    case "var":
      if (n.name === "pi") throw new Error(fill(words.bad, { s: "π" }));
      out.push({ base: varBase(n.name), exps, den });
      return;
    case "neg":
      flipSign();
      return flatten(n.a, exps, den, out, laws, sign);
    case "mul":
      flatten(n.a, exps, den, out, laws, sign);
      return flatten(n.b, exps, den, out, laws, sign);
    case "div":
      flatten(n.a, exps, den, out, laws, sign);
      return flatten(n.b, exps, !den, out, laws, sign);
    case "pow": {
      const e = constQ(n.b);
      if (!e) throw new Error(w.expNumber);
      const inner = strip(n.a);
      if (inner.k === "mul" || inner.k === "neg") laws.add("powerProduct");
      if (inner.k === "div") laws.add("powerQuotient");
      if (inner.k === "pow" || inner.k === "root") laws.add("powerPower");
      return flatten(n.a, [...exps, e], den, out, laws, sign);
    }
    case "root":
      laws.add("rootPower");
      return flatten(n.a, [...exps, q(1, n.n)], den, out, laws, sign);
    case "add":
      throw new Error(w.noSums);
    case "log":
      throw new Error(fill(words.bad, { s: "log" }));
  }
}

/** A factor in LaTeX: x, x^{3}, 2^{-1/2}, \left(\frac{2}{3}\right)^{2}. */
function facTex(b: Base, exp: string): string {
  if (exp === "1") return b.v && b.v.d !== 1 ? `\\frac{${b.v.n}}{${b.v.d}}` : b.tex;
  return `${b.tex}^{${exp}}`;
}
/** Numerator and denominator factors as one fraction (or a plain product). */
function fracTex(top: string[], bottom: string[], negative = false): string {
  const t = top.length ? top.join(" \\cdot ") : "1";
  const s = bottom.length ? `\\frac{${t}}{${bottom.join(" \\cdot ")}}` : t;
  return `${negative ? "-" : ""}${s}`;
}
const expProduct = (exps: Q[]) => {
  const xs = exps.filter((e) => !eqQ(e, ONE));
  if (!xs.length) return "1";
  return xs.map((e, i) => (i > 0 && e.n < 0 ? `(${texExp(e)})` : texExp(e))).join(" \\cdot ");
};
/** Numbers first (in the order they came), then letters alphabetically. */
const orderBases = (keys: string[], bases: Map<string, Base>) =>
  [...keys].sort((a, b) => {
    const [x, y] = [bases.get(a)!, bases.get(b)!];
    if (!!x.v !== !!y.v) return x.v ? -1 : 1;
    return x.name && y.name ? x.name.localeCompare(y.name) : 0;
  });

const LETTER_VALUES = [2, 3, 5, 1.5, 7, 2.5];
function letterEnv(node: Node): Record<string, number> {
  const env: Record<string, number> = {};
  const walk = (n: Node) => {
    if (n.k === "var" && n.name !== "e" && n.name !== "pi" && !(n.name in env)) env[n.name] = LETTER_VALUES[Object.keys(env).length % LETTER_VALUES.length];
    for (const c of Object.values(n)) if (c && typeof c === "object" && "k" in c) walk(c as Node);
  };
  walk(node);
  return env;
}

function renderLaws(s: PowersSpec, w: PowersWords): RenderedSvg {
  const L = w.laws;
  const node = parseExpr(s.src);
  const occs: Occ[] = [];
  const laws = new Set<LawKey>();
  const sign = { neg: false };
  flatten(node, [], false, occs, laws, sign);
  const bases = new Map(occs.map((o) => [o.base.key, o.base]));
  const rows: TexLine[] = [];
  const header = texNode(node);

  // 1. Open the brackets: (ab)ⁿ = aⁿbⁿ, (a/b)ⁿ = aⁿ/bⁿ, (aᵐ)ⁿ = aᵐⁿ, ⁿ√a = a^(1/n).
  const lawNames = (["powerProduct", "powerQuotient", "powerPower", "rootPower", "signOdd", "signEven"] as LawKey[]).filter((k) => laws.has(k));
  if (lawNames.length) {
    const show = (exp: (o: Occ) => string) => fracTex(occs.filter((o) => !o.den).map((o) => facTex(o.base, exp(o))), occs.filter((o) => o.den).map((o) => facTex(o.base, exp(o))), sign.neg);
    rows.push({ tex: `= ${show((o) => expProduct(o.exps))}`, op: lawNames.map((k) => L[k]).join(", ") });
    if (occs.some((o) => o.exps.filter((e) => !eqQ(e, ONE)).length > 1)) rows.push({ tex: `= ${show((o) => texExp(prodQ(o.exps)))}`, op: L.multiply });
  }

  // 2. Same base: aᵐ·aⁿ = aᵐ⁺ⁿ, aᵐ/aⁿ = aᵐ⁻ⁿ.
  type Fac = { base: Base; exp: Q; den: boolean };
  const groups = new Map<string, Occ[]>();
  for (const o of occs) groups.set(o.base.key, [...(groups.get(o.base.key) ?? []), o]);
  const keys = orderBases([...groups.keys()], bases);
  let facs: Fac[] = keys.map((k) => {
    const g = groups.get(k)!;
    const total = g.reduce((acc, o) => (o.den ? sub(acc, prodQ(o.exps)) : add(acc, prodQ(o.exps))), ZERO);
    // A base that only ever stood below the line stays there.
    return g.every((o) => o.den) ? { base: g[0].base, exp: neg(total), den: true } : { base: g[0].base, exp: total, den: false };
  });
  const combined = keys.filter((k) => groups.get(k)!.length > 1);
  if (combined.length) {
    const sumTex = (g: Occ[]) => {
      const onlyDen = g.every((o) => o.den);
      return g
        .map((o, i) => {
          const e = prodQ(o.exps);
          const sgn = onlyDen || !o.den ? "+" : "-";
          if (i === 0) return sgn === "-" ? `-${e.n < 0 ? `(${texExp(e)})` : texExp(e)}` : texExp(e);
          return `${sgn} ${e.n < 0 ? `(${texExp(e)})` : texExp(e)}`;
        })
        .join(" ");
    };
    const show = (exp: (k: string, f: Fac) => string) =>
      fracTex(
        keys.map((k, i) => [k, facs[i]] as const).filter(([, f]) => !f.den).map(([k, f]) => facTex(f.base, exp(k, f))),
        keys.map((k, i) => [k, facs[i]] as const).filter(([, f]) => f.den).map(([k, f]) => facTex(f.base, exp(k, f))),
        sign.neg,
      );
    const same = combined.some((k) => {
      const g = groups.get(k)!;
      return g.filter((o) => o.den).length > 1 || g.filter((o) => !o.den).length > 1;
    });
    const across = combined.some((k) => {
      const g = groups.get(k)!;
      return g.some((o) => o.den) && g.some((o) => !o.den);
    });
    rows.push({
      tex: `= ${show((k, f) => (groups.get(k)!.length > 1 ? sumTex(groups.get(k)!) : texExp(f.exp)))}`,
      op: [same ? L.product : "", across ? L.quotient : ""].filter(Boolean).join(", "),
    });
    rows.push({ tex: `= ${show((_, f) => texExp(f.exp))}` });
  }

  // 3. a⁰ = 1 and a⁻ⁿ = 1/aⁿ.
  const zeroes = facs.some((f) => isZero(f.exp));
  const negs = facs.some((f) => f.exp.n < 0);
  facs = facs.filter((f) => !isZero(f.exp)).map((f) => (f.exp.n < 0 ? { ...f, exp: neg(f.exp), den: !f.den } : f));
  const facsTex = (fs: Fac[], expTex: (f: Fac) => string = (f) => texExp(f.exp)) =>
    fracTex(fs.filter((f) => !f.den).map((f) => facTex(f.base, expTex(f))), fs.filter((f) => f.den).map((f) => facTex(f.base, expTex(f))), sign.neg);
  if (zeroes || negs) rows.push({ tex: `= ${facsTex(facs)}`, op: [zeroes ? L.zero : "", negs ? L.negative : ""].filter(Boolean).join(", ") });

  // 4. Numbers to fractional powers: a^(m/n) = (ⁿ√a)^m when the root is exact.
  const rootOf = (f: Fac) => (f.base.v && !isInt(f.exp) ? qroot(f.base.v, f.exp.d) : null);
  if (facs.some((f) => rootOf(f))) {
    rows.push({
      tex: `= ${fracTex(facs.filter((f) => !f.den).map(rootTex), facs.filter((f) => f.den).map(rootTex), sign.neg)}`,
      op: L.fracPower,
    });
    facs = facs.map((f) => {
      const r = rootOf(f);
      return r ? { base: numBase(r), exp: q(f.exp.n), den: f.den } : f;
    });
    rows.push({ tex: `= ${facsTex(facs)}` });
  }
  function rootTex(f: Fac): string {
    const r = rootOf(f);
    if (!r) return facTex(f.base, texExp(f.exp));
    const v = f.base.v!;
    const inner = v.d === 1 ? `${v.n}` : `\\frac{${v.n}}{${v.d}}`;
    const rt = f.exp.d === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${f.exp.d}]{${inner}}`;
    return f.exp.n === 1 ? rt : `\\left(${rt}\\right)^{${f.exp.n}}`;
  }

  // 5. Work out the numbers.
  const numeric = facs.filter((f) => f.base.v && isInt(f.exp));
  let coef = ONE;
  for (const f of numeric) coef = f.den ? div(coef, qpow(f.base.v!, f.exp.n)) : mul(coef, qpow(f.base.v!, f.exp.n));
  const rest = facs.filter((f) => !(f.base.v && isInt(f.exp)));
  const finalTex = () => {
    const top = rest.filter((f) => !f.den).map((f) => facTex(f.base, texExp(f.exp)));
    const bottom = rest.filter((f) => f.den).map((f) => facTex(f.base, texExp(f.exp)));
    const cTop = coef.n === 1 && top.length ? [] : [`${coef.n}`];
    const cBot = coef.d === 1 ? [] : [`${coef.d}`];
    return fracTex([...cTop, ...top], [...cBot, ...bottom], sign.neg).replace(/ \\cdot (?=[a-z])/gi, " ").replace(/(\d) \\cdot (?=[a-z])/gi, "$1 ");
  };
  if (numeric.some((f) => !eqQ(f.exp, ONE))) {
    // Each power of a number worked out first (2³ → 8), then multiplied.
    const valued = facs.map((f) => (f.base.v && isInt(f.exp) ? { ...f, base: numBase(qpow(f.base.v, f.exp.n)), exp: ONE } : f));
    rows.push({ tex: `= ${facsTex(valued)}`, op: L.numbers });
  }
  const last = `= ${finalTex()}`;
  rows.push({ tex: last });
  // Steps that change nothing on the page are dropped.
  for (let i = rows.length - 1; i > 0; i--) if (rows[i].tex === rows[i - 1].tex) rows.splice(rows[i].op && !rows[i - 1].op ? i - 1 : i, 1);
  if (rows.length === 1 && rows[0].tex === `= ${header}`) rows[0].tex = last;
  rows[rows.length - 1].color = C.green;

  // Check by substituting numbers for the letters.
  const env = letterEnv(node);
  const before = evalNode(node, env);
  let after = num(coef) * (sign.neg ? -1 : 1);
  for (const f of rest) {
    const val = (f.base.v ? num(f.base.v) : env[f.base.name!]) ** num(f.exp);
    after = f.den ? after / val : after * val;
  }
  const vals = Object.entries(env).map(([k, v]) => `${k} = ${v}`).join(", ");
  const caps: Caption[] = [];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;

  const pic = chipsPicture(occs, bases, y);
  if (pic) {
    body.push(pic.svg);
    y += pic.h;
    caps.push({ text: pic.cancels ? `${L.chips} ${L.chipsCancel}` : L.chips, color: "#495057" });
  }
  if (rest.some((f) => !isInt(f.exp))) caps.push({ text: L.rootNote, color: C.purple });
  caps.push({ text: vals ? fill(w.check, { vals, l: approx(before, 6), r: approx(after, 6) }) : fill(w.approx, { l: approx(before, 6), r: approx(after, 6) }), color: C.green });
  return compose(header, body.join(""), y, caps);
}

/** Every factor as a chip: a base to a whole power n is n chips; below the line they cancel with those above. */
function chipsPicture(occs: Occ[], bases: Map<string, Base>, y0: number): { svg: string; h: number; cancels: boolean } | null {
  // With letters about, numbers are left to the steps: 2·2 over 4 can't be seen to cancel as chips.
  if (occs.some((o) => !o.base.v)) occs = occs.filter((o) => !o.base.v);
  if (!occs.length || occs.some((o) => !o.exps.every(isInt))) return null;
  const keys = orderBases([...new Set(occs.map((o) => o.base.key))], bases);
  if (keys.length > 4) return null;
  const interesting =
    keys.some((k) => occs.filter((o) => o.base.key === k).length > 1) ||
    occs.some((o) => o.exps.filter((e) => !eqQ(e, ONE)).length > 1 || prodQ(o.exps).n <= 0);
  if (!interesting) return null;
  type Cluster = { size: number; groups: number };
  const rows = keys.map((k) => {
    const top: Cluster[] = [];
    const bottom: Cluster[] = [];
    for (const o of occs.filter((x) => x.base.key === k)) {
      const e = prodQ(o.exps).n;
      if (e === 0) continue;
      // (x²)³: three groups of two.
      const size = Math.abs(o.exps.length ? o.exps[0].n : 1);
      const cl = { size, groups: Math.abs(e) / size };
      ((e > 0) !== o.den ? top : bottom).push(cl);
    }
    return { base: bases.get(k)!, top, bottom };
  });
  const count = (cs: Cluster[]) => cs.reduce((acc, c) => acc + c.size * c.groups, 0);
  if (rows.some((r) => count(r.top) > 13 || count(r.bottom) > 13)) return null;

  const parts: string[] = [];
  const CW = 28;
  const GAP = 3;
  let y = y0 + 6;
  let cancels = false;
  rows.forEach((r, i) => {
    const color = PALETTE[i % PALETTE.length];
    const nTop = count(r.top);
    const nBot = count(r.bottom);
    const cut = Math.min(nTop, nBot);
    if (cut) cancels = true;
    const x0 = 70;
    const lineW = (cs: Cluster[]) => cs.reduce((acc, c) => acc + c.groups * (c.size * (CW + GAP) + 6) + 12, -12);
    const drawLine = (cs: Cluster[], yy: number) => {
      let x = x0;
      let idx = 0;
      for (const c of cs) {
        const w = c.groups * (c.size * (CW + GAP) + 6) - 6 - GAP;
        parts.push(`<rect x="${r2(x - 4)}" y="${r2(yy - 4)}" width="${r2(w + 8)}" height="${CW + 8}" rx="9" fill="none" stroke="${color}" stroke-opacity="0.35" stroke-dasharray="3 3"/>`);
        for (let g = 0; g < c.groups; g++) {
          for (let j = 0; j < c.size; j++) {
            parts.push(chip(x, yy, r.base.label, color, idx < cut));
            x += CW + GAP;
            idx++;
          }
          x += 6;
        }
        x += 12 - 6;
      }
    };
    const twoRows = nBot > 0;
    parts.push(text(x0 - 14, y + (twoRows ? 40 : 19), r.base.label, { anchor: "end", bold: true, italic: !r.base.v, color, size: 16 }));
    drawLine(r.top, y);
    if (twoRows) {
      const barW = Math.max(lineW(r.top), lineW(r.bottom), CW);
      parts.push(`<line x1="${x0 - 4}" y1="${y + CW + 8}" x2="${r2(x0 + barW + 4)}" y2="${y + CW + 8}" stroke="#495057" stroke-width="1.6"/>`);
      drawLine(r.bottom, y + CW + 16);
    }
    const left = nTop - nBot;
    const res = left === 0 ? "1" : Math.abs(left) === 1 ? r.base.label : `${r.base.label}^${Math.abs(left)}`;
    const label = left < 0 ? `= 1/${res}` : `= ${res}`;
    parts.push(text(W - 24, y + (twoRows ? 40 : 19), minus(label).replace(/\^(\d+)/, (_, d: string) => [...d].map((c) => SUPER[Number(c)]).join("")), { anchor: "end", bold: true, color, size: 16 }));
    y += (twoRows ? 2 * CW + 24 : CW + 10) + 10;
  });
  return { svg: parts.join(""), h: y - y0, cancels };
}

// ---------- scientific notation ----------

/** m · 10^e, exactly. */
type Dec = { m: bigint; e: number };
const SIG = 4; // significant figures when a quotient doesn't terminate

function dec(m: bigint, e = 0): Dec {
  if (m === 0n) return { m, e: 0 };
  while (m % 10n === 0n) (m /= 10n), e++;
  return { m, e };
}
const decOf = (src: string): Dec => {
  const [whole, frac = ""] = src.split(".");
  return dec(BigInt(whole + frac || "0"), -frac.length);
};
const pow10 = (k: number) => 10n ** BigInt(k);
const decMul = (a: Dec, b: Dec) => dec(a.m * b.m, a.e + b.e);
const decNeg = (a: Dec) => dec(-a.m, a.e);
function decAdd(a: Dec, b: Dec): Dec {
  const e = Math.min(a.e, b.e);
  return dec(a.m * pow10(a.e - e) + b.m * pow10(b.e - e), e);
}
const decZero = (a: Dec) => a.m === 0n;
const digitsOf = (a: Dec) => (a.m < 0n ? -a.m : a.m).toString();
/** a ÷ b: exact when it terminates, otherwise rounded to SIG significant figures. */
function decDiv(a: Dec, b: Dec): { v: Dec; exact: boolean } {
  if (decZero(b)) throw new Error(words.divZero);
  const P = 40;
  const n = a.m * pow10(P);
  const qv = n / b.m;
  const exact = qv * b.m === n;
  const v = dec(qv, a.e - b.e - P);
  return exact ? { v, exact } : { v: roundSig(v, SIG), exact };
}
function roundSig(a: Dec, sig: number): Dec {
  const ds = digitsOf(a);
  if (ds.length <= sig) return a;
  const drop = ds.length - sig;
  const p = pow10(drop);
  const sgn = a.m < 0n ? -1n : 1n;
  const abs = a.m * sgn;
  let r = abs / p;
  if ((abs % p) * 2n >= p) r += 1n;
  return dec(r * sgn, a.e + drop);
}
function decPow(a: Dec, k: number): { v: Dec; exact: boolean } {
  if (!Number.isInteger(k) || Math.abs(k) > 400) throw new Error(words.tooBig);
  let r = dec(1n);
  for (let i = 0; i < Math.abs(k); i++) r = decMul(r, a);
  return k < 0 ? decDiv(dec(1n), r) : { v: r, exact: true };
}
const decNum = (a: Dec) => Number(a.m) * 10 ** a.e;

/** The digits as written without a power: cells, and the decimal point after cell p − 1. */
function layout(a: Dec): { cells: string; p: number } {
  const D = digitsOf(a);
  if (a.e >= 0) return { cells: D + "0".repeat(a.e), p: D.length + a.e };
  if (-a.e < D.length) return { cells: D, p: D.length + a.e };
  return { cells: "0".repeat(-a.e - D.length + 1) + D, p: 1 };
}
const group3 = (s: string, fromLeft: boolean, sep: string) => {
  if (s.length <= 4) return s;
  const out: string[] = [];
  if (fromLeft) for (let i = 0; i < s.length; i += 3) out.push(s.slice(i, i + 3));
  else for (let i = s.length; i > 0; i -= 3) out.unshift(s.slice(Math.max(0, i - 3), i));
  return out.join(sep);
};
function decStr(a: Dec, sep: string): string {
  if (decZero(a)) return "0";
  const { cells, p } = layout(a);
  const int = group3(cells.slice(0, p) || "0", false, sep);
  const frac = cells.slice(p);
  return `${a.m < 0n ? "-" : ""}${int}${frac ? `.${group3(frac, true, sep)}` : ""}`;
}
const decTex = (a: Dec) => decStr(a, "\\,");
const decText = (a: Dec) => minus(decStr(a, " "));
/** a = c × 10ⁿ with 1 ≤ |c| < 10. */
function standard(a: Dec): { c: Dec; n: number } {
  const D = digitsOf(a);
  return { c: dec(a.m, -(D.length - 1)), n: D.length - 1 + a.e };
}
const sciTex = (c: Dec, n: number) => `${decTex(c)} \\times 10^{${n}}`;
const inStandardRange = (c: Dec) => {
  const D = digitsOf(c);
  return D.length - 1 + c.e === 0;
};

/** A number as typed in standard form: c × 10ⁿ (n = 0 for a plain number), or null. */
function sfOf(n: Node): { c: Dec; n: number; plain: boolean } | null {
  n = strip(n);
  if (n.k === "neg") {
    const r = sfOf(n.a);
    return r && { ...r, c: decNeg(r.c) };
  }
  if (n.k === "num") return { c: decOf(n.src), n: 0, plain: true };
  const tenPow = (m: Node): number | null => {
    m = strip(m);
    if (m.k !== "pow" || strip(m.a).k !== "num" || (strip(m.a) as { src: string }).src !== "10") return null;
    const e = constQ(m.b);
    return e && isInt(e) ? e.n : null;
  };
  const t = tenPow(n);
  if (t !== null) return { c: dec(1n), n: t, plain: false };
  if (n.k === "mul") {
    const a = strip(n.a);
    const k = tenPow(n.b);
    if (a.k === "num" && k !== null) return { c: decOf(a.src), n: k, plain: false };
    if (a.k === "neg" && strip(a.a).k === "num" && k !== null) return { c: decNeg(decOf((strip(a.a) as { src: string }).src)), n: k, plain: false };
  }
  return null;
}

/** Any arithmetic on decimals, for inputs that are not one of the patterns below. */
function evalDec(n: Node): { v: Dec; exact: boolean } {
  switch (n.k) {
    case "num":
      return { v: decOf(n.src), exact: true };
    case "paren":
      return evalDec(n.a);
    case "neg": {
      const a = evalDec(n.a);
      return { v: decNeg(a.v), exact: a.exact };
    }
    case "add": {
      const a = evalDec(n.a);
      const b = evalDec(n.b);
      return { v: decAdd(a.v, n.op === "+" ? b.v : decNeg(b.v)), exact: a.exact && b.exact };
    }
    case "mul": {
      const a = evalDec(n.a);
      const b = evalDec(n.b);
      return { v: decMul(a.v, b.v), exact: a.exact && b.exact };
    }
    case "div": {
      const a = evalDec(n.a);
      const b = evalDec(n.b);
      const r = decDiv(a.v, b.v);
      return { v: r.v, exact: r.exact && a.exact && b.exact };
    }
    case "pow": {
      const e = constQ(n.b);
      if (!e || !isInt(e)) throw new Error(words.sci.noLetters);
      const a = evalDec(n.a);
      const r = decPow(a.v, e.n);
      return { v: r.v, exact: r.exact && a.exact };
    }
    default:
      throw new Error(words.sci.noLetters);
  }
}

function renderSci(s: PowersSpec, w: PowersWords): RenderedSvg {
  const S = w.sci;
  // 3.2e5, 3.2E-4 and 3.2 x 10^5 are standard form too.
  const src = s.src.replace(/(\d)\s*[eE]\s*([+-−]?\d+)/g, "$1*10^($2)").replace(/(\d)\s*[xX]\s*(?=10\s*\^)/g, "$1*");
  const node = parseExpr(src);
  if (hasVar(node) || hasVar(node, "e")) throw new Error(S.noLetters);
  const top = strip(node);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const body: string[] = [];
  let header = texNode(node, "\\times");
  let y = 4;
  let hops: { from: Dec; toStandard: boolean } | null = null;

  /** c × 10ⁿ → 1 ≤ |c| < 10, shown as one step. */
  const normalize = (c: Dec, n: number) => {
    if (decZero(c) || inStandardRange(c)) return { c, n };
    const st = standard(c);
    rows.push({ tex: `= ${sciTex(st.c, st.n)} \\times 10^{${n}}`, op: fill(S.adjust, { a: decText(c), b: `${decText(st.c)} × ${tenTo(st.n)}` }) });
    rows.push({ tex: `= ${sciTex(st.c, st.n + n)}` });
    return { c: st.c, n: st.n + n };
  };

  const sf = sfOf(top);
  const binary = (top.k === "mul" || top.k === "div" || top.k === "add") && !sf ? { a: sfOf(top.a), b: sfOf(top.b) } : null;
  let result: { c: Dec; n: number; exact: boolean };

  if (sf && sf.plain) {
    // A plain number into standard form.
    if (decZero(sf.c)) throw new Error(S.zero);
    header = decTex(sf.c);
    const st = standard(sf.c);
    rows.push({ tex: `= ${sciTex(st.c, st.n)}`, op: S.standard });
    hops = { from: sf.c, toStandard: true };
    result = { ...st, exact: true };
  } else if (sf) {
    // Standard form (or nearly) into an ordinary number.
    if (decZero(sf.c)) throw new Error(S.zero);
    let { c, n } = sf;
    if (!inStandardRange(c)) {
      const st = standard(c);
      rows.push({ tex: `= ${sciTex(st.c, st.n)} \\times 10^{${n}}`, op: fill(S.notStandard, { a: decText(c) }) });
      rows.push({ tex: `= ${sciTex(st.c, st.n + n)}` });
      c = st.c;
      n += st.n;
    }
    const value = decMul(c, decPow(dec(10n), n).v);
    if (Math.abs(n) <= 30) {
      rows.push({ tex: `= ${decTex(value)}`, op: S.ordinary });
      hops = { from: value, toStandard: false };
    }
    result = { c, n, exact: true };
  } else if (binary && binary.a && binary.b) {
    let [A, B] = [binary.a, binary.b];
    // Both in standard form first.
    if (!inStandardRange(A.c) || !inStandardRange(B.c)) {
      const fix = (x: { c: Dec; n: number }) => {
        if (decZero(x.c) || inStandardRange(x.c)) return x;
        const st = standard(x.c);
        return { c: st.c, n: st.n + x.n, plain: false };
      };
      [A, B] = [fix(A), fix(B)] as typeof A[];
      const opTex = top.k === "mul" ? "\\times" : top.k === "div" ? "\\div" : (top as { op: string }).op;
      rows.push({ tex: `= \\left(${sciTex(A.c, A.n)}\\right) ${opTex} \\left(${sciTex(B.c, B.n)}\\right)`, op: S.standard });
    }
    if (top.k === "mul") {
      rows.push({ tex: `= (${decTex(A.c)} \\times ${decTex(B.c)}) \\times 10^{${A.n} + ${B.n < 0 ? `(${B.n})` : B.n}}`, op: S.mulRule });
      const c = decMul(A.c, B.c);
      rows.push({ tex: `= ${sciTex(c, A.n + B.n)}` });
      result = { ...normalize(c, A.n + B.n), exact: true };
    } else if (top.k === "div") {
      rows.push({ tex: `= (${decTex(A.c)} \\div ${decTex(B.c)}) \\times 10^{${A.n} - ${B.n < 0 ? `(${B.n})` : B.n}}`, op: S.divRule });
      const r = decDiv(A.c, B.c);
      rows.push({ tex: `${r.exact ? "=" : "\\approx"} ${sciTex(r.v, A.n - B.n)}`, op: r.exact ? undefined : fill(S.rounded, { n: SIG }) });
      result = { ...normalize(r.v, A.n - B.n), exact: r.exact };
    } else {
      // Addition: write both with the larger power of ten, then add the numbers in front.
      const op = (top as { op: "+" | "-" }).op;
      if (A.n !== B.n) {
        const M = Math.max(A.n, B.n);
        const shift = (x: { c: Dec; n: number }) => ({ c: dec(x.c.m, x.c.e - (M - x.n)), n: M });
        [A, B] = [{ ...shift(A), plain: false }, { ...shift(B), plain: false }];
        rows.push({ tex: `= ${sciTex(A.c, M)} ${op} ${sciTex(B.c, M)}`, op: fill(S.align, { n: M }) });
      }
      rows.push({ tex: `= (${decTex(A.c)} ${op} ${decTex(B.c)}) \\times 10^{${A.n}}`, op: S.addRule });
      const c = decAdd(A.c, op === "+" ? B.c : decNeg(B.c));
      if (decZero(c)) {
        rows.push({ tex: "= 0" });
        result = { c, n: 0, exact: true };
      } else {
        rows.push({ tex: `= ${sciTex(c, A.n)}` });
        result = { ...normalize(c, A.n), exact: true };
      }
    }
  } else {
    const r = evalDec(top);
    if (decZero(r.v)) {
      rows.push({ tex: "= 0" });
      result = { c: r.v, n: 0, exact: true };
    } else {
      const st = standard(r.v);
      rows.push({ tex: `${r.exact ? "=" : "\\approx"} ${decTex(r.v)}` });
      rows.push({ tex: `${r.exact ? "=" : "\\approx"} ${sciTex(st.c, st.n)}`, op: S.standard });
      result = { ...st, exact: r.exact };
    }
  }
  if (!rows.length) rows.push({ tex: `= ${sciTex(result.c, result.n)}`, op: S.standard });
  rows[rows.length - 1].color = C.green;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;

  if (hops) {
    const pic = hopsPicture(hops.from, hops.toStandard, y);
    if (pic) {
      body.push(pic.svg);
      y += pic.h;
    }
    const n = standard(hops.from).n;
    const k = Math.abs(n);
    caps.push({
      text: n === 0 ? S.hopsNone : fill(hops.toStandard === n > 0 ? S.hopsLeft : S.hopsRight, { k, n: minus(String(n)) }),
      color: "#495057",
    });
  }
  if (!decZero(result.c) && !hops && Math.abs(result.n) <= 12) {
    const value = decMul(result.c, decPow(dec(10n), result.n).v);
    caps.push({ text: `${result.exact ? "=" : "≈"} ${decText(value)}`, color: C.green });
  }
  const typed = evalNode(node, {});
  /** 3.45 × 10⁸ rather than 3.450e+8. */
  const big = (v: number) => {
    if (v === 0 || (Math.abs(v) >= 1e-3 && Math.abs(v) < 1e7)) return approx(v, 6);
    const [m, e] = v.toExponential(5).split("e");
    return `${minus(String(Number(m)))} × ${tenTo(Number(e))}`;
  };
  caps.push({ text: fill(w.approx, { l: big(typed), r: big(decNum(result.c) * 10 ** result.n) }), color: C.green });
  return compose(header, body.join(""), y, caps);
}

/** The digits in boxes and the decimal point hopping from where it is to where it goes. */
function hopsPicture(value: Dec, toStandard: boolean, y0: number): { svg: string; h: number } | null {
  const { cells, p } = layout(value);
  const first = [...cells].findIndex((c) => c !== "0");
  const pStd = first + 1;
  if (cells.length > 22 || p === pStd) return null;
  const [from, to] = toStandard ? [p, pStd] : [pStd, p];
  const CW = 24;
  const x0 = Math.max(24, (W - cells.length * CW) / 2);
  const yc = y0 + 54;
  const parts: string[] = [];
  const D = digitsOf(value);
  const sigEnd = first + D.length; // cells after this are zeros that only hold places
  [...cells].forEach((c, i) => {
    const placeholder = i < first || i >= sigEnd;
    parts.push(
      `<rect x="${r2(x0 + i * CW + 1)}" y="${yc}" width="${CW - 2}" height="30" rx="3" fill="${placeholder ? "#f8f9fa" : "#e7f5ff"}" stroke="${placeholder ? "#ced4da" : C.blue}" stroke-width="1.2"/>`,
      text(x0 + i * CW + CW / 2, yc + 21, c, { anchor: "middle", size: 17, bold: !placeholder, color: placeholder ? "#adb5bd" : C.ink }),
    );
  });
  const gx = (k: number) => x0 + k * CW;
  // Hops: one arc per place, numbered.
  const dir = Math.sign(to - from);
  for (let k = from, j = 1; k !== to; k += dir, j++) {
    const [a, b] = [gx(k), gx(k + dir)];
    const mid = (a + b) / 2;
    parts.push(
      `<path d="M${r2(a)},${yc - 4} Q${r2(mid)},${yc - 30} ${r2(b)},${yc - 4}" fill="none" stroke="${C.orange}" stroke-width="1.8"/>`,
      `<path d="M${r2(b)},${yc - 4} l${dir > 0 ? -7 : 7},-4 l${dir > 0 ? 1 : -1},6 Z" fill="${C.orange}"/>`,
      text(mid, yc - 26, String(j), { anchor: "middle", size: 10.5, color: C.orange, bold: true }),
    );
  }
  parts.push(
    `<circle cx="${r2(gx(from))}" cy="${yc + 30}" r="4" fill="#adb5bd"/>`,
    `<circle cx="${r2(gx(to))}" cy="${yc + 30}" r="5" fill="${C.red}"/>`,
  );
  return { svg: parts.join(""), h: 100 };
}

// ---------- surds ----------

/** Σ c·ᵏ√r with r free of k-th powers; the key is "1" for the rational part, "2:7" for √7, "3:4" for ∛4. */
type Surd = Map<string, Q>;
type RootT = [number, number]; // [k, r]
/** A product term before the roots in it are multiplied: 2·√3·√3. */
type STerm = { c: Q; roots: RootT[] };

const keyOf = (k: number, r: number) => (r === 1 ? "1" : `${k}:${r}`);
const unkey = (key: string): RootT => (key === "1" ? [1, 1] : (key.split(":").map(Number) as RootT));

/** n = out^k · inner with inner free of k-th powers. */
function splitPower(k: number, n: number): { out: number; inner: number } {
  let out = 1;
  let inner = 1;
  for (const [p, e] of factorize(n)) {
    out *= p ** Math.floor(e / k);
    inner *= p ** (e % k);
  }
  return { out, inner };
}
function svAdd(a: Surd, b: Surd): Surd {
  const r = new Map(a);
  for (const [k, c] of b) {
    const v = add(r.get(k) ?? ZERO, c);
    if (isZero(v)) r.delete(k);
    else r.set(k, v);
  }
  return r;
}
const svScale = (a: Surd, c: Q): Surd => (isZero(c) ? new Map() : new Map([...a].map(([k, v]) => [k, mul(v, c)])));
const svOf = (c: Q, k = 1, r = 1): Surd => (isZero(c) ? new Map() : new Map([[keyOf(k, r), c]]));
/** ᵏ√r₁ · ᵏ√r₂ = ᵏ√(r₁r₂), simplified. */
function mulRoots(a: RootT, b: RootT): { c: Q; root: RootT } {
  if (a[1] === 1) return { c: ONE, root: b };
  if (b[1] === 1) return { c: ONE, root: a };
  if (a[0] !== b[0]) throw new Error(words.surds.mixed);
  const s = splitPower(a[0], a[1] * b[1]);
  return { c: q(s.out), root: [a[0], s.inner] };
}
function svMul(a: Surd, b: Surd): Surd {
  let r: Surd = new Map();
  for (const [ka, ca] of a)
    for (const [kb, cb] of b) {
      const m = mulRoots(unkey(ka), unkey(kb));
      r = svAdd(r, svOf(mul(mul(ca, cb), m.c), m.root[0], m.root[1]));
    }
  return r;
}
/** ᵏ√(a/b) = ᵏ√(a·bᵏ⁻¹) / b, simplified. */
function rootOfQ(k: number, v: Q): Surd {
  if (v.n === 0) return new Map();
  if (v.n < 0) {
    if (k % 2 === 0) throw new Error(words.surds.negRoot);
    return svScale(rootOfQ(k, neg(v)), q(-1));
  }
  const s = splitPower(k, v.n * v.d ** (k - 1));
  return svOf(q(s.out, v.d), k, s.inner);
}
const svRational = (a: Surd) => [...a.keys()].every((k) => k === "1");
const svNum = (a: Surd) => [...a].reduce((acc, [key, c]) => {
  const [k, r] = unkey(key);
  return acc + num(c) * r ** (1 / k);
}, 0);
const sortKeys = (keys: string[]) =>
  keys.sort((x, y) => {
    const [a, b] = [unkey(x), unkey(y)];
    return a[0] - b[0] || a[1] - b[1];
  });

/** 1 / a as conj / den, or an error when there is no simple way. */
function svInverse(a: Surd): { conj: Surd; den: Q; kind: "root" | "cube" | "conj" } {
  const terms = [...a];
  if (terms.length === 1) {
    const [key, c] = terms[0];
    const [k, r] = unkey(key);
    // c·ᵏ√r · ᵏ√(rᵏ⁻¹) = c·r
    return { conj: rootOfQ(k, q(r ** (k - 1))), den: mul(c, q(r)), kind: k === 2 ? "root" : "cube" };
  }
  if (terms.length === 2 && terms.every(([key]) => unkey(key)[0] <= 2)) {
    if (terms[1][0] === "1") terms.reverse();
    const conj = new Map([terms[0], [terms[1][0], neg(terms[1][1])]]);
    const prod = svMul(a, conj);
    if (svRational(prod)) return { conj, den: prod.get("1") ?? ZERO, kind: "conj" };
  }
  throw new Error(words.surds.divHard);
}

const rootTex = (k: number, r: number | string) => (k === 2 ? `\\sqrt{${r}}` : `\\sqrt[${k}]{${r}}`);
/** One term c·ᵏ√r with a whole c; `lead`: no "+" in front. */
function termTex(c: number, key: string, lead: boolean): string {
  const [k, r] = unkey(key);
  const s = c < 0 ? "-" : lead ? "" : "+";
  const a = Math.abs(c);
  const body = key === "1" ? `${a}` : `${a === 1 ? "" : a}${rootTex(k, r)}`;
  return `${lead ? s : `${s} `}${body}`;
}
/** A surd value over one common denominator: (6 + 3√5)/4. `sorted`: rational part first, then the roots by size. */
function texSurd(a: Surd, sorted = true): string {
  if (!a.size) return "0";
  const keys = sorted ? sortKeys([...a.keys()]) : [...a.keys()];
  const L = keys.reduce((acc, k) => (acc * a.get(k)!.d) / gcd(acc, a.get(k)!.d), 1);
  const top = keys.map((k, i) => termTex((a.get(k)!.n * L) / a.get(k)!.d, k, i === 0)).join(" ");
  if (L === 1) return top;
  // A single negative term keeps its sign outside the fraction.
  if (keys.length === 1 && top.startsWith("-")) return `-\\frac{${top.slice(1)}}{${L}}`;
  return `\\frac{${top}}{${L}}`;
}
function sTermTex(t: STerm, lead: boolean): string {
  const s = t.c.n < 0 ? "-" : lead ? "" : "+";
  const a = absQ(t.c);
  const roots = t.roots.map(([k, r]) => rootTex(k, r));
  const coef = roots.length && eqQ(a, ONE) ? "" : texQ(a);
  const body = [coef, ...roots].filter(Boolean).join(roots.length > 1 || (coef && roots.length && !/^\d+$/.test(coef)) ? " \\cdot " : "");
  return `${lead ? s : `${s} `}${body}`;
}
const sTermsTex = (ts: STerm[]) => (ts.length ? ts.map((t, i) => sTermTex(t, i === 0)).join(" ") : "0");
const svTerms = (a: Surd): STerm[] =>
  sortKeys([...a.keys()]).map((key) => {
    const [k, r] = unkey(key);
    return { c: a.get(key)!, roots: key === "1" ? [] : [[k, r]] };
  });
const svFromTerms = (ts: STerm[]) =>
  ts.reduce<Surd>((acc, t) => {
    let v = svOf(t.c);
    for (const [k, r] of t.roots) v = svMul(v, svOf(ONE, k, r));
    return svAdd(acc, v);
  }, new Map());

function renderSurds(s: PowersSpec, w: PowersWords): RenderedSvg {
  const S = w.surds;
  const node = parseExpr(s.src);
  if (hasVar(node) || hasVar(node, "e") || hasVar(node, "pi")) throw new Error(S.noLetters);
  const top = strip(node);
  const header = texNode(node);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const side = (tex: string, op?: string) => rows.push({ tex, op, color: C.purple });

  // 1. Simplify every root on its own: the largest square (cube) factor comes out.
  const values = new Map<Node, Surd>();
  const seen = new Set<string>();
  let firstSplit: { k: number; n: number } | null = null;
  const singleRoot = top.k === "root";
  const walk = (n: Node) => {
    if (n.k === "root") {
      const v = constQ(n.a);
      if (!v) throw new Error(S.rootOfSurd);
      const val = rootOfQ(n.n, v);
      values.set(n, val);
      const id = `${n.n}:${v.n}/${v.d}`;
      if (seen.has(id)) return;
      seen.add(id);
      const rt = (x: string) => rootTex(n.n, x);
      const lhs = singleRoot ? "=" : `${texNode(n)} =`;
      const out = texSurd(val);
      if (isInt(v) && v.n >= 0) {
        const sp = splitPower(n.n, v.n);
        if (sp.out === 1) return; // already as simple as it gets
        if (!firstSplit && sp.inner > 1) firstSplit = { k: n.n, n: v.n };
        const f = sp.out ** n.n;
        const op = fill(n.n === 2 ? S.largest : S.largestCube, { f });
        if (sp.inner === 1) (singleRoot ? rows.push({ tex: `= ${out}`, op }) : side(`${lhs} ${out}`, op));
        else {
          const mid = `${rt(`${f} \\cdot ${sp.inner}`)} = ${rt(String(f))} \\cdot ${rt(String(sp.inner))}`;
          if (singleRoot) rows.push({ tex: `= ${mid}`, op }, { tex: `= ${out}` });
          else side(`${lhs} ${mid} = ${out}`, op);
        }
      } else if (isInt(v)) {
        const op = S.largestCube;
        if (singleRoot) rows.push({ tex: `= -${rt(String(-v.n))}` }, { tex: `= ${out}`, op });
        else side(`${lhs} -${rt(String(-v.n))} = ${out}`, op);
      } else {
        const mid = `\\frac{${rt(String(v.n))}}{${rt(String(v.d))}}`;
        if (singleRoot) rows.push({ tex: `= ${mid}`, op: S.splitFrac }, { tex: `= ${out}` });
        else side(`${lhs} ${mid} = ${out}`, S.splitFrac);
      }
      return;
    }
    if (n.k === "log") throw new Error(fill(words.bad, { s: "log" }));
    for (const c of Object.values(n)) if (c && typeof c === "object" && "k" in c) walk(c as Node);
  };
  walk(node);
  const over = (n: Node) => {
    const v = values.get(n);
    if (!v) return undefined;
    const t = texSurd(v);
    return v.size > 1 ? `\\left(${t}\\right)` : t;
  };
  const subTex = (n: Node) => texNode(n, "\\cdot", over);
  const changed = [...values].some(([n, v]) => texSurd(v) !== texNode(n));
  if (changed && !singleRoot) rows.push({ tex: `= ${subTex(node)}` });

  // 2. Expand, rationalising any denominator with a root on the way.
  let distributed = false;
  const expand = (n: Node): STerm[] => {
    switch (n.k) {
      case "num":
        return [{ c: n.v, roots: [] }];
      case "root":
        return svTerms(values.get(n)!);
      case "paren":
        return expand(n.a);
      case "neg":
        return expand(n.a).map((t) => ({ ...t, c: neg(t.c) }));
      case "add": {
        const b = expand(n.b);
        return [...expand(n.a), ...(n.op === "+" ? b : b.map((t) => ({ ...t, c: neg(t.c) })))];
      }
      case "mul": {
        const a = expand(n.a);
        const b = expand(n.b);
        if ((a.length > 1 && !(b.length === 1 && !b[0].roots.length)) || (b.length > 1 && !(a.length === 1 && !a[0].roots.length))) distributed = true;
        return a.flatMap((x) => b.map((y) => ({ c: mul(x.c, y.c), roots: [...x.roots, ...y.roots] })));
      }
      case "pow": {
        const e = constQ(n.b);
        if (!e || !isInt(e) || Math.abs(e.n) > 6) throw new Error(words.laws.expNumber);
        const base = expand(n.a);
        if (e.n < 0) return divide(n, svOf(ONE), svFromTerms(base), "1", `${subTex(n.a)}^{${-e.n}}`);
        if (base.length > 1 && e.n > 1) distributed = true;
        let r: STerm[] = [{ c: ONE, roots: [] }];
        for (let i = 0; i < e.n; i++) r = r.flatMap((x) => base.map((y) => ({ c: mul(x.c, y.c), roots: [...x.roots, ...y.roots] })));
        return r;
      }
      case "div": {
        const den = svFromTerms(expand(n.b));
        if (!den.size) throw new Error(words.divZero);
        const numer = expand(n.a);
        if (svRational(den)) return numer.map((t) => ({ ...t, c: div(t.c, den.get("1")!) }));
        return divide(n, svFromTerms(numer), den, subTex(strip(n.a)), subTex(strip(n.b)));
      }
      default:
        throw new Error(S.noLetters);
    }
  };
  /** N / D with a root in D: multiply top and bottom by what clears it. */
  function divide(n: Node, numer: Surd, den: Surd, nTex: string, dTex: string): STerm[] {
    const inv = svInverse(den);
    const isTop = n === top;
    const c = texSurd(inv.conj, false);
    const cw = inv.conj.size > 1 ? `\\left(${c}\\right)` : c;
    const lead = isTop ? "=" : `\\frac{${nTex}}{${dTex}} =`;
    const line1 = `${lead} \\frac{${nTex}}{${dTex}} \\cdot \\frac{${cw}}{${cw}}`;
    const by = inv.kind === "conj" ? fill(S.byConj, { c: plainSurd(inv.conj) }) : fill(S.byRoot, { c: plainSurd(inv.conj) });
    const prod = svMul(numer, inv.conj);
    const dk = inv.kind === "conj" ? S.denomConj : inv.kind === "cube" ? S.denomCube : S.denomSq;
    const p = texSurd(prod);
    const line2 = `= \\frac{${p}}{${texQ(inv.den)}}`;
    if (isTop) rows.push({ tex: line1, op: by }, { tex: line2, op: dk });
    else side(line1, by), side(line2, dk);
    return svTerms(svScale(prod, div(ONE, inv.den)));
  }
  const terms = expand(top);
  if (distributed) rows.push({ tex: `= ${sTermsTex(terms)}`, op: S.expand });
  // Roots multiplied inside each term.
  const single: STerm[] = terms.map((t) => {
    let c = t.c;
    let root: RootT = [1, 1];
    for (const r of t.roots) {
      const m = mulRoots(root, r);
      c = mul(c, m.c);
      root = m.root;
    }
    return { c, roots: root[1] === 1 ? [] : [root] };
  });
  if (terms.some((t) => t.roots.length > 1)) rows.push({ tex: `= ${sTermsTex(single)}`, op: S.multiplyRoots });
  // Like surds collected.
  const groups = new Map<string, Q[]>();
  for (const t of single) {
    const key = t.roots.length ? keyOf(...t.roots[0]) : "1";
    groups.set(key, [...(groups.get(key) ?? []), t.c]);
  }
  if ([...groups.values()].some((g) => g.length > 1)) {
    const parts = sortKeys([...groups.keys()]).map((key, i) => {
      const g = groups.get(key)!;
      const [k, r] = unkey(key);
      const rt = key === "1" ? "" : rootTex(k, r);
      if (g.length === 1) return sTermTex({ c: g[0], roots: key === "1" ? [] : [[k, r]] }, i === 0);
      const inside = g.map((c, j) => (j === 0 ? texQ(c) : c.n < 0 ? `- ${texQ(neg(c))}` : `+ ${texQ(c)}`)).join(" ");
      return `${i === 0 ? "" : "+ "}\\left(${inside}\\right)${rt}`;
    });
    rows.push({ tex: `= ${parts.join(" ")}`, op: S.collect });
  }
  const total = svFromTerms(single);
  const last = `= ${texSurd(total)}`;
  if (!rows.length || rows[rows.length - 1].tex !== last) rows.push({ tex: last });
  rows[rows.length - 1].color = C.green;

  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;
  const split = firstSplit as { k: number; n: number } | null;
  if (split) {
    const pic = groupsPicture(split.k, split.n, y);
    if (pic) {
      body.push(pic.svg);
      y += pic.h;
      caps.push({ text: split.k === 2 ? S.groups : S.groupsCube, color: "#495057" });
    }
  }
  // Between two whole numbers: 8² < 72 < 9².
  if (singleRoot) {
    const v = constQ(top.a)!;
    const k = top.n;
    if (isInt(v) && v.n > 1 && !svRational(total)) {
      const a = Math.floor(v.n ** (1 / k) + 1e-9);
      const sup = (x: number) => `${x}${SUPER[k]}`;
      caps.push({ text: fill(S.between, { a2: `${sup(a)} = ${a ** k}`, n: v.n, b2: `${(a + 1) ** k} = ${sup(a + 1)}`, a, b: a + 1, v: approx(svNum(total)) }), color: C.blue });
    }
  }
  caps.push({ text: fill(w.approx, { l: approx(evalNode(node, {}), 6), r: approx(svNum(total), 6) }), color: C.green });
  return compose(header, body.join(""), y, caps);
}

/** For running text: 2 − √3, ∛4. */
function plainSurd(a: Surd): string {
  return [...a.keys()]
    .map((key, i) => {
      const c = a.get(key)!;
      const [k, r] = unkey(key);
      const abs = absQ(c);
      const coef = key !== "1" && eqQ(abs, ONE) ? "" : plainQ(abs);
      const body = key === "1" ? coef : `${coef}${k === 2 ? "√" : "∛"}${r}`;
      return i === 0 ? `${c.n < 0 ? "−" : ""}${body}` : `${c.n < 0 ? " − " : " + "}${body}`;
    })
    .join("");
}

/** The prime factors under the root; each full group of k equal primes leaves the root as one. */
function groupsPicture(k: number, n: number, y0: number): { svg: string; h: number } | null {
  const primes = factorize(n).flatMap(([p, e]) => Array<number>(e).fill(p));
  if (primes.length > 14) return null;
  const groups: number[][] = [];
  const left: number[] = [];
  for (const [p, e] of factorize(n)) {
    for (let i = 0; i < Math.floor(e / k); i++) groups.push(Array<number>(k).fill(p));
    for (let i = 0; i < e % k; i++) left.push(p);
  }
  const colors = new Map(factorize(n).map(([p], i) => [p, PALETTE[i % PALETTE.length]]));
  const CW = 30;
  const GAP = 4;
  const outW = groups.length * (CW + 14) - 14;
  const xs = Math.max(24 + outW + 70, (W - (primes.length * (CW + GAP) + groups.length * 12)) / 2);
  const yc = y0 + 46;
  const parts: string[] = [];
  let x = xs;
  const tops: number[] = [];
  for (const g of groups) {
    const gw = g.length * (CW + GAP) - GAP;
    parts.push(`<rect x="${x - 4}" y="${yc - 4}" width="${gw + 8}" height="${CW + 8}" rx="9" fill="none" stroke="${colors.get(g[0])}" stroke-dasharray="3 3"/>`);
    tops.push(x + gw / 2);
    for (const p of g) (parts.push(chip(x, yc, String(p), colors.get(p)!, false, CW, CW)), (x += CW + GAP));
    x += 12;
  }
  const xl = x;
  for (const p of left) (parts.push(chip(x, yc, String(p), colors.get(p)!, false, CW, CW)), (x += CW + GAP));
  const xe = x - GAP;
  // The root sign over all of them.
  parts.push(`<path d="M${xs - 40},${yc + 18} L${xs - 33},${yc + 13} L${xs - 22},${yc + CW + 6} L${xs - 10},${yc - 14} L${r2(xe + 8)},${yc - 14}" fill="none" stroke="${C.ink}" stroke-width="2"/>`);
  if (k === 3) parts.push(text(xs - 38, yc + 4, "3", { size: 11, bold: true }));
  // Outside: one prime per group, with an arrow from its group.
  let ox = xs - 50 - outW;
  groups.forEach((g, i) => {
    const color = colors.get(g[0])!;
    parts.push(chip(ox, yc, String(g[0]), color, false, CW, CW));
    parts.push(`<path d="M${r2(tops[i])},${yc - 8} C${r2(tops[i])},${yc - 44} ${r2(ox + CW / 2)},${yc - 44} ${r2(ox + CW / 2)},${yc - 6}" fill="none" stroke="${color}" stroke-width="1.6" opacity="0.8"/>`);
    parts.push(`<path d="M${r2(ox + CW / 2)},${yc - 4} l-4,-8 l8,0 Z" fill="${color}"/>`);
    if (i < groups.length - 1) parts.push(text(ox + CW + 7, yc + 20, "·", { anchor: "middle", size: 18, bold: true }));
    ox += CW + 14;
  });
  const out = groups.reduce((acc, g) => acc * g[0], 1);
  const inner = left.reduce((acc, p) => acc * p, 1);
  parts.push(
    text(xs - 50 - outW / 2, yc + CW + 24, fill(words.surds.outside, { v: groups.length > 1 ? `${groups.map((g) => g[0]).join(" · ")} = ${out}` : `${out}` }), { anchor: "middle", size: 12, color: "#495057", bold: true }),
    text((xl + xe) / 2, yc + CW + 24, fill(words.surds.inside, { v: left.length > 1 ? `${left.join(" · ")} = ${inner}` : `${inner}` }), { anchor: "middle", size: 12, color: "#495057", bold: true }),
  );
  return { svg: parts.join(""), h: CW + 80 };
}

// ---------- numbers q·eᵗ·(roots), for logarithms ----------

/** q · eᵗ · Π pᶠ: rational numbers, e, e³, 2e, √e, and roots such as √2 or ∛9 (f between 0 and 1). */
type EV = { q: Q; t: Q; rad: [number, Q][] };
const EV1: EV = { q: ONE, t: ZERO, rad: [] };
/** Whole parts of the prime exponents go into q, the fractional parts stay as roots. */
function evNorm(qv: Q, t: Q, rad: Map<number, Q>): EV {
  let out = qv;
  const keep: [number, Q][] = [];
  for (const [p, e] of [...rad].sort((a, b) => a[0] - b[0])) {
    const whole = Math.floor(e.n / e.d);
    out = mul(out, qpow(q(p), whole));
    const f = sub(e, q(whole));
    if (!isZero(f)) keep.push([p, f]);
  }
  return { q: out, t, rad: keep };
}
const radMap = (a: EV, k = ONE) => new Map(a.rad.map(([p, e]) => [p, mul(e, k)]));
function evMul(a: EV, b: EV): EV {
  const m = radMap(a);
  for (const [p, e] of b.rad) m.set(p, add(m.get(p) ?? ZERO, e));
  return evNorm(mul(a.q, b.q), add(a.t, b.t), m);
}
const evInv = (a: EV): EV => evNorm(div(ONE, a.q), neg(a.t), radMap(a, q(-1)));
const evDiv = (a: EV, b: EV): EV => evMul(a, evInv(b));
/** aʳ, or null for an even root of a negative number. */
function evPow(a: EV, r: Q): EV | null {
  if (isInt(r)) return evNorm(qpow(a.q, r.n), mul(a.t, r), radMap(a, r));
  if (a.q.n < 0) return null;
  const root = qroot(a.q, r.d);
  if (root) return evNorm(qpow(root, r.n), mul(a.t, r), radMap(a, r));
  // Not a whole root: the primes of q move under the root sign.
  const m = radMap(a, r);
  for (const [p, e] of factorize(a.q.n)) m.set(p, add(m.get(p) ?? ZERO, mul(q(e), r)));
  for (const [p, e] of factorize(a.q.d)) m.set(p, sub(m.get(p) ?? ZERO, mul(q(e), r)));
  return evNorm(ONE, mul(a.t, r), m);
}
const evNum = (a: EV) => num(a.q) * Math.exp(num(a.t)) * a.rad.reduce((acc, [p, e]) => acc * p ** num(e), 1);
const evIsOne = (a: EV) => eqQ(a.q, ONE) && isZero(a.t) && !a.rad.length;
function evalEV(n: Node): EV | null {
  const c = constQ(n);
  if (c) return { q: c, t: ZERO, rad: [] };
  switch (n.k) {
    case "var":
      return n.name === "e" ? { q: ONE, t: ONE, rad: [] } : null;
    case "paren":
      return evalEV(n.a);
    case "neg": {
      const a = evalEV(n.a);
      return a && { ...a, q: neg(a.q) };
    }
    case "mul": {
      const a = evalEV(n.a);
      const b = evalEV(n.b);
      return a && b && evMul(a, b);
    }
    case "div": {
      const a = evalEV(n.a);
      const b = evalEV(n.b);
      return a && b && !isZero(b.q) ? evDiv(a, b) : null;
    }
    case "pow": {
      const a = evalEV(n.a);
      const r = constQ(n.b);
      return a && r && !(isZero(a.q) && r.n <= 0) ? evPow(a, r) : null;
    }
    case "root": {
      const a = evalEV(n.a);
      return a && evPow(a, q(1, n.n));
    }
    default:
      return null;
  }
}
/** The roots part, grouped under one sign per index: √6, ∛(2²·3) → ∛12. */
function radParts(a: EV): { k: number; inner: number }[] {
  const byK = new Map<number, number>();
  for (const [p, e] of a.rad) byK.set(e.d, (byK.get(e.d) ?? 1) * p ** e.n);
  return [...byK].map(([k, inner]) => ({ k, inner }));
}
function texEV(a: EV): string {
  const e = isZero(a.t) ? "" : eqQ(a.t, ONE) ? "e" : `e^{${texExp(a.t)}}`;
  const roots = radParts(a).map(({ k, inner }) => (k === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${k}]{${inner}}`)).join("");
  const rest = e + roots;
  if (!rest) return texQ(a.q);
  if (eqQ(a.q, ONE)) return rest;
  if (eqQ(a.q, q(-1))) return `-${rest}`;
  return a.q.d === 1 ? `${a.q.n}${rest}` : `\\frac{${a.q.n < 0 ? "-" : ""}${Math.abs(a.q.n) === 1 ? "" : Math.abs(a.q.n)}${rest}}{${a.q.d}}`;
}
function plainEV(a: EV): string {
  const e = isZero(a.t) ? "" : `e${eqQ(a.t, ONE) ? "" : `^${plainQ(a.t)}`}`;
  const roots = radParts(a).map(({ k, inner }) => `${k === 2 ? "√" : k === 3 ? "∛" : `${k}√`}${inner}`).join("·");
  const rest = e + roots;
  if (!rest) return plainQ(a.q);
  return eqQ(a.q, ONE) ? rest : `${plainQ(a.q)}${rest}`;
}
/** A base in LaTeX ready for a power: (√2)^r, (1/2)^r, 3^r. */
const baseTex = (a: EV) => {
  const t = texEV(a);
  return /^\d+$|^e$/.test(t) ? t : `\\left(${t}\\right)`;
};
/** Exponents of the primes (and of e): 72 → {2: 3, 3: 2}, √2 → {2: 1/2}. */
function evVec(a: EV): Map<string, Q> {
  const v = new Map<string, Q>();
  const put = (k: string, e: Q) => {
    const x = add(v.get(k) ?? ZERO, e);
    if (isZero(x)) v.delete(k);
    else v.set(k, x);
  };
  for (const [p, e] of factorize(a.q.n)) put(String(p), q(e));
  for (const [p, e] of factorize(a.q.d)) put(String(p), q(-e));
  for (const [p, e] of a.rad) put(String(p), e);
  if (!isZero(a.t)) v.set("e", a.t);
  return v;
}
/** r with bʳ = x exactly, or null. */
function exactLog(b: EV, x: EV): Q | null {
  const vb = evVec(b);
  const vx = evVec(x);
  if (!vb.size) return null;
  const [k0, e0] = [...vb][0];
  const r = div(vx.get(k0) ?? ZERO, e0);
  for (const k of new Set([...vb.keys(), ...vx.keys()])) if (!eqQ(vx.get(k) ?? ZERO, mul(r, vb.get(k) ?? ZERO))) return null;
  return r;
}
/** b = cᵍ with the smallest c > 1 (8 = 2³, 1/9 = 3⁻²). */
function primitive(b: EV): { c: EV; g: number } {
  const vb = evVec(b);
  const es = [...vb.values()];
  if (!es.length || !es.every(isInt)) return { c: b, g: 1 };
  let g = es.reduce((acc, e) => gcd(acc, e.n), 0);
  if (evNum(b) < 1) g = -g;
  const c = evPow(b, q(1, g));
  return c ? { c, g } : { c: b, g: 1 };
}
const evKey = (a: EV) => `${a.q.n}/${a.q.d}e${a.t.n}/${a.t.d}r${a.rad.map(([p, e]) => `${p}^${e.n}/${e.d}`).join(",")}`;

// ---------- logarithms ----------

type LogTerm = { c: Q; base: EV; arg: EV; fn: "ln" | "lg" | "log" };
/** The base as written: \log_{2}, \log (ten), \ln. */
function logName(t: { base: EV; fn: "ln" | "lg" | "log" }): string {
  if (t.fn === "ln") return "\\ln";
  if (t.fn === "lg") return "\\log";
  return `\\log_{${texEV(t.base)}}`;
}
const argTex = (x: string) => (/^[\d.]+$|^e$/.test(x) ? ` ${x}` : `\\left(${x}\\right)`);

/** Signed terms of a sum: c·log(…) or a constant. */
function logTerms<T>(n: Node, sign: Q, onLog: (c: Q, log: Extract<Node, { k: "log" }>) => T, onConst: (c: Q, node: Node) => T, form: string): T[] {
  n = strip(n);
  if (n.k === "add") return [...logTerms(n.a, sign, onLog, onConst, form), ...logTerms(n.b, n.op === "+" ? sign : neg(sign), onLog, onConst, form)];
  if (n.k === "neg") return logTerms(n.a, neg(sign), onLog, onConst, form);
  if (n.k === "log") return [onLog(sign, n)];
  if (n.k === "mul" || n.k === "div") {
    const [a, b] = [strip(n.a), strip(n.b)];
    const ca = constQ(a);
    const cb = constQ(b);
    if (n.k === "mul" && ca && b.k === "log") return [onLog(mul(sign, ca), b)];
    if (n.k === "mul" && cb && a.k === "log") return [onLog(mul(sign, cb), a)];
    if (n.k === "div" && cb && !isZero(cb) && a.k === "log") return [onLog(div(sign, cb), a)];
  }
  if (!hasVar(n) && !(n.k === "var" && n.name === "e")) {
    const c = constQ(n);
    if (c) return [onConst(mul(sign, c), n)];
  }
  throw new Error(form);
}
function logBase(n: Extract<Node, { k: "log" }>): { base: EV; fn: "ln" | "lg" | "log" } {
  if (n.ln) return { base: { q: ONE, t: ONE, rad: [] }, fn: "ln" };
  if (!n.base) return { base: { q: q(10), t: ZERO, rad: [] }, fn: "lg" };
  const b = evalEV(n.base);
  if (!b || b.q.n <= 0 || evIsOne(b)) throw new Error(words.logs.base);
  return { base: b, fn: "log" };
}

function renderLogs(s: PowersSpec, w: PowersWords): RenderedSvg {
  const Lw = w.logs;
  const node = parseExpr(s.src);
  if (hasVar(node)) throw new Error(Lw.form);
  const terms: LogTerm[] = [];
  let konst = ZERO;
  logTerms(
    node,
    ONE,
    (c, log) => {
      const { base, fn } = logBase(log);
      const arg = evalEV(log.a);
      if (!arg || arg.q.n <= 0) throw new Error(Lw.positive);
      terms.push({ c, base, arg, fn });
    },
    (c) => (konst = add(konst, c)),
    Lw.form,
  );
  if (!terms.length) throw new Error(Lw.form);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const header = texNode(node);

  const exprTex = (ts: { c: Q; tex: string }[]) => {
    const parts = ts.map((t, i) => {
      const a = absQ(t.c);
      const coef = eqQ(a, ONE) ? "" : `${texQ(a)} `;
      const s = t.c.n < 0 ? "-" : i === 0 ? "" : "+";
      return `${i === 0 ? s : `${s} `}${coef}${t.tex}`;
    });
    if (!isZero(konst)) parts.push(konst.n < 0 ? `- ${texQ(neg(konst))}` : `+ ${texQ(konst)}`);
    return parts.join(" ");
  };
  const show = (ts: LogTerm[], arg: (t: LogTerm) => string = (t) => texEV(t.arg)) => exprTex(ts.map((t) => ({ c: t.c, tex: `${logName(t)}${argTex(arg(t))}` })));

  // 1. Power rule: k·log x = log xᵏ (when xᵏ stays exact), within each base that has more than one log.
  const byBase = new Map<string, LogTerm[]>();
  for (const t of terms) byBase.set(evKey(t.base), [...(byBase.get(evKey(t.base)) ?? []), t]);
  let cur = terms;
  const condensable = (g: LogTerm[]) => g.length > 1 && g.every((t) => evPow(t.arg, absQ(t.c)));
  const powered = cur.map((t) => condensable(byBase.get(evKey(t.base))!) && !eqQ(absQ(t.c), ONE));
  if (powered.some(Boolean)) {
    const unit = (t: LogTerm, i: number) => (powered[i] ? { ...t, c: q(Math.sign(t.c.n)) } : t);
    const raised = (t: LogTerm, i: number) => (powered[i] ? `${argTex(texEV(t.arg)).trim()}^{${texExp(absQ(t.c))}}` : texEV(t.arg));
    rows.push({ tex: `= ${exprTex(cur.map((t, i) => ({ c: unit(t, i).c, tex: `${logName(t)} ${raised(t, i)}` })))}`, op: Lw.powerRule });
    cur = cur.map((t, i) => (powered[i] ? { ...unit(t, i), arg: evPow(t.arg, absQ(t.c))! } : t));
    rows.push({ tex: `= ${show(cur)}` });
  }
  // 2. Product and quotient rules: one log per base.
  const groups = [...new Set(cur.map((t) => evKey(t.base)))].map((k) => cur.filter((t) => evKey(t.base) === k));
  if (groups.some((g) => g.length > 1 && g.every((t) => eqQ(absQ(t.c), ONE)))) {
    const merged: LogTerm[] = [];
    const fracs: { c: Q; tex: string }[] = [];
    for (const g of groups) {
      if (g.length === 1 || !g.every((t) => eqQ(absQ(t.c), ONE))) {
        merged.push(...g);
        fracs.push(...g.map((t) => ({ c: t.c, tex: `${logName(t)}${argTex(texEV(t.arg))}` })));
        continue;
      }
      // All negative: −(log a + log b) = −log ab.
      const allNeg = g.every((t) => t.c.n < 0);
      const ups = g.filter((t) => (t.c.n > 0) !== allNeg).map((t) => texEV(t.arg));
      const downs = g.filter((t) => (t.c.n > 0) === allNeg).map((t) => texEV(t.arg));
      const prod = (xs: string[]) => (xs.length ? xs.join(" \\cdot ") : "1");
      const inner = downs.length ? `\\frac{${prod(ups)}}{${prod(downs)}}` : prod(ups);
      fracs.push({ c: allNeg ? q(-1) : ONE, tex: `${logName(g[0])}\\left(${inner}\\right)` });
      const arg = g.reduce((acc, t) => ((t.c.n > 0) !== allNeg ? evMul(acc, t.arg) : evDiv(acc, t.arg)), EV1);
      merged.push({ ...g[0], c: allNeg ? q(-1) : ONE, arg });
    }
    rows.push({ tex: `= ${exprTex(fracs)}`, op: Lw.productRule });
    cur = merged;
    rows.push({ tex: `= ${show(cur)}` });
  }

  // 3. Each log: which power of the base gives the number?
  const values: { exact: Q | null; v: number }[] = [];
  for (const t of cur) {
    const r = exactLog(t.base, t.arg);
    const name = `${logName(t)}${argTex(texEV(t.arg))}`;
    const bt = baseTex(t.base);
    const xt = texEV(t.arg);
    if (r) {
      const { c, g } = primitive(t.base);
      const m = exactLog(c, t.arg)!;
      const chain = g === 1 || evIsOne(t.arg)
        ? `${bt}^{r} = ${xt}${evIsOne(t.arg) || evKey(t.arg) === evKey(t.base) ? "" : ` = ${bt}^{${texExp(r)}}`}`
        : `${bt}^{r} = ${xt} \\;\\Leftrightarrow\\; ${baseTex(c)}^{${g === -1 ? "-" : g}r} = ${baseTex(c)}^{${texExp(m)}}`;
      rows.push({ tex: `${name}:\\; ${chain} \\;\\Rightarrow\\; r = ${texQ(r)}`, op: g === 1 || evIsOne(t.arg) ? Lw.asPower : fill(Lw.commonBase, { c: plainEV(c) }), color: C.purple });
      values.push({ exact: r, v: num(r) });
    } else {
      const v = Math.log(evNum(t.arg)) / Math.log(evNum(t.base));
      const tex = t.fn === "log" ? `${name} = \\frac{\\ln ${argTex(xt).trim()}}{\\ln ${argTex(texEV(t.base)).trim()}} \\approx ${approx(v).replace("−", "-")}` : `${name} \\approx ${approx(v).replace("−", "-")}`;
      rows.push({ tex, op: t.fn === "log" ? Lw.changeBase : undefined, color: C.purple });
      values.push({ exact: null, v });
    }
  }
  const exact = values.every((v) => v.exact);
  let total = 0;
  let totalQ = konst;
  cur.forEach((t, i) => {
    total += num(t.c) * values[i].v;
    if (values[i].exact) totalQ = add(totalQ, mul(t.c, values[i].exact!));
  });
  total += num(konst);
  if (cur.length > 1 || !isZero(konst) || !eqQ(cur[0].c, ONE)) {
    const parts = exprTex(cur.map((t, i) => ({ c: t.c, tex: values[i].exact ? (values[i].exact!.n < 0 || !isInt(values[i].exact!) ? `\\left(${texQ(values[i].exact!)}\\right)` : texQ(values[i].exact!)) : approx(values[i].v).replace("−", "-") })));
    rows.push({ tex: `${exact ? "=" : "\\approx"} ${parts}` });
  }
  rows.push({ tex: exact ? `= ${texQ(totalQ)}` : `\\approx ${approx(total).replace("−", "-")}`, color: C.green });

  // Between two whole powers, for a log that isn't exact.
  const firstInexact = cur.find((_, i) => !values[i].exact);
  if (firstInexact && isZero(firstInexact.base.t) && isInt(firstInexact.base.q) && firstInexact.base.q.n > 1 && isZero(firstInexact.arg.t) && num(firstInexact.arg.q) > 1) {
    const b = firstInexact.base.q.n;
    const x = num(firstInexact.arg.q);
    const k = Math.floor(Math.log(x) / Math.log(b) + 1e-12);
    if (k <= 9) {
      const sup = (e: number) => `${b}${SUPER[e]}`;
      caps.push({ text: fill(Lw.between, { lo: `${sup(k)} = ${b ** k}`, x: plainQ(firstInexact.arg.q), hi: `${b ** (k + 1)} = ${sup(k + 1)}`, a: k, b: k + 1 }), color: C.blue });
    }
  }

  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;
  const t0 = cur[0];
  const pic = logGraph(evNum(t0.base), evNum(t0.arg), values[0].v, plainEV(t0.base), y);
  if (pic) {
    body.push(pic.svg);
    y += pic.h;
    caps.push({ text: fill(pic.mirrored ? Lw.mirror : Lw.graph, { x: approx(evNum(t0.arg), 3), r: approx(values[0].v, 3), b: plainEV(t0.base) }), color: "#495057" });
  }
  caps.push({ text: fill(w.approx, { l: approx(evalNode(node, {}), 6), r: approx(total, 6) }), color: C.green });
  return compose(header, body.join(""), y, caps);
}

/** y = log_b x through (x, r); with y = bˣ mirrored in y = x when the numbers are small. */
function logGraph(b: number, x: number, r: number, name: string, y0: number): { svg: string; h: number; mirrored: boolean } | null {
  if (!(b > 0) || b === 1 || !(x > 0) || !Number.isFinite(r)) return null;
  const log = (t: number) => Math.log(t) / Math.log(b);
  const exp = (t: number) => b ** t;
  const parts: string[] = [];
  const mirrored = x <= 10 && Math.abs(r) <= 10 && x >= 0.1;
  let fr;
  if (mirrored) {
    const hi = Math.max(4, x + 1, r + 1);
    const lo = Math.min(-2, r - 1);
    const size = 300;
    fr = makeFrame(`lg-${Math.round(x * 100)}`, (W - size) / 2, y0 + 6, size, size, [lo, hi], [lo, hi]);
    parts.push(
      axes(fr, true),
      curve(fr, (t) => t, "#adb5bd", 1.4, `stroke-dasharray="6 5"`),
      curve(fr, exp, C.orange, 2.4),
      curve(fr, log, C.blue, 2.6),
      `<line x1="${r2(fr.sx(x))}" y1="${r2(fr.sy(r))}" x2="${r2(fr.sx(r))}" y2="${r2(fr.sy(x))}" stroke="#868e96" stroke-dasharray="3 4"/>`,
      dot(fr.sx(r), fr.sy(x), C.orange, 5),
      dot(fr.sx(x), fr.sy(r), C.blue, 5),
      lbl(fr.right - 6, fr.sy(log(hi)) - 8, name === "e" ? "y = ln x" : /^\d+$/.test(name) ? `y = log${subDigits(name)} x` : `y = log_(${name}) x`, C.blue, "end", 13, false),
      lbl(fr.sx(Math.min(log(hi * 0.9), hi)) + 8, fr.top + 16, /^[\d.e]+$/.test(name) ? `y = ${name}ˣ` : `y = (${name})ˣ`, C.orange, "start", 13, false),
      lbl(fr.right - 6, fr.top + 14, "y = x", "#868e96", "end", 12, false),
    );
  } else {
    const hi = x * 1.25;
    const ys = [log(Math.max(hi / 400, 1e-9)), log(hi), 0, r];
    const lo = Math.min(...ys);
    const top = Math.max(...ys);
    const pad = (top - lo) * 0.1 || 1;
    fr = makeFrame(`lg-${Math.round(x)}`, 48, y0 + 6, W - 48 - 24, 240, [0, hi], [lo - pad, top + pad]);
    parts.push(
      axes(fr),
      curve(fr, log, C.blue, 2.6),
      `<line x1="${r2(fr.sx(x))}" y1="${r2(fr.sy(0))}" x2="${r2(fr.sx(x))}" y2="${r2(fr.sy(r))}" stroke="#868e96" stroke-dasharray="3 4"/>`,
      dot(fr.sx(x), fr.sy(r), C.blue, 5),
    );
  }
  return { svg: parts.join(""), h: fr.bottom - y0 + 22, mirrored };
}
const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const subDigits = (s: string) => s.replace(/\d/g, (d) => SUBS[Number(d)]);

// ---------- exponential and logarithmic equations ----------

type Poly = Q[]; // coefficient of x^i at index i
const ptrim = (p: Poly): Poly => {
  const r = [...p];
  while (r.length > 1 && isZero(r[r.length - 1])) r.pop();
  return r.length ? r : [ZERO];
};
const pco = (p: Poly, i: number) => p[i] ?? ZERO;
const pdeg = (p: Poly) => ptrim(p).length - 1;
const padd = (a: Poly, b: Poly) => ptrim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => add(pco(a, i), pco(b, i))));
const pscale = (a: Poly, k: Q) => ptrim(a.map((c) => mul(c, k)));
const pmul = (a: Poly, b: Poly): Poly => {
  const r: Q[] = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] = add(r[i + j], mul(x, y)))));
  return ptrim(r);
};
const pval = (p: Poly, x: number) => p.reduceRight((acc, c) => acc * x + num(c), 0);
function polyTex(p: Poly): string {
  const t = ptrim(p);
  const parts: string[] = [];
  for (let k = t.length - 1; k >= 0; k--) {
    const c = t[k];
    if (isZero(c)) continue;
    const s = c.n < 0 ? "-" : parts.length ? "+" : "";
    const a = absQ(c);
    const xs = k === 0 ? "" : k === 1 ? "x" : `x^{${k}}`;
    const coef = k > 0 && eqQ(a, ONE) ? "" : texQ(a);
    parts.push(`${parts.length ? `${s} ` : s}${coef}${xs}`);
  }
  return parts.length ? parts.join(" ") : "0";
}
const plainPoly = (p: Poly) => minus(polyTex(p).replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2").replace(/x\^\{(\d+)\}/g, (_, d: string) => `x${SUPER[Number(d)]}`));

/** A linear (or constant) expression in x, or null. */
function linear(n: Node): Poly | null {
  const c = constQ(n);
  if (c) return [c];
  switch (n.k) {
    case "var":
      return n.name === "x" ? [ZERO, ONE] : null;
    case "paren":
      return linear(n.a);
    case "neg": {
      const a = linear(n.a);
      return a && pscale(a, q(-1));
    }
    case "add": {
      const a = linear(n.a);
      const b = linear(n.b);
      return a && b && padd(a, n.op === "+" ? b : pscale(b, q(-1)));
    }
    case "mul": {
      const a = linear(n.a);
      const b = linear(n.b);
      if (!a || !b || pdeg(a) + pdeg(b) > 1) return null;
      return pmul(a, b);
    }
    case "div": {
      const a = linear(n.a);
      const b = constQ(n.b);
      return a && b && !isZero(b) ? pscale(a, div(ONE, b)) : null;
    }
    default:
      return null;
  }
}

function checkLetters(n: Node) {
  const walk = (m: Node) => {
    if (m.k === "var" && m.name !== "x" && m.name !== "e") throw new Error(words.eq.noX);
    for (const c of Object.values(m)) if (c && typeof c === "object" && "k" in c) walk(c as Node);
  };
  walk(n);
}
const hasLog = (n: Node): boolean => n.k === "log" || Object.values(n).some((c) => c && typeof c === "object" && "k" in c && hasLog(c as Node));

/** Linear equation a·x + b = c·x + d, solved with one or two lines. */
function solveLinear(l: Poly, r: Poly, rows: TexLine[], w: PowersWords): Q | "every" | "none" {
  const a = sub(pco(l, 1), pco(r, 1));
  const b = sub(pco(r, 0), pco(l, 0));
  if (isZero(a)) return isZero(b) ? "every" : "none";
  if (!eqQ(a, ONE) || !isZero(pco(r, 1)) || !isZero(pco(l, 0))) rows.push({ tex: `${polyTex([ZERO, a])} = ${texQ(b)}`, op: w.eq.solve });
  const x = div(b, a);
  rows.push({ tex: `x = ${texQ(x)}` });
  return x;
}

/** One side of b^(p) = …: coefficient · base^(linear), or a constant. */
type ExpSide = { k: EV; base: EV | null; p: Poly; node: Node };
function expSide(n: Node, w: PowersWords): ExpSide {
  const side: ExpSide = { k: EV1, base: null, p: [ZERO], node: n };
  const walk = (m: Node, inv: boolean): void => {
    m = strip(m);
    if (m.k === "mul") return walk(m.a, inv), walk(m.b, inv);
    if (m.k === "div") return walk(m.a, inv), walk(m.b, !inv);
    if (m.k === "pow" && hasVar(m.b, "x")) {
      const b = evalEV(m.a);
      const p = linear(m.b);
      if (!b || b.q.n <= 0 || evIsOne(b)) throw new Error(w.eq.expForm);
      if (!p) throw new Error(w.eq.linearOnly);
      if (side.base && evKey(side.base) !== evKey(b)) throw new Error(w.eq.expForm);
      side.base = b;
      side.p = padd(side.p, inv ? pscale(p, q(-1)) : p);
      return;
    }
    if (hasVar(m, "x")) throw new Error(w.eq.expForm);
    const v = evalEV(m);
    if (!v || isZero(v.q)) throw new Error(w.eq.expForm);
    side.k = inv ? evDiv(side.k, v) : evMul(side.k, v);
  };
  walk(n, false);
  return side;
}

function renderEquation(s: PowersSpec, w: PowersWords): RenderedSvg {
  const E = w.eq;
  const parts = splitEq(normal(s.src));
  if (!parts) throw new Error(E.needEq);
  const [L, R] = parts.map(parseExpr);
  checkLetters(L);
  checkLetters(R);
  if (!hasVar(L, "x") && !hasVar(R, "x")) throw new Error(E.noX);
  const typed = parts.map((p) => minus(p.trim()).replace(/\*/g, "·")) as [string, string];
  return hasLog(L) || hasLog(R) ? renderLogEquation(L, R, w, typed) : renderExpEquation(L, R, w, typed);
}

function renderExpEquation(L0: Node, R0: Node, w: PowersWords, typed: [string, string]): RenderedSvg {
  const E = w.eq;
  let [L, R] = [expSide(L0, w), expSide(R0, w)];
  if (!L.base) [L, R] = [R, L];
  if (!L.base) throw new Error(E.expForm);
  const header = `${texNode(L0)} = ${texNode(R0)}`;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const b = L.base;
  const powTex = (base: EV, p: Poly) => `${baseTex(base)}^{${polyTex(p)}}`;
  // 1. Divide by the number in front.
  const K = evDiv(R.k, L.k);
  if (!evIsOne(L.k)) {
    rows.push({ tex: `${powTex(b, L.p)} = ${R.base ? `${evIsOne(K) ? "" : texEV(K)}${powTex(R.base, R.p)}` : texEV(K)}`, op: fill(E.divideBy, { k: plainEV(L.k) }) });
  }
  let solution: number | null = null;
  let exactSolution = false;
  let every = false;
  if (K.q.n <= 0) {
    caps.push({ text: E.positive, color: C.red });
  } else {
    const { c, g } = primitive(b);
    const delta = R.base ? exactLog(c, R.base) : ZERO;
    const kappa = exactLog(c, K);
    if (delta && kappa) {
      // 2a. Everything as a power of one base: equate the exponents.
      const ct = baseTex(c);
      const lhs = g === 1 ? `${ct}^{${polyTex(L.p)}}` : `\\left(${ct}^{${g}}\\right)^{${polyTex(L.p)}}`;
      const kt = isZero(kappa) ? "" : `${ct}^{${texExp(kappa)}}`;
      const dt = !R.base ? "" : eqQ(delta, ONE) ? `${ct}^{${polyTex(R.p)}}` : `\\left(${ct}^{${texExp(delta)}}\\right)^{${polyTex(R.p)}}`;
      const rhs = [kt, dt].filter(Boolean).join(" \\cdot ") || `${ct}^{0}`;
      const lp = pscale(L.p, q(g));
      const rp = R.base ? padd([kappa], pscale(R.p, delta)) : [kappa];
      if (`${lhs} = ${rhs}` !== `${powTex(b, L.p)} = ${R.base ? powTex(R.base, R.p) : texEV(K)}`) rows.push({ tex: `${lhs} = ${rhs}`, op: fill(E.rewrite, { c: plainEV(c) }) });
      if (g !== 1 || (R.base && !eqQ(delta, ONE)) || (kt && dt)) rows.push({ tex: `${ct}^{${polyTex(lp)}} = ${ct}^{${polyTex(rp)}}`, op: w.laws.powerPower });
      rows.push({ tex: `${polyTex(lp)} = ${polyTex(rp)}`, op: E.equate });
      const x = solveLinear(lp, rp, rows, w);
      if (x === "every") every = true;
      else if (x !== "none") (solution = num(x)), (exactSolution = true);
    } else {
      // 2b. Take logarithms.
      const lnb = Math.log(evNum(b));
      const lnK = Math.log(evNum(K));
      if (!R.base) {
        const logK = b.q.n === 1 && b.q.d === 1 && eqQ(b.t, ONE) ? `\\ln ${argTex(texEV(K)).trim()}` : `\\log_{${texEV(b)}} ${argTex(texEV(K)).trim()}`;
        rows.push({ tex: `${polyTex(L.p)} = ${logK}`, op: eqQ(b.t, ONE) && eqQ(b.q, ONE) ? E.takeLn : fill(E.takeLog, { b: plainEV(b) }) });
        const [p0, p1] = [pco(L.p, 0), pco(L.p, 1)];
        const v = (lnK / lnb - num(p0)) / num(p1);
        if (!isZero(p0) || !eqQ(p1, ONE)) {
          const top = isZero(p0) ? logK : `${logK} ${p0.n < 0 ? "+" : "-"} ${texQ(absQ(p0))}`;
          rows.push({ tex: eqQ(p1, ONE) ? `x = ${top}` : `x = \\frac{${top}}{${texQ(p1)}}`, op: E.solve });
        }
        rows.push({ tex: `x \\approx ${approx(v).replace("−", "-")}` });
        solution = v;
      } else {
        const d = R.base;
        const lnd = Math.log(evNum(d));
        const lnTex = (v: EV) => (eqQ(v.q, ONE) && eqQ(v.t, ONE) ? "" : `\\ln ${argTex(texEV(v)).trim()}`);
        const factor = (p: Poly, v: EV) => {
          const ln = lnTex(v);
          const pt = polyTex(p);
          if (!ln) return pt;
          return /[+-]/.test(pt.slice(1)) ? `\\left(${pt}\\right) ${ln}` : `${pt} ${ln}`;
        };
        rows.push({ tex: `${factor(L.p, b)} = ${evIsOne(K) ? "" : `${lnTex(K) || "1"} + `}${factor(R.p, d)}`, op: E.takeLn });
        const a = num(pco(L.p, 1)) * lnb - num(pco(R.p, 1)) * lnd;
        const rhs = (evIsOne(K) ? 0 : lnK) + num(pco(R.p, 0)) * lnd - num(pco(L.p, 0)) * lnb;
        if (Math.abs(a) < 1e-12) {
          every = Math.abs(rhs) < 1e-12;
        } else {
          const v = rhs / a;
          // x = (ln K + q₀ ln d − p₀ ln b) / (p₁ ln b − q₁ ln d), written with the logs.
          const combo = (ts: [Q, EV][]) => {
            const out = ts
              .filter(([c, v]) => !isZero(c) && !evIsOne(v))
              .map(([c, v], i) => {
                const a = absQ(c);
                const term = `${eqQ(a, ONE) ? "" : texQ(a)}${lnTex(v) || "1"}`;
                return `${c.n < 0 ? "-" : i ? "+" : ""}${i ? " " : ""}${term}`;
              })
              .join(" ");
            return out || "0";
          };
          const numer = combo([[ONE, K], [pco(R.p, 0), d], [neg(pco(L.p, 0)), b]]);
          const denom = combo([[pco(L.p, 1), b], [neg(pco(R.p, 1)), d]]);
          rows.push({ tex: `x = \\frac{${numer}}{${denom}} \\approx ${approx(v).replace("−", "-")}`, op: E.solve });
          solution = v;
        }
      }
    }
  }
  if (solution === null && !every && K.q.n > 0) caps.push({ text: E.noSolution, color: C.red });
  if (every) caps.push({ text: E.every, color: C.green });
  if (rows.length) rows[rows.length - 1].color = solution !== null ? C.green : C.red;
  else rows.push({ tex: `${header}`, color: C.red });

  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;
  const fl = (x: number) => evalNode(L0, { x });
  const fr = (x: number) => evalNode(R0, { x });
  const g = twoGraphs(fl, fr, solution === null ? [] : [solution], [], y, [-Infinity, Infinity], typed);
  body.push(g.svg);
  y += g.h;
  if (solution !== null) caps.push({ text: fill(w.check, { vals: `x ${exactSolution ? "=" : "≈"} ${approx(solution)}`, l: approx(fl(solution), 6), r: approx(fr(solution), 6) }), color: C.green });
  return compose(header, body.join(""), y, caps);
}

type XLog = { c: Q; base: EV; fn: "ln" | "lg" | "log"; arg: Poly };

function renderLogEquation(L0: Node, R0: Node, w: PowersWords, typed: [string, string]): RenderedSvg {
  const E = w.eq;
  const header = `${texNode(L0)} = ${texNode(R0)}`;
  // Logs with x go to the left, everything else to the right.
  const logs: XLog[] = [];
  let n = ZERO;
  let nApprox = 0;
  let nExact = true;
  const collect = (side: Node, sign: Q) =>
    logTerms(
      side,
      sign,
      (c, log) => {
        const { base, fn } = logBase(log);
        if (hasVar(log.a, "x")) {
          const p = linear(log.a);
          if (!p) throw new Error(E.linearOnly);
          logs.push({ c, base, fn, arg: p });
        } else {
          const arg = evalEV(log.a);
          if (!arg || arg.q.n <= 0) throw new Error(w.logs.positive);
          const r = exactLog(base, arg);
          const v = Math.log(evNum(arg)) / Math.log(evNum(base));
          // On the left a constant log moves right: −c·r.
          if (r) n = sub(n, mul(c, r));
          else nExact = false;
          nApprox -= num(c) * v;
        }
      },
      (c) => ((n = sub(n, c)), (nApprox -= num(c))),
      E.logForm,
    );
  collect(L0, ONE);
  collect(R0, q(-1));
  if (!logs.length) throw new Error(E.logForm);
  if (logs.some((t) => evKey(t.base) !== evKey(logs[0].base))) throw new Error(E.logForm);
  if (logs.some((t) => !isInt(t.c))) throw new Error(E.logForm);
  const base = logs[0].base;
  const name = logName(logs[0]);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];

  // 1. Where every log is defined.
  let lo = -Infinity;
  let hi = Infinity;
  for (const t of logs) {
    const bound = -num(pco(t.arg, 0)) / num(pco(t.arg, 1));
    if (num(pco(t.arg, 1)) > 0) lo = Math.max(lo, bound);
    else hi = Math.min(hi, bound);
  }
  const conds = [...new Set(logs.map((t) => `${polyTex(t.arg)} > 0`))].join(",\\; ");
  const fmt = (v: number) => {
    for (let d = 1; d <= 12; d++) if (Math.abs(v * d - Math.round(v * d)) < 1e-9) return texQ(q(Math.round(v * d), d));
    return approx(v).replace("−", "-");
  };
  const dom = lo >= hi ? "\\varnothing" : Number.isFinite(lo) && Number.isFinite(hi) ? `${fmt(lo)} < x < ${fmt(hi)}` : Number.isFinite(lo) ? `x > ${fmt(lo)}` : `x < ${fmt(hi)}`;
  rows.push({ tex: `${conds} \\;\\Rightarrow\\; ${dom}`, op: E.domain, color: C.purple });
  const inDomain = (x: number) => x > lo + 1e-9 && x < hi - 1e-9;

  const roots: { tex: string; v: number; exact?: boolean }[] = [];
  let every = false;
  const leftOnly = strip(L0).k === "log" && strip(R0).k === "log" && logs.length === 2 && isZero(n) && nExact;
  const K = nExact ? evPow(base, n) : null;
  // bⁿ as an exact rational when it is one; otherwise (e², √2) only its value.
  const Kq = K && isZero(K.t) && !K.rad.length ? K.q : null;
  const Kv = evNum(base) ** (nExact ? num(n) : nApprox);
  let P: Poly = [ONE];
  let Qp: Poly = [ONE];
  for (const t of logs) for (let i = 0; i < Math.abs(t.c.n); i++) t.c.n > 0 ? (P = pmul(P, t.arg)) : (Qp = pmul(Qp, t.arg));
  const fac = (t: XLog) => {
    const a = polyTex(t.arg);
    const wrapped = pdeg(t.arg) === 1 && !isZero(pco(t.arg, 0)) && logs.length > 1 ? `\\left(${a}\\right)` : a;
    return Math.abs(t.c.n) === 1 ? wrapped : `${pdeg(t.arg) === 1 && !isZero(pco(t.arg, 0)) ? `\\left(${a}\\right)` : a}^{${Math.abs(t.c.n)}}`;
  };
  const ups = logs.filter((t) => t.c.n > 0).map(fac);
  const downs = logs.filter((t) => t.c.n < 0).map(fac);
  const prod = (xs: string[]) => (xs.length ? xs.join("") : "1");
  const bt = baseTex(base);
  const nt = nExact ? texExp(n) : approx(nApprox).replace("−", "-");
  const kt = K && isZero(K.t) ? texEV(K) : `${bt}^{${nt}}`;
  const showCombine = () => {
    if (logs.length > 1 || !eqQ(logs[0].c, ONE) || (hasLog(R0) && hasVar(R0, "x"))) {
      const inner = downs.length ? `\\frac{${prod(ups)}}{${prod(downs)}}` : prod(ups);
      const op = logs.some((t) => Math.abs(t.c.n) > 1) ? `${w.logs.powerRule}, ${E.combine}` : E.combine;
      rows.push({ tex: `${name}\\left(${inner}\\right) = ${nExact ? texQ(n) : nt}`, op });
    }
    const power = !nExact || (!isZero(n) && !eqQ(n, ONE)) ? `${bt}^{${nt}}` : "";
    const rhs = (k: string) => (downs.length ? `${k === "1" ? "" : k}${prod(downs)}` : k);
    rows.push({ tex: `${prod(ups)} = ${power && power !== kt ? `${rhs(power)} = ` : ""}${rhs(kt)}`, op: E.toExp });
  };
  if (lo >= hi) {
    caps.push({ text: E.noneLeft, color: C.red });
  } else if (!Kq) {
    // 2'. bⁿ is not rational: the same steps with its value.
    showCombine();
    const pf = Array.from({ length: Math.max(P.length, Qp.length) }, (_, i) => num(pco(P, i)) - Kv * num(pco(Qp, i)));
    while (pf.length > 1 && Math.abs(pf[pf.length - 1]) < 1e-12) pf.pop();
    const ftex = (c: number[]) =>
      c
        .map((v, i) => [v, i] as const)
        .reverse()
        .filter(([v]) => Math.abs(v) > 1e-12)
        .map(([v, i], j) => {
          const a = Math.abs(v);
          const coef = i > 0 && Math.abs(a - 1) < 1e-12 ? "" : approx(a);
          return `${v < 0 ? "-" : j ? "+" : ""}${j ? " " : ""}${coef}${i === 0 ? "" : i === 1 ? "x" : `x^{${i}}`}`;
        })
        .join(" ") || "0";
    if (pf.length > 3) throw new Error(E.tooHigh);
    if (pf.length === 1) caps.push({ text: E.noSolution, color: C.red });
    else if (pf.length === 2) {
      if (pdeg(P) > 1 || pdeg(Qp) > 0) rows.push({ tex: `${ftex(pf)} = 0`, op: E.expand });
      const v = -pf[0] / pf[1];
      rows.push({ tex: `x \\approx ${approx(v).replace("−", "-")}`, op: E.solve });
      roots.push({ tex: `${approx(v).replace("−", "-")}`, v });
    } else {
      rows.push({ tex: `${ftex(pf)} = 0`, op: E.expand });
      const D = pf[1] ** 2 - 4 * pf[2] * pf[0];
      if (D < 0) caps.push({ text: E.discNeg, color: C.red });
      else {
        rows.push({ tex: `x = \\frac{${approx(-pf[1]).replace("−", "-")} \\pm \\sqrt{${approx(D).replace("−", "-")}}}{${approx(2 * pf[2]).replace("−", "-")}}`, op: E.solve });
        for (const sgn of [-1, 1]) {
          const v = (-pf[1] + sgn * Math.sqrt(D)) / (2 * pf[2]);
          if (!roots.some((r) => Math.abs(r.v - v) < 1e-12)) roots.push({ tex: `${approx(v).replace("−", "-")}`, v });
        }
        roots.sort((a, b) => a.v - b.v);
      }
    }
  } else {
    // 2. One log on each side, or everything in one log.
    if (leftOnly) rows.push({ tex: `${polyTex(logs[0].arg)} = ${polyTex(logs[1].arg)}`, op: E.sameBase });
    else showCombine();
    const poly = leftOnly ? padd(logs[0].arg, pscale(logs[1].arg, q(-1))) : padd(P, pscale(Qp, neg(Kq)));
    const d = pdeg(poly);
    if (d > 2) throw new Error(E.tooHigh);
    if (d === 0) {
      every = isZero(poly[0]);
      caps.push({ text: every ? E.every : E.noSolution, color: every ? C.green : C.red });
    } else if (d === 1) {
      if (pdeg(P) > 1 || pdeg(Qp) > 1 || !leftOnly) rows.push({ tex: `${polyTex(poly)} = 0`, op: E.expand });
      const x = div(neg(pco(poly, 0)), pco(poly, 1));
      roots.push({ tex: texQ(x), v: num(x), exact: true });
    } else {
      rows.push({ tex: `${polyTex(poly)} = 0`, op: E.expand });
      const [c0, b1, a2] = [pco(poly, 0), pco(poly, 1), pco(poly, 2)];
      const D = sub(mul(b1, b1), mul(q(4), mul(a2, c0)));
      if (D.n < 0) caps.push({ text: E.discNeg, color: C.red });
      else {
        const sq = rootOfQ(2, D);
        const two = mul(q(2), a2);
        rows.push({ tex: `x = \\frac{${texQ(neg(b1))} \\pm \\sqrt{${texQ(D)}}}{${texQ(two)}}`, op: E.solve });
        for (const sgn of [-1, 1]) {
          const v = svAdd(svOf(div(neg(b1), two)), svScale(sq, div(q(sgn), two)));
          if (!roots.some((r) => Math.abs(r.v - svNum(v)) < 1e-12)) roots.push({ tex: texSurd(v), v: svNum(v), exact: svRational(v) });
        }
        roots.sort((a, b) => a.v - b.v);
      }
    }
  }

  // 3. Keep only the roots where every log is defined.
  const valid: number[] = [];
  const rejected: number[] = [];
  const exactRoots = new Set(roots.filter((r) => r.exact).map((r) => r.v));
  roots.forEach((r, i) => {
    const label = roots.length > 1 ? `x_${i + 1}` : "x";
    if (inDomain(r.v)) {
      valid.push(r.v);
      rows.push({ tex: `${label} = ${r.tex}`, op: E.valid, color: C.green });
    } else {
      rejected.push(r.v);
      const bad = logs.find((t) => pval(t.arg, r.v) <= 1e-12)!;
      rows.push({ tex: `${label} = ${r.tex}`, op: fill(E.rejected, { a: plainPoly(bad.arg), v: approx(pval(bad.arg, r.v)) }), color: C.red });
    }
  });
  if (roots.length && !valid.length) caps.push({ text: E.allRejected, color: C.red });
  if (rejected.length) caps.push({ text: E.domainNote, color: C.red });

  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 6;
  const fl = (x: number) => evalNode(L0, { x });
  const fr = (x: number) => evalNode(R0, { x });
  const g = twoGraphs(fl, fr, valid, rejected, y, [lo, hi], typed);
  body.push(g.svg);
  y += g.h;
  for (const v of valid) caps.push({ text: fill(w.check, { vals: `x ${exactRoots.has(v) ? "=" : "≈"} ${approx(v)}`, l: approx(fl(v), 6), r: approx(fr(v), 6) }), color: C.green });
  return compose(header, body.join(""), y, caps);
}

/** Both sides as graphs; solutions where they meet, rejected roots marked on the x-axis. */
function twoGraphs(fl: (x: number) => number, fr: (x: number) => number, good: number[], bad: number[], y0: number, [lo, hi]: number[], [lText, rText]: [string, string]): { svg: string; h: number } {
  const pts = [...good, ...bad, ...[lo, hi].filter(Number.isFinite)];
  let a = pts.length ? Math.min(...pts) : -3;
  let b = pts.length ? Math.max(...pts) : 3;
  const span = Math.max(b - a, 4);
  a -= span * 0.35;
  b += span * 0.35;
  const ys: number[] = [];
  for (let i = 0; i <= 400; i++) {
    const x = a + ((b - a) * i) / 400;
    for (const f of [fl, fr]) {
      const v = f(x);
      if (Number.isFinite(v)) ys.push(v);
    }
  }
  ys.sort((p, q2) => p - q2);
  const must = good.map(fl);
  let ylo = Math.min(ys[Math.floor(ys.length * 0.05)] ?? -1, ...must, 0);
  let yhi = Math.max(ys[Math.ceil(ys.length * 0.95) - 1] ?? 1, ...must, 0);
  if (yhi - ylo < 1e-9) (ylo -= 1), (yhi += 1);
  const pad = (yhi - ylo) * 0.12;
  const fr0 = makeFrame(`eq-${Math.round((a + b) * 10)}`, 48, y0 + 6, W - 48 - 24, 240, [a, b], [ylo - pad, yhi + pad]);
  const parts = [axes(fr0)];
  if (Number.isFinite(lo)) parts.push(`<rect x="${fr0.left}" y="${fr0.top}" width="${r2(Math.max(0, fr0.sx(lo) - fr0.left))}" height="${fr0.bottom - fr0.top}" fill="#f1f3f5" opacity="0.8"/>`);
  if (Number.isFinite(hi)) parts.push(`<rect x="${r2(Math.min(fr0.right, fr0.sx(hi)))}" y="${fr0.top}" width="${r2(Math.max(0, fr0.right - fr0.sx(hi)))}" height="${fr0.bottom - fr0.top}" fill="#f1f3f5" opacity="0.8"/>`);
  parts.push(curve(fr0, fl, C.blue, 2.6), curve(fr0, fr, C.orange, 2.4));
  for (const x of good) parts.push(dot(fr0.sx(x), fr0.sy(fl(x)), C.green, 5.5));
  for (const x of bad) {
    const px = fr0.sx(x);
    const py = Math.min(Math.max(fr0.sy(0), fr0.top), fr0.bottom);
    parts.push(`<path d="M${r2(px - 6)},${r2(py - 6)} l12,12 M${r2(px + 6)},${r2(py - 6)} l-12,12" stroke="${C.red}" stroke-width="2.6"/>`);
  }
  parts.push(lbl(fr0.left + 8, fr0.top + 18, `y = ${lText}`, C.blue, "start", 12.5, false), lbl(fr0.left + 8, fr0.top + 36, `y = ${rText}`, C.orange, "start", 12.5, false));
  return { svg: parts.join(""), h: 240 + 18 };
}

// ---------- entry ----------

export function renderPowers(spec: PowersSpec, w: PowersWords): RenderedSvg {
  words = w;
  switch (spec.topic) {
    case "laws":
      return renderLaws(spec, w);
    case "sci":
      return renderSci(spec, w);
    case "surds":
      return renderSurds(spec, w);
    case "logs":
      return renderLogs(spec, w);
    case "equations":
      return renderEquation(spec, w);
  }
}

const P = (topic: PowersTopic, src: string): PowersSpec => ({ topic, src });
export const POWERS_PRESETS: { [K in PowersTopic]: { label: string; spec: PowersSpec }[] } = {
  laws: [
    { label: "2³ · 2⁴", spec: P("laws", "2^3 * 2^4") },
    { label: "x⁵ / x²", spec: P("laws", "x^5 / x^2") },
    { label: "(x²)³", spec: P("laws", "(x^2)^3") },
    { label: "(2x³)² / (4x²)", spec: P("laws", "(2x^3)^2 / (4x^2)") },
    { label: "a⁻² b³ / (a³ b⁻¹)", spec: P("laws", "a^-2 b^3 / (a^3 b^-1)") },
    { label: "x³ / x³ (a⁰)", spec: P("laws", "x^3 / x^3") },
    { label: "8^(2/3)", spec: P("laws", "8^(2/3)") },
    { label: "(27/8)^(−1/3)", spec: P("laws", "(27/8)^(-1/3)") },
    { label: "√x · x^(3/2)", spec: P("laws", "sqrt(x) * x^(3/2)") },
    { label: "(−2a²b)³", spec: P("laws", "(-2a^2 b)^3") },
  ],
  sci: [
    { label: "345 000 000", spec: P("sci", "345000000") },
    { label: "0.000 345", spec: P("sci", "0.000345") },
    { label: "6.02 × 10²³", spec: P("sci", "6.02 × 10^23") },
    { label: "4.7 × 10⁻⁵", spec: P("sci", "4.7 × 10^-5") },
    { label: "45 × 10³ (not standard)", spec: P("sci", "45 × 10^3") },
    { label: "(3 × 10⁴)(5 × 10⁻²)", spec: P("sci", "(3 × 10^4) × (5 × 10^-2)") },
    { label: "(6 × 10⁸) ÷ (2.4 × 10³)", spec: P("sci", "(6 × 10^8) ÷ (2.4 × 10^3)") },
    { label: "3 × 10⁴ + 5 × 10³", spec: P("sci", "3 × 10^4 + 5 × 10^3") },
    { label: "(2 × 10⁵) ÷ (3 × 10⁻²)", spec: P("sci", "(2 × 10^5) ÷ (3 × 10^-2)") },
  ],
  surds: [
    { label: "√72", spec: P("surds", "√72") },
    { label: "∛54", spec: P("surds", "∛54") },
    { label: "√72 + √50 − √18", spec: P("surds", "√72 + √50 - √18") },
    { label: "√6 × √15", spec: P("surds", "√6 × √15") },
    { label: "(2 + √3)(2 − √3)", spec: P("surds", "(2 + √3)(2 - √3)") },
    { label: "(1 + √2)²", spec: P("surds", "(1 + √2)^2") },
    { label: "6 / √3", spec: P("surds", "6 / √3") },
    { label: "2 / (3 − √5)", spec: P("surds", "2 / (3 - √5)") },
    { label: "(√5 + √2)/(√5 − √2)", spec: P("surds", "(√5 + √2) / (√5 - √2)") },
    { label: "√(18/25)", spec: P("surds", "√(18/25)") },
  ],
  logs: [
    { label: "log₂ 8", spec: P("logs", "log_2(8)") },
    { label: "log₉ 27", spec: P("logs", "log_9(27)") },
    { label: "log 0.001", spec: P("logs", "log(0.001)") },
    { label: "log₂ (1/32)", spec: P("logs", "log_2(1/32)") },
    { label: "ln e³", spec: P("logs", "ln(e^3)") },
    { label: "log₂ 40 − log₂ 5", spec: P("logs", "log_2(40) - log_2(5)") },
    { label: "2 log₃ 6 − log₃ 4", spec: P("logs", "2log_3(6) - log_3(4)") },
    { label: "log₆ 4 + log₆ 9", spec: P("logs", "log_6(4) + log_6(9)") },
    { label: "log₃ 20 (change of base)", spec: P("logs", "log_3(20)") },
  ],
  equations: [
    { label: "2^(x+1) = 32", spec: P("equations", "2^(x+1) = 32") },
    { label: "9^x = 27^(x−1)", spec: P("equations", "9^x = 27^(x-1)") },
    { label: "5 · 2^x = 40", spec: P("equations", "5 * 2^x = 40") },
    { label: "4^x = 1/8", spec: P("equations", "4^x = 1/8") },
    { label: "3^x = 20", spec: P("equations", "3^x = 20") },
    { label: "2^(2x) = 3^(x+1)", spec: P("equations", "2^(2x) = 3^(x+1)") },
    { label: "e^(2x) = 7", spec: P("equations", "e^(2x) = 7") },
    { label: "log₂(x + 3) = 5", spec: P("equations", "log_2(x + 3) = 5") },
    { label: "log₂ x + log₂(x − 2) = 3", spec: P("equations", "log_2(x) + log_2(x - 2) = 3") },
    { label: "log(x) + log(x − 3) = 1", spec: P("equations", "log(x) + log(x - 3) = 1") },
    { label: "log₃(x + 1) = log₃(2x − 3)", spec: P("equations", "log_3(x + 1) = log_3(2x - 3)") },
    { label: "ln(x − 1) = 2", spec: P("equations", "ln(x - 1) = 2") },
  ],
};
