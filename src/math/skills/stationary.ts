// Practice: Stationary points.
import { derive } from "../derive";
import { parseE, simp } from "../expr";
import { exprPart, polyStr, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  let cs: number[];
  let xs: number[];
  if (L === 1) {
    const [a, h] = [r.nz(-3, 3), r.int(-5, 5)];
    cs = [r.int(-9, 9), -2 * a * h, a];
    xs = [h];
  } else if (L === 2) {
    let p: number, q: number, k: number;
    do [p, q, k] = [r.int(-4, 4), r.int(-4, 4), r.pick([1, 2])];
    while (p === q || (k === 1 && (p + q) % 2 !== 0));
    // f′ = 3k(x − p)(x − q)
    cs = [r.int(-9, 9), 3 * k * p * q, (-3 * k * (p + q)) / 2, k];
    xs = [p, q].sort((a, b) => a - b);
  } else if (r.next() < 0.5) {
    const a = r.int(1, 3);
    cs = [r.int(-9, 9), 0, -2 * a * a, 0, 1];
    xs = [-a, 0, a];
  } else {
    const p = r.nz(-2, 2);
    cs = [r.int(-9, 9), 0, 0, -4 * p, 1];
    xs = [0, 3 * p].sort((a, b) => a - b);
  }
  const src = polyStr(cs);
  return {
    prompt: w.prompts.stationary, q: `y = ${T(src)}`, answer: { k: "set", vs: xs, tol: 1e-9 }, show: xs.map((x) => `x = ${x}`).join(", \\; "), plain: xs.join("; "), format: "roots",
    solution: { kind: "deriv", spec: { topic: "stationary", src, at: "" } },
    worked: [exprPart(w.prompts.stepDiff, `y = ${T(src)}: \\quad \\frac{dy}{dx}`, simp(derive(parseE(src))))],
  };
};

export default gen;
