// Where it breaks (issue #577): a worked answer to judge. The checker names a wrong answer after a student makes it
// (the traps on each question, mistakes.ts); it never asks them to find one, which is what shows whether they know
// where a rule stops working. So a question is worked line by line, either rightly or with one recognised mistake
// in it, and the student says whether it is right, taps the line where it goes wrong, and picks what went wrong from
// three named mistakes, one of them the real one.
//
// The mistakes are the question's own traps, worked into the lines, so the working comes to exactly the answer the
// trap gives (the tests type it into the checker, which names that mistake). Times and hcf have no traps, and a skill
// with one trap leaves nothing to pick between, so a few slips that need no trap fill the lists (SLIPS): a times-table
// fact one row off, a partial product without its zero, a carry lost, a common factor that isn't the highest. Each
// mistake belongs to the idea it shows is missing (gapIdea in ideaState.ts, or SLIPS), so a question is built only
// from mistakes whose idea it needs, and the answer is evidence on that idea (learnBreak in ideaState.ts).
//
// The skills are those made of ideas (IDEA_SKILLS). The working is in maths alone, never in words, so it is the same
// in every language, and a question is rebuilt from its skill, level, seed and variant (which working was shown) on the
// server as in the browser.
import { fill } from "./text";
import { fmtM, fr, fracTex, gcd, plainFrac, polyStr, rngOf, tidy } from "./practiceKit";
import { orderTree, orderValue, type OrderMode, type OrderNode } from "./orderOps";
import { orderStep, orderTex } from "./skills/order";
import { exercise } from "./practice";
import type { Exercise, Level, PracticeWords, Trap } from "./practiceTypes";
import type { MistakeId } from "./mistakes";
import type { IdeaNode } from "../model/conceptGraph";
import { gapIdea, hasIdeas, usesOf, type IdeaSkill } from "../model/ideaState";

/** The slips that need no trap, each with the idea it shows is missing. */
export const SLIPS = {
  // 34 × 7 = 30 × 7 + 4 × 7 = 210 + 21: a fact of the times tables one row off.
  factSlip: "multiplyFacts",
  // 34 × 27 = 34 × 20 + 34 × 7 = 68 + 238: a partial product written without its zero.
  placeSlip: "multiplyLong",
  // 680 + 238 = 908: the partial products added with a carry lost.
  addSlip: "addWhole",
  // the HCF of 12 and 18 taken as 2: a common factor, but not the highest.
  commonNotHighest: "hcf",
  // the HCF of 12 and 18 taken as 36: the lowest common multiple given instead.
  lcmForHcf: "hcf",
  // the LCM of 12 and 18 taken as 216: the two numbers multiplied, their common factor counted twice.
  productForLcm: "lcm",
  // −3 × 4 = 12: unlike signs multiplied to plus.
  signSlip: "signTimes",
  // 4 − 9 = 5: the smaller taken from the larger, past zero.
  pastZero: "negLine",
  // 2⁵ = 10: a power taken for a product.
  powAsTimes: "powValue",
  // 3(x + 1)(x + 2) = 3x² + 3x + 2: only the first term multiplied by the number in front.
  oneTermTimes: "distribute",
} as const satisfies Record<string, IdeaNode>;
export type Slip = keyof typeof SLIPS;

/** The mistakes each skill's worked answers can show, the real one and the others to pick from. */
export const POOLS = {
  times: ["factSlip", "placeSlip", "addSlip"],
  hcf: ["commonNotHighest", "lcmForHcf", "productForLcm"],
  fractions: ["addAcross", "flipFirst", "addedToBoth", "wholeTimesTop"],
  integers: ["subNeg", "signSlip", "pastZero"],
  order: ["leftToRight", "mulBeforePow", "grouped"],
  rounding: ["truncated", "doubleRound", "placeLost", "fullUnit"],
  indices: ["negPower", "powTimes", "powAsTimes"],
  expand: ["noMiddle", "squareTerms", "oneTermTimes"],
} as const satisfies Record<IdeaSkill, readonly (MistakeId | Slip)[]>;
export type BreakId = (typeof POOLS)[IdeaSkill][number];
const isSlip = (id: string): id is Slip => id in SLIPS;

