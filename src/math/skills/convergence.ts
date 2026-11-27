// Practice: Convergence tests for series. Easy asks whether a geometric series, a p-series or Σ n/(n + 1) converges
// (terms tending to 0 taken as enough, named); medium which test settles a series: ratio, comparison, alternating or
// integral (the ratio test chosen where its limit is 1 and says nothing, named); hard whether an alternating series
// converges absolutely, conditionally or not at all (conditional taken as absolute, and every alternating series taken
// to converge, named). Since #751 half the seeds ask the rest of the unit: a term or the sum from the partial sums
// (L1); the integral test read right, a direct comparison and its limit form (L2); how far a partial sum of an
// alternating series can be from the sum (L3).
import { exact, F, overXp, pickOf, POWERS, powTex, shuffled, word, type Opt } from "../calculusTwo";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const SUM = (from = 1) => `\\sum_{n=${from}}^{\\infty}`;

/** Does a geometric series, a p-series or Σ n/(n + 1) converge? */
function seriesPart(r: Rng, w: PracticeWords): Part {
  const W = w.calc2;
  const options = [word(W.converges), word(W.diverges)];
  const kind = r.int(0, 2);
  if (kind === 0) {
    const q = r.pick([F(1, 2), F(2, 3), F(3, 4), F(1, 3), F(3, 2), F(4, 3), F(5, 4)]);
    const small = q.toNumber() < 1;
    return {
      prompt: W.prompt.series,
      q: `${SUM()} \\left(${powTex(q)}\\right)^{n}`,
      ...pickOf(options, small ? 0 : 1),
      steps: [`r = ${powTex(q)} ${small ? "<" : ">"} 1`],
    };
  }
  if (kind === 1) {
    const p = r.pick(POWERS);
    const big = p.toNumber() > 1;
    return {
      prompt: W.prompt.series,
      q: `${SUM()} ${overXp(p, "n")}`,
      ...pickOf(options, big ? 0 : 1, [["termsToZeroMeansConverge", 0]]),
      steps: [`p = ${powTex(p)} ${big ? ">" : "\\le"} 1`],
    };
  }
  const c = r.int(1, 4);
  return {
    prompt: W.prompt.series,
    q: `${SUM()} \\frac{n}{n + ${c}}`,
    ...pickOf(options, 1),
    steps: [`\\lim_{n \\to \\infty} \\frac{n}{n + ${c}} = 1 \\ne 0`],
  };
}

/** Which test settles it? */
function testPart(r: Rng, w: PracticeWords): Part {
  const W = w.calc2;
  const T = W.tests;
  const options: Opt[] = [word(T.ratio), word(T.comparison), word(T.alternating), word(T.integral)];
  const right = r.int(0, 3);
  const c = r.int(2, 5);
  const k = r.int(2, 3);
  const root = r.pick(["n", "\\sqrt{n}", "n^{\\frac{1}{3}}"]);
  // Each series with the line that settles it.
  const all: [string, string][][] = [
    [[`\\frac{n^{${k}}}{${c}^{n}}`, `\\left|\\frac{a_{n+1}}{a_{n}}\\right| \\to \\frac{1}{${c}} < 1`], [`\\frac{${c}^{n}}{n!}`, `\\left|\\frac{a_{n+1}}{a_{n}}\\right| = \\frac{${c}}{n + 1} \\to 0 < 1`]],
    [[`\\frac{1}{n^{2} + ${c}}`, `0 < \\frac{1}{n^{2} + ${c}} \\le \\frac{1}{n^{2}}`], [`\\frac{n}{n^{3} + ${c}}`, `0 < \\frac{n}{n^{3} + ${c}} \\le \\frac{1}{n^{2}}`]],
    [[`\\frac{(-1)^{n}}{${root}}`, `\\frac{1}{${root}} \\to 0, \\quad \\frac{1}{${root}} \\ge \\frac{1}{${root.replace(/n/g, "(n + 1)")}}`]],
    [[`\\frac{1}{n \\ln n}`, `\\int_{2}^{\\infty} \\frac{dx}{x \\ln x} = \\left[\\ln \\ln x\\right]_{2}^{\\infty} = \\infty`], [`\\frac{1}{n (\\ln n)^{2}}`, `\\int_{2}^{\\infty} \\frac{dx}{x (\\ln x)^{2}} = \\frac{1}{\\ln 2}`]],
  ];
  const [term, why] = r.pick(all[right]);
  return {
    prompt: W.prompt.whichTest,
    q: `${SUM(right === 3 ? 2 : 1)} ${term}`,
    ...pickOf(options, right, [["ratioOneDecides", 0]]),
    steps: [why],
  };
}

