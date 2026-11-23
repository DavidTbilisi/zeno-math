// Which tool?: a problem appears and the player picks the method that fits it, without solving it, from a set of
// look-alikes: fractions (common denominator, multiply across, flip and multiply), word problems (the bar-model forms
// of barProblems.ts), equations (undo in order, collect like terms, cross-multiply) and quadratics (factor, take
// square roots, complete the square, the formula). Each set is a game of its own, with its own ladder. A problem's
// right tool is the generator that made it: the practice skills' own generators (skills/fractions.ts, linear.ts,
// quadratic.ts and the bar-model forms) where they make that kind of problem, a few lines here where they do not
// (square roots, the formula with a number before x², cross-multiplying, a fraction to undo, a division over one
// denominator). Where two tools both work (x² − 49 = 0 factors and takes roots; 6/7 ÷ 2/7 divides the tops), both
// count and only the quicker keeps the third star. A wrong pick is not taken: the problem is shown solved by its tool
// in two lines, and that tool lit, to tap on. Kept free of React; a word problem's words and its two lines are the
// locale's.
import { barQuestion, type BarForm, type BarQuestion } from "./barProblems";
import { Frac } from "./fraction";
import type { EndlessGame, GameLevel, TryGame } from "./ladder";
import { gcd, rngOf } from "./practiceKit";
import type { Exercise, PracticeWords, Rng } from "./practiceTypes";
import fracGen from "./skills/fractions";
import linearGen from "./skills/linear";
import quadGen from "./skills/quadratic";

export const GROUPS = ["frac", "word", "eq", "quad"] as const;
export type Group = (typeof GROUPS)[number];
const WORD_TOOLS = ["less", "posts", "howMuchMore", "sumDiff", "times", "loop", "give", "leftShort", "three"] as const satisfies readonly BarForm[];
/** Each set's tools, in the order their tiles stand (and their keys, 1 to 9). */
export const TOOLS = {
  frac: ["common", "across", "flip"],
  word: WORD_TOOLS,
  eq: ["undo", "collect", "cross"],
  quad: ["factor", "roots", "complete", "formula"],
} as const;
export type Tool = (typeof TOOLS)[Group][number];
/** The live piece each set is. */
export const WHICH_KINDS = { frac: "whichFrac", word: "whichWord", eq: "whichEq", quad: "whichQuad" } as const;

/** A piece of written maths: words and signs, or a fraction stacked over its bar. */
export type Tok = string | { n: string; d: string };
export type Problem = {
  tool: Tool;
  /** A second tool that also works, slower: it counts, without the third star. */
  also: Tool | null;
  /** What made it, for the tests. */
  kind: string;
  /** The problem as written; empty for a word problem (its words are the locale's). */
  show: Tok[];
  /** The problem solved by its tool in two lines; empty for a word problem (the locale's lines, filled with `vars`). */
  lines: Tok[][];
  /** Its numbers: the coefficients, the fractions, the bar model's amounts. */
  vars: Record<string, number>;
  bar?: BarQuestion;
};

// ---------- writing maths ----------

