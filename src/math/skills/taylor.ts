// Practice: Taylor series. Easy gives the first four Maclaurin coefficients of eᵃˣ, sin ax, cos ax, 1/(1 − ax) or
// ln(1 + ax) (the derivatives not divided by k!, named); medium approximates a value with the Maclaurin polynomial of
// a given degree (the same slip, named); hard finds a coefficient of the Taylor series about a ≠ 0: of a cubic (the
// coefficient of x² read off instead, the series about 0, named) or of eˣ.
import { exact, F, minusAWords, numTraps } from "../calculusTwo";
import { fill } from "../chart";
import { minus } from "../logicSets";
import type { MistakeId } from "../mistakes";
import { dp, plainFrac, polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const FACT = [1, 1, 2, 6, 24, 120];
const ax = (a: number, f: string) => `${f}${a === 1 ? "" : a === -1 ? "-" : a}x`;

/** The Maclaurin coefficients c₀ … c₃ of a function, and what its derivatives at 0 give undivided. */
function coefficientsPart(r: Rng, w: PracticeWords): Part {
  const a = r.pick([1, 2, 3, -1, -2]);
  const p = (k: number) => a ** k;
  const fams = [
    { tex: `e^{${ax(a, "")}}`, d: [1, p(1), p(2), p(3)], c: [F(1), F(p(1)), F(p(2), 2), F(p(3), 6)] },
    { tex: a < 0 ? `\\sin(${ax(a, "")})` : `\\sin ${ax(a, "")}`, d: [0, p(1), 0, -p(3)], c: [F(0), F(p(1)), F(0), F(-p(3), 6)] },
    { tex: a < 0 ? `\\cos(${ax(a, "")})` : `\\cos ${ax(a, "")}`, d: [1, 0, -p(2), 0], c: [F(1), F(0), F(-p(2), 2), F(0)] },
    { tex: `\\frac{1}{1 ${a < 0 ? "+" : "-"} ${ax(Math.abs(a), "")}}`, d: [1, p(1), 2 * p(2), 6 * p(3)], c: [F(1), F(p(1)), F(p(2)), F(p(3))] },
    { tex: `\\ln\\left(1 ${a < 0 ? "-" : "+"} ${ax(Math.abs(a), "")}\\right)`, d: [0, p(1), -p(2), 2 * p(3)], c: [F(0), F(p(1)), F(-p(2), 2), F(p(3), 3)] },
  ];
  const f = r.pick(fams);
  const vs = f.c.map((c) => c.toNumber());
  const id: MistakeId = "forgotFactorial";
  return {
    prompt: w.calc2.prompt.coefficients,
    q: `f(x) = ${f.tex}`,
    answer: { k: "tuple", vs, tol: 1e-9, traps: [{ id, a: { k: "tuple", vs: f.d, tol: 1e-9 } }] },
    show: `\\left(${f.c.map((c) => c.tex()).join(", ")}\\right)`,
    plain: `(${f.c.map(plainFrac).join("; ")})`,
    format: "vector",
    steps: [`f(0), f'(0), f''(0), f'''(0) = ${f.d.join(", ")}`, `c_{k} = \\frac{f^{(k)}(0)}{k!}: \\quad ${f.c.map((c) => c.tex()).join(", ")}`],
  };
}

/** A value approximated by a Maclaurin polynomial of a given degree. */
function approximatePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const h = r.pick([2, 3, 4, 5]) / 10;
    const fam = r.int(0, 3);
    // The derivatives at 0 of eˣ, cos x, sin x and ln(1 + x), and the degree asked for.
    const n = fam === 0 ? r.int(2, 3) : fam === 1 ? r.pick([2, 4]) : fam === 2 ? 3 : r.int(2, 3);
    const d = (k: number) => (fam === 0 ? 1 : fam === 1 ? (k % 2 ? 0 : (-1) ** (k / 2)) : fam === 2 ? (k % 2 ? (-1) ** ((k - 1) / 2) : 0) : k === 0 ? 0 : (-1) ** (k + 1) * FACT[k - 1]);
    const terms = Array.from({ length: n + 1 }, (_, k) => k);
    const v = terms.reduce((s, k) => s + (d(k) * h ** k) / FACT[k], 0);
    const slip = terms.reduce((s, k) => s + d(k) * h ** k, 0);
    if (Math.abs(slip - v) < 0.02) continue;
    const name = [`e^{${h}}`, `\\cos ${h}`, `\\sin ${h}`, `\\ln ${1 + h}`][fam];
    const poly = terms.filter((k) => d(k)).map((k) => ({ c: F(d(k), FACT[k]), k }));
    const polyTex = poly.map(({ c, k }, i) => `${i && !c.isNeg() ? "+" : ""}${k === 0 ? c.tex() : `${c.n === 1 && c.d === 1 ? "" : c.n === -1 && c.d === 1 ? "-" : c.tex()}x${k > 1 ? `^{${k}}` : ""}`}`).join(" ");
    return {
      prompt: fill(w.calc2.prompt.approximate, { n }),
      q: name,
      answer: { k: "num", v, tol: 0.0006, traps: numTraps(v, [["forgotFactorial", slip]]) },
      show: dp(v, 3),
      plain: dp(v, 3),
      format: "dp3",
      steps: [`p_{${n}}(x) = ${polyTex}`, `p_{${n}}(${h}) = ${dp(v, 6)}`],
    };
  }
}

/** A coefficient of the Taylor series about a ≠ 0. */
function coefficientPart(r: Rng, w: PracticeWords): Part {
  const SUP = ["⁰", "¹", "²", "³"];
  if (r.next() < 0.6) {
    for (;;) {
      const [c3, c2, c1, c0, a] = [r.nz(-3, 3), r.int(-5, 5), r.int(-5, 5), r.int(-5, 5), r.nz(-3, 3)];
      const v = 3 * c3 * a + c2;
      if (v === 0 || 6 * c3 * a + c2 === 0) continue;
      return {
        prompt: fill(w.calc2.prompt.taylorCoefficient, { a: minus(a), xa: minusAWords(a), k: SUP[2] }),
        q: `f(x) = ${T(polyStr([c0, c1, c2, c3]))}`,
        ...exact(F(v), [["forgotFactorial", 2 * v], ["wrongCentre", c2, { a: minus(a) }]]),
        steps: [`f''(x) = ${T(polyStr([2 * c2, 6 * c3]))}`, `f''(${a}) = ${2 * v}`, `\\frac{f''(${a})}{2!} = ${v}`],
      };
    }
  }
  const a = r.pick([1, 2, 3, -1]);
  const k = r.int(2, 3);
  const ea = a === 1 ? "e" : `e^{${a}}`;
  const v = Math.exp(a) / FACT[k];
  return {
    prompt: fill(w.calc2.prompt.taylorCoefficient, { a: minus(a), xa: minusAWords(a), k: SUP[k] }),
    q: "f(x) = e^{x}",
    answer: { k: "num", v, tol: 1e-9, traps: numTraps(v, [["forgotFactorial", Math.exp(a)], ["wrongCentre", 1 / FACT[k], { a: minus(a) }]]) },
    show: `\\frac{${ea}}{${FACT[k]}}`,
    plain: `${a === 1 ? "e" : `e^${a}`}/${FACT[k]}`,
    format: "exact",
    steps: [`f^{(${k})}(${a}) = ${ea}`, `\\frac{f^{(${k})}(${a})}{${k}!} = \\frac{${ea}}{${FACT[k]}}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? coefficientsPart(r, w) : L === 2 ? approximatePart(r, w) : coefficientPart(r, w));

export default gen;
