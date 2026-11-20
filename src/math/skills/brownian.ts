// Practice: Brownian motion. Easy finds Cov(B(s), B(t)) (the product, the larger time, named) or the variance of an
// increment (the covariance dropped, named); medium the variance of aB(s) + bB(t) (the covariance dropped, named) or
// P(X(t) > c) for X(t) = μt + σB(t) (t not rooted, the drift ignored, the other tail, named); hard uses the reflection
// principle for the chance the maximum reaches a, or the minimum −a, by time t (not doubled, t not rooted, named).
import { exact } from "../calculusTwo";
import { dp3Of } from "../probTheory";
import { dp } from "../practiceKit";
import { F, seen, upper } from "../stochastic";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** Two different times, the earlier first. */
function times(r: Rng, hi: number): [number, number] {
  const s = r.int(1, hi - 1);
  return [s, r.int(s + 1, hi)];
}

function covPart(r: Rng, w: PracticeWords): Part {
  const [s, t] = times(r, 9);
  const [x, y] = r.next() < 0.5 ? [s, t] : [t, s];
  return {
    prompt: w.sp.prompt.bmCov,
    q: `\\operatorname{Cov}(B(${x}), B(${y}))`,
    ...exact(F(s), [["covarianceProduct", s * t], ["covarianceMax", t]]),
    steps: [
      `B(${t}) = B(${s}) + (B(${t}) - B(${s})), \\quad B(${t}) - B(${s}) \\perp B(${s})`,
      `\\operatorname{Cov}(B(${x}), B(${y})) = \\operatorname{Var}(B(${s})) = \\min(${x}, ${y}) = ${s}`,
    ],
  };
}

function incrementPart(r: Rng, w: PracticeWords): Part {
  const [s, t] = times(r, 12);
  return {
    prompt: w.sp.prompt.bmVar,
    q: `\\operatorname{Var}(B(${t}) - B(${s}))`,
    ...exact(F(t - s), [["brownianCovDropped", t + s]]),
    steps: [`${t} + ${s} - 2\\operatorname{Cov}(B(${s}), B(${t})) = ${t} + ${s} - 2 \\cdot ${s}`, `${t - s}`],
  };
}

const coef = (a: number, v: string) => (a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`);

function comboPart(r: Rng, w: PracticeWords): Part {
  const [s, t] = times(r, 6);
  const a = r.pick([1, 2, 3, -1, -2]);
  const b = r.pick([1, 2, 3, -1, -2]);
  const v = F(a * a * s + b * b * t + 2 * a * b * s);
  const bs = coef(b, `B(${t})`);
  return {
    prompt: w.sp.prompt.bmVar,
    q: `\\operatorname{Var}(${coef(a, `B(${s})`)} ${bs.startsWith("-") ? `- ${bs.slice(1)}` : `+ ${bs}`})`,
    ...exact(v, [["brownianCovDropped", a * a * s + b * b * t]]),
    steps: [`a^{2} s + b^{2} t + 2ab \\min(s, t) = ${a * a} \\cdot ${s} + ${b * b} \\cdot ${t} + 2 \\cdot ${a * b < 0 ? `(${a * b})` : a * b} \\cdot ${s}`, v.tex()],
  };
}

const ROOTED: [Frac, Frac][] = [[F(1, 4), F(1, 2)], [F(4), F(2)], [F(9), F(3)], [F(16), F(4)]];
/** The times of the reflection questions: also 1, where t and √t agree, and 25. */
const REFLECTED: [Frac, Frac][] = [...ROOTED, [F(1), F(1)], [F(25), F(5)]];

function probPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [t, root] = r.pick(ROOTED);
    const mu = r.pick([0, 1, 2, -1]);
    const sigma = r.pick([1, 2]);
    const c = r.int(-4, 12);
    const centre = F(mu).mul(t);
    const z = F(c).sub(centre).div(F(sigma).mul(root));
    if (z.isZero() || Math.abs(z.toNumber()) > 2.5) continue;
    const v = upper(z.toNumber());
    const drift = mu === 0 ? "" : `${mu === 1 ? "" : mu === -1 ? "-" : mu}t + `;
    const x = mu === 0 && sigma === 1 ? "B" : "X";
    const e = `P(${x}(${t.tex()}) > ${c})`;
    return {
      prompt: w.sp.prompt.bmProb,
      q: x === "B" ? e : `X(t) = ${drift}${sigma === 1 ? "" : sigma}B(t), \\quad ${e}`,
      ...dp3Of(v, e, seen(v, [
        ["bmTimeNotRooted", upper(F(c).sub(centre).div(F(sigma).mul(t)).toNumber())],
        ["driftIgnored", upper(c / (sigma * root.toNumber()))],
        ["normalWrongTail", 1 - v],
      ])),
      steps: [
        `${x}(${t.tex()}) \\sim N(${centre.tex()}, ${F(sigma * sigma).mul(t).tex()})`,
        `z = \\frac{${c} - ${centre.texP()}}{${sigma === 1 ? "" : `${sigma} \\cdot `}${root.tex()}} = ${z.tex()}`,
        `${e} = 1 - \\Phi(${z.tex()}) \\approx ${dp(v, 3)}`,
      ],
    };
  }
}

function reflectionPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [t, root] = r.pick(REFLECTED);
    const a = r.int(1, 6);
    const z = F(a).div(root);
    if (z.toNumber() > 2.5) continue;
    const v = 2 * upper(z.toNumber());
    const max = r.next() < 0.5;
    const e = max ? `P(\\max_{0 \\le s \\le ${t.tex()}} B(s) \\ge ${a})` : `P(\\min_{0 \\le s \\le ${t.tex()}} B(s) \\le -${a})`;
    return {
      prompt: w.sp.prompt.bmMax,
      q: e,
      ...dp3Of(v, e, seen(v, [["reflectionNotDoubled", v / 2], ["bmTimeNotRooted", 2 * upper(F(a).div(t).toNumber())]])),
      steps: [
        `${e} = 2P(B(${t.tex()}) ${max ? `\\ge ${a}` : `\\le -${a}`})`,
        `2\\left(1 - \\Phi\\left(\\frac{${a}}{${root.tex()}}\\right)\\right) = 2(1 - \\Phi(${z.tex()})) \\approx ${dp(v, 3)}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return r.next() < 0.5 ? covPart(r, w) : incrementPart(r, w);
  if (L === 2) return r.next() < 0.5 ? comboPart(r, w) : probPart(r, w);
  return reflectionPart(r, w);
};

export default gen;