/** The idea a mistake shows is missing. */
export const breakIdea = (id: BreakId): IdeaNode => (isSlip(id) ? SLIPS[id] : gapIdea(id)!);

/** A worked answer: its lines, the answer they come to, and the mistake in them, if any. */
export type Worked = {
  /** The working in LaTeX, a line at a time; the last line comes to the answer. */
  lines: string[];
  /** That answer as a student would type it. */
  plain: string;
  /** The mistake worked into it, or null: the working is right. */
  mistake: BreakId | null;
  /** The line where it goes wrong (null when it is right). */
  wrong: number | null;
  /** The numbers the checker's message about the mistake names (its trap's). */
  vars?: Record<string, string | number>;
};

/** What the student said of a worked answer: right or wrong, and if wrong, the line they tapped and the mistake they picked. */
export type BreakAnswer = { variant: number; said: "right" | "wrong"; step?: number; picked?: string };

/** A question to judge: the question, which working is shown (0: the right one), the working, and the three mistakes offered. */
export type Break = { ex: Exercise; variant: number; worked: Worked; options: BreakId[] };

/** The words of "where it breaks": what is asked, and a short name for each mistake (its message is the checker's, or why). */
export type BreakWords = {
  label: string;
  ask: string;
  right: string;
  wrong: string;
  tapLine: string;
  line: string;
  pick: string;
  wasRight: string;
  wentWrong: string;
  found: string;
  missed: string;
  names: Record<BreakId, string>;
  why: Record<Slip, string>;
};

/** The first line where two workings part (the shorter's length when one runs on from the other). */
const parts = (a: readonly string[], b: readonly string[]) => {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
};

/**
 * A version: the right working, or a mistake worked into it. It goes wrong on the first line where it parts from the
 * right working: everything before is the same, so the line to tap is never a matter of taste.
 */
type Version = { lines: string[]; plain: string; mistake?: BreakId; vars?: Trap["vars"] };

const sign = (c: number) => (c < 0 ? "-" : "+");
/** "+ 3x", "- x", "+ 6": a term after the first, in TeX. */
const term = (c: number, v = "") => `${sign(c)} ${Math.abs(c) === 1 && v ? "" : Math.abs(c)}${v}`;
/** A number inside working: in brackets when negative. */
const par = (v: number) => (v < 0 ? `(${v})` : String(v));
const trapOf = (ex: Exercise, id: MistakeId) => ex.answer.traps?.find((t) => t.id === id);

// ---------- the workings, skill by skill ----------

/** a × b split by place value: the two-digit one into tens and ones, each part multiplied, the parts added. */
function times(ex: Exercise): Version[] {
  const { a, b } = ex.solution?.spec as { a: number; b: number };
  // Only the product itself is worked; a box in a sum of partial products asks for one part.
  if (ex.q !== `${a} \\times ${b}`) return [];
  const splitA = b < 10;
  const [s, o] = splitA ? [a, b] : [b, a];
  const [tens, ones] = [s - (s % 10), s % 10];
  if (!ones || tens < 10) return [];
  const split = splitA ? `= ${tens} \\times ${o} + ${ones} \\times ${o}` : `= ${o} \\times ${tens} + ${o} \\times ${ones}`;
  const work = (p1: number, p2: number, sum = p1 + p2) => ({ lines: [split, `= ${p1} + ${p2}`, `= ${sum}`], plain: String(sum) });
  const [p1, p2] = [o * tens, o * ones];
  const out: Version[] = [work(p1, p2)];
  out.push({ ...work(p1 / 10, p2), mistake: "placeSlip" });
  // The fact in the ones part one row off: 4 × 7 taken as 3 × 7 (when splitting 34), or 34 × 7 with 4 × 7 as 3 × 7.
  const [fact, row] = splitA ? [ones, o] : [o % 10, ones];
  if (fact >= 2) out.push({ ...work(p1, p2 - row), mistake: "factSlip" });
  // A carry lost adding the parts: from the ones, else from the tens.
  const carry = (p1 % 10) + (p2 % 10) >= 10 ? 10 : (p1 % 100) + (p2 % 100) >= 100 ? 100 : 0;
  if (carry) out.push({ ...work(p1, p2, p1 + p2 - carry), mistake: "addSlip" });
  return out;
}

