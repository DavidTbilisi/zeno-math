// Practice: Least-squares regression. Easy finds the slope b = r s_y / s_x or the intercept ȳ − b x̄ from summary
// statistics (s_x and s_y swapped, the sign of b x̄ slipped, named); medium the slope from a table of points or the
// residual of one point (Sxy over Syy, ŷ − y for y − ŷ, named); hard R² or the adjusted R² of a multiple regression
// (SSE/SST for 1 − SSE/SST, R² for the adjusted R², named).
import { exact } from "../calculusTwo";
import { dp3Of } from "../probTheory";
import { F, lsLine, meanOf, sxx, sxy } from "../mathStats";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function summaryPart(r: Rng, w: PracticeWords): Part {
  const rr = F(r.pick([-1, 1]) * r.int(2, 9), 10);
  const sx = r.int(1, 6);
  let sy: number;
  do sy = r.int(1, 12);
  while (sy === sx);
  const mx = r.int(2, 9);
  const my = r.int(10, 60);
  const b = rr.mul(F(sy, sx));
  const a = F(my).sub(b.mul(F(mx)));
  const q = `\\bar{x} = ${mx}, \\; s_x = ${sx}, \\quad \\bar{y} = ${my}, \\; s_y = ${sy}, \\quad r = ${rr.toNumber()}`;
  const slope = `b = r \\frac{s_y}{s_x} = ${rr.toNumber()} \\cdot \\frac{${sy}}{${sx}} = ${b.tex()}`;
  if (r.next() < 0.5) return { prompt: w.st.prompt.slope, q, ...exact(b, [["slopeInverted", rr.mul(F(sx, sy))]]), steps: [slope] };
  return {
    prompt: w.st.prompt.intercept,
    q,
    ...exact(a, [["interceptSignSlip", F(my).add(b.mul(F(mx)))]]),
    steps: [slope, `a = \\bar{y} - b\\bar{x} = ${my} - ${b.texP()} \\cdot ${mx} = ${a.tex()}`],
  };
}

const pointsTex = (xs: number[], ys: number[]) =>
  `\\begin{array}{c|${"c".repeat(xs.length)}} x & ${xs.join(" & ")} \\\\ \\hline y & ${ys.join(" & ")} \\end{array}`;

function pointsPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const n = r.int(4, 5);
    const s0 = r.int(0, 3);
    const d = r.int(1, 2);
    const xs = Array.from({ length: n }, (_, i) => s0 + d * i);
    const c = r.int(1, 9);
    const m = r.pick([-2, -1, 1, 2, 3]);
    const ys = xs.map((x) => c + m * x + r.int(-2, 2));
    const syy = sxx(ys);
    if (syy.isZero() || sxy(xs, ys).isZero()) continue;
    const { a, b } = lsLine(xs, ys);
    const head = [`\\bar{x} = ${meanOf(xs).tex()}, \\; \\bar{y} = ${meanOf(ys).tex()}`, `S_{xx} = ${sxx(xs).tex()}, \\; S_{xy} = ${sxy(xs, ys).tex()}`, `b = \\frac{S_{xy}}{S_{xx}} = ${b.tex()}`];
    if (r.next() < 0.5) return { prompt: w.st.prompt.slope, q: pointsTex(xs, ys), ...exact(b, [["slopeInverted", sxy(xs, ys).div(syy)]]), steps: head };
    const i = r.int(0, n - 1);
    const fit = a.add(b.mul(F(xs[i])));
    const e = F(ys[i]).sub(fit);
    if (e.isZero()) continue;
    return {
      prompt: fill(w.st.prompt.residual, { x: xs[i], y: ys[i] }),
      q: pointsTex(xs, ys),
      ...exact(e, [["residualReversed", e.neg()]]),
      steps: [...head, `a = \\bar{y} - b\\bar{x} = ${a.tex()}`, `\\hat{y} = ${a.tex()} + ${b.texP()} \\cdot ${xs[i]} = ${fit.tex()}`, `e = y - \\hat{y} = ${ys[i]} - ${fit.texP()} = ${e.tex()}`],
    };
  }
}

function rSquaredPart(r: Rng, w: PracticeWords): Part {
  let [n, p, sst, sse] = [0, 0, 0, 0];
  // Redraw until the adjustment moves R² by more than a rounding slip.
  for (let tries = 0; tries < 50; tries++) {
    [n, p, sst] = [r.int(12, 60), r.int(2, 5), 10 * r.int(20, 90)];
    sse = r.int(Math.ceil(sst * 0.1), Math.floor(sst * 0.7));
    if ((sse / sst) * (p / (n - p - 1)) > 0.025) break;
  }
  const ssr = sst - sse;
  const r2 = F(ssr, sst);
  const givenSse = r.next() < 0.5;
  const q = `n = ${n}, \\; p = ${p}, \\quad ${givenSse ? `\\mathrm{SSE} = ${sse}` : `\\mathrm{SSR} = ${ssr}`}, \\; \\mathrm{SST} = ${sst}`;
  const r2Step = givenSse ? `R^{2} = 1 - \\frac{\\mathrm{SSE}}{\\mathrm{SST}} = 1 - \\frac{${sse}}{${sst}} = ${r2.tex()}` : `R^{2} = \\frac{\\mathrm{SSR}}{\\mathrm{SST}} = \\frac{${ssr}}{${sst}} = ${r2.tex()}`;
  if (r.next() < 0.5)
    return { prompt: w.st.prompt.rSquared, q, ...dp3Of(r2.toNumber(), "R^{2}", [["rSquaredFlipped", F(1).sub(r2)]]), steps: [r2Step] };
  const adj = F(1).sub(F(sse, n - p - 1).div(F(sst, n - 1)));
  return {
    prompt: w.st.prompt.adjusted,
    q,
    ...dp3Of(adj.toNumber(), "\\bar{R}^{2}", [["adjustedNotAdjusted", r2], ["rSquaredFlipped", F(1).sub(adj)]]),
    steps: [r2Step, `\\bar{R}^{2} = 1 - (1 - R^{2}) \\frac{n - 1}{n - p - 1} = 1 - \\frac{${sse}}{${sst}} \\cdot \\frac{${n - 1}}{${n - p - 1}} = ${adj.tex()}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? summaryPart(r, w) : L === 2 ? pointsPart(r, w) : rSquaredPart(r, w));

export default gen;
