// Practice: Covariance and correlation.
import type { Frac } from "../fraction";
import { covariance } from "../randvar";
import { dp, fr, num, plainFrac } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  if (L === 3) {
    // A joint table over x ∈ {0, 1}, y ∈ {0, 1, 2} in twentieths: Cov(X, Y) = E(XY) − E(X)E(Y).
    let P: number[][], cov: Frac;
    do {
      const cuts = new Set<number>();
      while (cuts.size < 5) cuts.add(r.int(1, 19));
      const cs = [0, ...[...cuts].sort((x, y) => x - y), 20];
      const ws = cs.slice(1).map((c, i) => c - cs[i]);
      P = [ws.slice(0, 3), ws.slice(3)];
      const pX1 = fr(P[1][0] + P[1][1] + P[1][2], 20);
      const eY = fr(P[0][1] + P[1][1] + 2 * (P[0][2] + P[1][2]), 20);
      const eXY = fr(P[1][1] + 2 * P[1][2], 20);
      cov = eXY.sub(pX1.mul(eY));
    } while (cov.isZero());
    const dec = (k: number) => String(k / 20);
    const v = cov.toNumber();
    return {
      prompt: w.prompts.covJoint,
      q: `\\begin{array}{c|ccc} & y = 0 & y = 1 & y = 2 \\\\ \\hline x = 0 & ${P[0].map(dec).join(" & ")} \\\\ x = 1 & ${P[1].map(dec).join(" & ")} \\end{array}`,
      answer: num(v),
      show: String(Math.round(v * 1e6) / 1e6),
      plain: String(Math.round(v * 1e6) / 1e6),
      format: "number",
      solution: { kind: "randvar", spec: { topic: "joint", src: ["0, 1", "0, 1, 2", P.map((row) => row.map(dec).join(" ")).join(" | "), "1"] } },
    };
  }
  // Pairs with a trend and some scatter, so neither the covariance nor r is 0 and r is not ±1.
  const n = L === 1 ? r.pick([4, 5] as const) : r.pick([5, 6] as const);
  const slope = r.pick([-2, -1, 1, 2] as const);
  let xs: number[], ys: number[], c: ReturnType<typeof covariance>;
  do {
    xs = [];
    while (xs.length < n) {
      const x = r.int(1, 10);
      if (!xs.includes(x)) xs.push(x);
    }
    xs.sort((a, b) => a - b);
    const y0 = r.int(-2, 8);
    ys = xs.map((x) => y0 + slope * x + r.int(-3, 3));
    c = covariance(xs.map((x, i) => [x, ys[i]]));
  } while (Math.abs(c.corr) > 0.98 || Math.abs(c.corr) < 0.3);
  const q = `\\begin{array}{c|${"c".repeat(n)}} x & ${xs.join(" & ")} \\\\ \\hline y & ${ys.join(" & ")} \\end{array}`;
  const solution = { kind: "randvar" as const, spec: { topic: "cov", src: [xs.map((x, i) => `${x}, ${ys[i]}`).join("; ")] } };
  if (L === 1) {
    const sum = (f: (i: number) => number) => xs.reduce((s, _, i) => s + f(i), 0);
    const v = fr(sum((i) => xs[i] * ys[i]), n).sub(fr(sum((i) => xs[i]), n).mul(fr(sum((i) => ys[i]), n)));
    return { prompt: w.prompts.covData, q, answer: num(v.toNumber(), 1e-9, { lowest: true }), show: v.tex(), plain: plainFrac(v), format: "fraction", solution };
  }
  return { prompt: w.prompts.corrData, q, answer: num(c.corr, 0.00051), show: dp(c.corr, 3), plain: dp(c.corr, 3), format: "dp3", solution };
};

export default gen;