const MINUS = "−";
/** A number with a true minus sign. */
export const num = (v: number) => (v < 0 ? `${MINUS}${-v}` : `${v}`);
/** " + 3" or " − 3", for a term after the first. */
const signed = (v: number) => (v < 0 ? ` ${MINUS} ${-v}` : ` + ${v}`);
/** A coefficient before x: x, −x, 3x. */
const xTerm = (c: number, v = "x") => (c === 1 ? v : c === -1 ? `${MINUS}${v}` : `${num(c)}${v}`);
/** a x² + b x + c with the zero terms left out, highest power first. */
export function polyText(c0: number, c1 = 0, c2 = 0): string {
  const terms = [
    [c2, "x²"],
    [c1, "x"],
    [c0, ""],
  ] as const;
  let out = "";
  for (const [c, v] of terms) {
    if (!c) continue;
    const body = v ? (Math.abs(c) === 1 ? v : `${Math.abs(c)}${v}`) : `${Math.abs(c)}`;
    out += out ? ` ${c < 0 ? MINUS : "+"} ${body}` : c < 0 ? `${MINUS}${body}` : body;
  }
  return out || "0";
}
/** A fraction as written: a whole number plain, a negative one with its sign before the bar. */
function fracToks(f: Frac): Tok[] {
  if (f.d === 1) return [num(f.n)];
  const bar = { n: `${Math.abs(f.n)}`, d: `${f.d}` };
  return f.n < 0 ? [MINUS, bar] : [bar];
}
/** What top/bottom comes to, after it: cut down (= 3/20), and as a mixed number when it is more than one (= 3 5/12). */
function cutDown(top: number, bottom: number): Tok[] {
  const f = new Frac(top, bottom);
  const out: Tok[] = f.n !== top || f.d !== bottom ? [" = ", ...fracToks(f)] : [];
  if (f.d !== 1 && Math.abs(f.n) > f.d) out.push(" = ", `${num(Math.trunc(f.n / f.d))} `, { n: `${Math.abs(f.n) % f.d}`, d: `${f.d}` });
  return out;
}
/** "= top/bottom", then what it comes to. */
const comesTo = (top: number, bottom: number): Tok[] => (bottom === 1 ? [`= ${num(top)}`] : ["= ", { n: `${top}`, d: `${bottom}` }, ...cutDown(top, bottom)]);
/** The text of a line, for a screen reader: fractions as a/b, in brackets when they are more than a number. */
export function plainOf(toks: readonly Tok[]): string {
  const part = (s: string) => (/^[\d−]+$/.test(s) ? s : `(${s})`);
  return toks.map((t) => (typeof t === "string" ? t : `${part(t.n)}/${part(t.d)}`)).join("");
}

// ---------- the skills' generators ----------

/** The practice generators need words only for their prompts, which are not shown here. */
const NO_WORDS = { prompts: {}, formulae: {} } as unknown as PracticeWords;
type Spec = { topic?: string; eq?: string; type?: string; op?: string; a?: string; b?: string };
const specOf = (ex: Omit<Exercise, "skill" | "level" | "seed">): Spec => (ex.solution?.spec ?? {}) as Spec;

/** The coefficients [c0, c1, c2] of a polynomial written out by practiceKit's polyStr ("2x^2 - 3x + 4"). */
export function coeffsOf(s: string): number[] {
  const cs = [0, 0, 0];
  for (const t of s.replace(/\s+/g, "").match(/[+-]?[^+-]+/g) ?? []) {
    const m = /^([+-]?)(\d*)(x(\^2)?)?$/.exec(t);
    if (!m || (!m[2] && !m[3])) throw new Error(`not a polynomial: ${s}`);
    cs[m[3] ? (m[4] ? 2 : 1) : 0] += (m[1] === "-" ? -1 : 1) * (m[2] ? Number(m[2]) : 1);
  }
  return cs;
}
/** A side of a linear equation as the linear skill writes it: "3x - 4", "5", or "3(x - 2)", as [c0, c1]. */
export function sideOf(s: string): number[] {
  const m = /^(\d+)\((.*)\)$/.exec(s.trim());
  if (m) return coeffsOf(m[2]).slice(0, 2).map((c) => c * Number(m[1]));
  return coeffsOf(s).slice(0, 2);
}

// ---------- quadratics ----------

const isSquare = (n: number) => n >= 0 && Number.isInteger(Math.sqrt(n));
const two = (v: number) => String(Math.round(v * 100) / 100);

/** A quadratic a x² + b x + c = 0 that the quadratic skill made: at level 1 or 2 one that factors, at 3 one that doesn't. */
function skillQuad(r: Rng, L: 1 | 2 | 3): { a: number; b: number; c: number } {
  const [c, b, a] = coeffsOf(specOf(quadGen(r, L, NO_WORDS)).eq!.split("=")[0]);
  return { a, b, c };
}