/** The highest common factor taken out of both numbers; the LCM is it times what is left of each. */
function hcf(ex: Exercise): Version[] {
  const spec = ex.solution?.spec as { a: string; b: string };
  const [a, b] = [Number(spec.a), Number(spec.b)];
  const g = gcd(a, b);
  const lcm = ex.answer.k === "num" && ex.answer.v !== g;
  const by = (f: number) => [`${a} = ${f} \\times ${a / f}`, `${b} = ${f} \\times ${b / f}`];
  const so = (v: number | string, value: number) => ({ last: `\\Rightarrow ${v}`, value });
  const work = (f: number, end: { last: string; value: number }) => ({ lines: [...by(f), end.last], plain: String(end.value) });
  const lcmOf = (f: number) => so(`${f} \\times ${a / f} \\times ${b / f} = ${(a * b) / f}`, (a * b) / f);
  // The smallest prime factor of the HCF, when the HCF has another: a common factor that isn't the highest.
  const p = [2, 3, 5, 7, 11, 13].find((q) => g % q === 0 && q < g);
  const out: Version[] = [];
  if (lcm) {
    out.push(work(g, lcmOf(g)));
    out.push({ ...work(g, so(`${a} \\times ${b} = ${a * b}`, a * b)), mistake: "productForLcm" });
    if (p) out.push({ ...work(p, lcmOf(p)), mistake: "commonNotHighest" });
  } else {
    out.push(work(g, so(g, g)));
    out.push({ ...work(g, lcmOf(g)), mistake: "lcmForHcf" });
    if (p) out.push({ ...work(p, so(p, p)), mistake: "commonNotHighest" });
  }
  return out;
}

/** "2 3/4" or "3/4": its whole part, top and bottom. */
const mixed = (s: string) => {
  const [, whole, n, d] = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(s)!;
  return { whole: Number(whole ?? 0), n: Number(n), d: Number(d) };
};
/** A fraction as worked: in lowest terms after it, when it isn't. */
const reduced = (n: number, d: number) => (gcd(n, d) > 1 ? [`= ${fr(n, d).tex()}`] : []);

