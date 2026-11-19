// Practice: questions made from a seed for each skill and level, answers checked (numbers, fractions, surds, sets of
// roots, points, expressions up to equivalence — in the form the question asks for), and a worked solution from the
// tool that covers the topic. A worksheet is a numbered set of questions with an optional answer key.
import { GENS } from "./skills/index";
import { splitRel } from "./algebra";
import { judgeNear } from "./benchmark";
import { C, esc, fill, FONT, r2, W, wrap } from "./chart";
import { judgeDivisors } from "./divisible";
import { encodePin, judgePin } from "./estimate";
import { type E, evalE, exprMessages, parseE, pdeg, pow, sqrtSplit, tex, toPoly } from "./expr";
import { judgePick } from "./exprMatch";
import { judgeOrder } from "./fracOrder";
import { Frac } from "./fraction";
import { judgePoly } from "./geoPlay";
import { latexToSvg, type RenderedSvg } from "./latex";
import { env } from "./matrix";
import { readMeasure, unitWords } from "./measurePics";
import type { MistakeId } from "./mistakes";
import { type Area, AREAS, type SkillId, SKILLS } from "./practiceSkills";
import { encodeShade, judgeShade } from "./shadeFrac";
import { judgeTarget, parseSum, qText, valueOf } from "./target";
import { clock12, clock24, DAY, HALF_DAY, readClock, readDuration } from "./timePics";
import { LEVELS, type Answer, type Bound, type Exercise, type Level, type PracticeWords, type StepForm, type Trap } from "./practiceTypes";
import { FLIP, fracBars, fracTex, gcd, ineqPlain, ineqTex, mixedTex, num, OP_SIGN, plainE, plainFrac, readSign, rngOf, sumTex, toFrac } from "./practiceKit";

export { LEVELS, type Bound, type DayPart, type Exercise, type Format, type FractionForm, type Level, type MeasurePair, type MeasureUnit, type Part, type Play, type PracticeWords, type SolutionKind, type StepForm } from "./practiceTypes";
export { ineqPlain, ineqTex, plainE, readSign, rngOf } from "./practiceKit";
export { ALL_SKILLS, AREAS, SKILLS, areaOf, type Area, type SkillId } from "./practiceSkills";

// ---------- a question and its steps (the generators are in src/math/skills/) ----------

/**
 * A question worked in steps, each a question of its own. A calculus question's steps are the parts it was built with
 * (`worked`, from calcSteps.ts) and then the question itself. A fractions operation is worked as the usual method does
 * it (src/math/fracop.ts): each mixed number as an improper fraction; for + and −, the lowest common denominator, each
 * fraction over it, then the tops added or taken away; for ÷, the reciprocal; for × and ÷, tops times tops over
 * bottoms times bottoms; then the result in lowest terms when it isn't. Each fractions step is read for its ideas as a
 * form is (src/model/conceptGraph.ts), so a wrong step says which idea went wrong. After a wrong answer the practice
 * works a fractions operation in steps (STEPS_AFTER_MISS); every skill with steps fades its worked examples
 * (src/model/fading.ts). Any other question has none.
 */
export function stepsOf(ex: Exercise, w: PracticeWords): Exercise[] {
  if (ex.worked?.length) {
    const { worked, ...whole } = ex;
    return [...worked.map((p) => ({ skill: ex.skill, level: ex.level, seed: ex.seed, ...p })), whole];
  }
  const spec = ex.solution?.spec as { type?: string; op: "+" | "-" | "×" | "÷"; a: string; b: string } | undefined;
  if (ex.skill !== "fractions" || spec?.type !== "fracop") return [];
  const steps: Exercise[] = [];
  const fraction = (n: number, d: number) => ({ show: d === 1 ? String(n) : fracTex(n, d), plain: d === 1 ? String(n) : `${n}/${d}`, format: "fraction" as const });
  const count = (v: number) => ({ show: String(v), plain: String(v), format: "number" as const });
  const add = (form: StepForm, prompt: string, q: string, answer: Answer, given: ReturnType<typeof count | typeof fraction>, a: string, b: string | null = null) =>
    steps.push({ skill: ex.skill, level: ex.level, seed: ex.seed, prompt, q, answer, ...given, solution: fracBars(form, a, b, []) });
  // A mixed number's whole times the top is the mistake to name, as in the form asking for it alone.
  const [x, y] = [spec.a, spec.b].map((s) => {
    const [, whole, n, d] = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(s)!.map(Number);
    if (!whole) return { n, d };
    const top = whole * d + n;
    const traps: Trap[] = whole > 1 ? [{ id: "wholeTimesTop", a: num((whole * n + d) / d), vars: { w: whole, n, d, wd: whole * d, top } }] : [];
    add("toImproper", w.prompts.fracImproper, mixedTex(whole, n, d), { ...num(top / d, 1e-9, { form: "improper" }), traps }, fraction(top, d), s);
    return { n: top, d };
  });
  let raw: [number, number];
  if (spec.op === "+" || spec.op === "-") {
    const L = (x.d / gcd(x.d, y.d)) * y.d;
    if (x.d !== y.d) {
      add("lcd", w.prompts.fracLcd, `${fracTex(x.n, x.d)},\\ ${fracTex(y.n, y.d)}`, num(L), count(L), `${x.n}/${x.d}`, `${y.n}/${y.d}`);
      for (const p of [x, y]) {
        if (p.d === L) continue;
        const k = L / p.d;
        const traps: Trap[] = [{ id: "addedToBoth", a: num(p.n + L - p.d), vars: { n: p.n, d: p.d, k, kd: L } }];
        add("equivalent", w.prompts.fracEquivalent, `${fracTex(p.n, p.d)} = \\frac{?}{${L}}`, { ...num(p.n * k), traps }, count(p.n * k), `${p.n}/${p.d}`, `${p.n * k}/${L}`);
      }
    }
    const [a1, a2] = [(x.n * L) / x.d, (y.n * L) / y.d];
    raw = [spec.op === "+" ? a1 + a2 : a1 - a2, L];
    add("addTops", w.prompts.stepTops, `${fracTex(a1, L)} ${spec.op} ${fracTex(a2, L)}`, num(raw[0] / L), fraction(...raw), `${a1}/${L}`, `${a2}/${L}`);
  } else {
    const divide = spec.op === "÷";
    const by = divide ? { n: y.d, d: y.n } : y;
    if (divide) add("reciprocal", w.prompts.fracReciprocal, fracTex(y.n, y.d), num(by.n / by.d), fraction(by.n, by.d), `${y.n}/${y.d}`);
    raw = [x.n * by.n, x.d * by.d];
    const times = `${fracTex(x.n, x.d)} \\times ${fracTex(by.n, by.d)}`;
    add(divide ? "divideTops" : "timesTops", divide ? w.prompts.stepDivide : w.prompts.stepTimes, divide ? `${fracTex(x.n, x.d)} \\div ${fracTex(y.n, y.d)} = ${times}` : times,
      num(raw[0] / raw[1]), fraction(...raw), `${x.n}/${x.d}`, `${by.n}/${by.d}`);
  }
  const g = gcd(...raw);
  if (raw[0] !== 0 && g > 1) add("lowest", w.prompts.fracLowest, fracTex(...raw), num(raw[0] / raw[1], 1e-9, { lowest: true }), fraction(raw[0] / g, raw[1] / g), `${raw[0]}/${raw[1]}`);
  return steps;
}