/** Factor's two lines: the brackets, then the roots. */
function factorLines(a: number, b: number, c: number): Tok[][] {
  const s = Math.sqrt(b * b - 4 * a * c);
  const roots = [new Frac(-b - s, 2 * a), new Frac(-b + s, 2 * a)].sort((x, y) => x.toNumber() - y.toNumber());
  // A root n/d is the bracket (d x − n); what is left of a is the number in front.
  const bracket = (f: Frac) => (f.n === 0 ? "x" : `(${xTerm(f.d)}${signed(-f.n)})`);
  const k = a / (roots[0].d * roots[1].d);
  const front = k === 1 ? "" : k === -1 ? MINUS : num(k);
  const [p, q] = roots[0].n === 0 ? roots : roots[1].n === 0 ? [roots[1], roots[0]] : roots;
  return [[`${front}${bracket(p)}${bracket(q)} = 0`], ["x = ", ...fracToks(roots[0]), ",  x = ", ...fracToks(roots[1])]];
}

function quadProblem(kind: string, r: Rng): Problem {
  switch (kind) {
    case "factor":
    case "factorA": {
      // The skill's easy question (x² with two whole roots) or medium one (2x² or 3x², a root that is a fraction);
      // one with no x term is a square roots question, and is not this kind.
      let q: { a: number; b: number; c: number };
      do q = skillQuad(r, kind === "factor" ? 1 : 2);
      while (q.b === 0);
      return { tool: "factor", also: null, kind, show: [`${polyText(q.c, q.b, q.a)} = 0`], lines: factorLines(q.a, q.b, q.c), vars: q };
    }
    case "complete":
    case "formula": {
      // The skill's hard question: x² + bx + c with roots that are not whole. An even b halves into (x + b/2)², so
      // completing the square is quickest (the formula works too); an odd b leaves halves, and the formula is quicker.
      let q: { a: number; b: number; c: number };
      do q = skillQuad(r, 3);
      while (q.b === 0 || (q.b % 2 === 0) !== (kind === "complete"));
      const { a, b, c } = q;
      const D = b * b - 4 * a * c;
      const show = [`${polyText(c, b, a)} = 0`];
      if (kind === "complete") {
        const h = b / 2;
        return { tool: "complete", also: "formula", kind, show, vars: q, lines: [[`(x${signed(h)})² = ${num(-c)} + ${h * h} = ${h * h - c}`], [`x = ${num(-h)} ± √${h * h - c}`]] };
      }
      return { tool: "formula", also: null, kind, show, vars: q, lines: formulaLines(a, b, c, D) };
    }
    case "formulaA": {
      // Not x² alone, and roots that are not whole: the formula.
      for (;;) {
        const [a, b, c] = [r.int(2, 3), r.nz(-7, 7), r.nz(-9, 9)];
        const D = b * b - 4 * a * c;
        if (D <= 0 || isSquare(D)) continue;
        return { tool: "formula", also: null, kind, show: [`${polyText(c, b, a)} = 0`], vars: { a, b, c }, lines: formulaLines(a, b, c, D) };
      }
    }
    default: {
      // No x term: x² on its own equals a number, so take the square root of both sides. With a square number it
      // factors too, as a difference of two squares, but roots are quicker.
      const sq = kind === "rootsSq";
      const a = r.pick([1, 1, 2, 3]);
      let k: number;
      do k = sq ? r.int(2, 9) ** 2 : r.int(2, 60);
      while (!sq && isSquare(k));
      const c = -a * k;
      const ax = a === 1 ? "x²" : `${a}x²`;
      const show = [r.next() < 0.5 ? `${ax} ${MINUS} ${a * k} = 0` : `${ax} = ${a * k}`];
      const first = a === 1 ? `x² = ${k}` : `x² = ${a * k} ÷ ${a} = ${k}`;
      const root = sq ? `x = ±${Math.sqrt(k)}` : `x = ±√${k} ≈ ±${two(Math.sqrt(k))}`;
      return { tool: "roots", also: sq ? "factor" : null, kind, show, vars: { a, b: 0, c }, lines: [[first], [root]] };
    }
  }
}
function formulaLines(a: number, b: number, c: number, D: number): Tok[][] {
  const ac = -4 * a * c;
  return [[`b² − 4ac = ${b * b}${signed(ac)} = ${D}`], ["x = ", { n: `${num(-b)} ± √${D}`, d: `${2 * a}` }]];
}

