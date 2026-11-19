// Practice: Definite integrals.
import { antiderivative } from "../applied";
import { evalE, parseE } from "../expr";
import { dp, exprPart, fr, num, numPart, polyStr, T } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  let src: string;
  let a: string;
  let b: string;
  let v: number;
  let show: string;
  if (L === 1) {
    const cs = [r.int(0, 6), r.int(0, 6), r.int(1, 4)];
    const [lo, hi] = [r.int(0, 2), r.int(3, 4)];
    src = polyStr(cs);
    [a, b] = [String(lo), String(hi)];
    const I = cs.reduce((acc, c, k) => acc.add(fr(c * (hi ** (k + 1) - lo ** (k + 1)), k + 1)), fr(0));
    v = I.toNumber();
    show = I.tex();
  } else if (L === 2) {
    const pick = r.int(0, 2);
    if (pick === 0) {
      const k = r.int(2, 5);
      [src, a, b] = [`1/x^2`, "1", String(k)];
      const I = fr(k - 1, k);
      [v, show] = [I.toNumber(), I.tex()];
    } else if (pick === 1) {
      const k = r.pick([4, 9, 16]);
      [src, a, b] = [`sqrt(x)`, "0", String(k)];
      const I = fr(2 * Math.sqrt(k) ** 3, 3);
      [v, show] = [I.toNumber(), I.tex()];
    } else {
      const [p, q] = [r.int(1, 3), r.int(4, 6)];
      const c = r.int(1, 6);
      src = `x^3 + ${c}`;
      [a, b] = [String(p), String(q)];
      const I = fr(q ** 4 - p ** 4, 4).add(fr(c * (q - p)));
      [v, show] = [I.toNumber(), I.tex()];
    }
  } else {
    const pick = r.int(0, 3);
    const k = r.int(2, 4);
    if (pick === 0) [src, a, b, v, show] = [`e^x`, "0", String(k), Math.exp(k) - 1, `e^{${k}} - 1`];
    else if (pick === 1) [src, a, b, v, show] = [`1/x`, "1", String(k), Math.log(k), `\\ln ${k}`];
    else if (pick === 2) [src, a, b, v, show] = [`sin x`, "0", "pi", 2, "2"];
    else [src, a, b, v, show] = [`cos x`, "0", "pi/2", 1, "1"];
  }
  const lim = (s: string) => (s === "pi" ? "\\pi" : s === "pi/2" ? "\\frac{\\pi}{2}" : s);
  // F(x), then F at each limit: their difference is the question.
  const Fe = antiderivative(parseE(src))!;
  const at = (s: string) => evalE(Fe, evalE(parseE(s), NaN));
  const worked = [
    exprPart(w.prompts.stepInt, `F(x) = \\int ${T(src)} \\, dx`, Fe),
    numPart(w.prompts.stepWork, `F\\left(${lim(b)}\\right)`, at(b)),
    numPart(w.prompts.stepWork, `F\\left(${lim(a)}\\right)`, at(a)),
  ];
  return {
    prompt: w.prompts.definite,
    q: `\\int_{${lim(a)}}^{${lim(b)}} ${T(src)} \\, dx`,
    answer: num(v, 0.0006),
    show: Number.isInteger(v) || /frac|^\d+$/.test(show) ? show : `${show} \\approx ${dp(v, 3)}`,
    plain: dp(v, 6),
    format: "dp3",
    solution: { kind: "applied", spec: { topic: "area", f: src, g: "", a, b, c: "", opt: "" } },
    worked,
  };
};

export default gen;
