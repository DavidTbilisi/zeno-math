// Propositional logic: truth tables built column by column from the subformulas, equivalence of
// two formulas (with the rows where they differ), normal forms with a Karnaugh map (minimal sum of
// products and product of sums by Quine–McCluskey), logic-gate circuits with the wire values,
// validity of arguments (with named rules and fallacies), and set expressions as Venn diagrams.
import { txt } from "./algoArrays";
import { C, compose, fill, r2, W, type Caption } from "./chart";
import { latexToSvg, type RenderedSvg } from "./latex";
import { BOARD_PRESETS, KNIGHTS_PRESETS, renderBoard, renderKnights, type BoardSpec, type BoardWords, type KnightsWords } from "./logicPuzzles";

export type LogicTopic = "table" | "equiv" | "nf" | "circuit" | "argument" | "sets" | "board" | "knights";
export const LOGIC_TOPICS: LogicTopic[] = ["table", "equiv", "nf", "circuit", "argument", "board", "knights", "sets"];
/** f: the formula (premises for arguments); g: the second formula / conclusion; vals: circuit inputs; tf: T/F instead of 1/0. */
export type LogicSpec = { topic: LogicTopic; f: string; g: string; vals: string; tf: boolean; board?: BoardSpec };

export type LogicWords = {
  T: string;
  F: string;
  empty: string;
  badToken: string;
  missing: string;
  missingParen: string;
  tooManyVars: string;
  notSetOp: string;
  badVals: string;
  badMinterm: string;
  tautology: string;
  contradiction: string;
  satisfiable: string;
  tableInfo: string;
  equivYes: string;
  equivNo: string;
  implies: string;
  nfMinimal: string;
  nfInfo: string;
  nfLabels: { sum: string; prod: string; dnf: string; cnf: string; groups: string };
  kmapLimit: string;
  circuitOut: string;
  circuitTooBig: string;
  circuitInfo: string;
  gates: Record<GateOp, string>;
  valid: string;
  invalid: string;
  noPremises: string;
  rules: Record<RuleKey, string>;
  setsEqual: string;
  setsDiffer: string;
  setsSubset: string;
  setsInfo: string;
  board: BoardWords;
  knights: KnightsWords;
};

// ---------- formulas ----------

type BinOp = "and" | "or" | "xor" | "imp" | "iff" | "nand" | "nor" | "diff";
type GateOp = BinOp | "not";
export type Node = { t: "var"; name: string } | { t: "const"; v: boolean } | { t: "not"; a: Node } | { t: "bin"; op: BinOp; a: Node; b: Node };

type Tok = { k: "op"; op: BinOp } | { k: "not" } | { k: "post" } | { k: "(" } | { k: ")" } | { k: "var"; name: string } | { k: "const"; v: boolean };

// Longest spellings first, so "<->" wins over "->" and "\/" over "\".
const SYMBOLS: [string, Tok][] = [
  ["<->", { k: "op", op: "iff" }], ["<=>", { k: "op", op: "iff" }], ["↔", { k: "op", op: "iff" }], ["⇔", { k: "op", op: "iff" }], ["≡", { k: "op", op: "iff" }],
  ["->", { k: "op", op: "imp" }], ["=>", { k: "op", op: "imp" }], ["→", { k: "op", op: "imp" }], ["⇒", { k: "op", op: "imp" }], ["⊃", { k: "op", op: "imp" }],
  ["&&", { k: "op", op: "and" }], ["/\\", { k: "op", op: "and" }], ["&", { k: "op", op: "and" }], ["∧", { k: "op", op: "and" }], ["*", { k: "op", op: "and" }], ["·", { k: "op", op: "and" }], ["⋅", { k: "op", op: "and" }], ["∩", { k: "op", op: "and" }],
  ["||", { k: "op", op: "or" }], ["\\/", { k: "op", op: "or" }], ["|", { k: "op", op: "or" }], ["∨", { k: "op", op: "or" }], ["+", { k: "op", op: "or" }], ["∪", { k: "op", op: "or" }],
  ["⊕", { k: "op", op: "xor" }], ["⊻", { k: "op", op: "xor" }], ["^", { k: "op", op: "xor" }], ["Δ", { k: "op", op: "xor" }], ["△", { k: "op", op: "xor" }], ["∆", { k: "op", op: "xor" }],
  ["↑", { k: "op", op: "nand" }], ["↓", { k: "op", op: "nor" }],
  ["\\", { k: "op", op: "diff" }], ["∖", { k: "op", op: "diff" }], ["−", { k: "op", op: "diff" }], ["-", { k: "op", op: "diff" }],
  ["¬", { k: "not" }], ["~", { k: "not" }], ["!", { k: "not" }],
  ["'", { k: "post" }], ["′", { k: "post" }], ["ᶜ", { k: "post" }], ["’", { k: "post" }],
  ["(", { k: "(" }], ["[", { k: "(" }], [")", { k: ")" }], ["]", { k: ")" }],
  ["⊤", { k: "const", v: true }], ["⊥", { k: "const", v: false }], ["∅", { k: "const", v: false }], ["1", { k: "const", v: true }], ["0", { k: "const", v: false }],
];
const WORDS: Record<string, Tok> = {
  and: { k: "op", op: "and" }, or: { k: "op", op: "or" }, xor: { k: "op", op: "xor" }, nand: { k: "op", op: "nand" }, nor: { k: "op", op: "nor" },
  implies: { k: "op", op: "imp" }, iff: { k: "op", op: "iff" }, not: { k: "not" }, true: { k: "const", v: true }, false: { k: "const", v: false },
};

function tokenize(s: string, w: LogicWords): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  outer: while (i < s.length) {
    if (/\s/.test(s[i])) {
      i++;
      continue;
    }
    // Symbols first: Δ and ᶜ count as letters in Unicode.
    for (const [sym, tok] of SYMBOLS) {
      if (s.startsWith(sym, i)) {
        out.push(tok);
        i += sym.length;
        continue outer;
      }
    }
    const word = /^\p{L}+/u.exec(s.slice(i))?.[0];
    if (word && WORDS[word.toLowerCase()] && word.length > 1) {
      out.push(WORDS[word.toLowerCase()]);
      i += word.length;
      continue;
    }
    // A variable is one letter with optional digits (p, q1, x2), so "AB" reads as A·B.
    const v = /^\p{L}[0-9₀-₉]*/u.exec(s.slice(i))?.[0];
    if (v) {
      out.push({ k: "var", name: v.replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080)) });
      i += v.length;
      continue;
    }
    throw new Error(fill(w.badToken, { c: s[i] }));
  }
  return out;
}

