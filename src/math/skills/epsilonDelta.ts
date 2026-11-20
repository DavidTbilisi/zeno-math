// Practice: Continuity by ε and δ. Easy finds the largest δ for a line (ε multiplied by the slope instead of divided,
// named); medium follows the proof that x² is continuous, δ = min(1, ε/(2|a| + 1)) (|x + a| bounded by 2|a| only, the
// 1 left out of the minimum, named); hard says whether a function is uniformly continuous on a set (continuous taken
// for uniformly continuous, an unbounded or open domain taken to rule it out, named).
import { exact, pickOf, word } from "../calculusTwo";
import type { MistakeId } from "../mistakes";
import { epsTex, F } from "../realAnalysis";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** "x - 3", "x + 2", "x". */
const xMinus = (a: number) => (a === 0 ? "x" : a < 0 ? `x + ${-a}` : `x - ${a}`);
const min1 = (x: Frac) => (x.toNumber() > 1 ? F(1) : x);

/** f(x) = mx + c: δ = ε/|m|. */
function linearPart(r: Rng, w: PracticeWords): Part {
  const [m, c, a, k] = [r.pick([2, 3, 4, 5, 6, -2, -3, -4, -5]), r.int(-5, 5), r.int(-3, 3), r.pick([2, 5, 10, 100])];
  const am = Math.abs(m);
  const delta = F(1, k * am);
  return {
    prompt: fill(w.real.prompt.deltaLinear, { a }),
    q: `f(x) = ${m}x${c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c)}`}, \\quad ${epsTex(k)}`,
    ...exact(delta, [["deltaTimesSlope", F(am, k)]]),
    steps: [`|f(x) - f(${a})| = ${am}\\,|${xMinus(a)}| < \\varepsilon \\iff |${xMinus(a)}| < \\frac{\\varepsilon}{${am}}`, `\\delta = ${delta.tex()}`],
  };
}

const EPS: readonly Frac[] = [F(1, 10), F(1, 2), F(1), F(2), F(5), F(10), F(20)];

/** f(x) = x² at a: δ ≤ 1 gives |x + a| < 2|a| + 1, so δ = min(1, ε/(2|a| + 1)). */
function squarePart(r: Rng, w: PracticeWords): Part {
  const [a, eps] = [r.nz(-4, 4), r.pick(EPS)];
  const B = 2 * Math.abs(a) + 1;
  const delta = min1(eps.div(F(B)));
  const slips: [MistakeId, Frac][] = [["boundAtPointOnly", min1(eps.div(F(B - 1)))], ["forgotMinOne", eps.div(F(B))]];
  return {
    prompt: w.real.prompt.deltaSquare,
    q: `f(x) = x^{2}, \\quad a = ${a}, \\quad \\varepsilon = ${eps.tex()}`,
    ...exact(delta, slips),
    steps: [
      `\\delta \\le 1: \\quad |${xMinus(a)}| < 1 \\implies |${xMinus(-a)}| < ${B}`,
      `|x^{2} - ${a * a}| = |${xMinus(a)}|\\,|${xMinus(-a)}| < ${B}\\delta \\le \\varepsilon`,
      `\\delta = \\min\\left(1, \\frac{${eps.tex()}}{${B}}\\right) = ${delta.tex()}`,
    ],
  };
}

type Case = { f: string; dom: string; yes: boolean; slip?: MistakeId; step: string };

/** Uniformly continuous on the set, or not? */
function uniformPart(r: Rng, w: PracticeWords): Part {
  const k = r.int(2, 9);
  const compact = `\\text{${w.real.why.compact}}`;
  const pairs = (x: string, y: string, gap: string) => `x_n = ${x}, \\; y_n = ${y}: \\quad |x_n - y_n| \\to 0, \\quad |f(x_n) - f(y_n)| ${gap}`;
  const lip = (d: string) => `|f'(x)| = ${d} \\le 1 \\implies |f(x) - f(y)| \\le |x - y|`;
  const cases: Case[] = [
    { f: "x^{2}", dom: `[0, ${k}]`, yes: true, step: compact },
    { f: "x\\sin\\frac{1}{x}", dom: "(0, 1)", yes: true, slip: "notCompactNotUniform", step: `\\lim_{x \\to 0^{+}} x\\sin\\frac{1}{x} = 0: \\; ${compact} \\; [0, 1]` },
    { f: "\\sin x", dom: "\\mathbb{R}", yes: true, slip: "notCompactNotUniform", step: lip("|\\cos x|") },
    { f: "\\arctan x", dom: "\\mathbb{R}", yes: true, slip: "notCompactNotUniform", step: lip("\\frac{1}{1 + x^{2}}") },
    { f: "\\frac{1}{x}", dom: "[1, \\infty)", yes: true, slip: "notCompactNotUniform", step: lip("\\frac{1}{x^{2}}") },
    { f: "\\sqrt{x}", dom: "[0, \\infty)", yes: true, slip: "notCompactNotUniform", step: "|\\sqrt{x} - \\sqrt{y}| \\le \\sqrt{|x - y|}" },
    { f: "x^{2}", dom: "\\mathbb{R}", yes: false, slip: "continuousMeansUniform", step: pairs("n + \\frac{1}{n}", "n", "\\to 2") },
    { f: "e^{x}", dom: "\\mathbb{R}", yes: false, slip: "continuousMeansUniform", step: pairs("n + \\frac{1}{n}", "n", "= e^{n}(e^{1/n} - 1) \\ge 1") },
    { f: "\\frac{1}{x}", dom: "(0, 1)", yes: false, slip: "continuousMeansUniform", step: pairs("\\frac{1}{n}", "\\frac{1}{n + 1}", "= 1") },
    { f: "\\sin\\frac{1}{x}", dom: "(0, 1)", yes: false, slip: "continuousMeansUniform", step: pairs("\\frac{1}{2n\\pi + \\pi/2}", "\\frac{1}{2n\\pi}", "= 1") },
  ];
  const c = r.pick(cases);
  const options = [word(w.real.uniformlyContinuous), word(w.real.notUniformlyContinuous)];
  const right = c.yes ? 0 : 1;
  return {
    prompt: w.real.prompt.uniformlyContinuous,
    q: `f(x) = ${c.f}, \\quad x \\in ${c.dom}`,
    ...pickOf(options, right, c.slip ? [[c.slip, 1 - right]] : []),
    steps: [c.step, `\\text{${options[right].text}}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? linearPart(r, w) : L === 2 ? squarePart(r, w) : uniformPart(r, w));

export default gen;
