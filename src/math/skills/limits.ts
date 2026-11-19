// Practice: Limits. Easy is 0/0 at a point, taken away by factoring out x − a and cancelling (putting x in at once
// and calling 0/0 nothing, named); medium is a fraction of polynomials as x grows, read off the highest powers (the
// constant terms used instead, named), or (1 + a/x)^(bx), which tends to e^(ab), not 1 (named); hard is 0/0 at 0 by
// L'Hôpital's rule (the inner derivative left out, named), or |x − c|/(x − c), whose two sides disagree, so the
// limit does not exist (one side taken for both, named).
import { exact, F, minusA, minusAWords, numTraps, pickOf, sym, word } from "../calculusTwo";
import { minus } from "../logicSets";
import { polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

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

const gen: Gen = (r, L, w) => (L === 1 ? cancelPart(r, w) : L === 2 ? infinityPart(r, w) : r.next() < 0.75 ? lhopitalPart(r, w) : sidesPart(r, w));

export default gen;