// ---------- fractions ----------

type Part = { w: number; n: number; d: number };
const partToks = (p: Part): Tok[] => [...(p.w ? [`${p.w} `] : []), { n: `${p.n}`, d: `${p.d}` }];
const improperToks = (p: Part): Tok[] => [{ n: `${p.w * p.d + p.n}`, d: `${p.d}` }];
function partOf(s: string): Part {
  const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(s.trim());
  if (!m) throw new Error(`not a fraction: ${s}`);
  return { w: Number(m[1] ?? 0), n: Number(m[2]), d: Number(m[3]) };
}
/** An operation the fractions skill made at a level (easy: + and −; medium; hard, with mixed numbers), of the signs asked. */
function skillFrac(r: Rng, L: 1 | 2 | 3, ops: readonly string[]): { op: string; a: Part; b: Part } {
  for (;;) {
    const s = specOf(fracGen(r, L, NO_WORDS));
    if (s.type === "fracop" && ops.includes(s.op!)) return { op: s.op!, a: partOf(s.a!), b: partOf(s.b!) };
  }
}
const OP_SIGN: Record<string, string> = { "+": "+", "-": MINUS, "×": "×", "÷": "÷" };

function fracProblem(kind: string, r: Rng): Problem {
  let o: { op: string; a: Part; b: Part };
  if (kind === "divSame") {
    // One denominator under both: dividing the tops is quickest (flip and multiply works too).
    const d = r.int(3, 12);
    const n1 = r.int(1, d - 1);
    let n2: number;
    do n2 = r.int(1, d - 1);
    while (n2 === n1);
    o = { op: "÷", a: { w: 0, n: n1, d }, b: { w: 0, n: n2, d } };
  } else {
    const L = kind.endsWith("Mixed") ? 3 : kind === "add" ? 1 : 2;
    const ops = kind.startsWith("add") ? ["+", "-"] : kind.startsWith("times") ? ["×"] : ["÷"];
    // A division over different denominators, or the tops would divide.
    do o = skillFrac(r, L, ops);
    while (o.op === "÷" && o.a.d === o.b.d);
  }
  const { op, a, b } = o;
  // The tops as the fractions are written (not cut down), so each line follows from the one before.
  const [An, Bn] = [a.w * a.d + a.n, b.w * b.d + b.n];
  const mixed = a.w > 0 || b.w > 0;
  const head: Tok[] = [...partToks(a), ` ${OP_SIGN[op]} `, ...partToks(b), " = "];
  // A mixed number is written as one fraction first.
  const improper: Tok[] = mixed ? [...improperToks(a), ` ${OP_SIGN[op]} `, ...improperToks(b), " = "] : [];
  const vars = { aw: a.w, an: a.n, ad: a.d, bw: b.w, bn: b.n, bd: b.d };
  const show = head.slice(0, -1);
  if (op === "+" || op === "-") {
    const L = (a.d * b.d) / gcd(a.d, b.d);
    const [x, y] = [(An * L) / a.d, (Bn * L) / b.d];
    const top = op === "+" ? x + y : x - y;
    // Over one denominator already, the tops are added as they are.
    const same = a.d === b.d && !mixed;
    const first: Tok[] = same ? [...head, { n: `${a.n} ${OP_SIGN[op]} ${b.n}`, d: `${L}` }] : [...head, ...improper, { n: `${x}`, d: `${L}` }, ` ${OP_SIGN[op]} `, { n: `${y}`, d: `${L}` }];
    return { tool: "common", also: null, kind, show, vars, lines: [first, comesTo(top, L)] };
  }
  if (kind === "divSame") return { tool: "common", also: "flip", kind, show, vars, lines: [[...head, `${a.n} ÷ ${b.n}`], comesTo(a.n, b.n)] };
  // Times: tops times tops, bottoms times bottoms. Divide: the second turned upside down, then times.
  const [P, Q] = op === "×" ? [[An, a.d], [Bn, b.d]] : [[An, a.d], [b.d, Bn]];
  const [top, bottom] = [P[0] * Q[0], P[1] * Q[1]];
  const first: Tok[] =
    op === "×" ? [...head, ...improper, { n: `${P[0]} × ${Q[0]}`, d: `${P[1]} × ${Q[1]}` }] : [...head, ...improper, { n: `${P[0]}`, d: `${P[1]}` }, " × ", { n: `${Q[0]}`, d: `${Q[1]}` }];
  return { tool: op === "×" ? "across" : "flip", also: null, kind, show, vars, lines: [first, comesTo(top, bottom)] };
}