/** Absolutely, conditionally, or not at all? */
function howPart(r: Rng, w: PracticeWords): Part {
  const W = w.calc2;
  const options = [word(W.absolutely), word(W.conditionally), word(W.diverges)];
  const kind = r.int(0, 2);
  if (kind === 0) {
    const p = r.pick(POWERS);
    const abs = p.toNumber() > 1;
    return {
      prompt: W.prompt.howConverges,
      q: `${SUM()} (-1)^{n} ${overXp(p, "n")}`,
      ...pickOf(options, abs ? 0 : 1, [["conditionalAsAbsolute", 0]]),
      steps: [`\\sum ${overXp(p, "n")}: \\ p = ${powTex(p)} ${abs ? ">" : "\\le"} 1`, ...(abs ? [] : [`${overXp(p, "n")} \\to 0 \\ \\downarrow`])],
    };
  }
  if (kind === 1) {
    const c = r.int(1, 5);
    return {
      prompt: W.prompt.howConverges,
      q: `${SUM()} (-1)^{n} \\frac{n}{n + ${c}}`,
      ...pickOf(options, 2, [["alternatingAlwaysConverges", 1]]),
      steps: [`\\frac{n}{n + ${c}} \\to 1 \\ne 0`],
    };
  }
  return {
    prompt: W.prompt.howConverges,
    q: `${SUM()} \\frac{(-1)^{n}}{\\ln(n + 1)}`,
    ...pickOf(options, 1, [["conditionalAsAbsolute", 0]]),
    steps: [`\\frac{1}{\\ln(n + 1)} > \\frac{1}{n + 1}`, `\\frac{1}{\\ln(n + 1)} \\to 0 \\ \\downarrow`],
  };
}

const lin = (p: number, q: number, v: string) => `${p === 1 ? "" : p}${v}${q ? ` ${q < 0 ? "-" : "+"} ${Math.abs(q)}` : ""}`;

/** From the partial sums (#751): a term is S_m − S_(m−1); the sum is where S_n goes. */
function partialPart(r: Rng, w: PracticeWords): Part {
  const K = w.cvK;
  if (r.next() < 0.5) {
    const [p, q] = [r.int(1, 4), r.int(-3, 5)];
    const m = r.int(3, 8);
    const S = (n: number) => p * n * n + q * n;
    const Sn = `${p === 1 ? "" : p}n^{2}${q ? ` ${q < 0 ? "-" : "+"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}n` : ""}`;
    return {
      prompt: K.termQ.replace("{m}", String(m)),
      q: `S_{n} = ${Sn}`,
      ...exact(F(S(m) - S(m - 1)), [["partialSumForTerm", S(m), { m }], ["termIndexShifted", S(m + 1) - S(m), { m }]]),
      steps: [`a_{${m}} = S_{${m}} - S_{${m - 1}}`, `= ${S(m)} - ${S(m - 1) < 0 ? `(${S(m - 1)})` : S(m - 1)} = ${S(m) - S(m - 1)}`],
    };
  }
  // S_n = (a n + c)/(n + b): the series adds up to a; its terms go to 0 and S₁ is only the first term.
  const a = r.int(2, 9);
  const b = r.int(1, 4);
  const c = r.int(-3, 3);
  return {
    prompt: K.sumQ,
    q: `S_{n} = \\frac{${lin(a, c, "n")}}{${lin(1, b, "n")}}`,
    ...exact(F(a), [["termLimitForSum", 0], ["firstPartialForSum", F(a + c, 1 + b)]]),
    steps: [`\\sum a_{n} = \\lim_{n \\to \\infty} S_{n}`, `\\lim_{n \\to \\infty} \\frac{${lin(a, c, "n")}}{${lin(1, b, "n")}} = ${a}`],
  };
}