/** A fractions operation worked as the usual method does it, or a form asking for one idea; with its traps worked in. */
function fractions(ex: Exercise): Version[] {
  const spec = ex.solution?.spec as { type?: string; form?: string; op?: "+" | "-" | "×" | "÷"; a: string; b: string | null };
  if (spec.type === "fracop") {
    const [p, q] = [mixed(spec.a), mixed(spec.b!)];
    const [x, y] = [p, q].map((f) => ({ n: f.whole * f.d + f.n, d: f.d }));
    const improper = p.whole || q.whole ? [`= ${fracTex(x.n, x.d)} ${spec.op === "÷" ? "\\div" : spec.op === "×" ? "\\times" : spec.op} ${fracTex(y.n, y.d)}`] : [];
    const out: Version[] = [];
    if (spec.op === "+" || spec.op === "-") {
      const L = (x.d / gcd(x.d, y.d)) * y.d;
      const [a1, a2] = [(x.n * L) / x.d, (y.n * L) / y.d];
      const top = spec.op === "+" ? a1 + a2 : a1 - a2;
      const common = x.d !== y.d ? [`= ${fracTex(a1, L)} ${spec.op} ${fracTex(a2, L)}`] : [];
      out.push({ lines: [...improper, ...common, `= \\frac{${a1} ${spec.op} ${a2}}{${L}}`, `= ${fracTex(top, L)}`, ...reduced(top, L)], plain: plainFrac(fr(top, L)) });
      const across = trapOf(ex, "addAcross");
      if (across) {
        const [n, d] = [x.n + y.n, x.d + y.d];
        out.push({ lines: [`= \\frac{${x.n} + ${y.n}}{${x.d} + ${y.d}}`, `= ${fracTex(n, d)}`, ...reduced(n, d)], plain: plainFrac(fr(n, d)), mistake: "addAcross", vars: across.vars });
      }
      return out;
    }
    const by = spec.op === "÷" ? { n: y.d, d: y.n } : y;
    const product = (f: { n: number; d: number }, g: { n: number; d: number }) => {
      const [n, d] = [f.n * g.n, f.d * g.d];
      return { lines: [`= ${fracTex(f.n, f.d)} \\times ${fracTex(g.n, g.d)}`, `= ${fracTex(n, d)}`, ...reduced(n, d)], plain: plainFrac(fr(n, d)) };
    };
    const right = product(x, by);
    out.push({ ...right, lines: [...improper, ...right.lines] });
    if (spec.op === "÷" && trapOf(ex, "flipFirst")) {
      const flipped = product({ n: x.d, d: x.n }, y);
      out.push({ ...flipped, lines: [...improper, ...flipped.lines], mistake: "flipFirst" });
    }
    return out;
  }
  if (spec.form === "equivalent") {
    const t = trapOf(ex, "addedToBoth")!;
    const { n, d } = mixed(spec.a), kd = mixed(spec.b!).d, k = kd / d, e = kd - d;
    return [
      { lines: [`\\frac{${n} \\times ${k}}{${d} \\times ${k}} = ${fracTex(n * k, kd)}`, `? = ${n * k}`], plain: String(n * k) },
      { lines: [`\\frac{${n} + ${e}}{${d} + ${e}} = ${fracTex(n + e, kd)}`, `? = ${n + e}`], plain: String(n + e), mistake: "addedToBoth", vars: t.vars },
    ];
  }
  const t = trapOf(ex, "wholeTimesTop");
  if (spec.form === "toImproper" && t) {
    const { whole, n, d } = mixed(spec.a);
    return [
      { lines: [`= \\frac{${whole} \\times ${d} + ${n}}{${d}}`, `= ${fracTex(whole * d + n, d)}`], plain: `${whole * d + n}/${d}` },
      { lines: [`= \\frac{${whole} \\times ${n} + ${d}}{${d}}`, `= ${fracTex(whole * n + d, d)}`], plain: `${whole * n + d}/${d}`, mistake: "wholeTimesTop", vars: t.vars },
    ];
  }
  return [];
}