export function parseFormula(s: string, w: LogicWords): Node {
  const toks = tokenize(s, w);
  if (!toks.length) throw new Error(w.empty);
  let p = 0;
  const peek = () => toks[p];
  const show = (t: Tok | undefined) => {
    if (!t) return "";
    if (t.k === "var") return t.name;
    if (t.k === "const") return t.v ? "1" : "0";
    if (t.k === "op") return { and: "∧", or: "∨", xor: "⊕", imp: "→", iff: "↔", nand: "↑", nor: "↓", diff: "−" }[t.op];
    return { not: "¬", post: "′", "(": "(", ")": ")" }[t.k];
  };
  const isOp = (...ops: BinOp[]) => {
    const t = peek();
    return t?.k === "op" && ops.includes(t.op);
  };
  const startsAtom = () => {
    const t = peek();
    return !!t && (t.k === "var" || t.k === "const" || t.k === "(" || t.k === "not");
  };
  const iff = (): Node => {
    let a = imp();
    while (isOp("iff")) {
      p++;
      a = { t: "bin", op: "iff", a, b: imp() };
    }
    return a;
  };
  const imp = (): Node => {
    const a = or();
    if (!isOp("imp")) return a;
    p++;
    return { t: "bin", op: "imp", a, b: imp() };
  };
  const or = (): Node => {
    let a = and();
    while (isOp("or", "xor", "nor", "diff")) {
      const op = (toks[p++] as { op: BinOp }).op;
      a = { t: "bin", op, a, b: and() };
    }
    return a;
  };
  const and = (): Node => {
    let a = unary();
    for (;;) {
      if (isOp("and", "nand")) {
        const op = (toks[p++] as { op: BinOp }).op;
        a = { t: "bin", op, a, b: unary() };
      } else if (startsAtom()) a = { t: "bin", op: "and", a, b: unary() }; // AB, A(B + C)
      else return a;
    }
  };
  const unary = (): Node => {
    if (peek()?.k === "not") {
      p++;
      return { t: "not", a: unary() };
    }
    let a = atom();
    while (peek()?.k === "post") {
      p++;
      a = { t: "not", a };
    }
    return a;
  };
  const atom = (): Node => {
    const t = toks[p++];
    if (!t) throw new Error(w.missing);
    if (t.k === "var") return { t: "var", name: t.name };
    if (t.k === "const") return { t: "const", v: t.v };
    if (t.k === "(") {
      const a = iff();
      if (peek()?.k !== ")") throw new Error(peek() ? fill(w.badToken, { c: show(peek()) }) : w.missingParen);
      p++;
      return a;
    }
    throw new Error(fill(w.badToken, { c: show(t) }));
  };
  const node = iff();
  if (p < toks.length) throw new Error(fill(w.badToken, { c: show(peek()) }));
  return node;
}

export function evalNode(n: Node, env: Record<string, boolean>): boolean {
  switch (n.t) {
    case "var":
      return env[n.name];
    case "const":
      return n.v;
    case "not":
      return !evalNode(n.a, env);
    case "bin": {
      const a = evalNode(n.a, env);
      const b = evalNode(n.b, env);
      switch (n.op) {
        case "and": return a && b;
        case "or": return a || b;
        case "xor": return a !== b;
        case "imp": return !a || b;
        case "iff": return a === b;
        case "nand": return !(a && b);
        case "nor": return !(a || b);
        case "diff": return a && !b;
      }
    }
  }
}

function varsOf(nodes: Node[]): string[] {
  const s = new Set<string>();
  const walk = (n: Node) => {
    if (n.t === "var") s.add(n.name);
    else if (n.t === "not") walk(n.a);
    else if (n.t === "bin") (walk(n.a), walk(n.b));
  };
  nodes.forEach(walk);
  return [...s].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// ---------- printing ----------

const ASSOC = new Set<BinOp>(["and", "or", "xor", "iff"]);

type Style = "logic" | "set";
const TEX_OPS: Record<Style, Record<BinOp, string>> = {
  logic: { and: "\\land", or: "\\lor", xor: "\\oplus", imp: "\\rightarrow", iff: "\\leftrightarrow", nand: "\\uparrow", nor: "\\downarrow", diff: "\\setminus" },
  set: { and: "\\cap", or: "\\cup", xor: "\\mathbin{\\triangle}", imp: "\\rightarrow", iff: "\\leftrightarrow", nand: "\\uparrow", nor: "\\downarrow", diff: "\\setminus" },
};
const TEXT_OPS: Record<Style, Record<BinOp, string>> = {
  logic: { and: "∧", or: "∨", xor: "⊕", imp: "→", iff: "↔", nand: "↑", nor: "↓", diff: "∖" },
  set: { and: "∩", or: "∪", xor: "Δ", imp: "→", iff: "↔", nand: "↑", nor: "↓", diff: "∖" },
};

const texName = (name: string) => {
  const m = /^(\p{L})(\d*)$/u.exec(name)!;
  const base = /[A-Za-z]/.test(m[1]) ? m[1] : `\\text{${m[1]}}`;
  return m[2] ? `${base}_{${m[2]}}` : base;
};
const textName = (name: string) => name.replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);

/** leaf, when given, prints each variable (negated: directly under a ¬). */
function printer(tex: boolean, style: Style, leaf?: (name: string, negated: boolean) => string) {
  const ops = (tex ? TEX_OPS : TEXT_OPS)[style];
  const wrap = (s: string) => (tex ? `\\left(${s}\\right)` : `(${s})`);
  const go = (n: Node): string => {
    if (n.t === "var") return leaf ? leaf(n.name, false) : tex ? texName(n.name) : textName(n.name);
    if (n.t === "const") return style === "set" ? (n.v ? "U" : tex ? "\\varnothing" : "∅") : tex ? (n.v ? "\\top" : "\\bot") : n.v ? "⊤" : "⊥";
    if (n.t === "not") {
      if (leaf && n.a.t === "var") return leaf(n.a.name, true);
      if (style === "set") return tex ? `\\overline{${go(n.a)}}` : n.a.t === "var" || n.a.t === "const" ? `${go(n.a)}′` : `${wrap(go(n.a))}′`;
      const inner = go(n.a);
      return (tex ? "\\lnot " : "¬") + (n.a.t === "bin" ? wrap(inner) : inner);
    }
    // Mixed operators always get brackets, (p ∧ q) ∨ r rather than p ∧ q ∨ r, as in most textbooks;
    // only a chain of one associative operator goes without.
    const side = (c: Node) => (c.t === "bin" && !(c.op === n.op && ASSOC.has(n.op)) ? wrap(go(c)) : go(c));
    return `${side(n.a)} ${ops[n.op]} ${side(n.b)}`;
  };
  return go;
}
export const toTex = (n: Node, style: Style = "logic") => printer(true, style)(n);
export const toText = (n: Node, style: Style = "logic") => printer(false, style)(n);
/** TeX with every variable printed by name(v). */
export const toTexWith = (n: Node, name: (v: string, negated: boolean) => string) => printer(true, "logic", name)(n);
/** Text with brackets around a compound formula, for use next to ↔ in a caption. */
const textIn = (n: Node) => (n.t === "bin" ? `(${toText(n)})` : toText(n));

// ---------- drawing helpers ----------

export type Box = { w: number; h: number; at: (x: number, y: number, anchor?: "start" | "middle" | "end") => string };
export function texBox(tex: string, scale = 1, color?: string): Box {
  const r = latexToSvg(tex, color);
  const w = r.width * scale;
  const h = r.height * scale;
  return {
    w,
    h,
    at: (x, y, anchor = "middle") => {
      const x0 = anchor === "start" ? x : anchor === "middle" ? x - w / 2 : x - w;
      return r.svg
        .replace(/width="[\d.]+"/, `width="${r2(w)}"`)
        .replace(/height="[\d.]+"/, `height="${r2(h)}"`)
        .replace(/^<svg/, `<svg x="${r2(x0)}" y="${r2(y - h / 2)}"`);
    },
  };
}

/** Centres a body, scaling it down when it is wider than the picture (or up to `grow` when small). */
export function fit(svg: string, width: number, h: number, maxW = W - 24, grow = 1): { svg: string; h: number } {
  const k = Math.min(grow, maxW / width);
  return { svg: `<g transform="translate(${r2((W - width * k) / 2)} 0) scale(${r2(k * 1000) / 1000})">${svg}</g>`, h: h * k };
}

export const GREEN_BG = "#d3f9d8";
export const RED_BG = "#ffe3e3";
const BLUE_BG = "#d0ebff";

export type TCol = { tex: string; kind: "var" | "sub" | "main"; vals: boolean[] };