// ---------- equations ----------

/** The answer x as written: a whole number, or a fraction. */
const xIs = (f: Frac): Tok[] => ["x = ", ...fracToks(f)];
/** "5x − 2x" with the x's of both sides, "x" for 1x. */
const less = (p: string, q: number) => (q < 0 ? `${p} + ${-q}` : `${p} ${MINUS} ${q}`);

/** Collecting the x's on the side with more of them: the two lines, from a x + b = c x + d. */
function collectLines(a: number, b: number, c: number, d: number, first?: Tok[]): Tok[][] {
  const [hi, lo, keep, move] = a > c ? [a, c, d, b] : [c, a, b, d];
  const k = hi - lo;
  const x = new Frac(keep - move, k);
  const xs = `${xTerm(hi)} ${MINUS} ${xTerm(lo)}`;
  const nums = move === 0 ? num(keep) : less(num(keep), move);
  const sides = a > c ? `${xs} = ${nums}` : `${nums} = ${xs}`;
  // One x left over is x itself.
  const solved: Tok[] = k === 1 ? xIs(x) : [`${xTerm(k)} = ${num(keep - move)}  →  `, ...xIs(x)];
  if (first) return [first, [`${sides}  →  `, ...solved]];
  return [[sides], solved];
}

function eqProblem(kind: string, r: Rng): Problem {
  switch (kind) {
    case "undo":
    case "collect":
    case "brackets": {
      // The linear skill's easy question (x on one side: a x + b = c), medium (x on both sides) and hard (a bracket
      // to multiply out first, then x on both sides).
      const eq = specOf(linearGen(r, kind === "undo" ? 1 : kind === "collect" ? 2 : 3, NO_WORDS)).eq!;
      const [left, right] = eq.split("=");
      const [b, a] = sideOf(left);
      const [d, c] = sideOf(right);
      const shown = (s: string) => s.trim().replace(/\^2/g, "²").replace(/-/g, MINUS);
      const show = [`${shown(left)} = ${shown(right)}`];
      const vars = { a, b, c, d };
      if (kind === "undo") {
        const x = new Frac(d - b, a);
        return { tool: "undo", also: null, kind, show, vars, lines: [[`${xTerm(a)} = ${less(num(d), b)} = ${num(d - b)}`], [`x = ${num(d - b)} ÷ ${a} = `, ...fracToks(x)]] };
      }
      const first = kind === "brackets" ? [`${polyText(b, a)} = ${polyText(d, c)}`] : undefined;
      return { tool: "collect", also: null, kind, show, vars, lines: collectLines(a, b, c, d, first) };
    }
    case "cross": {
      // k ⁄ (x + b) = c ⁄ d: x under a bar, a fraction each side; their crosses are equal.
      for (;;) {
        const [m, c, d, b] = [r.int(2, 9), r.int(1, 9), r.int(2, 9), r.nz(-6, 6)];
        const k = (c * m) / d;
        const x = m - b;
        if (!Number.isInteger(k) || x === 0 || (k === c && m === d) || gcd(c, d) !== 1) continue;
        return {
          tool: "cross",
          also: null,
          kind,
          show: [{ n: `${k}`, d: `x${signed(b)}` }, " = ", { n: `${c}`, d: `${d}` }],
          vars: { k, b, c, d, x },
          lines: [[`${k} · ${d} = ${c === 1 ? `x${signed(b)}` : `${c}(x${signed(b)})`}`], [`${k * d} = ${polyText(c * b, c)}  →  `, ...xIs(new Frac(x))]],
        };
      }
    }
    case "crossBoth": {
      // (x + a) ⁄ b = (x + c) ⁄ d: x over a bar on both sides.
      for (;;) {
        const [b, d, x, a] = [r.int(2, 6), r.int(2, 6), r.nz(-9, 9), r.nz(-9, 9)];
        const c = (d * (x + a)) / b - x;
        if (b === d || !Number.isInteger(c) || c === 0 || c === a) continue;
        return {
          tool: "cross",
          also: null,
          kind,
          show: [{ n: `x${signed(a)}`, d: `${b}` }, " = ", { n: `x${signed(c)}`, d: `${d}` }],
          vars: { a, b, c, d, x },
          lines: [[`${d}(x${signed(a)}) = ${b}(x${signed(c)})`], [`${polyText(d * a, d)} = ${polyText(b * c, b)}  →  `, ...xIs(new Frac(x))]],
        };
      }
    }
    default: {
      // (x + a) ⁄ b = c: undo the last thing done to x first (times b, then take a); cross-multiplying over c ⁄ 1 works too.
      const [a, b, c] = [r.nz(-9, 9), r.int(2, 9), r.nz(-9, 9)];
      return {
        tool: "undo",
        also: "cross",
        kind,
        show: [{ n: `x${signed(a)}`, d: `${b}` }, ` = ${num(c)}`],
        vars: { a, b, c },
        lines: [[`x${signed(a)} = ${num(c)} × ${b} = ${num(b * c)}`], [`x = ${less(num(b * c), a)} = ${num(b * c - a)}`]],
      };
    }
  }
}

