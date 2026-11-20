// Practice: Lyapunov exponents and period doubling. Easy iterates the shift map x ↦ m x mod 1 three times from a
// fraction (mod 1 dropped, one step only, named): nearby starts separate by a factor m each step; medium finds the
// Lyapunov exponent of the shift or tent map, ln m (m itself, log₁₀ for ln, named), or of a skew tent map, the average
// of ln |f′| over the uniform measure (the log of the average slope, named); hard estimates the next period-doubling
// value with Feigenbaum's δ (δ multiplied, equal spacing, named) or δ from three values (the ratio inverted, named).
import { exact, F } from "../calculusTwo";
import { DELTA, dec3, shiftMap, skewTentExponent } from "../dynamics";
import { dp } from "../practiceKit";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function shiftPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const m = r.int(2, 3);
    const d = r.pick([5, 7, 9, 11, 13]);
    const x0 = F(r.int(1, d - 1), d);
    if (x0.d !== d) continue;
    const xs = [x0];
    for (let i = 0; i < 3; i++) xs.push(shiftMap(m, xs[i]));
    if (xs[3].toNumber() === xs[1].toNumber()) continue;
    return {
      prompt: w.dyn.prompt.shift,
      q: `f(x) = ${m}x \\bmod 1, \\quad x_0 = ${x0.tex()}`,
      ...exact(xs[3], [["modDropped", x0.mul(F(m ** 3))], ["iteratedOnce", xs[1]]]),
      steps: xs.slice(1).map((x, i) => `x_${i + 1} = ${m} \\cdot ${xs[i].tex()} \\bmod 1 = ${x.tex()}`),
    };
  }
}

function exponentPart(r: Rng, w: PracticeWords): Part {
  const u = r.next();
  if (u < 0.35) {
    const m = r.int(2, 6);
    return {
      prompt: w.dyn.prompt.exponent,
      q: `f(x) = ${m}x \\bmod 1`,
      ...dec3(Math.log(m), [["lyapunovNoLog", m], ["log10ForLn", Math.log10(m)]]),
      steps: [`|f'(x)| = ${m} \\text{ everywhere}`, `\\lambda = \\lim \\frac{1}{n} \\sum \\ln |f'(x_i)| = \\ln ${m} \\approx ${dp(Math.log(m), 4)}`],
    };
  }
  if (u < 0.6) {
    const s = r.pick([F(3, 2), F(2), F(5, 4), F(7, 4)]);
    const v = Math.log(s.toNumber());
    return {
      prompt: w.dyn.prompt.exponent,
      q: `T(x) = ${s.tex()} \\min(x, 1 - x)`,
      ...dec3(v, [["lyapunovNoLog", s.toNumber()], ["log10ForLn", Math.log10(s.toNumber())]]),
      steps: [`|T'(x)| = ${s.tex()} \\text{ everywhere}`, `\\lambda = \\ln ${s.tex()} \\approx ${dp(v, 4)}`],
    };
  }
  const c = r.pick([F(1, 3), F(1, 4), F(1, 5), F(2, 5), F(3, 10)]);
  const cn = c.toNumber();
  const v = skewTentExponent(cn);
  const rest = F(1).sub(c);
  return {
    prompt: w.dyn.prompt.exponent,
    q: `T(x) = \\begin{cases} ${F(1).div(c).tex()}\\, x & x \\le ${c.tex()} \\\\ ${F(1).div(rest).tex()}\\, (1 - x) & x > ${c.tex()} \\end{cases}`,
    ...dec3(v, [["averageSlopeLogged", Math.log(2)]]),
    steps: [
      `\\text{the uniform measure is invariant: } x_n \\text{ spends a share } ${c.tex()} \\text{ of the time on the left}`,
      `\\lambda = ${c.tex()} \\ln ${F(1).div(c).tex()} + ${rest.tex()} \\ln ${F(1).div(rest).tex()} \\approx ${dp(v, 4)}`,
    ],
  };
}

function doublingPart(r: Rng, w: PracticeWords): Part {
  const r1 = r.int(280, 320) / 100;
  const g = r.int(30, 50) / 100;
  const r2 = Math.round((r1 + g) * 100) / 100;
  if (r.next() < 0.5) {
    const v = r2 + g / DELTA;
    return {
      prompt: fill(w.dyn.prompt.nextDoubling, { d: DELTA }),
      q: `r_1 = ${r1}, \\quad r_2 = ${r2}`,
      ...dec3(v, [["deltaMultiplied", r2 + g * DELTA], ["equalSpacing", r2 + g]]),
      steps: [`\\frac{r_2 - r_1}{r_3 - r_2} \\approx \\delta \\implies r_3 \\approx r_2 + \\frac{${dp(g, 2)}}{${DELTA}}`, `r_3 \\approx ${dp(v, 4)}`],
    };
  }
  const d = r.int(420, 500) / 100;
  const r3 = Math.round((r2 + g / d) * 10000) / 10000;
  const v = (r2 - r1) / (r3 - r2);
  return {
    prompt: w.dyn.prompt.delta,
    q: `r_1 = ${r1}, \\quad r_2 = ${r2}, \\quad r_3 = ${r3}`,
    ...dec3(v, [["ratioInverted", (r3 - r2) / (r2 - r1)]]),
    steps: [`\\delta \\approx \\frac{r_2 - r_1}{r_3 - r_2} = \\frac{${dp(r2 - r1, 4)}}{${dp(r3 - r2, 4)}}`, `\\delta \\approx ${dp(v, 4)}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? shiftPart(r, w) : L === 2 ? exponentPart(r, w) : doublingPart(r, w));

export default gen;