/** A truth table whose header cells are LaTeX; the columns left of the bar are the variables. */
export function truthTable(cols: TCol[], rowFill: (string | undefined)[], w: LogicWords, tf: boolean, marks?: { text: string; color: string }[]): { svg: string; h: number } {
  const heads = cols.map((c) => texBox(c.tex, 0.9));
  const widths = heads.map((b) => Math.max(34, b.w + 18));
  const markW = marks ? 30 : 0;
  const headH = Math.max(30, ...heads.map((b) => b.h + 12));
  const rowH = 21;
  const n = cols[0].vals.length;
  const total = widths.reduce((s, x) => s + x, 0) + markW;
  const parts: string[] = [`<rect x="0" y="0" width="${total}" height="${headH}" fill="#f1f3f5"/>`];
  const T = tf ? w.T : "1";
  const F = tf ? w.F : "0";
  for (let r = 0; r < n; r++) {
    const y = headH + r * rowH;
    if (rowFill[r]) parts.push(`<rect x="0" y="${y}" width="${total}" height="${rowH}" fill="${rowFill[r]}"/>`);
    parts.push(`<line x1="0" y1="${y + rowH}" x2="${total}" y2="${y + rowH}" stroke="#e9ecef"/>`);
  }
  let x = 0;
  let lastVar = 0;
  cols.forEach((c, j) => {
    parts.push(heads[j].at(x + widths[j] / 2, headH / 2));
    c.vals.forEach((v, r) => {
      const color = c.kind === "var" ? C.ink : c.kind === "sub" ? "#868e96" : v ? C.green : C.red;
      parts.push(txt(x + widths[j] / 2, headH + r * rowH + 15, v ? T : F, { size: 13, anchor: "middle", color, bold: c.kind === "main" }));
    });
    x += widths[j];
    if (c.kind === "var") lastVar = x;
  });
  if (marks) marks.forEach((m, r) => m.text && parts.push(txt(x + markW / 2, headH + r * rowH + 15, m.text, { size: 14, anchor: "middle", color: m.color, bold: true })));
  const h = headH + n * rowH;
  parts.push(`<line x1="${lastVar}" y1="0" x2="${lastVar}" y2="${h}" stroke="#868e96" stroke-width="1.6"/>`);
  parts.push(`<rect x="0" y="0" width="${total}" height="${h}" fill="none" stroke="#adb5bd"/>`);
  return fit(parts.join(""), total, h, W - 24, 1.3);
}

/** Rows of a truth table: textbooks list T…T first, circuits count up from 0…0. */
export function rowsFor(vars: string[], tf: boolean): Record<string, boolean>[] {
  const n = vars.length;
  return Array.from({ length: 2 ** n }, (_, r) => {
    const i = tf ? 2 ** n - 1 - r : r;
    return Object.fromEntries(vars.map((v, k) => [v, ((i >> (n - 1 - k)) & 1) === 1]));
  });
}

/** Every compound subformula, innermost first (repeats listed once). */
function subformulas(nodes: Node[]): Node[] {
  const seen = new Set<string>();
  const out: Node[] = [];
  const walk = (n: Node) => {
    if (n.t === "var" || n.t === "const") return;
    if (n.t === "not") walk(n.a);
    else (walk(n.a), walk(n.b));
    const key = toText(n);
    if (!seen.has(key)) (seen.add(key), out.push(n));
  };
  nodes.forEach(walk);
  return out;
}

const describeRow = (env: Record<string, boolean>, vars: string[], w: LogicWords, tf: boolean) =>
  vars.map((v) => `${textName(v)} = ${env[v] ? (tf ? w.T : "1") : tf ? w.F : "0"}`).join(", ");

const MAX_VARS = 5;
function checkVars(vars: string[], w: LogicWords, max = MAX_VARS) {
  if (vars.length > max) throw new Error(fill(w.tooManyVars, { n: max }));
}

// ---------- truth table ----------

function renderTable(spec: LogicSpec, w: LogicWords): RenderedSvg {
  const f = parseFormula(spec.f, w);
  const vars = varsOf([f]);
  checkVars(vars, w);
  const rows = rowsFor(vars, spec.tf);
  const subs = subformulas([f]);
  if (!subs.length) subs.push(f);
  const cols: TCol[] = [
    ...vars.map((v): TCol => ({ tex: texName(v), kind: "var", vals: rows.map((e) => e[v]) })),
    ...subs.map((s, i): TCol => ({ tex: toTex(s), kind: i === subs.length - 1 ? "main" : "sub", vals: rows.map((e) => evalNode(s, e)) })),
  ];
  const vals = rows.map((e) => evalNode(f, e));
  const k = vals.filter(Boolean).length;
  const body = truthTable(cols, vals.map((v) => (v ? GREEN_BG : undefined)), w, spec.tf);
  const caps: Caption[] = [
    k === rows.length ? { text: fill(w.tautology, { r: rows.length }), color: C.green }
      : k === 0 ? { text: fill(w.contradiction, { r: rows.length }), color: C.red }
      : { text: fill(w.satisfiable, { k, r: rows.length }), color: C.blue },
    { text: w.tableInfo, color: "#495057" },
  ];
  const head = k === rows.length ? `${toTex(f)} \\equiv \\top` : k === 0 ? `${toTex(f)} \\equiv \\bot` : toTex(f);
  return compose(head, body.svg, body.h, caps);
}

// ---------- equivalence ----------

function renderEquiv(spec: LogicSpec, w: LogicWords): RenderedSvg {
  const f = parseFormula(spec.f, w);
  const g = parseFormula(spec.g, w);
  const vars = varsOf([f, g]);
  checkVars(vars, w);
  const rows = rowsFor(vars, spec.tf);
  const fv = rows.map((e) => evalNode(f, e));
  const gv = rows.map((e) => evalNode(g, e));
  const differ = rows.map((_, r) => fv[r] !== gv[r]);
  const cols: TCol[] = vars.map((v) => ({ tex: texName(v), kind: "var", vals: rows.map((e) => e[v]) }));
  const subsF = subformulas([f]).slice(0, -1);
  const subsG = subformulas([g]).slice(0, -1);
  // Intermediate columns only while the table stays readable.
  const withSubs = subsF.length + subsG.length + vars.length + 2 <= 11;
  const add = (subs: Node[], main: Node) => {
    if (withSubs) for (const s of subs) cols.push({ tex: toTex(s), kind: "sub", vals: rows.map((e) => evalNode(s, e)) });
    cols.push({ tex: toTex(main), kind: "main", vals: rows.map((e) => evalNode(main, e)) });
  };
  add(subsF, f);
  add(subsG, g);
  const body = truthTable(
    cols,
    differ.map((d) => (d ? RED_BG : undefined)),
    w,
    spec.tf,
    differ.map((d) => (d ? { text: "✗", color: C.red } : { text: "✓", color: C.green })),
  );
  const k = differ.filter(Boolean).length;
  const ft = textIn(f);
  const gt = textIn(g);
  const caps: Caption[] = [];
  if (!k) caps.push({ text: fill(w.equivYes, { r: rows.length, f: ft, g: gt }), color: C.green });
  else {
    const r = differ.indexOf(true);
    caps.push({ text: fill(w.equivNo, { k, r: rows.length, row: describeRow(rows[r], vars, w, spec.tf) }), color: C.red });
    if (fv.every((v, i) => !v || gv[i])) caps.push({ text: fill(w.implies, { a: ft, b: gt }), color: C.blue });
    else if (gv.every((v, i) => !v || fv[i])) caps.push({ text: fill(w.implies, { a: gt, b: ft }), color: C.blue });
  }
  return compose(`${toTex(f)} ${k ? "\\not\\equiv" : "\\equiv"} ${toTex(g)}`, body.svg, body.h, caps);
}