// ---------- word problems ----------

/** The numbers a word problem's two lines use: its own and the amounts found on the way. */
function barVars(q: BarQuestion): Record<string, number> {
  const v = { ...q.vars, v: q.v };
  if (q.form === "sumDiff" || q.form === "three") return { ...v, e: q.vars.t - q.vars.d };
  if (q.form === "times") return { ...v, m: q.vars.k + 1 };
  if (q.form === "leftShort") return { ...v, ls: q.vars.l + q.vars.s };
  return v;
}
function wordProblem(form: BarForm, r: Rng): Problem {
  const q = barQuestion(form, r.next);
  return { tool: form, also: null, kind: form, show: [], lines: [], vars: barVars(q), bar: q };
}

// ---------- rounds ----------

/** The kinds of problem each tool's are made as; a hard round adds the look-alikes and the harder numbers. */
const KINDS: Record<Tool, { easy: string[]; hard: string[] }> = {
  common: { easy: ["add"], hard: ["addMixed", "divSame"] },
  across: { easy: ["times"], hard: ["timesMixed"] },
  flip: { easy: ["divide"], hard: ["divideMixed"] },
  undo: { easy: ["undo"], hard: ["undoFrac"] },
  collect: { easy: ["collect"], hard: ["brackets"] },
  cross: { easy: ["cross"], hard: ["crossBoth"] },
  factor: { easy: ["factor"], hard: ["factorA"] },
  roots: { easy: ["roots"], hard: ["rootsSq"] },
  complete: { easy: ["complete"], hard: [] },
  formula: { easy: ["formula"], hard: ["formulaA"] },
  ...(Object.fromEntries(WORD_TOOLS.map((f) => [f, { easy: [f], hard: [] }])) as unknown as Record<BarForm, { easy: string[]; hard: string[] }>),
};
/** The kinds that two tools solve, and the slower one. */
const TWO_TOOLS: Record<string, Tool> = { divSame: "flip", undoFrac: "cross", rootsSq: "factor", complete: "formula" };

/** A problem of a kind, made with `r`. */
export function problemOf(group: Group, kind: string, r: Rng): Problem {
  if (group === "quad") return quadProblem(kind, r);
  if (group === "frac") return fracProblem(kind, r);
  if (group === "eq") return eqProblem(kind, r);
  return wordProblem(kind as BarForm, r);
}

