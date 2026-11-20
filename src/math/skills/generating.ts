// Practice: Generating functions for counting. Easy counts choices of k from m kinds with repeats, the coefficient of
// xᵏ in 1/(1 − x)ᵐ (the binomial one place off, repeats left out, named); medium the solutions of x₁ + x₂ + x₃ = n
// with upper bounds, a coefficient of a product (the bounds left out, named); hard the coefficient of xⁿ in
// 1/((1 − ax)(1 − bx)) (the two series added, not multiplied, named).
import { boundedSolutions, choose, sup, twoGeometric } from "../discrete";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function multisetPart(r: Rng, w: PracticeWords): Part {
  const m = r.int(3, 6);
  // k ≠ m: otherwise C(k + m − 1, m) is the answer itself and the off-by-one slip cannot be told apart
  const k0 = r.int(3, 8);
  const k = k0 === m ? k0 + 1 : k0;
  const top = k + m - 1;
  const v = choose(top, m - 1);
  return {
    prompt: fill(w.dm.prompt.multiset, { k, m, t: `x${sup(k)}` }),
    q: `G(x) = \\frac{1}{(1 - x)^{${m}}} = (1 + x + x^{2} + \\dots)^{${m}}`,
    ...wholeOf(v, [["multisetOffByOne", choose(top, m)], ["repetitionIgnored", choose(m, k)]]),
    steps: [`[x^{${k}}] \\, \\frac{1}{(1 - x)^{${m}}} = \\binom{${k} + ${m} - 1}{${m} - 1} = \\binom{${top}}{${m - 1}}`, `\\binom{${top}}{${m - 1}} = ${v}`],
  };
}

const caps3 = (caps: number[]) => caps.map((c) => `(1 + x + \\dots + x^{${c}})`).join("");

function boundedPart(r: Rng, w: PracticeWords): Part {
  const caps = [r.int(2, 6), r.int(2, 6), r.int(2, 6)];
  const total = caps[0] + caps[1] + caps[2];
  // above the largest bound, so at least one bound cuts; below the total, so there is more than one solution
  const n = r.int(Math.max(...caps) + 1, total - 1);
  const v = boundedSolutions(caps, n);
  const rows = Array.from({ length: caps[0] + 1 }, (_, x1) => boundedSolutions(caps.slice(1), n - x1));
  return {
    prompt: fill(w.dm.prompt.bounded, { t: `x${sup(n)}` }),
    q: `x_1 + x_2 + x_3 = ${n}, \\quad ${caps.map((c, i) => `0 \\le x_${i + 1} \\le ${c}`).join(", \\; ")}`,
    ...wholeOf(v, [["upperBoundIgnored", choose(n + 2, 2)]]),
    steps: [
      `[x^{${n}}] \\, ${caps3(caps)}`,
      `\\sum_{x_1 = 0}^{${caps[0]}} \\#\\{x_2 + x_3 = ${n} - x_1\\} = ${rows.join(" + ")} = ${v}`,
    ],
  };
}

const oneMinus = (a: number) => (a === 1 ? "(1 - x)" : `(1 - ${a}x)`);

function coefficientPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const a = r.int(1, 4);
    const b = r.int(1, 4);
    if (a <= b) continue;
    const n = r.int(3, 5);
    const v = twoGeometric(a, b, n);
    const terms = Array.from({ length: n + 1 }, (_, i) => `${a}^{${i}} \\cdot ${b}^{${n - i}}`).join(" + ");
    return {
      prompt: fill(w.dm.prompt.coefficient, { t: `x${sup(n)}` }),
      q: `G(x) = \\frac{1}{${oneMinus(a)}${oneMinus(b)}} = \\left(\\sum_{i} ${a}^{i}x^{i}\\right)\\left(\\sum_{j} ${b}^{j}x^{j}\\right)`,
      ...wholeOf(v, [["gfAddedNotMultiplied", a ** n + b ** n]]),
      steps: [`[x^{${n}}] = \\sum_{i = 0}^{${n}} ${a}^{i} \\, ${b}^{${n} - i} = ${terms}`, `\\frac{${a}^{${n + 1}} - ${b}^{${n + 1}}}{${a} - ${b}} = ${v}`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? multisetPart(r, w) : L === 2 ? boundedPart(r, w) : coefficientPart(r, w));

export default gen;