// ---------- normal forms and the Karnaugh map ----------

type Imp = { bits: number; mask: number }; // mask bit 1 = that variable is free

const popcount = (x: number) => {
  let c = 0;
  for (; x; x &= x - 1) c++;
  return c;
};
const covers = (p: Imp, m: number) => (m & ~p.mask) === p.bits;

function primeImplicants(terms: number[]): Imp[] {
  let cur = new Map(terms.map((t) => [`${t}/0`, { bits: t, mask: 0 }]));
  const primes: Imp[] = [];
  while (cur.size) {
    const list = [...cur.values()];
    const next = new Map<string, Imp>();
    const used = new Set<Imp>();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const d = a.bits ^ b.bits;
        if (a.mask !== b.mask || !d || d & (d - 1)) continue;
        const m = { bits: a.bits & ~d, mask: a.mask | d };
        next.set(`${m.bits}/${m.mask}`, m);
        used.add(a).add(b);
      }
    }
    primes.push(...list.filter((p) => !used.has(p)));
    cur = next;
  }
  return primes;
}

/** A smallest set of prime implicants covering the terms (fewest groups, then fewest letters). */
function minimalCover(primes: Imp[], terms: number[], n: number): Imp[] {
  const lits = (s: Imp[]) => s.reduce((a, p) => a + n - popcount(p.mask), 0);
  let best: Imp[] | null = null;
  const rec = (chosen: Imp[], left: number[]) => {
    if (best && (chosen.length > best.length || (chosen.length === best.length && lits(chosen) >= lits(best)))) return;
    if (!left.length) {
      best = chosen;
      return;
    }
    let opts: Imp[] = [];
    for (const m of left) {
      const o = primes.filter((p) => covers(p, m));
      if (!opts.length || o.length < opts.length) opts = o;
    }
    // Bigger groups first, so a good answer is found early and prunes the rest.
    for (const p of [...opts].sort((a, b) => popcount(b.mask) - popcount(a.mask))) rec([...chosen, p], left.filter((m) => !covers(p, m)));
  };
  rec([], terms);
  // (TypeScript cannot see that rec assigns best.)
  return ((best as Imp[] | null) ?? []).sort((a, b) => popcount(b.mask) - popcount(a.mask) || a.bits - b.bits);
}

const over = (name: string) => `\\overline{${texName(name)}}`;
function productTex(p: Imp, vars: string[]): string {
  const n = vars.length;
  const lits = vars.flatMap((v, k) => {
    const bit = 1 << (n - 1 - k);
    return p.mask & bit ? [] : [p.bits & bit ? texName(v) : over(v)];
  });
  return lits.length ? lits.join("") : "1";
}
/** The sum clause that is false exactly on the implicant's cells. */
function clauseTex(p: Imp, vars: string[], alone: boolean): string {
  const n = vars.length;
  const lits = vars.flatMap((v, k) => {
    const bit = 1 << (n - 1 - k);
    return p.mask & bit ? [] : [p.bits & bit ? over(v) : texName(v)];
  });
  if (!lits.length) return "0";
  return lits.length === 1 || alone ? lits.join(" + ") : `(${lits.join(" + ")})`;
}

type Truth = { vars: string[]; ones: number[]; dcs: number[] };

/** Either a formula, or minterms: "m(1,3,5) + d(7)", optionally "f(A,B,C) = Σm(…)". */
function readTruth(s: string, w: LogicWords): Truth {
  const m = /^\s*(?:\p{L}?\s*\(([^)]*)\)\s*=)?\s*(?:Σ|∑|sum)?\s*m\s*\(([^)]*)\)\s*(?:\+\s*d\s*\(([^)]*)\))?\s*$/iu.exec(s);
  if (m) {
    const list = (t?: string) => (t ?? "").split(/[,;\s]+/).filter(Boolean).map((x) => {
      if (!/^\d+$/.test(x)) throw new Error(fill(w.badToken, { c: x }));
      return Number(x);
    });
    const ones = list(m[2]);
    const dcs = list(m[3]).filter((d) => !ones.includes(d));
    const top = Math.max(1, ...ones, ...dcs);
    let vars = m[1] ? m[1].split(/[,;\s]+/).filter(Boolean) : [];
    if (!vars.length) vars = "ABCD".slice(0, Math.max(2, Math.ceil(Math.log2(top + 1)))).split("");
    if (vars.length > 4 || vars.length < 1) throw new Error(w.kmapLimit);
    for (const x of [...ones, ...dcs]) if (x >= 2 ** vars.length) throw new Error(fill(w.badMinterm, { m: x, n: vars.length }));
    return { vars, ones: [...new Set(ones)].sort((a, b) => a - b), dcs: [...new Set(dcs)].sort((a, b) => a - b) };
  }
  const f = parseFormula(s, w);
  const vars = varsOf([f]);
  if (vars.length > 4) throw new Error(w.kmapLimit);
  if (!vars.length) vars.push("A");
  const ones = rowsFor(vars, false).flatMap((e, i) => (evalNode(f, e) ? [i] : []));
  return { vars, ones, dcs: [] };
}

const GROUP_COLORS = [C.blue, C.red, C.green, C.orange, C.purple, "#0c8599", "#c2255c", "#5f3dc4"];
const GRAY = (k: number) => (k === 0 ? [0] : k === 1 ? [0, 1] : [0, 1, 3, 2]);

/** Contiguous runs of positions on a wrap-around axis of length len (a wrapped block gives two runs). */
function runs(pos: number[], len: number): { a: number; b: number; openL: boolean; openR: boolean }[] {
  const s = [...pos].sort((x, y) => x - y);
  if (s.length === len) return [{ a: 0, b: len - 1, openL: false, openR: false }];
  const out: { a: number; b: number; openL: boolean; openR: boolean }[] = [];
  for (const p of s) {
    const last = out[out.length - 1];
    if (last && p === last.b + 1) last.b = p;
    else out.push({ a: p, b: p, openL: false, openR: false });
  }
  if (out.length === 2 && out[0].a === 0 && out[1].b === len - 1) (out[0].openL = true), (out[1].openR = true);
  return out;
}

/** Minimal sum of products (groups of 1s) and product of sums (groups of 0s); don't-cares help both. */
export function minimalForms(vars: string[], ones: number[], dcs: number[]) {
  const n = vars.length;
  const all = Array.from({ length: 2 ** n }, (_, i) => i);
  const zeros = all.filter((i) => !ones.includes(i) && !dcs.includes(i));
  const dnf = ones.length ? minimalCover(primeImplicants([...ones, ...dcs]), ones, n) : [];
  const cnf = zeros.length ? minimalCover(primeImplicants([...zeros, ...dcs]), zeros, n) : [];
  const dnfTex = !ones.length ? "0" : dnf.map((p) => productTex(p, vars)).join(" + ");
  const cnfTex = !zeros.length ? "1" : cnf.map((p) => clauseTex(p, vars, cnf.length === 1)).join("");
  return { all, zeros, dnf, cnf, dnfTex, cnfTex };
}

