// Practice: Roots by numerical methods.
import { fill } from "../chart";
import { derive } from "../derive";
import { evalE, parseE, simp } from "../expr";
import { dp, exprPart, num, numPart, polyStr, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  const sol = (topic: string, src: string) => ({ kind: "numerical" as const, spec: { topic, src } });
  if (L === 2) {
    // x_(n+1) = ∛(ax + b) or √(ax + b): three steps
    const cube = r.next() < 0.5;
    const [a, b] = [r.int(2, 5), r.int(1, 9)];
    const x0 = r.int(1, 3);
    const g = (x: number) => (cube ? Math.cbrt(a * x + b) : Math.sqrt(a * x + b));
    const x3 = g(g(g(x0)));
    const src = `${cube ? "cbrt" : "sqrt"}(${a}x + ${b})`;
    return {
      prompt: fill(w.prompts.numIterate, { a: x0 }),
      q: `x_{n+1} = ${cube ? "\\sqrt[3]" : "\\sqrt"}{${a}x_n + ${b}}`,
      answer: num(x3, 0.0006),
      show: dp(x3, 3),
      plain: dp(x3, 6),
      format: "dp3",
      solution: sol("iterate", `x = ${src}; x0 = ${x0}; 3 steps`),
      // x₁ and x₂, each from the one before; x₃ is the question.
      worked: [
        numPart(w.prompts.stepWork, `x_1 = ${cube ? "\\sqrt[3]" : "\\sqrt"}{${a} \\cdot ${x0} + ${b}}`, g(x0)),
        numPart(w.prompts.stepWork, `x_2 = ${cube ? "\\sqrt[3]" : "\\sqrt"}{${a}x_1 + ${b}}`, g(g(x0))),
      ],
    };
  }
  // Newton–Raphson: one step (level 1) or to the root (level 3)
  let src: string;
  let x0: number;
  const pick = L === 1 ? 0 : r.int(0, 3);
  if (pick === 0) {
    x0 = r.int(1, 3);
    const b = r.int(-2, 4);
    const c = -(x0 ** 3 + b * x0) + r.nz(-3, 3);
    src = polyStr([c, b, 0, 1]);
  } else if (pick === 1) {
    let k = r.int(3, 40);
    while (Number.isInteger(Math.sqrt(k))) k++;
    [src, x0] = [`x^2 - ${k}`, Math.floor(Math.sqrt(k))];
  } else if (pick === 2) [src, x0] = [`e^x - ${r.int(3, 4)}x`, r.pick([0, 2])];
  else [src, x0] = [r.pick(["x - cos x", "x + ln x - 2", "x^3 + x - 3"]), r.pick([1, 2])];
  const f = parseE(src);
  const d = simp(derive(f));
  const step = (x: number) => x - evalE(f, x) / evalE(d, x);
  let v = step(x0);
  if (L === 3) for (let i = 0; i < 30; i++) v = step(v);
  // One step: f(x₀) and f′(x₀). To the root: f′(x), then the first two steps.
  const worked = L === 1
    ? [numPart(w.prompts.stepWork, `f(${x0})`, evalE(f, x0)), numPart(w.prompts.stepWork, `f'(${x0})`, evalE(d, x0))]
    : [
      exprPart(w.prompts.stepDiff, `f'(x)`, d),
      numPart(w.prompts.stepWork, `x_1 = x_0 - \\frac{f(x_0)}{f'(x_0)}`, step(x0)),
      numPart(w.prompts.stepWork, `x_2 = x_1 - \\frac{f(x_1)}{f'(x_1)}`, step(step(x0))),
    ];
  return {
    prompt: fill(L === 1 ? w.prompts.numNewton : w.prompts.numRoot, { a: x0 }),
    q: `f(x) = ${T(src)}`,
    answer: num(v, 0.0006),
    show: dp(v, 3),
    plain: dp(v, 6),
    format: "dp3",
    solution: sol("newton", L === 1 ? `${src}; x0 = ${x0}; 1 step` : `${src}; x0 = ${x0}; 3 dp`),
    worked,
  };
};

export default gen;
