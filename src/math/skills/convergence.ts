// Practice: Convergence tests for series. Easy asks whether a geometric series, a p-series or Σ n/(n + 1) converges
// (terms tending to 0 taken as enough, named); medium which test settles a series: ratio, comparison, alternating or
// integral (the ratio test chosen where its limit is 1 and says nothing, named); hard whether an alternating series
// converges absolutely, conditionally or not at all (conditional taken as absolute, and every alternating series taken
// to converge, named).
import { F, overXp, pickOf, POWERS, powTex, word, type Opt } from "../calculusTwo";
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

const gen: Gen = (r, L, w) => (L === 1 ? seriesPart(r, w) : L === 2 ? testPart(r, w) : howPart(r, w));

export default gen;