function renderNf(spec: LogicSpec, w: LogicWords): RenderedSvg {
  const { vars, ones, dcs } = readTruth(spec.f, w);
  const n = vars.length;
  const { all, zeros, dnf, dnfTex, cnfTex } = minimalForms(vars, ones, dcs);

  // The map: row variables on the left, column variables on top, both in Gray-code order.
  const rv = n <= 3 ? Math.min(1, n - 1) : 2;
  const cv = n - rv;
  const rows = GRAY(rv);
  const colsG = GRAY(cv);
  const cs = 52;
  const x0 = 70;
  const y0 = 56;
  const mw = colsG.length * cs;
  const mh = rows.length * cs;
  const parts: string[] = [];
  const bin = (v: number, k: number) => (k ? v.toString(2).padStart(k, "0") : "");
  const rowNames = vars.slice(0, rv).map(textName).join("");
  const colNames = vars.slice(rv).map(textName).join("");
  parts.push(`<line x1="${x0 - 46}" y1="${y0 - 40}" x2="${x0}" y2="${y0}" stroke="#868e96"/>`);
  if (rv) parts.push(txt(x0 - 30, y0 - 4, rowNames, { size: 14, anchor: "middle", italic: true, color: C.ink }));
  parts.push(txt(x0 - 8, y0 - 30, colNames, { size: 14, anchor: "start", italic: true, color: C.ink }));
  colsG.forEach((g, c) => parts.push(txt(x0 + c * cs + cs / 2, y0 - 10, bin(g, cv), { size: 13, anchor: "middle", color: "#495057" })));
  rows.forEach((g, r) => rv && parts.push(txt(x0 - 10, y0 + r * cs + cs / 2 + 5, bin(g, rv), { size: 13, anchor: "end", color: "#495057" })));
  const cellOf = (m: number) => ({ r: rows.indexOf(m >> cv), c: colsG.indexOf(m & ((1 << cv) - 1)) });
  rows.forEach((gr, r) =>
    colsG.forEach((gc, c) => {
      const m = (gr << cv) | gc;
      const x = x0 + c * cs;
      const y = y0 + r * cs;
      const one = ones.includes(m);
      const dc = dcs.includes(m);
      parts.push(`<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="#ffffff" stroke="#adb5bd"/>`);
      parts.push(txt(x + cs / 2, y + cs / 2 + 7, one ? "1" : dc ? "X" : "0", { size: 19, anchor: "middle", bold: one, color: one ? C.ink : dc ? C.orange : "#ced4da" }));
      parts.push(txt(x + cs - 4, y + cs - 5, String(m), { size: 9.5, anchor: "end", color: "#adb5bd" }));
    }),
  );
  parts.push(`<rect x="${x0}" y="${y0}" width="${mw}" height="${mh}" fill="none" stroke="#495057" stroke-width="1.6"/>`);
  parts.push(`<clipPath id="kmap"><rect x="${x0 - 1}" y="${y0 - 1}" width="${mw + 2}" height="${mh + 2}"/></clipPath>`);
  const loops: string[] = [];
  dnf.forEach((p, k) => {
    const cells = all.filter((m) => covers(p, m)).map(cellOf);
    const color = GROUP_COLORS[k % GROUP_COLORS.length];
    const pad = 5 + (k % 3) * 3;
    for (const rr of runs([...new Set(cells.map((q) => q.r))], rows.length)) {
      for (const cc of runs([...new Set(cells.map((q) => q.c))], colsG.length)) {
        const x1 = x0 + cc.a * cs + (cc.openL ? -14 : pad);
        const x2 = x0 + (cc.b + 1) * cs + (cc.openR ? 14 : -pad);
        const y1 = y0 + rr.a * cs + (rr.openL ? -14 : pad);
        const y2 = y0 + (rr.b + 1) * cs + (rr.openR ? 14 : -pad);
        loops.push(`<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="12" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="2.4"/>`);
      }
    }
  });
  parts.push(`<g clip-path="url(#kmap)">${loops.join("")}</g>`);

  // The groups, each with its product.
  const lx = x0 + mw + 36;
  let ly = y0 + 4;
  parts.push(txt(lx, y0 - 10, w.nfLabels.groups, { size: 13, bold: true, color: "#495057" }));
  dnf.forEach((p, k) => {
    const color = GROUP_COLORS[k % GROUP_COLORS.length];
    const b = texBox(productTex(p, vars), 1, color);
    const cellsList = all.filter((m) => covers(p, m) && ones.includes(m));
    parts.push(`<rect x="${lx}" y="${ly + 4}" width="14" height="14" rx="4" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2"/>`);
    parts.push(b.at(lx + 24, ly + 11, "start"));
    parts.push(txt(lx + 32 + b.w, ly + 16, `m(${cellsList.join(", ")})`, { size: 11.5, color: "#868e96" }));
    ly += Math.max(26, b.h + 8);
  });
  let y = Math.max(y0 + mh, ly) + 26;

  // The four forms.
  const sumTex = `f = \\sum m(${ones.join(",")})${dcs.length ? ` + d(${dcs.join(",")})` : ""}`;
  const prodTex = `f = \\prod M(${zeros.join(",")})${dcs.length ? ` \\cdot D(${dcs.join(",")})` : ""}`;
  const lines: [string, string][] = [
    [w.nfLabels.sum, ones.length ? sumTex : "f = 0"],
    [w.nfLabels.prod, zeros.length ? prodTex : "f = 1"],
    [w.nfLabels.dnf, `f = ${dnfTex}`],
    [w.nfLabels.cnf, `f = ${cnfTex}`],
  ];
  for (const [label, tex] of lines) {
    parts.push(txt(24, y, label, { size: 12.5, bold: true, color: "#495057" }));
    const b = texBox(tex, 1);
    const k = Math.min(1, (W - 48) / b.w);
    const bb = k < 1 ? texBox(tex, k) : b;
    parts.push(bb.at(24, y + 8 + bb.h / 2, "start"));
    y += bb.h + 30;
  }
  const lits = dnf.reduce((a, p) => a + n - popcount(p.mask), 0);
  const caps: Caption[] = [
    { text: fill(w.nfMinimal, { k: dnf.length, l: lits }), color: C.blue },
    { text: w.nfInfo, color: "#495057" },
  ];
  return compose(`f = ${dnfTex}`, parts.join(""), y - 16, caps);
}

// ---------- circuits ----------

function readVals(s: string, vars: string[], w: LogicWords): Record<string, boolean> {
  const env: Record<string, boolean> = Object.fromEntries(vars.map((v) => [v, false]));
  const t = s.trim();
  if (!t) return env;
  if (/^[01]+$/.test(t)) {
    if (t.length !== vars.length) throw new Error(fill(w.badVals, { s }));
    vars.forEach((v, k) => (env[v] = t[k] === "1"));
    return env;
  }
  for (const part of t.split(/[,;]+|\s+(?=\p{L})/u).map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\p{L}\d*)\s*[=:]\s*([01TFtf])$/u.exec(part);
    if (!m) throw new Error(fill(w.badVals, { s: part }));
    env[m[1]] = /[1Tt]/.test(m[2]);
  }
  return env;
}

const GW = 44; // gate body width
const GH = 36;
const ON = C.green;
const OFF = "#adb5bd";

