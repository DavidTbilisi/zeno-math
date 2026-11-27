// Practice: Limits. Easy is 0/0 at a point, taken away by factoring out x − a and cancelling (putting x in at once
// and calling 0/0 nothing, named); medium is a fraction of polynomials as x grows, read off the highest powers (the
// constant terms used instead, named), or (1 + a/x)^(bx), which tends to e^(ab), not 1 (named); hard is 0/0 at 0 by
// L'Hôpital's rule (the inner derivative left out, named), or |x − c|/(x − c), whose two sides disagree, so the
// limit does not exist (one side taken for both, named).
import { exact, F, minusA, minusAWords, numTraps, pickOf, sym, word, type NumSlip } from "../calculusTwo";
import { fill } from "../chart";
import type { Frac } from "../fraction";
import { minus } from "../logicSets";
import { polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";

const tx = (s: string) => T(s);

/** 0/0 at x = a, from a factor x − a top and bottom. */
function cancelPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-5, 5);
  let c = r.int(-6, 6);
  while (a + c === 0) c = r.int(-6, 6);
  const alone = r.next() < 0.4;
  let d = r.int(-6, 6);
  while (a + d === 0 || d === c) d = r.int(-6, 6);
  const top = polyStr([-a * c, c - a, 1]);
  const bottom = alone ? polyStr([-a, 1]) : polyStr([-a * d, d - a, 1]);
  const v = F(a + c, alone ? 1 : a + d);
  const br = (s: string) => `\\left(${tx(s)}\\right)`;
  const [xa, xc, xd] = [br(minusA(a)), br(minusA(-c)), br(minusA(-d))];
  return {
    prompt: w.calc2.prompt.limit,
    q: `\\lim_{x \\to ${a}} \\frac{${tx(top)}}{${tx(bottom)}}`,
    ...exact(v, [["substitutedZeroOverZero", 0, { f: minusAWords(a) }]]),
    steps: [
      `\\frac{${tx(top)}}{${tx(bottom)}} = \\frac{${xa} ${xc}}{${alone ? xa : `${xa} ${xd}`}}`,
      `= ${alone ? tx(minusA(-c)) : `\\frac{${tx(minusA(-c))}}{${tx(minusA(-d))}}`} \\to ${alone ? a + c : `\\frac{${a + c}}{${a + d}}`} = ${v.tex()}`,
    ],
  };
}

/** A fraction of polynomials of the same degree as x grows, or (1 + a/x)^(bx). */
function infinityPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.3) {
    const [a, b] = [r.nz(-3, 3), r.int(1, 3)];
    const ab = a * b;
    const inner = `1 ${a < 0 ? "-" : "+"} \\frac{${Math.abs(a)}}{x}`;
    const show = ab === 1 ? "e" : `e^{${ab}}`;
    const traps = numTraps(Math.exp(ab), [["oneToInfinity", 1]]);
    return {
      prompt: w.calc2.prompt.limit,
      q: `\\lim_{x \\to \\infty} \\left(${inner}\\right)^{${b === 1 ? "" : b}x}`,
      answer: { k: "num", v: Math.exp(ab), tol: 1e-9 * Math.max(1, Math.exp(ab)), traps },
      show,
      plain: ab === 1 ? "e" : `e^${ab}`,
      format: "exact",
      steps: [`\\left(${inner}\\right)^{x} \\to e^{${a}}`, `\\left(${inner}\\right)^{${b === 1 ? "" : b}x} = \\left(\\left(${inner}\\right)^{x}\\right)^{${b}} \\to ${show}`],
    };
  }
  const n = r.int(1, 3);
  const p = r.nz(-6, 6);
  const m = r.int(1, 6);
  let s = r.nz(-9, 9);
  let t = r.nz(-9, 9);
  while (Math.abs(s * m - t * p) === 0 || Math.abs(s * m + t * p) === 0) [s, t] = [r.nz(-9, 9), r.nz(-9, 9)];
  const mid = () => Array.from({ length: n - 1 }, () => r.int(-6, 6));
  const top = polyStr([s, ...mid(), p]);
  const bottom = polyStr([t, ...mid(), m]);
  const xn = n === 1 ? "x" : `x^{${n}}`;
  const v = F(p, m);
  return {
    prompt: w.calc2.prompt.limit,
    q: `\\lim_{x \\to \\infty} \\frac{${tx(top)}}{${tx(bottom)}}`,
    ...exact(v, [["leadingTermsWrong", F(s, t), { n }]]),
    steps: [`\\div ${xn}: \\quad \\frac{${p} + \\ldots}{${m} + \\ldots}`, `\\to \\frac{${p}}{${m}} = ${v.tex()}`],
  };
}

