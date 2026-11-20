// Practice: Limits of sequences. Easy finds the N of the ε–N definition for (pn + q)/(n + c) (the N where the
// distance only equals ε, the shift c forgotten, named); medium finds the limit of a monotone recursive sequence from
// its fixed point (the negative root kept, L moved to the wrong side, named); hard finds every subsequential limit
// (the two averaged into one, the subsequence of zeros missed, named).
import { exact } from "../calculusTwo";
import { epsTex, F, valuesOf, wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** pn + q as LaTeX: "3n - 2", "-n", "n + 5". */
const linN = (p: number, q: number) => {
  const head = p === 1 ? "n" : p === -1 ? "-n" : `${p}n`;
  return q === 0 ? head : `${head} ${q < 0 ? "-" : "+"} ${Math.abs(q)}`;
};

/** aₙ = (pn + q)/(n + c) → p: the smallest N with |a_N − p| < ε = 1/k. */
function epsilonPart(r: Rng, w: PracticeWords): Part {
  const [p, c, d, k] = [r.nz(-5, 5), r.int(1, 4), r.int(1, 5), r.pick([10, 20, 100])];
  const q = p * c + r.pick([1, -1]) * d;
  const m = d * k;
  return {
    prompt: fill(w.real.prompt.epsilonN, { p }),
    q: `a_n = \\frac{${linN(p, q)}}{n + ${c}}, \\quad ${epsTex(k)}`,
    ...wholeOf(m - c + 1, [["epsilonBoundaryN", m - c], ["forgotShiftN", m + 1]]),
    steps: [`\\left|a_n - ${p < 0 ? `(${p})` : p}\\right| = \\frac{${d}}{n + ${c}} < \\frac{1}{${k}} \\iff n + ${c} > ${m} \\iff n > ${m - c}`, `N = ${m - c + 1}`],
  };
}

/** The limit of a₁ = s, aₙ₊₁ = √(c + aₙ), or of aₙ₊₁ = (aₙ + b)/k, from L = g(L). */
function recursionPart(r: Rng, w: PracticeWords): Part {
  const prompt = w.real.prompt.recursion;
  if (r.next() < 0.5) {
    const m = r.int(2, 5);
    const c = m * (m - 1);
    return {
      prompt,
      q: `a_1 = ${r.int(0, 1)}, \\quad a_{n+1} = \\sqrt{${c} + a_n}`,
      ...exact(F(m), [["negativeFixedPoint", 1 - m]]),
      steps: [`L = \\sqrt{${c} + L} \\implies L^{2} - L - ${c} = 0 \\implies L \\in \\{${m}, \\; ${1 - m}\\}`, `a_n \\ge 0 \\implies L = ${m}`],
    };
  }
  const [k, b] = [r.int(2, 4), r.nz(-9, 9)];
  const L = F(b, k - 1);
  return {
    prompt,
    q: `a_1 = 0, \\quad a_{n+1} = \\frac{a_n ${b < 0 ? "-" : "+"} ${Math.abs(b)}}{${k}}`,
    ...exact(L, [["fixedPointSign", F(b, k + 1)]]),
    steps: [`L = \\frac{L ${b < 0 ? "-" : "+"} ${Math.abs(b)}}{${k}} \\implies ${k}L = L ${b < 0 ? "-" : "+"} ${Math.abs(b)}`, `L = ${L.tex()}`],
  };
}

/** Every subsequential limit of (−1)ⁿ·pn/(n + 1) + q, or of p·sin(nπ/2) + q. */
function subsequencePart(r: Rng, w: PracticeWords): Part {
  const [p, q] = [r.int(1, 5), r.int(-3, 3)];
  const prompt = w.real.prompt.subsequences;
  const plus = q === 0 ? "" : ` ${q < 0 ? "-" : "+"} ${Math.abs(q)}`;
  const pT = p === 1 ? "" : String(p);
  if (r.next() < 0.5)
    return {
      prompt,
      q: `a_n = (-1)^{n}\\frac{${pT}n}{n + 1}${plus}`,
      ...valuesOf([F(q - p), F(q + p)], [["averageAsLimit", [F(q)]]], "limits"),
      steps: [`a_{2n} \\to ${q + p}, \\quad a_{2n+1} \\to ${q - p}`],
    };
  return {
    prompt,
    q: `a_n = ${pT}\\sin\\frac{n\\pi}{2}${plus}`,
    ...valuesOf([F(q - p), F(q), F(q + p)], [["missedZeroSubsequence", [F(q - p), F(q + p)]], ["averageAsLimit", [F(q)]]], "limits"),
    steps: [`a_{4n+1} = ${q + p}, \\quad a_{2n} = ${q}, \\quad a_{4n+3} = ${q - p}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? epsilonPart(r, w) : L === 2 ? recursionPart(r, w) : subsequencePart(r, w));

export default gen;