/** The gate outline with its left edge at x and centre at y; returns where its output starts. */
function gate(op: GateOp, x: number, y: number): { svg: string; out: number } {
  const t = y - GH / 2;
  const b = y + GH / 2;
  const st = `fill="#ffffff" stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round"`;
  const bubble = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="4" fill="#ffffff" stroke="${C.ink}" stroke-width="1.6"/>`;
  const andP = (x0: number) => `<path d="M${x0} ${t} H${x0 + GW - GH / 2} A${GH / 2} ${GH / 2} 0 0 1 ${x0 + GW - GH / 2} ${b} H${x0} Z" ${st}/>`;
  const orP = (x0: number) => `<path d="M${x0} ${t} Q${x0 + GW * 0.62} ${t} ${x0 + GW} ${y} Q${x0 + GW * 0.62} ${b} ${x0} ${b} Q${x0 + 11} ${y} ${x0} ${t} Z" ${st}/>`;
  const xorBack = `<path d="M${x} ${t} Q${x + 11} ${y} ${x} ${b}" fill="none" stroke="${C.ink}" stroke-width="1.8"/>`;
  switch (op) {
    case "not":
      return { svg: `<path d="M${x} ${y - 13} L${x + 26} ${y} L${x} ${y + 13} Z" ${st}/>` + bubble(x + 30, y), out: x + 34 };
    case "and":
      return { svg: andP(x), out: x + GW };
    case "nand":
      return { svg: andP(x) + bubble(x + GW + 4, y), out: x + GW + 8 };
    case "diff":
      return { svg: andP(x) + bubble(x - 4, y + 9), out: x + GW };
    case "or":
      return { svg: orP(x), out: x + GW };
    case "nor":
      return { svg: orP(x) + bubble(x + GW + 4, y), out: x + GW + 8 };
    case "imp":
      return { svg: orP(x) + bubble(x, y - 9), out: x + GW };
    case "xor":
      return { svg: xorBack + orP(x + 6), out: x + GW + 6 };
    case "iff":
      return { svg: xorBack + orP(x + 6) + bubble(x + GW + 10, y), out: x + GW + 14 };
  }
}

type Placed = { node: Node; h: number; y: number; x?: number; out?: number; v: boolean; kids: Placed[] };

function renderCircuit(spec: LogicSpec, w: LogicWords): RenderedSvg {
  const f = parseFormula(spec.f, w);
  const vars = varsOf([f]);
  checkVars(vars, w, 6);
  const env = readVals(spec.vals, vars, w);
  const slot = 40;
  let leaves = 0;
  const place = (n: Node): Placed => {
    const v = evalNode(n, env);
    if (n.t === "var" || n.t === "const") return { node: n, h: 0, y: 16 + slot * leaves++, v, kids: [] };
    const kids = n.t === "not" ? [place(n.a)] : [place(n.a), place(n.b)];
    const y = kids.length === 1 ? kids[0].y : (kids[0].y + kids[1].y) / 2;
    return { node: n, h: 1 + Math.max(...kids.map((k) => k.h)), y, v, kids };
  };
  const root = place(f);
  if (leaves > 14) throw new Error(w.circuitTooBig);
  const inX = 78;
  const colW = 92;
  const parts: string[] = [];
  const wires: string[] = [];
  const col = (h: number) => inX + 38 + (h - 1) * colW;
  const draw = (p: Placed) => {
    if (p.h === 0) {
      p.out = inX;
      const label = p.node.t === "var" ? `${textName(p.node.name)} = ${p.v ? 1 : 0}` : p.v ? "1" : "0";
      parts.push(txt(inX - 8, p.y + 5, label, { size: 14, anchor: "end", bold: true, color: p.v ? ON : "#868e96", italic: false }));
      parts.push(`<circle cx="${inX}" cy="${p.y}" r="3.5" fill="${p.v ? ON : OFF}"/>`);
      return;
    }
    p.kids.forEach(draw);
    const op: GateOp = p.node.t === "not" ? "not" : (p.node as { op: BinOp }).op;
    const x = col(p.h);
    const g = gate(op, x, p.y);
    p.x = x;
    p.out = g.out;
    const ins = p.kids.length === 1 ? [p.y] : [p.y - 9, p.y + 9];
    p.kids.forEach((k, i) => {
      const yi = ins[i];
      const inset = op === "not" ? 0 : op === "or" || op === "nor" || op === "imp" || op === "xor" || op === "iff" ? 4 : 0;
      const bubbled = (op === "imp" && i === 0) || (op === "diff" && i === 1);
      const xi = x + inset - (bubbled ? 8 : 0);
      const xm = xi - 12 - i * 10;
      const color = k.v ? ON : OFF;
      const d = k.y === yi ? `M${k.out} ${k.y} H${xi}` : `M${k.out} ${k.y} H${xm} V${yi} H${xi}`;
      wires.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${k.v ? 2.8 : 2}" stroke-linejoin="round"/>`);
    });
    parts.push(g.svg);
    parts.push(txt(x + GW / 2, p.y + GH / 2 + 12, w.gates[op], { size: 9.5, anchor: "middle", color: "#868e96" }));
    parts.push(txt(g.out + 5, p.y - 6, p.v ? "1" : "0", { size: 11.5, bold: true, color: p.v ? ON : "#868e96" }));
  };
  draw(root);
  const end = (root.out ?? inX) + 44;
  wires.push(`<path d="M${root.out} ${root.y} H${end}" fill="none" stroke="${root.v ? ON : OFF}" stroke-width="3"/>`);
  parts.push(txt(end + 8, root.y + 6, `f = ${root.v ? 1 : 0}`, { size: 17, bold: true, color: root.v ? ON : C.red }));
  const width = end + 60;
  const h = 16 + slot * (leaves - 1) + GH / 2 + 20;
  const body = fit(wires.join("") + parts.join(""), width, h, W - 16, 1.45);
  const valsText = vars.map((v) => `${textName(v)} = ${env[v] ? 1 : 0}`).join(", ");
  const caps: Caption[] = [
    { text: fill(w.circuitOut, { vals: valsText || "—", v: root.v ? 1 : 0 }), color: root.v ? C.green : C.red },
    { text: w.circuitInfo, color: "#495057" },
  ];
  return compose(`f = ${toTex(f)}`, body.svg, body.h, caps);
}

// ---------- arguments ----------

type RuleKey = "mp" | "mt" | "hs" | "ds" | "cd" | "trans" | "simp" | "conj" | "add" | "ac" | "da";
const RULES: { key: RuleKey; prem: string[]; concl: string }[] = [
  { key: "mp", prem: ["P -> Q", "P"], concl: "Q" },
  { key: "mt", prem: ["P -> Q", "~Q"], concl: "~P" },
  { key: "hs", prem: ["P -> Q", "Q -> R"], concl: "P -> R" },
  { key: "ds", prem: ["P | Q", "~P"], concl: "Q" },
  { key: "ds", prem: ["P | Q", "~Q"], concl: "P" },
  { key: "cd", prem: ["P -> Q", "R -> S", "P | R"], concl: "Q | S" },
  { key: "trans", prem: ["P -> Q"], concl: "~Q -> ~P" },
  { key: "ac", prem: ["P -> Q", "Q"], concl: "P" },
  { key: "da", prem: ["P -> Q", "~P"], concl: "~Q" },
  { key: "simp", prem: ["P & Q"], concl: "P" },
  { key: "simp", prem: ["P & Q"], concl: "Q" },
  { key: "conj", prem: ["P", "Q"], concl: "P & Q" },
  { key: "add", prem: ["P"], concl: "P | Q" },
];

function unify(pat: Node, n: Node, b: Map<string, string>): boolean {
  if (pat.t === "var") {
    const key = toText(n);
    const had = b.get(pat.name);
    if (had !== undefined) return had === key;
    b.set(pat.name, key);
    return true;
  }
  if (pat.t === "not") return n.t === "not" && unify(pat.a, n.a, b);
  if (pat.t === "bin") return n.t === "bin" && n.op === pat.op && unify(pat.a, n.a, b) && unify(pat.b, n.b, b);
  return false;
}

const permutations = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));