/** 0/0 at 0 by L'Hôpital's rule. */
function lhopitalPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(2, 5);
  let b = r.int(1, 5);
  while (b === a) b = r.int(1, 5);
  const bx = b === 1 ? "x" : `${b}x`;
  const cases = [
    { q: `\\frac{e^{${a}x} - 1}{${bx}}`, d: `\\frac{${a}e^{${a}x}}{${b}}`, v: F(a, b), slip: F(1, b) },
    { q: `\\frac{\\sin ${a}x}{\\sin ${bx}}`, d: `\\frac{${a}\\cos ${a}x}{${b === 1 ? "" : b}\\cos ${bx}}`, v: F(a, b), slip: F(1) },
    { q: `\\frac{\\ln(1 + ${a}x)}{${bx}}`, d: `\\frac{${a}}{${b}(1 + ${a}x)}`, v: F(a, b), slip: F(1, b) },
    { q: `\\frac{1 - \\cos ${a}x}{${b === 1 ? "" : b}x^{2}}`, d: `\\frac{${a}\\sin ${a}x}{${2 * b}x} \\to \\frac{${a * a}\\cos ${a}x}{${2 * b}}`, v: F(a * a, 2 * b), slip: F(1, 2 * b) },
  ];
  const c = r.pick(cases);
  return {
    prompt: w.calc2.prompt.limit,
    q: `\\lim_{x \\to 0} ${c.q}`,
    ...exact(c.v, [["lhopitalNoChain", c.slip, { a }]]),
    steps: [`x = 0: \\quad \\frac{0}{0}`, `\\frac{f'(x)}{g'(x)} = ${c.d}`, `\\to ${c.v.tex()}`],
  };
}

/** |x − c|/(x − c) from one side or both. */
function sidesPart(r: Rng, w: PracticeWords): Part {
  const c = r.int(-4, 4);
  const side = r.pick(["+", "-", ""] as const);
  const options = [sym("1", "1"), sym("-1", "-1", "−1"), sym("0", "0"), word(w.calc2.dne)];
  const right = side === "+" ? 0 : side === "-" ? 1 : 3;
  const xc = tx(minusA(c));
  return {
    prompt: w.calc2.prompt.limitSide,
    q: `\\lim_{x \\to ${c}${side ? `^{${side}}` : ""}} \\frac{\\left|${xc}\\right|}{${xc}}`,
    ...pickOf(options, right, side ? [] : [["oneSidedLimit", 0, { c: minus(c) }]]),
    steps: [`x > ${c}: \\ \\frac{\\left|${xc}\\right|}{${xc}} = 1`, `x < ${c}: \\ \\frac{\\left|${xc}\\right|}{${xc}} = -1`],
  };
}

