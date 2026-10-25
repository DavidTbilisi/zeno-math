// The solver's formula language: what goes in a pattern's slots. Numbers, text in quotes, the names a pattern binds
// (a, i, dp, sum…), indexing a[i] and dp[i][j], arithmetic, comparisons, and/or/not, if(c, x, y), a few functions
// (min max abs floor ceil len sum distinct has) and aggregators over a binder: min(j in 0..i if a[j] < a[i]: dp[j]).
// Parsed once into a tree and evaluated against an environment; a hook sees every indexed read so a DP table can
// colour the cells a recurrence looked at. No eval, no Function: nothing a formula says can leave the evaluator.
import { fill } from "../text";

export type Value = number | string | boolean | Value[];
export type Env = Record<string, Value>;
export type Hooks = { onRead?: (name: string, idx: number[]) => void };
/** The messages the language can give; `{s}` is the piece of the formula at fault. */
export type ExprWords = { bad: string; name: string; index: string; unset: string; notNumber: string; notBool: string; notList: string; budget: string; args: string };

export type Node =
  | { t: "num"; v: number; s: string }
  | { t: "str"; v: string; s: string }
  | { t: "bool"; v: boolean; s: string }
  | { t: "var"; name: string; s: string }
  | { t: "idx"; obj: Node; idx: Node; s: string }
  | { t: "neg"; a: Node; s: string }
  | { t: "not"; a: Node; s: string }
  | { t: "bin"; op: string; a: Node; b: Node; s: string }
  | { t: "range"; a: Node; b: Node; s: string }
  | { t: "call"; fn: string; args: Node[]; s: string }
  | { t: "agg"; fn: string; v: string; over: Node; cond: Node | null; body: Node; s: string };

const FNS = ["min", "max", "abs", "floor", "ceil", "len", "sum", "distinct", "has", "if"];
const AGGS = ["min", "max", "sum", "count", "any", "all"];
const KEYWORDS = ["and", "or", "not", "in", "if", "true", "false", "inf"];
/** The names a formula may use besides what the pattern binds: the functions, the aggregators and the keywords. */
export const RESERVED = [...new Set([...FNS, ...AGGS, ...KEYWORDS])];
/** How long a `lo..hi` may be, and how many steps one evaluation may take. */
export const RANGE_MAX = 64;
export const BUDGET = 20000;

const NORMAL: [RegExp, string][] = [
  [/[−–—]/g, "-"], [/≤/g, "<="], [/≥/g, ">="], [/≠/g, "!="], [/[×·]/g, "*"], [/÷/g, "/"], [/&&/g, " and "], [/\|\|/g, " or "],
  [/!(?!=)/g, " not "], [/(?<![<>!=])=(?!=)/g, "=="], [/[‘’]/g, "'"],
];
export const normalise = (src: string) => NORMAL.reduce((s, [re, to]) => s.replace(re, to), src);

type Tok = { k: "num" | "str" | "id" | "op"; v: string; at: number };

function tokenize(src: string, w: ExprWords): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^\d+(\.\d+)?/))) out.push({ k: "num", v: m[0], at: i });
    else if ((m = rest.match(/^'([^']*)'/))) out.push({ k: "str", v: m[1], at: i });
    else if ((m = rest.match(/^[\p{L}_][\p{L}\d_]*/u))) out.push({ k: "id", v: m[0], at: i });
    else if ((m = rest.match(/^(<=|>=|==|!=|\.\.|[-+*/%^()[\],:<>])/))) out.push({ k: "op", v: m[0], at: i });
    else throw new Error(fill(w.bad, { s: rest.slice(0, 8) }));
    i += m[0].length;
  }
  return out;
}