function ruleOf(prem: Node[], concl: Node, w: LogicWords): RuleKey | undefined {
  for (const r of RULES) {
    if (r.prem.length !== prem.length) continue;
    const pats = r.prem.map((s) => parseFormula(s, w));
    const cp = parseFormula(r.concl, w);
    for (const order of permutations(prem)) {
      const b = new Map<string, string>();
      if (pats.every((p, i) => unify(p, order[i], b)) && unify(cp, concl, b)) {
        // Different letters must stand for different statements (P ∧ P ⊢ P is not "conjunction").
        if (new Set(b.values()).size === b.size) return r.key;
      }
    }
  }
  return undefined;
}

function renderArgument(spec: LogicSpec, w: LogicWords): RenderedSvg {
  const premTexts = spec.f.split(/[;,\n]+/).map((s) => s.trim()).filter(Boolean);
  if (!premTexts.length) throw new Error(w.noPremises);
  const prem = premTexts.map((s) => parseFormula(s, w));
  const concl = parseFormula(spec.g, w);
  const vars = varsOf([...prem, concl]);
  checkVars(vars, w);
  const rows = rowsFor(vars, spec.tf);
  const allP = rows.map((e) => prem.every((p) => evalNode(p, e)));
  const cv = rows.map((e) => evalNode(concl, e));
  const bad = rows.map((_, r) => allP[r] && !cv[r]);
  const cols: TCol[] = [
    ...vars.map((v): TCol => ({ tex: texName(v), kind: "var", vals: rows.map((e) => e[v]) })),
    ...prem.map((p): TCol => ({ tex: toTex(p), kind: "sub", vals: rows.map((e) => evalNode(p, e)) })),
    { tex: toTex(concl), kind: "main", vals: cv },
  ];
  const body = truthTable(
    cols,
    rows.map((_, r) => (bad[r] ? RED_BG : allP[r] ? BLUE_BG : undefined)),
    w,
    spec.tf,
    rows.map((_, r) => (bad[r] ? { text: "✗", color: C.red } : allP[r] ? { text: "✓", color: C.green } : { text: "", color: "" })),
  );
  const k = bad.filter(Boolean).length;
  const caps: Caption[] = [];
  if (!k) caps.push({ text: w.valid, color: C.green });
  else caps.push({ text: fill(w.invalid, { k, row: describeRow(rows[bad.indexOf(true)], vars, w, spec.tf) }), color: C.red });
  const rule = ruleOf(prem, concl, w);
  if (rule) caps.push({ text: w.rules[rule], color: C.blue });
  const head = `${prem.map((p) => toTex(p)).join(",\\; ")} \\;${k ? "\\nvDash" : "\\vDash"}\\; ${toTex(concl)}`;
  return compose(head, body.svg, body.h, caps);
}

// ---------- sets ----------

/** One Venn diagram (1–3 sets) with the regions where the expression holds shaded. */
function venn(n: Node, vars: string[], cx: number, cy: number, color: string, id: string): string {
  const R = 68;
  const centres: [number, number][] =
    vars.length === 1 ? [[cx, cy]] : vars.length === 2 ? [[cx - 38, cy], [cx + 38, cy]] : [[cx - 40, cy - 28], [cx + 40, cy - 28], [cx, cy + 40]];
  const ux = cx - 136;
  const uy = cy - 108;
  const uw = 272;
  const uh = vars.length === 3 ? 236 : 200;
  const uy0 = vars.length === 3 ? uy : uy + 8;
  const defs: string[] = [];
  const parts: string[] = [];
  centres.forEach(([x, y], i) => defs.push(`<clipPath id="${id}c${i}"><circle cx="${x}" cy="${y}" r="${R}"/></clipPath>`));
  for (let m = 0; m < 2 ** vars.length; m++) {
    const env = Object.fromEntries(vars.map((v, i) => [v, ((m >> i) & 1) === 1]));
    if (!evalNode(n, env)) continue;
    const outs = vars.map((_, i) => i).filter((i) => !((m >> i) & 1));
    const ins = vars.map((_, i) => i).filter((i) => (m >> i) & 1);
    defs.push(
      `<mask id="${id}m${m}"><rect x="${ux}" y="${uy0}" width="${uw}" height="${uh}" fill="#ffffff"/>` +
        outs.map((i) => `<circle cx="${centres[i][0]}" cy="${centres[i][1]}" r="${R}" fill="#000000"/>`).join("") +
        `</mask>`,
    );
    let region = `<rect x="${ux}" y="${uy0}" width="${uw}" height="${uh}" fill="${color}" fill-opacity="0.42" mask="url(#${id}m${m})"/>`;
    for (const i of ins) region = `<g clip-path="url(#${id}c${i})">${region}</g>`;
    parts.push(region);
  }
  parts.push(`<rect x="${ux}" y="${uy0}" width="${uw}" height="${uh}" rx="6" fill="none" stroke="#495057" stroke-width="1.6"/>`);
  parts.push(txt(ux + 10, uy0 + uh - 10, "U", { size: 15, bold: true, italic: true, color: "#495057" }));
  centres.forEach(([x, y], i) => {
    parts.push(`<circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${C.ink}" stroke-width="1.8"/>`);
    const lx = vars.length === 1 ? x : vars.length === 2 ? x + (i ? 1 : -1) * 58 : i === 2 ? x + 78 : x + (i ? 1 : -1) * 80;
    const ly = vars.length === 3 ? (i === 2 ? y + 66 : y - 44) : y - R + (vars.length === 1 ? -8 : 4);
    parts.push(txt(lx, ly, textName(vars[i]), { size: 17, bold: true, italic: true, anchor: "middle" }));
  });
  return `<defs>${defs.join("")}</defs>${parts.join("")}`;
}

/** The logic side: x ∈ A ∪ B ⇔ x ∈ A ∨ x ∈ B. */
const membershipTex = (n: Node) => printer(true, "logic", (v, neg) => `x ${neg ? "\\notin" : "\\in"} ${texName(v)}`)(n);

/** U stands for the universe in set expressions. */
const universe = (n: Node): Node =>
  n.t === "var" ? (n.name === "U" ? { t: "const", v: true } : n) : n.t === "not" ? { t: "not", a: universe(n.a) } : n.t === "bin" ? { ...n, a: universe(n.a), b: universe(n.b) } : n;

function renderSets(spec: LogicSpec, w: LogicWords): RenderedSvg {
  const f = universe(parseFormula(spec.f, w));
  const g = spec.g.trim() ? universe(parseFormula(spec.g, w)) : undefined;
  const bad = (n: Node): BinOp | undefined =>
    n.t === "bin" ? (["imp", "iff", "nand", "nor"].includes(n.op) ? n.op : bad(n.a) ?? bad(n.b)) : n.t === "not" ? bad(n.a) : undefined;
  for (const n of [f, g]) {
    const op = n && bad(n);
    if (op) throw new Error(fill(w.notSetOp, { op: TEXT_OPS.logic[op] }));
  }
  const vars = varsOf(g ? [f, g] : [f]);
  checkVars(vars, w, 3);
  if (!vars.length) vars.push("A");
  const parts: string[] = [];
  const cy = 128;
  const diagrams: [Node, string][] = g ? [[f, C.blue], [g, C.orange]] : [[f, C.blue]];
  const xs = g ? [W / 2 - 150, W / 2 + 150] : [W / 2];
  const bottom = cy + (vars.length === 3 ? 128 : 100);
  diagrams.forEach(([n, color], i) => {
    parts.push(venn(n, vars, xs[i], cy, color, `v${i}`));
    if (g) parts.push(texBox(toTex(n, "set"), 1, color).at(xs[i], bottom + 22));
  });
  let y = bottom + (g ? 50 : 16);
  // Membership in logic terms, with x ∈ A written for each set letter.
  for (const [n] of diagrams) {
    const tex = `x \\in ${toTex(n, "set")} \\iff ${membershipTex(n)}`;
    const b = texBox(tex, 0.9);
    const k = Math.min(1, (W - 40) / b.w);
    const bb = k < 1 ? texBox(tex, 0.9 * k) : b;
    parts.push(bb.at(W / 2, y + bb.h / 2));
    y += bb.h + 12;
  }
  const caps: Caption[] = [];
  let head = toTex(f, "set");
  if (g) {
    const rows = rowsFor(vars, false);
    const fv = rows.map((e) => evalNode(f, e));
    const gv = rows.map((e) => evalNode(g, e));
    const same = fv.every((v, i) => v === gv[i]);
    head = `${toTex(f, "set")} ${same ? "=" : "\\neq"} ${toTex(g, "set")}`;
    caps.push(same ? { text: w.setsEqual, color: C.green } : { text: w.setsDiffer, color: C.red });
    if (!same && fv.every((v, i) => !v || gv[i])) caps.push({ text: fill(w.setsSubset, { a: toText(f, "set"), b: toText(g, "set") }), color: C.blue });
    else if (!same && gv.every((v, i) => !v || fv[i])) caps.push({ text: fill(w.setsSubset, { a: toText(g, "set"), b: toText(f, "set") }), color: C.blue });
  }
  caps.push({ text: w.setsInfo, color: "#495057" });
  return compose(head, parts.join(""), y, caps);
}

