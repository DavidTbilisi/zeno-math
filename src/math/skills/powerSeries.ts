// Practice: Power series. Easy finds the radius of convergence of a series in xⁿ by the ratio test (k for 1/k
// swapped, named); medium picks it among 0, 1/k, k and ∞ for series with n! or centred at a (the same slip, named);
// hard gives the interval of convergence, each end tried on its own: Σ 1/n, Σ (−1)ⁿ/n, Σ 1/n² or Σ (±1)ⁿ there (both
// ends taken as open, or as closed, without trying them, named).
import { exact, F, minusA, pickOf, sym, type CalcTwoWords } from "../calculusTwo";
import type { Bound, Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const SUM = "\\sum_{n=1}^{\\infty}";
const kn = (k: number) => (k === 1 ? "" : `${k}^{n}`);

/** The radius of a series in xⁿ: k or 1/k. */
function radiusPart(r: Rng, w: PracticeWords): Part {
  const k = r.int(2, 5);
  const fams = [
    { term: `\\frac{x^{n}}{${k}^{n}}`, R: F(k), ratio: `\\frac{|x|}{${k}}` },
    { term: `\\frac{x^{n}}{n \\cdot ${k}^{n}}`, R: F(k), ratio: `\\frac{n}{n + 1} \\cdot \\frac{|x|}{${k}} \\to \\frac{|x|}{${k}}` },
    { term: `${k}^{n} x^{n}`, R: F(1, k), ratio: `${k}|x|` },
    { term: `\\frac{n x^{n}}{${k}^{n}}`, R: F(k), ratio: `\\frac{n + 1}{n} \\cdot \\frac{|x|}{${k}} \\to \\frac{|x|}{${k}}` },
    { term: `\\frac{${k}^{n} x^{n}}{n^{2}}`, R: F(1, k), ratio: `\\frac{n^{2}}{(n + 1)^{2}} \\cdot ${k}|x| \\to ${k}|x|` },
  ];
  const f = r.pick(fams);
  return {
    prompt: w.calc2.prompt.radius,
    q: `${SUM} ${f.term}`,
    ...exact(f.R, [["radiusInverted", F(f.R.d, f.R.n)]]),
    steps: [`\\left|\\frac{a_{n+1}}{a_{n}}\\right| = ${f.ratio}`, `${f.ratio.split("\\to ").pop()} < 1 \\iff |x| < ${f.R.tex()}`],
  };
}

/** The radius picked among 0, 1/k, k and ∞. */
function radiusPickPart(r: Rng, w: PracticeWords): Part {
  const k = r.int(2, 5);
  const a = r.nz(-3, 3);
  const xa = `\\left(${minusA(a)}\\right)`;
  const options = [sym("0", "0"), sym(`\\frac{1}{${k}}`, `1/${k}`), sym(String(k), String(k)), sym("\\infty", "∞")];
  const fams = [
    { term: r.next() < 0.5 ? `\\frac{x^{n}}{n!}` : `\\frac{${k}^{n} x^{n}}{n!}`, right: 3, slip: 0, ratio: `\\frac{|x|}{n + 1} \\to 0` },
    { term: `n! \\, x^{n}`, right: 0, slip: 3, ratio: `(n + 1)|x| \\to \\infty` },
    { term: `\\frac{${xa}^{n}}{n \\cdot ${k}^{n}}`, right: 2, slip: 1, ratio: `\\to \\frac{|${minusA(a)}|}{${k}}` },
    { term: `\\frac{${k}^{n} ${xa}^{n}}{n}`, right: 1, slip: 2, ratio: `\\to ${k}|${minusA(a)}|` },
  ];
  const f = r.pick(fams);
  return {
    prompt: w.calc2.prompt.radiusPick,
    q: `${SUM} ${f.term}`,
    ...pickOf(options, f.right, [["radiusInverted", f.slip]]),
    steps: [`\\left|\\frac{a_{n+1}}{a_{n}}\\right| ${f.ratio.startsWith("\\to") ? "" : "= "}${f.ratio}`, `R = ${options[f.right].tex}`],
  };
}

type Ends = { lo: boolean; hi: boolean };
/** The interval of convergence, each end tried. */
function intervalPart(r: Rng, w: PracticeWords): Part {
  const [a, k] = [r.int(-3, 3), r.int(1, 4)];
  const xa = a === 0 ? "x" : `\\left(${minusA(a)}\\right)`;
  const W: CalcTwoWords = w.calc2;
  const [conv, div] = [`\\text{${W.converges}}`, `\\text{${W.diverges}}`];
  const kinds = [
    { term: `\\frac{${xa}^{n}}{${k === 1 ? "n" : `n \\cdot ${kn(k)}`}}`, ends: { lo: true, hi: false }, at: [`\\sum \\frac{(-1)^{n}}{n}`, `\\sum \\frac{1}{n}`] },
    { term: `\\frac{(-1)^{n} ${xa}^{n}}{${k === 1 ? "n" : `n \\cdot ${kn(k)}`}}`, ends: { lo: false, hi: true }, at: [`\\sum \\frac{1}{n}`, `\\sum \\frac{(-1)^{n}}{n}`] },
    { term: `\\frac{${xa}^{n}}{${k === 1 ? "n^{2}" : `n^{2} \\cdot ${kn(k)}`}}`, ends: { lo: true, hi: true }, at: [`\\sum \\frac{(-1)^{n}}{n^{2}}`, `\\sum \\frac{1}{n^{2}}`] },
    { term: k === 1 ? `${xa}^{n}` : `\\frac{${xa}^{n}}{${kn(k)}}`, ends: { lo: false, hi: false }, at: [`\\sum (-1)^{n}`, `\\sum 1`] },
  ];
  const kind = r.pick(kinds);
  const bounds = (e: Ends): { lo: Bound; hi: Bound } => ({ lo: { v: a - k, closed: e.lo }, hi: { v: a + k, closed: e.hi } });
  const { lo, hi } = bounds(kind.ends);
  const open = !kind.ends.lo && !kind.ends.hi;
  const guess = bounds({ lo: open, hi: open });
  const rel = (b: Bound, tex: boolean) => (b.closed ? (tex ? "\\le" : "<=") : "<");
  return {
    prompt: w.calc2.prompt.interval,
    q: `${SUM} ${kind.term}`,
    answer: { k: "ineq", lo, hi, traps: [{ id: "endpointsGuessed", a: { k: "ineq", ...guess } }] },
    show: `${lo.v} ${rel(lo, true)} x ${rel(hi, true)} ${hi.v}`,
    plain: `${lo.v} ${rel(lo, false)} x ${rel(hi, false)} ${hi.v}`,
    format: "inequality",
    steps: [
      `R = ${k}: \\quad ${a - k} < x < ${a + k}`,
      `x = ${a - k}: \\ ${kind.at[0]} \\ ${kind.ends.lo ? conv : div}`,
      `x = ${a + k}: \\ ${kind.at[1]} \\ ${kind.ends.hi ? conv : div}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? radiusPart(r, w) : L === 2 ? radiusPickPart(r, w) : intervalPart(r, w));

export default gen;