/**
 * A worked example for a question: another of the same skill and level, with other numbers and at least two steps
 * (the seeds tried follow from the question's, so it is the same everywhere); null when none turns up.
 */
export function exampleLike(ex: Exercise, w: PracticeWords): Exercise | null {
  for (let i = 1; i <= 40; i++) {
    const seed = (ex.seed + i * 7919) % 2 ** 31;
    const other = exercise(ex.skill, ex.level, seed, w);
    if (stepsOf(other, w).length >= 2 && other.plain !== ex.plain) return other;
  }
  return null;
}

/** The skills whose question is worked in steps right after a wrong answer (the arms' "steps" feature). */
export const STEPS_AFTER_MISS: readonly SkillId[] = ["fractions"];

/** The exercise for a skill, level and seed: always the same one. */
export function exercise(skill: SkillId, level: Level, seed: number, w: PracticeWords): Exercise {
  exprMessages(w);
  const r = rngOf(seed);
  return { skill, level, seed, ...GENS[skill](r, level, w) };
}

// ---------- checking an answer ----------

/**
 * ok; or not, with why when the answer is sent back without counting (its form, unreadable), close when it is nearly
 * right, and mistake + hint when it is the answer a known mistake gives (still wrong: it counts as a miss).
 */
export type Verdict = { ok: boolean; why?: string; close?: boolean; mistake?: MistakeId; hint?: string };

const SAMPLES = [-2.71, -1.33, -0.62, 0.37, 0.91, 1.73, 2.29, 3.11, 0.17, 1.19, 2.63, -0.23, 4.37, 5.71, 7.13, -4.61];
/** Positive values for a formula's letters (lengths, masses, times): each letter gets a different one at each sample. */
const POSITIVE = [1.37, 2.91, 0.73, 4.19, 1.83, 3.47, 0.59, 2.23, 5.11, 1.09, 3.89, 2.57, 0.97, 4.73, 1.61, 3.17];

/** An expression's values at the samples: x alone takes SAMPLES; with other letters, all of them take POSITIVE. */
function valuesOf(e: E, vars?: readonly string[]): number[] {
  if (!vars?.length) return SAMPLES.map((x) => evalE(e, x));
  return POSITIVE.map((_, i) => {
    const at = (j: number) => POSITIVE[(i + 5 * j + j * j) % POSITIVE.length];
    const env = Object.fromEntries(vars.map((v, j) => [v, at(j)]));
    return evalE(e, env.x ?? at(vars.length), env);
  });
}

/** A factor that is a bottom: something to a negative power. */
const isDen = (f: E): f is Extract<E, { k: "pow" }> => f.k === "pow" && f.e.k === "num" && f.e.v.isNeg();
const hasDen = (e: E): boolean => (e.k === "add" ? e.ts.some(hasDen) : e.k === "mul" ? e.fs.some(hasDen) : e.k === "pow" ? (e.e.k === "num" && e.e.v.isNeg()) || hasDen(e.b) : false);
/** The top and the bottom of a fraction, as lists of factors. */
function topBottom(e: E): { top: E[]; bottom: E[] } {
  const fs = factorsOf(e);
  return {
    top: fs.filter((f) => !isDen(f)),
    bottom: fs.filter(isDen).map((f) => (f.e.k === "num" && f.e.v.n === -1 && f.e.v.d === 1 ? f.b : pow(f.b, f.e.k === "num" ? { k: "num", v: f.e.v.neg() } : f.e))),
  };
}
/** One fraction: no fraction inside its top or its bottom (a/(x + 1) + b/(x + 2) is two). */
function oneFraction(e: E): boolean {
  const { top, bottom } = topBottom(e);
  return ![...top, ...bottom].some(hasDen);
}
/** The remainder of a ÷ b, for polynomials with exact coefficients (lowest power first). */
function polyMod(a: Frac[], b: Frac[]): Frac[] {
  const db = pdeg(b);
  let r = a.slice(0, pdeg(a) + 1);
  while (r.length > db && !(r.length === 1 && r[0].isZero())) {
    const dr = r.length - 1;
    const k = r[dr].div(b[db]);
    for (let i = 0; i <= db; i++) r[dr - db + i] = r[dr - db + i].sub(k.mul(b[i]));
    r = r.slice(0, dr);
    while (r.length > 1 && r[r.length - 1].isZero()) r.pop();
    if (!r.length) r = [new Frac(0)];
  }
  return r;
}
/** Cut down: the top and the bottom share no factor, neither an (x + a) nor a whole number. */
function lowestTerms(e: E): boolean {
  const { top, bottom } = topBottom(e);
  const P = toPoly(top.length ? { k: "mul", fs: top } : { k: "num", v: new Frac(1) });
  const Q = toPoly(bottom.length ? { k: "mul", fs: bottom } : { k: "num", v: new Frac(1) });
  if (!P || !Q) return true;
  let [p, q] = [P, Q];
  while (!(pdeg(q) === 0 && q[0].isZero())) [p, q] = [q, polyMod(p, q)];
  if (pdeg(p) > 0) return false;
  const whole = [...P, ...Q].every((c) => c.isInt());
  const content = (cs: Frac[]) => cs.reduce((g, c) => gcd(g, c.n), 0);
  return !whole || gcd(content(P), content(Q)) <= 1;
}