// ---------- presets ----------

const s = (topic: LogicTopic, f: string, g = "", vals = "", tf = true): LogicSpec => ({ topic, f, g, vals, tf });

export const LOGIC_PRESETS: { [K in LogicTopic]: { label: string; spec: LogicSpec }[] } = {
  table: [
    { label: "p → q", spec: s("table", "p -> q") },
    { label: "(p → q) ∧ p → q", spec: s("table", "(p -> q) & p -> q") },
    { label: "p ∨ ¬p", spec: s("table", "p | ~p") },
    { label: "p ∧ ¬p", spec: s("table", "p & ~p") },
    { label: "(p ∨ q) ∧ ¬r", spec: s("table", "(p | q) & ~r") },
    { label: "p ⊕ q ↔ ¬(p ↔ q)", spec: s("table", "p ^ q <-> ~(p <-> q)") },
    // NAEC 2025, item 10 with option (ე): l lowers blood pressure, r lowers the risk, k beta-blockers, h heart rate, t fatigue.
    { label: "NAEC 2025 · 10: contradiction", spec: s("table", "(l -> r) & (k -> (h & l & t)) & k & (t -> ~r)") },
  ],
  equiv: [
    { label: "De Morgan", spec: s("equiv", "~(p & q)", "~p | ~q") },
    { label: "Contrapositive", spec: s("equiv", "p -> q", "~q -> ~p") },
    { label: "Converse (not equal)", spec: s("equiv", "p -> q", "q -> p") },
    { label: "p → q ≡ ¬p ∨ q", spec: s("equiv", "p -> q", "~p | q") },
    { label: "Distributive law", spec: s("equiv", "p & (q | r)", "(p & q) | (p & r)") },
    { label: "Exportation", spec: s("equiv", "(p & q) -> r", "p -> (q -> r)") },
    // NAEC 2025, item 1: m has a medal, o must give a sample; option (ე) is the trap.
    { label: "NAEC 2025 · 1: m → ¬o vs (ე)", spec: s("equiv", "m -> ~o", "~o -> ~m") },
  ],
  nf: [
    { label: "m(0,2,5,7,8,10,13,15)", spec: s("nf", "m(0,2,5,7,8,10,13,15)", "", "", false) },
    { label: "Majority of 3", spec: s("nf", "AB + BC + AC", "", "", false) },
    { label: "Wrap-around corners", spec: s("nf", "m(0,2,8,10,5)", "", "", false) },
    { label: "With don't-cares", spec: s("nf", "m(1,3,7,11,15) + d(0,2,5)", "", "", false) },
    { label: "XOR (no groups)", spec: s("nf", "A ^ B ^ C", "", "", false) },
    { label: "p → q", spec: s("nf", "p -> q", "", "", false) },
  ],
  circuit: [
    { label: "Half adder sum", spec: s("circuit", "A ^ B", "", "A=1, B=0", false) },
    { label: "Majority", spec: s("circuit", "AB + BC + AC", "", "A=1, B=0, C=1", false) },
    { label: "Multiplexer", spec: s("circuit", "S'A + SB", "", "S=0, A=1, B=0", false) },
    { label: "De Morgan", spec: s("circuit", "~(A & B)", "", "A=1, B=1", false) },
    { label: "Full adder carry", spec: s("circuit", "AB + C(A ^ B)", "", "A=1, B=0, C=1", false) },
    { label: "NOT from NAND", spec: s("circuit", "A nand A", "", "A=0", false) },
  ],
  argument: [
    { label: "Modus ponens", spec: s("argument", "p -> q; p", "q") },
    { label: "Modus tollens", spec: s("argument", "p -> q; ~q", "~p") },
    { label: "Chain", spec: s("argument", "p -> q; q -> r", "p -> r") },
    { label: "Disjunctive syllogism", spec: s("argument", "p | q; ~p", "q") },
    { label: "Affirming the consequent", spec: s("argument", "p -> q; q", "p") },
    { label: "Denying the antecedent", spec: s("argument", "p -> q; ~p", "~q") },
    { label: "Transposition", spec: s("argument", "p -> q", "~q -> ~p") },
    { label: "Constructive dilemma", spec: s("argument", "p -> q; r -> s; p | r", "q | s") },
    // NAEC 2025, variant I.
    { label: "NAEC 2025 · 2", spec: s("argument", "~d -> b; s <-> (b & ~d)", "~s -> d") },
    { label: "NAEC 2025 · 3", spec: s("argument", "i -> e; i -> ~(p & e)", "p -> ~i") },
    { label: "NAEC 2025 · 6 (I)", spec: s("argument", "v -> y; ~v", "~y") },
    { label: "NAEC 2025 · 6 (II)", spec: s("argument", "y -> v; ~v", "~y") },
    { label: "NAEC 2025 · 7", spec: s("argument", "s -> (a -> z); b -> ~z", "s -> (a -> ~b)") },
  ],
  board: BOARD_PRESETS,
  knights: KNIGHTS_PRESETS,
  sets: [
    { label: "A ∪ B", spec: s("sets", "A ∪ B") },
    { label: "A ∩ B′", spec: s("sets", "A ∩ B'") },
    { label: "De Morgan", spec: s("sets", "(A ∪ B)'", "A' ∩ B'") },
    { label: "(A ∩ B) ∪ C", spec: s("sets", "(A ∩ B) ∪ C") },
    { label: "Distributive law", spec: s("sets", "A ∩ (B ∪ C)", "(A ∩ B) ∪ (A ∩ C)") },
    { label: "A Δ B vs A ∪ B", spec: s("sets", "A Δ B", "A ∪ B") },
  ],
};

export function renderLogic(spec: LogicSpec, words: LogicWords): RenderedSvg {
  switch (spec.topic) {
    case "table":
      return renderTable(spec, words);
    case "equiv":
      return renderEquiv(spec, words);
    case "nf":
      return renderNf(spec, words);
    case "circuit":
      return renderCircuit(spec, words);
    case "argument":
      return renderArgument(spec, words);
    case "sets":
      return renderSets(spec, words);
    case "board":
      return renderBoard(spec.board ?? BOARD_PRESETS[0].spec.board!, words);
    case "knights":
      return renderKnights(spec.f, words);
  }
}
