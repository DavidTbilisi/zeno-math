// Practice: Numerical integration.
import { fill } from "../chart";
import { evalE, parseE } from "../expr";
import { dp, num, numPart, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const fs: [string, number, number][] =
    L === 1
      ? [[`x^2 + ${r.int(1, 5)}`, 0, 2], ["x^3", 1, 3], ["sqrt x", 0, 4], [`${r.int(2, 6)}/x`, 1, 3]]
      : [["e^x", 0, 1], ["ln x", 1, 3], ["sqrt(1 + x^2)", 0, 2], ["1/(1 + x)", 0, 2], ["e^(-x^2)", 0, 1], ["sqrt(1 + x^3)", 0, 2]];
  const [src, a, b] = r.pick(fs);
  const n = L === 1 ? r.pick([2, 4]) : 4;
  const simpsonRule = L === 3;
  const f = parseE(src);
  const h = (b - a) / n;
  const ys = Array.from({ length: n + 1 }, (_, i) => evalE(f, a + i * h));
  const inner = ys.slice(1, n);
  const v = simpsonRule
    ? (h / 3) * (ys[0] + ys[n] + inner.reduce((s, y, i) => s + y * (i % 2 ? 2 : 4), 0))
    : (h / 2) * (ys[0] + ys[n] + 2 * inner.reduce((s, y) => s + y, 0));
  return {
    prompt: fill(simpsonRule ? w.prompts.numSimpson : w.prompts.numTrapezium, { n }),
    q: `\\int_{${a}}^{${b}} ${T(src)} \\, dx`,
    answer: num(v, 0.0006),
    show: dp(v, 3),
    plain: dp(v, 6),
    format: "dp3",
    solution: { kind: "numerical", spec: { topic: "integrate", src: `${src}; [${a}, ${b}]; n = ${n}; ${simpsonRule ? "simpson" : "trapezium"}` } },
    // The strip width, the two ends, then the ordinates inside (Simpson's: the odd ones, then the even ones).
    worked: [
      numPart(w.prompts.stepWork, `h = \\frac{${b} - ${a}}{${n}}`, h),
      numPart(w.prompts.stepWork, `y_0 + y_${n}`, ys[0] + ys[n]),
      ...(simpsonRule
        ? [
          numPart(w.prompts.stepWork, `y_1 + y_3`, ys[1] + ys[3]),
          numPart(w.prompts.stepWork, `y_2`, ys[2]),
        ]
        : [numPart(w.prompts.stepWork, inner.map((_, i) => `y_${i + 1}`).join(" + "), inner.reduce((s, y) => s + y, 0))]),
    ],
  };
};

export default gen;