/** The formula as a tree; a formula that cannot be read says which part. */
export function parseExpr(src: string, w: ExprWords): Node {
  const text = normalise(src);
  const toks = tokenize(text, w);
  let p = 0;
  const isOp = (v: string) => toks[p]?.k === "op" && toks[p].v === v;
  const isId = (v: string) => toks[p]?.k === "id" && toks[p].v === v;
  const from = (start: number): string => text.slice(toks[start].at, p < toks.length ? toks[p].at : text.length).trim();
  const fail = (): never => {
    throw new Error(fill(w.bad, { s: toks[p] ? text.slice(toks[p].at, toks[p].at + 12) : src.trim() || "…" }));
  };
  const expect = (v: string) => (isOp(v) || isId(v) ? toks[p++] : fail());

  const or = (): Node => {
    const start = p;
    let a = and();
    while (isId("or")) (p++, (a = { t: "bin", op: "or", a, b: and(), s: from(start) }));
    return a;
  };
  const and = (): Node => {
    const start = p;
    let a = not();
    while (isId("and")) (p++, (a = { t: "bin", op: "and", a, b: not(), s: from(start) }));
    return a;
  };
  const not = (): Node => {
    const start = p;
    if (isId("not")) return (p++, { t: "not", a: not(), s: from(start) });
    return cmp();
  };
  const cmp = (): Node => {
    const start = p;
    const a = range();
    const op = toks[p]?.k === "op" && ["<", "<=", "==", "!=", ">=", ">"].includes(toks[p].v) ? toks[p++].v : null;
    return op ? { t: "bin", op, a, b: range(), s: from(start) } : a;
  };
  const range = (): Node => {
    const start = p;
    const a = sum();
    return isOp("..") ? (p++, { t: "range", a, b: sum(), s: from(start) }) : a;
  };
  const sum = (): Node => {
    const start = p;
    let a = term();
    while (isOp("+") || isOp("-")) {
      const op = toks[p++].v;
      a = { t: "bin", op, a, b: term(), s: from(start) };
    }
    return a;
  };
  const term = (): Node => {
    const start = p;
    let a = unary();
    while (isOp("*") || isOp("/") || isOp("%")) {
      const op = toks[p++].v;
      a = { t: "bin", op, a, b: unary(), s: from(start) };
    }
    return a;
  };
  const unary = (): Node => {
    const start = p;
    if (isOp("-")) return (p++, { t: "neg", a: unary(), s: from(start) });
    return power();
  };
  const power = (): Node => {
    const start = p;
    const a = postfix();
    return isOp("^") ? (p++, { t: "bin", op: "^", a, b: unary(), s: from(start) }) : a;
  };
  const postfix = (): Node => {
    const start = p;
    let a = atom();
    while (isOp("[")) {
      p++;
      const idx = or();
      expect("]");
      a = { t: "idx", obj: a, idx, s: from(start) };
    }
    return a;
  };
  const atom = (): Node => {
    const start = p;
    const tok = toks[p];
    if (!tok) return fail();
    if (tok.k === "num") return (p++, { t: "num", v: Number(tok.v), s: tok.v });
    if (tok.k === "str") return (p++, { t: "str", v: tok.v, s: from(start) });
    if (tok.k === "op" && tok.v === "(") {
      p++;
      const e = or();
      expect(")");
      return { ...e, s: from(start) };
    }
    if (tok.k !== "id") return fail();
    p++;
    if (tok.v === "true" || tok.v === "false") return { t: "bool", v: tok.v === "true", s: tok.v };
    if (tok.v === "inf") return { t: "num", v: Infinity, s: tok.v };
    if (isOp("(") && (FNS.includes(tok.v) || AGGS.includes(tok.v))) {
      p++;
      // An aggregator: name ( v in over [if cond] : body )
      if (AGGS.includes(tok.v) && toks[p]?.k === "id" && toks[p + 1]?.k === "id" && toks[p + 1].v === "in") {
        const v = toks[p].v;
        if (KEYWORDS.includes(v)) fail();
        p += 2;
        const over = or();
        const cond = isId("if") ? (p++, or()) : null;
        expect(":");
        const body = or();
        expect(")");
        return { t: "agg", fn: tok.v, v, over, cond, body, s: from(start) };
      }
      if (!FNS.includes(tok.v)) fail();
      const args: Node[] = [];
      if (!isOp(")"))
        for (;;) {
          args.push(or());
          if (isOp(",")) p++;
          else break;
        }
      expect(")");
      return { t: "call", fn: tok.v, args, s: from(start) };
    }
    if (KEYWORDS.includes(tok.v)) (p--, fail());
    return { t: "var", name: tok.v, s: tok.v };
  };

  if (!toks.length) throw new Error(fill(w.bad, { s: "…" }));
  const e = or();
  if (p < toks.length) fail();
  return e;
}

