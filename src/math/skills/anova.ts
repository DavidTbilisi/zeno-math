// Practice: One-way ANOVA. Easy finds the between- or within-groups degrees of freedom (the two swapped, N − 1,
// named); medium the between-groups sum of squares (the group sizes left out, the grand mean taken as the mean of the
// group means, named); hard the F statistic (the sums of squares divided without their degrees of freedom, the ratio
// upside down, named).
import { exact } from "../calculusTwo";
import { wholeOf } from "../realAnalysis";
import { dp3Of } from "../probTheory";
import { F, grandMean, ssBetween, total } from "../mathStats";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function dfPart(r: Rng, w: PracticeWords): Part {
  const k = r.int(3, 6);
  const ns = Array.from({ length: k }, () => r.int(4, 10));
  const n = ns.reduce((a, b) => a + b, 0);
  const q = `k = ${k}, \\quad ${ns.map((x, i) => `n_{${i + 1}} = ${x}`).join(", \\; ")}`;
  const sum = `N = ${ns.join(" + ")} = ${n}`;
  if (r.next() < 0.5)
    return { prompt: w.st.prompt.dfBetween, q, ...wholeOf(k - 1, [["anovaDfSwapped", n - k], ["anovaDfTotal", n - 1]]), steps: [`\\mathrm{df}_{B} = k - 1 = ${k - 1}`] };
  return { prompt: w.st.prompt.dfWithin, q, ...wholeOf(n - k, [["anovaDfSwapped", k - 1], ["anovaDfTotal", n - 1]]), steps: [sum, `\\mathrm{df}_{W} = N - k = ${n} - ${k} = ${n - k}`] };
}

function ssbPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const k = 3;
    const ns = Array.from({ length: k }, () => r.int(3, 8));
    const ms = Array.from({ length: k }, () => r.int(10, 40));
    const g = grandMean(ns, ms);
    if (!g.isInt() || ms.every((m) => m === ms[0])) continue;
    const ssb = ssBetween(ns, ms);
    const plain = F(ms.reduce((a, b) => a + b, 0), k);
    const noSizes = total(ms.map((m) => F(m).sub(g).mul(F(m).sub(g))));
    const unweighted = total(ms.map((m, i) => F(m).sub(plain).mul(F(m).sub(plain)).mul(F(ns[i]))));
    return {
      prompt: w.st.prompt.ssb,
      q: `\\begin{array}{c|ccc} & 1 & 2 & 3 \\\\ \\hline n_i & ${ns.join(" & ")} \\\\ \\bar{y}_i & ${ms.join(" & ")} \\end{array}`,
      ...exact(ssb, [["ssbSizesLeftOut", noSizes], ["grandMeanUnweighted", unweighted]]),
      steps: [
        `\\bar{y} = \\frac{${ns.map((x, i) => `${x} \\cdot ${ms[i]}`).join(" + ")}}{${ns.reduce((a, b) => a + b, 0)}} = ${g.tex()}`,
        `\\mathrm{SSB} = \\sum n_i (\\bar{y}_i - \\bar{y})^{2} = ${ns.map((x, i) => `${x} \\cdot (${ms[i] - g.toNumber()})^{2}`).join(" + ")} = ${ssb.tex()}`,
      ],
    };
  }
}

function fPart(r: Rng, w: PracticeWords): Part {
  const k = r.int(3, 5);
  const n = k * r.int(4, 8);
  const ssb = 10 * r.int(2, 30);
  const ssw = 10 * r.int(10, 60);
  const msb = F(ssb, k - 1);
  const msw = F(ssw, n - k);
  const f = msb.div(msw);
  return {
    prompt: w.st.prompt.fStat,
    q: `k = ${k}, \\; N = ${n}, \\quad \\mathrm{SSB} = ${ssb}, \\; \\mathrm{SSW} = ${ssw}`,
    ...dp3Of(f.toNumber(), "F", [["fRatioSumsNotMeans", F(ssb, ssw)], ["fRatioInverted", msw.div(msb)]]),
    steps: [
      `\\mathrm{MSB} = \\frac{${ssb}}{${k} - 1} = ${msb.tex()}, \\quad \\mathrm{MSW} = \\frac{${ssw}}{${n} - ${k}} = ${msw.tex()}`,
      `F = \\frac{\\mathrm{MSB}}{\\mathrm{MSW}} = ${f.tex()} \\approx ${f.toNumber().toFixed(4)}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? dfPart(r, w) : L === 2 ? ssbPart(r, w) : fPart(r, w));

export default gen;