export type RoundSpec = { group: Group; tools: readonly Tool[]; size: number; hard?: boolean };
export type WhichTask = { group: Group; tools: Tool[]; items: Problem[] };
const shuffled = <T>(xs: readonly T[], r: Rng): T[] => xs.map((x) => [r.next(), x] as const).sort((p, q) => p[0] - q[0]).map(([, x]) => x);
const textOf = (p: Problem) => (p.bar ? JSON.stringify(p.vars) : plainOf(p.show));

/**
 * A round: `size` problems, each of the round's tools at least once when there is room (else as many different ones
 * as fit), the rest of any; a hard round has the look-alikes in it, and at least one problem two tools solve when the
 * set has one. The tiles are the round's tools in the set's order.
 */
export function whichTask(spec: RoundSpec, r: Rng): WhichTask {
  const tools = TOOLS[spec.group].filter((t) => spec.tools.includes(t)) as Tool[];
  // A hard round has a problem two of its tiles solve, when its tools have one.
  const twoWork = spec.hard && tools.some((t) => [...KINDS[t].easy, ...KINDS[t].hard].some((k) => TWO_TOOLS[k] && tools.includes(TWO_TOOLS[k])));
  for (;;) {
    const picks = spec.size >= tools.length ? [...tools, ...Array.from({ length: spec.size - tools.length }, () => r.pick(tools))] : shuffled(tools, r).slice(0, spec.size);
    const items: Problem[] = [];
    for (const t of shuffled(picks, r)) {
      const kinds = spec.hard ? [...KINDS[t].easy, ...KINDS[t].hard] : KINDS[t].easy;
      let p: Problem;
      // Never the same problem twice in a round.
      do p = problemOf(spec.group, r.pick(kinds), r);
      while (items.some((q) => textOf(q) === textOf(p)));
      items.push(p);
    }
    if (twoWork && !items.some((p) => p.also && tools.includes(p.also))) continue;
    return { group: spec.group, tools, items };
  }
}

/** Each set's ladder: the first puzzles set two or three tools side by side, the later ones all, then the look-alikes. */
export const WHICH_LADDERS: Record<Group, (Omit<RoundSpec, "group"> & { seed: number })[]> = {
  frac: [
    { tools: ["common", "across"], size: 5, seed: 5811 },
    { tools: ["across", "flip"], size: 5, seed: 5812 },
    { tools: ["common", "flip"], size: 5, seed: 5813 },
    { tools: TOOLS.frac, size: 6, seed: 5814 },
    { tools: TOOLS.frac, size: 6, hard: true, seed: 5815 },
    { tools: TOOLS.frac, size: 8, hard: true, seed: 5816 },
  ],
  word: [
    { tools: ["less", "posts", "howMuchMore"], size: 5, seed: 5821 },
    { tools: ["sumDiff", "times", "loop"], size: 5, seed: 5822 },
    { tools: ["give", "leftShort", "three"], size: 5, seed: 5823 },
    { tools: ["less", "howMuchMore", "sumDiff", "posts", "loop"], size: 6, seed: 5824 },
    { tools: TOOLS.word, size: 8, seed: 5825 },
    { tools: TOOLS.word, size: 9, seed: 5826 },
  ],
  eq: [
    { tools: ["undo", "collect"], size: 5, seed: 5831 },
    { tools: ["collect", "cross"], size: 5, seed: 5832 },
    { tools: TOOLS.eq, size: 6, seed: 5833 },
    { tools: ["undo", "collect"], size: 6, hard: true, seed: 5834 },
    { tools: TOOLS.eq, size: 6, hard: true, seed: 5835 },
    { tools: TOOLS.eq, size: 8, hard: true, seed: 5836 },
  ],
  quad: [
    { tools: ["factor", "roots"], size: 5, seed: 5841 },
    { tools: ["factor", "formula"], size: 5, seed: 5842 },
    { tools: ["complete", "formula"], size: 5, seed: 5843 },
    { tools: TOOLS.quad, size: 6, seed: 5844 },
    { tools: TOOLS.quad, size: 6, hard: true, seed: 5845 },
    { tools: TOOLS.quad, size: 8, hard: true, seed: 5846 },
  ],
};
/** The endless run: four problems of every tool, five with the look-alikes, six; word problems the first two levels' forms, then all. */
export function levelSpec(group: Group, level: GameLevel): RoundSpec {
  const tools = group === "word" && level === 1 ? WORD_TOOLS.slice(0, 6) : TOOLS[group];
  return { group, tools, size: 3 + level, hard: level > 1 };
}