/** Signed numbers, read from the working's plain text (Exercise.src). */
function integers(ex: Exercise): Version[] {
  const src = ex.src ?? "";
  let m: RegExpExecArray | null;
  const subNeg = trapOf(ex, "subNeg");
  // x − (y), y below zero: taking it away adds.
  if ((m = /^(-?\d+) - \((-\d+)\)$/.exec(src))) {
    const [x, y] = [Number(m[1]), Number(m[2])];
    const out: Version[] = [{ lines: [`= ${x} + ${-y}`, `= ${x - y}`], plain: String(x - y) }];
    if (subNeg) out.push({ lines: [`= ${x} - ${-y}`, `= ${x + y}`], plain: String(x + y), mistake: "subNeg", vars: subNeg.vars });
    return out;
  }
  // x × y − (c): the product first, then taking away c below zero.
  if ((m = /^(-?\d+) \* \(?(-?\d+)\)? - \((-\d+)\)$/.exec(src))) {
    const [x, y, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const work = (P: number, minus: boolean) => ({ lines: [`= ${P} - (${c})`, `= ${P} ${minus ? "-" : "+"} ${-c}`, `= ${minus ? P + c : P - c}`], plain: String(minus ? P + c : P - c) });
    const out: Version[] = [work(x * y, false)];
    if (subNeg) out.push({ ...work(x * y, true), mistake: "subNeg", vars: subNeg.vars });
    if (x < 0 || y < 0) out.push({ ...work(-x * y, false), mistake: "signSlip" });
    return out;
  }
  // x × y or x ÷ y: the size, with the sign the signs give.
  if ((m = /^(-?\d+) ([*/]) \(?(-?\d+)\)?$/.exec(src))) {
    const [x, op, y] = [Number(m[1]), m[2], Number(m[3])];
    const v = op === "*" ? x * y : x / y;
    const size = `${Math.abs(x)} ${op === "*" ? "\\times" : "\\div"} ${Math.abs(y)}`;
    const work = (minus: boolean) => ({ lines: [minus ? `= -(${size})` : `= ${size}`, `= ${minus ? -Math.abs(v) : Math.abs(v)}`], plain: String(minus ? -Math.abs(v) : Math.abs(v)) });
    return [work(v < 0), { ...work(v > 0), mistake: "signSlip" }];
  }
  // x − y past zero.
  if ((m = /^(\d+) - (\d+)$/.exec(src)) && Number(m[2]) > Number(m[1])) {
    const [x, y] = [Number(m[1]), Number(m[2])];
    return [{ lines: [`= -(${y} - ${x})`, `= ${x - y}`], plain: String(x - y) }, { lines: [`= ${y} - ${x}`, `= ${y - x}`], plain: String(y - x), mistake: "pastZero" }];
  }
  return [];
}

/** One operation at a time, as the generator works it; a trap's order of working is the same, done in the wrong order. */
function order(ex: Exercise): Version[] {
  const src = ex.src ?? "";
  const work = (mode: OrderMode) => {
    const nodes: OrderNode[] = [orderTree(src, mode)];
    while ("op" in nodes.at(-1)!) nodes.push(orderStep(nodes.at(-1)!));
    const leaves = (n: OrderNode): number[] => ("v" in n ? [n.v] : [...leaves(n.l), ...leaves(n.r)]);
    // A working that goes through anything but whole numbers is not worth reading.
    if (!nodes.every((n) => leaves(n).every(Number.isInteger))) return null;
    return { lines: nodes.slice(1).map((n) => `= ${orderTex(n)}`), plain: String(orderValue(nodes[0])) };
  };
  const right = work("right");
  if (!right) return [];
  const out: Version[] = [right];
  for (const t of ex.answer.traps ?? []) {
    const w = work(t.id as OrderMode);
    if (w) out.push({ ...w, mistake: t.id as BreakId });
  }
  return out;
}

/** Rounding: where the number is cut, and what it rounds to; a bound half a unit away; an estimate from each number to 1 s.f. */
function rounding(ex: Exercise): Version[] {
  const spec = ex.solution?.spec as Record<string, number | string | boolean>;
  const v = (ex.answer as { v: number }).v;
  // Only the slips the working can show (an estimate's exact answer or a power one out is not worked here).
  const traps = (ex.answer.traps ?? []).filter((t) => (POOLS.rounding as readonly string[]).includes(t.id));
  const trapV = (t: Trap) => (t.a as { v: number }).v;
  // A number rounded to one digit times a power of ten: the working would be in decimals, the answer is not.
  if (ex.plain.includes("*10^")) return [];
  if (spec.pic === "round") {
    const [m, p, k] = [spec.m, spec.p, spec.k] as number[];
    const full = fmtM(m, p), point = full.indexOf(".");
    const cut = k > 0 ? point + k + 1 : (point < 0 ? full.length : point) + k;
    const text = (x: number) => (k > 0 ? x.toFixed(k) : String(Math.round(x)));
    const work = (x: number) => ({ lines: [`${full.slice(0, cut)}\\,|\\,${full.slice(cut)}`, `\\approx ${text(x)}`], plain: text(x) });
    return [{ ...work(v), plain: ex.plain }, ...traps.map((t) => ({ ...work(trapV(t)), mistake: t.id as BreakId, vars: t.vars }))];
  }
  if (spec.pic === "bound") {
    const t = traps[0];
    const [x, unit] = [tidy(spec.x as number), tidy(spec.unit as number)];
    const s = spec.low ? "-" : "+";
    return [
      { lines: [`${x} ${s} \\frac{${unit}}{2}`, `= ${tidy(v)}`], plain: tidy(v) },
      { lines: [`${x} ${s} ${unit}`, `= ${tidy(trapV(t))}`], plain: tidy(trapV(t)), mistake: "fullUnit", vars: t.vars },
    ];
  }
  if (spec.pic === "boundTotal") {
    const t = traps[0];
    const [n, x] = [spec.n, spec.x] as number[];
    const work = (half: number) => [`${x} + ${half} = ${tidy(x + half)}`, `${n} \\times ${tidy(x + half)} = ${tidy(n * (x + half))}`];
    return [{ lines: work(0.5), plain: tidy(v) }, { lines: work(1), plain: tidy(trapV(t)), mistake: "fullUnit", vars: t.vars }];
  }
  if (spec.pic === "estimate" && traps.length) {
    const [x, y, x1, y1] = [spec.x, spec.y, spec.x1, spec.y1] as number[];
    // Each number cut to its first figure instead of rounded: the truncating mistake.
    const cut1 = (z: number) => {
      const e = Math.floor(Math.log10(z));
      return Math.floor(z / 10 ** e) * 10 ** e;
    };
    const work = (a: number, b: number, value: number) => ({ lines: [`\\approx ${tidy(a)} \\times ${tidy(b)}`, `= ${tidy(value)}`], plain: tidy(value) });
    return [work(x1, y1, v), { ...work(cut1(x), cut1(y), trapV(traps[0])), mistake: "truncated" }];
  }
  return [];
}

/** The d-th root of x, when it is a whole number. */
const root = (x: number, d: number) => Math.round(x ** (1 / d));
const rootTex = (x: number, d: number) => (d === 2 ? `\\sqrt{${x}}` : `\\sqrt[${d}]{${x}}`);

/** Powers, read from the working's plain text (the solution's src). */
function indices(ex: Exercise): Version[] {
  const src = (ex.solution?.spec as { src: string }).src;
  const traps = ex.answer.traps ?? [];
  let m: RegExpExecArray | null;
  // a^m × a^n ÷ a^k: the indices added and taken away, then the power worked out.
  if ((m = /^(\d+)\^(\d+) \* \d+\^(\d+) \/ \d+\^(\d+)$/.exec(src))) {
    const [a, i, j, k] = m.slice(1).map(Number);
    const e = i + j - k;
    const lines = (v: number) => [`= ${a}^{${i} + ${j} - ${k}}`, `= ${a}^{${e}}`, `= ${v}`];
    const out: Version[] = [{ lines: lines(a ** e), plain: String(a ** e) }];
    if (e >= 2 && a * e !== a ** e) out.push({ lines: lines(a * e), plain: String(a * e), mistake: "powAsTimes" });
    return out;
  }
  // a^(−n): one over the power.
  if ((m = /^(\d+)\^\(-(\d+)\)$/.exec(src))) {
    const [a, n] = m.slice(1).map(Number);
    const over = (v: number) => ({ lines: [`= \\frac{1}{${a}^{${n}}}`, `= \\frac{1}{${v}}`], plain: `1/${v}` });
    const out: Version[] = [over(a ** n)];
    if (traps.length) out.push({ lines: [`= -${a}^{${n}}`, `= ${-(a ** n)}`], plain: String(-(a ** n)), mistake: "negPower" });
    if (n >= 2 && a * n !== a ** n) out.push({ ...over(a * n), mistake: "powAsTimes" });
    return out;
  }
  // x^(n/d): the d-th root, then the n-th power.
  if ((m = /^(\d+)\^\((\d+)\/(\d+)\)$/.exec(src))) {
    const [x, n, d] = m.slice(1).map(Number);
    const k = root(x, d);
    const power = (v: number) => ({ lines: [`= \\left(${rootTex(x, d)}\\right)^{${n}}`, `= ${k}^{${n}}`, `= ${v}`], plain: String(v) });
    const out: Version[] = [power(k ** n)];
    if (traps.length) out.push({ lines: [`= ${x} \\times \\frac{${n}}{${d}}`, `= ${fr(x * n, d).tex()}`], plain: plainFrac(fr(x * n, d)), mistake: "powTimes" });
    if (n >= 2 && k * n !== k ** n) out.push({ ...power(k * n), mistake: "powAsTimes" });
    return out;
  }
  // (P/Q)^(−n/d): turned over for the minus, then the root and the power.
  if ((m = /^\((\d+)\/(\d+)\)\^\(-(\d+)\/(\d+)\)$/.exec(src))) {
    const [P, Q, n, d] = m.slice(1).map(Number);
    const [p, q] = [root(P, d), root(Q, d)];
    const work = (top: number, bottom: number, T: number, B: number, minus = "") => {
      const v = fr(minus ? -(top ** n) : top ** n, bottom ** n);
      return { lines: [`= ${minus}\\left(${fracTex(T, B)}\\right)^{\\frac{${n}}{${d}}}`, `= ${minus}\\left(${fracTex(top, bottom)}\\right)^{${n}}`, `= ${v.tex()}`], plain: plainFrac(v) };
    };
    return [work(q, p, Q, P), { ...work(p, q, P, Q), mistake: "negPower" }, { ...work(q, p, Q, P, "-"), mistake: "negPower" }];
  }
  return [];
}

/** Brackets multiplied out, read from the question's equation (the solution's eq). */
function expand(ex: Exercise): Version[] {
  const eq = (ex.solution?.spec as { eq: string }).eq;
  const signed = (s: string, n: string) => (s === "-" ? -Number(n) : Number(n));
  let m: RegExpExecArray | null;
  // (x + a)(x + b): each term by each, then the x terms collected.
  if ((m = /^\(x ([+-]) (\d+)\)\(x ([+-]) (\d+)\)$/.exec(eq))) {
    const [a, b] = [signed(m[1], m[2]), signed(m[3], m[4])];
    const out: Version[] = [{ lines: [`= x^2 ${term(b, "x")} ${term(a, "x")} ${term(a * b)}`, `= ${polyStr([a * b, a + b, 1])}`], plain: polyStr([a * b, a + b, 1]) }];
    const t = trapOf(ex, "noMiddle");
    if (t) out.push({ lines: [`= x^2 ${term(a * b)}`], plain: polyStr([a * b, 0, 1]), mistake: "noMiddle", vars: t.vars });
    return out;
  }
  // (ax + b)²: the bracket times itself.
  if ((m = /^\((\d*)x ([+-]) (\d+)\)\^2$/.exec(eq))) {
    const [a, b] = [Number(m[1] || 1), signed(m[2], m[3])];
    const inner = polyStr([b, a]);
    const t = trapOf(ex, "squareTerms");
    const out: Version[] = [{
      lines: [`= (${inner})(${inner})`, `= ${a * a}x^2 ${term(a * b, "x")} ${term(a * b, "x")} ${term(b * b)}`, `= ${polyStr([b * b, 2 * a * b, a * a])}`],
      plain: polyStr([b * b, 2 * a * b, a * a]),
    }];
    if (t) out.push({ lines: [`= (${a}x)^2 + ${par(b)}^2`, `= ${polyStr([b * b, 0, a * a])}`], plain: polyStr([b * b, 0, a * a]), mistake: "squareTerms", vars: t.vars });
    return out;
  }
  // k(x + a)(x + b): the brackets, then every term times k.
  if ((m = /^(-?\d+)\(x ([+-]) (\d+)\)\(x ([+-]) (\d+)\)$/.exec(eq))) {
    const [k, a, b] = [Number(m[1]), signed(m[2], m[3]), signed(m[4], m[5])];
    const first = `= ${k}(${polyStr([a * b, a + b, 1])})`;
    return [
      { lines: [first, `= ${polyStr([k * a * b, k * (a + b), k])}`], plain: polyStr([k * a * b, k * (a + b), k]) },
      { lines: [first, `= ${polyStr([a * b, a + b, k])}`], plain: polyStr([a * b, a + b, k]), mistake: "oneTermTimes" },
    ];
  }
  return [];
}

const WRITERS: Record<IdeaSkill, (ex: Exercise) => Version[]> = { times, hcf, fractions, integers, order, rounding, indices, expand };

/**
 * The workings a question can be shown with: the right one first, then each with a mistake whose idea the question
 * needs and which comes to another answer. Empty when the question can't be shown wrong.
 */
export function workingsOf(ex: Exercise): Worked[] {
  if (!hasIdeas(ex.skill)) return [];
  const [right, ...rest] = WRITERS[ex.skill as IdeaSkill](ex);
  if (!right) return [];
  const ideas: readonly string[] = usesOf(ex);
  const wrong = rest.filter((v) => v.mistake && ideas.includes(breakIdea(v.mistake)) && v.plain !== right.plain && parts(right.lines, v.lines) < v.lines.length);
  if (!wrong.length) return [];
  return [
    { lines: right.lines, plain: right.plain, mistake: null, wrong: null },
    ...wrong.map((v) => ({ lines: v.lines, plain: v.plain, mistake: v.mistake!, wrong: parts(right.lines, v.lines), ...(v.vars ? { vars: v.vars } : {}) })),
  ];
}

/**
 * The three mistakes offered: the real one (when there is one) and others of the skill's, in an order that follows
 * from the question, so it is the same however often it is rebuilt.
 */
export function optionsOf(ex: Exercise, variant: number, worked: Worked): BreakId[] {
  const pool = POOLS[ex.skill as IdeaSkill] as readonly BreakId[];
  const r = rngOf(ex.seed + 7919 * (variant + 1));
  const others = pool.filter((id) => id !== worked.mistake);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const three = worked.mistake ? [worked.mistake, ...others.slice(0, 2)] : others.slice(0, 3);
  for (let i = three.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [three[i], three[j]] = [three[j], three[i]];
  }
  return three;
}

/** The question to judge, rebuilt from its question and variant; null when there is no such working. */
export function breakOf(ex: Exercise, variant: number): Break | null {
  const worked = workingsOf(ex)[variant];
  return worked ? { ex, variant, worked, options: optionsOf(ex, variant, worked) } : null;
}

/** The share of the questions shown worked rightly, so that "it's right" is an answer worth weighing. */
export const RIGHT_SHARE = 0.25;
/** Fresh questions tried at each level before the next. */
const TRIES = 60;

/**
 * A question to judge on the skill: a fresh question at the level asked for, or failing that another, that can be
 * worked wrong; then the right working a quarter of the time, else one of its mistakes.
 */
export function whereItBreaks(skill: IdeaSkill, level: Level, w: PracticeWords, random: () => number = Math.random): Break {
  for (const L of [level, ...([1, 2, 3] as const).filter((x) => x !== level)])
    for (let i = 0; i < TRIES; i++) {
      const ex = exercise(skill, L, Math.floor(random() * 2 ** 31), w);
      const all = workingsOf(ex);
      if (!all.length) continue;
      const variant = random() < RIGHT_SHARE ? 0 : 1 + Math.floor(random() * (all.length - 1));
      return breakOf(ex, variant)!;
    }
  throw new Error(`no worked answer to judge on ${skill}`);
}

/** Whether the student named the mistake: said wrong and picked it (the line tapped aside). Null: the working was right. */
export const namedIt = (b: Break, a: BreakAnswer): boolean | null => (b.worked.mistake === null ? null : a.said === "wrong" && a.picked === b.worked.mistake);

/** Whether the student judged the working rightly: "right" of a right one; of one with a mistake, its line and its name. */
export const judgedRight = (b: Break, a: BreakAnswer): boolean =>
  b.worked.mistake === null ? a.said === "right" : a.said === "wrong" && a.step === b.worked.wrong && a.picked === b.worked.mistake;

/** What the checker would say of the mistake (its own message, with the question's numbers), or why the slip is wrong. */
export const breakWhy = (b: Break, w: PracticeWords): string | null => {
  const id = b.worked.mistake;
  if (!id) return null;
  return isSlip(id) ? w.breaks.why[id] : fill(w.mistakes[id], b.worked.vars ?? {});
};