/** "x = 2", "θ = 35°", "25%", "$4.05" → the bare value. */
const bare = (s: string) => s.trim().replace(/^[a-zA-Zθ]\w*\s*=\s*/, "").replace(/[%°$₾₽]/g, "").trim();

function value(s: string): number {
  const t = bare(s);
  const mixed = t.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return (mixed[1] ? -1 : 1) * (Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]));
  const e = parseE(t);
  return evalE(e, NaN);
}
/**
 * Without the brackets around a whole list: "(2; 3)", "[76.2, 82.2)". Only a pair that encloses everything goes, so
 * the bracket closing sqrt(3) in "-4 + 2sqrt(3)" stays.
 */
function unwrap(s: string): string {
  let t = s.trim();
  while (/^[([{]/.test(t) && /[)\]}]$/.test(t)) {
    let depth = 0;
    let closesAt = -1;
    for (let i = 0; i < t.length && closesAt < 0; i++) {
      if ("([{".includes(t[i])) depth++;
      else if (")]}".includes(t[i]) && --depth === 0) closesAt = i;
    }
    if (closesAt !== t.length - 1) break;
    t = t.slice(1, -1).trim();
  }
  return t;
}
/** Split a list of values: on ";", or on ", " / "," / "and" / "or" between values when there is no decimal comma ambiguity. */
function parts(s: string): string[] {
  const t = unwrap(s);
  const ps = t.includes(";") ? t.split(";") : t.split(/,\s+|\s+(?:and|or)\s+|\s+(?:и|или)\s+|\s+(?:და|ან)\s+/);
  // "-4 ± 2sqrt(3)" is two values.
  return ps.map((p) => p.trim()).filter(Boolean).flatMap((p) => {
    const [a, b, ...rest] = p.split(/±|\+-|\+\/-/);
    return b === undefined || rest.length ? [p] : [`${a.trim()} - (${b.trim()})`, `${a.trim()} + (${b.trim()})`];
  });
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9 * Math.max(1, Math.abs(b));
/**
 * A matrix typed row by row: "1, 2; 3, 4" (rows split by ; or |, numbers by commas or spaces), or "[[1, 2], [3, 4]]".
 * Null when the rows can't be told apart.
 */
function matrixCells(s: string): string[][] | null {
  const t = unwrap(s);
  const rows = /^[[(]/.test(t) ? t.split(/[\])]\s*[,;]?\s*[[(]/).map((r) => r.replace(/^[[(]|[\])]$/g, "")) : t.split(/[;|\n]/);
  const cells = rows.map((r) => r.trim().split(/\s*,\s*|\s+/).filter(Boolean));
  return cells.length && cells.every((r) => r.length) ? cells : null;
}
function readMatrix(s: string): number[][] | null {
  const cells = matrixCells(s);
  const m = cells?.map((r) => r.map(value));
  return m && m.every((r) => r.every(Number.isFinite)) ? m : null;
}

/** The factors of a product, with nested products opened: 2·(3·5) → 2, 3, 5. */
const factorsOf = (e: E): E[] => (e.k === "mul" ? e.fs.flatMap(factorsOf) : [e]);

/** Every √n in the expression has n square-free, and no root is left in a denominator. */
function simplifiedSurd(e: E, inDen = false): boolean {
  switch (e.k) {
    case "pow": {
      const half = e.e.k === "num" && e.e.v.d === 2;
      if (half) {
        if (inDen) return false;
        if (e.b.k !== "num" || !e.b.v.isInt() || sqrtSplit(e.b.v).out.n !== 1) return false;
      }
      const negative = e.e.k === "num" && e.e.v.isNeg();
      return simplifiedSurd(e.b, inDen || negative);
    }
    case "add":
      return e.ts.every((t) => simplifiedSurd(t, inDen));
    case "mul":
      return factorsOf(e).every((f) => simplifiedSurd(f, inDen));
    default:
      return true;
  }
}
/** A product of linear factors with whole, coprime coefficients (and a number in front). */
function factored(e: E): boolean {
  const fs = factorsOf(e);
  if (fs.filter((f) => f.k !== "num").length < 2 && !(fs.length === 1 && e.k === "pow")) {
    // a single bracket only counts with a number or power in front: 3(x + 2), (x + 1)^2
    if (!(e.k === "mul" && fs.some((f) => f.k === "num"))) return false;
  }
  return fs.every((f) => {
    if (f.k === "num") return true;
    const base = f.k === "pow" && f.e.k === "num" && f.e.v.isInt() && f.e.v.n > 0 ? f.b : f;
    const p = toPoly(base);
    if (!p || p.length > 2 || p.every((c) => c.isZero())) return false;
    if (!p.every((c) => c.isInt())) return false;
    return p.reduce((g, c) => gcd(g, c.n), 0) === 1;
  });
}
/** No brackets left around a sum. */
function expanded(e: E): boolean {
  const sumInside = (x: E): boolean => x.k === "add" || (x.k === "mul" && x.fs.some(sumInside)) || (x.k === "pow" && sumInside(x.b));
  const terms = e.k === "add" ? e.ts : [e];
  return terms.every((t) => !(t.k === "mul" && t.fs.some(sumInside)) && !(t.k === "pow" && sumInside(t.b)));
}

/** "6.3e-4" and "6.3x10^4" as 6.3*10^(-4) and 6.3*10^4: read so only where standard form is asked for (e is Euler's number elsewhere). */
const stdText = (s: string) => s.replace(/(\d)\s*[eE]\s*([+-]?\d+)/g, "$1*10^($2)").replace(/(\d)\s*[xX×·]\s*10/g, "$1*10");
/** a × 10ⁿ with 1 ≤ |a| < 10. */
const isStandard = (s: string) => /^-?[1-9](\.\d+)?\*10\^\(?[+-]?\d+\)?$/.test(s.replace(/\s+/g, "").replace(/[−–]/g, "-"));
/** An answer that reads as an expression in a letter, where a number was asked for. */
function hasLetter(s: string): boolean {
  try {
    return Number.isFinite(evalE(parseE(bare(s)), 1.37));
  } catch {
    return false;
  }
}

const INF = /^\+?\s*(∞|inf(inity)?)$/i;
const NEG_INF = /^[-−]\s*(∞|inf(inity)?)$/i;
/** "x >= 4", "4 ≤ x", "-1 < x <= 3", "[4, ∞)", "(-2; 3]" as the ends of the set; null if it isn't an inequality. */
export function readIneq(src: string): { lo: Bound | null; hi: Bound | null } | null {
  try {
    return ineqEnds(src.trim());
  } catch {
    return null;
  }
}
function ineqEnds(t: string): { lo: Bound | null; hi: Bound | null } | null {
  if (/^[[(].*[\])]$/.test(t) && !/[<>=≤≥]/.test(t)) {
    const inner = t.slice(1, -1);
    const ends = inner.split(inner.includes(";") ? ";" : ",").map((x) => x.trim());
    if (ends.length !== 2) return null;
    const lo = NEG_INF.test(ends[0]) ? null : { v: value(ends[0]), closed: t[0] === "[" };
    const hi = INF.test(ends[1]) ? null : { v: value(ends[1]), closed: t.at(-1) === "]" };
    if ((!lo && !hi) || [lo, hi].some((b) => b && !Number.isFinite(b.v))) return null;
    return { lo, hi };
  }
  const { parts, rels } = splitRel(t);
  const isVar = (p: string) => /^[a-z]$/i.test(p.trim());
  if (rels.includes("=")) return null;
  if (rels.length === 1) {
    const [l, r] = parts;
    const [side, rel] = isVar(l) ? [r, rels[0]] : isVar(r) ? [l, FLIP[rels[0]]] : [null, rels[0]];
    const v = side === null ? NaN : value(side);
    if (!Number.isFinite(v)) return null;
    return rel[0] === ">" ? { lo: { v, closed: rel === ">=" }, hi: null } : { lo: null, hi: { v, closed: rel === "<=" } };
  }
  if (rels.length !== 2 || !isVar(parts[1])) return null;
  const [a, b] = [value(parts[0]), value(parts[2])];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (rels.every((r) => r[0] === "<")) return { lo: { v: a, closed: rels[0] === "<=" }, hi: { v: b, closed: rels[1] === "<=" } };
  if (rels.every((r) => r[0] === ">")) return { lo: { v: b, closed: rels[1] === ">=" }, hi: { v: a, closed: rels[0] === ">=" } };
  return null;
}

/** Negating an expression, for the sign trap. */
const negE = (e: E, vars: readonly string[] = []): E => parseE(`-(${plainE(e)})`, vars);
/** The question's traps, then "right size, wrong sign" unless the answer is 0 or one of them is already that. */
function trapsOf(a: Answer): Trap[] {
  const own = a.traps ?? [];
  const sign = ((): Answer | null => {
    if (a.k === "num") return a.v === 0 || own.some((t) => t.a.k === "num" && near(t.a.v, -a.v, a.tol)) ? null : { k: "num", v: -a.v, tol: a.tol, std: a.std };
    if (a.k === "set") {
      const neg = a.vs.map((v) => -v).sort((x, y) => x - y);
      const same = [...a.vs].sort((x, y) => x - y).every((v, i) => near(v, neg[i], a.tol));
      return same ? null : { k: "set", vs: neg, tol: a.tol };
    }
    if (a.k === "expr") {
      if (valuesOf(a.e, a.vars).every((v) => Math.abs(v) < 1e-9 || !Number.isFinite(v))) return null;
      return { k: "expr", e: negE(a.e, a.vars), mode: a.mode === "plusC" ? "plusC" : undefined, vars: a.vars };
    }
    return null;
  })();
  return sign ? [...own, { id: "sign", a: sign }] : own;
}

/** What a student would type to give each of a question's own traps (for the tests and the dry run). */
export function trapInputs(ex: Exercise): { id: MistakeId; input: string }[] {
  return (ex.answer.traps ?? []).flatMap(({ id, a }) => {
    // A fraction as a student would write it (9/17, not 0.5294…).
    const f = a.k === "num" ? toFrac(a.v) : null;
    const input = a.k === "num" ? (f && f.d <= 1000 && Math.abs(f.toNumber() - a.v) < 1e-12 ? plainFrac(f) : String(a.v)) : a.k === "set" ? a.vs.join("; ") : a.k === "tuple" ? `(${a.vs.join(", ")})` : a.k === "expr" ? plainE(a.e) : a.k === "ineq" ? ineqPlain(a.lo, a.hi) : a.k === "sign" ? a.v : a.k === "poly" ? a.sample : a.k === "pin" ? encodePin(a.play, a.v) : a.k === "target" ? a.sample : a.k === "near" ? a.options[a.right].plain : a.k === "order" ? a.seq.map((i) => a.items[i].text).join(", ") : a.k === "shade" ? encodeShade(Array.from({ length: a.count }, (_, i) => i)) : a.k === "pick" ? a.options[a.right].plain : a.k === "divisors" ? a.right.join(", ") : a.k === "ratio" ? a.vs.join(" : ") : a.k === "clock" ? (a.typed ?? (a.h24 ? clock24(a.t) : clock12(a.t))) : a.k === "dur" ? (a.typed ?? String(a.m)) : a.k === "meas" ? (a.typed ?? String(a.v)) : null;
    return input === null ? [] : [{ id, input }];
  });
}

export function check(ex: Exercise, input: string, w: PracticeWords): Verdict {
  exprMessages(w);
  const src = withoutUnit(ex.answer, input.trim());
  if (!src) return { ok: false, why: w.reasons.empty };
  const v = judge(ex.answer, src, w);
  // A form message or a near miss says more than naming a mistake would.
  if (v.ok || v.why || v.close) return v;
  for (const t of trapsOf(ex.answer)) if (judge(t.a, src, w).ok) return { ok: false, mistake: t.id, hint: fill(w.mistakes[t.id], t.vars ?? {}) };
  return v;
}

/** "5.64 m" → "5.64" when the answer may carry a unit; only a unit straight after a number is taken off. */
function withoutUnit(a: Answer, s: string): string {
  if (a.k !== "num" || !a.units) return s;
  for (const u of a.units) if (s.endsWith(u) && /\d\s*$/.test(s.slice(0, -u.length))) return s.slice(0, -u.length).trim();
  return s;
}

/** 60 or more minutes after the hours (2:75, 1 h 65 min): the hour counted as 100 minutes. */
const minutesOver = (m: number, w: PracticeWords): Verdict => ({ ok: false, mistake: "minutes100", hint: fill(w.mistakes.minutes100, { m, h: Math.floor(m / 60), r: m % 60 }) });

/** The answer against one expected answer: no traps. */
function judge(a: Answer, input: string, w: PracticeWords): Verdict {
  const src = a.k === "num" && a.std ? stdText(input) : input;
  try {
    switch (a.k) {
      case "num": {
        const v = value(src);
        if (!Number.isFinite(v)) return { ok: false, why: fill(hasLetter(src) ? w.reasons.notNumber : w.reasons.unreadable, { s: input }) };
        // Standard form spans powers of ten, so it is compared relatively: 9 × 10⁻¹⁰ isn't 7.31 × 10⁻¹².
        if (a.std ? Math.abs(v - a.v) > 1e-9 * Math.abs(a.v) : !near(v, a.v, a.tol))
          return a.tol >= 0.0005 && near(v, a.v, a.tol * 20) ? { ok: false, close: true, why: w.reasons.rounding } : { ok: false };
        const t = bare(src);
        if (a.std && !isStandard(t)) return { ok: false, close: true, why: w.reasons.notStandard };
        if (a.lowest) {
          const m = t.match(/(\d+)\s*\/\s*(\d+)\s*$/);
          if (m && gcd(Number(m[1]), Number(m[2])) !== 1) return { ok: false, close: true, why: w.reasons.notLowest };
        }
        // The right value in the wrong shape: a mixed number asked for as an improper fraction, or the other way.
        if (a.form === "improper" && !/^\d+\s*\/\s*\d+$/.test(src)) return { ok: false, close: true, why: w.reasons.notImproper };
        if (a.form === "mixed" && !/^\d+\s+\d+\s*\/\s*\d+$/.test(src)) return { ok: false, close: true, why: w.reasons.notMixed };
        if (a.surd && a.tol < 1e-6 && !simplifiedSurd(parseE(t))) return { ok: false, close: true, why: w.reasons.notSimplified };
        return { ok: true };
      }
      case "set":
      case "tuple": {
        let ps = parts(src);
        if (a.k === "tuple") {
          // "y = 3; x = 2" in any order.
          const names = a.names ?? ["x", "y", "z"].slice(0, a.vs.length);
          const named: (string | undefined)[] = ps.map((p) => p.match(/^\s*([a-z])\s*=/i)?.[1].toLowerCase());
          if (named.every((n) => n !== undefined && names.includes(n)) && new Set(named).size === ps.length) ps = names.map((n) => ps[named.indexOf(n)] ?? "");
        }
        const vs = ps.map(value);
        if (vs.some((v) => !Number.isFinite(v))) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
        if (vs.length !== a.vs.length) return { ok: false, why: fill(w.reasons.count, { n: a.vs.length }) };
        if (a.k === "tuple") {
          if (vs.every((v, i) => near(v, a.vs[i], a.tol))) return { ok: true };
          return a.tol >= 0.0005 && vs.every((v, i) => near(v, a.vs[i], a.tol * 20)) ? { ok: false, close: true, why: w.reasons.rounding } : { ok: false };
        }
        const left = [...a.vs];
        for (const v of vs) {
          const i = left.findIndex((x) => near(v, x, a.tol));
          if (i < 0) return { ok: false };
          left.splice(i, 1);
        }
        return { ok: true };
      }
      case "expr": {
        let t = src.replace(/[′']/g, "");
        if (t.includes("=")) t = t.slice(t.lastIndexOf("=") + 1);
        if (a.mode === "plusC") t = t.replace(/\+\s*[cC]\s*$/, "").replace(/^\s*[cC]\s*\+/, "");
        const e = parseE(t, a.vars ?? []);
        let diff0: number | null = null;
        let compared = 0;
        const [us, vs] = [valuesOf(e, a.vars), valuesOf(a.e, a.vars)];
        for (let i = 0; i < us.length; i++) {
          const [u, v] = [us[i], vs[i]];
          if (!Number.isFinite(u) || !Number.isFinite(v)) continue;
          compared++;
          if (a.mode === "plusC") {
            diff0 ??= u - v;
            if (!near(u - v, diff0, 1e-7 * Math.max(1, Math.abs(v)))) return { ok: false };
          } else if (!near(u, v, 1e-7 * Math.max(1, Math.abs(v)))) return { ok: false };
        }
        if (compared < 4) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
        if (a.mode === "factor" && !factored(e)) return { ok: false, close: true, why: w.reasons.notFactored };
        if (a.mode === "expand" && !expanded(e)) return { ok: false, close: true, why: w.reasons.notExpanded };
        if (a.mode === "fraction" && !oneFraction(e)) return { ok: false, close: true, why: w.reasons.notOneFraction };
        if (a.mode === "fraction" && !lowestTerms(e)) return { ok: false, close: true, why: w.reasons.notLowest };
        return { ok: true };
      }
      case "primes": {
        const e = parseE(src.replace(/[·×]/g, "*"));
        const fs = factorsOf(e);
        let prod = 1;
        let allPrime = true;
        for (const f of fs) {
          const [b, k] = f.k === "num" ? [f.v, 1] : f.k === "pow" && f.b.k === "num" && f.e.k === "num" && f.e.v.isInt() ? [f.b.v, f.e.v.n] : [null, 0];
          if (!b || !b.isInt() || k < 1) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
          prod *= b.n ** k;
          if (!isPrime(b.n)) allPrime = false;
        }
        if (prod !== a.n) return { ok: false };
        return allPrime ? { ok: true } : { ok: false, close: true, why: fill(w.reasons.notPrime, { n: a.n }) };
      }
      case "sign": {
        const got = readSign(src);
        return got ? { ok: got === a.v } : { ok: false, why: w.reasons.notSign };
      }
      case "poly": {
        const v = judgePoly(a.play, src);
        return v.ok ? v : v.problem ? { ok: false, why: w.reasons.shape[v.problem] } : { ok: false };
      }
      case "shade": {
        const v = judgeShade(a.play, a.count, src);
        if (v.ok) return v;
        return "problem" in v ? { ok: false, why: w.reasons.shading[v.problem] } : { ok: false, hint: fill(w.reasons.shading.count, { k: v.shaded }) };
      }
      case "order": {
        const v = judgeOrder(a.items, a.seq, src);
        if (v.ok) return v;
        if ("problem" in v) return { ok: false, why: fill(w.reasons.order[v.problem], { n: a.items.length }) };
        // Biggest first: the right idea the wrong way round, sent back — unless they are unit fractions, where it is
        // also the order of their bottoms, a slip the traps name.
        const unit = a.items.every((i) => i.n === 1);
        if (!unit && v.seq.every((i, k) => i === a.seq[a.seq.length - 1 - k])) return { ok: false, why: w.reasons.order.reversed };
        return { ok: false };
      }
      case "pick": {
        const v = judgePick(a, src);
        if (v.ok) return v;
        return "problem" in v ? { ok: false, why: fill(w.reasons.pick.notOption, { opts: a.options.map((o) => o.text).join(", ") }) } : { ok: false };
      }
      case "divisors": {
        const v = judgeDivisors(a, src);
        if (v.ok) return v;
        if ("problem" in v) return { ok: false, why: fill(w.reasons.divisors[v.problem], { divs: a.offered.join(", "), d: "d" in v ? v.d : "" }) };
        // Every one listed divides it, but some are missing: said, as the board does.
        return v.more ? { ok: false, hint: fill(w.reasons.divisors.more, { n: a.n }) } : { ok: false };
      }
      case "matrix": {
        const m = readMatrix(src);
        if (!m) return { ok: false, why: fill(w.reasons.unreadable, { s: input }) };
        const [rs, cs] = [a.rows.length, a.rows[0].length];
        if (m.length !== rs || m.some((row) => row.length !== cs)) return { ok: false, why: fill(w.reasons.matrixSize, { r: rs, c: cs }) };
        return { ok: m.every((row, i) => row.every((v, j) => near(v, a.rows[i][j], a.tol))) };
      }
      case "dir": {
        const vs = parts(src).map(value);
        if (vs.some((v) => !Number.isFinite(v))) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
        if (vs.length !== a.vs.length) return { ok: false, why: fill(w.reasons.count, { n: a.vs.length }) };
        if (vs.every((v) => near(v, 0, 1e-12))) return { ok: false, why: w.reasons.zeroVector };
        // Parallel: the multiple that matches the largest component matches every one.
        const i = a.vs.reduce((b, v, j) => (Math.abs(v) > Math.abs(a.vs[b]) ? j : b), 0);
        const k = vs[i] / a.vs[i];
        return { ok: vs.every((v, j) => near(v, k * a.vs[j], 1e-9 * Math.max(1, Math.abs(v)))) };
      }
      case "ratio": {
        // The same ratio is each term the same multiple of the one asked for; a multiple other than 1 is not simplest.
        const ps = src.split(/[:∶]/);
        const vs = ps.map(value);
        if (ps.length < 2 || vs.some((v) => !Number.isFinite(v) || v <= 0)) return { ok: false, why: fill(w.reasons.ratio.unreadable, { s: input }) };
        if (vs.length !== a.vs.length) return { ok: false, why: fill(w.reasons.count, { n: a.vs.length }) };
        const k = vs[0] / a.vs[0];
        if (!vs.every((v, i) => near(v, k * a.vs[i], 1e-9 * Math.max(1, v)))) return { ok: false };
        return near(k, 1, 1e-9) ? { ok: true } : { ok: false, close: true, why: w.reasons.ratio.notSimplest };
      }
      case "clock": {
        // h:mm; minutes of 60 or more are no time (2:75), which says how the hour was counted.
        const c = readClock(src);
        if (!c || c.h > 23) return { ok: false, why: fill(w.reasons.time.unreadable, { s: input }) };
        if (c.m >= 60) return minutesOver(c.m, w);
        if (a.face && c.h > 12) return { ok: false, why: w.reasons.time.face };
        const v = 60 * c.h + c.m;
        return { ok: a.h24 ? v === ((a.t % DAY) + DAY) % DAY : v % HALF_DAY === ((a.t % HALF_DAY) + HALF_DAY) % HALF_DAY };
      }
      case "meas": {
        const ps = readMeasure(src, unitWords(w.units));
        const [big, small] = [w.units[a.big], w.units[a.small]];
        if (!ps || ps.length > 2) return { ok: false, why: fill(w.reasons.measure.unreadable, { s: input }) };
        if (ps.some(([, u]) => u !== null && u !== a.big && u !== a.small) || (ps.length === 2 && (ps[0][1] !== a.big || ps[1][1] !== a.small)))
          return { ok: false, why: fill(w.reasons.measure.units, { big, small }) };
        const bigPart = ps.find(([, u]) => u === a.big);
        const smallPart = ps.find(([, u]) => u === a.small);
        // As many of the smaller unit as make one of the larger, or more, after the larger: not carried over.
        if (bigPart && smallPart && smallPart[0] >= a.f) {
          const m = smallPart[0];
          return { ok: false, mistake: "notRegrouped", hint: fill(w.mistakes.notRegrouped, { f: a.f, s: m, q: Math.floor(m / a.f), r: m % a.f, big, small }) };
        }
        if (ps.length === 1 && ps[0][1] === null && a.whole) return { ok: false, why: fill(w.reasons.measure.whole, { big, small }) };
        const v = ps.reduce((t, [n, u]) => t + n * (u === a.big ? a.f : 1), 0);
        if (Math.abs(v - a.v) > 1e-9) return { ok: false };
        // The right amount in the wrong units: in the smaller alone when both were asked for, or in the larger.
        if (a.whole && !(bigPart && smallPart) && a.v >= a.f && a.v % a.f !== 0) return { ok: false, close: true, why: fill(w.reasons.measure.whole, { big, small }) };
        if (!a.whole && bigPart) return { ok: false, close: true, why: fill(w.reasons.measure.inSmall, { small }) };
        return { ok: true };
      }
      case "dur": {
        const d = readDuration(src, w.time.stems);
        if (!d) return { ok: false, why: fill(w.reasons.time.unreadableLength, { s: input }) };
        if (d.over) return minutesOver(d.mins, w);
        return { ok: Math.abs(d.m - a.m) < 1e-9 };
      }
      case "near": {
        const v = judgeNear(a, src);
        if (v.ok) return v;
        return "problem" in v ? { ok: false, why: fill(w.reasons.near[v.problem], { opts: a.options.map((o) => o.text).join(", ") }) } : { ok: false };
      }
      case "target": {
        const v = judgeTarget(a.puzzle, src);
        if (v.ok) return v;
        const ops = a.puzzle.ops.map((o) => OP_SIGN[o]).join(" ");
        if ("problem" in v) return { ok: false, why: fill(w.reasons.target[v.problem], { ops }) };
        // Worked from left to right, it would have made the target: the order of operations is the slip.
        if (v.leftToRight) return { ok: false, mistake: "leftToRight", hint: w.mistakes.leftToRight };
        return { ok: false, hint: fill(w.reasons.target.makes, { v: qText(v.makes), t: a.puzzle.target }) };
      }
      case "pin": {
        const v = judgePin(a.play, a.v, src);
        if (v.ok) return v;
        if ("problem" in v) return { ok: false, why: w.reasons.pin[v.problem] };
        // Which way it was off is said, whether it was close or not.
        return { ok: false, close: v.close || undefined, hint: w.reasons.pin[v.side] };
      }
      case "ineq": {
        const got = readIneq(src);
        if (!got) return { ok: false, why: w.reasons.notIneq };
        const same = (x: Bound | null, y: Bound | null) => (!x && !y) || (!!x && !!y && near(x.v, y.v, 1e-9) && x.closed === y.closed);
        return same(got.lo, a.lo) && same(got.hi, a.hi) ? { ok: true } : { ok: false };
      }
    }
  } catch {
    return { ok: false, why: fill(w.reasons.unreadable, { s: input }) };
  }
}
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return false;
  return true;
};

/** What the input reads as, in LaTeX, so a typo shows before checking (null when it can't be read). */
export function preview(ex: Exercise, input: string): string | null {
  const s = withoutUnit(ex.answer, input.trim());
  if (!s) return null;
  if (ex.answer.k === "poly" || ex.answer.k === "pin" || ex.answer.k === "near" || ex.answer.k === "order" || ex.answer.k === "shade" || ex.answer.k === "pick" || ex.answer.k === "divisors" || ex.answer.k === "clock" || ex.answer.k === "dur" || ex.answer.k === "meas") return null;
  if (ex.answer.k === "target") {
    // The sum as maths, and what it makes so far.
    const e = parseSum(s);
    const v = e && valueOf(e);
    return e && `${sumTex(e)}${v ? ` = ${v[1] === 1 ? v[0] : `\\frac{${v[0]}}{${v[1]}}`}` : ""}`;
  }
  try {
    if (ex.answer.k === "set" || ex.answer.k === "tuple") return parts(s).map((p) => tex(parseE(bare(p)))).join(", \\; ");
    if (ex.answer.k === "dir") return `\\begin{pmatrix} ${parts(s).map((p) => tex(parseE(bare(p)))).join(" \\\\ ")} \\end{pmatrix}`;
    if (ex.answer.k === "matrix") {
      const rows = matrixCells(s);
      return rows && env(rows.map((r) => r.map((c) => tex(parseE(c)))));
    }
    if (ex.answer.k === "ratio") return s.split(/[:∶]/).map((p) => tex(parseE(bare(p)))).join(" : ");
    if (ex.answer.k === "sign") {
      const got = readSign(s);
      return got && ex.q.replace("\\square", got);
    }
    if (ex.answer.k === "ineq") {
      const got = readIneq(s);
      // The variable: a letter on its own ("inf" is not one).
      return got && ineqTex(got.lo, got.hi, s.match(/(?<![a-z])[a-z](?![a-z])/i)?.[0] ?? "x");
    }
    let t = s.replace(/[′']/g, "");
    if (ex.answer.k === "expr" && t.includes("=")) t = t.slice(t.lastIndexOf("=") + 1);
    if (ex.answer.k === "expr" && ex.answer.mode === "plusC") return tex(parseE(t.replace(/\+\s*[cC]\s*$/, ""))) + " + C";
    if (ex.answer.k === "num") {
      if (ex.answer.std) t = stdText(t);
      const mixed = bare(t).match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
      if (mixed) return `${mixed[1]}${mixed[2]}\\frac{${mixed[3]}}{${mixed[4]}}`;
      t = bare(t);
    }
    return tex(parseE(t.replace(/[·×]/g, "*")));
  } catch {
    return null;
  }
}

// ---------- worksheets ----------

/** A sheet of questions (count 1: a single question card). */
export type PracticeSpec = {
  area: Area;
  skill: SkillId | "mixed";
  level: Level;
  seed: number;
  count: number;
  answers: boolean;
  /** For a screen that shows a question answered by doing with its own picture (the grid, the line, the dots that flash): its picture is left off the card. */
  screen?: boolean;
};

/** The seed of question i on a sheet. */
const seedOf = (seed: number, i: number) => (Math.imul(seed ^ 0x9e3779b9, 2654435761) + i * 7919) >>> 0;

export function exercisesOf(spec: PracticeSpec, w: PracticeWords): Exercise[] {
  const skills = spec.skill === "mixed" ? [...SKILLS[spec.area]] : [spec.skill];
  const n = Math.max(1, Math.min(30, Math.round(spec.count)));
  if (n === 1) return [exercise(skills[spec.seed % skills.length], spec.level, spec.seed, w)];
  const start = spec.seed % skills.length;
  return Array.from({ length: n }, (_, i) => exercise(skills[(start + i) % skills.length], spec.level, seedOf(spec.seed, i), w));
}

function placeTex(t: string, x: number, y: number, maxW: number, color = C.ink, scale = 1): { svg: string; h: number; w: number } {
  const r = latexToSvg(t, color);
  const k = Math.min(scale, maxW / r.width);
  const [ww, hh] = [r.width * k, r.height * k];
  return {
    svg: r.svg
      .replace(/width="[\d.]+"/, `width="${r2(ww)}"`)
      .replace(/height="[\d.]+"/, `height="${r2(hh)}"`)
      .replace(/^<svg/, `<svg x="${r2(x)}" y="${r2(y)}"`),
    h: hh,
    w: ww,
  };
}
const line = (x: number, y: number, s: string, o: { size?: number; color?: string; bold?: boolean; anchor?: string } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 15}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""}>${esc(s)}</text>`;

export function renderPractice(spec: PracticeSpec, w: PracticeWords): RenderedSvg {
  const exs = exercisesOf(spec, w);
  const single = exs.length === 1;
  const parts: string[] = [];
  let y = 18;
  const title = `${spec.skill === "mixed" ? w.mixed : w.skills[spec.skill]} · ${w.levels[String(spec.level) as "1" | "2" | "3"]}`;
  parts.push(line(20, y + 6, title, { size: 13, color: C.grey, bold: true }));
  y += 22;
  exs.forEach((ex, i) => {
    const x0 = single ? 20 : 48;
    if (!single) parts.push(line(20, y + 15, `${i + 1}.`, { bold: true, color: C.blue }));
    for (const l of wrap(ex.prompt, single ? 70 : 66)) {
      parts.push(line(x0, y + 15, l));
      y += 21;
    }
    if (ex.q) {
      const q = placeTex(ex.q, x0 + 8, y + 4, W - x0 - 30, C.ink, 1.1);
      parts.push(q.svg);
      y += q.h + 10;
    }
    if (ex.pic && !(spec.screen && ex.play)) {
      parts.push(ex.pic.svg(x0 + 10, y));
      y += ex.pic.h;
    }
    if (single && spec.answers) {
      parts.push(line(x0, y + 18, w.answer + ":", { bold: true, color: C.green }));
      const a = placeTex(ex.show, x0 + 80, y + 4, W - x0 - 100, C.green);
      parts.push(a.svg);
      y += Math.max(26, a.h + 8);
    }
    y += single ? 6 : 12;
  });
  if (!single && spec.answers) {
    y += 4;
    parts.push(`<line x1="20" y1="${r2(y)}" x2="${W - 20}" y2="${r2(y)}" stroke="#ced4da" stroke-dasharray="6 4"/>`);
    y += 10;
    parts.push(line(20, y + 15, w.answers, { bold: true, color: C.green }));
    y += 26;
    exs.forEach((ex, i) => {
      parts.push(line(28, y + 15, `${i + 1}.`, { bold: true, color: C.green, size: 13 }));
      const a = placeTex(ex.show, 56, y + 2, W - 80, C.green, 0.9);
      parts.push(a.svg);
      y += Math.max(22, a.h + 6);
    });
  }
  const H = Math.ceil(y + 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${parts.join("")}</svg>`;
  return { svg, width: W, height: H };
}

export const PRACTICE_PRESETS: { label: string; spec: PracticeSpec }[] = AREAS.flatMap((area) =>
  LEVELS.map((level) => ({ label: `${area} ${level}`, spec: { area, skill: "mixed" as const, level, seed: 7 + level, count: 2 * SKILLS[area].length, answers: true } })),
);

/** Worked lines as a picture, for questions no tool draws. */
export function renderSteps(steps: string[]): RenderedSvg {
  const parts: string[] = [];
  let y = 12;
  for (const s of steps) {
    const t = placeTex(s, 24, y, W - 48);
    parts.push(t.svg);
    y += t.h + 14;
  }
  const H = Math.ceil(y + 4);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${parts.join("")}</svg>`, width: W, height: H };
}