/** The integral test read right, a direct comparison, a limit comparison (#751). */
function compareMore(r: Rng, w: PracticeWords): Part {
  const K = w.cvK;
  const kind = r.int(0, 2);
  if (kind === 0) {
    // The integral and the series converge together, but to different numbers.
    const c = r.int(1, 4);
    const all = [
      { term: `n e^{-n^{2}}`, int: `\\int_{1}^{\\infty} x e^{-x^{2}}\\,dx = \\frac{1}{2e}`, conv: true },
      { term: `\\frac{1}{n^{2} + ${c * c}}`, int: `\\int_{1}^{\\infty} \\frac{dx}{x^{2} + ${c * c}} < \\infty`, conv: true },
      { term: `\\frac{n}{n^{2} + ${c}}`, int: `\\int_{1}^{\\infty} \\frac{x\\,dx}{x^{2} + ${c}} = \\left[\\tfrac{1}{2}\\ln(x^{2} + ${c})\\right]_{1}^{\\infty} = \\infty`, conv: false },
      { term: `\\frac{1}{(n + ${c})^{2}}`, int: `\\int_{1}^{\\infty} \\frac{dx}{(x + ${c})^{2}} = \\frac{1}{${c + 1}}`, conv: true },
    ];
    const f = r.pick(all);
    const opts = [word(K.convNotIntegral), word(K.convIsIntegral), word(w.calc2.diverges)];
    return {
      prompt: K.integralQ,
      q: `\\sum_{n=1}^{\\infty} ${f.term}`,
      ...shuffled(r, opts, f.conv ? 0 : 2, f.conv ? [["sumEqualsIntegral", 1]] : []),
      steps: [f.int, f.conv ? `\\sum \\ne \\int` : `\\int = \\infty \\Rightarrow \\sum = \\infty`],
    };
  }
  if (kind === 1) {
    // aₙ against bₙ: smaller than a convergent one or bigger than a divergent one decides; the other two say nothing.
    const c = r.int(1, 5);
    const cases = [
      { a: `\\frac{1}{n^{2} + ${c}}`, rel: "\\le", b: "\\frac{1}{n^{2}}", bConv: true, right: 0 },
      { a: `\\frac{n + ${c}}{n^{2}}`, rel: "\\ge", b: "\\frac{1}{n}", bConv: false, right: 1 },
      { a: `\\frac{1}{n + ${c}}`, rel: "\\le", b: "\\frac{1}{n}", bConv: false, right: 2 },
      { a: `\\frac{n + ${c}}{n^{3}}`, rel: "\\ge", b: "\\frac{1}{n^{2}}", bConv: true, right: 2 },
    ];
    const f = r.pick(cases);
    const opts = [word(K.aConverges), word(K.aDiverges), word(K.saysNothing)];
    const wrongWay = f.right === 2 ? (f.bConv ? 0 : 1) : 2;
    return {
      prompt: fill2(K.directQ, f.bConv ? K.bConverges : K.bDiverges),
      q: `a_{n} = ${f.a} \\ ${f.rel} \\ ${f.b} = b_{n}`,
      ...shuffled(r, opts, f.right, f.right === 2 ? [["comparisonWrongWay", wrongWay]] : [["comparisonNoVerdict", 2]]),
      steps: [f.right === 2 ? (f.bConv ? `a_{n} \\ge b_{n}, \\ \\sum b_{n} < \\infty: \\ ?` : `a_{n} \\le b_{n}, \\ \\sum b_{n} = \\infty: \\ ?`) : f.bConv ? `0 \\le a_{n} \\le b_{n}, \\ \\sum b_{n} < \\infty` : `a_{n} \\ge b_{n} \\ge 0, \\ \\sum b_{n} = \\infty`],
    };
  }
  // lim aₙ/bₙ with bₙ = 1/n²: (p n + q)/(n³ + c) ÷ 1/n² → p.
  const [p, q, c] = [r.int(2, 6), r.int(1, 5), r.int(1, 6)];
  return {
    prompt: K.limitQ,
    q: `a_{n} = \\frac{${lin(p, q, "n")}}{n^{3} + ${c}}, \\quad b_{n} = \\frac{1}{n^{2}}`,
    ...exact(F(p), [["limitComparisonFlipped", F(1, p)]]),
    steps: [`\\frac{a_{n}}{b_{n}} = \\frac{${p}n^{3} + ${q}n^{2}}{n^{3} + ${c}} \\to ${p}`, `0 < ${p} < \\infty: \\ \\sum a_{n} \\ \\text{and} \\ \\sum \\frac{1}{n^{2}}`],
  };
}

const fill2 = (s: string, b: string) => s.replace("{b}", b);

/** The alternating series remainder (#751): stopping after N terms is off by at most the next term. */
function remainderPart(r: Rng, w: PracticeWords): Part {
  const K = w.cvK;
  const p = r.int(1, 3);
  const k = r.int(1, 3);
  const N = r.int(3, 7);
  const a = (n: number) => F(1, k * n ** p);
  const term = `\\frac{(-1)^{n+1}}{${k === 1 ? "" : k}${p === 1 ? "n" : `n^{${p}}`}}`;
  return {
    prompt: K.remainderQ.replace("{N}", String(N)),
    q: `\\sum_{n=1}^{\\infty} ${term}`,
    ...exact(a(N + 1), [["remainderLastTerm", a(N), { N }], ["remainderNextTwo", a(N + 1).add(a(N + 2)), { N: N + 1 }]]),
    steps: [`|S - S_{${N}}| \\le a_{${N + 1}}`, `a_{${N + 1}} = ${a(N + 1).tex()}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return L === 1 ? partialPart(r, w) : L === 2 ? compareMore(r, w) : remainderPart(r, w);
  return L === 1 ? seriesPart(r, w) : L === 2 ? testPart(r, w) : howPart(r, w);
};

export default gen;