const br = (v: number) => (v < 0 ? `(${v})` : String(v));
const r4 = (v: number) => Math.round(v * 10000) / 10000;
const over = (s: string, k: number) => (k === 1 ? s : `\\frac{${s}}{${k}}`);
const coef = (k: number) => (k === 1 ? "" : k === -1 ? "-" : String(k));
const plusW = (c: number) => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}`);

/** The Khan unit's other techniques (#744), on half the seeds. */
function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.liK;
  const P = w.calc2.prompt.limit;
  if (L === 1) {
    const t = r.pick(["combine", "composite", "trig", "table"] as const);
    const a = r.int(-4, 4);
    if (t === "combine") {
      const [A, B] = [r.nz(-6, 6), r.nz(-6, 6)];
      const prompt = fill(K.combQ, { a: minus(a), A: minus(A), B: minus(B) });
      if (r.next() < 0.5) {
        const k = r.int(2, 4);
        return { prompt, q: `\\lim_{x \\to ${a}} \\left(f(x) - ${k}\\,g(x)\\right)`, ...exact(F(A - k * B), [["limitCoefficientLost", F(A - B), { k }]]), steps: [`${A} - ${k} \\cdot ${br(B)} = ${A - k * B}`] };
      }
      return { prompt, q: `\\lim_{x \\to ${a}} f(x)\\,g(x)`, ...exact(F(A * B), [["limitsAddedForProduct", F(A + B), { A: minus(A), B: minus(B) }]]), steps: [`${A} \\cdot ${br(B)} = ${A * B}`] };
    }
    if (t === "composite") {
      const sq = r.next() < 0.5;
      const c = r.int(-6, 6);
      let b = r.int(-4, 4);
      while (sq ? b * b === a * a : b === a) b = r.int(-4, 4);
      const f = (x: number) => (sq ? x * x + c : 2 * x + c);
      return {
        prompt: fill(K.compQ, { a: minus(a), b: minus(b), f: `${sq ? "x²" : "2x"}${plusW(c)}` }),
        q: `\\lim_{x \\to ${a}} f(g(x))`,
        ...exact(F(f(b)), [["compositeAtPoint", F(f(a)), { a: minus(a), b: minus(b) }]]),
        steps: [`x \\to ${a}: \\quad g(x) \\to ${b}`, `f(${b}) = ${f(b)}`],
      };
    }
    if (t === "trig") {
      const c = r.pick([
        { e: "4\\sin^{2} x", at: "\\frac{\\pi}{6}", v: 1, sw: 3, s: "4 \\cdot \\left(\\tfrac{1}{2}\\right)^{2} = 1" },
        { e: "4\\cos^{2} x", at: "\\frac{\\pi}{3}", v: 1, sw: 3, s: "4 \\cdot \\left(\\tfrac{1}{2}\\right)^{2} = 1" },
        { e: "4\\sin^{2} x", at: "\\frac{\\pi}{3}", v: 3, sw: 1, s: "4 \\cdot \\left(\\tfrac{\\sqrt{3}}{2}\\right)^{2} = 3" },
        { e: "4\\cos^{2} x", at: "\\frac{\\pi}{6}", v: 3, sw: 1, s: "4 \\cdot \\left(\\tfrac{\\sqrt{3}}{2}\\right)^{2} = 3" },
        { e: "\\sin x - \\cos x", at: "\\pi", v: 1, sw: -1, s: "0 - (-1) = 1" },
        { e: "2\\sin x + \\cos x", at: "\\frac{\\pi}{2}", v: 2, sw: 1, s: "2 \\cdot 1 + 0 = 2" },
        { e: "\\sin 2x", at: "\\frac{\\pi}{4}", v: 1, sw: 0, s: "\\sin \\frac{\\pi}{2} = 1" },
      ]);
      return { prompt: P, q: `\\lim_{x \\to ${c.at}} \\left(${c.e}\\right)`, ...exact(F(c.v), [["sinCosSwapped", F(c.sw)]]), steps: [`x = ${c.at}: \\quad ${c.s}`] };
    }
    const fmt = (xs: number[]) => xs.map((x) => minus(r4(x))).join("; ");
    const opts = [fmt([a - 0.1, a - 0.01, a - 0.001, a + 0.001, a + 0.01, a + 0.1]), fmt([a - 2, a - 1, a, a + 1, a + 2]), fmt([a + 0.1, a + 0.01, a + 0.001]), fmt([a + 1, a + 10, a + 100])];
    const vars = { a: minus(a) };
    return pickPart(r, opts, 0, [{ id: "tableIncludesPoint", at: 1, vars }, { id: "tableOneSide", at: 2, vars }, { id: "tableFarAway", at: 3, vars }], fill(K.tableQ, vars), [`x \\to ${a}^{-}, \\quad x \\to ${a}^{+}, \\quad x \\ne ${a}`]);
  }
  if (L === 2) {
    const t = r.pick(["conj", "ident", "inf", "root", "trigInf", "strategy"] as const);
    if (t === "conj") {
      const [c, b] = [r.int(-3, 5), r.int(2, 5)];
      const under = tx(minusA(c - b * b));
      const xc = tx(minusA(c));
      return {
        prompt: P,
        q: `\\lim_{x \\to ${c}} \\frac{\\sqrt{${under}} - ${b}}{${xc}}`,
        ...exact(F(1, 2 * b), [["conjugateNotDoubled", F(1, b), { b }], ["conjugateSkipped", 0, { r: `√(${minusAWords(c - b * b)}) + ${b}`, f: minusAWords(c) }]]),
        steps: [`\\frac{(${under}) - ${b * b}}{\\left(${xc}\\right)\\left(\\sqrt{${under}} + ${b}\\right)} = \\frac{1}{\\sqrt{${under}} + ${b}}`, `\\to \\frac{1}{${b} + ${b}} = \\frac{1}{${2 * b}}`],
      };
    }
    if (t === "ident") {
      const k = r.int(1, 4);
      const kk = k === 1 ? "" : String(k);
      const c = r.pick([
        { q: `\\frac{\\sin^{2} x}{${kk}(1 - \\cos x)}`, v: F(2, k), id: "sin²x = (1 − cos x)(1 + cos x)", st: over("1 + \\cos x", k) },
        { q: `\\frac{\\sin 2x}{${kk}\\sin x}`, v: F(2, k), id: "sin 2x = 2 sin x cos x", st: over("2\\cos x", k) },
        { q: `\\frac{\\cos 2x - 1}{${kk}\\sin^{2} x}`, v: F(-2, k), id: "cos 2x = 1 − 2 sin²x", st: over("-2", k) },
        { q: `\\frac{\\tan x}{${kk}\\sin x}`, v: F(1, k), id: "tan x = sin x ÷ cos x", st: `\\frac{1}{${kk}\\cos x}` },
      ]);
      return { prompt: P, q: `\\lim_{x \\to 0} ${c.q}`, ...exact(c.v, [["identitySkipped", 0, { id: c.id }]]), steps: [`x = 0: \\quad \\frac{0}{0}`, `${c.q} = ${c.st}`, `\\to ${c.v.tex()}`] };
    }
    if (t === "inf") {
      const [a, k, p] = [r.int(-4, 4), r.nz(-5, 5), r.pick([1, 2])];
      const side = r.pick(["+", "-", ""] as const);
      const opts = [sym("\\infty", "∞"), sym("-\\infty", "-∞", "−∞"), word(w.calc2.dne), sym("0", "0")];
      const sR = Math.sign(k);
      const sL = p === 2 ? sR : -sR;
      const at = (s: number) => (s > 0 ? 0 : 1);
      const one = side === "+" ? sR : sL;
      const [right, slips]: [number, Parameters<typeof pickOf>[2]] = side
        ? [at(one), [["infiniteSignMissed", at(-one), { a: minus(a) }]]]
        : sL === sR
          ? [at(sR), [["infiniteCalledNoLimit", 2, { a: minus(a), v: sR > 0 ? "∞" : "−∞" }]]]
          : [2, [["oneSideTaken", 0, { o: "−∞" }], ["oneSideTaken", 1, { o: "∞" }]]];
      const xa = tx(minusA(a));
      const inf = (s: number) => (s > 0 ? "+\\infty" : "-\\infty");
      return {
        prompt: w.calc2.prompt.limitSide,
        q: `\\lim_{x \\to ${a}${side ? `^{${side}}` : ""}} \\frac{${k}}{${p === 2 ? `\\left(${xa}\\right)^{2}` : xa}}`,
        ...pickOf(opts, right, slips),
        steps: [`x \\to ${a}^{-}: \\quad ${inf(sL)}`, `x \\to ${a}^{+}: \\quad ${inf(sR)}`],
      };
    }
    if (t === "root") {
      const [a, b, c, d] = [r.int(2, 4), r.int(1, 9), r.int(1, 4), r.nz(-5, 5)];
      const neg = r.next() < 0.5;
      const v = F(neg ? -a : a, c);
      return {
        prompt: P,
        q: `\\lim_{x \\to ${neg ? "-" : ""}\\infty} \\frac{\\sqrt{${a * a}x^{2} + ${b}}}{${coef(c)}x ${d < 0 ? "-" : "+"} ${Math.abs(d)}}`,
        ...exact(v, [...(neg ? [["sqrtNegativeInfinity", F(a, c), { a, c }] as NumSlip] : []), ["rootNotTaken", F(neg ? -a * a : a * a, c), { a, a2: a * a }]]),
        steps: [`\\sqrt{${a * a}x^{2} + ${b}} = |x|\\sqrt{${a * a} + \\frac{${b}}{x^{2}}}${neg ? ", \\quad |x| = -x" : ""}`, `\\to \\frac{${neg ? "-" : ""}${a}}{${c}} = ${v.tex()}`],
      };
    }
    if (t === "trigInf") {
      const [p, q] = [r.nz(-5, 5), r.int(1, 5)];
      const fn = r.pick(["\\sin x", "\\cos x"]);
      const v = exact(F(p, q));
      return {
        prompt: w.calc2.prompt.limitSide,
        q: `\\lim_{x \\to \\infty} \\frac{${coef(p)}x + ${fn}}{${coef(q)}x}`,
        ...pickOf([sym(v.show, v.plain), word(w.calc2.dne), sym("0", "0")], 0, [["oscillationNoLimit", 1]]),
        steps: [`-1 \\le ${fn} \\le 1: \\quad \\frac{${fn}}{${coef(q)}x} \\to 0`, `\\to ${v.show}`],
      };
    }
    const kind = r.int(0, 2);
    const [a, b] = [r.nz(-4, 4), r.int(2, 4)];
    const q = [`\\lim_{x \\to ${a}} \\frac{x^{2} - ${a * a}}{${tx(minusA(a))}}`, `\\lim_{x \\to 0} \\frac{\\sqrt{x + ${b * b}} - ${b}}{x}`, `\\lim_{x \\to 0} \\frac{\\sin^{2} x}{1 - \\cos x}`][kind];
    const step = [`x^{2} - ${a * a} = \\left(${tx(minusA(a))}\\right)\\left(${tx(minusA(-a))}\\right)`, `\\cdot \\frac{\\sqrt{x + ${b * b}} + ${b}}{\\sqrt{x + ${b * b}} + ${b}}`, `\\sin^{2} x = (1 - \\cos x)(1 + \\cos x)`][kind];
    return { prompt: K.stratQ, q, ...pickOf([word(K.sFactor), word(K.sConj), word(K.sIdent), word(K.sZero), word(K.sDne)], kind, [["indeterminateAsZero", 3], ["indeterminateAsDne", 4]]), steps: [`\\frac{0}{0}`, step] };
  }
  if (r.next() < 0.5) {
    const a = r.int(2, 5);
    let b = r.int(2, 5);
    while (b === a) b = r.int(2, 5);
    const [n, k] = [r.int(2, 4), r.int(1, 3)];
    const kx = k === 1 ? "x" : `${k}x`;
    const fact = [1, 1, 2, 6, 24][n];
    const c: { q: string; v: Frac; slips: Parameters<typeof exact>[1]; d: string[] } = r.pick([
      { q: `\\frac{\\ln ${a}x}{\\ln ${b}x}`, v: F(1), slips: [["lnArgsDivided", F(a, b), { a, b }]], d: [`\\frac{1/x}{1/x} = 1`] },
      { q: `\\frac{x^{${n}}}{e^{${kx}}}`, v: F(0), slips: [["infinityOverInfinityOne", F(1)]], d: [`\\frac{${n}x^{${n - 1}}}{${k}e^{${kx}}}`, `\\ldots \\to \\frac{${fact}}{${k ** n}e^{${kx}}} \\to 0`] },
      { q: `\\frac{${a}e^{${kx}} + x}{${b}e^{${kx}} + x^{2}}`, v: F(a, b), slips: [["infinityOverInfinityOne", F(1)]], d: [`\\frac{${a * k}e^{${kx}} + 1}{${b * k}e^{${kx}} + 2x}`, `\\frac{${a * k * k}e^{${kx}}}{${b * k * k}e^{${kx}} + 2} \\to \\frac{${a}}{${b}}`] },
    ]);
    return { prompt: P, q: `\\lim_{x \\to \\infty} ${c.q}`, ...exact(c.v, c.slips), steps: [`\\frac{\\infty}{\\infty}`, ...c.d] };
  }
  // A new setting: what a tank of salt water, or a medicine in the blood, comes to in the long run.
  if (r.next() < 0.5) {
    const [V, c, rr] = [r.pick([50, 100, 200, 400]), r.int(2, 9), r.int(2, 10)];
    return {
      prompt: fill(K.tankQ, { V, c, r: rr }),
      q: `\\lim_{t \\to \\infty} \\frac{${c * rr}t}{${V} + ${rr}t}`,
      ...exact(F(c), [["leadingTermsWrong", F(0), { n: 1 }], ["concentrationTimesRate", F(c * rr), { c, r: rr }]]),
      steps: [`\\div t: \\quad \\frac{${c * rr}}{\\frac{${V}}{t} + ${rr}}`, `\\to \\frac{${c * rr}}{${rr}} = ${c}`],
    };
  }
  const [a, b] = [r.int(2, 9) * 5, r.int(2, 9)];
  return {
    prompt: fill(K.drugQ, { a, b }),
    q: `\\lim_{t \\to \\infty} \\frac{${a}t}{t^{2} + ${b}}`,
    ...exact(F(0), [["degreesIgnored", F(a), { a }]]),
    steps: [`\\div t^{2}: \\quad \\frac{\\frac{${a}}{t}}{1 + \\frac{${b}}{t^{2}}}`, `\\to \\frac{0}{1} = 0`],
  };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  return L === 1 ? cancelPart(r, w) : L === 2 ? infinityPart(r, w) : r.next() < 0.75 ? lhopitalPart(r, w) : sidesPart(r, w);
};

export default gen;