// ---------- the board's state ----------

export type WhichNotice = "quicker" | "allTools" | "streak10";
export const WHICH_NOTICES: WhichNotice[] = ["quicker", "allTools", "streak10"];
/** What the line says: a wrong tile (the problem then solved by its tool), or a slower tool that also worked. */
export type WhichSaid = { kind: "wrong"; tile: number } | { kind: "also"; tile: number; k: number };
export type LiveWhich = EndlessGame<WhichNotice, GameLevel, WhichSaid> &
  TryGame & {
    group: Group;
    /** The tools picked right so far, one a problem, by their index in TOOLS[group]. */
    ops: number[];
  };
export const whichStart = (group: Group): LiveWhich => ({ group, mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null });

export function whichNow(d: Pick<LiveWhich, "group" | "mode" | "stage" | "level" | "seed">): WhichTask {
  if (d.mode === "puzzle") {
    const s = WHICH_LADDERS[d.group][d.stage] ?? WHICH_LADDERS[d.group][0];
    return whichTask({ ...s, group: d.group }, rngOf(s.seed));
  }
  return whichTask(levelSpec(d.group, d.level), rngOf(d.seed));
}

/** How far a round has gone: the problem being asked, and the tools picked for the ones before. */
export type WhichMachine = { task: WhichTask; k: number; picks: Tool[] };
export const replay = (task: WhichTask, ops: readonly number[]): WhichMachine => ({ task, k: Math.min(ops.length, task.items.length), picks: ops.map((i) => TOOLS[task.group][i]) });
/** The problem being asked, or null once all are answered. */
export const asked = (m: WhichMachine): Problem | null => m.task.items[m.k] ?? null;
export const fits = (p: Problem, t: Tool) => t === p.tool || t === p.also;
/** The tools the round's answers would be, all the quickest: the ops of a round played without a slip. */
export const bestOps = (task: WhichTask) => task.items.map((p) => (TOOLS[task.group] as readonly Tool[]).indexOf(p.tool));

export type WhichCheck = { ok: true; slow: boolean } | { ok: false };
/** A tile (its index in TOOLS[group]) against the problem asked: right (and whether a quicker tool was there), or not. */
export function checkTile(m: WhichMachine, tile: number): WhichCheck {
  const p = asked(m);
  const t = TOOLS[m.task.group][tile] as Tool | undefined;
  if (!p || !t || !fits(p, t)) return { ok: false };
  return { ok: true, slow: t !== p.tool };
}
/** The picks that worked but were not the quickest. */
export const slowPicks = (m: WhichMachine) => m.picks.filter((t, i) => m.task.items[i] && t !== m.task.items[i].tool).length;

/** No miss and every pick the quickest: three stars; a slower tool or one miss: two; more: one. */
export const whichStars = (misses: number, slow: number) => (misses === 0 ? (slow === 0 ? 3 : 2) : misses === 1 ? 2 : 1);

/** What a round finished showed: ten clean rounds in a row; a clean round that told every two-tool problem's quicker tool; one that used every tool of its set. */
export function whichNotice(m: WhichMachine, misses: number, streak: number): WhichNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  const items = m.task.items;
  if (items.some((p) => p.also && m.task.tools.includes(p.also)) && slowPicks(m) === 0) return "quicker";
  const used = new Set(m.picks);
  return TOOLS[m.task.group].every((t) => used.has(t)) ? "allTools" : null;
}