const isList = (v: Value): v is Value[] => Array.isArray(v);
/** A text is a list of its characters wherever a list is wanted. */
const items = (v: Value): Value[] | null => (isList(v) ? v : typeof v === "string" ? [...v] : null);
export const same = (a: Value, b: Value): boolean => (isList(a) || isList(b) ? JSON.stringify(a) === JSON.stringify(b) : a === b);

/** The formula's value in `env`, every indexed read reported to `hooks.onRead`. */
export function evaluate(node: Node, env: Env, w: ExprWords, hooks: Hooks = {}): Value {
  let budget = BUDGET;
  const num = (n: Node, scope: Env): number => {
    const v = ev(n, scope);
    if (typeof v !== "number") throw new Error(fill(w.notNumber, { s: n.s }));
    return v;
  };
  const bool = (n: Node, scope: Env): boolean => {
    const v = ev(n, scope);
    if (typeof v !== "boolean") throw new Error(fill(w.notBool, { s: n.s }));
    return v;
  };
  const list = (n: Node, scope: Env): Value[] => {
    const v = items(ev(n, scope));
    if (!v) throw new Error(fill(w.notList, { s: n.s }));
    return v;
  };
  const nums = (n: Node, scope: Env): number[] =>
    list(n, scope).map((v) => {
      if (typeof v !== "number") throw new Error(fill(w.notNumber, { s: n.s }));
      return v;
    });
  const ev = (n: Node, scope: Env): Value => {
    if (--budget < 0) throw new Error(w.budget);
    switch (n.t) {
      case "num":
      case "str":
      case "bool":
        return n.v;
      case "var":
        if (!Object.hasOwn(scope, n.name)) throw new Error(fill(w.name, { s: n.name }));
        return scope[n.name];
      case "idx": {
        // The whole chain a[i][j] at once, so the read is reported once with every index.
        const chain: Node[] = [];
        let base: Node = n;
        while (base.t === "idx") (chain.unshift(base.idx), (base = base.obj));
        let v = ev(base, scope);
        const idx: number[] = [];
        for (const k of chain) {
          const i = num(k, scope);
          const xs = items(v);
          if (!xs) throw new Error(fill(w.notList, { s: base.s }));
          if (!Number.isInteger(i) || i < 0 || i >= xs.length) throw new Error(fill(w.index, { s: `${base.s}[${idx.concat(i).join("][")}]` }));
          idx.push(i);
          v = xs[i];
        }
        if (typeof v === "number" && Number.isNaN(v)) throw new Error(fill(w.unset, { s: `${base.s}[${idx.join("][")}]` }));
        if (base.t === "var") hooks.onRead?.(base.name, idx);
        return v;
      }
      case "neg":
        return -num(n.a, scope);
      case "not":
        return !bool(n.a, scope);
      case "range": {
        const [a, b] = [num(n.a, scope), num(n.b, scope)];
        if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error(fill(w.notNumber, { s: n.s }));
        if (b - a + 1 > RANGE_MAX) throw new Error(fill(w.index, { s: n.s }));
        return b < a ? [] : Array.from({ length: b - a + 1 }, (_, k) => a + k);
      }
      case "bin": {
        if (n.op === "and") return bool(n.a, scope) && bool(n.b, scope);
        if (n.op === "or") return bool(n.a, scope) || bool(n.b, scope);
        if (n.op === "==" || n.op === "!=") return same(ev(n.a, scope), ev(n.b, scope)) === (n.op === "==");
        if (["<", "<=", ">", ">="].includes(n.op)) {
          const [a, b] = [ev(n.a, scope), ev(n.b, scope)];
          if (typeof a !== typeof b || (typeof a !== "number" && typeof a !== "string")) throw new Error(fill(w.notNumber, { s: n.s }));
          return n.op === "<" ? a < b : n.op === "<=" ? a <= b : n.op === ">" ? a > b : a >= b;
        }
        const [a, b] = [num(n.a, scope), num(n.b, scope)];
        switch (n.op) {
          case "+":
            return a + b;
          case "-":
            return a - b;
          case "*":
            return a * b;
          case "/":
            return a / b;
          case "%":
            return a % b;
          default:
            return a ** b;
        }
      }
      case "call": {
        const { fn, args } = n;
        const arity = fn === "if" ? 3 : fn === "has" ? 2 : fn === "min" || fn === "max" ? -1 : 1;
        if (arity >= 0 ? args.length !== arity : args.length < 1) throw new Error(fill(w.args, { s: n.s }));
        switch (fn) {
          case "if":
            return bool(args[0], scope) ? ev(args[1], scope) : ev(args[2], scope);
          case "has": {
            const x = ev(args[1], scope);
            return list(args[0], scope).some((v) => same(v, x));
          }
          case "len":
            return list(args[0], scope).length;
          case "sum":
            return nums(args[0], scope).reduce((s, x) => s + x, 0);
          case "distinct":
            return new Set(list(args[0], scope).map((v) => JSON.stringify(v))).size;
          case "abs":
            return Math.abs(num(args[0], scope));
          case "floor":
            return Math.floor(num(args[0], scope));
          case "ceil":
            return Math.ceil(num(args[0], scope));
          default: {
            // min and max: of some numbers, or of one list.
            const xs = args.length === 1 ? nums(args[0], scope) : args.map((a) => num(a, scope));
            return xs.length ? (fn === "min" ? Math.min(...xs) : Math.max(...xs)) : fn === "min" ? Infinity : -Infinity;
          }
        }
      }
      case "agg": {
        const over = list(n.over, scope);
        let acc: Value = n.fn === "min" ? Infinity : n.fn === "max" ? -Infinity : n.fn === "any" ? false : n.fn === "all" ? true : 0;
        for (const x of over) {
          const inner = { ...scope, [n.v]: x };
          if (n.cond && !bool(n.cond, inner)) continue;
          switch (n.fn) {
            case "min":
              acc = Math.min(acc as number, num(n.body, inner));
              break;
            case "max":
              acc = Math.max(acc as number, num(n.body, inner));
              break;
            case "sum":
              acc = (acc as number) + num(n.body, inner);
              break;
            case "count":
              acc = (acc as number) + (bool(n.body, inner) ? 1 : 0);
              break;
            case "any":
              acc = acc || bool(n.body, inner);
              break;
            default:
              acc = acc && bool(n.body, inner);
          }
        }
        return acc;
      }
    }
  };
  return ev(node, env);
}

/** A formula parsed once, to evaluate many times. */
export function compile(src: string, w: ExprWords): (env: Env, hooks?: Hooks) => Value {
  const node = parseExpr(src, w);
  return (env, hooks) => evaluate(node, env, w, hooks);
}

/** The names a formula uses that nothing binds (its free variables), to check a slot before it runs. */
export function freeNames(node: Node, bound: string[] = []): string[] {
  const out = new Set<string>();
  const walk = (n: Node, b: string[]) => {
    switch (n.t) {
      case "var":
        if (!b.includes(n.name)) out.add(n.name);
        break;
      case "idx":
        walk(n.obj, b);
        walk(n.idx, b);
        break;
      case "neg":
      case "not":
        walk(n.a, b);
        break;
      case "bin":
      case "range":
        walk(n.a, b);
        walk(n.b, b);
        break;
      case "call":
        n.args.forEach((a) => walk(a, b));
        break;
      case "agg":
        walk(n.over, b);
        if (n.cond) walk(n.cond, [...b, n.v]);
        walk(n.body, [...b, n.v]);
        break;
      default:
        break;
    }
  };
  walk(node, bound);
  return [...out];
}
